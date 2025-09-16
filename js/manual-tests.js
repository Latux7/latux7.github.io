// manual-tests.js - Manuelle Tests für komplexe Szenarien

/**
 * MANUELLE TEST-CHECKLISTE
 * Diese Tests müssen manuell durchgeführt werden, da sie Benutzerinteraktionen erfordern
 */

window.manualTests = {
    // 🔥 KRITISCHE FUNKTIONALITÄT
    critical: [
        {
            name: "Komplette Bestellung durchführen",
            description: "Vom Formular bis zur Email-Benachrichtigung",
            steps: [
                "1. Öffne bestellen.html",
                "2. Wähle Durchmesser (z.B. 26cm)",
                "3. Wähle Extras (z.B. Schokoladencreme)",
                "4. Fülle alle Pflichtfelder aus",
                "5. Wähle Lieferung und gib Adresse ein",
                "6. Klicke 'Bestellung absenden'",
                "7. ✅ Prüfe: Erfolgs-Meldung erscheint",
                "8. ✅ Prüfe: Admin erhält Email-Benachrichtigung",
                "9. ✅ Prüfe: Bestellung erscheint im Admin-Panel"
            ],
            expected: "Bestellung wird gespeichert und Admin wird benachrichtigt"
        },

        {
            name: "Admin Login und Bestellverwaltung",
            description: "Admin Panel Login und Bestellungen verwalten",
            steps: [
                "1. Öffne admin.html",
                "2. Gib Passwort 'tortenadmin2025' ein",
                "3. ✅ Prüfe: Dashboard wird angezeigt",
                "4. ✅ Prüfe: Bestellungen werden geladen",
                "5. Ändere Status einer Bestellung auf 'angenommen'",
                "6. ✅ Prüfe: Status-Email wird versendet",
                "7. Ändere Status auf 'fertig'",
                "8. ✅ Prüfe: Bewertungslink in Email enthalten"
            ],
            expected: "Admin kann alle Bestellungen verwalten und Status-Emails versenden"
        },

        {
            name: "Bewertung abgeben",
            description: "Bewertungsformular ausfüllen und absenden",
            steps: [
                "1. Öffne Bewertungslink aus Email (bewerten.html?orderId=...)",
                "2. ✅ Prüfe: Formular wird angezeigt",
                "3. Fülle alle Bewertungsfelder aus (1-5 Sterne)",
                "4. Gib NPS-Score ein (1-10)",
                "5. Schreibe Kommentar",
                "6. Klicke 'Absenden'",
                "7. ✅ Prüfe: Weiterleitung zur Startseite",
                "8. ✅ Prüfe: Bewertung erscheint auf Startseite",
                "9. ✅ Prüfe: Bewertung erscheint im Admin-Panel"
            ],
            expected: "Bewertung wird gespeichert und auf Homepage/Admin angezeigt"
        }
    ],

    // 🛡️ SICHERHEIT
    security: [
        {
            name: "Admin Panel Zugriffschutz",
            description: "Prüfe Schutz vor unbefugtem Zugriff",
            steps: [
                "1. Öffne admin.html ohne Login",
                "2. ✅ Prüfe: Nur Login-Formular sichtbar",
                "3. Gib falsches Passwort ein",
                "4. ✅ Prüfe: Kein Zugriff auf Dashboard",
                "5. Gib korrektes Passwort ein",
                "6. ✅ Prüfe: Dashboard wird freigeschaltet"
            ],
            expected: "Nur mit korrektem Passwort Zugriff auf Admin-Funktionen"
        },

        {
            name: "Bewertung Doppel-Schutz",
            description: "Prüfe Schutz vor mehrfachen Bewertungen",
            steps: [
                "1. Öffne Bewertungslink einer bereits bewerteten Bestellung",
                "2. ✅ Prüfe: Modal 'Bereits bewertet' erscheint",
                "3. ✅ Prüfe: Bewertungsformular ist nicht zugänglich",
                "4. Klicke 'Zur Startseite'",
                "5. ✅ Prüfe: Weiterleitung zur Homepage"
            ],
            expected: "Bereits bewertete Bestellungen können nicht erneut bewertet werden"
        }
    ],

    // 📱 RESPONSIVE DESIGN
    responsive: [
        {
            name: "Mobile Ansicht - Bestellformular",
            description: "Teste Bestellformular auf Mobilgeräten",
            steps: [
                "1. Öffne bestellen.html",
                "2. Aktiviere Browser Dev Tools (F12)",
                "3. Wechsle zu Mobile View (iPhone/Android)",
                "4. ✅ Prüfe: Formular ist vollständig sichtbar",
                "5. ✅ Prüfe: Buttons sind touch-freundlich",
                "6. ✅ Prüfe: Eingabefelder sind nutzbar",
                "7. Fülle Formular aus",
                "8. ✅ Prüfe: Absenden funktioniert"
            ],
            expected: "Bestellformular funktioniert einwandfrei auf Mobilgeräten"
        },

        {
            name: "Tablet Ansicht - Admin Panel",
            description: "Teste Admin Panel auf Tablets",
            steps: [
                "1. Öffne admin.html",
                "2. Wechsle zu Tablet View (iPad/Android Tablet)",
                "3. Logge dich ein",
                "4. ✅ Prüfe: Dashboard Layout ist übersichtlich",
                "5. ✅ Prüfe: Bestellungen sind gut lesbar",
                "6. ✅ Prüfe: Buttons sind erreichbar",
                "7. Teste Statusänderungen",
                "8. ✅ Prüfe: Alle Funktionen nutzbar"
            ],
            expected: "Admin Panel ist auf Tablets vollständig nutzbar"
        }
    ],

    // 🌐 BROWSER KOMPATIBILITÄT
    browsers: [
        {
            name: "Chrome Kompatibilität",
            description: "Teste alle Funktionen in Google Chrome",
            steps: [
                "1. Öffne alle Seiten in Chrome",
                "2. ✅ Prüfe: Kein JavaScript-Fehler in Console",
                "3. ✅ Prüfe: Firebase-Verbindung funktioniert",
                "4. ✅ Prüfe: EmailJS funktioniert",
                "5. Teste komplette Bestellung",
                "6. ✅ Prüfe: Alle Notifications erscheinen",
                "7. Teste Admin Panel",
                "8. ✅ Prüfe: Alle Features funktionieren"
            ],
            expected: "Volle Funktionalität in Chrome"
        },

        {
            name: "Firefox Kompatibilität",
            description: "Teste alle Funktionen in Mozilla Firefox",
            steps: [
                "1. Wiederhole Chrome-Tests in Firefox",
                "2. ✅ Prüfe: Styling korrekt dargestellt",
                "3. ✅ Prüfe: Alle Animationen laufen",
                "4. ✅ Prüfe: Modals funktionieren",
                "5. ✅ Prüfe: Bestätigungsdialoge korrekt"
            ],
            expected: "Volle Funktionalität in Firefox"
        },

        {
            name: "Safari Kompatibilität",
            description: "Teste auf Safari (Mac/iOS)",
            steps: [
                "1. Wiederhole alle Tests in Safari",
                "2. ✅ Prüfe: CSS Grid/Flexbox korrekt",
                "3. ✅ Prüfe: Touch-Events auf iOS",
                "4. ✅ Prüfe: Firebase lädt korrekt"
            ],
            expected: "Funktionalität in Safari gewährleistet"
        }
    ],

    // ⚡ PERFORMANCE
    performance: [
        {
            name: "Ladezeiten messen",
            description: "Messe und optimiere Ladezeiten",
            steps: [
                "1. Öffne Browser Dev Tools",
                "2. Gehe zu Network Tab",
                "3. Lade index.html neu",
                "4. ✅ Prüfe: Gesamtladezeit < 3 Sekunden",
                "5. ✅ Prüfe: Firebase Scripts laden",
                "6. ✅ Prüfe: CSS lädt vor dem Rendern",
                "7. Teste mit langsamer Verbindung (3G)",
                "8. ✅ Prüfe: Seite bleibt nutzbar"
            ],
            expected: "Schnelle Ladezeiten auch bei langsamer Verbindung"
        },

        {
            name: "Memory Usage prüfen",
            description: "Überprüfe Speicherverbrauch",
            steps: [
                "1. Öffne Memory Tab in Dev Tools",
                "2. Navigiere durch alle Seiten",
                "3. ✅ Prüfe: Kein Memory Leak",
                "4. ✅ Prüfe: Event Listener werden ordnungsgemäß entfernt",
                "5. Teste längere Nutzung im Admin Panel",
                "6. ✅ Prüfe: Speicherverbrauch bleibt stabil"
            ],
            expected: "Stabiler Speicherverbrauch ohne Leaks"
        }
    ],

    // 📧 EMAIL INTEGRATION
    email: [
        {
            name: "Email Zustellung prüfen",
            description: "Prüfe ob alle Emails ankommen",
            steps: [
                "1. Teste Bestellung mit realer Email",
                "2. ✅ Prüfe: Admin-Benachrichtigung kommt an",
                "3. Ändere Status im Admin Panel",
                "4. ✅ Prüfe: Status-Email kommt beim Kunden an",
                "5. ✅ Prüfe: Email-Template korrekt formatiert",
                "6. ✅ Prüfe: Alle Variablen richtig ersetzt",
                "7. ✅ Prüfe: Links funktionieren",
                "8. ✅ Prüfe: Bewertungslink führt zu korrekter Seite"
            ],
            expected: "Alle Emails werden zuverlässig zugestellt"
        }
    ],

    // 🗄️ DATENBANK
    database: [
        {
            name: "Firebase Offline-Modus",
            description: "Teste Verhalten bei Verbindungsabbruch",
            steps: [
                "1. Öffne Admin Panel",
                "2. Deaktiviere Internet-Verbindung",
                "3. ✅ Prüfe: Offline-Warnung erscheint",
                "4. ✅ Prüfe: Hilfe-Bereich wird angezeigt",
                "5. Aktiviere Verbindung wieder",
                "6. ✅ Prüfe: Automatische Wiederverbindung",
                "7. ✅ Prüfe: Daten werden wieder geladen"
            ],
            expected: "Graceful Handling von Verbindungsproblemen"
        }
    ]
};

