/**
 * Form Versioning Service
 * Manages form document versions with effective dates and diff tracking
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { z } from 'zod';
import logger, { LOG_CATEGORIES } from '../utils/logger';

// Schema for form version
export const FormVersionSchema = z.object({
  id: z.string(),
  formId: z.string(),
  version: z.number(),
  formNumber: z.string(),
  formName: z.string().optional(),
  editionDate: z.string(),
  effectiveDate: z.string(),
  expirationDate: z.string().optional(),
  pdfUrl: z.string().optional(),
  pdfStoragePath: z.string().optional(),
  extractedText: z.string().optional(),
  clauses: z.array(z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    type: z.enum(['coverage', 'exclusion', 'condition', 'definition', 'endorsement', 'other']),
    startPage: z.number().optional(),
    endPage: z.number().optional(),
  })).optional(),
  changesSummary: z.string().optional(),
  changedFields: z.array(z.string()).optional(),
  status: z.enum(['draft', 'active', 'superseded', 'archived']),
  createdAt: z.unknown(),
  createdBy: z.string().optional(),
});

export type FormVersion = z.infer<typeof FormVersionSchema>;

// Clause types for classification
export const CLAUSE_TYPES = [
  { value: 'coverage', label: 'Coverage', color: '#22c55e' },
  { value: 'exclusion', label: 'Exclusion', color: '#ef4444' },
  { value: 'condition', label: 'Condition', color: '#f59e0b' },
  { value: 'definition', label: 'Definition', color: '#3b82f6' },
  { value: 'endorsement', label: 'Endorsement', color: '#8b5cf6' },
  { value: 'other', label: 'Other', color: '#64748b' },
] as const;

/**
 * Get all versions of a form
 */
export async function getFormVersions(formId: string): Promise<FormVersion[]> {
  try {
    const versionsRef = collection(db, 'forms', formId, 'versions');
    const q = query(versionsRef, orderBy('version', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as FormVersion[];
  } catch (error) {
    logger.error(LOG_CATEGORIES.DATA, 'Failed to get form versions', { formId }, error as Error);
    throw error;
  }
}

/**
 * Get the current active version of a form
 */
export async function getCurrentFormVersion(formId: string): Promise<FormVersion | null> {
  try {
    const versionsRef = collection(db, 'forms', formId, 'versions');
    const q = query(
      versionsRef,
      where('status', '==', 'active'),
      orderBy('version', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as FormVersion;
  } catch (error) {
    logger.error(LOG_CATEGORIES.DATA, 'Failed to get current form version', { formId }, error as Error);
    throw error;
  }
}

/**
 * Create a new version of a form
 */
export async function createFormVersion(
  formId: string,
  data: Omit<FormVersion, 'id' | 'version' | 'createdAt'>
): Promise<FormVersion> {
  try {
    // Get the latest version number
    const versions = await getFormVersions(formId);
    const latestVersion = versions.length > 0 ? versions[0].version : 0;
    const newVersion = latestVersion + 1;
    
    // Mark previous active version as superseded
    for (const v of versions) {
      if (v.status === 'active') {
        await updateDoc(doc(db, 'forms', formId, 'versions', v.id), {
          status: 'superseded',
        });
      }
    }
    
    // Create new version
    const versionsRef = collection(db, 'forms', formId, 'versions');
    const versionData = {
      ...data,
      formId,
      version: newVersion,
      status: 'active',
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(versionsRef, versionData);
    
    logger.info(LOG_CATEGORIES.DATA, 'Created form version', {
      formId,
      version: newVersion,
    });
    
    return {
      id: docRef.id,
      ...versionData,
    } as FormVersion;
  } catch (error) {
    logger.error(LOG_CATEGORIES.DATA, 'Failed to create form version', { formId }, error as Error);
    throw error;
  }
}

/**
 * Compare two form versions and generate diff
 */
export function compareFormVersions(
  oldVersion: FormVersion,
  newVersion: FormVersion
): { field: string; oldValue: unknown; newValue: unknown }[] {
  const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
  const fieldsToCompare = ['formNumber', 'formName', 'editionDate', 'effectiveDate', 'expirationDate'];
  
  for (const field of fieldsToCompare) {
    const oldVal = oldVersion[field as keyof FormVersion];
    const newVal = newVersion[field as keyof FormVersion];
    
    if (oldVal !== newVal) {
      changes.push({ field, oldValue: oldVal, newValue: newVal });
    }
  }
  
  // Compare clauses
  const oldClauseCount = oldVersion.clauses?.length || 0;
  const newClauseCount = newVersion.clauses?.length || 0;
  
  if (oldClauseCount !== newClauseCount) {
    changes.push({
      field: 'clauses',
      oldValue: `${oldClauseCount} clauses`,
      newValue: `${newClauseCount} clauses`,
    });
  }
  
  return changes;
}

