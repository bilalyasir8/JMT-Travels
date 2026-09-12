/**
 * JMT TRAVELS — In-Memory Process-Local Cache Service (Task #11)
 * High-performance, lightweight TTL cache with max entries cap, expiration cleanup,
 * and tag-based cache invalidation.
 * Safe for public data (destinations, categories, published tour packages, visa catalogue).
 * STRICT RULE: Never store private customer data, bookings, payments, or visa applications!
 */

class SimpleCache {
  constructor(defaultTtlMs = 60000, maxEntries = 500) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;
    this.store = new Map();
    this.tags = new Map(); // tag -> Set of keys
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs, tags = null) {
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      // Evict oldest entry
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.delete(firstKey);
    }

    const expiresAt = Date.now() + (ttlMs || this.defaultTtlMs);
    const tagList = Array.isArray(tags) ? tags : (tags ? [tags] : []);
    this.store.set(key, { value, expiresAt, tags: tagList });

    tagList.forEach(tag => {
      if (!this.tags.has(tag)) this.tags.set(tag, new Set());
      this.tags.get(tag).add(key);
    });
  }

  delete(key) {
    const entry = this.store.get(key);
    if (entry && entry.tags) {
      entry.tags.forEach(tag => {
        if (this.tags.has(tag)) {
          this.tags.get(tag).delete(key);
        }
      });
    }
    this.store.delete(key);
  }

  invalidateTag(tag) {
    const keys = this.tags.get(tag);
    if (keys) {
      for (const k of keys) {
        this.store.delete(k);
      }
      this.tags.delete(tag);
    }
  }

  invalidateTags(...tags) {
    tags.forEach(t => this.invalidateTag(t));
  }

  getStats() {
    return {
      totalEntries: this.store.size,
      totalTags: this.tags.size
    };
  }

  clear() {
    this.store.clear();
    this.tags.clear();
  }

  size() {
    return this.store.size;
  }
}

module.exports = new SimpleCache(60000, 500);
