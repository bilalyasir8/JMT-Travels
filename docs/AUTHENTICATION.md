# JMT TRAVELS — Authentication & Role-Based Access Control (RBAC)

## 1. Authentication Strategy

- **Password Security**: Passwords are hashed using `bcryptjs` with 12 salt rounds before storage. Plaintext passwords are never logged or stored.
- **Session Tokens**: Authentication uses JSON Web Tokens (JWT) signed with a secret (`AUTH_SECRET`). Tokens expire in 7 days and contain user identity (`sub`) and role (`role`).
- **Transmission**: Supported via `Authorization: Bearer <token>` headers or `jmt_session` HTTP cookies.

## 2. User Roles & Permissions

| Role | Permissions |
| :--- | :--- |
| `CUSTOMER` | View own profile, manage own visa applications, view own bookings, upload passport documents, view payment receipts, open support tickets. |
| `STAFF` | View assigned visa applications, update processing statuses (`DOCUMENT_REVIEW`, `APPROVED`, etc.), view bookings, reply to customer support tickets. |
| `ADMIN` | Manage all customers, manage visa catalogue, manage tourism package CMS, view financial transactions, execute refunds, view system reports. |
| `SUPER_ADMIN` | All admin permissions plus user role modifications, system configuration, and immutable audit log inspection. |
