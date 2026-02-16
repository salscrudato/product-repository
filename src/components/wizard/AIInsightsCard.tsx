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

// P&C Industry Benchmark Data
const PC_BENCHMARKS = {
  occurrence: { usage: 85, label: 'Property & Auto' },
  claimsMade: { usage: 90, label: 'Professional Liability' },
  coinsurance80: { usage: 75, label: 'Commercial Property' },
  coinsurance90: { usage: 15, label: 'High-value Properties' },
  rcValuation: { usage: 65, label: 'Buildings' },
  acvValuation: { usage: 30, label: 'Auto & Contents' },
};

// Step-specific insights configuration with P&C optimization
const getStepInsights = (stepId: string, draft: Partial<Coverage>): StepInsight[] => {
  const insights: StepInsight[] = [];
  const coverageLower = (draft.name || '').toLowerCase();
  const isPropertyCoverage = coverageLower.includes('building') || coverageLower.includes('property') || coverageLower.includes('contents');
  const isLiabilityCoverage = coverageLower.includes('liability') || coverageLower.includes('professional');
  const isAutoCoverage = coverageLower.includes('auto') || coverageLower.includes('collision') || coverageLower.includes('comprehensive');

  switch (stepId) {
    case 'basics':
      if (!draft.name) {
        insights.push({ type: 'tip', message: 'Enter a coverage name to unlock AI-powered field suggestions' });
      }
      if (draft.name && draft.name.length > 5) {
        insights.push({ type: 'success', message: `AI detected "${draft.name}" - recommendations loaded` });
      }
      break;

    case 'triggers':
      if (!draft.coverageTrigger) {
        if (isPropertyCoverage || isAutoCoverage) {
          insights.push({ type: 'tip', message: `${PC_BENCHMARKS.occurrence.usage}% of ${PC_BENCHMARKS.occurrence.label} coverages use Occurrence trigger` });
        } else if (isLiabilityCoverage) {
          insights.push({ type: 'tip', message: `${PC_BENCHMARKS.claimsMade.usage}% of ${PC_BENCHMARKS.claimsMade.label} uses Claims-Made trigger` });
        } else {
          insights.push({ type: 'tip', message: 'Occurrence covers incidents during policy period; Claims-Made covers when reported' });
        }
      }
      if (draft.coverageTrigger === 'claimsMade') {
        insights.push({ type: 'info', message: 'Claims-Made requires tail coverage and retroactive date consideration' });
        if (!draft.waitingPeriod) {
          insights.push({ type: 'warning', message: 'Consider adding a waiting period for Claims-Made triggers' });
        }
      }
      if (draft.coverageTrigger === 'occurrence') {
        insights.push({ type: 'success', message: 'Occurrence trigger selected - standard for this coverage type' });
      }
      break;

    case 'valuation':
      if (!draft.valuationMethods || draft.valuationMethods.length === 0) {
        if (isPropertyCoverage) {
          insights.push({ type: 'tip', message: `${PC_BENCHMARKS.rcValuation.usage}% of ${PC_BENCHMARKS.rcValuation.label} use Replacement Cost (RC)` });
        } else if (isAutoCoverage) {
          insights.push({ type: 'tip', message: `${PC_BENCHMARKS.acvValuation.usage}% of ${PC_BENCHMARKS.acvValuation.label} use Actual Cash Value (ACV)` });
        }
      }
      if (!draft.coinsuranceOptions || draft.coinsuranceOptions.length === 0) {
        insights.push({ type: 'info', message: `${PC_BENCHMARKS.coinsurance80.usage}% of commercial property uses 80% coinsurance` });
      }
      if (draft.valuationMethods && draft.valuationMethods.length > 0 && draft.coinsuranceOptions && draft.coinsuranceOptions.length > 0) {
        insights.push({ type: 'success', message: 'Valuation configuration complete' });
      }
      break;

    case 'underwriting':
      insights.push({ type: 'tip', message: 'Clear eligibility rules reduce adverse selection and improve loss ratios' });
      if (!draft.eligibilityCriteria || draft.eligibilityCriteria.length === 0) {
        insights.push({ type: 'info', message: 'Common criteria: Years in business, loss history, safety certifications' });
      }
      if (draft.requiresUnderwriterApproval === undefined) {
        insights.push({ type: 'warning', message: 'Set approval requirements to define when underwriter review is needed' });
      }
      break;

    case 'review':
      const missingFields = [];
      if (!draft.name) missingFields.push('Coverage Name');
      if (!draft.coverageCode) missingFields.push('Coverage Code');
      if (!draft.coverageTrigger) missingFields.push('Coverage Trigger');

      if (missingFields.length > 0) {
        insights.push({ type: 'warning', message: `Complete required fields: ${missingFields.join(', ')}` });
      } else {
        insights.push({ type: 'success', message: 'Coverage is ready to publish' });
        insights.push({ type: 'info', message: 'Tip: Review all settings before publishing to production' });
      }
      break;
  }

  return insights;
};

