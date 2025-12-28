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
export { useCoveragePackages } from './useCoveragePackages';

// Coverage Copilot hooks
export { default as useCoverageDraft } from './useCoverageDraft';

// Firebase hooks
export { default as useFirebaseConnection } from './useFirebaseConnection';

// Memoization hooks
export { default as useAdvancedMemo } from './useAdvancedMemo';
