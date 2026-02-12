/**
 * Common Zod Schemas
 * Shared schemas used across multiple entity schemas
 */

import { z } from 'zod';

// ============================================================================
// Timestamp Schema
// ============================================================================

// Timestamp can be Firestore Timestamp, Date, or null
export const TimestampSchema = z.union([
  z.object({ seconds: z.number(), nanoseconds: z.number() }),
  z.date(),
  z.string().datetime().optional(),
  z.null(),
]).optional();

export type Timestamp = z.infer<typeof TimestampSchema>;

// ============================================================================
// Status Enums
// ============================================================================

export const ProductStatusSchema = z.enum(['active', 'inactive', 'draft']).optional();
export const RuleStatusSchema = z.enum(['draft', 'active', 'inactive', 'archived']);
export const RuleTypeSchema = z.enum(['Product', 'Coverage', 'Forms', 'Pricing']);
export const RuleCategorySchema = z.enum([
  'Eligibility', 'Underwriting', 'Rating', 'Forms', 'Compliance', 'Other'
]);

export type ProductStatus = z.infer<typeof ProductStatusSchema>;
export type RuleStatus = z.infer<typeof RuleStatusSchema>;
export type RuleType = z.infer<typeof RuleTypeSchema>;
export type RuleCategory = z.infer<typeof RuleCategorySchema>;

