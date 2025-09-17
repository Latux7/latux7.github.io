// order.js - Bestellformular-Funktionalität

class OrderManager {
    constructor() {
        this.db = null;
        this.prices = {};
        // expose instance for other scripts to call into (safe helper)
        window.orderManager = this;
        this.init();
    }

    async init() {
        // Firebase initialisieren
        this.db = initializeFirebase();

        // EmailJS initialisieren für Admin-Benachrichtigungen
        if (typeof emailjs !== 'undefined' && window.emailConfig) {
            emailjs.init(window.emailConfig.publicKey);
            // EmailJS initialized for order form
        }

        // Preise aus Konfiguration laden
        this.loadPrices();

        // HTML aktualisieren
        this.updatePricesInHTML();

        // Event-Listener setzen
        this.setupEventListeners();

        // Initial-Zustand setzen
        this.initializeForm();

        // Bind delivery radio change to a small UI hint flash
        this.bindDeliveryHintFlash();

        // Vorlaufzeit-Info anzeigen
        this.checkOrderDeadline();
    }

    bindDeliveryHintFlash() {
        const hidden = document.getElementById('lieferung');
        const info = document.getElementById('selectedDeliveryInfo');
        if (!hidden || !info) return;

        hidden.addEventListener('lieferungchange', () => {
            info.style.transition = 'background 0.3s ease';
            const old = info.style.background;
            info.style.background = 'rgba(255, 249, 196, 0.9)';
            setTimeout(() => { info.style.background = old; }, 900);
        });
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

        // Lieferungsoptionen: wir verwenden jetzt den Kalender zur Auswahl.
        // Aktualisiere die lesbare Anzeige im #selectedDeliveryInfo mit verfügbaren Optionen und Preisen
        const selectedInfo = document.getElementById('selectedDeliveryInfo');
        if (selectedInfo) {
            const parts = Object.entries(window.priceConfig.lieferung).map(([key, config]) => {
                return `${config.label} (+${config.price} €)`;
            });
            selectedInfo.innerHTML = selectedInfo.innerHTML || 'Keine Lieferung ausgewählt (Standard: Abholung). Wählen Sie im Kalender Datum und Lieferart.';
            // append small helper explaining delivery pricing
            const help = `<div style="margin-top:6px; font-size:0.9rem; color:var(--clr-muted);">Lieferoptionen: ${parts.join(' • ')}</div>`;
            // Avoid duplicating the help text
            if (!selectedInfo.dataset.priceset) {
                selectedInfo.insertAdjacentHTML('beforeend', help);
                selectedInfo.dataset.priceset = '1';
            }
        }

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
        // Update availability of the "mehrstoeckig" option depending on chosen size
        try {
            this.updateMehrstoeckigAvailability();
        } catch (e) {
            console.warn('updateMehrstoeckigAvailability failed', e);
        }
    }

    // Enable the "mehrstoeckig" option only for "gross" cakes (largest tier)
    updateMehrstoeckigAvailability() {
        const cmInput = document.getElementById('diameter');
        if (!cmInput) return;
        const cm = Number(cmInput.value) || 0;
        const tier = this.deriveTierFromCm(cm);

        const mehrCheckbox = document.getElementById('mehrstoeckigCheckbox');
        const tiersSelection = document.getElementById('tiersSelection');
        if (!mehrCheckbox) return;

        if (tier === 'gross') {
            // Enable the option
            mehrCheckbox.disabled = false;
            // Remove explanatory note if present
            mehrCheckbox.title = '';
        } else {
            // Disable and uncheck the option if size is too small
            mehrCheckbox.checked = false;
            mehrCheckbox.disabled = true;
            mehrCheckbox.title = 'Mehrstöckig nur bei Größe Groß verfügbar';

            // Hide tiers selection UI and reset to default
            if (tiersSelection) {
                tiersSelection.style.display = 'none';
                const numberOfTiersSelect = document.getElementById('numberOfTiers');
                if (numberOfTiersSelect) {
                    numberOfTiersSelect.required = false;
                    numberOfTiersSelect.value = '2';
                }
            }
        }
        // Recalculate price in case mehrstoeckig was unchecked
        this.calculateSum();
    }

