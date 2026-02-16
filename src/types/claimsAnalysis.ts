/**
 * Claims Analysis Types
 *
 * Structured, defensible claims analysis: scenario intake, form-grounded output,
 * and citation tracking.
 *
 * Data model:
 *   orgs/{orgId}/claimsAnalyses/{analysisId}
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Scenario — structured claim intake
// ============================================================================

/** Cause of loss categories */
export type CauseOfLoss =
  | 'fire'
  | 'lightning'
  | 'windstorm'
  | 'hail'
  | 'explosion'
  | 'smoke'
  | 'water_damage'
  | 'theft'
  | 'vandalism'
  | 'vehicle_damage'
  | 'bodily_injury'
  | 'property_damage'
  | 'personal_injury'
  | 'products_completed_ops'
  | 'professional_liability'
  | 'cyber_incident'
  | 'other';

export const CAUSE_OF_LOSS_LABELS: Record<CauseOfLoss, string> = {
  fire: 'Fire',
  lightning: 'Lightning',
  windstorm: 'Windstorm',
  hail: 'Hail',
  explosion: 'Explosion',
  smoke: 'Smoke',
  water_damage: 'Water Damage',
  theft: 'Theft',
  vandalism: 'Vandalism',
  vehicle_damage: 'Vehicle Damage',
  bodily_injury: 'Bodily Injury',
  property_damage: 'Property Damage',
  personal_injury: 'Personal / Advertising Injury',
  products_completed_ops: 'Products / Completed Operations',
  professional_liability: 'Professional Liability',
  cyber_incident: 'Cyber Incident',
  other: 'Other',
};

/** Damage type */
export type DamageType = 'property' | 'bodily_injury' | 'financial' | 'reputational' | 'other';

export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  property: 'Property Damage',
  bodily_injury: 'Bodily Injury',
  financial: 'Financial Loss',
  reputational: 'Reputational Harm',
  other: 'Other',
};

/**
 * Structured scenario submitted by the user.
 */
export interface ClaimScenario {
  /** Date of loss (ISO date string) */
  lossDate: string;
  /** Primary cause of loss */
  causeOfLoss: CauseOfLoss;
  /** Specific cause description if "other" */
  causeOfLossDetail?: string;
  /** Types of damage sustained */
  damageTypes: DamageType[];
  /** Estimated total damages (optional) */
  estimatedDamages?: number;
  /** Free-form narrative of facts */
  factsNarrative: string;
  /** Additional structured facts (key-value) */
  additionalFacts?: Record<string, string>;
  /** Location of loss (state / address) */
  lossLocation?: string;
  /** Claimant name */
  claimantName?: string;
  /** Policy number */
  policyNumber?: string;
}

// ============================================================================
// Citation — form-grounded reference
// ============================================================================

/**
 * A citation linking an analysis statement to a specific form version section.
 */
export interface AnalysisCitation {
  /** Which form version this citation references */
  formVersionId: string;
  /** Form identifier for display (e.g. "CG 00 01 04/13") */
  formLabel: string;
  /** Section heading or identifier within the form (e.g. "SECTION I – COVERAGES, Coverage A") */
  section: string;
  /** Hash of the excerpt text for integrity verification */
  excerptHash: string;
  /** Location hint (page, paragraph, clause number) for human look-up */
  locationHint: string;
  /** The actual excerpt text (truncated to reasonable length) */
  excerptText?: string;
}

// ============================================================================
// Analysis Output
// ============================================================================

/** Coverage determination outcome */
export type CoverageDetermination = 'covered' | 'not_covered' | 'partially_covered' | 'insufficient_information';

export const DETERMINATION_LABELS: Record<CoverageDetermination, string> = {
  covered: 'Covered',
  not_covered: 'Not Covered',
  partially_covered: 'Partially Covered',
  insufficient_information: 'Insufficient Information',
};

export const DETERMINATION_COLORS: Record<CoverageDetermination, string> = {
  covered: '#059669',
  not_covered: '#dc2626',
  partially_covered: '#f59e0b',
  insufficient_information: '#6b7280',
};

/**
 * Structured fields extracted from the analysis output.
 */
export interface AnalysisStructuredFields {
  /** Overall coverage determination */
  determination: CoverageDetermination;
  /** Brief summary (2-3 sentences) */
  summary: string;
  /** Applicable coverages found */
  applicableCoverages: string[];
  /** Relevant exclusions that may apply */
  relevantExclusions: string[];
  /** Conditions or limitations noted */
  conditionsAndLimitations: string[];
  /** Recommendations for claim handling */
  recommendations: string[];
}

// ============================================================================
// Stored Analysis Document
// ============================================================================

/**
 * A persisted claims analysis stored at orgs/{orgId}/claimsAnalyses/{analysisId}.
 */
export interface ClaimsAnalysis {
  id: string;
  orgId: string;

  /** Optional: product version this analysis relates to */
  productVersionId?: string;
  /** Optional: state code for jurisdictional context */
  stateCode?: string;

  /** Published form version IDs that were used as source material */
  formVersionIds: string[];

  /** The structured scenario that was submitted */
  scenario: ClaimScenario;

  /** Full markdown output from the AI analysis */
  outputMarkdown: string;
  /** Structured fields parsed from the output */
  structuredFields: AnalysisStructuredFields;

  /** Citations grounding the analysis to specific form text */
  citations: AnalysisCitation[];

  /** Traceability metadata */
  requestId: string;
  /** Round-trip latency in milliseconds */
  latencyMs: number;
  /** Model identifier used */
  modelId: string;
  /** Model version or checkpoint */
  modelVersion?: string;
  /** Token counts for cost tracking */
  tokenUsage?: { prompt: number; completion: number; total: number };

  /** Audit fields */
  createdAt: Timestamp;
  createdBy: string;
}

// ============================================================================
// Form source snapshot (used at analysis time)
// ============================================================================

/**
 * Lightweight snapshot of a published form version used as source for analysis.
 * This captures the exact form content at the time of analysis.
 */
export interface FormSourceSnapshot {
  formId: string;
  formVersionId: string;
  formNumber: string;
  formTitle: string;
  editionDate: string;
  /** The extracted text that was sent to the model */
  extractedText: string;
  /** Status at time of analysis (should always be 'published') */
  status: string;
}

// ============================================================================
// Helpers
// ============================================================================

/** Generate a simple hash for excerpt integrity verification */
export function hashExcerpt(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/** Create an empty scenario with sensible defaults */
export function createEmptyScenario(): ClaimScenario {
  return {
    lossDate: new Date().toISOString().split('T')[0],
    causeOfLoss: 'property_damage',
    damageTypes: ['property'],
    factsNarrative: '',
  };
}

/** Create empty structured fields */
export function createEmptyStructuredFields(): AnalysisStructuredFields {
  return {
    determination: 'insufficient_information',
    summary: '',
    applicableCoverages: [],
    relevantExclusions: [],
    conditionsAndLimitations: [],
    recommendations: [],
  };
}
