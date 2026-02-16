/**
 * Scenario Runner Component
 * 
 * Panel for running rating scenarios with:
 * - Input fields for data dictionary fields
 * - Execute button to run evaluation
 * - Trace display showing step-by-step execution
 * - JSON export of trace results
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  PlayIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { evaluate, validateDeterminism } from '../../engine/ratingEngine';
import type {
  RatingStep,
  EvaluationContext,
  EvaluationResult,
  StepTraceEntry,
  RatingTableData,
} from '../../types/ratingEngine';
import type { DataDictionaryField } from '../../types/dataDictionary';

// ============================================================================
// Styled Components
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => props.$variant === 'primary' ? `
    background: white;
    color: #667eea;
    border: none;
    &:hover { background: #f0f0f0; }
  ` : `
    background: transparent;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.5);
    &:hover { background: rgba(255, 255, 255, 0.1); }
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Content = styled.div`
  padding: 20px;
`;

const Section = styled.div`
  margin-bottom: 24px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px;
`;

const InputGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
`;

const InputField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

const ResultBanner = styled.div<{ $success: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  background: ${props => props.$success ? '#f0fdf4' : '#fef2f2'};
  border: 1px solid ${props => props.$success ? '#86efac' : '#fecaca'};
  margin-bottom: 16px;
`;

const ResultIcon = styled.div<{ $success: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => props.$success ? '#22c55e' : '#ef4444'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;

  svg {
    width: 24px;
    height: 24px;
  }
`;

const ResultDetails = styled.div`
  flex: 1;
`;

const ResultTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #111827;
`;

const ResultMeta = styled.div`
  font-size: 13px;
  color: #6b7280;
  margin-top: 2px;
`;

const OutputsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
`;

const OutputCard = styled.div`
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`;

const OutputLabel = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const OutputValue = styled.div`
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin-top: 4px;
`;

const TraceContainer = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
`;

const TraceStep = styled.div<{ $expanded: boolean }>`
  border-bottom: 1px solid #e5e7eb;

  &:last-child {
    border-bottom: none;
  }
`;

const TraceHeader = styled.div<{ $applied: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  background: ${props => props.$applied ? '#fff' : '#fef3c7'};

  &:hover {
    background: ${props => props.$applied ? '#f9fafb' : '#fde68a'};
  }
`;

const StepNumber = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
`;

const StepInfo = styled.div`
  flex: 1;
`;

const StepName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #111827;
`;

const StepMeta = styled.div`
  font-size: 12px;
  color: #6b7280;
`;

const StepOutput = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #059669;
`;

const TraceDetails = styled.div`
  padding: 16px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
`;

const DetailRow = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const DetailLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  min-width: 120px;
`;

const DetailValue = styled.span`
  font-size: 12px;
  color: #111827;
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
`;

const WarningBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
`;

// ============================================================================
// Props & Types
// ============================================================================

interface ScenarioRunnerProps {
  steps: RatingStep[];
  dictionaryFields: DataDictionaryField[];
  tables?: Map<string, RatingTableData>;
  rateProgramVersionId: string;
  state?: string;
}

// ============================================================================
// Component
// ============================================================================

export const ScenarioRunner: React.FC<ScenarioRunnerProps> = ({
  steps,
  dictionaryFields,
  tables = new Map(),
  rateProgramVersionId,
  state,
}) => {
  const [inputs, setInputs] = useState<Record<string, string | number | boolean | null>>({});
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [isRunning, setIsRunning] = useState(false);

  // Get required input fields from steps
  const requiredFields = React.useMemo(() => {
    const inputFieldCodes = new Set<string>();

    for (const step of steps) {
      for (const inputCode of step.inputs) {
        // Only add if it's not produced by another step
        const isProducedByStep = steps.some(s => s.outputFieldCode === inputCode);
        if (!isProducedByStep) {
          inputFieldCodes.add(inputCode);
        }
      }
    }

    return dictionaryFields.filter(f => inputFieldCodes.has(f.code));
  }, [steps, dictionaryFields]);

  // Initialize inputs with defaults
  useEffect(() => {
    const defaultInputs: Record<string, string | number | boolean | null> = {};
    for (const field of requiredFields) {
      if (field.type === 'boolean') {
        defaultInputs[field.code] = false;
      } else if (field.type === 'int' || field.type === 'decimal') {
        defaultInputs[field.code] = 0;
      } else if (field.type === 'enum' && field.allowedValues?.length) {
        defaultInputs[field.code] = field.allowedValues[0];
      } else {
        defaultInputs[field.code] = '';
      }
    }
    setInputs(defaultInputs);
  }, [requiredFields]);

  const handleInputChange = (code: string, value: string | number | boolean) => {
    setInputs(prev => ({ ...prev, [code]: value }));
  };

  const handleRun = async () => {
    setIsRunning(true);

    try {
      const context: EvaluationContext = {
        inputs,
        state,
        effectiveDate: new Date(),
        tables,
      };

      const evalResult = evaluate(steps, context, rateProgramVersionId);
      setResult(evalResult);

      // Expand all steps by default after run
      setExpandedSteps(new Set(evalResult.trace.map(t => t.stepId)));
    } catch (error) {
      console.error('Evaluation failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleExport = () => {
    if (!result) return;

    const exportData = {
      inputs,
      outputs: result.outputs,
      trace: result.trace,
      resultHash: result.resultHash,
      evaluatedAt: result.evaluatedAt,
      executionTimeMs: result.executionTimeMs,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenario-trace-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const formatValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '—';
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Container>
      <Header>
        <Title>Scenario Runner</Title>
        <Actions>
          <Button $variant="secondary" onClick={handleExport} disabled={!result}>
            <ArrowDownTrayIcon style={{ width: 16, height: 16 }} />
            Export JSON
          </Button>
          <Button $variant="primary" onClick={handleRun} disabled={isRunning || steps.length === 0}>
            <PlayIcon style={{ width: 16, height: 16 }} />
            {isRunning ? 'Running...' : 'Run Scenario'}
          </Button>
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
                    onChange={(e) => handleInputChange(field.code, e.target.value)}
                  >
                    {field.allowedValues.map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </Select>
                ) : field.type === 'boolean' ? (
                  <Select
                    value={String(inputs[field.code] ?? 'false')}
                    onChange={(e) => handleInputChange(field.code, e.target.value === 'true')}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </Select>
                ) : (
                  <Input
                    type={field.type === 'int' || field.type === 'decimal' ? 'number' : 'text'}
                    value={String(inputs[field.code] ?? '')}
                    onChange={(e) => handleInputChange(
                      field.code,
                      field.type === 'int' ? parseInt(e.target.value, 10) || 0 :
                      field.type === 'decimal' ? parseFloat(e.target.value) || 0 :
                      e.target.value
                    )}
                    placeholder={field.description || `Enter ${field.displayName}`}
                  />
                )}
              </InputField>
            ))}
            {requiredFields.length === 0 && (
              <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
                No input fields required
              </div>
            )}
          </InputGrid>
        </Section>

        {/* Results */}
        {result && (
          <>
            <Section>
              <ResultBanner $success={result.success}>
                <ResultIcon $success={result.success}>
                  {result.success ? <CheckCircleIcon /> : <XCircleIcon />}
                </ResultIcon>
                <ResultDetails>
                  <ResultTitle>
                    {result.success ? 'Evaluation Completed' : 'Evaluation Failed'}
                  </ResultTitle>
                  <ResultMeta>
                    {result.trace.length} steps • {result.executionTimeMs.toFixed(2)}ms •
                    Hash: {result.resultHash.slice(0, 8)}
                  </ResultMeta>
                </ResultDetails>
              </ResultBanner>

              <SectionTitle>Outputs</SectionTitle>
              <OutputsGrid>
                {Object.entries(result.outputs).map(([code, value]) => (
                  <OutputCard key={code}>
                    <OutputLabel>{code}</OutputLabel>
                    <OutputValue>{formatValue(value)}</OutputValue>
                  </OutputCard>
                ))}
              </OutputsGrid>
            </Section>

            <Section>
              <SectionTitle>Execution Trace</SectionTitle>
              <TraceContainer>
                {result.trace.map((entry, index) => (
                  <TraceStep key={entry.stepId} $expanded={expandedSteps.has(entry.stepId)}>
                    <TraceHeader
                      $applied={entry.applied}
                      onClick={() => toggleStep(entry.stepId)}
                    >
                      {expandedSteps.has(entry.stepId) ? (
                        <ChevronDownIcon style={{ width: 16, height: 16, color: '#6b7280' }} />
                      ) : (
                        <ChevronRightIcon style={{ width: 16, height: 16, color: '#6b7280' }} />
                      )}
                      <StepNumber>{index + 1}</StepNumber>
                      <StepInfo>
                        <StepName>{entry.stepName}</StepName>
                        <StepMeta>
                          {entry.stepType} → {entry.outputFieldCode}
                          {!entry.applied && entry.skipReason && (
                            <WarningBadge>
                              <ExclamationTriangleIcon style={{ width: 12, height: 12 }} />
                              Skipped
                            </WarningBadge>
                          )}
                        </StepMeta>
                      </StepInfo>
                      <StepOutput>
                        {entry.applied ? formatValue(entry.outputValue) : '—'}
                      </StepOutput>
                    </TraceHeader>

                    {expandedSteps.has(entry.stepId) && (
                      <TraceDetails>
                        {entry.skipReason && (
                          <DetailRow>
                            <DetailLabel>Skip Reason:</DetailLabel>
                            <DetailValue>{entry.skipReason}</DetailValue>
                          </DetailRow>
                        )}
                        <DetailRow>
                          <DetailLabel>Input Values:</DetailLabel>
                          <DetailValue>
                            {JSON.stringify(entry.inputValues)}
                          </DetailValue>
                        </DetailRow>
                        {entry.preRoundingValue !== undefined && (
                          <DetailRow>
                            <DetailLabel>Pre-Rounding:</DetailLabel>
                            <DetailValue>
                              {entry.preRoundingValue} → {entry.outputValue} ({entry.roundingMode})
                            </DetailValue>
                          </DetailRow>
                        )}
                        {entry.tableLookupKey && (
                          <DetailRow>
                            <DetailLabel>Table Lookup:</DetailLabel>
                            <DetailValue>{entry.tableLookupKey}</DetailValue>
                          </DetailRow>
                        )}
                        {entry.evaluatedExpression && (
                          <DetailRow>
                            <DetailLabel>Expression:</DetailLabel>
                            <DetailValue>{entry.evaluatedExpression}</DetailValue>
                          </DetailRow>
                        )}
                        <DetailRow>
                          <DetailLabel>Execution Time:</DetailLabel>
                          <DetailValue>{entry.executionTimeMs.toFixed(3)}ms</DetailValue>
                        </DetailRow>
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

export default ScenarioRunner;

