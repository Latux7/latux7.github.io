// order-deadline.js - Mindest-Vorlaufzeit-System für Bestellungen
// OrderDeadlineManager loading (production logs silenced)

class OrderDeadlineManager {
    constructor() {
        this.db = null;
        this.minimumLeadDays = 7; // Mindestens 7 Tage Vorlaufzeit
        this.maxOrdersPerDay = 3; // KONFIGURIERBAR: Maximale Bestellungen pro Tag
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

        // Zeitzone-sichere Konvertierung - lokales Datum verwenden
        const year = minDate.getFullYear();
        const month = String(minDate.getMonth() + 1).padStart(2, '0');
        const day = String(minDate.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`; // YYYY-MM-DD
    }

    // Prüfen ob ein Datum mindestens 7 Tage in der Zukunft liegt
    isDateTooEarly(dateString) {
        const selectedDate = new Date(dateString + 'T12:00:00'); // Mittags um Zeitzone-Probleme zu vermeiden
        const minDate = new Date();
        minDate.setDate(minDate.getDate() + this.minimumLeadDays);

        // Beide Daten auf Mitternacht lokale Zeit setzen
        selectedDate.setHours(0, 0, 0, 0);
        minDate.setHours(0, 0, 0, 0);

        const isEarly = selectedDate < minDate;
        // Date validation result (debug-level)
        // console.debug(`Datum-Validierung: Gewählt=${dateString}, Minimum=${this.getMinimumOrderDate()}, Zu früh=${isEarly}`);

        return isEarly;
    }    // Prüfen ob ein Datum für Bestellungen gültig ist (Vorlaufzeit UND Kapazität)
    async canAcceptOrder(dateString = null) {
        if (!dateString) {
            console.warn('OrderDeadlineManager: Kein Datum angegeben');
            return {
                canAccept: false,
                reason: 'Kein Datum ausgewählt',
                isDateTooEarly: false,
                isCapacityFull: false,
                ordersCount: 0,
                maxOrders: this.maxOrdersPerDay
            };
        }

        // 1. Vorlaufzeit prüfen
        const isDateTooEarly = this.isDateTooEarly(dateString);
        const minimumDate = this.getMinimumOrderDate();

        if (isDateTooEarly) {
            return {
                canAccept: false,
                reason: `Bestellungen sind nur mit mindestens ${this.minimumLeadDays} Tagen Vorlaufzeit möglich`,
                isDateTooEarly: true,
                isCapacityFull: false,
                minimumDate: minimumDate,
                selectedDate: dateString,
                ordersCount: 0,
                maxOrders: this.maxOrdersPerDay
            };
        }

        // 2. Kapazität prüfen
        const ordersCount = await this.countOrdersForDate(dateString);
        const isCapacityFull = ordersCount >= this.maxOrdersPerDay;

        // Capacity check result for date (counts hidden)

        return {
            canAccept: !isDateTooEarly && !isCapacityFull,
            isDateTooEarly: isDateTooEarly,
            isCapacityFull: isCapacityFull,
            minimumDate: minimumDate,
            selectedDate: dateString,
            ordersCount: ordersCount,
            maxOrders: this.maxOrdersPerDay,
            reason: isCapacityFull ? `Maximale Kapazität erreicht (${ordersCount}/${this.maxOrdersPerDay} Bestellungen)` : 'Datum verfügbar'
        };
    }

    // Vorlaufzeit- und Kapazitäts-Status für UI anzeigen
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

        // Datum korrekt formatieren ohne Zeitzone-Probleme
        const minDateParts = minimumDate.split('-'); // [YYYY, MM, DD]
        const formattedDate = `${minDateParts[2]}.${minDateParts[1]}.${minDateParts[0]}`;

        infoContainer.innerHTML = `
            <div class="deadline-info">
                <div class="deadline-icon">📅</div>
                <div class="deadline-content">
                    <h3>Wichtige Hinweise zur Bestellung</h3>
                    <p><strong>Mindest-Vorlaufzeit:</strong> ${this.minimumLeadDays} Tage</p>
                    <p><strong>Frühestmöglicher Wunschtermin:</strong> ${formattedDate}</p>
                    <p><strong>Maximale Bestellungen pro Tag:</strong> ${this.maxOrdersPerDay} Stück</p>
                    <small>So können wir die beste Qualität und individuelle Betreuung garantieren! 🍰</small>
                </div>
            </div>
        `;
        infoContainer.className = 'order-deadline-info';
    }

    // Datum vor der Bestellung validieren
    async validateOrderSubmission(selectedDate = null) {
        if (!selectedDate) {
            // Versuche Datum aus dem Formular zu lesen - korrekte ID verwenden
            const dateInput = document.getElementById('wunschDatum'); // KORRIGIERT: wunschDatum statt wunschtermin
            selectedDate = dateInput ? dateInput.value : null;
            // Date read from form (debug-level)
        }

        if (!selectedDate || selectedDate.trim() === '') {
            // No date found - showing modal
            this.showDateRequiredModal();
            return false;
        }

        const validation = await this.canAcceptOrder(selectedDate);

        if (!validation.canAccept) {
            if (validation.isDateTooEarly) {
                // Date too early - showing lead-time modal
                this.showDateTooEarlyModal(validation);
            } else if (validation.isCapacityFull) {
                // Capacity full - showing capacity modal
                this.showCapacityFullModal(validation);
            }
            return false;
        }

        // Date available - proceed
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

    // Modal für ausgebuchte Termine (Kapazität erreicht)
    showCapacityFullModal(validation) {
        const modalHTML = `
            <div id="capacityFullModal" style="
                position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; 
                z-index: 1000; font-family: 'Poppins', sans-serif;
            ">
                <div style="
                    background: white; padding: 40px; border-radius: 12px; text-align: center; 
                    max-width: 500px; margin: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                ">
                    <div style="font-size: 48px; margin-bottom: 15px;">🚫</div>
                    <h3 style="color: #ff8c00; margin: 0 0 15px 0;">Termin ausgebucht</h3>
                    <p style="margin-bottom: 25px; line-height: 1.5;">
                        Dieser Wunschtermin ist bereits ausgebucht.
                        <br><strong>${validation.ordersCount}/${validation.maxOrders}</strong> Bestellungen belegt.
                    </p>
                    <p style="margin-bottom: 25px; line-height: 1.5; color: #666; font-size: 14px;">
                        Wählen Sie bitte einen anderen Termin oder prüfen Sie die Verfügbarkeit in unserem Kalender.
                    </p>
                    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="document.getElementById('capacityFullModal').remove()" style="
                            background: #6c757d; color: white; border: none; 
                            padding: 12px 20px; border-radius: 6px; cursor: pointer; 
                            font-weight: 600;
                        ">Anderes Datum wählen</button>
                        <button onclick="document.getElementById('capacityFullModal').remove(); showAvailabilityCalendar();" style="
                            background: #007bff; color: white; border: none; 
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
        const dateInput = document.getElementById('wunschDatum'); // KORRIGIERT: wunschDatum statt wunschtermin
        if (dateInput) {
            const minDate = this.getMinimumOrderDate();
            dateInput.setAttribute('min', minDate);
            // Calendar minimum date set (value hidden)
        } else {
            console.warn('OrderDeadlineManager: Datum-Input mit ID "wunschDatum" nicht gefunden');
        }
    }

    // Bestellungen für ein bestimmtes Datum zählen (für Kapazitätsprüfung)
    async countOrdersForDate(dateString) {
        try {
            if (!this.db) {
                console.warn('OrderDeadlineManager: Firebase noch nicht initialisiert');
                return 0;
            }

            // Prüfe sowohl 'wunschDatum' als auch 'wunschtermin.datum' für Kompatibilität
            const queries = [
                this.db.collection('orders').where('wunschDatum', '==', dateString),
                this.db.collection('orders').where('wunschtermin.datum', '==', dateString)
            ];

            let totalCount = 0;
            for (const query of queries) {
                const snapshot = await query.get();
                totalCount += snapshot.size;
            }

            // Orders count for date computed (count hidden)
            return totalCount;
        } catch (error) {
            console.error('OrderDeadlineManager: Fehler beim Zählen der Bestellungen:', error);
            return 0;
        }
    }

    // Kapazitätsstatus für Datum abrufen
    async getCapacityStatus(dateString) {
        const ordersCount = await this.countOrdersForDate(dateString);
        const available = this.maxOrdersPerDay - ordersCount;
        const isFull = ordersCount >= this.maxOrdersPerDay;

        return {
            ordersCount,
            maxOrders: this.maxOrdersPerDay,
            available,
            isFull,
            percentageFull: Math.round((ordersCount / this.maxOrdersPerDay) * 100)
        };
    }

    // Konfiguration: Maximale Bestellungen pro Tag ändern
    setMaxOrdersPerDay(newMax) {
        this.maxOrdersPerDay = newMax;
        // Max orders per day updated
        return this.maxOrdersPerDay;
    }
}

// Globale Instanz - Für Rückwärtskompatibilität mit OrderLimitManager
// Globale Instanz - Für Rückwärtskompatibilität mit OrderLimitManager
// Create a single instance and assign it to both global names to avoid double initialization.
if (!window.orderLimitManager) {
    const __orderDeadlineInstance = new OrderDeadlineManager();
    window.orderLimitManager = __orderDeadlineInstance;
    window.orderDeadlineManager = __orderDeadlineInstance;
} else if (!window.orderDeadlineManager) {
    // If a legacy orderLimitManager exists, reuse it for the new name.
    window.orderDeadlineManager = window.orderLimitManager;
}

// Globale Admin-Funktionen für Kapazitätsmanagement
window.setMaxOrdersPerDay = function (newMax) {
    if (window.orderLimitManager) {
        return window.orderLimitManager.setMaxOrdersPerDay(newMax);
    }
    return null;
};

window.getCapacityStatus = async function (dateString) {
    if (window.orderLimitManager) {
        return await window.orderLimitManager.getCapacityStatus(dateString);
    }
    return null;
};