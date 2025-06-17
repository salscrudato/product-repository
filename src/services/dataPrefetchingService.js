// src/services/dataPrefetchingService.js
/**
 * Intelligent Data Prefetching Service
 * Predicts and preloads data based on user behavior patterns
 */

import advancedCacheManager from './advancedCacheManager';
import firebaseOptimized from './firebaseOptimized';

class DataPrefetchingService {
  constructor() {
    this.userBehaviorPatterns = new Map();
    this.prefetchQueue = new Set();
    this.prefetchInProgress = new Set();
    this.routeTransitions = new Map();
    this.componentUsageStats = new Map();
    
    // Configuration
    this.config = {
      maxConcurrentPrefetch: 3,
      prefetchDelay: 1000, // 1 second delay before prefetching
      behaviorTrackingWindow: 30 * 60 * 1000, // 30 minutes
      minConfidenceScore: 0.6, // Minimum confidence to trigger prefetch
      maxPrefetchAge: 10 * 60 * 1000, // 10 minutes
    };
    
    // Initialize behavior tracking
    this.initializeBehaviorTracking();
    this.startPrefetchProcessor();
  }

  // Initialize user behavior tracking
  initializeBehaviorTracking() {
    // Track route changes
    this.trackRouteChanges();
    
    // Track component interactions
    this.trackComponentInteractions();
    
    // Track data access patterns
    this.trackDataAccessPatterns();
    
    // Load historical patterns from storage
    this.loadHistoricalPatterns();
  }

  // Track route navigation patterns
  trackRouteChanges() {
    let previousRoute = window.location.pathname;
    let routeStartTime = Date.now();
    
    const trackRoute = () => {
      const currentRoute = window.location.pathname;
      const timeSpent = Date.now() - routeStartTime;
      
      if (currentRoute !== previousRoute) {
        this.recordRouteTransition(previousRoute, currentRoute, timeSpent);
        previousRoute = currentRoute;
        routeStartTime = Date.now();
        
        // Trigger predictive prefetching
        this.predictAndPrefetch(currentRoute);
      }
    };
    
    // Use both popstate and a periodic check for SPA navigation
    window.addEventListener('popstate', trackRoute);
    setInterval(trackRoute, 1000);
  }

  // Record route transition patterns
  recordRouteTransition(fromRoute, toRoute, timeSpent) {
    const transitionKey = `${fromRoute} -> ${toRoute}`;
    
    if (!this.routeTransitions.has(transitionKey)) {
      this.routeTransitions.set(transitionKey, {
        count: 0,
        totalTime: 0,
        lastAccess: Date.now(),
        confidence: 0
      });
    }
    
    const transition = this.routeTransitions.get(transitionKey);
    transition.count++;
    transition.totalTime += timeSpent;
    transition.lastAccess = Date.now();
    transition.confidence = Math.min(transition.count / 10, 1); // Max confidence at 10 transitions
    
    // Store in persistent storage
    this.persistBehaviorPatterns();
  }

  // Track component interaction patterns
  trackComponentInteractions() {
    // Track clicks on specific elements that might indicate future data needs
    document.addEventListener('click', (event) => {
      const target = event.target.closest('[data-prefetch-trigger]');
      if (target) {
        const prefetchData = target.getAttribute('data-prefetch-trigger');
        this.recordComponentInteraction(prefetchData);
      }
    });
  }

  recordComponentInteraction(interactionData) {
    try {
      const data = JSON.parse(interactionData);
      const key = `interaction:${data.type}:${data.identifier}`;
      
      if (!this.componentUsageStats.has(key)) {
        this.componentUsageStats.set(key, {
          count: 0,
          lastAccess: Date.now(),
          prefetchTargets: data.prefetchTargets || []
        });
      }
      
      const stats = this.componentUsageStats.get(key);
      stats.count++;
      stats.lastAccess = Date.now();
      
      // Schedule prefetching for related data
      if (stats.prefetchTargets.length > 0) {
        setTimeout(() => {
          this.prefetchRelatedData(stats.prefetchTargets);
        }, this.config.prefetchDelay);
      }
    } catch (error) {
      console.warn('Failed to parse interaction data:', error);
    }
  }

  // Track data access patterns
  trackDataAccessPatterns() {
    // Override the cache manager to track access patterns
    const originalGet = advancedCacheManager.get.bind(advancedCacheManager);
    
    advancedCacheManager.get = async (category, identifier, params = {}) => {
      this.recordDataAccess(category, identifier, params);
      return originalGet(category, identifier, params);
    };
  }

  recordDataAccess(category, identifier, params) {
    const accessKey = `${category}:${identifier}`;
    const now = Date.now();
    
    if (!this.userBehaviorPatterns.has(accessKey)) {
      this.userBehaviorPatterns.set(accessKey, {
        accessCount: 0,
        lastAccess: now,
        accessTimes: [],
        relatedAccesses: new Map(),
        params: new Map()
      });
    }
    
    const pattern = this.userBehaviorPatterns.get(accessKey);
    pattern.accessCount++;
    pattern.lastAccess = now;
    pattern.accessTimes.push(now);
    
    // Keep only recent access times
    pattern.accessTimes = pattern.accessTimes.filter(
      time => now - time < this.config.behaviorTrackingWindow
    );
    
    // Track parameter patterns
    const paramKey = JSON.stringify(params);
    pattern.params.set(paramKey, (pattern.params.get(paramKey) || 0) + 1);
    
    // Track related accesses (accessed within 5 minutes)
    this.trackRelatedAccesses(accessKey, now);
  }

