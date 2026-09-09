const mongoose = require('mongoose');

const CustomerProfileSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  userId: { type: String, required: true, index: true, ref: 'User' },
  passportNumber: { type: String, trim: true },
  nationality: { type: String, trim: true },
  dateOfBirth: String,
  address: String,
  city: String,
  country: String
}, {
  timestamps: true
});

module.exports = mongoose.models.CustomerProfile || mongoose.model('CustomerProfile', CustomerProfileSchema);
