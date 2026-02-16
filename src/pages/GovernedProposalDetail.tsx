/**
 * GovernedProposalDetail – /ai-proposals/:suggestionId
 *
 * AI proposal review page with full traceability:
 *   - Impacted artifacts list
 *   - Field-level diffs (before/after)
 *   - Supporting clause references
 *   - Impact summary with governance warnings
 *   - Decision controls (approve/reject/needs revision)
 *   - Apply via Change Set (only when approved)
 *
 * GUARDRAIL: AI becomes a governed assistant with traceability, not a black box.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import {
  color, neutral, accent, space, radius, shadow, fontFamily,
  type as T, border, semantic,
} from '../ui/tokens';
import { useRoleContext } from '../context/RoleContext';
import {
  getGovernedProposal,
  enrichWithGovernance,
  recordGovernanceDecision,
  applyGovernedProposal,
} from '../services/governedProposalService';
import type { AISuggestion } from '../types/aiPlan';
import { PLAN_ARTIFACT_TYPE_LABELS, CONFIDENCE_CONFIG } from '../types/aiPlan';
import type { GovernanceFields, GovernanceDecision } from '../types/governedProposal';
import { GOVERNANCE_DECISION_CONFIG } from '../types/governedProposal';
import { CLAUSE_TYPE_CONFIG } from '../types/clause';
import MainNavigation from '../components/ui/Navigation';

// ════════════════════════════════════════════════════════════════════════
// Styled Components
// ════════════════════════════════════════════════════════════════════════

const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}`;

const Page = styled.main`
  min-height: 100vh;
  background: linear-gradient(160deg, ${neutral[50]} 0%, ${neutral[100]} 50%, ${neutral[50]} 100%);
  padding: ${space[8]} ${space[6]} ${space[16]};
`;
const Container = styled.div`max-width: 1200px; margin: 0 auto; animation: ${fadeIn} 0.3s ease;`;

const BackLink = styled.button`
  display: inline-flex; align-items: center; gap: ${space[1]};
  font-size: ${T.caption.size}; color: ${color.textSecondary};
  background: none; border: none; cursor: pointer; margin-bottom: ${space[4]};
  &:hover { color: ${accent[600]}; }
`;

const Header = styled.div`margin-bottom: ${space[6]};`;
const Title = styled.h1`
  font-family: ${fontFamily.sans}; font-size: ${T.displaySm.size};
  font-weight: 700; color: ${color.text}; margin: 0 0 ${space[1]};
`;
const Subtitle = styled.p`
  font-size: ${T.bodyMd.size}; color: ${color.textSecondary}; margin: 0;
`;

const TwoCol = styled.div`
  display: grid; grid-template-columns: 1fr 380px; gap: ${space[5]};
  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`;

const Panel = styled.section`
  background: ${color.bg}; border: ${border.default}; border-radius: ${radius.lg};
  box-shadow: ${shadow.card}; overflow: hidden; margin-bottom: ${space[5]};
`;
const PanelHeader = styled.div`
  padding: ${space[4]} ${space[5]}; border-bottom: ${border.light};
  display: flex; align-items: center; justify-content: space-between;
`;
const PanelTitle = styled.h2`
  font-family: ${fontFamily.sans}; font-size: ${T.headingSm.size};
  font-weight: ${T.headingSm.weight}; color: ${color.text}; margin: 0;
`;
const PanelBody = styled.div`padding: ${space[4]} ${space[5]};`;

/* Badges */
const Badge = styled.span<{ $color: string }>`
  padding: 1px ${space[2]}; font-size: 10px; font-weight: 600;
  color: ${p => p.$color}; background: ${p => `${p.$color}14`};
  border: 1px solid ${p => `${p.$color}30`}; border-radius: 999px;
`;

