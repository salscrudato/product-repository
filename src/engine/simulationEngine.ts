/**
 * Simulation Engine
 *
 * Pure orchestrator that runs the three simulation phases:
 *   1. UW rules evaluation
 *   2. Premium calculation
 *   3. Applicable forms resolution
 *
 * Each phase is self-contained — failures in one phase do not block the others.
 * This module is a pure function layer; Firestore persistence is handled by the service.
 */

import { evaluateRules } from './rulesEngine';
import type { RuleWithVersion } from './rulesEngine';
import type { RuleEvaluationContext, RuleAction } from '../types/rulesEngine';
import { evaluate } from './ratingEngine';
import type { RatingStep, EvaluationContext, RatingTableData } from '../types/ratingEngine';
import type {
  SimulationInput,
  SimulationOutput,
  UWPhaseResult,
  PremiumPhaseResult,
  FormsPhaseResult,
  ApplicableForm,
  UWDecision,
} from '../types/simulation';

// ════════════════════════════════════════════════════════════════════════
// Phase 1: Underwriting
// ════════════════════════════════════════════════════════════════════════

export function runUWPhase(
  rules: RuleWithVersion[],
  input: SimulationInput,
): UWPhaseResult {
  const ctx: RuleEvaluationContext = {
    inputs: input.inputs,
    state: input.stateCode,
    productVersionId: input.productVersionId,
    effectiveDate: input.effectiveDate,
  };

  const result = evaluateRules(rules, ctx);

  const firedRules = result.firedRules.map(r => ({
    ruleId: r.ruleId,
    ruleName: r.ruleName,
    action: r.outcome!.action,
    severity: r.outcome!.severity,
    message: r.outcome!.message,
  }));

  return {
    decision: (result.aggregateAction as UWDecision) ?? null,
    severity: result.aggregateSeverity,
    firedRuleCount: result.firedRules.length,
    totalRuleCount: result.trace.length,
    firedRules,
    trace: result.trace,
    errors: result.errors,
    executionTimeMs: result.executionTimeMs,
    resultHash: result.resultHash,
  };
}

// ════════════════════════════════════════════════════════════════════════
// Phase 2: Premium calculation
// ════════════════════════════════════════════════════════════════════════

export function runPremiumPhase(
  steps: RatingStep[],
  rateProgramVersionId: string,
  input: SimulationInput,
  tables?: Map<string, RatingTableData>,
): PremiumPhaseResult {
  const ctx: EvaluationContext = {
    inputs: input.inputs,
    state: input.stateCode,
    effectiveDate: input.effectiveDate,
    tables,
  };

  const result = evaluate(steps, ctx, rateProgramVersionId);

  return {
    success: result.success,
    outputs: result.outputs,
    finalPremium: result.finalPremium,
    trace: result.trace,
    errors: result.errors,
    warnings: result.warnings,
    executionTimeMs: result.executionTimeMs,
    resultHash: result.resultHash,
  };
}

// ════════════════════════════════════════════════════════════════════════
// Phase 3: Applicable forms resolution
// ════════════════════════════════════════════════════════════════════════

export interface FormUseRecord {
  formId: string;
  formNumber: string;
  formTitle: string;
  editionDate?: string;
  type: string;
  useType: string;
  coverageId?: string;
  coverageName?: string;
  /** State jurisdictions this form applies to */
  jurisdictions?: string[];
}

export function resolveApplicableForms(
  formUses: FormUseRecord[],
  stateCode: string,
): FormsPhaseResult {
  // Filter forms to those applicable in the given state
  const applicable: ApplicableForm[] = formUses
    .filter(fu => {
      // If no jurisdictions specified, form applies everywhere
      if (!fu.jurisdictions || fu.jurisdictions.length === 0) return true;
      return fu.jurisdictions.includes(stateCode);
    })
    .map(fu => ({
      formId: fu.formId,
      formNumber: fu.formNumber,
      formTitle: fu.formTitle,
      editionDate: fu.editionDate,
      type: fu.type,
      useType: fu.useType,
      coverageId: fu.coverageId,
      coverageName: fu.coverageName,
    }));

  // Group by use type
  const byUseType: Record<string, ApplicableForm[]> = {};
  for (const form of applicable) {
    const key = form.useType || 'other';
    if (!byUseType[key]) byUseType[key] = [];
    byUseType[key].push(form);
  }

  return {
    applicableForms: applicable,
    totalFormCount: applicable.length,
    byUseType,
  };
}

// ════════════════════════════════════════════════════════════════════════
// Full orchestration (for local/test use — the real orchestration
// happens in the service which loads data from Firestore)
// ════════════════════════════════════════════════════════════════════════

export interface SimulationEngineInput {
  input: SimulationInput;
  rules: RuleWithVersion[];
  ratingSteps: RatingStep[];
  rateProgramVersionId: string;
  formUses: FormUseRecord[];
  tables?: Map<string, RatingTableData>;
}

export function runSimulation(engineInput: SimulationEngineInput): SimulationOutput {
  const startTime = performance.now();

  const uwResult = runUWPhase(engineInput.rules, engineInput.input);
  const premiumResult = runPremiumPhase(
    engineInput.ratingSteps,
    engineInput.rateProgramVersionId,
    engineInput.input,
    engineInput.tables,
  );
  const formsResult = resolveApplicableForms(engineInput.formUses, engineInput.input.stateCode);

  return {
    uwResult,
    premiumResult,
    formsResult,
    totalExecutionTimeMs: performance.now() - startTime,
  };
}
