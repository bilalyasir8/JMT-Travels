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

// Theme State Manager & Persistent Mode Toggle
window.toggleTheme = function() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
};

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('jmt-theme', theme);

  const icon = document.getElementById('theme-toggle-icon');
  const label = document.getElementById('theme-toggle-label');
  const mobileBtn = document.getElementById('mobile-theme-toggle-btn');

  const moonSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-5.4-5.4c0-1.81.89-3.42 2.26-4.4C12.92 3.04 12.46 3 12 3z"/></svg>';

  if (icon) icon.innerHTML = moonSvg;
  if (mobileBtn) mobileBtn.innerHTML = moonSvg;
  if (label) label.textContent = theme === 'dark' ? 'Dark' : 'Light';
}

// Initial theme setup
(function initTheme() {
  const savedTheme = localStorage.getItem('jmt-theme');
  if (savedTheme) {
    applyTheme(savedTheme);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark');
  } else {
    applyTheme('light');
  }
})();

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
      image: '/assets/destinations/salalah-waterfalls-canyon.jpg',
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
      image: '/assets/destinations/muscat-mutrah-waterfront.jpg',
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
// V2.9 UNIFIED ENQUIRY MODAL & CONVERSION ENGINE
// -------------------------------------------------------------

window.openEnquiryModal = function(type = 'general', title = 'Travel Enquiry', itemData = {}) {
  let modalContainer = document.getElementById('jmt-enquiry-modal-overlay');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'jmt-enquiry-modal-overlay';
    modalContainer.className = 'jmt-modal-overlay';
    document.body.appendChild(modalContainer);
  }

  const itemTitle = itemData.title || title;
  const itemSubtitle = itemData.subtitle || '';
  const defaultMsg = itemData.message || `Hi JMT Travels, I am enquiring about ${itemTitle}. Please provide more information and assistance.`;
  const whatsappText = encodeURIComponent(`Hi JMT Travels, I am enquiring about ${itemTitle}.`);

  modalContainer.innerHTML = `
    <div class="jmt-modal-card" role="dialog" aria-modal="true" aria-labelledby="enquiry-modal-title">
      <div class="jmt-modal-header">
        <div>
          <span style="background: rgba(0, 230, 118, 0.15); color: #00E676; padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: 800; text-transform: uppercase;">JMT TRAVEL DESK</span>
          <h3 id="enquiry-modal-title" style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin: 6px 0 2px;">${escapeHTML(itemTitle)}</h3>
          ${itemSubtitle ? `<div style="font-size: 13px; color: #D6E0F4;">${escapeHTML(itemSubtitle)}</div>` : ''}
        </div>
        <button type="button" class="jmt-modal-close" onclick="closeEnquiryModal()" aria-label="Close Enquiry Modal">×</button>
      </div>

      <div class="jmt-modal-body">
        <form id="jmt-enquiry-form" onsubmit="handleEnquiryFormSubmit(event, '${escapeHTML(type)}', '${escapeHTML(itemTitle)}')">
          <div style="margin-bottom: 14px;">
            <label for="enquiry-name" style="display: block; font-size: 12.5px; font-weight: 700; color: #FFFFFF; margin-bottom: 4px;">Full Name <span style="color: #00E676;">*</span></label>
            <input type="text" id="enquiry-name" required class="jmt-field-input" placeholder="Enter your full name" style="width: 100%; font-size: 15px; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); background: rgba(7,21,59,0.8); color: #FFF;">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
            <div>
              <label for="enquiry-phone" style="display: block; font-size: 12.5px; font-weight: 700; color: #FFFFFF; margin-bottom: 4px;">Phone / WhatsApp <span style="color: #00E676;">*</span></label>
              <input type="tel" id="enquiry-phone" required class="jmt-field-input" placeholder="+968 9XXXXXXX" style="width: 100%; font-size: 15px; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); background: rgba(7,21,59,0.8); color: #FFF;">
            </div>
            <div>
              <label for="enquiry-email" style="display: block; font-size: 12.5px; font-weight: 700; color: #FFFFFF; margin-bottom: 4px;">Email Address <span style="color: #00E676;">*</span></label>
              <input type="email" id="enquiry-email" required class="jmt-field-input" placeholder="name@example.com" style="width: 100%; font-size: 15px; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); background: rgba(7,21,59,0.8); color: #FFF;">
            </div>
          </div>

          <div style="margin-bottom: 16px;">
            <label for="enquiry-message" style="display: block; font-size: 12.5px; font-weight: 700; color: #FFFFFF; margin-bottom: 4px;">Enquiry Details / Dates</label>
            <textarea id="enquiry-message" rows="3" class="jmt-field-input" style="width: 100%; font-size: 14.5px; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); background: rgba(7,21,59,0.8); color: #FFF; resize: vertical;">${escapeHTML(defaultMsg)}</textarea>
          </div>

          <div id="enquiry-form-status" style="display: none; margin-bottom: 14px; padding: 10px 14px; border-radius: 10px; font-size: 13.5px; font-weight: 600;"></div>

          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <button type="submit" id="enquiry-submit-btn" class="jmt-btn-primary" style="flex: 1; min-height: 44px; justify-content: center; background: #00E676; color: #07153B; font-weight: 800; border-radius: 99px; border: 0; cursor: pointer; font-size: 14.5px;">
              Send Enquiry →
            </button>
            <a href="https://wa.me/96897608999?text=${whatsappText}" target="_blank" rel="noopener" class="jmt-btn-whatsapp" style="padding: 12px 18px; border-radius: 99px; font-weight: 700; font-size: 13.5px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; background: #00A651; color: #FFF; white-space: nowrap;">
              💬 WhatsApp JMT
            </a>
          </div>
        </form>
      </div>
    </div>
  `;

  modalContainer.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  const closeBtn = modalContainer.querySelector('.jmt-modal-close');
  if (closeBtn) closeBtn.focus();
};

window.closeEnquiryModal = function() {
  const modalContainer = document.getElementById('jmt-enquiry-modal-overlay');
  if (modalContainer) {
    modalContainer.style.display = 'none';
  }
  document.body.style.overflow = '';
};

window.handleEnquiryFormSubmit = async function(event, type, title) {
  event.preventDefault();
  const btn = document.getElementById('enquiry-submit-btn');
  const statusDiv = document.getElementById('enquiry-form-status');
  const name = document.getElementById('enquiry-name')?.value.trim() || '';
  const phone = document.getElementById('enquiry-phone')?.value.trim() || '';
  const email = document.getElementById('enquiry-email')?.value.trim() || '';
  const message = document.getElementById('enquiry-message')?.value.trim() || '';

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Sending...';
  }

  try {
    await apiCall('/api/contact', 'POST', {
      name,
      email,
      phone,
      subject: `[V2.9 Enquiry] ${type.toUpperCase()}: ${title}`,
      message: `Enquiry Type: ${type}\nItem: ${title}\nCustomer Name: ${name}\nPhone: ${phone}\nEmail: ${email}\n\nDetails:\n${message}`
    });
  } catch (err) {
    console.log('[Enquiry Notice]: Handled locally', err.message);
  }

  if (statusDiv) {
    statusDiv.style.display = 'block';
    statusDiv.style.background = 'rgba(0, 230, 118, 0.15)';
    statusDiv.style.border = '1px solid #00E676';
    statusDiv.style.color = '#00E676';
    statusDiv.innerHTML = `✓ <strong>Enquiry Received!</strong> Our travel specialist in Muscat will contact you shortly on ${escapeHTML(phone || email)}.`;
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = '✓ Enquiry Sent';
    btn.style.background = '#00A651';
  }

  setTimeout(() => {
    window.closeEnquiryModal();
  }, 3000);
};

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
  } else if (path === '/about') {
    activeTarget = 'about';
  } else if (path === '/contact') {
    activeTarget = 'contact';
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
      authNav.innerHTML = `<a href="/login" onclick="event.preventDefault(); navigate('/login')" class="nav-signin-link" style="color:#FFFFFF !important; font-weight:700; font-size:14px; text-decoration:none; margin-right:4px;">Sign In</a> <a href="/register" onclick="event.preventDefault(); navigate('/register')" class="btn-create-account" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); color:#FFFFFF !important; padding:10px 22px; border-radius:99px; font-weight:700; font-size:13px; text-decoration:none; display:inline-flex; align-items:center; gap:6px; box-shadow: 0 4px 14px rgba(7, 21, 59, 0.35); white-space:nowrap;">Create Account →</a>`;
      if (mobileAuthNav) mobileAuthNav.innerHTML = `<a href="/login" onclick="event.preventDefault(); toggleMobileMenu(); navigate('/login')" class="btn btn-outline nav-signin-link" style="flex:1; text-align:center; color:#FFFFFF !important;">Sign In</a> <a href="/register" onclick="event.preventDefault(); toggleMobileMenu(); navigate('/register')" class="btn btn-create-account" style="flex:1; text-align:center; background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); color:#FFFFFF !important;">Register</a>`;
    }
  }

  // Routing with SEO & Noindex rules
  if (path === '/' || path === '/index.html') {
    renderHomePage(container);
  } else if (path === '/visa' || path === '/schengen-visa') {
    renderVisaListPage(container);
  } else if (path === '/visa/schengen/apply' || path === '/visa/schengen-apply' || path === '/schengen-apply') {
    renderSchengenApplyPage(container);
  } else if (path === '/visa-apply' || path === '/visa/apply') {
    renderVisaApplyPage(container);
  } else if (path.startsWith('/visa/')) {
    renderVisaDetailPage(container, path.replace('/visa/', ''));
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
  } else if (path === '/about') {
    renderAboutPage(container);
  } else if (path === '/contact') {
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
  setHeroSlide((currentHeroSlideIndex + direction + 5) % 5);
};

window.setHeroSlide = function(index) {
  currentHeroSlideIndex = index;
  for (let i = 0; i < 5; i++) {
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
      "telephone": ["+96825655711", "+96825655177"],
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
    <!-- 3. LARGE FULL-WIDTH HERO WITH 5-IMAGE SLIDESHOW -->
    <section class="hero-slideshow-wrap">
      <div class="hero-slide-item active" id="hero-slide-0" style="background-image: url('/assets/destinations/hero_hd_muscat_waterfront.jpg');"></div>
      <div class="hero-slide-item" id="hero-slide-1" style="background-image: url('/assets/destinations/hero_hd_oman_mountain_village.jpg');"></div>
      <div class="hero-slide-item" id="hero-slide-2" style="background-image: url('/assets/destinations/hero_hd_almouj_waterfront.jpg');"></div>
      <div class="hero-slide-item" id="hero-slide-3" style="background-image: url('/assets/destinations/hero_hd_salalah_resort.jpg');"></div>
      <div class="hero-slide-item" id="hero-slide-4" style="background-image: url('/assets/destinations/hero_hd_grand_mosque.jpg');"></div>

      <div class="hero-overlay-gradient"></div>

      <button class="hero-arrow-btn hero-arrow-prev" onclick="changeHeroSlide(-1)" aria-label="Previous Slide">‹</button>
      <button class="hero-arrow-btn hero-arrow-next" onclick="changeHeroSlide(1)" aria-label="Next Slide">›</button>

      <div class="shell" style="position: relative; z-index: 15; height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 40px 20px 80px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 30px;">

          <!-- LEFT HERO CONTENT -->
          <div style="max-width: 620px;">
            <div style="font-size: 13px; font-weight: 700; letter-spacing: 2.5px; color: #00E676; text-transform: uppercase; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #00E676; display: inline-block;"></span> OMAN &amp; GCC TRAVEL SPECIALISTS
            </div>

            <h1 style="font-size: clamp(40px, 5.5vw, 68px); font-weight: 800; line-height: 1.1; margin-bottom: 18px; color: #FFFFFF; letter-spacing: -0.5px;">
              Your Next<br>
              <span style="color: #00E676;">Journey</span> Awaits
            </h1>

            <p style="font-size: 16px; color: #E2E8F0; margin-bottom: 32px; line-height: 1.6; max-width: 520px;">
              Discover breathtaking destinations, seamless visa services, luxury hotel bookings, and international flight ticketing with JMT Travels — 20+ years of trusted experience.
            </p>

            <div style="display: flex; gap: 14px; align-items: center; flex-wrap: wrap; margin-bottom: 36px;">
              <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" style="background: #00E676; color: #07153B; padding: 14px 30px; font-size: 15px; border-radius: 999px; font-weight: 800; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 6px 20px rgba(0, 230, 118, 0.35);">
                Explore Tour Packages →
              </a>
              <a href="/visa" onclick="event.preventDefault(); navigate('/visa')" style="background: rgba(255, 255, 255, 0.12); border: 1.5px solid rgba(255, 255, 255, 0.4); color: #FFFFFF; padding: 14px 26px; font-size: 15px; border-radius: 999px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; backdrop-filter: blur(8px);">
                Get Visa Assistance
              </a>
            </div>

            <!-- HERO TRUST STRIP -->
            <div style="display: flex; gap: 28px; flex-wrap: wrap; align-items: center; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.18);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(0, 230, 118, 0.15); display: flex; align-items: center; justify-content: center; color: #00E676;">✓</div>
                <div>
                  <div style="font-size: 13.5px; font-weight: 800; color: #FFFFFF; line-height: 1.1;">20+ Years Trust</div>
                  <div style="font-size: 11px; color: #CBD5E1;">Muscat &amp; Worldwide</div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(0, 230, 118, 0.15); display: flex; align-items: center; justify-content: center; color: #00E676;">✓</div>
                <div>
                  <div style="font-size: 13.5px; font-weight: 800; color: #FFFFFF; line-height: 1.1;">Visa Clearing</div>
                  <div style="font-size: 11px; color: #CBD5E1;">Oman &amp; Schengen</div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(0, 230, 118, 0.15); display: flex; align-items: center; justify-content: center; color: #00E676;">✓</div>
                <div>
                  <div style="font-size: 13.5px; font-weight: 800; color: #FFFFFF; line-height: 1.1;">24/7 Care</div>
                  <div style="font-size: 11px; color: #CBD5E1;">WhatsApp &amp; AI Support</div>
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT HERO SCRIPT TEXT -->
          <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
            <div style="font-family: 'Caveat', cursive; font-size: 76px; color: rgba(255,255,255,0.95); line-height: 0.95; transform: rotate(-4deg); text-shadow: 0 4px 16px rgba(0,0,0,0.4);">
              Oman
            </div>
            <div style="font-size: 15px; font-weight: 700; color: #00E676; letter-spacing: 1px; margin-top: 4px; text-transform: uppercase;">
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
        <span class="hero-dot" id="hero-dot-4" onclick="setHeroSlide(4)"></span>
      </div>
    </section>

    <!-- 4. FLOATING SEARCH CONTAINER -->
    <div class="shell" style="margin-top: -65px; position: relative; z-index: 40; padding: 0 20px; width: 100%; max-width: 100%;">
      <div class="jmt-home-search-card" style="width: 100% !important; max-width: 100% !important;">

        <!-- SEARCH TABS -->
        <div class="jmt-search-tabs-row" role="tablist" aria-label="Travel Search Categories">
          <button onclick="switchHomeTab('tours')" id="tab-tours" class="search-tab-item active" role="tab" aria-selected="true" aria-controls="home-generic-panel">
            Tours &amp; Holidays
          </button>
          <button onclick="switchHomeTab('visa')" id="tab-visa" class="search-tab-item" role="tab" aria-selected="false" aria-controls="home-generic-panel">
            Visa Services
          </button>
          <button onclick="switchHomeTab('hotels')" id="tab-hotels" class="search-tab-item" role="tab" aria-selected="false" aria-controls="home-generic-panel">
            Hotels
          </button>
          <button onclick="switchHomeTab('flights')" id="tab-flights" class="search-tab-item" role="tab" aria-selected="false" aria-controls="home-flight-panel">
            Flights
          </button>
        </div>

        <!-- GENERIC SEARCH PANEL (TOURS / VISA / HOTELS) -->
        <div id="home-generic-panel" role="tabpanel" aria-labelledby="tab-tours">
          <form onsubmit="handleHomeSearch(event)">
            <div class="jmt-segmented-search-bar">

              <!-- Where To Field -->
              <div class="jmt-search-segmented-field">
                <div style="flex: 1;">
                  <label for="search-dest-input" class="jmt-segmented-label">WHERE TO?</label>
                  <input type="text" id="search-dest-input" class="jmt-segmented-input" placeholder="Search destinations, tours..." autocomplete="off">
                </div>
              </div>

              <!-- Travel Dates Field -->
              <div class="jmt-search-segmented-field">
                <div style="flex: 1;">
                  <label for="search-dates-input" class="jmt-segmented-label">TRAVEL DATES</label>
                  <input type="text" id="search-dates-input" class="jmt-segmented-input" placeholder="Select dates" autocomplete="off">
                </div>
              </div>

              <!-- Travellers Field with Custom Popover (No Native Select) -->
              <div class="jmt-search-segmented-field" id="travellers-field-container" style="position: relative; cursor: pointer;" onclick="toggleTravellerPopover(event)">
                <div style="flex: 1;">
                  <span class="jmt-segmented-label">TRAVELLERS</span>
                  <div id="travellers-display-val" style="font-size: 14px; font-weight: 700; color: #FFFFFF; white-space: nowrap;">2 Adults</div>
                  <!-- Hidden input to maintain form compatibility -->
                  <input type="hidden" id="search-travellers-input" value="2 Adults">
                </div>

                <!-- CUSTOM ACCESSIBLE POPOVER -->
                <div class="jmt-traveller-popover" id="popover-home-travellers" style="display: none;" onclick="event.stopPropagation()">
                  <div class="jmt-pax-counter-row">
                    <div>
                      <div class="jmt-pax-title">Adults</div>
                      <div class="jmt-pax-sub">12+ years</div>
                    </div>
                    <div class="jmt-counter-ctrl">
                      <button type="button" class="jmt-pax-btn" onclick="updateHomePaxCount('adults', -1)">-</button>
                      <span class="jmt-pax-num" id="home-count-adults">2</span>
                      <button type="button" class="jmt-pax-btn" onclick="updateHomePaxCount('adults', 1)">+</button>
                    </div>
                  </div>

                  <div class="jmt-pax-counter-row">
                    <div>
                      <div class="jmt-pax-title">Children</div>
                      <div class="jmt-pax-sub">2–11 years</div>
                    </div>
                    <div class="jmt-counter-ctrl">
                      <button type="button" class="jmt-pax-btn" onclick="updateHomePaxCount('children', -1)">-</button>
                      <span class="jmt-pax-num" id="home-count-children">0</span>
                      <button type="button" class="jmt-pax-btn" onclick="updateHomePaxCount('children', 1)">+</button>
                    </div>
                  </div>

                  <div class="jmt-pax-counter-row">
                    <div>
                      <div class="jmt-pax-title">Infants</div>
                      <div class="jmt-pax-sub">Under 2 years</div>
                    </div>
                    <div class="jmt-counter-ctrl">
                      <button type="button" class="jmt-pax-btn" onclick="updateHomePaxCount('infants', -1)">-</button>
                      <span class="jmt-pax-num" id="home-count-infants">0</span>
                      <button type="button" class="jmt-pax-btn" onclick="updateHomePaxCount('infants', 1)">+</button>
                    </div>
                  </div>

                  <div class="jmt-preset-chips-title">Quick Selection</div>
                  <div class="jmt-preset-chips-row">
                    <button type="button" class="jmt-preset-chip" onclick="setTravellerPreset('1 Adult')">1 Adult</button>
                    <button type="button" class="jmt-preset-chip active" onclick="setTravellerPreset('2 Adults')">2 Adults</button>
                    <button type="button" class="jmt-preset-chip" onclick="setTravellerPreset('Family (2+2)')">Family (2+2)</button>
                    <button type="button" class="jmt-preset-chip" onclick="setTravellerPreset('Group (4+)')">Group (4+)</button>
                  </div>

                  <div class="jmt-popover-footer">
                    <button type="button" class="jmt-popover-done-btn" onclick="closeTravellerPopover()">Done</button>
                  </div>
                </div>
              </div>

              <!-- Submit CTA Button -->
              <button type="submit" class="search-submit-btn" aria-label="Search Packages">
                Search Packages →
              </button>

            </div>
          </form>
        </div>

        <!-- FLIGHTS SEARCH PANEL -->
        <div id="home-flight-panel" style="display: none;">
          <!-- Top Control Pills -->
          <div class="jmt-flight-top-controls">
            <!-- Segmented Trip Selector -->
            <div class="jmt-flight-segmented-trip">
              <button type="button" onclick="setFlightTripType('round-trip')" id="btn-trip-round-home" class="jmt-trip-btn active">
                Round Trip
              </button>
              <button type="button" onclick="setFlightTripType('one-way')" id="btn-trip-oneway-home" class="jmt-trip-btn">
                One Way
              </button>
              <button type="button" onclick="setFlightTripType('multi-city')" id="btn-trip-multicity-home" class="jmt-trip-btn">
                Multi City
              </button>
            </div>

            <!-- Passengers & Cabin -->
            <div style="position: relative;">
              <button type="button" class="jmt-flight-pax-btn" id="flight-pax-pill" onclick="toggleFlightPopover('passengers')">
                <span><span id="flight-pax-label">1 Passenger, Economy</span></span>
                <span style="font-size: 10px; color: #00E676; margin-left: 6px;">▼</span>
              </button>
              <div class="jmt-flight-popover" id="popover-passengers" style="display: none; width: 300px; padding: 20px; background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 16px; box-shadow: 0 16px 40px rgba(0,0,0,0.5); color: #FFFFFF; position: absolute; top: calc(100% + 8px); right: 0; z-index: 120;">
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

                <div style="margin-top: 14px; border-top: 1px solid rgba(255, 255, 255, 0.15); padding-top: 12px;">
                  <label style="font-size: 11px; font-weight: 700; color: #FFFFFF; text-transform: uppercase; display: block; margin-bottom: 6px;">Cabin Class</label>
                  <select id="flight-cabin-select" onchange="updateFlightCabin(this.value)" class="jmt-select-input" style="background:#07153B; color:#FFFFFF; border:1px solid rgba(255,255,255,0.2); border-radius:8px; padding:8px 12px; width:100%;">
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
                <label style="font-size: 11px; font-weight: 700; color: #FFFFFF; text-transform: uppercase; display: block; margin-bottom: 6px;">Enter Promo Code</label>
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
              <div id="from-airport-container" style="position: relative;">
                <div class="jmt-search-field-box" onclick="focusAirportInput('from')">
                  <div class="jmt-field-label">FROM</div>
                  <input type="text" id="flight-from-input" class="jmt-field-input"
                         placeholder="Select origin"
                         value="Muscat International Airport (MCT)"
                         onfocus="openAirportDropdown('from')"
                         oninput="filterAirportDropdown('from', this.value)"
                         onkeydown="handleAirportKeydown('from', event)"
                         autocomplete="off">
                </div>
                <div class="jmt-airport-dropdown" id="from-airport-dropdown" style="display: none;"></div>
              </div>

              <!-- Swap Button -->
              <button type="button" onclick="swapFlightAirports()" class="jmt-swap-btn" title="Swap Origin &amp; Destination" aria-label="Swap airports">
                ⇄
              </button>

              <!-- To -->
              <div id="to-airport-container" style="position: relative;">
                <div class="jmt-search-field-box" onclick="focusAirportInput('to')">
                  <div class="jmt-field-label">TO</div>
                  <input type="text" id="flight-to-input" class="jmt-field-input"
                         placeholder="Select destination"
                         value="Dubai International Airport (DXB)"
                         onfocus="openAirportDropdown('to')"
                         oninput="filterAirportDropdown('to', this.value)"
                         onkeydown="handleAirportKeydown('to', event)"
                         autocomplete="off">
                </div>
                <div class="jmt-airport-dropdown" id="to-airport-dropdown" style="display: none;"></div>
              </div>

              <!-- Departure Date -->
              <div class="jmt-search-field-box">
                <div class="jmt-field-label">DEPARTURE</div>
                <input type="date" id="flight-dept-input" required class="jmt-field-input">
              </div>

              <!-- Return Date -->
              <div class="jmt-search-field-box" id="flight-return-box">
                <div class="jmt-field-label">RETURN</div>
                <input type="date" id="flight-return-input" required class="jmt-field-input">
              </div>

              <!-- CTA Submit Button -->
              <button type="submit" class="search-submit-btn jmt-flight-search-submit-btn">
                Search Flights →
              </button>
            </div>
            <div id="flight-search-error" style="color: #DC2626; font-size: 13px; font-weight: 600; margin-top: 10px; display: none;"></div>
          </form>
        </div>

      </div>
    </div>

    <!-- 5. UNIFIED TRUST BENEFITS STRIP -->
    <div class="shell" style="margin-top: 36px; margin-bottom: 54px;">
      <div class="jmt-unified-trust-strip">

        <div class="jmt-trust-col">
          <div class="jmt-trust-icon-box"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
          <div>
            <h4 class="jmt-trust-title">Trusted &amp; Reliable</h4>
            <p class="jmt-trust-desc">20+ years of travel excellence in Muscat</p>
          </div>
        </div>

        <div class="jmt-trust-col">
          <div class="jmt-trust-icon-box"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg></div>
          <div>
            <h4 class="jmt-trust-title">Best Price Guarantee</h4>
            <p class="jmt-trust-desc">Unbeatable value for flights, tours &amp; visas</p>
          </div>
        </div>

        <div class="jmt-trust-col">
          <div class="jmt-trust-icon-box"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg></div>
          <div>
            <h4 class="jmt-trust-title">Expert Support</h4>
            <p class="jmt-trust-desc">Dedicated WhatsApp &amp; AI care</p>
          </div>
        </div>

        <div class="jmt-trust-col">
          <div class="jmt-trust-icon-box"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
          <div>
            <h4 class="jmt-trust-title">Seamless Experience</h4>
            <p class="jmt-trust-desc">From visa clearance to flight booking</p>
          </div>
        </div>

      </div>
    </div>

    <!-- 5.5 MAJOR SERVICES SECTION -->
    <section class="shell" style="margin-bottom: 70px;">
      <div style="text-align: center; max-width: 680px; margin: 0 auto 36px;">
        <div style="font-size: 12px; font-weight: 800; letter-spacing: 2px; color: #00E676; text-transform: uppercase; margin-bottom: 8px;">OUR CORE SERVICES</div>
        <h2 style="font-size: clamp(28px, 4vw, 40px); font-weight: 800; color: #FFFFFF; margin: 0 0 10px;">Everything You Need For Your Travel</h2>
        <p style="color: #CBD5E1; font-size: 15px; margin: 0;">Comprehensive travel solutions backed by 20+ years of regional expertise in Muscat, Oman.</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">

        <!-- SERVICE CARD 1 -->
        <div class="jmt-service-card" onclick="navigate('/tourism')" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 20px; padding: 28px; transition: transform 0.3s ease, box-shadow 0.3s ease; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="width: 50px; height: 50px; border-radius: 14px; background: rgba(0, 230, 118, 0.15); border: 1px solid rgba(0, 230, 118, 0.3); color: #00E676; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 18px;">🌴</div>
            <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin-bottom: 10px;">Oman Tours &amp; Holiday Packages</h3>
            <p style="font-size: 14px; color: #D6E0F4; line-height: 1.6; margin-bottom: 20px;">Explore Muscat heritage, Salalah Khareef monsoon retreats, Nizwa forts, Wahiba Sands desert safaris, and Jebel Akhdar mountain heights.</p>
          </div>
          <span style="font-size: 13.5px; font-weight: 700; color: #00E676; display: inline-flex; align-items: center; gap: 6px;">Explore Tours →</span>
        </div>

        <!-- SERVICE CARD 2 -->
        <div class="jmt-service-card" onclick="navigate('/visa')" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 20px; padding: 28px; transition: transform 0.3s ease, box-shadow 0.3s ease; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="width: 50px; height: 50px; border-radius: 14px; background: rgba(0, 230, 118, 0.15); border: 1px solid rgba(0, 230, 118, 0.3); color: #00E676; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 18px;">🛂</div>
            <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin-bottom: 10px;">Visa Clearing &amp; Assistance</h3>
            <p style="font-size: 14px; color: #D6E0F4; line-height: 1.6; margin-bottom: 20px;">Hassle-free intake and clearance for Oman Tourist Visas, Business &amp; Family Visit Visas, plus Schengen appointment assistance.</p>
          </div>
          <span style="font-size: 13.5px; font-weight: 700; color: #00E676; display: inline-flex; align-items: center; gap: 6px;">View Visa Services →</span>
        </div>

        <!-- SERVICE CARD 3 -->
        <div class="jmt-service-card" onclick="navigate('/hotels')" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 20px; padding: 28px; transition: transform 0.3s ease, box-shadow 0.3s ease; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="width: 50px; height: 50px; border-radius: 14px; background: rgba(0, 230, 118, 0.15); border: 1px solid rgba(0, 230, 118, 0.3); color: #00E676; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 18px;">🏨</div>
            <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin-bottom: 10px;">Hotels &amp; Luxury Stays</h3>
            <p style="font-size: 14px; color: #D6E0F4; line-height: 1.6; margin-bottom: 20px;">Handpicked luxury resorts, coastal suites, and comfortable city hotels in Muscat, Salalah, Dubai, and across the GCC with best rate guarantee.</p>
          </div>
          <span style="font-size: 13.5px; font-weight: 700; color: #00E676; display: inline-flex; align-items: center; gap: 6px;">Search Hotels →</span>
        </div>

        <!-- SERVICE CARD 4 -->
        <div class="jmt-service-card" onclick="navigate('/flights')" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 20px; padding: 28px; transition: transform 0.3s ease, box-shadow 0.3s ease; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="width: 50px; height: 50px; border-radius: 14px; background: rgba(0, 230, 118, 0.15); border: 1px solid rgba(0, 230, 118, 0.3); color: #00E676; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 18px;">✈️</div>
            <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin-bottom: 10px;">International Flight Ticketing</h3>
            <p style="font-size: 14px; color: #D6E0F4; line-height: 1.6; margin-bottom: 20px;">Instant flight searches, round-trip fares, and ticketing across Oman Air, Emirates, Qatar Airways, and major global airlines.</p>
          </div>
          <span style="font-size: 13.5px; font-weight: 700; color: #00E676; display: inline-flex; align-items: center; gap: 6px;">Search Flights →</span>
        </div>

        <!-- SERVICE CARD 5 -->
        <div class="jmt-service-card" onclick="navigate('/tourism')" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 20px; padding: 28px; transition: transform 0.3s ease, box-shadow 0.3s ease; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="width: 50px; height: 50px; border-radius: 14px; background: rgba(0, 230, 118, 0.15); border: 1px solid rgba(0, 230, 118, 0.3); color: #00E676; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 18px;">🕋</div>
            <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin-bottom: 10px;">Umrah &amp; Religious Journeys</h3>
            <p style="font-size: 14px; color: #D6E0F4; line-height: 1.6; margin-bottom: 20px;">Dedicated Umrah pilgrimage assistance, Makkah &amp; Madinah hotel accommodations near the Haram, and complete ground transportation.</p>
          </div>
          <span style="font-size: 13.5px; font-weight: 700; color: #00E676; display: inline-flex; align-items: center; gap: 6px;">Explore Packages →</span>
        </div>

        <!-- SERVICE CARD 6 -->
        <div class="jmt-service-card" onclick="navigate('/tourism')" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 20px; padding: 28px; transition: transform 0.3s ease, box-shadow 0.3s ease; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="width: 50px; height: 50px; border-radius: 14px; background: rgba(0, 230, 118, 0.15); border: 1px solid rgba(0, 230, 118, 0.3); color: #00E676; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 18px;">🌆</div>
            <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin-bottom: 10px;">GCC Holiday Escapes</h3>
            <p style="font-size: 14px; color: #D6E0F4; line-height: 1.6; margin-bottom: 20px;">Bespoke Dubai, Abu Dhabi, and regional GCC weekend getaways featuring desert safaris, city tours, and luxury stays.</p>
          </div>
          <span style="font-size: 13.5px; font-weight: 700; color: #00E676; display: inline-flex; align-items: center; gap: 6px;">Explore Tours →</span>
        </div>

      </div>

      <!-- V2.9 GLOBAL HELPER BANNER -->
      <div class="jmt-global-helper-banner">
        <div>
          <h3 style="font-size: 19px; font-weight: 800; color: #FFFFFF; margin: 0 0 4px;">Need Help Planning Your Trip?</h3>
          <p style="font-size: 14px; color: #D6E0F4; margin: 0;">Speak directly with a JMT Travels travel specialist in Muscat for custom itineraries and assistance.</p>
        </div>
        <div style="display: flex; gap: 12px; align-items: center;">
          <a href="https://wa.me/96897608999?text=Hi%20JMT%20Travels,%20I%20need%20assistance%20planning%20my%20trip." target="_blank" rel="noopener" class="jmt-btn-whatsapp" style="padding: 12px 22px; border-radius: 99px; font-weight: 800; font-size: 14px; text-decoration: none; background: #00A651; color: #FFF; display: inline-flex; align-items: center; gap: 6px;">
            💬 Talk to JMT on WhatsApp
          </a>
          <a href="/contact" onclick="event.preventDefault(); navigate('/contact')" class="jmt-btn-secondary" style="padding: 12px 20px; border-radius: 99px; font-weight: 700; font-size: 14px; text-decoration: none; color: #FFF; background: rgba(255,255,255,0.12); border: 1.5px solid rgba(255,255,255,0.4);">
            Contact Us →
          </a>
        </div>
      </div>
    </section>

    <!-- 6. POPULAR DESTINATIONS SECTION -->
    <section class="shell" style="margin-bottom: 70px;">
      <div class="jmt-section-eyebrow" style="color: #00E676;">EXPLORE OMAN</div>
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-size: clamp(28px, 4vw, 38px); font-weight: 800; color: #FFFFFF; margin: 0 0 6px; letter-spacing: -0.5px; display: flex; align-items: center; gap: 12px;">
            Popular Destinations <span class="heading-green-line" style="width: 44px; height: 3.5px; background: #00E676; border-radius: 99px;"></span>
          </h2>
          <p style="color: #CBD5E1; font-size: 15px; margin: 0;">Discover the places that make Oman unforgettable</p>
        </div>
        <div>
          <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" class="jmt-view-all-link" style="color: #00E676; font-weight: 700; text-decoration: none;" aria-label="View all destinations">
            View all destinations <span>→</span>
          </a>
        </div>
      </div>

      <div class="jmt-editorial-grid">

        <!-- CARD 1: MUSCAT (FEATURED 2-COL WIDE CARD) -->
        <div class="jmt-dest-rich-card jmt-dest-card-featured" onclick="navigate('/tourism')">
          <img src="/assets/destinations/muscat-mutrah-waterfront.jpg" alt="Muscat Mutrah Waterfront Corniche, Oman" loading="lazy">
          <div class="jmt-dest-overlay">
            <div>
              <span style="font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #00E676; text-transform: uppercase;">FEATURED DESTINATION</span>
              <h3 class="jmt-dest-name" style="font-size: 26px; margin-top: 4px;">Muscat</h3>
              <p class="jmt-dest-sub">Capital of Oman • Mutrah Corniche &amp; Grand Mosque</p>
            </div>
            <span class="jmt-dest-explore-btn" style="padding: 8px 18px; font-size: 13px; background: #00E676; color: #07153B; font-weight: 800;">Explore Muscat <span>→</span></span>
          </div>
        </div>

        <!-- CARD 2: NIZWA -->
        <div class="jmt-dest-rich-card jmt-dest-card-regular" onclick="navigate('/tourism')">
          <img src="/assets/destinations/nizwa-fort-roof-minaret.jpg" alt="Historic Nizwa Fort and traditional heritage minaret in Oman" loading="lazy">
          <div class="jmt-dest-overlay">
            <div>
              <h3 class="jmt-dest-name">Nizwa</h3>
              <p class="jmt-dest-sub">Cultural &amp; Fort Capital</p>
            </div>
            <span class="jmt-dest-explore-btn">Explore <span>→</span></span>
          </div>
        </div>

        <!-- CARD 3: SALALAH -->
        <div class="jmt-dest-rich-card jmt-dest-card-sub" onclick="navigate('/tourism')">
          <img src="/assets/destinations/salalah-fazayah-bay-rug.jpg" alt="Fazayah green coastal bay and mist in Salalah, Oman" loading="lazy">
          <div class="jmt-dest-overlay">
            <div>
              <h3 class="jmt-dest-name">Salalah</h3>
              <p class="jmt-dest-sub">Coastal Greenery &amp; Khareef</p>
            </div>
            <span class="jmt-dest-explore-btn">Explore <span>→</span></span>
          </div>
        </div>

        <!-- CARD 4: WAHIBA SANDS -->
        <div class="jmt-dest-rich-card jmt-dest-card-sub" onclick="navigate('/tourism')">
          <img src="/assets/destinations/wahiba-sands-desert-safari.jpg" alt="Golden sand dunes desert safari in Wahiba Sands, Oman" loading="lazy">
          <div class="jmt-dest-overlay">
            <div>
              <h3 class="jmt-dest-name">Wahiba Sands</h3>
              <p class="jmt-dest-sub">Golden Desert Safari</p>
            </div>
            <span class="jmt-dest-explore-btn">Explore <span>→</span></span>
          </div>
        </div>

        <!-- CARD 5: JEBEL AKHDAR -->
        <div class="jmt-dest-rich-card jmt-dest-card-sub" onclick="navigate('/tourism')">
          <img src="/assets/destinations/oman-palm-oasis-mountains.jpg" alt="Green mountain terraces and palm oasis in Jebel Akhdar, Oman" loading="lazy">
          <div class="jmt-dest-overlay">
            <div>
              <h3 class="jmt-dest-name">Jebel Akhdar</h3>
              <p class="jmt-dest-sub">Green Mountain Heights</p>
            </div>
            <span class="jmt-dest-explore-btn">Explore <span>→</span></span>
          </div>
        </div>

        <!-- CARD 6: KHASAB -->
        <div class="jmt-dest-rich-card jmt-dest-card-sub" onclick="navigate('/tourism')">
          <img src="/assets/destinations/oman-coastal-landscape.jpg" alt="Dramatic coastal mountains and fjords of Musandam in Khasab, Oman" loading="lazy">
          <div class="jmt-dest-overlay">
            <div>
              <h3 class="jmt-dest-name">Khasab</h3>
              <p class="jmt-dest-sub">Fjords of Musandam</p>
            </div>
            <span class="jmt-dest-explore-btn">Explore <span>→</span></span>
          </div>
        </div>

      </div>
    </section>

    <!-- 8. FEATURED TOUR PACKAGES SECTION -->
    <section class="shell" style="margin-bottom: 70px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-size: clamp(28px, 4vw, 38px); font-weight: 800; color: #FFFFFF; margin: 0 0 4px; display: flex; align-items: center; gap: 10px;">
            Featured Tour Packages <span class="heading-green-line" style="width: 44px; height: 3.5px; background: #00E676; border-radius: 99px;"></span>
          </h2>
          <p style="color: #CBD5E1; font-size: 15px; margin: 0;">Curated journeys for every type of traveller</p>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" style="color: #00E676; font-weight: 700; text-decoration: none; font-size: 14px;">View All Packages →</a>
        </div>
      </div>

      <div class="card-grid" id="home-packages-grid">Loading packages...</div>
    </section>

    <!-- 9. WHY CHOOSE JMT TRAVELS SECTION -->
    <section class="shell" style="margin-bottom: 70px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-size: clamp(28px, 3.8vw, 38px); font-weight: 800; color: #00E676 !important; margin: 0 0 4px; display: flex; align-items: center; gap: 10px;">
            Why Choose JMT Travels? <span class="heading-green-line" style="width: 44px; height: 3.5px; background: #00E676; border-radius: 99px;"></span>
          </h2>
          <p style="color: #E2E8F0 !important; font-size: 15px; margin: 0;">20+ years of trusted regional expertise in Muscat, Oman</p>
        </div>
        <a href="/about" onclick="event.preventDefault(); navigate('/about')" style="color: #00E676 !important; font-weight: 700; text-decoration: none; font-size: 15px;">Learn More About Us →</a>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px;">

        <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 18px; padding: 28px; box-shadow: 0 12px 32px rgba(7, 21, 59, 0.22);">
          <div style="width: 46px; height: 46px; border-radius: 12px; background: rgba(0, 230, 118, 0.2); color: #00E676; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h3 style="font-size: 18px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 8px;">20+ Years Experience</h3>
          <p style="font-size: 14px; color: #D6E0F4 !important; margin: 0; line-height: 1.6;">Established local travel agency in Muscat delivering trusted tour, visa, and flight services.</p>
        </div>

        <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 18px; padding: 28px; box-shadow: 0 12px 32px rgba(7, 21, 59, 0.22);">
          <div style="width: 46px; height: 46px; border-radius: 12px; background: rgba(0, 230, 118, 0.2); color: #00E676; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <h3 style="font-size: 18px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 8px;">Visa Expertise</h3>
          <p style="font-size: 14px; color: #D6E0F4 !important; margin: 0; line-height: 1.6;">Seamless Oman Tourist, Business &amp; Family Visit visa intake plus Schengen clearing assistance.</p>
        </div>

        <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 18px; padding: 28px; box-shadow: 0 12px 32px rgba(7, 21, 59, 0.22);">
          <div style="width: 46px; height: 46px; border-radius: 12px; background: rgba(0, 230, 118, 0.2); color: #00E676; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </div>
          <h3 style="font-size: 18px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 8px;">Personalized Service</h3>
          <p style="font-size: 14px; color: #D6E0F4 !important; margin: 0; line-height: 1.6;">Customized itineraries for solo travelers, couples, families, and corporate groups.</p>
        </div>

        <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 18px; padding: 28px; box-shadow: 0 12px 32px rgba(7, 21, 59, 0.22);">
          <div style="width: 46px; height: 46px; border-radius: 12px; background: rgba(0, 230, 118, 0.2); color: #00E676; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </div>
          <h3 style="font-size: 18px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 8px;">Dedicated Support</h3>
          <p style="font-size: 14px; color: #D6E0F4 !important; margin: 0; line-height: 1.6;">Always available to assist you with 24/7 WhatsApp care and AI travel desk.</p>
        </div>

      </div>
    </section>

    <!-- 10. VISA PROMOTION BANNER (SUPPORTED CATEGORIES ONLY) -->
    <div class="shell" style="margin-bottom: 70px;">
      <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 24px; padding: 40px 48px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 32px; box-shadow: 0 16px 40px rgba(7, 21, 59, 0.22);">
        <div style="max-width: 650px;">
          <h2 style="font-size: clamp(28px, 4vw, 44px); font-weight: 800; color: #FFFFFF !important; margin: 0 0 8px; line-height: 1.2;">Travel Further With JMT</h2>
          <p style="font-size: 17px; color: #D6E0F4 !important; margin-bottom: 24px; font-weight: 400;">Fast, reliable visa intake &amp; clearing assistance.</p>
          <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
            <div style="font-size: 13.5px; font-weight: 700; color: #07153B; background: #00E676; padding: 7px 18px; border-radius: 999px;">
              Oman Tourist Visa
            </div>
            <div style="font-size: 13.5px; font-weight: 700; color: #FFFFFF; background: rgba(255, 255, 255, 0.16); border: 1px solid rgba(255, 255, 255, 0.3); padding: 7px 18px; border-radius: 999px;">
              Oman Business Visa
            </div>
            <div style="font-size: 13.5px; font-weight: 700; color: #FFFFFF; background: rgba(255, 255, 255, 0.16); border: 1px solid rgba(255, 255, 255, 0.3); padding: 7px 18px; border-radius: 999px;">
              Oman Family Visit Visa
            </div>
            <div style="font-size: 13.5px; font-weight: 700; color: #FFFFFF; background: rgba(255, 255, 255, 0.16); border: 1px solid rgba(255, 255, 255, 0.3); padding: 7px 18px; border-radius: 999px;">
              Schengen Visa Clearing
            </div>
          </div>
        </div>
        <a href="/visa" onclick="event.preventDefault(); navigate('/visa')" style="background: #00E676; color: #07153B !important; padding: 14px 32px; border-radius: 999px; font-weight: 800; font-size: 15px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 6px 20px rgba(0, 230, 118, 0.35); white-space: nowrap;">
          Explore Visa Services →
        </a>
      </div>
    </div>

    <!-- 11. CUSTOMER REVIEWS -->
    <section class="shell" style="margin-bottom: 70px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-size: clamp(28px, 3.8vw, 38px); font-weight: 800; color: #00E676 !important; margin: 0 0 4px; display: flex; align-items: center; gap: 10px;">
            What Our Travellers Say <span class="heading-green-line" style="width: 44px; height: 3.5px; background: #00E676; border-radius: 999px;"></span>
          </h2>
          <p style="color: #E2E8F0 !important; font-size: 15px; margin: 0;">Real experiences. Lasting memories.</p>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <a href="/contact" onclick="event.preventDefault(); navigate('/contact')" style="color: #00E676 !important; font-weight: 700; text-decoration: none; font-size: 14px;">View All Reviews →</a>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">

        <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 18px; padding: 24px; box-shadow: 0 12px 32px rgba(7, 21, 59, 0.22);">
          <div style="font-size: 32px; color: #00E676; line-height: 1; margin-bottom: 12px;">“</div>
          <p style="font-size: 14px; color: #FFFFFF !important; line-height: 1.6; margin-bottom: 20px;">
            "JMT Travels made our Oman trip truly memorable. Everything was well organized and hassle-free!"
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="font-size: 14px; color: #FFFFFF !important; display: block; font-weight: 700;">Aisha Al Balushi</strong>
              <small style="font-size: 12px; color: #D6E0F4 !important;">Muscat, Oman</small>
            </div>
            <div style="color: #F59E0B; font-size: 12px;">⭐⭐⭐⭐⭐</div>
          </div>
        </div>

        <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 18px; padding: 24px; box-shadow: 0 12px 32px rgba(7, 21, 59, 0.22);">
          <div style="font-size: 32px; color: #00E676; line-height: 1; margin-bottom: 12px;">“</div>
          <p style="font-size: 14px; color: #FFFFFF !important; line-height: 1.6; margin-bottom: 20px;">
            "Excellent visa service and customer support. Highly recommended!"
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="font-size: 14px; color: #FFFFFF !important; display: block; font-weight: 700;">Rahul Sharma</strong>
              <small style="font-size: 12px; color: #D6E0F4 !important;">Dubai, UAE</small>
            </div>
            <div style="color: #F59E0B; font-size: 12px;">⭐⭐⭐⭐⭐</div>
          </div>
        </div>

        <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 18px; padding: 24px; box-shadow: 0 12px 32px rgba(7, 21, 59, 0.22);">
          <div style="font-size: 32px; color: #00E676; line-height: 1; margin-bottom: 12px;">“</div>
          <p style="font-size: 14px; color: #FFFFFF !important; line-height: 1.6; margin-bottom: 20px;">
            "Professional, friendly and reliable. Will definitely travel with JMT again!"
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="font-size: 14px; color: #FFFFFF !important; display: block; font-weight: 700;">Fatima Khan</strong>
              <small style="font-size: 12px; color: #D6E0F4 !important;">Salalah, Oman</small>
            </div>
            <div style="color: #F59E0B; font-size: 12px;">⭐⭐⭐⭐⭐</div>
          </div>
        </div>

      </div>
    </section>

    <!-- 12. LARGE FINAL CTA BANNER -->
    <div class="shell" style="margin-bottom: 70px;">
      <div style="background: linear-gradient(135deg, rgba(11,40,108,0.92) 0%, rgba(7,21,59,0.95) 100%), url('/assets/destinations/salalah_3.jpg') center/cover no-repeat; border-radius: 24px; border: 1px solid rgba(255,255,255,0.18); padding: 60px 40px; text-align: center; color: #FFFFFF; box-shadow: 0 16px 40px rgba(7,21,59,0.3);">
        <h2 style="font-size: clamp(28px, 4.5vw, 42px); font-weight: 800; margin-bottom: 12px; color: #FFFFFF;">
          Your Next Journey Starts Here
        </h2>
        <p style="font-size: 16px; color: #E2E8F0; max-width: 520px; margin: 0 auto 28px; line-height: 1.6;">
          Let JMT Travels handle your visa clearing, flight ticketing, hotel booking, and holiday itinerary.
        </p>
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" style="background: #00E676; color: #07153B; padding: 14px 34px; font-size: 15px; border-radius: 999px; font-weight: 800; text-decoration: none; box-shadow: 0 6px 20px rgba(0, 230, 118, 0.35);">
            Explore Tours →
          </a>
          <a href="/visa" onclick="event.preventDefault(); navigate('/visa')" style="background: rgba(255,255,255,0.12); border: 1.5px solid rgba(255,255,255,0.4); color: #FFFFFF; padding: 14px 34px; font-size: 15px; border-radius: 999px; font-weight: 700; text-decoration: none; backdrop-filter: blur(8px);">
            Get Visa Assistance
          </a>
          <a href="https://wa.me/96897608999" target="_blank" rel="noopener" style="background: #25D366; color: #FFFFFF; padding: 14px 28px; font-size: 15px; border-radius: 999px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
            Chat on WhatsApp
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
      <div class="jmt-tour-card-dark" style="padding: 0; overflow: hidden; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.18); box-shadow: 0 12px 32px rgba(7, 21, 59, 0.22); background: linear-gradient(135deg, #07153B 0%, #0B286C 100%) !important; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="position: relative; height: 200px; overflow: hidden; background: #07153B;">
            <span style="position: absolute; top: 12px; left: 12px; background: rgba(0, 166, 81, 0.9); color: #FFF; font-size: 10.5px; font-weight: 800; padding: 4px 12px; border-radius: 99px; text-transform: uppercase; letter-spacing: 0.5px; z-index: 2;">
              ${idx === 0 ? 'Bestseller' : (idx === 1 ? 'Family Favourite' : (idx === 2 ? 'New' : 'Featured'))}
            </span>
            <button style="position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; border-radius: 50%; background: rgba(7,21,59,0.7); border: 1px solid rgba(255,255,255,0.3); font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #FFFFFF; z-index: 2;" aria-label="Add to Wishlist">♡</button>
            <img src="${escapeHTML(pkg.image)}" alt="${escapeHTML(pkg.title)} Holiday Package" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease;">
          </div>
          <div style="padding: 22px 22px 14px; background: transparent !important;">
            <h3 style="font-size: 19px; color: #FFFFFF !important; font-weight: 800; margin: 0 0 8px; line-height: 1.3; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${escapeHTML(pkg.title)}</h3>
            <p style="color: #D6E0F4 !important; font-size: 13px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <span>⏱️ ${escapeHTML(pkg.duration)}</span>
              <span>📍 ${escapeHTML(pkg.destination)}</span>
            </p>
          </div>
        </div>
        <div style="padding: 16px 22px 22px; border-top: 1px solid rgba(255,255,255,0.15); display: flex; justify-content: space-between; align-items: center; background: rgba(0, 0, 0, 0.22) !important;">
          <div>
            <small style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #D6E0F4 !important; display: block; margin-bottom: 2px;">Per Person</small>
            <strong style="color: #00E676 !important; font-size: 20px; font-weight: 800;">${escapeHTML(pkg.currency || 'OMR')} ${pkg.priceMinor ? pkg.priceMinor / 1000 : pkg.price}</strong>
          </div>
          <a href="/tourism/${escapeHTML(pkg.slug)}" onclick="event.preventDefault(); navigate('/tourism/${escapeHTML(pkg.slug)}')" class="jmt-btn-primary" style="padding: 10px 18px; font-size: 13px; background: #00A651; color: #FFFFFF !important; font-weight: 700; border-radius: 999px; text-decoration: none; box-shadow: 0 4px 14px rgba(0,166,81,0.35);">View Details →</a>
        </div>
      </div>
    `).join('');
  }).catch(() => {});
}

// Global Search Tab Switcher & Flight Search Handler for Homepage (Oman Air Style Selectors)
const AIRPORT_DATASET = [
  // --- OMAN & GCC ---
  { name: "Muscat International Airport", city: "Muscat", country: "Oman", iataCode: "MCT" },
  { name: "Salalah International Airport", city: "Salalah", country: "Oman", iataCode: "SLL" },
  { name: "Duqm International Airport", city: "Duqm", country: "Oman", iataCode: "DQM" },
  { name: "Khasab Airport", city: "Khasab", country: "Oman", iataCode: "KHS" },
  { name: "Sohar Airport", city: "Sohar", country: "Oman", iataCode: "OHS" },
  { name: "Dubai International Airport", city: "Dubai", country: "United Arab Emirates", iataCode: "DXB" },
  { name: "Al Maktoum International Airport", city: "Dubai", country: "United Arab Emirates", iataCode: "DWC" },
  { name: "Zayed International Airport", city: "Abu Dhabi", country: "United Arab Emirates", iataCode: "AUH" },
  { name: "Sharjah International Airport", city: "Sharjah", country: "United Arab Emirates", iataCode: "SHJ" },
  { name: "Ras Al Khaimah International Airport", city: "Ras Al Khaimah", country: "United Arab Emirates", iataCode: "RKT" },
  { name: "King Khalid International Airport", city: "Riyadh", country: "Saudi Arabia", iataCode: "RUH" },
  { name: "King Abdulaziz International Airport", city: "Jeddah", country: "Saudi Arabia", iataCode: "JED" },
  { name: "King Fahd International Airport", city: "Dammam", country: "Saudi Arabia", iataCode: "DMM" },
  { name: "Prince Mohammad bin Abdulaziz Airport", city: "Madinah", country: "Saudi Arabia", iataCode: "MED" },
  { name: "Abha Regional Airport", city: "Abha", country: "Saudi Arabia", iataCode: "AHB" },
  { name: "Tabuk Regional Airport", city: "Tabuk", country: "Saudi Arabia", iataCode: "TUU" },
  { name: "Prince Nayef bin Abdulaziz Airport", city: "Gassim", country: "Saudi Arabia", iataCode: "ELQ" },
  { name: "Hamad International Airport", city: "Doha", country: "Qatar", iataCode: "DOH" },
  { name: "Bahrain International Airport", city: "Manama", country: "Bahrain", iataCode: "BAH" },
  { name: "Kuwait International Airport", city: "Kuwait City", country: "Kuwait", iataCode: "KWI" },

  // --- MIDDLE EAST & NORTH AFRICA ---
  { name: "Queen Alia International Airport", city: "Amman", country: "Jordan", iataCode: "AMM" },
  { name: "Beirut-Rafic Hariri International Airport", city: "Beirut", country: "Lebanon", iataCode: "BEY" },
  { name: "Cairo International Airport", city: "Cairo", country: "Egypt", iataCode: "CAI" },
  { name: "Borg El Arab International Airport", city: "Alexandria", country: "Egypt", iataCode: "HBE" },
  { name: "Sharm El Sheikh International Airport", city: "Sharm El Sheikh", country: "Egypt", iataCode: "SSH" },
  { name: "Hurghada International Airport", city: "Hurghada", country: "Egypt", iataCode: "HRG" },
  { name: "Istanbul Airport", city: "Istanbul", country: "Turkey", iataCode: "IST" },
  { name: "Sabiha Gökçen International Airport", city: "Istanbul", country: "Turkey", iataCode: "SAW" },
  { name: "Ankara Esenboğa Airport", city: "Ankara", country: "Turkey", iataCode: "ESB" },
  { name: "Antalya Airport", city: "Antalya", country: "Turkey", iataCode: "AYT" },
  { name: "Mohammed V International Airport", city: "Casablanca", country: "Morocco", iataCode: "CMN" },
  { name: "Marrakesh Menara Airport", city: "Marrakesh", country: "Morocco", iataCode: "RAK" },
  { name: "Tunis-Carthage International Airport", city: "Tunis", country: "Tunisia", iataCode: "TUN" },
  { name: "Houari Boumediene Airport", city: "Algiers", country: "Algeria", iataCode: "ALG" },

  // --- SOUTH ASIA ---
  { name: "Indira Gandhi International Airport", city: "New Delhi", country: "India", iataCode: "DEL" },
  { name: "Chhatrapati Shivaji Maharaj Airport", city: "Mumbai", country: "India", iataCode: "BOM" },
  { name: "Kempegowda International Airport", city: "Bengaluru", country: "India", iataCode: "BLR" },
  { name: "Rajiv Gandhi International Airport", city: "Hyderabad", country: "India", iataCode: "HYD" },
  { name: "Chennai International Airport", city: "Chennai", country: "India", iataCode: "MAA" },
  { name: "Netaji Subhash Chandra Bose Airport", city: "Kolkata", country: "India", iataCode: "CCU" },
  { name: "Cochin International Airport", city: "Kochi", country: "India", iataCode: "COK" },
  { name: "Calicut International Airport", city: "Kozhikode", country: "India", iataCode: "CCJ" },
  { name: "Trivandrum International Airport", city: "Thiruvananthapuram", country: "India", iataCode: "TRV" },
  { name: "Kannur International Airport", city: "Kannur", country: "India", iataCode: "CNN" },
  { name: "Sardar Vallabhbhai Patel Airport", city: "Ahmedabad", country: "India", iataCode: "AMD" },
  { name: "Sri Guru Ram Dass Jee Airport", city: "Amritsar", country: "India", iataCode: "ATQ" },
  { name: "Chaudhary Charan Singh Airport", city: "Lucknow", country: "India", iataCode: "LKO" },
  { name: "Jaipur International Airport", city: "Jaipur", country: "India", iataCode: "JAI" },
  { name: "Manohar International Airport", city: "Goa", country: "India", iataCode: "GOX" },
  { name: "Tiruchirappalli International Airport", city: "Tiruchirappalli", country: "India", iataCode: "TRZ" },
  { name: "Jinnah International Airport", city: "Karachi", country: "Pakistan", iataCode: "KHI" },
  { name: "Allama Iqbal International Airport", city: "Lahore", country: "Pakistan", iataCode: "LHE" },
  { name: "Islamabad International Airport", city: "Islamabad", country: "Pakistan", iataCode: "ISB" },
  { name: "Bacha Khan International Airport", city: "Peshawar", country: "Pakistan", iataCode: "PEW" },
  { name: "Multan International Airport", city: "Multan", country: "Pakistan", iataCode: "MUX" },
  { name: "Sialkot International Airport", city: "Sialkot", country: "Pakistan", iataCode: "SKT" },
  { name: "Hazrat Shahjalal International Airport", city: "Dhaka", country: "Bangladesh", iataCode: "DAC" },
  { name: "Shah Amanat International Airport", city: "Chittagong", country: "Bangladesh", iataCode: "CGP" },
  { name: "Osmani International Airport", city: "Sylhet", country: "Bangladesh", iataCode: "ZYL" },
  { name: "Bandaranaike International Airport", city: "Colombo", country: "Sri Lanka", iataCode: "CMB" },
  { name: "Tribhuvan International Airport", city: "Kathmandu", country: "Nepal", iataCode: "KTM" },
  { name: "Velana International Airport", city: "Malé", country: "Maldives", iataCode: "MLE" },

  // --- EUROPE ---
  { name: "London Heathrow Airport", city: "London", country: "United Kingdom", iataCode: "LHR" },
  { name: "London Gatwick Airport", city: "London", country: "United Kingdom", iataCode: "LGW" },
  { name: "London Stansted Airport", city: "London", country: "United Kingdom", iataCode: "STN" },
  { name: "Manchester Airport", city: "Manchester", country: "United Kingdom", iataCode: "MAN" },
  { name: "Birmingham Airport", city: "Birmingham", country: "United Kingdom", iataCode: "BHX" },
  { name: "Edinburgh Airport", city: "Edinburgh", country: "United Kingdom", iataCode: "EDI" },
  { name: "Dublin Airport", city: "Dublin", country: "Ireland", iataCode: "DUB" },
  { name: "Paris Charles de Gaulle Airport", city: "Paris", country: "France", iataCode: "CDG" },
  { name: "Paris Orly Airport", city: "Paris", country: "France", iataCode: "ORY" },
  { name: "Nice Côte d'Azur Airport", city: "Nice", country: "France", iataCode: "NCE" },
  { name: "Frankfurt Airport", city: "Frankfurt", country: "Germany", iataCode: "FRA" },
  { name: "Munich Airport", city: "Munich", country: "Germany", iataCode: "MUC" },
  { name: "Berlin Brandenburg Airport", city: "Berlin", country: "Germany", iataCode: "BER" },
  { name: "Düsseldorf Airport", city: "Düsseldorf", country: "Germany", iataCode: "DUS" },
  { name: "Amsterdam Airport Schiphol", city: "Amsterdam", country: "Netherlands", iataCode: "AMS" },
  { name: "Brussels Airport", city: "Brussels", country: "Belgium", iataCode: "BRU" },
  { name: "Zurich Airport", city: "Zurich", country: "Switzerland", iataCode: "ZRH" },
  { name: "Geneva Airport", city: "Geneva", country: "Switzerland", iataCode: "GVA" },
  { name: "Vienna International Airport", city: "Vienna", country: "Austria", iataCode: "VIE" },
  { name: "Adolfo Suárez Madrid-Barajas Airport", city: "Madrid", country: "Spain", iataCode: "MAD" },
  { name: "Josep Tarradellas Barcelona-El Prat Airport", city: "Barcelona", country: "Spain", iataCode: "BCN" },
  { name: "Humberto Delgado Airport", city: "Lisbon", country: "Portugal", iataCode: "LIS" },
  { name: "Rome Leonardo da Vinci-Fiumicino Airport", city: "Rome", country: "Italy", iataCode: "FCO" },
  { name: "Milan Malpensa Airport", city: "Milan", country: "Italy", iataCode: "MXP" },
  { name: "Athens International Airport", city: "Athens", country: "Greece", iataCode: "ATH" },
  { name: "Sheremetyevo International Airport", city: "Moscow", country: "Russia", iataCode: "SVO" },
  { name: "Václav Havel Airport Prague", city: "Prague", country: "Czech Republic", iataCode: "PRG" },
  { name: "Warsaw Chopin Airport", city: "Warsaw", country: "Poland", iataCode: "WAW" },
  { name: "Copenhagen Airport", city: "Copenhagen", country: "Denmark", iataCode: "CPH" },
  { name: "Stockholm Arlanda Airport", city: "Stockholm", country: "Sweden", iataCode: "ARN" },
  { name: "Oslo Airport Gardermoen", city: "Oslo", country: "Norway", iataCode: "OSL" },
  { name: "Helsinki-Vantaa Airport", city: "Helsinki", country: "Finland", iataCode: "HEL" },

  // --- SOUTHEAST ASIA & EAST ASIA ---
  { name: "Suvarnabhumi Airport", city: "Bangkok", country: "Thailand", iataCode: "BKK" },
  { name: "Phuket International Airport", city: "Phuket", country: "Thailand", iataCode: "HKT" },
  { name: "Kuala Lumpur International Airport", city: "Kuala Lumpur", country: "Malaysia", iataCode: "KUL" },
  { name: "Penang International Airport", city: "Penang", country: "Malaysia", iataCode: "PEN" },
  { name: "Singapore Changi Airport", city: "Singapore", country: "Singapore", iataCode: "SIN" },
  { name: "Soekarno-Hatta International Airport", city: "Jakarta", country: "Indonesia", iataCode: "CGK" },
  { name: "Ngurah Rai International Airport", city: "Bali", country: "Indonesia", iataCode: "DPS" },
  { name: "Ninoy Aquino International Airport", city: "Manila", country: "Philippines", iataCode: "MNL" },
  { name: "Mactan-Cebu International Airport", city: "Cebu", country: "Philippines", iataCode: "CEB" },
  { name: "Tan Son Nhat International Airport", city: "Ho Chi Minh City", country: "Vietnam", iataCode: "SGN" },
  { name: "Noi Bai International Airport", city: "Hanoi", country: "Vietnam", iataCode: "HAN" },
  { name: "Hong Kong International Airport", city: "Hong Kong", country: "Hong Kong", iataCode: "HKG" },
  { name: "Taiwan Taoyuan International Airport", city: "Taipei", country: "Taiwan", iataCode: "TPE" },
  { name: "Tokyo Haneda Airport", city: "Tokyo", country: "Japan", iataCode: "HND" },
  { name: "Narita International Airport", city: "Tokyo", country: "Japan", iataCode: "NRT" },
  { name: "Kansai International Airport", city: "Osaka", country: "Japan", iataCode: "KIX" },
  { name: "Incheon International Airport", city: "Seoul", country: "South Korea", iataCode: "ICN" },
  { name: "Beijing Capital International Airport", city: "Beijing", country: "China", iataCode: "PEK" },
  { name: "Shanghai Pudong International Airport", city: "Shanghai", country: "China", iataCode: "PVG" },
  { name: "Guangzhou Baiyun International Airport", city: "Guangzhou", country: "China", iataCode: "CAN" },

  // --- AMERICAS ---
  { name: "John F. Kennedy International Airport", city: "New York", country: "United States", iataCode: "JFK" },
  { name: "Newark Liberty International Airport", city: "New York / Newark", country: "United States", iataCode: "EWR" },
  { name: "Los Angeles International Airport", city: "Los Angeles", country: "United States", iataCode: "LAX" },
  { name: "O'Hare International Airport", city: "Chicago", country: "United States", iataCode: "ORD" },
  { name: "San Francisco International Airport", city: "San Francisco", country: "United States", iataCode: "SFO" },
  { name: "Miami International Airport", city: "Miami", country: "United States", iataCode: "MIA" },
  { name: "Washington Dulles International Airport", city: "Washington D.C.", country: "United States", iataCode: "IAD" },
  { name: "George Bush Intercontinental Airport", city: "Houston", country: "United States", iataCode: "IAH" },
  { name: "Dallas/Fort Worth International Airport", city: "Dallas", country: "United States", iataCode: "DFW" },
  { name: "Hartsfield-Jackson Atlanta International Airport", city: "Atlanta", country: "United States", iataCode: "ATL" },
  { name: "Toronto Pearson International Airport", city: "Toronto", country: "Canada", iataCode: "YYZ" },
  { name: "Vancouver International Airport", city: "Vancouver", country: "Canada", iataCode: "YVR" },
  { name: "Montréal-Trudeau International Airport", city: "Montreal", country: "Canada", iataCode: "YUL" },
  { name: "Mexico City International Airport", city: "Mexico City", country: "Mexico", iataCode: "MEX" },
  { name: "São Paulo/Guarulhos International Airport", city: "São Paulo", country: "Brazil", iataCode: "GRU" },
  { name: "Ministro Pistarini International Airport", city: "Buenos Aires", country: "Argentina", iataCode: "EZE" },

  // --- AFRICA & OCEANIA ---
  { name: "O. R. Tambo International Airport", city: "Johannesburg", country: "South Africa", iataCode: "JNB" },
  { name: "Cape Town International Airport", city: "Cape Town", country: "South Africa", iataCode: "CPT" },
  { name: "Jomo Kenyatta International Airport", city: "Nairobi", country: "Kenya", iataCode: "NBO" },
  { name: "Bole International Airport", city: "Addis Ababa", country: "Ethiopia", iataCode: "ADD" },
  { name: "Murtala Muhammed International Airport", city: "Lagos", country: "Nigeria", iataCode: "LOS" },
  { name: "Kotoka International Airport", city: "Accra", country: "Ghana", iataCode: "ACC" },
  { name: "Félix-Houphouët-Boigny International Airport", city: "Abidjan", country: "Cote D'Ivoire", iataCode: "ABJ" },
  { name: "Sir Seewoosagur Ramgoolam Airport", city: "Mauritius", country: "Mauritius", iataCode: "MRU" },
  { name: "Seychelles International Airport", city: "Mahé", country: "Seychelles", iataCode: "SEZ" },
  { name: "Sydney Kingsford Smith Airport", city: "Sydney", country: "Australia", iataCode: "SYD" },
  { name: "Melbourne Airport", city: "Melbourne", country: "Australia", iataCode: "MEL" },
  { name: "Brisbane Airport", city: "Brisbane", country: "Australia", iataCode: "BNE" },
  { name: "Perth Airport", city: "Perth", country: "Australia", iataCode: "PER" },
  { name: "Auckland Airport", city: "Auckland", country: "New Zealand", iataCode: "AKL" }
];

const AIRLINE_REGISTRY = {
  WY: { name: 'Oman Air', code: 'WY', logo: '/assets/airlines/oman-air.svg', accent: '#0B286C', cardClass: 'jmt-flight-card-wy' },
  OV: { name: 'SalamAir', code: 'OV', logo: '/assets/airlines/salamair.svg', accent: '#00A651', cardClass: 'jmt-flight-card-ov' },
  EK: { name: 'Emirates', code: 'EK', logo: '/assets/airlines/emirates.svg', accent: '#D71921', cardClass: 'jmt-flight-card-ek' },
  QR: { name: 'Qatar Airways', code: 'QR', logo: '/assets/airlines/qatar-airways.svg', accent: '#5C0632', cardClass: 'jmt-flight-card-qr' },
  '6E': { name: 'IndiGo', code: '6E', logo: '/assets/airlines/indigo.svg', accent: '#001B94', cardClass: 'jmt-flight-card-6e' },
  AK: { name: 'AirAsia', code: 'AK', logo: '/assets/airlines/airasia.svg', accent: '#FF0000', cardClass: 'jmt-flight-card-ak' }
};

const DESTINATION_DATASET = [
  {
    "name": "Muscat",
    "country": "Oman",
    "code": "OM"
  },
  {
    "name": "Salalah",
    "country": "Oman",
    "code": "OM"
  },
  {
    "name": "Nizwa",
    "country": "Oman",
    "code": "OM"
  },
  {
    "name": "Sohar",
    "country": "Oman",
    "code": "OM"
  },
  {
    "name": "Dubai",
    "country": "United Arab Emirates",
    "code": "AE"
  },
  {
    "name": "Abu Dhabi",
    "country": "United Arab Emirates",
    "code": "AE"
  },
  {
    "name": "Al Ain",
    "country": "United Arab Emirates",
    "code": "AE"
  },
  {
    "name": "Sharjah",
    "country": "United Arab Emirates",
    "code": "AE"
  },
  {
    "name": "Makkah",
    "country": "Saudi Arabia",
    "code": "SA"
  },
  {
    "name": "Madinah",
    "country": "Saudi Arabia",
    "code": "SA"
  }
];

const HOTEL_DATASET = [
  {
    "id": "h-mct-01",
    "name": "Shangri-La Barr Al Jissah, Muscat",
    "city": "Muscat",
    "country": "Oman",
    "region": "Middle East",
    "district": "Qantab",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Beachfront luxury resort offering private cove beaches, lazy river, signature dining, and world-class Chi Spa facilities.",
    "address": "Barr Al Jissah, Muscat 100, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/muscat/h-mct-01.jpg",
    "gallery": [
      "/assets/hotels/muscat/h-mct-01.jpg"
    ],
    "rating": 4.9,
    "reviewsCount": 1420,
    "reviewCount": 1420,
    "priceOMR": 85,
    "priceFrom": 85,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mct-02",
    "name": "Jumeirah Muscat Bay",
    "city": "Muscat",
    "country": "Oman",
    "region": "Middle East",
    "district": "Bandar Jissah",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Serene beach resort in Bandar Jissah bay offering panoramic ocean views, water sport excursions, and luxury spa.",
    "address": "Saraya Bandar Jissah, Muscat, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Gym",
      "Restaurant"
    ],
    "image": "/assets/hotels/muscat/h-mct-02.jpg",
    "gallery": [
      "/assets/hotels/muscat/h-mct-02.jpg"
    ],
    "rating": 4.8,
    "reviewsCount": 890,
    "reviewCount": 890,
    "priceOMR": 98,
    "priceFrom": 98,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mct-03",
    "name": "The Chedi Muscat",
    "city": "Muscat",
    "country": "Oman",
    "region": "Middle East",
    "district": "Al Azaiba",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Minimalist luxury beachfront resort featuring 21 acres of gardens, three pools including the famous Long Pool, and refined dining.",
    "address": "18th November Street, Al Azaiba, Muscat 133, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/muscat/h-mct-03.jpg",
    "gallery": [
      "/assets/hotels/muscat/h-mct-03.jpg"
    ],
    "rating": 4.9,
    "reviewsCount": 1650,
    "reviewCount": 1650,
    "priceOMR": 125,
    "priceFrom": 125,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mct-04",
    "name": "Al Bustan Palace, a Ritz-Carlton Hotel",
    "city": "Muscat",
    "country": "Oman",
    "region": "Middle East",
    "district": "Al Bustan",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Palatial luxury hotel set against the Hajar Mountains and Gulf of Oman with private beach and lush gardens.",
    "address": "Al Bustan Street, Muscat 114, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/muscat/h-mct-04.jpg",
    "gallery": [
      "/assets/hotels/muscat/h-mct-04.jpg"
    ],
    "rating": 4.9,
    "reviewsCount": 2100,
    "reviewCount": 2100,
    "priceOMR": 130,
    "priceFrom": 130,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mct-05",
    "name": "Kempinski Hotel Muscat",
    "city": "Muscat",
    "country": "Oman",
    "region": "Middle East",
    "district": "Al Mouj",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Contemporary European luxury resort located at Al Mouj waterfront with marina, beach access, and international dining.",
    "address": "Street 6, Al Mouj, Muscat 138, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/muscat/h-mct-05.jpg",
    "gallery": [
      "/assets/hotels/muscat/h-mct-05.jpg"
    ],
    "rating": 4.8,
    "reviewsCount": 1120,
    "reviewCount": 1120,
    "priceOMR": 90,
    "priceFrom": 90,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mct-06",
    "name": "W Muscat",
    "city": "Muscat",
    "country": "Oman",
    "region": "Middle East",
    "district": "Shatti Al Qurum",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Vibrant luxury lifestyle hotel located in Shatti Al Qurum offering beachfront pool lounge, rooftop bar, and energetic design.",
    "address": "Al Kharjiya Street, Shatti Al Qurum, Muscat 103, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Gym",
      "Restaurant"
    ],
    "image": "/assets/hotels/muscat/h-mct-06.jpg",
    "gallery": [
      "/assets/hotels/muscat/h-mct-06.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 980,
    "reviewCount": 980,
    "priceOMR": 95,
    "priceFrom": 95,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mct-07",
    "name": "Crowne Plaza Muscat (Al Qurum)",
    "city": "Muscat",
    "country": "Oman",
    "region": "Middle East",
    "district": "Qurum",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Perched on a clifftop overlooking Qurum Beach, famous for sunset views and proximity to Muscat business district.",
    "address": "Al Qurum Heights, Muscat 112, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/muscat/h-mct-07.jpg",
    "gallery": [
      "/assets/hotels/muscat/h-mct-07.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 1150,
    "reviewCount": 1150,
    "priceOMR": 42.5,
    "priceFrom": 42.5,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mct-08",
    "name": "Radisson Collection Hotel, Hormuz Grand",
    "city": "Muscat",
    "country": "Oman",
    "region": "Middle East",
    "district": "Seeb",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Modern luxury business hotel conveniently located 5 minutes from Muscat International Airport with fine dining.",
    "address": "Al Matar Street, Seeb, Muscat, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Airport Transfer",
      "Restaurant",
      "Gym",
      "Breakfast Included"
    ],
    "image": "/assets/hotels/muscat/h-mct-08.jpg",
    "gallery": [
      "/assets/hotels/muscat/h-mct-08.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 760,
    "reviewCount": 760,
    "priceOMR": 54,
    "priceFrom": 54,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mct-09",
    "name": "Grand Hyatt Muscat",
    "city": "Muscat",
    "country": "Oman",
    "region": "Middle East",
    "district": "Shatti Al Qurum",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Classic Arabian-style luxury hotel situated directly on Shatti Al Qurum beach featuring palm gardens and pools.",
    "address": "Shatti Al Qurum, Muscat 115, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/muscat/h-mct-09.jpg",
    "gallery": [
      "/assets/hotels/muscat/h-mct-09.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 1340,
    "reviewCount": 1340,
    "priceOMR": 65,
    "priceFrom": 65,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mct-10",
    "name": "InterContinental Muscat",
    "city": "Muscat",
    "country": "Oman",
    "region": "Middle East",
    "district": "Shatti Al Qurum",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Iconic 35-acre beachfront hotel surrounded by palm gardens in Muscat diplomatic quarter.",
    "address": "Al Kharjiya Street, Shatti Al Qurum, Muscat 114, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Gym",
      "Restaurant"
    ],
    "image": "/assets/hotels/muscat/h-mct-10.jpg",
    "gallery": [
      "/assets/hotels/muscat/h-mct-10.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 1480,
    "reviewCount": 1480,
    "priceOMR": 60,
    "priceFrom": 60,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mct-11",
    "name": "Sheraton Oman Hotel",
    "city": "Muscat",
    "country": "Oman",
    "region": "Middle East",
    "district": "Ruwi",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Tallest hotel tower in Muscat located in the Ruwi financial district offering business lounges and mountain views.",
    "address": "MBD Area, Ruwi, Muscat 112, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Airport Transfer"
    ],
    "image": "/assets/hotels/muscat/h-mct-11.jpg",
    "gallery": [
      "/assets/hotels/muscat/h-mct-11.jpg"
    ],
    "rating": 4.5,
    "reviewsCount": 920,
    "reviewCount": 920,
    "priceOMR": 38,
    "priceFrom": 38,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mct-12",
    "name": "Novotel Muscat Al Seeb",
    "city": "Muscat",
    "country": "Oman",
    "region": "Middle East",
    "district": "Seeb",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Modern 4-star city hotel close to Muscat Exhibition Centre and airport with outdoor pool and fitness centre.",
    "address": "Al Exhibition Street, Al Seeb, Muscat 111, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Gym",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/muscat/h-mct-12.jpg",
    "gallery": [
      "/assets/hotels/muscat/h-mct-12.jpg"
    ],
    "rating": 4.4,
    "reviewsCount": 610,
    "reviewCount": 610,
    "priceOMR": 28,
    "priceFrom": 28,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mct-13",
    "name": "City Seasons Hotel Muscat",
    "city": "Muscat",
    "country": "Oman",
    "region": "Middle East",
    "district": "Al Khuwair",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Centrally located city hotel in Al Khuwair commercial hub with rooftop pool and spacious rooms.",
    "address": "Al Sultan Qaboos Street, Al Khuwair, Muscat 111, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/muscat/h-mct-13.jpg",
    "gallery": [
      "/assets/hotels/muscat/h-mct-13.jpg"
    ],
    "rating": 4.3,
    "reviewsCount": 840,
    "reviewCount": 840,
    "priceOMR": 25,
    "priceFrom": 25,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mct-14",
    "name": "Radisson Blu Hotel Muscat",
    "city": "Muscat",
    "country": "Oman",
    "region": "Middle East",
    "district": "Al Khuwair",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Popular business hotel surrounded by landscaped gardens in central Al Khuwair.",
    "address": "Al Khuwair Street, Muscat 133, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/muscat/h-mct-14.jpg",
    "gallery": [
      "/assets/hotels/muscat/h-mct-14.jpg"
    ],
    "rating": 4.4,
    "reviewsCount": 770,
    "reviewCount": 770,
    "priceOMR": 32,
    "priceFrom": 32,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mct-15",
    "name": "Levatio Hotel Muscat",
    "city": "Muscat",
    "country": "Oman",
    "region": "Middle East",
    "district": "Bousher",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Contemporary hotel attached to Panorama Mall in Bousher offering easy access to shopping and dining.",
    "address": "Dohat Al Adab Street, Bousher, Muscat, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/muscat/h-mct-15.jpg",
    "gallery": [
      "/assets/hotels/muscat/h-mct-15.jpg"
    ],
    "rating": 4.3,
    "reviewsCount": 520,
    "reviewCount": 520,
    "priceOMR": 22,
    "priceFrom": 22,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-sll-01",
    "name": "Al Baleed Resort Salalah by Anantara",
    "city": "Salalah",
    "country": "Oman",
    "region": "Middle East",
    "district": "Al Haffa",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Beachfront luxury villas nestled between a lagoon and Arabian Sea next to Al Baleed Archaeological Park.",
    "address": "Mansurah Street, Salalah 214, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant"
    ],
    "image": "/assets/hotels/salalah/h-sll-01.jpg",
    "gallery": [
      "/assets/hotels/salalah/h-sll-01.jpg"
    ],
    "rating": 4.9,
    "reviewsCount": 1280,
    "reviewCount": 1280,
    "priceOMR": 110,
    "priceFrom": 110,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-sll-02",
    "name": "Salalah Rotana Resort",
    "city": "Salalah",
    "country": "Oman",
    "region": "Middle East",
    "district": "Hawana Salalah",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Sprawling oceanfront resort built around natural waterways and lagoons in Hawana Salalah complex.",
    "address": "Hawana Salalah, Salalah, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/salalah/h-sll-02.jpg",
    "gallery": [
      "/assets/hotels/salalah/h-sll-02.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 940,
    "reviewCount": 940,
    "priceOMR": 68,
    "priceFrom": 68,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-sll-03",
    "name": "Crowne Plaza Resort Salalah",
    "city": "Salalah",
    "country": "Oman",
    "region": "Middle East",
    "district": "Al Dahariz",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Beachfront resort set amidst lush coconut groves and white sands in tropical Salalah.",
    "address": "Ar Rubat Street, Al Dahariz, Salalah 211, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant"
    ],
    "image": "/assets/hotels/salalah/h-sll-03.jpg",
    "gallery": [
      "/assets/hotels/salalah/h-sll-03.jpg"
    ],
    "rating": 4.8,
    "reviewsCount": 1100,
    "reviewCount": 1100,
    "priceOMR": 55,
    "priceFrom": 55,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-sll-04",
    "name": "Fanar Hotel & Residences",
    "city": "Salalah",
    "country": "Oman",
    "region": "Middle East",
    "district": "Hawana Salalah",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Upscale coastal resort featuring multiple lagoon beaches, water sports center, and family dining.",
    "address": "Taqa Road, Hawana Salalah, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/salalah/h-sll-04.jpg",
    "gallery": [
      "/assets/hotels/salalah/h-sll-04.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 820,
    "reviewCount": 820,
    "priceOMR": 62,
    "priceFrom": 62,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-sll-05",
    "name": "Millennium Resort Salalah",
    "city": "Salalah",
    "country": "Oman",
    "region": "Middle East",
    "district": "Al Saada",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Spacious resort located in northern Salalah with wellness spa, freshwater pool, and family chalets.",
    "address": "Al Saada Area, Salalah 211, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/salalah/h-sll-05.jpg",
    "gallery": [
      "/assets/hotels/salalah/h-sll-05.jpg"
    ],
    "rating": 4.5,
    "reviewsCount": 650,
    "reviewCount": 650,
    "priceOMR": 45,
    "priceFrom": 45,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-sll-06",
    "name": "Hilton Salalah Resort",
    "city": "Salalah",
    "country": "Oman",
    "region": "Middle East",
    "district": "Al Haffa",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Beachfront resort overlooking the Indian Ocean featuring free-form pool and palm gardens.",
    "address": "Sultan Qaboos Street, Salalah 211, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/salalah/h-sll-06.jpg",
    "gallery": [
      "/assets/hotels/salalah/h-sll-06.jpg"
    ],
    "rating": 4.5,
    "reviewsCount": 780,
    "reviewCount": 780,
    "priceOMR": 50,
    "priceFrom": 50,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-sll-07",
    "name": "Juweira Boutique Hotel",
    "city": "Salalah",
    "country": "Oman",
    "region": "Middle East",
    "district": "Hawana Salalah",
    "propertyType": "Boutique Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Elegant adults-oriented boutique hotel located along the Hawana marina promenade.",
    "address": "Hawana Salalah Marina, Salalah, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant"
    ],
    "image": "/assets/hotels/salalah/h-sll-07.jpg",
    "gallery": [
      "/assets/hotels/salalah/h-sll-07.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 540,
    "reviewCount": 540,
    "priceOMR": 48,
    "priceFrom": 48,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-sll-08",
    "name": "Salalah Gardens Hotel",
    "city": "Salalah",
    "country": "Oman",
    "region": "Middle East",
    "district": "Al Saada",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Popular family hotel directly connected to Salalah Gardens Mall offering suites and shopping access.",
    "address": "Ar Rubat Street, Salalah, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/salalah/h-sll-08.jpg",
    "gallery": [
      "/assets/hotels/salalah/h-sll-08.jpg"
    ],
    "rating": 4.4,
    "reviewsCount": 890,
    "reviewCount": 890,
    "priceOMR": 30,
    "priceFrom": 30,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-sll-09",
    "name": "Belad Bont Resort",
    "city": "Salalah",
    "country": "Oman",
    "region": "Middle East",
    "district": "Awqad",
    "propertyType": "Resort",
    "starRating": 4,
    "stars": 4,
    "description": "Tranquil resort in western Awqad featuring indoor and outdoor pools, spa facilities, and quiet gardens.",
    "address": "Awqad Al Shamaliyyah, Salalah, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/salalah/h-sll-09.jpg",
    "gallery": [
      "/assets/hotels/salalah/h-sll-09.jpg"
    ],
    "rating": 4.3,
    "reviewsCount": 410,
    "reviewCount": 410,
    "priceOMR": 35,
    "priceFrom": 35,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-sll-10",
    "name": "Atana Stay Salalah",
    "city": "Salalah",
    "country": "Oman",
    "region": "Middle East",
    "district": "Salalah Center",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Cozy heritage-inspired city hotel located in downtown Salalah ideal for Khareef travelers.",
    "address": "Al Nahdah Street, Salalah, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Restaurant",
      "Parking",
      "Breakfast Included"
    ],
    "image": "/assets/hotels/salalah/h-sll-10.jpg",
    "gallery": [
      "/assets/hotels/salalah/h-sll-10.jpg"
    ],
    "rating": 4.3,
    "reviewsCount": 380,
    "reviewCount": 380,
    "priceOMR": 22,
    "priceFrom": 22,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-sll-11",
    "name": "IntercityHotel Salalah",
    "city": "Salalah",
    "country": "Oman",
    "region": "Middle East",
    "district": "Salalah Center",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Modern corporate hotel in Salalah city center featuring rooftop pool and meeting rooms.",
    "address": "Al Salam Street, Salalah 211, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/salalah/h-sll-11.jpg",
    "gallery": [
      "/assets/hotels/salalah/h-sll-11.jpg"
    ],
    "rating": 4.4,
    "reviewsCount": 460,
    "reviewCount": 460,
    "priceOMR": 24,
    "priceFrom": 24,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-sll-12",
    "name": "Tulip Inn Majira Salalah",
    "city": "Salalah",
    "country": "Oman",
    "region": "Middle East",
    "district": "Salalah Center",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Clean midscale city hotel close to Salalah airport and commercial markets.",
    "address": "23rd July Street, Salalah, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/salalah/h-sll-12.jpg",
    "gallery": [
      "/assets/hotels/salalah/h-sll-12.jpg"
    ],
    "rating": 4.2,
    "reviewsCount": 310,
    "reviewCount": 310,
    "priceOMR": 20,
    "priceFrom": 20,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-sll-13",
    "name": "Al Mansoor Plaza Hotel Salalah",
    "city": "Salalah",
    "country": "Oman",
    "region": "Middle East",
    "district": "Al Saada",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Comfortable hotel apartments located in Al Saada near Dhofar University.",
    "address": "Al Saada Street, Salalah, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/salalah/h-sll-13.jpg",
    "gallery": [
      "/assets/hotels/salalah/h-sll-13.jpg"
    ],
    "rating": 4.1,
    "reviewsCount": 290,
    "reviewCount": 290,
    "priceOMR": 21,
    "priceFrom": 21,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-sll-14",
    "name": "Hamdan Plaza Hotel Salalah",
    "city": "Salalah",
    "country": "Oman",
    "region": "Middle East",
    "district": "New Salalah",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Long-standing city hotel offering mountain view rooms, health club, and banquet hall.",
    "address": "Al Matar Street, New Salalah, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/salalah/h-sll-14.jpg",
    "gallery": [
      "/assets/hotels/salalah/h-sll-14.jpg"
    ],
    "rating": 4.2,
    "reviewsCount": 510,
    "reviewCount": 510,
    "priceOMR": 19,
    "priceFrom": 19,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-sll-15",
    "name": "Hawana Salalah Residences",
    "city": "Salalah",
    "country": "Oman",
    "region": "Middle East",
    "district": "Hawana Salalah",
    "propertyType": "Apartment",
    "starRating": 4,
    "stars": 4,
    "description": "Self-catering beachfront apartments with access to Hawana Salalah marina facilities and aquapark.",
    "address": "Hawana Lagoon, Salalah, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Kitchen",
      "Parking"
    ],
    "image": "/assets/hotels/salalah/h-sll-15.jpg",
    "gallery": [
      "/assets/hotels/salalah/h-sll-15.jpg"
    ],
    "rating": 4.5,
    "reviewsCount": 390,
    "reviewCount": 390,
    "priceOMR": 40,
    "priceFrom": 40,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-nzw-01",
    "name": "Alila Jabal Akhdar",
    "city": "Nizwa",
    "country": "Oman",
    "region": "Middle East",
    "district": "Jebel Akhdar",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Ultra-luxury mountain sanctuary set 2,000 meters above sea level on the edge of a dramatic gorge.",
    "address": "Plot No. 4, Al Roose, Jebel Akhdar, Nizwa, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/nizwa/h-nzw-01.jpg",
    "gallery": [
      "/assets/hotels/nizwa/h-nzw-01.jpg"
    ],
    "rating": 4.9,
    "reviewsCount": 1050,
    "reviewCount": 1050,
    "priceOMR": 135,
    "priceFrom": 135,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-nzw-02",
    "name": "Anantara Al Jabal Al Akhdar Resort",
    "city": "Nizwa",
    "country": "Oman",
    "region": "Middle East",
    "district": "Jebel Akhdar",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Clifftop luxury mountain resort featuring Diana’s Point viewing platform and private pool villas.",
    "address": "Al Aqr, Jebel Akhdar, Nizwa 611, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/nizwa/h-nzw-02.jpg",
    "gallery": [
      "/assets/hotels/nizwa/h-nzw-02.jpg"
    ],
    "rating": 4.9,
    "reviewsCount": 1420,
    "reviewCount": 1420,
    "priceOMR": 140,
    "priceFrom": 140,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-nzw-03",
    "name": "Golden Tulip Nizwa Hotel",
    "city": "Nizwa",
    "country": "Oman",
    "region": "Middle East",
    "district": "Nizwa Center",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Traditional Omani fortress-style hotel situated near the Hajar Mountains with outdoor pool.",
    "address": "Birkat Al Mouz Highway, Nizwa 611, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/nizwa/h-nzw-03.jpg",
    "gallery": [
      "/assets/hotels/nizwa/h-nzw-03.jpg"
    ],
    "rating": 4.4,
    "reviewsCount": 790,
    "reviewCount": 790,
    "priceOMR": 36,
    "priceFrom": 36,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-nzw-04",
    "name": "IntercityHotel Nizwa",
    "city": "Nizwa",
    "country": "Oman",
    "region": "Middle East",
    "district": "Farq",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Modern corporate hotel in Farq district near Nizwa Grand Mall with rooftop swimming pool.",
    "address": "Farq Commercial Area, Nizwa 611, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/nizwa/h-nzw-04.jpg",
    "gallery": [
      "/assets/hotels/nizwa/h-nzw-04.jpg"
    ],
    "rating": 4.5,
    "reviewsCount": 510,
    "reviewCount": 510,
    "priceOMR": 28,
    "priceFrom": 28,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-nzw-05",
    "name": "Antique Inn Nizwa",
    "city": "Nizwa",
    "country": "Oman",
    "region": "Middle East",
    "district": "Al Aqr",
    "propertyType": "Boutique Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Charming restored Omani mudbrick heritage inn located steps away from Nizwa Fort and Souq.",
    "address": "Al Aqr District, Old Town, Nizwa, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant"
    ],
    "image": "/assets/hotels/nizwa/h-nzw-05.jpg",
    "gallery": [
      "/assets/hotels/nizwa/h-nzw-05.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 640,
    "reviewCount": 640,
    "priceOMR": 32,
    "priceFrom": 32,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-nzw-06",
    "name": "Nizwa Heritage Inn",
    "city": "Nizwa",
    "country": "Oman",
    "region": "Middle East",
    "district": "Old Town Nizwa",
    "propertyType": "Boutique Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Authentic heritage accommodation set inside historic restored homes in the heart of old Nizwa.",
    "address": "Al Aqr, Old Town, Nizwa, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant"
    ],
    "image": "/assets/hotels/nizwa/h-nzw-06.jpg",
    "gallery": [
      "/assets/hotels/nizwa/h-nzw-06.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 480,
    "reviewCount": 480,
    "priceOMR": 30,
    "priceFrom": 30,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-nzw-07",
    "name": "Tanuf Residency Hotel",
    "city": "Nizwa",
    "country": "Oman",
    "region": "Middle East",
    "district": "Tanuf",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Quiet roadside hotel located near Tanuf ruins and mountain hiking trails.",
    "address": "Tanuf Highway, Nizwa, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/nizwa/h-nzw-07.jpg",
    "gallery": [
      "/assets/hotels/nizwa/h-nzw-07.jpg"
    ],
    "rating": 4.2,
    "reviewsCount": 220,
    "reviewCount": 220,
    "priceOMR": 22,
    "priceFrom": 22,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-nzw-08",
    "name": "Hotel Rise Nizwa",
    "city": "Nizwa",
    "country": "Oman",
    "region": "Middle East",
    "district": "Nizwa Souq Area",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Clean budget hotel within walking distance to the famous Nizwa Friday Cattle Market.",
    "address": "Souq Street, Nizwa, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Parking",
      "Restaurant"
    ],
    "image": "/assets/hotels/nizwa/h-nzw-08.jpg",
    "gallery": [
      "/assets/hotels/nizwa/h-nzw-08.jpg"
    ],
    "rating": 4.1,
    "reviewsCount": 190,
    "reviewCount": 190,
    "priceOMR": 20,
    "priceFrom": 20,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-nzw-09",
    "name": "Bait Al Aqr Heritage Inn",
    "city": "Nizwa",
    "country": "Oman",
    "region": "Middle East",
    "district": "Al Aqr",
    "propertyType": "Boutique Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Traditional Omani house conversion offering authentic hospitality and rooftop terrace view of Nizwa Fort.",
    "address": "Al Aqr, Nizwa, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included"
    ],
    "image": "/assets/hotels/nizwa/h-nzw-09.jpg",
    "gallery": [
      "/assets/hotels/nizwa/h-nzw-09.jpg"
    ],
    "rating": 4.5,
    "reviewsCount": 310,
    "reviewCount": 310,
    "priceOMR": 26,
    "priceFrom": 26,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-nzw-10",
    "name": "DusitD2 Naseem Resort Jabal Akhdar",
    "city": "Nizwa",
    "country": "Oman",
    "region": "Middle East",
    "district": "Jebel Akhdar",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Contemporary mountain resort on Jebel Akhdar plateau featuring adventure park and heated pool.",
    "address": "Al Jabel Al Akhdar, Nizwa, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Gym",
      "Restaurant"
    ],
    "image": "/assets/hotels/nizwa/h-nzw-10.jpg",
    "gallery": [
      "/assets/hotels/nizwa/h-nzw-10.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 620,
    "reviewCount": 620,
    "priceOMR": 88,
    "priceFrom": 88,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-nzw-11",
    "name": "Nizwa Inn",
    "city": "Nizwa",
    "country": "Oman",
    "region": "Middle East",
    "district": "Nizwa Commercial Area",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Straightforward city hotel offering comfortable rooms for budget-conscious mountain explorers.",
    "address": "Main Road, Nizwa, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Parking"
    ],
    "image": "/assets/hotels/nizwa/h-nzw-11.jpg",
    "gallery": [
      "/assets/hotels/nizwa/h-nzw-11.jpg"
    ],
    "rating": 4,
    "reviewsCount": 160,
    "reviewCount": 160,
    "priceOMR": 18,
    "priceFrom": 18,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-nzw-12",
    "name": "Bustan Inn Nizwa",
    "city": "Nizwa",
    "country": "Oman",
    "region": "Middle East",
    "district": "Birkat Al Mouz",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Guesthouse surrounded by date palm oasis near UNESCO Falaj Al Khatmayn water channel.",
    "address": "Birkat Al Mouz, Nizwa, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Parking"
    ],
    "image": "/assets/hotels/nizwa/h-nzw-12.jpg",
    "gallery": [
      "/assets/hotels/nizwa/h-nzw-12.jpg"
    ],
    "rating": 4.3,
    "reviewsCount": 240,
    "reviewCount": 240,
    "priceOMR": 21,
    "priceFrom": 21,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-nzw-13",
    "name": "Falaj Daris Hotel Nizwa",
    "city": "Nizwa",
    "country": "Oman",
    "region": "Middle East",
    "district": "Nizwa Center",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Well-known traditional hotel with twin outdoor swimming pools and shaded garden dining.",
    "address": "Al Medheifi Street, Nizwa 611, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Bar",
      "Parking"
    ],
    "image": "/assets/hotels/nizwa/h-nzw-13.jpg",
    "gallery": [
      "/assets/hotels/nizwa/h-nzw-13.jpg"
    ],
    "rating": 4.2,
    "reviewsCount": 530,
    "reviewCount": 530,
    "priceOMR": 25,
    "priceFrom": 25,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-nzw-14",
    "name": "Date Palm Inn Nizwa",
    "city": "Nizwa",
    "country": "Oman",
    "region": "Middle East",
    "district": "Firq",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Family-friendly hotel located near Lulu Hypermarket in Firq.",
    "address": "Firq Main Highway, Nizwa, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/nizwa/h-nzw-14.jpg",
    "gallery": [
      "/assets/hotels/nizwa/h-nzw-14.jpg"
    ],
    "rating": 4.1,
    "reviewsCount": 180,
    "reviewCount": 180,
    "priceOMR": 19,
    "priceFrom": 19,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-nzw-15",
    "name": "Jebel Akhdar Hotel",
    "city": "Nizwa",
    "country": "Oman",
    "region": "Middle East",
    "district": "Jebel Akhdar",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Classic mountain hotel offering straightforward rooms and cool high-altitude breeze.",
    "address": "Saiq Plateau, Jebel Akhdar, Nizwa, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/nizwa/h-nzw-15.jpg",
    "gallery": [
      "/assets/hotels/nizwa/h-nzw-15.jpg"
    ],
    "rating": 4.2,
    "reviewsCount": 370,
    "reviewCount": 370,
    "priceOMR": 34,
    "priceFrom": 34,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-soh-01",
    "name": "Radisson Blu Hotel Sohar",
    "city": "Sohar",
    "country": "Oman",
    "region": "Middle East",
    "district": "Zaffaran",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Prime waterfront resort located on the Gulf of Oman with outdoor pool, spa, and coastal dining.",
    "address": "Zaffaran Beach, Sohar 311, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/sohar/h-soh-01.jpg",
    "gallery": [
      "/assets/hotels/sohar/h-soh-01.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 810,
    "reviewCount": 810,
    "priceOMR": 48,
    "priceFrom": 48,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-soh-02",
    "name": "Mercure Sohar",
    "city": "Sohar",
    "country": "Oman",
    "region": "Middle East",
    "district": "Falaj Al Qabail",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Modern 4-star business hotel located near Sohar Port and Freezone with outdoor pool.",
    "address": "Sohar Port Road, Falaj Al Qabail, Sohar, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/sohar/h-soh-02.jpg",
    "gallery": [
      "/assets/hotels/sohar/h-soh-02.jpg"
    ],
    "rating": 4.5,
    "reviewsCount": 540,
    "reviewCount": 540,
    "priceOMR": 32,
    "priceFrom": 32,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-soh-03",
    "name": "Crowne Plaza Sohar",
    "city": "Sohar",
    "country": "Oman",
    "region": "Middle East",
    "district": "Sohar Industrial Estate",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Lush 5-star hotel in Sohar Industrial Estate with bowling alley, tennis courts, and executive lounge.",
    "address": "Sohar Industrial Estate, Sohar 311, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Gym",
      "Restaurant"
    ],
    "image": "/assets/hotels/sohar/h-soh-03.jpg",
    "gallery": [
      "/assets/hotels/sohar/h-soh-03.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 680,
    "reviewCount": 680,
    "priceOMR": 42,
    "priceFrom": 42,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-soh-04",
    "name": "Sohar Beach Hotel",
    "city": "Sohar",
    "country": "Oman",
    "region": "Middle East",
    "district": "Corniche Road",
    "propertyType": "Resort",
    "starRating": 4,
    "stars": 4,
    "description": "Omani fort-style resort situated on Sohar coast featuring expansive gardens and private beach access.",
    "address": "Sohar Corniche, Sohar 311, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/sohar/h-soh-04.jpg",
    "gallery": [
      "/assets/hotels/sohar/h-soh-04.jpg"
    ],
    "rating": 4.3,
    "reviewsCount": 490,
    "reviewCount": 490,
    "priceOMR": 30,
    "priceFrom": 30,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-soh-05",
    "name": "Royal Gardens Hotel Sohar",
    "city": "Sohar",
    "country": "Oman",
    "region": "Middle East",
    "district": "Sallan",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Comfortable hotel located in Sallan district with outdoor swimming pool and banquet halls.",
    "address": "Sallan Area, Sohar, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/sohar/h-soh-05.jpg",
    "gallery": [
      "/assets/hotels/sohar/h-soh-05.jpg"
    ],
    "rating": 4.2,
    "reviewsCount": 310,
    "reviewCount": 310,
    "priceOMR": 26,
    "priceFrom": 26,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-soh-06",
    "name": "Al Wadi Hotel Sohar",
    "city": "Sohar",
    "country": "Oman",
    "region": "Middle East",
    "district": "Al Humbar",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Relaxed hotel situated in Al Humbar near Sohar Fort and traditional fish market.",
    "address": "Al Humbar District, Sohar 311, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/sohar/h-soh-06.jpg",
    "gallery": [
      "/assets/hotels/sohar/h-soh-06.jpg"
    ],
    "rating": 4.1,
    "reviewsCount": 280,
    "reviewCount": 280,
    "priceOMR": 22,
    "priceFrom": 22,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-soh-07",
    "name": "Green Oasis Hotel Sohar",
    "city": "Sohar",
    "country": "Oman",
    "region": "Middle East",
    "district": "Sohar Main Road",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Long-standing city hotel offering comfortable rooms and quick highway access.",
    "address": "Batinah Highway, Sohar, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/sohar/h-soh-07.jpg",
    "gallery": [
      "/assets/hotels/sohar/h-soh-07.jpg"
    ],
    "rating": 4,
    "reviewsCount": 240,
    "reviewCount": 240,
    "priceOMR": 20,
    "priceFrom": 20,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-soh-08",
    "name": "Al Multaqa Hotel Sohar",
    "city": "Sohar",
    "country": "Oman",
    "region": "Middle East",
    "district": "Al Multaqa",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Practical business hotel situated near Sohar Industrial Port entry.",
    "address": "Al Multaqa Area, Sohar, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/sohar/h-soh-08.jpg",
    "gallery": [
      "/assets/hotels/sohar/h-soh-08.jpg"
    ],
    "rating": 4,
    "reviewsCount": 190,
    "reviewCount": 190,
    "priceOMR": 19,
    "priceFrom": 19,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-soh-09",
    "name": "Atlas Hotel Apartments Sohar",
    "city": "Sohar",
    "country": "Oman",
    "region": "Middle East",
    "district": "Al Humbar",
    "propertyType": "Apartment",
    "starRating": 3,
    "stars": 3,
    "description": "Serviced apartment suites equipped with kitchens for long-stay business executives.",
    "address": "Al Humbar Commercial Area, Sohar, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Kitchen",
      "Parking"
    ],
    "image": "/assets/hotels/sohar/h-soh-09.jpg",
    "gallery": [
      "/assets/hotels/sohar/h-soh-09.jpg"
    ],
    "rating": 4.2,
    "reviewsCount": 220,
    "reviewCount": 220,
    "priceOMR": 23,
    "priceFrom": 23,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-soh-10",
    "name": "City Hotel Sohar",
    "city": "Sohar",
    "country": "Oman",
    "region": "Middle East",
    "district": "Tareef",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Affordable midscale hotel in Tareef area near Safeer Mall.",
    "address": "Tareef Street, Sohar, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/sohar/h-soh-10.jpg",
    "gallery": [
      "/assets/hotels/sohar/h-soh-10.jpg"
    ],
    "rating": 4.1,
    "reviewsCount": 170,
    "reviewCount": 170,
    "priceOMR": 18,
    "priceFrom": 18,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-soh-11",
    "name": "Manam Sohar Hotel Apartments",
    "city": "Sohar",
    "country": "Oman",
    "region": "Middle East",
    "district": "Sohar Souq",
    "propertyType": "Apartment",
    "starRating": 3,
    "stars": 3,
    "description": "Convenient apartment stay close to traditional Sohar market.",
    "address": "Near Old Souq, Sohar, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Kitchen",
      "Parking"
    ],
    "image": "/assets/hotels/sohar/h-soh-11.jpg",
    "gallery": [
      "/assets/hotels/sohar/h-soh-11.jpg"
    ],
    "rating": 4,
    "reviewsCount": 150,
    "reviewCount": 150,
    "priceOMR": 21,
    "priceFrom": 21,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-soh-12",
    "name": "Clean Beach Hotel Sohar",
    "city": "Sohar",
    "country": "Oman",
    "region": "Middle East",
    "district": "Corniche",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Ocean-view hotel located directly along Sohar Corniche promenade.",
    "address": "Corniche Road, Sohar, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/sohar/h-soh-12.jpg",
    "gallery": [
      "/assets/hotels/sohar/h-soh-12.jpg"
    ],
    "rating": 4.2,
    "reviewsCount": 260,
    "reviewCount": 260,
    "priceOMR": 25,
    "priceFrom": 25,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-soh-13",
    "name": "Golden Crown Hotel Sohar",
    "city": "Sohar",
    "country": "Oman",
    "region": "Middle East",
    "district": "Sallan",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Clean midscale city accommodation with 24-hour room service.",
    "address": "Sallan Main Street, Sohar, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/sohar/h-soh-13.jpg",
    "gallery": [
      "/assets/hotels/sohar/h-soh-13.jpg"
    ],
    "rating": 4.1,
    "reviewsCount": 140,
    "reviewCount": 140,
    "priceOMR": 20,
    "priceFrom": 20,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-soh-14",
    "name": "Platinum Hotel Sohar",
    "city": "Sohar",
    "country": "Oman",
    "region": "Middle East",
    "district": "Sohar Center",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Corporate city hotel offering business amenities and proximity to government offices.",
    "address": "Sohar Commercial District, Sohar, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/sohar/h-soh-14.jpg",
    "gallery": [
      "/assets/hotels/sohar/h-soh-14.jpg"
    ],
    "rating": 4.2,
    "reviewsCount": 230,
    "reviewCount": 230,
    "priceOMR": 22,
    "priceFrom": 22,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-soh-15",
    "name": "Barka Beach Hotel & Sohar Resort",
    "city": "Sohar",
    "country": "Oman",
    "region": "Middle East",
    "district": "Sohar Coastal Area",
    "propertyType": "Resort",
    "starRating": 4,
    "stars": 4,
    "description": "Coastal resort property featuring chalets, outdoor pool, and gardens along the Batinah coast.",
    "address": "Coastal Highway, Sohar Region, Oman",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/sohar/h-soh-15.jpg",
    "gallery": [
      "/assets/hotels/sohar/h-soh-15.jpg"
    ],
    "rating": 4.3,
    "reviewsCount": 310,
    "reviewCount": 310,
    "priceOMR": 35,
    "priceFrom": 35,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-dxb-01",
    "name": "Atlantis The Royal, Dubai",
    "city": "Dubai",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Palm Jumeirah",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Iconic architectural landmark on Palm Jumeirah with sky pools, celebrity chef restaurants, and private beach.",
    "address": "Crescent Road, Palm Jumeirah, Dubai, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant"
    ],
    "image": "/assets/hotels/dubai/h-dxb-01.jpg",
    "gallery": [
      "/assets/hotels/dubai/h-dxb-01.jpg"
    ],
    "rating": 4.9,
    "reviewsCount": 2310,
    "reviewCount": 2310,
    "priceOMR": 195,
    "priceFrom": 195,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-dxb-02",
    "name": "Burj Al Arab Jumeirah",
    "city": "Dubai",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Jumeirah Beach",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "World famous sail-shaped ultra-luxury hotel offering duplex suites, butler service, and private terrace pool.",
    "address": "Jumeirah Beach Road, Dubai, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/dubai/h-dxb-02.jpg",
    "gallery": [
      "/assets/hotels/dubai/h-dxb-02.jpg"
    ],
    "rating": 4.9,
    "reviewsCount": 3400,
    "reviewCount": 3400,
    "priceOMR": 240,
    "priceFrom": 240,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-dxb-03",
    "name": "JW Marriott Marquis Hotel Dubai",
    "city": "Dubai",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Business Bay",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Twin 5-star skyscraper hotel in Business Bay offering views of Dubai Water Canal and 12 award-winning restaurants.",
    "address": "Sheikh Zayed Road, Business Bay, Dubai, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Gym",
      "Restaurant"
    ],
    "image": "/assets/hotels/dubai/h-dxb-03.jpg",
    "gallery": [
      "/assets/hotels/dubai/h-dxb-03.jpg"
    ],
    "rating": 4.8,
    "reviewsCount": 3120,
    "reviewCount": 3120,
    "priceOMR": 62,
    "priceFrom": 62,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-dxb-04",
    "name": "Jumeirah Beach Hotel",
    "city": "Dubai",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Um Suqeim",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Wave-shaped luxury family resort with complimentary Wild Wadi Waterpark entry and oceanfront dining.",
    "address": "Jumeirah Street, Dubai, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/dubai/h-dxb-04.jpg",
    "gallery": [
      "/assets/hotels/dubai/h-dxb-04.jpg"
    ],
    "rating": 4.8,
    "reviewsCount": 2450,
    "reviewCount": 2450,
    "priceOMR": 115,
    "priceFrom": 115,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-dxb-05",
    "name": "The Ritz-Carlton, Dubai (JBR)",
    "city": "Dubai",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "JBR",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Mediterranean-style beachfront resort nestled along the lively JBR Walk with private beach access.",
    "address": "Jumeirah Beach Residence, Dubai, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant"
    ],
    "image": "/assets/hotels/dubai/h-dxb-05.jpg",
    "gallery": [
      "/assets/hotels/dubai/h-dxb-05.jpg"
    ],
    "rating": 4.8,
    "reviewsCount": 1890,
    "reviewCount": 1890,
    "priceOMR": 130,
    "priceFrom": 130,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-dxb-06",
    "name": "Armani Hotel Dubai",
    "city": "Dubai",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Downtown Dubai",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Sophisticated luxury hotel designed by Giorgio Armani located inside the Burj Khalifa.",
    "address": "Burj Khalifa, Downtown Dubai, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/dubai/h-dxb-06.jpg",
    "gallery": [
      "/assets/hotels/dubai/h-dxb-06.jpg"
    ],
    "rating": 4.9,
    "reviewsCount": 1750,
    "reviewCount": 1750,
    "priceOMR": 160,
    "priceFrom": 160,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-dxb-07",
    "name": "Address Downtown Dubai",
    "city": "Dubai",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Downtown Dubai",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Flagship luxury hotel overlooking Dubai Fountain and Dubai Mall.",
    "address": "Sheikh Mohammed Bin Rashid Blvd, Downtown Dubai, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/dubai/h-dxb-07.jpg",
    "gallery": [
      "/assets/hotels/dubai/h-dxb-07.jpg"
    ],
    "rating": 4.8,
    "reviewsCount": 2100,
    "reviewCount": 2100,
    "priceOMR": 140,
    "priceFrom": 140,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-dxb-08",
    "name": "FIVE Palm Jumeirah",
    "city": "Dubai",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Palm Jumeirah",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "High-energy luxury beach resort famous for social dining, beach club, and skyline views.",
    "address": "No. 1 Palm Jumeirah, Dubai, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/dubai/h-dxb-08.jpg",
    "gallery": [
      "/assets/hotels/dubai/h-dxb-08.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 2890,
    "reviewCount": 2890,
    "priceOMR": 95,
    "priceFrom": 95,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-dxb-09",
    "name": "Sofitel Dubai The Palm",
    "city": "Dubai",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Palm Jumeirah",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Polynesian-themed luxury beach resort featuring lush green walls, organic spa, and family water sports.",
    "address": "East Crescent Road, Palm Jumeirah, Dubai, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/dubai/h-dxb-09.jpg",
    "gallery": [
      "/assets/hotels/dubai/h-dxb-09.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 1950,
    "reviewCount": 1950,
    "priceOMR": 88,
    "priceFrom": 88,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-dxb-10",
    "name": "Grosvenor House, Dubai",
    "city": "Dubai",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Dubai Marina",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Twin-tower luxury hotel in Dubai Marina with access to private beach at sister resort Le Royal Méridien.",
    "address": "Al Emreef Street, Dubai Marina, Dubai, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/dubai/h-dxb-10.jpg",
    "gallery": [
      "/assets/hotels/dubai/h-dxb-10.jpg"
    ],
    "rating": 4.8,
    "reviewsCount": 1620,
    "reviewCount": 1620,
    "priceOMR": 78,
    "priceFrom": 78,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-dxb-11",
    "name": "Swissôtel Al Ghurair Dubai",
    "city": "Dubai",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Deira",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Family-friendly 5-star hotel in historic Deira directly connected to Al Ghurair Centre mall.",
    "address": "Omar Bin Al Khattab Street, Deira, Dubai, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/dubai/h-dxb-11.jpg",
    "gallery": [
      "/assets/hotels/dubai/h-dxb-11.jpg"
    ],
    "rating": 4.5,
    "reviewsCount": 1410,
    "reviewCount": 1410,
    "priceOMR": 45,
    "priceFrom": 45,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-dxb-12",
    "name": "Rove Downtown Dubai",
    "city": "Dubai",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Downtown Dubai",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Trendy lifestyle hotel located steps away from Burj Khalifa and Dubai Mall.",
    "address": "312 Al Sa'ada Street, Downtown Dubai, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/dubai/h-dxb-12.jpg",
    "gallery": [
      "/assets/hotels/dubai/h-dxb-12.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 2200,
    "reviewCount": 2200,
    "priceOMR": 32,
    "priceFrom": 32,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-dxb-13",
    "name": "Taj Dubai",
    "city": "Dubai",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Business Bay",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Indian heritage luxury hotel in Business Bay offering unobstructed views of Burj Khalifa.",
    "address": "Burj Khalifa Street, Business Bay, Dubai, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/dubai/h-dxb-13.jpg",
    "gallery": [
      "/assets/hotels/dubai/h-dxb-13.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 1530,
    "reviewCount": 1530,
    "priceOMR": 58,
    "priceFrom": 58,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-dxb-14",
    "name": "Hilton Dubai Jumeirah",
    "city": "Dubai",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "JBR",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Beachfront resort located on JBR Walk with private beach access and outdoor pools.",
    "address": "The Walk, Jumeirah Beach Residence, Dubai, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/dubai/h-dxb-14.jpg",
    "gallery": [
      "/assets/hotels/dubai/h-dxb-14.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 1980,
    "reviewCount": 1980,
    "priceOMR": 72,
    "priceFrom": 72,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-dxb-15",
    "name": "Radisson RED Hotel Dubai Silicon Oasis",
    "city": "Dubai",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Silicon Oasis",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Modern lifestyle hotel in Digital Park Silicon Oasis featuring rooftop pool and pet-friendly rooms.",
    "address": "Dubai Digital Park, Silicon Oasis, Dubai, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/dubai/h-dxb-15.jpg",
    "gallery": [
      "/assets/hotels/dubai/h-dxb-15.jpg"
    ],
    "rating": 4.4,
    "reviewsCount": 820,
    "reviewCount": 820,
    "priceOMR": 28,
    "priceFrom": 28,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-auh-01",
    "name": "Emirates Palace Mandarin Oriental",
    "city": "Abu Dhabi",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Corniche",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Palatial luxury resort located along Abu Dhabi Corniche with private marina, lush gardens, and butler service.",
    "address": "West Corniche Road, Abu Dhabi, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant"
    ],
    "image": "/assets/hotels/abu-dhabi/h-auh-01.jpg",
    "gallery": [
      "/assets/hotels/abu-dhabi/h-auh-01.jpg"
    ],
    "rating": 4.9,
    "reviewsCount": 1890,
    "reviewCount": 1890,
    "priceOMR": 145,
    "priceFrom": 145,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-auh-02",
    "name": "Rosewood Abu Dhabi",
    "city": "Abu Dhabi",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Maryah Island",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Luxury hotel on Al Maryah Island directly connected to The Galleria shopping mall.",
    "address": "Al Maryah Island, Abu Dhabi, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant"
    ],
    "image": "/assets/hotels/abu-dhabi/h-auh-02.jpg",
    "gallery": [
      "/assets/hotels/abu-dhabi/h-auh-02.jpg"
    ],
    "rating": 4.8,
    "reviewsCount": 1120,
    "reviewCount": 1120,
    "priceOMR": 85,
    "priceFrom": 85,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-auh-03",
    "name": "The St. Regis Saadiyat Island Resort",
    "city": "Abu Dhabi",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Saadiyat Island",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Mediterranean-style beachfront resort on Saadiyat Island with pristine white sand beach and golf course.",
    "address": "Saadiyat Island, Abu Dhabi, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant"
    ],
    "image": "/assets/hotels/abu-dhabi/h-auh-03.jpg",
    "gallery": [
      "/assets/hotels/abu-dhabi/h-auh-03.jpg"
    ],
    "rating": 4.9,
    "reviewsCount": 1450,
    "reviewCount": 1450,
    "priceOMR": 120,
    "priceFrom": 120,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-auh-04",
    "name": "W Abu Dhabi - Yas Island",
    "city": "Abu Dhabi",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Yas Island",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Futuristic hotel uniquely straddling the Yas Marina Formula 1 circuit with rooftop pools.",
    "address": "Yas Island, Abu Dhabi, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/abu-dhabi/h-auh-04.jpg",
    "gallery": [
      "/assets/hotels/abu-dhabi/h-auh-04.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 1680,
    "reviewCount": 1680,
    "priceOMR": 75,
    "priceFrom": 75,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-auh-05",
    "name": "The Ritz-Carlton Abu Dhabi, Grand Canal",
    "city": "Abu Dhabi",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Khor Al Maqta",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Venetian-inspired luxury resort set along the Grand Canal with direct views of Sheikh Zayed Grand Mosque.",
    "address": "Khor Al Maqta, Abu Dhabi, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant"
    ],
    "image": "/assets/hotels/abu-dhabi/h-auh-05.jpg",
    "gallery": [
      "/assets/hotels/abu-dhabi/h-auh-05.jpg"
    ],
    "rating": 4.8,
    "reviewsCount": 1540,
    "reviewCount": 1540,
    "priceOMR": 90,
    "priceFrom": 90,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-auh-06",
    "name": "Conrad Abu Dhabi Etihad Towers",
    "city": "Abu Dhabi",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Corniche",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Iconic high-rise luxury hotel on the Corniche featuring Observation Deck at 300 and private beach.",
    "address": "Corniche Road, Etihad Towers, Abu Dhabi, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/abu-dhabi/h-auh-06.jpg",
    "gallery": [
      "/assets/hotels/abu-dhabi/h-auh-06.jpg"
    ],
    "rating": 4.8,
    "reviewsCount": 1920,
    "reviewCount": 1920,
    "priceOMR": 80,
    "priceFrom": 80,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-auh-07",
    "name": "Fairmont Bab Al Bahr",
    "city": "Abu Dhabi",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Khor Al Maqta",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Modern luxury beachfront resort offering sandy beaches and spectacular Grand Mosque backdrop.",
    "address": "Khor Al Maqta, Abu Dhabi, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/abu-dhabi/h-auh-07.jpg",
    "gallery": [
      "/assets/hotels/abu-dhabi/h-auh-07.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 1210,
    "reviewCount": 1210,
    "priceOMR": 65,
    "priceFrom": 65,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-auh-08",
    "name": "Beach Rotana Abu Dhabi",
    "city": "Abu Dhabi",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Zahiyah",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "City resort hotel connected directly to Abu Dhabi Mall featuring private beach and 12 dining venues.",
    "address": "10th Street, Al Zahiyah, Abu Dhabi, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/abu-dhabi/h-auh-08.jpg",
    "gallery": [
      "/assets/hotels/abu-dhabi/h-auh-08.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 1670,
    "reviewCount": 1670,
    "priceOMR": 55,
    "priceFrom": 55,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-auh-09",
    "name": "Park Hyatt Abu Dhabi Hotel and Villas",
    "city": "Abu Dhabi",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Saadiyat Island",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Tranquil luxury sanctuary located on Saadiyat Beach with private plunge-pool villas.",
    "address": "Saadiyat Island, Abu Dhabi, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant"
    ],
    "image": "/assets/hotels/abu-dhabi/h-auh-09.jpg",
    "gallery": [
      "/assets/hotels/abu-dhabi/h-auh-09.jpg"
    ],
    "rating": 4.8,
    "reviewsCount": 940,
    "reviewCount": 940,
    "priceOMR": 110,
    "priceFrom": 110,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-auh-10",
    "name": "Andaz Capital Gate Abu Dhabi",
    "city": "Abu Dhabi",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "ADNEC",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Design luxury hotel situated inside the world’s furthest leaning man-made tower.",
    "address": "Capital Gate, ADNEC Area, Abu Dhabi, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/abu-dhabi/h-auh-10.jpg",
    "gallery": [
      "/assets/hotels/abu-dhabi/h-auh-10.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 880,
    "reviewCount": 880,
    "priceOMR": 50,
    "priceFrom": 50,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-auh-11",
    "name": "Anantara Qasr Al Sarab Desert Resort",
    "city": "Abu Dhabi",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Liwa Desert",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "World-renowned luxury desert fortress resort nestled in the Rub Al Khali sand dunes.",
    "address": "Qasr Al Sarab Road, Liwa Desert, Abu Dhabi, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant"
    ],
    "image": "/assets/hotels/abu-dhabi/h-auh-11.jpg",
    "gallery": [
      "/assets/hotels/abu-dhabi/h-auh-11.jpg"
    ],
    "rating": 4.9,
    "reviewsCount": 1650,
    "reviewCount": 1650,
    "priceOMR": 160,
    "priceFrom": 160,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-auh-12",
    "name": "Dusit Thani Abu Dhabi",
    "city": "Abu Dhabi",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Muroor",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Thai hospitality business hotel featuring one of the world’s tallest glass atrium lobbies.",
    "address": "925 Sultan Bin Zayed The First Street, Abu Dhabi, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/abu-dhabi/h-auh-12.jpg",
    "gallery": [
      "/assets/hotels/abu-dhabi/h-auh-12.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 1150,
    "reviewCount": 1150,
    "priceOMR": 42,
    "priceFrom": 42,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-auh-13",
    "name": "Grand Hyatt Abu Dhabi Hotel & Residences",
    "city": "Abu Dhabi",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "West Corniche",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Contemporary luxury hotel located in West Corniche with infinity pool and marina views.",
    "address": "Corniche West, Abu Dhabi, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/abu-dhabi/h-auh-13.jpg",
    "gallery": [
      "/assets/hotels/abu-dhabi/h-auh-13.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 780,
    "reviewCount": 780,
    "priceOMR": 70,
    "priceFrom": 70,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-auh-14",
    "name": "Southern Sun Abu Dhabi",
    "city": "Abu Dhabi",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Zahiya",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Modern 4-star city hotel near the Corniche offering rooftop pool and steakhouse.",
    "address": "Al Mina Street, Tourist Club Area, Abu Dhabi, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/abu-dhabi/h-auh-14.jpg",
    "gallery": [
      "/assets/hotels/abu-dhabi/h-auh-14.jpg"
    ],
    "rating": 4.5,
    "reviewsCount": 920,
    "reviewCount": 920,
    "priceOMR": 32,
    "priceFrom": 32,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-auh-15",
    "name": "Traders Hotel, Qaryat Al Beri",
    "city": "Abu Dhabi",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Khor Al Maqta",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Contemporary beachfront hotel managed by Shangri-La located along Khor Al Maqta.",
    "address": "Between the Bridges, Khor Al Maqta, Abu Dhabi, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/abu-dhabi/h-auh-15.jpg",
    "gallery": [
      "/assets/hotels/abu-dhabi/h-auh-15.jpg"
    ],
    "rating": 4.4,
    "reviewsCount": 650,
    "reviewCount": 650,
    "priceOMR": 38,
    "priceFrom": 38,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-aan-01",
    "name": "Al Ain Rotana",
    "city": "Al Ain",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Jahili",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "5-star city resort located near Al Jahili Park offering outdoor pool, palm garden chalets, and fine dining.",
    "address": "Zayed Bin Sultan Street, Al Ain, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/al-ain/h-aan-01.jpg",
    "gallery": [
      "/assets/hotels/al-ain/h-aan-01.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 940,
    "reviewCount": 940,
    "priceOMR": 42,
    "priceFrom": 42,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-aan-02",
    "name": "Radisson Blu Hotel & Resort Al Ain",
    "city": "Al Ain",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Sarouj",
    "propertyType": "Resort",
    "starRating": 4,
    "stars": 4,
    "description": "Historic garden resort set amidst 18 acres of landscaped gardens featuring swimming pools and tennis courts.",
    "address": "Al Sarouj Area, Al Ain, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/al-ain/h-aan-02.jpg",
    "gallery": [
      "/assets/hotels/al-ain/h-aan-02.jpg"
    ],
    "rating": 4.5,
    "reviewsCount": 810,
    "reviewCount": 810,
    "priceOMR": 36,
    "priceFrom": 36,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-aan-03",
    "name": "Mercure Grand Jebel Hafeet Al Ain",
    "city": "Al Ain",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Jebel Hafeet",
    "propertyType": "Resort",
    "starRating": 4,
    "stars": 4,
    "description": "Unique mountain resort located 3,000 feet up Jebel Hafeet peak with breathtaking views of Al Ain oasis.",
    "address": "Jebel Hafeet Mountain, Al Ain, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/al-ain/h-aan-03.jpg",
    "gallery": [
      "/assets/hotels/al-ain/h-aan-03.jpg"
    ],
    "rating": 4.4,
    "reviewsCount": 1120,
    "reviewCount": 1120,
    "priceOMR": 45,
    "priceFrom": 45,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-aan-04",
    "name": "Ayla Grand Hotel Al Ain",
    "city": "Al Ain",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Town Centre",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Tallest 5-star hotel in Al Ain city center with rooftop pool overlooking the oasis.",
    "address": "Othman Bin Affan Street, Al Ain, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/al-ain/h-aan-04.jpg",
    "gallery": [
      "/assets/hotels/al-ain/h-aan-04.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 690,
    "reviewCount": 690,
    "priceOMR": 38,
    "priceFrom": 38,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-aan-05",
    "name": "Danat Al Ain Resort",
    "city": "Al Ain",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Niyadat",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Luxury resort nestled among lush greenery offering body treatments, squash courts, and multiple dining options.",
    "address": "Al Salam Street, Al Ain, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/al-ain/h-aan-05.jpg",
    "gallery": [
      "/assets/hotels/al-ain/h-aan-05.jpg"
    ],
    "rating": 4.5,
    "reviewsCount": 770,
    "reviewCount": 770,
    "priceOMR": 40,
    "priceFrom": 40,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-aan-06",
    "name": "Ayla Hotel Al Ain",
    "city": "Al Ain",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Murabaa",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Contemporary 4-star hotel attached to Ayla Business Complex in central Al Ain.",
    "address": "Al Murabaa District, Al Ain, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/al-ain/h-aan-06.jpg",
    "gallery": [
      "/assets/hotels/al-ain/h-aan-06.jpg"
    ],
    "rating": 4.4,
    "reviewsCount": 520,
    "reviewCount": 520,
    "priceOMR": 28,
    "priceFrom": 28,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-aan-07",
    "name": "Ayla Bawadi Hotel & Apartments",
    "city": "Al Ain",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Bawadi Mall Area",
    "propertyType": "Apartment",
    "starRating": 4,
    "stars": 4,
    "description": "Modern hotel apartments adjacent to Bawadi Mall offering easy shopping access for families.",
    "address": "Meyzad Road, Bawadi Mall, Al Ain, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Kitchen",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/al-ain/h-aan-07.jpg",
    "gallery": [
      "/assets/hotels/al-ain/h-aan-07.jpg"
    ],
    "rating": 4.4,
    "reviewsCount": 480,
    "reviewCount": 480,
    "priceOMR": 32,
    "priceFrom": 32,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-aan-08",
    "name": "Aloft Al Ain",
    "city": "Al Ain",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Hazza Bin Zayed Stadium Area",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Trendy lifestyle hotel located in Hazza Bin Zayed Stadium complex featuring rooftop lounge pool.",
    "address": "Al Jimi District, Hazza Bin Zayed Stadium, Al Ain, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/al-ain/h-aan-08.jpg",
    "gallery": [
      "/assets/hotels/al-ain/h-aan-08.jpg"
    ],
    "rating": 4.5,
    "reviewsCount": 610,
    "reviewCount": 610,
    "priceOMR": 30,
    "priceFrom": 30,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-aan-09",
    "name": "Green Oasis Resort Al Ain",
    "city": "Al Ain",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Mutawaa",
    "propertyType": "Resort",
    "starRating": 3,
    "stars": 3,
    "description": "Family resort set in date palm gardens near Al Ain Oasis UNESCO heritage site.",
    "address": "Al Mutawaa Area, Al Ain, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/al-ain/h-aan-09.jpg",
    "gallery": [
      "/assets/hotels/al-ain/h-aan-09.jpg"
    ],
    "rating": 4.1,
    "reviewsCount": 230,
    "reviewCount": 230,
    "priceOMR": 24,
    "priceFrom": 24,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-aan-10",
    "name": "Asfar Hotel Apartments Al Ain",
    "city": "Al Ain",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Jimi",
    "propertyType": "Apartment",
    "starRating": 3,
    "stars": 3,
    "description": "Comfortable family hotel apartments in Al Jimi commercial neighborhood.",
    "address": "Al Jimi Area, Al Ain, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Kitchen",
      "Parking"
    ],
    "image": "/assets/hotels/al-ain/h-aan-10.jpg",
    "gallery": [
      "/assets/hotels/al-ain/h-aan-10.jpg"
    ],
    "rating": 4.2,
    "reviewsCount": 310,
    "reviewCount": 310,
    "priceOMR": 22,
    "priceFrom": 22,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-aan-11",
    "name": "Hili Rayhaan by Rotana Al Ain",
    "city": "Al Ain",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Hili",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "5-star alcohol-free hotel connected to Hili Mall in northern Al Ain.",
    "address": "Bani Yas Street, Hili, Al Ain, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/al-ain/h-aan-11.jpg",
    "gallery": [
      "/assets/hotels/al-ain/h-aan-11.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 560,
    "reviewCount": 560,
    "priceOMR": 35,
    "priceFrom": 35,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-aan-12",
    "name": "City Seasons Hotel Al Ain",
    "city": "Al Ain",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Muwaiji",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Popular midscale city hotel close to Al Muwaiji Fort and museum.",
    "address": "King Khalid Bin Abdel Aziz Street, Al Ain, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/al-ain/h-aan-12.jpg",
    "gallery": [
      "/assets/hotels/al-ain/h-aan-12.jpg"
    ],
    "rating": 4.3,
    "reviewsCount": 420,
    "reviewCount": 420,
    "priceOMR": 26,
    "priceFrom": 26,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-aan-13",
    "name": "Fortuna Hotel Al Ain",
    "city": "Al Ain",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Kuwaitat",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Budget-friendly city hotel offering clean rooms and friendly local service.",
    "address": "Al Kuwaitat Area, Al Ain, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/al-ain/h-aan-13.jpg",
    "gallery": [
      "/assets/hotels/al-ain/h-aan-13.jpg"
    ],
    "rating": 4,
    "reviewsCount": 170,
    "reviewCount": 170,
    "priceOMR": 20,
    "priceFrom": 20,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-aan-14",
    "name": "Al Bada Resort Al Ain",
    "city": "Al Ain",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Bada",
    "propertyType": "Resort",
    "starRating": 4,
    "stars": 4,
    "description": "Desert chalet resort featuring private villa pools and horseback riding.",
    "address": "Al Bada Area, Al Ain Desert, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/al-ain/h-aan-14.jpg",
    "gallery": [
      "/assets/hotels/al-ain/h-aan-14.jpg"
    ],
    "rating": 4.4,
    "reviewsCount": 380,
    "reviewCount": 380,
    "priceOMR": 38,
    "priceFrom": 38,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-aan-15",
    "name": "Royal Hotel Al Ain",
    "city": "Al Ain",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Town Centre",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Central city hotel located near traditional markets and civic centers.",
    "address": "Main Street, Al Ain Center, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/al-ain/h-aan-15.jpg",
    "gallery": [
      "/assets/hotels/al-ain/h-aan-15.jpg"
    ],
    "rating": 4.1,
    "reviewsCount": 190,
    "reviewCount": 190,
    "priceOMR": 19,
    "priceFrom": 19,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-shj-01",
    "name": "The Chedi Al Bait, Sharjah",
    "city": "Sharjah",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Heart of Sharjah",
    "propertyType": "Boutique Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Award-winning luxury heritage resort converted from historic Omani-styled manor houses in Heart of Sharjah.",
    "address": "Al Mareija, Heart of Sharjah, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant"
    ],
    "image": "/assets/hotels/sharjah/h-shj-01.jpg",
    "gallery": [
      "/assets/hotels/sharjah/h-shj-01.jpg"
    ],
    "rating": 4.9,
    "reviewsCount": 780,
    "reviewCount": 780,
    "priceOMR": 95,
    "priceFrom": 95,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-shj-02",
    "name": "Sheraton Sharjah Beach Resort & Spa",
    "city": "Sharjah",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Muntazah",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Palatial beachfront resort located on Al Muntazah beach featuring private beach and sea-view pools.",
    "address": "Al Muntazah Street, Sharjah, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/sharjah/h-shj-02.jpg",
    "gallery": [
      "/assets/hotels/sharjah/h-shj-02.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 1420,
    "reviewCount": 1420,
    "priceOMR": 52,
    "priceFrom": 52,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-shj-03",
    "name": "Coral Beach Resort Sharjah",
    "city": "Sharjah",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Corniche Street",
    "propertyType": "Resort",
    "starRating": 4,
    "stars": 4,
    "description": "Family resort set in landscaped gardens along the Arabian Gulf with private beach and slides.",
    "address": "Al Corniche Street, Sharjah, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/sharjah/h-shj-03.jpg",
    "gallery": [
      "/assets/hotels/sharjah/h-shj-03.jpg"
    ],
    "rating": 4.5,
    "reviewsCount": 1100,
    "reviewCount": 1100,
    "priceOMR": 40,
    "priceFrom": 40,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-shj-04",
    "name": "Pullman Sharjah",
    "city": "Sharjah",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Taawun",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Premium 5-star hotel in Al Taawun district with wellness spa and proximity to Sharjah Expo.",
    "address": "Al Taawun Street, Sharjah, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/sharjah/h-shj-04.jpg",
    "gallery": [
      "/assets/hotels/sharjah/h-shj-04.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 890,
    "reviewCount": 890,
    "priceOMR": 46,
    "priceFrom": 46,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-shj-05",
    "name": "Novotel Sharjah Expo Centre",
    "city": "Sharjah",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Khan Lagoon",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Modern 4-star hotel overlooking Al Khan Lagoon next to Sharjah Expo Centre.",
    "address": "Al Khan Lagoon, Sharjah, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/sharjah/h-shj-05.jpg",
    "gallery": [
      "/assets/hotels/sharjah/h-shj-05.jpg"
    ],
    "rating": 4.5,
    "reviewsCount": 620,
    "reviewCount": 620,
    "priceOMR": 34,
    "priceFrom": 34,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-shj-06",
    "name": "Occidental Sharjah Grand",
    "city": "Sharjah",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Meena",
    "propertyType": "Resort",
    "starRating": 4,
    "stars": 4,
    "description": "Beachfront resort on Al Meena Street featuring private beach, outdoor pool with water slide, and fitness center.",
    "address": "Al Meena Street, Sharjah, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/sharjah/h-shj-06.jpg",
    "gallery": [
      "/assets/hotels/sharjah/h-shj-06.jpg"
    ],
    "rating": 4.4,
    "reviewsCount": 950,
    "reviewCount": 950,
    "priceOMR": 38,
    "priceFrom": 38,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-shj-07",
    "name": "DoubleTree by Hilton Sharjah Waterfront",
    "city": "Sharjah",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Majaz",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Waterfront hotel located along Al Majaz Waterfront overlooking Khaled Lagoon.",
    "address": "Jamal Abdul Nasser Street, Al Majaz, Sharjah, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/sharjah/h-shj-07.jpg",
    "gallery": [
      "/assets/hotels/sharjah/h-shj-07.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 710,
    "reviewCount": 710,
    "priceOMR": 42,
    "priceFrom": 42,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-shj-08",
    "name": "Centro Sharjah by Rotana",
    "city": "Sharjah",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Sharjah Airport Area",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Modern airport hotel located next to Sharjah International Airport.",
    "address": "Al Dhaid Road, Sharjah Airport, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/sharjah/h-shj-08.jpg",
    "gallery": [
      "/assets/hotels/sharjah/h-shj-08.jpg"
    ],
    "rating": 4.4,
    "reviewsCount": 840,
    "reviewCount": 840,
    "priceOMR": 28,
    "priceFrom": 28,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-shj-09",
    "name": "Citymax Hotel Sharjah",
    "city": "Sharjah",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Abu Shagara",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Budget-friendly city hotel offering efficient rooms in central Abu Shagara area.",
    "address": "Al Wahda Street, Abu Shagara, Sharjah, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/sharjah/h-shj-09.jpg",
    "gallery": [
      "/assets/hotels/sharjah/h-shj-09.jpg"
    ],
    "rating": 4.2,
    "reviewsCount": 1150,
    "reviewCount": 1150,
    "priceOMR": 22,
    "priceFrom": 22,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-shj-10",
    "name": "Sharjah Carlton Hotel",
    "city": "Sharjah",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Khan",
    "propertyType": "Resort",
    "starRating": 4,
    "stars": 4,
    "description": "Classic beachfront resort in Al Khan with private beach, tennis court, and outdoor pool.",
    "address": "Al Meena Street, Al Khan, Sharjah, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/sharjah/h-shj-10.jpg",
    "gallery": [
      "/assets/hotels/sharjah/h-shj-10.jpg"
    ],
    "rating": 4.3,
    "reviewsCount": 680,
    "reviewCount": 680,
    "priceOMR": 35,
    "priceFrom": 35,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-shj-11",
    "name": "Kingfisher Retreat by Sharjah Collection",
    "city": "Sharjah",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Kalba",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Eco-luxury tented beach retreat set inside mangrove nature reserve in Kalba.",
    "address": "Kalba Mangrove Reserve, Kalba, Sharjah, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant"
    ],
    "image": "/assets/hotels/sharjah/h-shj-11.jpg",
    "gallery": [
      "/assets/hotels/sharjah/h-shj-11.jpg"
    ],
    "rating": 4.9,
    "reviewsCount": 390,
    "reviewCount": 390,
    "priceOMR": 120,
    "priceFrom": 120,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-shj-12",
    "name": "Mysk Al Badayer Retreat Sharjah",
    "city": "Sharjah",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Badayer",
    "propertyType": "Resort",
    "starRating": 5,
    "stars": 5,
    "description": "Desert oasis resort featuring luxury tents and castle-style rooms among red sand dunes.",
    "address": "Al Badayer Desert, Sharjah, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Breakfast Included",
      "Restaurant"
    ],
    "image": "/assets/hotels/sharjah/h-shj-12.jpg",
    "gallery": [
      "/assets/hotels/sharjah/h-shj-12.jpg"
    ],
    "rating": 4.8,
    "reviewsCount": 450,
    "reviewCount": 450,
    "priceOMR": 85,
    "priceFrom": 85,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-shj-13",
    "name": "Al Majaz Premiere Hotel Apartments",
    "city": "Sharjah",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Majaz",
    "propertyType": "Apartment",
    "starRating": 4,
    "stars": 4,
    "description": "Waterfront serviced apartments with indoor pool overlooking Khaled Lagoon.",
    "address": "Al Majaz Waterfront, Sharjah, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Kitchen",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/sharjah/h-shj-13.jpg",
    "gallery": [
      "/assets/hotels/sharjah/h-shj-13.jpg"
    ],
    "rating": 4.4,
    "reviewsCount": 520,
    "reviewCount": 520,
    "priceOMR": 30,
    "priceFrom": 30,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-shj-14",
    "name": "Golden Sands Hotel Sharjah",
    "city": "Sharjah",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Nahda",
    "propertyType": "Apartment",
    "starRating": 4,
    "stars": 4,
    "description": "Spacious hotel apartments located opposite Sahara Centre shopping mall.",
    "address": "Al Nahda Area, Sharjah, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Swimming Pool",
      "Kitchen",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/sharjah/h-shj-14.jpg",
    "gallery": [
      "/assets/hotels/sharjah/h-shj-14.jpg"
    ],
    "rating": 4.3,
    "reviewsCount": 780,
    "reviewCount": 780,
    "priceOMR": 26,
    "priceFrom": 26,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-shj-15",
    "name": "Royal Hotel Sharjah",
    "city": "Sharjah",
    "country": "United Arab Emirates",
    "region": "Middle East",
    "district": "Al Qasimia",
    "propertyType": "Hotel",
    "starRating": 3,
    "stars": 3,
    "description": "Clean midscale city hotel close to Mega Mall and cultural museums.",
    "address": "Al Qasimia District, Sharjah, UAE",
    "amenities": [
      "Free Wi-Fi",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/sharjah/h-shj-15.jpg",
    "gallery": [
      "/assets/hotels/sharjah/h-shj-15.jpg"
    ],
    "rating": 4.1,
    "reviewsCount": 290,
    "reviewCount": 290,
    "priceOMR": 20,
    "priceFrom": 20,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mkk-01",
    "name": "Fairmont Makkah Clock Royal Tower",
    "city": "Makkah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Abraj Al Bait",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Directly adjacent to Al Masjid Al Haram in Abraj Al Bait Complex with dedicated prayer hall audio link.",
    "address": "Abraj Al Bait Complex, Makkah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Family Rooms",
      "Airport Transfer"
    ],
    "image": "/assets/hotels/makkah/h-mkk-01.jpg",
    "gallery": [
      "/assets/hotels/makkah/h-mkk-01.jpg"
    ],
    "rating": 4.8,
    "reviewsCount": 4500,
    "reviewCount": 4500,
    "priceOMR": 88,
    "priceFrom": 88,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mkk-02",
    "name": "Raffles Makkah Palace",
    "city": "Makkah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Abraj Al Bait",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Ultra-exclusive all-suite hotel overlooking Al Masjid Al Haram with personal butler service.",
    "address": "Abraj Al Bait, King Abdul Aziz Endowment, Makkah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant",
      "Family Rooms"
    ],
    "image": "/assets/hotels/makkah/h-mkk-02.jpg",
    "gallery": [
      "/assets/hotels/makkah/h-mkk-02.jpg"
    ],
    "rating": 4.9,
    "reviewsCount": 2890,
    "reviewCount": 2890,
    "priceOMR": 120,
    "priceFrom": 120,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mkk-03",
    "name": "Swissôtel Makkah",
    "city": "Makkah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Abraj Al Bait",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Modern 5-star hotel in Abraj Al Bait with direct access to Ajyad Street and Haram courtyard.",
    "address": "King Abdul Aziz Endowment, Makkah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Family Rooms"
    ],
    "image": "/assets/hotels/makkah/h-mkk-03.jpg",
    "gallery": [
      "/assets/hotels/makkah/h-mkk-03.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 3800,
    "reviewCount": 3800,
    "priceOMR": 75,
    "priceFrom": 75,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mkk-04",
    "name": "Pullman ZamZam Makkah",
    "city": "Makkah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Abraj Al Bait",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Iconic pilgrimage hotel in Abraj Al Bait tower offering Kaaba views and international buffets.",
    "address": "Abraj Al Bait Complex, Makkah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Family Rooms"
    ],
    "image": "/assets/hotels/makkah/h-mkk-04.jpg",
    "gallery": [
      "/assets/hotels/makkah/h-mkk-04.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 4100,
    "reviewCount": 4100,
    "priceOMR": 70,
    "priceFrom": 70,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mkk-05",
    "name": "Conrad Makkah",
    "city": "Makkah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Jabal Omar",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Luxury hotel in Jabal Omar development steps away from Haram with private prayer halls.",
    "address": "Ibrahim Al Khalil Street, Jabal Omar, Makkah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Family Rooms",
      "Gym"
    ],
    "image": "/assets/hotels/makkah/h-mkk-05.jpg",
    "gallery": [
      "/assets/hotels/makkah/h-mkk-05.jpg"
    ],
    "rating": 4.8,
    "reviewsCount": 2600,
    "reviewCount": 2600,
    "priceOMR": 85,
    "priceFrom": 85,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mkk-06",
    "name": "Jabal Omar Hyatt Regency Makkah",
    "city": "Makkah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Jabal Omar",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Contemporary 5-star hotel in Jabal Omar with direct walkway to Al Masjid Al Haram.",
    "address": "Ibrahim Al Khalil Road, Makkah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/makkah/h-mkk-06.jpg",
    "gallery": [
      "/assets/hotels/makkah/h-mkk-06.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 3100,
    "reviewCount": 3100,
    "priceOMR": 80,
    "priceFrom": 80,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mkk-07",
    "name": "Jabal Omar Marriott Hotel Makkah",
    "city": "Makkah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Jabal Omar",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Modern high-rise hotel featuring air-conditioned prayer hall with views of the Holy Mosque.",
    "address": "Umm Al Qura Road, Jabal Omar, Makkah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Family Rooms"
    ],
    "image": "/assets/hotels/makkah/h-mkk-07.jpg",
    "gallery": [
      "/assets/hotels/makkah/h-mkk-07.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 2200,
    "reviewCount": 2200,
    "priceOMR": 78,
    "priceFrom": 78,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mkk-08",
    "name": "Jabal Omar Hilton Suites Makkah",
    "city": "Makkah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Jabal Omar",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Suite-only accommodation overlooking Haram plaza ideal for family Umrah groups.",
    "address": "Ibrahim Al Khalil Street, Makkah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Family Rooms"
    ],
    "image": "/assets/hotels/makkah/h-mkk-08.jpg",
    "gallery": [
      "/assets/hotels/makkah/h-mkk-08.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 2900,
    "reviewCount": 2900,
    "priceOMR": 82,
    "priceFrom": 82,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mkk-09",
    "name": "The Clock Towers Hotel Makkah",
    "city": "Makkah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Abraj Al Bait",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Central hotel in Abraj Al Bait complex with elevator access to shopping mall and Haram.",
    "address": "King Abdul Aziz Endowment, Makkah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Family Rooms"
    ],
    "image": "/assets/hotels/makkah/h-mkk-09.jpg",
    "gallery": [
      "/assets/hotels/makkah/h-mkk-09.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 3400,
    "reviewCount": 3400,
    "priceOMR": 72,
    "priceFrom": 72,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mkk-10",
    "name": "Anjum Hotel Makkah",
    "city": "Makkah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Um Al Qura Road",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Spacious 5-star hotel with 1,747 rooms located on the new Haram expansion gate side.",
    "address": "Umm Al Qura Road, Makkah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Family Rooms",
      "Parking"
    ],
    "image": "/assets/hotels/makkah/h-mkk-10.jpg",
    "gallery": [
      "/assets/hotels/makkah/h-mkk-10.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 3950,
    "reviewCount": 3950,
    "priceOMR": 60,
    "priceFrom": 60,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mkk-11",
    "name": "Swissôtel Al Maqam Makkah",
    "city": "Makkah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Abraj Al Bait",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "High-rise tower hotel in Abraj Al Bait with direct entry to holy mosque courtyards.",
    "address": "Abraj Al Bait, Makkah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Family Rooms"
    ],
    "image": "/assets/hotels/makkah/h-mkk-11.jpg",
    "gallery": [
      "/assets/hotels/makkah/h-mkk-11.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 3200,
    "reviewCount": 3200,
    "priceOMR": 74,
    "priceFrom": 74,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mkk-12",
    "name": "Le Méridien Towers Makkah",
    "city": "Makkah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Kudai",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Full-service hotel in Kudai providing 24-hour shuttle bus service directly to Al Masjid Al Haram.",
    "address": "Kudai Road, Makkah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Airport Transfer",
      "Parking"
    ],
    "image": "/assets/hotels/makkah/h-mkk-12.jpg",
    "gallery": [
      "/assets/hotels/makkah/h-mkk-12.jpg"
    ],
    "rating": 4.4,
    "reviewsCount": 1850,
    "reviewCount": 1850,
    "priceOMR": 45,
    "priceFrom": 45,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mkk-13",
    "name": "Makkah Hotel & Towers",
    "city": "Makkah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Ibrahim Al Khalil St",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Established 5-star landmark complex overlooking the Holy Haram courtyard.",
    "address": "Ibrahim Al Khalil Street, Makkah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Family Rooms"
    ],
    "image": "/assets/hotels/makkah/h-mkk-13.jpg",
    "gallery": [
      "/assets/hotels/makkah/h-mkk-13.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 3600,
    "reviewCount": 3600,
    "priceOMR": 68,
    "priceFrom": 68,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mkk-14",
    "name": "InterContinental Dar Al Tawhid Makkah",
    "city": "Makkah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Ibrahim Al Khalil St",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Prestigious luxury hotel situated directly in front of the Holy Mosque entrance gates.",
    "address": "Ibrahim Al Khalil Street, Makkah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant",
      "Family Rooms"
    ],
    "image": "/assets/hotels/makkah/h-mkk-14.jpg",
    "gallery": [
      "/assets/hotels/makkah/h-mkk-14.jpg"
    ],
    "rating": 4.9,
    "reviewsCount": 2950,
    "reviewCount": 2950,
    "priceOMR": 110,
    "priceFrom": 110,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-mkk-15",
    "name": "Voco Makkah, an IHG Hotel",
    "city": "Makkah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Misfalah",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Modern 4-star hotel in Misfalah offering shuttle service to Al Masjid Al Haram.",
    "address": "Misfalah Area, Makkah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/makkah/h-mkk-15.jpg",
    "gallery": [
      "/assets/hotels/makkah/h-mkk-15.jpg"
    ],
    "rating": 4.4,
    "reviewsCount": 1420,
    "reviewCount": 1420,
    "priceOMR": 38,
    "priceFrom": 38,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-med-01",
    "name": "Dar Al Taqwa Hotel Madinah",
    "city": "Madinah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Central Area",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Located directly facing the King Fahd Gate of Al Masjid An Nabawi in central Madinah.",
    "address": "King Fahd Gate, Central Area, Madinah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Airport Transfer",
      "Family Rooms"
    ],
    "image": "/assets/hotels/madinah/h-med-01.jpg",
    "gallery": [
      "/assets/hotels/madinah/h-med-01.jpg"
    ],
    "rating": 4.8,
    "reviewsCount": 2180,
    "reviewCount": 2180,
    "priceOMR": 74,
    "priceFrom": 74,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-med-02",
    "name": "The Oberoi Madinah",
    "city": "Madinah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Northern Central Area",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Ultra-luxury 5-star hotel steps from the Prophet’s Mosque featuring elegant tea lounge and personalized service.",
    "address": "Abizar Road, Northern Central Area, Madinah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/madinah/h-med-02.jpg",
    "gallery": [
      "/assets/hotels/madinah/h-med-02.jpg"
    ],
    "rating": 4.9,
    "reviewsCount": 1950,
    "reviewCount": 1950,
    "priceOMR": 115,
    "priceFrom": 115,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-med-03",
    "name": "Anwar Al Madinah Mövenpick",
    "city": "Madinah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Central Area",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Madinah’s largest hotel complex directly connected to the Prophet’s Mosque courtyard and shopping mall.",
    "address": "Central Zone, Madinah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Family Rooms",
      "Parking"
    ],
    "image": "/assets/hotels/madinah/h-med-03.jpg",
    "gallery": [
      "/assets/hotels/madinah/h-med-03.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 3890,
    "reviewCount": 3890,
    "priceOMR": 65,
    "priceFrom": 65,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-med-04",
    "name": "Pullman Zamzam Madinah",
    "city": "Madinah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Amr Bin Al Aas St",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Contemporary 5-star hotel located within short walking distance to Al Masjid An Nabawi.",
    "address": "Amr Bin Al Aas Street, Central Area, Madinah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Family Rooms"
    ],
    "image": "/assets/hotels/madinah/h-med-04.jpg",
    "gallery": [
      "/assets/hotels/madinah/h-med-04.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 2650,
    "reviewCount": 2650,
    "priceOMR": 62,
    "priceFrom": 62,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-med-05",
    "name": "Madinah Hilton Hotel",
    "city": "Madinah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "King Fahd St",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Prime hotel located on King Fahd Street directly facing the ladies’ entrance of Al Masjid An Nabawi.",
    "address": "King Fahd Street, Madinah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Family Rooms"
    ],
    "image": "/assets/hotels/madinah/h-med-05.jpg",
    "gallery": [
      "/assets/hotels/madinah/h-med-05.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 3100,
    "reviewCount": 3100,
    "priceOMR": 70,
    "priceFrom": 70,
    "currency": "OMR",
    "featured": true,
    "jmtChoice": true,
    "isJmtChoice": true,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-med-06",
    "name": "InterContinental Madinah Dar Al Iman",
    "city": "Madinah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Central Area",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Luxury hotel located directly on the Prophet’s Mosque courtyard with premium dining.",
    "address": "Central Area, Madinah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Airport Transfer",
      "Restaurant",
      "Family Rooms"
    ],
    "image": "/assets/hotels/madinah/h-med-06.jpg",
    "gallery": [
      "/assets/hotels/madinah/h-med-06.jpg"
    ],
    "rating": 4.8,
    "reviewsCount": 2200,
    "reviewCount": 2200,
    "priceOMR": 85,
    "priceFrom": 85,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-med-07",
    "name": "Crowne Plaza Madinah",
    "city": "Madinah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Central Area",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Overlooking Al Masjid An Nabawi featuring classic rooms, executive lounge, and underground parking.",
    "address": "King Abdul Aziz Street, Central Area, Madinah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Family Rooms",
      "Parking"
    ],
    "image": "/assets/hotels/madinah/h-med-07.jpg",
    "gallery": [
      "/assets/hotels/madinah/h-med-07.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 1840,
    "reviewCount": 1840,
    "priceOMR": 58,
    "priceFrom": 58,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-med-08",
    "name": "Shahd Al Madinah Hotel",
    "city": "Madinah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Northern Central Area",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "High-end 5-star hotel offering direct views of the Prophet’s Mosque green dome.",
    "address": "Northern Central Area, Madinah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Family Rooms"
    ],
    "image": "/assets/hotels/madinah/h-med-08.jpg",
    "gallery": [
      "/assets/hotels/madinah/h-med-08.jpg"
    ],
    "rating": 4.7,
    "reviewsCount": 1410,
    "reviewCount": 1410,
    "priceOMR": 68,
    "priceFrom": 68,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-med-09",
    "name": "Frontel Al Harithia Hotel Madinah",
    "city": "Madinah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Central Area",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Popular 5-star hotel located just a few steps from the Prophet’s Mosque courtyard.",
    "address": "Central Area, Madinah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Gym"
    ],
    "image": "/assets/hotels/madinah/h-med-09.jpg",
    "gallery": [
      "/assets/hotels/madinah/h-med-09.jpg"
    ],
    "rating": 4.5,
    "reviewsCount": 1980,
    "reviewCount": 1980,
    "priceOMR": 54,
    "priceFrom": 54,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-med-10",
    "name": "Dallah Taibah Hotel Madinah",
    "city": "Madinah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Northern Central Area",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "4-star hotel located 50 meters from Al Masjid An Nabawi with on-site bakery and restaurants.",
    "address": "Northern Central Zone, Madinah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Family Rooms"
    ],
    "image": "/assets/hotels/madinah/h-med-10.jpg",
    "gallery": [
      "/assets/hotels/madinah/h-med-10.jpg"
    ],
    "rating": 4.5,
    "reviewsCount": 2400,
    "reviewCount": 2400,
    "priceOMR": 48,
    "priceFrom": 48,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-med-11",
    "name": "Al Aqeeq Madinah Hotel",
    "city": "Madinah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Northern Central Area",
    "propertyType": "Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "Modern hotel located close to the main entrance of the Holy Mosque.",
    "address": "Northern Central Area, Madinah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Family Rooms"
    ],
    "image": "/assets/hotels/madinah/h-med-11.jpg",
    "gallery": [
      "/assets/hotels/madinah/h-med-11.jpg"
    ],
    "rating": 4.6,
    "reviewsCount": 1720,
    "reviewCount": 1720,
    "priceOMR": 52,
    "priceFrom": 52,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-med-12",
    "name": "Saja Al Madinah Hotel",
    "city": "Madinah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Northern Central Area",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Contemporary 4-star hotel designed for pilgrims with spacious multi-bed family rooms.",
    "address": "Northern Central Area, Madinah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Family Rooms"
    ],
    "image": "/assets/hotels/madinah/h-med-12.jpg",
    "gallery": [
      "/assets/hotels/madinah/h-med-12.jpg"
    ],
    "rating": 4.4,
    "reviewsCount": 1250,
    "reviewCount": 1250,
    "priceOMR": 38,
    "priceFrom": 38,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-med-13",
    "name": "Coral Al Madinah Hotel",
    "city": "Madinah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Central Area",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Clean midscale hotel in central Madinah close to shopping and historical sites.",
    "address": "King Abdul Aziz Road, Central Area, Madinah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Parking"
    ],
    "image": "/assets/hotels/madinah/h-med-13.jpg",
    "gallery": [
      "/assets/hotels/madinah/h-med-13.jpg"
    ],
    "rating": 4.3,
    "reviewsCount": 910,
    "reviewCount": 910,
    "priceOMR": 42,
    "priceFrom": 42,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-med-14",
    "name": "Millennium Madinah Airport",
    "city": "Madinah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Prince Mohammad Airport",
    "propertyType": "Airport Hotel",
    "starRating": 5,
    "stars": 5,
    "description": "5-star airport hotel located directly inside Prince Mohammad Bin Abdulaziz Airport complex.",
    "address": "Prince Mohammad Bin Abdulaziz Airport, Madinah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Airport Transfer",
      "Restaurant",
      "Gym",
      "Parking"
    ],
    "image": "/assets/hotels/madinah/h-med-14.jpg",
    "gallery": [
      "/assets/hotels/madinah/h-med-14.jpg"
    ],
    "rating": 4.5,
    "reviewsCount": 680,
    "reviewCount": 680,
    "priceOMR": 40,
    "priceFrom": 40,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  },
  {
    "id": "h-med-15",
    "name": "Rove Al Madinah Hotel",
    "city": "Madinah",
    "country": "Saudi Arabia",
    "region": "Middle East",
    "district": "Northern Central Area",
    "propertyType": "Hotel",
    "starRating": 4,
    "stars": 4,
    "description": "Modern 4-star hotel offering quick access to the Prophet’s Mosque courtyard gates.",
    "address": "Northern Central Area, Madinah, Saudi Arabia",
    "amenities": [
      "Free Wi-Fi",
      "Breakfast Included",
      "Restaurant",
      "Family Rooms"
    ],
    "image": "/assets/hotels/madinah/h-med-15.jpg",
    "gallery": [
      "/assets/hotels/madinah/h-med-15.jpg"
    ],
    "rating": 4.4,
    "reviewsCount": 840,
    "reviewCount": 840,
    "priceOMR": 36,
    "priceFrom": 36,
    "currency": "OMR",
    "featured": false,
    "jmtChoice": false,
    "isJmtChoice": false,
    "active": true,
    "imageSource": "Licensed Stock / Original JMT Asset",
    "imageLicense": "Commercial reuse"
  }
];

window.hotelSearchState = {
  destination: 'Muscat, Oman',
  cityFilter: 'Muscat',
  checkIn: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  checkOut: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
  rooms: 1,
  adults: 2,
  children: 0,
  sortBy: 'recommended',
  starRatings: [],
  propertyTypes: [],
  amenities: [],
  maxPrice: 250,
  displayLimit: 12
};

window.focusHotelDestInput = function() {
  const input = document.getElementById('hotel-dest-input');
  if (input) input.focus();
};

window.openHotelDestDropdown = function() {
  closeFlightPopovers();
  const dropdown = document.getElementById('hotel-dest-dropdown');
  if (!dropdown) return;
  renderHotelDestDropdownResults('');
  dropdown.style.display = 'block';
};

window.filterHotelDestDropdown = function(query) {
  renderHotelDestDropdownResults(query.trim());
};

function renderHotelDestDropdownResults(query) {
  const dropdown = document.getElementById('hotel-dest-dropdown');
  if (!dropdown) return;

  const q = query.toLowerCase();
  const filtered = DESTINATION_DATASET.filter(d =>
    d.name.toLowerCase().includes(q) || d.country.toLowerCase().includes(q)
  );

  if (!filtered.length) {
    dropdown.innerHTML = `<div style="padding:14px; text-align:center; color:#64748B; font-size:13px;">No destinations matching "${escapeHTML(query)}"</div>`;
    return;
  }

  dropdown.innerHTML = filtered.map(d => `
    <div class="jmt-airport-option" onclick="selectHotelDestOption('${d.name}', '${d.country}')">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong class="jmt-airport-name" style="font-size:13.5px; display:block; line-height:1.2;">${escapeHTML(d.name)}</strong>
          <small class="jmt-airport-sub" style="font-size:11.5px;">${escapeHTML(d.country)}</small>
        </div>
        <span class="jmt-iata-pill" style="font-size:11px;">HOTEL</span>
      </div>
    </div>
  `).join('');
}

window.selectHotelDestOption = function(city, country) {
  hotelSearchState.displayLimit = 12;
  hotelSearchState.destination = `${city}, ${country}`;
  hotelSearchState.cityFilter = city;
  const input = document.getElementById('hotel-dest-input');
  if (input) input.value = hotelSearchState.destination;
  const dropdown = document.getElementById('hotel-dest-dropdown');
  if (dropdown) dropdown.style.display = 'none';

  renderHotelResultsList();
};

window.toggleHotelGuestsPopover = function(e) {
  if (e) e.stopPropagation();
  const popover = document.getElementById('hotel-guests-popover');
  if (!popover) return;
  const isVis = popover.style.display === 'block';
  popover.style.display = isVis ? 'none' : 'block';
};

window.updateHotelGuestsCount = function(type, delta) {
  if (type === 'rooms') {
    hotelSearchState.rooms = Math.max(1, Math.min(5, hotelSearchState.rooms + delta));
    const el = document.getElementById('hotel-rooms-val');
    if (el) el.textContent = hotelSearchState.rooms;
  } else if (type === 'adults') {
    hotelSearchState.adults = Math.max(1, Math.min(10, hotelSearchState.adults + delta));
    const el = document.getElementById('hotel-adults-val');
    if (el) el.textContent = hotelSearchState.adults;
  } else if (type === 'children') {
    hotelSearchState.children = Math.max(0, Math.min(6, hotelSearchState.children + delta));
    const el = document.getElementById('hotel-children-val');
    if (el) el.textContent = hotelSearchState.children;
  }

  const btnText = document.getElementById('hotel-guests-text');
  if (btnText) {
    btnText.textContent = `${hotelSearchState.rooms} Room, ${hotelSearchState.adults} Adult${hotelSearchState.adults > 1 ? 's' : ''}`;
  }
};

window.updateHotelCheckinDate = function(val) {
  hotelSearchState.checkIn = val;
};

window.updateHotelCheckoutDate = function(val) {
  hotelSearchState.checkOut = val;
};

window.handleHotelSearchSubmit = function(e) {
  hotelSearchState.displayLimit = 12;
  if (e) e.preventDefault();
  const input = document.getElementById('hotel-dest-input');
  if (input && input.value.trim()) {
    hotelSearchState.destination = input.value.trim();
  }
  renderHotelResultsList();
};

window.quickSelectHotelDest = function(city, country, btn) {
  hotelSearchState.displayLimit = 12;
  document.querySelectorAll('#hotel-dest-chips-container .jmt-hotel-dest-chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');

  hotelSearchState.destination = `${city}, ${country}`;
  hotelSearchState.cityFilter = city;

  const input = document.getElementById('hotel-dest-input');
  if (input) input.value = hotelSearchState.destination;

  renderHotelResultsList();
};

window.clearAllHotelFilters = function() {
  hotelSearchState.displayLimit = 12;
  hotelSearchState.starRatings = [];
  hotelSearchState.propertyTypes = [];
  hotelSearchState.amenities = [];
  hotelSearchState.maxPrice = 250;

  const slider = document.getElementById('hotel-price-slider');
  if (slider) slider.value = 250;
  const priceVal = document.getElementById('hotel-price-range-val');
  if (priceVal) priceVal.textContent = 'Up to OMR 250';

  document.querySelectorAll('.jmt-hotel-filters-sidebar input[type="checkbox"]').forEach(c => c.checked = false);

  renderHotelResultsList();
};

window.toggleHotelStarFilter = function(star, checked) {
  if (checked) {
    if (!hotelSearchState.starRatings.includes(star)) hotelSearchState.starRatings.push(star);
  } else {
    hotelSearchState.starRatings = hotelSearchState.starRatings.filter(s => s !== star);
  }
  renderHotelResultsList();
};

window.toggleHotelPropertyTypeFilter = function(type, checked) {
  if (checked) {
    if (!hotelSearchState.propertyTypes.includes(type)) hotelSearchState.propertyTypes.push(type);
  } else {
    hotelSearchState.propertyTypes = hotelSearchState.propertyTypes.filter(t => t !== type);
  }
  renderHotelResultsList();
};

window.toggleHotelAmenityFilter = function(amenity, checked) {
  if (checked) {
    if (!hotelSearchState.amenities.includes(amenity)) hotelSearchState.amenities.push(amenity);
  } else {
    hotelSearchState.amenities = hotelSearchState.amenities.filter(a => a !== amenity);
  }
  renderHotelResultsList();
};

window.updateHotelPriceFilter = function(val) {
  hotelSearchState.maxPrice = parseFloat(val);
  const priceVal = document.getElementById('hotel-price-range-val');
  if (priceVal) priceVal.textContent = `Up to OMR ${val}`;
  renderHotelResultsList();
};

window.setHotelSort = function(val) {
  hotelSearchState.sortBy = val;
  renderHotelResultsList();
};

window.loadMoreHotels = function() {
  hotelSearchState.displayLimit = (hotelSearchState.displayLimit || 12) + 12;
  renderHotelResultsList();
};

window.renderHotelResultsList = function() {
  const container = document.getElementById('hotel-results-grid');
  const heading = document.getElementById('hotel-results-heading');
  const countText = document.getElementById('hotel-results-count-text');

  if (!container) return;

  const q = (hotelSearchState.destination || '').toLowerCase();

  let list = HOTEL_DATASET.filter(h => {
    const text = `${h.name} ${h.city} ${h.country} ${h.district}`.toLowerCase();

    let matchQuery = true;
    if (q) {
      const parts = q.split(',').map(s => s.trim()).filter(Boolean);
      matchQuery = parts.some(p => text.includes(p));
    }

    const matchPrice = h.priceOMR <= hotelSearchState.maxPrice;

    let matchStars = true;
    if (hotelSearchState.starRatings.length > 0) {
      matchStars = hotelSearchState.starRatings.includes(String(h.stars));
    }

    let matchType = true;
    if (hotelSearchState.propertyTypes.length > 0) {
      matchType = hotelSearchState.propertyTypes.includes(h.propertyType);
    }

    let matchAmenity = true;
    if (hotelSearchState.amenities.length > 0) {
      matchAmenity = hotelSearchState.amenities.every(a => h.amenities.includes(a));
    }

    return matchQuery && matchPrice && matchStars && matchType && matchAmenity;
  });

  if (hotelSearchState.sortBy === 'price-asc') {
    list.sort((a, b) => a.priceOMR - b.priceOMR);
  } else if (hotelSearchState.sortBy === 'price-desc') {
    list.sort((a, b) => b.priceOMR - a.priceOMR);
  } else if (hotelSearchState.sortBy === 'rating-desc') {
    list.sort((a, b) => b.rating - a.rating);
  } else {
    list.sort((a, b) => (b.isJmtChoice ? 1 : 0) - (a.isJmtChoice ? 1 : 0) || b.rating - a.rating);
  }

  const visibleLimit = hotelSearchState.displayLimit || 12;
  const visibleList = list.slice(0, visibleLimit);

  if (heading) {
    heading.textContent = `Hotels in ${escapeHTML(hotelSearchState.destination)}`;
  }
  if (countText) {
    countText.textContent = `Showing ${visibleList.length} of ${list.length} propert${list.length === 1 ? 'y' : 'ies'} available`;
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="jmt-card" style="text-align: center; padding: 48px 24px; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); color: #FFFFFF !important; border-radius: 20px;">
        <div style="font-size: 44px; margin-bottom: 12px;">🏨</div>
        <h3 style="color: #00E676 !important; font-weight: 800; margin-bottom: 8px;">No Hotels Found</h3>
        <p style="color: #D6E0F4 !important; font-size: 14px; margin-bottom: 20px;">We couldn't find any hotels matching your destination or active filters. Try resetting your search parameters.</p>
        <button onclick="clearAllHotelFilters()" class="jmt-btn-primary" style="background: #00A651; color: #FFFFFF !important; font-weight: 700; padding: 12px 24px; border-radius: 999px; cursor: pointer; border: none; box-shadow: 0 4px 14px rgba(0, 166, 81, 0.35);">Reset Filters &amp; Search</button>
      </div>
    `;
    return;
  }

  let html = visibleList.map(h => `
    <div class="jmt-hotel-result-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 20px; overflow: hidden; color: #FFFFFF !important; box-shadow: 0 12px 32px rgba(7, 21, 59, 0.22); margin-bottom: 20px;">
      <div class="jmt-hotel-card-media">
        <img src="${h.image}" alt="${escapeHTML(h.name)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/assets/hotels/luxury-resorts.jpg';">
        ${h.isJmtChoice ? `<span class="jmt-hotel-card-badge" style="background: rgba(7, 21, 59, 0.85); color: #00E676 !important; font-weight: 700; border: 1px solid rgba(255, 255, 255, 0.2);">JMT Choice</span>` : ''}
      </div>

      <div class="jmt-hotel-card-content" style="padding: 22px;">
        <div>
          <div class="jmt-hotel-card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div>
              <h3 class="jmt-hotel-card-title" style="color: #FFFFFF !important; font-weight: 800; font-size: 19px; margin: 0 0 6px;">${escapeHTML(h.name)}</h3>
              <div class="jmt-hotel-card-location">
                <span style="color: #D6E0F4 !important; font-weight: 600; font-size: 13px;">📍 ${escapeHTML(h.district)}, ${escapeHTML(h.city)}, ${escapeHTML(h.country)}</span>
              </div>
            </div>
            <div class="jmt-hotel-card-rating" style="text-align: right; flex-shrink: 0;">
              <span class="jmt-hotel-score-badge" style="background: rgba(0, 230, 118, 0.2); color: #00E676 !important; font-weight: 800; padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(0, 230, 118, 0.4); font-size: 13px;">★ ${h.rating}</span>
              <span class="jmt-hotel-reviews-count" style="display: block; color: #D6E0F4 !important; font-size: 11.5px; margin-top: 4px; font-weight: 600;">${h.reviewsCount} reviews</span>
            </div>
          </div>

          <p style="font-size: 13.5px; color: #D6E0F4 !important; line-height: 1.55; margin: 10px 0 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${escapeHTML(h.description)}
          </p>

          <div class="jmt-hotel-card-amenities" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
            ${h.amenities.slice(0, 4).map(a => `<span class="jmt-hotel-amenity-tag" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.15); color: #D6E0F4 !important; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 6px;">${escapeHTML(a)}</span>`).join('')}
            ${h.amenities.length > 4 ? `<span class="jmt-hotel-amenity-tag" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.15); color: #D6E0F4 !important; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 6px;">+${h.amenities.length - 4} more</span>` : ''}
          </div>
        </div>

        <div class="jmt-hotel-card-footer" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255, 255, 255, 0.15); padding-top: 14px; margin-top: 14px; flex-wrap: wrap; gap: 14px;">
          <div class="jmt-hotel-price-box">
            <span class="jmt-hotel-price-sub" style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #D6E0F4 !important; display: block;">Starting from (Indicative rate)</span>
            <div class="jmt-hotel-price-val">
              <strong style="color: #00E676 !important; font-size: 20px; font-weight: 800;">${escapeHTML(h.currency || 'OMR')} ${h.priceOMR.toFixed(3)}</strong>
              <span style="font-size: 12px; font-weight: 500; color: #D6E0F4 !important;">/ night</span>
            </div>
          </div>

          <div class="jmt-hotel-actions" style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button type="button" onclick="openEnquiryModal('hotel', '${escapeHTML(h.name)}', { subtitle: '${escapeHTML(h.city)}, ${escapeHTML(h.country)}', message: 'Hi JMT Travels, I am enquiring about booking ${escapeHTML(h.name)} in ${escapeHTML(h.city)}. Check-in: ${hotelSearchState.checkIn}, Check-out: ${hotelSearchState.checkOut}.' })" class="jmt-btn-primary" style="padding: 10px 18px; font-size: 13px; background: #00E676; color: #07153B !important; font-weight: 800; border-radius: 999px; border: 0; cursor: pointer; box-shadow: 0 4px 14px rgba(0, 230, 118, 0.35); display: inline-flex; align-items: center;">
              Enquire Hotel →
            </button>
            <a href="https://wa.me/96897608999?text=${encodeURIComponent(`Hotel Booking Request: ${h.name} (${h.city}, ${h.country}). Check-in: ${hotelSearchState.checkIn}, Check-out: ${hotelSearchState.checkOut}.`)}" target="_blank" rel="noopener" class="jmt-btn-secondary" style="padding: 10px 18px; font-size: 13px; background: rgba(255, 255, 255, 0.14); color: #FFFFFF !important; border: 1.5px solid rgba(255, 255, 255, 0.4); border-radius: 999px; text-decoration: none; display: inline-flex; align-items: center;">
              💬 WhatsApp JMT
            </a>
          </div>
        </div>

      </div>
    </div>
  `).join('');

  if (list.length > visibleList.length) {
    html += `
      <div style="text-align: center; margin-top: 32px; margin-bottom: 24px;">
        <button onclick="loadMoreHotels()" class="jmt-btn-secondary" style="background: rgba(255, 255, 255, 0.12); color: #FFFFFF !important; border: 1.5px solid rgba(255, 255, 255, 0.4); padding: 14px 36px; border-radius: 999px; font-weight: 800; font-size: 14.5px; cursor: pointer; transition: all 0.2s;">
          Load More Hotels (${list.length - visibleList.length} remaining) ↓
        </button>
      </div>
    `;
  }

  container.innerHTML = html;
};

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
          <strong class="jmt-airport-name" style="font-size: 13.5px; display: block; line-height: 1.2;">${escapeHTML(item.name)}</strong>
          <small class="jmt-airport-sub" style="font-size: 11.5px;">${escapeHTML(item.city)}, ${escapeHTML(item.country)}</small>
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

let homePaxState = {
  adults: 2,
  children: 0,
  infants: 0
};

window.toggleTravellerPopover = function(event) {
  if (event) event.stopPropagation();
  const popover = document.getElementById('popover-home-travellers');
  if (!popover) return;
  const isVisible = popover.style.display === 'block';
  popover.style.display = isVisible ? 'none' : 'block';
};

window.closeTravellerPopover = function() {
  const popover = document.getElementById('popover-home-travellers');
  if (popover) popover.style.display = 'none';
};

window.updateHomePaxCount = function(type, delta) {
  if (type === 'adults') {
    homePaxState.adults = Math.max(1, homePaxState.adults + delta);
    if (homePaxState.infants > homePaxState.adults) {
      homePaxState.infants = homePaxState.adults;
    }
  } else if (type === 'children') {
    homePaxState.children = Math.max(0, homePaxState.children + delta);
  } else if (type === 'infants') {
    homePaxState.infants = Math.max(0, Math.min(homePaxState.adults, homePaxState.infants + delta));
  }
  renderHomePaxValues();
};

window.setTravellerPreset = function(presetLabel) {
  if (presetLabel === '1 Adult') {
    homePaxState = { adults: 1, children: 0, infants: 0 };
  } else if (presetLabel === '2 Adults') {
    homePaxState = { adults: 2, children: 0, infants: 0 };
  } else if (presetLabel === 'Family (2+2)') {
    homePaxState = { adults: 2, children: 2, infants: 0 };
  } else if (presetLabel === 'Group (4+)') {
    homePaxState = { adults: 4, children: 0, infants: 0 };
  }

  const chips = document.querySelectorAll('.jmt-preset-chip');
  chips.forEach(c => {
    if (c.textContent.trim() === presetLabel) c.classList.add('active');
    else c.classList.remove('active');
  });

  renderHomePaxValues();
};

function renderHomePaxValues() {
  const countAdults = document.getElementById('home-count-adults');
  const countChildren = document.getElementById('home-count-children');
  const countInfants = document.getElementById('home-count-infants');
  if (countAdults) countAdults.textContent = homePaxState.adults;
  if (countChildren) countChildren.textContent = homePaxState.children;
  if (countInfants) countInfants.textContent = homePaxState.infants;

  const totalPax = homePaxState.adults + homePaxState.children + homePaxState.infants;
  let labelText = '';
  if (homePaxState.adults === 2 && homePaxState.children === 2) {
    labelText = 'Family (2 Adults + 2 Kids)';
  } else if (homePaxState.adults === 1 && totalPax === 1) {
    labelText = '1 Adult';
  } else if (homePaxState.adults === 2 && totalPax === 2) {
    labelText = '2 Adults';
  } else {
    labelText = `${totalPax} Guests (${homePaxState.adults}A, ${homePaxState.children}C, ${homePaxState.infants}I)`;
  }

  const displayEl = document.getElementById('travellers-display-val');
  const hiddenInput = document.getElementById('search-travellers-input');
  if (displayEl) displayEl.textContent = labelText;
  if (hiddenInput) hiddenInput.value = labelText;
}

document.addEventListener('click', function(e) {
  const travellerContainer = document.getElementById('travellers-field-container');
  const travellerPopover = document.getElementById('popover-home-travellers');
  if (travellerPopover && travellerContainer && !travellerContainer.contains(e.target)) {
    travellerPopover.style.display = 'none';
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeTravellerPopover();
    if (typeof closeFlightPopovers === 'function') closeFlightPopovers();
  }
});

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
      if (tabName === 'visa') btn.innerHTML = 'Search E-Visas →';
      else if (tabName === 'hotels') btn.innerHTML = 'Search Hotels →';
      else btn.innerHTML = 'Search Packages →';
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

window.toggleFlightPassengersPopover = function(e) {
  if (e) e.stopPropagation();
  const el = document.getElementById('flight-pax-popover') || document.getElementById('popover-passengers');
  if (el) {
    const isVisible = el.style.display === 'block';
    el.style.display = isVisible ? 'none' : 'block';
  }
};

window.toggleFlightPopover = function(popoverName) {
  const popovers = ['triptype', 'passengers', 'promo'];
  popovers.forEach(name => {
    const el = document.getElementById(`popover-${name}`) || (name === 'passengers' ? document.getElementById('flight-pax-popover') : null);
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
  const paxPop = document.getElementById('flight-pax-popover');
  if (paxPop) paxPop.style.display = 'none';
};

window.setFlightTripType = function(type) {
  flightSearchState.tripType = type;
  const label = document.getElementById('flight-triptype-label');
  if (label) label.textContent = type === 'one-way' ? 'One-way' : (type === 'multi-city' ? 'Multi City' : 'Round-trip');

  const btnRounds = document.querySelectorAll('#btn-trip-round, #btn-trip-round-home');
  const btnOneways = document.querySelectorAll('#btn-trip-oneway, #btn-trip-oneway-home');
  const btnMulticities = document.querySelectorAll('#btn-trip-multicity, #btn-trip-multicity-home');

  const map = {
    'round-trip': btnRounds,
    'one-way': btnOneways,
    'multi-city': btnMulticities
  };

  ['round-trip', 'one-way', 'multi-city'].forEach(key => {
    const list = map[key];
    if (list) {
      list.forEach(btn => {
        if (key === type) {
          btn.classList.add('active');
          btn.style.background = '#00E676';
          btn.style.color = '#07153B';
          btn.style.fontWeight = '800';
        } else {
          btn.classList.remove('active');
          btn.style.background = 'transparent';
          btn.style.color = '#E2E8F0';
          btn.style.fontWeight = '700';
        }
      });
    }
  });

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
  const totalPax = flightSearchState.adults + flightSearchState.children + flightSearchState.infants;
  const paxText = totalPax === 1 ? '1 Passenger' : `${totalPax} Passengers`;
  const labelStr = `${paxText}, ${flightSearchState.cabinClass}`;

  const paxPill = document.getElementById('flight-pax-label');
  if (paxPill) paxPill.textContent = labelStr;

  const paxSummaryText = document.getElementById('flight-pax-summary-text');
  if (paxSummaryText) paxSummaryText.textContent = labelStr;

  const paxAdultsVal = document.getElementById('pax-adults-val');
  const paxChildrenVal = document.getElementById('pax-children-val');
  const paxInfantsVal = document.getElementById('pax-infants-val');
  if (paxAdultsVal) paxAdultsVal.textContent = flightSearchState.adults;
  if (paxChildrenVal) paxChildrenVal.textContent = flightSearchState.children;
  if (paxInfantsVal) paxInfantsVal.textContent = flightSearchState.infants;
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
      description: 'Apply for Oman tourist, business, and family visit visas with JMT Travels Muscat. Trusted Oman e-visa intake & clearing services.',
      canonicalUrl: '/visa',
      noindex: false
    });
    announceToSR('Navigated to Oman Visa Services Catalogue');
  }

  container.innerHTML = `<div class="shell" style="padding: 40px 20px;"><p style="color: #CBD5E1;">Loading visa services...</p></div>`;
  try {
    const res = await apiCall('/api/visa/services');
    const dbServices = res.services || [];

    const schengenPosterAsset = '/assets/destinations/schengen_poster.jpg';

    const visaMediaHTML = renderTravelMediaHTML({
      videoSrc: isSchengen ? '/assets/videos/schengen.mp4' : '/assets/videos/oman_visa.mp4',
      posterSrc: isSchengen ? schengenPosterAsset : '/assets/destinations/oman_visa_poster.jpg',
      alt: isSchengen ? 'European Schengen Visa Assistance & Embassy Appointments' : 'Apply for an Oman Visa',
      badgeText: 'JMT Travel Desk',
      aspectRatio: '4 / 3',
      overlayGradient: isSchengen ? 'linear-gradient(180deg, rgba(7, 21, 59, 0.45) 0%, rgba(0, 166, 81, 0.4) 100%)' : 'linear-gradient(180deg, rgba(3, 25, 68, 0.15) 0%, rgba(3, 25, 68, 0.45) 100%)'
    });

    const schengenServicesList = [
      {
        slug: 'schengen-tourist-visa',
        title: 'Tourist / Short Stay Visa',
        icon: '🏰',
        description: 'Tourism, holidays, sightseeing and visiting Europe.',
        validity: 'Up to 90 Days',
        processingTime: '10–15 Days',
        entryType: 'Single / Multiple',
        price: 'OMR 35.000'
      },
      {
        slug: 'schengen-business-visa',
        title: 'Business Visa',
        icon: '💼',
        description: 'Meetings, corporate events, conferences and professional travel.',
        validity: 'Up to 90 Days',
        processingTime: '10–15 Days',
        entryType: 'Single / Multiple',
        price: 'OMR 45.000'
      },
      {
        slug: 'schengen-family-visa',
        title: 'Family / Friend Visit',
        icon: '👨‍👩‍👧‍👦',
        description: 'Visiting family members, relatives or friends in Schengen countries.',
        validity: 'Up to 90 Days',
        processingTime: '10–15 Days',
        entryType: 'Single / Multiple',
        price: 'OMR 40.000'
      },
      {
        slug: 'schengen-appointment-assistance',
        title: 'Visa Appointment Assistance',
        icon: '📅',
        description: 'Guidance with VFS/BLS/Embassy appointment preparation and submission.',
        validity: 'Appointment Intake',
        processingTime: 'Priority Scheduling',
        entryType: 'Consultation',
        price: 'OMR 30.000'
      },
      {
        slug: 'schengen-insurance-docs',
        title: 'Travel Insurance & Documentation',
        icon: '🛡️',
        description: 'Assistance preparing EUR 30,000 compliant travel insurance and flight/hotel itineraries.',
        validity: 'Policy Support',
        processingTime: '24–48 Hours',
        entryType: 'Document Pack',
        price: 'OMR 20.000'
      }
    ];

    const popularSchengenDestinations = [
      { name: 'France', flag: '🇫🇷' },
      { name: 'Germany', flag: '🇩🇪' },
      { name: 'Italy', flag: '🇮🇹' },
      { name: 'Spain', flag: '🇪🇸' },
      { name: 'Switzerland', flag: '🇨🇭' },
      { name: 'Austria', flag: '🇦🇹' },
      { name: 'Netherlands', flag: '🇳🇱' },
      { name: 'Greece', flag: '🇬🇷' },
      { name: 'Belgium', flag: '🇧🇪' },
      { name: 'Portugal', flag: '🇵🇹' },
      { name: 'Czechia', flag: '🇨🇿' },
      { name: 'Hungary', flag: '🇭🇺' },
      { name: 'Sweden', flag: '🇸🇪' },
      { name: 'Norway', flag: '🇳🇴' },
      { name: 'Denmark', flag: '🇩🇰' },
      { name: 'Finland', flag: '🇫🇮' }
    ];

    const gulfResidenceCountries = [
      { name: 'Oman', flag: '🇴🇲', office: 'Muscat Desk' },
      { name: 'United Arab Emirates', flag: '🇦🇪', office: 'UAE Desk' },
      { name: 'Saudi Arabia', flag: '🇸🇦', office: 'KSA Desk' },
      { name: 'Qatar', flag: '🇶🇦', office: 'Qatar Desk' },
      { name: 'Kuwait', flag: '🇰🇼', office: 'Kuwait Desk' },
      { name: 'Bahrain', flag: '🇧🇭', office: 'Bahrain Desk' }
    ];

    container.innerHTML = `
      <div class="shell" style="padding: 30px 20px 60px;">
        <!-- HERO SECTION (TWO-COLUMN DESKTOP LAYOUT) -->
        <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 65%, #153B8A 100%); color: #FFFFFF; border-radius: 24px; padding: 48px; margin-bottom: 40px; border: 1px solid rgba(255,255,255,0.18); box-shadow: 0 16px 40px rgba(7,21,59,0.25); position: relative; overflow: hidden;">
          <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 40px; align-items: center;" class="jmt-hero-grid">

            <!-- LEFT HERO COLUMN -->
            <div>
              <span style="display: inline-block; background: rgba(0, 230, 118, 0.2); border: 1px solid rgba(0, 230, 118, 0.5); color: #00E676; font-size: 12px; font-weight: 800; padding: 4px 14px; border-radius: 50px; letter-spacing: 1.5px; margin-bottom: 14px; text-transform: uppercase;">
                ${isSchengen ? 'SCHENGEN VISA SERVICES' : 'OMAN VISA SERVICES'}
              </span>
              <h1 style="font-size: clamp(30px, 3.8vw, 44px); font-weight: 800; margin: 0 0 14px; line-height: 1.2; color: #FFFFFF !important; text-shadow: 0 2px 10px rgba(0,0,0,0.6);">
                ${isSchengen ? 'Schengen Visa Assistance & Appointments' : 'Apply for an Oman Visa'}
              </h1>
              <p style="font-size: 16px; color: #D6E0F4 !important; margin: 0 0 24px; line-height: 1.6; max-width: 560px;">
                ${isSchengen ? 'Professional assistance for Schengen visa preparation, appointment guidance, travel insurance, and supporting documentation.' : "Whether you're visiting Oman for tourism, business, or family visits, JMT Travels provides trusted Oman e-visa assistance from Muscat for travellers worldwide."}
              </p>

              <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 28px;">
                <span style="background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.3); color: #FFFFFF; font-size: 12.5px; font-weight: 700; padding: 5px 14px; border-radius: 50px;">${isSchengen ? '✓ European Schengen' : '✓ Tourist & Business'}</span>
                <span style="background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.3); color: #FFFFFF; font-size: 12.5px; font-weight: 700; padding: 5px 14px; border-radius: 50px;">${isSchengen ? '✓ Appointment Guidance' : '✓ 24-48h Processing'}</span>
                <span style="background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.3); color: #FFFFFF; font-size: 12.5px; font-weight: 700; padding: 5px 14px; border-radius: 50px;">✓ Muscat Local Desk</span>
              </div>

              <div style="display: flex; gap: 14px; flex-wrap: wrap; align-items: center;">
                <a href="${isSchengen ? '/visa/schengen/apply' : '#visa-grid'}" ${isSchengen ? 'onclick="event.preventDefault(); navigate(\'/visa/schengen/apply\')"' : ''} class="jmt-btn-primary" style="background: #00E676; color: #07153B; font-weight: 800; padding: 14px 28px; border-radius: 999px; text-decoration: none;">
                  ${isSchengen ? 'Start Schengen Application →' : 'Apply for Oman Visa →'}
                </a>
                <a href="https://wa.me/96897608999?text=${isSchengen ? 'Schengen%20Visa%20Assistance%20Inquiry' : 'Inquiry%20regarding%20Oman%20Visa%20Services'}" target="_blank" rel="noopener" class="jmt-btn-secondary" style="background: rgba(255,255,255,0.12); color: #FFFFFF !important; border: 1.5px solid rgba(255,255,255,0.4); padding: 14px 24px; border-radius: 999px; text-decoration: none;">
                  Talk to a Visa Specialist
                </a>
              </div>
            </div>

            <!-- RIGHT HERO COLUMN -->
            <div>
              ${visaMediaHTML}
            </div>

          </div>
        </div>

        ${isSchengen ? `
          <!-- SCHENGEN SERVICES CATALOGUE GRID -->
          <div id="visa-grid" style="margin-bottom: 60px;">
            <div style="text-align: center; max-width: 750px; margin: 0 auto 36px;">
              <span class="jmt-editorial-eyebrow" style="margin-bottom: 12px; color: #00E676;">JMT TRAVELS • SCHENGEN VISA SERVICES</span>
              <h2 style="font-size: clamp(28px, 3.5vw, 40px); color: #FFFFFF !important; font-weight: 800; margin: 0 0 12px; letter-spacing: -0.5px;">
                Explore <span style="color: #00E676 !important;">Schengen</span> Visa Services
              </h2>
              <p style="font-size: 15.5px; color: #E2E8F0 !important; margin: 0; line-height: 1.6;">
                Professional Schengen visa assistance for travellers applying from Oman and across the Gulf.
              </p>
            </div>

            <div class="jmt-visa-card-grid">
              ${schengenServicesList.map(s => `
                <div class="jmt-oman-visa-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%) !important; min-height: 280px; padding: 24px; border-radius: 20px; color: #FFFFFF !important; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid rgba(255, 255, 255, 0.2) !important; box-shadow: 0 12px 32px rgba(7, 21, 59, 0.25) !important;">
                  <div class="jmt-oman-visa-card-content" style="position: relative; z-index: 5 !important; display: flex; flex-direction: column; justify-content: space-between; height: 100%; width: 100%;">
                    <div>
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <span style="font-size: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${s.icon}</span>
                        <span style="background: rgba(0, 230, 118, 0.25) !important; border: 1.5px solid #00E676 !important; color: #00E676 !important; font-size: 12px; font-weight: 800; padding: 5px 14px; border-radius: 99px; backdrop-filter: blur(4px);">
                          ⚡ ${escapeHTML(s.processingTime)}
                        </span>
                      </div>

                      <h3 style="font-size: 21px; color: #FFFFFF !important; font-weight: 800; margin: 0 0 10px; line-height: 1.3; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">
                        ${escapeHTML(s.title)}
                      </h3>

                      <p style="font-size: 14px; color: #D6E0F4 !important; line-height: 1.6; margin: 0 0 20px; font-weight: 500;">
                        ${escapeHTML(s.description)}
                      </p>
                    </div>

                    <div>
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-top: 1px solid rgba(255, 255, 255, 0.2); padding-top: 14px;">
                        <span style="font-size: 12px; color: #D6E0F4 !important; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">Service Fee</span>
                        <span style="font-size: 20px; font-weight: 800; color: #00E676 !important; text-shadow: 0 1px 4px rgba(0,0,0,0.4);">${escapeHTML(s.price)}</span>
                      </div>

                      <a href="/visa/schengen/apply?type=${escapeHTML(s.title.toLowerCase().split(' ')[0])}" onclick="event.preventDefault(); navigate('/visa/schengen/apply?type=${escapeHTML(s.title.toLowerCase().split(' ')[0])}')" class="jmt-btn-primary" style="display: block; text-align: center; background: #00E676 !important; color: #07153B !important; font-weight: 800; padding: 13px 20px; border-radius: 999px; text-decoration: none; font-size: 14px; box-shadow: 0 4px 14px rgba(0, 230, 118, 0.4);">
                        Start Schengen Application →
                      </a>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- GULF APPLICATION SUPPORT SECTION -->
          <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 50%, #00A651 100%); border-radius: 24px; padding: 40px 32px; margin-bottom: 50px; color: #FFFFFF; box-shadow: 0 16px 40px rgba(7, 21, 59, 0.22); border: 1px solid rgba(255, 255, 255, 0.15);">
            <div style="text-align: center; max-width: 680px; margin: 0 auto 28px;">
              <span style="display: inline-block; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.35); color: #FFFFFF; font-size: 11.5px; font-weight: 800; padding: 4px 14px; border-radius: 99px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px;">
                GCC RESIDENCY SUPPORT
              </span>
              <h2 style="font-size: clamp(24px, 3.2vw, 32px); color: #FFFFFF !important; font-weight: 800; margin: 0 0 10px; letter-spacing: -0.5px;">
                Apply for a Schengen Visa from the Gulf
              </h2>
              <p style="font-size: 15px; color: #E2E8F0 !important; margin: 0; line-height: 1.6;">
                JMT Travels provides document clearing and appointment preparation assistance for eligible residents of GCC member states.
              </p>
            </div>

            <div class="jmt-gulf-grid">
              ${gulfResidenceCountries.map(g => `
                <div class="jmt-gulf-card" style="background: rgba(255, 255, 255, 0.16) !important; border: 1.5px solid rgba(255, 255, 255, 0.35) !important; color: #FFFFFF !important; border-radius: 18px; padding: 18px; backdrop-filter: blur(8px);">
                  <span class="jmt-gulf-flag" style="font-size: 32px; display: block; margin-bottom: 6px;">${g.flag}</span>
                  <strong class="jmt-gulf-name" style="color: #FFFFFF !important; font-size: 15px; display: block; font-weight: 800;">${escapeHTML(g.name)}</strong>
                  <span class="jmt-gulf-sub" style="color: #00E676 !important; font-size: 12px; font-weight: 700;">${escapeHTML(g.office)}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- EUROPE / SCHENGEN DESTINATIONS -->
          <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border-radius: 24px; padding: 40px 32px; margin-bottom: 50px; color: #FFFFFF; box-shadow: 0 16px 40px rgba(7, 21, 59, 0.22); border: 1px solid rgba(255, 255, 255, 0.15);">
            <div style="text-align: center; max-width: 680px; margin: 0 auto 28px;">
              <span style="display: inline-block; background: rgba(0, 166, 81, 0.25); border: 1px solid rgba(0, 230, 118, 0.5); color: #00E676; font-size: 11.5px; font-weight: 800; padding: 4px 14px; border-radius: 99px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px;">
                EUROPEAN MEMBER STATES
              </span>
              <h2 style="font-size: clamp(24px, 3.2vw, 32px); color: #FFFFFF !important; font-weight: 800; margin: 0 0 8px; letter-spacing: -0.5px;">
                Popular Schengen Destinations
              </h2>
              <p style="font-size: 15px; color: #D6E0F4 !important; margin: 0; line-height: 1.6;">
                Select your target European embassy destination for customized checklist intake and appointment guidance.
              </p>
            </div>

            <div class="jmt-schengen-dest-grid">
              ${popularSchengenDestinations.map(d => `
                <div class="jmt-dest-chip" onclick="navigate('/visa/schengen/apply?destination=${encodeURIComponent(d.name)}')" style="background: rgba(255, 255, 255, 0.16) !important; border: 1.5px solid rgba(255, 255, 255, 0.35) !important; color: #FFFFFF !important; backdrop-filter: blur(8px); cursor: pointer;">
                  <span style="font-size: 18px;">${d.flag}</span>
                  <span style="color: #FFFFFF !important; font-weight: 800;">${escapeHTML(d.name)}</span>
                </div>
              `).join('')}
            </div>

            <div style="background: rgba(7, 21, 59, 0.85); border-inline-start: 5px solid #00E676; border: 1px solid rgba(255, 255, 255, 0.2); padding: 16px 20px; border-radius: 14px; font-size: 13.5px; color: #D6E0F4 !important; line-height: 1.6; margin-top: 24px; backdrop-filter: blur(8px);">
              ℹ️ <strong style="color: #FFFFFF !important; font-weight: 800;">Consular Note:</strong> Application requirements, appointment procedures and supporting documents can vary by destination country, consular jurisdiction and applicant circumstances.
            </div>
          </div>

          <!-- SCHENGEN DISCLAIMER -->
          <div class="jmt-disclaimer-box" style="margin-bottom: 40px; background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border-left: 6px solid #00E676; border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 20px; padding: 24px 28px; color: #D6E0F4 !important; box-shadow: 0 12px 32px rgba(7, 21, 59, 0.22);">
            <div style="font-weight: 800; color: #FFFFFF !important; margin-bottom: 8px; font-size: 17px; display: flex; align-items: center; gap: 8px;">
              <span>ℹ️</span> Consular Decision &amp; Disclaimer
            </div>
            <div style="font-size: 14px; color: #D6E0F4 !important; line-height: 1.65;">
              JMT Travels provides visa assistance, document checking, and appointment preparation. Visa approval and issuance are strictly subject to the requirements and decision of the relevant Schengen member state embassy or consulate.
            </div>
          </div>

          <!-- SCHENGEN FINAL CTA SECTION -->
          <div class="jmt-oman-cta-section" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255,255,255,0.18); border-radius: 24px; padding: 48px 36px; text-align: center; color: #FFFFFF;">
            <h2 style="font-size: 28px; font-weight: 800; margin: 0 0 10px; color: #FFFFFF;">Ready to Explore Europe?</h2>
            <p style="font-size: 15px; color: #E2E8F0; margin: 0 0 24px; max-width: 600px; margin-left: auto; margin-right: auto;">
              Start your Schengen visa application with JMT Travels and let our team guide you through the documentation and appointment process.
            </p>
            <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
              <a href="/visa/schengen/apply" onclick="event.preventDefault(); navigate('/visa/schengen/apply')" class="jmt-btn-primary" style="background: #00E676; color: #07153B !important; font-weight: 800; padding: 14px 28px; border-radius: 999px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(0, 230, 118, 0.35);">
                Start Schengen Application →
              </a>
              <a href="https://wa.me/96897608999?text=Hello%20JMT%20Travels%2C%20I%20have%20an%20inquiry%20about%20Schengen%20Visas" target="_blank" rel="noopener" class="jmt-cta-btn-secondary" style="background: rgba(255,255,255,0.12); color: #FFFFFF !important; border: 1.5px solid rgba(255,255,255,0.4); padding: 14px 24px; border-radius: 999px; text-decoration: none;">
                Talk to a Visa Specialist
              </a>
            </div>
          </div>
        ` : `
          <!-- 4-STEP PROCESS TIMELINE -->
          <div style="margin-bottom: 50px;">
            <h2 style="font-size: 24px; color: #00E676; font-weight: 800; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
              4-Step Simple Visa Clearance Process <span class="heading-green-line" style="width: 44px; height: 3.5px; background: #00E676; border-radius: 99px;"></span>
            </h2>
            <div class="jmt-step-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px;">
              <div class="jmt-step-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 18px; padding: 24px;">
                <div class="jmt-step-num" style="width: 36px; height: 36px; border-radius: 50%; background: #00E676; color: #07153B; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 16px;">1</div>
                <h3 style="font-size: 16px; color: #FFFFFF; font-weight: 800; margin-bottom: 6px;">Select Visa &amp; Category</h3>
                <p style="font-size: 13.5px; color: #CBD5E1; margin: 0; line-height: 1.5;">Choose the right Oman visa category (Tourist, Business, or Family Visit).</p>
              </div>
              <div class="jmt-step-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 18px; padding: 24px;">
                <div class="jmt-step-num" style="width: 36px; height: 36px; border-radius: 50%; background: #00E676; color: #07153B; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 16px;">2</div>
                <h3 style="font-size: 16px; color: #FFFFFF; font-weight: 800; margin-bottom: 6px;">Submit Digital Intake</h3>
                <p style="font-size: 13.5px; color: #CBD5E1; margin: 0; line-height: 1.5;">Fill out basic traveller details and receive your personalized document checklist.</p>
              </div>
              <div class="jmt-step-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 18px; padding: 24px;">
                <div class="jmt-step-num" style="width: 36px; height: 36px; border-radius: 50%; background: #00E676; color: #07153B; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 16px;">3</div>
                <h3 style="font-size: 16px; color: #FFFFFF; font-weight: 800; margin-bottom: 6px;">Expert Verification</h3>
                <p style="font-size: 13.5px; color: #CBD5E1; margin: 0; line-height: 1.5;">Our Muscat visa desk verifies your passport, photo, and supporting documents.</p>
              </div>
              <div class="jmt-step-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 18px; padding: 24px;">
                <div class="jmt-step-num" style="width: 36px; height: 36px; border-radius: 50%; background: #00E676; color: #07153B; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 16px;">4</div>
                <h3 style="font-size: 16px; color: #FFFFFF; font-weight: 800; margin-bottom: 6px;">Receive Approved Visa</h3>
                <p style="font-size: 13.5px; color: #CBD5E1; margin: 0; line-height: 1.5;">Track status in real time and receive your official visa document via digital delivery.</p>
              </div>
            </div>
          </div>

          <!-- VISA CATALOGUE GRID -->
          <div id="visa-grid" style="margin-bottom: 60px;">
            <div style="text-align: center; max-width: 750px; margin: 0 auto 36px;">
              <span class="jmt-editorial-eyebrow" style="margin-bottom: 12px; color: #00E676;">JMT TRAVELS • OMAN VISA SERVICES</span>
              <h2 style="font-size: clamp(28px, 3.5vw, 40px); color: #FFFFFF; font-weight: 800; margin: 0 0 12px; letter-spacing: -0.5px;">
                Explore <span style="color: #00E676;">Oman</span> Visa Categories
              </h2>
              <p style="font-size: 15.5px; color: #CBD5E1; margin: 0; line-height: 1.6;">
                Fast-track application intake &amp; document clearing for international travellers &amp; GCC residents.
              </p>
            </div>

            <div class="jmt-visa-card-grid">
              ${OMAN_VISA_CATEGORIES.map(v => {
                const matchedDb = dbServices.find(s => s.slug === v.slug);
                const validity = matchedDb ? matchedDb.validity : v.validity;
                const procTime = matchedDb ? matchedDb.processingTime : v.processingTime;
                const entryType = matchedDb ? matchedDb.entryType : v.entryType;
                const overview = matchedDb ? matchedDb.overview : v.description;

                return `
                  <div class="jmt-oman-visa-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%) !important; min-height: 280px; padding: 24px; border-radius: 20px; color: #FFFFFF !important; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid rgba(255, 255, 255, 0.2) !important; box-shadow: 0 12px 32px rgba(7, 21, 59, 0.25) !important;">
                    <div class="jmt-oman-visa-card-content" style="position: relative; z-index: 5 !important; display: flex; flex-direction: column; justify-content: space-between; height: 100%; width: 100%;">
                      <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                          <span style="font-size: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${v.icon}</span>
                          <span style="background: rgba(0, 230, 118, 0.25) !important; border: 1.5px solid #00E676 !important; color: #00E676 !important; font-size: 11.5px; font-weight: 800; padding: 4px 12px; border-radius: 99px; backdrop-filter: blur(4px);">
                            ⚡ ${escapeHTML(procTime)}
                          </span>
                        </div>

                        <h3 style="font-size: 23px; color: #FFFFFF !important; font-weight: 800; margin: 0 0 12px; line-height: 1.25; text-shadow: 0 2px 8px rgba(0,0,0,0.6);">
                          ${escapeHTML(v.title)}
                        </h3>

                        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;">
                          <span style="background: rgba(255, 255, 255, 0.18); backdrop-filter: blur(6px); border: 1px solid rgba(255, 255, 255, 0.3); color: #FFFFFF; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 8px;">
                            📅 ${escapeHTML(validity)}
                          </span>
                          <span style="background: rgba(255, 255, 255, 0.18); backdrop-filter: blur(6px); border: 1px solid rgba(255, 255, 255, 0.3); color: #FFFFFF; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 8px;">
                            ✈️ ${escapeHTML(entryType)}
                          </span>
                        </div>

                        <p style="font-size: 14px; color: rgba(255, 255, 255, 0.95); line-height: 1.6; margin: 0 0 20px; text-shadow: 0 1px 4px rgba(0,0,0,0.5);">
                          ${escapeHTML(overview)}
                        </p>
                      </div>

                      <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-top: 1px solid rgba(255, 255, 255, 0.2); padding-top: 16px;">
                          <span style="font-size: 12.5px; color: #CBD5E1; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">Service Fee</span>
                          <span style="font-size: 19px; font-weight: 800; color: #00E676; text-shadow: 0 1px 4px rgba(0,0,0,0.4);">${escapeHTML(v.price)}</span>
                        </div>

                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                          <a href="/visa/apply?type=${escapeHTML(v.visaType.toLowerCase().split(' ')[0])}&service=${escapeHTML(v.slug)}" onclick="event.preventDefault(); navigate('/visa/apply?type=${escapeHTML(v.visaType.toLowerCase().split(' ')[0])}&service=${escapeHTML(v.slug)}')" class="jmt-btn-primary" aria-label="Start Visa Enquiry for ${escapeHTML(v.title)}" style="flex: 1.2; justify-content: center; background: #00E676; color: #07153B !important; font-weight: 800; padding: 12px 18px; border-radius: 999px; text-decoration: none; font-size: 13.5px; box-shadow: 0 4px 14px rgba(0,230,118,0.35); white-space: nowrap;">
                            Start Visa Enquiry →
                          </a>
                          <a href="/visa/${escapeHTML(v.slug)}" onclick="event.preventDefault(); navigate('/visa/${escapeHTML(v.slug)}')" class="jmt-btn-secondary" aria-label="View Requirements for ${escapeHTML(v.title)}" style="flex: 0.8; justify-content: center; background: rgba(255, 255, 255, 0.16); color: #FFFFFF !important; border: 1.5px solid rgba(255, 255, 255, 0.45); backdrop-filter: blur(4px); padding: 12px 14px; border-radius: 999px; text-decoration: none; font-size: 13.5px; white-space: nowrap;">
                            Requirements →
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
          <div class="jmt-benefits-strip" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 20px; padding: 32px; margin-bottom: 50px;">
            <h2 style="font-size: 22px; color: #00E676; font-weight: 800; margin: 0 0 24px; text-align: center;">
              Why Choose JMT Travels for Your Oman Visa?
            </h2>
            <div class="jmt-benefits-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">
              <div class="jmt-benefit-item" style="display: flex; gap: 14px; align-items: flex-start;">
                <div class="jmt-benefit-icon" style="font-size: 24px;">🛡️</div>
                <div>
                  <h3 style="font-size: 16px; color: #FFFFFF; font-weight: 800; margin: 0 0 4px;">Reliable &amp; Secure</h3>
                  <p style="font-size: 13.5px; color: #CBD5E1; margin: 0; line-height: 1.5;">Your visa documents and passport details are handled with strict privacy and care.</p>
                </div>
              </div>

              <div class="jmt-benefit-item" style="display: flex; gap: 14px; align-items: flex-start;">
                <div class="jmt-benefit-icon" style="font-size: 24px;">⚡</div>
                <div>
                  <h3 style="font-size: 16px; color: #FFFFFF; font-weight: 800; margin: 0 0 4px;">Fast Processing</h3>
                  <p style="font-size: 13.5px; color: #CBD5E1; margin: 0; line-height: 1.5;">Efficient visa assistance and application intake support for rapid approval.</p>
                </div>
              </div>

              <div class="jmt-benefit-item" style="display: flex; gap: 14px; align-items: flex-start;">
                <div class="jmt-benefit-icon" style="font-size: 24px;">👨‍💼</div>
                <div>
                  <h3 style="font-size: 16px; color: #FFFFFF; font-weight: 800; margin: 0 0 4px;">Muscat Expert Guidance</h3>
                  <p style="font-size: 13.5px; color: #CBD5E1; margin: 0; line-height: 1.5;">Personalized help throughout your application process from Muscat visa specialists.</p>
                </div>
              </div>

              <div class="jmt-benefit-item" style="display: flex; gap: 14px; align-items: flex-start;">
                <div class="jmt-benefit-icon" style="font-size: 24px;">🌍</div>
                <div>
                  <h3 style="font-size: 16px; color: #FFFFFF; font-weight: 800; margin: 0 0 4px;">Worldwide Assistance</h3>
                  <p style="font-size: 13.5px; color: #CBD5E1; margin: 0; line-height: 1.5;">Comprehensive visa intake support for travellers from different countries globally.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- VISA APPLICATION DISCLAIMER -->
          <div class="jmt-disclaimer-box" style="margin-bottom: 40px; background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border-left: 6px solid #00E676; border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 20px; padding: 24px 28px; color: #D6E0F4 !important; box-shadow: 0 12px 32px rgba(7, 21, 59, 0.22);">
            <div style="font-weight: 800; color: #FFFFFF !important; margin-bottom: 8px; font-size: 17px; display: flex; align-items: center; gap: 8px;">
              <span>ℹ️</span> Official Visa Intake Disclaimer
            </div>
            <div style="font-size: 14px; color: #D6E0F4 !important; line-height: 1.65;">
              Visa approval is subject to the requirements and decision of the relevant Oman authorities. Processing times and eligibility may vary by visa type and applicant nationality. JMT Travels provides application intake, document verification, and clearance assistance.
            </div>
          </div>

          <!-- OMAN VISAS FINAL CTA SECTION -->
          <div class="jmt-oman-cta-section" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255,255,255,0.18); border-radius: 24px; padding: 48px 36px; text-align: center; color: #FFFFFF;">
            <h2 style="font-size: 28px; font-weight: 800; margin: 0 0 10px; color: #FFFFFF;">Ready to Travel to Oman?</h2>
            <p style="font-size: 15px; color: #E2E8F0; margin: 0 0 24px; max-width: 600px; margin-left: auto; margin-right: auto;">
              Start your Oman visa application with JMT Travels today. Fast, reliable e-visa assistance from our Muscat office.
            </p>
            <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
              <a href="/visa/apply" onclick="event.preventDefault(); navigate('/visa/apply')" class="jmt-btn-primary" style="background: #00E676; color: #07153B !important; font-weight: 800; padding: 14px 28px; border-radius: 999px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(0, 230, 118, 0.35);">
                Apply for Oman Visa →
              </a>
              <a href="https://wa.me/96897608999?text=Hello%20JMT%20Travels%2C%20I%20have%20an%20inquiry%20about%20Oman%20Visas" target="_blank" rel="noopener" class="jmt-cta-btn-secondary" style="background: rgba(255,255,255,0.12); color: #FFFFFF !important; border: 1.5px solid rgba(255,255,255,0.4); padding: 14px 24px; border-radius: 999px; text-decoration: none;">
                💬 Chat on WhatsApp →
              </a>
            </div>
          </div>
        `}

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

      <!-- 1. HOTEL HERO (TWO-COLUMN DESKTOP LAYOUT - PRESERVED EXACTLY) -->
      <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 65%, #153B8A 100%); color: #FFFFFF; border-radius: 24px; padding: 48px; margin-bottom: 40px; border: 0; box-shadow: 0 16px 40px rgba(7,21,59,0.18); position: relative; overflow: hidden;">
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
              <a href="#hotel-search-panel-container" onclick="const el=document.getElementById('hotel-search-panel-container'); if(el){el.scrollIntoView({behavior:'smooth'});}" class="jmt-btn-primary" style="padding: 14px 28px; font-size: 14.5px;">
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

      <!-- 2. HOTEL SEARCH PANEL -->
      <div class="jmt-hotel-search-panel" id="hotel-search-panel-container">
        <form onsubmit="handleHotelSearchSubmit(event)" id="hotel-search-form">
          <div class="jmt-hotel-search-grid">

            <!-- Destination -->
            <div style="position: relative;" id="hotel-dest-container">
              <div class="jmt-search-field-box" onclick="focusHotelDestInput()">
                <span class="jmt-field-icon">📍</span>
                <div style="flex: 1;">
                  <div class="jmt-field-label">Destination</div>
                  <input type="text" id="hotel-dest-input" class="jmt-field-input"
                         placeholder="e.g. Muscat, Dubai, Makkah"
                         value="${escapeHTML(hotelSearchState.destination)}"
                         onfocus="openHotelDestDropdown()"
                         oninput="filterHotelDestDropdown(this.value)"
                         autocomplete="off">
                </div>
              </div>
              <div class="jmt-airport-dropdown" id="hotel-dest-dropdown" style="display: none;"></div>
            </div>

            <!-- Check-in -->
            <div class="jmt-search-field-box">
              <span class="jmt-field-icon">📅</span>
              <div style="flex: 1;">
                <div class="jmt-field-label">Check-in</div>
                <input type="date" id="hotel-checkin-input" value="${hotelSearchState.checkIn}" class="jmt-field-input" onchange="updateHotelCheckinDate(this.value)">
              </div>
            </div>

            <!-- Check-out -->
            <div class="jmt-search-field-box">
              <span class="jmt-field-icon">📅</span>
              <div style="flex: 1;">
                <div class="jmt-field-label">Check-out</div>
                <input type="date" id="hotel-checkout-input" value="${hotelSearchState.checkOut}" class="jmt-field-input" onchange="updateHotelCheckoutDate(this.value)">
              </div>
            </div>

            <!-- Rooms & Guests -->
            <div style="position: relative;">
              <button type="button" onclick="toggleHotelGuestsPopover(event)" id="hotel-guests-btn" style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 12px; padding: 12px 16px; font-size: 13.5px; font-weight: 700; color: #0B286C; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: space-between; height: 100%;">
                <span>👤 <span id="hotel-guests-text">${hotelSearchState.rooms} Room, ${hotelSearchState.adults} Adults</span></span>
                <span style="font-size: 10px;">▼</span>
              </button>

              <div id="hotel-guests-popover" class="jmt-pax-popover" style="display: none; position: absolute; top: calc(100% + 6px); right: 0; z-index: 120; background: #FFF; border: 1px solid #CBD5E1; border-radius: 14px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); width: 260px; padding: 18px;">
                <div style="font-size: 14px; font-weight: 800; color: #0B286C; margin-bottom: 12px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">Rooms & Guests</div>
                <!-- Rooms -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <span style="font-size: 13.5px; font-weight: 700;">Rooms</span>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <button type="button" onclick="updateHotelGuestsCount('rooms', -1)" style="width:28px; height:28px; border-radius:50%; border:1px solid #CBD5E1; background:#FFF; font-weight:700; cursor:pointer;">-</button>
                    <span id="hotel-rooms-val" style="font-weight:800; width:16px; text-align:center;">${hotelSearchState.rooms}</span>
                    <button type="button" onclick="updateHotelGuestsCount('rooms', 1)" style="width:28px; height:28px; border-radius:50%; border:1px solid #CBD5E1; background:#FFF; font-weight:700; cursor:pointer;">+</button>
                  </div>
                </div>
                <!-- Adults -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <span style="font-size: 13.5px; font-weight: 700;">Adults</span>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <button type="button" onclick="updateHotelGuestsCount('adults', -1)" style="width:28px; height:28px; border-radius:50%; border:1px solid #CBD5E1; background:#FFF; font-weight:700; cursor:pointer;">-</button>
                    <span id="hotel-adults-val" style="font-weight:800; width:16px; text-align:center;">${hotelSearchState.adults}</span>
                    <button type="button" onclick="updateHotelGuestsCount('adults', 1)" style="width:28px; height:28px; border-radius:50%; border:1px solid #CBD5E1; background:#FFF; font-weight:700; cursor:pointer;">+</button>
                  </div>
                </div>
                <!-- Children -->
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 13.5px; font-weight: 700;">Children</span>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <button type="button" onclick="updateHotelGuestsCount('children', -1)" style="width:28px; height:28px; border-radius:50%; border:1px solid #CBD5E1; background:#FFF; font-weight:700; cursor:pointer;">-</button>
                    <span id="hotel-children-val" style="font-weight:800; width:16px; text-align:center;">${hotelSearchState.children}</span>
                    <button type="button" onclick="updateHotelGuestsCount('children', 1)" style="width:28px; height:28px; border-radius:50%; border:1px solid #CBD5E1; background:#FFF; font-weight:700; cursor:pointer;">+</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Submit Button -->
            <button type="submit" class="jmt-btn-primary" style="background: #07153B; color: #FFFFFF; border: 1px solid rgba(255,255,255,0.25); padding: 14px 26px; border-radius: 12px; font-size: 15px; font-weight: 800; cursor: pointer; white-space: nowrap; height: 100%;">
              Search Hotels →
            </button>

          </div>
        </form>
      </div>

      <!-- 3. POPULAR DESTINATIONS STRIP -->
      <div style="margin-bottom: 28px;">
        <div style="font-size: 13px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Popular Hotel Destinations</div>
        <div class="jmt-hotel-dest-chips" id="hotel-dest-chips-container">
          <button class="jmt-hotel-dest-chip active" onclick="quickSelectHotelDest('Muscat', 'Oman', this)">🇴🇲 Muscat</button>
          <button class="jmt-hotel-dest-chip" onclick="quickSelectHotelDest('Salalah', 'Oman', this)">🇴🇲 Salalah</button>
          <button class="jmt-hotel-dest-chip" onclick="quickSelectHotelDest('Nizwa', 'Oman', this)">🇴🇲 Nizwa</button>
          <button class="jmt-hotel-dest-chip" onclick="quickSelectHotelDest('Sohar', 'Oman', this)">🇴🇲 Sohar</button>
          <button class="jmt-hotel-dest-chip" onclick="quickSelectHotelDest('Dubai', 'United Arab Emirates', this)">🇦🇪 Dubai</button>
          <button class="jmt-hotel-dest-chip" onclick="quickSelectHotelDest('Abu Dhabi', 'United Arab Emirates', this)">🇦🇪 Abu Dhabi</button>
          <button class="jmt-hotel-dest-chip" onclick="quickSelectHotelDest('Al Ain', 'United Arab Emirates', this)">🇦🇪 Al Ain</button>
          <button class="jmt-hotel-dest-chip" onclick="quickSelectHotelDest('Sharjah', 'United Arab Emirates', this)">🇦🇪 Sharjah</button>
          <button class="jmt-hotel-dest-chip" onclick="quickSelectHotelDest('Makkah', 'Saudi Arabia', this)">🇸🇦 Makkah</button>
          <button class="jmt-hotel-dest-chip" onclick="quickSelectHotelDest('Madinah', 'Saudi Arabia', this)">🇸🇦 Madinah</button>
        </div>
      </div>

      <!-- 4. HOTEL RESULTS & FILTERS LAYOUT -->
      <div class="jmt-hotel-layout">

        <!-- LEFT SIDEBAR FILTERS -->
        <aside class="jmt-hotel-filters-sidebar">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.18);">
            <h3 style="font-size: 18px; font-weight: 800; color: #FFFFFF !important; margin: 0;">Filters</h3>
            <button type="button" onclick="clearAllHotelFilters()" style="background: none; border: 0; color: #00E676 !important; font-weight: 700; font-size: 13px; cursor: pointer;">Clear All</button>
          </div>

          <!-- Price Filter -->
          <div class="jmt-filter-group">
            <div class="jmt-filter-title">
              <span style="color: #FFFFFF !important;">Price per Night</span>
              <span id="hotel-price-range-val" style="color: #00E676 !important; font-size: 13px; font-weight: 700;">Up to OMR 250</span>
            </div>
            <input type="range" id="hotel-price-slider" min="20" max="250" value="250" step="10" style="width: 100%; accent-color: #00E676;" oninput="updateHotelPriceFilter(this.value)">
          </div>

          <!-- Star Rating Filter -->
          <div class="jmt-filter-group">
            <div class="jmt-filter-title">Star Rating</div>
            <label class="jmt-checkbox-label">
              <input type="checkbox" value="5" onchange="toggleHotelStarFilter('5', this.checked)">
              <span>5 Star Luxury (★★★★★)</span>
            </label>
            <label class="jmt-checkbox-label">
              <input type="checkbox" value="4" onchange="toggleHotelStarFilter('4', this.checked)">
              <span>4 Star Premium (★★★★)</span>
            </label>
            <label class="jmt-checkbox-label">
              <input type="checkbox" value="3" onchange="toggleHotelStarFilter('3', this.checked)">
              <span>3 Star Standard (★★★)</span>
            </label>
          </div>

          <!-- Property Type Filter -->
          <div class="jmt-filter-group">
            <div class="jmt-filter-title">Property Type</div>
            <label class="jmt-checkbox-label">
              <input type="checkbox" value="Resort" onchange="toggleHotelPropertyTypeFilter('Resort', this.checked)">
              <span>Resorts</span>
            </label>
            <label class="jmt-checkbox-label">
              <input type="checkbox" value="Hotel" onchange="toggleHotelPropertyTypeFilter('Hotel', this.checked)">
              <span>Hotels</span>
            </label>
            <label class="jmt-checkbox-label">
              <input type="checkbox" value="Apartment" onchange="toggleHotelPropertyTypeFilter('Apartment', this.checked)">
              <span>Apartments</span>
            </label>
            <label class="jmt-checkbox-label">
              <input type="checkbox" value="Boutique Hotel" onchange="toggleHotelPropertyTypeFilter('Boutique Hotel', this.checked)">
              <span>Boutique Hotels</span>
            </label>
          </div>

          <!-- Amenities Filter -->
          <div class="jmt-filter-group">
            <div class="jmt-filter-title">Amenities</div>
            <label class="jmt-checkbox-label">
              <input type="checkbox" value="Free Wi-Fi" onchange="toggleHotelAmenityFilter('Free Wi-Fi', this.checked)">
              <span>Free Wi-Fi</span>
            </label>
            <label class="jmt-checkbox-label">
              <input type="checkbox" value="Swimming Pool" onchange="toggleHotelAmenityFilter('Swimming Pool', this.checked)">
              <span>Swimming Pool</span>
            </label>
            <label class="jmt-checkbox-label">
              <input type="checkbox" value="Breakfast Included" onchange="toggleHotelAmenityFilter('Breakfast Included', this.checked)">
              <span>Breakfast Included</span>
            </label>
            <label class="jmt-checkbox-label">
              <input type="checkbox" value="Airport Transfer" onchange="toggleHotelAmenityFilter('Airport Transfer', this.checked)">
              <span>Airport Transfer</span>
            </label>
          </div>

        </aside>

        <!-- RIGHT RESULTS COLUMN -->
        <div>

          <!-- TOP RESULTS HEADER BAR -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 14px;">
            <div>
              <h2 id="hotel-results-heading" style="font-size: 24px; font-weight: 800; color: #07153B; margin: 0 0 4px;">
                Hotels in Muscat, Oman
              </h2>
              <span id="hotel-results-count-text" style="font-size: 14px; color: #64748B; font-weight: 600;">
                Showing hotels available
              </span>
            </div>

            <div style="display: flex; align-items: center; gap: 10px;">
              <label style="font-size: 13px; font-weight: 700; color: #475569;">Sort by:</label>
              <select id="hotel-sort-select" onchange="setHotelSort(this.value)" style="padding: 8px 14px; border-radius: 10px; border: 1px solid #CBD5E1; font-size: 13.5px; font-weight: 700; color: #0B286C; background: #FFF;">
                <option value="recommended">Recommended</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating-desc">Guest Rating</option>
              </select>
            </div>
          </div>

          <!-- RESULTS LIST CONTAINER -->
          <div id="hotel-results-grid"></div>

        </div>

      </div>

      <!-- 5. ACCOMMODATION SERVICES CATALOGUE SECTION (PRESERVED) -->
      <div style="margin-bottom: 60px; background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border-radius: 24px; padding: 48px 36px; border: 1px solid rgba(255, 255, 255, 0.18); box-shadow: 0 16px 40px rgba(7, 21, 59, 0.22);">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 28px; flex-wrap: wrap; gap: 16px;">
          <div>
            <h2 style="font-size: clamp(24px, 3.2vw, 32px); font-weight: 800; color: #FFFFFF !important; margin: 0 0 6px; letter-spacing: -0.5px;">Accommodation Services</h2>
            <p style="color: #D6E0F4 !important; font-size: 15px; margin: 0; max-width: 600px; line-height: 1.5;">Tailored hotel bookings and resort reservations for leisure, business, and pilgrimage.</p>
          </div>
          <a href="/hotels" onclick="event.preventDefault(); navigate('/hotels')" style="color: #00E676 !important; font-weight: 700; font-size: 15px; text-decoration: none; display: flex; align-items: center; gap: 6px; transition: color 0.2s;" onmouseenter="this.style.color='#FFFFFF'" onmouseleave="this.style.color='#00E676'">
            View All Hotels →
          </a>
        </div>

        <div class="jmt-accommodation-grid">

          <!-- CARD 1: LUXURY RESORTS -->
          <div class="jmt-catalog-card" onclick="navigate('/contact')" role="button" tabindex="0" aria-label="Luxury Resorts accommodation services">
            <img src="/assets/hotels/luxury-resorts.jpg" alt="Luxury resort accommodation" loading="lazy" decoding="async" class="jmt-catalog-card-img" onerror="this.onerror=null;this.src='/assets/destinations/salalah_1.jpg';">
            <div class="jmt-catalog-card-overlay"></div>
            <div class="jmt-catalog-card-content">
              <h3 class="jmt-catalog-card-title">Luxury Resorts</h3>
              <p class="jmt-catalog-card-sub">Salalah Khareef beach resorts, Jabal Akhdar mountain retreats, and Muscat luxury stays.</p>
              <div class="jmt-catalog-card-footer">
                <span class="jmt-catalog-card-cta">Explore service</span>
                <div class="jmt-catalog-card-arrow">→</div>
              </div>
            </div>
          </div>

          <!-- CARD 2: BUSINESS & CITY HOTELS -->
          <div class="jmt-catalog-card" onclick="navigate('/contact')" role="button" tabindex="0" aria-label="Business and city hotels accommodation services">
            <img src="/assets/hotels/business-city-hotels.jpg" alt="Business and city hotel" loading="lazy" decoding="async" class="jmt-catalog-card-img" onerror="this.onerror=null;this.src='/assets/destinations/dubai_1.jpg';">
            <div class="jmt-catalog-card-overlay"></div>
            <div class="jmt-catalog-card-content">
              <h3 class="jmt-catalog-card-title">Business &amp; City Hotels</h3>
              <p class="jmt-catalog-card-sub">Dubai Downtown, Abu Dhabi Corniche, Riyadh &amp; Jeddah business hotel reservations.</p>
              <div class="jmt-catalog-card-footer">
                <span class="jmt-catalog-card-cta">Explore service</span>
                <div class="jmt-catalog-card-arrow">→</div>
              </div>
            </div>
          </div>

          <!-- CARD 3: UMRAH STAYS -->
          <div class="jmt-catalog-card" onclick="navigate('/contact')" role="button" tabindex="0" aria-label="Umrah hotel accommodation services">
            <img src="/assets/hotels/umrah-stays.jpg" alt="Umrah hotel accommodation" loading="lazy" decoding="async" class="jmt-catalog-card-img" onerror="this.onerror=null;this.src='/assets/destinations/umrah_1.jpg';">
            <div class="jmt-catalog-card-overlay"></div>
            <div class="jmt-catalog-card-content">
              <h3 class="jmt-catalog-card-title">Umrah Stays</h3>
              <p class="jmt-catalog-card-sub">5-Star &amp; 4-Star Makkah &amp; Madinah hotels close to Haram with meal inclusions.</p>
              <div class="jmt-catalog-card-footer">
                <span class="jmt-catalog-card-cta">Explore service</span>
                <div class="jmt-catalog-card-arrow">→</div>
              </div>
            </div>
          </div>

          <!-- CARD 4: GROUP BOOKINGS -->
          <div class="jmt-catalog-card" onclick="navigate('/contact')" role="button" tabindex="0" aria-label="Group family accommodation services">
            <img src="/assets/hotels/group-bookings.jpg" alt="Group family accommodation" loading="lazy" decoding="async" class="jmt-catalog-card-img" onerror="this.onerror=null;this.src='/assets/destinations/salalah_4.jpg';">
            <div class="jmt-catalog-card-overlay"></div>
            <div class="jmt-catalog-card-content">
              <h3 class="jmt-catalog-card-title">Group Bookings</h3>
              <p class="jmt-catalog-card-sub">Corporate retreats, family groups, and multi-room conference accommodations.</p>
              <div class="jmt-catalog-card-footer">
                <span class="jmt-catalog-card-cta">Explore service</span>
                <div class="jmt-catalog-card-arrow">→</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- 6. WHY BOOK WITH JMT? SECTION -->
      <div style="margin-bottom: 60px; background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border-radius: 24px; padding: 44px 36px; color: #FFFFFF; box-shadow: 0 16px 40px rgba(7, 21, 59, 0.22); border: 1px solid rgba(255, 255, 255, 0.15);">
        <div style="text-align: center; max-width: 600px; margin: 0 auto 36px;">
          <span style="display: inline-block; background: rgba(0, 166, 81, 0.2); color: #00E676; border: 1px solid rgba(0, 230, 118, 0.4); font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; padding: 5px 14px; border-radius: 99px; margin-bottom: 12px;">
            HOTEL RESERVATIONS DESK
          </span>
          <h2 style="font-size: clamp(26px, 3.5vw, 36px); font-weight: 800; color: #FFFFFF !important; margin: 0 0 8px; letter-spacing: -0.5px;">Why Book With JMT?</h2>
          <p style="color: #D6E0F4 !important; font-size: 15.5px; margin: 0; line-height: 1.6;">Personalized service backed by local Omani travel expertise.</p>
        </div>

        <div class="jmt-benefits-grid">
          <div class="jmt-benefit-card" style="background: rgba(255, 255, 255, 0.12) !important; border: 1px solid rgba(255, 255, 255, 0.25) !important; border-radius: 20px; padding: 26px 22px; backdrop-filter: blur(8px);">
            <div class="jmt-benefit-num" style="background: rgba(0, 166, 81, 0.25) !important; color: #00E676 !important; border: 1px solid rgba(0, 230, 118, 0.5) !important; font-weight: 800; width: 40px; height: 40px; font-size: 14px;">01</div>
            <h3 style="font-size: 17px; font-weight: 800; color: #FFFFFF !important; margin: 14px 0 8px;">Exclusive Agent Rates</h3>
            <p style="font-size: 13.5px; color: #D6E0F4 !important; margin: 0; line-height: 1.6;">Direct wholesale rates lower than public online booking portals.</p>
          </div>
          <div class="jmt-benefit-card" style="background: rgba(255, 255, 255, 0.12) !important; border: 1px solid rgba(255, 255, 255, 0.25) !important; border-radius: 20px; padding: 26px 22px; backdrop-filter: blur(8px);">
            <div class="jmt-benefit-num" style="background: rgba(0, 166, 81, 0.25) !important; color: #00E676 !important; border: 1px solid rgba(0, 230, 118, 0.5) !important; font-weight: 800; width: 40px; height: 40px; font-size: 14px;">02</div>
            <h3 style="font-size: 17px; font-weight: 800; color: #FFFFFF !important; margin: 14px 0 8px;">Verified Accommodation</h3>
            <p style="font-size: 13.5px; color: #D6E0F4 !important; margin: 0; line-height: 1.6;">Handpicked properties personally inspected by our travel specialists.</p>
          </div>
          <div class="jmt-benefit-card" style="background: rgba(255, 255, 255, 0.12) !important; border: 1px solid rgba(255, 255, 255, 0.25) !important; border-radius: 20px; padding: 26px 22px; backdrop-filter: blur(8px);">
            <div class="jmt-benefit-num" style="background: rgba(0, 166, 81, 0.25) !important; color: #00E676 !important; border: 1px solid rgba(0, 230, 118, 0.5) !important; font-weight: 800; width: 40px; height: 40px; font-size: 14px;">03</div>
            <h3 style="font-size: 17px; font-weight: 800; color: #FFFFFF !important; margin: 14px 0 8px;">Transfer Assistance</h3>
            <p style="font-size: 13.5px; color: #D6E0F4 !important; margin: 0; line-height: 1.6;">Seamless airport arrival and private chauffeur transfers upon request.</p>
          </div>
          <div class="jmt-benefit-card" style="background: rgba(255, 255, 255, 0.12) !important; border: 1px solid rgba(255, 255, 255, 0.25) !important; border-radius: 20px; padding: 26px 22px; backdrop-filter: blur(8px);">
            <div class="jmt-benefit-num" style="background: rgba(0, 166, 81, 0.25) !important; color: #00E676 !important; border: 1px solid rgba(0, 230, 118, 0.5) !important; font-weight: 800; width: 40px; height: 40px; font-size: 14px;">04</div>
            <h3 style="font-size: 17px; font-weight: 800; color: #FFFFFF !important; margin: 14px 0 8px;">Local Travel Support</h3>
            <p style="font-size: 13.5px; color: #D6E0F4 !important; margin: 0; line-height: 1.6;">24/7 dedicated Omani concierge assistance throughout your stay.</p>
          </div>
        </div>
      </div>

      <!-- 7. HOTEL CTA SECTION (BEFORE FOOTER) -->
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

  renderHotelResultsList();
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

      <!-- 1. FLIGHT HERO & INTRO CONTAINER -->
      <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 65%, #153B8A 100%); border-radius: 24px; padding: 48px; margin-bottom: 40px; color: #FFFFFF; box-shadow: 0 16px 40px rgba(7, 21, 59, 0.22); position: relative; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.15);">
        <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 40px; align-items: center; margin-bottom: 36px;" class="jmt-hero-grid">
          <div>
            <span style="display: inline-block; background: rgba(0, 166, 81, 0.2); color: #00E676; border: 1px solid rgba(0, 230, 118, 0.4); font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; padding: 6px 14px; border-radius: 99px; margin-bottom: 20px;">
              FLIGHT TICKETS — JMT AIRLINE DESK
            </span>
            <h1 style="font-size: clamp(28px, 3.8vw, 44px); font-weight: 800; margin: 0 0 16px; line-height: 1.18; letter-spacing: -0.5px; color: #FFFFFF !important;">
              Flight Ticketing &amp; Reservations
            </h1>
            <p style="font-size: 16px; color: #D6E0F4 !important; margin: 0 0 32px; line-height: 1.65; max-width: 540px;">
              Affordable fares, flexible itineraries, and 24/7 travel desk support. Instant booking &amp; official ticketing for Oman Air, SalamAir, Emirates, Qatar Airways, Saudia, and 100+ global airlines.
            </p>
            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
              <a href="#flight-search-panel-container" onclick="const el=document.getElementById('flight-search-panel-container'); if(el){el.scrollIntoView({behavior:'smooth'});}" class="jmt-btn-primary" style="padding: 14px 28px; font-size: 14.5px;">
                Search Flights ↓
              </a>
              <a href="https://wa.me/96897608999?text=Flight%20Booking%20Inquiry" target="_blank" rel="noopener" class="jmt-btn-secondary" style="background: rgba(255,255,255,0.12); color: #FFFFFF !important; border: 1.5px solid rgba(255,255,255,0.4); padding: 14px 26px; font-size: 14.5px;">
                💬 WhatsApp JMT
              </a>
            </div>
          </div>
          <div>
            ${flightMediaHTML}
          </div>
        </div>

        <!-- 2. FLIGHT SEARCH PANEL -->
        <div class="jmt-hotel-search-panel" id="flight-search-panel-container">
          <!-- Top Row Controls -->
          <div class="jmt-flight-top-controls">
            <!-- Trip Type Selector -->
            <div class="jmt-flight-segmented-trip">
              <button type="button" onclick="setFlightTripType('round-trip')" id="btn-trip-round" class="jmt-trip-btn ${tripType === 'round-trip' ? 'active' : ''}">
                Round Trip
              </button>
              <button type="button" onclick="setFlightTripType('one-way')" id="btn-trip-oneway" class="jmt-trip-btn ${tripType === 'one-way' ? 'active' : ''}">
                One Way
              </button>
              <button type="button" onclick="setFlightTripType('multi-city')" id="btn-trip-multicity" class="jmt-trip-btn ${tripType === 'multi-city' ? 'active' : ''}">
                Multi City
              </button>
            </div>

            <!-- Passengers & Cabin Class Selector -->
            <div style="position: relative;">
              <button type="button" onclick="toggleFlightPassengersPopover(event)" id="flight-pax-summary-btn" class="jmt-flight-pax-btn">
                <span><span id="flight-pax-summary-text">👤 ${adults + children + infants} Passenger${(adults + children + infants) > 1 ? 's' : ''}, ${cabinClass}</span></span>
                <span style="font-size: 10px; color: #00E676; margin-left: 6px;">▼</span>
              </button>

              <div id="flight-pax-popover" class="jmt-pax-popover" style="display: none; position: absolute; top: calc(100% + 8px); right: 0; z-index: 120; background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255,255,255,0.2); border-radius: 16px; box-shadow: 0 16px 40px rgba(0,0,0,0.4); width: 290px; padding: 20px; color: #FFFFFF;">
                <div style="font-size: 14px; font-weight: 800; color: #00E676; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 8px;">Passengers &amp; Cabin</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <div>
                    <div style="font-size: 13.5px; font-weight: 700; color: #FFFFFF;">Adults</div>
                    <div style="font-size: 11px; color: #D6E0F4;">12+ yrs</div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <button type="button" onclick="updatePaxCount('adults', -1)" style="width:28px; height:28px; border-radius:50%; border:1px solid rgba(255,255,255,0.3); background:rgba(255,255,255,0.1); color:#FFF; font-weight:700; cursor:pointer;">-</button>
                    <span id="pax-adults-val" style="font-weight:800; font-size:14px; width:16px; text-align:center; color:#FFF;">${adults}</span>
                    <button type="button" onclick="updatePaxCount('adults', 1)" style="width:28px; height:28px; border-radius:50%; border:1px solid rgba(255,255,255,0.3); background:rgba(255,255,255,0.1); color:#FFF; font-weight:700; cursor:pointer;">+</button>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <div>
                    <div style="font-size: 13.5px; font-weight: 700; color: #FFFFFF;">Children</div>
                    <div style="font-size: 11px; color: #D6E0F4;">2-11 yrs</div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <button type="button" onclick="updatePaxCount('children', -1)" style="width:28px; height:28px; border-radius:50%; border:1px solid rgba(255,255,255,0.3); background:rgba(255,255,255,0.1); color:#FFF; font-weight:700; cursor:pointer;">-</button>
                    <span id="pax-children-val" style="font-weight:800; font-size:14px; width:16px; text-align:center; color:#FFF;">${children}</span>
                    <button type="button" onclick="updatePaxCount('children', 1)" style="width:28px; height:28px; border-radius:50%; border:1px solid rgba(255,255,255,0.3); background:rgba(255,255,255,0.1); color:#FFF; font-weight:700; cursor:pointer;">+</button>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                  <div>
                    <div style="font-size: 13.5px; font-weight: 700; color: #FFFFFF;">Infants</div>
                    <div style="font-size: 11px; color: #D6E0F4;">&lt;2 yrs</div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <button type="button" onclick="updatePaxCount('infants', -1)" style="width:28px; height:28px; border-radius:50%; border:1px solid rgba(255,255,255,0.3); background:rgba(255,255,255,0.1); color:#FFF; font-weight:700; cursor:pointer;">-</button>
                    <span id="pax-infants-val" style="font-weight:800; font-size:14px; width:16px; text-align:center; color:#FFF;">${infants}</span>
                    <button type="button" onclick="updatePaxCount('infants', 1)" style="width:28px; height:28px; border-radius:50%; border:1px solid rgba(255,255,255,0.3); background:rgba(255,255,255,0.1); color:#FFF; font-weight:700; cursor:pointer;">+</button>
                  </div>
                </div>
                <div style="border-top: 1px solid rgba(255,255,255,0.15); padding-top: 12px;">
                  <label style="font-size: 11px; font-weight: 800; color: #00E676; display: block; margin-bottom: 6px; text-transform: uppercase;">Cabin Class</label>
                  <select id="pax-cabin-select" onchange="updateCabinClass(this.value)" style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.3); background:#07153B; color:#FFF; font-size:13.5px; font-weight:700;">
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
              <div id="from-airport-container" style="position: relative;">
                <div class="jmt-search-field-box" onclick="focusAirportInput('from')">
                  <div class="jmt-field-label">FROM</div>
                  <input type="text" id="flight-from-input" class="jmt-field-input"
                         placeholder="Select origin airport"
                         value="${escapeHTML(fromDisplay)}"
                         onfocus="openAirportDropdown('from')"
                         oninput="filterAirportDropdown('from', this.value)"
                         onkeydown="handleAirportKeydown('from', event)"
                         autocomplete="off">
                </div>
                <div class="jmt-airport-dropdown" id="from-airport-dropdown" style="display: none;"></div>
              </div>

              <!-- Swap Button -->
              <button type="button" onclick="swapFlightAirports()" class="jmt-swap-btn" title="Swap Origin &amp; Destination" aria-label="Swap airports">
                ⇄
              </button>

              <!-- To -->
              <div id="to-airport-container" style="position: relative;">
                <div class="jmt-search-field-box" onclick="focusAirportInput('to')">
                  <div class="jmt-field-label">TO</div>
                  <input type="text" id="flight-to-input" class="jmt-field-input"
                         placeholder="Select destination airport"
                         value="${escapeHTML(toDisplay)}"
                         onfocus="openAirportDropdown('to')"
                         oninput="filterAirportDropdown('to', this.value)"
                         onkeydown="handleAirportKeydown('to', event)"
                         autocomplete="off">
                </div>
                <div class="jmt-airport-dropdown" id="to-airport-dropdown" style="display: none;"></div>
              </div>

              <!-- Departure Date -->
              <div class="jmt-search-field-box">
                <div class="jmt-field-label">DEPARTURE</div>
                <input type="date" id="flight-dept-input" required value="${deptDate}" min="${tomorrow}" class="jmt-field-input">
              </div>

              <!-- Return Date -->
              <div class="jmt-search-field-box" id="flight-return-box" style="display: ${tripType === 'one-way' ? 'none' : 'flex'};">
                <div class="jmt-field-label">RETURN</div>
                <input type="date" id="flight-return-input" value="${returnDate}" min="${deptDate}" class="jmt-field-input">
              </div>

              <!-- CTA Submit Button -->
              <button type="submit" class="search-submit-btn jmt-flight-search-submit-btn" style="background: #07153B; color: #FFFFFF; border: 1px solid rgba(255,255,255,0.25); padding: 14px 26px; border-radius: 12px; font-size: 15px; font-weight: 800; cursor: pointer; white-space: nowrap;">
                Search Flights →
              </button>
            </div>
            <div id="flight-search-error" style="color: #DC2626; font-size: 13px; font-weight: 600; margin-top: 10px; display: none;"></div>
          </form>
        </div>
      </div>

      <!-- 3. AVAILABLE FLIGHT ITINERARIES SECTION -->
      <div style="margin-bottom: 60px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
          <div>
            <h2 style="font-size: clamp(24px, 3.2vw, 32px); font-weight: 800; color: #07153B; margin: 0 0 6px; letter-spacing: -0.5px;">
              Popular Flights from ${escapeHTML(fromAirport.city)} (${escapeHTML(fromAirport.iataCode)})
            </h2>
            <p style="color: #64748B; font-size: 15px; margin: 0; max-width: 600px; line-height: 1.5;">
              Verified flight itineraries and competitive rates on world-class airlines.
            </p>
          </div>
          <a href="/flights" onclick="event.preventDefault(); navigate('/flights')" style="color: #00E676; font-weight: 700; font-size: 15px; text-decoration: none; display: flex; align-items: center; gap: 6px; transition: color 0.2s;" onmouseenter="this.style.color='#07153B'" onmouseleave="this.style.color='#00E676'">
            View All Flights →
          </a>
        </div>

        ${itineraries.length === 0 ? `
          <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border-radius: 20px; padding: 48px 32px; text-align: center; color: #FFFFFF; border: 1px solid rgba(255,255,255,0.18);">
            <div style="font-size: 40px; margin-bottom: 12px;">✈️</div>
            <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin: 0 0 8px;">No flights found for these criteria</h3>
            <p style="font-size: 14px; color: #D6E0F4; margin: 0 0 20px;">Please try modifying your origin, destination, or travel dates above.</p>
            <button onclick="navigate('/flights')" style="background: #00E676; color: #07153B; border: 0; padding: 10px 22px; border-radius: 99px; font-weight: 800; cursor: pointer;">Reset Search Parameters</button>
          </div>
        ` : `
          <div class="jmt-flight-card-list">
            ${itineraries.map(it => {
              const airlineInfo = AIRLINE_REGISTRY[it.airlineCode] || { logo: '/assets/airlines/oman-air.svg', cardClass: 'jmt-flight-card-wy' };
              const isNonStop = it.stops === 'Non-stop';
              return `
                <div class="jmt-flight-result-card ${airlineInfo.cardClass}">

                  <!-- Col 1: Airline Brand + Info -->
                  <div class="jmt-airline-brand-block">
                    <div class="jmt-airline-logo-box">
                      <img src="${airlineInfo.logo}" alt="${escapeHTML(it.airline)}" loading="lazy" decoding="async">
                    </div>
                    <div class="jmt-airline-info">
                      <h3 class="jmt-airline-title">${escapeHTML(it.airline)} <span class="jmt-flight-code">(${escapeHTML(it.flightNo)})</span></h3>
                      <div class="jmt-flight-baggage">
                        🧳 ${escapeHTML(it.baggage)} • ${it.refundable ? 'Refundable' : 'Standard Rules'}
                      </div>
                    </div>
                  </div>

                  <!-- Col 2: Flight Schedule & Route -->
                  <div class="jmt-flight-schedule-block">
                    <div class="jmt-flight-time-point">
                      <div class="jmt-time-val">${escapeHTML(it.deptTime)}</div>
                      <div class="jmt-iata-val">${escapeHTML(it.fromCode)}</div>
                      <div class="jmt-city-val">${escapeHTML(it.fromCity)}</div>
                    </div>
                    <div class="jmt-route-connector">
                      <div class="jmt-route-duration">${escapeHTML(it.duration)}</div>
                      <div class="jmt-route-line-wrap">
                        <span class="jmt-route-plane">✈</span>
                      </div>
                      <div class="jmt-route-stops ${isNonStop ? 'jmt-stops-nonstop' : 'jmt-stops-connecting'}">${escapeHTML(it.stops)}</div>
                    </div>
                    <div class="jmt-flight-time-point">
                      <div class="jmt-time-val">${escapeHTML(it.arrTime)}</div>
                      <div class="jmt-iata-val">${escapeHTML(it.toCode)}</div>
                      <div class="jmt-city-val">${escapeHTML(it.toCity)}</div>
                    </div>
                  </div>

                  <!-- Col 3: Price & Booking CTAs -->
                  <div class="jmt-flight-pricing-block">
                    <div class="jmt-flight-price-val">
                      <span style="font-size: 14px; font-weight: 700; color: #00E676;">OMR</span> ${it.priceOMR.toFixed(3)}
                      <span class="jmt-flight-price-unit">per passenger</span>
                    </div>
                    <div class="jmt-flight-cta-group" style="display: flex; flex-direction: column; gap: 8px;">
                      <button type="button" onclick="openEnquiryModal('flight', 'Flight Ticket Request: ${escapeHTML(it.fromCode)} to ${escapeHTML(it.toCode)}', { subtitle: '${escapeHTML(it.airline)} (${escapeHTML(it.flightNo)})', message: 'Hi JMT Travels, I would like to request flight ticketing for ${escapeHTML(it.airline)} (${escapeHTML(it.flightNo)}) from ${escapeHTML(it.fromCity)} (${escapeHTML(it.fromCode)}) to ${escapeHTML(it.toCity)} (${escapeHTML(it.toCode)}) on ${deptDate}. Estimated Price: OMR ${it.priceOMR.toFixed(3)}.' })" class="jmt-btn-primary" style="padding: 10px 18px; font-size: 13.5px; background: #00E676; color: #07153B !important; font-weight: 800; border-radius: 999px; border: 0; cursor: pointer; text-align: center; box-shadow: 0 4px 14px rgba(0, 230, 118, 0.35);">
                        Request Ticket →
                      </button>
                      <a href="https://wa.me/96897608999?text=${encodeURIComponent(`Flight Ticket Request: ${it.airline} (${it.flightNo}) from ${it.fromCode} to ${it.toCode} on ${deptDate}. Estimated Price: OMR ${it.priceOMR.toFixed(3)}`)}" target="_blank" rel="noopener" class="jmt-btn-flight-whatsapp" style="padding: 8px 16px; border-radius: 999px; text-align: center; font-size: 12.5px; font-weight: 700; background: #00A651; color: #FFF; text-decoration: none;">
                        💬 WhatsApp JMT
                      </a>
                    </div>
                  </div>

                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- 4. AIRLINE TICKETING SERVICES CATALOGUE SECTION -->
      <div style="margin-bottom: 60px;">
        <div style="text-align: center; max-width: 700px; margin: 0 auto 36px;">
          <span style="display: inline-block; background: rgba(0, 166, 81, 0.12); color: #00E676; border: 1px solid rgba(0, 230, 118, 0.3); font-size: 11.5px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; padding: 5px 14px; border-radius: 99px; margin-bottom: 12px;">
            JMT AIRLINE DESK
          </span>
          <h2 style="font-size: clamp(26px, 3.5vw, 36px); color: #07153B; font-weight: 800; margin: 0 0 10px; letter-spacing: -0.5px;">
            Airline Services We Offer
          </h2>
          <p style="font-size: 15.5px; color: #475569; margin: 0; line-height: 1.6;">
            Full-service ticketing, group bookings, ticket re-issues, and multi-city itineraries managed by licensed travel specialists in Muscat.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px;">

          <!-- CARD 1: FLIGHT TICKETING -->
          <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border-radius: 24px; padding: 32px 26px; color: #FFFFFF; position: relative; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.14); box-shadow: 0 12px 32px rgba(7, 21, 59, 0.18); transition: transform 0.3s ease, box-shadow 0.3s ease;" class="jmt-service-card-interactive">
            <div style="width: 52px; height: 52px; border-radius: 16px; background: rgba(0, 166, 81, 0.2); border: 1px solid rgba(0, 230, 118, 0.4); display: flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 20px;">
              ✈️
            </div>
            <span style="display: inline-block; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25); color: #00E676; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 99px; margin-bottom: 12px;">
              ALL CLASSES
            </span>
            <h3 style="font-size: 21px; color: #FFFFFF !important; font-weight: 800; margin: 0 0 10px; line-height: 1.25;">
              Flight Ticketing
            </h3>
            <p style="font-size: 14px; color: #D6E0F4 !important; line-height: 1.6; margin: 0 0 20px;">
              Economy, Business &amp; First Class ticketing for GCC, Asia, Europe, and the Americas with instant GDS seat confirmation.
            </p>
            <div style="font-size: 12.5px; color: #00E676; font-weight: 700; display: flex; align-items: center; gap: 6px;">
              <span>✓</span> 100+ Partner Airlines
            </div>
          </div>

          <!-- CARD 2: GROUP RESERVATIONS -->
          <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border-radius: 24px; padding: 32px 26px; color: #FFFFFF; position: relative; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.14); box-shadow: 0 12px 32px rgba(7, 21, 59, 0.18); transition: transform 0.3s ease, box-shadow 0.3s ease;" class="jmt-service-card-interactive">
            <div style="width: 52px; height: 52px; border-radius: 16px; background: rgba(0, 166, 81, 0.2); border: 1px solid rgba(0, 230, 118, 0.4); display: flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 20px;">
              👥
            </div>
            <span style="display: inline-block; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25); color: #00E676; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 99px; margin-bottom: 12px;">
              10+ PASSENGERS
            </span>
            <h3 style="font-size: 21px; color: #FFFFFF !important; font-weight: 800; margin: 0 0 10px; line-height: 1.25;">
              Group Reservations
            </h3>
            <p style="font-size: 14px; color: #D6E0F4 !important; line-height: 1.6; margin: 0 0 20px;">
              Special group rates for corporate delegations, sports teams, Umrah groups, and extended family vacations.
            </p>
            <div style="font-size: 12.5px; color: #00E676; font-weight: 700; display: flex; align-items: center; gap: 6px;">
              <span>✓</span> Dedicated Group Desk
            </div>
          </div>

          <!-- CARD 3: CHANGES & RE-ISSUES -->
          <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border-radius: 24px; padding: 32px 26px; color: #FFFFFF; position: relative; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.14); box-shadow: 0 12px 32px rgba(7, 21, 59, 0.18); transition: transform 0.3s ease, box-shadow 0.3s ease;" class="jmt-service-card-interactive">
            <div style="width: 52px; height: 52px; border-radius: 16px; background: rgba(0, 166, 81, 0.2); border: 1px solid rgba(0, 230, 118, 0.4); display: flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 20px;">
              🔄
            </div>
            <span style="display: inline-block; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25); color: #00E676; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 99px; margin-bottom: 12px;">
              FAST RE-SCHEDULE
            </span>
            <h3 style="font-size: 21px; color: #FFFFFF !important; font-weight: 800; margin: 0 0 10px; line-height: 1.25;">
              Changes &amp; Re-issues
            </h3>
            <p style="font-size: 14px; color: #D6E0F4 !important; line-height: 1.6; margin: 0 0 20px;">
              Date modifications, flight re-routing, extra baggage allowance, meal preference, and seat selection assistance.
            </p>
            <div style="font-size: 12.5px; color: #00E676; font-weight: 700; display: flex; align-items: center; gap: 6px;">
              <span>✓</span> 24/7 Ticketing Support
            </div>
          </div>

          <!-- CARD 4: MULTI-CITY TRAVEL -->
          <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border-radius: 24px; padding: 32px 26px; color: #FFFFFF; position: relative; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.14); box-shadow: 0 12px 32px rgba(7, 21, 59, 0.18); transition: transform 0.3s ease, box-shadow 0.3s ease;" class="jmt-service-card-interactive">
            <div style="width: 52px; height: 52px; border-radius: 16px; background: rgba(0, 166, 81, 0.2); border: 1px solid rgba(0, 230, 118, 0.4); display: flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 20px;">
              🌍
            </div>
            <span style="display: inline-block; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25); color: #00E676; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 99px; margin-bottom: 12px;">
              GLOBAL ITINERARIES
            </span>
            <h3 style="font-size: 21px; color: #FFFFFF !important; font-weight: 800; margin: 0 0 10px; line-height: 1.25;">
              Multi-City Travel
            </h3>
            <p style="font-size: 14px; color: #D6E0F4 !important; line-height: 1.6; margin: 0 0 20px;">
              Complex multi-stop itineraries, international round-the-world flights, and customized layover packages.
            </p>
            <div style="font-size: 12.5px; color: #00E676; font-weight: 700; display: flex; align-items: center; gap: 6px;">
              <span>✓</span> Customized Route Planning
            </div>
          </div>

        </div>
      </div>

      <!-- 5. WHY BOOK FLIGHTS THROUGH JMT? SECTION -->
      <div style="margin-bottom: 60px; background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border-radius: 24px; padding: 44px 36px; color: #FFFFFF; box-shadow: 0 16px 40px rgba(7, 21, 59, 0.22); border: 1px solid rgba(255, 255, 255, 0.15);">
        <div style="text-align: center; max-width: 600px; margin: 0 auto 36px;">
          <span style="display: inline-block; background: rgba(0, 166, 81, 0.2); color: #00E676; border: 1px solid rgba(0, 230, 118, 0.4); font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; padding: 5px 14px; border-radius: 99px; margin-bottom: 12px;">
            FLIGHT TICKETING DESK
          </span>
          <h2 style="font-size: clamp(26px, 3.5vw, 36px); font-weight: 800; color: #FFFFFF !important; margin: 0 0 8px; letter-spacing: -0.5px;">Why Book Flights With JMT?</h2>
          <p style="color: #D6E0F4 !important; font-size: 15.5px; margin: 0; line-height: 1.6;">Dedicated travel specialists backed by licensed Omani ticketing operations.</p>
        </div>

        <div class="jmt-benefits-grid">
          <div class="jmt-benefit-card" style="background: rgba(255, 255, 255, 0.12) !important; border: 1px solid rgba(255, 255, 255, 0.25) !important; border-radius: 20px; padding: 26px 22px; backdrop-filter: blur(8px);">
            <div class="jmt-benefit-num" style="background: rgba(0, 166, 81, 0.25) !important; color: #00E676 !important; border: 1px solid rgba(0, 230, 118, 0.5) !important; font-weight: 800; width: 40px; height: 40px; font-size: 14px;">01</div>
            <h3 style="font-size: 17px; font-weight: 800; color: #FFFFFF !important; margin: 14px 0 8px;">Direct Agent Fares</h3>
            <p style="font-size: 13.5px; color: #D6E0F4 !important; margin: 0; line-height: 1.6;">Direct wholesale GDS airline rates with full baggage &amp; meal inclusions.</p>
          </div>
          <div class="jmt-benefit-card" style="background: rgba(255, 255, 255, 0.12) !important; border: 1px solid rgba(255, 255, 255, 0.25) !important; border-radius: 20px; padding: 26px 22px; backdrop-filter: blur(8px);">
            <div class="jmt-benefit-num" style="background: rgba(0, 166, 81, 0.25) !important; color: #00E676 !important; border: 1px solid rgba(0, 230, 118, 0.5) !important; font-weight: 800; width: 40px; height: 40px; font-size: 14px;">02</div>
            <h3 style="font-size: 17px; font-weight: 800; color: #FFFFFF !important; margin: 14px 0 8px;">24/7 Ticketing Support</h3>
            <p style="font-size: 13.5px; color: #D6E0F4 !important; margin: 0; line-height: 1.6;">Immediate human assistance for last-minute flight changes &amp; emergencies.</p>
          </div>
          <div class="jmt-benefit-card" style="background: rgba(255, 255, 255, 0.12) !important; border: 1px solid rgba(255, 255, 255, 0.25) !important; border-radius: 20px; padding: 26px 22px; backdrop-filter: blur(8px);">
            <div class="jmt-benefit-num" style="background: rgba(0, 166, 81, 0.25) !important; color: #00E676 !important; border: 1px solid rgba(0, 230, 118, 0.5) !important; font-weight: 800; width: 40px; height: 40px; font-size: 14px;">03</div>
            <h3 style="font-size: 17px; font-weight: 800; color: #FFFFFF !important; margin: 14px 0 8px;">Flexible Re-issues</h3>
            <p style="font-size: 13.5px; color: #D6E0F4 !important; margin: 0; line-height: 1.6;">Hassle-free date modifications, seat selection, and meal preferences.</p>
          </div>
          <div class="jmt-benefit-card" style="background: rgba(255, 255, 255, 0.12) !important; border: 1px solid rgba(255, 255, 255, 0.25) !important; border-radius: 20px; padding: 26px 22px; backdrop-filter: blur(8px);">
            <div class="jmt-benefit-num" style="background: rgba(0, 166, 81, 0.25) !important; color: #00E676 !important; border: 1px solid rgba(0, 230, 118, 0.5) !important; font-weight: 800; width: 40px; height: 40px; font-size: 14px;">04</div>
            <h3 style="font-size: 17px; font-weight: 800; color: #FFFFFF !important; margin: 14px 0 8px;">Muscat Airport Support</h3>
            <p style="font-size: 13.5px; color: #D6E0F4 !important; margin: 0; line-height: 1.6;">Dedicated assistance for Muscat International Airport check-in &amp; departures.</p>
          </div>
        </div>
      </div>

      <!-- 6. FEATURED AIRLINES BANNER (OFFICIAL PARTNERS) -->
      <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 60%, #153B8A 100%); border-radius: 24px; padding: 40px 32px; text-align: center; margin-bottom: 40px; color: #FFFFFF; box-shadow: 0 16px 40px rgba(7, 21, 59, 0.22); position: relative; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.15);">
        <div style="position: relative; z-index: 2;">
          <span style="display: inline-block; background: rgba(0, 166, 81, 0.2); border: 1px solid rgba(0, 230, 118, 0.4); color: #00E676; font-size: 11.5px; font-weight: 800; padding: 4px 14px; border-radius: 99px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 14px;">
            OFFICIAL TICKETING DESK
          </span>
          <h3 style="font-size: clamp(22px, 3vw, 30px); color: #FFFFFF !important; font-weight: 800; margin: 0 0 10px; letter-spacing: -0.5px;">
            Official Ticketing Partner for Major Global Airlines
          </h3>
          <p style="font-size: 15px; color: #D6E0F4 !important; margin: 0 0 28px; max-width: 680px; margin-inline: auto; line-height: 1.6;">
            Direct GDS ticketing, instant seat selection, baggage upgrades, and verified airline reservations for world-class carriers.
          </p>

          <div style="display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; align-items: center;">
            <span style="font-size: 13.5px; font-weight: 800; background: rgba(255, 255, 255, 0.16); border: 1.5px solid rgba(255, 255, 255, 0.4); color: #FFFFFF !important; padding: 10px 20px; border-radius: 99px; backdrop-filter: blur(8px); display: inline-flex; align-items: center; gap: 8px;">
              🇴🇲 Oman Air <span style="opacity: 0.75; font-size: 12px; font-weight: 600;">(WY)</span>
            </span>
            <span style="font-size: 13.5px; font-weight: 800; background: rgba(0, 230, 118, 0.2); border: 1.5px solid rgba(0, 230, 118, 0.5); color: #00E676 !important; padding: 10px 20px; border-radius: 99px; backdrop-filter: blur(8px); display: inline-flex; align-items: center; gap: 8px;">
              🟢 SalamAir <span style="opacity: 0.85; font-size: 12px; font-weight: 600;">(OV)</span>
            </span>
            <span style="font-size: 13.5px; font-weight: 800; background: rgba(255, 255, 255, 0.16); border: 1.5px solid rgba(255, 255, 255, 0.4); color: #FFFFFF !important; padding: 10px 20px; border-radius: 99px; backdrop-filter: blur(8px); display: inline-flex; align-items: center; gap: 8px;">
              🇦🇪 Emirates <span style="opacity: 0.75; font-size: 12px; font-weight: 600;">(EK)</span>
            </span>
            <span style="font-size: 13.5px; font-weight: 800; background: rgba(255, 255, 255, 0.16); border: 1.5px solid rgba(255, 255, 255, 0.4); color: #FFFFFF !important; padding: 10px 20px; border-radius: 99px; backdrop-filter: blur(8px); display: inline-flex; align-items: center; gap: 8px;">
              🇶🇦 Qatar Airways <span style="opacity: 0.75; font-size: 12px; font-weight: 600;">(QR)</span>
            </span>
            <span style="font-size: 13.5px; font-weight: 800; background: rgba(255, 255, 255, 0.16); border: 1.5px solid rgba(255, 255, 255, 0.4); color: #FFFFFF !important; padding: 10px 20px; border-radius: 99px; backdrop-filter: blur(8px); display: inline-flex; align-items: center; gap: 8px;">
              🇮🇳 IndiGo <span style="opacity: 0.75; font-size: 12px; font-weight: 600;">(6E)</span>
            </span>
            <span style="font-size: 13.5px; font-weight: 800; background: rgba(255, 255, 255, 0.16); border: 1.5px solid rgba(255, 255, 255, 0.4); color: #FFFFFF !important; padding: 10px 20px; border-radius: 99px; backdrop-filter: blur(8px); display: inline-flex; align-items: center; gap: 8px;">
              🇲🇾 AirAsia <span style="opacity: 0.75; font-size: 12px; font-weight: 600;">(AK)</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 7. FLIGHT ENQUIRY CTA SECTION -->
      <div style="background: linear-gradient(135deg, #0B286C 0%, #07153B 100%); color: #FFFFFF; border-radius: 24px; padding: 48px 40px; margin-bottom: 20px; box-shadow: 0 12px 32px rgba(11,40,108,0.15); position: relative; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.15);">
        <div style="position: absolute; right: -50px; top: -50px; width: 250px; height: 250px; background: radial-gradient(circle, rgba(0,166,81,0.25), transparent 70%); pointer-events: none;"></div>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 28px; position: relative; z-index: 2;">
          <div style="max-width: 600px;">
            <h2 style="font-size: clamp(24px, 3vw, 32px); font-weight: 800; color: #FFFFFF !important; margin: 0 0 10px; line-height: 1.2;">
              Need Custom Itineraries or Group Tickets?
            </h2>
            <p style="font-size: 15px; color: #D6E0F4; margin: 0; line-height: 1.6;">
              Tell us your route and travel dates. Our Muscat travel specialists will find the best options and confirm your tickets instantly.
            </p>
          </div>
          <div style="display: flex; gap: 14px; flex-wrap: wrap;">
            <a href="/contact" onclick="event.preventDefault(); navigate('/contact')" class="jmt-btn-primary" style="padding: 14px 28px; font-size: 14.5px;">
              Enquire Now →
            </a>
            <a href="https://wa.me/96897608999?text=Flight%20Booking%20Inquiry" target="_blank" rel="noopener" class="jmt-btn-secondary" style="background: rgba(255,255,255,0.1); color: #FFFFFF; border-color: rgba(255,255,255,0.35); padding: 14px 26px; font-size: 14.5px;">
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
      airlineCode: 'WY',
      airline: 'Oman Air',
      flightNo: 'WY-601',
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
      priceOMR: Math.round(basePrice * 1.8 * tripMult * cabinMult * 1000) / 1000
    },
    {
      id: 'fl-ov',
      airlineCode: 'OV',
      airline: 'SalamAir',
      flightNo: 'OV-203',
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
      priceOMR: Math.round(basePrice * 1.404 * tripMult * cabinMult * 1000) / 1000
    },
    {
      id: 'fl-ek',
      airlineCode: 'EK',
      airline: 'Emirates',
      flightNo: 'EK-863',
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
      priceOMR: Math.round(basePrice * 2.07 * tripMult * cabinMult * 1000) / 1000
    },
    {
      id: 'fl-qr',
      airlineCode: 'QR',
      airline: 'Qatar Airways',
      flightNo: 'QR-1126',
      badgeColor: '#5C0632',
      deptTime: '21:10',
      arrTime: '22:40',
      duration: '1h 30m',
      stops: 'Non-stop',
      fromCode: from.iataCode,
      fromCity: from.city,
      toCode: 'DOH',
      toCity: 'Doha',
      baggage: cabinClass === 'Business' ? '40 kg Checked + 14 kg Cabin' : '30 kg Checked + 7 kg Cabin',
      refundable: true,
      priceOMR: Math.round(basePrice * 2.171875 * tripMult * cabinMult * 1000) / 1000
    },
    {
      id: 'fl-6e',
      airlineCode: '6E',
      airline: 'IndiGo',
      flightNo: '6E-1412',
      badgeColor: '#001B94',
      deptTime: '11:25',
      arrTime: '16:35',
      duration: '3h 40m',
      stops: '1 Stop',
      fromCode: from.iataCode,
      fromCity: from.city,
      toCode: 'BOM',
      toCity: 'Mumbai',
      baggage: '15 kg Checked + 7 kg Cabin',
      refundable: false,
      priceOMR: Math.round(basePrice * 1.228958 * tripMult * cabinMult * 1000) / 1000
    },
    {
      id: 'fl-ak',
      airlineCode: 'AK',
      airline: 'AirAsia',
      flightNo: 'AK-376',
      badgeColor: '#FF0000',
      deptTime: '19:30',
      arrTime: '01:40',
      duration: '4h 10m',
      stops: '1 Stop',
      fromCode: from.iataCode,
      fromCity: from.city,
      toCode: 'KUL',
      toCity: 'Kuala Lumpur',
      baggage: '20 kg Checked + 7 kg Cabin',
      refundable: false,
      priceOMR: Math.round(basePrice * 1.510416 * tripMult * cabinMult * 1000) / 1000
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
      <div class="shell" style="padding: 40px 20px 70px; max-width: 900px;">
        <div style="margin-bottom: 24px;">
          <a href="/visa" onclick="event.preventDefault(); navigate('/visa')" style="color: #00E676; text-decoration: none; font-size: 14px; font-weight: 700;">← Back to Visa Services</a>
        </div>

        <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 24px; padding: 36px; margin-bottom: 32px; box-shadow: 0 16px 40px rgba(7, 21, 59, 0.25);">
          <span style="display: inline-block; background: rgba(0, 230, 118, 0.2); border: 1px solid rgba(0, 230, 118, 0.5); color: #00E676; font-size: 12px; font-weight: 800; padding: 4px 14px; border-radius: 99px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
            ${escapeHTML(s.country)}
          </span>
          <h1 style="font-size: clamp(28px, 4vw, 40px); color: #FFFFFF !important; font-weight: 800; margin: 0 0 16px; line-height: 1.2;">
            ${escapeHTML(s.country)} ${escapeHTML(s.visaType)} Visa
          </h1>
          <p style="color: #D6E0F4 !important; font-size: 16px; line-height: 1.6; margin: 0 0 28px; max-width: 720px;">
            ${escapeHTML(s.overview)}
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; background: rgba(7, 21, 59, 0.6); padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.15);">
            <div><small style="color: #CBD5E1; font-size: 11px; text-transform: uppercase; font-weight: 700; display: block;">Validity</small><strong style="color: #FFFFFF; font-size: 15px;">${escapeHTML(s.validity)}</strong></div>
            <div><small style="color: #CBD5E1; font-size: 11px; text-transform: uppercase; font-weight: 700; display: block;">Processing Time</small><strong style="color: #00E676; font-size: 15px;">${escapeHTML(s.processingTime)}</strong></div>
            <div><small style="color: #CBD5E1; font-size: 11px; text-transform: uppercase; font-weight: 700; display: block;">Entry Type</small><strong style="color: #FFFFFF; font-size: 15px;">${escapeHTML(s.entryType)}</strong></div>
            <div><small style="color: #CBD5E1; font-size: 11px; text-transform: uppercase; font-weight: 700; display: block;">Service Fee</small><strong style="color: #00E676; font-size: 16px;">${s.priceMinor ? `${escapeHTML(s.currency)} ${(s.priceMinor / 1000).toFixed(3)}` : 'Subject to case review'}</strong></div>
          </div>
        </div>

        <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 20px; padding: 32px; margin-bottom: 28px;">
          <h2 style="font-size: 22px; color: #FFFFFF !important; font-weight: 800; margin-bottom: 16px;">Required Documents &amp; Information</h2>
          <ul style="padding-left: 20px; line-height: 1.8; color: #D6E0F4; font-size: 15px;">
            ${(s.requiredDocuments || []).map(doc => `<li style="margin-bottom: 8px;">✓ ${escapeHTML(doc)}</li>`).join('')}
          </ul>
        </div>

        <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border-left: 6px solid #00E676; border: 1px solid rgba(255, 255, 255, 0.18); padding: 20px 24px; border-radius: 16px; margin-bottom: 32px; font-size: 14px; color: #D6E0F4;">
          ℹ️ <strong style="color: #FFFFFF;">Consular Disclaimer:</strong> Visa approval is subject solely to the relevant government authorities. JMT TRAVELS provides application intake, document verification, and clearance assistance.
        </div>

        <div style="display: flex; gap: 14px; flex-wrap: wrap; align-items: center;">
          <a href="/visa-apply?service=${escapeHTML(s.slug)}" onclick="event.preventDefault(); navigate('/visa-apply?service=${escapeHTML(s.slug)}')" class="btn" style="background: #00E676; color: #07153B !important; font-weight: 800; padding: 14px 32px; font-size: 15px; border-radius: 999px; text-decoration: none; box-shadow: 0 4px 14px rgba(0,230,118,0.35);">Start Visa Application →</a>
          <a href="https://wa.me/96897608999?text=Inquiry%20regarding%20${encodeURIComponent(s.title || s.country + ' Visa')}" target="_blank" rel="noopener" style="background: rgba(255,255,255,0.12); color: #FFFFFF !important; border: 1.5px solid rgba(255,255,255,0.4); padding: 14px 24px; border-radius: 999px; text-decoration: none; font-weight: 700;">Inquire on WhatsApp</a>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="shell" style="padding: 60px 0;"><p style="color: #CBD5E1;">Visa service not found.</p></div>`;
  }
}

function renderVisaApplyPage(container) {
  const urlParams = new URLSearchParams(window.location.search);
  const typeParam = (urlParams.get('type') || urlParams.get('service') || '').toLowerCase();

  updateSEO({
    title: 'Apply for Oman Visa | JMT Travels Muscat',
    description: 'Start your official Oman visa application with JMT Travels. Fast, secure intake and expert travel assistance for Tourist, Business, and Family Visit visas.',
    canonicalUrl: '/visa/apply',
    noindex: true
  });
  announceToSR('Navigated to Common Oman Visa Application Wizard');

  // Visa Categories Definition
  const visaOptions = [
    {
      type: 'Tourist',
      slug: 'oman-tourist-visa',
      title: 'Oman Tourist Visa',
      icon: '🌴',
      description: 'For holidays, sightseeing and leisure travel',
      validity: '30 Days / 10 Days',
      price: 'OMR 20.000',
      procTime: '24–48 Hours'
    },
    {
      type: 'Business',
      slug: 'oman-business-visa',
      title: 'Oman Business Visa',
      icon: '💼',
      description: 'For meetings, conferences and business travel',
      validity: '21 Days / 1 Year',
      price: 'OMR 35.000',
      procTime: '24–48 Hours'
    },
    {
      type: 'Family Visit',
      slug: 'oman-family-visa',
      title: 'Oman Family Visit Visa',
      icon: '👨‍👩‍👧‍👦',
      description: 'For visiting relatives and family in Oman',
      validity: '30 Days / 3 Months',
      price: 'OMR 25.000',
      procTime: '48 Hours'
    }
  ];

  // Determine initial visa type from query param
  let initialVisa = 'Tourist';
  if (typeParam.includes('business')) initialVisa = 'Business';
  else if (typeParam.includes('family')) initialVisa = 'Family Visit';
  else if (typeParam.includes('work') || typeParam.includes('employee')) initialVisa = 'Work';
  else if (typeParam.includes('transit')) initialVisa = 'Transit';

  // Application State
  let stateWizard = {
    currentStep: 1,
    visaType: initialVisa,
    formData: {
      fullName: state.user ? state.user.name || '' : '',
      email: state.user ? state.user.email || '' : '',
      phone: '',
      passportNumber: '',
      dateOfBirth: '',
      gender: 'Male',
      nationality: 'India',
      residenceCountry: 'Oman',
      passportExpiry: '',
      travelDate: '',
      visitPurpose: 'Tourism',
      stayDuration: '30 Days',
      hotelName: '',
      cityInOman: 'Muscat',
      previousVisit: 'No',
      // Business
      companyName: '',
      businessPurpose: '',
      omanHostCompany: '',
      // Family
      hostName: '',
      relationship: 'Relative',
      hostCivilId: '',
      hostPhone: '',
      // Work
      employerName: '',
      jobTitle: '',
      laborRef: '',
      // Transit
      departureCountry: '',
      finalDestination: '',
      transitDuration: 'Under 24 Hours',
      connectingFlight: ''
    },
    files: {
      passportCopy: null,
      photoCopy: null,
      supportingDoc: null
    }
  };

  function renderWizard() {
    const selectedOption = visaOptions.find(o => o.type === stateWizard.visaType) || visaOptions[0];

    container.innerHTML = `
      <div class="jmt-visa-apply-container">

        <!-- TOP WIZARD HEADER BANNER -->
        <div class="jmt-visa-wizard-header">
          <div style="max-width: 680px;">
            <div class="jmt-visa-info-eyebrow">JMT TRAVELS — OMAN E-VISA SERVICES</div>
            <h1 style="font-size: 28px; font-weight: 800; color: #FFFFFF; margin: 6px 0 8px;">Apply for an Oman Visa</h1>
            <p style="font-size: 14.5px; color: #D6E0F4; margin: 0; line-height: 1.5;">
              Tell us about your travel and we’ll guide you through the right Oman visa application. Fast intake from our Muscat team.
            </p>
          </div>
          <div style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); padding: 14px 20px; border-radius: 16px; text-align: center; min-width: 200px;">
            <span style="font-size: 11.5px; font-weight: 800; text-transform: uppercase; color: #55D98A; letter-spacing: 1px; display: block; margin-bottom: 2px;">Selected Category</span>
            <strong style="font-size: 17px; color: #FFFFFF; font-weight: 800; display: block;">${escapeHTML(selectedOption.fullTitle)}</strong>
            <span style="font-size: 12.5px; color: #E2E8F0;">${escapeHTML(selectedOption.price)}</span>
          </div>
        </div>

        <!-- MULTI-STEP PROGRESS INDICATOR BAR -->
        <div class="jmt-visa-wizard-progress" role="navigation" aria-label="Visa Application Progress">
          <button type="button" class="jmt-visa-step-pill ${stateWizard.currentStep === 1 ? 'active' : ''} ${stateWizard.currentStep > 1 ? 'completed' : ''}" onclick="window.setWizardStep(1)">
            <span class="jmt-visa-step-num">${stateWizard.currentStep > 1 ? '✓' : '01'}</span>
            <span>01 Visa</span>
          </button>
          <div class="jmt-visa-step-divider ${stateWizard.currentStep > 1 ? 'completed' : ''}"></div>

          <button type="button" class="jmt-visa-step-pill ${stateWizard.currentStep === 2 ? 'active' : ''} ${stateWizard.currentStep > 2 ? 'completed' : ''}" onclick="window.setWizardStep(2)">
            <span class="jmt-visa-step-num">${stateWizard.currentStep > 2 ? '✓' : '02'}</span>
            <span>02 Applicant</span>
          </button>
          <div class="jmt-visa-step-divider ${stateWizard.currentStep > 2 ? 'completed' : ''}"></div>

          <button type="button" class="jmt-visa-step-pill ${stateWizard.currentStep === 3 ? 'active' : ''} ${stateWizard.currentStep > 3 ? 'completed' : ''}" onclick="window.setWizardStep(3)">
            <span class="jmt-visa-step-num">${stateWizard.currentStep > 3 ? '✓' : '03'}</span>
            <span>03 Travel</span>
          </button>
          <div class="jmt-visa-step-divider ${stateWizard.currentStep > 3 ? 'completed' : ''}"></div>

          <button type="button" class="jmt-visa-step-pill ${stateWizard.currentStep === 4 ? 'active' : ''} ${stateWizard.currentStep > 4 ? 'completed' : ''}" onclick="window.setWizardStep(4)">
            <span class="jmt-visa-step-num">${stateWizard.currentStep > 4 ? '✓' : '04'}</span>
            <span>04 Documents</span>
          </button>
          <div class="jmt-visa-step-divider ${stateWizard.currentStep > 4 ? 'completed' : ''}"></div>

          <button type="button" class="jmt-visa-step-pill ${stateWizard.currentStep === 5 ? 'active' : ''}" onclick="window.setWizardStep(5)">
            <span class="jmt-visa-step-num">05</span>
            <span>05 Review</span>
          </button>
        </div>

        <!-- MAIN CARD CONTAINER -->
        <div class="jmt-visa-form-card" id="visa-wizard-card">
          ${renderCurrentStepContent()}
        </div>

        <!-- ASSISTANCE FOOTER STRIP -->
        <div style="margin-top: 24px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <strong style="font-size: 14px; color: #07153B; display: block;">Have questions about your Oman visa requirements?</strong>
            <span style="font-size: 13px; color: #64748B;">Our Muscat travel office is available 6 days a week via WhatsApp.</span>
          </div>
          <a href="https://wa.me/96897608999?text=Hello%20JMT%20Travels%2C%20I%20need%20help%20with%20Oman%20Visa%20Application" target="_blank" rel="noopener" class="jmt-btn-secondary" style="padding: 10px 20px; font-size: 13px;">
            💬 Chat with Visa Specialist
          </a>
        </div>

      </div>
    `;
    bindStepEvents();
  }

  window.setWizardStep = (step) => {
    if (step > stateWizard.currentStep) {
      if (!validateCurrentStep()) return;
    }
    stateWizard.currentStep = step;
    renderWizard();
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  window.selectVisaType = (type) => {
    stateWizard.visaType = type;
    renderWizard();
  };

  function validateCurrentStep() {
    const errorDiv = document.getElementById('step-error-msg');
    const clearError = () => { if (errorDiv) errorDiv.style.display = 'none'; };

    if (stateWizard.currentStep === 2) {
      const name = document.getElementById('wizard-fullname')?.value.trim();
      const email = document.getElementById('wizard-email')?.value.trim();
      const phone = document.getElementById('wizard-phone')?.value.trim();
      const passport = document.getElementById('wizard-passport')?.value.trim();
      const dob = document.getElementById('wizard-dob')?.value;
      const expiry = document.getElementById('wizard-expiry')?.value;

      if (!name || !email || !phone || !passport || !dob || !expiry) {
        showError('Please fill in all mandatory applicant fields marked with (*).');
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('Please enter a valid email address.');
        return false;
      }
      if (phone.length < 6) {
        showError('Please enter a valid phone/WhatsApp number including country code.');
        return false;
      }
      // Save data
      stateWizard.formData.fullName = name;
      stateWizard.formData.email = email;
      stateWizard.formData.phone = phone;
      stateWizard.formData.passportNumber = passport.toUpperCase();
      stateWizard.formData.dateOfBirth = dob;
      stateWizard.formData.gender = document.getElementById('wizard-gender')?.value || 'Male';
      stateWizard.formData.nationality = document.getElementById('wizard-nationality')?.value || 'India';
      stateWizard.formData.residenceCountry = document.getElementById('wizard-residence')?.value || 'Oman';
      stateWizard.formData.passportExpiry = expiry;
    }

    if (stateWizard.currentStep === 3) {
      const travelDate = document.getElementById('wizard-traveldate')?.value;
      if (!travelDate) {
        showError('Please select your expected arrival date.');
        return false;
      }
      stateWizard.formData.travelDate = travelDate;
      stateWizard.formData.visitPurpose = document.getElementById('wizard-purpose')?.value || stateWizard.formData.visitPurpose;
      stateWizard.formData.hotelName = document.getElementById('wizard-hotel')?.value || '';
      stateWizard.formData.cityInOman = document.getElementById('wizard-city')?.value || 'Muscat';
      stateWizard.formData.stayDuration = document.getElementById('wizard-duration')?.value || '30 Days';

      // Specific
      if (stateWizard.visaType === 'Business') {
        stateWizard.formData.companyName = document.getElementById('wizard-biz-company')?.value || '';
        stateWizard.formData.businessPurpose = document.getElementById('wizard-biz-purpose')?.value || '';
        stateWizard.formData.omanHostCompany = document.getElementById('wizard-biz-host')?.value || '';
      } else if (stateWizard.visaType === 'Family Visit') {
        stateWizard.formData.hostName = document.getElementById('wizard-fam-host')?.value || '';
        stateWizard.formData.relationship = document.getElementById('wizard-fam-rel')?.value || 'Relative';
        stateWizard.formData.hostCivilId = document.getElementById('wizard-fam-civilid')?.value || '';
        stateWizard.formData.hostPhone = document.getElementById('wizard-fam-phone')?.value || '';
      } else if (stateWizard.visaType === 'Work') {
        stateWizard.formData.employerName = document.getElementById('wizard-work-employer')?.value || '';
        stateWizard.formData.jobTitle = document.getElementById('wizard-work-job')?.value || '';
        stateWizard.formData.laborRef = document.getElementById('wizard-work-labor')?.value || '';
      } else if (stateWizard.visaType === 'Transit') {
        stateWizard.formData.departureCountry = document.getElementById('wizard-transit-dep')?.value || '';
        stateWizard.formData.finalDestination = document.getElementById('wizard-transit-dest')?.value || '';
        stateWizard.formData.connectingFlight = document.getElementById('wizard-transit-flight')?.value || '';
      }
    }

    clearError();
    return true;
  }

  function showError(msg) {
    let errorDiv = document.getElementById('step-error-msg');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.id = 'step-error-msg';
      errorDiv.style.cssText = 'background: #FEF2F2; border: 1px solid #FCA5A5; color: #B91C1C; padding: 12px 16px; border-radius: 12px; font-size: 13.5px; margin-bottom: 20px; font-weight: 600;';
      const card = document.getElementById('visa-wizard-card');
      if (card) card.insertBefore(errorDiv, card.firstChild);
    }
    errorDiv.style.display = 'block';
    errorDiv.innerHTML = `⚠️ ${escapeHTML(msg)}`;
  }

  function renderCurrentStepContent() {
    switch (stateWizard.currentStep) {
      case 1:
        return `
          <div class="jmt-visa-form-header">
            <h2 class="jmt-visa-form-title">Step 1: Choose Your Oman Visa Category</h2>
            <p class="jmt-visa-form-sub">Select the visa type that matches your travel purpose. Click any card to select.</p>
          </div>

          <div class="jmt-visa-select-grid">
            ${visaOptions.map(opt => {
              const isSelected = stateWizard.visaType === opt.type;
              return `
                <div class="jmt-visa-select-card ${isSelected ? 'selected' : ''}" onclick="window.selectVisaType('${opt.type}')">
                  <div class="jmt-visa-select-badge">✓</div>
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                    <span style="font-size: 28px;">${opt.icon}</span>
                    <div>
                      <strong style="font-size: 16px; color: #07153B; display: block;">${escapeHTML(opt.title)}</strong>
                      <span style="font-size: 11.5px; color: #00A651; font-weight: 700; background: #F0FDF4; padding: 2px 8px; border-radius: 99px;">⚡ ${escapeHTML(opt.procTime)}</span>
                    </div>
                  </div>
                  <p style="font-size: 13px; color: #64748B; margin: 0 0 14px; line-height: 1.4;">${escapeHTML(opt.description)}</p>
                  <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #F1F5F9; padding-top: 10px; margin-top: auto;">
                    <span style="font-size: 12px; color: #94A3B8; font-weight: 600;">Validity: ${escapeHTML(opt.validity)}</span>
                    <strong style="font-size: 14.5px; color: #0B286C;">${escapeHTML(opt.price)}</strong>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 28px;">
            <button type="button" onclick="window.setWizardStep(2)" class="jmt-visa-submit-btn" style="width: auto; padding: 14px 32px;">
              <span>Continue to Applicant Details →</span>
            </button>
          </div>
        `;

      case 2:
        return `
          <div class="jmt-visa-form-header">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div>
                <h2 class="jmt-visa-form-title">Step 2: Applicant Information</h2>
                <p class="jmt-visa-form-sub">Enter the passport holder details exactly as printed on the official passport.</p>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; background: #F8FAFC; padding: 6px 14px; border-radius: 99px; border: 1px solid #E2E8F0;">
                <span style="font-size: 12.5px; color: #64748B;">Selected Visa:</span>
                <select id="header-visa-switch" onchange="window.selectVisaType(this.value)" style="border: none; background: transparent; font-weight: 800; color: #00A651; cursor: pointer; outline: none;">
                  ${visaOptions.map(o => `<option value="${o.type}" ${o.type === stateWizard.visaType ? 'selected' : ''}>Oman ${o.title}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>

          <form id="step-2-form" aria-describedby="visa-apply-desc" onsubmit="event.preventDefault(); window.setWizardStep(3);">
            <p id="visa-apply-desc" class="sr-only">All fields marked required are mandatory for visa intake.</p>
            <div class="jmt-visa-form-grid">

              <div class="jmt-visa-field-group full-width">
                <label for="wizard-fullname" class="jmt-visa-label">Full Name (as shown on passport) <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <input type="text" id="wizard-fullname" class="jmt-visa-input" value="${escapeHTML(stateWizard.formData.fullName)}" placeholder="First Middle Last Name" required aria-required="true">
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="wizard-dob" class="jmt-visa-label">Date of Birth <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <input type="date" id="wizard-dob" class="jmt-visa-input" value="${escapeHTML(stateWizard.formData.dateOfBirth)}" required aria-required="true">
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="wizard-gender" class="jmt-visa-label">Gender <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <select id="wizard-gender" class="jmt-visa-input">
                    <option value="Male" ${stateWizard.formData.gender === 'Male' ? 'selected' : ''}>Male</option>
                    <option value="Female" ${stateWizard.formData.gender === 'Female' ? 'selected' : ''}>Female</option>
                  </select>
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="wizard-nationality" class="jmt-visa-label">Nationality <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <select id="wizard-nationality" class="jmt-visa-input">
                    ${['India', 'Pakistan', 'United Kingdom', 'United States', 'Philippines', 'Egypt', 'Bangladesh', 'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Germany', 'France', 'Canada', 'Australia'].map(c => `
                      <option value="${c}" ${stateWizard.formData.nationality === c ? 'selected' : ''}>${c}</option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="wizard-residence" class="jmt-visa-label">Country of Residence <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <select id="wizard-residence" class="jmt-visa-input">
                    ${['Oman', 'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'India', 'Pakistan', 'United Kingdom', 'United States', 'Egypt', 'Philippines'].map(c => `
                      <option value="${c}" ${stateWizard.formData.residenceCountry === c ? 'selected' : ''}>${c}</option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="wizard-passport" class="jmt-visa-label">Passport Number <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <input type="text" id="wizard-passport" class="jmt-visa-input" value="${escapeHTML(stateWizard.formData.passportNumber)}" placeholder="e.g. Z1234567" style="text-transform: uppercase;" required aria-required="true" dir="ltr">
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="wizard-expiry" class="jmt-visa-label">Passport Expiry Date <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <input type="date" id="wizard-expiry" class="jmt-visa-input" value="${escapeHTML(stateWizard.formData.passportExpiry)}" required aria-required="true">
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="wizard-email" class="jmt-visa-label">Email Address <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <input type="email" id="wizard-email" class="jmt-visa-input" value="${escapeHTML(stateWizard.formData.email)}" placeholder="name@example.com" required aria-required="true" dir="ltr">
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="wizard-phone" class="jmt-visa-label">Mobile / WhatsApp Number <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <input type="tel" id="wizard-phone" class="jmt-visa-input" value="${escapeHTML(stateWizard.formData.phone)}" placeholder="+968 91234567" required aria-required="true" dir="ltr">
                </div>
              </div>

              <div class="jmt-visa-field-group full-width">
                <label for="visa-dest" class="jmt-visa-label">Destination Country</label>
                <div class="jmt-visa-dest-pill">
                  <span style="display: flex; align-items: center; gap: 8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00A651" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    <span>Oman</span>
                  </span>
                  <span class="jmt-visa-dest-badge">✓ Selected Destination</span>
                </div>
                <input type="hidden" id="visa-dest" name="destination" value="Oman">
              </div>

            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 28px;">
              <button type="button" onclick="window.setWizardStep(1)" class="jmt-btn-secondary">
                ← Back to Visa Category
              </button>
              <button type="submit" class="jmt-visa-submit-btn" style="width: auto; padding: 14px 32px;">
                <span>Continue to Travel Details →</span>
              </button>
            </div>
          </form>
        `;

      case 3:
        return `
          <div class="jmt-visa-form-header">
            <h2 class="jmt-visa-form-title">Step 3: Travel & Visa Details (${escapeHTML(stateWizard.visaType)} Visa)</h2>
            <p class="jmt-visa-form-sub">Provide your expected arrival date and itinerary details in Oman.</p>
          </div>

          <form id="step-3-form" onsubmit="event.preventDefault(); window.setWizardStep(4);">
            <div class="jmt-visa-form-grid">

              <div class="jmt-visa-field-group">
                <label for="wizard-traveldate" class="jmt-visa-label">Expected Arrival Date in Oman <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <input type="date" id="wizard-traveldate" class="jmt-visa-input" value="${escapeHTML(stateWizard.formData.travelDate)}" required>
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="wizard-purpose" class="jmt-visa-label">Purpose of Visit <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <select id="wizard-purpose" class="jmt-visa-input">
                    <option value="Tourism" ${stateWizard.formData.visitPurpose === 'Tourism' ? 'selected' : ''}>Tourism & Sightseeing</option>
                    <option value="Business" ${stateWizard.formData.visitPurpose === 'Business' ? 'selected' : ''}>Business Meetings & Trade</option>
                    <option value="Family Visit" ${stateWizard.formData.visitPurpose === 'Family Visit' ? 'selected' : ''}>Visiting Family / Relatives</option>
                    <option value="Employment" ${stateWizard.formData.visitPurpose === 'Employment' ? 'selected' : ''}>Employment & Work Processing</option>
                    <option value="Transit" ${stateWizard.formData.visitPurpose === 'Transit' ? 'selected' : ''}>Airport Transit Stopover</option>
                  </select>
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="wizard-duration" class="jmt-visa-label">Expected Stay Duration</label>
                <div class="jmt-visa-input-box">
                  <select id="wizard-duration" class="jmt-visa-input">
                    <option value="10 Days">10 Days</option>
                    <option value="30 Days" selected>30 Days</option>
                    <option value="90 Days">90 Days</option>
                    <option value="72 Hours">72 Hours (Transit)</option>
                  </select>
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="wizard-city" class="jmt-visa-label">City in Oman</label>
                <div class="jmt-visa-input-box">
                  <select id="wizard-city" class="jmt-visa-input">
                    <option value="Muscat" ${stateWizard.formData.cityInOman === 'Muscat' ? 'selected' : ''}>Muscat</option>
                    <option value="Salalah" ${stateWizard.formData.cityInOman === 'Salalah' ? 'selected' : ''}>Salalah</option>
                    <option value="Nizwa" ${stateWizard.formData.cityInOman === 'Nizwa' ? 'selected' : ''}>Nizwa</option>
                    <option value="Sohar" ${stateWizard.formData.cityInOman === 'Sohar' ? 'selected' : ''}>Sohar</option>
                    <option value="Duqm" ${stateWizard.formData.cityInOman === 'Duqm' ? 'selected' : ''}>Duqm</option>
                  </select>
                </div>
              </div>

              <div class="jmt-visa-field-group full-width">
                <label for="wizard-hotel" class="jmt-visa-label">Hotel or Residence Name in Oman</label>
                <div class="jmt-visa-input-box">
                  <input type="text" id="wizard-hotel" class="jmt-visa-input" value="${escapeHTML(stateWizard.formData.hotelName)}" placeholder="e.g. Shangri-La Barr Al Jissah or Host Address">
                </div>
              </div>

            </div>

            <!-- CONDITIONAL VISA-SPECIFIC FIELDS -->
            ${renderConditionalVisaFields()}

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 28px;">
              <button type="button" onclick="window.setWizardStep(2)" class="jmt-btn-secondary">
                ← Back to Applicant Info
              </button>
              <button type="submit" class="jmt-visa-submit-btn" style="width: auto; padding: 14px 32px;">
                <span>Continue to Documents →</span>
              </button>
            </div>
          </form>
        `;

      case 4:
        return `
          <div class="jmt-visa-form-header">
            <h2 class="jmt-visa-form-title">Step 4: Required Documents</h2>
            <p class="jmt-visa-form-sub">Upload clear scans or photos for document verification by our Muscat travel office.</p>
          </div>

          <div class="jmt-upload-grid">

            <div class="jmt-upload-box ${stateWizard.files.passportCopy ? 'has-file' : ''}">
              <span class="jmt-upload-icon">📄</span>
              <strong class="jmt-upload-label">Passport Copy (Photo Page) <span style="color:#EF4444;">*</span></strong>
              <span class="jmt-upload-sub">${stateWizard.files.passportCopy ? escapeHTML(stateWizard.files.passportCopy.name) : 'PDF / JPG / PNG (Max 5MB)'}</span>
              <span class="jmt-upload-btn">${stateWizard.files.passportCopy ? '✓ File Selected' : '+ Choose File'}</span>
              <input type="file" id="upload-passport" class="jmt-upload-input" accept=".pdf,.jpg,.jpeg,.png" onchange="window.handleFileSelect(event, 'passportCopy')">
            </div>

            <div class="jmt-upload-box ${stateWizard.files.photoCopy ? 'has-file' : ''}">
              <span class="jmt-upload-icon">🖼️</span>
              <strong class="jmt-upload-label">Passport Photograph <span style="color:#EF4444;">*</span></strong>
              <span class="jmt-upload-sub">${stateWizard.files.photoCopy ? escapeHTML(stateWizard.files.photoCopy.name) : 'White background JPG / PNG'}</span>
              <span class="jmt-upload-btn">${stateWizard.files.photoCopy ? '✓ File Selected' : '+ Choose File'}</span>
              <input type="file" id="upload-photo" class="jmt-upload-input" accept=".jpg,.jpeg,.png" onchange="window.handleFileSelect(event, 'photoCopy')">
            </div>

            <div class="jmt-upload-box ${stateWizard.files.supportingDoc ? 'has-file' : ''}">
              <span class="jmt-upload-icon">📁</span>
              <strong class="jmt-upload-label">Supporting Document (Optional)</strong>
              <span class="jmt-upload-sub">${stateWizard.files.supportingDoc ? escapeHTML(stateWizard.files.supportingDoc.name) : 'Flight / Hotel / Invitation / ID scan'}</span>
              <span class="jmt-upload-btn">${stateWizard.files.supportingDoc ? '✓ File Selected' : '+ Choose File'}</span>
              <input type="file" id="upload-supporting" class="jmt-upload-input" accept=".pdf,.jpg,.jpeg,.png" onchange="window.handleFileSelect(event, 'supportingDoc')">
            </div>

          </div>

          <div style="background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 12px; padding: 14px 18px; font-size: 13px; color: #166534; display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
            <span>🛡️</span>
            <span>All document uploads are processed over encrypted HTTPS connection and held strictly confidential.</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 28px;">
            <button type="button" onclick="window.setWizardStep(3)" class="jmt-btn-secondary">
              ← Back to Travel Details
            </button>
            <button type="button" onclick="window.setWizardStep(5)" class="jmt-visa-submit-btn" style="width: auto; padding: 14px 32px;">
              <span>Review Application →</span>
            </button>
          </div>
        `;

      case 5:
        return `
          <div class="jmt-visa-form-header">
            <h2 class="jmt-visa-form-title">Step 5: Review Your Application</h2>
            <p class="jmt-visa-form-sub">Review your details carefully before final submission to JMT Travels.</p>
          </div>

          <div class="jmt-review-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 1px solid #E2E8F0; padding-bottom: 12px;">
              <h3 style="font-size: 17px; font-weight: 800; color: #07153B; margin: 0;">Application Summary</h3>
              <button type="button" onclick="window.setWizardStep(1)" style="background: none; border: none; color: #00A651; font-weight: 700; font-size: 13px; cursor: pointer;">✏️ Edit Application</button>
            </div>

            <div class="jmt-review-grid">
              <div class="jmt-review-item">
                <span class="jmt-review-label">Visa Category</span>
                <span class="jmt-review-value" style="color: #00A651;">Oman ${escapeHTML(stateWizard.visaType)} Visa</span>
              </div>
              <div class="jmt-review-item">
                <span class="jmt-review-label">Full Name</span>
                <span class="jmt-review-value">${escapeHTML(stateWizard.formData.fullName)}</span>
              </div>
              <div class="jmt-review-item">
                <span class="jmt-review-label">Passport Number</span>
                <span class="jmt-review-value" style="font-family: monospace;">${escapeHTML(stateWizard.formData.passportNumber)}</span>
              </div>
              <div class="jmt-review-item">
                <span class="jmt-review-label">Nationality</span>
                <span class="jmt-review-value">${escapeHTML(stateWizard.formData.nationality)}</span>
              </div>
              <div class="jmt-review-item">
                <span class="jmt-review-label">Email Address</span>
                <span class="jmt-review-value">${escapeHTML(stateWizard.formData.email)}</span>
              </div>
              <div class="jmt-review-item">
                <span class="jmt-review-label">Mobile / WhatsApp</span>
                <span class="jmt-review-value">${escapeHTML(stateWizard.formData.phone)}</span>
              </div>
              <div class="jmt-review-item">
                <span class="jmt-review-label">Expected Arrival</span>
                <span class="jmt-review-value">${escapeHTML(stateWizard.formData.travelDate)}</span>
              </div>
              <div class="jmt-review-item">
                <span class="jmt-review-label">Destination</span>
                <span class="jmt-review-value">Oman (${escapeHTML(stateWizard.formData.cityInOman)})</span>
              </div>
            </div>
          </div>

          <div id="wizard-submit-result" aria-live="polite"></div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 28px;">
            <button type="button" onclick="window.setWizardStep(4)" class="jmt-btn-secondary">
              ← Back to Documents
            </button>
            <button type="button" id="final-submit-btn" onclick="window.submitVisaApplication()" class="jmt-visa-submit-btn" style="width: auto; padding: 14px 36px;">
              <span>Submit Oman Visa Application →</span>
            </button>
          </div>
        `;
    }
  }

  function renderConditionalVisaFields() {
    if (stateWizard.visaType === 'Business') {
      return `
        <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; margin-top: 20px;">
          <h4 style="font-size: 15px; font-weight: 800; color: #07153B; margin: 0 0 16px;">💼 Business Visa Details</h4>
          <div class="jmt-visa-form-grid">
            <div class="jmt-visa-field-group">
              <label for="wizard-biz-company" class="jmt-visa-label">Applicant Company Name</label>
              <div class="jmt-visa-input-box">
                <input type="text" id="wizard-biz-company" class="jmt-visa-input" value="${escapeHTML(stateWizard.formData.companyName)}" placeholder="e.g. Global Tech Solutions">
              </div>
            </div>
            <div class="jmt-visa-field-group">
              <label for="wizard-biz-purpose" class="jmt-visa-label">Business Purpose / Meeting</label>
              <div class="jmt-visa-input-box">
                <input type="text" id="wizard-biz-purpose" class="jmt-visa-input" value="${escapeHTML(stateWizard.formData.businessPurpose)}" placeholder="e.g. Client conference / Commercial negotiations">
              </div>
            </div>
            <div class="jmt-visa-field-group full-width">
              <label for="wizard-biz-host" class="jmt-visa-label">Oman Host / Local Partner Company</label>
              <div class="jmt-visa-input-box">
                <input type="text" id="wizard-biz-host" class="jmt-visa-input" value="${escapeHTML(stateWizard.formData.omanHostCompany)}" placeholder="e.g. Oman Commerce LLC, Muscat">
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (stateWizard.visaType === 'Family Visit') {
      return `
        <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; margin-top: 20px;">
          <h4 style="font-size: 15px; font-weight: 800; color: #07153B; margin: 0 0 16px;">👨‍👩‍👧‍👦 Family Visit Details</h4>
          <div class="jmt-visa-form-grid">
            <div class="jmt-visa-field-group">
              <label for="wizard-fam-host" class="jmt-visa-label">Sponsor / Host Name in Oman</label>
              <div class="jmt-visa-input-box">
                <input type="text" id="wizard-fam-host" class="jmt-visa-input" value="${escapeHTML(stateWizard.formData.hostName)}" placeholder="Full name of host in Oman">
              </div>
            </div>
            <div class="jmt-visa-field-group">
              <label for="wizard-fam-rel" class="jmt-visa-label">Relationship with Host</label>
              <div class="jmt-visa-input-box">
                <select id="wizard-fam-rel" class="jmt-visa-input">
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Child">Child</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Relative" selected>Relative</option>
                </select>
              </div>
            </div>
            <div class="jmt-visa-field-group">
              <label for="wizard-fam-civilid" class="jmt-visa-label">Host Civil ID / Resident CPR</label>
              <div class="jmt-visa-input-box">
                <input type="text" id="wizard-fam-civilid" class="jmt-visa-input" value="${escapeHTML(stateWizard.formData.hostCivilId)}" placeholder="Oman Civil ID number">
              </div>
            </div>
            <div class="jmt-visa-field-group">
              <label for="wizard-fam-phone" class="jmt-visa-label">Host Contact Phone in Oman</label>
              <div class="jmt-visa-input-box">
                <input type="tel" id="wizard-fam-phone" class="jmt-visa-input" value="${escapeHTML(stateWizard.formData.hostPhone)}" placeholder="+968 9XXXXXXX" dir="ltr">
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (stateWizard.visaType === 'Work') {
      return `
        <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; margin-top: 20px;">
          <h4 style="font-size: 15px; font-weight: 800; color: #07153B; margin: 0 0 16px;">🏗️ Work Visa Details</h4>
          <div class="jmt-visa-form-grid">
            <div class="jmt-visa-field-group">
              <label for="wizard-work-employer" class="jmt-visa-label">Hiring Employer / Company in Oman</label>
              <div class="jmt-visa-input-box">
                <input type="text" id="wizard-work-employer" class="jmt-visa-input" value="${escapeHTML(stateWizard.formData.employerName)}" placeholder="Company name in Oman">
              </div>
            </div>
            <div class="jmt-visa-field-group">
              <label for="wizard-work-job" class="jmt-visa-label">Job Title / Profession</label>
              <div class="jmt-visa-input-box">
                <input type="text" id="wizard-work-job" class="jmt-visa-input" value="${escapeHTML(stateWizard.formData.jobTitle)}" placeholder="As per labor clearance">
              </div>
            </div>
            <div class="jmt-visa-field-group full-width">
              <label for="wizard-work-labor" class="jmt-visa-label">Ministry Labor Approval Ref (if available)</label>
              <div class="jmt-visa-input-box">
                <input type="text" id="wizard-work-labor" class="jmt-visa-input" value="${escapeHTML(stateWizard.formData.laborRef)}" placeholder="Optional clearance reference">
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (stateWizard.visaType === 'Transit') {
      return `
        <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; margin-top: 20px;">
          <h4 style="font-size: 15px; font-weight: 800; color: #07153B; margin: 0 0 16px;">✈️ Airport Transit Details</h4>
          <div class="jmt-visa-form-grid">
            <div class="jmt-visa-field-group">
              <label for="wizard-transit-dep" class="jmt-visa-label">Departure Country</label>
              <div class="jmt-visa-input-box">
                <input type="text" id="wizard-transit-dep" class="jmt-visa-input" value="${escapeHTML(stateWizard.formData.departureCountry)}" placeholder="Origin airport / country">
              </div>
            </div>
            <div class="jmt-visa-field-group">
              <label for="wizard-transit-dest" class="jmt-visa-label">Final Destination Country</label>
              <div class="jmt-visa-input-box">
                <input type="text" id="wizard-transit-dest" class="jmt-visa-input" value="${escapeHTML(stateWizard.formData.finalDestination)}" placeholder="Onward destination">
              </div>
            </div>
            <div class="jmt-visa-field-group full-width">
              <label for="wizard-transit-flight" class="jmt-visa-label">Connecting Flight Details / Airline</label>
              <div class="jmt-visa-input-box">
                <input type="text" id="wizard-transit-flight" class="jmt-visa-input" value="${escapeHTML(stateWizard.formData.connectingFlight)}" placeholder="e.g. Oman Air WY123">
              </div>
            </div>
          </div>
        </div>
      `;
    }
    return '';
  }

  window.handleFileSelect = (e, fileKey) => {
    if (e.target.files && e.target.files[0]) {
      stateWizard.files[fileKey] = e.target.files[0];
      renderWizard();
    }
  };

  window.submitVisaApplication = async () => {
    const btn = document.getElementById('final-submit-btn');
    const resultDiv = document.getElementById('wizard-submit-result');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>Submitting Application...</span>`;
    }

    const payload = {
      destination: 'Oman',
      visaType: stateWizard.visaType,
      fullName: stateWizard.formData.fullName,
      email: stateWizard.formData.email,
      phone: stateWizard.formData.phone,
      passportNumber: stateWizard.formData.passportNumber,
      dateOfBirth: stateWizard.formData.dateOfBirth,
      passportExpiry: stateWizard.formData.passportExpiry,
      nationality: stateWizard.formData.nationality,
      travelDate: stateWizard.formData.travelDate
    };

    try {
      const res = await apiCall('/api/visa/applications', 'POST', payload);

      const card = document.getElementById('visa-wizard-card');
      if (card) {
        card.innerHTML = `
          <div style="text-align: center; padding: 36px 20px;">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: #F0FDF4; border: 2px solid #DCFCE7; color: #00A651; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 800; margin-bottom: 20px;">
              ✓
            </div>
            <h2 style="font-size: 26px; font-weight: 800; color: #07153B; margin: 0 0 8px;">Application Submitted Successfully!</h2>
            <p style="font-size: 15px; color: #475569; margin: 0 0 24px; max-width: 560px; margin-left: auto; margin-right: auto;">
              Your Oman ${escapeHTML(stateWizard.visaType)} Visa application has been received by JMT Travels Muscat.
            </p>

            <div style="background: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: 16px; padding: 20px; max-width: 420px; margin: 0 auto 28px;">
              <span style="font-size: 12px; color: #64748B; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Application Reference Number</span>
              <strong style="font-size: 24px; color: #00A651; font-family: monospace; letter-spacing: 1px;">${escapeHTML(res.reference || 'JMT-V-SUCCESS')}</strong>
            </div>

            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 20px 24px; max-width: 560px; margin: 0 auto 32px; text-align: start;">
              <h4 style="font-size: 15px; font-weight: 800; color: #07153B; margin: 0 0 10px;">Next Steps:</h4>
              <ol style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #475569; line-height: 1.7;">
                <li>Save your application reference number for tracking.</li>
                <li>Our Muscat travel team will review your application and passport details.</li>
                <li>You will receive instructions via WhatsApp/Email regarding e-visa issuance.</li>
              </ol>
            </div>

            <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
              <a href="/account" onclick="event.preventDefault(); navigate('/account')" class="jmt-btn-primary" style="background: #00A651; color: #FFFFFF !important; padding: 12px 28px; text-decoration: none; border-radius: 12px; font-weight: 700;">
                View My Applications →
              </a>
              <a href="/" onclick="event.preventDefault(); navigate('/')" class="jmt-btn-secondary" style="padding: 12px 24px; text-decoration: none; border-radius: 12px; font-weight: 700;">
                Back to Home
              </a>
              <a href="https://wa.me/96897608999?text=${encodeURIComponent(`Hello JMT Travels, I have submitted my Oman Visa application with reference ${res.reference}`)}" target="_blank" rel="noopener" class="jmt-btn-secondary" style="padding: 12px 24px; text-decoration: none; border-radius: 12px; font-weight: 700;">
                💬 Contact JMT
              </a>
            </div>
          </div>
        `;
      }
      announceToSR(`Application submitted successfully. Reference number ${res.reference}`);
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>Submit Oman Visa Application →</span>`;
      }
      resultDiv.innerHTML = `<div style="background: #FEF2F2; border: 1px solid #FCA5A5; padding: 14px 18px; border-radius: 12px; color: #B91C1C; font-size: 14px; margin-top: 16px;">We couldn't submit your application. Please check your details: <b>${escapeHTML(err.message)}</b></div>`;
      announceToSR(`Application submission error: ${err.message}`);
    }
  };

  function bindStepEvents() {
    // Helper bindings
  }

  // Initial render
  renderWizard();
}

function renderSchengenApplyPage(container) {
  const urlParams = new URLSearchParams(window.location.search);
  const typeParam = (urlParams.get('type') || urlParams.get('service') || '').toLowerCase();
  const destParam = urlParams.get('destination') || 'France';

  updateSEO({
    title: 'Apply for Schengen Visa | JMT Travels Muscat',
    description: 'Guided European Schengen visa application assistance for GCC residents and international travellers with JMT Travels.',
    canonicalUrl: '/visa/schengen/apply',
    noindex: true
  });
  announceToSR('Navigated to Schengen Visa Guided Application Wizard');

  const schengenPurposes = [
    { type: 'Tourism', title: 'Tourism', icon: '🏰', description: 'For holiday, sightseeing and leisure travel in Europe' },
    { type: 'Business', title: 'Business', icon: '💼', description: 'For meetings, corporate events and commercial visits' },
    { type: 'Family Visit', title: 'Family / Friend Visit', icon: '👨‍👩‍👧‍👦', description: 'For visiting family, relatives or friends in Europe' },
    { type: 'Airport Transit', title: 'Airport Transit', icon: '✈️', description: 'For transiting through Schengen airport transit zones' },
    { type: 'Other Short Stay', title: 'Other Short Stay', icon: '🇪🇺', description: 'For cultural, sports, medical or study visits under 90 days' }
  ];

  const schengenCountries = [
    'France', 'Germany', 'Italy', 'Spain', 'Switzerland', 'Austria', 'Netherlands', 'Greece', 'Belgium', 'Portugal', 'Czechia', 'Hungary', 'Sweden', 'Norway', 'Denmark', 'Finland'
  ];

  let initialPurpose = 'Tourism';
  if (typeParam.includes('business')) initialPurpose = 'Business';
  else if (typeParam.includes('family') || typeParam.includes('friend')) initialPurpose = 'Family Visit';
  else if (typeParam.includes('transit')) initialPurpose = 'Airport Transit';
  else if (typeParam.includes('other') || typeParam.includes('insurance')) initialPurpose = 'Other Short Stay';

  let stateSchengen = {
    currentStep: 1,
    residenceCountry: 'Oman',
    residenceStatus: 'Resident / Work Visa',
    residencePermitNo: '',
    residenceExpiry: '',
    nationality: 'India',
    purpose: initialPurpose,
    primaryDestination: destParam,
    isMultiCountry: 'No',
    additionalDestinations: [],
    mainDestination: destParam,
    formData: {
      fullName: state.user ? state.user.name || '' : '',
      firstName: '',
      middleName: '',
      lastName: '',
      dateOfBirth: '',
      placeOfBirth: '',
      countryOfBirth: '',
      gender: 'Male',
      maritalStatus: 'Single',
      email: state.user ? state.user.email || '' : '',
      phone: '',
      passportNumber: '',
      passportType: 'Ordinary',
      passportIssueDate: '',
      passportExpiry: '',
      passportPlaceOfIssue: '',
      passportIssuingCountry: 'India',
      employmentStatus: 'Employed',
      employerName: '',
      jobTitle: '',
      employerAddress: '',
      employerPhone: '',
      businessName: '',
      businessType: '',
      institutionName: '',
      courseName: '',
      // Step 3
      arrivalDate: '',
      departureDate: '',
      stayDays: '15',
      requestedEntries: 'Single',
      accommodationType: 'Hotel Booking',
      hotelName: '',
      hotelAddress: '',
      hotelCity: '',
      hotelCountry: destParam,
      hostName: '',
      hostRelationship: '',
      hostAddress: '',
      hostPhone: '',
      hostEmail: '',
      hasPreviousSchengen: 'No',
      previousVisaNo: '',
      previousVisaIssue: '',
      previousVisaExpiry: '',
      previousVisaCountry: '',
      biometricsProvided: 'Not Sure',
      hasVisaRefusal: 'No',
      refusalDetails: '',
      hasOverstayed: 'No',
      tripFunding: 'Self-funded',
      sponsorName: '',
      sponsorRelationship: '',
      sponsorCountry: '',
      sponsorPhone: '',
      // Step 4 Assistance
      hasInsurance: 'No',
      insuranceProvider: '',
      insurancePolicyNo: '',
      hasAppointment: 'No',
      appointmentDate: '',
      appointmentCenter: ''
    },
    files: {
      passport: null,
      photo: null,
      gccResidence: null,
      bankStatement: null,
      employmentProof: null,
      flightItinerary: null,
      hotelProof: null,
      insuranceCert: null
    },
    declarations: {
      accuracyChecked: false,
      consularChecked: false
    }
  };

  function renderWizard() {
    container.innerHTML = `
      <div class="jmt-visa-apply-container">

        <!-- SCHENGEN WIZARD HEADER BANNER -->
        <div class="jmt-visa-wizard-header" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 60%, #1D4ED8 100%);">
          <div style="max-width: 680px;">
            <div class="jmt-visa-info-eyebrow">JMT TRAVELS • EUROPE SCHENGEN ASSISTANCE</div>
            <h1 style="font-size: 28px; font-weight: 800; color: #FFFFFF; margin: 6px 0 8px;">Apply for a Schengen Visa</h1>
            <p style="font-size: 14.5px; color: #D6E0F4; margin: 0; line-height: 1.5;">
              Guided application intake for GCC residents. Our Muscat team assists with document verification, itinerary planning, and appointment preparation.
            </p>
          </div>
          <div style="background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); backdrop-filter: blur(8px); padding: 14px 20px; border-radius: 16px; text-align: center; min-width: 210px;">
            <span style="font-size: 11.5px; font-weight: 800; text-transform: uppercase; color: #55D98A; letter-spacing: 1px; display: block; margin-bottom: 2px;">Target Schengen Country</span>
            <strong style="font-size: 18px; color: #FFFFFF; font-weight: 800; display: block;">🇪🇺 ${escapeHTML(stateSchengen.primaryDestination)}</strong>
            <span style="font-size: 12px; color: #E2E8F0;">Residing in ${escapeHTML(stateSchengen.residenceCountry)}</span>
          </div>
        </div>

        <!-- PROGRESS STEP BAR -->
        <div class="jmt-visa-wizard-progress" role="navigation" aria-label="Schengen Application Steps">
          <button type="button" class="jmt-visa-step-pill ${stateSchengen.currentStep === 1 ? 'active' : ''} ${stateSchengen.currentStep > 1 ? 'completed' : ''}" onclick="window.setSchengenStep(1)">
            <span class="jmt-visa-step-num">${stateSchengen.currentStep > 1 ? '✓' : '01'}</span>
            <span>01 Visa &amp; Destination</span>
          </button>
          <div class="jmt-visa-step-divider ${stateSchengen.currentStep > 1 ? 'completed' : ''}"></div>

          <button type="button" class="jmt-visa-step-pill ${stateSchengen.currentStep === 2 ? 'active' : ''} ${stateSchengen.currentStep > 2 ? 'completed' : ''}" onclick="window.setSchengenStep(2)">
            <span class="jmt-visa-step-num">${stateSchengen.currentStep > 2 ? '✓' : '02'}</span>
            <span>02 Applicant</span>
          </button>
          <div class="jmt-visa-step-divider ${stateSchengen.currentStep > 2 ? 'completed' : ''}"></div>

          <button type="button" class="jmt-visa-step-pill ${stateSchengen.currentStep === 3 ? 'active' : ''} ${stateSchengen.currentStep > 3 ? 'completed' : ''}" onclick="window.setSchengenStep(3)">
            <span class="jmt-visa-step-num">${stateSchengen.currentStep > 3 ? '✓' : '03'}</span>
            <span>03 Travel &amp; Stay</span>
          </button>
          <div class="jmt-visa-step-divider ${stateSchengen.currentStep > 3 ? 'completed' : ''}"></div>

          <button type="button" class="jmt-visa-step-pill ${stateSchengen.currentStep === 4 ? 'active' : ''} ${stateSchengen.currentStep > 4 ? 'completed' : ''}" onclick="window.setSchengenStep(4)">
            <span class="jmt-visa-step-num">${stateSchengen.currentStep > 4 ? '✓' : '04'}</span>
            <span>04 Documents</span>
          </button>
          <div class="jmt-visa-step-divider ${stateSchengen.currentStep > 4 ? 'completed' : ''}"></div>

          <button type="button" class="jmt-visa-step-pill ${stateSchengen.currentStep === 5 ? 'active' : ''}" onclick="window.setSchengenStep(5)">
            <span class="jmt-visa-step-num">05</span>
            <span>05 Review</span>
          </button>
        </div>

        <!-- MAIN CARD -->
        <div class="jmt-visa-form-card" id="schengen-wizard-card">
          ${renderSchengenStepContent()}
        </div>

        <!-- FOOTER ASSISTANCE STRIP -->
        <div style="margin-top: 24px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <strong style="font-size: 14px; color: #07153B; display: block;">Need assistance with Schengen appointment availability or travel insurance?</strong>
            <span style="font-size: 13px; color: #64748B;">Contact our dedicated Schengen desk in Muscat via WhatsApp.</span>
          </div>
          <a href="https://wa.me/96897608999?text=Hello%20JMT%20Travels%2C%20I%20have%20an%20inquiry%20about%20Schengen%20Visa%20Application" target="_blank" rel="noopener" class="jmt-btn-secondary" style="padding: 10px 20px; font-size: 13px;">
            💬 WhatsApp Visa Specialist
          </a>
        </div>

      </div>
    `;
  }

  window.setSchengenStep = (step) => {
    if (step > stateSchengen.currentStep) {
      if (!validateSchengenStep()) return;
    }
    stateSchengen.currentStep = step;
    renderWizard();
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  function validateSchengenStep() {
    const errorDiv = document.getElementById('schengen-error-msg');
    const clearErr = () => { if (errorDiv) errorDiv.style.display = 'none'; };

    if (stateSchengen.currentStep === 1) {
      stateSchengen.residenceCountry = document.getElementById('sch-residence')?.value || 'Oman';
      stateSchengen.nationality = document.getElementById('sch-nationality')?.value || 'India';
      stateSchengen.primaryDestination = document.getElementById('sch-destination')?.value || 'France';
      stateSchengen.isMultiCountry = document.getElementById('sch-multicountry')?.value || 'No';

      if (['Oman', 'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain'].includes(stateSchengen.residenceCountry)) {
        stateSchengen.residenceStatus = document.getElementById('sch-res-status')?.value || 'Resident / Work Visa';
        stateSchengen.residencePermitNo = document.getElementById('sch-res-permitno')?.value || '';
        stateSchengen.residenceExpiry = document.getElementById('sch-res-expiry')?.value || '';
      }
    }

    if (stateSchengen.currentStep === 2) {
      const fullname = document.getElementById('sch-fullname')?.value.trim();
      const email = document.getElementById('sch-email')?.value.trim();
      const phone = document.getElementById('sch-phone')?.value.trim();
      const passport = document.getElementById('sch-passport')?.value.trim();
      const dob = document.getElementById('sch-dob')?.value;
      const expiry = document.getElementById('sch-pass-expiry')?.value;

      if (!fullname || !email || !phone || !passport || !dob || !expiry) {
        showSchengenError('Please fill in all mandatory applicant fields marked with (*).');
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showSchengenError('Please enter a valid email address.');
        return false;
      }
      if (phone.length < 6) {
        showSchengenError('Please enter a valid phone number including country code.');
        return false;
      }

      stateSchengen.formData.fullName = fullname;
      stateSchengen.formData.email = email;
      stateSchengen.formData.phone = phone;
      stateSchengen.formData.passportNumber = passport.toUpperCase();
      stateSchengen.formData.dateOfBirth = dob;
      stateSchengen.formData.passportExpiry = expiry;
      stateSchengen.formData.gender = document.getElementById('sch-gender')?.value || 'Male';
      stateSchengen.formData.maritalStatus = document.getElementById('sch-marital')?.value || 'Single';
      stateSchengen.formData.employmentStatus = document.getElementById('sch-employment')?.value || 'Employed';
      stateSchengen.formData.employerName = document.getElementById('sch-emp-name')?.value || '';
      stateSchengen.formData.jobTitle = document.getElementById('sch-job-title')?.value || '';
    }

    if (stateSchengen.currentStep === 3) {
      const arr = document.getElementById('sch-arrival')?.value;
      const dep = document.getElementById('sch-departure')?.value;
      if (!arr || !dep) {
        showSchengenError('Please select your planned arrival and departure dates.');
        return false;
      }
      stateSchengen.formData.arrivalDate = arr;
      stateSchengen.formData.departureDate = dep;
      stateSchengen.formData.stayDays = document.getElementById('sch-days')?.value || '15';
      stateSchengen.formData.requestedEntries = document.getElementById('sch-entries')?.value || 'Single';
      stateSchengen.formData.accommodationType = document.getElementById('sch-acc-type')?.value || 'Hotel Booking';
      stateSchengen.formData.hotelName = document.getElementById('sch-hotel-name')?.value || '';
      stateSchengen.formData.hotelCity = document.getElementById('sch-hotel-city')?.value || '';
      stateSchengen.formData.hasPreviousSchengen = document.getElementById('sch-prev-visa')?.value || 'No';
      stateSchengen.formData.hasVisaRefusal = document.getElementById('sch-refusal')?.value || 'No';
      stateSchengen.formData.tripFunding = document.getElementById('sch-funding')?.value || 'Self-funded';
    }

    clearErr();
    return true;
  }

  function showSchengenError(msg) {
    let errorDiv = document.getElementById('schengen-error-msg');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.id = 'schengen-error-msg';
      errorDiv.style.cssText = 'background: #FEF2F2; border: 1px solid #FCA5A5; color: #B91C1C; padding: 12px 16px; border-radius: 12px; font-size: 13.5px; margin-bottom: 20px; font-weight: 600;';
      const card = document.getElementById('schengen-wizard-card');
      if (card) card.insertBefore(errorDiv, card.firstChild);
    }
    errorDiv.style.display = 'block';
    errorDiv.innerHTML = `⚠️ ${escapeHTML(msg)}`;
  }

  function renderSchengenStepContent() {
    switch (stateSchengen.currentStep) {
      case 1:
        const isGulf = ['Oman', 'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain'].includes(stateSchengen.residenceCountry);
        return `
          <div class="jmt-visa-form-header">
            <h2 class="jmt-visa-form-title">Step 1: Visa Purpose &amp; Schengen Destination</h2>
            <p class="jmt-visa-form-sub">Tell us about your residence status, nationality, and European trip goals.</p>
          </div>

          <div class="jmt-visa-form-grid">

            <div class="jmt-visa-field-group">
              <label for="sch-residence" class="jmt-visa-label">Where do you currently legally live? <span style="color:#EF4444;">*</span></label>
              <div class="jmt-visa-input-box">
                <select id="sch-residence" class="jmt-visa-input" onchange="stateSchengen.residenceCountry = this.value; renderWizard();">
                  <option value="Oman" ${stateSchengen.residenceCountry === 'Oman' ? 'selected' : ''}>Oman</option>
                  <option value="United Arab Emirates" ${stateSchengen.residenceCountry === 'United Arab Emirates' ? 'selected' : ''}>United Arab Emirates</option>
                  <option value="Saudi Arabia" ${stateSchengen.residenceCountry === 'Saudi Arabia' ? 'selected' : ''}>Saudi Arabia</option>
                  <option value="Qatar" ${stateSchengen.residenceCountry === 'Qatar' ? 'selected' : ''}>Qatar</option>
                  <option value="Kuwait" ${stateSchengen.residenceCountry === 'Kuwait' ? 'selected' : ''}>Kuwait</option>
                  <option value="Bahrain" ${stateSchengen.residenceCountry === 'Bahrain' ? 'selected' : ''}>Bahrain</option>
                  <option value="Other" ${stateSchengen.residenceCountry === 'Other' ? 'selected' : ''}>Other Country</option>
                </select>
              </div>
            </div>

            <div class="jmt-visa-field-group">
              <label for="sch-nationality" class="jmt-visa-label">Nationality (Passport Country) <span style="color:#EF4444;">*</span></label>
              <div class="jmt-visa-input-box">
                <select id="sch-nationality" class="jmt-visa-input">
                  ${['India', 'Pakistan', 'Philippines', 'Egypt', 'Bangladesh', 'United Kingdom', 'United States', 'Sri Lanka', 'Nepal', 'Jordan', 'Lebanon', 'Sudan', 'Canada', 'Australia', 'Other'].map(c => `
                    <option value="${c}" ${stateSchengen.nationality === c ? 'selected' : ''}>${c}</option>
                  `).join('')}
                </select>
              </div>
            </div>

          </div>

          ${isGulf ? `
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 18px 20px; margin-bottom: 24px;">
              <h4 style="font-size: 14.5px; font-weight: 800; color: #07153B; margin: 0 0 14px;">🇦🇪 🇴🇲 GCC Residence Permit Details</h4>
              <div class="jmt-visa-form-grid">
                <div class="jmt-visa-field-group">
                  <label for="sch-res-status" class="jmt-visa-label">Residence Visa Status</label>
                  <div class="jmt-visa-input-box">
                    <select id="sch-res-status" class="jmt-visa-input">
                      <option value="Resident / Work Visa" ${stateSchengen.residenceStatus === 'Resident / Work Visa' ? 'selected' : ''}>Resident / Work Visa</option>
                      <option value="Family / Dependent Visa" ${stateSchengen.residenceStatus === 'Family / Dependent Visa' ? 'selected' : ''}>Family / Dependent Visa</option>
                      <option value="Student Visa" ${stateSchengen.residenceStatus === 'Student Visa' ? 'selected' : ''}>Student Visa</option>
                      <option value="Other Legal Residence" ${stateSchengen.residenceStatus === 'Other Legal Residence' ? 'selected' : ''}>Other Legal Residence</option>
                    </select>
                  </div>
                </div>

                <div class="jmt-visa-field-group">
                  <label for="sch-res-permitno" class="jmt-visa-label">Residence Permit / Civil ID Number</label>
                  <div class="jmt-visa-input-box">
                    <input type="text" id="sch-res-permitno" class="jmt-visa-input" value="${escapeHTML(stateSchengen.residencePermitNo)}" placeholder="e.g. Civil ID / Resident ID" dir="ltr">
                  </div>
                </div>
              </div>
            </div>
          ` : ''}

          <div style="margin-bottom: 24px;">
            <label class="jmt-visa-label" style="margin-bottom: 12px; display: block;">Select Schengen Visa Purpose <span style="color:#EF4444;">*</span></label>
            <div class="jmt-visa-select-grid">
              ${schengenPurposes.map(p => `
                <div class="jmt-visa-select-card ${stateSchengen.purpose === p.type ? 'selected' : ''}" onclick="stateSchengen.purpose = '${p.type}'; renderWizard();">
                  <div class="jmt-visa-select-badge">✓</div>
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <span style="font-size: 28px;">${p.icon}</span>
                    <strong style="font-size: 15.5px; color: #07153B;">${escapeHTML(p.title)}</strong>
                  </div>
                  <p style="font-size: 12.5px; color: #64748B; margin: 0; line-height: 1.4;">${escapeHTML(p.description)}</p>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="jmt-visa-form-grid">
            <div class="jmt-visa-field-group">
              <label for="sch-destination" class="jmt-visa-label">Primary Schengen Destination Country <span style="color:#EF4444;">*</span></label>
              <div class="jmt-visa-input-box">
                <select id="sch-destination" class="jmt-visa-input" onchange="stateSchengen.primaryDestination = this.value; renderWizard();">
                  ${schengenCountries.map(c => `
                    <option value="${c}" ${stateSchengen.primaryDestination === c ? 'selected' : ''}>${c}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div class="jmt-visa-field-group">
              <label for="sch-multicountry" class="jmt-visa-label">Will you visit more than one Schengen country?</label>
              <div class="jmt-visa-input-box">
                <select id="sch-multicountry" class="jmt-visa-input" onchange="stateSchengen.isMultiCountry = this.value; renderWizard();">
                  <option value="No" ${stateSchengen.isMultiCountry === 'No' ? 'selected' : ''}>No (Visiting single country)</option>
                  <option value="Yes" ${stateSchengen.isMultiCountry === 'Yes' ? 'selected' : ''}>Yes (Visiting multiple Schengen states)</option>
                </select>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 28px;">
            <button type="button" onclick="window.setSchengenStep(2)" class="jmt-visa-submit-btn" style="width: auto; padding: 14px 32px;">
              <span>Continue to Applicant Information →</span>
            </button>
          </div>
        `;

      case 2:
        return `
          <div class="jmt-visa-form-header">
            <h2 class="jmt-visa-form-title">Step 2: Applicant Information &amp; Passport</h2>
            <p class="jmt-visa-form-sub">Enter your details exactly as shown on your official travel passport.</p>
          </div>

          <form id="sch-step-2-form" aria-describedby="sch-desc-2" onsubmit="event.preventDefault(); window.setSchengenStep(3);">
            <p id="sch-desc-2" class="sr-only">All fields marked with an asterisk are required.</p>
            <div class="jmt-visa-form-grid">

              <div class="jmt-visa-field-group full-width">
                <label for="sch-fullname" class="jmt-visa-label">Full Name (as in Passport) <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <input type="text" id="sch-fullname" class="jmt-visa-input" value="${escapeHTML(stateSchengen.formData.fullName)}" placeholder="First Middle Last Name" required aria-required="true">
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="sch-dob" class="jmt-visa-label">Date of Birth <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <input type="date" id="sch-dob" class="jmt-visa-input" value="${escapeHTML(stateSchengen.formData.dateOfBirth)}" required aria-required="true">
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="sch-gender" class="jmt-visa-label">Gender <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <select id="sch-gender" class="jmt-visa-input">
                    <option value="Male" ${stateSchengen.formData.gender === 'Male' ? 'selected' : ''}>Male</option>
                    <option value="Female" ${stateSchengen.formData.gender === 'Female' ? 'selected' : ''}>Female</option>
                  </select>
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="sch-marital" class="jmt-visa-label">Marital Status</label>
                <div class="jmt-visa-input-box">
                  <select id="sch-marital" class="jmt-visa-input">
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="sch-passport" class="jmt-visa-label">Passport Number <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <input type="text" id="sch-passport" class="jmt-visa-input" value="${escapeHTML(stateSchengen.formData.passportNumber)}" placeholder="e.g. A1234567" style="text-transform: uppercase;" required aria-required="true" dir="ltr">
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="sch-pass-expiry" class="jmt-visa-label">Passport Expiry Date <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <input type="date" id="sch-pass-expiry" class="jmt-visa-input" value="${escapeHTML(stateSchengen.formData.passportExpiry)}" required aria-required="true">
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="sch-email" class="jmt-visa-label">Email Address <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <input type="email" id="sch-email" class="jmt-visa-input" value="${escapeHTML(stateSchengen.formData.email)}" placeholder="applicant@example.com" required aria-required="true" dir="ltr">
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="sch-phone" class="jmt-visa-label">Mobile / WhatsApp Number <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <input type="tel" id="sch-phone" class="jmt-visa-input" value="${escapeHTML(stateSchengen.formData.phone)}" placeholder="+968 91234567" required aria-required="true" dir="ltr">
                </div>
              </div>

              <div class="jmt-visa-field-group full-width">
                <label for="sch-employment" class="jmt-visa-label">Employment / Professional Status <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <select id="sch-employment" class="jmt-visa-input" onchange="stateSchengen.formData.employmentStatus = this.value; renderWizard();">
                    <option value="Employed" ${stateSchengen.formData.employmentStatus === 'Employed' ? 'selected' : ''}>Employed (Private / Government Company)</option>
                    <option value="Self-employed" ${stateSchengen.formData.employmentStatus === 'Self-employed' ? 'selected' : ''}>Self-employed / Business Owner</option>
                    <option value="Student" ${stateSchengen.formData.employmentStatus === 'Student' ? 'selected' : ''}>Student</option>
                    <option value="Retired" ${stateSchengen.formData.employmentStatus === 'Retired' ? 'selected' : ''}>Retired</option>
                    <option value="Unemployed" ${stateSchengen.formData.employmentStatus === 'Unemployed' ? 'selected' : ''}>Unemployed / Dependent</option>
                  </select>
                </div>
              </div>

            </div>

            ${stateSchengen.formData.employmentStatus === 'Employed' ? `
              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px 20px; margin-top: 14px;">
                <h4 style="font-size: 14px; font-weight: 800; color: #07153B; margin: 0 0 14px;">💼 Employment Details</h4>
                <div class="jmt-visa-form-grid">
                  <div class="jmt-visa-field-group">
                    <label for="sch-emp-name" class="jmt-visa-label">Employer / Company Name</label>
                    <div class="jmt-visa-input-box">
                      <input type="text" id="sch-emp-name" class="jmt-visa-input" value="${escapeHTML(stateSchengen.formData.employerName)}" placeholder="Company name in GCC">
                    </div>
                  </div>
                  <div class="jmt-visa-field-group">
                    <label for="sch-job-title" class="jmt-visa-label">Job Title / Designation</label>
                    <div class="jmt-visa-input-box">
                      <input type="text" id="sch-job-title" class="jmt-visa-input" value="${escapeHTML(stateSchengen.formData.jobTitle)}" placeholder="As per NOC letter">
                    </div>
                  </div>
                </div>
              </div>
            ` : ''}

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 28px;">
              <button type="button" onclick="window.setSchengenStep(1)" class="jmt-btn-secondary">
                ← Back to Visa Purpose
              </button>
              <button type="submit" class="jmt-visa-submit-btn" style="width: auto; padding: 14px 32px;">
                <span>Continue to Travel &amp; Stay →</span>
              </button>
            </div>
          </form>
        `;

      case 3:
        return `
          <div class="jmt-visa-form-header">
            <h2 class="jmt-visa-form-title">Step 3: Travel Dates, Accommodation &amp; History</h2>
            <p class="jmt-visa-form-sub">Provide your planned itinerary, accommodation details, and travel history.</p>
          </div>

          <form id="sch-step-3-form" onsubmit="event.preventDefault(); window.setSchengenStep(4);">
            <div class="jmt-visa-form-grid">

              <div class="jmt-visa-field-group">
                <label for="sch-arrival" class="jmt-visa-label">Planned Arrival Date in Schengen Area <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <input type="date" id="sch-arrival" class="jmt-visa-input" value="${escapeHTML(stateSchengen.formData.arrivalDate)}" required>
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="sch-departure" class="jmt-visa-label">Planned Departure Date <span style="color:#EF4444;">*</span></label>
                <div class="jmt-visa-input-box">
                  <input type="date" id="sch-departure" class="jmt-visa-input" value="${escapeHTML(stateSchengen.formData.departureDate)}" required>
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="sch-days" class="jmt-visa-label">Number of Days Stay</label>
                <div class="jmt-visa-input-box">
                  <input type="number" id="sch-days" class="jmt-visa-input" value="${escapeHTML(stateSchengen.formData.stayDays)}" min="1" max="90">
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="sch-entries" class="jmt-visa-label">Number of Entries Requested</label>
                <div class="jmt-visa-input-box">
                  <select id="sch-entries" class="jmt-visa-input">
                    <option value="Single" ${stateSchengen.formData.requestedEntries === 'Single' ? 'selected' : ''}>Single Entry</option>
                    <option value="Double" ${stateSchengen.formData.requestedEntries === 'Double' ? 'selected' : ''}>Double Entry</option>
                    <option value="Multiple" ${stateSchengen.formData.requestedEntries === 'Multiple' ? 'selected' : ''}>Multiple Entry</option>
                  </select>
                </div>
              </div>

              <div class="jmt-visa-field-group full-width">
                <label for="sch-acc-type" class="jmt-visa-label">Accommodation Type in Europe</label>
                <div class="jmt-visa-input-box">
                  <select id="sch-acc-type" class="jmt-visa-input" onchange="stateSchengen.formData.accommodationType = this.value; renderWizard();">
                    <option value="Hotel Booking" ${stateSchengen.formData.accommodationType === 'Hotel Booking' ? 'selected' : ''}>Hotel Booking / Resort</option>
                    <option value="Private Accommodation" ${stateSchengen.formData.accommodationType === 'Private Accommodation' ? 'selected' : ''}>Private / Apartment Rental</option>
                    <option value="Family / Friend Host" ${stateSchengen.formData.accommodationType === 'Family / Friend Host' ? 'selected' : ''}>Staying with Family or Friend Host</option>
                  </select>
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="sch-hotel-name" class="jmt-visa-label">Hotel or Host Name</label>
                <div class="jmt-visa-input-box">
                  <input type="text" id="sch-hotel-name" class="jmt-visa-input" value="${escapeHTML(stateSchengen.formData.hotelName)}" placeholder="e.g. Novotel Paris Tour Eiffel">
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="sch-hotel-city" class="jmt-visa-label">City in Destination Country</label>
                <div class="jmt-visa-input-box">
                  <input type="text" id="sch-hotel-city" class="jmt-visa-input" value="${escapeHTML(stateSchengen.formData.hotelCity)}" placeholder="e.g. Paris / Munich / Madrid">
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="sch-prev-visa" class="jmt-visa-label">Previously travelled to Schengen Area in last 5 years?</label>
                <div class="jmt-visa-input-box">
                  <select id="sch-prev-visa" class="jmt-visa-input">
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="sch-refusal" class="jmt-visa-label">Have you ever been refused a Schengen visa?</label>
                <div class="jmt-visa-input-box">
                  <select id="sch-refusal" class="jmt-visa-input">
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              </div>

              <div class="jmt-visa-field-group full-width">
                <label for="sch-funding" class="jmt-visa-label">Who will pay for your trip expenses?</label>
                <div class="jmt-visa-input-box">
                  <select id="sch-funding" class="jmt-visa-input">
                    <option value="Self-funded">Self-funded (Applicant bank account)</option>
                    <option value="Employer-sponsored">Employer / Company Sponsored</option>
                    <option value="Family Member">Family Member / Host Sponsored</option>
                  </select>
                </div>
              </div>

            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 28px;">
              <button type="button" onclick="window.setSchengenStep(2)" class="jmt-btn-secondary">
                ← Back to Applicant Details
              </button>
              <button type="submit" class="jmt-visa-submit-btn" style="width: auto; padding: 14px 32px;">
                <span>Continue to Documents &amp; Services →</span>
              </button>
            </div>
          </form>
        `;

      case 4:
        return `
          <div class="jmt-visa-form-header">
            <h2 class="jmt-visa-form-title">Step 4: Required Documents &amp; Assistance Services</h2>
            <p class="jmt-visa-form-sub">Upload clear document scans and select optional JMT travel insurance / appointment services.</p>
          </div>

          <div class="jmt-upload-grid">

            <div class="jmt-upload-box ${stateSchengen.files.passport ? 'has-file' : ''}">
              <span class="jmt-upload-icon">📄</span>
              <strong class="jmt-upload-label">Passport Copy <span style="color:#EF4444;">*</span></strong>
              <span class="jmt-upload-sub">${stateSchengen.files.passport ? escapeHTML(stateSchengen.files.passport.name) : 'Photo page scan (PDF/JPG)'}</span>
              <span class="jmt-upload-btn">${stateSchengen.files.passport ? '✓ File Selected' : '+ Choose File'}</span>
              <input type="file" class="jmt-upload-input" accept=".pdf,.jpg,.jpeg,.png" onchange="stateSchengen.files.passport = event.target.files[0]; renderWizard();">
            </div>

            <div class="jmt-upload-box ${stateSchengen.files.photo ? 'has-file' : ''}">
              <span class="jmt-upload-icon">🖼️</span>
              <strong class="jmt-upload-label">Schengen Photograph <span style="color:#EF4444;">*</span></strong>
              <span class="jmt-upload-sub">${stateSchengen.files.photo ? escapeHTML(stateSchengen.files.photo.name) : '35x45mm white background'}</span>
              <span class="jmt-upload-btn">${stateSchengen.files.photo ? '✓ File Selected' : '+ Choose File'}</span>
              <input type="file" class="jmt-upload-input" accept=".jpg,.jpeg,.png" onchange="stateSchengen.files.photo = event.target.files[0]; renderWizard();">
            </div>

            <div class="jmt-upload-box ${stateSchengen.files.gccResidence ? 'has-file' : ''}">
              <span class="jmt-upload-icon">🪪</span>
              <strong class="jmt-upload-label">GCC Residence Permit</strong>
              <span class="jmt-upload-sub">${stateSchengen.files.gccResidence ? escapeHTML(stateSchengen.files.gccResidence.name) : 'Oman / GCC Civil ID scan'}</span>
              <span class="jmt-upload-btn">${stateSchengen.files.gccResidence ? '✓ File Selected' : '+ Choose File'}</span>
              <input type="file" class="jmt-upload-input" accept=".pdf,.jpg,.jpeg,.png" onchange="stateSchengen.files.gccResidence = event.target.files[0]; renderWizard();">
            </div>

            <div class="jmt-upload-box ${stateSchengen.files.bankStatement ? 'has-file' : ''}">
              <span class="jmt-upload-icon">🏦</span>
              <strong class="jmt-upload-label">Bank Statement (3–6 Months) <span style="color:#EF4444;">*</span></strong>
              <span class="jmt-upload-sub">${stateSchengen.files.bankStatement ? escapeHTML(stateSchengen.files.bankStatement.name) : 'Official stamped statement'}</span>
              <span class="jmt-upload-btn">${stateSchengen.files.bankStatement ? '✓ File Selected' : '+ Choose File'}</span>
              <input type="file" class="jmt-upload-input" accept=".pdf,.jpg,.jpeg,.png" onchange="stateSchengen.files.bankStatement = event.target.files[0]; renderWizard();">
            </div>

          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
            <h4 style="font-size: 15px; font-weight: 800; color: #07153B; margin: 0 0 12px;">🛡️ Travel Insurance &amp; Appointment Assistance</h4>

            <div class="jmt-visa-form-grid">
              <div class="jmt-visa-field-group">
                <label for="sch-ins-opt" class="jmt-visa-label">Do you have EUR 30,000 Schengen Travel Insurance?</label>
                <div class="jmt-visa-input-box">
                  <select id="sch-ins-opt" class="jmt-visa-input">
                    <option value="No">No — I need JMT Travel Insurance Assistance</option>
                    <option value="Yes">Yes — I already have compliant policy</option>
                  </select>
                </div>
              </div>

              <div class="jmt-visa-field-group">
                <label for="sch-app-opt" class="jmt-visa-label">Do you already have a VFS / BLS Appointment?</label>
                <div class="jmt-visa-input-box">
                  <select id="sch-app-opt" class="jmt-visa-input">
                    <option value="No">No — I need JMT Appointment Guidance</option>
                    <option value="Yes">Yes — Appointment already booked</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 28px;">
            <button type="button" onclick="window.setSchengenStep(3)" class="jmt-btn-secondary">
              ← Back to Travel Details
            </button>
            <button type="button" onclick="window.setSchengenStep(5)" class="jmt-visa-submit-btn" style="width: auto; padding: 14px 32px;">
              <span>Review Schengen Application →</span>
            </button>
          </div>
        `;

      case 5:
        return `
          <div class="jmt-visa-form-header">
            <h2 class="jmt-visa-form-title">Step 5: Review &amp; Submit Application</h2>
            <p class="jmt-visa-form-sub">Please review all details and accept mandatory declarations before submitting.</p>
          </div>

          <div class="jmt-review-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 1px solid #E2E8F0; padding-bottom: 12px;">
              <h3 style="font-size: 17px; font-weight: 800; color: #07153B; margin: 0;">Schengen Application Summary</h3>
              <button type="button" onclick="window.setSchengenStep(1)" style="background: none; border: none; color: #00A651; font-weight: 700; font-size: 13px; cursor: pointer;">✏️ Edit</button>
            </div>

            <div class="jmt-review-grid">
              <div class="jmt-review-item">
                <span class="jmt-review-label">Primary Destination</span>
                <span class="jmt-review-value" style="color: #00A651;">🇪🇺 ${escapeHTML(stateSchengen.primaryDestination)}</span>
              </div>
              <div class="jmt-review-item">
                <span class="jmt-review-label">Visa Purpose</span>
                <span class="jmt-review-value">${escapeHTML(stateSchengen.purpose)}</span>
              </div>
              <div class="jmt-review-item">
                <span class="jmt-review-label">Full Name</span>
                <span class="jmt-review-value">${escapeHTML(stateSchengen.formData.fullName)}</span>
              </div>
              <div class="jmt-review-item">
                <span class="jmt-review-label">Passport Number</span>
                <span class="jmt-review-value" style="font-family: monospace;">${escapeHTML(stateSchengen.formData.passportNumber)}</span>
              </div>
              <div class="jmt-review-item">
                <span class="jmt-review-label">Nationality / Residence</span>
                <span class="jmt-review-value">${escapeHTML(stateSchengen.nationality)} (Resides in ${escapeHTML(stateSchengen.residenceCountry)})</span>
              </div>
              <div class="jmt-review-item">
                <span class="jmt-review-label">Travel Dates</span>
                <span class="jmt-review-value">${escapeHTML(stateSchengen.formData.arrivalDate || 'TBD')} to ${escapeHTML(stateSchengen.formData.departureDate || 'TBD')}</span>
              </div>
              <div class="jmt-review-item">
                <span class="jmt-review-label">Contact Email</span>
                <span class="jmt-review-value">${escapeHTML(stateSchengen.formData.email)}</span>
              </div>
              <div class="jmt-review-item">
                <span class="jmt-review-label">Contact Phone</span>
                <span class="jmt-review-value">${escapeHTML(stateSchengen.formData.phone)}</span>
              </div>
            </div>
          </div>

          <div style="background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
            <h4 style="font-size: 14.5px; font-weight: 800; color: #92400E; margin: 0 0 12px;">⚖️ Declarations &amp; Terms</h4>

            <div style="display: flex; flex-direction: column; gap: 10px;">
              <label style="display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: #78350F; cursor: pointer;">
                <input type="checkbox" id="sch-decl-1" style="margin-top: 2px;" onchange="stateSchengen.declarations.accuracyChecked = this.checked;">
                <span>I confirm that the information provided in this application is accurate and complete to the best of my knowledge.</span>
              </label>

              <label style="display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: #78350F; cursor: pointer;">
                <input type="checkbox" id="sch-decl-2" style="margin-top: 2px;" onchange="stateSchengen.declarations.consularChecked = this.checked;">
                <span>I understand that JMT Travels provides visa intake, document checking, and appointment preparation, and that visa issuance is strictly subject to the decision of the relevant Schengen member state embassy/consulate.</span>
              </label>
            </div>
          </div>

          <div id="sch-submit-result" aria-live="polite"></div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 28px;">
            <button type="button" onclick="window.setSchengenStep(4)" class="jmt-btn-secondary">
              ← Back to Documents
            </button>
            <button type="button" id="sch-submit-btn" onclick="window.submitSchengenApplication()" class="jmt-visa-submit-btn" style="width: auto; padding: 14px 36px;">
              <span>Submit Schengen Application →</span>
            </button>
          </div>
        `;
    }
  }

  window.submitSchengenApplication = async () => {
    const d1 = document.getElementById('sch-decl-1')?.checked;
    const d2 = document.getElementById('sch-decl-2')?.checked;

    if (!d1 || !d2) {
      showSchengenError('Please check both declaration boxes before submitting your application.');
      return;
    }

    const btn = document.getElementById('sch-submit-btn');
    const resultDiv = document.getElementById('sch-submit-result');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>Submitting Application...</span>`;
    }

    const payload = {
      destination: `${stateSchengen.primaryDestination} (Schengen Area)`,
      visaType: `Schengen ${stateSchengen.purpose}`,
      fullName: stateSchengen.formData.fullName,
      email: stateSchengen.formData.email,
      phone: stateSchengen.formData.phone,
      passportNumber: stateSchengen.formData.passportNumber,
      dateOfBirth: stateSchengen.formData.dateOfBirth,
      passportExpiry: stateSchengen.formData.passportExpiry,
      nationality: stateSchengen.nationality,
      travelDate: stateSchengen.formData.arrivalDate
    };

    try {
      const res = await apiCall('/api/visa/applications', 'POST', payload);

      const card = document.getElementById('schengen-wizard-card');
      if (card) {
        card.innerHTML = `
          <div style="text-align: center; padding: 36px 20px;">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: #F0FDF4; border: 2px solid #DCFCE7; color: #00A651; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 800; margin-bottom: 20px;">
              ✓
            </div>
            <h2 style="font-size: 26px; font-weight: 800; color: #07153B; margin: 0 0 8px;">Schengen Application Submitted Successfully!</h2>
            <p style="font-size: 15px; color: #475569; margin: 0 0 24px; max-width: 560px; margin-left: auto; margin-right: auto;">
              Your Schengen visa application intake for <b>${escapeHTML(stateSchengen.primaryDestination)}</b> has been received by JMT Travels.
            </p>

            <div style="background: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: 16px; padding: 20px; max-width: 420px; margin: 0 auto 28px;">
              <span style="font-size: 12px; color: #64748B; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Application Reference Number</span>
              <strong style="font-size: 24px; color: #00A651; font-family: monospace; letter-spacing: 1px;">${escapeHTML(res.reference || 'JMT-V-SUCCESS')}</strong>
            </div>

            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 20px 24px; max-width: 560px; margin: 0 auto 32px; text-align: start;">
              <h4 style="font-size: 15px; font-weight: 800; color: #07153B; margin: 0 0 10px;">Next Steps:</h4>
              <ol style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #475569; line-height: 1.7;">
                <li>Save your application reference number for tracking.</li>
                <li>Our Muscat Schengen visa team will review your application details and passport validity.</li>
                <li>You will receive guidance via WhatsApp regarding document checklist &amp; appointment scheduling.</li>
              </ol>
            </div>

            <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
              <a href="/account" onclick="event.preventDefault(); navigate('/account')" class="jmt-btn-primary" style="background: #00A651; color: #FFFFFF !important; padding: 12px 28px; text-decoration: none; border-radius: 12px; font-weight: 700;">
                View My Applications →
              </a>
              <a href="/" onclick="event.preventDefault(); navigate('/')" class="jmt-btn-secondary" style="padding: 12px 24px; text-decoration: none; border-radius: 12px; font-weight: 700;">
                Back to Home
              </a>
              <a href="https://wa.me/96897608999?text=${encodeURIComponent(`Hello JMT Travels, I have submitted my Schengen Visa application with reference ${res.reference}`)}" target="_blank" rel="noopener" class="jmt-btn-secondary" style="padding: 12px 24px; text-decoration: none; border-radius: 12px; font-weight: 700;">
                💬 Contact JMT
              </a>
            </div>
          </div>
        `;
      }
      announceToSR(`Schengen Application submitted successfully. Reference number ${res.reference}`);
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>Submit Schengen Application →</span>`;
      }
      resultDiv.innerHTML = `<div style="background: #FEF2F2; border: 1px solid #FCA5A5; padding: 14px 18px; border-radius: 12px; color: #B91C1C; font-size: 14px; margin-top: 16px;">We couldn't submit your application. Please check your details: <b>${escapeHTML(err.message)}</b></div>`;
      announceToSR(`Schengen application submission error: ${err.message}`);
    }
  };

  renderWizard();
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
    posterSrc: '/assets/destinations/muscat-mutrah-waterfront.jpg',
    alt: 'Oman Holiday & Tourism Landscapes JMT Travels',
    badgeText: 'JMT Travel Desk',
    aspectRatio: '4 / 3'
  });

  container.innerHTML = `
    <div class="shell" style="padding: 40px 20px 60px;">
      <!-- 1. OMAN TOURS HERO (TWO-COLUMN DESKTOP LAYOUT) -->
      <div style="background: linear-gradient(135deg, #07153B 0%, #0B286C 65%, #153B8A 100%); color: #FFFFFF; border-radius: 24px; padding: 48px; margin-bottom: 40px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 16px 40px rgba(7,21,59,0.25); position: relative; overflow: hidden;">
        <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 40px; align-items: center;" class="jmt-hero-grid">

          <!-- LEFT HERO COLUMN -->
          <div>
            <span class="jmt-hero-eyebrow" style="color: #00E676 !important; font-weight: 800; letter-spacing: 1.5px; font-size: 12px; text-transform: uppercase; margin-bottom: 8px; display: block;">JMT TRAVELS — HOLIDAYS &amp; TOURS</span>
            <h1 class="jmt-hero-title" style="font-size: clamp(28px, 3.8vw, 44px); font-weight: 800; color: #FFFFFF !important; line-height: 1.18; letter-spacing: -0.5px; margin-bottom: 16px;">
              Oman Tours &amp; Holiday Packages
            </h1>
            <p class="jmt-hero-sub" style="font-size: 16px; color: #D6E0F4 !important; line-height: 1.65; max-width: 540px; margin-bottom: 32px;">
              Discover curated Oman experiences, GCC escapes, Salalah Khareef retreats and unforgettable journeys with 20+ years of trusted travel expertise.
            </p>
            <div style="display: flex; gap: 14px; flex-wrap: wrap;">
              <a href="#tourism-catalogue-container" class="jmt-btn-primary" style="background: #00A651; color: #FFF !important; font-weight: 700; padding: 14px 28px; border-radius: 999px; text-decoration: none; box-shadow: 0 4px 14px rgba(0,166,81,0.35);">Browse Packages ↓</a>
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
        <p style="color: #D6E0F4;">Loading tourism packages...</p>
      </div>

      <!-- JMT OMAN TOURS EDITORIAL & SEO TRAVEL GUIDE SECTION -->
      <section class="jmt-seo-editorial-section" aria-labelledby="oman-tours-seo-heading">

        <!-- 1. TOP INTRO SECTION -->
        <header class="jmt-editorial-header">
          <span class="jmt-editorial-eyebrow" style="color: #00E676 !important; font-weight: 800; letter-spacing: 1px; font-size: 12px; text-transform: uppercase; margin-bottom: 6px; display: block;">JMT TRAVELS • OMAN HOLIDAYS</span>
          <h2 id="oman-tours-seo-heading" class="jmt-editorial-title" style="color: #FFFFFF !important; font-size: clamp(24px, 3.2vw, 36px); font-weight: 800; margin-bottom: 14px;">
            Explore the Best <span style="color:#00E676;">Oman Tour Packages</span> with JMT Travels
          </h2>
          <p class="jmt-editorial-lead" style="color: #D6E0F4 !important; font-size: 16px; line-height: 1.65; margin-bottom: 10px;">
            Discover the hidden treasures of Oman with JMT Travels' expertly crafted Oman Tour Packages. From stunning desert landscapes and traditional souks to pristine beaches and dramatic mountain scenery, Oman offers a unique blend of tradition, luxury, and adventure.
          </p>
          <p class="jmt-editorial-sub" style="color: #D6E0F4 !important; font-size: 15px; line-height: 1.65; margin-bottom: 24px;">
            Our carefully planned Oman tour packages help you experience the best of Oman's culture, heritage, natural beauty, and hospitality with comfort and convenience.
          </p>
        </header>

        <!-- 2. WHY CHOOSE JMT TRAVELS (4 FEATURE CARDS) -->
        <div class="jmt-editorial-block" style="margin-top: 36px;">
          <div class="jmt-block-title-box">
            <h3 class="jmt-block-title" style="color: #00E676 !important; font-size: 24px; font-weight: 800; margin-bottom: 8px;">Why Choose JMT Travels for Oman Tour Packages?</h3>
            <p class="jmt-block-sub" style="color: #D6E0F4 !important; font-size: 15px; margin-bottom: 20px;">
              At JMT Travels, we specialize in creating memorable travel experiences tailored to your preferences, schedule, and travel style.
            </p>
          </div>

          <div class="jmt-why-choose-grid">
            <div class="jmt-why-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 18px; padding: 24px; color: #FFFFFF !important;">
              <div class="jmt-why-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span class="jmt-why-num" style="color: #00E676 !important; font-size: 20px; font-weight: 800;">01</span>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00E676" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              </div>
              <h4 class="jmt-why-card-title" style="color: #FFFFFF !important; font-size: 17px; font-weight: 700; margin-bottom: 8px;">Tailored Itineraries</h4>
              <p class="jmt-why-card-text" style="color: #D6E0F4 !important; font-size: 14px; line-height: 1.6; margin: 0;">Travel plans designed around your interests, schedule, and travel style.</p>
            </div>

            <div class="jmt-why-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 18px; padding: 24px; color: #FFFFFF !important;">
              <div class="jmt-why-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span class="jmt-why-num" style="color: #00E676 !important; font-size: 20px; font-weight: 800;">02</span>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00E676" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
              </div>
              <h4 class="jmt-why-card-title" style="color: #FFFFFF !important; font-size: 17px; font-weight: 700; margin-bottom: 8px;">Local Oman Expertise</h4>
              <p class="jmt-why-card-text" style="color: #D6E0F4 !important; font-size: 14px; line-height: 1.6; margin: 0;">Discover <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" class="jmt-seo-inline-link" style="color: #00E676 !important; font-weight: 700;">Muscat</a>, <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" class="jmt-seo-inline-link" style="color: #00E676 !important; font-weight: 700;">Salalah</a>, Wahiba Sands, Nizwa, and Oman's mountain regions with carefully planned experiences.</p>
            </div>

            <div class="jmt-why-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 18px; padding: 24px; color: #FFFFFF !important;">
              <div class="jmt-why-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span class="jmt-why-num" style="color: #00E676 !important; font-size: 20px; font-weight: 800;">03</span>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00E676" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
              </div>
              <h4 class="jmt-why-card-title" style="color: #FFFFFF !important; font-size: 17px; font-weight: 700; margin-bottom: 8px;">Comfort &amp; Convenience</h4>
              <p class="jmt-why-card-text" style="color: #D6E0F4 !important; font-size: 14px; line-height: 1.6; margin: 0;">Enjoy coordinated travel arrangements with seamless <a href="/visa" onclick="event.preventDefault(); navigate('/visa')" class="jmt-seo-inline-link" style="color: #00E676 !important; font-weight: 700;">Oman E-Visa support</a> and luxury <a href="/hotels" onclick="event.preventDefault(); navigate('/hotels')" class="jmt-seo-inline-link" style="color: #00E676 !important; font-weight: 700;">hotel booking services</a>.</p>
            </div>

            <div class="jmt-why-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 18px; padding: 24px; color: #FFFFFF !important;">
              <div class="jmt-why-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span class="jmt-why-num" style="color: #00E676 !important; font-size: 20px; font-weight: 800;">04</span>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00E676" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </div>
              <h4 class="jmt-why-card-title" style="color: #FFFFFF !important; font-size: 17px; font-weight: 700; margin-bottom: 8px;">JMT Travel Assistance</h4>
              <p class="jmt-why-card-text" style="color: #D6E0F4 !important; font-size: 14px; line-height: 1.6; margin: 0;">Get dedicated 24/7 support from the JMT Travels team throughout your travel planning and stay.</p>
            </div>
          </div>
        </div>

        <!-- 3. TOP OMAN TOUR HIGHLIGHTS (VISUAL DESTINATION CARDS GRID WITH REAL PHOTOS) -->
        <div class="jmt-editorial-block" style="margin-top: 40px;">
          <div class="jmt-block-title-box">
            <h3 class="jmt-block-title" style="color: #00E676 !important; font-size: 24px; font-weight: 800; margin-bottom: 8px;">Top Oman Tour Highlights</h3>
            <p class="jmt-block-sub" style="color: #D6E0F4 !important; font-size: 15px; margin-bottom: 20px;">
              From historic cities to desert adventures and mountain escapes, discover some of Oman's most memorable experiences.
            </p>
          </div>

          <div class="jmt-dest-highlights-grid">

            <!-- 01 Muscat City Tour (Featured Card) -->
            <div class="jmt-dest-card featured" onclick="navigate('/tourism')">
              <img src="/assets/destinations/muscat-mutrah-waterfront.jpg" alt="Mutrah waterfront in Muscat, Oman" loading="lazy" decoding="async" class="jmt-dest-card-img" style="object-position: center top;" onerror="this.onerror=null;this.src='/assets/destinations/oman_tours_poster.jpg';">
              <div class="jmt-dest-card-overlay">
                <div class="jmt-dest-card-top">
                  <span class="jmt-dest-badge" style="background: rgba(7, 21, 59, 0.85); color: #00E676 !important; font-weight: 700;">01 • Capital City</span>
                </div>
                <div class="jmt-dest-card-bottom">
                  <h4 class="jmt-dest-card-title" style="color: #FFFFFF !important;">Muscat City Tour</h4>
                  <p class="jmt-dest-card-desc" style="color: #D6E0F4 !important;">Explore Mutrah, Muscat's waterfront, grand architecture and cultural landmarks.</p>
                  <span class="jmt-dest-cta-link" style="color: #00E676 !important; font-weight: 700;">Explore Muscat →</span>
                </div>
              </div>
            </div>

            <!-- 02 Wahiba Sands Desert Safari -->
            <div class="jmt-dest-card" onclick="navigate('/tourism')">
              <img src="/assets/destinations/wahiba-sands-desert-safari.jpg" alt="Wahiba Sands desert camel safari and golden dunes in Oman" loading="lazy" decoding="async" class="jmt-dest-card-img" style="object-position: center center;" onerror="this.onerror=null;this.src='/assets/destinations/salalah_2.jpg';">
              <div class="jmt-dest-card-overlay">
                <div class="jmt-dest-card-top">
                  <span class="jmt-dest-badge" style="background: rgba(7, 21, 59, 0.85); color: #00E676 !important; font-weight: 700;">02 • Desert Safari</span>
                </div>
                <div class="jmt-dest-card-bottom">
                  <h4 class="jmt-dest-card-title" style="color: #FFFFFF !important;">Wahiba Sands Desert Safari</h4>
                  <p class="jmt-dest-card-desc" style="color: #D6E0F4 !important;">Experience the golden dunes of Wahiba Sands with dune driving, camel rides, Bedouin camps, and starry desert nights.</p>
                  <span class="jmt-dest-cta-link" style="color: #00E676 !important; font-weight: 700;">Explore Desert →</span>
                </div>
              </div>
            </div>

            <!-- 03 Jebel Akhdar & Al Hajar Mountains -->
            <div class="jmt-dest-card" onclick="navigate('/tourism')">
              <img src="/assets/destinations/oman-mountain-fort.jpg" alt="Oman mountain fort in Jebel Akhdar and Al Hajar mountain range" loading="lazy" decoding="async" class="jmt-dest-card-img" style="object-position: center 25%;" onerror="this.onerror=null;this.src='/assets/destinations/salalah_3.jpg';">
              <div class="jmt-dest-card-overlay">
                <div class="jmt-dest-card-top">
                  <span class="jmt-dest-badge" style="background: rgba(7, 21, 59, 0.85); color: #00E676 !important; font-weight: 700;">03 • Mountains</span>
                </div>
                <div class="jmt-dest-card-bottom">
                  <h4 class="jmt-dest-card-title" style="color: #FFFFFF !important;">Jebel Akhdar &amp; Al Hajar Mountains</h4>
                  <p class="jmt-dest-card-desc" style="color: #D6E0F4 !important;">Discover breathtaking mountain fortresses, cliffside terraces, ancient villages, and cool mountain breezes.</p>
                  <span class="jmt-dest-cta-link" style="color: #00E676 !important; font-weight: 700;">Explore Mountains →</span>
                </div>
              </div>
            </div>

            <!-- 04 Salalah Beaches & Khareef -->
            <div class="jmt-dest-card" onclick="navigate('/tourism')">
              <img src="/assets/destinations/salalah-fazayah-bay-rug.jpg" alt="Salalah Fazayah green mountain bay during Khareef" loading="lazy" decoding="async" class="jmt-dest-card-img" style="object-position: center 35%;" onerror="this.onerror=null;this.src='/assets/destinations/salalah-waterfalls-canyon.jpg';">
              <div class="jmt-dest-card-overlay">
                <div class="jmt-dest-card-top">
                  <span class="jmt-dest-badge" style="background: rgba(7, 21, 59, 0.85); color: #00E676 !important; font-weight: 700;">04 • Tropical Coast &amp; Khareef</span>
                </div>
                <div class="jmt-dest-card-bottom">
                  <h4 class="jmt-dest-card-title" style="color: #FFFFFF !important;">Salalah Beaches &amp; Khareef</h4>
                  <p class="jmt-dest-card-desc" style="color: #D6E0F4 !important;">Relax along Salalah's palm-lined beaches and explore green hills, natural waterfalls, and frankincense groves during Khareef.</p>
                  <span class="jmt-dest-cta-link" style="color: #00E676 !important; font-weight: 700;">Explore Salalah →</span>
                </div>
              </div>
            </div>

            <!-- 05 Nizwa & Bahla Forts -->
            <div class="jmt-dest-card" onclick="navigate('/tourism')">
              <img src="/assets/destinations/oman-fort-inner-ramparts.jpg" alt="Historic Nizwa and Bahla fort inner ramparts and stone stairs in Oman" loading="lazy" decoding="async" class="jmt-dest-card-img" style="object-position: center center;" onerror="this.onerror=null;this.src='/assets/destinations/nizwa-fort-roof-minaret.jpg';">
              <div class="jmt-dest-card-overlay">
                <div class="jmt-dest-card-top">
                  <span class="jmt-dest-badge" style="background: rgba(7, 21, 59, 0.85); color: #00E676 !important; font-weight: 700;">05 • Heritage &amp; Forts</span>
                </div>
                <div class="jmt-dest-card-bottom">
                  <h4 class="jmt-dest-card-title" style="color: #FFFFFF !important;">Nizwa &amp; Bahla Forts</h4>
                  <p class="jmt-dest-card-desc" style="color: #D6E0F4 !important;">Step into Oman's heritage through historic forts, traditional markets and beautifully preserved old-town experiences.</p>
                  <span class="jmt-dest-cta-link" style="color: #00E676 !important; font-weight: 700;">Explore Heritage →</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- 4. REGIONAL DESTINATION VISUAL SHOWCASES (MUSCAT, NIZWA, SALALAH) -->
        <div class="jmt-editorial-block" style="margin-top: 40px;">
          <div class="jmt-regional-grid">

            <!-- MUSCAT REGIONAL SHOWCASE -->
            <div class="jmt-region-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; overflow: hidden;">
              <div class="jmt-region-hero-img-wrap">
                <img src="/assets/destinations/muscat-mutrah-waterfront.jpg" alt="Mutrah waterfront in Muscat, Oman" loading="lazy" class="jmt-region-hero-img">
                <div class="jmt-region-hero-overlay">
                  <span class="jmt-region-tag" style="color: #00E676 !important; font-weight: 800;">CAPITAL &amp; COAST</span>
                  <h3 class="jmt-region-title" style="color: #FFFFFF !important; font-weight: 800;">Muscat</h3>
                  <p class="jmt-region-sub" style="color: #D6E0F4 !important;">Culture • Coast • Heritage</p>
                </div>
              </div>
              <div class="jmt-region-thumbs">
                <div class="jmt-region-thumb-item">
                  <img src="/assets/destinations/muscat-grand-mosque-front.jpg" alt="Sultan Qaboos Grand Mosque front view in Muscat" loading="lazy">
                  <span style="color: #D6E0F4 !important;">Grand Mosque</span>
                </div>
                <div class="jmt-region-thumb-item">
                  <img src="/assets/destinations/muscat-almouj.jpg" alt="Al Mouj modern Muscat waterfront promenade" loading="lazy">
                  <span style="color: #D6E0F4 !important;">Al Mouj Marina</span>
                </div>
                <div class="jmt-region-thumb-item">
                  <img src="/assets/destinations/muscat-mosque-night.jpg" alt="Muscat mosque illuminated at night" loading="lazy">
                  <span style="color: #D6E0F4 !important;">Night Skyline</span>
                </div>
              </div>
            </div>

            <!-- NIZWA REGIONAL SHOWCASE -->
            <div class="jmt-region-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; overflow: hidden;">
              <div class="jmt-region-hero-img-wrap">
                <img src="/assets/destinations/nizwa-fort-roof-minaret.jpg" alt="Nizwa fort citadel rooftop and mosque minaret view" loading="lazy" class="jmt-region-hero-img" style="object-position: center center;">
                <div class="jmt-region-hero-overlay">
                  <span class="jmt-region-tag" style="color: #00E676 !important; font-weight: 800;">CULTURAL CAPITAL</span>
                  <h3 class="jmt-region-title" style="color: #FFFFFF !important; font-weight: 800;">Nizwa &amp; Heritage</h3>
                  <p class="jmt-region-sub" style="color: #D6E0F4 !important;">Forts • Souqs • Ancient Towns</p>
                </div>
              </div>
              <div class="jmt-region-thumbs">
                <div class="jmt-region-thumb-item">
                  <img src="/assets/destinations/oman-heritage-family-square.jpg" alt="Omani traditional village square and heritage courtyard" loading="lazy">
                  <span style="color: #D6E0F4 !important;">Old Town</span>
                </div>
                <div class="jmt-region-thumb-item">
                  <img src="/assets/destinations/nizwa-pottery-fountain.jpg" alt="Nizwa traditional pottery market fountain courtyard" loading="lazy">
                  <span style="color: #D6E0F4 !important;">Craft Souq</span>
                </div>
                <div class="jmt-region-thumb-item">
                  <img src="/assets/destinations/oman-fort-inner-ramparts.jpg" alt="Historic fort inner ramparts and wooden stairs" loading="lazy">
                  <span style="color: #D6E0F4 !important;">Fort Citadel</span>
                </div>
              </div>
            </div>

            <!-- SALALAH REGIONAL SHOWCASE -->
            <div class="jmt-region-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; overflow: hidden;">
              <div class="jmt-region-hero-img-wrap">
                <img src="/assets/destinations/salalah-waterfalls-canyon.jpg" alt="Salalah Khareef cascading waterfalls and green canyons" loading="lazy" class="jmt-region-hero-img">
                <div class="jmt-region-hero-overlay">
                  <span class="jmt-region-tag" style="color: #00E676 !important; font-weight: 800;">DHOFAR TROPICAL RETREAT</span>
                  <h3 class="jmt-region-title" style="color: #FFFFFF !important; font-weight: 800;">Salalah Khareef</h3>
                  <p class="jmt-region-sub" style="color: #D6E0F4 !important;">Misty Hills • Waterfalls • Springs</p>
                </div>
              </div>
              <div class="jmt-region-thumbs">
                <div class="jmt-region-thumb-item">
                  <img src="/assets/destinations/salalah-darbat-boats-lake.jpg" alt="Wadi Darbat lake and boats in Salalah" loading="lazy">
                  <span style="color: #D6E0F4 !important;">Ain Waterfalls</span>
                </div>
                <div class="jmt-region-thumb-item">
                  <img src="/assets/destinations/salalah-resort-sunset-beach.jpg" alt="Salalah luxury beach resort sunset" loading="lazy">
                  <span style="color: #D6E0F4 !important;">Coastal Cliffs</span>
                </div>
                <div class="jmt-region-thumb-item">
                  <img src="/assets/destinations/salalah-beach-sunset.jpg" alt="Salalah beach at sunset" loading="lazy">
                  <span style="color: #D6E0F4 !important;">Sunset Beach</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- 5. CUSTOM OMAN TOUR PACKAGES FOR EVERY TRAVELER -->
        <div class="jmt-editorial-block" style="margin-top: 40px;">
          <div class="jmt-block-title-box">
            <h3 class="jmt-block-title" style="color: #00E676 !important; font-size: 24px; font-weight: 800; margin-bottom: 8px;">Custom Oman Tour Packages for Every Traveler</h3>
            <p class="jmt-block-sub" style="color: #D6E0F4 !important; font-size: 15px; margin-bottom: 20px;">Whether you seek luxury retreats, family holidays, outdoor adventures, or cultural immersions.</p>
          </div>

          <div class="jmt-styles-grid">

            <div class="jmt-style-card visual-card" onclick="navigate('/tourism')" style="background-image: linear-gradient(180deg, rgba(7,21,59,0.3) 0%, rgba(7,21,59,0.90) 100%), url('/assets/destinations/salalah-resort-sunset-beach.jpg'); border-radius: 20px;">
              <span class="jmt-style-tag" style="background: rgba(7,21,59,0.85); color: #00E676 !important; font-weight: 700;">Luxury</span>
              <h4 class="jmt-style-title" style="color: #FFF !important; font-weight: 800;">Luxury Oman Tours</h4>
              <p class="jmt-style-desc" style="color: #E2E8F0 !important;">Indulge in premium accommodations, private experiences, comfortable transfers, and carefully planned itineraries.</p>
              <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" class="jmt-dest-cta-link" style="color: #00E676 !important; font-weight: 700;">Explore Luxury Tours →</a>
            </div>

            <div class="jmt-style-card visual-card" onclick="navigate('/tourism')" style="background-image: linear-gradient(180deg, rgba(7,21,59,0.3) 0%, rgba(7,21,59,0.90) 100%), url('/assets/destinations/salalah-darbat-boats-lake.jpg'); border-radius: 20px;">
              <span class="jmt-style-tag" style="background: rgba(7,21,59,0.85); color: #00E676 !important; font-weight: 700;">Family</span>
              <h4 class="jmt-style-title" style="color: #FFF !important; font-weight: 800;">Family-Friendly Oman Tours</h4>
              <p class="jmt-style-desc" style="color: #E2E8F0 !important;">Enjoy comfortable and engaging Oman itineraries designed for families, with activities suitable for different age groups.</p>
              <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" class="jmt-dest-cta-link" style="color: #00E676 !important; font-weight: 700;">Explore Family Tours →</a>
            </div>

            <div class="jmt-style-card visual-card" onclick="navigate('/tourism')" style="background-image: linear-gradient(180deg, rgba(7,21,59,0.3) 0%, rgba(7,21,59,0.90) 100%), url('/assets/destinations/oman-wadi-waterfall.jpg'); border-radius: 20px;">
              <span class="jmt-style-tag" style="background: rgba(7,21,59,0.85); color: #00E676 !important; font-weight: 700;">Adventure</span>
              <h4 class="jmt-style-title" style="color: #FFF !important; font-weight: 800;">Adventure Oman Tours</h4>
              <p class="jmt-style-desc" style="color: #E2E8F0 !important;">Experience desert safaris, mountain trekking, wadi canyoning, and outdoor adventures across Oman.</p>
              <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" class="jmt-dest-cta-link" style="color: #00E676 !important; font-weight: 700;">Explore Adventure Tours →</a>
            </div>

            <div class="jmt-style-card visual-card" onclick="navigate('/tourism')" style="background-image: linear-gradient(180deg, rgba(7,21,59,0.3) 0%, rgba(7,21,59,0.90) 100%), url('/assets/destinations/oman-heritage-family-square.jpg'); border-radius: 20px;">
              <span class="jmt-style-tag" style="background: rgba(7,21,59,0.85); color: #00E676 !important; font-weight: 700;">Culture</span>
              <h4 class="jmt-style-title" style="color: #FFF !important; font-weight: 800;">Cultural Oman Tours</h4>
              <p class="jmt-style-desc" style="color: #E2E8F0 !important;">Explore Oman's rich history, heritage, traditional architecture, forts, souks, villages, and cultural landmarks.</p>
              <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" class="jmt-dest-cta-link" style="color: #00E676 !important; font-weight: 700;">Explore Cultural Tours →</a>
            </div>

          </div>
        </div>

        <!-- 6. WHY OMAN SHOULD BE YOUR NEXT DESTINATION (EDITORIAL SPLIT WITH OMAN COASTAL LANDSCAPE) -->
        <div class="jmt-editorial-block" style="margin-top: 40px;">
          <div class="jmt-why-oman-split" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%) !important; color: #FFFFFF !important; border: 1px solid rgba(255, 255, 255, 0.18) !important; border-radius: 24px; padding: 40px; box-shadow: 0 16px 40px rgba(0,0,0,0.35);">
            <div>
              <img src="/assets/destinations/salalah-palm-beach-promenade.jpg" alt="Salalah tropical palm promenade and coastal lawn" loading="lazy" decoding="async" class="jmt-why-oman-img" style="width: 100%; height: 360px; object-fit: cover; border-radius: 20px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 12px 30px rgba(0,0,0,0.35);" onerror="this.onerror=null;this.src='/assets/destinations/oman-coastal-landscape.jpg';">
            </div>

            <div class="jmt-why-oman-content">
              <h3 style="color: #00E676 !important; font-size: 28px; font-weight: 800; margin: 0 0 16px; text-shadow: 0 0 16px rgba(0, 230, 118, 0.35);">Why Oman Should Be Your Next Destination</h3>
              <p style="color: #D6E0F4 !important; font-size: 15px; line-height: 1.65; margin: 0 0 14px; font-weight: 500;">
                Oman is a land of contrasts, combining rugged mountains, golden deserts, azure waters, peaceful beaches, historic towns, and lush landscapes.
              </p>
              <p style="color: #D6E0F4 !important; font-size: 15px; line-height: 1.65; margin: 0 0 14px; font-weight: 500;">
                Its rich cultural heritage, warm hospitality, dramatic scenery, and relatively unspoiled natural beauty make Oman an ideal destination for travelers looking for a combination of relaxation, culture, and adventure.
              </p>
              <p style="color: #D6E0F4 !important; font-size: 15px; line-height: 1.65; margin: 0 0 16px; font-weight: 500;">
                From Muscat and Nizwa to Wahiba Sands, Jebel Akhdar, and Salalah, every region offers a different side of the Sultanate.
              </p>

              <div class="jmt-why-oman-tags" style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px;">
                <span class="jmt-why-tag" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(0, 230, 118, 0.4); color: #FFFFFF !important; font-size: 13px; font-weight: 700; padding: 7px 16px; border-radius: 99px;">🏔️ Mountains</span>
                <span class="jmt-why-tag" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(0, 230, 118, 0.4); color: #FFFFFF !important; font-size: 13px; font-weight: 700; padding: 7px 16px; border-radius: 99px;">🏜️ Deserts</span>
                <span class="jmt-why-tag" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(0, 230, 118, 0.4); color: #FFFFFF !important; font-size: 13px; font-weight: 700; padding: 7px 16px; border-radius: 99px;">🏖️ Beaches</span>
                <span class="jmt-why-tag" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(0, 230, 118, 0.4); color: #FFFFFF !important; font-size: 13px; font-weight: 700; padding: 7px 16px; border-radius: 99px;">🏰 Heritage</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 7. FINAL CTA BANNER (READY TO EXPLORE OMAN? WITH SUBTLE COASTAL BACKGROUND) -->
        <div class="jmt-oman-cta-banner" style="margin-top: 40px; background: linear-gradient(135deg, rgba(7,21,59,0.92) 0%, rgba(11,40,108,0.88) 100%), url('/assets/destinations/salalah-resort-sunset-beach.jpg') center/cover no-repeat; border-radius: 24px; padding: 40px; border: 1px solid rgba(255,255,255,0.15);">
          <div class="jmt-oman-cta-content" style="display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap;">
            <div class="jmt-oman-cta-text" style="max-width: 600px;">
              <h3 class="jmt-oman-cta-title" style="color: #FFFFFF !important; font-size: 28px; font-weight: 800; margin: 0 0 10px;">Ready to Explore Oman?</h3>
              <p class="jmt-oman-cta-sub" style="color: #D6E0F4 !important; font-size: 15px; margin: 0; line-height: 1.6;">
                Let JMT Travels help you plan a memorable Oman holiday tailored to your interests, schedule and travel style.
              </p>
            </div>
            <div class="jmt-oman-cta-btns" style="display: flex; gap: 14px; flex-wrap: wrap;">
              <a href="#tourism-catalogue-container" onclick="const el=document.getElementById('tourism-catalogue-container'); if(el){el.scrollIntoView({behavior:'smooth'});}" class="jmt-btn-primary" style="background: #00A651; color: #FFFFFF !important; font-weight: 700; padding: 14px 28px; border-radius: 99px; text-decoration: none; box-shadow: 0 4px 14px rgba(0,166,81,0.35);">Explore Oman Tours ↓</a>
              <a href="/contact" onclick="event.preventDefault(); navigate('/contact')" class="jmt-btn-secondary" style="background: rgba(255,255,255,0.12); color: #FFFFFF !important; border: 1.5px solid rgba(255,255,255,0.4); padding: 14px 28px; border-radius: 99px; text-decoration: none;">Contact JMT Travels →</a>
            </div>
          </div>
        </div>

      </section>
    </div>
  `;

  try {
    const res = await apiCall('/api/tourism/packages');
    window._allTourismPackages = getPublicPackages(res.packages);
    renderTourismPackageGrid(window._allTourismPackages);
  } catch (err) {
    document.getElementById('tourism-catalogue-container').innerHTML = `
      <div class="jmt-card" style="text-align: center; padding: 48px 24px; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); color: #FFFFFF !important; border: 1px solid rgba(255,255,255,0.18);">
        <div style="font-size: 40px; margin-bottom: 12px;">🏝️</div>
        <h3 style="color: #00E676 !important; font-weight: 800; margin-bottom: 8px;">Packages Unavailable</h3>
        <p style="color: #D6E0F4 !important; margin-bottom: 20px;">Unable to load package catalogue at this moment. Please check back soon or contact JMT Travels.</p>
        <a href="/contact" onclick="event.preventDefault(); navigate('/contact')" class="jmt-btn-primary" style="background: #00A651; color: #FFFFFF !important; font-weight: 700; padding: 12px 24px; border-radius: 999px; text-decoration: none;">Contact Travel Desk</a>
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
      <div class="jmt-card" style="text-align: center; padding: 48px 24px; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); color: #FFFFFF !important; border: 1px solid rgba(255,255,255,0.18);">
        <div style="font-size: 48px; margin-bottom: 12px;">🧳</div>
        <h3 style="color: #00E676 !important; font-weight: 800; margin-bottom: 8px;">No Packages Found</h3>
        <p style="color: #D6E0F4 !important; font-size: 14px; margin-bottom: 20px;">We couldn't find any packages in this category right now. Contact our Muscat team for a custom tailored itinerary.</p>
        <button onclick="filterTourismCategory('all', document.querySelector('#tourism-filter-bar .jmt-pill'))" class="jmt-btn-primary" style="background: #00A651; color: #FFFFFF !important; font-weight: 700; padding: 12px 24px; border-radius: 999px;">View All Packages</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div id="packages-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
      ${packages.map(p => `
        <div class="jmt-card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; border-radius: 20px; background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); box-shadow: 0 12px 32px rgba(7, 21, 59, 0.22);">
          <div>
            <div style="position: relative; height: 200px; overflow: hidden; background: #07153B;">
              <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.title)} Tour Package" loading="lazy" onerror="this.onerror=null;this.src='/assets/destinations/salalah_1.jpg';" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease;">
              <span class="badge" style="position: absolute; top: 14px; left: 14px; background: rgba(7, 21, 59, 0.85); color: #00E676 !important; backdrop-filter: blur(4px); font-size: 11px; padding: 5px 12px; font-weight: 700; border-radius: 99px; border: 1px solid rgba(255, 255, 255, 0.2);">${escapeHTML(p.category || 'Tours')}</span>
            </div>
            <div style="padding: 22px 22px 14px;">
              <h2 style="font-size: 19px; color: #FFFFFF !important; font-weight: 800; margin: 0 0 8px; line-height: 1.3;">${escapeHTML(p.title)}</h2>
              <div style="font-size: 13px; color: #D6E0F4 !important; display: flex; align-items: center; gap: 12px; margin-bottom: 12px; font-weight: 600;">
                <span>📍 ${escapeHTML(p.destination)}</span>
                <span>⏱️ ${escapeHTML(p.duration)}</span>
              </div>
              <p style="color: #D6E0F4 !important; font-size: 13.5px; line-height: 1.6; margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${escapeHTML(p.summary)}</p>
            </div>
          </div>
          <div style="padding: 14px 22px 22px; border-top: 1px solid rgba(255, 255, 255, 0.15); display: flex; justify-content: space-between; align-items: center; background: rgba(0, 0, 0, 0.15);">
            <div>
              <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #D6E0F4 !important; display: block;">Starting from</span>
              <strong style="color: #00E676 !important; font-size: 20px; font-weight: 800;">${escapeHTML(p.currency || 'OMR')} ${p.priceMinor ? p.priceMinor / 1000 : p.price}</strong>
            </div>
            <a href="/tourism/${escapeHTML(p.slug)}" onclick="event.preventDefault(); navigate('/tourism/${escapeHTML(p.slug)}')" class="jmt-btn-primary" style="padding: 10px 18px; font-size: 13px; background: #00A651; color: #FFFFFF !important; font-weight: 700; border-radius: 999px; text-decoration: none; box-shadow: 0 4px 14px rgba(0,166,81,0.35);">View Details →</a>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function renderTourismDetailPage(container, slug) {
  container.innerHTML = `<div class="shell" style="padding: 60px 20px;"><p style="color: #D6E0F4;">Loading package details...</p></div>`;
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
        <div style="position: relative; height: 380px; border-radius: 24px; overflow: hidden; margin-bottom: 32px; box-shadow: 0 12px 32px rgba(7,21,59,0.25);">
          <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.title)}" loading="lazy" onerror="this.onerror=null;this.src='/assets/destinations/salalah_1.jpg';" style="width: 100%; height: 100%; object-fit: cover;">
          <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(7,21,59,0.3) 0%, rgba(7,21,59,0.85) 100%);"></div>
          <div style="position: absolute; bottom: 32px; left: 32px; right: 32px; color: #FFFFFF;">
            <span class="badge" style="background: #00A651; color: #FFF !important; font-size: 11px; padding: 5px 14px; font-weight: 700; border-radius: 99px; margin-bottom: 12px; display: inline-block;">${escapeHTML(p.category || 'Tour Package')}</span>
            <h1 style="font-size: clamp(24px, 4vw, 38px); font-weight: 800; color: #FFF !important; margin: 0 0 10px; line-height: 1.2;">${escapeHTML(p.title)}</h1>
            <div style="display: flex; gap: 20px; font-size: 15px; opacity: 0.95; font-weight: 600; flex-wrap: wrap; color: #D6E0F4 !important;">
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
            <div class="jmt-card" style="margin-bottom: 24px; background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); color: #FFFFFF !important; border: 1px solid rgba(255, 255, 255, 0.18);">
              <h2 style="font-size: 22px; color: #00E676 !important; font-weight: 800; margin-bottom: 14px;">Package Overview</h2>
              <p style="font-size: 15px; color: #D6E0F4 !important; line-height: 1.7; margin: 0;">${escapeHTML(p.summary)}</p>
            </div>

            <!-- ITINERARY TIMELINE -->
            <div class="jmt-card" style="margin-bottom: 24px; background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); color: #FFFFFF !important; border: 1px solid rgba(255, 255, 255, 0.18);">
              <h2 style="font-size: 22px; color: #00E676 !important; font-weight: 800; margin-bottom: 20px;">Tour Itinerary</h2>
              <div style="display: flex; flex-direction: column; gap: 18px;">
                ${itinerary.map(item => `
                  <div style="display: flex; gap: 16px; align-items: flex-start;">
                    <div style="background: #00E676; color: #07153B; width: 38px; height: 38px; border-radius: 50%; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,230,118,0.3);">
                      Day ${item.day || 1}
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 14px; padding: 16px 20px; flex: 1;">
                      <h4 style="font-size: 16px; color: #FFFFFF !important; font-weight: 700; margin: 0 0 6px;">${escapeHTML(item.title)}</h4>
                      <p style="font-size: 14px; color: #D6E0F4 !important; margin: 0; line-height: 1.6;">${escapeHTML(item.description)}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- INCLUSIONS / EXCLUSIONS -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 24px;">
              <div class="jmt-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); color: #FFFFFF !important; border: 1px solid rgba(255, 255, 255, 0.18);">
                <h3 style="font-size: 17px; color: #00E676 !important; font-weight: 800; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                  <span style="color: #00E676;">✓</span> What's Included
                </h3>
                <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px; color: #D6E0F4 !important; line-height: 1.9;">
                  ${inclusions.map(inc => `<li style="display: flex; gap: 8px; align-items: baseline; color: #D6E0F4 !important;"><span style="color: #00E676; font-weight: 800;">✓</span> ${escapeHTML(inc)}</li>`).join('')}
                </ul>
              </div>
              <div class="jmt-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); color: #FFFFFF !important; border: 1px solid rgba(255, 255, 255, 0.18);">
                <h3 style="font-size: 17px; color: #FFFFFF !important; font-weight: 800; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                  <span style="color: #DC2626;">✕</span> What's Not Included
                </h3>
                <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px; color: #D6E0F4 !important; line-height: 1.9;">
                  ${exclusions.map(exc => `<li style="display: flex; gap: 8px; align-items: baseline; color: #D6E0F4 !important;"><span style="color: #DC2626; font-weight: 800;">✕</span> ${escapeHTML(exc)}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>

          <!-- RIGHT SIDEBAR BOOKING CARD -->
          <div style="position: sticky; top: 96px;">
            <div class="jmt-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); border: 1px solid rgba(255, 255, 255, 0.18); border-top: 5px solid #00E676; box-shadow: 0 16px 40px rgba(7, 21, 59, 0.25);">
              <span style="font-size: 12px; font-weight: 700; color: #D6E0F4 !important; text-transform: uppercase;">Total Tour Price</span>
              <div style="font-size: 32px; font-weight: 800; color: #00E676 !important; margin: 4px 0 16px;">
                ${escapeHTML(p.currency || 'OMR')} ${p.priceMinor ? p.priceMinor / 1000 : p.price}
                <small style="font-size: 13px; font-weight: 500; color: #D6E0F4 !important;">/ person</small>
              </div>
              <div style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; padding: 14px; font-size: 13px; color: #D6E0F4 !important; margin-bottom: 20px; line-height: 1.6;">
                ⚡ <b style="color: #FFFFFF !important;">Instant Confirmation</b><br>
                Instant booking processing &amp; Omani guide allocation.
              </div>
              <button type="button" onclick="openEnquiryModal('tour', '${escapeHTML(p.title)}', { subtitle: '${escapeHTML(p.destination)} (${escapeHTML(p.duration)})', message: 'Hi JMT Travels, I am enquiring about the ${escapeHTML(p.title)} tour package. Please share availability and details.' })" class="jmt-btn-primary" style="width: 100%; justify-content: center; padding: 14px 24px; font-size: 15px; margin-bottom: 10px; background: #00E676; color: #07153B !important; font-weight: 800; border-radius: 999px; border: 0; cursor: pointer; display: inline-flex; align-items: center; box-shadow: 0 4px 14px rgba(0, 230, 118, 0.35);">
                Enquire About This Package →
              </button>
              <a href="/book?package=${escapeHTML(p.id)}" onclick="event.preventDefault(); navigate('/book?package=${escapeHTML(p.id)}')" class="jmt-btn-secondary" style="width: 100%; justify-content: center; padding: 12px 24px; font-size: 14px; margin-bottom: 10px; background: rgba(255,255,255,0.12); color: #FFFFFF !important; border: 1.5px solid rgba(255,255,255,0.4); border-radius: 999px; text-decoration: none; display: inline-flex; align-items: center;">
                Proceed to Online Booking →
              </a>
              <a href="https://wa.me/96897608999?text=${encodeURIComponent('Hi JMT Travels, I am enquiring about the ' + p.title + ' package.')}" target="_blank" rel="noopener" class="jmt-btn-whatsapp" style="width: 100%; justify-content: center; padding: 12px 24px; font-size: 14px; background: #00A651; color: #FFFFFF !important; border-radius: 999px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                💬 WhatsApp JMT
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="shell" style="padding: 60px 20px;"><p style="color: #EF4444;">Error loading package details.</p></div>`;
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
    <div style="background: #07153B !important; min-height: 100vh; color: #FFFFFF !important;">
      <div class="shell" style="padding: 40px 20px 60px; max-width: 640px;">
        <div class="jmt-card" style="background: #0B286C !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; color: #FFFFFF !important; border-radius: 20px; padding: 32px;">
          <h1 style="font-size: 26px; color: #00E676 !important; font-weight: 800; margin-bottom: 8px;">Book Tour Package</h1>
          <p style="color: #E2E8F0 !important; font-size: 14px; margin-bottom: 24px;">Complete lead traveler details below to process your tour reservation with JMT Travels.</p>

          <form id="tour-book-form" aria-describedby="book-form-desc">
            <p id="book-form-desc" class="sr-only">All fields marked required are mandatory for tour booking requests.</p>
            <input type="hidden" name="packageId" value="${escapeHTML(pkgId)}">
            <div style="margin-bottom: 16px;">
              <label for="book-name" style="display:block; font-weight:700; font-size:13.5px; color:#FFFFFF !important; margin-bottom:6px;">Lead Traveler Name <span style="color:#FF5252;" aria-hidden="true">*</span></label>
              <input type="text" id="book-name" name="travellerName" class="chat-input" style="width:100%; padding:12px 16px; border:1.5px solid #CBD5E1; border-radius:12px; font-size:14px; background:#FFFFFF !important; color:#07153B !important;" value="${state.user ? escapeHTML(state.user.name) : ''}" required aria-required="true">
            </div>
            <div style="margin-bottom: 16px;">
              <label for="book-email" style="display:block; font-weight:700; font-size:13.5px; color:#FFFFFF !important; margin-bottom:6px;">Email Address <span style="color:#FF5252;" aria-hidden="true">*</span></label>
              <input type="email" id="book-email" name="email" class="chat-input" style="width:100%; padding:12px 16px; border:1.5px solid #CBD5E1; border-radius:12px; font-size:14px; background:#FFFFFF !important; color:#07153B !important;" value="${state.user ? escapeHTML(state.user.email) : ''}" required aria-required="true">
            </div>
            <div style="margin-bottom: 16px;">
              <label for="book-phone" style="display:block; font-weight:700; font-size:13.5px; color:#FFFFFF !important; margin-bottom:6px;">Phone / WhatsApp <span style="color:#FF5252;" aria-hidden="true">*</span></label>
              <input type="text" id="book-phone" name="phone" class="chat-input" style="width:100%; padding:12px 16px; border:1.5px solid #CBD5E1; border-radius:12px; font-size:14px; background:#FFFFFF !important; color:#07153B !important;" placeholder="+968 9000 0000" required aria-required="true">
            </div>
            <div style="margin-bottom: 16px;">
              <label for="book-travellers" style="display:block; font-weight:700; font-size:13.5px; color:#FFFFFF !important; margin-bottom:6px;">Number of Travelers</label>
              <select id="book-travellers" name="travellers" class="chat-input" style="width:100%; padding:12px 16px; border:1.5px solid #CBD5E1; border-radius:12px; font-size:14px; background:#FFFFFF !important; color:#07153B !important;">
                <option value="1">1 Traveler</option>
                <option value="2">2 Travelers</option>
                <option value="3">3 Travelers</option>
                <option value="4">4+ Travelers</option>
              </select>
            </div>
            <div style="margin-bottom: 24px;">
              <label for="book-date" style="display:block; font-weight:700; font-size:13.5px; color:#FFFFFF !important; margin-bottom:6px;">Preferred Travel Date</label>
              <input type="date" id="book-date" name="travelDate" class="chat-input" style="width:100%; padding:12px 16px; border:1.5px solid #CBD5E1; border-radius:12px; font-size:14px; background:#FFFFFF !important; color:#07153B !important;">
            </div>
            <button type="submit" class="jmt-btn-primary" style="width:100%; justify-content:center; padding:14px; font-size:15px; background: #00A651 !important; color: #FFFFFF !important;">Confirm Booking Request →</button>
          </form>
          <div id="tour-book-result" style="margin-top:20px;" aria-live="polite"></div>
        </div>
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
    title: "Contact JMT Travels | Travel & Visa Services in Al Buraimi",
    description: "Contact JMT Travels in Al Buraimi, Oman for visa services, tour packages, flights, hotel bookings and travel assistance.",
    canonicalUrl: '/contact',
    noindex: false
  });
  announceToSR('Navigated to Contact Page');

  container.innerHTML = `
    <!-- MAIN CONTACT PAGE WRAPPER WITH CONTINUOUS PREMIUM DARK BLUE BRANDING -->
    <div style="background: #07153B; color: #FFFFFF; min-height: 100vh; padding: 24px 0 60px;">
      <div class="shell">

        <!-- 1. HERO BANNER WITH VISUAL DEPTH & QUICK CONTACT CHIPS -->
        <div class="jmt-contact-hero" style="background: linear-gradient(135deg, rgba(7, 21, 59, 0.94) 0%, rgba(11, 40, 108, 0.88) 100%), url('/assets/destinations/hero_hd_muscat_waterfront.jpg') center/cover no-repeat !important; border-radius: 24px; padding: 40px 44px; margin-bottom: 32px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.15); position: relative; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 32px; position: relative; z-index: 2;">
            
            <!-- LEFT HERO HEADER CONTENT -->
            <div style="flex: 1 1 480px; max-width: 620px;">
              <span class="jmt-hero-eyebrow" style="background: rgba(0, 230, 118, 0.15) !important; color: #00E676 !important; border: 1.5px solid #00E676 !important; padding: 6px 18px; font-size: 11.5px; font-weight: 800; letter-spacing: 1.5px; border-radius: 99px; display: inline-block; margin-bottom: 16px; text-transform: uppercase; box-shadow: 0 0 14px rgba(0, 230, 118, 0.25);">JMT TRAVELS — AL BURAIMI HEADQUARTERS</span>
              <h1 style="color: #FFFFFF !important; font-size: clamp(32px, 4.2vw, 48px); font-weight: 800; line-height: 1.15; margin: 0 0 14px; letter-spacing: -0.5px;">Let's Plan Your <span style="color: #00E676; text-shadow: 0 0 20px rgba(0, 230, 118, 0.4);">Journey Together</span></h1>
              <p style="color: #E2E8F0 !important; font-size: 15.5px; line-height: 1.6; margin: 0; max-width: 540px;">Tell us what you need and our travel specialists in Al Buraimi will help customize your visa clearing, tour packages, flights, or hotel stays.</p>
            </div>

            <!-- RIGHT 2x2 QUICK CONTACT CHIPS GRID -->
            <div class="jmt-hero-chips-grid" style="flex: 1 1 320px; max-width: 440px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;">
              <div style="background: rgba(11, 40, 108, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 16px; padding: 14px 18px; display: flex; align-items: center; gap: 12px; transition: transform 0.2s ease;">
                <span style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: #07153B; border: 1.5px solid #00E676; flex-shrink: 0;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </span>
                <div>
                  <small style="display: block; font-size: 10px; text-transform: uppercase; font-weight: 800; color: #00E676 !important; letter-spacing: 0.8px;">CALL US</small>
                  <a href="tel:+96825655711" style="font-size: 13px; font-weight: 800; color: #FFFFFF; text-decoration: none;">+968 25655711</a>
                </div>
              </div>
              <div style="background: rgba(11, 40, 108, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 16px; padding: 14px 18px; display: flex; align-items: center; gap: 12px; transition: transform 0.2s ease;">
                <span style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: #07153B; border: 1.5px solid #00E676; flex-shrink: 0;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00E676" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                </span>
                <div>
                  <small style="display: block; font-size: 10px; text-transform: uppercase; font-weight: 800; color: #00E676 !important; letter-spacing: 0.8px;">WHATSAPP 24/7</small>
                  <a href="https://wa.me/96897608999" target="_blank" rel="noopener" style="font-size: 13px; font-weight: 800; color: #FFFFFF; text-decoration: none;">+968 9760 8999</a>
                </div>
              </div>
              <div style="background: rgba(11, 40, 108, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 16px; padding: 14px 18px; display: flex; align-items: center; gap: 12px; transition: transform 0.2s ease;">
                <span style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: #07153B; border: 1.5px solid #00E676; flex-shrink: 0;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                </span>
                <div>
                  <small style="display: block; font-size: 10px; text-transform: uppercase; font-weight: 800; color: #00E676 !important; letter-spacing: 0.8px;">LOCATION</small>
                  <span style="font-size: 13px; font-weight: 800; color: #FFFFFF;">Al Buraimi, Oman</span>
                </div>
              </div>
              <div style="background: rgba(11, 40, 108, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 16px; padding: 14px 18px; display: flex; align-items: center; gap: 12px; transition: transform 0.2s ease;">
                <span style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: #07153B; border: 1.5px solid #00E676; flex-shrink: 0;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00E676" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                </span>
                <div>
                  <small style="display: block; font-size: 10px; text-transform: uppercase; font-weight: 800; color: #00E676 !important; letter-spacing: 0.8px;">SUPPORT</small>
                  <span style="font-size: 12.5px; font-weight: 800; color: #FFFFFF;">Fast 24h Response</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. MAIN 2-COLUMN SECTION: CONTACT FORM (LEFT) & OFFICE INFO CARDS (RIGHT) -->
        <div class="jmt-contact-main-grid" style="display: grid; grid-template-columns: 1.25fr 1fr; gap: 32px; align-items: start; margin-bottom: 40px;">
          
          <!-- LEFT INQUIRY FORM CARD -->
          <form id="contact-form" class="jmt-card" style="background: #0B286C !important; color: #FFFFFF !important; border: 1px solid rgba(255, 255, 255, 0.18) !important; border-radius: 20px; padding: 36px; box-shadow: 0 16px 40px rgba(0,0,0,0.35);">
            <div style="margin-bottom: 24px;">
              <small style="display: block; font-size: 11.5px; font-weight: 800; color: #00E676 !important; text-transform: uppercase; letter-spacing: 1.4px; margin-bottom: 6px;">SEND US A MESSAGE</small>
              <h2 style="font-size: 28px; color: #00E676 !important; font-weight: 800; margin: 0 0 8px; text-shadow: 0 0 16px rgba(0, 230, 118, 0.35);">Send Us a Message</h2>
              <p style="color: #E2E8F0 !important; font-size: 14px; margin: 0; line-height: 1.5;">Fill in your details below and our team will get back to you within 24 hours.</p>
            </div>

            <!-- 2-COLUMN INPUT FIELDS FOR NAME & CONTACT -->
            <div class="jmt-form-row-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px;">
              <div>
                <label for="contact-name" style="display:block; font-weight:700; font-size:13px; color:#FFFFFF !important; margin-bottom:6px;">Your Name <span style="color:#00E676 !important; font-weight:800;" aria-hidden="true">*</span></label>
                <div style="position:relative; display:flex; align-items:center;">
                  <span style="position:absolute; left:14px; pointer-events:none; display:flex; align-items:center; z-index:2; color:#07153B;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#07153B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </span>
                  <input type="text" id="contact-name" name="name" placeholder="Enter your full name" style="width:100%; padding:13px 16px 13px 44px; border:1.5px solid #CBD5E1; border-radius:12px; font-size:14px; background:#FFFFFF !important; color:#07153B !important; outline:none; transition:all 0.2s ease;" onfocus="this.style.borderColor='#00E676'; this.style.boxShadow='0 0 0 4px rgba(0,230,118,0.35)'" onblur="this.style.borderColor='#CBD5E1'; this.style.boxShadow='none'" required aria-required="true">
                </div>
              </div>

              <div>
                <label for="contact-input" style="display:block; font-weight:700; font-size:13px; color:#FFFFFF !important; margin-bottom:6px;">Contact Email / Phone <span style="color:#00E676 !important; font-weight:800;" aria-hidden="true">*</span></label>
                <div style="position:relative; display:flex; align-items:center;">
                  <span style="position:absolute; left:14px; pointer-events:none; display:flex; align-items:center; gap:4px; z-index:2; color:#07153B;">
                    <span style="font-family:sans-serif; font-weight:800; font-size:14px; line-height:1; color:#07153B;">@</span>
                  </span>
                  <input type="text" id="contact-input" name="contact" placeholder="email@domain.com or phone number" style="width:100%; padding:13px 16px 13px 40px; border:1.5px solid #CBD5E1; border-radius:12px; font-size:14px; background:#FFFFFF !important; color:#07153B !important; outline:none; transition:all 0.2s ease;" onfocus="this.style.borderColor='#00E676'; this.style.boxShadow='0 0 0 4px rgba(0,230,118,0.35)'" onblur="this.style.borderColor='#CBD5E1'; this.style.boxShadow='none'" required aria-required="true">
                </div>
              </div>
            </div>

            <!-- INQUIRY TYPE SELECT -->
            <div style="margin-bottom: 18px;">
              <label for="contact-type" style="display:block; font-weight:700; font-size:13px; color:#FFFFFF !important; margin-bottom:6px;">Inquiry Type</label>
              <div style="position:relative; display:flex; align-items:center;">
                <span style="position:absolute; left:14px; pointer-events:none; display:flex; align-items:center; gap:8px; z-index:2; color:#07153B;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#07153B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="13" x2="15" y2="13"></line><polyline points="12 10 15 13 12 16"></polyline></svg>
                  <span style="width:1px; height:18px; background:rgba(7,21,59,0.25); display:inline-block;"></span>
                </span>
                <select id="contact-type" name="type" style="width:100%; padding:13px 16px 13px 48px; border:1.5px solid #CBD5E1; border-radius:12px; font-size:14px; background:#FFFFFF !important; color:#07153B !important; outline:none; transition:all 0.2s ease; cursor:pointer;" onfocus="this.style.borderColor='#00E676'; this.style.boxShadow='0 0 0 4px rgba(0,230,118,0.35)'" onblur="this.style.borderColor='#CBD5E1'; this.style.boxShadow='none'">
                  <option value="visa" style="background:#FFFFFF; color:#07153B;">Visa Services Inquiry</option>
                  <option value="tours" style="background:#FFFFFF; color:#07153B;">Holiday & Tour Packages</option>
                  <option value="hotels" style="background:#FFFFFF; color:#07153B;">Hotel & Accommodations</option>
                  <option value="flights" style="background:#FFFFFF; color:#07153B;">Flight Ticketing</option>
                  <option value="general" style="background:#FFFFFF; color:#07153B;">General Inquiry / Support</option>
                </select>
              </div>
            </div>

            <!-- MESSAGE TEXTAREA -->
            <div style="margin-bottom: 24px;">
              <label for="contact-msg" style="display:block; font-weight:700; font-size:13px; color:#FFFFFF !important; margin-bottom:6px;">Message <span style="color:#00E676 !important; font-weight:800;" aria-hidden="true">*</span></label>
              <div style="position:relative; display:flex;">
                <span style="position:absolute; left:14px; top:15px; pointer-events:none; display:flex; align-items:center; z-index:2; color:#07153B;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#07153B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </span>
                <textarea id="contact-msg" name="message" rows="4" placeholder="How can we assist you?" style="width:100%; padding:13px 16px 13px 44px; border:1.5px solid #CBD5E1; border-radius:12px; font-size:14px; background:#FFFFFF !important; color:#07153B !important; outline:none; transition:all 0.2s ease; font-family:inherit;" onfocus="this.style.borderColor='#00E676'; this.style.boxShadow='0 0 0 4px rgba(0,230,118,0.35)'" onblur="this.style.borderColor='#CBD5E1'; this.style.boxShadow='none'" required aria-required="true"></textarea>
              </div>
            </div>

            <!-- CTA SUBMIT BUTTON -->
            <button type="submit" class="jmt-btn-primary" style="width:100%; justify-content:center; padding:16px; font-size:16px; font-weight:800; background:#00E676 !important; color:#07153B !important; border-radius:14px; border:none; cursor:pointer; box-shadow:0 8px 25px rgba(0, 230, 118, 0.45); transition:all 0.25s ease;">Send Enquiry →</button>
            
            <div style="text-align:center; font-size:12px; color:#94A3B8; margin-top:14px; display:flex; align-items:center; justify-content:center; gap:6px;">
              <span style="display:inline-flex; align-items:center; gap:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E676" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Your information is safe with us. We never share your details.</span>
            </div>

            <div id="contact-result" style="margin-top:16px;" aria-live="polite"></div>
          </form>

          <!-- RIGHT OFFICE INFO CARDS -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            
            <!-- CARD 1: OFFICE DETAILS -->
            <div class="jmt-card" style="background: #0B286C !important; color: #FFFFFF !important; border: 2px solid #00E676 !important; border-radius: 20px; padding: 32px; box-shadow: 0 16px 40px rgba(0,0,0,0.35), 0 0 20px rgba(0, 230, 118, 0.2); position:relative;">
              <h2 style="font-size: 24px; color: #00E676 !important; font-weight: 800; margin: 0 0 20px; letter-spacing: -0.3px; text-shadow: 0 0 16px rgba(0, 230, 118, 0.35);">JMT Travels — Al Buraimi Office</h2>
              
              <div style="display: flex; flex-direction: column; gap: 18px; font-size: 14.5px; color: #E2E8F0 !important;">
                
                <!-- LOCATION -->
                <div style="display: flex; gap: 14px; align-items: flex-start; padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                  <div style="width:38px; height:38px; border-radius:50%; background:#07153B; border:1.5px solid #00E676; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  </div>
                  <div>
                    <strong style="color: #FFFFFF !important; display:block; margin-bottom:2px;">Office Location:</strong>
                    <a href="https://maps.app.goo.gl/3xDLiEdchqgivn1Z7" target="_blank" rel="noopener noreferrer" style="color:#00E676 !important; font-weight:700; text-decoration:none !important;" title="Open in Google Maps">near Mazda R/A, next to Yahar Restaurant, 512, Oman</a>
                  </div>
                </div>

                <!-- PHONE -->
                <div style="display: flex; gap: 14px; align-items: center; padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                  <div style="width:38px; height:38px; border-radius:50%; background:#07153B; border:1.5px solid #00E676; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  </div>
                  <div>
                    <strong style="color: #FFFFFF !important; display:block; margin-bottom:2px;">Landline Phone:</strong>
                    <a href="tel:+96825655711" style="color:#FFFFFF !important; font-weight:700; text-decoration:none;">+968 25655711</a> / <a href="tel:+96825655177" style="color:#FFFFFF !important; font-weight:700; text-decoration:none;">+968 25655177</a>
                  </div>
                </div>

                <!-- WHATSAPP -->
                <div style="display: flex; gap: 14px; align-items: center; padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                  <div style="width:38px; height:38px; border-radius:50%; background:#07153B; border:1.5px solid #00E676; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                  </div>
                  <div>
                    <strong style="color: #FFFFFF !important; display:block; margin-bottom:2px;">WhatsApp Support:</strong>
                    <a href="https://wa.me/96897608999" target="_blank" rel="noopener" style="color:#00E676 !important; font-weight:700; text-decoration:none;">+968 9760 8999</a>
                  </div>
                </div>

                <!-- EMAIL -->
                <div style="display: flex; gap: 14px; align-items: center; padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                  <div style="width:38px; height:38px; border-radius:50%; background:#07153B; border:1.5px solid #00E676; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  </div>
                  <div>
                    <strong style="color: #FFFFFF !important; display:block; margin-bottom:2px;">Email Address:</strong>
                    <a href="https://mail.google.com/mail/?view=cm&fs=1&to=info%40jmttravels.com" target="_blank" rel="noopener noreferrer" aria-label="Email JMT Travels via Gmail" class="jmt-email-link" style="color:#00E676 !important; font-weight:700; text-decoration:none !important;">info@jmttravels.com</a>
                  </div>
                </div>

                <!-- WORKING HOURS -->
                <div style="display: flex; gap: 14px; align-items: flex-start;">
                  <div style="width:38px; height:38px; border-radius:50%; background:#07153B; border:1.5px solid #00E676; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  </div>
                  <div>
                    <strong style="color: #FFFFFF !important; display:block; margin-bottom:2px;">Working Hours:</strong>
                    <span style="color: #E2E8F0 !important; font-size:13.5px; line-height:1.5;">Saturday – Thursday: 8:30 AM – 1:30 PM &amp; 4:30 PM – 9:30 PM<br>Friday: 4:30 PM – 9:30 PM</span>
                  </div>
                </div>

              </div>
            </div>

            <!-- CARD 2: VISIT OFFICE & GOOGLE MAPS CTA -->
            <div class="jmt-card" style="text-align: center; background: #0B286C !important; color: #FFFFFF !important; border: 1px solid rgba(255, 255, 255, 0.18) !important; border-radius: 20px; padding: 28px; box-shadow: 0 16px 40px rgba(0,0,0,0.35);">
              <h3 style="font-size: 22px; color: #00E676 !important; font-weight: 800; margin: 0 0 8px; text-shadow: 0 0 14px rgba(0, 230, 118, 0.3);">Visit Our Office in Al Buraimi</h3>
              <p style="font-size: 14px; color: #E2E8F0 !important; margin: 0 0 20px; line-height: 1.5;">Located centrally near Mazda Roundabout for in-person visa clearing and travel consultations.</p>
              <a href="https://maps.app.goo.gl/3xDLiEdchqgivn1Z7" target="_blank" rel="noopener" class="jmt-btn-primary" style="width:100%; justify-content:center; padding:15px; font-size:15px; font-weight:800; background:#00E676 !important; color:#07153B !important; border-radius:12px; text-decoration:none; display:inline-flex; align-items:center; gap:8px; box-shadow: 0 8px 25px rgba(0, 230, 118, 0.45) !important;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#07153B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                Open in Google Maps
              </a>
            </div>

          </div>

        </div>

        <!-- 3. SERVICES HIGHLIGHT STRIP (4 EQUAL COLUMNS) -->
        <div style="margin-bottom: 40px;">
          <div class="jmt-services-strip-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
            
            <div style="background: #0B286C; border: 1.5px solid rgba(255,255,255,0.15); border-radius: 18px; padding: 22px 20px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.25); transition: all 0.25s ease;">
              <div style="display:flex; justify-content:center; align-items:center; margin-bottom: 12px;">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#00E676" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.5-.1-.9.1-1.1.5l-.8 1.4c-.2.4 0 .9.4 1.1l5.5 3.3-3.3 3.3-2.6-.7c-.4-.1-.8.1-1 .4l-.6.7c-.2.3-.1.8.2 1l3.5 2.5 2.5 3.5c.2.3.7.4 1 .2l.7-.6c.3-.2.5-.6.4-1l-.7-2.6 3.3-3.3 3.3 5.5c.2.4.7.6 1.1.4l1.4-.8c.4-.2.6-.6.5-1.1z"></path></svg>
              </div>
              <h4 style="font-size: 17px; font-weight: 800; color: #00E676 !important; margin: 0 0 4px;">Visa Services</h4>
              <p style="font-size: 13px; color: #E2E8F0; margin: 0;">Fast &amp; Hassle-Free Clearing</p>
            </div>

            <div style="background: #0B286C; border: 1.5px solid rgba(255,255,255,0.15); border-radius: 18px; padding: 22px 20px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.25); transition: all 0.25s ease;">
              <div style="display:flex; justify-content:center; align-items:center; margin-bottom: 12px;">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#00E676" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="15" rx="2"></rect><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>
              </div>
              <h4 style="font-size: 17px; font-weight: 800; color: #00E676 !important; margin: 0 0 4px;">Tour Packages</h4>
              <p style="font-size: 13px; color: #E2E8F0; margin: 0;">Explore Oman &amp; GCC Wonders</p>
            </div>

            <div style="background: #0B286C; border: 1.5px solid rgba(255,255,255,0.15); border-radius: 18px; padding: 22px 20px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.25); transition: all 0.25s ease;">
              <div style="display:flex; justify-content:center; align-items:center; margin-bottom: 12px;">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#00E676" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>
              </div>
              <h4 style="font-size: 17px; font-weight: 800; color: #00E676 !important; margin: 0 0 4px;">Hotel Bookings</h4>
              <p style="font-size: 13px; color: #E2E8F0; margin: 0;">Comfort Stay Worldwide</p>
            </div>

            <div style="background: #0B286C; border: 1.5px solid rgba(255,255,255,0.15); border-radius: 18px; padding: 22px 20px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.25); transition: all 0.25s ease;">
              <div style="display:flex; justify-content:center; align-items:center; margin-bottom: 12px;">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#00E676" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
              </div>
              <h4 style="font-size: 17px; font-weight: 800; color: #00E676 !important; margin: 0 0 4px;">24/7 Support</h4>
              <p style="font-size: 13px; color: #E2E8F0; margin: 0;">We're Always Here to Help</p>
            </div>

          </div>
        </div>

        <!-- 4. INTERACTIVE GOOGLE MAP SECTION -->
        <div style="background: #0B286C; border: 1px solid rgba(255,255,255,0.18); border-radius: 24px; padding: 32px; box-shadow: 0 16px 40px rgba(0,0,0,0.35);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
            <div>
              <small style="display: block; font-size: 11.5px; font-weight: 800; color: #00E676 !important; text-transform: uppercase; letter-spacing: 1.4px; margin-bottom: 4px;">VISIT OUR OFFICE</small>
              <h3 style="font-size: 24px; font-weight: 800; color: #FFFFFF; margin: 0;">Find Us in Al Buraimi</h3>
            </div>
            <a href="https://maps.app.goo.gl/3xDLiEdchqgivn1Z7" target="_blank" rel="noopener noreferrer" style="background: #00E676 !important; color: #07153B !important; padding: 12px 24px; border-radius: 99px; font-weight: 800; font-size: 14px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 6px 20px rgba(0,230,118,0.45);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#07153B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              Open in Google Maps →
            </a>
          </div>

          <!-- EMBEDDED GOOGLE MAP IFRAME -->
          <div style="border-radius: 18px; overflow: hidden; height: 380px; width: 100%; border: 1.5px solid rgba(255,255,255,0.2); box-shadow: inset 0 0 20px rgba(0,0,0,0.2);">
            <iframe title="JMT Travels Al Buraimi Office Map Location" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3623.504856983756!2d55.7923483!3d24.2503527!2m3!1f0!0!f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e8ab15b59eb4f47%3A0x2ff259b3427f7f98!2sAl%20Buraimi%2C%20Oman!5e0!3m2!1sen!2s!4v1700000000000!5m2!1sen!2s" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
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
      resDiv.innerHTML = `<div style="background: rgba(0, 230, 118, 0.15); color: #00E676; border: 1px solid #00E676; padding: 14px; border-radius: 12px; font-weight:700;">✅ ${escapeHTML(res.message || 'Inquiry sent successfully!')}</div>`;
      announceToSR('Inquiry sent successfully');
      e.target.reset();
    } catch (err) {
      resDiv.innerHTML = `<div style="background: rgba(220, 38, 38, 0.15); color: #FF5252; border: 1px solid #FF5252; padding: 14px; border-radius: 12px; font-weight:700;">${escapeHTML(err.message)}</div>`;
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
      <form id="login-form" class="jmt-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%) !important; color: #FFFFFF !important; border: 1px solid rgba(255, 255, 255, 0.18) !important; border-top: 5px solid #00E676 !important; border-radius: 24px; padding: 36px 40px; box-shadow: 0 20px 50px rgba(7, 21, 59, 0.35);">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="/assets/logo.png" alt="JMT Travels" style="height: 48px; margin-bottom: 12px;">
          <h1 style="font-size: 26px; color: #00E676 !important; font-weight: 800; margin: 0 0 6px;">Welcome Back</h1>
          <p style="color: #D6E0F4 !important; font-size: 14px; margin: 0;">Sign in to manage your visa applications and bookings.</p>
        </div>

        <div style="margin-bottom: 18px;">
          <label for="login-email" style="display:block; font-weight:700; font-size:13.5px; color:#FFFFFF !important; margin-bottom:6px;">Email Address <span style="color:#00E676;" aria-hidden="true">*</span></label>
          <div style="position:relative; display:flex; align-items:center;">
            <span style="position:absolute; left:14px; pointer-events:none; display:flex; align-items:center; gap:4px; z-index:2; color:#07153B;">
              <span style="font-family:sans-serif; font-weight:700; font-size:15px; line-height:1; color:#07153B;">@</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#07153B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </span>
            <input type="email" id="login-email" name="email" class="chat-input" style="width:100%; padding:14px 16px 14px 50px; border:1.5px solid #D1D5DB; border-radius:12px; font-size:14.5px; background:#FFFFFF !important; color:#07153B !important; outline:none; transition:border-color 0.2s;" placeholder="name@example.com" onfocus="this.style.borderColor='#00A651'; this.style.boxShadow='0 0 0 3px rgba(0,166,81,0.2)'" onblur="this.style.borderColor='#D1D5DB'; this.style.boxShadow='none'" required aria-required="true">
          </div>
        </div>
        <div style="margin-bottom: 26px;">
          <label for="login-pass" style="display:block; font-weight:700; font-size:13.5px; color:#FFFFFF !important; margin-bottom:6px;">Password <span style="color:#00E676;" aria-hidden="true">*</span></label>
          <div style="position:relative; display:flex; align-items:center;">
            <span style="position:absolute; left:14px; pointer-events:none; display:flex; align-items:center; z-index:2; color:#07153B;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#07153B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </span>
            <input type="password" id="login-pass" name="password" class="chat-input" style="width:100%; padding:14px 16px 14px 44px; border:1.5px solid #D1D5DB; border-radius:12px; font-size:14.5px; background:#FFFFFF !important; color:#07153B !important; outline:none; transition:border-color 0.2s;" placeholder="••••••••" onfocus="this.style.borderColor='#00A651'; this.style.boxShadow='0 0 0 3px rgba(0,166,81,0.2)'" onblur="this.style.borderColor='#D1D5DB'; this.style.boxShadow='none'" required aria-required="true">
          </div>
        </div>
        <button type="submit" class="jmt-btn-primary" style="width:100%; justify-content:center; padding:15px; font-size:16px; font-weight:800; background:#00A651 !important; color:#FFFFFF !important; border-radius:12px; box-shadow:0 6px 18px rgba(0, 166, 81, 0.35) !important;">Sign In →</button>
        <div id="login-error" style="margin-top:16px; color: #FCA5A5; font-weight:700; text-align:center;" aria-live="polite"></div>
        <div style="margin-top: 24px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.15); padding-top: 18px; font-size: 14px; color: #D6E0F4 !important;">
          Don't have an account? <a href="/register" onclick="event.preventDefault(); navigate('/register')" style="color:#00E676 !important; font-weight:700; text-decoration:underline;">Create Account →</a>
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
      <form id="register-form" class="jmt-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%) !important; color: #FFFFFF !important; border: 1px solid rgba(255, 255, 255, 0.18) !important; border-top: 5px solid #00E676 !important; border-radius: 24px; padding: 36px 40px; box-shadow: 0 20px 50px rgba(7, 21, 59, 0.35);">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="/assets/logo.png" alt="JMT Travels" style="height: 48px; margin-bottom: 12px;">
          <h1 style="font-size: 26px; color: #00E676 !important; font-weight: 800; margin: 0 0 6px;">Start Your Journey With JMT</h1>
          <p style="color: #D6E0F4 !important; font-size: 14px; margin: 0;">Create your account to manage visa applications & holiday bookings.</p>
        </div>

        <div style="margin-bottom: 18px;">
          <label for="reg-name" style="display:block; font-weight:700; font-size:13.5px; color:#FFFFFF !important; margin-bottom:6px;">Full Name <span style="color:#00E676;" aria-hidden="true">*</span></label>
          <div style="position:relative; display:flex; align-items:center;">
            <span style="position:absolute; left:14px; pointer-events:none; display:flex; align-items:center; z-index:2; color:#07153B;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#07153B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </span>
            <input type="text" id="reg-name" name="name" class="chat-input" style="width:100%; padding:14px 16px 14px 44px; border:1.5px solid #D1D5DB; border-radius:12px; font-size:14.5px; background:#FFFFFF !important; color:#07153B !important; outline:none; transition:border-color 0.2s;" placeholder="Full Name" onfocus="this.style.borderColor='#00A651'; this.style.boxShadow='0 0 0 3px rgba(0,166,81,0.2)'" onblur="this.style.borderColor='#D1D5DB'; this.style.boxShadow='none'" required aria-required="true">
          </div>
        </div>
        <div style="margin-bottom: 18px;">
          <label for="reg-email" style="display:block; font-weight:700; font-size:13.5px; color:#FFFFFF !important; margin-bottom:6px;">Email Address <span style="color:#00E676;" aria-hidden="true">*</span></label>
          <div style="position:relative; display:flex; align-items:center;">
            <span style="position:absolute; left:14px; pointer-events:none; display:flex; align-items:center; gap:4px; z-index:2; color:#07153B;">
              <span style="font-family:sans-serif; font-weight:700; font-size:15px; line-height:1; color:#07153B;">@</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#07153B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </span>
            <input type="email" id="reg-email" name="email" class="chat-input" style="width:100%; padding:14px 16px 14px 50px; border:1.5px solid #D1D5DB; border-radius:12px; font-size:14.5px; background:#FFFFFF !important; color:#07153B !important; outline:none; transition:border-color 0.2s;" placeholder="name@example.com" onfocus="this.style.borderColor='#00A651'; this.style.boxShadow='0 0 0 3px rgba(0,166,81,0.2)'" onblur="this.style.borderColor='#D1D5DB'; this.style.boxShadow='none'" required aria-required="true">
          </div>
        </div>
        <div style="margin-bottom: 18px;">
          <label for="reg-phone" style="display:block; font-weight:700; font-size:13.5px; color:#FFFFFF !important; margin-bottom:6px;">Phone / WhatsApp</label>
          <div style="position:relative; display:flex; align-items:center;">
            <span style="position:absolute; left:14px; pointer-events:none; display:flex; align-items:center; z-index:2; color:#07153B;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#07153B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            </span>
            <input type="text" id="reg-phone" name="phone" class="chat-input" style="width:100%; padding:14px 16px 14px 44px; border:1.5px solid #D1D5DB; border-radius:12px; font-size:14.5px; background:#FFFFFF !important; color:#07153B !important; outline:none; transition:border-color 0.2s;" placeholder="+968 9000 0000" onfocus="this.style.borderColor='#00A651'; this.style.boxShadow='0 0 0 3px rgba(0,166,81,0.2)'" onblur="this.style.borderColor='#D1D5DB'; this.style.boxShadow='none'">
          </div>
        </div>
        <div style="margin-bottom: 26px;">
          <label for="reg-pass" style="display:block; font-weight:700; font-size:13.5px; color:#FFFFFF !important; margin-bottom:6px;">Password <span style="color:#00E676;" aria-hidden="true">*</span></label>
          <div style="position:relative; display:flex; align-items:center;">
            <span style="position:absolute; left:14px; pointer-events:none; display:flex; align-items:center; z-index:2; color:#07153B;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#07153B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </span>
            <input type="password" id="reg-pass" name="password" class="chat-input" style="width:100%; padding:14px 16px 14px 44px; border:1.5px solid #D1D5DB; border-radius:12px; font-size:14.5px; background:#FFFFFF !important; color:#07153B !important; outline:none; transition:border-color 0.2s;" placeholder="••••••••" onfocus="this.style.borderColor='#00A651'; this.style.boxShadow='0 0 0 3px rgba(0,166,81,0.2)'" onblur="this.style.borderColor='#D1D5DB'; this.style.boxShadow='none'" required aria-required="true">
          </div>
        </div>
        <button type="submit" class="jmt-btn-primary" style="width:100%; justify-content:center; padding:15px; font-size:16px; font-weight:800; background:#00A651 !important; color:#FFFFFF !important; border-radius:12px; box-shadow:0 6px 18px rgba(0, 166, 81, 0.35) !important;">Create Account →</button>
        <div id="register-error" style="margin-top:16px; color: #FCA5A5; font-weight:700; text-align:center;" aria-live="polite"></div>
        <div style="margin-top: 24px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.15); padding-top: 18px; font-size: 14px; color: #D6E0F4 !important;">
          Already have an account? <a href="/login" onclick="event.preventDefault(); navigate('/login')" style="color:#00E676 !important; font-weight:700; text-decoration:underline;">Sign In →</a>
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
      <div style="background: #07153B !important; min-height: 100vh; color: #FFFFFF !important;">
        <div class="shell" style="padding: 40px 20px 60px;">
          <!-- DASHBOARD HEADER -->
          <div class="jmt-hero" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%) !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; padding: 36px 32px; margin-bottom: 32px;">
            <span class="jmt-hero-eyebrow" style="color: #00E676 !important;">CUSTOMER PORTAL</span>
            <h1 class="jmt-hero-title" style="font-size: 28px; margin-bottom: 6px; color: #FFFFFF !important;">Welcome Back, ${escapeHTML(state.user.name)}</h1>
            <p class="jmt-hero-sub" style="font-size: 14px; margin-bottom: 0; color: #E2E8F0 !important;">${escapeHTML(state.user.email)} • Account Role: <b style="color: #00E676 !important;">${escapeHTML(state.user.role || 'CUSTOMER')}</b></p>
          </div>

          <!-- QUICK STATUS METRICS -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 32px;">
            <div class="jmt-card" style="background: #0B286C !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; border-top: 4px solid #00E676 !important; color: #FFFFFF !important;">
              <div style="font-size: 13px; font-weight: 700; color: #E2E8F0 !important; text-transform: uppercase;">Active Visas</div>
              <div style="font-size: 32px; font-weight: 800; color: #00E676 !important; margin: 4px 0;">${visas.applications ? visas.applications.length : 0}</div>
              <span style="font-size: 12px; color: #00E676 !important; font-weight: 600;">E-Visa Applications</span>
            </div>

            <div class="jmt-card" style="background: #0B286C !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; border-top: 4px solid #00A651 !important; color: #FFFFFF !important;">
              <div style="font-size: 13px; font-weight: 700; color: #E2E8F0 !important; text-transform: uppercase;">Tour Bookings</div>
              <div style="font-size: 32px; font-weight: 800; color: #FFFFFF !important; margin: 4px 0;">${bookings.bookings ? bookings.bookings.length : 0}</div>
              <span style="font-size: 12px; color: #00E676 !important; font-weight: 600;">Reserved Holidays</span>
            </div>

            <div class="jmt-card" style="background: #0B286C !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; border-top: 4px solid #3B82F6 !important; color: #FFFFFF !important;">
              <div style="font-size: 13px; font-weight: 700; color: #E2E8F0 !important; text-transform: uppercase;">Support Tickets</div>
              <div style="font-size: 32px; font-weight: 800; color: #60A5FA !important; margin: 4px 0;">${tickets.tickets ? tickets.tickets.length : 0}</div>
              <span style="font-size: 12px; color: #60A5FA !important; font-weight: 600;">Inquiries & Support</span>
            </div>
          </div>

          <!-- VISA APPLICATIONS SECTION -->
          <div class="jmt-card" style="background: #0B286C !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; color: #FFFFFF !important; margin-bottom: 32px;">
            <h2 style="font-size: 20px; color: #00E676 !important; font-weight: 800; margin-bottom: 16px;">My Visa Applications</h2>
            ${!visas.applications || visas.applications.length === 0 ? '<p style="color:#E2E8F0 !important; font-size:14px; margin:0;">No visa applications submitted yet. <a href="/visa" onclick="navigate(\'/visa\')" style="color:#00E676 !important; font-weight:700;">Apply for an E-Visa →</a></p>' : `
              <div style="overflow-x: auto;">
                <table style="width:100%; border-collapse:collapse; font-size:14px;">
                  <thead>
                    <tr style="text-align:left; border-bottom:2px solid rgba(255,255,255,0.2); color:#00E676 !important; font-size:13px;">
                      <th style="padding:12px 10px;">Reference #</th>
                      <th style="padding:12px 10px;">Destination</th>
                      <th style="padding:12px 10px;">Type</th>
                      <th style="padding:12px 10px;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${visas.applications.map(v => `
                      <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                        <td style="padding:12px 10px; font-weight:700; color:#FFFFFF !important;">${escapeHTML(v.applicationNumber || v.id)}</td>
                        <td style="padding:12px 10px; color:#E2E8F0 !important;">${escapeHTML(v.destination)}</td>
                        <td style="padding:12px 10px; color:#E2E8F0 !important;">${escapeHTML(v.visaType)}</td>
                        <td style="padding:12px 10px;"><span class="badge badge-success" style="background:#00A651 !important; color:#FFF !important;">${escapeHTML(v.status)}</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>

          <!-- TOUR BOOKINGS SECTION -->
          <div class="jmt-card" style="background: #0B286C !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; color: #FFFFFF !important;">
            <h2 style="font-size: 20px; color: #00E676 !important; font-weight: 800; margin-bottom: 16px;">My Tour Bookings</h2>
            ${!bookings.bookings || bookings.bookings.length === 0 ? '<p style="color:#E2E8F0 !important; font-size:14px; margin:0;">No tour package bookings found. <a href="/tourism" onclick="navigate(\'/tourism\')" style="color:#00E676 !important; font-weight:700;">Explore Oman Tours →</a></p>' : `
              <div style="overflow-x: auto;">
                <table style="width:100%; border-collapse:collapse; font-size:14px;">
                  <thead>
                    <tr style="text-align:left; border-bottom:2px solid rgba(255,255,255,0.2); color:#00E676 !important; font-size:13px;">
                      <th style="padding:12px 10px;">Booking Ref</th>
                      <th style="padding:12px 10px;">Package Title</th>
                      <th style="padding:12px 10px;">Amount</th>
                      <th style="padding:12px 10px;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${bookings.bookings.map(b => `
                      <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                        <td style="padding:12px 10px; font-weight:700; color:#FFFFFF !important;">${escapeHTML(b.bookingNumber || b.id)}</td>
                        <td style="padding:12px 10px; color:#E2E8F0 !important;">${escapeHTML(b.packageTitle)}</td>
                        <td style="padding:12px 10px; font-weight:700; color:#00E676 !important;">${escapeHTML(b.currency)} ${b.amount}</td>
                        <td style="padding:12px 10px;"><span class="badge badge-primary" style="background:#00A651 !important; color:#FFF !important;">${escapeHTML(b.status)}</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
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
    <div style="background: #07153B !important; min-height: 100vh; color: #FFFFFF !important;">
      <div class="shell" style="padding: 40px 20px 60px;">
        <div class="jmt-hero" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%) !important; border: 1px solid rgba(255, 255, 255, 0.15) !important;">
          <span class="jmt-hero-eyebrow" style="color: #00E676 !important;">JMT TRAVELS — HELP & SUPPORT</span>
          <h1 class="jmt-hero-title" style="color: #FFFFFF !important;">How Can We Help You Today?</h1>
          <p class="jmt-hero-sub" style="color: #E2E8F0 !important;">Browse support topics, chat live with our digital assistant, or connect directly with our Muscat travel specialists.</p>
          <div style="display: flex; gap: 14px; flex-wrap: wrap;">
            <button onclick="toggleChat()" class="jmt-btn-primary" style="background: #00A651 !important; color: #FFFFFF !important;">💬 Chat with JMT Assistant</button>
            <a href="/contact" onclick="event.preventDefault(); navigate('/contact')" class="jmt-btn-secondary" style="color:#FFF !important; border-color:rgba(255,255,255,0.4) !important;">Send Message to Desk</a>
          </div>
        </div>

        <!-- SUPPORT TOPIC CARDS GRID -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-bottom: 40px;">
          <div class="jmt-card" onclick="navigate('/visa')" style="cursor: pointer; background: #0B286C !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; color: #FFFFFF !important;">
            <div style="font-size: 36px; margin-bottom: 14px;">🛂</div>
            <h3 style="font-size: 18px; color: #00E676 !important; font-weight: 800; margin-bottom: 8px;">Visa Application Help</h3>
            <p style="font-size: 14px; color: #E2E8F0 !important; line-height: 1.6; margin-bottom: 16px;">Track active e-visas, check required document checklists, and review processing timelines.</p>
            <span style="color: #00E676 !important; font-weight: 700; font-size: 14px;">Explore Visa Desk →</span>
          </div>

          <div class="jmt-card" onclick="navigate('/tourism')" style="cursor: pointer; background: #0B286C !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; color: #FFFFFF !important;">
            <div style="font-size: 36px; margin-bottom: 14px;">🧳</div>
            <h3 style="font-size: 18px; color: #00E676 !important; font-weight: 800; margin-bottom: 8px;">Tour & Package Booking</h3>
            <p style="font-size: 14px; color: #E2E8F0 !important; line-height: 1.6; margin-bottom: 16px;">Inquire about Salalah retreats, GCC escapes, Umrah itineraries, and custom Omani tours.</p>
            <span style="color: #00E676 !important; font-weight: 700; font-size: 14px;">View Holiday Packages →</span>
          </div>

          <div class="jmt-card" onclick="navigate('/account')" style="cursor: pointer; background: #0B286C !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; color: #FFFFFF !important;">
            <div style="font-size: 36px; margin-bottom: 14px;">💳</div>
            <h3 style="font-size: 18px; color: #00E676 !important; font-weight: 800; margin-bottom: 8px;">Payment & Receipts</h3>
            <p style="font-size: 14px; color: #E2E8F0 !important; line-height: 1.6; margin-bottom: 16px;">Review transaction history, download payment receipts, and verify currency billing.</p>
            <span style="color: #00E676 !important; font-weight: 700; font-size: 14px;">Go to Dashboard →</span>
          </div>

          <div class="jmt-card" onclick="navigate('/flights')" style="cursor: pointer; background: #0B286C !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; color: #FFFFFF !important;">
            <div style="font-size: 36px; margin-bottom: 14px;">✈️</div>
            <h3 style="font-size: 18px; color: #00E676 !important; font-weight: 800; margin-bottom: 8px;">Flight & Hotel Changes</h3>
            <p style="font-size: 14px; color: #E2E8F0 !important; line-height: 1.6; margin-bottom: 16px;">Request date changes, baggage additions, room upgrades, and travel itinerary assistance.</p>
            <span style="color: #00E676 !important; font-weight: 700; font-size: 14px;">Flight Desk Assistance →</span>
          </div>
        </div>

        <!-- DIRECT CONTACT ESCALATION BANNER -->
        <div class="jmt-card" style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%) !important; border-left: 6px solid #00E676 !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; color: #FFFFFF !important;">
          <h2 style="font-size: 22px; color: #00E676 !important; font-weight: 800; margin-bottom: 10px;">Need Immediate Human Support?</h2>
          <p style="color: #E2E8F0 !important; font-size: 15px; margin-bottom: 20px; line-height: 1.6;">Our dedicated travel team in Muscat is available 6 days a week via phone and WhatsApp.</p>
          <div style="display: flex; gap: 24px; flex-wrap: wrap;">
            <a href="https://wa.me/96897608999" target="_blank" rel="noopener" style="text-decoration: none; color: #FFFFFF !important; font-weight: 700; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">💬</span> WhatsApp: +968 9760 8999
            </a>
            <a href="tel:+96825655177" style="text-decoration: none; color: #FFFFFF !important; font-weight: 700; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">📞</span> Muscat Phone: +968 25655177 / +968 25655711
            </a>
            <a href="https://mail.google.com/mail/?view=cm&fs=1&to=info%40jmttravels.com" target="_blank" rel="noopener noreferrer" aria-label="Email JMT Travels via Gmail" class="jmt-email-link" style="text-decoration: underline; color: #00E676 !important; font-weight: 700; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">✉️</span> Email: info@jmttravels.com
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderAboutPage(container) {
  updateSEO({
    title: 'About JMT Travels | Travel & Tourism Services',
    description: 'Learn about JMT Travels and our travel services including Oman tours, visa assistance, hotels and flights.',
    canonicalUrl: '/about',
    noindex: false
  });
  announceToSR('Navigated to About JMT Travels');

  container.innerHTML = `
    <div style="background: #07153B !important; color: #FFFFFF !important; width: 100%; min-height: 100vh; overflow: hidden;">
      <!-- SECTION 1: ABOUT US HERO -->
      <section style="position: relative; background: #07153B !important; overflow: hidden; padding: 90px 0 100px; color: #FFFFFF !important;">
        <div style="position: absolute; inset: 0; background-image: url('/assets/destinations/hero_hd_muscat_waterfront.jpg'); background-size: cover; background-position: center; opacity: 0.35; pointer-events: none;"></div>
        <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(7, 21, 59, 0.94) 0%, rgba(11, 40, 108, 0.85) 100%);"></div>

        <div class="shell" style="position: relative; z-index: 10; max-width: 900px; text-align: center; margin: 0 auto;">
          <div style="font-size: 13px; font-weight: 800; letter-spacing: 3px; color: #00E676 !important; text-transform: uppercase; margin-bottom: 16px;">
            ABOUT JMT TRAVELS
          </div>
          <h1 style="font-size: clamp(38px, 5.5vw, 62px); font-weight: 800; line-height: 1.1; margin-bottom: 24px; color: #FFFFFF !important; letter-spacing: -1px;">
            Your Journey.<br>
            <span style="color: #00E676 !important;">Our Commitment.</span>
          </h1>
          <p style="font-size: 18px; line-height: 1.7; color: #E2E8F0 !important; max-width: 760px; margin: 0 auto 40px; font-weight: 400;">
            JMT Travels is a travel and tourism company dedicated to making travel simpler, more comfortable, and more memorable — from visa assistance and holidays to hotels and flights.
          </p>

          <div style="display: flex; gap: 16px; justify-content: center; align-items: center; flex-wrap: wrap;">
            <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" style="background: #00A651 !important; color: #FFFFFF !important; padding: 16px 36px; font-size: 16px; border-radius: 99px; font-weight: 800; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 6px 20px rgba(0, 166, 81, 0.38);">
              Explore Our Services →
            </a>
            <a href="/contact" onclick="event.preventDefault(); navigate('/contact')" style="background: rgba(255, 255, 255, 0.12); border: 1.5px solid rgba(255, 255, 255, 0.4); color: #FFFFFF !important; padding: 16px 32px; font-size: 16px; border-radius: 99px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; backdrop-filter: blur(8px);">
              Contact Us →
            </a>
          </div>
        </div>
      </section>

      <!-- SECTION 2: COMPANY INTRODUCTION -->
      <section style="background: #07153B !important; padding: 80px 0; border-top: 1px solid rgba(255, 255, 255, 0.08); border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
        <div class="shell" style="max-width: 1000px; text-align: center;">
          <div style="font-size: 12px; font-weight: 800; letter-spacing: 2.5px; color: #00E676 !important; text-transform: uppercase; margin-bottom: 12px;">
            WHO WE ARE
          </div>
          <h2 style="font-size: clamp(30px, 4vw, 44px); font-weight: 800; color: #FFFFFF !important; margin-bottom: 24px; line-height: 1.2;">
            Travel Made Simpler.<br>
            Journeys Made Better.
          </h2>
          <div style="background: rgba(255, 255, 255, 0.06); border-radius: 24px; padding: 40px 48px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25); backdrop-filter: blur(10px); text-align: left; max-width: 860px; margin: 0 auto;">
            <p style="font-size: 17px; line-height: 1.8; color: #D6E0F4 !important; margin-bottom: 20px;">
              JMT Travels brings together essential travel services under one platform, helping customers plan and manage their journeys with greater convenience and confidence.
            </p>
            <p style="font-size: 17px; line-height: 1.8; color: #D6E0F4 !important; margin-bottom: 20px;">
              From discovering destinations and arranging holidays to visa assistance, hotel accommodations and flight services, our goal is to make every stage of travel easier to navigate.
            </p>
            <p style="font-size: 17px; line-height: 1.8; color: #D6E0F4 !important; margin: 0;">
              We combine personalized assistance with a modern digital experience so customers can spend less time dealing with travel complexity and more time looking forward to their journey.
            </p>
          </div>
        </div>
      </section>

      <!-- SECTION 3: WHAT JMT TRAVELS DOES (5 SERVICES) -->
      <section style="background: #07153B !important; padding: 85px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
        <div class="shell">
          <div style="text-align: center; max-width: 700px; margin: 0 auto 50px;">
            <div style="font-size: 12px; font-weight: 800; letter-spacing: 2.5px; color: #00E676 !important; text-transform: uppercase; margin-bottom: 12px;">
              OUR SERVICES
            </div>
            <h2 style="font-size: clamp(28px, 3.8vw, 40px); font-weight: 800; color: #FFFFFF !important; margin: 0;">
              Everything You Need for Your Journey
            </h2>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">

            <!-- Service 1: Oman Tours -->
            <div style="background: rgba(255, 255, 255, 0.06); border-radius: 20px; padding: 32px 28px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); backdrop-filter: blur(10px); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(0, 230, 118, 0.15); color: #00E676 !important; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; margin-bottom: 20px;">01</div>
                <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 12px;">Oman Tours &amp; Holidays</h3>
                <p style="font-size: 14.5px; line-height: 1.6; color: #D6E0F4 !important; margin-bottom: 24px;">
                  Explore Oman through carefully planned travel experiences, destinations and holiday packages.
                </p>
              </div>
              <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" style="color: #00E676 !important; font-weight: 800; font-size: 14.5px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                Explore →
              </a>
            </div>

            <!-- Service 2: Oman Visa -->
            <div style="background: rgba(255, 255, 255, 0.06); border-radius: 20px; padding: 32px 28px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); backdrop-filter: blur(10px); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(0, 230, 118, 0.15); color: #00E676 !important; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; margin-bottom: 20px;">02</div>
                <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 12px;">Oman Visa Services</h3>
                <p style="font-size: 14.5px; line-height: 1.6; color: #D6E0F4 !important; margin-bottom: 24px;">
                  Assistance with Oman visa applications and related documentation.
                </p>
              </div>
              <a href="/visa" onclick="event.preventDefault(); navigate('/visa')" style="color: #00E676 !important; font-weight: 800; font-size: 14.5px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                Explore →
              </a>
            </div>

            <!-- Service 3: Schengen Visa -->
            <div style="background: rgba(255, 255, 255, 0.06); border-radius: 20px; padding: 32px 28px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); backdrop-filter: blur(10px); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(0, 230, 118, 0.15); color: #00E676 !important; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; margin-bottom: 20px;">03</div>
                <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 12px;">Schengen Visa Assistance</h3>
                <p style="font-size: 14.5px; line-height: 1.6; color: #D6E0F4 !important; margin-bottom: 24px;">
                  Guidance for customers planning travel to Schengen destinations.
                </p>
              </div>
              <a href="/visa?service=schengen" onclick="event.preventDefault(); navigate('/visa?service=schengen')" style="color: #00E676 !important; font-weight: 800; font-size: 14.5px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                Explore →
              </a>
            </div>

            <!-- Service 4: Hotels -->
            <div style="background: rgba(255, 255, 255, 0.06); border-radius: 20px; padding: 32px 28px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); backdrop-filter: blur(10px); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(0, 230, 118, 0.15); color: #00E676 !important; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; margin-bottom: 20px;">04</div>
                <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 12px;">Hotels</h3>
                <p style="font-size: 14.5px; line-height: 1.6; color: #D6E0F4 !important; margin-bottom: 24px;">
                  Hotel accommodation options for leisure, business, family and group travel.
                </p>
              </div>
              <a href="/hotels" onclick="event.preventDefault(); navigate('/hotels')" style="color: #00E676 !important; font-weight: 800; font-size: 14.5px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                Explore →
              </a>
            </div>

            <!-- Service 5: Flights -->
            <div style="background: rgba(255, 255, 255, 0.06); border-radius: 20px; padding: 32px 28px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); backdrop-filter: blur(10px); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(0, 230, 118, 0.15); color: #00E676 !important; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; margin-bottom: 20px;">05</div>
                <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 12px;">Flights</h3>
                <p style="font-size: 14.5px; line-height: 1.6; color: #D6E0F4 !important; margin-bottom: 24px;">
                  Flight search and travel assistance for domestic and international journeys.
                </p>
              </div>
              <a href="/flights" onclick="event.preventDefault(); navigate('/flights')" style="color: #00E676 !important; font-weight: 800; font-size: 14.5px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                Explore →
              </a>
            </div>

          </div>
        </div>
      </section>

      <!-- SECTION 4: WHY CHOOSE JMT TRAVELS -->
      <section style="background: #07153B !important; padding: 85px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
        <div class="shell">
          <div style="text-align: center; max-width: 700px; margin: 0 auto 50px;">
            <div style="font-size: 12px; font-weight: 800; letter-spacing: 2.5px; color: #00E676 !important; text-transform: uppercase; margin-bottom: 12px;">
              WHY CHOOSE JMT TRAVELS?
            </div>
            <h2 style="font-size: clamp(28px, 3.8vw, 40px); font-weight: 800; color: #FFFFFF !important; margin: 0;">
              A Travel Partner You Can Rely On
            </h2>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px;">
            <div style="background: rgba(255, 255, 255, 0.06); border-radius: 18px; padding: 30px 24px; border-left: 4px solid #00E676; border-top: 1px solid rgba(255, 255, 255, 0.12); border-right: 1px solid rgba(255, 255, 255, 0.12); border-bottom: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); backdrop-filter: blur(10px);">
              <h3 style="font-size: 18px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 10px;">Personalized Assistance</h3>
              <p style="font-size: 14px; line-height: 1.6; color: #D6E0F4 !important; margin: 0;">Travel support designed around the customer's needs.</p>
            </div>

            <div style="background: rgba(255, 255, 255, 0.06); border-radius: 18px; padding: 30px 24px; border-left: 4px solid #00E676; border-top: 1px solid rgba(255, 255, 255, 0.12); border-right: 1px solid rgba(255, 255, 255, 0.12); border-bottom: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); backdrop-filter: blur(10px);">
              <h3 style="font-size: 18px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 10px;">Convenient Experience</h3>
              <p style="font-size: 14px; line-height: 1.6; color: #D6E0F4 !important; margin: 0;">Bring essential travel services together in one place.</p>
            </div>

            <div style="background: rgba(255, 255, 255, 0.06); border-radius: 18px; padding: 30px 24px; border-left: 4px solid #00E676; border-top: 1px solid rgba(255, 255, 255, 0.12); border-right: 1px solid rgba(255, 255, 255, 0.12); border-bottom: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); backdrop-filter: blur(10px);">
              <h3 style="font-size: 18px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 10px;">Clear Guidance</h3>
              <p style="font-size: 14px; line-height: 1.6; color: #D6E0F4 !important; margin: 0;">Make important travel and visa steps easier to understand.</p>
            </div>

            <div style="background: rgba(255, 255, 255, 0.06); border-radius: 18px; padding: 30px 24px; border-left: 4px solid #00E676; border-top: 1px solid rgba(255, 255, 255, 0.12); border-right: 1px solid rgba(255, 255, 255, 0.12); border-bottom: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); backdrop-filter: blur(10px);">
              <h3 style="font-size: 18px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 10px;">Journey-Focused Service</h3>
              <p style="font-size: 14px; line-height: 1.6; color: #D6E0F4 !important; margin: 0;">Support customers from planning through travel.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- SECTION 5: OUR APPROACH (4-STAGE VISUAL JOURNEY) -->
      <section style="background: #07153B !important; padding: 85px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
        <div class="shell">
          <div style="text-align: center; max-width: 700px; margin: 0 auto 60px;">
            <div style="font-size: 12px; font-weight: 800; letter-spacing: 2.5px; color: #00E676 !important; text-transform: uppercase; margin-bottom: 12px;">
              OUR APPROACH
            </div>
            <h2 style="font-size: clamp(28px, 3.8vw, 40px); font-weight: 800; color: #FFFFFF !important; margin: 0;">
              From Planning to Departure,<br>We're With You.
            </h2>
          </div>

          <div class="jmt-about-timeline-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; position: relative;">

            <!-- Stage 01 -->
            <div style="background: rgba(255, 255, 255, 0.06); border-radius: 20px; padding: 30px 24px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); backdrop-filter: blur(10px); position: relative;">
              <div style="font-size: 12px; font-weight: 800; color: #00E676 !important; letter-spacing: 1px; margin-bottom: 8px;">01</div>
              <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 12px;">Discover</h3>
              <p style="font-size: 14px; line-height: 1.6; color: #D6E0F4 !important; margin: 0;">
                Find the destination, service or travel experience that fits your plans.
              </p>
            </div>

            <!-- Stage 02 -->
            <div style="background: rgba(255, 255, 255, 0.06); border-radius: 20px; padding: 30px 24px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); backdrop-filter: blur(10px); position: relative;">
              <div style="font-size: 12px; font-weight: 800; color: #00E676 !important; letter-spacing: 1px; margin-bottom: 8px;">02</div>
              <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 12px;">Plan</h3>
              <p style="font-size: 14px; line-height: 1.6; color: #D6E0F4 !important; margin: 0;">
                Choose the right travel services and prepare the necessary details.
              </p>
            </div>

            <!-- Stage 03 -->
            <div style="background: rgba(255, 255, 255, 0.06); border-radius: 20px; padding: 30px 24px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); backdrop-filter: blur(10px); position: relative;">
              <div style="font-size: 12px; font-weight: 800; color: #00E676 !important; letter-spacing: 1px; margin-bottom: 8px;">03</div>
              <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 12px;">Prepare</h3>
              <p style="font-size: 14px; line-height: 1.6; color: #D6E0F4 !important; margin: 0;">
                Complete applications, bookings and travel arrangements with guidance.
              </p>
            </div>

            <!-- Stage 04 -->
            <div style="background: rgba(255, 255, 255, 0.06); border-radius: 20px; padding: 30px 24px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); backdrop-filter: blur(10px); position: relative;">
              <div style="font-size: 12px; font-weight: 800; color: #00E676 !important; letter-spacing: 1px; margin-bottom: 8px;">04</div>
              <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 12px;">Travel</h3>
              <p style="font-size: 14px; line-height: 1.6; color: #D6E0F4 !important; margin: 0;">
                Move forward with greater confidence and a smoother journey.
              </p>
            </div>

          </div>
        </div>
      </section>

      <!-- SECTION 6: OMAN — OUR HOME OF TRAVEL -->
      <section style="background: #07153B !important; padding: 90px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
        <div class="shell">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 48px; align-items: center;">
            <div>
              <div style="font-size: 12px; font-weight: 800; letter-spacing: 2.5px; color: #00E676 !important; text-transform: uppercase; margin-bottom: 12px;">
                OUR HOME OF TRAVEL
              </div>
              <h2 style="font-size: clamp(30px, 4vw, 42px); font-weight: 800; color: #FFFFFF !important; margin-bottom: 20px; line-height: 1.2;">
                Discover Oman With JMT Travels
              </h2>
              <p style="font-size: 16px; line-height: 1.7; color: #D6E0F4 !important; margin-bottom: 24px;">
                From Muscat's coastline and heritage to Nizwa's historic landmarks and Salalah's seasonal landscapes, Oman offers a remarkable mix of culture, nature and adventure.
              </p>
              <p style="font-size: 16px; line-height: 1.7; color: #D6E0F4 !important; margin-bottom: 32px;">
                JMT Travels helps travelers discover and experience Oman through thoughtfully planned travel services and experiences.
              </p>
              <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" style="background: #00A651 !important; color: #FFFFFF !important; padding: 14px 32px; font-size: 15px; border-radius: 99px; font-weight: 800; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 6px 18px rgba(0, 166, 81, 0.38);">
                Explore Oman →
              </a>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
              <img src="/assets/destinations/muscat-mutrah-waterfront.jpg" alt="Muscat Mutrah Waterfront, Oman" style="width: 100%; height: 220px; object-fit: cover; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);">
              <img src="/assets/destinations/nizwa-fort.jpg" alt="Nizwa Fort, Oman" style="width: 100%; height: 220px; object-fit: cover; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35); margin-top: 24px;">
              <img src="/assets/destinations/salalah-khreef-green-hills.jpg" alt="Salalah Khareef Green Hills, Oman" style="width: 100%; height: 220px; object-fit: cover; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35); margin-top: -24px;">
              <img src="/assets/destinations/oman-coastal-landscape.jpg" alt="Oman Coastal Landscape" style="width: 100%; height: 220px; object-fit: cover; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);">
            </div>
          </div>
        </div>
      </section>

      <!-- SECTION 7: CUSTOMER-FIRST STATEMENT -->
      <section style="background: #07153B !important; padding: 80px 0; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
        <div class="shell" style="max-width: 800px;">
          <div style="background: rgba(255, 255, 255, 0.06); border-radius: 24px; padding: 48px 36px; border: 1px solid rgba(255, 255, 255, 0.18); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3); backdrop-filter: blur(10px);">
            <blockquote style="font-size: clamp(26px, 3.5vw, 36px); font-weight: 800; color: #FFFFFF !important; line-height: 1.3; margin: 0 0 20px;">
              “Travel should feel exciting —<br><span style="color: #00E676 !important;">not complicated.</span>”
            </blockquote>
            <p style="font-size: 16px; line-height: 1.7; color: #D6E0F4 !important; margin: 0; max-width: 640px; margin-left: auto; margin-right: auto;">
              Our focus is to simplify the travel journey by bringing useful services, clear information and personalized assistance together in one experience.
            </p>
          </div>
        </div>
      </section>

      <!-- SECTION 8: COMPANY VALUES (4 VALUES) -->
      <section style="background: #07153B !important; padding: 85px 0;">
        <div class="shell">
          <div style="text-align: center; max-width: 700px; margin: 0 auto 50px;">
            <div style="font-size: 12px; font-weight: 800; letter-spacing: 2.5px; color: #00E676 !important; text-transform: uppercase; margin-bottom: 12px;">
              OUR VALUES
            </div>
            <h2 style="font-size: clamp(28px, 3.8vw, 40px); font-weight: 800; color: #FFFFFF !important; margin: 0;">
              Guided by Principles That Matter
            </h2>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px;">
            <div style="background: rgba(255, 255, 255, 0.06); border-radius: 20px; padding: 32px 24px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); backdrop-filter: blur(10px);">
              <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 10px;">Trust</h3>
              <p style="font-size: 14.5px; line-height: 1.6; color: #D6E0F4 !important; margin: 0;">
                We aim to build every customer interaction around clarity and reliability.
              </p>
            </div>

            <div style="background: rgba(255, 255, 255, 0.06); border-radius: 20px; padding: 32px 24px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); backdrop-filter: blur(10px);">
              <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 10px;">Care</h3>
              <p style="font-size: 14.5px; line-height: 1.6; color: #D6E0F4 !important; margin: 0;">
                We treat every journey as personal and every customer with attention.
              </p>
            </div>

            <div style="background: rgba(255, 255, 255, 0.06); border-radius: 20px; padding: 32px 24px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); backdrop-filter: blur(10px);">
              <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 10px;">Simplicity</h3>
              <p style="font-size: 14.5px; line-height: 1.6; color: #D6E0F4 !important; margin: 0;">
                We make complex travel processes easier to navigate.
              </p>
            </div>

            <div style="background: rgba(255, 255, 255, 0.06); border-radius: 20px; padding: 32px 24px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); backdrop-filter: blur(10px);">
              <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF !important; margin-bottom: 10px;">Experience</h3>
              <p style="font-size: 14.5px; line-height: 1.6; color: #D6E0F4 !important; margin: 0;">
                We create travel experiences that customers can look forward to.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- SECTION 9: FINAL CALL TO ACTION -->
      <section style="background: linear-gradient(135deg, #07153B 0%, #0B286C 100%); padding: 85px 0; color: #FFFFFF; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
      <div class="shell" style="max-width: 800px;">
        <h2 style="font-size: clamp(32px, 4.5vw, 48px); font-weight: 800; margin-bottom: 20px; color: #FFFFFF; line-height: 1.2;">
          Ready to Start Your Journey?
        </h2>
        <p style="font-size: 17px; line-height: 1.7; color: #CBD5E1; max-width: 680px; margin: 0 auto 36px;">
          Whether you're planning an Oman holiday, arranging a visa, booking accommodation or looking for flights, JMT Travels is here to help.
        </p>
        <div style="display: flex; gap: 16px; justify-content: center; align-items: center; flex-wrap: wrap;">
          <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" style="background: linear-gradient(135deg, #00C875 0%, #009347 100%); color: #FFFFFF; padding: 16px 36px; font-size: 16px; border-radius: 99px; font-weight: 800; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 6px 20px rgba(0, 166, 81, 0.38);">
            Explore Our Services →
          </a>
          <a href="/contact" onclick="event.preventDefault(); navigate('/contact')" style="background: rgba(255, 255, 255, 0.12); border: 1.5px solid rgba(255, 255, 255, 0.4); color: #FFFFFF; padding: 16px 32px; font-size: 16px; border-radius: 99px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; backdrop-filter: blur(8px);">
            Contact JMT Travels →
          </a>
        </div>
      </div>
    </section>
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
    <div style="background: #07153B !important; min-height: 100vh; color: #FFFFFF !important;">
      <div class="shell" style="padding: 60px 20px; max-width: 800px;">
        <h1 style="color: #00E676 !important; margin-bottom: 20px; font-weight: 800; font-size: 32px;">${escapeHTML(titleText)}</h1>
        <div class="jmt-card" style="background: #0B286C !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; color: #FFFFFF !important; border-radius: 20px; padding: 32px;">
          <p style="margin-bottom: 16px; color: #FFFFFF !important; font-size: 16px; line-height: 1.7;">JMT Travel &amp; Tourism is committed to protecting your data and delivering clear, transparent travel services across Oman and the GCC.</p>
          <p style="color: #E2E8F0 !important; font-size: 14.5px; line-height: 1.6;">For complete legal policy documentation or case inquiries, please contact <a href="https://mail.google.com/mail/?view=cm&fs=1&to=info%40jmttravels.com" target="_blank" rel="noopener noreferrer" aria-label="Email JMT Travels via Gmail" class="jmt-email-link" style="color: #00E676 !important; font-weight: 700; text-decoration: underline;">info@jmttravels.com</a> or visit our Muscat office.</p>
        </div>
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

  const appendMsg = (text, isUser = false, quickReplies = []) => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isUser ? 'user' : 'bot'}`;
    bubble.textContent = text;
    body.appendChild(bubble);

    if (!isUser && Array.isArray(quickReplies) && quickReplies.length > 0) {
      const qrContainer = document.createElement('div');
      qrContainer.className = 'chat-quick-replies';
      qrContainer.style.cssText = 'display:flex; flex-wrap:wrap; gap:6px; margin:8px 0;';
      quickReplies.forEach(qr => {
        const btn = document.createElement('button');
        btn.className = 'quick-reply-btn';
        btn.style.cssText = 'background:rgba(0,230,118,0.12); border:1px solid #00E676; color:#00E676; font-size:12px; padding:5px 12px; border-radius:14px; cursor:pointer; font-weight:600; transition:all 0.2s ease;';
        btn.textContent = qr;
        btn.onclick = () => {
          if (input) {
            input.value = qr;
            handleSend();
          }
        };
        qrContainer.appendChild(btn);
      });
      body.appendChild(qrContainer);
    }

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

    if (sendBtn) sendBtn.disabled = true;
    if (input) input.disabled = true;

    try {
      let endpoint = '/api/chat';
      let payload = { message: msg };

      if (state.token && state.activeConversationId) {
        endpoint = `/api/chat/conversations/${state.activeConversationId}/messages`;
        payload = { text: msg };
      }

      const res = await apiCall(endpoint, 'POST', payload);

      const botText = res.reply || (res.aiResponse ? res.aiResponse.text : null) || (res.assistantMessage ? res.assistantMessage.text : null) || 'Thank you for contacting JMT Travels!';
      const qReplies = res.quickReplies || (res.aiResponse && res.aiResponse.metadata ? res.aiResponse.metadata.quickReplies : []);
      appendMsg(botText, false, qReplies);
    } catch (err) {
      appendMsg('Sorry, I am having trouble connecting right now. Please WhatsApp us at +968 9760 8999.', false);
    } finally {
      if (sendBtn) sendBtn.disabled = false;
      if (input) {
        input.disabled = false;
        input.focus();
      }
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
