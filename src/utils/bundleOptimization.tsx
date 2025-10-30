/**
 * Bundle optimization utilities for the Product Hub App
 * Handles code splitting, lazy loading, and resource optimization
 */

import React, { lazy, Suspense, ComponentType, ReactNode } from 'react';
import logger, { LOG_CATEGORIES } from './logger';

interface LazyComponentOptions {
  fallback?: ReactNode;
  chunkName?: string;
}

// Simplified lazy loading using Vite's native support
export const createOptimizedLazyComponent = <P extends object = Record<string, never>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: LazyComponentOptions = {}
): React.FC<P> => {
  const { fallback = null, chunkName = 'unknown' } = options;

  const LazyComponent = lazy(() =>
    importFn().catch(error => {
      logger.error(LOG_CATEGORIES.ERROR, `Failed to load chunk: ${chunkName}`, {}, error as Error);
      throw error;
    })
  );

  return (props: P) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Simplified resource hints for better loading performance
export const addResourceHints = () => {
  try {
    const head = document.head;
    const resourceHintExists = (rel: string, href: string) =>
      document.querySelector(`link[rel="${rel}"][href="${href}"]`) !== null;

    // DNS prefetch for external resources
    const dnsPrefetchUrls = [
      'https://fonts.googleapis.com',
      'https://firestore.googleapis.com',
      'https://firebase.googleapis.com'
    ];

    dnsPrefetchUrls.forEach(url => {
      if (!resourceHintExists('dns-prefetch', url)) {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = url;
        head.appendChild(link);
      }
    });

    // Preconnect to critical origins
    const preconnectUrls = [
      'https://fonts.gstatic.com',
      'https://firestore.googleapis.com'
    ];

    preconnectUrls.forEach(url => {
      if (!resourceHintExists('preconnect', url)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = url;
        link.crossOrigin = 'anonymous';
        head.appendChild(link);
      }
    });
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Failed to add resource hints', {}, error as Error);
  }
};


// Initialize bundle optimizations
export const initBundleOptimizations = () => {
  if (typeof window === 'undefined') return;

  try {
    addResourceHints();
    logger.debug(LOG_CATEGORIES.DATA, 'Bundle optimizations initialized');
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Bundle optimizations failed', {}, error as Error);
  }
};
