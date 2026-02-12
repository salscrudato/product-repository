/**
 * TanStack Query Client Configuration
 * Centralized query client with optimized defaults
 */

import { QueryClient } from '@tanstack/react-query';
import logger, { LOG_CATEGORIES } from '../utils/logger';

// Query key factory for type-safe keys
export const queryKeys = {
  // Products
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
  },
  
  // Coverages
  coverages: {
    all: ['coverages'] as const,
    byProduct: (productId: string) => [...queryKeys.coverages.all, 'product', productId] as const,
    detail: (productId: string, coverageId: string) => 
      [...queryKeys.coverages.byProduct(productId), coverageId] as const,
  },
  
  // Forms
  forms: {
    all: ['forms'] as const,
    lists: () => [...queryKeys.forms.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.forms.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.forms.all, 'detail', id] as const,
    byProduct: (productId: string) => [...queryKeys.forms.all, 'product', productId] as const,
  },
  
  // Rules
  rules: {
    all: ['rules'] as const,
    byProduct: (productId: string) => [...queryKeys.rules.all, 'product', productId] as const,
    byCoverage: (productId: string, coverageId: string) => 
      [...queryKeys.rules.byProduct(productId), 'coverage', coverageId] as const,
  },
  
  // Pricing
  pricing: {
    all: ['pricing'] as const,
    steps: (productId: string) => [...queryKeys.pricing.all, 'steps', productId] as const,
    tables: (productId: string) => [...queryKeys.pricing.all, 'tables', productId] as const,
  },
  
  // Tasks
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.tasks.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.tasks.all, 'detail', id] as const,
  },
  
  // Data Dictionary
  dataDictionary: {
    all: ['dataDictionary'] as const,
    byProduct: (productId: string) => [...queryKeys.dataDictionary.all, 'product', productId] as const,
  },
  
  // User/Auth
  user: {
    current: ['user', 'current'] as const,
    role: ['user', 'role'] as const,
  },
} as const;

// Create query client with optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 5 minutes for most data
      staleTime: 5 * 60 * 1000,
      
      // Cache time: 30 minutes
      gcTime: 30 * 60 * 1000,
      
      // Retry configuration
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && error.message.includes('permission')) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch configuration
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      
      // Network mode
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      
      // Log errors
      onError: (error) => {
        logger.error(LOG_CATEGORIES.DATA, 'Mutation error', {}, error as Error);
      },
    },
  },
});

// Utility to invalidate all product-related queries
export function invalidateProductQueries(productId?: string) {
  if (productId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(productId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.coverages.byProduct(productId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.rules.byProduct(productId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.pricing.steps(productId) });
  } else {
    queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
  }
}

export default queryClient;

