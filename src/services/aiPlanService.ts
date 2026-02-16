/**
 * AI Plan Service
 *
 * Orchestrates the generate → validate → preview → apply lifecycle.
 *
 * GUARDRAIL: AI never writes directly to published artifacts.
 * All writes create draft versions inside an active Change Set.
 *
 * Paths:
 *   orgs/{orgId}/aiSuggestions/{suggestionId}
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  Timestamp,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { orgAiSuggestionsPath } from '../repositories/paths';
import { getOrCreateActiveChangeSet, addItemToChangeSet } from './changeSetService';
import { versioningService } from './versioningService';
import type {
  AIPlan,
  AISuggestion,
  ProposedArtifact,
  PlanApplyResult,
  AppliedItem,
  PlanDiffEntry,
  PlanImpactSummary,
  SuggestionOutcome,
} from '../types/aiPlan';
import {
  validateAIPlan,
  computeImpactSummary,
  generatePlanDiffs,
} from '../types/aiPlan';
import type { VersionedEntityType } from '../types/versioning';
import logger, { LOG_CATEGORIES } from '../utils/logger';

// ============================================================================
// Generate a structured plan from user prompt
// ============================================================================

const PLAN_SYSTEM_PROMPT = `You are an expert P&C insurance product architect. The user will describe what they want to build or modify. You must respond with a JSON object matching the AIPlan schema.

RESPONSE SCHEMA (respond ONLY with valid JSON, no markdown):
{
  "title": "string — short title for the plan",
  "description": "string — 1-2 sentence overview",
  "artifacts": [
    {
      "key": "string — unique key like 'product-1' or 'coverage-gl-1'",
      "artifactType": "product | coverage | rule | rateProgram | table | formUse",
      "action": "create | modify",
      "name": "string — human-readable name",
      "existingEntityId": "string | omit — required for modify",
      "parentEntityId": "string | omit — e.g. productId for coverage",
      "proposedData": { /* type-specific fields */ },
      "rationale": "string — why this artifact is proposed",
      "confidence": "high | medium | low",
      "dataSources": ["string — what data informed this"]
    }
  ],
  "overallRationale": "string — why this plan as a whole",
  "dataUsed": ["string — data sources"],
  "caveats": ["string — risks or open questions"]
}

PROPOSEDDATA SHAPES BY TYPE:
- product: { name, description, category, states[], effectiveStart, effectiveEnd }
- coverage: { name, description, coverageCode, category, isOptional, limits[{label,amount}], deductibles[{label,amount}] }
- rule: { name, type: eligibility|referral|validation, description, conditions, outcome }
- rateProgram: { name, description, lineOfBusiness, steps[{name,type,description}] }
- table: { name, description, dimensions[{name,values[]}] }
- formUse: { formId, formVersionId, formNumber, formTitle, useType: base|endorsement|notice|condition, stateCode }

