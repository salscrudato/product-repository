/**
 * Performance Monitoring Utility
 * Tracks and reports application performance metrics
 */

import logger, { LOG_CATEGORIES } from './logger';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: string;
}

interface PerformanceThresholds {
  fcp: number;  // First Contentful Paint
  lcp: number;  // Largest Contentful Paint
  fid: number;  // First Input Delay
  cls: number;  // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private thresholds: PerformanceThresholds = {
    fcp: 1800,  // 1.8s
    lcp: 2500,  // 2.5s
    fid: 100,   // 100ms
    cls: 0.1,   // 0.1
    ttfb: 600   // 600ms
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWebVitals();
      this.initializeNavigationTiming();
      this.initializeResourceTiming();
    }
  }

  /**
   * Initialize Web Vitals monitoring
   */
  private initializeWebVitals(): void {
    // First Contentful Paint (FCP)
    this.observePaint('first-contentful-paint', 'fcp');

    // Largest Contentful Paint (LCP)
    this.observeLCP();

    // First Input Delay (FID)
    this.observeFID();

    // Cumulative Layout Shift (CLS)
    this.observeCLS();
  }

  /**
   * Observe paint timing
   */
  private observePaint(entryName: string, metricName: string): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === entryName) {
          this.recordMetric(metricName, entry.startTime, 'web-vitals');
          observer.disconnect();
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['paint'] });
    } catch (error) {
      logger.warn(LOG_CATEGORIES.PERFORMANCE, `Failed to observe ${entryName}`, { error });
    }
  }

  /**
   * Observe Largest Contentful Paint
   */
  private observeLCP(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.recordMetric('lcp', lastEntry.startTime, 'web-vitals');
    });

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      logger.warn(LOG_CATEGORIES.PERFORMANCE, 'Failed to observe LCP', { error });
    }
  }

  /**
   * Observe First Input Delay
   */
  private observeFID(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEventTiming;
        const fid = fidEntry.processingStart - fidEntry.startTime;
        this.recordMetric('fid', fid, 'web-vitals');
        observer.disconnect();
      }
    });

    try {
      observer.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      logger.warn(LOG_CATEGORIES.PERFORMANCE, 'Failed to observe FID', { error });
    }
  }

  /**
   * Observe Cumulative Layout Shift
   */
  private observeCLS(): void {
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as LayoutShift;
        if (!layoutShiftEntry.hadRecentInput) {
          clsValue += layoutShiftEntry.value;
        }
      }
      this.recordMetric('cls', clsValue, 'web-vitals');
    });

    try {
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      logger.warn(LOG_CATEGORIES.PERFORMANCE, 'Failed to observe CLS', { error });
    }
  }

  /**
   * Initialize Navigation Timing monitoring
   */
  private initializeNavigationTiming(): void {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          // Time to First Byte
          const ttfb = navigation.responseStart - navigation.requestStart;
          this.recordMetric('ttfb', ttfb, 'navigation');

          // DOM Content Loaded
          const dcl = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
          this.recordMetric('dcl', dcl, 'navigation');

          // Load Complete
          const loadComplete = navigation.loadEventEnd - navigation.loadEventStart;
          this.recordMetric('load-complete', loadComplete, 'navigation');

          // DNS Lookup
          const dnsLookup = navigation.domainLookupEnd - navigation.domainLookupStart;
          this.recordMetric('dns-lookup', dnsLookup, 'navigation');

          // TCP Connection
          const tcpConnection = navigation.connectEnd - navigation.connectStart;
          this.recordMetric('tcp-connection', tcpConnection, 'navigation');

          this.logNavigationMetrics();
        }
      }, 0);
    });
  }

  /**
   * Initialize Resource Timing monitoring
   */
  private initializeResourceTiming(): void {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        
        // Categorize resources
        const resourcesByType: Record<string, number[]> = {
          script: [],
          stylesheet: [],
          image: [],
          fetch: [],
          other: []
        };

        resources.forEach(resource => {
          const duration = resource.responseEnd - resource.startTime;
          const type = this.getResourceType(resource.name);
          resourcesByType[type].push(duration);
        });

        // Log resource timing summary
        Object.entries(resourcesByType).forEach(([type, durations]) => {
          if (durations.length > 0) {
            const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
            const max = Math.max(...durations);
            
            logger.debug(LOG_CATEGORIES.PERFORMANCE, `Resource timing: ${type}`, {
              count: durations.length,
              avgDuration: Math.round(avg),
              maxDuration: Math.round(max)
            });
          }
        });
      }, 1000);
    });
  }

  /**
   * Get resource type from URL
   */
  private getResourceType(url: string): string {
    if (url.endsWith('.js') || url.includes('/static/js/')) return 'script';
    if (url.endsWith('.css') || url.includes('/static/css/')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.includes('/api/') || url.includes('firestore') || url.includes('firebase')) return 'fetch';
    return 'other';
  }

  /**
   * Record a performance metric
   */
  private recordMetric(name: string, value: number, category: string): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      category
    };

    this.metrics.push(metric);

    // Check against thresholds
    if (category === 'web-vitals') {
      this.checkThreshold(name, value);
    }

    logger.debug(LOG_CATEGORIES.PERFORMANCE, `Performance metric: ${name}`, {
      value: Math.round(value),
      category
    });
  }

  /**
   * Check metric against threshold
   */
  private checkThreshold(name: string, value: number): void {
    const threshold = this.thresholds[name as keyof PerformanceThresholds];
    
    if (threshold && value > threshold) {
      logger.warn(LOG_CATEGORIES.PERFORMANCE, `Performance threshold exceeded: ${name}`, {
        value: Math.round(value),
        threshold,
        exceedBy: Math.round(value - threshold)
      });
    }
  }

  /**
   * Log navigation metrics summary
   */
  private logNavigationMetrics(): void {
    const navMetrics = this.metrics.filter(m => m.category === 'navigation');
    
    if (navMetrics.length > 0) {
      logger.info(LOG_CATEGORIES.PERFORMANCE, 'Navigation timing summary', {
        metrics: navMetrics.reduce((acc, m) => {
          acc[m.name] = Math.round(m.value);
          return acc;
        }, {} as Record<string, number>)
      });
    }
  }

  /**
   * Get all recorded metrics
   */
  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by category
   */
  public getMetricsByCategory(category: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.category === category);
  }

  /**
   * Clear all metrics
   */
  public clearMetrics(): void {
    this.metrics = [];
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;

