/**
 * JMT TRAVELS — Master V1 Frontend SPA Router & Application Engine
 * Handles dynamic navigation, authentication state, workflows, checkout, SEO metadata,
 * WCAG 2.2 AA accessibility, screen reader announcements, and chatbot drawer integration.
 */

const state = {
  user: JSON.parse(localStorage.getItem('jmt_user') || 'null'),
  token: localStorage.getItem('jmt_token') || '',
  lang: localStorage.getItem('jmt_lang') || 'en',
  cart: null,
  activeConversationId: localStorage.getItem('jmt_chat_conv') || null
};

// In-flight Request Deduplication Map (Task #11)
const pendingRequests = new Map();

// API Fetch Helper with Request Deduplication
async function apiCall(endpoint, method = 'GET', data = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

  const config = { method, headers };
  if (data) config.body = JSON.stringify(data);

  const requestKey = `${method}:${endpoint}`;
  if (method === 'GET' && pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(endpoint, config);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || 'API request failed');
      return result;
    } catch (err) {
      console.error(`[API Error ${endpoint}]:`, err.message);
      throw err;
    } finally {
      if (method === 'GET') {
        pendingRequests.delete(requestKey);
      }
    }
  })();

  if (method === 'GET') {
    pendingRequests.set(requestKey, fetchPromise);
  }

  return fetchPromise;
}

// -------------------------------------------------------------
// SEO & ACCESSIBILITY HELPERS (Task #10)
// -------------------------------------------------------------

function updateSEO({ title, description, canonicalUrl, noindex = false, jsonLd = null }) {
  const origin = window.location.origin || 'https://jmttravels.com';
  const fullCanonical = canonicalUrl ? (canonicalUrl.startsWith('http') ? canonicalUrl : `${origin}${canonicalUrl}`) : origin;

  if (title) {
    document.title = title;
    const ogTitle = document.getElementById('og-title');
    const twitterTitle = document.getElementById('twitter-title');
    if (ogTitle) ogTitle.content = title;
    if (twitterTitle) twitterTitle.content = title;
  }

  if (description) {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;
    const ogDesc = document.getElementById('og-desc');
    const twitterDesc = document.getElementById('twitter-desc');
    if (ogDesc) ogDesc.content = description;
    if (twitterDesc) twitterDesc.content = description;
  }

  let canonical = document.getElementById('meta-canonical');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.id = 'meta-canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = fullCanonical;

  const ogUrl = document.getElementById('og-url');
  if (ogUrl) ogUrl.content = fullCanonical;

  let metaRobots = document.querySelector('meta[name="robots"]');
  if (noindex) {
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
    }
    metaRobots.content = 'noindex, nofollow';
  } else {
    if (metaRobots) {
      metaRobots.content = 'index, follow';
    }
  }

  if (jsonLd) {
    let jsonLdScript = document.getElementById('json-ld-schema');
    if (!jsonLdScript) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.type = 'application/ld+json';
      jsonLdScript.id = 'json-ld-schema';
      document.head.appendChild(jsonLdScript);
    }
    jsonLdScript.textContent = JSON.stringify(jsonLd);
  }
}

function announceToSR(message) {
  const announcer = document.getElementById('a11y-announcer');
  if (announcer) {
    announcer.textContent = '';
    setTimeout(() => {
      announcer.textContent = message;
    }, 50);
  }
}

