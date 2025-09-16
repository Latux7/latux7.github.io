// common.js - Gemeinsame Funktionen und Utilities

// Notification-Funktionen (anstatt alerts)
function showNotification(message, type = "success") {
    // Verschiedene mögliche Notification-Container suchen
    let notification = document.getElementById('notification') ||
        document.getElementById('adminNotification');

    if (notification) {
        notification.className = `alert ${type}`;
        notification.style.display = 'block';

        // Text-Content setzen (entweder direkt oder in child-span)
        const textSpan = notification.querySelector('#notificationText');
        if (textSpan) {
            textSpan.textContent = message;
        } else {
            notification.textContent = message;
        }

        // Automatisch ausblenden nach 5 Sekunden
        setTimeout(() => hideNotification(), 5000);
    } else {
        // Fallback zu console.log statt alert
        console.warn('Notification:', message);
    }
}

function hideNotification() {
    const notification = document.getElementById('notification') ||
        document.getElementById('adminNotification');
    if (notification) {
        notification.style.display = 'none';
    }
}

// Elegante Bestätigungs-Modal Alternative zu confirm()
function showConfirmation(message, onConfirm, onCancel = null) {
    // Prüfen ob bereits eine Confirmation existiert
    let existingModal = document.getElementById('confirmationModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Modal erstellen
    const modal = document.createElement('div');
    modal.id = 'confirmationModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white; padding: 30px; border-radius: 10px;
        max-width: 400px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;

    dialog.innerHTML = `
        <p style="margin-bottom: 20px; font-size: 16px;">${message}</p>
        <button id="confirmYes" style="background: #dc3545; color: white; padding: 10px 20px; margin: 5px; border: none; border-radius: 5px; cursor: pointer;">Ja</button>
        <button id="confirmNo" style="background: #6c757d; color: white; padding: 10px 20px; margin: 5px; border: none; border-radius: 5px; cursor: pointer;">Abbrechen</button>
    `;

    modal.appendChild(dialog);
    document.body.appendChild(modal);

    // Event Listeners
    document.getElementById('confirmYes').onclick = () => {
        modal.remove();
        if (onConfirm) onConfirm();
    };

    document.getElementById('confirmNo').onclick = () => {
        modal.remove();
        if (onCancel) onCancel();
    };

    // Click outside to cancel
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
            if (onCancel) onCancel();
        }
    };
}

// Firebase Connection Test
async function testFirebaseConnection() {
    try {
        const db = initializeFirebaseApp();
        if (!db) {
            throw new Error('Firebase konnte nicht initialisiert werden');
        }

        // Teste mit einem einfachen Read-Request
        await db.collection('test').limit(1).get();
        console.log('Firebase-Verbindung erfolgreich');

        // UI wiederherstellen
        restoreOnlineMode();
        showNotification('✅ Firebase-Verbindung erfolgreich wiederhergestellt!', 'success');
        return true;
    } catch (error) {
        console.error('Firebase-Verbindungstest fehlgeschlagen:', error);

        if (error.message.includes('ERR_BLOCKED_BY_CLIENT') || error.code === 'unavailable') {
            showNotification('🚫 Adblocker blockiert Firebase! Bitte deaktivieren Sie Adblocker für diese Seite.', 'error');
        } else {
            showNotification('⚠️ Firebase-Verbindung fehlgeschlagen. Prüfen Sie Ihre Internetverbindung.', 'error');
        }
        return false;
    }
}

// Online-Modus wiederherstellen
function restoreOnlineMode() {
    // Hilfe-Bereich ausblenden
    const helpDiv = document.getElementById('connectionHelp');
    if (helpDiv) {
        helpDiv.style.display = 'none';
    }

    // Buttons wieder aktivieren
    const disabledButtons = document.querySelectorAll('button[disabled]');
    disabledButtons.forEach(btn => {
        if (btn.title.includes('Firebase-Verbindung fehlt')) {
            btn.disabled = false;
            btn.title = '';
            btn.style.opacity = '1';
        }
    });

    // Admin-Dashboard neu laden falls verfügbar
    if (window.adminDashboard && window.adminDashboard.loadDashboard) {
        window.adminDashboard.loadDashboard();
    }
}

// Datum-Utility-Funktionen
function formatDate(date) {
    if (!date) return 'Unbekannt';

    if (date.toDate) {
        // Firebase Timestamp
        return date.toDate().toLocaleDateString('de-DE');
    } else if (date instanceof Date) {
        return date.toLocaleDateString('de-DE');
    } else {
        return new Date(date).toLocaleDateString('de-DE');
    }
}

function formatDateTime(date) {
    if (!date) return 'Unbekannt';

    if (date.toDate) {
        // Firebase Timestamp
        return date.toDate().toLocaleString('de-DE');
    } else if (date instanceof Date) {
        return date.toLocaleString('de-DE');
    } else {
        return new Date(date).toLocaleString('de-DE');
    }
}

// Firebase-Initialisierung (einmalig)
function initializeFirebase() {
    // Verwende die neue initializeFirebaseApp Funktion wenn verfügbar
    if (typeof initializeFirebaseApp === 'function') {
        return initializeFirebaseApp();
    }

    // Fallback für alte Implementierung
    if (!firebase.apps.length) {
        firebase.initializeApp(window.firebaseConfig);
    }
    return firebase.firestore();
}

// Sterne-Bewertung rendern
function renderStars(rating, maxStars = 5) {
    const filled = '★'.repeat(rating || 0);
    const empty = '☆'.repeat(maxStars - (rating || 0));
    return filled + empty;
}

// NPS-Score Farbe bestimmen
function getNpsColor(score) {
    if (score >= 9) return '#4CAF50'; // Grün
    if (score >= 7) return '#FF9800'; // Orange
    return '#f44336'; // Rot
}

// Lade-Spinner anzeigen/verstecken
function showLoading(containerId, message = 'Lädt...') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `<div class="loading">${message}</div>`;
    }
}

function hideLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '';
    }
}

// Error-Handler für Firebase-Operationen
function handleFirebaseError(error, action = 'Operation') {
    console.error(`Fehler bei ${action}:`, error);

    let userMessage = `Fehler bei ${action}.`;

    if (error.code === 'permission-denied') {
        userMessage = 'Keine Berechtigung für diese Aktion.';
    } else if (error.code === 'unavailable') {
        userMessage = 'Service vorübergehend nicht verfügbar.';
    } else if (error.code === 'not-found') {
        userMessage = 'Daten nicht gefunden.';
    }

    showNotification(userMessage, 'error');
    return userMessage;
}

// Validierung für E-Mail-Adressen
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validierung für Telefonnummern
function isValidPhone(phone) {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

// Escape HTML für sichere Anzeige
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Debounce-Funktion für Performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}