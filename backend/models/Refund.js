const mongoose = require('mongoose');

const RefundSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  paymentId: { type: String, required: true, ref: 'Payment' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'OMR' },
  status: {
    type: String,
    enum: ['REFUND_REQUESTED', 'REFUND_PROCESSING', 'REFUNDED', 'REFUND_FAILED'],
    default: 'REFUNDED'
  },
  reason: String,
  requestedBy: { type: String, ref: 'User' }
}, {
  timestamps: true
});

module.exports = mongoose.models.Refund || mongoose.model('Refund', RefundSchema);
