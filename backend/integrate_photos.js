const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'frontend', 'public', 'assets', 'js', 'app.js');
const cssPath = path.join(__dirname, '..', 'frontend', 'public', 'assets', 'css', 'jmt-theme.css');

let appJs = fs.readFileSync(appJsPath, 'utf8');

// 1. HOMEPAGE HERO SLIDESHOW IMAGES
appJs = appJs.replace(
  `style="background-image: url('/assets/destinations/salalah_1.jpg');"`,
  `style="background-image: url('/assets/destinations/muscat-mutrah-waterfront.jpg');"`
);
appJs = appJs.replace(
  `style="background-image: url('/assets/destinations/salalah_2.jpg');"`,
  `style="background-image: url('/assets/destinations/salalah-khreef-green-hills.jpg');"`
);
appJs = appJs.replace(
  `style="background-image: url('/assets/destinations/salalah_3.jpg');"`,
  `style="background-image: url('/assets/destinations/oman-mountain-fort.jpg');"`
);
appJs = appJs.replace(
  `style="background-image: url('/assets/destinations/salalah_4.jpg');"`,
  `style="background-image: url('/assets/destinations/nizwa-fort.jpg');"`
);

// 2. HOMEPAGE DESTINATION CARDS
const homeDestGridOld = `<div class="destinations-5col-grid">

        <!-- CARD 1: MUSCAT -->
        <div class="dest-card-box" onclick="navigate('/tourism')">
          <img src="/assets/destinations/salalah_1.jpg" alt="Salalah Oman">
          <div style="position: absolute; inset:0; background: linear-gradient(to top, rgba(11,40,108,0.9) 0%, transparent 60%); padding: 16px; display: flex; justify-content: space-between; align-items: flex-end; color: #FFF;">
            <div>
              <h3 style="font-size: 16px; font-weight: 800; margin: 0;">Salalah</h3>
              <p style="font-size: 12px; opacity: 0.8; margin: 0;">Oman</p>
            </div>
            <span style="width: 28px; height: 28px; border-radius: 50%; background: #FFF; color: #0B286C; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;">→</span>
          </div>
        </div>

        <!-- CARD 2: SALALAH -->
        <div class="dest-card-box" onclick="navigate('/tourism')">
          <img src="/assets/destinations/salalah_2.jpg" alt="Salalah Oman">
          <div style="position: absolute; inset:0; background: linear-gradient(to top, rgba(11,40,108,0.9) 0%, transparent 60%); padding: 16px; display: flex; justify-content: space-between; align-items: flex-end; color: #FFF;">
            <div>
              <h3 style="font-size: 16px; font-weight: 800; margin: 0;">Salalah</h3>
              <p style="font-size: 12px; opacity: 0.8; margin: 0;">Oman</p>
            </div>
            <span style="width: 28px; height: 28px; border-radius: 50%; background: #FFF; color: #0B286C; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;">→</span>
          </div>
        </div>`;

const homeDestGridNew = `<div class="destinations-5col-grid">

        <!-- CARD 1: MUSCAT -->
        <div class="dest-card-box" onclick="navigate('/tourism')">
          <img src="/assets/destinations/muscat-mutrah-waterfront.jpg" alt="Mutrah waterfront in Muscat, Oman" loading="lazy">
          <div style="position: absolute; inset:0; background: linear-gradient(to top, rgba(11,40,108,0.9) 0%, transparent 60%); padding: 16px; display: flex; justify-content: space-between; align-items: flex-end; color: #FFF;">
            <div>
              <h3 style="font-size: 16px; font-weight: 800; margin: 0;">Muscat</h3>
              <p style="font-size: 12px; opacity: 0.8; margin: 0;">Oman</p>
            </div>
            <span style="width: 28px; height: 28px; border-radius: 50%; background: #FFF; color: #0B286C; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;">→</span>
          </div>
        </div>

        <!-- CARD 2: SALALAH -->
        <div class="dest-card-box" onclick="navigate('/tourism')">
          <img src="/assets/destinations/salalah-beach-sunset.jpg" alt="Salalah beach at sunset, Oman" loading="lazy">
          <div style="position: absolute; inset:0; background: linear-gradient(to top, rgba(11,40,108,0.9) 0%, transparent 60%); padding: 16px; display: flex; justify-content: space-between; align-items: flex-end; color: #FFF;">
            <div>
              <h3 style="font-size: 16px; font-weight: 800; margin: 0;">Salalah</h3>
              <p style="font-size: 12px; opacity: 0.8; margin: 0;">Oman</p>
            </div>
            <span style="width: 28px; height: 28px; border-radius: 50%; background: #FFF; color: #0B286C; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;">→</span>
          </div>
        </div>`;

