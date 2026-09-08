# JMT TRAVELS — Payment Integration & Security Architecture

## 1. Provider Abstraction Architecture

The payment architecture uses a provider-agnostic service wrapper (`PaymentService`) to prevent coupling to a single payment gateway.

Supported Gateway Modules:
- **SANDBOX**: Default provider for local development, automated testing, and staging previews.
- **PAYTABS**: GCC regional gateway supporting OMR, AED, SAR, QAR, BHD, and credit/debit cards.
- **RAZORPAY**: Supported for regional card & netbanking transactions.
- **STRIPE**: Supported for international card checkout.

## 2. Server-Side Financial Control

1. **Server Price Calculation**: Frontend prices are never trusted. The backend fetches canonical package or visa service pricing, calculates total cost based on traveler count, and generates the payment order.
2. **Signed Webhooks**: Webhook notifications from payment gateways are verified using HMAC SHA256 signature verification (`x-signature`).
3. **Idempotency Protection**: Incoming webhook event IDs are recorded in `paymentEvents` to block duplicate or replayed notifications.
4. **Currency Safety**: Financial values are stored with explicit currency ISO codes (`amount` + `currency`).
