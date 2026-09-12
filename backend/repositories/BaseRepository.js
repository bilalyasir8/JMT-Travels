/**
 * JMT TRAVELS — Base Repository (Data Access Layer)
 * Encapsulates Mongoose MongoDB queries with production rule enforcement, field projections,
 * query pagination, and high-performance count aggregation (Task #11).
 * In production or DATABASE_MODE=mongodb, fails safely if MongoDB is disconnected.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
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

  async find(filter = {}, projection = null, options = {}) {
    if (projection && typeof projection === 'object' && !Array.isArray(projection) && (projection.projection !== undefined || projection.lean !== undefined || projection.sort !== undefined || projection.limit !== undefined)) {
      options = { ...projection, ...options };
      projection = projection.projection || null;
    }

    const isConnected = this._checkProductionStatus();
    if (isConnected && this.model) {
      let query = this.model.find(filter);
      if (projection) query = query.select(projection);
      if (options.sort) query = query.sort(options.sort);
      if (options.skip !== undefined && options.skip !== null) query = query.skip(options.skip);
      if (options.limit !== undefined && options.limit !== null) query = query.limit(options.limit);
      const docs = await query.lean();
      return docs.map(d => ({ ...d, id: d.id || (d._id ? d._id.toString() : d.id) }));
    }

    let items = readJson(this.name);
    items = items.filter(item => {
      return Object.entries(filter).every(([k, v]) => {
        if (v === undefined) return true;
        if (typeof v === 'object' && v !== null) {
          if (v.$in) return v.$in.includes(item[k]);
          if (v.$ne) return item[k] !== v.$ne;
        }
        return item[k] === v;
      });
    });

    if (options.sort && typeof options.sort === 'object') {
      const sortEntries = Object.entries(options.sort);
      items.sort((a, b) => {
        for (const [k, dir] of sortEntries) {
          const valA = a[k];
          const valB = b[k];
          if (valA < valB) return dir === 1 || dir === 'asc' ? -1 : 1;
          if (valA > valB) return dir === 1 || dir === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    if (options.skip) {
      items = items.slice(options.skip);
    }
    if (options.limit) {
      items = items.slice(0, options.limit);
    }

    if (projection) {
      const fields = typeof projection === 'string' ? projection.split(' ').filter(Boolean) : Object.keys(projection);
      if (fields.length > 0) {
        items = items.map(item => {
          const projected = { id: item.id };
          fields.forEach(f => {
            if (item[f] !== undefined) projected[f] = item[f];
          });
          return projected;
        });
      }
    }

    return items;
  }

  async findOne(filter = {}, projection = null) {
    const isConnected = this._checkProductionStatus();
    if (isConnected && this.model) {
      let query = this.model.findOne(filter);
      if (projection) query = query.select(projection);
      const doc = await query.lean();
      if (!doc) return null;
      return { ...doc, id: doc.id || (doc._id ? doc._id.toString() : doc.id) };
    }
    const items = await this.find(filter, projection, { limit: 1 });
    return items[0] || null;
  }

  async findById(id, projection = null) {
    const isConnected = this._checkProductionStatus();
    if (isConnected && this.model) {
      const isObjId = mongoose.Types.ObjectId.isValid(id);
      let query = this.model.findOne(isObjId ? { $or: [{ id }, { _id: id }] } : { id });
      if (projection) query = query.select(projection);
      const doc = await query.lean();
      if (!doc) return null;
      return { ...doc, id: doc.id || (doc._id ? doc._id.toString() : doc.id) };
    }
    return this.findOne({ id }, projection);
  }

  async count(filter = {}) {
    const isConnected = this._checkProductionStatus();
    if (isConnected && this.model) {
      return await this.model.countDocuments(filter);
    }
    const items = await this.find(filter);
    return items.length;
  }

  async findPaginated(filterArg = {}, projectionArg = null, optionsArg = {}) {
    let filter = filterArg;
    let projection = projectionArg;
    let options = optionsArg;
    let pageVal, limitVal;

    if (filterArg && typeof filterArg === 'object' && (filterArg.query !== undefined || filterArg.filter !== undefined || filterArg.page !== undefined)) {
      filter = filterArg.filter || filterArg.query || {};
      pageVal = filterArg.page;
      limitVal = filterArg.limit;
      projection = filterArg.projection || null;
      options = filterArg;
    }

    const page = Math.max(1, parseInt(options.page || pageVal) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(options.limit || limitVal) || 10));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.count(filter),
      this.find(filter, projection, { ...options, skip, limit })
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    const pagination = { total, page, limit, totalPages };
    return { data, total, page, limit, totalPages, pagination };
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
}

module.exports = BaseRepository;
