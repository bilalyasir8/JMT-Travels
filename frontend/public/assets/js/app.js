/**
 * JMT TRAVELS — Master V1 Frontend SPA Router & Application Engine
 * Handles dynamic navigation, authentication state, workflows, checkout, and chatbot drawer.
 */

const state = {
  user: JSON.parse(localStorage.getItem('jmt_user') || 'null'),
  token: localStorage.getItem('jmt_token') || '',
  lang: localStorage.getItem('jmt_lang') || 'en',
  cart: null
};

// API Fetch Helper
async function apiCall(endpoint, method = 'GET', data = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

  const config = { method, headers };
  if (data) config.body = JSON.stringify(data);

  try {
    const res = await fetch(endpoint, config);
    const result = await res.json();
    if (!res.ok) throw new Error(result.error?.message || 'API request failed');
    return result;
  } catch (err) {
    console.error(`[API Error ${endpoint}]:`, err.message);
    throw err;
  }
}

// Router & Page Views
function navigate(route) {
  window.history.pushState({}, '', route);
  renderRoute();
}

window.onpopstate = () => renderRoute();

async function renderRoute() {
  const path = window.location.pathname;
  const container = document.getElementById('view-container');
  if (!container) return;

  // Language direction update
  document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';

  // Update Auth UI in Header
  const authNav = document.getElementById('nav-auth');
  if (authNav) {
    if (state.user) {
      authNav.innerHTML = `<a href="/account" class="btn btn-outline">My Account (${state.user.name.split(' ')[0]})</a> <button onclick="logoutUser()" class="btn btn-sm">Sign Out</button>`;
    } else {
      authNav.innerHTML = `<a href="/login" class="btn btn-outline">Login</a> <a href="/register" class="btn">Register</a>`;
    }
  }

  if (path === '/' || path === '/index.html') renderHomePage(container);
  else if (path === '/visa') renderVisaListPage(container);
  else if (path.startsWith('/visa/')) renderVisaDetailPage(container, path.replace('/visa/', ''));
  else if (path === '/visa-apply') renderVisaApplyPage(container);
  else if (path === '/tourism') renderTourismListPage(container);
  else if (path.startsWith('/tourism/')) renderTourismDetailPage(container, path.replace('/tourism/', ''));
  else if (path === '/book') renderBookPage(container);
  else if (path === '/contact') renderContactPage(container);
  else if (path === '/login') renderLoginPage(container);
  else if (path === '/register') renderRegisterPage(container);
  else if (path === '/account') renderAccountPage(container);
  else if (path === '/privacy' || path === '/terms' || path === '/refund-policy' || path === '/cancellation-policy') renderPolicyPage(container, path.slice(1));
  else renderHomePage(container);

  window.scrollTo(0, 0);
}

// --- VIEW RENDERERS ---

