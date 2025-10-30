/**
 * Product Clone Utility
 * Transactional deep-clone with rollback support
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { Product, Coverage, CoverageLimit, CoverageDeductible } from '@types';
import logger, { LOG_CATEGORIES } from './logger';

interface CloneResult {
  success: boolean;
  newProductId?: string;
  error?: string;
  createdIds?: {
    product: string;
    coverages: string[];
    forms: string[];
  };
}

/**
 * Clone a product with all related data (coverages, limits, deductibles, forms, rules, pricing)
 * Includes rollback on failure
 */
export async function cloneProduct(sourceProductId: string): Promise<CloneResult> {
  const createdIds = {
    product: '',
    coverages: [] as string[],
    forms: [] as string[],
  };

  try {
    logger.info(LOG_CATEGORIES.DATA, 'Starting product clone', { sourceProductId });

    // 1. Fetch source product
    const srcProdSnap = await getDoc(doc(db, 'products', sourceProductId));
    if (!srcProdSnap.exists()) {
      throw new Error('Source product not found');
    }
    const srcData = srcProdSnap.data() as Product;

    // 2. Create new product
    const newProdRef = await addDoc(collection(db, 'products'), {
      ...srcData,
      name: `${srcData.name} – Copy`,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const newProductId = newProdRef.id;
    createdIds.product = newProductId;

    logger.info(LOG_CATEGORIES.DATA, 'Created new product', { newProductId });

    // 3. Clone coverages with ID mapping (batched)
    const coverageIdMap: Record<string, string> = {};
    const covSnap = await getDocs(collection(db, `products/${sourceProductId}/coverages`));

    if (covSnap.docs.length > 0) {
      const batch = writeBatch(db);
      covSnap.docs.forEach(covDoc => {
        const covData = covDoc.data() as Coverage;
        const newCovRef = doc(collection(db, `products/${newProductId}/coverages`));
        batch.set(newCovRef, {
          ...covData,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        coverageIdMap[covDoc.id] = newCovRef.id;
        createdIds.coverages.push(newCovRef.id);
      });
      await batch.commit();
    }

    logger.info(LOG_CATEGORIES.DATA, 'Cloned coverages', {
      count: Object.keys(coverageIdMap).length,
    });

    // 4. Clone limits and deductibles for each coverage (consolidated batching)
    let limitsDeductiblesBatch = writeBatch(db);
    let batchOperationCount = 0;
    const BATCH_SIZE = 450; // Leave room for other operations

    for (const [oldCovId, newCovId] of Object.entries(coverageIdMap)) {
      // Clone limits
      const limitsSnap = await getDocs(
        collection(db, `products/${sourceProductId}/coverages/${oldCovId}/limits`)
      );
      limitsSnap.docs.forEach(limitDoc => {
        if (batchOperationCount >= BATCH_SIZE) {
          // Commit current batch and start new one
          limitsDeductiblesBatch.commit();
          limitsDeductiblesBatch = writeBatch(db);
          batchOperationCount = 0;
        }
        const limitRef = doc(
          collection(db, `products/${newProductId}/coverages/${newCovId}/limits`)
        );
        limitsDeductiblesBatch.set(limitRef, {
          ...limitDoc.data(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        batchOperationCount++;
      });

      // Clone deductibles
      const deductiblesSnap = await getDocs(
        collection(db, `products/${sourceProductId}/coverages/${oldCovId}/deductibles`)
      );
      deductiblesSnap.docs.forEach(deductibleDoc => {
        if (batchOperationCount >= BATCH_SIZE) {
          // Commit current batch and start new one
          limitsDeductiblesBatch.commit();
          limitsDeductiblesBatch = writeBatch(db);
          batchOperationCount = 0;
        }
        const deductibleRef = doc(
          collection(db, `products/${newProductId}/coverages/${newCovId}/deductibles`)
        );
        limitsDeductiblesBatch.set(deductibleRef, {
          ...deductibleDoc.data(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        batchOperationCount++;
      });
    }

    // Commit final batch if there are pending operations
    if (batchOperationCount > 0) {
      await limitsDeductiblesBatch.commit();
    }

    logger.info(LOG_CATEGORIES.DATA, 'Cloned limits and deductibles');

    // 5. Clone forms and recreate junction table (batched)
    const formSnap = await getDocs(
      query(collection(db, 'forms'), where('productId', '==', sourceProductId))
    );

    let formsBatch = writeBatch(db);
    let formBatchCount = 0;
    const FORM_BATCH_SIZE = 450;

    for (const formDoc of formSnap.docs) {
      const formData = formDoc.data();
      const oldCoverageIds = formData.coverageIds || [];
      const newCoverageIds = oldCoverageIds
        .map((cid: string) => coverageIdMap[cid])
        .filter(Boolean);

      // Create new form
      const newFormRef = doc(collection(db, 'forms'));
      formsBatch.set(newFormRef, {
        ...formData,
        productId: newProductId,
        coverageIds: newCoverageIds,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      createdIds.forms.push(newFormRef.id);
      formBatchCount++;

      // Add junction table entries
      for (const newCovId of newCoverageIds) {
        if (formBatchCount >= FORM_BATCH_SIZE) {
          await formsBatch.commit();
          formsBatch = writeBatch(db);
          formBatchCount = 0;
        }
        const junctionRef = doc(collection(db, 'formCoverages'));
        formsBatch.set(junctionRef, {
          formId: newFormRef.id,
          coverageId: newCovId,
          productId: newProductId,
          createdAt: Timestamp.now(),
        });
        formBatchCount++;
      }
    }

    // Commit final batch if there are pending operations
    if (formBatchCount > 0) {
      await formsBatch.commit();
    }

    logger.info(LOG_CATEGORIES.DATA, 'Cloned forms and junction table', {
      formCount: createdIds.forms.length,
    });

    // 6. Clone pricing steps (batched)
    const pricingSnap = await getDocs(
      collection(db, `products/${sourceProductId}/steps`)
    );
    if (pricingSnap.docs.length > 0) {
      let pricingBatch = writeBatch(db);
      let pricingBatchCount = 0;
      const PRICING_BATCH_SIZE = 450;

      pricingSnap.docs.forEach(pricingDoc => {
        if (pricingBatchCount >= PRICING_BATCH_SIZE) {
          pricingBatch.commit();
          pricingBatch = writeBatch(db);
          pricingBatchCount = 0;
        }
        const pricingRef = doc(collection(db, `products/${newProductId}/steps`));
        pricingBatch.set(pricingRef, {
          ...pricingDoc.data(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        pricingBatchCount++;
      });

      if (pricingBatchCount > 0) {
        await pricingBatch.commit();
      }
    }

    logger.info(LOG_CATEGORIES.DATA, 'Product clone completed successfully', {
      newProductId,
      coverageCount: createdIds.coverages.length,
      formCount: createdIds.forms.length,
    });

    return {
      success: true,
      newProductId,
      createdIds,
    };
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Product clone failed, initiating rollback', {
      sourceProductId,
      createdIds,
    }, error as Error);

    // Rollback: Delete all created documents
    try {
      await rollbackClone(createdIds);
    } catch (rollbackError) {
      logger.error(LOG_CATEGORIES.ERROR, 'Rollback failed', {}, rollbackError as Error);
    }

    return {
      success: false,
      error: (error as Error).message || 'Unknown error during clone',
    };
  }
}

/**
 * Rollback a failed clone operation
 */
async function rollbackClone(createdIds: {
  product: string;
  coverages: string[];
  forms: string[];
}): Promise<void> {
  logger.info(LOG_CATEGORIES.DATA, 'Rolling back clone operation', { createdIds });

  // Delete forms first (they reference coverages)
  for (const formId of createdIds.forms) {
    try {
      await deleteDoc(doc(db, 'forms', formId));
    } catch (err) {
      logger.warn(LOG_CATEGORIES.ERROR, 'Failed to delete form during rollback', {
        formId,
      });
    }
  }

  // Delete coverages (they reference product)
  if (createdIds.product) {
    for (const covId of createdIds.coverages) {
      try {
        await deleteDoc(doc(db, `products/${createdIds.product}/coverages`, covId));
      } catch (err) {
        logger.warn(LOG_CATEGORIES.ERROR, 'Failed to delete coverage during rollback', {
          covId,
        });
      }
    }

    // Delete product
    try {
      await deleteDoc(doc(db, 'products', createdIds.product));
    } catch (err) {
      logger.warn(LOG_CATEGORIES.ERROR, 'Failed to delete product during rollback', {
        productId: createdIds.product,
      });
    }
  }

  logger.info(LOG_CATEGORIES.DATA, 'Rollback completed');
}

