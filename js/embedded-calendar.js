// Embedded Calendar Module für bessere UX auf bestellen.html

// Globale Variablen für Kalenderlogik
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let ordersCountData = {};
let publicCalendarMode = 'embedded'; // Flag für modales Verhalten

/**
 * Zeigt den eingebetteten Kalender an
 */
function showAvailabilityCalendar() {
    const calendarDiv = document.getElementById('embeddedCalendar');
    const contentDiv = document.getElementById('embeddedCalendarContent');

    if (calendarDiv && contentDiv) {
        calendarDiv.style.display = 'block';

        // Smooth scroll zum Kalender
        calendarDiv.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        // Kalender laden
        loadEmbeddedCalendar();
    }
}

/**
 * Versteckt den eingebetteten Kalender
 */
function hideAvailabilityCalendar() {
    const calendarDiv = document.getElementById('embeddedCalendar');
    if (calendarDiv) {
        calendarDiv.style.display = 'none';
    }
}

/**
 * Scrollt zur Bestellform
 */
function scrollToForm() {
    const formSection = document.querySelector('.order-form') || document.querySelector('form');
    if (formSection) {
        formSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

/**
 * Lädt den eingebetteten Kalender
 */
async function loadEmbeddedCalendar() {
    const contentDiv = document.getElementById('embeddedCalendarContent');
    if (!contentDiv) return;

    try {
        // Loading-Zustand zeigen
        contentDiv.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--clr-muted);">
                <div style="font-size: 2rem; margin-bottom: 10px;">⏳</div>
                <p>Kalender wird geladen...</p>
            </div>
        `;

        // Firebase prüfen
        if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
            throw new Error('Firebase nicht initialisiert');
        }

        // Bestellungen für aktuellen Monat laden
        await loadOrdersCountForMonth(currentMonth, currentYear);

        // Kalender rendern
        renderEmbeddedCalendar();

    } catch (error) {
        console.error('Fehler beim Laden des eingebetteten Kalenders:', error);
        contentDiv.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--clr-error);">
                <div style="font-size: 2rem; margin-bottom: 10px;">❌</div>
                <p>Kalender konnte nicht geladen werden.</p>
                <button onclick="loadEmbeddedCalendar()" style="margin-top: 10px; padding: 8px 16px; background: var(--clr-accent); color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Erneut versuchen
                </button>
            </div>
        `;
    }
}

/**
 * Rendert den eingebetteten Kalender
 */
function renderEmbeddedCalendar() {
    const contentDiv = document.getElementById('embeddedCalendarContent');
    if (!contentDiv) return;

    const monthNames = [
        'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const adjustedFirstDay = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1;

    let calendarHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <button onclick="navigateMonth(-1)" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--clr-accent);">‹</button>
                <h3 style="margin: 0; color: var(--clr-accent);">${monthNames[currentMonth]} ${currentYear}</h3>
                <button onclick="navigateMonth(1)" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--clr-accent);">›</button>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 15px;">
            <div style="padding: 8px; text-align: center; font-weight: bold; background: #f5f5f5;">Mo</div>
            <div style="padding: 8px; text-align: center; font-weight: bold; background: #f5f5f5;">Di</div>
            <div style="padding: 8px; text-align: center; font-weight: bold; background: #f5f5f5;">Mi</div>
            <div style="padding: 8px; text-align: center; font-weight: bold; background: #f5f5f5;">Do</div>
            <div style="padding: 8px; text-align: center; font-weight: bold; background: #f5f5f5;">Fr</div>
            <div style="padding: 8px; text-align: center; font-weight: bold; background: #f5f5f5;">Sa</div>
            <div style="padding: 8px; text-align: center; font-weight: bold; background: #f5f5f5;">So</div>
    `;

    // Leere Zellen für die Tage vor dem ersten Tag des Monats
    for (let i = 0; i < adjustedFirstDay; i++) {
        calendarHTML += '<div style="padding: 8px;"></div>';
    }

    // Tage des Monats
    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const orderCount = ordersCountData[dateString] || 0;
        const isAvailable = orderCount < 5;
        const isPast = isDateInPast(currentYear, currentMonth, day);

        let dayStyle = 'padding: 12px 8px; text-align: center; border-radius: 6px; cursor: pointer; transition: all 0.2s; border: 2px solid transparent;';
        let dayClass = '';
        let clickHandler = '';

        if (isPast) {
            dayStyle += 'background: #f0f0f0; color: #999; cursor: not-allowed;';
        } else if (!isAvailable) {
            dayStyle += 'background: #ffebee; color: #c62828; cursor: not-allowed;';
        } else {
            dayStyle += 'background: #e8f5e8; color: #2e7d32; border-color: #4caf50;';
            clickHandler = `onclick="selectDateFromCalendar('${dateString}')"`;
        }

        const statusText = isPast ? 'Vergangen' :
            !isAvailable ? `Ausgebucht (${orderCount}/5)` :
                `Verfügbar (${orderCount}/5)`;

        calendarHTML += `
            <div ${clickHandler} 
                 style="${dayStyle}" 
                 title="${statusText}"
                 onmouseover="this.style.transform='scale(1.05)'"
                 onmouseout="this.style.transform='scale(1)'">
                <div style="font-weight: bold; margin-bottom: 2px;">${day}</div>
                <div style="font-size: 0.7rem; opacity: 0.8;">${orderCount}/5</div>
            </div>
        `;
    }

    calendarHTML += '</div>';

    // Legende hinzufügen
    calendarHTML += `
        <div style="display: flex; justify-content: space-around; font-size: 0.85rem; margin-top: 15px;">
            <div style="display: flex; align-items: center; gap: 5px;">
                <div style="width: 12px; height: 12px; background: #e8f5e8; border-radius: 3px; border: 1px solid #4caf50;"></div>
                <span>Verfügbar</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
                <div style="width: 12px; height: 12px; background: #ffebee; border-radius: 3px; border: 1px solid #f44336;"></div>
                <span>Ausgebucht</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
                <div style="width: 12px; height: 12px; background: #f0f0f0; border-radius: 3px;"></div>
                <span>Vergangen</span>
            </div>
        </div>
    `;

    contentDiv.innerHTML = calendarHTML;
}

/**
 * Datum aus Kalender auswählen
 */
function selectDateFromCalendar(dateString) {
    // Modal mit Bestätigung zeigen
    showSelectionModal(dateString);
}

/**
 * Modal für Datumsauswahl anzeigen
 */
function showSelectionModal(dateString) {
    const date = new Date(dateString + 'T12:00:00');
    const formattedDate = date.toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const orderCount = ordersCountData[dateString] || 0;

    const modalHTML = `
        <div id="dateSelectionModal" style="
            position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
            background: rgba(0,0,0,0.5); display: flex; align-items: center; 
            justify-content: center; z-index: 1000;
        ">
            <div style="
                background: white; padding: 30px; border-radius: 12px; 
                box-shadow: var(--shadow-lg); max-width: 400px; width: 90%;
                text-align: center;
            ">
                <div style="font-size: 2rem; margin-bottom: 15px;">📅</div>
                <h3 style="margin-bottom: 15px; color: var(--clr-accent);">Wunschtermin auswählen</h3>
                <p style="margin-bottom: 20px; line-height: 1.6;">
                    Möchten Sie <strong>${formattedDate}</strong> als Ihren Wunschtermin auswählen?
                </p>
                <div style="background: #e8f5e8; padding: 12px; border-radius: 8px; margin-bottom: 20px;">
                    <small><strong>Verfügbarkeit:</strong> ${orderCount}/5 Bestellungen</small>
                </div>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="confirmDateSelection('${dateString}')" style="
                        padding: 12px 24px; background: var(--clr-accent); color: white; 
                        border: none; border-radius: 6px; cursor: pointer; font-weight: bold;
                    ">
                        ✓ Auswählen
                    </button>
                    <button onclick="closeDateSelectionModal()" style="
                        padding: 12px 24px; background: #ddd; color: #333; 
                        border: none; border-radius: 6px; cursor: pointer;
                    ">
                        Abbrechen
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Modal schließen
 */
function closeDateSelectionModal() {
    const modal = document.getElementById('dateSelectionModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Datumsauswahl bestätigen
 */
function confirmDateSelection(dateString) {
    // Modal schließen
    closeDateSelectionModal();

    // Kalender verstecken
    hideAvailabilityCalendar();

    // Datum ins Formular eintragen (beide möglichen Field-Namen prüfen)
    const wunschterminInput = document.getElementById('wunschtermin') || document.getElementById('wunschDatum');
    if (wunschterminInput) {
        wunschterminInput.value = dateString;

        // Event-Handler für live Validierung triggern falls vorhanden
        const event = new Event('input', { bubbles: true });
        wunschterminInput.dispatchEvent(event);

        // Visuelles Feedback
        wunschterminInput.style.background = '#e8f5e8';
        wunschterminInput.style.borderColor = '#4caf50';

        setTimeout(() => {
            wunschterminInput.style.background = '';
            wunschterminInput.style.borderColor = '';
        }, 2000);
    }

    // Zur Bestellform scrollen
    scrollToForm();

    // Erfolgs-Notification
    showSuccessNotification(`Wunschtermin ${new Date(dateString + 'T12:00:00').toLocaleDateString('de-DE')} ausgewählt!`);
}

/**
 * Erfolgs-Notification anzeigen
 */
function showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: #4caf50; 
        color: white; padding: 15px 20px; border-radius: 8px; 
        box-shadow: var(--shadow-md); z-index: 1001; 
        animation: slideInRight 0.3s ease-out;
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.2rem;">✓</span>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Monat navigieren
 */
function navigateMonth(direction) {
    currentMonth += direction;

    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }

    loadEmbeddedCalendar();
}

/**
 * Prüft, ob ein Datum in der Vergangenheit liegt
 */
function isDateInPast(year, month, day) {
    const today = new Date();
    const checkDate = new Date(year, month, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return checkDate < todayStart;
}

/**
 * Lädt Bestellungsanzahl für einen Monat (wiederverwendet aus public-calendar.js)
 */
async function loadOrdersCountForMonth(month, year) {
    try {
        console.log(`📊 Lade Bestellungen für ${month + 1}/${year}...`);

        const db = firebase.firestore();
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);

        const startTimestamp = firebase.firestore.Timestamp.fromDate(startDate);
        const endTimestamp = firebase.firestore.Timestamp.fromDate(endDate);

        const querySnapshot = await db.collection('orders')
            .where('wunschtermin.datum', '>=', startTimestamp)
            .where('wunschtermin.datum', '<=', endTimestamp)
            .get();

        // Reset für aktuellen Monat
        ordersCountData = {};

        querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.wunschtermin && data.wunschtermin.datum) {
                const dateObj = data.wunschtermin.datum.toDate();
                const dateString = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                ordersCountData[dateString] = (ordersCountData[dateString] || 0) + 1;
            }
        });

        console.log(`📊 Bestellungen geladen:`, ordersCountData);

    } catch (error) {
        console.error('❌ Fehler beim Laden der Bestellungen:', error);
        ordersCountData = {};
    }
}

// CSS-Animationen hinzufügen
if (!document.querySelector('#embedded-calendar-styles')) {
    const style = document.createElement('style');
    style.id = 'embedded-calendar-styles';
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}