RULES:
- Every artifact MUST have a rationale and confidence.
- For "modify", you MUST include existingEntityId.
- Coverage artifacts referencing a product MUST include parentEntityId.
- Generate meaningful, unique keys.
- Suggest industry-standard names and structures.
- Be conservative with confidence — use "medium" or "low" when uncertain.`;

/**
 * Call the AI to generate a structured plan from a user prompt.
 */
export async function generatePlan(
  userPrompt: string,
  contextString: string,
): Promise<{ plan: AIPlan; requestId: string; latencyMs: number; modelId: string; tokenUsage?: { prompt: number; completion: number; total: number } }> {
  const startTime = Date.now();
  const requestId = `aip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const generateChat = httpsCallable(functions, 'generateChatResponse');

  const result = await Promise.race([
    generateChat({
      messages: [
        { role: 'system', content: PLAN_SYSTEM_PROMPT },
        { role: 'system', content: `DATABASE CONTEXT:\n${contextString}` },
        { role: 'user', content: userPrompt },
      ],
      model: 'gpt-4o-mini',
      maxTokens: 4000,
      temperature: 0.4,
    }) as Promise<{ data: { success: boolean; content?: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } } }>,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Plan generation timed out after 90 seconds')), 90000)
    ),
  ]);

  if (!result.data.success || !result.data.content) {
    throw new Error('AI returned an unsuccessful or empty response');
  }

  const latencyMs = Date.now() - startTime;

  // Parse JSON from response (may be wrapped in markdown code blocks)
  let parsed: unknown;
  try {
    const raw = result.data.content.trim();
    // Strip markdown code fences if present
    const jsonStr = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    parsed = JSON.parse(jsonStr);
  } catch {
    // Try extracting JSON object from the response
    const match = result.data.content.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error('Could not parse AI response as JSON');
    }
  }

  const plan = parsed as AIPlan;
  const tokenUsage = result.data.usage ? {
    prompt: result.data.usage.prompt_tokens,
    completion: result.data.usage.completion_tokens,
    total: result.data.usage.total_tokens,
  } : undefined;

  // Validate
  const validation = validateAIPlan(plan);
  if (!validation.valid) {
    logger.warn(LOG_CATEGORIES.AI, 'AI plan validation warnings', { errors: validation.errors, requestId });
    // Don't throw — return the plan with validation issues for UI display
  }

  logger.info(LOG_CATEGORIES.AI, 'AI plan generated', {
    requestId,
    latencyMs,
    artifactCount: plan.artifacts?.length || 0,
    title: plan.title,
  });

  return { plan, requestId, latencyMs, modelId: 'gpt-4o-mini', tokenUsage };
}

// ============================================================================
// Preview (diffs + impact)
// ============================================================================

/**
 * Generate preview data for a plan: impact summary + diffs.
 */
export function previewPlan(plan: AIPlan): {
  impact: PlanImpactSummary;
  diffs: PlanDiffEntry[];
  validation: { valid: boolean; errors: string[] };
} {
  const validation = validateAIPlan(plan);
  const impact = computeImpactSummary(plan);
  const diffs = generatePlanDiffs(plan);
  return { impact, diffs, validation };
}

// ============================================================================
// Apply — create draft versions + add to Change Set
// ============================================================================

/**
 * Apply an AI plan by creating draft versions and adding them to the
 * active Change Set.
 *
 * GUARDRAIL: Only creates drafts. Never touches published artifacts.
 */
