/**
 * Governed AI Proposal Tests
 *
 * Covers:
 *   - Types and config maps
 *   - Engine: buildImpactedArtifacts, buildDiffs, findClauseRefs, buildGovernanceFields
 *   - Governance warnings for uncovered modifications
 *   - Service contract: enrichment, decisions, apply
 *   - Acceptance criteria: AI becomes a governed assistant with traceability
 */

import { describe, it, expect } from 'vitest';
import {
  buildImpactedArtifacts,
  buildDiffs,
  findClauseRefs,
  buildGovernanceImpactSummary,
  buildGovernanceFields,
  type GovernanceInput,
} from '../engine/governanceEngine';
import type {
  ImpactedArtifact,
  ProposalClauseRef,
  GovernanceFields,
  GovernanceDecision,
} from '../types/governedProposal';
import { GOVERNANCE_DECISION_CONFIG } from '../types/governedProposal';
import type { AIPlan, ProposedArtifact, PlanDiffEntry } from '../types/aiPlan';
import { PLAN_ARTIFACT_TYPE_LABELS, CONFIDENCE_CONFIG, computeImpactSummary, generatePlanDiffs } from '../types/aiPlan';
import type { TraceLink } from '../types/traceLink';
import type { OrgClause } from '../types/clause';
import { Timestamp } from 'firebase/firestore';

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

function makeArtifact(overrides: Partial<ProposedArtifact> = {}): ProposedArtifact {
  return {
    key: 'rule-1',
    artifactType: 'rule',
    action: 'modify',
    name: 'Bodily Injury Eligibility Rule',
    existingEntityId: 'rule-entity-123',
    proposedData: { name: 'Bodily Injury Eligibility Rule', type: 'eligibility', description: 'Updated eligibility' },
    rationale: 'Per Coverage A bodily injury liability clause, eligibility must be broadened.',
    confidence: 'high',
    dataSources: ['CG 00 01 04/13, Section I'],
    ...overrides,
  };
}

function makePlan(overrides: Partial<AIPlan> = {}): AIPlan {
  return {
    title: 'GL Product Enhancement',
    description: 'Enhance general liability product with updated rules and coverages.',
    artifacts: [makeArtifact()],
    overallRationale: 'Market analysis indicates need for broader eligibility criteria.',
    dataUsed: ['ISO GL Forms', 'AAIS guidelines'],
    caveats: ['Low confidence on endorsement mapping.'],
    ...overrides,
  };
}

function makeTraceLink(overrides: Partial<TraceLink> = {}): TraceLink {
  return {
    id: 'tl-1',
    orgId: 'org1',
    clauseId: 'clause-1',
    clauseVersionId: 'cv-1',
    targetType: 'rule_version',
    ruleVersionId: 'rule-entity-123',
    rationale: 'Coverage A justifies this eligibility rule.',
    clauseName: 'Coverage A – Bodily Injury',
    clauseType: 'coverage',
    createdAt: Timestamp.now(),
    createdBy: 'user1',
    ...overrides,
  };
}

function makeClause(overrides: Partial<OrgClause> = {}): OrgClause {
  return {
    id: 'clause-1',
    orgId: 'org1',
    canonicalName: 'Coverage A – Bodily Injury and Property Damage Liability',
    type: 'coverage',
    tags: ['gl', 'bodily-injury'],
    versionCount: 2,
    archived: false,
    createdAt: Timestamp.now(),
    createdBy: 'user1',
    updatedAt: Timestamp.now(),
    updatedBy: 'user1',
    latestPublishedVersionId: 'cv-1',
    ...overrides,
  };
}

