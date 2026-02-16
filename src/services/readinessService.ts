/**
 * Readiness Computation Service
 *
 * Aggregates cross-artifact readiness for a product version and answers:
 * "What's missing to publish this product for state X on date Y?"
 *
 * Sections computed:
 *  1. Version timeline (all product versions with effective dates + statuses)
 *  2. State readiness matrix (per-state filing status + validation)
 *  3. Artifact readiness (forms, rules, rates, tables – published vs draft counts)
 *  4. Open Change Sets & pending approvals
 *  5. Impact summary (draft vs published diff counts)
 *  6. Linked tasks (future placeholder)
 */

import {
  VersionedDocument,
  VersionStatus,
  VERSION_STATUS_CONFIG,
} from '@/types/versioning';
import {
  StateProgram,
  StateProgramStatus,
  STATE_PROGRAM_STATUS_CONFIG,
  ValidationError,
} from '@/types/stateProgram';
import {
  ChangeSet,
  ChangeSetItem,
  ChangeSetStatus,
  CHANGESET_STATUS_CONFIG,
  APPROVAL_RULES,
  ApprovalRoleRequired,
} from '@/types/changeSet';
import { Product } from '@/types/index';
import { versioningService } from '@/services/versioningService';
import { fetchStatePrograms } from '@/services/stateProgramService';
import { listChangeSets, getChangeSetItems } from '@/services/changeSetService';
import { checkFormReadiness } from '@/services/formService';
import { loadAllRulesForReadiness } from '@/services/rulesEngineService';
import { checkRuleReadiness } from '@/engine/rulesEngine';
import type { FormReadinessCheck } from '@/types/form';
import type { RuleReadinessCheck } from '@/types/rulesEngine';
import { deepDiff } from '@/utils/versioningUtils';
import logger, { LOG_CATEGORIES } from '@/utils/logger';

// ============================================================================
// Result Types
// ============================================================================

/**
 * A single version in the product's timeline
 */
export interface VersionTimelineEntry {
  versionId: string;
  versionNumber: number;
  status: VersionStatus;
  statusLabel: string;
  statusColor: string;
  effectiveStart: string | null;
  effectiveEnd: string | null;
  createdBy: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  summary?: string;
  isCurrent: boolean;
}

/**
 * Per-state readiness row
 */
export interface StateReadinessRow {
  stateCode: string;
  stateName: string;
  status: StateProgramStatus;
  statusLabel: string;
  statusColor: string;
  validationErrors: ValidationError[];
  missingArtifacts: string[];
  canActivate: boolean;
  filingDate?: Date;
  approvalDate?: Date;
}

/**
 * Readiness for a single artifact category
 */
export interface ArtifactCategoryReadiness {
  category: 'forms' | 'rules' | 'ratePrograms' | 'tables';
  label: string;
  total: number;
  published: number;
  draft: number;
  review: number;
  issues: string[];
  /** 0-100 readiness score for this category */
  score: number;
}

/**
 * An open Change Set relevant to this product
 */
export interface OpenChangeSetSummary {
  id: string;
  name: string;
  status: ChangeSetStatus;
  statusLabel: string;
  statusColor: string;
  itemCount: number;
  /** Items in this CS that touch the current product version */
  relevantItems: ChangeSetItem[];
  ownerUserId: string;
  updatedAt: Date | null;
  /** Approval roles still required */
  pendingApprovals: ApprovalRoleRequired[];
}

/**
 * Draft vs published impact summary
 */
export interface ImpactSummary {
  /** Number of fields added in draft vs published */
  fieldsAdded: number;
  /** Number of fields removed */
  fieldsRemoved: number;
  /** Number of fields changed */
  fieldsChanged: number;
  /** Total diff count */
  totalChanges: number;
  /** Top-level paths that changed */
  changedPaths: string[];
  /** Whether a published version exists to compare against */
  hasPublishedBaseline: boolean;
}

/**
 * Placeholder for linked tasks
 */
export interface LinkedTask {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'done';
  assignee?: string;
  dueDate?: string;
}

/**
 * Full Product 360 readiness report
 */
export interface Product360Readiness {
  /** Product metadata */
  productId: string;
  productName: string;
  selectedVersionId: string | null;

  /** 1. Version timeline */
  versionTimeline: VersionTimelineEntry[];

  /** 2. State readiness matrix */
  stateReadiness: StateReadinessRow[];
  stateStats: {
    total: number;
    active: number;
    blocked: number;
    readyToActivate: number;
    notOffered: number;
  };

  /** 3. Artifact readiness */
  artifacts: ArtifactCategoryReadiness[];
  overallReadinessScore: number;

  /** 4. Open Change Sets */
  openChangeSets: OpenChangeSetSummary[];
  totalPendingApprovals: number;