// Hilfsfunktionen für manuelle Tests
window.printTestChecklist = function (category = 'all') {
    let output = '📋 MANUELLE TEST-CHECKLISTE\n';
    output += '═'.repeat(50) + '\n\n';

    const categories = category === 'all' ? Object.keys(window.manualTests) : [category];

    categories.forEach(cat => {
        if (!window.manualTests[cat]) return;

        output += `🔸 ${cat.toUpperCase()}\n`;
        output += '─'.repeat(30) + '\n';

        window.manualTests[cat].forEach((test, index) => {
            output += `${index + 1}. ${test.name}\n`;
            output += `   ${test.description}\n`;
            output += `   Erwartet: ${test.expected}\n`;
            output += `   Schritte:\n`;
            test.steps.forEach(step => {
                output += `     ${step}\n`;
            });
            output += '\n';
        });
        output += '\n';
    });

    console.log(output);
    return output;
};

// Exportiere Test-Checkliste als druckbares Format
window.exportTestChecklist = function () {
    const checklist = window.printTestChecklist();
    const blob = new Blob([checklist], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laura-backstube-manual-tests-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
};

console.log('🧪 Manuelle Tests geladen. Verwende:');
console.log('- window.printTestChecklist() für alle Tests');
console.log('- window.printTestChecklist("critical") für kritische Tests');
console.log('- window.exportTestChecklist() zum Download der Checkliste');