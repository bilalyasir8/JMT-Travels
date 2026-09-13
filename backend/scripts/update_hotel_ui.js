const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'assets', 'js', 'app.js');
let content = fs.readFileSync(appJsPath, 'utf8');

// 1. Update hotelSearchState to include displayLimit: 12
content = content.replace(
  /window\.hotelSearchState = \{[\s\S]*?\};/,
  `window.hotelSearchState = {
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
};`
);

// 2. Add loadMoreHotels function
if (!content.includes('window.loadMoreHotels')) {
  content = content.replace(
    'window.renderHotelResultsList = function() {',
    `window.loadMoreHotels = function() {
  hotelSearchState.displayLimit = (hotelSearchState.displayLimit || 12) + 12;
  renderHotelResultsList();
};

window.renderHotelResultsList = function() {`
  );
}

// 3. Update quickSelectHotelDest to reset displayLimit
content = content.replace(
  'window.quickSelectHotelDest = function(city, country, btn) {',
  `window.quickSelectHotelDest = function(city, country, btn) {
  hotelSearchState.displayLimit = 12;`
);

// 4. Update selectHotelDestOption to reset displayLimit
content = content.replace(
  'window.selectHotelDestOption = function(city, country) {',
  `window.selectHotelDestOption = function(city, country) {
  hotelSearchState.displayLimit = 12;`
);

// 5. Update handleHotelSearchSubmit to reset displayLimit
content = content.replace(
  'window.handleHotelSearchSubmit = function(e) {',
  `window.handleHotelSearchSubmit = function(e) {
  hotelSearchState.displayLimit = 12;`
);

// 6. Update clearAllHotelFilters to reset displayLimit
content = content.replace(
  'window.clearAllHotelFilters = function() {',
  `window.clearAllHotelFilters = function() {
  hotelSearchState.displayLimit = 12;`
);

// 7. Update popular chips HTML in renderHotelsPage
const oldChipsHTML = `<div class="jmt-hotel-dest-chips" id="hotel-dest-chips-container">
          <button class="jmt-hotel-dest-chip active" onclick="quickSelectHotelDest('Muscat', 'Oman', this)">🇴🇲 Muscat</button>
          <button class="jmt-hotel-dest-chip" onclick="quickSelectHotelDest('Salalah', 'Oman', this)">🇴🇲 Salalah</button>
          <button class="jmt-hotel-dest-chip" onclick="quickSelectHotelDest('Nizwa', 'Oman', this)">🇴🇲 Nizwa</button>
          <button class="jmt-hotel-dest-chip" onclick="quickSelectHotelDest('Dubai', 'UAE', this)">🇦🇪 Dubai</button>
          <button class="jmt-hotel-dest-chip" onclick="quickSelectHotelDest('Abu Dhabi', 'UAE', this)">🇦🇪 Abu Dhabi</button>
          <button class="jmt-hotel-dest-chip" onclick="quickSelectHotelDest('Makkah', 'Saudi Arabia', this)">🇸🇦 Makkah</button>
          <button class="jmt-hotel-dest-chip" onclick="quickSelectHotelDest('Madinah', 'Saudi Arabia', this)">🇸🇦 Madinah</button>
        </div>`;

const newChipsHTML = `<div class="jmt-hotel-dest-chips" id="hotel-dest-chips-container">
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
        </div>`;

content = content.replace(oldChipsHTML, newChipsHTML);

// 8. Update Property Type filters sidebar to include Apartments & Villas
const oldPropertyTypeFilters = `<div class="jmt-filter-group">
            <div class="jmt-filter-title">Property Type</div>
            <label class="jmt-checkbox-label">
              <input type="checkbox" value="Resort" onchange="toggleHotelPropertyTypeFilter('Resort', this.checked)">
              <span>Resorts</span>
            </label>
            <label class="jmt-checkbox-label">
              <input type="checkbox" value="Hotel" onchange="toggleHotelPropertyTypeFilter('Hotel', this.checked)">
              <span>Hotels</span>
            </label>
          </div>`;

const newPropertyTypeFilters = `<div class="jmt-filter-group">
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
          </div>`;

content = content.replace(oldPropertyTypeFilters, newPropertyTypeFilters);

