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
7. **Internationalization & Multi-Currency Engine (Task #7)**: Centralized i18n dictionary catalogue (`en`, `ar`), RTL metadata (`dir="rtl"`), directional isolation for identifiers (`JMT-V-XXXXXX`, `JMT-B-XXXXXX`, `JMT-P-XXXXXX`), multi-currency formatting (`OMR`, `AED`, `SAR`, `INR`, `USD`), integer minor units persistence, and FX abstraction (`FXProvider` — `PREPARED ONLY` for display estimates).
8. **Admin & Operations System (Task #8)**: Role-Based Operational Control Layer (`CUSTOMER`, `STAFF`, `ADMIN`, `SUPER_ADMIN`), single-call Operational Dashboard API (`GET /api/admin/dashboard`), User/Customer management with account status toggles (`ACTIVE`, `SUSPENDED`, `DISABLED`), SUPER_ADMIN-only role escalation protection (`PATCH /api/users/:id/role`), Visa & Document review, Tourism package & pricing management, Booking operations, Payment/Refund inspection, Support ticket inbox & reply dispatch, Notification health monitoring, and Immutable Append-Only Audit Logging (`GET /api/admin/audit-logs`).
9. **JMT AI Chatbot & Support System (Task #9)**: AI Provider Abstraction (`AIProvider`, `MockAIProvider` sandbox, `ProductionAIProvider` with credentials fail-safe), Controlled Server Tool Layer (`chatTools.js`), Strict Customer Data Isolation (`req.user.id` authenticated identity derivation, blocking cross-customer queries), Prompt Injection Gateway Defense (audited block of instruction override/secret extraction attempts), Human Escalation State Machine (`AI_ACTIVE` -> `ESCALATED` -> `STAFF_ACTIVE` -> `RESOLVED`), Staff Chat Console (`GET /api/admin/chat/conversations`, `POST /api/admin/chat/conversations/:id/reply`), and Arabic/RTL Directional Isolation Support.

## 3. Internationalization & Currency Principles
- **Locale Selection Hierarchy**: Explicit request parameter/header -> Authenticated user profile preference (`preferredLanguage`) -> Browser `Accept-Language` header -> Application default (`en`).
- **Money Representation**: Integer minor units (e.g. 189000 = 189.000 OMR) remain authoritative in datastore and server payment processing. Floating-point currency math is prohibited.
- **FX Provider Status**: Live FX rates and live automatic conversion are marked explicitly as `PREPARED ONLY`. Display estimates never override server-authoritative payable totals.

## 4. Admin Security & Role Matrix Principles
- **CUSTOMER**: Access own resources only.
- **STAFF**: Operational workflows (visa review, document review, booking operations, support tickets, contact inquiries). Blocked from user status toggles or role modifications.
- **ADMIN**: All STAFF capabilities + user/customer management, user account status control (`SUSPENDED`/`DISABLED`), package/destination CRUD, payment/refund management, and notification health. Blocked from role escalation.
- **SUPER_ADMIN**: All ADMIN capabilities + system role management (`PATCH /api/users/:id/role`), managing admin accounts, and auditing. Cannot bypass immutable audit log rules.
- **Audit Logs**: All sensitive admin actions log append-only records. Passwords, JWTs, card info, and secrets are strictly excluded.
