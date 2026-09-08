# JMT TRAVELS — Security Architecture & Hardening Guide

## 1. Security Infrastructure

1. **IDOR Protection**: Every private endpoint (e.g. `GET /api/visa/applications/:id`, `GET /api/documents/:id/download`) verifies that the requesting user owns the resource or possesses `STAFF`/`ADMIN` role permissions.
2. **Private File Uploads**: Identity documents (passports, civil IDs) are saved to an unexposed private directory (`backend/data/private-uploads/`) outside public web root. Access is restricted to authenticated streams.
3. **Helmet & Security Headers**: Helmet middleware disables `x-powered-by`, enforces Cross-Origin resource policies, and protects against XSS/clickjacking.
4. **Rate Limiting & Anti-Spam**: `express-rate-limit` caps API requests per IP (100 req/15 min global; 15 req/15 min for form submissions). Forms include invisible honeypot fields to silently trap spam bots.
5. **No Secret Leaking**: All secrets (JWT, database connection strings, payment keys, SMTP passwords) are loaded via environment variables (`.env`). Secrets are never committed to version control.
