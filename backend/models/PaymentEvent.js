const mongoose = require('mongoose');

const PaymentEventSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  eventId: { type: String, unique: true, required: true, index: true }, // Webhook event ID or idempotency key
  providerOrderId: { type: String, index: true },
  providerPaymentId: { type: String, index: true },
  paymentId: { type: String, index: true, ref: 'Payment' },
  processingStatus: {
    type: String,
    enum: ['PROCESSED', 'DUPLICATE', 'REJECTED', 'FAILED'],
    default: 'PROCESSED'
  },
  failureReason: String,
  payload: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

module.exports = mongoose.models.PaymentEvent || mongoose.model('PaymentEvent', PaymentEventSchema);
