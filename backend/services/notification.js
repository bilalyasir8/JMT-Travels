/**
 * JMT TRAVELS — Production Notification & Communication System
 * Supports Modular Provider Architecture (Mock/Sandbox, Resend, AWS SES, SMS, WhatsApp),
 * HTML Email Templating with XSS Escaping, Event-Driven Dispatches, Failure Isolation,
 * Idempotency, and IDOR-Protected In-App Notification Management.
 */

const crypto = require('crypto');
const db = require('../db');

// Helper to escape dynamic user input in HTML templates (Prevents HTML Injection / XSS)
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

class NotificationProvider {
  constructor(name, channel) {
    this.name = name;
    this.channel = channel;
  }
  async send(data) {
    throw new Error('send method must be implemented by notification provider');
  }
  async getStatus(providerMessageId) {
    return { status: 'DELIVERED' };
  }
  verifyWebhookSignature(payload, signature) {
    return true;
  }
}

// 1. Mock / Sandbox Email Provider (Development & Test Suite Runner)
class MockEmailProvider extends NotificationProvider {
  constructor() {
    super('MOCK', 'EMAIL');
  }
  async send({ to, subject, html, text }) {
    console.log(`[Notification Engine - Email Sandbox] To: ${to} | Subject: ${subject}`);
    return { success: true, provider: 'MOCK', providerMessageId: `msg_mock_${Date.now()}` };
  }
}

// 2. Resend Email Provider Interface (PREPARED ONLY)
class ResendEmailProvider extends NotificationProvider {
  constructor() {
    super('RESEND', 'EMAIL');
    this.apiKey = process.env.RESEND_API_KEY;
    if (!this.apiKey) {
      throw new Error('[Notification Provider Config Error]: RESEND_API_KEY is missing in environment variables. Production fails safely.');
    }
  }
  async send({ to, subject, html, text }) {
    return { success: true, provider: 'RESEND', providerMessageId: `resend_${Date.now()}` };
  }
}

// 3. AWS SES Email Provider Interface (PREPARED ONLY)
class SESEmailProvider extends NotificationProvider {
  constructor() {
    super('SES', 'EMAIL');
    this.region = process.env.AWS_REGION;
    this.fromEmail = process.env.AWS_SES_FROM_EMAIL;
    if (!this.region || !this.fromEmail) {
      throw new Error('[Notification Provider Config Error]: Required AWS SES credentials (AWS_REGION, AWS_SES_FROM_EMAIL) are missing. Production fails safely.');
    }
  }
  async send({ to, subject, html, text }) {
    return { success: true, provider: 'SES', providerMessageId: `ses_${Date.now()}` };
  }
}

// 4. Mock SMS Provider
class MockSMSProvider extends NotificationProvider {
  constructor() {
    super('MOCK', 'SMS');
  }
  async send({ phone, message }) {
    console.log(`[Notification Engine - SMS Sandbox] To: ${phone} | Message: ${message}`);
    return { success: true, provider: 'MOCK', providerMessageId: `sms_mock_${Date.now()}` };
  }
}

// 5. Mock WhatsApp Provider
class MockWhatsAppProvider extends NotificationProvider {
  constructor() {
    super('MOCK', 'WHATSAPP');
  }
  async send({ phone, message }) {
    console.log(`[Notification Engine - WhatsApp Sandbox] To: ${phone} | Message: ${message}`);
    return { success: true, provider: 'MOCK', providerMessageId: `wa_mock_${Date.now()}` };
  }
}

class NotificationService {
  constructor() {
    // 1. Email Provider Selection Factory
    const emailProviderType = (process.env.EMAIL_PROVIDER || 'mock').toLowerCase();
    if (emailProviderType === 'resend') {
      this.emailProvider = new ResendEmailProvider();
    } else if (emailProviderType === 'ses' || emailProviderType === 'aws_ses') {
      this.emailProvider = new SESEmailProvider();
    } else {
      this.emailProvider = new MockEmailProvider();
    }

    // 2. SMS & WhatsApp Providers
    this.smsProvider = new MockSMSProvider();
    this.whatsAppProvider = new MockWhatsAppProvider();
  }

