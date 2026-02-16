/**
 * Optimized Firebase Service
 *
 * Enhancements:
 * - Intelligent caching with TTL management
 * - Exponential backoff retry logic
 * - Query queue management for concurrency control
 * - Batch operations with automatic flushing
 * - Fallback to cached data on errors
 * - Performance monitoring and logging
 */

import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  enableNetwork,
  disableNetwork,
  QueryConstraint
} from 'firebase/firestore';
import { db, safeOnSnapshot } from '../firebase';
import logger, { LOG_CATEGORIES } from '../utils/logger';
import { CACHE } from '../config/constants';

/**
 * Simple cache entry for Firebase data
 * Note: This is intentionally different from CacheService's CacheEntry
 * which has additional metadata (ttl, hits, size) for advanced caching
 */
interface FirebaseCacheEntry<T> {
  data: T;
  timestamp: number;
}

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}

class FirebaseOptimizedService {
  private cache: Map<string, FirebaseCacheEntry<any>>;
  private subscribers: Map<string, any>;
  private batchQueue: any[];
  private batchTimeout: NodeJS.Timeout | null;
  private queryCache: Map<string, FirebaseCacheEntry<any>>;
  private indexHints: Map<string, any>;
  private activeQueries: number;
  private queryQueue: Array<() => Promise<any>>;

  // Configuration constants - uses centralized CACHE config from constants.ts
  private readonly CACHE_TTL = CACHE.TTL_PRODUCTS; // Default TTL from centralized config
  private readonly BATCH_SIZE = 500;
  private readonly BATCH_DELAY = 100; // 100ms
  private readonly MAX_CONCURRENT_QUERIES = 3;
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 100; // ms
  private readonly MAX_RETRY_DELAY = 5000; // ms

  constructor() {
    this.cache = new Map();
    this.subscribers = new Map();
    this.batchQueue = [];
    this.batchTimeout = null;
    this.queryCache = new Map();
    this.indexHints = new Map();
    this.activeQueries = 0;
    this.queryQueue = [];
  }

  /**
   * Optimized: Get cached data with TTL validation
   */
  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Optimized: Set cached data with timestamp
   */
  private setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Optimized: Exponential backoff retry logic
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = this.MAX_RETRIES,
      initialDelayMs = this.INITIAL_RETRY_DELAY,
      maxDelayMs = this.MAX_RETRY_DELAY
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          // Exponential backoff: delay = initialDelay * 2^attempt, capped at maxDelay
          const delay = Math.min(
            initialDelayMs * Math.pow(2, attempt),
            maxDelayMs
          );

