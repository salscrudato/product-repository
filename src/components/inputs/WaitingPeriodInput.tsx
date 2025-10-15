/**
 * WaitingPeriodInput Component
 * Input for waiting period with unit selection (days/months)
 */

import React from 'react';
import styled from 'styled-components';

interface WaitingPeriodInputProps {
  value?: number;
  unit?: 'days' | 'months';
  onChange: (value: number | undefined, unit: 'days' | 'months') => void;
}

export const WaitingPeriodInput: React.FC<WaitingPeriodInputProps> = ({
  value,
  unit = 'days',
  onChange,
}) => {
  return (
    <Container>
      <Label>Waiting Period</Label>
      <HelpText>
        Time period that must elapse before coverage begins or before certain benefits are available
      </HelpText>

      <InputRow>
        <NumberInput
          type="number"
          min="0"
          placeholder="Enter waiting period"
          value={value || ''}
          onChange={(e) => {
            const val = e.target.value ? parseInt(e.target.value) : undefined;
            onChange(val, unit);
          }}
        />
        <UnitSelect
          value={unit}
          onChange={(e) => onChange(value, e.target.value as 'days' | 'months')}
        >
          <option value="days">Days</option>
          <option value="months">Months</option>
        </UnitSelect>
      </InputRow>

      {value && (
        <DisplayValue>
          Waiting Period: {value} {unit}
        </DisplayValue>
      )}

      <InfoBox>
        <InfoTitle>Common Waiting Periods</InfoTitle>
        <InfoList>
          <InfoItem><strong>Health Insurance:</strong> 30-90 days for pre-existing conditions</InfoItem>
          <InfoItem><strong>Disability Insurance:</strong> 30-180 days elimination period</InfoItem>
          <InfoItem><strong>Flood Insurance:</strong> 30 days from purchase</InfoItem>
          <InfoItem><strong>Workers' Compensation:</strong> 3-7 days for disability benefits</InfoItem>
        </InfoList>
      </InfoBox>
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
  gap: 12px;
  align-items: center;
`;

const NumberInput = styled.input`
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

const UnitSelect = styled.select`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #111827;
  background: white;
  cursor: pointer;
  min-width: 100px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
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

const InfoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const InfoItem = styled.li`
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;

  strong {
    color: #374151;
    font-weight: 600;
  }
`;

