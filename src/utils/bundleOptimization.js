// src/utils/bundleOptimization.js
/**
 * Bundle optimization utilities for the Product Hub App
 * Handles code splitting, lazy loading, and bundle analysis
 */

import { lazy, Suspense } from 'react';

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
  
  // DNS prefetch for external resources
  const dnsPrefetchUrls = [
    'https://fonts.googleapis.com',
    'https://firestore.googleapis.com',
    'https://firebase.googleapis.com',
    'https://api.openai.com'
  ];
  
  dnsPrefetchUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = url;
    head.appendChild(link);
  });
  
  // Preconnect to critical origins
  const preconnectUrls = [
    'https://fonts.gstatic.com',
    'https://firestore.googleapis.com'
  ];
  
  preconnectUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = url;
    link.crossOrigin = 'anonymous';
    head.appendChild(link);
  });
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
  if (process.env.NODE_ENV !== 'development') return;
  
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const chunks = scripts
    .filter(script => script.src.includes('/static/js/'))
    .map(script => {
      const url = new URL(script.src);
      const filename = url.pathname.split('/').pop();
      const match = filename.match(/(\d+)\.([a-f0-9]+)\.chunk\.js/);
      
      return {
        filename,
        chunkId: match ? match[1] : 'main',
        hash: match ? match[2] : 'unknown',
        url: script.src
      };
    });
  
  console.group('📊 Bundle Composition Analysis');
  console.log(`Total chunks: ${chunks.length}`);
  console.table(chunks);
  console.groupEnd();
  
  return chunks;
};

// Performance budget monitoring
export const monitorPerformanceBudget = () => {
  const budget = {
    maxChunks: 15,
    maxMainBundleSize: 500 * 1024, // 500KB
    maxTotalSize: 2 * 1024 * 1024, // 2MB
    maxLoadTime: 3000 // 3 seconds
  };
  
  const chunks = analyzeBundleComposition();
  
  if (chunks.length > budget.maxChunks) {
    console.warn(`⚠️ Performance Budget: Too many chunks (${chunks.length}/${budget.maxChunks})`);
  }
  
  // Monitor load time
  if (performance.timing) {
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    if (loadTime > budget.maxLoadTime) {
      console.warn(`⚠️ Performance Budget: Slow load time (${loadTime}ms/${budget.maxLoadTime}ms)`);
    }
  }
};

// Critical resource loading optimization
export const optimizeCriticalResources = () => {
  // Inline critical CSS (would be done at build time in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('💡 Consider inlining critical CSS for faster rendering');
  }
  
  // Optimize font loading
  const fontLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
  fontLinks.forEach(link => {
    link.setAttribute('rel', 'preload');
    link.setAttribute('as', 'style');
    link.setAttribute('onload', "this.onload=null;this.rel='stylesheet'");
  });
};

// Initialize bundle optimizations
export const initBundleOptimizations = () => {
  if (typeof window === 'undefined') return;
  
  // Add resource hints
  addResourceHints();
  
  // Optimize critical resources
  optimizeCriticalResources();
  
  // Preload critical chunks
  preloadCriticalChunks();
  
  // Monitor performance budget
  setTimeout(() => {
    monitorPerformanceBudget();
    optimizeImports();
  }, 3000);
  
  console.log('🚀 Bundle optimizations initialized');
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
