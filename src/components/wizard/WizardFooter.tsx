/**
 * WizardFooter - Clean navigation footer for wizard with save/publish actions
 */

import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  ArrowPathIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Clean styled components
const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 100px;
`;

const CenterSection = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  justify-content: center;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const StatusIndicator = styled.span<{ $type: 'warning' | 'info' }>`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  padding: 5px 8px;
  border-radius: 5px;
  background: ${({ $type }) => $type === 'warning'
    ? 'rgba(217, 119, 6, 0.08)'
    : 'rgba(107, 114, 128, 0.06)'
  };
  color: ${({ $type }) => $type === 'warning' ? '#d97706' : '#6b7280'};

  svg {
    width: 12px;
    height: 12px;
  }
`;

// Clean navigation button
const NavButton = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colours.text};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colours.backgroundAlt};
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const SpinningIcon = styled.span`
  display: flex;
  animation: ${spin} 0.8s linear infinite;

  svg {
    width: 14px;
    height: 14px;
  }
`;

// Clean Next button
const NextButton = styled.button<{ $disabled: boolean }>`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  font-size: 13px;
  transition: all 0.15s ease;
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  background: ${({ $disabled }) => $disabled ? '#e5e7eb' : '#6366f1'};
  color: ${({ $disabled }) => $disabled ? '#9ca3af' : 'white'};

  &:hover:not(:disabled) {
    background: #4f46e5;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

// Clean Publish button
const PublishButton = styled.button<{ $canPublish: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  font-size: 13px;
  transition: all 0.15s ease;
  cursor: ${({ $canPublish }) => $canPublish ? 'pointer' : 'not-allowed'};
  background: ${({ $canPublish }) => $canPublish ? '#22c55e' : '#e5e7eb'};
  color: ${({ $canPublish }) => $canPublish ? 'white' : '#9ca3af'};

  &:hover:not(:disabled) {
    background: ${({ $canPublish }) => $canPublish ? '#16a34a' : '#e5e7eb'};
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

interface WizardFooterProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  canGoNext?: boolean;
  canPublish?: boolean;
  isSaving?: boolean;
  isPublishing?: boolean;
  isDirty?: boolean;
  missingRequiredCount?: number;
  className?: string;
}

export const WizardFooter: React.FC<WizardFooterProps> = ({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onSaveDraft,
  onPublish,
  canGoNext = true,
  canPublish = false,
  isSaving = false,
  isPublishing = false,
  isDirty = false,
  missingRequiredCount = 0,
  className = ''
}) => {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <Container className={className}>
      {/* Left side - Previous button */}
      <LeftSection>
        {!isFirstStep && (
          <NavButton onClick={onPrevious}>
            <ChevronLeftIcon />
            Previous
          </NavButton>
        )}
      </LeftSection>

      {/* Center - Status indicators */}
      <CenterSection>
        {missingRequiredCount > 0 && (
          <StatusIndicator $type="info">
            <ExclamationCircleIcon />
            {missingRequiredCount} required field{missingRequiredCount > 1 ? 's' : ''} missing
          </StatusIndicator>
        )}
      </CenterSection>

      {/* Right side - Action buttons */}
      <RightSection>
        {/* Next / Publish button */}
        {isLastStep ? (
          <PublishButton
            onClick={onPublish}
            disabled={!canPublish || isPublishing}
            $canPublish={canPublish}
          >
            {isPublishing ? (
              <SpinningIcon><ArrowPathIcon /></SpinningIcon>
            ) : (
              <CheckIcon />
            )}
            Publish Coverage
          </PublishButton>
        ) : (
          <NextButton
            onClick={onNext}
            disabled={!canGoNext}
            $disabled={!canGoNext}
          >
            Next
            <ChevronRightIcon />
          </NextButton>
        )}
      </RightSection>
    </Container>
  );
};

export default WizardFooter;

