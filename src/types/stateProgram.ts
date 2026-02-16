/**
 * StateProgram Types
 * Types for state-level filing statuses, dependencies, and activation gating
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// StateProgram Status
// ============================================================================

/**
 * Status workflow: not_offered → draft → pending_filing → filed → approved → active → withdrawn
 */
export type StateProgramStatus =
  | 'not_offered'      // State not offered for this product
  | 'draft'            // Being configured, not ready for filing
  | 'pending_filing'   // Ready to file with regulatory body
  | 'filed'            // Filed, awaiting approval
  | 'approved'         // Approved by regulatory body
  | 'active'           // Active and available for business
  | 'withdrawn';       // Previously active, now withdrawn

/**
 * Transitions allowed from each status
 */
export const STATE_PROGRAM_STATUS_TRANSITIONS: Record<StateProgramStatus, StateProgramStatus[]> = {
  not_offered: ['draft'],
  draft: ['not_offered', 'pending_filing'],
  pending_filing: ['draft', 'filed'],
  filed: ['pending_filing', 'approved'],
  approved: ['filed', 'active'],
  active: ['withdrawn'],
  withdrawn: ['draft'],
};

/**
 * Status display configuration
 */
export const STATE_PROGRAM_STATUS_CONFIG: Record<StateProgramStatus, { 
  label: string; 
  color: string; 
  icon: string;
  description: string;
}> = {
  not_offered: { label: 'Not Offered', color: '#9CA3AF', icon: 'minus-circle', description: 'State is not offered for this product' },
  draft: { label: 'Draft', color: '#6B7280', icon: 'edit', description: 'State configuration in progress' },
  pending_filing: { label: 'Pending Filing', color: '#F59E0B', icon: 'clock', description: 'Ready to file with regulatory body' },
  filed: { label: 'Filed', color: '#3B82F6', icon: 'file-text', description: 'Filed, awaiting regulatory approval' },
  approved: { label: 'Approved', color: '#10B981', icon: 'check', description: 'Approved by regulatory body' },
  active: { label: 'Active', color: '#059669', icon: 'check-circle', description: 'Active and available for business' },
  withdrawn: { label: 'Withdrawn', color: '#EF4444', icon: 'x-circle', description: 'Previously active, now withdrawn' },
};

// ============================================================================
// Required Artifacts
// ============================================================================

/**
 * Artifacts required for a state to become active
 */
export interface RequiredArtifacts {
  formVersionIds: string[];
  ruleVersionIds: string[];
  rateProgramVersionIds: string[];
}

// ============================================================================
// Validation Types
// ============================================================================

export type ValidationErrorType =
  | 'missing_form'
  | 'missing_rule'
  | 'missing_rate'
  | 'artifact_not_approved'
  | 'artifact_not_filed'
  | 'artifact_not_published'
  | 'changeset_not_approved'
  | 'changeset_not_filed';

export interface ValidationError {
  type: ValidationErrorType;
  artifactType: 'form' | 'rule' | 'rateProgram';
  artifactId?: string;
  artifactName?: string;
  versionId?: string;
  message: string;
  linkTo?: string; // URL to fix the issue
}

export interface ValidationResult {
  isValid: boolean;
  canActivate: boolean;
  errors: ValidationError[];
  warnings: string[];
}

// ============================================================================
// StateProgram Interface
// ============================================================================

/**
 * StateProgram represents the filing/activation status for a state within a product version
 * 
 * Firestore path: orgs/{orgId}/products/{productId}/versions/{productVersionId}/statePrograms/{stateCode}
 */
export interface StateProgram {
  /** State code (e.g., 'CA', 'NY') - also the document ID */
  stateCode: string;
  
  /** Full state name for display */
  stateName: string;
  
  /** Current status in the filing workflow */
  status: StateProgramStatus;
  
  /** Artifacts required for this state to become active */
  requiredArtifacts: RequiredArtifacts;
  
  /** State-specific deviations/overrides from base product */
  deviations?: Record<string, unknown>;
  
  /** When validation was last run */
  lastValidatedAt?: Timestamp;
  
  /** Current validation errors (if any) */
  validationErrors: ValidationError[];
  
  /** Filing information */
  filingNumber?: string;
  filingDate?: Timestamp;
  approvalDate?: Timestamp;
  activationDate?: Timestamp;
  withdrawalDate?: Timestamp;
  
  /** Regulatory notes */
  regulatoryNotes?: string;
  
  /** Metadata */
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================================
// State Matrix Types
// ============================================================================

export interface StateMatrixRow {
  stateCode: string;
  stateName: string;
  status: StateProgramStatus;
  formCount: number;
  ruleCount: number;
  rateCount: number;
  lastApprovalDate?: Timestamp;
  validationResult: ValidationResult;
  stateProgram?: StateProgram;
}

export interface StateMatrixFilters {
  status?: StateProgramStatus[];
  hasErrors?: boolean;
  search?: string;
}

