# JMT TRAVELS — V1 PROJECT AUDIT & ARCHITECTURE SPECIFICATION

**Date**: September 2026  
**Project**: JMT TRAVELS V1 Website & Core Platform  
**Target Market**: Oman & GCC Tourism, Visa Services, Umrah & International Travel

---

## 1. Executive Summary

JMT TRAVELS is an established travel and tourism agency based in Muscat, Oman (celebrating 20+ years of operation). This project delivers the production-ready V1 full-stack web platform for JMT TRAVELS, encompassing digital visa application processing, holiday package discovery & reservation, customer support ticketing, an AI-capable online help desk chatbot, role-based customer & administrative management, private document uploads, and a modular payment integration architecture.

---

## 2. Codebase Audit

### 2.1 Directory & Tech Stack Analysis

| Component | Technology / Framework | Current State |
| :--- | :--- | :--- |
| **Backend API** | Node.js (v24), Express 4.x | Express server running in `backend/server.js`. Includes basic routes for packages, visa applications, bookings, tracking, reviews, and feedback. Uses `bcryptjs`, `jsonwebtoken`, `multer`, `express-rate-limit`, `helmet`, and `nodemailer`. |
| **Frontend** | Vanilla HTML5 / CSS3 / Modern JS | Served statically from `frontend/public/`. Contains `index.html` (legacy landing page), `platform.html` (V1 customer travel portal), and `admin.html` (staff console). |
| **Database & Persistence** | Atomic JSON File DataStore | Located in `backend/data/`. Stores `reviews.json`, `feedback.json`, `visa-applications.json`, `bookings.json`, `users.json`, `visa-services.json`, `packages.json`, `payments.json`, `documents.json`, `support-tickets.json`, `notifications.json`, `audit-v1.json`. |
| **File Storage** | Local Disk / Private Storage | Upload directory configured at `backend/data/private-uploads/` for applicant passports and identity documents. |
| **Authentication** | JWT & Password Hashing | `bcryptjs` hashing with `jsonwebtoken` for auth tokens. Admin access key fallback in dev environment. |
| **Email & Dispatch** | Nodemailer SMTP | Transporter set up with graceful disk fallback to `data/feedback.json` when SMTP is unconfigured. |

### 2.2 Assets & Branding

- **Logo**: Official JMT logo assets located in `frontend/public/assets/logo.png` and `frontend/public/assets/logo.svg`.
- **Brand Colors**:
  - JMT Deep Navy Blue: `#1E2B6D` / `#0B286C` / `#33328C`
  - JMT Green: `#16A34A` / `#1F6B35` / `#4EAE4B`
  - JMT Gold Accent: `#C9962E`
  - Neutral Backgrounds: `#FAF8F4` / `#F8FAFC`
- **Destination Photography**: High-res imagery available in `frontend/public/assets/destinations/` for Dubai, Salalah, Umrah, etc.

---

## 3. Existing Features vs. Missing V1 Scope

### 3.1 Existing Working Features (To Preserve & Enhance)
- ✅ Public travel portal UI (`platform.html`) with flight search tabs, visa preview, package cards, tracking widget, and assistant drawer.
- ✅ Detailed homepage template (`index.html`) with brand identity, contact cards, map integration, and live reviews submission.
- ✅ Admin console UI (`admin.html`) with metric widgets, application lists, and status modification logic.
- ✅ Express API server (`server.js`) with atomic file JSON read/write persistence, rate limiting, and honeypot spam protection.
- ✅ Public reviews submission (`/api/reviews`) and feedback routing (`/api/feedback`).

### 3.2 Missing V1 Requirements (To Implement)
- ❌ **Unified Routing & Navigation**: Integrating landing page, platform portal, visa pages, tourism pages, contact, login, register, customer account, and admin workspace into a cohesive SPA/multi-page web app.
- ❌ **Comprehensive Customer Auth**: Full customer registration, login, session token management, profile updates, password reset flow, and customer dashboard for tracking own applications, bookings, documents, and support tickets.
- ❌ **Visa Module**: Dynamic visa country list (`/visa`), country detail pages (`/visa/[slug]`), and a multi-step application workflow (Applicant Info → Passport Details → Document Upload → Review → Payment → Confirmation).
- ❌ **Tourism Module**: Dynamic tour package listing (`/tourism`) with destination/category/price filters and detailed package pages (`/tourism/[slug]`) with galleries, itineraries, inclusions/exclusions, and booking flow.
- ❌ **Secure Document Handling**: Multer file upload endpoint (`/api/documents/upload`), metadata storage, private disk access control (only authorized customer or staff/admin can retrieve files), file size & MIME type validation.
- ❌ **Payment Abstraction Architecture**: Provider-agnostic payment layer (`PaymentService`, `PaymentProvider`, `PaymentOrder`) supporting Razorpay/PayTabs/Stripe/Sandbox mode with server-side webhook signature verification, idempotency checks, and database transaction tracking.
- ❌ **Admin CMS & Full Management**: Administrative CRUD for destinations, tour categories, packages, visa services, customer profiles, payments, support tickets, and audit logging.
- ❌ **Online Help Desk Chatbot**: Backend API (`/api/chat`) with knowledge base retrieval, rule-based fallback, and seamless support ticket escalation.
- ❌ **Multi-Currency & Localization Readiness**: Financial storage in integer minor units (`amount` + `currency`), structure ready for OMR, AED, SAR, QAR, BHD, USD, EUR, and RTL layout support.
- ❌ **Automated Testing & Production Build**: Comprehensive API and unit test suite verifying auth, permissions, workflows, payment security, and rate limiting.

