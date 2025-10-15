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
    label: 'Hybrid (Claims-Made with Occurrence Features)',
    description: 'Combination of claims-made and occurrence triggers with specific conditions'
  },
];

export const CoverageTriggerSelector: React.FC<CoverageTriggerSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <Container>
      <Label>Coverage Trigger</Label>
      <HelpText>
        Determines when coverage applies - based on when the incident occurred or when the claim is made
      </HelpText>

      <OptionsContainer>
        {TRIGGER_OPTIONS.map((option) => (
          <RadioOption key={option.value}>
            <RadioInput
              type="radio"
              name="coverageTrigger"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <RadioLabel>
              <RadioTitle>{option.label}</RadioTitle>
              <RadioDescription>{option.description}</RadioDescription>
            </RadioLabel>
          </RadioOption>
        ))}
      </OptionsContainer>

      {value === 'claimsMade' && (
        <InfoBox>
          <InfoTitle>Claims-Made Coverage Note</InfoTitle>
          <InfoText>
            Claims-made policies typically require an Extended Reporting Period (ERP) or "tail coverage" 
            to cover claims made after the policy expires for incidents that occurred during the policy period.
          </InfoText>
        </InfoBox>
      )}

      {value === 'hybrid' && (
        <InfoBox>
          <InfoTitle>Hybrid Trigger Note</InfoTitle>
          <InfoText>
            Hybrid triggers combine elements of both occurrence and claims-made coverage. Common in 
            professional liability and environmental coverage. Specific terms should be documented in 
            policy conditions.
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

const OptionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const RadioOption = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
    background: #f9fafb;
  }

  &:has(input:checked) {
    border-color: #3b82f6;
    background: #eff6ff;
  }
`;

const RadioInput = styled.input`
  width: 20px;
  height: 20px;
  margin-top: 2px;
  cursor: pointer;
  flex-shrink: 0;
`;

const RadioLabel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  cursor: pointer;
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

const InfoBox = styled.div`
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 12px;
  margin-top: 8px;
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

