/**
 * JMT TRAVELS — Master V1, Task #2 & Task #3 Visa + Document Management Automated Test Suite
 * Validates Auth, Security, IDOR Protection, StorageService Abstraction, Magic Bytes Verification,
 * Visa Application Lifecycle, State Transition Matrix, Document Review, Additional Document Requests,
 * Path Traversal Defense, and Production DB Enforcement.
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

function uploadMultipart(path, token, fields, fileBuffer, fileName, mimeType) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
    const url = new URL(path, baseUrl);

    let payload = '';
    for (const [k, v] of Object.entries(fields)) {
      payload += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
    }

    payload += `--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const headerBuf = Buffer.from(payload, 'utf-8');
    const footerBuf = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
    const bodyBuf = Buffer.concat([headerBuf, fileBuffer, footerBuf]);

    const reqOptions = {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuf.length,
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, rawBody: data });
        }
      });
    });

    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 Starting JMT TRAVELS Task #3 Visa & Document Management Tests');
  console.log('================================================================');

  const db = require('./db');
  await db.connectDB();
  if (app.seedInitialData) await app.seedInitialData();

  server = http.createServer(app);
  await new Promise(res => server.listen(0, res));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  let customer1Token = '';
  let customer1User = null;
  let customer2Token = '';
  let customer2User = null;
  let adminToken = '';

  let visaRef = '';
  let visaAppId = '';
  let bookingRef = '';
  let documentId = '';

  try {
    // 1. Health Checks
    console.log('\n[1] Testing Health Checks...');
    const health = await request('/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.body.status, 'ok');
    console.log('  ✅ /health endpoint responded OK');

    // 2. Customer 1 Registration & Mass Assignment Protection
    console.log('\n[2] Testing Customer 1 Registration & Mass Assignment Protection...');
    const email1 = `visa_cust1_${Date.now()}@jmttravels.com`;
    const reg1 = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Customer One', email: email1, password: 'CustomerPass1!', phone: '+96891111111', role: 'ADMIN' }
    });
    assert.strictEqual(reg1.status, 201);
    assert.strictEqual(reg1.body.user.role, 'CUSTOMER');
    customer1Token = reg1.body.token;
    customer1User = reg1.body.user;
    console.log('  ✅ Customer 1 registered & role forced to CUSTOMER');

    // 3. Customer 2 Registration (For IDOR Isolation Tests)
    console.log('\n[3] Testing Customer 2 Registration...');
    const email2 = `visa_cust2_${Date.now()}@jmttravels.com`;
    const reg2 = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Customer Two', email: email2, password: 'CustomerPass2!', phone: '+96892222222' }
    });
    assert.strictEqual(reg2.status, 201);
    customer2Token = reg2.body.token;
    customer2User = reg2.body.user;
    console.log('  ✅ Customer 2 registered successfully');

    // 4. Admin Login
    console.log('\n[4] Testing Admin Login...');
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@jmttravels.com', password: 'JMTAdmin2026!' }
    });
    assert.strictEqual(adminLogin.status, 200);
    adminToken = adminLogin.body.token;
    console.log('  ✅ Admin credentials verified');

    // 5. Save Draft Visa Application
    console.log('\n[5] Testing Save Draft Visa Application...');
    const draftRes = await request('/api/visa/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { destination: 'United Arab Emirates', isDraft: true }
    });
    assert.strictEqual(draftRes.status, 201);
    assert.strictEqual(draftRes.body.status, 'DRAFT');
    assert.ok(draftRes.body.reference.startsWith('JMT-V-'));
    console.log(`  ✅ Draft visa application saved with reference: ${draftRes.body.reference}`);

    // 6. Submit Full Visa Application & Required Field Validation
    console.log('\n[6] Testing Visa Application Required Field Validation & Submission...');
    const invalidSub = await request('/api/visa/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { destination: 'United Arab Emirates' } // Missing name, email, phone!
    });
    assert.strictEqual(invalidSub.status, 400);
    console.log('  ✅ Incomplete visa submission missing required fields rejected (400)');

    const validSub = await request('/api/visa/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: {
        destination: 'United Arab Emirates',
        visaType: 'Tourist',
        fullName: 'Customer One',
        email: email1,
        phone: '+96891111111',
        passportNumber: 'M1234567',
        nationality: 'Omani'
      }
    });
    assert.strictEqual(validSub.status, 201);
    assert.strictEqual(validSub.body.status, 'SUBMITTED');
    assert.ok(validSub.body.reference.startsWith('JMT-V-'));
    visaRef = validSub.body.reference;
    visaAppId = validSub.body.application.id || validSub.body.application._id || validSub.body.reference;
    console.log(`  ✅ Complete visa application submitted with reference: ${visaRef}`);

    // 7. Customer Access Own Application & IDOR Isolation
    console.log('\n[7] Testing Customer Application Access & IDOR Isolation...');
    const ownApp = await request(`/api/visa/applications/${visaRef}`, {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    assert.strictEqual(ownApp.status, 200);
    assert.strictEqual(ownApp.body.application.applicationNumber, visaRef);

    const idorApp = await request(`/api/visa/applications/${visaRef}`, {
      headers: { Authorization: `Bearer ${customer2Token}` } // Customer 2 attempting to view Customer 1's app!
    });
    assert.strictEqual(idorApp.status, 403);
    console.log('  ✅ IDOR Check PASSED: Customer 2 blocked from accessing Customer 1\'s application (403)');

    // 8. State Transition Matrix & Legal Status Validation
    console.log('\n[8] Testing Server-Controlled State Transition Matrix...');
    // Customer attempting illegal jump to APPROVED!
    const illegalCustJump = await request(`/api/visa/applications/${visaRef}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { status: 'APPROVED' }
    });
    assert.strictEqual(illegalCustJump.status, 400);
    console.log('  ✅ Illegal state transition jump to APPROVED by customer blocked (400)');

    // Authorized Staff transition: SUBMITTED -> UNDER_REVIEW
    const staffTransition = await request(`/api/visa/applications/${visaRef}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'UNDER_REVIEW', note: 'Visa desk began reviewing documents.' }
    });
    assert.strictEqual(staffTransition.status, 200);
    assert.strictEqual(staffTransition.body.application.status, 'UNDER_REVIEW');
    assert.ok(staffTransition.body.application.timeline.length >= 2);
    console.log('  ✅ Authorized staff state transition to UNDER_REVIEW succeeded & timeline logged');

    // 9. StorageService Abstraction & Magic Bytes File Upload Verification
    console.log('\n[9] Testing StorageService & Magic Bytes Signature File Upload...');

    // A. Reject Executable / Script Format (.exe / .js)
    const scriptBuffer = Buffer.from('console.log("malicious script");');
    const scriptUpload = await uploadMultipart('/api/documents/upload', customer1Token, { applicationId: visaAppId, documentType: 'PASSPORT_COPY' }, scriptBuffer, 'payload.js', 'application/javascript');
    assert.strictEqual(scriptUpload.status, 400);
    console.log('  ✅ Executable/script file upload (.js) rejected by FileSecurityService (400)');

    // B. Upload Valid PDF Document (%PDF Magic Bytes)
    const pdfHeader = Buffer.from('%PDF-1.4\n%...\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const pdfUpload = await uploadMultipart('/api/documents/upload', customer1Token, { applicationId: visaAppId, documentType: 'PASSPORT_COPY' }, pdfHeader, 'passport.pdf', 'application/pdf');
    assert.strictEqual(pdfUpload.status, 201);
    assert.ok(pdfUpload.body.document.documentId);
    assert.strictEqual(pdfUpload.body.document.documentType, 'PASSPORT_COPY');
    documentId = pdfUpload.body.document.id;
    console.log(`  ✅ Valid PDF document uploaded successfully. Server storage key: ${pdfUpload.body.document.storageKey}`);

    // C. Upload Valid JPEG Image (FFD8FF Magic Bytes)
    const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
    const jpegUpload = await uploadMultipart('/api/documents/upload', customer1Token, { applicationId: visaAppId, documentType: 'PHOTO' }, jpegHeader, 'photo.jpg', 'image/jpeg');
    assert.strictEqual(jpegUpload.status, 201);
    console.log('  ✅ Valid JPEG image uploaded successfully with magic byte verification');

    // 10. Private Storage & IDOR Restricted Document Download Stream
    console.log('\n[10] Testing Private Storage & IDOR Restricted Document Download Stream...');
    const ownDocDl = await request(`/api/documents/${documentId}/download`, {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    assert.strictEqual(ownDocDl.status, 200);
    assert.strictEqual(ownDocDl.headers['content-type'], 'application/pdf');

    const idorDocDl = await request(`/api/documents/${documentId}/download`, {
      headers: { Authorization: `Bearer ${customer2Token}` } // Customer 2 trying to download Customer 1's document!
    });
    assert.strictEqual(idorDocDl.status, 403);
    console.log('  ✅ IDOR Check PASSED: Customer 2 blocked from downloading Customer 1\'s private passport document (403)');

    const staffDocDl = await request(`/api/documents/${documentId}/download`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(staffDocDl.status, 200);
    console.log('  ✅ Staff role successfully accessed & streamed private customer document');

    // 11. Additional Document Request & Customer Response Workflow
    console.log('\n[11] Testing Additional Document Request & Customer Response Workflow...');
    const reqDoc = await request(`/api/visa/applications/${visaRef}/request-documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { documentType: 'CIVIL_ID', instruction: 'Please provide clear copy of your Oman Civil ID.' }
    });
    assert.strictEqual(reqDoc.status, 201);
    assert.strictEqual(reqDoc.body.request.documentType, 'CIVIL_ID');

    // Verify application status changed to ADDITIONAL_DOCUMENTS_REQUIRED
    const appAfterReq = await request(`/api/visa/applications/${visaRef}`, {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    assert.strictEqual(appAfterReq.body.application.status, 'ADDITIONAL_DOCUMENTS_REQUIRED');
    console.log('  ✅ Staff requested additional CIVIL_ID document & status updated to ADDITIONAL_DOCUMENTS_REQUIRED');

    // Customer fulfills request by uploading requested document
    const civilIdBuf = Buffer.from('%PDF-1.4\nCivil ID Copy\n%%EOF');
    const FulfillUpload = await uploadMultipart('/api/documents/upload', customer1Token, { applicationId: visaAppId, documentType: 'CIVIL_ID' }, civilIdBuf, 'civil_id.pdf', 'application/pdf');
    assert.strictEqual(FulfillUpload.status, 201);

    // Verify application status returned to UNDER_REVIEW automatically upon fulfillment
    const appAfterFulfill = await request(`/api/visa/applications/${visaRef}`, {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    assert.strictEqual(appAfterFulfill.body.application.status, 'UNDER_REVIEW');
    console.log('  ✅ Customer fulfilled request & application status automatically returned to UNDER_REVIEW');

    // 12. Staff Document Review Workflow
    console.log('\n[12] Testing Staff Document Review Workflow...');
    const reviewRes = await request(`/api/documents/${documentId}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'ACCEPTED', reviewNote: 'Passport copy verified clear.' }
    });
    assert.strictEqual(reviewRes.status, 200);
    assert.strictEqual(reviewRes.body.document.status, 'ACCEPTED');
    console.log('  ✅ Staff reviewed document and marked status ACCEPTED');

    // 13. Complete Visa Approval Lifecycle
    console.log('\n[13] Testing Complete Visa Approval Lifecycle...');
    await request(`/api/visa/applications/${visaRef}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'PROCESSING', note: 'Application sent to authorities.' }
    });

    const approveRes = await request(`/api/visa/applications/${visaRef}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'APPROVED', note: 'Visa issued by authorities.' }
    });
    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveRes.body.application.status, 'APPROVED');
    console.log('  ✅ Visa application successfully processed and APPROVED by staff');

    // 14. Path Traversal & File Security Defense Test
    console.log('\n[14] Testing Path Traversal Defense...');
    const pathTraversalAttempt = await request('/api/documents/..%2F..%2Fetc%2Fpasswd/download', {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    assert.ok([400, 404, 403].includes(pathTraversalAttempt.status));

    const { storageService } = require('./services/storage');
    try {
      storageService.sanitizePath('../../../etc/passwd');
      assert.fail('Should have thrown path traversal exception');
    } catch (err) {
      assert.ok(err.message.includes('traversal') || err.message.includes('Invalid'));
    }
    console.log('  ✅ Path traversal attempt (../../etc/passwd) safely blocked');

    // 15. Tourism & Booking Regression Test
    console.log('\n[15] Testing Tourism & Booking Regression...');
    const pkgs = await request('/api/tourism/packages');
    assert.strictEqual(pkgs.status, 200);

    const bookingRes = await request('/api/tourism/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { packageId: pkgs.body.packages[0].id, travellerName: 'Customer One', email: email1, phone: '+96891111111', travellers: 2 }
    });
    assert.strictEqual(bookingRes.status, 201);
    bookingRef = bookingRes.body.reference;
    console.log(`  ✅ Booking created cleanly: ${bookingRef}`);

    // 16. Payment & Webhook Regression Test
    console.log('\n[16] Testing Payment & Webhook Regression...');
    const orderRes = await request('/api/payments/create-order', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { bookingId: bookingRef, amount: bookingRes.body.amount, currency: 'OMR' }
    });
    assert.strictEqual(orderRes.status, 200);

    const webhookRes = await request('/api/payments/webhook', {
      method: 'POST',
      headers: { 'x-signature': 'sandbox' },
      body: { providerOrderId: orderRes.body.providerOrderId, providerPaymentId: `pay_${Date.now()}`, status: 'SUCCESS', idempotencyKey: `evt_${Date.now()}` }
    });
    assert.strictEqual(webhookRes.status, 200);
    console.log('  ✅ Payment order & webhook signed completion regression test PASSED');

    // 17. Production DB Rule Regression Test
    console.log('\n[17] Testing Production DB Fallback Blocking Regression...');
    process.env.DATABASE_MODE = 'mongodb';
    const readyProdRes = await request('/ready');
    assert.strictEqual(readyProdRes.status, 503);
    delete process.env.DATABASE_MODE;
    console.log('  ✅ Production database readiness check PASSED (503 Service Unavailable when DB is offline)');

    console.log('\n================================================================');
    console.log('🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY! (17/17)');
    console.log('================================================================');
  } catch (err) {
    console.error('\n❌ Test Failure Details:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
  }
}

runTestSuite();
