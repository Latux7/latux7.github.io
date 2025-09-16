// orders.js - Bestellverwaltung im Admin-Dashboard

class OrderManager {
    constructor() {
        this.db = null;
        this.init();
    }

    init() {
        // Firebase App erst initialisieren, dann Firestore verwenden
        if (typeof initializeFirebaseApp === 'function') {
            this.db = initializeFirebaseApp();
        } else {
            // Fallback: Firebase direkt verwenden falls schon initialisiert
            if (!firebase.apps.length) {
                firebase.initializeApp(window.firebaseConfig);
            }
            this.db = firebase.firestore();
        }
    }

    // Bestellung löschen
    async deleteOrder(orderId) {
        if (!confirm("Bestellung wirklich löschen?")) return;

        try {
            await this.db.collection("orders").doc(orderId).delete();
            showNotification("Bestellung gelöscht!", "success");
            this.loadOrders(); // Liste neu laden
        } catch (error) {
            console.error("Fehler beim Löschen:", error);
            showNotification("Fehler beim Löschen der Bestellung", "error");
        }
    }

    // E-Mail Templates basierend auf Status
    getEmailTemplate(status, customerName, orderDetails) {
        const templates = {
            angenommen: {
                subject: "Ihre Tortenbestellung wurde angenommen",
                html: `
                    <h2>Liebe/r ${customerName},</h2>
                    <p>vielen Dank für Ihre Bestellung bei Laura's Backstube!</p>
                    <p>Wir haben Ihre Bestellung angenommen und werden sie sorgfältig zubereiten.</p>
                    <p><strong>Bestelldetails:</strong><br>
                    Tortengröße: ${orderDetails.size}<br>
                    Extras: ${orderDetails.extras}<br>
                    Gesamtpreis: ${orderDetails.price}€<br>
                    Wunschtermin: ${orderDetails.wunschtermin}</p>
                    <p>Sie erhalten eine weitere E-Mail, sobald Ihre Torte fertig ist.</p>
                    <p>Mit süßen Grüßen,<br>Laura's Backstube Team</p>
                `,
            },
            "in Vorbereitung": {
                subject: "Ihre Torte ist in Vorbereitung",
                html: `
                    <h2>Liebe/r ${customerName},</h2>
                    <p>Ihre Torte ist jetzt in Vorbereitung!</p>
                    <p>Unsere Bäcker arbeiten bereits an Ihrer individuellen Torte.</p>
                    <p><strong>Bestelldetails:</strong><br>
                    Tortengröße: ${orderDetails.size}<br>
                    Extras: ${orderDetails.extras}<br>
                    Gesamtpreis: ${orderDetails.price}€</p>
                    <p>Sie werden benachrichtigt, sobald Ihre Torte fertig ist.</p>
                    <p>Mit süßen Grüßen,<br>Laura's Backstube Team</p>
                `,
            },
            fertig: {
                subject: "Ihre Torte ist fertig!",
                html: `
                    <h2>Liebe/r ${customerName},</h2>
                    <p><strong>Ihre Torte ist fertig!</strong></p>
                    <p>Sie können Ihre wunderschöne, frisch gebackene Torte jetzt abholen.</p>
                    <p><strong>Bestelldetails:</strong><br>
                    Tortengröße: ${orderDetails.size}<br>
                    Extras: ${orderDetails.extras}<br>
                    Gesamtpreis: ${orderDetails.price}€</p>
                    <p><strong>Abholung:</strong><br>
                    ${window.emailConfig.company.name}<br>
                    ${window.emailConfig.company.address}<br>
                    ${window.emailConfig.company.postal}</p>
                    <p>Wir freuen uns auf Ihren Besuch!</p>
                    <p>Mit süßen Grüßen,<br>Laura's Backstube Team</p>
                `,
            },
            abgelehnt: {
                subject: "Ihre Tortenbestellung - Leider müssen wir absagen",
                html: `
                    <h2>Liebe/r ${customerName},</h2>
                    <p>vielen Dank für Ihr Interesse an Laura's Backstube.</p>
                    <p>Leider müssen wir Ihre Bestellung absagen. Dies kann verschiedene Gründe haben (Kapazität, spezielle Anforderungen, etc.).</p>
                    <p>Gerne können Sie uns telefonisch kontaktieren, um eine alternative Lösung zu finden.</p>
                    <p>Wir entschuldigen uns für die Unannehmlichkeiten.</p>
                    <p>Mit freundlichen Grüßen,<br>Laura's Backstube Team</p>
                `,
            },
        };

        return templates[status] || null;
    }

