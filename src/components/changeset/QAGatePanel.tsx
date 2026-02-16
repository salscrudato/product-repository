/**
 * QAGatePanel – Inline panel shown on ChangeSetDetail to display QA gate status.
 *
 * Shows:
 *  - Latest QA run summary for this change set
 *  - Gate pass/fail status
 *  - "Run QA" action button
 *  - Configurable gate mode selector (admin only)
 *  - Blocking/advisory message
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { css, keyframes } from 'styled-components';
import {
  ShieldCheckIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import { useRoleContext } from '../../context/RoleContext';
import { listQARuns } from '../../services/scenarioService';
import { evaluateQAGate } from '../../engine/regressionRunner';
import type { QARun, QAGateConfig, QAGateMode, QAPreflightResult } from '../../types/scenario';
import { DEFAULT_QA_GATE_CONFIG, QA_GATE_MODE_LABELS, QA_RUN_STATUS_CONFIG } from '../../types/scenario';
import {
  color, neutral, accent, semantic, space, radius, fontFamily,
  type as typeScale, shadow, border as borderTokens, transition,
  focusRingStyle, reducedMotion, duration, easing,
} from '../../ui/tokens';

// ════════════════════════════════════════════════════════════════════════
// Props
// ════════════════════════════════════════════════════════════════════════

interface QAGatePanelProps {
  changeSetId: string;
  changeSetStatus: string;
  /** Called by parent to refresh publish eligibility */
  onGateResult?: (result: QAPreflightResult) => void;
}

// ════════════════════════════════════════════════════════════════════════
// Styled
// ════════════════════════════════════════════════════════════════════════

const fadeIn = keyframes`from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}`;
const spin = keyframes`0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}`;

const Panel = styled.div<{ $status?: string }>`
  background: ${color.bg};
  border: ${borderTokens.default};
  border-radius: ${radius.xl};
  box-shadow: ${shadow.card};
  padding: ${space[5]};
  animation: ${fadeIn} ${duration.normal} ${easing.out};
  @media ${reducedMotion} { animation: none; }
  ${({ $status }) => {
    switch ($status) {
      case 'passed':  return css`border-left: 4px solid ${semantic.success};`;
      case 'failed':  return css`border-left: 4px solid ${semantic.error};`;
      case 'running': return css`border-left: 4px solid ${semantic.info};`;
      default:        return css`border-left: 4px solid ${neutral[300]};`;
    }
  }}
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space[3]};
  margin-bottom: ${space[3]};
`;

const Title = styled.h3`
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

const StatusBadge = styled.div<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${space[1]};
  padding: ${space[1]} ${space[2.5]};
  border-radius: ${radius.full};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.captionSm.size};
  font-weight: 600;
  ${({ $status }) => {
    switch ($status) {
      case 'passed':  return css`background:${semantic.successLight};color:${semantic.successDark};`;
      case 'failed':  return css`background:${semantic.errorLight};color:${semantic.errorDark};`;
      case 'running': return css`background:${semantic.infoLight};color:${semantic.infoDark};`;
      default:        return css`background:${neutral[100]};color:${neutral[500]};`;
    }
  }}
  svg { width: 12px; height: 12px; }
`;

const Stats = styled.div`
  display: flex;
  gap: ${space[4]};
  margin-bottom: ${space[3]};
  flex-wrap: wrap;
`;

const Stat = styled.div`
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.caption.size};
  color: ${color.textSecondary};
  span { font-weight: 600; color: ${color.text}; }
`;

const IssuesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space[1.5]};
  margin-top: ${space[3]};
`;

const Issue = styled.div<{ $type: string }>`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  padding: ${space[2]} ${space[3]};
  border-radius: ${radius.md};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.caption.size};
  ${({ $type }) => $type === 'error'
    ? css`background:${semantic.errorLight};color:${semantic.errorDark};`
    : css`background:${semantic.warningLight};color:${semantic.warningDark};`
  }
  svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

const Btn = styled.button<{ $variant?: 'primary' | 'ghost' }>`
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
  ${({ $variant = 'ghost' }) => $variant === 'primary'
    ? css`background:${accent[500]};color:white;&:hover{background:${accent[600]};}`
    : css`background:${neutral[100]};color:${neutral[700]};border:1px solid ${neutral[200]};&:hover{background:${accent[50]};color:${accent[700]};}`
  }
  &:focus-visible { ${focusRingStyle} }
  svg { width: 14px; height: 14px; }
`;

const Spinner = styled.div`
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid currentColor; border-top-color: transparent;
  animation: ${spin} 0.6s linear infinite;
  display: inline-block;
`;

const ModeSelect = styled.select`
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.captionSm.size};
  padding: ${space[1]} ${space[2]};
  border: ${borderTokens.default};
  border-radius: ${radius.sm};
  background: ${color.bg};
  color: ${color.text};
  cursor: pointer;
  &:focus { border-color: ${accent[500]}; outline: none; }
`;

