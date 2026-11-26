/**
 * In-Memory High-Performance TTL + Stale-While-Revalidate (SWR) Cache
 * with In-Flight Request Deduplication and Mutation Version Guards.
 *
 * Eliminates redundant remote PostgreSQL round-trips and thundering-herd spikes
 * while ensuring mutations invalidate both cached entries and stale refreshes.
 */
class MemoryCache {
  constructor() {
    this.store = new Map();
    this.inflight = new Map();
    this.versions = new Map();
  }

  _bumpVersion(key) {
    this.versions.set(key, (this.versions.get(key) || 0) + 1);
  }

  _getVersion(key) {
    return this.versions.get(key) || 0;
  }

  set(key, value, ttlMs = 60000, staleGraceMs = 0) {
    const now = Date.now();
    const expiresAt = now + ttlMs;
    const staleUntil = staleGraceMs > 0 ? expiresAt + staleGraceMs : expiresAt;
    this.store.set(key, { value, expiresAt, staleUntil });
    return value;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      if (Date.now() > entry.staleUntil) {
        this.store.delete(key);
      }
      return null;
    }
    return entry.value;
  }

  del(key) {
    this._bumpVersion(key);
    this.store.delete(key);
    this.inflight.delete(key);
  }

  delPrefix(prefix) {
    const keysToBump = new Set();
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) keysToBump.add(key);
    }
    for (const key of this.inflight.keys()) {
      if (key.startsWith(prefix)) keysToBump.add(key);
    }
    for (const key of keysToBump) {
      this._bumpVersion(key);
      this.store.delete(key);
      this.inflight.delete(key);
    }
  }

  clear() {
    for (const key of this.store.keys()) this._bumpVersion(key);
    for (const key of this.inflight.keys()) this._bumpVersion(key);
    this.store.clear();
    this.inflight.clear();
  }

  /**
   * Deduplicated TTL cache wrapper: concurrent cold misses share a single fetcher call.
   */
  async wrap(key, ttlMs, fetcher, staleGraceMs = 0) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    if (this.inflight.has(key)) {
      return await this.inflight.get(key);
    }

    const startVersion = this._getVersion(key);
    const promise = (async () => {
      try {
        const result = await fetcher();
        // Only store if no mutation invalidated this key while fetching
        if (this._getVersion(key) === startVersion) {
          this.set(key, result, ttlMs, staleGraceMs);
        }
        return result;
      } finally {
        if (this.inflight.get(key) === promise) {
          this.inflight.delete(key);
        }
      }
    })();

    this.inflight.set(key, promise);
    return await promise;
  }

  /**
   * Stale-While-Revalidate wrapper:
   * - Fresh hit: returns cached value in <1ms
   * - Stale hit (within staleGraceMs): returns stale value in <1ms and triggers
   *   a single deduplicated background refresh (cancelled safely on mutations)
   * - Cold miss / expired past grace: deduplicates and awaits fetcher
   */
  async wrapSWR(key, ttlMs, staleGraceMs, fetcher) {
    const entry = this.store.get(key);
    const now = Date.now();

    if (entry) {
      if (now <= entry.expiresAt) {
        return entry.value;
      }
      if (now <= entry.staleUntil) {
        // Trigger background refresh if not already refreshing
        if (!this.inflight.has(key)) {
          const startVersion = this._getVersion(key);
          const bgPromise = (async () => {
            try {
              const fresh = await fetcher();
              if (this._getVersion(key) === startVersion) {
                this.set(key, fresh, ttlMs, staleGraceMs);
              }
              return fresh;
            } catch (err) {
              if (err && (err.statusCode === 401 || err.statusCode === 403)) {
                this.del(key);
              }
              return entry.value;
            } finally {
              if (this.inflight.get(key) === bgPromise) {
                this.inflight.delete(key);
              }
            }
          })();
          this.inflight.set(key, bgPromise);
        }
        return entry.value;
      }
      this.store.delete(key);
    }

    return await this.wrap(key, ttlMs, fetcher, staleGraceMs);
  }
}

module.exports = new MemoryCache();
