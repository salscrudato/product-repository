/**
 * Coverage Configuration Types
 * 
 * Types for the coverage configuration experience including:
 * - Readiness/Completeness indicators
 * - Form linkage metadata
 * - Pricing configuration
 * - Rules configuration
 * - Config Copilot types
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Readiness / Completeness Types
// ============================================================================

/**
 * Coverage readiness status
 */
export type ReadinessStatus = 'complete' | 'partial' | 'incomplete' | 'not_applicable';

/**
 * Individual configuration area status
 */
export interface ConfigAreaStatus {
  area: 'limits' | 'deductibles' | 'states' | 'forms' | 'pricing' | 'rules';
  status: ReadinessStatus;
  count: number;
  requiredCount?: number;
  issues?: string[];
  deepLink?: string;
}

/**
 * Overall coverage readiness
 */
export interface CoverageReadiness {
  coverageId: string;
  overallStatus: ReadinessStatus;
  completenessScore: number; // 0-100
  areas: ConfigAreaStatus[];
  missingRequired: string[];
  lastCalculatedAt: Timestamp | Date;
}

// ============================================================================
// Form Linkage Types (Enhanced)
// ============================================================================

/**
 * Form role in relation to coverage
 */
export type FormRole = 
  | 'base'           // Base/primary form
  | 'endorsement'    // Modifying endorsement
  | 'exclusion'      // Exclusionary endorsement
  | 'notice'         // Informational notice
  | 'schedule'       // Schedule of coverage
  | 'conditions'     // Policy conditions
  | 'declarations'   // Declarations page
  | 'other';         // Other

/**
 * Enhanced form-coverage linkage with metadata
 */
export interface CoverageFormLink {
  id: string;
  formId: string;
  coverageId: string;
  productId: string;
  
  // Linkage metadata
  role: FormRole;
  isMandatory: boolean;
  displayOrder: number;
  
  // Effective dates
  effectiveDate?: Timestamp | Date;
  expirationDate?: Timestamp | Date;
  
  // State scope
  stateScope: 'all' | 'selected' | 'excluded';
  states?: string[];  // States where this link applies (if stateScope is 'selected' or 'excluded')
  
  // Form metadata (denormalized for display)
  formNumber?: string;
  formName?: string;
  formEditionDate?: string;
  
  // Notes
  notes?: string;
  
  // Audit
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
}

// ============================================================================
// Pricing Configuration Types (Coverage-scoped)
// ============================================================================

/**
 * Exposure basis for coverage pricing
 */
export type ExposureBasis = 
  | 'TIV'            // Total Insured Value
  | 'payroll'        // Payroll
  | 'revenue'        // Revenue/Sales
  | 'sqft'           // Square footage
  | 'units'          // Number of units
  | 'vehicles'       // Vehicle count
  | 'employees'      // Employee count
  | 'flat'           // Flat amount
  | 'custom';        // Custom basis

/**
 * Coverage-level pricing configuration
 */
export interface CoveragePricingConfig {
  id: string;
  coverageId: string;
  productId: string;
  
  // Exposure
  exposureBasis: ExposureBasis;
  exposureField?: string;  // Data dictionary field reference
  
  // Base rate
  baseRate?: number;
  baseRateType: 'perThousand' | 'perHundred' | 'perUnit' | 'flat' | 'percentage';
  
  // Minimum premium
  minimumPremium?: number;
  
  // State applicability
  stateRates?: Record<string, number>;  // State-specific base rates
  
  // Priority/order in calculation
  calculationOrder: number;
  
  // Audit
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// ============================================================================
// Rules Configuration Types (Coverage-scoped)
// ============================================================================

/**
 * Rule severity/action level
 */
export type RuleSeverity = 'info' | 'warning' | 'block' | 'referral';

/**
 * Rule action
 */
export type RuleAction =
  | 'allow'
  | 'decline'
  | 'referral'
  | 'require_approval'
  | 'add_note'
  | 'apply_surcharge'
  | 'exclude_coverage';

/**
 * Condition operator
 */
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'contains'
  | 'not_contains'
  | 'in_list'
  | 'not_in_list'
  | 'between'
  | 'is_empty'
  | 'is_not_empty';

/**
 * Single condition in a rule
 */
export interface RuleCondition {
  id: string;
  field: string;  // Data dictionary field reference
  fieldLabel?: string;  // Human-readable label
  operator: ConditionOperator;
  value: string | number | boolean | string[] | [number, number];
  valueLabel?: string;  // Human-readable value
}

/**
 * Condition group (AND/OR)
 */
export interface ConditionGroup {
  id: string;
  logic: 'AND' | 'OR';
  conditions: RuleCondition[];
  nestedGroups?: ConditionGroup[];
}

/**
 * Coverage-scoped rule with structured conditions
 */
export interface CoverageRule {
  id: string;
  coverageId: string;
  productId: string;

  // Rule identification
  name: string;
  description?: string;

