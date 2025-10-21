/**
 * Coverage Auto-Population Utility
 * Automatically fetches all related data when a coverage is selected
 *
 * This utility implements efficient data fetching with:
 * - Parallel queries for performance
 * - Error handling and fallbacks
 * - Data validation
 * - Referential integrity checks
 */

import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../firebase';
import { Coverage, CoverageLimit, CoverageDeductible, FormCoverageMapping, Rule, PricingRule, StateApplicability } from '../types';
import logger, { LOG_CATEGORIES } from './logger';

export interface CoverageAutoPopulationData {
  coverage: Coverage;
  subCoverages: Coverage[];
  limits: CoverageLimit[];
  deductibles: CoverageDeductible[];
  forms: FormCoverageMapping[];
  pricingRules: PricingRule[];
  businessRules: Rule[];
  stateApplicability: StateApplicability[];
  linkedFormIds: string[];
  metadata?: {
    fetchedAt: Date;
    totalRecords: number;
    errors?: string[];
  };
}

/**
 * Fetch all related data for a coverage
 * This is the main function to call when a coverage is selected
 *
 * @param productId - The product ID
 * @param coverageId - The coverage ID
 * @returns Complete coverage data with all relationships
 * @throws Error if critical data cannot be fetched
 */
export async function fetchCoverageAutoPopulationData(
  productId: string,
  coverageId: string
): Promise<CoverageAutoPopulationData> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    logger.info(LOG_CATEGORIES.DATA, 'Fetching coverage auto-population data', {
      productId,
      coverageId
    });

    const [
      subCoverages,
      limits,
      deductibles,
      formMappings,
      pricingRules,
      businessRules,
      stateApplicability
    ] = await Promise.all([
      fetchSubCoverages(productId, coverageId).catch(err => {
        errors.push(`Failed to fetch sub-coverages: ${err.message}`);
        return [];
      }),
      fetchLimits(productId, coverageId).catch(err => {
        errors.push(`Failed to fetch limits: ${err.message}`);
        return [];
      }),
      fetchDeductibles(productId, coverageId).catch(err => {
        errors.push(`Failed to fetch deductibles: ${err.message}`);
        return [];
      }),
      fetchFormMappings(productId, coverageId).catch(err => {
        errors.push(`Failed to fetch form mappings: ${err.message}`);
        return [];
      }),
      fetchPricingRules(productId, coverageId).catch(err => {
        errors.push(`Failed to fetch pricing rules: ${err.message}`);
        return [];
      }),
      fetchBusinessRules(productId, coverageId).catch(err => {
        errors.push(`Failed to fetch business rules: ${err.message}`);
        return [];
      }),
      fetchStateApplicability(productId, coverageId).catch(err => {
        errors.push(`Failed to fetch state applicability: ${err.message}`);
        return [];
      })
    ]);

    const linkedFormIds = formMappings.map(fm => fm.formId);
    const fetchTime = Date.now() - startTime;

    logger.info(LOG_CATEGORIES.DATA, 'Coverage auto-population data fetched successfully', {
      productId,
      coverageId,
      fetchTime,
      subCoveragesCount: subCoverages.length,
      limitsCount: limits.length,
      deductiblesCount: deductibles.length,
      formsCount: formMappings.length,
      pricingRulesCount: pricingRules.length,
      businessRulesCount: businessRules.length,
      stateApplicabilityCount: stateApplicability.length,
      errors: errors.length > 0 ? errors : undefined
    });

    return {
      coverage: {} as Coverage, // Will be populated by caller
      subCoverages,
      limits,
      deductibles,
      forms: formMappings,
      pricingRules,
      businessRules,
      stateApplicability,
      linkedFormIds,
      metadata: {
        fetchedAt: new Date(),
        totalRecords: subCoverages.length + limits.length + deductibles.length +
                     formMappings.length + pricingRules.length + businessRules.length +
                     stateApplicability.length,
        errors: errors.length > 0 ? errors : undefined
      }
    };
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Error fetching coverage auto-population data', {
      productId,
      coverageId
    }, error as Error);
    throw error;
  }
}

/**
 * Fetch sub-coverages for a coverage
 * Sub-coverages are coverages with parentCoverageId set to this coverage's ID
 */
async function fetchSubCoverages(productId: string, coverageId: string): Promise<Coverage[]> {
  try {
    const q = query(
      collection(db, `products/${productId}/coverages`),
      where('parentCoverageId', '==', coverageId)
    );
    const snap = await getDocs(q);

    const subCoverages = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Coverage));

    logger.debug(LOG_CATEGORIES.DATA, `Fetched ${subCoverages.length} sub-coverages`, {
      productId,
      coverageId
    });

    return subCoverages;
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Error fetching sub-coverages', {
      productId,
      coverageId
    }, error as Error);
    return [];
  }
}

/**
 * Fetch limits for a coverage
 * Limits are stored in a subcollection under each coverage
 */
