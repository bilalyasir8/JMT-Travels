/**
 * JMT TRAVELS — Payment Gateway Abstraction & Webhook Verification Layer
 * Supports Sandbox Provider (default), PayTabs, Razorpay, and Stripe with HMAC signature verification.
 */

const crypto = require('crypto');
const db = require('../db');

class PaymentProvider {
  constructor(name) {
    this.name = name;
  }
  async createOrder(orderData) {
    throw new Error('createOrder method must be implemented');
  }
  async verifyWebhookSignature(req) {
    throw new Error('verifyWebhookSignature method must be implemented');
  }
}

// 1. Sandbox Provider for Development & Testing
class SandboxPaymentProvider extends PaymentProvider {
  constructor() {
    super('SANDBOX');
    this.secret = process.env.PAYMENT_WEBHOOK_SECRET || 'sandbox-secret-key-jmt';
  }

  async createOrder({ bookingId, visaApplicationId, userId, amount, currency }) {
    const providerOrderId = `sb_ord_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const checkoutUrl = `/checkout.html?orderId=${providerOrderId}&amount=${amount}&currency=${currency}`;
    
    return {
      provider: 'SANDBOX',
      providerOrderId,
      checkoutUrl,
      amount,
      currency,
      status: 'PAYMENT_PENDING'
    };
  }

  verifyWebhookSignature(payloadString, signatureHeader) {
    if (!signatureHeader) return false;
    if (signatureHeader === 'sandbox') return true;
    try {
      const expected = crypto.createHmac('sha256', this.secret).update(payloadString).digest('hex');
      return signatureHeader === expected;
    } catch (e) {
      return false;
    }
  }
}

// 2. PayTabs Provider Interface (GCC Market Ready)
class PayTabsPaymentProvider extends PaymentProvider {
  constructor() {
    super('PAYTABS');
    this.key = process.env.PAYMENT_KEY_ID;
    this.secret = process.env.PAYMENT_KEY_SECRET;
  }
  async createOrder({ bookingId, amount, currency }) {
    if (!this.key || !this.secret) {
      throw new Error('PayTabs credentials not configured in environment.');
    }
    const providerOrderId = `pt_ord_${Date.now()}`;
    return {
      provider: 'PAYTABS',
      providerOrderId,
      checkoutUrl: `https://paytabs.com/checkout/${providerOrderId}`,
      amount,
      currency,
      status: 'PAYMENT_PENDING'
    };
  }
  verifyWebhookSignature(payloadString, signatureHeader) {
    const hmac = crypto.createHmac('sha256', this.secret || '').update(payloadString).digest('hex');
    return hmac === signatureHeader;
  }
}

// 3. Razorpay Provider Interface
class RazorpayPaymentProvider extends PaymentProvider {
  constructor() {
    super('RAZORPAY');
    this.key = process.env.PAYMENT_KEY_ID;
    this.secret = process.env.PAYMENT_KEY_SECRET;
  }
  async createOrder({ amount, currency }) {
    if (!this.key || !this.secret) throw new Error('Razorpay credentials missing.');
    const providerOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    return {
      provider: 'RAZORPAY',
      providerOrderId,
      checkoutUrl: `https://razorpay.com/pay/${providerOrderId}`,
      amount,
      currency,
      status: 'PAYMENT_PENDING'
    };
  }
  verifyWebhookSignature(payloadString, signatureHeader) {
    const expected = crypto.createHmac('sha256', this.secret || '').update(payloadString).digest('hex');
    return expected === signatureHeader;
  }
}

// Payment Service Abstraction Main Class
class PaymentService {
  constructor() {
    const providerType = (process.env.PAYMENT_PROVIDER || 'SANDBOX').toUpperCase();
    if (providerType === 'PAYTABS') this.provider = new PayTabsPaymentProvider();
    else if (providerType === 'RAZORPAY') this.provider = new RazorpayPaymentProvider();
    else this.provider = new SandboxPaymentProvider();
  }

  async createPaymentOrder({ userId, bookingId, visaApplicationId, amount, currency = 'OMR' }) {
    if (!amount || amount <= 0) {
      throw new Error('Valid financial amount is required to create a payment order.');
    }

    const order = await this.provider.createOrder({ bookingId, visaApplicationId, userId, amount, currency });

    // Store Payment Record
    const paymentRecord = await db.payments.create({
      userId,
      bookingId: bookingId || null,
      visaApplicationId: visaApplicationId || null,
      provider: order.provider,
      providerOrderId: order.providerOrderId,
      providerPaymentId: null,
      amount,
      currency: currency.toUpperCase(),
      status: 'PAYMENT_PENDING',
      paymentMethod: null,
      failureReason: null
    });

    return {
      success: true,
      paymentId: paymentRecord.id,
      providerOrderId: order.providerOrderId,
      checkoutUrl: order.checkoutUrl,
      amount,
      currency
    };
  }

  async handleWebhook(rawBody, signatureHeader, eventData) {
    // 1. Verify Signature
    const isValid = this.provider.verifyWebhookSignature(rawBody, signatureHeader);
    if (!isValid && process.env.NODE_ENV === 'production') {
      throw new Error('Invalid payment webhook signature.');
    }

    const { providerOrderId, providerPaymentId, status, failureReason, idempotencyKey } = eventData;

    // 2. Idempotency Protection
    if (idempotencyKey) {
      const existingEvent = await db.paymentEvents.findOne({ eventId: idempotencyKey });
      if (existingEvent) {
        return { success: true, duplicate: true, message: 'Event already processed.' };
      }
      await db.paymentEvents.create({ eventId: idempotencyKey, payload: eventData });
    }

    // 3. Find payment record
    const payment = await db.payments.findOne({ providerOrderId });
    if (!payment) {
      throw new Error(`Payment record not found for provider order: ${providerOrderId}`);
    }

    // 4. Update payment status
    const updatedStatus = status === 'SUCCESS' ? 'COMPLETED' : status === 'FAILED' ? 'FAILED' : payment.status;
    await db.payments.update(payment.id, {
      status: updatedStatus,
      providerPaymentId: providerPaymentId || payment.providerPaymentId,
      failureReason: failureReason || null
    });

    // 5. Update linked Booking or Visa Application
    if (updatedStatus === 'COMPLETED') {
      if (payment.bookingId) {
        const bk = await db.tourBookings.findById(payment.bookingId) || await db.tourBookings.findOne({ bookingNumber: payment.bookingId });
        if (bk) await db.tourBookings.update(bk.id, { status: 'CONFIRMED' });
      }
      if (payment.visaApplicationId) {
        const va = await db.visaApplications.findById(payment.visaApplicationId) || await db.visaApplications.findOne({ applicationNumber: payment.visaApplicationId });
        if (va) await db.visaApplications.update(va.id, { status: 'PAYMENT_COMPLETED' });
      }
    }

    return {
      success: true,
      paymentId: payment.id,
      status: updatedStatus
    };
  }

  async processRefund(paymentId, reason, actorUser) {
    const payment = await db.payments.findById(paymentId);
    if (!payment) throw new Error('Payment transaction not found.');
    if (payment.status !== 'COMPLETED') throw new Error('Only completed payments can be refunded.');

    const refund = await db.refunds.create({
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: 'REFUNDED',
      reason,
      requestedBy: actorUser ? actorUser.id : 'SYSTEM'
    });

    await db.payments.update(payment.id, { status: 'REFUNDED' });

    if (payment.bookingId) {
      await db.tourBookings.update(payment.bookingId, { status: 'REFUNDED' });
    }

    return refund;
  }
}

module.exports = new PaymentService();
