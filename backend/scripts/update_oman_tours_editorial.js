const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'assets', 'css', 'jmt-theme.css');
const appJsPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'assets', 'js', 'app.js');

// 1. APPEND OMAN TOUR EDITORIAL CSS TO JMT-THEME.CSS
const editorialCSS = `

/* =============================================================
   JMT OMAN TOUR EDITORIAL & TRAVEL GUIDE SECTION REDESIGN
   ============================================================= */

.jmt-seo-editorial-section {
  margin-top: 60px;
  margin-bottom: 20px;
}

/* SECTION HEADERS */
.jmt-editorial-header {
  text-align: center;
  max-width: 900px;
  margin: 0 auto 48px;
}

.jmt-editorial-eyebrow {
  display: inline-block;
  background: rgba(0, 166, 81, 0.1);
  color: #00A651;
  border: 1px solid rgba(0, 166, 81, 0.25);
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: 5px 14px;
  border-radius: 99px;
  margin-bottom: 16px;
}

.jmt-editorial-title {
  font-size: clamp(30px, 4vw, 44px);
  font-weight: 800;
  color: #07153B;
  line-height: 1.2;
  letter-spacing: -0.5px;
  margin: 0 0 16px;
}

.jmt-editorial-lead {
  font-size: clamp(15px, 2vw, 17px);
  color: #475569;
  line-height: 1.7;
  margin: 0 0 12px;
}

.jmt-editorial-sub {
  font-size: 14.5px;
  color: #64748B;
  line-height: 1.6;
  margin: 0;
}

/* BLOCK CONTAINERS */
.jmt-editorial-block {
  margin-bottom: 60px;
}

.jmt-block-title-box {
  text-align: center;
  max-width: 650px;
  margin: 0 auto 36px;
}

.jmt-block-title {
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 800;
  color: #07153B;
  margin: 0 0 8px;
  letter-spacing: -0.5px;
}

.jmt-block-sub {
  font-size: 14.5px;
  color: #64748B;
  margin: 0;
  line-height: 1.55;
}

/* WHY CHOOSE CARDS GRID */
.jmt-why-choose-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

@media (max-width: 1024px) {
  .jmt-why-choose-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 550px) {
  .jmt-why-choose-grid { grid-template-columns: 1fr; }
}

.jmt-why-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(7, 21, 59, 0.04);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.jmt-why-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(7, 21, 59, 0.08);
}

.jmt-why-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.jmt-why-num {
  font-size: 12px;
  font-weight: 800;
  color: #00A651;
  background: #F0FDF4;
  padding: 4px 10px;
  border-radius: 99px;
  border: 1px solid #DCFCE7;
}

.jmt-why-card-title {
  font-size: 17px;
  font-weight: 800;
  color: #07153B;
  margin: 0 0 8px;
}

.jmt-why-card-text {
  font-size: 13.5px;
  color: #64748B;
  line-height: 1.6;
  margin: 0;
}

/* TOP OMAN DESTINATION HIGHLIGHTS GRID */
.jmt-dest-highlights-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (max-width: 1024px) {
  .jmt-dest-highlights-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .jmt-dest-highlights-grid { grid-template-columns: 1fr; }
}

.jmt-dest-card {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  height: 340px;
  box-shadow: 0 8px 24px rgba(7, 21, 59, 0.12);
  cursor: pointer;
}

.jmt-dest-card.featured {
  grid-column: span 2;
}

@media (max-width: 1024px) {
  .jmt-dest-card.featured { grid-column: span 1; }
}

.jmt-dest-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.jmt-dest-card:hover .jmt-dest-card-img {
  transform: scale(1.04);
}

.jmt-dest-card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(7, 21, 59, 0.92) 0%, rgba(7, 21, 59, 0.45) 55%, rgba(7, 21, 59, 0.1) 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 24px;
}

.jmt-dest-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.jmt-dest-badge {
  background: #00A651;
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 99px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.jmt-dest-card-bottom {
  color: #FFFFFF;
}

.jmt-dest-card-title {
  font-size: clamp(19px, 2.5vw, 24px);
  font-weight: 800;
  color: #FFFFFF !important;
  margin: 0 0 6px;
  line-height: 1.2;
}

.jmt-dest-card-desc {
  font-size: 13.5px;
  color: #E2E8F0 !important;
  line-height: 1.5;
  margin: 0 0 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.jmt-dest-cta-link {
  color: #00E676;
  font-weight: 700;
  font-size: 13.5px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* TOUR STYLES CARDS */
.jmt-styles-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

@media (max-width: 1024px) {
  .jmt-styles-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 550px) {
  .jmt-styles-grid { grid-template-columns: 1fr; }
}

.jmt-style-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(7, 21, 59, 0.04);
  transition: all 0.25s ease;
}

.jmt-style-card:hover {
  transform: translateY(-4px);
  border-color: #00A651;
  box-shadow: 0 10px 24px rgba(0, 166, 81, 0.12);
}

.jmt-style-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  color: #00A651;
  background: #F0FDF4;
  padding: 3px 10px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
}

.jmt-style-title {
  font-size: 17px;
  font-weight: 800;
  color: #07153B;
  margin: 0 0 8px;
}

.jmt-style-desc {
  font-size: 13.5px;
  color: #64748B;
  line-height: 1.55;
  margin: 0 0 14px;
}

/* WHY OMAN EDITORIAL SPLIT */
.jmt-why-oman-split {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 24px;
  padding: 36px;
  box-shadow: 0 6px 20px rgba(7, 21, 59, 0.04);
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 36px;
  align-items: center;
}

@media (max-width: 900px) {
  .jmt-why-oman-split {
    grid-template-columns: 1fr;
    padding: 24px;
  }
}

.jmt-why-oman-img {
  width: 100%;
  height: 280px;
  object-fit: cover;
  border-radius: 18px;
}

.jmt-why-oman-content h3 {
  font-size: 26px;
  font-weight: 800;
  color: #07153B;
  margin: 0 0 14px;
  line-height: 1.25;
}

.jmt-why-oman-content p {
  font-size: 14.5px;
  color: #475569;
  line-height: 1.65;
  margin: 0 0 12px;
}

.jmt-why-oman-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 18px;
}

.jmt-why-tag {
  background: #F1F5F9;
  color: #0B286C;
  font-size: 12px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 99px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* SEO INLINE LINKS STYLING */
.jmt-seo-inline-link {
  color: #00A651;
  font-weight: 700;
  text-decoration: none;
  border-bottom: 1.5px solid rgba(0, 166, 81, 0.3);
  transition: all 0.2s ease;
}

.jmt-seo-inline-link:hover {
  color: #0B286C;
  border-color: #0B286C;
}

/* FINAL CTA BANNER */
.jmt-oman-cta-banner {
  background: linear-gradient(135deg, #07153B 0%, #0B286C 100%);
  color: #FFFFFF;
  border-radius: 24px;
  padding: 48px 40px;
  box-shadow: 0 12px 32px rgba(7, 21, 59, 0.15);
  position: relative;
  overflow: hidden;
}

.jmt-oman-cta-content {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 28px;
}

.jmt-oman-cta-text {
  max-width: 620px;
}

.jmt-oman-cta-title {
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 800;
  color: #FFFFFF !important;
  margin: 0 0 10px;
  line-height: 1.2;
}

.jmt-oman-cta-sub {
  font-size: 15px;
  color: #D6E0F4 !important;
  margin: 0;
  line-height: 1.6;
}

.jmt-oman-cta-btns {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
`;

