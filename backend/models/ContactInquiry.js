const mongoose = require('mongoose');

const ContactInquirySchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  name: { type: String, required: true, trim: true },
  contact: { type: String, required: true, trim: true },
  type: { type: String, default: 'feedback' },
  message: { type: String, required: true },
  status: { type: String, default: 'OPEN', index: true }
}, {
  timestamps: true
});

module.exports = mongoose.models.ContactInquiry || mongoose.model('ContactInquiry', ContactInquirySchema);
