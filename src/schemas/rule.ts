/**
 * Rule Schemas - Business rules and coverage rules
 */

import { z } from 'zod';
import { TimestampSchema, RuleStatusSchema, RuleTypeSchema, RuleCategorySchema } from './common';

// ============================================================================
// Rule Schema (Global business rules)
// ============================================================================

export const RuleSchema = z.object({
  id: z.string(),
  productId: z.string(),
  
  // Classification
  ruleType: RuleTypeSchema,
  ruleCategory: RuleCategorySchema,
  
  // Target entity
  targetId: z.string().optional(),
  
  // Content
  name: z.string().min(1, 'Rule name is required'),
  condition: z.string().min(1, 'Rule condition is required'),
  outcome: z.string().min(1, 'Rule outcome is required'),
  reference: z.string().optional(),
  
  // Properties
  proprietary: z.boolean().optional().default(false),
  status: RuleStatusSchema,
  priority: z.number().optional(),
  
  // Versioning
  version: z.number().optional(),
  effectiveDate: TimestampSchema,
  expirationDate: TimestampSchema,
  
  // State applicability
  states: z.array(z.string()).optional(),
  dependsOnRuleId: z.array(z.string()).optional(),
  
  // Audit
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  changeReason: z.string().optional(),
});

export type ValidatedRule = z.infer<typeof RuleSchema>;

// ============================================================================
// Coverage Rule Schema (Structured rules with conditions)
// ============================================================================

export const RuleSeveritySchema = z.enum(['info', 'warning', 'block', 'referral']);
export const RuleActionTypeSchema = z.enum([
  'allow', 'decline', 'referral', 'require_approval', 
  'add_note', 'apply_surcharge', 'exclude_coverage'
]);
export const ConditionOperatorSchema = z.enum([
  'equals', 'not_equals', 'greater_than', 'less_than',
  'greater_or_equal', 'less_or_equal', 'contains', 'not_contains',
  'in_list', 'not_in_list', 'between', 'is_empty', 'is_not_empty'
]);

export const RuleConditionSchema = z.object({
  id: z.string(),
  field: z.string(),
  operator: ConditionOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.unknown())]).optional(),
  secondaryValue: z.union([z.string(), z.number()]).optional(),
});

export const ConditionGroupSchema: z.ZodType<{
  logic: 'AND' | 'OR';
  conditions: Array<z.infer<typeof RuleConditionSchema>>;
  groups?: Array<unknown>;
}> = z.object({
  logic: z.enum(['AND', 'OR']),
  conditions: z.array(RuleConditionSchema),
  groups: z.array(z.lazy(() => ConditionGroupSchema)).optional(),
});

export const RuleActionSchema = z.object({
  type: RuleActionTypeSchema,
  value: z.union([z.string(), z.number()]).optional(),
  message: z.string().optional(),
});

export const CoverageRuleSchema = z.object({
  id: z.string(),
  coverageId: z.string(),
  productId: z.string(),
  
  // Identification
  name: z.string().min(1, 'Rule name is required'),
  description: z.string().optional(),
  
  // Classification - normalize 'type' to 'ruleType'
  ruleType: z.enum(['eligibility', 'referral', 'underwriting', 'pricing', 'compliance']),
  severity: RuleSeveritySchema,
  
  // Structured conditions
  conditionGroup: ConditionGroupSchema,
  
  // Actions
  actions: z.array(RuleActionSchema),
  
  // Priority
  priority: z.number().default(0),
  
  // State scope
  states: z.array(z.string()).optional(),
  allStates: z.boolean().optional().default(true),
  
  // Effective dates
  effectiveDate: TimestampSchema,
  expirationDate: TimestampSchema,
  
  // Status - normalize 'isEnabled' to 'isActive'
  isActive: z.boolean().default(true),
  
  // Template reference
  templateId: z.string().optional(),
  
  // Audit
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  createdBy: z.string().optional(),
});

export type ValidatedCoverageRule = z.infer<typeof CoverageRuleSchema>;

