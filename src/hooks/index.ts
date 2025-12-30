/**
 * Hooks Index
 * Centralized exports for all custom hooks
 */

// Data hooks
export { default as useCoverages } from './useCoverages';
export { default as useProducts } from './useProducts';
export { default as useProduct } from './useProduct';
export { default as useForms } from './useForms';
export { useCoverageData } from './useCoverageData';
export { useCoverageFormCounts } from './useCoverageFormCounts';
export { useCoveragePackages, validatePackage, calculatePackagePremium, generatePackageRecommendations } from './useCoveragePackages';

// Coverage Copilot hooks
export { default as useCoverageDraft } from './useCoverageDraft';
export { useAutoDraftCoverage } from './useAutoDraftCoverage';

// Limit & Deductible Option hooks
export { useLimitOptionSets } from './useLimitOptionSets';
export { useDeductibleOptionSets } from './useDeductibleOptionSets';

// Firebase hooks
export { default as useFirebaseConnection } from './useFirebaseConnection';

// Memoization hooks
export { default as useAdvancedMemo, useDeepMemo } from './useAdvancedMemo';

// Utility hooks
export { default as useDebounce } from './useDebounce';
