/**
 * Underwriting Rules Engine Types
 *
 * Defines the data model for structured, versioned, state-overridable underwriting
 * rules.  Every type mirrors the Firestore schema:
 *   orgs/{orgId}/rules/{ruleId}
 *   orgs/{orgId}/rules/{ruleId}/versions/{ruleVersionId}
 *
 * The condition tree is a recursive AND/OR structure whose leaf nodes reference
 * Data Dictionary field codes, making every rule automatically enforceable.
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Rule Types & Enumerations
// ============================================================================

/** The three classes of underwriting rule */
export type UnderwritingRuleType = 'eligibility' | 'referral' | 'validation';

/** Severity of the rule's outcome */
export type RuleSeverity = 'info' | 'warning' | 'error' | 'block';

/** Action taken when the rule fires */
export type RuleAction = 'accept' | 'decline' | 'refer' | 'flag' | 'require_docs';

/** Status of a rule version */
export type RuleVersionStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived';

/** Comparison operators for leaf conditions */
export type ConditionOperator =
  | 'eq'       // equals
  | 'ne'       // not equals
  | 'gt'       // greater than
  | 'gte'      // greater than or equal
  | 'lt'       // less than
  | 'lte'      // less than or equal
  | 'between'  // inclusive range [value, valueEnd]
  | 'in'       // value is in list
  | 'notIn'    // value is not in list
  | 'contains' // string contains substring
  | 'isTrue'   // boolean true
  | 'isFalse'; // boolean false

/** Logical combinator for condition groups */
export type LogicalOperator = 'AND' | 'OR';

// ============================================================================
// Condition Tree  (recursive AND / OR / leaf)
// ============================================================================

/** A single comparison against a Data Dictionary field */
export interface ConditionLeaf {
  kind: 'leaf';
  /** Unique id for drag-drop & key mapping in the builder UI */
  id: string;
  /** Data Dictionary field code, e.g. "building_age" */
  fieldCode: string;
  operator: ConditionOperator;
  /** The comparison value(s) */
  value: string | number | boolean | (string | number)[];
  /** Second bound for 'between' operator */
  valueEnd?: number;
}

/** A group of conditions joined by AND / OR */
export interface ConditionGroup {
  kind: 'group';
  id: string;
  operator: LogicalOperator;
  conditions: ConditionNode[];
}

/** A condition node is either a leaf or a group */
export type ConditionNode = ConditionLeaf | ConditionGroup;

// ============================================================================
// Rule Outcome
// ============================================================================

/** What happens when the rule fires */
export interface RuleOutcome {
  action: RuleAction;
  message: string;
  severity: RuleSeverity;
  /** Documents that must be provided when rule fires */
  requiredDocs?: string[];
}

// ============================================================================
// Rule Scope – binds a rule to product version, state, or coverage
// ============================================================================

export interface RuleScope {
  /** Required: the product version this rule applies to */
  productVersionId: string;
  /** Optional: restrict to a single state (e.g. "CA"). null = all states */
  stateCode?: string | null;
  /** Optional: restrict to a specific coverage version */
  coverageVersionId?: string | null;
}

// ============================================================================
// Org-level Rule Container
// ============================================================================

/**
 * Top-level rule document: orgs/{orgId}/rules/{ruleId}
 *
 * This is the shell that tracks identity and latest version pointers.
 * The actual conditions / outcomes live inside versioned sub-documents.
 */
export interface UnderwritingRule {
  id: string;
  orgId: string;
  /** Human-readable name, e.g. "Coastal Wind Exclusion" */
  name: string;
  description?: string;
  type: UnderwritingRuleType;
  /** Product this rule is scoped to (denormalized for list/filter display) */
  productId?: string;
  /** Quick-access pointer to the latest published version */
  latestPublishedVersionId?: string;
  /** Quick-access pointer to the latest draft version */
  latestDraftVersionId?: string;
  versionCount: number;
  archived: boolean;
  createdAt: Timestamp | Date;
  createdBy: string;
  updatedAt: Timestamp | Date;
  updatedBy: string;
}

// ============================================================================
// Versioned Rule Snapshot
// ============================================================================

/**
 * Immutable-once-published snapshot: orgs/{orgId}/rules/{ruleId}/versions/{versionId}
 */
export interface UnderwritingRuleVersion {
  id: string;
  ruleId: string;
  versionNumber: number;
  status: RuleVersionStatus;

  /** The condition tree evaluated at runtime */
  conditions: ConditionGroup;

  /** The outcome produced when conditions evaluate to true */
  outcome: RuleOutcome;

  /** Where this rule applies */
  scope: RuleScope;

