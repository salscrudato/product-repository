/**
 * Governance Engine
 *
 * Pure computation: AIPlan + trace links + clause library
 * → governance fields (impacted artifacts, diffs, clause refs, impact summary).
 *
 * No Firestore or network calls. The service layer handles data loading.
 *
 * Pipeline:
 *   1. Build impacted artifact list from the plan
 *   2. Generate field-level diffs via existing generatePlanDiffs
 *   3. Match proposed artifacts to supporting clauses via trace links
 *   4. Compute impact summary with governance-specific warnings
 *   5. Assemble GovernanceFields
 */

import type {
  AIPlan,
  ProposedArtifact,
  PlanDiffEntry,
  PlanImpactSummary,
  PlanArtifactType,
} from '../types/aiPlan';
import {
  computeImpactSummary,
  generatePlanDiffs,
} from '../types/aiPlan';
import type { TraceLink, TraceLinkTargetType } from '../types/traceLink';
import type { OrgClause, ClauseVersion, ClauseType } from '../types/clause';
import type {
  ImpactedArtifact,
  ProposalClauseRef,
  GovernanceFields,
} from '../types/governedProposal';

// ════════════════════════════════════════════════════════════════════════
// Input types
// ════════════════════════════════════════════════════════════════════════

export interface GovernanceInput {
  /** The AI plan to govern */
  plan: AIPlan;
  /** Current state of existing entities (for diff computation) */
  currentStates: Map<string, Record<string, unknown>>;
  /** All trace links in the org (for clause matching) */
  traceLinks: TraceLink[];
  /** Clause metadata keyed by clauseId */
  clauseMap: Map<string, { clause: OrgClause; latestText: string }>;
  /** Change Set identity */
  changeSetId: string;
  changeSetName?: string;
}

// ════════════════════════════════════════════════════════════════════════
// 1. Build impacted artifacts
// ════════════════════════════════════════════════════════════════════════

export function buildImpactedArtifacts(plan: AIPlan): ImpactedArtifact[] {
  return plan.artifacts.map(a => ({
    key: a.key,
    artifactType: a.artifactType,
    entityId: a.existingEntityId || `new-${a.key}`,
    entityName: a.name,
    currentVersionId: undefined, // Will be populated by service when available
    proposedVersionId: undefined, // Populated after apply
    action: a.action === 'create' ? 'create' : 'modify',
    impactReason: a.rationale,
    confidence: a.confidence,
  }));
}

// ════════════════════════════════════════════════════════════════════════
// 2. Generate diffs (delegates to existing pure function)
// ════════════════════════════════════════════════════════════════════════

export function buildDiffs(
  plan: AIPlan,
  currentStates: Map<string, Record<string, unknown>>,
): PlanDiffEntry[] {
  return generatePlanDiffs(plan, currentStates);
}

// ════════════════════════════════════════════════════════════════════════
// 3. Match artifacts to supporting clauses
// ════════════════════════════════════════════════════════════════════════

/** Map PlanArtifactType to the TraceLinkTargetType field name */
function artifactTypeToTraceField(type: PlanArtifactType): string | null {
  const map: Record<string, string> = {
    rule: 'ruleVersionId',
    coverage: 'coverageVersionId',
    rateProgram: 'rateProgramVersionId',
  };
  return map[type] || null;
}

/**
 * Find clause references that support the proposed artifacts.
 *
 * Two strategies:
 *   1. Direct match: existing trace link connects a clause to the same entity
 *   2. Text match: clause name or text overlaps with the artifact name/rationale
 */
