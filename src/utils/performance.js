// src/utils/performance.js
import React from 'react';

/**
 * Performance monitoring utilities for the Product Hub App
 */

// Performance metrics collection
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  // Start timing a operation
  startTiming(label) {
    if (!this.isEnabled) return;
    
    this.metrics.set(label, {
      startTime: performance.now(),
      label
    });
  }

  // End timing and log results
  endTiming(label) {
    if (!this.isEnabled) return;
    
    const metric = this.metrics.get(label);
    if (!metric) {
      console.warn(`Performance: No start time found for "${label}"`);
      return;
    }

    const duration = performance.now() - metric.startTime;
    console.log(`⚡ Performance: ${label} took ${duration.toFixed(2)}ms`);
    
    // Store for analysis
    this.metrics.set(label, {
      ...metric,
      duration,
      endTime: performance.now()
    });

    return duration;
  }

  // Measure component render time
  measureRender(componentName, renderFn) {
    if (!this.isEnabled) return renderFn();
    
    this.startTiming(`${componentName} render`);
    const result = renderFn();
    this.endTiming(`${componentName} render`);
    
    return result;
  }

  // Monitor memory usage
  checkMemoryUsage(label = 'Memory Check') {
    if (!this.isEnabled || !performance.memory) return;
    
    const memory = performance.memory;
    console.log(`🧠 ${label}:`, {
      used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
    });
  }

  // Monitor long tasks
  observeLongTasks() {
    if (!this.isEnabled || !window.PerformanceObserver) return;

    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          console.warn(`🐌 Long Task detected: ${entry.duration.toFixed(2)}ms`);
        });
      });
      
      observer.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', observer);
    } catch (e) {
      console.log('Long task monitoring not supported');
    }
  }

  // Monitor layout shifts
  observeLayoutShifts() {
    if (!this.isEnabled || !window.PerformanceObserver) return;

    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.value > 0.1) {
            console.warn(`📐 Layout Shift detected: ${entry.value.toFixed(4)}`);
          }
        });
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('layout-shift', observer);
    } catch (e) {
      console.log('Layout shift monitoring not supported');
    }
  }

  // Get all metrics
  getMetrics() {
    return Array.from(this.metrics.entries()).map(([label, data]) => ({
      label,
      ...data
    }));
  }

  // Clear all metrics
  clearMetrics() {
    this.metrics.clear();
  }

  // Cleanup observers
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  return {
    startTiming: performanceMonitor.startTiming.bind(performanceMonitor),
    endTiming: performanceMonitor.endTiming.bind(performanceMonitor),
    measureRender: performanceMonitor.measureRender.bind(performanceMonitor),
    checkMemoryUsage: performanceMonitor.checkMemoryUsage.bind(performanceMonitor)
  };
};

// HOC for measuring component performance
export const withPerformanceMonitoring = (WrappedComponent, componentName) => {
  const MemoizedComponent = React.memo(WrappedComponent);
  
  return React.forwardRef((props, ref) => {
    return performanceMonitor.measureRender(
      componentName || WrappedComponent.displayName || WrappedComponent.name,
      () => <MemoizedComponent {...props} ref={ref} />
    );
  });
};

// Debounce utility for performance
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

// Throttle utility for performance
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Lazy loading utility
export const createLazyComponent = (importFn, fallback = null) => {
  const LazyComponent = React.lazy(importFn);
  
  return React.forwardRef((props, ref) => (
    <React.Suspense fallback={fallback}>
      <LazyComponent {...props} ref={ref} />
    </React.Suspense>
  ));
};

// Bundle size analyzer (development only)
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV !== 'development') return;
  
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const totalSize = scripts.reduce((total, script) => {
    // This is a rough estimation - in production you'd use webpack-bundle-analyzer
    return total + (script.src.length * 100); // Rough estimate
  }, 0);
  
  console.log(`📦 Estimated bundle size: ${(totalSize / 1024).toFixed(2)} KB`);
};

// Initialize performance monitoring
export const initPerformanceMonitoring = () => {
  if (process.env.NODE_ENV === 'development') {
    performanceMonitor.observeLongTasks();
    performanceMonitor.observeLayoutShifts();
    
    // Check memory usage periodically
    setInterval(() => {
      performanceMonitor.checkMemoryUsage('Periodic Check');
    }, 30000); // Every 30 seconds
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      performanceMonitor.cleanup();
    });
  }
};

export default performanceMonitor;