/* Impacted artifact card */
const ArtifactCard = styled.div`
  border: ${border.default}; border-radius: ${radius.md}; padding: ${space[3]};
  margin-bottom: ${space[2]}; background: ${color.bgSubtle};
`;
const ArtifactRow = styled.div`display: flex; align-items: center; gap: ${space[2]}; margin-bottom: ${space[1]};`;
const ArtifactName = styled.span`font-size: ${T.bodySm.size}; font-weight: 600; color: ${color.text};`;
const ArtifactReason = styled.p`font-size: ${T.caption.size}; color: ${color.textSecondary}; margin: 0;`;

/* Diff */
const DiffCard = styled.div`
  border: ${border.default}; border-radius: ${radius.md}; padding: ${space[3]};
  margin-bottom: ${space[2]}; background: ${color.bgSubtle};
`;
const DiffHeader = styled.div`display: flex; align-items: center; gap: ${space[2]}; margin-bottom: ${space[2]};`;
const DiffRow = styled.div<{ $type: string }>`
  display: flex; gap: ${space[2]}; padding: 3px ${space[2]}; border-radius: ${radius.sm};
  font-size: 12px; font-family: ${fontFamily.mono}; margin-bottom: 2px;
  background: ${p => p.$type === 'added' ? '#f0fdf4' : p.$type === 'removed' ? '#fef2f2' : '#eff6ff'};
  color: ${p => p.$type === 'added' ? '#166534' : p.$type === 'removed' ? '#991b1b' : '#1e40af'};
`;
const DiffLabel = styled.span`min-width: 120px; font-weight: 500;`;
const DiffValue = styled.span`flex: 1; word-break: break-word;`;

/* Clause ref */
const ClauseCard = styled.div`
  border: ${border.default}; border-radius: ${radius.md}; padding: ${space[3]};
  margin-bottom: ${space[2]}; background: ${accent[50]}; border-color: ${accent[200]};
`;
const ClauseSnippet = styled.p`
  font-size: 11px; color: ${color.textMuted}; font-style: italic; margin: ${space[1]} 0 0;
  max-height: 60px; overflow-y: auto;
`;

/* Warning */
const Warning = styled.div`
  padding: ${space[2]} ${space[3]}; background: #fffbeb; border: 1px solid #fde68a;
  border-radius: ${radius.sm}; font-size: ${T.captionSm.size}; color: '#92400e';
  margin-bottom: ${space[2]};
`;

/* Decision controls */
const DecisionGroup = styled.div`
  display: flex; gap: ${space[2]}; flex-wrap: wrap; margin-top: ${space[3]};
`;
const DecisionBtn = styled.button<{ $variant: string }>`
  padding: ${space[2]} ${space[4]}; font-family: ${fontFamily.sans};
  font-size: ${T.label.size}; font-weight: 600; border-radius: ${radius.sm};
  border: none; cursor: pointer; color: white;
  background: ${p =>
    p.$variant === 'approve' ? '#059669' :
    p.$variant === 'reject' ? '#dc2626' :
    '#d97706'};
  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ApplyBtn = styled.button`
  width: 100%; padding: ${space[3]} ${space[5]}; font-family: ${fontFamily.sans};
  font-size: ${T.label.size}; font-weight: 600; color: white;
  background: ${accent[600]}; border: none; border-radius: ${radius.sm};
  cursor: pointer; margin-top: ${space[3]};
  &:hover { background: ${accent[700]}; }
  &:disabled { background: ${neutral[300]}; cursor: not-allowed; }
`;

const Spinner = styled.div`padding: ${space[10]}; text-align: center; color: ${color.textMuted};`;

const MetaRow = styled.div`
  display: flex; gap: ${space[4]}; flex-wrap: wrap; margin-bottom: ${space[4]};
  font-size: ${T.captionSm.size}; color: ${color.textSecondary};
`;

const ChangeSetLink = styled.button`
  display: flex; align-items: center; gap: ${space[2]};
  padding: ${space[2]} ${space[3]}; background: ${color.bgSubtle};
  border: ${border.default}; border-radius: ${radius.sm};
  font-size: ${T.bodySm.size}; font-weight: 500; color: ${accent[600]};
  cursor: pointer; width: 100%;
  &:hover { background: ${accent[50]}; border-color: ${accent[300]}; }
