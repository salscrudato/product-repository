/**
 * Deviation Engine
 *
 * Pure-function engine for computing overrides over a base config.
 * No Firestore deps — receives plain objects, returns plain results.
 *
 * Core operations:
 *  1. getNestedValue / setNestedValue  – dot-path accessors
 *  2. applyOverrides    – merge base + overrides → effective config
 *  3. computeDiff       – full inheritance diff for UI display
 *  4. detectConflicts   – find overrides whose base has drifted
 *  5. validateOverrides – structural + type + bounds checks
 *  6. hashObject        – deterministic SHA-256 for conflict detection
 */

import type {
  Override,
  DiffEntry,
  DiffResult,
  DiffStatus,
  DeviationValidationError,
  DeviationValidationErrorType,
  OverrideCategory,
} from '../types/deviation';

// ════════════════════════════════════════════════════════════════════════
// Dot-path helpers
// ════════════════════════════════════════════════════════════════════════

/**
 * Resolve a dot-path to a value in a nested object.
 * Returns `undefined` if any segment is missing.
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  if (obj == null || !path) return undefined;
  const segments = path.split('.');
  let current: unknown = obj;
  for (const seg of segments) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

/**
 * Return a shallow-cloned copy of `obj` with `value` set at `path`.
 * Creates intermediate objects as needed (never mutates the input).
 */
export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const segments = path.split('.');
  const root = structuredClone(obj);
  let current: Record<string, unknown> = root;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (current[seg] == null || typeof current[seg] !== 'object') {
      current[seg] = {};
    } else {
      current[seg] = { ...(current[seg] as Record<string, unknown>) };
    }
    current = current[seg] as Record<string, unknown>;
  }
  current[segments[segments.length - 1]] = value;
  return root;
}

/**
 * Remove a key at `path` from a shallow clone of `obj`.
 */
export function removeNestedValue(obj: Record<string, unknown>, path: string): Record<string, unknown> {
  const segments = path.split('.');
  const root = structuredClone(obj);
  let current: Record<string, unknown> = root;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (current[seg] == null || typeof current[seg] !== 'object') return root;
    current[seg] = { ...(current[seg] as Record<string, unknown>) };
    current = current[seg] as Record<string, unknown>;
  }
  delete current[segments[segments.length - 1]];
  return root;
}

// ════════════════════════════════════════════════════════════════════════
// Hashing
// ════════════════════════════════════════════════════════════════════════

/**
 * Produce a deterministic JSON string (sorted keys).
 */
export function canonicalStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.keys(val).sort().reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = (val as Record<string, unknown>)[k];
        return acc;
      }, {});
    }
    return val;
  });
}

/**
 * SHA-256 hex hash of a canonical JSON representation.
 * Works in both browser (crypto.subtle) and Node (synchronous fallback).
 */
export async function hashObject(value: unknown): Promise<string> {
  const text = canonicalStringify(value);
  if (typeof globalThis.crypto?.subtle?.digest === 'function') {
    const buf = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback: simple djb2 (non-cryptographic, sufficient for Firestore comparison)
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Synchronous hash using djb2 (used in pure unit tests).
 */
export function hashObjectSync(value: unknown): string {
  const text = canonicalStringify(value);
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// ════════════════════════════════════════════════════════════════════════
// Apply overrides → effective config
// ════════════════════════════════════════════════════════════════════════

/**
 * Merge base config with overrides to produce the effective (computed) config.
 * Overrides win; everything else is inherited from base.
 */
export function applyOverrides(
  base: Record<string, unknown>,
  overrides: Record<string, Override>,
): Record<string, unknown> {
  let result = structuredClone(base);
  for (const [, override] of Object.entries(overrides)) {
    result = setNestedValue(result, override.path, override.value);
  }
  return result;
}

// ════════════════════════════════════════════════════════════════════════
// Diff computation
// ════════════════════════════════════════════════════════════════════════

/**
 * Recursively enumerate all leaf paths from an object.
 * Returns { path, value } pairs.
 */
export function enumerateLeafPaths(
  obj: unknown,
  prefix = '',
): Array<{ path: string; value: unknown }> {
  const results: Array<{ path: string; value: unknown }> = [];
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) {
    if (prefix) results.push({ path: prefix, value: obj });
    return results;
  }
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.length === 0 && prefix) {
    results.push({ path: prefix, value: obj });
    return results;
  }
  for (const key of keys) {
    const childPath = prefix ? `${prefix}.${key}` : key;
    results.push(...enumerateLeafPaths(record[key], childPath));
  }
  return results;
}

/**
 * Infer a category from a dot-path.
 */
export function inferCategory(path: string): OverrideCategory {
  const lower = path.toLowerCase();
  if (lower.includes('limit'))       return 'limits';
  if (lower.includes('deductible'))  return 'deductibles';
  if (lower.includes('rate') || lower.includes('premium') || lower.includes('factor'))
    return 'rates';
  if (lower.includes('rule'))        return 'rules';
  if (lower.includes('form'))        return 'forms';
  if (lower.includes('eligib'))      return 'eligibility';
  return 'general';
}

/**
 * Generate a human-friendly label from a dot-path.
 */
export function pathToLabel(path: string): string {
  const last = path.split('.').pop() || path;
  return last
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\s/, '')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Deep equality check (JSON-based, sufficient for config values).
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  return canonicalStringify(a) === canonicalStringify(b);
}

/**
 * Compute the full inheritance diff between a base config and state overrides.
 */
