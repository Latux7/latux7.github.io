// email-template-manager.js - Dynamisches Email-Template-System

class EmailTemplateManager {
    constructor() {
        this.templates = {
            newOrder: this.getNewOrderTemplate(),
            newReview: this.getNewReviewTemplate()
        };
        this.adminDashboardUrl = 'https://latux7.github.io/admin.html';
    }

    // Template für neue Bestellungen
    getNewOrderTemplate() {
        return {
            // Styling-Variablen
            notification_title: 'Neue Bestellung eingegangen',
            primary_color: '#e74c3c',
            secondary_color: '#c0392b',
            alert_bg_primary: '#fff3cd',
            alert_bg_secondary: '#ffeaa7',
            alert_border: '#ffc107',
            highlight_primary: '#28a745',
            highlight_secondary: '#20c997',

            // Icons
            header_icon: '🚨',
            alert_icon: '⚡',
            content_icon: '📋',
            info_icon: '👤',

            // Header-Bereich
            header_title: 'NEUE BESTELLUNG',
            priority_text: 'SOFORT BEARBEITEN',

            // Alert-Bereich
            alert_title: '🎂 Neue Tortenbestellung eingegangen!',
            alert_message: 'Eine neue Bestellung wartet auf Ihre Bearbeitung im Admin-Dashboard.',

            // Haupt-Content-Bereich
            main_section_title: 'Bestelldetails',
            has_grid_content: true,

            // Info-Bereich
            info_section_title: 'Kundendaten',

            // Timestamp
            timestamp_text: 'Bestellung eingegangen am',

            // Action-Bereich
            action_title: 'Jetzt bearbeiten',
            action_description: 'Öffnen Sie das Admin-Dashboard, um die Bestellung zu bestätigen und den Status zu aktualisieren.'
        };
    }

    // Template für neue Bewertungen
    getNewReviewTemplate() {
        return {
            // Styling-Variablen
            notification_title: 'Neue Bewertung eingegangen',
            primary_color: '#6f42c1',
            secondary_color: '#5a32a8',
            alert_bg_primary: '#f3e5f5',
            alert_bg_secondary: '#e1bee7',
            alert_border: '#9c27b0',
            highlight_primary: '#17a2b8',
            highlight_secondary: '#138496',

            // Icons
            header_icon: '⭐',
            alert_icon: '✨',
            content_icon: '📝',
            info_icon: '👤',

            // Header-Bereich
            header_title: 'NEUE BEWERTUNG',
            priority_text: 'BEWERTUNG PRÜFEN',

            // Alert-Bereich
            alert_title: '⭐ Neue Kundenbewertung erhalten!',
            alert_message: 'Ein Kunde hat eine neue Bewertung für Laura\'s Backstube abgegeben.',

            // Haupt-Content-Bereich
            main_section_title: 'Bewertungsdetails',
            has_grid_content: true,
            has_ratings: true,

            // Info-Bereich
            info_section_title: 'Kundendaten',

            // Timestamp
            timestamp_text: 'Bewertung eingegangen am',

            // Action-Bereich
            action_title: 'Bewertung ansehen',
            action_description: 'Öffnen Sie das Admin-Dashboard, um die vollständige Bewertung zu sehen und zu moderieren.'
        };
    }

    // Erstelle Email-HTML für neue Bestellung
    generateNewOrderEmail(orderData) {
        const template = this.templates.newOrder;

        // Content-Items für die Bestellung
        const contentItems = [
            {
                label: 'Tortengröße',
                value: orderData.details && orderData.details.durchmesserCm
                    ? `${orderData.details.durchmesserCm} cm (${orderData.details.tier || 'Standard'})`
                    : 'Nicht angegeben'
            },
            {
                label: 'Extras',
                value: orderData.details && orderData.details.extras && orderData.details.extras.length > 0
                    ? (typeof formatExtras === 'function' ? formatExtras(orderData.details.extras, orderData.details) : orderData.details.extras.join(', '))
                    : 'Keine'
            },
            {
                label: 'Wunschtermin',
                value: orderData.wunschtermin && orderData.wunschtermin.datum
                    ? new Date(orderData.wunschtermin.datum.toDate ? orderData.wunschtermin.datum.toDate() : orderData.wunschtermin.datum).toLocaleDateString('de-DE')
                    : 'Nicht angegeben'
            },
            {
                label: 'Lieferart',
                value: orderData.details && orderData.details.lieferung
                    ? orderData.details.lieferung === 'abholung' ? 'Abholung' : `Lieferung: ${orderData.details.lieferung}`
                    : 'Abholung'
            }
        ];

        // Info-Items für Kundendaten
        const infoItems = [
            {
                icon: '👤',
                label: 'Name',
                value: orderData.name || 'Nicht angegeben'
            },
            {
                icon: '📧',
                label: 'E-Mail',
                value: orderData.email || 'Nicht angegeben'
            },
            {
                icon: '📱',
                label: 'Telefon',
                value: orderData.telefon || 'Nicht angegeben'
            },
            {
                icon: '🏠',
                label: 'Adresse',
                value: orderData.adresse || 'Nicht angegeben'
            }
        ];

        // Sonderwunsch hinzufügen falls vorhanden
        if (orderData.sonderwunsch) {
            infoItems.push({
                icon: '📝',
                label: 'Sonderwunsch',
                value: orderData.sonderwunsch
            });
        }

        // Template-Data zusammenstellen
        const templateData = {
            ...template,
            content_items: contentItems,
            highlight_content: orderData.gesamtpreis
                ? `💰 Gesamtpreis: ${parseFloat(orderData.gesamtpreis).toFixed(2)}€`
                : '💰 Preis: Noch nicht berechnet',
            info_items: infoItems,
            timestamp: new Date().toLocaleString('de-DE'),
            admin_dashboard_url: this.adminDashboardUrl
        };

        return this.renderTemplate(templateData);
    }

