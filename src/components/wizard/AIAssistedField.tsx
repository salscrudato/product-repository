/**
 * AIAssistedField - Wrapper component for form fields with AI assistance
 * Provides inline AI suggestions, auto-complete, and field explanations
 */

import React, { useState } from 'react';
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
      <FieldWrapper $isUpdating={isAIUpdating}>
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

// Premium Animations
const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(139, 92, 246, 0.2), 0 0 16px rgba(99, 102, 241, 0.1); }
  50% { box-shadow: 0 0 16px rgba(139, 92, 246, 0.4), 0 0 32px rgba(99, 102, 241, 0.2); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// Styled Components
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
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colours.text};
`;

const Required = styled.span`
  color: #ef4444;
  margin-left: 4px;
`;

const LabelActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const UpdatingBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 14px;
  animation: ${glowPulse} 1.5s ease-in-out infinite;
  span {
    font-size: 11px;
    font-weight: 600;
    color: white;
  }
`;

const UpdatingSpinner = styled.div`
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const AIButton = styled.button`
  display: flex;
  padding: 4px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  svg { width: 16px; height: 16px; color: #8b5cf6; opacity: 0.6; }
  &:hover {
    background: rgba(139, 92, 246, 0.1);
    border-color: rgba(139, 92, 246, 0.2);
    svg { opacity: 1; }
  }
`;

// Shimmer animation for updating overlay
const shimmerMove = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const UpdatingOverlay = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: rgba(139, 92, 246, 0.05);
  overflow: hidden;
  pointer-events: none;
  z-index: 2;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(139, 92, 246, 0.15) 50%,
      transparent 100%
    );
    animation: ${shimmerMove} 1.2s ease-in-out infinite;
  }
`;

const FieldWrapper = styled.div<{ $isUpdating?: boolean }>`
  position: relative;
  transition: all 0.3s ease;

  /* AI Updating shimmer border */
  ${({ $isUpdating }) => $isUpdating && css`
    &::before {
      content: '';
      position: absolute;
      inset: -3px;
      border-radius: 12px;
      border: 2px dashed rgba(139, 92, 246, 0.5);
      pointer-events: none;
      animation: ${glowPulse} 1s ease-in-out infinite;
    }
  `}
`;

const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  svg { width: 14px; height: 14px; }
`;

const AcceptButton = styled(ActionButton)`
  background: #10b981;
  color: white;
  &:hover { background: #059669; }
`;

const RejectButton = styled(ActionButton)`
  background: #f1f5f9;
  color: #64748b;
  &:hover { background: #e2e8f0; }
`;

export default AIAssistedField;

