// order-limits.js - Tägliches Bestelllimit-System

class OrderLimitManager {
    constructor() {
        this.db = null;
        this.dailyLimit = 5; // Maximum 5 Torten pro Tag
        this.init();
    }

    init() {
        // Firebase App erst initialisieren, dann Firestore verwenden
        if (typeof initializeFirebaseApp === 'function') {
            this.db = initializeFirebaseApp();
        } else {
            // Fallback für den Fall, dass Firebase noch nicht geladen ist
            setTimeout(() => {
                this.db = initializeFirebaseApp();
            }, 1000);
        }
    }

    // Heutiges Datum als String im Format YYYY-MM-DD
    getTodayString() {
        const today = new Date();
        return today.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    // Bestellungen für ein bestimmtes Datum zählen
    async countOrdersForDate(dateString) {
        try {
            if (!this.db) {
                console.warn('Firebase noch nicht initialisiert');
                return 0;
            }

            // Start und Ende des Tages
            const startOfDay = new Date(dateString + 'T00:00:00.000Z');
            const endOfDay = new Date(dateString + 'T23:59:59.999Z');

            const ordersSnapshot = await this.db.collection('orders')
                .where('created', '>=', startOfDay.toISOString())
                .where('created', '<=', endOfDay.toISOString())
                .get();

            return ordersSnapshot.size;

        } catch (error) {
            console.error('Fehler beim Zählen der Bestellungen:', error);
            return 0;
        }
    }

    // Prüfen ob heute noch Bestellungen angenommen werden können
    async canAcceptOrder(dateString = null) {
        const targetDate = dateString || this.getTodayString();
        const currentCount = await this.countOrdersForDate(targetDate);

        return {
            canAccept: currentCount < this.dailyLimit,
            currentCount: currentCount,
            limit: this.dailyLimit,
            remaining: Math.max(0, this.dailyLimit - currentCount),
            date: targetDate
        };
    }

    // Bestelllimit-Status für UI anzeigen
    async showLimitStatus() {
        const status = await this.canAcceptOrder();
        const limitContainer = document.getElementById('orderLimitStatus');

        if (!limitContainer) {
            // Container erstellen falls nicht vorhanden
            const container = document.createElement('div');
            container.id = 'orderLimitStatus';
            container.className = 'order-limit-status';

            // Am Anfang des Bestellformulars einfügen
            const form = document.getElementById('orderForm');
            if (form) {
                form.insertBefore(container, form.firstChild);
            }
        }

        const container = document.getElementById('orderLimitStatus');
        if (!container) return;

        if (status.canAccept) {
            // Noch Plätze verfügbar
            container.innerHTML = `
                <div class="limit-info available">
                    <div class="limit-icon">✅</div>
                    <div class="limit-content">
                        <h3>Bestellungen heute verfügbar</h3>
                        <p><strong>${status.remaining} von ${status.limit}</strong> Plätzen noch frei</p>
                        <small>Tägliches Limit: ${status.limit} Torten pro Tag für beste Qualität</small>
                    </div>
                </div>
            `;
            container.className = 'order-limit-status available';
        } else {
            // Limit erreicht
            container.innerHTML = `
                <div class="limit-info unavailable">
                    <div class="limit-icon">🚫</div>
                    <div class="limit-content">
                        <h3>Tägliches Bestelllimit erreicht</h3>
                        <p><strong>${status.currentCount} von ${status.limit}</strong> Torten bereits bestellt</p>
                        <p class="limit-message">
                            Heute können leider keine weiteren Bestellungen angenommen werden.<br>
                            Versuchen Sie es morgen erneut oder kontaktieren Sie uns direkt.
                        </p>
                        <div class="limit-actions">
                            <a href="tel:+4917645897545" class="btn btn-outline">📞 Anrufen</a>
                            <a href="mailto:lauratustean@gmail.com" class="btn btn-outline">✉️ E-Mail</a>
                        </div>
                    </div>
                </div>
            `;
            container.className = 'order-limit-status unavailable';

            // Bestellformular deaktivieren
            this.disableOrderForm();
        }
    }

    // Bestellformular deaktivieren
    disableOrderForm() {
        const form = document.getElementById('orderForm');
        if (!form) return;

        // Alle Input-Felder deaktivieren
        const inputs = form.querySelectorAll('input, select, textarea, button');
        inputs.forEach(input => {
            input.disabled = true;
            input.style.opacity = '0.5';
        });

        // Submit-Button speziell behandeln
        const submitBtn = form.querySelector('input[type="submit"], button[type="submit"]');
        if (submitBtn) {
            submitBtn.value = 'Bestellungen heute nicht mehr möglich';
            submitBtn.style.background = '#666';
            submitBtn.style.cursor = 'not-allowed';
        }
    }

    // Bestellformular wieder aktivieren
    enableOrderForm() {
        const form = document.getElementById('orderForm');
        if (!form) return;

        // Alle Input-Felder aktivieren
        const inputs = form.querySelectorAll('input, select, textarea, button');
        inputs.forEach(input => {
            input.disabled = false;
            input.style.opacity = '1';
        });

        // Submit-Button zurücksetzen
        const submitBtn = form.querySelector('input[type="submit"], button[type="submit"]');
        if (submitBtn) {
            submitBtn.value = 'Torte bestellen';
            submitBtn.style.background = '';
            submitBtn.style.cursor = '';
        }
    }

    // Bestellung vor dem Absenden prüfen
    async validateOrderSubmission() {
        const status = await this.canAcceptOrder();

        if (!status.canAccept) {
            // Modal mit Limit-Erreicht-Nachricht anzeigen
            this.showLimitReachedModal(status);
            return false;
        }

        return true;
    }

    // Modal für Limit-erreicht anzeigen
    showLimitReachedModal(status) {
        const modalHTML = `
            <div id="limitReachedModal" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.8);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Poppins', Arial, sans-serif;
            ">
                <div style="
                    background: white;
                    padding: 40px;
                    border-radius: 15px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                    text-align: center;
                    max-width: 500px;
                    width: 90%;
                    border: 3px solid #f44336;
                ">
                    <div style="
                        width: 80px;
                        height: 80px;
                        background: #f44336;
                        border-radius: 50%;
                        margin: 0 auto 20px auto;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 40px;
                        color: white;
                    ">🚫</div>
                    
                    <h2 style="color: #f44336; margin-bottom: 15px;">
                        Tägliches Bestelllimit erreicht
                    </h2>
                    
                    <p style="margin-bottom: 20px; line-height: 1.6;">
                        Heute wurden bereits <strong>${status.currentCount} von ${status.limit}</strong> Torten bestellt.<br>
                        Um die beste Qualität zu gewährleisten, nehmen wir täglich nur begrenzt Bestellungen an.
                    </p>
                    
                    <div style="
                        background: #fff3cd;
                        border: 1px solid #ffeaa7;
                        border-radius: 8px;
                        padding: 15px;
                        margin: 20px 0;
                        font-size: 14px;
                    ">
                        <strong>💡 Alternativen:</strong><br>
                        • Versuchen Sie es morgen erneut<br>
                        • Kontaktieren Sie uns direkt per Telefon<br>
                        • Schreiben Sie uns eine E-Mail für individuelle Absprachen
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: center; margin-top: 25px;">
                        <a href="tel:+4917645897545" style="
                            background: #4CAF50;
                            color: white;
                            padding: 12px 20px;
                            border-radius: 8px;
                            text-decoration: none;
                            font-weight: 600;
                        ">📞 Anrufen</a>
                        
                        <a href="mailto:info@lauras-backstube.de" style="
                            background: #2196F3;
                            color: white;
                            padding: 12px 20px;
                            border-radius: 8px;
                            text-decoration: none;
                            font-weight: 600;
                        ">✉️ E-Mail</a>
                        
                        <button onclick="document.getElementById('limitReachedModal').remove()" style="
                            background: #666;
                            color: white;
                            padding: 12px 20px;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                        ">Verstanden</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Admin-Funktionen: Limit temporär ändern
    async setDailyLimit(newLimit) {
        this.dailyLimit = newLimit;
        localStorage.setItem('customDailyLimit', newLimit.toString());
        console.log(`Tägliches Limit auf ${newLimit} gesetzt`);

        // UI aktualisieren
        await this.showLimitStatus();
    }

    // Limit aus localStorage laden (für Admin-Anpassungen)
    loadCustomLimit() {
        const customLimit = localStorage.getItem('customDailyLimit');
        if (customLimit && !isNaN(customLimit)) {
            this.dailyLimit = parseInt(customLimit);
        }
    }

    // Statistiken für mehrere Tage abrufen
    async getOrderStats(days = 7) {
        const stats = [];
        const today = new Date();

        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = date.toISOString().split('T')[0];

            const count = await this.countOrdersForDate(dateString);
            stats.push({
                date: dateString,
                count: count,
                limit: this.dailyLimit,
                percentage: Math.round((count / this.dailyLimit) * 100)
            });
        }

        return stats.reverse(); // Älteste zuerst
    }
}

// Globale Instanz
window.orderLimitManager = new OrderLimitManager();