  /** 5. Impact summary (draft vs published) */
  impact: ImpactSummary;

  /** 6. Linked tasks */
  linkedTasks: LinkedTask[];

  /** Actionable blockers: "What's missing?" */
  blockers: string[];

  /** Timestamp when this readiness was computed */
  computedAt: Date;
}

// ============================================================================
// Helpers
// ============================================================================

function toDate(ts: unknown): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts) {
    return (ts as { toDate: () => Date }).toDate();
  }
  if (typeof ts === 'string') return new Date(ts);
  return null;
}

function computeCategoryScore(published: number, total: number, issues: number): number {
  if (total === 0) return 100; // No items needed
  const ratio = total > 0 ? (published / total) * 100 : 0;
  const penalty = Math.min(issues * 10, 50);
  return Math.max(0, Math.round(ratio - penalty));
}

// ============================================================================
// Main Computation
// ============================================================================

/**
 * Compute the full Product 360 readiness report.
 *
 * @param orgId        – Current organization ID
 * @param productId    – Product document ID
 * @param versionId    – Selected product version ID (or null to auto-pick latest)
 * @param targetState  – (optional) Focus state code for "what's missing" blockers
 * @param targetDate   – (optional) Target effective date for blocker computation
 */
export async function computeProduct360Readiness(
  orgId: string,
  productId: string,
  versionId: string | null,
  targetState?: string,
  targetDate?: string,
): Promise<Product360Readiness> {
  const blockers: string[] = [];

  // ── 1. Version timeline ─────────────────────────────────────────────
  let allVersions: VersionedDocument<Product>[] = [];
  try {
    allVersions = await versioningService.getVersions<Product>(orgId, 'product', productId);
  } catch {
    logger.warn(LOG_CATEGORIES.DATA, 'No product versions found', { orgId, productId });
  }

  // Auto-select version if not provided
  let selectedVersionId = versionId;
  if (!selectedVersionId && allVersions.length > 0) {
    const draft = allVersions.find(v => v.status === 'draft');
    const published = allVersions.find(v => v.status === 'published');
    selectedVersionId = (draft || published || allVersions[0]).id;
  }

  const versionTimeline: VersionTimelineEntry[] = allVersions.map(v => ({
    versionId: v.id,
    versionNumber: v.versionNumber,
    status: v.status,
    statusLabel: VERSION_STATUS_CONFIG[v.status].label,
    statusColor: VERSION_STATUS_CONFIG[v.status].color,
    effectiveStart: v.effectiveStart,
    effectiveEnd: v.effectiveEnd,
    createdBy: v.createdBy,
    createdAt: toDate(v.createdAt),
    updatedAt: toDate(v.updatedAt),
    summary: v.summary,
    isCurrent: v.id === selectedVersionId,
  }));

  // Determine product name from selected version or first version
  const selectedVersion = allVersions.find(v => v.id === selectedVersionId);
  const productName = (selectedVersion?.data as Product)?.name ?? productId;

  // ── 2. State readiness matrix ──────────────────────────────────────
  let statePrograms: StateProgram[] = [];
  if (selectedVersionId) {
    try {
      statePrograms = await fetchStatePrograms(orgId, productId, selectedVersionId);
    } catch {
      logger.warn(LOG_CATEGORIES.DATA, 'Failed to load state programs', { productId, selectedVersionId });
    }
  }

  const stateReadiness: StateReadinessRow[] = statePrograms.map(sp => {
    const cfg = STATE_PROGRAM_STATUS_CONFIG[sp.status];
    const missingArtifacts: string[] = [];

    // Inspect required artifacts
    if (sp.requiredArtifacts) {
      if ((sp.requiredArtifacts.formVersionIds?.length ?? 0) === 0 && sp.status !== 'not_offered') {
        missingArtifacts.push('No forms assigned');
      }
      if ((sp.requiredArtifacts.ruleVersionIds?.length ?? 0) === 0 && sp.status !== 'not_offered') {
        missingArtifacts.push('No rules assigned');
      }
      if ((sp.requiredArtifacts.rateProgramVersionIds?.length ?? 0) === 0 && sp.status !== 'not_offered') {
        missingArtifacts.push('No rate program assigned');
      }
    }

    const canActivate =
      sp.status === 'approved' &&
      sp.validationErrors.length === 0 &&
      missingArtifacts.length === 0;

    return {
      stateCode: sp.stateCode,
      stateName: sp.stateName,
      status: sp.status,
      statusLabel: cfg.label,
      statusColor: cfg.color,
      validationErrors: sp.validationErrors || [],
      missingArtifacts,
      canActivate,
      filingDate: toDate(sp.filingDate) ?? undefined,
      approvalDate: toDate(sp.approvalDate) ?? undefined,
    };
  });

  const stateStats = {
    total: stateReadiness.length,
    active: stateReadiness.filter(s => s.status === 'active').length,
    blocked: stateReadiness.filter(s => s.validationErrors.length > 0 || s.missingArtifacts.length > 0).length,
    readyToActivate: stateReadiness.filter(s => s.canActivate).length,
    notOffered: stateReadiness.filter(s => s.status === 'not_offered').length,
  };

  // State-specific blockers
  if (targetState) {
    const targetRow = stateReadiness.find(s => s.stateCode === targetState);
    if (!targetRow) {
      blockers.push(`State ${targetState} is not configured for this product version.`);
    } else {
      if (targetRow.status === 'not_offered') {
        blockers.push(`${targetState} is marked as "Not Offered". Change status to begin filing.`);
      }
      for (const err of targetRow.validationErrors) {
        blockers.push(`[${targetState}] ${err.message}`);
      }
      for (const missing of targetRow.missingArtifacts) {
        blockers.push(`[${targetState}] ${missing}`);
      }
      if (targetRow.status !== 'active' && targetRow.status !== 'approved') {
        blockers.push(`[${targetState}] Status is "${targetRow.statusLabel}" – must reach "Approved" before activation.`);
      }
    }
  }

  // ── 3. Artifact readiness ──────────────────────────────────────────
  const artifacts: ArtifactCategoryReadiness[] = [];

  // Forms
  let formReadiness: FormReadinessCheck | null = null;
  try {
    formReadiness = await checkFormReadiness(orgId);
  } catch {
    logger.warn(LOG_CATEGORIES.DATA, 'Failed to load form readiness');
  }

  if (formReadiness) {
    artifacts.push({
      category: 'forms',
      label: 'Forms',
      total: formReadiness.totalForms,
      published: formReadiness.publishedForms,
      draft: formReadiness.draftForms,
      review: 0,
      issues: formReadiness.issues,
      score: computeCategoryScore(formReadiness.publishedForms, formReadiness.totalForms, formReadiness.issues.length),
    });

    if (formReadiness.draftFormsInUse.length > 0) {
      blockers.push(`${formReadiness.draftFormsInUse.length} form(s) in use without a published edition.`);
    }
  }

  // Rules
  let ruleReadiness: RuleReadinessCheck | null = null;
  if (selectedVersionId) {
    try {
      const allRules = await loadAllRulesForReadiness(orgId);
      ruleReadiness = checkRuleReadiness(allRules, selectedVersionId, []);
    } catch {
      logger.warn(LOG_CATEGORIES.DATA, 'Failed to load rule readiness');
    }
  }

  if (ruleReadiness) {
    const ruleIssues = ruleReadiness.issues.map(i => i.message);
    artifacts.push({
      category: 'rules',
      label: 'Underwriting Rules',
      total: ruleReadiness.totalRules,
      published: ruleReadiness.publishedRules,
      draft: ruleReadiness.draftRules,
      review: 0,
      issues: ruleIssues,
      score: computeCategoryScore(ruleReadiness.publishedRules, ruleReadiness.totalRules, ruleReadiness.issues.filter(i => i.severity === 'error').length),
    });

    const errorIssues = ruleReadiness.issues.filter(i => i.severity === 'error');
    if (errorIssues.length > 0) {
      blockers.push(`${errorIssues.length} rule error(s): ${errorIssues[0].message}`);
    }
  }

  // Rate Programs – count versions from the versioning service
  // (we don't have a dedicated readiness check, so derive from version status)
  artifacts.push({
    category: 'ratePrograms',
    label: 'Rate Programs',
    total: 0,
    published: 0,
    draft: 0,
    review: 0,
    issues: [],
    score: 100, // Will be overridden when data is available
  });

  // Tables – same pattern
  artifacts.push({
    category: 'tables',
    label: 'Rating Tables',
    total: 0,
    published: 0,
    draft: 0,
    review: 0,
    issues: [],
    score: 100,
  });

  // Overall readiness score (weighted average)
  const scoredArtifacts = artifacts.filter(a => a.total > 0);
  const overallReadinessScore =
    scoredArtifacts.length > 0
      ? Math.round(scoredArtifacts.reduce((sum, a) => sum + a.score, 0) / scoredArtifacts.length)
      : (allVersions.length > 0 ? 50 : 0);

  // ── 4. Open Change Sets ────────────────────────────────────────────
  let allChangeSets: ChangeSet[] = [];
  try {
    allChangeSets = await listChangeSets(orgId, ['draft', 'ready_for_review', 'approved']);
  } catch {
    logger.warn(LOG_CATEGORIES.DATA, 'Failed to load change sets');
  }

  const openChangeSets: OpenChangeSetSummary[] = [];
  let totalPendingApprovals = 0;

  for (const cs of allChangeSets.slice(0, 10)) {
    let items: ChangeSetItem[] = [];
    try {
      items = await getChangeSetItems(orgId, cs.id);
    } catch {
      /* skip */
    }

    // Filter items relevant to this product
    const relevantItems = items.filter(
      item => item.artifactId === productId || item.versionId === selectedVersionId
    );

    // Compute pending approval roles
    const pendingApprovals: ApprovalRoleRequired[] = [];
    if (cs.status === 'ready_for_review' || cs.status === 'draft') {
      const typesInCS = new Set(items.map(i => i.artifactType));
      for (const t of typesInCS) {
        const roles = APPROVAL_RULES[t] || [];
        for (const r of roles) {
          if (!pendingApprovals.includes(r)) {
            pendingApprovals.push(r);
          }
        }
      }
    }

    totalPendingApprovals += pendingApprovals.length;

    const cfg = CHANGESET_STATUS_CONFIG[cs.status];
    openChangeSets.push({
      id: cs.id,
      name: cs.name,
      status: cs.status,
      statusLabel: cfg.label,
      statusColor: cfg.color,
      itemCount: items.length,
      relevantItems,
      ownerUserId: cs.ownerUserId,
      updatedAt: toDate(cs.updatedAt),
      pendingApprovals,
    });
  }

  if (openChangeSets.some(cs => cs.status === 'ready_for_review')) {
    blockers.push('Change sets awaiting review – approval needed before publishing.');
  }

  // ── 5. Impact summary (draft vs published) ─────────────────────────
  let impact: ImpactSummary = {
    fieldsAdded: 0,
    fieldsRemoved: 0,
    fieldsChanged: 0,
    totalChanges: 0,
    changedPaths: [],
    hasPublishedBaseline: false,
  };

  if (selectedVersionId && allVersions.length >= 2) {
    const draftVersion = allVersions.find(v => v.id === selectedVersionId && v.status === 'draft');
    const publishedVersion = allVersions.find(v => v.status === 'published');

    if (draftVersion && publishedVersion) {
      try {
        const diffs = deepDiff(
          (publishedVersion.data ?? {}) as Record<string, unknown>,
          (draftVersion.data ?? {}) as Record<string, unknown>,
        );

        impact = {
          fieldsAdded: diffs.filter(d => d.type === 'added').length,
          fieldsRemoved: diffs.filter(d => d.type === 'removed').length,
          fieldsChanged: diffs.filter(d => d.type === 'changed').length,
          totalChanges: diffs.length,
          changedPaths: diffs.map(d => d.path).slice(0, 20),
          hasPublishedBaseline: true,
        };

        if (impact.totalChanges > 0) {
          blockers.push(
            `Draft has ${impact.totalChanges} change(s) vs published: ${impact.fieldsAdded} added, ${impact.fieldsChanged} modified, ${impact.fieldsRemoved} removed.`
          );
        }
      } catch {
        logger.warn(LOG_CATEGORIES.DATA, 'Failed to compute impact diff');
      }
    } else if (publishedVersion) {
      impact.hasPublishedBaseline = true;
    }
  }

  // ── 6. Linked tasks (placeholder) ──────────────────────────────────
  const linkedTasks: LinkedTask[] = [];

  // ── Date-specific blockers ─────────────────────────────────────────
  if (targetDate && selectedVersion) {
    const target = new Date(targetDate);
    if (selectedVersion.effectiveStart) {
      const start = new Date(selectedVersion.effectiveStart);
      if (start > target) {
        blockers.push(
          `Version effective date (${selectedVersion.effectiveStart}) is after target date (${targetDate}).`
        );
      }
    } else {
      blockers.push('No effective start date set on this version.');
    }

    if (selectedVersion.status === 'draft') {
      blockers.push('Version is still in Draft – must be published before going live.');
    }
  }

  return {
    productId,
    productName,
    selectedVersionId,
    versionTimeline,
    stateReadiness,
    stateStats,
    artifacts,
    overallReadinessScore,
    openChangeSets,
    totalPendingApprovals,
    impact,
    linkedTasks,
    blockers,
    computedAt: new Date(),
  };
}

/**
 * Compute what's missing for a specific state and target date.
 * Convenience wrapper that returns only the blockers array.
 */
export async function whatsMissing(
  orgId: string,
  productId: string,
  versionId: string | null,
  stateCode: string,
  targetDate: string,
): Promise<string[]> {
  const report = await computeProduct360Readiness(orgId, productId, versionId, stateCode, targetDate);
  return report.blockers;
}
