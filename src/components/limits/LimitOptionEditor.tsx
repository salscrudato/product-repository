/**
 * LimitOptionEditor Component
 * 
 * Dynamic form for editing limit options that adapts fields
 * based on the selected limit structure type.
 */

import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import {
  CoverageLimitOption,
  LimitStructure,
  LimitOptionValue,
  SingleLimitValue,
  OccAggLimitValue,
  SplitLimitValue,
  CSLLimitValue,
  SublimitValue,
  ScheduledLimitValue,
  SplitLimitComponent,
  LimitApplicability
} from '@types';
import { generateDisplayValue } from '../../services/limitOptionService';
import { ApplicabilityPicker } from '../selectors/ApplicabilityPicker';
import { colors } from '../common/DesignSystem';

interface LimitOptionEditorProps {
  option: Partial<CoverageLimitOption>;
  structure: LimitStructure;
  splitComponents?: Omit<SplitLimitComponent, 'amount'>[];
  onChange: (option: Partial<CoverageLimitOption>) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew?: boolean;
}

// Currency formatting helpers
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
};

export const LimitOptionEditor: React.FC<LimitOptionEditorProps> = ({
  option,
  structure,
  splitComponents = [],
  onChange,
  onSave,
  onCancel,
  isNew = false
}) => {
  const [currencyInputs, setCurrencyInputs] = useState<Record<string, string>>({});

  // Initialize currency inputs from option values
  useEffect(() => {
    const inputs: Record<string, string> = {};
    
    switch (structure) {
      case 'single':
      case 'csl':
        inputs.amount = formatCurrency((option as SingleLimitValue).amount || 0);
        break;
      case 'occAgg':
        inputs.perOccurrence = formatCurrency((option as OccAggLimitValue).perOccurrence || 0);
        inputs.aggregate = formatCurrency((option as OccAggLimitValue).aggregate || 0);
        break;
      case 'sublimit':
        inputs.amount = formatCurrency((option as SublimitValue).amount || 0);
        break;
      case 'scheduled':
        inputs.perItemMin = formatCurrency((option as ScheduledLimitValue).perItemMin || 0);
        inputs.perItemMax = formatCurrency((option as ScheduledLimitValue).perItemMax || 0);
        inputs.totalCap = formatCurrency((option as ScheduledLimitValue).totalCap || 0);
        break;
      case 'split':
        const splitOpt = option as SplitLimitValue;
        splitOpt.components?.forEach(c => {
          inputs[`split_${c.key}`] = formatCurrency(c.amount || 0);
        });
        break;
    }
    
    setCurrencyInputs(inputs);
  }, [option.id, structure]);

  const handleCurrencyChange = useCallback((field: string, value: string) => {
    setCurrencyInputs(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleCurrencyBlur = useCallback((field: string) => {
    const numValue = parseCurrency(currencyInputs[field] || '0');
    setCurrencyInputs(prev => ({ ...prev, [field]: formatCurrency(numValue) }));
    
    // Update the option value
    let updatedValue: Partial<LimitOptionValue> = {};
    
    switch (structure) {
      case 'single':
        updatedValue = { structure: 'single', amount: numValue };
        break;
      case 'csl':
        updatedValue = { structure: 'csl', amount: numValue };
        break;
      case 'occAgg':
        if (field === 'perOccurrence') {
          updatedValue = { 
            structure: 'occAgg', 
            perOccurrence: numValue,
            aggregate: (option as OccAggLimitValue).aggregate || 0
          };
        } else {
          updatedValue = { 
            structure: 'occAgg', 
            perOccurrence: (option as OccAggLimitValue).perOccurrence || 0,
            aggregate: numValue
          };
        }
        break;
      case 'sublimit':
        updatedValue = { 
          structure: 'sublimit', 
          amount: numValue,
          sublimitTag: (option as SublimitValue).sublimitTag
        };
        break;
      case 'scheduled':
        const schedOpt = option as ScheduledLimitValue;
        updatedValue = {
          structure: 'scheduled',
          perItemMin: field === 'perItemMin' ? numValue : schedOpt.perItemMin,
          perItemMax: field === 'perItemMax' ? numValue : schedOpt.perItemMax,
          totalCap: field === 'totalCap' ? numValue : schedOpt.totalCap
        };
        break;
      case 'split':
        const key = field.replace('split_', '');
        const currentComponents = (option as SplitLimitValue).components || [];
        const updatedComponents = currentComponents.map(c => 
          c.key === key ? { ...c, amount: numValue } : c
        );
        updatedValue = { structure: 'split', components: updatedComponents };
        break;
    }
    
    const newDisplayValue = generateDisplayValue(updatedValue as LimitOptionValue);
    onChange({ 
      ...option, 
      ...updatedValue,
      displayValue: newDisplayValue,
      label: option.label || newDisplayValue
    });
  }, [currencyInputs, structure, option, onChange]);

  const handleApplicabilityChange = useCallback((applicability: LimitApplicability) => {
    onChange({ ...option, applicability });
  }, [option, onChange]);

  const handleLabelChange = useCallback((label: string) => {
    onChange({ ...option, label });
  }, [option, onChange]);

  const handleSublimitTagChange = useCallback((sublimitTag: string) => {
    onChange({ ...option, sublimitTag } as Partial<CoverageLimitOption>);
  }, [option, onChange]);

  // Render structure-specific fields
  const renderValueFields = () => {
    switch (structure) {
      case 'single':
      case 'csl':
        return (
          <FieldGroup>
            <FieldLabel>Limit Amount *</FieldLabel>
            <CurrencyInput
              value={currencyInputs.amount || ''}
              onChange={(e) => handleCurrencyChange('amount', e.target.value)}
              onBlur={() => handleCurrencyBlur('amount')}
              placeholder="$0"
            />
          </FieldGroup>
        );

      case 'occAgg':
        return (
          <>
            <FieldRow>
              <FieldGroup>
                <FieldLabel>Per Occurrence *</FieldLabel>
                <CurrencyInput
                  value={currencyInputs.perOccurrence || ''}
                  onChange={(e) => handleCurrencyChange('perOccurrence', e.target.value)}
                  onBlur={() => handleCurrencyBlur('perOccurrence')}
                  placeholder="$0"
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Aggregate *</FieldLabel>
                <CurrencyInput
                  value={currencyInputs.aggregate || ''}
                  onChange={(e) => handleCurrencyChange('aggregate', e.target.value)}
                  onBlur={() => handleCurrencyBlur('aggregate')}
                  placeholder="$0"
                />
              </FieldGroup>
            </FieldRow>
          </>
        );

      case 'split':
        return (
          <SplitFieldsContainer>
            <FieldLabel>Split Limit Components *</FieldLabel>
            <SplitFieldsGrid>
              {splitComponents.map(comp => (
                <FieldGroup key={comp.key}>
                  <SplitFieldLabel>{comp.label}</SplitFieldLabel>
                  <CurrencyInput
                    value={currencyInputs[`split_${comp.key}`] || ''}
                    onChange={(e) => handleCurrencyChange(`split_${comp.key}`, e.target.value)}
                    onBlur={() => handleCurrencyBlur(`split_${comp.key}`)}
                    placeholder="$0"
                  />
                </FieldGroup>
              ))}
            </SplitFieldsGrid>
          </SplitFieldsContainer>
        );

      case 'sublimit':
        return (
          <>
            <FieldRow>
              <FieldGroup>
                <FieldLabel>Sublimit Amount *</FieldLabel>
                <CurrencyInput
                  value={currencyInputs.amount || ''}
                  onChange={(e) => handleCurrencyChange('amount', e.target.value)}
                  onBlur={() => handleCurrencyBlur('amount')}
                  placeholder="$0"
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Applies To</FieldLabel>
                <TextInput
                  value={(option as SublimitValue).sublimitTag || ''}
                  onChange={(e) => handleSublimitTagChange(e.target.value)}
                  placeholder="e.g., Theft, Water Damage"
                />
              </FieldGroup>
            </FieldRow>
          </>
        );

      case 'scheduled':
        return (
          <>
            <FieldRow>
              <FieldGroup>
                <FieldLabel>Per Item Min</FieldLabel>
                <CurrencyInput
                  value={currencyInputs.perItemMin || ''}
                  onChange={(e) => handleCurrencyChange('perItemMin', e.target.value)}
                  onBlur={() => handleCurrencyBlur('perItemMin')}
                  placeholder="$0"
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Per Item Max</FieldLabel>
                <CurrencyInput
                  value={currencyInputs.perItemMax || ''}
                  onChange={(e) => handleCurrencyChange('perItemMax', e.target.value)}
                  onBlur={() => handleCurrencyBlur('perItemMax')}
                  placeholder="$0"
                />
              </FieldGroup>
            </FieldRow>
            <FieldGroup>
              <FieldLabel>Total Cap</FieldLabel>
              <CurrencyInput
                value={currencyInputs.totalCap || ''}
                onChange={(e) => handleCurrencyChange('totalCap', e.target.value)}
                onBlur={() => handleCurrencyBlur('totalCap')}
                placeholder="$0"
              />
            </FieldGroup>
          </>
        );

      case 'custom':
        return (
          <FieldGroup>
            <FieldLabel>Custom Configuration</FieldLabel>
            <TextArea
              placeholder="Describe the custom limit structure..."
              rows={3}
            />
          </FieldGroup>
        );

      default:
        return null;
    }
  };

  return (
    <Container>
      <Header>
        <Title>{isNew ? 'Add Limit Option' : 'Edit Limit Option'}</Title>
      </Header>

      <Form>
        {/* Display Label */}
        <FieldGroup>
          <FieldLabel>Display Label</FieldLabel>
          <TextInput
            value={option.label || ''}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="Auto-generated from values"
          />
          <FieldHint>Leave blank to auto-generate from limit values</FieldHint>
        </FieldGroup>

        {/* Structure-specific value fields */}
        {renderValueFields()}

        {/* Preview */}
        {option.displayValue && (
          <PreviewBox>
            <PreviewLabel>Preview</PreviewLabel>
            <PreviewValue>{option.displayValue}</PreviewValue>
          </PreviewBox>
        )}

        {/* Applicability */}
        <ApplicabilitySection>
          <ApplicabilityPicker
            value={option.applicability || {}}
            onChange={handleApplicabilityChange}
            showStates={true}
            showCoverageParts={structure === 'sublimit'}
            showPerils={structure === 'sublimit'}
          />
        </ApplicabilitySection>
      </Form>

      <Footer>
        <CancelButton onClick={onCancel}>Cancel</CancelButton>
        <SaveButton onClick={onSave}>
          {isNew ? 'Add Option' : 'Save Changes'}
        </SaveButton>
      </Footer>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
`;

const Header = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid ${colors.gray200};
`;

const Title = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${colors.gray800};
`;

const Form = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const FieldLabel = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: ${colors.gray700};
`;

const FieldHint = styled.span`
  font-size: 11px;
  color: ${colors.gray500};
`;

const CurrencyInput = styled.input`
  padding: 10px 12px;
  border: 1px solid ${colors.gray300};
  border-radius: 8px;
  font-size: 14px;
  font-family: 'SF Mono', ui-monospace, monospace;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px ${colors.primary}20;
  }
`;

const TextInput = styled.input`
  padding: 10px 12px;
  border: 1px solid ${colors.gray300};
  border-radius: 8px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px ${colors.primary}20;
  }
`;

const TextArea = styled.textarea`
  padding: 10px 12px;
  border: 1px solid ${colors.gray300};
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px ${colors.primary}20;
  }
`;

const SplitFieldsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SplitFieldsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
`;

const SplitFieldLabel = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: ${colors.gray600};
`;

const PreviewBox = styled.div`
  padding: 16px;
  background: ${colors.gray50};
  border-radius: 8px;
  border: 1px solid ${colors.gray200};
`;

const PreviewLabel = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: ${colors.gray500};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
`;

const PreviewValue = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${colors.gray800};
  font-family: 'SF Mono', ui-monospace, monospace;
`;

const ApplicabilitySection = styled.div`
  padding-top: 16px;
  border-top: 1px solid ${colors.gray200};
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid ${colors.gray200};
  background: ${colors.gray50};
`;

const CancelButton = styled.button`
  padding: 10px 20px;
  border: 1px solid ${colors.gray300};
  border-radius: 8px;
  background: white;
  font-size: 14px;
  font-weight: 500;
  color: ${colors.gray700};
  cursor: pointer;

  &:hover {
    background: ${colors.gray50};
  }
`;

const SaveButton = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: ${colors.primary};
  font-size: 14px;
  font-weight: 500;
  color: white;
  cursor: pointer;

  &:hover {
    background: ${colors.primaryDark};
  }
`;

export default LimitOptionEditor;