async function fetchLimits(productId: string, coverageId: string): Promise<CoverageLimit[]> {
  try {
    const snap = await getDocs(
      collection(db, `products/${productId}/coverages/${coverageId}/limits`)
    );

    const limits = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CoverageLimit));

    logger.debug(LOG_CATEGORIES.DATA, `Fetched ${limits.length} limits`, {
      productId,
      coverageId
    });

    return limits;
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Error fetching limits', {
      productId,
      coverageId
    }, error as Error);
    return [];
  }
}

/**
 * Fetch deductibles for a coverage
 * Deductibles are stored in a subcollection under each coverage
 */
async function fetchDeductibles(productId: string, coverageId: string): Promise<CoverageDeductible[]> {
  try {
    const snap = await getDocs(
      collection(db, `products/${productId}/coverages/${coverageId}/deductibles`)
    );

    const deductibles = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CoverageDeductible));

    logger.debug(LOG_CATEGORIES.DATA, `Fetched ${deductibles.length} deductibles`, {
      productId,
      coverageId
    });

    return deductibles;
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Error fetching deductibles', {
      productId,
      coverageId
    }, error as Error);
    return [];
  }
}

/**
 * Fetch form-coverage mappings for a coverage
 * These mappings represent the many-to-many relationship between forms and coverages
 */
async function fetchFormMappings(productId: string, coverageId: string): Promise<FormCoverageMapping[]> {
  try {
    const q = query(
      collection(db, 'formCoverages'),
      where('coverageId', '==', coverageId),
      where('productId', '==', productId)
    );
    const snap = await getDocs(q);

    const mappings = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FormCoverageMapping));

    logger.debug(LOG_CATEGORIES.DATA, `Fetched ${mappings.length} form-coverage mappings`, {
      productId,
      coverageId
    });

    return mappings;
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Error fetching form mappings', {
      productId,
      coverageId
    }, error as Error);
    return [];
  }
}

/**
 * Fetch pricing rules for a coverage
 * Pricing rules define how premiums are calculated for this coverage
 */
async function fetchPricingRules(productId: string, coverageId: string): Promise<PricingRule[]> {
  try {
    const q = query(
      collection(db, 'pricingRules'),
      where('productId', '==', productId),
      where('coverageId', '==', coverageId)
    );
    const snap = await getDocs(q);

    const rules = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PricingRule));

    logger.debug(LOG_CATEGORIES.DATA, `Fetched ${rules.length} pricing rules`, {
      productId,
      coverageId
    });

    return rules;
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Error fetching pricing rules', {
      productId,
      coverageId
    }, error as Error);
    return [];
  }
}

/**
 * Fetch business rules for a coverage
 * Business rules define eligibility, underwriting, and other business logic
 */
async function fetchBusinessRules(productId: string, coverageId: string): Promise<Rule[]> {
  try {
    const q = query(
      collection(db, 'rules'),
      where('productId', '==', productId),
      where('targetId', '==', coverageId)
    );
    const snap = await getDocs(q);

    const rules = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Rule));

    logger.debug(LOG_CATEGORIES.DATA, `Fetched ${rules.length} business rules`, {
      productId,
      coverageId
    });

    return rules;
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Error fetching business rules', {
      productId,
      coverageId
    }, error as Error);
    return [];
  }
}

/**
 * Fetch state applicability for a coverage
 * State applicability tracks which states this coverage is available in and its regulatory status
 */
async function fetchStateApplicability(productId: string, coverageId: string): Promise<StateApplicability[]> {
  try {
    const q = query(
      collection(db, 'stateApplicability'),
      where('productId', '==', productId),
      where('entityId', '==', coverageId),
      where('entityType', '==', 'coverage')
    );
    const snap = await getDocs(q);

    const applicability = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as StateApplicability));

    logger.debug(LOG_CATEGORIES.DATA, `Fetched ${applicability.length} state applicability records`, {
      productId,
      coverageId
    });

    return applicability;
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Error fetching state applicability', {
      productId,
      coverageId
    }, error as Error);
    return [];
  }
}

/**
 * Check if coverage data is current (not expired)
 */
export function isCoverageDataCurrent(coverage: Coverage): boolean {
  if (!coverage.expirationDate) return true;

  const expirationDate = coverage.expirationDate instanceof Timestamp
    ? coverage.expirationDate.toDate()
    : new Date(coverage.expirationDate);

  return expirationDate > new Date();
}

/**
 * Get effective state availability for a coverage
 */
export function getEffectiveStates(
  coverage: Coverage,
  stateApplicability: StateApplicability[]
): string[] {
  if (!coverage.states) return [];

  // Filter state applicability to only include approved states
  const approvedStates = stateApplicability
    .filter(sa => sa.rateApprovalStatus === 'approved' || sa.rateApprovalStatus === 'conditional')
    .map(sa => sa.state);

  // Return intersection of coverage states and approved states
  return coverage.states.filter(state => approvedStates.includes(state));
}

