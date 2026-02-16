/**
 * Hash Utilities for Determinism Verification
 * 
 * Provides deterministic hashing for rating engine inputs and outputs.
 * Uses a simple but reliable hash algorithm suitable for browser environments.
 */

/**
 * Create a deterministic hash from any JSON-serializable value.
 * Uses a variant of djb2 algorithm for fast, consistent hashing.
 */
export function createHash(value: unknown): string {
  const str = canonicalStringify(value);
  return djb2Hash(str);
}

/**
 * Canonical JSON stringify that produces consistent output regardless of
 * property insertion order.
 */
export function canonicalStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'number') {
    // Handle special numeric values
    if (Number.isNaN(value)) return 'NaN';
    if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
    // Use fixed precision to avoid floating point inconsistencies
    return value.toFixed(10);
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (Array.isArray(value)) {
    const items = value.map(item => canonicalStringify(item));
    return '[' + items.join(',') + ']';
  }

  if (typeof value === 'object') {
    // Handle Date objects
    if (value instanceof Date) {
      return `"${value.toISOString()}"`;
    }

    // Handle Map
    if (value instanceof Map) {
      const entries = Array.from(value.entries())
        .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
        .map(([k, v]) => `${canonicalStringify(k)}:${canonicalStringify(v)}`);
      return '{' + entries.join(',') + '}';
    }

    // Handle regular objects - sort keys for consistency
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(key => `${JSON.stringify(key)}:${canonicalStringify(obj[key])}`);
    return '{' + pairs.join(',') + '}';
  }

  return String(value);
}

/**
 * DJB2 hash algorithm - fast and produces good distribution.
 * Returns a hex string for readability.
 */
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) + hash) ^ char; // hash * 33 XOR char
    hash = hash >>> 0; // Convert to unsigned 32-bit integer
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Create a hash of rating steps for version comparison.
 */
export function hashSteps(steps: { id: string; [key: string]: unknown }[]): string {
  // Sort steps by order for consistent hashing
  const sortedSteps = [...steps].sort((a, b) => {
    const orderA = typeof a.order === 'number' ? a.order : 0;
    const orderB = typeof b.order === 'number' ? b.order : 0;
    return orderA - orderB;
  });

  // Create hash of essential step properties
  const essentialData = sortedSteps.map(step => ({
    id: step.id,
    type: step.type,
    order: step.order,
    outputFieldCode: step.outputFieldCode,
    inputs: step.inputs,
    enabled: step.enabled,
    constantValue: step.constantValue,
    factorValue: step.factorValue,
    expression: step.expression,
    tableVersionId: step.tableVersionId,
    roundingMode: step.roundingMode,
    roundingPrecision: step.roundingPrecision,
  }));

  return createHash(essentialData);
}

/**
 * Create a hash of evaluation inputs for determinism verification.
 */
export function hashInputs(inputs: Record<string, unknown>): string {
  return createHash(inputs);
}

/**
 * Create a hash of evaluation outputs for result verification.
 */
export function hashOutputs(outputs: Record<string, number>): string {
  return createHash(outputs);
}

/**
 * Combine multiple hashes into a single verification hash.
 */
export function combineHashes(...hashes: string[]): string {
  return createHash(hashes.join(':'));
}

