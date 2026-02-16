/**
 * State Deviation Types
 *
 * Structured override system layered over base product defaults.
 * Each override is a patch keyed by a dot-path into the base config,
 * with provenance (who, when, why) and a content-hash for conflict detection.
 *
 * Firestore augmentation on:
 *   .../statePrograms/{stateCode}
 *     overrides      – Record<dotPath, Override>
 *     overrideNotes  – Record<dotPath, string>
 *     computedSnapshotHash – string
 *     validationErrors – DeviationValidationError[]
 */

import { Timestamp } from 'firebase/firestore';

// ════════════════════════════════════════════════════════════════════════
// Override (single field-level patch)
// ════════════════════════════════════════════════════════════════════════

/**
 * Category tags help the UI group deviations by domain.
 */
export type OverrideCategory =
  | 'limits'
  | 'deductibles'
  | 'rates'
  | 'rules'
  | 'forms'
  | 'eligibility'
  | 'general';

/**
 * A single patch to one field in the base product config.
 *
 * `path` uses dot-notation, e.g. "coverages.CGL.limits.perOccurrence"
 * `baseValue` is captured at the time the override was created (for conflict detection).
 * `value` is the state-specific replacement.
 */
export interface Override {
  /** Dot-path into the base config object */
  path: string;
  /** The base product value at time of override creation */
  baseValue: unknown;
  /** The state-specific replacement value */
  value: unknown;
  /** Human-readable field label for display */
  fieldLabel: string;
  /** Grouping category */
  category: OverrideCategory;
  /** Who created / last modified this override */
  updatedBy: string;
  updatedAt: Timestamp;
  /** User-facing note explaining why this state differs */
  note?: string;
}

// ════════════════════════════════════════════════════════════════════════
// Computed Snapshot
// ════════════════════════════════════════════════════════════════════════

/**
 * The result of merging base defaults + overrides.
 * Stored as a hash so we can detect whether base edits conflict.
 */
export interface ComputedSnapshot {
  /** SHA-256 hex hash of JSON.stringify(canonical(baseValues used)) */
  baseHash: string;
  /** SHA-256 hex hash of JSON.stringify(canonical(mergedResult)) */
  mergedHash: string;
  /** ISO timestamp of last computation */
  computedAt: string;
}

// ════════════════════════════════════════════════════════════════════════
// Diff (inheritance visualisation)
// ════════════════════════════════════════════════════════════════════════

export type DiffStatus = 'inherited' | 'overridden' | 'conflict' | 'added' | 'removed';

/**
 * One row in the inheritance/diff view.
 */
export interface DiffEntry {
  /** Dot-path */
  path: string;
  /** Human label */
  fieldLabel: string;
  /** Category for grouping */
  category: OverrideCategory;
  /** Inheritance status */
  status: DiffStatus;
  /** Current base product value */
  baseValue: unknown;
  /** Override value (if overridden) */
  overrideValue?: unknown;
  /** Effective (merged) value shown to the user */
  effectiveValue: unknown;
  /** If status=conflict: the base changed since the override was created */
  conflictBaseValue?: unknown;
  /** Original base value when the override was captured */
  originalBaseValue?: unknown;
}

/**
 * Full diff result for one state.
 */
export interface DiffResult {
  stateCode: string;
  stateName: string;
  entries: DiffEntry[];
  overrideCount: number;
  conflictCount: number;
  /** Hash of the base config used to compute this diff */
  baseHash: string;
}

// ════════════════════════════════════════════════════════════════════════
// Validation
// ════════════════════════════════════════════════════════════════════════

export type DeviationValidationErrorType =
  | 'conflict'              // Base value changed after override was set
  | 'type_mismatch'         // Override value type doesn't match base
  | 'out_of_range'          // Numeric override outside allowed bounds
  | 'required_field'        // Override removes a required value
  | 'orphaned_override'     // Override path no longer exists in base
  | 'regulatory_conflict';  // Override violates a state regulatory constraint

export interface DeviationValidationError {
  path: string;
  fieldLabel: string;
  type: DeviationValidationErrorType;
  message: string;
  severity: 'error' | 'warning';
  /** If conflict: the new base value that caused it */
  baseValue?: unknown;
  /** The override value that is now stale/invalid */
  overrideValue?: unknown;
}

// ════════════════════════════════════════════════════════════════════════
// Promote / Revert actions
// ════════════════════════════════════════════════════════════════════════

/**
 * Action to promote a state override to the base product default.
 * After promotion the override is removed (the value is now inherited).
 */
export interface PromoteAction {
  path: string;
  overrideValue: unknown;
  /** Will this promotion affect other states? */
  affectedStateCodes: string[];
}

/**
 * Action to revert a state override back to the base default.
 */
export interface RevertAction {
  path: string;
  currentOverrideValue: unknown;
  baseValue: unknown;
}

// ════════════════════════════════════════════════════════════════════════
// Augmented StateProgram shape (extends existing StateProgram)
// ════════════════════════════════════════════════════════════════════════

/**
 * The fields we add to the existing StateProgram document.
 * These are merged at the Firestore level — no schema migration needed.
 */
export interface StateProgramOverrideFields {
  /** Keyed by dot-path */
  overrides: Record<string, Override>;
  /** Short notes per override (convenience for quick display) */
  overrideNotes: Record<string, string>;
  /** Hash of the last computed snapshot for conflict detection */
  computedSnapshotHash: string;
  /** Deviation-specific validation errors */
  deviationValidationErrors: DeviationValidationError[];
}
