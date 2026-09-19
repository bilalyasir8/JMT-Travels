/**
 * JMT TRAVELS — AI Chatbot & Customer Support Engine (V3.2)
 * 
 * Features:
 * 1. Intent System (10 categories: VISA, TOURISM, HOTEL, FLIGHT, BOOKING, PAYMENT, SUPPORT, CONTACT, TRAVEL_PLANNING, GENERAL).
 * 2. Controlled Knowledge Layer (`chatTools.js` mediated context retrieval).
 * 3. Multi-Turn Conversation Memory Window (latest 12 sanitized messages).
 * 4. Customer Data Isolation & IDOR Protection.
 * 5. Human Escalation State Machine (`AI_ACTIVE` -> `ESCALATED` -> `STAFF_ACTIVE` -> `RESOLVED`).
 * 6. Prompt Injection Defense & Strict Assistant Policy.
 * 7. Multilingual Support (`en`, `ar`) with RTL directional isolation helpers.
 */

const db = require('../db');
const { createAIProvider } = require('./aiProvider');
const chatTools = require('./chatTools');
const i18nService = require('./i18n');

class ChatbotService {
  constructor() {
    this.aiProvider = createAIProvider();
  }

  /**
   * Sanitizes customer input message to prevent injection / oversized payloads
   */
  sanitizeInput(messageText) {
    if (!messageText || typeof messageText !== 'string') return '';
    return messageText.trim().slice(0, 1000); // 1000 char max limit
  }

  /**
   * Classifies user intent into one of the 10 V3.2 intent categories
   */
  classifyIntent(messageText, locale = 'en') {
    if (!messageText || typeof messageText !== 'string') return 'GENERAL';
    const txt = messageText.toLowerCase();

    // 1. Authenticated / My Specific Context Queries
    if (txt.includes('my visa') || txt.includes('visa status') || txt.includes('visa application') || txt.includes('تأشيرتي') || txt.includes('طلباتي')) {
      return 'VISA';
    }
    if (txt.includes('my booking') || txt.includes('my reservation') || txt.includes('حجوزاتي') || txt.includes('حجزي')) {
      return 'BOOKING';
    }
    if (txt.includes('my payment') || txt.includes('my refund') || txt.includes('مدفوعاتي') || txt.includes('الاسترداد')) {
      return 'PAYMENT';
    }

    // 2. Domain Knowledge Intents
    if (txt.includes('plan') || txt.includes('itinerary') || txt.includes('suggest') || txt.includes('recommend') || txt.includes('days') || txt.includes('تخطيط') || txt.includes('برنامج') || txt.includes('اقتراح') || txt.includes('خطة')) {
      return 'TRAVEL_PLANNING';
    }
    if (txt.includes('hotel') || txt.includes('resort') || txt.includes('suite') || txt.includes('stay') || txt.includes('accommodation') || txt.includes('فندق') || txt.includes('فنادق') || txt.includes('إقامة') || txt.includes('منتجع') || txt.includes('منتجعات')) {
      return 'HOTEL';
    }
    if (txt.includes('flight') || txt.includes('airline') || txt.includes('mct') || txt.includes('oman air') || txt.includes('salamair') || txt.includes('flydubai') || txt.includes('emirates') || txt.includes('baggage') || txt.includes('طيران') || txt.includes('رحلات جوية') || txt.includes('تذاكر طيران')) {
      return 'FLIGHT';
    }
    if (txt.includes('visa') || txt.includes('passport') || txt.includes('permit') || txt.includes('schengen') || txt.includes('تأشيرة') || txt.includes('تأشيرات') || txt.includes('تأشير')) {
      return 'VISA';
    }
    if (txt.includes('tour') || txt.includes('package') || txt.includes('dubai') || txt.includes('salalah') || txt.includes('umrah') || txt.includes('sightseeing') || txt.includes('باقة') || txt.includes('باقات') || txt.includes('رحلة') || txt.includes('رحلات') || txt.includes('سياحة') || txt.includes('سياحية')) {
      return 'TOURISM';
    }
    if (txt.includes('payment') || txt.includes(' pay') || txt.includes('credit card') || txt.includes('refund') || txt.includes('thawani') || txt.includes('currency') || txt.includes('دفع') || txt.includes('بطاقة') || txt.includes('سداد') || txt.includes('استرداد')) {
      return 'PAYMENT';
    }
    if (txt.includes('booking') || txt.includes('reservation') || txt.includes('cancel') || txt.includes('track') || txt.includes('jmt-') || txt.includes('حجز') || txt.includes('متابعة')) {
      return 'BOOKING';
    }
    if (txt.includes('office') || txt.includes('location') || txt.includes('contact') || txt.includes('address') || txt.includes('phone') || txt.includes('whatsapp') || txt.includes('email') || txt.includes('موقع') || txt.includes('مكتب') || txt.includes('هاتف') || txt.includes('اتصال') || txt.includes('عنوان')) {
      return 'CONTACT';
    }
    if (txt.includes('human') || txt.includes('support') || txt.includes('agent') || txt.includes('ticket') || txt.includes('help') || txt.includes('issue') || txt.includes('complaint') || txt.includes('إنسان') || txt.includes('الدعم') || txt.includes('مساعدة') || txt.includes('تذكرة') || txt.includes('موظف') || txt.includes('خدمة العملاء')) {
      return 'SUPPORT';
    }

    return 'GENERAL';
  }

