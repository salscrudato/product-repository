/**
 * DeductibleTypeSelector Component
 * Selector for coverage deductible types with conditional fields
 */

import React, { useEffect } from 'react';
import styled from 'styled-components';
import { CoverageDeductible, DeductibleType } from '../../types';

interface DeductibleTypeSelectorProps {
  value: Partial<CoverageDeductible>;
  onChange: (deductible: Partial<CoverageDeductible>) => void;
}

const DEDUCTIBLE_TYPES: { value: DeductibleType; label: string; description: string }[] = [
  { 
    value: 'flat', 
    label: 'Flat Dollar Amount', 
    description: 'Fixed dollar amount deducted from each claim' 
  },
  { 
    value: 'percentage', 
    label: 'Percentage', 
    description: 'Percentage of the loss or insured value' 
  },
  { 
    value: 'franchise', 
    label: 'Franchise', 
    description: 'No deductible if loss exceeds the franchise amount' 
  },
  { 
    value: 'disappearing', 
    label: 'Disappearing', 
    description: 'Deductible decreases as loss amount increases' 
  },
  { 
    value: 'perOccurrence', 
    label: 'Per Occurrence', 
    description: 'Applied to each separate occurrence' 
  },
  { 
    value: 'aggregate', 
    label: 'Aggregate', 
    description: 'Maximum deductible for all occurrences in policy period' 
  },
  { 
    value: 'waiting', 
    label: 'Waiting Period', 
    description: 'Time period before coverage begins (for time-based deductibles)' 
  },
];

