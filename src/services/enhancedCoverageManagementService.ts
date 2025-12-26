/**
 * Enhanced Coverage Management Service
 * Handles coverage creation, hierarchy management, and auto-population of related data
 *
 * Now delegates to unified entityManagementService for core CRUD operations
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Coverage, CoverageLimit, CoverageDeductible } from '../types';
import logger, { LOG_CATEGORIES } from '../utils/logger';
import {
  createEntity,
  updateEntity,
  deleteEntity,
  fetchEntity,
  batchCreateNestedEntities,
  fetchEntitiesByQuery
} from './entityManagementService';

export interface CoverageCreationOptions {
  productId: string;
  name: string;
  description?: string;
  coverageCode?: string;
  parentCoverageId?: string;
  isOptional?: boolean;
  states?: string[];
  limits?: Partial<CoverageLimit>[];
  deductibles?: Partial<CoverageDeductible>[];
}

export interface CoverageHierarchyData {
  coverage: Coverage;
  subCoverages: Coverage[];
  limits: CoverageLimit[];
  deductibles: CoverageDeductible[];
  linkedFormIds: string[];
}

class EnhancedCoverageManagementService {
  /**
   * Create a new coverage with optional sub-coverages, limits, and deductibles
   */
  async createCoverage(options: CoverageCreationOptions): Promise<Coverage> {
    try {
      logger.info(LOG_CATEGORIES.DATA, 'Creating new coverage', {
        productId: options.productId,
        name: options.name,
        isSubCoverage: !!options.parentCoverageId
      });

      const coverageData: Partial<Coverage> = {
        productId: options.productId,
        name: options.name,
        description: options.description,
        coverageCode: options.coverageCode,
        parentCoverageId: options.parentCoverageId,
        isOptional: options.isOptional || false,
        states: options.states
      };

      // Use unified service for coverage creation
      const coverage = await createEntity<Coverage>(
        `products/${options.productId}/coverages`,
        coverageData,
        'Coverage'
      );

      const coverageId = coverage.id;

      // Create limits if provided
      if (options.limits && options.limits.length > 0) {
        const limitsWithMetadata = options.limits.map(limit => ({
          ...limit,
          coverageId,
          productId: options.productId
        }));
        await batchCreateNestedEntities(
          `products/${options.productId}/coverages/${coverageId}`,
          'limits',
          limitsWithMetadata,
          'Coverage Limits'
        );
      }

      // Create deductibles if provided
      if (options.deductibles && options.deductibles.length > 0) {
        const deductiblesWithMetadata = options.deductibles.map(deductible => ({
          ...deductible,
          coverageId,
          productId: options.productId
        }));
        await batchCreateNestedEntities(
          `products/${options.productId}/coverages/${coverageId}`,
          'deductibles',
          deductiblesWithMetadata,
          'Coverage Deductibles'
        );
      }

      return coverage;
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Coverage creation failed',
        { productId: options.productId, name: options.name }, error as Error);
      throw error;
    }
  }

  /**
   * Get complete coverage hierarchy with all related data
   */
  async getCoverageHierarchy(
    productId: string,
    coverageId: string
  ): Promise<CoverageHierarchyData> {
    try {
      // Get main coverage
      const coverageDoc = await getDoc(
        doc(db, `products/${productId}/coverages/${coverageId}`)
      );

      if (!coverageDoc.exists()) {
        throw new Error(`Coverage ${coverageId} not found`);
      }

      const coverage = {
        id: coverageDoc.id,
        ...coverageDoc.data()
      } as Coverage;

      // Get sub-coverages
      const subCoveragesSnap = await getDocs(
        query(
          collection(db, `products/${productId}/coverages`),
          where('parentCoverageId', '==', coverageId)
        )
      );

      const subCoverages = subCoveragesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Coverage));

      // Get limits
      const limitsSnap = await getDocs(
        collection(db, `products/${productId}/coverages/${coverageId}/limits`)
      );

      const limits = limitsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CoverageLimit));

      // Get deductibles
      const deductiblesSnap = await getDocs(
        collection(db, `products/${productId}/coverages/${coverageId}/deductibles`)
      );

      const deductibles = deductiblesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CoverageDeductible));

      // Get linked forms
      const formsSnap = await getDocs(
        query(
          collection(db, 'formCoverages'),
          where('coverageId', '==', coverageId),
          where('productId', '==', productId)
        )
      );

      const linkedFormIds = formsSnap.docs.map(doc => doc.data().formId);

      logger.info(LOG_CATEGORIES.DATA, 'Coverage hierarchy retrieved', {
        productId,
        coverageId,
        subCoverageCount: subCoverages.length,
        limitCount: limits.length,
        deductibleCount: deductibles.length,
        linkedFormCount: linkedFormIds.length
      });

      return {
        coverage,
        subCoverages,
        limits,
        deductibles,
        linkedFormIds
      };
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to get coverage hierarchy', 
        { productId, coverageId }, error as Error);
      throw error;
    }
  }

  /**
   * Update coverage and optionally cascade updates to sub-coverages
   */
  async updateCoverage(
    productId: string,
    coverageId: string,
    updates: Partial<Coverage>,
    cascadeToSubCoverages: boolean = false
  ): Promise<void> {
    try {
      const coverageRef = doc(db, `products/${productId}/coverages/${coverageId}`);
      
      await updateDoc(coverageRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      if (cascadeToSubCoverages) {
        const subCoveragesSnap = await getDocs(
          query(
            collection(db, `products/${productId}/coverages`),
            where('parentCoverageId', '==', coverageId)
          )
        );

        const batch = writeBatch(db);
        for (const subCoverageDoc of subCoveragesSnap.docs) {
          batch.update(subCoverageDoc.ref, {
            updatedAt: serverTimestamp()
          });
        }
        await batch.commit();
      }

      logger.info(LOG_CATEGORIES.DATA, 'Coverage updated successfully', {
        productId,
        coverageId,
        cascaded: cascadeToSubCoverages
      });
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Coverage update failed', 
        { productId, coverageId }, error as Error);
      throw error;
    }
  }
}

export default new EnhancedCoverageManagementService();

