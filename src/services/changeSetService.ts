/**
 * ChangeSet Service
 * Client-side service for ChangeSet CRUD, item management, and approval workflow
 */

import { httpsCallable } from 'firebase/functions';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { functions, db, auth, isAuthReady, isFirestoreTerminated, safeOnSnapshot } from '../firebase';
import logger, { LOG_CATEGORIES, generateCorrelationId } from '../utils/logger';
import {
  ChangeSet,
  ChangeSetItem,
  ChangeSetApproval,
  ChangeSetStatus,
  ChangeSetItemAction,
  ApprovalRoleRequired,
  AuditLogEntry,
  CHANGESET_STATUS_TRANSITIONS,
  APPROVAL_RULES,
} from '../types/changeSet';
import { VersionedEntityType } from '../types/versioning';

// ============================================================================
// Collection Paths
// ============================================================================

const getChangeSetPath = (orgId: string) => `orgs/${orgId}/changeSets`;
const getChangeSetItemsPath = (orgId: string, changeSetId: string) =>
  `orgs/${orgId}/changeSets/${changeSetId}/items`;
const getChangeSetApprovalsPath = (orgId: string, changeSetId: string) =>
  `orgs/${orgId}/changeSets/${changeSetId}/approvals`;
const getAuditLogPath = (orgId: string) => `orgs/${orgId}/auditLog`;

// ============================================================================
// ChangeSet CRUD
// ============================================================================

/**
 * Create a new ChangeSet
 */
export const createChangeSet = async (
  orgId: string,
  data: Pick<ChangeSet, 'name' | 'description' | 'targetEffectiveStart' | 'targetEffectiveEnd'>
): Promise<ChangeSet> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const changeSetRef = doc(collection(db, getChangeSetPath(orgId)));
  const now = Timestamp.now();
  
  const changeSet: Omit<ChangeSet, 'id'> = {
    name: data.name,
    description: data.description,
    targetEffectiveStart: data.targetEffectiveStart || null,
    targetEffectiveEnd: data.targetEffectiveEnd || null,
    status: 'draft',
    ownerUserId: user.uid,
    createdAt: now,
    createdBy: user.uid,
    updatedAt: now,
    updatedBy: user.uid,
    itemCount: 0,
    pendingApprovalCount: 0,
  };

  await setDoc(changeSetRef, changeSet);
  
  logger.info(LOG_CATEGORIES.DATA, 'ChangeSet created', { changeSetId: changeSetRef.id, orgId });
  
  return { id: changeSetRef.id, ...changeSet };
};

/**
 * Get a ChangeSet by ID
 */
export const getChangeSet = async (orgId: string, changeSetId: string): Promise<ChangeSet | null> => {
  const docSnap = await getDoc(doc(db, getChangeSetPath(orgId), changeSetId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as ChangeSet;
};

/**
 * List ChangeSets with optional status filter
 */
export const listChangeSets = async (
  orgId: string,
  statusFilter?: ChangeSetStatus[]
): Promise<ChangeSet[]> => {
  let q = query(
    collection(db, getChangeSetPath(orgId)),
    orderBy('updatedAt', 'desc')
  );

  if (statusFilter && statusFilter.length > 0) {
    q = query(q, where('status', 'in', statusFilter));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChangeSet));
};

/**
 * Subscribe to ChangeSets (real-time updates)
 * Do not unsubscribe and re-subscribe on error; that can trigger Firestore SDK internal assertion.
 */
export const subscribeToChangeSets = (
  orgId: string,
  callback: (changeSets: ChangeSet[]) => void,
  statusFilter?: ChangeSetStatus[]
): (() => void) => {
  // Prevent subscription before auth is fully propagated to avoid Firestore SDK crash
  if (!isAuthReady()) {
    logger.warn(LOG_CATEGORIES.AUTH, 'ChangeSets subscription deferred (auth not ready)', { orgId });
    callback([]);
    return () => {};
  }

  let q = query(
    collection(db, getChangeSetPath(orgId)),
    orderBy('updatedAt', 'desc')
  );

  if (statusFilter && statusFilter.length > 0) {
    q = query(q, where('status', 'in', statusFilter));
  }

  return safeOnSnapshot(
    q,
    (snapshot) => {
      const changeSets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChangeSet));
      callback(changeSets);
    },
    (err) => {
      if (isFirestoreTerminated()) {
        callback([]);
        return;
      }
      const firebaseError = err as { code?: string };
      if (firebaseError.code === 'permission-denied') {
        logger.warn(LOG_CATEGORIES.AUTH, 'ChangeSets subscription auth race', { orgId });
        callback([]);
      } else {
        logger.error(LOG_CATEGORIES.DATA, 'ChangeSets subscription failed', { orgId }, err as Error);
      }
    }
  );
};

/**
 * Update ChangeSet metadata
 */
