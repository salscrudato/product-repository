/**
 * ValuationMethodChips Component
 * Modern multi-select chips for property valuation methods
 * 
 * Features:
 * - Compact chip-based UI
 * - Multi-select with visual feedback
 * - Tooltips with descriptions
 * - Keyboard accessible
 */

import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { ValuationMethod } from '../../types';
import { CheckIcon } from '@heroicons/react/24/solid';

interface ValuationMethodChipsProps {
  values?: ValuationMethod[];
  onChange: (methods: ValuationMethod[]) => void;
  disabled?: boolean;
}

const VALUATION_OPTIONS: { 
  value: ValuationMethod; 
  label: string; 
  shortLabel: string; 
  description: string;
  color: string;
}[] = [
  {
    value: 'RC',
    label: 'Replacement Cost',
    shortLabel: 'RC',
    description: 'Cost to replace with new property of like kind and quality',
    color: '#3b82f6'
  },
  {
    value: 'ACV',
    label: 'Actual Cash Value',
    shortLabel: 'ACV',
    description: 'Replacement cost minus depreciation',
    color: '#8b5cf6'
  },
  {
    value: 'agreedValue',
    label: 'Agreed Value',
    shortLabel: 'Agreed',
    description: 'Pre-agreed value with no depreciation',
    color: '#10b981'
  },
  {
    value: 'marketValue',
    label: 'Market Value',
    shortLabel: 'Market',
    description: 'Current market price for similar property',
    color: '#f59e0b'
  },
  {
    value: 'functionalRC',
    label: 'Functional RC',
    shortLabel: 'Func. RC',
    description: 'Replace with property serving same function',
    color: '#06b6d4'
  },
  {
    value: 'statedAmount',
    label: 'Stated Amount',
    shortLabel: 'Stated',
    description: 'Maximum payable amount specified',
    color: '#ec4899'
  },
];

export const ValuationMethodChips: React.FC<ValuationMethodChipsProps> = ({
  values = [],
  onChange,
  disabled = false,
}) => {
  const handleToggle = (method: ValuationMethod) => {
    if (disabled) return;
    if (values.includes(method)) {
      onChange(values.filter(v => v !== method));
    } else {
      onChange([...values, method]);
    }
  };

  return (
    <Container>
      <ChipsGrid role="group" aria-label="Valuation methods">
        {VALUATION_OPTIONS.map((option) => {
          const isSelected = values.includes(option.value);
          return (
            <Chip
              key={option.value}
              $selected={isSelected}
              $color={option.color}
              $disabled={disabled}
              onClick={() => handleToggle(option.value)}
              role="checkbox"
              aria-checked={isSelected}
              aria-disabled={disabled}
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => e.key === 'Enter' && handleToggle(option.value)}
              title={option.description}
            >
              {isSelected && (
                <CheckBadge $color={option.color}>
                  <CheckIcon />
                </CheckBadge>
              )}
              <ChipLabel $selected={isSelected}>{option.shortLabel}</ChipLabel>
            </Chip>
          );
        })}
      </ChipsGrid>
      
      {values.length > 0 && (
        <SelectedSummary>
          <SelectedCount>{values.length} selected</SelectedCount>
          <SelectedList>
            {values.map(v => VALUATION_OPTIONS.find(o => o.value === v)?.label).join(', ')}
          </SelectedList>
        </SelectedSummary>
      )}
    </Container>
  );
};

// Animations
const checkPop = keyframes`
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ChipsGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Chip = styled.button<{ $selected: boolean; $color: string; $disabled: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: ${props => props.$selected ? `${props.$color}15` : 'rgba(0, 0, 0, 0.03)'};
  border: 2px solid ${props => props.$selected ? props.$color : 'transparent'};
  border-radius: 20px;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  opacity: ${props => props.$disabled ? 0.5 : 1};
  position: relative;

  &:hover:not(:disabled) {
    background: ${props => props.$selected ? `${props.$color}20` : 'rgba(0, 0, 0, 0.06)'};
    transform: ${props => !props.$disabled && 'translateY(-1px)'};
  }

  &:focus-visible {
    outline: 2px solid ${props => props.$color};
    outline-offset: 2px;
  }

  @media (prefers-color-scheme: dark) {
    background: ${props => props.$selected ? `${props.$color}25` : 'rgba(255, 255, 255, 0.05)'};
  }
`;

const CheckBadge = styled.span<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: ${props => props.$color};
  border-radius: 50%;
  animation: ${checkPop} 0.25s ease;

  svg {
    width: 10px;
    height: 10px;
    color: white;
  }
`;

const ChipLabel = styled.span<{ $selected: boolean }>`
  font-size: 0.875rem;
  font-weight: ${props => props.$selected ? 600 : 500};
  color: ${props => props.$selected ? '#111827' : '#6b7280'};
  transition: all 0.2s ease;

  @media (prefers-color-scheme: dark) {
    color: ${props => props.$selected ? '#f9fafb' : '#9ca3af'};
  }
`;

const SelectedSummary = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 8px;

  @media (prefers-color-scheme: dark) {
    background: rgba(99, 102, 241, 0.15);
  }
`;

const SelectedCount = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: #6366f1;
  white-space: nowrap;
`;

const SelectedList = styled.span`
  font-size: 0.8125rem;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

export default ValuationMethodChips;

