import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { 
  BeakerIcon,
  ArrowPathIcon,
  BookmarkIcon,
  ChartBarSquareIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';

// ============================================================================
// Types
// ============================================================================

interface PricingStep {
  id: string;
  stepType: 'factor' | 'operand';
  stepName?: string;
  value?: number;
  operand?: string;
}

interface Scenario {
  id: string;
  name: string;
  adjustments: Record<string, number>;
  premium: number;
  createdAt: Date;
}

interface ScenarioTesterProps {
  steps: PricingStep[];
  basePremium: number;
  onSaveScenario?: (scenario: Scenario) => void;
}

// ============================================================================
// Styled Components
// ============================================================================

const TesterContainer = styled.div`
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 16px;
  padding: 24px;
  border: 2px solid #fbbf24;
  margin-bottom: 24px;
`;

const TesterHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  
  h3 {
    font-size: 18px;
    font-weight: 700;
    color: #78350f;
    margin: 0;
  }
  
  svg {
    width: 24px;
    height: 24px;
    color: #f59e0b;
  }
`;

const ScenarioGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const InputSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #fbbf24;
`;

const ResultsSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #fbbf24;
`;

const SectionTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  color: #78350f;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const FactorAdjustment = styled.div`
  margin-bottom: 16px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const FactorLabel = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 8px;
`;

const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Slider = styled.input`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #e2e8f0;
  outline: none;
  -webkit-appearance: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #f59e0b;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background: #d97706;
      transform: scale(1.1);
    }
  }
  
  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #f59e0b;
    cursor: pointer;
    border: none;
    
    &:hover {
      background: #d97706;
      transform: scale(1.1);
    }
  }
`;

const ValueDisplay = styled.div`
  min-width: 80px;
  text-align: right;
  font-weight: 700;
  color: #f59e0b;
  font-size: 14px;
`;

const ComparisonCard = styled.div`
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 12px;
  padding: 20px;
  color: white;
  margin-bottom: 16px;
`;

const ComparisonRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  
  &:last-child {
    margin-bottom: 0;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
  }
`;

const ComparisonLabel = styled.div`
  font-size: 13px;
  opacity: 0.9;
`;

const ComparisonValue = styled.div`
  font-size: 20px;
  font-weight: 700;
`;

