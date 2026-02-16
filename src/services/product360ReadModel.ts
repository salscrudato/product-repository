/**
 * Product360 Read Model
 * Optimized read model for Product360 overview page
 * Aggregates data from multiple sources for efficient rendering
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  collectionGroup
} from 'firebase/firestore';
import { db } from '@/firebase';
import { Product, Coverage, Form } from '../types';
import logger, { LOG_CATEGORIES } from '@utils/logger';
import { performanceMonitor } from '@utils/performanceMonitor';
import { cacheServices } from '@services/cacheService';

/**
 * Product360 summary data
 */
export interface Product360Summary {
  product: Product;
  stats: {
    totalCoverages: number;
    totalForms: number;
    totalLimits: number;
    totalDeductibles: number;
    totalRules: number;
    totalPricingRules: number;
    totalVersions: number;
    totalStates: number;
  };
  coverages: Coverage[];
  forms: Form[];
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: number;
  }>;
  migrationStatus: {
    total: number;
    migrated: number;
    percentage: number;
  };
}

/**
 * Get Product360 summary
 */
export async function getProduct360Summary(productId: string): Promise<Product360Summary | null> {
  const timerId = performanceMonitor.start('getProduct360Summary');

  try {
    // Check cache first
    const cached = cacheServices.products.get(`product360-${productId}`);
    if (cached) {
      logger.debug(LOG_CATEGORIES.CACHE, 'Product360 summary from cache', { productId });
      performanceMonitor.end(timerId, 'getProduct360Summary', 'CACHE');
      return cached as Product360Summary;
    }

    // Get product
    const productRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      logger.warn(LOG_CATEGORIES.DATA, 'Product not found', { productId });
      performanceMonitor.end(timerId, 'getProduct360Summary', 'DATA');
      return null;
    }

    const product = { id: productSnap.id, ...productSnap.data() } as Product;

    // Get coverages
    const coveragesRef = collection(db, `products/${productId}/coverages`);
    const coveragesSnap = await getDocs(coveragesRef);
    const coverages = coveragesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Coverage[];

    // Get forms
    const formsRef = collection(db, 'forms');
    const formsQuery = query(formsRef, where('productId', '==', productId));
    const formsSnap = await getDocs(formsQuery);
    const forms = formsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Form[];

    // Count limits and deductibles
    let totalLimits = 0;
    let totalDeductibles = 0;

    for (const coverage of coverages) {
      const limitsRef = collection(db, `products/${productId}/coverages/${coverage.id}/limits`);
      const deductiblesRef = collection(db, `products/${productId}/coverages/${coverage.id}/deductibles`);

      const [limitsSnap, deductiblesSnap] = await Promise.all([
        getDocs(limitsRef),
        getDocs(deductiblesRef)
      ]);

      totalLimits += limitsSnap.size;
      totalDeductibles += deductiblesSnap.size;
    }

    // Count rules
    const rulesRef = collection(db, `products/${productId}/rules`);
    const rulesSnap = await getDocs(rulesRef);
    const totalRules = rulesSnap.size;

    // Count pricing rules
    const pricingRulesRef = collection(db, `products/${productId}/pricingRules`);
    const pricingRulesSnap = await getDocs(pricingRulesRef);
    const totalPricingRules = pricingRulesSnap.size;

    // Count versions
    const versionsRef = collection(db, `products/${productId}/versions`);
    const versionsSnap = await getDocs(versionsRef);
    const totalVersions = versionsSnap.size;

    // Count states
    const statesRef = collection(db, `products/${productId}/states`);
    const statesSnap = await getDocs(statesRef);
    const totalStates = statesSnap.size;

    // Build summary
    const summary: Product360Summary = {
      product,
      stats: {
        totalCoverages: coverages.length,
        totalForms: forms.length,
        totalLimits,
        totalDeductibles,
        totalRules,
        totalPricingRules,
        totalVersions,
        totalStates
      },
      coverages,
      forms,
      recentActivity: [],
      migrationStatus: {
        total: coverages.length,
        migrated: coverages.filter(c => (c as any).migrated).length,
        percentage: coverages.length > 0
          ? Math.round((coverages.filter(c => (c as any).migrated).length / coverages.length) * 100)
          : 0
      }
    };

    // Cache result
    cacheServices.products.set(`product360-${productId}`, summary, 10 * 60 * 1000);

    performanceMonitor.end(timerId, 'getProduct360Summary', 'DATA');

    logger.info(LOG_CATEGORIES.DATA, 'Product360 summary loaded', {
      productId,
      stats: summary.stats
    });

    return summary;
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Failed to get Product360 summary', {}, error as Error);
    performanceMonitor.end(timerId, 'getProduct360Summary', 'ERROR');
    throw error;
  }
}

/**
 * Invalidate Product360 cache
 */
export function invalidateProduct360Cache(productId: string): void {
  cacheServices.products.delete(`product360-${productId}`);
  logger.debug(LOG_CATEGORIES.CACHE, 'Product360 cache invalidated', { productId });
}

/**
 * Get product statistics
 */
export async function getProductStats(productId: string): Promise<Record<string, number>> {
  const summary = await getProduct360Summary(productId);
  if (!summary) {
    return {};
  }

  return summary.stats;
}

/**
 * Get coverage summary for product
 */
export async function getCoverageSummary(
  productId: string
): Promise<Array<{ id: string; name: string; type: string; formCount: number }>> {
  try {
    const coveragesRef = collection(db, `products/${productId}/coverages`);
    const coveragesSnap = await getDocs(coveragesRef);

    const summaries = await Promise.all(
      coveragesSnap.docs.map(async (coverageDoc) => {
        const coverage = coverageDoc.data() as Coverage;

        // Count forms for this coverage
        const formCoveragesRef = collectionGroup(db, 'formCoverages');
        const formCoveragesQuery = query(
          formCoveragesRef,
          where('productId', '==', productId),
          where('coverageId', '==', coverageDoc.id)
        );
        const formCoveragesSnap = await getDocs(formCoveragesQuery);

        return {
          id: coverageDoc.id,
          name: coverage.name || 'Unnamed',
          type: coverage.type || 'Unknown',
          formCount: formCoveragesSnap.size
        };
      })
    );

    return summaries;
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Failed to get coverage summary', {}, error as Error);
    return [];
  }
}

/**
 * Get form summary for product
 */
export async function getFormSummary(
  productId: string
): Promise<Array<{ id: string; name: string; number: string; coverageCount: number }>> {
  try {
    const formsRef = collection(db, 'forms');
    const formsQuery = query(formsRef, where('productId', '==', productId));
    const formsSnap = await getDocs(formsQuery);

    const summaries = await Promise.all(
      formsSnap.docs.map(async (formDoc) => {
        const form = formDoc.data() as Form;

        // Count coverages for this form
        const formCoveragesRef = collectionGroup(db, 'formCoverages');
        const formCoveragesQuery = query(
          formCoveragesRef,
          where('productId', '==', productId),
          where('formId', '==', formDoc.id)
        );
        const formCoveragesSnap = await getDocs(formCoveragesQuery);

        return {
          id: formDoc.id,
          name: form.name || form.formName || 'Unnamed',
          number: form.formNumber || 'N/A',
          coverageCount: formCoveragesSnap.size
        };
      })
    );

    return summaries;
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Failed to get form summary', {}, error as Error);
    return [];
  }
}

