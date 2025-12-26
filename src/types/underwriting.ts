/**
 * Underwriting Type Definitions
 * Types for underwriting workflow, risk assessment, and approval chains
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Risk Assessment Types
// ============================================================================

export type RiskTier = 'Preferred' | 'Standard' | 'NonStandard' | 'Substandard' | 'Declined';

export type ReferralReason = 
  | 'HighTIV'
  | 'PoorLossHistory'
  | 'HighHazardClass'
  | 'CatastropheZone'
  | 'OutsideAppetite'
  | 'LargePremium'
  | 'NewVenture'
  | 'UnusualExposure'
  | 'MoralHazard'
  | 'ManualReview';

export interface RiskScore {
  id: string;
  productId: string;
  coverageId?: string;
  
  // Score Details
  overallScore: number;        // 0-100 scale
  riskTier: RiskTier;
  
  // Component Scores
  componentScores: RiskScoreComponent[];
  
  // Referral
  requiresReferral: boolean;
  referralReasons?: ReferralReason[];
  referralLevel?: 'Underwriter' | 'SeniorUW' | 'Manager' | 'VP';
  
  // Metadata
  calculatedAt: Timestamp | Date;
  calculatedBy?: string;
  inputs?: Record<string, unknown>;
  notes?: string;
}

export interface RiskScoreComponent {
  factor: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
  description?: string;
}

// ============================================================================
// Underwriting Authority
// ============================================================================

export type AuthorityLevel = 'Level1' | 'Level2' | 'Level3' | 'Level4' | 'Unlimited';

export interface UnderwritingAuthority {
  id: string;
  userId: string;
  userName: string;
  authorityLevel: AuthorityLevel;
  
  // Limits
  maxPremium: number;
  maxTIV: number;
  maxPolicyLimit?: number;
  
  // Scope
  allowedProducts?: string[];
  allowedStates?: string[];
  allowedClassCodes?: string[];
  
  // Restrictions
  restrictions?: string[];
  requiresCountersign?: boolean;
  countersignAuthority?: string;
  
  // Effective Dates
  effectiveDate: Timestamp | Date;
  expirationDate?: Timestamp | Date;
  
  // Metadata
  grantedBy: string;
  grantedAt: Timestamp | Date;
  notes?: string;
}

// ============================================================================
// Underwriting Workflow
// ============================================================================

export type WorkflowStatus = 
  | 'New'
  | 'InProgress'
  | 'PendingInfo'
  | 'PendingReferral'
  | 'Approved'
  | 'ConditionallyApproved'
  | 'Declined'
  | 'Withdrawn';

export interface UnderwritingWorkitem {
  id: string;
  productId: string;
  submissionId?: string;
  
  // Status
  status: WorkflowStatus;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  
  // Assignment
  assignedTo?: string;
  assignedAt?: Timestamp | Date;
  queue?: string;
  
  // Risk Information
  riskScore?: RiskScore;
  namedInsured: string;
  effectiveDate: Timestamp | Date;
  proposedPremium?: number;
  proposedTIV?: number;
  
  // Referral Chain
  referralChain?: ReferralAction[];
  
  // Decision
  decision?: UnderwritingDecision;
  
  // SLA
  receivedAt: Timestamp | Date;
  dueDate?: Timestamp | Date;
  completedAt?: Timestamp | Date;
  
  // Notes & Documents
  notes?: UnderwritingNote[];
  documents?: UnderwritingDocument[];
  
  // Metadata
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy: string;
}

export interface ReferralAction {
  id: string;
  referredTo: string;
  referredBy: string;
  referredAt: Timestamp | Date;
  reason: ReferralReason;
  notes?: string;
  decision?: 'Approved' | 'Declined' | 'Escalated';
  decisionAt?: Timestamp | Date;
  decisionNotes?: string;
}

export interface UnderwritingDecision {
  decision: 'Approved' | 'ConditionallyApproved' | 'Declined';
  decidedBy: string;
  decidedAt: Timestamp | Date;
  conditions?: string[];
  declineReason?: string;
  modifiedPremium?: number;
  modifiedTerms?: string[];
  expiresAt?: Timestamp | Date;
}

export interface UnderwritingNote {
  id: string;
  author: string;
  createdAt: Timestamp | Date;
  noteType: 'General' | 'RiskAssessment' | 'LossHistory' | 'Referral' | 'Decision';
  content: string;
  isInternal: boolean;
}

export interface UnderwritingDocument {
  id: string;
  documentType: 'Application' | 'LossRuns' | 'Inspection' | 'Financial' | 'Other';
  fileName: string;
  filePath: string;
  downloadUrl?: string;
  uploadedAt: Timestamp | Date;
  uploadedBy: string;
}