function getPublicPackages(packages) {
  // Hide automated QA fixtures from the customer-facing catalogue while preserving them for tests.
  const list = Array.isArray(packages) ? packages : [];
  const clean = list.filter(p => {
    const title = String(p?.title || '');
    const slug = String(p?.slug || '');
    return !/cache\s*invalidation|test\s*package/i.test(title) &&
      !/\d{8,}/.test(title) &&
      !/cache-invalidation/i.test(slug);
  });
  // Prefer canonical seeded packages and remove duplicate slugs/titles.
  const seen = new Set();
  const filtered = clean.filter(p => {
    const key = String(p?.slug || p?.id || p?.title || '').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (filtered.length > 0) return filtered;

  return [
    {
      id: 'pkg-salalah',
      slug: 'salalah-khareef-escape',
      title: 'Salalah Khareef Monsoon Retreat',
      category: 'Salalah Khareef',
      destination: 'Salalah, Dhofar, Oman',
      duration: '4 Days / 3 Nights',
      price: 185,
      priceMinor: 185000,
      currency: 'OMR',
      image: '/assets/destinations/salalah_1.jpg',
      summary: 'Experience lush green mountains, natural waterfalls, and cool monsoon breezes in Salalah.'
    },
    {
      id: 'pkg-muscat',
      slug: 'muscat-grand-heritage-tour',
      title: 'Muscat & Nizwa Fort Heritage Tour',
      category: 'City & Culture',
      destination: 'Muscat & Nizwa, Oman',
      duration: '3 Days / 2 Nights',
      price: 120,
      priceMinor: 120000,
      currency: 'OMR',
      image: '/assets/destinations/salalah_2.jpg',
      summary: 'Visit Sultan Qaboos Grand Mosque, Muttrah Souq, Nizwa Fort, and Jebel Akhdar.'
    },
    {
      id: 'pkg-dubai',
      slug: 'dubai-gcc-luxury-escape',
      title: 'Dubai & UAE Luxury Getaway',
      category: 'GCC Escapes',
      destination: 'Dubai & Abu Dhabi, UAE',
      duration: '5 Days / 4 Nights',
      price: 245,
      priceMinor: 245000,
      currency: 'OMR',
      image: '/assets/destinations/dubai_1.jpg',
      summary: 'Luxury stay in Dubai with desert safari, Burj Khalifa admission, and Abu Dhabi day tour.'
    },
    {
      id: 'pkg-umrah',
      slug: 'umrah-makkah-madinah-package',
      title: 'Umrah Spiritual Journey (Makkah & Madinah)',
      category: 'Umrah & Religious',
      destination: 'Makkah & Madinah, Saudi Arabia',
      duration: '7 Days / 6 Nights',
      price: 290,
      priceMinor: 290000,
      currency: 'OMR',
      image: '/assets/destinations/umrah_1.jpg',
      summary: 'Comprehensive Umrah travel assistance, luxury hotel accommodation near Haram, and transfers.'
    }
  ];
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// -------------------------------------------------------------
// SPA ROUTER & VIEW CONTROLLER
// -------------------------------------------------------------

function navigate(route) {
  window.history.pushState({}, '', route);
  renderRoute();
}

window.onpopstate = () => renderRoute();

window.toggleMobileMenu = function() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const btn = document.querySelector('.mobile-menu-btn');
  if (!drawer) return;
  const isExpanded = btn?.getAttribute('aria-expanded') === 'true';
  drawer.style.display = isExpanded ? 'none' : 'block';
  btn?.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
};

function updateNavActiveState(path) {
  const navLinks = document.querySelectorAll('.nav-links a, .mobile-nav-links a, .nav-link-item');
  if (!navLinks.length) return;

  const searchParams = new URLSearchParams(window.location.search);
  const serviceParam = searchParams.get('service');

  let activeTarget = null;
  if (path === '/' || path === '/index.html') {
    activeTarget = 'home';
  } else if (path === '/schengen-visa' || (path === '/visa' && serviceParam === 'schengen')) {
    activeTarget = 'schengen';
  } else if (path === '/visa' || path.startsWith('/visa/') || path === '/visa-apply') {
    activeTarget = 'visa';
  } else if (path === '/tourism' || path.startsWith('/tourism/') || path === '/destinations' || path === '/book') {
    activeTarget = 'tourism';
  } else if (path === '/hotels') {
    activeTarget = 'hotels';
  } else if (path === '/flights') {
    activeTarget = 'flights';
  }

  navLinks.forEach(link => {
    const navKey = link.getAttribute('data-nav');
    if (activeTarget && navKey === activeTarget) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
      link.style.color = '';
      link.style.fontWeight = '';
    }
  });
}

async function renderRoute() {
  const path = window.location.pathname;
  const container = document.getElementById('view-container');
  if (!container) return;

  // Dynamically update main navigation active state
  updateNavActiveState(path);

  // Language direction update (Task #7 & #10 i18n/Arabic isolation)
  document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';

  // Update Auth UI in Header
  const authNav = document.getElementById('nav-auth');
  const mobileAuthNav = document.getElementById('mobile-nav-auth');
  if (authNav) {
    if (state.user) {
      const userHtml = `<a href="/account" onclick="event.preventDefault(); navigate('/account')" class="btn btn-outline">My Account (${escapeHTML(state.user.name.split(' ')[0])})</a> <button onclick="logoutUser()" class="btn btn-sm">Sign Out</button>`;
      authNav.innerHTML = userHtml;
      if (mobileAuthNav) mobileAuthNav.innerHTML = userHtml;
    } else {
      authNav.innerHTML = `<a href="/login" onclick="event.preventDefault(); navigate('/login')" style="color:#334155; font-weight:600; font-size:14px; text-decoration:none; margin-right:4px;">Sign In</a> <a href="/register" onclick="event.preventDefault(); navigate('/register')" class="btn-create-account" style="background:#00A651; color:#FFFFFF; padding:10px 20px; border-radius:99px; font-weight:700; font-size:13px; text-decoration:none; display:inline-flex; align-items:center; gap:4px; box-shadow: 0 4px 12px rgba(0, 166, 81, 0.25); white-space:nowrap;">Create Account →</a>`;
      if (mobileAuthNav) mobileAuthNav.innerHTML = `<a href="/login" onclick="event.preventDefault(); toggleMobileMenu(); navigate('/login')" class="btn btn-outline" style="flex:1; text-align:center;">Sign In</a> <a href="/register" onclick="event.preventDefault(); toggleMobileMenu(); navigate('/register')" class="btn" style="flex:1; text-align:center; background:#00A651; color:#FFF;">Register</a>`;
    }
  }

  // Routing with SEO & Noindex rules
  if (path === '/' || path === '/index.html') {
    renderHomePage(container);
  } else if (path === '/visa' || path === '/schengen-visa') {
    renderVisaListPage(container);
  } else if (path.startsWith('/visa/')) {
    renderVisaDetailPage(container, path.replace('/visa/', ''));
  } else if (path === '/visa-apply') {
    renderVisaApplyPage(container);
  } else if (path === '/tourism' || path === '/destinations') {
    renderTourismListPage(container);
  } else if (path.startsWith('/tourism/')) {
    renderTourismDetailPage(container, path.replace('/tourism/', ''));
  } else if (path === '/book') {
    renderBookPage(container);
  } else if (path === '/hotels') {
    renderHotelsPage(container);
  } else if (path === '/flights') {
    renderFlightsPage(container);
  } else if (path === '/support') {
    renderSupportPage(container);
  } else if (path === '/contact' || path === '/about') {
    renderContactPage(container);
  } else if (path === '/login') {
    renderLoginPage(container);
  } else if (path === '/register') {
    renderRegisterPage(container);
  } else if (path === '/account') {
    renderAccountPage(container);
  } else if (path === '/privacy' || path === '/terms' || path === '/refund-policy' || path === '/cancellation-policy') {
    renderPolicyPage(container, path.slice(1));
  } else {
    renderHomePage(container);
  }

  window.scrollTo(0, 0);
  container.focus();
}

// --- VIEW RENDERERS ---

// Global Slideshow State
let heroSlideTimer = null;
let currentHeroSlideIndex = 0;

window.changeHeroSlide = function(direction) {
  setHeroSlide((currentHeroSlideIndex + direction + 4) % 4);
};

window.setHeroSlide = function(index) {
  currentHeroSlideIndex = index;
  for (let i = 0; i < 4; i++) {
    const slide = document.getElementById(`hero-slide-${i}`);
    const dot = document.getElementById(`hero-dot-${i}`);
    if (slide) {
      if (i === index) slide.classList.add('active');
      else slide.classList.remove('active');
    }
    if (dot) {
      if (i === index) dot.classList.add('active');
      else dot.classList.remove('active');
    }
  }
};

function renderHomePage(container) {
  if (heroSlideTimer) clearInterval(heroSlideTimer);

  updateSEO({
    title: 'JMT TRAVELS | Visa Services & Tourism | Muscat, Oman',
    description: 'JMT TRAVELS — 20+ years of trusted visa clearing, flight ticketing, Umrah, and holiday packages across Oman and the GCC.',
    canonicalUrl: '/',
    noindex: false,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "TravelAgency",
      "name": "JMT TRAVELS",
      "image": "https://jmttravels.com/assets/logo.png",
      "telephone": "+96871132424",
      "email": "info@jmttravels.com",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "near Mazda R/A, next to Yahar Restaurant",
        "addressLocality": "Muscat",
        "postalCode": "512",
        "addressCountry": "OM"
      }
    }
  });

  announceToSR('Navigated to JMT Travels Homepage');

  container.innerHTML = `
    <!-- 3. LARGE FULL-WIDTH HERO WITH 4-IMAGE SLIDESHOW -->
    <section class="hero-slideshow-wrap">
      <div class="hero-slide-item active" id="hero-slide-0" style="background-image: url('/assets/destinations/salalah_1.jpg');"></div>
      <div class="hero-slide-item" id="hero-slide-1" style="background-image: url('/assets/destinations/salalah_2.jpg');"></div>
      <div class="hero-slide-item" id="hero-slide-2" style="background-image: url('/assets/destinations/salalah_3.jpg');"></div>
      <div class="hero-slide-item" id="hero-slide-3" style="background-image: url('/assets/destinations/salalah_4.jpg');"></div>

      <div class="hero-overlay-gradient"></div>

      <button class="hero-arrow-btn hero-arrow-prev" onclick="changeHeroSlide(-1)" aria-label="Previous Slide">‹</button>
      <button class="hero-arrow-btn hero-arrow-next" onclick="changeHeroSlide(1)" aria-label="Next Slide">›</button>

      <div class="shell" style="position: relative; z-index: 15; height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 40px 20px 80px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 30px;">

          <!-- LEFT HERO CONTENT -->
          <div style="max-width: 600px;">
            <div style="font-size: 13px; font-weight: 800; letter-spacing: 2.5px; color: #E2E8F0; text-transform: uppercase; margin-bottom: 14px;">
              EXPLORE • EXPERIENCE • TRAVEL
            </div>

            <h1 style="font-size: 54px; font-weight: 800; line-height: 1.1; margin-bottom: 18px; color: #FFFFFF; letter-spacing: -0.5px;">
              Your Next<br>
              <span style="color: #00A651;">Journey</span> Awaits
            </h1>

            <p style="font-size: 16px; color: #E2E8F0; margin-bottom: 32px; line-height: 1.6; max-width: 500px;">
              Discover breathtaking destinations, seamless visa services and unforgettable travel experiences with JMT Travels.
            </p>

            <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap; margin-bottom: 36px;">
              <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" style="background: #00A651; color: #FFFFFF; padding: 14px 30px; font-size: 15px; border-radius: 99px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 6px 20px rgba(0, 166, 81, 0.35);">
                Explore Tour Packages →
              </a>
              <button onclick="navigate('/tourism')" style="background: rgba(255, 255, 255, 0.15); border: 1.5px solid rgba(255, 255, 255, 0.5); color: #FFFFFF; padding: 14px 26px; font-size: 15px; border-radius: 99px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; backdrop-filter: blur(8px);">
                <span style="display: inline-flex; width: 24px; height: 24px; background: rgba(255, 255, 255, 0.25); border-radius: 50%; align-items: center; justify-content: center; font-size: 11px;">▶</span> Watch Our Story
              </button>
            </div>

            <!-- HERO TRUST STRIP -->
            <div style="display: flex; gap: 32px; flex-wrap: wrap; align-items: center; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.2);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 22px;">✈️</span>
                <div>
                  <div style="font-size: 14px; font-weight: 800; color: #FFFFFF; line-height: 1.1;">Trusted Travel Partner</div>
                  <div style="font-size: 11px; color: #CBD5E1;">Muscat &amp; Worldwide</div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 22px;">🛡️</span>
                <div>
                  <div style="font-size: 14px; font-weight: 800; color: #FFFFFF; line-height: 1.1;">Visa Assistance</div>
                  <div style="font-size: 11px; color: #CBD5E1;">GCC &amp; E-Visa Intake</div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 22px;">🎧</span>
                <div>
                  <div style="font-size: 14px; font-weight: 800; color: #FFFFFF; line-height: 1.1;">Expert Support</div>
                  <div style="font-size: 11px; color: #CBD5E1;">24/7 Dedicated Care</div>
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT HERO SCRIPT TEXT -->
          <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
            <div style="font-family: 'Caveat', cursive; font-size: 80px; color: rgba(255,255,255,0.92); line-height: 0.95; transform: rotate(-5deg); text-shadow: 0 4px 16px rgba(0,0,0,0.3);">
              Oman
            </div>
            <div style="font-size: 16px; font-weight: 700; color: #E2E8F0; letter-spacing: 0.5px; margin-top: 4px;">
              More Than a Destination
            </div>
          </div>

        </div>
      </div>

      <!-- SLIDESHOW INDICATOR DOTS -->
      <div class="hero-dot-indicators">
        <span class="hero-dot active" id="hero-dot-0" onclick="setHeroSlide(0)"></span>
        <span class="hero-dot" id="hero-dot-1" onclick="setHeroSlide(1)"></span>
        <span class="hero-dot" id="hero-dot-2" onclick="setHeroSlide(2)"></span>
        <span class="hero-dot" id="hero-dot-3" onclick="setHeroSlide(3)"></span>
      </div>
    </section>

    <!-- 4. FLOATING SEARCH CONTAINER -->
    <div class="shell" style="margin-top: -60px; position: relative; z-index: 40; padding: 0 20px;">
      <div class="search-card-container">

        <!-- SEARCH TABS -->
        <div style="display: flex; gap: 32px; border-bottom: 1px solid #E2E8F0; padding-bottom: 14px; margin-bottom: 24px; overflow-x: auto;">
          <button onclick="switchHomeTab('tours')" id="tab-tours" class="search-tab-item active">
            🧳 Tours &amp; Holidays
          </button>
          <button onclick="switchHomeTab('visa')" id="tab-visa" class="search-tab-item">
            📄 Visa Services
          </button>
          <button onclick="switchHomeTab('hotels')" id="tab-hotels" class="search-tab-item">
            🏨 Hotels
          </button>
          <button onclick="switchHomeTab('flights')" id="tab-flights" class="search-tab-item">
            ✈️ Flights
          </button>
        </div>

        <!-- GENERIC SEARCH PANEL (TOURS / VISA / HOTELS) -->
        <div id="home-generic-panel">
          <form onsubmit="handleHomeSearch(event)">
            <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr auto; gap: 16px; align-items: center;">

              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 10px 16px; display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 18px; color: #64748B;">📍</span>
                <div style="flex: 1;">
                  <div style="font-size: 11px; font-weight: 700; color: #0F172A; text-transform: uppercase;">Where to?</div>
                  <input type="text" id="search-dest-input" placeholder="Search destinations, tours..." style="border:0; background:transparent; width:100%; font-size:13px; outline:none; color:#334155; font-weight:500;">
                </div>
              </div>

              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 10px 16px; display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 18px; color: #64748B;">📅</span>
                <div style="flex: 1;">
                  <div style="font-size: 11px; font-weight: 700; color: #0F172A; text-transform: uppercase;">Travel Dates</div>
                  <input type="text" placeholder="Select dates" style="border:0; background:transparent; width:100%; font-size:13px; outline:none; color:#334155; font-weight:500;">
                </div>
              </div>

              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 10px 16px; display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 18px; color: #64748B;">👤</span>
                <div style="flex: 1;">
                  <div style="font-size: 11px; font-weight: 700; color: #0F172A; text-transform: uppercase;">Travellers</div>
                  <select style="border:0; background:transparent; width:100%; font-size:13px; outline:none; color:#334155; font-weight:500; cursor:pointer;">
                    <option>2 Adults</option>
                    <option>1 Adult</option>
                    <option>Family (2+2)</option>
                  </select>
                </div>
              </div>

              <button type="submit" class="search-submit-btn" style="background: #00A651; color: #FFFFFF; border: 0; padding: 14px 28px; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; height: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 6px 16px rgba(0, 166, 81, 0.3);">
                🔍 Search Tours →
              </button>

            </div>
          </form>
        </div>

        <!-- FLIGHTS SEARCH PANEL -->
        <div id="home-flight-panel" style="display: none;">
          <!-- Top Control Pills -->
          <div class="jmt-flight-top-controls">
            <!-- Trip Type -->
            <div style="position: relative;">
              <button type="button" class="jmt-flight-pill-btn" id="flight-triptype-pill" onclick="toggleFlightPopover('triptype')">
                <span id="flight-triptype-label">Round-trip</span> ▾
              </button>
              <div class="jmt-flight-popover" id="popover-triptype" style="display: none; width: 160px;">
                <div class="jmt-popover-option" onclick="setFlightTripType('round-trip')">Round-trip</div>
                <div class="jmt-popover-option" onclick="setFlightTripType('one-way')">One-way</div>
              </div>
            </div>

            <!-- Passengers & Cabin -->
            <div style="position: relative;">
              <button type="button" class="jmt-flight-pill-btn" id="flight-pax-pill" onclick="toggleFlightPopover('passengers')">
                <span id="flight-pax-label">1 Adult, Economy</span> ▾
              </button>
              <div class="jmt-flight-popover" id="popover-passengers" style="display: none; width: 300px; padding: 16px;">
                <div class="jmt-pax-row">
                  <div>
                    <div class="jmt-pax-title">Adults</div>
                    <div class="jmt-pax-sub">12+ years</div>
                  </div>
                  <div class="jmt-counter-ctrl">
                    <button type="button" onclick="updatePaxCount('adults', -1)">-</button>
                    <span id="count-adults">1</span>
                    <button type="button" onclick="updatePaxCount('adults', 1)">+</button>
                  </div>
                </div>

                <div class="jmt-pax-row">
                  <div>
                    <div class="jmt-pax-title">Children</div>
                    <div class="jmt-pax-sub">2-11 years</div>
                  </div>
                  <div class="jmt-counter-ctrl">
                    <button type="button" onclick="updatePaxCount('children', -1)">-</button>
                    <span id="count-children">0</span>
                    <button type="button" onclick="updatePaxCount('children', 1)">+</button>
                  </div>
                </div>

                <div class="jmt-pax-row">
                  <div>
                    <div class="jmt-pax-title">Infants</div>
                    <div class="jmt-pax-sub">Under 2 years</div>
                  </div>
                  <div class="jmt-counter-ctrl">
                    <button type="button" onclick="updatePaxCount('infants', -1)">-</button>
                    <span id="count-infants">0</span>
                    <button type="button" onclick="updatePaxCount('infants', 1)">+</button>
                  </div>
                </div>

                <div style="margin-top: 14px; border-top: 1px solid #E2E8F0; padding-top: 12px;">
                  <label style="font-size: 11px; font-weight: 700; color: #0F172A; text-transform: uppercase; display: block; margin-bottom: 6px;">Cabin Class</label>
                  <select id="flight-cabin-select" onchange="updateFlightCabin(this.value)" class="jmt-select-input">
                    <option value="Economy">Economy</option>
                    <option value="Premium Economy">Premium Economy</option>
                    <option value="Business">Business</option>
                    <option value="First Class">First Class</option>
                  </select>
                </div>

                <div style="margin-top: 14px; text-align: right;">
                  <button type="button" onclick="closeFlightPopovers()" class="jmt-btn-sm-green">Done</button>
                </div>
              </div>
            </div>

            <!-- Promo Code -->
            <div style="position: relative;">
              <button type="button" class="jmt-flight-pill-btn" id="flight-promo-pill" onclick="toggleFlightPopover('promo')">
                <span id="flight-promo-label">Promo Code</span> ▾
              </button>
              <div class="jmt-flight-popover" id="popover-promo" style="display: none; width: 260px; padding: 14px;">
                <label style="font-size: 11px; font-weight: 700; color: #0F172A; text-transform: uppercase; display: block; margin-bottom: 6px;">Enter Promo Code</label>
                <div style="display: flex; gap: 8px;">
                  <input type="text" id="flight-promo-input" placeholder="e.g. OMAN2026" style="flex: 1; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 13px; text-transform: uppercase;">
                  <button type="button" onclick="applyFlightPromo()" class="jmt-btn-sm-green">Apply</button>
                </div>
                <div id="flight-promo-msg" style="font-size: 11px; margin-top: 6px;"></div>
              </div>
            </div>
          </div>

          <!-- Main Search Fields Form -->
          <form id="home-flight-search-form" onsubmit="handleHomeFlightSearch(event)">
            <div class="jmt-flight-fields-grid">
              <!-- From -->
              <div class="jmt-airport-field-box" id="from-airport-container" style="position: relative;">
                <div class="jmt-search-field-box" onclick="focusAirportInput('from')">
                  <span class="jmt-field-icon">🛫</span>
                  <div style="flex: 1;">
                    <div class="jmt-field-label">From</div>
                    <input type="text" id="flight-from-input" class="jmt-field-input"
                           placeholder="Select origin"
                           value="Muscat International Airport (MCT)"
                           onfocus="openAirportDropdown('from')"
                           oninput="filterAirportDropdown('from', this.value)"
                           onkeydown="handleAirportKeydown('from', event)"
                           autocomplete="off">
                  </div>
                </div>
                <div class="jmt-airport-dropdown" id="from-airport-dropdown" style="display: none;"></div>
              </div>

              <!-- Swap Button -->
              <button type="button" onclick="swapFlightAirports()" class="jmt-swap-btn" title="Swap Origin &amp; Destination" aria-label="Swap airports">
                ⇄
              </button>

              <!-- To -->
              <div class="jmt-airport-field-box" id="to-airport-container" style="position: relative;">
                <div class="jmt-search-field-box" onclick="focusAirportInput('to')">
                  <span class="jmt-field-icon">🛬</span>
                  <div style="flex: 1;">
                    <div class="jmt-field-label">To</div>
                    <input type="text" id="flight-to-input" class="jmt-field-input"
                           placeholder="Select destination"
                           value="Dubai International Airport (DXB)"
                           onfocus="openAirportDropdown('to')"
                           oninput="filterAirportDropdown('to', this.value)"
                           onkeydown="handleAirportKeydown('to', event)"
                           autocomplete="off">
                  </div>
                </div>
                <div class="jmt-airport-dropdown" id="to-airport-dropdown" style="display: none;"></div>
              </div>

              <!-- Departure Date -->
              <div class="jmt-search-field-box">
                <span class="jmt-field-icon">📅</span>
                <div style="flex: 1;">
                  <div class="jmt-field-label">Departure</div>
                  <input type="date" id="flight-dept-input" required class="jmt-field-input">
                </div>
              </div>

              <!-- Return Date -->
              <div class="jmt-search-field-box" id="flight-return-box">
                <span class="jmt-field-icon">📅</span>
                <div style="flex: 1;">
                  <div class="jmt-field-label">Return</div>
                  <input type="date" id="flight-return-input" required class="jmt-field-input">
                </div>
              </div>

              <!-- CTA Submit Button -->
              <button type="submit" class="search-submit-btn" style="background: #00A651; color: #FFFFFF; border: 0; padding: 14px 24px; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; height: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 6px 16px rgba(0, 166, 81, 0.3); white-space: nowrap;">
                🔍 Search Flights →
              </button>
            </div>
            <div id="flight-search-error" style="color: #DC2626; font-size: 13px; font-weight: 600; margin-top: 10px; display: none;"></div>
          </form>
        </div>

      </div>
    </div>

    <!-- 5. TRUST BENEFITS STRIP -->
    <div class="shell" style="margin-top: 40px; margin-bottom: 70px;">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">

        <div style="display: flex; align-items: center; gap: 14px; background: #FFFFFF; padding: 16px 20px; border-radius: 12px; border: 1px solid #F1F5F9; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: #E6F6ED; color: #00A651; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">🛡️</div>
          <div>
            <h4 style="font-size: 14px; color: #0F172A; font-weight: 800; margin: 0 0 2px;">Trusted &amp; Reliable</h4>
            <p style="font-size: 12px; color: #64748B; margin: 0;">Your travel partner you can count on</p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 14px; background: #FFFFFF; padding: 16px 20px; border-radius: 12px; border: 1px solid #F1F5F9; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: #E6F6ED; color: #00A651; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">🏷️</div>
          <div>
            <h4 style="font-size: 14px; color: #0F172A; font-weight: 800; margin: 0 0 2px;">Best Price Guarantee</h4>
            <p style="font-size: 12px; color: #64748B; margin: 0;">Unbeatable value for your journeys</p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 14px; background: #FFFFFF; padding: 16px 20px; border-radius: 12px; border: 1px solid #F1F5F9; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: #E6F6ED; color: #00A651; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">🎧</div>
          <div>
            <h4 style="font-size: 14px; color: #0F172A; font-weight: 800; margin: 0 0 2px;">Expert Support</h4>
            <p style="font-size: 12px; color: #64748B; margin: 0;">Here for you, always</p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 14px; background: #FFFFFF; padding: 16px 20px; border-radius: 12px; border: 1px solid #F1F5F9; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: #E6F6ED; color: #00A651; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">👥</div>
          <div>
            <h4 style="font-size: 14px; color: #0F172A; font-weight: 800; margin: 0 0 2px;">Seamless Experience</h4>
            <p style="font-size: 12px; color: #64748B; margin: 0;">From planning to travel</p>
          </div>
        </div>

      </div>
    </div>

    <!-- 6. POPULAR DESTINATIONS + 7. OMAN PROMO PANEL -->
    <section class="shell" style="margin-bottom: 70px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
        <div>
          <h2 style="font-size: 28px; font-weight: 800; color: #0B286C; margin: 0 0 4px; display: flex; align-items: center; gap: 10px;">
            Popular Destinations <span class="heading-green-line"></span>
          </h2>
          <p style="color: #64748B; font-size: 14px; margin: 0;">Handpicked places for unforgettable experiences</p>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" style="color: #00A651; font-weight: 700; text-decoration: none; font-size: 14px;">View All Destinations →</a>
          <button style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid #E2E8F0; background: #FFF; cursor: pointer;">‹</button>
          <button style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid #E2E8F0; background: #FFF; cursor: pointer;">›</button>
        </div>
      </div>

      <div class="destinations-5col-grid">

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
        </div>

        <!-- CARD 3: DUBAI -->
        <div class="dest-card-box" onclick="navigate('/tourism')">
          <img src="/assets/destinations/dubai_1.jpg" alt="Dubai UAE">
          <div style="position: absolute; inset:0; background: linear-gradient(to top, rgba(11,40,108,0.9) 0%, transparent 60%); padding: 16px; display: flex; justify-content: space-between; align-items: flex-end; color: #FFF;">
            <div>
              <h3 style="font-size: 16px; font-weight: 800; margin: 0;">Dubai</h3>
              <p style="font-size: 12px; opacity: 0.8; margin: 0;">UAE</p>
            </div>
            <span style="width: 28px; height: 28px; border-radius: 50%; background: #FFF; color: #0B286C; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;">→</span>
          </div>
        </div>

        <!-- CARD 4: BAKU -->
        <div class="dest-card-box" onclick="navigate('/tourism')">
          <img src="/assets/destinations/umrah_3.jpg" alt="Makkah and Madinah">
          <div style="position: absolute; inset:0; background: linear-gradient(to top, rgba(11,40,108,0.9) 0%, transparent 60%); padding: 16px; display: flex; justify-content: space-between; align-items: flex-end; color: #FFF;">
            <div>
              <h3 style="font-size: 16px; font-weight: 800; margin: 0;">Makkah &amp; Madinah</h3>
              <p style="font-size: 12px; opacity: 0.8; margin: 0;">Saudi Arabia</p>
            </div>
            <span style="width: 28px; height: 28px; border-radius: 50%; background: #FFF; color: #0B286C; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;">→</span>
          </div>
        </div>

        <!-- 7. OMAN SPECIAL OFFER FEATURE CARD -->
        <div style="position: relative; border-radius: 16px; overflow: hidden; height: 260px; background: linear-gradient(135deg, #0B286C 0%, #07153B 100%); color: #FFF; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 16px rgba(0,0,0,0.12);">
          <div>
            <span style="font-size: 10px; font-weight: 800; letter-spacing: 1px; color: #4ADE80; text-transform: uppercase;">EXPLORE OMAN</span>
            <h3 style="font-size: 22px; font-weight: 800; margin: 8px 0 6px; line-height: 1.15;">Discover the<br>Beauty of Oman</h3>
            <p style="font-size: 12px; color: #CBD5E1; margin: 0;">Mountains, beaches, culture and more.</p>
          </div>
          <button onclick="navigate('/tourism')" style="background: #FFF; color: #0B286C; border: 0; padding: 10px 18px; border-radius: 99px; font-size: 13px; font-weight: 800; cursor: pointer; width: fit-content; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            Plan Your Trip →
          </button>
        </div>

      </div>
    </section>

    <!-- 8. FEATURED TOUR PACKAGES SECTION -->
    <section class="shell" style="margin-bottom: 70px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
        <div>
          <h2 style="font-size: 28px; font-weight: 800; color: #0B286C; margin: 0 0 4px; display: flex; align-items: center; gap: 10px;">
            Featured Tour Packages <span class="heading-green-line"></span>
          </h2>
          <p style="color: #64748B; font-size: 14px; margin: 0;">Curated journeys for every type of traveller</p>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" style="color: #00A651; font-weight: 700; text-decoration: none; font-size: 14px;">View All Packages →</a>
          <button style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid #E2E8F0; background: #FFF; cursor: pointer;">‹</button>
          <button style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid #E2E8F0; background: #FFF; cursor: pointer;">›</button>
        </div>
      </div>

      <div class="card-grid" id="home-packages-grid">Loading packages...</div>
    </section>

    <!-- 9. WHY CHOOSE JMT TRAVELS SECTION -->
    <section class="shell" style="margin-bottom: 70px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px;">
        <div>
          <h2 style="font-size: 28px; font-weight: 800; color: #0B286C; margin: 0 0 4px; display: flex; align-items: center; gap: 10px;">
            Why Choose JMT Travels? <span class="heading-green-line"></span>
          </h2>
        </div>
        <a href="/contact" onclick="event.preventDefault(); navigate('/contact')" style="color: #00A651; font-weight: 700; text-decoration: none; font-size: 14px;">Learn More About Us →</a>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">

        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: #E6F6ED; color: #00A651; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 16px;">🛡️</div>
          <h3 style="font-size: 16px; font-weight: 800; color: #0B286C; margin-bottom: 6px;">Expert Travel Assistance</h3>
          <p style="font-size: 13px; color: #64748B; margin: 0; line-height: 1.5;">Personalized guidance for your journey with 20+ years of regional expertise.</p>
        </div>

        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: #E6F6ED; color: #00A651; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 16px;">🌐</div>
          <h3 style="font-size: 16px; font-weight: 800; color: #0B286C; margin-bottom: 6px;">Wide Global Network</h3>
          <p style="font-size: 13px; color: #64748B; margin: 0; line-height: 1.5;">Access to top destinations worldwide with trusted local partner guides.</p>
        </div>

        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: #E6F6ED; color: #00A651; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 16px;">📄</div>
          <h3 style="font-size: 16px; font-weight: 800; color: #0B286C; margin-bottom: 6px;">Visa Made Simple</h3>
          <p style="font-size: 13px; color: #64748B; margin: 0; line-height: 1.5;">Hassle-free e-visa clearing for GCC and international travel destinations.</p>
        </div>

        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: #E6F6ED; color: #00A651; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 16px;">💚</div>
          <h3 style="font-size: 16px; font-weight: 800; color: #0B286C; margin-bottom: 6px;">Dedicated Support</h3>
          <p style="font-size: 13px; color: #64748B; margin: 0; line-height: 1.5;">We are with you at every step with 24/7 WhatsApp &amp; AI care.</p>
        </div>

      </div>
    </section>

    <!-- 10. VISA PROMOTION BANNER -->
    <div class="shell" style="margin-bottom: 70px;">
      <div style="background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 20px; padding: 36px 40px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 24px;">
        <div style="max-width: 600px;">
          <h3 style="font-size: 24px; font-weight: 800; color: #0B286C; margin: 0 0 6px;">Travel Further With JMT</h3>
          <p style="font-size: 14px; color: #475569; margin-bottom: 20px;">Visa assistance made simple.</p>
          <div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 13px; font-weight: 700; color: #0B286C;">
            <div>✈️ Tourist Visa</div>
            <div>💼 Business Visa</div>
            <div>👥 Work Visa</div>
            <div>🎓 Student Visa</div>
          </div>
        </div>
        <a href="/visa" onclick="event.preventDefault(); navigate('/visa')" style="background: #00A651; color: #FFFFFF; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,166,81,0.25);">
          Explore Visa Services →
        </a>
      </div>
    </div>

    <!-- 11. CUSTOMER REVIEWS -->
    <section class="shell" style="margin-bottom: 70px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
        <div>
          <h2 style="font-size: 28px; font-weight: 800; color: #0B286C; margin: 0 0 4px; display: flex; align-items: center; gap: 10px;">
            What Our Travellers Say <span class="heading-green-line"></span>
          </h2>
          <p style="color: #64748B; font-size: 14px; margin: 0;">Real experiences. Lasting memories.</p>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <a href="/contact" onclick="event.preventDefault(); navigate('/contact')" style="color: #00A651; font-weight: 700; text-decoration: none; font-size: 14px;">View All Reviews →</a>
          <button style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid #E2E8F0; background: #FFF; cursor: pointer;">‹</button>
          <button style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid #E2E8F0; background: #FFF; cursor: pointer;">›</button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">

        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <div style="font-size: 32px; color: #00A651; line-height: 1; margin-bottom: 12px;">“</div>
          <p style="font-size: 13px; color: #334155; line-height: 1.6; margin-bottom: 20px;">
            "JMT Travels made our Oman trip truly memorable. Everything was well organized and hassle-free!"
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="font-size: 13px; color: #0B286C; display: block;">Aisha Al Balushi</strong>
              <small style="font-size: 11px; color: #94A3B8;">Muscat, Oman</small>
            </div>
            <div style="color: #F59E0B; font-size: 12px;">⭐⭐⭐⭐⭐</div>
          </div>
        </div>

        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <div style="font-size: 32px; color: #00A651; line-height: 1; margin-bottom: 12px;">“</div>
          <p style="font-size: 13px; color: #334155; line-height: 1.6; margin-bottom: 20px;">
            "Excellent visa service and customer support. Highly recommended!"
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="font-size: 13px; color: #0B286C; display: block;">Rahul Sharma</strong>
              <small style="font-size: 11px; color: #94A3B8;">Dubai, UAE</small>
            </div>
            <div style="color: #F59E0B; font-size: 12px;">⭐⭐⭐⭐⭐</div>
          </div>
        </div>

        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <div style="font-size: 32px; color: #00A651; line-height: 1; margin-bottom: 12px;">“</div>
          <p style="font-size: 13px; color: #334155; line-height: 1.6; margin-bottom: 20px;">
            "Professional, friendly and reliable. Will definitely travel with JMT again!"
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="font-size: 13px; color: #0B286C; display: block;">Fatima Khan</strong>
              <small style="font-size: 11px; color: #94A3B8;">Salalah, Oman</small>
            </div>
            <div style="color: #F59E0B; font-size: 12px;">⭐⭐⭐⭐⭐</div>
          </div>
        </div>

      </div>
    </section>

    <!-- 12. LARGE FINAL CTA BANNER -->
    <div class="shell" style="margin-bottom: 70px;">
      <div style="background: linear-gradient(135deg, rgba(11,40,108,0.9) 0%, rgba(7,21,59,0.92) 100%), url('/assets/destinations/salalah_3.jpg') center/cover no-repeat; border-radius: 20px; padding: 60px 40px; text-align: center; color: #FFFFFF; box-shadow: 0 16px 36px rgba(11,40,108,0.2);">
        <h2 style="font-size: 36px; font-weight: 800; margin-bottom: 12px; color: #FFFFFF;">
          Your Next Journey Starts Here
        </h2>
        <p style="font-size: 16px; color: #E2E8F0; max-width: 500px; margin: 0 auto 28px;">
          Let JMT Travels help you plan it.
        </p>
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" style="background: #00A651; color: #FFFFFF; padding: 14px 32px; font-size: 15px; border-radius: 99px; font-weight: 700; text-decoration: none; box-shadow: 0 6px 20px rgba(0, 166, 81, 0.35);">
            Explore Tours →
          </a>
          <a href="/visa" onclick="event.preventDefault(); navigate('/visa')" style="background: rgba(255,255,255,0.15); border: 1.5px solid rgba(255,255,255,0.4); color: #FFFFFF; padding: 14px 32px; font-size: 15px; border-radius: 99px; font-weight: 700; text-decoration: none; backdrop-filter: blur(8px);">
            Get Visa Assistance
          </a>
        </div>
      </div>
    </div>
  `;

  // Automatic 5-second Slideshow Timer
  heroSlideTimer = setInterval(() => {
    changeHeroSlide(1);
  }, 5000);

  // Load home packages from backend API
  apiCall('/api/tourism/packages').then(res => {
    const grid = document.getElementById('home-packages-grid');
    if (!grid) return;
    if (!res.packages || res.packages.length === 0) {
      grid.innerHTML = '<p>No packages found.</p>';
      return;
    }
    grid.innerHTML = getPublicPackages(res.packages).slice(0, 4).map((pkg, idx) => `
      <div class="card" style="padding: 0; overflow: hidden; border-radius: 16px; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); background: #FFF;">
        <div style="position: relative;">
          <span style="position: absolute; top: 12px; left: 12px; background: #00A651; color: #FFF; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 99px; text-transform: uppercase;">
            ${idx === 0 ? 'Best Seller' : (idx === 1 ? 'Family Favourite' : (idx === 2 ? 'New' : 'Featured'))}
          </span>
          <button style="position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.85); border: 0; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #0F172A;" aria-label="Add to Wishlist">♡</button>
          <img src="${escapeHTML(pkg.image)}" alt="${escapeHTML(pkg.title)} Holiday Package" loading="lazy" style="width: 100%; height: 200px; object-fit: cover;">
        </div>
        <div style="padding: 20px;">
          <h3 style="font-size: 16px; color: #0B286C; font-weight: 800; margin: 0 0 6px;">${escapeHTML(pkg.title)}</h3>
          <p style="color: #64748B; font-size: 12px; margin-bottom: 16px;">⏱️ ${escapeHTML(pkg.duration)} &nbsp;•&nbsp; 📍 ${escapeHTML(pkg.destination)}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #F1F5F9; padding-top: 14px;">
            <div>
              <small style="font-size: 10px; color: #94A3B8; display: block;">Per Person</small>
              <strong style="color: #00A651; font-size: 18px;">${escapeHTML(pkg.currency || 'OMR')} ${pkg.priceMinor ? pkg.priceMinor / 1000 : pkg.price}</strong>
            </div>
            <a href="/tourism/${escapeHTML(pkg.slug)}" onclick="event.preventDefault(); navigate('/tourism/${escapeHTML(pkg.slug)}')" style="width: 36px; height: 36px; border-radius: 50%; background: #00A651; color: #FFF; display: flex; align-items: center; justify-content: center; text-decoration: none; font-size: 16px; font-weight: 800;">→</a>
          </div>
        </div>
      </div>
    `).join('');
  }).catch(() => {});
}

