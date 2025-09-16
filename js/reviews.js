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

      // Sichere Feldextraktion mit verschiedenen möglichen Feldnamen (deutsche Felder bevorzugt)
      const taste = review.geschmack || review.taste || 0;
      const appearance = review.aussehen || review.appearance || 0;
      const service = review.service || review.bedienung || 0;
      const overall = review.gesamt || review.overall || 0;
      const nps = review.empfehlung || review.nps || review.weiterempfehlung || 0;

      // Validierung der Werte (1-5 für Sterne, 1-10 für NPS)
      const validTaste = Math.max(0, Math.min(5, taste));
      const validAppearance = Math.max(0, Math.min(5, appearance));
      const validService = Math.max(0, Math.min(5, service));
      const validOverall = Math.max(0, Math.min(5, overall));
      const validNps = Math.max(0, Math.min(10, nps));

      // Sterne für jede Kategorie erstellen
      const tasteStars = '★'.repeat(validTaste) + '☆'.repeat(5 - validTaste);
      const appearanceStars = '★'.repeat(validAppearance) + '☆'.repeat(5 - validAppearance);
      const serviceStars = '★'.repeat(validService) + '☆'.repeat(5 - validService);
      const overallStars = '★'.repeat(validOverall) + '☆'.repeat(5 - validOverall);

      // NPS Score Farbe
      const npsColor = validNps >= 9 ? '#4CAF50' : validNps >= 7 ? '#FF9800' : '#f44336';

      // Datum formatieren (sichere Behandlung von Firestore Timestamps)
      const reviewDate = formatDate(review.created);

      // KEINE Kundeninformationen oder Kommentare auf Homepage anzeigen!
      reviewsHTML += `
        <div class="review-card">
          <div class="review-header">
            <div class="review-date">${reviewDate}</div>
          </div>
          
          <div class="review-ratings">
            <div class="rating-item">
              <span class="rating-label">Geschmack:</span>
              <span class="rating-stars">${tasteStars}</span>
              <span class="rating-value">(${validTaste}/5)</span>
            </div>
            <div class="rating-item">
              <span class="rating-label">Aussehen:</span>
              <span class="rating-stars">${appearanceStars}</span>
              <span class="rating-value">(${validAppearance}/5)</span>
            </div>
            <div class="rating-item">
              <span class="rating-label">Service:</span>
              <span class="rating-stars">${serviceStars}</span>
              <span class="rating-value">(${validService}/5)</span>
            </div>
            <div class="rating-item overall">
              <span class="rating-label">Gesamt:</span>
              <span class="rating-stars">${overallStars}</span>
              <span class="rating-value">(${validOverall}/5)</span>
            </div>
          </div>
          
          <div class="review-nps">
            <span class="nps-label">Weiterempfehlung:</span>
            <span class="nps-score" style="color: ${npsColor}; font-weight: 600;">${validNps}/10</span>
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