/**
 * JMT TRAVELS — Visa & Document Management Business Service
 * Encapsulates Visa Application lifecycle, state transition validation matrix,
 * document upload security, review workflow, and notification hooks.
 */

const db = require('../db');
const { storageService } = require('./storage');
const notificationService = require('./notification');
const crypto = require('crypto');
const path = require('path');

// Legal State Transition Matrix (PDF Task #3 Section 5)
const LEGAL_TRANSITIONS = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  PENDING_DOCUMENTS: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['UNDER_REVIEW', 'CANCELLED'],
  UNDER_REVIEW: ['ADDITIONAL_DOCUMENTS_REQUIRED', 'PROCESSING', 'APPROVED', 'REJECTED', 'CANCELLED'],
  ADDITIONAL_DOCUMENTS_REQUIRED: ['UNDER_REVIEW', 'PROCESSING', 'CANCELLED'],
  PROCESSING: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['COMPLETED', 'CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
  COMPLETED: [],
  'Documents required': ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'] // Legacy backward compatibility
};

class VisaService {
  /**
   * Generates a unique durable application reference (e.g. JMT-V-1234567)
   */
  generateReference() {
    return `JMT-V-${Date.now().toString().slice(-7)}`;
  }

  /**
   * Validates state transitions against the legal matrix
   */
  validateStateTransition(currentStatus, targetStatus, userRole, isSystemAction = false) {
    if (currentStatus === targetStatus) return true;

    // Customer restriction: Customers can ONLY move DRAFT/PENDING -> SUBMITTED or CANCELLED
    if (!isSystemAction && userRole === 'CUSTOMER') {
      const allowedCustomerActions = ['SUBMITTED', 'CANCELLED'];
      if (!allowedCustomerActions.includes(targetStatus)) {
        throw new Error(`Permission Denied: Customers cannot directly transition application to ${targetStatus}.`);
      }
    }

    const validNextStates = LEGAL_TRANSITIONS[currentStatus] || [];
    if (!validNextStates.includes(targetStatus)) {
      throw new Error(`Invalid State Transition: Cannot move application status from '${currentStatus}' to '${targetStatus}'.`);
    }
    return true;
  }

  /**
   * Sanitize application object for customer presentation (Hides adminNotes)
   */
  sanitizeApplication(appRecord, userRole) {
    if (!appRecord) return null;
    const isStaff = ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(userRole);
    const obj = typeof appRecord.toObject === 'function' ? appRecord.toObject() : { ...appRecord };
    if (!isStaff) {
      delete obj.adminNotes;
    }
    return obj;
  }

  /**
   * Create or Save Draft Visa Application
   */
  async createApplication(data, actorUser) {
    const { destination, visaType, nationality, fullName, email, phone, passportNumber, dateOfBirth, passportExpiry, travelDate, isDraft } = data;

    if (!isDraft) {
      if (!destination || !fullName || !email || !phone) {
        throw new Error('Validation Error: Full name, email, phone, and destination are required for submission.');
      }
    }

    const reference = this.generateReference();
    const initialStatus = isDraft ? 'DRAFT' : 'SUBMITTED';

    const appRecord = await db.visaApplications.create({
      applicationNumber: reference,
      userId: actorUser ? actorUser.id : null,
      destination,
      visaType: visaType || 'Tourist',
      nationality: nationality || '',
      fullName,
      email,
      phone,
      passportNumber: passportNumber || '',
      dateOfBirth: dateOfBirth || '',
      passportExpiry: passportExpiry || '',
      travelDate: travelDate || '',
      status: initialStatus,
      documents: [],
      requestedDocuments: [],
      timeline: [{
        applicationId: reference,
        previousStatus: 'NONE',
        newStatus: initialStatus,
        changedBy: actorUser ? actorUser.id : 'GUEST',
        timestamp: new Date(),
        note: isDraft ? 'Draft application saved.' : 'Visa application submitted.'
      }]
    });

    if (!isDraft) {
      await notificationService.dispatchEvent('VISA_APPLICATION_SUBMITTED', {
        email: appRecord.email,
        phone: appRecord.phone,
        reference: appRecord.applicationNumber,
        user: actorUser
      });
    }

    return appRecord;
  }

  /**
   * Execute State Transition
   */
  async transitionStatus(applicationId, targetStatus, actorUser, note = '', isSystemAction = false) {
    const appRecord = await db.visaApplications.findById(applicationId) || await db.visaApplications.findOne({ applicationNumber: applicationId });
    if (!appRecord) throw new Error('Visa application not found.');

    const userRole = actorUser ? actorUser.role : 'GUEST';
    this.validateStateTransition(appRecord.status, targetStatus, userRole, isSystemAction);

    const previousStatus = appRecord.status;
    const timeline = appRecord.timeline || [];
    timeline.push({
      applicationId: appRecord.applicationNumber || appRecord.id,
      previousStatus,
      newStatus: targetStatus,
      changedBy: actorUser ? actorUser.id : 'SYSTEM',
      timestamp: new Date(),
      note: note || `Status changed from ${previousStatus} to ${targetStatus}`
    });

    const updated = await db.visaApplications.update(appRecord.id, {
      status: targetStatus,
      timeline
    });

    await notificationService.dispatchEvent('VISA_STATUS_CHANGED', {
      email: appRecord.email,
      phone: appRecord.phone,
      reference: appRecord.applicationNumber,
      status: targetStatus
    });

    return updated;
  }