export const updateChangeSet = async (
  orgId: string,
  changeSetId: string,
  data: Partial<Pick<ChangeSet, 'name' | 'description' | 'targetEffectiveStart' | 'targetEffectiveEnd'>>
): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  await updateDoc(doc(db, getChangeSetPath(orgId), changeSetId), {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy: user.uid,
  });
  
  logger.info(LOG_CATEGORIES.DATA, 'ChangeSet updated', { changeSetId, orgId });
};

/**
 * Get the user's active (draft) ChangeSet, or create one if none exists
 */
export const getOrCreateActiveChangeSet = async (orgId: string): Promise<ChangeSet> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  // Look for existing draft changeset owned by this user
  const q = query(
    collection(db, getChangeSetPath(orgId)),
    where('ownerUserId', '==', user.uid),
    where('status', '==', 'draft'),
    orderBy('updatedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  if (snapshot.docs.length > 0) {
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ChangeSet;
  }

  // Create a new one
  return createChangeSet(orgId, {
    name: `Change Set - ${new Date().toLocaleDateString()}`,
    description: 'Auto-created change set',
    targetEffectiveStart: null,
    targetEffectiveEnd: null,
  });
};

// ============================================================================
// ChangeSet Items
// ============================================================================

/**
 * Add an item to a ChangeSet
 */
export const addItemToChangeSet = async (
  orgId: string,
  changeSetId: string,
  item: {
    artifactType: VersionedEntityType | 'stateProgram';
    artifactId: string;
    artifactName?: string;
    versionId: string;
    action: ChangeSetItemAction;
  }
): Promise<ChangeSetItem> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const itemRef = doc(collection(db, getChangeSetItemsPath(orgId, changeSetId)));
  const now = Timestamp.now();

  const changeSetItem: Omit<ChangeSetItem, 'id'> = {
    changeSetId,
    artifactType: item.artifactType,
    artifactId: item.artifactId,
    artifactName: item.artifactName,
    versionId: item.versionId,
    action: item.action,
    addedAt: now,
    addedBy: user.uid,
  };

  await setDoc(itemRef, changeSetItem);

  // Update item count on ChangeSet
  const changeSet = await getChangeSet(orgId, changeSetId);
  if (changeSet) {
    await updateDoc(doc(db, getChangeSetPath(orgId), changeSetId), {
      itemCount: (changeSet.itemCount || 0) + 1,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    });
  }

  logger.info(LOG_CATEGORIES.DATA, 'Item added to ChangeSet', {
    changeSetId, itemId: itemRef.id, artifactType: item.artifactType
  });

  return { id: itemRef.id, ...changeSetItem };
};

/**
 * Get all items in a ChangeSet
 */
export const getChangeSetItems = async (
  orgId: string,
  changeSetId: string
): Promise<ChangeSetItem[]> => {
  const snapshot = await getDocs(
    query(collection(db, getChangeSetItemsPath(orgId, changeSetId)), orderBy('addedAt', 'desc'))
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChangeSetItem));
};

/**
 * Remove an item from a ChangeSet
 */
export const removeItemFromChangeSet = async (
  orgId: string,
  changeSetId: string,
  itemId: string
): Promise<void> => {
  const callable = httpsCallable(functions, 'removeChangeSetItem');
  await callable({ orgId, changeSetId, itemId });
  logger.info(LOG_CATEGORIES.DATA, 'Item removed from ChangeSet', { changeSetId, itemId });
};

// ============================================================================
// Status Transitions
// ============================================================================

/**
 * Check if a status transition is valid
 */
export const canTransitionChangeSet = (
  currentStatus: ChangeSetStatus,
  targetStatus: ChangeSetStatus
): boolean => {
  return CHANGESET_STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) || false;
};

/**
 * Submit a ChangeSet for review
 */
export const submitForReview = async (orgId: string, changeSetId: string): Promise<void> => {
  const correlationId = generateCorrelationId();
  const scopedLog = logger.withCorrelation(correlationId);

  scopedLog.info(LOG_CATEGORIES.DATA, 'ChangeSet submit-for-review started', { changeSetId, orgId });

  const callable = httpsCallable(functions, 'submitChangeSetForReview');
  await callable({ orgId, changeSetId, correlationId });

  scopedLog.info(LOG_CATEGORIES.DATA, 'ChangeSet submitted for review', { changeSetId, orgId });
};

/**
 * Return a ChangeSet to draft status
 */
export const returnToDraft = async (
  orgId: string,
  changeSetId: string,
  reason?: string
): Promise<void> => {
  const callable = httpsCallable(functions, 'returnChangeSetToDraft');
  await callable({ orgId, changeSetId, reason });
  logger.info(LOG_CATEGORIES.DATA, 'ChangeSet returned to draft', { changeSetId, reason });
};

/**
 * Publish a ChangeSet (publishes all draft versions).
 *
 * A correlationId is generated at the start and threaded through the Cloud
 * Function call so client and server logs can be correlated.
 */
