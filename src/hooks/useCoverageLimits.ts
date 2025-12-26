/**
 * DEPRECATED: Use useCoverageData instead
 * This file is kept for backward compatibility only
 *
 * @deprecated Use useCoverageData hook from './useCoverageData'
 */

import { useCoverageData } from './useCoverageData';
import { CoverageLimit } from '../types';

interface UseCoverageLimitsResult {
  limits: CoverageLimit[];
  loading: boolean;
  error: string | null;
  addLimit: (limit: Omit<CoverageLimit, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateLimit: (limitId: string, updates: Partial<CoverageLimit>) => Promise<void>;
  deleteLimit: (limitId: string) => Promise<void>;
  setDefaultLimit: (limitId: string) => Promise<void>;
}

/**
 * @deprecated Use useCoverageData instead
 */
export function useCoverageLimits(
  productId: string | undefined,
  coverageId: string | undefined
): UseCoverageLimitsResult {
  const { limits, loading, error, addLimit, updateLimit, deleteLimit, setDefaultLimit } =
    useCoverageData(productId, coverageId);

  return {
    limits,
    loading,
    error,
    addLimit,
    updateLimit,
    deleteLimit,
    setDefaultLimit,
  };
}

