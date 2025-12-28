/**
 * CoverageTriggerSelector Component
 * Selector for coverage trigger types (Occurrence, Claims-Made, Hybrid)
 */

import React from 'react';
import styled from 'styled-components';
import { CoverageTrigger } from '../../types';

interface CoverageTriggerSelectorProps {
  value?: CoverageTrigger;
  onChange: (trigger: CoverageTrigger) => void;
}

const TRIGGER_OPTIONS: { value: CoverageTrigger; label: string; description: string }[] = [
  {
    value: 'occurrence',
    label: 'Occurrence',
    description: 'Coverage applies to incidents that occur during the policy period, regardless of when the claim is made'
  },
  {
    value: 'claimsMade',
    label: 'Claims-Made',
    description: 'Coverage applies only to claims made during the policy period, regardless of when the incident occurred'
  },
  {
    value: 'hybrid',
    label: 'Hybrid',
    description: 'Combination of claims-made and occurrence triggers with specific conditions'
  },
  {
    value: 'manifestation',
    label: 'Manifestation',
    description: 'Coverage triggered when the injury or damage first becomes apparent or manifests'
  },
  {
    value: 'exposure',
    label: 'Exposure',
    description: 'Coverage triggered when exposure to the cause of loss first occurs'
  },
  {
    value: 'continuous',
    label: 'Continuous Trigger',
    description: 'Coverage applies across all policies in effect during the continuous period of exposure or injury'
  },
  {
    value: 'injuryInFact',
    label: 'Injury-in-Fact',
    description: 'Coverage triggered when the actual injury or damage occurs, regardless of when discovered'
  },
];

export const CoverageTriggerSelector: React.FC<CoverageTriggerSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <Container>
      <OptionsContainer>
        {TRIGGER_OPTIONS.map((option) => (
          <RadioOption
            key={option.value}
            $selected={value === option.value}
            onClick={() => onChange(option.value)}
          >
            <RadioCircle $selected={value === option.value}>
              {value === option.value && <RadioDot />}
            </RadioCircle>
            <RadioLabel>
              <RadioTitle>{option.label}</RadioTitle>
              <RadioDescription>{option.description}</RadioDescription>
            </RadioLabel>
          </RadioOption>
        ))}
      </OptionsContainer>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const OptionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const RadioOption = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 2px solid ${({ $selected }) => $selected ? '#3b82f6' : '#e5e7eb'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${({ $selected }) => $selected ? '#eff6ff' : 'transparent'};

  &:hover {
    border-color: #3b82f6;
    background: ${({ $selected }) => $selected ? '#eff6ff' : '#f9fafb'};
  }
`;

const RadioCircle = styled.div<{ $selected: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid ${({ $selected }) => $selected ? '#3b82f6' : '#d1d5db'};
  background: ${({ $selected }) => $selected ? '#3b82f6' : 'white'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  transition: all 0.2s ease;
`;

const RadioDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
`;

const RadioLabel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
`;

const RadioTitle = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #111827;
`;

const RadioDescription = styled.div`
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
`;
