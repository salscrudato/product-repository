/**
 * Deterministic Underwriting Rules Engine
 *
 * Evaluates structured condition trees against a set of inputs.
 * Guarantees:
 * - Same inputs + same published rule versions => identical outcomes and trace
 * - Every leaf condition is individually traced for explainability
 * - Short-circuit logic with full trace preservation
 * - Scope-based filtering (product version, state, coverage)
 * - Aggregate severity rollup
 */

import type {
  ConditionNode,
  ConditionGroup,
  ConditionLeaf,
  ConditionOperator,
  ConditionTraceEntry,
  RuleEvaluationContext,
  RuleEvaluationResult,
  RuleTraceEntry,
  RuleOutcome,
  RuleAction,
  RuleSeverity,
  RuleValidationResult,
  RuleValidationIssue,
  RuleReadinessCheck,
  RuleReadinessIssue,
  UnderwritingRuleVersion,
} from '../types/rulesEngine';
import { createHash, combineHashes } from './hashUtils';

// ============================================================================
// Severity & Action Hierarchies
// ============================================================================

const SEVERITY_ORDER: RuleSeverity[] = ['info', 'warning', 'error', 'block'];
const ACTION_ORDER: RuleAction[] = ['accept', 'flag', 'require_docs', 'refer', 'decline'];

function severityRank(s: RuleSeverity): number {
  return SEVERITY_ORDER.indexOf(s);
}

function actionRank(a: RuleAction): number {
  return ACTION_ORDER.indexOf(a);
}

// ============================================================================
// Condition Evaluation  (recursive, fully traced)
// ============================================================================

/**
 * Evaluate a single condition leaf against the provided input values.
 */
function evaluateLeaf(
  leaf: ConditionLeaf,
  inputs: Record<string, string | number | boolean | null>,
): { result: boolean; trace: ConditionTraceEntry } {
  const actualValue = inputs[leaf.fieldCode] ?? null;

  const trace: ConditionTraceEntry = {
    conditionId: leaf.id,
    fieldCode: leaf.fieldCode,
    operator: leaf.operator,
    expectedValue: leaf.value,
    actualValue,
    result: false, // will be set below
  };

  // If field is missing, only isTrue / isFalse can meaningfully evaluate
  if (actualValue === null || actualValue === undefined) {
    if (leaf.operator === 'isFalse') {
      trace.result = true;
    }
    // everything else is false when the field is absent
    return { result: trace.result, trace };
  }

  const result = applyOperator(leaf.operator, actualValue, leaf.value, leaf.valueEnd);
  trace.result = result;
  return { result, trace };
}

/**
 * Apply a comparison operator to actual vs expected values.
 * Pure function – no side-effects.
 */
function applyOperator(
  op: ConditionOperator,
  actual: string | number | boolean,
  expected: string | number | boolean | (string | number)[],
  expectedEnd?: number,
): boolean {
  switch (op) {
    case 'eq':
      return actual === expected;
    case 'ne':
      return actual !== expected;
    case 'gt':
      return Number(actual) > Number(expected);
    case 'gte':
      return Number(actual) >= Number(expected);
    case 'lt':
      return Number(actual) < Number(expected);
    case 'lte':
      return Number(actual) <= Number(expected);
    case 'between':
      return Number(actual) >= Number(expected) && Number(actual) <= Number(expectedEnd ?? expected);
    case 'in':
      return Array.isArray(expected) && expected.includes(actual as string | number);
    case 'notIn':
      return Array.isArray(expected) && !expected.includes(actual as string | number);
    case 'contains':
      return typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected);
    case 'isTrue':
      return actual === true || actual === 'true' || actual === 1;
    case 'isFalse':
      return actual === false || actual === 'false' || actual === 0;
    default:
      return false;
  }
}

/**
 * Recursively evaluate a condition tree (group or leaf).
 * Collects leaf-level trace entries along the way.
 */
