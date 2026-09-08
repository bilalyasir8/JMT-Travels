# JMT TRAVELS — Notification System Documentation

## 1. Multi-Channel Abstraction

The notification engine (`NotificationService`) supports:
- **Email**: Dispatched via Nodemailer SMTP with HTML branding templates and fallback logging.
- **SMS**: Sandbox development logging interface ready for Twilio or local telecom APIs.
- **WhatsApp**: Logged interface ready for WhatsApp Business API integration.
- **In-App Notifications**: Stored in `notifications` datastore (`userId`, `type`, `title`, `message`, `read`, `createdAt`).

## 2. Event Triggers

Notifications are dispatched automatically for critical workflow events:
- `ACCOUNT_CREATED`: Sent when a new customer registers.
- `VISA_SUBMITTED`: Sent when a visa application is created.
- `VISA_STATUS_CHANGED`: Sent when visa processing status updates.
- `BOOKING_CONFIRMED`: Sent when a tour booking is confirmed.
- `PAYMENT_SUCCESSFUL`: Sent when payment is completed.
- `SUPPORT_TICKET_UPDATED`: Sent when staff replies to a ticket.
