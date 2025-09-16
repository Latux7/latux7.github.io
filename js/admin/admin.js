// admin.js - Hauptadmin-Dashboard Funktionalität

class AdminDashboard {
    constructor() {
        this.ADMIN_PW = "tortenadmin2025";
        this.db = null;
        this.refreshInterval = null;
        this.init();
    }

    init() {
        // Firebase initialisieren
        this.db = initializeFirebase();

        // Event-Listener setzen
        this.setupEventListeners();

        // Login-Status prüfen
        this.checkLoginStatus();
    }

    setupEventListeners() {
        // Login-Handler
        const loginForm = document.getElementById("loginForm");
        if (loginForm) {
            loginForm.addEventListener("submit", (e) => this.handleLogin(e));
        }

        // Logout-Handler
        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => this.logout());
        }

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

        const toggleArchiveBtn = document.getElementById('toggleArchiveBtn');
        if (toggleArchiveBtn) {
            toggleArchiveBtn.addEventListener('click', () => {
                if (window.archiveManager) {
                    window.archiveManager.toggleArchive();
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

    // Login-Handler
    handleLogin(e) {
        e.preventDefault();

        const password = document.getElementById("adminPassword").value;
        if (password === this.ADMIN_PW) {
            this.login();
        } else {
            showNotification("Falsches Passwort!", "error");
        }
    }

    // Login ausführen
    login() {
        this.showAdminPanel();
        showNotification("Erfolgreich angemeldet!", "success");
    }

    // Admin Panel anzeigen (ohne Success-Message)
    showAdminPanel() {
        localStorage.setItem("adminLoggedIn", "true");
        document.getElementById("adminLogin").style.display = "none";
        document.getElementById("adminPanel").style.display = "block";

        // Lade Daten
        this.loadDashboard();

        // Starte automatische Aktualisierung
        this.startAutoRefresh();
    }

    // Logout
    logout() {
        localStorage.removeItem("adminLoggedIn");
        document.getElementById("adminLogin").style.display = "block";
        document.getElementById("adminPanel").style.display = "none";

        // Stoppe automatische Aktualisierung
        this.stopAutoRefresh();

        // Stoppe Benachrichtigungen
        window.notificationManager.stopOrderMonitoring();

        showNotification("Abgemeldet", "success");
    }

    // Login-Status prüfen
    checkLoginStatus() {
        const isLoggedIn = localStorage.getItem("adminLoggedIn") === "true";
        if (isLoggedIn) {
            this.showAdminPanel(); // Ohne Success-Message
        }
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

        // Starte Benachrichtigungen (falls in localStorage aktiviert)
        this.loadNotificationSettings();

        if (localStorage.getItem("notificationsEnabled") === "true" && window.notificationManager) {
            window.notificationManager.startOrderMonitoring();
        }
    }

    // Benachrichtigungseinstellungen laden
    loadNotificationSettings() {
        const notificationsEnabled = localStorage.getItem("notificationsEnabled") === "true";
        const emailEnabled = localStorage.getItem("emailNotifications") !== "false"; // Default true
        const smsEnabled = localStorage.getItem("smsNotifications") === "true";
        const soundEnabled = localStorage.getItem("soundNotifications") !== "false"; // Default true
        const checkInterval = localStorage.getItem("checkInterval") || "30";

        // Checkboxen setzen
        const elements = {
            notificationsEnabled: document.getElementById('notificationsEnabled'),
            emailNotifications: document.getElementById('emailNotifications'),
            smsNotifications: document.getElementById('smsNotifications'),
            soundNotifications: document.getElementById('soundNotifications'),
            checkInterval: document.getElementById('checkInterval')
        };

        if (elements.notificationsEnabled) elements.notificationsEnabled.checked = notificationsEnabled;
        if (elements.emailNotifications) elements.emailNotifications.checked = emailEnabled;
        if (elements.smsNotifications) elements.smsNotifications.checked = smsEnabled;
        if (elements.soundNotifications) elements.soundNotifications.checked = soundEnabled;
        if (elements.checkInterval) elements.checkInterval.value = checkInterval;

        // EmailConfig aktualisieren
        if (window.emailConfig && window.emailConfig.adminNotifications) {
            window.emailConfig.adminNotifications.options.email = emailEnabled;
            window.emailConfig.adminNotifications.options.sms = smsEnabled;
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
        const emailEnabled = document.getElementById('emailNotifications')?.checked || false;
        const smsEnabled = document.getElementById('smsNotifications')?.checked || false;
        const soundEnabled = document.getElementById('soundNotifications')?.checked || false;
        const checkInterval = document.getElementById('checkInterval')?.value || 30;

        // Einstellungen in localStorage speichern
        localStorage.setItem("notificationsEnabled", enabled.toString());
        localStorage.setItem("emailNotifications", emailEnabled.toString());
        localStorage.setItem("smsNotifications", smsEnabled.toString());
        localStorage.setItem("soundNotifications", soundEnabled.toString());
        localStorage.setItem("checkInterval", checkInterval.toString());

        // EmailConfig aktualisieren
        if (window.emailConfig && window.emailConfig.adminNotifications) {
            window.emailConfig.adminNotifications.options.email = emailEnabled;
            window.emailConfig.adminNotifications.options.sms = smsEnabled;
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
        showNotification("Einstellungen gespeichert", "success");
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
window.logout = function () {
    window.adminDashboard.logout();
};

window.saveNotificationSettings = function () {
    window.adminDashboard.saveNotificationSettings();
};

// Initialisierung wenn DOM geladen ist
document.addEventListener("DOMContentLoaded", function () {
    // Erstelle globale Admin-Dashboard Instanz
    window.adminDashboard = new AdminDashboard();
});