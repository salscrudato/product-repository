/**
 * LimitStructureSelector Component
 * 
 * Radio card selector for choosing the limit structure type.
 * Features visual examples and descriptions for each structure.
 */

import React from 'react';
import styled from 'styled-components';
import {
  CurrencyDollarIcon,
  Square2StackIcon,
  Squares2X2Icon,
  ArrowsPointingInIcon,
  ChartPieIcon,
  ListBulletIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { LimitStructure } from '@types';
import { colors, gradients } from '../common/DesignSystem';

interface LimitStructureSelectorProps {
  value: LimitStructure;
  onChange: (structure: LimitStructure) => void;
  disabled?: boolean;
}

interface StructureOption {
  value: LimitStructure;
  label: string;
  description: string;
  example: string;
  icon: React.ReactNode;
  color: string;
}

const STRUCTURE_OPTIONS: StructureOption[] = [
  {
    value: 'single',
    label: 'Single Limit',
    description: 'One amount applies to all covered losses',
    example: '$1,000,000',
    icon: <CurrencyDollarIcon />,
    color: colors.primary
  },
  {
    value: 'occAgg',
    label: 'Occurrence + Aggregate',
    description: 'Per-occurrence and annual aggregate limits as a pair',
    example: '$1M / $2M',
    icon: <Square2StackIcon />,
    color: colors.secondary
  },
  {
    value: 'split',
    label: 'Split Limits',
    description: 'Separate limits for different loss types (e.g., BI/PD)',
    example: '100/300/100',
    icon: <Squares2X2Icon />,
    color: colors.info
  },
  {
    value: 'csl',
    label: 'Combined Single Limit',
    description: 'Single limit covering all damages combined',
    example: '$500,000 CSL',
    icon: <ArrowsPointingInIcon />,
    color: colors.success
  },
  {
    value: 'sublimit',
    label: 'Sublimits',
    description: 'Limits within a larger limit for specific perils',
    example: '$50,000 – Theft',
    icon: <ChartPieIcon />,
    color: colors.warning
  },
  {
    value: 'scheduled',
    label: 'Scheduled / Per-Item',
    description: 'Limits per scheduled item with optional cap',
    example: 'Per item max',
    icon: <ListBulletIcon />,
    color: '#9333ea'
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Advanced configuration for complex structures',
    example: 'Custom',
    icon: <CogIcon />,
    color: colors.gray500
  }
];

export const LimitStructureSelector: React.FC<LimitStructureSelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  return (
    <Container>
      <Label>Limit Structure *</Label>
      <CardsGrid>
        {STRUCTURE_OPTIONS.map((option) => (
          <StructureCard
            key={option.value}
            $selected={value === option.value}
            $color={option.color}
            $disabled={disabled}
            onClick={() => !disabled && onChange(option.value)}
            role="radio"
            aria-checked={value === option.value}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                !disabled && onChange(option.value);
              }
            }}
          >
            <CardIcon $color={option.color} $selected={value === option.value}>
              {option.icon}
            </CardIcon>
            <CardContent>
              <CardTitle>{option.label}</CardTitle>
              <CardDescription>{option.description}</CardDescription>
              <CardExample $color={option.color}>{option.example}</CardExample>
            </CardContent>
            <RadioIndicator $selected={value === option.value} $color={option.color}>
              {value === option.value && <RadioDot />}
            </RadioIndicator>
          </StructureCard>
        ))}
      </CardsGrid>
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
  color: ${colors.gray700};
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StructureCard = styled.div<{ $selected: boolean; $color: string; $disabled: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: ${({ $selected, $color }) => $selected ? `${$color}08` : 'white'};
  border: 2px solid ${({ $selected, $color }) => $selected ? $color : colors.gray200};
  border-radius: 12px;
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ $disabled }) => $disabled ? 0.6 : 1};
  transition: all 0.2s ease;

  &:hover:not([disabled]) {
    border-color: ${({ $color }) => $color};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  &:focus-visible {
    outline: 2px solid ${({ $color }) => $color};
    outline-offset: 2px;
  }
`;

const CardIcon = styled.div<{ $color: string; $selected: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ $color, $selected }) => $selected ? `${$color}20` : `${$color}10`};
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 22px;
    height: 22px;
    color: ${({ $color }) => $color};
  }
`;

const CardContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const CardTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${colors.gray800};
`;

const CardDescription = styled.div`
  font-size: 12px;
  color: ${colors.gray500};
  line-height: 1.4;
`;

const CardExample = styled.div<{ $color: string }>`
  font-size: 13px;
  font-weight: 600;
  color: ${({ $color }) => $color};
  font-family: 'SF Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  margin-top: 4px;
`;

const RadioIndicator = styled.div<{ $selected: boolean; $color: string }>`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid ${({ $selected, $color }) => $selected ? $color : colors.gray300};
  background: ${({ $selected, $color }) => $selected ? $color : 'white'};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
`;

const RadioDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
`;

export default LimitStructureSelector;

