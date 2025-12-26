/**
 * useProduct Hook - Fetch a single product with caching
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { normalizeFirestoreData } from '../utils/firestoreHelpers';
import type { Product } from '../types';
import logger, { LOG_CATEGORIES } from '../utils/logger';
import { CACHE } from '../config/constants';

interface UseProductResult {
  product: Product | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Cache for individual products (uses centralized CACHE config)
const productCache = new Map<string, { data: Product; timestamp: number }>();
const CACHE_DURATION = CACHE.TTL_PRODUCTS;

export function useProduct(productId: string | null | undefined): UseProductResult {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (productId) {
      productCache.delete(productId);
      setLoading(true);
      setError(null);
    }
  }, [productId]);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      setLoading(false);
      return;
    }

    // Check cache first
    const cached = productCache.get(productId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setProduct(cached.data);
      setLoading(false);
      logger.debug(LOG_CATEGORIES.DATA, 'Product loaded from cache', { productId });
      return;
    }

    setLoading(true);
    setError(null);

    const productRef = doc(db, 'products', productId);
    
    const unsubscribe = onSnapshot(
      productRef,
      (snapshot) => {
        try {
          if (snapshot.exists()) {
            const data = {
              id: snapshot.id,
              ...normalizeFirestoreData(snapshot.data())
            } as Product;
            
            setProduct(data);
            productCache.set(productId, { data, timestamp: Date.now() });
            logger.debug(LOG_CATEGORIES.DATA, 'Product fetched', { productId });
          } else {
            setProduct(null);
            setError('Product not found');
          }
          setLoading(false);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to load product';
          logger.error(LOG_CATEGORIES.ERROR, 'Product fetch error', { productId }, err as Error);
          setError(errorMsg);
          setLoading(false);
        }
      },
      (err) => {
        const errorMsg = err.message || 'Failed to subscribe to product';
        logger.error(LOG_CATEGORIES.ERROR, 'Product subscription error', { productId }, err);
        setError(errorMsg);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [productId]);

  return useMemo(() => ({
    product,
    loading,
    error,
    refetch
  }), [product, loading, error, refetch]);
}

export default useProduct;

