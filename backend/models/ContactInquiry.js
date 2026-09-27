const mongoose = require('mongoose');

const ContactInquirySchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  reference: { type: String, index: true },
  userId: { type: String, index: true, default: null },
  name: { type: String, required: true, trim: true },
  contact: { type: String, required: true, trim: true },
  type: { type: String, default: 'feedback', index: true },
  status: { type: String, default: 'NEW', index: true },
  message: { type: String, default: '' },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  adminNotes: { type: String, default: '' },
  staffResponse: { type: String, default: '' },
  resolved: { type: Boolean, default: false },
  resolvedBy: { type: String, default: null },
  resolvedAt: { type: Date, default: null }
}, {
  timestamps: true
});

module.exports = mongoose.models.ContactInquiry || mongoose.model('ContactInquiry', ContactInquirySchema);
