/**
 * PricingQATab – Scenario Library + Regression Runner
 *
 * Displays:
 *  1. Scenario list (create, edit, delete, tag filter)
 *  2. "Run All" button to execute regression against draft version
 *  3. QA run history with diff view
 *  4. Per-scenario diff: expected vs actual vs baseline
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled, { css, keyframes } from 'styled-components';
import {
  PlayIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  BeakerIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  TagIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { useRoleContext } from '../../context/RoleContext';
import {
  listScenarios, createScenario, deleteScenario,
  listQARuns, createQARun, updateQARun,
} from '../../services/scenarioService';
import { runRegression } from '../../engine/regressionRunner';
import type {
  Scenario, ScenarioTag, QARun, QARunScenarioResult, ScenarioFieldDiff,
} from '../../types/scenario';
import { SCENARIO_TAG_LABELS, QA_RUN_STATUS_CONFIG } from '../../types/scenario';
import type { RatingStep, RatingTableData } from '../../types/ratingEngine';
import {
  color, neutral, accent, semantic, space, radius, fontFamily,
  type as typeScale, shadow, border as borderTokens, transition,
  focusRingStyle, reducedMotion, duration, easing,
} from '../../ui/tokens';

// ════════════════════════════════════════════════════════════════════════
// Props
// ════════════════════════════════════════════════════════════════════════

interface PricingQATabProps {
  rateProgramId: string;
  rateProgramName: string;
  draftSteps: RatingStep[];
  draftVersionId: string;
  baselineSteps?: RatingStep[];
  baselineVersionId?: string;
  tables?: Map<string, RatingTableData>;
  changeSetId?: string;
  changeSetName?: string;
}

// ════════════════════════════════════════════════════════════════════════
// Animations
// ════════════════════════════════════════════════════════════════════════

const fadeIn = keyframes`from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}`;
const spin = keyframes`0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}`;

// ════════════════════════════════════════════════════════════════════════
// Styled Components
// ════════════════════════════════════════════════════════════════════════

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space[5]};
`;

const Card = styled.div<{ $delay?: number }>`
  background: ${color.bg};
  border: ${borderTokens.default};
  border-radius: ${radius.xl};
  box-shadow: ${shadow.card};
  padding: ${space[6]};
  animation: ${fadeIn} ${duration.normal} ${easing.out} ${({ $delay }) => ($delay ?? 0) * 60}ms backwards;
  @media ${reducedMotion} { animation: none; }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space[3]};
  margin-bottom: ${space[4]};
`;

const CardTitle = styled.h3`
  margin: 0;
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.headingSm.size};
  font-weight: ${typeScale.headingSm.weight};
  color: ${color.text};
  display: flex;
  align-items: center;
  gap: ${space[2]};
  svg { width: 18px; height: 18px; color: ${accent[500]}; }
`;

const ActionRow = styled.div`
  display: flex;
  gap: ${space[2]};
  align-items: center;
`;

const Btn = styled.button<{ $variant?: 'primary' | 'danger' | 'ghost' }>`
  all: unset;
  display: inline-flex;
  align-items: center;
  gap: ${space[1.5]};
  padding: ${space[2]} ${space[3]};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.caption.size};
  font-weight: 500;
  border-radius: ${radius.md};
  cursor: pointer;
  transition: all ${transition.fast};
  ${({ $variant = 'ghost' }) => {
    switch ($variant) {
      case 'primary': return css`background:${accent[500]};color:white;&:hover{background:${accent[600]};}`;
      case 'danger':  return css`background:${semantic.errorLight};color:${semantic.errorDark};&:hover{background:#fecaca;}`;
      default:        return css`background:${neutral[100]};color:${neutral[700]};border:1px solid ${neutral[200]};&:hover{background:${accent[50]};color:${accent[700]};border-color:${accent[200]};}`;
    }
  }}
  &:focus-visible { ${focusRingStyle} }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  svg { width: 14px; height: 14px; }
`;

const TagBadge = styled.span<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${space[1]};
  padding: 2px ${space[2]};
  border-radius: ${radius.full};
  font-size: ${typeScale.captionSm.size};
  font-weight: 500;
  cursor: pointer;
  transition: all ${transition.fast};
  ${({ $active }) => $active
    ? css`background:${accent[500]};color:white;`
    : css`background:${neutral[100]};color:${neutral[600]};border:1px solid ${neutral[200]};&:hover{background:${accent[50]};color:${accent[700]};}`
  }
`;

const ScenarioList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space[2]};
`;

const ScenarioRow = styled.div<{ $status?: string }>`
  display: flex;
  align-items: center;
  gap: ${space[3]};
  padding: ${space[3]} ${space[4]};
  border-radius: ${radius.lg};
  border: 1px solid ${neutral[200]};
  transition: all ${transition.fast};
  ${({ $status }) => {
    switch ($status) {
      case 'pass':  return css`border-left: 3px solid ${semantic.success};`;
      case 'fail':  return css`border-left: 3px solid ${semantic.error};`;
      case 'error': return css`border-left: 3px solid ${semantic.warning};`;
      default:      return css`border-left: 3px solid ${neutral[200]};`;
    }
  }}
  &:hover { box-shadow: ${shadow.sm}; }
`;

const ScenarioName = styled.div`
  flex: 1;
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.bodySm.size};
  font-weight: 500;
  color: ${color.text};
`;

const ScenarioMeta = styled.div`
  font-size: ${typeScale.captionSm.size};
  color: ${color.textMuted};
`;

const StatusIcon = styled.div<{ $status: string }>`
  width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  border-radius: ${radius.full};
  ${({ $status }) => {
    switch ($status) {
      case 'pass':  case 'passed':  return css`color:${semantic.success};background:${semantic.successLight};`;
      case 'fail':  case 'failed':  return css`color:${semantic.error};background:${semantic.errorLight};`;
      case 'error':                 return css`color:${semantic.warning};background:${semantic.warningLight};`;
      default:                      return css`color:${neutral[400]};background:${neutral[100]};`;
    }
  }}
  svg { width: 14px; height: 14px; }
`;

const DiffGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto auto auto;
  gap: ${space[1]} ${space[3]};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.captionSm.size};
  padding: ${space[3]};
  background: ${neutral[50]};
  border-radius: ${radius.md};
  margin-top: ${space[2]};
`;

const DiffHeader = styled.div`
  font-weight: 600;
  color: ${neutral[500]};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding-bottom: ${space[1]};
  border-bottom: 1px solid ${neutral[200]};
`;

const DiffCell = styled.div<{ $negative?: boolean; $positive?: boolean }>`
  font-family: ${fontFamily.mono};
  font-weight: 500;
  color: ${({ $negative, $positive }) =>
    $negative ? semantic.error : $positive ? semantic.success : color.text};
`;

const RunSummary = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: ${space[3]};
  margin-bottom: ${space[4]};
`;

const SummaryStat = styled.div<{ $color?: string }>`
  text-align: center;
  padding: ${space[4]};
  background: ${({ $color }) => $color ? `${$color}08` : neutral[50]};
  border: 1px solid ${({ $color }) => $color ? `${$color}25` : neutral[200]};
  border-radius: ${radius.lg};
`;

const StatVal = styled.div`
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.displaySm.size};
  font-weight: 700;
  color: ${color.text};
  line-height: 1;
`;

const StatLbl = styled.div`
  font-size: ${typeScale.captionSm.size};
  color: ${color.textMuted};
  font-weight: 500;
  margin-top: ${space[1]};
`;

const Spinner = styled.div`
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid currentColor; border-top-color: transparent;
  animation: ${spin} 0.6s linear infinite;
  display: inline-block;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${space[8]};
  color: ${neutral[400]};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.bodySm.size};
  svg { width: 40px; height: 40px; margin: 0 auto ${space[3]}; }
`;

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

export default function PricingQATab({
  rateProgramId, rateProgramName,
  draftSteps, draftVersionId,
  baselineSteps, baselineVersionId,
  tables, changeSetId, changeSetName,
}: PricingQATabProps) {
  const { currentOrgId: orgId } = useRoleContext();

  // Data
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [runs, setRuns] = useState<QARun[]>([]);
  const [loading, setLoading] = useState(true);

  // Run state
  const [running, setRunning] = useState(false);
  const [latestRun, setLatestRun] = useState<QARun | null>(null);
  const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(new Set());

  // Filters
  const [selectedTags, setSelectedTags] = useState<Set<ScenarioTag>>(new Set());

  // Load scenarios and runs
  useEffect(() => {
    if (!orgId) return;
    (async () => {
      setLoading(true);
      const [scenList, runList] = await Promise.all([
        listScenarios(orgId, { rateProgramId, activeOnly: true }),
        listQARuns(orgId, changeSetId ? { changeSetId } : { rateProgramId }),
      ]);
      setScenarios(scenList);
      setRuns(runList);
      if (runList.length > 0) setLatestRun(runList[0]);
      setLoading(false);
    })();
  }, [orgId, rateProgramId, changeSetId]);

  // Filter scenarios by tag
  const filteredScenarios = useMemo(() => {
    if (selectedTags.size === 0) return scenarios;
    return scenarios.filter(s => s.tags.some(t => selectedTags.has(t)));
  }, [scenarios, selectedTags]);

  // Run regression
  const handleRunAll = useCallback(async () => {
    if (!orgId || running) return;
    setRunning(true);

    try {
      const result = runRegression({
        scenarios: filteredScenarios,
        draftSteps,
        draftVersionId,
        baselineSteps,
        baselineVersionId,
        tables,
      });

      const run = await createQARun(orgId, {
        changeSetId,
        changeSetName,
        rateProgramId,
        rateProgramName,
        draftVersionId,
        baselineVersionId,
        status: result.status,
        totalScenarios: result.totalScenarios,
        passedCount: result.passedCount,
        failedCount: result.failedCount,
        errorCount: result.errorCount,
        results: result.results,
        totalExecutionTimeMs: result.totalExecutionTimeMs,
      });

      setLatestRun(run);
      setRuns(prev => [run, ...prev]);
    } catch (err) {
      console.error('Regression run failed:', err);
    } finally {
      setRunning(false);
    }
  }, [orgId, running, filteredScenarios, draftSteps, draftVersionId, baselineSteps, baselineVersionId, tables, changeSetId, changeSetName, rateProgramId, rateProgramName]);

  // Get result for a scenario from the latest run
  const getResult = (scenarioId: string): QARunScenarioResult | undefined => {
    return latestRun?.results?.find(r => r.scenarioId === scenarioId);
  };

  const toggleExpand = (id: string) => {
    setExpandedScenarios(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTag = (tag: ScenarioTag) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  if (loading) {
    return <Card><div style={{ textAlign: 'center', padding: space[8] }}><Spinner /></div></Card>;
  }

  return (
    <Container>
      {/* Run summary (if latest run exists) */}
      {latestRun && (
        <Card $delay={0}>
          <CardHeader>
            <CardTitle>
              <StatusIcon $status={latestRun.status}>
                {latestRun.status === 'passed' ? <CheckCircleIcon /> :
                 latestRun.status === 'failed' ? <XCircleIcon /> :
                 <ExclamationTriangleIcon />}
              </StatusIcon>
              Latest QA Run – {QA_RUN_STATUS_CONFIG[latestRun.status].label}
            </CardTitle>
            <ScenarioMeta>
              {latestRun.totalExecutionTimeMs.toFixed(0)}ms
            </ScenarioMeta>
          </CardHeader>

          <RunSummary>
            <SummaryStat $color={semantic.success}>
              <StatVal>{latestRun.passedCount}</StatVal>
              <StatLbl>Passed</StatLbl>
            </SummaryStat>
            <SummaryStat $color={semantic.error}>
              <StatVal>{latestRun.failedCount}</StatVal>
              <StatLbl>Failed</StatLbl>
            </SummaryStat>
            <SummaryStat $color={semantic.warning}>
              <StatVal>{latestRun.errorCount}</StatVal>
              <StatLbl>Errors</StatLbl>
            </SummaryStat>
            <SummaryStat $color={accent[500]}>
              <StatVal>{latestRun.totalScenarios}</StatVal>
              <StatLbl>Total</StatLbl>
            </SummaryStat>
          </RunSummary>
        </Card>
      )}

      {/* Scenario library */}
      <Card $delay={1}>
        <CardHeader>
          <CardTitle><BeakerIcon /> Scenario Library ({filteredScenarios.length})</CardTitle>
          <ActionRow>
            <Btn $variant="primary" onClick={handleRunAll} disabled={running || filteredScenarios.length === 0}>
              {running ? <Spinner /> : <PlayIcon />}
              {running ? 'Running…' : 'Run All'}
            </Btn>
          </ActionRow>
        </CardHeader>

        {/* Tag filters */}
        <ActionRow style={{ marginBottom: space[4], flexWrap: 'wrap' }}>
          <FunnelIcon style={{ width: 14, height: 14, color: neutral[400] }} />
          {(Object.keys(SCENARIO_TAG_LABELS) as ScenarioTag[]).map(tag => (
            <TagBadge key={tag} $active={selectedTags.has(tag)} onClick={() => toggleTag(tag)}>
              {SCENARIO_TAG_LABELS[tag]}
            </TagBadge>
          ))}
        </ActionRow>

        {filteredScenarios.length === 0 ? (
          <EmptyState>
            <BeakerIcon />
            No scenarios found for this rate program.
          </EmptyState>
        ) : (
          <ScenarioList>
            {filteredScenarios.map(scenario => {
              const result = getResult(scenario.id);
              const isExpanded = expandedScenarios.has(scenario.id);

              return (
                <div key={scenario.id}>
                  <ScenarioRow $status={result?.status} onClick={() => toggleExpand(scenario.id)} style={{ cursor: 'pointer' }}>
                    {isExpanded ? <ChevronDownIcon style={{ width: 16, height: 16, color: neutral[400] }} /> : <ChevronRightIcon style={{ width: 16, height: 16, color: neutral[400] }} />}

                    {result && (
                      <StatusIcon $status={result.status}>
                        {result.status === 'pass' ? <CheckCircleIcon /> :
                         result.status === 'fail' ? <XCircleIcon /> :
                         <ExclamationTriangleIcon />}
                      </StatusIcon>
                    )}

                    <ScenarioName>{scenario.name}</ScenarioName>

                    {scenario.isRequired && (
                      <TagBadge $active style={{ background: semantic.error, fontSize: '10px', cursor: 'default' }}>Required</TagBadge>
                    )}

                    {scenario.tags.map(t => (
                      <TagBadge key={t} style={{ cursor: 'default' }}>{SCENARIO_TAG_LABELS[t]}</TagBadge>
                    ))}

                    {result && (
                      <ScenarioMeta>{result.executionTimeMs.toFixed(1)}ms</ScenarioMeta>
                    )}
                  </ScenarioRow>

                  {/* Expanded diff view */}
                  {isExpanded && result && (
                    result.diffs.length > 0 ? (
                      <DiffGrid>
                        <DiffHeader>Field</DiffHeader>
                        <DiffHeader>Expected</DiffHeader>
                        <DiffHeader>Actual</DiffHeader>
                        <DiffHeader>Delta</DiffHeader>
                        <DiffHeader>% Change</DiffHeader>
                        {result.diffs.map(d => (
                          <React.Fragment key={d.fieldCode}>
                            <DiffCell>{d.fieldCode}</DiffCell>
                            <DiffCell>{d.expected.toFixed(2)}</DiffCell>
                            <DiffCell>{d.actual.toFixed(2)}</DiffCell>
                            <DiffCell $negative={d.delta < 0} $positive={d.delta > 0}>
                              {d.delta > 0 ? '+' : ''}{d.delta.toFixed(2)}
                            </DiffCell>
                            <DiffCell $negative={d.pctChange < 0} $positive={d.pctChange > 0}>
                              {d.pctChange > 0 ? '+' : ''}{d.pctChange.toFixed(2)}%
                            </DiffCell>
                          </React.Fragment>
                        ))}
                      </DiffGrid>
                    ) : result.status === 'pass' ? (
                      <div style={{ padding: `${space[3]} ${space[4]}`, fontSize: typeScale.caption.size, color: semantic.success }}>
                        All outputs match expected values within tolerance.
                      </div>
                    ) : result.errorMessage ? (
                      <div style={{ padding: `${space[3]} ${space[4]}`, fontSize: typeScale.caption.size, color: semantic.error }}>
                        Error: {result.errorMessage}
                      </div>
                    ) : null
                  )}
                </div>
              );
            })}
          </ScenarioList>
        )}
      </Card>

      {/* Run history */}
      {runs.length > 1 && (
        <Card $delay={2}>
          <CardTitle style={{ marginBottom: space[3] }}><ClockIcon /> Run History</CardTitle>
          {runs.slice(0, 10).map(run => (
            <ScenarioRow key={run.id} $status={run.status} style={{ cursor: 'pointer' }} onClick={() => setLatestRun(run)}>
              <StatusIcon $status={run.status}>
                {run.status === 'passed' ? <CheckCircleIcon /> :
                 run.status === 'failed' ? <XCircleIcon /> :
                 <ExclamationTriangleIcon />}
              </StatusIcon>
              <ScenarioName>
                {run.passedCount}/{run.totalScenarios} passed
                {run.changeSetName && <span style={{ color: neutral[400], marginLeft: space[2] }}>• {run.changeSetName}</span>}
              </ScenarioName>
              <ScenarioMeta>{run.totalExecutionTimeMs.toFixed(0)}ms</ScenarioMeta>
            </ScenarioRow>
          ))}
        </Card>
      )}
    </Container>
  );
}
