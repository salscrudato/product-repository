/**
 * Query Hooks Index
 * Centralized exports for all TanStack Query hooks
 */

// Product hooks
export {
  useProducts,
  useProduct,
  useProductSearch,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from './useProducts';

// Coverage hooks
export {
  useCoverages,
  useCoverage,
  useRootCoverages,
  useChildCoverages,
  useCreateCoverage,
  useUpdateCoverage,
  useDeleteCoverage,
} from './useCoverages';

// Re-export query client utilities
export { queryKeys, queryClient, invalidateProductQueries } from '../../lib/queryClient';

