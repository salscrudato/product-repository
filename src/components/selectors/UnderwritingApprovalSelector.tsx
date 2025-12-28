/**
 * UnderwritingApprovalSelector Component
 * Semantic segmented control for underwriter approval type
 * 
 * Options:
 * - Required: Always requires underwriter approval
 * - Not Required: Auto-approved, no underwriter review needed
 * - Conditional: Requires approval based on eligibility criteria
 */

import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { UnderwriterApprovalType } from '../../types';
import { CheckIcon } from '@heroicons/react/24/solid';
import { 
  ShieldCheckIcon, 
  ShieldExclamationIcon, 
  AdjustmentsHorizontalIcon 
} from '@heroicons/react/24/outline';

interface UnderwritingApprovalSelectorProps {
  value?: UnderwriterApprovalType;
  onChange: (type: UnderwriterApprovalType) => void;
  disabled?: boolean;
}

const APPROVAL_OPTIONS: {
  value: UnderwriterApprovalType;
  label: string;
  shortDesc: string;
  icon: 'required' | 'not_required' | 'conditional';
  color: string;
}[] = [
  {
    value: 'not_required',
    label: 'Not Required',
    shortDesc: 'Auto-approved without underwriter review',
    icon: 'not_required',
    color: '#10b981' // Green
  },
  {
    value: 'conditional',
    label: 'Conditional',
    shortDesc: 'Approval based on eligibility criteria',
    icon: 'conditional',
    color: '#f59e0b' // Amber
  },
  {
    value: 'required',
    label: 'Required',
    shortDesc: 'Always requires underwriter approval',
    icon: 'required',
    color: '#ef4444' // Red
  },
];

export const UnderwritingApprovalSelector: React.FC<UnderwritingApprovalSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <Container role="radiogroup" aria-label="Underwriter approval type">
      <SegmentedControl>
        {APPROVAL_OPTIONS.map((option, index) => {
          const isSelected = value === option.value;
          return (
            <SegmentButton
              key={option.value}
              $selected={isSelected}
              $color={option.color}
              $index={index}
              $disabled={disabled}
              onClick={() => !disabled && onChange(option.value)}
              role="radio"
              aria-checked={isSelected}
              aria-disabled={disabled}
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => e.key === 'Enter' && !disabled && onChange(option.value)}
            >
              <IconWrapper $selected={isSelected} $color={option.color}>
                {option.icon === 'not_required' && <ShieldCheckIcon />}
                {option.icon === 'conditional' && <AdjustmentsHorizontalIcon />}
                {option.icon === 'required' && <ShieldExclamationIcon />}
              </IconWrapper>
              <SegmentLabel $selected={isSelected}>{option.label}</SegmentLabel>
              {isSelected && (
                <CheckBadge $color={option.color}>
                  <CheckIcon />
                </CheckBadge>
              )}
            </SegmentButton>
          );
        })}
        <SelectionIndicator $selectedIndex={APPROVAL_OPTIONS.findIndex(o => o.value === value)} />
      </SegmentedControl>
      
      {/* Description below */}
      {value && (
        <DescriptionText $color={APPROVAL_OPTIONS.find(o => o.value === value)?.color || '#6b7280'}>
          {APPROVAL_OPTIONS.find(o => o.value === value)?.shortDesc}
        </DescriptionText>
      )}
    </Container>
  );
};

// Animations
const slideIn = keyframes`
  0% { opacity: 0; transform: translateY(-4px); }
  100% { opacity: 1; transform: translateY(0); }
`;

const checkPop = keyframes`
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
`;

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const SegmentedControl = styled.div`
  display: flex;
  position: relative;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
  
  @media (prefers-color-scheme: dark) {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const SelectionIndicator = styled.div<{ $selectedIndex: number }>`
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: ${props => props.$selectedIndex >= 0 ? `calc(${props.$selectedIndex * 33.33}% + 4px)` : '4px'};
  width: calc(33.33% - 4px);
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: left 0.2s ease, opacity 0.2s ease;
  opacity: ${props => props.$selectedIndex >= 0 ? 1 : 0};
  pointer-events: none;

  @media (prefers-color-scheme: dark) {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const SegmentButton = styled.button<{
  $selected: boolean;
  $color: string;
  $index: number;
  $disabled: boolean;
}>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 0.5rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  position: relative;
  z-index: 1;
  transition: all 0.2s ease;
  opacity: ${props => props.$disabled ? 0.5 : 1};

  &:hover:not(:disabled) {
    ${props => !props.$selected && !props.$disabled && css`
      background: rgba(0, 0, 0, 0.02);
    `}
  }

  &:focus-visible {
    outline: 2px solid ${props => props.$color};
    outline-offset: 2px;
  }
`;

const IconWrapper = styled.div<{ $selected: boolean; $color: string }>`
  width: 24px;
  height: 24px;
  color: ${props => props.$selected ? props.$color : '#6b7280'};
  transition: color 0.2s ease, transform 0.2s ease;

  svg {
    width: 100%;
    height: 100%;
  }

  ${props => props.$selected && css`
    transform: scale(1.1);
  `}
`;

const SegmentLabel = styled.span<{ $selected: boolean }>`
  font-size: 0.8125rem;
  font-weight: ${props => props.$selected ? 600 : 500};
  color: ${props => props.$selected ? '#111827' : '#6b7280'};
  transition: all 0.2s ease;

  @media (prefers-color-scheme: dark) {
    color: ${props => props.$selected ? '#f9fafb' : '#9ca3af'};
  }
`;

const CheckBadge = styled.div<{ $color: string }>`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  background: ${props => props.$color};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${checkPop} 0.3s ease;

  svg {
    width: 10px;
    height: 10px;
    color: white;
  }
`;

const DescriptionText = styled.p<{ $color: string }>`
  font-size: 0.8125rem;
  color: ${props => props.$color};
  text-align: center;
  margin: 0;
  animation: ${slideIn} 0.2s ease;

  @media (prefers-color-scheme: dark) {
    opacity: 0.9;
  }
`;

export default UnderwritingApprovalSelector;

