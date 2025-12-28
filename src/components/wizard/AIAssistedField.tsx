/**
 * AIAssistedField - Wrapper component for form fields with AI assistance
 * Provides inline AI suggestions, auto-complete, and field explanations
 */

import React, { useState, useCallback } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { SparklesIcon, CheckIcon, XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { SparklesIcon as SparklesSolid } from '@heroicons/react/24/solid';

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
  children,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [wasJustUpdated, setWasJustUpdated] = useState(false);

  // Trigger animation when AI suggests
  React.useEffect(() => {
    if (isAISuggested) {
      setWasJustUpdated(true);
      const timer = setTimeout(() => setWasJustUpdated(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isAISuggested]);

  const getConfidenceColor = () => {
    if (aiConfidence >= 80) return '#10b981';
    if (aiConfidence >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <Container $isAISuggested={isAISuggested} $wasJustUpdated={wasJustUpdated}>
      <LabelRow>
        <Label>
          {label}
          {required && <Required>*</Required>}
        </Label>
        
        <LabelActions>
          {/* AI Suggested Badge */}
          {isAISuggested && (
            <AIBadge>
              <SparklesSolid />
              <span>AI</span>
              <ConfidenceDot $color={getConfidenceColor()} />
            </AIBadge>
          )}

          {/* AI Updating Indicator */}
          {isAIUpdating && (
            <UpdatingBadge>
              <UpdatingSpinner />
              <span>AI thinking...</span>
            </UpdatingBadge>
          )}

          {/* AI Explanation Tooltip */}
          {aiExplanation && (
            <TooltipTrigger
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <InformationCircleIcon />
              {showTooltip && (
                <TooltipContent>
                  <TooltipHeader>
                    <SparklesSolid />
                    <span>AI Suggestion</span>
                  </TooltipHeader>
                  <TooltipText>{aiExplanation}</TooltipText>
                  <TooltipConfidence $color={getConfidenceColor()}>
                    Confidence: {aiConfidence}%
                  </TooltipConfidence>
                </TooltipContent>
              )}
            </TooltipTrigger>
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
      <FieldWrapper $isAISuggested={isAISuggested} $wasJustUpdated={wasJustUpdated} $isUpdating={isAIUpdating}>
        {children}
        {isAIUpdating && <UpdatingOverlay />}
      </FieldWrapper>

      {/* Accept/Reject Actions */}
      {isAISuggested && (onAcceptSuggestion || onRejectSuggestion) && (
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
const aiHighlight = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
  30% { box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.25); }
  100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
`;

const shimmerFill = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const cascadeIn = keyframes`
  0% { opacity: 0; transform: translateY(-4px); }
  50% { opacity: 0.5; }
  100% { opacity: 1; transform: translateY(0); }
`;

const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(139, 92, 246, 0.2), 0 0 16px rgba(99, 102, 241, 0.1); }
  50% { box-shadow: 0 0 16px rgba(139, 92, 246, 0.4), 0 0 32px rgba(99, 102, 241, 0.2); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const sparkle = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
`;

// Styled Components
const Container = styled.div<{ $isAISuggested: boolean; $wasJustUpdated: boolean }>`
  margin-bottom: 20px;
  ${({ $wasJustUpdated }) => $wasJustUpdated && css`
    animation: ${aiHighlight} 1.5s ease-out;
  `}
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

const AIBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.1));
  border-radius: 12px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  svg {
    width: 12px; height: 12px;
    color: #8b5cf6;
    animation: ${sparkle} 2s ease-in-out infinite;
  }
  span { font-size: 11px; font-weight: 600; color: #7c3aed; }
`;

const ConfidenceDot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
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

const TooltipTrigger = styled.div`
  position: relative;
  display: flex;
  cursor: help;
  svg { width: 16px; height: 16px; color: #8b5cf6; }
`;

const TooltipContent = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 100;
  width: 260px;
  padding: 14px;
  background: #1e1b4b;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
`;

const TooltipHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  svg { width: 14px; height: 14px; color: #a78bfa; }
  span { font-size: 12px; font-weight: 600; color: #a78bfa; }
`;

const TooltipText = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: #e0e7ff;
  margin: 0 0 10px;
`;

const TooltipConfidence = styled.div<{ $color: string }>`
  font-size: 11px;
  color: ${({ $color }) => $color};
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

const FieldWrapper = styled.div<{ $isAISuggested: boolean; $wasJustUpdated: boolean; $isUpdating?: boolean }>`
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

  /* AI Suggested border glow */
  ${({ $isAISuggested }) => $isAISuggested && css`
    &::after {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 10px;
      border: 2px solid rgba(139, 92, 246, 0.3);
      pointer-events: none;
      animation: ${glowPulse} 2s ease-in-out infinite;
    }
  `}

  /* Just updated cascade animation */
  ${({ $wasJustUpdated }) => $wasJustUpdated && css`
    animation: ${cascadeIn} 0.4s ease-out;

    input, select, textarea {
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(139, 92, 246, 0.08) 50%,
        transparent 100%
      );
      background-size: 200% 100%;
      animation: ${shimmerFill} 1s ease-out;
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

