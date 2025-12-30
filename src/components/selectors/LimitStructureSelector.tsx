/**
 * LimitStructureSelector Component
 *
 * Radio card selector for choosing the limit structure type.
 * Features visual examples, descriptions, and Learn tooltips for each structure.
 * Updated for P&C insurance accuracy:
 * - Removed "Sublimits" as a structure (now a toggle under any structure)
 * - Added "Each Claim + Aggregate" for claims-made coverages
 * - Improved labels and microcopy for insurance industry recognition
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import {
  CurrencyDollarIcon,
  Square2StackIcon,
  Squares2X2Icon,
  ArrowsPointingInIcon,
  ListBulletIcon,
  InformationCircleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { LimitStructure } from '@app-types';
import { colors, gradients } from '../common/DesignSystem';

interface LimitStructureSelectorProps {
  value: LimitStructure;
  onChange: (structure: LimitStructure) => void;
  disabled?: boolean;
  columns?: number;
  rows?: number;
}

interface StructureOption {
  value: LimitStructure;
  label: string;
  description: string;
  example: string;
  icon: React.ReactNode;
  color: string;
  /** Learn tooltip content - bullet points + example */
  learnContent: {
    bullets: string[];
    exampleText: string;
  };
}

const STRUCTURE_OPTIONS: StructureOption[] = [
  {
    value: 'single',
    label: 'Single Limit',
    description: 'One limit applies to all covered loss.',
    example: '$1,000,000',
    icon: <CurrencyDollarIcon />,
    color: colors.primary,
    learnContent: {
      bullets: [
        'Maximum payout for any covered event',
        'Simplest structure - one number to configure',
        'Common for property, umbrella, and some liability'
      ],
      exampleText: 'Example: $500,000 limit for all losses under a BOP property coverage.'
    }
  },
  {
    value: 'occAgg',
    label: 'Occurrence + Aggregate',
    description: 'Per occurrence limit plus policy aggregate.',
    example: '$1M / $2M',
    icon: <Square2StackIcon />,
    color: colors.secondary,
    learnContent: {
      bullets: [
        'First number: max per occurrence/event',
        'Second number: total cap for the policy period',
        'Standard for GL and most commercial liability'
      ],
      exampleText: 'Example: $1M per occurrence / $2M aggregate for General Liability.'
    }
  },
  {
    value: 'claimAgg',
    label: 'Each Claim + Aggregate',
    description: 'Per-claim limit with a policy-term aggregate (common in claims-made coverages).',
    example: '$1M / $3M',
    icon: <DocumentTextIcon />,
    color: colors.info,
    learnContent: {
      bullets: [
        'Per-claim limit for each filed claim',
        'Aggregate cap for the policy period',
        'Used in claims-made policies: E&O, D&O, Cyber, EPL'
      ],
      exampleText: 'Example: $1M each claim / $3M aggregate for Professional Liability.'
    }
  },
  {
    value: 'split',
    label: 'Split Limits (e.g., BI/PD)',
    description: 'Separate limits by component (e.g., BI per person / BI per accident / PD).',
    example: '100/300/100',
    icon: <Squares2X2Icon />,
    color: colors.warning,
    learnContent: {
      bullets: [
        'Multiple components with separate limits',
        'Common notation: 100/300/100 (in thousands)',
        'Standard for auto liability'
      ],
      exampleText: 'Example: $100k BI per person / $300k BI per accident / $100k PD.'
    }
  },
  {
    value: 'csl',
    label: 'Combined Single Limit (CSL)',
    description: 'Single combined limit across BI/PD components.',
    example: '$500,000 CSL',
    icon: <ArrowsPointingInIcon />,
    color: colors.success,
    learnContent: {
      bullets: [
        'One limit covers all damages combined',
        'Simplifies auto/commercial liability',
        'More flexibility in claim allocation'
      ],
      exampleText: 'Example: $1M CSL covers any combination of BI and PD per accident.'
    }
  },
  {
    value: 'scheduled',
    label: 'Scheduled / Per-Item',
    description: 'Limits by scheduled item, optionally with a total cap.',
    example: 'Per item max',
    icon: <ListBulletIcon />,
    color: '#9333ea',
    learnContent: {
      bullets: [
        'Individual limits per scheduled item',
        'Optional blanket/total cap across all items',
        'Common for inland marine, fine arts, equipment'
      ],
      exampleText: 'Example: $50,000 per item, $500,000 total for scheduled equipment.'
    }
  }
];

export const LimitStructureSelector: React.FC<LimitStructureSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  columns,
  rows
}) => {
  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null);

  return (
    <Container>
      <CardsGrid role="radiogroup" aria-label="Limit Structure" $columns={columns}>
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
              <CardTitleRow>
                <CardTitle>{option.label}</CardTitle>
                <LearnIcon
                  onMouseEnter={() => setTooltipVisible(option.value)}
                  onMouseLeave={() => setTooltipVisible(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTooltipVisible(tooltipVisible === option.value ? null : option.value);
                  }}
                  aria-label={`Learn more about ${option.label}`}
                >
                  <InformationCircleIcon />
                  {tooltipVisible === option.value && (
                    <LearnTooltip onClick={(e) => e.stopPropagation()}>
                      <TooltipBullets>
                        {option.learnContent.bullets.map((bullet, i) => (
                          <li key={i}>{bullet}</li>
                        ))}
                      </TooltipBullets>
                      <TooltipExample>{option.learnContent.exampleText}</TooltipExample>
                    </LearnTooltip>
                  )}
                </LearnIcon>
              </CardTitleRow>
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
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const CardTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const CardTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${colors.gray800};
`;

const LearnIcon = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  color: ${colors.gray400};
  transition: color 0.2s ease;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    color: ${colors.primary};
  }
`;

const LearnTooltip = styled.div`
  position: absolute;
  top: 24px;
  left: 0;
  z-index: 100;
  width: 280px;
  padding: 16px;
  background: white;
  border: 1px solid ${colors.gray200};
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  text-align: left;
`;

const TooltipBullets = styled.ul`
  margin: 0 0 12px 0;
  padding-left: 18px;
  font-size: 12px;
  color: ${colors.gray600};
  line-height: 1.5;

  li {
    margin-bottom: 4px;
  }
`;

const TooltipExample = styled.div`
  font-size: 11px;
  color: ${colors.gray500};
  font-style: italic;
  padding-top: 8px;
  border-top: 1px solid ${colors.gray100};
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

