const mongoose = require('mongoose');

const RefundSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  refundId: { type: String, unique: true, index: true },
  bookingId: { type: String, index: true, ref: 'TourBooking' },
  paymentId: { type: String, index: true, ref: 'Payment' },
  amount: { type: Number, required: true },
  amountMinor: { type: Number },
  currency: { type: String, default: 'OMR' },
  status: {
    type: String,
    enum: ['REFUND_REQUESTED', 'REFUND_PROCESSING', 'REFUNDED', 'REFUND_FAILED'],
    default: 'REFUND_REQUESTED'
  },
  reason: String,
  requestedBy: { type: String, ref: 'User' },
  processedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.models.Refund || mongoose.model('Refund', RefundSchema);
