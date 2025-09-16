// order.js - Bestellformular-Funktionalität

class OrderManager {
    constructor() {
        this.db = null;
        this.prices = {};
        this.init();
    }

    async init() {
        // Firebase initialisieren
        this.db = initializeFirebase();

        // EmailJS initialisieren für Admin-Benachrichtigungen
        if (typeof emailjs !== 'undefined' && window.emailConfig) {
            emailjs.init(window.emailConfig.publicKey);
            console.log('EmailJS für Bestellformular initialisiert');
        }

        // Preise aus Konfiguration laden
        this.loadPrices();

        // HTML aktualisieren
        this.updatePricesInHTML();

        // Event-Listener setzen
        this.setupEventListeners();

        // Initial-Zustand setzen
        this.initializeForm();

        // Vorlaufzeit-Info anzeigen
        this.checkOrderDeadline();
    }

    async checkOrderDeadline() {
        // Warten bis OrderDeadlineManager verfügbar ist
        if (window.orderLimitManager && typeof window.orderLimitManager.showDeadlineInfo === 'function') {
            await window.orderLimitManager.showDeadlineInfo();
            // Kalender-Mindestdatum setzen
            window.orderLimitManager.setCalendarMinDate();
        } else {
            // Retry nach kurzer Verzögerung
            setTimeout(() => {
                if (window.orderLimitManager && typeof window.orderLimitManager.showDeadlineInfo === 'function') {
                    window.orderLimitManager.showDeadlineInfo();
                    window.orderLimitManager.setCalendarMinDate();
                }
            }, 500);
        }
    }

    loadPrices() {
        this.prices = {
            tiers: {
                mini: window.priceConfig.tiers.mini.price,
                normal: window.priceConfig.tiers.normal.price,
                gross: window.priceConfig.tiers.gross.price,
            },
            extras: Object.fromEntries(
                Object.entries(window.priceConfig.extras).map(([key, value]) => [
                    key,
                    value.price,
                ])
            ),
            lieferung: Object.fromEntries(
                Object.entries(window.priceConfig.lieferung).map(([key, value]) => [
                    key,
                    value.price,
                ])
            ),
        };
    }

    updatePricesInHTML() {
        // Extras aktualisieren
        Object.entries(window.priceConfig.extras).forEach(([key, config]) => {
            const checkbox = document.querySelector(`input[value="${key}"]`);
            if (checkbox && checkbox.parentElement) {
                const label = checkbox.parentElement;
                if (key === "mehrstoeckig") {
                    label.innerHTML = `<input type="checkbox" name="extras" value="${key}" id="mehrstoeckigCheckbox" /> ${config.label} (+${config.price}&nbsp;€)`;
                } else {
                    label.innerHTML = `<input type="checkbox" name="extras" value="${key}" /> ${config.label} (+${config.price}&nbsp;€)`;
                }
            }
        });

        // Lieferungsoptionen aktualisieren
        Object.entries(window.priceConfig.lieferung).forEach(([key, config]) => {
            const radio = document.querySelector(`input[value="${key}"]`);
            if (radio && radio.parentElement) {
                const label = radio.parentElement;
                label.innerHTML = `<input type="radio" name="lieferung" value="${key}" /> ${config.label} (+${config.price}&nbsp;€)`;
            }
        });

        // Durchmesser-Bereich aktualisieren
        const diameterInput = document.getElementById("diameter");
        if (diameterInput) {
            diameterInput.min = window.priceConfig.diameter.min;
            diameterInput.max = window.priceConfig.diameter.max;
        }

        const diameterLabel = document.querySelector('label[for="diameter"]');
        if (diameterLabel) {
            diameterLabel.textContent = `Gewünschter Durchmesser in cm (${window.priceConfig.diameter.min}–${window.priceConfig.diameter.max}):`;
        }
    }

    deriveTierFromCm(cm) {
        if (!cm) return null;
        const n = Number(cm);

        const config = window.priceConfig.tiers;
        if (n >= config.mini.minCm && n <= config.mini.maxCm) return "mini";
        if (n >= config.normal.minCm && n <= config.normal.maxCm) return "normal";
        if (n >= config.gross.minCm && n <= config.gross.maxCm) return "gross";
        return null;
    }

