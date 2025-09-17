// admin.js - Hauptadmin-Dashboard Funktionalität

class AdminDashboard {
    constructor() {
        this.db = null;
        this.refreshInterval = null;
        this.init();
    }

    init() {
        // Firebase initialisieren mit Verbindungstest
        this.initializeFirebase();

        // Event-Listener setzen
        this.setupEventListeners();

        // Admin-Panel direkt anzeigen (Sicherheit wird durch admin-security.js gehandhabt)
        this.showAdminPanel();
    }

    async initializeFirebase() {
        try {
            this.db = initializeFirebaseApp();
            if (!this.db) {
                throw new Error('Firebase-Initialisierung fehlgeschlagen');
            }

            // Verbindungstest durchführen
            const connectionOk = await testFirebaseConnection();
            if (!connectionOk) {
                // UI für Offline-Modus vorbereiten
                this.showOfflineMode();
            }
        } catch (error) {
            console.error('Firebase-Setup Fehler:', error);
            handleFirestoreError(error, 'Firebase-Initialisierung');
            this.showOfflineMode();
        }
    }

    showOfflineMode() {
        showNotification('⚠️ Offline-Modus: Einige Funktionen sind nicht verfügbar.', 'warning');

        // Hilfe-Bereich anzeigen
        const helpDiv = document.getElementById('connectionHelp');
        if (helpDiv) {
            helpDiv.style.display = 'block';
        }

        // Alle Buttons deaktivieren, die Firebase benötigen
        const firebaseButtons = document.querySelectorAll('.firebase-dependent, button[onclick*="Order"], button[onclick*="Archive"]');
        firebaseButtons.forEach(btn => {
            btn.disabled = true;
            btn.title = 'Nicht verfügbar: Firebase-Verbindung fehlt';
            btn.style.opacity = '0.5';
        });
    }

    setupEventListeners() {
        // Modal-Handler für Benachrichtigungseinstellungen
        const notificationSettingsBtn = document.getElementById('notificationSettingsBtn');
        if (notificationSettingsBtn) {
            notificationSettingsBtn.addEventListener('click', () => {
                if (window.notificationManager) {
                    window.notificationManager.showNotificationSettings();
                }
            });
        }

        const cancelNotificationSettings = document.getElementById('cancelNotificationSettings');
        if (cancelNotificationSettings) {
            cancelNotificationSettings.addEventListener('click', () => {
                if (window.notificationManager) {
                    window.notificationManager.closeNotificationSettings();
                }
            });
        }

        const saveNotificationSettings = document.getElementById('saveNotificationSettings');
        if (saveNotificationSettings) {
            saveNotificationSettings.addEventListener('click', () => {
                this.saveNotificationSettings();
            });
        }

        // Archiv-Toggle
        const archiveAllFinishedBtn = document.getElementById('archiveAllFinishedBtn');
        if (archiveAllFinishedBtn) {
            archiveAllFinishedBtn.addEventListener('click', () => {
                if (window.archiveManager) {
                    window.archiveManager.archiveAllFinished();
                }
            });
        }

        // Test-Notification Button
        const testNotificationBtn = document.getElementById('testNotificationBtn');
        if (testNotificationBtn) {
            testNotificationBtn.addEventListener('click', () => {
                this.testNotifications();
            });
        }
    }

    // Admin Panel anzeigen (wird direkt nach erfolgreicher Authentifizierung durch admin-security.js aufgerufen)
    showAdminPanel() {
        // Lade Daten
        this.loadDashboard();

        // Starte automatische Aktualisierung
        this.startAutoRefresh();
    }

    // Dashboard laden
    loadDashboard() {
        // Lade Bestellungen (nur wenn orderManager verfügbar)
        if (window.orderManager && typeof window.orderManager.loadOrders === 'function') {
            window.orderManager.loadOrders();
        } else {
            console.warn('OrderManager noch nicht verfügbar');
            // Retry nach kurzer Verzögerung
            setTimeout(() => {
                if (window.orderManager && typeof window.orderManager.loadOrders === 'function') {
                    window.orderManager.loadOrders();
                }
            }, 100);
        }

        // Bewertungen laden
        this.loadReviews();

        // Buchhaltungsdaten laden
        this.loadAccountingData();

        // Kalender laden
        this.loadCalendarData();

        // Statistiken laden
        this.loadStats();

        // Starte Benachrichtigungen (falls in localStorage aktiviert)
        this.loadNotificationSettings();

        if (localStorage.getItem("notificationsEnabled") === "true" && window.notificationManager) {
            window.notificationManager.startOrderMonitoring();
        }
    }

