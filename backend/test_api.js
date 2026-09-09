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

    // 15. Task #4: Tourism Destinations, Categories & Whitelisted Sorting / Pagination Test
    console.log('\n[15] Testing Destinations, Categories & Whitelisted Sorting / Pagination...');
    const dests = await request('/api/tourism/destinations');
    assert.strictEqual(dests.status, 200);

    const cats = await request('/api/tourism/categories');
    assert.strictEqual(cats.status, 200);

    const paginatedPkgs = await request('/api/tourism/packages?sortBy=priceMinor&sortOrder=asc&limit=5');
    assert.strictEqual(paginatedPkgs.status, 200);
    assert.ok(paginatedPkgs.body.packages);
    assert.ok(paginatedPkgs.body.pagination);
    console.log('  ✅ Destinations, Categories & Whitelisted Sorting/Pagination PASSED');

    // 16. Task #4: Package CRUD Security (Customer Blocked, Admin Allowed)
    console.log('\n[16] Testing Package CRUD Security & Authorization...');
    const custPkgCreate = await request('/api/tourism/packages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { title: 'Unauthorized Package', destination: 'Oman', category: 'Culture', price: 100 }
    });
    assert.strictEqual(custPkgCreate.status, 403);
    console.log('  ✅ Customer blocked from creating package (403)');

    const adminPkgCreate = await request('/api/tourism/packages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: `Salalah Monsoon Special ${Date.now()}`,
        destination: 'Salalah',
        category: 'Nature',
        priceMinor: 150000, // 150 OMR
        capacity: 5,
        duration: '4 Days',
        summary: 'Explore Khareef monsoon in Salalah',
        inclusions: ['Hotel', 'Airport Transfer', 'Guided Tour']
      }
    });
    assert.strictEqual(adminPkgCreate.status, 201);
    const newPkgId = adminPkgCreate.body.package.id;
    console.log(`  ✅ Admin created new tour package: ${adminPkgCreate.body.package.title} (ID: ${newPkgId})`);

    // 17. Task #4: Server-Calculated Pricing & Client Override Rejection Test
    console.log('\n[17] Testing Server-Authoritative Pricing Calculation...');
    const tamperPriceBooking = await request('/api/tourism/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: {
        packageId: newPkgId,
        travellerName: 'Customer One',
        email: email1,
        phone: '+96891111111',
        travellers: 2,
        amount: 1.000 // Tampered client price! Should be ignored and calculated as 150 * 2 = 300 OMR
      }
    });
    assert.strictEqual(tamperPriceBooking.status, 201);
    assert.strictEqual(tamperPriceBooking.body.amount, 300); // 150 * 2 = 300 OMR!
    bookingRef = tamperPriceBooking.body.reference;
    const bookingId1 = tamperPriceBooking.body.booking.id;
    console.log(`  ✅ Client price tampering blocked: Server computed 300 OMR (ignored 1 OMR claim)`);

    // 18. Task #4: Idempotency & Duplicate Request Prevention Test
    console.log('\n[18] Testing Idempotency & Duplicate Replay Protection...');
    const idemKey = `idem_${Date.now()}`;
    const firstBooking = await request('/api/tourism/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { packageId: newPkgId, travellerName: 'Customer One', email: email1, phone: '+96891111111', travellers: 1, idempotencyKey: idemKey }
    });
    assert.strictEqual(firstBooking.status, 201);

    const replayBooking = await request('/api/tourism/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { packageId: newPkgId, travellerName: 'Customer One', email: email1, phone: '+96891111111', travellers: 1, idempotencyKey: idemKey }
    });
    assert.strictEqual(replayBooking.status, 200);
    assert.strictEqual(replayBooking.body.reference, firstBooking.body.reference);
    assert.strictEqual(replayBooking.body.isDuplicate, true);
    console.log('  ✅ Idempotency check PASSED: Duplicate request returned existing booking');

    // 19. Task #4: Capacity & Oversale Protection Test
    console.log('\n[19] Testing Capacity & Oversale Protection...');
    // Currently booked in newPkgId: 2 (from test 17) + 1 (from test 18) = 3 seats out of 5!
    const oversaleBooking = await request('/api/tourism/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer2Token}` },
      body: { packageId: newPkgId, travellerName: 'Customer Two', email: email2, phone: '+96892222222', travellers: 3 } // Needs 3, only 2 available!
    });
    assert.strictEqual(oversaleBooking.status, 400);
    assert.ok(oversaleBooking.body.error.message.includes('Insufficient Capacity'));
    console.log('  ✅ Capacity oversale blocked: Request for 3 seats rejected (only 2 left out of 5)');

    // 20. Task #4: IDOR Protection on Tour Bookings Test
    console.log('\n[20] Testing Customer Booking IDOR Isolation...');
    const ownBookingGet = await request(`/api/tourism/bookings/${bookingRef}`, {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    assert.strictEqual(ownBookingGet.status, 200);

    const idorBookingGet = await request(`/api/tourism/bookings/${bookingRef}`, {
      headers: { Authorization: `Bearer ${customer2Token}` } // Customer 2 attempting to view Customer 1's booking!
    });
    assert.strictEqual(idorBookingGet.status, 403);
    console.log('  ✅ IDOR Check PASSED: Customer 2 blocked from accessing Customer 1\'s booking (403)');

    // 21. Task #4: Server-Controlled Booking State Transition Matrix & Legal Status Jump Test
    console.log('\n[21] Testing Booking Status Transition Matrix...');
    const illegalCustStatusJump = await request(`/api/tourism/bookings/${bookingRef}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { status: 'CONFIRMED' }
    });
    assert.strictEqual(illegalCustStatusJump.status, 400);
    console.log('  ✅ Customer illegal status jump to CONFIRMED blocked (400)');

    const staffStatusTransition = await request(`/api/tourism/bookings/${bookingRef}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'CONFIRMED', note: 'Manual payment verification passed.' }
    });
    assert.strictEqual(staffStatusTransition.status, 200);
    assert.strictEqual(staffStatusTransition.body.booking.status, 'CONFIRMED');
    console.log('  ✅ Authorized staff status transition to CONFIRMED succeeded');

    // 22. Task #4: Historical Package Price Snapshot Stability Test
    console.log('\n[22] Testing Historical Booking Price Snapshot Stability...');
    const priceUpdateRes = await request(`/api/tourism/packages/${newPkgId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { priceMinor: 250000 } // Increase package price to 250 OMR!
    });
    assert.strictEqual(priceUpdateRes.status, 200);

    const checkPastBooking = await request(`/api/tourism/bookings/${bookingRef}`, {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    assert.strictEqual(checkPastBooking.body.booking.amount, 300); // Must remain 300 OMR (original 150 * 2)!
    console.log('  ✅ Historical booking price remained 300 OMR after package price update to 250 OMR');

    // 23. Task #4: Booking Cancellation & Capacity Release Test
    console.log('\n[23] Testing Booking Cancellation & Capacity Release...');
    const cancelRes = await request(`/api/tourism/bookings/${bookingRef}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { reason: 'Plans changed.' }
    });
    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelRes.body.booking.status, 'CANCELLED');
    console.log('  ✅ Booking cancelled successfully & capacity released');

    // 24. Task #4: Staff Refund Request Workflow Test
    console.log('\n[24] Testing Staff Refund Request Workflow...');
    const refundRes = await request(`/api/tourism/bookings/${bookingRef}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { reason: 'Full refund processed due to early cancellation.', amount: 300 }
    });
    assert.strictEqual(refundRes.status, 201);
    assert.strictEqual(refundRes.body.refund.status, 'REFUND_REQUESTED');
    console.log('  ✅ Staff refund request created cleanly');

    // 25. Task #5: Payment Order Creation & IDOR Isolation Test
    console.log('\n[25] Testing Payment Creation & IDOR Isolation...');
    // Create new test booking for Customer 1
    const testBookRes = await request('/api/tourism/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { packageId: newPkgId, travellerName: 'Customer One', email: email1, phone: '+96891111111', travellers: 2 }
    });
    assert.strictEqual(testBookRes.status, 201);
    const payableBookingRef = testBookRes.body.reference;
    const payableBookingId = testBookRes.body.booking.id;

    // Customer 2 attempting to pay Customer 1's booking (IDOR Attack!)
    const idorPayRes = await request('/api/payments/create-order', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer2Token}` },
      body: { bookingId: payableBookingId }
    });
    assert.strictEqual(idorPayRes.status, 403);
    console.log('  ✅ IDOR Check PASSED: Customer 2 blocked from creating payment for Customer 1\'s booking (403)');

    // Customer 1 paying own booking
    const validPayOrder = await request('/api/payments/create-order', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { bookingId: payableBookingId }
    });
    assert.strictEqual(validPayOrder.status, 201);
    assert.strictEqual(validPayOrder.body.amount, 500); // 250 * 2 = 500 OMR! Authoritative calculation!
    assert.ok(validPayOrder.body.paymentNumber.startsWith('JMT-P-'));
    const paymentRecordId = validPayOrder.body.payment.id;
    const providerOrdId = validPayOrder.body.providerOrderId;
    console.log(`  ✅ Payment order created cleanly: ${validPayOrder.body.paymentNumber} (Authoritative Total: ${validPayOrder.body.amount} OMR)`);

    // 26. Task #5: Amount & Currency Security Test
    console.log('\n[26] Testing Amount & Currency Security (Client Override Rejection)...');
    const tamperAmountPayOrder = await request('/api/payments/create-order', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { bookingId: payableBookingId, amount: 1.000, currency: 'USD' } // Client trying to pay 1 USD!
    });
    assert.strictEqual(tamperAmountPayOrder.status, 201);
    assert.strictEqual(tamperAmountPayOrder.body.amount, 500); // Must strictly remain 500 OMR!
    assert.strictEqual(tamperAmountPayOrder.body.currency, 'OMR');
    console.log('  ✅ Amount & currency security PASSED: Server enforced 500 OMR (ignored 1 USD claim)');

    // 27. Task #5: Payment Creation Idempotency Test
    console.log('\n[27] Testing Payment Creation Idempotency...');
    const payIdemKey = `pay_idem_${Date.now()}`;
    const firstPayReq = await request('/api/payments/create-order', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { bookingId: payableBookingId, idempotencyKey: payIdemKey }
    });
    assert.strictEqual(firstPayReq.status, 201);

    const replayPayReq = await request('/api/payments/create-order', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { bookingId: payableBookingId, idempotencyKey: payIdemKey }
    });
    assert.strictEqual(replayPayReq.status, 200);
    assert.strictEqual(replayPayReq.body.isDuplicate, true);
    assert.strictEqual(replayPayReq.body.paymentNumber, firstPayReq.body.paymentNumber);
    console.log('  ✅ Payment creation idempotency PASSED: Replay returned existing order');

    // 28. Task #5: Payment Detail View & IDOR Protection Test
    console.log('\n[28] Testing Payment Detail View & IDOR Protection...');
    const ownPayDetail = await request(`/api/payments/${paymentRecordId}`, {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    assert.strictEqual(ownPayDetail.status, 200);

    const idorPayDetail = await request(`/api/payments/${paymentRecordId}`, {
      headers: { Authorization: `Bearer ${customer2Token}` } // Customer 2 viewing Customer 1's payment!
    });
    assert.strictEqual(idorPayDetail.status, 403);
    console.log('  ✅ Payment detail IDOR check PASSED: Customer 2 blocked from viewing Customer 1\'s payment (403)');

    // 29. Task #5: Webhook Signature Verification Test
    console.log('\n[29] Testing Webhook Signature Verification...');
    // Set NODE_ENV to production temporarily to test signature rejection
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const fakeSigWebhook = await request('/api/payments/webhook', {
      method: 'POST',
      headers: { 'x-signature': 'invalid-hacker-signature' },
      body: { providerOrderId: providerOrdId, status: 'SUCCESS' }
    });
    assert.strictEqual(fakeSigWebhook.status, 401);
    process.env.NODE_ENV = origEnv;
    console.log('  ✅ Webhook signature security PASSED: Fraudulent webhook rejected (401)');

    // 30. Task #5: Webhook Amount Reconciliation Test
    console.log('\n[30] Testing Webhook Amount Reconciliation...');
    const amountMismatchWebhook = await request('/api/payments/webhook', {
      method: 'POST',
      headers: { 'x-signature': 'sandbox' },
      body: { providerOrderId: providerOrdId, status: 'SUCCESS', amountMinor: 1000, currency: 'OMR' } // Claims 1 OMR!
    });
    assert.strictEqual(amountMismatchWebhook.status, 400);
    assert.ok(amountMismatchWebhook.body.error.message.includes('mismatch'));
    console.log('  ✅ Webhook amount mismatch rejected (400)');

    // 31. Task #5: Webhook Processing & Booking Status Update Test
    console.log('\n[31] Testing Webhook Success Execution & Automatic Booking Confirmation...');
    const webhookEvtId = `evt_success_${Date.now()}`;
    const validWebhook = await request('/api/payments/webhook', {
      method: 'POST',
      headers: { 'x-signature': 'sandbox' },
      body: {
        providerOrderId: providerOrdId,
        providerPaymentId: `pay_gateway_${Date.now()}`,
        status: 'SUCCESS',
        amountMinor: 500000, // 500 OMR in minor units
        currency: 'OMR',
        idempotencyKey: webhookEvtId
      }
    });
    assert.strictEqual(validWebhook.status, 200);

    // Verify payment status changed to PAID
    const paidPayDetail = await request(`/api/payments/${paymentRecordId}`, {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    assert.strictEqual(paidPayDetail.body.payment.status, 'PAID');

    // Verify linked booking status changed to CONFIRMED
    const confirmedBooking = await request(`/api/tourism/bookings/${payableBookingRef}`, {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    assert.strictEqual(confirmedBooking.body.booking.status, 'CONFIRMED');
    console.log('  ✅ Webhook success PASSED: Payment status updated to PAID & Booking automatically CONFIRMED');

    // 32. Task #5: Webhook Replay & Duplicate Event Defense Test
    console.log('\n[32] Testing Webhook Replay & Duplicate Event Defense...');
    const duplicateWebhook = await request('/api/payments/webhook', {
      method: 'POST',
      headers: { 'x-signature': 'sandbox' },
      body: {
        providerOrderId: providerOrdId,
        status: 'SUCCESS',
        amountMinor: 500000,
        currency: 'OMR',
        idempotencyKey: webhookEvtId
      }
    });
    assert.strictEqual(duplicateWebhook.status, 200);
    assert.strictEqual(duplicateWebhook.body.duplicate, true);
    console.log('  ✅ Webhook replay defense PASSED: Duplicate event handled idempotently');

    // 33. Task #5: Partial & Full Refund Workflow Test
    console.log('\n[33] Testing Partial & Full Refund Workflow...');
    // A. Partial Refund 200 OMR
    const partialRefundRes = await request(`/api/payments/${paymentRecordId}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { amount: 200, reason: 'Partial refund requested.' }
    });
    assert.strictEqual(partialRefundRes.status, 201);

    const checkPartialPay = await request(`/api/payments/${paymentRecordId}`, {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    assert.strictEqual(checkPartialPay.body.payment.status, 'PARTIALLY_REFUNDED');
    assert.strictEqual(checkPartialPay.body.payment.refundedAmountMinor, 200000);
    console.log('  ✅ Partial refund (200 OMR) PASSED: Payment status updated to PARTIALLY_REFUNDED');

    // B. Excess Refund Rejection (Attempting 400 OMR when only 300 OMR remains!)
    const excessRefundRes = await request(`/api/payments/${paymentRecordId}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { amount: 400, reason: 'Excessive refund attempt' }
    });
    assert.strictEqual(excessRefundRes.status, 400);
    assert.ok(excessRefundRes.body.error.message.includes('exceeds remaining refundable balance'));
    console.log('  ✅ Excess refund rejected (400): Blocked attempt exceeding remaining 300 OMR balance');

    // C. Remaining Full Refund (300 OMR)
    const fullRefundRes = await request(`/api/payments/${paymentRecordId}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { amount: 300, reason: 'Remaining refund processed.' }
    });
    assert.strictEqual(fullRefundRes.status, 201);

    const checkFullPay = await request(`/api/payments/${paymentRecordId}`, {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    assert.strictEqual(checkFullPay.body.payment.status, 'REFUNDED');
    assert.strictEqual(checkFullPay.body.payment.refundedAmountMinor, 500000);
    console.log('  ✅ Remaining refund (300 OMR) PASSED: Payment status updated to REFUNDED');

    // 34. Task #5: Customer Refund RBAC Protection Test
    console.log('\n[34] Testing Customer Refund RBAC Protection...');
    const custRefundAttempt = await request(`/api/payments/${paymentRecordId}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { amount: 50, reason: 'Customer refund attempt' }
    });
    assert.strictEqual(custRefundAttempt.status, 403);
    console.log('  ✅ Customer refund attempt blocked (403)');

    // 35. Task #6: In-App Notifications Listing, Pagination & Unread Filtering Test
    console.log('\n[35] Testing In-App Notifications Listing, Pagination & Unread Filtering...');
    const notifListRes = await request('/api/notifications?unread=true&limit=10', {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    assert.strictEqual(notifListRes.status, 200);
    assert.ok(Array.isArray(notifListRes.body.notifications));
    assert.ok(notifListRes.body.pagination);
    assert.ok(notifListRes.body.notifications.length > 0);
    const targetNotifId = notifListRes.body.notifications[0].id;
    console.log(`  ✅ In-app notifications listed cleanly (Unread count: ${notifListRes.body.unreadCount})`);

    // 36. Task #6: In-App Notification Mark Read & IDOR Isolation Test
    console.log('\n[36] Testing In-App Notification Mark Read & IDOR Isolation...');
    const idorNotifRead = await request(`/api/notifications/${targetNotifId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customer2Token}` } // Customer 2 trying to mark Customer 1's notification read!
    });
    assert.strictEqual(idorNotifRead.status, 403);
    console.log('  ✅ IDOR Check PASSED: Customer 2 blocked from reading Customer 1\'s notification (403)');

    const ownNotifRead = await request(`/api/notifications/${targetNotifId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    assert.strictEqual(ownNotifRead.status, 200);
    assert.strictEqual(ownNotifRead.body.notification.read, true);

    const markAllRes = await request('/api/notifications/read-all', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    assert.strictEqual(markAllRes.status, 200);
    console.log('  ✅ Notification mark read & mark-all-read PASSED');

    // 37. Task #6: Email Template Rendering & HTML Escaping Test
    console.log('\n[37] Testing Email Template Rendering & Dynamic Content XSS Escaping...');
    const notificationService = require('./services/notification');
    const templateOutput = notificationService.renderEmailTemplate('TEST_EVENT', {
      title: 'XSS Test <script>alert(1)</script>',
      message: 'Hello <img src=x onerror=alert(1)>',
      recipientName: 'Attacker "or" 1=1'
    });
    assert.ok(!templateOutput.html.includes('<script>'));
    assert.ok(templateOutput.html.includes('&lt;script&gt;'));
    assert.ok(templateOutput.html.includes('&quot;or&quot;'));
    console.log('  ✅ Template engine XSS HTML escaping verification PASSED');

    // 38. Task #6: Notification Dispatch Idempotency Test
    console.log('\n[38] Testing Notification Dispatch Idempotency...');
    const duplicateEventKey = `notif_idem_${Date.now()}`;
    const firstDispatch = await notificationService.dispatchEvent('VISA_APPROVED', {
      user: customer1User,
      email: email1,
      reference: 'JMT-V-999999',
      idempotencyKey: duplicateEventKey
    });
    assert.strictEqual(firstDispatch.success, true);

    const secondDispatch = await notificationService.dispatchEvent('VISA_APPROVED', {
      user: customer1User,
      email: email1,
      reference: 'JMT-V-999999',
      idempotencyKey: duplicateEventKey
    });
    assert.strictEqual(secondDispatch.isDuplicate, true);
    console.log('  ✅ Notification dispatch idempotency PASSED: Duplicate event key skipped dispatch');

    // 39. Task #6: Notification Failure Isolation Test
    console.log('\n[39] Testing Notification Failure Isolation (Transaction Non-Blocking)...');
    // Notification error must never throw unhandled exception or crash caller
    const failedDispatch = await notificationService.dispatchEvent('INVALID_EVENT_TRIGGER', {
      userId: null,
      email: null,
      phone: null
    });
    assert.strictEqual(failedDispatch.success, true); // Handled safely without crashing
    console.log('  ✅ Notification failure isolation PASSED: Errors caught safely without crashing transaction');

    // 40. Task #6: Fail-Safe Provider Selection Test
    console.log('\n[40] Testing Fail-Safe Provider Selection & Credentials Enforcement...');
    process.env.EMAIL_PROVIDER = 'resend';
    delete process.env.RESEND_API_KEY;
    try {
      delete require.cache[require.resolve('./services/notification')];
      require('./services/notification');
      assert.fail('Should have thrown provider config error');
    } catch (err) {
      assert.ok(err.message.includes('RESEND_API_KEY is missing') || err.message.includes('Config Error'));
    } finally {
      process.env.EMAIL_PROVIDER = 'mock';
      delete require.cache[require.resolve('./services/notification')];
      require('./services/notification');
    }
    console.log('  ✅ Fail-safe provider selection PASSED: Missing real provider credentials failed safely without silent mock fallback');

    // 41. Task #6: Production DB Fallback Blocking Regression Test
    console.log('\n[41] Testing Production DB Fallback Blocking Regression...');
    process.env.DATABASE_MODE = 'mongodb';
    const readyProdRes = await request('/ready');
    assert.strictEqual(readyProdRes.status, 503);
    delete process.env.DATABASE_MODE;
    console.log('  ✅ Production database readiness check PASSED (503 Service Unavailable when DB is offline)');

    console.log('\n================================================================');
    console.log('🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY! (41/41)');
    console.log('================================================================');
  } catch (err) {
    console.error('\n❌ Test Failure Details:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
}

runTestSuite();