// Global Search Tab Switcher & Flight Search Handler for Homepage (Oman Air Style Selectors)
const AIRPORT_DATASET = [
  { name: "Muscat International Airport", city: "Muscat", country: "Oman", iataCode: "MCT" },
  { name: "Salalah International Airport", city: "Salalah", country: "Oman", iataCode: "SLL" },
  { name: "Duqm International Airport", city: "Duqm", country: "Oman", iataCode: "DQM" },
  { name: "Khasab Airport", city: "Khasab", country: "Oman", iataCode: "KHS" },
  { name: "Sohar Airport", city: "Sohar", country: "Oman", iataCode: "OHS" },

  { name: "Dubai International Airport", city: "Dubai", country: "United Arab Emirates", iataCode: "DXB" },
  { name: "Al Maktoum International Airport", city: "Dubai", country: "United Arab Emirates", iataCode: "DWC" },
  { name: "Zayed International Airport", city: "Abu Dhabi", country: "United Arab Emirates", iataCode: "AUH" },
  { name: "Sharjah International Airport", city: "Sharjah", country: "United Arab Emirates", iataCode: "SHJ" },

  { name: "King Khalid International Airport", city: "Riyadh", country: "Saudi Arabia", iataCode: "RUH" },
  { name: "King Abdulaziz International Airport", city: "Jeddah", country: "Saudi Arabia", iataCode: "JED" },
  { name: "King Fahd International Airport", city: "Dammam", country: "Saudi Arabia", iataCode: "DMM" },
  { name: "Prince Mohammad bin Abdulaziz Airport", city: "Madinah", country: "Saudi Arabia", iataCode: "MED" },

  { name: "Hamad International Airport", city: "Doha", country: "Qatar", iataCode: "DOH" },
  { name: "Bahrain International Airport", city: "Manama", country: "Bahrain", iataCode: "BAH" },
  { name: "Kuwait International Airport", city: "Kuwait City", country: "Kuwait", iataCode: "KWI" },

  { name: "London Heathrow Airport", city: "London", country: "United Kingdom", iataCode: "LHR" },
  { name: "London Gatwick Airport", city: "London", country: "United Kingdom", iataCode: "LGW" },
  { name: "Manchester Airport", city: "Manchester", country: "United Kingdom", iataCode: "MAN" },

  { name: "Paris Charles de Gaulle Airport", city: "Paris", country: "France", iataCode: "CDG" },
  { name: "Frankfurt Airport", city: "Frankfurt", country: "Germany", iataCode: "FRA" },
  { name: "Munich Airport", city: "Munich", country: "Germany", iataCode: "MUC" },
  { name: "Amsterdam Airport Schiphol", city: "Amsterdam", country: "Netherlands", iataCode: "AMS" },
  { name: "Zurich Airport", city: "Zurich", country: "Switzerland", iataCode: "ZRH" },

  { name: "Indira Gandhi International Airport", city: "New Delhi", country: "India", iataCode: "DEL" },
  { name: "Chhatrapati Shivaji Maharaj Airport", city: "Mumbai", country: "India", iataCode: "BOM" },
  { name: "Cochin International Airport", city: "Kochi", country: "India", iataCode: "COK" },
  { name: "Calicut International Airport", city: "Kozhikode", country: "India", iataCode: "CCJ" },
  { name: "Trivandrum International Airport", city: "Thiruvananthapuram", country: "India", iataCode: "TRV" },
  { name: "Chennai International Airport", city: "Chennai", country: "India", iataCode: "MAA" },

  { name: "Jinnah International Airport", city: "Karachi", country: "Pakistan", iataCode: "KHI" },
  { name: "Allama Iqbal International Airport", city: "Lahore", country: "Pakistan", iataCode: "LHE" },
  { name: "Islamabad International Airport", city: "Islamabad", country: "Pakistan", iataCode: "ISB" },

  { name: "Hazrat Shahjalal International Airport", city: "Dhaka", country: "Bangladesh", iataCode: "DAC" },
  { name: "Bandaranaike International Airport", city: "Colombo", country: "Sri Lanka", iataCode: "CMB" },
  { name: "Cairo International Airport", city: "Cairo", country: "Egypt", iataCode: "CAI" },
  { name: "Istanbul Airport", city: "Istanbul", country: "Turkey", iataCode: "IST" },
  { name: "Suvarnabhumi Airport", city: "Bangkok", country: "Thailand", iataCode: "BKK" },
  { name: "Kuala Lumpur International Airport", city: "Kuala Lumpur", country: "Malaysia", iataCode: "KUL" },
  { name: "Singapore Changi Airport", city: "Singapore", country: "Singapore", iataCode: "SIN" },
  { name: "John F. Kennedy International Airport", city: "New York", country: "United States", iataCode: "JFK" }
];

window.flightSearchState = {
  tripType: 'round-trip',
  adults: 1,
  children: 0,
  infants: 0,
  cabinClass: 'Economy',
  promoCode: '',
  fromAirport: AIRPORT_DATASET[0],
  toAirport: AIRPORT_DATASET[5]
};

let activeAirportField = null;
let highlightedAirportIndex = -1;

window.focusAirportInput = function(field) {
  const input = document.getElementById(`flight-${field}-input`);
  if (input) input.focus();
};

window.openAirportDropdown = function(field) {
  activeAirportField = field;
  highlightedAirportIndex = -1;
  closeFlightPopovers();

  const otherField = field === 'from' ? 'to' : 'from';
  const otherDropdown = document.getElementById(`${otherField}-airport-dropdown`);
  if (otherDropdown) otherDropdown.style.display = 'none';

  const input = document.getElementById(`flight-${field}-input`);
  const dropdown = document.getElementById(`${field}-airport-dropdown`);
  if (!dropdown || !input) return;

  input.select();
  renderAirportDropdownResults(field, input.value.trim());
  dropdown.style.display = 'block';
};

window.filterAirportDropdown = function(field, query) {
  highlightedAirportIndex = -1;
  renderAirportDropdownResults(field, query.trim());
};

function renderAirportDropdownResults(field, query) {
  const dropdown = document.getElementById(`${field}-airport-dropdown`);
  if (!dropdown) return;

  const q = query.toLowerCase();
  let filtered = [];

  if (!q) {
    filtered = AIRPORT_DATASET;
  } else {
    filtered = AIRPORT_DATASET.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.country.toLowerCase().includes(q) ||
      a.iataCode.toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    dropdown.innerHTML = `<div style="padding: 14px; text-align: center; color: #64748B; font-size: 13px;">No airports matching "${escapeHTML(query)}"</div>`;
    return;
  }

  dropdown.innerHTML = filtered.map((item, idx) => `
    <div class="jmt-airport-option ${idx === highlightedAirportIndex ? 'highlighted' : ''}" 
         onclick="selectAirport('${field}', '${item.iataCode}')"
         onmouseenter="highlightAirportOption(${idx})">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="color: #0B286C; font-size: 13.5px; display: block; line-height: 1.2;">${escapeHTML(item.name)}</strong>
          <small style="color: #64748B; font-size: 11.5px;">${escapeHTML(item.city)}, ${escapeHTML(item.country)}</small>
        </div>
        <span class="jmt-iata-pill">${escapeHTML(item.iataCode)}</span>
      </div>
    </div>
  `).join('');
}

window.highlightAirportOption = function(index) {
  highlightedAirportIndex = index;
};

window.selectAirport = function(field, iataCode) {
  const airport = AIRPORT_DATASET.find(a => a.iataCode === iataCode);
  if (!airport) return;

  if (field === 'from') {
    flightSearchState.fromAirport = airport;
    const input = document.getElementById('flight-from-input');
    if (input) input.value = `${airport.name} (${airport.iataCode})`;
  } else {
    flightSearchState.toAirport = airport;
    const input = document.getElementById('flight-to-input');
    if (input) input.value = `${airport.name} (${airport.iataCode})`;
  }

  const dropdown = document.getElementById(`${field}-airport-dropdown`);
  if (dropdown) dropdown.style.display = 'none';

  activeAirportField = null;

  const errorEl = document.getElementById('flight-search-error');
  if (errorEl) {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }
};

window.handleAirportKeydown = function(field, event) {
  const dropdown = document.getElementById(`${field}-airport-dropdown`);
  if (!dropdown || dropdown.style.display === 'none') return;

  const options = dropdown.querySelectorAll('.jmt-airport-option');
  if (!options.length) return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    highlightedAirportIndex = (highlightedAirportIndex + 1) % options.length;
    updateAirportOptionHighlights(options);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    highlightedAirportIndex = (highlightedAirportIndex - 1 + options.length) % options.length;
    updateAirportOptionHighlights(options);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    if (highlightedAirportIndex >= 0 && highlightedAirportIndex < options.length) {
      options[highlightedAirportIndex].click();
    }
  } else if (event.key === 'Escape') {
    event.preventDefault();
    dropdown.style.display = 'none';
    activeAirportField = null;
  }
};

function updateAirportOptionHighlights(options) {
  options.forEach((opt, idx) => {
    if (idx === highlightedAirportIndex) {
      opt.classList.add('highlighted');
      opt.scrollIntoView({ block: 'nearest' });
    } else {
      opt.classList.remove('highlighted');
    }
  });
}

window.swapFlightAirports = function() {
  const temp = flightSearchState.fromAirport;
  flightSearchState.fromAirport = flightSearchState.toAirport;
  flightSearchState.toAirport = temp;

  const fromInput = document.getElementById('flight-from-input');
  const toInput = document.getElementById('flight-to-input');

  if (fromInput && flightSearchState.fromAirport) {
    fromInput.value = `${flightSearchState.fromAirport.name} (${flightSearchState.fromAirport.iataCode})`;
  }
  if (toInput && flightSearchState.toAirport) {
    toInput.value = `${flightSearchState.toAirport.name} (${flightSearchState.toAirport.iataCode})`;
  }

  const errorEl = document.getElementById('flight-search-error');
  if (errorEl) {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }
};

window.switchHomeTab = function(tabName) {
  const tabs = document.querySelectorAll('.search-tab-item');
  tabs.forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  const activeTab = document.getElementById(`tab-${tabName}`);
  if (activeTab) {
    activeTab.classList.add('active');
    activeTab.setAttribute('aria-selected', 'true');
  }

  const genericPanel = document.getElementById('home-generic-panel');
  const flightPanel = document.getElementById('home-flight-panel');

  if (tabName === 'flights') {
    if (genericPanel) genericPanel.style.display = 'none';
    if (flightPanel) {
      flightPanel.style.display = 'block';
      initFlightSearchDates();
    }
  } else {
    if (flightPanel) flightPanel.style.display = 'none';
    if (genericPanel) genericPanel.style.display = 'block';

    const btn = document.querySelector('#home-generic-panel .search-submit-btn');
    if (btn) {
      if (tabName === 'visa') btn.innerHTML = '🔍 Search E-Visas →';
      else if (tabName === 'hotels') btn.innerHTML = '🔍 Search Hotels →';
      else btn.innerHTML = '🔍 Search Packages →';
    }
  }
};

function initFlightSearchDates() {
  const deptInput = document.getElementById('flight-dept-input');
  const returnInput = document.getElementById('flight-return-input');
  if (!deptInput || !returnInput) return;

  const today = new Date();
  const deptDate = new Date(today);
  deptDate.setDate(today.getDate() + 1);

  const returnDate = new Date(deptDate);
  returnDate.setDate(deptDate.getDate() + 7);

  const todayStr = today.toISOString().split('T')[0];
  const deptStr = deptDate.toISOString().split('T')[0];
  const returnStr = returnDate.toISOString().split('T')[0];

  deptInput.min = todayStr;
  if (!deptInput.value) deptInput.value = deptStr;

  returnInput.min = deptInput.value || deptStr;
  if (!returnInput.value) returnInput.value = returnStr;

  deptInput.onchange = () => {
    returnInput.min = deptInput.value;
    if (returnInput.value && returnInput.value < deptInput.value) {
      returnInput.value = deptInput.value;
    }
  };
}

window.toggleFlightPopover = function(popoverName) {
  const popovers = ['triptype', 'passengers', 'promo'];
  popovers.forEach(name => {
    const el = document.getElementById(`popover-${name}`);
    if (name === popoverName) {
      if (el) {
        const isVisible = el.style.display === 'block';
        el.style.display = isVisible ? 'none' : 'block';
      }
    } else {
      if (el) el.style.display = 'none';
    }
  });
};

window.closeFlightPopovers = function() {
  ['triptype', 'passengers', 'promo'].forEach(name => {
    const el = document.getElementById(`popover-${name}`);
    if (el) el.style.display = 'none';
  });
};

window.setFlightTripType = function(type) {
  flightSearchState.tripType = type;
  const label = document.getElementById('flight-triptype-label');
  if (label) label.textContent = type === 'one-way' ? 'One-way' : 'Round-trip';

  const returnBox = document.getElementById('flight-return-box');
  const returnInput = document.getElementById('flight-return-input');
  if (returnBox) {
    if (type === 'one-way') {
      returnBox.style.opacity = '0.4';
      returnBox.style.pointerEvents = 'none';
      if (returnInput) returnInput.removeAttribute('required');
    } else {
      returnBox.style.opacity = '1';
      returnBox.style.pointerEvents = 'auto';
      if (returnInput) returnInput.setAttribute('required', 'true');
    }
  }
  closeFlightPopovers();
};

window.updatePaxCount = function(type, delta) {
  if (type === 'adults') {
    flightSearchState.adults = Math.max(1, flightSearchState.adults + delta);
    if (flightSearchState.infants > flightSearchState.adults) {
      flightSearchState.infants = flightSearchState.adults;
    }
  } else if (type === 'children') {
    flightSearchState.children = Math.max(0, flightSearchState.children + delta);
  } else if (type === 'infants') {
    flightSearchState.infants = Math.max(0, Math.min(flightSearchState.adults, flightSearchState.infants + delta));
  }

  const countAdults = document.getElementById('count-adults');
  const countChildren = document.getElementById('count-children');
  const countInfants = document.getElementById('count-infants');
  if (countAdults) countAdults.textContent = flightSearchState.adults;
  if (countChildren) countChildren.textContent = flightSearchState.children;
  if (countInfants) countInfants.textContent = flightSearchState.infants;

  updatePaxPillLabel();
};

window.updateFlightCabin = function(cabin) {
  flightSearchState.cabinClass = cabin;
  updatePaxPillLabel();
};

function updatePaxPillLabel() {
  const paxPill = document.getElementById('flight-pax-label');
  if (!paxPill) return;

  const totalPax = flightSearchState.adults + flightSearchState.children + flightSearchState.infants;
  const paxText = totalPax === 1 ? '1 Adult' : `${totalPax} Guests`;
  paxPill.textContent = `${paxText}, ${flightSearchState.cabinClass}`;
}

window.applyFlightPromo = function() {
  const input = document.getElementById('flight-promo-input');
  const msg = document.getElementById('flight-promo-msg');
  const label = document.getElementById('flight-promo-label');
  if (input && msg) {
    const val = input.value.trim().toUpperCase();
    if (val) {
      flightSearchState.promoCode = val;
      msg.style.color = '#00A651';
      msg.textContent = `Promo code "${val}" applied!`;
      if (label) label.textContent = `Promo: ${val}`;
    } else {
      flightSearchState.promoCode = '';
      msg.style.color = '#64748B';
      msg.textContent = '';
      if (label) label.textContent = 'Promo Code';
    }
  }
  setTimeout(() => closeFlightPopovers(), 1200);
};

window.handleHomeSearch = function(event) {
  event.preventDefault();
  const activeTab = document.querySelector('.search-tab-item.active')?.id || '';
  if (activeTab === 'tab-visa') {
    navigate('/visa');
  } else if (activeTab === 'tab-hotels') {
    navigate('/hotels');
  } else {
    navigate('/tourism');
  }
};

window.handleHomeFlightSearch = function(event) {
  event.preventDefault();
  const errorEl = document.getElementById('flight-search-error');
  if (errorEl) {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }

  const fromCode = flightSearchState.fromAirport?.iataCode || getIataFromInput('from');
  const toCode = flightSearchState.toAirport?.iataCode || getIataFromInput('to');

  if (!fromCode || !toCode) {
    showFlightError('Please select valid origin and destination airports.');
    return;
  }

  if (fromCode.toUpperCase() === toCode.toUpperCase()) {
    showFlightError('Origin and destination cannot be the same airport.');
    return;
  }

  const deptVal = document.getElementById('flight-dept-input')?.value || '';
  const returnVal = document.getElementById('flight-return-input')?.value || '';

  if (!deptVal) {
    showFlightError('Please select a departure date.');
    return;
  }

  if (flightSearchState.tripType === 'round-trip') {
    if (!returnVal) {
      showFlightError('Please select a return date.');
      return;
    }
    if (returnVal < deptVal) {
      showFlightError('Return date must be on or after departure date.');
      return;
    }
  }

  if (flightSearchState.adults < 1) {
    showFlightError('At least 1 adult passenger is required.');
    return;
  }

  if (flightSearchState.infants > flightSearchState.adults) {
    showFlightError('Number of infants cannot exceed number of adult passengers.');
    return;
  }

  const query = new URLSearchParams({
    from: fromCode.toUpperCase(),
    to: toCode.toUpperCase(),
    dept: deptVal,
    trip: flightSearchState.tripType,
    cabin: flightSearchState.cabinClass,
    adults: flightSearchState.adults,
    children: flightSearchState.children,
    infants: flightSearchState.infants
  });

  if (flightSearchState.tripType === 'round-trip' && returnVal) {
    query.set('return', returnVal);
  }

  if (flightSearchState.promoCode) {
    query.set('promo', flightSearchState.promoCode);
  }

  navigate(`/flights?${query.toString()}`);
};

function getIataFromInput(field) {
  const val = document.getElementById(`flight-${field}-input`)?.value.trim() || '';
  const match = val.match(/\(([A-Z]{3})\)/i);
  if (match) return match[1].toUpperCase();

  const found = AIRPORT_DATASET.find(a =>
    a.iataCode.toLowerCase() === val.toLowerCase() ||
    a.name.toLowerCase().includes(val.toLowerCase()) ||
    a.city.toLowerCase().includes(val.toLowerCase())
  );
  return found ? found.iataCode : null;
}

function showFlightError(msg) {
  const errorEl = document.getElementById('flight-search-error');
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }
}

// Global click & Escape key listeners for Airport Dropdowns and Flight Popovers
document.addEventListener('click', (e) => {
  if (!e.target.closest('#from-airport-container')) {
    const d = document.getElementById('from-airport-dropdown');
    if (d) d.style.display = 'none';
  }
  if (!e.target.closest('#to-airport-container')) {
    const d = document.getElementById('to-airport-dropdown');
    if (d) d.style.display = 'none';
  }
  if (!e.target.closest('.jmt-flight-top-controls')) {
    closeFlightPopovers();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const dFrom = document.getElementById('from-airport-dropdown');
    const dTo = document.getElementById('to-airport-dropdown');
    if (dFrom) dFrom.style.display = 'none';
    if (dTo) dTo.style.display = 'none';
    closeFlightPopovers();
  }
});

const OMAN_VISA_CATEGORIES = [
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
    image: '/assets/destinations/salalah_1.jpg',
    alt: 'Oman mountains, coastal beaches and traditional forts for tourist visa services'
  },
  {
    slug: 'oman-business-visa',
    title: 'Oman Business Visa',
    country: 'Oman',
    visaType: 'Business',
    icon: '💼',
    description: "Professional visa assistance for corporate delegations, commercial meetings, trade conferences, and business travel to Oman.",
    validity: '21 Days / 1 Year',
    processingTime: '24–48 Hours',
    entryType: 'Single / Multiple',
    price: 'OMR 35.000',
    image: '/assets/destinations/salalah_2.jpg',
    alt: 'Muscat business district and modern Oman architecture for business visa'
  },
  {
    slug: 'oman-family-visa',
    title: 'Oman Family Visit Visa',
    country: 'Oman',
    visaType: 'Family Visit',
    icon: '👨‍👩‍👧‍👦',
    description: "Dedicated document clearing for visiting relatives, family reunions, and expatriate family entry to the Sultanate of Oman.",
    validity: '30 Days / 3 Months',
    processingTime: '48 Hours',
    entryType: 'Single / Multiple',
    price: 'OMR 25.000',
    image: '/assets/destinations/salalah_3.jpg',
    alt: 'Omani family travel atmosphere and welcoming destination imagery'
  },
  {
    slug: 'oman-work-visa',
    title: 'Oman Work Visa',
    country: 'Oman',
    visaType: 'Work & Employment',
    icon: '🏗️',
    description: "End-to-end assistance with employment visa clearance, Ministry labor approvals, and residence permit processing for Oman.",
    validity: '2 Years Resident',
    processingTime: '3–5 Business Days',
    entryType: 'Resident Work Permit',
    price: 'OMR 60.000',
    image: '/assets/destinations/salalah_4.jpg',
    alt: 'Oman business and professional work environment'
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
    image: '/assets/destinations/salalah_1.jpg',
    alt: 'Muscat International Airport and aircraft travel imagery'
  }
];

/**
 * Renders a video-ready travel media component with poster fallback and accessibility support.
 * @param {Object} opts
 * @param {string} [opts.videoSrc] Optional MP4 video path
 * @param {string} opts.posterSrc Required poster image path
 * @param {string} opts.alt Alt description for accessibility
 * @param {string} [opts.badgeText] Optional badge text (e.g. "JMT Travel Desk")
 * @param {string} [opts.aspectRatio] Optional aspect ratio (default: "4 / 3")
 * @param {string} [opts.overlayGradient] Optional CSS gradient overlay
 * @returns {string} HTML string
 */
function renderTravelMediaHTML(opts) {
  const {
    videoSrc = '',
    posterSrc = '',
    alt = 'JMT Travels visual',
    badgeText = 'JMT Travel Desk',
    aspectRatio = '4 / 3',
    overlayGradient = 'linear-gradient(180deg, rgba(3, 25, 68, 0.15) 0%, rgba(3, 25, 68, 0.45) 100%)'
  } = opts;

  const badgeHTML = badgeText ? `
    <div class="jmt-media-badge" style="position: absolute; bottom: 18px; left: 18px; background: rgba(7, 21, 59, 0.85); color: #FFFFFF; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); padding: 8px 18px; border-radius: 99px; font-weight: 800; font-size: 12px; border: 1px solid rgba(255, 255, 255, 0.2); display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.25); z-index: 3;">
      <span style="width: 8px; height: 8px; border-radius: 50%; background: #00A651; display: inline-block;"></span>
      ${escapeHTML(badgeText)}
    </div>
  ` : '';

  const overlayHTML = overlayGradient ? `
    <div style="position: absolute; inset: 0; background: ${overlayGradient}; z-index: 2; pointer-events: none; border-radius: 28px;"></div>
  ` : '';

  if (videoSrc) {
    return `
      <div class="jmt-travel-media" style="position: relative; width: 100%; aspect-ratio: ${aspectRatio}; border-radius: 28px; overflow: hidden; box-shadow: 0 14px 36px rgba(0,0,0,0.25); background: #07153B;">
        ${overlayHTML}
        <video
          autoplay
          muted
          loop
          playsinline
          preload="metadata"
          poster="${escapeHTML(posterSrc)}"
          aria-label="${escapeHTML(alt)}"
          class="jmt-media-video"
          style="width: 100%; height: 100%; object-fit: cover; display: block; position: absolute; inset: 0; z-index: 1;"
          onerror="this.style.display='none'; var f=this.nextElementSibling; if(f) f.style.display='block';"
        >
          <source src="${escapeHTML(videoSrc)}" type="video/mp4">
          <img src="${escapeHTML(posterSrc)}" alt="${escapeHTML(alt)}" loading="lazy" class="jmt-media-poster" style="width: 100%; height: 100%; object-fit: cover; display: block;">
        </video>
        <img src="${escapeHTML(posterSrc)}" alt="${escapeHTML(alt)}" loading="lazy" class="jmt-media-poster-fallback" style="width: 100%; height: 100%; object-fit: cover; display: none; position: absolute; inset: 0; z-index: 1;">
        ${badgeHTML}
      </div>
    `;
  }

  return `
    <div class="jmt-travel-media" style="position: relative; width: 100%; aspect-ratio: ${aspectRatio}; border-radius: 28px; overflow: hidden; box-shadow: 0 14px 36px rgba(0,0,0,0.25); background: #07153B;">
      ${overlayHTML}
      <img src="${escapeHTML(posterSrc)}" alt="${escapeHTML(alt)}" loading="lazy" class="jmt-media-poster" style="width: 100%; height: 100%; object-fit: cover; display: block; position: absolute; inset: 0; z-index: 1;" onerror="this.onerror=null;this.src='/assets/destinations/salalah_1.jpg';">
      ${badgeHTML}
    </div>
  `;
}

