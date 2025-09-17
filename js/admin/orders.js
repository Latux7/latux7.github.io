// orders.js - Bestellverwaltung im Admin-Dashboard

class OrderManager {
    constructor() {
        this.db = null;
        this.init();
    }

    init() {
        // Firebase App erst initialisieren, dann Firestore verwenden
        console.log('OrderManager: Initialisiere Firebase...');

        if (typeof initializeFirebaseApp === 'function') {
            this.db = initializeFirebaseApp();
            console.log('OrderManager: Firebase über initializeFirebaseApp initialisiert');
        } else {
            // Fallback: Firebase direkt verwenden falls schon initialisiert
            if (!firebase.apps.length) {
                firebase.initializeApp(window.firebaseConfig);
                console.log('OrderManager: Firebase direkt initialisiert');
            }
            this.db = firebase.firestore();
        }

        if (this.db) {
            console.log('OrderManager: Firestore erfolgreich initialisiert');
        } else {
            console.error('OrderManager: Firestore-Initialisierung fehlgeschlagen!');
        }
    }

    // Bestellung löschen
    async deleteOrder(orderId) {
        showConfirmation(
            "Bestellung wirklich löschen?",
            async () => {
                try {
                    await this.db.collection("orders").doc(orderId).delete();
                    showNotification("Bestellung gelöscht!", "success");
                    this.loadOrders(); // Liste neu laden
                } catch (error) {
                    console.error("Fehler beim Löschen:", error);
                    showNotification("Fehler beim Löschen der Bestellung", "error");
                }
            }
        );
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

        // Kundendaten sind jetzt direkt in der Bestellung
        const customerName = order.name || "Unbekannt";
        const customerEmail = order.email || "Nicht verfügbar";
        const customerPhone = order.telefon || "Nicht verfügbar";

        // Erstbestellung-Status prüfen
        const orderCount = await this.getCustomerOrderHistory(customerEmail);
        const isFirstTime = orderCount <= 1;

        const size = order.details?.durchmesserCm ? `${order.details.durchmesserCm} cm` : "Unbekannt";
        const extras = order.details?.extras?.length ? (typeof formatExtras === 'function' ? formatExtras(order.details.extras, order.details) : order.details.extras.join(", ")) : "keine";
        const lieferung = order.details?.lieferung || "";
        const liefertext = lieferung ? `Lieferung (${lieferung})` : "Abholung";
        const price = order.gesamtpreis || "Nicht berechnet";
        const wunschtermin = order.wunschtermin
            ? `${new Date(order.wunschtermin.datum).toLocaleDateString("de-DE")}${order.wunschtermin.uhrzeit ? ` um ${order.wunschtermin.uhrzeit}` : ""}`
            : "Nicht angegeben";

        const created = order.created ? formatDateTime(new Date(order.created)) : "Unbekannt";

        const customerBadge = isFirstTime
            ? '<span class="badge badge-new" style="margin-left:8px;">NEUKUNDE</span>'
            : '<span class="badge badge-old" style="margin-left:8px;">STAMMKUNDE</span>';

        return `
            <details class="list-item" style="margin-bottom:16px;">
                <summary class="detail-summary">
                    Bestellung ${orderId.substr(-6)} - ${customerName}${customerBadge} - ${price}€ - <strong>Wunschtermin:</strong> ${this.formatDesiredDate(order)} - <span class="order-status ${this.normalizeStatus(order.status)}">${order.status}</span>
                </summary>
                <div style="padding: 16px; border: 1px solid #ddd; border-top: none;">
                    <p><strong>Kunde:</strong> ${escapeHtml(customerName)}</p>
                    <p><strong>E-Mail:</strong> ${escapeHtml(customerEmail)}</p>
                    <p><strong>Telefon:</strong> ${escapeHtml(customerPhone)}</p>
                    <p><strong>Erstellt:</strong> ${created}</p>
                    <p><strong>Wunschtermin:</strong> ${wunschtermin}</p>
                    ${order.anlass ? `<p><strong>Anlass:</strong> ${this.getOccasionDisplayName(order.anlass)}</p>` : ""}
                    <p><strong>Größe:</strong> ${size}</p>
                    ${order.details && order.details.numberOfTiers ? `<p><strong>Stockwerke:</strong> ${escapeHtml(String(order.details.numberOfTiers))}</p>` : ''}
                    <p><strong>Extras:</strong> ${extras}</p>
                    <p><strong>Lieferung:</strong> ${liefertext}</p>
                    ${order.adresse ? `<p><strong>Adresse:</strong> ${escapeHtml(order.adresse.street)}, ${escapeHtml(order.adresse.plz)} ${escapeHtml(order.adresse.city)}</p>` : ""}
                    <p><strong>Preis:</strong> ${price}€</p>
                    <p><strong>Status:</strong> 
                        <select onchange="this.nextElementSibling.style.display = 'inline'" data-order-id="${orderId}">
                            <option value="neu" ${this.normalizeStatus(order.status) === "neu" ? "selected" : ""}>neu</option>
                            <option value="angenommen" ${this.normalizeStatus(order.status) === "angenommen" ? "selected" : ""}>angenommen</option>
                            <option value="in Vorbereitung" ${this.normalizeStatus(order.status) === "in Vorbereitung" ? "selected" : ""}>in Vorbereitung</option>
                            <option value="fertig" ${this.normalizeStatus(order.status) === "fertig" ? "selected" : ""}>fertig</option>
                            <option value="abgelehnt" ${this.normalizeStatus(order.status) === "abgelehnt" ? "selected" : ""}>abgelehnt</option>
                        </select>
                        <button onclick="this.style.display='none'; updateOrderStatus('${orderId}', this.previousElementSibling.value)" class="btn-small" style="display:none; margin-left:8px;">Speichern</button>
                    </p>
                    <div style="margin-top: 12px;">
                        <button class="btn-small" onclick="archiveOrder('${orderId}')">Archivieren</button>
                        <button class="btn-small" onclick="sendStatusEmail('${orderId}', '${customerEmail}', '${escapeHtml(customerName)}', '${order.status}', '${size}', '${extras}', '${price}')" ${!customerEmail ? "disabled" : ""}>E-Mail senden</button>
                        <button class="btn-small danger-btn" onclick="deleteOrder('${orderId}')">Löschen</button>
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

    // Parse wunschtermin from different stored formats and return Date or null
    parseDesiredDate(order) {
        try {
            if (!order) return null;
            // Newer format: order.wunschtermin.datum may be a Firestore Timestamp or string
            if (order.wunschtermin && order.wunschtermin.datum) {
                const d = order.wunschtermin.datum;
                if (d && typeof d.toDate === 'function') {
                    return d.toDate();
                }
                // string like 'YYYY-MM-DD'
                const parsed = new Date(d);
                if (!isNaN(parsed)) return parsed;
            }

            // Older/alternate: order.wunschtermin may be a plain string
            if (order.wunschtermin && typeof order.wunschtermin === 'string') {
                const parsed = new Date(order.wunschtermin);
                if (!isNaN(parsed)) return parsed;
            }

            return null;
        } catch (err) {
            console.warn('parseDesiredDate error', err);
            return null;
        }
    }

    // Format wunschtermin for compact display (e.g., '20.09.2025' or 'Nicht angegeben')
    formatDesiredDate(order) {
        const d = this.parseDesiredDate(order);
        if (!d) return 'Kein Wunschtermin';
        try {
            return d.toLocaleDateString('de-DE');
        } catch (e) {
            return d.toISOString().split('T')[0];
        }
    }

    // Normalisiere Statuswerte (unterstützt Legacy-Varianten)
    normalizeStatus(rawStatus) {
        if (!rawStatus) return rawStatus;
        const s = String(rawStatus).trim().toLowerCase();

        // Mapping für bekannte Legacy-Varianten
        const mapping = {
            'in-bearbeitung': 'in Vorbereitung',
            'in_bearbeitung': 'in Vorbereitung',
            'inbearbeitung': 'in Vorbereitung',
            'invorbereitung': 'in Vorbereitung',
            'in vorbereitung': 'in Vorbereitung',
            'in vorbereitunG': 'in Vorbereitung'
        };

        if (mapping[s]) return mapping[s];

        // Wenn bereits der korrekte canonical-string in lower-case vorliegt
        if (s === 'neu' || s === 'angenommen' || s === 'in vorbereitung' || s === 'fertig' || s === 'abgelehnt' || s === 'in vorbereitung') {
            // return in proper casing
            if (s === 'in vorbereitung' || s === 'invorbereitung') return 'in Vorbereitung';
            return s === 'neu' ? 'neu' : s === 'angenommen' ? 'angenommen' : s === 'fertig' ? 'fertig' : s === 'abgelehnt' ? 'abgelehnt' : s;
        }

        // Default: Capitalize first letter (best effort)
        return rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
    }

    // Bestellungen laden und anzeigen
    async loadOrders() {
        try {
            console.log('OrderManager: Lade Bestellungen...');
            showLoading('ordersList', 'Lade Bestellungen...');

            if (!this.db) {
                console.error('OrderManager: Firestore nicht initialisiert!');
                document.getElementById('ordersList').innerHTML = '<p style="color: red;">Fehler: Firebase nicht initialisiert!</p>';
                return;
            }

            // Teste Firebase-Verbindung
            console.log('OrderManager: Teste Firebase-Verbindung...');

            // Vereinfachte Abfrage ohne Composite Index
            // Erst alle aktiven Bestellungen laden, dann clientseitig filtern und sortieren
            const ordersSnapshot = await this.db
                .collection("orders")
                .orderBy("created", "desc")
                .get();

            console.log('OrderManager: Datenbankabfrage abgeschlossen. Anzahl Dokumente:', ordersSnapshot.size);

            if (ordersSnapshot.empty) {
                console.log('OrderManager: Keine Bestellungen in der Datenbank gefunden');
                document.getElementById('ordersList').innerHTML = '<p>Keine Bestellungen vorhanden.</p>';
                return;
            }

            // Clientseitig filtern und sortieren
            const activeOrders = ordersSnapshot.docs
                .filter(doc => {
                    const order = doc.data();
                    return order.status !== "archiviert";
                })
                .sort((a, b) => {
                    const orderA = a.data();
                    const orderB = b.data();

                    // Erst nach Status sortieren (neue Bestellungen zuerst)
                    const statusPriority = {
                        "neu": 0,
                        "in Vorbereitung": 1,
                        "fertig": 2
                    };

                    const priorityA = statusPriority[orderA.status] ?? 999;
                    const priorityB = statusPriority[orderB.status] ?? 999;

                    if (priorityA !== priorityB) {
                        return priorityA - priorityB;
                    }

                    // Wenn beide gleich priorisiert sind und es sich um neue Bestellungen handelt,
                    // sortiere nach Wunschtermin (früheste zuerst) damit die frühesten Wunschtermine oben stehen.
                    if (priorityA === 0 && priorityB === 0) {
                        const desiredA = this.parseDesiredDate(orderA);
                        const desiredB = this.parseDesiredDate(orderB);

                        // Treat missing desired date as far future so ones with dates come first
                        const farFuture = new Date(8640000000000000);
                        const aTime = desiredA ? desiredA.getTime() : farFuture.getTime();
                        const bTime = desiredB ? desiredB.getTime() : farFuture.getTime();
                        if (aTime !== bTime) return aTime - bTime; // earliest first
                        // Fallback to created (newest first)
                        const dateA = orderA.created ? new Date(orderA.created) : new Date(0);
                        const dateB = orderB.created ? new Date(orderB.created) : new Date(0);
                        return dateB - dateA;
                    }

                    // Bei gleichem Status: nach Datum sortieren (neuste zuerst)
                    const dateA = orderA.created ? new Date(orderA.created) : new Date(0);
                    const dateB = orderB.created ? new Date(orderB.created) : new Date(0);
                    return dateB - dateA;
                });

            console.log('OrderManager: Gefilterte aktive Bestellungen:', activeOrders.length);

            let html = "";
            for (const doc of activeOrders) {
                const order = doc.data();
                console.log('OrderManager: Verarbeite Bestellung:', doc.id, order);
                html += await this.renderOrder(doc, order);
            }

            document.getElementById('ordersList').innerHTML = html;
            console.log('OrderManager: Bestellungen erfolgreich geladen und angezeigt');
        } catch (error) {
            console.error("OrderManager: Fehler beim Laden der Bestellungen:", error);
            document.getElementById('ordersList').innerHTML = '<p style="color: red;">Fehler beim Laden der Bestellungen: ' + error.message + '</p>';
        }
    }

    // Status einer Bestellung aktualisieren
    async updateOrderStatus(orderId, newStatus) {
        try {
            const normalized = this.normalizeStatus(newStatus);
            await this.db.collection("orders").doc(orderId).update({
                status: normalized,
                updated: new Date().toISOString()
            });

            showNotification(`Bestellstatus auf "${normalized}" geändert`, "success");
            this.loadOrders(); // Liste neu laden
        } catch (error) {
            console.error("Fehler beim Aktualisieren des Status:", error);
            showNotification("Fehler beim Speichern des Status", "error");
        }
    }

    // Anlass-Display-Namen
    getOccasionDisplayName(occasion) {
        const occasionNames = {
            'geburtstag': 'Geburtstag',
            'hochzeit': 'Hochzeit',
            'jahrestag': 'Jahrestag / Jubiläum',
            'taufe': 'Taufe / Kommunion / Konfirmation',
            'abschluss': 'Abschluss / Erfolg',
            'firmung': 'Firmung / Geschäftlich',
            'valentinstag': 'Valentinstag',
            'muttertag': 'Muttertag / Vatertag',
            'weihnachten': 'Weihnachten',
            'ostern': 'Ostern',
            'party': 'Party / Feier',
            'sonstiges': 'Sonstiges'
        };
        return occasionNames[occasion] || occasion;
    }
}

// Expose constructor for test helpers (non-breaking)
if (typeof window.OrderManager === 'undefined' && typeof OrderManager !== 'undefined') {
    window.OrderManager = OrderManager;
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