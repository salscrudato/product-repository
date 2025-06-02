/**
 * Performance monitoring utilities for the Product Hub App
 * Provides tools for measuring and tracking performance metrics
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
    this.isEnabled = process.env.NODE_ENV === 'development';
    
    if (this.isEnabled) {
      this.initializeObservers();
    }
  }

  // Initialize performance observers
  initializeObservers() {
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('navigation', {
              type: entry.type,
              duration: entry.duration,
              loadEventEnd: entry.loadEventEnd,
              domContentLoadedEventEnd: entry.domContentLoadedEventEnd
            });
          }
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (e) {
        console.warn('Navigation timing observer not supported');
      }

      // Observe paint timing
      try {
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('paint', {
              name: entry.name,
              startTime: entry.startTime
            });
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(paintObserver);
      } catch (e) {
        console.warn('Paint timing observer not supported');
      }

      // Observe largest contentful paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.recordMetric('lcp', {
            startTime: lastEntry.startTime,
            size: lastEntry.size,
            element: lastEntry.element?.tagName
          });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }
    }
  }

  // Record a custom metric
  recordMetric(name, data) {
    if (!this.isEnabled) return;

    const timestamp = Date.now();
    const metric = {
      name,
      data,
      timestamp,
      url: window.location.pathname
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    this.metrics.get(name).push(metric);
    
    // Log in development
    console.log(`📊 Performance Metric [${name}]:`, data);
  }

  // Start timing a custom operation
  startTiming(name) {
    if (!this.isEnabled) return () => {};

    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric('custom-timing', {
        name,
        duration,
        startTime
      });
      return duration;
    };
  }

  // Measure Firebase operation performance
  measureFirebaseOperation(operationType, collectionName) {
    if (!this.isEnabled) return () => {};

    const startTime = performance.now();
    
    return (resultCount = 0, error = null) => {
      const duration = performance.now() - startTime;
      this.recordMetric('firebase-operation', {
        type: operationType,
        collection: collectionName,
        duration,
        resultCount,
        success: !error,
        error: error?.message
      });
      return duration;
    };
  }

  // Measure component render performance
  measureComponentRender(componentName) {
    if (!this.isEnabled) return () => {};

    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric('component-render', {
        component: componentName,
        duration
      });
      
      // Warn about slow renders
      if (duration > 16) { // 60fps = 16.67ms per frame
        console.warn(`🐌 Slow render detected: ${componentName} took ${duration.toFixed(2)}ms`);
      }
      
      return duration;
    };
  }

  // Get performance summary
  getSummary() {
    if (!this.isEnabled) return null;

    const summary = {};
    
    for (const [metricName, entries] of this.metrics) {
      const durations = entries
        .filter(entry => entry.data.duration)
        .map(entry => entry.data.duration);
      
      if (durations.length > 0) {
        summary[metricName] = {
          count: entries.length,
          avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
          minDuration: Math.min(...durations),
          maxDuration: Math.max(...durations),
          totalDuration: durations.reduce((a, b) => a + b, 0)
        };
      } else {
        summary[metricName] = {
          count: entries.length
        };
      }
    }
    
    return summary;
  }

  // Export metrics for analysis
  exportMetrics() {
    if (!this.isEnabled) return null;

    const data = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metrics: Object.fromEntries(this.metrics)
    };
    
    // Create downloadable file
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    return data;
  }

  // Clear all metrics
  clear() {
    this.metrics.clear();
  }

  // Cleanup observers
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// React hook for component performance monitoring
export function usePerformanceMonitor(componentName) {
  const measureRender = () => performanceMonitor.measureComponentRender(componentName);
  const startTiming = (operationName) => performanceMonitor.startTiming(`${componentName}-${operationName}`);
  
  return {
    measureRender,
    startTiming,
    recordMetric: (name, data) => performanceMonitor.recordMetric(`${componentName}-${name}`, data)
  };
}

// Firebase performance wrapper
export function withFirebasePerformance(operation, operationType, collectionName) {
  const endTiming = performanceMonitor.measureFirebaseOperation(operationType, collectionName);
  
  return operation
    .then(result => {
      const resultCount = Array.isArray(result) ? result.length : 1;
      endTiming(resultCount);
      return result;
    })
    .catch(error => {
      endTiming(0, error);
      throw error;
    });
}

// Bundle size analyzer
export function analyzeBundleSize() {
  if (!performanceMonitor.isEnabled) return;

  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  
  const analysis = {
    scripts: scripts.map(script => ({
      src: script.src,
      async: script.async,
      defer: script.defer
    })),
    styles: styles.map(style => ({
      href: style.href
    })),
    totalScripts: scripts.length,
    totalStyles: styles.length
  };
  
  performanceMonitor.recordMetric('bundle-analysis', analysis);
  console.table(analysis.scripts);
  
  return analysis;
}

// Memory usage monitoring
export function monitorMemoryUsage() {
  if (!performanceMonitor.isEnabled || !('memory' in performance)) return;

  const memory = performance.memory;
  const usage = {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100).toFixed(2)
  };
  
  performanceMonitor.recordMetric('memory-usage', usage);
  
  // Warn about high memory usage
  if (usage.usagePercentage > 80) {
    console.warn(`🚨 High memory usage detected: ${usage.usagePercentage}%`);
  }
  
  return usage;
}

// Export the singleton instance and utilities
export default performanceMonitor;
export { 
  performanceMonitor,
  PerformanceMonitor
};
