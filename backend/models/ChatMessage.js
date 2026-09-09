const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  conversationId: { type: String, required: true, index: true, ref: 'ChatConversation' },
  sender: { type: String, required: true, enum: ['USER', 'BOT', 'STAFF'] },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);
