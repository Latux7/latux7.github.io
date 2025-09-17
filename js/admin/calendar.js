// calendar.js - Kalender-Integration für Admin-Panel

class CalendarManager {
    constructor() {
        this.db = null;
        this.currentDate = new Date();
        this.orders = [];
        this.init();
    }

    init() {
        console.log('CalendarManager: Initialisiere Firebase...');

        // Firebase App erst initialisieren, dann Firestore verwenden
        if (typeof initializeFirebaseApp === 'function') {
            this.db = initializeFirebaseApp();
            console.log('CalendarManager: Firebase über initializeFirebaseApp initialisiert');
        } else {
            console.warn('CalendarManager: initializeFirebaseApp nicht verfügbar, verwende Fallback');
            setTimeout(() => {
                if (typeof initializeFirebaseApp === 'function') {
                    this.db = initializeFirebaseApp();
                    console.log('CalendarManager: Firebase über Fallback initialisiert');
                } else {
                    // Direkte Initialisierung falls die Funktion immer noch nicht verfügbar ist
                    if (!firebase.apps.length) {
                        firebase.initializeApp(window.firebaseConfig);
                    }
                    this.db = firebase.firestore();
                    console.log('CalendarManager: Firebase direkt initialisiert');
                }
                this.loadCalendarData();
            }, 1000);
        }

        if (this.db) {
            console.log('CalendarManager: Firestore erfolgreich initialisiert');
        } else {
            console.error('CalendarManager: Firestore-Initialisierung fehlgeschlagen!');
        }
    }

