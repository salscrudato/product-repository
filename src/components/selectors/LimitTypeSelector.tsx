/**
 * LimitTypeSelector Component
 * Selector for coverage limit types with conditional fields
 */

import React, { useEffect } from 'react';
import styled from 'styled-components';
import { CoverageLimit, LimitType } from '../../types';

interface LimitTypeSelectorProps {
  value: Partial<CoverageLimit>;
  onChange: (limit: Partial<CoverageLimit>) => void;
}

const LIMIT_TYPES: { value: LimitType; label: string; description: string }[] = [
  { 
    value: 'perOccurrence', 
    label: 'Per Occurrence', 
    description: 'Maximum paid for each separate occurrence or event' 
  },
  { 
    value: 'aggregate', 
    label: 'Aggregate', 
    description: 'Maximum paid for all occurrences during the policy period' 
  },
  { 
    value: 'perPerson', 
    label: 'Per Person', 
    description: 'Maximum paid for each person injured in an occurrence' 
  },
  { 
    value: 'perLocation', 
    label: 'Per Location', 
    description: 'Maximum paid for each insured location' 
  },
  { 
    value: 'sublimit', 
    label: 'Sublimit', 
    description: 'Limit within a larger limit for specific types of losses' 
  },
  { 
    value: 'combined', 
    label: 'Combined Single Limit', 
    description: 'Single limit for all coverages combined' 
  },
  { 
    value: 'split', 
    label: 'Split Limit', 
    description: 'Separate limits for different types of losses' 
  },
];

export const LimitTypeSelector: React.FC<LimitTypeSelectorProps> = ({ value, onChange }) => {
  // Auto-generate display value when amount or type changes
  useEffect(() => {
    if (value.amount && value.limitType) {
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value.amount);

      const typeLabel = LIMIT_TYPES.find(t => t.value === value.limitType)?.label || '';
      const displayValue = `${formattedAmount} ${typeLabel}`;

      onChange({ ...value, displayValue });
    }
  }, [value.amount, value.limitType]);

  const handleTypeChange = (newType: LimitType) => {
    onChange({ ...value, limitType: newType });
  };

  const handleAmountChange = (newAmount: string) => {
    const numericValue = parseFloat(newAmount.replace(/[^0-9.]/g, ''));
    if (!isNaN(numericValue)) {
      onChange({ ...value, amount: numericValue });
    } else if (newAmount === '') {
      onChange({ ...value, amount: undefined });
    }
  };

  const selectedType = LIMIT_TYPES.find(t => t.value === value.limitType);

  return (
    <Container>
      <FormGroup>
        <Label>Limit Type *</Label>
        <Select
          value={value.limitType || 'perOccurrence'}
          onChange={(e) => handleTypeChange(e.target.value as LimitType)}
        >
          {LIMIT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
        {selectedType && (
          <HelpText>{selectedType.description}</HelpText>
        )}
      </FormGroup>

      <FormGroup>
        <Label>Limit Amount *</Label>
        <AmountInput
          type="text"
          value={value.amount ? value.amount.toLocaleString() : ''}
          onChange={(e) => handleAmountChange(e.target.value)}
          placeholder="e.g., 100000"
        />
        <HelpText>Enter the dollar amount without $ or commas</HelpText>
      </FormGroup>

      <FormGroup>
        <Label>Display Value (Auto-generated)</Label>
        <DisplayValue>{value.displayValue || 'Will be generated automatically'}</DisplayValue>
      </FormGroup>

      <FormGrid>
        <FormGroup>
          <Label>Minimum Amount</Label>
          <Input
            type="number"
            value={value.minAmount || ''}
            onChange={(e) => onChange({ ...value, minAmount: parseFloat(e.target.value) || undefined })}
            placeholder="Optional"
          />
        </FormGroup>

        <FormGroup>
          <Label>Maximum Amount</Label>
          <Input
            type="number"
            value={value.maxAmount || ''}
            onChange={(e) => onChange({ ...value, maxAmount: parseFloat(e.target.value) || undefined })}
            placeholder="Optional"
          />
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
          placeholder="e.g., Bodily Injury, Property Damage (comma-separated)"
          rows={2}
        />
        <HelpText>Specify what types of losses this limit applies to</HelpText>
      </FormGroup>

      <CheckboxGroup>
        <Checkbox
          type="checkbox"
          checked={value.isDefault || false}
          onChange={(e) => onChange({ ...value, isDefault: e.target.checked })}
        />
        <Label>Set as default limit</Label>
      </CheckboxGroup>

      <CheckboxGroup>
        <Checkbox
          type="checkbox"
          checked={value.isRequired || false}
          onChange={(e) => onChange({ ...value, isRequired: e.target.checked })}
        />
        <Label>Required limit (must be selected)</Label>
      </CheckboxGroup>

      {value.limitType === 'sublimit' && (
        <InfoBox>
          <InfoTitle>Sublimit Information</InfoTitle>
          <InfoText>
            Sublimits are limits within a larger limit. For example, a $50,000 sublimit for jewelry 
            within a $500,000 contents limit. The sublimit is the maximum that will be paid for that 
            specific type of loss, even if the overall limit is higher.
          </InfoText>
        </InfoBox>
      )}

      {value.limitType === 'split' && (
        <InfoBox>
          <InfoTitle>Split Limit Information</InfoTitle>
          <InfoText>
            Split limits provide separate limits for different types of losses. For example, in auto 
            liability: $100,000 per person / $300,000 per occurrence / $50,000 property damage. 
            You may want to create multiple limit entries to represent each component.
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
  font-family: 'SF Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 16px;
  font-weight: 500;
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

