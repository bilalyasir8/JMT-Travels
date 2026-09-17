# JMT TRAVELS — V3.1 AI CHATBOT & CUSTOMER SUPPORT SYSTEM DOCUMENTATION

## 1. Executive Summary
V3.1 introduces a production-grade AI Travel Assistant for JMT Travels, integrating the official OpenAI JavaScript SDK with structured provider abstraction, strict deterministic security rules, context sanitization, bounded request timeouts, safe error fallbacks, and multi-language support (English & Arabic with RTL isolation).

---

## 2. System Architecture

```
                       JMT WEBSITE / SPA
                              │
                              ▼
                     JMT CHATBOT DRAWER
                              │
                              ▼
                POST /api/chat/conversations/:id/messages
                              │
                    chatLimiter (Rate Limit)
                              │
                 Chatbot Engine (chatbot.js)
                              │
     ┌────────────────────────┴────────────────────────┐
     │ 1. Prompt Injection Gateway Defense            │
     │ 2. Cross-Customer Data Isolation               │
     │ 3. Human Escalation State Machine              │
     │ 4. Authenticated Customer Status Queries       │
     │ 5. Public Catalogue & FAQ Lookup               │
     └────────────────────────┬────────────────────────┘
                              │
                 (Unhandled General Queries)
                              │
                              ▼
                 AI Gateway (aiProvider.js)
                              │
              ┌───────────────┴───────────────┐
              │                               │
    AI_PROVIDER=mock               AI_PROVIDER=openai
              │                               │
     MockAIProvider                ProductionAIProvider
     (Offline Dev / Tests)         (OpenAI JavaScript SDK)
                                              │
                                              ▼
                                      OpenAI API Gateway
                                     (gpt-5.6-luna / gpt-4o)
```

---

## 3. Key Components

### 3.1 Rule Engine First (Deterministic Routing)
- **Primary Gateway**: All user messages pass through `backend/services/chatbot.js` rule processing BEFORE reaching the LLM.
- **Prompt Injection Defense**: Intercepts override phrases (`ignore your instructions`, `reveal api key`, `show database`, `system prompt`) and logs an audit trail event.
- **Cross-Customer Data Isolation**: Blocks unauthorized attempts to access other users' visa/booking/payment records.
- **Customer Context Tools**: Enforces identity (`req.user.id`) for requests like "my visa status" or "my booking status".
- **Human Support Escalation**: Detects escalation intent and transitions conversation state (`AI_ACTIVE` -> `ESCALATED` -> `STAFF_ACTIVE`) with linked support ticket creation.

### 3.2 Production AI Provider (`ProductionAIProvider`)
- **SDK**: Official `openai` npm SDK (`require('openai')`).
- **Model**: Configurable via `AI_MODEL` (default: `gpt-5.6-luna` or `gpt-4o-mini`).
- **Timeout**: 15-second bounded request timeout via `Promise.race`.
- **System Instructions**: Enforces JMT assistant identity and 18 core business rules (no visa guarantees, no fake prices/availability, no key/database leakage).
- **Conversation Context Window**: Passes up to the latest 12 sanitized messages.
- **Fallback & Resilience**: If `AI_API_KEY` is missing or the OpenAI API experiences latency/errors, the provider logs a safe server-side error and returns a friendly fallback message without crashing the Express server.

---

## 4. Environment Variables Configuration

| Variable | Values / Default | Description | Required in Prod |
| :--- | :--- | :--- | :--- |
| `AI_PROVIDER` | `mock` (default) \| `openai` | AI Provider selection mode | Recommended (`openai`) |
| `AI_API_KEY` | Secret Key string | OpenAI API Key (Server-Side Only) | **YES** (when `AI_PROVIDER=openai`) |
| `AI_MODEL` | `gpt-5.6-luna` (default) \| `gpt-4o` | Model identifier | Optional |

> [!IMPORTANT]
> `AI_API_KEY` must only exist in backend server environment variables (e.g. Render Environment Dashboard). It is NEVER exposed to client-side code, API responses, or Git repositories.

---

## 5. Security & Privacy Controls
1. **Server-Side Authorization**: AI model has ZERO direct database access. All data fetches occur via authorized server tools (`chatTools.js`).
2. **Context Sanitization**: Sensitive user fields (password hashes, JWT tokens, payment secrets) are stripped before context creation.
3. **Audit Trail Logging**: Security violations and escalation events produce immutable audit logs in `db.auditLogs`.
4. **Rate Limiting**: `POST /api/chat/conversations/:id/messages` is protected by `chatLimiter` middleware.

---

## 6. Multi-Language & RTL Support
- Supports English (`en`) and Arabic (`ar`).
- Wraps reference identifiers with directional isolation helpers (`i18nService.wrapDirectionalIsolation`).
- Provides localized quick reply suggestions in both languages.

---

## 7. Automated Testing
Run test suite:
```bash
node backend/test_api.js
```
The test suite validates 120/120 assertions covering mock provider execution, missing key fallback, prompt injection defense, cross-customer isolation, guest rejection, user visa/booking status lookups, human escalation, Arabic responses, input sanitization, and API key masking.