---

## 4. Identified Problems & Fixes

1. **Fragmented UI HTML Files**: Previously split across `index.html`, `platform.html`, and `admin.html` with inline scripts.
   - *Fix*: Unify the client application into a clean modular SPA structure using responsive JavaScript component architecture, while serving legacy endpoints smoothly.
2. **Missing Customer Self-Service Account**: Customers had no way to log in, view past visa applications, track bookings, upload missing documents, or manage support tickets.
   - *Fix*: Implement complete customer authentication and `/account` dashboard with strict IDOR data isolation.
3. **Hard-Coded Visa & Tourism Data**: Visa requirements and packages were partly hard-coded in client HTML.
   - *Fix*: Serve all visa services, destinations, and packages dynamically from backend storage with full admin CRUD controls.
4. **Unprotected File Handling**: No secure document upload path was exposed for visa applicants.
   - *Fix*: Build private Multer upload handler with file verification and authenticated stream downloading.
5. **Lack of Payment Webhook Handler**: Frontend had no server-side order generation or payment verification logic.
   - *Fix*: Architect a secure payment module with sandbox payment simulation, signed webhooks, and payment record state transitions.

---

## 5. Proposed Final Architecture

```text
                               ┌───────────────────────────────────────────────┐
                               │             JMT TRAVELS Frontend              │
                               │  (Home • Visa • Tourism • Contact • Account)  │
                               └──────────────────────┬────────────────────────┘
                                                      │ HTTP / REST / JSON
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          Express Backend API                                            │
│                                                                                                         │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌──────────────────────┐ │
│ │  Auth & RBAC   │ │  Visa Module   │ │ Tourism Module │ │ Support & Chat │ │  Payment Abstraction │ │
│ └───────┬────────┘ └───────┬────────┘ └───────┬────────┘ └───────┬────────┘ └──────────┬───────────┘ │
│         │                  │                  │                  │                     │             │
└─────────┼──────────────────┼──────────────────┼──────────────────┼─────────────────────┼─────────────┘
          │                  │                  │                  │                     │
          ▼                  ▼                  ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   Data Store & Storage Adapter                                          │
│                                                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Persistent File Datastore (data/*.json): Users, Roles, VisaServices, Packages, Applications,       │ │
│ │ Bookings, Payments, Tickets, Notifications, AuditLogs                                              │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Private File Storage (data/private-uploads/): Passports, ID Photos, Civil Cards                      │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Implementation Plan & Milestones

1. **Phase 1: Database & Core Server Refactoring**
   - Expand `backend/server.js` with modular controllers and storage adapters for Users, Visas, Packages, Bookings, Documents, Payments, Tickets, and Audit Logs.
   - Implement RBAC permissions middleware (`CUSTOMER`, `STAFF`, `ADMIN`, `SUPER_ADMIN`).
   - Create private upload directory & secure document download handler.
2. **Phase 2: Authentication & Customer Account**
   - Implement `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/reset-password`.
   - Build customer dashboard UI (`/account`) with profile, visa list, booking list, payment history, and support tickets.
3. **Phase 3: Visa & Tourism Dynamic Modules**
   - Implement Visa list & dynamic detail routes (`/visa/[slug]`) and multi-step application workflow.
   - Implement Tourism list, package detail routes (`/tourism/[slug]`), and booking workflow.
4. **Phase 4: Payment System & Webhooks**
   - Implement `PaymentService` abstraction layer supporting order creation, payment state transitions (`PENDING`, `PAYMENT_PENDING`, `COMPLETED`, `FAILED`, `REFUNDED`), sandbox payment flow, and webhook signature verification.
5. **Phase 5: Help Desk Chatbot & Support Tickets**
   - Implement chatbot backend (`/api/chat`) with knowledge base retrieval, rule fallback, and ticket escalation (`/api/support/tickets`).
6. **Phase 6: Administrative Console Enhancement**
   - Update `/admin` with real-time management of Visas, Packages, Customers, Bookings, Payments, Tickets, and Audit logs.
7. **Phase 7: Testing, Verification & Quality Assurance**
   - Write automated unit and integration tests covering auth, workflows, payment webhooks, rate limiting, and security controls.
   - Run typechecking/linting and verify production build.
8. **Phase 8: Documentation & Production Handover**
   - Update `README.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `PAYMENTS.md`, `SECURITY.md`, `DEPLOYMENT.md`, and `.env.example`.
