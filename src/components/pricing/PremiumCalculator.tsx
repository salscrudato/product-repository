import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  CalculatorIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

// ============================================================================
// Types
// ============================================================================

interface PricingStep {
  id: string;
  stepType: 'factor' | 'operand';
  stepName?: string;
  value?: number;
  operand?: string;
  coverages?: string[];
  states?: string[];
}

interface CalculationStep {
  stepNumber: number;
  stepName: string;
  operation: string;
  value: number;
  runningTotal: number;
  impact: number;
  impactPercent: number;
}

interface PremiumCalculatorProps {
  steps: PricingStep[];
  selectedCoverage?: string | null;
  selectedStates?: string[];
}

// ============================================================================
// Styled Components
// ============================================================================

const CalculatorContainer = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
`;

const CalculatorHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e2e8f0;
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  
  h3 {
    font-size: 18px;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
  }
  
  svg {
    width: 24px;
    height: 24px;
    color: #6366f1;
  }
`;

const PremiumDisplay = styled.div`
  text-align: right;
  
  .label {
    font-size: 12px;
    font-weight: 500;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  
  .amount {
    font-size: 32px;
    font-weight: 800;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const TabContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid #e2e8f0;
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 10px 16px;
  border: none;
  background: ${props => props.active ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent'};
  color: ${props => props.active ? '#ffffff' : '#64748b'};
  font-weight: ${props => props.active ? '600' : '500'};
  font-size: 14px;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  
  svg {
    width: 16px;
    height: 16px;
  }
  
  &:hover {
    background: ${props => props.active ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : '#f1f5f9'};
    color: ${props => props.active ? '#ffffff' : '#1e293b'};
  }
`;

const BreakdownContainer = styled.div`
  max-height: 500px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
    
    &:hover {
      background: #94a3b8;
    }
  }
`;

const StepCard = styled.div<{ isOperand?: boolean }>`
  background: ${props => props.isOperand ? '#fef3c7' : '#ffffff'};
  border: 1px solid ${props => props.isOperand ? '#fbbf24' : '#e2e8f0'};
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`;

const StepHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const StepInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const StepNumber = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
`;

const StepName = styled.div`
  font-weight: 600;
  color: #1e293b;
  font-size: 15px;
`;

const StepValue = styled.div`
  font-weight: 700;
  color: #6366f1;
  font-size: 16px;
`;

const StepDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
`;

const DetailItem = styled.div`
  .label {
    font-size: 11px;
    font-weight: 500;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  
  .value {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
  }
`;

