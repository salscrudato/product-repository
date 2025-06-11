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
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    this.BATCH_SIZE = 500;
    this.BATCH_DELAY = 100; // 100ms
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

  // Optimized collection fetching with caching
  async getCollection(collectionName, options = {}) {
    const { 
      useCache = true, 
      orderByField = null, 
      orderDirection = 'asc',
      limitCount = null,
      whereConditions = []
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

    try {
      let q = collection(db, collectionName);
      
      // Apply where conditions
      whereConditions.forEach(([field, operator, value]) => {
        q = query(q, where(field, operator, value));
      });
      
      // Apply ordering
      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection));
      }
      
      // Apply limit
      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Cache the result
      if (useCache) {
        this.setCachedData(cacheKey, data);
      }

      console.log(`🔥 Fetched ${data.length} documents from ${collectionName}`);
      return data;
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      throw error;
    }
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
