import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Custom hook for paginated data fetching with Firebase Firestore
 * Supports both one-time fetching and real-time subscriptions
 * 
 * @param {string} collectionPath - Firestore collection path
 * @param {Object} options - Configuration options
 * @param {number} options.pageSize - Number of items per page (default: 20)
 * @param {string} options.orderByField - Field to order by (default: 'name')
 * @param {string} options.orderDirection - Order direction 'asc' or 'desc' (default: 'asc')
 * @param {boolean} options.realtime - Enable real-time updates (default: false)
 * @param {Array} options.filters - Additional query filters
 * @param {boolean} options.enabled - Enable/disable the hook (default: true)
 */
export function usePaginatedData(collectionPath, options = {}) {
  const {
    pageSize = 20,
    orderByField = 'name',
    orderDirection = 'asc',
    realtime = false,
    filters = [],
    enabled = true
  } = options;

  // State
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  // Refs for cleanup
  const unsubscribeRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Reset state when collection path or key options change
  const resetState = useCallback(() => {
    setData([]);
    setLastDoc(null);
    setHasMore(true);
    setError(null);
    setTotalCount(0);
  }, []);

  // Build query with filters
  const buildQuery = useCallback((isLoadMore = false) => {
    let q = query(
      collection(db, collectionPath),
      orderBy(orderByField, orderDirection)
    );

    // Apply additional filters
    filters.forEach(filter => {
      q = query(q, filter);
    });

    // Add pagination
    if (isLoadMore && lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    q = query(q, limit(pageSize));
    return q;
  }, [collectionPath, orderByField, orderDirection, filters, pageSize, lastDoc]);

  // Load initial data
  const loadData = useCallback(async (isLoadMore = false) => {
    if (!enabled) return;
    
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const q = buildQuery(isLoadMore);
      const snapshot = await getDocs(q);

      if (abortControllerRef.current.signal.aborted) return;

      const newData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (isLoadMore) {
        setData(prev => [...prev, ...newData]);
      } else {
        setData(newData);
      }

      // Update pagination state
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      setLastDoc(lastVisible || null);
      setHasMore(newData.length === pageSize);

      // Update total count (approximate)
      if (!isLoadMore) {
        setTotalCount(newData.length);
      } else {
        setTotalCount(prev => prev + newData.length);
      }

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error loading paginated data:', err);
        setError(err);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [enabled, buildQuery]);

  // Load more data
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await loadData(true);
  }, [hasMore, loading, loadData]);

  // Refresh data
  const refresh = useCallback(async () => {
    resetState();
    await loadData(false);
  }, [resetState, loadData]);

  // Setup real-time subscription
  const setupRealtimeSubscription = useCallback(() => {
    if (!realtime || !enabled) return;

    // Cleanup previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const q = buildQuery(false);
    
    unsubscribeRef.current = onSnapshot(
      q,
      (snapshot) => {
        const newData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setData(newData);
        
        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        setLastDoc(lastVisible || null);
        setHasMore(newData.length === pageSize);
        setTotalCount(newData.length);
        setLoading(false);
      },
      (err) => {
        console.error('Real-time subscription error:', err);
        setError(err);
        setLoading(false);
      }
    );
  }, [realtime, enabled, buildQuery, pageSize]);

  // Initial load effect
  useEffect(() => {
    if (!enabled) return;

    resetState();
    
    if (realtime) {
      setLoading(true);
      setupRealtimeSubscription();
    } else {
      loadData(false);
    }

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, realtime, collectionPath, orderByField, orderDirection, JSON.stringify(filters)]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    hasMore,
    totalCount,
    loadMore,
    refresh,
    resetState
  };
}

/**
 * Simplified hook for basic paginated products
 */
export function usePaginatedProducts(options = {}) {
  return usePaginatedData('products', {
    orderByField: 'name',
    orderDirection: 'asc',
    pageSize: 20,
    ...options
  });
}

/**
 * Hook for paginated coverages within a product
 */
export function usePaginatedCoverages(productId, options = {}) {
  return usePaginatedData(`products/${productId}/coverages`, {
    orderByField: 'coverageCode',
    orderDirection: 'asc',
    pageSize: 50,
    enabled: !!productId,
    ...options
  });
}

export default usePaginatedData;
