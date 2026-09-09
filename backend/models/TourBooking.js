const mongoose = require('mongoose');

const TourBookingSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  bookingNumber: { type: String, unique: true, required: true, index: true },
  packageId: { type: String, required: true, ref: 'TourPackage' },
  packageTitle: String,
  userId: { type: String, index: true, ref: 'User' },
  travellerName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  travellers: { type: Number, default: 1 },
  travelDate: String,
  amount: { type: Number, required: true },
  currency: { type: String, default: 'OMR' },
  status: {
    type: String,
    enum: ['PENDING', 'PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'REFUND_PENDING', 'REFUNDED', 'Payment link pending'],
    default: 'PAYMENT_PENDING',
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.TourBooking || mongoose.model('TourBooking', TourBookingSchema);
