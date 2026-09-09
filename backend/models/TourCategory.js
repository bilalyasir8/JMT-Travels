const mongoose = require('mongoose');

const TourCategorySchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  slug: { type: String, unique: true, required: true, index: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: String,
  active: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.models.TourCategory || mongoose.model('TourCategory', TourCategorySchema);
