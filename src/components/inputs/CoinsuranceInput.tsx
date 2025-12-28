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
          {percentage}% {hasPenalty ? '(with penalty)' : '(no penalty)'}
        </DisplayValue>
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
