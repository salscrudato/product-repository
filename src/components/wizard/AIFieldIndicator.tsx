/**
 * AIFieldIndicator - Visual indicator for AI-populated fields
 * Shows AI source, confidence, and allows accept/reject of suggestions
 */

import React, { useState, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { SparklesIcon, CheckIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { aiFieldUpdate, aiSparkle, aiPulse } from '../../styles/copilotAnimations';

export type AIFieldStatus = 'manual' | 'ai-suggested' | 'ai-accepted' | 'ai-rejected' | 'ai-updating';

interface AIFieldIndicatorProps {
  status: AIFieldStatus;
  confidence?: number; // 0-100
  explanation?: string;
  onAccept?: () => void;
  onReject?: () => void;
  onRegenerate?: () => void;
  showActions?: boolean;
  children: React.ReactNode;
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 80) return '#10b981'; // green
  if (confidence >= 60) return '#f59e0b'; // amber
  return '#ef4444'; // red
};

const getConfidenceLabel = (confidence: number) => {
  if (confidence >= 80) return 'High';
  if (confidence >= 60) return 'Medium';
  return 'Low';
};

export const AIFieldIndicator: React.FC<AIFieldIndicatorProps> = ({
  status,
  confidence = 85,
  explanation,
  onAccept,
  onReject,
  onRegenerate,
  showActions = true,
  children,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [wasJustUpdated, setWasJustUpdated] = useState(false);

  useEffect(() => {
    if (status === 'ai-suggested') {
      setWasJustUpdated(true);
      const timer = setTimeout(() => setWasJustUpdated(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const isAIInvolved = status !== 'manual';

  return (
    <Container $status={status} $wasJustUpdated={wasJustUpdated}>
      {/* AI Badge */}
      {isAIInvolved && status !== 'ai-rejected' && (
        <AIBadge $status={status}>
          {status === 'ai-updating' ? (
            <UpdatingIcon><ArrowPathIcon /></UpdatingIcon>
          ) : (
            <SparkleIcon $status={status}><SparklesIcon /></SparkleIcon>
          )}
          <BadgeText>
            {status === 'ai-updating' ? 'AI thinking...' : 'AI Suggested'}
          </BadgeText>
          {status === 'ai-suggested' && confidence && (
            <ConfidenceBadge $color={getConfidenceColor(confidence)}>
              {getConfidenceLabel(confidence)}
            </ConfidenceBadge>
          )}
          {explanation && (
            <InfoButton
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <InformationCircleIcon />
              {showTooltip && (
                <Tooltip>{explanation}</Tooltip>
              )}
            </InfoButton>
          )}
        </AIBadge>
      )}

      {/* Field Content */}
      <FieldWrapper $status={status} $wasJustUpdated={wasJustUpdated}>
        {children}
      </FieldWrapper>

      {/* Action Buttons */}
      {showActions && status === 'ai-suggested' && (
        <ActionBar>
          <AcceptButton onClick={onAccept}>
            <CheckIcon />
            <span>Accept</span>
          </AcceptButton>
          <RejectButton onClick={onReject}>
            <XMarkIcon />
            <span>Reject</span>
          </RejectButton>
          {onRegenerate && (
            <RegenerateButton onClick={onRegenerate}>
              <ArrowPathIcon />
            </RegenerateButton>
          )}
        </ActionBar>
      )}

      {/* Accepted indicator */}
      {status === 'ai-accepted' && (
        <AcceptedIndicator>
          <CheckIcon />
          <span>AI suggestion accepted</span>
        </AcceptedIndicator>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div<{ $status: AIFieldStatus; $wasJustUpdated: boolean }>`
  position: relative;
  ${({ $wasJustUpdated }) => $wasJustUpdated && css`animation: ${aiFieldUpdate} 1.5s ease-out;`}
`;

const AIBadge = styled.div<{ $status: AIFieldStatus }>`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding: 4px 10px;
  background: ${({ $status }) => 
    $status === 'ai-updating' 
      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))'
      : 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(168, 85, 247, 0.08))'
  };
  border-radius: 20px;
  width: fit-content;
  border: 1px solid rgba(139, 92, 246, 0.2);
`;

const SparkleIcon = styled.span<{ $status: AIFieldStatus }>`
  display: flex;
  svg {
    width: 14px;
    height: 14px;
    color: #8b5cf6;
    ${({ $status }) => $status === 'ai-suggested' && css`animation: ${aiSparkle} 2s ease-in-out infinite;`}
  }
`;

const UpdatingIcon = styled.span`
  display: flex;
  svg {
    width: 14px;
    height: 14px;
    color: #6366f1;
    animation: ${aiPulse} 1s ease-in-out infinite;
  }
`;

const BadgeText = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: #7c3aed;
`;

const ConfidenceBadge = styled.span<{ $color: string }>`
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  background: ${({ $color }) => `${$color}15`};
  color: ${({ $color }) => $color};
`;

const InfoButton = styled.button`
  position: relative;
  display: flex;
  padding: 2px;
  background: none;
  border: none;
  cursor: pointer;
  svg {
    width: 14px;
    height: 14px;
    color: #8b5cf6;
    opacity: 0.7;
    transition: opacity 0.2s;
  }
  &:hover svg { opacity: 1; }
`;

const Tooltip = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  padding: 10px 14px;
  background: #1e1b4b;
  color: white;
  font-size: 12px;
  line-height: 1.5;
  border-radius: 8px;
  white-space: nowrap;
  max-width: 280px;
  white-space: normal;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  &::before {
    content: '';
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-bottom: 6px solid #1e1b4b;
  }
`;

const FieldWrapper = styled.div<{ $status: AIFieldStatus; $wasJustUpdated: boolean }>`
  position: relative;
  border-radius: 10px;
  transition: all 0.3s ease;
  ${({ $status }) => $status === 'ai-suggested' && css`
    &::after {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 12px;
      border: 2px solid rgba(139, 92, 246, 0.3);
      pointer-events: none;
    }
  `}
`;

const ActionBar = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 10px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
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
  &:hover { background: #059669; transform: translateY(-1px); }
`;

const RejectButton = styled(ActionButton)`
  background: #f1f5f9;
  color: #64748b;
  &:hover { background: #e2e8f0; }
`;

const RegenerateButton = styled(ActionButton)`
  background: transparent;
  color: #8b5cf6;
  padding: 6px;
  &:hover { background: rgba(139, 92, 246, 0.1); }
`;

const AcceptedIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-size: 11px;
  color: #10b981;
  svg { width: 12px; height: 12px; }
`;

export default AIFieldIndicator;

