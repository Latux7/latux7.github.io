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
                const emailData = {
                    to_email: config.adminEmail,
                    to_name: "Admin",
                    customer_name: customerData.name || "Unbekannt",
                    customer_email: customerData.email || "Nicht angegeben",
                    customer_phone: customerData.telefon || "Nicht angegeben",
                    order_date: new Date().toLocaleString("de-DE"),
                    cake_size: orderData.details && orderData.details.durchmesserCm
                        ? `${orderData.details.durchmesserCm} cm`
                        : "Nicht spezifiziert",
                    extras: orderData.details && orderData.details.extras
                        ? orderData.details.extras.join(", ")
                        : "Keine",
                    delivery: orderData.details && orderData.details.lieferung
                        ? orderData.details.lieferung === ""
                            ? "Abholung"
                            : `Lieferung ${orderData.details.lieferung}`
                        : "Abholung",
                    total_price: orderData.gesamtpreis || "Nicht berechnet",
                    desired_date: orderData.wunschtermin && orderData.wunschtermin.datum
                        ? new Date(orderData.wunschtermin.datum).toLocaleDateString("de-DE")
                        : "Nicht angegeben",
                };

                await emailjs.send(
                    window.emailConfig.serviceId,
                    window.emailConfig.templates.new_order_notification,
                    emailData,
                    window.emailConfig.publicKey
                );
                console.log("Admin E-Mail-Benachrichtigung gesendet");
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