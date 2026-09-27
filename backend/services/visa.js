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
  constructor() {
    this.activeReplacements = new Set();
  }

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
      if (obj.passportNumber) {
        const p = String(obj.passportNumber).trim();
        obj.passportNumber = p.length > 4 ? `••••••${p.slice(-4)}` : '••••••';
      }
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

    // Save to private storage via StorageService (validates signature & magic bytes)
    let stored = null;
    let docRecord = null;
    try {
      stored = await storageService.upload(fileBuffer, originalName, mimeType);

      docRecord = await db.visaDocuments.create({
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
    } catch (err) {
      // Compensating Rollback: remove DB record if created
      if (docRecord && docRecord.id) {
        try { await db.visaDocuments.delete(docRecord.id); } catch (_) {}
      }
      // Orphan File Prevention: remove stored file if DB record creation or update fails
      if (stored && stored.storageKey) {
        try { await storageService.delete(stored.storageKey); } catch (_) {}
      }
      throw err;
    }
  }

  /**
   * Safe Document Replacement (Section 13A)
   * Validates ownership & status -> in-flight lock -> persists new file -> creates new DB doc
   * -> updates application references -> marks old doc REPLACED.
   * If any step fails, compensating rollback cleans up new file, deletes new DB doc,
   * restores application references, and ensures old document remains valid.
   */
  async replaceDocument(existingDocumentId, fileBuffer, originalName, mimeType, actorUser) {
    const oldDoc = await db.visaDocuments.findById(existingDocumentId) || await db.visaDocuments.findOne({ documentId: existingDocumentId });
    if (!oldDoc) {
      const err = new Error('Document not found.');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    if (oldDoc.status === 'REPLACED') {
      const err = new Error('Document has already been replaced and cannot be replaced again.');
      err.code = 'DOCUMENT_ALREADY_REPLACED';
      err.statusCode = 400;
      throw err;
    }

    const appRecord = await db.visaApplications.findById(oldDoc.applicationId) || await db.visaApplications.findOne({ applicationNumber: oldDoc.applicationId });
    const isStaff = ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(actorUser.role);
    if (!isStaff && oldDoc.uploadedBy !== actorUser.id && (!appRecord || appRecord.userId !== actorUser.id)) {
      const err = new Error('Permission Denied: You do not own this document.');
      err.code = 'FORBIDDEN';
      err.statusCode = 403;
      throw err;
    }

    const lockKey = String(oldDoc.id || oldDoc.documentId);
    if (this.activeReplacements.has(lockKey)) {
      const err = new Error('Document replacement is already in progress. Please wait.');
      err.code = 'CONCURRENT_REPLACEMENT';
      err.statusCode = 409;
      throw err;
    }
    this.activeReplacements.add(lockKey);

    let newStored = null;
    let newDocRecord = null;
    let originalAppDocs = null;
    let appDocsModified = false;

    try {
      newStored = await storageService.upload(fileBuffer, originalName, mimeType);

      newDocRecord = await db.visaDocuments.create({
        documentId: `doc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        applicationId: oldDoc.applicationId,
        documentType: oldDoc.documentType,
        storageKey: newStored.storageKey,
        originalFilename: originalName,
        displayFilename: path.basename(originalName),
        mimeType: newStored.mimeType,
        fileSize: newStored.size,
        uploadedBy: actorUser.id,
        status: 'UPLOADED',
        replacesDocumentId: oldDoc.id || oldDoc.documentId
      });

      if (appRecord) {
        originalAppDocs = Array.isArray(appRecord.documents) ? [...appRecord.documents] : [];
        const docs = originalAppDocs.filter(dId => dId !== oldDoc.id && dId !== oldDoc.documentId);
        docs.push(newDocRecord.id);
        await db.visaApplications.update(appRecord.id, { documents: docs });
        appDocsModified = true;
      }

      // Re-verify authoritative state before marking REPLACED
      const freshOldDoc = await db.visaDocuments.findById(oldDoc.id) || await db.visaDocuments.findOne({ documentId: oldDoc.documentId });
      if (freshOldDoc && freshOldDoc.status === 'REPLACED') {
        const conflictErr = new Error('Document was already replaced by another request.');
        conflictErr.code = 'DOCUMENT_ALREADY_REPLACED';
        conflictErr.statusCode = 400;
        throw conflictErr;
      }

      await db.visaDocuments.update(oldDoc.id, {
        status: 'REPLACED',
        replacedByDocumentId: newDocRecord.id
      });

      return newDocRecord;
    } catch (err) {
      // Compensating Rollback:
      // 1. Revert visa application document references if modified
      if (appDocsModified && appRecord && originalAppDocs) {
        try {
          await db.visaApplications.update(appRecord.id, { documents: originalAppDocs });
        } catch (appErr) {
          console.error('[Rollback Error] Failed to restore application documents:', appErr.message);
        }
      }

      // 2. Remove newly created DB document record
      if (newDocRecord && newDocRecord.id) {
        try {
          await db.visaDocuments.delete(newDocRecord.id);
        } catch (dbErr) {
          console.error('[Rollback Error] Failed to delete replacement document DB record:', dbErr.message);
        }
      }

      // 3. Remove physical file from private storage
      if (newStored && newStored.storageKey) {
        try {
          await storageService.delete(newStored.storageKey);
        } catch (fsErr) {
          console.error('[Rollback Error] Failed to delete physical storage file:', fsErr.message);
        }
      }

      // 4. Ensure old document retains original valid status
      if (oldDoc && oldDoc.id) {
        try {
          const currentOld = await db.visaDocuments.findById(oldDoc.id);
          if (currentOld && currentOld.status === 'REPLACED' && (!newDocRecord || currentOld.replacedByDocumentId === newDocRecord.id)) {
            await db.visaDocuments.update(oldDoc.id, {
              status: oldDoc.status || 'UPLOADED',
              replacedByDocumentId: oldDoc.replacedByDocumentId || null
            });
          }
        } catch (_) {}
      }

      throw err;
    } finally {
      this.activeReplacements.delete(lockKey);
    }
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
