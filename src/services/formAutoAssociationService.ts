/**
 * Form Auto-Association Service
 * Automatically associates forms with products and coverages
 * 
 * This service implements the requirement:
 * "New product forms should be auto-added to product"
 */

import {
  collection,
  addDoc,
  writeBatch,
  serverTimestamp,
  query,
  where,
  getDocs,
  doc
} from 'firebase/firestore';
import { db } from '../firebase';
import { FormTemplate, FormCoverageMapping } from '../types';
import logger, { LOG_CATEGORIES } from '../utils/logger';

export interface FormAutoAssociationResult {
  success: boolean;
  formId: string;
  productId: string;
  mappingsCreated: number;
  errors?: string[];
}

/**
 * Auto-associate a form with a product and its coverages
 * 
 * This function:
 * 1. Creates form-coverage mappings for all coverages in the product
 * 2. Handles batch operations for efficiency
 * 3. Validates data integrity
 * 4. Logs all operations for audit trail
 * 
 * @param formId - The form ID to associate
 * @param productId - The product ID to associate with
 * @param coverageIds - Optional: specific coverage IDs to link. If not provided, links to all product coverages
 * @returns Result with success status and number of mappings created
 */
export async function autoAssociateFormWithProduct(
  formId: string,
  productId: string,
  coverageIds?: string[]
): Promise<FormAutoAssociationResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    logger.info(LOG_CATEGORIES.DATA, 'Starting form auto-association', {
      formId,
      productId,
      specificCoverageIds: coverageIds?.length || 'all'
    });

    // Determine which coverages to link
    let targetCoverageIds = coverageIds;
    if (!coverageIds || coverageIds.length === 0) {
      // Fetch all coverages for this product
      const coveragesSnap = await getDocs(
        collection(db, `products/${productId}/coverages`)
      );
      targetCoverageIds = coveragesSnap.docs.map(doc => doc.id);
    }

    if (targetCoverageIds.length === 0) {
      logger.warn(LOG_CATEGORIES.DATA, 'No coverages found for product', {
        productId
      });
      return {
        success: true,
        formId,
        productId,
        mappingsCreated: 0
      };
    }

    // Create form-coverage mappings in batch
    const batch = writeBatch(db);
    let mappingsCreated = 0;

    for (const coverageId of targetCoverageIds) {
      try {
        // Check if mapping already exists
        const existingSnap = await getDocs(
          query(
            collection(db, 'formCoverages'),
            where('formId', '==', formId),
            where('coverageId', '==', coverageId),
            where('productId', '==', productId)
          )
        );

        if (existingSnap.empty) {
          // Create new mapping
          const mappingRef = doc(collection(db, 'formCoverages'));
          batch.set(mappingRef, {
            formId,
            coverageId,
            productId,
            isPrimary: false,
            displayOrder: mappingsCreated,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          } as Partial<FormCoverageMapping>);
          mappingsCreated++;
        }
      } catch (error) {
        const errorMsg = `Failed to create mapping for coverage ${coverageId}: ${(error as Error).message}`;
        errors.push(errorMsg);
        logger.error(LOG_CATEGORIES.ERROR, errorMsg, { formId, coverageId, productId }, error as Error);
      }
    }

    // Commit batch
    if (mappingsCreated > 0) {
      await batch.commit();
      logger.info(LOG_CATEGORIES.DATA, 'Form auto-association completed', {
        formId,
        productId,
        mappingsCreated,
        duration: Date.now() - startTime
      });
    }

    return {
      success: errors.length === 0,
      formId,
      productId,
      mappingsCreated,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Error in form auto-association', {
      formId,
      productId
    }, error as Error);

    return {
      success: false,
      formId,
      productId,
      mappingsCreated: 0,
      errors: [
        `Form auto-association failed: ${(error as Error).message}`,
        ...errors
      ]
    };
  }
}

/**
 * Auto-associate multiple forms with a product
 * 
 * @param formIds - Array of form IDs to associate
 * @param productId - The product ID
 * @returns Array of results for each form
 */
export async function autoAssociateFormsWithProduct(
  formIds: string[],
  productId: string
): Promise<FormAutoAssociationResult[]> {
  logger.info(LOG_CATEGORIES.DATA, 'Starting batch form auto-association', {
    formCount: formIds.length,
    productId
  });

  const results = await Promise.all(
    formIds.map(formId => autoAssociateFormWithProduct(formId, productId))
  );

  const successCount = results.filter(r => r.success).length;
  const totalMappings = results.reduce((sum, r) => sum + r.mappingsCreated, 0);

  logger.info(LOG_CATEGORIES.DATA, 'Batch form auto-association completed', {
    formCount: formIds.length,
    successCount,
    totalMappings,
    productId
  });

  return results;
}

/**
 * Validate form-product association
 * 
 * @param formId - Form ID to validate
 * @param productId - Product ID to validate
 * @returns Validation result with any issues found
 */
export async function validateFormProductAssociation(
  formId: string,
  productId: string
): Promise<{
  isValid: boolean;
  issues: string[];
  mappingCount: number;
}> {
  const issues: string[] = [];

  try {
    // Check if form exists
    const formSnap = await getDocs(
      query(collection(db, 'forms'), where('__name__', '==', formId))
    );
    if (formSnap.empty) {
      issues.push(`Form ${formId} does not exist`);
    }

    // Check if product exists
    const productSnap = await getDocs(
      query(collection(db, 'products'), where('__name__', '==', productId))
    );
    if (productSnap.empty) {
      issues.push(`Product ${productId} does not exist`);
    }

    // Count existing mappings
    const mappingsSnap = await getDocs(
      query(
        collection(db, 'formCoverages'),
        where('formId', '==', formId),
        where('productId', '==', productId)
      )
    );

    return {
      isValid: issues.length === 0,
      issues,
      mappingCount: mappingsSnap.size
    };
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Error validating form-product association', {
      formId,
      productId
    }, error as Error);

    return {
      isValid: false,
      issues: [`Validation failed: ${(error as Error).message}`],
      mappingCount: 0
    };
  }
}

