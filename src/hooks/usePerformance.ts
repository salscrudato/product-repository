/**
 * Performance Optimization Hooks
 * Custom hooks for optimizing component performance
 */

import { useMemo, useCallback, useRef, useEffect, DependencyList, useState } from 'react';
import logger, { LOG_CATEGORIES } from '@utils/logger';

/**
 * Hook for memoizing expensive computations with custom dependency comparison
 * @param factory - Function that computes the value
 * @param deps - Dependency array
 * @param isEqual - Custom equality function for dependencies
 * @returns Memoized value
 */
export function useMemoWithCompare<T>(
  factory: () => T,
  deps: DependencyList,
  isEqual?: (prevDeps: DependencyList, nextDeps: DependencyList) => boolean
): T {
  const ref = useRef<{ deps: DependencyList; value: T }>();

  if (!ref.current || !isEqual) {
    ref.current = { deps, value: factory() };
  } else if (!isEqual(ref.current.deps, deps)) {
    ref.current = { deps, value: factory() };
  }

  return ref.current.value;
}

/**
 * Hook for debounced values
 * @param value - Value to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for throttled values
 * @param value - Value to throttle
 * @param interval - Throttle interval in milliseconds
 * @returns Throttled value
 */
export function useThrottledValue<T>(value: T, interval: number = 300): T {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    if (now >= lastUpdateRef.current + interval) {
      lastUpdateRef.current = now;
      setThrottledValue(value);
    } else {
      const handler = setTimeout(() => {
        lastUpdateRef.current = Date.now();
        setThrottledValue(value);
      }, interval - (now - lastUpdateRef.current));

      return () => clearTimeout(handler);
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * Hook for memoizing filtered/sorted arrays
 * @param items - Array of items
 * @param filterFn - Filter function
 * @param sortFn - Sort function
 * @returns Memoized filtered and sorted array
 */
export function useFilteredAndSorted<T>(
  items: T[],
  filterFn?: (item: T) => boolean,
  sortFn?: (a: T, b: T) => number
): T[] {
  return useMemo(() => {
    let result = [...items];
    if (filterFn) {
      result = result.filter(filterFn);
    }
    if (sortFn) {
      result.sort(sortFn);
    }
    return result;
  }, [items, filterFn, sortFn]);
}

/**
 * Hook for memoizing search results
 * @param items - Array of items to search
 * @param searchQuery - Search query string
 * @param searchFields - Fields to search in
 * @returns Memoized search results
 */
export function useSearchResults<T extends Record<string, any>>(
  items: T[],
  searchQuery: string,
  searchFields: (keyof T)[]
): T[] {
  return useMemo(() => {
    if (!searchQuery.trim()) {
      return items;
    }

    const query = searchQuery.toLowerCase();
    return items.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query);
        }
        return false;
      })
    );
  }, [items, searchQuery, searchFields]);
}

/**
 * Hook for memoizing paginated data
 * @param items - Array of items
 * @param pageSize - Number of items per page
 * @param currentPage - Current page number (1-indexed)
 * @returns Object with paginated data and pagination info
 */
export function usePaginatedData<T>(
  items: T[],
  pageSize: number = 10,
  currentPage: number = 1
): {
  data: T[];
  totalPages: number;
  totalItems: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} {
  return useMemo(() => {
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      data: items.slice(startIndex, endIndex),
      totalPages,
      totalItems,
      currentPage,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    };
  }, [items, pageSize, currentPage]);
}

/**
 * Hook for memoizing grouped data
 * @param items - Array of items
 * @param groupByFn - Function to determine group key
 * @returns Memoized grouped data as Map
 */
export function useGroupedData<T, K extends string | number>(
  items: T[],
  groupByFn: (item: T) => K
): Map<K, T[]> {
  return useMemo(() => {
    const grouped = new Map<K, T[]>();
    items.forEach((item) => {
      const key = groupByFn(item);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(item);
    });
    return grouped;
  }, [items, groupByFn]);
}

/**
 * Hook for memoizing callback with dependencies
 * @param callback - Callback function
 * @param deps - Dependency array
 * @returns Memoized callback
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList
): T {
  return useCallback(callback, deps) as T;
}

import React from 'react';

/**
 * Hook for consistent error handling across components
 * @param onError - Optional callback when error occurs
 * @returns Object with error state and handler functions
 */
export function useErrorHandler(onError?: (error: Error) => void) {
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleError = useCallback((err: Error | unknown, context: string = 'Operation') => {
    const error = err instanceof Error ? err : new Error(String(err));

    logger.error(LOG_CATEGORIES.ERROR, `${context} failed`, {
      message: error.message,
      stack: error.stack
    });

    setError(error);
    if (onError) {
      onError(error);
    }
  }, [onError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeAsync = useCallback(async <T,>(
    fn: () => Promise<T>,
    context: string = 'Operation'
  ): Promise<T | null> => {
    setIsLoading(true);
    try {
      const result = await fn();
      setError(null);
      return result;
    } catch (err) {
      handleError(err, context);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  return {
    error,
    isLoading,
    handleError,
    clearError,
    executeAsync
  };
}

export default {
  useMemoWithCompare,
  useDebouncedValue,
  useThrottledValue,
  useFilteredAndSorted,
  useSearchResults,
  usePaginatedData,
  useGroupedData,
  useStableCallback,
  useErrorHandler
};

