/**
 * Bundle optimization utilities for the Product Hub App
 * Handles code splitting, lazy loading, and resource optimization
 */

import React, { lazy, Suspense, ComponentType, ReactNode } from 'react';
import logger, { LOG_CATEGORIES } from './logger';

interface LazyComponentOptions {
  fallback?: ReactNode;
  chunkName?: string;
  retries?: number;
}

// Retry wrapper for dynamic imports (handles transient network failures).
// Detects Vite's "504 Outdated Optimize Dep" and triggers a full page reload,
// which is the only correct recovery (the browser must re-fetch the new URLs
// that Vite generated after re-optimizing deps).
const retryImport = <T,>(
  importFn: () => Promise<T>,
  chunkName: string,
  retries: number = 2,
  delay: number = 1000
): Promise<T> => {
  return importFn().catch((error) => {
    const msg = String((error as Error)?.message ?? error);

    // Vite serves 504 when its optimizer has re-bundled deps and the old
    // URLs are stale.  Retrying the same URL can never succeed — the hash
    // has changed.  A full page reload lets the browser pick up the new
    // optimized dependency URLs.
    if (
      msg.includes('504') ||
      msg.includes('Outdated Optimize Dep') ||
      msg.includes('Failed to fetch dynamically imported module')
    ) {
      logger.info(LOG_CATEGORIES.DATA, `Vite dep re-optimization detected while loading ${chunkName}, reloading page`);
      window.location.reload();
      // Return a never-resolving promise to prevent further retries while the reload happens
      return new Promise<T>(() => {});
    }

    // Don't retry SyntaxErrors (these are code errors, not network errors)
    if (error instanceof SyntaxError || retries <= 0) {
      logger.error(LOG_CATEGORIES.ERROR, `Failed to load chunk: ${chunkName}`, {
        retriesExhausted: retries <= 0,
      }, error as Error);
      throw error;
    }
    logger.info(LOG_CATEGORIES.DATA, `Retrying chunk load: ${chunkName}`, { retriesLeft: retries });
    return new Promise<T>((resolve) => setTimeout(resolve, delay)).then(() =>
      retryImport(importFn, chunkName, retries - 1, delay * 2)
    );
  });
};

// Simplified lazy loading using Vite's native support with retry
export const createOptimizedLazyComponent = <P extends object = Record<string, never>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: LazyComponentOptions = {}
): React.FC<P> => {
  const { fallback = null, chunkName = 'unknown', retries = 2 } = options;

  const LazyComponent = lazy(() => retryImport(importFn, chunkName, retries));

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
