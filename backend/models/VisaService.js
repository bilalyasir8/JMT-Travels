const mongoose = require('mongoose');

const VisaServiceSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  slug: { type: String, unique: true, required: true, index: true, lowercase: true, trim: true },
  country: { type: String, required: true, trim: true },
  visaType: { type: String, required: true, trim: true },
  validity: String,
  processingTime: String,
  entryType: String,
  priceMinor: Number,
  currency: { type: String, default: 'OMR' },
  overview: String,
  eligibility: String,
  requiredDocuments: [String],
  published: { type: Boolean, default: true, index: true }
}, {
  timestamps: true
});

module.exports = mongoose.models.VisaService || mongoose.model('VisaService', VisaServiceSchema);