    updateSizeUI() {
        const cm = document.getElementById("diameter").value;
        const tier = this.deriveTierFromCm(cm);
        const sizeLabel = document.getElementById("sizeLabel");
        const sizePrice = document.getElementById("sizePrice");

        if (!tier) {
            sizeLabel.textContent = "–";
            sizePrice.textContent = "–";
        } else {
            const config = window.priceConfig.tiers[tier];
            sizeLabel.textContent = config.label;
            sizePrice.textContent = config.price + " €";
        }
    }

    calculateSum() {
        let sum = 0;
        const f = document.forms.orderForm;
        const cm = f.diameter.value;
        const tier = this.deriveTierFromCm(cm);

        if (tier) sum += this.prices.tiers[tier];

        // Lieferung
        if (f.lieferung.value) {
            sum += this.prices.lieferung[f.lieferung.value] || 0;
        }

        // Extras
        const extrasInputs = f.extras
            ? f.extras.length
                ? Array.from(f.extras)
                : [f.extras]
            : [];

        extrasInputs.forEach((e) => {
            if (e && e.checked) {
                if (e.value === "mehrstoeckig") {
                    const numberOfTiers = parseInt(f.numberOfTiers.value) || 2;
                    const zusaetzlicheStockwerke = numberOfTiers - 1;
                    const mehrstoeckigPrice = zusaetzlicheStockwerke * this.prices.extras.mehrstoeckig;
                    sum += mehrstoeckigPrice;
                } else {
                    sum += this.prices.extras[e.value] || 0;
                }
            }
        });

        const sumDisplay = document.getElementById("orderSum");
        sumDisplay.textContent = sum ? `Gesamt: ${sum} €` : "";
        return sum;
    }

    toggleDeliveryFields() {
        const lieferung = document.querySelector('input[name="lieferung"]:checked');
        const show = lieferung && lieferung.value !== "";
        const deliveryFields = document.getElementById("deliveryFields");

        deliveryFields.style.display = show ? "" : "none";
        document.getElementById("strasse").required = show;
        document.getElementById("plz").required = show;
        document.getElementById("ort").required = show;
    }

    toggleTiersSelection() {
        const mehrstoeckigCheckbox = document.getElementById("mehrstoeckigCheckbox");
        const tiersSelection = document.getElementById("tiersSelection");
        const numberOfTiersSelect = document.getElementById("numberOfTiers");

        if (mehrstoeckigCheckbox && mehrstoeckigCheckbox.checked) {
            tiersSelection.style.display = "block";
            numberOfTiersSelect.required = true;
        } else {
            tiersSelection.style.display = "none";
            if (numberOfTiersSelect) {
                numberOfTiersSelect.required = false;
                numberOfTiersSelect.value = "2";
            }
        }
    }

    setupEventListeners() {
        const orderForm = document.getElementById("orderForm");
        const wunschDatumInput = document.getElementById("wunschDatum");

        // Form change events
        orderForm.addEventListener("change", (e) => {
            if (e.target.name === "lieferung") this.toggleDeliveryFields();
            if (e.target.id === "diameter") this.updateSizeUI();
            if (e.target.id === "mehrstoeckigCheckbox") this.toggleTiersSelection();
            if (e.target.id === "numberOfTiers") this.calculateSum();
            if (e.target.id === "wunschDatum") this.checkDateAvailability(e.target.value);
            this.calculateSum();
        });

        // Form submit
        orderForm.addEventListener("submit", (e) => this.handleSubmit(e));
    }

