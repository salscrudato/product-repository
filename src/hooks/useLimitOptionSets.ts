/**
 * useLimitOptionSets Hook
 * 
 * Manages limit option sets and options with real-time updates.
 * Includes backward compatibility adapter for legacy /limits documents.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db, isAuthReady, safeOnSnapshot } from '../firebase';
import {
  CoverageLimitOptionSet,
  CoverageLimitOption,
  LimitStructure,
  LegacyMigrationResult,
  LimitBasisConfig
} from '../types';
import * as limitService from '../services/limitOptionService';
import { getDefaultBasisForStructure } from '../components/selectors/LimitBasisSelector';
import logger, { LOG_CATEGORIES } from '../utils/logger';

/** True if the error is Firestore permission-denied (auth race or missing access). */
function isPermissionError(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  const msg = err instanceof Error ? err.message : String(err);
  return code === 'permission-denied' || msg.includes('Missing or insufficient permissions');
}

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
  const [subscribeAttempt, setSubscribeAttempt] = useState(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset retry count when product or coverage changes so we get one retry per context
  useEffect(() => {
    setSubscribeAttempt(0);
  }, [productId, coverageId]);

  // Subscribe to option sets
  useEffect(() => {
    // Wait for auth to fully propagate before subscribing
    if (!isAuthReady() || !productId || !coverageId) {
      setOptionSets([]);
      setLoading(false);
      return;
    }

    retryTimeoutRef.current = null;
    setError(null); // Clear any previous error when (re)subscribing
    const path = `products/${productId}/coverages/${coverageId}/limitOptionSets`;
    const attempt = subscribeAttempt;
    const unsubscribe = safeOnSnapshot(
      collection(db, path),
      async (snapshot) => {
        setError(null); // Clear error when we get a successful snapshot (e.g. after auth propagates)
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
        
        // If no option sets exist, check for legacy data using getDocs (one-shot)
        // to avoid creating short-lived onSnapshot listeners that contribute to
        // the ca9 race condition.
        if (sets.length === 0) {
          try {
            const legacyPath = `products/${productId}/coverages/${coverageId}/limits`;
            const legacySnap = await getDocs(collection(db, legacyPath));
            setHasLegacyData(legacySnap.docs.length > 0);
          } catch {
            setHasLegacyData(false);
          }
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
        const fireErr = err as { code?: string; message?: string };
        if (isPermissionError(err)) {
          logger.debug(LOG_CATEGORIES.AUTH, 'Limit option sets not accessible (auth propagation or missing access)', {
            productId,
            coverageId
          });
          setError('Unable to load limit options. You may not have access or the data is still loading.');
          // Retry up to 2 times after a delay in case auth was still propagating
          // or the safeOnSnapshot queue added latency before the listener was created
          if (attempt < 2) {
            retryTimeoutRef.current = setTimeout(() => setSubscribeAttempt((a) => a + 1), 1500);
          }
        } else {
          logger.error(LOG_CATEGORIES.DATA, 'Error fetching option sets', { productId, coverageId }, err as Error);
          setError(fireErr.message ?? 'Failed to load limit option sets');
        }
        setLoading(false);
      }
    );

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      unsubscribe();
    };
  }, [productId, coverageId, subscribeAttempt]);

  // Subscribe to options for current set
  useEffect(() => {
    if (!productId || !coverageId || !currentSetId) {
      setOptions([]);
      return;
    }

    const path = `products/${productId}/coverages/${coverageId}/limitOptionSets/${currentSetId}/options`;
    const unsubscribe = safeOnSnapshot(
      query(collection(db, path), orderBy('displayOrder')),
      (snapshot) => {
        setError(null); // Clear error when we get a successful snapshot
        const opts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as CoverageLimitOption));
        setOptions(opts);
      },
      (err) => {
        const fireErr = err as { code?: string; message?: string };
        if (isPermissionError(err)) {
          logger.debug(LOG_CATEGORIES.AUTH, 'Limit options not accessible (auth propagation or missing access)', {
            productId,
            coverageId,
            currentSetId
          });
          setError('Unable to load options. You may not have access or the data is still loading.');
        } else {
          logger.error(LOG_CATEGORIES.DATA, 'Error fetching limit options', { productId, coverageId, currentSetId }, err as Error);
          setError(fireErr.message ?? 'Failed to load options');
        }
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

