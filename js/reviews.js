// reviews.js - Bewertungen für die Startseite laden und anzeigen

// Bewertungen laden und anzeigen
async function loadAndDisplayReviews() {
  try {
    const reviewsSnapshot = await firebase.firestore().collection('reviews')
      .orderBy('created', 'desc')
      .limit(12) // Maximal 12 Bewertungen anzeigen
      .get();

    const reviewsGrid = document.getElementById('reviewsGrid');

    if (reviewsSnapshot.empty) {
      reviewsGrid.innerHTML = '<div class="no-reviews">Noch keine Bewertungen vorhanden.</div>';
      return;
    }

    let reviewsHTML = '';
    reviewsSnapshot.forEach(doc => {
      const review = doc.data();
      console.log('Review-Daten:', review); // Debug-Ausgabe für Datenstruktur

      // Sichere Feldextraktion mit verschiedenen möglichen Feldnamen
      const taste = review.taste || review.geschmack || 0;
      const appearance = review.appearance || review.aussehen || 0;
      const service = review.service || review.bedienung || 0;
      const overall = review.overall || review.gesamt || 0;
      const nps = review.nps || review.weiterempfehlung || 0;

      // Sterne für jede Kategorie erstellen (Validierung auf 1-5 Bereich)
      const tasteStars = '★'.repeat(Math.max(0, Math.min(5, taste))) + '☆'.repeat(5 - Math.max(0, Math.min(5, taste)));
      const appearanceStars = '★'.repeat(Math.max(0, Math.min(5, appearance))) + '☆'.repeat(5 - Math.max(0, Math.min(5, appearance)));
      const serviceStars = '★'.repeat(Math.max(0, Math.min(5, service))) + '☆'.repeat(5 - Math.max(0, Math.min(5, service)));
      const overallStars = '★'.repeat(Math.max(0, Math.min(5, overall))) + '☆'.repeat(5 - Math.max(0, Math.min(5, overall)));

      // NPS Score validieren (1-10 Skala)
      const npsScore = Math.max(0, Math.min(10, nps));
      const npsColor = npsScore >= 9 ? '#4CAF50' : npsScore >= 7 ? '#FF9800' : '#f44336';

      // Datum formatieren (sichere Behandlung von Firestore Timestamps)
      const reviewDate = formatDate(review.created);

      reviewsHTML += `
        <div class="review-card">
          <div class="review-header">
            <div class="review-date">${reviewDate}</div>
          </div>
          
          <div class="review-ratings">
            <div class="rating-item">
              <span class="rating-label">Geschmack:</span>
              <span class="rating-stars">${tasteStars}</span>
              <span class="rating-value">(${taste}/5)</span>
            </div>
            <div class="rating-item">
              <span class="rating-label">Aussehen:</span>
              <span class="rating-stars">${appearanceStars}</span>
              <span class="rating-value">(${appearance}/5)</span>
            </div>
            <div class="rating-item">
              <span class="rating-label">Service:</span>
              <span class="rating-stars">${serviceStars}</span>
              <span class="rating-value">(${service}/5)</span>
            </div>
            <div class="rating-item overall">
              <span class="rating-label">Gesamt:</span>
              <span class="rating-stars">${overallStars}</span>
              <span class="rating-value">(${overall}/5)</span>
            </div>
          </div>
          
          <div class="review-nps">
            <span class="nps-label">Weiterempfehlung:</span>
            <span class="nps-score" style="color: ${npsColor}; font-weight: 600;">${npsScore}/10</span>
          </div>
          
          ${review.comment || review.kommentar ? `
            <div class="review-comment">
              "${review.comment || review.kommentar}"
            </div>
          ` : ''}
        </div>
      `;
    });

    reviewsGrid.innerHTML = reviewsHTML;
  } catch (error) {
    console.error('Fehler beim Laden der Bewertungen:', error);
    document.getElementById('reviewsGrid').innerHTML =
      '<div class="error-reviews">Bewertungen konnten nicht geladen werden.</div>';
  }
}

// Firebase initialisieren und Bewertungen laden, wenn DOM geladen ist
document.addEventListener("DOMContentLoaded", function () {
  // Firebase konfigurieren (falls noch nicht geschehen)
  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }

  // Bewertungen laden
  loadAndDisplayReviews();
});