const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'assets', 'css', 'jmt-theme.css');
const appJsPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'assets', 'js', 'app.js');

// 1. APPEND VISA APPLICATION CSS TO JMT-THEME.CSS
const visaCSS = `

/* =============================================================
   JMT PREMIUM VISA APPLICATION REDESIGN
   ============================================================= */

.jmt-visa-apply-container {
  padding: 40px 20px 80px;
  max-width: 1200px;
  margin: 0 auto;
}

.jmt-visa-apply-grid {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 36px;
  align-items: start;
}

@media (max-width: 1024px) {
  .jmt-visa-apply-grid {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}

/* LEFT INFORMATION PANEL */
.jmt-visa-info-panel {
  background: linear-gradient(135deg, #07153B 0%, #0B286C 100%);
  color: #FFFFFF;
  border-radius: 24px;
  padding: 32px 28px;
  box-shadow: 0 12px 32px rgba(7, 21, 59, 0.15);
}

.jmt-visa-info-eyebrow {
  display: inline-block;
  background: rgba(0, 166, 81, 0.2);
  color: #55D98A;
  border: 1px solid rgba(0, 166, 81, 0.4);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 99px;
  margin-bottom: 14px;
}

.jmt-visa-info-title {
  font-size: 26px;
  font-weight: 800;
  color: #FFFFFF !important;
  line-height: 1.2;
  margin: 0 0 8px;
}

.jmt-visa-info-sub {
  font-size: 14.5px;
  color: #55D98A;
  font-weight: 700;
  margin: 0 0 14px;
}

.jmt-visa-info-text {
  font-size: 13.5px;
  color: #D6E0F4;
  line-height: 1.6;
  margin: 0 0 20px;
}

.jmt-visa-poster-img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  border-radius: 16px;
  margin-bottom: 24px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.jmt-visa-benefits-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 28px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.jmt-visa-benefit-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  font-weight: 600;
  color: #E2E8F0;
}

.jmt-visa-benefit-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 166, 81, 0.25);
  color: #00E676;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
}

.jmt-visa-process-steps {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.jmt-visa-step-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 13px;
}

.jmt-visa-step-item.active {
  background: rgba(0, 166, 81, 0.18);
  border-color: rgba(0, 166, 81, 0.45);
}

.jmt-visa-step-num {
  font-size: 11px;
  font-weight: 800;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #FFFFFF;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.jmt-visa-step-item.active .jmt-visa-step-num {
  background: #00A651;
  color: #FFFFFF;
}

/* RIGHT FORM CONTAINER CARD */
.jmt-visa-form-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(7, 21, 59, 0.05);
}

@media (max-width: 640px) {
  .jmt-visa-form-card {
    padding: 24px 18px;
    border-radius: 18px;
  }
}

.jmt-visa-form-header {
  margin-bottom: 24px;
  border-bottom: 1px solid #F1F5F9;
  padding-bottom: 18px;
}

.jmt-visa-form-title {
  font-size: 24px;
  font-weight: 800;
  color: #07153B;
  margin: 0 0 6px;
}

.jmt-visa-form-sub {
  font-size: 14px;
  color: #64748B;
  margin: 0 0 12px;
  line-height: 1.5;
}

.jmt-visa-security-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: #00A651;
  font-weight: 700;
  background: #F0FDF4;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #DCFCE7;
}

.jmt-visa-form-section-title {
  font-size: 16px;
  font-weight: 800;
  color: #07153B;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.jmt-visa-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

@media (max-width: 640px) {
  .jmt-visa-form-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.jmt-visa-field-group {
  display: flex;
  flex-direction: column;
}

.jmt-visa-field-group.full-width {
  grid-column: 1 / -1;
}

.jmt-visa-label {
  font-size: 13.5px;
  font-weight: 700;
  color: #07153B;
  margin-bottom: 6px;
}

.jmt-visa-input-box {
  position: relative;
  display: flex;
  align-items: center;
}

.jmt-visa-input-icon {
  position: absolute;
  inset-inline-start: 14px;
  color: #0B286C;
  font-size: 16px;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.jmt-visa-input {
  width: 100%;
  height: 54px;
  border: 1px solid #CBD5E1;
  border-radius: 12px;
  padding-inline-start: 44px;
  padding-inline-end: 16px;
  font-size: 15px;
  color: #07153B;
  background: #FFFFFF;
  outline: none;
  transition: all 0.2s ease;
  font-family: inherit;
}

.jmt-visa-input:focus {
  border-color: #00A651;
  box-shadow: 0 0 0 3px rgba(0, 166, 81, 0.12);
}

.jmt-visa-helper-text {
  font-size: 12px;
  color: #64748B;
  margin-top: 4px;
}

/* READ-ONLY DESTINATION SELECTION PILL */
.jmt-visa-dest-pill {
  width: 100%;
  height: 54px;
  border: 1px solid #CBD5E1;
  background: #F8FAFC;
  border-radius: 12px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 700;
  color: #0B286C;
}

.jmt-visa-dest-badge {
  background: #DCFCE7;
  color: #15803D;
  font-size: 11.5px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
}

/* SUBMIT BUTTON */
.jmt-visa-submit-btn {
  width: 100%;
  height: 56px;
  background: #00A651;
  color: #FFFFFF;
  border: 0;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 166, 81, 0.25);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.jmt-visa-submit-btn:hover {
  background: #008F46;
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0, 166, 81, 0.35);
}

.jmt-visa-submit-btn:disabled {
  background: #94A3B8;
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
}

/* SUCCESS CARD */
.jmt-visa-success-card {
  text-align: center;
  padding: 20px 10px;
}

.jmt-visa-success-icon {
  width: 64px;
  height: 64px;
  background: #DCFCE7;
  color: #16A34A;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 16px;
}

.jmt-visa-ref-box {
  background: #F8FAFC;
  border: 2px dashed #CBD5E1;
  border-radius: 14px;
  padding: 18px;
  margin: 20px 0;
}

.jmt-visa-ref-label {
  font-size: 12px;
  font-weight: 800;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: block;
  margin-bottom: 4px;
}

.jmt-visa-ref-val {
  font-size: 24px;
  font-weight: 800;
  color: #0B286C;
  letter-spacing: 1px;
}

.jmt-visa-next-steps {
  text-align: start;
  background: #F1F5F9;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 24px;
}

.jmt-visa-next-steps h4 {
  font-size: 14px;
  font-weight: 800;
  color: #07153B;
  margin: 0 0 8px;
}

.jmt-visa-next-steps ol {
  margin: 0;
  padding-inline-start: 18px;
  font-size: 13.5px;
  color: #475569;
  line-height: 1.6;
}
`;

