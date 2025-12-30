/**
 * Deductible Options Service
 * 
 * Firebase operations for coverage-level deductible option sets.
 * Mirrors the structure of limitOptionsService.ts for consistency.
 * 
 * Database Structure:
 * - products/{productId}/coverages/{coverageId}/deductibleOptionSets/{setId}
 * - products/{productId}/coverages/{coverageId}/deductibleOptionSets/{setId}/options/{optionId}
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  CoverageDeductibleOptionSet,
  CoverageDeductibleOption,
  DeductibleStructure,
  DeductibleOptionSetValidationResult,
  DeductibleValidationError,
  DeductibleValidationWarning,
  PROPERTY_DEDUCTIBLE_TEMPLATES,
} from '../types/deductibleOptions';

// ============================================================================
// Collection Path Helpers
// ============================================================================

const getDeductibleOptionSetsPath = (productId: string, coverageId: string) =>
  `products/${productId}/coverages/${coverageId}/deductibleOptionSets`;

const getDeductibleOptionsPath = (productId: string, coverageId: string, setId: string) =>
  `products/${productId}/coverages/${coverageId}/deductibleOptionSets/${setId}/options`;

// ============================================================================
// Utility Helpers
// ============================================================================

/**
 * Remove undefined values from an object (Firebase doesn't accept undefined)
 */
function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      result[key as keyof T] = obj[key];
    }
  }
  return result;
}

// ============================================================================
// Option Set CRUD Operations
// ============================================================================

/**
 * Fetch all deductible option sets for a coverage
 */
export const fetchDeductibleOptionSets = async (
  productId: string,
  coverageId: string
): Promise<CoverageDeductibleOptionSet[]> => {
  const path = getDeductibleOptionSetsPath(productId, coverageId);
  const snapshot = await getDocs(collection(db, path));
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as CoverageDeductibleOptionSet[];
};

/**
 * Fetch a single deductible option set
 */
export const fetchDeductibleOptionSet = async (
  productId: string,
  coverageId: string,
  setId: string
): Promise<CoverageDeductibleOptionSet | null> => {
  const path = getDeductibleOptionSetsPath(productId, coverageId);
  const docRef = doc(db, path, setId);
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) return null;
  
  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as CoverageDeductibleOptionSet;
};

/**
 * Create a new deductible option set
 */
