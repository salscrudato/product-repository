/**
 * Advanced Memoization Hook
 * Simplified version containing only actively used functionality
 */

import { useRef } from 'react';

/**
 * Deep equality comparison for objects and arrays
 */
function deepEqual(a: any, b: any): boolean {
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

/**
 * Advanced memoization with deep comparison
 * Only recomputes when dependencies have deeply changed (not just reference equality)
 * 
 * @param factory - Function that computes the memoized value
 * @param deps - Dependencies to watch for changes
 * @returns Memoized value
 * 
 * @example
 * const expensiveValue = useDeepMemo(() => {
 *   return computeExpensiveValue(data);
 * }, data);
 */
export function useDeepMemo<T>(factory: () => T, deps: any): T {
  const ref = useRef<{ deps: any; value: T }>();
  
  if (!ref.current || !deepEqual(deps, ref.current.deps)) {
    ref.current = {
      deps,
      value: factory()
    };
  }
  
  return ref.current.value;
}

export default useDeepMemo;
