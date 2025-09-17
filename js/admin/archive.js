// archive.js - Archivfunktionalität für Admin-Dashboard

class ArchiveManager {
    constructor() {
        this.db = null;
        this.autoArchiveInterval = null;
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
        this.startAutoArchive();
    }

    // Einzelne Bestellung archivieren
    async archiveOrder(orderId) {
        showConfirmation(
            "Bestellung archivieren?",
            async () => {
                try {
                    const orderDoc = await this.db.collection("orders").doc(orderId).get();

                    if (!orderDoc.exists) {
                        showNotification("Bestellung nicht gefunden!", "error");
                        return;
                    }

                    const orderData = orderDoc.data();
                    const archiveData = {
                        ...orderData,
                        archivedAt: new Date().toISOString(),
                        originalOrderId: orderId,
                        manualArchived: true,
                    };

                    // Batch-Operation für Atomarität
                    const batch = this.db.batch();
                    batch.set(this.db.collection("archived_orders").doc(orderId), archiveData);
                    batch.delete(this.db.collection("orders").doc(orderId));

                    await batch.commit();

                    showNotification("Bestellung archiviert!", "success");
                    window.orderManager.loadOrders(); // Bestellliste neu laden
                    this.loadArchives(); // Archiv neu laden
                } catch (error) {
                    console.error("Fehler beim Archivieren:", error);
                    showNotification("Fehler beim Archivieren der Bestellung", "error");
                }
            }
        );
    }

    // Automatische Archivierung für alte fertige Bestellungen
    async autoArchiveOldOrders(showConfirm = true) {
        try {
            // Cutoff-Zeit: 7 Tage in der Vergangenheit
            const cutoffTime = new Date();
            cutoffTime.setDate(cutoffTime.getDate() - 7);
            const cutoffISOString = cutoffTime.toISOString();

            // Auto-archive: searching for finished orders older than cutoff

            // Hole alle fertigen Bestellungen (ohne Zeitfilter da Firebase Index-Problem)
            const finishedOrdersSnap = await this.db
                .collection("orders")
                .where("status", "==", "fertig")
                .get();

            let archivedCount = 0;
            const batch = this.db.batch();

            // Filtere im JavaScript-Code nach Datum
            for (const doc of finishedOrdersSnap.docs) {
                const orderData = doc.data();

                // Prüfe ob Bestellung älter als 7 Tage ist
                if (orderData.created && orderData.created < cutoffISOString) {
                    const archiveData = {
                        ...orderData,
                        archivedAt: new Date().toISOString(),
                        originalOrderId: doc.id,
                        autoArchived: true,
                    };

                    // Zu Archiv hinzufügen
                    batch.set(this.db.collection("archived_orders").doc(doc.id), archiveData);
                    // Aus orders entfernen
                    batch.delete(this.db.collection("orders").doc(doc.id));
                    archivedCount++;
                }
            }

            if (archivedCount > 0) {
                await batch.commit();
                showNotification(`${archivedCount} Bestellungen automatisch archiviert!`, "success");
            } else {
                if (showConfirm) {
                    showNotification("Keine alten Bestellungen zum Archivieren gefunden.", "success");
                }
            }

            window.orderManager.loadOrders();
            this.loadArchives();
        } catch (error) {
            console.error("Fehler bei Auto-Archivierung:", error);
            showNotification("Fehler bei der automatischen Archivierung!", "error");
        }
    }

    // Alle fertigen Bestellungen archivieren (Button-Funktion)
    async archiveAllFinished() {
        showConfirmation(
            "Alle fertigen Bestellungen sofort archivieren?",
            async () => {
                try {
                    // Hole alle fertigen Bestellungen
                    const finishedOrdersSnap = await this.db
                        .collection("orders")
                        .where("status", "==", "fertig")
                        .get();

                    let archivedCount = 0;
                    const batch = this.db.batch();

                    for (const doc of finishedOrdersSnap.docs) {
                        const orderData = doc.data();
                        const archiveData = {
                            ...orderData,
                            archivedAt: new Date().toISOString(),
                            originalOrderId: doc.id,
                            manualArchived: true,
                        };

                        // Zu Archiv hinzufügen
                        batch.set(this.db.collection("archived_orders").doc(doc.id), archiveData);
                        // Aus orders entfernen
                        batch.delete(this.db.collection("orders").doc(doc.id));
                        archivedCount++;
                    }

                    if (archivedCount > 0) {
                        await batch.commit();
                        showNotification(`${archivedCount} fertige Bestellungen archiviert!`, "success");
                    } else {
                        showNotification("Keine fertigen Bestellungen zum Archivieren vorhanden.", "success");
                    }

                    window.orderManager.loadOrders();
                    this.loadArchives();
                } catch (error) {
                    console.error("Fehler beim Archivieren fertiger Bestellungen:", error);
                    showNotification("Fehler beim Archivieren!", "error");
                }
            }
        );
    }

