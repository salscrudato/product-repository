/**
 * DEPRECATED: Use useCoverageData instead
 * This file is kept for backward compatibility only
 *
 * @deprecated Use useCoverageData hook from './useCoverageData'
 */

import { useCoverageData } from './useCoverageData';
import { CoverageDeductible } from '../types';

interface UseCoverageDeductiblesResult {
  deductibles: CoverageDeductible[];
  loading: boolean;
  error: string | null;
  addDeductible: (deductible: Omit<CoverageDeductible, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateDeductible: (deductibleId: string, updates: Partial<CoverageDeductible>) => Promise<void>;
  deleteDeductible: (deductibleId: string) => Promise<void>;
  setDefaultDeductible: (deductibleId: string) => Promise<void>;
}

/**
 * @deprecated Use useCoverageData instead
 */
export function useCoverageDeductibles(
  productId: string | undefined,
  coverageId: string | undefined
): UseCoverageDeductiblesResult {
  const { deductibles, loading, error, addDeductible, updateDeductible, deleteDeductible, setDefaultDeductible } =
    useCoverageData(productId, coverageId);

  return {
    deductibles,
    loading,
    error,
    addDeductible,
    updateDeductible,
    deleteDeductible,
    setDefaultDeductible,
  };
}

