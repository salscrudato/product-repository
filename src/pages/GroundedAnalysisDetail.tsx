/**
 * GroundedAnalysisDetail – /claims-analysis/:analysisId/grounded
 *
 * Clause-grounded analysis view: reads like a defensible coverage memo.
 *
 * Layout:
 *   Top: Determination banner + scenario summary + metadata
 *   Left: Cited conclusions with inline anchor citations
 *   Right: Open questions checklist + decision gates + comparison picker
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import {
  color, neutral, accent, space, radius, shadow, fontFamily,
  type as T, border, duration, focusRingStyle, semantic,
} from '../ui/tokens';
import { useRoleContext } from '../context/RoleContext';
import {
  getGroundedAnalysis,
  groundExistingAnalysis,
  resolveOpenQuestion,
  advanceDecisionGate,
  listGroundedAnalyses,
  compareGroundedAnalyses,
} from '../services/clauseGroundedService';
import type { ClaimsAnalysis } from '../types/claimsAnalysis';
import { DETERMINATION_LABELS, DETERMINATION_COLORS } from '../types/claimsAnalysis';
import type {
  ClauseGroundedFields,
  CitedConclusion,
  OpenQuestion,
  DecisionGate,
  AnalysisComparison,
} from '../types/clauseGroundedAnalysis';
import {
  CONCLUSION_TYPE_CONFIG,
  OPEN_QUESTION_CONFIG,
  DECISION_GATE_CONFIG,
} from '../types/clauseGroundedAnalysis';
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
const Container = styled.div`max-width: 1300px; margin: 0 auto; animation: ${fadeIn} 0.3s ease;`;

const BackLink = styled.button`
  display: inline-flex; align-items: center; gap: ${space[1]};
  font-size: ${T.caption.size}; color: ${color.textSecondary};
  background: none; border: none; cursor: pointer; margin-bottom: ${space[4]};
  &:hover { color: ${accent[600]}; }
`;

const DeterminationBanner = styled.div<{ $color: string }>`
  background: ${p => `${p.$color}0D`}; border: 1px solid ${p => `${p.$color}30`};
  border-radius: ${radius.lg}; padding: ${space[5]} ${space[6]}; margin-bottom: ${space[6]};
  display: flex; align-items: center; gap: ${space[4]}; flex-wrap: wrap;
`;
const DetLabel = styled.span<{ $color: string }>`
  font-size: ${T.headingLg.size}; font-weight: 700; color: ${p => p.$color};
`;
const DetSummary = styled.p`
  font-size: ${T.bodyMd.size}; color: ${color.text}; margin: 0; flex: 1; min-width: 300px;
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

/* Conclusion card */
const ConcCard = styled.div`
  border: ${border.default}; border-radius: ${radius.md}; padding: ${space[4]};
  margin-bottom: ${space[3]}; background: ${color.bgSubtle};
`;
const ConcHeader = styled.div`display: flex; align-items: center; gap: ${space[2]}; margin-bottom: ${space[2]};`;
const Badge = styled.span<{ $color: string }>`
  padding: 1px ${space[2]}; font-size: 10px; font-weight: 600;
  color: ${p => p.$color}; background: ${p => `${p.$color}14`};
  border: 1px solid ${p => `${p.$color}30`}; border-radius: ${radius.full};
`;
const ConfBadge = styled.span<{ $level: string }>`
  padding: 1px ${space[2]}; font-size: 10px; font-weight: 600; border-radius: ${radius.full};
  color: ${p => p.$level === 'high' ? '#059669' : p.$level === 'medium' ? '#d97706' : '#dc2626'};
  background: ${p => p.$level === 'high' ? '#05966914' : p.$level === 'medium' ? '#d9770614' : '#dc262614'};
`;
const ConcStatement = styled.p`
  font-size: ${T.bodySm.size}; font-weight: 600; color: ${color.text}; margin: 0 0 ${space[1]};
`;
const ConcReasoning = styled.p`
  font-size: ${T.caption.size}; color: ${color.textSecondary}; margin: 0 0 ${space[2]};
`;

/* Citation chip */
const CitationChip = styled.div`
  display: inline-flex; align-items: center; gap: ${space[1]};
  background: ${accent[50]}; border: 1px solid ${accent[200]};
  border-radius: ${radius.sm}; padding: 2px ${space[2]};
  font-size: 11px; color: ${accent[700]}; margin-right: ${space[1]};
  margin-bottom: ${space[1]}; cursor: default;
`;
const CitationExcerpt = styled.div`
  font-size: 11px; color: ${color.textMuted}; font-family: ${fontFamily.mono};
  background: ${neutral[50]}; border-radius: ${radius.sm}; padding: ${space[2]};
  margin-top: ${space[1]}; max-height: 80px; overflow-y: auto;
  line-height: 1.5; white-space: pre-wrap;
`;

