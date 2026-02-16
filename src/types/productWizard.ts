/**
 * Product Assembly Wizard Types
 *
 * Governs the five-step wizard that creates a ProductVersion draft
 * inside an active Change Set with full audit trail.
 *
 * Flow:
 *  1. Template / Scratch
 *  2. Select coverages + endorsements + ordering
 *  3. Attach rates / rules / forms
 *  4. Choose target states (creates StatePrograms drafts)
 *  5. Readiness review → create/update Change Set items
 */

import { Timestamp } from 'firebase/firestore';

// ════════════════════════════════════════════════════════════════════════
// Steps
// ════════════════════════════════════════════════════════════════════════

export type WizardStepId =
  | 'template'
  | 'coverages'
  | 'attachments'
  | 'states'
  | 'review';

export const WIZARD_STEPS: readonly {
  id: WizardStepId;
  label: string;
  description: string;
  number: number;
}[] = [
  { id: 'template',    label: 'Template',      description: 'Start from template or scratch',                number: 1 },
  { id: 'coverages',   label: 'Coverages',     description: 'Select coverages, endorsements & ordering',     number: 2 },
  { id: 'attachments', label: 'Attachments',    description: 'Attach rates, rules & forms',                   number: 3 },
  { id: 'states',      label: 'Target States',  description: 'Choose states and create StateProgram drafts',  number: 4 },
  { id: 'review',      label: 'Review',         description: 'Readiness review & Change Set linkage',         number: 5 },
] as const;

// ════════════════════════════════════════════════════════════════════════
// Template selection (Step 1)
// ════════════════════════════════════════════════════════════════════════

export type WizardSource = 'scratch' | 'template' | 'clone';

export interface WizardTemplateChoice {
  source: WizardSource;
  /** Product ID to clone from (when source === 'clone' | 'template') */
  sourceProductId?: string;
  /** Specific version to clone (when source === 'clone') */
  sourceVersionId?: string;
  sourceProductName?: string;
}

// ════════════════════════════════════════════════════════════════════════
// Coverage selection (Step 2)
// ════════════════════════════════════════════════════════════════════════

export interface WizardCoverageItem {
  coverageId: string;
  name: string;
  coverageKind: 'coverage' | 'endorsement' | 'exclusion' | 'notice' | 'condition';
  isOptional: boolean;
  displayOrder: number;
  /** If endorsement, which coverage it modifies */
  modifiesCoverageId?: string;
  /** Whether this was included by default from template */
  fromTemplate: boolean;
}

// ════════════════════════════════════════════════════════════════════════
// Attachment selection (Step 3)
// ════════════════════════════════════════════════════════════════════════

export interface WizardRateAttachment {
  rateProgramId: string;
  rateProgramName: string;
  versionId: string;
  versionNumber: number;
}

export interface WizardRuleAttachment {
  ruleId: string;
  ruleName: string;
  ruleType: string;
}

export interface WizardFormAttachment {
  formId: string;
  formTitle: string;
  formNumber: string;
  versionId?: string;
}

// ════════════════════════════════════════════════════════════════════════
// State selection (Step 4)
// ════════════════════════════════════════════════════════════════════════

export interface WizardStateSelection {
  stateCode: string;
  stateName: string;
  selected: boolean;
}

// ════════════════════════════════════════════════════════════════════════
// Readiness validation (Step 5)
// ════════════════════════════════════════════════════════════════════════

export type ReadinessLevel = 'pass' | 'warning' | 'fail';

export interface ReadinessCheckItem {
  id: string;
  category: 'product' | 'coverage' | 'form' | 'rate' | 'rule' | 'state';
  label: string;
  description: string;
  level: ReadinessLevel;
}

export interface ReadinessResult {
  overall: ReadinessLevel;
  checks: ReadinessCheckItem[];
  passCount: number;
  warnCount: number;
  failCount: number;
}

// ════════════════════════════════════════════════════════════════════════
// Wizard Manifest (persisted to Firestore)
// ════════════════════════════════════════════════════════════════════════

export type WizardManifestStatus = 'in_progress' | 'completed' | 'abandoned';

/**
 * Persisted in: orgs/{orgId}/wizardManifests/{manifestId}
 *
 * Captures the full state of the wizard so users can resume,
 * and so the readiness rail / audit can reconstruct what happened.
 */
export interface WizardManifest {
  id: string;
  orgId: string;

  /** Product being created/updated */
  productId: string | null;
  productName: string;
  productDescription: string;
  productCategory: string;

  /** Version created by the wizard */
  productVersionId: string | null;

  /** Change Set this wizard is linked to */
  changeSetId: string;
  changeSetName: string;

  /** Current step */
  currentStep: WizardStepId;
  status: WizardManifestStatus;

  /** Step 1: Template choice */
  templateChoice: WizardTemplateChoice | null;

  /** Step 2: Coverage selections */
  coverages: WizardCoverageItem[];

  /** Step 3: Attachments */
  ratePrograms: WizardRateAttachment[];
  rules: WizardRuleAttachment[];
  forms: WizardFormAttachment[];

  /** Step 4: States */
  selectedStates: string[];

  /** Step 5: Readiness snapshot */
  readinessResult: ReadinessResult | null;

  /** Effective dates (from Change Set) */
  effectiveStart: string | null;
  effectiveEnd: string | null;

  /** Audit */
  createdBy: string;
  createdAt: Timestamp;
  updatedBy: string;
  updatedAt: Timestamp;
  completedAt: Timestamp | null;
}

// ════════════════════════════════════════════════════════════════════════
// Step validation
// ════════════════════════════════════════════════════════════════════════

export interface StepValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export type StepValidationMap = Record<WizardStepId, StepValidation>;