appJs = appJs.replace(homeDestGridOld, homeDestGridNew);

// 3. FALLBACK PACKAGES IMAGES IN getPublicPackages
appJs = appJs.replace(
  `image: '/assets/destinations/salalah_1.jpg',`,
  `image: '/assets/destinations/salalah-khreef-green-hills.jpg',`
);
appJs = appJs.replace(
  `image: '/assets/destinations/salalah_2.jpg',`,
  `image: '/assets/destinations/muscat-mutrah-waterfront.jpg',`
);

// 4. OMAN TOURS HERO POSTER
appJs = appJs.replace(
  `posterSrc: '/assets/destinations/salalah_explore_poster.jpg',`,
  `posterSrc: '/assets/destinations/muscat-mutrah-waterfront.jpg',`
);

// 5. EDITORIAL SECTION REPLACEMENT IN APP.JS
const newFullEditorialSection = `      <!-- JMT OMAN TOURS EDITORIAL & SEO TRAVEL GUIDE SECTION -->
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

        <!-- 3. TOP OMAN TOUR HIGHLIGHTS (VISUAL DESTINATION CARDS GRID WITH REAL PHOTOS) -->
        <div class="jmt-editorial-block">
          <div class="jmt-block-title-box">
            <h3 class="jmt-block-title">Top Oman Tour Highlights</h3>
            <p class="jmt-block-sub">
              From historic cities to desert adventures and mountain escapes, discover some of Oman's most memorable experiences.
            </p>
          </div>

          <div class="jmt-dest-highlights-grid">

            <!-- 01 Muscat City Tour (Featured Card) -->
            <div class="jmt-dest-card featured" onclick="navigate('/tourism')">
              <img src="/assets/destinations/muscat-mutrah-waterfront.jpg" alt="Mutrah waterfront in Muscat, Oman" loading="lazy" decoding="async" class="jmt-dest-card-img" style="object-position: center top;" onerror="this.onerror=null;this.src='/assets/destinations/oman_tours_poster.jpg';">
              <div class="jmt-dest-card-overlay">
                <div class="jmt-dest-card-top">
                  <span class="jmt-dest-badge">01 • Capital City</span>
                </div>
                <div class="jmt-dest-card-bottom">
                  <h4 class="jmt-dest-card-title">Muscat City Tour</h4>
                  <p class="jmt-dest-card-desc">Explore Mutrah, Muscat's waterfront, grand architecture and cultural landmarks.</p>
                  <span class="jmt-dest-cta-link">Explore Muscat →</span>
                </div>
              </div>
            </div>

            <!-- 02 Wahiba Sands Desert Safari -->
            <div class="jmt-dest-card" onclick="navigate('/tourism')">
              <img src="/assets/destinations/salalah_2.jpg" alt="Wahiba Sands desert landscape and golden dunes" loading="lazy" decoding="async" class="jmt-dest-card-img" onerror="this.onerror=null;this.src='/assets/destinations/dubai_1.jpg';">
              <div class="jmt-dest-card-overlay">
                <div class="jmt-dest-card-top">
                  <span class="jmt-dest-badge">02 • Desert Safari</span>
                </div>
                <div class="jmt-dest-card-bottom">
                  <h4 class="jmt-dest-card-title">Wahiba Sands Desert Safari</h4>
                  <p class="jmt-dest-card-desc">Experience the golden dunes of Wahiba Sands with dune driving, camel rides, Bedouin camps, and starry desert nights.</p>
                  <span class="jmt-dest-cta-link">Explore Desert →</span>
                </div>
              </div>
            </div>

            <!-- 03 Jebel Akhdar & Al Hajar Mountains -->
            <div class="jmt-dest-card" onclick="navigate('/tourism')">
              <img src="/assets/destinations/oman-mountain-fort.jpg" alt="Oman mountain fort in Jebel Akhdar and Al Hajar mountain range" loading="lazy" decoding="async" class="jmt-dest-card-img" style="object-position: center 25%;" onerror="this.onerror=null;this.src='/assets/destinations/salalah_3.jpg';">
              <div class="jmt-dest-card-overlay">
                <div class="jmt-dest-card-top">
                  <span class="jmt-dest-badge">03 • Mountains</span>
                </div>
                <div class="jmt-dest-card-bottom">
                  <h4 class="jmt-dest-card-title">Jebel Akhdar &amp; Al Hajar Mountains</h4>
                  <p class="jmt-dest-card-desc">Discover breathtaking mountain fortresses, cliffside terraces, ancient villages, and cool mountain breezes.</p>
                  <span class="jmt-dest-cta-link">Explore Mountains →</span>
                </div>
              </div>
            </div>

            <!-- 04 Salalah Beaches & Khareef -->
            <div class="jmt-dest-card" onclick="navigate('/tourism')">
              <img src="/assets/destinations/salalah-beach-sunset.jpg" alt="Salalah beach at sunset" loading="lazy" decoding="async" class="jmt-dest-card-img" style="object-position: center center;" onerror="this.onerror=null;this.src='/assets/destinations/salalah-khreef-green-hills.jpg';">
              <div class="jmt-dest-card-overlay">
                <div class="jmt-dest-card-top">
                  <span class="jmt-dest-badge">04 • Tropical Coast &amp; Khareef</span>
                </div>
                <div class="jmt-dest-card-bottom">
                  <h4 class="jmt-dest-card-title">Salalah Beaches &amp; Khareef</h4>
                  <p class="jmt-dest-card-desc">Relax along Salalah's palm-lined beaches and explore green hills, natural waterfalls, and frankincense groves during Khareef.</p>
                  <span class="jmt-dest-cta-link">Explore Salalah →</span>
                </div>
              </div>
            </div>

            <!-- 05 Nizwa & Bahla Forts -->
            <div class="jmt-dest-card" onclick="navigate('/tourism')">
              <img src="/assets/destinations/nizwa-fort.jpg" alt="Historic Nizwa Fort in Oman" loading="lazy" decoding="async" class="jmt-dest-card-img" style="object-position: center 30%;" onerror="this.onerror=null;this.src='/assets/destinations/nizwa-heritage-village.jpg';">
              <div class="jmt-dest-card-overlay">
                <div class="jmt-dest-card-top">
                  <span class="jmt-dest-badge">05 • Heritage &amp; Forts</span>
                </div>
                <div class="jmt-dest-card-bottom">
                  <h4 class="jmt-dest-card-title">Nizwa &amp; Bahla Forts</h4>
                  <p class="jmt-dest-card-desc">Step into Oman's heritage through historic forts, traditional markets and beautifully preserved old-town experiences.</p>
                  <span class="jmt-dest-cta-link">Explore Heritage →</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- 4. REGIONAL DESTINATION VISUAL SHOWCASES (MUSCAT, NIZWA, SALALAH) -->
        <div class="jmt-editorial-block">
          <div class="jmt-regional-grid">

            <!-- MUSCAT REGIONAL SHOWCASE -->
            <div class="jmt-region-card">
              <div class="jmt-region-hero-img-wrap">
                <img src="/assets/destinations/muscat-mutrah-waterfront.jpg" alt="Mutrah waterfront in Muscat, Oman" loading="lazy" class="jmt-region-hero-img">
                <div class="jmt-region-hero-overlay">
                  <span class="jmt-region-tag">CAPITAL &amp; COAST</span>
                  <h3 class="jmt-region-title">Muscat</h3>
                  <p class="jmt-region-sub">Culture • Coast • Heritage</p>
                </div>
              </div>
              <div class="jmt-region-thumbs">
                <div class="jmt-region-thumb-item">
                  <img src="/assets/destinations/muscat-mosque-arch.jpg" alt="Muscat architecture and grand mosque arch" loading="lazy">
                  <span>Grand Mosque</span>
                </div>
                <div class="jmt-region-thumb-item">
                  <img src="/assets/destinations/muscat-almouj.jpg" alt="Al Mouj modern Muscat waterfront promenade" loading="lazy">
                  <span>Al Mouj Marina</span>
                </div>
                <div class="jmt-region-thumb-item">
                  <img src="/assets/destinations/muscat-mosque-night.jpg" alt="Muscat mosque illuminated at night" loading="lazy">
                  <span>Night Skyline</span>
                </div>
              </div>
            </div>

            <!-- NIZWA REGIONAL SHOWCASE -->
            <div class="jmt-region-card">
              <div class="jmt-region-hero-img-wrap">
                <img src="/assets/destinations/nizwa-fort.jpg" alt="Historic Nizwa Fort in Oman" loading="lazy" class="jmt-region-hero-img" style="object-position: center 30%;">
                <div class="jmt-region-hero-overlay">
                  <span class="jmt-region-tag">CULTURAL CAPITAL</span>
                  <h3 class="jmt-region-title">Nizwa &amp; Heritage</h3>
                  <p class="jmt-region-sub">Forts • Souqs • Ancient Towns</p>
                </div>
              </div>
              <div class="jmt-region-thumbs">
                <div class="jmt-region-thumb-item">
                  <img src="/assets/destinations/nizwa-heritage-village.jpg" alt="Nizwa traditional heritage village" loading="lazy">
                  <span>Old Town</span>
                </div>
                <div class="jmt-region-thumb-item">
                  <img src="/assets/destinations/nizwa-market.jpg" alt="Nizwa traditional souq and market" loading="lazy">
                  <span>Craft Souq</span>
                </div>
                <div class="jmt-region-thumb-item">
                  <img src="/assets/destinations/oman-fort-courtyard.jpg" alt="Oman historic fort courtyard" loading="lazy">
                  <span>Fort Citadel</span>
                </div>
              </div>
            </div>

            <!-- SALALAH REGIONAL SHOWCASE -->
            <div class="jmt-region-card">
              <div class="jmt-region-hero-img-wrap">
                <img src="/assets/destinations/salalah-khreef-green-hills.jpg" alt="Salalah green mountains during Khareef season" loading="lazy" class="jmt-region-hero-img">
                <div class="jmt-region-hero-overlay">
                  <span class="jmt-region-tag">DHOFAR TROPICAL RETREAT</span>
                  <h3 class="jmt-region-title">Salalah Khareef</h3>
                  <p class="jmt-region-sub">Misty Hills • Waterfalls • Springs</p>
                </div>
              </div>
              <div class="jmt-region-thumbs">
                <div class="jmt-region-thumb-item">
                  <img src="/assets/destinations/salalah-lake.jpg" alt="Salalah natural spring lake and greenery" loading="lazy">
                  <span>Ain Waterfalls</span>
                </div>
                <div class="jmt-region-thumb-item">
                  <img src="/assets/destinations/salalah-coast-mountain.jpg" alt="Salalah coastline and mountain cliffs" loading="lazy">
                  <span>Coastal Cliffs</span>
                </div>
                <div class="jmt-region-thumb-item">
                  <img src="/assets/destinations/salalah-beach-sunset.jpg" alt="Salalah beach at sunset" loading="lazy">
                  <span>Sunset Beach</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- 5. CUSTOM OMAN TOUR PACKAGES FOR EVERY TRAVELER -->
        <div class="jmt-editorial-block">
          <div class="jmt-block-title-box">
            <h3 class="jmt-block-title">Custom Oman Tour Packages for Every Traveler</h3>
            <p class="jmt-block-sub">Whether you seek luxury retreats, family holidays, outdoor adventures, or cultural immersions.</p>
          </div>

          <div class="jmt-styles-grid">

            <div class="jmt-style-card visual-card" onclick="navigate('/tourism')" style="background-image: linear-gradient(180deg, rgba(7,21,59,0.25) 0%, rgba(7,21,59,0.85) 100%), url('/assets/destinations/muscat-almouj.jpg');">
              <span class="jmt-style-tag">Luxury</span>
              <h4 class="jmt-style-title" style="color: #FFF !important;">Luxury Oman Tours</h4>
              <p class="jmt-style-desc" style="color: #E2E8F0 !important;">Indulge in premium accommodations, private experiences, comfortable transfers, and carefully planned itineraries.</p>
              <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" class="jmt-dest-cta-link">Explore Luxury Tours →</a>
            </div>

            <div class="jmt-style-card visual-card" onclick="navigate('/tourism')" style="background-image: linear-gradient(180deg, rgba(7,21,59,0.25) 0%, rgba(7,21,59,0.85) 100%), url('/assets/destinations/salalah-lake.jpg');">
              <span class="jmt-style-tag">Family</span>
              <h4 class="jmt-style-title" style="color: #FFF !important;">Family-Friendly Oman Tours</h4>
              <p class="jmt-style-desc" style="color: #E2E8F0 !important;">Enjoy comfortable and engaging Oman itineraries designed for families, with activities suitable for different age groups.</p>
              <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" class="jmt-dest-cta-link">Explore Family Tours →</a>
            </div>

            <div class="jmt-style-card visual-card" onclick="navigate('/tourism')" style="background-image: linear-gradient(180deg, rgba(7,21,59,0.25) 0%, rgba(7,21,59,0.85) 100%), url('/assets/destinations/oman-wadi-waterfall.jpg');">
              <span class="jmt-style-tag">Adventure</span>
              <h4 class="jmt-style-title" style="color: #FFF !important;">Adventure Oman Tours</h4>
              <p class="jmt-style-desc" style="color: #E2E8F0 !important;">Experience desert safaris, mountain trekking, wadi canyoning, and outdoor adventures across Oman.</p>
              <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" class="jmt-dest-cta-link">Explore Adventure Tours →</a>
            </div>

            <div class="jmt-style-card visual-card" onclick="navigate('/tourism')" style="background-image: linear-gradient(180deg, rgba(7,21,59,0.25) 0%, rgba(7,21,59,0.85) 100%), url('/assets/destinations/nizwa-heritage-village.jpg');">
              <span class="jmt-style-tag">Culture</span>
              <h4 class="jmt-style-title" style="color: #FFF !important;">Cultural Oman Tours</h4>
              <p class="jmt-style-desc" style="color: #E2E8F0 !important;">Explore Oman's rich history, heritage, traditional architecture, forts, souks, villages, and cultural landmarks.</p>
              <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" class="jmt-dest-cta-link">Explore Cultural Tours →</a>
            </div>

          </div>
        </div>

        <!-- 6. WHY OMAN SHOULD BE YOUR NEXT DESTINATION (EDITORIAL SPLIT WITH OMAN COASTAL LANDSCAPE) -->
        <div class="jmt-editorial-block">
          <div class="jmt-why-oman-split">
            <div>
              <img src="/assets/destinations/oman-coastal-landscape.jpg" alt="Oman mountain and heritage landscape" loading="lazy" decoding="async" class="jmt-why-oman-img" style="object-position: center center;" onerror="this.onerror=null;this.src='/assets/destinations/oman-wadi-waterfall.jpg';">
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

        <!-- 7. FINAL CTA BANNER (READY TO EXPLORE OMAN? WITH SUBTLE COASTAL BACKGROUND) -->
        <div class="jmt-oman-cta-banner" style="background: linear-gradient(135deg, rgba(7,21,59,0.92) 0%, rgba(11,40,108,0.88) 100%), url('/assets/destinations/oman-coastal-landscape.jpg') center/cover no-repeat;">
          <div class="jmt-oman-cta-content">
            <div class="jmt-oman-cta-text">
              <h3 class="jmt-oman-cta-title">Ready to Explore Oman?</h3>
              <p class="jmt-oman-cta-sub">
                Let JMT Travels help you plan a memorable Oman holiday tailored to your interests, schedule and travel style.
              </p>
            </div>
            <div class="jmt-oman-cta-btns">
              <a href="#tourism-catalogue-container" onclick="const el=document.getElementById('tourism-catalogue-container'); if(el){el.scrollIntoView({behavior:'smooth'});}" class="jmt-btn-primary" style="background: #00A651; color: #FFFFFF; font-weight: 700; padding: 14px 28px; border-radius: 99px; text-decoration: none;">Explore Oman Tours ↓</a>
              <a href="/contact" onclick="event.preventDefault(); navigate('/contact')" class="jmt-btn-secondary" style="background: rgba(255,255,255,0.12); color: #FFFFFF !important; border: 1.5px solid rgba(255,255,255,0.4); padding: 14px 28px; border-radius: 99px; text-decoration: none;">Contact JMT Travels →</a>
            </div>
          </div>
        </div>

      </section>`;

