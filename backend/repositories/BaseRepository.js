/**
 * JMT TRAVELS — Base Repository (Data Access Layer)
 * Encapsulates Mongoose MongoDB queries with production rule enforcement.
 * In production or DATABASE_MODE=mongodb, fails safely if MongoDB is disconnected.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dbConfig = require('../config/db');

const DATA_DIR = path.join(__dirname, '../data');

function readJson(key) {
  try {
    const filePath = path.join(DATA_DIR, `${key}.json`);
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

function writeJson(key, data) {
  try {
    const filePath = path.join(DATA_DIR, `${key}.json`);
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch {
    return false;
  }
}

class BaseRepository {
  constructor(name, mongooseModel) {
    this.name = name;
    this.model = mongooseModel;
  }

  _checkProductionStatus() {
    const status = dbConfig.getStatus();
    if (!status.isConnected && dbConfig.isProductionDBRequired()) {
      const err = new Error('Database service unavailable. Required MongoDB connection is offline in production mode.');
      err.statusCode = 503;
      err.code = 'DATABASE_UNAVAILABLE';
      throw err;
    }
    return status.isConnected;
  }

  async find(filter = {}) {
    const isConnected = this._checkProductionStatus();
    if (isConnected && this.model) {
      const docs = await this.model.find(filter).lean();
      return docs.map(d => ({ ...d, id: d.id || d._id.toString() }));
    }
    const items = readJson(this.name);
    return items.filter(item => {
      return Object.entries(filter).every(([k, v]) => {
        if (v === undefined) return true;
        if (typeof v === 'object' && v !== null) {
          if (v.$in) return v.$in.includes(item[k]);
          if (v.$ne) return item[k] !== v.$ne;
        }
        return item[k] === v;
      });
    });
  }

  async findOne(filter = {}) {
    const isConnected = this._checkProductionStatus();
    if (isConnected && this.model) {
      const doc = await this.model.findOne(filter).lean();
      if (!doc) return null;
      return { ...doc, id: doc.id || doc._id.toString() };
    }
    const items = await this.find(filter);
    return items[0] || null;
  }

  async findById(id) {
    return this.findOne({ id });
  }

  async create(data) {
    const isConnected = this._checkProductionStatus();
    const id = data.id || `${this.name.slice(0, 3)}_${crypto.randomUUID()}`;
    const newItem = {
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };

    if (isConnected && this.model) {
      const created = await this.model.create(newItem);
      return { ...created.toObject(), id: created.id || created._id.toString() };
    }

    const items = readJson(this.name);
    items.unshift(newItem);
    writeJson(this.name, items);
    return newItem;
  }

  async update(id, updates) {
    const isConnected = this._checkProductionStatus();
    if (isConnected && this.model) {
      const updated = await this.model.findOneAndUpdate(
        { $or: [{ id }, { _id: id }] },
        { $set: { ...updates, updatedAt: new Date().toISOString() } },
        { new: true }
      ).lean();
      if (updated) return { ...updated, id: updated.id || updated._id.toString() };
    }

    const items = readJson(this.name);
    const index = items.findIndex(item => item.id === id || item._id === id);
    if (index === -1) return null;

    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    writeJson(this.name, items);
    return items[index];
  }

  async delete(id) {
    const isConnected = this._checkProductionStatus();
    if (isConnected && this.model) {
      const res = await this.model.deleteOne({ $or: [{ id }, { _id: id }] });
      return res.deletedCount > 0;
    }
    let items = readJson(this.name);
    const initLen = items.length;
    items = items.filter(item => item.id !== id && item._id !== id);
    if (items.length !== initLen) {
      writeJson(this.name, items);
      return true;
    }
    return false;
  }

  async count(filter = {}) {
    const items = await this.find(filter);
    return items.length;
  }
}

module.exports = BaseRepository;
