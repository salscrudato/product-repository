/**
 * Coverage Rules Service
 * 
 * Manages coverage business rules including:
 * - Eligibility rules (when coverage can be offered)
 * - Dependency rules (requires/excludes other coverages)
 * - Validation rules (limit/deductible constraints)
 * - Rating rules (premium modifications)
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { CoverageRule, RuleAction } from '../types/coverageConfig';

/** Local rule type union used by this service (superset of CoverageRule.ruleType) */
type RuleType = CoverageRule['ruleType'] | 'dependency' | 'validation' | 'workflow';

// ============================================================================
// Collection Path Helpers
// ============================================================================

const getRulesPath = (productId: string, coverageId: string) =>
  `products/${productId}/coverages/${coverageId}/rules`;

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Fetch all rules for a coverage
 */
export const fetchCoverageRules = async (
  productId: string,
  coverageId: string
): Promise<CoverageRule[]> => {
  const path = getRulesPath(productId, coverageId);
  const q = query(collection(db, path), orderBy('priority', 'asc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as CoverageRule[];
};

/**
 * Fetch rules by type
 */
export const fetchRulesByType = async (
  productId: string,
  coverageId: string,
  type: RuleType
): Promise<CoverageRule[]> => {
  const path = getRulesPath(productId, coverageId);
  const q = query(
    collection(db, path),
    where('type', '==', type),
    orderBy('priority', 'asc')
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as CoverageRule[];
};

/**
 * Create a new rule
 */
export const createRule = async (
  productId: string,
  coverageId: string,
  data: Omit<CoverageRule, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const path = getRulesPath(productId, coverageId);
  const docRef = await addDoc(collection(db, path), {
    ...data,
    productId,
    coverageId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return docRef.id;
};

/**
 * Update a rule
 */
export const updateRule = async (
  productId: string,
  coverageId: string,
  ruleId: string,
  data: Partial<CoverageRule>
): Promise<void> => {
  const path = getRulesPath(productId, coverageId);
  const docRef = doc(db, path, ruleId);
  
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete a rule
 */
export const deleteRule = async (
  productId: string,
  coverageId: string,
  ruleId: string
): Promise<void> => {
  const path = getRulesPath(productId, coverageId);
  await deleteDoc(doc(db, path, ruleId));
};

/**
 * Toggle rule enabled status
 */
export const toggleRuleEnabled = async (
  productId: string,
  coverageId: string,
  ruleId: string,
  enabled: boolean
): Promise<void> => {
  await updateRule(productId, coverageId, ruleId, { isActive: enabled });
};

// ============================================================================
// Rule Templates
// ============================================================================

/**
 * Get rule type display info
 */
export const getRuleTypeInfo = (type: RuleType): { label: string; icon: string; color: string } => {
  const info: Record<string, { label: string; icon: string; color: string }> = {
    eligibility: { label: 'Eligibility', icon: 'target', color: '#6366f1' },
    dependency: { label: 'Dependency', icon: 'link', color: '#8b5cf6' },
    validation: { label: 'Validation', icon: 'check', color: '#10b981' },
    rating: { label: 'Rating', icon: 'currency', color: '#f59e0b' },
    workflow: { label: 'Workflow', icon: 'cog', color: '#3b82f6' },
  };
  return info[type] ?? { label: type, icon: 'clipboard', color: '#64748b' };
};

/**
 * Create a dependency rule template
 */
export const createDependencyRuleTemplate = (
  targetCoverageId: string,
  dependencyType: 'requires' | 'excludes'
): Omit<CoverageRule, 'id' | 'createdAt' | 'updatedAt' | 'productId' | 'coverageId'> => ({
  name: `${dependencyType === 'requires' ? 'Requires' : 'Excludes'} Coverage`,
  ruleType: 'eligibility',
  severity: 'block',
  conditionGroup: {
    id: 'root',
    logic: 'AND',
    conditions: [{
      id: 'cond-1',
      field: 'selectedCoverages',
      operator: dependencyType === 'requires' ? 'not_contains' : 'contains',
      value: targetCoverageId,
    }],
  },
  actions: [{
    type: (dependencyType === 'requires' ? 'decline' : 'add_note') as RuleAction,
    message: dependencyType === 'requires' 
      ? 'This coverage requires another coverage to be selected'
      : 'This coverage cannot be combined with another coverage',
  }],
  priority: 100,
  isActive: true,
});