    calculateSum() {
        let sum = 0;
        const f = document.forms.orderForm;
        const cm = f.diameter.value;
        const tier = this.deriveTierFromCm(cm);

        if (tier) sum += this.prices.tiers[tier];

        // Lieferung - use hidden #lieferung if present, otherwise fallback to form radios
        const deliveryVal = this.getSelectedDeliveryValue(f);
        if (deliveryVal) {
            sum += this.prices.lieferung[deliveryVal] || 0;
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

        // Update prominent badge(s) if present (we no longer use the old orderSum text)
        const badge = document.getElementById('orderTotalBadgeAmount');
        const badgeFloating = document.getElementById('orderTotalBadgeFloatingAmount');
        const badgeContainer = document.getElementById('orderTotalBadge');
        const badgeFloatingContainer = document.getElementById('orderTotalBadgeFloating');
        const newText = sum ? `${sum} €` : '— €';
        if (badge) {
            const prev = badge.textContent;
            badge.textContent = newText;
            // pulse when changed
            if (prev !== newText && badgeContainer) {
                badgeContainer.classList.remove('pulse');
                // force reflow
                // eslint-disable-next-line no-unused-expressions
                badgeContainer.offsetWidth;
                badgeContainer.classList.add('pulse');
                setTimeout(() => badgeContainer.classList.remove('pulse'), 350);
            }
        }
        if (badgeFloating) {
            const prevF = badgeFloating.textContent;
            badgeFloating.textContent = newText;
            if (prevF !== newText && badgeFloatingContainer) {
                badgeFloatingContainer.classList.remove('pulse');
                // force reflow
                // eslint-disable-next-line no-unused-expressions
                badgeFloatingContainer.offsetWidth;
                badgeFloatingContainer.classList.add('pulse');
                setTimeout(() => badgeFloatingContainer.classList.remove('pulse'), 350);
            }
        }
        if (badgeContainer) {
            badgeContainer.classList.toggle('empty', !sum);
        }
        if (badgeFloatingContainer) {
            badgeFloatingContainer.classList.toggle('empty', !sum);
        }
        return sum;
    }

    toggleDeliveryFields() {
        const hidden = document.getElementById('lieferung');
        const show = hidden && hidden.value !== "";
        const deliveryFields = document.getElementById("deliveryFields");

        if (deliveryFields) {
            deliveryFields.style.display = show ? "" : "none";
        }

        const strasse = document.getElementById("strasse");
        if (strasse) strasse.required = show;

        const plz = document.getElementById("plz");
        if (plz) plz.required = show;

        const ort = document.getElementById("ort");
        if (ort) ort.required = show;
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

        if (!orderForm) {
            // If the order form isn't present on the page (some pages include order.js globally),
            // don't attach listeners and fail gracefully.
            console.warn('OrderManager: #orderForm not found - skipping event listener setup');
            return;
        }

        // Form change events
        orderForm.addEventListener("change", (e) => {
            try {
                // We now use a hidden field #lieferung - listen for that custom event elsewhere
                if (e.target.name === "lieferung") this.toggleDeliveryFields();
                if (e.target.id === "diameter") this.updateSizeUI();
                if (e.target.id === "mehrstoeckigCheckbox") this.toggleTiersSelection();
                if (e.target.id === "numberOfTiers") this.calculateSum();
                if (e.target.id === "wunschDatum") this.checkDateAvailability(e.target.value);
                this.calculateSum();
            } catch (err) {
                console.error('OrderManager: Fehler in change-handler', err);
            }
        });

        // Listen to the hidden delivery field custom event to toggle fields and recalc price
        const hidden = document.getElementById('lieferung');
        if (hidden) {
            hidden.addEventListener('lieferungchange', () => {
                try {
                    this.toggleDeliveryFields();
                    this.calculateSum();
                } catch (e) { console.warn('Error handling lieferungchange', e); }
            });
        }

        // Form submit
        orderForm.addEventListener("submit", (e) => {
            try {
                this.handleSubmit(e);
            } catch (err) {
                console.error('OrderManager: Fehler in submit-handler', err);
            }
        });
    }

    // Verfügbarkeit des gewählten Datums prüfen
    async checkDateAvailability(dateString) {
        if (!dateString || !window.orderLimitManager) return;

        // Clear any previous date warning immediately to avoid stale messages
        try {
            const dateWarning = document.getElementById('dateWarning');
            if (dateWarning) {
                dateWarning.style.display = 'none';
                dateWarning.className = '';
            }
            const wunschDatumInput = document.getElementById('wunschDatum');
            if (wunschDatumInput) wunschDatumInput.style.borderColor = '';
        } catch (e) {
            // ignore
        }

        // Check lead time and capacity for selected date

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
                    Mindestens ${status.minimumLeadDays || 7} Tage Vorlaufzeit erforderlich.
                    <br><small>Frühestmöglicher Termin: <strong>${new Date(status.minimumDate).toLocaleDateString('de-DE')}</strong>
                    <button onclick="showAvailabilityCalendar()" style="background: none; border: none; color: var(--clr-accent); text-decoration: underline; cursor: pointer;">Kalender öffnen</button></small>
                `;
                dateWarning.style.display = "block";
                dateWarning.className = "date-warning error";
            } else if (!status.canAccept && status.isCapacityFull) {
                // Kapazität ist voll
                wunschDatumInput.style.borderColor = "#ff8c00";
                dateWarning.innerHTML = `
                    <strong>🚫 Ausgebucht:</strong> 
                    ${new Date(dateString).toLocaleDateString('de-DE')} ist bereits voll belegt.
                    <br><small>Bestellungen: <strong>${status.ordersCount}/${status.maxOrders}</strong> - 
                    <button onclick="showAvailabilityCalendar()" style="background: none; border: none; color: var(--clr-accent); text-decoration: underline; cursor: pointer;">Andere Termine anzeigen</button></small>
                `;
                dateWarning.style.display = "block";
                dateWarning.className = "date-warning warning";
            } else if (status.canAccept) {
                // Prüfen ob die aktuell gewählte Lieferart zur gewählten Datum passt
                try {
                    const isDeliveryDay = window.orderRules && typeof window.orderRules.isDeliveryDay === 'function'
                        ? window.orderRules.isDeliveryDay(dateString)
                        : ((new Date(dateString + 'T12:00:00')).getDay() === 0 || (new Date(dateString + 'T12:00:00')).getDay() === 6);
                    const isPickupDay = window.orderRules && typeof window.orderRules.isPickupDay === 'function'
                        ? window.orderRules.isPickupDay(dateString)
                        : ([1, 3, 5, 6, 0].includes((new Date(dateString + 'T12:00:00')).getDay()));

                    const selectedHidden = document.getElementById('lieferung');
                    const selectedMethod = selectedHidden ? (selectedHidden.value === '' ? 'abholung' : selectedHidden.value) : '';

                    // If a method is selected but incompatible with the date -> show specific error
                    if (selectedMethod) {
                        if (selectedMethod !== 'abholung' && !isDeliveryDay) {
                            wunschDatumInput.style.borderColor = "#f44336";
                            dateWarning.innerHTML = `
                                <strong>🚫 Lieferung nicht möglich:</strong>
                                Für ${new Date(dateString).toLocaleDateString('de-DE')} ist Lieferung nicht möglich. Bitte wählen Sie ein anderes Datum oder Abholung.
                            `;
                            dateWarning.style.display = "block";
                            dateWarning.className = "date-warning error";
                            return;
                        }
                        if (selectedMethod === 'abholung' && !isPickupDay) {
                            wunschDatumInput.style.borderColor = "#f44336";
                            dateWarning.innerHTML = `
                                <strong>🚫 Abholung nicht möglich:</strong>
                                Für ${new Date(dateString).toLocaleDateString('de-DE')} ist Abholung nicht möglich. Bitte wählen Sie ein anderes Datum oder Lieferung.
                            `;
                            dateWarning.style.display = "block";
                            dateWarning.className = "date-warning error";
                            return;
                        }
                    }

                    // If no method selected, try to auto-select when only one is available, otherwise prompt user
                    if (!selectedMethod) {
                        if (!isDeliveryDay && !isPickupDay) {
                            // Neither method available -> show error (should rarely happen because we already checked)
                            wunschDatumInput.style.borderColor = "#f44336";
                            dateWarning.innerHTML = `
                                <strong>⚠️ Nicht verfügbar:</strong>
                                Für ${new Date(dateString).toLocaleDateString('de-DE')} ist weder Abholung noch Lieferung möglich.
                                <br><small><button onclick="showAvailabilityCalendar()" style="background:none;border:none;color:var(--clr-accent);text-decoration:underline;cursor:pointer">Andere Termine anzeigen</button></small>
                            `;
                            dateWarning.style.display = "block";
                            dateWarning.className = "date-warning error";
                        } else if (isDeliveryDay && !isPickupDay) {
                            // Only delivery -> auto-select delivery
                            // Set hidden field to default delivery option (20km preferred)
                            const hidden = document.getElementById('lieferung');
                            if (hidden) {
                                hidden.value = '20km';
                                // dispatch both custom and standard change events
                                hidden.dispatchEvent(new Event('lieferungchange'));
                                hidden.dispatchEvent(new Event('change', { bubbles: true }));
                                showNotification('Lieferung automatisch ausgewählt, da nur Lieferung an diesem Datum möglich.', 'info');
                            }
                        } else if (isPickupDay && !isDeliveryDay) {
                            // Only pickup -> auto-select pickup (no-delivery radio)
                            const hidden = document.getElementById('lieferung');
                            if (hidden) {
                                hidden.value = '';
                                // dispatch both custom and standard change events
                                hidden.dispatchEvent(new Event('lieferungchange'));
                                hidden.dispatchEvent(new Event('change', { bubbles: true }));
                                showNotification('Abholung automatisch ausgewählt, da nur Abholung an diesem Datum möglich.', 'info');
                            }
                        }
                    }
                } catch (err) {
                    console.warn('Fehler beim Prüfen von Liefer-/Abholregeln im Datum-Check', err);
                }
            } else {
                // Fallback für andere Probleme
                wunschDatumInput.style.borderColor = "#f44336";
                dateWarning.innerHTML = `
                    <strong>⚠️ Datum nicht verfügbar:</strong> 
                    ${status.reason || 'Unbekannter Fehler'}
                `;
                dateWarning.style.display = "block";
                dateWarning.className = "date-warning error";
            }
        } catch (error) {
            console.error("Fehler bei Datumsprüfung:", error);
        }
    }

    // Erstelle Warning-Element für Datumsfeedback
    createDateWarningElement() {
        const wunschDatumInput = document.getElementById("wunschDatum");
        if (!wunschDatumInput) return null;

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
        if (wunschDatumInput.parentNode) {
            wunschDatumInput.parentNode.insertBefore(dateWarning, wunschDatumInput.nextSibling);
        }

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
        const orderForm = document.getElementById('orderForm');
        if (!orderForm) {
            console.warn('OrderManager: initializeForm - #orderForm not found, skipping form init');
            return;
        }

        this.toggleDeliveryFields();
        this.toggleTiersSelection();
        this.updateSizeUI();
        this.calculateSum();

        // Ensure mehrstöckig availability reflects the initial size
        try {
            this.updateMehrstoeckigAvailability();
        } catch (e) {
            console.warn('Failed to update mehrstöckig availability on init', e);
        }

        // Setze Minimum-Datum auf heute
        const heute = new Date().toISOString().split("T")[0];
        const wunschDatumEl = document.getElementById("wunschDatum");
        if (wunschDatumEl) wunschDatumEl.min = heute;

        // Datum aus URL-Parameter übernehmen (falls vom Kalender weitergeleitet)
        const urlParams = new URLSearchParams(window.location.search);
        const dateParam = urlParams.get('date');

        if (dateParam) {
            const targetDate = new Date(dateParam);
            if (!isNaN(targetDate.getTime()) && dateParam >= heute) {
                if (wunschDatumEl) {
                    wunschDatumEl.value = dateParam;
                    showNotification(`Datum ${targetDate.toLocaleDateString('de-DE')} aus Kalender übernommen`, 'success');
                }
            }
        }

        // Ensure selectedDeliveryInfo reflects current hidden delivery selection on init
        try {
            const hidden = document.getElementById('lieferung');
            const selectedInfo = document.getElementById('selectedDeliveryInfo');
            const selectedUnderDate = document.getElementById('selectedDeliveryUnderDate');
            if (hidden && selectedInfo) {
                const updateInfo = () => {
                    const val = hidden.value;
                    if (!val || val === '') {
                        selectedInfo.innerHTML = 'Ausgewählt: <strong>Abholung</strong>' + (selectedInfo.dataset.priceset ? '' : selectedInfo.innerHTML);
                    } else {
                        const price = this.prices.lieferung[val] || (window.priceConfig && window.priceConfig.lieferung && window.priceConfig.lieferung[val] ? window.priceConfig.lieferung[val].price : 0);
                        selectedInfo.innerHTML = `Ausgewählt: <strong>Lieferung (${val.replace('km', ' km')})</strong> — Zuschlag: <strong>${price} €</strong>`;
                    }
                };

                updateInfo();
                hidden.addEventListener('lieferungchange', updateInfo);
                // Also update the under-date helper when either the date or delivery changes
                const updateUnderDate = () => {
                    if (!selectedUnderDate) return;
                    const wunsch = document.getElementById('wunschDatum');
                    if (!wunsch || !wunsch.value) {
                        selectedUnderDate.style.display = 'none';
                        return;
                    }
                    const val = hidden.value;
                    if (!val || val === '') {
                        selectedUnderDate.innerHTML = 'Ausgewählt: <strong>Abholung</strong>';
                        selectedUnderDate.style.display = '';
                    } else {
                        const price = this.prices.lieferung[val] || (window.priceConfig && window.priceConfig.lieferung && window.priceConfig.lieferung[val] ? window.priceConfig.lieferung[val].price : 0);
                        selectedUnderDate.innerHTML = `Ausgewählt: <strong>Lieferung (${val.replace('km', ' km')})</strong> — Zuschlag: <strong>${price} €</strong>`;
                        selectedUnderDate.style.display = '';
                    }
                };
                if (selectedUnderDate) {
                    hidden.addEventListener('lieferungchange', updateUnderDate);
                    const wunsch = document.getElementById('wunschDatum');
                    if (wunsch) {
                        wunsch.addEventListener('change', updateUnderDate);
                    }
                    // initialize visibility
                    updateUnderDate();
                }
            }
        } catch (e) {
            console.warn('Could not initialize selectedDeliveryInfo', e);
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
                    lieferung: this.getSelectedDeliveryValue(f),
                },
                wunschtermin: {
                    datum: f.wunschDatum ? f.wunschDatum.value : '',
                    uhrzeit: f.wunschUhrzeit ? f.wunschUhrzeit.value || null : null,
                },
                anlass: f.occasion ? f.occasion.value : null,
                sonderwunsch: f.sonderwunsch ? f.sonderwunsch.value.trim() : null,
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
            // Clear the sonderwunsch textarea explicitly (reset should handle, but be explicit)
            const sw = document.getElementById('sonderwunsch');
            if (sw) sw.value = '';

        } catch (err) {
            console.error('Fehler beim Speichern der Bestellung:', err);
            this.showError();
        }
    }

    validateForm(f) {
        // Validate form

        // Name validieren
        if (!f.name.value.trim()) {
            showNotification("Bitte geben Sie Ihren Namen ein.", "error");
            return false;
        }

        // Wunschtermin validieren (WICHTIG!)
        const wunschDatum = f.wunschDatum.value;
        // Validate requested date

        if (!wunschDatum || wunschDatum.trim() === '') {
            console.log('❌ Kein Wunschtermin eingegeben');
            showNotification("Bitte wählen Sie einen Wunschtermin aus.", "error");
            return false;
        }

        // Datum in der Vergangenheit prüfen
        const heute = new Date().toISOString().split("T")[0];
        if (wunschDatum < heute) {
            console.log('❌ Datum in der Vergangenheit');
            showNotification("Das gewünschte Datum kann nicht in der Vergangenheit liegen.", "error");
            return false;
        }

        // Vorlaufzeit prüfen (7 Tage)
        if (window.orderLimitManager && typeof window.orderLimitManager.isDateTooEarly === 'function') {
            const istZuFrueh = window.orderLimitManager.isDateTooEarly(wunschDatum);
            if (istZuFrueh) {
                console.log('❌ Zu kurzfristig - weniger als 7 Tage Vorlaufzeit');
                showNotification("Bestellungen sind nur mit mindestens 7 Tagen Vorlaufzeit möglich.", "error");
                return false;
            }
        }

        // Prüfe ob Datum/Wochentag zur gewählten Lieferart passt
        try {
            const selectedHidden = document.getElementById('lieferung');
            const selectedMethod = selectedHidden ? (selectedHidden.value === '' ? 'abholung' : selectedHidden.value) : '';
            const selectedTime = f.wunschUhrzeit ? f.wunschUhrzeit.value : null;

            if (window.orderRules && typeof window.orderRules.isDeliveryDay === 'function') {
                if (selectedMethod && selectedMethod !== 'abholung') {
                    // Lieferung gewählt
                    if (!window.orderRules.isDeliveryDay(wunschDatum)) {
                        showNotification('Lieferungen sind nur Samstags und Sonntags möglich. Bitte wählen Sie ein passendes Datum oder Abholung.', 'error');
                        return false;
                    }
                    if (selectedTime && !window.orderRules.isTimeAllowedForMethod(selectedTime, 'delivery')) {
                        showNotification('Für Lieferungen sind nur Zeitfenster 09:00–11:00 oder 17:00–18:00 möglich.', 'error');
                        return false;
                    }
                } else {
                    // Abholung oder keine Angabe
                    if (!window.orderRules.isPickupDay(wunschDatum) && selectedMethod === 'abholung') {
                        showNotification('Abholung ist nur Montags, Mittwochs oder Freitags möglich. Bitte wählen Sie ein passendes Datum.', 'error');
                        return false;
                    }
                    if (selectedTime && !window.orderRules.isTimeAllowedForMethod(selectedTime, 'pickup')) {
                        showNotification('Für Abholungen sind Zeitfenster zwischen 16:00–17:00 oder 18:00–19:00 vorgesehen.', 'error');
                        return false;
                    }
                }
            }
        } catch (e) {
            console.warn('Fehler beim Prüfen der Liefer-/Abholregeln:', e);
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

        // Form validation successful
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
        const val = this.getSelectedDeliveryValue(f);
        if (val !== "") {
            return {
                street: f.strasse ? f.strasse.value : '',
                plz: f.plz ? f.plz.value : '',
                city: f.ort ? f.ort.value : '',
            };
        }
        return null;
    }

    getDeliveryAddressString(f) {
        const val = this.getSelectedDeliveryValue(f);
        if (val !== "" && val !== "abholung") {
            const street = f.strasse ? f.strasse.value : '';
            const plz = f.plz ? f.plz.value : '';
            const city = f.ort ? f.ort.value : '';

            if (street || plz || city) {
                return `${street}, ${plz} ${city}`.replace(/^,\s*/, '').replace(/\s*,\s*$/, '');
            }
        }
        return "Abholung";
    }

    // Helper to determine selected delivery value: prefer hidden #lieferung, fallback to form radios if present
    getSelectedDeliveryValue(f) {
        try {
            const hidden = document.getElementById('lieferung');
            if (hidden && hidden.value !== undefined) {
                return hidden.value;
            }
        } catch (e) {
            // ignore
        }

        // fallback: try form field
        try {
            if (f && f.lieferung && f.lieferung.value !== undefined) return f.lieferung.value;
        } catch (e) { }
        return '';
    }

    showSuccess() {
        const successEl = document.getElementById("orderSuccess");
        const errorEl = document.getElementById("orderError");
        if (successEl) successEl.style.display = "block";
        if (errorEl) errorEl.style.display = "none";
    }

    showError() {
        const successEl = document.getElementById("orderSuccess");
        const errorEl = document.getElementById("orderError");
        if (successEl) successEl.style.display = "none";
        if (errorEl) errorEl.style.display = "block";
    }

    resetForm(f) {
        f.reset();
        this.updateSizeUI();
        // clear badges
        const orderSumEl = document.getElementById("orderSum");
        if (orderSumEl) orderSumEl.textContent = ""; // harmless if element absent
        // clear badges as well
        const b = document.getElementById('orderTotalBadgeAmount');
        const bf = document.getElementById('orderTotalBadgeFloatingAmount');
        const bc = document.getElementById('orderTotalBadge');
        const bcf = document.getElementById('orderTotalBadgeFloating');
        if (b) b.textContent = '—';
        if (bf) bf.textContent = '—';
        if (bc) bc.classList.add('empty');
        if (bcf) bcf.classList.add('empty');
        try {
            this.toggleDeliveryFields();
        } catch (e) {
            console.warn('toggleDeliveryFields failed during resetForm', e);
        }
    }
}

// Initialisierung wenn DOM geladen ist
document.addEventListener("DOMContentLoaded", function () {
    new OrderManager();
});