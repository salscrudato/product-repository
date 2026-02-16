/**
 * RuleScenarioRunner – evaluate underwriting rules against sample inputs
 *
 * Mirrors the rating ScenarioRunner but for the rules engine.
 * Displays:
 * - Input fields derived from the rules' referenced field codes
 * - Run button
 * - Fired / passed summary
 * - Per-rule trace with leaf-level explainability
 */

import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import {
  PlayIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { evaluateRules, extractFieldCodes } from '../../engine/rulesEngine';
import type { RuleWithVersion } from '../../engine/rulesEngine';
import type {
  RuleEvaluationContext,
  RuleEvaluationResult,
  RuleTraceEntry,
} from '../../types/rulesEngine';
import type { DataDictionaryField } from '../../types/dataDictionary';

// ============================================================================
// Styled Components  (mirrors pricing ScenarioRunner)
// ============================================================================

const Container = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
`;

const Title = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0;
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
`;

const Btn = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  ${p => p.$variant === 'primary' ? `
    background: white; color: #6366f1; border: none;
    &:hover { background: #f0f0f0; }
  ` : `
    background: transparent; color: white; border: 1px solid rgba(255,255,255,0.5);
    &:hover { background: rgba(255,255,255,0.1); }
  `}

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Content = styled.div`padding: 20px;`;

const Section = styled.div`
  margin-bottom: 24px;
  &:last-child { margin-bottom: 0; }
`;

const SectionTitle = styled.h4`
  font-size: 14px; font-weight: 600; color: #374151; margin: 0 0 12px;
`;

const InputGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;
`;

const InputField = styled.div`
  display: flex; flex-direction: column; gap: 4px;
`;

const Label = styled.label`
  font-size: 12px; font-weight: 500; color: #6b7280;
`;

const Input = styled.input`
  padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;
  &:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
`;

const Select = styled.select`
  padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; background: white;
  &:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
`;

const SummaryBanner = styled.div<{ $severity: string | null }>`
  display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 8px; margin-bottom: 16px;
  background: ${p => {
    switch (p.$severity) {
      case 'block': case 'error': return '#fef2f2';
      case 'warning': return '#fffbeb';
      default: return '#f0fdf4';
    }
  }};
  border: 1px solid ${p => {
    switch (p.$severity) {
      case 'block': case 'error': return '#fecaca';
      case 'warning': return '#fde68a';
      default: return '#86efac';
    }
  }};
`;

const SummaryIcon = styled.div<{ $severity: string | null }>`
  width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;
  background: ${p => {
    switch (p.$severity) {
      case 'block': case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#22c55e';
    }
  }};
  svg { width: 24px; height: 24px; }
`;

const SummaryDetails = styled.div`flex: 1;`;
const SummaryTitle = styled.div`font-size: 16px; font-weight: 600; color: #111827;`;
const SummaryMeta = styled.div`font-size: 13px; color: #6b7280; margin-top: 2px;`;

const StatsGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; margin-bottom: 16px;
`;

const StatCard = styled.div<{ $color: string }>`
  padding: 12px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center;
`;

const StatValue = styled.div`font-size: 24px; font-weight: 700; color: #111827;`;
const StatLabel = styled.div`font-size: 11px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;`;

const TraceContainer = styled.div`border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;`;

const TraceStep = styled.div`border-bottom: 1px solid #e5e7eb; &:last-child { border-bottom: none; }`;

const TraceHeader = styled.div<{ $fired: boolean }>`
  display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer;
  background: ${p => p.$fired ? '#fef2f2' : '#fff'};
  &:hover { background: ${p => p.$fired ? '#fee2e2' : '#f9fafb'}; }
`;

const RuleIcon = styled.div<{ $fired: boolean }>`
  width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: ${p => p.$fired ? '#fecaca' : '#d1fae5'};
  color: ${p => p.$fired ? '#dc2626' : '#059669'};
  svg { width: 16px; height: 16px; }
`;

const RuleInfo = styled.div`flex: 1;`;
const RuleName = styled.div`font-size: 14px; font-weight: 500; color: #111827;`;
const RuleMeta = styled.div`font-size: 12px; color: #6b7280;`;

const Badge = styled.span<{ $color: string }>`
  display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;
  background: ${p => p.$color}20; color: ${p => p.$color};
`;

const TraceDetails = styled.div`padding: 16px; background: #f9fafb; border-top: 1px solid #e5e7eb;`;
const DetailRow = styled.div`display: flex; gap: 16px; margin-bottom: 8px; &:last-child { margin-bottom: 0; }`;
const DetailLabel = styled.span`font-size: 12px; font-weight: 500; color: #6b7280; min-width: 120px;`;
const DetailValue = styled.span`font-size: 12px; color: #111827; font-family: 'SF Mono', Monaco, monospace;`;

const ConditionRow = styled.div<{ $result: boolean }>`
  display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 6px; font-size: 12px; margin-bottom: 4px;
  background: ${p => p.$result ? '#f0fdf4' : '#fef2f2'};
  border: 1px solid ${p => p.$result ? '#bbf7d0' : '#fecaca'};
`;

// ============================================================================
// Props
// ============================================================================

interface RuleScenarioRunnerProps {
  rules: RuleWithVersion[];
  dictionaryFields: DataDictionaryField[];
  productVersionId: string;
  state?: string;
}

// ============================================================================
// Component
// ============================================================================

export const RuleScenarioRunner: React.FC<RuleScenarioRunnerProps> = ({
  rules,
  dictionaryFields,
  productVersionId,
  state,
}) => {
  const [inputs, setInputs] = useState<Record<string, string | number | boolean | null>>({});
  const [result, setResult] = useState<RuleEvaluationResult | null>(null);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [isRunning, setIsRunning] = useState(false);

  // Determine which fields the rules reference
  const requiredFields = useMemo(() => {
    const codes = new Set<string>();
    for (const rule of rules) {
      for (const code of extractFieldCodes(rule.version.conditions)) {
        codes.add(code);
      }
    }
    return dictionaryFields.filter(f => codes.has(f.code));
  }, [rules, dictionaryFields]);

  // Initialize inputs
  useEffect(() => {
    const defaults: Record<string, string | number | boolean | null> = {};
    for (const f of requiredFields) {
      if (f.type === 'boolean') defaults[f.code] = false;
      else if (f.type === 'int' || f.type === 'decimal') defaults[f.code] = 0;
      else if (f.type === 'enum' && f.allowedValues?.length) defaults[f.code] = f.allowedValues[0];
      else defaults[f.code] = '';
    }
    setInputs(defaults);
  }, [requiredFields]);

  const handleInputChange = (code: string, value: string | number | boolean) => {
    setInputs(prev => ({ ...prev, [code]: value }));
  };

  const handleRun = () => {
    setIsRunning(true);
    try {
      const ctx: RuleEvaluationContext = {
        inputs,
        state,
        productVersionId,
        effectiveDate: new Date(),
      };
      const res = evaluateRules(rules, ctx);
      setResult(res);
      setExpandedRules(new Set(res.firedRules.map(r => r.ruleId)));
    } catch (err) {
      console.error('Rule evaluation failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleExport = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify({ inputs, ...result }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rule-trace-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleRule = (ruleId: string) => {
    setExpandedRules(prev => {
      const next = new Set(prev);
      if (next.has(ruleId)) next.delete(ruleId); else next.add(ruleId);
      return next;
    });
  };

  const severityColor = (s: string | null) => {
    switch (s) {
      case 'block': return '#991b1b';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#22c55e';
    }
  };

  return (
    <Container>
      <Header>
        <Title>Rule Scenario Runner</Title>
        <Actions>
          <Btn $variant="secondary" onClick={handleExport} disabled={!result}>
            <ArrowDownTrayIcon style={{ width: 16, height: 16 }} />
            Export Trace
          </Btn>
          <Btn $variant="primary" onClick={handleRun} disabled={isRunning || rules.length === 0}>
            <PlayIcon style={{ width: 16, height: 16 }} />
            {isRunning ? 'Running…' : 'Run Scenario'}
          </Btn>
        </Actions>
      </Header>

      <Content>
        {/* Input Fields */}
        <Section>
          <SectionTitle>Input Values</SectionTitle>
          <InputGrid>
            {requiredFields.map(field => (
              <InputField key={field.code}>
                <Label>{field.displayName || field.code}</Label>
                {field.type === 'enum' && field.allowedValues ? (
                  <Select
                    value={String(inputs[field.code] ?? '')}
                    onChange={e => handleInputChange(field.code, e.target.value)}
                  >
                    {field.allowedValues.map(v => <option key={v} value={v}>{v}</option>)}
                  </Select>
                ) : field.type === 'boolean' ? (
                  <Select
                    value={String(inputs[field.code] ?? 'false')}
                    onChange={e => handleInputChange(field.code, e.target.value === 'true')}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </Select>
                ) : (
                  <Input
                    type={field.type === 'int' || field.type === 'decimal' ? 'number' : 'text'}
                    value={String(inputs[field.code] ?? '')}
                    onChange={e => handleInputChange(
                      field.code,
                      field.type === 'int' ? parseInt(e.target.value, 10) || 0 :
                      field.type === 'decimal' ? parseFloat(e.target.value) || 0 :
                      e.target.value,
                    )}
                    placeholder={field.description || `Enter ${field.displayName}`}
                  />
                )}
              </InputField>
            ))}
            {requiredFields.length === 0 && (
              <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No input fields required</div>
            )}
          </InputGrid>
        </Section>

        {/* Results */}
        {result && (
          <>
            <Section>
              <SummaryBanner $severity={result.aggregateSeverity}>
                <SummaryIcon $severity={result.aggregateSeverity}>
                  {result.firedRules.length > 0 ? <ShieldExclamationIcon /> : <ShieldCheckIcon />}
                </SummaryIcon>
                <SummaryDetails>
                  <SummaryTitle>
                    {result.firedRules.length > 0
                      ? `${result.firedRules.length} rule${result.firedRules.length > 1 ? 's' : ''} triggered`
                      : 'All rules passed'}
                  </SummaryTitle>
                  <SummaryMeta>
                    {result.trace.length} rules evaluated • {result.executionTimeMs.toFixed(2)}ms • Hash: {result.resultHash.slice(0, 8)}
                  </SummaryMeta>
                </SummaryDetails>
              </SummaryBanner>

              <StatsGrid>
                <StatCard $color="#22c55e">
                  <StatValue>{result.passedRules.filter(r => !r.skipReason).length}</StatValue>
                  <StatLabel>Passed</StatLabel>
                </StatCard>
                <StatCard $color="#ef4444">
                  <StatValue>{result.firedRules.length}</StatValue>
                  <StatLabel>Fired</StatLabel>
                </StatCard>
                <StatCard $color="#6b7280">
                  <StatValue>{result.passedRules.filter(r => !!r.skipReason).length}</StatValue>
                  <StatLabel>Skipped</StatLabel>
                </StatCard>
              </StatsGrid>
            </Section>

            <Section>
              <SectionTitle>Rule Evaluation Trace</SectionTitle>
              <TraceContainer>
                {result.trace.map(entry => (
                  <TraceStep key={`${entry.ruleId}-${entry.ruleVersionId}`}>
                    <TraceHeader $fired={entry.fired} onClick={() => toggleRule(entry.ruleId)}>
                      {expandedRules.has(entry.ruleId)
                        ? <ChevronDownIcon style={{ width: 16, height: 16, color: '#6b7280' }} />
                        : <ChevronRightIcon style={{ width: 16, height: 16, color: '#6b7280' }} />
                      }
                      <RuleIcon $fired={entry.fired}>
                        {entry.fired ? <XCircleIcon /> : <CheckCircleIcon />}
                      </RuleIcon>
                      <RuleInfo>
                        <RuleName>{entry.ruleName}</RuleName>
                        <RuleMeta>
                          {entry.ruleType} • {entry.executionTimeMs.toFixed(2)}ms
                          {entry.skipReason && (
                            <Badge $color="#6b7280" style={{ marginLeft: 8 }}>Skipped</Badge>
                          )}
                        </RuleMeta>
                      </RuleInfo>
                      {entry.fired && entry.outcome && (
                        <Badge $color={severityColor(entry.outcome.severity)}>
                          {entry.outcome.action}
                        </Badge>
                      )}
                    </TraceHeader>

                    {expandedRules.has(entry.ruleId) && (
                      <TraceDetails>
                        {entry.skipReason && (
                          <DetailRow>
                            <DetailLabel>Skip Reason:</DetailLabel>
                            <DetailValue>{entry.skipReason}</DetailValue>
                          </DetailRow>
                        )}
                        {entry.fired && entry.outcome && (
                          <>
                            <DetailRow>
                              <DetailLabel>Outcome:</DetailLabel>
                              <DetailValue>{entry.outcome.action} – {entry.outcome.message}</DetailValue>
                            </DetailRow>
                            {entry.outcome.requiredDocs && entry.outcome.requiredDocs.length > 0 && (
                              <DetailRow>
                                <DetailLabel>Required Docs:</DetailLabel>
                                <DetailValue>{entry.outcome.requiredDocs.join(', ')}</DetailValue>
                              </DetailRow>
                            )}
                          </>
                        )}
                        {entry.conditionTrace.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <DetailLabel style={{ display: 'block', marginBottom: 6 }}>Condition Evaluation:</DetailLabel>
                            {entry.conditionTrace.map((ct, i) => (
                              <ConditionRow key={i} $result={ct.result}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{ct.fieldCode}</span>
                                <span style={{ color: '#6b7280' }}>{ct.operator}</span>
                                <span style={{ fontFamily: 'monospace' }}>{JSON.stringify(ct.expectedValue)}</span>
                                <span style={{ color: '#9ca3af' }}>→ actual:</span>
                                <span style={{ fontFamily: 'monospace' }}>{JSON.stringify(ct.actualValue)}</span>
                                <span style={{ marginLeft: 'auto', fontWeight: 600 }}>
                                  {ct.result ? '✓' : '✗'}
                                </span>
                              </ConditionRow>
                            ))}
                          </div>
                        )}
                      </TraceDetails>
                    )}
                  </TraceStep>
                ))}
              </TraceContainer>
            </Section>
          </>
        )}
      </Content>
    </Container>
  );
};

export default RuleScenarioRunner;
