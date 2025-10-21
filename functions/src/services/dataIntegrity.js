/**
 * Data Integrity Service
 * Handles referential integrity, cascade delete, orphan detection, and data validation
 */

const admin = require('firebase-admin');
const { logger } = require('../utils/logger');

const db = admin.firestore();

/**
 * Validate referential integrity for a coverage
 * Ensures all referenced entities exist
 */
async function validateCoverageIntegrity(productId, coverageId) {
  const errors = [];
  const warnings = [];

  try {
    const coverageRef = db.collection('products').doc(productId)
      .collection('coverages').doc(coverageId);
    const coverageSnap = await coverageRef.get();

    if (!coverageSnap.exists) {
      errors.push(`Coverage ${coverageId} does not exist`);
      return { isValid: false, errors, warnings };
    }

    const coverage = coverageSnap.data();

    // Check parent coverage exists (if sub-coverage)
    if (coverage.parentCoverageId) {
      const parentSnap = await db.collection('products').doc(productId)
        .collection('coverages').doc(coverage.parentCoverageId).get();
      if (!parentSnap.exists) {
        errors.push(`Parent coverage ${coverage.parentCoverageId} does not exist`);
      }
    }

    // Check all referenced forms exist
    if (coverage.formIds && Array.isArray(coverage.formIds)) {
      for (const formId of coverage.formIds) {
        const formSnap = await db.collection('forms').doc(formId).get();
        if (!formSnap.exists) {
          warnings.push(`Form ${formId} referenced but does not exist`);
        }
      }
    }

    // Check required coverages exist
    if (coverage.requiredCoverages && Array.isArray(coverage.requiredCoverages)) {
      for (const reqCoverageId of coverage.requiredCoverages) {
        const reqSnap = await db.collection('products').doc(productId)
          .collection('coverages').doc(reqCoverageId).get();
        if (!reqSnap.exists) {
          warnings.push(`Required coverage ${reqCoverageId} does not exist`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    logger.error('Error validating coverage integrity:', error);
    throw error;
  }
}

/**
 * Cascade delete coverage and all related entities
 */
async function cascadeDeleteCoverage(productId, coverageId) {
  const batch = db.batch();
  const deletedEntities = {
    coverage: 0,
    limits: 0,
    deductibles: 0,
    formMappings: 0,
    rules: 0,
    subCoverages: 0
  };

  try {
    // Delete coverage limits
    const limitsSnap = await db.collection('products').doc(productId)
      .collection('coverages').doc(coverageId)
      .collection('limits').get();
    limitsSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
      deletedEntities.limits++;
    });

    // Delete coverage deductibles
    const deductiblesSnap = await db.collection('products').doc(productId)
      .collection('coverages').doc(coverageId)
      .collection('deductibles').get();
    deductiblesSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
      deletedEntities.deductibles++;
    });

    // Delete form-coverage mappings
    const mappingsSnap = await db.collection('formCoverages')
      .where('coverageId', '==', coverageId)
      .where('productId', '==', productId).get();
    mappingsSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
      deletedEntities.formMappings++;
    });

    // Delete rules for this coverage
    const rulesSnap = await db.collection('rules')
      .where('productId', '==', productId)
      .where('targetId', '==', coverageId).get();
    rulesSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
      deletedEntities.rules++;
    });

    // Delete sub-coverages
    const subCoveragesSnap = await db.collection('products').doc(productId)
      .collection('coverages')
      .where('parentCoverageId', '==', coverageId).get();
    subCoveragesSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
      deletedEntities.subCoverages++;
    });

    // Delete the coverage itself
    batch.delete(db.collection('products').doc(productId)
      .collection('coverages').doc(coverageId));
    deletedEntities.coverage++;

    await batch.commit();

    logger.info('Cascade delete completed', {
      productId,
      coverageId,
      deletedEntities
    });

    return deletedEntities;
  } catch (error) {
    logger.error('Error in cascade delete:', error);
    throw error;
  }
}

/**
 * Detect orphaned records (entities with missing references)
 */
async function detectOrphanedRecords(productId) {
  const orphans = {
    formCoverages: [],
    rules: [],
    pricingRules: []
  };

  try {
    // Check form-coverage mappings
    const mappingsSnap = await db.collection('formCoverages')
      .where('productId', '==', productId).get();

    for (const doc of mappingsSnap.docs) {
      const mapping = doc.data();
      const coverageSnap = await db.collection('products').doc(productId)
        .collection('coverages').doc(mapping.coverageId).get();
      if (!coverageSnap.exists) {
        orphans.formCoverages.push({
          id: doc.id,
          coverageId: mapping.coverageId,
          formId: mapping.formId
        });
      }
    }

    // Check rules
    const rulesSnap = await db.collection('rules')
      .where('productId', '==', productId).get();

    for (const doc of rulesSnap.docs) {
      const rule = doc.data();
      if (rule.targetId) {
        const targetSnap = await db.collection('products').doc(productId)
          .collection('coverages').doc(rule.targetId).get();
        if (!targetSnap.exists) {
          orphans.rules.push({
            id: doc.id,
            targetId: rule.targetId,
            ruleType: rule.ruleType
          });
        }
      }
    }

    logger.info('Orphan detection completed', {
      productId,
      orphanCounts: {
        formCoverages: orphans.formCoverages.length,
        rules: orphans.rules.length
      }
    });

    return orphans;
  } catch (error) {
    logger.error('Error detecting orphans:', error);
    throw error;
  }
}

/**
 * Validate product data consistency
 */
async function validateProductConsistency(productId) {
  const issues = [];

  try {
    const productSnap = await db.collection('products').doc(productId).get();
    if (!productSnap.exists) {
      return { isConsistent: false, issues: ['Product does not exist'] };
    }

    // Check all coverages have valid product reference
    const coveragesSnap = await db.collection('products').doc(productId)
      .collection('coverages').get();

    for (const doc of coveragesSnap.docs) {
      const coverage = doc.data();
      if (coverage.productId !== productId) {
        issues.push(`Coverage ${doc.id} has mismatched productId`);
      }
    }

    // Check all rules reference valid product
    const rulesSnap = await db.collection('rules')
      .where('productId', '==', productId).get();

    for (const doc of rulesSnap.docs) {
      const rule = doc.data();
      if (!rule.productId) {
        issues.push(`Rule ${doc.id} missing productId`);
      }
    }

    return {
      isConsistent: issues.length === 0,
      issues
    };
  } catch (error) {
    logger.error('Error validating product consistency:', error);
    throw error;
  }
}

module.exports = {
  validateCoverageIntegrity,
  cascadeDeleteCoverage,
  detectOrphanedRecords,
  validateProductConsistency
};

