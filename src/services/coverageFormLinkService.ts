/**
 * Coverage Form Link Service
 * 
 * Manages form-to-coverage linkages with enhanced metadata.
 * Supports role classification, state scoping, and effective dates.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { CoverageFormLink, FormRole } from '../types/coverageConfig';

// ============================================================================
// Collection Path Helpers
// ============================================================================

const getFormLinksPath = (productId: string, coverageId: string) =>
  `products/${productId}/coverages/${coverageId}/formLinks`;

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Fetch all form links for a coverage
 */
export const fetchCoverageFormLinks = async (
  productId: string,
  coverageId: string
): Promise<CoverageFormLink[]> => {
  const path = getFormLinksPath(productId, coverageId);
  const q = query(collection(db, path), orderBy('displayOrder', 'asc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as CoverageFormLink[];
};

/**
 * Fetch form links by role
 */
export const fetchFormLinksByRole = async (
  productId: string,
  coverageId: string,
  role: FormRole
): Promise<CoverageFormLink[]> => {
  const path = getFormLinksPath(productId, coverageId);
  const q = query(
    collection(db, path),
    where('role', '==', role),
    orderBy('displayOrder', 'asc')
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as CoverageFormLink[];
};

/**
 * Create a new form link
 */
export const createFormLink = async (
  productId: string,
  coverageId: string,
  data: Omit<CoverageFormLink, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const path = getFormLinksPath(productId, coverageId);
  const docRef = await addDoc(collection(db, path), {
    ...data,
    productId,
    coverageId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return docRef.id;
};

/**
 * Update a form link
 */
export const updateFormLink = async (
  productId: string,
  coverageId: string,
  linkId: string,
  data: Partial<CoverageFormLink>
): Promise<void> => {
  const path = getFormLinksPath(productId, coverageId);
  const docRef = doc(db, path, linkId);
  
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete a form link
 */
export const deleteFormLink = async (
  productId: string,
  coverageId: string,
  linkId: string
): Promise<void> => {
  const path = getFormLinksPath(productId, coverageId);
  await deleteDoc(doc(db, path, linkId));
};

/**
 * Batch update form links (for reordering)
 */
export const batchUpdateFormLinks = async (
  productId: string,
  coverageId: string,
  updates: Array<{ id: string; data: Partial<CoverageFormLink> }>
): Promise<void> => {
  const batch = writeBatch(db);
  const path = getFormLinksPath(productId, coverageId);
  
  updates.forEach(({ id, data }) => {
    const docRef = doc(db, path, id);
    batch.update(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  });
  
  await batch.commit();
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get role display name
 */
export const getFormRoleDisplayName = (role: FormRole): string => {
  const names: Record<FormRole, string> = {
    base: 'Base Form',
    endorsement: 'Endorsement',
    exclusion: 'Exclusion',
    notice: 'Notice',
    schedule: 'Schedule',
    conditions: 'Conditions',
    declarations: 'Declarations',
    other: 'Other',
  };
  return names[role] || role;
};

/**
 * Get role color
 */
export const getFormRoleColor = (role: FormRole): string => {
  const roleColors: Record<FormRole, string> = {
    base: '#6366f1',
    endorsement: '#8b5cf6',
    exclusion: '#ef4444',
    notice: '#06b6d4',
    schedule: '#10b981',
    conditions: '#f59e0b',
    declarations: '#3b82f6',
    other: '#64748b',
  };
  return roleColors[role] || '#64748b';
};

