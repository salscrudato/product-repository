/**
 * Rating Engine Type Definitions
 * Comprehensive types for P&C insurance rating calculations
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Rating Table Types
// ============================================================================

export type RatingTableType = 
  | 'ClassCode' 
  | 'Territory' 
  | 'Factor' 
  | 'Lookup' 
  | 'Tier' 
  | 'Schedule'
  | 'ILF'  // Increased Limit Factors
  | 'LossMultiplier';

export interface RatingTableRow {
  id: string;
  key: string;           // Lookup key (e.g., territory code, class code)
  keyDescription?: string;
  value: number;         // Factor or rate value
  minValue?: number;
  maxValue?: number;
  effectiveDate?: Timestamp | Date;
  expirationDate?: Timestamp | Date;
  states?: string[];     // State-specific rows
  metadata?: Record<string, unknown>;
}

export interface RatingTable {
  id: string;
  productId: string;
  tableName: string;
  tableType: RatingTableType;
  description?: string;
  rows: RatingTableRow[];
  defaultValue?: number;
  effectiveDate?: Timestamp | Date;
  expirationDate?: Timestamp | Date;
  version?: number;
  states?: string[];     // State-specific tables
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
}

// ============================================================================
// Territory Rating
// ============================================================================

export interface Territory {
  id: string;
  productId: string;
  territoryCode: string;
  territoryName: string;
  description?: string;
  factor: number;
  zipCodes?: string[];
  counties?: string[];
  states: string[];
  riskLevel?: 'Low' | 'Medium' | 'High' | 'Critical';
  catastropheZone?: boolean;
  windPool?: boolean;
  effectiveDate?: Timestamp | Date;
  expirationDate?: Timestamp | Date;
}

// ============================================================================
// Class Code Rating
// ============================================================================

export interface ClassCode {
  id: string;
  productId: string;
  classCode: string;
  naicsCode?: string;
  sicCode?: string;
  isoCode?: string;
  description: string;
  baseRate: number;
  hazardGrade?: 'A' | 'B' | 'C' | 'D' | 'E';
  eligibility: 'Standard' | 'Preferred' | 'Substandard' | 'Declined';
  requiredCoverages?: string[];
  excludedCoverages?: string[];
  specialConditions?: string[];
  lossHistoryFactor?: number;
  states?: string[];
  effectiveDate?: Timestamp | Date;
  expirationDate?: Timestamp | Date;
}

// ============================================================================
// Rating Algorithm Configuration
// ============================================================================

export type RatingOperationType = 
  | 'BaseRate'
  | 'Multiply' 
  | 'Add' 
  | 'Subtract' 
  | 'Divide'
  | 'Min'
  | 'Max'
  | 'Lookup'
  | 'Conditional';

export interface RatingStep {
  id: string;
  productId: string;
  coverageId?: string;
  stepOrder: number;
  stepName: string;
  description?: string;
  operationType: RatingOperationType;
  
  // Operation details
  sourceField?: string;        // Field to use for lookup/calculation
  tableId?: string;            // Rating table ID for lookups
  fixedValue?: number;         // Fixed factor/amount
  formula?: string;            // Custom formula expression
  
  // Conditional logic
  condition?: RatingCondition;
  
  // Output
  outputField: string;         // Field to store result
  roundingMethod?: 'None' | 'Round' | 'Floor' | 'Ceiling';
  roundingPrecision?: number;
  
  // State variations
  stateOverrides?: Record<string, Partial<RatingStep>>;
  
  // Metadata
  isActive?: boolean;
  effectiveDate?: Timestamp | Date;
  expirationDate?: Timestamp | Date;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface RatingCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between';
  value: unknown;
  logicalOperator?: 'AND' | 'OR';
  nestedConditions?: RatingCondition[];
}

