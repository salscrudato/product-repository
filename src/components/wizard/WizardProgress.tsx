/**
 * WizardProgress - Premium visual progress indicator with AI activity
 *
 * Features:
 * - Animated completion rings with gradient fills
 * - Step preview tooltips on hover
 * - Micro-interactions and smooth transitions
 * - AI activity shimmer effects
 */

import React, { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { CheckIcon, SparklesIcon } from '@heroicons/react/24/solid';

// Premium Keyframes
const ringPulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.9; }
`;

const checkDraw = keyframes`
  0% { stroke-dashoffset: 20; }
  100% { stroke-dashoffset: 0; }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const progressGlow = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(34, 197, 94, 0.3); }
  50% { box-shadow: 0 0 16px rgba(34, 197, 94, 0.5); }
`;

// Styled Components
const Container = styled.div`
  background: linear-gradient(180deg,
    ${({ theme }) => theme.colours.surface} 0%,
    ${({ theme }) => theme.colours.background} 100%
  );
  border-bottom: 1px solid ${({ theme }) => theme.colours.border};
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(99, 102, 241, 0.2) 50%,
      transparent 100%
    );
  }
`;

const CompletenessSection = styled.div`
  padding: 16px 24px 0;
`;

const CompletenessHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const CompletenessLabel = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colours.textMuted};
`;

const CompletenessValue = styled.span<{ $score: number }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ $score }) =>
    $score >= 80 ? '#16a34a' :
    $score >= 50 ? '#ca8a04' : '#dc2626'
  };
`;

const ProgressTrack = styled.div`
  height: 8px;
  background: ${({ theme }) => theme.colours.backgroundAlt};
  border-radius: 9999px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $score: number }>`
  height: 100%;
  border-radius: 9999px;
  transition: width 0.5s ease-out;
  background: ${({ $score }) =>
    $score >= 80 ? '#22c55e' :
    $score >= 50 ? '#eab308' : '#ef4444'
  };
  width: ${({ $score }) => $score}%;
`;

const StepsSection = styled.div`
  padding: 16px 24px 16px;
`;

const StepsList = styled.ol`
  display: flex;
  align-items: center;
  justify-content: space-between;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 0;
`;

const StepItem = styled.li<{ $isLast: boolean }>`
  display: flex;
  align-items: center;
  ${({ $isLast }) => !$isLast && 'flex: 1;'}
`;

const StepWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;

  &:hover .step-tooltip {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
    pointer-events: auto;
  }
`;

// Premium Step Circle with gradient and animations
const StepCircle = styled.button<{ $isActive: boolean; $isPast: boolean; $isClickable: boolean }>`
  position: relative;
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;

  background: ${({ $isActive, $isPast, theme }) =>
    $isActive
      ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
      : $isPast
        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
        : theme.colours.backgroundAlt
  };
  color: ${({ $isActive, $isPast }) =>
    $isActive || $isPast ? 'white' : '#6b7280'
  };
  box-shadow: ${({ $isActive, $isPast }) =>
    $isActive
      ? '0 0 0 4px rgba(99, 102, 241, 0.2), 0 4px 12px rgba(99, 102, 241, 0.3)'
      : $isPast
        ? '0 2px 8px rgba(34, 197, 94, 0.2)'
        : 'none'
  };
  cursor: ${({ $isClickable }) => $isClickable ? 'pointer' : 'default'};

  ${({ $isActive }) => $isActive && css`
    animation: ${ringPulse} 2s ease-in-out infinite;
  `}

  &:hover {
    transform: ${({ $isClickable }) => $isClickable ? 'scale(1.1)' : 'none'};
    ${({ $isClickable }) => $isClickable && css`
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.3), 0 6px 16px rgba(99, 102, 241, 0.4);
    `}
  }

  &:active {
    transform: ${({ $isClickable }) => $isClickable ? 'scale(0.95)' : 'none'};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

// Step tooltip for preview
const StepTooltip = styled.div`
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  background: ${({ theme }) => theme.colours.surface};
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 8px;
  padding: 10px 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  opacity: 0;
  pointer-events: none;
  transition: all 0.2s ease;
  z-index: 50;
  white-space: nowrap;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: ${({ theme }) => theme.colours.surface};
  }
`;

const TooltipTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
  margin-bottom: 2px;
`;

const TooltipDesc = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colours.textMuted};
`;

// Premium animated connector
const Connector = styled.div<{ $isPast: boolean }>`
  flex: 1;
  height: 3px;
  min-width: 24px;
  border-radius: 2px;
  background: ${({ $isPast, theme }) =>
    $isPast
      ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)'
      : theme.colours.backgroundAlt
  };
  transition: all 0.4s ease;
  ${({ $isPast }) => $isPast && css`
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.3);
  `}
`;

const StepLabel = styled.div<{ $isActive: boolean; $isPast: boolean }>`
  margin-top: 10px;
  text-align: center;
  font-size: 11px;
  font-weight: ${({ $isActive }) => $isActive ? 600 : 500};
  max-width: 80px;
  line-height: 1.3;
  color: ${({ $isActive, $isPast, theme }) =>
    $isActive
      ? '#6366f1'
      : $isPast
        ? '#16a34a'
        : theme.colours.textMuted
  };
  transition: color 0.2s;
`;

