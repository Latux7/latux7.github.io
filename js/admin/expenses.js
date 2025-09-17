// expenses.js - Simple Expenses manager for Admin Dashboard

class ExpensesManager {
    constructor() {
        this.storageKey = 'laura_admin_expenses_v1';
        this.expenses = [];
        this.revenue = 0; // manual override revenue (adds to revenue derived from entries)
        this.init();
    }

    init() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            this.expenses = raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.warn('ExpensesManager: failed to read localStorage', e);
            this.expenses = [];
        }

        this.cacheElements();
        this.bind();
        this.render();
    }

    cacheElements() {
        this.amountEl = document.getElementById('expenseAmount');
        this.categoryEl = document.getElementById('expenseCategory');
        this.dateEl = document.getElementById('expenseDate');
        this.noteEl = document.getElementById('expenseNote');
        this.addBtn = document.getElementById('addExpenseBtn');
        this.listEl = document.getElementById('expensesList');
        this.totalEl = document.getElementById('expensesTotal');
        this.revenueEl = document.getElementById('revenueAmount');
        this.profitEl = document.getElementById('profitAmount');
        this.exportBtn = document.getElementById('exportExpensesCsv');

        // If there's an element to input revenue manually, use it, otherwise allow clicking the revenue card to edit
        this.revenueCard = document.getElementById('revenueCard');

        // Optional receipt input and grouping controls. If the admin HTML doesn't provide them,
        // we'll create minimal UI elements so the feature works without HTML changes.
        this.receiptInput = document.getElementById('expenseReceiptInput');
        this.groupBtn = document.getElementById('groupExpensesBtn');
        this.selectAllCheckbox = document.getElementById('selectAllExpenses');

        // create receipt input if missing (insert next to add button if possible)
        if (!this.receiptInput && this.addBtn && this.addBtn.parentElement) {
            const el = document.createElement('input');
            el.type = 'file';
            el.accept = 'image/*,application/pdf';
            el.id = 'expenseReceiptInput';
            el.style.marginLeft = '8px';
            el.title = 'Beleg hochladen (Bild oder PDF)';
            this.addBtn.parentElement.insertBefore(el, this.addBtn.nextSibling);
            this.receiptInput = el;
        }

        // create group button if missing (insert near export button if available)
        if (!this.groupBtn && this.exportBtn && this.exportBtn.parentElement) {
            const b = document.createElement('button');
            b.type = 'button';
            b.id = 'groupExpensesBtn';
            b.textContent = 'Ausgewählte gruppieren';
            b.style.marginRight = '8px';
            b.className = 'btn';
            this.exportBtn.parentElement.insertBefore(b, this.exportBtn);
            this.groupBtn = b;
        }
    }

    bind() {
        if (this.addBtn) this.addBtn.addEventListener('click', () => this.addExpenseFromForm());
        if (this.exportBtn) this.exportBtn.addEventListener('click', () => this.exportCsv());
        if (this.revenueCard) this.revenueCard.addEventListener('click', () => this.promptRevenue());
        if (this.receiptInput) this.receiptInput.addEventListener('change', (e) => {
            // no-op here; file will be processed when adding the expense
            // but keep a reference for UI feedback if needed
            this._lastSelectedReceipt = e.target.files && e.target.files[0] ? e.target.files[0] : null;
        });
        if (this.groupBtn) this.groupBtn.addEventListener('click', () => this.groupSelectedExpenses());
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.expenses));
        } catch (e) {
            console.warn('ExpensesManager: failed to save localStorage', e);
        }
        this.render();
    }

    async addExpenseFromForm() {
        const amount = parseFloat(this.amountEl.value || 0);
        if (!amount || isNaN(amount)) {
            alert('Bitte gültigen Betrag eingeben.');
            return;
        }
        const category = (this.categoryEl.value || 'Sonstiges').trim();
        const date = this.dateEl.value || new Date().toISOString().slice(0, 10);
        const note = this.noteEl.value || '';

        const item = {
            id: 'exp_' + Date.now(),
            amount: Math.round(amount * 100) / 100,
            category,
            date,
            note,
            receipts: [] // optional array of {name,type,dataUrl}
        };

        // if a receipt file was selected, attempt to upload to Firebase Storage first, fallback to DataURL
        const file = this.receiptInput && this.receiptInput.files && this.receiptInput.files[0] ? this.receiptInput.files[0] : null;
        if (file) {
            const maxBytes = 5 * 1024 * 1024; // allow larger upload to storage (5MB)
            let uploaded = false;
            // try Firebase Storage if available
            try {
                if (window.firebase && firebase && firebase.storage && typeof firebase.storage === 'function') {
                    try {
                        const upl = await this.uploadReceiptToFirebase(file);
                        if (upl && upl.url) {
                            item.receipts.push({ name: file.name, type: file.type, url: upl.url, storagePath: upl.storagePath });
                            uploaded = true;
                        }
                    } catch (e) {
                        console.warn('Firebase Storage upload failed, will fallback to DataURL', e);
                    }
                }
            } catch (e) {
                // ignore and fallback
            }

            if (!uploaded) {
                // warn if file is large for localStorage; keep a conservative limit
                const warnBytes = 1.5 * 1024 * 1024; // 1.5 MB
                if (file.size > warnBytes) {
                    if (!confirm('Die ausgewählte Datei ist größer als 1.5 MB und wird möglicherweise nicht zuverlässig lokal gespeichert. Trotzdem hinzufügen?')) {
                        // user cancelled adding this receipt; proceed without it
                    } else {
                        try {
                            const dataUrl = await this.readFileAsDataURL(file);
                            item.receipts.push({ name: file.name, type: file.type, dataUrl });
                        } catch (e) {
                            console.warn('Failed to read large receipt file', e);
                        }
                    }
                } else {
                    try {
                        const dataUrl = await this.readFileAsDataURL(file);
                        item.receipts.push({ name: file.name, type: file.type, dataUrl });
                    } catch (e) {
                        console.warn('Failed to read receipt file', e);
                    }
                }
            }
        }

        this.expenses.unshift(item);
        this.clearForm();
        this.save();
    }

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.onerror = (err) => reject(err);
            fr.readAsDataURL(file);
        });
    }

    // Upload a receipt file to Firebase Storage (compat API). Returns {url, storagePath} on success.
    async uploadReceiptToFirebase(file) {
        if (!(window.firebase && firebase && firebase.storage && typeof firebase.storage === 'function')) {
            throw new Error('Firebase Storage is not available');
        }

        // ensure firebase app is initialized; config should be loaded in admin pages
        try {
            const storage = firebase.storage();
            const path = `expenses/${Date.now()}_${file.name.replaceAll(/[^a-zA-Z0-9_.-]/g, '_')}`;
            const ref = storage.ref().child(path);
            const snapshot = await ref.put(file);
            const url = await snapshot.ref.getDownloadURL();
            return { url, storagePath: path };
        } catch (e) {
            console.error('uploadReceiptToFirebase error', e);
            throw e;
        }
    }

    clearForm() {
        this.amountEl.value = '';
        this.categoryEl.value = '';
        this.dateEl.value = '';
        this.noteEl.value = '';
        if (this.receiptInput) this.receiptInput.value = '';
    }

    removeExpense(id) {
        // find expense and delete associated storage files if any
        const toRemove = this.expenses.find(e => e.id === id);
        if (toRemove && Array.isArray(toRemove.receipts)) {
            toRemove.receipts.forEach(r => {
                if (r.storagePath) {
                    this.deleteReceiptFromFirebase(r.storagePath).catch(err => console.warn('Failed to delete receipt from storage', err));
                }
            });
        }

        this.expenses = this.expenses.filter(e => e.id !== id);
        this.save();
    }

    // Delete a file from Firebase Storage by storage path (returns promise)
    async deleteReceiptFromFirebase(storagePath) {
        if (!(window.firebase && firebase && firebase.storage && typeof firebase.storage === 'function')) {
            throw new Error('Firebase Storage is not available');
        }
        try {
            const storage = firebase.storage();
            const ref = storage.ref().child(storagePath);
            await ref.delete();
            return true;
        } catch (e) {
            // log and rethrow so callers can handle
            console.warn('deleteReceiptFromFirebase error', e);
            throw e;
        }
    }

    // Group multiple selected expenses into one aggregated entry
    groupSelectedExpenses() {
        if (!this.listEl) return;
        const checkboxes = Array.from(this.listEl.querySelectorAll('input.expense-select-checkbox:checked'));
        if (!checkboxes.length) {
            alert('Bitte zuerst Einträge auswählen, die gruppiert werden sollen.');
            return;
        }

        const ids = checkboxes.map(cb => cb.getAttribute('data-id')).filter(Boolean);
        if (ids.length < 2) {
            alert('Mindestens zwei Einträge auswählen, um sie zu gruppieren.');
            return;
        }

        const toGroup = this.expenses.filter(e => ids.includes(e.id));
        if (!toGroup.length) return;

        const totalAmount = toGroup.reduce((s, e) => s + Number(e.amount || 0), 0);
        const categories = Array.from(new Set(toGroup.map(t => t.category))).join(', ');
        const earliestDate = toGroup.map(t => t.date).sort()[0];
        const combinedNotes = toGroup.map(t => `[${t.date}] ${t.category}: ${t.note || ''}`).join(' \n');
        const combinedReceipts = toGroup.reduce((acc, t) => acc.concat(Array.isArray(t.receipts) ? t.receipts : []), []);

        const groupCategory = prompt('Kategorie für gruppierte Ausgaben', categories || 'Einkauf (Gruppiert)') || (categories || 'Einkauf (Gruppiert)');

        const grouped = {
            id: 'exp_group_' + Date.now(),
            amount: Math.round(totalAmount * 100) / 100,
            category: groupCategory,
            date: earliestDate || new Date().toISOString().slice(0, 10),
            note: combinedNotes,
            receipts: combinedReceipts
        };

        // remove originals
        this.expenses = this.expenses.filter(e => !ids.includes(e.id));
        // add grouped at top
        this.expenses.unshift(grouped);
        this.save();
        alert('Einträge erfolgreich gruppiert.');
    }

    // Total of entries whose category is NOT 'Umsatz' (true expenses)
    getTotalExpenses() {
        return this.expenses.reduce((s, e) => {
            return s + (e.category === 'Umsatz' ? 0 : Number(e.amount || 0));
        }, 0);
    }

    // Sum revenue entries (category === 'Umsatz')
    getRevenueFromEntries() {
        return this.expenses.reduce((s, e) => {
            return s + (e.category === 'Umsatz' ? Number(e.amount || 0) : 0);
        }, 0);
    }

    setRevenue(amount) {
        this.revenue = Math.round(Number(amount || 0) * 100) / 100;
        this.render();
    }

    promptRevenue() {
        const input = prompt('Umsatz manuell setzen (z.B. 1234.56)\nLassen Sie leer, um auf 0 zu setzen', this.revenue || '');
        if (input === null) return; // cancelled
        const val = parseFloat(input.replace(',', '.'));
        if (isNaN(val)) {
            alert('Ungültiger Betrag');
            return;
        }
        this.setRevenue(val);
    }

    computeProfit() {
        const expenses = this.getTotalExpenses();
        const revenueFromEntries = this.getRevenueFromEntries();
        // Effective revenue = entries marked as Umsatz + manual override
        const effectiveRevenue = Math.round((revenueFromEntries + Number(this.revenue || 0)) * 100) / 100;
        return Math.round((effectiveRevenue - expenses) * 100) / 100;
    }

    formatCurrency(v) {
        return (Math.round(Number(v || 0) * 100) / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
    }

    render() {
        // totals
        const total = this.getTotalExpenses();
        const revenueEntries = this.getRevenueFromEntries();
        const effectiveRevenue = Math.round((revenueEntries + Number(this.revenue || 0)) * 100) / 100;
        if (this.totalEl) this.totalEl.textContent = this.formatCurrency(total);
        if (this.revenueEl) this.revenueEl.textContent = this.formatCurrency(effectiveRevenue);
        if (this.profitEl) this.profitEl.textContent = this.formatCurrency(this.computeProfit());

        // list
        if (!this.listEl) return;
        if (!this.expenses.length) {
            this.listEl.innerHTML = '<p style="color:#666;">Noch keine Einträge erfasst.</p>';
            return;
        }

        // render with selection checkboxes and receipts
        const rows = this.expenses.map(e => {
            const receiptsHtml = (Array.isArray(e.receipts) && e.receipts.length) ? e.receipts.map((r, i) => {
                const isImg = r.type && r.type.startsWith('image/');
                if (isImg) {
                    return `<a href="#" onclick="window.expensesManager.viewReceipt('${e.id}', ${i});return false;" title="${r.name}"><img src="${r.dataUrl}" style="width:48px;height:auto;border-radius:4px;border:1px solid #ddd;margin-left:6px;"/></a>`;
                }
                return `<a href="#" onclick="window.expensesManager.viewReceipt('${e.id}', ${i});return false;" style="margin-left:8px;">📄 ${r.name}</a>`;
            }).join('') : '';

            return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #eee;">
                    <div style="display:flex; align-items:flex-start; gap:12px; flex:1; min-width:220px;">
                        <input class="expense-select-checkbox" data-id="${e.id}" type="checkbox" style="width:18px;height:18px;margin-top:6px;" />
                        <div style="flex:1;">
                            <div style="font-weight:600;">${this.formatCurrency(e.amount)}</div>
                            <div style="font-size:0.9em; color:#666">${e.category} • ${e.date}</div>
                            <div style="font-size:0.9em; color:#333">${(e.note || '').replaceAll('\n', '<br/>')}</div>
                        </div>
                        <div>${receiptsHtml}</div>
                    </div>
                    <div style="margin-left:12px;">
                        <button onclick="window.expensesManager.removeExpense('${e.id}')" style="background:#e74c3c;color:#fff;border:none;padding:6px 8px;border-radius:6px;cursor:pointer;">Löschen</button>
                    </div>
                </div>
            `;
        }).join('\n');

        // add a small header with select-all if list isn't empty
        const header = `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:2px solid #ddd; font-weight:700;">
                        <div style="display:flex; align-items:center; gap:12px;"><input id="selectAllExpenses" type="checkbox" style="width:18px;height:18px;" /> <span>Einträge auswählen</span></div>
                        <div></div>
                    </div>
                `;

        this.listEl.innerHTML = header + rows;

        // wire up select-all checkbox
        const selectAll = document.getElementById('selectAllExpenses');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                const checked = e.target.checked;
                Array.from(this.listEl.querySelectorAll('input.expense-select-checkbox')).forEach(cb => cb.checked = checked);
            });
        }
    }

    exportCsv() {
        const header = ['id', 'amount', 'category', 'date', 'note', 'receipts', 'receipt_urls'];
        const lines = [header.join(',')];
        this.expenses.forEach(e => {
            const receiptNames = (Array.isArray(e.receipts) ? e.receipts.map(r => r.name).join(';') : '');
            // Prefer storage/download URLs. If only a dataUrl exists (local fallback), export a short marker instead of the whole base64 string.
            const receiptUrls = (Array.isArray(e.receipts) ? e.receipts.map(r => {
                if (r.url) return r.url;
                if (r.dataUrl) return `[LOCAL:${r.name || 'file'}]`;
                return '';
            }).filter(Boolean).join(';') : '');
            const row = [e.id, e.amount, '"' + String(e.category).replaceAll('"', '""') + '"', e.date, '"' + String(e.note || '').replaceAll('"', '""') + '"', '"' + String(receiptNames).replaceAll('"', '""') + '"', '"' + String(receiptUrls).replaceAll('"', '""') + '"'];
            lines.push(row.join(','));
        });

        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    // Open or download a receipt stored with an expense
    viewReceipt(expenseId, receiptIndex) {
        const exp = this.expenses.find(e => e.id === expenseId);
        if (!exp) return alert('Beleg nicht gefunden');
        const r = (exp.receipts && exp.receipts[receiptIndex]) ? exp.receipts[receiptIndex] : null;
        if (!r) return alert('Beleg nicht gefunden');

        // If it's a dataUrl, open in new tab. For large files this may be blocked or slow.
        if (r.dataUrl && r.dataUrl.startsWith('data:')) {
            const newWindow = window.open();
            if (!newWindow) {
                // fallback to download
                const a = document.createElement('a');
                a.href = r.dataUrl;
                a.download = r.name || 'beleg';
                document.body.appendChild(a);
                a.click();
                a.remove();
                return;
            }
            // try to write an img/pdf preview into the new window
            try {
                if (r.type && r.type.startsWith('image/')) {
                    newWindow.document.write(`<title>${r.name}</title><img src="${r.dataUrl}" style="max-width:100%;height:auto;"/>`);
                } else {
                    // PDF or other: try embedding
                    newWindow.document.write(`<title>${r.name}</title><iframe src="${r.dataUrl}" style="width:100%;height:100vh;border:none;"></iframe>`);
                }
            } catch (e) {
                // if write fails, fallback to direct navigation
                newWindow.location = r.dataUrl;
            }
            return;
        }

        // If it's a remote URL, open it
        if (r.url) {
            window.open(r.url, '_blank');
            return;
        }

        alert('Unbekanntes Belegformat');
    }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', function () {
    try {
        window.expensesManager = new ExpensesManager();
    } catch (e) {
        console.error('Failed to initialize ExpensesManager', e);
    }
});

// Expose for other modules to query totals
window.getAdminExpensesTotal = function () {
    return window.expensesManager ? window.expensesManager.getTotalExpenses() : 0;
};

window.setAdminRevenue = function (amount) {
    if (window.expensesManager) window.expensesManager.setRevenue(amount);
};
