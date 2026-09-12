const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  conversationId: { type: String, required: true, index: true, ref: 'ChatConversation' },
  sender: { 
    type: String, 
    required: true, 
    enum: ['CUSTOMER', 'AI', 'STAFF', 'SYSTEM', 'USER', 'BOT'],
    index: true 
  },
  message: { type: String, required: true },
  language: { type: String, enum: ['en', 'ar'], default: 'en' },
  messageType: { 
    type: String, 
    enum: ['TEXT', 'QUICK_REPLY', 'TOOL_CALL', 'ESCALATION'], 
    default: 'TEXT' 
  },
  metadata: mongoose.Schema.Types.Mixed,
  toolRef: String,
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

ChatMessageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);
