/**
 * Pricing Engine Enums & Constants
 * Centralized definitions for pricing steps, rules, and calculations
 */

/**
 * Step Types - Define the nature of a pricing step
 */
export enum StepType {
  FACTOR = 'factor',
  OPERAND = 'operand',
  MODIFIER = 'modifier',
  DISCOUNT = 'discount',
  SURCHARGE = 'surcharge'
}

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  [StepType.FACTOR]: 'Factor',
  [StepType.OPERAND]: 'Operand',
  [StepType.MODIFIER]: 'Modifier',
  [StepType.DISCOUNT]: 'Discount',
  [StepType.SURCHARGE]: 'Surcharge'
};

export const STEP_TYPE_COLORS: Record<StepType, string> = {
  [StepType.FACTOR]: '#6366f1',
  [StepType.OPERAND]: '#8b5cf6',
  [StepType.MODIFIER]: '#06b6d4',
  [StepType.DISCOUNT]: '#10b981',
  [StepType.SURCHARGE]: '#ef4444'
};

/**
 * Rounding Modes - How to round calculated premiums
 */
export enum RoundingMode {
  NONE = 'none',
  UP = 'up',
  DOWN = 'down',
  NEAREST = 'nearest',
  NEAREST_DOLLAR = 'nearest_dollar',
  NEAREST_CENT = 'nearest_cent'
}

export const ROUNDING_MODE_LABELS: Record<RoundingMode, string> = {
  [RoundingMode.NONE]: 'No Rounding',
  [RoundingMode.UP]: 'Round Up',
  [RoundingMode.DOWN]: 'Round Down',
  [RoundingMode.NEAREST]: 'Round Nearest',
  [RoundingMode.NEAREST_DOLLAR]: 'Nearest Dollar',
  [RoundingMode.NEAREST_CENT]: 'Nearest Cent'
};

/**
 * Operands - Mathematical operations in pricing calculations
 */
export enum Operand {
  ADD = '+',
  SUBTRACT = '-',
  MULTIPLY = '*',
  DIVIDE = '/',
  EQUALS = '='
}

export const OPERAND_LABELS: Record<Operand, string> = {
  [Operand.ADD]: 'Add',
  [Operand.SUBTRACT]: 'Subtract',
  [Operand.MULTIPLY]: 'Multiply',
  [Operand.DIVIDE]: 'Divide',
  [Operand.EQUALS]: 'Equals'
};

export const OPERANDS = Object.values(Operand);

/**
 * Rule Types - Categories of business rules
 */
export enum RuleType {
  PRODUCT = 'Product',
  COVERAGE = 'Coverage',
  FORMS = 'Forms',
  PRICING = 'Pricing'
}

export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  [RuleType.PRODUCT]: 'Product Rule',
  [RuleType.COVERAGE]: 'Coverage Rule',
  [RuleType.FORMS]: 'Forms Rule',
  [RuleType.PRICING]: 'Pricing Rule'
};

export const RULE_TYPE_COLORS: Record<RuleType, string> = {
  [RuleType.PRODUCT]: '#6366f1',
  [RuleType.COVERAGE]: '#10b981',
  [RuleType.FORMS]: '#f59e0b',
  [RuleType.PRICING]: '#8b5cf6'
};

/**
 * Rule Categories - Functional categories for rules
 */
export enum RuleCategory {
  ELIGIBILITY = 'Eligibility',
  PRICING = 'Pricing',
  COMPLIANCE = 'Compliance',
  COVERAGE = 'Coverage',
  FORMS = 'Forms'
}

export const RULE_CATEGORY_LABELS: Record<RuleCategory, string> = {
  [RuleCategory.ELIGIBILITY]: 'Eligibility',
  [RuleCategory.PRICING]: 'Pricing',
  [RuleCategory.COMPLIANCE]: 'Compliance',
  [RuleCategory.COVERAGE]: 'Coverage',
  [RuleCategory.FORMS]: 'Forms'
};

export const RULE_CATEGORIES = Object.values(RuleCategory);

/**
 * Rule Status - Lifecycle states for rules
 */
export enum RuleStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  DRAFT = 'Draft',
  UNDER_REVIEW = 'Under Review'
}

export const RULE_STATUS_LABELS: Record<RuleStatus, string> = {
  [RuleStatus.ACTIVE]: 'Active',
  [RuleStatus.INACTIVE]: 'Inactive',
  [RuleStatus.DRAFT]: 'Draft',
  [RuleStatus.UNDER_REVIEW]: 'Under Review'
};

export const RULE_STATUS_COLORS: Record<RuleStatus, string> = {
  [RuleStatus.ACTIVE]: '#10b981',
  [RuleStatus.INACTIVE]: '#6b7280',
  [RuleStatus.DRAFT]: '#f59e0b',
  [RuleStatus.UNDER_REVIEW]: '#3b82f6'
};

/**
 * Pricing Rule Types - Specific pricing rule classifications
 */
export enum PricingRuleType {
  BASE = 'base',
  MODIFIER = 'modifier',
  DISCOUNT = 'discount',
  SURCHARGE = 'surcharge'
}

export const PRICING_RULE_TYPE_LABELS: Record<PricingRuleType, string> = {
  [PricingRuleType.BASE]: 'Base Premium',
  [PricingRuleType.MODIFIER]: 'Modifier',
  [PricingRuleType.DISCOUNT]: 'Discount',
  [PricingRuleType.SURCHARGE]: 'Surcharge'
};

export const PRICING_RULE_TYPE_COLORS: Record<PricingRuleType, string> = {
  [PricingRuleType.BASE]: '#6366f1',
  [PricingRuleType.MODIFIER]: '#06b6d4',
  [PricingRuleType.DISCOUNT]: '#10b981',
  [PricingRuleType.SURCHARGE]: '#ef4444'
};

/**
 * Value Types - How pricing values are expressed
 */
export enum ValueType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  MULTIPLIER = 'multiplier'
}

export const VALUE_TYPE_LABELS: Record<ValueType, string> = {
  [ValueType.PERCENTAGE]: 'Percentage (%)',
  [ValueType.FIXED]: 'Fixed Amount ($)',
  [ValueType.MULTIPLIER]: 'Multiplier (x)'
};

/**
 * Constraints & Limits
 */
export const PRICING_CONSTRAINTS = {
  MIN_STEP_VALUE: 0,
  MAX_STEP_VALUE: 999999.99,
  MIN_PERCENTAGE: -100,
  MAX_PERCENTAGE: 1000,
  MIN_MULTIPLIER: 0.01,
  MAX_MULTIPLIER: 100,
  MAX_STEPS_PER_PRODUCT: 500,
  MAX_RULES_PER_PRODUCT: 1000,
  MAX_OPERANDS_PER_CALCULATION: 50
} as const;

/**
 * Validation Rules
 */
export const PRICING_VALIDATION = {
  STEP_NAME_MIN_LENGTH: 1,
  STEP_NAME_MAX_LENGTH: 255,
  RULE_NAME_MIN_LENGTH: 1,
  RULE_NAME_MAX_LENGTH: 255,
  CONDITION_MIN_LENGTH: 1,
  CONDITION_MAX_LENGTH: 1000,
  OUTCOME_MIN_LENGTH: 1,
  OUTCOME_MAX_LENGTH: 1000
} as const;