    // Verfügbarkeit des gewählten Datums prüfen
    async checkDateAvailability(dateString) {
        if (!dateString || !window.orderLimitManager) return;

        console.log(`OrderManager: Prüfe Vorlaufzeit für ${dateString}`);

        try {
            const status = await window.orderLimitManager.canAcceptOrder(dateString);

            const wunschDatumInput = document.getElementById("wunschDatum");
            const dateWarning = document.getElementById("dateWarning") || this.createDateWarningElement();

            if (!status.canAccept && status.isDateTooEarly) {
                // Datum ist zu früh (weniger als 7 Tage Vorlaufzeit)
                wunschDatumInput.style.borderColor = "#f44336";
                dateWarning.innerHTML = `
                    <strong>⚠️ Zu kurzfristig:</strong> 
                    ${new Date(dateString).toLocaleDateString('de-DE')} ist zu früh. 
                    Mindestens ${window.orderLimitManager.minimumLeadDays} Tage Vorlaufzeit erforderlich.
                    <br><small>Frühestmöglicher Termin: <strong>${new Date(status.minimumDate).toLocaleDateString('de-DE')}</strong>
                    <button onclick="showAvailabilityCalendar()" style="background: none; border: none; color: var(--clr-accent); text-decoration: underline; cursor: pointer;">Kalender öffnen</button></small>
                `;
                dateWarning.style.display = "block";
                dateWarning.className = "date-warning error";
            } else if (status.canAccept) {
                // Datum ist verfügbar
                wunschDatumInput.style.borderColor = "#4caf50";
                dateWarning.innerHTML = `
                    <strong>📅 Wenige Plätze verfügbar:</strong> 
                    Für ${new Date(dateString).toLocaleDateString('de-DE')} sind noch 
                    ${status.remaining} von ${status.limit} Plätzen frei.
                `;
                dateWarning.style.display = "block";
                dateWarning.className = "date-warning warning";
            } else {
                // Datum ist verfügbar
                wunschDatumInput.style.borderColor = "#4caf50";
                dateWarning.innerHTML = `
                    <strong>✅ Datum verfügbar:</strong> 
                    ${new Date(dateString).toLocaleDateString('de-DE')} ist verfügbar 
                    (${status.remaining} von ${status.limit} Plätzen frei).
                `;
                dateWarning.style.display = "block";
                dateWarning.className = "date-warning success";

                // Nach 3 Sekunden ausblenden wenn alles okay ist
                setTimeout(() => {
                    if (dateWarning.className === "date-warning success") {
                        dateWarning.style.display = "none";
                        wunschDatumInput.style.borderColor = "";
                    }
                }, 3000);
            }
        } catch (error) {
            console.error("Fehler bei Datumsprüfung:", error);
        }
    }

    // Erstelle Warning-Element für Datumsfeedback
    createDateWarningElement() {
        const wunschDatumInput = document.getElementById("wunschDatum");
        const dateWarning = document.createElement("div");
        dateWarning.id = "dateWarning";
        dateWarning.style.cssText = `
            margin-top: 8px;
            padding: 10px;
            border-radius: 6px;
            font-size: 0.9rem;
            line-height: 1.4;
            display: none;
        `;

        // Nach dem Datum-Input einfügen
        wunschDatumInput.parentNode.insertBefore(dateWarning, wunschDatumInput.nextSibling);

        // CSS für verschiedene Warning-Typen
        const style = document.createElement("style");
        style.textContent = `
            .date-warning.error {
                background: #ffebee;
                border: 1px solid #f44336;
                color: #c62828;
            }
            .date-warning.warning {
                background: #fff3e0;
                border: 1px solid #ff9800;
                color: #e65100;
            }
            .date-warning.success {
                background: #e8f5e8;
                border: 1px solid #4caf50;
                color: #2e7d32;
            }
            .date-warning a {
                color: inherit;
                text-decoration: underline;
            }
        `;
        document.head.appendChild(style);

        return dateWarning;
    }

