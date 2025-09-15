// Firebase Cloud Function: Sende E-Mail mit SendGrid, wenn Bestellung auf 'fertig' gesetzt wird
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

admin.initializeApp();
const db = admin.firestore();

// SendGrid API-Key aus Umgebungsvariable oder Konfig
const SENDGRID_API_KEY = functions.config().sendgrid.key || 'SENDGRID_API_KEY';
const FROM_EMAIL = functions.config().sendgrid.from || 'noreply@yourdomain.com';
const BASE_URL = 'https://username.github.io/bewerten.html?orderId=';

sgMail.setApiKey(SENDGRID_API_KEY);

exports.sendReviewMailOnStatus = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.status !== 'fertig' && after.status === 'fertig') {
      const email = after.email;
      const name = after.name;
      const orderId = context.params.orderId;
      const reviewLink = `${BASE_URL}${orderId}`;
      const msg = {
        to: email,
        from: FROM_EMAIL,
        subject: 'Ihre Torte ist fertig – Wir freuen uns auf Ihr Feedback!',
        html: `<p>Liebe/r ${name},</p>
          <p>Ihre Torte ist fertig und kann abgeholt/geliefert werden! Wir hoffen, sie schmeckt Ihnen.</p>
          <p>Wir würden uns sehr über eine Bewertung freuen. Klicken Sie dazu einfach auf folgenden Link:</p>
          <p><a href="${reviewLink}">${reviewLink}</a></p>
          <p>Herzliche Grüße<br>Ihr Tortenteam</p>`
      };
      try {
        await sgMail.send(msg);
        console.log('Bewertungslink gesendet an', email);
      } catch (err) {
        console.error('SendGrid Fehler:', err);
      }
    }
    return null;
  });
