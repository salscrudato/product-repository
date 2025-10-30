/**
 * Cache Service
 * Provides in-memory caching with TTL, size limits, and performance metrics
 */

import logger, { LOG_CATEGORIES } from '@utils/logger';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
  size: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number;
  entries: number;
  hits: number;
  misses: number;
  hitRate: number;
  avgEntrySize: number;
}

/**
 * Generic cache service with TTL and size management
 */
export class CacheService<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private defaultTTL: number;
  private hits: number = 0;
  private misses: number = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxSize: number = 100, defaultTTL: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.startCleanup();
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    entry.hits++;
    this.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl: number = this.defaultTTL): void {
    // Estimate size (rough approximation)
    const size = JSON.stringify(value).length;

    // Check if adding this would exceed max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      size
    });

    logger.debug(LOG_CATEGORIES.CACHE, 'Cache entry set', {
      key,
      ttl,
      size,
      cacheSize: this.cache.size
    });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(LOG_CATEGORIES.CACHE, 'Cache cleared', { entriesCleared: size });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get or compute value
   */
  async getOrCompute(
    key: string,
    computeFn: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      logger.debug(LOG_CATEGORIES.CACHE, 'Cache hit', { key });
      return cached;
    }

    logger.debug(LOG_CATEGORIES.CACHE, 'Cache miss, computing', { key });
    const value = await computeFn();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let totalSize = 0;
    this.cache.forEach(entry => {
      totalSize += entry.size;
    });

    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      size: totalSize,
      entries: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate,
      avgEntrySize: this.cache.size > 0 ? totalSize / this.cache.size : 0
    };
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    this.cache.forEach((entry, key) => {
      if (entry.timestamp < lruTime) {
        lruTime = entry.timestamp;
        lruKey = key;
      }
    });

    if (lruKey) {
      this.cache.delete(lruKey);
      logger.debug(LOG_CATEGORIES.CACHE, 'LRU eviction', { key: lruKey });
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      let cleaned = 0;
      const now = Date.now();

      this.cache.forEach((entry, key) => {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
          cleaned++;
        }
      });

      if (cleaned > 0) {
        logger.debug(LOG_CATEGORIES.CACHE, 'Cleanup completed', {
          entriesRemoved: cleaned,
          remainingEntries: this.cache.size
        });
      }
    }, 60000); // Run every minute
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * Global cache instances for different data types
 */
export const cacheServices = {
  products: new CacheService(50, 10 * 60 * 1000),      // 10 minutes
  coverages: new CacheService(100, 10 * 60 * 1000),    // 10 minutes
  forms: new CacheService(100, 10 * 60 * 1000),        // 10 minutes
  ai: new CacheService(20, 30 * 60 * 1000),            // 30 minutes
  general: new CacheService(100, 5 * 60 * 1000)        // 5 minutes
};

/**
 * Cleanup all cache services
 */
export function cleanupAllCaches(): void {
  Object.values(cacheServices).forEach(cache => cache.destroy());
}

