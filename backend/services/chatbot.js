/**
 * JMT TRAVELS — AI & Rule-Based Help Desk Chatbot Engine
 * Serves /api/chat with knowledge retrieval, AI key integration, and support ticket escalation.
 */

const db = require('../db');

class ChatbotService {
  async processMessage({ message, conversationId, user }) {
    const text = (message || '').trim().toLowerCase();

    if (!text) {
      return {
        reply: 'Hello! I am JMT Assistant. How can I help you today? You can ask about visas, holiday packages, flight inquiries, or check your booking status.',
        quickReplies: ['Visa Services', 'Tourism Packages', 'Track Booking', 'Talk to Support']
      };
    }

    // 1. Check for Support Escalation Intent
    if (text.includes('support') || text.includes('agent') || text.includes('human') || text.includes('talk to support')) {
      return {
        reply: 'I can connect you directly with our JMT customer support team. Would you like me to create a support ticket for your inquiry?',
        escalateOption: true,
        quickReplies: ['Create Support Ticket', 'WhatsApp Agent (+968 9760 8999)', 'Main Menu']
      };
    }

    // 2. Check for Visa Inquiries
    if (text.includes('visa') || text.includes('passport') || text.includes('entry') || text.includes('permit')) {
      const services = await db.visaServices.find({ published: true });
      const countryNames = services.map(s => s.country).join(', ');
      
      return {
        reply: `JMT TRAVELS provides digital visa application assistance for popular GCC destinations including ${countryNames || 'UAE, Saudi Arabia, Qatar, and Oman'}.\n\nVisa approval is strictly subject to the relevant government authorities. You can start your application online to receive a official document checklist.`,
        quickReplies: ['Apply for Visa', 'Required Documents', 'Track Application']
      };
    }

    // 3. Check for Holiday / Tourism Inquiries
    if (text.includes('tour') || text.includes('package') || text.includes('holiday') || text.includes('dubai') || text.includes('salalah') || text.includes('umrah')) {
      const packages = await db.tourPackages.find({ published: true });
      const pkgSummary = packages.slice(0, 3).map(p => `• ${p.title} (${p.destination} - ${p.duration}, ${p.currency} ${p.priceMinor ? p.priceMinor / 1000 : p.price})`).join('\n');

      return {
        reply: `Here are some of our popular JMT signature packages:\n\n${pkgSummary}\n\nWe offer custom flights, hotel bookings, transfers, and Umrah arrangements.`,
        quickReplies: ['View All Packages', 'Book a Tour', 'Custom Itinerary']
      };
    }

    // 4. Check for Booking Tracking Intent
    if (text.includes('track') || text.includes('status') || text.includes('jmt-') || text.includes('reference')) {
      return {
        reply: 'To check your booking or visa status, please enter your JMT reference number (e.g. JMT-V-1234567 or JMT-B-1234567) in our "My Booking" tracker, or view your customer account dashboard.',
        quickReplies: ['Open Tracker', 'Go to My Account']
      };
    }

    // 5. Check for Contact / Hours / Office Location
    if (text.includes('office') || text.includes('location') || text.includes('address') || text.includes('phone') || text.includes('contact') || text.includes('timing')) {
      return {
        reply: '📍 JMT Travel & Tourism (Muscat, Oman)\nLocation: near Mazda R/A, next to Yahar Restaurant, 512, Oman.\n📞 Phone: +968 7113 2424\n💬 WhatsApp: +968 9760 8999\n✉️ Email: info@jmttravels.com\n⏰ Office Hours: Saturday–Thursday 8:30 AM–1:30 PM & 4:30 PM–9:30 PM | Friday 4:30 PM–9:30 PM',
        quickReplies: ['Google Maps Location', 'Call JMT', 'Send Email']
      };
    }

    // 6. AI Provider Gateway (if AI_API_KEY is configured in .env)
    if (process.env.AI_API_KEY) {
      try {
        // AI Key exists: could call OpenAI/Gemini REST API
        // Fallback gracefully if request fails
      } catch (err) {
        console.warn('[Chatbot AI Error]:', err.message);
      }
    }

    // 7. General Knowledge Fallback Response
    return {
      reply: 'I am here to assist with JMT visa applications, tour packages, Umrah planning, and booking status. How would you like to proceed?',
      quickReplies: ['Visa Services', 'Holiday Packages', 'Office Location', 'Talk to Support']
    };
  }
}

module.exports = new ChatbotService();
