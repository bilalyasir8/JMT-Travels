# JMT TRAVELS — Architecture & System Design Document

## 1. High-Level Architecture Overview

JMT TRAVELS V1 is built as a maintainable, high-performance modular monolith. The system separates public travel presentation, customer self-service, administrative operations, and third-party provider adapters while retaining single-process deployment simplicity.

```text
INTERNET
   │
Cloudflare (HTTPS / WAF / CDN)
   │
Express API Server (backend/server.js)
   ├─ Auth & RBAC Module (JWT, Bcrypt)
   ├─ Visa System Module (Intake, Status Transitions, Document Metadata)
   ├─ Tourism Catalogue & Booking Engine
   ├─ Private Object/File Storage (Multer, Private Stream)
   ├─ Payment Abstraction Layer (Sandbox, PayTabs, Razorpay, Stripe)
   ├─ Notification Engine (Email, SMS, WhatsApp, In-App)
   ├─ Help Desk Chatbot (Knowledge Base + AI Gateway + Escalation)
   └─ Admin Operations Console API
   │
Datastore Layer (db.js)
   ├─ MongoDB Atlas / Mongoose ORM
   └─ Persistent JSON Datastore (backend/data/*.json fallback)
```

## 2. Service Boundaries

1. **Authentication & RBAC**: Password hashing, JWT token issuance, session verification, user role enforcement (`CUSTOMER`, `STAFF`, `ADMIN`, `SUPER_ADMIN`).
2. **Visa System**: Visa services catalogue, dynamic country/type detail pages, intake application engine, private passport file storage, status transition validation, and reference tracking.
3. **Tourism System**: Destination and category filtering, package management, server-calculated financial pricing, booking intake, and status lifecycle management.
4. **Payment Abstraction**: Provider-agnostic order creation, HMAC SHA256 webhook signature verification, idempotency protection, and multi-currency storage (`OMR`, `AED`, `SAR`, `QAR`, `BHD`, `USD`, `EUR`).
5. **Help Desk Chatbot & Support**: Dual-mode chatbot using AI provider when configured or JMT knowledge base fallback, with escalation to support ticket inbox.
6. **Notification Engine**: Email, SMS, WhatsApp, and In-App notification dispatches triggered by critical business events.
