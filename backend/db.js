/**
 * JMT TRAVELS — Master Database Layer Bridge
 * Connects Mongoose Models (backend/models/*) to Data Repositories (backend/repositories/*).
 * Enforces production readiness rules & zero-breakage backward compatibility.
 */

const path = require('path');
const dbConfig = require('./config/db');
const BaseRepository = require('./repositories/BaseRepository');

// Load Mongoose Models
const User = require('./models/User');
const CustomerProfile = require('./models/CustomerProfile');
const VisaService = require('./models/VisaService');
const VisaApplication = require('./models/VisaApplication');
const VisaDocument = require('./models/VisaDocument');
const Destination = require('./models/Destination');
const TourCategory = require('./models/TourCategory');
const TourPackage = require('./models/TourPackage');
const BookingTraveller = require('./models/BookingTraveller');
const TourBooking = require('./models/TourBooking');
const Payment = require('./models/Payment');
const PaymentEvent = require('./models/PaymentEvent');
const Refund = require('./models/Refund');
const SupportTicket = require('./models/SupportTicket');
const ChatConversation = require('./models/ChatConversation');
const ChatMessage = require('./models/ChatMessage');
const ContactInquiry = require('./models/ContactInquiry');
const Notification = require('./models/Notification');
const AuditLog = require('./models/AuditLog');
const Review = require('./models/Review');

const PRIVATE_UPLOADS_DIR = path.join(__dirname, 'data/private-uploads');

// Instantiated Repositories for Data Access
const repositories = {
  users: new BaseRepository('users', User),
  customerProfiles: new BaseRepository('customerProfiles', CustomerProfile),
  visaServices: new BaseRepository('visaServices', VisaService),
  visaApplications: new BaseRepository('visaApplications', VisaApplication),
  visaDocuments: new BaseRepository('visaDocuments', VisaDocument),
  destinations: new BaseRepository('destinations', Destination),
  tourCategories: new BaseRepository('tourCategories', TourCategory),
  tourPackages: new BaseRepository('tourPackages', TourPackage),
  bookingTravellers: new BaseRepository('bookingTravellers', BookingTraveller),
  tourBookings: new BaseRepository('tourBookings', TourBooking),
  payments: new BaseRepository('payments', Payment),
  paymentEvents: new BaseRepository('paymentEvents', PaymentEvent),
  refunds: new BaseRepository('refunds', Refund),
  supportTickets: new BaseRepository('supportTickets', SupportTicket),
  chatConversations: new BaseRepository('chatConversations', ChatConversation),
  chatMessages: new BaseRepository('chatMessages', ChatMessage),
  contactInquiries: new BaseRepository('contactInquiries', ContactInquiry),
  notifications: new BaseRepository('notifications', Notification),
  auditLogs: new BaseRepository('auditLogs', AuditLog),
  reviews: new BaseRepository('reviews', Review)
};

module.exports = {
  connectDB: dbConfig.connectMongoDB,
  isMongoConnected: () => dbConfig.getStatus().isConnected,
  getStatus: dbConfig.getStatus,
  isProductionDBRequired: dbConfig.isProductionDBRequired,
  withTransaction: dbConfig.withTransaction,
  models: {
    User, CustomerProfile, VisaService, VisaApplication, VisaDocument,
    Destination, TourCategory, TourPackage, BookingTraveller, TourBooking,
    Payment, PaymentEvent, Refund, SupportTicket, ChatConversation,
    ChatMessage, ContactInquiry, Notification, AuditLog, Review
  },
  ...repositories,
  PRIVATE_UPLOADS_DIR
};
