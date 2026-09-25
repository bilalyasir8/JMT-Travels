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
    enum: ['UPLOADED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'REPLACED'],
    default: 'UPLOADED',
    index: true
  },
  replacesDocumentId: { type: String, ref: 'VisaDocument' },
  replacedByDocumentId: { type: String, ref: 'VisaDocument' },
  reviewNote: String,
  reviewedBy: String,
  reviewedAt: Date
}, {
  timestamps: true
});

VisaDocumentSchema.index({ applicationId: 1, status: 1 });
VisaDocumentSchema.index({ uploadedBy: 1, createdAt: -1 });

module.exports = mongoose.models.VisaDocument || mongoose.model('VisaDocument', VisaDocumentSchema);
