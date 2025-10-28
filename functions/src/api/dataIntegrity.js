/**
 * Data Integrity API
 * Cloud Functions for data integrity, referential integrity, and cascade operations
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { withErrorHandling } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const dataIntegrityService = require('../services/dataIntegrity');
const { migrateSchemaV3 } = require('../migrations/schemaV3');

const db = admin.firestore();

/**
 * Validate coverage referential integrity
 * Checks if all referenced entities exist
 */
const validateCoverageIntegrity = functions.https.onCall(
  withErrorHandling(async (data, context) => {
    requireAdmin(context);

    const { productId, coverageId } = data;

    if (!productId || !coverageId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'productId and coverageId are required'
      );
    }

    logger.info('Validating coverage integrity', {
      userId: context.auth.uid,
      productId,
      coverageId
    });

    const result = await dataIntegrityService.validateCoverageIntegrity(
      productId,
      coverageId
    );

    return result;
  })
);

/**
 * Cascade delete coverage and all related entities
 * WARNING: This is a destructive operation
 */
const cascadeDeleteCoverage = functions.https.onCall(
  withErrorHandling(async (data, context) => {
    requireAdmin(context);

    const { productId, coverageId } = data;

    if (!productId || !coverageId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'productId and coverageId are required'
      );
    }

    logger.warn('Cascade delete initiated', {
      userId: context.auth.uid,
      productId,
      coverageId
    });

    const result = await dataIntegrityService.cascadeDeleteCoverage(
      productId,
      coverageId
    );

    logger.info('Cascade delete completed', {
      userId: context.auth.uid,
      productId,
      coverageId,
      result
    });

    return result;
  })
);

/**
 * Detect orphaned records in a product
 * Finds entities with missing references
 */
const detectOrphanedRecords = functions.https.onCall(
  withErrorHandling(async (data, context) => {
    requireAdmin(context);

    const { productId } = data;

    if (!productId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'productId is required'
      );
    }

    logger.info('Detecting orphaned records', {
      userId: context.auth.uid,
      productId
    });

    const orphans = await dataIntegrityService.detectOrphanedRecords(productId);

    return orphans;
  })
);

/**
 * Validate product data consistency
 * Checks for data inconsistencies and mismatches
 */
const validateProductConsistency = functions.https.onCall(
  withErrorHandling(async (data, context) => {
    requireAdmin(context);

    const { productId } = data;

    if (!productId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'productId is required'
      );
    }

    logger.info('Validating product consistency', {
      userId: context.auth.uid,
      productId
    });

    const result = await dataIntegrityService.validateProductConsistency(productId);

    return result;
  })
);

/**
 * Run comprehensive data integrity check
 * Performs all validation and detection operations
 */
const runComprehensiveCheck = functions.https.onCall(
  withErrorHandling(async (data, context) => {
    requireAdmin(context);

    const { productId } = data;

    if (!productId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'productId is required'
      );
    }

    logger.info('Running comprehensive data integrity check', {
      userId: context.auth.uid,
      productId
    });

    const results = {
      consistency: await dataIntegrityService.validateProductConsistency(productId),
      orphans: await dataIntegrityService.detectOrphanedRecords(productId),
      timestamp: new Date().toISOString()
    };

    return results;
  })
);

/**
 * Migrate schema to V3
 * Normalizes coverage fields and backfills denormalized counters
 */
const migrateToSchemaV3 = functions.https.onCall(
  withErrorHandling(async (data, context) => {
    requireAdmin(context);

    logger.info('Starting schema V3 migration', {
      userId: context.auth.uid
    });

    const results = await migrateSchemaV3();
    return results;
  })
);

/**
 * Recalculate product statistics
 * Recomputes coverageCount, packageCount, formCount, ruleCount
 */
const recalculateProductStats = functions.https.onCall(
  withErrorHandling(async (data, context) => {
    requireAdmin(context);

    const { productId } = data;
    if (!productId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'productId is required'
      );
    }

    logger.info('Recalculating product stats', {
      userId: context.auth.uid,
      productId
    });

    const productRef = db.collection('products').doc(productId);

    // Count coverages
    const coveragesSnap = await db.collection(`products/${productId}/coverages`).get();
    const coverageCount = coveragesSnap.size;

    // Count packages
    const packagesSnap = await db.collection(`products/${productId}/packages`).get();
    const packageCount = packagesSnap.size;

    // Count forms via formCoverages
    const formsSnap = await db
      .collectionGroup('formCoverages')
      .where('productId', '==', productId)
      .get();
    const formIds = new Set(formsSnap.docs.map(doc => doc.data().formId));
    const formCount = formIds.size;

    // Count rules
    const rulesSnap = await db
      .collection('rules')
      .where('productId', '==', productId)
      .get();
    const ruleCount = rulesSnap.size;

    await productRef.update({
      coverageCount,
      packageCount,
      formCount,
      ruleCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { coverageCount, packageCount, formCount, ruleCount };
  })
);

/**
 * Recalculate coverage statistics
 * Recomputes limitCount, deductibleCount, subCoverageCount, formMappingCount
 */
const recalculateCoverageStats = functions.https.onCall(
  withErrorHandling(async (data, context) => {
    requireAdmin(context);

    const { productId, coverageId } = data;
    if (!productId || !coverageId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'productId and coverageId are required'
      );
    }

    logger.info('Recalculating coverage stats', {
      userId: context.auth.uid,
      productId,
      coverageId
    });

    const coverageRef = db.collection(`products/${productId}/coverages`).doc(coverageId);

    // Count limits
    const limitsSnap = await db
      .collection(`products/${productId}/coverages/${coverageId}/limits`)
      .get();
    const limitCount = limitsSnap.size;

    // Count deductibles
    const deductiblesSnap = await db
      .collection(`products/${productId}/coverages/${coverageId}/deductibles`)
      .get();
    const deductibleCount = deductiblesSnap.size;

    // Count sub-coverages
    const subCoveragesSnap = await db
      .collection(`products/${productId}/coverages`)
      .where('parentCoverageId', '==', coverageId)
      .get();
    const subCoverageCount = subCoveragesSnap.size;

    // Count form mappings
    const formMappingsSnap = await db
      .collectionGroup('formCoverages')
      .where('productId', '==', productId)
      .where('coverageId', '==', coverageId)
      .get();
    const formMappingCount = formMappingsSnap.size;

    await coverageRef.update({
      limitCount,
      deductibleCount,
      subCoverageCount,
      formMappingCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { limitCount, deductibleCount, subCoverageCount, formMappingCount };
  })
);

module.exports = {
  validateCoverageIntegrity,
  cascadeDeleteCoverage,
  detectOrphanedRecords,
  validateProductConsistency,
  runComprehensiveCheck,
  migrateToSchemaV3,
  recalculateProductStats,
  recalculateCoverageStats
};

