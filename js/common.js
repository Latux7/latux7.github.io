// common.js - Gemeinsame Funktionen und Utilities

// Notification-Funktionen (anstatt alerts)
function showNotification(message, type = "success") {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.className = `alert ${type}`;
        notification.textContent = message;
        notification.style.display = 'block';
        setTimeout(() => hideNotification(), 5000);
    } else {
        // Fallback zu alert wenn kein notification-Element vorhanden
        alert(message);
    }
}

function hideNotification() {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.style.display = 'none';
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