/* Open question */
const QCard = styled.div<{ $resolved: boolean }>`
  border: ${border.default}; border-radius: ${radius.md}; padding: ${space[3]};
  margin-bottom: ${space[2]}; background: ${p => p.$resolved ? '#f0fdf4' : color.bgSubtle};
  ${p => p.$resolved ? 'opacity: 0.75;' : ''}
`;
const QText = styled.p`
  font-size: ${T.bodySm.size}; color: ${color.text}; margin: 0 0 ${space[1]};
  ${(p: any) => p.$resolved && 'text-decoration: line-through;'}
`;
const QImpact = styled.p`font-size: ${T.captionSm.size}; color: ${color.textMuted}; margin: 0;`;
const ResolveBtn = styled.button`
  font-size: ${T.captionSm.size}; color: ${accent[600]}; background: none;
  border: none; cursor: pointer; margin-top: ${space[1]};
  &:hover { text-decoration: underline; }
`;

/* Decision gate */
const GateRow = styled.div`
  display: flex; align-items: center; gap: ${space[3]}; padding: ${space[2]} 0;
  border-bottom: ${border.light}; &:last-child { border-bottom: none; }
`;
const GateName = styled.span`font-size: ${T.bodySm.size}; font-weight: 500; color: ${color.text}; flex: 1;`;

/* Grounding button */
const BtnPrimary = styled.button<{ disabled?: boolean }>`
  padding: ${space[2]} ${space[5]}; font-family: ${fontFamily.sans};
  font-size: ${T.label.size}; font-weight: 600; color: ${color.textInverse};
  background: ${p => p.disabled ? neutral[300] : accent[600]};
  border: none; border-radius: ${radius.sm};
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  &:hover:not(:disabled) { background: ${accent[700]}; }
`;

const Spinner = styled.div`
  padding: ${space[10]}; text-align: center; color: ${color.textMuted};
`;

const MetaRow = styled.div`
  display: flex; gap: ${space[4]}; flex-wrap: wrap; margin-bottom: ${space[4]};
  font-size: ${T.captionSm.size}; color: ${color.textSecondary};
`;
const MetaItem = styled.span``;

/* Comparison */
const CompSelect = styled.select`
  padding: ${space[1]} ${space[2]}; font-size: ${T.captionSm.size};
  border: ${border.default}; border-radius: ${radius.sm};
`;
const DeltaBadge = styled.span<{ $type: string }>`
  font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: ${radius.full};
  color: ${p => p.$type === 'added' ? '#059669' : p.$type === 'removed' ? '#dc2626' : p.$type === 'changed' ? '#d97706' : neutral[500]};
  background: ${p => p.$type === 'added' ? '#05966914' : p.$type === 'removed' ? '#dc262614' : p.$type === 'changed' ? '#d9770614' : neutral[100]};
`;

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

