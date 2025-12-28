/**
 * AIReviewSummary - Premium review step with AI-generated summary
 * 
 * Features:
 * - AI-generated coverage summary
 * - Quality score with breakdown
 * - Recommendations for improvement
 * - Visual completeness indicators
 */

import React, { useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ArrowRightIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import { SparklesIcon as SparklesSolid, CheckCircleIcon as CheckSolid } from '@heroicons/react/24/solid';
import { Coverage } from '../../types';

interface QualityMetric {
  name: string;
  score: number;
  status: 'complete' | 'partial' | 'missing';
  recommendation?: string;
}

interface AIReviewSummaryProps {
  draft: Partial<Coverage>;
  onEditStep: (stepId: string) => void;
  className?: string;
}

// Calculate quality metrics for the coverage
const calculateQualityMetrics = (draft: Partial<Coverage>): QualityMetric[] => {
  const metrics: QualityMetric[] = [];

  // Basic Info
  const hasBasics = !!(draft.name && draft.coverageCode);
  metrics.push({
    name: 'Basic Information',
    score: hasBasics ? 100 : draft.name ? 50 : 0,
    status: hasBasics ? 'complete' : draft.name ? 'partial' : 'missing',
    recommendation: !hasBasics ? 'Add coverage name and code' : undefined,
  });

  // Coverage Trigger
  const hasTrigger = !!draft.coverageTrigger;
  metrics.push({
    name: 'Coverage Trigger',
    score: hasTrigger ? 100 : 0,
    status: hasTrigger ? 'complete' : 'missing',
    recommendation: !hasTrigger ? 'Define when coverage applies' : undefined,
  });

  // Valuation
  const hasValuation = !!(draft.valuationMethod && draft.coinsurancePercentage);
  metrics.push({
    name: 'Valuation Settings',
    score: hasValuation ? 100 : draft.valuationMethod ? 50 : 0,
    status: hasValuation ? 'complete' : draft.valuationMethod ? 'partial' : 'missing',
    recommendation: !hasValuation ? 'Set valuation method and coinsurance' : undefined,
  });

  // Underwriting
  const hasUnderwriting = !!(draft.eligibilityCriteria || draft.underwritingGuidelines);
  metrics.push({
    name: 'Underwriting Rules',
    score: hasUnderwriting ? 100 : 0,
    status: hasUnderwriting ? 'complete' : 'missing',
    recommendation: !hasUnderwriting ? 'Add eligibility criteria' : undefined,
  });

  // Claims
  const hasClaims = !!draft.claimsProcedure;
  metrics.push({
    name: 'Claims Procedure',
    score: hasClaims ? 100 : 0,
    status: hasClaims ? 'complete' : 'missing',
    recommendation: !hasClaims ? 'Define claims handling process' : undefined,
  });

  return metrics;
};

// Generate AI summary text
const generateAISummary = (draft: Partial<Coverage>): string => {
  const parts: string[] = [];
  
  if (draft.name) {
    parts.push(`${draft.name} is a ${draft.coverageTrigger || 'standard'} coverage`);
  }
  
  if (draft.valuationMethod) {
    parts.push(`valued using ${draft.valuationMethod.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
  }
  
  if (draft.coinsurancePercentage) {
    parts.push(`with ${draft.coinsurancePercentage}% coinsurance`);
  }
  
  if (parts.length === 0) {
    return 'Start by adding basic coverage information to generate a summary.';
  }
  
  return parts.join(' ') + '.';
};

export const AIReviewSummary: React.FC<AIReviewSummaryProps> = ({ draft, onEditStep, className = '' }) => {
  const metrics = useMemo(() => calculateQualityMetrics(draft), [draft]);
  const overallScore = useMemo(() => {
    const total = metrics.reduce((sum, m) => sum + m.score, 0);
    return Math.round(total / metrics.length);
  }, [metrics]);
  const summary = useMemo(() => generateAISummary(draft), [draft]);
  const incompleteMetrics = metrics.filter(m => m.status !== 'complete');

  return (
    <Container className={className}>
      {/* AI Summary Header */}
      <SummaryHeader>
        <SummaryIcon><SparklesSolid /></SummaryIcon>
        <SummaryContent>
          <SummaryTitle>AI Coverage Summary</SummaryTitle>
          <SummaryText>{summary}</SummaryText>
        </SummaryContent>
      </SummaryHeader>

      {/* Quality Score */}
      <ScoreSection>
        <ScoreRing $score={overallScore}>
          <ScoreValue>{overallScore}</ScoreValue>
          <ScoreLabel>Quality</ScoreLabel>
        </ScoreRing>
        <ScoreDetails>
          <ScoreTitle>Coverage Quality Score</ScoreTitle>
          <ScoreDescription>
            {overallScore >= 80 ? 'Excellent! Your coverage is well-defined.' :
             overallScore >= 60 ? 'Good progress. A few areas need attention.' :
             'More information needed for a complete coverage.'}
          </ScoreDescription>
          <MetricsList>
            {metrics.map((metric, idx) => (
              <MetricItem key={metric.name} $status={metric.status} $delay={idx}>
                {metric.status === 'complete' ? <CheckSolid /> : 
                 metric.status === 'partial' ? <InformationCircleIcon /> : <ExclamationTriangleIcon />}
                <span>{metric.name}</span>
                <MetricScore $status={metric.status}>{metric.score}%</MetricScore>
              </MetricItem>
            ))}
          </MetricsList>
        </ScoreDetails>
      </ScoreSection>

      {/* Publish Confidence Meter */}
      <PublishConfidenceSection $score={overallScore}>
        <PublishConfidenceHeader>
          <ShieldCheckIcon />
          <span>Publish Readiness</span>
        </PublishConfidenceHeader>
        <PublishConfidenceBar>
          <PublishConfidenceFill $score={overallScore} />
        </PublishConfidenceBar>
        <PublishConfidenceText $score={overallScore}>
          {overallScore >= 80
            ? '✓ Ready to publish - all key fields are complete'
            : overallScore >= 60
              ? '⚠ Almost ready - complete recommended fields for best results'
              : '○ Not ready - complete required fields before publishing'}
        </PublishConfidenceText>
      </PublishConfidenceSection>

      {/* Recommendations */}
      {incompleteMetrics.length > 0 && (
        <RecommendationsSection>
          <RecommendationsHeader><LightBulbIcon />AI Recommendations</RecommendationsHeader>
          {incompleteMetrics.map((metric, idx) => (
            <RecommendationCard key={metric.name} $delay={idx}>
              <RecommendationText>{metric.recommendation}</RecommendationText>
              <RecommendationAction onClick={() => onEditStep(metric.name.toLowerCase().replace(/\s+/g, '-'))}>
                Fix <ArrowRightIcon />
              </RecommendationAction>
            </RecommendationCard>
          ))}
        </RecommendationsSection>
      )}
    </Container>
  );
};

// Premium Animations
const fadeIn = keyframes`from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); }`;
const pulse = keyframes`0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); }`;
const ringFill = keyframes`from { transform: rotate(-90deg); } to { transform: rotate(calc(var(--score) * 3.6deg - 90deg)); }`;
const countUp = keyframes`from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); }`;
const shimmer = keyframes`0% { background-position: -200% 0; } 100% { background-position: 200% 0; }`;
const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.2); }
  50% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.4); }
`;
const sparkle = keyframes`
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.1) rotate(5deg); }
`;