const NoRunState = styled.div`
  text-align: center;
  padding: ${space[4]};
  color: ${neutral[400]};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.bodySm.size};
  svg { width: 32px; height: 32px; margin: 0 auto ${space[2]}; }
`;

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

export default function QAGatePanel({ changeSetId, changeSetStatus, onGateResult }: QAGatePanelProps) {
  const { currentOrgId: orgId, isOrgAdmin } = useRoleContext();
  const [latestRun, setLatestRun] = useState<QARun | null>(null);
  const [loading, setLoading] = useState(true);
  const [gateConfig, setGateConfig] = useState<QAGateConfig>({ ...DEFAULT_QA_GATE_CONFIG });
  const [gateResult, setGateResult] = useState<QAPreflightResult | null>(null);

  // Load latest QA run for this change set
  useEffect(() => {
    if (!orgId || !changeSetId) return;
    (async () => {
      setLoading(true);
      const runs = await listQARuns(orgId, { changeSetId });
      const latest = runs.length > 0 ? runs[0] : null;
      setLatestRun(latest);

      // Evaluate gate
      if (latest) {
        const result = evaluateQAGate(gateConfig, {
          status: latest.status,
          totalScenarios: latest.totalScenarios,
          passedCount: latest.passedCount,
          failedCount: latest.failedCount,
          errorCount: latest.errorCount,
          results: latest.results,
        }, []); // scenarios not needed for pass-rate check
        setGateResult(result);
        onGateResult?.(result);
      } else if (gateConfig.mode === 'required') {
        const noRunResult: QAPreflightResult = {
          passed: false,
          mode: gateConfig.mode,
          issues: [{ type: 'error', message: 'No QA run has been executed for this change set' }],
        };
        setGateResult(noRunResult);
        onGateResult?.(noRunResult);
      } else {
        setGateResult(null);
      }

      setLoading(false);
    })();
  }, [orgId, changeSetId, gateConfig]);

  const handleModeChange = useCallback((mode: QAGateMode) => {
    setGateConfig(prev => ({ ...prev, mode }));
  }, []);

  if (loading) {
    return (
      <Panel>
        <Header><Title><ShieldCheckIcon /> QA Gate</Title></Header>
        <div style={{ textAlign: 'center', padding: space[4] }}><Spinner /></div>
      </Panel>
    );
  }

  return (
    <Panel $status={latestRun?.status}>
      <Header>
        <Title><ShieldCheckIcon /> QA Gate</Title>
        <div style={{ display: 'flex', gap: space[2], alignItems: 'center' }}>
          {latestRun && (
            <StatusBadge $status={latestRun.status}>
              {latestRun.status === 'passed' ? <CheckCircleIcon /> :
               latestRun.status === 'failed' ? <XCircleIcon /> :
               <ExclamationTriangleIcon />}
              {QA_RUN_STATUS_CONFIG[latestRun.status].label}
            </StatusBadge>
          )}
          {isOrgAdmin && (
            <ModeSelect value={gateConfig.mode} onChange={e => handleModeChange(e.target.value as QAGateMode)}>
              {(Object.keys(QA_GATE_MODE_LABELS) as QAGateMode[]).map(m => (
                <option key={m} value={m}>{QA_GATE_MODE_LABELS[m]}</option>
              ))}
            </ModeSelect>
          )}
        </div>
      </Header>

      {latestRun ? (
        <>
          <Stats>
            <Stat><span>{latestRun.passedCount}</span> passed</Stat>
            <Stat><span>{latestRun.failedCount}</span> failed</Stat>
            <Stat><span>{latestRun.errorCount}</span> errors</Stat>
            <Stat><span>{latestRun.totalScenarios}</span> total</Stat>
            <Stat><span>{latestRun.totalExecutionTimeMs.toFixed(0)}</span>ms</Stat>
          </Stats>

          {gateResult && gateResult.issues.length > 0 && (
            <IssuesList>
              {gateResult.issues.map((issue, i) => (
                <Issue key={i} $type={issue.type}>
                  {issue.type === 'error' ? <XCircleIcon /> : <ExclamationTriangleIcon />}
                  {issue.message}
                </Issue>
              ))}
            </IssuesList>
          )}

          {gateResult && gateResult.passed && (
            <Issue $type="success" style={{ background: semantic.successLight, color: semantic.successDark }}>
              <CheckCircleIcon />
              QA gate passed — change set is eligible for publish.
            </Issue>
          )}
        </>
      ) : (
        <NoRunState>
          <BeakerIcon />
          No QA run has been executed for this change set.
          {gateConfig.mode === 'required' && (
            <div style={{ marginTop: space[2], color: semantic.error, fontWeight: 500 }}>
              QA is required before publishing.
            </div>
          )}
        </NoRunState>
      )}
    </Panel>
  );
}
