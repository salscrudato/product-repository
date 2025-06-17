// src/components/ui/EarningsFeedCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import {
  ChartBarIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
} from '@heroicons/react/24/solid';

const FeedContainer = styled.div`
  background: ${({ theme }) => theme.isDarkMode
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(255, 255, 255, 0.9)'
  };
  border: 1px solid ${({ theme }) => theme.isDarkMode ? '#374151' : '#e5e7eb'};
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(10px);
  height: fit-content;
`;

const FeedHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const FeedTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.isDarkMode ? '#f9fafb' : '#111827'};
  margin: 0;
  
  svg {
    width: 20px;
    height: 20px;
    color: #6366f1;
  }
`;

const ViewAllLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  color: #6366f1;
  text-decoration: none;
  transition: all 0.2s ease;
  
  &:hover {
    color: #5855eb;
    transform: translateX(2px);
  }
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const EarningsCard = styled.div`
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.isDarkMode ? '#374151' : '#e5e7eb'};
  border-radius: 8px;
  margin-bottom: 12px;
  background: ${({ theme }) => theme.isDarkMode
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(255, 255, 255, 0.7)'
  };
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    border-color: #6366f1;
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.isDarkMode
      ? '0 4px 12px rgba(0, 0, 0, 0.3)'
      : '0 4px 12px rgba(0, 0, 0, 0.1)'
    };
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const EarningsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const CompanyInfo = styled.div`
  flex: 1;
`;

const CompanyName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.isDarkMode ? '#f9fafb' : '#111827'};
  margin-bottom: 2px;
`;

const CompanySymbol = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: #6366f1;
`;

const Quarter = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.isDarkMode ? '#9ca3af' : '#6b7280'};
  text-align: right;
`;

const MetricsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 8px;
`;

const MetricItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const MetricLabel = styled.div`
  font-size: 10px;
  font-weight: 500;
  color: ${({ theme }) => theme.isDarkMode ? '#9ca3af' : '#6b7280'};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MetricValue = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.isDarkMode ? '#f9fafb' : '#111827'};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const GrowthIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 1px;
  font-size: 10px;
  font-weight: 500;
  color: ${props => {
    if (props.$growth > 0) return '#10b981';
    if (props.$growth < 0) return '#ef4444';
    return '#6b7280';
  }};
  
  svg {
    width: 10px;
    height: 10px;
  }
`;

const EarningsSummary = styled.div`
  font-size: 12px;
  line-height: 1.4;
  color: ${({ theme }) => theme.isDarkMode ? '#d1d5db' : '#4b5563'};
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const EarningsFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: ${({ theme }) => theme.isDarkMode ? '#9ca3af' : '#6b7280'};
`;

const EarningsDate = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  
  svg {
    width: 12px;
    height: 12px;
  }
`;

const AIBadge = styled.div`
  font-size: 10px;
  color: #6366f1;
  font-weight: 500;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${({ theme }) => theme.isDarkMode ? '#9ca3af' : '#6b7280'};
  
  svg {
    width: 48px;
    height: 48px;
    margin: 0 auto 16px;
    opacity: 0.5;
  }
  
  h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: ${({ theme }) => theme.isDarkMode ? '#d1d5db' : '#374151'};
  }
  
  p {
    font-size: 12px;
    margin: 0;
  }
`;

const EarningsFeedCard = ({ earnings = [], onEarningsClick, maxItems = 4 }) => {
  const displayEarnings = earnings.slice(0, maxItems);

  // Format currency values
  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}B`;
    }
    return `$${value.toFixed(0)}M`;
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Get growth indicator icon
  const getGrowthIcon = (growth) => {
    if (growth > 0) return ArrowTrendingUpIcon;
    if (growth < 0) return ArrowTrendingDownIcon;
    return MinusIcon;
  };

  const handleEarningsClick = (earning) => {
    if (onEarningsClick) {
      onEarningsClick(earning);
    } else if (earning.reportUrl) {
      window.open(earning.reportUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <FeedContainer>
      <FeedHeader>
        <FeedTitle>
          <ChartBarIcon />
          Latest Earnings
        </FeedTitle>
        <ViewAllLink to="/earnings">
          View All
          <ArrowTopRightOnSquareIcon />
        </ViewAllLink>
      </FeedHeader>

      {displayEarnings.length === 0 ? (
        <EmptyState>
          <ChartBarIcon />
          <h3>No earnings available</h3>
          <p>Check back later for the latest financial reports from top P&C insurers.</p>
        </EmptyState>
      ) : (
        displayEarnings.map(earning => {
          const RevenueGrowthIcon = getGrowthIcon(earning.revenueGrowth);
          const IncomeGrowthIcon = getGrowthIcon(earning.netIncomeGrowth);
          
          return (
            <EarningsCard
              key={earning.id}
              onClick={() => handleEarningsClick(earning)}
            >
              <EarningsHeader>
                <CompanyInfo>
                  <CompanyName>{earning.companyName}</CompanyName>
                  <CompanySymbol>{earning.symbol}</CompanySymbol>
                </CompanyInfo>
                <Quarter>{earning.quarter}</Quarter>
              </EarningsHeader>

              <MetricsRow>
                <MetricItem>
                  <MetricLabel>Revenue</MetricLabel>
                  <MetricValue>
                    {formatCurrency(earning.revenue)}
                    {earning.revenueGrowth !== null && (
                      <GrowthIndicator $growth={earning.revenueGrowth}>
                        <RevenueGrowthIcon />
                        {Math.abs(earning.revenueGrowth).toFixed(1)}%
                      </GrowthIndicator>
                    )}
                  </MetricValue>
                </MetricItem>
                
                <MetricItem>
                  <MetricLabel>Net Income</MetricLabel>
                  <MetricValue>
                    {formatCurrency(earning.netIncome)}
                    {earning.netIncomeGrowth !== null && (
                      <GrowthIndicator $growth={earning.netIncomeGrowth}>
                        <IncomeGrowthIcon />
                        {Math.abs(earning.netIncomeGrowth).toFixed(1)}%
                      </GrowthIndicator>
                    )}
                  </MetricValue>
                </MetricItem>
              </MetricsRow>

              <EarningsSummary>
                {earning.aiSummary || `${earning.companyName} reported ${earning.quarter} results with revenue of ${formatCurrency(earning.revenue)} and net income of ${formatCurrency(earning.netIncome)}.`}
              </EarningsSummary>

              <EarningsFooter>
                <EarningsDate>
                  <ClockIcon />
                  {formatDate(earning.date)}
                </EarningsDate>
                {earning.aiEnhanced && (
                  <AIBadge>✨ AI Enhanced</AIBadge>
                )}
              </EarningsFooter>
            </EarningsCard>
          );
        })
      )}
    </FeedContainer>
  );
};

export default EarningsFeedCard;
