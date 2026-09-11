/**
 * JMT TRAVELS — Server-Side Authorized Chat Tools Layer
 * 
 * Mandatory Security Boundaries:
 * 1. AI model has ZERO direct database query capabilities.
 * 2. Customer identity comes strictly from server authenticated user context (`req.user.id`).
 * 3. User-supplied customer IDs in chat text or tool arguments are IGNORED.
 * 4. Cross-customer data requests ("Show me customer 123's visa") are strictly rejected.
 */

const db = require('../db');
const visaService = require('./visa');
const tourismService = require('./tourism');
const paymentService = require('./payment');
const notificationService = require('./notification');
const i18nService = require('./i18n');

class ChatToolsService {
  // -------------------------------------------------------------
  // 1. PUBLIC KNOWLEDGE & CATALOG TOOLS
  // -------------------------------------------------------------
  async getFAQs(category = 'general', locale = 'en') {
    const isArabic = locale === 'ar';
    return {
      success: true,
      faqs: [
        {
          question: isArabic ? 'ما هي خدمات التأشيرات المتاحة؟' : 'What visa services do you offer?',
          answer: isArabic
            ? 'نقدم خدمة التقديم على تأشيرات الإمارات، السعودية، قطر، وعمان للأفراد والعائلات.'
            : 'We provide online visa assistance for UAE, Saudi Arabia, Qatar, and Oman tourist/business visas.'
        },
        {
          question: isArabic ? 'أين يقع مكتب JMT للسفر؟' : 'Where is the JMT Travels office located?',
          answer: isArabic
            ? '📍 مسقط، سلطنة عمان - بالقرب من دوار مازدا، بجوار مطعم يحيى، مبنى 512.\n📞 الهاتف: +968 7113 2424 | واتساب: +968 9760 8999'
            : '📍 Muscat, Sultanate of Oman (Near Mazda R/A, 512 Oman).\n📞 Phone: +968 7113 2424 | WhatsApp: +968 9760 8999'
        },
        {
          question: isArabic ? 'ما هي طرق الدفع المتاحة؟' : 'What payment methods are supported?',
          answer: isArabic
            ? 'ندعم بطاقات الخصم والائتمان عبر بوابة PayTabs و Thawani الآمنة (OMR, AED, SAR, USD, INR).'
            : 'We accept debit/credit cards via secure PayTabs & Thawani payment gateways.'
        }
      ]
    };
  }

  async getPublicVisaServices(locale = 'en') {
    const services = await db.visaServices.find({ published: true });
    return {
      success: true,
      services: services.map(s => ({
        id: s.id,
        country: s.country,
        visaType: s.visaType,
        fee: s.fee,
        currency: s.currency || 'OMR',
        processingTime: s.processingTime
      }))
    };
  }

