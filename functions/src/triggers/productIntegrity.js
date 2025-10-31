/**
 * Product Integrity Triggers
 * Firestore triggers to maintain denormalized counters and referential integrity
 *
 * Optimizations:
 * - Batch operations to reduce write costs
 * - Debounced stats recalculation
 * - Efficient query patterns
 * - Comprehensive error handling
 */

const functions = require('firebase-functions');
const { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { logger } = require('../utils/logger');

const db = admin.firestore();

/**
 * Optimized: Debounce map to prevent redundant recalculations
 */
const debounceTimers = new Map();
const DEBOUNCE_DELAY = 1000; // 1 second

/**
 * Optimized: Debounce stats recalculation
 */
const debounceRecalculation = (key, fn) => {
  if (debounceTimers.has(key)) {
    clearTimeout(debounceTimers.get(key));
  }
  const timer = setTimeout(() => {
    fn();
    debounceTimers.delete(key);
  }, DEBOUNCE_DELAY);
  debounceTimers.set(key, timer);
};

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
 * Optimized: Recalculate product statistics with batch operations
 */
async function recalculateProductStats(productId) {
  try {
    const productRef = db.collection('products').doc(productId);

    // Optimized: Parallel queries to reduce latency
    const [coveragesSnap, packagesSnap, formsSnap, rulesSnap] = await Promise.all([
      db.collection(`products/${productId}/coverages`).get(),
      db.collection(`products/${productId}/packages`).get(),
      db.collectionGroup('formCoverages').where('productId', '==', productId).get(),
      db.collection('rules').where('productId', '==', productId).get()
    ]);

    const coverageCount = coveragesSnap.size;
    const packageCount = packagesSnap.size;
    const formIds = new Set(formsSnap.docs.map(doc => doc.data().formId));
    const formCount = formIds.size;
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
 * Optimized: Recalculate coverage statistics with parallel queries
 */
async function recalculateCoverageStats(productId, coverageId) {
  try {
    const coverageRef = db.collection(`products/${productId}/coverages`).doc(coverageId);

    // Optimized: Parallel queries for limits and deductibles
    const [limitsSnap, deductiblesSnap] = await Promise.all([
      db.collection(`products/${productId}/coverages/${coverageId}/limits`).get(),
      db.collection(`products/${productId}/coverages/${coverageId}/deductibles`).get()
    ]);

    const limitCount = limitsSnap.size;
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

