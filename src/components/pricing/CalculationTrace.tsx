import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  CheckCircleIcon,
  XCircleIcon,
  ChevronRightIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import type { CalculationTraceStep, CalculationResult } from '../../types/pricing';

// ============================================================================
// Types
// ============================================================================

interface CalculationTraceProps {
  result: CalculationResult | null;
  onStepClick: (stepId: string) => void;
  onStepHover: (stepId: string | null) => void;
  highlightedStepId?: string | null;
}

// ============================================================================
// Animations
// ============================================================================

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

const TraceHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
`;

const PremiumSummary = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
`;

const SummaryCard = styled.div<{ $highlight?: boolean }>`
  padding: 12px;
  background: ${({ $highlight }) => 
    $highlight 
      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)'
      : 'rgba(248, 250, 252, 0.8)'};
  border: 1px solid ${({ $highlight }) => 
    $highlight ? 'rgba(16, 185, 129, 0.3)' : 'rgba(226, 232, 240, 0.6)'};
  border-radius: 10px;
  text-align: center;
`;

const SummaryLabel = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const SummaryValue = styled.div<{ $highlight?: boolean }>`
  font-size: 18px;
  font-weight: 700;
  color: ${({ $highlight }) => $highlight ? '#059669' : '#1e293b'};
`;

const TraceList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(203, 213, 225, 0.5); border-radius: 3px; }
`;

const TraceRow = styled.div<{ $highlighted?: boolean; $disabled?: boolean; $index?: number }>`
  display: grid;
  grid-template-columns: 32px 1fr 80px 90px 70px 60px;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  background: ${({ $highlighted, $disabled }) => 
    $highlighted 
      ? 'rgba(99, 102, 241, 0.1)' 
      : $disabled 
        ? 'rgba(248, 250, 252, 0.5)' 
        : 'white'};
  border: 1px solid ${({ $highlighted }) => 
    $highlighted ? 'rgba(99, 102, 241, 0.3)' : 'rgba(226, 232, 240, 0.6)'};
  border-radius: 10px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: ${({ $disabled }) => $disabled ? 0.5 : 1};
  animation: ${slideUp} 0.3s ease-out both;
  animation-delay: ${({ $index }) => ($index || 0) * 0.03}s;
  
  &:hover {
    border-color: ${({ $disabled }) => $disabled ? 'rgba(226, 232, 240, 0.6)' : 'rgba(99, 102, 241, 0.4)'};
    transform: ${({ $disabled }) => $disabled ? 'none' : 'translateX(4px)'};
  }
  
  &:last-child { margin-bottom: 0; }
`;

const StepNum = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: white;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.2);
`;

const StepName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const OperationBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(234, 179, 8, 0.15) 100%);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #d97706;
`;

const RunningTotal = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  text-align: right;
`;

const ImpactBadge = styled.span<{ $positive?: boolean; $negative?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px 6px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ $positive, $negative }) =>
    $positive
      ? 'rgba(16, 185, 129, 0.1)'
      : $negative
        ? 'rgba(239, 68, 68, 0.1)'
        : 'rgba(148, 163, 184, 0.1)'};
  color: ${({ $positive, $negative }) =>
    $positive
      ? '#059669'
      : $negative
        ? '#dc2626'
        : '#64748b'};

  svg { width: 10px; height: 10px; }
`;

const StatusIcon = styled.div<{ $applied?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 18px;
    height: 18px;
    color: ${({ $applied }) => $applied ? '#10b981' : '#94a3b8'};
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
  color: #64748b;

  svg { width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.4; }

  h4 { font-size: 16px; font-weight: 600; color: #374151; margin: 0 0 8px; }
  p { font-size: 14px; margin: 0; line-height: 1.5; }
`;

const HeaderRow = styled.div`
  display: grid;
  grid-template-columns: 32px 1fr 80px 90px 70px 60px;
  gap: 8px;
  padding: 8px 12px;
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

// ============================================================================
// Helper Functions
// ============================================================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

// ============================================================================
// Component
// ============================================================================

export const CalculationTraceComponent: React.FC<CalculationTraceProps> = ({
  result,
  onStepClick,
  onStepHover,
  highlightedStepId,
}) => {
  if (!result) {
    return (
      <Container>
        <EmptyState>
          <ChevronRightIcon />
          <h4>No Calculation</h4>
          <p>Run a calculation to see the step-by-step trace.</p>
        </EmptyState>
      </Container>
    );
  }

  const appliedSteps = result.trace.filter(s => s.applied);
  const skippedSteps = result.trace.filter(s => !s.applied);

  return (
    <Container>
      <TraceHeader>
        <PremiumSummary>
          <SummaryCard>
            <SummaryLabel>Steps Applied</SummaryLabel>
            <SummaryValue>{appliedSteps.length}</SummaryValue>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel>Pre-Rounded</SummaryLabel>
            <SummaryValue>{formatCurrency(result.preRoundedPremium)}</SummaryValue>
          </SummaryCard>
          <SummaryCard $highlight>
            <SummaryLabel>Final Premium</SummaryLabel>
            <SummaryValue $highlight>{formatCurrency(result.finalPremium)}</SummaryValue>
          </SummaryCard>
        </PremiumSummary>

        {result.minimumApplied && (
          <div style={{
            padding: '8px 12px',
            background: 'rgba(245, 158, 11, 0.1)',
            borderRadius: 8,
            fontSize: 12,
            color: '#d97706',
            fontWeight: 500,
          }}>
            ⚠️ Minimum premium of {formatCurrency(result.minimumPremiumValue || 0)} was applied
          </div>
        )}
      </TraceHeader>

      <TraceList>
        <HeaderRow>
          <span>#</span>
          <span>Step Name</span>
          <span>Operation</span>
          <span style={{ textAlign: 'right' }}>Running Total</span>
          <span style={{ textAlign: 'right' }}>Impact</span>
          <span style={{ textAlign: 'center' }}>Status</span>
        </HeaderRow>

        {result.trace.map((step, index) => (
          <TraceRow
            key={step.stepId}
            $highlighted={highlightedStepId === step.stepId}
            $disabled={!step.applied}
            $index={index}
            onClick={() => onStepClick(step.stepId)}
            onMouseEnter={() => onStepHover(step.stepId)}
            onMouseLeave={() => onStepHover(null)}
          >
            <StepNum>{step.stepNum}</StepNum>
            <StepName title={step.name}>{step.name}</StepName>
            <OperationBadge>{step.operation}</OperationBadge>
            <RunningTotal>{formatCurrency(step.runningTotal)}</RunningTotal>
            <ImpactBadge
              $positive={step.impactDollar > 0}
              $negative={step.impactDollar < 0}
            >
              {step.impactDollar > 0 && <ArrowTrendingUpIcon />}
              {step.impactDollar < 0 && <ArrowTrendingDownIcon />}
              {formatPercent(step.impactPercent)}
            </ImpactBadge>
            <StatusIcon $applied={step.applied}>
              {step.applied ? <CheckCircleSolidIcon /> : <XCircleIcon />}
            </StatusIcon>
          </TraceRow>
        ))}
      </TraceList>
    </Container>
  );
};

export default CalculationTraceComponent;

