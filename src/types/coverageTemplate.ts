/**
 * Coverage Template & First-Class Endorsement Types
 *
 * Enables reuse:
 *  - CoverageTemplate: reusable coverage blueprints with pre-configured
 *    limits, deductibles, forms, and endorsement bundles
 *  - OrgEndorsement + OrgEndorsementVersion: versioned endorsements that
 *    modify or extend coverages, with their own lifecycle
 *
 * Firestore:
 *  - orgs/{orgId}/coverageTemplates/{templateId}
 *  - orgs/{orgId}/endorsements/{endorsementId}/versions/{endorsementVersionId}
 */

import { Timestamp } from 'firebase/firestore';
import type { CoverageKind, EndorsementType, PremiumBasis, CoverageTrigger } from './index';
import type { VersionStatus } from './versioning';

// ════════════════════════════════════════════════════════════════════════
// Coverage Template
// ════════════════════════════════════════════════════════════════════════

/**
 * Template category for library faceting.
 */
export type TemplateCategoryTag =
  | 'general_liability'
  | 'commercial_property'
  | 'commercial_auto'
  | 'workers_comp'
  | 'professional_liability'
  | 'umbrella_excess'
  | 'inland_marine'
  | 'cyber'
  | 'custom';

/**
 * A reusable coverage blueprint. PMs create templates from existing coverages
 * and apply them when assembling new products.
 */
export interface CoverageTemplate {
  id: string;
  orgId: string;

  // Identity
  name: string;
  description: string;
  category: TemplateCategoryTag;
  tags: string[];

  // Coverage blueprint
  coverageKind: CoverageKind;
  coverageCode?: string;
  scopeOfCoverage?: string;
  perilsCovered?: string[];
  exclusions?: string[];

  // Financial defaults
  premiumBasis?: PremiumBasis;
  minimumPremium?: number;
  coverageTrigger?: CoverageTrigger;

  // Default limits (human-readable label + value)
  defaultLimits: TemplateLimitDef[];

  // Default deductibles
  defaultDeductibles: TemplateDeductibleDef[];

  // Bundled endorsement references (endorsement IDs from org)
  bundledEndorsementIds: string[];

  // Bundled form references
  bundledFormIds: string[];

  // State availability (which states this template is designed for)
  availableStates: string[];

  // Underwriting
  eligibilityCriteria?: string[];

  // Usage stats (denormalized, updated by triggers)
  usageCount: number;
  lastAppliedAt: Timestamp | null;

  // Status
  isActive: boolean;
  isBuiltIn: boolean;

  // Audit
  createdBy: string;
  createdAt: Timestamp;
  updatedBy: string;
  updatedAt: Timestamp;
}

export interface TemplateLimitDef {
  limitType: string;
  amount: number;
  displayValue: string;
  isDefault: boolean;
}

export interface TemplateDeductibleDef {
  deductibleType: string;
  amount?: number;
  percentage?: number;
  displayValue: string;
  isDefault: boolean;
}

// ════════════════════════════════════════════════════════════════════════
// First-Class Endorsement
// ════════════════════════════════════════════════════════════════════════

/**
 * Top-level endorsement entity. Like forms, endorsements are versioned
 * and can be attached to any coverage or product.
 *
 * Firestore: orgs/{orgId}/endorsements/{endorsementId}
 */
export interface OrgEndorsement {
  id: string;
  orgId: string;

  // Identity
  endorsementCode: string;
  title: string;
  endorsementType: EndorsementType;
  description?: string;

  // What it modifies
  targetCoverageKinds: CoverageKind[];

  // Compatibility tags (e.g. "GL", "property")
  compatibilityTags: string[];

  // Quick-access version pointers
  latestPublishedVersionId?: string;
  latestDraftVersionId?: string;
  versionCount: number;

  // Library display
  isActive: boolean;
  isBuiltIn: boolean;
  displayOrder: number;

  // Usage stats
  usageCount: number;

  // Soft delete
  archived: boolean;

  // Audit
  createdBy: string;
  createdAt: Timestamp;
  updatedBy: string;
  updatedAt: Timestamp;
}

/**
 * Endorsement version — immutable once published.
 *
 * Firestore: orgs/{orgId}/endorsements/{endorsementId}/versions/{versionId}
 */
export interface OrgEndorsementVersion {
  id: string;
  endorsementId: string;

  // Version info
  versionNumber: number;
  status: VersionStatus;

  // Endorsement content
  editionDate?: string;
  formNumber?: string;

  // What this version does
  modificationSummary: string;
  addedCoverages?: string[];
  removedExclusions?: string[];
  modifiedLimits?: string[];
  modifiedConditions?: string[];

  // State scope
  jurisdiction: string[];

  // Effective dates
  effectiveStart: string | null;
  effectiveEnd: string | null;

  // Linked form (endorsement form document)
  linkedFormId?: string;

  // Notes
  summary?: string;
  notes?: string;

  // Audit
  createdBy: string;
  createdAt: Timestamp;
  updatedBy: string;
  updatedAt: Timestamp;
  publishedBy?: string;
  publishedAt?: Timestamp;
}

// ════════════════════════════════════════════════════════════════════════
// Template Application Result
// ════════════════════════════════════════════════════════════════════════

/**
 * Result of applying a template — used by the wizard to hydrate step 2.
 */
export interface TemplateApplicationResult {
  templateId: string;
  templateName: string;
  coverages: Array<{
    name: string;
    coverageKind: CoverageKind;
    coverageCode?: string;
    isOptional: boolean;
    displayOrder: number;
  }>;
  endorsements: Array<{
    endorsementId: string;
    title: string;
    endorsementCode: string;
    endorsementType: EndorsementType;
    enabled: boolean;
    displayOrder: number;
  }>;
  forms: Array<{
    formId: string;
    formTitle: string;
    formNumber: string;
  }>;
  limits: TemplateLimitDef[];
  deductibles: TemplateDeductibleDef[];
}

// ════════════════════════════════════════════════════════════════════════
// Library Facets
// ════════════════════════════════════════════════════════════════════════

export type LibraryFacet = 'all' | 'templates' | 'endorsements' | 'custom';

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategoryTag, string> = {
  general_liability:       'General Liability',
  commercial_property:     'Commercial Property',
  commercial_auto:         'Commercial Auto',
  workers_comp:            'Workers\' Compensation',
  professional_liability:  'Professional Liability',
  umbrella_excess:         'Umbrella / Excess',
  inland_marine:           'Inland Marine',
  cyber:                   'Cyber',
  custom:                  'Custom',
};