appJs = appJs.replace(
  /<section class="jmt-seo-editorial-section"[\s\S]*?<\/section>/,
  newFullEditorialSection
);

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('Successfully updated app.js with integrated Oman photo assets!');

// 6. UPDATE CSS FOR REGIONAL CARDS & VISUAL STYLE CARDS
let css = fs.readFileSync(cssPath, 'utf8');

const regionalCSS = `

/* REGIONAL SHOWCASE CARDS CSS */
.jmt-regional-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (max-width: 1024px) {
  .jmt-regional-grid { grid-template-columns: 1fr; }
}

.jmt-region-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 6px 20px rgba(7, 21, 59, 0.05);
  display: flex;
  flex-direction: column;
}

.jmt-region-hero-img-wrap {
  position: relative;
  height: 220px;
  overflow: hidden;
}

.jmt-region-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.jmt-region-card:hover .jmt-region-hero-img {
  transform: scale(1.03);
}

.jmt-region-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(7, 21, 59, 0.15) 0%, rgba(7, 21, 59, 0.85) 100%);
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  color: #FFFFFF;
}

.jmt-region-tag {
  font-size: 10.5px;
  font-weight: 800;
  color: #00E676;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.jmt-region-title {
  font-size: 22px;
  font-weight: 800;
  color: #FFFFFF !important;
  margin: 0 0 2px;
}

.jmt-region-sub {
  font-size: 12.5px;
  color: #D6E0F4 !important;
  margin: 0;
}

.jmt-region-thumbs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 12px;
  background: #F8FAFC;
}

.jmt-region-thumb-item {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  height: 70px;
}

.jmt-region-thumb-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.jmt-region-thumb-item span {
  position: absolute;
  bottom: 0;
  inset-inline: 0;
  background: rgba(7, 21, 59, 0.75);
  color: #FFFFFF;
  font-size: 9.5px;
  font-weight: 700;
  padding: 3px 4px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* VISUAL STYLE CARDS BACKGROUND OVERRIDES */
.jmt-style-card.visual-card {
  position: relative;
  background-size: cover;
  background-position: center;
  overflow: hidden;
  border: 0;
  color: #FFFFFF;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
`;

if (!css.includes('REGIONAL SHOWCASE CARDS CSS')) {
  css += regionalCSS;
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('Successfully updated jmt-theme.css with regional visual styles!');
}
