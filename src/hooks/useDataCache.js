import { useRef, useCallback, useMemo } from 'react';

/**
 * Simple in-memory cache hook for component-level data caching
 * Helps reduce Firebase reads and improve performance
 */
export function useDataCache(options = {}) {
  const {
    maxSize = 100,
    ttl = 5 * 60 * 1000, // 5 minutes default TTL
    enableLogging = process.env.NODE_ENV === 'development'
  } = options;

  const cache = useRef(new Map());
  const accessTimes = useRef(new Map());

  // Cache statistics for monitoring
  const stats = useRef({
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0
  });

  // Cleanup expired entries
  const cleanup = useCallback(() => {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, timestamp] of accessTimes.current) {
      if (now - timestamp > ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      cache.current.delete(key);
      accessTimes.current.delete(key);
      stats.current.evictions++;
    });

    if (enableLogging && keysToDelete.length > 0) {
      console.log(`Cache cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }, [ttl, enableLogging]);

  // Evict least recently used items if cache is full
  const evictLRU = useCallback(() => {
    if (cache.current.size < maxSize) return;

    // Find the oldest accessed item
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, timestamp] of accessTimes.current) {
      if (timestamp < oldestTime) {
        oldestTime = timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.current.delete(oldestKey);
      accessTimes.current.delete(oldestKey);
      stats.current.evictions++;
      
      if (enableLogging) {
        console.log(`Cache LRU eviction: removed key "${oldestKey}"`);
      }
    }
  }, [maxSize, enableLogging]);

  // Get data from cache
  const get = useCallback((key) => {
    cleanup(); // Clean expired entries

    if (cache.current.has(key)) {
      // Update access time
      accessTimes.current.set(key, Date.now());
      stats.current.hits++;
      
      const value = cache.current.get(key);
      if (enableLogging) {
        console.log(`Cache hit for key: "${key}"`);
      }
      return value;
    }

    stats.current.misses++;
    if (enableLogging) {
      console.log(`Cache miss for key: "${key}"`);
    }
    return null;
  }, [cleanup, enableLogging]);

  // Set data in cache
  const set = useCallback((key, value) => {
    cleanup(); // Clean expired entries
    evictLRU(); // Ensure we have space

    cache.current.set(key, value);
    accessTimes.current.set(key, Date.now());
    stats.current.sets++;

    if (enableLogging) {
      console.log(`Cache set for key: "${key}"`);
    }
  }, [cleanup, evictLRU, enableLogging]);

  // Check if key exists in cache
  const has = useCallback((key) => {
    cleanup();
    return cache.current.has(key);
  }, [cleanup]);

  // Remove specific key from cache
  const remove = useCallback((key) => {
    const deleted = cache.current.delete(key);
    accessTimes.current.delete(key);
    
    if (deleted && enableLogging) {
      console.log(`Cache remove for key: "${key}"`);
    }
    
    return deleted;
  }, [enableLogging]);

  // Clear entire cache
  const clear = useCallback(() => {
    const size = cache.current.size;
    cache.current.clear();
    accessTimes.current.clear();
    
    // Reset stats
    stats.current = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };

    if (enableLogging) {
      console.log(`Cache cleared: removed ${size} entries`);
    }
  }, [enableLogging]);

  // Get cache statistics
  const getStats = useCallback(() => {
    const currentStats = { ...stats.current };
    const hitRate = currentStats.hits + currentStats.misses > 0 
      ? (currentStats.hits / (currentStats.hits + currentStats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...currentStats,
      hitRate: `${hitRate}%`,
      size: cache.current.size,
      maxSize
    };
  }, [maxSize]);

  // Memoized cache interface
  const cacheInterface = useMemo(() => ({
    get,
    set,
    has,
    remove,
    clear,
    getStats
  }), [get, set, has, remove, clear, getStats]);

  return cacheInterface;
}

/**
 * Hook for caching Firebase data with automatic key generation
 */
export function useFirebaseCache(options = {}) {
  const cache = useDataCache(options);

  // Generate cache key for Firebase queries
  const generateKey = useCallback((collection, docId = null, filters = {}) => {
    const filterString = Object.keys(filters).length > 0 
      ? JSON.stringify(filters) 
      : '';
    return `${collection}${docId ? `/${docId}` : ''}${filterString}`;
  }, []);

  // Cache Firebase document
  const cacheDoc = useCallback((collection, docId, data) => {
    const key = generateKey(collection, docId);
    cache.set(key, data);
  }, [cache, generateKey]);

  // Get cached Firebase document
  const getCachedDoc = useCallback((collection, docId) => {
    const key = generateKey(collection, docId);
    return cache.get(key);
  }, [cache, generateKey]);

  // Cache Firebase collection
  const cacheCollection = useCallback((collection, data, filters = {}) => {
    const key = generateKey(collection, null, filters);
    cache.set(key, data);
  }, [cache, generateKey]);

  // Get cached Firebase collection
  const getCachedCollection = useCallback((collection, filters = {}) => {
    const key = generateKey(collection, null, filters);
    return cache.get(key);
  }, [cache, generateKey]);

  // Invalidate cache for a collection (useful after mutations)
  const invalidateCollection = useCallback((collection) => {
    const keysToRemove = [];
    
    // Find all keys that start with the collection name
    for (const key of cache.getStats().size > 0 ? Array.from(cache.cache?.current?.keys() || []) : []) {
      if (key.startsWith(collection)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => cache.remove(key));
  }, [cache]);

  return {
    ...cache,
    generateKey,
    cacheDoc,
    getCachedDoc,
    cacheCollection,
    getCachedCollection,
    invalidateCollection
  };
}

/**
 * Hook for caching expensive computations
 */
export function useComputationCache(options = {}) {
  const cache = useDataCache({
    maxSize: 50, // Smaller cache for computations
    ttl: 10 * 60 * 1000, // 10 minutes
    ...options
  });

  // Cache computation result
  const cacheComputation = useCallback((key, computeFn, dependencies = []) => {
    // Create cache key with dependencies
    const depKey = `${key}_${JSON.stringify(dependencies)}`;
    
    // Check if result is cached
    const cached = cache.get(depKey);
    if (cached !== null) {
      return cached;
    }

    // Compute and cache result
    const result = computeFn();
    cache.set(depKey, result);
    return result;
  }, [cache]);

  return {
    ...cache,
    cacheComputation
  };
}

export default useDataCache;
