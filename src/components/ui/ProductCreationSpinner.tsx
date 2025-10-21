/**
 * Innovative Product Creation Spinner
 * Animated loading indicator with progress tracking for autonomous product creation
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { CreationProgress } from '../../services/productCreationAgent';

interface ProductCreationSpinnerProps {
  progress: CreationProgress[];
  isComplete?: boolean;
  hasError?: boolean;
}

// Animations
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 30px;
`;

const SpinnerWrapper = styled.div`
  position: relative;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const OuterRing = styled.div`
  position: absolute;
  width: 120px;
  height: 120px;
  border: 3px solid transparent;
  border-top-color: #3b82f6;
  border-right-color: #8b5cf6;
  border-radius: 50%;
  animation: ${spin} 2s linear infinite;
`;

const MiddleRing = styled.div`
  position: absolute;
  width: 90px;
  height: 90px;
  border: 3px solid transparent;
  border-bottom-color: #ec4899;
  border-left-color: #f59e0b;
  border-radius: 50%;
  animation: ${spin} 3s linear reverse infinite;
`;

const InnerCircle = styled.div`
  position: absolute;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${pulse} 2s ease-in-out infinite;
  
  svg {
    width: 32px;
    height: 32px;
    color: white;
    animation: ${spin} 2s linear infinite;
  }
`;

const ProgressContainer = styled.div`
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ProgressItem = styled.div<{ $status: string; $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: ${props => {
    if (props.$status === 'completed') return '#f0fdf4';
    if (props.$status === 'error') return '#fef2f2';
    if (props.$isActive) return '#eff6ff';
    return '#f9fafb';
  }};
  border: 1px solid ${props => {
    if (props.$status === 'completed') return '#dcfce7';
    if (props.$status === 'error') return '#fee2e2';
    if (props.$isActive) return '#bfdbfe';
    return '#e5e7eb';
  }};
  animation: ${slideIn} 0.3s ease-out;
`;

const StatusIcon = styled.div<{ $status: string }>`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  ${props => {
    if (props.$status === 'completed') {
      return `
        color: #22c55e;
        svg { width: 20px; height: 20px; }
      `;
    }
    if (props.$status === 'error') {
      return `
        color: #ef4444;
        svg { width: 20px; height: 20px; }
      `;
    }
    if (props.$status === 'in_progress') {
      return `
        animation: ${spin} 1s linear infinite;
        color: #3b82f6;
        width: 20px;
        height: 20px;
        border: 2px solid #e5e7eb;
        border-top-color: #3b82f6;
        border-radius: 50%;
      `;
    }
    return `
      width: 8px;
      height: 8px;
      background: #d1d5db;
      border-radius: 50%;
    `;
  }}
`;

const ProgressLabel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ProgressText = styled.span<{ $status: string }>`
  font-size: 14px;
  font-weight: 500;
  color: ${props => {
    if (props.$status === 'completed') return '#16a34a';
    if (props.$status === 'error') return '#dc2626';
    if (props.$status === 'in_progress') return '#2563eb';
    return '#6b7280';
  }};
`;

const ProgressMessage = styled.span`
  font-size: 12px;
  color: #9ca3af;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${props => props.$progress}%;
  background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);
  border-radius: 2px;
  transition: width 0.3s ease-out;
`;

const OverallProgress = styled.div`
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const OverallLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
`;

const PercentageText = styled.span`
  color: #3b82f6;
  font-weight: 700;
`;

const StatusMessage = styled.div<{ $type: 'success' | 'error' }>`
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.$type === 'success' ? '#16a34a' : '#dc2626'};
  animation: ${slideIn} 0.3s ease-out;
`;

export const ProductCreationSpinner: React.FC<ProductCreationSpinnerProps> = ({
  progress,
  isComplete = false,
  hasError = false
}) => {
  const completedCount = progress.filter(p => p.status === 'completed').length;
  const totalCount = progress.length;
  const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const activeStep = progress.find(p => p.status === 'in_progress');

  return (
    <Container>
      <SpinnerWrapper>
        <OuterRing />
        <MiddleRing />
        <InnerCircle>
          {isComplete ? (
            <CheckCircleIcon />
          ) : hasError ? (
            <ExclamationTriangleIcon />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M2 12h20" />
            </svg>
          )}
        </InnerCircle>
      </SpinnerWrapper>

      <OverallProgress>
        <OverallLabel>
          <span>Overall Progress</span>
          <PercentageText>{overallProgress}%</PercentageText>
        </OverallLabel>
        <ProgressBar>
          <ProgressFill $progress={overallProgress} />
        </ProgressBar>
      </OverallProgress>

      <ProgressContainer>
        {progress.map((step, index) => (
          <ProgressItem
            key={`${step.step}-${index}`}
            $status={step.status}
            $isActive={step.status === 'in_progress'}
          >
            <StatusIcon $status={step.status}>
              {step.status === 'completed' && <CheckCircleIcon />}
              {step.status === 'error' && <ExclamationTriangleIcon />}
            </StatusIcon>
            <ProgressLabel>
              <ProgressText $status={step.status}>
                {step.message}
              </ProgressText>
              {step.error && (
                <ProgressMessage>{step.error}</ProgressMessage>
              )}
            </ProgressLabel>
          </ProgressItem>
        ))}
      </ProgressContainer>

      {isComplete && (
        <StatusMessage $type="success">
          ✓ Product created successfully!
        </StatusMessage>
      )}
      {hasError && (
        <StatusMessage $type="error">
          ✗ An error occurred during product creation
        </StatusMessage>
      )}
    </Container>
  );
};

export default ProductCreationSpinner;

