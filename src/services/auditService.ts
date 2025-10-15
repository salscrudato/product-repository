/**
 * Audit Service
 * Tracks all changes to insurance products for regulatory compliance
 */

import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import logger, { LOG_CATEGORIES } from '../utils/logger';

export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'APPROVE' 
  | 'REJECT' 
  | 'PUBLISH' 
  | 'ARCHIVE';

export type AuditEntity = 
  | 'PRODUCT' 
  | 'COVERAGE' 
  | 'FORM' 
  | 'PRICING_STEP' 
  | 'RULE' 
  | 'TASK';

export interface AuditLogEntry {
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
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  
  // Context
  productId?: string;
  reason?: string;
  metadata?: Record<string, any>;
  
  // When
  timestamp: any; // Firestore serverTimestamp
  
  // Compliance
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(
  action: AuditAction,
  entityType: AuditEntity,
  entityId: string,
  options: {
    entityName?: string;
    changes?: { field: string; oldValue: any; newValue: any }[];
    productId?: string;
    reason?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) {
      logger.warn(LOG_CATEGORIES.SECURITY, 'Audit log attempted without authenticated user');
      return;
    }

    const auditEntry: Omit<AuditLogEntry, 'timestamp'> & { timestamp: any } = {
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
      id: doc.id,
      ...doc.data()
    })) as AuditLogEntry[];
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
      id: doc.id,
      ...doc.data()
    })) as AuditLogEntry[];
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
      id: doc.id,
      ...doc.data()
    })) as AuditLogEntry[];
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Failed to fetch user activity', { userId }, error as Error);
    return [];
  }
}

/**
 * Helper to detect changes between old and new objects
 */
export function detectChanges(
  oldData: Record<string, any>,
  newData: Record<string, any>,
  fieldsToTrack?: string[]
): { field: string; oldValue: any; newValue: any }[] {
  const changes: { field: string; oldValue: any; newValue: any }[] = [];
  
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

/**
 * Format audit entry for display
 */
export function formatAuditEntry(entry: AuditLogEntry): string {
  const timestamp = entry.timestamp?.toDate?.() || new Date();
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

