/**
 * Data Dictionary Schema
 */

import { z } from 'zod';
import { TimestampSchema } from './common';

export const DataDictionaryFieldTypeSchema = z.enum(['number', 'string', 'boolean', 'enum', 'date']);

export const DataDictionaryFieldSchema = z.object({
  id: z.string(),
  productId: z.string(),
  
  // Field identification
  name: z.string().min(1, 'Field name is required'),
  label: z.string().min(1, 'Field label is required'),
  description: z.string().optional(),
  
  // Type & validation
  type: DataDictionaryFieldTypeSchema,
  enumOptions: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  required: z.boolean().optional().default(false),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  
  // Display & organization
  category: z.string().optional(),
  displayOrder: z.number().optional(),
  
  // Audit
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type ValidatedDataDictionaryField = z.infer<typeof DataDictionaryFieldSchema>;

