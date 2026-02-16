/**
 * Form Types
 * First-class forms repository: editioning, metadata, "where used", and impact tracking
 *
 * Data model:
 *   orgs/{orgId}/forms/{formId}                         — top-level form doc
 *   orgs/{orgId}/forms/{formId}/versions/{formVersionId} — form editions/versions
 *   orgs/{orgId}/formUses/{useId}                        — "where used" junction records
 */

import { Timestamp } from 'firebase/firestore';
import type { VersionStatus } from './versioning';

// ============================================================================
// Form Types & Constants
// ============================================================================

/** Whether this form is ISO or manuscript */
export type FormOrigin = 'iso' | 'manuscript';

/** High-level form type */
export type FormType =
  | 'policy'
  | 'endorsement'
  | 'notice'
  | 'application'
  | 'declaration'
  | 'schedule'
  | 'certificate'
  | 'other';

/** How this form is used in context of a product */
export type FormUseType = 'base' | 'endorsement' | 'notice' | 'condition';

/** Status for the indexing/text-extraction pipeline */
export type FormIndexingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export const FORM_TYPE_LABELS: Record<FormType, string> = {
  policy: 'Policy Form',
  endorsement: 'Endorsement',
  notice: 'Notice',
  application: 'Application',
  declaration: 'Declaration Page',
  schedule: 'Schedule',
  certificate: 'Certificate',
  other: 'Other',
};

export const FORM_USE_TYPE_LABELS: Record<FormUseType, string> = {
  base: 'Base Form',
  endorsement: 'Endorsement',
  notice: 'Notice',
  condition: 'Condition',
};

export const FORM_ORIGIN_LABELS: Record<FormOrigin, string> = {
  iso: 'ISO',
  manuscript: 'Manuscript',
};

// ============================================================================
// Form Document (top-level)
// ============================================================================

/**
 * Top-level form document stored at orgs/{orgId}/forms/{formId}.
 * Contains the stable identity and metadata for a form.
 */
export interface OrgForm {
  id: string;
  orgId: string;

  /** ISO/bureau form number, e.g. "CG 00 01" */
  formNumber: string;
  /** Human-readable title */
  title: string;
  /** ISO vs. manuscript */
  isoOrManuscript: FormOrigin;
  /** High-level form type */
  type: FormType;
  /** Optional description/notes */
  description?: string;

  /** Product IDs this form applies to (convenience denormalised field) */
  productIds?: string[];

  /** Quick-access version pointers */
  latestPublishedVersionId?: string;
  latestDraftVersionId?: string;
  versionCount: number;

  /** Soft-delete flag */
  archived: boolean;

  /** Audit fields */
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================================
// Form Version (edition)
// ============================================================================

/**
 * Form edition stored at orgs/{orgId}/forms/{formId}/versions/{formVersionId}.
 * Represents a specific edition of the form (e.g. 01/2024 edition).
 */
export interface OrgFormVersion {
  id: string;
  formId: string;

  /** Incremental version number */
  versionNumber: number;

  /** Edition date string (e.g. "01/2024") */
  editionDate: string;

  /** Jurisdictions this edition applies to (state codes) */
  jurisdiction: string[];

  /** Version lifecycle status */
  status: VersionStatus;

  /** When this form version becomes effective */
  effectiveStart: string | null;
  /** When this form version expires */
  effectiveEnd: string | null;

  /** Cloud Storage path for the PDF */
  storagePath?: string;
  /** SHA-256 checksum of the stored file */
  checksum?: string;
  /** Extracted text content (or reference URI) */
  extractedText?: string;
  /** Status of the text-extraction/indexing pipeline */
  indexingStatus?: FormIndexingStatus;

  /** Summary/description of what changed */
  summary?: string;
  /** Detailed notes */
  notes?: string;

  /** If cloned, the source version ID */
  clonedFromVersionId?: string;

  /** Audit fields */
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
  publishedAt?: Timestamp;
  publishedBy?: string;
}

// ============================================================================
// Form Use (where-used junction)
// ============================================================================

/**
 * A "where used" record stored at orgs/{orgId}/formUses/{useId}.
 * Links a form version to a product version, with optional state/coverage scope.
 */
export interface FormUse {
  id: string;
  orgId: string;

  /** Which form version this usage references */
  formId: string;
  formVersionId: string;

  /** Which product version this form is attached to */
  productVersionId: string;

  /** Optional: specific coverage version this usage scopes to */
  coverageVersionId?: string;

  /** Optional: state code for state-specific usage */
  stateCode?: string;

  /** How this form is used */
  useType: FormUseType;

  /** Denormalised convenience fields (kept in sync on write) */
  formNumber?: string;
  formTitle?: string;
  productName?: string;
  coverageName?: string;

  /** Audit fields */
  createdAt: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

// ============================================================================
// Aggregated view helpers
// ============================================================================

/** A form + its published version count + total uses */
export interface FormWithStats {
  form: OrgForm;
  publishedVersionCount: number;
  totalUses: number;
  latestEditionDate?: string;
}

/** Result of an impact analysis when a form version changes */
export interface FormImpactResult {
  formId: string;
  formVersionId: string;
  formNumber: string;
  formTitle: string;
  editionDate: string;
  /** All "where used" records that reference this version */
  affectedUses: FormUse[];
  /** De-duplicated product version IDs */
  affectedProductVersionIds: string[];
  /** De-duplicated coverage version IDs */
  affectedCoverageVersionIds: string[];
  /** De-duplicated state codes */
  affectedStates: string[];
  /** Whether any of the uses are published (requiring re-approval) */
  requiresReApproval: boolean;
}

/** Readiness summary for Product 360 */
export interface FormReadinessCheck {
  totalForms: number;
  publishedForms: number;
  draftForms: number;
  totalUses: number;
  /** Forms with no published versions */
  unpublishedFormIds: string[];
  /** Forms used in products but still in draft */
  draftFormsInUse: Array<{ formId: string; formNumber: string; productVersionIds: string[] }>;
  /** Forms with no "where used" references at all */
  orphanedForms: Array<{ formId: string; formNumber: string }>;
  issues: string[];
  healthy: boolean;
}
