# JMT TRAVELS — RESTful API Endpoint Reference

## 1. Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register customer account | Public |
| `POST` | `/api/auth/login` | Authenticate & get JWT token | Public |
| `POST` | `/api/auth/logout` | Terminate active user session | Public |
| `GET` | `/api/auth/me` | Fetch active user profile | Bearer JWT |

## 2. Visa Module Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/visa/services` | List published visa services | Public |
| `GET` | `/api/visa/services/:slug` | View detailed visa service specs | Public |
| `POST` | `/api/visa/applications` | Submit new visa application | Optional |
| `GET` | `/api/visa/applications` | List customer or admin applications | Bearer JWT |
| `GET` | `/api/visa/applications/:id` | Get application details (IDOR checked) | Bearer JWT |
| `PATCH` | `/api/visa/applications/:id/status` | Update visa status (Staff/Admin) | Staff/Admin |

## 3. Document Management Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/documents/upload` | Upload passport / ID document | Bearer JWT |
| `GET` | `/api/documents/:id/download` | Stream private document (IDOR checked) | Bearer JWT |

## 4. Tourism Module Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tourism/packages` | Search & filter holiday packages | Public |
| `GET` | `/api/tourism/packages/:slug` | View package details & itinerary | Public |
| `POST` | `/api/tourism/bookings` | Book package (Server price calculated) | Optional |
| `GET` | `/api/tourism/bookings` | List customer or admin bookings | Bearer JWT |

## 5. Payment & Webhook Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payments/create-order` | Create provider payment order | Bearer JWT |
| `POST` | `/api/payments/webhook` | Process gateway webhook signature | Public |

## 6. Chatbot, Support & Contact

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/chat` | Chatbot query processing | Public |
| `POST` | `/api/support/tickets` | Create support ticket | Optional |
| `GET` | `/api/support/tickets` | View support ticket threads | Bearer JWT |
| `POST` | `/api/feedback` | Submit website contact form | Public |
| `GET` | `/api/track/:reference` | Public status tracker | Public |