const ImpactBadge = styled.div<{ positive?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  background: ${props => props.positive ? '#dcfce7' : '#fee2e2'};
  color: ${props => props.positive ? '#16a34a' : '#dc2626'};
  font-size: 12px;
  font-weight: 600;
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const FormulaVisualization = styled.div`
  background: #f8fafc;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.8;
  color: #1e293b;
  overflow-x: auto;
  
  .operator {
    color: #f59e0b;
    font-weight: 700;
    padding: 0 8px;
  }
  
  .value {
    color: #6366f1;
    font-weight: 700;
  }
  
  .step-name {
    color: #64748b;
    font-style: italic;
  }
`;

const SummaryCard = styled.div`
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 12px;
  padding: 20px;
  color: white;
  margin-top: 20px;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
`;

const SummaryItem = styled.div`
  .label {
    font-size: 12px;
    opacity: 0.9;
    margin-bottom: 4px;
  }
  
  .value {
    font-size: 20px;
    font-weight: 700;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
  
  svg {
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
    opacity: 0.3;
  }
  
  h4 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
    color: #1e293b;
  }
  
  p {
    font-size: 14px;
    margin: 0;
  }
`;

// ============================================================================
// Component
// ============================================================================

export const PremiumCalculator: React.FC<PremiumCalculatorProps> = ({
  steps,
  selectedCoverage,
  selectedStates = []
}) => {
  const [activeTab, setActiveTab] = useState<'breakdown' | 'formula'>('breakdown');

  // Filter steps based on coverage and states
  const filteredSteps = useMemo(() => {
    return steps.filter(step => {
      const coverageMatch = !selectedCoverage || (step.coverages && step.coverages.includes(selectedCoverage));
      const stateMatch = selectedStates.length === 0 || selectedStates.every(s => step.states && step.states.includes(s));
      return coverageMatch && stateMatch;
    });
  }, [steps, selectedCoverage, selectedStates]);

  // Calculate premium with detailed breakdown
  const calculation = useMemo(() => {
    let result = 0;
    let currentOperand: string | null = null;
    const calculationSteps: CalculationStep[] = [];
    let stepNumber = 0;

    filteredSteps.forEach((step, index) => {
      if (step.stepType === 'factor') {
        const value = step.value || 0;
        const previousTotal = result;
        
        if (result === 0 && currentOperand === null) {
          result = value;
        } else if (currentOperand) {
          switch (currentOperand) {
            case '+':
              result += value;
              break;
            case '-':
              result -= value;
              break;
            case '*':
              result *= value;
              break;
            case '/':
              result = value !== 0 ? result / value : result;
              break;
            case '=':
              result = value;
              break;
          }
        }
        
        const impact = result - previousTotal;
        const impactPercent = previousTotal !== 0 ? (impact / previousTotal) * 100 : 0;
        
        stepNumber++;
        calculationSteps.push({
          stepNumber,
          stepName: step.stepName || 'Unnamed Step',
          operation: currentOperand || 'Initial',
          value,
          runningTotal: result,
          impact,
          impactPercent
        });
        
        currentOperand = null;
      } else if (step.stepType === 'operand') {
        currentOperand = step.operand || null;
      }
    });

    return {
      finalPremium: result,
      steps: calculationSteps,
      totalSteps: calculationSteps.length
    };
  }, [filteredSteps]);

  // Generate formula string
  const formulaString = useMemo(() => {
    let formula = '';
    let currentOperand: string | null = null;

    filteredSteps.forEach(step => {
      if (step.stepType === 'factor') {
        if (formula && currentOperand) {
          formula += ` <span class="operator">${currentOperand}</span> `;
        }
        formula += `<span class="value">${step.value || 0}</span> <span class="step-name">(${step.stepName})</span>`;
        currentOperand = null;
      } else if (step.stepType === 'operand') {
        currentOperand = step.operand || null;
      }
    });

    return formula || 'No formula defined';
  }, [filteredSteps]);

  if (filteredSteps.length === 0) {
    return (
      <CalculatorContainer>
        <EmptyState>
          <CalculatorIcon />
          <h4>No Pricing Steps</h4>
          <p>Add pricing steps to see premium calculations</p>
        </EmptyState>
      </CalculatorContainer>
    );
  }

  return (
    <CalculatorContainer>
      <CalculatorHeader>
        <HeaderTitle>
          <CalculatorIcon />
          <h3>Premium Calculator</h3>
        </HeaderTitle>
        <PremiumDisplay>
          <div className="label">Calculated Premium</div>
          <div className="amount">${calculation.finalPremium.toFixed(2)}</div>
        </PremiumDisplay>
      </CalculatorHeader>

      <TabContainer>
        <Tab active={activeTab === 'breakdown'} onClick={() => setActiveTab('breakdown')}>
          <ChartBarIcon />
          Step-by-Step
        </Tab>
        <Tab active={activeTab === 'formula'} onClick={() => setActiveTab('formula')}>
          <CalculatorIcon />
          Formula
        </Tab>
      </TabContainer>

      {activeTab === 'breakdown' && (
        <BreakdownContainer>
          {calculation.steps.map((step, index) => (
            <StepCard key={index}>
              <StepHeader>
                <StepInfo>
                  <StepNumber>{step.stepNumber}</StepNumber>
                  <StepName>{step.stepName}</StepName>
                </StepInfo>
                <StepValue>${step.value.toFixed(2)}</StepValue>
              </StepHeader>
              <StepDetails>
                <DetailItem>
                  <div className="label">Operation</div>
                  <div className="value">{step.operation}</div>
                </DetailItem>
                <DetailItem>
                  <div className="label">Running Total</div>
                  <div className="value">${step.runningTotal.toFixed(2)}</div>
                </DetailItem>
                <DetailItem>
                  <div className="label">Impact</div>
                  <div className="value">
                    <ImpactBadge positive={step.impact >= 0}>
                      {step.impact >= 0 ? <ArrowTrendingUpIcon /> : null}
                      {step.impact >= 0 ? '+' : ''}${step.impact.toFixed(2)}
                      {step.impactPercent !== 0 && ` (${step.impactPercent.toFixed(1)}%)`}
                    </ImpactBadge>
                  </div>
                </DetailItem>
              </StepDetails>
            </StepCard>
          ))}
          
          <SummaryCard>
            <SummaryGrid>
              <SummaryItem>
                <div className="label">Total Steps</div>
                <div className="value">{calculation.totalSteps}</div>
              </SummaryItem>
              <SummaryItem>
                <div className="label">Base Amount</div>
                <div className="value">${calculation.steps[0]?.value.toFixed(2) || '0.00'}</div>
              </SummaryItem>
              <SummaryItem>
                <div className="label">Final Premium</div>
                <div className="value">${calculation.finalPremium.toFixed(2)}</div>
              </SummaryItem>
            </SummaryGrid>
          </SummaryCard>
        </BreakdownContainer>
      )}

      {activeTab === 'formula' && (
        <FormulaVisualization dangerouslySetInnerHTML={{ __html: formulaString }} />
      )}
    </CalculatorContainer>
  );
};

export default PremiumCalculator;

