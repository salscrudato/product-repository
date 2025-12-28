/**
 * CoinsuranceChips Component
 * Multi-select chips for common coinsurance percentage values
 * 
 * Features:
 * - Compact chip-based UI for common values (50-100%)
 * - Multi-select with visual feedback
 * - Custom value input option
 * - Keyboard accessible
 */

import React, { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { CheckIcon, PlusIcon } from '@heroicons/react/24/solid';

interface CoinsuranceChipsProps {
  values?: number[];
  onChange: (values: number[]) => void;
  disabled?: boolean;
}

// Common coinsurance percentages in P&C insurance
const COMMON_VALUES = [50, 60, 70, 80, 90, 100];

export const CoinsuranceChips: React.FC<CoinsuranceChipsProps> = ({
  values = [],
  onChange,
  disabled = false,
}) => {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const handleToggle = (value: number) => {
    if (disabled) return;
    if (values.includes(value)) {
      onChange(values.filter(v => v !== value));
    } else {
      onChange([...values, value].sort((a, b) => a - b));
    }
  };

  const handleAddCustom = () => {
    const num = parseInt(customValue, 10);
    if (!isNaN(num) && num >= 0 && num <= 100 && !values.includes(num)) {
      onChange([...values, num].sort((a, b) => a - b));
      setCustomValue('');
      setShowCustomInput(false);
    }
  };

  // Get color based on coinsurance value (higher = greener)
  const getColor = (value: number): string => {
    if (value >= 90) return '#10b981'; // Green
    if (value >= 80) return '#3b82f6'; // Blue
    if (value >= 70) return '#8b5cf6'; // Purple
    if (value >= 60) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  return (
    <Container>
      <ChipsGrid role="group" aria-label="Coinsurance percentages">
        {COMMON_VALUES.map((value) => {
          const isSelected = values.includes(value);
          const color = getColor(value);
          return (
            <Chip
              key={value}
              $selected={isSelected}
              $color={color}
              $disabled={disabled}
              onClick={() => handleToggle(value)}
              role="checkbox"
              aria-checked={isSelected}
              aria-disabled={disabled}
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => e.key === 'Enter' && handleToggle(value)}
            >
              {isSelected && (
                <CheckBadge $color={color}>
                  <CheckIcon />
                </CheckBadge>
              )}
              <ChipLabel $selected={isSelected}>{value}%</ChipLabel>
            </Chip>
          );
        })}
        
        {/* Custom value button */}
        {!showCustomInput && (
          <AddChip
            $disabled={disabled}
            onClick={() => !disabled && setShowCustomInput(true)}
            aria-label="Add custom coinsurance value"
          >
            <PlusIcon />
            <span>Custom</span>
          </AddChip>
        )}
      </ChipsGrid>

      {/* Custom value input */}
      {showCustomInput && (
        <CustomInputRow>
          <CustomInput
            type="number"
            min="0"
            max="100"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="Enter %"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCustom();
              if (e.key === 'Escape') setShowCustomInput(false);
            }}
          />
          <CustomButton onClick={handleAddCustom} disabled={!customValue}>
            Add
          </CustomButton>
          <CustomButton onClick={() => setShowCustomInput(false)} $secondary>
            Cancel
          </CustomButton>
        </CustomInputRow>
      )}

      {/* Selected summary */}
      {values.length > 0 && (
        <SelectedSummary>
          <SelectedLabel>Selected:</SelectedLabel>
          <SelectedValues>
            {values.map(v => `${v}%`).join(', ')}
          </SelectedValues>
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
  padding: 10px 16px;
  background: ${props => props.$selected ? `${props.$color}15` : 'rgba(0, 0, 0, 0.03)'};
  border: 2px solid ${props => props.$selected ? props.$color : 'transparent'};
  border-radius: 24px;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  opacity: ${props => props.$disabled ? 0.5 : 1};
  position: relative;
  min-width: 70px;
  justify-content: center;

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
  font-size: 0.9375rem;
  font-weight: ${props => props.$selected ? 600 : 500};
  color: ${props => props.$selected ? '#111827' : '#6b7280'};
  transition: all 0.2s ease;

  @media (prefers-color-scheme: dark) {
    color: ${props => props.$selected ? '#f9fafb' : '#9ca3af'};
  }
`;

const AddChip = styled.button<{ $disabled: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.03);
  border: 2px dashed #d1d5db;
  border-radius: 24px;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  opacity: ${props => props.$disabled ? 0.5 : 1};
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover:not(:disabled) {
    border-color: #9ca3af;
    background: rgba(0, 0, 0, 0.05);
  }

  @media (prefers-color-scheme: dark) {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.2);
    color: #9ca3af;
  }
`;

const CustomInputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CustomInput = styled.input`
  width: 100px;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  @media (prefers-color-scheme: dark) {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.2);
    color: #f9fafb;
  }
`;

const CustomButton = styled.button<{ $secondary?: boolean }>`
  padding: 8px 16px;
  background: ${props => props.$secondary ? 'transparent' : '#6366f1'};
  color: ${props => props.$secondary ? '#6b7280' : 'white'};
  border: ${props => props.$secondary ? '1px solid #d1d5db' : 'none'};
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.$secondary ? 'rgba(0, 0, 0, 0.03)' : '#4f46e5'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SelectedSummary = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 8px;
`;

const SelectedLabel = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: #6366f1;
`;

const SelectedValues = styled.span`
  font-size: 0.8125rem;
  color: #6b7280;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

export default CoinsuranceChips;

