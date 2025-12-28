/**
 * WizardProgress - Modern, minimal progress indicator
 *
 * Features:
 * - Clean, minimal step indicators
 * - Smooth animated progress line
 * - Elegant transitions
 * - Mobile-responsive
 */

import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { CheckIcon } from '@heroicons/react/24/solid';

// Animations
const popIn = keyframes`
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); opacity: 1; }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const gentlePulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.3);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(99, 102, 241, 0);
    transform: scale(1.02);
  }
`;

// Styled Components
const Container = styled.div`
  padding: 20px 40px 24px;
  background: linear-gradient(180deg,
    ${({ theme }) => theme.colours.surface} 0%,
    ${({ theme }) => theme.colours.backgroundAlt}15 100%
  );
`;

const ProgressWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 0 8px;
`;

// The track behind the progress
const ProgressTrack = styled.div`
  position: absolute;
  top: 20px;
  left: 48px;
  right: 48px;
  height: 3px;
  background: ${({ theme }) => theme.colours.border}50;
  border-radius: 2px;
  z-index: 0;
`;

// The filled progress line with gradient and glow
const ProgressLine = styled.div<{ $progress: number }>`
  position: absolute;
  top: 20px;
  left: 48px;
  height: 3px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7);
  background-size: 200% 100%;
  animation: ${shimmer} 3s linear infinite;
  transform-origin: left;
  border-radius: 2px;
  z-index: 1;
  width: calc((100% - 96px) * ${({ $progress }) => $progress / 100});
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
`;

// Individual step wrapper
const StepWrapper = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  min-width: 80px;
`;

// Step indicator circle - more refined
const StepIndicator = styled.button<{
  $state: 'complete' | 'active' | 'upcoming';
  $isClickable: boolean;
}>`
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  cursor: ${({ $isClickable }) => $isClickable ? 'pointer' : 'default'};
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: ${popIn} 0.5s ease-out backwards;

  ${({ $state, theme }) => {
    switch ($state) {
      case 'complete':
        return css`
          background: linear-gradient(145deg, #22c55e 0%, #16a34a 100%);
          color: white;
          box-shadow:
            0 2px 8px rgba(34, 197, 94, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        `;
      case 'active':
        return css`
          background: linear-gradient(145deg, #6366f1 0%, #7c3aed 100%);
          color: white;
          box-shadow:
            0 4px 20px rgba(99, 102, 241, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          animation: ${popIn} 0.5s ease-out backwards, ${gentlePulse} 2.5s ease-in-out infinite;
        `;
      default:
        return css`
          background: ${theme.colours.surface};
          color: ${theme.colours.textMuted};
          border: 2px solid ${theme.colours.border};
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        `;
    }
  }}

  &:hover {
    ${({ $isClickable, $state }) => $isClickable && css`
      transform: scale(1.08) translateY(-2px);
      box-shadow: ${$state === 'complete'
        ? '0 6px 24px rgba(34, 197, 94, 0.4)'
        : '0 6px 24px rgba(99, 102, 241, 0.4)'};
    `}
  }

  &:active {
    ${({ $isClickable }) => $isClickable && css`
      transform: scale(0.98);
      transition-duration: 0.1s;
    `}
  }

  svg {
    width: 18px;
    height: 18px;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1));
  }
`;

// Step label - cleaner typography
const StepLabel = styled.span<{ $state: 'complete' | 'active' | 'upcoming' }>`
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  max-width: 90px;
  line-height: 1.4;
  letter-spacing: 0.01em;
  transition: all 0.3s ease;
  white-space: nowrap;

  ${({ $state, theme }) => {
    switch ($state) {
      case 'complete':
        return css`
          color: #16a34a;
        `;
      case 'active':
        return css`
          color: #6366f1;
          font-weight: 700;
        `;
      default:
        return css`
          color: ${theme.colours.textMuted};
          opacity: 0.7;
        `;
    }
  }};
`;

const OptionalTag = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.colours.textMuted};
  font-weight: 400;
  opacity: 0.6;
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
}) => {
  // Calculate progress percentage for the line
  const progressPercent = steps.length > 1
    ? (currentStepIndex / (steps.length - 1)) * 100
    : 0;

  return (
    <Container className={className}>
      <ProgressWrapper>
        {/* Background track */}
        <ProgressTrack />

        {/* Animated progress line */}
        <ProgressLine $progress={progressPercent} />

        {/* Step indicators */}
        {steps.map((step, index) => {
          const isComplete = index < currentStepIndex || !!step.isComplete;
          const isActive = index === currentStepIndex;
          const state = isComplete && !isActive ? 'complete' : isActive ? 'active' : 'upcoming';
          const isClickable = !!onStepClick && (isComplete || index === currentStepIndex + 1);

          return (
            <StepWrapper key={step.id}>
              <StepIndicator
                $state={state}
                $isClickable={isClickable}
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                title={step.description}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {state === 'complete' ? (
                  <CheckIcon />
                ) : (
                  <span>{index + 1}</span>
                )}
              </StepIndicator>
              <StepLabel $state={state}>
                {step.label}
                {step.isOptional && <OptionalTag> (opt)</OptionalTag>}
              </StepLabel>
            </StepWrapper>
          );
        })}
      </ProgressWrapper>
    </Container>
  );
};

export default WizardProgress;

