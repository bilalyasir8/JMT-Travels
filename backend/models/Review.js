const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  name: { type: String, required: true, trim: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  message: { type: String, required: true, trim: true }
}, {
  timestamps: true
});

module.exports = mongoose.models.Review || mongoose.model('Review', ReviewSchema);
