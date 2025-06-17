// src/hooks/useAdvancedMemo.js
/**
 * Advanced memoization hooks for React performance optimization
 * Provides intelligent caching, deep comparison, and selective updates
 */

import { useRef, useMemo, useCallback, useEffect, useState } from 'react';

// Deep comparison utility
function deepEqual(a, b) {
  if (a === b) return true;
  
  if (a == null || b == null) return a === b;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a !== 'object') return a === b;
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}

// Advanced memoization with deep comparison
export function useDeepMemo(factory, deps) {
  const ref = useRef();
  
  if (!ref.current || !deepEqual(deps, ref.current.deps)) {
    ref.current = {
      deps,
      value: factory()
    };
  }
  
  return ref.current.value;
}

// Memoization with TTL (Time To Live)
export function useTTLMemo(factory, deps, ttl = 5000) {
  const ref = useRef();
  
  const now = Date.now();
  
  if (!ref.current || 
      now - ref.current.timestamp > ttl ||
      !deepEqual(deps, ref.current.deps)) {
    ref.current = {
      deps,
      value: factory(),
      timestamp: now
    };
  }
  
  return ref.current.value;
}

// Selective memoization - only recompute when specific keys change
export function useSelectiveMemo(factory, deps, selectKeys = []) {
  const selectedDeps = useMemo(() => {
    if (!deps || typeof deps !== 'object') return deps;
    
    if (selectKeys.length === 0) return deps;
    
    const selected = {};
    for (const key of selectKeys) {
      if (key in deps) {
        selected[key] = deps[key];
      }
    }
    return selected;
  }, [deps, selectKeys]);
  
  return useDeepMemo(factory, selectedDeps);
}

// Async memoization with loading states
export function useAsyncMemo(asyncFactory, deps, initialValue = null) {
  const [state, setState] = useState({
    value: initialValue,
    loading: false,
    error: null
  });
  
  const depsRef = useRef();
  const abortControllerRef = useRef();
  
  useEffect(() => {
    if (deepEqual(deps, depsRef.current)) return;
    
    depsRef.current = deps;
    
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    Promise.resolve(asyncFactory(signal))
      .then(value => {
        if (!signal.aborted) {
          setState({ value, loading: false, error: null });
        }
      })
      .catch(error => {
        if (!signal.aborted) {
          setState(prev => ({ ...prev, loading: false, error }));
        }
      });
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [deps, asyncFactory]);
  
  return state;
}

// Debounced memoization
export function useDebouncedMemo(factory, deps, delay = 300) {
  const [debouncedDeps, setDebouncedDeps] = useState(deps);
  const timeoutRef = useRef();
  
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setDebouncedDeps(deps);
    }, delay);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [deps, delay]);
  
  return useDeepMemo(factory, debouncedDeps);
}

// Cached callback with intelligent invalidation
export function useAdvancedCallback(callback, deps, options = {}) {
  const {
    maxAge = 60000, // 1 minute
    maxCacheSize = 100,
    keyGenerator = (...args) => JSON.stringify(args)
  } = options;
  
  const cacheRef = useRef(new Map());
  const depsRef = useRef();
  
  // Clear cache when dependencies change
  if (!deepEqual(deps, depsRef.current)) {
    cacheRef.current.clear();
    depsRef.current = deps;
  }
  
  return useCallback((...args) => {
    const cache = cacheRef.current;
    const key = keyGenerator(...args);
    const now = Date.now();
    
    // Check if cached result exists and is still valid
    if (cache.has(key)) {
      const cached = cache.get(key);
      if (now - cached.timestamp < maxAge) {
        return cached.result;
      } else {
        cache.delete(key);
      }
    }
    
    // Execute callback and cache result
    const result = callback(...args);
    
    // Manage cache size
    if (cache.size >= maxCacheSize) {
      // Remove oldest entries
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = Math.ceil(maxCacheSize * 0.2); // Remove 20%
      
      for (let i = 0; i < toRemove; i++) {
        cache.delete(entries[i][0]);
      }
    }
    
    cache.set(key, { result, timestamp: now });
    return result;
  }, deps);
}