async function renderVisaListPage(container) {
  const searchParams = new URLSearchParams(window.location.search);
  const serviceParam = searchParams.get('service');
  const isSchengen = serviceParam === 'schengen' || window.location.pathname === '/schengen-visa';

  if (isSchengen) {
    updateSEO({
      title: 'Schengen Visa Consultation & Services | JMT Travels Muscat',
      description: 'Professional guidance for European Schengen visa document preparation, embassy appointments, travel insurance, and flight/hotel itineraries.',
      canonicalUrl: '/visa?service=schengen',
      noindex: false
    });
    announceToSR('Navigated to Schengen Visa Assistance Page');
  } else {
    updateSEO({
      title: 'Oman Visa Services & Application Assistance | JMT Travels Muscat',
      description: 'Apply for Oman tourist, business, family, work, and transit visas with JMT Travels Muscat. Trusted Oman e-visa intake & clearing services.',
      canonicalUrl: '/visa',
      noindex: false
    });
    announceToSR('Navigated to Oman Visa Services Catalogue');
  }

  container.innerHTML = `<div class="shell" style="padding: 40px 20px;"><p style="color: #64748B;">Loading visa services...</p></div>`;
  try {
    const res = await apiCall('/api/visa/services');
    const dbServices = res.services || [];

    const schengenImageUri = 'https://vid.alarabiya.net/images/2023/06/14/32b9cdfd-909b-4d78-8d62-bba9b530af6d/32b9cdfd-909b-4d78-8d62-bba9b530af6d_16x9_1200x676.jpg';

    const visaMediaHTML = renderTravelMediaHTML({
      videoSrc: isSchengen ? '/assets/videos/schengen.mp4' : '/assets/videos/oman_visa.mp4',
      posterSrc: isSchengen ? schengenImageUri : '/assets/destinations/oman_visa_poster.jpg',
      alt: isSchengen ? 'European Schengen Visa Assistance & Embassy Appointments' : 'Apply for an Oman Visa',
      badgeText: 'JMT Travel Desk',
      aspectRatio: '4 / 3',
      overlayGradient: isSchengen ? 'linear-gradient(180deg, rgba(7, 21, 59, 0.45) 0%, rgba(0, 166, 81, 0.4) 100%)' : 'linear-gradient(180deg, rgba(3, 25, 68, 0.15) 0%, rgba(3, 25, 68, 0.45) 100%)'
    });

    container.innerHTML = `
      <div class="shell" style="padding: 30px 20px 60px;">
        <!-- HERO SECTION (TWO-COLUMN DESKTOP LAYOUT) -->
        <div class="jmt-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 65%, #153B8A 100%); color: #FFFFFF; border-radius: 24px; padding: 48px; margin-bottom: 40px; border: 0; box-shadow: 0 16px 40px rgba(7,21,59,0.18); position: relative; overflow: hidden;">
          <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 40px; align-items: center;" class="jmt-hero-grid">
            
            <!-- LEFT HERO COLUMN -->
            <div>
              <span style="display: inline-block; background: rgba(0, 166, 81, 0.25); color: #00E676; font-size: 12px; font-weight: 800; padding: 4px 14px; border-radius: 50px; letter-spacing: 1.5px; margin-bottom: 14px; text-transform: uppercase;">
                ${isSchengen ? 'SCHENGEN VISA SERVICES' : 'OMAN VISA SERVICES'}
              </span>
              <h1 style="font-size: clamp(30px, 3.8vw, 44px); font-weight: 800; margin: 0 0 14px; line-height: 1.2; color: #FFFFFF !important; text-shadow: 0 2px 10px rgba(0,0,0,0.6);">
                ${isSchengen ? 'Schengen Visa Assistance & Appointments' : 'Apply for an Oman Visa'}
              </h1>
              <p style="font-size: 16px; color: #D6E0F4 !important; margin: 0 0 24px; line-height: 1.6; max-width: 560px;">
                ${isSchengen ? 'Professional guidance for European Schengen visa document preparation, embassy appointments, travel insurance, and flight/hotel itineraries.' : "Whether you're visiting Oman for tourism, business, work, family, or transit, JMT Travels provides trusted Oman visa assistance for travellers worldwide."}
              </p>

              <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 28px;">
                <span style="background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.3); color: #FFFFFF; font-size: 12.5px; font-weight: 700; padding: 5px 14px; border-radius: 50px;">${isSchengen ? '✓ European Schengen' : '✓ All Visa Types'}</span>
                <span style="background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.3); color: #FFFFFF; font-size: 12.5px; font-weight: 700; padding: 5px 14px; border-radius: 50px;">${isSchengen ? '✓ Embassy Appointments' : '✓ Fast Processing'}</span>
                <span style="background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.3); color: #FFFFFF; font-size: 12.5px; font-weight: 700; padding: 5px 14px; border-radius: 50px;">✓ Trusted Support</span>
              </div>

              <div style="display: flex; gap: 14px; flex-wrap: wrap; align-items: center;">
                <a href="${isSchengen ? 'https://wa.me/96897608999?text=Schengen%20Appointment%20Inquiry' : '#visa-grid'}" target="${isSchengen ? '_blank' : '_self'}" rel="${isSchengen ? 'noopener' : ''}" class="jmt-btn-primary" style="background: #00A651; color: #FFF; font-weight: 700; padding: 14px 28px; border-radius: 999px; text-decoration: none;">
                  ${isSchengen ? '💬 Book Schengen Appointment via WhatsApp' : 'Apply for Oman Visa →'}
                </a>
                <a href="https://wa.me/96897608999?text=Inquiry%20regarding%20Oman%20Visa%20Services" target="_blank" rel="noopener" class="jmt-btn-secondary" style="background: rgba(255,255,255,0.12); color: #FFFFFF !important; border: 1.5px solid rgba(255,255,255,0.4); padding: 14px 24px; border-radius: 999px; text-decoration: none;">
                  Talk to a Visa Specialist
                </a>
                <a href="https://mail.google.com/mail/?view=cm&fs=1&to=info%40jmttravels.com" target="_blank" rel="noopener noreferrer" aria-label="Email JMT Travels via Gmail" class="jmt-btn-secondary" style="background: rgba(255,255,255,0.12); color: #FFFFFF !important; border: 1.5px solid rgba(255,255,255,0.4); padding: 14px 20px; border-radius: 999px; text-decoration: none;">
                  ✉️ Email info@jmttravels.com
                </a>
              </div>
            </div>

            <!-- RIGHT HERO COLUMN (CINEMATIC TRAVEL MEDIA + FLOATING BADGE) -->
            <div>
              ${visaMediaHTML}
            </div>

          </div>
        </div>

        <!-- 4-STEP PROCESS TIMELINE -->
        <div style="margin-bottom: 50px;">
          <h2 style="font-size: 22px; color: #0B286C; font-weight: 800; margin-bottom: 20px;">4-Step Simple Visa Clearance Process</h2>
          <div class="jmt-step-grid">
            <div class="jmt-step-card">
              <div class="jmt-step-num">1</div>
              <h3 style="font-size: 15px; color: #0B286C; font-weight: 800; margin-bottom: 6px;">Select Visa &amp; Category</h3>
              <p style="font-size: 13px; color: #64748B; margin: 0;">Choose the right Oman visa category (Tourist, Business, Family, Work, or Transit).</p>
            </div>
            <div class="jmt-step-card">
              <div class="jmt-step-num">2</div>
              <h3 style="font-size: 15px; color: #0B286C; font-weight: 800; margin-bottom: 6px;">Submit Digital Intake</h3>
              <p style="font-size: 13px; color: #64748B; margin: 0;">Fill out basic traveller details and receive your personalized document checklist.</p>
            </div>
            <div class="jmt-step-card">
              <div class="jmt-step-num">3</div>
              <h3 style="font-size: 15px; color: #0B286C; font-weight: 800; margin-bottom: 6px;">Expert Document Verification</h3>
              <p style="font-size: 13px; color: #64748B; margin: 0;">Our Muscat visa desk verifies your passport, photo, and supporting documents.</p>
            </div>
            <div class="jmt-step-card">
              <div class="jmt-step-num">4</div>
              <h3 style="font-size: 15px; color: #0B286C; font-weight: 800; margin-bottom: 6px;">Receive Approved Visa</h3>
              <p style="font-size: 13px; color: #64748B; margin: 0;">Track status in real time and receive your official visa document via digital delivery.</p>
            </div>
          </div>
        </div>

        <!-- VISA CATALOGUE GRID -->
        <div id="visa-grid" style="margin-bottom: 50px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
            <div>
              <span class="jmt-iata-pill" style="margin-bottom: 8px; display: inline-block;">SULTANATE OF OMAN</span>
              <h2 style="font-size: 26px; color: #0B286C; font-weight: 800; margin: 0;">Explore Oman Visa Categories</h2>
            </div>
            <p style="font-size: 14px; color: #64748B; margin: 0;">Fast-track application intake & document clearing for international travellers & GCC residents.</p>
          </div>

          <div class="jmt-visa-card-grid">
            ${OMAN_VISA_CATEGORIES.map(v => {
              const matchedDb = dbServices.find(s => s.slug === v.slug);
              const validity = matchedDb ? matchedDb.validity : v.validity;
              const procTime = matchedDb ? matchedDb.processingTime : v.processingTime;
              const entryType = matchedDb ? matchedDb.entryType : v.entryType;
              const overview = matchedDb ? matchedDb.overview : v.description;

              return `
                <div class="jmt-oman-visa-card">
                  <div class="jmt-oman-visa-card-bg" style="background-image: url('${v.image}');" role="img" aria-label="${escapeHTML(v.alt)}"></div>
                  <div class="jmt-oman-visa-card-content">
                    <div>
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <span style="font-size: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${v.icon}</span>
                        <span style="background: rgba(0, 166, 81, 0.3); border: 1px solid rgba(0, 230, 118, 0.5); color: #00E676; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 50px;">
                          ⏱️ ${escapeHTML(procTime)}
                        </span>
                      </div>

                      <h3 style="font-size: 22px; color: #FFFFFF; font-weight: 800; margin: 0 0 10px; line-height: 1.3; text-shadow: 0 2px 6px rgba(0,0,0,0.4);">
                        ${escapeHTML(v.title)}
                      </h3>

                      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;">
                        <span style="background: rgba(255,255,255,0.18); backdrop-filter: blur(4px); color: #FFFFFF; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 6px;">
                          📅 ${escapeHTML(validity)}
                        </span>
                        <span style="background: rgba(255,255,255,0.18); backdrop-filter: blur(4px); color: #FFFFFF; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 6px;">
                          ✈️ ${escapeHTML(entryType)}
                        </span>
                      </div>

                      <p style="font-size: 14px; color: rgba(255,255,255,0.92); line-height: 1.6; margin: 0 0 20px;">
                        ${escapeHTML(overview)}
                      </p>
                    </div>

                    <div>
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-top: 1px solid rgba(255,255,255,0.18); padding-top: 14px;">
                        <span style="font-size: 12px; color: #CBD5E1; font-weight: 500;">Service Fee</span>
                        <span style="font-size: 18px; font-weight: 800; color: #FFFFFF;">${escapeHTML(v.price)}</span>
                      </div>

                      <div style="display: flex; gap: 10px;">
                        <a href="/visa-apply?service=${escapeHTML(v.slug)}" onclick="event.preventDefault(); navigate('/visa-apply?service=${escapeHTML(v.slug)}')" class="jmt-btn-primary" aria-label="Apply for ${escapeHTML(v.title)}" style="flex: 1.2; justify-content: center; background: #00A651; color: #FFF; font-weight: 700; padding: 12px 16px; border-radius: 999px; text-decoration: none; font-size: 13.5px;">
                          Apply Now →
                        </a>
                        <a href="/visa/${escapeHTML(v.slug)}" onclick="event.preventDefault(); navigate('/visa/${escapeHTML(v.slug)}')" class="jmt-btn-secondary" aria-label="View details for ${escapeHTML(v.title)}" style="flex: 0.8; justify-content: center; background: rgba(255,255,255,0.15); color: #FFF; border: 1px solid rgba(255,255,255,0.4); padding: 12px 14px; border-radius: 999px; text-decoration: none; font-size: 13.5px;">
                          Details →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- OMAN VISA BENEFITS STRIP -->
        <div class="jmt-benefits-strip">
          <h2 style="font-size: 22px; color: #0B286C; font-weight: 800; margin: 0 0 24px; text-align: center;">
            Why Choose JMT Travels for Your Oman Visa?
          </h2>
          <div class="jmt-benefits-grid">
            <div class="jmt-benefit-item">
              <div class="jmt-benefit-icon">🛡️</div>
              <div>
                <h3 style="font-size: 16px; color: #0B286C; font-weight: 800; margin: 0 0 4px;">Reliable &amp; Secure</h3>
                <p style="font-size: 13.5px; color: #475569; margin: 0; line-height: 1.5;">Your visa documents and passport details are handled with strict privacy and care.</p>
              </div>
            </div>

            <div class="jmt-benefit-item">
              <div class="jmt-benefit-icon">⚡</div>
              <div>
                <h3 style="font-size: 16px; color: #0B286C; font-weight: 800; margin: 0 0 4px;">Fast Processing</h3>
                <p style="font-size: 13.5px; color: #475569; margin: 0; line-height: 1.5;">Efficient visa assistance and application intake support for rapid approval.</p>
              </div>
            </div>

            <div class="jmt-benefit-item">
              <div class="jmt-benefit-icon">👨‍💼</div>
              <div>
                <h3 style="font-size: 16px; color: #0B286C; font-weight: 800; margin: 0 0 4px;">Expert Guidance</h3>
                <p style="font-size: 13.5px; color: #475569; margin: 0; line-height: 1.5;">Personalized help throughout your application process from Muscat visa specialists.</p>
              </div>
            </div>

            <div class="jmt-benefit-item">
              <div class="jmt-benefit-icon">🌍</div>
              <div>
                <h3 style="font-size: 16px; color: #0B286C; font-weight: 800; margin: 0 0 4px;">Worldwide Assistance</h3>
                <p style="font-size: 13.5px; color: #475569; margin: 0; line-height: 1.5;">Comprehensive visa intake support for travellers from different countries globally.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- VISA APPLICATION DISCLAIMER -->
        <div class="jmt-disclaimer-box">
          <div style="font-weight: 700; color: #0B286C; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            <span>ℹ️</span> Official Visa Intake Disclaimer
          </div>
          <div>
            Visa approval is subject to the requirements and decision of the relevant Oman authorities. Processing times and eligibility may vary by visa type and applicant nationality. JMT Travels provides application intake, document verification, and clearance assistance.
          </div>
        </div>

        <!-- OMAN VISAS FINAL CTA SECTION -->
        <div class="jmt-oman-cta-section">
          <h2 style="font-size: 28px; font-weight: 800; margin: 0 0 10px; color: #FFFFFF;">Ready to Travel to Oman?</h2>
          <p style="font-size: 15px; color: #F1F5F9; margin: 0 0 24px; max-width: 600px; margin-left: auto; margin-right: auto;">
            Start your Oman visa application with JMT Travels today. Fast, reliable e-visa assistance from our Muscat office.
          </p>
          <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
            <a href="#visa-grid" class="jmt-btn-primary" style="background: #FFFFFF; color: #0B286C; font-weight: 800; padding: 14px 28px; border-radius: 12px; text-decoration: none;">
              Apply for Oman Visa →
            </a>
            <a href="/contact" onclick="event.preventDefault(); navigate('/contact')" class="jmt-btn-secondary" style="color: #FFFFFF; border-color: rgba(255,255,255,0.6); padding: 14px 28px; border-radius: 12px; text-decoration: none;">
              Contact Visa Specialists
            </a>
          </div>
        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="shell" style="padding: 60px 20px;"><p style="color: #DC2626;">Error loading visa services catalogue.</p></div>`;
  }
}

async function renderHotelsPage(container) {
  updateSEO({
    title: 'Hotel & Resort Bookings | JMT Travels Muscat',
    description: 'From luxury resorts in Oman to carefully selected stays across the GCC, JMT Travels helps you find the right accommodation for every journey.',
    canonicalUrl: '/hotels',
    noindex: false
  });
  announceToSR('Navigated to Hotels & Accommodations Page');

  const hotelMediaHTML = renderTravelMediaHTML({
    videoSrc: '/assets/videos/hotels.mp4',
    posterSrc: '/assets/destinations/salalah_1.jpg',
    alt: 'Luxury Hotel Resort Accommodation Oman JMT Travels',
    badgeText: 'JMT Travel Desk',
    aspectRatio: '4 / 3'
  });

  container.innerHTML = `
    <div class="shell" style="padding: 40px 20px 60px;">
      
      <!-- 1. HOTEL HERO (TWO-COLUMN DESKTOP LAYOUT) -->
      <div class="jmt-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 65%, #153B8A 100%); color: #FFFFFF; border-radius: 24px; padding: 48px; margin-bottom: 60px; border: 0; box-shadow: 0 16px 40px rgba(7,21,59,0.18); position: relative; overflow: hidden;">
        <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 40px; align-items: center;" class="jmt-hero-grid">
          
          <!-- LEFT HERO COLUMN -->
          <div>
            <span style="display: inline-block; background: rgba(0, 166, 81, 0.2); color: #55D98A; border: 1px solid rgba(0, 166, 81, 0.4); font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; padding: 6px 14px; border-radius: 99px; margin-bottom: 20px;">
              HOTELS &amp; RESORTS
            </span>
            <h1 style="font-size: clamp(28px, 3.8vw, 44px); font-weight: 800; color: #FFFFFF !important; line-height: 1.18; letter-spacing: -0.5px; margin-bottom: 16px;">
              Stay Somewhere Exceptional
            </h1>
            <p style="font-size: 16px; color: #D6E0F4 !important; line-height: 1.65; max-width: 540px; margin-bottom: 32px;">
              From luxury resorts in Oman to carefully selected stays across the GCC, JMT Travels helps you find the right accommodation for every journey.
            </p>
            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
              <a href="/contact" onclick="event.preventDefault(); navigate('/contact')" class="jmt-btn-primary" style="padding: 14px 28px; font-size: 14.5px;">
                Enquire About Hotels →
              </a>
              <a href="https://wa.me/96897608999?text=Hotel%20Booking%20Inquiry" target="_blank" rel="noopener" class="jmt-btn-secondary" style="background: rgba(255,255,255,0.12); color: #FFFFFF !important; border: 1.5px solid rgba(255,255,255,0.4); padding: 14px 26px; font-size: 14.5px;">
                💬 WhatsApp JMT
              </a>
            </div>
          </div>

          <!-- RIGHT HERO COLUMN (CINEMATIC TRAVEL MEDIA + FLOATING BADGE) -->
          <div>
            ${hotelMediaHTML}
          </div>

        </div>
      </div>

      <!-- 2. SERVICE CARDS (NO EMOJIS, VECTOR SVG ICONS) -->
      <div style="margin-bottom: 60px;">
        <div style="text-align: center; max-width: 640px; margin: 0 auto 36px;">
          <h2 style="font-size: 28px; font-weight: 800; color: #0B286C; margin: 0 0 8px;">Accommodation Services</h2>
          <p style="color: #64748B; font-size: 15px; margin: 0;">Tailored hotel bookings and resort reservations for leisure, business, and pilgrimage.</p>
        </div>

        <div class="jmt-hotel-cards-grid">

          <!-- CARD 1: LUXURY RESORTS -->
          <div class="jmt-hotel-card" onclick="navigate('/contact')">
            <div>
              <div class="jmt-icon-box">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22v-9"/>
                  <path d="M12 13c-2.5-3.5-6-3.5-8-2 0 4 3 6 8 2z"/>
                  <path d="M12 13c2.5-3.5 6-3.5 8-2 0 4 3 6 8 2z"/>
                  <path d="M12 13c-4-2.5-5-6-2.5-8 3.5 1 5 4.5 2.5 8z"/>
                  <path d="M12 13c4-2.5 5-6 2.5-8-3.5 1-5 4.5-2.5 8z"/>
                </svg>
              </div>
              <h3 style="font-size: 18.5px; color: #0B286C; font-weight: 800; margin: 0 0 8px;">LUXURY RESORTS</h3>
              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0;">Salalah Khareef beach resorts, Jabal Akhdar mountain retreats, and Muscat luxury stays.</p>
            </div>
            <div style="margin-top: 20px; font-size: 13.5px; font-weight: 700; color: #00A651; display: flex; align-items: center; justify-content: space-between;">
              <span>Explore service</span>
              <span style="font-size: 16px; transition: transform 0.2s ease;" class="card-arrow">→</span>
            </div>
          </div>

          <!-- CARD 2: BUSINESS & CITY HOTELS -->
          <div class="jmt-hotel-card" onclick="navigate('/contact')">
            <div>
              <div class="jmt-icon-box">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
                  <path d="M9 6h2"/><path d="M13 6h2"/><path d="M9 10h2"/><path d="M13 10h2"/><path d="M9 14h2"/><path d="M13 14h2"/><path d="M9 18h6"/>
                </svg>
              </div>
              <h3 style="font-size: 18.5px; color: #0B286C; font-weight: 800; margin: 0 0 8px;">Business &amp; City Hotels</h3>
              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0;">Dubai Downtown, Abu Dhabi Corniche, Riyadh &amp; Jeddah business hotel reservations.</p>
            </div>
            <div style="margin-top: 20px; font-size: 13.5px; font-weight: 700; color: #00A651; display: flex; align-items: center; justify-content: space-between;">
              <span>Explore service</span>
              <span style="font-size: 16px; transition: transform 0.2s ease;" class="card-arrow">→</span>
            </div>
          </div>

          <!-- CARD 3: UMRAH STAYS -->
          <div class="jmt-hotel-card" onclick="navigate('/contact')">
            <div>
              <div class="jmt-icon-box">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2v4"/>
                  <path d="M12 6c-3.5 0-6 2.5-6 6v8h12v-8c0-3.5-2.5-6-6-6z"/>
                  <path d="M9 20v-4a3 3 0 0 1 6 0v4"/>
                  <path d="M4 20h16"/>
                </svg>
              </div>
              <h3 style="font-size: 18.5px; color: #0B286C; font-weight: 800; margin: 0 0 8px;">Umrah Stays</h3>
              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0;">5-Star &amp; 4-Star Makkah &amp; Madinah hotels close to Haram with meal inclusions.</p>
            </div>
            <div style="margin-top: 20px; font-size: 13.5px; font-weight: 700; color: #00A651; display: flex; align-items: center; justify-content: space-between;">
              <span>Explore service</span>
              <span style="font-size: 16px; transition: transform 0.2s ease;" class="card-arrow">→</span>
            </div>
          </div>

          <!-- CARD 4: GROUP BOOKINGS -->
          <div class="jmt-hotel-card" onclick="navigate('/contact')">
            <div>
              <div class="jmt-icon-box">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3 style="font-size: 18.5px; color: #0B286C; font-weight: 800; margin: 0 0 8px;">Group Bookings</h3>
              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0;">Corporate retreats, family groups, and multi-room conference accommodations.</p>
            </div>
            <div style="margin-top: 20px; font-size: 13.5px; font-weight: 700; color: #00A651; display: flex; align-items: center; justify-content: space-between;">
              <span>Explore service</span>
              <span style="font-size: 16px; transition: transform 0.2s ease;" class="card-arrow">→</span>
            </div>
          </div>

        </div>
      </div>

      <!-- 3. HOTEL DESTINATION VISUAL STRIP -->
      <div style="margin-bottom: 60px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
          <div>
            <h2 style="font-size: 26px; font-weight: 800; color: #0B286C; margin: 0 0 4px;">Popular Stays Across the Region</h2>
            <p style="color: #64748B; font-size: 14px; margin: 0;">Handpicked luxury destinations for your next getaway.</p>
          </div>
          <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" style="color: #00A651; font-weight: 700; text-decoration: none; font-size: 14px;">View All Destinations →</a>
        </div>

        <div class="jmt-dest-strip-grid">

          <!-- DEST 1: MUSCAT -->
          <div class="jmt-dest-card" onclick="navigate('/tourism')">
            <img src="/assets/destinations/salalah_1.jpg" alt="Muscat Luxury Stays" onerror="this.onerror=null;this.src='/assets/destinations/salalah_1.jpg';" style="width:100%; height:100%; object-fit:cover; display:block;">
            <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(7,21,59,0.92) 0%, rgba(7,21,59,0.2) 60%, transparent 100%); padding: 20px; display: flex; justify-content: space-between; align-items: flex-end; color: #FFFFFF;">
              <div>
                <b style="font-size: 18px; font-weight: 800; display: block; margin-bottom: 2px;">MUSCAT</b>
                <span style="font-size: 12.5px; opacity: 0.88;">Luxury city stays</span>
              </div>
              <span style="width: 32px; height: 32px; border-radius: 50%; background: #FFFFFF; color: #0B286C; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">→</span>
            </div>
          </div>

          <!-- DEST 2: SALALAH -->
          <div class="jmt-dest-card" onclick="navigate('/tourism')">
            <img src="/assets/destinations/salalah_2.jpg" alt="Salalah Resorts & Khareef" onerror="this.onerror=null;this.src='/assets/destinations/salalah_1.jpg';" style="width:100%; height:100%; object-fit:cover; display:block;">
            <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(7,21,59,0.92) 0%, rgba(7,21,59,0.2) 60%, transparent 100%); padding: 20px; display: flex; justify-content: space-between; align-items: flex-end; color: #FFFFFF;">
              <div>
                <b style="font-size: 18px; font-weight: 800; display: block; margin-bottom: 2px;">SALALAH</b>
                <span style="font-size: 12.5px; opacity: 0.88;">Resorts &amp; Khareef escapes</span>
              </div>
              <span style="width: 32px; height: 32px; border-radius: 50%; background: #FFFFFF; color: #0B286C; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">→</span>
            </div>
          </div>

          <!-- DEST 3: JABAL AKHDAR -->
          <div class="jmt-dest-card" onclick="navigate('/tourism')">
            <img src="/assets/destinations/salalah_3.jpg" alt="Jabal Akhdar Mountain Retreats" onerror="this.onerror=null;this.src='/assets/destinations/salalah_1.jpg';" style="width:100%; height:100%; object-fit:cover; display:block;">
            <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(7,21,59,0.92) 0%, rgba(7,21,59,0.2) 60%, transparent 100%); padding: 20px; display: flex; justify-content: space-between; align-items: flex-end; color: #FFFFFF;">
              <div>
                <b style="font-size: 18px; font-weight: 800; display: block; margin-bottom: 2px;">JABAL AKHDAR</b>
                <span style="font-size: 12.5px; opacity: 0.88;">Mountain retreats</span>
              </div>
              <span style="width: 32px; height: 32px; border-radius: 50%; background: #FFFFFF; color: #0B286C; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">→</span>
            </div>
          </div>

        </div>
      </div>

      <!-- 4. WHY BOOK WITH JMT? SECTION -->
      <div style="margin-bottom: 60px; background: #F8FAFC; border: 1px solid #E1E8F2; border-radius: 24px; padding: 40px 32px;">
        <div style="text-align: center; max-width: 600px; margin: 0 auto 32px;">
          <h2 style="font-size: 26px; font-weight: 800; color: #0B286C; margin: 0 0 6px;">Why Book With JMT?</h2>
          <p style="color: #64748B; font-size: 14.5px; margin: 0;">Personalized service backed by local travel expertise.</p>
        </div>

        <div class="jmt-benefits-grid">

          <!-- BENEFIT 1 -->
          <div class="jmt-benefit-card">
            <div class="jmt-benefit-num">01</div>
            <h3 style="font-size: 16px; font-weight: 800; color: #0B286C; margin: 0 0 6px;">Exclusive Agent Rates</h3>
            <p style="font-size: 13px; color: #64748B; margin: 0; line-height: 1.55;">Direct wholesale rates lower than public online booking portals.</p>
          </div>

          <!-- BENEFIT 2 -->
          <div class="jmt-benefit-card">
            <div class="jmt-benefit-num">02</div>
            <h3 style="font-size: 16px; font-weight: 800; color: #0B286C; margin: 0 0 6px;">Verified Accommodation</h3>
            <p style="font-size: 13px; color: #64748B; margin: 0; line-height: 1.55;">Handpicked properties personally inspected by our travel specialists.</p>
          </div>

          <!-- BENEFIT 3 -->
          <div class="jmt-benefit-card">
            <div class="jmt-benefit-num">03</div>
            <h3 style="font-size: 16px; font-weight: 800; color: #0B286C; margin: 0 0 6px;">Transfer Assistance</h3>
            <p style="font-size: 13px; color: #64748B; margin: 0; line-height: 1.55;">Seamless airport arrival and private chauffeur transfers upon request.</p>
          </div>

          <!-- BENEFIT 4 -->
          <div class="jmt-benefit-card">
            <div class="jmt-benefit-num">04</div>
            <h3 style="font-size: 16px; font-weight: 800; color: #0B286C; margin: 0 0 6px;">Local Travel Support</h3>
            <p style="font-size: 13px; color: #64748B; margin: 0; line-height: 1.55;">24/7 dedicated Omani concierge assistance throughout your stay.</p>
          </div>

        </div>
      </div>

      <!-- 5. HOTEL CTA SECTION (BEFORE FOOTER) -->
      <div style="background: linear-gradient(135deg, #0B286C 0%, #07153B 100%); color: #FFFFFF; border-radius: 24px; padding: 48px 40px; margin-bottom: 20px; box-shadow: 0 12px 32px rgba(11,40,108,0.15); position: relative; overflow: hidden;">
        <div style="position: absolute; right: -50px; top: -50px; width: 250px; height: 250px; background: radial-gradient(circle, rgba(0,166,81,0.25), transparent 70%); pointer-events: none;"></div>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 28px; position: relative; z-index: 2;">
          <div style="max-width: 600px;">
            <h2 style="font-size: clamp(24px, 3vw, 32px); font-weight: 800; color: #FFFFFF !important; margin: 0 0 10px; line-height: 1.2;">
              Looking for the perfect stay?
            </h2>
            <p style="font-size: 15px; color: #D6E0F4; margin: 0; line-height: 1.6;">
              Tell us your destination and travel dates. Our team will help arrange your accommodation.
            </p>
          </div>
          <div style="display: flex; gap: 14px; flex-wrap: wrap;">
            <a href="/contact" onclick="event.preventDefault(); navigate('/contact')" class="jmt-btn-primary" style="padding: 14px 28px; font-size: 14.5px;">
              Enquire Now →
            </a>
            <a href="https://wa.me/96897608999?text=Hotel%20Booking%20Inquiry" target="_blank" rel="noopener" class="jmt-btn-secondary" style="background: rgba(255,255,255,0.1); color: #FFFFFF; border-color: rgba(255,255,255,0.35); padding: 14px 26px; font-size: 14.5px;">
              💬 WhatsApp JMT
            </a>
            <a href="https://mail.google.com/mail/?view=cm&fs=1&to=info%40jmttravels.com" target="_blank" rel="noopener noreferrer" aria-label="Email JMT Travels via Gmail" class="jmt-btn-secondary" style="background: rgba(255,255,255,0.1); color: #FFFFFF; border-color: rgba(255,255,255,0.35); padding: 14px 26px; font-size: 14.5px;">
              ✉️ Email info@jmttravels.com
            </a>
          </div>
        </div>
      </div>

    </div>
  `;
}

async function renderFlightsPage(container) {
  updateSEO({
    title: 'Flight Ticketing & Reservations | JMT Travels Muscat',
    description: 'Book international and domestic flight tickets with JMT Travels Muscat. Full-service airline ticketing and itinerary management.',
    canonicalUrl: '/flights',
    noindex: false
  });
  announceToSR('Navigated to Flight Ticketing Page');

  const urlParams = new URLSearchParams(window.location.search);
  const fromCode = (urlParams.get('from') || 'MCT').toUpperCase();
  const toCode = (urlParams.get('to') || 'DXB').toUpperCase();
  const tripType = urlParams.get('trip') || 'round-trip';
  const cabinClass = urlParams.get('cabin') || 'Economy';
  const adults = parseInt(urlParams.get('adults') || '1', 10);
  const children = parseInt(urlParams.get('children') || '0', 10);
  const infants = parseInt(urlParams.get('infants') || '0', 10);
  const promoCode = urlParams.get('promo') || '';

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const deptDate = urlParams.get('dept') || tomorrow;
  const returnDate = urlParams.get('return') || nextWeek;

  const fromAirport = AIRPORT_DATASET.find(a => a.iataCode === fromCode) || AIRPORT_DATASET[0];
  const toAirport = AIRPORT_DATASET.find(a => a.iataCode === toCode) || AIRPORT_DATASET[5];

  flightSearchState.fromAirport = fromAirport;
  flightSearchState.toAirport = toAirport;
  flightSearchState.tripType = tripType;
  flightSearchState.cabinClass = cabinClass;
  flightSearchState.adults = adults;
  flightSearchState.children = children;
  flightSearchState.infants = infants;
  flightSearchState.promoCode = promoCode;

  const fromDisplay = `${fromAirport.name} (${fromAirport.iataCode})`;
  const toDisplay = `${toAirport.name} (${toAirport.iataCode})`;

  const itineraries = getAvailableFlightItineraries(fromAirport, toAirport, deptDate, returnDate, tripType, cabinClass);

  const flightMediaHTML = renderTravelMediaHTML({
    videoSrc: '/assets/videos/flights.mp4',
    posterSrc: '/assets/destinations/flight_tickets_poster.jpg',
    alt: 'Flight Ticketing & Aviation Reservations JMT Travels',
    badgeText: 'JMT Flight Desk',
    aspectRatio: '16 / 9'
  });

  container.innerHTML = `
    <div class="shell" style="padding: 30px 20px 60px;">
      <!-- HERO & SEARCH CONTAINER -->
      <div style="background: linear-gradient(135deg, #0B286C 0%, #061B4A 100%); border-radius: 24px; padding: 40px 36px; margin-bottom: 40px; color: #FFFFFF; box-shadow: 0 16px 40px rgba(11, 40, 108, 0.25);">
        
        <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 32px; align-items: center; margin-bottom: 32px;" class="jmt-hero-grid">
          <div>
            <span style="display: inline-block; background: rgba(0, 166, 81, 0.2); color: #00E676; font-size: 12px; font-weight: 800; padding: 5px 14px; border-radius: 50px; letter-spacing: 1.5px; margin-bottom: 12px; text-transform: uppercase;">
              FLIGHT TICKETS — JMT AIRLINE DESK
            </span>
            <h1 style="font-size: clamp(28px, 3.8vw, 42px); font-weight: 800; margin: 0 0 12px; line-height: 1.2; color: #FFFFFF !important;">
              Flight Ticketing &amp; Reservations
            </h1>
            <p style="font-size: 15.5px; color: #E2E8F0 !important; margin: 0; line-height: 1.6;">
              <b>FLIGHT TICKETS</b> — Affordable fares. Convenient travel. Book today! Instant booking &amp; official ticketing for Oman Air, SalamAir, Emirates, Qatar Airways, Saudia, and 100+ global airlines.
            </p>
          </div>
          <div>
            ${flightMediaHTML}
          </div>
        </div>

        <!-- FLIGHT SEARCH WIDGET CARD -->
        <div style="background: #FFFFFF; border-radius: 20px; padding: 28px; color: #1E293B; box-shadow: 0 12px 32px rgba(0,0,0,0.18);">
          <!-- Top Row Controls -->
          <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #E2E8F0; padding-bottom: 14px;">
            <!-- Trip Type Selector -->
            <div style="display: flex; background: #F1F5F9; border-radius: 30px; padding: 4px;">
              <button type="button" onclick="setFlightTripType('round-trip')" id="btn-trip-round" style="border:0; background: ${tripType === 'round-trip' ? '#0B286C' : 'transparent'}; color: ${tripType === 'round-trip' ? '#FFF' : '#475569'}; font-weight:700; font-size:13px; padding:6px 16px; border-radius:20px; cursor:pointer; transition: all 0.2s;">
                ⇄ Round-trip
              </button>
              <button type="button" onclick="setFlightTripType('one-way')" id="btn-trip-oneway" style="border:0; background: ${tripType === 'one-way' ? '#0B286C' : 'transparent'}; color: ${tripType === 'one-way' ? '#FFF' : '#475569'}; font-weight:700; font-size:13px; padding:6px 16px; border-radius:20px; cursor:pointer; transition: all 0.2s;">
                → One-way
              </button>
            </div>

            <!-- Passengers & Cabin Class Selector -->
            <div style="position: relative;">
              <button type="button" onclick="toggleFlightPassengersPopover(event)" id="flight-pax-summary-btn" style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; color: #0B286C; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <span>👤 <span id="flight-pax-summary-text">${adults + children + infants} Passenger${(adults + children + infants) > 1 ? 's' : ''}, ${cabinClass}</span></span>
                <span style="font-size: 10px;">▼</span>
              </button>

              <div id="flight-pax-popover" class="jmt-pax-popover" style="display: none; position: absolute; top: calc(100% + 6px); right: 0; z-index: 120; background: #FFF; border: 1px solid #CBD5E1; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); width: 280px; padding: 16px;">
                <div style="font-size: 14px; font-weight: 700; color: #0B286C; margin-bottom: 12px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">Passengers & Cabin</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <div>
                    <div style="font-size: 13px; font-weight: 600;">Adults</div>
                    <div style="font-size: 11px; color: #64748B;">12+ yrs</div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <button type="button" onclick="updatePaxCount('adults', -1)" style="width:28px; height:28px; border-radius:50%; border:1px solid #CBD5E1; background:#FFF; font-weight:700; cursor:pointer;">-</button>
                    <span id="pax-adults-val" style="font-weight:700; font-size:14px; width:16px; text-align:center;">${adults}</span>
                    <button type="button" onclick="updatePaxCount('adults', 1)" style="width:28px; height:28px; border-radius:50%; border:1px solid #CBD5E1; background:#FFF; font-weight:700; cursor:pointer;">+</button>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <div>
                    <div style="font-size: 13px; font-weight: 600;">Children</div>
                    <div style="font-size: 11px; color: #64748B;">2-11 yrs</div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <button type="button" onclick="updatePaxCount('children', -1)" style="width:28px; height:28px; border-radius:50%; border:1px solid #CBD5E1; background:#FFF; font-weight:700; cursor:pointer;">-</button>
                    <span id="pax-children-val" style="font-weight:700; font-size:14px; width:16px; text-align:center;">${children}</span>
                    <button type="button" onclick="updatePaxCount('children', 1)" style="width:28px; height:28px; border-radius:50%; border:1px solid #CBD5E1; background:#FFF; font-weight:700; cursor:pointer;">+</button>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                  <div>
                    <div style="font-size: 13px; font-weight: 600;">Infants</div>
                    <div style="font-size: 11px; color: #64748B;">&lt;2 yrs</div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <button type="button" onclick="updatePaxCount('infants', -1)" style="width:28px; height:28px; border-radius:50%; border:1px solid #CBD5E1; background:#FFF; font-weight:700; cursor:pointer;">-</button>
                    <span id="pax-infants-val" style="font-weight:700; font-size:14px; width:16px; text-align:center;">${infants}</span>
                    <button type="button" onclick="updatePaxCount('infants', 1)" style="width:28px; height:28px; border-radius:50%; border:1px solid #CBD5E1; background:#FFF; font-weight:700; cursor:pointer;">+</button>
                  </div>
                </div>
                <div style="border-top: 1px solid #E2E8F0; padding-top: 10px;">
                  <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Cabin Class</label>
                  <select id="pax-cabin-select" onchange="updateCabinClass(this.value)" style="width:100%; padding:6px; border-radius:6px; border:1px solid #CBD5E1; font-size:13px; font-weight:600;">
                    <option value="Economy" ${cabinClass === 'Economy' ? 'selected' : ''}>Economy Class</option>
                    <option value="Business" ${cabinClass === 'Business' ? 'selected' : ''}>Business Class</option>
                    <option value="First" ${cabinClass === 'First' ? 'selected' : ''}>First Class</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Fields Grid -->
          <form id="flights-page-search-form" onsubmit="handleHomeFlightSearch(event)">
            <div class="jmt-flight-fields-grid">
              <!-- From -->
              <div class="jmt-airport-field-box" id="from-airport-container" style="position: relative;">
                <div class="jmt-search-field-box" onclick="focusAirportInput('from')">
                  <span class="jmt-field-icon">🛫</span>
                  <div style="flex: 1;">
                    <div class="jmt-field-label">From</div>
                    <input type="text" id="flight-from-input" class="jmt-field-input"
                           placeholder="Select origin"
                           value="${escapeHTML(fromDisplay)}"
                           onfocus="openAirportDropdown('from')"
                           oninput="filterAirportDropdown('from', this.value)"
                           onkeydown="handleAirportKeydown('from', event)"
                           autocomplete="off">
                  </div>
                </div>
                <div class="jmt-airport-dropdown" id="from-airport-dropdown" style="display: none;"></div>
              </div>

              <!-- Swap Button -->
              <button type="button" onclick="swapFlightAirports()" class="jmt-swap-btn" title="Swap Origin &amp; Destination" aria-label="Swap airports">
                ⇄
              </button>

              <!-- To -->
              <div class="jmt-airport-field-box" id="to-airport-container" style="position: relative;">
                <div class="jmt-search-field-box" onclick="focusAirportInput('to')">
                  <span class="jmt-field-icon">🛬</span>
                  <div style="flex: 1;">
                    <div class="jmt-field-label">To</div>
                    <input type="text" id="flight-to-input" class="jmt-field-input"
                           placeholder="Select destination"
                           value="${escapeHTML(toDisplay)}"
                           onfocus="openAirportDropdown('to')"
                           oninput="filterAirportDropdown('to', this.value)"
                           onkeydown="handleAirportKeydown('to', event)"
                           autocomplete="off">
                  </div>
                </div>
                <div class="jmt-airport-dropdown" id="to-airport-dropdown" style="display: none;"></div>
              </div>

              <!-- Departure Date -->
              <div class="jmt-search-field-box">
                <span class="jmt-field-icon">📅</span>
                <div style="flex: 1;">
                  <div class="jmt-field-label">Departure</div>
                  <input type="date" id="flight-dept-input" required value="${deptDate}" min="${tomorrow}" class="jmt-field-input">
                </div>
              </div>

              <!-- Return Date -->
              <div class="jmt-search-field-box" id="flight-return-box" style="display: ${tripType === 'one-way' ? 'none' : 'flex'};">
                <span class="jmt-field-icon">📅</span>
                <div style="flex: 1;">
                  <div class="jmt-field-label">Return</div>
                  <input type="date" id="flight-return-input" value="${returnDate}" min="${deptDate}" class="jmt-field-input">
                </div>
              </div>

              <!-- CTA Submit Button -->
              <button type="submit" class="search-submit-btn" style="background: #00A651; color: #FFFFFF; border: 0; padding: 14px 24px; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; height: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 6px 16px rgba(0, 166, 81, 0.3); white-space: nowrap;">
                🔍 Search Flights →
              </button>
            </div>
            <div id="flight-search-error" style="color: #DC2626; font-size: 13px; font-weight: 600; margin-top: 10px; display: none;"></div>
          </form>
        </div>
      </div>

      <!-- AVAILABLE FLIGHT ITINERARIES SECTION -->
      <div style="margin-bottom: 50px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="font-size: 24px; color: #0B286C; font-weight: 800; margin: 0;">
              Available Flights: ${escapeHTML(fromAirport.city)} (${fromAirport.iataCode}) ✈️ ${escapeHTML(toAirport.city)} (${toAirport.iataCode})
            </h2>
            <p style="font-size: 14px; color: #64748B; margin: 4px 0 0;">
              Showing direct & connecting itineraries for ${deptDate}${tripType === 'round-trip' ? ` to ${returnDate}` : ''} • ${adults + children + infants} Traveler(s) • ${cabinClass}
            </p>
          </div>
          <span class="jmt-iata-pill" style="background: #E0F2FE; color: #0369A1; font-weight: 700;">${itineraries.length} Flights Found</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${itineraries.map(it => `
            <div class="jmt-card" style="padding: 24px; display: flex; flex-direction: column; gap: 16px; border-left: 4px solid ${it.badgeColor};">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                <!-- Airline Info -->
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 44px; height: 44px; border-radius: 10px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; font-size: 22px;">
                    ${it.airlineLogo}
                  </div>
                  <div>
                    <h3 style="font-size: 17px; color: #0B286C; font-weight: 800; margin: 0;">${escapeHTML(it.airline)} <span style="font-size: 13px; color: #64748B; font-weight: 500;">(${it.flightNo})</span></h3>
                    <span style="font-size: 12px; color: #00A651; font-weight: 600;">🧳 ${it.baggage} • ${it.refundable ? 'Refundable' : 'Standard Rules'}</span>
                  </div>
                </div>

                <!-- Flight Times & Route -->
                <div style="display: flex; align-items: center; gap: 24px; min-width: 280px;">
                  <div style="text-align: right;">
                    <div style="font-size: 20px; font-weight: 800; color: #0B286C;">${it.deptTime}</div>
                    <div style="font-size: 13px; font-weight: 700; color: #334155;">${it.fromCode}</div>
                    <div style="font-size: 11px; color: #64748B;">${escapeHTML(it.fromCity)}</div>
                  </div>
                  <div style="flex: 1; text-align: center;">
                    <div style="font-size: 11px; color: #64748B; font-weight: 600; margin-bottom: 2px;">${it.duration}</div>
                    <div style="height: 2px; background: #CBD5E1; position: relative; margin: 4px 0;">
                      <div style="position: absolute; top: -4px; left: 50%; transform: translateX(-50%); font-size: 10px; color: #0B286C;">✈️</div>
                    </div>
                    <div style="font-size: 11px; color: #00A651; font-weight: 700;">${it.stops}</div>
                  </div>
                  <div>
                    <div style="font-size: 20px; font-weight: 800; color: #0B286C;">${it.arrTime}</div>
                    <div style="font-size: 13px; font-weight: 700; color: #334155;">${it.toCode}</div>
                    <div style="font-size: 11px; color: #64748B;">${escapeHTML(it.toCity)}</div>
                  </div>
                </div>

                <!-- Price & CTA -->
                <div style="text-align: right; display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
                  <div style="font-size: 24px; font-weight: 800; color: #0B286C;">
                    <span style="font-size: 14px; font-weight: 600; color: #64748B;">OMR</span> ${it.priceOMR.toFixed(3)}
                    <div style="font-size: 11px; color: #64748B; font-weight: 400;">per passenger</div>
                  </div>
                  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <a href="https://wa.me/96897608999?text=${encodeURIComponent(`Flight Inquiry: ${it.airline} (${it.flightNo}) from ${it.fromCode} to ${it.toCode} on ${deptDate}. Price: OMR ${it.priceOMR.toFixed(3)}`)}" target="_blank" rel="noopener" class="jmt-btn-primary" style="background: #25D366; padding: 8px 16px; font-size: 13px;">
                      💬 Book via WhatsApp
                    </a>
                    <a href="https://mail.google.com/mail/?view=cm&fs=1&to=info%40jmttravels.com&su=${encodeURIComponent(`Flight Booking Request: ${it.fromCode} to ${it.toCode}`)}&body=${encodeURIComponent(`Dear JMT Travels,\n\nI would like to book/inquire about the following flight itinerary:\n\nAirline: ${it.airline} (${it.flightNo})\nRoute: ${it.fromCity} (${it.fromCode}) -> ${it.toCity} (${it.toCode})\nDate: ${deptDate}\nTravelers: ${adults + children + infants} (${cabinClass})\nEstimated Price: OMR ${it.priceOMR.toFixed(3)}\n\nPlease contact me with final confirmation.`)}" target="_blank" rel="noopener noreferrer" aria-label="Email JMT Travels via Gmail" class="jmt-btn-secondary" style="padding: 8px 14px; font-size: 13px; color: #0B286C; border-color: #CBD5E1;">
                      ✉️ Email Request
                    </a>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- FLIGHT SERVICE CARDS -->
      <h2 style="font-size: 22px; color: #0B286C; font-weight: 800; margin-bottom: 20px;">Airline Services We Offer</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; margin-bottom: 50px;">
        <div class="jmt-card">
          <div style="font-size: 36px; margin-bottom: 12px;">✈️</div>
          <h3 style="font-size: 18px; color: #0B286C; font-weight: 800; margin-bottom: 8px;">Flight Ticketing</h3>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0;">Economy, Business & First Class ticketing for GCC, Asia, Europe, and Americas.</p>
        </div>
        <div class="jmt-card">
          <div style="font-size: 36px; margin-bottom: 12px;">👥</div>
          <h3 style="font-size: 18px; color: #0B286C; font-weight: 800; margin-bottom: 8px;">Group Reservations</h3>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0;">Special group fares for 10+ travelers, corporate delegations, and family travel.</p>
        </div>
        <div class="jmt-card">
          <div style="font-size: 36px; margin-bottom: 12px;">🔄</div>
          <h3 style="font-size: 18px; color: #0B286C; font-weight: 800; margin-bottom: 8px;">Changes & Re-issues</h3>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0;">Date modifications, flight re-routing, extra baggage purchase, and seat selection.</p>
        </div>
        <div class="jmt-card">
          <div style="font-size: 36px; margin-bottom: 12px;">🌍</div>
          <h3 style="font-size: 18px; color: #0B286C; font-weight: 800; margin-bottom: 8px;">Multi-City Travel</h3>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0;">Complex multi-destination flight itineraries and stopover arrangements.</p>
        </div>
      </div>

      <!-- FEATURED AIRLINES BANNER -->
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 28px; text-align: center; margin-bottom: 40px;">
        <h3 style="font-size: 18px; color: #0B286C; font-weight: 800; margin-bottom: 16px;">Official Ticketing Agent For Major Global Airlines</h3>
        <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; align-items: center;">
          <span class="jmt-iata-pill" style="font-size: 14px; font-weight: 700; background: #FFF; border: 1px solid #CBD5E1; color: #0B286C; padding: 8px 18px;">🇴🇲 Oman Air (WY)</span>
          <span class="jmt-iata-pill" style="font-size: 14px; font-weight: 700; background: #FFF; border: 1px solid #CBD5E1; color: #00A651; padding: 8px 18px;">🟢 SalamAir (OV)</span>
          <span class="jmt-iata-pill" style="font-size: 14px; font-weight: 700; background: #FFF; border: 1px solid #CBD5E1; color: #D71921; padding: 8px 18px;">🇦🇪 Emirates (EK)</span>
          <span class="jmt-iata-pill" style="font-size: 14px; font-weight: 700; background: #FFF; border: 1px solid #CBD5E1; color: #5C0632; padding: 8px 18px;">🇶🇦 Qatar Airways (QR)</span>
          <span class="jmt-iata-pill" style="font-size: 14px; font-weight: 700; background: #FFF; border: 1px solid #CBD5E1; color: #006C35; padding: 8px 18px;">🇸🇦 Saudia (SV)</span>
          <span class="jmt-iata-pill" style="font-size: 14px; font-weight: 700; background: #FFF; border: 1px solid #CBD5E1; color: #BD9B1D; padding: 8px 18px;">🇦🇪 Etihad Airways (EY)</span>
        </div>
      </div>
    </div>
  `;
}

function getAvailableFlightItineraries(from, to, deptDate, returnDate, tripType, cabinClass) {
  const isRound = tripType === 'round-trip';
  const tripMult = isRound ? 1.8 : 1.0;
  const cabinMult = cabinClass === 'Business' ? 2.6 : cabinClass === 'First' ? 4.2 : 1.0;

  let basePrice = 48.0;
  if (from.iataCode === 'MCT' && to.iataCode === 'SLL') basePrice = 28.5;
  else if (from.iataCode === 'MCT' && to.iataCode === 'LHR') basePrice = 220.0;
  else if (from.iataCode === 'MCT' && to.iataCode === 'DEL') basePrice = 65.0;
  else if (from.iataCode === 'MCT' && to.iataCode === 'BOM') basePrice = 58.0;

  return [
    {
      id: 'fl-wy',
      airline: 'Oman Air',
      flightNo: 'WY-601',
      airlineLogo: '✈️',
      badgeColor: '#0B286C',
      deptTime: '08:30',
      arrTime: '09:45',
      duration: '1h 15m',
      stops: 'Non-stop',
      fromCode: from.iataCode,
      fromCity: from.city,
      toCode: to.iataCode,
      toCity: to.city,
      baggage: cabinClass === 'Business' ? '40 kg Checked + 14 kg Cabin' : '30 kg Checked + 7 kg Cabin',
      refundable: true,
      priceOMR: Math.round(basePrice * tripMult * cabinMult * 1000) / 1000
    },
    {
      id: 'fl-ov',
      airline: 'SalamAir',
      flightNo: 'OV-203',
      airlineLogo: '🟢',
      badgeColor: '#00A651',
      deptTime: '14:15',
      arrTime: '15:30',
      duration: '1h 15m',
      stops: 'Non-stop',
      fromCode: from.iataCode,
      fromCity: from.city,
      toCode: to.iataCode,
      toCity: to.city,
      baggage: '20 kg Checked + 7 kg Cabin',
      refundable: false,
      priceOMR: Math.round((basePrice * 0.78) * tripMult * cabinMult * 1000) / 1000
    },
    {
      id: 'fl-ek',
      airline: 'Emirates',
      flightNo: 'EK-863',
      airlineLogo: '🔴',
      badgeColor: '#D71921',
      deptTime: '18:50',
      arrTime: '20:05',
      duration: '1h 15m',
      stops: 'Non-stop',
      fromCode: from.iataCode,
      fromCity: from.city,
      toCode: to.iataCode,
      toCity: to.city,
      baggage: cabinClass === 'Business' ? '40 kg Checked + 14 kg Cabin' : '30 kg Checked + 7 kg Cabin',
      refundable: true,
      priceOMR: Math.round((basePrice * 1.15) * tripMult * cabinMult * 1000) / 1000
    }
  ];
}

async function renderVisaDetailPage(container, slug) {
  container.innerHTML = `<div class="shell" style="padding: 60px 0;"><p>Loading visa details...</p></div>`;
  try {
    const res = await apiCall(`/api/visa/services/${slug}`);
    const s = res.service;

    updateSEO({
      title: `${s.country} ${s.visaType} Visa | JMT Travels`,
      description: s.overview || `Official ${s.country} ${s.visaType} Visa clearance services by JMT Travels Muscat.`,
      canonicalUrl: `/visa/${slug}`,
      noindex: false,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": `${s.country} ${s.visaType} Visa`,
        "provider": {
          "@type": "TravelAgency",
          "name": "JMT TRAVELS"
        },
        "areaServed": s.country,
        "description": s.overview
      }
    });
    announceToSR(`Loaded details for ${s.country} ${s.visaType} Visa`);

    container.innerHTML = `
      <div class="shell" style="padding: 60px 0; max-width: 800px;">
        <span class="badge badge-success">${escapeHTML(s.country)}</span>
        <h1 style="font-size: 36px; color: var(--primary); margin: 12px 0 16px;">${escapeHTML(s.country)} ${escapeHTML(s.visaType)} Visa</h1>

        <div class="card" style="margin-bottom: 24px;">
          <h2 style="font-size: 20px; color: var(--primary); margin-bottom: 12px;">Overview</h2>
          <p style="color: var(--text); font-size: 15px; margin-bottom: 16px;">${escapeHTML(s.overview)}</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px;">
            <div><b>Validity:</b> ${escapeHTML(s.validity)}</div>
            <div><b>Processing Time:</b> ${escapeHTML(s.processingTime)}</div>
            <div><b>Entry Type:</b> ${escapeHTML(s.entryType)}</div>
            <div><b>Fee:</b> ${s.priceMinor ? `${escapeHTML(s.currency)} ${s.priceMinor / 1000}` : 'Subject to case review'}</div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 24px;">
          <h2 style="font-size: 20px; color: var(--primary); margin-bottom: 12px;">Required Documents</h2>
          <ul style="padding-left: 20px; line-height: 1.8;">
            ${(s.requiredDocuments || []).map(doc => `<li>${escapeHTML(doc)}</li>`).join('')}
          </ul>
        </div>

        <div style="background: #FEF3C7; border: 1px solid #F59E0B; padding: 16px; border-radius: 12px; margin-bottom: 24px; font-size: 13px; color: #92400E;">
          ⚠️ <b>Disclaimer:</b> Visa approval is subject solely to the relevant government authorities. JMT TRAVELS provides application intake and documentation clearing support.
        </div>

        <a href="/visa-apply?service=${escapeHTML(s.slug)}" onclick="event.preventDefault(); navigate('/visa-apply?service=${escapeHTML(s.slug)}')" class="btn" style="padding: 14px 28px; font-size: 16px;">Start Visa Application →</a>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="shell" style="padding: 60px 0;"><p>Visa service not found.</p></div>`;
  }
}

