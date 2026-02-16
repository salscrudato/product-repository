/**
 * Deviation Service
 *
 * Firestore-backed service for managing state overrides,
 * computing snapshots, promoting/reverting, and fetching diffs.
 *
 * Works against the augmented statePrograms/{stateCode} document.
 */

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth, safeOnSnapshot } from '../firebase';
import logger, { LOG_CATEGORIES } from '../utils/logger';

import type {
  Override,
  OverrideCategory,
  DiffResult,
  DeviationValidationError,
  StateProgramOverrideFields,
} from '../types/deviation';

import {
  applyOverrides,
  computeDiff,
  validateOverrides,
  hashObject,
  getNestedValue,
  setNestedValue,
  pathToLabel,
  inferCategory,
  deepEqual,
} from '../engine/deviationEngine';

import {
  fetchStatePrograms,
  getStateProgramPath,
} from './stateProgramService';

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

function requireAuth(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

// ════════════════════════════════════════════════════════════════════════
// Read overrides from a state program
// ════════════════════════════════════════════════════════════════════════

/**
 * Fetch the override map for one state.
 * Returns an empty record if none set.
 */
export async function getOverrides(
  orgId: string,
  productId: string,
  versionId: string,
  stateCode: string,
): Promise<Record<string, Override>> {
  const path = getStateProgramPath(orgId, productId, versionId, stateCode);
  const snap = await getDoc(doc(db, path));
  if (!snap.exists()) return {};
  return (snap.data().overrides as Record<string, Override>) || {};
}

/**
 * Real-time subscription to a state program's overrides.
 */
export function subscribeToOverrides(
  orgId: string,
  productId: string,
  versionId: string,
  stateCode: string,
  callback: (overrides: Record<string, Override>, validationErrors: DeviationValidationError[]) => void,
): Unsubscribe {
  const path = getStateProgramPath(orgId, productId, versionId, stateCode);
  return safeOnSnapshot(doc(db, path), (snap) => {
    if (!snap.exists()) { callback({}, []); return; }
    const data = snap.data();
    callback(
      (data.overrides as Record<string, Override>) || {},
      (data.deviationValidationErrors as DeviationValidationError[]) || [],
    );
  });
}

// ════════════════════════════════════════════════════════════════════════
// Write overrides
// ════════════════════════════════════════════════════════════════════════

/**
 * Set (create or update) a single override on a state program.
 * Captures the current base value for conflict detection.
 */
export async function setOverride(
  orgId: string,
  productId: string,
  versionId: string,
  stateCode: string,
  overridePath: string,
  value: unknown,
  baseValue: unknown,
  opts?: { fieldLabel?: string; category?: OverrideCategory; note?: string },
): Promise<void> {
  const uid = requireAuth();
  const docPath = getStateProgramPath(orgId, productId, versionId, stateCode);

  const override: Override = {
    path: overridePath,
    baseValue,
    value,
    fieldLabel: opts?.fieldLabel || pathToLabel(overridePath),
    category: opts?.category || inferCategory(overridePath),
    updatedBy: uid,
    updatedAt: Timestamp.now(),
    note: opts?.note,
  };

  await updateDoc(doc(db, docPath), {
    [`overrides.${overridePath}`]: override,
    [`overrideNotes.${overridePath}`]: opts?.note || '',
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });

  logger.info(LOG_CATEGORIES.DATA, 'Override set', { stateCode, path: overridePath });
}

/**
 * Remove a single override (revert to base).
 */
export async function removeOverride(
  orgId: string,
  productId: string,
  versionId: string,
  stateCode: string,
  overridePath: string,
): Promise<void> {
  const uid = requireAuth();
  const docPath = getStateProgramPath(orgId, productId, versionId, stateCode);
  const snap = await getDoc(doc(db, docPath));
  if (!snap.exists()) return;

  const overrides = { ...((snap.data().overrides as Record<string, Override>) || {}) };
  const notes = { ...((snap.data().overrideNotes as Record<string, string>) || {}) };
  delete overrides[overridePath];
  delete notes[overridePath];

  await updateDoc(doc(db, docPath), {
    overrides,
    overrideNotes: notes,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });

  logger.info(LOG_CATEGORIES.DATA, 'Override reverted', { stateCode, path: overridePath });
}

/**
 * Bulk set overrides (for batch import or copy-from-state).
 */
export async function bulkSetOverrides(
  orgId: string,
  productId: string,
  versionId: string,
  stateCode: string,
  overrides: Record<string, Override>,
): Promise<void> {
  const uid = requireAuth();
  const docPath = getStateProgramPath(orgId, productId, versionId, stateCode);

  const notes: Record<string, string> = {};
  for (const [path, ov] of Object.entries(overrides)) {
    notes[path] = ov.note || '';
  }

  await updateDoc(doc(db, docPath), {
    overrides,
    overrideNotes: notes,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
}

// ════════════════════════════════════════════════════════════════════════
// Diff + validation
// ════════════════════════════════════════════════════════════════════════

/**
 * Compute the full diff for one state, given the current base config.
 */
export async function getStateDiff(
  orgId: string,
  productId: string,
  versionId: string,
  stateCode: string,
  stateName: string,
  baseConfig: Record<string, unknown>,
): Promise<DiffResult> {
  const overrides = await getOverrides(orgId, productId, versionId, stateCode);
  return computeDiff(baseConfig, overrides, stateCode, stateName);
}

/**
 * Run validation on a state's overrides against the current base.
 * Writes results to Firestore and returns them.
 */
export async function runDeviationValidation(
  orgId: string,
  productId: string,
  versionId: string,
  stateCode: string,
  baseConfig: Record<string, unknown>,
): Promise<DeviationValidationError[]> {
  const uid = requireAuth();
  const overrides = await getOverrides(orgId, productId, versionId, stateCode);
  const errors = validateOverrides(baseConfig, overrides);

  // Compute snapshot hash for conflict detection
  const hash = await hashObject(baseConfig);

  const docPath = getStateProgramPath(orgId, productId, versionId, stateCode);
  await updateDoc(doc(db, docPath), {
    deviationValidationErrors: errors,
    computedSnapshotHash: hash,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });

  return errors;
}

/**
 * Batch validation: run validation for all states in a product version.
 */
export async function validateAllStates(
  orgId: string,
  productId: string,
  versionId: string,
  baseConfig: Record<string, unknown>,
): Promise<Map<string, DeviationValidationError[]>> {
  const programs = await fetchStatePrograms(orgId, productId, versionId);
  const results = new Map<string, DeviationValidationError[]>();

  for (const program of programs) {
    if (program.status === 'not_offered') continue;
    const errors = await runDeviationValidation(
      orgId, productId, versionId, program.stateCode, baseConfig,
    );
    results.set(program.stateCode, errors);
  }

  return results;
}

// ════════════════════════════════════════════════════════════════════════
// Promote override → base
// ════════════════════════════════════════════════════════════════════════

/**
 * Promote a state's override value to the base product config.
 *
 * This function:
 *  1. Reads the override value
 *  2. Returns the new base config with the value applied
 *  3. Removes the override from the state (it's now inherited)
 *  4. Lists which other states will be affected
 *
 * The caller is responsible for persisting the new base config.
 */
export async function promoteOverrideToBase(
  orgId: string,
  productId: string,
  versionId: string,
  stateCode: string,
  overridePath: string,
  currentBaseConfig: Record<string, unknown>,
): Promise<{
  newBaseConfig: Record<string, unknown>;
  affectedStateCodes: string[];
}> {
  const overrides = await getOverrides(orgId, productId, versionId, stateCode);
  const ov = overrides[overridePath];
  if (!ov) throw new Error(`Override not found at path: ${overridePath}`);

  // Apply to base
  const newBaseConfig = setNestedValue(currentBaseConfig, overridePath, ov.value);

  // Remove the override from the promoting state
  await removeOverride(orgId, productId, versionId, stateCode, overridePath);

  // Find other states that override the same path (they may now conflict)
  const allPrograms = await fetchStatePrograms(orgId, productId, versionId);
  const affected: string[] = [];

  for (const program of allPrograms) {
    if (program.stateCode === stateCode) continue;
    const otherOverrides = (program as unknown as Record<string, unknown>).overrides as Record<string, Override> | undefined;
    if (otherOverrides?.[overridePath]) {
      affected.push(program.stateCode);
    }
  }

  return { newBaseConfig, affectedStateCodes: affected };
}

// ════════════════════════════════════════════════════════════════════════
// Effective config
// ════════════════════════════════════════════════════════════════════════

/**
 * Compute the effective (merged) config for a state.
 */
export async function getEffectiveConfig(
  orgId: string,
  productId: string,
  versionId: string,
  stateCode: string,
  baseConfig: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const overrides = await getOverrides(orgId, productId, versionId, stateCode);
  return applyOverrides(baseConfig, overrides);
}