const OptionalBadge = styled.span`
  display: block;
  color: ${({ theme }) => theme.colours.textMuted};
  font-size: 9px;
  margin-top: 2px;
`;

// AI Activity Animations
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const sparkle = keyframes`
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.1) rotate(180deg); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// AI Activity Indicator Styles
const AIActivitySection = styled.div<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: ${({ $isActive }) =>
    $isActive
      ? 'linear-gradient(90deg, rgba(139, 92, 246, 0.05) 0%, rgba(139, 92, 246, 0.1) 50%, rgba(139, 92, 246, 0.05) 100%)'
      : 'transparent'
  };
  background-size: 200% 100%;
  border-bottom: 1px solid ${({ theme }) => theme.colours.border};
  ${({ $isActive }) => $isActive && css`
    animation: ${shimmer} 2s ease-in-out infinite;
  `}
`;

const AIIcon = styled.div<{ $isActive: boolean }>`
  display: flex;
  padding: 6px;
  background: ${({ $isActive }) =>
    $isActive
      ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
      : 'rgba(139, 92, 246, 0.1)'
  };
  border-radius: 8px;
  svg {
    width: 16px; height: 16px;
    color: ${({ $isActive }) => $isActive ? 'white' : '#8b5cf6'};
    ${({ $isActive }) => $isActive && css`
      animation: ${sparkle} 2s ease-in-out infinite;
    `}
  }
`;

const AIActivityText = styled.span<{ $isActive: boolean }>`
  flex: 1;
  font-size: 13px;
  color: ${({ $isActive, theme }) =>
    $isActive ? '#7c3aed' : theme.colours.textMuted
  };
  font-weight: ${({ $isActive }) => $isActive ? 500 : 400};
  ${({ $isActive }) => $isActive && css`
    animation: ${pulse} 1.5s ease-in-out infinite;
  `}
`;

// Field completion dots within step circle
const FieldDots = styled.div`
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 3px;
`;

const FieldDot = styled.span<{ $isFilled: boolean }>`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ $isFilled }) => $isFilled ? '#22c55e' : 'rgba(255,255,255,0.4)'};
  transition: background 0.3s;
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
  completenessScore,
  className = '',
  isAIActive = false,
  aiActivityMessage = 'AI is ready to assist',
}) => {
  return (
    <Container className={className}>
      {/* AI Activity Indicator */}
      <AIActivitySection $isActive={isAIActive}>
        <AIIcon $isActive={isAIActive}>
          <SparklesIcon />
        </AIIcon>
        <AIActivityText $isActive={isAIActive}>
          {isAIActive ? aiActivityMessage : 'AI Assistant • Ready to help'}
        </AIActivityText>
      </AIActivitySection>

      {/* Completeness bar */}
      {completenessScore !== undefined && (
        <CompletenessSection>
          <CompletenessHeader>
            <CompletenessLabel>Coverage Completeness</CompletenessLabel>
            <CompletenessValue $score={completenessScore}>
              {completenessScore}%
            </CompletenessValue>
          </CompletenessHeader>
          <ProgressTrack>
            <ProgressFill $score={completenessScore} />
          </ProgressTrack>
        </CompletenessSection>
      )}

      {/* Step indicators */}
      <StepsSection>
        <nav aria-label="Progress">
          <StepsList>
            {steps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isPast = index < currentStepIndex || !!step.isComplete;
              const isClickable = !!onStepClick && (isPast || index === currentStepIndex + 1);

              // Generate field dots for this step
              const fieldDots = step.fieldCount ? (
                <FieldDots>
                  {Array.from({ length: Math.min(step.fieldCount, 4) }, (_, i) => (
                    <FieldDot
                      key={i}
                      $isFilled={i < (step.filledFieldCount || 0)}
                    />
                  ))}
                </FieldDots>
              ) : null;

              return (
                <StepItem key={step.id} $isLast={index === steps.length - 1}>
                  <StepWrapper>
                    {/* Tooltip on hover */}
                    {step.description && (
                      <StepTooltip className="step-tooltip">
                        <TooltipTitle>{step.label}</TooltipTitle>
                        <TooltipDesc>{step.description}</TooltipDesc>
                      </StepTooltip>
                    )}
                    <StepCircle
                      onClick={() => isClickable && onStepClick?.(index)}
                      disabled={!isClickable}
                      $isActive={isActive}
                      $isPast={isPast}
                      $isClickable={isClickable}
                      title={step.description}
                    >
                      {isPast && !isActive ? (
                        <CheckIcon />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                      {(isActive || isPast) && fieldDots}
                    </StepCircle>
                    <StepLabel $isActive={isActive} $isPast={isPast}>
                      {step.label}
                      {step.isOptional && <OptionalBadge>(opt)</OptionalBadge>}
                    </StepLabel>
                  </StepWrapper>

                  {index !== steps.length - 1 && (
                    <Connector $isPast={isPast} />
                  )}
                </StepItem>
              );
            })}
          </StepsList>
        </nav>
      </StepsSection>
    </Container>
  );
};

export default WizardProgress;

