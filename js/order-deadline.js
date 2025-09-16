// order-deadline.js - Mindest-Vorlaufzeit-System für Bestellungen
console.log('🔄 OrderDeadlineManager wird geladen - Version 2024');

class OrderDeadlineManager {
    constructor() {
        this.db = null;
        this.minimumLeadDays = 7; // Mindestens 7 Tage Vorlaufzeit
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

    // Datum in 7 Tagen als String im Format YYYY-MM-DD
    getMinimumOrderDate() {
        const minDate = new Date();
        minDate.setDate(minDate.getDate() + this.minimumLeadDays);
        return minDate.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    // Prüfen ob ein Datum mindestens 7 Tage in der Zukunft liegt
    isDateTooEarly(dateString) {
        const selectedDate = new Date(dateString);
        const minDate = new Date();
        minDate.setDate(minDate.getDate() + this.minimumLeadDays);
        minDate.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);

        return selectedDate < minDate;
    }

    // Prüfen ob ein Datum für Bestellungen gültig ist (mindestens 7 Tage Vorlaufzeit)
    async canAcceptOrder(dateString = null) {
        if (!dateString) {
            console.warn('OrderDeadlineManager: Kein Datum angegeben');
            return {
                canAccept: false,
                reason: 'Kein Datum ausgewählt',
                isDateTooEarly: false
            };
        }

        const isDateTooEarly = this.isDateTooEarly(dateString);
        const minimumDate = this.getMinimumOrderDate();

        console.log(`OrderDeadlineManager: Prüfe Datum ${dateString} - Mindestdatum: ${minimumDate}`);

        return {
            canAccept: !isDateTooEarly,
            isDateTooEarly: isDateTooEarly,
            minimumDate: minimumDate,
            selectedDate: dateString,
            reason: isDateTooEarly ? `Bestellungen sind nur mit mindestens ${this.minimumLeadDays} Tagen Vorlaufzeit möglich` : 'OK'
        };
    }

    // Vorlaufzeit-Status für UI anzeigen
    async showDeadlineInfo() {
        const minimumDate = this.getMinimumOrderDate();
        const container = document.getElementById('orderDeadlineInfo');

        if (!container) {
            // Container erstellen falls nicht vorhanden
            const newContainer = document.createElement('div');
            newContainer.id = 'orderDeadlineInfo';
            newContainer.className = 'order-deadline-info';

            // Am Anfang des Bestellformulars einfügen
            const form = document.getElementById('orderForm');
            if (form) {
                form.insertBefore(newContainer, form.firstChild);
            }
        }

        const infoContainer = document.getElementById('orderDeadlineInfo');
        if (!infoContainer) return;

        infoContainer.innerHTML = `
            <div class="deadline-info">
                <div class="deadline-icon">📅</div>
                <div class="deadline-content">
                    <h3>Wichtiger Hinweis zur Bestellzeit</h3>
                    <p><strong>Bestellungen sind nur mit mindestens ${this.minimumLeadDays} Tagen Vorlaufzeit möglich.</strong></p>
                    <p>Frühestmöglicher Wunschtermin: <strong>${new Date(minimumDate).toLocaleDateString('de-DE')}</strong></p>
                    <small>So können wir die beste Qualität und Frische Ihrer Torte garantieren! 🍰</small>
                </div>
            </div>
        `;
        infoContainer.className = 'order-deadline-info';
    }

    // Datum vor der Bestellung validieren
    async validateOrderSubmission(selectedDate = null) {
        if (!selectedDate) {
            // Versuche Datum aus dem Formular zu lesen
            const dateInput = document.getElementById('wunschtermin');
            selectedDate = dateInput ? dateInput.value : null;
        }

        if (!selectedDate) {
            this.showDateRequiredModal();
            return false;
        }

        const validation = await this.canAcceptOrder(selectedDate);

        if (!validation.canAccept) {
            this.showDateTooEarlyModal(validation);
            return false;
        }

        return true;
    }

    // Modal für fehlendes Datum
    showDateRequiredModal() {
        const modalHTML = `
            <div id="dateRequiredModal" style="
                position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                background: rgba(0,0,0,0.8); z-index: 999999; 
                display: flex; align-items: center; justify-content: center;
                font-family: 'Poppins', Arial, sans-serif;
            ">
                <div style="
                    background: white; padding: 30px; border-radius: 15px; 
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5); max-width: 400px; 
                    width: 90%; text-align: center;
                ">
                    <div style="font-size: 48px; margin-bottom: 15px;">📅</div>
                    <h3 style="color: #e53e3e; margin: 0 0 15px 0;">Wunschtermin erforderlich</h3>
                    <p style="margin-bottom: 25px; line-height: 1.5;">
                        Bitte wählen Sie einen Wunschtermin für Ihre Bestellung aus.
                    </p>
                    <button onclick="document.getElementById('dateRequiredModal').remove()" style="
                        background: #ff6b6b; color: white; border: none; 
                        padding: 12px 24px; border-radius: 6px; cursor: pointer; 
                        font-weight: 600; font-size: 16px;
                    ">Verstanden</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Modal für zu frühes Datum
    showDateTooEarlyModal(validation) {
        const modalHTML = `
            <div id="dateTooEarlyModal" style="
                position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                background: rgba(0,0,0,0.8); z-index: 999999; 
                display: flex; align-items: center; justify-content: center;
                font-family: 'Poppins', Arial, sans-serif;
            ">
                <div style="
                    background: white; padding: 30px; border-radius: 15px; 
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5); max-width: 450px; 
                    width: 90%; text-align: center;
                ">
                    <div style="font-size: 48px; margin-bottom: 15px;">⏰</div>
                    <h3 style="color: #e53e3e; margin: 0 0 15px 0;">Zu kurzfristig!</h3>
                    <p style="margin-bottom: 15px; line-height: 1.5;">
                        <strong>Gewähltes Datum:</strong> ${new Date(validation.selectedDate).toLocaleDateString('de-DE')}<br>
                        <strong>Frühestmöglicher Termin:</strong> ${new Date(validation.minimumDate).toLocaleDateString('de-DE')}
                    </p>
                    <p style="margin-bottom: 25px; line-height: 1.5;">
                        ${validation.reason}
                    </p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="document.getElementById('dateTooEarlyModal').remove()" style="
                            background: #6c757d; color: white; border: none; 
                            padding: 12px 20px; border-radius: 6px; cursor: pointer; 
                            font-weight: 600;
                        ">Datum ändern</button>
                        <button onclick="document.getElementById('dateTooEarlyModal').remove(); showAvailabilityCalendar();" style="
                            background: #28a745; color: white; border: none; 
                            padding: 12px 20px; border-radius: 6px; cursor: pointer; 
                            font-weight: 600;
                        ">Kalender öffnen</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Kalender-Mindestdatum setzen
    setCalendarMinDate() {
        const dateInput = document.getElementById('wunschtermin');
        if (dateInput) {
            const minDate = this.getMinimumOrderDate();
            dateInput.setAttribute('min', minDate);
            console.log(`OrderDeadlineManager: Kalendar Mindestdatum gesetzt auf: ${minDate}`);
        }
    }

    // Bestellungen für ein bestimmtes Datum zählen (für Statistiken)
    async countOrdersForDate(dateString) {
        try {
            if (!this.db) {
                console.warn('OrderDeadlineManager: Firebase noch nicht initialisiert');
                return 0;
            }

            const ordersSnapshot = await this.db.collection('orders')
                .where('wunschtermin.datum', '==', dateString)
                .get();

            return ordersSnapshot.size;
        } catch (error) {
            console.error('OrderDeadlineManager: Fehler beim Zählen der Bestellungen:', error);
            return 0;
        }
    }
}

// Globale Instanz - Für Rückwärtskompatibilität mit OrderLimitManager
window.orderLimitManager = new OrderDeadlineManager();
window.orderDeadlineManager = new OrderDeadlineManager();