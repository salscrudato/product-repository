/**
 * Data Integrity API
 * Cloud Functions for data integrity, referential integrity, and cascade operations
 */

const functions = require('firebase-functions');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { withErrorHandling } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const dataIntegrityService = require('../services/dataIntegrity');

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

module.exports = {
  validateCoverageIntegrity,
  cascadeDeleteCoverage,
  detectOrphanedRecords,
  validateProductConsistency,
  runComprehensiveCheck
};