const STEP_TIPS: Record<string, { title: string; description: string; pcTip?: string }> = {
  basics: {
    title: 'Coverage Foundation',
    description: 'Define the core identity of your coverage',
    pcTip: 'ISO Insight: Use standardized coverage names (e.g., "Building Coverage", "Business Personal Property") for regulatory compliance and industry consistency.'
  },
  triggers: {
    title: 'Coverage Trigger',
    description: 'When does coverage apply to a loss?',
    pcTip: 'Industry Standard: 85% of property coverages use Occurrence trigger. Claims-Made is standard for E&O, D&O, and professional liability lines.'
  },
  valuation: {
    title: 'Loss Valuation',
    description: 'How will covered losses be valued?',
    pcTip: 'Market Data: Replacement Cost (RC) is used in 65% of commercial property policies. 80% coinsurance is the industry standard for commercial lines.'
  },
  underwriting: {
    title: 'Risk Selection',
    description: 'Define eligibility and approval rules',
    pcTip: 'Best Practice: Clear eligibility criteria reduce adverse selection by 15-25% and improve combined ratios. Consider loss history, years in business, and safety certifications.'
  },
  claims: {
    title: 'Claims Handling',
    description: 'Configure claims procedures',
    pcTip: 'Performance Metric: Streamlined claims procedures can reduce cycle time by 30% and improve customer retention by 20%.'
  },
  forms: {
    title: 'Policy Forms',
    description: 'Link required forms and endorsements',
    pcTip: 'Compliance Note: Ensure all ISO forms, state-mandated endorsements, and bureau filings are properly linked to this coverage.'
  },
  review: {
    title: 'Final Review',
    description: 'Verify all settings before publishing',
    pcTip: 'Quality Check: Verify coverage aligns with your rate manual, state filings, and underwriting guidelines before publishing to production.'
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

// Premium Animations
const fadeIn = keyframes`from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); }`;
const pulse = keyframes`0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); }`;
const cursorBlink = keyframes`0%, 100% { opacity: 1; } 50% { opacity: 0; }`;
const shimmer = keyframes`0% { background-position: -200% 0; } 100% { background-position: 200% 0; }`;
const breathe = keyframes`0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; }`;

// Styled Components - Premium V2
const Container = styled.div`
  background: ${({ theme }) => theme.colours.background};
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.04),
    0 1px 3px rgba(0, 0, 0, 0.02);
  position: relative;

  /* Subtle ambient glow */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    height: 60%;
    background: radial-gradient(ellipse at top, rgba(139, 92, 246, 0.08) 0%, transparent 70%);
    pointer-events: none;
    animation: ${breathe} 4s ease-in-out infinite;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(99, 102, 241, 0.06));
  border-bottom: 1px solid ${({ theme }) => theme.colours.border};
  position: relative;
  z-index: 1;
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
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);

  svg {
    width: 16px;
    height: 16px;
    color: white;
  }
`;

const HeaderText = styled.div`
  h4 {
    font-size: 15px;
    font-weight: 700;
    color: ${({ theme }) => theme.colours.text};
    margin: 0;
    letter-spacing: -0.01em;
  }
  p {
    font-size: 12px;
    color: ${({ theme }) => theme.colours.textMuted};
    margin: 3px 0 0;
  }
`;

const InsightsList = styled.div`
  padding: 14px;
  position: relative;
  z-index: 1;
`;

const InsightItem = styled.div<{ $type: string; $delay: number }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  background: ${({ $type }) => {
    switch ($type) {
      case 'tip': return 'rgba(245, 158, 11, 0.1)';
      case 'warning': return 'rgba(239, 68, 68, 0.1)';
      case 'success': return 'rgba(16, 185, 129, 0.1)';
      default: return 'rgba(99, 102, 241, 0.1)';
    }
  }};
  border: 1px solid ${({ $type }) => {
    switch ($type) {
      case 'tip': return 'rgba(245, 158, 11, 0.2)';
      case 'warning': return 'rgba(239, 68, 68, 0.2)';
      case 'success': return 'rgba(16, 185, 129, 0.2)';
      default: return 'rgba(99, 102, 241, 0.15)';
    }
  }};
  border-radius: 12px;
  margin-bottom: 10px;
  animation: ${fadeIn} 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  animation-delay: ${({ $delay }) => $delay * 80}ms;
  animation-fill-mode: both;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateX(2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const InsightIcon = styled.div<{ $type: string }>`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: ${({ $type }) => {
    switch ($type) {
      case 'tip': return 'rgba(245, 158, 11, 0.15)';
      case 'warning': return 'rgba(239, 68, 68, 0.15)';
      case 'success': return 'rgba(16, 185, 129, 0.15)';
      default: return 'rgba(99, 102, 241, 0.15)';
    }
  }};
  border-radius: 8px;

  svg {
    width: 16px;
    height: 16px;
    color: ${({ $type }) => {
      switch ($type) {
        case 'tip': return '#f59e0b';
        case 'warning': return '#ef4444';
        case 'success': return '#10b981';
        default: return '#6366f1';
      }
    }};
  }
`;

const InsightText = styled.span`
  flex: 1;
  font-size: 13px;
  color: ${({ theme }) => theme.colours.text};
  line-height: 1.5;
  padding-top: 4px;
`;

const InsightAction = styled.button`
  padding: 6px 12px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.25);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(99, 102, 241, 0.35);
  }

  &:active {
    transform: translateY(0);
  }
`;

export default AIInsightsCard;

