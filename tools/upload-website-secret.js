/*
Node helper to upload a secret password hash to Firestore using firebase-admin.
Usage (locally):
  1) Create a service account JSON and set GOOGLE_APPLICATION_CREDENTIALS to its path.
  2) node tools/upload-website-secret.js "YourStrongPassword" [website|admin]

The script computes a SHA-256 hash and stores it in `site_secrets/website` or
`site_secrets/admin` (field `passwordHash` or `adminHash`). Do NOT commit
service account JSON to the repo.
*/

const admin = require('firebase-admin');
const fs = require('fs');

const pwd = process.argv[2];
const target = process.argv[3] || 'website'; // 'website' or 'admin'
if (!pwd) {
    console.error('Usage: node tools/upload-website-secret.js <secret-password> [website|admin]');
    process.exit(1);
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Please set GOOGLE_APPLICATION_CREDENTIALS to the service account JSON path.');
    process.exit(1);
}

try {
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
} catch (e) {
    // ignore if already initialized
}

const db = admin.firestore();

(async function () {
    try {
        // Compute SHA-256 hash (hex) and store only the hash in Firestore.
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(pwd).digest('hex');

        const docRef = db.collection('site_secrets').doc(target);
        const payload = (target === 'admin') ? { adminHash: hash } : { passwordHash: hash };
        payload.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        await docRef.set(payload, { merge: true });
        console.log(`Password hash uploaded to site_secrets/${target}`);
    } catch (err) {
        console.error('Failed to upload secret:', err);
        process.exit(2);
    }
})();