    // E-Mail über EmailJS senden
    async sendEmailToCustomer(customerEmail, customerName, status, orderDetails) {
        try {
            const config = window.emailConfig;

            // EmailJS initialisieren
            emailjs.init(config.publicKey);

            // Verwende immer das gleiche Template (template_2eyveh9) für alle Status
            const templateId = config.templates.order_status;
            const statusInfo = config.statusData[status];

            if (!statusInfo) {
                showNotification('Status "' + status + '" nicht konfiguriert!', "error");
                return;
            }

            // Basis-Parameter für alle Status
            let templateParams = {
                to: customerEmail,
                to_email: customerEmail,
                user_email: customerEmail,
                email: customerEmail,
                to_name: customerName,
                customer_name: customerName,
                order_items: `${orderDetails.size} mit ${orderDetails.extras}`,
                total_price: orderDetails.price,
                company_email: config.company.email,
                header_color: statusInfo.header_color,
                status_title: statusInfo.title,
                status_message: statusInfo.message,
                footer_message: statusInfo.footer_message,
                wunschtermin: orderDetails.wunschtermin || "Nicht angegeben",
                delivery_message: "", // Standard leer
                review_link: "" // Standard leer
            };

            // Spezielle Behandlung für "fertig" Status
            if (status === "fertig") {
                // Bestimme Liefermethode (Standard = Abholung)
                const deliveryType = orderDetails.delivery || "abholung";
                const deliveryMessage = config.deliveryMessages[deliveryType] || config.deliveryMessages.abholung;

                // Erstelle Review-Link mit orderId und customerId
                const reviewLink = `${window.location.origin}/bewerten.html?orderId=${orderDetails.orderId}&customerId=${orderDetails.customerId || ""}`;

                // Zusätzliche Parameter für "fertig"
                templateParams.delivery_message = deliveryMessage;
                templateParams.review_link = reviewLink;
            }

            console.log("Sende E-Mail mit Template:", templateId, templateParams);

            const response = await emailjs.send(config.serviceId, templateId, templateParams, {
                publicKey: config.publicKey,
                to_email: customerEmail,
                to_name: customerName,
            });

            console.log("E-Mail erfolgreich gesendet:", response);
            showNotification("E-Mail erfolgreich an " + customerEmail + " gesendet!", "success");
        } catch (error) {
            console.error("E-Mail Versand Fehler:", error);
            showNotification("Fehler beim E-Mail-Versand: " + (error.text || error.message), "error");
        }
    }

    // Status-E-Mail senden
    async sendStatusEmail(orderId, customerEmail, customerName, status, size, extras, price) {
        if (!customerEmail) {
            showNotification("Keine E-Mail-Adresse für diesen Kunden verfügbar.", "error");
            return;
        }

        // Prüfe EmailJS-Konfiguration
        if (!window.emailConfig.serviceId || !window.emailConfig.publicKey || window.emailConfig.publicKey === "YOUR_EMAILJS_PUBLIC_KEY") {
            showNotification("EmailJS nicht konfiguriert. Bitte Public Key in email-config.js eintragen.", "error");
            return;
        }

        try {
            const orderDoc = await this.db.collection("orders").doc(orderId).get();
            const orderData = orderDoc.data();

            const orderDetails = {
                orderId: orderId,
                size: size || "Unbekannt",
                extras: extras || "keine",
                price: price || "0",
                delivery: orderData?.lieferung ? "lieferung" : "abholung",
                customerId: orderData?.customerId,
                wunschtermin: orderData?.wunschtermin
                    ? `${new Date(orderData.wunschtermin.datum).toLocaleDateString("de-DE")}${orderData.wunschtermin.uhrzeit ? ` um ${orderData.wunschtermin.uhrzeit}` : ""}`
                    : "Nicht angegeben",
            };

            await this.sendEmailToCustomer(customerEmail, customerName, status, orderDetails);
        } catch (error) {
            console.error("Fehler beim Laden der Bestelldetails:", error);
            showNotification("Fehler beim Senden der E-Mail", "error");
        }
    }

