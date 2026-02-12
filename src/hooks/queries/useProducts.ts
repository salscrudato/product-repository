/**
 * Product Query Hooks
 * TanStack Query hooks for product data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateProductQueries } from '../../lib/queryClient';
import { ProductRepository } from '../../repositories';
import type { ValidatedProduct } from '../../schemas';

/**
 * Fetch all products
 */
export function useProducts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.products.lists(),
    queryFn: () => ProductRepository.getActiveProducts(),
    ...options,
  });
}

/**
 * Fetch a single product by ID
 */
export function useProduct(productId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.products.detail(productId || ''),
    queryFn: () => ProductRepository.getById(productId!),
    enabled: !!productId && (options?.enabled !== false),
    ...options,
  });
}

/**
 * Search products by name
 */
export function useProductSearch(searchTerm: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.products.list({ search: searchTerm }),
    queryFn: () => ProductRepository.searchByName(searchTerm),
    enabled: searchTerm.length > 0 && (options?.enabled !== false),
    ...options,
  });
}

/**
 * Create a new product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Omit<ValidatedProduct, 'id'>) => ProductRepository.create(data),
    onSuccess: () => {
      invalidateProductQueries();
    },
  });
}

/**
 * Update a product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ValidatedProduct> }) => 
      ProductRepository.update(id, data),
    onSuccess: (_, { id }) => {
      invalidateProductQueries(id);
    },
  });
}

/**
 * Delete a product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => ProductRepository.delete(id),
    onSuccess: () => {
      invalidateProductQueries();
    },
  });
}

