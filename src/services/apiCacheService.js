// src/services/apiCacheService.js
/**
 * Advanced API Response Caching Service
 * Intelligent caching with smart invalidation, background refresh, and performance optimization
 */

import advancedCacheManager from './advancedCacheManager';

class ApiCacheService {
  constructor() {
    this.requestQueue = new Map(); // Prevent duplicate requests
    this.backgroundRefreshQueue = new Set();
    this.cacheStrategies = new Map();
    this.invalidationRules = new Map();
    
    // Default cache strategies
    this.setupDefaultStrategies();
    
    // Start background processes
    this.startBackgroundRefresh();
  }

  // Setup default caching strategies for different API endpoints
  setupDefaultStrategies() {
    // Static data - long cache
    this.setCacheStrategy('products', {
      ttl: 30 * 60 * 1000, // 30 minutes
      staleWhileRevalidate: true,
      backgroundRefresh: true,
      compression: true
    });
    
    this.setCacheStrategy('coverages', {
      ttl: 20 * 60 * 1000, // 20 minutes
      staleWhileRevalidate: true,
      backgroundRefresh: true,
      compression: true
    });
    
    this.setCacheStrategy('forms', {
      ttl: 60 * 60 * 1000, // 1 hour
      staleWhileRevalidate: true,
      backgroundRefresh: true,
      compression: true
    });
    
    // Dynamic data - shorter cache
    this.setCacheStrategy('tasks', {
      ttl: 5 * 60 * 1000, // 5 minutes
      staleWhileRevalidate: true,
      backgroundRefresh: true,
      compression: false
    });
    
    this.setCacheStrategy('news', {
      ttl: 15 * 60 * 1000, // 15 minutes
      staleWhileRevalidate: true,
      backgroundRefresh: true,
      compression: true
    });
    
    // AI responses - medium cache
    this.setCacheStrategy('ai-responses', {
      ttl: 10 * 60 * 1000, // 10 minutes
      staleWhileRevalidate: false,
      backgroundRefresh: false,
      compression: true
    });
    
    // User-specific data - short cache
    this.setCacheStrategy('user-data', {
      ttl: 2 * 60 * 1000, // 2 minutes
      staleWhileRevalidate: true,
      backgroundRefresh: false,
      compression: false
    });
  }

  // Set cache strategy for a specific endpoint category
  setCacheStrategy(category, strategy) {
    this.cacheStrategies.set(category, {
      ttl: 5 * 60 * 1000, // Default 5 minutes
      staleWhileRevalidate: false,
      backgroundRefresh: false,
      compression: false,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours max
      ...strategy
    });
  }

  // Get cache strategy for a category
  getCacheStrategy(category) {
    return this.cacheStrategies.get(category) || this.cacheStrategies.get('default') || {
      ttl: 5 * 60 * 1000,
      staleWhileRevalidate: false,
      backgroundRefresh: false,
      compression: false
    };
  }

  // Main caching method with intelligent strategies
  async cachedRequest(category, identifier, requestFn, params = {}, options = {}) {
    const strategy = this.getCacheStrategy(category);
    const cacheKey = this.generateCacheKey(category, identifier, params);
    
    // Check for in-flight request to prevent duplicates
    if (this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey);
    }
    
    // Try to get from cache first
    const cached = await advancedCacheManager.get(category, identifier, params);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      
      // Return cached data if still fresh
      if (age < strategy.ttl) {
        console.log(`🎯 Cache hit: ${cacheKey} (age: ${Math.round(age / 1000)}s)`);
        
        // Schedule background refresh if enabled
        if (strategy.backgroundRefresh && age > strategy.ttl * 0.7) {
          this.scheduleBackgroundRefresh(category, identifier, requestFn, params);
        }
        
        return cached.data;
      }
      
