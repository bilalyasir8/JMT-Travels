const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'frontend', 'public', 'assets', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// 1. UPDATE HIGHLIGHT CARD 05 (NIZWA & BAHLA FORTS) TO USE INNER FORT RAMPARTS IMAGE
appJs = appJs.replace(
  `<img src="/assets/destinations/nizwa-fort.jpg" alt="Historic Nizwa Fort in Oman" loading="lazy" decoding="async" class="jmt-dest-card-img" style="object-position: center 30%;" onerror="this.onerror=null;this.src='/assets/destinations/nizwa-heritage-village.jpg';">`,
  `<img src="/assets/destinations/oman-fort-inner-ramparts.jpg" alt="Historic Nizwa and Bahla fort inner ramparts and stone stairs in Oman" loading="lazy" decoding="async" class="jmt-dest-card-img" style="object-position: center center;" onerror="this.onerror=null;this.src='/assets/destinations/nizwa-fort-roof-minaret.jpg';">`
);

// 2. UPDATE NIZWA REGIONAL SHOWCASE HERO & THUMBS
appJs = appJs.replace(
  `<img src="/assets/destinations/nizwa-fort.jpg" alt="Historic Nizwa Fort in Oman" loading="lazy" class="jmt-region-hero-img" style="object-position: center 30%;">`,
  `<img src="/assets/destinations/nizwa-fort-roof-minaret.jpg" alt="Nizwa fort citadel rooftop and mosque minaret view" loading="lazy" class="jmt-region-hero-img" style="object-position: center center;">`
);

appJs = appJs.replace(
  `<img src="/assets/destinations/nizwa-pottery-souq.jpg" alt="Nizwa traditional pottery souq and heritage cafe" loading="lazy">`,
  `<img src="/assets/destinations/nizwa-pottery-fountain.jpg" alt="Nizwa traditional pottery market fountain courtyard" loading="lazy">`
);

appJs = appJs.replace(
  `<img src="/assets/destinations/nizwa-heritage-village.jpg" alt="Nizwa traditional heritage village" loading="lazy">`,
  `<img src="/assets/destinations/oman-heritage-family-square.jpg" alt="Omani traditional village square and heritage courtyard" loading="lazy">`
);

appJs = appJs.replace(
  `<img src="/assets/destinations/oman-fort-minaret-view.jpg" alt="Historic Omani fort citadel and minaret view" loading="lazy">`,
  `<img src="/assets/destinations/oman-fort-inner-ramparts.jpg" alt="Historic fort inner ramparts and wooden stairs" loading="lazy">`
);

// 3. UPDATE CULTURAL TOUR CARD BACKGROUND TO HERITAGE FAMILY SQUARE
appJs = appJs.replace(
  `url('/assets/destinations/nizwa-pottery-souq.jpg');`,
  `url('/assets/destinations/oman-heritage-family-square.jpg');`
);

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('Successfully integrated heritage photo assets into app.js!');
