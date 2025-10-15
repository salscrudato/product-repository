/**
 * Core Type Definitions for Insurance Product Hub
 * Centralized type definitions for the entire application
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Product Types
// ============================================================================

export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  status?: 'active' | 'inactive' | 'draft';
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  metadata?: Record<string, unknown>;
}

export interface ProductFormData {
  name: string;
  description?: string;
  category?: string;
  status?: 'active' | 'inactive' | 'draft';
}

// ============================================================================
// Coverage Types
// ============================================================================

export interface Coverage {
  id: string;
  productId: string;
  name: string;
  description?: string;
  type?: string;
  limit?: number | string;
  deductible?: number | string;
  premium?: number;
  isOptional?: boolean;
  subCoverages?: SubCoverage[];
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  metadata?: Record<string, unknown>;
}

export interface SubCoverage {
  id: string;
  coverageId: string;
  name: string;
  description?: string;
  limit?: number | string;
  deductible?: number | string;
  premium?: number;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface CoverageFormData {
  productId: string;
  name: string;
  description?: string;
  type?: string;
  limit?: number | string;
  deductible?: number | string;
  premium?: number;
  isOptional?: boolean;
}

// ============================================================================
// Pricing Types
// ============================================================================

export interface PricingRule {
  id: string;
  productId: string;
  coverageId?: string;
  name: string;
  description?: string;
  ruleType: 'base' | 'modifier' | 'discount' | 'surcharge';
  value: number;
  valueType: 'percentage' | 'fixed';
  conditions?: PricingCondition[];
  priority?: number;
  isActive?: boolean;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface PricingCondition {
  field: string;
  operator: 'equals' | 'greaterThan' | 'lessThan' | 'contains' | 'between';
  value: string | number | boolean | [number, number];
}

// ============================================================================
// Form Types
// ============================================================================

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'radio' | 'date' | 'textarea';
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  dependsOn?: string;
  metadata?: Record<string, unknown>;
}

export interface FormFieldOption {
  label: string;
  value: string | number;
}

export interface FormFieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export interface FormTemplate {
  id: string;
  productId: string;
  name: string;
  description?: string;
  fields: FormField[];
  version?: string;
  isActive?: boolean;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// ============================================================================
// State/Geography Types
// ============================================================================

export interface StateAvailability {
  id: string;
  productId: string;
  stateCode: string;
  stateName: string;
  isAvailable: boolean;
  effectiveDate?: Date | Timestamp;
  expirationDate?: Date | Timestamp;
  restrictions?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Rules Types
// ============================================================================

export interface BusinessRule {
  id: string;
  productId: string;
  name: string;
  description?: string;
  ruleType: 'eligibility' | 'underwriting' | 'validation' | 'calculation';
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority?: number;
  isActive?: boolean;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'in' | 'between';
  value: unknown;
  logicalOperator?: 'AND' | 'OR';
}

export interface RuleAction {
  type: 'set' | 'calculate' | 'validate' | 'reject' | 'approve';
  target: string;
  value?: unknown;
  message?: string;
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  expiresAt?: number;
  metadata?: Record<string, unknown>;
}

export interface CacheOptions {
  ttl?: number;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: {
    timestamp: number;
    requestId?: string;
    cached?: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

// ============================================================================
// UI Component Types
// ============================================================================

export interface TableColumn<T = unknown> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  width?: string | number;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  total: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterOptions {
  field: string;
  value: unknown;
  operator?: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
}

// ============================================================================
// Performance & Monitoring Types
// ============================================================================

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  message: string;
  timestamp: number;
  data?: Record<string, unknown>;
  error?: Error;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type AsyncResult<T, E = Error> = Promise<{ data: T; error: null } | { data: null; error: E }>;

