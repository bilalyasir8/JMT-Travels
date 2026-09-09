const mongoose = require('mongoose');

const ChatConversationSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  conversationId: { type: String, unique: true, required: true, index: true },
  userId: { type: String, index: true, ref: 'User' },
  messages: [{
    sender: { type: String, enum: ['USER', 'BOT', 'STAFF'] },
    text: String,
    timestamp: { type: Date, default: Date.now }
  }],
  escalatedTicketId: { type: String, ref: 'SupportTicket' }
}, {
  timestamps: true
});

module.exports = mongoose.models.ChatConversation || mongoose.model('ChatConversation', ChatConversationSchema);
