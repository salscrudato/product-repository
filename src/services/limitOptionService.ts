/**
 * Limit Option Service
 * 
 * Firestore service for managing CoverageLimitOptionSets and CoverageLimitOptions.
 * Includes backward compatibility adapter for legacy /limits documents.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  CoverageLimitOptionSet,
  CoverageLimitOption,
  LimitStructure,
  LegacyMigrationResult,
  CoverageLimit,
  LimitOptionValue,
  SingleLimitValue,
  OccAggLimitValue,
  ClaimAggLimitValue,
  SplitLimitValue,
  SplitLimitComponent
} from '../types';

// ============================================================================
// Path Helpers
// ============================================================================

const getOptionSetsPath = (productId: string, coverageId: string) =>
  `products/${productId}/coverages/${coverageId}/limitOptionSets`;

const getOptionsPath = (productId: string, coverageId: string, setId: string) =>
  `${getOptionSetsPath(productId, coverageId)}/${setId}/options`;

const getLegacyLimitsPath = (productId: string, coverageId: string) =>
  `products/${productId}/coverages/${coverageId}/limits`;

// ============================================================================
// Option Set CRUD
// ============================================================================

/**
 * Get all limit option sets for a coverage
 */
export async function getLimitOptionSets(
  productId: string,
  coverageId: string
): Promise<CoverageLimitOptionSet[]> {
  const path = getOptionSetsPath(productId, coverageId);
  const snapshot = await getDocs(collection(db, path));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as CoverageLimitOptionSet));
}

/**
 * Get a single limit option set with its options
 */
export async function getLimitOptionSetWithOptions(
  productId: string,
  coverageId: string,
  setId: string
): Promise<{ optionSet: CoverageLimitOptionSet; options: CoverageLimitOption[] } | null> {
  const setPath = `${getOptionSetsPath(productId, coverageId)}/${setId}`;
  const setDoc = await getDoc(doc(db, setPath));
  
  if (!setDoc.exists()) return null;
  
  const optionSet = { id: setDoc.id, ...setDoc.data() } as CoverageLimitOptionSet;
  const optionsPath = getOptionsPath(productId, coverageId, setId);
  const optionsSnap = await getDocs(query(collection(db, optionsPath), orderBy('displayOrder')));
  const options = optionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CoverageLimitOption));
  
  return { optionSet, options };
}

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

/**
 * Create or update a limit option set
 */
export async function upsertLimitOptionSet(
  productId: string,
  coverageId: string,
  optionSet: Partial<CoverageLimitOptionSet>
): Promise<string> {
  const path = getOptionSetsPath(productId, coverageId);
  const now = Timestamp.now();

  // Clean undefined values
  const cleanedSet = removeUndefined(optionSet);

  if (optionSet.id) {
    const docRef = doc(db, path, optionSet.id);
    await updateDoc(docRef, {
      ...cleanedSet,
      updatedAt: now
    });
    return optionSet.id;
  } else {
    const docRef = await addDoc(collection(db, path), {
      ...cleanedSet,
      productId,
      coverageId,
      createdAt: now,
      updatedAt: now
    });
    return docRef.id;
  }
}

/**
 * Delete a limit option set and all its options
 */
export async function deleteLimitOptionSet(
  productId: string,
  coverageId: string,
  setId: string
): Promise<void> {
  const batch = writeBatch(db);
  
  // Delete all options first
  const optionsPath = getOptionsPath(productId, coverageId, setId);
  const optionsSnap = await getDocs(collection(db, optionsPath));
  optionsSnap.docs.forEach(optDoc => {
    batch.delete(doc(db, optionsPath, optDoc.id));
  });
  
  // Delete the set
  const setPath = `${getOptionSetsPath(productId, coverageId)}/${setId}`;
  batch.delete(doc(db, setPath));
  
  await batch.commit();
}

// ============================================================================
// Option CRUD
// ============================================================================

/**
 * Get all options for an option set
 */
export async function getLimitOptions(
  productId: string,
  coverageId: string,
  setId: string
): Promise<CoverageLimitOption[]> {
  const path = getOptionsPath(productId, coverageId, setId);
  const snapshot = await getDocs(query(collection(db, path), orderBy('displayOrder')));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CoverageLimitOption));
}

/**
 * Create or update a limit option
 */
