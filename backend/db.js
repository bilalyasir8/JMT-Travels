/**
 * JMT TRAVELS — Database Layer & Mongoose MongoDB Adapter
 * Production-ready MongoDB Atlas integration via Mongoose Schemas with zero-config JSON fallback.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let mongoose = null;

try {
  mongoose = require('mongoose');
} catch (e) {
  console.log('[DB] Mongoose module not present.');
}

const DATA_DIR = path.join(__dirname, 'data');
const PRIVATE_UPLOADS_DIR = path.join(DATA_DIR, 'private-uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PRIVATE_UPLOADS_DIR)) fs.mkdirSync(PRIVATE_UPLOADS_DIR, { recursive: true });

// JSON Storage Fallback File Map
const JSON_FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  customerProfiles: path.join(DATA_DIR, 'customer-profiles.json'),
  visaServices: path.join(DATA_DIR, 'visa-services.json'),
  visaApplications: path.join(DATA_DIR, 'visa-applications.json'),
  visaDocuments: path.join(DATA_DIR, 'visa-documents.json'),
  destinations: path.join(DATA_DIR, 'destinations.json'),
  tourCategories: path.join(DATA_DIR, 'tour-categories.json'),
  tourPackages: path.join(DATA_DIR, 'tour-packages.json'),
  tourBookings: path.join(DATA_DIR, 'tour-bookings.json'),
  payments: path.join(DATA_DIR, 'payments.json'),
  paymentEvents: path.join(DATA_DIR, 'payment-events.json'),
  refunds: path.join(DATA_DIR, 'refunds.json'),
  supportTickets: path.join(DATA_DIR, 'support-tickets.json'),
  chatConversations: path.join(DATA_DIR, 'chat-conversations.json'),
  contactInquiries: path.join(DATA_DIR, 'contact-inquiries.json'),
  notifications: path.join(DATA_DIR, 'notifications.json'),
  auditLogs: path.join(DATA_DIR, 'audit-logs.json'),
  reviews: path.join(DATA_DIR, 'reviews.json')
};

Object.values(JSON_FILES).forEach(filePath => {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]', 'utf-8');
});

function readJson(key) {
  try {
    const raw = fs.readFileSync(JSON_FILES[key], 'utf-8');
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

function writeJson(key, data) {
  try {
    const tempPath = `${JSON_FILES[key]}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, JSON_FILES[key]);
    return true;
  } catch {
    return false;
  }
}

let isMongoConnected = false;
const mongooseModels = {};

// MONGOOSE SCHEMAS & MODELS
if (mongoose) {
  const Schema = mongoose.Schema;

  const UserSchema = new Schema({
    id: { type: String, unique: true, index: true },
    name: String,
    email: { type: String, unique: true, index: true, lowercase: true },
    phone: String,
    passwordHash: String,
    role: { type: String, enum: ['CUSTOMER', 'STAFF', 'ADMIN', 'SUPER_ADMIN'], default: 'CUSTOMER' },
    verified: { type: Boolean, default: false }
  }, { timestamps: true });

  const VisaServiceSchema = new Schema({
    id: { type: String, unique: true },
    slug: { type: String, unique: true, index: true },
    country: String,
    visaType: String,
    validity: String,
    processingTime: String,
    entryType: String,
    priceMinor: Number,
    currency: { type: String, default: 'OMR' },
    overview: String,
    eligibility: String,
    requiredDocuments: [String],
    published: { type: Boolean, default: true }
  }, { timestamps: true });

  const VisaApplicationSchema = new Schema({
    id: { type: String, unique: true },
    applicationNumber: { type: String, unique: true, index: true },
    userId: { type: String, index: true },
    destination: String,
    visaType: String,
    nationality: String,
    fullName: String,
    email: String,
    phone: String,
    passportNumber: String,
    status: { type: String, index: true, default: 'SUBMITTED' },
    documents: [String],
    timeline: Array
  }, { timestamps: true });

  const TourPackageSchema = new Schema({
    id: { type: String, unique: true },
    slug: { type: String, unique: true, index: true },
    title: String,
    destination: String,
    category: String,
    duration: String,
    durationDays: Number,
    priceMinor: Number,
    currency: { type: String, default: 'OMR' },
    image: String,
    summary: String,
    highlights: [String],
    inclusions: [String],
    exclusions: [String],
    published: { type: Boolean, default: true, index: true },
    featured: Boolean
  }, { timestamps: true });

  const TourBookingSchema = new Schema({
    id: { type: String, unique: true },
    bookingNumber: { type: String, unique: true, index: true },
    packageId: String,
    packageTitle: String,
    userId: { type: String, index: true },
    travellerName: String,
    email: String,
    phone: String,
    travellers: Number,
    travelDate: String,
    amount: Number,
    currency: { type: String, default: 'OMR' },
    status: { type: String, index: true, default: 'PAYMENT_PENDING' }
  }, { timestamps: true });

  const PaymentSchema = new Schema({
    id: { type: String, unique: true },
    userId: { type: String, index: true },
    bookingId: String,
    visaApplicationId: String,
    provider: String,
    providerOrderId: { type: String, index: true },
    providerPaymentId: String,
    amount: Number,
    currency: String,
    status: { type: String, index: true },
    failureReason: String
  }, { timestamps: true });

  const AuditLogSchema = new Schema({
    id: { type: String, unique: true },
    actorId: { type: String, index: true },
    actorRole: String,
    action: String,
    entityType: String,
    entityId: String,
    metadata: Object
  }, { timestamps: true });

  try {
    mongooseModels.users = mongoose.model('User', UserSchema);
    mongooseModels.visaServices = mongoose.model('VisaService', VisaServiceSchema);
    mongooseModels.visaApplications = mongoose.model('VisaApplication', VisaApplicationSchema);
    mongooseModels.tourPackages = mongoose.model('TourPackage', TourPackageSchema);
    mongooseModels.tourBookings = mongoose.model('TourBooking', TourBookingSchema);
    mongooseModels.payments = mongoose.model('Payment', PaymentSchema);
    mongooseModels.auditLogs = mongoose.model('AuditLog', AuditLogSchema);
  } catch (e) {
    // Model existing error catch
  }
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri || !mongoose) {
    console.log('[DB Status] MONGODB_URI not provided in .env. Running on local persistent JSON datastore.');
    return false;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    isMongoConnected = true;
    console.log('====================================================');
    console.log('🍃 MongoDB Atlas Database Connected Successfully!');
    console.log('====================================================');
    return true;
  } catch (err) {
    console.warn('[DB Notice] MongoDB connection failed:', err.message);
    isMongoConnected = false;
    return false;
  }
}

// Dual Datastore Repository Adapter
class Repository {
  constructor(collectionName) {
    this.name = collectionName;
  }

  async find(filter = {}) {
    if (isMongoConnected && mongooseModels[this.name]) {
      const docs = await mongooseModels[this.name].find(filter).lean();
      return docs.map(d => ({ ...d, id: d.id || d._id.toString() }));
    }
    const items = readJson(this.name);
    return items.filter(item => {
      return Object.entries(filter).every(([k, v]) => {
        if (v === undefined) return true;
        if (typeof v === 'object' && v !== null) {
          if (v.$in) return v.$in.includes(item[k]);
          if (v.$ne) return item[k] !== v.$ne;
        }
        return item[k] === v;
      });
    });
  }

  async findOne(filter = {}) {
    const items = await this.find(filter);
    return items[0] || null;
  }

  async findById(id) {
    return this.findOne({ id });
  }

  async create(data) {
    const id = data.id || `${this.name.slice(0, 3)}_${crypto.randomUUID()}`;
    const newItem = {
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };

    if (isMongoConnected && mongooseModels[this.name]) {
      const created = await mongooseModels[this.name].create(newItem);
      return { ...created.toObject(), id: created.id || created._id.toString() };
    }

    const items = readJson(this.name);
    items.unshift(newItem);
    writeJson(this.name, items);
    return newItem;
  }

  async update(id, updates) {
    if (isMongoConnected && mongooseModels[this.name]) {
      const updated = await mongooseModels[this.name].findOneAndUpdate(
        { $or: [{ id }, { _id: id }] },
        { $set: { ...updates, updatedAt: new Date().toISOString() } },
        { new: true }
      ).lean();
      if (updated) return { ...updated, id: updated.id || updated._id.toString() };
    }

    const items = readJson(this.name);
    const index = items.findIndex(item => item.id === id || item._id === id);
    if (index === -1) return null;

    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    writeJson(this.name, items);
    return items[index];
  }

  async delete(id) {
    if (isMongoConnected && mongooseModels[this.name]) {
      const res = await mongooseModels[this.name].deleteOne({ $or: [{ id }, { _id: id }] });
      return res.deletedCount > 0;
    }
    let items = readJson(this.name);
    const initLen = items.length;
    items = items.filter(item => item.id !== id && item._id !== id);
    if (items.length !== initLen) {
      writeJson(this.name, items);
      return true;
    }
    return false;
  }
}

const db = {
  connectDB,
  isMongoConnected: () => isMongoConnected,
  users: new Repository('users'),
  customerProfiles: new Repository('customerProfiles'),
  visaServices: new Repository('visaServices'),
  visaApplications: new Repository('visaApplications'),
  visaDocuments: new Repository('visaDocuments'),
  destinations: new Repository('destinations'),
  tourCategories: new Repository('tourCategories'),
  tourPackages: new Repository('tourPackages'),
  tourBookings: new Repository('tourBookings'),
  payments: new Repository('payments'),
  paymentEvents: new Repository('paymentEvents'),
  refunds: new Repository('refunds'),
  supportTickets: new Repository('supportTickets'),
  chatConversations: new Repository('chatConversations'),
  contactInquiries: new Repository('contactInquiries'),
  notifications: new Repository('notifications'),
  auditLogs: new Repository('auditLogs'),
  reviews: new Repository('reviews'),
  PRIVATE_UPLOADS_DIR
};

module.exports = db;
