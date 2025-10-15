/**
 * React Query Configuration
 * Centralized configuration for data fetching and caching
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Create and configure React Query client
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      
      // Cache time: Unused data is garbage collected after 10 minutes
      gcTime: 10 * 60 * 1000,
      
      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch on window focus in production
      refetchOnWindowFocus: process.env.NODE_ENV === 'production',
      
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      retryDelay: 1000,
    },
  },
});

/**
 * Query keys for consistent cache management
 */
export const queryKeys = {
  // Products
  products: ['products'] as const,
  product: (id: string) => ['products', id] as const,
  productSummary: (id: string) => ['products', id, 'summary'] as const,
  
  // Coverages
  coverages: (productId: string) => ['products', productId, 'coverages'] as const,
  coverage: (productId: string, coverageId: string) => 
    ['products', productId, 'coverages', coverageId] as const,
  
  // Sub-coverages
  subCoverages: (productId: string, coverageId: string) => 
    ['products', productId, 'coverages', coverageId, 'subCoverages'] as const,
  
  // Forms
  forms: (productId: string) => ['products', productId, 'forms'] as const,
  form: (formId: string) => ['forms', formId] as const,
  
  // Pricing
  pricing: (productId: string) => ['products', productId, 'pricing'] as const,
  
  // Rules
  rules: (productId: string) => ['products', productId, 'rules'] as const,
  
  // States
  states: (productId: string) => ['products', productId, 'states'] as const,
  
  // Tables
  tables: (productId: string) => ['products', productId, 'tables'] as const,
  
  // Chat
  chat: (productId: string) => ['products', productId, 'chat'] as const,
  
  // Claims
  claims: ['claims'] as const,
  claim: (id: string) => ['claims', id] as const,
  
  // Tasks
  tasks: ['tasks'] as const,
  task: (id: string) => ['tasks', id] as const,
};

/**
 * Invalidate all product-related queries
 */
export const invalidateProductQueries = (productId?: string) => {
  if (productId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.product(productId) });
  } else {
    queryClient.invalidateQueries({ queryKey: queryKeys.products });
  }
};

/**
 * Prefetch product data
 */
export const prefetchProduct = async (productId: string) => {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.product(productId),
    staleTime: 5 * 60 * 1000,
  });
};

