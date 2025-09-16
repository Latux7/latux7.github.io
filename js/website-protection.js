// website-protection.js - Globaler Passwort-Schutz für die Website

(function () {
    'use strict';

    // Konfiguration
    const WEBSITE_PASSWORD = "laura2025"; // Passwort für die Website
    const SESSION_KEY = "lauras_backstube_access";
    const SESSION_DURATION = 4 * 60 * 60 * 1000; // 4 Stunden in Milliseconds

    // Prüfen ob Zugriff berechtigt ist
    function checkAccess() {
        // WICHTIG: sessionStorage wird bei Tab/Browser-Schließung automatisch gelöscht!
        const savedAccess = sessionStorage.getItem(SESSION_KEY);

        if (savedAccess) {
            try {
                const accessData = JSON.parse(savedAccess);
                const now = Date.now();

                // Prüfen ob Session noch gültig ist
                if (accessData.timestamp && (now - accessData.timestamp) < SESSION_DURATION) {
                    return true; // Zugriff berechtigt
                } else {
                    // Session abgelaufen
                    sessionStorage.removeItem(SESSION_KEY);
                }
            } catch (e) {
                // Fehlerhafte Daten - entfernen
                sessionStorage.removeItem(SESSION_KEY);
            }
        }

        return false; // Kein Zugriff
    }

    // Zugriff gewähren
    function grantAccess() {
        const accessData = {
            timestamp: Date.now(),
            granted: true
        };
        // sessionStorage: Wird automatisch bei Tab/Browser-Schließung gelöscht
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(accessData));
    }

    // Passwort-Modal erstellen und anzeigen
    function showPasswordModal() {
        // Prüfen ob Modal bereits existiert
        if (document.getElementById('websitePasswordModal')) {
            return;
        }

        // Hauptinhalt verstecken
        document.body.style.overflow = 'hidden';
        const originalContent = document.body.innerHTML;

        // Modal HTML erstellen
        const modalHTML = `
            <div id="websitePasswordModal" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #8B4513, #D2691E);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Poppins', Arial, sans-serif;
            ">
                <div style="
                    background: white;
                    padding: 40px;
                    border-radius: 15px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                    animation: modalSlideIn 0.3s ease-out;
                ">
                    <div style="
                        width: 60px;
                        height: 60px;
                        background: linear-gradient(135deg, #8B4513, #D2691E);
                        border-radius: 50%;
                        margin: 0 auto 20px auto;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 30px;
                    ">🍰</div>
                    
                    <h1 style="
                        color: #8B4513;
                        margin-bottom: 10px;
                        font-size: 28px;
                        font-weight: 600;
                    ">Laura's Backstube</h1>
                    
                    <p style="
                        color: #666;
                        margin-bottom: 30px;
                        font-size: 16px;
                        line-height: 1.5;
                    ">Diese Website befindet sich noch in der Entwicklung.<br>
                    Bitte geben Sie das Zugangspasswort ein:</p>
                    
                    <form id="websitePasswordForm" style="margin-bottom: 20px;">
                        <input 
                            type="password" 
                            id="websitePasswordInput" 
                            placeholder="Passwort eingeben..."
                            style="
                                width: 100%;
                                padding: 15px;
                                border: 2px solid #ddd;
                                border-radius: 8px;
                                font-size: 16px;
                                margin-bottom: 20px;
                                box-sizing: border-box;
                                transition: border-color 0.3s ease;
                            "
                            autocomplete="off"
                            required
                        >
                        
                        <button type="submit" style="
                            background: linear-gradient(135deg, #8B4513, #D2691E);
                            color: white;
                            border: none;
                            padding: 15px 30px;
                            border-radius: 8px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            width: 100%;
                            transition: transform 0.2s ease;
                        ">Zugang gewähren</button>
                    </form>
                    
                    <div id="passwordError" style="
                        color: #e74c3c;
                        font-size: 14px;
                        margin-top: 10px;
                        display: none;
                    ">❌ Falsches Passwort. Bitte versuchen Sie es erneut.</div>
                    
                    <div style="
                        color: #999;
                        font-size: 12px;
                        margin-top: 20px;
                        border-top: 1px solid #eee;
                        padding-top: 15px;
                    ">
                        <p>🔒 Sicher & Verschlüsselt</p>
                        <p>Nur für autorisierte Benutzer</p>
                    </div>
                </div>
            </div>
            
            <style>
                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-50px) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                #websitePasswordInput:focus {
                    outline: none;
                    border-color: #8B4513;
                    box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.1);
                }
                
                button:hover {
                    transform: translateY(-2px);
                }
                
                button:active {
                    transform: translateY(0);
                }
            </style>
        `;

        // Gesamten Body-Inhalt durch Modal ersetzen
        document.body.innerHTML = modalHTML;

        // Event-Listener für Passwort-Formular
        const form = document.getElementById('websitePasswordForm');
        const input = document.getElementById('websitePasswordInput');
        const errorDiv = document.getElementById('passwordError');

        // Fokus auf Eingabefeld setzen
        setTimeout(() => input.focus(), 100);

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const enteredPassword = input.value.trim();

            if (enteredPassword === WEBSITE_PASSWORD) {
                // Korrektes Passwort - Zugriff gewähren
                grantAccess();

                // Erfolgsmeldung anzeigen
                document.body.innerHTML = `
                    <div style="
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: linear-gradient(135deg, #27ae60, #2ecc71);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-family: 'Poppins', Arial, sans-serif;
                        text-align: center;
                        z-index: 999999;
                    ">
                        <div>
                            <div style="font-size: 60px; margin-bottom: 20px;">✅</div>
                            <h2 style="margin-bottom: 10px;">Zugang gewährt!</h2>
                            <p>Willkommen bei Laura's Backstube</p>
                            <div style="margin-top: 20px; font-size: 14px; opacity: 0.8;">
                                Seite wird geladen...
                            </div>
                        </div>
                    </div>
                `;

                // Seite nach kurzer Verzögerung neu laden
                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } else {
                // Falsches Passwort
                errorDiv.style.display = 'block';
                input.style.borderColor = '#e74c3c';
                input.style.background = '#fdf2f2';

                // Eingabefeld leeren und Fokus setzen
                input.value = '';
                input.focus();

                // Shake-Animation für das Eingabefeld
                input.style.animation = 'shake 0.5s ease-in-out';
                setTimeout(() => {
                    input.style.animation = '';
                    input.style.borderColor = '#ddd';
                    input.style.background = 'white';
                    errorDiv.style.display = 'none';
                }, 2000);
            }
        });

        // Shake-Animation CSS hinzufügen
        const shakeStyle = document.createElement('style');
        shakeStyle.textContent = `
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
        `;
        document.head.appendChild(shakeStyle);
    }

    // Hauptfunktion - Passwort-Schutz prüfen
    function initWebsiteProtection() {
        // Spezielle Seiten die immer erreichbar sein sollen (optional)
        const publicPages = []; // z.B. ['impressum.html', 'datenschutz.html']
        const currentPage = window.location.pathname.split('/').pop();

        // Prüfen ob aktuelle Seite öffentlich ist
        if (publicPages.includes(currentPage)) {
            return; // Öffentliche Seite - keinen Schutz
        }

        // Zugriff prüfen
        if (!checkAccess()) {
            // Kein Zugriff - Modal anzeigen
            showPasswordModal();
        }
    }

    // Session-Verlängerung bei Aktivität
    function extendSession() {
        const savedAccess = sessionStorage.getItem(SESSION_KEY);
        if (savedAccess) {
            grantAccess(); // Session erneuern
        }
    }

    // Event-Listener für Session-Verlängerung
    document.addEventListener('click', extendSession);
    document.addEventListener('keypress', extendSession);

    // Schutz beim Laden der Seite aktivieren
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWebsiteProtection);
    } else {
        initWebsiteProtection();
    }

    // Globale Funktion für Logout (optional)
    window.websiteLogout = function () {
        sessionStorage.removeItem(SESSION_KEY);
        window.location.reload();
    };

    // Debug-Funktionen (nur für Entwicklung)
    window.debugWebsiteAccess = {
        checkSession: () => checkAccess(),
        clearSession: () => sessionStorage.removeItem(SESSION_KEY),
        getSession: () => sessionStorage.getItem(SESSION_KEY)
    };

})();