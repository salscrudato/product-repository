/**
 * Zod Schemas for Domain Model Validation
 * Runtime validation for all Firestore documents
 */

import { z } from 'zod';

// Re-export common schemas
export * from './common';
import { TimestampSchema, ProductStatusSchema } from './common';

// ============================================================================
// Product Schema
// ============================================================================

export const ProductSchema = z.object({
  id: z.string(),
  productCode: z.string().optional(),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  status: ProductStatusSchema,
  archived: z.boolean().optional().default(false),
  
  // State availability
  states: z.array(z.string()).optional(),
  excludedStates: z.array(z.string()).optional(),
  availableStates: z.array(z.string()).optional(),
  
  // Versioning
  version: z.number().optional(),
  effectiveDate: TimestampSchema,
  expirationDate: TimestampSchema,
  
  // Denormalized stats
  coverageCount: z.number().optional(),
  formCount: z.number().optional(),
  ruleCount: z.number().optional(),
  packageCount: z.number().optional(),
  
  // Relational mappings
  coverageIds: z.array(z.string()).optional(),
  formIds: z.array(z.string()).optional(),
  ruleIds: z.array(z.string()).optional(),
  packageIds: z.array(z.string()).optional(),
  
  // Audit
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  changeReason: z.string().optional(),
  
  metadata: z.record(z.unknown()).optional(),
});

export type ValidatedProduct = z.infer<typeof ProductSchema>;

// ============================================================================
// Coverage Schema
// ============================================================================

export const CoverageSchema = z.object({
  id: z.string(),
  productId: z.string(),
  name: z.string().min(1, 'Coverage name is required'),
  description: z.string().optional(),
  coverageCode: z.string().optional(),
  
  // Hierarchy
  parentCoverageId: z.string().optional().nullable(),
  
  // Classification
  type: z.string().optional(),
  isOptional: z.boolean().optional().default(false),
  
  // Coverage scope
  scopeOfCoverage: z.string().optional(),
  perilsCovered: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
  insurableObjects: z.array(z.string()).optional(),
  excludedObjects: z.array(z.string()).optional(),
  
  // Legacy fields (deprecated)
  limits: z.array(z.string()).optional(),
  deductibles: z.array(z.string()).optional(),
  
  // Display
  displayOrder: z.number().optional(),
  
  // State scope
  states: z.array(z.string()).optional(),
  allStates: z.boolean().optional().default(true),
  
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

export type ValidatedCoverage = z.infer<typeof CoverageSchema>;

// ============================================================================
// Form Schema
// ============================================================================

export const FormSchema = z.object({
  id: z.string(),
  formNumber: z.string().min(1, 'Form number is required'),
  formName: z.string().optional(),
  formEditionDate: z.string().optional(),
  
  productId: z.string().optional(),
  
  // Aliases for backwards compatibility
  name: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  
  // File info
  pdfUrl: z.string().url().optional(),
  pdfStoragePath: z.string().optional(),
  
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

export type ValidatedForm = z.infer<typeof FormSchema>;

// Export all schemas
export * from './rule';
export * from './pricingStep';
export * from './task';
export * from './dataDictionary';
export * from './coverageFormLink';

