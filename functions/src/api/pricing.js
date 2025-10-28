/**
 * Pricing Engine API
 * Cloud Functions for deterministic, auditable pricing calculations
 */

const functions = require('firebase-functions');
const { onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { requireAuth } = require('../middleware/auth');
const { withErrorHandling } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const db = admin.firestore();

/**
 * Rate a coverage based on inputs and pricing steps
 * Returns premium breakdown by step
 */
const rateCoverage = onCall(
  withErrorHandling(async (request) => {
    const { productId, coverageId, inputs } = request.data;

    if (!productId || !coverageId || !inputs) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'productId, coverageId, and inputs are required'
      );
    }

    logger.info('Rating coverage', {
      userId: request.auth?.uid || 'anonymous',
      productId,
      coverageId
    });

    try {
      // Fetch pricing steps for this coverage
      const stepsSnap = await db
        .collection(`products/${productId}/pricingSteps`)
        .where('scope', 'in', ['product', 'coverage'])
        .where('isActive', '==', true)
        .orderBy('order', 'asc')
        .get();

      const steps = stepsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(step => step.scope === 'product' || step.targetId === coverageId);

      const stepBreakdown = {};
      let subtotal = 0;

      // Execute each step
      for (const step of steps) {
        let stepAmount = 0;

        // Execute rules in this step
        for (const ruleRef of step.rules || []) {
          const ruleDoc = await db.collection('rules').doc(ruleRef.ruleId).get();
          if (!ruleDoc.exists) continue;

          const rule = ruleDoc.data();
          if (!rule.isActive) continue;

          // Evaluate rule conditions
          if (evaluateConditions(rule.conditions || [], inputs)) {
            const ruleAmount = calculateRuleAmount(rule, inputs);
            stepAmount += ruleAmount;
          }
        }

        stepBreakdown[step.id] = stepAmount;
        subtotal += stepAmount;
      }

      return {
        stepBreakdown,
        subtotal,
        total: subtotal,
        metadata: {
          calculatedAt: new Date().toISOString(),
          productId,
          coverageId,
          stepsExecuted: steps.length
        }
      };
    } catch (error) {
      logger.error('Rating calculation failed', {
        productId,
        coverageId,
        error: error.message
      });
      throw error;
    }
  })
);

/**
 * Rate a package (bundle of coverages)
 */
const ratePackage = onCall(
  withErrorHandling(async (request) => {
    const { productId, packageId, inputs } = request.data;

    if (!productId || !packageId || !inputs) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'productId, packageId, and inputs are required'
      );
    }

    logger.info('Rating package', {
      userId: request.auth?.uid || 'anonymous',
      productId,
      packageId
    });

    try {
      // Fetch package
      const pkgDoc = await db
        .collection(`products/${productId}/packages`)
        .doc(packageId)
        .get();

      if (!pkgDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Package not found');
      }

      const pkg = pkgDoc.data();
      const coverageIds = pkg.coverageIds || [];

      // Rate each coverage
      const coveragePremiums = {};
      let total = 0;

      for (const covId of coverageIds) {
        // Call rateCoverage for each coverage
        const result = await rateCoverage({ data: { productId, coverageId: covId, inputs } });
        coveragePremiums[covId] = result.total;
        total += result.total;
      }

      // Apply package discount
      const discount = pkg.discountPercentage || 0;
      const discountAmount = total * (discount / 100);
      const finalTotal = total - discountAmount;

      return {
        coverages: coveragePremiums,
        subtotal: total,
        discount: discountAmount,
        discountPercentage: discount,
        total: finalTotal,
        metadata: {
          calculatedAt: new Date().toISOString(),
          productId,
          packageId,
          coverageCount: coverageIds.length
        }
      };
    } catch (error) {
      logger.error('Package rating failed', {
        productId,
        packageId,
        error: error.message
      });
      throw error;
    }
  })
);

/**
 * Evaluate pricing conditions against inputs
 */
function evaluateConditions(conditions, inputs) {
  if (!conditions || conditions.length === 0) return true;

  for (const condition of conditions) {
    if (!evaluateCondition(condition, inputs)) {
      return false;
    }
  }
  return true;
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(condition, inputs) {
  const value = inputs[condition.field];
  if (value === undefined) return false;

  switch (condition.operator) {
    case 'equals':
      return value === condition.value;
    case 'greaterThan':
      return value > condition.value;
    case 'lessThan':
      return value < condition.value;
    case 'contains':
      return String(value).includes(String(condition.value));
    case 'between':
      return value >= condition.value[0] && value <= condition.value[1];
    default:
      return false;
  }
}

/**
 * Calculate amount for a rule
 */
function calculateRuleAmount(rule, inputs) {
  let amount = rule.value || 0;

  if (rule.valueType === 'percentage') {
    // For percentage, we'd need base amount from inputs
    // This is simplified; real implementation would be more complex
    amount = amount / 100;
  }

  return amount;
}

module.exports = {
  rateCoverage,
  ratePackage
};

