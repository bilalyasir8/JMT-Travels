# JMT TRAVELS — Production Deployment Guide

## 1. Environment Configuration

Copy `.env.example` to `.env` on your production server:

```env
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/jmt_production
AUTH_SECRET=your-production-jwt-secret-key-32-chars

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
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_ACCESS_KEY=your-staff-access-key
```

## 2. Production Build & Execution

1. **Install Production Dependencies**:
   ```bash
   cd backend
   npm install --production
   ```
2. **Run Automated Tests**:
   ```bash
   node test_api.js
   ```
3. **Start Application Server (PM2 / Systemd)**:
   ```bash
   npm start
   ```

## 3. Reverse Proxy & Domain SSL

Set up NGINX or Cloudflare in front of Node.js (port 3000) for SSL termination (HTTPS) and CDN caching.