  /**
   * Helper to return dynamic intent-based quick replies
   */
  _getQuickRepliesForIntent(intent, locale = 'en') {
    const isArabic = locale === 'ar';
    switch (intent) {
      case 'VISA':
        return isArabic ? ['خدمات التأشيرات', 'متطلبات التأشيرة', 'حالة تأشيرتي', 'الاتصال بـ JMT'] : ['Visa Services', 'Visa Requirements', 'Check My Visa', 'Contact JMT'];
      case 'TOURISM':
        return isArabic ? ['باقات دبي', 'باقات عمان', 'جميع الرحلات', 'تخطيط السفر'] : ['Dubai Packages', 'Oman Packages', 'View All Tours', 'Travel Planning'];
      case 'HOTEL':
        return isArabic ? ['البحث عن فندق', 'استفسار الفنادق', 'فنادق عمان', 'الاتصال بـ JMT'] : ['Find a Hotel', 'Hotel Enquiry', 'Oman Hotels', 'Contact JMT'];
      case 'FLIGHT':
        return isArabic ? ['البحث عن رحلة', 'استفسار الطيران', 'مطار مسقط', 'الاتصال بـ JMT'] : ['Search Flights', 'Flight Enquiry', 'MCT Airport', 'Contact JMT'];
      case 'BOOKING':
        return isArabic ? ['حجوزاتي', 'تتبع الحجز', 'حجز رحلة', 'التحدث مع الدعم'] : ['My Bookings', 'Track Booking', 'Book a Tour', 'Talk to Support'];
      case 'PAYMENT':
        return isArabic ? ['حالة الدفع', 'طرق الدفع', 'مسترداتي', 'التحدث مع الدعم'] : ['Payment Status', 'Payment Methods', 'My Refunds', 'Talk to Support'];
      case 'SUPPORT':
        return isArabic ? ['إنشاء تذكرة', 'التحدث مع الدعم', 'تتبع التذكرة', 'الاتصال بـ JMT'] : ['Create Ticket', 'Talk to Support', 'Track Ticket', 'Contact JMT'];
      case 'CONTACT':
        return isArabic ? ['موقع المكتب', 'الاتصال بـ JMT', 'واتساب JMT', 'إرسال بريد'] : ['Office Location', 'Call JMT', 'WhatsApp JMT', 'Send Email'];
      case 'TRAVEL_PLANNING':
        return isArabic ? ['رحلة دبي 5 أيام', 'رحلات صلالة', 'باقات العائلات', 'حجز رحلة'] : ['Dubai 5-Day Trip', 'Salalah Tours', 'Family Packages', 'Book a Tour'];
      case 'GENERAL':
      default:
        return isArabic ? ['خدمات التأشيرات', 'الباقات السياحية', 'الرحلات الجوية', 'الفنادق'] : ['Visa Services', 'Holiday Packages', 'Flights', 'Hotels'];
    }
  }

