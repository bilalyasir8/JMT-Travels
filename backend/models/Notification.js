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
  category: {
    type: String,
    enum: ['VISA', 'TOUR', 'HOTEL', 'FLIGHT', 'SUPPORT', 'PAYMENT', 'ACCOUNT', 'SYSTEM'],
    default: 'SYSTEM',
    index: true
  },
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL'
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  reference: { type: String, index: true },
  actionUrl: { type: String },
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

NotificationSchema.virtual('isRead').get(function() {
  return !!this.read;
});

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, category: 1, createdAt: -1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
