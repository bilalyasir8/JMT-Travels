const mongoose = require('mongoose');

const SupportTicketSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  ticketId: { type: String, unique: true, required: true, index: true },
  userId: { type: String, index: true, ref: 'User' },
  subject: { type: String, required: true, trim: true },
  category: { type: String, default: 'General' },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
  status: {
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'],
    default: 'OPEN',
    index: true
  },
  assignedTo: { type: String, ref: 'User' },
  messages: [{
    sender: String,
    senderId: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

SupportTicketSchema.index({ userId: 1, status: 1, createdAt: -1 });
SupportTicketSchema.index({ ticketNumber: 1 });

module.exports = mongoose.models.SupportTicket || mongoose.model('SupportTicket', SupportTicketSchema);
