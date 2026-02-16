/**
 * Data Dictionary Types
 * Defines the enforceable input contract for Pricing, Rules, and Tables
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Field Types
// ============================================================================

/** Supported data types for dictionary fields */
export type DataDictionaryFieldType = 
  | 'string' 
  | 'int' 
  | 'decimal' 
  | 'boolean' 
  | 'date' 
  | 'enum';

/** Field status for lifecycle management */
export type DataDictionaryFieldStatus = 'active' | 'deprecated';

/** Field categories for organization */
export type DataDictionaryCategory =
  | 'property'
  | 'liability'
  | 'operations'
  | 'claims'
  | 'location'
  | 'insured'
  | 'policy'
  | 'coverage'
  | 'custom';

// ============================================================================
// Validation Rules
// ============================================================================

/** Validation rules for a field */
export interface FieldValidation {
  /** Minimum value (for numeric types) */
  min?: number;
  /** Maximum value (for numeric types) */
  max?: number;
  /** Regex pattern (for string types) */
  pattern?: string;
  /** Pattern description for error messages */
  patternDescription?: string;
  /** Minimum length (for string types) */
  minLength?: number;
  /** Maximum length (for string types) */
  maxLength?: number;
  /** Minimum date (for date types) */
  minDate?: string;
  /** Maximum date (for date types) */
  maxDate?: string;
}

// ============================================================================
// Data Dictionary Field
// ============================================================================

/**
 * DataDictionaryField - The enforceable input contract
 * Stored in: orgs/{orgId}/dataDictionary/{fieldId}
 */
export interface DataDictionaryField {
  id: string;
  
  // Field Identification
  /** Unique field code (e.g., 'building_sqft', 'protection_class') - MUST be unique */
  code: string;
  /** Display name for UI (e.g., 'Building Square Footage') */
  displayName: string;
  /** Category for grouping */
  category: DataDictionaryCategory;
  /** Detailed description */
  description?: string;
  
  // Type & Validation
  /** Field data type */
  type: DataDictionaryFieldType;
  /** Unit of measurement (e.g., 'sqft', 'USD', '%') */
  unit?: string;
  /** Allowed values for enum type */
  allowedValues?: string[];
  /** Validation rules */
  validation?: FieldValidation;
  /** Whether field is required */
  required?: boolean;
  /** Default value */
  defaultValue?: string | number | boolean;
  
  // Status & Lifecycle
  /** Field status */
  status: DataDictionaryFieldStatus;
  /** Deprecation message if status is 'deprecated' */
  deprecationMessage?: string;
  /** Replacement field code if deprecated */
  replacedBy?: string;
  
  // Audit
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================================
// Field Reference Validation
// ============================================================================

/** Result of validating field references */
export interface FieldReferenceValidation {
  isValid: boolean;
  errors: FieldReferenceError[];
  warnings: FieldReferenceWarning[];
}

/** Error when a field reference is invalid */
export interface FieldReferenceError {
  /** The invalid field code */
  fieldCode: string;
  /** Where the reference was found */
  location: string;
  /** Error message */
  message: string;
  /** Link to fix the issue */
  linkTo?: string;
}

/** Warning for deprecated field references */
export interface FieldReferenceWarning {
  /** The deprecated field code */
  fieldCode: string;
  /** Where the reference was found */
  location: string;
  /** Warning message */
  message: string;
  /** Suggested replacement */
  suggestedReplacement?: string;
}

// ============================================================================
// Field Usage Tracking
// ============================================================================

/** Where a field is used */
export interface FieldUsage {
  /** Field code */
  fieldCode: string;
  /** Usage locations */
  usedIn: FieldUsageLocation[];
}

/** A specific location where a field is used */
export interface FieldUsageLocation {
  /** Type of artifact using the field */
  artifactType: 'pricing_step' | 'rule' | 'table' | 'coverage';
  /** Artifact ID */
  artifactId: string;
  /** Artifact name for display */
  artifactName: string;
  /** Link to the artifact */
  linkTo: string;
}

