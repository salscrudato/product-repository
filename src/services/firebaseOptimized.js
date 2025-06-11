// src/services/firebaseOptimized.js
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  writeBatch,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Optimized Firebase service with caching, batching, and performance improvements
 */

class FirebaseOptimizedService {
  constructor() {
    this.cache = new Map();
    this.subscribers = new Map();
    this.batchQueue = [];
    this.batchTimeout = null;
    this.queryCache = new Map(); // Enhanced query result caching
    this.indexHints = new Map(); // Store index optimization hints
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    this.BATCH_SIZE = 500;
    this.BATCH_DELAY = 100; // 100ms
    this.MAX_CONCURRENT_QUERIES = 3; // Limit concurrent queries
    this.activeQueries = 0;
    this.queryQueue = [];
  }

  // Enhanced caching with TTL
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Enhanced query queue management
  async executeQuery(queryFn, cacheKey) {
    return new Promise((resolve, reject) => {
      const queryTask = async () => {
        this.activeQueries++;
        try {
          const result = await queryFn();
          resolve(result);
        } catch (error) {
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

  processQueryQueue() {
    if (this.queryQueue.length > 0 && this.activeQueries < this.MAX_CONCURRENT_QUERIES) {
      const nextQuery = this.queryQueue.shift();
      nextQuery();
    }
  }

  // Optimized collection fetching with enhanced caching and query optimization
  async getCollection(collectionName, options = {}) {
    const {
      useCache = true,
      orderByField = null,
      orderDirection = 'asc',
      limitCount = null,
      whereConditions = [],
      enableQueryOptimization = true
    } = options;

    const cacheKey = `${collectionName}_${JSON.stringify(options)}`;

    // Check cache first
    if (useCache) {
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        console.log(`📋 Cache hit for ${collectionName}`);
        return cached;
      }
    }

    // Check query cache for similar queries
    if (useCache && this.queryCache.has(cacheKey)) {
      const cachedQuery = this.queryCache.get(cacheKey);
      if (Date.now() - cachedQuery.timestamp < this.CACHE_TTL) {
        console.log(`🎯 Query cache hit for ${collectionName}`);
        return cachedQuery.data;
      }
    }

    const queryFn = async () => {
      try {
        let q = collection(db, collectionName);

        // Optimize query order for better performance
        if (enableQueryOptimization && whereConditions.length > 0) {
          // Sort where conditions by selectivity (most selective first)
          const optimizedConditions = this.optimizeWhereConditions(whereConditions, collectionName);
          optimizedConditions.forEach(([field, operator, value]) => {
            q = query(q, where(field, operator, value));
          });
        } else {
          whereConditions.forEach(([field, operator, value]) => {
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

        const startTime = performance.now();
        const snapshot = await getDocs(q);
        const queryTime = performance.now() - startTime;

        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Store performance metrics for query optimization
        this.storeQueryMetrics(collectionName, options, queryTime, data.length);

        // Cache the result
        if (useCache) {
          this.setCachedData(cacheKey, data);
          this.queryCache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            queryTime,
            resultCount: data.length
          });
        }

        console.log(`🔥 Fetched ${data.length} documents from ${collectionName} in ${queryTime.toFixed(2)}ms`);
        return data;
      } catch (error) {
        console.error(`Error fetching ${collectionName}:`, error);

        // Provide index optimization hints
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
          this.suggestIndexOptimization(collectionName, options, error);
        }

        throw error;
      }
    };

    return this.executeQuery(queryFn, cacheKey);
  }

  // Optimize where conditions based on field selectivity
  optimizeWhereConditions(conditions, collectionName) {
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

  // Store query performance metrics
  storeQueryMetrics(collectionName, options, queryTime, resultCount) {
    const metrics = {
      timestamp: Date.now(),
      queryTime,
      resultCount,
      options
    };

    // Store in performance monitoring (could be sent to analytics)
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Query metrics for ${collectionName}:`, metrics);
    }
  }

  // Suggest index optimizations
  suggestIndexOptimization(collectionName, options, error) {
    console.group('🔍 Index Optimization Suggestion');
    console.log(`Collection: ${collectionName}`);
    console.log('Query options:', options);
    console.log('Error:', error.message);

    // Extract suggested index from error message
    const indexMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
    if (indexMatch) {
      console.log('🔗 Create index:', indexMatch[0]);
    }

    console.groupEnd();
  }

  // Optimized document fetching
  async getDocument(collectionName, docId, useCache = true) {
    const cacheKey = `${collectionName}_${docId}`;
    
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
      console.error(`Error fetching document ${docId}:`, error);
      throw error;
    }
  }

  // Optimized real-time subscription with cleanup
  subscribeToCollection(collectionName, callback, options = {}) {
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
      let q = collection(db, collectionName);
      
      // Apply conditions
      whereConditions.forEach(([field, operator, value]) => {
        q = query(q, where(field, operator, value));
      });
      
      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection));
      }
      
      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Update cache
          const cacheKey = `${collectionName}_${JSON.stringify(options)}`;
          this.setCachedData(cacheKey, data);
          
          callback(data, null);
        },
        (error) => {
          console.error(`Subscription error for ${collectionName}:`, error);
          callback(null, error);
        }
      );

      this.subscribers.set(subscriptionKey, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error(`Error setting up subscription for ${collectionName}:`, error);
      callback(null, error);
    }
  }

  // Batch write operations for better performance
  addToBatch(operation) {
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
            console.warn('Unknown batch operation type:', type);
        }
      });

      await batch.commit();
      console.log(`✅ Batch executed: ${operations.length} operations`);
      
      // Clear related cache entries
      operations.forEach(operation => {
        const { ref } = operation;
        const collectionName = ref.parent.id;
        this.clearCacheByPattern(collectionName);
      });
      
    } catch (error) {
      console.error('Batch execution failed:', error);
      throw error;
    }
  }

  // Clear cache by pattern
  clearCacheByPattern(pattern) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🧹 Cleared ${keysToDelete.length} cache entries for pattern: ${pattern}`);
  }

  // Network status management
  async goOffline() {
    try {
      await disableNetwork(db);
      console.log('📴 Firebase offline mode enabled');
    } catch (error) {
      console.error('Error enabling offline mode:', error);
    }
  }

  async goOnline() {
    try {
      await enableNetwork(db);
      console.log('📶 Firebase online mode enabled');
    } catch (error) {
      console.error('Error enabling online mode:', error);
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
    
    console.log('🧹 Firebase service cleaned up');
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
