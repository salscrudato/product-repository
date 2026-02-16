/**
 * Underwriting Rules Engine Service
 *
 * Client-side Firestore service for org-scoped underwriting rules CRUD
 * and version management.
 *
 * Paths:
 *   orgs/{orgId}/rules/{ruleId}
 *   orgs/{orgId}/rules/{ruleId}/versions/{ruleVersionId}
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db, safeOnSnapshot } from '../firebase';
import type {
  UnderwritingRule,
  UnderwritingRuleVersion,
  UnderwritingRuleType,
  RuleVersionStatus,
  ConditionGroup,
  RuleOutcome,
  RuleScope,
} from '../types/rulesEngine';

// ============================================================================
// Collection Paths
// ============================================================================

const getRulesPath = (orgId: string) =>
  `orgs/${orgId}/rules`;

const getRuleVersionsPath = (orgId: string, ruleId: string) =>
  `orgs/${orgId}/rules/${ruleId}/versions`;

// ============================================================================
// Rule CRUD
// ============================================================================

export async function createRule(
  orgId: string,
  data: { name: string; description?: string; type: UnderwritingRuleType; productId?: string },
  userId: string,
): Promise<string> {
  const colRef = collection(db, getRulesPath(orgId));
  const now = Timestamp.now();

  const docRef = await addDoc(colRef, {
    orgId,
    name: data.name,
    description: data.description || '',
    type: data.type,
    productId: data.productId || null,
    versionCount: 0,
    archived: false,
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
  });

  return docRef.id;
}

export async function getRule(
  orgId: string,
  ruleId: string,
): Promise<UnderwritingRule | null> {
  const docRef = doc(db, getRulesPath(orgId), ruleId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as UnderwritingRule;
}

export async function getRules(
  orgId: string,
  filters?: { type?: UnderwritingRuleType; archived?: boolean },
): Promise<UnderwritingRule[]> {
  const colRef = collection(db, getRulesPath(orgId));
  let q = query(colRef, orderBy('name'));

  if (filters?.type) {
    q = query(colRef, where('type', '==', filters.type), orderBy('name'));
  }

  const snap = await getDocs(q);
  let rules = snap.docs.map(d => ({ id: d.id, ...d.data() } as UnderwritingRule));

  if (filters?.archived !== undefined) {
    rules = rules.filter(r => r.archived === filters.archived);
  }

  return rules;
}

export async function updateRule(
  orgId: string,
  ruleId: string,
  data: Partial<Pick<UnderwritingRule, 'name' | 'description' | 'type' | 'archived'>>,
  userId: string,
): Promise<void> {
  const docRef = doc(db, getRulesPath(orgId), ruleId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}

export async function deleteRule(orgId: string, ruleId: string): Promise<void> {
  const docRef = doc(db, getRulesPath(orgId), ruleId);
  await deleteDoc(docRef);
}

export function subscribeToRules(
  orgId: string,
  onData: (rules: UnderwritingRule[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const colRef = collection(db, getRulesPath(orgId));
  const q = query(colRef, orderBy('name'));

  return safeOnSnapshot(
    q,
    (snap) => {
      const rules = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as UnderwritingRule))
        .filter(r => !r.archived);
      onData(rules);
    },
    (err) => onError?.(err),
  );
}

// ============================================================================
// Rule Version CRUD
// ============================================================================

export async function createRuleVersion(
  orgId: string,
  ruleId: string,
  data: {
    conditions: ConditionGroup;
    outcome: RuleOutcome;
    scope: RuleScope;
    summary?: string;
    notes?: string;
    effectiveStart?: string | null;
    effectiveEnd?: string | null;
  },
  userId: string,
): Promise<string> {
  // Get current version count
  const rule = await getRule(orgId, ruleId);
  const versionNumber = (rule?.versionCount ?? 0) + 1;

  const versionsRef = collection(db, getRuleVersionsPath(orgId, ruleId));
  const now = Timestamp.now();

  const docRef = await addDoc(versionsRef, {
    ruleId,
    versionNumber,
    status: 'draft' as RuleVersionStatus,
    conditions: data.conditions,
    outcome: data.outcome,
    scope: data.scope,
    effectiveStart: data.effectiveStart ?? null,
    effectiveEnd: data.effectiveEnd ?? null,
    summary: data.summary || '',
    notes: data.notes || '',
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
  });

  // Update parent rule version count and draft pointer
  const ruleRef = doc(db, getRulesPath(orgId), ruleId);
  await updateDoc(ruleRef, {
    versionCount: versionNumber,
    latestDraftVersionId: docRef.id,
    updatedAt: now,
    updatedBy: userId,
  });

  return docRef.id;
}

export async function getRuleVersion(
  orgId: string,
  ruleId: string,
  versionId: string,
): Promise<UnderwritingRuleVersion | null> {
  const docRef = doc(db, getRuleVersionsPath(orgId, ruleId), versionId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as UnderwritingRuleVersion;
}

export async function getRuleVersions(
  orgId: string,
  ruleId: string,
  status?: RuleVersionStatus,
): Promise<UnderwritingRuleVersion[]> {
  const colRef = collection(db, getRuleVersionsPath(orgId, ruleId));
  let q = query(colRef, orderBy('versionNumber', 'desc'));

  if (status) {
    q = query(colRef, where('status', '==', status), orderBy('versionNumber', 'desc'));
  }

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as UnderwritingRuleVersion));
}

export async function updateRuleVersion(
  orgId: string,
  ruleId: string,
  versionId: string,
  data: Partial<Pick<
    UnderwritingRuleVersion,
    'conditions' | 'outcome' | 'scope' | 'summary' | 'notes' | 'effectiveStart' | 'effectiveEnd'
  >>,
  userId: string,
): Promise<void> {
  const docRef = doc(db, getRuleVersionsPath(orgId, ruleId), versionId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}

export async function transitionRuleVersion(
  orgId: string,
  ruleId: string,
  versionId: string,
  newStatus: RuleVersionStatus,
  userId: string,
): Promise<void> {
  const docRef = doc(db, getRuleVersionsPath(orgId, ruleId), versionId);
  const updates: Record<string, unknown> = {
    status: newStatus,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  };

  if (newStatus === 'published') {
    updates.publishedAt = Timestamp.now();
    updates.publishedBy = userId;
  }

  await updateDoc(docRef, updates);

  // Update parent quick-access pointers
  const ruleRef = doc(db, getRulesPath(orgId), ruleId);
  if (newStatus === 'published') {
    await updateDoc(ruleRef, { latestPublishedVersionId: versionId, updatedAt: Timestamp.now() });
  }
}

export async function cloneRuleVersion(
  orgId: string,
  ruleId: string,
  sourceVersionId: string,
  userId: string,
): Promise<string> {
  const source = await getRuleVersion(orgId, ruleId, sourceVersionId);
  if (!source) throw new Error('Source version not found');

  return createRuleVersion(
    orgId,
    ruleId,
    {
      conditions: source.conditions,
      outcome: source.outcome,
      scope: source.scope,
      summary: `Cloned from v${source.versionNumber}`,
      effectiveStart: source.effectiveStart,
      effectiveEnd: source.effectiveEnd,
    },
    userId,
  );
}

export function subscribeToRuleVersions(
  orgId: string,
  ruleId: string,
  onData: (versions: UnderwritingRuleVersion[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const colRef = collection(db, getRuleVersionsPath(orgId, ruleId));
  const q = query(colRef, orderBy('versionNumber', 'desc'));

  return safeOnSnapshot(
    q,
    (snap) => {
      const versions = snap.docs.map(d => ({ id: d.id, ...d.data() } as UnderwritingRuleVersion));
      onData(versions);
    },
    (err) => onError?.(err),
  );
}

// ============================================================================
// Batch helpers for evaluation
// ============================================================================

/**
 * Load all published rule versions for a given org, suitable for evaluation.
 * Returns RuleWithVersion[] ready for the rules engine.
 */
export async function loadPublishedRulesForEvaluation(
  orgId: string,
): Promise<import('../engine/rulesEngine').RuleWithVersion[]> {
  const rules = await getRules(orgId, { archived: false });
  const result: import('../engine/rulesEngine').RuleWithVersion[] = [];

  for (const rule of rules) {
    if (!rule.latestPublishedVersionId) continue;
    const version = await getRuleVersion(orgId, rule.id, rule.latestPublishedVersionId);
    if (version && version.status === 'published') {
      result.push({
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.type,
        version,
      });
    }
  }

  return result;
}

/**
 * Load all rule versions (any status) for readiness checks.
 */
export async function loadAllRulesForReadiness(
  orgId: string,
): Promise<import('../engine/rulesEngine').RuleWithVersion[]> {
  const rules = await getRules(orgId, { archived: false });
  const result: import('../engine/rulesEngine').RuleWithVersion[] = [];

  for (const rule of rules) {
    const versions = await getRuleVersions(orgId, rule.id);
    for (const version of versions) {
      result.push({
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.type,
        version,
      });
    }
  }

  return result;
}
