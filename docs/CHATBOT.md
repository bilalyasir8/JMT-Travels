# JMT TRAVELS — Help Desk Chatbot Documentation

## 1. Architecture & Capabilities

The JMT Assistant floating chatbot (`/api/chat`) provides customer support across all public pages:
- **Visa FAQs**: Retrieves published visa services, country requirements, and entry information.
- **Tourism Packages**: Answers queries regarding Salalah, Dubai, and Umrah packages.
- **Booking Tracking**: Directs users to status tracking with reference numbers (`JMT-V-*`, `JMT-B-*`).
- **Office & Contact**: Provides location, phone, email, and WhatsApp details.
- **Support Escalation**: Allows users to create a support ticket directly from the chat drawer.

## 2. Responsible AI Rules

- The chatbot never invents visa approval guarantees, legal claims, false pricing, or fake availability.
- When `AI_API_KEY` is present in `.env`, queries route through AI provider context. Otherwise, JMT's rule engine handles responses.
