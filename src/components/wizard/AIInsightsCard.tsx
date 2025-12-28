/**
 * AIInsightsCard - Contextual AI insights for each wizard step
 *
 * Provides:
 * - Step-specific tips and recommendations
 * - Completeness indicators
 * - Industry benchmarks
 * - Warnings for potential issues
 * - ENHANCED: Streaming text effect for AI suggestions
 */

import React, { useMemo, useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  SparklesIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline';
import { SparklesIcon as SparklesSolid } from '@heroicons/react/24/solid';
import { Coverage } from '../../types';

interface StepInsight {
  type: 'tip' | 'warning' | 'success' | 'info';
  message: string;
  action?: { label: string; onClick: () => void };
}

interface AIInsightsCardProps {
  stepId: string;
  draft: Partial<Coverage>;
  onApplyRecommendation?: (field: string, value: unknown) => void;
  className?: string;
}

// Step-specific insights configuration
const getStepInsights = (stepId: string, draft: Partial<Coverage>): StepInsight[] => {
  const insights: StepInsight[] = [];

  switch (stepId) {
    case 'basics':
      if (!draft.name) {
        insights.push({ type: 'tip', message: 'Start by entering a coverage name - AI will suggest matching fields' });
      }
      if (draft.name && !draft.coverageCode) {
        insights.push({ type: 'info', message: 'Coverage code will be auto-generated from the name' });
      }
      if (draft.name && draft.name.length > 5) {
        insights.push({ type: 'success', message: 'Coverage name detected - AI recommendations are ready' });
      }
      break;

    case 'triggers':
      if (!draft.coverageTrigger) {
        insights.push({ type: 'tip', message: 'Most property coverages use "Occurrence" trigger' });
      }
      if (draft.coverageTrigger === 'claimsMade' && !draft.waitingPeriod) {
        insights.push({ type: 'warning', message: 'Claims-made policies typically require a waiting period' });
      }
      if (draft.coverageTrigger === 'occurrence') {
        insights.push({ type: 'success', message: 'Occurrence trigger is optimal for this coverage type' });
      }
      break;

    case 'valuation':
      if (!draft.valuationMethod) {
        insights.push({ type: 'tip', message: 'Replacement Cost (RC) is the most common valuation method' });
      }
      if (!draft.coinsurancePercentage) {
        insights.push({ type: 'tip', message: 'Industry standard coinsurance is 80% for commercial property' });
      }
      if (draft.coinsurancePercentage && draft.coinsurancePercentage < 80) {
        insights.push({ type: 'warning', message: 'Coinsurance below 80% may increase premium rates' });
      }
      if (draft.valuationMethod && draft.coinsurancePercentage) {
        insights.push({ type: 'success', message: 'Valuation settings are complete and aligned with standards' });
      }
      break;

    case 'underwriting':
      insights.push({ type: 'tip', message: 'Define eligibility criteria to control risk exposure' });
      if (!draft.eligibilityCriteria) {
        insights.push({ type: 'info', message: 'AI can generate eligibility rules based on coverage type' });
      }
      break;

    case 'claims':
      insights.push({ type: 'tip', message: 'Clear claims procedures improve customer satisfaction' });
      if (!draft.claimsProcedure) {
        insights.push({ type: 'info', message: 'Standard claims procedure will be applied if not specified' });
      }
      break;

    case 'forms':
      insights.push({ type: 'tip', message: 'Link relevant policy forms to this coverage' });
      break;

    case 'review':
      const missingFields = [];
      if (!draft.name) missingFields.push('name');
      if (!draft.coverageCode) missingFields.push('code');
      if (!draft.coverageTrigger) missingFields.push('trigger');
      
      if (missingFields.length > 0) {
        insights.push({ type: 'warning', message: `Missing required fields: ${missingFields.join(', ')}` });
      } else {
        insights.push({ type: 'success', message: 'All required fields are complete - ready to publish!' });
      }
      break;
  }

  return insights;
};

const STEP_TIPS: Record<string, { title: string; description: string; pcTip?: string }> = {
  basics: {
    title: 'Coverage Foundation',
    description: 'Name and code are the foundation of your coverage definition',
    pcTip: 'P&C Tip: Use standardized ISO coverage names when possible for consistency.'
  },
  triggers: {
    title: 'When Coverage Applies',
    description: 'Define the triggering events and timing conditions',
    pcTip: 'P&C Tip: Occurrence is standard for property; Claims-Made for professional liability.'
  },
  valuation: {
    title: 'Loss Valuation',
    description: 'Determine how covered losses will be valued and paid',
    pcTip: 'P&C Tip: RC is preferred for buildings; ACV for older assets or contents.'
  },
  underwriting: {
    title: 'Risk Selection',
    description: 'Set eligibility rules and underwriting requirements',
    pcTip: 'P&C Tip: Define clear risk factors to ensure proper pricing and selection.'
  },
  claims: {
    title: 'Claims Handling',
    description: 'Configure how claims will be processed and settled',
    pcTip: 'P&C Tip: Clear procedures reduce claim cycle time and improve loss ratios.'
  },
  forms: {
    title: 'Policy Documentation',
    description: 'Link forms and endorsements to this coverage',
    pcTip: 'P&C Tip: Ensure all required ISO forms and state-specific endorsements are linked.'
  },
  review: {
    title: 'Final Review',
    description: 'Review all settings before publishing',
    pcTip: 'P&C Tip: Verify coverage aligns with your filing and rate manual requirements.'
  },
};

// Streaming text hook for AI-like typing effect
const useStreamingText = (text: string, speed: number = 30) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayedText, isComplete };
};