    // Archiv laden und anzeigen
    async loadArchives() {
        try {
            showLoading('archivesList', 'Lade Archiv...');

            const archiveSnap = await this.db
                .collection("archived_orders")
                .orderBy("archivedAt", "desc")
                .get();

            let html = "";
            if (archiveSnap.empty) {
                html = '<div class="list-item" style="margin:2em 0;">Keine archivierten Bestellungen vorhanden.</div>';
            } else {
                // Gruppierung nach Monat/Jahr
                const groupedByMonth = {};

                archiveSnap.forEach((doc) => {
                    const order = doc.data();
                    const archivedDate = new Date(order.archivedAt);
                    const monthKey = `${archivedDate.getFullYear()}-${String(archivedDate.getMonth() + 1).padStart(2, "0")}`;
                    const monthLabel = archivedDate.toLocaleDateString("de-DE", {
                        year: "numeric",
                        month: "long",
                    });

                    if (!groupedByMonth[monthKey]) {
                        groupedByMonth[monthKey] = { label: monthLabel, orders: [] };
                    }
                    groupedByMonth[monthKey].orders.push({ doc, order });
                });

                // Archiv-Accordion erstellen
                Object.keys(groupedByMonth)
                    .sort()
                    .reverse()
                    .forEach((monthKey) => {
                        const month = groupedByMonth[monthKey];
                        html += `
                            <details style="margin-bottom:12px;">
                                <summary class="detail-summary">
                                    📅 ${month.label} (${month.orders.length} Bestellungen)
                                </summary>
                                <div style="margin-left:20px;margin-top:10px;">
                        `;

                        month.orders.forEach(({ doc, order }) => {
                            html += this.renderArchivedOrder(doc, order);
                        });

                        html += `</div></details>`;
                    });
            }

            document.getElementById("archivesList").innerHTML = html;
        } catch (error) {
            console.error("Fehler beim Laden des Archivs:", error);
            document.getElementById("archivesList").innerHTML = "Fehler beim Laden des Archivs.";
        }
    }

    // Archivierte Bestellung rendern (vereinfachte Version)
    renderArchivedOrder(doc, order) {
        const archivedDate = formatDate(new Date(order.archivedAt));
        const createdDate = order.created ? formatDate(new Date(order.created)) : "-";

        const size = order.details?.durchmesserCm ? `${order.details.durchmesserCm} cm` : "Unbekannt";
        const extras = order.details?.extras?.length ? order.details.extras.join(", ") : "keine";

        return `
            <div class="list-item">
                <div class="muted" style="font-size:0.95em;margin-bottom:8px;">
                    <strong>Archiviert am:</strong> ${archivedDate} | <strong>Erstellt am:</strong> ${createdDate}
                    ${order.autoArchived ? ' | <span class="badge badge-new">Auto-archiviert</span>' : ""}
                </div>
                <div style="font-size:1em;font-weight:600;">
                // Auto-archive started (every 30 minutes)
                </div>
                <div style="margin:4px 0;">
                    <strong>Kunde:</strong> ${order.customerId || "Unbekannt"} | 
                    <strong>Status:</strong> ${order.status || "Unbekannt"} |
                    <strong>Wert:</strong> ${order.gesamtpreis || "nicht berechnet"} €
                </div>
                <div style="margin:4px 0;" class="muted">
                    // Auto-archive stopped
                    <strong>Extras:</strong> ${extras}
                </div>
            </div>
        `;
    }

    // Automatische Archivierung starten
    startAutoArchive() {
        // Sofort beim Start ausführen
        this.autoArchiveOldOrders(false);

        // Dann alle 30 Minuten wiederholen
        this.autoArchiveInterval = setInterval(() => {
            this.autoArchiveOldOrders(false);
        }, 30 * 60 * 1000); // 30 Minuten

        console.log("Auto-Archivierung gestartet (alle 30 Minuten)");
    }

    // Automatische Archivierung stoppen
    stopAutoArchive() {
        if (this.autoArchiveInterval) {
            clearInterval(this.autoArchiveInterval);
            this.autoArchiveInterval = null;
            console.log("Auto-Archivierung gestoppt");
        }
    }

}

// Globale Funktionen für HTML-Callbacks
window.archiveOrder = async function (orderId) {
    await window.archiveManager.archiveOrder(orderId);
};

window.archiveAllFinished = async function () {
    await window.archiveManager.archiveAllFinished();
};

// Globale Instanz für Admin-Dashboard
window.archiveManager = new ArchiveManager();

// Expose constructor for test helpers (non-breaking)
if (typeof window.ArchiveManager === 'undefined' && typeof ArchiveManager !== 'undefined') {
    window.ArchiveManager = ArchiveManager;
}