function renderHomePage(container) {
  container.innerHTML = `
    <!-- HERO SECTION -->
    <section style="background: linear-gradient(rgba(11,40,108,0.85), rgba(11,40,108,0.85)), url('/assets/destinations/dubai_1.jpg') center/cover; padding: 100px 0; color: white;">
      <div class="shell" style="text-align: center; max-width: 800px;">
        <span style="background: rgba(22,163,74,0.2); color: #4ADE80; font-size: 12px; font-weight: 700; padding: 6px 16px; border-radius: 99px; text-transform: uppercase; letter-spacing: 1px;">Oman's Premier Travel Partner</span>
        <h1 style="font-size: 48px; font-weight: 800; margin: 20px 0 16px; color: #FFFFFF;">Your Journey Starts With JMT</h1>
        <p style="font-size: 18px; color: #E2E8F0; margin-bottom: 32px; line-height: 1.6;">Visa Services • Signature Tourism Packages • Flight &amp; Hotel Assistance across the GCC and Worldwide.</p>
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <a href="/visa" onclick="event.preventDefault(); navigate('/visa')" class="btn" style="padding: 14px 28px; font-size: 15px;">Explore Visa Services</a>
          <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" class="btn btn-primary" style="padding: 14px 28px; font-size: 15px;">Explore Tours</a>
        </div>
      </div>
    </section>

    <!-- SERVICE CARDS -->
    <section class="shell" style="padding: 70px 0;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h2 style="font-size: 32px; color: var(--primary);">Our Travel Solutions</h2>
        <p style="color: var(--text-muted);">Trusted travel assistance backed by 20+ years of local Oman expertise.</p>
      </div>
      <div class="card-grid">
        <div class="card">
          <div style="font-size: 36px; margin-bottom: 12px;">🛂</div>
          <h3 style="color: var(--primary); margin-bottom: 8px;">Visa Services</h3>
          <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 16px;">Swift GCC &amp; international e-visa intake with official document checklists.</p>
          <a href="/visa" onclick="event.preventDefault(); navigate('/visa')" style="color: var(--secondary); font-weight: 700; text-decoration: none;">Explore Visas →</a>
        </div>
        <div class="card">
          <div style="font-size: 36px; margin-bottom: 12px;">🏖️</div>
          <h3 style="color: var(--primary); margin-bottom: 8px;">Tourism &amp; Holidays</h3>
          <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 16px;">Curated Dubai, Salalah, and Umrah packages with transfers and stays.</p>
          <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" style="color: var(--secondary); font-weight: 700; text-decoration: none;">Explore Packages →</a>
        </div>
        <div class="card">
          <div style="font-size: 36px; margin-bottom: 12px;">✈️</div>
          <h3 style="color: var(--primary); margin-bottom: 8px;">Travel Assistance</h3>
          <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 16px;">Personalized ticketing support, custom itineraries, and WhatsApp agent care.</p>
          <a href="/contact" onclick="event.preventDefault(); navigate('/contact')" style="color: var(--secondary); font-weight: 700; text-decoration: none;">Contact JMT →</a>
        </div>
      </div>
    </section>

    <!-- FEATURED PACKAGES HOME PREVIEW -->
    <section style="background: var(--surface-alt); padding: 70px 0;">
      <div class="shell">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; flex-wrap: wrap; gap: 16px;">
          <div>
            <h2 style="font-size: 32px; color: var(--primary);">Featured Holiday Packages</h2>
            <p style="color: var(--text-muted);">Explore our top-rated travel packages for families and pilgrims.</p>
          </div>
          <a href="/tourism" onclick="event.preventDefault(); navigate('/tourism')" class="btn btn-outline">View All Packages</a>
        </div>
        <div class="card-grid" id="home-packages-grid">Loading packages...</div>
      </div>
    </section>
  `;

  // Load home packages
  apiCall('/api/tourism/packages').then(res => {
    const grid = document.getElementById('home-packages-grid');
    if (!grid) return;
    if (!res.packages || res.packages.length === 0) {
      grid.innerHTML = '<p>No packages found.</p>';
      return;
    }
    grid.innerHTML = res.packages.slice(0, 3).map(pkg => `
      <div class="card" style="padding: 0; overflow: hidden;">
        <img src="${pkg.image}" alt="${pkg.title}" style="width: 100%; height: 200px; object-fit: cover;">
        <div style="padding: 20px;">
          <span class="badge badge-primary">${pkg.category || 'Package'}</span>
          <h3 style="font-size: 18px; color: var(--primary); margin: 10px 0 6px;">${pkg.title}</h3>
          <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 16px;">${pkg.destination} • ${pkg.duration}</p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: var(--secondary); font-size: 18px;">From ${pkg.currency || 'OMR'} ${pkg.priceMinor ? pkg.priceMinor / 1000 : pkg.price}</strong>
            <a href="/tourism/${pkg.slug}" onclick="event.preventDefault(); navigate('/tourism/${pkg.slug}')" class="btn btn-sm">View Package</a>
          </div>
        </div>
      </div>
    `).join('');
  }).catch(() => {});
}