// Styled Components
const Container = styled.div`
  background: ${({ theme }) => theme.colours.surface};
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 16px;
  overflow: hidden;
  animation: ${fadeIn} 0.4s ease-out;
`;

const SummaryHeader = styled.div`
  display: flex; gap: 14px; padding: 20px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(99, 102, 241, 0.08));
  border-bottom: 1px solid ${({ theme }) => theme.colours.border};
`;

const SummaryIcon = styled.div`
  display: flex; padding: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 12px; height: fit-content;
  svg { width: 20px; height: 20px; color: white; }
`;

const SummaryContent = styled.div`flex: 1;`;
const SummaryTitle = styled.h3`font-size: 16px; font-weight: 600; color: ${({ theme }) => theme.colours.text}; margin: 0 0 6px;`;
const SummaryText = styled.p`font-size: 14px; color: ${({ theme }) => theme.colours.textMuted}; margin: 0; line-height: 1.5;`;

const ScoreSection = styled.div`
  display: flex;
  gap: 24px;
  padding: 24px;
  animation: ${fadeIn} 0.5s ease-out 0.2s both;
`;

// Premium animated score ring
const ScoreRing = styled.div<{ $score: number }>`
  position: relative;
  width: 110px;
  height: 110px;
  flex-shrink: 0;
  background: conic-gradient(
    ${({ $score }) => $score >= 80 ? '#10b981' : $score >= 60 ? '#f59e0b' : '#ef4444'} ${({ $score }) => $score * 3.6}deg,
    ${({ theme }) => theme.colours.border} 0deg
  );
  border-radius: 50%;
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);

  ${({ $score }) => $score >= 80 && css`
    animation: ${glowPulse} 2s ease-in-out infinite;
  `}

  &::before {
    content: '';
    position: absolute;
    inset: 10px;
    background: ${({ theme }) => theme.colours.surface};
    border-radius: 50%;
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.05);
  }
`;