    // Bewertungen laden und anzeigen
    async loadReviews() {
        try {
            const reviewsSnapshot = await this.db.collection('reviews')
                .orderBy('created', 'desc')
                .limit(10)
                .get();

            const reviewsList = document.getElementById('reviewsList');
            if (!reviewsList) return;

            if (reviewsSnapshot.empty) {
                reviewsList.innerHTML = '<div style="color: #666; font-style: italic;">Noch keine Bewertungen vorhanden.</div>';
                return;
            }

            let reviewsHTML = '';
            reviewsSnapshot.forEach(doc => {
                const review = doc.data();

                // Feldnamen sowohl deutsch als auch englisch unterstützen
                const taste = review.taste || review.geschmack || 0;
                const appearance = review.appearance || review.aussehen || 0;
                const service = review.service || review.bedienung || 0;
                const overall = review.overall || review.gesamt || 0;
                const nps = review.nps || review.empfehlung || review.weiterempfehlung || 0;
                const comment = review.comment || review.text || review.kommentar || '';
                const improvements = review.improvements || review.verbesserungen || '';

                // Sterne für Kategorien (validiert auf 1-5 Bereich)
                const tasteStars = '★'.repeat(Math.max(0, Math.min(5, taste))) + '☆'.repeat(5 - Math.max(0, Math.min(5, taste)));
                const appearanceStars = '★'.repeat(Math.max(0, Math.min(5, appearance))) + '☆'.repeat(5 - Math.max(0, Math.min(5, appearance)));
                const serviceStars = '★'.repeat(Math.max(0, Math.min(5, service))) + '☆'.repeat(5 - Math.max(0, Math.min(5, service)));
                const overallStars = '★'.repeat(Math.max(0, Math.min(5, overall))) + '☆'.repeat(5 - Math.max(0, Math.min(5, overall)));

                // NPS Farbe (validiert auf 1-10 Bereich)
                const npsScore = Math.max(0, Math.min(10, nps));
                const npsColor = npsScore >= 9 ? '#4CAF50' : npsScore >= 7 ? '#FF9800' : '#f44336';

                // Datum formatieren
                const reviewDate = formatDate(review.created);

                reviewsHTML += `
                    <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 5px; background: #f9f9f9;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <strong>${review.customerName || 'Anonym'}</strong>
                            <span style="color: #666; font-size: 0.9em;">${reviewDate}</span>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 10px;">
                            <div><strong>Geschmack:</strong> <span style="color: #FFD700;">${tasteStars}</span> (${taste}/5)</div>
                            <div><strong>Aussehen:</strong> <span style="color: #FFD700;">${appearanceStars}</span> (${appearance}/5)</div>
                            <div><strong>Service:</strong> <span style="color: #FFD700;">${serviceStars}</span> (${service}/5)</div>
                            <div><strong>Gesamt:</strong> <span style="color: #FFD700;">${overallStars}</span> (${overall}/5)</div>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <strong>Weiterempfehlung:</strong> 
                            <span style="background: ${npsColor}; color: white; padding: 2px 8px; border-radius: 12px; font-weight: bold;">${npsScore}/10</span>
                        </div>
                        ${comment ? `<div style="background: white; padding: 10px; border-radius: 3px; border-left: 3px solid #8B4513; font-style: italic; margin-top: 10px;"><strong>Kommentar:</strong><br>"${comment}"</div>` : ''}
                        ${improvements ? `<div style="margin-top: 8px; color: #666; background: #f0f0f0; padding: 8px; border-radius: 3px;"><strong>Verbesserungen:</strong> ${improvements}</div>` : ''}
                        <div style="margin-top: 8px; color: #999; font-size: 0.8em;">
                            <strong>Bestellung:</strong> ${review.orderId || 'Unbekannt'} | 
                            <strong>Kunde:</strong> ${review.customerId || 'Unbekannt'}
                        </div>
                    </div>
                `;
            });

            reviewsList.innerHTML = reviewsHTML;
            console.log('✅ Bewertungen erfolgreich geladen');

        } catch (error) {
            console.error('Fehler beim Laden der Bewertungen:', error);
            const reviewsList = document.getElementById('reviewsList');
            if (reviewsList) {
                reviewsList.innerHTML = '<div style="color: #f44336;">❌ Fehler beim Laden der Bewertungen</div>';
            }
        }
    }

