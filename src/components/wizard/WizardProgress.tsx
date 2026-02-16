/**
 * WizardProgress - Clean, minimal progress indicator
 *
 * Features:
 * - Simple step indicators
 * - Subtle transitions
 * - Clean visual hierarchy
 */

import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { CheckIcon, SparklesIcon } from '@heroicons/react/24/solid';

// Subtle animations
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const gentlePulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

// Clean container
const Container = styled.div`
  padding: 20px 32px 24px;
  background: ${({ theme }) => theme.colours.background};
  border-bottom: 1px solid ${({ theme }) => theme.colours.border};
  position: relative;

  @media (max-width: 768px) {
    padding: 16px 20px 20px;
  }
`;

const ProgressWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 0 8px;
`;

// Simple track behind the progress
const ProgressTrack = styled.div`
  position: absolute;
  top: 18px;
  left: 50px;
  right: 50px;
  height: 2px;
  background: ${({ theme }) => theme.colours.border};
  border-radius: 2px;
  z-index: 0;

  @media (max-width: 768px) {
    top: 16px;
    left: 35px;
    right: 35px;
  }
`;

// Hidden - no glow needed for clean design
const ProgressGlow = styled.div<{ $progress: number; $isAIActive?: boolean }>`
  display: none;
`;

// Clean progress line
const ProgressLine = styled.div<{ $progress: number; $isAIActive?: boolean }>`
  position: absolute;
  top: 18px;
  left: 50px;
  height: 2px;
  background: #6366f1;
  transform-origin: left;
  border-radius: 2px;
  z-index: 1;
  width: calc((100% - 100px) * ${({ $progress }) => $progress / 100});
  transition: width 0.4s ease-out;

  @media (max-width: 768px) {
    top: 16px;
    left: 35px;
    width: calc((100% - 70px) * ${({ $progress }) => $progress / 100});
  }
`;

// Clean step wrapper
const StepWrapper = styled.div<{ $isActive?: boolean }>`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  min-width: 80px;

  @media (max-width: 768px) {
    min-width: 70px;
    gap: 8px;
  }
`;

// Clean step indicator circle
const StepIndicator = styled.button<{
  $state: 'complete' | 'active' | 'upcoming';
  $isClickable: boolean;
}>`
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  cursor: ${({ $isClickable }) => $isClickable ? 'pointer' : 'default'};
  transition: all 0.2s ease;

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.4);
  }

  ${({ $state, theme }) => {
    switch ($state) {
      case 'complete':
        return css`
          background: #22c55e;
          color: white;
        `;
      case 'active':
        return css`
          background: #6366f1;
          color: white;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        `;
      default:
        return css`
          background: ${theme.colours.background};
          color: ${theme.colours.textMuted};
          border: 1.5px solid ${theme.colours.border};
        `;
    }
  }}

  &:hover {
    ${({ $isClickable }) => $isClickable && css`
      transform: scale(1.05);
    `}
  }

  svg {
    width: 16px;
    height: 16px;
  }

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
    font-size: 12px;

    svg {
      width: 14px;
      height: 14px;
    }
  }
`;

// Clean step label
const StepLabel = styled.span<{ $state: 'complete' | 'active' | 'upcoming' }>`
  font-size: 11px;
  font-weight: 500;
  text-align: center;
  max-width: 80px;
  line-height: 1.3;
  transition: all 0.2s ease;

  ${({ $state, theme }) => {
    switch ($state) {
      case 'complete':
        return css`color: #16a34a;`;
      case 'active':
        return css`
          color: #6366f1;
          font-weight: 600;
        `;
      default:
        return css`
          color: ${theme.colours.textMuted};
          opacity: 0.6;
        `;
    }
  }};

  @media (max-width: 768px) {
    font-size: 10px;
    max-width: 60px;
  }
`;

// Step description - hidden for cleaner look
const StepDescription = styled.span<{ $isVisible: boolean }>`
  display: none;
`;

const OptionalTag = styled.span`
  font-size: 8px;
  color: ${({ theme }) => theme.colours.textMuted};
  font-weight: 500;
  opacity: 0.5;
  margin-left: 2px;
`;

// AI Activity indicator - simplified
const AIIndicator = styled.div<{ $isActive: boolean }>`
  display: ${({ $isActive }) => $isActive ? 'flex' : 'none'};
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 16px;
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);

  svg {
    width: 12px;
    height: 12px;
    color: #6366f1;
    animation: ${gentlePulse} 1.5s ease-in-out infinite;
  }

  span {
    font-size: 10px;
    font-weight: 500;
    color: #6366f1;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;



export interface WizardStep {
  id: string;
  label: string;
  description?: string;
  isComplete?: boolean;
  isOptional?: boolean;
  fieldCount?: number;
  filledFieldCount?: number;
}

interface WizardProgressProps {
  steps: WizardStep[];
  currentStepIndex: number;
  onStepClick?: (index: number) => void;
  completenessScore?: number;
  className?: string;
  isAIActive?: boolean;
  aiActivityMessage?: string;
}

export const WizardProgress: React.FC<WizardProgressProps> = ({
  steps,
  currentStepIndex,
  onStepClick,
  className = '',
  isAIActive = false,
  aiActivityMessage = 'AI Working...',
}) => {
  // Calculate progress percentage for the line
  const progressPercent = steps.length > 1
    ? (currentStepIndex / (steps.length - 1)) * 100
    : 0;

  return (
    <Container className={className} role="navigation" aria-label="Wizard progress">
      <ProgressWrapper>
        {/* Background track */}
        <ProgressTrack />

        {/* Glow effect behind progress */}
        <ProgressGlow $progress={progressPercent} $isAIActive={isAIActive} />

        {/* Animated progress line */}
        <ProgressLine $progress={progressPercent} $isAIActive={isAIActive} />

        {/* AI Activity indicator */}
        <AIIndicator $isActive={isAIActive}>
          <SparklesIcon />
          <span>{aiActivityMessage}</span>
        </AIIndicator>

        {/* Step indicators */}
        {steps.map((step, index) => {
          const isComplete = index < currentStepIndex || !!step.isComplete;
          const isActive = index === currentStepIndex;
          const state = isComplete && !isActive ? 'complete' : isActive ? 'active' : 'upcoming';
          const isClickable = !!onStepClick && (isComplete || index === currentStepIndex + 1);

          return (
            <StepWrapper key={step.id} $isActive={isActive}>
              <StepIndicator
                $state={state}
                $isClickable={isClickable}
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                aria-label={`Step ${index + 1}: ${step.label}${isComplete ? ' (completed)' : isActive ? ' (current)' : ''}`}
                aria-current={isActive ? 'step' : undefined}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                {state === 'complete' ? (
                  <CheckIcon />
                ) : (
                  <span>{index + 1}</span>
                )}
              </StepIndicator>
              <StepLabel $state={state}>
                {step.label}
                {step.isOptional && <OptionalTag>optional</OptionalTag>}
              </StepLabel>
              <StepDescription $isVisible={isActive}>
                {step.description}
              </StepDescription>
            </StepWrapper>
          );
        })}
      </ProgressWrapper>
    </Container>
  );
};

export default WizardProgress;

