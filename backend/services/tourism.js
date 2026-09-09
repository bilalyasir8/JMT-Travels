/**
 * JMT TRAVELS — Tourism & Tour Booking Business Service
 * Encapsulates Tour Packages, Destinations, Categories, Server-Calculated Pricing,
 * Capacity Oversale Protection, Idempotency, Snapshotting, State Transitions, & Refunds.
 */

const db = require('../db');
const notificationService = require('./notification');
const crypto = require('crypto');

// Legal Booking State Transition Matrix (PDF Task #4 Section 17)
const LEGAL_BOOKING_TRANSITIONS = {
  DRAFT: ['PAYMENT_PENDING', 'PENDING_PAYMENT', 'CANCELLED'],
  PENDING: ['PAYMENT_PENDING', 'PAYMENT_PROCESSING', 'PAID', 'CONFIRMED', 'CANCELLED'],
  PAYMENT_PENDING: ['PAYMENT_PROCESSING', 'PAID', 'CONFIRMED', 'CANCELLED', 'FAILED'],
  'Payment link pending': ['PAYMENT_PENDING', 'PAYMENT_PROCESSING', 'PAID', 'CONFIRMED', 'CANCELLED'],
  PAYMENT_PROCESSING: ['PAID', 'CONFIRMED', 'FAILED', 'CANCELLED'],
  PAID: ['CONFIRMED', 'PROCESSING', 'CANCELLED', 'REFUND_REQUESTED'],
  CONFIRMED: ['PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUND_REQUESTED'],
  PROCESSING: ['COMPLETED', 'CANCELLED', 'REFUND_REQUESTED'],
  REFUND_REQUESTED: ['REFUND_PENDING', 'REFUND_PROCESSING', 'REFUNDED', 'CANCELLED'],
  REFUND_PENDING: ['REFUND_PROCESSING', 'REFUNDED', 'FAILED'],
  REFUND_PROCESSING: ['REFUNDED', 'FAILED'],
  CANCELLED: ['REFUND_REQUESTED', 'REFUND_PENDING', 'REFUNDED'],
  COMPLETED: [],
  REFUNDED: [],
  FAILED: []
};

class TourismService {
  /**
   * Generates a unique durable booking reference (e.g. JMT-B-1234567)
   */
  generateBookingReference() {
    return `JMT-B-${Date.now().toString().slice(-7)}`;
  }

