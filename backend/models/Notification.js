const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  userId: { type: String, required: true, index: true, ref: 'User' },
  type: String,
  title: String,
  message: String,
  entityType: String,
  entityId: String,
  read: { type: Boolean, default: false, index: true }
}, {
  timestamps: true
});

module.exports = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