// Memoization with dependency tracking
export function useTrackedMemo(factory, deps) {
  const [, forceUpdate] = useState({});
  const trackedDepsRef = useRef(new Map());
  const resultRef = useRef();
  
  // Track which dependencies actually affect the result
  const trackDependency = useCallback((key, value) => {
    const tracked = trackedDepsRef.current;
    
    if (!tracked.has(key) || !deepEqual(tracked.get(key), value)) {
      tracked.set(key, value);
      return true; // Dependency changed
    }
    
    return false; // Dependency unchanged
  }, []);
  
  // Check if any tracked dependencies changed
  const hasChanges = useMemo(() => {
    if (!deps || typeof deps !== 'object') {
      return trackDependency('primitive', deps);
    }
    
    let changed = false;
    for (const [key, value] of Object.entries(deps)) {
      if (trackDependency(key, value)) {
        changed = true;
      }
    }
    
    return changed;
  }, [deps, trackDependency]);
  
  if (hasChanges || !resultRef.current) {
    resultRef.current = factory();
  }
  
  return resultRef.current;
}

// Conditional memoization
export function useConditionalMemo(factory, deps, condition) {
  const unconditionalResult = useMemo(factory, deps);
  const conditionalRef = useRef();
  
  if (condition) {
    conditionalRef.current = unconditionalResult;
  }
  
  return condition ? unconditionalResult : conditionalRef.current;
}

// Memoization with performance monitoring
export function usePerformanceMemo(factory, deps, label = 'memo') {
  return useMemo(() => {
    const startTime = performance.now();
    const result = factory();
    const endTime = performance.now();
    
    if (process.env.NODE_ENV === 'development') {
      const duration = endTime - startTime;
      if (duration > 10) { // Log if computation takes more than 10ms
        console.log(`🐌 Slow memo computation: ${label} took ${duration.toFixed(2)}ms`);
      }
    }
    
    return result;
  }, deps);
}

// Batch memoization for multiple related computations
export function useBatchMemo(factories, deps) {
  return useMemo(() => {
    const results = {};
    
    for (const [key, factory] of Object.entries(factories)) {
      results[key] = factory();
    }
    
    return results;
  }, deps);
}

// Memoization with size limits
export function useSizeLimitedMemo(factory, deps, maxSize = 1024 * 1024) { // 1MB default
  const resultRef = useRef();
  const sizeRef = useRef(0);
  
  const result = useMemo(() => {
    const newResult = factory();
    const size = JSON.stringify(newResult).length * 2; // Rough size estimate
    
    if (size > maxSize) {
      console.warn(`Memo result exceeds size limit: ${size} bytes > ${maxSize} bytes`);
      return resultRef.current || newResult; // Return previous result if available
    }
    
    sizeRef.current = size;
    return newResult;
  }, deps);
  
  resultRef.current = result;
  return result;
}

// Memoization with automatic cleanup
export function useAutoCleanupMemo(factory, deps, cleanupFn) {
  const resultRef = useRef();
  
  const result = useMemo(() => {
    // Cleanup previous result
    if (resultRef.current && cleanupFn) {
      cleanupFn(resultRef.current);
    }
    
    return factory();
  }, deps);
  
  resultRef.current = result;
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (resultRef.current && cleanupFn) {
        cleanupFn(resultRef.current);
      }
    };
  }, [cleanupFn]);
  
  return result;
}

// Lazy memoization - only compute when accessed
export function useLazyMemo(factory, deps) {
  const resultRef = useRef();
  const depsRef = useRef();
  const computedRef = useRef(false);
  
  // Reset computed flag when dependencies change
  if (!deepEqual(deps, depsRef.current)) {
    computedRef.current = false;
    depsRef.current = deps;
  }
  
  return {
    get value() {
      if (!computedRef.current) {
        resultRef.current = factory();
        computedRef.current = true;
      }
      return resultRef.current;
    },
    
    get isComputed() {
      return computedRef.current;
    },
    
    invalidate() {
      computedRef.current = false;
    }
  };
}

// Export all hooks as a collection
export const AdvancedMemoHooks = {
  useDeepMemo,
  useTTLMemo,
  useSelectiveMemo,
  useAsyncMemo,
  useDebouncedMemo,
  useAdvancedCallback,
  useTrackedMemo,
  useConditionalMemo,
  usePerformanceMemo,
  useBatchMemo,
  useSizeLimitedMemo,
  useAutoCleanupMemo,
  useLazyMemo
};
