/**
 * Hooks Index
 * Centralized exports for all custom hooks
 */

// Data hooks
export { default as useCoverages } from './useCoverages';
export { default as useProducts } from './useProducts';
export { default as useProduct } from './useProduct';
export { default as useForms } from './useForms';
export { default as useRules } from './useRules';
export { useCoverageData } from './useCoverageData';
// Deprecated: Use useCoverageData instead
export { useCoverageLimits } from './useCoverageLimits';
export { useCoverageDeductibles } from './useCoverageDeductibles';
export { default as useCoverageFormCounts } from './useCoverageFormCounts';
export { default as useCoveragePackages } from './useCoveragePackages';
export { default as useCoverageVersions } from './useCoverageVersions';

// Firebase hooks
export { default as useFirebaseConnection } from './useFirebaseConnection';

// Auth hooks
export { default as useRole } from './useRole';

// Performance hooks
export * from './usePerformance';
export { default as useAdvancedMemo } from './useAdvancedMemo';