export const AIInsightsCard: React.FC<AIInsightsCardProps> = ({ stepId, draft, onApplyRecommendation, className = '' }) => {
  const insights = useMemo(() => getStepInsights(stepId, draft), [stepId, draft]);
  const stepInfo = STEP_TIPS[stepId] || { title: 'Step', description: 'Configure this step' };

  // Use streaming effect for P&C tips
  const { displayedText: streamingTip, isComplete: tipComplete } = useStreamingText(
    stepInfo.pcTip || '',
    25
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'tip': return <LightBulbIcon />;
      case 'warning': return <ExclamationTriangleIcon />;
      case 'success': return <CheckCircleIcon />;
      default: return <InformationCircleIcon />;
    }
  };

  return (
    <Container className={className}>
      <Header>
        <HeaderIcon><SparklesSolid /></HeaderIcon>
        <HeaderText><h4>{stepInfo.title}</h4><p>{stepInfo.description}</p></HeaderText>
      </Header>

      {/* Streaming P&C Tip */}
      {stepInfo.pcTip && (
        <PCTipSection>
          <PCTipIcon $isComplete={tipComplete}>
            <CommandLineIcon />
          </PCTipIcon>
          <PCTipText>
            {streamingTip}
            {!tipComplete && <Cursor />}
          </PCTipText>
        </PCTipSection>
      )}

      <InsightsList>
        {insights.map((insight, idx) => (
          <InsightItem key={idx} $type={insight.type} $delay={idx}>
            <InsightIcon $type={insight.type}>{getIcon(insight.type)}</InsightIcon>
            <InsightText>{insight.message}</InsightText>
            {insight.action && (
              <InsightAction onClick={insight.action.onClick}>{insight.action.label}</InsightAction>
            )}
          </InsightItem>
        ))}
      </InsightsList>
    </Container>
  );
};

// Animations
const fadeIn = keyframes`from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); }`;
const pulse = keyframes`0%, 100% { opacity: 1; } 50% { opacity: 0.7; }`;
const cursorBlink = keyframes`0%, 100% { opacity: 1; } 50% { opacity: 0; }`;

// Styled Components
const Container = styled.div`
  background: ${({ theme }) => theme.colours.surface};
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 14px; overflow: hidden;
`;

const Header = styled.div`
  display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.06), rgba(99, 102, 241, 0.06));
  border-bottom: 1px solid ${({ theme }) => theme.colours.border};
`;

// P&C Tip Section with streaming text effect
const PCTipSection = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.06), rgba(5, 150, 105, 0.04));
  border-bottom: 1px solid ${({ theme }) => theme.colours.border};
`;

const PCTipIcon = styled.div<{ $isComplete: boolean }>`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: ${({ $isComplete }) => $isComplete ? '#10b981' : 'linear-gradient(135deg, #10b981, #059669)'};
  border-radius: 6px;
  animation: ${({ $isComplete }) => !$isComplete ? pulse : 'none'} 1s ease-in-out infinite;

  svg {
    width: 12px;
    height: 12px;
    color: white;
  }
`;

const PCTipText = styled.div`
  flex: 1;
  font-size: 12px;
  color: #059669;
  line-height: 1.5;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  min-height: 36px;
`;

const Cursor = styled.span`
  display: inline-block;
  width: 2px;
  height: 14px;
  background: #10b981;
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: ${cursorBlink} 0.8s ease-in-out infinite;
`;

const HeaderIcon = styled.div`
  display: flex; padding: 8px; background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 10px;
  svg { width: 14px; height: 14px; color: white; }
`;

const HeaderText = styled.div`
  h4 { font-size: 14px; font-weight: 600; color: ${({ theme }) => theme.colours.text}; margin: 0; }
  p { font-size: 12px; color: ${({ theme }) => theme.colours.textMuted}; margin: 2px 0 0; }
`;

const InsightsList = styled.div`padding: 12px;`;

const InsightItem = styled.div<{ $type: string; $delay: number }>`
  display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px;
  background: ${({ $type }) => {
    switch ($type) {
      case 'tip': return 'rgba(245, 158, 11, 0.08)';
      case 'warning': return 'rgba(239, 68, 68, 0.08)';
      case 'success': return 'rgba(16, 185, 129, 0.08)';
      default: return 'rgba(99, 102, 241, 0.08)';
    }
  }};
  border-radius: 10px; margin-bottom: 8px;
  animation: ${fadeIn} 0.25s ease-out; animation-delay: ${({ $delay }) => $delay * 60}ms; animation-fill-mode: both;
  &:last-child { margin-bottom: 0; }
`;

const InsightIcon = styled.div<{ $type: string }>`
  flex-shrink: 0; margin-top: 1px;
  svg { width: 16px; height: 16px; color: ${({ $type }) => {
    switch ($type) {
      case 'tip': return '#f59e0b';
      case 'warning': return '#ef4444';
      case 'success': return '#10b981';
      default: return '#6366f1';
    }
  }}; }
`;

const InsightText = styled.span`flex: 1; font-size: 13px; color: ${({ theme }) => theme.colours.text}; line-height: 1.4;`;

const InsightAction = styled.button`
  padding: 4px 10px; background: ${({ theme }) => theme.colours.primary};
  border: none; border-radius: 6px; font-size: 11px; font-weight: 600;
  color: white; cursor: pointer; transition: opacity 0.2s;
  &:hover { opacity: 0.9; }
`;

export default AIInsightsCard;

