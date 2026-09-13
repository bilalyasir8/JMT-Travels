const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'frontend', 'public', 'assets', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// 1. UPDATE HOMEPAGE HERO SLIDESHOW WITH NEW SUNSET & GRAND MOSQUE PHOTOS
appJs = appJs.replace(
  `style="background-image: url('/assets/destinations/muscat-mutrah-waterfront.jpg');"`,
  `style="background-image: url('/assets/destinations/muscat-mutrah-sunset-bay.jpg');"`
);
appJs = appJs.replace(
  `style="background-image: url('/assets/destinations/oman-mountain-fort.jpg');"`,
  `style="background-image: url('/assets/destinations/muscat-grand-mosque-front.jpg');"`
);
appJs = appJs.replace(
  `style="background-image: url('/assets/destinations/nizwa-fort.jpg');"`,
  `style="background-image: url('/assets/destinations/nizwa-pottery-souq.jpg');"`
);

// 2. UPDATE HOMEPAGE DESTINATION CARD FOR MUSCAT TO SUNSET BAY
appJs = appJs.replace(
  `<img src="/assets/destinations/muscat-mutrah-waterfront.jpg" alt="Mutrah waterfront in Muscat, Oman" loading="lazy">`,
  `<img src="/assets/destinations/muscat-mutrah-sunset-bay.jpg" alt="Mutrah bay sunset in Muscat, Oman" loading="lazy">`
);

// 3. UPDATE MUSCAT REGIONAL SHOWCASE THUMBS TO INCLUDE GRAND MOSQUE FRONT
appJs = appJs.replace(
  `<img src="/assets/destinations/muscat-mosque-arch.jpg" alt="Muscat architecture and grand mosque arch" loading="lazy">`,
  `<img src="/assets/destinations/muscat-grand-mosque-front.jpg" alt="Sultan Qaboos Grand Mosque front view in Muscat" loading="lazy">`
);

// 4. UPDATE NIZWA REGIONAL SHOWCASE THUMBS TO INCLUDE POTTERY SOUQ & FORT MINARET VIEW
appJs = appJs.replace(
  `<img src="/assets/destinations/nizwa-market.jpg" alt="Nizwa traditional souq and market" loading="lazy">`,
  `<img src="/assets/destinations/nizwa-pottery-souq.jpg" alt="Nizwa traditional pottery souq and heritage cafe" loading="lazy">`
);
appJs = appJs.replace(
  `<img src="/assets/destinations/oman-fort-courtyard.jpg" alt="Oman historic fort courtyard" loading="lazy">`,
  `<img src="/assets/destinations/oman-fort-minaret-view.jpg" alt="Historic Omani fort citadel and minaret view" loading="lazy">`
);

// 5. UPDATE CULTURAL TOUR CARD BACKGROUND TO POTTERY SOUQ
appJs = appJs.replace(
  `url('/assets/destinations/nizwa-heritage-village.jpg');`,
  `url('/assets/destinations/nizwa-pottery-souq.jpg');`
);

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('Successfully integrated 5 additional Oman photo assets into app.js!');
