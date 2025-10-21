/**
 * Coverage Auto-Population Utility
 * Automatically fetches all related data when a coverage is selected
 */

import {
  collection,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Coverage, CoverageLimit, CoverageDeductible, FormCoverageMapping, Rule, PricingRule, StateApplicability } from '../types';

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
}

/**
 * Fetch all related data for a coverage
 * This is the main function to call when a coverage is selected
 */
export async function fetchCoverageAutoPopulationData(
  productId: string,
  coverageId: string
): Promise<CoverageAutoPopulationData> {
  try {
    const [
      subCoverages,
      limits,
      deductibles,
      formMappings,
      pricingRules,
      businessRules,
      stateApplicability
    ] = await Promise.all([
      fetchSubCoverages(productId, coverageId),
      fetchLimits(productId, coverageId),
      fetchDeductibles(productId, coverageId),
      fetchFormMappings(productId, coverageId),
      fetchPricingRules(productId, coverageId),
      fetchBusinessRules(productId, coverageId),
      fetchStateApplicability(productId, coverageId)
    ]);

    const linkedFormIds = formMappings.map(fm => fm.formId);

    return {
      coverage: {} as Coverage, // Will be populated by caller
      subCoverages,
      limits,
      deductibles,
      forms: formMappings,
      pricingRules,
      businessRules,
      stateApplicability,
      linkedFormIds
    };
  } catch (error) {
    console.error('Error fetching coverage auto-population data:', error);
    throw error;
  }
}

/**
 * Fetch sub-coverages for a coverage
 */
async function fetchSubCoverages(productId: string, coverageId: string): Promise<Coverage[]> {
  try {
    const q = query(
      collection(db, `products/${productId}/coverages`),
      where('parentCoverageId', '==', coverageId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Coverage));
  } catch (error) {
    console.error('Error fetching sub-coverages:', error);
    return [];
  }
}

/**
 * Fetch limits for a coverage
 */
async function fetchLimits(productId: string, coverageId: string): Promise<CoverageLimit[]> {
  try {
    const snap = await getDocs(
      collection(db, `products/${productId}/coverages/${coverageId}/limits`)
    );
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CoverageLimit));
  } catch (error) {
    console.error('Error fetching limits:', error);
    return [];
  }
}

/**
 * Fetch deductibles for a coverage
 */
async function fetchDeductibles(productId: string, coverageId: string): Promise<CoverageDeductible[]> {
  try {
    const snap = await getDocs(
      collection(db, `products/${productId}/coverages/${coverageId}/deductibles`)
    );
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CoverageDeductible));
  } catch (error) {
    console.error('Error fetching deductibles:', error);
    return [];
  }
}

/**
 * Fetch form-coverage mappings for a coverage
 */
async function fetchFormMappings(productId: string, coverageId: string): Promise<FormCoverageMapping[]> {
  try {
    const q = query(
      collection(db, 'formCoverages'),
      where('coverageId', '==', coverageId),
      where('productId', '==', productId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FormCoverageMapping));
  } catch (error) {
    console.error('Error fetching form mappings:', error);
    return [];
  }
}

/**
 * Fetch pricing rules for a coverage
 */
async function fetchPricingRules(productId: string, coverageId: string): Promise<PricingRule[]> {
  try {
    const q = query(
      collection(db, 'pricingRules'),
      where('productId', '==', productId),
      where('coverageId', '==', coverageId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PricingRule));
  } catch (error) {
    console.error('Error fetching pricing rules:', error);
    return [];
  }
}

/**
 * Fetch business rules for a coverage
 */
async function fetchBusinessRules(productId: string, coverageId: string): Promise<Rule[]> {
  try {
    const q = query(
      collection(db, 'rules'),
      where('productId', '==', productId),
      where('targetId', '==', coverageId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Rule));
  } catch (error) {
    console.error('Error fetching business rules:', error);
    return [];
  }
}

/**
 * Fetch state applicability for a coverage
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
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as StateApplicability));
  } catch (error) {
    console.error('Error fetching state applicability:', error);
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