    // Bestellhistorie für Kunden abrufen
    async getCustomerOrderHistory(customerEmail) {
        try {
            // Zuerst Kunde anhand E-Mail finden
            const customerQuery = await this.db
                .collection("customers")
                .where("email", "==", customerEmail)
                .limit(1)
                .get();

            if (customerQuery.empty) {
                return 0; // Neukunde
            }

            const customerId = customerQuery.docs[0].id;

            // Bestellungen des Kunden zählen
            const ordersQuery = await this.db
                .collection("orders")
                .where("customerId", "==", customerId)
                .get();

            return ordersQuery.size;
        } catch (error) {
            console.error("Fehler beim Abrufen der Kundenhistorie:", error);
            return 0;
        }
    }

    // Einzelne Bestellung rendern
    async renderOrder(doc, order) {
        const orderId = doc.id;
        let customerData = {};

        // Kundendaten laden
        if (order.customerId) {
            try {
                const customerDoc = await this.db.collection("customers").doc(order.customerId).get();
                if (customerDoc.exists) {
                    customerData = customerDoc.data();
                }
            } catch (error) {
                console.error("Fehler beim Laden der Kundendaten:", error);
            }
        }

        // Erstbestellung-Status prüfen
        const orderCount = await this.getCustomerOrderHistory(customerData.email || "");
        const isFirstTime = orderCount <= 1;

        const size = order.details?.durchmesserCm ? `${order.details.durchmesserCm} cm` : "Unbekannt";
        const extras = order.details?.extras?.length ? order.details.extras.join(", ") : "keine";
        const lieferung = order.details?.lieferung || "";
        const liefertext = lieferung ? `Lieferung (${lieferung})` : "Abholung";
        const price = order.gesamtpreis || "Nicht berechnet";
        const wunschtermin = order.wunschtermin
            ? `${new Date(order.wunschtermin.datum).toLocaleDateString("de-DE")}${order.wunschtermin.uhrzeit ? ` um ${order.wunschtermin.uhrzeit}` : ""}`
            : "Nicht angegeben";

        const created = order.created ? formatDateTime(new Date(order.created)) : "Unbekannt";

        const customerBadge = isFirstTime
            ? '<span style="background: #ff9800; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; margin-left: 8px;">NEUKUNDE</span>'
            : '<span style="background: #4caf50; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; margin-left: 8px;">STAMMKUNDE</span>';

        return `
            <details style="margin-bottom:16px;">
                <summary style="cursor: pointer; font-weight: bold; padding: 8px; background: #f5f5f5; border-radius: 4px;">
                    Bestellung ${orderId.substr(-6)} - ${customerData.name || "Unbekannter Kunde"}${customerBadge} - ${price}€ - <span style="color: ${this.getStatusColor(order.status)}">${order.status}</span>
                </summary>
                <div style="padding: 16px; border: 1px solid #ddd; border-top: none;">
                    <p><strong>Kunde:</strong> ${escapeHtml(customerData.name || "Unbekannt")}</p>
                    <p><strong>E-Mail:</strong> ${escapeHtml(customerData.email || "Nicht verfügbar")}</p>
                    <p><strong>Telefon:</strong> ${escapeHtml(customerData.telefon || "Nicht verfügbar")}</p>
                    <p><strong>Erstellt:</strong> ${created}</p>
                    <p><strong>Wunschtermin:</strong> ${wunschtermin}</p>
                    <p><strong>Größe:</strong> ${size}</p>
                    <p><strong>Extras:</strong> ${extras}</p>
                    <p><strong>Lieferung:</strong> ${liefertext}</p>
                    ${order.adresse ? `<p><strong>Adresse:</strong> ${escapeHtml(order.adresse.street)}, ${escapeHtml(order.adresse.plz)} ${escapeHtml(order.adresse.city)}</p>` : ""}
                    <p><strong>Preis:</strong> ${price}€</p>
                    <p><strong>Status:</strong> 
                        <select onchange="this.nextElementSibling.style.display = 'inline'" data-order-id="${orderId}">
                            <option value="neu" ${order.status === "neu" ? "selected" : ""}>neu</option>
                            <option value="angenommen" ${order.status === "angenommen" ? "selected" : ""}>angenommen</option>
                            <option value="in Vorbereitung" ${order.status === "in Vorbereitung" ? "selected" : ""}>in Vorbereitung</option>
                            <option value="fertig" ${order.status === "fertig" ? "selected" : ""}>fertig</option>
                            <option value="abgelehnt" ${order.status === "abgelehnt" ? "selected" : ""}>abgelehnt</option>
                        </select>
                        <button onclick="this.style.display='none'; updateOrderStatus('${orderId}', this.previousElementSibling.value)" style="display:none; margin-left:8px;">Speichern</button>
                    </p>
                    <div style="margin-top: 12px;">
                        <button class="btn-small" onclick="archiveOrder('${orderId}')">Archivieren</button>
                        <button class="btn-small" onclick="sendStatusEmail('${orderId}', '${customerData.email}', '${escapeHtml(customerData.name)}', '${order.status}', '${size}', '${extras}', '${price}')" ${!customerData.email ? "disabled" : ""}>E-Mail senden</button>
                        <button class="btn-small btn-danger" onclick="deleteOrder('${orderId}')">Löschen</button>
                    </div>
                </div>
            </details>
        `;
    }