export async function upsertLimitOption(
  productId: string,
  coverageId: string,
  setId: string,
  option: Partial<CoverageLimitOption>
): Promise<string> {
  const path = getOptionsPath(productId, coverageId, setId);
  const now = Timestamp.now();

  // Clean undefined values
  const cleanedOption = removeUndefined(option);

  if (option.id) {
    const docRef = doc(db, path, option.id);
    await updateDoc(docRef, { ...cleanedOption, updatedAt: now });
    return option.id;
  } else {
    const docRef = await addDoc(collection(db, path), {
      ...cleanedOption,
      createdAt: now,
      updatedAt: now
    });
    return docRef.id;
  }
}

/**
 * Delete a limit option
 */
export async function deleteLimitOption(
  productId: string,
  coverageId: string,
  setId: string,
  optionId: string
): Promise<void> {
  const path = getOptionsPath(productId, coverageId, setId);
  await deleteDoc(doc(db, path, optionId));
}

/**
 * Set a single option as default (clears default on all others)
 */
export async function setDefaultOption(
  productId: string,
  coverageId: string,
  setId: string,
  optionId: string
): Promise<void> {
  const options = await getLimitOptions(productId, coverageId, setId);
  const batch = writeBatch(db);
  const path = getOptionsPath(productId, coverageId, setId);

  options.forEach(opt => {
    const shouldBeDefault = opt.id === optionId;
    if (opt.isDefault !== shouldBeDefault) {
      batch.update(doc(db, path, opt.id), {
        isDefault: shouldBeDefault,
        updatedAt: Timestamp.now()
      });
    }
  });

  await batch.commit();
}

/**
 * Reorder options by updating displayOrder
 */
export async function reorderOptions(
  productId: string,
  coverageId: string,
  setId: string,
  orderedIds: string[]
): Promise<void> {
  const batch = writeBatch(db);
  const path = getOptionsPath(productId, coverageId, setId);
  const now = Timestamp.now();

  orderedIds.forEach((id, index) => {
    batch.update(doc(db, path, id), { displayOrder: index, updatedAt: now });
  });

  await batch.commit();
}

// ============================================================================
// Legacy Migration Adapter
// ============================================================================

/**
 * Infer limit structure from legacy limits
 */
function inferStructureFromLegacy(limits: CoverageLimit[]): LimitStructure {
  if (limits.length === 0) return 'single';

  // Check for split limits based on displayValue pattern (e.g., "100/300/100")
  const hasSplitDisplay = limits.some(l =>
    l.displayValue && /^\d+\/\d+\/\d+$/.test(l.displayValue.replace(/[$,\s]/g, ''))
  );
  if (hasSplitDisplay || limits.some(l => l.limitType === 'split')) {
    return 'split';
  }

  // Check for occ+agg pair
  const hasOccurrence = limits.some(l => l.limitType === 'perOccurrence');
  const hasAggregate = limits.some(l => l.limitType === 'aggregate');
  if (hasOccurrence && hasAggregate) {
    return 'occAgg';
  }

  // Check for CSL
  if (limits.some(l => l.limitType === 'combined')) {
    return 'csl';
  }

  // Note: 'sublimit' as a structure is deprecated
  // Legacy sublimits will be migrated to 'single' + sublimitsEnabled=true
  // We still detect them here for migration purposes
  if (limits.some(l => l.limitType === 'sublimit')) {
    return 'single'; // Will be handled specially in migration
  }

  return 'single';
}

/**
 * Convert legacy limits to option value based on structure
 */
function convertLegacyToOptionValue(
  limits: CoverageLimit[],
  structure: LimitStructure
): LimitOptionValue {
  const primary = limits[0];

  switch (structure) {
    case 'single':
      return { structure: 'single', amount: primary?.amount || 0 };

    case 'occAgg': {
      const occ = limits.find(l => l.limitType === 'perOccurrence')?.amount || 0;
      const agg = limits.find(l => l.limitType === 'aggregate')?.amount || 0;
      return { structure: 'occAgg', perOccurrence: occ, aggregate: agg };
    }

    case 'csl':
      return { structure: 'csl', amount: primary?.amount || 0 };

    case 'sublimit':
      // Deprecated: sublimit structure is now handled as single + sublimitsEnabled
      // This case is kept for backward compatibility during migration
      return {
        structure: 'single',
        amount: primary?.amount || 0
      };

    case 'split': {
      // Try to parse split from displayValue like "100/300/100"
      const displayMatch = primary?.displayValue?.match(/(\d+)\/(\d+)\/(\d+)/);
      if (displayMatch) {
        const components: SplitLimitComponent[] = [
          { key: 'biPerPerson', label: 'BI Per Person', amount: parseInt(displayMatch[1]) * 1000, order: 0 },
          { key: 'biPerAccident', label: 'BI Per Accident', amount: parseInt(displayMatch[2]) * 1000, order: 1 },
          { key: 'pd', label: 'Property Damage', amount: parseInt(displayMatch[3]) * 1000, order: 2 }
        ];
        return { structure: 'split', components };
      }
      return { structure: 'single', amount: primary?.amount || 0 };
    }

    default:
      return { structure: 'single', amount: primary?.amount || 0 };
  }
}

