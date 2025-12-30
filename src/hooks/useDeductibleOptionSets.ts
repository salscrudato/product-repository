/**
 * useDeductibleOptionSets Hook
 * 
 * Manages deductible option sets for a coverage with real-time updates.
 * Mirrors the pattern of useLimitOptionSets for consistency.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  CoverageDeductibleOptionSet,
  CoverageDeductibleOption,
  DeductibleStructure,
  DeductibleLegacyMigrationResult,
} from '../types/deductibleOptions';
import * as deductibleService from '../services/deductibleOptionsService';

interface UseDeductibleOptionSetsResult {
  // Data
  optionSets: CoverageDeductibleOptionSet[];
  currentSet: CoverageDeductibleOptionSet | null;
  options: CoverageDeductibleOption[];
  
  // State
  loading: boolean;
  error: string | null;
  hasLegacyData: boolean;
  migrationResult: DeductibleLegacyMigrationResult | null;
  
  // Option Set Actions
  selectOptionSet: (setId: string) => void;
  createOptionSet: (set: Partial<CoverageDeductibleOptionSet>) => Promise<string>;
  updateOptionSet: (set: Partial<CoverageDeductibleOptionSet>) => Promise<void>;
  deleteOptionSet: (setId: string) => Promise<void>;
  
  // Option Actions
  addOption: (option: Omit<CoverageDeductibleOption, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateOption: (optionId: string, data: Partial<CoverageDeductibleOption>) => Promise<void>;
  deleteOption: (optionId: string) => Promise<void>;
  setDefault: (optionId: string) => Promise<void>;
  reorderOptions: (orderedIds: string[]) => Promise<void>;
  
  // Migration
  migrateFromLegacy: () => Promise<void>;
  saveMigration: () => Promise<void>;
}

export function useDeductibleOptionSets(
  productId: string | undefined,
  coverageId: string | undefined
): UseDeductibleOptionSetsResult {
  const [optionSets, setOptionSets] = useState<CoverageDeductibleOptionSet[]>([]);
  const [currentSetId, setCurrentSetId] = useState<string | null>(null);
  const [options, setOptions] = useState<CoverageDeductibleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLegacyData, setHasLegacyData] = useState(false);
  const [migrationResult, setMigrationResult] = useState<DeductibleLegacyMigrationResult | null>(null);

  // Subscribe to option sets
  useEffect(() => {
    if (!productId || !coverageId) {
      setOptionSets([]);
      setLoading(false);
      return;
    }

    const path = `products/${productId}/coverages/${coverageId}/deductibleOptionSets`;
    const unsubscribe = onSnapshot(
      collection(db, path),
      async (snapshot) => {
        const sets = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as CoverageDeductibleOptionSet));
        
        setOptionSets(sets);
        
        // If no option sets exist, check for legacy data
        if (sets.length === 0) {
          const legacyPath = `products/${productId}/coverages/${coverageId}/deductibles`;
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
        console.error('Error fetching deductible option sets:', err);
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

    const path = `products/${productId}/coverages/${coverageId}/deductibleOptionSets/${currentSetId}/options`;
    const unsubscribe = onSnapshot(
      query(collection(db, path), orderBy('displayOrder')),
      (snapshot) => {
        const opts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as CoverageDeductibleOption));
        setOptions(opts);
      },
      (err) => {
        console.error('Error fetching deductible options:', err);
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

  const createOptionSet = useCallback(async (set: Partial<CoverageDeductibleOptionSet>) => {
    if (!productId || !coverageId) throw new Error('Missing product or coverage ID');
    const id = await deductibleService.createDeductibleOptionSet(productId, coverageId, {
      productId,
      coverageId,
      structure: set.structure || 'flat',
      name: set.name || 'Primary Deductible',
      isRequired: set.isRequired ?? true,
      selectionMode: set.selectionMode || 'single',
    });
    setCurrentSetId(id);
    return id;
  }, [productId, coverageId]);

  const updateOptionSet = useCallback(async (set: Partial<CoverageDeductibleOptionSet>) => {
    if (!productId || !coverageId || !currentSetId) throw new Error('Missing IDs');
    await deductibleService.updateDeductibleOptionSet(productId, coverageId, currentSetId, set);
  }, [productId, coverageId, currentSetId]);

  const deleteOptionSet = useCallback(async (setId: string) => {
    if (!productId || !coverageId) throw new Error('Missing product or coverage ID');
    await deductibleService.deleteDeductibleOptionSet(productId, coverageId, setId);
    if (currentSetId === setId) {
      setCurrentSetId(null);
    }
  }, [productId, coverageId, currentSetId]);

  // Option Actions
  const addOption = useCallback(async (
    option: Omit<CoverageDeductibleOption, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!productId || !coverageId || !currentSetId) throw new Error('Missing IDs');
    return await deductibleService.createDeductibleOption(productId, coverageId, currentSetId, option);
  }, [productId, coverageId, currentSetId]);

  const updateOption = useCallback(async (optionId: string, data: Partial<CoverageDeductibleOption>) => {
    if (!productId || !coverageId || !currentSetId) throw new Error('Missing IDs');
    await deductibleService.updateDeductibleOption(productId, coverageId, currentSetId, optionId, data);
  }, [productId, coverageId, currentSetId]);

  const deleteOption = useCallback(async (optionId: string) => {
    if (!productId || !coverageId || !currentSetId) throw new Error('Missing IDs');
    await deductibleService.deleteDeductibleOption(productId, coverageId, currentSetId, optionId);
  }, [productId, coverageId, currentSetId]);

  const setDefault = useCallback(async (optionId: string) => {
    if (!productId || !coverageId || !currentSetId) throw new Error('Missing IDs');

    // Clear existing defaults and set new one
    const updates = options.map(opt => ({
      id: opt.id,
      data: { isDefault: opt.id === optionId }
    }));

    await deductibleService.batchUpdateDeductibleOptions(productId, coverageId, currentSetId, updates);
  }, [productId, coverageId, currentSetId, options]);

  const reorderOptions = useCallback(async (orderedIds: string[]) => {
    if (!productId || !coverageId || !currentSetId) throw new Error('Missing IDs');

    const updates = orderedIds.map((id, index) => ({
      id,
      data: { displayOrder: index }
    }));

    await deductibleService.batchUpdateDeductibleOptions(productId, coverageId, currentSetId, updates);
  }, [productId, coverageId, currentSetId]);

  // Migration (placeholder - implement based on legacy data structure)
  const migrateFromLegacy = useCallback(async () => {
    if (!productId || !coverageId) throw new Error('Missing product or coverage ID');

    // TODO: Implement legacy migration based on existing deductible data structure
    // For now, create a default option set with common deductibles
    const { setId } = await deductibleService.createDeductibleOptionSetWithDefaults(
      productId,
      coverageId,
      'flat',
      'Primary Deductible'
    );

    setCurrentSetId(setId);
    setHasLegacyData(false);
  }, [productId, coverageId]);

  const saveMigration = useCallback(async () => {
    // Migration result is already saved in migrateFromLegacy
    setMigrationResult(null);
  }, []);

  return {
    optionSets,
    currentSet,
    options,
    loading,
    error,
    hasLegacyData,
    migrationResult,
    selectOptionSet,
    createOptionSet,
    updateOptionSet,
    deleteOptionSet,
    addOption,
    updateOption,
    deleteOption,
    setDefault,
    reorderOptions,
    migrateFromLegacy,
    saveMigration,
  };
}

