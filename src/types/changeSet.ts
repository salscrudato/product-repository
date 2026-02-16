/**
 * ChangeSet Types
 * Types for bundling edits across artifacts with governed approval/publish workflow
 */

import { Timestamp } from 'firebase/firestore';
import { VersionedEntityType } from './versioning';

// ============================================================================
// ChangeSet Status
// ============================================================================

/**
 * Status workflow: draft → ready_for_review → approved → filed → published (or rejected)
 */
export type ChangeSetStatus =
  | 'draft'           // Being edited, not yet ready for review
  | 'ready_for_review' // Submitted for review/approval
  | 'approved'        // All required approvals obtained
  | 'filed'           // Filed with regulatory body
  | 'published'       // All items published, changeset complete
  | 'rejected';       // Rejected during approval process

/**
 * Transitions allowed from each status
 */
export const CHANGESET_STATUS_TRANSITIONS: Record<ChangeSetStatus, ChangeSetStatus[]> = {
  draft: ['ready_for_review'],
  ready_for_review: ['draft', 'approved', 'rejected'],
  approved: ['ready_for_review', 'filed', 'published'],
  filed: ['published'],
  published: [],
  rejected: ['draft'],
};

/**
 * Status display configuration
 */
export const CHANGESET_STATUS_CONFIG: Record<ChangeSetStatus, { label: string; color: string; icon: string }> = {
  draft: { label: 'Draft', color: '#6B7280', icon: 'edit' },
  ready_for_review: { label: 'Ready for Review', color: '#F59E0B', icon: 'eye' },
  approved: { label: 'Approved', color: '#10B981', icon: 'check' },
  filed: { label: 'Filed', color: '#3B82F6', icon: 'file-text' },
  published: { label: 'Published', color: '#059669', icon: 'check-circle' },
  rejected: { label: 'Rejected', color: '#EF4444', icon: 'x-circle' },
};

// ============================================================================
// ChangeSet Item Action
// ============================================================================

export type ChangeSetItemAction = 'create' | 'update' | 'deprecate' | 'delete_requested';

export const CHANGESET_ITEM_ACTION_CONFIG: Record<ChangeSetItemAction, { label: string; color: string; icon: string }> = {
  create: { label: 'Create', color: '#10B981', icon: 'plus' },
  update: { label: 'Update', color: '#3B82F6', icon: 'pencil' },
  deprecate: { label: 'Deprecate', color: '#F59E0B', icon: 'archive' },
  delete_requested: { label: 'Delete Requested', color: '#EF4444', icon: 'trash' },
};

// ============================================================================
// Approval Types
// ============================================================================

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ApprovalRoleRequired = 'actuary' | 'compliance' | 'underwriter' | 'admin' | 'product_manager';

/**
 * Approval rules by artifact type
 */
export const APPROVAL_RULES: Record<VersionedEntityType | 'stateProgram', ApprovalRoleRequired[]> = {
  product: ['product_manager'],
  coverage: ['product_manager'],
  form: ['compliance'],
  rule: ['underwriter', 'compliance'],
  rateProgram: ['actuary'],
  table: ['actuary'],
  dataDictionary: ['product_manager'],
  stateProgram: ['compliance'],
};

// ============================================================================
// ChangeSet Interfaces
// ============================================================================

/**
 * Main ChangeSet document
 */
export interface ChangeSet {
  id: string;
  name: string;
  description?: string;
  targetEffectiveStart?: string | null;
  targetEffectiveEnd?: string | null;
  status: ChangeSetStatus;
  ownerUserId: string;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
  /** Counts for quick display */
  itemCount?: number;
  pendingApprovalCount?: number;
}

/**
 * Item within a ChangeSet
 */
export interface ChangeSetItem {
  id: string;
  changeSetId: string;
  artifactType: VersionedEntityType | 'stateProgram';
  artifactId: string;
  artifactName?: string;
  versionId: string;
  action: ChangeSetItemAction;
  addedAt: Timestamp;
  addedBy: string;
}

/**
 * Approval record for a ChangeSet
 */
export interface ChangeSetApproval {
  id: string;
  changeSetId: string;
  roleRequired: ApprovalRoleRequired;
  approverUserId?: string;
  approverName?: string;
  status: ApprovalStatus;
  decidedAt?: Timestamp;
  notes?: string;
  createdAt: Timestamp;
}

// ============================================================================
// Audit Log Types (Standardized)
// ============================================================================

export type AuditLogAction =
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'ARCHIVE'
  | 'APPROVE' | 'REJECT' | 'PUBLISH' | 'FILE'
  | 'ADD_TO_CHANGESET' | 'REMOVE_FROM_CHANGESET'
  | 'SUBMIT_FOR_REVIEW' | 'RETURN_TO_DRAFT';

export type AuditLogEntityType =
  | 'product' | 'coverage' | 'form' | 'rule' | 'rateProgram' | 'table' | 'dataDictionary'
  | 'stateProgram' | 'changeSet' | 'approval';

/**
 * Standardized audit log entry
 */
export interface AuditLogEntry {
  id: string;
  actorUserId: string;
  actorEmail?: string;
  actorName?: string;
  action: AuditLogAction;
  entityType: AuditLogEntityType;
  entityId: string;
  entityName?: string;
  versionId?: string;
  changeSetId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  diff?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  requestId?: string;
  correlationId?: string;
  createdAt: Timestamp;
  metadata?: Record<string, unknown>;
}