export function findClauseRefs(
  plan: AIPlan,
  traceLinks: TraceLink[],
  clauseMap: Map<string, { clause: OrgClause; latestText: string }>,
): ProposalClauseRef[] {
  const refs: ProposalClauseRef[] = [];
  const seen = new Set<string>();

  for (const artifact of plan.artifacts) {
    // Strategy 1: Direct trace link match
    const traceField = artifactTypeToTraceField(artifact.artifactType);
    if (traceField && artifact.existingEntityId) {
      const matchingLinks = traceLinks.filter(
        tl => (tl as any)[traceField] === artifact.existingEntityId
      );
      for (const link of matchingLinks) {
        const key = `${link.clauseId}:${artifact.key}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const clauseInfo = clauseMap.get(link.clauseId);
        refs.push({
          clauseId: link.clauseId,
          clauseVersionId: link.clauseVersionId,
          clauseName: clauseInfo?.clause.canonicalName || link.clauseName || link.clauseId,
          clauseType: clauseInfo?.clause.type || link.clauseType || 'other',
          clauseTextSnippet: (clauseInfo?.latestText || '').slice(0, 200),
          supportedArtifactKeys: [artifact.key],
          relevance: `Existing trace link: ${link.rationale || 'clause justifies this configuration'}`,
          existingTraceLinkId: link.id,
        });
      }
    }

    // Strategy 2: Text overlap match (artifact name/rationale vs clause names)
    const artifactTerms = `${artifact.name} ${artifact.rationale}`.toLowerCase();
    for (const [clauseId, info] of clauseMap) {
      const clauseTerms = info.clause.canonicalName.toLowerCase();
      const clauseWords = clauseTerms.split(/\s+/).filter(w => w.length > 4);
      const matchCount = clauseWords.filter(w => artifactTerms.includes(w)).length;

      if (matchCount >= 2) {
        const key = `${clauseId}:${artifact.key}`;
        if (seen.has(key)) continue;
        seen.add(key);

        refs.push({
          clauseId,
          clauseVersionId: info.clause.latestPublishedVersionId || '',
          clauseName: info.clause.canonicalName,
          clauseType: info.clause.type,
          clauseTextSnippet: (info.latestText || '').slice(0, 200),
          supportedArtifactKeys: [artifact.key],
          relevance: `Clause name matches artifact: "${info.clause.canonicalName}" overlaps with "${artifact.name}"`,
        });
      }
    }
  }

  // Merge refs that point to the same clause (combine supportedArtifactKeys)
  const merged = new Map<string, ProposalClauseRef>();
  for (const ref of refs) {
    const existing = merged.get(ref.clauseId);
    if (existing) {
      existing.supportedArtifactKeys = [
        ...new Set([...existing.supportedArtifactKeys, ...ref.supportedArtifactKeys]),
      ];
    } else {
      merged.set(ref.clauseId, { ...ref });
    }
  }

  return Array.from(merged.values());
}

// ════════════════════════════════════════════════════════════════════════
// 4. Enhanced impact summary with governance warnings
// ════════════════════════════════════════════════════════════════════════

export function buildGovernanceImpactSummary(
  plan: AIPlan,
  clauseRefs: ProposalClauseRef[],
): PlanImpactSummary {
  const base = computeImpactSummary(plan);

  // Add governance-specific warnings
  const modifyArtifacts = plan.artifacts.filter(a => a.action === 'modify');
  if (modifyArtifacts.length > 0 && clauseRefs.length === 0) {
    base.warnings.push(
      'No supporting clauses found for modifications. Consider linking to contract language for audit traceability.'
    );
  }

  const uncoveredModifications = modifyArtifacts.filter(a =>
    !clauseRefs.some(ref => ref.supportedArtifactKeys.includes(a.key))
  );
  if (uncoveredModifications.length > 0) {
    base.warnings.push(
      `${uncoveredModifications.length} modification(s) have no supporting clause: ${uncoveredModifications.map(a => `"${a.name}"`).join(', ')}`
    );
  }

  return base;
}

// ════════════════════════════════════════════════════════════════════════
// 5. Full governance pipeline
// ════════════════════════════════════════════════════════════════════════

/**
 * Build governance fields for an AI proposal.
 * Pure function: plan + context → governance fields.
 */
export function buildGovernanceFields(input: GovernanceInput): GovernanceFields {
  const { plan, currentStates, traceLinks, clauseMap, changeSetId, changeSetName } = input;

  const impactedArtifacts = buildImpactedArtifacts(plan);
  const diffs = buildDiffs(plan, currentStates);
  const clauseRefs = findClauseRefs(plan, traceLinks, clauseMap);
  const impactSummary = buildGovernanceImpactSummary(plan, clauseRefs);

  return {
    impactedArtifacts,
    diffs,
    impactSummary,
    clauseRefs,
    changeSetId,
    changeSetName,
    decision: 'pending',
    createTraceLinks: clauseRefs.length > 0,
  };
}
