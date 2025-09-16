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
        localStorage.setItem("adminLoggedIn", "true");
        document.getElementById("adminLogin").style.display = "none";
        document.getElementById("adminPanel").style.display = "block";

        showNotification("Erfolgreich angemeldet!", "success");

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
            this.login();
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
        const notificationsEnabled = localStorage.getItem("notificationsEnabled") === "true";
        const notificationsCheckbox = document.getElementById('notificationsEnabled');
        if (notificationsCheckbox) {
            notificationsCheckbox.checked = notificationsEnabled;
        }

        if (notificationsEnabled && window.notificationManager) {
            window.notificationManager.startOrderMonitoring();
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
        const enabled = document.getElementById('notificationsEnabled').checked;
        localStorage.setItem("notificationsEnabled", enabled.toString());

        if (enabled) {
            window.notificationManager.startOrderMonitoring();
        } else {
            window.notificationManager.stopOrderMonitoring();
        }

        window.notificationManager.closeNotificationSettings();
        showNotification("Einstellungen gespeichert", "success");
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