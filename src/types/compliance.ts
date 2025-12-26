/**
 * Compliance & Regulatory Type Definitions
 * Types for state filings, approvals, and regulatory compliance
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// State Filing Types
// ============================================================================

export type FilingStatus = 
  | 'NotFiled'
  | 'Draft'
  | 'Pending'
  | 'UnderReview'
  | 'Approved'
  | 'ConditionallyApproved'
  | 'Objection'
  | 'Withdrawn'
  | 'Rejected'
  | 'Expired';

export type FilingType = 
  | 'NewProduct'
  | 'RateChange'
  | 'RuleChange'
  | 'FormRevision'
  | 'Withdrawal'
  | 'InformationalOnly';

export interface StateFiling {
  id: string;
  productId: string;
  state: string;
  stateName: string;
  
  // Filing Details
  filingType: FilingType;
  filingStatus: FilingStatus;
  serffTrackingNumber?: string;
  companyTrackingNumber?: string;
  
  // Dates
  filingDate?: Timestamp | Date;
  acknowledgementDate?: Timestamp | Date;
  effectiveDate?: Timestamp | Date;
  approvalDate?: Timestamp | Date;
  expirationDate?: Timestamp | Date;
  
  // Rate Information
  overallRateChange?: number;      // Percentage change
  avgRateChange?: number;
  minRateChange?: number;
  maxRateChange?: number;
  affectedPolicies?: number;
  premiumImpact?: number;
  
  // Forms
  filedFormIds?: string[];
  supportingDocuments?: FilingDocument[];
  
  // Objections/Conditions
  objections?: FilingObjection[];
  conditions?: string[];
  
  // Metadata
  filedBy?: string;
  reviewedBy?: string;
  notes?: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface FilingDocument {
  id: string;
  documentType: 'Actuarial' | 'LossExperience' | 'SupportingData' | 'Form' | 'Other';
  fileName: string;
  filePath: string;
  downloadUrl?: string;
  uploadedAt: Timestamp | Date;
  uploadedBy: string;
}

export interface FilingObjection {
  id: string;
  objectionDate: Timestamp | Date;
  objectionText: string;
  responseRequired: boolean;
  responseDeadline?: Timestamp | Date;
  responseDate?: Timestamp | Date;
  responseText?: string;
  resolved: boolean;
}

// ============================================================================
// Compliance Status
// ============================================================================

export type ComplianceStatus = 
  | 'Compliant'
  | 'NonCompliant'
  | 'PendingReview'
  | 'RequiresAction'
  | 'NotApplicable';

export interface StateComplianceStatus {
  id: string;
  productId: string;
  state: string;
  
  // Overall Status
  overallStatus: ComplianceStatus;
  
  // Individual Compliance Areas
  formCompliance: ComplianceStatus;
  rateCompliance: ComplianceStatus;
  ruleCompliance: ComplianceStatus;
  
  // Issues
  issues: ComplianceIssue[];
  
  // Dates
  lastReviewDate?: Timestamp | Date;
  nextReviewDate?: Timestamp | Date;
  
  // Metadata
  reviewedBy?: string;
  notes?: string;
  updatedAt?: Timestamp | Date;
}

export interface ComplianceIssue {
  id: string;
  issueType: 'Form' | 'Rate' | 'Rule' | 'Coverage' | 'Other';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  affectedEntityId?: string;
  affectedEntityType?: string;
  resolution?: string;
  resolvedDate?: Timestamp | Date;
  dueDate?: Timestamp | Date;
  assignedTo?: string;
}

// ============================================================================
// Circular Letters & Bulletins
// ============================================================================

export interface RegulatoryBulletin {
  id: string;
  state: string;
  bulletinNumber: string;
  bulletinType: 'CircularLetter' | 'Bulletin' | 'Advisory' | 'Mandate';
  title: string;
  summary: string;
  issueDate: Timestamp | Date;
  effectiveDate?: Timestamp | Date;
  complianceDeadline?: Timestamp | Date;
  affectedProducts?: string[];
  affectedCoverages?: string[];
  actionRequired: boolean;
  actionTaken?: string;
  documentUrl?: string;
  createdAt?: Timestamp | Date;
}

