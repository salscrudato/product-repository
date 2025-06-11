// src/utils/memoryManager.js
/**
 * Advanced memory management utilities for the Product Hub App
 * Handles memory leaks, cleanup, and optimization
 */

class MemoryManager {
  constructor() {
    this.subscriptions = new Set();
    this.timers = new Set();
    this.observers = new Set();
    this.eventListeners = new Map();
    this.memoryThreshold = 100 * 1024 * 1024; // 100MB threshold
    this.isMonitoring = process.env.NODE_ENV === 'development';
    this.cleanupCallbacks = new Set();
    
    if (this.isMonitoring) {
      this.startMemoryMonitoring();
    }
  }

  // Register cleanup callbacks
  registerCleanup(callback) {
    this.cleanupCallbacks.add(callback);
    return () => this.cleanupCallbacks.delete(callback);
  }

  // Track subscriptions (Firebase, etc.)
  trackSubscription(unsubscribe) {
    this.subscriptions.add(unsubscribe);
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      this.subscriptions.delete(unsubscribe);
    };
  }

  // Track timers
  trackTimer(timerId) {
    this.timers.add(timerId);
    return () => {
      clearTimeout(timerId);
      clearInterval(timerId);
      this.timers.delete(timerId);
    };
  }

  // Track observers
  trackObserver(observer) {
    this.observers.add(observer);
    return () => {
      if (observer && typeof observer.disconnect === 'function') {
        observer.disconnect();
      }
      this.observers.delete(observer);
    };
  }

  // Track event listeners
  trackEventListener(element, event, handler, options) {
    const key = `${element.constructor.name}_${event}`;
    if (!this.eventListeners.has(key)) {
      this.eventListeners.set(key, new Set());
    }
    
    const listeners = this.eventListeners.get(key);
    const listenerInfo = { element, event, handler, options };
    listeners.add(listenerInfo);
    
    element.addEventListener(event, handler, options);
    
    return () => {
      element.removeEventListener(event, handler, options);
      listeners.delete(listenerInfo);
      if (listeners.size === 0) {
        this.eventListeners.delete(key);
      }
    };
  }

  // Memory monitoring
  startMemoryMonitoring() {
    if (!performance.memory) {
      console.log('Memory monitoring not available');
      return;
    }

    const checkMemory = () => {
      const memory = performance.memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const totalMB = memory.totalJSHeapSize / 1024 / 1024;
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
      
      if (usedMB > this.memoryThreshold / 1024 / 1024) {
        console.warn(`🧠 High memory usage detected: ${usedMB.toFixed(2)}MB`);
        this.suggestCleanup();
      }
      
      // Log memory stats periodically
      if (this.isMonitoring) {
        console.log(`🧠 Memory: ${usedMB.toFixed(2)}MB / ${totalMB.toFixed(2)}MB (${limitMB.toFixed(2)}MB limit)`);
      }
    };

    // Check memory every 30 seconds
    const memoryCheckInterval = setInterval(checkMemory, 30000);
    this.trackTimer(memoryCheckInterval);
    
    // Initial check
    checkMemory();
  }

  // Suggest cleanup actions
  suggestCleanup() {
    console.group('🧹 Memory Cleanup Suggestions');
    
    if (this.subscriptions.size > 10) {
      console.warn(`${this.subscriptions.size} active subscriptions - consider cleanup`);
    }
    
    if (this.timers.size > 20) {
      console.warn(`${this.timers.size} active timers - consider cleanup`);
    }
    
    if (this.observers.size > 10) {
      console.warn(`${this.observers.size} active observers - consider cleanup`);
    }
    
    const totalListeners = Array.from(this.eventListeners.values())
      .reduce((sum, set) => sum + set.size, 0);
    if (totalListeners > 50) {
      console.warn(`${totalListeners} active event listeners - consider cleanup`);
    }
    
    console.groupEnd();
    
    // Trigger automatic cleanup if available
    this.performAutomaticCleanup();
  }

  // Perform automatic cleanup
  performAutomaticCleanup() {
    let cleanedCount = 0;
    
    // Run registered cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
        cleanedCount++;
      } catch (error) {
        console.error('Cleanup callback failed:', error);
      }
    });
    
    // Force garbage collection if available (Chrome DevTools)
    if (window.gc && typeof window.gc === 'function') {
      window.gc();
      console.log('🗑️ Forced garbage collection');
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Automatic cleanup completed: ${cleanedCount} callbacks executed`);
    }
  }

  // Clean up all tracked resources
  cleanup() {
    console.log('🧹 Starting memory manager cleanup...');
    
    // Cleanup subscriptions
    this.subscriptions.forEach(unsubscribe => {
      try {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      } catch (error) {
        console.error('Subscription cleanup failed:', error);
      }
    });
    this.subscriptions.clear();
    
    // Cleanup timers
    this.timers.forEach(timerId => {
      try {
        clearTimeout(timerId);
        clearInterval(timerId);
      } catch (error) {
        console.error('Timer cleanup failed:', error);
      }
    });
    this.timers.clear();
    
    // Cleanup observers
    this.observers.forEach(observer => {
      try {
        if (observer && typeof observer.disconnect === 'function') {
          observer.disconnect();
        }
      } catch (error) {
        console.error('Observer cleanup failed:', error);
      }
    });
    this.observers.clear();
    
    // Cleanup event listeners
    this.eventListeners.forEach(listeners => {
      listeners.forEach(({ element, event, handler, options }) => {
        try {
          element.removeEventListener(event, handler, options);
        } catch (error) {
          console.error('Event listener cleanup failed:', error);
        }
      });
    });
    this.eventListeners.clear();
    
    // Run cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Cleanup callback failed:', error);
      }
    });
    this.cleanupCallbacks.clear();
    
    console.log('✅ Memory manager cleanup completed');
  }

  // Get memory statistics
  getMemoryStats() {
    const stats = {
      subscriptions: this.subscriptions.size,
      timers: this.timers.size,
      observers: this.observers.size,
      eventListeners: Array.from(this.eventListeners.values())
        .reduce((sum, set) => sum + set.size, 0),
      cleanupCallbacks: this.cleanupCallbacks.size
    };
    
    if (performance.memory) {
      const memory = performance.memory;
      stats.memory = {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
      };
    }
    
    return stats;
  }
}

// Create singleton instance
const memoryManager = new MemoryManager();

// React hook for memory management
export const useMemoryManager = () => {
  const registerCleanup = memoryManager.registerCleanup.bind(memoryManager);
  const trackSubscription = memoryManager.trackSubscription.bind(memoryManager);
  const trackTimer = memoryManager.trackTimer.bind(memoryManager);
  const trackObserver = memoryManager.trackObserver.bind(memoryManager);
  const trackEventListener = memoryManager.trackEventListener.bind(memoryManager);
  
  return {
    registerCleanup,
    trackSubscription,
    trackTimer,
    trackObserver,
    trackEventListener,
    getStats: () => memoryManager.getMemoryStats()
  };
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    memoryManager.cleanup();
  });
  
  // Cleanup on visibility change (tab switching)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      memoryManager.performAutomaticCleanup();
    }
  });
}

export default memoryManager;
