const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  userId: { type: String, index: true, ref: 'User' },
  bookingId: { type: String, ref: 'TourBooking' },
  visaApplicationId: { type: String, ref: 'VisaApplication' },
  provider: { type: String, required: true, default: 'SANDBOX' },
  providerOrderId: { type: String, required: true, index: true },
  providerPaymentId: String,
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: 'OMR' },
  status: {
    type: String,
    enum: ['PAYMENT_PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    default: 'PAYMENT_PENDING',
    index: true
  },
  paymentMethod: String,
  failureReason: String
}, {
  timestamps: true
});

module.exports = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
