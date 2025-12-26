/**
 * ProgressBar - Determinate progress indicator for multi-step processes
 * 
 * Provides visual feedback for operations with known progress,
 * such as file uploads, multi-step wizards, or batch operations.
 */

import React from 'react';
import styled, { keyframes, css } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

type ProgressBarVariant = 'primary' | 'success' | 'warning' | 'error';
type ProgressBarSize = 'small' | 'medium' | 'large';

interface ProgressBarProps {
  value: number; // 0-100
  variant?: ProgressBarVariant;
  size?: ProgressBarSize;
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  striped?: boolean;
  className?: string;
}

const getVariantColor = (variant: ProgressBarVariant) => {
  switch (variant) {
    case 'success': return css`${({ theme }) => theme.colours.success}`;
    case 'warning': return css`${({ theme }) => theme.colours.warning}`;
    case 'error': return css`${({ theme }) => theme.colours.error}`;
    default: return css`${({ theme }) => theme.colours.primary}`;
  }
};

const getSizeHeight = (size: ProgressBarSize) => {
  switch (size) {
    case 'small': return '6px';
    case 'large': return '16px';
    default: return '10px';
  }
};

const Container = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const LabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const LabelText = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colours.text};
`;

const ValueText = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.textSecondary};
`;

const Track = styled.div<{ $size: ProgressBarSize }>`
  width: 100%;
  height: ${({ $size }) => getSizeHeight($size)};
  background: ${({ theme }) => theme.colours.backgroundSubtle};
  border-radius: 9999px;
  overflow: hidden;
  position: relative;
`;

const Fill = styled.div<{
  $value: number;
  $variant: ProgressBarVariant;
  $animated: boolean;
  $striped: boolean;
}>`
  height: 100%;
  width: ${({ $value }) => `${Math.min(100, Math.max(0, $value))}%`};
  background: ${({ $variant }) => getVariantColor($variant)};
  border-radius: 9999px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;

  ${({ $animated }) => $animated && css`
    animation: ${pulse} 1.5s ease-in-out infinite;
  `}

  ${({ $striped }) => $striped && css`
    background-image: linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.15) 25%,
      transparent 25%,
      transparent 50%,
      rgba(255, 255, 255, 0.15) 50%,
      rgba(255, 255, 255, 0.15) 75%,
      transparent 75%,
      transparent
    );
    background-size: 16px 16px;
    animation: ${shimmer} 1s linear infinite;
  `}
`;

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  variant = 'primary',
  size = 'medium',
  showLabel = false,
  label,
  animated = false,
  striped = false,
  className
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <Container className={className} role="progressbar" aria-valuenow={clampedValue} aria-valuemin={0} aria-valuemax={100}>
      {(showLabel || label) && (
        <LabelRow>
          <LabelText>{label || 'Progress'}</LabelText>
          <ValueText>{Math.round(clampedValue)}%</ValueText>
        </LabelRow>
      )}
      <Track $size={size}>
        <Fill
          $value={clampedValue}
          $variant={variant}
          $animated={animated}
          $striped={striped}
        />
      </Track>
    </Container>
  );
};

// Step progress for multi-step forms/wizards
interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
  className?: string;
}

const StepContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StepDot = styled.div<{ $isActive: boolean; $isCompleted: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ theme, $isActive, $isCompleted }) =>
    $isCompleted ? theme.colours.success :
    $isActive ? theme.colours.primary :
    theme.colours.backgroundSubtle};
  border: 2px solid ${({ theme, $isActive, $isCompleted }) =>
    $isCompleted ? theme.colours.success :
    $isActive ? theme.colours.primary :
    theme.colours.border};
  transition: all 0.2s ease;
`;

const StepConnector = styled.div<{ $isCompleted: boolean }>`
  flex: 1;
  height: 2px;
  background: ${({ theme, $isCompleted }) =>
    $isCompleted ? theme.colours.success : theme.colours.border};
  transition: background 0.2s ease;
`;

export const StepProgress: React.FC<StepProgressProps> = ({
  currentStep,
  totalSteps,
  className
}) => (
  <StepContainer className={className} role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={totalSteps}>
    {Array.from({ length: totalSteps }).map((_, index) => (
      <React.Fragment key={index}>
        <StepDot
          $isActive={index === currentStep - 1}
          $isCompleted={index < currentStep - 1}
        />
        {index < totalSteps - 1 && (
          <StepConnector $isCompleted={index < currentStep - 1} />
        )}
      </React.Fragment>
    ))}
  </StepContainer>
);

export default ProgressBar;

