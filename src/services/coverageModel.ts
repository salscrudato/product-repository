/**
 * Coverage Model Service
 * 
 * Provides normalization and denormalization utilities for Coverage data.
 * Ensures a single canonical representation for the wizard UI, AI, and validation
 * while maintaining backward compatibility with legacy fields stored in Firestore.
 * 
 * Canonical Fields (use these in wizard UI):
 * - valuationMethods: ValuationMethod[] (multi-select)
 * - coinsuranceOptions: number[] (multi-select; e.g., [80,90,100])
 * - underwriterApprovalType: 'required' | 'not_required' | 'conditional'
 * - eligibilityCriteria: string[]
 * - prohibitedClasses: string[]
 * - underwritingGuidelines: string
 * - coverageKind: CoverageKind
 * - modifiesCoverageId: string | null
 * - coverageTrigger: CoverageTrigger
 * - waitingPeriod: number | null
 * - waitingPeriodUnit: 'days' | 'months'
 * - claimsReportingPeriod: number | null
 * - depreciationMethod: DepreciationMethod | null
 * 
 * Legacy Fields (maintained for backward compatibility):
 * - valuationMethod: ValuationMethod (single value - derived from first valuationMethods)
 * - coinsurancePercentage: number (single value - derived from first coinsuranceOptions)
 * - requiresUnderwriterApproval: boolean (derived from underwriterApprovalType)
 */

import { Coverage, ValuationMethod, CoverageTrigger, UnderwriterApprovalType, CoverageKind, DepreciationMethod } from '../types';

/**
 * Normalized coverage draft with canonical fields populated
 */
export interface NormalizedCoverageDraft extends Partial<Coverage> {
  // Canonical fields are guaranteed to be normalized
  _isNormalized?: boolean;
}

/**
 * Wizard step field configuration for progress calculation
 */
export interface WizardFieldConfig {
  stepId: string;
  fields: (keyof Coverage)[];
  requiredFields?: (keyof Coverage)[];
}

/**
 * Wizard step field definitions for accurate progress tracking
 */
export const WIZARD_STEP_FIELDS: WizardFieldConfig[] = [
  {
    stepId: 'basics',
    fields: ['name', 'coverageCode', 'description', 'coverageKind', 'modifiesCoverageId'],
    requiredFields: ['name', 'coverageCode'],
  },
  {
    stepId: 'triggers',
    fields: ['coverageTrigger', 'waitingPeriod', 'waitingPeriodUnit', 'claimsReportingPeriod', 'allowRetroactiveDate', 'extendedReportingPeriod'],
    requiredFields: ['coverageTrigger'],
  },
  {
    stepId: 'valuation',
    fields: ['valuationMethods', 'coinsuranceOptions', 'depreciationMethod', 'hasCoinsurancePenalty'],
    requiredFields: [],
  },
  {
    stepId: 'underwriting',
    fields: ['underwriterApprovalType', 'eligibilityCriteria', 'prohibitedClasses', 'underwritingGuidelines'],
    requiredFields: [],
  },
  {
    stepId: 'claims',
    fields: ['claimsReportingPeriod', 'proofOfLossDeadline', 'hasSubrogationRights', 'hasSalvageRights'],
    requiredFields: [],
  },
  {
    stepId: 'forms',
    fields: [],
    requiredFields: [],
  },
  {
    stepId: 'review',
    fields: [],
    requiredFields: [],
  },
];

/**
 * Normalize a coverage draft by populating canonical fields from legacy fields.
 * This ensures the wizard UI always works with the canonical representation.
 * 
 * @param draft - The raw coverage draft (may have legacy or canonical fields)
 * @returns Normalized draft with canonical fields populated
 */
export function normalizeCoverageDraft(draft: Partial<Coverage>): NormalizedCoverageDraft {
  const normalized: NormalizedCoverageDraft = { ...draft, _isNormalized: true };

  // Normalize valuationMethods from legacy valuationMethod
  if (!normalized.valuationMethods && normalized.valuationMethod) {
    normalized.valuationMethods = [normalized.valuationMethod];
  } else if (!normalized.valuationMethods) {
    normalized.valuationMethods = [];
  }

  // Normalize coinsuranceOptions from legacy coinsurancePercentage
  if (!normalized.coinsuranceOptions && normalized.coinsurancePercentage !== undefined) {
    normalized.coinsuranceOptions = [normalized.coinsurancePercentage];
  } else if (!normalized.coinsuranceOptions) {
    normalized.coinsuranceOptions = [];
  }

  // Normalize underwriterApprovalType from legacy requiresUnderwriterApproval
  if (!normalized.underwriterApprovalType && normalized.requiresUnderwriterApproval !== undefined) {
    normalized.underwriterApprovalType = normalized.requiresUnderwriterApproval ? 'required' : 'not_required';
  }

  // Ensure arrays are initialized
  if (!normalized.eligibilityCriteria) {
    normalized.eligibilityCriteria = [];
  }
  if (!normalized.prohibitedClasses) {
    normalized.prohibitedClasses = [];
  }

  // Default coverageKind
  if (!normalized.coverageKind) {
    normalized.coverageKind = 'coverage';
  }

  // Default waiting period unit
  if (normalized.waitingPeriod !== undefined && normalized.waitingPeriod !== null && !normalized.waitingPeriodUnit) {
    normalized.waitingPeriodUnit = 'days';
  }

  return normalized;
}

