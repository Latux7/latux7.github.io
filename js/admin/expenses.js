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
  }

  bind() {
    if (this.addBtn) this.addBtn.addEventListener('click', () => this.addExpenseFromForm());
    if (this.exportBtn) this.exportBtn.addEventListener('click', () => this.exportCsv());
    if (this.revenueCard) this.revenueCard.addEventListener('click', () => this.promptRevenue());
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.expenses));
    } catch (e) {
      console.warn('ExpensesManager: failed to save localStorage', e);
    }
    this.render();
  }

  addExpenseFromForm() {
    const amount = parseFloat(this.amountEl.value || 0);
    if (!amount || isNaN(amount)) {
      alert('Bitte gültigen Betrag eingeben.');
      return;
    }
    const category = (this.categoryEl.value || 'Sonstiges').trim();
    const date = this.dateEl.value || new Date().toISOString().slice(0,10);
    const note = this.noteEl.value || '';

    const item = {
      id: 'exp_' + Date.now(),
      amount: Math.round(amount*100)/100,
      category,
      date,
      note
    };

    this.expenses.unshift(item);
    this.clearForm();
    this.save();
  }

  clearForm() {
    this.amountEl.value = '';
    this.categoryEl.value = '';
    this.dateEl.value = '';
    this.noteEl.value = '';
  }

  removeExpense(id) {
    this.expenses = this.expenses.filter(e => e.id !== id);
    this.save();
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
    this.revenue = Math.round(Number(amount || 0)*100)/100;
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
    const effectiveRevenue = Math.round((revenueFromEntries + Number(this.revenue || 0))*100)/100;
    return Math.round((effectiveRevenue - expenses)*100)/100;
  }

  formatCurrency(v) {
    return (Math.round(Number(v||0)*100)/100).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits:2}) + ' €';
  }

  render() {
    // totals
    const total = this.getTotalExpenses();
    const revenueEntries = this.getRevenueFromEntries();
    const effectiveRevenue = Math.round((revenueEntries + Number(this.revenue || 0))*100)/100;
    if (this.totalEl) this.totalEl.textContent = this.formatCurrency(total);
    if (this.revenueEl) this.revenueEl.textContent = this.formatCurrency(effectiveRevenue);
    if (this.profitEl) this.profitEl.textContent = this.formatCurrency(this.computeProfit());

    // list
    if (!this.listEl) return;
    if (!this.expenses.length) {
      this.listEl.innerHTML = '<p style="color:#666;">Noch keine Einträge erfasst.</p>';
      return;
    }

    const rows = this.expenses.map(e => {
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #eee;">
          <div style="flex:1; min-width:220px;">
            <div style="font-weight:600;">${this.formatCurrency(e.amount)}</div>
            <div style="font-size:0.9em; color:#666">${e.category} • ${e.date}</div>
            <div style="font-size:0.9em; color:#333">${e.note || ''}</div>
          </div>
          <div style="margin-left:12px;">
            <button onclick="window.expensesManager.removeExpense('${e.id}')" style="background:#e74c3c;color:#fff;border:none;padding:6px 8px;border-radius:6px;cursor:pointer;">Löschen</button>
          </div>
        </div>
      `;
    }).join('\n');

    this.listEl.innerHTML = rows;
  }

  exportCsv() {
    const header = ['id','amount','category','date','note'];
    const lines = [header.join(',')];
    this.expenses.forEach(e => {
      const row = [e.id, e.amount, '"' + String(e.category).replaceAll('"','""') + '"', e.date, '"' + String(e.note || '').replaceAll('"','""') + '"'];
      lines.push(row.join(','));
    });

    const blob = new Blob([lines.join('\n')], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', function() {
  try {
    window.expensesManager = new ExpensesManager();
  } catch (e) {
    console.error('Failed to initialize ExpensesManager', e);
  }
});

// Expose for other modules to query totals
window.getAdminExpensesTotal = function() {
  return window.expensesManager ? window.expensesManager.getTotalExpenses() : 0;
};

window.setAdminRevenue = function(amount) {
  if (window.expensesManager) window.expensesManager.setRevenue(amount);
};
