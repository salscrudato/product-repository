/**
 * Programmable Rules DSL Type Definitions
 * 
 * This file defines the structured DSL (Domain Specific Language) for
 * programmable insurance rules. Rules are expressed as IF/THEN logic
 * that can be evaluated by the rule engine.
 */

import { Timestamp } from 'firebase/firestore';
import { RuleType, RuleCategory, RuleStatus } from './index';

// ============================================================================
// Condition Types
// ============================================================================

/**
 * Operators for comparing field values
 */
export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'in'
  | 'notIn'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'notContains'
  | 'exists'
  | 'notExists'
  | 'between'
  | 'startsWith'
  | 'endsWith'
  | 'matches'; // regex pattern

/**
 * Value types for conditions
 */
export type ConditionValueType = 'string' | 'number' | 'boolean' | 'array' | 'date';

/**
 * A single condition comparing a field to a value
 */
export interface Condition {
  /** Field path to evaluate (e.g., "risk.classCode", "coverage.building.limit") */
  field: string;
  /** Comparison operator */
  operator: ConditionOperator;
  /** Value to compare against (optional for exists/notExists) */
  value?: string | number | boolean | (string | number)[] | [number, number];
  /** Type hint for the value */
  valueType?: ConditionValueType;
  /** Human-readable description of this condition */
  description?: string;
}

/**
 * Logical grouping operator
 */
export type LogicalOperator = 'AND' | 'OR';

/**
 * A group of conditions combined with AND/OR logic
 * Supports nested groups for complex expressions
 */
export interface ConditionGroup {
  /** Logical operator to combine conditions */
  op: LogicalOperator;
  /** Array of conditions or nested groups */
  conditions: Array<Condition | ConditionGroup>;
}

// ============================================================================
// Action Types
// ============================================================================

/**
 * Types of actions a rule can perform
 */
export type ActionType =
  | 'set'           // Set a field value
  | 'add'           // Add to an array or increment
  | 'remove'        // Remove from array or decrement
  | 'block'         // Block eligibility/transaction
  | 'require'       // Require underwriting referral
  | 'applyFactor'   // Apply pricing factor
  | 'attachForm'    // Attach a form to policy
  | 'detachForm'    // Remove a form from policy
  | 'addMessage'    // Add warning/info message
  | 'setCoverage'   // Set coverage availability
  | 'setLimit'      // Set coverage limit
  | 'setDeductible' // Set coverage deductible
  | 'custom';       // Custom action (extensible)

/**
 * Operators for action value modification
 */
export type ActionOperator = 'equals' | 'add' | 'subtract' | 'multiply' | 'divide';

/**
 * Message severity levels
 */
export type MessageSeverity = 'info' | 'warning' | 'error' | 'success';

/**
 * An action to perform when rule conditions are met
 */
export interface Action {
  /** Type of action to perform */
  type: ActionType;
  /** Target field or entity (e.g., "eligibility", "pricing.factor", "forms.CP0010") */
  target: string;
  /** Operator for value modification */
  operator?: ActionOperator;
  /** Value to apply */
  value?: string | number | boolean | string[] | Record<string, unknown>;
  /** Message to display (for addMessage action) */
  message?: string;
  /** Message severity */
  severity?: MessageSeverity;
  /** Human-readable description of this action */
  description?: string;
}

// ============================================================================
// Rule Logic Structure
// ============================================================================

/**
 * The complete logic structure for a programmable rule
 */
export interface RuleLogic {
  /** Schema version for forward compatibility */
  version: number;
  /** IF conditions (when these are true, apply THEN actions) */
  if: ConditionGroup;
  /** THEN actions (what to do when conditions are met) */
  then: Action[];
  /** Optional ELSE actions (what to do when conditions are NOT met) */
  else?: Action[];
}

// ============================================================================
// AI Metadata
// ============================================================================

/**
 * Metadata about AI-generated rule content
 */
