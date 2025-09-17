// accounting.js - Buchhaltung und Umsatzstatistiken für Admin-Dashboard

class AccountingManager {
    constructor() {
        this.db = null;
        this.currentMonth = new Date().getMonth() + 1; // 1-12
        this.currentYear = new Date().getFullYear();
        this.init();
    }

    init() {
        // debug: AccountingManager init

        // Firebase App erst initialisieren, dann Firestore verwenden
        if (typeof initializeFirebaseApp === 'function') {
            this.db = initializeFirebaseApp();
        } else {
            console.warn('AccountingManager: initializeFirebaseApp nicht verfügbar, verwende Fallback');
            // Fallback für den Fall, dass Firebase noch nicht geladen ist
            setTimeout(() => {
                if (typeof initializeFirebaseApp === 'function') {
                    this.db = initializeFirebaseApp();
                    // debug: Firebase initialized via fallback
                } else {
                    // Direkte Initialisierung falls die Funktion immer noch nicht verfügbar ist
                    if (!firebase.apps.length) {
                        firebase.initializeApp(window.firebaseConfig);
                    }
                    this.db = firebase.firestore();
                    // debug: Firebase directly initialized
                }
                this.loadAccountingData();
            }, 1000);
        }

        if (!this.db) {
            console.error('AccountingManager: Firestore-Initialisierung fehlgeschlagen!');
        }
    }

    // Hauptfunktion: Buchhaltungsdaten laden
    async loadAccountingData() {
        try {
            // loading accounting data

            if (!this.db) {
                console.error('AccountingManager: Firebase noch nicht initialisiert');
                this.showAccountingError();
                return;
            }

            // Teste Firebase-Verbindung mit einfacher Abfrage
            const testQuery = await this.db.collection('orders').limit(1).get();

            // Aktueller Monat
            // calculate stats for current month
            const currentMonthStats = await this.calculateMonthlyStats(this.currentYear, this.currentMonth);

            // Vorheriger Monat für Vergleich
            const prevMonth = this.currentMonth === 1 ? 12 : this.currentMonth - 1;
            const prevYear = this.currentMonth === 1 ? this.currentYear - 1 : this.currentYear;
            // calculate stats for previous month
            const previousMonthStats = await this.calculateMonthlyStats(prevYear, prevMonth);

            // Jahresstatistiken
            // calculate yearly stats
            const yearlyStats = await this.calculateYearlyStats(this.currentYear);

            // computed all statistics

            // UI aktualisieren
            this.updateAccountingUI({
                currentMonth: currentMonthStats,
                previousMonth: previousMonthStats,
                yearly: yearlyStats
            });

        } catch (error) {
            console.error('AccountingManager: Fehler beim Laden der Buchhaltungsdaten:', error);
            this.showAccountingError();
        }
    }