async function renderVisaListPage(container) {
  container.innerHTML = `<div class="shell" style="padding: 60px 0;"><h2>Visa Services</h2><p>Loading available visa services...</p></div>`;
  try {
    const res = await apiCall('/api/visa/services');
    container.innerHTML = `
      <div class="shell" style="padding: 60px 0;">
        <h2 style="font-size: 32px; color: var(--primary); margin-bottom: 8px;">Visa Services Catalogue</h2>
        <p style="color: var(--text-muted); margin-bottom: 32px;">Official e-visa clearing and application intake. Approval subject to relevant government authorities.</p>
        <div class="card-grid">
          ${res.services.map(s => `
            <div class="card">
              <span class="badge badge-success">${s.country}</span>
              <h3 style="font-size: 20px; color: var(--primary); margin: 12px 0 6px;">${s.visaType} Visa</h3>
              <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">Validity: <b>${s.validity}</b> | Processing: <b>${s.processingTime}</b></p>
              <p style="font-size: 14px; color: var(--text); margin-bottom: 20px;">${s.overview}</p>
              <div style="display: flex; gap: 10px;">
                <a href="/visa/${s.slug}" onclick="event.preventDefault(); navigate('/visa/${s.slug}')" class="btn btn-outline" style="flex:1;">View Details</a>
                <a href="/visa-apply?service=${s.slug}" onclick="event.preventDefault(); navigate('/visa-apply?service=${s.slug}')" class="btn" style="flex:1;">Apply Now</a>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="shell" style="padding: 60px 0;"><p>Error loading visa services.</p></div>`;
  }
}

async function renderVisaDetailPage(container, slug) {
  container.innerHTML = `<div class="shell" style="padding: 60px 0;"><p>Loading visa details...</p></div>`;
  try {
    const res = await apiCall(`/api/visa/services/${slug}`);
    const s = res.service;
    container.innerHTML = `
      <div class="shell" style="padding: 60px 0; max-width: 800px;">
        <span class="badge badge-success">${s.country}</span>
        <h1 style="font-size: 36px; color: var(--primary); margin: 12px 0 16px;">${s.country} ${s.visaType} Visa</h1>
        
        <div class="card" style="margin-bottom: 24px;">
          <h3 style="color: var(--primary); margin-bottom: 12px;">Overview</h3>
          <p style="color: var(--text); font-size: 15px; margin-bottom: 16px;">${s.overview}</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px;">
            <div><b>Validity:</b> ${s.validity}</div>
            <div><b>Processing Time:</b> ${s.processingTime}</div>
            <div><b>Entry Type:</b> ${s.entryType}</div>
            <div><b>Fee:</b> ${s.priceMinor ? `${s.currency} ${s.priceMinor / 1000}` : 'Subject to case review'}</div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 24px;">
          <h3 style="color: var(--primary); margin-bottom: 12px;">Required Documents</h3>
          <ul style="padding-left: 20px; line-height: 1.8;">
            ${(s.requiredDocuments || []).map(doc => `<li>${doc}</li>`).join('')}
          </ul>
        </div>

        <div style="background: #FEF3C7; border: 1px solid #F59E0B; padding: 16px; border-radius: 12px; margin-bottom: 24px; font-size: 13px; color: #92400E;">
          ⚠️ <b>Disclaimer:</b> Visa approval is subject solely to the relevant government authorities. JMT TRAVELS provides application intake and documentation clearing support.
        </div>

        <a href="/visa-apply?service=${s.slug}" onclick="event.preventDefault(); navigate('/visa-apply?service=${s.slug}')" class="btn" style="padding: 14px 28px; font-size: 16px;">Start Visa Application →</a>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="shell" style="padding: 60px 0;"><p>Visa service not found.</p></div>`;
  }
}

function renderVisaApplyPage(container) {
  const urlParams = new URLSearchParams(window.location.search);
  const serviceSlug = urlParams.get('service') || '';

  container.innerHTML = `
    <div class="shell" style="padding: 60px 0; max-width: 600px;">
      <h2 style="font-size: 32px; color: var(--primary); margin-bottom: 8px;">Start Visa Application</h2>
      <p style="color: var(--text-muted); margin-bottom: 24px;">Complete your applicant details below. JMT will issue a tracking reference and document upload link.</p>
      
      <form id="visa-apply-form" class="card">
        <div style="margin-bottom: 16px;">
          <label style="display:block; font-weight:700; margin-bottom:6px;">Destination Country</label>
          <input type="text" name="destination" class="chat-input" style="width:100%; width:-webkit-fill-available;" value="${serviceSlug.includes('uae') ? 'United Arab Emirates' : serviceSlug.includes('saudi') ? 'Saudi Arabia' : 'Oman'}" required>
        </div>
        <div style="margin-bottom: 16px;">
          <label style="display:block; font-weight:700; margin-bottom:6px;">Full Name (As in Passport)</label>
          <input type="text" name="fullName" class="chat-input" style="width:100%; width:-webkit-fill-available;" placeholder="e.g. Ahmed Al-Balushi" required>
        </div>
        <div style="margin-bottom: 16px;">
          <label style="display:block; font-weight:700; margin-bottom:6px;">Email Address</label>
          <input type="email" name="email" class="chat-input" style="width:100%; width:-webkit-fill-available;" value="${state.user ? state.user.email : ''}" required>
        </div>
        <div style="margin-bottom: 16px;">
          <label style="display:block; font-weight:700; margin-bottom:6px;">Mobile / WhatsApp Number</label>
          <input type="text" name="phone" class="chat-input" style="width:100%; width:-webkit-fill-available;" placeholder="+968 9000 0000" required>
        </div>
        <div style="margin-bottom: 24px;">
          <label style="display:block; font-weight:700; margin-bottom:6px;">Passport Number</label>
          <input type="text" name="passportNumber" class="chat-input" style="width:100%; width:-webkit-fill-available;" placeholder="A12345678" required>
        </div>
        <button type="submit" class="btn" style="width:100%; padding:12px;">Submit Application</button>
      </form>
      <div id="visa-apply-result" style="margin-top:20px;"></div>
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
          ✅ <b>Application Submitted!</b><br>Reference Number: <b>${res.reference}</b><br>
          Status: <b>${res.status}</b><br><br>
          You can track your application anytime in "My Account" or using our public status tracker.
        </div>
      `;
      e.target.reset();
    } catch (err) {
      resultDiv.innerHTML = `<div style="color: var(--error); font-weight: 700;">${err.message}</div>`;
    }
  };
}

async function renderTourismListPage(container) {
  container.innerHTML = `<div class="shell" style="padding: 60px 0;"><p>Loading tourism packages...</p></div>`;
  try {
    const res = await apiCall('/api/tourism/packages');
    container.innerHTML = `
      <div class="shell" style="padding: 60px 0;">
        <h2 style="font-size: 32px; color: var(--primary); margin-bottom: 8px;">Tourism &amp; Holiday Packages</h2>
        <p style="color: var(--text-muted); margin-bottom: 32px;">Discover curated GCC escapes, Salalah retreats, and Umrah journeys.</p>
        <div class="card-grid">
          ${res.packages.map(p => `
            <div class="card" style="padding:0; overflow:hidden;">
              <img src="${p.image}" alt="${p.title}" style="width:100%; height:200px; object-fit:cover;">
              <div style="padding: 20px;">
                <span class="badge badge-primary">${p.category}</span>
                <h3 style="font-size: 20px; color: var(--primary); margin: 10px 0 6px;">${p.title}</h3>
                <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 16px;">${p.destination} • ${p.duration}</p>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong style="color: var(--secondary); font-size: 18px;">${p.currency} ${p.priceMinor ? p.priceMinor / 1000 : p.price}</strong>
                  <a href="/tourism/${p.slug}" onclick="event.preventDefault(); navigate('/tourism/${p.slug}')" class="btn btn-sm">View Package</a>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="shell" style="padding: 60px 0;"><p>Error loading packages.</p></div>`;
  }
}

async function renderTourismDetailPage(container, slug) {
  container.innerHTML = `<div class="shell" style="padding: 60px 0;"><p>Loading package details...</p></div>`;
  try {
    const res = await apiCall(`/api/tourism/packages/${slug}`);
    const p = res.package;
    container.innerHTML = `
      <div class="shell" style="padding: 60px 0; max-width: 900px;">
        <img src="${p.image}" alt="${p.title}" style="width:100%; max-height:400px; object-fit:cover; border-radius: 16px; margin-bottom: 24px;">
        <span class="badge badge-primary">${p.category}</span>
        <h1 style="font-size: 36px; color: var(--primary); margin: 12px 0 8px;">${p.title}</h1>
        <p style="color: var(--text-muted); font-size: 16px; margin-bottom: 24px;">📍 ${p.destination} • ⏱️ ${p.duration}</p>
        
        <div class="card" style="margin-bottom: 24px;">
          <h3 style="color: var(--primary); margin-bottom: 12px;">Overview</h3>
          <p style="font-size: 15px; color: var(--text); line-height: 1.7;">${p.summary}</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
          <div class="card">
            <h3 style="color: var(--primary); margin-bottom: 12px;">Highlights</h3>
            <ul style="padding-left: 20px;">
              ${(p.highlights || []).map(h => `<li>${h}</li>`).join('')}
            </ul>
          </div>
          <div class="card">
            <h3 style="color: var(--primary); margin-bottom: 12px;">Inclusions</h3>
            <ul style="padding-left: 20px;">
              ${(p.inclusions || []).map(i => `<li>${i}</li>`).join('')}
            </ul>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--surface); padding: 24px; border-radius: 16px; border: 1px solid var(--border);">
          <div>
            <span style="font-size: 13px; color: var(--text-muted); display: block;">Total Price per traveler</span>
            <strong style="font-size: 28px; color: var(--secondary);">${p.currency} ${p.priceMinor ? p.priceMinor / 1000 : p.price}</strong>
          </div>
          <a href="/book?package=${p.id}" onclick="event.preventDefault(); navigate('/book?package=${p.id}')" class="btn" style="padding: 14px 32px; font-size: 16px;">Book This Tour Now</a>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="shell" style="padding: 60px 0;"><p>Package not found.</p></div>`;
  }
}

function renderBookPage(container) {
  const urlParams = new URLSearchParams(window.location.search);
  const pkgId = urlParams.get('package') || '';

  container.innerHTML = `
    <div class="shell" style="padding: 60px 0; max-width: 600px;">
      <h2 style="font-size: 32px; color: var(--primary); margin-bottom: 8px;">Book Tour Package</h2>
      <p style="color: var(--text-muted); margin-bottom: 24px;">Complete lead traveler details to process your reservation.</p>

      <form id="tour-book-form" class="card">
        <input type="hidden" name="packageId" value="${pkgId}">
        <div style="margin-bottom: 16px;">
          <label style="display:block; font-weight:700; margin-bottom:6px;">Lead Traveler Name</label>
          <input type="text" name="travellerName" class="chat-input" style="width:100%; width:-webkit-fill-available;" value="${state.user ? state.user.name : ''}" required>
        </div>
        <div style="margin-bottom: 16px;">
          <label style="display:block; font-weight:700; margin-bottom:6px;">Email Address</label>
          <input type="email" name="email" class="chat-input" style="width:100%; width:-webkit-fill-available;" value="${state.user ? state.user.email : ''}" required>
        </div>
        <div style="margin-bottom: 16px;">
          <label style="display:block; font-weight:700; margin-bottom:6px;">Phone / WhatsApp</label>
          <input type="text" name="phone" class="chat-input" style="width:100%; width:-webkit-fill-available;" placeholder="+968 9000 0000" required>
        </div>
        <div style="margin-bottom: 16px;">
          <label style="display:block; font-weight:700; margin-bottom:6px;">Number of Travelers</label>
          <select name="travellers" class="chat-input" style="width:100%; width:-webkit-fill-available;">
            <option value="1">1 Traveler</option>
            <option value="2">2 Travelers</option>
            <option value="3">3 Travelers</option>
            <option value="4">4+ Travelers</option>
          </select>
        </div>
        <div style="margin-bottom: 24px;">
          <label style="display:block; font-weight:700; margin-bottom:6px;">Preferred Travel Date</label>
          <input type="date" name="travelDate" class="chat-input" style="width:100%; width:-webkit-fill-available;">
        </div>
        <button type="submit" class="btn" style="width:100%; padding:12px;">Confirm Booking Request</button>
      </form>
      <div id="tour-book-result" style="margin-top:20px;"></div>
    </div>
  `;

  document.getElementById('tour-book-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const resultDiv = document.getElementById('tour-book-result');
    try {
      const res = await apiCall('/api/tourism/bookings', 'POST', data);
      resultDiv.innerHTML = `
        <div style="background: #DCFCE7; border: 1px solid #16A34A; padding: 16px; border-radius: 12px; color: #15803D;">
          ✅ <b>Booking Requested!</b><br>Reference: <b>${res.reference}</b><br>
          Calculated Amount: <b>${res.currency} ${res.amount}</b><br><br>
          Check "My Account" to manage your booking.
        </div>
      `;
      e.target.reset();
    } catch (err) {
      resultDiv.innerHTML = `<div style="color: var(--error); font-weight: 700;">${err.message}</div>`;
    }
  };
}

function renderContactPage(container) {
  container.innerHTML = `
    <div class="shell" style="padding: 60px 0;">
      <h2 style="font-size: 32px; color: var(--primary); margin-bottom: 8px;">Contact JMT TRAVELS</h2>
      <p style="color: var(--text-muted); margin-bottom: 32px;">Our Muscat office is open 6 days a week to serve your travel needs.</p>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
        <form id="contact-form" class="card">
          <h3 style="color: var(--primary); margin-bottom: 16px;">Send Us a Message</h3>
          <div style="margin-bottom: 16px;">
            <label style="display:block; font-weight:700; margin-bottom:6px;">Your Name</label>
            <input type="text" name="name" class="chat-input" style="width:100%; width:-webkit-fill-available;" required>
          </div>
          <div style="margin-bottom: 16px;">
            <label style="display:block; font-weight:700; margin-bottom:6px;">Contact (Email / Phone)</label>
            <input type="text" name="contact" class="chat-input" style="width:100%; width:-webkit-fill-available;" required>
          </div>
          <div style="margin-bottom: 16px;">
            <label style="display:block; font-weight:700; margin-bottom:6px;">Inquiry Type</label>
            <select name="type" class="chat-input" style="width:100%; width:-webkit-fill-available;">
              <option value="feedback">General Inquiry</option>
              <option value="complaint">Support / Complaint</option>
              <option value="suggestion">Suggestion</option>
            </select>
          </div>
          <div style="margin-bottom: 20px;">
            <label style="display:block; font-weight:700; margin-bottom:6px;">Message</label>
            <textarea name="message" rows="4" class="chat-input" style="width:100%; width:-webkit-fill-available;" required></textarea>
          </div>
          <button type="submit" class="btn" style="width:100%;">Send Inquiry</button>
          <div id="contact-result" style="margin-top:16px;"></div>
        </form>

        <div class="card">
          <h3 style="color: var(--primary); margin-bottom: 16px;">Office &amp; Contact Details</h3>
          <p style="margin-bottom: 12px;">📍 <b>Address:</b> near Mazda R/A, next to Yahar Restaurant, 512, Oman</p>
          <p style="margin-bottom: 12px;">📞 <b>Phone:</b> <a href="tel:+96871132424">+968 7113 2424</a></p>
          <p style="margin-bottom: 12px;">💬 <b>WhatsApp:</b> <a href="https://wa.me/96897608999" target="_blank">+968 9760 8999</a></p>
          <p style="margin-bottom: 12px;">✉️ <b>Email:</b> <a href="mailto:info@jmttravels.com">info@jmttravels.com</a></p>
          <p style="margin-bottom: 20px;">⏰ <b>Hours:</b> Sat–Thu: 8:30 AM–1:30 PM &amp; 4:30 PM–9:30 PM | Fri: 4:30 PM–9:30 PM</p>
          <a href="https://maps.app.goo.gl/3xDLiEdchqgivn1Z7" target="_blank" class="btn btn-outline" style="width:100%;">View on Google Maps</a>
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
      resDiv.innerHTML = `<div style="color: var(--secondary); font-weight:700;">${res.message}</div>`;
      e.target.reset();
    } catch (err) {
      resDiv.innerHTML = `<div style="color: var(--error); font-weight:700;">${err.message}</div>`;
    }
  };
}

function renderLoginPage(container) {
  container.innerHTML = `
    <div class="shell" style="padding: 60px 0; max-width: 440px;">
      <form id="login-form" class="card">
        <h2 style="font-size: 28px; color: var(--primary); margin-bottom: 8px;">Customer Sign In</h2>
        <p style="color: var(--text-muted); margin-bottom: 24px;">Sign in to access your applications and bookings.</p>
        
        <div style="margin-bottom: 16px;">
          <label style="display:block; font-weight:700; margin-bottom:6px;">Email Address</label>
          <input type="email" name="email" class="chat-input" style="width:100%; width:-webkit-fill-available;" required>
        </div>
        <div style="margin-bottom: 20px;">
          <label style="display:block; font-weight:700; margin-bottom:6px;">Password</label>
          <input type="password" name="password" class="chat-input" style="width:100%; width:-webkit-fill-available;" required>
        </div>
        <button type="submit" class="btn" style="width:100%; padding:12px;">Sign In</button>
        <div id="login-error" style="margin-top:16px; color: var(--error); font-weight:700;"></div>
        <p style="margin-top: 20px; text-align: center; font-size: 14px;">Don't have an account? <a href="/register" onclick="event.preventDefault(); navigate('/register')">Register here</a></p>
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
      navigate('/account');
    } catch (err) {
      errDiv.textContent = err.message;
    }
  };
}

