const mongoose = require('mongoose');

const RefundSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  refundId: { type: String, unique: true, index: true },
  paymentId: { type: String, required: true, index: true, ref: 'Payment' },
  bookingId: { type: String, index: true, ref: 'TourBooking' },
  visaApplicationId: { type: String, index: true, ref: 'VisaApplication' },
  amount: { type: Number, required: true },
  amountMinor: { type: Number, required: true },
  currency: { type: String, default: 'OMR' },
  idempotencyKey: { type: String, index: true },
  status: {
    type: String,
    enum: ['REFUND_REQUESTED', 'REFUND_PROCESSING', 'REFUNDED', 'REFUND_FAILED'],
    default: 'REFUNDED'
  },
  reason: String,
  requestedBy: { type: String, ref: 'User' },
  processedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.models.Refund || mongoose.model('Refund', RefundSchema);
