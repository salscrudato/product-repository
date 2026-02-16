/**
 * Audit Service
 * Tracks all changes to insurance products for regulatory compliance
 */

import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs, FieldValue } from 'firebase/firestore';
import { db, auth } from '../firebase';
import logger, { LOG_CATEGORIES } from '../utils/logger';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'PUBLISH'
  | 'ARCHIVE'
  | 'UNARCHIVE';

export type AuditEntity =
  | 'PRODUCT'
  | 'COVERAGE'
  | 'FORM'
  | 'PRICING_STEP'
  | 'RULE'
  | 'TASK';

export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface AuditLogEntry {
  id?: string;

  // Who
  userId: string;
  userEmail: string;
  userName?: string;

  // What
  action: AuditAction;
  entityType: AuditEntity;
  entityId: string;
  entityName?: string;

  // Details
  changes?: AuditChange[];

  // Context
  productId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;

  // When
  timestamp: FieldValue;

  // Compliance
  ipAddress?: string;
  userAgent?: string;
}

interface LogAuditEventOptions {
  entityName?: string;
  changes?: AuditChange[];
  productId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(
  action: AuditAction,
  entityType: AuditEntity,
  entityId: string,
  options: LogAuditEventOptions = {}
): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) {
      logger.warn(LOG_CATEGORIES.SECURITY, 'Audit log attempted without authenticated user');
      return;
    }

    const auditEntry: Omit<AuditLogEntry, 'timestamp'> & { timestamp: FieldValue } = {
      userId: user.uid,
      userEmail: user.email || 'unknown',
      userName: user.displayName || undefined,
      action,
      entityType,
      entityId,
      entityName: options.entityName,
      changes: options.changes,
      productId: options.productId,
      reason: options.reason,
      metadata: options.metadata,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
    };

    await addDoc(collection(db, 'auditLogs'), auditEntry);

    logger.info(LOG_CATEGORIES.SECURITY, `Audit logged: ${action} ${entityType}`, {
      entityId,
      userId: user.uid,
    });
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Failed to log audit event', { action, entityType, entityId }, error as Error);
  }
}

/**
 * Get audit history for an entity
 */
export async function getAuditHistory(
  entityType: AuditEntity,
  entityId: string,
  maxResults: number = 50
): Promise<AuditLogEntry[]> {
  try {
    const q = query(
      collection(db, 'auditLogs'),
      where('entityType', '==', entityType),
      where('entityId', '==', entityId),
      orderBy('timestamp', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    } as AuditLogEntry));
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Failed to fetch audit history', { entityType, entityId }, error as Error);
    return [];
  }
}

/**
 * Get recent audit activity for a product
 */
export async function getProductAuditActivity(
  productId: string,
  maxResults: number = 100
): Promise<AuditLogEntry[]> {
  try {
    const q = query(
      collection(db, 'auditLogs'),
      where('productId', '==', productId),
      orderBy('timestamp', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    } as AuditLogEntry));
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Failed to fetch product audit activity', { productId }, error as Error);
    return [];
  }
}

/**
 * Get user activity
 */
export async function getUserActivity(
  userId: string,
  maxResults: number = 100
): Promise<AuditLogEntry[]> {
  try {
    const q = query(
      collection(db, 'auditLogs'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    } as AuditLogEntry));
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Failed to fetch user activity', { userId }, error as Error);
    return [];
  }
}

/**
 * Helper to detect changes between old and new objects
 */
export function detectChanges(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
  fieldsToTrack?: string[]
): AuditChange[] {
  const changes: AuditChange[] = [];

  const fields = fieldsToTrack || Object.keys({ ...oldData, ...newData });

  for (const field of fields) {
    const oldValue = oldData[field];
    const newValue = newData[field];

    // Skip if values are the same
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
      continue;
    }

    // Skip internal fields
    if (field.startsWith('_') || field === 'updatedAt' || field === 'createdAt') {
      continue;
    }

    changes.push({
      field,
      oldValue,
      newValue
    });
  }

  return changes;
}

// Type for Firestore timestamp that may have toDate method
interface FirestoreTimestamp {
  toDate(): Date;
}

/**
 * Format audit entry for display
 */
export function formatAuditEntry(entry: AuditLogEntry): string {
  // Handle Firestore timestamp which may be a FieldValue or have toDate method
  let timestamp: Date;
  const ts = entry.timestamp as unknown;
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof (ts as FirestoreTimestamp).toDate === 'function') {
    timestamp = (ts as FirestoreTimestamp).toDate();
  } else {
    timestamp = new Date();
  }

  const date = timestamp.toLocaleDateString();
  const time = timestamp.toLocaleTimeString();

  let message = `${date} ${time} - ${entry.userName || entry.userEmail} ${entry.action.toLowerCase()}d ${entry.entityType.toLowerCase()}`;

  if (entry.entityName) {
    message += ` "${entry.entityName}"`;
  }

  if (entry.changes && entry.changes.length > 0) {
    message += ` (${entry.changes.length} field${entry.changes.length > 1 ? 's' : ''} changed)`;
  }

  if (entry.reason) {
    message += ` - Reason: ${entry.reason}`;
  }

  return message;
}

