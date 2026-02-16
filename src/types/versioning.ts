/**
 * Versioning Types
 * Shared types for the versioning/effective-dating system across all modules
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Version Status
// ============================================================================

/**
 * Status workflow: draft → review → approved → filed → published → archived
 */
export type VersionStatus = 
  | 'draft'      // Being edited, not yet ready for review
  | 'review'     // Submitted for review
  | 'approved'   // Approved by reviewer
  | 'filed'      // Filed with regulatory body
  | 'published'  // Active and immutable
  | 'archived';  // No longer active, kept for history

/**
 * Transitions allowed from each status
 */
export const VERSION_STATUS_TRANSITIONS: Record<VersionStatus, VersionStatus[]> = {
  draft: ['review', 'archived'],
  review: ['draft', 'approved', 'archived'],
  approved: ['review', 'filed', 'published', 'archived'],
  filed: ['published', 'archived'],
  published: ['archived'],
  archived: [],
};

/**
 * Status display configuration
 */
export const VERSION_STATUS_CONFIG: Record<VersionStatus, { label: string; color: string; icon: string }> = {
  draft: { label: 'Draft', color: '#6B7280', icon: 'edit' },
  review: { label: 'In Review', color: '#F59E0B', icon: 'eye' },
  approved: { label: 'Approved', color: '#10B981', icon: 'check' },
  filed: { label: 'Filed', color: '#3B82F6', icon: 'file-text' },
  published: { label: 'Published', color: '#059669', icon: 'check-circle' },
  archived: { label: 'Archived', color: '#9CA3AF', icon: 'archive' },
};

// ============================================================================
// Entity Types
// ============================================================================

/**
 * Entity types that support versioning
 */
export type VersionedEntityType = 
  | 'product'
  | 'coverage'
  | 'form'
  | 'rule'
  | 'rateProgram'
  | 'table'
  | 'dataDictionary';

// ============================================================================
// Version Metadata
// ============================================================================

/**
 * Core version metadata that applies to all versioned entities
 */
export interface VersionMetadata {
  /** Incremental version number (1, 2, 3, ...) */
  versionNumber: number;
  
  /** Current status in the workflow */
  status: VersionStatus;
  
  /** When this version becomes effective (ISO date) */
  effectiveStart: string | null;
  
  /** When this version expires (ISO date), null = no expiration */
  effectiveEnd: string | null;
  
  /** When this version was created */
  createdAt: Timestamp;
  
  /** User who created this version */
  createdBy: string;
  
  /** When this version was last updated */
  updatedAt: Timestamp;
  
  /** User who last updated this version */
  updatedBy: string;
  
  /** Brief summary of what changed in this version */
  summary?: string;
  
  /** Detailed notes about this version */
  notes?: string;
  
  /** If cloned, the source version ID */
  clonedFromVersionId?: string;
  
  /** ID of the user who published this version (if published) */
  publishedBy?: string;
  
  /** When this version was published (if published) */
  publishedAt?: Timestamp;
}

/**
 * Base versioned document - extends with entity-specific data
 */
export interface VersionedDocument<T> extends VersionMetadata {
  /** Version document ID */
  id: string;
  
  /** Reference to parent entity ID */
  entityId: string;
  
  /** The actual versioned data */
  data: T;
}

// ============================================================================
// Parent Entity Metadata
// ============================================================================

/**
 * Metadata stored on the parent entity document (not the version)
 */
export interface VersionedEntityMetadata {
  /** ID of the latest published version (for quick access) */
  latestPublishedVersionId?: string;
  
  /** ID of the latest draft version (for quick access) */
  latestDraftVersionId?: string;
  
  /** Total number of versions */
  versionCount?: number;
  
  /** Whether the entity is archived (soft delete) */
  archived?: boolean;
}

// ============================================================================
// Version Comparison
// ============================================================================

/**
 * Represents a difference between two versions
 */
export interface VersionDiff {
  /** The field path that changed (e.g., 'name', 'limits[0].amount') */
  path: string;
  
  /** The type of change */
  type: 'added' | 'removed' | 'changed';
  
  /** Old value (undefined for 'added') */
  oldValue?: unknown;
  
  /** New value (undefined for 'removed') */
  newValue?: unknown;
  
  /** Human-readable label for the field */
  label?: string;
}

/**
 * Result of comparing two versions
 */
export interface VersionComparisonResult {
  /** The versions being compared */
  leftVersionId: string;
  rightVersionId: string;
  
  /** List of differences */
  diffs: VersionDiff[];
  
  /** Whether versions are identical */
  isIdentical: boolean;
  
  /** Number of fields changed */
  changeCount: number;
}

