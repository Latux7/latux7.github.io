// public-calendar.js - Öffentlicher Kalender für Kunden

class PublicCalendarManager {
    constructor() {
        this.db = null;
        this.currentDate = new Date();
        this.init();
    }

    init() {
        console.log('PublicCalendarManager: Initialisiere Firebase...');

        // Firebase App erst initialisieren, dann Firestore verwenden
        if (typeof initializeFirebaseApp === 'function') {
            this.db = initializeFirebaseApp();
            console.log('PublicCalendarManager: Firebase über initializeFirebaseApp initialisiert');
        } else {
            console.warn('PublicCalendarManager: initializeFirebaseApp nicht verfügbar, verwende Fallback');
            // Fallback für den Fall, dass Firebase noch nicht geladen ist
            setTimeout(() => {
                if (typeof initializeFirebaseApp === 'function') {
                    this.db = initializeFirebaseApp();
                    console.log('PublicCalendarManager: Firebase über Fallback initialisiert');
                } else {
                    // Direkte Initialisierung falls die Funktion immer noch nicht verfügbar ist
                    if (!firebase.apps.length) {
                        firebase.initializeApp(window.firebaseConfig);
                    }
                    this.db = firebase.firestore();
                    console.log('PublicCalendarManager: Firebase direkt initialisiert');
                }
                this.renderCalendar();
            }, 1000);
            return;
        }

        if (this.db) {
            console.log('PublicCalendarManager: Firestore erfolgreich initialisiert');
        } else {
            console.error('PublicCalendarManager: Firestore-Initialisierung fehlgeschlagen!');
        }

        this.renderCalendar();
    }

