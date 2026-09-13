const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'frontend', 'public', 'assets', 'js', 'app.js');
const cssPath = path.join(__dirname, '..', 'frontend', 'public', 'assets', 'css', 'jmt-theme.css');

let appJs = fs.readFileSync(appJsPath, 'utf8');

// 1. UPDATE OMAN_VISA_CATEGORIES ARRAY IN APP.JS
const oldCategoriesRegex = /const OMAN_VISA_CATEGORIES = \[[\s\S]*?\];/;
const newCategoriesCode = `const OMAN_VISA_CATEGORIES = [
  {
    slug: 'oman-tourist-visa',
    title: 'Oman Tourist Visa',
    country: 'Oman',
    visaType: 'Tourist',
    icon: '🌴',
    description: "Explore Oman's mountains, beaches, deserts, forts, and cultural destinations with convenient visa assistance.",
    validity: '30 Days / 10 Days',
    processingTime: '24–48 Hours',
    entryType: 'Single / Express',
    price: 'OMR 20.000',
    image: '/assets/visa/oman-tourist-visa.jpg',
    alt: 'Oman Tourist Visa assistance'
  },
  {
    slug: 'oman-business-visa',
    title: 'Oman Business Visa',
    country: 'Oman',
    visaType: 'Business',
    icon: '💼',
    description: "Professional visa assistance for corporate delegations, commercial meetings, and trade conferences in Muscat.",
    validity: '21 Days / 1 Year',
    processingTime: '24–48 Hours',
    entryType: 'Single / Multiple',
    price: 'OMR 35.000',
    image: '/assets/visa/oman-business-visa.jpg',
    alt: 'Oman Business Visa assistance'
  },
  {
    slug: 'oman-family-visa',
    title: 'Oman Family Visit Visa',
    country: 'Oman',
    visaType: 'Family Visit',
    icon: '👨‍👩‍👧‍👦',
    description: "Dedicated document clearing for visiting relatives, family reunions, and expatriate family entry to Oman.",
    validity: '30 Days / 3 Months',
    processingTime: '48 Hours',
    entryType: 'Single / Multiple',
    price: 'OMR 25.000',
    image: '/assets/visa/oman-family-visit-visa.jpg',
    alt: 'Oman Family Visit Visa assistance'
  },
  {
    slug: 'oman-work-visa',
    title: 'Oman Work Visa',
    country: 'Oman',
    visaType: 'Work & Employment',
    icon: '🏗️',
    description: "End-to-end assistance with employment visa clearance, Ministry labor approvals, and residence permit processing.",
    validity: '2 Years Resident',
    processingTime: '3–5 Business Days',
    entryType: 'Resident Work Permit',
    price: 'OMR 60.000',
    image: '/assets/visa/oman-work-visa.jpg',
    alt: 'Oman Work Visa assistance'
  },
  {
    slug: 'oman-transit-visa',
    title: 'Oman Transit Visa',
    country: 'Oman',
    visaType: 'Transit',
    icon: '✈️',
    description: "Short stopover visa clearance for international travellers transiting through Muscat International Airport (MCT).",
    validity: '72 Hours',
    processingTime: '12–24 Hours',
    entryType: 'Single Transit Entry',
    price: 'OMR 12.000',
    image: '/assets/visa/oman-transit-visa.jpg',
    alt: 'Oman Transit Visa assistance'
  }
];`;

appJs = appJs.replace(oldCategoriesRegex, newCategoriesCode);

