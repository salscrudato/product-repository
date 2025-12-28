/**
 * CoverageTriggerSelector Component
 * Clean, horizontal selector for P&C coverage trigger types
 */

import React from 'react';
import styled from 'styled-components';
import { CoverageTrigger } from '../../types';
import { CheckIcon } from '@heroicons/react/24/solid';
import { ClockIcon, DocumentCheckIcon } from '@heroicons/react/24/outline';

interface CoverageTriggerSelectorProps {
  value?: CoverageTrigger;
  onChange: (trigger: CoverageTrigger) => void;
}

// Common P&C trigger types only
const TRIGGER_OPTIONS: {
  value: CoverageTrigger;
  label: string;
  shortDesc: string;
  icon: 'occurrence' | 'claimsMade';
  color: string;
}[] = [
  {
    value: 'occurrence',
    label: 'Occurrence',
    shortDesc: 'Coverage applies when the incident happens during the policy period',
    icon: 'occurrence',
    color: '#3b82f6'
  },
  {
    value: 'claimsMade',
    label: 'Claims-Made',
    shortDesc: 'Coverage applies when the claim is reported during the policy period',
    icon: 'claimsMade',
    color: '#8b5cf6'
  },
];

export const CoverageTriggerSelector: React.FC<CoverageTriggerSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <Container>
      {TRIGGER_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        return (
          <TriggerCard
            key={option.value}
            $selected={isSelected}
            $color={option.color}
            onClick={() => onChange(option.value)}
            role="radio"
            aria-checked={isSelected}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onChange(option.value)}
          >
            {/* Icon */}
            <IconContainer $selected={isSelected} $color={option.color}>
              {option.icon === 'occurrence' && <ClockIcon />}
              {option.icon === 'claimsMade' && <DocumentCheckIcon />}
            </IconContainer>

            {/* Content */}
            <CardContent>
              <TriggerLabel>{option.label}</TriggerLabel>
              <TriggerDescription>{option.shortDesc}</TriggerDescription>
            </CardContent>

            {/* Radio indicator */}
            <RadioIndicator $selected={isSelected} $color={option.color}>
              {isSelected && <CheckIcon />}
            </RadioIndicator>
          </TriggerCard>
        );
      })}
    </Container>
  );
};

// Clean Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TriggerCard = styled.div<{ $selected: boolean; $color: string }>`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  background: ${({ $selected, theme }) =>
    $selected ? theme.colours.surface : theme.colours.background};

  border: 1.5px solid ${({ $selected, $color, theme }) =>
    $selected ? $color : theme.colours.border};

  &:hover {
    border-color: ${({ $color }) => $color};
    background: ${({ theme }) => theme.colours.surface};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${({ $color }) => $color}30;
  }
`;

const IconContainer = styled.div<{ $selected: boolean; $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  flex-shrink: 0;
  transition: all 0.2s ease;

  background: ${({ $selected, $color }) =>
    $selected ? $color : `${$color}12`};

  svg {
    width: 22px;
    height: 22px;
    color: ${({ $selected, $color }) => $selected ? 'white' : $color};
  }
`;

const CardContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const TriggerLabel = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
  margin-bottom: 2px;
`;

const TriggerDescription = styled.div`
  font-size: 13px;
  line-height: 1.4;
  color: ${({ theme }) => theme.colours.textMuted};
`;

const RadioIndicator = styled.div<{ $selected: boolean; $color: string }>`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  background: ${({ $selected, $color }) => $selected ? $color : 'transparent'};
  border: 2px solid ${({ $selected, $color, theme }) =>
    $selected ? $color : theme.colours.border};

  svg {
    width: 14px;
    height: 14px;
    color: white;
  }
`;
