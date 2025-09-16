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

        // Preise aus Konfiguration laden
        this.loadPrices();

        // HTML aktualisieren
        this.updatePricesInHTML();

        // Event-Listener setzen
        this.setupEventListeners();

        // Initial-Zustand setzen
        this.initializeForm();
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

        // Form change events
        orderForm.addEventListener("change", (e) => {
            if (e.target.name === "lieferung") this.toggleDeliveryFields();
            if (e.target.id === "diameter") this.updateSizeUI();
            if (e.target.id === "mehrstoeckigCheckbox") this.toggleTiersSelection();
            if (e.target.id === "numberOfTiers") this.calculateSum();
            this.calculateSum();
        });

        // Form submit
        orderForm.addEventListener("submit", (e) => this.handleSubmit(e));
    }

    initializeForm() {
        this.toggleDeliveryFields();
        this.toggleTiersSelection();
        this.updateSizeUI();
        this.calculateSum();

        // Setze Minimum-Datum auf heute
        const heute = new Date().toISOString().split("T")[0];
        document.getElementById("wunschDatum").min = heute;
    }

    async handleSubmit(e) {
        e.preventDefault();
        const f = e.target;

        try {
            // Validierung
            if (!this.validateForm(f)) {
                return;
            }

            // Extras sammeln
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
                gesamtpreis: gesamtpreis,
                adresse: this.getDeliveryAddress(f),
                status: "neu",
                created: new Date().toISOString(),
            };

            await this.db.collection("orders").add(order);

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