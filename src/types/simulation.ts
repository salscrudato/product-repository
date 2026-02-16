/**
 * Simulation Types
 *
 * An end-to-end simulation runs three phases for a product version + state:
 *   1. Underwriting – evaluates UW rules → accept / refer / decline + fired rules
 *   2. Premium      – evaluates rating steps → premium outputs + trace
 *   3. Forms        – resolves applicable forms for the coverage/state
 *
 * Data model:
 *   orgs/{orgId}/simulations/{simulationId}
 */

import { Timestamp } from 'firebase/firestore';
import type { RuleAction, RuleSeverity, RuleTraceEntry } from './rulesEngine';
import type { StepTraceEntry, EvaluationError } from './ratingEngine';

// ════════════════════════════════════════════════════════════════════════
// Simulation
// ════════════════════════════════════════════════════════════════════════

export type SimulationStatus = 'running' | 'completed' | 'error';

export const SIMULATION_STATUS_CONFIG: Record<SimulationStatus, { label: string; color: string }> = {
  running:   { label: 'Running',   color: '#3B82F6' },
  completed: { label: 'Completed', color: '#10B981' },
  error:     { label: 'Error',     color: '#EF4444' },
};

/** UW decision summary */
export type UWDecision = 'accept' | 'refer' | 'decline' | 'flag' | 'require_docs';

export const UW_DECISION_CONFIG: Record<UWDecision, { label: string; color: string; icon: string }> = {
  accept:       { label: 'Accept',        color: '#10B981', icon: 'check-circle' },
  flag:         { label: 'Flag',          color: '#F59E0B', icon: 'flag' },
  require_docs: { label: 'Require Docs',  color: '#F59E0B', icon: 'document' },
  refer:        { label: 'Refer',         color: '#EF4444', icon: 'arrow-right' },
  decline:      { label: 'Decline',       color: '#EF4444', icon: 'x-circle' },
};

// ════════════════════════════════════════════════════════════════════════
// Phase results
// ════════════════════════════════════════════════════════════════════════

export interface UWPhaseResult {
  decision: UWDecision | null;
  severity: RuleSeverity | null;
  firedRuleCount: number;
  totalRuleCount: number;
  firedRules: {
    ruleId: string;
    ruleName: string;
    action: RuleAction;
    severity: RuleSeverity;
    message: string;
  }[];
  /** Full trace for drill-down */
  trace: RuleTraceEntry[];
  errors: string[];
  executionTimeMs: number;
  resultHash: string;
}

export interface PremiumPhaseResult {
  success: boolean;
  outputs: Record<string, number>;
  finalPremium?: number;
  /** Step-level trace for drill-down */
  trace: StepTraceEntry[];
  errors: EvaluationError[];
  warnings: string[];
  executionTimeMs: number;
  resultHash: string;
}

export interface ApplicableForm {
  formId: string;
  formNumber: string;
  formTitle: string;
  editionDate?: string;
  type: string;
  useType: string;
  coverageId?: string;
  coverageName?: string;
}

export interface FormsPhaseResult {
  applicableForms: ApplicableForm[];
  totalFormCount: number;
  /** Grouped by use type */
  byUseType: Record<string, ApplicableForm[]>;
}

// ════════════════════════════════════════════════════════════════════════
// Simulation document
// ════════════════════════════════════════════════════════════════════════

export interface Simulation {
  id: string;
  name: string;
  description?: string;

  /** Context */
  productId: string;
  productName: string;
  productVersionId: string;
  stateCode: string;
  effectiveDate: string;

  /** Input values keyed by data dictionary field code */
  inputs: Record<string, string | number | boolean | null>;

  /** Phase results */
  status: SimulationStatus;
  uwResult?: UWPhaseResult;
  premiumResult?: PremiumPhaseResult;
  formsResult?: FormsPhaseResult;

  /** Aggregate summary */
  uwDecision?: UWDecision | null;
  finalPremium?: number;
  applicableFormCount?: number;
  totalExecutionTimeMs?: number;

  /** Error (if status = 'error') */
  errorMessage?: string;

  /** Provenance */
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ════════════════════════════════════════════════════════════════════════
// Simulation engine input
// ════════════════════════════════════════════════════════════════════════

export interface SimulationInput {
  productId: string;
  productVersionId: string;
  stateCode: string;
  effectiveDate: Date;
  inputs: Record<string, string | number | boolean | null>;
}

export interface SimulationOutput {
  uwResult: UWPhaseResult;
  premiumResult: PremiumPhaseResult;
  formsResult: FormsPhaseResult;
  totalExecutionTimeMs: number;
}