  trackRelatedAccesses(currentAccessKey, accessTime) {
    const relatedWindow = 5 * 60 * 1000; // 5 minutes
    
    for (const [key, pattern] of this.userBehaviorPatterns.entries()) {
      if (key !== currentAccessKey && 
          Math.abs(pattern.lastAccess - accessTime) < relatedWindow) {
        
        const currentPattern = this.userBehaviorPatterns.get(currentAccessKey);
        if (!currentPattern.relatedAccesses.has(key)) {
          currentPattern.relatedAccesses.set(key, 0);
        }
        currentPattern.relatedAccesses.set(key, 
          currentPattern.relatedAccesses.get(key) + 1
        );
      }
    }
  }

  // Predict and prefetch data based on current context
  async predictAndPrefetch(currentRoute) {
    const predictions = this.generatePredictions(currentRoute);
    
    for (const prediction of predictions) {
      if (prediction.confidence >= this.config.minConfidenceScore) {
        this.schedulePrefetch(prediction);
      }
    }
  }

  generatePredictions(currentRoute) {
    const predictions = [];
    
    // Route-based predictions
    for (const [transitionKey, transition] of this.routeTransitions.entries()) {
      if (transitionKey.startsWith(currentRoute + ' ->') && 
          transition.confidence >= this.config.minConfidenceScore) {
        
        const targetRoute = transitionKey.split(' -> ')[1];
        predictions.push({
          type: 'route',
          target: targetRoute,
          confidence: transition.confidence,
          data: this.getRouteDataRequirements(targetRoute)
        });
      }
    }
    
    // Data access pattern predictions
    for (const [accessKey, pattern] of this.userBehaviorPatterns.entries()) {
      if (pattern.accessCount > 2 && 
          Date.now() - pattern.lastAccess < this.config.behaviorTrackingWindow) {
        
        // Predict related data access
        for (const [relatedKey, relatedCount] of pattern.relatedAccesses.entries()) {
          if (relatedCount > 1) {
            const confidence = Math.min(relatedCount / pattern.accessCount, 1);
            if (confidence >= this.config.minConfidenceScore) {
              predictions.push({
                type: 'related_data',
                target: relatedKey,
                confidence,
                data: this.parseDataKey(relatedKey)
              });
            }
          }
        }
      }
    }
    
    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  // Get data requirements for a specific route
  getRouteDataRequirements(route) {
    const routeDataMap = {
      '/products': [
        { category: 'products', identifier: 'all' }
      ],
      '/coverage': [
        { category: 'coverages', identifier: 'all' },
        { category: 'forms', identifier: 'all' }
      ],
      '/pricing': [
        { category: 'pricing', identifier: 'all' },
        { category: 'steps', identifier: 'all' }
      ],
      '/forms': [
        { category: 'forms', identifier: 'all' },
        { category: 'formCoverages', identifier: 'all' }
      ],
      '/rules': [
        { category: 'rules', identifier: 'all' }
      ],
      '/tasks': [
        { category: 'tasks', identifier: 'all' }
      ],
      '/news': [
        { category: 'news', identifier: 'all' }
      ]
    };
    
    // Handle dynamic routes
    for (const [pattern, data] of Object.entries(routeDataMap)) {
      if (route.startsWith(pattern)) {
        return data;
      }
    }
    
    return [];
  }

  parseDataKey(dataKey) {
    const [category, identifier] = dataKey.split(':');
    return { category, identifier };
  }

  // Schedule data prefetching
  schedulePrefetch(prediction) {
    const prefetchKey = `${prediction.type}:${prediction.target}`;
    
    if (this.prefetchInProgress.has(prefetchKey) || 
        this.prefetchQueue.has(prefetchKey)) {
      return;
    }
    
    this.prefetchQueue.add({
      key: prefetchKey,
      prediction,
      scheduledAt: Date.now()
    });
  }

  // Process prefetch queue
  startPrefetchProcessor() {
    setInterval(async () => {
      await this.processPrefetchQueue();
    }, 2000); // Process every 2 seconds
  }

  async processPrefetchQueue() {
    if (this.prefetchQueue.size === 0 || 
        this.prefetchInProgress.size >= this.config.maxConcurrentPrefetch) {
      return;
    }
    
    const prefetchItems = Array.from(this.prefetchQueue)
      .sort((a, b) => b.prediction.confidence - a.prediction.confidence)
      .slice(0, this.config.maxConcurrentPrefetch - this.prefetchInProgress.size);
    
    for (const item of prefetchItems) {
      this.prefetchQueue.delete(item);
      this.prefetchInProgress.add(item.key);
      
      try {
        await this.executePrefetch(item);
      } catch (error) {
        console.warn('Prefetch failed:', error);
      } finally {
        this.prefetchInProgress.delete(item.key);
      }
    }
  }

  async executePrefetch(prefetchItem) {
    const { prediction } = prefetchItem;
    
    if (prediction.type === 'route') {
      await this.prefetchRouteData(prediction.data);
    } else if (prediction.type === 'related_data') {
      await this.prefetchRelatedData([prediction.data]);
    }
  }

  async prefetchRouteData(dataRequirements) {
    for (const requirement of dataRequirements) {
      try {
        // Check if data is already cached
        const cached = await advancedCacheManager.get(
          requirement.category, 
          requirement.identifier, 
          requirement.params || {}
        );
        
        if (!cached) {
          // Fetch data and cache it
          const data = await this.fetchData(requirement);
          if (data) {
            await advancedCacheManager.set(
              requirement.category,
              requirement.identifier,
              data,
              requirement.params || {},
              { customTTL: this.config.maxPrefetchAge }
            );
            
            console.log(`🚀 Prefetched ${requirement.category}:${requirement.identifier}`);
          }
        }
      } catch (error) {
        console.warn('Failed to prefetch data:', error);
      }
    }
  }

  async prefetchRelatedData(dataTargets) {
    for (const target of dataTargets) {
      try {
        const cached = await advancedCacheManager.get(
          target.category, 
          target.identifier
        );
        
        if (!cached) {
          const data = await this.fetchData(target);
          if (data) {
            await advancedCacheManager.set(
              target.category,
              target.identifier,
              data,
              {},
              { customTTL: this.config.maxPrefetchAge }
            );
            
            console.log(`🎯 Prefetched related data ${target.category}:${target.identifier}`);
          }
        }
      } catch (error) {
        console.warn('Failed to prefetch related data:', error);
      }
    }
  }

  // Fetch data using the appropriate service
  async fetchData(requirement) {
    const { category, identifier, params = {} } = requirement;
    
    try {
      switch (category) {
        case 'products':
          return await firebaseOptimized.getCollection('products', params);
        
        case 'coverages':
          if (identifier === 'all') {
            return await firebaseOptimized.getCollection('coverages', params);
          } else {
            return await firebaseOptimized.getDocument('coverages', identifier);
          }
        
        case 'forms':
          return await firebaseOptimized.getCollection('forms', params);
        
        case 'rules':
          return await firebaseOptimized.getCollection('rules', params);
        
        case 'tasks':
          return await firebaseOptimized.getCollection('tasks', params);
        
        case 'pricing':
        case 'steps':
          return await firebaseOptimized.getCollection('steps', params);
        
        default:
          console.warn(`Unknown data category: ${category}`);
          return null;
      }
    } catch (error) {
      console.error(`Failed to fetch ${category}:${identifier}:`, error);
      return null;
    }
  }

  // Persist behavior patterns to storage
  persistBehaviorPatterns() {
    try {
      const patterns = {
        routeTransitions: Array.from(this.routeTransitions.entries()),
        userBehaviorPatterns: Array.from(this.userBehaviorPatterns.entries()),
        componentUsageStats: Array.from(this.componentUsageStats.entries()),
        timestamp: Date.now()
      };
      
      localStorage.setItem('phapp_behavior_patterns', JSON.stringify(patterns));
    } catch (error) {
      console.warn('Failed to persist behavior patterns:', error);
    }
  }

  // Load historical patterns from storage
  loadHistoricalPatterns() {
    try {
      const stored = localStorage.getItem('phapp_behavior_patterns');
      if (stored) {
        const patterns = JSON.parse(stored);
        
        // Only load recent patterns (within 7 days)
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        if (patterns.timestamp > weekAgo) {
          this.routeTransitions = new Map(patterns.routeTransitions || []);
          this.userBehaviorPatterns = new Map(patterns.userBehaviorPatterns || []);
          this.componentUsageStats = new Map(patterns.componentUsageStats || []);
          
          console.log('📊 Loaded historical behavior patterns');
        }
      }
    } catch (error) {
      console.warn('Failed to load historical patterns:', error);
    }
  }

  // Get prefetching statistics
  getStats() {
    return {
      routeTransitions: this.routeTransitions.size,
      behaviorPatterns: this.userBehaviorPatterns.size,
      componentStats: this.componentUsageStats.size,
      prefetchQueueSize: this.prefetchQueue.size,
      prefetchInProgress: this.prefetchInProgress.size,
      totalPredictions: Array.from(this.userBehaviorPatterns.values())
        .reduce((sum, pattern) => sum + pattern.accessCount, 0)
    };
  }

  // Clear all patterns and reset
  reset() {
    this.userBehaviorPatterns.clear();
    this.routeTransitions.clear();
    this.componentUsageStats.clear();
    this.prefetchQueue.clear();
    this.prefetchInProgress.clear();
    
    localStorage.removeItem('phapp_behavior_patterns');
    console.log('🔄 Prefetching service reset');
  }
}

// Create singleton instance
const dataPrefetchingService = new DataPrefetchingService();

export default dataPrefetchingService;
