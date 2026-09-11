const mongoose = require('mongoose');

const ChatConversationSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  conversationId: { type: String, unique: true, required: true, index: true },
  userId: { type: String, index: true, ref: 'User' },
  channel: { type: String, enum: ['WEB', 'WHATSAPP', 'API'], default: 'WEB' },
  language: { type: String, enum: ['en', 'ar'], default: 'en' },
  status: { type: String, enum: ['ACTIVE', 'CLOSED', 'ARCHIVED'], default: 'ACTIVE', index: true },
  escalationState: { 
    type: String, 
    enum: ['AI_ACTIVE', 'ESCALATED', 'STAFF_ACTIVE', 'RESOLVED'], 
    default: 'AI_ACTIVE',
    index: true 
  },
  assignedStaffId: { type: String, ref: 'User' },
  escalatedTicketId: { type: String, ref: 'SupportTicket' },
  lastMessageAt: { type: Date, default: Date.now },
  messages: [{
    sender: { type: String, enum: ['USER', 'CUSTOMER', 'BOT', 'AI', 'STAFF', 'SYSTEM'] },
    text: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.models.ChatConversation || mongoose.model('ChatConversation', ChatConversationSchema);
