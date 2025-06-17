// src/services/advancedCacheManager.js
/**
 * Advanced Multi-Layer Caching System for Product Hub App
 * Implements intelligent caching strategies with automatic invalidation,
 * background refresh, and performance optimization
 */

class AdvancedCacheManager {
  constructor() {
    // Multi-layer cache storage
    this.memoryCache = new Map(); // L1: In-memory cache (fastest)
    this.sessionCache = new Map(); // L2: Session storage cache
    this.persistentCache = new Map(); // L3: IndexedDB cache (persistent)
    
    // Cache configuration
    this.config = {
      memoryTTL: 5 * 60 * 1000, // 5 minutes
      sessionTTL: 30 * 60 * 1000, // 30 minutes
      persistentTTL: 24 * 60 * 60 * 1000, // 24 hours
      maxMemorySize: 50 * 1024 * 1024, // 50MB
      maxSessionSize: 100 * 1024 * 1024, // 100MB
      compressionThreshold: 1024, // 1KB
    };
    
    // Cache statistics
    this.stats = {
      hits: { memory: 0, session: 0, persistent: 0 },
      misses: 0,
      evictions: 0,
      compressions: 0,
      backgroundRefreshes: 0
    };
    
    // Background refresh queue
    this.refreshQueue = new Set();
    this.refreshInProgress = new Set();
    
    // Initialize IndexedDB for persistent cache
    this.initIndexedDB();
    
    // Start background processes
    this.startBackgroundProcesses();
  }

  // Initialize IndexedDB for persistent caching
  async initIndexedDB() {
    try {
      this.db = await this.openIndexedDB();
      console.log('🗄️ IndexedDB initialized for persistent caching');
    } catch (error) {
      console.warn('IndexedDB initialization failed, falling back to memory cache:', error);
    }
  }

  openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ProductHubCache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('category', 'category');
        }
      };
    });
  }

  // Intelligent cache key generation
  generateCacheKey(category, identifier, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|');
    
    return `${category}:${identifier}${paramString ? ':' + paramString : ''}`;
  }

  // Compress data for storage efficiency
  compressData(data) {
    try {
      const jsonString = JSON.stringify(data);
      if (jsonString.length < this.config.compressionThreshold) {
        return { data, compressed: false };
      }
      
      // Simple compression using JSON.stringify optimization
      const compressed = this.simpleCompress(jsonString);
      this.stats.compressions++;
      
      return { data: compressed, compressed: true };
    } catch (error) {
      console.warn('Data compression failed:', error);
      return { data, compressed: false };
    }
  }

  // Simple compression algorithm
  simpleCompress(str) {
    const compressed = {};
    const words = str.split(/\s+/);
    const wordMap = new Map();
    let wordIndex = 0;
    
    words.forEach(word => {
      if (!wordMap.has(word)) {
        wordMap.set(word, wordIndex++);
      }
    });
    
    compressed.dictionary = Array.from(wordMap.keys());
    compressed.indices = words.map(word => wordMap.get(word));
    
    return compressed;
  }

  // Decompress data
  decompressData(compressedData) {
    if (!compressedData.compressed) {
      return compressedData.data;
    }
    
    try {
      const { dictionary, indices } = compressedData.data;
      const decompressed = indices.map(index => dictionary[index]).join(' ');
      return JSON.parse(decompressed);
    } catch (error) {
      console.warn('Data decompression failed:', error);
      return null;
    }
  }

  // Multi-layer cache retrieval
  async get(category, identifier, params = {}) {
    const key = this.generateCacheKey(category, identifier, params);
    
    // L1: Check memory cache first (fastest)
    const memoryResult = this.getFromMemory(key);
    if (memoryResult) {
      this.stats.hits.memory++;
      this.scheduleBackgroundRefresh(key, category, identifier, params);
      return memoryResult;
    }
    
    // L2: Check session cache
    const sessionResult = await this.getFromSession(key);
    if (sessionResult) {
      this.stats.hits.session++;
      // Promote to memory cache
      this.setInMemory(key, sessionResult, category);
      this.scheduleBackgroundRefresh(key, category, identifier, params);
      return sessionResult;
    }
    
    // L3: Check persistent cache
    const persistentResult = await this.getFromPersistent(key);
    if (persistentResult) {
      this.stats.hits.persistent++;
      // Promote to higher cache levels
      this.setInMemory(key, persistentResult, category);
      this.setInSession(key, persistentResult, category);
      this.scheduleBackgroundRefresh(key, category, identifier, params);
      return persistentResult;
    }
    
    this.stats.misses++;
    return null;
  }

  // Store data in all appropriate cache levels
  async set(category, identifier, data, params = {}, options = {}) {
    const key = this.generateCacheKey(category, identifier, params);
    const {
      memoryOnly = false,
      sessionOnly = false,
      skipPersistent = false,
      customTTL = null
    } = options;
    
    // Always store in memory cache
    this.setInMemory(key, data, category, customTTL);
    
    if (!memoryOnly) {
      // Store in session cache
      this.setInSession(key, data, category, customTTL);
      
      if (!sessionOnly && !skipPersistent) {
        // Store in persistent cache
        await this.setInPersistent(key, data, category, customTTL);
      }
    }
  }

  // Memory cache operations
  getFromMemory(key) {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return this.decompressData(entry);
  }

  setInMemory(key, data, category, customTTL = null) {
    const ttl = customTTL || this.config.memoryTTL;
    const compressed = this.compressData(data);
    
    this.memoryCache.set(key, {
      ...compressed,
      category,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    });
    
    this.enforceMemoryLimit();
  }

  // Session cache operations
  async getFromSession(key) {
    try {
      const item = sessionStorage.getItem(`phc_${key}`);
      if (!item) return null;
      
      const entry = JSON.parse(item);
      if (Date.now() > entry.expiry) {
        sessionStorage.removeItem(`phc_${key}`);
        return null;
      }
      
      return this.decompressData(entry);
    } catch (error) {
      console.warn('Session cache read error:', error);
      return null;
    }
  }

  setInSession(key, data, category, customTTL = null) {
    try {
      const ttl = customTTL || this.config.sessionTTL;
      const compressed = this.compressData(data);
      
      const entry = {
        ...compressed,
        category,
        timestamp: Date.now(),
        expiry: Date.now() + ttl
      };
      
      sessionStorage.setItem(`phc_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Session cache write error:', error);
      this.cleanupSessionStorage();
    }
  }

  // Persistent cache operations
  async getFromPersistent(key) {
    if (!this.db) return null;
    
    try {
      const transaction = this.db.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const entry = request.result;
          if (!entry || Date.now() > entry.expiry) {
            resolve(null);
          } else {
            resolve(this.decompressData(entry));
          }
        };
        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.warn('Persistent cache read error:', error);
      return null;
    }
  }

  async setInPersistent(key, data, category, customTTL = null) {
    if (!this.db) return;
    
    try {
      const ttl = customTTL || this.config.persistentTTL;
      const compressed = this.compressData(data);
      
      const entry = {
        key,
        ...compressed,
        category,
        timestamp: Date.now(),
        expiry: Date.now() + ttl
      };
      
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      store.put(entry);
    } catch (error) {
      console.warn('Persistent cache write error:', error);
    }
  }

  // Background refresh scheduling
  scheduleBackgroundRefresh(key, category, identifier, params) {
    if (this.refreshInProgress.has(key)) return;
    
    this.refreshQueue.add({ key, category, identifier, params });
  }

  // Start background processes
  startBackgroundProcesses() {
    // Background refresh processor
    setInterval(() => {
      this.processBackgroundRefresh();
    }, 30000); // Every 30 seconds
    
    // Cache cleanup
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 300000); // Every 5 minutes
    
    // Memory monitoring
    setInterval(() => {
      this.monitorMemoryUsage();
    }, 60000); // Every minute
  }

  // Process background refresh queue
  async processBackgroundRefresh() {
    if (this.refreshQueue.size === 0) return;
    
    const refreshItems = Array.from(this.refreshQueue).slice(0, 3); // Process 3 at a time
    this.refreshQueue.clear();
    
    for (const item of refreshItems) {
      if (this.refreshInProgress.has(item.key)) continue;
      
      this.refreshInProgress.add(item.key);
      
      try {
        // This would be implemented by the consuming service
        // to provide fresh data for background refresh
        if (this.backgroundRefreshHandler) {
          const freshData = await this.backgroundRefreshHandler(item);
          if (freshData) {
            await this.set(item.category, item.identifier, freshData, item.params);
            this.stats.backgroundRefreshes++;
          }
        }
      } catch (error) {
        console.warn('Background refresh failed:', error);
      } finally {
        this.refreshInProgress.delete(item.key);
      }
    }
  }

  // Cleanup expired entries
  cleanupExpiredEntries() {
    const now = Date.now();
    
    // Memory cache cleanup
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiry) {
        this.memoryCache.delete(key);
        this.stats.evictions++;
      }
    }
    
    // Session storage cleanup
    this.cleanupSessionStorage();
    
    // Persistent cache cleanup
    this.cleanupPersistentCache();
  }

  cleanupSessionStorage() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('phc_')) {
          try {
            const item = JSON.parse(sessionStorage.getItem(key));
            if (Date.now() > item.expiry) {
              keysToRemove.push(key);
            }
          } catch (error) {
            keysToRemove.push(key); // Remove corrupted entries
          }
        }
      }
      
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
    } catch (error) {
      console.warn('Session storage cleanup error:', error);
    }
  }

  async cleanupPersistentCache() {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('timestamp');
      const now = Date.now();
      
      const request = index.openCursor();
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (now > cursor.value.expiry) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    } catch (error) {
      console.warn('Persistent cache cleanup error:', error);
    }
  }

  // Memory management
  enforceMemoryLimit() {
    const currentSize = this.estimateMemorySize();
    if (currentSize > this.config.maxMemorySize) {
      this.evictLeastRecentlyUsed();
    }
  }

  estimateMemorySize() {
    let size = 0;
    for (const entry of this.memoryCache.values()) {
      size += JSON.stringify(entry).length * 2; // Rough estimate
    }
    return size;
  }

  evictLeastRecentlyUsed() {
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toEvict = Math.ceil(entries.length * 0.2); // Evict 20%
    
    for (let i = 0; i < toEvict; i++) {
      this.memoryCache.delete(entries[i][0]);
      this.stats.evictions++;
    }
  }

  monitorMemoryUsage() {
    if (performance.memory) {
      const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
      const usage = (usedJSHeapSize / jsHeapSizeLimit) * 100;
      
      if (usage > 80) {
        console.warn(`🧠 High memory usage: ${usage.toFixed(1)}%`);
        this.evictLeastRecentlyUsed();
      }
    }
  }

  // Cache invalidation
  invalidate(category, identifier = null, params = {}) {
    if (identifier) {
      const key = this.generateCacheKey(category, identifier, params);
      this.invalidateKey(key);
    } else {
      this.invalidateCategory(category);
    }
  }

  invalidateKey(key) {
    this.memoryCache.delete(key);
    sessionStorage.removeItem(`phc_${key}`);
    
    if (this.db) {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      store.delete(key);
    }
  }

  invalidateCategory(category) {
    // Memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.category === category) {
        this.memoryCache.delete(key);
      }
    }
    
    // Session storage
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('phc_')) {
        try {
          const item = JSON.parse(sessionStorage.getItem(key));
          if (item.category === category) {
            sessionStorage.removeItem(key);
          }
        } catch (error) {
          // Remove corrupted entries
          sessionStorage.removeItem(key);
        }
      }
    }
    
    // Persistent cache
    if (this.db) {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('category');
      const request = index.openCursor(IDBKeyRange.only(category));
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    }
  }

  // Set background refresh handler
  setBackgroundRefreshHandler(handler) {
    this.backgroundRefreshHandler = handler;
  }

  // Get cache statistics
  getStats() {
    return {
      ...this.stats,
      memoryEntries: this.memoryCache.size,
      estimatedMemorySize: this.estimateMemorySize(),
      refreshQueueSize: this.refreshQueue.size,
      refreshInProgress: this.refreshInProgress.size
    };
  }

  // Clear all caches
  clear() {
    this.memoryCache.clear();
    sessionStorage.clear();
    
    if (this.db) {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      store.clear();
    }
  }
}

// Create singleton instance
const advancedCacheManager = new AdvancedCacheManager();

export default advancedCacheManager;