export const DeductibleTypeSelector: React.FC<DeductibleTypeSelectorProps> = ({ value, onChange }) => {
  // Auto-generate display value when amount/percentage or type changes
  useEffect(() => {
    if (value.deductibleType) {
      let displayValue = '';

      if (value.deductibleType === 'percentage' && value.percentage) {
        displayValue = `${value.percentage}%`;
      } else if (value.amount) {
        const formattedAmount = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value.amount);
        displayValue = formattedAmount;
      }

      const typeLabel = DEDUCTIBLE_TYPES.find(t => t.value === value.deductibleType)?.label || '';
      if (displayValue) {
        displayValue = `${displayValue} ${typeLabel}`;
      }

      if (displayValue) {
        onChange({ ...value, displayValue });
      }
    }
  }, [value.amount, value.percentage, value.deductibleType]);

  const handleTypeChange = (newType: DeductibleType) => {
    // Clear amount/percentage when switching types
    const updates: Partial<CoverageDeductible> = {
      ...value,
      deductibleType: newType,
    };

    if (newType === 'percentage') {
      updates.amount = undefined;
    } else {
      updates.percentage = undefined;
    }

    onChange(updates);
  };

  const handleAmountChange = (newAmount: string) => {
    const numericValue = parseFloat(newAmount.replace(/[^0-9.]/g, ''));
    if (!isNaN(numericValue)) {
      onChange({ ...value, amount: numericValue });
    } else if (newAmount === '') {
      onChange({ ...value, amount: undefined });
    }
  };

  const handlePercentageChange = (newPercentage: string) => {
    const numericValue = parseFloat(newPercentage);
    if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 100) {
      onChange({ ...value, percentage: numericValue });
    } else if (newPercentage === '') {
      onChange({ ...value, percentage: undefined });
    }
  };

  const selectedType = DEDUCTIBLE_TYPES.find(t => t.value === value.deductibleType);
  const isPercentageType = value.deductibleType === 'percentage';

  return (
    <Container>
      <FormGroup>
        <Label>Deductible Type *</Label>
        <Select
          value={value.deductibleType || 'flat'}
          onChange={(e) => handleTypeChange(e.target.value as DeductibleType)}
        >
          {DEDUCTIBLE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
        {selectedType && (
          <HelpText>{selectedType.description}</HelpText>
        )}
      </FormGroup>

      {isPercentageType ? (
        <FormGroup>
          <Label>Percentage *</Label>
          <PercentageInputWrapper>
            <PercentageInput
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={value.percentage || ''}
              onChange={(e) => handlePercentageChange(e.target.value)}
              placeholder="e.g., 10"
            />
            <PercentageSymbol>%</PercentageSymbol>
          </PercentageInputWrapper>
          <HelpText>Enter percentage (0-100)</HelpText>
        </FormGroup>
      ) : (
        <FormGroup>
          <Label>Deductible Amount *</Label>
          <AmountInput
            type="text"
            value={value.amount ? value.amount.toLocaleString() : ''}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="e.g., 1000"
          />
          <HelpText>Enter the dollar amount without $ or commas</HelpText>
        </FormGroup>
      )}

      <FormGroup>
        <Label>Display Value (Auto-generated)</Label>
        <DisplayValue>{value.displayValue || 'Will be generated automatically'}</DisplayValue>
      </FormGroup>

      <FormGrid>
        <FormGroup>
          <Label>Minimum Retained</Label>
          <Input
            type="number"
            value={value.minimumRetained || ''}
            onChange={(e) => onChange({ ...value, minimumRetained: parseFloat(e.target.value) || undefined })}
            placeholder="Optional"
          />
          <HelpText>Minimum amount insured must retain</HelpText>
        </FormGroup>

        <FormGroup>
          <Label>Maximum Retained</Label>
          <Input
            type="number"
            value={value.maximumRetained || ''}
            onChange={(e) => onChange({ ...value, maximumRetained: parseFloat(e.target.value) || undefined })}
            placeholder="Optional"
          />
          <HelpText>Maximum amount insured must retain</HelpText>
        </FormGroup>
      </FormGrid>

      <FormGroup>
        <Label>Applies To (Optional)</Label>
        <TextArea
          value={value.appliesTo?.join(', ') || ''}
          onChange={(e) => {
            const items = e.target.value.split(',').map(s => s.trim()).filter(s => s);
            onChange({ ...value, appliesTo: items.length > 0 ? items : undefined });
          }}
          placeholder="e.g., Wind, Hail, Earthquake (comma-separated)"
          rows={2}
        />
        <HelpText>Specify what types of losses this deductible applies to</HelpText>
      </FormGroup>

      <CheckboxGroup>
        <Checkbox
          type="checkbox"
          checked={value.isDefault || false}
          onChange={(e) => onChange({ ...value, isDefault: e.target.checked })}
        />
        <Label>Set as default deductible</Label>
      </CheckboxGroup>

      <CheckboxGroup>
        <Checkbox
          type="checkbox"
          checked={value.isRequired || false}
          onChange={(e) => onChange({ ...value, isRequired: e.target.checked })}
        />
        <Label>Required deductible (must be selected)</Label>
      </CheckboxGroup>

      {value.deductibleType === 'franchise' && (
        <InfoBox>
          <InfoTitle>Franchise Deductible Information</InfoTitle>
          <InfoText>
            A franchise deductible means the insured pays the full deductible amount if the loss is 
            below the franchise, but pays nothing if the loss exceeds the franchise. For example, 
            with a $1,000 franchise: a $900 loss pays $0, but a $1,100 loss pays the full $1,100.
          </InfoText>
        </InfoBox>
      )}

      {value.deductibleType === 'disappearing' && (
        <InfoBox>
          <InfoTitle>Disappearing Deductible Information</InfoTitle>
          <InfoText>
            A disappearing deductible decreases as the loss amount increases, eventually reaching 
            zero at a specified loss amount. This rewards insureds for larger losses while maintaining 
            a deductible for smaller claims.
          </InfoText>
        </InfoBox>
      )}

      {value.deductibleType === 'waiting' && (
        <InfoBox>
          <InfoTitle>Waiting Period Information</InfoTitle>
          <InfoText>
            A waiting period is a time-based deductible, commonly used in business interruption or 
            disability coverage. Coverage begins after the waiting period expires. For example, a 
            72-hour waiting period means no coverage for the first 72 hours of loss.
          </InfoText>
        </InfoBox>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #374151;
`;

const Select = styled.select`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const AmountInput = styled(Input)`
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  font-size: 16px;
  font-weight: 500;
`;

const PercentageInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const PercentageInput = styled(Input)`
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  font-size: 16px;
  font-weight: 500;
  padding-right: 40px;
`;

const PercentageSymbol = styled.span`
  position: absolute;
  right: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #6b7280;
`;

const TextArea = styled.textarea`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const DisplayValue = styled.div`
  padding: 10px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
`;

const HelpText = styled.span`
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
`;

const InfoBox = styled.div`
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 12px;
`;

const InfoTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #1e40af;
  margin-bottom: 4px;
`;

const InfoText = styled.div`
  font-size: 13px;
  color: #1e3a8a;
  line-height: 1.5;
`;

