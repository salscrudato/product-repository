/**
 * Enhanced Coverage Type Definitions
 * Production-Ready P&C Insurance Product Data Model
 * 
 * This file contains the recommended enhanced type definitions for a comprehensive
 * insurance product management system. These types address the gaps identified in
 * the data model review and provide full support for P&C insurance complexity.
 * 
 * @version 2.0.0
 * @date 2025-10-15
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Coverage Limit Types
// ============================================================================

export type LimitType = 
  | 'perOccurrence'      // Per occurrence/per claim limit
  | 'aggregate'          // Annual aggregate limit
  | 'perPerson'          // Per person limit (liability)
  | 'perLocation'        // Per location limit (property)
  | 'sublimit'           // Sublimit for specific perils/property
  | 'combined'           // Combined single limit
  | 'split';             // Split limits (e.g., 100/300/100)

export interface CoverageLimit {
  id: string;
  coverageId: string;
  productId: string;
  
  // Limit Details
  limitType: LimitType;
  amount: number;
  displayValue: string;  // '$1,000,000' or '100/300/100'
  
  // Applicability
  appliesTo?: string[];  // Specific perils, property types, or situations
  description?: string;
  
  // Behavior
  isDefault?: boolean;
  isRequired?: boolean;
  minAmount?: number;
  maxAmount?: number;
  
  // Relationships
  parentLimitId?: string;  // For sublimits that reduce from parent
  
  // Metadata
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// ============================================================================
// Coverage Deductible Types
// ============================================================================

export type DeductibleType =
  | 'flat'               // Fixed dollar amount
  | 'percentage'         // Percentage of insured value or loss
  | 'franchise'          // Nothing if loss < deductible, full if >
  | 'disappearing'       // Reduces as loss increases
  | 'perOccurrence'      // Applied per claim
  | 'aggregate'          // Annual aggregate deductible
  | 'waiting';           // Waiting period (time deductible)

export interface CoverageDeductible {
  id: string;
  coverageId: string;
  productId: string;
  
  // Deductible Details
  deductibleType: DeductibleType;
  amount?: number;           // For flat deductibles
  percentage?: number;       // For percentage deductibles (e.g., 2 for 2%)
  displayValue: string;      // '$1,000' or '2%' or '30 days'
  
  // Applicability
  appliesTo?: string[];      // Specific perils or situations
  description?: string;
  
  // Behavior
  isDefault?: boolean;
  isRequired?: boolean;
  minAmount?: number;
  maxAmount?: number;
  
  // Special Rules for Percentage Deductibles
  minimumRetained?: number;  // Minimum dollar amount retained
  maximumRetained?: number;  // Maximum dollar amount retained
  
  // Special Rules for Disappearing Deductibles
  disappearingSchedule?: {
    lossAmount: number;
    deductibleAmount: number;
  }[];
  
  // Metadata
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// ============================================================================
// Coverage Exclusion Types
// ============================================================================

export type ExclusionType =
  | 'named'              // Named peril or situation excluded
  | 'general'            // Broad category exclusion
  | 'conditional'        // Excluded unless conditions met
  | 'absolute'           // Cannot be bought back
  | 'buyback';           // Can be bought back via endorsement

export interface CoverageExclusion {
  id: string;
  name: string;
  description: string;
  type: ExclusionType;
  
  // Reference
  reference?: string;         // Form number or section reference
  formId?: string;            // Link to form document
  
  // Classification
  isStandard?: boolean;       // ISO standard vs. proprietary
  isAbsolute?: boolean;       // Cannot be bought back
  buybackEndorsementId?: string;  // Endorsement that removes this exclusion
  
  // Applicability
  appliesTo?: string[];       // Specific situations or perils
  
  // Metadata
  createdAt?: Timestamp | Date;
}

// ============================================================================
// Coverage Condition Types
// ============================================================================

export type ConditionType =
  | 'eligibility'        // Who/what is eligible for coverage
  | 'claims'             // Claims handling requirements
  | 'duties'             // Insured's duties after loss
  | 'general'            // General policy conditions
  | 'suspension'         // Conditions that suspend coverage
  | 'cancellation';      // Cancellation conditions

export interface CoverageCondition {
  id: string;
  name: string;
  description: string;
  type: ConditionType;
  
  // Behavior
  isRequired?: boolean;       // Must be met for coverage
  isSuspending?: boolean;     // Suspends coverage if not met
  
  // Reference
  reference?: string;         // Form number or section reference
  formId?: string;            // Link to form document
  
  // Metadata
  createdAt?: Timestamp | Date;
}

// ============================================================================
// Enhanced Coverage Interface
// ============================================================================

export type CoverageTrigger = 'occurrence' | 'claimsMade' | 'hybrid';
export type ValuationMethod = 'ACV' | 'RC' | 'agreedValue' | 'marketValue' | 'functionalRC' | 'statedAmount';
export type DepreciationMethod = 'straightLine' | 'decliningBalance' | 'none';
export type TerritoryType = 'worldwide' | 'USA' | 'stateSpecific' | 'custom';
export type EndorsementType = 'broadening' | 'restrictive' | 'clarifying' | 'additional';
export type PremiumBasis = 'flat' | 'perUnit' | 'rated' | 'manual';

export interface Coverage {
  // ========== Identity & Hierarchy ==========
  id: string;
  productId: string;
  name: string;
  description?: string;
  coverageCode?: string;
  
  // Hierarchical structure - if set, this is a sub-coverage
  parentCoverageId?: string;
  
  // ========== Classification ==========
  category?: 'base' | 'endorsement' | 'optional';
  type?: string;
  isOptional?: boolean;
  
  // ========== Coverage Scope ==========
  scopeOfCoverage?: string;
  perilsCovered?: string[];
  
  // ========== Financial Structure ==========
  /**
   * @deprecated Use Limits subcollection instead
   * Kept for backward compatibility during migration
   */
  limits?: string[];
  
  /**
   * @deprecated Use Deductibles subcollection instead
   * Kept for backward compatibility during migration
   */
  deductibles?: string[];
  
  // Premium Structure
  basePremium?: number;
  premiumBasis?: PremiumBasis;
  ratePerUnit?: number;
  minimumPremium?: number;
  
  // ========== Coinsurance & Participation ==========
  coinsurancePercentage?: number;  // 80, 90, 100
  hasCoinsurancePenalty?: boolean;
  insuredParticipation?: number;   // Percentage insured pays (copay)
  
  // ========== Coverage Triggers & Periods ==========
  coverageTrigger?: CoverageTrigger;
  waitingPeriod?: number;
  waitingPeriodUnit?: 'days' | 'months';
  allowRetroactiveDate?: boolean;
  extendedReportingPeriod?: number;  // Months
  
  // ========== Valuation ==========
  valuationMethod?: ValuationMethod;
  depreciationMethod?: DepreciationMethod;
  
  // ========== Territory ==========
  territoryType?: TerritoryType;
  states?: string[];  // State availability
  excludedTerritories?: string[];
  includedTerritories?: string[];
  
  // ========== Exclusions & Conditions ==========
  exclusions?: CoverageExclusion[];
  conditions?: CoverageCondition[];
  
  // ========== Endorsement Metadata ==========
  modifiesCoverageId?: string;      // Which coverage this endorsement modifies
  endorsementType?: EndorsementType;
  supersedes?: string[];            // Coverage IDs this replaces
  
  // ========== Underwriting ==========
  requiresUnderwriterApproval?: boolean;
  eligibilityCriteria?: string[];
  prohibitedClasses?: string[];     // Business classes that can't buy this
  requiredCoverages?: string[];     // Must be purchased with these
  incompatibleCoverages?: string[]; // Can't be purchased with these
  
  // ========== Claims ==========
  claimsReportingPeriod?: number;   // Days to report claim
  proofOfLossDeadline?: number;     // Days to submit proof
  hasSubrogationRights?: boolean;
  hasSalvageRights?: boolean;
  
  // ========== Metadata ==========
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Coverage Version (for regulatory compliance and audit trail)
// ============================================================================

export interface CoverageVersion {
  id: string;
  coverageId: string;
  productId: string;
  
  // Version Info
  versionNumber: string;        // '1.0', '2.0', etc.
  effectiveDate: Date | Timestamp;
  expirationDate?: Date | Timestamp;
  
  // Change Tracking
  changes: string;              // Description of what changed
  changedBy?: string;           // User who made the change
  approvedBy?: string;          // Underwriter/manager who approved
  
  // Regulatory
  regulatoryFilingNumber?: string;
  stateApprovals?: {
    state: string;
    approvalDate: Date;
    filingNumber: string;
  }[];
  
  // Snapshot
  snapshot: Coverage;           // Full coverage data at this version
  
  // Metadata
  createdAt: Timestamp | Date;
}

// ============================================================================
// Coverage Package (bundled coverages)
// ============================================================================

export type PackageType = 'required' | 'recommended' | 'popular' | 'custom';

export interface CoveragePackage {
  id: string;
  productId: string;
  
  // Package Info
  name: string;
  description?: string;
  packageType: PackageType;
  
  // Coverages
  coverageIds: string[];
  
  // Pricing
  discountPercentage?: number;  // Package discount
  packagePremium?: number;      // Override individual premiums
  
  // Metadata
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

