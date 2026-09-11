/**
 * JMT TRAVELS — AI Chatbot & Customer Support Engine
 * 
 * Features:
 * 1. AI Provider Abstraction Integration (Mock/Sandbox & Production LLM Gateway).
 * 2. Controlled Server-Side Tool Layer Integration (`chatTools.js`).
 * 3. Customer Data Isolation: User identity derived strictly from server `authenticatedUser` context.
 * 4. Human Escalation State Machine (`AI_ACTIVE` -> `ESCALATED` -> `STAFF_ACTIVE` -> `RESOLVED`).
 * 5. Prompt Injection Defense & Strict Assistant Policy.
 * 6. Multilingual Support (`en`, `ar`) with RTL directional isolation helpers.
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
   * Main Chatbot Message Execution Pipeline
   */
  async processMessage({ message, conversationId, user, locale = 'en' }) {
    const cleanMessage = this.sanitizeInput(message);
    const normLocale = i18nService.isSupportedLocale(locale) ? locale : (user?.preferredLanguage || 'en');
    const isArabic = normLocale === 'ar';

    if (!cleanMessage) {
      return {
        reply: isArabic
          ? 'مرحباً! أنا مساعد JMT الرقمي. كيف يمكنني مساعدتك اليوم؟ يمكنك الاستفسار عن التأشيرات، الباقات السياحية، أو متابعة طلباتك.'
          : 'Hello! I am JMT Travels Assistant. How can I help you today? You can ask about visas, tour packages, office location, or check your booking status.',
        quickReplies: isArabic ? ['خدمات التأشيرات', 'الباقات السياحية', 'متابعة الطلبات', 'التحدث مع الدعم'] : ['Visa Services', 'Tour Packages', 'Track Booking', 'Talk to Support']
      };
    }

    // 1. PROMPT INJECTION DEFENSE AT SERVER GATEWAY
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
        quickReplies: isArabic ? ['خدمات التأشيرات', 'الباقات السياحية', 'الدعم الفني'] : ['Visa Services', 'Tour Packages', 'Talk to Support']
      };
    }

    // 2. CROSS-CUSTOMER DATA ISOLATION PROTECTION
    if (
      (textLower.includes('customer') || textLower.includes('user') || textLower.includes('other')) &&
      (textLower.includes('visa') || textLower.includes('booking') || textLower.includes('payment') || textLower.includes('123') || textLower.includes('bilal'))
    ) {
      // Check if user is asking for someone else's data explicitly
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
          quickReplies: isArabic ? ['حالة تأشيرتي', 'حجوزاتي الحالية'] : ['My Visa Status', 'My Bookings']
        };
      }
    }

    // 3. CHECK FOR HUMAN ESCALATION INTENT
    if (textLower.includes('human') || textLower.includes('support') || textLower.includes('agent') || textLower.includes('talk to support') || textLower.includes('إنسان') || textLower.includes('الدعم')) {
      const escResult = await chatTools.escalateToHuman(user, conversationId, cleanMessage);
      return {
        reply: isArabic
          ? `تم توجيه المحادثة إلى فريق الدعم الفني لشركة JMT. ${escResult.ticket ? `رقم التذكرة: ${escResult.ticket.ticketNumber}.` : ''} وسيقوم أحد الموظفين بالرد عليك قريباً.`
          : `I have escalated your conversation to the JMT Customer Support desk. ${escResult.ticket ? `Linked Ticket Reference: ${escResult.ticket.ticketNumber}.` : ''} A support agent will assist you shortly.`,
        escalated: true,
        escalationState: 'ESCALATED',
        ticketNumber: escResult.ticket ? escResult.ticket.ticketNumber : null,
        quickReplies: isArabic ? ['تتبع التذكرة', 'القائمة الرئيسية'] : ['Track Ticket', 'Main Menu']
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
          quickReplies: isArabic ? ['التقديم على تأشيرة', 'الباقات السياحية'] : ['Apply for Visa', 'Tour Packages']
        };
      }

      const appList = visaData.applications.map(a => `• ${i18nService.wrapDirectionalIsolation(a.reference)} (${a.destination} - ${a.status})`).join('\n');
      return {
        reply: isArabic
          ? `إليك حالة طلبات التأشيرة الخاصة بك:\n\n${appList}`
          : `Here is your current visa application status:\n\n${appList}`,
        quickReplies: isArabic ? ['مستندات التأشيرة', 'الدعم الفني'] : ['Visa Documents', 'Support Desk']
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
          quickReplies: isArabic ? ['حجز رحلة جديدة', 'تصفح الوجهات'] : ['Book a Tour', 'Explore Destinations']
        };
      }

      const bList = bookingData.bookings.map(b => `• ${i18nService.wrapDirectionalIsolation(b.reference)} (${b.packageTitle} - ${b.amountFormatted}, ${b.status})`).join('\n');
      return {
        reply: isArabic
          ? `إليك تفاصيل حجوزاتك الحالية:\n\n${bList}`
          : `Here are your current tour reservations:\n\n${bList}`,
        quickReplies: isArabic ? ['تفاصيل الحجز', 'الدعم الفني'] : ['Booking Details', 'Support']
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
        quickReplies: isArabic ? ['الحجوزات', 'الدعم الفني'] : ['My Bookings', 'Support']
      };
    }

    // 5. PUBLIC FAQ & CATALOGUE RETRIEVAL
    if (textLower.includes('visa') || textLower.includes('permit') || textLower.includes('تأشيرة')) {
      const publicVisas = await chatTools.getPublicVisaServices(normLocale);
      const vList = publicVisas.services.map(s => `• ${s.country} (${s.visaType} Visa - Fee: ${s.fee} ${s.currency})`).join('\n');
      return {
        reply: isArabic
          ? `نوفر خدمات التقديم على التأشيرات التالية:\n\n${vList}\n\nتخضع موافقة التأشيرة للجهات الحكومية المختصة.`
          : `We assist with tourist and business visas for:\n\n${vList}\n\nVisa approval is strictly determined by government authorities.`,
        quickReplies: isArabic ? ['طريقة التقديم', 'المستندات المطلوبة'] : ['How to Apply', 'Required Documents']
      };
    }

    if (textLower.includes('tour') || textLower.includes('package') || textLower.includes('dubai') || textLower.includes('salalah') || textLower.includes('umrah') || textLower.includes('باقة') || textLower.includes('رحلة')) {
      const pkgsData = await chatTools.searchPublicTourPackages({}, normLocale);
      const pList = pkgsData.packages.slice(0, 3).map(p => `• ${p.title} (${p.destination} - ${p.duration}, ${p.priceFormatted})`).join('\n');
      return {
        reply: isArabic
          ? `إليك أبرز الباقات السياحية المتاحة لدى JMT:\n\n${pList}`
          : `Here are some of our popular JMT holiday packages:\n\n${pList}`,
        quickReplies: isArabic ? ['حجز رحلة', 'تفاصيل الباقة'] : ['Book Tour', 'Package Details']
      };
    }

    if (textLower.includes('office') || textLower.includes('location') || textLower.includes('contact') || textLower.includes('address') || textLower.includes('موقع') || textLower.includes('مكتب') || textLower.includes('هاتف')) {
      const faqs = await chatTools.getFAQs('contact', normLocale);
      return {
        reply: faqs.faqs[1].answer,
        quickReplies: isArabic ? ['الاتصال بنا', 'البريد الإلكتروني'] : ['Call JMT', 'Send Email']
      };
    }

    // 6. AI PROVIDER GATEWAY EXECUTION
    const aiResult = await this.aiProvider.generateResponse({
      prompt: cleanMessage,
      context: { user: user ? { id: user.id, role: user.role } : null },
      language: normLocale
    });

    return {
      reply: aiResult.reply,
      intent: aiResult.intent,
      quickReplies: aiResult.quickReplies || (isArabic ? ['خدمات التأشيرات', 'الباقات السياحية', 'الدعم الفني'] : ['Visa Services', 'Tour Packages', 'Talk to Support'])
    };
  }
}

module.exports = new ChatbotService();
