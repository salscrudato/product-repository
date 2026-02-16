/**
 * Governed Proposal Service
 *
 * Orchestrates the governed AI proposal lifecycle:
 *   1. Enrich an AI suggestion with governance fields (impacts, diffs, clauses)
 *   2. Apply proposals ONLY via Change Sets
 *   3. Create trace links when proposals are approved
 *   4. Record governance decisions
 *
 * Uses the existing Firestore path: orgs/{orgId}/aiSuggestions/{suggestionId}
 * Governance fields are stored as a nested `governance` object.
 *
 * GUARDRAIL: AI never writes directly. Everything goes through Change Sets.
 */

import {
  doc, getDoc, getDocs, updateDoc, collection, query, where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { orgAiSuggestionsPath } from '../repositories/paths';
import { buildGovernanceFields, type GovernanceInput } from '../engine/governanceEngine';
import { listSuggestions, applyPlan } from './aiPlanService';
import { getAllTraceLinks } from './traceLinkService';
import { createTraceLink } from './traceLinkService';
import { getClauses } from './clauseService';
import { getClauseVersions } from './clauseService';
import { getOrCreateActiveChangeSet } from './changeSetService';
import type { AISuggestion, AIPlan, PlanApplyResult } from '../types/aiPlan';
import type {
  GovernanceFields,
  GovernanceDecision,
  GovernanceReport,
  ProposalClauseRef,
} from '../types/governedProposal';
import type { OrgClause } from '../types/clause';

// ════════════════════════════════════════════════════════════════════════
// Load context for governance
// ════════════════════════════════════════════════════════════════════════

async function loadClauseMap(
  orgId: string,
): Promise<Map<string, { clause: OrgClause; latestText: string }>> {
  const clauses = await getClauses(orgId, { archived: false });
  const map = new Map<string, { clause: OrgClause; latestText: string }>();

  for (const clause of clauses) {
    let latestText = '';
    try {
      const versions = await getClauseVersions(orgId, clause.id, 'published');
      if (versions.length > 0) {
        latestText = versions[0].text || '';
      }
    } catch { /* gracefully degrade */ }
    map.set(clause.id, { clause, latestText });
  }

  return map;
}

// ════════════════════════════════════════════════════════════════════════
// Enrich a suggestion with governance fields
// ════════════════════════════════════════════════════════════════════════

/**
 * Compute and store governance fields for an existing AI suggestion.
 * This enriches the suggestion with impacted artifacts, diffs, and clause refs.
 */
export async function enrichWithGovernance(
  orgId: string,
  suggestionId: string,
): Promise<GovernanceFields> {
  // Load the suggestion
  const docRef = doc(db, orgAiSuggestionsPath(orgId), suggestionId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error(`Suggestion ${suggestionId} not found`);

  const suggestion = { id: snap.id, ...snap.data() } as AISuggestion;
  const plan = suggestion.plan;

  // Load context
  const [traceLinks, clauseMap] = await Promise.all([
    getAllTraceLinks(orgId),
    loadClauseMap(orgId),
  ]);

  // Ensure a Change Set exists
  const changeSet = await getOrCreateActiveChangeSet(orgId);
  if (!changeSet) throw new Error('Could not create or find an active Change Set');

  // Build governance fields
  const input: GovernanceInput = {
    plan,
    currentStates: new Map(), // Empty — diffs will show all proposed as "added"
    traceLinks,
    clauseMap,
    changeSetId: suggestion.changeSetId || changeSet.id,
    changeSetName: changeSet.name,
  };

  const governance = buildGovernanceFields(input);

  // Persist governance fields
  await updateDoc(docRef, { governance });

  return governance;
}

// ════════════════════════════════════════════════════════════════════════
// Read governed proposals
// ════════════════════════════════════════════════════════════════════════

/**
 * Get a suggestion with its governance fields.
 */
export async function getGovernedProposal(
  orgId: string,
  suggestionId: string,
): Promise<{ suggestion: AISuggestion; governance: GovernanceFields | null }> {
  const docRef = doc(db, orgAiSuggestionsPath(orgId), suggestionId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error(`Suggestion ${suggestionId} not found`);

  const suggestion = { id: snap.id, ...snap.data() } as AISuggestion;
  const governance = (suggestion as any).governance as GovernanceFields | undefined;
  return { suggestion, governance: governance || null };
}

/**
 * List all governed proposals (suggestions that have governance fields).
 */
export async function listGovernedProposals(
  orgId: string,
  limit?: number,
): Promise<Array<{ suggestion: AISuggestion; governance: GovernanceFields | null }>> {
  const suggestions = await listSuggestions(orgId, limit);
  return suggestions.map(s => ({
    suggestion: s,
    governance: (s as any).governance as GovernanceFields | null,
  }));
}

/**
 * Build a full governance report for display.
 */
export async function getGovernanceReport(
  orgId: string,
  suggestionId: string,
): Promise<GovernanceReport> {
  const { suggestion, governance } = await getGovernedProposal(orgId, suggestionId);
  if (!governance) throw new Error('Suggestion has no governance fields. Enrich it first.');

  return {
    suggestionId: suggestion.id,
    title: suggestion.plan.title,
    description: suggestion.plan.description,
    overallRationale: suggestion.plan.overallRationale,
    caveats: suggestion.plan.caveats,
    governance,
    createdAt: suggestion.createdAt?.toDate?.()?.toISOString?.() || '',
    createdBy: suggestion.createdBy,
    modelId: suggestion.modelId,
  };
}

// ════════════════════════════════════════════════════════════════════════
// Governance decisions
// ════════════════════════════════════════════════════════════════════════

/**
 * Record a governance decision on a proposal.
 */
export async function recordGovernanceDecision(
  orgId: string,
  suggestionId: string,
  decision: GovernanceDecision,
  userId: string,
  notes?: string,
): Promise<void> {
  const { suggestion, governance } = await getGovernedProposal(orgId, suggestionId);
  if (!governance) throw new Error('No governance fields on this suggestion');

  governance.decision = decision;
  governance.decisionNotes = notes;
  governance.reviewedBy = userId;
  governance.reviewedAt = new Date().toISOString();

  const docRef = doc(db, orgAiSuggestionsPath(orgId), suggestionId);
  await updateDoc(docRef, { governance });
}

// ════════════════════════════════════════════════════════════════════════
// Apply governed proposal (ONLY via Change Set)
// ════════════════════════════════════════════════════════════════════════

/**
 * Apply a governed proposal. This:
 *   1. Validates the governance decision is 'approved'
 *   2. Applies the plan via applyPlan (which creates drafts in a Change Set)
 *   3. Creates trace links from clause refs (if enabled)
 *   4. Updates impacted artifacts with proposed version IDs
 *
 * GUARDRAIL: Refuses to apply unless decision === 'approved'.
 */
export async function applyGovernedProposal(
  orgId: string,
  suggestionId: string,
  userId: string,
  selectedKeys?: string[],
): Promise<PlanApplyResult> {
  const { suggestion, governance } = await getGovernedProposal(orgId, suggestionId);
  if (!governance) throw new Error('No governance fields. Enrich first.');
  if (governance.decision !== 'approved') {
    throw new Error(
      `Cannot apply: governance decision is "${governance.decision}". Must be "approved".`
    );
  }

  // Apply the plan (creates drafts + adds to Change Set)
  const result = await applyPlan(orgId, suggestion.plan, userId, selectedKeys);

  // Update impacted artifacts with the created version IDs
  for (const applied of result.appliedItems) {
    const artifact = governance.impactedArtifacts.find(a => a.key === applied.artifactKey);
    if (artifact) {
      artifact.proposedVersionId = applied.versionId;
    }
  }

  // Create trace links from clause refs (if enabled)
  if (governance.createTraceLinks && governance.clauseRefs.length > 0) {
    for (const ref of governance.clauseRefs) {
      if (ref.existingTraceLinkId) continue; // Already has a trace link

      // Find the applied artifact to get the new version ID
      for (const artifactKey of ref.supportedArtifactKeys) {
        const applied = result.appliedItems.find(a => a.artifactKey === artifactKey);
        if (applied) {
          const targetTypeMap: Record<string, string> = {
            rule: 'rule_version',
            coverage: 'coverage_version',
            rateProgram: 'rate_program_version',
          };
          const targetType = targetTypeMap[applied.artifactType];
          if (targetType) {
            try {
              await createTraceLink(orgId, {
                clauseId: ref.clauseId,
                clauseVersionId: ref.clauseVersionId,
                targetType: targetType as any,
                ...(targetType === 'rule_version' ? { ruleVersionId: applied.versionId } : {}),
                ...(targetType === 'coverage_version' ? { coverageVersionId: applied.versionId } : {}),
                ...(targetType === 'rate_program_version' ? { rateProgramVersionId: applied.versionId } : {}),
                rationale: `AI proposal: ${ref.relevance}`,
                clauseName: ref.clauseName,
                clauseType: ref.clauseType,
                targetLabel: applied.name,
              }, userId);
            } catch {
              // Non-fatal — trace link creation failure shouldn't block apply
            }
          }
        }
      }
    }
  }

  // Persist updated governance fields
  governance.changeSetId = result.changeSetId;
  const docRef = doc(db, orgAiSuggestionsPath(orgId), suggestionId);
  await updateDoc(docRef, { governance });

  return result;
}
