// Beispiel-Konfiguration für Firebase (Firestore) - bitte eigene Werte eintragen!
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Beispiel-Konfiguration für SendGrid (Cloud Functions)
const sendGridConfig = {
  apiKey: "YOUR_SENDGRID_API_KEY",
  fromEmail: "noreply@yourdomain.com"
};

export { firebaseConfig, sendGridConfig };