      // Stale-while-revalidate: return stale data and refresh in background
      if (strategy.staleWhileRevalidate && age < strategy.maxAge) {
        console.log(`🔄 Stale-while-revalidate: ${cacheKey}`);
        
        // Return stale data immediately
        setTimeout(() => {
          this.refreshData(category, identifier, requestFn, params);
        }, 0);
        
        return cached.data;
      }
    }
    
    // No cache or expired - fetch fresh data
    return this.fetchAndCache(category, identifier, requestFn, params, options);
  }

  // Fetch data and cache it
  async fetchAndCache(category, identifier, requestFn, params = {}, options = {}) {
    const cacheKey = this.generateCacheKey(category, identifier, params);
    const strategy = this.getCacheStrategy(category);
    
    try {
      // Create request promise and add to queue
      const requestPromise = this.executeRequest(requestFn, params);
      this.requestQueue.set(cacheKey, requestPromise);
      
      const data = await requestPromise;
      
      // Cache the result
      const cacheData = {
        data,
        timestamp: Date.now(),
        category,
        identifier,
        params
      };
      
      await advancedCacheManager.set(
        category,
        identifier,
        cacheData,
        params,
        {
          customTTL: strategy.ttl,
          skipPersistent: options.skipPersistent || false
        }
      );
      
      console.log(`💾 Cached: ${cacheKey}`);
      return data;
      
    } catch (error) {
      console.error(`❌ Request failed: ${cacheKey}`, error);
      
      // Try to return stale data on error
      const staleData = await advancedCacheManager.get(category, identifier, params);
      if (staleData && Date.now() - staleData.timestamp < strategy.maxAge) {
        console.log(`🚨 Returning stale data due to error: ${cacheKey}`);
        return staleData.data;
      }
      
      throw error;
    } finally {
      this.requestQueue.delete(cacheKey);
    }
  }

  // Execute request with timeout and retry logic
  async executeRequest(requestFn, params, retries = 2) {
    const timeout = 30000; // 30 seconds
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const result = await Promise.race([
          requestFn({ ...params, signal: controller.signal }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ]);
        
        clearTimeout(timeoutId);
        return result;
        
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Schedule background refresh
  scheduleBackgroundRefresh(category, identifier, requestFn, params) {
    const refreshKey = this.generateCacheKey(category, identifier, params);
    
    if (!this.backgroundRefreshQueue.has(refreshKey)) {
      this.backgroundRefreshQueue.add({
        key: refreshKey,
        category,
        identifier,
        requestFn,
        params,
        scheduledAt: Date.now()
      });
    }
  }

  // Refresh data in background
  async refreshData(category, identifier, requestFn, params) {
    try {
      console.log(`🔄 Background refresh: ${category}:${identifier}`);
      await this.fetchAndCache(category, identifier, requestFn, params);
    } catch (error) {
      console.warn('Background refresh failed:', error);
    }
  }

  // Start background refresh processor
  startBackgroundRefresh() {
    setInterval(async () => {
      if (this.backgroundRefreshQueue.size === 0) return;
      
      const refreshItems = Array.from(this.backgroundRefreshQueue).slice(0, 2); // Process 2 at a time
      
      for (const item of refreshItems) {
        this.backgroundRefreshQueue.delete(item);
        
        try {
          await this.refreshData(
            item.category,
            item.identifier,
            item.requestFn,
            item.params
          );
        } catch (error) {
          console.warn('Background refresh failed:', error);
        }
      }
    }, 5000); // Every 5 seconds
  }

  // Generate cache key
  generateCacheKey(category, identifier, params) {
    return advancedCacheManager.generateCacheKey(category, identifier, params);
  }

  // Invalidate cache with smart rules
  async invalidate(category, identifier = null, params = {}) {
    // Direct invalidation
    if (identifier) {
      await advancedCacheManager.invalidate(category, identifier, params);
    } else {
      await advancedCacheManager.invalidate(category);
    }
    
    // Apply invalidation rules
    this.applyInvalidationRules(category, identifier);
  }

  // Set up invalidation rules
  setInvalidationRule(triggerCategory, affectedCategories) {
    if (!this.invalidationRules.has(triggerCategory)) {
      this.invalidationRules.set(triggerCategory, new Set());
    }
    
    const rules = this.invalidationRules.get(triggerCategory);
    if (Array.isArray(affectedCategories)) {
      affectedCategories.forEach(cat => rules.add(cat));
    } else {
      rules.add(affectedCategories);
    }
  }

  // Apply invalidation rules
  applyInvalidationRules(triggerCategory, identifier) {
    const affectedCategories = this.invalidationRules.get(triggerCategory);
    
    if (affectedCategories) {
      for (const category of affectedCategories) {
        console.log(`🔄 Invalidating related cache: ${category} (triggered by ${triggerCategory})`);
        advancedCacheManager.invalidate(category);
      }
    }
  }

  // Preload data
  async preload(category, identifier, requestFn, params = {}) {
    const cached = await advancedCacheManager.get(category, identifier, params);
    
    if (!cached) {
      console.log(`🚀 Preloading: ${category}:${identifier}`);
      await this.fetchAndCache(category, identifier, requestFn, params, { skipPersistent: true });
    }
  }

  // Batch preload multiple items
  async batchPreload(items) {
    const preloadPromises = items.map(item => 
      this.preload(item.category, item.identifier, item.requestFn, item.params)
        .catch(error => console.warn('Preload failed:', error))
    );
    
    await Promise.allSettled(preloadPromises);
  }

  // Get cache statistics
  getStats() {
    return {
      ...advancedCacheManager.getStats(),
      requestQueueSize: this.requestQueue.size,
      backgroundRefreshQueue: this.backgroundRefreshQueue.size,
      cacheStrategies: this.cacheStrategies.size,
      invalidationRules: this.invalidationRules.size
    };
  }

  // Clear all caches
  clear() {
    this.requestQueue.clear();
    this.backgroundRefreshQueue.clear();
    advancedCacheManager.clear();
  }

  // Optimize cache based on usage patterns
  optimizeCache() {
    const stats = this.getStats();
    
    // Adjust TTL based on hit rates
    for (const [category, strategy] of this.cacheStrategies.entries()) {
      const hitRate = stats.hits.memory + stats.hits.session + stats.hits.persistent;
      const totalRequests = hitRate + stats.misses;
      
      if (totalRequests > 100) {
        const hitRatio = hitRate / totalRequests;
        
        if (hitRatio > 0.8) {
          // High hit rate - increase TTL
          strategy.ttl = Math.min(strategy.ttl * 1.2, 60 * 60 * 1000);
        } else if (hitRatio < 0.3) {
          // Low hit rate - decrease TTL
          strategy.ttl = Math.max(strategy.ttl * 0.8, 60 * 1000);
        }
      }
    }
    
    console.log('🎯 Cache optimization completed');
  }
}

// Create singleton instance
const apiCacheService = new ApiCacheService();

// Setup default invalidation rules
apiCacheService.setInvalidationRule('products', ['coverages', 'forms', 'pricing']);
apiCacheService.setInvalidationRule('coverages', ['forms', 'pricing']);
apiCacheService.setInvalidationRule('forms', ['coverages']);
apiCacheService.setInvalidationRule('tasks', ['user-data']);

// Set up cache manager background refresh handler
advancedCacheManager.setBackgroundRefreshHandler(async (item) => {
  // This would need to be implemented based on the specific data source
  console.log('Background refresh requested for:', item);
  return null;
});

export default apiCacheService;