const ScoreValue = styled.span<{ $score?: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -60%);
  font-size: 32px;
  font-weight: 700;
  color: ${({ theme }) => theme.colours.text};
  animation: ${countUp} 0.6s ease-out 0.3s both;
`;

const ScoreLabel = styled.span`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, 50%);
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ScoreDetails = styled.div`flex: 1;`;
const ScoreTitle = styled.h4`font-size: 15px; font-weight: 600; color: ${({ theme }) => theme.colours.text}; margin: 0 0 4px;`;
const ScoreDescription = styled.p`font-size: 13px; color: ${({ theme }) => theme.colours.textMuted}; margin: 0 0 16px;`;

const MetricsList = styled.div`display: flex; flex-direction: column; gap: 8px;`;

const MetricItem = styled.div<{ $status: string; $delay: number }>`
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  background: ${({ $status }) =>
    $status === 'complete' ? 'rgba(16, 185, 129, 0.08)' :
    $status === 'partial' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)'};
  border-radius: 10px;
  animation: ${fadeIn} 0.2s ease-out; animation-delay: ${({ $delay }) => $delay * 50}ms; animation-fill-mode: both;
  svg { width: 16px; height: 16px; flex-shrink: 0;
    color: ${({ $status }) => $status === 'complete' ? '#10b981' : $status === 'partial' ? '#f59e0b' : '#ef4444'};
  }
  span { flex: 1; font-size: 13px; color: ${({ theme }) => theme.colours.text}; }
`;

const MetricScore = styled.span<{ $status: string }>`
  font-size: 12px; font-weight: 600;
  color: ${({ $status }) => $status === 'complete' ? '#10b981' : $status === 'partial' ? '#f59e0b' : '#ef4444'} !important;
`;

const RecommendationsSection = styled.div`
  padding: 20px; border-top: 1px solid ${({ theme }) => theme.colours.border};
  background: ${({ theme }) => theme.colours.backgroundAlt};
`;

const RecommendationsHeader = styled.div`
  display: flex; align-items: center; gap: 8px; margin-bottom: 14px;
  font-size: 13px; font-weight: 600; color: ${({ theme }) => theme.colours.text};
  svg { width: 16px; height: 16px; color: #f59e0b; }
`;

const RecommendationCard = styled.div<{ $delay: number }>`
  display: flex; align-items: center; justify-content: space-between; padding: 12px 14px;
  background: ${({ theme }) => theme.colours.surface}; border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 10px; margin-bottom: 8px;
  animation: ${fadeIn} 0.2s ease-out; animation-delay: ${({ $delay }) => $delay * 60}ms; animation-fill-mode: both;
  &:last-child { margin-bottom: 0; }
`;

const RecommendationText = styled.span`font-size: 13px; color: ${({ theme }) => theme.colours.text};`;

const RecommendationAction = styled.button`
  display: flex; align-items: center; gap: 4px; padding: 6px 12px;
  background: ${({ theme }) => theme.colours.primary}; border: none; border-radius: 6px;
  font-size: 12px; font-weight: 600; color: white; cursor: pointer; transition: opacity 0.2s;
  svg { width: 12px; height: 12px; }
  &:hover { opacity: 0.9; }
`;

// Publish Confidence Meter Styles
const PublishConfidenceSection = styled.div<{ $score: number }>`
  padding: 20px 24px;
  background: ${({ $score }) =>
    $score >= 80
      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.05))'
      : $score >= 60
        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(217, 119, 6, 0.05))'
        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(220, 38, 38, 0.05))'
  };
  border-top: 1px solid ${({ theme }) => theme.colours.border};
  animation: ${fadeIn} 0.4s ease-out 0.4s both;
`;

const PublishConfidenceHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};

  svg {
    width: 18px;
    height: 18px;
    color: #10b981;
  }
`;

const PublishConfidenceBar = styled.div`
  height: 8px;
  background: ${({ theme }) => theme.colours.border};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
`;

const PublishConfidenceFill = styled.div<{ $score: number }>`
  height: 100%;
  width: ${({ $score }) => $score}%;
  background: ${({ $score }) =>
    $score >= 80
      ? 'linear-gradient(90deg, #10b981, #059669)'
      : $score >= 60
        ? 'linear-gradient(90deg, #f59e0b, #d97706)'
        : 'linear-gradient(90deg, #ef4444, #dc2626)'
  };
  border-radius: 4px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);

  ${({ $score }) => $score >= 80 && css`
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
  `}
`;

const PublishConfidenceText = styled.div<{ $score: number }>`
  font-size: 13px;
  font-weight: 500;
  color: ${({ $score }) =>
    $score >= 80 ? '#059669' : $score >= 60 ? '#d97706' : '#dc2626'
  };
`;

export default AIReviewSummary;

