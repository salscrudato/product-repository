/**
 * AnalyticsDashboard – /analytics
 *
 * Leadership view: readiness, cycle time, approvals backlog, blockers, QA pass rate.
 * All five metrics are shown as summary cards with expandable drill-down panels.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import logger, { LOG_CATEGORIES } from '../utils/logger';
import {
  color, neutral, accent, space, radius, shadow, fontFamily, type as T,
  border, duration, focusRingStyle, semantic,
} from '../ui/tokens';
import { useRoleContext } from '../context/RoleContext';
import {
  refreshPortfolioSnapshot,
  getPortfolioSnapshot,
} from '../services/analyticsService';
import type { PortfolioSnapshot } from '../types/analytics';
import MainNavigation from '../components/ui/Navigation';
import {
  READINESS_GRADE_COLORS,
  BLOCKER_TYPE_CONFIG,
  scoreToGrade,
  type ReadinessGrade,
  type ProductReadinessMetric,
  type CycleTimeEntry,
  type PendingChangeSetEntry,
  type ApprovalBacklogEntry,
  type BlockerEntry,
  type QARunSummaryEntry,
  type QARateProgramEntry,
} from '../types/analytics';

// ════════════════════════════════════════════════════════════════════════
// Styled Components
// ════════════════════════════════════════════════════════════════════════

const Page = styled.main`
  min-height: 100vh;
  background: ${neutral[50]};
  padding: ${space[8]} ${space[8]} ${space[16]};
`;

const PageHeader = styled.header`
  max-width: 1400px;
  margin: 0 auto ${space[6]};
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${space[4]};
  flex-wrap: wrap;
`;

const TitleBlock = styled.div``;

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

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[3]};
`;

const AnalyticsProductSelect = styled.select`
  padding: ${space[2]} ${space[3]};
  font-family: ${fontFamily.sans};
  font-size: ${T.label.size};
  color: ${color.text};
  background: ${color.bg};
  border: ${border.default};
  border-radius: ${radius.sm};
  cursor: pointer;
  min-width: 180px;
  &:focus { outline: none; border-color: ${accent[500]}; }
`;

const RefreshButton = styled.button<{ $spinning?: boolean }>`
  padding: ${space[2]} ${space[4]};
  font-family: ${fontFamily.sans};
  font-size: ${T.label.size};
  font-weight: 600;
  color: ${accent[600]};
  background: ${color.bg};
  border: ${border.default};
  border-radius: ${radius.sm};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${space[2]};
  transition: all ${duration.fast};
  &:hover { background: ${neutral[50]}; border-color: ${accent[300]}; }
  &:focus-visible { ${focusRingStyle} }
`;

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;
const SpinIcon = styled.span<{ $spinning?: boolean }>`
  display: inline-block;
  animation: ${p => p.$spinning ? spin : 'none'} 1s linear infinite;
`;

const Content = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

// ── Summary Cards Row ──

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: ${space[4]};
  margin-bottom: ${space[6]};
  @media (max-width: 1280px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const SummaryCard = styled.button<{ $active?: boolean }>`
  background: ${color.bg};
  border: ${p => p.$active ? `2px solid ${accent[500]}` : border.default};
  border-radius: ${radius.lg};
  box-shadow: ${p => p.$active ? shadow.md : shadow.card};
  padding: ${space[5]};
  text-align: left;
  cursor: pointer;
  transition: all ${duration.fast};
  &:hover { box-shadow: ${shadow.cardHover}; transform: translateY(-1px); }
  &:focus-visible { ${focusRingStyle} }
`;

const CardLabel = styled.div`
  font-size: ${T.captionSm.size};
  font-weight: ${T.overline.weight};
  letter-spacing: ${T.overline.letterSpacing};
  color: ${color.textMuted};
  text-transform: uppercase;
  margin-bottom: ${space[2]};
`;

const CardValue = styled.div`
  font-family: ${fontFamily.mono};
  font-size: ${T.displaySm.size};
  font-weight: 700;
  color: ${color.text};
  line-height: 1;
  margin-bottom: ${space[1]};
`;

const CardSub = styled.div`
  font-size: ${T.captionSm.size};
  color: ${color.textSecondary};
`;

// ── Drill-Down Panel ──

const DrillPanel = styled.section`
  background: ${color.bg};
  border: ${border.default};
  border-radius: ${radius.lg};
  box-shadow: ${shadow.card};
  margin-bottom: ${space[6]};
  overflow: hidden;
`;

const DrillHeader = styled.div`
  padding: ${space[5]} ${space[6]};
  border-bottom: ${border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const DrillTitle = styled.h2`
  font-family: ${fontFamily.sans};
  font-size: ${T.headingMd.size};
  font-weight: ${T.headingMd.weight};
  color: ${color.text};
  margin: 0;
`;

const DrillBody = styled.div`
  padding: ${space[5]} ${space[6]};
`;

// ── Shared row styles ──

const Row = styled.div`
  padding: ${space[3]} 0;
  border-bottom: ${border.light};
  display: flex;
  align-items: center;
  gap: ${space[3]};
  &:last-child { border-bottom: none; }
`;

const RowName = styled.span`
  font-size: ${T.bodySm.size};
  font-weight: 500;
  color: ${color.text};
  flex: 1;
`;

const RowMeta = styled.span`
  font-size: ${T.captionSm.size};
  color: ${color.textMuted};
`;

const RowValue = styled.span`
  font-family: ${fontFamily.mono};
  font-size: ${T.bodySm.size};
  font-weight: 600;
  color: ${accent[700]};
  text-align: right;
  min-width: 60px;
`;

const Badge = styled.span<{ $color: string }>`
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

const GradeCircle = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-family: ${fontFamily.mono};
  font-size: ${T.label.size};
  font-weight: 700;
  color: ${color.bg};
  background: ${p => p.$color};
`;

const ScoreBar = styled.div`
  width: 80px;
  height: 6px;
  background: ${neutral[200]};
  border-radius: ${radius.full};
  overflow: hidden;
`;

const ScoreBarFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${p => p.$pct}%;
  background: ${p => p.$color};
  border-radius: ${radius.full};
  transition: width ${duration.slow};
`;

const SeverityDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${p => p.$color};
  flex-shrink: 0;
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
  font-size: ${T.bodySm.size};
`;

const PassRateBar = styled.div`
  display: flex;
  gap: 1px;
  height: 24px;
  border-radius: ${radius.xs};
  overflow: hidden;
  flex: 1;
`;

const PassRateSegment = styled.div<{ $pct: number; $color: string }>`
  width: ${p => p.$pct}%;
  background: ${p => p.$color};
  min-width: ${p => p.$pct > 0 ? '4px' : '0'};
`;

const SectionLabel = styled.div`
  font-size: ${T.overline.size};
  font-weight: ${T.overline.weight};
  letter-spacing: ${T.overline.letterSpacing};
  color: ${color.textMuted};
  text-transform: uppercase;
  margin-bottom: ${space[3]};
  margin-top: ${space[5]};
  &:first-child { margin-top: 0; }
`;

const MetricRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: ${space[3]};
  margin-bottom: ${space[5]};
`;

const MiniCard = styled.div`
  padding: ${space[3]} ${space[4]};
  background: ${neutral[50]};
  border: ${border.light};
  border-radius: ${radius.md};
  text-align: center;
`;

const MiniValue = styled.div`
  font-family: ${fontFamily.mono};
  font-size: ${T.headingSm.size};
  font-weight: 700;
  color: ${color.text};
`;

const MiniLabel = styled.div`
  font-size: ${T.captionSm.size};
  color: ${color.textSecondary};
  margin-top: ${space[0.5]};
`;

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

type ActiveSection = 'readiness' | 'cycle' | 'approvals' | 'blockers' | 'qa';

const SEVERITY_COLORS: Record<string, string> = {
  critical: semantic.error,
  high: accent[500],
  medium: semantic.warning,
  low: neutral[400],
};

const AnalyticsDashboard: React.FC = () => {
  const { currentOrgId } = useRoleContext();
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('readiness');
  const [productFilter, setProductFilter] = useState('');

  // ── Initial load: try cached snapshot ──
  useEffect(() => {
    if (!currentOrgId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const cached = await getPortfolioSnapshot(currentOrgId);
        if (cached && !cancelled) setSnapshot(cached);
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [currentOrgId]);

  // ── Refresh ──
  const handleRefresh = useCallback(async () => {
    if (!currentOrgId || refreshing) return;
    setRefreshing(true);
    try {
      const fresh = await refreshPortfolioSnapshot(currentOrgId);
      setSnapshot(fresh);
    } catch (err) {
      logger.warn(LOG_CATEGORIES.DATA, 'Analytics refresh failed', { error: String(err) });
    }
    setRefreshing(false);
  }, [currentOrgId, refreshing]);

  const productOptions = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.products
      .map(p => ({ id: p.productId, name: p.productName }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [snapshot]);

  // Filter snapshot data by selected product
  const filteredSnapshot = useMemo(() => {
    if (!snapshot || !productFilter) return snapshot;
    return {
      ...snapshot,
      products: snapshot.products.filter(p => p.productId === productFilter),
      cycleTime: {
        ...snapshot.cycleTime,
        recentCycleTimes: snapshot.cycleTime.recentCycleTimes.filter(
          (c: CycleTimeEntry) => c.productId === productFilter,
        ),
      },
      approvalsBacklog: {
        ...snapshot.approvalsBacklog,
        pendingChangeSets: snapshot.approvalsBacklog.pendingChangeSets.filter(
          (c: PendingChangeSetEntry) => c.productId === productFilter,
        ),
      },
      blockers: {
        ...snapshot.blockers,
        entries: snapshot.blockers.entries.filter(
          (b: BlockerEntry) => b.productId === productFilter,
        ),
      },
      qaPassRate: {
        ...snapshot.qaPassRate,
        recentRuns: snapshot.qaPassRate.recentRuns.filter(
          (r: QARunSummaryEntry) => r.productId === productFilter,
        ),
        byRateProgram: snapshot.qaPassRate.byRateProgram.filter(
          (r: QARateProgramEntry) => r.productId === productFilter,
        ),
      },
    };
  }, [snapshot, productFilter]);

  if (loading) return <Page><Spinner>Loading analytics...</Spinner></Page>;

  const s = filteredSnapshot;

  return (
    <Page id="main-content">
      <MainNavigation />
      <PageHeader>
        <TitleBlock>
          <Title>Portfolio Analytics</Title>
          <Subtitle>Readiness, throughput, and blockers across all products</Subtitle>
        </TitleBlock>
        <HeaderActions>
          {productOptions.length > 0 && (
            <AnalyticsProductSelect
              value={productFilter}
              onChange={e => setProductFilter(e.target.value)}
              aria-label="Filter by product"
            >
              <option value="">All Products</option>
              {productOptions.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </AnalyticsProductSelect>
          )}
          <RefreshButton onClick={handleRefresh} disabled={refreshing}>
            <SpinIcon $spinning={refreshing}>&#x21bb;</SpinIcon>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </RefreshButton>
        </HeaderActions>
      </PageHeader>

      <Content>
        {!s ? (
          <DrillPanel>
            <EmptyState>
              No analytics data yet. Click "Refresh" to compute your first portfolio snapshot.
            </EmptyState>
          </DrillPanel>
        ) : (
          <>
            {/* ── Summary Cards ── */}
            <SummaryGrid>
              <SummaryCard
                $active={activeSection === 'readiness'}
                onClick={() => setActiveSection('readiness')}
              >
                <CardLabel>Readiness</CardLabel>
                <CardValue>
                  <span style={{ color: READINESS_GRADE_COLORS[s.overallGrade] }}>
                    {s.overallGrade}
                  </span>
                </CardValue>
                <CardSub>{s.overallReadinessScore}% across {s.products.length} products</CardSub>
              </SummaryCard>

              <SummaryCard
                $active={activeSection === 'cycle'}
                onClick={() => setActiveSection('cycle')}
              >
                <CardLabel>Cycle Time</CardLabel>
                <CardValue>{s.cycleTime.avgDaysToPublish}d</CardValue>
                <CardSub>avg days to publish</CardSub>
              </SummaryCard>

              <SummaryCard
                $active={activeSection === 'approvals'}
                onClick={() => setActiveSection('approvals')}
              >
                <CardLabel>Approvals</CardLabel>
                <CardValue style={{ color: s.approvalsBacklog.totalPending > 0 ? semantic.warning : semantic.success }}>
                  {s.approvalsBacklog.totalPending}
                </CardValue>
                <CardSub>pending approvals</CardSub>
              </SummaryCard>

              <SummaryCard
                $active={activeSection === 'blockers'}
                onClick={() => setActiveSection('blockers')}
              >
                <CardLabel>Blockers</CardLabel>
                <CardValue style={{ color: s.blockers.critical > 0 ? semantic.error : s.blockers.totalBlockers > 0 ? semantic.warning : semantic.success }}>
                  {s.blockers.totalBlockers}
                </CardValue>
                <CardSub>{s.blockers.critical} critical</CardSub>
              </SummaryCard>

              <SummaryCard
                $active={activeSection === 'qa'}
                onClick={() => setActiveSection('qa')}
              >
                <CardLabel>QA Pass Rate</CardLabel>
                <CardValue style={{ color: s.qaPassRate.overallPassRate >= 0.9 ? semantic.success : s.qaPassRate.overallPassRate >= 0.7 ? semantic.warning : semantic.error }}>
                  {Math.round(s.qaPassRate.overallPassRate * 100)}%
                </CardValue>
                <CardSub>{s.qaPassRate.totalRuns} runs</CardSub>
              </SummaryCard>
            </SummaryGrid>

            {/* ── Drill-down Panels ── */}

            {activeSection === 'readiness' && (
              <DrillPanel>
                <DrillHeader>
                  <DrillTitle>Product Readiness</DrillTitle>
                  <Badge $color={READINESS_GRADE_COLORS[s.overallGrade]}>
                    Overall: {s.overallGrade} ({s.overallReadinessScore}%)
                  </Badge>
                </DrillHeader>
                <DrillBody>
                  {s.products.length === 0 ? (
                    <EmptyState>No products found</EmptyState>
                  ) : (
                    s.products
                      .sort((a, b) => a.readinessScore - b.readinessScore)
                      .map(p => (
                        <Row key={p.productId}>
                          <GradeCircle $color={READINESS_GRADE_COLORS[p.grade]}>
                            {p.grade}
                          </GradeCircle>
                          <RowName>{p.productName}</RowName>
                          <div style={{ display: 'flex', gap: space[3], alignItems: 'center' }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: T.captionSm.size, color: color.textMuted }}>Forms</div>
                              <ScoreBar><ScoreBarFill $pct={p.formScore} $color={READINESS_GRADE_COLORS[scoreToGrade(p.formScore)]} /></ScoreBar>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: T.captionSm.size, color: color.textMuted }}>Rules</div>
                              <ScoreBar><ScoreBarFill $pct={p.ruleScore} $color={READINESS_GRADE_COLORS[scoreToGrade(p.ruleScore)]} /></ScoreBar>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: T.captionSm.size, color: color.textMuted }}>Rates</div>
                              <ScoreBar><ScoreBarFill $pct={p.rateScore} $color={READINESS_GRADE_COLORS[scoreToGrade(p.rateScore)]} /></ScoreBar>
                            </div>
                          </div>
                          <RowMeta>
                            {p.statesActive}/{p.statesTotal} states
                          </RowMeta>
                          <RowValue>{p.readinessScore}%</RowValue>
                        </Row>
                      ))
                  )}
                  {/* Blockers summary */}
                  {s.products.some(p => p.blockers.length > 0) && (
                    <>
                      <SectionLabel>Top Blockers</SectionLabel>
                      {s.products
                        .filter(p => p.blockers.length > 0)
                        .flatMap(p => p.blockers.map(b => ({ product: p.productName, blocker: b })))
                        .slice(0, 10)
                        .map((b, i) => (
                          <Row key={i}>
                            <SeverityDot $color={semantic.warning} />
                            <RowName>{b.product}</RowName>
                            <RowMeta style={{ flex: 2 }}>{b.blocker}</RowMeta>
                          </Row>
                        ))}
                    </>
                  )}
                </DrillBody>
              </DrillPanel>
            )}

            {activeSection === 'cycle' && (
              <DrillPanel>
                <DrillHeader>
                  <DrillTitle>Change Set Cycle Time</DrillTitle>
                </DrillHeader>
                <DrillBody>
                  <MetricRow>
                    <MiniCard>
                      <MiniValue>{s.cycleTime.avgDaysToPublish}d</MiniValue>
                      <MiniLabel>Avg Total</MiniLabel>
                    </MiniCard>
                    <MiniCard>
                      <MiniValue>{s.cycleTime.medianDaysToPublish}d</MiniValue>
                      <MiniLabel>Median Total</MiniLabel>
                    </MiniCard>
                    <MiniCard>
                      <MiniValue>{s.cycleTime.avgDaysToReview}d</MiniValue>
                      <MiniLabel>Avg Draft Phase</MiniLabel>
                    </MiniCard>
                    <MiniCard>
                      <MiniValue>{s.cycleTime.avgDaysToApprove}d</MiniValue>
                      <MiniLabel>Avg Review Phase</MiniLabel>
                    </MiniCard>
                    <MiniCard>
                      <MiniValue>{s.cycleTime.avgDaysToPublishAfterApproval}d</MiniValue>
                      <MiniLabel>Avg Post-Approval</MiniLabel>
                    </MiniCard>
                  </MetricRow>

                  <SectionLabel>Recent Change Sets</SectionLabel>
                  {s.cycleTime.recentCycleTimes.length === 0 ? (
                    <EmptyState>No change sets found</EmptyState>
                  ) : (
                    s.cycleTime.recentCycleTimes.map(ct => (
                      <Row key={ct.changeSetId}>
                        <RowName>{ct.changeSetName}</RowName>
                        <Badge $color={ct.status === 'published' ? semantic.success : ct.status === 'rejected' ? semantic.error : semantic.warning}>
                          {ct.status}
                        </Badge>
                        <RowValue>{ct.totalDays}d</RowValue>
                      </Row>
                    ))
                  )}
                </DrillBody>
              </DrillPanel>
            )}

            {activeSection === 'approvals' && (
              <DrillPanel>
                <DrillHeader>
                  <DrillTitle>Approvals Backlog</DrillTitle>
                  <Badge $color={s.approvalsBacklog.totalPending > 5 ? semantic.error : s.approvalsBacklog.totalPending > 0 ? semantic.warning : semantic.success}>
                    {s.approvalsBacklog.totalPending} pending
                  </Badge>
                </DrillHeader>
                <DrillBody>
                  {/* By role breakdown */}
                  <SectionLabel>By Role</SectionLabel>
                  {Object.keys(s.approvalsBacklog.byRole).length === 0 ? (
                    <EmptyState>No pending approvals</EmptyState>
                  ) : (
                    Object.values(s.approvalsBacklog.byRole).map(r => (
                      <Row key={r.role}>
                        <RowName>{r.roleName}</RowName>
                        <RowMeta>avg {r.avgWaitDays}d wait</RowMeta>
                        <Badge $color={r.oldestWaitDays > 7 ? semantic.error : r.oldestWaitDays > 3 ? semantic.warning : neutral[500]}>
                          oldest: {r.oldestWaitDays}d
                        </Badge>
                        <RowValue>{r.pendingCount}</RowValue>
                      </Row>
                    ))
                  )}

                  {/* Pending change sets */}
                  {s.approvalsBacklog.pendingChangeSets.length > 0 && (
                    <>
                      <SectionLabel>Waiting Change Sets</SectionLabel>
                      {s.approvalsBacklog.pendingChangeSets.map(cs => (
                        <Row key={cs.changeSetId}>
                          <RowName>{cs.changeSetName}</RowName>
                          <RowMeta>
                            needs: {cs.pendingRoles.join(', ')}
                          </RowMeta>
                          <Badge $color={cs.waitingDays > 7 ? semantic.error : semantic.warning}>
                            {cs.waitingDays}d
                          </Badge>
                          <RowMeta>{cs.itemCount} items</RowMeta>
                        </Row>
                      ))}
                    </>
                  )}
                </DrillBody>
              </DrillPanel>
            )}

            {activeSection === 'blockers' && (
              <DrillPanel>
                <DrillHeader>
                  <DrillTitle>Active Blockers</DrillTitle>
                  <div style={{ display: 'flex', gap: space[2] }}>
                    {s.blockers.critical > 0 && <Badge $color={semantic.error}>{s.blockers.critical} critical</Badge>}
                    {s.blockers.high > 0 && <Badge $color={accent[500]}>{s.blockers.high} high</Badge>}
                    {s.blockers.medium > 0 && <Badge $color={semantic.warning}>{s.blockers.medium} medium</Badge>}
                    {s.blockers.low > 0 && <Badge $color={neutral[400]}>{s.blockers.low} low</Badge>}
                  </div>
                </DrillHeader>
                <DrillBody>
                  {/* By type summary */}
                  <MetricRow>
                    {(Object.entries(s.blockers.byType) as [string, number][])
                      .filter(([, count]) => count > 0)
                      .map(([type, count]) => {
                        const config = BLOCKER_TYPE_CONFIG[type as keyof typeof BLOCKER_TYPE_CONFIG];
                        return (
                          <MiniCard key={type}>
                            <MiniValue style={{ color: config?.color || neutral[500] }}>{count}</MiniValue>
                            <MiniLabel>{config?.label || type}</MiniLabel>
                          </MiniCard>
                        );
                      })}
                  </MetricRow>

                  {/* Individual blockers */}
                  {s.blockers.entries.length === 0 ? (
                    <EmptyState>No active blockers — all clear!</EmptyState>
                  ) : (
                    s.blockers.entries.map((b, i) => (
                      <Row key={i}>
                        <SeverityDot $color={SEVERITY_COLORS[b.severity] || neutral[400]} />
                        <div style={{ flex: 1 }}>
                          <RowName>{b.message}</RowName>
                          {(b.productName || b.changeSetName) && (
                            <div style={{ fontSize: T.captionSm.size, color: color.textMuted }}>
                              {[b.productName, b.changeSetName].filter(Boolean).join(' • ')}
                            </div>
                          )}
                        </div>
                        <Badge $color={SEVERITY_COLORS[b.severity] || neutral[400]}>
                          {b.severity}
                        </Badge>
                      </Row>
                    ))
                  )}
                </DrillBody>
              </DrillPanel>
            )}

            {activeSection === 'qa' && (
              <DrillPanel>
                <DrillHeader>
                  <DrillTitle>QA Pass Rate</DrillTitle>
                  <Badge $color={s.qaPassRate.overallPassRate >= 0.9 ? semantic.success : semantic.warning}>
                    {Math.round(s.qaPassRate.overallPassRate * 100)}% overall
                  </Badge>
                </DrillHeader>
                <DrillBody>
                  <MetricRow>
                    <MiniCard>
                      <MiniValue style={{ color: semantic.success }}>{s.qaPassRate.passedRuns}</MiniValue>
                      <MiniLabel>Passed</MiniLabel>
                    </MiniCard>
                    <MiniCard>
                      <MiniValue style={{ color: semantic.error }}>{s.qaPassRate.failedRuns}</MiniValue>
                      <MiniLabel>Failed</MiniLabel>
                    </MiniCard>
                    <MiniCard>
                      <MiniValue style={{ color: semantic.warning }}>{s.qaPassRate.errorRuns}</MiniValue>
                      <MiniLabel>Errors</MiniLabel>
                    </MiniCard>
                    <MiniCard>
                      <MiniValue>{s.qaPassRate.totalRuns}</MiniValue>
                      <MiniLabel>Total Runs</MiniLabel>
                    </MiniCard>
                  </MetricRow>

                  {/* By rate program */}
                  {s.qaPassRate.byRateProgram.length > 0 && (
                    <>
                      <SectionLabel>By Rate Program</SectionLabel>
                      {s.qaPassRate.byRateProgram.map(rp => (
                        <Row key={rp.rateProgramId}>
                          <RowName>{rp.rateProgramName}</RowName>
                          <PassRateBar>
                            <PassRateSegment $pct={rp.passRate * 100} $color={semantic.success} />
                            <PassRateSegment $pct={(1 - rp.passRate) * 100} $color={semantic.error} />
                          </PassRateBar>
                          <RowValue>{Math.round(rp.passRate * 100)}%</RowValue>
                          <RowMeta>{rp.totalRuns} runs</RowMeta>
                        </Row>
                      ))}
                    </>
                  )}

                  {/* Recent runs */}
                  {s.qaPassRate.recentRuns.length > 0 && (
                    <>
                      <SectionLabel>Recent Runs</SectionLabel>
                      {s.qaPassRate.recentRuns.map(r => (
                        <Row key={r.runId}>
                          <SeverityDot $color={r.status === 'passed' ? semantic.success : r.status === 'failed' ? semantic.error : semantic.warning} />
                          <RowName>{r.rateProgramName}</RowName>
                          {r.changeSetName && <RowMeta>{r.changeSetName}</RowMeta>}
                          <RowMeta>{r.passedCount}/{r.totalScenarios} passed</RowMeta>
                          <Badge $color={r.status === 'passed' ? semantic.success : semantic.error}>
                            {r.status}
                          </Badge>
                        </Row>
                      ))}
                    </>
                  )}
                </DrillBody>
              </DrillPanel>
            )}
          </>
        )}
      </Content>
    </Page>
  );
};

export default AnalyticsDashboard;
