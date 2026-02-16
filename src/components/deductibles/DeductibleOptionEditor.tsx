/**
 * DeductibleOptionEditor Component
 * 
 * Dynamic form for editing deductible options that adapts fields
 * based on the selected deductible structure type.
 */

import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import {
  CoverageDeductibleOption,
  DeductibleStructure,
  DeductibleApplicability,
  WaitingPeriodUnit
} from '@app-types';
import { formatDeductibleOptionDisplay } from '../../services/deductibleOptionsService';
import { ApplicabilityPicker } from '../selectors/ApplicabilityPicker';
import { colors } from '../common/DesignSystem';

interface DeductibleOptionEditorProps {
  option: Partial<CoverageDeductibleOption>;
  structure: DeductibleStructure;
  onChange: (option: Partial<CoverageDeductibleOption>) => void;
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

export const DeductibleOptionEditor: React.FC<DeductibleOptionEditorProps> = ({
  option,
  structure,
  onChange,
  onSave,
  onCancel,
  isNew = false
}) => {
  const [currencyInputs, setCurrencyInputs] = useState<Record<string, string>>({});

  // Initialize currency inputs from option values
  useEffect(() => {
    const inputs: Record<string, string> = {};
    if (structure === 'flat' && (option as any).amount !== undefined) {
      inputs.amount = formatCurrency((option as any).amount);
    }
    if (structure === 'percentMinMax') {
      if ((option as any).minimumAmount !== undefined) {
        inputs.minimumAmount = formatCurrency((option as any).minimumAmount);
      }
      if ((option as any).maximumAmount !== undefined) {
        inputs.maximumAmount = formatCurrency((option as any).maximumAmount);
      }
    }
    setCurrencyInputs(inputs);
  }, [option, structure]);

  const handleCurrencyChange = useCallback((field: string, value: string) => {
    setCurrencyInputs(prev => ({ ...prev, [field]: value }));
    const numValue = parseCurrency(value);
    onChange({ ...option, [field]: numValue });
  }, [option, onChange]);

  const handleCurrencyBlur = useCallback((field: string) => {
    const numValue = (option as any)[field] || 0;
    setCurrencyInputs(prev => ({ ...prev, [field]: formatCurrency(numValue) }));
  }, [option]);

  const handlePercentageChange = useCallback((percentage: number) => {
    onChange({ ...option, percentage } as Partial<CoverageDeductibleOption>);
  }, [option, onChange]);

  const handleBasisChange = useCallback((basis: string) => {
    onChange({ ...option, basis } as Partial<CoverageDeductibleOption>);
  }, [option, onChange]);

  const handleDurationChange = useCallback((duration: number) => {
    onChange({ ...option, duration } as Partial<CoverageDeductibleOption>);
  }, [option, onChange]);

  const handleUnitChange = useCallback((unit: WaitingPeriodUnit) => {
    onChange({ ...option, unit } as Partial<CoverageDeductibleOption>);
  }, [option, onChange]);

  const handleApplicabilityChange = useCallback((applicability: DeductibleApplicability) => {
    onChange({ ...option, applicability });
  }, [option, onChange]);

  // Generate display value based on structure
  const generateDisplayValue = useCallback((): string => {
    return formatDeductibleOptionDisplay(option as CoverageDeductibleOption);
  }, [option]);

  // Update display value when values change
  useEffect(() => {
    const displayValue = generateDisplayValue();
    if (displayValue !== option.displayValue) {
      onChange({ ...option, displayValue });
    }
  }, [option.structure, (option as any).amount, (option as any).percentage, 
      (option as any).minimumAmount, (option as any).maximumAmount,
      (option as any).duration, (option as any).unit]);

  const renderValueFields = () => {
    switch (structure) {
      case 'flat':
        return (
          <FieldGroup>
            <FieldLabel>Deductible Amount *</FieldLabel>
            <CurrencyInput
              value={currencyInputs.amount || ''}
              onChange={(e) => handleCurrencyChange('amount', e.target.value)}
              onBlur={() => handleCurrencyBlur('amount')}
              placeholder="$0"
            />
          </FieldGroup>
        );

      case 'percentage':
        return (
          <>
            <FieldGroup>
              <FieldLabel>Percentage *</FieldLabel>
              <PercentageInputWrapper>
                <NumberInput
                  type="number"
                  value={(option as any).percentage || ''}
                  onChange={(e) => handlePercentageChange(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  min={0}
                  max={100}
                  step={0.5}
                />
                <PercentSymbol>%</PercentSymbol>
              </PercentageInputWrapper>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Basis</FieldLabel>
              <Select
                value={(option as any).basis || 'TIV'}
                onChange={(e) => handleBasisChange(e.target.value)}
              >
                <option value="TIV">Total Insured Value (TIV)</option>
                <option value="loss">Loss Amount</option>
                <option value="limit">Policy Limit</option>
                <option value="buildingValue">Building Value</option>
              </Select>
            </FieldGroup>
          </>
        );

      case 'percentMinMax':
        return (
          <>
            <FieldGroup>
              <FieldLabel>Percentage *</FieldLabel>
              <PercentageInputWrapper>
                <NumberInput
                  type="number"
                  value={(option as any).percentage || ''}
                  onChange={(e) => handlePercentageChange(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  min={0}
                  max={100}
                  step={0.5}
                />
                <PercentSymbol>%</PercentSymbol>
              </PercentageInputWrapper>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Basis</FieldLabel>
              <Select
                value={(option as any).basis || 'TIV'}
                onChange={(e) => handleBasisChange(e.target.value)}
              >
                <option value="TIV">Total Insured Value (TIV)</option>
                <option value="loss">Loss Amount</option>
                <option value="limit">Policy Limit</option>
                <option value="buildingValue">Building Value</option>
              </Select>
            </FieldGroup>
            <FieldRow>
              <FieldGroup>
                <FieldLabel>Minimum Amount *</FieldLabel>
                <CurrencyInput
                  value={currencyInputs.minimumAmount || ''}
                  onChange={(e) => handleCurrencyChange('minimumAmount', e.target.value)}
                  onBlur={() => handleCurrencyBlur('minimumAmount')}
                  placeholder="$0"
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Maximum Amount *</FieldLabel>
                <CurrencyInput
                  value={currencyInputs.maximumAmount || ''}
                  onChange={(e) => handleCurrencyChange('maximumAmount', e.target.value)}
                  onBlur={() => handleCurrencyBlur('maximumAmount')}
                  placeholder="$0"
                />
              </FieldGroup>
            </FieldRow>
          </>
        );

      case 'waitingPeriod':
        return (
          <FieldRow>
            <FieldGroup>
              <FieldLabel>Duration *</FieldLabel>
              <NumberInput
                type="number"
                value={(option as any).duration || ''}
                onChange={(e) => handleDurationChange(parseInt(e.target.value) || 0)}
                placeholder="0"
                min={0}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Unit *</FieldLabel>
              <Select
                value={(option as any).unit || 'hours'}
                onChange={(e) => handleUnitChange(e.target.value as WaitingPeriodUnit)}
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </Select>
            </FieldGroup>
          </FieldRow>
        );

      default:
        return (
          <FieldGroup>
            <FieldLabel>Custom Value</FieldLabel>
            <TextInput
              value={(option as any).customValue || ''}
              onChange={(e) => onChange({ ...option, customValue: e.target.value } as any)}
              placeholder="Enter custom deductible value"
            />
          </FieldGroup>
        );
    }
  };

  return (
    <Container>
      <Header>
        <Title>{isNew ? 'Add Deductible Option' : 'Edit Deductible Option'}</Title>
      </Header>

      <Form>
        {/* Structure-specific value fields */}
        {renderValueFields()}

        {/* State Applicability */}
        <ApplicabilitySection>
          <ApplicabilityPicker
            value={(option.applicability || {}) as any}
            onChange={handleApplicabilityChange as any}
            showStates={true}
            showCoverageParts={false}
            showPerils={false}
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
  font-weight: 600;
  color: ${colors.gray700};
`;

const TextInput = styled.input`
  padding: 10px 14px;
  border: 1px solid ${colors.gray300};
  border-radius: 8px;
  font-size: 14px;
  color: ${colors.gray800};
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px ${colors.primary}20;
  }

  &::placeholder {
    color: ${colors.gray400};
  }
`;

const CurrencyInput = styled(TextInput)`
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
`;

const NumberInput = styled.input`
  padding: 10px 14px;
  border: 1px solid ${colors.gray300};
  border-radius: 8px;
  font-size: 14px;
  color: ${colors.gray800};
  transition: all 0.2s ease;
  width: 100%;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px ${colors.primary}20;
  }

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const PercentageInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const PercentSymbol = styled.span`
  position: absolute;
  right: 14px;
  color: ${colors.gray500};
  font-weight: 500;
`;

const Select = styled.select`
  padding: 10px 14px;
  border: 1px solid ${colors.gray300};
  border-radius: 8px;
  font-size: 14px;
  color: ${colors.gray800};
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px ${colors.primary}20;
  }
`;

const ApplicabilitySection = styled.div`
  padding-top: 20px;
  margin-top: 4px;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
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
  background: white;
  color: ${colors.gray700};
  border: 1px solid ${colors.gray300};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${colors.gray50};
    border-color: ${colors.gray400};
  }
`;

const SaveButton = styled.button`
  padding: 10px 20px;
  background: ${colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${colors.primaryDark};
    transform: translateY(-1px);
  }
`;

export default DeductibleOptionEditor;

