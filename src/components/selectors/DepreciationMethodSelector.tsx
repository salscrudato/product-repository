/**
 * DepreciationMethodSelector Component
 * Selector for depreciation calculation methods
 */

import React from 'react';
import styled from 'styled-components';
import { DepreciationMethod } from '../../types';

interface DepreciationMethodSelectorProps {
  value?: DepreciationMethod;
  onChange: (method: DepreciationMethod) => void;
}

const DEPRECIATION_OPTIONS: { value: DepreciationMethod; label: string; description: string }[] = [
  {
    value: 'straightLine',
    label: 'Straight-Line',
    description: 'Equal depreciation each year over the useful life. Most common and simple method.'
  },
  {
    value: 'decliningBalance',
    label: 'Declining Balance',
    description: 'Higher depreciation in early years, decreasing over time. Common for vehicles and equipment.'
  },
  {
    value: 'unitsOfProduction',
    label: 'Units of Production',
    description: 'Depreciation based on actual usage (miles, hours, units produced). Common for machinery and vehicles.'
  },
  {
    value: 'sumOfYearsDigits',
    label: 'Sum of Years Digits',
    description: 'Accelerated depreciation method. Higher depreciation in early years using a fraction based on remaining life.'
  },
];

export const DepreciationMethodSelector: React.FC<DepreciationMethodSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <Container>
      <Label>Depreciation Method</Label>
      <HelpText>
        Method used to calculate depreciation for Actual Cash Value (ACV) settlements
      </HelpText>

      <Select
        value={value || ''}
        onChange={(e) => onChange(e.target.value as DepreciationMethod)}
      >
        <option value="">Select depreciation method...</option>
        {DEPRECIATION_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      {value && (
        <SelectedInfo>
          <InfoTitle>
            {DEPRECIATION_OPTIONS.find(o => o.value === value)?.label}
          </InfoTitle>
          <InfoDescription>
            {DEPRECIATION_OPTIONS.find(o => o.value === value)?.description}
          </InfoDescription>
        </SelectedInfo>
      )}

      {value === 'straightLine' && (
        <InfoBox>
          <InfoTitle>Straight-Line Depreciation Formula</InfoTitle>
          <InfoText>
            <strong>Annual Depreciation = (Cost - Salvage Value) ÷ Useful Life</strong>
            <br /><br />
            <strong>Example:</strong>
            <ul>
              <li>Original Cost: $10,000</li>
              <li>Salvage Value: $1,000</li>
              <li>Useful Life: 10 years</li>
              <li>Annual Depreciation: ($10,000 - $1,000) ÷ 10 = $900/year</li>
            </ul>
            <br />
            After 5 years: ACV = $10,000 - ($900 × 5) = $5,500
          </InfoText>
        </InfoBox>
      )}

      {value === 'decliningBalance' && (
        <InfoBox>
          <InfoTitle>Declining Balance Depreciation Formula</InfoTitle>
          <InfoText>
            <strong>Annual Depreciation = Book Value × Depreciation Rate</strong>
            <br /><br />
            Common rates: 150% (1.5× straight-line) or 200% (double-declining)
            <br /><br />
            <strong>Example (Double-Declining, 10-year life):</strong>
            <ul>
              <li>Rate: 20% (2 ÷ 10 years)</li>
              <li>Year 1: $10,000 × 20% = $2,000</li>
              <li>Year 2: $8,000 × 20% = $1,600</li>
              <li>Year 3: $6,400 × 20% = $1,280</li>
            </ul>
          </InfoText>
        </InfoBox>
      )}

      {value === 'unitsOfProduction' && (
        <InfoBox>
          <InfoTitle>Units of Production Depreciation Formula</InfoTitle>
          <InfoText>
            <strong>Depreciation per Unit = (Cost - Salvage Value) ÷ Total Expected Units</strong>
            <br /><br />
            <strong>Example (Vehicle with 100,000 mile life):</strong>
            <ul>
              <li>Cost: $30,000</li>
              <li>Salvage: $5,000</li>
              <li>Expected Miles: 100,000</li>
              <li>Per Mile: ($30,000 - $5,000) ÷ 100,000 = $0.25/mile</li>
            </ul>
            <br />
            After 40,000 miles: ACV = $30,000 - (40,000 × $0.25) = $20,000
          </InfoText>
        </InfoBox>
      )}

      {value === 'sumOfYearsDigits' && (
        <InfoBox>
          <InfoTitle>Sum of Years Digits Depreciation Formula</InfoTitle>
          <InfoText>
            <strong>Depreciation = (Remaining Life ÷ Sum of Years) × Depreciable Base</strong>
            <br /><br />
            <strong>Example (5-year life):</strong>
            <ul>
              <li>Sum of Years: 1+2+3+4+5 = 15</li>
              <li>Depreciable Base: $10,000 - $1,000 = $9,000</li>
              <li>Year 1: (5÷15) × $9,000 = $3,000</li>
              <li>Year 2: (4÷15) × $9,000 = $2,400</li>
              <li>Year 3: (3÷15) × $9,000 = $1,800</li>
            </ul>
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
  gap: 12px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #374151;
`;

const HelpText = styled.span`
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
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

const InfoBox = styled.div`
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 12px;
  margin-top: 8px;
`;

const InfoText = styled.div`
  font-size: 13px;
  color: #1e3a8a;
  line-height: 1.6;

  strong {
    color: #1e40af;
    font-weight: 600;
  }

  ul {
    margin: 8px 0 0 0;
    padding-left: 20px;
  }

  li {
    margin: 4px 0;
  }
`;

