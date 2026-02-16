/**
 * Deviation Hooks
 *
 * React hooks for:
 *  - useDeviationDiff   : real-time diff between base + overrides
 *  - useOverrideValidation : live validation errors as overrides change
 *  - useOverrideActions  : set, remove, promote, revert wrappers
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  Override,
  DiffResult,
  DiffEntry,
  DeviationValidationError,
  OverrideCategory,
} from '../types/deviation';
import {
  computeDiff,
  validateOverrides,
} from '../engine/deviationEngine';
import {
  subscribeToOverrides,
  setOverride,
  removeOverride,
  promoteOverrideToBase,
} from '../services/deviationService';

// ════════════════════════════════════════════════════════════════════════
// useDeviationDiff
// ════════════════════════════════════════════════════════════════════════

interface UseDeviationDiffOpts {
  orgId: string;
  productId: string;
  versionId: string;
  stateCode: string;
  stateName: string;
  baseConfig: Record<string, unknown>;
}

interface UseDeviationDiffResult {
  diff: DiffResult | null;
  loading: boolean;
  overrides: Record<string, Override>;
  /** Filter by category */
  filterByCategory: (category: OverrideCategory | 'all') => DiffEntry[];
  /** Entries grouped by category */
  groupedEntries: Record<string, DiffEntry[]>;
}

export function useDeviationDiff(opts: UseDeviationDiffOpts): UseDeviationDiffResult {
  const { orgId, productId, versionId, stateCode, stateName, baseConfig } = opts;
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [loading, setLoading] = useState(true);

  // Subscribe to real-time override updates
  useEffect(() => {
    if (!orgId || !productId || !versionId || !stateCode) return;
    setLoading(true);
    const unsub = subscribeToOverrides(
      orgId, productId, versionId, stateCode,
      (ovs) => {
        setOverrides(ovs);
        setLoading(false);
      },
    );
    return unsub;
  }, [orgId, productId, versionId, stateCode]);

  // Compute diff whenever base or overrides change
  const diff = useMemo(() => {
    if (!baseConfig || loading) return null;
    return computeDiff(baseConfig, overrides, stateCode, stateName);
  }, [baseConfig, overrides, stateCode, stateName, loading]);

  // Category filter helper
  const filterByCategory = useCallback(
    (category: OverrideCategory | 'all'): DiffEntry[] => {
      if (!diff) return [];
      if (category === 'all') return diff.entries;
      return diff.entries.filter(e => e.category === category);
    },
    [diff],
  );

  // Grouped entries
  const groupedEntries = useMemo(() => {
    if (!diff) return {};
    const groups: Record<string, DiffEntry[]> = {};
    for (const entry of diff.entries) {
      const cat = entry.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(entry);
    }
    return groups;
  }, [diff]);

  return { diff, loading, overrides, filterByCategory, groupedEntries };
}

// ════════════════════════════════════════════════════════════════════════
// useOverrideValidation
// ════════════════════════════════════════════════════════════════════════

interface UseOverrideValidationOpts {
  orgId: string;
  productId: string;
  versionId: string;
  stateCode: string;
  baseConfig: Record<string, unknown>;
}

interface UseOverrideValidationResult {
  errors: DeviationValidationError[];
  hasErrors: boolean;
  hasConflicts: boolean;
  conflictCount: number;
  loading: boolean;
}

export function useOverrideValidation(opts: UseOverrideValidationOpts): UseOverrideValidationResult {
  const { orgId, productId, versionId, stateCode, baseConfig } = opts;
  const [overrides, setOverridesState] = useState<Record<string, Override>>({});
  const [firestoreErrors, setFirestoreErrors] = useState<DeviationValidationError[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !productId || !versionId || !stateCode) return;
    setLoading(true);
    const unsub = subscribeToOverrides(
      orgId, productId, versionId, stateCode,
      (ovs, errs) => {
        setOverridesState(ovs);
        setFirestoreErrors(errs);
        setLoading(false);
      },
    );
    return unsub;
  }, [orgId, productId, versionId, stateCode]);

  // Compute local validation (live, not persisted)
  const errors = useMemo(() => {
    if (!baseConfig || loading) return firestoreErrors;
    return validateOverrides(baseConfig, overrides);
  }, [baseConfig, overrides, loading, firestoreErrors]);

  const hasErrors = errors.some(e => e.severity === 'error');
  const hasConflicts = errors.some(e => e.type === 'conflict');
  const conflictCount = errors.filter(e => e.type === 'conflict').length;

  return { errors, hasErrors, hasConflicts, conflictCount, loading };
}

// ════════════════════════════════════════════════════════════════════════
// useOverrideActions
// ════════════════════════════════════════════════════════════════════════

interface UseOverrideActionsOpts {
  orgId: string;
  productId: string;
  versionId: string;
  stateCode: string;
}

interface UseOverrideActionsResult {
  setField: (
    path: string,
    value: unknown,
    baseValue: unknown,
    opts?: { fieldLabel?: string; category?: OverrideCategory; note?: string },
  ) => Promise<void>;
  revertField: (path: string) => Promise<void>;
  promoteField: (
    path: string,
    currentBaseConfig: Record<string, unknown>,
  ) => Promise<{ newBaseConfig: Record<string, unknown>; affectedStateCodes: string[] }>;
  actionLoading: boolean;
}

export function useOverrideActions(opts: UseOverrideActionsOpts): UseOverrideActionsResult {
  const { orgId, productId, versionId, stateCode } = opts;
  const [actionLoading, setActionLoading] = useState(false);

  const setField = useCallback(
    async (
      path: string,
      value: unknown,
      baseValue: unknown,
      extra?: { fieldLabel?: string; category?: OverrideCategory; note?: string },
    ) => {
      setActionLoading(true);
      try {
        await setOverride(orgId, productId, versionId, stateCode, path, value, baseValue, extra);
      } finally {
        setActionLoading(false);
      }
    },
    [orgId, productId, versionId, stateCode],
  );

  const revertField = useCallback(
    async (path: string) => {
      setActionLoading(true);
      try {
        await removeOverride(orgId, productId, versionId, stateCode, path);
      } finally {
        setActionLoading(false);
      }
    },
    [orgId, productId, versionId, stateCode],
  );

  const promoteField = useCallback(
    async (path: string, currentBaseConfig: Record<string, unknown>) => {
      setActionLoading(true);
      try {
        return await promoteOverrideToBase(
          orgId, productId, versionId, stateCode, path, currentBaseConfig,
        );
      } finally {
        setActionLoading(false);
      }
    },
    [orgId, productId, versionId, stateCode],
  );

  return { setField, revertField, promoteField, actionLoading };
}