    // Bestellungen für einen Monat laden (nur Anzahl, keine Details)
    async loadOrdersCountForMonth(year, month) {
        try {
            console.log(`PublicCalendarManager: Lade Bestellungen für ${month + 1}/${year}`);

            if (!this.db) {
                console.error('PublicCalendarManager: Firebase nicht initialisiert');
                return {};
            }

            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);

            console.log(`PublicCalendarManager: Datumbereich: ${startDate.toDateString()} bis ${endDate.toDateString()}`);

            // Hauptmethode: Zähle nach wunschtermin.datum (das ist was wir wollen!)
            const orderCounts = {};

            // Alle Bestellungen für diesen Monat laden (basierend auf Wunschtermin)
            console.log('PublicCalendarManager: Lade Bestellungen nach wunschtermin.datum...');

            // Da wir einen Bereich abfragen müssen, erstellen wir die Datumstrings für den Monat
            const startDateString = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
            const endDateString = endDate.toISOString().split('T')[0]; // YYYY-MM-DD

            console.log(`PublicCalendarManager: Suche wunschtermin.datum zwischen ${startDateString} und ${endDateString}`);

            const ordersSnapshot = await this.db.collection('orders')
                .where('wunschtermin.datum', '>=', startDateString)
                .where('wunschtermin.datum', '<=', endDateString)
                .get();

            console.log(`PublicCalendarManager: ${ordersSnapshot.size} Bestellungen mit Wunschtermin gefunden`);

            ordersSnapshot.forEach(doc => {
                const order = doc.data();
                const wunschDatum = order.wunschtermin?.datum;

                if (wunschDatum) {
                    console.log(`PublicCalendarManager: Bestellung ${doc.id} für Wunschtermin ${wunschDatum}`);
                    orderCounts[wunschDatum] = (orderCounts[wunschDatum] || 0) + 1;
                }
            });

            console.log('PublicCalendarManager: Bestellzahlen pro Wunschtermin:', orderCounts);
            return orderCounts;
        } catch (error) {
            console.error('PublicCalendarManager: Fehler beim Laden der Bestellzahlen:', error);
            return {};
        }
    }    // Kalender-HTML generieren
    async generateCalendarHTML(year, month) {
        const orderCounts = await this.loadOrdersCountForMonth(year, month);

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay() === 0 ? 7 : firstDay.getDay(); // Montag = 1

        const monthNames = [
            'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
            'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
        ];

        // Header mit Monat/Jahr aktualisieren
        document.getElementById('currentMonthYear').textContent = `${monthNames[month]} ${year}`;

        let html = `
            <div class="calendar-grid" style="
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 1px;
                background: #ddd;
                border-radius: 8px;
                overflow: hidden;
            ">
                <!-- Wochentage Header -->
                <div style="background: var(--clr-accent); color: white; padding: 12px; text-align: center; font-weight: 600;">Mo</div>
                <div style="background: var(--clr-accent); color: white; padding: 12px; text-align: center; font-weight: 600;">Di</div>
                <div style="background: var(--clr-accent); color: white; padding: 12px; text-align: center; font-weight: 600;">Mi</div>
                <div style="background: var(--clr-accent); color: white; padding: 12px; text-align: center; font-weight: 600;">Do</div>
                <div style="background: var(--clr-accent); color: white; padding: 12px; text-align: center; font-weight: 600;">Fr</div>
                <div style="background: var(--clr-accent); color: white; padding: 12px; text-align: center; font-weight: 600;">Sa</div>
                <div style="background: var(--clr-accent); color: white; padding: 12px; text-align: center; font-weight: 600;">So</div>
        `;

        // Leere Zellen für Tage vor dem ersten Tag des Monats
        for (let i = 1; i < startDayOfWeek; i++) {
            html += '<div style="background: #f8f9fa; padding: 12px; min-height: 60px;"></div>';
        }

        // Tage des Monats
        for (let day = 1; day <= daysInMonth; day++) {
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const orderCount = orderCounts[dateString] || 0;
            const isPast = this.isPast(year, month, day);
            const isToday = this.isToday(year, month, day);

            let dayClass = '';
            let bgColor = '#ffffff';
            let textColor = '#333';
            let statusText = '';
            let statusColor = '#4caf50';

            if (isPast) {
                bgColor = '#f0f0f0';
                textColor = '#999';
                statusText = 'Vergangen';
                statusColor = '#999';
            } else if (orderCount >= 5) {
                bgColor = '#f8d7da';
                statusText = 'Ausgebucht';
                statusColor = '#dc3545';
            } else if (orderCount >= 3) {
                bgColor = '#fff3cd';
                statusText = `${5 - orderCount} frei`;
                statusColor = '#ffc107';
            } else {
                bgColor = '#e8f5e8';
                statusText = `${5 - orderCount} frei`;
                statusColor = '#4caf50';
            }

            if (isToday) {
                bgColor = '#e3f2fd';
                dayClass = 'today';
            }

            html += `
                <div style="
                    background: ${bgColor};
                    padding: 12px;
                    min-height: 60px;
                    border: ${isToday ? '2px solid #2196f3' : 'none'};
                    position: relative;
                    ${!isPast ? 'cursor: pointer;' : ''}
                " ${!isPast ? `onclick="publicCalendar.showDayInfo('${dateString}', ${orderCount})"` : ''}>
                    <div style="
                        font-weight: ${isToday ? 'bold' : 'normal'};
                        color: ${textColor};
                        font-size: 1.1em;
                        margin-bottom: 4px;
                    ">${day}</div>
                    ${!isPast ? `
                        <div style="
                            font-size: 0.75em;
                            color: ${statusColor};
                            font-weight: 600;
                            text-align: center;
                            background: rgba(255,255,255,0.8);
                            padding: 2px 4px;
                            border-radius: 4px;
                        ">${statusText}</div>
                    ` : ''}
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    // Tag-Info Modal anzeigen
    showDayInfo(dateString, orderCount) {
        const date = new Date(dateString);
        const formattedDate = date.toLocaleDateString('de-DE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        let available = 5 - orderCount;
        let isAvailable = orderCount < 5;

        this.showDateModal(dateString, formattedDate, orderCount, available, isAvailable);
    }

    // Modal für Datumsinfo anzeigen
    showDateModal(dateString, formattedDate, orderCount, available, isAvailable) {
        const modalHTML = `
            <div id="dateInfoModal" style="
                position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                background: rgba(0,0,0,0.5); display: flex; align-items: center; 
                justify-content: center; z-index: 1000;
            ">
                <div style="
                    background: white; padding: 30px; border-radius: 12px; 
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3); max-width: 450px; width: 90%;
                    text-align: center; animation: modalFadeIn 0.3s ease-out;
                ">
                    <div style="font-size: 3rem; margin-bottom: 15px;">
                        ${isAvailable ? '📅' : '❌'}
                    </div>
                    <h3 style="margin-bottom: 15px; color: var(--clr-accent);">${formattedDate}</h3>
                    
                    <div style="
                        background: ${isAvailable ? '#e8f5e8' : '#ffebee'}; 
                        padding: 20px; border-radius: 8px; margin-bottom: 20px;
                        border-left: 4px solid ${isAvailable ? '#4caf50' : '#f44336'};
                    ">
                        ${isAvailable ?
                `<div style="color: #2e7d32; font-weight: bold; margin-bottom: 8px;">✅ Verfügbar!</div>
                             <p style="margin: 0; line-height: 1.5;">
                                 <strong>${available} von 5 Plätzen</strong> noch frei.<br>
                                 Sie können für diesen Tag bestellen.
                             </p>` :
                `<div style="color: #c62828; font-weight: bold; margin-bottom: 8px;">❌ Ausgebucht</div>
                             <p style="margin: 0; line-height: 1.5;">
                                 Dieser Tag ist leider bereits vollständig ausgebucht.<br>
                                 Bitte wählen Sie einen anderen Termin.
                             </p>`
            }
                    </div>
                    
                    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                        ${isAvailable ?
                `<button onclick="publicCalendar.redirectToOrder('${dateString}')" style="
                                padding: 12px 24px; background: var(--clr-accent); color: white; 
                                border: none; border-radius: 6px; cursor: pointer; font-weight: bold;
                                min-width: 120px;
                            ">
                                🎂 Jetzt bestellen
                            </button>` : ''
            }
                        <button onclick="publicCalendar.closeDateModal()" style="
                            padding: 12px 24px; background: #ddd; color: #333; 
                            border: none; border-radius: 6px; cursor: pointer;
                            min-width: 120px;
                        ">
                            ${isAvailable ? 'Später' : 'Schließen'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // CSS für Animation hinzufügen falls noch nicht vorhanden
        if (!document.querySelector('#calendar-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'calendar-modal-styles';
            style.textContent = `
                @keyframes modalFadeIn {
                    from { transform: scale(0.9) translateY(-20px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Modal schließen
    closeDateModal() {
        const modal = document.getElementById('dateInfoModal');
        if (modal) {
            modal.style.animation = 'modalFadeOut 0.2s ease-out';
            setTimeout(() => modal.remove(), 200);
        }
    }

    // Zur Bestellseite weiterleiten
    redirectToOrder(dateString) {
        this.closeDateModal();
        // Kurze Verzögerung für bessere UX
        setTimeout(() => {
            window.location.href = `bestellen.html?date=${dateString}`;
        }, 150);
    }

    // Hilfsfunktionen
    isToday(year, month, day) {
        const today = new Date();
        return year === today.getFullYear() &&
            month === today.getMonth() &&
            day === today.getDate();
    }

    isPast(year, month, day) {
        const today = new Date();
        const checkDate = new Date(year, month, day);
        today.setHours(0, 0, 0, 0);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate < today;
    }

    // Navigation
    async previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        await this.renderCalendar();
    }

    async nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        await this.renderCalendar();
    }

    // Kalender rendern
    async renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const calendarView = document.getElementById('publicCalendarView');
        if (calendarView) {
            calendarView.innerHTML = 'Lade Kalender...';
            const calendarHTML = await this.generateCalendarHTML(year, month);
            calendarView.innerHTML = calendarHTML;
        }
    }

    // Zum heutigen Tag springen
    goToToday() {
        this.currentDate = new Date();
        this.renderCalendar();
    }
}

// Globale Instanz für öffentlichen Kalender
window.publicCalendar = new PublicCalendarManager();

// Datum-Parameter aus URL auslesen (für Weiterleitung von Kalender)
document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');

    if (dateParam) {
        // Zum entsprechenden Monat navigieren
        const targetDate = new Date(dateParam);
        if (!isNaN(targetDate.getTime())) {
            window.publicCalendar.currentDate = targetDate;
            window.publicCalendar.renderCalendar();
        }
    }
});