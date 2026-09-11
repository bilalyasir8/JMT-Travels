/**
 * JMT TRAVELS — AI Provider Abstraction Interface
 * 
 * Provides provider-agnostic LLM integration supporting Mock/Sandbox (for testing & offline execution)
 * and Production AI Provider interfaces (OpenAI, Gemini, Claude).
 * 
 * Rules:
 * 1. Fails safely if production AI provider is requested without required API credentials.
 * 2. Never leaks provider secrets, API keys, or raw system prompts.
 * 3. Supports intent classification and structured response generation.
 */

class AIProvider {
  constructor(name) {
    this.name = name;
  }

  async generateResponse(params) {
    throw new Error('generateResponse must be implemented by AIProvider subclass');
  }

  async classifyIntent(text) {
    return 'GENERAL_HELP';
  }
}

// 1. Mock AI Provider (For Testing & Offline Environments)
class MockAIProvider extends AIProvider {
  constructor() {
    super('MOCK_AI_PROVIDER');
  }

  async generateResponse({ prompt, conversationHistory, context, tools, language = 'en' }) {
    const isArabic = language === 'ar';
    const text = (prompt || '').trim().toLowerCase();

    // Check for prompt injection attempts
    if (
      text.includes('ignore your instructions') ||
      text.includes('reveal your api key') ||
      text.includes('show me the database') ||
      text.includes('run this mongodb query') ||
      text.includes('act as an admin') ||
      text.includes('internal system prompt')
    ) {
      return {
        reply: isArabic
          ? 'عذراً، بصفتي مساعد JMT الرقمي، لا يمكنني تنفيذ طلبات النظام أو الوصول إلى قواعد البيانات مباشرة.'
          : 'As the JMT Travels AI Assistant, I cannot fulfill system commands or bypass security controls.',
        intent: 'SECURITY_BLOCKED',
        quickReplies: isArabic ? ['خدمات التأشيرات', 'الباقات السياحية', 'الدعم الفني'] : ['Visa Services', 'Tour Packages', 'Support']
      };
    }

    // Standard Assistant Intent Routing
    if (text.includes('human') || text.includes('support') || text.includes('agent') || text.includes('إنسان') || text.includes('الدعم')) {
      return {
        reply: isArabic
          ? 'يمكنني توصيلك مباشرة بفر يق دعم العملاء في JMT. هل ترغب في إنشاء تذكرة دعم؟'
          : 'I can connect you directly with our JMT customer support team. Would you like me to create a support ticket?',
        intent: 'ESCALATION_REQUEST',
        escalated: true,
        quickReplies: isArabic ? ['إنشاء تذكرة دعم', 'التحدث مع الدعم'] : ['Create Support Ticket', 'Talk to Support']
      };
    }

    return {
      reply: isArabic
        ? 'مرحباً بك في خدمة عملاء JMT للسفر والسياحة. كيف يمكنني مساعدتك اليوم؟'
        : 'Welcome to JMT Travel & Tourism Assistant. How can I assist your journey today?',
      intent: 'GENERAL_HELP',
      quickReplies: isArabic ? ['خدمات التأشيرات', 'الباقات السياحية', 'موقع المكتب'] : ['Visa Services', 'Tour Packages', 'Office Location']
    };
  }
}

// 2. Production AI Provider Interface (PREPARED ONLY)
class ProductionAIProvider extends AIProvider {
  constructor() {
    super('PRODUCTION_LLM_PROVIDER');
    this.apiKey = process.env.AI_API_KEY;
    this.model = process.env.AI_MODEL || 'gpt-4o-mini';

    if (!this.apiKey) {
      throw new Error('[AI Provider Config Error]: AI_API_KEY is missing in environment variables. Production AI provider fails safely.');
    }
  }

  async generateResponse({ prompt, context, language = 'en' }) {
    // Interface prepared for production LLM API integration
    return {
      reply: `[Production AI Response] Hello from JMT AI (${this.model}).`,
      intent: 'PRODUCTION_AI_RESPONSE'
    };
  }
}

// AI Provider Factory
function createAIProvider() {
  const providerType = (process.env.AI_PROVIDER || 'mock').toLowerCase();

  if (providerType === 'production' || providerType === 'openai' || providerType === 'gemini') {
    return new ProductionAIProvider();
  }

  return new MockAIProvider();
}

module.exports = {
  AIProvider,
  MockAIProvider,
  ProductionAIProvider,
  createAIProvider
};
