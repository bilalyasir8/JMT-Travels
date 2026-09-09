const mongoose = require('mongoose');

const TourPackageSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  slug: { type: String, unique: true, required: true, index: true, lowercase: true, trim: true },
  title: { type: String, required: true, trim: true },
  destinationId: { type: String, index: true, ref: 'Destination' },
  categoryId: { type: String, index: true, ref: 'TourCategory' },
  destination: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  duration: String,
  durationDays: Number,
  priceMinor: { type: Number, required: true },
  currency: { type: String, default: 'OMR' },
  image: String,
  summary: String,
  highlights: [String],
  inclusions: [String],
  exclusions: [String],
  published: { type: Boolean, default: true, index: true },
  featured: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.models.TourPackage || mongoose.model('TourPackage', TourPackageSchema);