/**
 * Generate display value for an option
 */
export function generateDisplayValue(value: LimitOptionValue): string {
  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(n);

  switch (value.structure) {
    case 'single':
    case 'csl':
      return formatCurrency(value.amount);

    case 'occAgg':
      return `${formatCurrency(value.perOccurrence)} / ${formatCurrency(value.aggregate)}`;

    case 'claimAgg':
      return `${formatCurrency((value as ClaimAggLimitValue).perClaim)} / ${formatCurrency((value as ClaimAggLimitValue).aggregate)}`;

    case 'split': {
      const amounts = value.components
        .sort((a, b) => a.order - b.order)
        .map(c => c.amount >= 1000 ? Math.round(c.amount / 1000) : c.amount);
      return amounts.join('/');
    }

    case 'sublimit':
      return value.sublimitTag
        ? `${formatCurrency(value.amount)} – ${value.sublimitTag}`
        : formatCurrency(value.amount);

    case 'scheduled':
      if (value.totalCap) return `Up to ${formatCurrency(value.totalCap)}`;
      if (value.perItemMax) return `${formatCurrency(value.perItemMax)} per item`;
      return 'Scheduled';

    case 'custom':
      return value.description || 'Custom Limit';

    default:
      return '';
  }
}

/**
 * Migrate legacy /limits docs to new limitOptionSets model
 */
export async function migrateLegacyLimitsToOptionSet(
  productId: string,
  coverageId: string
): Promise<LegacyMigrationResult> {
  const warnings: string[] = [];

  // Fetch legacy limits
  const legacyPath = getLegacyLimitsPath(productId, coverageId);
  const legacySnap = await getDocs(collection(db, legacyPath));
  const legacyLimits = legacySnap.docs.map(d => ({ id: d.id, ...d.data() } as CoverageLimit));

  if (legacyLimits.length === 0) {
    // No legacy data - create empty set
    const optionSet: CoverageLimitOptionSet = {
      id: 'primary',
      productId,
      coverageId,
      structure: 'single',
      name: 'Primary Limits',
      selectionMode: 'single',
      isRequired: false
    };
    return { optionSet, options: [], warnings, structureInferred: false };
  }

  // Infer structure
  const structure = inferStructureFromLegacy(legacyLimits);

  // Group limits into options based on structure
  const options: CoverageLimitOption[] = [];

  if (structure === 'occAgg') {
    // Group by matching amounts (assume occ+agg pairs)
    const occLimits = legacyLimits.filter(l => l.limitType === 'perOccurrence');
    const aggLimits = legacyLimits.filter(l => l.limitType === 'aggregate');

    occLimits.forEach((occ, i) => {
      const matchingAgg = aggLimits[i] || aggLimits[0];
      const value: OccAggLimitValue = {
        structure: 'occAgg',
        perOccurrence: occ.amount,
        aggregate: matchingAgg?.amount || occ.amount * 2
      };
      options.push({
        id: `opt-${i}`,
        label: generateDisplayValue(value),
        isDefault: occ.isDefault || false,
        isEnabled: true,
        displayOrder: i,
        displayValue: generateDisplayValue(value),
        applicability: occ.states ? { states: occ.states } : undefined,
        ...value
      });
    });
  } else {
    // Each legacy limit becomes one option
    legacyLimits.forEach((limit, i) => {
      const value = convertLegacyToOptionValue([limit], structure);
      options.push({
        id: `opt-${i}`,
        label: limit.displayValue || generateDisplayValue(value),
        isDefault: limit.isDefault || false,
        isEnabled: true,
        displayOrder: i,
        displayValue: limit.displayValue || generateDisplayValue(value),
        applicability: limit.states ? { states: limit.states } : undefined,
        constraints: limit.minAmount || limit.maxAmount
          ? { min: limit.minAmount, max: limit.maxAmount }
          : undefined,
        ...value
      });
    });
  }

  // Check if legacy data had sublimits
  const hadSublimits = legacyLimits.some(l => l.limitType === 'sublimit');

  const optionSet: CoverageLimitOptionSet = {
    id: 'primary',
    productId,
    coverageId,
    structure,
    name: 'Legacy Limits (Migrated)',
    selectionMode: 'single',
    isRequired: legacyLimits.some(l => l.isRequired),
    sublimitsEnabled: hadSublimits // Enable sublimits if legacy data had them
  };

  if (hadSublimits) {
    warnings.push('Legacy sublimit structure detected. Migrated to single + sublimitsEnabled=true');
  }

  if (structure !== inferStructureFromLegacy(legacyLimits)) {
    warnings.push('Limit structure could not be fully inferred and may need review');
  }

  return { optionSet, options, warnings, structureInferred: true };
}

