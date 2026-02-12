/**
 * Coverage Query Hooks
 * TanStack Query hooks for coverage data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { CoverageRepository } from '../../repositories';
import type { ValidatedCoverage } from '../../schemas';

/**
 * Fetch all coverages for a product
 */
export function useCoverages(productId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.coverages.byProduct(productId || ''),
    queryFn: () => CoverageRepository.getByProductId(productId!),
    enabled: !!productId && (options?.enabled !== false),
    ...options,
  });
}

/**
 * Fetch a single coverage by ID
 */
export function useCoverage(
  productId: string | undefined, 
  coverageId: string | undefined, 
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.coverages.detail(productId || '', coverageId || ''),
    queryFn: () => CoverageRepository.getById(productId!, coverageId!),
    enabled: !!productId && !!coverageId && (options?.enabled !== false),
    ...options,
  });
}

/**
 * Fetch root coverages (no parent)
 */
export function useRootCoverages(productId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...queryKeys.coverages.byProduct(productId || ''), 'root'],
    queryFn: () => CoverageRepository.getRootCoverages(productId!),
    enabled: !!productId && (options?.enabled !== false),
    ...options,
  });
}

/**
 * Fetch child coverages
 */
export function useChildCoverages(
  productId: string | undefined, 
  parentId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...queryKeys.coverages.byProduct(productId || ''), 'children', parentId],
    queryFn: () => CoverageRepository.getChildCoverages(productId!, parentId!),
    enabled: !!productId && !!parentId && (options?.enabled !== false),
    ...options,
  });
}

/**
 * Create a new coverage
 */
export function useCreateCoverage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: Omit<ValidatedCoverage, 'id'> }) => 
      CoverageRepository.create(productId, data),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coverages.byProduct(productId) });
    },
  });
}

/**
 * Update a coverage
 */
export function useUpdateCoverage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ productId, coverageId, data }: { 
      productId: string; 
      coverageId: string; 
      data: Partial<ValidatedCoverage> 
    }) => CoverageRepository.update(productId, coverageId, data),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coverages.byProduct(productId) });
    },
  });
}

/**
 * Delete a coverage
 */
export function useDeleteCoverage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ productId, coverageId }: { productId: string; coverageId: string }) => 
      CoverageRepository.delete(productId, coverageId),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coverages.byProduct(productId) });
    },
  });
}

