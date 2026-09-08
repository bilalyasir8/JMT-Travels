# JMT TRAVELS — Production V1 Full-Stack Platform

Official website and digital travel platform for **JMT TRAVELS** (Oman) — celebrating 20+ years of trusted visa clearing, flight ticketing, and signature holiday packages across the GCC and worldwide.

---

## 1. Project Architecture

The JMT TRAVELS V1 platform is built as a maintainable, high-performance modular monolith separating public travel presentation, customer self-service, administrative operations, and third-party payment/notification adapters.

- **Frontend**: Modern SPA / Multi-view client with vanilla JavaScript routing (`frontend/public/assets/js/app.js`), design tokens CSS (`frontend/public/assets/css/jmt-theme.css`), and official JMT branding (`assets/logo.png`).
- **Backend API**: Express 4.x server (`backend/server.js`) with RESTful controllers, rate limiting, helmet security headers, and Multer document upload handling.
- **Database**: Production MongoDB Atlas integration via Mongoose ORM (`backend/db.js`) with automatic persistent JSON file storage fallback (`backend/data/*.json`).
- **Payment Abstraction**: Modular payment service supporting Sandbox simulation, PayTabs, Razorpay, and Stripe with HMAC signature verification and idempotency protection.
- **Help Desk Chatbot**: Built-in JMT knowledge base lookup, rule engine fallback, AI provider key integration, and support ticket escalation.

---

## 2. Tech Stack & Dependencies

- **Node.js**: v24+
- **Express**: 4.19+
- **Database**: Mongoose / MongoDB Atlas + Atomic JSON fallback
- **Auth & Security**: JWT (`jsonwebtoken`), Bcrypt (`bcryptjs`), Rate Limit (`express-rate-limit`), Helmet (`helmet`), Multer (`multer`)
- **Email**: Nodemailer SMTP
- **Styling & Fonts**: Plus Jakarta Sans, Centralized Design System Tokens, RTL Support

---

## 3. Directory Structure

```text
c:/Users/USER/Downloads/JMT Travels/
├── backend/
│   ├── data/                   # Persistent JSON storage & private document uploads
│   │   └── private-uploads/    # Protected passport & civil ID files
│   ├── services/
│   │   ├── payment.js          # Payment abstraction layer & signed webhooks
│   │   ├── notification.js     # Email, SMS, WhatsApp & In-app engine
│   │   └── chatbot.js          # Knowledge base & chatbot escalation engine
│   ├── db.js                   # MongoDB Atlas + Mongoose / JSON datastore adapter
│   ├── server.js               # Main Express RESTful API server
│   ├── test_api.js             # Automated API test suite
│   ├── package.json
│   └── .env.example
├── docs/                       # Project Documentation
│   ├── PROJECT_AUDIT.md        # Comprehensive repository audit
│   ├── ARCHITECTURE.md         # System design & architecture
│   ├── DATABASE.md            # MongoDB schemas & entity models
│   ├── API.md                 # REST API endpoint reference
│   ├── PAYMENTS.md            # Payment abstraction & webhook security
│   ├── AUTHENTICATION.md      # Authentication & RBAC controls
│   ├── ADMIN.md               # Staff operations console
│   ├── SECURITY.md            # Security hardening guide
│   ├── DEPLOYMENT.md          # Production deployment guide
│   ├── NOTIFICATIONS.md       # Multi-channel notification engine
│   ├── CHATBOT.md             # AI / Rule help desk chatbot
│   ├── SEO.md                 # Search engine optimization
│   └── QA.md                  # Quality assurance test report
├── frontend/
│   └── public/
│       ├── assets/
│       │   ├── css/jmt-theme.css  # Centralized CSS design tokens
│       │   ├── js/app.js          # Single Page Application router
│       │   ├── destinations/     # High-res destination imagery
│       │   └── logo.png          # Official JMT TRAVELS logo
│       ├── index.html             # Public web application entry
│       ├── admin.html             # Staff operations console
│       ├── sitemap.xml            # SEO Sitemap
│       └── robots.txt             # SEO Crawler directions
└── README.md
```

---

## 4. Quick Start & Setup

### 1. Installation
Open terminal and navigate to the `backend` folder:
```bash
cd backend
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configured variables:
```env
PORT=3000
MONGODB_URI=                     # Optional: MongoDB Atlas connection string
AUTH_SECRET=local-development-secret-key-jmt

PAYMENT_PROVIDER=SANDBOX
PAYMENT_KEY_ID=
PAYMENT_KEY_SECRET=
PAYMENT_WEBHOOK_SECRET=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=info@jmttravels.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM="JMT TRAVELS" <info@jmttravels.com>

ADMIN_EMAIL=admin@jmttravels.com
ADMIN_PASSWORD=JMTAdmin2026!
```

### 3. Run Development Server
```bash
npm start
```
Open **`http://localhost:3000`** in your browser.

---

## 5. Running Automated Tests

Execute the comprehensive automated test suite:
```bash
node backend/test_api.js
```

Tests cover:
- Health endpoints (`/health`)
- Customer registration & JWT auth
- Admin authentication & RBAC permissions
- Visa services & application workflow
- Tourism catalogue & server-calculated booking price
- Payment order creation & signed webhook verification
- IDOR protection & security controls
- Help desk chatbot knowledge base & support ticket escalation
- Public reference tracking (`/api/track/:reference`)

---

## 6. Official Brand & Contact

- **Company**: JMT Travel & Tourism (Oman)
- **Location**: near Mazda R/A, next to Yahar Restaurant, 512, Muscat, Oman
- **Call**: [+968 7113 2424](tel:+96871132424)
- **WhatsApp**: [+968 9760 8999](https://wa.me/96897608999)
- **Email**: [info@jmttravels.com](mailto:info@jmttravels.com)