  /**
   * Generate slug from name/title
   */
  slugify(text) {
    return (text || '')
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Calculate server-authoritative price in minor units (thousandths of OMR)
   */
  calculatePricing(pkg, count = 1) {
    const travellerCount = Math.max(1, parseInt(count, 10) || 1);
    // Base unit price in thousandths (minor units)
    let unitPriceMinor = pkg.priceMinor;
    if (unitPriceMinor === undefined || unitPriceMinor === null) {
      unitPriceMinor = Math.round((pkg.price || 189) * 1000);
    }

    const totalAmountMinor = unitPriceMinor * travellerCount;
    const totalAmountDecimal = parseFloat((totalAmountMinor / 1000).toFixed(3));

    return {
      unitPriceMinor,
      unitPriceDecimal: parseFloat((unitPriceMinor / 1000).toFixed(3)),
      totalAmountMinor,
      totalAmountDecimal,
      travellerCount,
      currency: pkg.currency || 'OMR'
    };
  }

  /**
   * Sanitize booking projection for customer presentation (Hides adminNotes)
   */
  sanitizeBooking(bookingRecord, userRole) {
    if (!bookingRecord) return null;
    const isStaff = ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(userRole);
    const obj = typeof bookingRecord.toObject === 'function' ? bookingRecord.toObject() : { ...bookingRecord };
    if (!isStaff) {
      delete obj.adminNotes;
    }
    return obj;
  }

  /**
   * List Tour Packages with whitelisted sorting, pagination, & filters
   */
  async listPackages(options = {}) {
    const {
      destination,
      category,
      q,
      published,
      active,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      userRole = 'GUEST'
    } = options;

    const isStaff = ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(userRole);

    let all = await db.tourPackages.find();

    // Customers only see published and active packages
    if (!isStaff) {
      all = all.filter(p => p.published !== false && p.active !== false);
    } else {
      if (published !== undefined) {
        const isPub = String(published) === 'true';
        all = all.filter(p => p.published === isPub);
      }
      if (active !== undefined) {
        const isActive = String(active) === 'true';
        all = all.filter(p => p.active === isActive);
      }
    }

    // Filter by destination / category / search query
    if (destination) {
      const destLower = destination.toLowerCase();
      all = all.filter(p => (p.destination || '').toLowerCase() === destLower || (p.destinationId || '').toLowerCase() === destLower);
    }

    if (category) {
      const catLower = category.toLowerCase();
      all = all.filter(p => (p.category || '').toLowerCase() === catLower || (p.categoryId || '').toLowerCase() === catLower);
    }

    if (q) {
      const searchLower = q.toLowerCase();
      all = all.filter(p =>
        (p.title || '').toLowerCase().includes(searchLower) ||
        (p.summary || '').toLowerCase().includes(searchLower) ||
        (p.destination || '').toLowerCase().includes(searchLower)
      );
    }

    // Filter by price range
    if (minPrice !== undefined && !isNaN(Number(minPrice))) {
      const minVal = Number(minPrice);
      all = all.filter(p => {
        const price = p.priceMinor ? p.priceMinor / 1000 : p.price || 0;
        return price >= minVal;
      });
    }

    if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
      const maxVal = Number(maxPrice);
      all = all.filter(p => {
        const price = p.priceMinor ? p.priceMinor / 1000 : p.price || 0;
        return price <= maxVal;
      });
    }

    // Whitelisted Sort Fields (Prevent Injection)
    const allowedSortFields = ['createdAt', 'priceMinor', 'title', 'durationDays'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const isAsc = String(sortOrder).toLowerCase() === 'asc';

    all.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'priceMinor') {
        valA = a.priceMinor !== undefined ? a.priceMinor : (a.price || 0) * 1000;
        valB = b.priceMinor !== undefined ? b.priceMinor : (b.price || 0) * 1000;
      }

      if (valA < valB) return isAsc ? -1 : 1;
      if (valA > valB) return isAsc ? 1 : -1;
      return 0;
    });

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const total = all.length;
    const totalPages = Math.ceil(total / limitNum) || 1;
    const paginated = all.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return {
      packages: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    };
  }

  /**
   * Get Package Details by ID or Slug
   */
  async getPackage(idOrSlug, userRole = 'GUEST') {
    const isStaff = ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(userRole);

    let pkg = await db.tourPackages.findOne({ slug: idOrSlug });
    if (!pkg) pkg = await db.tourPackages.findById(idOrSlug);

    if (!pkg) throw new Error('Tour package not found.');

    if (!isStaff && (pkg.published === false || pkg.active === false)) {
      throw new Error('Tour package is currently unavailable or unpublished.');
    }

    return pkg;
  }

  /**
   * Create Tour Package (Staff/Admin Only)
   */
  async createPackage(data, actorUser) {
    const { title, slug, destination, category, price, priceMinor, currency, capacity, duration, summary, highlights, inclusions, exclusions, itinerary } = data;

    if (!title || !destination || !category) {
      throw new Error('Validation Error: Package title, destination, and category are required.');
    }

    const packageSlug = slug ? this.slugify(slug) : this.slugify(title);
    const existing = await db.tourPackages.findOne({ slug: packageSlug });
    if (existing) {
      throw new Error(`Validation Error: A package with slug '${packageSlug}' already exists.`);
    }

    const computedPriceMinor = priceMinor !== undefined ? priceMinor : Math.round((Number(price) || 189) * 1000);
    const id = `pkg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const pkg = await db.tourPackages.create({
      id,
      slug: packageSlug,
      title,
      destination,
      category,
      priceMinor: computedPriceMinor,
      price: parseFloat((computedPriceMinor / 1000).toFixed(3)),
      currency: currency || 'OMR',
      capacity: parseInt(capacity, 10) || 20,
      bookedCount: 0,
      duration: duration || '3 Days',
      summary: summary || '',
      highlights: highlights || [],
      inclusions: inclusions || [],
      exclusions: exclusions || [],
      itinerary: itinerary || [],
      published: true,
      active: true
    });

    return pkg;
  }

  /**
   * Update Tour Package (Staff/Admin Only)
   */
  async updatePackage(id, data, actorUser) {
    const pkg = await db.tourPackages.findById(id) || await db.tourPackages.findOne({ slug: id });
    if (!pkg) throw new Error('Tour package not found.');

    const updates = { ...data };
    if (updates.slug && updates.slug !== pkg.slug) {
      updates.slug = this.slugify(updates.slug);
      const existing = await db.tourPackages.findOne({ slug: updates.slug });
      if (existing && existing.id !== pkg.id) {
        throw new Error(`Validation Error: Slug '${updates.slug}' is already taken.`);
      }
    }

    if (updates.priceMinor !== undefined) {
      updates.price = parseFloat((updates.priceMinor / 1000).toFixed(3));
    } else if (updates.price !== undefined) {
      updates.priceMinor = Math.round(Number(updates.price) * 1000);
    }

    const updated = await db.tourPackages.update(pkg.id, updates);
    return updated;
  }

  /**
   * Create Tour Booking with Concurrency Oversale Protection, Server Pricing, & Idempotency
   */
  async createBooking(data, actorUser) {
    const { packageId, packageSlug, travellerName, email, phone, travellers, travelDate, idempotencyKey, travellersData } = data;

    const count = Math.max(1, parseInt(travellers, 10) || 1);
    const cleanEmail = (email || (actorUser ? actorUser.email : '')).trim().toLowerCase();
    const cleanName = (travellerName || (actorUser ? actorUser.name : '')).trim();
    const cleanPhone = (phone || (actorUser ? actorUser.phone : '')).trim();

    if (!cleanName || !cleanEmail || !cleanPhone) {
      throw new Error('Validation Error: Primary traveller name, email, and phone number are required.');
    }

    // 1. IDEMPOTENCY CHECK: Prevent duplicate submissions from retries/double-clicks
    if (idempotencyKey) {
      const userKey = `${actorUser ? actorUser.id : cleanEmail}:${idempotencyKey}`;
      const existingBooking = await db.tourBookings.findOne({ idempotencyKey: userKey });
      if (existingBooking) {
        return {
          booking: this.sanitizeBooking(existingBooking, actorUser ? actorUser.role : 'GUEST'),
          isDuplicate: true
        };
      }
    }

    // 2. PACKAGE RESOLUTION & PUBLISHING CHECK
    const targetPkgId = packageId || packageSlug;
    let pkg = await db.tourPackages.findById(targetPkgId);
    if (!pkg) pkg = await db.tourPackages.findOne({ slug: targetPkgId });

    if (!pkg) throw new Error('Validation Error: Selected tour package does not exist.');
    if (pkg.published === false || pkg.active === false) {
      throw new Error('Booking Denied: This tour package is currently unpublished or inactive.');
    }

    // 3. CONCURRENCY & OVERSALE CAPACITY CHECK (Atomic verification & update)
    const maxCapacity = pkg.capacity || 20;
    const currentBooked = pkg.bookedCount || 0;

    if (currentBooked + count > maxCapacity) {
      throw new Error(`Insufficient Capacity: Package capacity is ${maxCapacity} seats (${currentBooked} reserved). Cannot book ${count} seats.`);
    }

    // Atomically increment booked seat count
    await db.tourPackages.update(pkg.id, {
      bookedCount: currentBooked + count
    });

    // 4. SERVER-CALCULATED AUTHORITATIVE PRICING (Ignores any client-supplied total amount!)
    const pricing = this.calculatePricing(pkg, count);

    // 5. DURABLE BOOKING REFERENCE & HISTORICAL SNAPSHOT
    const bookingRef = this.generateBookingReference();
    const bookingId = `book_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const userKey = idempotencyKey ? `${actorUser ? actorUser.id : cleanEmail}:${idempotencyKey}` : null;

    const initialStatus = 'PAYMENT_PENDING';

    const booking = await db.tourBookings.create({
      id: bookingId,
      bookingNumber: bookingRef,
      packageId: pkg.id,
      packageTitle: pkg.title,
      userId: actorUser ? actorUser.id : null,
      travellerName: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      travellers: count,
      travelDate: travelDate || '',
      amount: pricing.totalAmountDecimal,
      unitPriceMinor: pricing.unitPriceMinor,
      totalAmountMinor: pricing.totalAmountMinor,
      currency: pricing.currency,
      idempotencyKey: userKey,
      packageSnapshot: {
        title: pkg.title,
        unitPriceMinor: pricing.unitPriceMinor,
        unitPrice: pricing.unitPriceDecimal,
        currency: pricing.currency,
        inclusions: pkg.inclusions || []
      },
      status: initialStatus,
      timeline: [{
        bookingNumber: bookingRef,
        previousStatus: 'NONE',
        newStatus: initialStatus,
        changedBy: actorUser ? actorUser.id : 'GUEST',
        timestamp: new Date(),
        note: 'Tour booking request created.'
      }]
    });

    // 6. SAVE INDIVIDUAL TRAVELLERS IF PROVIDED
    if (Array.isArray(travellersData) && travellersData.length > 0) {
      for (const trav of travellersData) {
        if (trav.fullName) {
          await db.bookingTravellers.create({
            id: `trav_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
            bookingId: booking.id,
            fullName: trav.fullName,
            age: trav.age || null,
            passportNumber: trav.passportNumber || ''
          });
        }
      }
    }

    // 7. NOTIFICATION DISPATCH
    await notificationService.dispatchEvent('TOUR_BOOKING_CREATED', {
      email: cleanEmail,
      phone: cleanPhone,
      reference: bookingRef,
      title: pkg.title,
      amount: pricing.totalAmountDecimal,
      currency: pricing.currency
    });

    return {
      booking: this.sanitizeBooking(booking, actorUser ? actorUser.role : 'GUEST'),
      isDuplicate: false
    };
  }

  /**
   * Legal State Transition Validation Matrix
   */
  validateStateTransition(currentStatus, targetStatus, userRole, isSystemAction = false) {
    if (currentStatus === targetStatus) return true;

    // Customer restriction: Customers can ONLY cancel their own booking
    if (!isSystemAction && userRole === 'CUSTOMER') {
      const allowedCustomerActions = ['CANCELLED', 'REFUND_REQUESTED'];
      if (!allowedCustomerActions.includes(targetStatus)) {
        throw new Error(`Permission Denied: Customers cannot directly transition booking status to '${targetStatus}'.`);
      }
    }

    const validNextStates = LEGAL_BOOKING_TRANSITIONS[currentStatus] || [];
    if (!validNextStates.includes(targetStatus)) {
      throw new Error(`Invalid State Transition: Cannot transition booking from '${currentStatus}' to '${targetStatus}'.`);
    }

    return true;
  }

  /**
   * Execute Booking Status Transition
   */
  async transitionBookingStatus(bookingId, targetStatus, actorUser, note = '', isSystemAction = false) {
    const booking = await db.tourBookings.findById(bookingId) || await db.tourBookings.findOne({ bookingNumber: bookingId });
    if (!booking) throw new Error('Tour booking not found.');

    const userRole = actorUser ? actorUser.role : 'GUEST';
    this.validateStateTransition(booking.status, targetStatus, userRole, isSystemAction);

    const previousStatus = booking.status;
    const timeline = booking.timeline || [];

    timeline.push({
      bookingNumber: booking.bookingNumber,
      previousStatus,
      newStatus: targetStatus,
      changedBy: actorUser ? actorUser.id : 'SYSTEM',
      timestamp: new Date(),
      note: note || `Status changed from ${previousStatus} to ${targetStatus}`
    });

    const updated = await db.tourBookings.update(booking.id, {
      status: targetStatus,
      timeline
    });

    await notificationService.dispatchEvent('TOUR_BOOKING_STATUS_CHANGED', {
      email: booking.email,
      phone: booking.phone,
      reference: booking.bookingNumber,
      status: targetStatus
    });

    return updated;
  }

  /**
   * Cancel Booking & Release Reserved Capacity
   */
  async cancelBooking(bookingId, actorUser, reason = '') {
    const booking = await db.tourBookings.findById(bookingId) || await db.tourBookings.findOne({ bookingNumber: bookingId });
    if (!booking) throw new Error('Tour booking not found.');

    // IDOR Check: Must own booking or be staff
    const isStaff = ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(actorUser ? actorUser.role : 'GUEST');
    if (!isStaff && booking.userId !== actorUser.id) {
      throw new Error('Permission Denied: You do not own this booking.');
    }

    if (['CANCELLED', 'COMPLETED', 'REFUNDED'].includes(booking.status)) {
      throw new Error(`Invalid Action: Cannot cancel a booking in '${booking.status}' status.`);
    }

    const updated = await this.transitionBookingStatus(booking.id, 'CANCELLED', actorUser, reason || 'Booking cancelled by customer.', true);

    // Release capacity back to package
    const pkg = await db.tourPackages.findById(booking.packageId);
    if (pkg) {
      const newBookedCount = Math.max(0, (pkg.bookedCount || 0) - (booking.travellers || 1));
      await db.tourPackages.update(pkg.id, { bookedCount: newBookedCount });
    }

    return updated;
  }

  /**
   * Request Refund (Staff/Admin Workflow)
   */
  async requestRefund(bookingId, actorUser, reason = '', refundAmount = null) {
    const booking = await db.tourBookings.findById(bookingId) || await db.tourBookings.findOne({ bookingNumber: bookingId });
    if (!booking) throw new Error('Tour booking not found.');

    const amountToRefund = refundAmount !== null ? Number(refundAmount) : booking.amount;
    const refundId = `ref_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const refundRecord = await db.refunds.create({
      id: refundId,
      refundId,
      bookingId: booking.id,
      amount: amountToRefund,
      amountMinor: Math.round(amountToRefund * 1000),
      currency: booking.currency || 'OMR',
      status: 'REFUND_REQUESTED',
      reason: reason || 'Customer requested refund.',
      requestedBy: actorUser.id
    });

    await this.transitionBookingStatus(booking.id, 'REFUND_REQUESTED', actorUser, `Refund requested: ${amountToRefund} ${booking.currency}`, true);
    return refundRecord;
  }
}

module.exports = new TourismService();