export async function applyPlan(
  orgId: string,
  plan: AIPlan,
  userId: string,
  selectedKeys?: string[],
): Promise<PlanApplyResult> {
  const errors: string[] = [];
  const appliedItems: AppliedItem[] = [];

  // 1. Ensure we have an active Change Set
  const changeSet = await getOrCreateActiveChangeSet(orgId);
  if (!changeSet) {
    return { success: false, appliedItems: [], changeSetId: '', errors: ['Could not create or find an active Change Set'], suggestionId: '' };
  }

  // 2. Filter artifacts if selectedKeys provided
  const artifactsToApply = selectedKeys
    ? plan.artifacts.filter(a => selectedKeys.includes(a.key))
    : plan.artifacts;

  // 3. Apply each artifact
  for (const artifact of artifactsToApply) {
    try {
      const result = await applyArtifact(orgId, artifact, userId);
      appliedItems.push(result);

      // 4. Add to Change Set
      const artifactType = mapPlanTypeToVersionedType(artifact.artifactType);
      if (artifactType) {
        await addItemToChangeSet(orgId, changeSet.id, {
          artifactType,
          artifactId: result.entityId,
          artifactName: result.name,
          versionId: result.versionId,
          action: artifact.action === 'create' ? 'create' : 'update',
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Failed to apply "${artifact.name}": ${msg}`);
      logger.error(LOG_CATEGORIES.AI, `Failed to apply artifact ${artifact.key}`, {}, err as Error);
    }
  }

  // 5. Store suggestion record
  const suggestionId = await storeSuggestion(orgId, plan, userId, changeSet.id, appliedItems, selectedKeys);

  logger.info(LOG_CATEGORIES.AI, 'AI plan applied', {
    changeSetId: changeSet.id,
    appliedCount: appliedItems.length,
    errorCount: errors.length,
    suggestionId,
  });

  return {
    success: errors.length === 0,
    appliedItems,
    changeSetId: changeSet.id,
    errors,
    suggestionId,
  };
}

/**
 * Apply a single artifact by creating a draft version via the versioning service.
 */
async function applyArtifact(
  orgId: string,
  artifact: ProposedArtifact,
  userId: string,
): Promise<AppliedItem> {
  const { artifactType, action, name, existingEntityId, parentEntityId, proposedData } = artifact;

  // For formUse, we don't create versions — we create the junction record
  if (artifactType === 'formUse') {
    // Import dynamically to avoid circular dependencies
    const { createFormUse } = await import('./formService');
    const useId = await createFormUse(orgId, {
      formId: (proposedData.formId as string) || '',
      formVersionId: (proposedData.formVersionId as string) || '',
      productVersionId: parentEntityId || '',
      useType: (proposedData.useType as 'base' | 'endorsement' | 'notice' | 'condition') || 'base',
      stateCode: proposedData.stateCode as string | undefined,
      formNumber: proposedData.formNumber as string | undefined,
      formTitle: proposedData.formTitle as string | undefined,
    }, userId);

    return {
      artifactKey: artifact.key,
      artifactType,
      action,
      entityId: useId,
      versionId: useId, // formUse has no version subcollection
      name,
    };
  }

  // For all versioned types, use the versioning service
  const entityType = mapPlanTypeToVersionedType(artifactType)!;

  if (action === 'create') {
    // Create the parent entity first, then create a draft version
    // For simplicity, we use the versioning service which expects an entityId
    // We'll create a placeholder entity ID that the version references
    const entityRef = doc(collection(db, getEntityCollectionPath(orgId, entityType, parentEntityId)));
    const now = Timestamp.now();

    // Create the parent entity document
    await import('firebase/firestore').then(({ setDoc }) =>
      setDoc(entityRef, {
        orgId,
        name: proposedData.name || name,
        description: proposedData.description || '',
        category: proposedData.category || '',
        archived: false,
        versionCount: 0,
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
        updatedBy: userId,
        ...(entityType === 'coverage' && parentEntityId ? { productId: parentEntityId } : {}),
      })
    );

    // Create a draft version
    const version = await versioningService.createVersion({
      orgId,
      entityType,
      entityId: entityRef.id,
      data: proposedData,
      userId,
      summary: `AI-generated: ${name}`,
      effectiveStart: proposedData.effectiveStart as string | undefined,
      effectiveEnd: proposedData.effectiveEnd as string | undefined,
    }, parentEntityId);

    return {
      artifactKey: artifact.key,
      artifactType,
      action,
      entityId: entityRef.id,
      versionId: version.id,
      name,
    };
  } else {
    // Modify: clone the latest version to create a new draft with proposed changes
    if (!existingEntityId) throw new Error('existingEntityId is required for modify action');

    const latestVersion = await versioningService.getLatestVersion(
      orgId, entityType, existingEntityId, parentEntityId
    );

    if (latestVersion) {
      // Clone and update
      const cloned = await versioningService.cloneVersion({
        orgId,
        entityType,
        entityId: existingEntityId,
        sourceVersionId: latestVersion.id,
        userId,
        summary: `AI-modified: ${name}`,
      }, parentEntityId);

      // Apply proposed changes on top
      await versioningService.updateVersion({
        orgId,
        entityType,
        entityId: existingEntityId,
        versionId: cloned.id,
        data: proposedData as Record<string, unknown>,
        userId,
      }, parentEntityId);

      return {
        artifactKey: artifact.key,
        artifactType,
        action,
        entityId: existingEntityId,
        versionId: cloned.id,
        name,
      };
    } else {
      // No existing version found — create fresh
      const version = await versioningService.createVersion({
        orgId,
        entityType,
        entityId: existingEntityId,
        data: proposedData,
        userId,
        summary: `AI-modified: ${name}`,
      }, parentEntityId);

      return {
        artifactKey: artifact.key,
        artifactType,
        action,
        entityId: existingEntityId,
        versionId: version.id,
        name,
      };
    }
  }
}

// ============================================================================
// Store / Manage Suggestion Records
// ============================================================================

async function storeSuggestion(
  orgId: string,
  plan: AIPlan,
  userId: string,
  changeSetId: string,
  appliedItems: AppliedItem[],
  selectedKeys?: string[],
): Promise<string> {
  const colRef = collection(db, orgAiSuggestionsPath(orgId));
  const outcome: SuggestionOutcome = selectedKeys
    ? (selectedKeys.length < plan.artifacts.length ? 'partially_accepted' : 'accepted')
    : 'accepted';

  const docRef = await addDoc(colRef, {
    orgId,
    userPrompt: plan.title,
    plan,
    outcome,
    appliedArtifactKeys: appliedItems.map(i => i.artifactKey),
    changeSetId,
    modelId: 'gpt-4o-mini',
    requestId: `apply-${Date.now()}`,
    latencyMs: 0,
    createdAt: Timestamp.now(),
    createdBy: userId,
    resolvedAt: Timestamp.now(),
    resolvedBy: userId,
  });

  return docRef.id;
}

/**
 * Record a rejection of a plan.
 */
export async function rejectPlan(
  orgId: string,
  plan: AIPlan,
  userPrompt: string,
  userId: string,
  requestId: string,
  latencyMs: number,
  reason?: string,
): Promise<string> {
  const colRef = collection(db, orgAiSuggestionsPath(orgId));
  const docRef = await addDoc(colRef, {
    orgId,
    userPrompt,
    plan,
    outcome: 'rejected' as SuggestionOutcome,
    rejectionReason: reason || 'User rejected plan',
    modelId: 'gpt-4o-mini',
    requestId,
    latencyMs,
    createdAt: Timestamp.now(),
    createdBy: userId,
    resolvedAt: Timestamp.now(),
    resolvedBy: userId,
  });
  return docRef.id;
}

/**
 * List stored suggestions.
 */
export async function listSuggestions(
  orgId: string,
  limit?: number,
): Promise<AISuggestion[]> {
  const colRef = collection(db, orgAiSuggestionsPath(orgId));
  let q = query(colRef, orderBy('createdAt', 'desc'));
  if (limit) {
    q = query(colRef, orderBy('createdAt', 'desc'), firestoreLimit(limit));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AISuggestion));
}

// ============================================================================
// Helpers
// ============================================================================

function mapPlanTypeToVersionedType(planType: string): VersionedEntityType | null {
  const map: Record<string, VersionedEntityType> = {
    product: 'product',
    coverage: 'coverage',
    rule: 'rule',
    rateProgram: 'rateProgram',
    table: 'table',
  };
  return map[planType] || null;
}

function getEntityCollectionPath(orgId: string, entityType: VersionedEntityType, parentId?: string): string {
  switch (entityType) {
    case 'product': return `orgs/${orgId}/products`;
    case 'coverage':
      if (!parentId) throw new Error('Coverage requires parentId');
      return `orgs/${orgId}/products/${parentId}/coverages`;
    case 'rule': return `orgs/${orgId}/rules`;
    case 'rateProgram': return `orgs/${orgId}/ratePrograms`;
    case 'table': return `orgs/${orgId}/tables`;
    default: return `orgs/${orgId}/${entityType}s`;
  }
}

// Exported for testing
export { mapPlanTypeToVersionedType, getEntityCollectionPath };