  // Classification
  ruleType: 'eligibility' | 'referral' | 'underwriting' | 'pricing' | 'compliance';
  severity: RuleSeverity;

  // Structured conditions
  conditionGroup: ConditionGroup;

  // Actions
  actions: Array<{
    type: RuleAction;
    value?: string | number;
    message?: string;
  }>;

  // Priority
  priority: number;

  // State scope
  states?: string[];
  allStates?: boolean;

  // Effective dates
  effectiveDate?: Timestamp | Date;
  expirationDate?: Timestamp | Date;

  // Status
  isActive: boolean;

  // Template reference
  templateId?: string;

  // Audit
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
}

/**
 * Rule template for quick creation
 */
export interface CoverageRuleTemplate {
  id: string;
  name: string;
  description: string;
  category: 'eligibility' | 'referral' | 'underwriting' | 'pricing' | 'compliance';
  lineOfBusiness?: string;
  conditionGroup: ConditionGroup;
  defaultActions: CoverageRule['actions'];
  isBuiltIn: boolean;
}

// ============================================================================
// Coverage Config Copilot Types
// ============================================================================

/**
 * Config copilot mode/area
 */
export type CopilotConfigMode = 'limits' | 'deductibles' | 'states' | 'forms' | 'pricing' | 'rules';

/**
 * Copilot conversation message
 */
export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Timestamp | Date;

  // AI response metadata
  proposedChanges?: ProposedConfigChange[];
  questions?: CopilotQuestion[];
  confidence?: number;
  warnings?: string[];
}

/**
 * Proposed change from AI
 */
export interface ProposedConfigChange {
  id: string;
  area: CopilotConfigMode;
  action: 'create' | 'update' | 'delete';
  description: string;
  data: Record<string, unknown>;
  status: 'pending' | 'applied' | 'rejected';
}

/**
 * Follow-up question from AI
 */
export interface CopilotQuestion {
  id: string;
  text: string;
  fieldHints?: string[];
  required: boolean;
}

/**
 * Copilot conversation session
 */
export interface CopilotSession {
  id: string;
  productId: string;
  coverageId: string;
  mode: CopilotConfigMode;
  messages: CopilotMessage[];
  pendingChanges: ProposedConfigChange[];
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// ============================================================================
// State Management Types
// ============================================================================

/**
 * US State regions for bulk selection
 */
export const US_STATE_REGIONS: Record<string, string[]> = {
  'Northeast': ['CT', 'ME', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT'],
  'Southeast': ['AL', 'FL', 'GA', 'KY', 'MS', 'NC', 'SC', 'TN', 'VA', 'WV'],
  'Midwest': ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'],
  'Southwest': ['AZ', 'NM', 'OK', 'TX'],
  'West': ['AK', 'CA', 'CO', 'HI', 'ID', 'MT', 'NV', 'OR', 'UT', 'WA', 'WY'],
  'MidAtlantic': ['DE', 'DC', 'MD', 'NJ', 'NY', 'PA'],
  'NewEngland': ['CT', 'ME', 'MA', 'NH', 'RI', 'VT'],
  'GreatLakes': ['IL', 'IN', 'MI', 'MN', 'OH', 'WI'],
  'Plains': ['IA', 'KS', 'MN', 'MO', 'NE', 'ND', 'SD'],
  'Mountain': ['AZ', 'CO', 'ID', 'MT', 'NV', 'NM', 'UT', 'WY'],
  'Pacific': ['AK', 'CA', 'HI', 'OR', 'WA'],
};

/**
 * All US state codes
 */
export const ALL_US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
  'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

/**
 * State code to name mapping
 */
export const STATE_NAMES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'DC': 'District of Columbia', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii',
  'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine',
  'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota',
  'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska',
  'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico',
  'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island',
  'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas',
  'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington',
  'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
};

// ============================================================================
// State Availability Types
// ============================================================================

/**
 * State-specific availability configuration for a coverage
 */
export interface CoverageStateAvailability {
  id: string;
  stateCode: string;
  isAvailable: boolean;
  effectiveDate?: Timestamp | Date;
  expirationDate?: Timestamp | Date;
  overrides?: StateOverride[];
  notes?: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

/**
 * State-level override for limits, deductibles, or forms
 */
export interface StateOverride {
  id: string;
  field: string;
  value: unknown;
  reason?: string;
}

/**
 * Rating factor for coverage
 */
export interface CoverageRatingFactor {
  id: string;
  coverageId: string;
  productId: string;
  
  name: string;
  description?: string;
  
  // Factor type
  factorType: 'multiplier' | 'additive' | 'table';
  
  // Source field
  sourceField?: string;  // Data dictionary reference
  
  // Factor values
  defaultValue: number;
  values?: Record<string, number>;  // Lookup table
  
  // Application order
  order: number;
  
  // State applicability
  states?: string[];
  
  // Audit
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

