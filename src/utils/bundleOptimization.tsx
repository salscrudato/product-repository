/**
 * Bundle optimization utilities for the Product Hub App
 * Handles code splitting, lazy loading, and bundle analysis
 */

import React, { lazy, Suspense, ComponentType, ReactNode } from 'react';
import logger, { LOG_CATEGORIES } from './logger';

interface LazyComponentOptions {
  fallback?: ReactNode;
  retryCount?: number;
  retryDelay?: number;
  chunkName?: string;
}

// Enhanced lazy loading with error boundaries and retry logic
export const createOptimizedLazyComponent = <P extends object = Record<string, never>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: LazyComponentOptions = {}
): React.FC<P> => {
  const {
    fallback = null,
    retryCount = 3,
    retryDelay = 1000,
    chunkName = 'unknown'
  } = options;

  // Create a wrapper function that handles retries
  const importWithRetry = async (attempt = 0): Promise<{ default: ComponentType<P> }> => {
    try {
      const module = await importFn();
      return module;
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, `Failed to load chunk: ${chunkName}`, { attempt: `${attempt + 1}/${retryCount}` }, error as Error);

      if (attempt < retryCount) {
        logger.debug(LOG_CATEGORIES.DATA, `Retrying chunk load: ${chunkName}`, { attempt: `${attempt + 1}/${retryCount}` });

        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));

        // Retry the import
        return importWithRetry(attempt + 1);
      }

      // All retries exhausted
      throw error;
    }
  };

  const LazyComponent = lazy(() => importWithRetry());

  return (props: P) => (
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





// Critical resource loading optimization
export const optimizeCriticalResources = () => {
  // Inline critical CSS (would be done at build time in production)
  // Removed console.log to reduce noise

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
    logger.warn(LOG_CATEGORIES.DATA, 'Bundle optimizations skipped - no window object');
    return;
  }

  logger.info(LOG_CATEGORIES.DATA, 'Initializing bundle optimizations');

  try {
    // Add resource hints
    addResourceHints();
    logger.debug(LOG_CATEGORIES.DATA, 'Resource hints added');

    // Optimize critical resources
    optimizeCriticalResources();
    logger.debug(LOG_CATEGORIES.DATA, 'Critical resources optimized');

    // Preload critical chunks
    preloadCriticalChunks();
    logger.debug(LOG_CATEGORIES.DATA, 'Critical chunks preload initiated');

  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Bundle optimizations initialization failed', {}, error);
  }
};

const bundleOptimization = {
  createOptimizedLazyComponent,
  preloadCriticalChunks,
  addResourceHints,
  optimizeCriticalResources,
  initBundleOptimizations
};

export default bundleOptimization;
