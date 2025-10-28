/**
 * Product Integrity Triggers
 * Firestore triggers to maintain denormalized counters and referential integrity
 */

const functions = require('firebase-functions');
const { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { logger } = require('../utils/logger');

const db = admin.firestore();

/**
 * Trigger: When a coverage is created/updated/deleted, update product stats
 */
const onCoverageChange = onDocumentCreated(
  'products/{productId}/coverages/{coverageId}',
  async (event) => {
    const { productId } = event.params;
    await recalculateProductStats(productId);
  }
);

const onCoverageDelete = onDocumentDeleted(
  'products/{productId}/coverages/{coverageId}',
  async (event) => {
    const { productId } = event.params;
    await recalculateProductStats(productId);
  }
);

/**
 * Trigger: When a limit is created/deleted, update coverage stats
 */
const onLimitChange = onDocumentCreated(
  'products/{productId}/coverages/{coverageId}/limits/{limitId}',
  async (event) => {
    const { productId, coverageId } = event.params;
    await recalculateCoverageStats(productId, coverageId);
  }
);

const onLimitDelete = onDocumentDeleted(
  'products/{productId}/coverages/{coverageId}/limits/{limitId}',
  async (event) => {
    const { productId, coverageId } = event.params;
    await recalculateCoverageStats(productId, coverageId);
  }
);

/**
 * Trigger: When a deductible is created/deleted, update coverage stats
 */
const onDeductibleChange = onDocumentCreated(
  'products/{productId}/coverages/{coverageId}/deductibles/{deductibleId}',
  async (event) => {
    const { productId, coverageId } = event.params;
    await recalculateCoverageStats(productId, coverageId);
  }
);

const onDeductibleDelete = onDocumentDeleted(
  'products/{productId}/coverages/{coverageId}/deductibles/{deductibleId}',
  async (event) => {
    const { productId, coverageId } = event.params;
    await recalculateCoverageStats(productId, coverageId);
  }
);

/**
 * Trigger: When a form-coverage mapping is created/deleted, update stats
 */
const onFormCoverageChange = onDocumentCreated(
  'formCoverages/{mappingId}',
  async (event) => {
    const mapping = event.data.data();
    if (mapping.productId && mapping.coverageId) {
      await recalculateCoverageStats(mapping.productId, mapping.coverageId);
      await recalculateProductStats(mapping.productId);
    }
  }
);

const onFormCoverageDelete = onDocumentDeleted(
  'formCoverages/{mappingId}',
  async (event) => {
    const mapping = event.data.data();
    if (mapping.productId && mapping.coverageId) {
      await recalculateCoverageStats(mapping.productId, mapping.coverageId);
      await recalculateProductStats(mapping.productId);
    }
  }
);

/**
 * Recalculate product statistics
 */
async function recalculateProductStats(productId) {
  try {
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

    // Update product
    await productRef.update({
      coverageCount,
      packageCount,
      formCount,
      ruleCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info('Product stats recalculated', {
      productId,
      coverageCount,
      packageCount,
      formCount,
      ruleCount
    });
  } catch (error) {
    logger.error('Failed to recalculate product stats', { productId }, error);
  }
}

/**
 * Recalculate coverage statistics
 */
async function recalculateCoverageStats(productId, coverageId) {
  try {
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

    // Update coverage
    await coverageRef.update({
      limitCount,
      deductibleCount,
      subCoverageCount,
      formMappingCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info('Coverage stats recalculated', {
      productId,
      coverageId,
      limitCount,
      deductibleCount,
      subCoverageCount,
      formMappingCount
    });
  } catch (error) {
    logger.error('Failed to recalculate coverage stats', { productId, coverageId }, error);
  }
}

module.exports = {
  onCoverageChange,
  onCoverageDelete,
  onLimitChange,
  onLimitDelete,
  onDeductibleChange,
  onDeductibleDelete,
  onFormCoverageChange,
  onFormCoverageDelete,
  recalculateProductStats,
  recalculateCoverageStats
};

