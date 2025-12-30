/**
 * useLimitOptionSets Hook
 * 
 * Manages limit option sets and options with real-time updates.
 * Includes backward compatibility adapter for legacy /limits documents.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  CoverageLimitOptionSet,
  CoverageLimitOption,
  LimitStructure,
  LegacyMigrationResult,
  LimitBasisConfig
} from '../types';
import * as limitService from '../services/limitOptionService';
import { getDefaultBasisForStructure } from '../components/selectors/LimitBasisSelector';

/**
 * Migrate/infer basis config for option sets that don't have one.
 * This provides backward compatibility for existing data.
 */
function ensureBasisConfig(set: CoverageLimitOptionSet): CoverageLimitOptionSet {
  if (set.basisConfig && set.basisConfig.primaryBasis) {
    return set; // Already has basis config
  }

  // Infer default basis from structure
  const inferredBasis = getDefaultBasisForStructure(set.structure);

  return {
    ...set,
    basisConfig: inferredBasis
  };
}

interface UseLimitOptionSetsResult {
  // Data
  optionSets: CoverageLimitOptionSet[];
  currentSet: CoverageLimitOptionSet | null;
  options: CoverageLimitOption[];
  
  // State
  loading: boolean;
  error: string | null;
  hasLegacyData: boolean;
  migrationResult: LegacyMigrationResult | null;
  
  // Option Set Actions
  selectOptionSet: (setId: string) => void;
  createOptionSet: (set: Partial<CoverageLimitOptionSet>) => Promise<string>;
  updateOptionSet: (set: Partial<CoverageLimitOptionSet>) => Promise<void>;
  deleteOptionSet: (setId: string) => Promise<void>;
  
  // Option Actions
  addOption: (option: Partial<CoverageLimitOption>) => Promise<string>;
  updateOption: (option: Partial<CoverageLimitOption>) => Promise<void>;
  deleteOption: (optionId: string) => Promise<void>;
  setDefault: (optionId: string) => Promise<void>;
  reorderOptions: (orderedIds: string[]) => Promise<void>;
  
  // Migration
  migrateFromLegacy: () => Promise<void>;
  saveMigration: () => Promise<void>;
}

