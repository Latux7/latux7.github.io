// website-protection.js - Globaler Passwort-Schutz für die Website

(function () {
    'use strict';

    // Konfiguration
    // The website password is no longer stored in-source. We attempt to load it
    // from Firestore document `site_secrets/website`. If Firestore is unreachable
    // we fall back to the legacy in-source value to avoid locking out the site
    // during migration. After you migrate, remove the fallback value.
    let WEBSITE_PASSWORD = null; // legacy plaintext (will be populated only if Firestore contains plaintext)
    let WEBSITE_PASSWORD_HASH = null; // preferred: hex SHA-256 hash loaded from Firestore
    // Fallback SHA-256 for 'laura2025' (used only during migration; remove later)
    const FALLBACK_PASSWORD_HASH = 'c850891c621081d2714c93c007d5867c95668ffc169f8b1f3d4bee8f1e99c58e';
    const SESSION_KEY = "lauras_backstube_access";
    const SESSION_DURATION = 4 * 60 * 60 * 1000; // 4 Stunden in Milliseconds

    // Prevent flash: hide page content until we decide whether to show the
    // password modal. We hide all direct body children except the modal element
    // (#websitePasswordModal) so that when the modal is injected it becomes
    // visible immediately. This style is removed when access is granted.
    const WP_BLOCK_STYLE_ID = 'wp-protect-block-style';
    const WP_REMOVE_FALLBACK_MS = 1000; // fallback to remove block-style after 1s (faster fail-safe)
    let wpFallbackTimer = null;

    (function insertBlockStyle() {
        try {
            if (!document.getElementById(WP_BLOCK_STYLE_ID)) {
                const s = document.createElement('style');
                s.id = WP_BLOCK_STYLE_ID;
                // hide everything except the modal container (when present)
                s.textContent = 'body > *:not(#websitePasswordModal){display:none !important}';
                const target = document.head || document.documentElement;
                target.insertBefore(s, target.firstChild);

                // Safety fallback: if something goes wrong (script error or
                // Firestore hang), remove the blocking style after a short timeout
                // so the site does not remain white for users.
                try {
                    console.info('website-protection: inserted block-style to prevent flash');
                    if (wpFallbackTimer) clearTimeout(wpFallbackTimer);
                    wpFallbackTimer = setTimeout(() => {
                        const el = document.getElementById(WP_BLOCK_STYLE_ID);
                        if (el) {
                            console.warn('website-protection: fallback removing block-style after', WP_REMOVE_FALLBACK_MS, 'ms to avoid white screen');
                            removeBlockStyle();
                        }
                    }, WP_REMOVE_FALLBACK_MS);
                } catch (err) {
                    // ignore fallback errors
                }
            }
        } catch (e) {
            // ignore - best effort only
        }
    })();

    function removeBlockStyle() {
        try {
            const el = document.getElementById(WP_BLOCK_STYLE_ID);
            if (el && el.parentNode) el.parentNode.removeChild(el);
            // clear any pending fallback timer
            try { if (wpFallbackTimer) { clearTimeout(wpFallbackTimer); wpFallbackTimer = null; } } catch (e) { /* ignore */ }
            console.info('website-protection: block-style removed');
        } catch (e) {
            // ignore
        }
    }

    // Quick debug override: if URL contains ?unlock=1, remove the block immediately
    try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('unlock') === '1') {
            console.info('website-protection: debug unlock param detected — removing block-style');
            removeBlockStyle();
        }
    } catch (e) { /* ignore in older browsers */ }

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

    // Zugriff gewähren (setzt Session und entfernt eventuelle Overlays)
    function grantAccess() {
        const accessData = {
            timestamp: Date.now(),
            granted: true
        };
        // sessionStorage: Wird automatisch bei Tab/Browser-Schließung gelöscht
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(accessData));

        // If there is an overlay instance, run its cleanup handler
        try {
            const overlay = document.getElementById('websitePasswordOverlay');
            if (overlay && typeof overlay._cleanup === 'function') overlay._cleanup();
        } catch (e) { /* ignore */ }

        // reveal page content after access granted
        removeBlockStyle();
    }

    // Show password modal as overlay (not replacing body.innerHTML)
    function showPasswordModal() {
        // If overlay already exists, do nothing
        if (document.getElementById('websitePasswordOverlay')) return;

        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = 'websitePasswordOverlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.background = 'linear-gradient(135deg, #8B4513, #D2691E)';
        overlay.style.zIndex = '999999';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.fontFamily = "'Poppins', Arial, sans-serif";

        // Modal content
        const modal = document.createElement('div');
        modal.style.background = 'white';
        modal.style.padding = '40px';
        modal.style.borderRadius = '15px';
        modal.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
        modal.style.textAlign = 'center';
        modal.style.maxWidth = '400px';
        modal.style.width = '90%';
        modal.style.animation = 'modalSlideIn 0.3s ease-out';

        modal.innerHTML = `
            <div style="width:60px;height:60px;background:linear-gradient(135deg,#8B4513,#D2691E);border-radius:50%;margin:0 auto 20px auto;display:flex;align-items:center;justify-content:center;font-size:30px;">\ud83c\udf70</div>
            <h1 style="color:#8B4513;margin-bottom:10px;font-size:28px;font-weight:600;">Laura's Backstube</h1>
            <p style="color:#666;margin-bottom:30px;font-size:16px;line-height:1.5;">Diese Website befindet sich noch in der Entwicklung.<br><br>Bitte geben Sie das Zugangspasswort ein:</p>
            <form id="websitePasswordForm" style="margin-bottom:20px;">
                <input type="password" id="websitePasswordInput" placeholder="Passwort eingeben..." style="width:100%;padding:15px;border:2px solid #ddd;border-radius:8px;font-size:16px;margin-bottom:20px;box-sizing:border-box;transition:border-color 0.3s ease;" autocomplete="off" required>
                <button type="submit" style="background:linear-gradient(135deg,#8B4513,#D2691E);color:white;border:none;padding:15px 30px;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;width:100%;transition:transform 0.2s ease;">Zugang gew\u00e4hren</button>
            </form>
            <div id="passwordError" style="color:#e74c3c;font-size:14px;margin-top:10px;display:none;">\u274c Falsches Passwort. Bitte versuchen Sie es erneut.</div>
            <div style="color:#999;font-size:12px;margin-top:20px;border-top:1px solid #eee;padding-top:15px;"><p>Nur f\u00fcr autorisierte Benutzer</p></div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Prevent page scrolling while modal is open
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // Focus and event handling
        const form = document.getElementById('websitePasswordForm');
        const input = document.getElementById('websitePasswordInput');
        const errorDiv = document.getElementById('passwordError');

        setTimeout(() => input.focus(), 100);

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const enteredPassword = input.value.trim();
            const validate = () => {
                if (WEBSITE_PASSWORD_HASH) {
                    sha256Hex(enteredPassword).then(hex => {
                        if (hex === WEBSITE_PASSWORD_HASH) {
                            grantAccess();
                            window.location.reload();
                        } else {
                            showPasswordError();
                        }
                    }).catch(() => showPasswordError());
                } else if (WEBSITE_PASSWORD) {
                    if (enteredPassword === WEBSITE_PASSWORD) {
                        grantAccess();
                        window.location.reload();
                    } else {
                        showPasswordError();
                    }
                } else {
                    showPasswordError();
                }
            };
            validate();
        });

        function showPasswordError() {
            errorDiv.style.display = 'block';
            input.style.borderColor = '#e74c3c';
            input.style.background = '#fdf2f2';
            input.value = '';
            input.focus();
            input.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                input.style.animation = '';
                input.style.borderColor = '#ddd';
                input.style.background = 'white';
                errorDiv.style.display = 'none';
            }, 2000);
        }

        // Add shake animation style only once
        if (!document.getElementById('wp-shake-style')) {
            const shakeStyle = document.createElement('style');
            shakeStyle.id = 'wp-shake-style';
            shakeStyle.textContent = `
                @keyframes shake { 0%,100%{transform:translateX(0);}25%{transform:translateX(-5px);}75%{transform:translateX(5px);} }
                @keyframes modalSlideIn { from { opacity: 0; transform: translateY(-50px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
            `;
            document.head.appendChild(shakeStyle);
        }

        // store cleanup handler
        overlay._cleanup = function () {
            try { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch (e) { }
            document.body.style.overflow = previousOverflow || '';
        };
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

        // Ensure we have the current website password before showing the modal.
        // Attempt to load from Firestore; if that fails, use a short fallback so
        // existing deployments keep working during the migration.
        loadWebsitePassword().then(() => {
            if (!checkAccess()) {
                // Kein Zugriff - Modal anzeigen
                showPasswordModal();
            } else {
                // already have access - reveal page
                removeBlockStyle();
            }
        }).catch(err => {
            console.warn('Could not load website password from Firestore:', err);
            // If loading failed and we still don't have a password, use a
            // temporary fallback (remove after migration).
            if (!WEBSITE_PASSWORD && !WEBSITE_PASSWORD_HASH) {
                // Use the fallback hash (avoid storing plaintext in-source)
                WEBSITE_PASSWORD_HASH = FALLBACK_PASSWORD_HASH; // FALLBACK: remove after migration
            }

            if (!checkAccess()) {
                // show modal - modal will be visible thanks to the block style
                showPasswordModal();
            } else {
                removeBlockStyle();
            }
        });
    }

    // Load website password from Firestore (document: site_secrets/website)
    // Returns a Promise that resolves when WEBSITE_PASSWORD is set.
    function loadWebsitePassword() {
        return new Promise((resolve, reject) => {
            // If already loaded, resolve immediately
            if (WEBSITE_PASSWORD || WEBSITE_PASSWORD_HASH) return resolve(WEBSITE_PASSWORD || WEBSITE_PASSWORD_HASH);

            // If firebase is not available yet, try to initialize via global config.
            try {
                if (typeof firebase === 'undefined') {
                    return reject(new Error('Firebase SDK not available'));
                }

                if (!firebase.apps || !firebase.apps.length) {
                    if (window.firebaseConfig) {
                        try { firebase.initializeApp(window.firebaseConfig); } catch (e) { /* ignore */ }
                    }
                }

                const db = firebase.firestore();
                db.collection('site_secrets').doc('website').get()
                    .then(doc => {
                        if (doc && doc.exists) {
                            const data = doc.data();
                            if (data) {
                                if (data.passwordHash) {
                                    WEBSITE_PASSWORD_HASH = String(data.passwordHash);
                                    return resolve(WEBSITE_PASSWORD_HASH);
                                }
                                if (data.password) {
                                    // Legacy: plaintext stored in Firestore (not recommended)
                                    WEBSITE_PASSWORD = String(data.password);
                                    return resolve(WEBSITE_PASSWORD);
                                }
                            }
                        }
                        // No password set in Firestore
                        return reject(new Error('No password in site_secrets/website'));
                    }).catch(err => {
                        reject(err);
                    });
            } catch (err) {
                reject(err);
            }
        });
    }

    // Compute SHA-256 hex for a string using Web Crypto API
    function sha256Hex(str) {
        const enc = new TextEncoder();
        const data = enc.encode(str);
        return crypto.subtle.digest('SHA-256', data).then(buf => {
            const hex = Array.prototype.map.call(new Uint8Array(buf), x => ('00' + x.toString(16)).slice(-2)).join('');
            return hex;
        });
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