/**
 * DeductibleStructureSelector Component
 * 
 * Radio card selector for choosing the deductible structure type.
 * Features visual examples and descriptions for each structure.
 */

import React from 'react';
import styled from 'styled-components';
import {
  CurrencyDollarIcon,
  ReceiptPercentIcon,
  ArrowsUpDownIcon,
  ClockIcon,
  FireIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { DeductibleStructure } from '@app-types';
import { colors } from '../common/DesignSystem';

interface DeductibleStructureSelectorProps {
  value: DeductibleStructure;
  onChange: (structure: DeductibleStructure) => void;
  disabled?: boolean;
  columns?: number;
}

interface StructureOption {
  value: DeductibleStructure;
  label: string;
  description: string;
  example: string;
  icon: React.ReactNode;
  color: string;
}

const STRUCTURE_OPTIONS: StructureOption[] = [
  {
    value: 'flat',
    label: 'Flat Dollar',
    description: 'Fixed dollar amount deductible',
    example: '$1,000',
    icon: <CurrencyDollarIcon />,
    color: colors.primary
  },
  {
    value: 'percentage',
    label: 'Percentage',
    description: 'Percentage of insured value or loss',
    example: '2% of TIV',
    icon: <ReceiptPercentIcon />,
    color: colors.secondary
  },
  {
    value: 'percentMinMax',
    label: 'Percentage w/ Min/Max',
    description: 'Percentage with minimum and maximum bounds',
    example: '2% ($1K min / $25K max)',
    icon: <ArrowsUpDownIcon />,
    color: colors.info
  },
  {
    value: 'waitingPeriod',
    label: 'Waiting Period',
    description: 'Time-based deductible (hours/days)',
    example: '72 hours',
    icon: <ClockIcon />,
    color: colors.success
  },
  {
    value: 'perilSpecific',
    label: 'Peril-Specific',
    description: 'Different deductibles by peril type',
    example: 'AOP: $1K, Wind: 2%',
    icon: <FireIcon />,
    color: colors.warning
  },
  {
    value: 'aggregate',
    label: 'Aggregate',
    description: 'Annual aggregate deductible',
    example: '$50,000 annual',
    icon: <CalendarDaysIcon />,
    color: '#9333ea'
  }
];

export const DeductibleStructureSelector: React.FC<DeductibleStructureSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  columns
}) => {
  return (
    <Container>
      <Label>Deductible Structure *</Label>
      <CardsGrid $columns={columns}>
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

const CardsGrid = styled.div<{ $columns?: number }>`
  display: grid;
  grid-template-columns: ${({ $columns }) =>
    $columns ? `repeat(${$columns}, 1fr)` : 'repeat(auto-fill, minmax(200px, 1fr))'};
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
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
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
  font-size: 12px;
  font-weight: 500;
  color: ${({ $color }) => $color};
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  margin-top: 4px;
`;

const RadioIndicator = styled.div<{ $selected: boolean; $color: string }>`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid ${({ $selected, $color }) => $selected ? $color : colors.gray300};
  background: ${({ $selected, $color }) => $selected ? $color : 'white'};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
`;

const RadioDot = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: white;
`;

export default DeductibleStructureSelector;

