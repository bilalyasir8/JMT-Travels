const mongoose = require('mongoose');

const PaymentTimelineSchema = new mongoose.Schema({
  paymentNumber: String,
  previousStatus: String,
  newStatus: String,
  changedBy: String,
  timestamp: { type: Date, default: Date.now },
  note: String
}, { _id: false });

const PaymentSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  paymentNumber: { type: String, unique: true, required: true, index: true }, // e.g. JMT-P-XXXXXX
  userId: { type: String, required: true, index: true, ref: 'User' },
  bookingId: { type: String, index: true, ref: 'TourBooking' },
  visaApplicationId: { type: String, index: true, ref: 'VisaApplication' },
  provider: { type: String, required: true, default: 'MOCK', index: true },
  providerOrderId: { type: String, required: true, index: true },
  providerPaymentId: String,
  amount: { type: Number, required: true }, // Decimal amount (e.g. 189)
  amountMinor: { type: Number, required: true }, // Integer thousandths/minor units (e.g. 189000)
  refundedAmountMinor: { type: Number, default: 0 },
  currency: { type: String, required: true, default: 'OMR' },
  idempotencyKey: { type: String, index: true },
  status: {
    type: String,
    enum: [
      'INITIATED',
      'PENDING',
      'PAYMENT_PENDING',
      'AUTHORIZED',
      'PAID',
      'COMPLETED',
      'FAILED',
      'CANCELLED',
      'EXPIRED',
      'REFUNDED',
      'PARTIALLY_REFUNDED'
    ],
    default: 'PENDING',
    index: true
  },
  paymentMethod: String,
  failureReason: String,
  providerMetadata: mongoose.Schema.Types.Mixed,
  timeline: [PaymentTimelineSchema]
}, {
  timestamps: true
});

module.exports = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
