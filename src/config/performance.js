/**
 * Performance Configuration
 * Centralized configuration for performance monitoring and optimization
 */

export const PERFORMANCE_CONFIG = {
  // Web Vitals Thresholds
  webVitals: {
    // Largest Contentful Paint (LCP) - measures loading performance
    lcp: {
      good: 2500,
      needsImprovement: 4000,
    },
    // First Input Delay (FID) - measures interactivity
    fid: {
      good: 100,
      needsImprovement: 300,
    },
    // Cumulative Layout Shift (CLS) - measures visual stability
    cls: {
      good: 0.1,
      needsImprovement: 0.25,
    },
    // First Contentful Paint (FCP)
    fcp: {
      good: 1800,
      needsImprovement: 3000,
    },
    // Time to First Byte (TTFB)
    ttfb: {
      good: 800,
      needsImprovement: 1800,
    },
  },

  // Cache Configuration
  cache: {
    // Cache duration in milliseconds
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    productsTTL: 10 * 60 * 1000, // 10 minutes
    coveragesTTL: 10 * 60 * 1000, // 10 minutes
    newsTTL: 15 * 60 * 1000, // 15 minutes
    
    // Maximum cache size
    maxSize: 50 * 1024 * 1024, // 50MB
    
    // IndexedDB configuration
    dbName: 'ProductHubCache',
    dbVersion: 1,
    storeName: 'cache',
  },

  // Bundle Optimization
  bundle: {
    // Lazy loading thresholds
    lazyLoadThreshold: 100 * 1024, // 100KB
    
    // Code splitting
    chunkSizeWarning: 500 * 1024, // 500KB
    
    // Prefetch priority
    prefetchPriority: ['products', 'coverages', 'forms'],
  },

  // Memory Management
  memory: {
    // Cleanup thresholds
    cleanupThreshold: 0.8, // 80% of available memory
    
    // Monitoring interval
    monitoringInterval: 30000, // 30 seconds
    
    // Warning threshold
    warningThreshold: 0.9, // 90% of available memory
  },

  // Network Optimization
  network: {
    // Request timeout
    timeout: 30000, // 30 seconds
    
    // Retry configuration
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    
    // Batch request size
    batchSize: 10,
  },

  // Rendering Optimization
  rendering: {
    // Virtual scrolling threshold
    virtualScrollThreshold: 100, // items
    
    // Debounce delays
    searchDebounce: 300, // ms
    resizeDebounce: 150, // ms
    scrollDebounce: 100, // ms
    
    // Animation frame budget
    frameTimeBudget: 16, // ms (60fps)
  },

  // Monitoring
  monitoring: {
    // Enable performance monitoring
    enabled: process.env.NODE_ENV === 'production',
    
    // Sample rate (0-1)
    sampleRate: 0.1, // 10% of users
    
    // Report interval
    reportInterval: 60000, // 1 minute
    
    // Enable detailed logging
    detailedLogging: process.env.NODE_ENV === 'development',
  },
};

/**
 * Get performance budget for specific metrics
 */
export const getPerformanceBudget = () => ({
  // Time budgets (in milliseconds)
  timeToInteractive: 3500,
  firstContentfulPaint: 1800,
  largestContentfulPaint: 2500,
  
  // Size budgets (in bytes)
  totalJavaScript: 300 * 1024, // 300KB
  totalCSS: 50 * 1024, // 50KB
  totalImages: 500 * 1024, // 500KB
  
  // Request budgets
  maxRequests: 50,
  maxDomainRequests: 6,
});

/**
 * Check if a metric is within acceptable range
 */
export const isMetricGood = (metricName, value) => {
  const config = PERFORMANCE_CONFIG.webVitals[metricName.toLowerCase()];
  if (!config) return true;
  return value <= config.good;
};

/**
 * Check if a metric needs improvement
 */
export const isMetricPoor = (metricName, value) => {
  const config = PERFORMANCE_CONFIG.webVitals[metricName.toLowerCase()];
  if (!config) return false;
  return value > config.needsImprovement;
};

/**
 * Get cache TTL for a specific data type
 */
export const getCacheTTL = (dataType) => {
  const ttlMap = {
    products: PERFORMANCE_CONFIG.cache.productsTTL,
    coverages: PERFORMANCE_CONFIG.cache.coveragesTTL,
    news: PERFORMANCE_CONFIG.cache.newsTTL,
  };
  return ttlMap[dataType] || PERFORMANCE_CONFIG.cache.defaultTTL;
};

export default PERFORMANCE_CONFIG;

