/**
 * Performance Monitor
 * Tracks operation timing, metrics, and performance bottlenecks
 */

import logger, { LOG_CATEGORIES } from './logger';

/**
 * Performance metric
 */
export interface PerformanceMetric {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  category: string;
  metadata?: Record<string, any>;
}

/**
 * Performance statistics
 */
export interface PerformanceStats {
  name: string;
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  p99Duration: number;
}

/**
 * Performance monitor for tracking operation timing
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private activeTimers: Map<string, number> = new Map();
  private maxMetricsPerName: number = 1000;

  /**
   * Start timing an operation
   */
  start(name: string): string {
    const timerId = `${name}-${Date.now()}-${Math.random()}`;
    this.activeTimers.set(timerId, Date.now());
    return timerId;
  }

  /**
   * End timing an operation
   */
  end(
    timerId: string,
    name: string,
    category: string = 'GENERAL',
    metadata?: Record<string, any>
  ): PerformanceMetric | null {
    const startTime = this.activeTimers.get(timerId);
    if (!startTime) {
      logger.warn(LOG_CATEGORIES.PERFORMANCE, 'Timer not found', { timerId, name });
      return null;
    }

    this.activeTimers.delete(timerId);
    const endTime = Date.now();
    const duration = endTime - startTime;

    const metric: PerformanceMetric = {
      name,
      duration,
      startTime,
      endTime,
      category,
      ...(metadata !== undefined && { metadata })
    };

    // Store metric
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name)!;
    metrics.push(metric);

    // Keep only recent metrics to avoid memory bloat
    if (metrics.length > this.maxMetricsPerName) {
      metrics.shift();
    }

    // Log slow operations
    if (duration > 1000) {
      logger.warn(LOG_CATEGORIES.PERFORMANCE, `Slow operation: ${name}`, {
        duration,
        category,
        metadata
      });
    }

    return metric;
  }

  /**
   * Measure operation with automatic timing
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    category: string = 'GENERAL',
    metadata?: Record<string, any>
  ): Promise<T> {
    const timerId = this.start(name);
    try {
      const result = await fn();
      this.end(timerId, name, category, metadata);
      return result;
    } catch (error) {
      this.end(timerId, name, category, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Measure synchronous operation
   */
  measureSync<T>(
    name: string,
    fn: () => T,
    category: string = 'GENERAL',
    metadata?: Record<string, any>
  ): T {
    const timerId = this.start(name);
    try {
      const result = fn();
      this.end(timerId, name, category, metadata);
      return result;
    } catch (error) {
      this.end(timerId, name, category, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Get statistics for a metric name
   */
  getStats(name: string): PerformanceStats | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const totalDuration = durations.reduce((a, b) => a + b, 0);

    return {
      name,
      count: metrics.length,
      totalDuration,
      avgDuration: totalDuration / metrics.length,
      minDuration: durations[0] ?? 0,
      maxDuration: durations[durations.length - 1] ?? 0,
      p95Duration: durations[Math.floor(durations.length * 0.95)] ?? 0,
      p99Duration: durations[Math.floor(durations.length * 0.99)] ?? 0
    };
  }

  /**
   * Get all statistics
   */
  getAllStats(): PerformanceStats[] {
    const stats: PerformanceStats[] = [];
    this.metrics.forEach((_, name) => {
      const stat = this.getStats(name);
      if (stat) {
        stats.push(stat);
      }
    });
    return stats;
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics.clear();
    this.activeTimers.clear();
  }

  /**
   * Get all metrics
   */
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.get(name) || [];
    }

    const allMetrics: PerformanceMetric[] = [];
    this.metrics.forEach(metrics => {
      allMetrics.push(...metrics);
    });
    return allMetrics;
  }

  /**
   * Log performance report
   */
  logReport(): void {
    const stats = this.getAllStats();
    logger.info(LOG_CATEGORIES.PERFORMANCE, 'Performance Report', {
      metricsCount: stats.length,
      stats: stats.map(s => ({
        name: s.name,
        count: s.count,
        avgDuration: Math.round(s.avgDuration),
        maxDuration: s.maxDuration,
        p95Duration: Math.round(s.p95Duration)
      }))
    });
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator for measuring function performance
 */
export function Measure(category: string = 'GENERAL') {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const name = `${target.constructor.name}.${propertyKey}`;
      return performanceMonitor.measure(name, () => originalMethod.apply(this, args), category);
    };

    return descriptor;
  };
}

