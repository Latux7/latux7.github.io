// test-fixes.js - Behebung der kritischen Testfehler

// Globale Initialisierung und Fehlerbehebung
(function () {
    'use strict';

    console.log('🔧 Test-Fixes wird geladen...');

    // 1. Firebase Konfiguration sicherstellen
    function ensureFirebaseConfig() {
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase SDK nicht geladen');
            return false;
        }

        if (!window.firebaseConfig) {
            console.error('❌ Firebase Konfiguration fehlt');
            return false;
        }

        console.log('✅ Firebase Konfiguration verfügbar');
        return true;
    }

    // 2. Preiskonfiguration sicherstellen
    function ensurePriceConfig() {
        if (!window.priceConfig) {
            console.error('❌ Preiskonfiguration fehlt');
            return false;
        }

        console.log('✅ Preiskonfiguration geladen:', Object.keys(window.priceConfig));
        return true;
    }

    // 3. EmailJS Konfiguration sicherstellen
    function ensureEmailJSConfig() {
        if (typeof emailjs === 'undefined') {
            console.warn('⚠️ EmailJS SDK nicht geladen');
            return false;
        }

        if (!window.emailConfig) {
            console.error('❌ EmailJS Konfiguration fehlt');
            return false;
        }

        // EmailJS initialisieren
        try {
            emailjs.init(window.emailConfig.publicKey);
            console.log('✅ EmailJS initialisiert');
            return true;
        } catch (error) {
            console.error('❌ EmailJS Initialisierung fehlgeschlagen:', error);
            return false;
        }
    }

    // 4. Email Templates sicherstellen
    function ensureEmailTemplates() {
        if (!window.emailTemplateManager) {
            console.error('❌ EmailTemplateManager nicht verfügbar');
            return false;
        }

        if (!window.emailTemplateManager.templates) {
            console.error('❌ Email Templates nicht definiert');
            return false;
        }

        console.log('✅ Email Templates verfügbar:', Object.keys(window.emailTemplateManager.templates));
        return true;
    }

    // 5. Order Limit Manager sicherstellen
    function ensureOrderLimitManager() {
        if (!window.orderLimitManager) {
            console.error('❌ OrderLimitManager nicht verfügbar');
            return false;
        }

        console.log('✅ OrderLimitManager verfügbar');
        return true;
    }

    // 6. Admin Dashboard Klassen sicherstellen
    function ensureAdminClasses() {
        const requiredClasses = ['AdminDashboard', 'OrderManager', 'ArchiveManager', 'NotificationManager'];
        const missingClasses = [];

        requiredClasses.forEach(className => {
            if (typeof window[className] === 'undefined' && !window[className.toLowerCase()]) {
                missingClasses.push(className);
            }
        });

        if (missingClasses.length > 0) {
            console.warn('⚠️ Fehlende Admin-Klassen:', missingClasses);
            return false;
        }

        console.log('✅ Admin Dashboard Klassen verfügbar');
        return true;
    }

    // 7. Admin Login Formular sicherstellen (nur auf admin.html)
    function ensureAdminLoginForm() {
        if (!document.getElementById('adminPanel')) {
            return true; // Nicht auf admin.html
        }

        if (!window.adminSecurity) {
            console.error('❌ Admin Security System nicht verfügbar');
            return false;
        }

        console.log('✅ Admin Login System verfügbar');
        return true;
    }

    // Haupt-Testfunktion
    function runTestFixes() {
        console.log('🧪 Starte kritische Tests...');

        const tests = [
            { name: 'Firebase Konfiguration', fn: ensureFirebaseConfig, critical: true },
            { name: 'Preiskonfiguration', fn: ensurePriceConfig, critical: true },
            { name: 'EmailJS Konfiguration', fn: ensureEmailJSConfig, critical: true },
            { name: 'Email Templates', fn: ensureEmailTemplates, critical: false },
            { name: 'Order Limit Manager', fn: ensureOrderLimitManager, critical: true },
            { name: 'Admin Dashboard Klassen', fn: ensureAdminClasses, critical: false },
            { name: 'Admin Login Formular', fn: ensureAdminLoginForm, critical: true }
        ];

        let passed = 0;
        let failed = 0;
        let criticalFailed = 0;

        tests.forEach(test => {
            try {
                const result = test.fn();
                if (result) {
                    passed++;
                    console.log(`✅ ${test.name}: BESTANDEN`);
                } else {
                    failed++;
                    if (test.critical) criticalFailed++;
                    console.log(`❌ ${test.name}: FEHLGESCHLAGEN ${test.critical ? '(KRITISCH)' : ''}`);
                }
            } catch (error) {
                failed++;
                if (test.critical) criticalFailed++;
                console.error(`💥 ${test.name}: FEHLER - ${error.message}`);
            }
        });

        console.log(`\n📊 Testergebnisse:`);
        console.log(`✅ Bestanden: ${passed}`);
        console.log(`❌ Fehlgeschlagen: ${failed}`);
        console.log(`🚨 Kritische Fehler: ${criticalFailed}`);

        if (criticalFailed === 0) {
            console.log('🎉 Alle kritischen Tests bestanden!');
            if (typeof showNotification === 'function') {
                showNotification('Alle kritischen Tests bestanden!', 'success');
            }
        } else {
            console.warn(`⚠️ ${criticalFailed} kritische Tests fehlgeschlagen!`);
            if (typeof showNotification === 'function') {
                showNotification(`${criticalFailed} kritische Tests fehlgeschlagen!`, 'error');
            }
        }

        return { passed, failed, criticalFailed };
    }

    // Warten bis DOM geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(runTestFixes, 500); // Kurze Verzögerung für andere Scripts
        });
    } else {
        setTimeout(runTestFixes, 500);
    }

    // Globale Funktion für manuellen Test
    window.runTestFixes = runTestFixes;

})();