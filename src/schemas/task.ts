/**
 * Task Schema
 */

import { z } from 'zod';
import { TimestampSchema } from './common';

export const TaskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'blocked']);
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const TaskSchema = z.object({
  id: z.string(),
  
  // Identification
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  
  // Status
  status: TaskStatusSchema.default('pending'),
  priority: TaskPrioritySchema.default('medium'),
  
  // Assignment
  assignedTo: z.string().optional(),
  assignedBy: z.string().optional(),
  
  // Due date
  dueDate: TimestampSchema,
  completedAt: TimestampSchema,
  
  // Related entities
  productId: z.string().optional(),
  coverageId: z.string().optional(),
  formId: z.string().optional(),
  ruleId: z.string().optional(),
  
  // Tags
  tags: z.array(z.string()).optional(),
  
  // Comments
  comments: z.array(z.object({
    id: z.string(),
    content: z.string(),
    authorId: z.string(),
    createdAt: TimestampSchema,
  })).optional(),
  
  // Audit
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
});

export type ValidatedTask = z.infer<typeof TaskSchema>;

