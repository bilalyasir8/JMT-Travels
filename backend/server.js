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
  max: 150,
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

// Require Visa & Storage Services
const visaService = require('./services/visa');
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

// --- 10. ADMIN METRICS & REPORTING (PROTECTED STAFF ONLY) ---
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
