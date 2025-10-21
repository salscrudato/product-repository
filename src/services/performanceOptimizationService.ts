/**
 * Performance Optimization Service
 * Provides utilities for monitoring and optimizing application performance
 * Targets professional-grade performance metrics (Google/Apple/Tesla standards)
 */

import logger, { LOG_CATEGORIES } from '../utils/logger';

export interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  renderTime: number;
  memoryUsage: number;
}

export interface ComponentMetrics {
  componentName: string;
  renderTime: number;
  updateTime: number;
  rerenderCount: number;
  propsChanges: number;
}

class PerformanceOptimizationService {
  private metrics: Map<string, ComponentMetrics> = new Map();
  private performanceObserver: PerformanceObserver | null = null;

  constructor() {
    this.initializePerformanceMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            logger.info(LOG_CATEGORIES.PERFORMANCE, `Performance entry: ${entry.name}`, {
              duration: entry.duration,
              startTime: entry.startTime
            });
          }
        });

        this.performanceObserver.observe({
          entryTypes: ['measure', 'navigation', 'resource', 'paint', 'largest-contentful-paint']
        });
      } catch (error) {
        logger.warn(LOG_CATEGORIES.PERFORMANCE, 'Performance observer initialization failed', {}, error as Error);
      }
    }
  }

  /**
   * Measure component render time
   */
  measureComponentRender(componentName: string, callback: () => void): void {
    const startMark = `${componentName}-start`;
    const endMark = `${componentName}-end`;
    const measureName = `${componentName}-render`;

    performance.mark(startMark);
    callback();
    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);

    const measure = performance.getEntriesByName(measureName)[0];
    const renderTime = measure.duration;

    this.updateComponentMetrics(componentName, { renderTime });

    if (renderTime > 16.67) { // 60fps threshold
      logger.warn(LOG_CATEGORIES.PERFORMANCE, `Slow render detected: ${componentName}`, {
        renderTime: `${renderTime.toFixed(2)}ms`
      });
    }
  }

  /**
   * Measure async operation
   */
  async measureAsync<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      logger.info(LOG_CATEGORIES.PERFORMANCE, `Async operation completed: ${operationName}`, {
        duration: `${duration.toFixed(2)}ms`
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error(LOG_CATEGORIES.PERFORMANCE, `Async operation failed: ${operationName}`, 
        { duration: `${duration.toFixed(2)}ms` }, error as Error);
      throw error;
    }
  }

  /**
   * Get Web Vitals metrics
   */
  getWebVitals(): Partial<PerformanceMetrics> {
    const metrics: Partial<PerformanceMetrics> = {};

    // First Contentful Paint
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcp) metrics.fcp = fcp.startTime;

    // Largest Contentful Paint
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      metrics.lcp = lcpEntries[lcpEntries.length - 1].startTime;
    }

    // Time to First Byte
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationTiming) {
      metrics.ttfb = navigationTiming.responseStart - navigationTiming.requestStart;
    }

    return metrics;
  }

  /**
   * Get memory usage (if available)
   */
  getMemoryUsage(): number | null {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1048576; // Convert to MB
    }
    return null;
  }

  /**
   * Debounce function for performance optimization
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;

    return function executedFunction(...args: Parameters<T>) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };

      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function for performance optimization
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return function executedFunction(...args: Parameters<T>) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Request idle callback wrapper
   */
  scheduleIdleTask(callback: () => void, timeout: number = 2000): number {
    if ('requestIdleCallback' in window) {
      return (window as any).requestIdleCallback(callback, { timeout });
    } else {
      return window.setTimeout(callback, timeout);
    }
  }

  /**
   * Cancel idle task
   */
  cancelIdleTask(id: number): void {
    if ('cancelIdleCallback' in window) {
      (window as any).cancelIdleCallback(id);
    } else {
      window.clearTimeout(id);
    }
  }

  /**
   * Update component metrics
   */
  private updateComponentMetrics(
    componentName: string,
    updates: Partial<ComponentMetrics>
  ): void {
    const existing = this.metrics.get(componentName) || {
      componentName,
      renderTime: 0,
      updateTime: 0,
      rerenderCount: 0,
      propsChanges: 0
    };

    this.metrics.set(componentName, {
      ...existing,
      ...updates
    });
  }

  /**
   * Get component metrics
   */
  getComponentMetrics(componentName: string): ComponentMetrics | undefined {
    return this.metrics.get(componentName);
  }

  /**
   * Get all component metrics
   */
  getAllComponentMetrics(): ComponentMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): string {
    const vitals = this.getWebVitals();
    const memory = this.getMemoryUsage();
    const components = this.getAllComponentMetrics();

    let report = '=== Performance Report ===\n\n';
    report += 'Web Vitals:\n';
    report += `  FCP: ${vitals.fcp?.toFixed(2) || 'N/A'}ms\n`;
    report += `  LCP: ${vitals.lcp?.toFixed(2) || 'N/A'}ms\n`;
    report += `  TTFB: ${vitals.ttfb?.toFixed(2) || 'N/A'}ms\n`;
    report += `  Memory: ${memory?.toFixed(2) || 'N/A'}MB\n\n`;

    report += 'Component Metrics:\n';
    components.forEach(comp => {
      report += `  ${comp.componentName}:\n`;
      report += `    Render Time: ${comp.renderTime.toFixed(2)}ms\n`;
      report += `    Rerenders: ${comp.rerenderCount}\n`;
    });

    return report;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

export default new PerformanceOptimizationService();

