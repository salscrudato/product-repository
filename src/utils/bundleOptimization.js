// src/utils/bundleOptimization.js
/**
 * Bundle optimization utilities for the Product Hub App
 * Handles code splitting, lazy loading, and bundle analysis
 */

import { lazy, Suspense } from 'react';
import logger, { LOG_CATEGORIES } from './logger';

// Enhanced lazy loading with error boundaries and retry logic
export const createOptimizedLazyComponent = (importFn, options = {}) => {
  const {
    fallback = null,
    retryCount = 3,
    retryDelay = 1000,
    chunkName = 'unknown'
  } = options;

  let retries = 0;
  
  const LazyComponent = lazy(async () => {
    try {
      console.log(`📦 Loading chunk: ${chunkName}`);
      const startTime = performance.now();
      
      const module = await importFn();
      
      const loadTime = performance.now() - startTime;
      console.log(`✅ Chunk loaded: ${chunkName} in ${loadTime.toFixed(2)}ms`);
      
      return module;
    } catch (error) {
      console.error(`❌ Failed to load chunk: ${chunkName}`, error);
      
      if (retries < retryCount) {
        retries++;
        console.log(`🔄 Retrying chunk load: ${chunkName} (attempt ${retries}/${retryCount})`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * retries));
        
        // Recursive retry
        return createOptimizedLazyComponent(importFn, options);
      }
      
      throw error;
    }
  });

  return (props) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Preload critical chunks
export const preloadCriticalChunks = () => {
  const criticalChunks = [
    () => import('../components/ProductHub'),
    () => import('../components/CoverageScreen'),
    () => import('../components/PricingScreen')
  ];

  // Preload after initial render
  setTimeout(() => {
    criticalChunks.forEach((importFn, index) => {
      setTimeout(() => {
        importFn().catch(error => {
          console.warn('Failed to preload chunk:', error);
        });
      }, index * 100); // Stagger preloading
    });
  }, 2000);
};

// Resource hints for better loading performance
export const addResourceHints = () => {
  const head = document.head;

  // Helper function to check if a resource hint already exists
  const resourceHintExists = (rel, href) => {
    return document.querySelector(`link[rel="${rel}"][href="${href}"]`) !== null;
  };

  try {
    // DNS prefetch for external resources - only add if not already present
    const dnsPrefetchUrls = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://firestore.googleapis.com',
      'https://firebase.googleapis.com',
      'https://api.openai.com'
    ];

    dnsPrefetchUrls.forEach(url => {
      if (!resourceHintExists('dns-prefetch', url)) {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = url;
        head.appendChild(link);
      }
    });

    // Preconnect to critical origins - only for resources we'll actually use
    const preconnectUrls = [
      { url: 'https://fonts.gstatic.com', crossOrigin: true },
      { url: 'https://firestore.googleapis.com', crossOrigin: true }
    ];

    preconnectUrls.forEach(({ url, crossOrigin }) => {
      if (!resourceHintExists('preconnect', url)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = url;
        if (crossOrigin) {
          link.crossOrigin = 'anonymous';
        }
        head.appendChild(link);
      }
    });
  } catch (error) {
    console.error('Failed to add resource hints:', error);
  }
};

// Module federation for micro-frontends (future enhancement)
export const loadRemoteModule = async (remoteUrl, moduleName) => {
  try {
    const script = document.createElement('script');
    script.src = remoteUrl;
    script.type = 'module';
    
    return new Promise((resolve, reject) => {
      script.onload = () => {
        // Access the remote module
        const remoteModule = window[moduleName];
        if (remoteModule) {
          resolve(remoteModule);
        } else {
          reject(new Error(`Remote module ${moduleName} not found`));
        }
      };
      
      script.onerror = () => {
        reject(new Error(`Failed to load remote module from ${remoteUrl}`));
      };
      
      document.head.appendChild(script);
    });
  } catch (error) {
    console.error('Failed to load remote module:', error);
    throw error;
  }
};

// Tree shaking optimization hints
export const optimizeImports = () => {
  // Log unused imports in development
  if (process.env.NODE_ENV === 'development') {
    console.group('🌳 Tree Shaking Optimization Hints');
    
    // Check for large libraries that might not be tree-shaken
    const largeLibraries = [
      'lodash',
      'moment',
      'rxjs',
      'antd'
    ];
    
    largeLibraries.forEach(lib => {
      try {
        // Check if library is available without dynamic require
        if (typeof window !== 'undefined' && window[lib]) {
          console.warn(`📦 Large library detected: ${lib} - consider using specific imports`);
        }
      } catch (e) {
        // Library not installed, which is good
      }
    });
    
    console.groupEnd();
  }
};

// Bundle analysis utilities
export const analyzeBundleComposition = () => {
  if (process.env.NODE_ENV !== 'development') return [];

  try {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const chunks = scripts
      .filter(script => script.src && script.src.includes('/static/js/'))
      .map(script => {
        try {
          const url = new URL(script.src);
          const filename = url.pathname.split('/').pop();
          const match = filename.match(/(\d+)\.([a-f0-9]+)\.chunk\.js/);

          return {
            filename,
            chunkId: match ? match[1] : 'main',
            hash: match ? match[2] : 'unknown',
            url: script.src
          };
        } catch (error) {
          console.warn('Failed to analyze script:', script.src, error);
          return null;
        }
      })
      .filter(chunk => chunk !== null);

    console.group('📊 Bundle Composition Analysis');
    console.log(`Total chunks: ${chunks.length}`);
    if (chunks.length > 0) {
      console.table(chunks);
    }
    console.groupEnd();

    return chunks;
  } catch (error) {
    console.error('Bundle composition analysis failed:', error);
    return [];
  }
};