    // Erstelle Email-HTML für neue Bewertung
    generateNewReviewEmail(reviewData) {
        // Normalize incoming review fields (the review form uses: gesamt, geschmack, aussehen, service, text/kommentar)
        const overall = parseInt(reviewData.gesamt || reviewData.gesamtbewertung || 0) || 0;
        const taste = parseInt(reviewData.geschmack || 0) || 0;
        const looks = parseInt(reviewData.aussehen || reviewData.optik || 0) || 0;
        const service = parseInt(reviewData.service || 0) || 0;
        const pricePerf = parseInt(reviewData.preisLeistung || 0) || 0;

        return {
            // Template-Typ Controls
            template_type: 'new_review',
            is_order: false,
            is_review: true,

            // Header-Bereich
            notification_title: 'Neue Bewertung erhalten',
            header_title: 'NEUE BEWERTUNG',
            priority_text: 'BEWERTUNG PRÜFEN',

            // Alert-Bereich
            alert_title: '\u2b50 Neue Kundenbewertung erhalten!',
            alert_message: 'Ein Kunde hat eine neue Bewertung für Laura\'s Backstube abgegeben.',

            // Bewertungsdetails für das Grid (human readable)
            rating_overall: this.formatRating(overall),
            rating_geschmack: this.formatRating(taste),
            rating_optik: this.formatRating(looks),
            rating_service: this.formatRating(service),
            rating_preis: this.formatRating(pricePerf),

            // Review content (ensure keys match other callers)
            customer_name: reviewData.name || reviewData.customerName || 'Anonym',
            customer_email: reviewData.email || reviewData.customerEmail || 'Nicht angegeben',
            review_comment: reviewData.kommentar || reviewData.text || '',
            review_title: reviewData.titel || '',
            orderId: reviewData.orderId || '',

            // Zeitstempel und Dashboard
            review_timestamp: new Date().toLocaleString('de-DE'),
            admin_dashboard_url: this.adminDashboardUrl,

            // Action-Bereich
            action_title: 'Bewertung verwalten',
            action_message: '\u00d6ffnen Sie das Admin-Dashboard, um die Bewertung zu moderieren und zu verwalten.',
            action_button_text: 'Zum Admin-Dashboard',

            // Extras / Summary
            average_rating: ((taste + looks + service + pricePerf + overall) / (overall ? 5 : (taste || looks || service || pricePerf ? 4 : 1))),
            rating_count: 'Bewertungskategorien: ' + [overall, taste, looks, service, pricePerf].filter(n => n > 0).length
        };

        // Build simple content and info for the review template
        const contentItems = [
            { label: 'Gesamtbewertung', value: `${overall}/5` },
            { label: 'Geschmack', value: `${taste}/5` },
            { label: 'Aussehen', value: `${looks}/5` },
            { label: 'Service', value: `${service}/5` }
        ];

        const infoItems = [
            { icon: '👤', label: 'Name', value: reviewData.name || reviewData.customerName || 'Anonym' },
            { icon: '📧', label: 'E-Mail', value: reviewData.email || reviewData.customerEmail || 'Nicht angegeben' }
        ];

        if (reviewData.orderId) {
            infoItems.push({ icon: '🛒', label: 'Bestellungs-ID', value: reviewData.orderId });
        }

        const templateData = {
            ...template,
            content_items: contentItems,
            ratings: [
                { category: 'Gesamt', stars: this.formatRating(overall) },
                { category: 'Geschmack', stars: this.formatRating(taste) },
                { category: 'Aussehen', stars: this.formatRating(looks) },
                { category: 'Service', stars: this.formatRating(service) }
            ],
            review_text: reviewData.kommentar || reviewData.text || 'Keine zusätzlichen Kommentare',
            highlight_content: `⭐ Durchschnitt: ${this.calculateAverageRating(reviewData).toFixed(1)}/5 Sterne`,
            info_items: infoItems,
            timestamp: new Date().toLocaleString('de-DE'),
            admin_dashboard_url: this.adminDashboardUrl
        };

        return this.renderTemplate(templateData);
    }

