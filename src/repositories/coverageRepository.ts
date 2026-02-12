/**
 * Coverage Repository
 * Typed repository for Coverage documents (subcollection of products)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { CoverageSchema, ValidatedCoverage } from '../schemas';
import { coveragesPath, coverageDocPath } from './paths';
import { createConverter } from './baseRepository';
import logger, { LOG_CATEGORIES } from '../utils/logger';

/**
 * Normalizer for legacy coverage fields
 */
function normalizeCoverage(data: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...data };
  
  // Normalize optional flag
  if (normalized.isOptional === undefined) {
    normalized.isOptional = false;
  }
  
  // Normalize allStates flag
  if (normalized.allStates === undefined) {
    normalized.allStates = true;
  }
  
  // Ensure states is an array
  if (!Array.isArray(normalized.states)) {
    normalized.states = [];
  }
  
  return normalized;
}

const converter = createConverter(CoverageSchema, normalizeCoverage);

class CoverageRepositoryClass {
  /**
   * Get all coverages for a product
   */
  async getByProductId(productId: string): Promise<ValidatedCoverage[]> {
    try {
      const colRef = collection(db, coveragesPath(productId)).withConverter(converter);
      const q = query(colRef, orderBy('displayOrder', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      logger.error(LOG_CATEGORIES.DATA, 'CoverageRepository getByProductId error', { productId }, error as Error);
      throw error;
    }
  }

  /**
   * Get a single coverage by ID
   */
  async getById(productId: string, coverageId: string): Promise<ValidatedCoverage | null> {
    try {
      const docRef = doc(db, coverageDocPath(productId, coverageId)).withConverter(converter);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      logger.error(LOG_CATEGORIES.DATA, 'CoverageRepository getById error', { productId, coverageId }, error as Error);
      throw error;
    }
  }

  /**
   * Get root coverages (no parent)
   */
  async getRootCoverages(productId: string): Promise<ValidatedCoverage[]> {
    try {
      const colRef = collection(db, coveragesPath(productId)).withConverter(converter);
      const q = query(
        colRef,
        where('parentCoverageId', '==', null),
        orderBy('displayOrder', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      logger.error(LOG_CATEGORIES.DATA, 'CoverageRepository getRootCoverages error', { productId }, error as Error);
      throw error;
    }
  }

  /**
   * Get child coverages
   */
  async getChildCoverages(productId: string, parentId: string): Promise<ValidatedCoverage[]> {
    try {
      const colRef = collection(db, coveragesPath(productId)).withConverter(converter);
      const q = query(
        colRef,
        where('parentCoverageId', '==', parentId),
        orderBy('displayOrder', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      logger.error(LOG_CATEGORIES.DATA, 'CoverageRepository getChildCoverages error', { productId, parentId }, error as Error);
      throw error;
    }
  }

  /**
   * Create a new coverage
   */
  async create(productId: string, data: Omit<ValidatedCoverage, 'id'>): Promise<ValidatedCoverage> {
    try {
      const colRef = collection(db, coveragesPath(productId));
      const docData = {
        ...data,
        productId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(colRef, docData);
      return { ...data, id: docRef.id, productId } as ValidatedCoverage;
    } catch (error) {
      logger.error(LOG_CATEGORIES.DATA, 'CoverageRepository create error', { productId }, error as Error);
      throw error;
    }
  }

  /**
   * Update a coverage
   */
  async update(productId: string, coverageId: string, data: Partial<ValidatedCoverage>): Promise<void> {
    try {
      const docRef = doc(db, coverageDocPath(productId, coverageId));
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(LOG_CATEGORIES.DATA, 'CoverageRepository update error', { productId, coverageId }, error as Error);
      throw error;
    }
  }

  /**
   * Delete a coverage
   */
  async delete(productId: string, coverageId: string): Promise<void> {
    try {
      const docRef = doc(db, coverageDocPath(productId, coverageId));
      await deleteDoc(docRef);
    } catch (error) {
      logger.error(LOG_CATEGORIES.DATA, 'CoverageRepository delete error', { productId, coverageId }, error as Error);
      throw error;
    }
  }
}

// Export singleton instance
export const CoverageRepository = new CoverageRepositoryClass();

