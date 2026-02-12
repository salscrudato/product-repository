/**
 * Pricing Step Schema
 */

import { z } from 'zod';
import { TimestampSchema } from './common';

export const PricingStepTypeSchema = z.enum(['factor', 'operand']);
export const PricingOperandSchema = z.enum(['+', '-', '*', '/', '=']);
export const PricingScopeSchema = z.enum(['product', 'coverage']);

export const PricingStepSchema = z.object({
  id: z.string(),
  productId: z.string(),
  
  // Identification
  name: z.string().min(1, 'Step name is required'),
  description: z.string().optional(),
  
  // Step type & execution
  stepType: PricingStepTypeSchema.optional().default('factor'),
  order: z.number(),
  scope: PricingScopeSchema,
  targetId: z.string().optional(),
  
  // Factor step properties
  coverages: z.array(z.string()).optional(),
  value: z.number().optional(),
  
  // Operand step properties
  operand: PricingOperandSchema.optional(),
  
  // Table reference
  tableId: z.string().optional(),
  tableName: z.string().optional(),
  
  // Lookup configuration
  lookupFields: z.array(z.string()).optional(),
  outputField: z.string().optional(),
  
  // Formula
  formula: z.string().optional(),
  
  // Conditions
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.unknown(),
  })).optional(),
  
  // State applicability
  states: z.array(z.string()).optional(),
  allStates: z.boolean().optional().default(true),
  
  // Status
  isActive: z.boolean().optional().default(true),
  
  // Versioning
  version: z.number().optional(),
  effectiveDate: TimestampSchema,
  expirationDate: TimestampSchema,
  
  // Audit
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
});

export type ValidatedPricingStep = z.infer<typeof PricingStepSchema>;

