# JMT Travels V1 architecture

The product is deliberately split into a public travel experience and a backend API. This lets the customer site, future staff console and future mobile app share the same booking, visa and package records.

```text
Customer website (static / Next.js-ready)
  ├─ Travel finder, packages and booking tracking
  ├─ Digital visa application intake
  └─ JMT Assistant help desk
              │
              ▼
Express API
  ├─ visa applications / bookings / package catalogue
  ├─ reviews and management feedback
  └─ payment-provider webhook (next integration)
              │
              ▼
PostgreSQL + private object storage + Redis (production target)
```

## Included V1 behaviour

- The public travel portal is at `/platform.html`; the existing JMT landing page links to it.
- Visa applications receive a durable JMT reference and begin in `Documents required`. Files are never sent through the public JSON endpoint.
- Holiday reservations are stored as `Payment link pending`. This keeps availability confirmation and an approved gateway checkout separate from the public client.
- Customers can track either a visa or a reservation reference at `/api/track/:reference`.
- The assistant gives quick, scoped support routes and directs customers to JMT staff when a human is needed.
- The protected staff workspace is at `/admin.html`. It contains Dashboard, Customers, Visa (applications/documents/approvals/rejections), Flights, Tourism, Hotels, Payments, Refunds, Support, Chatbot, Coupons, Notifications and Reports. Configure `ADMIN_ACCESS_KEY` in the Node environment before using it.

## Production migration path

The JSON files are an intentionally small V1 persistence layer. Before collecting passport copies or accepting payments, replace them with PostgreSQL models, authenticated staff/customer accounts, encrypted private object storage, audit logs and a chosen payment provider's server-created checkout plus signed webhook verification. The V1 staff-key gate is only a development boundary; it must become role-based staff authentication with MFA before launch.

Suggested service boundaries: `auth`, `visa`, `catalogue`, `booking`, `payment`, `support`, and `notifications`. Arabic/English content and right-to-left layout should be introduced as route-level localisation before launch into wider GCC markets.

## Payment safeguard

No gateway has been selected in the supplied brief. The system therefore never marks a reservation as paid and never takes card data. After JMT confirms the business geography/currencies and selects a provider (for example, PayTabs, Telr, Network International, Razorpay or Stripe where eligible), add the provider's server-side checkout creation and a verified webhook that changes a booking from `Payment link pending` to `Paid`.
