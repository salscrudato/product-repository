import React from 'react';
import styled, { keyframes } from 'styled-components';
import {
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import type { ValidationIssue } from '../../types/pricing';

// ============================================================================
// Types
// ============================================================================

interface ValidationIssuesProps {
  issues: ValidationIssue[];
  onIssueClick: (stepId: string) => void;
}

// ============================================================================
// Animations
// ============================================================================

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div<{ $hasErrors?: boolean; $hasWarnings?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: ${({ $hasErrors, $hasWarnings }) => 
    $hasErrors 
      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.08) 100%)'
      : $hasWarnings
        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(234, 179, 8, 0.08) 100%)'
        : 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.08) 100%)'};
  border: 1px solid ${({ $hasErrors, $hasWarnings }) => 
    $hasErrors 
      ? 'rgba(239, 68, 68, 0.2)'
      : $hasWarnings
        ? 'rgba(245, 158, 11, 0.2)'
        : 'rgba(16, 185, 129, 0.2)'};
  border-radius: 10px;
  animation: ${slideIn} 0.3s ease-out;
`;

const IconWrapper = styled.div<{ $type: 'error' | 'warning' | 'success' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: ${({ $type }) => 
    $type === 'error' 
      ? 'rgba(239, 68, 68, 0.15)'
      : $type === 'warning'
        ? 'rgba(245, 158, 11, 0.15)'
        : 'rgba(16, 185, 129, 0.15)'};
  
  svg {
    width: 16px;
    height: 16px;
    color: ${({ $type }) => 
      $type === 'error' 
        ? '#dc2626'
        : $type === 'warning'
          ? '#d97706'
          : '#059669'};
    animation: ${({ $type }) => $type === 'error' ? pulse : 'none'} 2s ease-in-out infinite;
  }
`;

const IssuesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
`;

const IssueBadge = styled.button<{ $severity: 'error' | 'warning' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: ${({ $severity }) => 
    $severity === 'error' 
      ? 'rgba(239, 68, 68, 0.1)'
      : 'rgba(245, 158, 11, 0.1)'};
  border: 1px solid ${({ $severity }) => 
    $severity === 'error' 
      ? 'rgba(239, 68, 68, 0.2)'
      : 'rgba(245, 158, 11, 0.2)'};
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ $severity }) => 
    $severity === 'error' ? '#dc2626' : '#d97706'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ $severity }) => 
      $severity === 'error' 
        ? 'rgba(239, 68, 68, 0.2)'
        : 'rgba(245, 158, 11, 0.2)'};
    transform: translateX(2px);
  }
  
  svg { width: 12px; height: 12px; }
`;

const Summary = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
`;

const SuccessMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #059669;
`;

// ============================================================================
// Component
// ============================================================================

export const ValidationIssuesComponent: React.FC<ValidationIssuesProps> = ({
  issues,
  onIssueClick,
}) => {
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  
  if (issues.length === 0) {
    return null;
  }
  
  return (
    <Container $hasErrors={hasErrors} $hasWarnings={hasWarnings}>
      <IconWrapper $type={hasErrors ? 'error' : 'warning'}>
        {hasErrors ? <XCircleIcon /> : <ExclamationTriangleIcon />}
      </IconWrapper>
      
      <Summary>
        {hasErrors && `${errors.length} error${errors.length > 1 ? 's' : ''}`}
        {hasErrors && hasWarnings && ', '}
        {hasWarnings && `${warnings.length} warning${warnings.length > 1 ? 's' : ''}`}
      </Summary>
      
      <IssuesList>
        {/* Show first 3 errors */}
        {errors.slice(0, 3).map(issue => (
          <IssueBadge
            key={issue.id}
            $severity="error"
            onClick={() => issue.stepId && onIssueClick(issue.stepId)}
            title={issue.message}
          >
            {issue.message.length > 40 ? `${issue.message.slice(0, 40)}...` : issue.message}
            {issue.stepId && <ArrowRightIcon />}
          </IssueBadge>
        ))}
        
        {/* Show first 2 warnings if no errors, otherwise just 1 */}
        {warnings.slice(0, hasErrors ? 1 : 2).map(issue => (
          <IssueBadge
            key={issue.id}
            $severity="warning"
            onClick={() => issue.stepId && onIssueClick(issue.stepId)}
            title={issue.message}
          >
            {issue.message.length > 40 ? `${issue.message.slice(0, 40)}...` : issue.message}
            {issue.stepId && <ArrowRightIcon />}
          </IssueBadge>
        ))}
        
        {/* Show overflow count */}
        {issues.length > 4 && (
          <IssueBadge $severity={hasErrors ? 'error' : 'warning'} onClick={() => {}}>
            +{issues.length - 4} more
          </IssueBadge>
        )}
      </IssuesList>
    </Container>
  );
};

export default ValidationIssuesComponent;