const GroundedAnalysisDetail: React.FC = () => {
  const { analysisId } = useParams<{ analysisId: string }>();
  const navigate = useNavigate();
  const { currentOrgId, user } = useRoleContext();

  const [analysis, setAnalysis] = useState<ClaimsAnalysis | null>(null);
  const [grounded, setGrounded] = useState<ClauseGroundedFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [grounding, setGrounding] = useState(false);
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set());

  // Comparison state
  const [allAnalyses, setAllAnalyses] = useState<Array<{ analysis: ClaimsAnalysis; isGrounded: boolean; version: number }>>([]);
  const [compareId, setCompareId] = useState('');
  const [comparison, setComparison] = useState<AnalysisComparison | null>(null);

  useEffect(() => {
    if (!currentOrgId || !analysisId) return;
    (async () => {
      setLoading(true);
      const { analysis: a, grounded: g } = await getGroundedAnalysis(currentOrgId, analysisId);
      setAnalysis(a);
      setGrounded(g);
      const all = await listGroundedAnalyses(currentOrgId, 20);
      setAllAnalyses(all.filter(x => x.analysis.id !== analysisId && x.isGrounded));
      setLoading(false);
    })();
  }, [currentOrgId, analysisId]);

  const handleGround = useCallback(async () => {
    if (!currentOrgId || !analysisId) return;
    setGrounding(true);
    try {
      const g = await groundExistingAnalysis(currentOrgId, analysisId);
      setGrounded(g);
    } catch (e) {
      console.error('Grounding failed:', e);
    }
    setGrounding(false);
  }, [currentOrgId, analysisId]);

  const handleResolve = useCallback(async (qId: string) => {
    const resolution = prompt('Resolution:');
    if (!resolution || !currentOrgId || !analysisId) return;
    await resolveOpenQuestion(currentOrgId, analysisId, qId, resolution);
    const { grounded: g } = await getGroundedAnalysis(currentOrgId, analysisId);
    setGrounded(g);
  }, [currentOrgId, analysisId]);

  const handleCompare = useCallback(async () => {
    if (!currentOrgId || !analysisId || !compareId) return;
    const cmp = await compareGroundedAnalyses(currentOrgId, compareId, analysisId);
    setComparison(cmp);
  }, [currentOrgId, analysisId, compareId]);

  const toggleCitation = (concId: string) => {
    setExpandedCitations(prev => {
      const next = new Set(prev);
      if (next.has(concId)) next.delete(concId); else next.add(concId);
      return next;
    });
  };

  if (loading) return <Page><Spinner>Loading analysis...</Spinner></Page>;
  if (!analysis) return <Page><Spinner>Analysis not found.</Spinner></Page>;

  const sf = analysis.structuredFields;
  const detColor = DETERMINATION_COLORS[sf.determination];

  return (
    <Page id="main-content">
      <MainNavigation />
      <Container>
        <BackLink onClick={() => navigate('/claims-analysis')}>&larr; Back to Claims</BackLink>

        {/* Determination banner */}
        <DeterminationBanner $color={detColor}>
          <DetLabel $color={detColor}>{DETERMINATION_LABELS[sf.determination]}</DetLabel>
          <DetSummary>{sf.summary}</DetSummary>
          {grounded && (
            <Badge $color={accent[600]}>v{grounded.analysisVersion}</Badge>
          )}
        </DeterminationBanner>

        {/* Metadata */}
        <MetaRow>
          <MetaItem>Analysis: {analysis.id.slice(0, 8)}</MetaItem>
          <MetaItem>Forms: {analysis.formVersionIds.length}</MetaItem>
          <MetaItem>Citations: {analysis.citations.length}</MetaItem>
          <MetaItem>Model: {analysis.modelId}</MetaItem>
          <MetaItem>Latency: {analysis.latencyMs}ms</MetaItem>
        </MetaRow>

        {/* Not yet grounded */}
        {!grounded && (
          <Panel>
            <PanelBody style={{ textAlign: 'center', padding: space[8] }}>
              <p style={{ color: color.textMuted, marginBottom: space[4] }}>
                This analysis has not been clause-grounded yet. Grounding will anchor every conclusion
                to specific clause language, identify open questions, and create decision gates.
              </p>
              <BtnPrimary onClick={handleGround} disabled={grounding}>
                {grounding ? 'Grounding...' : 'Ground This Analysis'}
              </BtnPrimary>
            </PanelBody>
          </Panel>
        )}

        {/* Grounded content */}
        {grounded && (
          <TwoCol>
            {/* Left: Conclusions */}
            <div>
              <Panel>
                <PanelHeader>
                  <PanelTitle>Cited Conclusions ({grounded.conclusions.length})</PanelTitle>
                </PanelHeader>
                <PanelBody>
                  {grounded.conclusions.map(conc => {
                    const cfg = CONCLUSION_TYPE_CONFIG[conc.type];
                    const expanded = expandedCitations.has(conc.id);
                    return (
                      <ConcCard key={conc.id}>
                        <ConcHeader>
                          <Badge $color={cfg.color}>{cfg.label}</Badge>
                          <ConfBadge $level={conc.confidence}>{conc.confidence}</ConfBadge>
                        </ConcHeader>
                        <ConcStatement>{conc.statement}</ConcStatement>
                        <ConcReasoning>{conc.reasoning}</ConcReasoning>

                        {/* Citation chips */}
                        {conc.citations.length > 0 && (
                          <div>
                            {conc.citations.map((cit, i) => (
                              <CitationChip
                                key={i}
                                title={`${cit.formLabel} — ${cit.sectionPath} (p.${cit.page})`}
                                onClick={() => toggleCitation(conc.id)}
                              >
                                <Badge $color={cit.relevance === 'direct' ? '#059669' : cit.relevance === 'supporting' ? '#d97706' : neutral[400]}>
                                  {cit.relevance}
                                </Badge>
                                {cit.formLabel} &middot; {cit.anchorSlug} &middot; p.{cit.page}
                              </CitationChip>
                            ))}
                            {expanded && conc.citations.map((cit, i) => (
                              cit.excerpt && (
                                <CitationExcerpt key={`exc-${i}`}>
                                  {cit.excerpt}
                                </CitationExcerpt>
                              )
                            ))}
                          </div>
                        )}
                        {conc.citations.length === 0 && (
                          <span style={{ fontSize: 11, color: color.textMuted }}>
                            No anchor citations found — manual review recommended
                          </span>
                        )}
                      </ConcCard>
                    );
                  })}
                </PanelBody>
              </Panel>
            </div>

            {/* Right: Open questions + gates + comparison */}
            <div>
              {/* Open questions */}
              <Panel>
                <PanelHeader>
                  <PanelTitle>What I Still Need to Know ({grounded.openQuestions.filter(q => !q.resolved).length})</PanelTitle>
                </PanelHeader>
                <PanelBody>
                  {grounded.openQuestions.length === 0 ? (
                    <p style={{ color: color.textMuted, fontSize: T.captionSm.size }}>
                      No open questions identified.
                    </p>
                  ) : (
                    grounded.openQuestions.map(q => {
                      const qcfg = OPEN_QUESTION_CONFIG[q.category];
                      return (
                        <QCard key={q.id} $resolved={q.resolved}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: space[2], marginBottom: space[1] }}>
                            <Badge $color={qcfg.color}>{qcfg.label}</Badge>
                            {q.resolved && <Badge $color="#059669">Resolved</Badge>}
                          </div>
                          <QText>{q.question}</QText>
                          <QImpact>{q.impact}</QImpact>
                          {q.resolved && q.resolution && (
                            <p style={{ fontSize: T.captionSm.size, color: '#059669', marginTop: space[1] }}>
                              Resolution: {q.resolution}
                            </p>
                          )}
                          {!q.resolved && (
                            <ResolveBtn onClick={() => handleResolve(q.id)}>
                              Mark as resolved
                            </ResolveBtn>
                          )}
                        </QCard>
                      );
                    })
                  )}
                </PanelBody>
              </Panel>

              {/* Decision gates */}
              <Panel>
                <PanelHeader>
                  <PanelTitle>Decision Gates</PanelTitle>
                </PanelHeader>
                <PanelBody>
                  {grounded.decisionGates.map(gate => {
                    const gcfg = DECISION_GATE_CONFIG[gate.status];
                    return (
                      <GateRow key={gate.id}>
                        <GateName>{gate.name}</GateName>
                        <Badge $color={gcfg.color}>{gcfg.label}</Badge>
                      </GateRow>
                    );
                  })}
                </PanelBody>
              </Panel>

              {/* Comparison */}
              {allAnalyses.length > 0 && (
                <Panel>
                  <PanelHeader>
                    <PanelTitle>Compare Over Time</PanelTitle>
                  </PanelHeader>
                  <PanelBody>
                    <div style={{ display: 'flex', gap: space[2], marginBottom: space[3] }}>
                      <CompSelect value={compareId} onChange={e => setCompareId(e.target.value)}>
                        <option value="">Select prior analysis...</option>
                        {allAnalyses.map(a => (
                          <option key={a.analysis.id} value={a.analysis.id}>
                            v{a.version} — {a.analysis.structuredFields.determination}
                          </option>
                        ))}
                      </CompSelect>
                      <BtnPrimary onClick={handleCompare} disabled={!compareId} style={{ padding: `${space[1]} ${space[3]}` }}>
                        Compare
                      </BtnPrimary>
                    </div>

                    {comparison && (
                      <div>
                        {comparison.determinationChanged && (
                          <div style={{ padding: space[2], background: '#fef3c7', borderRadius: radius.sm, marginBottom: space[2] }}>
                            <span style={{ fontSize: T.captionSm.size, fontWeight: 600, color: '#92400e' }}>
                              Determination changed: {DETERMINATION_LABELS[comparison.leftDetermination]}
                              {' → '}{DETERMINATION_LABELS[comparison.rightDetermination]}
                            </span>
                          </div>
                        )}
                        <p style={{ fontSize: T.captionSm.size, color: color.textSecondary, marginBottom: space[2] }}>
                          +{comparison.stats.conclusionsAdded} conclusions,
                          -{comparison.stats.conclusionsRemoved} removed,
                          ~{comparison.stats.conclusionsChanged} changed,
                          {comparison.stats.questionsResolved} questions resolved
                        </p>
                        {comparison.conclusionDeltas.filter(d => d.changeType !== 'unchanged').map((d, i) => (
                          <div key={i} style={{ display: 'flex', gap: space[2], alignItems: 'center', marginBottom: space[1] }}>
                            <DeltaBadge $type={d.changeType}>{d.changeType}</DeltaBadge>
                            <span style={{ fontSize: 12, color: color.text }}>{d.statement.slice(0, 80)}...</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </PanelBody>
                </Panel>
              )}
            </div>
          </TwoCol>
        )}
      </Container>
    </Page>
  );
};

export default GroundedAnalysisDetail;