function evaluateNode(
  node: ConditionNode,
  inputs: Record<string, string | number | boolean | null>,
  traces: ConditionTraceEntry[],
): boolean {
  if (node.kind === 'leaf') {
    const { result, trace } = evaluateLeaf(node, inputs);
    traces.push(trace);
    return result;
  }

  // Group node – evaluate children with short-circuit semantics
  const group = node as ConditionGroup;
  if (group.conditions.length === 0) return true; // empty group is vacuously true

  if (group.operator === 'AND') {
    for (const child of group.conditions) {
      const childResult = evaluateNode(child, inputs, traces);
      if (!childResult) return false; // short-circuit AND
    }
    return true;
  }

  // OR
  for (const child of group.conditions) {
    const childResult = evaluateNode(child, inputs, traces);
    if (childResult) return true; // short-circuit OR
  }
  return false;
}

// ============================================================================
// Scope Filtering
// ============================================================================

function isInScope(
  version: UnderwritingRuleVersion,
  ctx: RuleEvaluationContext,
): { inScope: boolean; skipReason?: string } {
  // Product version must match
  if (version.scope.productVersionId !== ctx.productVersionId) {
    return { inScope: false, skipReason: `Product version mismatch (rule: ${version.scope.productVersionId}, context: ${ctx.productVersionId})` };
  }

  // State filter
  if (version.scope.stateCode && ctx.state && version.scope.stateCode !== ctx.state) {
    return { inScope: false, skipReason: `State mismatch (rule: ${version.scope.stateCode}, context: ${ctx.state})` };
  }

  // Coverage filter
  if (version.scope.coverageVersionId && ctx.coverageVersionId && version.scope.coverageVersionId !== ctx.coverageVersionId) {
    return { inScope: false, skipReason: `Coverage version mismatch` };
  }

  // Effective date range
  if (version.effectiveStart) {
    const start = new Date(version.effectiveStart);
    if (ctx.effectiveDate < start) {
      return { inScope: false, skipReason: `Not yet effective (starts ${version.effectiveStart})` };
    }
  }
  if (version.effectiveEnd) {
    const end = new Date(version.effectiveEnd);
    if (ctx.effectiveDate > end) {
      return { inScope: false, skipReason: `Expired (ended ${version.effectiveEnd})` };
    }
  }

  return { inScope: true };
}

// ============================================================================
// Main Evaluation Function
// ============================================================================

export interface RuleWithVersion {
  ruleId: string;
  ruleName: string;
  ruleType: import('../types/rulesEngine').UnderwritingRuleType;
  version: UnderwritingRuleVersion;
}

/**
 * Evaluate a batch of underwriting rules against the given context.
 *
 * Returns a fully-traced, deterministic result.
 */