  /**
   * JMT Travels Branded HTML Email Template Engine
   */
  renderEmailTemplate(templateName, data) {
    const { title, message, recipientName, reference, buttonText, buttonUrl, detailKey, detailValue, locale } = data;
    const isArabic = locale === 'ar';

    const safeTitle = escapeHTML(title);
    const safeMessage = escapeHTML(message);
    const safeName = escapeHTML(recipientName || (isArabic ? 'العميل العزيز' : 'Valued Customer'));
    const safeRef = escapeHTML(reference || '');
    const safeButtonText = escapeHTML(buttonText || '');
    const safeButtonUrl = escapeHTML(buttonUrl || '');
    const safeDetailKey = escapeHTML(detailKey || '');
    const safeDetailValue = escapeHTML(detailValue || '');

    const dir = isArabic ? 'rtl' : 'ltr';
    const align = isArabic ? 'right' : 'left';
    const borderProp = isArabic ? 'border-right: 4px solid #1E2B6D;' : 'border-left: 4px solid #1E2B6D;';

    const greeting = isArabic ? `مرحباً <strong>${safeName}</strong>،` : `Hello <strong>${safeName}</strong>,`;
    const refLabel = isArabic ? 'رقم المرجع:' : 'Reference Number:';
    const footerText1 = isArabic ? 'شركة جي إم تي للسفر والسياحة · مسقط، سلطنة عمان' : 'JMT Travel & Tourism LLC · Muscat, Sultanate of Oman';
    const footerText2 = isArabic ? 'الهاتف: +968 25655177 / +968 25655711 · واتساب: +968 9760 8999 · البريد: support@jmttravels.com' : 'Phone: +968 25655177 / +968 25655711 · WhatsApp: +968 9760 8999 · Email: support@jmttravels.com';

    const htmlBody = `
      <!DOCTYPE html>
      <html lang="${isArabic ? 'ar' : 'en'}" dir="${dir}">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${safeTitle}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FAF8F4; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #334155; direction: ${dir}; text-align: ${align};">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 30px auto; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); text-align: ${align};">
          <!-- Header -->
          <tr>
            <td style="background-color: #1E2B6D; padding: 24px 32px; text-align: ${align};">
              <h1 style="color: #FFFFFF; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">JMT TRAVELS</h1>
              <p style="color: #D97706; margin: 4px 0 0 0; font-size: 13px; font-weight: 600; text-transform: uppercase;">${isArabic ? 'خدمات التأشيرات والسياحة' : 'Visa &amp; Tour Services'}</p>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px; text-align: ${align};">
              <p style="font-size: 15px; margin-top: 0; color: #475569;">${greeting}</p>
              <h2 style="color: #1E2B6D; font-size: 18px; margin: 16px 0 12px 0;">${safeTitle}</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 20px;">${safeMessage}</p>
              ${safeRef ? `<div style="background-color: #F8FAFC; ${borderProp} padding: 12px 16px; margin: 20px 0; font-size: 14px;"><strong>${refLabel}</strong> <span dir="ltr" style="font-family: monospace; font-weight: 600; unicode-bidi: isolate; display: inline-block;">${safeRef}</span></div>` : ''}
              ${safeDetailKey ? `<div style="background-color: #FEF3C7; border: 1px solid #FDE68A; padding: 12px 16px; border-radius: 6px; margin: 16px 0; font-size: 14px; color: #92400E;"><strong>${safeDetailKey}:</strong> ${safeDetailValue}</div>` : ''}
              ${safeButtonText && safeButtonUrl ? `<div style="margin: 28px 0; text-align: ${align};"><a href="${safeButtonUrl}" style="background-color: #1E2B6D; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">${safeButtonText}</a></div>` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F1F5F9; padding: 20px 32px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; font-size: 12px; color: #64748B;">${footerText1}</p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748B;">${footerText2}</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return {
      subject: `[JMT TRAVELS] ${title}`,
      text: `${title}\n\n${message}${reference ? `\nReference: ${reference}` : ''}`,
      html: htmlBody
    };
  }

  /**
   * Event-Driven Dispatch Engine (Failure Isolated & Idempotent)
   */
  async dispatchEvent(eventName, payload = {}) {
    try {
      const { user, email, phone, reference, title, status, reason, token, amount, currency, documentType } = payload;
      const recipientEmail = email || user?.email;
      const recipientPhone = phone || user?.phone;
      const userId = user?.id || payload.userId;
      const recipientName = user?.name || payload.fullName || 'Valued Customer';

      // 1. IDEMPOTENCY CHECK: Prevent duplicate notification dispatches
      const eventKey = payload.idempotencyKey || (reference && userId ? `${eventName}:${userId}:${reference}:${status || ''}` : `${eventName}:${reference || userId || recipientEmail || Date.now()}`);
      if (payload.idempotencyKey || (payload.reference && payload.userId)) {
        const existingNotif = await db.notifications.findOne({ idempotencyKey: eventKey });
        if (existingNotif) {
          return { success: true, isDuplicate: true, message: 'Notification already dispatched.', notification: existingNotif };
        }
      }

      // 2. EVENT TEMPLATE CATALOGUE
      const catalogue = {
        USER_REGISTERED: {
          title: 'Welcome to JMT TRAVELS',
          message: 'Your account has been created successfully. Welcome to JMT Travel & Tourism.',
          category: 'ACCOUNT',
          priority: 'NORMAL',
          buttonText: 'Explore Travel Services',
          buttonUrl: 'https://jmttravels.com/login.html',
          actionUrl: '/account'
        },
        EMAIL_VERIFICATION: {
          title: 'Verify Your Email Address',
          message: `Please verify your email address to unlock full travel features. Your verification code:`,
          category: 'ACCOUNT',
          priority: 'NORMAL',
          detailKey: 'Verification Code',
          detailValue: token || 'N/A',
          actionUrl: '/account/profile'
        },
        PASSWORD_RESET: {
          title: 'Password Reset Request',
          message: 'A password reset was requested for your account. Please use the following code to reset your password:',
          category: 'ACCOUNT',
          priority: 'HIGH',
          detailKey: 'Reset Code',
          detailValue: token || 'N/A'
        },
        VISA_SUBMITTED: {
          title: 'Visa Application Received',
          message: `Your visa application (${reference || 'JMT-V'}) has been submitted. Our visa processing desk is reviewing your documents.`,
          category: 'VISA',
          priority: 'NORMAL',
          buttonText: 'Track Visa Status',
          buttonUrl: `https://jmttravels.com/track.html?ref=${reference || ''}`,
          actionUrl: '/account/visa'
        },
        VISA_APPLICATION_SUBMITTED: {
          title: 'Visa Application Received',
          message: `Your visa application (${reference || 'JMT-V'}) has been submitted. Our visa processing desk is reviewing your documents.`,
          category: 'VISA',
          priority: 'NORMAL',
          buttonText: 'Track Visa Status',
          buttonUrl: `https://jmttravels.com/track.html?ref=${reference || ''}`,
          actionUrl: '/account/visa'
        },
        VISA_STATUS_CHANGED: {
          title: 'Visa Application Updated',
          message: `Your visa application (${reference}) status is now: ${status || 'UNDER_REVIEW'}.`,
          category: 'VISA',
          priority: 'NORMAL',
          detailKey: 'New Status',
          detailValue: status || 'UNDER_REVIEW',
          actionUrl: '/account/visa'
        },
        ADDITIONAL_DOCUMENTS_REQUIRED: {
          title: 'Additional Visa Documents Required',
          message: `Our visa desk requires an additional document for application (${reference}).`,
          category: 'VISA',
          priority: 'HIGH',
          detailKey: 'Requested Document',
          detailValue: documentType || 'Identity Document',
          actionUrl: '/account/documents'
        },
        DOCUMENT_ACCEPTED: {
          title: 'Visa Document Accepted',
          message: `Your uploaded document for visa application (${reference || 'JMT-V'}) has been approved.`,
          category: 'VISA',
          priority: 'NORMAL',
          actionUrl: '/account/documents'
        },
        DOCUMENT_REJECTED: {
          title: 'Visa Document Requires Re-upload',
          message: `An uploaded document for visa application (${reference || 'JMT-V'}) was rejected. Please re-upload an updated copy.`,
          category: 'VISA',
          priority: 'HIGH',
          actionUrl: '/account/documents'
        },
        VISA_APPROVED: {
          title: 'Visa Application Approved!',
          message: `Great news! Your visa application (${reference}) has been APPROVED. You may now download your visa document.`,
          category: 'VISA',
          priority: 'HIGH',
          buttonText: 'Download Visa',
          buttonUrl: `https://jmttravels.com/track.html?ref=${reference || ''}`,
          actionUrl: '/account/visa'
        },
        VISA_REJECTED: {
          title: 'Visa Application Update',
          message: `Your visa application (${reference}) was not approved. Reason: ${reason || 'Document requirements incomplete.'}`,
          category: 'VISA',
          priority: 'HIGH',
          actionUrl: '/account/visa'
        },
        TOUR_BOOKING_CREATED: {
          title: 'Tour Booking Received',
          message: `Your tour booking request (${reference}) for ${title || 'your holiday trip'} has been received. Total amount: ${amount || 0} ${currency || 'OMR'}.`,
          category: 'TOUR',
          priority: 'NORMAL',
          actionUrl: '/account/my-trips'
        },
        TOUR_BOOKING_CONFIRMED: {
          title: 'Tour Booking Confirmed!',
          message: `Your tour booking (${reference}) for ${title || 'your holiday trip'} is CONFIRMED! We wish you a wonderful journey.`,
          category: 'TOUR',
          priority: 'HIGH',
          actionUrl: '/account/my-trips'
        },
        TOUR_BOOKING_STATUS_CHANGED: {
          title: 'Tour Booking Status Changed',
          message: `Your booking (${reference}) status has been updated to: ${status || 'PROCESSING'}.`,
          category: 'TOUR',
          priority: 'NORMAL',
          actionUrl: '/account/my-trips'
        },
        HOTEL_INQUIRY_CREATED: {
          title: 'Hotel Consultation Request Received',
          message: `Your hotel consultation request (${reference}) for ${payload.destination || 'your destination'} has been received. Our concierge team is preparing your proposal.`,
          category: 'HOTEL',
          priority: 'NORMAL',
          actionUrl: '/account/travel-requests'
        },
        HOTEL_INQUIRY_STATUS_UPDATED: {
          title: 'Hotel Inquiry Updated',
          message: `Your hotel inquiry (${reference}) status has been updated to: ${status || 'IN_REVIEW'}.`,
          category: 'HOTEL',
          priority: 'NORMAL',
          actionUrl: '/account/travel-requests'
        },
        FLIGHT_INQUIRY_CREATED: {
          title: 'Flight Consultation Request Received',
          message: `Your flight consultation request (${reference}) for ${payload.destination || 'your destination'} has been received. Our flight specialists are curating options.`,
          category: 'FLIGHT',
          priority: 'NORMAL',
          actionUrl: '/account/travel-requests'
        },
        FLIGHT_INQUIRY_STATUS_UPDATED: {
          title: 'Flight Inquiry Updated',
          message: `Your flight inquiry (${reference}) status has been updated to: ${status || 'IN_REVIEW'}.`,
          category: 'FLIGHT',
          priority: 'NORMAL',
          actionUrl: '/account/travel-requests'
        },
        PAYMENT_SUCCESSFUL: {
          title: 'Payment Receipt Confirmed',
          message: `Payment of ${amount || 0} ${currency || 'OMR'} for reference ${reference} was completed successfully.`,
          category: 'PAYMENT',
          priority: 'NORMAL',
          actionUrl: '/account/my-trips'
        },
        PAYMENT_FAILED: {
          title: 'Payment Unsuccessful',
          message: `Payment attempt for reference ${reference} failed. Reason: ${reason || 'Transaction declined.'}`,
          category: 'PAYMENT',
          priority: 'HIGH',
          actionUrl: '/account/my-trips'
        },
        REFUND_REQUESTED: {
          title: 'Refund Request Created',
          message: `A refund request of ${amount || 0} ${currency || 'OMR'} has been logged for reference ${reference}.`,
          category: 'PAYMENT',
          priority: 'NORMAL',
          actionUrl: '/account/my-trips'
        },
        SUPPORT_TICKET_CREATED: {
          title: 'Support Ticket Logged',
          message: `Your support ticket (${reference || 'Support'}) has been logged with JMT concierge.`,
          category: 'SUPPORT',
          priority: 'NORMAL',
          actionUrl: '/account'
        },
        SUPPORT_TICKET_REPLY: {
          title: 'Support Ticket Reply',
          message: `JMT Support has replied to your ticket (${reference || 'Support'}).`,
          category: 'SUPPORT',
          priority: 'NORMAL',
          actionUrl: '/account'
        },
        SUPPORT_TICKET_UPDATED: {
          title: 'Support Ticket Response',
          message: `JMT Support has responded to your ticket (${reference || 'Support'}).`,
          category: 'SUPPORT',
          priority: 'NORMAL',
          actionUrl: '/account'
        },
        CONTACT_INQUIRY_RECEIVED: {
          title: 'Inquiry Received',
          message: 'Thank you for reaching out to JMT Travels. Our travel desk will respond within 24 hours.',
          category: 'SYSTEM',
          priority: 'NORMAL',
          actionUrl: '/account'
        }
      };

      const templateConfig = catalogue[eventName] || {
        title: eventName.replace(/_/g, ' '),
        message: `Notification update for reference ${reference || 'JMT'}.`,
        category: 'SYSTEM',
        priority: 'NORMAL',
        actionUrl: '/account'
      };

      // Render Email Content
      const renderedEmail = this.renderEmailTemplate(eventName, {
        ...templateConfig,
        recipientName,
        reference
      });

      // 3. PERSIST IN-APP NOTIFICATION
      let inAppNotif = null;
      if (userId) {
        inAppNotif = await db.notifications.create({
          id: `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          userId,
          channel: 'IN_APP',
          type: eventName,
          category: payload.category || templateConfig.category || 'SYSTEM',
          priority: payload.priority || templateConfig.priority || 'NORMAL',
          title: payload.title || templateConfig.title,
          message: payload.message || templateConfig.message,
          reference: reference || payload.reference || null,
          actionUrl: payload.actionUrl || templateConfig.actionUrl || null,
          entityType: payload.entityType || null,
          entityId: payload.entityId || reference || null,
          status: 'DELIVERED',
          read: false,
          provider: 'INTERNAL',
          idempotencyKey: eventKey
        });
      }

      // 4. DISPATCH EMAIL VIA PROVIDER (FAILURE ISOLATED)
      if (recipientEmail) {
        try {
          await this.emailProvider.send({
            to: recipientEmail,
            subject: renderedEmail.subject,
            text: renderedEmail.text,
            html: renderedEmail.html
          });
        } catch (emailErr) {
          console.error(`[Notification Failure Isolated - Email]: ${emailErr.message}`);
        }
      }

      // 5. DISPATCH WHATSAPP VIA PROVIDER (FAILURE ISOLATED)
      if (recipientPhone) {
        try {
          await this.whatsAppProvider.send({
            phone: recipientPhone,
            message: `${templateConfig.title}: ${templateConfig.message}`
          });
        } catch (waErr) {
          console.error(`[Notification Failure Isolated - WhatsApp]: ${waErr.message}`);
        }
      }

      return {
        success: true,
        notification: inAppNotif
      };
    } catch (err) {
      // FAILURE ISOLATION: Notification errors NEVER crash the calling business transaction!
      console.error('[Notification Dispatch Isolated Error]:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Helper: Format Sanitized Customer Notification DTO
   */
  formatCustomerNotificationDTO(n) {
    return formatCustomerNotificationDTO(n);
  }

  /**
   * List In-App Notifications for Authenticated User (IDOR Isolated)
   */
  async listInAppNotifications({ userId, page = 1, limit = 20, unreadOnly = false, category = null }) {
    if (!userId) throw new Error('User ID is required to list notifications.');

    let userNotifs = await db.notifications.find({ userId });

    // Category filter if specified
    if (category && String(category).trim().toUpperCase() !== 'ALL') {
      const catUpper = String(category).trim().toUpperCase();
      userNotifs = userNotifs.filter(n => (n.category || 'SYSTEM').toUpperCase() === catUpper);
    }

    const unreadCount = userNotifs.filter(n => !n.read).length;

    // Unread filter if requested
    if (String(unreadOnly) === 'true') {
      userNotifs = userNotifs.filter(n => n.read === false);
    }

    userNotifs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const total = userNotifs.length;
    const paginated = userNotifs.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return {
      notifications: paginated.map(formatCustomerNotificationDTO),
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    };
  }

  /**
   * Mark In-App Notification as Read (IDOR Isolated)
   */
  async markAsRead(notificationId, userId) {
    if (!notificationId) throw new Error('Notification ID is required.');
    if (!userId) throw new Error('User ID is required.');

    const notif = await db.notifications.findById(notificationId) || await db.notifications.findOne({ id: notificationId });
    if (!notif) throw new Error('Notification not found.');

    if (notif.userId !== userId) {
      throw new Error('Permission Denied: You do not own this notification.');
    }

    const updated = await db.notifications.update(notif.id, {
      read: true,
      readAt: new Date()
    });

    return formatCustomerNotificationDTO(updated);
  }

  /**
   * Mark All In-App Notifications as Read for User
   */
  async markAllAsRead(userId) {
    if (!userId) throw new Error('User ID is required.');
    const userNotifs = await db.notifications.find({ userId, read: false });
    const now = new Date();

    for (const n of userNotifs) {
      await db.notifications.update(n.id, { read: true, readAt: now });
    }

    return { success: true, count: userNotifs.length, updatedCount: userNotifs.length, unreadCount: 0 };
  }
}

function formatCustomerNotificationDTO(n) {
  if (!n) return null;
  const isRead = typeof n.read === 'boolean' ? n.read : !!n.isRead;
  return {
    id: n.id || (n._id ? n._id.toString() : ''),
    type: n.type || 'SYSTEM_NOTIFICATION',
    category: n.category || 'SYSTEM',
    title: n.title || '',
    message: n.message || '',
    reference: n.reference || (n.entityId ? String(n.entityId) : null),
    entityType: n.entityType || null,
    entityId: n.entityId || null,
    actionUrl: n.actionUrl || null,
    priority: n.priority || 'NORMAL',
    isRead: isRead,
    read: isRead,
    createdAt: n.createdAt || null,
    readAt: n.readAt || null
  };
}

module.exports = new NotificationService();
