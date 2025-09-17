// calendar.js - Kalender-Integration für Admin-Panel

class CalendarManager {
    constructor() {
        this.db = null;
        this.currentDate = new Date();
        this.orders = [];
        this.init();
    }

    init() {
        // CalendarManager init

        // Firebase App erst initialisieren, dann Firestore verwenden
        if (typeof initializeFirebaseApp === 'function') {
            this.db = initializeFirebaseApp();
        } else {
            console.warn('CalendarManager: initializeFirebaseApp nicht verfügbar, verwende Fallback');
            setTimeout(() => {
                if (typeof initializeFirebaseApp === 'function') {
                    this.db = initializeFirebaseApp();
                } else {
                    // Direkte Initialisierung falls die Funktion immer noch nicht verfügbar ist
                    if (!firebase.apps.length) {
                        firebase.initializeApp(window.firebaseConfig);
                    }
                    this.db = firebase.firestore();
                    // debug: firebase directly initialized
                }
                this.loadCalendarData();
            }, 1000);
        }

        if (!this.db) {
            console.error('CalendarManager: Firestore-Initialisierung fehlgeschlagen!');
        }
    }

    // Bestellungen für einen Monat laden
    async loadOrdersForMonth(year, month) {
        try {
            // load orders for month

            if (!this.db) {
                console.error('CalendarManager: Firebase noch nicht initialisiert');
                return [];
            }

            // Start und Ende des Monats
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59);

            // datumbereich start/end

            let orders = [];

            // Hauptmethode: wunschtermin.datum verwenden (unterstützt sowohl String als auch Timestamp)
            try {
                // Versuche erst mit Timestamp (wie in embedded-calendar.js)
                const startTimestamp = firebase.firestore.Timestamp.fromDate(startDate);
                const endTimestamp = firebase.firestore.Timestamp.fromDate(endDate);

                // searching for timestamp based wunschtermin

                const ordersSnapshot1 = await this.db.collection('orders')
                    .where('wunschtermin.datum', '>=', startTimestamp)
                    .where('wunschtermin.datum', '<=', endTimestamp)
                    .get();

                // method 1 results

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

                    // searching for string based wunschtermin

                    const ordersSnapshot2 = await this.db.collection('orders')
                        .where('wunschtermin.datum', '>=', startDateString)
                        .where('wunschtermin.datum', '<=', endDateString)
                        .get();

                    // method 1b results

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

                    // fallback (created) results

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

            // orders loaded: orders.length

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
                <div id="orderDetailsModal" class="order-details-modal-overlay">
                    <div class="order-details-modal">
                        <div class="order-details-modal-header">
                            <h3 class="order-details-modal-title">📅 Bestelldetails</h3>
                            <button onclick="document.getElementById('orderDetailsModal').remove()" class="order-details-modal-close">×</button>
                        </div>

                        <div class="order-details-modal-content">
                            <!-- Kundendaten -->
                            <div class="order-details-section">
                                <h4 class="order-details-section-title">👤 Kundendaten</h4>
                                <div class="order-details-field"><strong>Name:</strong> ${escapeHtml(customerName)}</div>
                                <div class="order-details-field"><strong>E-Mail:</strong> ${escapeHtml(customerEmail)}</div>
                                <div class="order-details-field"><strong>Telefon:</strong> ${escapeHtml(customerPhone)}</div>
                            </div>

                            <!-- Bestellung -->
                            <div class="order-details-section">
                                <h4 class="order-details-section-title">🎂 Bestellung</h4>
                                <div class="order-details-field"><strong>Wunschtermin:</strong> ${order.wunschtermin && order.wunschtermin.datum
                    ? new Date(order.wunschtermin.datum.toDate ? order.wunschtermin.datum.toDate() : order.wunschtermin.datum).toLocaleDateString('de-DE')
                    : 'Nicht angegeben'}</div>
                                <div class="order-details-field"><strong>Uhrzeit:</strong> ${order.wunschtermin && order.wunschtermin.uhrzeit || 'Nicht angegeben'}</div>
                                ${order.anlass ? `<div class="order-details-field"><strong>Anlass:</strong> ${this.getOccasionDisplayName(order.anlass)}</div>` : ''}
                                <div class="order-details-field"><strong>Größe:</strong> ${order.details && order.details.durchmesserCm
                    ? `${order.details.durchmesserCm} cm (${order.details.kategorie || this.deriveTierFromCm(order.details.durchmesserCm)})`
                    : 'Unbekannt'}</div>
                                ${order.details && order.details.numberOfTiers ? `<div class="order-details-field"><strong>Stockwerke:</strong> ${escapeHtml(String(order.details.numberOfTiers))}</div>` : ''}
                                <div class="order-details-field"><strong>Status:</strong> <span class="order-details-status" data-status="${order.status || 'neu'}">${order.status || 'neu'}</span></div>
                                <div class="order-details-field"><strong>Preis:</strong> ${order.gesamtpreis ? parseFloat(order.gesamtpreis).toFixed(2) + '€' : 'Nicht berechnet'}</div>
                                ${order.details && order.details.extras && order.details.extras.length > 0 ? `<div class="order-details-field"><strong>Extras:</strong> ${formatExtras(order.details.extras, order.details)}</div>` : ''}
                            </div>

                            <!-- Sonderwunsch -->
                            ${order.sonderwunsch ? `
                            <div class="order-details-section">
                                <h4 class="order-details-section-title">✨ Sonderwunsch</h4>
                                <div class="order-details-special-request">${escapeHtml(order.sonderwunsch)}</div>
                            </div>
                            ` : ''}

                            <!-- Lieferung -->
                            <div class="order-details-section">
                                <h4 class="order-details-section-title">🚚 Lieferung</h4>
                                <div class="order-details-field"><strong>Lieferart:</strong> ${order.details && order.details.lieferung ? (order.details.lieferung === 'abholung' ? 'Abholung' : 'Lieferung') : 'Nicht angegeben'}</div>
                                ${order.details && order.details.lieferung && order.details.lieferung !== 'abholung' && order.adresse ? `<div class="order-details-field"><strong>Adresse:</strong> ${escapeHtml(order.adresse.street)}, ${escapeHtml(order.adresse.plz)} ${escapeHtml(order.adresse.city)}</div>` : ''}
                            </div>
                        </div>

                        <div class="order-details-modal-actions">
                            <button onclick="window.orderManager.updateOrderStatus('${orderId}', 'in Vorbereitung')" class="btn btn-warning">In Vorbereitung</button>
                            <button onclick="window.orderManager.updateOrderStatus('${orderId}', 'fertig')" class="btn btn-success">Fertig</button>
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