/**
 * Save migrated option set and options to Firestore
 */
export async function saveMigratedOptionSet(
  productId: string,
  coverageId: string,
  result: LegacyMigrationResult
): Promise<void> {
  const batch = writeBatch(db);
  const now = Timestamp.now();

  // Save option set
  const setPath = `${getOptionSetsPath(productId, coverageId)}/${result.optionSet.id}`;
  batch.set(doc(db, setPath), {
    ...result.optionSet,
    createdAt: now,
    updatedAt: now
  });

  // Save options
  const optionsPath = getOptionsPath(productId, coverageId, result.optionSet.id);
  result.options.forEach(opt => {
    const optRef = doc(collection(db, optionsPath));
    batch.set(optRef, {
      ...opt,
      id: optRef.id,
      createdAt: now,
      updatedAt: now
    });
  });

  await batch.commit();
}

/**
 * Sync option set back to legacy /limits for backward compatibility
 * This writes derived CoverageLimit docs for legacy screens
 */
export async function syncToLegacyLimits(
  productId: string,
  coverageId: string,
  setId: string
): Promise<void> {
  const data = await getLimitOptionSetWithOptions(productId, coverageId, setId);
  if (!data) return;

  const { optionSet, options } = data;
  const legacyPath = getLegacyLimitsPath(productId, coverageId);
  const batch = writeBatch(db);
  const now = Timestamp.now();

  // Delete existing legacy limits
  const existingSnap = await getDocs(collection(db, legacyPath));
  existingSnap.docs.forEach(d => batch.delete(doc(db, legacyPath, d.id)));

  // Create new legacy docs from options
  options.forEach(opt => {
    const legacyLimit: Partial<CoverageLimit> = {
      coverageId,
      productId,
      displayValue: opt.displayValue || opt.label,
      isDefault: opt.isDefault,
      isRequired: optionSet.isRequired,
      states: opt.applicability?.states,
      minAmount: opt.constraints?.min,
      maxAmount: opt.constraints?.max
    };

    // Map structure to limitType
    switch (opt.structure) {
      case 'single':
        legacyLimit.limitType = 'perOccurrence';
        legacyLimit.amount = opt.amount;
        break;
      case 'csl':
        legacyLimit.limitType = 'combined';
        legacyLimit.amount = opt.amount;
        break;
      case 'occAgg':
        legacyLimit.limitType = 'perOccurrence';
        legacyLimit.amount = opt.perOccurrence;
        break;
      case 'sublimit':
        legacyLimit.limitType = 'sublimit';
        legacyLimit.amount = opt.amount;
        legacyLimit.appliesTo = opt.sublimitTag ? [opt.sublimitTag] : undefined;
        break;
      case 'split':
        legacyLimit.limitType = 'split';
        legacyLimit.amount = opt.components?.[0]?.amount || 0;
        break;
      default:
        legacyLimit.limitType = 'perOccurrence';
        legacyLimit.amount = 0;
    }

    const newRef = doc(collection(db, legacyPath));
    batch.set(newRef, { ...legacyLimit, id: newRef.id, createdAt: now, updatedAt: now });
  });

  await batch.commit();
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Parse shorthand amount notation (100k, 1m, 2.5m, etc.)
 */
export function parseShorthandAmount(value: string): number {
  const trimmed = value.trim().toLowerCase();

  const shorthandMatch = trimmed.match(/^[\$]?\s*([\d,.]+)\s*(k|m|b)?$/i);
  if (shorthandMatch) {
    const numPart = parseFloat(shorthandMatch[1].replace(/,/g, '')) || 0;
    const suffix = shorthandMatch[2]?.toLowerCase();

    switch (suffix) {
      case 'k':
        return numPart * 1000;
      case 'm':
        return numPart * 1000000;
      case 'b':
        return numPart * 1000000000;
      default:
        return numPart;
    }
  }

  const cleaned = value.replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Validate that aggregate >= primary for occAgg/claimAgg structures
 */
export function validateAggregatePrimary(
  primary: number,
  aggregate: number
): { valid: boolean; message?: string } {
  if (aggregate < primary) {
    return {
      valid: false,
      message: 'Aggregate must be greater than or equal to the primary limit'
    };
  }
  return { valid: true };
}

/**
 * Check for duplicate option tuples in a set
 * Returns array of duplicate pairs (indices)
 */
export function findDuplicateOptions(
  options: CoverageLimitOption[]
): Array<[number, number]> {
  const duplicates: Array<[number, number]> = [];

  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) {
      if (areOptionsEqual(options[i], options[j])) {
        duplicates.push([i, j]);
      }
    }
  }

  return duplicates;
}

