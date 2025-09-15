// Zentrale Preiskonfiguration für Laura's Backstube
// Alle Preise sind hier definiert und können einfach geändert werden

window.priceConfig = {
    // Grundpreise nach Größe
    tiers: {
        mini: { price: 45, label: "Mini (10–14 cm)", minCm: 10, maxCm: 14 },
        normal: { price: 55, label: "Normal (15–20 cm)", minCm: 15, maxCm: 20 },
        gross: { price: 80, label: "Groß (21–24 cm)", minCm: 21, maxCm: 24 }
    },

    // Extras mit Preisen und Beschreibungen
    extras: {
        schokoboden: { price: 5, label: "Schokoboden" },
        vanillecreme: { price: 5, label: "Vanillecreme" },
        nutella: { price: 5, label: "Nutella" },
        pistaziencreme: { price: 7, label: "Pistaziencreme" },
        buttercreme: { price: 10, label: "Buttercreme" },
        fruchtfuellung: { price: 8, label: "Fruchtfüllung" },
        obst: { price: 10, label: "Frisches Obst" },
        deko: { price: 18, label: "Dekoration" },
        mehrstoeckig: { price: 30, label: "Mehrstöckig", note: "pro zusätzlichem Stockwerk" }
    },

    // Lieferungsoptionen
    lieferung: {
        "20km": { price: 10, label: "Lieferung bis 20 km" },
        "40km": { price: 20, label: "Lieferung bis 40 km" }
    },

    // Durchmesser-Bereich
    diameter: {
        min: 10,
        max: 24
    },

    // Stockwerk-Optionen
    tiers_options: {
        min: 2,
        max: 3
    }
};