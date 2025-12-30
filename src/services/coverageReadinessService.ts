/**
 * Coverage Readiness Service
 * 
 * Calculates and manages coverage configuration completeness.
 * Provides real-time readiness indicators for each configuration area.
 */

import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  CoverageReadiness,
  ConfigAreaStatus,
  ReadinessStatus,
} from '../types/coverageConfig';

// ============================================================================
// Readiness Calculation
// ============================================================================

/**
 * Calculate readiness for a single coverage
 */
export const calculateCoverageReadiness = async (
  productId: string,
  coverageId: string
): Promise<CoverageReadiness> => {
  const areas: ConfigAreaStatus[] = [];
  const missingRequired: string[] = [];

  // Check Limits
  const limitsStatus = await checkLimitsReadiness(productId, coverageId);
  areas.push(limitsStatus);
  if (limitsStatus.status === 'incomplete' && limitsStatus.issues) {
    missingRequired.push(...limitsStatus.issues);
  }

  // Check Deductibles
  const deductiblesStatus = await checkDeductiblesReadiness(productId, coverageId);
  areas.push(deductiblesStatus);
  if (deductiblesStatus.status === 'incomplete' && deductiblesStatus.issues) {
    missingRequired.push(...deductiblesStatus.issues);
  }

  // Check States
  const statesStatus = await checkStatesReadiness(productId, coverageId);
  areas.push(statesStatus);

  // Check Forms
  const formsStatus = await checkFormsReadiness(productId, coverageId);
  areas.push(formsStatus);

  // Check Pricing
  const pricingStatus = await checkPricingReadiness(productId, coverageId);
  areas.push(pricingStatus);

  // Check Rules
  const rulesStatus = await checkRulesReadiness(productId, coverageId);
  areas.push(rulesStatus);

  // Calculate overall status and score
  const { overallStatus, completenessScore } = calculateOverallStatus(areas);

  return {
    coverageId,
    overallStatus,
    completenessScore,
    areas,
    missingRequired,
    lastCalculatedAt: new Date(),
  };
};

/**
 * Calculate overall status from area statuses
 */
const calculateOverallStatus = (
  areas: ConfigAreaStatus[]
): { overallStatus: ReadinessStatus; completenessScore: number } => {
  const weights: Record<string, number> = {
    limits: 25,
    deductibles: 20,
    states: 15,
    forms: 15,
    pricing: 15,
    rules: 10,
  };

  let totalWeight = 0;
  let earnedWeight = 0;
  let hasIncomplete = false;
  let hasPartial = false;

  areas.forEach(area => {
    const weight = weights[area.area] || 10;
    totalWeight += weight;

    if (area.status === 'complete') {
      earnedWeight += weight;
    } else if (area.status === 'partial') {
      earnedWeight += weight * 0.5;
      hasPartial = true;
    } else if (area.status === 'incomplete') {
      hasIncomplete = true;
    }
    // not_applicable doesn't affect score
  });

  const completenessScore = Math.round((earnedWeight / totalWeight) * 100);

  let overallStatus: ReadinessStatus;
  if (completenessScore === 100) {
    overallStatus = 'complete';
  } else if (hasIncomplete && completenessScore < 50) {
    overallStatus = 'incomplete';
  } else {
    overallStatus = 'partial';
  }

  return { overallStatus, completenessScore };
};

// ============================================================================
// Individual Area Checks
// ============================================================================

/**
 * Check limits configuration readiness
 */
