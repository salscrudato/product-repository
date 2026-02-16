/**
 * Versioning Utilities
 * Shared utility functions for the versioning system
 */

import {
  VersionStatus,
  VersionMetadata,
  VersionDiff,
  VersionComparisonResult,
  VERSION_STATUS_TRANSITIONS,
} from '@/types/versioning';

// ============================================================================
// Status Helpers
// ============================================================================

/**
 * Check if a transition from one status to another is allowed
 */
export function canTransitionTo(currentStatus: VersionStatus, targetStatus: VersionStatus): boolean {
  return VERSION_STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}

/**
 * Check if a version is editable (only drafts can be edited)
 */
export function isVersionEditable(status: VersionStatus): boolean {
  return status === 'draft';
}

/**
 * Check if a version is immutable (published versions cannot be changed)
 */
export function isVersionImmutable(status: VersionStatus): boolean {
  return status === 'published' || status === 'archived';
}

/**
 * Check if a version is active (effective and not expired)
 */
export function isVersionActive(
  effectiveStart: string | null,
  effectiveEnd: string | null,
  referenceDate: Date = new Date()
): boolean {
  const refTime = referenceDate.getTime();
  
  if (effectiveStart) {
    const startTime = new Date(effectiveStart).getTime();
    if (refTime < startTime) return false;
  }
  
  if (effectiveEnd) {
    const endTime = new Date(effectiveEnd).getTime();
    if (refTime > endTime) return false;
  }
  
  return true;
}

/**
 * Get the next available status transitions
 */
export function getAvailableTransitions(currentStatus: VersionStatus): VersionStatus[] {
  return VERSION_STATUS_TRANSITIONS[currentStatus] ?? [];
}

// ============================================================================
// Version Number Helpers
// ============================================================================

/**
 * Get the next version number given existing versions
 */
export function getNextVersionNumber(existingVersionNumbers: number[]): number {
  if (existingVersionNumbers.length === 0) return 1;
  return Math.max(...existingVersionNumbers) + 1;
}

/**
 * Format version number for display
 */
export function formatVersionNumber(versionNumber: number): string {
  return `v${versionNumber}`;
}

// ============================================================================
// Deep Diff Utility
// ============================================================================

/**
 * Compare two objects and return the differences
 */
export function deepDiff(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  path: string = '',
  diffs: VersionDiff[] = []
): VersionDiff[] {
  const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
  
  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;
    const oldValue = oldObj?.[key];
    const newValue = newObj?.[key];
    
    // Skip metadata fields
    if (['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'].includes(key)) {
      continue;
    }
    
    if (oldValue === undefined && newValue !== undefined) {
      diffs.push({ path: currentPath, type: 'added', newValue });
    } else if (oldValue !== undefined && newValue === undefined) {
      diffs.push({ path: currentPath, type: 'removed', oldValue });
    } else if (typeof oldValue === 'object' && typeof newValue === 'object' && 
               oldValue !== null && newValue !== null &&
               !Array.isArray(oldValue) && !Array.isArray(newValue)) {
      deepDiff(
        oldValue as Record<string, unknown>,
        newValue as Record<string, unknown>,
        currentPath,
        diffs
      );
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      diffs.push({ path: currentPath, type: 'changed', oldValue, newValue });
    }
  }
  
  return diffs;
}

/**
 * Compare two versions and return comparison result
 */
export function compareVersions<T extends Record<string, unknown>>(
  leftVersionId: string,
  leftData: T,
  rightVersionId: string,
  rightData: T
): VersionComparisonResult {
  const diffs = deepDiff(leftData, rightData);
  
  return {
    leftVersionId,
    rightVersionId,
    diffs,
    isIdentical: diffs.length === 0,
    changeCount: diffs.length,
  };
}

// ============================================================================
// Clone Utility
// ============================================================================

/**
 * Deep clone an object, stripping version-specific metadata
 */
export function cloneForNewVersion<T extends Record<string, unknown>>(
  source: T,
  fieldsToStrip: string[] = ['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'publishedAt', 'publishedBy']
): Partial<T> {
  const cloned = JSON.parse(JSON.stringify(source));
  
  for (const field of fieldsToStrip) {
    delete cloned[field];
  }
  
  return cloned;
}