    // Hilfsfunktion für Status-Farben
    getStatusColor(status) {
        switch (status) {
            case "neu": return "#ff9800";
            case "angenommen": return "#8B4513";
            case "in Vorbereitung": return "#FF9800";
            case "fertig": return "#4CAF50";
            case "abgelehnt": return "#f44336";
            default: return "#666";
        }
    }

    // Bestellungen laden und anzeigen
    async loadOrders() {
        try {
            showLoading('ordersList', 'Lade Bestellungen...');

            const ordersSnapshot = await this.db
                .collection("orders")
                .where("status", "!=", "archiviert")
                .orderBy("status")
                .orderBy("created", "desc")
                .get();

            if (ordersSnapshot.empty) {
                document.getElementById('ordersList').innerHTML = '<p>Keine Bestellungen vorhanden.</p>';
                return;
            }

            let html = "";
            for (const doc of ordersSnapshot.docs) {
                const order = doc.data();
                html += await this.renderOrder(doc, order);
            }

            document.getElementById('ordersList').innerHTML = html;
        } catch (error) {
            console.error("Fehler beim Laden der Bestellungen:", error);
            document.getElementById('ordersList').innerHTML = '<p>Fehler beim Laden der Bestellungen.</p>';
        }
    }

    // Status einer Bestellung aktualisieren
    async updateOrderStatus(orderId, newStatus) {
        try {
            await this.db.collection("orders").doc(orderId).update({
                status: newStatus,
                updated: new Date().toISOString()
            });

            showNotification(`Bestellstatus auf "${newStatus}" geändert`, "success");
            this.loadOrders(); // Liste neu laden
        } catch (error) {
            console.error("Fehler beim Aktualisieren des Status:", error);
            showNotification("Fehler beim Speichern des Status", "error");
        }
    }
}

// Globale Funktionen für HTML-Callbacks
window.deleteOrder = async function (orderId) {
    await window.orderManager.deleteOrder(orderId);
};

window.sendStatusEmail = async function (orderId, customerEmail, customerName, status, size, extras, price) {
    await window.orderManager.sendStatusEmail(orderId, customerEmail, customerName, status, size, extras, price);
};

window.updateOrderStatus = async function (orderId, newStatus) {
    await window.orderManager.updateOrderStatus(orderId, newStatus);
};

// Globale Instanz für Admin-Dashboard
window.orderManager = new OrderManager();