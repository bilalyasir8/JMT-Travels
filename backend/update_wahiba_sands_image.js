const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'frontend', 'public', 'assets', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// REPLACE WAHIBA SANDS DESERT SAFARI CARD IMAGE IN TOP OMAN TOUR HIGHLIGHTS
const oldCardMarkup = `<img src="/assets/destinations/salalah_2.jpg" alt="Wahiba Sands desert landscape and golden dunes" loading="lazy" decoding="async" class="jmt-dest-card-img" onerror="this.onerror=null;this.src='/assets/destinations/dubai_1.jpg';">`;

const newCardMarkup = `<img src="/assets/destinations/wahiba-sands-desert-safari.jpg" alt="Wahiba Sands desert camel safari and golden dunes in Oman" loading="lazy" decoding="async" class="jmt-dest-card-img" style="object-position: center center;" onerror="this.onerror=null;this.src='/assets/destinations/salalah_2.jpg';">`;

if (appJs.includes(oldCardMarkup)) {
  appJs = appJs.replace(oldCardMarkup, newCardMarkup);
  fs.writeFileSync(appJsPath, appJs, 'utf8');
  console.log('Successfully updated Wahiba Sands Desert Safari card image in app.js!');
} else {
  console.log('Target markup not found, searching alternative regex...');
  appJs = appJs.replace(
    /<img src="\/assets\/destinations\/salalah_2\.jpg" alt="Wahiba Sands desert landscape and golden dunes"[\s\S]*?>/,
    newCardMarkup
  );
  fs.writeFileSync(appJsPath, appJs, 'utf8');
  console.log('Successfully replaced Wahiba Sands image via regex!');
}
