// notifications.js - Admin-Benachrichtigungssystem

class NotificationManager {
    constructor() {
        this.lastOrderCount = 0;
        this.notificationInterval = null;
        this.init();
    }

    init() {
        // EmailJS initialisieren
        if (typeof emailjs !== 'undefined' && window.emailConfig) {
            emailjs.init(window.emailConfig.publicKey);
            console.log('EmailJS initialisiert');
        } else {
            console.warn('EmailJS oder emailConfig nicht verfügbar');
        }

        // Browser-Benachrichtigungen anfordern
        if (Notification.permission === "default") {
            Notification.requestPermission();
        }
    }

    // Admin-Benachrichtigung senden
    async sendAdminNotification(orderData, customerData) {
        const config = window.emailConfig.adminNotifications;

        if (!config.options.email) {
            return; // Keine Benachrichtigungen aktiviert
        }

        try {
            // E-Mail-Benachrichtigung
            if (config.options.email) {
                // Verwende neues Template-System
                const templateData = window.emailTemplateManager.getEmailJSTemplateData('newOrder', {
                    name: customerData.name,
                    email: customerData.email,
                    telefon: customerData.telefon,
                    adresse: customerData.adresse,
                    details: orderData.details,
                    wunschtermin: orderData.wunschtermin,
                    gesamtpreis: orderData.gesamtpreis,
                    sonderwunsch: orderData.sonderwunsch
                });

                // Admin-spezifische Daten hinzufügen
                const emailData = {
                    ...templateData,
                    to_email: config.adminEmail,
                    to_name: "Admin"
                };

                await emailjs.send(
                    window.emailConfig.serviceId,
                    'template_ov1de3n', // Verwendung des einheitlichen Templates
                    emailData,
                    window.emailConfig.publicKey
                );
                console.log("Admin E-Mail-Benachrichtigung (Bestellung) gesendet");
            }

            // Sound-Benachrichtigung im Browser
            if (config.options.sound) {
                this.playNotificationSound();
            }

            showNotification("Admin-Benachrichtigung für neue Bestellung gesendet!", "success");
        } catch (error) {
            console.error("Fehler beim Senden der Admin-Benachrichtigung:", error);
        }
    }

    // Sound-Benachrichtigung abspielen
    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800; // Frequenz
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.error("Fehler beim Abspielen des Benachrichtigungssounds:", error);
        }
    }

    // Admin-Benachrichtigung für neue Bewertung senden
    async sendReviewNotification(reviewData) {
        const config = window.emailConfig.adminNotifications;

        if (!config.options.email) {
            return; // Keine Benachrichtigungen aktiviert
        }

        try {
            // E-Mail-Benachrichtigung für Bewertung
            if (config.options.email) {
                // Verwende neues Template-System
                const templateData = window.emailTemplateManager.getEmailJSTemplateData('newReview', reviewData);

                // Admin-spezifische Daten hinzufügen
                const emailData = {
                    ...templateData,
                    to_email: config.adminEmail,
                    to_name: "Admin"
                };

                await emailjs.send(
                    window.emailConfig.serviceId,
                    'template_ov1de3n', // Verwendung des einheitlichen Templates
                    emailData,
                    window.emailConfig.publicKey
                );
                console.log("Admin E-Mail-Benachrichtigung (Bewertung) gesendet");
            }

            // Sound-Benachrichtigung im Browser
            if (config.options.sound) {
                this.playNotificationSound();
            }

            showNotification("Admin-Benachrichtigung für neue Bewertung gesendet!", "success");
        } catch (error) {
            console.error("Fehler beim Senden der Bewertungsbenachrichtigung:", error);
        }
    }

    // Überwachung neuer Bestellungen
    async checkForNewOrders() {
        try {
            const db = firebase.firestore();
            const snapshot = await db
                .collection("orders")
                .where("status", "==", "neu")
                .get();
            const currentOrderCount = snapshot.size;

            if (this.lastOrderCount > 0 && currentOrderCount > this.lastOrderCount) {
                // Neue Bestellung(en) gefunden!
                const newOrders = currentOrderCount - this.lastOrderCount;
                console.log(`${newOrders} neue Bestellung(en) gefunden!`);

                // Hole die Details der neuesten Bestellung
                const latestOrderSnap = await db
                    .collection("orders")
                    .where("status", "==", "neu")
                    .orderBy("created", "desc")
                    .limit(1)
                    .get();

                if (!latestOrderSnap.empty) {
                    const orderDoc = latestOrderSnap.docs[0];
                    const orderData = orderDoc.data();

                    // Hole Kundendaten
                    let customerData = {};
                    if (orderData.customerId) {
                        const customerDoc = await db
                            .collection("customers")
                            .doc(orderData.customerId)
                            .get();
                        if (customerDoc.exists) {
                            customerData = customerDoc.data();
                        }
                    }

                    // Sende Benachrichtigung
                    await this.sendAdminNotification(orderData, customerData);

                    // Zeige Browser-Benachrichtigung
                    if (Notification.permission === "granted") {
                        new Notification("Neue Tortenbestellung!", {
                            body: `Von: ${customerData.name || "Unbekannt"}\nWert: ${orderData.gesamtpreis || "?"}€`,
                            icon: "/images/logo.png",
                        });
                    }
                }
            }

            this.lastOrderCount = currentOrderCount;
        } catch (error) {
            console.error("Fehler beim Prüfen neuer Bestellungen:", error);
        }
    }

    // Benachrichtigungsüberwachung starten
    startOrderMonitoring() {
        const config = window.emailConfig.adminNotifications;

        if (this.notificationInterval) {
            this.stopOrderMonitoring();
        }

        // Erste Prüfung
        this.checkForNewOrders();

        // Intervall starten
        this.notificationInterval = setInterval(() => {
            this.checkForNewOrders();
        }, config.checkInterval || 30000);

        console.log(`Benachrichtigungsüberwachung gestartet (${config.checkInterval / 1000}s Intervall)`);
        showNotification("Benachrichtigungsüberwachung aktiviert", "success");
    }

    // Überwachung stoppen
    stopOrderMonitoring() {
        if (this.notificationInterval) {
            clearInterval(this.notificationInterval);
            this.notificationInterval = null;
            console.log("Benachrichtigungsüberwachung gestoppt");
            showNotification("Benachrichtigungsüberwachung deaktiviert", "success");
        }
    }

    // Modal-Funktionen für Einstellungen
    showNotificationSettings() {
        document.getElementById('notificationSettingsModal').style.display = 'flex';
    }

    closeNotificationSettings() {
        document.getElementById('notificationSettingsModal').style.display = 'none';
    }

    toggleNotifications() {
        const enabled = document.getElementById('notificationsEnabled').checked;
        if (enabled) {
            this.startOrderMonitoring();
        } else {
            this.stopOrderMonitoring();
        }
    }
}

// Globale Instanz für Admin-Dashboard
window.notificationManager = new NotificationManager();