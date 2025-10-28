/**
 * Pricing Engine Types
 * Defines types for pricing steps, rules, and calculations
 */

import { Timestamp } from 'firebase/firestore';

/**
 * DataDictionaryField represents a field used in pricing inputs and calculations
 * Stored in: products/{productId}/dataDictionary/{fieldId}
 */
export interface DataDictionaryField {
  id: string;
  productId: string;
  
  // Field Identification
  /** Unique field name (e.g., 'buildingSquareFootage', 'protectionClass') */
  name: string;
  /** Display label for UI (e.g., 'Building Square Footage') */
  label: string;
  /** Field description */
  description?: string;
  
  // Type & Validation
  /** Field data type */
  type: 'number' | 'string' | 'boolean' | 'enum' | 'date';
  /** Enum options if type='enum' */
  enumOptions?: string[];
  /** Minimum value for numeric fields */
  min?: number;
  /** Maximum value for numeric fields */
  max?: number;
  /** Whether field is required */
  required?: boolean;
  /** Default value */
  defaultValue?: string | number | boolean;
  
  // Display & Organization
  /** Category for grouping in UI (e.g., 'Building', 'Operations', 'Claims') */
  category?: string;
  /** Display order within category */
  displayOrder?: number;
  
  // Metadata
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

/**
 * RatingInput represents user-provided input for rating calculation
 */
export interface RatingInput {
  [fieldName: string]: string | number | boolean | undefined;
}

/**
 * RatingResult represents the result of a rating calculation
 */
export interface RatingResult {
  /** Premium breakdown by step */
  stepBreakdown: Record<string, number>;
  /** Total premium */
  total: number;
  /** Calculation metadata */
  metadata?: {
    calculatedAt?: Date;
    productId?: string;
    coverageId?: string;
    inputsUsed?: RatingInput;
  };
}