const checkLimitsReadiness = async (
  productId: string,
  coverageId: string
): Promise<ConfigAreaStatus> => {
  try {
    const path = `products/${productId}/coverages/${coverageId}/limitOptionSets`;
    const snapshot = await getDocs(collection(db, path));
    
    if (snapshot.empty) {
      // Check for legacy limits
      const legacyPath = `products/${productId}/coverages/${coverageId}/limits`;
      const legacySnapshot = await getDocs(collection(db, legacyPath));
      
      if (!legacySnapshot.empty) {
        return {
          area: 'limits',
          status: 'partial',
          count: legacySnapshot.size,
          issues: ['Legacy limits need migration'],
          deepLink: `/products/${productId}/coverages/${coverageId}/limits`,
        };
      }
      
      return {
        area: 'limits',
        status: 'incomplete',
        count: 0,
        issues: ['No limit options configured'],
        deepLink: `/products/${productId}/coverages/${coverageId}/limits`,
      };
    }

    // Check if option sets have options
    let totalOptions = 0;
    for (const setDoc of snapshot.docs) {
      const optionsPath = `${path}/${setDoc.id}/options`;
      const optionsSnapshot = await getDocs(collection(db, optionsPath));
      totalOptions += optionsSnapshot.size;
    }

    return {
      area: 'limits',
      status: totalOptions > 0 ? 'complete' : 'partial',
      count: totalOptions,
      requiredCount: 1,
      deepLink: `/products/${productId}/coverages/${coverageId}/limits`,
    };
  } catch (error) {
    console.error('Error checking limits readiness:', error);
    return {
      area: 'limits',
      status: 'incomplete',
      count: 0,
      issues: ['Error checking limits'],
    };
  }
};

/**
 * Check deductibles configuration readiness
 */
const checkDeductiblesReadiness = async (
  productId: string,
  coverageId: string
): Promise<ConfigAreaStatus> => {
  try {
    const path = `products/${productId}/coverages/${coverageId}/deductibleOptionSets`;
    const snapshot = await getDocs(collection(db, path));

    if (snapshot.empty) {
      // Check for legacy deductibles
      const legacyPath = `products/${productId}/coverages/${coverageId}/deductibles`;
      const legacySnapshot = await getDocs(collection(db, legacyPath));

      if (!legacySnapshot.empty) {
        return {
          area: 'deductibles',
          status: 'partial',
          count: legacySnapshot.size,
          issues: ['Legacy deductibles need migration'],
          deepLink: `/products/${productId}/coverages/${coverageId}/deductibles`,
        };
      }

      return {
        area: 'deductibles',
        status: 'incomplete',
        count: 0,
        issues: ['No deductible options configured'],
        deepLink: `/products/${productId}/coverages/${coverageId}/deductibles`,
      };
    }

    let totalOptions = 0;
    for (const setDoc of snapshot.docs) {
      const optionsPath = `${path}/${setDoc.id}/options`;
      const optionsSnapshot = await getDocs(collection(db, optionsPath));
      totalOptions += optionsSnapshot.size;
    }

    return {
      area: 'deductibles',
      status: totalOptions > 0 ? 'complete' : 'partial',
      count: totalOptions,
      requiredCount: 1,
      deepLink: `/products/${productId}/coverages/${coverageId}/deductibles`,
    };
  } catch (error) {
    console.error('Error checking deductibles readiness:', error);
    return {
      area: 'deductibles',
      status: 'incomplete',
      count: 0,
      issues: ['Error checking deductibles'],
    };
  }
};

/**
 * Check states configuration readiness
 */
const checkStatesReadiness = async (
  productId: string,
  coverageId: string
): Promise<ConfigAreaStatus> => {
  try {
    // Check coverage document for states field
    const coveragePath = `products/${productId}/coverages/${coverageId}`;
    const coverageDoc = await getDocs(
      query(collection(db, `products/${productId}/coverages`), where('__name__', '==', coverageId))
    );

    // For now, return partial - states are typically inherited from product
    return {
      area: 'states',
      status: 'partial',
      count: 0,
      issues: ['State availability inherited from product'],
      deepLink: `/products/${productId}/coverages/${coverageId}/states`,
    };
  } catch (error) {
    console.error('Error checking states readiness:', error);
    return {
      area: 'states',
      status: 'incomplete',
      count: 0,
      issues: ['Error checking states'],
    };
  }
};

/**
 * Check forms configuration readiness
 */