// 9. Update renderHotelResultsList to slice visibleList and render "Load More Hotels"
const oldRenderListCore = `if (heading) {
    heading.textContent = \`Hotels in \${escapeHTML(hotelSearchState.destination)}\`;
  }
  if (countText) {
    countText.textContent = \`Showing \${list.length} propert\${list.length === 1 ? 'y' : 'ies'} available\`;
  }

  if (list.length === 0) {
    container.innerHTML = \`
      <div class="jmt-card" style="text-align: center; padding: 48px 24px; max-width: 600px; margin: 0 auto;">
        <div style="font-size: 44px; margin-bottom: 12px;">🏨</div>
        <h3 style="color: #0B286C; font-weight: 800; margin-bottom: 8px;">No Hotels Found</h3>
        <p style="color: #64748B; font-size: 14px; margin-bottom: 20px;">We couldn't find any hotels matching your destination or active filters. Try resetting your search parameters.</p>
        <button onclick="clearAllHotelFilters()" class="jmt-btn-primary">Reset Filters &amp; Search</button>
      </div>
    \`;
    return;
  }

  container.innerHTML = list.map(h => \`
    <div class="jmt-hotel-result-card">
      <div class="jmt-hotel-card-media">
        <img src="\${h.image}" alt="\${escapeHTML(h.name)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/assets/destinations/salalah_1.jpg';">
        \${h.isJmtChoice ? \`<span class="jmt-hotel-card-badge">JMT Choice</span>\` : ''}
      </div>

      <div class="jmt-hotel-card-content">
        <div>
          <div class="jmt-hotel-card-header">
            <div>
              <h3 class="jmt-hotel-card-title">\${escapeHTML(h.name)}</h3>
              <div class="jmt-hotel-card-location">
                <span>📍 \${escapeHTML(h.district)}, \${escapeHTML(h.city)}, \${escapeHTML(h.country)}</span>
              </div>
            </div>
            <div class="jmt-hotel-card-rating">
              <span class="jmt-hotel-score-badge">★ \${h.rating}</span>
              <span class="jmt-hotel-reviews-count">\${h.reviewsCount} reviews</span>
            </div>
          </div>

          <p style="font-size: 13.5px; color: #475569; line-height: 1.55; margin: 8px 0 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            \${escapeHTML(h.description)}
          </p>

          <div class="jmt-hotel-card-amenities">
            \${h.amenities.slice(0, 4).map(a => \`<span class="jmt-hotel-amenity-tag">\${escapeHTML(a)}</span>\`).join('')}
            \${h.amenities.length > 4 ? \`<span class="jmt-hotel-amenity-tag">+\${h.amenities.length - 4} more</span>\` : ''}
          </div>
        </div>

        <div class="jmt-hotel-card-footer">
          <div class="jmt-hotel-price-box">
            <span class="jmt-hotel-price-sub">Starting from</span>
            <div class="jmt-hotel-price-val">
              <span style="font-size: 14px; font-weight: 600; color: #64748B;">OMR</span> \${h.priceOMR.toFixed(3)}
              <span style="font-size: 12px; font-weight: 500; color: #64748B;">/ night</span>
            </div>
          </div>

          <div class="jmt-hotel-actions">
            <a href="https://wa.me/96897608999?text=\${encodeURIComponent(\`Hotel Booking Request: \${h.name} (\${h.city}, \${h.country}). Dates: \${hotelSearchState.checkIn} to \${hotelSearchState.checkOut}. Guests: \${hotelSearchState.adults} Adults.\`)}" target="_blank" rel="noopener" class="jmt-btn-secondary" style="padding: 10px 18px; font-size: 13px;">
              💬 WhatsApp
            </a>
            <a href="https://mail.google.com/mail/?view=cm&fs=1&to=info%40jmttravels.com&su=\${encodeURIComponent(\`Hotel Reservation Inquiry: \${h.name}\`)}&body=\${encodeURIComponent(\`Dear JMT Travels,\\n\\nI would like to inquire about booking accommodation at:\\n\\nHotel: \${h.name}\\nLocation: \${h.city}, \${h.country}\\nCheck-in: \${hotelSearchState.checkIn}\\nCheck-out: \${hotelSearchState.checkOut}\\nRooms/Guests: \${hotelSearchState.rooms} Room, \${hotelSearchState.adults} Adults\\nEstimated Rate: OMR \${h.priceOMR.toFixed(3)} / night\\n\\nPlease confirm availability and payment details.\`)}" target="_blank" rel="noopener noreferrer" aria-label="Email JMT Travels via Gmail" class="jmt-btn-primary" style="padding: 10px 18px; font-size: 13px;">
              Enquire Now →
            </a>
          </div>
        </div>

      </div>
    </div>
  \`).join('');`;

