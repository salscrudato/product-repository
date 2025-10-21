/**
 * Audit Trail Utility
 * Tracks all changes to entities for compliance and debugging
 */

import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

export interface AuditLogEntry {
  id?: string;
  entityType: 'product' | 'coverage' | 'form' | 'rule' | 'pricingRule' | 'stateApplicability';
  entityId: string;
  productId?: string;
  action: 'create' | 'update' | 'delete' | 'archive';
  userId: string;
  userName?: string;
  changeReason?: string;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedFields?: string[];
  timestamp?: Timestamp | Date;
  metadata?: Record<string, unknown>;
}

/**
 * Log a change to an entity
 */
export async function logAuditTrail(entry: AuditLogEntry): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'auditTrail'), {
      ...entry,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error logging audit trail:', error);
    throw error;
  }
}

/**
 * Get audit trail for an entity
 */
export async function getAuditTrail(
  entityType: string,
  entityId: string,
  limitCount: number = 50
): Promise<AuditLogEntry[]> {
  try {
    const q = query(
      collection(db, 'auditTrail'),
      where('entityType', '==', entityType),
      where('entityId', '==', entityId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AuditLogEntry));
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    return [];
  }
}

/**
 * Get audit trail for a product (all entities)
 */
export async function getProductAuditTrail(
  productId: string,
  limitCount: number = 100
): Promise<AuditLogEntry[]> {
  try {
    const q = query(
      collection(db, 'auditTrail'),
      where('productId', '==', productId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AuditLogEntry));
  } catch (error) {
    console.error('Error fetching product audit trail:', error);
    return [];
  }
}

/**
 * Get audit trail for a user
 */
export async function getUserAuditTrail(
  userId: string,
  limitCount: number = 100
): Promise<AuditLogEntry[]> {
  try {
    const q = query(
      collection(db, 'auditTrail'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AuditLogEntry));
  } catch (error) {
    console.error('Error fetching user audit trail:', error);
    return [];
  }
}

/**
 * Compare two objects and return changed fields
 */
export function getChangedFields(
  previousValues: Record<string, unknown>,
  newValues: Record<string, unknown>
): {
  changedFields: string[];
  changes: Record<string, { previous: unknown; new: unknown }>;
} {
  const changedFields: string[] = [];
  const changes: Record<string, { previous: unknown; new: unknown }> = {};

  // Check all keys in new values
  for (const key in newValues) {
    if (JSON.stringify(previousValues[key]) !== JSON.stringify(newValues[key])) {
      changedFields.push(key);
      changes[key] = {
        previous: previousValues[key],
        new: newValues[key]
      };
    }
  }

  // Check for deleted keys
  for (const key in previousValues) {
    if (!(key in newValues)) {
      changedFields.push(key);
      changes[key] = {
        previous: previousValues[key],
        new: undefined
      };
    }
  }

  return { changedFields, changes };
}

/**
 * Create an audit log entry for an update
 */
export async function logUpdate(
  entityType: string,
  entityId: string,
  productId: string | undefined,
  userId: string,
  previousValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
  changeReason?: string,
  userName?: string
): Promise<string> {
  const { changedFields, changes } = getChangedFields(previousValues, newValues);

  if (changedFields.length === 0) {
    console.log('No changes detected, skipping audit log');
    return '';
  }

  return logAuditTrail({
    entityType: entityType as any,
    entityId,
    productId,
    action: 'update',
    userId,
    userName,
    changeReason,
    previousValues,
    newValues,
    changedFields,
    metadata: { changes }
  });
}

/**
 * Create an audit log entry for a creation
 */
export async function logCreate(
  entityType: string,
  entityId: string,
  productId: string | undefined,
  userId: string,
  newValues: Record<string, unknown>,
  userName?: string
): Promise<string> {
  return logAuditTrail({
    entityType: entityType as any,
    entityId,
    productId,
    action: 'create',
    userId,
    userName,
    newValues
  });
}

/**
 * Create an audit log entry for a deletion
 */
export async function logDelete(
  entityType: string,
  entityId: string,
  productId: string | undefined,
  userId: string,
  previousValues: Record<string, unknown>,
  changeReason?: string,
  userName?: string
): Promise<string> {
  return logAuditTrail({
    entityType: entityType as any,
    entityId,
    productId,
    action: 'delete',
    userId,
    userName,
    changeReason,
    previousValues
  });
}

/**
 * Format audit log entry for display
 */
export function formatAuditLogEntry(entry: AuditLogEntry): string {
  const timestamp = entry.timestamp instanceof Timestamp
    ? entry.timestamp.toDate().toLocaleString()
    : new Date(entry.timestamp || '').toLocaleString();

  const action = entry.action.charAt(0).toUpperCase() + entry.action.slice(1);
  const user = entry.userName || entry.userId;

  let message = `${action} by ${user} on ${timestamp}`;

  if (entry.changeReason) {
    message += ` - ${entry.changeReason}`;
  }

  if (entry.changedFields && entry.changedFields.length > 0) {
    message += ` (${entry.changedFields.join(', ')})`;
  }

  return message;
}

