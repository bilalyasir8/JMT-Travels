/**
 * JMT TRAVELS — Notification System Abstraction
 * Manages Email, SMS, WhatsApp, and In-App notification dispatches with event triggers.
 */

const nodemailer = require('nodemailer');
const db = require('../db');

class NotificationService {
  constructor() {
    this.transporter = this.initSMTP();
  }

  initSMTP() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;

    if (!host || !user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }

  async sendEmail({ to, subject, html, text }) {
    const from = process.env.EMAIL_FROM || '"JMT Travel & Tourism" <noreply@jmttravels.com>';
    
    if (!this.transporter) {
      console.log(`[Notification Engine - Email Sandbox] To: ${to} | Subject: ${subject}`);
      return { success: true, mode: 'sandbox' };
    }

    try {
      const info = await this.transporter.sendMail({ from, to, subject, html, text });
      console.log(`[Notification Engine - Email Sent] MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('[Notification Engine - Email Error]:', err.message);
      return { success: false, error: err.message };
    }
  }

  async sendSMS({ phone, message }) {
    console.log(`[Notification Engine - SMS Sandbox] To: ${phone} | Message: ${message}`);
    return { success: true, mode: 'sandbox' };
  }

  async sendWhatsApp({ phone, message }) {
    console.log(`[Notification Engine - WhatsApp Sandbox] To: ${phone} | Message: ${message}`);
    return { success: true, mode: 'sandbox' };
  }

  async createInAppNotification({ userId, type, title, message, entityType, entityId }) {
    if (!userId) return null;
    return await db.notifications.create({
      userId,
      type,
      title,
      message,
      entityType: entityType || null,
      entityId: entityId || null,
      read: false
    });
  }

  async dispatchEvent(eventName, payload) {
    const { user, email, phone, reference, title, status, reason } = payload;
    const recipientEmail = email || user?.email;
    const recipientPhone = phone || user?.phone;
    const userId = user?.id || payload.userId;

    const templates = {
      ACCOUNT_CREATED: {
        title: 'Welcome to JMT TRAVELS',
        message: 'Your account has been created successfully. Please verify your email address to unlock full travel features.'
      },
      EMAIL_VERIFICATION: {
        title: 'Verify Your Email Address',
        message: `Please verify your email address for JMT TRAVELS. Your verification token: ${payload.token || 'N/A'}`
      },
      PASSWORD_RESET: {
        title: 'Password Reset Request',
        message: `A password reset was requested for your account. Reset token: ${payload.token || 'N/A'}. If you did not request this, please ignore this message.`
      },
      VISA_SUBMITTED: {
        title: 'Visa Application Received',
        message: `Your visa application (${reference}) has been submitted. Our visa desk will send your document checklist.`
      },
      VISA_STATUS_CHANGED: {
        title: 'Visa Application Updated',
        message: `Your visa application (${reference}) status is now: ${status}.`
      },
      BOOKING_CONFIRMED: {
        title: 'Tour Booking Confirmed',
        message: `Your holiday booking (${reference}) for ${title || 'your trip'} is confirmed!`
      },
      PAYMENT_SUCCESSFUL: {
        title: 'Payment Confirmed',
        message: `Payment of ${payload.amount} ${payload.currency} for reference ${reference} was completed successfully.`
      },
      SUPPORT_TICKET_UPDATED: {
        title: 'Support Ticket Reply',
        message: `JMT Support has responded to your ticket: "${payload.subject || reference}".`
      }
    };

    const config = templates[eventName] || {
      title: eventName.replace(/_/g, ' '),
      message: `Notification for reference ${reference || 'JMT'}.`
    };

    // 1. In-App Notification
    if (userId) {
      await this.createInAppNotification({
        userId,
        type: eventName,
        title: config.title,
        message: config.message,
        entityType: payload.entityType,
        entityId: payload.entityId
      });
    }

    // 2. Email Dispatch
    if (recipientEmail) {
      await this.sendEmail({
        to: recipientEmail,
        subject: `[JMT TRAVELS] ${config.title}`,
        text: config.message,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #E2E8F0; background: #FAF8F4;">
            <h2 style="color: #1E2B6D; margin-top: 0;">JMT Travel &amp; Tourism</h2>
            <h3 style="color: #16A34A;">${config.title}</h3>
            <p style="font-size: 15px; color: #334155; line-height: 1.6;">${config.message}</p>
            <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 24px 0;">
            <p style="font-size: 12px; color: #64748B;">Muscat, Oman · Phone: +968 7113 2424 · WhatsApp: +968 9760 8999</p>
          </div>
        `
      });
    }

    // 3. WhatsApp Log
    if (recipientPhone) {
      await this.sendWhatsApp({ phone: recipientPhone, message: `${config.title}: ${config.message}` });
    }
  }
}

module.exports = new NotificationService();
