/**
 * IngestionReportPage – /forms/:formId/versions/:versionId/ingestion
 *
 * Displays the contract truth layer ingestion report for a form edition:
 *   - Quality score + warnings
 *   - Detected sections with types and page refs
 *   - Chunk list with anchors
 *   - Re-ingest button
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import {
  color, neutral, accent, space, radius, shadow, fontFamily, type as T,
  border, duration, focusRingStyle, semantic,
} from '../ui/tokens';
import { useRoleContext } from '../context/RoleContext';
import { getIngestionReport, runIngestion } from '../services/ingestionService';
import { getForm, getFormVersion } from '../services/formService';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../firebase';
import type { IngestionReport, FormIngestionChunk, FormIngestionSection, IngestionWarning } from '../types/ingestion';
import { INGESTION_STATUS_CONFIG, SECTION_TYPE_CONFIG, type FormSectionType } from '../types/ingestion';
import type { OrgForm, OrgFormVersion } from '../types/form';
import MainNavigation from '../components/ui/Navigation';

// ════════════════════════════════════════════════════════════════════════
// Styled Components
// ════════════════════════════════════════════════════════════════════════

const Page = styled.main`
  min-height: 100vh;
  background: linear-gradient(160deg, ${neutral[50]} 0%, ${neutral[100]} 50%, ${neutral[50]} 100%);
  padding: ${space[8]} ${space[8]} ${space[16]};
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const BackLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${space[1]};
  font-size: ${T.caption.size};
  color: ${color.textSecondary};
  background: none;
  border: none;
  cursor: pointer;
  margin-bottom: ${space[4]};
  &:hover { color: ${accent[600]}; }
`;

const PageHeader = styled.header`
  margin-bottom: ${space[6]};
`;

const Title = styled.h1`
  font-family: ${fontFamily.sans};
  font-size: ${T.displaySm.size};
  font-weight: ${T.displaySm.weight};
  letter-spacing: ${T.displaySm.letterSpacing};
  color: ${color.text};
  margin: 0 0 ${space[1]};
`;

const Subtitle = styled.p`
  font-size: ${T.bodyMd.size};
  color: ${color.textSecondary};
  margin: 0;
`;

const Panel = styled.section`
  background: ${color.bg};
  border: ${border.default};
  border-radius: ${radius.lg};
  box-shadow: ${shadow.card};
  overflow: hidden;
  margin-bottom: ${space[6]};
`;

const PanelHeader = styled.div`
  padding: ${space[5]} ${space[6]};
  border-bottom: ${border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const PanelTitle = styled.h2`
  font-family: ${fontFamily.sans};
  font-size: ${T.headingSm.size};
  font-weight: ${T.headingSm.weight};
  color: ${color.text};
  margin: 0;
`;

const PanelBody = styled.div`
  padding: ${space[5]} ${space[6]};
`;

// ── Quality Score ──

const ScoreGrid = styled.div`
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: ${space[6]};
  margin-bottom: ${space[5]};
`;

const ScoreRing = styled.div<{ $score: number }>`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${fontFamily.mono};
  font-size: ${T.displayLg.size};
  font-weight: 700;
  color: ${p => p.$score >= 80 ? semantic.success : p.$score >= 50 ? semantic.warning : semantic.error};
  background: ${p => p.$score >= 80 ? semantic.successLight : p.$score >= 50 ? semantic.warningLight : semantic.errorLight};
  border: 3px solid ${p => p.$score >= 80 ? `${semantic.success}40` : p.$score >= 50 ? `${semantic.warning}40` : `${semantic.error}40`};
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: ${space[3]};
`;

const StatCard = styled.div`
  padding: ${space[3]} ${space[4]};
  background: ${neutral[50]};
  border: ${border.light};
  border-radius: ${radius.md};
  text-align: center;
`;

const StatValue = styled.div`
  font-family: ${fontFamily.mono};
  font-size: ${T.headingSm.size};
  font-weight: 700;
  color: ${color.text};
`;

const StatLabel = styled.div`
  font-size: ${T.captionSm.size};
  color: ${color.textSecondary};
  margin-top: ${space[0.5]};
`;

// ── Warnings ──

const WarningRow = styled.div<{ $severity: string }>`
  padding: ${space[3]} ${space[4]};
  border-bottom: ${border.light};
  display: flex;
  align-items: center;
  gap: ${space[3]};
  background: ${p => p.$severity === 'error' ? semantic.errorLight : p.$severity === 'warning' ? semantic.warningLight : 'transparent'};
  &:last-child { border-bottom: none; }
`;

const SeverityDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${p => p.$color};
  flex-shrink: 0;
`;

const WarningMessage = styled.span`
  font-size: ${T.bodySm.size};
  color: ${color.text};
  flex: 1;
`;

const WarningMeta = styled.span`
  font-size: ${T.captionSm.size};
  color: ${color.textMuted};
`;

// ── Sections ──

const SectionRow = styled.div`
  padding: ${space[3]} ${space[4]};
  border-bottom: ${border.light};
  display: flex;
  align-items: center;
  gap: ${space[3]};
  &:last-child { border-bottom: none; }
`;

const SectionBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  padding: ${space[0.5]} ${space[2]};
  font-size: ${T.captionSm.size};
  font-weight: 600;
  color: ${p => p.$color};
  background: ${p => `${p.$color}14`};
  border: 1px solid ${p => `${p.$color}30`};
  border-radius: ${radius.full};
  white-space: nowrap;
`;

const SectionTitle = styled.span`
  font-size: ${T.bodySm.size};
  font-weight: 500;
  color: ${color.text};
  flex: 1;
`;

const PageRef = styled.span`
  font-family: ${fontFamily.mono};
  font-size: ${T.captionSm.size};
  color: ${color.textMuted};
`;

// ── Chunks ──

const ChunkCard = styled.div<{ $expanded: boolean }>`
  border-bottom: ${border.light};
  &:last-child { border-bottom: none; }
`;

const ChunkHeader = styled.button`
  width: 100%;
  padding: ${space[3]} ${space[4]};
  display: flex;
  align-items: center;
  gap: ${space[3]};
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  &:hover { background: ${neutral[50]}; }
`;

const ChunkIndex = styled.span`
  font-family: ${fontFamily.mono};
  font-size: ${T.captionSm.size};
  color: ${color.textMuted};
  width: 36px;
  text-align: center;
`;

const ChunkMeta = styled.span`
  font-size: ${T.captionSm.size};
  color: ${color.textSecondary};
`;

const ChunkText = styled.pre`
  padding: ${space[4]} ${space[6]};
  font-family: ${fontFamily.mono};
  font-size: ${T.captionSm.size};
  color: ${color.textSecondary};
  background: ${neutral[50]};
  border-top: ${border.light};
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
`;

const AnchorTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: ${space[0.5]} ${space[2]};
  font-size: 10px;
  font-family: ${fontFamily.mono};
  color: ${accent[700]};
  background: ${accent[50]};
  border: 1px solid ${accent[200]};
  border-radius: ${radius.xs};
  margin: 0 ${space[0.5]};
`;

// ── Buttons ──

const ButtonPrimary = styled.button<{ disabled?: boolean }>`
  padding: ${space[2]} ${space[5]};
  font-family: ${fontFamily.sans};
  font-size: ${T.label.size};
  font-weight: 600;
  color: ${color.textInverse};
  background: ${p => p.disabled ? neutral[300] : accent[600]};
  border: none;
  border-radius: ${radius.sm};
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  &:hover:not(:disabled) { background: ${accent[700]}; }
  &:focus-visible { ${focusRingStyle} }
`;

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;
const SpinIcon = styled.span<{ $spinning?: boolean }>`
  display: inline-block;
  margin-right: ${space[1]};
  animation: ${p => p.$spinning ? spin : 'none'} 1s linear infinite;
`;

const EmptyState = styled.div`
  padding: ${space[10]} ${space[6]};
  text-align: center;
  color: ${color.textMuted};
  font-size: ${T.bodySm.size};
`;

const Spinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${space[10]};
  color: ${color.textMuted};
`;

const SectionLabel = styled.div`
  font-size: ${T.overline.size};
  font-weight: ${T.overline.weight};
  letter-spacing: ${T.overline.letterSpacing};
  color: ${color.textMuted};
  text-transform: uppercase;
  margin-bottom: ${space[3]};
`;

const SEVERITY_COLORS: Record<string, string> = {
  error: semantic.error,
  warning: semantic.warning,
  info: '#3B82F6',
};

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

const IngestionReportPage: React.FC = () => {
  const { formId, versionId } = useParams<{ formId: string; versionId: string }>();
  const navigate = useNavigate();
  const { currentOrgId } = useRoleContext();

  const [report, setReport] = useState<IngestionReport | null>(null);
  const [form, setForm] = useState<OrgForm | null>(null);
  const [version, setVersion] = useState<OrgFormVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());

  // ── Load report + form metadata ──
  useEffect(() => {
    if (!currentOrgId || !formId || !versionId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [f, v, r] = await Promise.all([
          getForm(currentOrgId, formId),
          getFormVersion(currentOrgId, formId, versionId),
          getIngestionReport(currentOrgId, formId, versionId),
        ]);
        if (!cancelled) {
          setForm(f);
          setVersion(v);
          setReport(r);
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [currentOrgId, formId, versionId]);

  // ── Run ingestion ──
  const handleIngest = useCallback(async () => {
    if (!currentOrgId || !formId || !versionId || !version?.storagePath || ingesting) return;
    setIngesting(true);
    try {
      const url = await getDownloadURL(ref(storage, version.storagePath));
      const result = await runIngestion({
        orgId: currentOrgId,
        formId,
        formVersionId: versionId,
        pdfUrl: url,
      });
      if (result) setReport(result);
    } catch (err) {
      console.error('Ingestion failed:', err);
    }
    setIngesting(false);
  }, [currentOrgId, formId, versionId, version, ingesting]);

  const toggleChunk = (idx: number) => {
    setExpandedChunks(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  if (loading) return <Page><Spinner>Loading...</Spinner></Page>;

  const ing = report?.ingestion;
  const statusConfig = ing?.status ? INGESTION_STATUS_CONFIG[ing.status] : null;

  return (
    <Page id="main-content">
      <MainNavigation />
      <Container>
        <BackLink onClick={() => navigate(-1)}>&larr; Back</BackLink>

        <PageHeader>
          <Title>Ingestion Report</Title>
          <Subtitle>
            {form?.formNumber} — {form?.title}
            {version ? ` (Edition ${version.editionDate})` : ''}
          </Subtitle>
        </PageHeader>

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: space[3], marginBottom: space[6] }}>
          <ButtonPrimary onClick={handleIngest} disabled={ingesting || !version?.storagePath}>
            <SpinIcon $spinning={ingesting}>&#x21bb;</SpinIcon>
            {ingesting ? 'Ingesting...' : report ? 'Re-Ingest' : 'Run Ingestion'}
          </ButtonPrimary>
          {!version?.storagePath && (
            <span style={{ fontSize: T.captionSm.size, color: semantic.warning, alignSelf: 'center' }}>
              No PDF uploaded for this version
            </span>
          )}
        </div>

        {!report && !ingesting && (
          <Panel>
            <EmptyState>
              No ingestion data available. Upload a PDF and click "Run Ingestion" to build the contract truth layer.
            </EmptyState>
          </Panel>
        )}

        {report && (
          <>
            {/* ── Quality Score ── */}
            <Panel>
              <PanelHeader>
                <PanelTitle>Quality Score</PanelTitle>
                {statusConfig && (
                  <SectionBadge $color={statusConfig.color}>
                    {statusConfig.label}
                  </SectionBadge>
                )}
              </PanelHeader>
              <PanelBody>
                <ScoreGrid>
                  <ScoreRing $score={ing?.qualityScore ?? 0}>
                    {ing?.qualityScore ?? 0}
                  </ScoreRing>
                  <StatGrid>
                    <StatCard>
                      <StatValue>{ing?.totalPages ?? 0}</StatValue>
                      <StatLabel>Pages</StatLabel>
                    </StatCard>
                    <StatCard>
                      <StatValue>{(ing?.totalCharacters ?? 0).toLocaleString()}</StatValue>
                      <StatLabel>Characters</StatLabel>
                    </StatCard>
                    <StatCard>
                      <StatValue>{ing?.chunkCount ?? 0}</StatValue>
                      <StatLabel>Chunks</StatLabel>
                    </StatCard>
                    <StatCard>
                      <StatValue>{ing?.sectionCount ?? 0}</StatValue>
                      <StatLabel>Sections</StatLabel>
                    </StatCard>
                    <StatCard>
                      <StatValue>{report.totalAnchors}</StatValue>
                      <StatLabel>Anchors</StatLabel>
                    </StatCard>
                  </StatGrid>
                </ScoreGrid>
              </PanelBody>
            </Panel>

            {/* ── Warnings ── */}
            {(ing?.warnings?.length ?? 0) > 0 && (
              <Panel>
                <PanelHeader>
                  <PanelTitle>Warnings ({ing!.warnings.length})</PanelTitle>
                </PanelHeader>
                {ing!.warnings.map((w, i) => (
                  <WarningRow key={i} $severity={w.severity}>
                    <SeverityDot $color={SEVERITY_COLORS[w.severity] || neutral[400]} />
                    <WarningMessage>{w.message}</WarningMessage>
                    {w.pageRef && <WarningMeta>p.{w.pageRef}</WarningMeta>}
                  </WarningRow>
                ))}
              </Panel>
            )}

            {/* ── Sections ── */}
            <Panel>
              <PanelHeader>
                <PanelTitle>Detected Sections ({report.sections.length})</PanelTitle>
              </PanelHeader>
              {report.sections.length === 0 ? (
                <EmptyState>No structured sections detected</EmptyState>
              ) : (
                report.sections.map(s => {
                  const cfg = SECTION_TYPE_CONFIG[s.type as FormSectionType] || SECTION_TYPE_CONFIG.general;
                  return (
                    <SectionRow key={s.id}>
                      <SectionBadge $color={cfg.color}>{cfg.label}</SectionBadge>
                      <SectionTitle>{s.title}</SectionTitle>
                      <PageRef>
                        {s.pageRefs.length === 1
                          ? `p.${s.pageRefs[0]}`
                          : `p.${Math.min(...s.pageRefs)}-${Math.max(...s.pageRefs)}`}
                      </PageRef>
                      <ChunkMeta>{s.anchors?.length || 0} anchors</ChunkMeta>
                    </SectionRow>
                  );
                })
              )}
            </Panel>

            {/* ── Chunks ── */}
            <Panel>
              <PanelHeader>
                <PanelTitle>Chunks ({report.chunks.length})</PanelTitle>
              </PanelHeader>
              {report.chunks.length === 0 ? (
                <EmptyState>No chunks produced</EmptyState>
              ) : (
                report.chunks.map(chunk => {
                  const expanded = expandedChunks.has(chunk.index);
                  return (
                    <ChunkCard key={chunk.id} $expanded={expanded}>
                      <ChunkHeader onClick={() => toggleChunk(chunk.index)}>
                        <ChunkIndex>#{chunk.index}</ChunkIndex>
                        <SectionTitle>
                          {chunk.sectionPath || 'General'}
                        </SectionTitle>
                        {chunk.anchors?.map((a, i) => (
                          <AnchorTag key={i} title={a.hash}>
                            #{a.slug}
                          </AnchorTag>
                        )).slice(0, 3)}
                        {(chunk.anchors?.length || 0) > 3 && (
                          <ChunkMeta>+{chunk.anchors!.length - 3} more</ChunkMeta>
                        )}
                        <PageRef>p.{chunk.pageStart}{chunk.pageEnd !== chunk.pageStart ? `-${chunk.pageEnd}` : ''}</PageRef>
                        <ChunkMeta>{chunk.charCount.toLocaleString()} chars</ChunkMeta>
                        <span style={{ fontSize: T.captionSm.size }}>{expanded ? '▾' : '▸'}</span>
                      </ChunkHeader>
                      {expanded && (
                        <ChunkText>{chunk.text}</ChunkText>
                      )}
                    </ChunkCard>
                  );
                })
              )}
            </Panel>
          </>
        )}
      </Container>
    </Page>
  );
};

export default IngestionReportPage;