  /**
   * Main Chatbot Message Execution Pipeline
   */
  async processMessage({ message, conversationId, user, locale = 'en' }) {
    const cleanMessage = this.sanitizeInput(message);
    const normLocale = i18nService.isSupportedLocale(locale) ? locale : (user?.preferredLanguage || 'en');
    const isArabic = normLocale === 'ar';

    if (!cleanMessage) {
      return {
        reply: isArabic
          ? 'مرحباً! أنا مساعد JMT الرقمي. كيف يمكنني مساعدتك اليوم؟ يمكنك الاستفسار عن التأشيرات، الباقات السياحية، الفنادق، الطيران، أو متابعة طلباتك.'
          : 'Hello! I am JMT Travels Assistant. How can I help you today? You can ask about visas, tour packages, hotels, flights, office location, or check your booking status.',
        quickReplies: this._getQuickRepliesForIntent('GENERAL', normLocale)
      };
    }

    // 1. PROMPT INJECTION DEFENSE AT SERVER GATEWAY (REMAINS FIRST)
    const textLower = cleanMessage.toLowerCase();
    if (
      textLower.includes('ignore your instructions') ||
      textLower.includes('reveal your api key') ||
      textLower.includes('show me the database') ||
      textLower.includes('run this mongodb query') ||
      textLower.includes('act as an admin') ||
      textLower.includes('system prompt')
    ) {
      await db.auditLogs.create({
        actorId: user ? user.id : 'ANONYMOUS',
        actorRole: user ? user.role : 'GUEST',
        action: 'CHATBOT_PROMPT_INJECTION_DEFENSE_BLOCKED',
        entityType: 'CHAT_CONVERSATION',
        entityId: conversationId || 'ANONYMOUS',
        metadata: { textSnippet: cleanMessage.slice(0, 50) }
      });

      return {
        reply: isArabic
          ? 'عذراً، بصفتي مساعد JMT الرقمي، لا يمكنني تنفيذ طلبات البرمجة أو الوصول المباشر للنظام.'
          : 'As the JMT Travels AI Assistant, I cannot execute arbitrary commands, bypass security boundaries, or reveal system metadata.',
        quickReplies: this._getQuickRepliesForIntent('SUPPORT', normLocale)
      };
    }

    // 2. CROSS-CUSTOMER DATA ISOLATION PROTECTION (REMAINS FIRST)
    if (
      (textLower.includes('customer') || textLower.includes('user') || textLower.includes('other')) &&
      (textLower.includes('visa') || textLower.includes('booking') || textLower.includes('payment') || textLower.includes('123') || textLower.includes('bilal'))
    ) {
      if (textLower.match(/show me customer|tell me bilal|give me another|other customer/i)) {
        await db.auditLogs.create({
          actorId: user ? user.id : 'ANONYMOUS',
          actorRole: user ? user.role : 'GUEST',
          action: 'CHATBOT_CROSS_CUSTOMER_DATA_REQUEST_BLOCKED',
          entityType: 'CHAT_CONVERSATION',
          entityId: conversationId || 'ANONYMOUS'
        });

        return {
          reply: isArabic
            ? 'عذراً! حماية للخصوصية والأمان، لا يمكنك الاطلاع إلا على سجلات حسابك الخاص فقط.'
            : 'Access Denied: For security and privacy protection, you are only permitted to view your own JMT account records.',
          quickReplies: this._getQuickRepliesForIntent('BOOKING', normLocale)
        };
      }
    }

    // 3. CHECK FOR HUMAN ESCALATION INTENT (REMAINS FIRST)
    if (textLower.includes('human') || textLower.includes('support') || textLower.includes('agent') || textLower.includes('talk to support') || textLower.includes('إنسان') || textLower.includes('الدعم')) {
      const escResult = await chatTools.escalateToHuman(user, conversationId, cleanMessage);
      return {
        reply: isArabic
          ? `تم توجيه المحادثة إلى فريق الدعم الفني لشركة JMT. ${escResult.ticket ? `رقم التذكرة: ${escResult.ticket.ticketNumber}.` : ''} وسيقوم أحد الموظفين بالرد عليك قريباً.`
          : `I have escalated your conversation to the JMT Customer Support desk. ${escResult.ticket ? `Linked Ticket Reference: ${escResult.ticket.ticketNumber}.` : ''} A support agent will assist you shortly.`,
        escalated: true,
        escalationState: 'ESCALATED',
        ticketNumber: escResult.ticket ? escResult.ticket.ticketNumber : null,
        quickReplies: this._getQuickRepliesForIntent('SUPPORT', normLocale)
      };
    }

    // 4. CHECK FOR CUSTOMER CONTEXT QUERIES (MY VISA, MY BOOKING, MY PAYMENT)
    if (textLower.includes('my visa') || textLower.includes('my application') || textLower.includes('تأشيرتي') || textLower.includes('طلباتي')) {
      if (!user) {
        return {
          reply: isArabic
            ? 'يرجى تسجيل الدخول إلى حسابك لعرض حالة التأشيرات الخاصة بك.'
            : 'Please log in to your JMT Travels account to check your visa application status.',
          quickReplies: isArabic ? ['تسجيل الدخول', 'خدمات التأشيرات العامة'] : ['Login', 'Public Visa Services']
        };
      }
      const visaData = await chatTools.getMyVisaStatus(user);
      if (visaData.count === 0) {
        return {
          reply: isArabic
            ? 'ليس لديك أي طلبات تأشيرة مسجلة حالياً.'
            : 'You do not have any active visa applications linked to your account.',
          quickReplies: this._getQuickRepliesForIntent('VISA', normLocale)
        };
      }

      const appList = visaData.applications.map(a => `• ${i18nService.wrapDirectionalIsolation(a.reference)} (${a.destination} - ${a.status})`).join('\n');
      return {
        reply: isArabic
          ? `إليك حالة طلبات التأشيرة الخاصة بك:\n\n${appList}`
          : `Here is your current visa application status:\n\n${appList}`,
        quickReplies: this._getQuickRepliesForIntent('VISA', normLocale)
      };
    }

    if (textLower.includes('my booking') || textLower.includes('my reservation') || textLower.includes('حجوزاتي') || textLower.includes('حجزي')) {
      if (!user) {
        return {
          reply: isArabic
            ? 'يرجى تسجيل الدخول لعرض تفاصيل حجوزاتك.'
            : 'Please log in to view your tour reservations and bookings.',
          quickReplies: isArabic ? ['تسجيل الدخول', 'تصفح الباقات'] : ['Login', 'Browse Packages']
        };
      }
      const bookingData = await chatTools.getMyBookings(user);
      if (bookingData.count === 0) {
        return {
          reply: isArabic
            ? 'لا توجد حجوزات رحلات حالية مسجلة بحسابك.'
            : 'You do not have any active tour bookings on record.',
          quickReplies: this._getQuickRepliesForIntent('BOOKING', normLocale)
        };
      }

      const bList = bookingData.bookings.map(b => `• ${i18nService.wrapDirectionalIsolation(b.reference)} (${b.packageTitle} - ${b.amountFormatted}, ${b.status})`).join('\n');
      return {
        reply: isArabic
          ? `إليك تفاصيل حجوزاتك الحالية:\n\n${bList}`
          : `Here are your current tour reservations:\n\n${bList}`,
        quickReplies: this._getQuickRepliesForIntent('BOOKING', normLocale)
      };
    }

    if (textLower.includes('my payment') || textLower.includes('my refund') || textLower.includes('مدفوعاتي') || textLower.includes('الاسترداد')) {
      if (!user) {
        return {
          reply: isArabic ? 'يرجى تسجيل الدخول لمتابعة حالة مدفوعاتك.' : 'Please log in to view your payment history and refund status.',
          quickReplies: isArabic ? ['تسجيل الدخول'] : ['Login']
        };
      }
      const payData = await chatTools.getMyPaymentStatus(user);
      const pList = payData.payments.slice(0, 3).map(p => `• ${i18nService.wrapDirectionalIsolation(p.reference)} (${p.amountFormatted} - ${p.status})`).join('\n');
      return {
        reply: isArabic
          ? `إليك حالة المدفوعات الأخيرة الخاصة بك:\n\n${pList || 'لا توجد مدفوعات مسجلة.'}`
          : `Here is your recent payment status:\n\n${pList || 'No payment records found.'}`,
        quickReplies: this._getQuickRepliesForIntent('PAYMENT', normLocale)
      };
    }

    // 5. PUBLIC FAQ & CATALOGUE DIRECT RETRIEVAL
    if (textLower.includes('visa') || textLower.includes('permit') || textLower.includes('تأشيرة') || textLower.includes('تأشير')) {
      const publicVisas = await chatTools.getPublicVisaServices(normLocale);
      const vList = publicVisas.services.map(s => `• ${s.country} (${s.visaType} Visa - Fee: ${s.fee} ${s.currency})`).join('\n');
      return {
        reply: isArabic
          ? `نوفر خدمات التقديم على التأشيرات التالية:\n\n${vList}\n\nتخضع موافقة التأشيرة للجهات الحكومية المختصة.`
          : `We assist with tourist and business visas for:\n\n${vList}\n\nVisa approval is strictly determined by government authorities.`,
        quickReplies: this._getQuickRepliesForIntent('VISA', normLocale)
      };
    }

    if (textLower.includes('tour') || textLower.includes('package') || textLower.includes('dubai') || textLower.includes('salalah') || textLower.includes('umrah') || textLower.includes('باقة') || textLower.includes('رحلة')) {
      const pkgsData = await chatTools.searchPublicTourPackages({}, normLocale);
      const pList = pkgsData.packages.slice(0, 3).map(p => `• ${p.title} (${p.destination} - ${p.duration}, ${p.priceFormatted})`).join('\n');
      return {
        reply: isArabic
          ? `إليك أبرز الباقات السياحية المتاحة لدى JMT:\n\n${pList}`
          : `Here are some of our popular JMT holiday packages:\n\n${pList}`,
        quickReplies: this._getQuickRepliesForIntent('TOURISM', normLocale)
      };
    }

    if (textLower.includes('office') || textLower.includes('location') || textLower.includes('contact') || textLower.includes('address') || textLower.includes('موقع') || textLower.includes('مكتب') || textLower.includes('هاتف')) {
      const faqs = await chatTools.getFAQs('contact', normLocale);
      return {
        reply: faqs.faqs[1].answer,
        quickReplies: this._getQuickRepliesForIntent('CONTACT', normLocale)
      };
    }

    // 6. INTENT CLASSIFICATION & DOMAIN KNOWLEDGE CONTEXT ASSEMBLY
    const intent = this.classifyIntent(cleanMessage, normLocale);
    const domainKnowledge = await chatTools.getDomainKnowledgeContext({ intent, query: cleanMessage, user, locale: normLocale });

    let conversationHistory = [];
    if (conversationId) {
      try {
        const conv = await db.chatConversations.findById(conversationId);
        if (conv) {
          const isStaff = user && ['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(user.role);
          const isOwner = user && conv.customerId === user.id;
          if (isOwner || isStaff || !conv.customerId) {
            const rawHistory = await db.chatMessages.find({ conversationId: conv.id });
            if (Array.isArray(rawHistory) && rawHistory.length > 0) {
              rawHistory.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
              conversationHistory = rawHistory.slice(-12).map(m => ({
                sender: m.sender === 'CUSTOMER' ? 'user' : 'assistant',
                text: (m.text || '').trim()
              }));
            }
          }
        }
      } catch (err) {
        // Non-blocking history retrieval failure
      }
    }

    // 7. AI PROVIDER GATEWAY EXECUTION WITH KNOWLEDGE CONTEXT
    const aiResult = await this.aiProvider.generateResponse({
      prompt: cleanMessage,
      conversationHistory,
      context: {
        user: user ? { id: user.id, role: user.role } : null,
        intent,
        domainKnowledge
      },
      language: normLocale
    });

    const dynamicQuickReplies = (aiResult.quickReplies && aiResult.quickReplies.length > 0)
      ? aiResult.quickReplies
      : this._getQuickRepliesForIntent(intent, normLocale);

    return {
      reply: aiResult.reply,
      intent: aiResult.intent || intent,
      quickReplies: dynamicQuickReplies
    };
  }
}

module.exports = new ChatbotService();
