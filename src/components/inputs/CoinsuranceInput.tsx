/**
 * CoinsuranceInput Component
 * Input for coinsurance percentage with penalty option
 */

import React from 'react';
import styled from 'styled-components';

interface CoinsuranceInputProps {
  percentage?: number;
  hasPenalty?: boolean;
  onChange: (percentage: number | undefined, hasPenalty: boolean) => void;
}

const COMMON_PERCENTAGES = [80, 90, 100];

export const CoinsuranceInput: React.FC<CoinsuranceInputProps> = ({
  percentage,
  hasPenalty = true,
  onChange,
}) => {
  return (
    <Container>
      <Label>Coinsurance Requirement</Label>
      <HelpText>
        Minimum percentage of property value that must be insured to avoid penalty at time of loss
      </HelpText>

      <InputRow>
        <PercentageInput
          type="number"
          min="0"
          max="100"
          step="5"
          placeholder="Enter percentage"
          value={percentage || ''}
          onChange={(e) => {
            const val = e.target.value ? parseInt(e.target.value) : undefined;
            onChange(val, hasPenalty);
          }}
        />
        <PercentSymbol>%</PercentSymbol>
      </InputRow>

      <QuickButtons>
        {COMMON_PERCENTAGES.map((pct) => (
          <QuickButton
            key={pct}
            active={percentage === pct}
            onClick={() => onChange(pct, hasPenalty)}
          >
            {pct}%
          </QuickButton>
        ))}
      </QuickButtons>

      <CheckboxRow>
        <Checkbox
          type="checkbox"
          checked={hasPenalty}
          onChange={(e) => onChange(percentage, e.target.checked)}
        />
        <CheckboxLabel>Apply coinsurance penalty for under-insurance</CheckboxLabel>
      </CheckboxRow>

      {percentage && (
        <DisplayValue>
          Coinsurance: {percentage}% {hasPenalty ? '(with penalty)' : '(no penalty)'}
        </DisplayValue>
      )}

      <InfoBox>
        <InfoTitle>How Coinsurance Works</InfoTitle>
        <InfoText>
          <strong>Coinsurance Clause:</strong> Requires the insured to maintain insurance equal to a 
          specified percentage of the property's value.
          <br /><br />
          <strong>Example (80% Coinsurance):</strong>
          <ul>
            <li>Property Value: $1,000,000</li>
            <li>Required Insurance: $800,000 (80%)</li>
            <li>Actual Insurance: $600,000</li>
            <li>Loss Amount: $400,000</li>
          </ul>
          <br />
          <strong>Penalty Calculation:</strong>
          <br />
          Payment = Loss × (Actual Insurance ÷ Required Insurance)
          <br />
          Payment = $400,000 × ($600,000 ÷ $800,000) = $300,000
          <br /><br />
          The insured receives only $300,000 instead of $400,000 due to under-insurance.
        </InfoText>
      </InfoBox>

      {!hasPenalty && (
        <WarningBox>
          <WarningTitle>⚠️ No Penalty Warning</WarningTitle>
          <WarningText>
            Disabling the coinsurance penalty means the insured can maintain less than the required 
            percentage without penalty. This increases risk exposure and should only be used for 
            specific coverage types or endorsements.
          </WarningText>
        </WarningBox>
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

const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PercentageInput = styled.input`
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #111827;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const PercentSymbol = styled.span`
  font-size: 18px;
  font-weight: 600;
  color: #6b7280;
`;

const QuickButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const QuickButton = styled.button<{ active?: boolean }>`
  padding: 8px 16px;
  background: ${props => props.active ? '#3b82f6' : '#f3f4f6'};
  color: ${props => props.active ? 'white' : '#374151'};
  border: 1px solid ${props => props.active ? '#3b82f6' : '#d1d5db'};
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active ? '#2563eb' : '#e5e7eb'};
  }
`;

const CheckboxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  font-size: 14px;
  color: #374151;
  cursor: pointer;
`;

const DisplayValue = styled.div`
  padding: 8px 12px;
  background: #f3f4f6;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  font-weight: 500;
`;

const InfoBox = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  margin-top: 8px;
`;

const InfoTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
`;

const InfoText = styled.div`
  font-size: 13px;
  color: #6b7280;
  line-height: 1.6;

  strong {
    color: #374151;
    font-weight: 600;
  }

  ul {
    margin: 8px 0;
    padding-left: 20px;
  }

  li {
    margin: 4px 0;
  }
`;

const WarningBox = styled.div`
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 6px;
  padding: 12px;
  margin-top: 8px;
`;

const WarningTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 4px;
`;

const WarningText = styled.div`
  font-size: 13px;
  color: #78350f;
  line-height: 1.5;
`;

