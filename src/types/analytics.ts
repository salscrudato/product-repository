/**
 * Analytics & Reporting Type Definitions
 * Types for metrics, dashboards, and predictive analytics
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Product Metrics
// ============================================================================

export interface ProductMetrics {
  id: string;
  productId: string;
  productName: string;
  periodStart: Timestamp | Date;
  periodEnd: Timestamp | Date;
  
  // Premium Metrics
  writtenPremium: number;
  earnedPremium: number;
  inForcePremium: number;
  policyCount: number;
  avgPremium: number;
  
  // Loss Metrics
  incurredLosses: number;
  paidLosses: number;
  caseReserves: number;
  lossRatio: number;
  claimCount: number;
  claimFrequency: number;
  avgClaimSeverity: number;
  
  // Expense Metrics
  expenseRatio?: number;
  combinedRatio?: number;
  
  // Growth Metrics
  premiumGrowth?: number;
  policyGrowth?: number;
  renewalRate?: number;
  retentionRate?: number;
  
  // State Breakdown
  stateMetrics?: StateMetricBreakdown[];
  
  // Coverage Breakdown
  coverageMetrics?: CoverageMetricBreakdown[];
  
  // Metadata
  calculatedAt: Timestamp | Date;
  dataAsOf: Timestamp | Date;
}

export interface StateMetricBreakdown {
  state: string;
  writtenPremium: number;
  policyCount: number;
  lossRatio: number;
  claimCount: number;
}

export interface CoverageMetricBreakdown {
  coverageId: string;
  coverageName: string;
  writtenPremium: number;
  lossRatio: number;
  claimCount: number;
}

// ============================================================================
// Trend Analysis
// ============================================================================

export interface TrendDataPoint {
  period: string;           // e.g., "2024-Q1", "2024-01"
  value: number;
  changeFromPrior?: number;
  percentChange?: number;
}

export interface TrendAnalysis {
  id: string;
  productId: string;
  metric: string;
  periodType: 'Monthly' | 'Quarterly' | 'Yearly';
  dataPoints: TrendDataPoint[];
  trendDirection: 'Increasing' | 'Decreasing' | 'Stable' | 'Volatile';
  averageValue: number;
  minValue: number;
  maxValue: number;
  standardDeviation?: number;
  calculatedAt: Timestamp | Date;
}

// ============================================================================
// Predictive Analytics
// ============================================================================

export interface PredictiveInsight {
  id: string;
  productId: string;
  insightType: 'LossRatio' | 'Premium' | 'Retention' | 'Claims' | 'Market';
  
  // Prediction
  prediction: string;
  confidence: number;      // 0-100%
  predictedValue?: number;
  predictedRange?: { min: number; max: number };
  
  // Factors
  contributingFactors: PredictiveFactor[];
  
  // Recommendations
  recommendations?: string[];
  
  // Timeframe
  forecastPeriod: string;
  generatedAt: Timestamp | Date;
  validUntil?: Timestamp | Date;
}

export interface PredictiveFactor {
  factor: string;
  impact: 'Positive' | 'Negative' | 'Neutral';
  weight: number;
  description: string;
}

// ============================================================================
// Dashboard Configuration
// ============================================================================

export interface DashboardWidget {
  id: string;
  widgetType: 'Metric' | 'Chart' | 'Table' | 'Map' | 'List';
  title: string;
  dataSource: string;
  config: Record<string, unknown>;
  position: { row: number; col: number; width: number; height: number };
  refreshInterval?: number;
}

export interface DashboardConfig {
  id: string;
  userId: string;
  dashboardName: string;
  widgets: DashboardWidget[];
  isDefault?: boolean;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// ============================================================================
// Audit & Activity
// ============================================================================

export type ActivityType = 
  | 'ProductCreated'
  | 'ProductUpdated'
  | 'CoverageAdded'
  | 'CoverageModified'
  | 'FormAttached'
  | 'RatingTableUpdated'
  | 'FilingSubmitted'
  | 'FilingApproved'
  | 'VersionCreated'
  | 'CommentAdded';

export interface ActivityLogEntry {
  id: string;
  activityType: ActivityType;
  entityId: string;
  entityType: 'Product' | 'Coverage' | 'Form' | 'Filing' | 'RatingTable';
  entityName?: string;
  
  // Actor
  userId: string;
  userName: string;
  
  // Details
  description: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  
  // Metadata
  timestamp: Timestamp | Date;
  ipAddress?: string;
  sessionId?: string;
}

