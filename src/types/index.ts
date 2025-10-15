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

/**
 * Coverage represents an insurance coverage that can be part of a product.
 * Coverages can be hierarchical - a coverage with parentCoverageId is a sub-coverage.
 *
 * Database Structure:
 * - Stored in: products/{productId}/coverages/{coverageId}
 * - Sub-coverages use parentCoverageId to reference their parent
 * - Forms are linked via formCoverages junction table (not stored here)
 */
export interface Coverage {
  id: string;
  productId: string;
  name: string;
  description?: string;
  type?: string;
  category?: 'base' | 'endorsement' | 'optional';

  // Hierarchical structure - if set, this is a sub-coverage
  parentCoverageId?: string;

  // Coverage financial details
  limits?: string[];  // Array of available limit options
  deductibles?: string[];  // Array of available deductible options
  premium?: number;
  isOptional?: boolean;

  // State availability (must be subset of product's availableStates)
  states?: string[];

  // Additional coverage details
  coverageCode?: string;
  scopeOfCoverage?: string;
  perilsCovered?: string[];

  // Metadata
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  metadata?: Record<string, unknown>;
}

/**
 * @deprecated SubCoverage is now just a Coverage with parentCoverageId set.
 * Use Coverage interface instead and filter by parentCoverageId.
 * This interface is kept for backward compatibility only.
 */
export interface SubCoverage {
  id: string;
  parentCoverageId: string;  // Renamed from coverageId for clarity
  productId: string;
  name: string;
  description?: string;
  limits?: string[];
  deductibles?: string[];
  premium?: number;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface CoverageFormData {
  productId: string;
  name: string;
  description?: string;
  type?: string;
  category?: 'base' | 'endorsement' | 'optional';
  parentCoverageId?: string;
  limits?: string[];
  deductibles?: string[];
  premium?: number;
  isOptional?: boolean;
  states?: string[];
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

/**
 * FormTemplate represents an insurance form (policy form, endorsement, etc.)
 *
 * Database Structure:
 * - Stored in: forms/{formId}
 * - Linked to coverages via formCoverages junction table
 * - Do NOT store coverageIds or productIds arrays here (use formCoverages instead)
 */
export interface FormTemplate {
  id: string;

  // Form identification
  formNumber: string;
  formName?: string;
  formEditionDate?: string;

  // Primary product association (optional, for organizational purposes)
  productId?: string;

  // Form metadata
  name?: string;  // Deprecated: use formName instead
  description?: string;
  type?: string;  // e.g., 'coverage', 'endorsement', 'exclusion', 'notice'
  category?: string;

  // Form fields (for dynamic forms)
  fields?: FormField[];

  // Versioning
  version?: string;
  effectiveDate?: string | Timestamp | Date;

  // State availability (informational - actual coverage availability via formCoverages)
  states?: string[];

  // File storage
  filePath?: string;
  downloadUrl?: string;

  // Status
  isActive?: boolean;

  // Metadata
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

/**
 * FormCoverageMapping represents the many-to-many relationship between forms and coverages.
 * This is the SINGLE SOURCE OF TRUTH for form-coverage relationships.
 *
 * Database Structure:
 * - Stored in: formCoverages/{mappingId}
 */
export interface FormCoverageMapping {
  id: string;
  formId: string;
  coverageId: string;
  productId: string;  // Denormalized for efficient querying
  createdAt?: Timestamp | Date;
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
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type AsyncResult<T, E = Error> = Promise<{ data: T; error: null } | { data: null; error: E }>;

