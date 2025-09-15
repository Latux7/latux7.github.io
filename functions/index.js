// Firebase Cloud Function: E-Mail-Benachrichtigung bei Statusänderung (EmailJS Integration)
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const BASE_URL = 'https://latux7.github.io/bewerten.html?orderId=';

exports.sendReviewMailOnStatus = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.status !== 'fertig' && after.status === 'fertig') {
      const orderId = context.params.orderId;
      const reviewLink = `${BASE_URL}${orderId}`;

      // Log für Debugging - E-Mail wird über Frontend/EmailJS gesendet
      console.log('Bestellung fertig, Review-Link:', reviewLink);
      console.log('Kunde:', after.name || 'unbekannt');
    }
    return null;
  });
