const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['CUSTOMER', 'STAFF', 'ADMIN', 'SUPER_ADMIN'],
    default: 'CUSTOMER',
    index: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'UNVERIFIED', 'SUSPENDED', 'DISABLED'],
    default: 'ACTIVE',
    index: true
  },
  verified: { type: Boolean, default: false, index: true },
  verificationToken: { type: String, index: true },
  verificationTokenExpires: Date,
  resetPasswordToken: { type: String, index: true },
  resetPasswordExpires: Date,
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  passwordChangedAt: Date,
  tokenInvalidatedBefore: Date,
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret: String,
  preferredLanguage: {
    type: String,
    enum: ['en', 'ar'],
    default: 'en'
  },
  preferredCurrency: {
    type: String,
    enum: ['OMR', 'AED', 'SAR', 'INR', 'USD'],
    default: 'OMR'
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
