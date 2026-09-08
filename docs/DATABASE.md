# JMT TRAVELS — Database Architecture & Schema Specification

## 1. Primary Datastore

MongoDB Atlas (with Mongoose ORM) is the specified production database for JMT TRAVELS V1. A transparent storage repository adapter (`db.js`) is implemented to provide automatic persistent JSON storage fallback (`backend/data/*.json`) when running in local development without remote database credentials.

## 2. Collections & Entity Models

### `users`
- `id` (String / ObjectId)
- `name` (String)
- `email` (String, Indexed, Unique)
- `phone` (String)
- `passwordHash` (String)
- `role` (Enum: `CUSTOMER`, `STAFF`, `ADMIN`, `SUPER_ADMIN`)
- `verified` (Boolean)
- `createdAt` / `updatedAt` (ISO Timestamp)

### `visaServices`
- `id` / `slug` (String, Indexed)
- `country` (String)
- `visaType` (String)
- `validity` (String)
- `processingTime` (String)
- `entryType` (String)
- `priceMinor` (Number, Integer minor units)
- `currency` (String)
- `overview` (String)
- `requiredDocuments` (Array of Strings)
- `published` (Boolean)

### `visaApplications`
- `id` / `applicationNumber` (String, Indexed, e.g. `JMT-V-1234567`)
- `userId` (String, Indexed, Nullable)
- `destination` (String)
- `visaType` (String)
- `fullName` (String)
- `email` (String)
- `phone` (String)
- `passportNumber` (String)
- `status` (Enum: `DRAFT`, `SUBMITTED`, `PAYMENT_PENDING`, `PAYMENT_COMPLETED`, `DOCUMENT_REVIEW`, `PROCESSING`, `ADDITIONAL_INFORMATION_REQUIRED`, `APPROVED`, `REJECTED`, `CANCELLED`, `COMPLETED`)
- `documents` (Array of document IDs)
- `timeline` (Array of status log events)

### `visaDocuments`
- `id` / `documentId` (String, Indexed)
- `applicationId` (String, Nullable)
- `documentType` (String)
- `storageKey` (String)
- `originalFilename` (String)
- `mimeType` (String)
- `fileSize` (Number)
- `uploadedBy` (String, Indexed)

### `tourPackages`
- `id` / `slug` (String, Indexed)
- `title` (String)
- `destination` (String)
- `category` (String)
- `duration` (String)
- `priceMinor` (Number)
- `currency` (String)
- `image` (String)
- `summary` (String)
- `highlights` (Array)
- `inclusions` (Array)
- `published` (Boolean)

### `tourBookings`
- `id` / `bookingNumber` (String, Indexed, e.g. `JMT-B-1234567`)
- `packageId` (String)
- `packageTitle` (String)
- `userId` (String, Indexed)
- `travellerName` (String)
- `email` (String)
- `phone` (String)
- `travellers` (Number)
- `amount` (Number)
- `currency` (String)
- `status` (Enum: `PENDING`, `PAYMENT_PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `REFUND_PENDING`, `REFUNDED`)

### `payments`
- `id` (String)
- `userId` (String, Indexed)
- `bookingId` (String, Nullable)
- `visaApplicationId` (String, Nullable)
- `provider` (Enum: `SANDBOX`, `PAYTABS`, `RAZORPAY`, `STRIPE`)
- `providerOrderId` (String, Indexed)
- `providerPaymentId` (String, Nullable)
- `amount` (Number)
- `currency` (String)
- `status` (Enum: `PAYMENT_PENDING`, `COMPLETED`, `FAILED`, `REFUNDED`)

### `auditLogs`
- `id` (String)
- `actorId` (String)
- `actorRole` (String)
- `action` (String)
- `entityType` (String)
- `entityId` (String)
- `timestamp` (ISO Timestamp)
