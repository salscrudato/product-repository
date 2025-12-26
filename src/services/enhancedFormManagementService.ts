/**
 * Enhanced Form Management Service
 * Handles form creation, association, and lifecycle management with auto-population
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
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { FormTemplate, FormCoverageMapping } from '../types';
import logger, { LOG_CATEGORIES } from '../utils/logger';
import {
  createEntity,
  updateEntity,
  deleteEntity,
  fetchEntity,
  batchCreateNestedEntities,
  fetchEntitiesByQuery
} from './entityManagementService';

export interface FormCreationOptions {
  formNumber: string;
  formName: string;
  productId?: string;
  description?: string;
  category?: string;
  type?: string;
  downloadUrl?: string;
  filePath?: string;
  states?: string[];
  effectiveDate?: Date;
  expirationDate?: Date;
}

export interface FormAssociationResult {
  success: boolean;
  formId: string;
  mappingsCreated: number;
  errors?: string[];
}

class EnhancedFormManagementService {
  /**
   * Create a new form with optional auto-association to product
   */
  async createForm(options: FormCreationOptions): Promise<FormTemplate> {
    try {
      logger.info(LOG_CATEGORIES.DATA, 'Creating new form', {
        formNumber: options.formNumber,
        productId: options.productId
      });

      const formData: Partial<FormTemplate> = {
        formNumber: options.formNumber,
        formName: options.formName,
        description: options.description,
        category: options.category,
        type: options.type,
        downloadUrl: options.downloadUrl,
        filePath: options.filePath,
        states: options.states,
        effectiveDate: options.effectiveDate,
        expirationDate: options.expirationDate,
        productId: options.productId,
        isActive: true
      };

      // Use unified service for form creation
      const form = await createEntity<FormTemplate>(
        'forms',
        formData,
        'Form'
      );

      return form;
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Form creation failed',
        { formNumber: options.formNumber }, error as Error);
      throw error;
    }
  }

  /**
   * Auto-associate form with all coverages in a product
   */
  async autoAssociateFormWithProduct(
    formId: string,
    productId: string,
    coverageIds?: string[]
  ): Promise<FormAssociationResult> {
    try {
      logger.info(LOG_CATEGORIES.DATA, 'Auto-associating form with product', {
        formId,
        productId,
        specificCoverageIds: coverageIds?.length || 'all'
      });

      // Determine target coverages
      let targetCoverageIds = coverageIds;
      if (!coverageIds || coverageIds.length === 0) {
        const coveragesSnap = await getDocs(
          collection(db, `products/${productId}/coverages`)
        );
        targetCoverageIds = coveragesSnap.docs.map(doc => doc.id);
      }

      if (targetCoverageIds.length === 0) {
        logger.warn(LOG_CATEGORIES.DATA, 'No coverages found for product', { productId });
        return {
          success: true,
          formId,
          mappingsCreated: 0
        };
      }

      // Create form-coverage mappings in batch
      const batch = writeBatch(db);
      let mappingsCreated = 0;

      for (let i = 0; i < targetCoverageIds.length; i++) {
        const coverageId = targetCoverageIds[i];
        const mappingRef = doc(collection(db, 'formCoverages'));
        
        batch.set(mappingRef, {
          formId,
          coverageId,
          productId,
          isPrimary: i === 0,
          displayOrder: i,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        mappingsCreated++;
      }

      await batch.commit();

      logger.info(LOG_CATEGORIES.DATA, 'Form auto-associated successfully', {
        formId,
        productId,
        mappingsCreated
      });

      return {
        success: true,
        formId,
        mappingsCreated
      };
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Form auto-association failed', 
        { formId, productId }, error as Error);
      return {
        success: false,
        formId,
        mappingsCreated: 0,
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Get all forms for a product with their coverage associations
   */
  async getProductForms(productId: string): Promise<FormTemplate[]> {
    try {
      const mappingsSnap = await getDocs(
        query(collection(db, 'formCoverages'), where('productId', '==', productId))
      );

      const formIds = [...new Set(mappingsSnap.docs.map(doc => doc.data().formId))];
      const forms: FormTemplate[] = [];

      for (const formId of formIds) {
        const formDoc = await getDoc(doc(db, 'forms', formId));
        if (formDoc.exists()) {
          forms.push({
            id: formDoc.id,
            ...formDoc.data()
          } as FormTemplate);
        }
      }

      return forms;
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to get product forms', 
        { productId }, error as Error);
      throw error;
    }
  }

  /**
   * Get forms with PDFs only (for Claims Analysis)
   */
  async getFormsWithPDFs(): Promise<FormTemplate[]> {
    try {
      const formsSnap = await getDocs(collection(db, 'forms'));
      
      return formsSnap.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as FormTemplate))
        .filter(form => form.downloadUrl || form.filePath);
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to get forms with PDFs', {}, error as Error);
      throw error;
    }
  }

  /**
   * Update form and optionally update all associated mappings
   */
  async updateForm(
    formId: string,
    updates: Partial<FormTemplate>,
    updateMappings: boolean = false
  ): Promise<void> {
    try {
      const formRef = doc(db, 'forms', formId);
      
      await updateDoc(formRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      if (updateMappings) {
        const mappingsSnap = await getDocs(
          query(collection(db, 'formCoverages'), where('formId', '==', formId))
        );

        const batch = writeBatch(db);
        for (const mappingDoc of mappingsSnap.docs) {
          batch.update(mappingDoc.ref, {
            updatedAt: serverTimestamp()
          });
        }
        await batch.commit();
      }

      logger.info(LOG_CATEGORIES.DATA, 'Form updated successfully', { formId });
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Form update failed', { formId }, error as Error);
      throw error;
    }
  }

  /**
   * Delete form and all associated mappings
   */
  async deleteForm(formId: string): Promise<void> {
    try {
      const batch = writeBatch(db);

      // Delete all form-coverage mappings
      const mappingsSnap = await getDocs(
        query(collection(db, 'formCoverages'), where('formId', '==', formId))
      );

      for (const mappingDoc of mappingsSnap.docs) {
        batch.delete(mappingDoc.ref);
      }

      // Delete the form
      batch.delete(doc(db, 'forms', formId));
      await batch.commit();

      logger.info(LOG_CATEGORIES.DATA, 'Form deleted successfully', { formId });
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Form deletion failed', { formId }, error as Error);
      throw error;
    }
  }
}

export default new EnhancedFormManagementService();

