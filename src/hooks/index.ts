/**
 * Hooks Index
 * Centralized exports for all custom hooks
 */

// Data hooks
export { default as useCoverages } from './useCoverages';
export { default as useProducts } from './useProducts';
export { default as useRules } from './useRules';
export { default as useCoverageLimits } from './useCoverageLimits';
export { default as useCoverageDeductibles } from './useCoverageDeductibles';
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

