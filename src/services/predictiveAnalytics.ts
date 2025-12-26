/**
 * Predictive Analytics Service
 * Generates insights and predictions for insurance products
 */

import { db } from '../firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import type { 
  PredictiveInsight, 
  PredictiveFactor, 
  ProductMetrics,
  TrendAnalysis 
} from '../types/analytics';

// ============================================================================
// Insight Generation
// ============================================================================

export interface InsightRequest {
  productId: string;
  insightType: 'LossRatio' | 'Premium' | 'Retention' | 'Claims' | 'Market';
  historicalPeriods?: number; // Number of months of history to analyze
}

export async function generateInsight(request: InsightRequest): Promise<PredictiveInsight> {
  const { productId, insightType, historicalPeriods = 12 } = request;
  
  // In production, this would use ML models and historical data
  // For now, generate illustrative predictions
  
  const factors: PredictiveFactor[] = [];
  let prediction = '';
  let predictedValue: number | undefined;
  let confidence = 0.75;

  switch (insightType) {
    case 'LossRatio':
      factors.push(
        { factor: 'Claims Frequency Trend', impact: 'Negative', weight: 0.35, description: 'Claims frequency increasing 3% YoY' },
        { factor: 'Severity Trend', impact: 'Neutral', weight: 0.25, description: 'Average severity stable at $12,500' },
        { factor: 'Rate Adequacy', impact: 'Positive', weight: 0.25, description: 'Recent rate increase improving margins' },
        { factor: 'Mix Shift', impact: 'Negative', weight: 0.15, description: 'Higher proportion of high-hazard classes' }
      );
      predictedValue = 62.5;
      prediction = `Loss ratio projected to be ${predictedValue}% for next quarter, slightly above target of 60%`;
      confidence = 0.72;
      break;

    case 'Premium':
      factors.push(
        { factor: 'New Business Pipeline', impact: 'Positive', weight: 0.30, description: 'Strong agency submissions up 15%' },
        { factor: 'Retention Rate', impact: 'Positive', weight: 0.25, description: 'Retention stable at 88%' },
        { factor: 'Rate Change', impact: 'Positive', weight: 0.25, description: '+5% rate increase in effect' },
        { factor: 'Market Competition', impact: 'Negative', weight: 0.20, description: 'Increased competition in target segments' }
      );
      predictedValue = 2500000;
      prediction = `Written premium projected to reach $${(predictedValue / 1000000).toFixed(1)}M next quarter (+8% YoY)`;
      confidence = 0.78;
      break;

    case 'Retention':
      factors.push(
        { factor: 'Price Competitiveness', impact: 'Neutral', weight: 0.35, description: 'Rates within 5% of market average' },
        { factor: 'Service Quality', impact: 'Positive', weight: 0.30, description: 'NPS score improved to 72' },
        { factor: 'Claims Experience', impact: 'Positive', weight: 0.25, description: 'Claims satisfaction at 85%' },
        { factor: 'Policy Changes', impact: 'Negative', weight: 0.10, description: 'Coverage restrictions may impact retention' }
      );
      predictedValue = 87;
      prediction = `Retention rate projected at ${predictedValue}% for upcoming renewals`;
      confidence = 0.80;
      break;

    case 'Claims':
      factors.push(
        { factor: 'Seasonality', impact: 'Negative', weight: 0.35, description: 'Entering peak claims season (Q4)' },
        { factor: 'Weather Patterns', impact: 'Negative', weight: 0.25, description: 'CAT activity expected above normal' },
        { factor: 'Portfolio Mix', impact: 'Neutral', weight: 0.25, description: 'Stable class code distribution' },
        { factor: 'Economic Factors', impact: 'Neutral', weight: 0.15, description: 'Inflation moderating on repair costs' }
      );
      predictedValue = 145;
      prediction = `Estimated ${predictedValue} claims expected next quarter (+12% vs prior quarter)`;
      confidence = 0.68;
      break;

    default:
      prediction = 'Market analysis insights coming soon';
      confidence = 0.50;
  }

  return {
    id: '',
    productId,
    insightType,
    prediction,
    confidence: Math.round(confidence * 100),
    predictedValue,
    contributingFactors: factors,
    recommendations: generateRecommendations(insightType, factors),
    forecastPeriod: 'Next Quarter',
    generatedAt: Timestamp.now()
  };
}

function generateRecommendations(
  insightType: string, 
  factors: PredictiveFactor[]
): string[] {
  const recommendations: string[] = [];
  
  const negativeFactors = factors.filter(f => f.impact === 'Negative');
  
  for (const factor of negativeFactors.slice(0, 2)) {
    switch (factor.factor) {
      case 'Claims Frequency Trend':
        recommendations.push('Consider tightening underwriting guidelines for high-frequency segments');
        break;
      case 'Mix Shift':
        recommendations.push('Review pricing for high-hazard class codes');
        break;
      case 'Market Competition':
        recommendations.push('Enhance value proposition to differentiate from competitors');
        break;
      case 'Seasonality':
        recommendations.push('Increase claims reserves for seasonal peak');
        break;
      case 'Weather Patterns':
        recommendations.push('Review CAT reinsurance coverage adequacy');
        break;
      case 'Coverage restrictions':
        recommendations.push('Communicate coverage changes proactively to agents');
        break;
    }
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Continue current strategy - metrics trending positively');
  }
  
  return recommendations;
}

// ============================================================================
// Trend Analysis
// ============================================================================

export async function analyzeTrend(
  productId: string,
  metric: string,
  periods: number = 12
): Promise<TrendAnalysis> {
  // Generate sample trend data
  const dataPoints = [];
  let currentValue = 100;
  
  for (let i = periods; i >= 1; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const periodLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const change = (Math.random() - 0.45) * 10;
    currentValue = Math.max(0, currentValue + change);
    
    dataPoints.push({
      period: periodLabel,
      value: Math.round(currentValue * 100) / 100,
      changeFromPrior: Math.round(change * 100) / 100,
      percentChange: Math.round((change / currentValue) * 10000) / 100
    });
  }
  
  const values = dataPoints.map(d => d.value);
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
  
  return {
    id: '',
    productId,
    metric,
    periodType: 'Monthly',
    dataPoints,
    trendDirection: currentValue > avgValue ? 'Increasing' : 'Decreasing',
    averageValue: Math.round(avgValue * 100) / 100,
    minValue: Math.min(...values),
    maxValue: Math.max(...values),
    calculatedAt: Timestamp.now()
  };
}