    // Berechne Durchschnittsbewertung
    calculateAverageRating(reviewData) {
        const ratings = [
            reviewData.geschmack || 0,
            reviewData.aussehen || 0,
            reviewData.service || 0,
            reviewData.gesamt || 0
        ];
        const validRatings = ratings.filter(r => r > 0);
        return validRatings.length > 0 ? validRatings.reduce((a, b) => a + b) / validRatings.length : 0;
    }

    // Render Template (vereinfachte Mustache-like Implementierung)
    renderTemplate(data) {
        // Hier würde normalerweise das HTML-Template geladen und mit den Daten gefüllt
        // Für EmailJS verwenden wir die template_ov1de3n ID und übergeben die Daten

        // Generiere einen HTML-String für die Vorschau/Debug
        return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.notification_title}</title>
    <style>
        /* Hier würden die CSS-Styles aus dem Template eingefügt */
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f8f9fa; }
        .email-container { max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15); border: 2px solid ${data.primary_color}; }
        .header { background: linear-gradient(135deg, ${data.primary_color}, ${data.secondary_color}); color: white; padding: 30px 25px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
        .content { padding: 30px 25px; }
        .alert-section { background: linear-gradient(135deg, ${data.alert_bg_primary}, ${data.alert_bg_secondary}); border: 2px solid ${data.alert_border}; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
        .alert-title { font-size: 24px; font-weight: bold; color: ${data.primary_color}; margin-bottom: 10px; text-transform: uppercase; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>${data.header_title}</h1>
            <div style="background-color: #fff; color: ${data.primary_color}; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; margin-top: 10px; display: inline-block;">
                ${data.priority_text}
            </div>
        </div>
        <div class="content">
            <div class="alert-section">
                <div class="alert-title">${data.alert_title}</div>
                <p style="margin: 0; font-size: 16px; color: #856404">${data.alert_message}</p>
            </div>
            ${data.highlight_content ? `<div style="background: linear-gradient(135deg, ${data.highlight_primary}, ${data.highlight_secondary}); color: white; font-size: 18px; text-align: center; padding: 15px; border-radius: 8px; margin: 20px 0; font-weight: bold;">${data.highlight_content}</div>` : ''}
            ${data.review_text ? `<div style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 15px 0; font-style: italic; line-height: 1.8;">"${data.review_text}"</div>` : ''}
            <div style="margin-top: 25px; text-align: center;">
                <a href="${data.admin_dashboard_url}" style="display: inline-block; background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">
                    🚀 Zum Admin-Dashboard
                </a>
            </div>
        </div>
    </div>
</body>
</html>`;
    }

    // Erstelle EmailJS-kompatible Template-Daten
    getEmailJSTemplateData(type, data) {
        switch (type) {
            case 'newOrder':
                return this.getOrderEmailJSData(data);
            case 'newReview':
                return this.getReviewEmailJSData(data);
            default:
                throw new Error(`Unbekannter Template-Typ: ${type}`);
        }
    }

    // EmailJS-Daten für Bestellungen - Vereinfacht für garantierte Kompatibilität
    getOrderEmailJSData(orderData) {
        // Demote verbose processing log to console.debug to avoid noisy production output
        console.debug('EmailTemplateManager: Verarbeite Bestellungsdaten:', orderData);

        return {
            // Header-Bereich
            notification_title: 'Neue Bestellung eingegangen',
            header_title: 'NEUE BESTELLUNG',
            priority_text: 'SOFORT BEARBEITEN',

            // Alert-Bereich
            alert_title: '🎂 Neue Tortenbestellung eingegangen!',
            alert_message: 'Eine neue Bestellung wartet auf Ihre Bearbeitung im Admin-Dashboard.',

            // Bestelldetails - Sichere Extraktion
            order_size: orderData.details && orderData.details.durchmesserCm
                ? `${orderData.details.durchmesserCm} cm ${orderData.details.tier ? `(${orderData.details.tier})` : ''}`
                : 'Nicht angegeben',
            order_extras: orderData.details && orderData.details.extras && orderData.details.extras.length > 0
                ? (typeof formatExtras === 'function' ? formatExtras(orderData.details.extras, orderData.details) : orderData.details.extras.join(', '))
                : 'Keine',
            wunschtermin: orderData.wunschtermin && orderData.wunschtermin.datum
                ? this.formatDate(orderData.wunschtermin.datum)
                : 'Nicht angegeben',
            delivery_type: orderData.details && orderData.details.lieferung
                ? orderData.details.lieferung === 'abholung' ? 'Abholung' : `Lieferung: ${orderData.details.lieferung}`
                : 'Abholung',
            total_price: orderData.gesamtpreis && parseFloat(orderData.gesamtpreis)
                ? parseFloat(orderData.gesamtpreis).toFixed(2)
                : 'Noch nicht berechnet',

            // Kundendaten - Sichere Extraktion
            customer_name: orderData.name || 'Nicht angegeben',
            customer_email: orderData.email || 'Nicht angegeben',
            customer_phone: orderData.telefon || 'Nicht angegeben',
            customer_address: orderData.adresse || 'Nicht angegeben',
            order_notes: orderData.sonderwunsch || 'Keine besonderen Wünsche',

            // Zeitstempel und Dashboard
            order_timestamp: new Date().toLocaleString('de-DE'),
            admin_dashboard_url: this.adminDashboardUrl,

            // Action-Bereich
            action_title: 'Jetzt bearbeiten',
            action_message: 'Öffnen Sie das Admin-Dashboard, um die Bestellung zu bestätigen und den Status zu aktualisieren.',
            action_button_text: 'Zum Admin-Dashboard'
        };
    }

    // Hilfsfunktion für Datumsformatierung
    formatDate(dateValue) {
        try {
            let date;
            if (dateValue && dateValue.toDate) {
                // Firebase Timestamp
                date = dateValue.toDate();
            } else if (dateValue instanceof Date) {
                date = dateValue;
            } else if (typeof dateValue === 'string') {
                date = new Date(dateValue);
            } else {
                return 'Nicht angegeben';
            }
            return date.toLocaleDateString('de-DE');
        } catch (error) {
            console.error('Fehler beim Formatieren des Datums:', error);
            return 'Nicht angegeben';
        }
    }    // EmailJS-Daten für Bewertungen - Einheitliches Template
    getReviewEmailJSData(reviewData) {
        return {
            // Template-Typ Controls
            template_type: 'new_review',
            is_order: false,
            is_review: true,

            // Header-Bereich
            notification_title: 'Neue Bewertung erhalten',
            header_title: 'NEUE BEWERTUNG',
            priority_text: 'BEWERTUNG PRÜFEN',

            // Alert-Bereich
            alert_title: '⭐ Neue Kundenbewertung erhalten!',
            alert_message: 'Ein Kunde hat eine neue Bewertung für Laura\'s Backstube abgegeben.',

            // Bewertungsdetails für das Grid
            rating_overall: '⭐'.repeat(reviewData.gesamtbewertung || 0) + '☆'.repeat(5 - (reviewData.gesamtbewertung || 0)),
            rating_geschmack: this.formatRating(reviewData.geschmack || 0),
            rating_optik: this.formatRating(reviewData.optik || 0),
            rating_service: this.formatRating(reviewData.service || 0),
            rating_preis: this.formatRating(reviewData.preisLeistung || 0),

            // Bewertungsinhalt
            customer_name: reviewData.name || 'Anonym',
            customer_email: reviewData.email || 'Nicht angegeben',
            review_comment: reviewData.kommentar || '',
            review_title: reviewData.titel || '',

            // Zeitstempel und Dashboard  
            review_timestamp: new Date().toLocaleString('de-DE'),
            admin_dashboard_url: this.adminDashboardUrl,

            // Action-Bereich
            action_title: 'Bewertung verwalten',
            action_message: 'Öffnen Sie das Admin-Dashboard, um die Bewertung zu moderieren und zu verwalten.',
            action_button_text: 'Zum Admin-Dashboard',

            // Zusätzliche Daten
            average_rating: ((reviewData.geschmack || 0) + (reviewData.optik || 0) + (reviewData.service || 0) + (reviewData.preisLeistung || 0)) / 4,
            rating_count: '4 Kategorien bewertet'
        };
    }

    // Hilfsfunktion für Sterne-Rating
    formatRating(rating) {
        const stars = Math.floor(rating || 0);
        return '⭐'.repeat(stars) + '☆'.repeat(5 - stars) + ` (${rating || 0}/5)`;
    }
}

// Globale Instanz
window.emailTemplateManager = new EmailTemplateManager();

// Export für Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailTemplateManager;
}