function renderVisaApplyPage(container) {
  const urlParams = new URLSearchParams(window.location.search);
  const serviceSlug = urlParams.get('service') || '';

  updateSEO({
    title: 'Apply for Visa | JMT Travels',
    description: 'Submit your visa application details to JMT Travels for document clearing and intake.',
    canonicalUrl: '/visa-apply',
    noindex: true
  });
  announceToSR('Navigated to Visa Application Form');

  container.innerHTML = `
    <div class="shell" style="padding: 60px 0; max-width: 600px;">
      <h1 style="font-size: 32px; color: var(--primary); margin-bottom: 8px;">Start Visa Application</h1>
      <p style="color: var(--text-muted); margin-bottom: 24px;">Complete your applicant details below. JMT will issue a tracking reference and document upload link.</p>

      <form id="visa-apply-form" class="card" aria-describedby="visa-apply-desc">
        <p id="visa-apply-desc" class="sr-only">All fields marked required are mandatory for visa intake.</p>
        <div style="margin-bottom: 16px;">
          <label for="visa-dest" style="display:block; font-weight:700; margin-bottom:6px;">Destination Country <span style="color:var(--error);" aria-hidden="true">*</span></label>
          <input type="text" id="visa-dest" name="destination" class="chat-input" style="width:100%; width:-webkit-fill-available;" value="${serviceSlug.includes('uae') ? 'United Arab Emirates' : serviceSlug.includes('saudi') ? 'Saudi Arabia' : 'Oman'}" required aria-required="true">
        </div>
        <div style="margin-bottom: 16px;">
          <label for="visa-fullname" style="display:block; font-weight:700; margin-bottom:6px;">Full Name (As in Passport) <span style="color:var(--error);" aria-hidden="true">*</span></label>
          <input type="text" id="visa-fullname" name="fullName" class="chat-input" style="width:100%; width:-webkit-fill-available;" placeholder="e.g. Ahmed Al-Balushi" required aria-required="true">
        </div>
        <div style="margin-bottom: 16px;">
          <label for="visa-email" style="display:block; font-weight:700; margin-bottom:6px;">Email Address <span style="color:var(--error);" aria-hidden="true">*</span></label>
          <input type="email" id="visa-email" name="email" class="chat-input" style="width:100%; width:-webkit-fill-available;" value="${state.user ? escapeHTML(state.user.email) : ''}" required aria-required="true">
        </div>
        <div style="margin-bottom: 16px;">
          <label for="visa-phone" style="display:block; font-weight:700; margin-bottom:6px;">Mobile / WhatsApp Number <span style="color:var(--error);" aria-hidden="true">*</span></label>
          <input type="text" id="visa-phone" name="phone" class="chat-input" style="width:100%; width:-webkit-fill-available;" placeholder="+968 9000 0000" required aria-required="true">
        </div>
        <div style="margin-bottom: 24px;">
          <label for="visa-passport" style="display:block; font-weight:700; margin-bottom:6px;">Passport Number <span style="color:var(--error);" aria-hidden="true">*</span></label>
          <input type="text" id="visa-passport" name="passportNumber" class="chat-input" style="width:100%; width:-webkit-fill-available;" placeholder="A12345678" required aria-required="true">
        </div>
        <button type="submit" class="btn" style="width:100%; padding:12px;">Submit Application</button>
      </form>
      <div id="visa-apply-result" style="margin-top:20px;" aria-live="polite"></div>
    </div>
  `;

  document.getElementById('visa-apply-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const resultDiv = document.getElementById('visa-apply-result');
    try {
      const res = await apiCall('/api/visa/applications', 'POST', data);
      resultDiv.innerHTML = `
        <div style="background: #DCFCE7; border: 1px solid #16A34A; padding: 16px; border-radius: 12px; color: #15803D;">
          ✅ <b>Application Submitted!</b><br>Reference Number: <b>${escapeHTML(res.reference)}</b><br>
          Status: <b>${escapeHTML(res.status)}</b><br><br>
          You can track your application anytime in "My Account" or using our public status tracker.
        </div>
      `;
      announceToSR(`Application submitted successfully. Reference number ${res.reference}`);
      e.target.reset();
    } catch (err) {
      resultDiv.innerHTML = `<div style="color: var(--error); font-weight: 700;">${escapeHTML(err.message)}</div>`;
      announceToSR(`Application submission error: ${err.message}`);
    }
  };
}