export function evaluateRules(
  rules: RuleWithVersion[],
  ctx: RuleEvaluationContext,
): RuleEvaluationResult {
  const startTime = performance.now();
  const trace: RuleTraceEntry[] = [];
  const firedRules: RuleTraceEntry[] = [];
  const passedRules: RuleTraceEntry[] = [];
  const errors: string[] = [];

  let highestSeverity: RuleSeverity | null = null;
  let highestAction: RuleAction | null = null;

  for (const rule of rules) {
    const stepStart = performance.now();
    const conditionTrace: ConditionTraceEntry[] = [];

    // 1. Scope check
    const { inScope, skipReason } = isInScope(rule.version, ctx);
    if (!inScope) {
      const entry: RuleTraceEntry = {
        ruleId: rule.ruleId,
        ruleVersionId: rule.version.id,
        ruleName: rule.ruleName,
        ruleType: rule.ruleType,
        fired: false,
        outcome: null,
        conditionTrace: [],
        skipReason,
        executionTimeMs: performance.now() - stepStart,
      };
      trace.push(entry);
      passedRules.push(entry);
      continue;
    }

    // 2. Evaluate condition tree
    let fired = false;
    try {
      fired = evaluateNode(rule.version.conditions, ctx.inputs, conditionTrace);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Rule "${rule.ruleName}": ${msg}`);
    }

    const outcome: RuleOutcome | null = fired ? rule.version.outcome : null;

    // 3. Update aggregate severity / action
    if (fired && outcome) {
      if (highestSeverity === null || severityRank(outcome.severity) > severityRank(highestSeverity)) {
        highestSeverity = outcome.severity;
      }
      if (highestAction === null || actionRank(outcome.action) > actionRank(highestAction)) {
        highestAction = outcome.action;
      }
    }

    const entry: RuleTraceEntry = {
      ruleId: rule.ruleId,
      ruleVersionId: rule.version.id,
      ruleName: rule.ruleName,
      ruleType: rule.ruleType,
      fired,
      outcome,
      conditionTrace,
      executionTimeMs: performance.now() - stepStart,
    };

    trace.push(entry);
    if (fired) {
      firedRules.push(entry);
    } else {
      passedRules.push(entry);
    }
  }

  // Determinism hash
  const inputsHash = createHash(ctx.inputs);
  const rulesHash = createHash(rules.map(r => ({
    id: r.version.id,
    conditions: r.version.conditions,
    outcome: r.version.outcome,
  })));
  const outcomesHash = createHash(firedRules.map(r => ({
    ruleId: r.ruleId,
    fired: r.fired,
  })));
  const resultHash = combineHashes(inputsHash, rulesHash, outcomesHash);

  return {
    success: errors.length === 0,
    firedRules,
    passedRules,
    trace,
    aggregateAction: highestAction,
    aggregateSeverity: highestSeverity,
    errors,
    executionTimeMs: performance.now() - startTime,
    evaluatedAt: new Date(),
    resultHash,
  };
}

// ============================================================================
// Rule Validation
// ============================================================================

/**
 * Validate a rule version for correctness before publishing.
 * Checks that all field codes exist in the data dictionary.
 */
export function validateRuleVersion(
  version: UnderwritingRuleVersion,
  availableFieldCodes: string[],
): RuleValidationResult {
  const issues: RuleValidationIssue[] = [];
  const referencedFieldCodes: string[] = [];
  const fieldSet = new Set(availableFieldCodes);

  // Walk the condition tree
  function walkNode(node: ConditionNode, path: string): void {
    if (node.kind === 'leaf') {
      referencedFieldCodes.push(node.fieldCode);

      if (!node.fieldCode) {
        issues.push({ type: 'error', message: 'Condition has no field selected', path });
      } else if (!fieldSet.has(node.fieldCode)) {
        issues.push({
          type: 'error',
          message: `Field "${node.fieldCode}" is not in the data dictionary`,
          path,
          fieldCode: node.fieldCode,
        });
      }

      if (node.operator === 'between' && node.valueEnd === undefined) {
        issues.push({ type: 'error', message: `"between" operator requires an end value`, path });
      }

      if ((node.operator === 'in' || node.operator === 'notIn') && !Array.isArray(node.value)) {
        issues.push({ type: 'error', message: `"${node.operator}" operator requires an array value`, path });
      }

      if (node.value === '' && !['isTrue', 'isFalse'].includes(node.operator)) {
        issues.push({ type: 'warning', message: 'Condition value is empty', path });
      }
    } else {
      if (node.conditions.length === 0) {
        issues.push({ type: 'warning', message: 'Empty condition group', path });
      }
      node.conditions.forEach((child, i) => {
        walkNode(child, `${path}.conditions[${i}]`);
      });
    }
  }

  walkNode(version.conditions, 'conditions');

  // Validate outcome
  if (!version.outcome.message) {
    issues.push({ type: 'warning', message: 'Outcome message is empty' });
  }

  // Validate scope
  if (!version.scope.productVersionId) {
    issues.push({ type: 'error', message: 'Rule must be scoped to a product version' });
  }

  return {
    isValid: issues.filter(i => i.type === 'error').length === 0,
    issues,
    referencedFieldCodes: [...new Set(referencedFieldCodes)],
  };
}

// ============================================================================
// Product 360 Readiness Check
// ============================================================================

/**
 * Compute a rule-readiness summary for a given product version.
 * Used by the Product 360 dashboard to surface missing / conflicting rules.
 */
export function checkRuleReadiness(
  rules: RuleWithVersion[],
  productVersionId: string,
  availableFieldCodes: string[],
): RuleReadinessCheck {
  const issues: RuleReadinessIssue[] = [];
  const scopedRules = rules.filter(r => r.version.scope.productVersionId === productVersionId);

  const publishedRules = scopedRules.filter(r => r.version.status === 'published');
  const draftRules = scopedRules.filter(r => r.version.status === 'draft');
  const now = new Date();

  // Check for expired rules
  for (const rule of publishedRules) {
    if (rule.version.effectiveEnd) {
      const end = new Date(rule.version.effectiveEnd);
      if (end < now) {
        issues.push({
          type: 'expired_rule',
          severity: 'warning',
          message: `Rule "${rule.ruleName}" expired on ${rule.version.effectiveEnd}`,
          ruleIds: [rule.ruleId],
          ruleNames: [rule.ruleName],
        });
      }
    }
  }

  // Check for draft-only rules (no published version exists)
  for (const draft of draftRules) {
    const hasPublished = publishedRules.some(p => p.ruleId === draft.ruleId);
    if (!hasPublished) {
      issues.push({
        type: 'draft_only',
        severity: 'warning',
        message: `Rule "${draft.ruleName}" exists only as a draft`,
        ruleIds: [draft.ruleId],
        ruleNames: [draft.ruleName],
      });
    }
  }

  // Check for invalid field references
  const fieldSet = new Set(availableFieldCodes);
  for (const rule of publishedRules) {
    const validation = validateRuleVersion(rule.version, availableFieldCodes);
    for (const issue of validation.issues) {
      if (issue.type === 'error' && issue.fieldCode && !fieldSet.has(issue.fieldCode)) {
        issues.push({
          type: 'invalid_field_ref',
          severity: 'error',
          message: `Rule "${rule.ruleName}" references unknown field "${issue.fieldCode}"`,
          ruleIds: [rule.ruleId],
          ruleNames: [rule.ruleName],
        });
      }
    }
  }

  // Check for conflicting rules (same type targeting same scope with opposite actions)
  const byTypeAndScope = new Map<string, RuleWithVersion[]>();
  for (const rule of publishedRules) {
    const key = `${rule.ruleType}|${rule.version.scope.stateCode ?? 'ALL'}|${rule.version.scope.coverageVersionId ?? 'ALL'}`;
    const arr = byTypeAndScope.get(key) || [];
    arr.push(rule);
    byTypeAndScope.set(key, arr);
  }

  for (const [, group] of byTypeAndScope) {
    if (group.length < 2) continue;
    const actions = new Set(group.map(r => r.version.outcome.action));
    if (actions.has('accept') && (actions.has('decline') || actions.has('refer'))) {
      issues.push({
        type: 'conflicting_rules',
        severity: 'error',
        message: `Conflicting rules: ${group.map(r => `"${r.ruleName}"`).join(', ')} have contradictory outcomes`,
        ruleIds: group.map(r => r.ruleId),
        ruleNames: group.map(r => r.ruleName),
      });
    }
  }

  // Check for missing eligibility rules (at least one per product version is expected)
  const hasEligibility = publishedRules.some(r => r.ruleType === 'eligibility');
  if (!hasEligibility && scopedRules.length > 0) {
    issues.push({
      type: 'missing_rule',
      severity: 'info',
      message: 'No published eligibility rules found for this product version',
    });
  }

  return {
    totalRules: scopedRules.length,
    publishedRules: publishedRules.length,
    draftRules: draftRules.length,
    issues,
  };
}

// ============================================================================
// Utility: Extract all field codes from a condition tree
// ============================================================================

export function extractFieldCodes(node: ConditionNode): string[] {
  if (node.kind === 'leaf') {
    return node.fieldCode ? [node.fieldCode] : [];
  }
  return node.conditions.flatMap(extractFieldCodes);
}