let cssContent = fs.readFileSync(cssPath, 'utf8');
if (!cssContent.includes('JMT PREMIUM VISA APPLICATION REDESIGN')) {
  cssContent += visaCSS;
  fs.writeFileSync(cssPath, cssContent, 'utf8');
  console.log('Successfully appended visa CSS to jmt-theme.css!');
}

// 2. REPLACEMENT FUNCTION FOR RENDERVISAAPPLYPAGE IN APP.JS
const newRenderVisaApplyPage = `function renderVisaApplyPage(container) {
  const urlParams = new URLSearchParams(window.location.search);
  const serviceSlug = urlParams.get('service') || '';

  updateSEO({
    title: 'Apply for Oman Visa | JMT Travels Muscat',
    description: 'Start your official Oman visa application with JMT Travels. Fast, secure intake and expert travel assistance.',
    canonicalUrl: '/visa-apply',
    noindex: true
  });
  announceToSR('Navigated to Oman Visa Application Form');

  container.innerHTML = \`
    <div class="jmt-visa-apply-container">
      <div class="jmt-visa-apply-grid">
        
        <!-- LEFT INFORMATION PANEL -->
        <div class="jmt-visa-info-panel">
          <span class="jmt-visa-info-eyebrow">OMAN VISA SERVICES</span>
          <h1 class="jmt-visa-info-title">Oman Visa Application</h1>
          <p class="jmt-visa-info-sub">Start your visa journey with JMT Travels.</p>
          <p class="jmt-visa-info-text">
            Complete your details and our team will guide you through the next steps of your Oman visa application.
          </p>

          <img src="/assets/destinations/oman_visa_poster.jpg" alt="Oman Visa Application Assistance JMT Travels" class="jmt-visa-poster-img" onerror="this.onerror=null;this.src='/assets/destinations/salalah_1.jpg';">

          <!-- Benefits List -->
          <div class="jmt-visa-benefits-list">
            <div class="jmt-visa-benefit-item">
              <span class="jmt-visa-benefit-icon">✓</span>
              <span>Simple application process</span>
            </div>
            <div class="jmt-visa-benefit-item">
              <span class="jmt-visa-benefit-icon">✓</span>
              <span>Secure document handling</span>
            </div>
            <div class="jmt-visa-benefit-item">
              <span class="jmt-visa-benefit-icon">✓</span>
              <span>JMT Travel assistance</span>
            </div>
          </div>

          <!-- Process Steps Indicator -->
          <div class="jmt-visa-process-steps">
            <div class="jmt-visa-step-item active">
              <span class="jmt-visa-step-num">01</span>
              <span style="font-weight: 700; color: #FFF;">Applicant Details</span>
            </div>
            <div class="jmt-visa-step-item">
              <span class="jmt-visa-step-num">02</span>
              <span style="color: #94A3B8;">Document Upload</span>
            </div>
            <div class="jmt-visa-step-item">
              <span class="jmt-visa-step-num">03</span>
              <span style="color: #94A3B8;">Expert Review</span>
            </div>
            <div class="jmt-visa-step-item">
              <span class="jmt-visa-step-num">04</span>
              <span style="color: #94A3B8;">Visa Processing</span>
            </div>
          </div>
        </div>

        <!-- RIGHT FORM CONTAINER CARD -->
        <div>
          <div class="jmt-visa-form-card" id="visa-form-card-container">
            
            <div class="jmt-visa-form-header">
              <h2 class="jmt-visa-form-title">Start Your Oman Visa Application</h2>
              <p class="jmt-visa-form-sub">
                Complete your details below. JMT Travels will issue a tracking reference and guide you through the document submission process.
              </p>
              <div class="jmt-visa-security-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span>Your information is handled securely by JMT Travels.</span>
              </div>
            </div>

            <form id="visa-apply-form" aria-describedby="visa-apply-desc">
              <p id="visa-apply-desc" class="sr-only">All fields marked required are mandatory for visa intake.</p>
              
              <div class="jmt-visa-form-section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00A651" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span>Applicant Information</span>
              </div>

              <div class="jmt-visa-form-grid">
                
                <!-- Full Name (Full Width) -->
                <div class="jmt-visa-field-group full-width">
                  <label for="visa-fullname" class="jmt-visa-label">Full Name (as in Passport) <span style="color:#EF4444;" aria-hidden="true">*</span></label>
                  <div class="jmt-visa-input-box">
                    <span class="jmt-visa-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B286C" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </span>
                    <input type="text" id="visa-fullname" name="fullName" class="jmt-visa-input" placeholder="Enter your full name exactly as shown on your passport" required aria-required="true" autocomplete="name">
                  </div>
                  <span class="jmt-visa-helper-text">Please enter your name exactly as printed on your passport.</span>
                </div>

                <!-- Email Address (50% Width on Desktop) -->
                <div class="jmt-visa-field-group">
                  <label for="visa-email" class="jmt-visa-label">Email Address <span style="color:#EF4444;" aria-hidden="true">*</span></label>
                  <div class="jmt-visa-input-box">
                    <span class="jmt-visa-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B286C" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    </span>
                    <input type="email" id="visa-email" name="email" class="jmt-visa-input" placeholder="Enter your email address" value="\${state.user ? escapeHTML(state.user.email) : ''}" required aria-required="true" autocomplete="email" dir="ltr">
                  </div>
                  <span class="jmt-visa-helper-text">We'll use this email for your application updates.</span>
                </div>

                <!-- Mobile / WhatsApp Number (50% Width on Desktop) -->
                <div class="jmt-visa-field-group">
                  <label for="visa-phone" class="jmt-visa-label">Mobile / WhatsApp Number <span style="color:#EF4444;" aria-hidden="true">*</span></label>
                  <div class="jmt-visa-input-box">
                    <span class="jmt-visa-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B286C" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    </span>
                    <input type="tel" id="visa-phone" name="phone" class="jmt-visa-input" placeholder="+968 XXXXXXXX" required aria-required="true" autocomplete="tel" dir="ltr">
                  </div>
                  <span class="jmt-visa-helper-text">Include country code so our team can contact you.</span>
                </div>

                <!-- Passport Number (Full Width) -->
                <div class="jmt-visa-field-group full-width">
                  <label for="visa-passport" class="jmt-visa-label">Passport Number <span style="color:#EF4444;" aria-hidden="true">*</span></label>
                  <div class="jmt-visa-input-box">
                    <span class="jmt-visa-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B286C" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                    </span>
                    <input type="text" id="visa-passport" name="passportNumber" class="jmt-visa-input" placeholder="Enter passport number" required aria-required="true" autocomplete="off" dir="ltr">
                  </div>
                  <span class="jmt-visa-helper-text">Enter the passport number exactly as shown on your passport.</span>
                </div>

                <!-- Destination Country (Fixed Read-Only Pill for Oman) -->
                <div class="jmt-visa-field-group full-width">
                  <label class="jmt-visa-label">Destination Country</label>
                  <div class="jmt-visa-dest-pill">
                    <span style="display: flex; align-items: center; gap: 8px;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00A651" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      <span>Oman</span>
                    </span>
                    <span class="jmt-visa-dest-badge">✓ Selected Destination</span>
                  </div>
                  <input type="hidden" name="destination" value="Oman">
                </div>

              </div>

              <!-- Submit Button -->
              <button type="submit" id="visa-submit-btn" class="jmt-visa-submit-btn">
                <span>Submit Visa Application →</span>
              </button>

              <!-- Security Reassurance -->
              <div style="margin-top: 14px; text-align: center; font-size: 12.5px; color: #64748B; display: flex; align-items: center; justify-content: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span>Your information is securely submitted to JMT Travels.</span>
              </div>

            </form>

            <div id="visa-apply-result" style="margin-top:20px;" aria-live="polite"></div>

          </div>

          <!-- Assistance Footer Box below Card -->
          <div style="margin-top: 20px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <strong style="font-size: 14px; color: #07153B; display: block;">Need help with your Oman visa?</strong>
              <span style="font-size: 13px; color: #64748B;">Our JMT Travels team can assist you with your application.</span>
            </div>
            <a href="https://wa.me/96897608999?text=Oman%20Visa%20Application%20Inquiry" target="_blank" rel="noopener" class="jmt-btn-secondary" style="padding: 10px 20px; font-size: 13px;">
              💬 WhatsApp JMT
            </a>
          </div>

        </div>

      </div>
    </div>
  \`;

  document.getElementById('visa-apply-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('visa-submit-btn');
    const resultDiv = document.getElementById('visa-apply-result');
    const data = Object.fromEntries(new FormData(e.target));
    
    // Prevent double submission
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = \`<span>Submitting Application...</span>\`;
    }

    try {
      const res = await apiCall('/api/visa/applications', 'POST', data);
      
      const containerCard = document.getElementById('visa-form-card-container');
      if (containerCard) {
        containerCard.innerHTML = \`
          <div class="jmt-visa-success-card">
            <div class="jmt-visa-success-icon">✓</div>
            <h2 style="font-size: 26px; font-weight: 800; color: #07153B; margin: 0 0 8px;">Application Submitted Successfully!</h2>
            <p style="font-size: 14.5px; color: #475569; margin: 0 0 20px;">Your Oman visa application has been received by JMT Travels.</p>
            
            <div class="jmt-visa-ref-box">
              <span class="jmt-visa-ref-label">Application Reference Number</span>
              <div class="jmt-visa-ref-val">\${escapeHTML(res.reference || 'JMT-V-SUCCESS')}</div>
            </div>

            <div class="jmt-visa-next-steps">
              <h4>Next Steps:</h4>
              <ol>
                <li>Save your application reference number for tracking.</li>
                <li>Our travel team will review your application details.</li>
                <li>You will receive instructions for passport and document submission.</li>
              </ol>
            </div>

            <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
              <a href="/dashboard" onclick="event.preventDefault(); navigate('/dashboard')" class="jmt-btn-primary" style="padding: 12px 28px;">View My Applications →</a>
              <a href="https://wa.me/96897608999?text=\${encodeURIComponent(\`Hello JMT Travels, I have submitted my Oman Visa application with reference \${res.reference}\`)}" target="_blank" rel="noopener" class="jmt-btn-secondary" style="padding: 12px 24px;">💬 WhatsApp Assistance</a>
            </div>
          </div>
        \`;
      }

      announceToSR(\`Application submitted successfully. Reference number \${res.reference}\`);
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = \`<span>Submit Visa Application →</span>\`;
      }
      resultDiv.innerHTML = \`<div style="background: #FEF2F2; border: 1px solid #FCA5A5; padding: 14px 18px; border-radius: 12px; color: #B91C1C; font-size: 14px; margin-top: 16px;">We couldn't submit your application. Please check your details and try again: <b>\${escapeHTML(err.message)}</b></div>\`;
      announceToSR(\`Application submission error: \${err.message}\`);
    }
  };
}`;

let appJsContent = fs.readFileSync(appJsPath, 'utf8');
appJsContent = appJsContent.replace(
  /function renderVisaApplyPage\(container\) \{[\s\S]*?\n\}/,
  newRenderVisaApplyPage
);

fs.writeFileSync(appJsPath, appJsContent, 'utf8');
console.log('Successfully updated renderVisaApplyPage in app.js!');
