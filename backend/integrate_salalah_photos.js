const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'frontend', 'public', 'assets', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// 1. UPDATE HOMEPAGE HERO SLIDESHOW WITH NEW SALALAH WATERFALL & FAZAYAH BAY PHOTOS
appJs = appJs.replace(
  `style="background-image: url('/assets/destinations/salalah-khreef-green-hills.jpg');"`,
  `style="background-image: url('/assets/destinations/salalah-waterfalls-canyon.jpg');"`
);
appJs = appJs.replace(
  `style="background-image: url('/assets/destinations/nizwa-pottery-souq.jpg');"`,
  `style="background-image: url('/assets/destinations/salalah-fazayah-bay-rug.jpg');"`
);

// 2. UPDATE SALALAH DESTINATION CARD ON HOMEPAGE TO FAZAYAH BAY
appJs = appJs.replace(
  `<img src="/assets/destinations/salalah-beach-sunset.jpg" alt="Salalah beach at sunset, Oman" loading="lazy">`,
  `<img src="/assets/destinations/salalah-fazayah-bay-rug.jpg" alt="Fazayah green mountain bay in Salalah, Oman" loading="lazy">`
);

// 3. UPDATE SALALAH HIGHLIGHT CARD (04) IN EDITORIAL SECTION TO FAZAYAH BAY
appJs = appJs.replace(
  `<img src="/assets/destinations/salalah-beach-sunset.jpg" alt="Salalah beach at sunset" loading="lazy" decoding="async" class="jmt-dest-card-img" style="object-position: center center;" onerror="this.onerror=null;this.src='/assets/destinations/salalah-khreef-green-hills.jpg';">`,
  `<img src="/assets/destinations/salalah-fazayah-bay-rug.jpg" alt="Salalah Fazayah green mountain bay during Khareef" loading="lazy" decoding="async" class="jmt-dest-card-img" style="object-position: center 35%;" onerror="this.onerror=null;this.src='/assets/destinations/salalah-waterfalls-canyon.jpg';">`
);

// 4. UPDATE SALALAH REGIONAL SHOWCASE WITH EPIC SALALAH WATERFALLS & DARBAT BOATS
appJs = appJs.replace(
  `<img src="/assets/destinations/salalah-khreef-green-hills.jpg" alt="Salalah green mountains during Khareef season" loading="lazy" class="jmt-region-hero-img">`,
  `<img src="/assets/destinations/salalah-waterfalls-canyon.jpg" alt="Salalah Khareef cascading waterfalls and green canyons" loading="lazy" class="jmt-region-hero-img">`
);

appJs = appJs.replace(
  `<img src="/assets/destinations/salalah-lake.jpg" alt="Salalah natural spring lake and greenery" loading="lazy">`,
  `<img src="/assets/destinations/salalah-darbat-boats-lake.jpg" alt="Wadi Darbat lake and boats in Salalah" loading="lazy">`
);

appJs = appJs.replace(
  `<img src="/assets/destinations/salalah-coast-mountain.jpg" alt="Salalah coastline and mountain cliffs" loading="lazy">`,
  `<img src="/assets/destinations/salalah-misty-coastal-cliffs.jpg" alt="Misty coastal green cliffs in Dhofar Salalah" loading="lazy">`
);

// 5. UPDATE FAMILY TOUR CARD BACKGROUND TO DARBAT BOATS LAKE
appJs = appJs.replace(
  `url('/assets/destinations/salalah-lake.jpg');`,
  `url('/assets/destinations/salalah-darbat-boats-lake.jpg');`
);

// 6. UPDATE DEFAULT SALALAH PACKAGE FALLBACK IMAGE TO SALALAH WATERFALLS CANYON
appJs = appJs.replace(
  `image: '/assets/destinations/salalah-khreef-green-hills.jpg',`,
  `image: '/assets/destinations/salalah-waterfalls-canyon.jpg',`
);

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('Successfully integrated 5 new Salalah photo assets into app.js!');
