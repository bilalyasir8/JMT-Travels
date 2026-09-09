const mongoose = require('mongoose');

const ItineraryDaySchema = new mongoose.Schema({
  day: { type: Number, required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  activities: [String],
  meals: String
}, { _id: false });

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
  priceMinor: { type: Number, required: true }, // thousandths of OMR or minor units (e.g. 189000 = 189.000 OMR)
  currency: { type: String, default: 'OMR' },
  capacity: { type: Number, default: 20 },
  bookedCount: { type: Number, default: 0 },
  image: String,
  summary: String,
  highlights: [String],
  inclusions: [String],
  exclusions: [String],
  itinerary: [ItineraryDaySchema],
  cancellationPolicy: String,
  published: { type: Boolean, default: true, index: true },
  active: { type: Boolean, default: true, index: true },
  featured: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.models.TourPackage || mongoose.model('TourPackage', TourPackageSchema);
