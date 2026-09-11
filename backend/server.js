/**
 * JMT TRAVELS — Express Master V1 Backend API Server
 * Production-ready RESTful architecture with MongoDB Atlas/JSON persistence, JWT Auth, RBAC,
 * Security & Auth Hardening (Task #2): Password Policies, Email Verification, Reset Tokens,
 * Login Lockout, Session Revocation, IDOR Isolation, CORS Control, and MFA Architecture.
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
const chatTools = require('./services/chatTools');
const i18nService = require('./services/i18n');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const AUTH_SECRET = process.env.AUTH_SECRET || 'local-development-jmt-jwt-secret-key';

// -------------------------------------------------------------
// HELMET & SECURITY HEADERS (Task #2 Section 15)
// -------------------------------------------------------------
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false, // Preserves inline styles for current SPA setup
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: { action: 'sameorigin' },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Environment-driven CORS configuration (Task #2 Section 14)
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://127.0.0.1:3000'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation: Origin not allowed.'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend/public')));

// -------------------------------------------------------------
// RATE LIMITING (Task #2 Section 9)
// -------------------------------------------------------------
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts. Please wait 15 minutes.' } }
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many account registrations. Please wait 15 minutes.' } }
});

const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many submissions. Please wait 15 minutes.' } }
});

app.use('/api/', globalLimiter);

// -------------------------------------------------------------
// SENSITIVE DATA EXPOSURE PREVENTION (Task #2 Section 18)
// -------------------------------------------------------------
function sanitizeUser(user) {
  if (!user) return null;
  const obj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete obj.passwordHash;
  delete obj.verificationToken;
  delete obj.verificationTokenExpires;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  delete obj.mfaSecret;
  delete obj.__v;
  return obj;
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

// Multer Storage Setup for Private Passport/Identity Documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, db.PRIVATE_UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `doc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WEBP, and PDF documents are allowed.'));
    }
  }
});

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
      priceMinor: 189000,
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
      priceMinor: 129000,
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
      priceMinor: 249000,
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
      priceMinor: 45000,
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
      priceMinor: 55000,
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
      status: 'ACTIVE',
      verified: true
    });
    console.log(`[Seed] Created admin account: ${adminEmail}`);
  }
}

// -------------------------------------------------------------
// JWT & AUTHENTICATION MIDDLEWARE (Task #2 Section 6 & 7)
// -------------------------------------------------------------
function generateToken(user) {
  // Payload contains ONLY safe identifiers: sub, role, email. NO passwords or secrets!
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
        req.user = { id: 'admin-key-user', role: 'ADMIN', name: 'Staff Access Key', status: 'ACTIVE' };
        return next();
      }
    }

    if (!token) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    const payload = jwt.verify(token, AUTH_SECRET);
    const user = await db.users.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User session invalid.' } });
    }

    // Check Account Status (Task #2 Section 20)
    if (user.status === 'SUSPENDED' || user.status === 'DISABLED') {
      return res.status(403).json({ success: false, error: { code: 'ACCOUNT_SUSPENDED', message: 'Account is suspended or disabled.' } });
    }

    // Check Token Revocation / Session Invalidation (Task #2 Section 7)
    if (user.tokenInvalidatedBefore) {
      const tokenIat = payload.iat || 0;
      const revokedTime = Math.floor(new Date(user.tokenInvalidatedBefore).getTime() / 1000);
      if (tokenIat < revokedTime) {
        return res.status(401).json({ success: false, error: { code: 'TOKEN_REVOKED', message: 'Token has been revoked. Please sign in again.' } });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Session expired or invalid token.' } });
  }
}

async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.get('authorization') || '';
    const cookieHeader = req.get('cookie') || '';
    let token = '';

    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (cookieHeader.includes('jmt_session=')) {
      token = decodeURIComponent(cookieHeader.split('jmt_session=')[1].split(';')[0]);
    }

    if (token) {
      const payload = jwt.verify(token, AUTH_SECRET);
      const user = await db.users.findById(payload.sub);
      if (user && user.status !== 'SUSPENDED' && user.status !== 'DISABLED') {
        req.user = user;
      }
    }
  } catch (err) {
    // Ignore invalid optional token
  }
  next();
}

function i18nMiddleware(req, res, next) {
  // Locale Priority Selection (PDF #7 Section 3)
  // 1. Explicit request parameter / header (?lang=ar, ?locale=ar, X-App-Locale: ar)
  // 2. Authenticated customer profile preference (req.user?.preferredLanguage)
  // 3. Browser Accept-Language header
  // 4. Application default ('en')
  let requestedLocale = req.query.lang || req.query.locale || req.get('x-app-locale');

  if (!requestedLocale && req.user?.preferredLanguage) {
    requestedLocale = req.user.preferredLanguage;
  }

  if (!requestedLocale) {
    const acceptLang = req.get('accept-language') || '';
    if (acceptLang.toLowerCase().includes('ar')) {
      requestedLocale = 'ar';
    } else if (acceptLang.toLowerCase().includes('en')) {
      requestedLocale = 'en';
    }
  }

  if (requestedLocale && !i18nService.isSupportedLocale(requestedLocale)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_LOCALE', message: 'Unsupported locale requested. Supported locales are: en, ar.' }
    });
  }

  req.locale = i18nService.normalizeLocale(requestedLocale);

  let requestedCurrency = req.query.currency || req.get('x-app-currency');
  if (!requestedCurrency && req.user?.preferredCurrency) {
    requestedCurrency = req.user.preferredCurrency;
  }

  if (requestedCurrency && !i18nService.isSupportedCurrency(requestedCurrency)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_CURRENCY', message: 'Unsupported currency requested. Supported currencies are: OMR, AED, SAR, INR, USD.' }
    });
  }

  req.currency = i18nService.normalizeCurrency(requestedCurrency);
  req.isRTL = i18nService.isRTL(req.locale);
  req.dir = i18nService.getDirection(req.locale);

  next();
}

app.use('/api/', optionalAuth, i18nMiddleware);

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You lack permission to access this administrative resource.' } });
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

// --- 1. HEALTH & READINESS CHECKS ---
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'JMT TRAVELS V1 API', timestamp: new Date().toISOString() }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'JMT TRAVELS API' }));

app.get('/ready', (req, res) => {
  const status = db.getStatus();
  if (status.isProduction && !status.isConnected) {
    return res.status(503).json({
      ready: false,
      error: 'Database service unavailable. Required MongoDB connection is offline.',
      timestamp: new Date().toISOString()
    });
  }
  res.json({
    ready: true,
    storage: status.isConnected ? 'MongoDB Atlas' : 'Persistent JSON',
    mode: status.mode,
    timestamp: new Date().toISOString()
  });
});

// --- 2. AUTHENTICATION & USER MANAGEMENT ---

// CUSTOMER REGISTRATION & MASS ASSIGNMENT PROTECTION (Task #2 Section 4, 10, 16, 17)
app.post('/api/auth/register', registerLimiter, async (req, res) => {
  try {
    const { name, email, password, phone } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();

    // Password Policy Validation (Task #2 Section 3)
    if (!cleanName || cleanName.length < 2 || cleanName.length > 80) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid full name (2–80 characters) is required.' } });
    }
    if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.length > 120) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid email address is required.' } });
    }
    if (!password || password.length < 8 || password.length > 128) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Password must be between 8 and 128 characters.' } });
    }

    const existing = await db.users.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, error: { code: 'USER_EXISTS', message: 'An account with this email already exists.' } });
    }

    // Generate Verification Token (Task #2 Section 4)
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = hashToken(rawVerificationToken);

    const passwordHash = bcrypt.hashSync(password, 12);

    // MASS ASSIGNMENT PROTECTION: Hardcode role to CUSTOMER, ignore client role/isAdmin claims!
    const user = await db.users.create({
      name: cleanName,
      email: cleanEmail,
      phone: phone || '',
      passwordHash,
      role: 'CUSTOMER',
      status: 'UNVERIFIED',
      verified: false,
      verificationToken: hashedVerificationToken,
      verificationTokenExpires: new Date(Date.now() + 24 * 3600 * 1000) // 24 hours
    });

    const token = generateToken(user);
    await notificationService.dispatchEvent('EMAIL_VERIFICATION', { user, token: rawVerificationToken });

    res.status(201).json({
      success: true,
      token,
      user: sanitizeUser(user),
      message: 'Account created successfully. A verification email has been sent.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// EMAIL VERIFICATION ENDPOINT (Task #2 Section 4)
app.post('/api/auth/verify-email', authLimiter, async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Verification token is required.' } });
    }

    const hashed = hashToken(token);
    const user = await db.users.findOne({ verificationToken: hashed });

    if (!user || !user.verificationTokenExpires || new Date(user.verificationTokenExpires) < new Date()) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired verification token.' } });
    }

    await db.users.update(user.id, {
      verified: true,
      status: 'ACTIVE',
      verificationToken: null,
      verificationTokenExpires: null
    });

    await logAudit({ user }, 'EMAIL_VERIFIED', 'USER', user.id);
    res.json({ success: true, message: 'Email address verified successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// RESEND VERIFICATION EMAIL (Task #2 Section 4)
app.post('/api/auth/resend-verification', authLimiter, async (req, res) => {
  const { email } = req.body || {};
  const cleanEmail = (email || '').trim().toLowerCase();

  // Generic response to avoid leaking email existence
  const genericResponse = { success: true, message: 'If an unverified account exists with that email, a new verification token has been dispatched.' };

  if (!cleanEmail) return res.json(genericResponse);

  const user = await db.users.findOne({ email: cleanEmail });
  if (user && !user.verified) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    await db.users.update(user.id, {
      verificationToken: hashToken(rawToken),
      verificationTokenExpires: new Date(Date.now() + 24 * 3600 * 1000)
    });
    await notificationService.dispatchEvent('EMAIL_VERIFICATION', { user, token: rawToken });
  }

  res.json(genericResponse);
});

// CUSTOMER & STAFF LOGIN WITH LOCKOUT PROTECTION (Task #2 Section 8)
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    const genericAuthError = { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } };

    if (!cleanEmail || !password) return res.status(401).json(genericAuthError);

    const user = await db.users.findOne({ email: cleanEmail });
    if (!user || !user.passwordHash) {
      return res.status(401).json(genericAuthError);
    }

    // Check Account Lockout (Task #2 Section 8)
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      await logAudit(null, 'BLOCKED_LOCKED_LOGIN_ATTEMPT', 'USER', user.id);
      return res.status(401).json(genericAuthError);
    }

    // Check Account Status (Task #2 Section 20)
    if (user.status === 'SUSPENDED' || user.status === 'DISABLED') {
      return res.status(403).json({ success: false, error: { code: 'ACCOUNT_SUSPENDED', message: 'Account is suspended or disabled.' } });
    }

    // Password Check
    const match = bcrypt.compareSync(password, user.passwordHash);
    if (!match) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      let lockUntil = null;
      if (attempts >= 5) {
        lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min temporary lockout
        await logAudit(null, 'ACCOUNT_LOCKED_TEMPORARY', 'USER', user.id, { attempts });
      }
      await db.users.update(user.id, { failedLoginAttempts: attempts, lockUntil });
      await logAudit(null, 'FAILED_LOGIN_ATTEMPT', 'USER', user.id);
      return res.status(401).json(genericAuthError);
    }

    // Successful Login: Reset Lockout Counters
    await db.users.update(user.id, { failedLoginAttempts: 0, lockUntil: null });
    await logAudit({ user }, user.role.includes('ADMIN') ? 'ADMIN_LOGIN' : 'USER_LOGIN', 'USER', user.id);

    const token = generateToken(user);
    res.json({
      success: true,
      token,
      user: sanitizeUser(user)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// FORGOT PASSWORD REQUEST (Task #2 Section 5)
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body || {};
  const cleanEmail = (email || '').trim().toLowerCase();

  // GENERIC RESPONSE: NEVER REVEAL ACCOUNT EXISTENCE!
  const genericMsg = { success: true, message: 'If an account with that email exists, password reset instructions have been sent.' };
  if (!cleanEmail) return res.json(genericMsg);

  const user = await db.users.findOne({ email: cleanEmail });
  if (user) {
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = hashToken(rawResetToken);

    await db.users.update(user.id, {
      resetPasswordToken: hashedResetToken,
      resetPasswordExpires: new Date(Date.now() + 3600 * 1000) // 1 hour
    });

    await logAudit(null, 'PASSWORD_RESET_REQUEST', 'USER', user.id);
    await notificationService.dispatchEvent('PASSWORD_RESET', { user, token: rawResetToken });
  }

  res.json(genericMsg);
});

// RESET PASSWORD EXECUTION (Task #2 Section 5)
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body || {};

    if (!token || !newPassword || newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid password (min 8 characters) is required.' } });
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Passwords do not match.' } });
    }

    const hashed = hashToken(token);
    const user = await db.users.findOne({ resetPasswordToken: hashed });

    if (!user || !user.resetPasswordExpires || new Date(user.resetPasswordExpires) < new Date()) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired password reset token.' } });
    }

    const newHash = bcrypt.hashSync(newPassword, 12);
    await db.users.update(user.id, {
      passwordHash: newHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      passwordChangedAt: new Date(),
      tokenInvalidatedBefore: new Date(), // Revokes all active sessions/JWTs!
      failedLoginAttempts: 0,
      lockUntil: null
    });

    await logAudit({ user }, 'PASSWORD_RESET', 'USER', user.id);
    res.json({ success: true, message: 'Password reset successfully. Please sign in with your new password.' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// LOGOUT & SESSION REVOCATION (Task #2 Section 7)
app.post('/api/auth/logout', authenticate, async (req, res) => {
  try {
    // Revoke token by updating user tokenInvalidatedBefore timestamp
    await db.users.update(req.user.id, { tokenInvalidatedBefore: new Date() });
    await logAudit(req, 'USER_LOGOUT', 'USER', req.user.id);
    res.json({ success: true, message: 'Signed out successfully. Active sessions revoked.' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET CURRENT USER PROFILE
app.get('/api/auth/me', authenticate, async (req, res) => {
  res.json({ success: true, user: sanitizeUser(req.user) });
});

// UPDATE USER PREFERENCES (Language & Currency - Task #7)
app.patch('/api/users/preferences', authenticate, async (req, res) => {
  try {
    const { preferredLanguage, preferredCurrency } = req.body || {};
    const updates = {};

    if (preferredLanguage) {
      if (!i18nService.isSupportedLocale(preferredLanguage)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_LOCALE', message: 'Unsupported locale. Allowed: en, ar.' }
        });
      }
      updates.preferredLanguage = preferredLanguage;
    }

    if (preferredCurrency) {
      if (!i18nService.isSupportedCurrency(preferredCurrency)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_CURRENCY', message: 'Unsupported currency. Allowed: OMR, AED, SAR, INR, USD.' }
        });
      }
      updates.preferredCurrency = preferredCurrency.toUpperCase();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'At least one preference (preferredLanguage or preferredCurrency) must be specified.' }
      });
    }

    const updatedUser = await db.users.update(req.user.id, updates);
    await logAudit(req, 'UPDATE_PREFERENCES', 'USER', req.user.id, updates);

    res.json({
      success: true,
      user: sanitizeUser(updatedUser),
      message: 'User preferences updated successfully.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// --- i18n & MULTI-CURRENCY ENDPOINTS (Task #7) ---
app.get('/api/i18n/translations', (req, res) => {
  const translations = i18nService.getTranslations(req.locale);
  res.json({
    success: true,
    data: translations
  });
});

app.get('/api/i18n/currencies', (req, res) => {
  res.json({
    success: true,
    data: i18nService.getCurrencyConfigs()
  });
});

app.post('/api/i18n/format-currency', (req, res) => {
  const { amountMinor, currency, locale } = req.body || {};
  
  if (typeof amountMinor !== 'number') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'amountMinor (integer) is required.' }
    });
  }

  const targetCurrency = currency ? currency.toUpperCase() : req.currency;
  const targetLocale = locale ? locale.toLowerCase() : req.locale;

  if (!i18nService.isSupportedCurrency(targetCurrency)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_CURRENCY', message: 'Unsupported currency requested.' }
    });
  }

  if (!i18nService.isSupportedLocale(targetLocale)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_LOCALE', message: 'Unsupported locale requested.' }
    });
  }

  const formatted = i18nService.formatCurrency(amountMinor, targetCurrency, targetLocale);

  res.json({
    success: true,
    amountMinor,
    currency: targetCurrency,
    locale: targetLocale,
    formatted
  });
});

app.get('/api/i18n/fx-rates', (req, res) => {
  const { base = 'OMR', quote = 'OMR', amountMinor = 1000 } = req.query;

  if (!i18nService.isSupportedCurrency(base) || !i18nService.isSupportedCurrency(quote)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_CURRENCY', message: 'Unsupported base or quote currency.' }
    });
  }

  const numericAmount = parseInt(amountMinor, 10) || 1000;
  const conversion = i18nService.fxProvider.convert(numericAmount, base, quote);

  res.json({
    success: true,
    status: 'PREPARED_ONLY',
    notice: 'Display estimates only. Payment amounts remain server-authoritative in base currency.',
    data: conversion
  });
});

// MFA VERIFICATION ARCHITECTURE INTERFACE (PREPARED ONLY - Task #2 Section 13)
app.post('/api/auth/mfa/verify', authLimiter, async (req, res) => {
  const { code } = req.body || {};
  if (!code) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'MFA verification code is required.' } });
  }
  // Architecture interface prepared for TOTP/WebAuthn
  res.status(501).json({ success: false, error: { code: 'MFA_NOT_CONFIGURED', message: 'MFA verification interface is prepared but TOTP provider is unconfigured.' } });
});

// ADMIN ROLE MANAGEMENT (SUPER_ADMIN ONLY - Task #2 Section 17)
app.patch('/api/users/:id/role', authenticate, authorize('SUPER_ADMIN'), async (req, res) => {
  const { role } = req.body || {};
  const validRoles = ['CUSTOMER', 'STAFF', 'ADMIN', 'SUPER_ADMIN'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid role.' } });
  }

  const user = await db.users.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } });

  const updated = await db.users.update(user.id, { role });
  await logAudit(req, `Role updated to ${role}`, 'USER', user.id);
  res.json({ success: true, user: sanitizeUser(updated) });
});

// Require Visa, Tourism & Storage Services
const visaService = require('./services/visa');
const tourismService = require('./services/tourism');
const { storageService, FileSecurityService } = require('./services/storage');

// Memory storage for file upload processing & signature verification
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB Limit
});

// --- 3. VISA SERVICES & APPLICATIONS (IDOR & STATE TRANSITION MATRIX ENFORCED) ---
app.get('/api/visa/services', async (req, res) => {
  const services = await db.visaServices.find({ published: true });
  res.json({ success: true, services });
});

app.get('/api/visa/services/:slug', async (req, res) => {
  const service = await db.visaServices.findOne({ slug: req.params.slug });
  if (!service) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Visa service not found.' } });
  res.json({ success: true, service });
});

app.post('/api/visa/applications', optionalAuth, submissionLimiter, async (req, res) => {
  try {
    const { website } = req.body || {};
    if (website) return res.json({ success: true, reference: 'JMT-V-SPAM' });

    const appRecord = await visaService.createApplication(req.body, req.user);
    res.status(201).json({
      success: true,
      reference: appRecord.applicationNumber,
      status: appRecord.status,
      application: visaService.sanitizeApplication(appRecord, req.user ? req.user.role : 'GUEST'),
      message: appRecord.status === 'DRAFT' ? 'Draft application saved.' : 'Your visa application has been received.'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.message } });
  }
});

app.get('/api/visa/applications', authenticate, async (req, res) => {
  const isStaff = ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
  const filter = isStaff ? {} : { userId: req.user.id };
  const rawApps = await db.visaApplications.find(filter);
  const applications = rawApps.map(a => visaService.sanitizeApplication(a, req.user.role));
  res.json({ success: true, applications });
});

// IDOR RESTRICTED APPLICATION DETAIL (Task #3 Section 15 & 22)
app.get('/api/visa/applications/:id', authenticate, async (req, res) => {
  const appRecord = await db.visaApplications.findById(req.params.id) || await db.visaApplications.findOne({ applicationNumber: req.params.id });
  if (!appRecord) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found.' } });

  const isStaff = ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
  if (!isStaff && appRecord.userId !== req.user.id) {
    await logAudit(req, 'SUSPICIOUS_IDOR_ATTEMPT', 'VISA_APPLICATION', req.params.id);
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied: You do not own this application.' } });
  }
  res.json({ success: true, application: visaService.sanitizeApplication(appRecord, req.user.role) });
});

// SERVER-CONTROLLED STATE TRANSITION (Task #3 Section 5)
app.patch('/api/visa/applications/:id/status', authenticate, async (req, res) => {
  try {
    const { status, note } = req.body || {};
    const updated = await visaService.transitionStatus(req.params.id, status, req.user, note);
    await logAudit(req, `Changed visa status to ${status}`, 'VISA_APPLICATION', req.params.id);
    res.json({ success: true, application: visaService.sanitizeApplication(updated, req.user.role) });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'TRANSITION_ERROR', message: err.message } });
  }
});

// REQUEST ADDITIONAL DOCUMENTS (STAFF/ADMIN ONLY - Task #3 Section 19)
app.post('/api/visa/applications/:id/request-documents', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { documentType, instruction } = req.body || {};
    if (!documentType) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Document type is required.' } });
    
    const requestItem = await visaService.requestAdditionalDocuments(req.params.id, documentType, instruction, req.user);
    await logAudit(req, `Requested additional document: ${documentType}`, 'VISA_APPLICATION', req.params.id);
    res.status(201).json({ success: true, request: requestItem });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'REQUEST_ERROR', message: err.message } });
  }
});

// --- 4. SECURE PRIVATE FILE UPLOADS, REVIEW & DOWNLOADS (Task #3 Section 8–16) ---
app.post('/api/documents/upload', authenticate, memoryUpload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'Please select a document file to upload.' } });
    }

    const { applicationId, documentType } = req.body || {};
    if (!applicationId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Application ID is required for document upload.' } });
    }

    const docRecord = await visaService.uploadDocument(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      applicationId,
      documentType,
      req.user
    );

    await logAudit(req, `Uploaded document: ${docRecord.documentType}`, 'VISA_DOCUMENT', docRecord.id);
    res.status(201).json({ success: true, document: docRecord });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'UPLOAD_ERROR', message: err.message } });
  }
});

// DOCUMENT REVIEW (STAFF/ADMIN ONLY - Task #3 Section 18)
app.post('/api/documents/:id/review', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { status, reviewNote } = req.body || {};
    const updated = await visaService.reviewDocument(req.params.id, status, reviewNote, req.user);
    await logAudit(req, `Reviewed document status to ${status}`, 'VISA_DOCUMENT', req.params.id);
    res.json({ success: true, document: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'REVIEW_ERROR', message: err.message } });
  }
});

// IDOR RESTRICTED PRIVATE DOCUMENT DOWNLOAD STREAMING (Task #3 Section 16)
app.get('/api/documents/:id/download', authenticate, async (req, res) => {
  try {
    const docRecord = await db.visaDocuments.findById(req.params.id) || await db.visaDocuments.findOne({ documentId: req.params.id });
    if (!docRecord) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document record not found.' } });

    const appRecord = await db.visaApplications.findById(docRecord.applicationId) || await db.visaApplications.findOne({ applicationNumber: docRecord.applicationId });

    const isStaff = ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    const isOwner = docRecord.uploadedBy === req.user.id || (appRecord && appRecord.userId === req.user.id);

    if (!isStaff && !isOwner) {
      await logAudit(req, 'SUSPICIOUS_IDOR_DOCUMENT_ATTEMPT', 'VISA_DOCUMENT', req.params.id);
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied: You do not own this document.' } });
    }

    if (!storageService.exists(docRecord.storageKey)) {
      return res.status(404).json({ success: false, error: { code: 'FILE_MISSING', message: 'File missing from storage.' } });
    }

    await logAudit(req, 'DOCUMENT_ACCESSED', 'VISA_DOCUMENT', docRecord.id);

    res.setHeader('Content-Type', docRecord.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${docRecord.displayFilename || docRecord.originalFilename}"`);
    
    // Stream file contents via StorageService (Hides physical filesystem path)
    const stream = storageService.downloadStream(docRecord.storageKey);
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// --- 5. TOURISM CATALOGUE & BOOKINGS ---
// --- 5. TOURISM CATALOGUE & BOOKINGS (TASK #4 ENHANCED) ---

// DESTINATIONS & CATEGORIES
app.get('/api/tourism/destinations', async (req, res) => {
  const destinations = await db.destinations.find({ active: true });
  res.json({ success: true, destinations });
});

app.get('/api/tourism/categories', async (req, res) => {
  const categories = await db.tourCategories.find({ active: true });
  res.json({ success: true, categories });
});

// TOUR PACKAGES LISTING (FILTERING, SEARCH, WHITELISTED SORT, PAGINATION)
app.get('/api/tourism/packages', optionalAuth, async (req, res) => {
  try {
    const userRole = req.user ? req.user.role : 'GUEST';
    const result = await tourismService.listPackages({ ...req.query, userRole });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// LEGACY PACKAGES ENDPOINT (BACKWARD COMPATIBILITY)
app.get('/api/packages', async (req, res) => {
  const result = await tourismService.listPackages({ userRole: 'GUEST', limit: 50 });
  const legacy = result.packages.map(p => ({ ...p, price: p.priceMinor ? p.priceMinor / 1000 : p.price || 189, rating: p.rating || 4.8 }));
  res.json({ success: true, packages: legacy });
});

// TOUR PACKAGE DETAILS BY SLUG/ID
app.get('/api/tourism/packages/:slug', optionalAuth, async (req, res) => {
  try {
    const userRole = req.user ? req.user.role : 'GUEST';
    const pkg = await tourismService.getPackage(req.params.slug, userRole);
    res.json({ success: true, package: pkg });
  } catch (err) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message } });
  }
});

// CREATE TOUR PACKAGE (STAFF/ADMIN ONLY)
app.post('/api/tourism/packages', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const pkg = await tourismService.createPackage(req.body, req.user);
    await logAudit(req, `Created tour package: ${pkg.title}`, 'TOUR_PACKAGE', pkg.id);
    res.status(201).json({ success: true, package: pkg });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.message } });
  }
});

// UPDATE TOUR PACKAGE (STAFF/ADMIN ONLY)
app.patch('/api/tourism/packages/:id', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const updated = await tourismService.updatePackage(req.params.id, req.body, req.user);
    await logAudit(req, `Updated tour package: ${updated.title}`, 'TOUR_PACKAGE', updated.id);
    res.json({ success: true, package: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'UPDATE_ERROR', message: err.message } });
  }
});

// CREATE TOUR BOOKING (SERVER PRICING, CAPACITY CHECK, CONCURRENCY & IDEMPOTENCY)
app.post('/api/tourism/bookings', optionalAuth, submissionLimiter, async (req, res) => {
  try {
    const { website } = req.body || {};
    if (website) return res.json({ success: true, reference: 'JMT-B-SPAM' });

    const result = await tourismService.createBooking(req.body, req.user);
    const booking = result.booking;

    if (result.isDuplicate) {
      return res.status(200).json({
        success: true,
        reference: booking.bookingNumber,
        status: booking.status,
        amount: booking.amount,
        currency: booking.currency,
        message: 'Duplicate request detected. Returned existing booking.',
        isDuplicate: true,
        booking
      });
    }

    await logAudit(req, `Created tour booking ${booking.bookingNumber}`, 'TOUR_BOOKING', booking.id || booking.bookingNumber);

    res.status(201).json({
      success: true,
      reference: booking.bookingNumber,
      status: booking.status,
      amount: booking.amount,
      currency: booking.currency,
      message: 'Booking request created successfully.',
      booking
    });
  } catch (err) {
    const status = err.message.includes('Insufficient Capacity') || err.message.includes('Validation Error') || err.message.includes('Booking Denied') ? 400 : 500;
    res.status(status).json({ success: false, error: { code: status === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR', message: err.message } });
  }
});

// LEGACY BOOKINGS ENDPOINT (BACKWARD COMPATIBILITY)
app.post('/api/bookings', submissionLimiter, async (req, res) => {
  try {
    const result = await tourismService.createBooking(req.body, req.user);
    const booking = result.booking;
    res.status(201).json({
      success: true,
      reference: booking.bookingNumber,
      status: booking.status,
      amount: booking.amount,
      currency: booking.currency,
      message: 'Reservation requested.'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.message } });
  }
});

// LIST TOUR BOOKINGS (IDOR ISOLATED)
app.get('/api/tourism/bookings', authenticate, async (req, res) => {
  const isStaff = ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
  const filter = isStaff ? {} : { userId: req.user.id };
  const rawBookings = await db.tourBookings.find(filter);
  const bookings = rawBookings.map(b => tourismService.sanitizeBooking(b, req.user.role));
  res.json({ success: true, bookings });
});

// IDOR RESTRICTED TOUR BOOKING DETAIL VIEW
app.get('/api/tourism/bookings/:id', authenticate, async (req, res) => {
  const booking = await db.tourBookings.findById(req.params.id) || await db.tourBookings.findOne({ bookingNumber: req.params.id });
  if (!booking) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found.' } });

  const isStaff = ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
  if (!isStaff && booking.userId !== req.user.id) {
    await logAudit(req, 'SUSPICIOUS_IDOR_BOOKING_ATTEMPT', 'TOUR_BOOKING', req.params.id);
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied: You do not own this booking.' } });
  }

  const travellers = await db.bookingTravellers.find({ bookingId: booking.id });
  const sanitized = tourismService.sanitizeBooking(booking, req.user.role);

  res.json({ success: true, booking: sanitized, travellers });
});

// SERVER-CONTROLLED BOOKING STATE TRANSITION
app.patch('/api/tourism/bookings/:id/status', authenticate, async (req, res) => {
  try {
    const { status, note } = req.body || {};
    const updated = await tourismService.transitionBookingStatus(req.params.id, status, req.user, note);
    await logAudit(req, `Changed booking status to ${status}`, 'TOUR_BOOKING', req.params.id);
    res.json({ success: true, booking: tourismService.sanitizeBooking(updated, req.user.role) });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'TRANSITION_ERROR', message: err.message } });
  }
});

// BOOKING CANCELLATION & CAPACITY RELEASE
app.post('/api/tourism/bookings/:id/cancel', authenticate, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const updated = await tourismService.cancelBooking(req.params.id, req.user, reason);
    await logAudit(req, 'Cancelled tour booking', 'TOUR_BOOKING', req.params.id);
    res.json({ success: true, booking: tourismService.sanitizeBooking(updated, req.user.role) });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'CANCELLATION_ERROR', message: err.message } });
  }
});

// REFUND REQUEST WORKFLOW (STAFF/ADMIN ONLY)
app.post('/api/tourism/bookings/:id/refund', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { reason, amount } = req.body || {};
    const refundRecord = await tourismService.requestRefund(req.params.id, req.user, reason, amount);
    await logAudit(req, `Requested refund of ${refundRecord.amount} OMR`, 'REFUND', refundRecord.id);
    res.status(201).json({ success: true, refund: refundRecord });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'REFUND_ERROR', message: err.message } });
  }
});

// --- 6. PAYMENTS & WEBHOOKS (TASK #5 ENHANCED) ---

// CREATE PAYMENT ORDER (AUTHORITATIVE AMOUNT, IDOR PROTECTION, IDEMPOTENCY)
app.post('/api/payments/create-order', authenticate, submissionLimiter, async (req, res) => {
  try {
    const { bookingId, visaApplicationId, idempotencyKey } = req.body || {};
    const result = await paymentService.createPaymentOrder({
      userId: req.user.id,
      bookingId,
      visaApplicationId,
      idempotencyKey,
      actorUser: req.user
    });

    await logAudit(req, `Created payment order ${result.paymentNumber}`, 'PAYMENT', result.payment ? result.payment.id : result.paymentNumber);

    res.status(result.isDuplicate ? 200 : 201).json(result);
  } catch (err) {
    const isForbidden = err.message.includes('Permission Denied');
    const isValidation = err.message.includes('Payment Error') || err.message.includes('Validation Error');
    const status = isForbidden ? 403 : (isValidation ? 400 : 500);
    res.status(status).json({ success: false, error: { code: isForbidden ? 'FORBIDDEN' : (isValidation ? 'VALIDATION_ERROR' : 'SERVER_ERROR'), message: err.message } });
  }
});

// GET PAYMENT DETAIL (IDOR RESTRICTED)
app.get('/api/payments/:id', authenticate, async (req, res) => {
  try {
    const payment = await db.payments.findById(req.params.id) || await db.payments.findOne({ paymentNumber: req.params.id });
    if (!payment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment record not found.' } });

    const isStaff = ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    if (!isStaff && payment.userId !== req.user.id) {
      await logAudit(req, 'SUSPICIOUS_IDOR_PAYMENT_ATTEMPT', 'PAYMENT', req.params.id);
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied: You do not own this payment record.' } });
    }

    res.json({ success: true, payment: paymentService.sanitizePayment(payment, req.user.role) });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// SECURE PROVIDER WEBHOOK LISTENER (SIGNATURE VERIFICATION, REPLAY PROTECTION, AMOUNT RECONCILIATION)
app.post('/api/payments/webhook', async (req, res) => {
  try {
    const signature = req.get('x-signature') || req.get('x-paytabs-signature') || req.get('x-thawani-signature') || req.get('x-razorpay-signature') || 'sandbox';
    const rawBody = JSON.stringify(req.body);
    const result = await paymentService.handleWebhook(rawBody, signature, req.body);
    res.json(result);
  } catch (err) {
    const isSecurity = err.message.includes('Security Violation') || err.message.includes('signature');
    const isMismatch = err.message.includes('mismatch');
    const status = isSecurity ? 401 : (isMismatch ? 400 : 400);
    res.status(status).json({ success: false, error: { code: isSecurity ? 'UNAUTHORIZED_SIGNATURE' : 'WEBHOOK_FAILED', message: err.message } });
  }
});

// PROCESS REFUND WORKFLOW (STAFF/ADMIN ONLY)
app.post('/api/payments/:id/refund', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { amount, reason, idempotencyKey } = req.body || {};
    const result = await paymentService.processRefund({
      paymentId: req.params.id,
      amount,
      reason,
      idempotencyKey,
      actorUser: req.user
    });

    await logAudit(req, `Processed refund for payment ${req.params.id}`, 'REFUND', result.refund ? result.refund.id : req.params.id);
    res.status(result.isDuplicate ? 200 : 201).json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'REFUND_ERROR', message: err.message } });
  }
});

// --- 6.5 IN-APP NOTIFICATIONS (TASK #6 ENHANCED) ---

// LIST IN-APP NOTIFICATIONS (IDOR ISOLATED, PAGINATED)
app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const result = await notificationService.listInAppNotifications({
      userId: req.user.id,
      page: req.query.page,
      limit: req.query.limit,
      unreadOnly: req.query.unread
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// MARK INDIVIDUAL NOTIFICATION AS READ (IDOR ISOLATED)
app.patch('/api/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const updated = await notificationService.markAsRead(req.params.id, req.user.id);
    res.json({ success: true, notification: updated });
  } catch (err) {
    const isForbidden = err.message.includes('Permission Denied');
    res.status(isForbidden ? 403 : 400).json({ success: false, error: { code: isForbidden ? 'FORBIDDEN' : 'VALIDATION_ERROR', message: err.message } });
  }
});

// MARK ALL NOTIFICATIONS AS READ
app.patch('/api/notifications/read-all', authenticate, async (req, res) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    res.json({ success: true, message: 'All in-app notifications marked as read.', count: result.count });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
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

// --- 10. TASK #8 — ADMIN & OPERATIONS SYSTEM ---

// Helper: Sanitize search regex terms to prevent Regex / Injection vulnerabilities
function escapeRegex(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// 10.1 OPERATIONAL DASHBOARD / OVERVIEW METRICS API
app.get(['/api/admin/dashboard', '/api/admin/overview'], authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const users = await db.users.find();
    const visas = await db.visaApplications.find();
    const packages = await db.tourPackages.find();
    const destinations = await db.destinations.find();
    const categories = await db.tourCategories.find();
    const bookings = await db.tourBookings.find();
    const payments = await db.payments.find();
    const refunds = await db.refunds.find();
    const tickets = await db.supportTickets.find();
    const inquiries = await db.contactInquiries.find();
    const notifications = await db.notifications.find();

    const metrics = {
      customers: {
        total: users.length,
        active: users.filter(u => u.status === 'ACTIVE').length,
        unverified: users.filter(u => u.status === 'UNVERIFIED').length,
        suspended: users.filter(u => u.status === 'SUSPENDED').length,
        disabled: users.filter(u => u.status === 'DISABLED').length
      },
      visa: {
        total: visas.length,
        draft: visas.filter(v => v.status === 'DRAFT').length,
        submitted: visas.filter(v => v.status === 'SUBMITTED').length,
        underReview: visas.filter(v => ['DOCUMENT_REVIEW', 'UNDER_REVIEW'].includes(v.status)).length,
        additionalDocsRequired: visas.filter(v => v.status === 'ADDITIONAL_DOCUMENTS_REQUIRED').length,
        processing: visas.filter(v => v.status === 'PROCESSING').length,
        approved: visas.filter(v => v.status === 'APPROVED').length,
        rejected: visas.filter(v => v.status === 'REJECTED').length,
        cancelled: visas.filter(v => v.status === 'CANCELLED').length
      },
      tourism: {
        totalPackages: packages.length,
        publishedPackages: packages.filter(p => p.published).length,
        activePackages: packages.filter(p => p.active !== false).length,
        destinations: destinations.length,
        categories: categories.length
      },
      bookings: {
        total: bookings.length,
        pending: bookings.filter(b => b.status === 'PENDING_PAYMENT').length,
        confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
        cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
        completed: bookings.filter(b => b.status === 'COMPLETED').length
      },
      payments: {
        total: payments.length,
        initiated: payments.filter(p => p.status === 'INITIATED').length,
        pending: payments.filter(p => p.status === 'PENDING').length,
        paid: payments.filter(p => p.status === 'PAID').length,
        failed: payments.filter(p => p.status === 'FAILED').length,
        refunded: payments.filter(p => p.status === 'REFUNDED').length,
        partiallyRefunded: payments.filter(p => p.status === 'PARTIALLY_REFUNDED').length
      },
      refunds: {
        total: refunds.length,
        completed: refunds.filter(r => r.status === 'COMPLETED').length
      },
      support: {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'OPEN').length,
        pending: tickets.filter(t => t.status === 'IN_PROGRESS').length,
        recentlyUpdated: tickets.slice(-5)
      },
      contact: {
        total: inquiries.length,
        unresolved: inquiries.filter(c => !c.resolved).length
      },
      notifications: {
        total: notifications.length,
        failed: notifications.filter(n => n.status === 'FAILED').length,
        pending: notifications.filter(n => n.status === 'PENDING').length
      }
    };

    res.json({
      success: true,
      metrics,
      recentBookings: bookings.slice(-5).reverse(),
      recentVisas: visas.slice(-5).reverse()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 10.2 USER & CUSTOMER MANAGEMENT API
app.get('/api/admin/users', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const role = req.query.role;
    const status = req.query.status;
    const search = (req.query.search || '').trim();

    let allUsers = await db.users.find();

    if (role && ['CUSTOMER', 'STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      allUsers = allUsers.filter(u => u.role === role);
    }

    if (status && ['ACTIVE', 'UNVERIFIED', 'SUSPENDED', 'DISABLED'].includes(status)) {
      allUsers = allUsers.filter(u => u.status === status);
    }

    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      allUsers = allUsers.filter(u => rx.test(u.name) || rx.test(u.email) || rx.test(u.phone || ''));
    }

    const total = allUsers.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedUsers = allUsers.slice(startIndex, startIndex + limit).map(u => sanitizeUser(u));

    res.json({
      success: true,
      users: paginatedUsers,
      pagination: { total, page, limit, totalPages }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.get('/api/admin/users/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const user = await db.users.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } });

    const profile = await db.customerProfiles.findOne({ userId: user.id });
    const visas = await db.visaApplications.find({ userId: user.id });
    const bookings = await db.tourBookings.find({ userId: user.id });
    const payments = await db.payments.find({ userId: user.id });

    res.json({
      success: true,
      user: sanitizeUser(user),
      profile: profile || null,
      activitySummary: {
        visaCount: visas.length,
        bookingCount: bookings.length,
        paymentCount: payments.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.patch('/api/admin/users/:id/status', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { status, reason } = req.body || {};
    const validStatuses = ['ACTIVE', 'SUSPENDED', 'DISABLED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid status (ACTIVE, SUSPENDED, DISABLED) is required.' } });
    }

    const user = await db.users.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } });

    // Protect SUPER_ADMIN accounts from non-SUPER_ADMIN modifications
    if (user.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only SUPER_ADMIN can modify a SUPER_ADMIN account.' } });
    }

    const updates = { status };
    if (status === 'SUSPENDED' || status === 'DISABLED') {
      updates.tokenInvalidatedBefore = new Date(); // Revoke active sessions immediately
    }

    const updatedUser = await db.users.update(user.id, updates);
    await logAudit(req, `USER_STATUS_CHANGE_${status}`, 'USER', user.id, { reason });

    res.json({
      success: true,
      user: sanitizeUser(updatedUser),
      message: `User status changed to ${status}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 10.3 VISA OPERATIONS API (STAFF/ADMIN/SUPER_ADMIN)
app.get('/api/admin/visa-applications', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const status = req.query.status;
    const visaServiceId = req.query.visaServiceId;
    const search = (req.query.search || '').trim();

    let apps = await db.visaApplications.find();

    if (status) apps = apps.filter(a => a.status === status);
    if (visaServiceId) apps = apps.filter(a => a.visaServiceId === visaServiceId);
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      apps = apps.filter(a => rx.test(a.applicationNumber || '') || rx.test(a.fullName || '') || rx.test(a.email || ''));
    }

    const total = apps.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedApps = apps.slice(startIndex, startIndex + limit).map(a => visaService.sanitizeApplication(a, req.user.role));

    res.json({
      success: true,
      applications: paginatedApps,
      pagination: { total, page, limit, totalPages }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.post('/api/admin/visa-applications/:id/notes', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { note } = req.body || {};
    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Note text is required.' } });
    }

    const appRecord = await db.visaApplications.findById(req.params.id) || await db.visaApplications.findOne({ applicationNumber: req.params.id });
    if (!appRecord) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found.' } });

    const internalNotes = appRecord.internalNotes || [];
    internalNotes.push({
      authorId: req.user.id,
      authorName: req.user.name,
      authorRole: req.user.role,
      note: note.trim(),
      timestamp: new Date().toISOString()
    });

    const updated = await db.visaApplications.update(appRecord.id, { internalNotes });
    await logAudit(req, 'ADD_VISA_INTERNAL_NOTE', 'VISA_APPLICATION', appRecord.id);

    res.json({ success: true, internalNotes: updated.internalNotes });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 10.4 DOCUMENT OPERATIONS API
app.get('/api/admin/documents', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const status = req.query.status;

    let docs = await db.visaDocuments.find();
    if (status) docs = docs.filter(d => d.status === status);

    const total = docs.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedDocs = docs.slice(startIndex, startIndex + limit).map(d => ({
      id: d.id,
      documentId: d.documentId,
      applicationId: d.applicationId,
      documentType: d.documentType,
      originalName: d.originalName,
      mimeType: d.mimeType,
      fileSize: d.fileSize,
      status: d.status,
      uploadedAt: d.createdAt || d.uploadedAt
    }));

    res.json({
      success: true,
      documents: paginatedDocs,
      pagination: { total, page, limit, totalPages }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 10.5 TOURISM & TOUR PACKAGE MANAGEMENT API (ADMIN/SUPER_ADMIN WRITE)
app.get('/api/admin/tour-packages', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const packages = await db.tourPackages.find();
    res.json({ success: true, packages });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.post('/api/admin/tour-packages', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const created = await tourismService.createPackage(req.body, req.user);
    await logAudit(req, 'CREATE_TOUR_PACKAGE', 'TOUR_PACKAGE', created.id);
    res.status(201).json({ success: true, package: created });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.message } });
  }
});

app.patch('/api/admin/tour-packages/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const updated = await tourismService.updatePackage(req.params.id, req.body, req.user);
    await logAudit(req, 'UPDATE_TOUR_PACKAGE', 'TOUR_PACKAGE', updated.id);
    res.json({ success: true, package: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.message } });
  }
});

app.post('/api/admin/destinations', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { name, country, description, featured } = req.body || {};
    if (!name || !country) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Destination name and country are required.' } });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const dest = await db.destinations.create({
      slug,
      name: name.trim(),
      country: country.trim(),
      description: description || '',
      featured: Boolean(featured),
      published: true
    });

    await logAudit(req, 'CREATE_DESTINATION', 'DESTINATION', dest.id);
    res.status(201).json({ success: true, destination: dest });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.message } });
  }
});

app.post('/api/admin/categories', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { name, description } = req.body || {};
    if (!name) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Category name is required.' } });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const cat = await db.tourCategories.create({
      slug,
      name: name.trim(),
      description: description || '',
      active: true
    });

    await logAudit(req, 'CREATE_TOUR_CATEGORY', 'TOUR_CATEGORY', cat.id);
    res.status(201).json({ success: true, category: cat });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.message } });
  }
});

// 10.6 BOOKING OPERATIONS API
app.get('/api/admin/bookings', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const status = req.query.status;
    const search = (req.query.search || '').trim();

    let bks = await db.tourBookings.find();
    if (status) bks = bks.filter(b => b.status === status);
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      bks = bks.filter(b => rx.test(b.bookingNumber || '') || rx.test(b.travellerName || '') || rx.test(b.email || '') || rx.test(b.packageTitle || ''));
    }

    const total = bks.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedBookings = bks.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      bookings: paginatedBookings,
      pagination: { total, page, limit, totalPages }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.get('/api/admin/bookings/:id', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const booking = await db.tourBookings.findById(req.params.id) || await db.tourBookings.findOne({ bookingNumber: req.params.id });
    if (!booking) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking record not found.' } });

    const travellers = await db.bookingTravellers.find({ bookingId: booking.id });
    const payments = await db.payments.find({ bookingId: booking.id });

    res.json({
      success: true,
      booking,
      travellers,
      payments
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.patch('/api/admin/bookings/:id/status', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { status } = req.body || {};
    const updated = await tourismService.transitionBookingStatus(req.params.id, status, req.user);
    await logAudit(req, `CHANGED_BOOKING_STATUS_${status}`, 'TOUR_BOOKING', req.params.id);
    res.json({ success: true, booking: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'TRANSITION_ERROR', message: err.message } });
  }
});

// 10.7 PAYMENT & REFUND OPERATIONS API
app.get('/api/admin/payments', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const status = req.query.status;
    const provider = req.query.provider;
    const currency = req.query.currency;
    const search = (req.query.search || '').trim();

    let pymts = await db.payments.find();

    if (status) pymts = pymts.filter(p => p.status === status);
    if (provider) pymts = pymts.filter(p => p.provider === provider);
    if (currency) pymts = pymts.filter(p => p.currency === currency);
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      pymts = pymts.filter(p => rx.test(p.paymentNumber || '') || rx.test(p.providerOrderId || '') || rx.test(p.userId || ''));
    }

    const total = pymts.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedPayments = pymts.slice(startIndex, startIndex + limit).map(p => paymentService.sanitizePayment(p, req.user.role));

    res.json({
      success: true,
      payments: paginatedPayments,
      pagination: { total, page, limit, totalPages }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.get('/api/admin/refunds', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const refunds = await db.refunds.find();
    const total = refunds.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;

    res.json({
      success: true,
      refunds: refunds.slice(startIndex, startIndex + limit),
      pagination: { total, page, limit, totalPages }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 10.8 SUPPORT TICKETS & CONTACT INQUIRIES OPERATIONS API
app.get('/api/admin/support/tickets', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const status = req.query.status;
    const search = (req.query.search || '').trim();

    let tkts = await db.supportTickets.find();
    if (status) tkts = tkts.filter(t => t.status === status);
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      tkts = tkts.filter(t => rx.test(t.ticketNumber || '') || rx.test(t.subject || '') || rx.test(t.userEmail || ''));
    }

    const total = tkts.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;

    res.json({
      success: true,
      tickets: tkts.slice(startIndex, startIndex + limit),
      pagination: { total, page, limit, totalPages }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.get('/api/admin/support/tickets/:id', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const ticket = await db.supportTickets.findById(req.params.id) || await db.supportTickets.findOne({ ticketNumber: req.params.id });
    if (!ticket) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Support ticket not found.' } });

    const messages = await db.chatMessages.find({ conversationId: ticket.conversationId || ticket.id });

    res.json({
      success: true,
      ticket,
      messages
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.post('/api/admin/support/tickets/:id/reply', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { message, status } = req.body || {};
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Reply message is required.' } });
    }

    const ticket = await db.supportTickets.findById(req.params.id) || await db.supportTickets.findOne({ ticketNumber: req.params.id });
    if (!ticket) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Support ticket not found.' } });

    const replyMsg = await db.chatMessages.create({
      conversationId: ticket.conversationId || ticket.id,
      sender: 'STAFF',
      senderId: req.user.id,
      senderName: req.user.name,
      text: message.trim(),
      timestamp: new Date().toISOString()
    });

    const updates = {
      assignedStaffId: req.user.id,
      assignedStaffName: req.user.name,
      status: status || 'IN_PROGRESS',
      updatedAt: new Date()
    };

    const updatedTicket = await db.supportTickets.update(ticket.id, updates);
    await logAudit(req, 'STAFF_SUPPORT_REPLY', 'SUPPORT_TICKET', ticket.id);

    // Trigger non-blocking notification dispatch to ticket customer
    notificationService.dispatchEvent('SUPPORT_TICKET_REPLY', {
      user: { id: ticket.userId, email: ticket.userEmail },
      reference: ticket.ticketNumber,
      title: `Support Ticket Updated: ${ticket.subject}`,
      message: message.trim()
    }).catch(() => {});

    res.json({ success: true, ticket: updatedTicket, reply: replyMsg });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.get('/api/admin/contact-inquiries', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const inquiries = await db.contactInquiries.find();
    const total = inquiries.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;

    res.json({
      success: true,
      inquiries: inquiries.slice(startIndex, startIndex + limit),
      pagination: { total, page, limit, totalPages }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.patch('/api/admin/contact-inquiries/:id/resolve', authenticate, authorize('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const inquiry = await db.contactInquiries.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Inquiry not found.' } });

    const updated = await db.contactInquiries.update(inquiry.id, { resolved: true, resolvedBy: req.user.id, resolvedAt: new Date() });
    await logAudit(req, 'RESOLVE_CONTACT_INQUIRY', 'CONTACT_INQUIRY', inquiry.id);

    res.json({ success: true, inquiry: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 10.9 NOTIFICATION OPERATIONS & HEALTH MONITORING API (ADMIN/SUPER_ADMIN ONLY)
app.get('/api/admin/notifications', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const status = req.query.status;

    let notifs = await db.notifications.find();
    if (status) notifs = notifs.filter(n => n.status === status);

    const total = notifs.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;

    const safeNotifs = notifs.slice(startIndex, startIndex + limit).map(n => ({
      id: n.id,
      userId: n.userId,
      channel: n.channel,
      eventType: n.eventType,
      status: n.status,
      title: n.title,
      createdAt: n.createdAt,
      read: n.read
    }));

    res.json({
      success: true,
      notifications: safeNotifs,
      pagination: { total, page, limit, totalPages }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.post('/api/admin/notifications/:id/resend', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), submissionLimiter, async (req, res) => {
  try {
    const notif = await db.notifications.findById(req.params.id);
    if (!notif) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Notification log not found.' } });

    await logAudit(req, 'ADMIN_RESEND_NOTIFICATION', 'NOTIFICATION', notif.id);

    const dispatchResult = await notificationService.dispatchEvent(notif.eventType || 'GENERIC_ALERT', {
      userId: notif.userId,
      title: notif.title,
      message: notif.message,
      idempotencyKey: `resend_${notif.id}_${Date.now()}`
    });

    res.json({ success: true, message: 'Notification resend dispatched successfully.', dispatch: dispatchResult });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 10.10 IMMUTABLE AUDIT LOG SYSTEM API (ADMIN/SUPER_ADMIN ONLY)
app.get('/api/admin/audit-logs', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const actorRole = req.query.actorRole;
    const action = req.query.action;
    const entityType = req.query.entityType;
    const search = (req.query.search || '').trim();

    let logs = await db.auditLogs.find();

    if (actorRole) logs = logs.filter(l => l.actorRole === actorRole);
    if (action) logs = logs.filter(l => l.action === action);
    if (entityType) logs = logs.filter(l => l.entityType === entityType);
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      logs = logs.filter(l => rx.test(l.action || '') || rx.test(l.actorId || '') || rx.test(l.entityId || ''));
    }

    // Sort descending by timestamp
    logs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const total = logs.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;

    res.json({
      success: true,
      logs: logs.slice(startIndex, startIndex + limit),
      pagination: { total, page, limit, totalPages }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// -------------------------------------------------------------
// TASK #9: JMT AI CHATBOT & CUSTOMER SUPPORT SYSTEM ROUTES
// -------------------------------------------------------------
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many chat requests. Please wait 15 minutes.' } }
});

// 1. Create or retrieve active conversation for authenticated customer
app.post('/api/chat/conversations', authenticate, i18nMiddleware, async (req, res) => {
  try {
    const { title, channel = 'WEB', language } = req.body || {};
    const normLang = language || req.locale || req.user?.preferredLanguage || 'en';

    let conversation = await db.chatConversations.findOne({
      customerId: req.user.id,
      status: 'ACTIVE'
    });

    if (!conversation) {
      conversation = await db.chatConversations.create({
        customerId: req.user.id,
        title: title || 'Support Chat',
        channel: channel || 'WEB',
        language: normLang,
        status: 'ACTIVE',
        escalationState: 'AI_ACTIVE'
      });

      const isAr = normLang === 'ar';
      const welcomeText = isAr
        ? 'مرحباً! أنا مساعد JMT الرقمي. كيف يمكنني مساعدتك اليوم؟'
        : 'Hello! I am JMT Travels AI Assistant. How can I help you today?';

      await db.chatMessages.create({
        conversationId: conversation.id,
        sender: 'AI',
        text: welcomeText,
        language: normLang
      });
    }

    res.status(201).json({ success: true, conversation });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 2. List authenticated customer's own conversations (IDOR protected)
app.get('/api/chat/conversations', authenticate, async (req, res) => {
  try {
    const conversations = await db.chatConversations.find({ customerId: req.user.id });
    res.json({ success: true, conversations });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 3. Get single conversation details with messages (IDOR protected)
app.get('/api/chat/conversations/:id', authenticate, async (req, res) => {
  try {
    const conversation = await db.chatConversations.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Chat conversation not found.' } });
    }

    const isStaff = ['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(req.user.role);
    if (conversation.customerId !== req.user.id && !isStaff) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied to this conversation.' } });
    }

    const messages = await db.chatMessages.find({ conversationId: conversation.id });
    messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({ success: true, conversation, messages });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 4. Send message to AI chatbot in a conversation (IDOR & Rate Limited)
app.post('/api/chat/conversations/:id/messages', chatLimiter, authenticate, i18nMiddleware, async (req, res) => {
  try {
    const conversation = await db.chatConversations.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Chat conversation not found.' } });
    }

    const isStaff = ['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(req.user.role);
    if (conversation.customerId !== req.user.id && !isStaff) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied to this conversation.' } });
    }

    const { text, language } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Message text is required.' } });
    }

    const msgLang = language || req.locale || conversation.language || 'en';

    const userMessage = await db.chatMessages.create({
      conversationId: conversation.id,
      sender: 'CUSTOMER',
      text: text.trim(),
      language: msgLang
    });

    await db.chatConversations.update(conversation.id, { lastMessageAt: new Date().toISOString() });

    const result = await chatbotService.processMessage({
      message: text,
      conversationId: conversation.id,
      user: req.user,
      locale: msgLang
    });

    const aiMessage = await db.chatMessages.create({
      conversationId: conversation.id,
      sender: 'AI',
      text: result.reply,
      language: msgLang,
      metadata: { quickReplies: result.quickReplies, ticketNumber: result.ticketNumber }
    });

    if (result.escalationState) {
      await db.chatConversations.update(conversation.id, { escalationState: result.escalationState });
    }

    res.json({
      success: true,
      userMessage,
      aiResponse: aiMessage,
      escalationState: result.escalationState || conversation.escalationState,
      quickReplies: result.quickReplies
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 5. Explicit Escalate Conversation to Human Support Desk
app.post('/api/chat/conversations/:id/escalate', authenticate, i18nMiddleware, async (req, res) => {
  try {
    const conversation = await db.chatConversations.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Chat conversation not found.' } });
    }

    const isStaff = ['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(req.user.role);
    if (conversation.customerId !== req.user.id && !isStaff) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied to this conversation.' } });
    }

    const { reason } = req.body || {};
    const escResult = await chatTools.escalateToHuman(req.user, conversation.id, reason || 'Customer requested human agent escalation.');

    const sysMessage = await db.chatMessages.create({
      conversationId: conversation.id,
      sender: 'SYSTEM',
      text: req.locale === 'ar'
        ? `تم تصعيد المحادثة إلى فريق الدعم. رقم التذكرة المرتبطة: ${escResult.ticket ? escResult.ticket.ticketNumber : 'N/A'}`
        : `Conversation escalated to customer support. Linked Ticket #: ${escResult.ticket ? escResult.ticket.ticketNumber : 'N/A'}`,
      language: req.locale || 'en'
    });

    const updatedConv = await db.chatConversations.findById(conversation.id);
    res.json({
      success: true,
      conversation: updatedConv,
      ticket: escResult.ticket,
      systemMessage: sysMessage
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 6. Admin/Staff: List Conversations (Active / Escalated)
app.get('/api/admin/chat/conversations', authenticate, async (req, res) => {
  try {
    const isStaff = ['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(req.user.role);
    if (!isStaff) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin / Staff access required.' } });
    }

    const { status, escalationState } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (escalationState) filter.escalationState = escalationState;

    const conversations = await db.chatConversations.find(filter);
    res.json({ success: true, conversations });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 7. Admin/Staff: Reply to Customer Conversation
app.post('/api/admin/chat/conversations/:id/reply', authenticate, async (req, res) => {
  try {
    const isStaff = ['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(req.user.role);
    if (!isStaff) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin / Staff access required.' } });
    }

    const conversation = await db.chatConversations.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Chat conversation not found.' } });
    }

    const { text } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Reply text is required.' } });
    }

    const staffMsg = await db.chatMessages.create({
      conversationId: conversation.id,
      sender: 'STAFF',
      text: text.trim(),
      language: conversation.language || 'en'
    });

    await db.chatConversations.update(conversation.id, {
      escalationState: 'STAFF_ACTIVE',
      assignedStaffId: req.user.id,
      lastMessageAt: new Date().toISOString()
    });

    const customer = await db.users.findById(conversation.customerId);
    if (customer) {
      await notificationService.dispatchEvent('SUPPORT_TICKET_UPDATED', {
        user: customer,
        reference: conversation.id
      });
    }

    const updatedConv = await db.chatConversations.findById(conversation.id);
    res.json({ success: true, message: staffMsg, conversation: updatedConv });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// Global Database & Application Error Handling Middleware
app.use((err, req, res, next) => {
  if (err.code === 'DATABASE_UNAVAILABLE' || err.statusCode === 503) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database service unavailable. Required MongoDB connection is offline in production.'
      }
    });
  }
  console.error('[Unhandled Express Error]:', err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'An unexpected server error occurred.'
    }
  });
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

app.seedInitialData = seedInitialData;

module.exports = app;
