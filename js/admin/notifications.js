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
            // EmailJS initialized
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
        const config = window.emailConfig.adminNotifications || {};

        // Enforce always-on behavior: email and sound must be true for admin notifications
        config.options = config.options || {};
        config.options.email = true;
        config.options.sound = true;

        try {
            // E-Mail-Benachrichtigung
            if (config.options.email) {
                // Kombiniere Bestellungs- und Kundendaten richtig für das Template
                const combinedOrderData = {
                    name: customerData.name,
                    email: customerData.email,
                    telefon: customerData.telefon,
                    adresse: customerData.adresse,
                    details: orderData.details,
                    wunschtermin: orderData.wunschtermin,
                    gesamtpreis: orderData.gesamtpreis,
                    sonderwunsch: orderData.sonderwunsch
                };

                // Sending admin notification with data

                // Verwende direkt die getOrderEmailJSData Funktion
                const templateData = window.emailTemplateManager.getOrderEmailJSData(combinedOrderData);

                // Admin-spezifische Daten hinzufügen
                const emailData = {
                    ...templateData,
                    to_email: config.adminEmail,
                    to_name: "Admin"
                };

                // Prepared EmailJS template data

                await emailjs.send(
                    window.emailConfig.serviceId,
                    'template_ov1de3n', // Verwendung des einheitlichen Templates
                    emailData,
                    window.emailConfig.publicKey
                );
                // Admin email notification (order) sent
            }

            // Sound-Benachrichtigung im Browser (always-on)
            this.playNotificationSound();

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
        const config = window.emailConfig.adminNotifications || {};

        // Enforce always-on
        config.options = config.options || {};
        config.options.email = true;
        config.options.sound = true;

        try {
            // E-Mail-Benachrichtigung für Bewertung
            if (config.options.email) {
                // Erzeuge das HTML für die Review-Benachrichtigung (fokussiert auf Bewertungstext und Sterne)
                const htmlBody = window.emailTemplateManager.generateNewReviewEmail(reviewData);

                // Strukturierte, minimal notwendige Felder für das Template
                const plainText = `Neue Bewertung von ${reviewData.name || reviewData.customerName || 'Anonym'}\n\n` +
                    `Bewertung: ${reviewData.gesamt || reviewData.gesamtbewertung || ''}/5\n` +
                    `Kommentar: ${reviewData.kommentar || reviewData.text || 'Keine zusätzlichen Kommentare'}\n` +
                    (reviewData.orderId ? `Bestellungs-ID: ${reviewData.orderId}\n` : '');

                const emailData = {
                    to_email: config.adminEmail,
                    to_name: 'Admin',
                    subject: 'Neue Bewertung erhalten',
                    html_body: htmlBody,
                    message_html: htmlBody, // alias some templates expect
                    text_body: plainText,
                    message_text: plainText, // alias for plain-text templates
                    review_comment: reviewData.kommentar || reviewData.text || '',
                    rating_overall: reviewData.gesamt || reviewData.gesamtbewertung || '',
                    reviewer_name: reviewData.name || reviewData.customerName || 'Anonym',
                    order_id: reviewData.orderId || ''
                };

                await emailjs.send(
                    window.emailConfig.serviceId,
                    'template_ov1de3n',
                    emailData,
                    window.emailConfig.publicKey
                );
                // Admin email notification (review) sent
            }

            // Sound-Benachrichtigung im Browser (always-on)
            this.playNotificationSound();

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
                // Detected new orders: ${newOrders}

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
        // Enforce 10s interval and always-on options
        const config = window.emailConfig.adminNotifications || {};
        config.checkInterval = 10000; // 10 seconds
        config.options = config.options || {};
        config.options.email = true;
        config.options.sound = true;

        if (this.notificationInterval) {
            this.stopOrderMonitoring();
        }

        // Erste Prüfung
        this.checkForNewOrders();

        // Intervall starten (10s enforced)
        this.notificationInterval = setInterval(() => {
            this.checkForNewOrders();
        }, config.checkInterval);

        // Notification monitoring started
        // Keep notifications persistent — no UI toggle required
    }

    // Überwachung stoppen
    stopOrderMonitoring() {
        if (this.notificationInterval) {
            clearInterval(this.notificationInterval);
            this.notificationInterval = null;
            // Notification monitoring stopped
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

// Expose constructor for test helpers (non-breaking)
if (typeof window.NotificationManager === 'undefined' && typeof NotificationManager !== 'undefined') {
    window.NotificationManager = NotificationManager;
}