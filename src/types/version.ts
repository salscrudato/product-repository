/**
 * Version Control Type Definitions
 * Types for product versioning, change tracking, and approval workflows
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Product Versioning
// ============================================================================

export type VersionStatus = 
  | 'Draft'
  | 'PendingReview'
  | 'Approved'
  | 'Published'
  | 'Superseded'
  | 'Archived';

export interface ProductVersion {
  id: string;
  productId: string;
  versionNumber: string;     // Semantic versioning: 1.0.0
  versionStatus: VersionStatus;
  
  // Version Details
  versionName?: string;
  description?: string;
  changeLog?: string;
  
  // Dates
  createdAt: Timestamp | Date;
  publishedAt?: Timestamp | Date;
  effectiveDate?: Timestamp | Date;
  expirationDate?: Timestamp | Date;
  
  // Approval
  approvalStatus?: ApprovalStatus;
  
  // Snapshot
  snapshotId?: string;       // Reference to frozen product state
  
  // Metadata
  createdBy: string;
  publishedBy?: string;
  previousVersionId?: string;
  nextVersionId?: string;
}

// ============================================================================
// Change Tracking
// ============================================================================

export type ChangeType = 
  | 'Created'
  | 'Updated'
  | 'Deleted'
  | 'Restored';

export interface ChangeRecord {
  id: string;
  versionId: string;
  productId: string;
  
  // Change Details
  changeType: ChangeType;
  entityType: string;        // Coverage, Form, RatingTable, etc.
  entityId: string;
  entityName?: string;
  
  // Before/After
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  diff?: FieldDiff[];
  
  // Metadata
  changedAt: Timestamp | Date;
  changedBy: string;
  reason?: string;
}

export interface FieldDiff {
  fieldPath: string;
  oldValue: unknown;
  newValue: unknown;
  changeType: 'Added' | 'Modified' | 'Removed';
}

// ============================================================================
// Approval Workflow
// ============================================================================

export type ApprovalStatus = 
  | 'NotSubmitted'
  | 'Pending'
  | 'InReview'
  | 'Approved'
  | 'Rejected'
  | 'Recalled';

export type ApproverRole = 
  | 'ProductOwner'
  | 'Actuary'
  | 'Compliance'
  | 'Legal'
  | 'IT'
  | 'Executive';

export interface ApprovalRequest {
  id: string;
  versionId: string;
  productId: string;
  
  // Request Details
  requestType: 'VersionApproval' | 'PublishApproval' | 'EmergencyChange';
  status: ApprovalStatus;
  priority: 'Low' | 'Normal' | 'High' | 'Critical';
  
  // Requestor
  requestedBy: string;
  requestedAt: Timestamp | Date;
  requestNotes?: string;
  
  // Approval Chain
  approvers: ApprovalStep[];
  currentStep: number;
  
  // Resolution
  resolvedAt?: Timestamp | Date;
  resolution?: 'Approved' | 'Rejected';
  resolutionNotes?: string;
  
  // Metadata
  dueDate?: Timestamp | Date;
  attachments?: string[];
}

export interface ApprovalStep {
  stepNumber: number;
  role: ApproverRole;
  userId?: string;
  userName?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Skipped';
  actionAt?: Timestamp | Date;
  notes?: string;
  required: boolean;
  canDelegate?: boolean;
}

// ============================================================================
// Comments & Collaboration
// ============================================================================

export interface ProductComment {
  id: string;
  productId: string;
  versionId?: string;
  entityId?: string;
  entityType?: string;
  
  // Comment Content
  content: string;
  isResolved: boolean;
  
  // Thread
  parentCommentId?: string;
  replies?: ProductComment[];
  
  // Mentions
  mentions?: string[];       // User IDs
  
  // Metadata
  createdBy: string;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  resolvedBy?: string;
  resolvedAt?: Timestamp | Date;
}

