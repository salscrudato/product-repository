/**
 * AIAssistedField - Clean wrapper component for form fields with AI assistance
 *
 * Features:
 * - Subtle AI suggestion indicators
 * - Clean loading states
 * - Simple accept/reject actions
 */

import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { SparklesIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface AIAssistedFieldProps {
  label: string;
  fieldName: string;
  isAISuggested?: boolean;
  aiConfidence?: number;
  aiExplanation?: string;
  isAIUpdating?: boolean;
  onAcceptSuggestion?: () => void;
  onRejectSuggestion?: () => void;
  onRequestSuggestion?: () => void;
  showAIButton?: boolean;
  required?: boolean;
  hideActions?: boolean; // Hide Keep/Clear buttons when suggestion is applied
  children: React.ReactNode;
}

export const AIAssistedField: React.FC<AIAssistedFieldProps> = ({
  label,
  fieldName,
  isAISuggested = false,
  aiConfidence = 85,
  aiExplanation,
  isAIUpdating = false,
  onAcceptSuggestion,
  onRejectSuggestion,
  onRequestSuggestion,
  showAIButton = true,
  required = false,
  hideActions = false,
  children,
}) => {
  return (
    <Container>
      <LabelRow>
        <Label>
          {label}
          {required && <Required>*</Required>}
        </Label>

        <LabelActions>
          {/* AI Updating Indicator */}
          {isAIUpdating && (
            <UpdatingBadge>
              <UpdatingSpinner />
              <span>AI thinking...</span>
            </UpdatingBadge>
          )}

          {/* Request AI Suggestion Button */}
          {showAIButton && !isAISuggested && !isAIUpdating && onRequestSuggestion && (
            <AIButton onClick={onRequestSuggestion} title="Get AI suggestion">
              <SparklesIcon />
            </AIButton>
          )}
        </LabelActions>
      </LabelRow>

      {/* Field Content */}
      <FieldWrapper $isUpdating={isAIUpdating} $isAISuggested={isAISuggested}>
        {children}
        {isAIUpdating && <UpdatingOverlay />}
      </FieldWrapper>

      {/* Accept/Reject Actions - hidden once applied */}
      {isAISuggested && !hideActions && (onAcceptSuggestion || onRejectSuggestion) && (
        <ActionRow>
          {onAcceptSuggestion && (
            <AcceptButton onClick={onAcceptSuggestion}>
              <CheckIcon />
              <span>Keep</span>
            </AcceptButton>
          )}
          {onRejectSuggestion && (
            <RejectButton onClick={onRejectSuggestion}>
              <XMarkIcon />
              <span>Clear</span>
            </RejectButton>
          )}
        </ActionRow>
      )}
    </Container>
  );
};

// Simple animations
const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// Clean styled components
const Container = styled.div`
  margin-bottom: 20px;
`;

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colours.text};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Required = styled.span`
  color: #ef4444;
  font-weight: 500;
`;

const LabelActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

// Clean AI updating badge
const UpdatingBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #6366f1;
  border-radius: 12px;

  span {
    font-size: 10px;
    font-weight: 500;
    color: white;
  }
`;

const UpdatingSpinner = styled.div`
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

// Clean AI button
const AIButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;

  svg {
    width: 14px;
    height: 14px;
    color: #6366f1;
  }

  &:hover {
    background: rgba(99, 102, 241, 0.15);
  }
`;

// Simple updating overlay
const UpdatingOverlay = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.03);
  pointer-events: none;
  z-index: 2;
`;

const FieldWrapper = styled.div<{ $isUpdating?: boolean; $isAISuggested?: boolean }>`
  position: relative;
  transition: all 0.2s ease;

  /* AI Updating subtle indicator */
  ${({ $isUpdating }) => $isUpdating && css`
    opacity: 0.7;
  `}
`;

const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
  animation: ${fadeIn} 0.2s ease-out;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;

  svg {
    width: 12px;
    height: 12px;
  }
`;

const AcceptButton = styled(ActionButton)`
  background: #22c55e;
  color: white;

  &:hover {
    background: #16a34a;
  }
`;

const RejectButton = styled(ActionButton)`
  background: ${({ theme }) => theme.colours.backgroundAlt};
  color: ${({ theme }) => theme.colours.textMuted};
  border: 1px solid ${({ theme }) => theme.colours.border};

  &:hover {
    background: ${({ theme }) => theme.colours.border};
  }
`;

export default AIAssistedField;

