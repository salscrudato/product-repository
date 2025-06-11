// src/hooks/useProducts.js
import { useState, useEffect, useRef, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

// Cache for products data to prevent unnecessary re-fetches
const productsCache = {
  data: null,
  timestamp: null,
  CACHE_DURATION: 5 * 60 * 1000 // 5 minutes
};

export default function useProducts(options = {}) {
  const { enableCache = true, maxResults = 1000 } = options;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  // Memoized query to prevent recreation on every render
  const productsQuery = useMemo(() => {
    let q = collection(db, 'products');

    // Add ordering for consistent results
    q = query(q, orderBy('name'));

    // Add limit if specified
    if (maxResults && maxResults < 1000) {
      q = query(q, limit(maxResults));
    }

    return q;
  }, [maxResults]);

  useEffect(() => {
    // Check cache first if enabled
    if (enableCache && productsCache.data && productsCache.timestamp) {
      const cacheAge = Date.now() - productsCache.timestamp;
      if (cacheAge < productsCache.CACHE_DURATION) {
        setProducts(productsCache.data);
        setLoading(false);
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
          const productsData = snap.docs.map(d => ({
            id: d.id,
            ...d.data()
          }));

          setProducts(productsData);
          setLoading(false);

          // Update cache
          if (enableCache) {
            productsCache.data = productsData;
            productsCache.timestamp = Date.now();
          }
        } catch (err) {
          console.error('Error processing products snapshot:', err);
          setError(err);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Products subscription failed:', err);
        setError(err);
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

  return { products, loading, error };
}