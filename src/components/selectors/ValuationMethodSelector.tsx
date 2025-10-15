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
      <Label>Valuation Method</Label>
      <HelpText>
        Determines how property losses are valued for claim settlement
      </HelpText>

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

      {value === 'ACV' && (
        <InfoBox>
          <InfoTitle>ACV Calculation</InfoTitle>
          <InfoText>
            <strong>ACV = Replacement Cost - Depreciation</strong>
            <br /><br />
            Depreciation is typically calculated based on:
            <ul>
              <li>Age of the property</li>
              <li>Condition and maintenance</li>
              <li>Expected useful life</li>
              <li>Obsolescence factors</li>
            </ul>
          </InfoText>
        </InfoBox>
      )}

      {value === 'RC' && (
        <InfoBox>
          <InfoTitle>Replacement Cost Note</InfoTitle>
          <InfoText>
            RC policies often require the insured to actually replace the property to receive full 
            replacement cost. Otherwise, ACV may be paid initially with the difference paid upon 
            completion of repairs/replacement.
          </InfoText>
        </InfoBox>
      )}

      {value === 'agreedValue' && (
        <InfoBox>
          <InfoTitle>Agreed Value Note</InfoTitle>
          <InfoText>
            Agreed value eliminates disputes over property value at time of loss. The agreed value 
            is typically established through appraisal and documented in the policy. No coinsurance 
            penalty applies.
          </InfoText>
        </InfoBox>
      )}

      {value === 'functionalRC' && (
        <InfoBox>
          <InfoTitle>Functional Replacement Cost Note</InfoTitle>
          <InfoText>
            Used when exact replacement is impractical or unnecessary. For example, replacing plaster 
            walls with drywall, or outdated building materials with modern equivalents that serve the 
            same function.
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