  async searchPublicTourPackages({ destination, category } = {}, locale = 'en') {
    let pkgs = await db.tourPackages.find({ published: true });
    if (destination) {
      const rx = new RegExp(destination.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
      pkgs = pkgs.filter(p => rx.test(p.destination) || rx.test(p.title));
    }
    if (category) {
      pkgs = pkgs.filter(p => p.category === category);
    }
    return {
      success: true,
      packages: pkgs.map(p => ({
        id: p.id,
        title: p.title,
        destination: p.destination,
        duration: p.duration,
        priceFormatted: i18nService.formatCurrency(p.priceMinor || p.price * 1000, p.currency || 'OMR', locale)
      }))
    };
  }

  async searchPublicDestinations(locale = 'en') {
    const dests = await db.destinations.find({ published: true });
    return {
      success: true,
      destinations: dests.map(d => ({ id: d.id, name: d.name, country: d.country, description: d.description }))
    };
  }

  // -------------------------------------------------------------
  // 2. AUTHORIZED CUSTOMER CONTEXT TOOLS (IDENTITY ENFORCED)
  // -------------------------------------------------------------

  /**
   * Safe identity helper: Enforces req.user.id identity and blocks cross-customer access attempts.
   */
  _resolveCustomerIdentity(authenticatedUser, requestedTargetUserId = null) {
    if (!authenticatedUser || !authenticatedUser.id) {
      return { authorized: false, error: 'UNAUTHENTICATED', message: 'Please log in to your JMT account to view your private records.' };
    }

    // CROSS-CUSTOMER ISOLATION PROTECTION:
    // If an explicit target user ID was supplied and differs from the authenticated user, reject it!
    if (requestedTargetUserId && requestedTargetUserId !== authenticatedUser.id) {
      const isStaff = ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(authenticatedUser.role);
      if (!isStaff) {
        return { authorized: false, error: 'FORBIDDEN', message: 'Access denied: You can only view your own JMT account records.' };
      }
    }

    // Always use authenticated user's ID as authoritative target identity
    return { authorized: true, targetUserId: authenticatedUser.id, role: authenticatedUser.role };
  }

  async getMyVisaStatus(authenticatedUser, requestedTargetUserId = null) {
    const ident = this._resolveCustomerIdentity(authenticatedUser, requestedTargetUserId);
    if (!ident.authorized) return { success: false, error: ident.error, message: ident.message };

    const apps = await db.visaApplications.find({ userId: ident.targetUserId });
    return {
      success: true,
      count: apps.length,
      applications: apps.map(a => ({
        reference: a.applicationNumber,
        destination: a.destination,
        visaType: a.visaType,
        status: a.status,
        submittedAt: a.createdAt
      }))
    };
  }

  async getMyBookings(authenticatedUser, requestedTargetUserId = null) {
    const ident = this._resolveCustomerIdentity(authenticatedUser, requestedTargetUserId);
    if (!ident.authorized) return { success: false, error: ident.error, message: ident.message };

    const bookings = await db.tourBookings.find({ userId: ident.targetUserId });
    return {
      success: true,
      count: bookings.length,
      bookings: bookings.map(b => ({
        reference: b.bookingNumber,
        packageTitle: b.packageTitle,
        numberOfTravellers: b.numberOfTravellers,
        amountFormatted: i18nService.formatCurrency(b.totalAmountMinor || b.amount * 1000, b.currency || 'OMR'),
        status: b.status,
        createdAt: b.createdAt
      }))
    };
  }

  async getMyPaymentStatus(authenticatedUser, requestedTargetUserId = null) {
    const ident = this._resolveCustomerIdentity(authenticatedUser, requestedTargetUserId);
    if (!ident.authorized) return { success: false, error: ident.error, message: ident.message };

    const payments = await db.payments.find({ userId: ident.targetUserId });
    return {
      success: true,
      count: payments.length,
      payments: payments.map(p => ({
        reference: p.paymentNumber,
        amountFormatted: i18nService.formatCurrency(p.amountMinor, p.currency || 'OMR'),
        provider: p.provider,
        status: p.status,
        createdAt: p.createdAt
      }))
    };
  }

  async getMyRefundStatus(authenticatedUser, requestedTargetUserId = null) {
    const ident = this._resolveCustomerIdentity(authenticatedUser, requestedTargetUserId);
    if (!ident.authorized) return { success: false, error: ident.error, message: ident.message };

    const refunds = await db.refunds.find();
    const userRefunds = refunds.filter(r => r.userId === ident.targetUserId);

    return {
      success: true,
      count: userRefunds.length,
      refunds: userRefunds.map(r => ({
        refundId: r.id,
        paymentId: r.paymentId,
        amountFormatted: i18nService.formatCurrency(r.amountMinor, r.currency || 'OMR'),
        status: r.status,
        reason: r.reason
      }))
    };
  }

  async getMySupportTickets(authenticatedUser, requestedTargetUserId = null) {
    const ident = this._resolveCustomerIdentity(authenticatedUser, requestedTargetUserId);
    if (!ident.authorized) return { success: false, error: ident.error, message: ident.message };

    const tickets = await db.supportTickets.find({ userId: ident.targetUserId });
    return {
      success: true,
      count: tickets.length,
      tickets: tickets.map(t => ({
        reference: t.ticketNumber,
        subject: t.subject,
        category: t.category,
        status: t.status,
        createdAt: t.createdAt
      }))
    };
  }

  async getMyNotifications(authenticatedUser, requestedTargetUserId = null) {
    const ident = this._resolveCustomerIdentity(authenticatedUser, requestedTargetUserId);
    if (!ident.authorized) return { success: false, error: ident.error, message: ident.message };

    const notifs = await db.notifications.find({ userId: ident.targetUserId });
    return {
      success: true,
      count: notifs.length,
      notifications: notifs.slice(0, 10).map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt
      }))
    };
  }

  // -------------------------------------------------------------
  // 3. ACTION TOOLS (SUPPORT CREATION & HUMAN ESCALATION)
  // -------------------------------------------------------------

  async createSupportTicket(authenticatedUser, { subject, category, message, conversationId }) {
    if (!authenticatedUser || !authenticatedUser.id) {
      return { success: false, error: 'UNAUTHENTICATED', message: 'You must be logged in to open a support ticket.' };
    }

    const ticketNumber = `JMT-T-${Math.floor(100000 + Math.random() * 900000)}`;
    const ticket = await db.supportTickets.create({
      ticketNumber,
      userId: authenticatedUser.id,
      userName: authenticatedUser.name,
      userEmail: authenticatedUser.email,
      conversationId: conversationId || null,
      subject: (subject || 'Chatbot Inquiry').trim(),
      category: category || 'GENERAL',
      status: 'OPEN',
      message: (message || '').trim()
    });

    // Audit Logging
    await db.auditLogs.create({
      actorId: authenticatedUser.id,
      actorRole: authenticatedUser.role || 'CUSTOMER',
      action: 'CHATBOT_CREATED_SUPPORT_TICKET',
      entityType: 'SUPPORT_TICKET',
      entityId: ticket.id,
      metadata: { ticketNumber: ticket.ticketNumber, subject: ticket.subject }
    });

    // Non-blocking notification dispatch
    notificationService.dispatchEvent('SUPPORT_TICKET_CREATED', {
      user: authenticatedUser,
      reference: ticket.ticketNumber,
      title: `Support Ticket Received: ${ticket.subject}`,
      message: `Your support ticket (${ticket.ticketNumber}) has been submitted to JMT help desk.`
    }).catch(() => {});

    return {
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status
      },
      message: `Support ticket (${ticket.ticketNumber}) created successfully. A customer agent will respond shortly.`
    };
  }

  async escalateToHuman(authenticatedUser, conversationId, reason = 'Customer requested human assistance') {
    let conv = null;
    if (conversationId) {
      conv = await db.chatConversations.findOne({ conversationId }) || await db.chatConversations.findById(conversationId);
    }

    // Update conversation escalation state
    if (conv) {
      await db.chatConversations.update(conv.id, {
        escalationState: 'ESCALATED',
        lastMessageAt: new Date()
      });
    }

    // Create linked support ticket if user is authenticated
    let ticketResult = null;
    if (authenticatedUser && authenticatedUser.id) {
      ticketResult = await this.createSupportTicket(authenticatedUser, {
        subject: 'Chat Conversation Human Escalation',
        category: 'ESCALATION',
        message: reason,
        conversationId: conv ? conv.conversationId : conversationId
      });

      if (conv && ticketResult.success) {
        await db.chatConversations.update(conv.id, {
          escalatedTicketId: ticketResult.ticket.id
        });
      }
    }

    // Audit Logging
    await db.auditLogs.create({
      actorId: authenticatedUser ? authenticatedUser.id : 'ANONYMOUS_GUEST',
      actorRole: authenticatedUser ? authenticatedUser.role : 'GUEST',
      action: 'CHATBOT_HUMAN_ESCALATION',
      entityType: 'CHAT_CONVERSATION',
      entityId: conversationId || 'ANONYMOUS',
      metadata: { reason }
    });

    return {
      success: true,
      escalationState: 'ESCALATED',
      ticket: ticketResult ? ticketResult.ticket : null,
      message: 'Your conversation has been escalated to JMT support staff.'
    };
  }
}

module.exports = new ChatToolsService();
