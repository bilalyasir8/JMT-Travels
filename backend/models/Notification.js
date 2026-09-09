const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  userId: { type: String, required: true, index: true, ref: 'User' },
  channel: {
    type: String,
    enum: ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'],
    default: 'IN_APP',
    index: true
  },
  type: { type: String, required: true, index: true }, // e.g. VISA_STATUS_CHANGED, BOOKING_CONFIRMED
  title: { type: String, required: true },
  message: { type: String, required: true },
  templateId: String,
  metadata: mongoose.Schema.Types.Mixed,
  entityType: String,
  entityId: String,
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED'],
    default: 'SENT',
    index: true
  },
  read: { type: Boolean, default: false, index: true },
  readAt: Date,
  provider: { type: String, default: 'MOCK' },
  providerMessageId: String,
  retryCount: { type: Number, default: 0 },
  failureReason: String,
  idempotencyKey: { type: String, index: true },
  scheduledAt: Date,
  deliveredAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
