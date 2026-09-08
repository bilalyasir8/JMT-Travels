/**
 * JMT TRAVELS — Express Master V1 Backend API Server
 * Production-ready RESTful architecture with MongoDB/JSON persistence, JWT Auth, RBAC,
 * Visa Workflow, Tourism CMS, Private Document Uploads, Payment Abstraction, Chatbot, and Audit Trail.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
require('dotenv').config();

const db = require('./db');
const paymentService = require('./services/payment');
const notificationService = require('./services/notification');
const chatbotService = require('./services/chatbot');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_SECRET = process.env.AUTH_SECRET || 'local-development-jmt-jwt-secret-key';

// Multer Storage Setup for Private Passport/Identity Documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, db.PRIVATE_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `doc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WEBP, and PDF documents are allowed.'));
    }
  }
});

// Middleware
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many submissions. Please wait 15 minutes.' } }
});

app.use('/api/', globalLimiter);

// Seed Initial Catalogue Data
async function seedInitialData() {
  const existingPackages = await db.tourPackages.find();
  if (existingPackages.length === 0) {
    await db.tourPackages.create({
      slug: 'dubai-desert-escape',
      title: 'Dubai Desert Escape',
      destination: 'Dubai',
      category: 'City Tours',
      duration: '4 nights',
      durationDays: 5,
      priceMinor: 189000, // 189 OMR
      currency: 'OMR',
      image: '/assets/destinations/dubai_1.jpg',
      summary: 'Explore Dubai with premium city tours, desert safari, and airport transfers.',
      highlights: ['Airport Transfers', 'Desert Safari with Dinner', 'Burj Khalifa View'],
      inclusions: ['4-star hotel stay', 'Daily breakfast', 'Guided tours'],
      exclusions: ['International flights', 'Personal expenses'],
      published: true,
      featured: true
    });

    await db.tourPackages.create({
      slug: 'salalah-khareef-retreat',
      title: 'Salalah Khareef Retreat',
      destination: 'Salalah',
      category: 'Family',
      duration: '3 nights',
      durationDays: 4,
      priceMinor: 129000, // 129 OMR
      currency: 'OMR',
      image: '/assets/destinations/salalah_1.jpg',
      summary: 'Experience the green waterfalls and cool climate of Salalah during Khareef.',
      highlights: ['Wadi Darbat Tour', 'Mughsail Blowholes', 'Custom Private Vehicle'],
      inclusions: ['Resort stay', 'Breakfast & dinner', 'Airport transfers'],
      exclusions: ['Flights'],
      published: true,
      featured: true
    });

    await db.tourPackages.create({
      slug: 'umrah-made-serene',
      title: 'Umrah, Made Serene',
      destination: 'Makkah & Madinah',
      category: 'Religious',
      duration: '7 nights',
      durationDays: 8,
      priceMinor: 249000, // 249 OMR
      currency: 'OMR',
      image: '/assets/destinations/umrah_1.jpg',
      summary: 'Guided Umrah package with luxury transfers and close-to-Haram stays.',
      highlights: ['Haram-facing accommodation', 'High-speed train transfers', 'Guided Ziyarat'],
      inclusions: ['5-star hotel in Makkah & Madinah', 'Visa processing assistance'],
      exclusions: ['Personal items'],
      published: true,
      featured: true
    });
  }

  const existingVisas = await db.visaServices.find();
  if (existingVisas.length === 0) {
    await db.visaServices.create({
      slug: 'uae-tourist-visa',
      country: 'United Arab Emirates',
      visaType: 'Tourist',
      validity: '60 Days',
      processingTime: '24–48 Hours',
      entryType: 'Single / Multiple',
      priceMinor: 45000, // 45 OMR
      currency: 'OMR',
      overview: 'Fast-track UAE tourist visa clearing for Oman residents and international visitors.',
      eligibility: 'Valid passport with at least 6 months validity.',
      requiredDocuments: ['Passport Copy', 'Passport Photo', 'Oman Resident Card (if applicable)'],
      published: true
    });

    await db.visaServices.create({
      slug: 'saudi-visit-visa',
      country: 'Saudi Arabia',
      visaType: 'Tourist / Visit',
      validity: '1 Year Multiple Entry',
      processingTime: '24 Hours',
      entryType: 'Multiple',
      priceMinor: 55000, // 55 OMR
      currency: 'OMR',
      overview: 'Saudi e-Visa clearing for Umrah, business, and leisure travel.',
      eligibility: 'Eligible nationalities or GCC residency holder.',
      requiredDocuments: ['Passport Copy', 'Photo'],
      published: true
    });
  }

  // Seed Admin User
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@jmttravels.com').toLowerCase();
  const existingAdmin = await db.users.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const passwordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'JMTAdmin2026!', 12);
    await db.users.create({
      name: 'JMT Super Admin',
      email: adminEmail,
      passwordHash,
      role: 'SUPER_ADMIN',
      verified: true
    });
    console.log(`[Seed] Created admin account: ${adminEmail}`);
  }
}

// Auth Helper Functions & Middleware
function generateToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, AUTH_SECRET, { expiresIn: '7d' });
}

async function authenticate(req, res, next) {
  try {
    const authHeader = req.get('authorization') || '';
    const cookieHeader = req.get('cookie') || '';
    let token = '';

    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (cookieHeader.includes('jmt_session=')) {
      token = decodeURIComponent(cookieHeader.split('jmt_session=')[1].split(';')[0]);
    } else {
      const adminKey = req.get('x-admin-key');
      if (adminKey && process.env.ADMIN_ACCESS_KEY && adminKey === process.env.ADMIN_ACCESS_KEY) {
        req.user = { id: 'admin-key-user', role: 'ADMIN', name: 'Staff Access Key' };
        return next();
      }
    }

    if (!token) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });

    const payload = jwt.verify(token, AUTH_SECRET);
    const user = await db.users.findById(payload.sub);
    if (!user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User session invalid.' } });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Session expired or invalid.' } });
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You lack permission to access this resource.' } });
    }
    next();
  };
}

async function logAudit(req, action, entityType, entityId, metadata = {}) {
  try {
    await db.auditLogs.create({
      actorId: req.user ? req.user.id : 'ANONYMOUS',
      actorRole: req.user ? req.user.role : 'GUEST',
      action,
      entityType,
      entityId,
      metadata
    });
  } catch (err) {
    console.error('[Audit Log Error]:', err.message);
  }
}

// =============================================================
// API ROUTES
// =============================================================

// --- 1. HEALTH CHECKS ---
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'JMT TRAVELS V1 API', timestamp: new Date().toISOString() }));
app.get('/ready', (req, res) => res.json({ ready: true, storage: db.isMongoConnected() ? 'MongoDB Atlas' : 'Persistent JSON' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'JMT TRAVELS API' }));

// --- 2. AUTHENTICATION & USERS ---
app.post('/api/auth/register', submissionLimiter, async (req, res) => {
  try {
    const { name, email, password, phone } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();

    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid full name is required.' } });
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid email address is required.' } });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters.' } });
    }

    const existing = await db.users.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, error: { code: 'USER_EXISTS', message: 'An account with this email already exists.' } });
    }

    const passwordHash = bcrypt.hashSync(password, 12);
    const user = await db.users.create({
      name: cleanName,
      email: cleanEmail,
      phone: phone || '',
      passwordHash,
      role: 'CUSTOMER',
      verified: true
    });

    const token = generateToken(user);
    await notificationService.dispatchEvent('ACCOUNT_CREATED', { user });

    res.status(201).json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.post('/api/auth/login', submissionLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();

    const user = await db.users.findOne({ email: cleanEmail });
    if (!user || !user.passwordHash || !bcrypt.compareSync(password || '', user.passwordHash)) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
    }

    const token = generateToken(user);
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  res.json({
    success: true,
    user: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role, phone: req.user.phone }
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Signed out successfully.' });
});

// --- 3. VISA SERVICES & APPLICATIONS ---
app.get('/api/visa/services', async (req, res) => {
  const services = await db.visaServices.find({ published: true });
  res.json({ success: true, services });
});

app.get('/api/visa/services/:slug', async (req, res) => {
  const service = await db.visaServices.findOne({ slug: req.params.slug });
  if (!service) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Visa service not found.' } });
  res.json({ success: true, service });
});

app.post('/api/visa/applications', submissionLimiter, async (req, res) => {
  try {
    const { destination, visaType, nationality, fullName, email, phone, passportNumber, website } = req.body || {};
    if (website) return res.json({ success: true, reference: 'JMT-V-SPAM' });

    if (!destination || !fullName || !email || !phone) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please provide all required application fields.' } });
    }

    const reference = `JMT-V-${Date.now().toString().slice(-7)}`;
    const application = await db.visaApplications.create({
      applicationNumber: reference,
      userId: req.user ? req.user.id : null,
      destination,
      visaType: visaType || 'Tourist',
      nationality: nationality || '',
      fullName,
      email,
      phone,
      passportNumber: passportNumber || '',
      status: 'SUBMITTED',
      documents: [],
      timeline: [{ status: 'SUBMITTED', timestamp: new Date().toISOString(), note: 'Application submitted.' }]
    });

    await notificationService.dispatchEvent('VISA_SUBMITTED', { email, phone, reference, user: req.user });
    res.status(201).json({ success: true, reference, status: application.status, message: 'Your application has been received.' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.get('/api/visa/applications', authenticate, async (req, res) => {
  const isStaff = ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
  const filter = isStaff ? {} : { userId: req.user.id };
  const applications = await db.visaApplications.find(filter);
  res.json({ success: true, applications });
});

app.get('/api/visa/applications/:id', authenticate, async (req, res) => {
  const application = await db.visaApplications.findById(req.params.id) || await db.visaApplications.findOne({ applicationNumber: req.params.id });
  if (!application) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found.' } });

  const isStaff = ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
  if (!isStaff && application.userId !== req.user.id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied to this application.' } });
  }
  res.json({ success: true, application });
});

app.patch('/api/visa/applications/:id/status', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const { status, note } = req.body || {};
  const validStatuses = ['DRAFT', 'SUBMITTED', 'PAYMENT_PENDING', 'PAYMENT_COMPLETED', 'DOCUMENT_REVIEW', 'PROCESSING', 'ADDITIONAL_INFORMATION_REQUIRED', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid visa application status.' } });
  }

  const application = await db.visaApplications.findById(req.params.id) || await db.visaApplications.findOne({ applicationNumber: req.params.id });
  if (!application) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found.' } });

  const timeline = application.timeline || [];
  timeline.push({ status, timestamp: new Date().toISOString(), note: note || '' });

  const updated = await db.visaApplications.update(application.id, { status, timeline });
  await logAudit(req, `Changed visa status to ${status}`, 'VISA_APPLICATION', application.id);
  await notificationService.dispatchEvent('VISA_STATUS_CHANGED', { email: application.email, phone: application.phone, reference: application.applicationNumber, status });

  res.json({ success: true, application: updated });
});

// --- 4. SECURE PRIVATE FILE UPLOADS & DOWNLOADS ---
app.post('/api/documents/upload', authenticate, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'Please select a document file to upload.' } });
    }

    const { applicationId, documentType } = req.body || {};
    const docRecord = await db.visaDocuments.create({
      documentId: `doc_${crypto.randomBytes(6).toString('hex')}`,
      applicationId: applicationId || null,
      documentType: documentType || 'PASSPORT_COPY',
      storageKey: req.file.filename,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: req.user.id
    });

    if (applicationId) {
      const appRecord = await db.visaApplications.findById(applicationId) || await db.visaApplications.findOne({ applicationNumber: applicationId });
      if (appRecord) {
        const docs = appRecord.documents || [];
        docs.push(docRecord.id);
        await db.visaApplications.update(appRecord.id, { documents: docs });
      }
    }

    res.status(201).json({ success: true, document: docRecord });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'UPLOAD_ERROR', message: err.message } });
  }
});

app.get('/api/documents/:id/download', authenticate, async (req, res) => {
  try {
    const docRecord = await db.visaDocuments.findById(req.params.id) || await db.visaDocuments.findOne({ documentId: req.params.id });
    if (!docRecord) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document record not found.' } });

    const isStaff = ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    if (!isStaff && docRecord.uploadedBy !== req.user.id) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied to this document.' } });
    }

    const filePath = path.join(db.PRIVATE_UPLOADS_DIR, docRecord.storageKey);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: { code: 'FILE_MISSING', message: 'File missing from storage.' } });
    }

    res.setHeader('Content-Type', docRecord.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${docRecord.originalFilename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// --- 5. TOURISM CATALOGUE & BOOKINGS ---
app.get('/api/tourism/packages', async (req, res) => {
  const { destination, category, q } = req.query || {};
  let packages = await db.tourPackages.find({ published: true });

  if (destination) packages = packages.filter(p => p.destination.toLowerCase() === destination.toLowerCase());
  if (category) packages = packages.filter(p => p.category.toLowerCase() === category.toLowerCase());
  if (q) packages = packages.filter(p => p.title.toLowerCase().includes(q.toLowerCase()) || p.summary.toLowerCase().includes(q.toLowerCase()));

  res.json({ success: true, packages });
});

app.get('/api/packages', async (req, res) => {
  const packages = await db.tourPackages.find({ published: true });
  // Map minor units for legacy UI
  const legacy = packages.map(p => ({ ...p, price: p.priceMinor ? p.priceMinor / 1000 : p.price || 189, rating: p.rating || 4.8 }));
  res.json({ success: true, packages: legacy });
});

app.get('/api/tourism/packages/:slug', async (req, res) => {
  const pkg = await db.tourPackages.findOne({ slug: req.params.slug }) || await db.tourPackages.findById(req.params.slug);
  if (!pkg) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Package not found.' } });
  res.json({ success: true, package: pkg });
});

app.post('/api/tourism/bookings', submissionLimiter, async (req, res) => {
  try {
    const { packageId, travellerName, email, phone, travellers, travelDate, website } = req.body || {};
    if (website) return res.json({ success: true, reference: 'JMT-B-SPAM' });

    const count = parseInt(travellers, 10) || 1;
    const selectedPkg = await db.tourPackages.findById(packageId) || await db.tourPackages.findOne({ slug: packageId });

    if (!selectedPkg || !travellerName || !email || !phone) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please complete all required booking fields.' } });
    }

    // SERVER-CALCULATED FINANCIAL AMOUNT (NEVER TRUST FRONTEND PRICE)
    const unitPrice = selectedPkg.priceMinor ? selectedPkg.priceMinor / 1000 : selectedPkg.price || 189;
    const totalAmount = unitPrice * count;

    const reference = `JMT-B-${Date.now().toString().slice(-7)}`;
    const booking = await db.tourBookings.create({
      bookingNumber: reference,
      packageId: selectedPkg.id,
      packageTitle: selectedPkg.title,
      userId: req.user ? req.user.id : null,
      travellerName,
      email,
      phone,
      travellers: count,
      travelDate: travelDate || '',
      amount: totalAmount,
      currency: selectedPkg.currency || 'OMR',
      status: 'PAYMENT_PENDING'
    });

    res.status(201).json({
      success: true,
      reference,
      status: booking.status,
      amount: totalAmount,
      currency: booking.currency,
      message: 'Booking request created successfully.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.post('/api/bookings', submissionLimiter, async (req, res) => {
  // Alias for backward compatibility
  const pkgId = req.body.packageId;
  const pkg = await db.tourPackages.findById(pkgId) || await db.tourPackages.findOne({ slug: pkgId }) || { id: 'pkg_dubai', title: 'Dubai Escape', currency: 'OMR', price: 189 };
  const count = parseInt(req.body.travellers, 10) || 1;
  const reference = `JMT-B-${Date.now().toString().slice(-7)}`;
  
  const booking = await db.tourBookings.create({
    bookingNumber: reference,
    packageId: pkg.id,
    packageTitle: pkg.title,
    travellerName: req.body.travellerName,
    email: req.body.email,
    phone: req.body.phone,
    travellers: count,
    amount: (pkg.priceMinor ? pkg.priceMinor / 1000 : pkg.price || 189) * count,
    currency: pkg.currency || 'OMR',
    status: 'Payment link pending'
  });

  res.status(201).json({ success: true, reference, status: booking.status, amount: booking.amount, currency: booking.currency, message: 'Reservation requested.' });
});

app.get('/api/tourism/bookings', authenticate, async (req, res) => {
  const isStaff = ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
  const filter = isStaff ? {} : { userId: req.user.id };
  const bookings = await db.tourBookings.find(filter);
  res.json({ success: true, bookings });
});

// --- 6. PAYMENTS & WEBHOOKS ---
app.post('/api/payments/create-order', authenticate, async (req, res) => {
  try {
    const { bookingId, visaApplicationId, amount, currency } = req.body || {};
    const result = await paymentService.createPaymentOrder({
      userId: req.user.id,
      bookingId,
      visaApplicationId,
      amount,
      currency: currency || 'OMR'
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'PAYMENT_ERROR', message: err.message } });
  }
});

app.post('/api/payments/webhook', async (req, res) => {
  try {
    const signature = req.get('x-signature') || req.get('x-razorpay-signature') || 'sandbox';
    const rawBody = JSON.stringify(req.body);
    const result = await paymentService.handleWebhook(rawBody, signature, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'WEBHOOK_FAILED', message: err.message } });
  }
});

// --- 7. CHATBOT & SUPPORT TICKETS ---
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body || {};
    const response = await chatbotService.processMessage({ message, conversationId, user: req.user });
    res.json({ success: true, ...response });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'CHAT_ERROR', message: err.message } });
  }
});

app.post('/api/support/tickets', submissionLimiter, async (req, res) => {
  try {
    const { subject, message, category } = req.body || {};
    if (!subject || !message) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Subject and message are required.' } });
    }

    const ticket = await db.supportTickets.create({
      ticketId: `TCK-${Date.now().toString().slice(-6)}`,
      userId: req.user ? req.user.id : null,
      subject,
      category: category || 'General',
      priority: 'MEDIUM',
      status: 'OPEN',
      messages: [{ sender: req.user ? req.user.name : 'Guest', message, timestamp: new Date().toISOString() }]
    });

    res.status(201).json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.get('/api/support/tickets', authenticate, async (req, res) => {
  const isStaff = ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
  const filter = isStaff ? {} : { userId: req.user.id };
  const tickets = await db.supportTickets.find(filter);
  res.json({ success: true, tickets });
});

// --- 8. REVIEWS & FEEDBACK ---
app.get('/api/reviews', async (req, res) => {
  const reviews = await db.reviews.find();
  reviews.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const count = reviews.length;
  const totalScore = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
  const average = count > 0 ? parseFloat((totalScore / count).toFixed(1)) : 5.0;
  res.json({ success: true, reviews, count, average });
});

app.post('/api/reviews', submissionLimiter, async (req, res) => {
  const { name, rating, message, website } = req.body || {};
  if (website) return res.json({ success: true, message: 'Review published.' });
  const review = await db.reviews.create({ name, rating: parseInt(rating, 10) || 5, message });
  res.status(201).json({ success: true, review });
});

app.post('/api/feedback', submissionLimiter, async (req, res) => {
  const { name, contact, type, message, website } = req.body || {};
  if (website) return res.json({ success: true, message: 'Feedback received.' });
  await db.contactInquiries.create({ name, contact, type, message, status: 'OPEN' });
  await notificationService.sendEmail({ to: process.env.FEEDBACK_EMAIL || 'info@jmttravels.com', subject: `[JMT Contact] ${type}: ${name}`, text: message });
  res.json({ success: true, message: 'Thank you for your feedback.' });
});

// --- 9. PUBLIC TRACKING ---
app.get('/api/track/:reference', async (req, res) => {
  const ref = String(req.params.reference || '').trim().toUpperCase();
  const visaApp = await db.visaApplications.findOne({ applicationNumber: ref }) || await db.visaApplications.findById(ref);
  const booking = await db.tourBookings.findOne({ bookingNumber: ref }) || await db.tourBookings.findById(ref);
  const record = visaApp || booking;

  if (!record) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invalid JMT reference number.' } });

  res.json({
    success: true,
    type: visaApp ? 'visa' : 'booking',
    reference: record.applicationNumber || record.bookingNumber || record.id,
    status: record.status,
    title: visaApp ? `${record.destination} Visa` : record.packageTitle,
    createdAt: record.createdAt
  });
});

// --- 10. ADMIN METRICS & REPORTING ---
app.get('/api/admin/overview', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const applications = await db.visaApplications.find();
  const bookings = await db.tourBookings.find();
  const tickets = await db.supportTickets.find();
  const users = await db.users.find();

  res.json({
    success: true,
    metrics: {
      customers: users.length,
      visaApplications: applications.length,
      openVisaApplications: applications.filter(a => !['APPROVED', 'REJECTED', 'Approved', 'Rejected'].includes(a.status)).length,
      reservations: bookings.length,
      paymentPending: bookings.filter(b => b.status.includes('PENDING') || b.status.includes('pending')).length,
      supportItems: tickets.filter(t => t.status === 'OPEN').length
    },
    recent: { applications: applications.slice(0, 6), bookings: bookings.slice(0, 6) }
  });
});

app.get('/api/admin/visa-applications', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const applications = await db.visaApplications.find();
  res.json({ success: true, applications });
});

app.get('/api/admin/bookings', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const bookings = await db.tourBookings.find();
  res.json({ success: true, bookings });
});

app.get('/api/admin/payments', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const payments = await db.payments.find();
  res.json({ success: true, payments });
});

app.get('/api/admin/audit-logs', authenticate, authorize('SUPER_ADMIN'), async (req, res) => {
  const logs = await db.auditLogs.find();
  res.json({ success: true, logs });
});

// Fallback to index.html for SPA frontend routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/admin')) {
    return res.sendFile(path.join(__dirname, '../frontend/public/admin.html'));
  }
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Start Server if main module
if (require.main === module) {
  db.connectDB().then(() => {
    seedInitialData().then(() => {
      const server = app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`✈️  JMT TRAVELS Master V1 API Server Running`);
        console.log(`📍 URL: http://localhost:${PORT}`);
        console.log(`====================================================`);
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`\n❌ Error: Port ${PORT} is already in use by another process.`);
          console.error(`💡 Solution: Free port ${PORT} or configure a different PORT in your .env file.\n`);
          process.exit(1);
        } else {
          console.error('Server error:', err);
        }
      });
    });
  });
}

module.exports = app;
