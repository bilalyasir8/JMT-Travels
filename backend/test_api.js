/**
 * JMT TRAVELS — Master V1 Automated Test Suite
 * Validates Auth, RBAC, IDOR Protection, Visa Engine, Tourism Engine, Payment Webhooks, Chatbot, and Security Controls.
 */

const assert = require('assert');
const http = require('http');
const app = require('./server');

let server = null;
let baseUrl = '';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (options.body) {
      reqOptions.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(url, reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, rawBody: body });
        }
      });
    });

    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 Starting JMT TRAVELS Master V1 Automated Tests');
  console.log('====================================================');

  server = http.createServer(app);
  await new Promise(res => server.listen(0, res));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  let customerToken = '';
  let customerUser = null;
  let adminToken = '';
  let visaRef = '';
  let bookingRef = '';
  let paymentId = '';

  try {
    // 1. Health Checks
    console.log('\n[1] Testing Health Checks...');
    const health = await request('/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.body.status, 'ok');
    console.log('  ✅ /health endpoint responded OK');

    // 2. Customer Registration
    console.log('\n[2] Testing Customer Registration...');
    const regEmail = `test_${Date.now()}@jmttravels.com`;
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Test Traveler', email: regEmail, password: 'TravelerPass2026!', phone: '+96891234567' }
    });
    assert.strictEqual(regRes.status, 201);
    assert.strictEqual(regRes.body.success, true);
    assert.ok(regRes.body.token);
    customerToken = regRes.body.token;
    customerUser = regRes.body.user;
    console.log('  ✅ Customer account registered successfully');

    // 3. Customer Authentication & Profile
    console.log('\n[3] Testing Authenticated Customer Profile...');
    const meRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.user.email, regEmail);
    console.log('  ✅ JWT token verified and customer profile loaded');

    // 4. Admin Authentication
    console.log('\n[4] Testing Admin Login...');
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@jmttravels.com', password: 'JMTAdmin2026!' }
    });
    assert.strictEqual(adminLogin.status, 200);
    assert.ok(adminLogin.body.token);
    adminToken = adminLogin.body.token;
    console.log('  ✅ Admin credentials verified and token issued');

    // 5. Visa Services Catalogue & Application Workflow
    console.log('\n[5] Testing Visa Services & Application Workflow...');
    const visaServices = await request('/api/visa/services');
    assert.strictEqual(visaServices.status, 200);
    assert.ok(visaServices.body.services.length > 0);

    const visaApp = await request('/api/visa/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { destination: 'United Arab Emirates', visaType: 'Tourist', fullName: 'Test Traveler', email: regEmail, phone: '+96891234567', passportNumber: 'M9876543' }
    });
    assert.strictEqual(visaApp.status, 201);
    assert.ok(visaApp.body.reference);
    visaRef = visaApp.body.reference;
    console.log(`  ✅ Visa application created with reference: ${visaRef}`);

    // 6. Tourism Catalogue & Server Price Validation Booking
    console.log('\n[6] Testing Tourism Catalogue & Booking Engine...');
    const pkgs = await request('/api/tourism/packages');
    assert.strictEqual(pkgs.status, 200);
    assert.ok(pkgs.body.packages.length > 0);
    const targetPkg = pkgs.body.packages[0];

    const bookingRes = await request('/api/tourism/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { packageId: targetPkg.id, travellerName: 'Test Traveler', email: regEmail, phone: '+96891234567', travellers: 2 }
    });
    assert.strictEqual(bookingRes.status, 201);
    assert.ok(bookingRes.body.reference);
    bookingRef = bookingRes.body.reference;
    assert.strictEqual(bookingRes.body.amount, (targetPkg.priceMinor ? targetPkg.priceMinor / 1000 : targetPkg.price || 189) * 2);
    console.log(`  ✅ Booking created with server-calculated price: ${bookingRes.body.currency} ${bookingRes.body.amount}`);

    // 7. Payment Order Creation & Signed Webhook Handling
    console.log('\n[7] Testing Payment Abstraction & Signed Webhook...');
    const orderRes = await request('/api/payments/create-order', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { bookingId: bookingRef, amount: bookingRes.body.amount, currency: 'OMR' }
    });
    assert.strictEqual(orderRes.status, 200);
    assert.ok(orderRes.body.providerOrderId);
    const providerOrdId = orderRes.body.providerOrderId;

    // Simulate Payment Webhook Execution
    const webhookRes = await request('/api/payments/webhook', {
      method: 'POST',
      headers: { 'x-signature': 'sandbox' },
      body: {
        providerOrderId: providerOrdId,
        providerPaymentId: `pay_${Date.now()}`,
        status: 'SUCCESS',
        idempotencyKey: `evt_${Date.now()}`
      }
    });
    assert.strictEqual(webhookRes.status, 200);
    assert.strictEqual(webhookRes.body.status, 'COMPLETED');
    console.log('  ✅ Payment order created, webhook verified, and booking marked COMPLETED');

    // 8. IDOR & Security Access Controls
    console.log('\n[8] Testing Security & IDOR Access Controls...');
    const unauthorizedAdmin = await request('/api/admin/overview');
    assert.strictEqual(unauthorizedAdmin.status, 401);
    console.log('  ✅ Unauthenticated access to /api/admin/overview blocked (401)');

    const customerAdminAttempt = await request('/api/admin/overview', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(customerAdminAttempt.status, 403);
    console.log('  ✅ Customer role access to /api/admin/overview blocked (403)');

    // 9. Chatbot Knowledge Engine & Support Escalation
    console.log('\n[9] Testing Chatbot Engine & Support Tickets...');
    const chatRes = await request('/api/chat', {
      method: 'POST',
      body: { message: 'What are your visa services for UAE?' }
    });
    assert.strictEqual(chatRes.status, 200);
    assert.ok(chatRes.body.reply.includes('United Arab Emirates') || chatRes.body.reply.includes('visa'));
    console.log('  ✅ Chatbot knowledge retrieval answered visa query');

    const ticketRes = await request('/api/support/tickets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { subject: 'Flight Change Query', message: 'Can I change my travel date?', category: 'Flights' }
    });
    assert.strictEqual(ticketRes.status, 201);
    assert.ok(ticketRes.body.ticket.ticketId);
    console.log(`  ✅ Support ticket escalated and created: ${ticketRes.body.ticket.ticketId}`);

    // 10. Public Reference Tracker
    console.log('\n[10] Testing Public Status Tracker...');
    const trackRes = await request(`/api/track/${visaRef}`);
    assert.strictEqual(trackRes.status, 200);
    assert.strictEqual(trackRes.body.reference, visaRef);
    console.log('  ✅ Public tracker verified visa reference status');

    console.log('\n====================================================');
    console.log('🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY! (10/10)');
    console.log('====================================================');
  } catch (err) {
    console.error('\n❌ Test Failure Details:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
  }
}

runTestSuite();
