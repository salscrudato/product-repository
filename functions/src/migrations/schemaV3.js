/**
 * Schema Migration V3
 * Normalizes coverage fields and backfills denormalized counters
 */

const admin = require('firebase-admin');
const { logger } = require('../utils/logger');

const db = admin.firestore();

/**
 * Migrate schema to V3
 * - Normalize coverage fields (coverageName → name)
 * - Ensure productId and timestamps on all coverages
 * - Backfill counters: limitCount, deductibleCount, subCoverageCount, formMappingCount
 */
async function migrateSchemaV3() {
  const results = {
    productsProcessed: 0,
    coveragesProcessed: 0,
    coveragesUpdated: 0,
    errors: []
  };

  try {
    // Get all products
    const productsSnap = await db.collection('products').get();

    for (const productDoc of productsSnap.docs) {
      const productId = productDoc.id;
      results.productsProcessed++;

      try {
        // Get all coverages for this product
        const coveragesSnap = await db
          .collection(`products/${productId}/coverages`)
          .get();

        for (const coverageDoc of coveragesSnap.docs) {
          const coverageId = coverageDoc.id;
          const coverageData = coverageDoc.data();
          const updates = {};
          let needsUpdate = false;

          // Normalize coverageName → name
          if (coverageData.coverageName && !coverageData.name) {
            updates.name = coverageData.coverageName;
            needsUpdate = true;
          }

          // Ensure productId
          if (!coverageData.productId) {
            updates.productId = productId;
            needsUpdate = true;
          }

          // Ensure timestamps
          if (!coverageData.createdAt) {
            updates.createdAt = admin.firestore.FieldValue.serverTimestamp();
            needsUpdate = true;
          }
          if (!coverageData.updatedAt) {
            updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
            needsUpdate = true;
          }

          // Backfill counters
          if (coverageData.limitCount === undefined) {
            const limitsSnap = await db
              .collection(`products/${productId}/coverages/${coverageId}/limits`)
              .get();
            updates.limitCount = limitsSnap.size;
            needsUpdate = true;
          }

          if (coverageData.deductibleCount === undefined) {
            const deductiblesSnap = await db
              .collection(`products/${productId}/coverages/${coverageId}/deductibles`)
              .get();
            updates.deductibleCount = deductiblesSnap.size;
            needsUpdate = true;
          }

          if (coverageData.subCoverageCount === undefined) {
            const subCoveragesSnap = await db
              .collection(`products/${productId}/coverages`)
              .where('parentCoverageId', '==', coverageId)
              .get();
            updates.subCoverageCount = subCoveragesSnap.size;
            needsUpdate = true;
          }

          if (coverageData.formMappingCount === undefined) {
            const formMappingsSnap = await db
              .collectionGroup('formCoverages')
              .where('productId', '==', productId)
              .where('coverageId', '==', coverageId)
              .get();
            updates.formMappingCount = formMappingsSnap.size;
            needsUpdate = true;
          }

          // Apply updates
          if (needsUpdate) {
            await db
              .collection(`products/${productId}/coverages`)
              .doc(coverageId)
              .update(updates);
            results.coveragesUpdated++;
          }

          results.coveragesProcessed++;
        }
      } catch (error) {
        results.errors.push({
          productId,
          error: error.message
        });
        logger.error('Migration error for product', { productId }, error);
      }
    }

    logger.info('Schema V3 migration completed', results);
    return results;
  } catch (error) {
    logger.error('Schema V3 migration failed', {}, error);
    throw error;
  }
}

module.exports = {
  migrateSchemaV3
};