export const publishChangeSet = async (orgId: string, changeSetId: string): Promise<void> => {
  const correlationId = generateCorrelationId();
  const scopedLog = logger.withCorrelation(correlationId);

  scopedLog.info(LOG_CATEGORIES.DATA, 'ChangeSet publish started', { changeSetId, orgId });

  const callable = httpsCallable(functions, 'publishChangeSet');

  try {
    await callable({ orgId, changeSetId, correlationId });
    scopedLog.info(LOG_CATEGORIES.DATA, 'ChangeSet publish completed', { changeSetId, orgId });
  } catch (err) {
    scopedLog.error(LOG_CATEGORIES.DATA, 'ChangeSet publish failed', { changeSetId, orgId }, err instanceof Error ? err : null);
    throw err;
  }
};

// ============================================================================
// Approvals
// ============================================================================

/**
 * Get required approvals for a ChangeSet based on its items
 */
export const getRequiredApprovals = (items: ChangeSetItem[]): ApprovalRoleRequired[] => {
  const requiredRoles = new Set<ApprovalRoleRequired>();

  for (const item of items) {
    const rules = APPROVAL_RULES[item.artifactType];
    if (rules) {
      rules.forEach(role => requiredRoles.add(role));
    }
  }

  return Array.from(requiredRoles);
};

/**
 * Get all approvals for a ChangeSet
 */
export const getChangeSetApprovals = async (
  orgId: string,
  changeSetId: string
): Promise<ChangeSetApproval[]> => {
  const snapshot = await getDocs(
    query(collection(db, getChangeSetApprovalsPath(orgId, changeSetId)), orderBy('createdAt', 'desc'))
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChangeSetApproval));
};

/**
 * Approve a ChangeSet (as a specific role)
 */
export const approveChangeSet = async (
  orgId: string,
  changeSetId: string,
  role: ApprovalRoleRequired,
  notes?: string
): Promise<void> => {
  const correlationId = generateCorrelationId();
  const scopedLog = logger.withCorrelation(correlationId);

  scopedLog.info(LOG_CATEGORIES.DATA, 'ChangeSet approval started', { changeSetId, role, orgId });

  const callable = httpsCallable(functions, 'approveChangeSet');
  await callable({ orgId, changeSetId, role, notes, correlationId });

  scopedLog.info(LOG_CATEGORIES.DATA, 'ChangeSet approved', { changeSetId, role, orgId });
};

/**
 * Reject a ChangeSet
 */
export const rejectChangeSet = async (
  orgId: string,
  changeSetId: string,
  role: ApprovalRoleRequired,
  notes: string
): Promise<void> => {
  const correlationId = generateCorrelationId();
  const scopedLog = logger.withCorrelation(correlationId);

  scopedLog.info(LOG_CATEGORIES.DATA, 'ChangeSet rejection started', { changeSetId, role, orgId });

  const callable = httpsCallable(functions, 'rejectChangeSet');
  await callable({ orgId, changeSetId, role, notes, correlationId });

  scopedLog.info(LOG_CATEGORIES.DATA, 'ChangeSet rejected', { changeSetId, role, orgId });
};

/**
 * Check if all required approvals are satisfied
 */
export const areAllApprovalsComplete = (
  requiredRoles: ApprovalRoleRequired[],
  approvals: ChangeSetApproval[]
): boolean => {
  const approvedRoles = new Set(
    approvals
      .filter(a => a.status === 'approved')
      .map(a => a.roleRequired)
  );

  return requiredRoles.every(role => approvedRoles.has(role));
};

// ============================================================================
// Audit Log
// ============================================================================

/**
 * Get audit log entries for an entity
 */
export const getAuditLogForEntity = async (
  orgId: string,
  entityType: string,
  entityId: string,
  limit = 50
): Promise<AuditLogEntry[]> => {
  const q = query(
    collection(db, getAuditLogPath(orgId)),
    where('entityType', '==', entityType),
    where('entityId', '==', entityId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.slice(0, limit).map(doc => ({ id: doc.id, ...doc.data() } as AuditLogEntry));
};

/**
 * Get audit log entries for a ChangeSet
 */
export const getAuditLogForChangeSet = async (
  orgId: string,
  changeSetId: string
): Promise<AuditLogEntry[]> => {
  const q = query(
    collection(db, getAuditLogPath(orgId)),
    where('changeSetId', '==', changeSetId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLogEntry));
};

/**
 * Subscribe to audit log (real-time)
 */
export const subscribeToAuditLog = (
  orgId: string,
  callback: (entries: AuditLogEntry[]) => void,
  filters?: { entityType?: string; entityId?: string; changeSetId?: string }
): (() => void) => {
  let q = query(
    collection(db, getAuditLogPath(orgId)),
    orderBy('createdAt', 'desc')
  );

  if (filters?.entityType) {
    q = query(q, where('entityType', '==', filters.entityType));
  }
  if (filters?.entityId) {
    q = query(q, where('entityId', '==', filters.entityId));
  }
  if (filters?.changeSetId) {
    q = query(q, where('changeSetId', '==', filters.changeSetId));
  }

  return safeOnSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLogEntry));
    callback(entries);
  });
};