    // Bestellungen für einen Monat laden
    async loadOrdersForMonth(year, month) {
        try {
            console.log(`CalendarManager: Lade Bestellungen für ${month + 1}/${year}`);

            if (!this.db) {
                console.error('CalendarManager: Firebase noch nicht initialisiert');
                return [];
            }

            // Start und Ende des Monats
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59);

            console.log(`CalendarManager: Datumbereich: ${startDate.toDateString()} bis ${endDate.toDateString()}`);

            let orders = [];

            // Hauptmethode: wunschtermin.datum verwenden (unterstützt sowohl String als auch Timestamp)
            try {
                // Versuche erst mit Timestamp (wie in embedded-calendar.js)
                const startTimestamp = firebase.firestore.Timestamp.fromDate(startDate);
                const endTimestamp = firebase.firestore.Timestamp.fromDate(endDate);

                console.log(`CalendarManager: Suche nach wunschtermin.datum (Timestamp) zwischen ${startDate.toDateString()} und ${endDate.toDateString()}`);

                const ordersSnapshot1 = await this.db.collection('orders')
                    .where('wunschtermin.datum', '>=', startTimestamp)
                    .where('wunschtermin.datum', '<=', endTimestamp)
                    .get();

                console.log(`CalendarManager: Methode 1 (wunschtermin.datum Timestamp): ${ordersSnapshot1.size} Bestellungen`);

                ordersSnapshot1.forEach(doc => {
                    const orderData = doc.data();
                    const dateObj = orderData.wunschtermin?.datum?.toDate ? orderData.wunschtermin.datum.toDate() : new Date(orderData.wunschtermin?.datum);
                    orders.push({
                        id: doc.id,
                        ...orderData,
                        date: dateObj.toISOString().split('T')[0],
                        displayDate: dateObj.toLocaleDateString('de-DE')
                    });
                });

                // Falls keine Treffer mit Timestamp, versuche String-Format
                if (orders.length === 0) {
                    const startDateString = startDate.toISOString().split('T')[0];
                    const endDateString = endDate.toISOString().split('T')[0];

                    console.log(`CalendarManager: Suche nach wunschtermin.datum (String) zwischen ${startDateString} und ${endDateString}`);

                    const ordersSnapshot2 = await this.db.collection('orders')
                        .where('wunschtermin.datum', '>=', startDateString)
                        .where('wunschtermin.datum', '<=', endDateString)
                        .get();

                    console.log(`CalendarManager: Methode 1b (wunschtermin.datum String): ${ordersSnapshot2.size} Bestellungen`);

                    ordersSnapshot2.forEach(doc => {
                        const orderData = doc.data();
                        orders.push({
                            id: doc.id,
                            ...orderData,
                            date: orderData.wunschtermin?.datum,
                            displayDate: orderData.wunschtermin?.datum
                        });
                    });
                }
            } catch (error) {
                console.warn('CalendarManager: wunschtermin.datum Abfrage fehlgeschlagen:', error);
            }

            // Fallback: Wenn keine Wunschtermine gefunden wurden, versuche created-Feld
            if (orders.length === 0) {
                try {
                    const ordersSnapshot2 = await this.db.collection('orders')
                        .where('created', '>=', startDate.toISOString())
                        .where('created', '<=', endDate.toISOString())
                        .get();

                    console.log(`CalendarManager: Fallback (created): ${ordersSnapshot2.size} Bestellungen`);

                    ordersSnapshot2.forEach(doc => {
                        const orderData = doc.data();
                        const createdDate = new Date(orderData.created);
                        orders.push({
                            id: doc.id,
                            ...orderData,
                            date: createdDate.toISOString().split('T')[0],
                            displayDate: createdDate.toISOString().split('T')[0] + ' (Erstellt)',
                            isFallback: true // Markierung dass dies ein Fallback ist
                        });
                    });
                } catch (error) {
                    console.warn('CalendarManager: created Fallback fehlgeschlagen:', error);
                }
            }

            console.log(`CalendarManager: Gesamt gefundene Bestellungen: ${orders.length}`);
            orders.forEach(order => {
                console.log(`CalendarManager: Bestellung ${order.id} für ${order.displayDate}${order.isFallback ? ' (Fallback)' : ''}`);
            });

            return orders;

        } catch (error) {
            console.error('CalendarManager: Fehler beim Laden der Kalender-Bestellungen:', error);
            return [];
        }
    }    // Kalender-HTML generieren
    async generateCalendarHTML(year, month) {
        const orders = await this.loadOrdersForMonth(year, month);

        // Gruppiere Bestellungen nach Datum
        const ordersByDate = {};
        orders.forEach(order => {
            const date = order.date;
            if (!ordersByDate[date]) {
                ordersByDate[date] = [];
            }
            ordersByDate[date].push(order);
        });

        // Kalender-Grundstruktur
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Montag = 0
        const daysInMonth = lastDay.getDate();

        const monthNames = [
            'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
            'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
        ];

        let calendarHTML = `
            <div class="calendar-container">
                <div class="calendar-header">
                    <button onclick="window.calendarManager.previousMonth()" class="calendar-nav">‹</button>
                    <h3>${monthNames[month]} ${year}</h3>
                    <button onclick="window.calendarManager.nextMonth()" class="calendar-nav">›</button>
                </div>
                
                <div class="calendar-grid">
                    <div class="calendar-weekdays">
                        <div class="weekday">Mo</div>
                        <div class="weekday">Di</div>
                        <div class="weekday">Mi</div>
                        <div class="weekday">Do</div>
                        <div class="weekday">Fr</div>
                        <div class="weekday">Sa</div>
                        <div class="weekday">So</div>
                    </div>
                    
                    <div class="calendar-days">
        `;

        // Leere Zellen für Tage vor dem Monatsbeginn
        for (let i = 0; i < startDay; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }

        // Tage des Monats
        for (let day = 1; day <= daysInMonth; day++) {
            const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayOrders = ordersByDate[date] || [];
            const isToday = this.isToday(year, month, day);
            const isPast = this.isPast(year, month, day);

            let dayClass = 'calendar-day';
            if (isToday) dayClass += ' today';
            if (isPast) dayClass += ' past';
            if (dayOrders.length > 0) dayClass += ' has-orders';

            calendarHTML += `
                <div class="${dayClass}" data-date="${date}">
                    <div class="day-number">${day}</div>
                    <div class="day-orders">
                        ${this.renderDayOrders(dayOrders)}
                    </div>
                </div>
            `;
        }

        calendarHTML += `
                    </div>
                </div>
                
                <div class="calendar-legend">
                    <div class="legend-item">
                        <div class="legend-color today"></div>
                        <span>Heute</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color has-orders"></div>
                        <span>Bestellungen</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color status-neu"></div>
                        <span>Neu</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color status-in-vorbereitung"></div>
                        <span>In Vorbereitung</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color status-fertig"></div>
                        <span>Fertig</span>
                    </div>
                </div>
            </div>
        `;

        return calendarHTML;
    }

    // Bestellungen für einen Tag rendern
    renderDayOrders(orders) {
        if (orders.length === 0) return '';

        let html = '';
        orders.slice(0, 3).forEach(order => { // Max 3 anzeigen
            // Normalize status to a CSS-friendly class (lowercase, spaces -> hyphens)
            const rawStatus = order.status || 'neu';
            const normalizedStatus = String(rawStatus).toLowerCase().replace(/\s+/g, '-');
            const statusClass = `status-${normalizedStatus}`;

            // Name und Größe extrahieren
            const customerName = order.name || 'Unbekannt';
            let orderSize = 'Unbekannt';

            if (order.details && order.details.durchmesserCm) {
                const cm = order.details.durchmesserCm;
                const kategorie = order.details.kategorie || this.deriveTierFromCm(cm);
                orderSize = `${cm} cm (${kategorie})`;
            }

            // For the calendar short view we keep the title concise but include tier count in tooltip if available
            const tooltipExtras = order.details && order.details.extras && typeof formatExtras === 'function' ? formatExtras(order.details.extras, order.details) : '';
            const tooltip = tooltipExtras ? `${customerName} - ${orderSize} - ${tooltipExtras}` : `${customerName} - ${orderSize}`;

            html += `
                <div class="day-order ${statusClass}" title="${tooltip}" onclick="window.calendarManager.showOrderDetails('${order.id}')">
                    <span class="order-name">${customerName.substring(0, 8)}...</span>
                </div>
            `;
        });

        if (orders.length > 3) {
            html += `<div class="day-order-more">+${orders.length - 3}</div>`;
        }

        return html;
    }

    // Hilfsfunktion: Kategorie aus cm ableiten
    deriveTierFromCm(cm) {
        if (cm <= 14) return 'Mini';
        if (cm <= 20) return 'Normal';
        return 'Groß';
    }

    // Hilfsfunktionen
    isToday(year, month, day) {
        const today = new Date();
        return year === today.getFullYear() &&
            month === today.getMonth() &&
            day === today.getDate();
    }

    isPast(year, month, day) {
        const date = new Date(year, month, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
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
        const calendarContainer = document.getElementById('calendarView');
        if (!calendarContainer) {
            console.warn('Kalender-Container nicht gefunden');
            return;
        }

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        calendarContainer.innerHTML = await this.generateCalendarHTML(year, month);
    }

    // Kalender-Daten laden und anzeigen
    async loadCalendarData() {
        await this.renderCalendar();
    }

    // Bestelldetails anzeigen
    async showOrderDetails(orderId) {
        try {
            const orderDoc = await this.db.collection('orders').doc(orderId).get();
            if (!orderDoc.exists) {
                showNotification('Bestellung nicht gefunden', 'error');
                return;
            }

            const order = orderDoc.data();

            // Daten sind jetzt direkt in der Bestellung verfügbar
            const customerName = order.name || 'Unbekannt';
            const customerEmail = order.email || 'Unbekannt';
            const customerPhone = order.telefon || 'Nicht angegeben';
            const modalHTML = `
                <div id="orderDetailsModal" style="
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
                        padding: 30px;
                        border-radius: 15px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                        max-width: 500px;
                        width: 90%;
                        max-height: 80vh;
                        overflow-y: auto;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h3 style="margin: 0; color: #333;">📅 Bestelldetails</h3>
                            <button onclick="document.getElementById('orderDetailsModal').remove()" style="
                                background: none;
                                border: none;
                                font-size: 24px;
                                cursor: pointer;
                                color: #666;
                            ">×</button>
                        </div>
                        
                        <div style="line-height: 1.6;">
                            <p><strong>Kunde:</strong> ${customerName}</p>
                            <p><strong>E-Mail:</strong> ${customerEmail}</p>
                            <p><strong>Telefon:</strong> ${customerPhone}</p>
                            <p><strong>Wunschtermin:</strong> ${order.wunschtermin && order.wunschtermin.datum
                    ? new Date(order.wunschtermin.datum.toDate ? order.wunschtermin.datum.toDate() : order.wunschtermin.datum).toLocaleDateString('de-DE')
                    : 'Nicht angegeben'}</p>
                            <p><strong>Uhrzeit:</strong> ${order.wunschtermin && order.wunschtermin.uhrzeit || 'Nicht angegeben'}</p>
                            ${order.anlass ? `<p><strong>Anlass:</strong> ${this.getOccasionDisplayName(order.anlass)}</p>` : ''}
                <p><strong>Größe:</strong> ${order.details && order.details.durchmesserCm
                    ? `${order.details.durchmesserCm} cm (${order.details.kategorie || this.deriveTierFromCm(order.details.durchmesserCm)})`
                    : 'Unbekannt'}</p>
                ${order.details && order.details.numberOfTiers ? `<p><strong>Stockwerke:</strong> ${escapeHtml(String(order.details.numberOfTiers))}</p>` : ''}
                            <p><strong>Status:</strong> <span style="
                                padding: 4px 8px;
                                border-radius: 4px;
                                background: ${this.getStatusColor(order.status || 'neu')};
                                color: white;
                                font-weight: 600;
                            ">${order.status || 'neu'}</span></p>
                            <p><strong>Preis:</strong> ${order.gesamtpreis ? parseFloat(order.gesamtpreis).toFixed(2) + '€' : 'Nicht berechnet'}</p>
                            ${order.details && order.details.extras && order.details.extras.length > 0 ? `<p><strong>Extras:</strong> ${formatExtras(order.details.extras, order.details)}</p>` : ''}
                            ${order.sonderwunsch ? `<p><strong>Sonderwunsch:</strong> ${order.sonderwunsch}</p>` : ''}
                            ${order.details && order.details.lieferung ? `<p><strong>Lieferart:</strong> ${order.details.lieferung === 'abholung' ? 'Abholung' : toTitleCase(order.details.lieferung)}</p>` : ''}
                            ${order.details && order.details.lieferung && order.adresse ? `<p><strong>Adresse:</strong> ${escapeHtml(order.adresse.street)}, ${escapeHtml(order.adresse.plz)} ${escapeHtml(order.adresse.city)}</p>` : ''}
                        </div>
                        
                        <div style="margin-top: 25px; display: flex; gap: 10px;">
                            <button onclick="window.orderManager.updateOrderStatus('${orderId}', 'in Vorbereitung')" style="
                                background: #ff9800;
                                color: white;
                                border: none;
                                padding: 10px 15px;
                                border-radius: 6px;
                                cursor: pointer;
                                flex: 1;
                            ">In Vorbereitung</button>
                            <button onclick="window.orderManager.updateOrderStatus('${orderId}', 'fertig')" style="
                                background: #4caf50;
                                color: white;
                                border: none;
                                padding: 10px 15px;
                                border-radius: 6px;
                                cursor: pointer;
                                flex: 1;
                            ">Fertig</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

        } catch (error) {
            console.error('Fehler beim Laden der Bestelldetails:', error);
            showNotification('Fehler beim Laden der Bestelldetails', 'error');
        }
    }

    // Status-Farbe bestimmen
    getStatusColor(status) {
        const s = String(status || '').toLowerCase();

        if (s === 'neu') return '#2196f3';
        // treat legacy variants and normalized strings that indicate preparation
        if (s.includes('bearbeitung') || s.includes('vorbereitung')) return '#ff9800';
        if (s === 'fertig') return '#4caf50';
        if (s === 'abgeholt') return '#9e9e9e';
        return '#2196f3';
    }

    // Zum heutigen Tag springen
    goToToday() {
        this.currentDate = new Date();
        this.renderCalendar();
    }

    // Zu bestimmtem Monat springen
    goToMonth(year, month) {
        this.currentDate = new Date(year, month, 1);
        this.renderCalendar();
    }

    // Anlass-Display-Namen
    getOccasionDisplayName(occasion) {
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
            'sonstiges': 'Sonstiges'
        };
        return occasionNames[occasion] || occasion;
    }
}

// Globale Instanz für Admin-Dashboard
window.calendarManager = new CalendarManager();