export interface RuleAIMetadata {
  /** Whether this rule was AI-generated */
  generated: boolean;
  /** AI confidence score (0-100) */
  confidence?: number;
  /** Model used for generation */
  lastModel?: string;
  /** Timestamp of last AI generation */
  lastGeneratedAt?: Timestamp | Date;
  /** Number of refinement iterations */
  refinementCount?: number;
}

// ============================================================================
// Rule Draft (AI Response Schema)
// ============================================================================

/**
 * Schema for AI-generated rule drafts
 * This is the expected output format from the AI rule builder
 */
export interface RuleDraft {
  /** Suggested rule name */
  name: string;
  /** Rule type classification */
  ruleType: RuleType;
  /** Rule category */
  ruleCategory: RuleCategory;
  /** Target entity ID (coverage, form, pricing step) */
  targetId: string | null;
  /** Initial status */
  status: RuleStatus;
  /** Whether this is a proprietary rule */
  proprietary: boolean;
  /** Rule priority (0-100) */
  priority: number;
  /** Reference to source document/regulation */
  reference: string | null;
  /** Original plain English source text */
  sourceText: string;
  /** Human-readable condition text (IF...) */
  conditionText: string;
  /** Human-readable outcome text (THEN...) */
  outcomeText: string;
  /** Programmable logic structure */
  logic: RuleLogic;
}

// ============================================================================
// Rule Templates
// ============================================================================

/**
 * Pre-defined rule template for quick creation
 */
export interface RuleBuilderTemplate {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  /** Example plain English text */
  exampleText: string;
  /** Pre-filled logic structure */
  defaultLogic: Partial<RuleLogic>;
  /** Tags for filtering */
  tags: string[];
}

/**
 * Common field definitions for the rule builder UI
 */
export interface RuleFieldDefinition {
  /** Field path (e.g., "risk.classCode") */
  path: string;
  /** Display label */
  label: string;
  /** Field category for grouping */
  category: 'risk' | 'coverage' | 'policy' | 'pricing' | 'location' | 'insured';
  /** Expected value type */
  valueType: ConditionValueType;
  /** Allowed operators for this field */
  allowedOperators: ConditionOperator[];
  /** Suggested values (for dropdowns) */
  suggestedValues?: (string | number)[];
  /** Description/help text */
  description?: string;
}

// ============================================================================
// Rule Evaluation Types
// ============================================================================

/**
 * Context object passed to rule evaluation
 */
export interface RuleEvaluationContext {
  /** Risk/submission data */
  risk?: Record<string, unknown>;
  /** Policy data */
  policy?: Record<string, unknown>;
  /** Coverage data */
  coverage?: Record<string, unknown>;
  /** Pricing data */
  pricing?: Record<string, unknown>;
  /** Location data */
  location?: Record<string, unknown>;
  /** Insured data */
  insured?: Record<string, unknown>;
  /** Custom data */
  custom?: Record<string, unknown>;
}

/**
 * Result of evaluating a single condition
 */
export interface ConditionEvaluationResult {
  condition: Condition;
  matched: boolean;
  actualValue: unknown;
  expectedValue: unknown;
  fieldPath: string;
}

/**
 * Result of evaluating a rule's conditions
 */
export interface RuleEvaluationResult {
  /** Whether all conditions matched */
  matched: boolean;
  /** Individual condition results */
  conditionResults: ConditionEvaluationResult[];
  /** Actions that would be applied */
  applicableActions: Action[];
  /** Generated messages */
  messages: Array<{ message: string; severity: MessageSeverity }>;
  /** Whether the rule blocks the transaction */
  blocked: boolean;
  /** Context delta (changes that would be applied) */
  contextDelta: Partial<RuleEvaluationContext>;
  /** Evaluation errors if any */
  errors?: string[];
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a condition is a ConditionGroup
 */
export function isConditionGroup(
  item: Condition | ConditionGroup
): item is ConditionGroup {
  return 'op' in item && 'conditions' in item;
}

/**
 * Type guard to check if a condition is a single Condition
 */
export function isCondition(
  item: Condition | ConditionGroup
): item is Condition {
  return 'field' in item && 'operator' in item;
}

