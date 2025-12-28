/**
 * CoverageTriggerSelector Component
 * Premium selector for P&C coverage trigger types
 */

import React from 'react';
import styled, { keyframes, css } from 'styled-components';
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
      <CardsRow>
        {TRIGGER_OPTIONS.map((option, index) => {
          const isSelected = value === option.value;
          return (
            <TriggerCard
              key={option.value}
              $selected={isSelected}
              $color={option.color}
              $index={index}
              onClick={() => onChange(option.value)}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onChange(option.value)}
            >
              {/* Selection indicator */}
              <SelectionRing $selected={isSelected} $color={option.color} />

              {/* Icon */}
              <IconContainer $selected={isSelected} $color={option.color}>
                {option.icon === 'occurrence' && <ClockIcon />}
                {option.icon === 'claimsMade' && <DocumentCheckIcon />}
              </IconContainer>

              {/* Label */}
              <TriggerLabel $selected={isSelected}>{option.label}</TriggerLabel>

              {/* Description */}
              <TriggerDescription $selected={isSelected}>
                {option.shortDesc}
              </TriggerDescription>

              {/* Selected checkmark */}
              {isSelected && (
                <CheckBadge $color={option.color}>
                  <CheckIcon />
                </CheckBadge>
              )}
            </TriggerCard>
          );
        })}
      </CardsRow>
    </Container>
  );
};

// Animations
const scaleIn = keyframes`
  0% { transform: scale(0.95); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
`;

const checkPop = keyframes`
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Styled Components
const Container = styled.div`
  width: 100%;
`;

const CardsRow = styled.div`
  display: flex;
  gap: 20px;

  @media (max-width: 900px) {
    flex-direction: column;
  }
`;

const TriggerCard = styled.div<{ $selected: boolean; $color: string; $index: number }>`
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 28px 24px 24px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  animation: ${scaleIn} 0.4s ease-out backwards;
  animation-delay: ${({ $index }) => $index * 0.08}s;

  background: ${({ $selected, $color, theme }) =>
    $selected
      ? `linear-gradient(145deg, ${$color}08 0%, ${$color}15 100%)`
      : theme.colours.surface};

  border: 2px solid ${({ $selected, $color, theme }) =>
    $selected ? $color : theme.colours.border};

  box-shadow: ${({ $selected, $color }) =>
    $selected
      ? `0 8px 32px ${$color}25, 0 4px 12px ${$color}15, inset 0 1px 0 rgba(255,255,255,0.1)`
      : '0 2px 8px rgba(0, 0, 0, 0.04)'};

  &:hover {
    transform: translateY(-6px) scale(1.02);
    border-color: ${({ $color }) => $color};
    box-shadow: ${({ $selected, $color }) =>
      $selected
        ? `0 16px 48px ${$color}30, 0 8px 24px ${$color}20`
        : `0 12px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px ${$color}30`};
  }

  &:active {
    transform: translateY(-3px) scale(1.01);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${({ $color }) => $color}40;
  }
`;

const SelectionRing = styled.div<{ $selected: boolean; $color: string }>`
  position: absolute;
  inset: -3px;
  border-radius: 22px;
  pointer-events: none;
  opacity: ${({ $selected }) => $selected ? 1 : 0};
  transition: opacity 0.3s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 2px;
    background: linear-gradient(135deg, ${({ $color }) => $color}, ${({ $color }) => $color}80);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }
`;

const IconContainer = styled.div<{ $selected: boolean; $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 16px;
  margin-bottom: 16px;
  transition: all 0.3s ease;

  background: ${({ $selected, $color }) =>
    $selected
      ? `linear-gradient(135deg, ${$color} 0%, ${$color}cc 100%)`
      : `linear-gradient(135deg, ${$color}15 0%, ${$color}08 100%)`};

  box-shadow: ${({ $selected, $color }) =>
    $selected
      ? `0 8px 24px ${$color}40, inset 0 1px 0 rgba(255,255,255,0.2)`
      : 'none'};

  svg {
    width: 28px;
    height: 28px;
    color: ${({ $selected, $color }) => $selected ? 'white' : $color};
    transition: all 0.3s ease;
  }
`;

const TriggerLabel = styled.div<{ $selected: boolean }>`
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colours.text};
  transition: color 0.3s ease;
`;

const TriggerDescription = styled.div<{ $selected: boolean }>`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colours.textMuted};
  margin-bottom: 16px;
  min-height: 40px;
  display: flex;
  align-items: center;
`;

const CheckBadge = styled.div<{ $color: string }>`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => $color};
  animation: ${checkPop} 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 4px 12px ${({ $color }) => $color}50;

  svg {
    width: 16px;
    height: 16px;
    color: white;
  }
`;