`;

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

const GovernedProposalDetail: React.FC = () => {
  const { suggestionId } = useParams<{ suggestionId: string }>();
  const navigate = useNavigate();
  const { currentOrgId, user } = useRoleContext();

  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [governance, setGovernance] = useState<GovernanceFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrgId || !suggestionId) return;
    (async () => {
      setLoading(true);
      try {
        const { suggestion: s, governance: g } = await getGovernedProposal(currentOrgId, suggestionId);
        setSuggestion(s);
        setGovernance(g);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      }
      setLoading(false);
    })();
  }, [currentOrgId, suggestionId]);

  const handleEnrich = useCallback(async () => {
    if (!currentOrgId || !suggestionId) return;
    setEnriching(true);
    try {
      const g = await enrichWithGovernance(currentOrgId, suggestionId);
      setGovernance(g);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to enrich');
    }
    setEnriching(false);
  }, [currentOrgId, suggestionId]);

  const handleDecision = useCallback(async (decision: GovernanceDecision) => {
    if (!currentOrgId || !suggestionId || !user?.uid) return;
    const notes = decision === 'rejected'
      ? prompt('Rejection reason:') || ''
      : decision === 'needs_revision'
        ? prompt('What needs revision?') || ''
        : '';
    try {
      await recordGovernanceDecision(currentOrgId, suggestionId, decision, user.uid, notes);
      const { governance: g } = await getGovernedProposal(currentOrgId, suggestionId);
      setGovernance(g);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Decision failed');
    }
  }, [currentOrgId, suggestionId, user]);

  const handleApply = useCallback(async () => {
    if (!currentOrgId || !suggestionId || !user?.uid) return;
    setApplying(true);
    setError(null);
    try {
      const result = await applyGovernedProposal(currentOrgId, suggestionId, user.uid);
      if (result.success) {
        navigate(`/changesets/${result.changeSetId}`);
      } else {
        setError(`Apply partially failed: ${result.errors.join(', ')}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Apply failed');
    }
    setApplying(false);
  }, [currentOrgId, suggestionId, user, navigate]);

  if (loading) return <Page><Spinner>Loading proposal...</Spinner></Page>;
  if (!suggestion) return <Page><Spinner>Proposal not found.</Spinner></Page>;

  const plan = suggestion.plan;
  const gov = governance;
  const decisionCfg = gov ? GOVERNANCE_DECISION_CONFIG[gov.decision] : null;

  return (
    <Page id="main-content">
      <MainNavigation />
      <Container>
        <BackLink onClick={() => navigate('/ai-builder/plan')}>&larr; Back to AI Builder</BackLink>

        <Header>
          <Title>{plan.title}</Title>
          <Subtitle>{plan.description}</Subtitle>
        </Header>

        <MetaRow>
          <span>Model: {suggestion.modelId}</span>
          <span>Artifacts: {plan.artifacts.length}</span>
          <span>Outcome: {suggestion.outcome}</span>
          {gov && <Badge $color={decisionCfg?.color || neutral[400]}>{decisionCfg?.label || 'Unknown'}</Badge>}
        </MetaRow>

        {error && (
          <Warning>{error}
            <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Dismiss
            </button>
          </Warning>
        )}

        {/* Not yet enriched */}
        {!gov && (
          <Panel>
            <PanelBody style={{ textAlign: 'center', padding: space[8] }}>
              <p style={{ color: color.textMuted, marginBottom: space[4] }}>
                This proposal has not been enriched with governance data. Enriching will analyze
                impacted artifacts, generate diffs, find supporting clauses, and prepare it for governed review.
              </p>
              <DecisionBtn $variant="approve" onClick={handleEnrich} disabled={enriching}>
                {enriching ? 'Analyzing...' : 'Enrich with Governance Data'}
              </DecisionBtn>
            </PanelBody>
          </Panel>
        )}

        {/* Governed content */}
        {gov && (
          <TwoCol>
            {/* Left: Artifacts + Diffs */}
            <div>
              {/* Impacted Artifacts */}
              <Panel>
                <PanelHeader>
                  <PanelTitle>Impacted Artifacts ({gov.impactedArtifacts.length})</PanelTitle>
                </PanelHeader>
                <PanelBody>
                  {gov.impactedArtifacts.map(a => {
                    const typeCfg = PLAN_ARTIFACT_TYPE_LABELS[a.artifactType];
                    const confCfg = CONFIDENCE_CONFIG[a.confidence];
                    return (
                      <ArtifactCard key={a.key}>
                        <ArtifactRow>
                          <Badge $color={a.action === 'create' ? '#059669' : a.action === 'modify' ? '#3b82f6' : '#f59e0b'}>
                            {a.action}
                          </Badge>
                          <Badge $color={neutral[500]}>{typeCfg}</Badge>
                          <Badge $color={confCfg.color}>{a.confidence}</Badge>
                        </ArtifactRow>
                        <ArtifactName>{a.entityName}</ArtifactName>
                        <ArtifactReason>{a.impactReason}</ArtifactReason>
                      </ArtifactCard>
                    );
                  })}
                </PanelBody>
              </Panel>

              {/* Diffs */}
              <Panel>
                <PanelHeader>
                  <PanelTitle>Diffs ({gov.diffs.length})</PanelTitle>
                </PanelHeader>
                <PanelBody>
                  {gov.diffs.map(diff => (
                    <DiffCard key={diff.artifactKey}>
                      <DiffHeader>
                        <Badge $color={diff.action === 'create' ? '#059669' : '#3b82f6'}>
                          {diff.action}
                        </Badge>
                        <span style={{ fontSize: T.bodySm.size, fontWeight: 600, color: color.text }}>
                          {diff.artifactName}
                        </span>
                      </DiffHeader>
                      {diff.fields.length === 0 ? (
                        <span style={{ fontSize: 11, color: color.textMuted }}>No field changes</span>
                      ) : (
                        diff.fields.map((f, i) => (
                          <DiffRow key={i} $type={f.type}>
                            <DiffLabel>{f.label}</DiffLabel>
                            {f.type === 'changed' && (
                              <>
                                <DiffValue style={{ textDecoration: 'line-through', opacity: 0.6 }}>
                                  {String(f.oldValue ?? '')}
                                </DiffValue>
                                <DiffValue>{String(f.newValue)}</DiffValue>
                              </>
                            )}
                            {f.type === 'added' && <DiffValue>+ {String(f.newValue)}</DiffValue>}
                            {f.type === 'removed' && <DiffValue>- {String(f.oldValue ?? '')}</DiffValue>}
                          </DiffRow>
                        ))
                      )}
                    </DiffCard>
                  ))}
                </PanelBody>
              </Panel>
            </div>

            {/* Right: Clauses, Warnings, Decision, Apply */}
            <div>
              {/* Supporting Clauses */}
              <Panel>
                <PanelHeader>
                  <PanelTitle>Supporting Clauses ({gov.clauseRefs.length})</PanelTitle>
                </PanelHeader>
                <PanelBody>
                  {gov.clauseRefs.length === 0 ? (
                    <Warning>No supporting clauses found. Consider linking to contract language for audit traceability.</Warning>
                  ) : (
                    gov.clauseRefs.map((ref, i) => {
                      const cCfg = CLAUSE_TYPE_CONFIG[ref.clauseType] || { label: ref.clauseType, color: neutral[400] };
                      return (
                        <ClauseCard key={i}>
                          <ArtifactRow>
                            <Badge $color={cCfg.color}>{cCfg.label}</Badge>
                            {ref.existingTraceLinkId && <Badge $color="#059669">Traced</Badge>}
                          </ArtifactRow>
                          <ArtifactName>{ref.clauseName}</ArtifactName>
                          <ArtifactReason>
                            Supports: {ref.supportedArtifactKeys.join(', ')}
                          </ArtifactReason>
                          <ArtifactReason>{ref.relevance}</ArtifactReason>
                          {ref.clauseTextSnippet && (
                            <ClauseSnippet>{ref.clauseTextSnippet}</ClauseSnippet>
                          )}
                        </ClauseCard>
                      );
                    })
                  )}
                </PanelBody>
              </Panel>

              {/* Governance Warnings */}
              {gov.impactSummary.warnings.length > 0 && (
                <Panel>
                  <PanelHeader>
                    <PanelTitle>Warnings ({gov.impactSummary.warnings.length})</PanelTitle>
                  </PanelHeader>
                  <PanelBody>
                    {gov.impactSummary.warnings.map((w, i) => (
                      <Warning key={i}>{w}</Warning>
                    ))}
                  </PanelBody>
                </Panel>
              )}

              {/* Impact Summary */}
              <Panel>
                <PanelHeader><PanelTitle>Impact Summary</PanelTitle></PanelHeader>
                <PanelBody>
                  <MetaRow>
                    <span>Creates: {gov.impactSummary.creations}</span>
                    <span>Modifications: {gov.impactSummary.modifications}</span>
                  </MetaRow>
                  {gov.impactSummary.requiredApprovalRoles.length > 0 && (
                    <p style={{ fontSize: T.captionSm.size, color: color.textSecondary }}>
                      Required approvals: {gov.impactSummary.requiredApprovalRoles.join(', ')}
                    </p>
                  )}
                </PanelBody>
              </Panel>

              {/* Change Set Link */}
              <ChangeSetLink onClick={() => navigate(`/changesets/${gov.changeSetId}`)}>
                Change Set: {gov.changeSetName || gov.changeSetId.slice(0, 8)}
              </ChangeSetLink>

              {/* Decision Controls */}
              <Panel>
                <PanelHeader>
                  <PanelTitle>Governance Decision</PanelTitle>
                  {decisionCfg && <Badge $color={decisionCfg.color}>{decisionCfg.label}</Badge>}
                </PanelHeader>
                <PanelBody>
                  {gov.reviewedBy && (
                    <p style={{ fontSize: T.captionSm.size, color: color.textSecondary, marginBottom: space[2] }}>
                      Reviewed by {gov.reviewedBy} {gov.reviewedAt ? `on ${new Date(gov.reviewedAt).toLocaleDateString()}` : ''}
                    </p>
                  )}
                  {gov.decisionNotes && (
                    <p style={{ fontSize: T.captionSm.size, color: color.text, marginBottom: space[2] }}>
                      Notes: {gov.decisionNotes}
                    </p>
                  )}

                  <p style={{ fontSize: T.caption.size, color: color.textMuted, marginBottom: space[2] }}>
                    {plan.overallRationale}
                  </p>

                  {plan.caveats.length > 0 && (
                    <div style={{ marginBottom: space[3] }}>
                      <p style={{ fontSize: T.captionSm.size, fontWeight: 600, color: color.textSecondary }}>Caveats:</p>
                      {plan.caveats.map((c, i) => (
                        <p key={i} style={{ fontSize: T.captionSm.size, color: '#92400e', margin: 0 }}>• {c}</p>
                      ))}
                    </div>
                  )}

                  <DecisionGroup>
                    <DecisionBtn $variant="approve" onClick={() => handleDecision('approved')}
                      disabled={gov.decision === 'approved'}>
                      Approve
                    </DecisionBtn>
                    <DecisionBtn $variant="reject" onClick={() => handleDecision('rejected')}
                      disabled={gov.decision === 'rejected'}>
                      Reject
                    </DecisionBtn>
                    <DecisionBtn $variant="revision" onClick={() => handleDecision('needs_revision')}
                      disabled={gov.decision === 'needs_revision'}>
                      Needs Revision
                    </DecisionBtn>
                  </DecisionGroup>

                  {gov.decision === 'approved' && (
                    <ApplyBtn onClick={handleApply} disabled={applying}>
                      {applying ? 'Applying via Change Set...' : 'Apply to Change Set'}
                    </ApplyBtn>
                  )}
                </PanelBody>
              </Panel>
            </div>
          </TwoCol>
        )}
      </Container>
    </Page>
  );
};

export default GovernedProposalDetail;