    // Monatliche Statistiken berechnen
    async calculateMonthlyStats(year, month) {
        // calculate monthly statistics

        const startDate = new Date(year, month - 1, 1); // Monatserster
        const endDate = new Date(year, month, 0, 23, 59, 59); // Monatsletzter

        // datumbereich: start/end

        const ordersSnapshot = await this.db.collection('orders')
            .where('created', '>=', startDate.toISOString())
            .where('created', '<=', endDate.toISOString())
            .get();

        // found orders: ordersSnapshot.size

        let totalRevenue = 0;
        let orderCount = 0;
        let categoryBreakdown = {};
        let statusBreakdown = {
            'neu': 0,
            'in Vorbereitung': 0,
            'fertig': 0,
            'abgeholt': 0
        };
        let sizeBreakdown = {};
        let occasionBreakdown = {};

        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            orderCount++;

            // Gesamtumsatz - versuche verschiedene Preisfelder
            const price = parseFloat(order.gesamtpreis) || parseFloat(order.price) || parseFloat(order.total) || 0;
            // price for order
            totalRevenue += price;

            // Status-Aufschlüsselung
            const rawStatus = order.status || 'neu';
            // Normalize known variants to canonical keys used in UI
            const s = String(rawStatus).toLowerCase();
            let normalizedStatus = rawStatus;
            if (s === 'in-bearbeitung' || s === 'in_bearbeitung' || s.includes('bearbeitung') || s.includes('vorbereitung') || s === 'invorbereitung') {
                normalizedStatus = 'in Vorbereitung';
            } else if (s === 'neu' || s === 'fertig' || s === 'abgeholt' || s === 'angenommen' || s === 'abgelehnt') {
                normalizedStatus = s === 'neu' ? 'neu' : (s === 'fertig' ? 'fertig' : (s === 'abgeholt' ? 'abgeholt' : s));
            }

            statusBreakdown[normalizedStatus] = (statusBreakdown[normalizedStatus] || 0) + price;

            // Größen-Aufschlüsselung - prüfe verschiedene Größenfelder
            const size = order.details?.durchmesserCm ? `${order.details.durchmesserCm}cm` : (order.size || 'unbekannt');
            sizeBreakdown[size] = (sizeBreakdown[size] || 0) + price;

            // Kategorie-Aufschlüsselung (basierend auf Extras)
            const extras = order.details?.extras || order.extras || [];
            if (extras.length === 0) {
                categoryBreakdown['Basis-Torte'] = (categoryBreakdown['Basis-Torte'] || 0) + price;
            } else {
                const category = extras.length > 2 ? 'Premium-Torte' : 'Standard-Torte';
                categoryBreakdown[category] = (categoryBreakdown[category] || 0) + price;
            }

            // Anlass-Aufschlüsselung
            const occasion = order.anlass || 'nicht-angegeben';
            occasionBreakdown[occasion] = (occasionBreakdown[occasion] || 0) + price;
        });

        const result = {
            year,
            month,
            monthName: this.getMonthName(month),
            totalRevenue: Math.round(totalRevenue * 100) / 100, // Auf 2 Dezimalstellen runden
            orderCount,
            averageOrderValue: orderCount > 0 ? Math.round((totalRevenue / orderCount) * 100) / 100 : 0,
            categoryBreakdown,
            statusBreakdown,
            sizeBreakdown,
            occasionBreakdown,
            period: `${this.getMonthName(month)} ${year}`
        };

        // monthly result computed
        return result;
    }

    // Jahresstatistiken berechnen
    async calculateYearlyStats(year) {
        const startDate = new Date(year, 0, 1); // 1. Januar
        const endDate = new Date(year, 11, 31, 23, 59, 59); // 31. Dezember

        const ordersSnapshot = await this.db.collection('orders')
            .where('created', '>=', startDate.toISOString())
            .where('created', '<=', endDate.toISOString())
            .get();

        let totalRevenue = 0;
        let orderCount = 0;
        let monthlyBreakdown = {};

        // Initialisiere alle Monate
        for (let m = 1; m <= 12; m++) {
            monthlyBreakdown[m] = { revenue: 0, orders: 0 };
        }

        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            // Normalize order date (support ISO strings and Firestore Timestamps)
            let orderDate;
            if (order.created && typeof order.created.toDate === 'function') {
                orderDate = order.created.toDate();
            } else if (order.created) {
                orderDate = new Date(order.created);
            } else {
                orderDate = new Date();
            }
            const orderMonth = (orderDate.getMonth ? orderDate.getMonth() : (new Date()).getMonth()) + 1; // 1-12

            orderCount++;
            // Try the same price fields as monthly calculation
            const price = parseFloat(order.gesamtpreis) || parseFloat(order.price) || parseFloat(order.total) || 0;
            totalRevenue += price;

            // Safely update monthly breakdown
            if (!monthlyBreakdown[orderMonth]) monthlyBreakdown[orderMonth] = { revenue: 0, orders: 0 };
            monthlyBreakdown[orderMonth].revenue += price;
            monthlyBreakdown[orderMonth].orders++;
        });

        return {
            year,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            orderCount,
            averageOrderValue: orderCount > 0 ? Math.round((totalRevenue / orderCount) * 100) / 100 : 0,
            monthlyBreakdown
        };
    }

    // UI mit Buchhaltungsdaten aktualisieren
    updateAccountingUI(stats) {
        const accountingContainer = document.getElementById('accountingStats');
        if (!accountingContainer) {
            console.warn('Accounting-Container nicht gefunden');
            return;
        }

        const currentMonth = stats.currentMonth;
        const previousMonth = stats.previousMonth;
        const yearly = stats.yearly;

        // Trend-Berechnung
        const revenueTrend = this.calculateTrend(currentMonth.totalRevenue, previousMonth.totalRevenue);
        const orderTrend = this.calculateTrend(currentMonth.orderCount, previousMonth.orderCount);

        accountingContainer.innerHTML = `
            <!-- Hauptstatistiken -->
            <div class="accounting-overview">
                <div class="stat-card main-revenue">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.formatCurrency(currentMonth.totalRevenue)}</div>
                        <div class="stat-label">Umsatz ${currentMonth.period}</div>
                        <div class="stat-trend ${revenueTrend.class}">${revenueTrend.text}</div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon">📦</div>
                    <div class="stat-content">
                        <div class="stat-value">${currentMonth.orderCount}</div>
                        <div class="stat-label">Bestellungen</div>
                        <div class="stat-trend ${orderTrend.class}">${orderTrend.text}</div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.formatCurrency(currentMonth.averageOrderValue)}</div>
                        <div class="stat-label">⌀ Bestellwert</div>
                        <div class="stat-info">pro Bestellung</div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon">📅</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.formatCurrency(yearly.totalRevenue)}</div>
                        <div class="stat-label">Jahresumsatz ${yearly.year}</div>
                        <div class="stat-info">${yearly.orderCount} Bestellungen</div>
                    </div>
                </div>
            </div>

            <!-- Detaillierte Aufschlüsselung -->
            <div class="accounting-details">
                <div class="detail-section">
                    <h3>📋 Status-Aufschlüsselung (${currentMonth.period})</h3>
                    <div class="breakdown-list">
                        ${this.renderBreakdown(currentMonth.statusBreakdown)}
                    </div>
                </div>

                <div class="detail-section">
                    <h3>🎂 Größen-Verteilung</h3>
                    <div class="breakdown-list">
                        ${this.renderBreakdown(currentMonth.sizeBreakdown)}
                    </div>
                </div>

                <div class="detail-section">
                    <h3>🏷️ Kategorien</h3>
                    <div class="breakdown-list">
                        ${this.renderBreakdown(currentMonth.categoryBreakdown)}
                    </div>
                </div>

                <div class="detail-section">
                    <h3>🎉 Anlässe</h3>
                    <div class="breakdown-list">
                        ${this.renderOccasionBreakdown(currentMonth.occasionBreakdown)}
                    </div>
                </div>
            </div>

            <!-- Monatsvergleich -->
            <div class="month-comparison">
                <h3>📈 Monatsvergleich</h3>
                <div class="comparison-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Monat</th>
                                <th>Umsatz</th>
                                <th>Bestellungen</th>
                                <th>⌀ Wert</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="current-month">
                                <td><strong>${currentMonth.period}</strong></td>
                                <td><strong>${this.formatCurrency(currentMonth.totalRevenue)}</strong></td>
                                <td><strong>${currentMonth.orderCount}</strong></td>
                                <td><strong>${this.formatCurrency(currentMonth.averageOrderValue)}</strong></td>
                            </tr>
                            <tr class="previous-month">
                                <td>${previousMonth.period}</td>
                                <td>${this.formatCurrency(previousMonth.totalRevenue)}</td>
                                <td>${previousMonth.orderCount}</td>
                                <td>${this.formatCurrency(previousMonth.averageOrderValue)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Refresh-Button -->
            <div class="accounting-controls">
                <button onclick="window.accountingManager.exportAccountingData()" class="btn btn-outline">
                    📊 Daten exportieren
                </button>
            </div>
        `;
        // If the expenses manager is present, inform it about the current month revenue
        try {
            if (window && typeof window.setAdminRevenue === 'function') {
                // Pass the current month's total revenue so the ExpensesManager can compute profit automatically
                window.setAdminRevenue(currentMonth.totalRevenue || 0);
            }
        } catch (e) {
            console.warn('AccountingManager: could not set admin revenue on expenses manager', e);
        }
    }

    // Aufschlüsselung rendern
    renderBreakdown(breakdown) {
        return Object.entries(breakdown)
            .sort(([, a], [, b]) => b - a) // Nach Wert sortieren
            .map(([category, value]) => `
                <div class="breakdown-item">
                    <span class="breakdown-category">${category}</span>
                    <span class="breakdown-value">${this.formatCurrency(value)}</span>
                </div>
            `).join('');
    }

    // Trend berechnen
    calculateTrend(current, previous) {
        if (previous === 0) {
            return { text: current > 0 ? '+100%' : '0%', class: current > 0 ? 'trend-up' : 'trend-neutral' };
        }

        const percentChange = ((current - previous) / previous * 100);
        const isPositive = percentChange > 0;
        const isNeutral = Math.abs(percentChange) < 1;

        return {
            text: `${isPositive ? '+' : ''}${Math.round(percentChange)}%`,
            class: isNeutral ? 'trend-neutral' : (isPositive ? 'trend-up' : 'trend-down')
        };
    }

    // Währungsformatierung
    formatCurrency(amount) {
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount || 0);
    }

    // Monatsname erhalten
    getMonthName(month) {
        const months = [
            '', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
            'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
        ];
        return months[month] || 'Unbekannt';
    }

    // Fehler anzeigen
    showAccountingError() {
        const accountingContainer = document.getElementById('accountingStats');
        if (accountingContainer) {
            accountingContainer.innerHTML = `
                <div class="accounting-error">
                    <div class="error-icon">⚠️</div>
                    <h3>Buchhaltungsdaten konnten nicht geladen werden</h3>
                    <p>Überprüfen Sie Ihre Firebase-Verbindung und versuchen Sie es erneut.</p>
                    <button onclick="window.accountingManager.loadAccountingData()" class="btn">
                        🔄 Erneut versuchen
                    </button>
                </div>
            `;
        }
    }

    // Export-Funktion für Buchhaltungsdaten
    async exportAccountingData() {
        try {
            const currentStats = await this.calculateMonthlyStats(this.currentYear, this.currentMonth);
            const yearlyStats = await this.calculateYearlyStats(this.currentYear);

            const exportData = {
                exportDate: new Date().toISOString(),
                currentMonth: currentStats,
                yearly: yearlyStats,
                summary: {
                    totalYearlyRevenue: yearlyStats.totalRevenue,
                    totalYearlyOrders: yearlyStats.orderCount,
                    currentMonthRevenue: currentStats.totalRevenue,
                    currentMonthOrders: currentStats.orderCount
                }
            };

            // Als JSON-Datei herunterladen
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `laura-backstube-buchhaltung-${this.currentYear}-${this.currentMonth.toString().padStart(2, '0')}.json`;
            link.click();

            showNotification('Buchhaltungsdaten erfolgreich exportiert', 'success');

        } catch (error) {
            console.error('Fehler beim Exportieren:', error);
            showNotification('Fehler beim Exportieren der Daten', 'error');
        }
    }

    // Anlass-Aufschlüsselung rendern (mit benutzerfreundlichen Namen)
    renderOccasionBreakdown(breakdown) {
        const occasionNames = {
            'geburtstag': 'Geburtstag',
            'hochzeit': 'Hochzeit',
            'jahrestag': 'Jahrestag / Jubiläum',
            'taufe': 'Taufe / Kommunion / Konfirmation',
            'abschluss': 'Abschluss / Erfolg',
            'firmung': 'Firmung / Geschäftlich',
            'valentinstag': 'Valentinstag',
            'muttertag': 'Muttertag / Vatertag',
            'weihnachten': 'Weihnachten',
            'ostern': 'Ostern',
            'party': 'Party / Feier',
            'sonstiges': 'Sonstiges',
            'nicht-angegeben': 'Nicht angegeben'
        };

        if (!breakdown || Object.keys(breakdown).length === 0) {
            return '<div class="breakdown-item">Keine Daten verfügbar</div>';
        }

        return Object.entries(breakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([occasion, amount]) => {
                const displayName = occasionNames[occasion] || occasion;
                return `
                    <div class="breakdown-item">
                        <span class="breakdown-label">${displayName}</span>
                        <span class="breakdown-value">${this.formatCurrency(amount)}</span>
                    </div>
                `;
            })
            .join('');
    }

    // Monat wechseln (für zukünftige Erweiterung)
    changeMonth(year, month) {
        this.currentYear = year;
        this.currentMonth = month;
        this.loadAccountingData();
    }
}

// Globale Instanz für Admin-Dashboard
window.accountingManager = new AccountingManager();