async function renderTourismListPage(container) {
  updateSEO({
    title: 'Oman Tours & Holiday Packages | JMT Travels Muscat',
    description: 'Browse curated Oman experiences, Salalah Khareef retreats, GCC escapes, and Umrah packages with JMT Travels.',
    canonicalUrl: '/tourism',
    noindex: false
  });
  announceToSR('Navigated to Tourism Packages Catalogue');

  const toursMediaHTML = renderTravelMediaHTML({
    videoSrc: '/assets/videos/oman_tours.mp4',
    posterSrc: '/assets/destinations/salalah_explore_poster.jpg',
    alt: 'Oman Holiday & Tourism Landscapes JMT Travels',
    badgeText: 'JMT Travel Desk',
    aspectRatio: '4 / 3'
  });

  container.innerHTML = `
    <div class="shell" style="padding: 40px 20px 60px;">
      <!-- 1. OMAN TOURS HERO (TWO-COLUMN DESKTOP LAYOUT) -->
      <div class="jmt-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 65%, #153B8A 100%); color: #FFFFFF; border-radius: 24px; padding: 48px; margin-bottom: 40px; border: 0; box-shadow: 0 16px 40px rgba(7,21,59,0.18); position: relative; overflow: hidden;">
        <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 40px; align-items: center;" class="jmt-hero-grid">
          
          <!-- LEFT HERO COLUMN -->
          <div>
            <span class="jmt-hero-eyebrow">JMT TRAVELS — HOLIDAYS &amp; TOURS</span>
            <h1 class="jmt-hero-title" style="font-size: clamp(28px, 3.8vw, 44px); font-weight: 800; color: #FFFFFF !important; line-height: 1.18; letter-spacing: -0.5px; margin-bottom: 16px;">
              Oman Tours &amp; Holiday Packages
            </h1>
            <p class="jmt-hero-sub" style="font-size: 16px; color: #D6E0F4 !important; line-height: 1.65; max-width: 540px; margin-bottom: 32px;">
              Discover curated Oman experiences, GCC escapes, Salalah Khareef retreats and unforgettable journeys with 20+ years of trusted travel expertise.
            </p>
            <div style="display: flex; gap: 14px; flex-wrap: wrap;">
              <a href="#tourism-catalogue-container" class="jmt-btn-primary" style="background: #00A651; color: #FFF; font-weight: 700; padding: 14px 28px; border-radius: 999px; text-decoration: none;">Browse Packages ↓</a>
              <a href="/contact" onclick="event.preventDefault(); navigate('/contact')" class="jmt-btn-secondary" style="background: rgba(255,255,255,0.12); color: #FFFFFF !important; border: 1.5px solid rgba(255,255,255,0.4); padding: 14px 28px; border-radius: 999px; text-decoration: none;">Contact a Travel Specialist</a>
            </div>
          </div>

          <!-- RIGHT HERO COLUMN (CINEMATIC TRAVEL MEDIA + FLOATING BADGE) -->
          <div>
            ${toursMediaHTML}
          </div>

        </div>
      </div>

      <!-- FILTER PILL BAR -->
      <div class="jmt-pill-bar" id="tourism-filter-bar">
        <button class="jmt-pill active" onclick="filterTourismCategory('all', this)">All Packages</button>
        <button class="jmt-pill" onclick="filterTourismCategory('gcc', this)">GCC Escapes</button>
        <button class="jmt-pill" onclick="filterTourismCategory('salalah', this)">Salalah Khareef</button>
        <button class="jmt-pill" onclick="filterTourismCategory('umrah', this)">Umrah & Religious</button>
        <button class="jmt-pill" onclick="filterTourismCategory('city', this)">City & Culture</button>
      </div>

      <div id="tourism-catalogue-container">
        <p style="color: #64748B;">Loading tourism packages...</p>
      </div>
    </div>
  `;

  try {
    const res = await apiCall('/api/tourism/packages');
    window._allTourismPackages = getPublicPackages(res.packages);
    renderTourismPackageGrid(window._allTourismPackages);
  } catch (err) {
    document.getElementById('tourism-catalogue-container').innerHTML = `
      <div class="jmt-card" style="text-align: center; padding: 48px 24px; max-width: 600px; margin: 0 auto;">
        <div style="font-size: 40px; margin-bottom: 12px;">🏝️</div>
        <h3 style="color: #0B286C; margin-bottom: 8px;">Packages Unavailable</h3>
        <p style="color: #64748B; margin-bottom: 20px;">Unable to load package catalogue at this moment. Please check back soon or contact JMT Travels.</p>
        <a href="/contact" onclick="event.preventDefault(); navigate('/contact')" class="jmt-btn-primary">Contact Travel Desk</a>
      </div>
    `;
  }
}