// 2. UPDATE VISA CATALOGUE GRID RENDER CODE IN APP.JS
const oldVisaGridRegex = /<!-- VISA CATALOGUE GRID -->[\s\S]*?<!-- OMAN VISA BENEFITS STRIP -->/;
const newVisaGridCode = `<!-- VISA CATALOGUE GRID -->
        <div id="visa-grid" style="margin-bottom: 60px;">
          <div style="text-align: center; max-width: 750px; margin: 0 auto 36px;">
            <span class="jmt-editorial-eyebrow" style="margin-bottom: 12px;">JMT TRAVELS • OMAN VISA SERVICES</span>
            <h2 style="font-size: clamp(28px, 3.5vw, 40px); color: #07153B; font-weight: 800; margin: 0 0 12px; letter-spacing: -0.5px;">
              Explore <span style="color: #00A651;">Oman</span> Visa Categories
            </h2>
            <p style="font-size: 15.5px; color: #64748B; margin: 0; line-height: 1.6;">
              Fast-track application intake &amp; document clearing for international travellers &amp; GCC residents.
            </p>
          </div>

          <div class="jmt-visa-card-grid">
            \${OMAN_VISA_CATEGORIES.map(v => {
              const matchedDb = dbServices.find(s => s.slug === v.slug);
              const validity = matchedDb ? matchedDb.validity : v.validity;
              const procTime = matchedDb ? matchedDb.processingTime : v.processingTime;
              const entryType = matchedDb ? matchedDb.entryType : v.entryType;
              const overview = matchedDb ? matchedDb.overview : v.description;

              return \`
                <div class="jmt-oman-visa-card">
                  <img src="\${v.image}" alt="\${escapeHTML(v.alt)}" loading="lazy" decoding="async" class="jmt-oman-visa-card-bg">
                  <div class="jmt-oman-visa-card-content">
                    <div>
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <span style="font-size: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">\${v.icon}</span>
                        <span style="background: rgba(0, 166, 81, 0.35); border: 1px solid rgba(0, 230, 118, 0.6); color: #00E676; font-size: 11.5px; font-weight: 800; padding: 4px 12px; border-radius: 99px; backdrop-filter: blur(4px);">
                          ⚡ \${escapeHTML(procTime)}
                        </span>
                      </div>

                      <h3 style="font-size: 23px; color: #FFFFFF !important; font-weight: 800; margin: 0 0 12px; line-height: 1.25; text-shadow: 0 2px 8px rgba(0,0,0,0.6);">
                        \${escapeHTML(v.title)}
                      </h3>

                      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;">
                        <span style="background: rgba(255, 255, 255, 0.18); backdrop-filter: blur(6px); border: 1px solid rgba(255, 255, 255, 0.3); color: #FFFFFF; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 8px;">
                          📅 \${escapeHTML(validity)}
                        </span>
                        <span style="background: rgba(255, 255, 255, 0.18); backdrop-filter: blur(6px); border: 1px solid rgba(255, 255, 255, 0.3); color: #FFFFFF; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 8px;">
                          ✈️ \${escapeHTML(entryType)}
                        </span>
                      </div>

                      <p style="font-size: 14px; color: rgba(255, 255, 255, 0.95); line-height: 1.6; margin: 0 0 20px; text-shadow: 0 1px 4px rgba(0,0,0,0.5);">
                        \${escapeHTML(overview)}
                      </p>
                    </div>

                    <div>
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-top: 1px solid rgba(255, 255, 255, 0.2); padding-top: 16px;">
                        <span style="font-size: 12.5px; color: #CBD5E1; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">Service Fee</span>
                        <span style="font-size: 19px; font-weight: 800; color: #FFFFFF; text-shadow: 0 1px 4px rgba(0,0,0,0.4);">\${escapeHTML(v.price)}</span>
                      </div>

                      <div style="display: flex; gap: 10px;">
                        <a href="/visa-apply?service=\${escapeHTML(v.slug)}" onclick="event.preventDefault(); navigate('/visa-apply?service=\${escapeHTML(v.slug)}')" class="jmt-btn-primary" aria-label="Apply for \${escapeHTML(v.title)}" style="flex: 1.2; justify-content: center; background: #00A651; color: #FFFFFF !important; font-weight: 700; padding: 12px 18px; border-radius: 999px; text-decoration: none; font-size: 13.5px; box-shadow: 0 4px 14px rgba(0,166,81,0.35);">
                          Apply Now →
                        </a>
                        <a href="/visa/\${escapeHTML(v.slug)}" onclick="event.preventDefault(); navigate('/visa/\${escapeHTML(v.slug)}')" class="jmt-btn-secondary" aria-label="View details for \${escapeHTML(v.title)}" style="flex: 0.8; justify-content: center; background: rgba(255, 255, 255, 0.16); color: #FFFFFF !important; border: 1.5px solid rgba(255, 255, 255, 0.45); backdrop-filter: blur(4px); padding: 12px 14px; border-radius: 999px; text-decoration: none; font-size: 13.5px;">
                          Details →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              \`;
            }).join('')}
          </div>
        </div>

        <!-- OMAN VISA BENEFITS STRIP -->`;

appJs = appJs.replace(oldVisaGridRegex, newVisaGridCode);
fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('Successfully updated app.js with new visa images and polished layout!');

// 3. UPDATE CSS STYLES FOR VISA CARDS IN JMT-THEME.CSS
let css = fs.readFileSync(cssPath, 'utf8');

const oldVisaCardCSSRegex = /\.jmt-visa-card-grid[\s\S]*?\.jmt-oman-visa-card-content\s*\{[\s\S]*?\}/;
const newVisaCardCSS = `.jmt-visa-card-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 28px;
  margin-bottom: 50px;
}

.jmt-oman-visa-card {
  position: relative;
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 10px 30px rgba(7, 21, 59, 0.12);
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 450px;
  padding: 30px 26px;
  color: #FFFFFF;
  background-color: #07153B;
  flex: 0 1 calc(33.333% - 24px);
  min-width: 310px;
  max-width: 370px;
}

.jmt-oman-visa-card-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform 0.6s ease;
  z-index: 0;
}

.jmt-oman-visa-card::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(7, 21, 59, 0.3) 0%,
    rgba(7, 21, 59, 0.72) 50%,
    rgba(4, 18, 52, 0.96) 100%
  );
  z-index: 1;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.jmt-oman-visa-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 40px rgba(7, 21, 59, 0.25);
}

.jmt-oman-visa-card:hover .jmt-oman-visa-card-bg {
  transform: scale(1.05);
}

.jmt-oman-visa-card-content {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}`;

css = css.replace(oldVisaCardCSSRegex, newVisaCardCSS);
fs.writeFileSync(cssPath, css, 'utf8');
console.log('Successfully updated jmt-theme.css with polished visa card styles!');