const newRenderListCore = `const visibleLimit = hotelSearchState.displayLimit || 12;
  const visibleList = list.slice(0, visibleLimit);

  if (heading) {
    heading.textContent = \`Hotels in \${escapeHTML(hotelSearchState.destination)}\`;
  }
  if (countText) {
    countText.textContent = \`Showing \${visibleList.length} of \${list.length} propert\${list.length === 1 ? 'y' : 'ies'} available\`;
  }

  if (list.length === 0) {
    container.innerHTML = \`
      <div class="jmt-card" style="text-align: center; padding: 48px 24px; max-width: 600px; margin: 0 auto;">
        <div style="font-size: 44px; margin-bottom: 12px;">🏨</div>
        <h3 style="color: #0B286C; font-weight: 800; margin-bottom: 8px;">No Hotels Found</h3>
        <p style="color: #64748B; font-size: 14px; margin-bottom: 20px;">We couldn't find any hotels matching your destination or active filters. Try resetting your search parameters.</p>
        <button onclick="clearAllHotelFilters()" class="jmt-btn-primary">Reset Filters &amp; Search</button>
      </div>
    \`;
    return;
  }

  let html = visibleList.map(h => \`
    <div class="jmt-hotel-result-card">
      <div class="jmt-hotel-card-media">
        <img src="\${h.image}" alt="\${escapeHTML(h.name)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/assets/hotels/luxury-resorts.jpg';">
        \${h.isJmtChoice ? \`<span class="jmt-hotel-card-badge">JMT Choice</span>\` : ''}
      </div>

      <div class="jmt-hotel-card-content">
        <div>
          <div class="jmt-hotel-card-header">
            <div>
              <h3 class="jmt-hotel-card-title">\${escapeHTML(h.name)}</h3>
              <div class="jmt-hotel-card-location">
                <span>📍 \${escapeHTML(h.district)}, \${escapeHTML(h.city)}, \${escapeHTML(h.country)}</span>
              </div>
            </div>
            <div class="jmt-hotel-card-rating">
              <span class="jmt-hotel-score-badge">★ \${h.rating}</span>
              <span class="jmt-hotel-reviews-count">\${h.reviewsCount} reviews</span>
            </div>
          </div>

          <p style="font-size: 13.5px; color: #475569; line-height: 1.55; margin: 8px 0 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            \${escapeHTML(h.description)}
          </p>

          <div class="jmt-hotel-card-amenities">
            \${h.amenities.slice(0, 4).map(a => \`<span class="jmt-hotel-amenity-tag">\${escapeHTML(a)}</span>\`).join('')}
            \${h.amenities.length > 4 ? \`<span class="jmt-hotel-amenity-tag">+\${h.amenities.length - 4} more</span>\` : ''}
          </div>
        </div>

        <div class="jmt-hotel-card-footer">
          <div class="jmt-hotel-price-box">
            <span class="jmt-hotel-price-sub">Starting from (Indicative rate)</span>
            <div class="jmt-hotel-price-val">
              <span style="font-size: 14px; font-weight: 600; color: #64748B;">OMR</span> \${h.priceOMR.toFixed(3)}
              <span style="font-size: 12px; font-weight: 500; color: #64748B;">/ night</span>
            </div>
          </div>

          <div class="jmt-hotel-actions">
            <a href="https://wa.me/96897608999?text=\${encodeURIComponent(\`Hotel Booking Request: \${h.name} (\${h.city}, \${h.country}). Dates: \${hotelSearchState.checkIn} to \${hotelSearchState.checkOut}. Guests: \${hotelSearchState.adults} Adults.\`)}" target="_blank" rel="noopener" class="jmt-btn-secondary" style="padding: 10px 18px; font-size: 13px;">
              💬 WhatsApp
            </a>
            <a href="https://mail.google.com/mail/?view=cm&fs=1&to=info%40jmttravels.com&su=\${encodeURIComponent(\`Hotel Reservation Inquiry: \${h.name}\`)}&body=\${encodeURIComponent(\`Dear JMT Travels,\\n\\nI would like to inquire about booking accommodation at:\\n\\nHotel: \${h.name}\\nLocation: \${h.city}, \${h.country}\\nCheck-in: \${hotelSearchState.checkIn}\\nCheck-out: \${hotelSearchState.checkOut}\\nRooms/Guests: \${hotelSearchState.rooms} Room, \${hotelSearchState.adults} Adults\\nEstimated Rate: OMR \${h.priceOMR.toFixed(3)} / night\\n\\nPlease confirm availability and payment details.\`)}" target="_blank" rel="noopener noreferrer" aria-label="Email JMT Travels via Gmail" class="jmt-btn-primary" style="padding: 10px 18px; font-size: 13px;">
              Enquire Now →
            </a>
          </div>
        </div>

      </div>
    </div>
  \`).join('');

  if (list.length > visibleList.length) {
    html += \`
      <div style="text-align: center; margin-top: 32px; margin-bottom: 24px;">
        <button onclick="loadMoreHotels()" class="jmt-btn-secondary" style="background: #FFFFFF; color: #0B286C; border: 2px solid #0B286C; padding: 14px 36px; border-radius: 12px; font-weight: 800; font-size: 14.5px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(11,40,108,0.08);">
          Load More Hotels (\${list.length - visibleList.length} remaining) ↓
        </button>
      </div>
    \`;
  }

  container.innerHTML = html;`;

content = content.replace(oldRenderListCore, newRenderListCore);

fs.writeFileSync(appJsPath, content, 'utf8');
console.log('Successfully updated hotel search, pagination, and UI logic in app.js!');
