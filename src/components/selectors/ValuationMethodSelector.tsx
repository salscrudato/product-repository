/**
 * ValuationMethodSelector Component
 * Selector for property valuation methods (ACV, RC, Agreed Value, etc.)
 */

import React from 'react';
import styled from 'styled-components';
import { ValuationMethod } from '../../types';

interface ValuationMethodSelectorProps {
  value?: ValuationMethod;
  onChange: (method: ValuationMethod) => void;
}

const VALUATION_OPTIONS: { value: ValuationMethod; label: string; description: string }[] = [
  {
    value: 'ACV',
    label: 'Actual Cash Value (ACV)',
    description: 'Replacement cost minus depreciation. Most common for property insurance.'
  },
  {
    value: 'RC',
    label: 'Replacement Cost (RC)',
    description: 'Cost to replace with new property of like kind and quality, without depreciation deduction.'
  },
  {
    value: 'agreedValue',
    label: 'Agreed Value',
    description: 'Pre-agreed value between insurer and insured. No depreciation or coinsurance penalty. Common for classic cars, fine art.'
  },
  {
    value: 'marketValue',
    label: 'Market Value',
    description: 'Current market price for similar property. Common for vehicles and real estate.'
  },
  {
    value: 'functionalRC',
    label: 'Functional Replacement Cost',
    description: 'Cost to replace with property that serves the same function, but may use different materials or design.'
  },
  {
    value: 'statedAmount',
    label: 'Stated Amount',
    description: 'Maximum amount payable, but actual loss may be valued differently (e.g., ACV). Common in auto insurance.'
  },
];

export const ValuationMethodSelector: React.FC<ValuationMethodSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <Container>
      <Select
        value={value || ''}
        onChange={(e) => onChange(e.target.value as ValuationMethod)}
      >
        <option value="">Select valuation method...</option>
        {VALUATION_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      {value && (
        <SelectedInfo>
          <InfoTitle>
            {VALUATION_OPTIONS.find(o => o.value === value)?.label}
          </InfoTitle>
          <InfoDescription>
            {VALUATION_OPTIONS.find(o => o.value === value)?.description}
          </InfoDescription>
        </SelectedInfo>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Select = styled.select`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #111827;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  option {
    padding: 8px;
  }
`;

const SelectedInfo = styled.div`
  background: #f3f4f6;
  border-radius: 6px;
  padding: 12px;
`;

const InfoTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
`;

const InfoDescription = styled.div`
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
`;

