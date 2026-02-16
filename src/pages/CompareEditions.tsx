/**
 * CompareEditions – /forms/:formId/compare
 *
 * Side-by-side redline comparison between two form editions.
 *
 * Layout:
 *   Top: edition pickers (left = older, right = newer) + summary stats
 *   Center: section-by-section diff with status highlights
 *   Bottom: impact candidates panel
 *   Expandable: chunk-level drill-down per section
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import {
  color, neutral, accent, space, radius, shadow, fontFamily,
  type as T, border, duration, focusRingStyle, semantic,
} from '../ui/tokens';
import { useRoleContext } from '../context/RoleContext';
import { getFormVersions, getForm } from '../services/formService';
import { compareFormEditions } from '../services/redlineService';
import type { OrgForm, OrgFormVersion } from '../types/form';
import type {
  RedlineComparisonResult, SectionDiff, ChunkDiff, ImpactCandidate,
} from '../types/redline';
import {
  SECTION_DIFF_CONFIG,
  IMPACT_TARGET_CONFIG,
} from '../types/redline';
import { SECTION_TYPE_CONFIG } from '../types/ingestion';
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

const Container = styled.div`max-width: 1400px; margin: 0 auto;`;

const BackLink = styled.button`
  display: inline-flex; align-items: center; gap: ${space[1]};
  font-size: ${T.caption.size}; color: ${color.textSecondary};
  background: none; border: none; cursor: pointer; margin-bottom: ${space[4]};
  &:hover { color: ${accent[600]}; }
`;

const Title = styled.h1`
  font-family: ${fontFamily.sans}; font-size: ${T.displaySm.size};
  font-weight: ${T.displaySm.weight}; letter-spacing: ${T.displaySm.letterSpacing};
  color: ${color.text}; margin: 0 0 ${space[1]};
`;
const Subtitle = styled.p`font-size: ${T.bodyMd.size}; color: ${color.textSecondary}; margin: 0 0 ${space[6]};`;

const PickerRow = styled.div`
  display: flex; gap: ${space[4]}; margin-bottom: ${space[6]};
  align-items: flex-end; flex-wrap: wrap;
`;

const PickerGroup = styled.div`flex: 1; min-width: 200px;`;
const PickerLabel = styled.label`
  display: block; font-size: ${T.captionSm.size}; font-weight: 600;
  color: ${color.textSecondary}; margin-bottom: ${space[1]};
`;
const PickerSelect = styled.select`
  width: 100%; padding: ${space[2]} ${space[3]}; font-family: ${fontFamily.sans};
  font-size: ${T.bodySm.size}; color: ${color.text}; background: ${color.bg};
  border: ${border.default}; border-radius: ${radius.sm}; outline: none;
  &:focus { border-color: ${accent[500]}; ${focusRingStyle} }
`;

const BtnPrimary = styled.button<{ disabled?: boolean }>`
  padding: ${space[2]} ${space[5]}; font-family: ${fontFamily.sans};
  font-size: ${T.label.size}; font-weight: 600; color: ${color.textInverse};
  background: ${p => p.disabled ? neutral[300] : accent[600]};
  border: none; border-radius: ${radius.sm};
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  &:hover:not(:disabled) { background: ${accent[700]}; }
  &:focus-visible { ${focusRingStyle} }
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
const PanelBody = styled.div`padding: 0;`;

/* Stats bar */
const StatsBar = styled.div`
  display: flex; gap: ${space[4]}; padding: ${space[3]} ${space[5]};
  background: ${neutral[50]}; border-bottom: ${border.light}; flex-wrap: wrap;
`;
const StatPill = styled.div<{ $color: string }>`
  padding: ${space[1]} ${space[3]}; border-radius: ${radius.full};
  font-size: ${T.captionSm.size}; font-weight: 600;
  color: ${p => p.$color}; background: ${p => `${p.$color}14`};
  border: 1px solid ${p => `${p.$color}30`};
`;

