// src/hooks/useOptimizedData.js
/**
 * Optimized Data Hook
 * Integrates all caching services for maximum performance
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDeepMemo, useAdvancedCallback } from './useAdvancedMemo';
import apiCacheService from '../services/apiCacheService';
import dataPrefetchingService from '../services/dataPrefetchingService';
import firebaseOptimized from '../services/firebaseOptimized';

// Main optimized data hook
export const useOptimizedData = (category, identifier, options = {}) => {
  const {
    params = {},
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus = false,
    refetchOnReconnect = true,
    retry = 3,
    retryDelay = 1000,
    onSuccess,
    onError,
    select,
    placeholderData,
    keepPreviousData = false
  } = options;

  const [state, setState] = useState({
    data: placeholderData || null,
    loading: true,
    error: null,
    isFetching: false,
    isStale: false,
    lastUpdated: null
  });

  const abortControllerRef = useRef();
  const retryCountRef = useRef(0);
  const lastParamsRef = useRef();

  // Memoized fetch function
  const fetchData = useAdvancedCallback(
    async (signal) => {
      try {
        setState(prev => ({ ...prev, isFetching: true, error: null }));

        // Use cached request with intelligent strategies
        const result = await apiCacheService.cachedRequest(
          category,
          identifier,
          async ({ signal: requestSignal }) => {
            // Fetch from Firebase with optimization
            if (identifier === 'all' || identifier === '*') {
              return await firebaseOptimized.getCollection(category, {
                ...params,
                useCache: true,
                enableQueryOptimization: true
              });
            } else {
              return await firebaseOptimized.getDocument(category, identifier, true);
            }
          },
          params,
          { signal }
        );

        // Apply data selector if provided
        const finalData = select ? select(result) : result;

        setState(prev => ({
          ...prev,
          data: finalData,
          loading: false,
          isFetching: false,
          error: null,
          isStale: false,
          lastUpdated: Date.now()
        }));

        // Reset retry count on success
        retryCountRef.current = 0;

        // Call success callback
        onSuccess?.(finalData);

        return finalData;

      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }

        console.error(`Data fetch failed for ${category}:${identifier}:`, error);

        // Retry logic
        if (retryCountRef.current < retry) {
          retryCountRef.current++;
          const delay = retryDelay * Math.pow(2, retryCountRef.current - 1);
          
          setTimeout(() => {
            if (!signal?.aborted) {
              fetchData(signal);
            }
          }, delay);
          
          return;
        }

        setState(prev => ({
          ...prev,
          loading: false,
          isFetching: false,
          error,
          isStale: true
        }));

        onError?.(error);
        throw error;
      }
    },
    [category, identifier, params, select, onSuccess, onError, retry, retryDelay],
    { maxAge: 60000, maxCacheSize: 50 }
  );

  // Check if parameters changed
  const paramsChanged = useDeepMemo(() => {
    const changed = JSON.stringify(params) !== JSON.stringify(lastParamsRef.current);
    lastParamsRef.current = params;
    return changed;
  }, [params]);

  // Main effect for data fetching
  useEffect(() => {
    if (!enabled) return;

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Reset state if parameters changed and not keeping previous data
    if (paramsChanged && !keepPreviousData) {
      setState(prev => ({
        ...prev,
        data: placeholderData || null,
        loading: true,
        error: null
      }));
    }

    fetchData(signal);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, category, identifier, paramsChanged, fetchData, keepPreviousData, placeholderData]);

  // Window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (state.lastUpdated && Date.now() - state.lastUpdated > staleTime) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, staleTime, state.lastUpdated, fetchData]);

  // Network reconnect refetch
  useEffect(() => {
    if (!refetchOnReconnect) return;

    const handleOnline = () => {
      if (state.error || (state.lastUpdated && Date.now() - state.lastUpdated > staleTime)) {
        fetchData();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refetchOnReconnect, staleTime, state.error, state.lastUpdated, fetchData]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    return fetchData(abortControllerRef.current.signal);
  }, [fetchData]);

  // Invalidate cache
  const invalidate = useCallback(() => {
    apiCacheService.invalidate(category, identifier, params);
  }, [category, identifier, params]);

  // Prefetch related data
  const prefetch = useCallback((prefetchIdentifier, prefetchParams = {}) => {
    apiCacheService.preload(
      category,
      prefetchIdentifier,
      async () => {
        if (prefetchIdentifier === 'all') {
          return await firebaseOptimized.getCollection(category, prefetchParams);
        } else {
          return await firebaseOptimized.getDocument(category, prefetchIdentifier);
        }
      },
      prefetchParams
    );
  }, [category]);

  return {
    ...state,
    refetch,
    invalidate,
    prefetch,
    isLoading: state.loading,
    isError: !!state.error,
    isSuccess: !state.loading && !state.error && state.data !== null,
    isIdle: !state.loading && !state.isFetching && state.data === null
  };
};

// Specialized hooks for common use cases
export const useOptimizedProducts = (options = {}) => {
  return useOptimizedData('products', 'all', {
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    ...options
  });
};

export const useOptimizedCoverages = (productId, options = {}) => {
  return useOptimizedData('coverages', 'all', {
    params: { productId },
    enabled: !!productId,
    staleTime: 20 * 60 * 1000, // 20 minutes
    ...options
  });
};

export const useOptimizedForms = (options = {}) => {
  return useOptimizedData('forms', 'all', {
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 2 * 60 * 60 * 1000, // 2 hours
    ...options
  });
};

export const useOptimizedTasks = (options = {}) => {
  return useOptimizedData('tasks', 'all', {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    ...options
  });
};

export const useOptimizedNews = (options = {}) => {
  return useOptimizedData('news', 'all', {
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: true,
    ...options
  });
};

// Note: Batch data hook removed due to React hooks rules complexity
// Use individual hooks instead for better reliability

// Infinite query hook for paginated data
export const useOptimizedInfiniteData = (category, options = {}) => {
  const {
    pageSize = 20,
    getNextPageParam = (lastPage, pages) => pages.length,
    ...restOptions
  } = options;

  const [pages, setPages] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const baseQuery = useOptimizedData(category, 'all', {
    params: { limit: pageSize, offset: 0 },
    ...restOptions,
    onSuccess: (data) => {
      setPages([data]);
      setHasNextPage(data.length === pageSize);
      restOptions.onSuccess?.(data);
    }
  });

  const fetchNextPage = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;

    setIsFetchingNextPage(true);
    
    try {
      const nextPageParam = getNextPageParam(pages[pages.length - 1], pages);
      const nextPageData = await apiCacheService.cachedRequest(
        category,
        'all',
        async () => {
          return await firebaseOptimized.getCollection(category, {
            limit: pageSize,
            offset: nextPageParam * pageSize
          });
        },
        { limit: pageSize, offset: nextPageParam * pageSize }
      );

      setPages(prev => [...prev, nextPageData]);
      setHasNextPage(nextPageData.length === pageSize);
    } catch (error) {
      console.error('Failed to fetch next page:', error);
    } finally {
      setIsFetchingNextPage(false);
    }
  }, [category, pageSize, pages, hasNextPage, isFetchingNextPage, getNextPageParam]);

  return {
    ...baseQuery,
    data: pages.flat(),
    pages,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  };
};