const DifferenceIndicator = styled.div<{ positive?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  background: ${props => props.positive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
  color: ${props => props.positive ? '#10b981' : '#ef4444'};
  font-size: 14px;
  font-weight: 700;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const SavedScenarios = styled.div`
  margin-top: 16px;
`;

const ScenarioChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 20px;
  margin-right: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #78350f;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: #fde68a;
    transform: translateY(-1px);
  }
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

// ============================================================================
// Component
// ============================================================================

export const ScenarioTester: React.FC<ScenarioTesterProps> = ({
  steps,
  basePremium,
  onSaveScenario
}) => {
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);
  const [scenarioName, setScenarioName] = useState('');

  // Get adjustable factors (only factor steps)
  const adjustableFactors = useMemo(() => {
    return steps.filter(step => step.stepType === 'factor' && step.stepName);
  }, [steps]);

  // Calculate scenario premium
  const scenarioPremium = useMemo(() => {
    let result = 0;
    let currentOperand: string | null = null;

    steps.forEach(step => {
      if (step.stepType === 'factor') {
        // Use adjusted value if available, otherwise use original
        const value = adjustments[step.id] !== undefined ? adjustments[step.id] : (step.value || 0);
        
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
        currentOperand = null;
      } else if (step.stepType === 'operand') {
        currentOperand = step.operand || null;
      }
    });

    return result;
  }, [steps, adjustments]);

  const difference = scenarioPremium - basePremium;
  const differencePercent = basePremium !== 0 ? (difference / basePremium) * 100 : 0;

  const handleAdjustment = (stepId: string, value: number) => {
    setAdjustments(prev => ({
      ...prev,
      [stepId]: value
    }));
  };

  const handleReset = () => {
    setAdjustments({});
  };

  const handleSave = () => {
    if (!scenarioName.trim()) {
      alert('Please enter a scenario name');
      return;
    }

    const scenario: Scenario = {
      id: Date.now().toString(),
      name: scenarioName,
      adjustments: { ...adjustments },
      premium: scenarioPremium,
      createdAt: new Date()
    };

    setSavedScenarios(prev => [...prev, scenario]);
    if (onSaveScenario) {
      onSaveScenario(scenario);
    }
    setScenarioName('');
  };

  const loadScenario = (scenario: Scenario) => {
    setAdjustments(scenario.adjustments);
    setScenarioName(scenario.name);
  };

  return (
    <TesterContainer>
      <TesterHeader>
        <BeakerIcon />
        <h3>What-If Scenario Testing</h3>
      </TesterHeader>

      <ScenarioGrid>
        <InputSection>
          <SectionTitle>
            <ChartBarSquareIcon />
            Adjust Factors
          </SectionTitle>
          
          {adjustableFactors.slice(0, 5).map(factor => {
            const originalValue = factor.value || 0;
            const currentValue = adjustments[factor.id] !== undefined ? adjustments[factor.id] : originalValue;
            const min = Math.max(0, originalValue * 0.5);
            const max = originalValue * 2;
            
            return (
              <FactorAdjustment key={factor.id}>
                <FactorLabel>{factor.stepName}</FactorLabel>
                <SliderContainer>
                  <Slider
                    type="range"
                    min={min}
                    max={max}
                    step={originalValue * 0.01}
                    value={currentValue}
                    onChange={(e) => handleAdjustment(factor.id, parseFloat(e.target.value))}
                  />
                  <ValueDisplay>{currentValue.toFixed(2)}</ValueDisplay>
                </SliderContainer>
              </FactorAdjustment>
            );
          })}
          
          {adjustableFactors.length > 5 && (
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '12px', fontStyle: 'italic' }}>
              Showing first 5 factors. Adjust values in the table below for more control.
            </p>
          )}
        </InputSection>

        <ResultsSection>
          <SectionTitle>
            <ChartBarSquareIcon />
            Scenario Results
          </SectionTitle>
          
          <ComparisonCard>
            <ComparisonRow>
              <ComparisonLabel>Base Premium</ComparisonLabel>
              <ComparisonValue>${basePremium.toFixed(2)}</ComparisonValue>
            </ComparisonRow>
            <ComparisonRow>
              <ComparisonLabel>Scenario Premium</ComparisonLabel>
              <ComparisonValue>${scenarioPremium.toFixed(2)}</ComparisonValue>
            </ComparisonRow>
            <ComparisonRow>
              <ComparisonLabel>Difference</ComparisonLabel>
              <DifferenceIndicator positive={difference >= 0}>
                {difference >= 0 ? '+' : ''}${difference.toFixed(2)}
                {' '}({differencePercent >= 0 ? '+' : ''}{differencePercent.toFixed(1)}%)
              </DifferenceIndicator>
            </ComparisonRow>
          </ComparisonCard>
          
          <div style={{ marginBottom: '12px' }}>
            <FactorLabel>Scenario Name</FactorLabel>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="e.g., High Risk Territory"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>
          
          <ActionButtons>
            <Button onClick={handleSave} style={{ flex: 1 }}>
              <BookmarkIcon style={{ width: 16, height: 16, marginRight: 6 }} />
              Save Scenario
            </Button>
            <Button variant="ghost" onClick={handleReset}>
              <ArrowPathIcon style={{ width: 16, height: 16, marginRight: 6 }} />
              Reset
            </Button>
          </ActionButtons>
          
          {savedScenarios.length > 0 && (
            <SavedScenarios>
              <FactorLabel>Saved Scenarios</FactorLabel>
              {savedScenarios.map(scenario => (
                <ScenarioChip key={scenario.id} onClick={() => loadScenario(scenario)}>
                  <BookmarkIcon />
                  {scenario.name} (${scenario.premium.toFixed(2)})
                </ScenarioChip>
              ))}
            </SavedScenarios>
          )}
        </ResultsSection>
      </ScenarioGrid>
    </TesterContainer>
  );
};

export default ScenarioTester;

