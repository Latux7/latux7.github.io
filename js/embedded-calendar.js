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
    const toggleBtn = document.getElementById('toggleCalendarBtn');

    if (!calendarDiv || !contentDiv) return;

    const isOpen = calendarDiv.style.display && calendarDiv.style.display !== 'none';

    if (isOpen) {
        // Wenn offen: zu- und aria aktualisieren
        calendarDiv.style.display = 'none';
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
        return;
    }

    // Ansonsten öffnen, aria setzen und aktuelle Daten laden
    calendarDiv.style.display = 'block';
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');

    // Smooth scroll zum Kalender
    calendarDiv.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });

    // Immer aktuellste Werte laden
    loadEmbeddedCalendar();
}

/**
 * Versteckt den eingebetteten Kalender
 */
function hideAvailabilityCalendar() {
    const calendarDiv = document.getElementById('embeddedCalendar');
    if (calendarDiv) {
        calendarDiv.style.display = 'none';
        const toggleBtn = document.getElementById('toggleCalendarBtn');
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
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
        const maxOrders = 3; // Kapazitätslimit
        const isCapacityFull = orderCount >= maxOrders;

        // Prüfe ob Datum zu früh ist (weniger als 7 Tage Vorlaufzeit)
        const selectedDate = new Date(currentYear, currentMonth, day);
        const minDate = new Date();
        minDate.setDate(minDate.getDate() + 7); // 7 Tage Vorlaufzeit
        minDate.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);

        const isTooEarly = selectedDate < minDate;
        const isPast = isDateInPast(currentYear, currentMonth, day);

        let dayStyle = 'padding: 12px 8px; text-align: center; border-radius: 6px; cursor: pointer; transition: all 0.2s; border: 2px solid transparent;';
        let dayClass = '';
        let clickHandler = '';

        if (isPast || isTooEarly || isCapacityFull) {
            if (isCapacityFull && !isPast && !isTooEarly) {
                dayStyle += 'background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; cursor: not-allowed;';
            } else {
                dayStyle += 'background: #f0f0f0; color: #999; cursor: not-allowed;';
            }
        } else {
            // Verfügbar - Farbe je nach Auslastung
            if (orderCount === 0) {
                dayStyle += 'background: #e8f5e8; color: #2e7d32; border: 1px solid #4caf50;';
            } else if (orderCount === 1) {
                dayStyle += 'background: #fff8e1; color: #f57f17; border: 1px solid #ffeb3b;';
            } else if (orderCount === 2) {
                dayStyle += 'background: #ffe0b2; color: #ef6c00; border: 1px solid #ff9800;';
            }
            clickHandler = `onclick="selectDateFromCalendar('${dateString}')"`;
        }

        const availableSlots = Math.max(0, maxOrders - orderCount);
        const statusText = isPast ? 'Vergangen' :
            isTooEarly ? 'Zu kurzfristig (mind. 7 Tage Vorlaufzeit erforderlich)' :
                isCapacityFull ? 'Ausgebucht (3/3 Plätze belegt)' :
                    `Verfügbar (${availableSlots}/${maxOrders} Plätze frei)`;

        calendarHTML += `
            <div ${clickHandler} 
                 style="${dayStyle}" 
                 title="${statusText}"
                 onmouseover="this.style.transform='scale(1.05)'"
                 onmouseout="this.style.transform='scale(1)'">
                <div style="font-weight: bold; margin-bottom: 2px;">${day}</div>
                <div style="font-size: 0.7rem; opacity: 0.8;">
                    ${isCapacityFull ? '❌' : (!isPast && !isTooEarly ? `${availableSlots}/${maxOrders}` : '')}
                </div>
            </div>
        `;
    }

    calendarHTML += '</div>';

    // Legende hinzufügen mit Kapazitätsinformationen
    calendarHTML += `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 0.8rem; margin-top: 15px; text-align: center;">
            <div style="display: flex; align-items: center; gap: 5px;">
                <div style="width: 12px; height: 12px; background: #e8f5e8; border-radius: 3px; border: 1px solid #4caf50;"></div>
                <span>Frei (3/3)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
                <div style="width: 12px; height: 12px; background: #fff8e1; border-radius: 3px; border: 1px solid #ffeb3b;"></div>
                <span>Wenig frei (2/3)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
                <div style="width: 12px; height: 12px; background: #ffe0b2; border-radius: 3px; border: 1px solid #ff9800;"></div>
                <span>Fast voll (1/3)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
                <div style="width: 12px; height: 12px; background: #fff3cd; border-radius: 3px; border: 1px solid #ffeaa7;"></div>
                <span>Ausgebucht ❌</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
                <div style="width: 12px; height: 12px; background: #f0f0f0; border-radius: 3px;"></div>
                <span>Nicht verfügbar</span>
            </div>
        </div>
        <div style="text-align: center; margin-top: 10px; font-size: 0.8rem; color: var(--clr-muted);">
            <p><strong>Hinweis:</strong> Mindestens 7 Tage Vorlaufzeit • Maximal 3 Bestellungen pro Tag</p>
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
    const maxOrders = 3; // Kapazitätslimit
    const available = maxOrders - orderCount;
    const isAvailable = orderCount < maxOrders;

    const modalHTML = `
        <div id="dateSelectionModal" style="
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
                             <strong>${available} von ${maxOrders} Plätzen</strong> noch frei.<br>
                             Sie können für diesen Tag bestellen.
                         </p>` :
            `<div style="color: #c62828; font-weight: bold; margin-bottom: 8px;">❌ Ausgebucht</div>
                         <p style="margin: 0; line-height: 1.5;">
                             Dieser Tag ist leider bereits vollständig ausgebucht (${maxOrders}/${maxOrders} Plätze belegt).<br>
                             Bitte wählen Sie einen anderen Termin.
                         </p>`
        }
                </div>
                
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                    ${isAvailable ?
            `<button onclick="selectDateAndContinue('${dateString}')" style="
                            padding: 12px 24px; background: var(--clr-accent); color: white; 
                            border: none; border-radius: 6px; cursor: pointer; font-weight: bold;
                            min-width: 120px;
                        ">
                            🎂 Auswählen
                        </button>` :
            `<p style="margin: 10px 0; color: #666;">Bitte wählen Sie einen anderen verfügbaren Termin.</p>`
        }
                    <button onclick="closeDateSelectionModal()" style="
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
}/**
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
 * Datum auswählen und direkt im Formular setzen
 */
function selectDateAndContinue(dateString) {
    confirmDateSelection(dateString);
}

/**
 * Standalone Kalender in neuem Tab öffnen (als Fallback)
 */
function openStandaloneCalendar(dateString) {
    // Modal schließen
    closeDateSelectionModal();

    // Kalender verstecken
    hideAvailabilityCalendar();

    // Zum Formular scrollen als Hinweis
    scrollToForm();

    // Hinweis geben, dass der eingebettete Kalender die beste Option ist
    showSuccessNotification('💡 Tipp: Verwenden Sie den Kalender oben für die beste Erfahrung!');
}/**
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
 * Lädt Bestellungsanzahl für einen Monat (unterstützt beide Datenformate)
 */
async function loadOrdersCountForMonth(month, year) {
    try {
        console.log(`📊 Lade Bestellungen für ${month + 1}/${year}...`);

        const db = firebase.firestore();
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);

        // String-Format für neue Bestellungen (YYYY-MM-DD)
        const startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

        console.log(`🔍 Suche Bestellungen zwischen ${startDateStr} und ${endDateStr}...`);

        // Reset für aktuellen Monat
        ordersCountData = {};
        // Verfolgung bereits gezählter Dokumente, um Doppelzählungen zu vermeiden
        const countedDocIds = new Set();

        // Abfrage 1: Neue Bestellungen mit String-Format (wunschtermin als String)
        try {
            const stringQuery = await db.collection('orders')
                .where('wunschtermin', '>=', startDateStr)
                .where('wunschtermin', '<=', endDateStr)
                .get();

            console.log(`📝 String-Format Bestellungen gefunden: ${stringQuery.size}`);

            stringQuery.forEach(doc => {
                if (countedDocIds.has(doc.id)) return;
                const data = doc.data();
                const wunschtermin = data.wunschtermin;
                if (wunschtermin && typeof wunschtermin === 'string') {
                    ordersCountData[wunschtermin] = (ordersCountData[wunschtermin] || 0) + 1;
                    countedDocIds.add(doc.id);
                    console.log(`📅 String-Bestellung gefunden für: ${wunschtermin} (doc ${doc.id})`);
                }
            });
        } catch (stringError) {
            console.log('ℹ️ String-Format Abfrage nicht möglich (normale bei älteren Daten)');
        }

        // Abfrage 2: Alte Bestellungen mit Timestamp-Format (wunschtermin.datum)
        try {
            const startTimestamp = firebase.firestore.Timestamp.fromDate(startDate);
            const endTimestamp = firebase.firestore.Timestamp.fromDate(endDate);

            const timestampQuery = await db.collection('orders')
                .where('wunschtermin.datum', '>=', startTimestamp)
                .where('wunschtermin.datum', '<=', endTimestamp)
                .get();

            console.log(`🕒 Timestamp-Format Bestellungen gefunden: ${timestampQuery.size}`);

            timestampQuery.forEach(doc => {
                if (countedDocIds.has(doc.id)) return;
                const data = doc.data();
                if (data.wunschtermin && data.wunschtermin.datum) {
                    const dateObj = data.wunschtermin.datum.toDate();
                    const dateString = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                    ordersCountData[dateString] = (ordersCountData[dateString] || 0) + 1;
                    countedDocIds.add(doc.id);
                    console.log(`📅 Timestamp-Bestellung gefunden für: ${dateString} (doc ${doc.id})`);
                }
            });
        } catch (timestampError) {
            console.log('ℹ️ Timestamp-Format Abfrage nicht möglich');
        }

        console.log(`📊 Vorläufige Bestellungen geladen:`, ordersCountData);

        // Falls wichtige Daten fehlen (z.B. neue Dokumentstruktur), führe eine breite Fallback-Suche durch
        // Diese lädt bis zu 1000 Bestellungen und durchsucht JSON-Strings nach Datums-Mustern YYYY-MM-DD
        try {
            const fallbackLimit = 1000;
            const allQuery = await db.collection('orders').limit(fallbackLimit).get();
            console.log(`🔎 Fallback-Scan: ${allQuery.size} Dokumente überprüft (Limit ${fallbackLimit})`);

            allQuery.forEach(doc => {
                if (countedDocIds.has(doc.id)) return; // bereits gezählt
                const data = doc.data();
                // Stringify once per doc
                const s = JSON.stringify(data);
                // Finde ISO-ähnliche Daten YYYY-MM-DD sowie deutsche D.M.YYYY oder DD.MM.YYYY
                const isoMatches = s.match(/\d{4}-\d{2}-\d{2}/g) || [];
                const dotMatches = s.match(/\d{1,2}\.\d{1,2}\.\d{4}/g) || [];
                const seen = new Set();

                isoMatches.forEach(m => {
                    if (!m.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) return;
                    if (seen.has(m)) return;
                    seen.add(m);
                    ordersCountData[m] = (ordersCountData[m] || 0) + 1;
                });

                dotMatches.forEach(m => {
                    // Konvertiere DD.MM.YYYY zu YYYY-MM-DD
                    const parts = m.split('.');
                    if (parts.length !== 3) return;
                    const d = parts[0].padStart(2, '0');
                    const mo = parts[1].padStart(2, '0');
                    const y = parts[2];
                    const norm = `${y}-${mo}-${d}`;
                    if (!norm.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) return;
                    if (seen.has(norm)) return;
                    seen.add(norm);
                    ordersCountData[norm] = (ordersCountData[norm] || 0) + 1;
                });

                if (seen.size > 0) {
                    countedDocIds.add(doc.id);
                    console.log(`📅 Fallback fand Daten ${Array.from(seen).join(', ')} in Doc ${doc.id}`);
                }
            });

            console.log(`📊 Finale Bestellungen nach Fallback:`, ordersCountData);
        } catch (fbError) {
            console.log('ℹ️ Fallback-Scan fehlgeschlagen:', fbError);
        }

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

// URL-Parameter beim Laden prüfen (für Weiterleitung von anderen Seiten)
document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    const showCalendar = urlParams.get('calendar');

    if (showCalendar === 'true' || dateParam) {
        // Kalender automatisch anzeigen
        setTimeout(() => {
            showAvailabilityCalendar();

            if (dateParam) {
                // Zum entsprechenden Monat navigieren
                const targetDate = new Date(dateParam);
                if (!isNaN(targetDate.getTime())) {
                    currentMonth = targetDate.getMonth();
                    currentYear = targetDate.getFullYear();

                    // Kalender neu laden mit korrektem Monat
                    setTimeout(() => {
                        loadEmbeddedCalendar();
                    }, 500);
                }
            }
        }, 500);
    }
});

// Debug-Hilfsfunktionen
window.printOrdersCountData = function () {
    console.log('ordersCountData:', ordersCountData);
    return ordersCountData;
};

window.debugCalendarDate = async function (dateString) {
    console.log('Debug: Prüfe Datum', dateString);
    try {
        const db = firebase.firestore();
        // Suche nach String-Feld
        const byString = await db.collection('orders').where('wunschtermin', '==', dateString).get();
        console.log('String-Feld Treffer:', byString.size);
        byString.forEach(d => console.log(' ->', d.id, d.data()));

        // Suche nach Timestamp-Feld
        // Versuche direkte Timestamp-Vergleich (falls gespeichert)
        try {
            const start = new Date(dateString + 'T00:00:00');
            const end = new Date(dateString + 'T23:59:59');
            const startTs = firebase.firestore.Timestamp.fromDate(start);
            const endTs = firebase.firestore.Timestamp.fromDate(end);
            const byTs = await db.collection('orders')
                .where('wunschtermin.datum', '>=', startTs)
                .where('wunschtermin.datum', '<=', endTs)
                .get();
            console.log('Timestamp-Feld Treffer:', byTs.size);
            byTs.forEach(d => console.log(' ->', d.id, d.data()));
        } catch (e) {
            console.log('Timestamp-Abfrage schlug fehl:', e);
        }

        // Fallback: brute-force scan (limit 500)
        const snap = await db.collection('orders').limit(500).get();
        let found = 0;
        snap.forEach(d => {
            const s = JSON.stringify(d.data());
            if (s.includes(dateString)) {
                found++;
                console.log('Fallback-Treffer:', d.id, d.data());
            }
        });
        console.log('Fallback Treffer insgesamt:', found);
    } catch (err) {
        console.error('Debug-Abfrage Fehler:', err);
    }
};