/**
 * Check if two options have the same value (ignoring metadata)
 */
function areOptionsEqual(a: CoverageLimitOption, b: CoverageLimitOption): boolean {
  if (a.structure !== b.structure) return false;

  switch (a.structure) {
    case 'single':
    case 'csl':
      return (a as SingleLimitValue).amount === (b as SingleLimitValue).amount;
    case 'occAgg':
      return (
        (a as OccAggLimitValue).perOccurrence === (b as OccAggLimitValue).perOccurrence &&
        (a as OccAggLimitValue).aggregate === (b as OccAggLimitValue).aggregate
      );
    case 'claimAgg':
      return (
        (a as any).perClaim === (b as any).perClaim &&
        (a as any).aggregate === (b as any).aggregate
      );
    case 'split':
      const aComps = (a as SplitLimitValue).components || [];
      const bComps = (b as SplitLimitValue).components || [];
      if (aComps.length !== bComps.length) return false;
      return aComps.every((comp, idx) => comp.amount === bComps[idx]?.amount);
    default:
      return false;
  }
}

/**
 * Validate a limit option before saving
 */
export function validateLimitOption(
  option: Partial<CoverageLimitOption>,
  existingOptions: CoverageLimitOption[] = []
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!option.structure) {
    errors.push('Structure is required');
  }

  // Structure-specific validation
  switch (option.structure) {
    case 'single':
    case 'csl':
      if ((option as any).amount === undefined || (option as any).amount < 0) {
        errors.push('Amount must be a positive number');
      }
      break;
    case 'occAgg':
      const occAgg = option as any;
      if (occAgg.perOccurrence === undefined || occAgg.perOccurrence < 0) {
        errors.push('Per Occurrence must be a positive number');
      }
      if (occAgg.aggregate === undefined || occAgg.aggregate < 0) {
        errors.push('Aggregate must be a positive number');
      }
      if (occAgg.aggregate < occAgg.perOccurrence) {
        errors.push('Aggregate must be >= Per Occurrence');
      }
      break;
    case 'claimAgg':
      const claimAgg = option as any;
      if (claimAgg.perClaim === undefined || claimAgg.perClaim < 0) {
        errors.push('Per Claim must be a positive number');
      }
      if (claimAgg.aggregate === undefined || claimAgg.aggregate < 0) {
        errors.push('Aggregate must be a positive number');
      }
      if (claimAgg.aggregate < claimAgg.perClaim) {
        errors.push('Aggregate must be >= Per Claim');
      }
      break;
  }

  // Check for duplicates
  if (option.id) {
    const otherOptions = existingOptions.filter(o => o.id !== option.id);
    const fullOption = { ...option } as CoverageLimitOption;
    for (const existing of otherOptions) {
      if (areOptionsEqual(fullOption, existing)) {
        errors.push('This limit option already exists');
        break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

