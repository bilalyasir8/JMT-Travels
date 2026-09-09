/**
 * JMT TRAVELS — Storage Service Abstraction & File Security Gateway
 * Encapsulates file upload, private storage retrieval, streaming, path traversal protection,
 * magic byte signature verification, and Amazon S3 cloud integration readiness.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class FileSecurityService {
  /**
   * Magic bytes signature check for file content verification
   */
  static verifyFileSignature(buffer, mimeType, extension) {
    if (!buffer || buffer.length < 4) return false;

    const hex = buffer.toString('hex', 0, 8).toUpperCase();
    const ext = extension.toLowerCase().replace('.', '');

    // Prohibited Executable & Script Extensions
    const forbiddenExts = ['exe', 'js', 'html', 'htm', 'php', 'sh', 'bat', 'cmd', 'vbs', 'jar', 'phtml', 'cgi', 'pl', 'py'];
    if (forbiddenExts.includes(ext)) {
      return false;
    }

    // Magic Bytes Verification
    if (ext === 'pdf' || mimeType === 'application/pdf') {
      return hex.startsWith('25504446'); // %PDF
    }
    if (['jpg', 'jpeg'].includes(ext) || mimeType === 'image/jpeg') {
      return hex.startsWith('FFD8FF'); // JPEG
    }
    if (ext === 'png' || mimeType === 'image/png') {
      return hex.startsWith('89504E47'); // PNG
    }
    if (ext === 'webp' || mimeType === 'image/webp') {
      return hex.startsWith('52494646'); // RIFF/WEBP
    }

    return false;
  }
}

class StorageService {
  constructor() {
    this.storageDir = path.join(__dirname, '../data/private-uploads');
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
    this.provider = process.env.STORAGE_PROVIDER || 'LOCAL'; // 'LOCAL' or 'S3' (Prepared interface)
  }

  /**
   * Generates a safe server-controlled storage key
   */
  generateStorageKey(originalName, mimeType) {
    const ext = path.extname(originalName || '').toLowerCase() || '.bin';
    const cleanExt = ext.replace(/[^a-z0-9.]/gi, '');
    return `doc_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${cleanExt}`;
  }

  /**
   * Path traversal protection
   */
  sanitizePath(storageKey) {
    if (!storageKey || typeof storageKey !== 'string') {
      throw new Error('Invalid storage key.');
    }
    // Prevent directory traversal attacks (../ or ..\)
    const baseName = path.basename(storageKey);
    const resolvedPath = path.resolve(this.storageDir, baseName);
    if (!resolvedPath.startsWith(path.resolve(this.storageDir))) {
      throw new Error('Security Error: Path traversal attempt detected.');
    }
    return resolvedPath;
  }

  /**
   * Save uploaded file to private storage
   */
  async upload(fileBuffer, originalName, mimeType) {
    const storageKey = this.generateStorageKey(originalName, mimeType);
    const ext = path.extname(originalName);

    // Signature / Magic Bytes Check
    const isValidSignature = FileSecurityService.verifyFileSignature(fileBuffer, mimeType, ext);
    if (!isValidSignature) {
      throw new Error('Security Violation: File format or content signature verification failed. Executables and invalid file formats are prohibited.');
    }

    const filePath = this.sanitizePath(storageKey);
    await fs.promises.writeFile(filePath, fileBuffer);

    return {
      storageKey,
      storageProvider: this.provider,
      size: fileBuffer.length,
      mimeType
    };
  }

  /**
   * Retrieve file buffer from storage
   */
  async retrieve(storageKey) {
    const filePath = this.sanitizePath(storageKey);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found in storage.');
    }
    return await fs.promises.readFile(filePath);
  }

  /**
   * Create readable stream for secure downloading
   */
  downloadStream(storageKey) {
    const filePath = this.sanitizePath(storageKey);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found in storage.');
    }
    return fs.createReadStream(filePath);
  }

  /**
   * Delete file from storage
   */
  async delete(storageKey) {
    const filePath = this.sanitizePath(storageKey);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  }

  /**
   * Check file existence
   */
  exists(storageKey) {
    try {
      const filePath = this.sanitizePath(storageKey);
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  /**
   * Get metadata
   */
  async getMetadata(storageKey) {
    const filePath = this.sanitizePath(storageKey);
    const stats = await fs.promises.stat(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  }
}

module.exports = {
  storageService: new StorageService(),
  FileSecurityService
};
