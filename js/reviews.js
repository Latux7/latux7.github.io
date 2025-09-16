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

      // Sterne für jede Kategorie erstellen
      const tasteStars = '★'.repeat(review.taste || 0) + '☆'.repeat(5 - (review.taste || 0));
      const appearanceStars = '★'.repeat(review.appearance || 0) + '☆'.repeat(5 - (review.appearance || 0));
      const serviceStars = '★'.repeat(review.service || 0) + '☆'.repeat(5 - (review.service || 0));
      const overallStars = '★'.repeat(review.overall || 0) + '☆'.repeat(5 - (review.overall || 0));

      // NPS Score visualisieren (1-10 Skala)
      const npsScore = review.nps || 0;
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
            </div>
            <div class="rating-item">
              <span class="rating-label">Aussehen:</span>
              <span class="rating-stars">${appearanceStars}</span>
            </div>
            <div class="rating-item">
              <span class="rating-label">Service:</span>
              <span class="rating-stars">${serviceStars}</span>
            </div>
            <div class="rating-item overall">
              <span class="rating-label">Gesamt:</span>
              <span class="rating-stars">${overallStars}</span>
            </div>
          </div>
          
          <div class="review-nps">
            <span class="nps-label">Weiterempfehlung:</span>
            <span class="nps-score" style="color: ${npsColor}; font-weight: 600;">${npsScore}/10</span>
          </div>
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