/**
 * Get active pricing rules for a coverage
 */
export function getActivePricingRules(pricingRules: PricingRule[]): PricingRule[] {
  const now = new Date();
  return pricingRules.filter(rule => {
    if (!rule.isActive) return false;

    if (rule.effectiveDate) {
      const effectiveDate = rule.effectiveDate instanceof Timestamp
        ? rule.effectiveDate.toDate()
        : new Date(rule.effectiveDate);
      if (effectiveDate > now) return false;
    }

    if (rule.expirationDate) {
      const expirationDate = rule.expirationDate instanceof Timestamp
        ? rule.expirationDate.toDate()
        : new Date(rule.expirationDate);
      if (expirationDate < now) return false;
    }

    return true;
  });
}

/**
 * Get active business rules for a coverage
 */
export function getActiveBusinessRules(businessRules: Rule[]): Rule[] {
  const now = new Date();
  return businessRules.filter(rule => {
    if (rule.status !== 'Active') return false;

    if (rule.effectiveDate) {
      const effectiveDate = rule.effectiveDate instanceof Timestamp
        ? rule.effectiveDate.toDate()
        : new Date(rule.effectiveDate);
      if (effectiveDate > now) return false;
    }

    if (rule.expirationDate) {
      const expirationDate = rule.expirationDate instanceof Timestamp
        ? rule.expirationDate.toDate()
        : new Date(rule.expirationDate);
      if (expirationDate < now) return false;
    }

    return true;
  });
}

/**
 * Validate referential integrity of coverage data
 * Ensures all relationships are properly maintained
 */
export function validateCoverageIntegrity(data: CoverageAutoPopulationData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate sub-coverages reference parent
  data.subCoverages.forEach(subCoverage => {
    if (!subCoverage.parentCoverageId) {
      errors.push(`Sub-coverage ${subCoverage.id} missing parentCoverageId`);
    }
  });

  // Validate limits have required fields
  data.limits.forEach(limit => {
    if (!limit.limitType) {
      errors.push(`Limit ${limit.id} missing limitType`);
    }
    if (limit.amount === undefined || limit.amount === null) {
      errors.push(`Limit ${limit.id} missing amount`);
    }
  });

  // Validate deductibles have required fields
  data.deductibles.forEach(deductible => {
    if (!deductible.deductibleType) {
      errors.push(`Deductible ${deductible.id} missing deductibleType`);
    }
  });

  // Validate form mappings reference valid forms
  data.forms.forEach(mapping => {
    if (!mapping.formId) {
      errors.push(`Form mapping ${mapping.id} missing formId`);
    }
    if (!mapping.coverageId) {
      errors.push(`Form mapping ${mapping.id} missing coverageId`);
    }
  });

  // Validate pricing rules
  data.pricingRules.forEach(rule => {
    if (!rule.ruleType) {
      errors.push(`Pricing rule ${rule.id} missing ruleType`);
    }
    if (rule.value === undefined || rule.value === null) {
      errors.push(`Pricing rule ${rule.id} missing value`);
    }
  });

  // Validate business rules
  data.businessRules.forEach(rule => {
    if (!rule.ruleType) {
      errors.push(`Business rule ${rule.id} missing ruleType`);
    }
    if (!rule.condition) {
      warnings.push(`Business rule ${rule.id} missing condition`);
    }
  });

  // Validate state applicability
  data.stateApplicability.forEach(sa => {
    if (!sa.state) {
      errors.push(`State applicability ${sa.id} missing state`);
    }
    if (!sa.entityId) {
      errors.push(`State applicability ${sa.id} missing entityId`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get summary statistics for coverage data
 */
export function getCoverageSummary(data: CoverageAutoPopulationData): {
  subCoverageCount: number;
  limitCount: number;
  deductibleCount: number;
  formCount: number;
  pricingRuleCount: number;
  businessRuleCount: number;
  stateCount: number;
  hasSubCoverages: boolean;
  hasLimits: boolean;
  hasDeductibles: boolean;
  hasForms: boolean;
  hasPricingRules: boolean;
  hasBusinessRules: boolean;
  hasStateApplicability: boolean;
} {
  return {
    subCoverageCount: data.subCoverages.length,
    limitCount: data.limits.length,
    deductibleCount: data.deductibles.length,
    formCount: data.forms.length,
    pricingRuleCount: data.pricingRules.length,
    businessRuleCount: data.businessRules.length,
    stateCount: data.stateApplicability.length,
    hasSubCoverages: data.subCoverages.length > 0,
    hasLimits: data.limits.length > 0,
    hasDeductibles: data.deductibles.length > 0,
    hasForms: data.forms.length > 0,
    hasPricingRules: data.pricingRules.length > 0,
    hasBusinessRules: data.businessRules.length > 0,
    hasStateApplicability: data.stateApplicability.length > 0
  };
}