/* Section rows */
const SectionRow = styled.div<{ $bg: string }>`
  display: grid; grid-template-columns: 1fr 1fr;
  border-bottom: ${border.light}; background: ${p => p.$bg};
  &:last-child { border-bottom: none; }
`;
const SectionSide = styled.div<{ $empty?: boolean }>`
  padding: ${space[3]} ${space[4]};
  ${p => p.$empty ? `color: ${color.textMuted}; font-style: italic;` : ''}
`;
const SectionHeading = styled.div`
  display: flex; align-items: center; gap: ${space[2]}; margin-bottom: ${space[1]};
`;
const DiffBadge = styled.span<{ $color: string }>`
  padding: 1px ${space[2]}; font-size: 10px; font-weight: 600;
  color: ${p => p.$color}; background: ${p => `${p.$color}14`};
  border: 1px solid ${p => `${p.$color}30`}; border-radius: ${radius.full};
`;
const SectionName = styled.span`font-size: ${T.bodySm.size}; font-weight: 600; color: ${color.text};`;
const PageRefSpan = styled.span`
  font-family: ${fontFamily.mono}; font-size: ${T.captionSm.size}; color: ${color.textMuted};
`;
const ChunkPreview = styled.pre`
  font-family: ${fontFamily.mono}; font-size: 11px; color: ${color.textSecondary};
  white-space: pre-wrap; word-break: break-word; max-height: 180px; overflow-y: auto; margin: 0;
`;
const ExpandBtn = styled.button`
  font-size: ${T.captionSm.size}; color: ${accent[600]}; background: none;
  border: none; cursor: pointer; margin-top: ${space[1]};
  &:hover { text-decoration: underline; }
`;

/* Impact panel */
const ImpactRow = styled.div`
  padding: ${space[3]} ${space[4]}; border-bottom: ${border.light};
  display: flex; align-items: center; gap: ${space[3]};
  &:last-child { border-bottom: none; }
`;
const ImpactLabel = styled.span`font-size: ${T.bodySm.size}; font-weight: 500; color: ${color.text}; flex: 1;`;
const ImpactReason = styled.span`font-size: ${T.captionSm.size}; color: ${color.textSecondary}; max-width: 360px;`;
const SeverityDot = styled.span<{ $color: string }>`
  width: 8px; height: 8px; border-radius: 50%; background: ${p => p.$color}; flex-shrink: 0;
`;

const EmptyState = styled.div`
  padding: ${space[10]} ${space[6]}; text-align: center;
  color: ${color.textMuted}; font-size: ${T.bodySm.size};
`;
const Spinner = styled.div`
  display: flex; align-items: center; justify-content: center;
  padding: ${space[10]}; color: ${color.textMuted};
`;

const SEVERITY_COLORS: Record<string, string> = {
  high: semantic.error,
  medium: semantic.warning,
  low: '#3B82F6',
};

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