  /** Effective dating */
  effectiveStart?: string | null;
  effectiveEnd?: string | null;

  /** Version metadata */
  summary?: string;
  notes?: string;
  clonedFromVersionId?: string;

  createdAt: Timestamp | Date;
  createdBy: string;
  updatedAt: Timestamp | Date;
  updatedBy: string;
  publishedAt?: Timestamp | Date;
  publishedBy?: string;
}

// ============================================================================
// Evaluation Context & Trace
// ============================================================================

/** Inputs to the rules engine for a single evaluation pass */
export interface RuleEvaluationContext {
  /** Field values keyed by Data Dictionary field code */
  inputs: Record<string, string | number | boolean | null>;
  /** State code for scope filtering */
  state?: string;
  /** Product version ID for scope filtering */
  productVersionId: string;
  /** Coverage version ID for scope filtering (optional) */
  coverageVersionId?: string;
  /** Effective date for date-range filtering */
  effectiveDate: Date;
}

/** Trace entry for a single condition leaf evaluation */
export interface ConditionTraceEntry {
  conditionId: string;
  fieldCode: string;
  operator: ConditionOperator;
  expectedValue: string | number | boolean | (string | number)[];
  actualValue: string | number | boolean | null;
  result: boolean;
}

/** Trace entry for a single rule evaluation */
export interface RuleTraceEntry {
  ruleId: string;
  ruleVersionId: string;
  ruleName: string;
  ruleType: UnderwritingRuleType;
  /** Whether the rule's conditions evaluated to true (rule fired) */
  fired: boolean;
  /** The outcome (only meaningful when fired = true) */
  outcome: RuleOutcome | null;
  /** Leaf-level condition evaluations for explainability */
  conditionTrace: ConditionTraceEntry[];
  /** Short-circuit reason if the rule was skipped entirely */
  skipReason?: string;
  executionTimeMs: number;
}

/** Full evaluation result for a set of rules */
export interface RuleEvaluationResult {
  success: boolean;
  /** Rules that fired (conditions = true) */
  firedRules: RuleTraceEntry[];
  /** Rules that did NOT fire */
  passedRules: RuleTraceEntry[];
  /** All rule traces in evaluation order */
  trace: RuleTraceEntry[];
  /** Aggregate outcome: the highest severity action */
  aggregateAction: RuleAction | null;
  aggregateSeverity: RuleSeverity | null;
  /** Any error messages */
  errors: string[];
  executionTimeMs: number;
  evaluatedAt: Date;
  /** Determinism hash */
  resultHash: string;
}

// ============================================================================
// Validation & Readiness
// ============================================================================

/** Validation issue found during rule authoring */
export interface RuleValidationIssue {
  type: 'error' | 'warning';
  message: string;
  /** Path within the condition tree, e.g. "conditions[0].conditions[1]" */
  path?: string;
  fieldCode?: string;
}

/** Result of validating a single rule version */
export interface RuleValidationResult {
  isValid: boolean;
  issues: RuleValidationIssue[];
  /** Field codes referenced by this rule */
  referencedFieldCodes: string[];
}

/** Readiness check for Product 360 dashboard */
export interface RuleReadinessCheck {
  /** Total rules that apply to this product version */
  totalRules: number;
  /** Rules that are published and ready */
  publishedRules: number;
  /** Rules still in draft */
  draftRules: number;
  /** Specific issues found */
  issues: RuleReadinessIssue[];
}

export interface RuleReadinessIssue {
  type: 'missing_rule' | 'conflicting_rules' | 'draft_only' | 'expired_rule' | 'invalid_field_ref';
  severity: RuleSeverity;
  message: string;
  ruleIds?: string[];
  ruleNames?: string[];
}

// ============================================================================
// Helpers for creating empty structures (used by UI builder)
// ============================================================================

let _nextId = 0;
export function generateConditionId(): string {
  return `cond_${Date.now()}_${_nextId++}`;
}

export function createEmptyLeaf(): ConditionLeaf {
  return {
    kind: 'leaf',
    id: generateConditionId(),
    fieldCode: '',
    operator: 'eq',
    value: '',
  };
}

export function createEmptyGroup(op: LogicalOperator = 'AND'): ConditionGroup {
  return {
    kind: 'group',
    id: generateConditionId(),
    operator: op,
    conditions: [createEmptyLeaf()],
  };
}

export function createDefaultOutcome(): RuleOutcome {
  return {
    action: 'flag',
    message: '',
    severity: 'warning',
    requiredDocs: [],
  };
}

export function createDefaultScope(productVersionId = ''): RuleScope {
  return {
    productVersionId,
    stateCode: null,
    coverageVersionId: null,
  };
}