// Performance budget monitoring
export const monitorPerformanceBudget = () => {
  const budget = {
    maxChunks: 15,
    maxMainBundleSize: 500 * 1024, // 500KB
    maxTotalSize: 2 * 1024 * 1024, // 2MB
    maxLoadTime: 3000 // 3 seconds
  };

  try {
    const chunks = analyzeBundleComposition();

    if (chunks && Array.isArray(chunks) && chunks.length > budget.maxChunks) {
      console.warn(`⚠️ Performance Budget: Too many chunks (${chunks.length}/${budget.maxChunks})`);
    }

    // Monitor load time
    if (performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      if (loadTime > budget.maxLoadTime) {
        console.warn(`⚠️ Performance Budget: Slow load time (${loadTime}ms/${budget.maxLoadTime}ms)`);
      }
    }
  } catch (error) {
    console.error('Performance budget monitoring failed:', error);
  }
};

// Critical resource loading optimization
export const optimizeCriticalResources = () => {
  // Inline critical CSS (would be done at build time in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('💡 Consider inlining critical CSS for faster rendering');
  }

  // Optimize font loading - improve existing Google Fonts links
  try {
    const fontLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
    if (fontLinks.length > 0) {
      // Optimize existing font links for better loading
      fontLinks.forEach(link => {
        // Only modify if it's a stylesheet link and has a valid href
        if (link.rel === 'stylesheet' && link.href && link.href.includes('fonts.googleapis.com/css')) {
          // Add font-display: swap for better performance
          const href = link.href;
          if (!href.includes('display=swap')) {
            const separator = href.includes('?') ? '&' : '?';
            link.href = `${href}${separator}display=swap`;
          }

          // Use async loading instead of media print/all trick to avoid preload warnings
          if (!link.hasAttribute('media')) {
            // Set loading priority to low to avoid blocking render
            link.setAttribute('importance', 'low');
          }
        }
      });
    }
  } catch (error) {
    console.error('Failed to optimize font loading:', error);
  }

  // Preload critical images if any
  const criticalImages = document.querySelectorAll('img[data-critical="true"]');
  criticalImages.forEach(img => {
    if (img.src && !document.querySelector(`link[rel="preload"][href="${img.src}"]`)) {
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.as = 'image';
      preloadLink.href = img.src;
      document.head.appendChild(preloadLink);
    }
  });

  // Preload critical CSS files
  const criticalCSSLinks = document.querySelectorAll('link[rel="stylesheet"][data-critical="true"]');
  criticalCSSLinks.forEach(link => {
    if (link.href && !document.querySelector(`link[rel="preload"][href="${link.href}"]`)) {
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.as = 'style';
      preloadLink.href = link.href;
      document.head.appendChild(preloadLink);
    }
  });
};

// Initialize bundle optimizations
export const initBundleOptimizations = () => {
  if (typeof window === 'undefined') {
    logger.warn(LOG_CATEGORIES.PERFORMANCE, 'Bundle optimizations skipped - no window object');
    return;
  }

  const startTime = Date.now();
  logger.info(LOG_CATEGORIES.PERFORMANCE, 'Initializing bundle optimizations');

  try {
    // Add resource hints
    addResourceHints();
    logger.debug(LOG_CATEGORIES.PERFORMANCE, 'Resource hints added');

    // Optimize critical resources
    optimizeCriticalResources();
    logger.debug(LOG_CATEGORIES.PERFORMANCE, 'Critical resources optimized');

    // Preload critical chunks
    preloadCriticalChunks();
    logger.debug(LOG_CATEGORIES.PERFORMANCE, 'Critical chunks preload initiated');

    // Monitor performance budget
    setTimeout(() => {
      try {
        monitorPerformanceBudget();
        optimizeImports();
        logger.debug(LOG_CATEGORIES.PERFORMANCE, 'Performance monitoring and import optimization completed');
      } catch (error) {
        logger.error(LOG_CATEGORIES.PERFORMANCE, 'Error in delayed performance monitoring', {}, error);
      }
    }, 3000);

    const duration = Date.now() - startTime;
    logger.logPerformance('Bundle optimizations initialization', duration, {
      hasWindow: true,
      userAgent: navigator.userAgent
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(LOG_CATEGORIES.PERFORMANCE, 'Bundle optimizations initialization failed', {
      duration
    }, error);
  }
};

// Webpack chunk loading optimization
export const optimizeChunkLoading = () => {
  // Implement chunk loading strategies
  if (window.__webpack_require__) {
    const originalEnsure = window.__webpack_require__.e;
    
    window.__webpack_require__.e = function(chunkId) {
      console.log(`📦 Loading chunk: ${chunkId}`);
      const startTime = performance.now();
      
      return originalEnsure.call(this, chunkId).then(
        (result) => {
          const loadTime = performance.now() - startTime;
          console.log(`✅ Chunk ${chunkId} loaded in ${loadTime.toFixed(2)}ms`);
          return result;
        },
        (error) => {
          console.error(`❌ Failed to load chunk ${chunkId}:`, error);
          throw error;
        }
      );
    };
  }
};

const bundleOptimization = {
  createOptimizedLazyComponent,
  preloadCriticalChunks,
  addResourceHints,
  loadRemoteModule,
  optimizeImports,
  analyzeBundleComposition,
  monitorPerformanceBudget,
  optimizeCriticalResources,
  initBundleOptimizations,
  optimizeChunkLoading
};

export default bundleOptimization;