    // Buchhaltungsdaten laden
    loadAccountingData() {
        // Lade Buchhaltungsdaten (nur wenn accountingManager verfügbar)
        if (window.accountingManager && typeof window.accountingManager.loadAccountingData === 'function') {
            window.accountingManager.loadAccountingData();
        } else {
            console.warn('AccountingManager noch nicht verfügbar');
            // Retry nach kurzer Verzögerung
            setTimeout(() => {
                if (window.accountingManager && typeof window.accountingManager.loadAccountingData === 'function') {
                    window.accountingManager.loadAccountingData();
                }
            }, 500);
        }
    }

    // Kalender-Daten laden
    loadCalendarData() {
        // Lade Kalender-Daten (nur wenn calendarManager verfügbar)
        if (window.calendarManager && typeof window.calendarManager.loadCalendarData === 'function') {
            window.calendarManager.loadCalendarData();
        } else {
            console.warn('CalendarManager noch nicht verfügbar');
            // Retry nach kurzer Verzögerung
            setTimeout(() => {
                if (window.calendarManager && typeof window.calendarManager.loadCalendarData === 'function') {
                    window.calendarManager.loadCalendarData();
                }
            }, 500);
        }
    }

    // Benachrichtigungseinstellungen laden
    loadNotificationSettings() {
        const notificationsEnabled = localStorage.getItem("notificationsEnabled") === "true";
        const emailEnabled = true; // E-Mail-Benachrichtigungen sind IMMER aktiviert
        const soundEnabled = localStorage.getItem("soundNotifications") !== "false"; // Default true
        const checkInterval = localStorage.getItem("checkInterval") || "10";

        // Checkboxen setzen
        const elements = {
            notificationsEnabled: document.getElementById('notificationsEnabled'),
            emailNotifications: document.getElementById('emailNotifications'),
            soundNotifications: document.getElementById('soundNotifications'),
            checkInterval: document.getElementById('checkInterval')
        };

        if (elements.notificationsEnabled) elements.notificationsEnabled.checked = notificationsEnabled;
        if (elements.emailNotifications) {
            elements.emailNotifications.checked = true; // Immer aktiviert
            elements.emailNotifications.disabled = true; // Nicht änderbar
            elements.emailNotifications.title = "E-Mail-Benachrichtigungen sind permanent aktiviert";
        }
        if (elements.soundNotifications) elements.soundNotifications.checked = soundEnabled;
        if (elements.checkInterval) elements.checkInterval.value = checkInterval;

        // EmailConfig aktualisieren
        if (window.emailConfig && window.emailConfig.adminNotifications) {
            window.emailConfig.adminNotifications.options.email = true; // Immer aktiviert
            window.emailConfig.adminNotifications.options.sound = soundEnabled;
            window.emailConfig.adminNotifications.checkInterval = parseInt(checkInterval) * 1000;
        }
    }

    // Automatische Aktualisierung starten
    startAutoRefresh() {
        // Auto-Refresh alle 60 Sekunden
        this.refreshInterval = setInterval(() => {
            window.orderManager.loadOrders();
        }, 60000);

        console.log("Auto-Refresh gestartet (alle 60 Sekunden)");
    }

