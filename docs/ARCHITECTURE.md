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
937. **JMT AI Chatbot & Support System (Task #9)**: AI Provider Abstraction (`AIProvider`, `MockAIProvider` sandbox, `ProductionAIProvider` with credentials fail-safe), Controlled Server Tool Layer (`chatTools.js`), Strict Customer Data Isolation (`req.user.id` authenticated identity derivation, blocking cross-customer queries), Prompt Injection Gateway Defense (audited block of instruction override/secret extraction attempts), Human Escalation State Machine (`AI_ACTIVE` -> `ESCALATED` -> `STAFF_ACTIVE` -> `RESOLVED`), Staff Chat Console (`GET /api/admin/chat/conversations`, `POST /api/admin/chat/conversations/:id/reply`), and Arabic/RTL Directional Isolation Support.
38. **SEO & Accessibility Hardening Engine (Task #10)**: Dynamic XML Sitemap Endpoint (`GET /sitemap.xml`), Dynamic Robots.txt Directives Endpoint (`GET /robots.txt`), Server-Side Meta Tag & Title Injection for Crawlers (`/tourism/:slug`, `/visa/:slug`), Private Page Indexing Defense (`noindex, nofollow`), Validated JSON-LD Schemas (`TravelAgency`, `TouristTrip`, `Service`), WCAG 2.2 AA Focus Visible Highlights (`:focus-visible`), Screen Reader Announcer (`#a11y-announcer`), Keyboard Skip Links (`.skip-link`), Form Control ARIA Binding (`aria-required`, `aria-describedby`, `aria-live`), and Accessible Chatbot Modal Drawer (`role="dialog"`, `aria-modal="true"`, Esc key focus restoration).

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

## 5. SEO & Accessibility Architecture Principles
- **Canonical URL Control**: Base URLs strictly use `process.env.BASE_URL || 'https://jmttravels.com'`. Dynamic Host headers are rejected as canonical sources to prevent Host header poisoning.
- **Private Route Indexing Isolation**: Authenticated / customer-private routes (`/admin`, `/account`, `/visa-apply`, `/book`, `/documents/`) explicitly enforce `noindex, nofollow` meta tags and are disallowed in `robots.txt`.
- **Keyboard Navigation & ARIA Rules**: All interactive elements display high-contrast focus rings (`:focus-visible`). Modal drawers support Esc key dismissal and return focus to triggering elements upon closing. Dynamic view transitions announce state changes to screen readers via `#a11y-announcer`.

## 6. Performance Optimization & Scalability Principles (Task #11)
- **In-Memory TTL Caching (`backend/services/cache.js`)**: Process-local LRU/TTL cache manager with tag-based invalidation for public catalogue endpoints (`packages`, `destinations`, `categories`, `visa services`).
- **Cache Security & Header Isolation**: Public read-only endpoints set `Cache-Control: public, max-age=60`. Private and sensitive endpoints (`/account`, `/admin`, `/visa-apply`, `/book`, `/documents/`, `/payments`, `/chat`) strictly enforce `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`.
- **Database Query Performance & Indexing**: Compound indexes on Mongoose models (`TourPackage`, `TourBooking`, `VisaApplication`, `Notification`, `ChatConversation`, `ChatMessage`, `AuditLog`), `Promise.all` concurrent execution for admin dashboard metrics, field projections, and `.lean()` execution.
- **Payload & Network Optimization**: Built-in GZIP response compression middleware, image `loading="lazy"` attributes, and frontend in-flight GET request deduplication (`pendingRequests` Map).
- **Production Monitoring & Health Probes**: Operational health probe (`GET /health`) and readiness probe (`GET /ready`), with automatic detection & logging of slow requests exceeding 500ms.
