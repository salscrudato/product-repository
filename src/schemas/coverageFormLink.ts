/**
 * Coverage Form Link Schema
 */

import { z } from 'zod';
import { TimestampSchema } from './common';

export const FormRoleSchema = z.enum([
  'primary', 'amendatory', 'optional', 'exclusion', 'condition', 'notice'
]);
export const StateScopeSchema = z.enum(['all', 'selected', 'excluded']);

export const CoverageFormLinkSchema = z.object({
  id: z.string(),
  formId: z.string(),
  coverageId: z.string(),
  productId: z.string(),
  
  // Linkage metadata
  role: FormRoleSchema,
  isMandatory: z.boolean().default(true),
  displayOrder: z.number().default(0),
  
  // Effective dates
  effectiveDate: TimestampSchema,
  expirationDate: TimestampSchema,
  
  // State scope
  stateScope: StateScopeSchema.default('all'),
  states: z.array(z.string()).optional(),
  
  // Form metadata (denormalized)
  formNumber: z.string().optional(),
  formName: z.string().optional(),
  formEditionDate: z.string().optional(),
  
  // Notes
  notes: z.string().optional(),
  
  // Audit
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  createdBy: z.string().optional(),
});

export type ValidatedCoverageFormLink = z.infer<typeof CoverageFormLinkSchema>;

