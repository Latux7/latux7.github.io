// EmailJS Konfiguration für E-Mail-Versand
// Kostenloses E-Mail-Versandsystem - funktioniert direkt vom Frontend

window.emailConfig = {
    // EmailJS Service-ID (kostenlos registrieren auf https://www.emailjs.com/)
    serviceId: "service_acy93wu",

    // EmailJS Template-IDs für verschiedene E-Mail-Typen
    templates: {
        order_status: "template_2eyveh9", // Für angenommen/abgelehnt/in-vorbereitung
        order_ready: "template_ov1de3n", // Nur für "fertig"
    },

    // EmailJS Public Key (von Ihrem EmailJS Account)
    publicKey: "YIXYTe11t9HlfkI9D", // z.B. "user_xyz789"

    // Firmeninformationen für E-Mails
    company: {
        name: "Laura's Backstube",
        address: "Musterstraße 123",
        postal: "12345 Musterstadt",
        email: "lauratustean@gmail.com"
    },

    // Status-spezifische Daten
    statusData: {
        angenommen: {
            header_color: "#8B4513",
            title: "Bestellung angenommen",
            message: "vielen Dank für Ihre Bestellung! Wir haben sie angenommen und werden sie sorgfältig zubereiten.",
            footer_message: "Sie erhalten eine weitere E-Mail, sobald Ihre Bestellung fertig ist."
        },
        "in Vorbereitung": {
            header_color: "#FF9800",
            title: "Bestellung in Vorbereitung",
            message: "Ihre Bestellung ist jetzt in Vorbereitung! Unsere Bäcker arbeiten bereits daran.",
            footer_message: "Sie werden benachrichtigt, sobald Ihre Bestellung fertig ist."
        },
        abgelehnt: {
            header_color: "#f44336",
            title: "Bestellung abgelehnt",
            message: "leider müssen wir Ihre Bestellung ablehnen. Es tut uns sehr leid für die Unannehmlichkeiten.",
            footer_message: "Gerne können Sie eine neue Bestellung aufgeben."
        },
        fertig: {
            header_color: "#4CAF50",
            title: "Bestellung fertig",
            message: "Ihre Bestellung ist fertig!",
            footer_message: "Bei Fragen können Sie uns gerne kontaktieren."
        }
    },

    // Lieferoptionen
    deliveryMessages: {
        abholung: "und kann abgeholt werden! Bitte kommen Sie vorbei.",
        lieferung: "und wird in Kürze geliefert! Halten Sie sich bitte bereit."
    }
};