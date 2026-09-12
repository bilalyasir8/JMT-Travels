const mongoose = require('mongoose');

const VisaApplicationSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  applicationNumber: { type: String, unique: true, required: true, index: true },
  userId: { type: String, index: true, ref: 'User' },
  visaServiceId: { type: String, ref: 'VisaService' },
  destination: { type: String, required: true, trim: true },
  visaType: { type: String, required: true, trim: true },
  nationality: { type: String, trim: true },
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  passportNumber: { type: String, trim: true },
  dateOfBirth: String,
  passportExpiry: String,
  travelDate: String,
  status: {
    type: String,
    enum: [
      'DRAFT',
      'PENDING_DOCUMENTS',
      'SUBMITTED',
      'UNDER_REVIEW',
      'ADDITIONAL_DOCUMENTS_REQUIRED',
      'PROCESSING',
      'APPROVED',
      'REJECTED',
      'CANCELLED',
      'COMPLETED',
      'Documents required' // Retained for backward compatibility
    ],
    default: 'SUBMITTED',
    index: true
  },
  documents: [{ type: String, ref: 'VisaDocument' }],
  adminNotes: { type: String, select: false }, // Internal staff notes, excluded from customer JSON projections
  requestedDocuments: [{
    requestId: { type: String, required: true },
    documentType: { type: String, required: true },
    instruction: String,
    requestedBy: String,
    requestedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['PENDING', 'FULFILLED'], default: 'PENDING' }
  }],
  timeline: [{
    applicationId: String,
    previousStatus: String,
    newStatus: { type: String, required: true },
    changedBy: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    note: String
  }]
}, {
  timestamps: true
});

VisaApplicationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.VisaApplication || mongoose.model('VisaApplication', VisaApplicationSchema);
