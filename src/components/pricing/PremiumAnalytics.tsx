import React, { useMemo } from 'react';
import styled from 'styled-components';
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

// ============================================================================
// Types
// ============================================================================

interface PricingStep {
  id: string;
  stepType: 'factor' | 'operand';
  stepName?: string;
  value?: number;
  operand?: string;
  states?: string[];
}

interface PremiumAnalyticsProps {
  steps: PricingStep[];
  allStates: string[];
}

interface StateAnalysis {
  state: string;
  premium: number;
  factorCount: number;
}

// ============================================================================
// Styled Components
// ============================================================================

const AnalyticsContainer = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
`;

const AnalyticsHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e2e8f0;
  
  h3 {
    font-size: 18px;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
  }
  
  svg {
    width: 24px;
    height: 24px;
    color: #6366f1;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const MetricCard = styled.div<{ variant?: 'success' | 'warning' | 'danger' | 'info' }>`
  background: ${props => {
    switch (props.variant) {
      case 'success': return 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
      case 'warning': return 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
      case 'danger': return 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
      default: return 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)';
    }
  }};
  border-radius: 12px;
  padding: 16px;
  border: 1px solid ${props => {
    switch (props.variant) {
      case 'success': return '#86efac';
      case 'warning': return '#fbbf24';
      case 'danger': return '#fca5a5';
      default: return '#a5b4fc';
    }
  }};
`;

const MetricLabel = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const MetricValue = styled.div`
  font-size: 24px;
  font-weight: 800;
  color: #1e293b;
`;

const MetricSubtext = styled.div`
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
`;

const DistributionChart = styled.div`
  margin-bottom: 24px;
`;

const ChartTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
`;

const BarChart = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const BarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const BarLabel = styled.div`
  min-width: 60px;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
`;

const BarTrack = styled.div`
  flex: 1;
  height: 24px;
  background: #f1f5f9;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
`;

const BarFill = styled.div<{ width: number; color?: string }>`
  height: 100%;
  width: ${props => props.width}%;
  background: ${props => props.color || 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)'};
  border-radius: 12px;
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  color: white;
  font-size: 11px;
  font-weight: 700;
`;

const BarValue = styled.div`
  min-width: 80px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
`;

const InsightsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InsightCard = styled.div<{ type: 'success' | 'warning' | 'info' }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: ${props => {
    switch (props.type) {
      case 'success': return '#f0fdf4';
      case 'warning': return '#fffbeb';
      default: return '#eff6ff';
    }
  }};
  border-left: 3px solid ${props => {
    switch (props.type) {
      case 'success': return '#22c55e';
      case 'warning': return '#f59e0b';
      default: return '#3b82f6';
    }
  }};
  border-radius: 8px;
  
  svg {
    width: 20px;
    height: 20px;
    color: ${props => {
      switch (props.type) {
        case 'success': return '#22c55e';
        case 'warning': return '#f59e0b';
        default: return '#3b82f6';
      }
    }};
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const InsightText = styled.div`
  font-size: 13px;
  color: #1e293b;
  line-height: 1.5;
  
  strong {
    font-weight: 600;
  }
`;

// ============================================================================
// Component
// ============================================================================

export const PremiumAnalytics: React.FC<PremiumAnalyticsProps> = ({
  steps,
  allStates
}) => {
  // Calculate premium for each state
  const stateAnalysis = useMemo(() => {
    const analysis: StateAnalysis[] = [];
    
    allStates.forEach(state => {
      let premium = 0;
      let currentOperand: string | null = null;
      let factorCount = 0;
      
      // Filter steps applicable to this state
      const stateSteps = steps.filter(step => 
        !step.states || step.states.length === 0 || step.states.includes(state)
      );
      
      stateSteps.forEach(step => {
        if (step.stepType === 'factor') {
          const value = step.value || 0;
          factorCount++;
          
          if (premium === 0 && currentOperand === null) {
            premium = value;
          } else if (currentOperand) {
            switch (currentOperand) {
              case '+': premium += value; break;
              case '-': premium -= value; break;
              case '*': premium *= value; break;
              case '/': premium = value !== 0 ? premium / value : premium; break;
              case '=': premium = value; break;
            }
          }
          currentOperand = null;
        } else if (step.stepType === 'operand') {
          currentOperand = step.operand || null;
        }
      });
      
      analysis.push({ state, premium, factorCount });
    });
    
    return analysis.sort((a, b) => b.premium - a.premium);
  }, [steps, allStates]);

  // Calculate statistics
  const stats = useMemo(() => {
    const premiums = stateAnalysis.map(s => s.premium);
    const avg = premiums.reduce((sum, p) => sum + p, 0) / premiums.length;
    const max = Math.max(...premiums);
    const min = Math.min(...premiums);
    const variance = premiums.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / premiums.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = (stdDev / avg) * 100;
    
    return {
      average: avg,
      maximum: max,
      minimum: min,
      range: max - min,
      stdDev,
      coefficientOfVariation
    };
  }, [stateAnalysis]);

  // Generate insights
  const insights = useMemo(() => {
    const insights: Array<{ type: 'success' | 'warning' | 'info'; text: string }> = [];
    
    // Check for high variance
    if (stats.coefficientOfVariation > 30) {
      insights.push({
        type: 'warning',
        text: `High premium variance detected (${stats.coefficientOfVariation.toFixed(1)}% CV). Consider reviewing state-specific factors for consistency.`
      });
    } else {
      insights.push({
        type: 'success',
        text: `Premium variance is within acceptable range (${stats.coefficientOfVariation.toFixed(1)}% CV).`
      });
    }
    
    // Check for outliers
    const outliers = stateAnalysis.filter(s => 
      s.premium > stats.average + (2 * stats.stdDev) || 
      s.premium < stats.average - (2 * stats.stdDev)
    );
    
    if (outliers.length > 0) {
      insights.push({
        type: 'warning',
        text: `${outliers.length} state(s) have premiums significantly different from average: ${outliers.map(o => o.state).join(', ')}`
      });
    }
    
    // Check for minimum premium
    if (stats.minimum < 100) {
      insights.push({
        type: 'warning',
        text: `Minimum premium ($${stats.minimum.toFixed(2)}) is below typical industry minimums. Consider implementing a minimum premium threshold.`
      });
    }
    
    return insights;
  }, [stateAnalysis, stats]);

  const topStates = stateAnalysis.slice(0, 10);
  const maxPremium = Math.max(...topStates.map(s => s.premium));

  return (
    <AnalyticsContainer>
      <AnalyticsHeader>
        <ChartBarIcon />
        <h3>Premium Analytics</h3>
      </AnalyticsHeader>

      <MetricsGrid>
        <MetricCard variant="info">
          <MetricLabel>Average Premium</MetricLabel>
          <MetricValue>${stats.average.toFixed(2)}</MetricValue>
          <MetricSubtext>Across all states</MetricSubtext>
        </MetricCard>
        
        <MetricCard variant="success">
          <MetricLabel>
            <ArrowTrendingUpIcon />
            Maximum
          </MetricLabel>
          <MetricValue>${stats.maximum.toFixed(2)}</MetricValue>
          <MetricSubtext>{stateAnalysis[0]?.state}</MetricSubtext>
        </MetricCard>
        
        <MetricCard variant="warning">
          <MetricLabel>
            <ArrowTrendingDownIcon />
            Minimum
          </MetricLabel>
          <MetricValue>${stats.minimum.toFixed(2)}</MetricValue>
          <MetricSubtext>{stateAnalysis[stateAnalysis.length - 1]?.state}</MetricSubtext>
        </MetricCard>
        
        <MetricCard variant="info">
          <MetricLabel>Premium Range</MetricLabel>
          <MetricValue>${stats.range.toFixed(2)}</MetricValue>
          <MetricSubtext>{stats.coefficientOfVariation.toFixed(1)}% variance</MetricSubtext>
        </MetricCard>
      </MetricsGrid>

      <DistributionChart>
        <ChartTitle>Top 10 States by Premium</ChartTitle>
        <BarChart>
          {topStates.map(state => (
            <BarRow key={state.state}>
              <BarLabel>{state.state}</BarLabel>
              <BarTrack>
                <BarFill width={(state.premium / maxPremium) * 100}>
                  {((state.premium / maxPremium) * 100).toFixed(0)}%
                </BarFill>
              </BarTrack>
              <BarValue>${state.premium.toFixed(2)}</BarValue>
            </BarRow>
          ))}
        </BarChart>
      </DistributionChart>

      <div>
        <ChartTitle>Insights & Recommendations</ChartTitle>
        <InsightsList>
          {insights.map((insight, index) => (
            <InsightCard key={index} type={insight.type}>
              {insight.type === 'success' && <CheckCircleIcon />}
              {insight.type === 'warning' && <ExclamationTriangleIcon />}
              {insight.type === 'info' && <ChartBarIcon />}
              <InsightText dangerouslySetInnerHTML={{ __html: insight.text }} />
            </InsightCard>
          ))}
        </InsightsList>
      </div>
    </AnalyticsContainer>
  );
};

export default PremiumAnalytics;