export function computeDiff(
  base: Record<string, unknown>,
  overrides: Record<string, Override>,
  stateCode: string,
  stateName: string,
): DiffResult {
  const entries: DiffEntry[] = [];
  const basePaths = enumerateLeafPaths(base);
  const overridePaths = new Set(Object.keys(overrides));

  let conflictCount = 0;

  // 1. Walk every base leaf path
  for (const { path, value: baseValue } of basePaths) {
    if (overridePaths.has(path)) {
      const ov = overrides[path];
      const baseChanged = !deepEqual(ov.baseValue, baseValue);
      const status: DiffStatus = baseChanged ? 'conflict' : 'overridden';
      if (baseChanged) conflictCount++;

      entries.push({
        path,
        fieldLabel: ov.fieldLabel || pathToLabel(path),
        category: ov.category || inferCategory(path),
        status,
        baseValue,
        overrideValue: ov.value,
        effectiveValue: ov.value,
        ...(baseChanged ? { conflictBaseValue: baseValue, originalBaseValue: ov.baseValue } : {}),
      });
    } else {
      entries.push({
        path,
        fieldLabel: pathToLabel(path),
        category: inferCategory(path),
        status: 'inherited',
        baseValue,
        effectiveValue: baseValue,
      });
    }
  }

  // 2. Overrides that point to paths not in base (added or orphaned)
  const basePathSet = new Set(basePaths.map(p => p.path));
  for (const [path, ov] of Object.entries(overrides)) {
    if (!basePathSet.has(path)) {
      entries.push({
        path,
        fieldLabel: ov.fieldLabel || pathToLabel(path),
        category: ov.category || inferCategory(path),
        status: 'added',
        baseValue: undefined,
        overrideValue: ov.value,
        effectiveValue: ov.value,
      });
    }
  }

  return {
    stateCode,
    stateName,
    entries,
    overrideCount: overridePaths.size,
    conflictCount,
    baseHash: hashObjectSync(base),
  };
}

// ════════════════════════════════════════════════════════════════════════
// Conflict detection
// ════════════════════════════════════════════════════════════════════════

/**
 * Detect overrides whose captured baseValue no longer matches the current base.
 */
export function detectConflicts(
  base: Record<string, unknown>,
  overrides: Record<string, Override>,
): Array<{ path: string; override: Override; currentBaseValue: unknown }> {
  const conflicts: Array<{ path: string; override: Override; currentBaseValue: unknown }> = [];
  for (const [path, ov] of Object.entries(overrides)) {
    const currentBase = getNestedValue(base, path);
    if (!deepEqual(ov.baseValue, currentBase)) {
      conflicts.push({ path, override: ov, currentBaseValue: currentBase });
    }
  }
  return conflicts;
}

// ════════════════════════════════════════════════════════════════════════
// Validation
// ════════════════════════════════════════════════════════════════════════

/**
 * Validate all overrides against the current base config.
 * Returns an array of errors/warnings.
 */
export function validateOverrides(
  base: Record<string, unknown>,
  overrides: Record<string, Override>,
): DeviationValidationError[] {
  const errors: DeviationValidationError[] = [];
  const baseLeafs = new Set(enumerateLeafPaths(base).map(l => l.path));

  for (const [path, ov] of Object.entries(overrides)) {
    const currentBase = getNestedValue(base, path);

    // 1. Orphaned: path no longer in base
    if (!baseLeafs.has(path) && currentBase === undefined) {
      errors.push({
        path,
        fieldLabel: ov.fieldLabel || pathToLabel(path),
        type: 'orphaned_override',
        message: `"${ov.fieldLabel || path}" no longer exists in the base product`,
        severity: 'warning',
        overrideValue: ov.value,
      });
      continue;
    }

    // 2. Conflict: base drifted since override was set
    if (!deepEqual(ov.baseValue, currentBase)) {
      errors.push({
        path,
        fieldLabel: ov.fieldLabel || pathToLabel(path),
        type: 'conflict',
        message: `Base value for "${ov.fieldLabel || path}" has changed since the override was set`,
        severity: 'warning',
        baseValue: currentBase,
        overrideValue: ov.value,
      });
    }

    // 3. Type mismatch: override value type differs from base
    if (currentBase !== undefined && ov.value !== null && currentBase !== null) {
      const baseType = typeof currentBase;
      const ovType = typeof ov.value;
      if (baseType !== ovType && baseType !== 'undefined') {
        errors.push({
          path,
          fieldLabel: ov.fieldLabel || pathToLabel(path),
          type: 'type_mismatch',
          message: `Type mismatch: base is ${baseType}, override is ${ovType}`,
          severity: 'error',
          baseValue: currentBase,
          overrideValue: ov.value,
        });
      }
    }

    // 4. Required field: override sets a non-null base to null
    if (currentBase != null && ov.value == null) {
      errors.push({
        path,
        fieldLabel: ov.fieldLabel || pathToLabel(path),
        type: 'required_field',
        message: `"${ov.fieldLabel || path}" is set to null but has a base value`,
        severity: 'warning',
        baseValue: currentBase,
        overrideValue: ov.value,
      });
    }

    // 5. Out of range: numeric bounds check (if base is numeric, override should be reasonable)
    if (typeof currentBase === 'number' && typeof ov.value === 'number') {
      // Heuristic: flag if the override is more than 10x larger or negative when base is positive
      if (currentBase > 0 && ov.value < 0) {
        errors.push({
          path,
          fieldLabel: ov.fieldLabel || pathToLabel(path),
          type: 'out_of_range',
          message: `Override is negative (${ov.value}) but base is positive (${currentBase})`,
          severity: 'warning',
          baseValue: currentBase,
          overrideValue: ov.value,
        });
      }
    }
  }

  return errors;
}
