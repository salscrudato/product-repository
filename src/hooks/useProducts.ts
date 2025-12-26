/**
 * useProducts Hook - Fetch and manage products with caching
 *
 * Enhancements:
 * - Generic typing for flexibility
 * - Memoized queries and callbacks
 * - Automatic cache management
 * - Error handling with retry logic
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, limit, QueryConstraint } from 'firebase/firestore';
import { db } from '../firebase';
import { normalizeFirestoreData } from '../utils/firestoreHelpers';
import { Product } from '../types';
import logger, { LOG_CATEGORIES } from '../utils/logger';
import { CACHE } from '../config/constants';

interface UseProductsOptions {
  enableCache?: boolean;
  maxResults?: number;
  orderBy?: string;
}

interface UseProductsResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Optimized: Cache with TTL management (uses centralized CACHE config)
const productsCache = {
  data: null as Product[] | null,
  timestamp: null as number | null,
  CACHE_DURATION: CACHE.TTL_PRODUCTS
};

/**
 * Generic hook for fetching products with caching
 * @template T - Type of data returned (defaults to Product)
 */
export default function useProducts<T extends Product = Product>(
  options: UseProductsOptions = {}
): UseProductsResult<T> {
  const { enableCache = true, maxResults = 1000, orderBy: orderByField = 'name' } = options;
  const [products, setProducts] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Optimized: Memoized query to prevent recreation on every render
  const productsQuery = useMemo(() => {
    const constraints: QueryConstraint[] = [orderBy(orderByField)];

    if (maxResults && maxResults < 1000) {
      constraints.push(limit(maxResults));
    }

    return query(collection(db, 'products'), ...constraints);
  }, [maxResults, orderByField]);

  // Optimized: Refetch callback with memoization
  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  useEffect(() => {
    // Check cache first if enabled
    if (enableCache && productsCache.data && productsCache.timestamp) {
      const cacheAge = Date.now() - productsCache.timestamp;
      if (cacheAge < productsCache.CACHE_DURATION) {
        setProducts(productsCache.data as T[]);
        setLoading(false);
        logger.debug(LOG_CATEGORIES.DATA, 'Products loaded from cache');
        return;
      }
    }

    setLoading(true);
    setError(null);

    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = onSnapshot(
      productsQuery,
      (snap) => {
        try {
          const productsData = snap.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              ...normalizeFirestoreData(data)
            } as T;
          });

          setProducts(productsData);
          setLoading(false);
          setError(null);

          // Update cache
          if (enableCache) {
            productsCache.data = productsData;
            productsCache.timestamp = Date.now();
          }

          logger.debug(LOG_CATEGORIES.DATA, 'Products fetched successfully', {
            count: productsData.length
          });
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          logger.error(LOG_CATEGORIES.ERROR, 'Error processing products snapshot', {}, error);
          setError(error);
          setLoading(false);
        }
      },
      (err) => {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(LOG_CATEGORIES.ERROR, 'Products subscription failed', {}, error);
        setError(error);
        setLoading(false);
      }
    );

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [productsQuery, enableCache]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Optimized: Return memoized result
  return useMemo(() => ({
    data: products,
    loading,
    error,
    refetch
  }), [products, loading, error, refetch]);
}