window.firebaseConfig = {
  apiKey: "AIzaSyAj3x8c439IEqOLe7U_yFPsywwXhZRsIog",
  authDomain: "lauras-backstube.firebaseapp.com",
  projectId: "lauras-backstube",
  storageBucket: "lauras-backstube.firebasestorage.app",
  messagingSenderId: "115340979108",
  appId: "1:115340979108:web:70c2c46052045c5e366f31",
  measurementId: "G-R51RPWTCFZ"
};

// Firebase App initialisieren mit verbesserter Fehlerbehandlung
function initializeFirebaseApp() {

  if (!firebase.apps.length) {
    try {
      firebase.initializeApp(window.firebaseConfig);
    } catch (error) {
      console.error('❌ Fehler bei Firebase-Initialisierung:', error);
      showNotification('Firebase-Verbindung fehlgeschlagen. Bitte prüfen Sie Ihre Internetverbindung oder deaktivieren Sie Adblocker.', 'error');
      return null;
    }
  } else {
    // Firebase app already initialized
  }

  // Firestore mit verbesserter Konfiguration
  const db = firebase.firestore();

  // Firestore-Settings für bessere Kompatibilität
  try {
    // Only apply settings once across the whole app. Multiple calls to
    // initializeFirebaseApp() can happen from different modules; attempting
    // to call `settings()` after Firestore has already been used throws.
    if (!window.__firestoreSettingsApplied) {
      db.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
        experimentalForceLongPolling: true // Hilft bei Adblocker-Problemen
      });
      window.__firestoreSettingsApplied = true;
      // Firestore settings applied
    } else {
      // Firestore settings already applied, skipping
    }
  } catch (settingsError) {
    console.warn('⚠️ Firestore-Settings konnten nicht gesetzt werden:', settingsError);
  }

  // Test-Abfrage um Verbindung zu verifizieren
  db.collection('orders').limit(1).get()
    .then(snapshot => {
      // Firebase connection verified
    })
    .catch(error => {
      console.error('❌ Firebase-Verbindung fehlgeschlagen:', error);
    });

  return db;
}

// Hilfsfunktion für Firestore-Fehlerbehandlung
function handleFirestoreError(error, operation = "Operation") {
  console.error(`${operation} Fehler:`, error);

  if (error.code === 'unavailable' || error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
    showNotification('Verbindung zu Firebase blockiert. Bitte deaktivieren Sie Adblocker für diese Seite.', 'error');
  } else if (error.code === 'permission-denied') {
    showNotification('Keine Berechtigung für diese Aktion.', 'error');
  } else if (error.code === 'unauthenticated') {
    showNotification('Bitte melden Sie sich erneut an.', 'error');
  } else {
    showNotification(`${operation} fehlgeschlagen: ${error.message}`, 'error');
  }
}
