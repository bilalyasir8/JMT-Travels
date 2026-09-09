const mongoose = require('mongoose');

const PaymentEventSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  eventId: { type: String, unique: true, required: true, index: true },
  paymentId: { type: String, ref: 'Payment' },
  payload: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

module.exports = mongoose.models.PaymentEvent || mongoose.model('PaymentEvent', PaymentEventSchema);