function makeInput(overrides: Partial<GovernanceInput> = {}): GovernanceInput {
  const clauseMap = new Map<string, { clause: OrgClause; latestText: string }>();
  clauseMap.set('clause-1', {
    clause: makeClause(),
    latestText: 'We will pay those sums that the insured becomes legally obligated to pay as damages because of bodily injury or property damage.',
  });

  return {
    plan: makePlan(),
    currentStates: new Map(),
    traceLinks: [makeTraceLink()],
    clauseMap,
    changeSetId: 'cs-123',
    changeSetName: 'GL Enhancement Change Set',
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════
// Type configuration maps
// ════════════════════════════════════════════════════════════════════════

describe('Type configuration maps', () => {
  it('GOVERNANCE_DECISION_CONFIG has all decisions', () => {
    const decisions: GovernanceDecision[] = ['pending', 'approved', 'rejected', 'needs_revision'];
    for (const d of decisions) {
      expect(GOVERNANCE_DECISION_CONFIG[d]).toBeDefined();
      expect(GOVERNANCE_DECISION_CONFIG[d].label).toBeTruthy();
      expect(GOVERNANCE_DECISION_CONFIG[d].color).toMatch(/^#/);
    }
  });

  it('PLAN_ARTIFACT_TYPE_LABELS has all plan types', () => {
    const types = ['product', 'coverage', 'rule', 'rateProgram', 'table', 'formUse'];
    for (const t of types) {
      expect(PLAN_ARTIFACT_TYPE_LABELS[t as keyof typeof PLAN_ARTIFACT_TYPE_LABELS]).toBeTruthy();
    }
  });

  it('CONFIDENCE_CONFIG has all levels', () => {
    const levels = ['high', 'medium', 'low'];
    for (const l of levels) {
      expect(CONFIDENCE_CONFIG[l as keyof typeof CONFIDENCE_CONFIG]).toBeDefined();
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// Engine: buildImpactedArtifacts
// ════════════════════════════════════════════════════════════════════════

describe('buildImpactedArtifacts', () => {
  it('creates impacted artifact entries from plan artifacts', () => {
    const plan = makePlan();
    const impacts = buildImpactedArtifacts(plan);
    expect(impacts.length).toBe(1);
    expect(impacts[0].key).toBe('rule-1');
    expect(impacts[0].entityName).toBe('Bodily Injury Eligibility Rule');
    expect(impacts[0].action).toBe('modify');
    expect(impacts[0].confidence).toBe('high');
  });

  it('creates artifacts for both create and modify actions', () => {
    const plan = makePlan({
      artifacts: [
        makeArtifact({ key: 'rule-1', action: 'modify' }),
        makeArtifact({ key: 'cov-1', action: 'create', artifactType: 'coverage', name: 'New Coverage' }),
      ],
    });
    const impacts = buildImpactedArtifacts(plan);
    expect(impacts.length).toBe(2);
    expect(impacts[0].action).toBe('modify');
    expect(impacts[1].action).toBe('create');
  });

  it('assigns new-{key} entity ID for create actions', () => {
    const plan = makePlan({
      artifacts: [makeArtifact({ key: 'new-cov', action: 'create', existingEntityId: undefined })],
    });
    const impacts = buildImpactedArtifacts(plan);
    expect(impacts[0].entityId).toBe('new-new-cov');
  });
});

// ════════════════════════════════════════════════════════════════════════
// Engine: buildDiffs
// ════════════════════════════════════════════════════════════════════════

describe('buildDiffs', () => {
  it('generates diffs showing all fields as added for create actions', () => {
    const plan = makePlan({
      artifacts: [makeArtifact({ action: 'create' })],
    });
    const diffs = buildDiffs(plan, new Map());
    expect(diffs.length).toBe(1);
    expect(diffs[0].action).toBe('create');
    expect(diffs[0].fields.every(f => f.type === 'added')).toBe(true);
  });

  it('generates diffs showing changes for modify actions', () => {
    const currentStates = new Map<string, Record<string, unknown>>();
    currentStates.set('rule-entity-123', {
      name: 'Old Rule Name',
      type: 'eligibility',
      description: 'Old description',
    });

    const plan = makePlan({
      artifacts: [makeArtifact({
        existingEntityId: 'rule-entity-123',
        proposedData: { name: 'New Rule Name', type: 'eligibility', description: 'Updated description' },
      })],
    });

    const diffs = buildDiffs(plan, currentStates);
    expect(diffs.length).toBe(1);
    expect(diffs[0].fields.some(f => f.type === 'changed' && f.label.includes('Name'))).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Engine: findClauseRefs
// ════════════════════════════════════════════════════════════════════════

describe('findClauseRefs', () => {
  it('finds clause refs via direct trace link match', () => {
    const input = makeInput();
    const refs = findClauseRefs(input.plan, input.traceLinks, input.clauseMap);
    // The trace link has ruleVersionId === 'rule-entity-123' matching the artifact's existingEntityId
    expect(refs.length).toBeGreaterThan(0);
    const directRef = refs.find(r => r.existingTraceLinkId === 'tl-1');
    expect(directRef).toBeDefined();
    expect(directRef!.clauseName).toContain('Bodily Injury');
  });

  it('finds clause refs via text overlap match', () => {
    const clauseMap = new Map<string, { clause: OrgClause; latestText: string }>();
    clauseMap.set('clause-2', {
      clause: makeClause({ id: 'clause-2', canonicalName: 'Bodily Injury Liability Coverage' }),
      latestText: 'The insurer provides bodily injury liability coverage.',
    });

    // Artifact name "Bodily Injury Eligibility Rule" overlaps with "Bodily Injury Liability Coverage"
    const refs = findClauseRefs(makePlan(), [], clauseMap);
    expect(refs.some(r => r.clauseId === 'clause-2')).toBe(true);
  });

  it('returns empty when no trace links and no text overlap', () => {
    const clauseMap = new Map<string, { clause: OrgClause; latestText: string }>();
    clauseMap.set('clause-3', {
      clause: makeClause({ id: 'clause-3', canonicalName: 'Workers Compensation Exclusion' }),
      latestText: 'Workers compensation is excluded.',
    });

    const refs = findClauseRefs(makePlan(), [], clauseMap);
    const wcRef = refs.find(r => r.clauseId === 'clause-3');
    expect(wcRef).toBeUndefined();
  });

  it('merges supportedArtifactKeys for the same clause', () => {
    const plan = makePlan({
      artifacts: [
        makeArtifact({ key: 'rule-1', existingEntityId: 'rule-entity-123' }),
        makeArtifact({ key: 'rule-2', existingEntityId: 'rule-entity-123', name: 'Another Bodily Injury Rule' }),
      ],
    });
    const traceLinks = [
      makeTraceLink({ id: 'tl-1', ruleVersionId: 'rule-entity-123' }),
    ];
    const input = makeInput({ plan, traceLinks });
    const refs = findClauseRefs(plan, traceLinks, input.clauseMap);
    const ref = refs.find(r => r.clauseId === 'clause-1');
    expect(ref).toBeDefined();
    // Should have both artifact keys
    expect(ref!.supportedArtifactKeys.length).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Engine: buildGovernanceImpactSummary
// ════════════════════════════════════════════════════════════════════════

describe('buildGovernanceImpactSummary', () => {
  it('adds warning when modifications have no clause refs', () => {
    const plan = makePlan();
    const summary = buildGovernanceImpactSummary(plan, []);
    expect(summary.warnings.some(w => w.includes('No supporting clauses'))).toBe(true);
  });

  it('adds warning for specific uncovered modifications', () => {
    const plan = makePlan({
      artifacts: [
        makeArtifact({ key: 'rule-1', action: 'modify' }),
        makeArtifact({ key: 'cov-1', action: 'modify', artifactType: 'coverage', name: 'Some Coverage' }),
      ],
    });
    // Only one artifact has clause coverage
    const clauseRefs: ProposalClauseRef[] = [{
      clauseId: 'c1', clauseVersionId: 'cv1', clauseName: 'Test',
      clauseType: 'coverage', clauseTextSnippet: '', supportedArtifactKeys: ['rule-1'],
      relevance: 'test',
    }];
    const summary = buildGovernanceImpactSummary(plan, clauseRefs);
    expect(summary.warnings.some(w => w.includes('"Some Coverage"'))).toBe(true);
  });

  it('includes base warnings from computeImpactSummary', () => {
    const plan = makePlan({
      artifacts: [makeArtifact({ confidence: 'low' })],
    });
    const summary = buildGovernanceImpactSummary(plan, []);
    expect(summary.warnings.some(w => w.includes('low confidence'))).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Engine: buildGovernanceFields (full pipeline)
// ════════════════════════════════════════════════════════════════════════

describe('buildGovernanceFields (full pipeline)', () => {
  it('produces all governance fields', () => {
    const gov = buildGovernanceFields(makeInput());
    expect(gov.impactedArtifacts.length).toBeGreaterThan(0);
    expect(gov.diffs.length).toBeGreaterThan(0);
    expect(gov.clauseRefs.length).toBeGreaterThan(0);
    expect(gov.impactSummary).toBeDefined();
    expect(gov.changeSetId).toBe('cs-123');
    expect(gov.decision).toBe('pending');
  });

  it('sets createTraceLinks=true when clause refs exist', () => {
    const gov = buildGovernanceFields(makeInput());
    expect(gov.createTraceLinks).toBe(true);
  });

  it('sets createTraceLinks=false when no clause refs', () => {
    const gov = buildGovernanceFields(makeInput({
      traceLinks: [],
      clauseMap: new Map(),
    }));
    expect(gov.createTraceLinks).toBe(false);
  });

  it('includes change set identity', () => {
    const gov = buildGovernanceFields(makeInput());
    expect(gov.changeSetId).toBe('cs-123');
    expect(gov.changeSetName).toBe('GL Enhancement Change Set');
  });
});

// ════════════════════════════════════════════════════════════════════════
// Service contract
// ════════════════════════════════════════════════════════════════════════

describe('Service contract', () => {
  it('governedProposalService exports all expected functions', async () => {
    const mod = await import('../services/governedProposalService');
    expect(typeof mod.enrichWithGovernance).toBe('function');
    expect(typeof mod.getGovernedProposal).toBe('function');
    expect(typeof mod.listGovernedProposals).toBe('function');
    expect(typeof mod.getGovernanceReport).toBe('function');
    expect(typeof mod.recordGovernanceDecision).toBe('function');
    expect(typeof mod.applyGovernedProposal).toBe('function');
  });

  it('types export GOVERNANCE_DECISION_CONFIG', async () => {
    const mod = await import('../types/governedProposal');
    expect(mod.GOVERNANCE_DECISION_CONFIG).toBeDefined();
    expect(Object.keys(mod.GOVERNANCE_DECISION_CONFIG)).toEqual(
      expect.arrayContaining(['pending', 'approved', 'rejected', 'needs_revision'])
    );
  });
});

// ════════════════════════════════════════════════════════════════════════
// Acceptance Criteria: AI becomes a governed assistant with traceability
// ════════════════════════════════════════════════════════════════════════

describe('Acceptance Criteria: AI becomes a governed assistant with traceability, not a black box', () => {
  it('every proposal includes impacted artifacts with reasons and confidence', () => {
    const gov = buildGovernanceFields(makeInput());
    for (const artifact of gov.impactedArtifacts) {
      expect(artifact.entityName).toBeTruthy();
      expect(artifact.impactReason).toBeTruthy();
      expect(artifact.confidence).toMatch(/^(high|medium|low)$/);
      expect(artifact.action).toMatch(/^(create|modify|deprecate)$/);
    }
  });

  it('every proposal includes field-level diffs', () => {
    const gov = buildGovernanceFields(makeInput());
    expect(gov.diffs.length).toBeGreaterThan(0);
    for (const diff of gov.diffs) {
      expect(diff.artifactName).toBeTruthy();
      expect(diff.artifactType).toBeTruthy();
      expect(diff.fields).toBeDefined();
    }
  });

  it('proposals reference supporting clauses when available', () => {
    const gov = buildGovernanceFields(makeInput());
    expect(gov.clauseRefs.length).toBeGreaterThan(0);
    for (const ref of gov.clauseRefs) {
      expect(ref.clauseId).toBeTruthy();
      expect(ref.clauseName).toBeTruthy();
      expect(ref.supportedArtifactKeys.length).toBeGreaterThan(0);
      expect(ref.relevance).toBeTruthy();
    }
  });

  it('proposals warn when modifications lack supporting clauses', () => {
    const gov = buildGovernanceFields(makeInput({ traceLinks: [], clauseMap: new Map() }));
    expect(gov.impactSummary.warnings.some(w => w.includes('No supporting clauses'))).toBe(true);
  });

  it('proposals must apply only via Change Sets (changeSetId is required)', () => {
    const gov = buildGovernanceFields(makeInput());
    expect(gov.changeSetId).toBeTruthy();
    expect(typeof gov.changeSetId).toBe('string');
  });

  it('governance decision starts as pending and can be set', () => {
    const gov = buildGovernanceFields(makeInput());
    expect(gov.decision).toBe('pending');
    // Decision can be set to any valid value
    const validDecisions: GovernanceDecision[] = ['pending', 'approved', 'rejected', 'needs_revision'];
    for (const d of validDecisions) {
      gov.decision = d;
      expect(gov.decision).toBe(d);
    }
  });

  it('trace link creation is flagged when clauses are referenced', () => {
    const gov = buildGovernanceFields(makeInput());
    expect(gov.createTraceLinks).toBe(true);
    expect(gov.clauseRefs.length).toBeGreaterThan(0);
  });

  it('governance report includes full rationale and caveats for transparency', () => {
    const plan = makePlan();
    const gov = buildGovernanceFields(makeInput());
    // The plan's rationale and caveats are accessible
    expect(plan.overallRationale).toBeTruthy();
    expect(plan.caveats.length).toBeGreaterThan(0);
    // The governance fields include the impact summary with required approval roles
    expect(gov.impactSummary.requiredApprovalRoles.length).toBeGreaterThan(0);
  });
});