    initializeForm() {
        this.toggleDeliveryFields();
        this.toggleTiersSelection();
        this.updateSizeUI();
        this.calculateSum();

        // Setze Minimum-Datum auf heute
        const heute = new Date().toISOString().split("T")[0];
        document.getElementById("wunschDatum").min = heute;

        // Datum aus URL-Parameter übernehmen (falls vom Kalender weitergeleitet)
        const urlParams = new URLSearchParams(window.location.search);
        const dateParam = urlParams.get('date');

        if (dateParam) {
            const targetDate = new Date(dateParam);
            if (!isNaN(targetDate.getTime()) && dateParam >= heute) {
                document.getElementById("wunschDatum").value = dateParam;
                showNotification(`Datum ${targetDate.toLocaleDateString('de-DE')} aus Kalender übernommen`, 'success');
            }
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const f = e.target;

        try {
            // 1. Erst Vorlaufzeit prüfen
            if (window.orderLimitManager) {
                const canOrder = await window.orderLimitManager.validateOrderSubmission();
                if (!canOrder) {
                    return; // Bestellung wird durch Vorlaufzeit-Modal blockiert
                }
            }

            // 2. Validierung
            if (!this.validateForm(f)) {
                return;
            }

            // 3. Extras sammeln
            const extras = this.collectExtras(f);

            // Anzahl Stockwerke erfassen
            let numberOfTiers = null;
            if (extras.includes("mehrstoeckig")) {
                numberOfTiers = parseInt(f.numberOfTiers.value) || 2;
            }

            const cm = Number(f.diameter.value);
            const tier = this.deriveTierFromCm(cm);
            const gesamtpreis = this.calculateSum();

            // Kundendaten
            const customerData = {
                name: f.name.value,
                street: f.strasse ? f.strasse.value : "",
                plz: f.plz ? f.plz.value : "",
                city: f.ort ? f.ort.value : "",
                telefon: f.telefon.value,
                email: f.email.value,
            };

            // Kunde speichern/finden
            const customerId = await this.saveCustomer(customerData);

            // Bestellung speichern
            const order = {
                customerId,
                // Kundendaten direkt in die Bestellung für Admin-Kalender
                name: customerData.name,
                email: customerData.email,
                telefon: customerData.telefon,
                details: {
                    durchmesserCm: cm,
                    kategorie: tier,
                    extras: extras,
                    numberOfTiers: numberOfTiers,
                    lieferung: f.lieferung.value,
                },
                wunschtermin: {
                    datum: f.wunschDatum.value,
                    uhrzeit: f.wunschUhrzeit.value || null,
                },
                anlass: f.occasion ? f.occasion.value : null,
                gesamtpreis: gesamtpreis,
                adresse: this.getDeliveryAddress(f),
                status: "neu",
                created: new Date().toISOString(),
            };

            await this.db.collection("orders").add(order);

            // Admin-Benachrichtigung senden (falls verfügbar)
            try {
                if (window.emailjs && window.emailConfig) {
                    const adminNotification = {
                        to_email: window.emailConfig.adminNotifications.adminEmail,
                        to_name: "Admin",
                        customer_name: customerData.name || "Unbekannt",
                        customer_email: customerData.email || "Nicht angegeben",
                        customer_phone: customerData.telefon || "Nicht angegeben",
                        order_date: new Date().toLocaleString("de-DE"),
                        order_timestamp: new Date().toLocaleString("de-DE"),
                        order_size: order.details && order.details.durchmesserCm
                            ? `${order.details.durchmesserCm} cm`
                            : "Nicht spezifiziert",
                        cake_size: order.details && order.details.durchmesserCm
                            ? `${order.details.durchmesserCm} cm`
                            : "Nicht spezifiziert",
                        order_extras: order.details && order.details.extras
                            ? order.details.extras.join(", ")
                            : "Keine",
                        extras: order.details && order.details.extras
                            ? order.details.extras.join(", ")
                            : "Keine",
                        delivery_type: order.details && order.details.lieferung
                            ? order.details.lieferung === "abholung"
                                ? "Abholung"
                                : `Lieferung: ${order.details.lieferung}`
                            : "Abholung",
                        delivery: order.details && order.details.lieferung
                            ? order.details.lieferung === "abholung"
                                ? "Abholung"
                                : `Lieferung: ${order.details.lieferung}`
                            : "Abholung",
                        total_price: order.gesamtpreis ? `${order.gesamtpreis}` : "Nicht berechnet",
                        wunschtermin: order.wunschtermin && order.wunschtermin.datum
                            ? new Date(order.wunschtermin.datum).toLocaleDateString("de-DE")
                            : "Nicht angegeben",
                        desired_date: order.wunschtermin && order.wunschtermin.datum
                            ? new Date(order.wunschtermin.datum).toLocaleDateString("de-DE")
                            : "Nicht angegeben",
                        customer_address: this.getDeliveryAddressString(f) || "Abholung",
                        order_notes: "", // Kein Notizen-Feld im Formular
                        admin_dashboard_url: window.location.origin + "/admin.html",
                        order_id: new Date().getTime().toString() // Temporäre ID
                    };

                    console.log("📧 Admin-Benachrichtigung wird gesendet mit folgenden Daten:", adminNotification);

                    await emailjs.send(
                        window.emailConfig.serviceId,
                        window.emailConfig.templates.new_order_notification,
                        adminNotification,
                        window.emailConfig.publicKey
                    );
                    console.log("✅ Admin-Email-Benachrichtigung für neue Bestellung gesendet");
                } else {
                    console.warn("EmailJS oder Email-Config nicht verfügbar für Admin-Benachrichtigung");
                }
            } catch (emailError) {
                console.error("Fehler beim Senden der Admin-Email:", emailError);
                // Bestellung wurde trotzdem gespeichert - Email-Fehler nicht kritisch
            }

            this.showSuccess();
            this.resetForm(f);

        } catch (err) {
            console.error('Fehler beim Speichern der Bestellung:', err);
            this.showError();
        }
    }

    validateForm(f) {
        // Datum validieren
        const wunschDatum = f.wunschDatum.value;
        const heute = new Date().toISOString().split("T")[0];

        if (wunschDatum < heute) {
            showNotification("Das gewünschte Datum kann nicht in der Vergangenheit liegen.", "error");
            return false;
        }

        // E-Mail validieren
        if (!isValidEmail(f.email.value)) {
            showNotification("Bitte geben Sie eine gültige E-Mail-Adresse ein.", "error");
            return false;
        }

        // Telefon validieren
        if (!isValidPhone(f.telefon.value)) {
            showNotification("Bitte geben Sie eine gültige Telefonnummer ein.", "error");
            return false;
        }

        return true;
    }

    collectExtras(f) {
        const extras = f.extras
            ? f.extras.length
                ? Array.from(f.extras).filter((e) => e.checked).map((e) => e.value)
                : f.extras.checked ? [f.extras.value] : []
            : [];
        return extras;
    }

    async saveCustomer(customerData) {
        // Existierenden Kunden suchen
        const snap = await this.db
            .collection("customers")
            .where("email", "==", customerData.email)
            .limit(1)
            .get();

        if (!snap.empty) {
            // Kunden aktualisieren
            const customerId = snap.docs[0].id;
            await this.db
                .collection("customers")
                .doc(customerId)
                .set(customerData, { merge: true });
            return customerId;
        } else {
            // Neuen Kunden anlegen
            const custRef = await this.db.collection("customers").add(customerData);
            return custRef.id;
        }
    }

    getDeliveryAddress(f) {
        if (f.lieferung.value !== "") {
            return {
                street: f.strasse.value,
                plz: f.plz.value,
                city: f.ort.value,
            };
        }
        return null;
    }

    getDeliveryAddressString(f) {
        if (f.lieferung.value !== "" && f.lieferung.value !== "abholung") {
            const street = f.strasse?.value || "";
            const plz = f.plz?.value || "";
            const city = f.ort?.value || "";

            if (street || plz || city) {
                return `${street}, ${plz} ${city}`.replace(/^,\s*/, '').replace(/\s*,\s*$/, '');
            }
        }
        return "Abholung";
    }

    showSuccess() {
        document.getElementById("orderSuccess").style.display = "block";
        document.getElementById("orderError").style.display = "none";
    }

    showError() {
        document.getElementById("orderSuccess").style.display = "none";
        document.getElementById("orderError").style.display = "block";
    }

    resetForm(f) {
        f.reset();
        this.updateSizeUI();
        document.getElementById("orderSum").textContent = "";
        this.toggleDeliveryFields();
    }
}

// Initialisierung wenn DOM geladen ist
document.addEventListener("DOMContentLoaded", function () {
    new OrderManager();
});