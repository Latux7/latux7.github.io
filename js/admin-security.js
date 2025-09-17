// admin-security.js - Erweiterte Sicherheit für Admin-Panel

(function () {
    'use strict';

    // Konfiguration
    // Admin access code is now loaded from Firestore (collection `site_secrets`, doc `admin`).
    // The document should contain `adminHash` (hex SHA-256). A legacy plaintext
    // `code` field is supported during migration.
    let ADMIN_ACCESS_CODE = null; // legacy plaintext (not recommended)
    let ADMIN_ACCESS_HASH = null; // preferred: hex SHA-256
    const FALLBACK_ADMIN_HASH = 'dbf7408ad5bb4580a4e6672c91bea0cfd23eddb065ccf36131793feac622f9e3'; // hash of 'tortenadmin2025' - remove after migration
    const ADMIN_SESSION_KEY = "lauras_admin_session";
    const ADMIN_SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 Stunden
    const MAX_LOGIN_ATTEMPTS = 10;
    const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 Minuten Sperrzeit

    // Admin-spezifische Sicherheitsmaßnahmen
    const adminSecurity = {

        // Prüfen ob auf Admin-Seite (unterstützt /admin, /admin.html und /admin/)
        isAdminPage() {
            const path = window.location.pathname.toLowerCase();
            return path.includes('admin.html') || path.endsWith('admin.html') ||
                path === '/admin' || path === '/admin/' || path.endsWith('/admin') || path.endsWith('/admin/');
        },

        // Prüfen ob Admin-Session gültig ist
        checkAdminSession() {
            const savedSession = localStorage.getItem(ADMIN_SESSION_KEY);

            if (savedSession) {
                try {
                    const sessionData = JSON.parse(savedSession);
                    const now = Date.now();

                    if (sessionData.timestamp && (now - sessionData.timestamp) < ADMIN_SESSION_DURATION) {
                        return true;
                    } else {
                        this.clearAdminSession();
                    }
                } catch (e) {
                    this.clearAdminSession();
                }
            }

            return false;
        },

        // Admin-Session erstellen
        createAdminSession() {
            const sessionData = {
                timestamp: Date.now(),
                granted: true,
                // Do not store plaintext codes in localStorage; keep marker only
                source: 'firestore'
            };
            localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessionData));
        },

        // Admin-Session löschen
        clearAdminSession() {
            localStorage.removeItem(ADMIN_SESSION_KEY);
        },

        // Login-Versuche verwalten
        getLoginAttempts() {
            const attempts = localStorage.getItem('admin_login_attempts');
            return attempts ? JSON.parse(attempts) : { count: 0, lastAttempt: 0 };
        },

        incrementLoginAttempts() {
            const attempts = this.getLoginAttempts();
            attempts.count++;
            attempts.lastAttempt = Date.now();
            localStorage.setItem('admin_login_attempts', JSON.stringify(attempts));
            return attempts;
        },

        clearLoginAttempts() {
            localStorage.removeItem('admin_login_attempts');
        },

        isLockedOut() {
            const attempts = this.getLoginAttempts();
            const now = Date.now();

            if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
                const timeSinceLastAttempt = now - attempts.lastAttempt;
                if (timeSinceLastAttempt < LOCKOUT_DURATION) {
                    return {
                        locked: true,
                        timeRemaining: LOCKOUT_DURATION - timeSinceLastAttempt
                    };
                } else {
                    // Sperrzeit abgelaufen - Versuche zurücksetzen
                    this.clearLoginAttempts();
                    return { locked: false };
                }
            }

            return { locked: false };
        },

        // Erweiterte Admin-Anmeldung
        showAdminLoginModal() {
            const lockStatus = this.isLockedOut();

            if (lockStatus.locked) {
                this.showLockoutModal(lockStatus.timeRemaining);
                return;
            }

            // Hauptinhalt verstecken
            document.body.style.overflow = 'hidden';

            const modalHTML = `
                <div id="adminSecurityModal" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, #1a1a1a, #2c3e50);
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
                        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                        text-align: center;
                        max-width: 450px;
                        width: 90%;
                        border: 3px solid #e74c3c;
                    ">
                        <div style="
                            width: 80px;
                            height: 80px;
                            background: linear-gradient(135deg, #e74c3c, #c0392b);
                            border-radius: 50%;
                            margin: 0 auto 20px auto;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 40px;
                            color: white;
                        ">🔒</div>
                        
                        <h1 style="
                            color: #e74c3c;
                            margin-bottom: 10px;
                            font-size: 24px;
                            font-weight: 600;
                        ">⚠️ RESTRICTED ACCESS</h1>
                        
                        <h2 style="
                            color: #2c3e50;
                            margin-bottom: 20px;
                            font-size: 18px;
                        ">Admin-Bereich</h2>
                        
                        <p style="
                            color: #666;
                            margin-bottom: 30px;
                            font-size: 14px;
                            line-height: 1.5;
                        ">Dieser Bereich ist nur für autorisierte Administratoren zugänglich.<br>
                        Geben Sie den Admin-Code ein:</p>
                        
                        <form id="adminSecurityForm" style="margin-bottom: 20px;">
                            <input 
                                type="password" 
                                id="adminCodeInput" 
                                placeholder="Admin-Code eingeben..."
                                style="
                                    width: 100%;
                                    padding: 15px;
                                    border: 2px solid #e74c3c;
                                    border-radius: 8px;
                                    font-size: 16px;
                                    margin-bottom: 20px;
                                    box-sizing: border-box;
                                    text-align: center;
                                    font-family: monospace;
                                    background: #f8f9fa;
                                "
                                autocomplete="off"
                                required
                                maxlength="50"
                            >
                            
                            <button type="submit" style="
                                background: linear-gradient(135deg, #e74c3c, #c0392b);
                                color: white;
                                border: none;
                                padding: 15px 30px;
                                border-radius: 8px;
                                font-size: 16px;
                                font-weight: 600;
                                cursor: pointer;
                                width: 100%;
                                transition: all 0.3s ease;
                            ">🔓 Admin-Zugang</button>
                        </form>
                        
                        <div id="adminSecurityError" style="
                            color: #e74c3c;
                            font-size: 14px;
                            margin-top: 15px;
                            display: none;
                            background: #fdf2f2;
                            padding: 10px;
                            border-radius: 5px;
                            border: 1px solid #fecaca;
                        "></div>
                        
                        <div style="
                            margin-top: 25px;
                            padding-top: 20px;
                            border-top: 1px solid #eee;
                            font-size: 12px;
                            color: #999;
                        ">
                            <p>🛡️ <strong>Sicherheitshinweise:</strong></p>
                            <p>• Max. ${MAX_LOGIN_ATTEMPTS} Versuche • 15min Sperre bei Fehlversuchen</p>
                            <p>• Alle Zugriffe werden protokolliert</p>
                            <p>• Bei unbefugtem Zugriff: Zur Startseite zurückkehren</p>
                            <a href="index.html" style="color: #3498db; text-decoration: none; font-weight: 600;">
                                ← Zurück zur Startseite
                            </a>
                        </div>
                    </div>
                </div>
            `;

            document.body.innerHTML = modalHTML;

            const form = document.getElementById('adminSecurityForm');
            const input = document.getElementById('adminCodeInput');
            const errorDiv = document.getElementById('adminSecurityError');

            setTimeout(() => input.focus(), 100);

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAdminLogin(input.value.trim(), errorDiv, input);
            });
        },

        // Sperrzeit-Modal anzeigen
        showLockoutModal(timeRemaining) {
            const minutes = Math.ceil(timeRemaining / 60000);

            document.body.innerHTML = `
                <div style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, #8b0000, #dc143c);
                    z-index: 999999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-family: 'Poppins', Arial, sans-serif;
                    text-align: center;
                ">
                    <div style="max-width: 500px; padding: 40px;">
                        <div style="font-size: 80px; margin-bottom: 20px;">🚫</div>
                        <h1 style="margin-bottom: 20px; font-size: 28px;">ZUGRIFF GESPERRT</h1>
                        <p style="font-size: 18px; margin-bottom: 20px; opacity: 0.9;">
                            Zu viele fehlgeschlagene Anmeldeversuche!
                        </p>
                        <p style="font-size: 16px; margin-bottom: 30px;">
                            Versuchen Sie es in <strong>${minutes} Minuten</strong> erneut.
                        </p>
                        <a href="index.html" style="
                            display: inline-block;
                            background: rgba(255,255,255,0.2);
                            color: white;
                            padding: 15px 30px;
                            border-radius: 8px;
                            text-decoration: none;
                            font-weight: 600;
                            transition: background 0.3s ease;
                        ">Zur Startseite</a>
                        <div style="margin-top: 30px; font-size: 12px; opacity: 0.7;">
                            Sicherheitsprozedur aktiviert • Alle Versuche werden protokolliert
                        </div>
                    </div>
                </div>
            `;
        },

        // Admin-Login verarbeiten
        handleAdminLogin(enteredCode, errorDiv, input) {
            // Validate by comparing hashes when available. If only plaintext is
            // present (legacy), compare directly.
            const validate = () => {
                if (ADMIN_ACCESS_HASH) {
                    // compute SHA-256 of enteredCode and compare
                    sha256Hex(enteredCode).then(hex => {
                        if (hex === ADMIN_ACCESS_HASH) {
                            this.clearLoginAttempts();
                            this.createAdminSession();
                            window.location.reload();
                        } else {
                            onFailed();
                        }
                    }).catch(() => onFailed());
                } else if (ADMIN_ACCESS_CODE) {
                    if (enteredCode === ADMIN_ACCESS_CODE) {
                        this.clearLoginAttempts();
                        this.createAdminSession();
                        window.location.reload();
                    } else {
                        onFailed();
                    }
                } else {
                    // No secret available - deny access
                    onFailed();
                }
            };

            const onFailed = () => {
                // Falscher Code
                const attempts = this.incrementLoginAttempts();
                const remaining = MAX_LOGIN_ATTEMPTS - attempts.count;

                if (remaining > 0) {
                    errorDiv.innerHTML = `
                        ❌ <strong>Falscher Admin-Code!</strong><br>
                        Noch ${remaining} Versuch${remaining !== 1 ? 'e' : ''} übrig.
                    `;
                    errorDiv.style.display = 'block';
                } else {
                    // Maximale Versuche erreicht
                    this.showLockoutModal(LOCKOUT_DURATION);
                    return;
                }

                input.value = '';
                input.focus();
                input.style.borderColor = '#e74c3c';
                input.style.background = '#fdf2f2';

                // Shake-Animation
                input.style.animation = 'shake 0.5s ease-in-out';
                setTimeout(() => {
                    input.style.animation = '';
                    input.style.borderColor = '#e74c3c';
                    input.style.background = '#f8f9fa';
                }, 1000);
            };

            validate();
        },

        // Admin-Schutz initialisieren
        initAdminSecurity() {
            if (!this.isAdminPage()) {
                return; // Nicht auf Admin-Seite
            }

            // Load admin secret first, then show login if not authenticated
            loadAdminSecret().then(() => {
                if (!this.checkAdminSession()) {
                    this.showAdminLoginModal();
                }
            }).catch(err => {
                console.warn('Could not load admin secret:', err);
                // fallback to hardcoded hash during migration
                if (!ADMIN_ACCESS_HASH && !ADMIN_ACCESS_CODE) {
                    ADMIN_ACCESS_HASH = FALLBACK_ADMIN_HASH;
                }
                if (!this.checkAdminSession()) {
                    this.showAdminLoginModal();
                }
            });
        },

        // Session verlängern bei Aktivität
        extendAdminSession() {
            if (this.isAdminPage() && this.checkAdminSession()) {
                this.createAdminSession();
            }
        }
    };

    // Event-Listener für Session-Verlängerung
    document.addEventListener('click', () => adminSecurity.extendAdminSession());
    document.addEventListener('keypress', () => adminSecurity.extendAdminSession());

    // Admin-Schutz beim Laden aktivieren
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => adminSecurity.initAdminSecurity());
    } else {
        adminSecurity.initAdminSecurity();
    }

    // Globale Admin-Funktionen
    window.adminSecurity = {
        logout: () => {
            adminSecurity.clearAdminSession();
            window.location.href = 'index.html';
        },

        checkSession: () => adminSecurity.checkAdminSession(),

        isLocked: () => adminSecurity.isLockedOut(),

        // Debug-Funktionen (nur für Entwicklung)
        debug: {
            clearAttempts: () => adminSecurity.clearLoginAttempts(),
            getAttempts: () => adminSecurity.getLoginAttempts(),
            clearSession: () => adminSecurity.clearAdminSession()
        }
    };

    // Shake-Animation hinzufügen
    const shakeStyle = document.createElement('style');
    shakeStyle.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }
    `;
    document.head.appendChild(shakeStyle);

    // --- Helper: Load admin secret from Firestore ---
    function sha256Hex(str) {
        const enc = new TextEncoder();
        const data = enc.encode(str);
        return crypto.subtle.digest('SHA-256', data).then(buf => {
            const hex = Array.prototype.map.call(new Uint8Array(buf), x => ('00' + x.toString(16)).slice(-2)).join('');
            return hex;
        });
    }

    function loadAdminSecret() {
        return new Promise((resolve, reject) => {
            if (ADMIN_ACCESS_HASH || ADMIN_ACCESS_CODE) return resolve(true);

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
                db.collection('site_secrets').doc('admin').get()
                    .then(doc => {
                        if (doc && doc.exists) {
                            const data = doc.data();
                            if (data) {
                                if (data.adminHash) {
                                    ADMIN_ACCESS_HASH = String(data.adminHash);
                                    return resolve(true);
                                }
                                if (data.code) {
                                    ADMIN_ACCESS_CODE = String(data.code);
                                    return resolve(true);
                                }
                            }
                        }
                        return reject(new Error('No admin secret found'));
                    }).catch(err => reject(err));
            } catch (err) {
                reject(err);
            }
        });
    }

})();