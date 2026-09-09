const mongoose = require('mongoose');

const BookingTravellerSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  bookingId: { type: String, required: true, index: true, ref: 'TourBooking' },
  fullName: { type: String, required: true, trim: true },
  age: Number,
  passportNumber: String
}, {
  timestamps: true
});

module.exports = mongoose.models.BookingTraveller || mongoose.model('BookingTraveller', BookingTravellerSchema);