const CompareEditions: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const { currentOrgId } = useRoleContext();

  const [form, setForm] = useState<OrgForm | null>(null);
  const [versions, setVersions] = useState<OrgFormVersion[]>([]);
  const [leftId, setLeftId] = useState<string>('');
  const [rightId, setRightId] = useState<string>('');
  const [result, setResult] = useState<RedlineComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Load form + versions
  useEffect(() => {
    if (!currentOrgId || !formId) return;
    (async () => {
      const [f, vs] = await Promise.all([
        getForm(currentOrgId, formId),
        getFormVersions(currentOrgId, formId),
      ]);
      setForm(f);
      setVersions(vs);
      // Auto-select most recent two
      if (vs.length >= 2) {
        setRightId(vs[0].id);
        setLeftId(vs[1].id);
      }
      setInitialLoading(false);
    })();
  }, [currentOrgId, formId]);

  const handleCompare = useCallback(async () => {
    if (!currentOrgId || !formId || !leftId || !rightId || leftId === rightId) return;
    setLoading(true);
    try {
      const res = await compareFormEditions({
        orgId: currentOrgId, formId, leftVersionId: leftId, rightVersionId: rightId,
      });
      setResult(res);
    } catch (e) {
      console.error('Comparison failed:', e);
    }
    setLoading(false);
  }, [currentOrgId, formId, leftId, rightId]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Chunk drill-down per section
  const getChunkDiffsForSection = (sectionKey: string): ChunkDiff[] => {
    if (!result) return [];
    return result.chunkDiffs.filter(cd => {
      const chunkSection = cd.leftChunk?.sectionPath || cd.rightChunk?.sectionPath || '';
      return chunkSection === sectionKey;
    });
  };

  if (initialLoading) return <Page><Spinner>Loading...</Spinner></Page>;

  const st = result?.stats;

  return (
    <Page id="main-content">
      <MainNavigation />
      <Container>
        <BackLink onClick={() => navigate(-1)}>&larr; Back to Forms</BackLink>
        <Title>Compare Editions</Title>
        <Subtitle>
          {form?.formNumber} — {form?.title}
        </Subtitle>

        {/* ── Pickers ── */}
        <PickerRow>
          <PickerGroup>
            <PickerLabel>Older Edition (left)</PickerLabel>
            <PickerSelect value={leftId} onChange={e => setLeftId(e.target.value)}>
              <option value="">Select...</option>
              {versions.map(v => (
                <option key={v.id} value={v.id} disabled={v.id === rightId}>
                  v{v.versionNumber} — {v.editionDate} ({v.status})
                </option>
              ))}
            </PickerSelect>
          </PickerGroup>
          <PickerGroup>
            <PickerLabel>Newer Edition (right)</PickerLabel>
            <PickerSelect value={rightId} onChange={e => setRightId(e.target.value)}>
              <option value="">Select...</option>
              {versions.map(v => (
                <option key={v.id} value={v.id} disabled={v.id === leftId}>
                  v{v.versionNumber} — {v.editionDate} ({v.status})
                </option>
              ))}
            </PickerSelect>
          </PickerGroup>
          <BtnPrimary
            onClick={handleCompare}
            disabled={loading || !leftId || !rightId || leftId === rightId}
          >
            {loading ? 'Comparing...' : 'Compare'}
          </BtnPrimary>
        </PickerRow>

        {/* ── No result yet ── */}
        {!result && !loading && (
          <Panel>
            <EmptyState>
              Select two editions and click Compare. Both editions must be ingested.
            </EmptyState>
          </Panel>
        )}

        {/* ── Stats ── */}
        {result && st && (
          <StatsBar>
            <StatPill $color={SECTION_DIFF_CONFIG.unchanged.color}>
              {st.unchangedSections} unchanged
            </StatPill>
            <StatPill $color={SECTION_DIFF_CONFIG.modified.color}>
              {st.modifiedSections} modified
            </StatPill>
            <StatPill $color={SECTION_DIFF_CONFIG.added.color}>
              {st.addedSections} added
            </StatPill>
            <StatPill $color={SECTION_DIFF_CONFIG.removed.color}>
              {st.removedSections} removed
            </StatPill>
            <StatPill $color="#6366F1">
              {st.impactCandidateCount} impact candidates
            </StatPill>
          </StatsBar>
        )}

        {/* ── Section diffs ── */}
        {result && (
          <Panel>
            <PanelHeader>
              <PanelTitle>
                Section Comparison ({result.sectionDiffs.length})
              </PanelTitle>
            </PanelHeader>
            {/* Column headers */}
            <SectionRow $bg={neutral[50]}>
              <SectionSide style={{ fontWeight: 600, fontSize: T.captionSm.size, color: color.textMuted }}>
                {result.leftEditionDate} (older)
              </SectionSide>
              <SectionSide style={{ fontWeight: 600, fontSize: T.captionSm.size, color: color.textMuted }}>
                {result.rightEditionDate} (newer)
              </SectionSide>
            </SectionRow>
            <PanelBody>
              {result.sectionDiffs.map(diff => {
                const cfg = SECTION_DIFF_CONFIG[diff.status];
                const typeCfg = SECTION_TYPE_CONFIG[diff.sectionType] || SECTION_TYPE_CONFIG.general;
                const expanded = expandedSections.has(diff.matchKey);
                const chunkDiffs = expanded ? getChunkDiffsForSection(diff.matchKey) : [];

                return (
                  <React.Fragment key={diff.matchKey}>
                    <SectionRow $bg={cfg.bgColor}>
                      {/* Left side */}
                      <SectionSide $empty={!diff.leftSection}>
                        {diff.leftSection ? (
                          <>
                            <SectionHeading>
                              <DiffBadge $color={cfg.color}>{cfg.label}</DiffBadge>
                              <DiffBadge $color={typeCfg.color}>{typeCfg.label}</DiffBadge>
                              <SectionName>{diff.title}</SectionName>
                            </SectionHeading>
                            {diff.leftPages && (
                              <PageRefSpan>
                                p.{Math.min(...diff.leftPages)}{diff.leftPages.length > 1 ? `-${Math.max(...diff.leftPages)}` : ''}
                              </PageRefSpan>
                            )}
                            <ExpandBtn onClick={() => toggleSection(diff.matchKey)}>
                              {expanded ? 'Hide text' : 'Show text'}
                            </ExpandBtn>
                          </>
                        ) : (
                          <span>— not present —</span>
                        )}
                      </SectionSide>

                      {/* Right side */}
                      <SectionSide $empty={!diff.rightSection}>
                        {diff.rightSection ? (
                          <>
                            <SectionHeading>
                              <DiffBadge $color={cfg.color}>{cfg.label}</DiffBadge>
                              <DiffBadge $color={typeCfg.color}>{typeCfg.label}</DiffBadge>
                              <SectionName>{diff.title}</SectionName>
                            </SectionHeading>
                            {diff.rightPages && (
                              <PageRefSpan>
                                p.{Math.min(...diff.rightPages)}{diff.rightPages.length > 1 ? `-${Math.max(...diff.rightPages)}` : ''}
                              </PageRefSpan>
                            )}
                            <ExpandBtn onClick={() => toggleSection(diff.matchKey)}>
                              {expanded ? 'Hide text' : 'Show text'}
                            </ExpandBtn>
                          </>
                        ) : (
                          <span>— not present —</span>
                        )}
                      </SectionSide>
                    </SectionRow>

                    {/* Chunk drill-down */}
                    {expanded && chunkDiffs.length > 0 && (
                      <SectionRow $bg={neutral[25]}>
                        <SectionSide>
                          {chunkDiffs.map((cd, i) => (
                            <div key={i} style={{ marginBottom: space[3] }}>
                              <DiffBadge $color={SECTION_DIFF_CONFIG[cd.status]?.color || neutral[400]}>
                                {cd.status}
                              </DiffBadge>
                              {cd.leftText && <ChunkPreview>{cd.leftText}</ChunkPreview>}
                              {!cd.leftText && <ChunkPreview>— empty —</ChunkPreview>}
                            </div>
                          ))}
                        </SectionSide>
                        <SectionSide>
                          {chunkDiffs.map((cd, i) => (
                            <div key={i} style={{ marginBottom: space[3] }}>
                              <DiffBadge $color={SECTION_DIFF_CONFIG[cd.status]?.color || neutral[400]}>
                                {cd.status}
                              </DiffBadge>
                              {cd.rightText && <ChunkPreview>{cd.rightText}</ChunkPreview>}
                              {!cd.rightText && <ChunkPreview>— empty —</ChunkPreview>}
                            </div>
                          ))}
                        </SectionSide>
                      </SectionRow>
                    )}
                  </React.Fragment>
                );
              })}
            </PanelBody>
          </Panel>
        )}

        {/* ── Impact candidates ── */}
        {result && result.impactCandidates.length > 0 && (
          <Panel>
            <PanelHeader>
              <PanelTitle>
                Downstream Impact Candidates ({result.impactCandidates.length})
              </PanelTitle>
            </PanelHeader>
            <PanelBody>
              {result.impactCandidates.map((ic, i) => {
                const tcfg = IMPACT_TARGET_CONFIG[ic.targetType];
                return (
                  <ImpactRow key={i}>
                    <SeverityDot $color={SEVERITY_COLORS[ic.severity] || neutral[400]} />
                    <DiffBadge $color={tcfg.color}>{tcfg.label}</DiffBadge>
                    <ImpactLabel>{ic.targetLabel}</ImpactLabel>
                    <ImpactReason>{ic.reason}</ImpactReason>
                  </ImpactRow>
                );
              })}
            </PanelBody>
          </Panel>
        )}

        {result && result.impactCandidates.length === 0 && (
          <Panel>
            <EmptyState>No downstream impact candidates identified.</EmptyState>
          </Panel>
        )}
      </Container>
    </Page>
  );
};

export default CompareEditions;