window.filterTourismCategory = function(cat, btn) {
  document.querySelectorAll('#tourism-filter-bar .jmt-pill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const all = window._allTourismPackages || [];
  if (cat === 'all') {
    renderTourismPackageGrid(all);
    return;
  }
  const filtered = all.filter(p => {
    const text = (p.category + ' ' + p.title + ' ' + p.destination + ' ' + p.summary).toLowerCase();
    if (cat === 'gcc') return text.includes('gcc') || text.includes('dubai') || text.includes('uae') || text.includes('qatar');
    if (cat === 'salalah') return text.includes('salalah') || text.includes('khareef') || text.includes('monsoon');
    if (cat === 'umrah') return text.includes('umrah') || text.includes('makkah') || text.includes('madinah') || text.includes('religious');
    if (cat === 'city') return text.includes('city') || text.includes('muscat') || text.includes('heritage') || text.includes('tour');
    return text.includes(cat);
  });
  renderTourismPackageGrid(filtered);
};

function renderTourismPackageGrid(packages) {
  const container = document.getElementById('tourism-catalogue-container');
  if (!container) return;

  if (!packages || !packages.length) {
    container.innerHTML = `
      <div class="jmt-card" style="text-align: center; padding: 48px 24px; max-width: 600px; margin: 0 auto;">
        <div style="font-size: 48px; margin-bottom: 12px;">🧳</div>
        <h3 style="color: #0B286C; font-weight: 800; margin-bottom: 8px;">No Packages Found</h3>
        <p style="color: #64748B; font-size: 14px; margin-bottom: 20px;">We couldn't find any packages in this category right now. Contact our Muscat team for a custom tailored itinerary.</p>
        <button onclick="filterTourismCategory('all', document.querySelector('#tourism-filter-bar .jmt-pill'))" class="jmt-btn-primary">View All Packages</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div id="packages-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
      ${packages.map(p => `
        <div class="jmt-card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; border-radius: 20px;">
          <div>
            <div style="position: relative; height: 200px; overflow: hidden; background: #F1F5F9;">
              <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.title)} Tour Package" loading="lazy" onerror="this.onerror=null;this.src='/assets/destinations/salalah_1.jpg';" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease;">
              <span class="badge" style="position: absolute; top: 14px; left: 14px; background: rgba(11, 40, 108, 0.85); color: #FFF; backdrop-filter: blur(4px); font-size: 11px; padding: 5px 12px; font-weight: 700; border-radius: 99px;">${escapeHTML(p.category || 'Tours')}</span>
            </div>
            <div style="padding: 22px 22px 14px;">
              <h2 style="font-size: 19px; color: #0B286C; font-weight: 800; margin: 0 0 8px; line-height: 1.3;">${escapeHTML(p.title)}</h2>
              <div style="font-size: 13px; color: #64748B; display: flex; align-items: center; gap: 12px; margin-bottom: 12px; font-weight: 600;">
                <span>📍 ${escapeHTML(p.destination)}</span>
                <span>⏱️ ${escapeHTML(p.duration)}</span>
              </div>
              <p style="color: #475569; font-size: 13.5px; line-height: 1.6; margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${escapeHTML(p.summary)}</p>
            </div>
          </div>
          <div style="padding: 14px 22px 22px; border-top: 1px solid #F1F5F9; display: flex; justify-content: space-between; align-items: center; background: #FAFBFD;">
            <div>
              <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748B; display: block;">Starting from</span>
              <strong style="color: #00A651; font-size: 20px; font-weight: 800;">${escapeHTML(p.currency || 'OMR')} ${p.priceMinor ? p.priceMinor / 1000 : p.price}</strong>
            </div>
            <a href="/tourism/${escapeHTML(p.slug)}" onclick="event.preventDefault(); navigate('/tourism/${escapeHTML(p.slug)}')" class="jmt-btn-primary" style="padding: 10px 18px; font-size: 13px;">View Details →</a>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function renderTourismDetailPage(container, slug) {
  container.innerHTML = `<div class="shell" style="padding: 60px 20px;"><p style="color: #64748B;">Loading package details...</p></div>`;
  try {
    const res = await apiCall(`/api/tourism/packages/${slug}`);
    const p = res.package;

    updateSEO({
      title: `${p.title} | JMT Travels Muscat`,
      description: p.summary || `Book ${p.title} with JMT Travels Muscat. Includes transfers, hotel stays, and guided experiences.`,
      canonicalUrl: `/tourism/${slug}`,
      noindex: false
    });
    announceToSR(`Loaded details for ${p.title}`);

    const inclusions = Array.isArray(p.inclusions) && p.inclusions.length ? p.inclusions : ['4-star hotel accommodation', 'Daily breakfast buffets', 'Airport arrival & departure transfers', 'Guided sightseeing tours with local Omani guide', 'All entry fees & transport taxes'];
    const exclusions = Array.isArray(p.exclusions) && p.exclusions.length ? p.exclusions : ['International flight tickets (available upon request)', 'Personal expenses & souvenirs', 'Optional activities & tips'];
    const itinerary = Array.isArray(p.itinerary) && p.itinerary.length ? p.itinerary : [
      { day: 1, title: 'Arrival & Welcome', description: 'Meet and greet at Muscat International Airport with private transfer to your hotel.' },
      { day: 2, title: 'Guided City & Cultural Tour', description: 'Explore Sultan Qaboos Grand Mosque, Muttrah Souq, and Al Jalali Fort.' },
      { day: 3, title: 'Excursion & Local Experience', description: 'Scenic drive through Omani mountains, wadis, and traditional villages.' },
      { day: 4, title: 'Leisure & Departure Transfer', description: 'Morning leisure time, shopping, and transfer to airport for final flight.' }
    ];

    container.innerHTML = `
      <div class="shell" style="padding: 40px 20px 60px;">
        <!-- HERO BANNER -->
        <div style="position: relative; height: 380px; border-radius: 24px; overflow: hidden; margin-bottom: 32px; box-shadow: 0 12px 32px rgba(11,40,108,0.15);">
          <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.title)}" loading="lazy" onerror="this.onerror=null;this.src='/assets/destinations/salalah_1.jpg';" style="width: 100%; height: 100%; object-fit: cover;">
          <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(7,21,59,0.3) 0%, rgba(7,21,59,0.85) 100%);"></div>
          <div style="position: absolute; bottom: 32px; left: 32px; right: 32px; color: #FFFFFF;">
            <span class="badge" style="background: #00A651; color: #FFF; font-size: 11px; padding: 5px 14px; font-weight: 700; border-radius: 99px; margin-bottom: 12px; display: inline-block;">${escapeHTML(p.category || 'Tour Package')}</span>
            <h1 style="font-size: clamp(24px, 4vw, 38px); font-weight: 800; color: #FFF; margin: 0 0 10px; line-height: 1.2;">${escapeHTML(p.title)}</h1>
            <div style="display: flex; gap: 20px; font-size: 15px; opacity: 0.95; font-weight: 600; flex-wrap: wrap;">
              <span>📍 ${escapeHTML(p.destination)}</span>
              <span>⏱️ ${escapeHTML(p.duration)}</span>
              <span>💵 ${escapeHTML(p.currency || 'OMR')} ${p.priceMinor ? p.priceMinor / 1000 : p.price} per person</span>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 32px; align-items: start;">
          <!-- LEFT CONTENT COLUMN -->
          <div>
            <!-- OVERVIEW CARD -->
            <div class="jmt-card" style="margin-bottom: 24px;">
              <h2 style="font-size: 22px; color: #0B286C; font-weight: 800; margin-bottom: 14px;">Package Overview</h2>
              <p style="font-size: 15px; color: #334155; line-height: 1.7; margin: 0;">${escapeHTML(p.summary)}</p>
            </div>

            <!-- ITINERARY TIMELINE -->
            <div class="jmt-card" style="margin-bottom: 24px;">
              <h2 style="font-size: 22px; color: #0B286C; font-weight: 800; margin-bottom: 20px;">Tour Itinerary</h2>
              <div style="display: flex; flex-direction: column; gap: 18px;">
                ${itinerary.map(item => `
                  <div style="display: flex; gap: 16px; align-items: flex-start;">
                    <div style="background: #00A651; color: #FFF; width: 36px; height: 36px; border-radius: 50%; font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,166,81,0.3);">
                      Day ${item.day || 1}
                    </div>
                    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 16px 20px; flex: 1;">
                      <h4 style="font-size: 16px; color: #0B286C; font-weight: 700; margin: 0 0 6px;">${escapeHTML(item.title)}</h4>
                      <p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.6;">${escapeHTML(item.description)}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- INCLUSIONS / EXCLUSIONS -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 24px;">
              <div class="jmt-card">
                <h3 style="font-size: 17px; color: #0B286C; font-weight: 800; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                  <span style="color: #00A651;">✓</span> What's Included
                </h3>
                <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px; color: #334155; line-height: 1.9;">
                  ${inclusions.map(inc => `<li style="display: flex; gap: 8px; align-items: baseline;"><span style="color: #00A651; font-weight: 800;">✓</span> ${escapeHTML(inc)}</li>`).join('')}
                </ul>
              </div>
              <div class="jmt-card">
                <h3 style="font-size: 17px; color: #0B286C; font-weight: 800; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                  <span style="color: #DC2626;">✕</span> What's Not Included
                </h3>
                <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px; color: #64748B; line-height: 1.9;">
                  ${exclusions.map(exc => `<li style="display: flex; gap: 8px; align-items: baseline;"><span style="color: #DC2626; font-weight: 800;">✕</span> ${escapeHTML(exc)}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>

          <!-- RIGHT SIDEBAR BOOKING CARD -->
          <div style="position: sticky; top: 96px;">
            <div class="jmt-card" style="border-top: 5px solid #00A651;">
              <span style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase;">Total Tour Price</span>
              <div style="font-size: 32px; font-weight: 800; color: #00A651; margin: 4px 0 16px;">
                ${escapeHTML(p.currency || 'OMR')} ${p.priceMinor ? p.priceMinor / 1000 : p.price}
                <small style="font-size: 13px; font-weight: 500; color: #64748B;">/ person</small>
              </div>
              <div style="background: #F8FAFC; border-radius: 12px; padding: 14px; font-size: 13px; color: #475569; margin-bottom: 20px; line-height: 1.6;">
                ⚡ <b>Instant Confirmation</b><br>
                Instant booking processing & Omani guide allocation.
              </div>
              <a href="/book?package=${escapeHTML(p.id)}" onclick="event.preventDefault(); navigate('/book?package=${escapeHTML(p.id)}')" class="jmt-btn-primary" style="width: 100%; justify-content: center; padding: 14px 24px; font-size: 15px; margin-bottom: 12px;">Book This Tour Now →</a>
              <a href="https://wa.me/96897608999?text=${encodeURIComponent('Inquiry regarding tour: ' + p.title)}" target="_blank" rel="noopener" class="jmt-btn-secondary" style="width: 100%; justify-content: center; padding: 12px 24px; font-size: 14px;">💬 Ask JMT Assistant</a>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="shell" style="padding: 60px 20px;"><p style="color: #DC2626;">Error loading package details.</p></div>`;
  }
}

function renderBookPage(container) {
  const urlParams = new URLSearchParams(window.location.search);
  const pkgId = urlParams.get('package') || '';

  updateSEO({
    title: 'Book Tour Package | JMT Travels Muscat',
    description: 'Submit your tour package booking request to JMT Travels.',
    canonicalUrl: '/book',
    noindex: true
  });
  announceToSR('Navigated to Tour Booking Request Form');

  container.innerHTML = `
    <div class="shell" style="padding: 40px 20px 60px; max-width: 640px;">
      <div class="jmt-card">
        <h1 style="font-size: 26px; color: #0B286C; font-weight: 800; margin-bottom: 8px;">Book Tour Package</h1>
        <p style="color: #64748B; font-size: 14px; margin-bottom: 24px;">Complete lead traveler details below to process your tour reservation with JMT Travels.</p>

        <form id="tour-book-form" aria-describedby="book-form-desc">
          <p id="book-form-desc" class="sr-only">All fields marked required are mandatory for tour booking requests.</p>
          <input type="hidden" name="packageId" value="${escapeHTML(pkgId)}">
          <div style="margin-bottom: 16px;">
            <label for="book-name" style="display:block; font-weight:700; font-size:13.5px; color:#0F172A; margin-bottom:6px;">Lead Traveler Name <span style="color:#DC2626;" aria-hidden="true">*</span></label>
            <input type="text" id="book-name" name="travellerName" class="chat-input" style="width:100%; padding:12px 16px; border:1px solid #E2E8F0; border-radius:12px; font-size:14px;" value="${state.user ? escapeHTML(state.user.name) : ''}" required aria-required="true">
          </div>
          <div style="margin-bottom: 16px;">
            <label for="book-email" style="display:block; font-weight:700; font-size:13.5px; color:#0F172A; margin-bottom:6px;">Email Address <span style="color:#DC2626;" aria-hidden="true">*</span></label>
            <input type="email" id="book-email" name="email" class="chat-input" style="width:100%; padding:12px 16px; border:1px solid #E2E8F0; border-radius:12px; font-size:14px;" value="${state.user ? escapeHTML(state.user.email) : ''}" required aria-required="true">
          </div>
          <div style="margin-bottom: 16px;">
            <label for="book-phone" style="display:block; font-weight:700; font-size:13.5px; color:#0F172A; margin-bottom:6px;">Phone / WhatsApp <span style="color:#DC2626;" aria-hidden="true">*</span></label>
            <input type="text" id="book-phone" name="phone" class="chat-input" style="width:100%; padding:12px 16px; border:1px solid #E2E8F0; border-radius:12px; font-size:14px;" placeholder="+968 9000 0000" required aria-required="true">
          </div>
          <div style="margin-bottom: 16px;">
            <label for="book-travellers" style="display:block; font-weight:700; font-size:13.5px; color:#0F172A; margin-bottom:6px;">Number of Travelers</label>
            <select id="book-travellers" name="travellers" class="chat-input" style="width:100%; padding:12px 16px; border:1px solid #E2E8F0; border-radius:12px; font-size:14px; background:#FFF;">
              <option value="1">1 Traveler</option>
              <option value="2">2 Travelers</option>
              <option value="3">3 Travelers</option>
              <option value="4">4+ Travelers</option>
            </select>
          </div>
          <div style="margin-bottom: 24px;">
            <label for="book-date" style="display:block; font-weight:700; font-size:13.5px; color:#0F172A; margin-bottom:6px;">Preferred Travel Date</label>
            <input type="date" id="book-date" name="travelDate" class="chat-input" style="width:100%; padding:12px 16px; border:1px solid #E2E8F0; border-radius:12px; font-size:14px; background:#FFF;">
          </div>
          <button type="submit" class="jmt-btn-primary" style="width:100%; justify-content:center; padding:14px; font-size:15px;">Confirm Booking Request →</button>
        </form>
        <div id="tour-book-result" style="margin-top:20px;" aria-live="polite"></div>
      </div>
    </div>
  `;

  document.getElementById('tour-book-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const resultDiv = document.getElementById('tour-book-result');
    try {
      const res = await apiCall('/api/tourism/bookings', 'POST', data);
      resultDiv.innerHTML = `
        <div style="background: #DCFCE7; border: 1px solid #16A34A; padding: 18px; border-radius: 14px; color: #15803D;">
          ✅ <b>Booking Requested Successfully!</b><br>Reference Number: <b>${escapeHTML(res.reference)}</b><br>
          Estimated Amount: <b>${escapeHTML(res.currency)} ${res.amount}</b><br><br>
          Check <a href="/account" onclick="navigate('/account')" style="color:#15803D; font-weight:700;">My Account</a> to view your booking details.
        </div>
      `;
      announceToSR(`Booking request submitted successfully. Reference number ${res.reference}`);
      e.target.reset();
    } catch (err) {
      resultDiv.innerHTML = `<div style="color: #DC2626; font-weight: 700; background: #FEE2E2; padding: 14px; border-radius: 12px;">${escapeHTML(err.message)}</div>`;
      announceToSR(`Booking submission error: ${err.message}`);
    }
  };
}

function renderContactPage(container) {
  updateSEO({
    title: "Let's Plan Your Journey | Contact JMT Travels Muscat",
    description: 'Get in touch with JMT Travels in Muscat, Oman. Call +968 7113 2424 or chat on WhatsApp.',
    canonicalUrl: '/contact',
    noindex: false
  });
  announceToSR('Navigated to Contact Page');

  container.innerHTML = `
    <div class="shell" style="padding: 40px 20px 60px;">
      <div class="jmt-hero">
        <span class="jmt-hero-eyebrow">JMT TRAVELS — MUSCAT HEADQUARTERS</span>
        <h1 class="jmt-hero-title">Let's Plan Your Journey</h1>
        <p class="jmt-hero-sub">Tell us what you need and our travel specialists in Muscat will help customize your visa clearing, tour packages, flights, or hotel stays.</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 32px; align-items: start;">
        <!-- LEFT INQUIRY FORM -->
        <form id="contact-form" class="jmt-card">
          <h2 style="font-size: 22px; color: #0B286C; font-weight: 800; margin-bottom: 8px;">Send Us a Message</h2>
          <p style="color: #64748B; font-size: 14px; margin-bottom: 24px;">Fill in your details below and our team will get back to you within 24 hours.</p>

          <div style="margin-bottom: 16px;">
            <label for="contact-name" style="display:block; font-weight:700; font-size:13.5px; color:#0F172A; margin-bottom:6px;">Your Name <span style="color:#DC2626;" aria-hidden="true">*</span></label>
            <input type="text" id="contact-name" name="name" class="chat-input" style="width:100%; padding:12px 16px; border:1px solid #E2E8F0; border-radius:12px; font-size:14px;" required aria-required="true">
          </div>
          <div style="margin-bottom: 16px;">
            <label for="contact-input" style="display:block; font-weight:700; font-size:13.5px; color:#0F172A; margin-bottom:6px;">Contact Email / Phone <span style="color:#DC2626;" aria-hidden="true">*</span></label>
            <input type="text" id="contact-input" name="contact" class="chat-input" style="width:100%; padding:12px 16px; border:1px solid #E2E8F0; border-radius:12px; font-size:14px;" required aria-required="true">
          </div>
          <div style="margin-bottom: 16px;">
            <label for="contact-type" style="display:block; font-weight:700; font-size:13.5px; color:#0F172A; margin-bottom:6px;">Inquiry Type</label>
            <select id="contact-type" name="type" class="chat-input" style="width:100%; padding:12px 16px; border:1px solid #E2E8F0; border-radius:12px; font-size:14px; background:#FFF;">
              <option value="visa">Visa Services Inquiry</option>
              <option value="tours">Holiday & Tour Packages</option>
              <option value="hotels">Hotel & Accommodations</option>
              <option value="flights">Flight Ticketing</option>
              <option value="general">General Inquiry / Support</option>
            </select>
          </div>
          <div style="margin-bottom: 24px;">
            <label for="contact-msg" style="display:block; font-weight:700; font-size:13.5px; color:#0F172A; margin-bottom:6px;">Message <span style="color:#DC2626;" aria-hidden="true">*</span></label>
            <textarea id="contact-msg" name="message" rows="4" class="chat-input" style="width:100%; padding:12px 16px; border:1px solid #E2E8F0; border-radius:12px; font-size:14px;" required aria-required="true"></textarea>
          </div>
          <button type="submit" class="jmt-btn-primary" style="width:100%; justify-content:center; padding:14px; font-size:15px;">Send Inquiry →</button>
          <div id="contact-result" style="margin-top:16px;" aria-live="polite"></div>
        </form>

        <!-- RIGHT CONTACT DETAILS -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div class="jmt-card" style="border-left: 5px solid #00A651;">
            <h2 style="font-size: 20px; color: #0B286C; font-weight: 800; margin-bottom: 16px;">JMT Travels — Muscat Office</h2>
            <div style="display: flex; flex-direction: column; gap: 14px; font-size: 14.5px; color: #334155;">
              <div style="display: flex; gap: 12px; align-items: flex-start;">
                <span style="font-size: 18px;">📍</span>
                <div><b>Office Location:</b><br>Near Mazda R/A, next to Yahar Restaurant, 512, Muscat, Sultanate of Oman</div>
              </div>
              <div style="display: flex; gap: 12px; align-items: center;">
                <span style="font-size: 18px;">📞</span>
                <div><b>Landline Phone:</b> <a href="tel:+96871132424" style="color:#0B286C; font-weight:700; text-decoration:none;">+968 7113 2424</a></div>
              </div>
              <div style="display: flex; gap: 12px; align-items: center;">
                <span style="font-size: 18px;">💬</span>
                <div><b>WhatsApp Support:</b> <a href="https://wa.me/96897608999" target="_blank" rel="noopener" style="color:#00A651; font-weight:700; text-decoration:none;">+968 9760 8999</a></div>
              </div>
              <div style="display: flex; gap: 12px; align-items: center;">
                <span style="font-size: 18px;">✉️</span>
                <div><b>Email Address:</b> <a href="https://mail.google.com/mail/?view=cm&fs=1&to=info%40jmttravels.com" target="_blank" rel="noopener noreferrer" aria-label="Email JMT Travels via Gmail" class="jmt-email-link" style="color:#00A651; font-weight:700; text-decoration:underline;">info@jmttravels.com</a></div>
              </div>
              <div style="display: flex; gap: 12px; align-items: flex-start;">
                <span style="font-size: 18px;">🕐</span>
                <div><b>Working Hours:</b><br>Saturday – Thursday: 8:30 AM – 1:30 PM &amp; 4:30 PM – 9:30 PM<br>Friday: 4:30 PM – 9:30 PM</div>
              </div>
            </div>
          </div>

          <div class="jmt-card" style="text-align: center; background: #F8FAFC;">
            <h3 style="font-size: 16px; color: #0B286C; font-weight: 700; margin-bottom: 8px;">Visit Our Office in Muscat</h3>
            <p style="font-size: 13.5px; color: #64748B; margin-bottom: 16px;">Located centrally near Mazda Roundabout for in-person visa clearing and travel consultations.</p>
            <a href="https://maps.app.goo.gl/3xDLiEdchqgivn1Z7" target="_blank" rel="noopener" class="jmt-btn-secondary" style="width:100%; justify-content:center;">📍 Open in Google Maps</a>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('contact-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const resDiv = document.getElementById('contact-result');
    try {
      const res = await apiCall('/api/feedback', 'POST', data);
      resDiv.innerHTML = `<div style="background: #DCFCE7; color: #15803D; padding: 14px; border-radius: 12px; font-weight:700;">✅ ${escapeHTML(res.message || 'Inquiry sent successfully!')}</div>`;
      announceToSR('Inquiry sent successfully');
      e.target.reset();
    } catch (err) {
      resDiv.innerHTML = `<div style="background: #FEE2E2; color: #DC2626; padding: 14px; border-radius: 12px; font-weight:700;">${escapeHTML(err.message)}</div>`;
      announceToSR(`Inquiry error: ${err.message}`);
    }
  };
}

function renderLoginPage(container) {
  updateSEO({
    title: 'Customer Sign In | JMT Travels Muscat',
    description: 'Sign in to your JMT Travels customer account to manage visas and bookings.',
    canonicalUrl: '/login',
    noindex: true
  });
  announceToSR('Navigated to Customer Sign In');

  container.innerHTML = `
    <div class="shell" style="padding: 60px 20px; max-width: 480px;">
      <form id="login-form" class="jmt-card" style="border-top: 5px solid #00A651;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="/assets/logo.png" alt="JMT Travels" style="height: 48px; margin-bottom: 12px;">
          <h1 style="font-size: 26px; color: #0B286C; font-weight: 800; margin: 0 0 6px;">Welcome Back</h1>
          <p style="color: #64748B; font-size: 14px; margin: 0;">Sign in to manage your visa applications and bookings.</p>
        </div>

        <div style="margin-bottom: 16px;">
          <label for="login-email" style="display:block; font-weight:700; font-size:13.5px; color:#0F172A; margin-bottom:6px;">Email Address <span style="color:#DC2626;" aria-hidden="true">*</span></label>
          <input type="email" id="login-email" name="email" class="chat-input" style="width:100%; padding:12px 16px; border:1px solid #E2E8F0; border-radius:12px; font-size:14px;" placeholder="name@example.com" required aria-required="true">
        </div>
        <div style="margin-bottom: 24px;">
          <label for="login-pass" style="display:block; font-weight:700; font-size:13.5px; color:#0F172A; margin-bottom:6px;">Password <span style="color:#DC2626;" aria-hidden="true">*</span></label>
          <input type="password" id="login-pass" name="password" class="chat-input" style="width:100%; padding:12px 16px; border:1px solid #E2E8F0; border-radius:12px; font-size:14px;" placeholder="••••••••" required aria-required="true">
        </div>
        <button type="submit" class="jmt-btn-primary" style="width:100%; justify-content:center; padding:14px; font-size:15px;">Sign In →</button>
        <div id="login-error" style="margin-top:16px; color: #DC2626; font-weight:700; text-align:center;" aria-live="polite"></div>
        <div style="margin-top: 24px; text-align: center; border-top: 1px solid #F1F5F9; padding-top: 18px; font-size: 14px; color: #64748B;">
          Don't have an account? <a href="/register" onclick="event.preventDefault(); navigate('/register')" style="color:#00A651; font-weight:700; text-decoration:none;">Create Account →</a>
        </div>
      </form>
    </div>
  `;

  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const errDiv = document.getElementById('login-error');
    try {
      const res = await apiCall('/api/auth/login', 'POST', data);
      state.token = res.token;
      state.user = res.user;
      localStorage.setItem('jmt_token', res.token);
      localStorage.setItem('jmt_user', JSON.stringify(res.user));
      announceToSR('Signed in successfully');
      navigate('/account');
    } catch (err) {
      errDiv.textContent = err.message;
      announceToSR(`Sign in failed: ${err.message}`);
    }
  };
}

function renderRegisterPage(container) {
  updateSEO({
    title: 'Start Your Journey | Create JMT Account',
    description: 'Register for a JMT Travels customer account to manage visa document uploads and holiday bookings.',
    canonicalUrl: '/register',
    noindex: true
  });
  announceToSR('Navigated to Create Customer Account');

  container.innerHTML = `
    <div class="shell" style="padding: 60px 20px; max-width: 520px;">
      <form id="register-form" class="jmt-card" style="border-top: 5px solid #00A651;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="/assets/logo.png" alt="JMT Travels" style="height: 48px; margin-bottom: 12px;">
          <h1 style="font-size: 26px; color: #0B286C; font-weight: 800; margin: 0 0 6px;">Start Your Journey With JMT</h1>
          <p style="color: #64748B; font-size: 14px; margin: 0;">Create your account to manage visa applications & holiday bookings.</p>
        </div>

        <div style="margin-bottom: 16px;">
          <label for="reg-name" style="display:block; font-weight:700; font-size:13.5px; color:#0F172A; margin-bottom:6px;">Full Name <span style="color:#DC2626;" aria-hidden="true">*</span></label>
          <input type="text" id="reg-name" name="name" class="chat-input" style="width:100%; padding:12px 16px; border:1px solid #E2E8F0; border-radius:12px; font-size:14px;" placeholder="Full Name" required aria-required="true">
        </div>
        <div style="margin-bottom: 16px;">
          <label for="reg-email" style="display:block; font-weight:700; font-size:13.5px; color:#0F172A; margin-bottom:6px;">Email Address <span style="color:#DC2626;" aria-hidden="true">*</span></label>
          <input type="email" id="reg-email" name="email" class="chat-input" style="width:100%; padding:12px 16px; border:1px solid #E2E8F0; border-radius:12px; font-size:14px;" placeholder="name@example.com" required aria-required="true">
        </div>
        <div style="margin-bottom: 16px;">
          <label for="reg-phone" style="display:block; font-weight:700; font-size:13.5px; color:#0F172A; margin-bottom:6px;">Phone / WhatsApp</label>
          <input type="text" id="reg-phone" name="phone" class="chat-input" style="width:100%; padding:12px 16px; border:1px solid #E2E8F0; border-radius:12px; font-size:14px;" placeholder="+968 9000 0000">
        </div>
        <div style="margin-bottom: 24px;">
          <label for="reg-pass" style="display:block; font-weight:700; font-size:13.5px; color:#0F172A; margin-bottom:6px;">Password <span style="color:#DC2626;" aria-hidden="true">*</span></label>
          <input type="password" id="reg-pass" name="password" class="chat-input" style="width:100%; padding:12px 16px; border:1px solid #E2E8F0; border-radius:12px; font-size:14px;" placeholder="••••••••" required aria-required="true">
        </div>
        <button type="submit" class="jmt-btn-primary" style="width:100%; justify-content:center; padding:14px; font-size:15px;">Create Account →</button>
        <div id="register-error" style="margin-top:16px; color: #DC2626; font-weight:700; text-align:center;" aria-live="polite"></div>
        <div style="margin-top: 24px; text-align: center; border-top: 1px solid #F1F5F9; padding-top: 18px; font-size: 14px; color: #64748B;">
          Already have an account? <a href="/login" onclick="event.preventDefault(); navigate('/login')" style="color:#00A651; font-weight:700; text-decoration:none;">Sign In →</a>
        </div>
      </form>
    </div>
  `;

  document.getElementById('register-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const errDiv = document.getElementById('register-error');
    try {
      const res = await apiCall('/api/auth/register', 'POST', data);
      state.token = res.token;
      state.user = res.user;
      localStorage.setItem('jmt_token', res.token);
      localStorage.setItem('jmt_user', JSON.stringify(res.user));
      announceToSR('Account created successfully');
      navigate('/account');
    } catch (err) {
      errDiv.textContent = err.message;
      announceToSR(`Registration failed: ${err.message}`);
    }
  };
}

async function renderAccountPage(container) {
  if (!state.user) {
    navigate('/login');
    return;
  }

  updateSEO({
    title: 'Customer Dashboard | JMT Travels Muscat',
    description: 'Personalized dashboard for managing your visa applications, bookings, and support tickets.',
    canonicalUrl: '/account',
    noindex: true
  });
  announceToSR('Navigated to Customer Dashboard');

  container.innerHTML = `<div class="shell" style="padding:60px 20px;"><p style="color:#64748B;">Loading customer dashboard...</p></div>`;
  try {
    const [visas, bookings, tickets] = await Promise.all([
      apiCall('/api/visa/applications').catch(() => ({ applications: [] })),
      apiCall('/api/tourism/bookings').catch(() => ({ bookings: [] })),
      apiCall('/api/support/tickets').catch(() => ({ tickets: [] }))
    ]);

    container.innerHTML = `
      <div class="shell" style="padding: 40px 20px 60px;">
        <!-- DASHBOARD HEADER -->
        <div class="jmt-hero" style="padding: 36px 32px; margin-bottom: 32px;">
          <span class="jmt-hero-eyebrow">CUSTOMER PORTAL</span>
          <h1 class="jmt-hero-title" style="font-size: 28px; margin-bottom: 6px;">Welcome Back, ${escapeHTML(state.user.name)}</h1>
          <p class="jmt-hero-sub" style="font-size: 14px; margin-bottom: 0; opacity: 0.9;">${escapeHTML(state.user.email)} • Account Role: <b>${escapeHTML(state.user.role || 'CUSTOMER')}</b></p>
        </div>

        <!-- QUICK STATUS METRICS -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 32px;">
          <div class="jmt-card" style="border-top: 4px solid #00A651;">
            <div style="font-size: 13px; font-weight: 700; color: #64748B; text-transform: uppercase;">Active Visas</div>
            <div style="font-size: 32px; font-weight: 800; color: #0B286C; margin: 4px 0;">${visas.applications ? visas.applications.length : 0}</div>
            <span style="font-size: 12px; color: #00A651; font-weight: 600;">E-Visa Applications</span>
          </div>

          <div class="jmt-card" style="border-top: 4px solid #0B286C;">
            <div style="font-size: 13px; font-weight: 700; color: #64748B; text-transform: uppercase;">Tour Bookings</div>
            <div style="font-size: 32px; font-weight: 800; color: #0B286C; margin: 4px 0;">${bookings.bookings ? bookings.bookings.length : 0}</div>
            <span style="font-size: 12px; color: #0B286C; font-weight: 600;">Reserved Holidays</span>
          </div>

          <div class="jmt-card" style="border-top: 4px solid #3B82F6;">
            <div style="font-size: 13px; font-weight: 700; color: #64748B; text-transform: uppercase;">Support Tickets</div>
            <div style="font-size: 32px; font-weight: 800; color: #0B286C; margin: 4px 0;">${tickets.tickets ? tickets.tickets.length : 0}</div>
            <span style="font-size: 12px; color: #3B82F6; font-weight: 600;">Inquiries & Support</span>
          </div>
        </div>

        <!-- VISA APPLICATIONS SECTION -->
        <div class="jmt-card" style="margin-bottom: 32px;">
          <h2 style="font-size: 20px; color: #0B286C; font-weight: 800; margin-bottom: 16px;">My Visa Applications</h2>
          ${!visas.applications || visas.applications.length === 0 ? '<p style="color:#64748B; font-size:14px; margin:0;">No visa applications submitted yet. <a href="/visa" onclick="navigate(\'/visa\')" style="color:#00A651; font-weight:700;">Apply for an E-Visa →</a></p>' : `
            <div style="overflow-x: auto;">
              <table style="width:100%; border-collapse:collapse; font-size:14px;">
                <thead>
                  <tr style="text-align:left; border-bottom:2px solid #E1E8F2; color:#64748B; font-size:13px;">
                    <th style="padding:12px 10px;">Reference #</th>
                    <th style="padding:12px 10px;">Destination</th>
                    <th style="padding:12px 10px;">Type</th>
                    <th style="padding:12px 10px;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${visas.applications.map(v => `
                    <tr style="border-bottom:1px solid #F1F5F9;">
                      <td style="padding:12px 10px; font-weight:700; color:#0B286C;">${escapeHTML(v.applicationNumber || v.id)}</td>
                      <td style="padding:12px 10px;">${escapeHTML(v.destination)}</td>
                      <td style="padding:12px 10px;">${escapeHTML(v.visaType)}</td>
                      <td style="padding:12px 10px;"><span class="badge badge-success" style="background:#00A651; color:#FFF;">${escapeHTML(v.status)}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- TOUR BOOKINGS SECTION -->
        <div class="jmt-card">
          <h2 style="font-size: 20px; color: #0B286C; font-weight: 800; margin-bottom: 16px;">My Tour Bookings</h2>
          ${!bookings.bookings || bookings.bookings.length === 0 ? '<p style="color:#64748B; font-size:14px; margin:0;">No tour package bookings found. <a href="/tourism" onclick="navigate(\'/tourism\')" style="color:#00A651; font-weight:700;">Explore Oman Tours →</a></p>' : `
            <div style="overflow-x: auto;">
              <table style="width:100%; border-collapse:collapse; font-size:14px;">
                <thead>
                  <tr style="text-align:left; border-bottom:2px solid #E1E8F2; color:#64748B; font-size:13px;">
                    <th style="padding:12px 10px;">Booking Ref</th>
                    <th style="padding:12px 10px;">Package Title</th>
                    <th style="padding:12px 10px;">Amount</th>
                    <th style="padding:12px 10px;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${bookings.bookings.map(b => `
                    <tr style="border-bottom:1px solid #F1F5F9;">
                      <td style="padding:12px 10px; font-weight:700; color:#0B286C;">${escapeHTML(b.bookingNumber || b.id)}</td>
                      <td style="padding:12px 10px;">${escapeHTML(b.packageTitle)}</td>
                      <td style="padding:12px 10px; font-weight:700; color:#00A651;">${escapeHTML(b.currency)} ${b.amount}</td>
                      <td style="padding:12px 10px;"><span class="badge badge-primary">${escapeHTML(b.status)}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="shell" style="padding:60px 20px;"><p style="color:#DC2626;">Error loading customer dashboard.</p></div>`;
  }
}

function renderSupportPage(container) {
  updateSEO({
    title: 'Customer Support & Help Center | JMT Travels Muscat',
    description: 'Get instant help with visa applications, tour bookings, flight ticketing, and payments from JMT Travels Muscat.',
    canonicalUrl: '/support',
    noindex: false
  });
  announceToSR('Navigated to Customer Support Help Center');

  container.innerHTML = `
    <div class="shell" style="padding: 40px 20px 60px;">
      <div class="jmt-hero">
        <span class="jmt-hero-eyebrow">JMT TRAVELS — HELP & SUPPORT</span>
        <h1 class="jmt-hero-title">How Can We Help You Today?</h1>
        <p class="jmt-hero-sub">Browse support topics, chat live with our digital assistant, or connect directly with our Muscat travel specialists.</p>
        <div style="display: flex; gap: 14px; flex-wrap: wrap;">
          <button onclick="toggleChat()" class="jmt-btn-primary">💬 Chat with JMT Assistant</button>
          <a href="/contact" onclick="event.preventDefault(); navigate('/contact')" class="jmt-btn-secondary" style="color:#FFF; border-color:rgba(255,255,255,0.4);">Send Message to Desk</a>
        </div>
      </div>

      <!-- SUPPORT TOPIC CARDS GRID -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-bottom: 40px;">
        <div class="jmt-card" onclick="navigate('/visa')" style="cursor: pointer;">
          <div style="font-size: 36px; margin-bottom: 14px;">🛂</div>
          <h3 style="font-size: 18px; color: #0B286C; font-weight: 800; margin-bottom: 8px;">Visa Application Help</h3>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 16px;">Track active e-visas, check required document checklists, and review processing timelines.</p>
          <span style="color: #00A651; font-weight: 700; font-size: 14px;">Explore Visa Desk →</span>
        </div>

        <div class="jmt-card" onclick="navigate('/tourism')" style="cursor: pointer;">
          <div style="font-size: 36px; margin-bottom: 14px;">🧳</div>
          <h3 style="font-size: 18px; color: #0B286C; font-weight: 800; margin-bottom: 8px;">Tour & Package Booking</h3>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 16px;">Inquire about Salalah retreats, GCC escapes, Umrah itineraries, and custom Omani tours.</p>
          <span style="color: #00A651; font-weight: 700; font-size: 14px;">View Holiday Packages →</span>
        </div>

        <div class="jmt-card" onclick="navigate('/account')" style="cursor: pointer;">
          <div style="font-size: 36px; margin-bottom: 14px;">💳</div>
          <h3 style="font-size: 18px; color: #0B286C; font-weight: 800; margin-bottom: 8px;">Payment & Receipts</h3>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 16px;">Review transaction history, download payment receipts, and verify currency billing.</p>
          <span style="color: #00A651; font-weight: 700; font-size: 14px;">Go to Dashboard →</span>
        </div>

        <div class="jmt-card" onclick="navigate('/flights')" style="cursor: pointer;">
          <div style="font-size: 36px; margin-bottom: 14px;">✈️</div>
          <h3 style="font-size: 18px; color: #0B286C; font-weight: 800; margin-bottom: 8px;">Flight & Hotel Changes</h3>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 16px;">Request date changes, baggage additions, room upgrades, and travel itinerary assistance.</p>
          <span style="color: #00A651; font-weight: 700; font-size: 14px;">Flight Desk Assistance →</span>
        </div>
      </div>

      <!-- DIRECT CONTACT ESCALATION BANNER -->
      <div class="jmt-card" style="background: linear-gradient(135deg, #FAFBFD 0%, #F1F5F9 100%); border-left: 6px solid #00A651;">
        <h2 style="font-size: 22px; color: #0B286C; font-weight: 800; margin-bottom: 10px;">Need Immediate Human Support?</h2>
        <p style="color: #475569; font-size: 15px; margin-bottom: 20px; line-height: 1.6;">Our dedicated travel team in Muscat is available 6 days a week via phone and WhatsApp.</p>
        <div style="display: flex; gap: 24px; flex-wrap: wrap;">
          <a href="https://wa.me/96897608999" target="_blank" rel="noopener" style="text-decoration: none; color: #0B286C; font-weight: 700; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">💬</span> WhatsApp: +968 9760 8999
          </a>
          <a href="tel:+96871132424" style="text-decoration: none; color: #0B286C; font-weight: 700; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">📞</span> Muscat Phone: +968 7113 2424
          </a>
          <a href="https://mail.google.com/mail/?view=cm&fs=1&to=info%40jmttravels.com" target="_blank" rel="noopener noreferrer" aria-label="Email JMT Travels via Gmail" class="jmt-email-link" style="text-decoration: underline; color: #00A651; font-weight: 700; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">✉️</span> Email: info@jmttravels.com
          </a>
        </div>
      </div>
    </div>
  `;
}

function renderPolicyPage(container, type) {
  const titles = {
    privacy: 'Privacy Policy',
    terms: 'Terms & Conditions',
    'refund-policy': 'Refund & Cancellation Policy',
    'cancellation-policy': 'Cancellation Policy'
  };

  const titleText = titles[type] || 'Policy';

  updateSEO({
    title: `${titleText} | JMT Travels Oman`,
    description: `Official ${titleText} for JMT Travel & Tourism services in Muscat, Oman.`,
    canonicalUrl: `/${type}`,
    noindex: false
  });
  announceToSR(`Navigated to ${titleText}`);

  container.innerHTML = `
    <div class="shell" style="padding: 60px 0; max-width: 800px;">
      <h1 style="color: var(--primary); margin-bottom: 16px;">${escapeHTML(titleText)}</h1>
      <div class="card">
        <p style="margin-bottom: 16px;">JMT Travel &amp; Tourism is committed to protecting your data and delivering clear, transparent travel services across Oman and the GCC.</p>
        <p style="color: var(--text-muted); font-size: 14px;">For complete legal policy documentation or case inquiries, please contact <a href="https://mail.google.com/mail/?view=cm&fs=1&to=info%40jmttravels.com" target="_blank" rel="noopener noreferrer" aria-label="Email JMT Travels via Gmail" class="jmt-email-link" style="color: #00A651; font-weight: 700; text-decoration: underline;">info@jmttravels.com</a> or visit our Muscat office.</p>
      </div>
    </div>
  `;
}

function logoutUser() {
  state.token = '';
  state.user = null;
  localStorage.removeItem('jmt_token');
  localStorage.removeItem('jmt_user');
  announceToSR('Signed out successfully');
  navigate('/');
}

// -------------------------------------------------------------
// CHATBOT CONTROLLER (Task #9 & #10 Accessible Modal Drawer)
// -------------------------------------------------------------

function setupChatbot() {
  const trigger = document.getElementById('chat-trigger');
  const drawer = document.getElementById('chat-drawer');
  const closeBtn = document.getElementById('chat-close');
  const sendBtn = document.getElementById('chat-send');
  const input = document.getElementById('chat-input-field');
  const body = document.getElementById('chat-body-content');

  if (!trigger || !drawer) return;

  let lastFocusedElement = null;

  const openDrawer = () => {
    lastFocusedElement = document.activeElement;
    drawer.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
    announceToSR('Chatbot drawer opened');
    if (input) input.focus();
  };

  const closeDrawer = () => {
    drawer.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
    announceToSR('Chatbot drawer closed');
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  };

  trigger.onclick = () => {
    if (drawer.classList.contains('open')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  };

  if (closeBtn) closeBtn.onclick = closeDrawer;

  // Esc key listener for modal drawer accessibility
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      closeDrawer();
    }
  });

  const appendMsg = (text, isUser = false) => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isUser ? 'user' : 'bot'}`;
    bubble.textContent = text;
    body.appendChild(bubble);
    body.scrollTop = body.scrollHeight;

    if (!isUser) {
      announceToSR(`JMT Assistant reply: ${text}`);
    }
  };

  const handleSend = async () => {
    const msg = input.value.trim();
    if (!msg) return;
    appendMsg(msg, true);
    input.value = '';

    try {
      let endpoint = '/api/chat';
      let payload = { message: msg };

      if (state.token && state.activeConversationId) {
        endpoint = `/api/chat/conversations/${state.activeConversationId}/messages`;
        payload = { text: msg };
      }

      const res = await apiCall(endpoint, 'POST', payload);

      const botText = res.reply || (res.assistantMessage ? res.assistantMessage.text : null) || 'Thank you for contacting JMT Travels!';
      appendMsg(botText, false);
    } catch (err) {
      appendMsg('Sorry, I am having trouble connecting right now. Please WhatsApp us at +968 9760 8999.');
    }
  };

  if (sendBtn) sendBtn.onclick = handleSend;
  if (input) input.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };
}

// Global App Init
document.addEventListener('DOMContentLoaded', () => {
  renderRoute();
  setupChatbot();
});
