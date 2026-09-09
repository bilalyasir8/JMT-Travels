const mongoose = require('mongoose');

const VisaDocumentSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  documentId: { type: String, unique: true, required: true, index: true },
  applicationId: { type: String, required: true, index: true, ref: 'VisaApplication' },
  documentType: {
    type: String,
    enum: ['PASSPORT_COPY', 'PHOTO', 'CIVIL_ID', 'TRAVEL_ITINERARY', 'OTHER'],
    default: 'PASSPORT_COPY',
    index: true
  },
  storageKey: { type: String, required: true },
  originalFilename: { type: String, required: true },
  displayFilename: String,
  mimeType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  uploadedBy: { type: String, required: true, index: true, ref: 'User' },
  status: {
    type: String,
    enum: ['UPLOADED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED'],
    default: 'UPLOADED',
    index: true
  },
  reviewNote: String,
  reviewedBy: String,
  reviewedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.models.VisaDocument || mongoose.model('VisaDocument', VisaDocumentSchema);
