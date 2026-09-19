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
            ? '📍 مسقط، سلطنة عمان - بالقرب من دوار مازدا، بجوار مطعم يحيى، مبنى 512.\n📞 الهاتف: +968 25655177 / +968 25655711 | واتساب: +968 9760 8999'
            : '📍 Muscat, Sultanate of Oman (Near Mazda R/A, 512 Oman).\n📞 Phone: +968 25655177 / +968 25655711 | WhatsApp: +968 9760 8999'
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

  async getHotelInformation(locale = 'en') {
    const isArabic = locale === 'ar';
    return {
      success: true,
      hotels: [
        { name: 'Shangri-La Barr Al Jissah, Muscat', location: 'Muscat', rating: 5, category: 'Luxury Resort' },
        { name: 'Al Bustan Palace, a Ritz-Carlton Hotel', location: 'Muscat', rating: 5, category: 'Luxury Palace' },
        { name: 'Anantara Al Jabal Al Akhdar Resort', location: 'Nizwa / Green Mountain', rating: 5, category: 'Mountain Resort' },
        { name: 'Al Baleed Resort Salalah by Anantara', location: 'Salalah', rating: 5, category: 'Beachfront Resort' }
      ],
      info: {
        summary: isArabic
          ? 'تقدم JMT Travels استشارات وحجوزات الفنادق في مسقط، صلالة، دبي، والوجهات العالمية الأخرى، وتشمل الفنادق الفاخرة، المنتجات الشاطئية، والأجنحة العائلية.'
          : 'JMT Travels assists with hotel bookings in Muscat, Salalah, Dubai, and worldwide destinations, including luxury resorts, beachside properties, and family suites.',
        popularLocations: isArabic ? ['مسقط', 'صلالة', 'دبي', 'مكة المكرمة'] : ['Muscat', 'Salalah', 'Dubai', 'Makkah'],
        bookingGuidance: isArabic
          ? 'يمكنك تصفح الفنادق عبر صفحة الفنادق في موقعنا أو التواصل مع قسم الحجوزات لتخصيص إقامتك.'
          : 'You can browse hotel options on our Hotels page or contact our booking desk for custom arrangements.'
      }
    };
  }

  async getFlightInformation(locale = 'en') {
    const isArabic = locale === 'ar';
    return {
      success: true,
      routes: [
        { origin: 'Muscat (MCT)', destination: 'Dubai (DXB)', frequency: 'Daily Multiple Flights', averageDuration: '1h 10m' },
        { origin: 'Muscat (MCT)', destination: 'Salalah (SLL)', frequency: 'Daily Direct Flights', averageDuration: '1h 35m' },
        { origin: 'Muscat (MCT)', destination: 'Jeddah (JED)', frequency: 'Daily Flights', averageDuration: '3h 15m' }
      ],
      airlines: ['Oman Air', 'SalamAir', 'Flydubai', 'Emirates', 'Qatar Airways'],
      info: {
        summary: isArabic
          ? 'توفر JMT Travels خدمة إصدار وتأكيد تذاكر الطيران للرحلات الداخلية والدولية عبر الطيران العماني، طيران السلام، طيران الإمارات، والخطوط القطري وغيرها.'
          : 'JMT Travels provides flight ticketing services for domestic and international routes via Oman Air, SalamAir, Emirates, Qatar Airways, and major carriers.',
        hubs: isArabic ? ['مطار مسقط الدولي (MCT)', 'مطار صلالة (SLL)', 'مطار دبي الدولي (DXB)'] : ['Muscat International Airport (MCT)', 'Salalah Airport (SLL)', 'Dubai International Airport (DXB)'],
        bookingGuidance: isArabic
          ? 'يمكنك البحث عن الرحلات عبر صفحة الرحلات الجوية أو الاستفسار المباشر عبر موظفي الحجز.'
          : 'Search available flights via our Flights page or contact our ticketing team for flight availability and itineraries.'
      }
    };
  }

  async getTravelPlanningSuggestions({ duration, destination, budget, category } = {}, locale = 'en') {
    const isArabic = locale === 'ar';
    let pkgs = await db.tourPackages.find({ published: true });

    if (destination) {
      const rx = new RegExp(destination.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
      pkgs = pkgs.filter(p => rx.test(p.destination) || rx.test(p.title) || rx.test(p.summary || ''));
    }

    if (category) {
      const rxCat = new RegExp(category.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
      pkgs = pkgs.filter(p => rxCat.test(p.category || ''));
    }

    const suggestions = pkgs.slice(0, 4).map(p => ({
      id: p.id,
      title: p.title,
      destination: p.destination,
      duration: p.duration,
      summary: p.summary,
      priceFormatted: i18nService.formatCurrency(p.priceMinor || p.price * 1000, p.currency || 'OMR', locale)
    }));

    return {
      success: true,
      count: suggestions.length,
      suggestions,
      guidance: suggestions.length > 0
        ? (isArabic ? 'إليك الباقات المتاحة لتخطيط رحلتك لدى JMT:' : 'Here are available JMT holiday packages matching your travel plan:')
        : (isArabic ? 'لا تتوفر باقات جاهزة تطابق المعايير تماماً، لكن يمكننا تصميم برنامج سياحي مخصص لك عبر تواصلك مع موظف السفر.' : 'No pre-set packages match all exact parameters, but JMT can customize a travel itinerary for you upon request.')
    };
  }

  async getDomainKnowledgeContext({ intent, query = '', user = null, locale = 'en' }) {
    const context = {
      intent,
      locale,
      authenticated: !!user,
      publicData: {},
      userData: null
    };

    const qLower = (query || '').toLowerCase();

    // Fetch relevant public knowledge based on intent and query
    if (intent === 'VISA' || qLower.includes('visa') || qLower.includes('تأشير')) {
      const visas = await this.getPublicVisaServices(locale);
      context.publicData.visaServices = visas.services.slice(0, 5);
    }

    if (intent === 'TOURISM' || intent === 'TRAVEL_PLANNING' || qLower.includes('tour') || qLower.includes('package') || qLower.includes('باقة') || qLower.includes('رحلة')) {
      const pkgs = await this.searchPublicTourPackages({}, locale);
      context.publicData.packages = pkgs.packages.slice(0, 5);
      const dests = await this.searchPublicDestinations(locale);
      context.publicData.destinations = dests.destinations.slice(0, 5);
    }

    if (intent === 'HOTEL' || qLower.includes('hotel') || qLower.includes('فندق')) {
      const hotelInfo = await this.getHotelInformation(locale);
      context.publicData.hotelInfo = hotelInfo.info;
    }

    if (intent === 'FLIGHT' || qLower.includes('flight') || qLower.includes('ticket') || qLower.includes('طيران') || qLower.includes('رحلات')) {
      const flightInfo = await this.getFlightInformation(locale);
      context.publicData.flightInfo = flightInfo.info;
    }

    if (intent === 'CONTACT' || qLower.includes('office') || qLower.includes('location') || qLower.includes('contact') || qLower.includes('مكتب') || qLower.includes('موقع')) {
      const faqs = await this.getFAQs('contact', locale);
      context.publicData.contactFaqs = faqs.faqs;
    }

    // Include authorized user records ONLY if requested for own identity
    if (user && user.id) {
      if (intent === 'VISA' && (qLower.includes('my visa') || qLower.includes('تأشيرتي'))) {
        context.userData = { visaStatus: await this.getMyVisaStatus(user) };
      } else if (intent === 'BOOKING' && (qLower.includes('my booking') || qLower.includes('حجوزاتي'))) {
        context.userData = { bookings: await this.getMyBookings(user) };
      } else if (intent === 'PAYMENT' && (qLower.includes('my payment') || qLower.includes('مدفوعاتي'))) {
        context.userData = { payments: await this.getMyPaymentStatus(user) };
      }
    }

    return context;
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
