const mongoose = require('mongoose');

const BookingTimelineSchema = new mongoose.Schema({
  bookingNumber: String,
  previousStatus: String,
  newStatus: String,
  changedBy: String,
  timestamp: { type: Date, default: Date.now },
  note: String
}, { _id: false });

const TourBookingSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  bookingNumber: { type: String, unique: true, required: true, index: true },
  packageId: { type: String, required: true, ref: 'TourPackage' },
  packageTitle: String,
  userId: { type: String, index: true, ref: 'User' },
  travellerName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  travellers: { type: Number, default: 1, min: 1 },
  travelDate: String,
  amount: { type: Number, required: true }, // Main decimal amount (e.g. 189)
  unitPriceMinor: { type: Number }, // Unit price in thousandths/minor units
  totalAmountMinor: { type: Number }, // Total amount in thousandths/minor units
  currency: { type: String, default: 'OMR' },
  idempotencyKey: { type: String, index: true },
  packageSnapshot: {
    title: String,
    unitPriceMinor: Number,
    unitPrice: Number,
    currency: String,
    inclusions: [String]
  },
  status: {
    type: String,
    enum: [
      'DRAFT',
      'PENDING',
      'PENDING_PAYMENT',
      'PAYMENT_PENDING',
      'PAYMENT_PROCESSING',
      'PAID',
      'CONFIRMED',
      'PROCESSING',
      'COMPLETED',
      'CANCELLED',
      'REFUND_REQUESTED',
      'REFUND_PENDING',
      'PARTIALLY_REFUNDED',
      'REFUNDED',
      'FAILED',
      'Payment link pending'
    ],
    default: 'PAYMENT_PENDING',
    index: true
  },
  timeline: [BookingTimelineSchema],
  adminNotes: String,
  cancellationReason: String,
  refundRequested: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.models.TourBooking || mongoose.model('TourBooking', TourBookingSchema);