    // Automatische Aktualisierung stoppen
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log("Auto-Refresh gestoppt");
        }
    }

    // Benachrichtigungseinstellungen speichern
    saveNotificationSettings() {
        const enabledCheckbox = document.getElementById('notificationsEnabled');
        if (!enabledCheckbox) {
            console.error('Notifications-Checkbox nicht gefunden');
            showNotification("Fehler beim Speichern der Einstellungen", "error");
            return;
        }

        const enabled = enabledCheckbox.checked;
        const emailEnabled = true; // Email-Benachrichtigungen sind IMMER aktiviert
        const soundEnabled = document.getElementById('soundNotifications')?.checked || false;
        const checkInterval = document.getElementById('checkInterval')?.value || 10;

        // Einstellungen in localStorage speichern
        localStorage.setItem("notificationsEnabled", enabled.toString());
        localStorage.setItem("emailNotifications", "true"); // Immer aktiviert
        localStorage.setItem("soundNotifications", soundEnabled.toString());
        localStorage.setItem("checkInterval", checkInterval.toString());

        // EmailConfig aktualisieren
        if (window.emailConfig && window.emailConfig.adminNotifications) {
            window.emailConfig.adminNotifications.options.email = true; // Immer aktiviert
            window.emailConfig.adminNotifications.options.sound = soundEnabled;
            window.emailConfig.adminNotifications.checkInterval = parseInt(checkInterval) * 1000;
        }

        if (enabled && window.notificationManager) {
            window.notificationManager.startOrderMonitoring();
        } else if (window.notificationManager) {
            window.notificationManager.stopOrderMonitoring();
        }

        if (window.notificationManager) {
            window.notificationManager.closeNotificationSettings();
        }
        showNotification("Einstellungen gespeichert (E-Mail-Benachrichtigungen sind permanent aktiviert)", "success");
    }

    // Test-Benachrichtigung senden
    async testNotifications() {
        try {
            showNotification("Sende Test-Benachrichtigung...", "info");

            const testOrderData = {
                details: {
                    durchmesserCm: 20,
                    extras: ["Schokoboden", "Vanillecreme"],
                    lieferung: ""
                },
                gesamtpreis: "55€",
                wunschtermin: {
                    datum: new Date().toISOString()
                }
            };

            const testCustomerData = {
                name: "Test Kunde",
                email: window.emailConfig?.adminNotifications?.adminEmail || "admin@example.com",
                telefon: "+49123456789"
            };

            if (window.notificationManager) {
                await window.notificationManager.sendAdminNotification(testOrderData, testCustomerData);
                showNotification("Test-Benachrichtigung gesendet! Prüfen Sie Ihre E-Mails.", "success");
            } else {
                showNotification("NotificationManager nicht verfügbar", "error");
            }
        } catch (error) {
            console.error("Test-Benachrichtigung Fehler:", error);
            showNotification("Fehler beim Senden der Test-Benachrichtigung: " + error.message, "error");
        }
    }

    // Dashboard-Statistiken laden (optional)
    async loadStats() {
        try {
            // Heute's Bestellungen
            const today = new Date().toISOString().split('T')[0];
            const todayOrders = await this.db
                .collection("orders")
                .where("created", ">=", today)
                .where("created", "<", today + "T23:59:59")
                .get();

            // Neue Bestellungen
            const newOrders = await this.db
                .collection("orders")
                .where("status", "==", "neu")
                .get();

            // In Vorbereitung
            const inProgressOrders = await this.db
                .collection("orders")
                .where("status", "==", "in Vorbereitung")
                .get();

            // Fertige Bestellungen
            const finishedOrders = await this.db
                .collection("orders")
                .where("status", "==", "fertig")
                .get();

            // Statistiken anzeigen (falls entsprechende HTML-Elemente vorhanden)
            this.updateStatsDisplay({
                today: todayOrders.size,
                new: newOrders.size,
                inProgress: inProgressOrders.size,
                finished: finishedOrders.size
            });

        } catch (error) {
            console.error("Fehler beim Laden der Statistiken:", error);
        }
    }

    // Statistiken im UI aktualisieren
    updateStatsDisplay(stats) {
        const statsContainer = document.getElementById('dashboardStats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>${stats.today}</h3>
                        <p>Heute</p>
                    </div>
                    <div class="stat-card">
                        <h3>${stats.new}</h3>
                        <p>Neu</p>
                    </div>
                    <div class="stat-card">
                        <h3>${stats.inProgress}</h3>
                        <p>In Arbeit</p>
                    </div>
                    <div class="stat-card">
                        <h3>${stats.finished}</h3>
                        <p>Fertig</p>
                    </div>
                </div>
            `;
        }
    }
}

// Globale Funktionen für HTML-Callbacks
window.saveNotificationSettings = function () {
    window.adminDashboard.saveNotificationSettings();
};

// Expose constructor for test helpers (non-breaking)
if (typeof window.AdminDashboard === 'undefined' && typeof AdminDashboard !== 'undefined') {
    window.AdminDashboard = AdminDashboard;
}

// Initialisierung wenn DOM geladen ist
document.addEventListener("DOMContentLoaded", function () {
    // Erstelle globale Admin-Dashboard Instanz
    window.adminDashboard = new AdminDashboard();
});