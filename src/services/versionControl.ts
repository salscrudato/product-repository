/**
 * Version Control Service
 * Product versioning, change tracking, and approval workflows
 */

import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import type { 
  ProductVersion, 
  ChangeRecord, 
  ApprovalRequest,
  ApprovalStep,
  ProductComment,
  VersionStatus 
} from '../types/version';
import type { Product } from '../types';

// Collection references
const VERSIONS_COLLECTION = 'productVersions';
const CHANGES_COLLECTION = 'changeRecords';
const APPROVALS_COLLECTION = 'approvalRequests';
const COMMENTS_COLLECTION = 'productComments';

// ============================================================================
// Version Operations
// ============================================================================

export async function getVersions(productId: string): Promise<ProductVersion[]> {
  const q = query(
    collection(db, VERSIONS_COLLECTION),
    where('productId', '==', productId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductVersion));
}

export async function getVersion(versionId: string): Promise<ProductVersion | null> {
  const docRef = doc(db, VERSIONS_COLLECTION, versionId);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as ProductVersion : null;
}

export async function createVersion(
  productId: string,
  versionNumber: string,
  description: string,
  createdBy: string
): Promise<ProductVersion> {
  const version: Omit<ProductVersion, 'id'> = {
    productId,
    versionNumber,
    versionStatus: 'Draft',
    description,
    createdAt: Timestamp.now(),
    createdBy
  };
  
  const docRef = await addDoc(collection(db, VERSIONS_COLLECTION), version);
  return { id: docRef.id, ...version } as ProductVersion;
}

export async function updateVersionStatus(
  versionId: string, 
  status: VersionStatus
): Promise<void> {
  const docRef = doc(db, VERSIONS_COLLECTION, versionId);
  const updates: Partial<ProductVersion> = { versionStatus: status };
  
  if (status === 'Published') {
    updates.publishedAt = Timestamp.now();
  }
  
  await updateDoc(docRef, updates);
}

export function incrementVersion(currentVersion: string, type: 'major' | 'minor' | 'patch'): string {
  const parts = currentVersion.split('.').map(Number);
  while (parts.length < 3) parts.push(0);
  
  switch (type) {
    case 'major':
      return `${parts[0] + 1}.0.0`;
    case 'minor':
      return `${parts[0]}.${parts[1] + 1}.0`;
    case 'patch':
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    default:
      return currentVersion;
  }
}

// ============================================================================
// Change Tracking
// ============================================================================

export async function recordChange(
  versionId: string,
  productId: string,
  entityType: string,
  entityId: string,
  changeType: 'Created' | 'Updated' | 'Deleted',
  changedBy: string,
  beforeState?: Record<string, unknown>,
  afterState?: Record<string, unknown>
): Promise<ChangeRecord> {
  const change: Omit<ChangeRecord, 'id'> = {
    versionId,
    productId,
    changeType,
    entityType,
    entityId,
    beforeState,
    afterState,
    diff: computeDiff(beforeState, afterState),
    changedAt: Timestamp.now(),
    changedBy
  };
  
  const docRef = await addDoc(collection(db, CHANGES_COLLECTION), change);
  return { id: docRef.id, ...change } as ChangeRecord;
}

export async function getChangesForVersion(versionId: string): Promise<ChangeRecord[]> {
  const q = query(
    collection(db, CHANGES_COLLECTION),
    where('versionId', '==', versionId),
    orderBy('changedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChangeRecord));
}

function computeDiff(
  before?: Record<string, unknown>, 
  after?: Record<string, unknown>
): { fieldPath: string; oldValue: unknown; newValue: unknown; changeType: 'Added' | 'Modified' | 'Removed' }[] {
  const diff: { fieldPath: string; oldValue: unknown; newValue: unknown; changeType: 'Added' | 'Modified' | 'Removed' }[] = [];
  
  if (!before && !after) return diff;
  if (!before) {
    Object.entries(after || {}).forEach(([key, value]) => {
      diff.push({ fieldPath: key, oldValue: undefined, newValue: value, changeType: 'Added' });
    });
    return diff;
  }
  if (!after) {
    Object.entries(before).forEach(([key, value]) => {
      diff.push({ fieldPath: key, oldValue: value, newValue: undefined, changeType: 'Removed' });
    });
    return diff;
  }
  
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  allKeys.forEach(key => {
    const oldVal = before[key];
    const newVal = after[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      const changeType = oldVal === undefined ? 'Added' : newVal === undefined ? 'Removed' : 'Modified';
      diff.push({ fieldPath: key, oldValue: oldVal, newValue: newVal, changeType });
    }
  });
  
  return diff;
}

// ============================================================================
// Comments
// ============================================================================

export async function getComments(productId: string): Promise<ProductComment[]> {
  const q = query(
    collection(db, COMMENTS_COLLECTION),
    where('productId', '==', productId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductComment));
}

export async function addComment(
  productId: string,
  content: string,
  createdBy: string,
  entityId?: string,
  entityType?: string
): Promise<ProductComment> {
  const comment: Omit<ProductComment, 'id'> = {
    productId,
    content,
    isResolved: false,
    createdBy,
    createdAt: Timestamp.now(),
    entityId,
    entityType
  };
  
  const docRef = await addDoc(collection(db, COMMENTS_COLLECTION), comment);
  return { id: docRef.id, ...comment } as ProductComment;
}