export const createDeductibleOptionSet = async (
  productId: string,
  coverageId: string,
  data: Omit<CoverageDeductibleOptionSet, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const path = getDeductibleOptionSetsPath(productId, coverageId);
  const cleanedData = removeUndefined(data);
  const docRef = await addDoc(collection(db, path), {
    ...cleanedData,
    productId,
    coverageId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

/**
 * Update a deductible option set
 */
export const updateDeductibleOptionSet = async (
  productId: string,
  coverageId: string,
  setId: string,
  data: Partial<CoverageDeductibleOptionSet>
): Promise<void> => {
  const path = getDeductibleOptionSetsPath(productId, coverageId);
  const docRef = doc(db, path, setId);
  const cleanedData = removeUndefined(data);

  await updateDoc(docRef, {
    ...cleanedData,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete a deductible option set and all its options
 */
export const deleteDeductibleOptionSet = async (
  productId: string,
  coverageId: string,
  setId: string
): Promise<void> => {
  const batch = writeBatch(db);
  
  // Delete all options first
  const optionsPath = getDeductibleOptionsPath(productId, coverageId, setId);
  const optionsSnapshot = await getDocs(collection(db, optionsPath));
  optionsSnapshot.docs.forEach(optionDoc => {
    batch.delete(optionDoc.ref);
  });
  
  // Delete the option set
  const setPath = getDeductibleOptionSetsPath(productId, coverageId);
  batch.delete(doc(db, setPath, setId));
  
  await batch.commit();
};

// ============================================================================
// Individual Option CRUD Operations
// ============================================================================

/**
 * Fetch all options for a deductible option set
 */
export const fetchDeductibleOptions = async (
  productId: string,
  coverageId: string,
  setId: string
): Promise<CoverageDeductibleOption[]> => {
  const path = getDeductibleOptionsPath(productId, coverageId, setId);
  const q = query(collection(db, path), orderBy('displayOrder', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as CoverageDeductibleOption[];
};

/**
 * Create a new deductible option
 */
export const createDeductibleOption = async (
  productId: string,
  coverageId: string,
  setId: string,
  data: Omit<CoverageDeductibleOption, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const path = getDeductibleOptionsPath(productId, coverageId, setId);
  const cleanedData = removeUndefined(data);
  const docRef = await addDoc(collection(db, path), {
    ...cleanedData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

/**
 * Update a deductible option
 */
export const updateDeductibleOption = async (
  productId: string,
  coverageId: string,
  setId: string,
  optionId: string,
  data: Partial<CoverageDeductibleOption>
): Promise<void> => {
  const path = getDeductibleOptionsPath(productId, coverageId, setId);
  const docRef = doc(db, path, optionId);
  const cleanedData = removeUndefined(data);

  await updateDoc(docRef, {
    ...cleanedData,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete a deductible option
 */
export const deleteDeductibleOption = async (
  productId: string,
  coverageId: string,
  setId: string,
  optionId: string
): Promise<void> => {
  const path = getDeductibleOptionsPath(productId, coverageId, setId);
  await deleteDoc(doc(db, path, optionId));
};

/**
 * Batch update multiple options (for reordering)
 */
export const batchUpdateDeductibleOptions = async (
  productId: string,
  coverageId: string,
  setId: string,
  updates: Array<{ id: string; data: Partial<CoverageDeductibleOption> }>
): Promise<void> => {
  const batch = writeBatch(db);
  const path = getDeductibleOptionsPath(productId, coverageId, setId);

  updates.forEach(({ id, data }) => {
    const docRef = doc(db, path, id);
    batch.update(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
};

// ============================================================================
// Template Operations
// ============================================================================

/**
 * Create option set with default options from template
 */
export const createDeductibleOptionSetWithDefaults = async (
  productId: string,
  coverageId: string,
  structure: DeductibleStructure,
  name: string = 'Primary Deductible'
): Promise<{ setId: string; optionIds: string[] }> => {
  // Create the option set
  const setId = await createDeductibleOptionSet(productId, coverageId, {
    productId,
    coverageId,
    structure,
    name,
    isRequired: true,
    selectionMode: 'single',
  });

  // Get template options based on structure
  const templateOptions = getTemplateOptionsForStructure(structure);

  // Create options
  const optionIds: string[] = [];
  for (const template of templateOptions) {
    const optionId = await createDeductibleOption(productId, coverageId, setId, {
      ...template,
      isEnabled: true,
    } as Omit<CoverageDeductibleOption, 'id' | 'createdAt' | 'updatedAt'>);
    optionIds.push(optionId);
  }

  return { setId, optionIds };
};

/**
 * Get template options for a structure type
 */
const getTemplateOptionsForStructure = (
  structure: DeductibleStructure
): Partial<CoverageDeductibleOption>[] => {
  switch (structure) {
    case 'flat':
      return PROPERTY_DEDUCTIBLE_TEMPLATES;
    case 'percentMinMax':
      return [
        { label: '1% ($1K min)', structure: 'percentMinMax', percentage: 1, basis: 'TIV', minimumAmount: 1000, maximumAmount: 100000, isDefault: false, isEnabled: true, displayOrder: 0 },
        { label: '2% ($2.5K min)', structure: 'percentMinMax', percentage: 2, basis: 'TIV', minimumAmount: 2500, maximumAmount: 250000, isDefault: true, isEnabled: true, displayOrder: 1 },
        { label: '5% ($5K min)', structure: 'percentMinMax', percentage: 5, basis: 'TIV', minimumAmount: 5000, maximumAmount: 500000, isDefault: false, isEnabled: true, displayOrder: 2 },
      ];
    case 'waitingPeriod':
      return [
        { label: '24 Hours', structure: 'waitingPeriod', duration: 24, unit: 'hours', isDefault: false, isEnabled: true, displayOrder: 0 },
        { label: '48 Hours', structure: 'waitingPeriod', duration: 48, unit: 'hours', isDefault: true, isEnabled: true, displayOrder: 1 },
        { label: '72 Hours', structure: 'waitingPeriod', duration: 72, unit: 'hours', isDefault: false, isEnabled: true, displayOrder: 2 },
        { label: '7 Days', structure: 'waitingPeriod', duration: 7, unit: 'days', isDefault: false, isEnabled: true, displayOrder: 3 },
      ];
    default:
      return PROPERTY_DEDUCTIBLE_TEMPLATES;
  }
};

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate a deductible option set and its options
 */
export const validateDeductibleOptionSet = (
  optionSet: CoverageDeductibleOptionSet,
  options: CoverageDeductibleOption[]
): DeductibleOptionSetValidationResult => {
  const errors: DeductibleValidationError[] = [];
  const warnings: DeductibleValidationWarning[] = [];

  // Check for at least one option
  if (options.length === 0) {
    errors.push({
      field: 'options',
      message: 'At least one deductible option is required',
      code: 'NO_OPTIONS',
    });
  }

  // Check for enabled options
  const enabledOptions = options.filter(o => o.isEnabled);
  if (enabledOptions.length === 0 && options.length > 0) {
    errors.push({
      field: 'options',
      message: 'At least one option must be enabled',
      code: 'NO_ENABLED_OPTIONS',
    });
  }

  // Check for default option
  const defaultOptions = options.filter(o => o.isDefault && o.isEnabled);
  if (defaultOptions.length === 0 && enabledOptions.length > 0) {
    warnings.push({
      field: 'options',
      message: 'No default option selected. First enabled option will be used.',
      code: 'NO_DEFAULT',
    });
  }

  if (defaultOptions.length > 1 && optionSet.selectionMode === 'single') {
    errors.push({
      field: 'options',
      message: 'Only one default option allowed for single-select mode',
      code: 'MULTIPLE_DEFAULTS',
    });
  }

  // Validate individual options
  options.forEach((option, index) => {
    if (!option.label || option.label.trim() === '') {
      errors.push({
        field: 'label',
        optionId: option.id,
        message: `Option ${index + 1} is missing a label`,
        code: 'MISSING_LABEL',
      });
    }

    // Structure-specific validation
    if (option.structure === 'flat' && (option as any).amount < 0) {
      errors.push({
        field: 'amount',
        optionId: option.id,
        message: `Option "${option.label}" has invalid amount`,
        code: 'INVALID_AMOUNT',
      });
    }

    if (option.structure === 'percentMinMax') {
      const pctOption = option as any;
      if (pctOption.minimumAmount > pctOption.maximumAmount) {
        errors.push({
          field: 'minMax',
          optionId: option.id,
          message: `Option "${option.label}" has minimum greater than maximum`,
          code: 'MIN_GREATER_THAN_MAX',
        });
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format deductible option for display
 */
export const formatDeductibleOptionDisplay = (option: CoverageDeductibleOption): string => {
  if (option.displayValue) return option.displayValue;

  switch (option.structure) {
    case 'flat':
      return `$${(option as any).amount.toLocaleString()}`;
    case 'percentage':
      return `${(option as any).percentage}%`;
    case 'percentMinMax': {
      const pct = option as any;
      return `${pct.percentage}% ($${pct.minimumAmount.toLocaleString()} min / $${pct.maximumAmount.toLocaleString()} max)`;
    }
    case 'waitingPeriod': {
      const wp = option as any;
      return `${wp.duration} ${wp.unit}`;
    }
    default:
      return option.label;
  }
};

/**
 * Get structure display name
 */
export const getDeductibleStructureDisplayName = (structure: DeductibleStructure): string => {
  const names: Record<DeductibleStructure, string> = {
    flat: 'Flat Dollar Amount',
    percentage: 'Percentage',
    percentMinMax: 'Percentage with Min/Max',
    waitingPeriod: 'Waiting Period',
    perilSpecific: 'Peril-Specific',
    disappearing: 'Disappearing',
    franchise: 'Franchise',
    aggregate: 'Aggregate',
    custom: 'Custom',
  };
  return names[structure] || structure;
};