const checkFormsReadiness = async (
  productId: string,
  coverageId: string
): Promise<ConfigAreaStatus> => {
  try {
    const path = `products/${productId}/coverages/${coverageId}/forms`;
    const snapshot = await getDocs(collection(db, path));

    if (snapshot.empty) {
      return {
        area: 'forms',
        status: 'incomplete',
        count: 0,
        issues: ['No forms linked to coverage'],
        deepLink: `/products/${productId}/coverages/${coverageId}/forms`,
      };
    }

    return {
      area: 'forms',
      status: 'complete',
      count: snapshot.size,
      deepLink: `/products/${productId}/coverages/${coverageId}/forms`,
    };
  } catch (error) {
    console.error('Error checking forms readiness:', error);
    return {
      area: 'forms',
      status: 'incomplete',
      count: 0,
      issues: ['Error checking forms'],
    };
  }
};

/**
 * Check pricing configuration readiness
 */
const checkPricingReadiness = async (
  productId: string,
  coverageId: string
): Promise<ConfigAreaStatus> => {
  try {
    const path = `products/${productId}/coverages/${coverageId}/pricing`;
    const snapshot = await getDocs(collection(db, path));

    if (snapshot.empty) {
      return {
        area: 'pricing',
        status: 'incomplete',
        count: 0,
        issues: ['No pricing configuration'],
        deepLink: `/products/${productId}/coverages/${coverageId}/pricing`,
      };
    }

    return {
      area: 'pricing',
      status: 'complete',
      count: snapshot.size,
      deepLink: `/products/${productId}/coverages/${coverageId}/pricing`,
    };
  } catch (error) {
    console.error('Error checking pricing readiness:', error);
    return {
      area: 'pricing',
      status: 'incomplete',
      count: 0,
      issues: ['Error checking pricing'],
    };
  }
};

/**
 * Check rules configuration readiness
 */
const checkRulesReadiness = async (
  productId: string,
  coverageId: string
): Promise<ConfigAreaStatus> => {
  try {
    const path = `products/${productId}/coverages/${coverageId}/rules`;
    const snapshot = await getDocs(collection(db, path));

    // Rules are optional, so empty is still valid
    return {
      area: 'rules',
      status: snapshot.empty ? 'not_applicable' : 'complete',
      count: snapshot.size,
      deepLink: `/products/${productId}/coverages/${coverageId}/rules`,
    };
  } catch (error) {
    console.error('Error checking rules readiness:', error);
    return {
      area: 'rules',
      status: 'not_applicable',
      count: 0,
    };
  }
};

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Calculate readiness for all coverages in a product
 */
export const calculateProductCoveragesReadiness = async (
  productId: string
): Promise<Map<string, CoverageReadiness>> => {
  const readinessMap = new Map<string, CoverageReadiness>();

  try {
    const coveragesPath = `products/${productId}/coverages`;
    const snapshot = await getDocs(collection(db, coveragesPath));

    for (const doc of snapshot.docs) {
      const readiness = await calculateCoverageReadiness(productId, doc.id);
      readinessMap.set(doc.id, readiness);
    }
  } catch (error) {
    console.error('Error calculating product coverages readiness:', error);
  }

  return readinessMap;
};

/**
 * Get readiness summary for a product
 */
export const getProductReadinessSummary = async (
  productId: string
): Promise<{
  totalCoverages: number;
  completeCoverages: number;
  partialCoverages: number;
  incompleteCoverages: number;
  averageScore: number;
}> => {
  const readinessMap = await calculateProductCoveragesReadiness(productId);

  let completeCoverages = 0;
  let partialCoverages = 0;
  let incompleteCoverages = 0;
  let totalScore = 0;

  readinessMap.forEach(readiness => {
    totalScore += readiness.completenessScore;
    switch (readiness.overallStatus) {
      case 'complete':
        completeCoverages++;
        break;
      case 'partial':
        partialCoverages++;
        break;
      case 'incomplete':
        incompleteCoverages++;
        break;
    }
  });

  return {
    totalCoverages: readinessMap.size,
    completeCoverages,
    partialCoverages,
    incompleteCoverages,
    averageScore: readinessMap.size > 0 ? Math.round(totalScore / readinessMap.size) : 0,
  };
};

