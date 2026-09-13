const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'frontend', 'public', 'assets', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// 1. UPDATE LUXURY TOUR CARD BACKGROUND TO SALALAH RESORT SUNSET BEACH
appJs = appJs.replace(
  `url('/assets/destinations/muscat-almouj.jpg');`,
  `url('/assets/destinations/salalah-resort-sunset-beach.jpg');`
);

// 2. UPDATE SALALAH REGIONAL SHOWCASE THUMBNAILS TO INCLUDE LUXURY RESORT SUNSET & PALM PROMENADE
appJs = appJs.replace(
  `<img src="/assets/destinations/salalah-misty-coastal-cliffs.jpg" alt="Misty coastal green cliffs in Dhofar Salalah" loading="lazy">`,
  `<img src="/assets/destinations/salalah-resort-sunset-beach.jpg" alt="Salalah luxury beach resort sunset" loading="lazy">`
);

// 3. UPDATE OMAN DESTINATION LANDSCAPE IMAGE IN WHY OMAN SECTION
appJs = appJs.replace(
  `<img src="/assets/destinations/oman-coastal-landscape.jpg" alt="Oman mountain and heritage landscape" loading="lazy" decoding="async" class="jmt-why-oman-img" style="object-position: center center;" onerror="this.onerror=null;this.src='/assets/destinations/oman-wadi-waterfall.jpg';">`,
  `<img src="/assets/destinations/salalah-palm-beach-promenade.jpg" alt="Salalah tropical palm promenade and coastal lawn" loading="lazy" decoding="async" class="jmt-why-oman-img" style="object-position: center center;" onerror="this.onerror=null;this.src='/assets/destinations/oman-coastal-landscape.jpg';">`
);

// 4. UPDATE FINAL CTA BANNER BACKGROUND TO LUXURY RESORT SUNSET BEACH
appJs = appJs.replace(
  `url('/assets/destinations/oman-coastal-landscape.jpg') center/cover no-repeat;`,
  `url('/assets/destinations/salalah-resort-sunset-beach.jpg') center/cover no-repeat;`
);

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('Successfully integrated latest Salalah photo assets into app.js!');
