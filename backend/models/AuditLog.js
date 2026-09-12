const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  actorId: { type: String, index: true, ref: 'User' },
  actorRole: String,
  action: { type: String, required: true },
  entityType: String,
  entityId: String,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