  /**
   * Request Additional Documents (Staff/Admin Only)
   */
  async requestAdditionalDocuments(applicationId, documentType, instruction, actorUser) {
    const appRecord = await db.visaApplications.findById(applicationId) || await db.visaApplications.findOne({ applicationNumber: applicationId });
    if (!appRecord) throw new Error('Visa application not found.');

    const requests = appRecord.requestedDocuments || [];
    const newRequest = {
      requestId: `req_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      documentType,
      instruction: instruction || `Please upload your ${documentType}`,
      requestedBy: actorUser.id,
      requestedAt: new Date(),
      status: 'PENDING'
    };
    requests.push(newRequest);

    await db.visaApplications.update(appRecord.id, {
      requestedDocuments: requests
    });

    await this.transitionStatus(appRecord.id, 'ADDITIONAL_DOCUMENTS_REQUIRED', actorUser, `Requested additional document: ${documentType}`);
    await notificationService.dispatchEvent('ADDITIONAL_DOCUMENTS_REQUIRED', {
      email: appRecord.email,
      phone: appRecord.phone,
      reference: appRecord.applicationNumber,
      documentType
    });

    return newRequest;
  }

  /**
   * Upload Document & Attach to Application
   */
  async uploadDocument(fileBuffer, originalName, mimeType, applicationId, documentType, actorUser) {
    const appRecord = await db.visaApplications.findById(applicationId) || await db.visaApplications.findOne({ applicationNumber: applicationId });
    if (!appRecord) throw new Error('Visa application not found.');

    // IDOR Check: Must own application or be staff
    const isStaff = ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(actorUser.role);
    if (!isStaff && appRecord.userId !== actorUser.id) {
      throw new Error('Permission Denied: You do not own this application.');
    }

    // Save to private storage via StorageService
    const stored = await storageService.upload(fileBuffer, originalName, mimeType);

    const docRecord = await db.visaDocuments.create({
      documentId: `doc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      applicationId: appRecord.id,
      documentType: documentType || 'PASSPORT_COPY',
      storageKey: stored.storageKey,
      originalFilename: originalName,
      displayFilename: path.basename(originalName),
      mimeType: stored.mimeType,
      fileSize: stored.size,
      uploadedBy: actorUser.id,
      status: 'UPLOADED'
    });

    // Attach document ID to application
    const docs = appRecord.documents || [];
    docs.push(docRecord.id);

    // Fulfill any matching pending requested document
    const requests = appRecord.requestedDocuments || [];
    let fulfilledAny = false;
    requests.forEach(req => {
      if (req.documentType === documentType && req.status === 'PENDING') {
        req.status = 'FULFILLED';
        fulfilledAny = true;
      }
    });

    await db.visaApplications.update(appRecord.id, {
      documents: docs,
      requestedDocuments: requests
    });

    // If customer responded to additional document request, transition back to UNDER_REVIEW
    if (fulfilledAny && appRecord.status === 'ADDITIONAL_DOCUMENTS_REQUIRED') {
      await this.transitionStatus(appRecord.id, 'UNDER_REVIEW', actorUser, 'Customer submitted requested additional document.', true);
    }

    return docRecord;
  }

  /**
   * Review Document (Staff/Admin Only)
   */
  async reviewDocument(documentId, status, reviewNote, actorUser) {
    const docRecord = await db.visaDocuments.findById(documentId) || await db.visaDocuments.findOne({ documentId });
    if (!docRecord) throw new Error('Document not found.');

    const validStatuses = ['ACCEPTED', 'REJECTED', 'UNDER_REVIEW'];
    if (!validStatuses.includes(status)) throw new Error('Invalid document review status.');

    const updated = await db.visaDocuments.update(docRecord.id, {
      status,
      reviewNote: reviewNote || '',
      reviewedBy: actorUser.id,
      reviewedAt: new Date()
    });

    if (status === 'ACCEPTED') {
      await notificationService.dispatchEvent('DOCUMENT_ACCEPTED', { documentId: docRecord.documentId, user: actorUser });
    } else if (status === 'REJECTED') {
      await notificationService.dispatchEvent('DOCUMENT_REJECTED', { documentId: docRecord.documentId, user: actorUser });
    }

    return updated;
  }
}

module.exports = new VisaService();
