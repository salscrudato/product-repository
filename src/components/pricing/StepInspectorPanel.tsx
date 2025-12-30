import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  XMarkIcon,
  DocumentDuplicateIcon,
  EyeSlashIcon,
  EyeIcon,
  TrashIcon,
  TagIcon,
  MapPinIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import type { RatingStep, Coverage } from './RatingAlgorithmBuilder';
import type { StepValueType, StepScope, StepRoundingMode } from '../../types/pricing';

// ============================================================================
// Types
// ============================================================================

interface StepInspectorPanelProps {
  step: RatingStep | null;
  coverages: Coverage[];
  allStates: string[];
  onUpdateStep: (stepId: string, updates: Partial<RatingStep>) => Promise<void>;
  onDuplicateStep?: (step: RatingStep) => Promise<void>;
  onDeleteStep: (stepId: string) => Promise<void>;
  onOpenCoverageModal: (step: RatingStep) => void;
  onOpenStatesModal: (step: RatingStep) => void;
  onClose: () => void;
  isLiveMode?: boolean;
}

// ============================================================================
// Animations
// ============================================================================

const slideIn = keyframes`
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
`;

// ============================================================================
// Styled Components
// ============================================================================

const InspectorContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  animation: ${slideIn} 0.25s ease-out;
  overflow: hidden;
`;

const InspectorHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.95) 100%);
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
`;

const HeaderTitle = styled.h3`
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const IconBtn = styled.button<{ $variant?: 'default' | 'danger' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ $variant }) => $variant === 'danger' ? '#ef4444' : '#64748b'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ $variant }) => $variant === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)'};
    color: ${({ $variant }) => $variant === 'danger' ? '#dc2626' : '#6366f1'};
  }
  
  svg { width: 18px; height: 18px; }
`;

const InspectorBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(203, 213, 225, 0.5); border-radius: 3px; }
`;

const FieldGroup = styled.div`
  margin-bottom: 20px;
`;

const FieldLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  
  svg { width: 14px; height: 14px; opacity: 0.7; }
`;

const TextInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid rgba(226, 232, 240, 0.8);
  border-radius: 10px;
  font-size: 14px;
  color: #1e293b;
  background: rgba(248, 250, 252, 0.5);
  transition: all 0.2s ease;
  
  &:hover { border-color: #cbd5e1; }
  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    background: white;
  }
  
  &::placeholder { color: #94a3b8; }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid rgba(226, 232, 240, 0.8);
  border-radius: 10px;
  font-size: 14px;
  color: #1e293b;
  background: rgba(248, 250, 252, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover { border-color: #cbd5e1; }
  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid rgba(226, 232, 240, 0.8);
  border-radius: 10px;
  font-size: 14px;
  color: #1e293b;
  background: rgba(248, 250, 252, 0.5);
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
  transition: all 0.2s ease;

  &:hover { border-color: #cbd5e1; }
  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    background: white;
  }

  &::placeholder { color: #94a3b8; }
`;

const ValueInputGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ValueInput = styled.input`
  flex: 1;
  padding: 10px 14px;
  border: 1.5px solid rgba(226, 232, 240, 0.8);
  border-radius: 10px;
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  background: rgba(248, 250, 252, 0.5);
  text-align: right;
  transition: all 0.2s ease;

  &:hover { border-color: #cbd5e1; }
  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    background: white;
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  -moz-appearance: textfield;
`;

const ValuePrefix = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #6366f1;
  min-width: 24px;
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: rgba(248, 250, 252, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 10px;
  margin-bottom: 12px;
`;

const ToggleLabel = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 8px;

  svg { width: 16px; height: 16px; color: #64748b; }
`;

const Toggle = styled.button<{ $active?: boolean }>`
  width: 44px;
  height: 24px;
  border-radius: 12px;
  border: none;
  background: ${({ $active }) => $active ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : '#cbd5e1'};
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ $active }) => $active ? '22px' : '2px'};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: left 0.2s ease;
  }
`;

const BadgeButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #6366f1;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
    border-color: rgba(99, 102, 241, 0.25);
  }

  svg { width: 14px; height: 14px; }
`;

const GridRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const Divider = styled.div`
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(226, 232, 240, 0.8), transparent);
  margin: 20px 0;
`;

const EmptyInspector = styled.div`
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

const OperandGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
`;

const OperandButton = styled.button<{ $selected?: boolean }>`
  padding: 12px;
  border-radius: 10px;
  border: 1.5px solid ${({ $selected }) => $selected ? '#6366f1' : 'rgba(226, 232, 240, 0.8)'};
  background: ${({ $selected }) => $selected ? 'rgba(99, 102, 241, 0.1)' : 'white'};
  color: ${({ $selected }) => $selected ? '#6366f1' : '#64748b'};
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #6366f1;
    color: #6366f1;
  }
`;

// ============================================================================
// Helper Functions
// ============================================================================

const getValuePrefix = (valueType?: StepValueType): string => {
  switch (valueType) {
    case 'multiplier': return '×';
    case 'percentage': return '%';
    case 'flat': return '$';
    default: return '';
  }
};

const getOperandLabel = (op: string): string => {
  switch (op) {
    case '+': return 'Add';
    case '-': return 'Subtract';
    case '*': return 'Multiply';
    case '/': return 'Divide';
    case '=': return 'Equals';
    default: return op;
  }
};

// ============================================================================
// Component
// ============================================================================

export const StepInspectorPanel: React.FC<StepInspectorPanelProps> = ({
  step,
  coverages,
  allStates,
  onUpdateStep,
  onDuplicateStep,
  onDeleteStep,
  onOpenCoverageModal,
  onOpenStatesModal,
  onClose,
  isLiveMode = true,
}) => {
  const [localStep, setLocalStep] = useState<RatingStep | null>(step);
  const [hasChanges, setHasChanges] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state with prop
  useEffect(() => {
    setLocalStep(step);
    setHasChanges(false);
  }, [step?.id]);

  // Debounced update for live mode
  const handleFieldChange = useCallback((field: keyof RatingStep, value: unknown) => {
    if (!localStep) return;

    const updated = { ...localStep, [field]: value };
    setLocalStep(updated);
    setHasChanges(true);

    if (isLiveMode) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onUpdateStep(localStep.id, { [field]: value });
      }, 300);
    }
  }, [localStep, isLiveMode, onUpdateStep]);

  // Handle operand change
  const handleOperandChange = useCallback((operand: string) => {
    if (!localStep) return;
    handleFieldChange('operand', operand);
  }, [localStep, handleFieldChange]);

  // Handle enabled toggle
  const handleEnabledToggle = useCallback(() => {
    if (!localStep) return;
    handleFieldChange('enabled', !(localStep.enabled ?? true));
  }, [localStep, handleFieldChange]);

  if (!step) {
    return (
      <InspectorContainer>
        <EmptyInspector>
          <InformationCircleIcon />
          <h4>No Step Selected</h4>
          <p>Click on a step in the algorithm builder to view and edit its configuration.</p>
        </EmptyInspector>
      </InspectorContainer>
    );
  }

  const isFactorStep = step.stepType === 'factor';
  const isEnabled = localStep?.enabled ?? true;

  return (
    <InspectorContainer>
      <InspectorHeader>
        <HeaderTitle>
          {isFactorStep ? 'Factor Step' : 'Operand'} Inspector
        </HeaderTitle>
        <HeaderActions>
          {onDuplicateStep && (
            <IconBtn onClick={() => onDuplicateStep(step)} title="Duplicate step">
              <DocumentDuplicateIcon />
            </IconBtn>
          )}
          <IconBtn onClick={handleEnabledToggle} title={isEnabled ? 'Disable step' : 'Enable step'}>
            {isEnabled ? <EyeSlashIcon /> : <EyeIcon />}
          </IconBtn>
          <IconBtn $variant="danger" onClick={() => onDeleteStep(step.id)} title="Delete step">
            <TrashIcon />
          </IconBtn>
          <IconBtn onClick={onClose} title="Close inspector">
            <XMarkIcon />
          </IconBtn>
        </HeaderActions>
      </InspectorHeader>

      <InspectorBody>
        {/* Enabled Toggle */}
        <ToggleRow>
          <ToggleLabel>
            {isEnabled ? <CheckIcon /> : <EyeSlashIcon />}
            Step {isEnabled ? 'Enabled' : 'Disabled'}
          </ToggleLabel>
          <Toggle $active={isEnabled} onClick={handleEnabledToggle} />
        </ToggleRow>

        {isFactorStep ? (
          <>
            {/* Step Name */}
            <FieldGroup>
              <FieldLabel>Step Name *</FieldLabel>
              <TextInput
                value={localStep?.stepName || ''}
                onChange={(e) => handleFieldChange('stepName', e.target.value)}
                placeholder="Enter step name..."
              />
            </FieldGroup>

            {/* Value Type */}
            <FieldGroup>
              <FieldLabel>Value Type</FieldLabel>
              <Select
                value={localStep?.valueType || 'flat'}
                onChange={(e) => handleFieldChange('valueType', e.target.value)}
              >
                <option value="flat">Flat Amount ($)</option>
                <option value="multiplier">Multiplier (×)</option>
                <option value="percentage">Percentage (%)</option>
                <option value="table">Table Lookup</option>
                <option value="expression">Expression</option>
              </Select>
            </FieldGroup>

            {/* Value Input */}
            <FieldGroup>
              <FieldLabel>Value</FieldLabel>
              <ValueInputGroup>
                <ValuePrefix>{getValuePrefix(localStep?.valueType)}</ValuePrefix>
                <ValueInput
                  type="number"
                  value={localStep?.value || 0}
                  onChange={(e) => handleFieldChange('value', parseFloat(e.target.value) || 0)}
                />
              </ValueInputGroup>
            </FieldGroup>

            <Divider />

            {/* Applicability */}
            <FieldGroup>
              <FieldLabel>Applicability</FieldLabel>
              <GridRow style={{ marginBottom: 12 }}>
                <BadgeButton onClick={() => onOpenCoverageModal(step)}>
                  <TagIcon />
                  {step.coverages?.length === 1
                    ? step.coverages[0]
                    : `${step.coverages?.length || 0} coverages`}
                </BadgeButton>
                <BadgeButton onClick={() => onOpenStatesModal(step)}>
                  <MapPinIcon />
                  {step.states?.length === 50
                    ? 'All States'
                    : `${step.states?.length || 0} states`}
                </BadgeButton>
              </GridRow>
            </FieldGroup>

            {/* Scope */}
            <FieldGroup>
              <FieldLabel>Scope</FieldLabel>
              <Select
                value={localStep?.scope || 'policy'}
                onChange={(e) => handleFieldChange('scope', e.target.value)}
              >
                <option value="policy">Policy Level</option>
                <option value="coverage">Coverage Level</option>
                <option value="location">Location Level</option>
                <option value="item">Item Level</option>
              </Select>
            </FieldGroup>

            <Divider />

            {/* Caps */}
            <FieldGroup>
              <FieldLabel>Result Caps (Optional)</FieldLabel>
              <GridRow>
                <div>
                  <FieldLabel style={{ fontSize: 11 }}>Min (Floor)</FieldLabel>
                  <TextInput
                    type="number"
                    value={localStep?.minCap || ''}
                    onChange={(e) => handleFieldChange('minCap', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="No min"
                  />
                </div>
                <div>
                  <FieldLabel style={{ fontSize: 11 }}>Max (Cap)</FieldLabel>
                  <TextInput
                    type="number"
                    value={localStep?.maxCap || ''}
                    onChange={(e) => handleFieldChange('maxCap', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="No max"
                  />
                </div>
              </GridRow>
            </FieldGroup>

            {/* Rounding */}
            <FieldGroup>
              <FieldLabel>Step Rounding</FieldLabel>
              <Select
                value={localStep?.stepRoundingMode || 'none'}
                onChange={(e) => handleFieldChange('stepRoundingMode', e.target.value)}
              >
                <option value="none">None</option>
                <option value="nearest">Nearest</option>
                <option value="up">Round Up</option>
                <option value="down">Round Down</option>
                <option value="bankers">Banker's Rounding</option>
              </Select>
            </FieldGroup>

            <Divider />

            {/* Notes */}
            <FieldGroup>
              <FieldLabel>
                <InformationCircleIcon />
                Notes / Audit Description
              </FieldLabel>
              <TextArea
                value={localStep?.notes || ''}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Add notes for auditability..."
              />
            </FieldGroup>
          </>
        ) : (
          /* Operand Step */
          <>
            <FieldGroup>
              <FieldLabel>Operand</FieldLabel>
              <OperandGrid>
                {['+', '-', '*', '/', '='].map(op => (
                  <OperandButton
                    key={op}
                    $selected={localStep?.operand === op}
                    onClick={() => handleOperandChange(op)}
                    title={getOperandLabel(op)}
                  >
                    {op}
                  </OperandButton>
                ))}
              </OperandGrid>
            </FieldGroup>

            <FieldGroup style={{ marginTop: 16 }}>
              <FieldLabel>Selected: {getOperandLabel(localStep?.operand || '')}</FieldLabel>
            </FieldGroup>
          </>
        )}
      </InspectorBody>
    </InspectorContainer>
  );
};

export default StepInspectorPanel;