function renderRegisterPage(container) {
  container.innerHTML = `
    <div class="shell" style="padding: 60px 0; max-width: 440px;">
      <form id="register-form" class="card">
        <h2 style="font-size: 28px; color: var(--primary); margin-bottom: 8px;">Create Customer Account</h2>
        <p style="color: var(--text-muted); margin-bottom: 24px;">Register to manage visas, bookings, and documents.</p>

        <div style="margin-bottom: 16px;">
          <label style="display:block; font-weight:700; margin-bottom:6px;">Full Name</label>
          <input type="text" name="name" class="chat-input" style="width:100%; width:-webkit-fill-available;" required>
        </div>
        <div style="margin-bottom: 16px;">
          <label style="display:block; font-weight:700; margin-bottom:6px;">Email Address</label>
          <input type="email" name="email" class="chat-input" style="width:100%; width:-webkit-fill-available;" required>
        </div>
        <div style="margin-bottom: 16px;">
          <label style="display:block; font-weight:700; margin-bottom:6px;">Phone / WhatsApp</label>
          <input type="text" name="phone" class="chat-input" style="width:100%; width:-webkit-fill-available;">
        </div>
        <div style="margin-bottom: 20px;">
          <label style="display:block; font-weight:700; margin-bottom:6px;">Password</label>
          <input type="password" name="password" class="chat-input" style="width:100%; width:-webkit-fill-available;" required>
        </div>
        <button type="submit" class="btn" style="width:100%; padding:12px;">Create Account</button>
        <div id="register-error" style="margin-top:16px; color: var(--error); font-weight:700;"></div>
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
      navigate('/account');
    } catch (err) {
      errDiv.textContent = err.message;
    }
  };
}

async function renderAccountPage(container) {
  if (!state.user) {
    navigate('/login');
    return;
  }

  container.innerHTML = `<div class="shell" style="padding:60px 0;"><p>Loading customer account...</p></div>`;
  try {
    const [visas, bookings, tickets] = await Promise.all([
      apiCall('/api/visa/applications').catch(() => ({ applications: [] })),
      apiCall('/api/tourism/bookings').catch(() => ({ bookings: [] })),
      apiCall('/api/support/tickets').catch(() => ({ tickets: [] }))
    ]);

    container.innerHTML = `
      <div class="shell" style="padding: 60px 0;">
        <h2 style="font-size: 32px; color: var(--primary); margin-bottom: 4px;">Customer Dashboard</h2>
        <p style="color: var(--text-muted); margin-bottom: 32px;">Welcome back, <b>${state.user.name}</b> (${state.user.email})</p>

        <div style="display: flex; gap: 16px; margin-bottom: 32px;">
          <button class="btn btn-primary">My Visas (${visas.applications.length})</button>
          <button class="btn btn-outline">My Bookings (${bookings.bookings.length})</button>
          <button class="btn btn-outline">Support Tickets (${tickets.tickets.length})</button>
        </div>

        <div class="card" style="margin-bottom: 32px;">
          <h3 style="color: var(--primary); margin-bottom: 16px;">My Visa Applications</h3>
          ${visas.applications.length === 0 ? '<p style="color:var(--text-muted);">No visa applications found.</p>' : `
            <table style="width:100%; border-collapse:collapse; font-size:14px;">
              <thead>
                <tr style="text-align:left; border-bottom:1px solid var(--border);">
                  <th style="padding:10px;">Reference</th>
                  <th style="padding:10px;">Destination</th>
                  <th style="padding:10px;">Type</th>
                  <th style="padding:10px;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${visas.applications.map(v => `
                  <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:10px;"><b>${v.applicationNumber || v.id}</b></td>
                    <td style="padding:10px;">${v.destination}</td>
                    <td style="padding:10px;">${v.visaType}</td>
                    <td style="padding:10px;"><span class="badge badge-success">${v.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>

        <div class="card">
          <h3 style="color: var(--primary); margin-bottom: 16px;">My Tour Bookings</h3>
          ${bookings.bookings.length === 0 ? '<p style="color:var(--text-muted);">No bookings found.</p>' : `
            <table style="width:100%; border-collapse:collapse; font-size:14px;">
              <thead>
                <tr style="text-align:left; border-bottom:1px solid var(--border);">
                  <th style="padding:10px;">Booking #</th>
                  <th style="padding:10px;">Package</th>
                  <th style="padding:10px;">Amount</th>
                  <th style="padding:10px;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${bookings.bookings.map(b => `
                  <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:10px;"><b>${b.bookingNumber || b.id}</b></td>
                    <td style="padding:10px;">${b.packageTitle}</td>
                    <td style="padding:10px;">${b.currency} ${b.amount}</td>
                    <td style="padding:10px;"><span class="badge badge-primary">${b.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="shell" style="padding:60px 0;"><p>Error loading account dashboard.</p></div>`;
  }
}

function renderPolicyPage(container, type) {
  const titles = {
    privacy: 'Privacy Policy',
    terms: 'Terms & Conditions',
    'refund-policy': 'Refund & Cancellation Policy',
    'cancellation-policy': 'Cancellation Policy'
  };
  container.innerHTML = `
    <div class="shell" style="padding: 60px 0; max-width: 800px;">
      <h1 style="color: var(--primary); margin-bottom: 16px;">${titles[type] || 'Policy'}</h1>
      <div class="card">
        <p style="margin-bottom: 16px;">JMT Travel &amp; Tourism is committed to protecting your data and delivering clear, transparent travel services across Oman and the GCC.</p>
        <p style="color: var(--text-muted); font-size: 14px;">For complete legal policy documentation or case inquiries, please contact info@jmttravels.com or visit our Muscat office.</p>
      </div>
    </div>
  `;
}

function logoutUser() {
  state.token = '';
  state.user = null;
  localStorage.removeItem('jmt_token');
  localStorage.removeItem('jmt_user');
  navigate('/');
}

// Chatbot Controller
function setupChatbot() {
  const trigger = document.getElementById('chat-trigger');
  const drawer = document.getElementById('chat-drawer');
  const closeBtn = document.getElementById('chat-close');
  const sendBtn = document.getElementById('chat-send');
  const input = document.getElementById('chat-input-field');
  const body = document.getElementById('chat-body-content');

  if (!trigger || !drawer) return;

  trigger.onclick = () => drawer.classList.toggle('open');
  if (closeBtn) closeBtn.onclick = () => drawer.classList.remove('open');

  const appendMsg = (text, isUser = false) => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isUser ? 'user' : 'bot'}`;
    bubble.textContent = text;
    body.appendChild(bubble);
    body.scrollTop = body.scrollHeight;
  };

  const handleSend = async () => {
    const msg = input.value.trim();
    if (!msg) return;
    appendMsg(msg, true);
    input.value = '';

    try {
      const res = await apiCall('/api/chat', 'POST', { message: msg });
      appendMsg(res.reply, false);
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
