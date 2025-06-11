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

// Enhanced bundle size analyzer with detailed metrics
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV !== 'development') return;

  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));

  // Analyze JavaScript bundles
  const jsAnalysis = scripts.map(script => {
    const url = new URL(script.src);
    const filename = url.pathname.split('/').pop();
    return {
      filename,
      url: script.src,
      estimated: script.src.length * 100 // Rough estimate
    };
  });

  // Analyze CSS bundles
  const cssAnalysis = stylesheets.map(link => {
    const url = new URL(link.href);
    const filename = url.pathname.split('/').pop();
    return {
      filename,
      url: link.href,
      estimated: link.href.length * 50 // CSS typically smaller
    };
  });

  const totalJS = jsAnalysis.reduce((sum, item) => sum + item.estimated, 0);
  const totalCSS = cssAnalysis.reduce((sum, item) => sum + item.estimated, 0);
  const totalSize = totalJS + totalCSS;

  console.group('📦 Bundle Analysis');
  console.log(`Total estimated size: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log(`JavaScript: ${(totalJS / 1024).toFixed(2)} KB (${jsAnalysis.length} files)`);
  console.log(`CSS: ${(totalCSS / 1024).toFixed(2)} KB (${cssAnalysis.length} files)`);

  if (jsAnalysis.length > 0) {
    console.log('JavaScript bundles:', jsAnalysis);
  }
  if (cssAnalysis.length > 0) {
    console.log('CSS bundles:', cssAnalysis);
  }
  console.groupEnd();

  // Performance recommendations
  if (totalSize > 1024 * 1024) { // > 1MB
    console.warn('⚠️ Large bundle detected. Consider code splitting or tree shaking.');
  }
  if (jsAnalysis.length > 10) {
    console.warn('⚠️ Many JS chunks detected. Consider bundle consolidation.');
  }
};

// Resource monitoring utilities
export const monitorResourceUsage = () => {
  if (!performanceMonitor.isEnabled) return;

  // Monitor network requests
  if (window.PerformanceObserver) {
    try {
      const networkObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 1000) { // Slow requests > 1s
            console.warn(`🐌 Slow network request: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
          }
        });
      });
      networkObserver.observe({ entryTypes: ['navigation', 'resource'] });
    } catch (e) {
      console.log('Network monitoring not supported');
    }
  }

  // Monitor DOM mutations (expensive operations)
  if (window.MutationObserver) {
    let mutationCount = 0;
    const mutationObserver = new MutationObserver((mutations) => {
      mutationCount += mutations.length;

      // Log if too many mutations in short time
      if (mutationCount > 100) {
        console.warn(`🔄 High DOM mutation rate: ${mutationCount} mutations`);
        mutationCount = 0;
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    // Reset counter periodically
    setInterval(() => {
      mutationCount = 0;
    }, 5000);
  }
};

// Web Vitals monitoring
export const measureWebVitals = () => {
  if (!performanceMonitor.isEnabled) return;

  // Largest Contentful Paint
  if (window.PerformanceObserver) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log(`🎨 LCP: ${lastEntry.startTime.toFixed(2)}ms`);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.log('LCP monitoring not supported');
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          console.log(`⚡ FID: ${entry.processingStart - entry.startTime}ms`);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.log('FID monitoring not supported');
    }
  }
};

// Initialize performance monitoring
export const initPerformanceMonitoring = () => {
  if (process.env.NODE_ENV === 'development') {
    performanceMonitor.observeLongTasks();
    performanceMonitor.observeLayoutShifts();
    monitorResourceUsage();
    measureWebVitals();

    // Enhanced bundle analysis
    setTimeout(() => {
      analyzeBundleSize();
    }, 2000);

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

// ============================================================================
// AGENTIC AI UTILITIES
// ============================================================================

/**
 * Agent execution tracker for monitoring agentic AI operations
 */
class AgentExecutionTracker {
  constructor() {
    this.executions = new Map();
    this.isEnabled = true;
  }

  // Start tracking an agent execution
  startExecution(sessionId, goal) {
    if (!this.isEnabled) return;

    this.executions.set(sessionId, {
      sessionId,
      goal,
      startTime: performance.now(),
      steps: [],
      status: 'running',
      currentStep: null
    });

    console.log(`🤖 Agent started: ${goal} (Session: ${sessionId})`);
  }

  // Add a step to the execution
  addStep(sessionId, step) {
    if (!this.isEnabled) return;

    const execution = this.executions.get(sessionId);
    if (!execution) return;

    const stepWithTiming = {
      ...step,
      timestamp: performance.now(),
      duration: step.startTime ? performance.now() - step.startTime : 0
    };

    execution.steps.push(stepWithTiming);
    execution.currentStep = stepWithTiming;

    console.log(`🔧 Agent step: ${step.action || step.thought}`, stepWithTiming);
  }

  // Complete an execution
  completeExecution(sessionId, result) {
    if (!this.isEnabled) return;

    const execution = this.executions.get(sessionId);
    if (!execution) return;

    execution.status = 'completed';
    execution.endTime = performance.now();
    execution.totalDuration = execution.endTime - execution.startTime;
    execution.result = result;

    console.log(`✅ Agent completed: ${execution.goal}`, {
      duration: `${execution.totalDuration.toFixed(2)}ms`,
      steps: execution.steps.length,
      result
    });
  }

  // Mark execution as failed
  failExecution(sessionId, error) {
    if (!this.isEnabled) return;

    const execution = this.executions.get(sessionId);
    if (!execution) return;

    execution.status = 'failed';
    execution.endTime = performance.now();
    execution.totalDuration = execution.endTime - execution.startTime;
    execution.error = error;

    console.error(`❌ Agent failed: ${execution.goal}`, {
      duration: `${execution.totalDuration.toFixed(2)}ms`,
      steps: execution.steps.length,
      error
    });
  }

  // Get execution details
  getExecution(sessionId) {
    return this.executions.get(sessionId);
  }

  // Get all executions
  getAllExecutions() {
    return Array.from(this.executions.values());
  }

  // Clear old executions (keep last 10)
  cleanup() {
    const executions = Array.from(this.executions.entries());
    if (executions.length > 10) {
      const toKeep = executions.slice(-10);
      this.executions.clear();
      toKeep.forEach(([id, execution]) => {
        this.executions.set(id, execution);
      });
    }
  }
}

// Create singleton instance
const agentTracker = new AgentExecutionTracker();

// React hook for agent execution tracking
export const useAgentTracker = () => {
  return {
    startExecution: agentTracker.startExecution.bind(agentTracker),
    addStep: agentTracker.addStep.bind(agentTracker),
    completeExecution: agentTracker.completeExecution.bind(agentTracker),
    failExecution: agentTracker.failExecution.bind(agentTracker),
    getExecution: agentTracker.getExecution.bind(agentTracker),
    getAllExecutions: agentTracker.getAllExecutions.bind(agentTracker)
  };
};

// Agent performance monitoring utilities
export const measureAgentStep = async (stepName, stepFunction) => {
  const startTime = performance.now();

  try {
    const result = await stepFunction();
    const duration = performance.now() - startTime;

    console.log(`⚡ Agent step "${stepName}" completed in ${duration.toFixed(2)}ms`);

    return {
      success: true,
      result,
      duration,
      stepName
    };
  } catch (error) {
    const duration = performance.now() - startTime;

    console.error(`❌ Agent step "${stepName}" failed after ${duration.toFixed(2)}ms:`, error);

    return {
      success: false,
      error,
      duration,
      stepName
    };
  }
};

export { agentTracker };