          logger.debug(LOG_CATEGORIES.DATA, `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
            error: lastError.message
          });

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Optimized: Execute query with concurrency control and retry logic
   */
  private async executeQuery<T>(
    queryFn: () => Promise<T>,
    cacheKey?: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const queryTask = async () => {
        this.activeQueries++;
        try {
          // Optimized: Retry with exponential backoff
          const result = await this.retryWithBackoff(() => queryFn());
          resolve(result);
        } catch (error) {
          // Fallback: Try to use cached data if available
          if (cacheKey) {
            const cached = this.getCachedData<T>(cacheKey);
            if (cached) {
              logger.warn(LOG_CATEGORIES.DATA, 'Query failed, using cached data', {
                cacheKey,
                error: error instanceof Error ? error.message : String(error)
              });
              resolve(cached);
              return;
            }
          }
          reject(error);
        } finally {
          this.activeQueries--;
          this.processQueryQueue();
        }
      };

      if (this.activeQueries < this.MAX_CONCURRENT_QUERIES) {
        queryTask();
      } else {
        this.queryQueue.push(queryTask);
      }
    });
  }

  /**
   * Optimized: Process queued queries when slots become available
   */
  private processQueryQueue(): void {
    if (this.queryQueue.length > 0 && this.activeQueries < this.MAX_CONCURRENT_QUERIES) {
      const nextQuery = this.queryQueue.shift();
      if (nextQuery) {
        nextQuery();
      }
    }
  }

  // Optimized collection fetching with enhanced caching and query optimization
  async getCollection(collectionName: string, options: {
    useCache?: boolean;
    orderByField?: string | null;
    orderDirection?: 'asc' | 'desc';
    limitCount?: number | null;
    whereConditions?: [string, any, any][];
    enableQueryOptimization?: boolean;
  } = {}) {
    const startTime = Date.now();
    const {
      useCache = true,
      orderByField = null,
      orderDirection = 'asc',
      limitCount = null,
      whereConditions = [],
      enableQueryOptimization = true
    } = options;

    const cacheKey = `${collectionName}_${JSON.stringify(options)}`;

    // Silently track Firebase operation (batched logging in logger)
    logger.logFirebaseOperation('getCollection', collectionName);

    // Check cache first
    if (useCache) {
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Check query cache for similar queries
    if (useCache && this.queryCache.has(cacheKey)) {
      const cachedQuery = this.queryCache.get(cacheKey);
      if (Date.now() - cachedQuery.timestamp < this.CACHE_TTL) {
        return cachedQuery.data;
      }
    }

    const queryFn = async () => {
      try {
        const queryStartTime = Date.now();
        let q: any = collection(db, collectionName);

        // Optimize query order for better performance
        if (enableQueryOptimization && whereConditions.length > 0) {
          // Sort where conditions by selectivity (most selective first)
          const optimizedConditions = this.optimizeWhereConditions(whereConditions, collectionName);
          optimizedConditions.forEach(([field, operator, value]: [string, any, any]) => {
            q = query(q, where(field, operator, value));
          });
        } else {
          whereConditions.forEach(([field, operator, value]: [string, any, any]) => {
            q = query(q, where(field, operator, value));
          });
        }

        // Apply ordering
        if (orderByField) {
          q = query(q, orderBy(orderByField, orderDirection));
        }

        // Apply limit (always use limit for performance)
        const effectiveLimit = limitCount || 1000; // Default limit
        q = query(q, limit(effectiveLimit));

        const snapshot = await getDocs(q);

        const data = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...(docSnap.data() as Record<string, any>)
        }));

        const queryTime = Date.now() - queryStartTime;

        // Cache the result
        if (useCache) {
          this.setCachedData(cacheKey, data);
          this.queryCache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
        }

        return data;
      } catch (error) {
        // Only log errors, not successful fetches
        logger.error(LOG_CATEGORIES.FIREBASE, `Error fetching ${collectionName}`, { collectionName }, error as Error);

        // Provide index optimization hints
        const err = error instanceof Error ? error : new Error(String(error));
        if ((error as any).code === 'failed-precondition' && err.message.includes('index')) {
          this.suggestIndexOptimization(collectionName, options, error as Error);
        }

        throw error;
      }
    };

    return this.executeQuery(queryFn, cacheKey);
  }

  // Collection group query for subcollections (e.g., all coverages across all products)
  async getCollectionGroup(collectionName: string, options: { useCache?: boolean } = {}) {
    const { useCache = true } = options;
    const cacheKey = `collectionGroup_${collectionName}_${JSON.stringify(options)}`;

    logger.logFirebaseOperation('getCollectionGroup', collectionName);

    // Check cache first
    if (useCache) {
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const queryFn = async () => {
      try {
        const groupQuery = collectionGroup(db, collectionName);
        const snapshot = await getDocs(groupQuery);

        const data = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
          // Include parent path info for context
          _parentPath: docSnap.ref.parent.parent?.path || null,
          _productId: docSnap.ref.parent.parent?.id || null
        }));

        if (useCache) {
          this.setCachedData(cacheKey, data);
        }

        return data;
      } catch (error) {
        logger.error(LOG_CATEGORIES.FIREBASE, `Error fetching collection group ${collectionName}`, { collectionName }, error as Error);
        throw error;
      }
    };

    return this.executeQuery(queryFn, cacheKey);
  }

  // Optimize where conditions based on field selectivity
  optimizeWhereConditions(conditions: [string, any, any][], collectionName: string) {
    const hints = this.indexHints.get(collectionName) || {};

    return [...conditions].sort((a, b) => {
      const [fieldA] = a;
      const [fieldB] = b;

      // Prioritize fields with known high selectivity
      const selectivityA = hints[fieldA]?.selectivity || 0.5;
      const selectivityB = hints[fieldB]?.selectivity || 0.5;

      return selectivityB - selectivityA; // Higher selectivity first
    });
  }



  // Suggest index optimizations
  suggestIndexOptimization(collectionName: string, options: Record<string, any>, error: Error) {
    const indexMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
    logger.warn(LOG_CATEGORIES.FIREBASE, 'Index optimization needed', {
      collectionName,
      options,
      error: error.message,
      indexUrl: indexMatch ? indexMatch[0] : null
    });
  }

  // Optimized document fetching
  async getDocument(collectionName: string, docId: string, useCache = true) {
    const cacheKey = `${collectionName}_${docId}`;

    // Silently track Firebase operation (batched logging in logger)
    logger.logFirebaseOperation('getDocument', collectionName, docId);

    if (useCache) {
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = { id: docSnap.id, ...docSnap.data() };

      if (useCache) {
        this.setCachedData(cacheKey, data);
      }

      return data;
    } catch (error) {
      logger.error(LOG_CATEGORIES.FIREBASE, `Error fetching document ${docId}`, {
        collectionName,
        docId
      }, error as Error);
      throw error;
    }
  }

  // Optimized real-time subscription with cleanup
  subscribeToCollection(collectionName: string, callback: (data: any, error: any) => void, options: {
    orderByField?: string | null;
    orderDirection?: 'asc' | 'desc';
    limitCount?: number | null;
    whereConditions?: [string, any, any][];
  } = {}) {
    const { 
      orderByField = null, 
      orderDirection = 'asc',
      limitCount = null,
      whereConditions = []
    } = options;

    const subscriptionKey = `${collectionName}_${JSON.stringify(options)}`;
    
    // Clean up existing subscription
    if (this.subscribers.has(subscriptionKey)) {
      this.subscribers.get(subscriptionKey)();
    }

    try {
      let q: any = collection(db, collectionName);
      
      // Apply conditions
      whereConditions.forEach(([field, operator, value]: [string, any, any]) => {
        q = query(q, where(field, operator, value));
      });
      
      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection));
      }
      
      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const unsubscribe = safeOnSnapshot(q, 
        (snapshot) => {
          const data = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          }));
          
          // Update cache
          const cacheKey = `${collectionName}_${JSON.stringify(options)}`;
          this.setCachedData(cacheKey, data);
          
          callback(data, null);
        },
        (error) => {
          logger.error(LOG_CATEGORIES.FIREBASE, `Subscription error for ${collectionName}`, { collectionName }, error as Error);
          callback(null, error);
        }
      );

      this.subscribers.set(subscriptionKey, unsubscribe);
      return unsubscribe;
    } catch (error) {
      logger.error(LOG_CATEGORIES.FIREBASE, `Error setting up subscription for ${collectionName}`, { collectionName }, error as Error);
      callback(null, error);
    }
  }

  // Batch write operations for better performance
  addToBatch(operation: { type: string; ref: any; data?: any }) {
    this.batchQueue.push(operation);
    
    // Auto-execute batch when it reaches size limit
    if (this.batchQueue.length >= this.BATCH_SIZE) {
      this.executeBatch();
    } else {
      // Schedule batch execution
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
      }
      
      this.batchTimeout = setTimeout(() => {
        this.executeBatch();
      }, this.BATCH_DELAY);
    }
  }

  async executeBatch() {
    if (this.batchQueue.length === 0) return;
    
    const batch = writeBatch(db);
    const operations = [...this.batchQueue];
    this.batchQueue = [];
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    try {
      operations.forEach(operation => {
        const { type, ref, data } = operation;
        
        switch (type) {
          case 'set':
            batch.set(ref, data);
            break;
          case 'update':
            batch.update(ref, data);
            break;
          case 'delete':
            batch.delete(ref);
            break;
          default:
            logger.warn(LOG_CATEGORIES.FIREBASE, 'Unknown batch operation type', { type });
        }
      });

      await batch.commit();

      // Clear related cache entries
      operations.forEach(operation => {
        const { ref } = operation;
        const collectionName = ref.parent.id;
        this.clearCacheByPattern(collectionName);
      });

    } catch (error) {
      logger.error(LOG_CATEGORIES.FIREBASE, 'Batch execution failed', {}, error as Error);
      throw error;
    }
  }

  // Clear cache by pattern
  clearCacheByPattern(pattern: string) {
    const keysToDelete = [];

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // Network status management
  async goOffline() {
    try {
      await disableNetwork(db);
    } catch (error) {
      logger.error(LOG_CATEGORIES.FIREBASE, 'Error enabling offline mode', {}, error as Error);
    }
  }

  async goOnline() {
    try {
      await enableNetwork(db);
    } catch (error) {
      logger.error(LOG_CATEGORIES.FIREBASE, 'Error enabling online mode', {}, error as Error);
    }
  }

  // Cleanup all subscriptions and cache
  cleanup() {
    // Unsubscribe from all active subscriptions
    this.subscribers.forEach(unsubscribe => unsubscribe());
    this.subscribers.clear();

    // Clear cache
    this.cache.clear();

    // Clear batch timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Execute any pending batch operations
    if (this.batchQueue.length > 0) {
      this.executeBatch();
    }
  }

  // Get cache statistics
  getCacheStats() {
    const totalEntries = this.cache.size;
    const totalSize = JSON.stringify([...this.cache.values()]).length;
    
    return {
      entries: totalEntries,
      estimatedSize: `${(totalSize / 1024).toFixed(2)} KB`,
      subscribers: this.subscribers.size,
      batchQueueSize: this.batchQueue.length
    };
  }
}

// Create singleton instance
const firebaseOptimized = new FirebaseOptimizedService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    firebaseOptimized.cleanup();
  });
}

export default firebaseOptimized;
