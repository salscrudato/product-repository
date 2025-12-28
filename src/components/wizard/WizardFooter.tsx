/**
 * WizardFooter - Navigation footer for wizard with save/publish actions
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  BookmarkIcon,
  CheckIcon,
  ArrowPathIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

// Styled Components
const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const LeftSection = styled.div``;

const CenterSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const StatusIndicator = styled.span<{ $type: 'warning' | 'info' }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: ${({ $type }) => $type === 'warning' ? '#d97706' : '#6b7280'};

  svg {
    width: 16px;
    height: 16px;
  }
`;

const PulseDot = styled.span`
  width: 8px;
  height: 8px;
  background: #f59e0b;
  border-radius: 50%;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const NavButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colours.textMuted};
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colours.backgroundAlt};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const SaveButton = styled.button<{ $isDirty: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  transition: all 0.2s;
  cursor: ${({ $isDirty }) => $isDirty ? 'pointer' : 'not-allowed'};
  background: ${({ $isDirty, theme }) =>
    $isDirty ? theme.colours.backgroundAlt : theme.colours.background
  };
  color: ${({ $isDirty, theme }) =>
    $isDirty ? theme.colours.text : theme.colours.textMuted
  };

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colours.border};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const SpinningIcon = styled.span`
  display: flex;
  animation: ${spin} 1s linear infinite;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const NextButton = styled.button<{ $disabled: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s;
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  background: ${({ $disabled, theme }) =>
    $disabled ? theme.colours.backgroundAlt : theme.colours.primary
  };
  color: ${({ $disabled }) => $disabled ? '#9ca3af' : 'white'};

  &:hover:not(:disabled) {
    transform: scale(1.02);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const PublishButton = styled.button<{ $canPublish: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s;
  cursor: ${({ $canPublish }) => $canPublish ? 'pointer' : 'not-allowed'};
  background: ${({ $canPublish }) => $canPublish ? '#16a34a' : '#e5e7eb'};
  color: ${({ $canPublish }) => $canPublish ? 'white' : '#9ca3af'};
  box-shadow: ${({ $canPublish }) =>
    $canPublish ? '0 10px 15px -3px rgba(22, 163, 74, 0.3)' : 'none'
  };

  &:hover:not(:disabled) {
    background: ${({ $canPublish }) => $canPublish ? '#15803d' : '#e5e7eb'};
    transform: ${({ $canPublish }) => $canPublish ? 'scale(1.02)' : 'none'};
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  svg {
    width: 16px;
    height: 16px;
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