/**
 * Denormalize a coverage draft for saving to Firestore.
 * Derives legacy fields from canonical fields so existing app code continues to work.
 * 
 * @param draft - The normalized coverage draft
 * @returns Draft with legacy fields populated for backward compatibility
 */
export function denormalizeForSave(draft: NormalizedCoverageDraft): Partial<Coverage> {
  const denormalized: Partial<Coverage> = { ...draft };
  
  // Remove internal flag
  delete (denormalized as NormalizedCoverageDraft)._isNormalized;

  // Derive valuationMethod from valuationMethods (first value)
  if (denormalized.valuationMethods && denormalized.valuationMethods.length > 0) {
    denormalized.valuationMethod = denormalized.valuationMethods[0];
  }

  // Derive coinsurancePercentage from coinsuranceOptions (first value)
  if (denormalized.coinsuranceOptions && denormalized.coinsuranceOptions.length > 0) {
    denormalized.coinsurancePercentage = denormalized.coinsuranceOptions[0];
  }

  // Derive requiresUnderwriterApproval from underwriterApprovalType
  if (denormalized.underwriterApprovalType) {
    denormalized.requiresUnderwriterApproval = denormalized.underwriterApprovalType === 'required' ||
      (denormalized.underwriterApprovalType === 'conditional' &&
       (denormalized.eligibilityCriteria?.length ?? 0) > 0);
  }

  return denormalized;
}

/**
 * Calculate step progress for a coverage draft
 * Returns the number of filled fields vs total fields for each step
 */
export function calculateStepProgress(
  draft: NormalizedCoverageDraft,
  stepId: string
): { filled: number; total: number; percentage: number } {
  const stepConfig = WIZARD_STEP_FIELDS.find(s => s.stepId === stepId);
  if (!stepConfig || stepConfig.fields.length === 0) {
    return { filled: 0, total: 0, percentage: 100 };
  }

  const total = stepConfig.fields.length;
  let filled = 0;

  for (const field of stepConfig.fields) {
    const value = draft[field];
    if (isFieldFilled(value)) {
      filled++;
    }
  }

  return {
    filled,
    total,
    percentage: total > 0 ? Math.round((filled / total) * 100) : 100,
  };
}

/**
 * Calculate overall wizard progress
 */
export function calculateOverallProgress(draft: NormalizedCoverageDraft): {
  percentage: number;
  filledFields: number;
  totalFields: number;
  stepProgress: Record<string, { filled: number; total: number; percentage: number }>;
} {
  const stepProgress: Record<string, { filled: number; total: number; percentage: number }> = {};
  let totalFilled = 0;
  let totalFields = 0;

  for (const stepConfig of WIZARD_STEP_FIELDS) {
    if (stepConfig.fields.length === 0) continue; // Skip review/forms steps
    const progress = calculateStepProgress(draft, stepConfig.stepId);
    stepProgress[stepConfig.stepId] = progress;
    totalFilled += progress.filled;
    totalFields += progress.total;
  }

  return {
    percentage: totalFields > 0 ? Math.round((totalFilled / totalFields) * 100) : 0,
    filledFields: totalFilled,
    totalFields,
    stepProgress,
  };
}

/**
 * Get missing required fields for publishing
 */
export function getMissingRequiredFields(draft: NormalizedCoverageDraft): string[] {
  const missing: string[] = [];

  // Core required fields
  if (!draft.name || draft.name.trim().length === 0) {
    missing.push('name');
  }
  if (!draft.coverageCode || draft.coverageCode.trim().length === 0) {
    missing.push('coverageCode');
  }
  if (!draft.productId) {
    missing.push('productId');
  }

  // If conditional approval, eligibility criteria required
  if (draft.underwriterApprovalType === 'conditional' &&
      (!draft.eligibilityCriteria || draft.eligibilityCriteria.length === 0)) {
    missing.push('eligibilityCriteria');
  }

  return missing;
}

/**
 * Check if coverage is ready to publish
 */
export function isReadyToPublish(draft: NormalizedCoverageDraft): boolean {
  return getMissingRequiredFields(draft).length === 0;
}

/**
 * Helper to check if a field value is considered "filled"
 */
function isFieldFilled(value: unknown): boolean {
  if (value === undefined || value === null || value === '') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

/**
 * Get human-readable label for a field
 */
export const FIELD_LABELS: Record<string, string> = {
  name: 'Coverage Name',
  coverageCode: 'Coverage Code',
  description: 'Description',
  coverageKind: 'Coverage Kind',
  modifiesCoverageId: 'Modified Coverage',
  coverageTrigger: 'Coverage Trigger',
  waitingPeriod: 'Waiting Period',
  waitingPeriodUnit: 'Waiting Period Unit',
  claimsReportingPeriod: 'Claims Reporting Period',
  allowRetroactiveDate: 'Allow Retroactive Date',
  extendedReportingPeriod: 'Extended Reporting Period',
  valuationMethods: 'Valuation Methods',
  coinsuranceOptions: 'Coinsurance Options',
  depreciationMethod: 'Depreciation Method',
  hasCoinsurancePenalty: 'Coinsurance Penalty',
  underwriterApprovalType: 'Underwriter Approval',
  eligibilityCriteria: 'Eligibility Criteria',
  prohibitedClasses: 'Prohibited Classes',
  underwritingGuidelines: 'Underwriting Guidelines',
  proofOfLossDeadline: 'Proof of Loss Deadline',
  hasSubrogationRights: 'Subrogation Rights',
  hasSalvageRights: 'Salvage Rights',
};