export function useLimitOptionSets(
  productId: string | undefined,
  coverageId: string | undefined
): UseLimitOptionSetsResult {
  const [optionSets, setOptionSets] = useState<CoverageLimitOptionSet[]>([]);
  const [currentSetId, setCurrentSetId] = useState<string | null>(null);
  const [options, setOptions] = useState<CoverageLimitOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLegacyData, setHasLegacyData] = useState(false);
  const [migrationResult, setMigrationResult] = useState<LegacyMigrationResult | null>(null);

  // Subscribe to option sets
  useEffect(() => {
    if (!productId || !coverageId) {
      setOptionSets([]);
      setLoading(false);
      return;
    }

    const path = `products/${productId}/coverages/${coverageId}/limitOptionSets`;
    const unsubscribe = onSnapshot(
      collection(db, path),
      async (snapshot) => {
        // Map and ensure basis config for backward compatibility
        const sets = snapshot.docs.map(doc => {
          const rawSet = {
            id: doc.id,
            ...doc.data()
          } as CoverageLimitOptionSet;

          // Apply migration to ensure basis config exists
          return ensureBasisConfig(rawSet);
        });

        setOptionSets(sets);
        
        // If no option sets exist, check for legacy data
        if (sets.length === 0) {
          const legacyPath = `products/${productId}/coverages/${coverageId}/limits`;
          const legacySnap = await new Promise<any>((resolve) => {
            const unsub = onSnapshot(collection(db, legacyPath), (snap) => {
              unsub();
              resolve(snap);
            });
          });
          setHasLegacyData(legacySnap.docs.length > 0);
        } else {
          setHasLegacyData(false);
          // Auto-select first set if none selected
          if (!currentSetId && sets.length > 0) {
            setCurrentSetId(sets[0].id);
          }
        }
        
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching option sets:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [productId, coverageId]);

  // Subscribe to options for current set
  useEffect(() => {
    if (!productId || !coverageId || !currentSetId) {
      setOptions([]);
      return;
    }

    const path = `products/${productId}/coverages/${coverageId}/limitOptionSets/${currentSetId}/options`;
    const unsubscribe = onSnapshot(
      query(collection(db, path), orderBy('displayOrder')),
      (snapshot) => {
        const opts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as CoverageLimitOption));
        setOptions(opts);
      },
      (err) => {
        console.error('Error fetching options:', err);
        setError(err.message);
      }
    );

    return () => unsubscribe();
  }, [productId, coverageId, currentSetId]);

  const currentSet = useMemo(() => 
    optionSets.find(s => s.id === currentSetId) || null,
    [optionSets, currentSetId]
  );

  // Option Set Actions
  const selectOptionSet = useCallback((setId: string) => {
    setCurrentSetId(setId);
  }, []);

  const createOptionSet = useCallback(async (set: Partial<CoverageLimitOptionSet>) => {
    if (!productId || !coverageId) throw new Error('Missing product or coverage ID');
    const id = await limitService.upsertLimitOptionSet(productId, coverageId, set);
    setCurrentSetId(id);
    return id;
  }, [productId, coverageId]);

  const updateOptionSet = useCallback(async (set: Partial<CoverageLimitOptionSet>) => {
    if (!productId || !coverageId) throw new Error('Missing product or coverage ID');
    await limitService.upsertLimitOptionSet(productId, coverageId, set);
  }, [productId, coverageId]);

  const deleteOptionSet = useCallback(async (setId: string) => {
    if (!productId || !coverageId) throw new Error('Missing product or coverage ID');
    await limitService.deleteLimitOptionSet(productId, coverageId, setId);
    if (currentSetId === setId) {
      setCurrentSetId(optionSets.find(s => s.id !== setId)?.id || null);
    }
  }, [productId, coverageId, currentSetId, optionSets]);

  // Option Actions
  const addOption = useCallback(async (option: Partial<CoverageLimitOption>) => {
    if (!productId || !coverageId || !currentSetId) {
      throw new Error('No option set selected');
    }
    // Set display order to end
    const maxOrder = options.reduce((max, o) => Math.max(max, o.displayOrder), -1);
    const optionWithOrder = { ...option, displayOrder: maxOrder + 1 };
    return limitService.upsertLimitOption(productId, coverageId, currentSetId, optionWithOrder);
  }, [productId, coverageId, currentSetId, options]);

  const updateOption = useCallback(async (option: Partial<CoverageLimitOption>) => {
    if (!productId || !coverageId || !currentSetId || !option.id) {
      throw new Error('Missing required IDs');
    }
    await limitService.upsertLimitOption(productId, coverageId, currentSetId, option);
  }, [productId, coverageId, currentSetId]);

  const deleteOption = useCallback(async (optionId: string) => {
    if (!productId || !coverageId || !currentSetId) {
      throw new Error('No option set selected');
    }
    await limitService.deleteLimitOption(productId, coverageId, currentSetId, optionId);
  }, [productId, coverageId, currentSetId]);

  const setDefault = useCallback(async (optionId: string) => {
    if (!productId || !coverageId || !currentSetId) {
      throw new Error('No option set selected');
    }
    await limitService.setDefaultOption(productId, coverageId, currentSetId, optionId);
  }, [productId, coverageId, currentSetId]);

  const reorderOptions = useCallback(async (orderedIds: string[]) => {
    if (!productId || !coverageId || !currentSetId) {
      throw new Error('No option set selected');
    }
    await limitService.reorderOptions(productId, coverageId, currentSetId, orderedIds);
  }, [productId, coverageId, currentSetId]);

  // Migration Actions
  const migrateFromLegacy = useCallback(async () => {
    if (!productId || !coverageId) {
      throw new Error('Missing product or coverage ID');
    }
    const result = await limitService.migrateLegacyLimitsToOptionSet(productId, coverageId);
    setMigrationResult(result);
  }, [productId, coverageId]);

  const saveMigration = useCallback(async () => {
    if (!productId || !coverageId || !migrationResult) {
      throw new Error('No migration result to save');
    }
    await limitService.saveMigratedOptionSet(productId, coverageId, migrationResult);
    setMigrationResult(null);
  }, [productId, coverageId, migrationResult]);

  return useMemo(() => ({
    // Data
    optionSets,
    currentSet,
    options,

    // State
    loading,
    error,
    hasLegacyData,
    migrationResult,

    // Option Set Actions
    selectOptionSet,
    createOptionSet,
    updateOptionSet,
    deleteOptionSet,

    // Option Actions
    addOption,
    updateOption,
    deleteOption,
    setDefault,
    reorderOptions,

    // Migration
    migrateFromLegacy,
    saveMigration
  }), [
    optionSets, currentSet, options, loading, error, hasLegacyData, migrationResult,
    selectOptionSet, createOptionSet, updateOptionSet, deleteOptionSet,
    addOption, updateOption, deleteOption, setDefault, reorderOptions,
    migrateFromLegacy, saveMigration
  ]);
}

export default useLimitOptionSets;