let cssContent = fs.readFileSync(cssPath, 'utf8');
if (!cssContent.includes('JMT OMAN TOUR EDITORIAL & TRAVEL GUIDE SECTION REDESIGN')) {
  cssContent += editorialCSS;
  fs.writeFileSync(cssPath, cssContent, 'utf8');
  console.log('Successfully appended Oman Tour Editorial CSS to jmt-theme.css!');
}

// 2. REPLACEMENT MARKUP FOR THE EDITORIAL SECTION IN APP.JS
const newEditorialMarkup = `      <!-- JMT OMAN TOURS EDITORIAL & SEO TRAVEL GUIDE SECTION -->
      <section class="jmt-seo-editorial-section" aria-labelledby="oman-tours-seo-heading">

        <!-- 1. TOP INTRO SECTION -->
        <header class="jmt-editorial-header">
          <span class="jmt-editorial-eyebrow">JMT TRAVELS • OMAN HOLIDAYS</span>
          <h2 id="oman-tours-seo-heading" class="jmt-editorial-title">
            Explore the Best <span style="color:#00A651;">Oman Tour Packages</span> with JMT Travels
          </h2>
          <p class="jmt-editorial-lead">
            Discover the hidden treasures of Oman with JMT Travels' expertly crafted Oman Tour Packages. From stunning desert landscapes and traditional souks to pristine beaches and dramatic mountain scenery, Oman offers a unique blend of tradition, luxury, and adventure.
          </p>
          <p class="jmt-editorial-sub">
            Our carefully planned Oman tour packages help you experience the best of Oman's culture, heritage, natural beauty, and hospitality with comfort and convenience.
          </p>
        </header>

        <!-- 2. WHY CHOOSE JMT TRAVELS (4 FEATURE CARDS) -->
        <div class="jmt-editorial-block">
          <div class="jmt-block-title-box">
            <h3 class="jmt-block-title">Why Choose JMT Travels for Oman Tour Packages?</h3>
            <p class="jmt-block-sub">
              At JMT Travels, we specialize in creating memorable travel experiences tailored to your preferences, schedule, and travel style.
            </p>
          </div>

          <div class="jmt-why-choose-grid">
            <div class="jmt-why-card">
              <div class="jmt-why-card-header">
                <span class="jmt-why-num">01</span>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00A651" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              </div>
              <h4 class="jmt-why-card-title">Tailored Itineraries</h4>
              <p class="jmt-why-card-text">Travel plans designed around your interests, schedule, and travel style.</p>
            </div>

            <div class="jmt-why-card">
              <div class="jmt-why-card-header">
                <span class="jmt-why-num">02</span>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00A651" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
              </div>
              <h4 class="jmt-why-card-title">Local Oman Expertise</h4>
              <p class="jmt-why-card-text">Discover <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" class="jmt-seo-inline-link">Muscat</a>, <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" class="jmt-seo-inline-link">Salalah</a>, Wahiba Sands, Nizwa, and Oman's mountain regions with carefully planned experiences.</p>
            </div>

            <div class="jmt-why-card">
              <div class="jmt-why-card-header">
                <span class="jmt-why-num">03</span>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00A651" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
              </div>
              <h4 class="jmt-why-card-title">Comfort &amp; Convenience</h4>
              <p class="jmt-why-card-text">Enjoy coordinated travel arrangements with seamless <a href="/visa" onclick="event.preventDefault(); navigate('/visa')" class="jmt-seo-inline-link">Oman E-Visa support</a> and luxury <a href="/hotels" onclick="event.preventDefault(); navigate('/hotels')" class="jmt-seo-inline-link">hotel booking services</a>.</p>
            </div>

            <div class="jmt-why-card">
              <div class="jmt-why-card-header">
                <span class="jmt-why-num">04</span>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00A651" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </div>
              <h4 class="jmt-why-card-title">JMT Travel Assistance</h4>
              <p class="jmt-why-card-text">Get dedicated 24/7 support from the JMT Travels team throughout your travel planning and stay.</p>
            </div>
          </div>
        </div>

        <!-- 3. TOP OMAN TOUR HIGHLIGHTS (VISUAL DESTINATION CARDS GRID) -->
        <div class="jmt-editorial-block">
          <div class="jmt-block-title-box">
            <h3 class="jmt-block-title">Top Oman Tour Highlights</h3>
            <p class="jmt-block-sub">
              From historic cities to desert adventures and mountain escapes, discover some of Oman's most memorable experiences.
            </p>
          </div>

          <div class="jmt-dest-highlights-grid">
            
            <!-- Muscat City Tour (Featured Card) -->
            <div class="jmt-dest-card featured" onclick="navigate('/tourism')">
              <img src="/assets/destinations/oman_tours_poster.jpg" alt="Muscat city and Sultan Qaboos Grand Mosque" loading="lazy" decoding="async" class="jmt-dest-card-img" onerror="this.onerror=null;this.src='/assets/destinations/salalah_1.jpg';">
              <div class="jmt-dest-card-overlay">
                <div class="jmt-dest-card-top">
                  <span class="jmt-dest-badge">01 • Capital City</span>
                </div>
                <div class="jmt-dest-card-bottom">
                  <h4 class="jmt-dest-card-title">Muscat City Tour</h4>
                  <p class="jmt-dest-card-desc">Explore iconic attractions including Sultan Qaboos Grand Mosque, Royal Opera House, Mutrah Souq, and other highlights of Oman's capital.</p>
                  <span class="jmt-dest-cta-link">Explore Muscat →</span>
                </div>
              </div>
            </div>

            <!-- Wahiba Sands Desert Safari -->
            <div class="jmt-dest-card" onclick="navigate('/tourism')">
              <img src="/assets/destinations/salalah_2.jpg" alt="Wahiba Sands desert landscape and dunes" loading="lazy" decoding="async" class="jmt-dest-card-img" onerror="this.onerror=null;this.src='/assets/destinations/dubai_1.jpg';">
              <div class="jmt-dest-card-overlay">
                <div class="jmt-dest-card-top">
                  <span class="jmt-dest-badge">02 • Desert</span>
                </div>
                <div class="jmt-dest-card-bottom">
                  <h4 class="jmt-dest-card-title">Wahiba Sands Desert Safari</h4>
                  <p class="jmt-dest-card-desc">Experience the golden dunes of Wahiba Sands with dune driving, camel experiences, desert camps, and sunsets.</p>
                  <span class="jmt-dest-cta-link">Explore Desert →</span>
                </div>
              </div>
            </div>

            <!-- Jebel Akhdar & Al Hajar Mountains -->
            <div class="jmt-dest-card" onclick="navigate('/tourism')">
              <img src="/assets/destinations/salalah_3.jpg" alt="Jebel Akhdar mountain landscape and canyon" loading="lazy" decoding="async" class="jmt-dest-card-img" onerror="this.onerror=null;this.src='/assets/destinations/salalah_1.jpg';">
              <div class="jmt-dest-card-overlay">
                <div class="jmt-dest-card-top">
                  <span class="jmt-dest-badge">03 • Mountains</span>
                </div>
                <div class="jmt-dest-card-bottom">
                  <h4 class="jmt-dest-card-title">Jebel Akhdar and Al Hajar Mountains</h4>
                  <p class="jmt-dest-card-desc">Discover breathtaking mountain landscapes, traditional cliffside villages, scenic viewpoints, and fresh mountain air.</p>
                  <span class="jmt-dest-cta-link">Explore Mountains →</span>
                </div>
              </div>
            </div>

            <!-- Salalah Beaches and Frankincense Trail -->
            <div class="jmt-dest-card" onclick="navigate('/tourism')">
              <img src="/assets/destinations/salalah_explore_poster.jpg" alt="Salalah coastline and Khareef landscape" loading="lazy" decoding="async" class="jmt-dest-card-img" onerror="this.onerror=null;this.src='/assets/destinations/salalah_4.jpg';">
              <div class="jmt-dest-card-overlay">
                <div class="jmt-dest-card-top">
                  <span class="jmt-dest-badge">04 • Tropical Coast</span>
                </div>
                <div class="jmt-dest-card-bottom">
                  <h4 class="jmt-dest-card-title">Salalah Beaches and Frankincense Trail</h4>
                  <p class="jmt-dest-card-desc">Relax along Salalah's beautiful coastline and explore the region's famous frankincense heritage and natural waterfalls.</p>
                  <span class="jmt-dest-cta-link">Explore Salalah →</span>
                </div>
              </div>
            </div>

            <!-- Nizwa and Bahla Forts -->
            <div class="jmt-dest-card" onclick="navigate('/tourism')">
              <img src="/assets/destinations/salalah_4.jpg" alt="Nizwa Fort and historical heritage" loading="lazy" decoding="async" class="jmt-dest-card-img" onerror="this.onerror=null;this.src='/assets/destinations/salalah_1.jpg';">
              <div class="jmt-dest-card-overlay">
                <div class="jmt-dest-card-top">
                  <span class="jmt-dest-badge">05 • Heritage &amp; Forts</span>
                </div>
                <div class="jmt-dest-card-bottom">
                  <h4 class="jmt-dest-card-title">Nizwa and Bahla Forts</h4>
                  <p class="jmt-dest-card-desc">Step into Oman's history with visits to historic forts, traditional souks, mudbrick villages, and cultural landmarks.</p>
                  <span class="jmt-dest-cta-link">Explore Heritage →</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- 4. CUSTOM OMAN TOUR PACKAGES FOR EVERY TRAVELER -->
        <div class="jmt-editorial-block">
          <div class="jmt-block-title-box">
            <h3 class="jmt-block-title">Custom Oman Tour Packages for Every Traveler</h3>
            <p class="jmt-block-sub">Whether you seek luxury retreats, family holidays, outdoor adventures, or cultural immersions.</p>
          </div>

          <div class="jmt-styles-grid">
            
            <div class="jmt-style-card" onclick="navigate('/tourism')">
              <span class="jmt-style-tag">Luxury</span>
              <h4 class="jmt-style-title">Luxury Oman Tour Packages</h4>
              <p class="jmt-style-desc">Indulge in premium accommodations, private experiences, comfortable transfers, and carefully planned itineraries.</p>
              <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" class="jmt-seo-inline-link">Explore Luxury Tours →</a>
            </div>

            <div class="jmt-style-card" onclick="navigate('/tourism')">
              <span class="jmt-style-tag">Family</span>
              <h4 class="jmt-style-title">Family-Friendly Oman Tours</h4>
              <p class="jmt-style-desc">Enjoy comfortable and engaging Oman itineraries designed for families, with activities suitable for different age groups.</p>
              <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" class="jmt-seo-inline-link">Explore Family Tours →</a>
            </div>

            <div class="jmt-style-card" onclick="navigate('/tourism')">
              <span class="jmt-style-tag">Adventure</span>
              <h4 class="jmt-style-title">Adventure Oman Tours</h4>
              <p class="jmt-style-desc">Experience desert safaris, mountain adventures, trekking, water activities, and outdoor experiences across Oman.</p>
              <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" class="jmt-seo-inline-link">Explore Adventure Tours →</a>
            </div>

            <div class="jmt-style-card" onclick="navigate('/tourism')">
              <span class="jmt-style-tag">Culture</span>
              <h4 class="jmt-style-title">Cultural Oman Tours</h4>
              <p class="jmt-style-desc">Explore Oman's rich history, heritage, traditional architecture, forts, souks, villages, and cultural landmarks.</p>
              <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" class="jmt-seo-inline-link">Explore Cultural Tours →</a>
            </div>

          </div>
        </div>

        <!-- 5. WHY OMAN SHOULD BE YOUR NEXT DESTINATION (EDITORIAL SPLIT) -->
        <div class="jmt-editorial-block">
          <div class="jmt-why-oman-split">
            <div>
              <img src="/assets/destinations/salalah_1.jpg" alt="Oman coastline and mountain scenery" loading="lazy" decoding="async" class="jmt-why-oman-img" onerror="this.onerror=null;this.src='/assets/destinations/oman_tours_poster.jpg';">
            </div>

            <div class="jmt-why-oman-content">
              <h3>Why Oman Should Be Your Next Destination</h3>
              <p>
                Oman is a land of contrasts, combining rugged mountains, golden deserts, azure waters, peaceful beaches, historic towns, and lush landscapes.
              </p>
              <p>
                Its rich cultural heritage, warm hospitality, dramatic scenery, and relatively unspoiled natural beauty make Oman an ideal destination for travelers looking for a combination of relaxation, culture, and adventure.
              </p>
              <p>
                From Muscat and Nizwa to Wahiba Sands, Jebel Akhdar, and Salalah, every region offers a different side of the Sultanate.
              </p>

              <div class="jmt-why-oman-tags">
                <span class="jmt-why-tag">🏔️ Mountains</span>
                <span class="jmt-why-tag">🏜️ Deserts</span>
                <span class="jmt-why-tag">🏖️ Beaches</span>
                <span class="jmt-why-tag">🏰 Heritage</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 6. FINAL CTA BANNER (READY TO EXPLORE OMAN?) -->
        <div class="jmt-oman-cta-banner">
          <div class="jmt-oman-cta-content">
            <div class="jmt-oman-cta-text">
              <h3 class="jmt-oman-cta-title">Book Your Oman Tour Package with JMT Travels</h3>
              <p class="jmt-oman-cta-sub">
                Experience Oman with JMT Travels and let our travel team help you plan a memorable journey around the Sultanate. Whether you are planning a family holiday, luxury getaway, adventure trip, cultural tour, or customized Oman itinerary, we can help you organize the right travel experience based on your requirements.
              </p>
            </div>
            <div class="jmt-oman-cta-btns">
              <a href="#tourism-catalogue-container" onclick="const el=document.getElementById('tourism-catalogue-container'); if(el){el.scrollIntoView({behavior:'smooth'});}" class="jmt-btn-primary" style="background: #00A651; color: #FFFFFF; font-weight: 700; padding: 14px 28px; border-radius: 99px; text-decoration: none;">Explore Oman Tours ↓</a>
              <a href="/contact" onclick="event.preventDefault(); navigate('/contact')" class="jmt-btn-secondary" style="background: rgba(255,255,255,0.12); color: #FFFFFF !important; border: 1.5px solid rgba(255,255,255,0.4); padding: 14px 28px; border-radius: 99px; text-decoration: none;">Contact JMT Travels →</a>
            </div>
          </div>
        </div>

      </section>`;

let appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Replace <section class="jmt-seo-editorial-section" ... </section>
appJsContent = appJsContent.replace(
  /<section class="jmt-seo-editorial-section"[\s\S]*?<\/section>/,
  newEditorialMarkup
);

fs.writeFileSync(appJsPath, appJsContent, 'utf8');
console.log('Successfully updated Oman Tour Editorial Section in app.js!');
