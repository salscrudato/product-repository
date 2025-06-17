// src/components/EarningsReports.js
import React, { useState } from 'react';
import styled from 'styled-components';
import {
  ChartBarIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
} from '@heroicons/react/24/solid';
import {
  BookmarkIcon as BookmarkOutlineIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import MainNavigation from './ui/Navigation';
import EnhancedHeader from './ui/EnhancedHeader';
import useEarnings from '../hooks/useEarnings';

// Styled components (similar to News.js but adapted for earnings)
const Container = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.isDarkMode
    ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
    : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
  };
`;

const MainContent = styled.main`
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px;
  
  @media (max-width: 768px) {
    padding: 24px 16px;
  }
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  gap: 16px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
`;

const ActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  
  @media (max-width: 768px) {
    justify-content: space-between;
  }
`;

const SearchGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SearchContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  width: 20px;
  height: 20px;
  color: ${({ theme }) => theme.isDarkMode ? '#64748b' : '#6b7280'};
  pointer-events: none;
`;

const SearchInput = styled.input`
  padding: 10px 12px 10px 44px;
  border: 1px solid ${({ theme }) => theme.isDarkMode ? '#374151' : '#d1d5db'};
  border-radius: 8px;
  background: ${({ theme }) => theme.isDarkMode ? '#1f2937' : '#ffffff'};
  color: ${({ theme }) => theme.isDarkMode ? '#f9fafb' : '#111827'};
  font-size: 14px;
  width: 300px;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.isDarkMode ? '#6b7280' : '#9ca3af'};
  }
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.isDarkMode ? '#374151' : '#d1d5db'};
  border-radius: 6px;
  background: ${({ theme }) => theme.isDarkMode ? '#1f2937' : '#ffffff'};
  color: ${({ theme }) => theme.isDarkMode ? '#f9fafb' : '#111827'};
  font-size: 14px;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`;

const StatusBar = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 12px 16px;
  background: ${({ theme }) => theme.isDarkMode
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(255, 255, 255, 0.8)'
  };
  border: 1px solid ${({ theme }) => theme.isDarkMode ? '#374151' : '#e5e7eb'};
  border-radius: 8px;
  backdrop-filter: blur(10px);
`;

const StatusItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: ${({ theme }) => theme.isDarkMode ? '#d1d5db' : '#6b7280'};
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: ${({ theme }) => theme.isDarkMode ? '#374151' : '#f3f4f6'};
  border: 1px solid ${({ theme }) => theme.isDarkMode ? '#4b5563' : '#d1d5db'};
  border-radius: 6px;
  color: ${({ theme }) => theme.isDarkMode ? '#f9fafb' : '#374151'};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.isDarkMode ? '#4b5563' : '#e5e7eb'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  svg {
    width: 16px;
    height: 16px;
    ${props => props.$refreshing && 'animation: spin 1s linear infinite;'}
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const EarningsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const EarningsCard = styled.div`
  background: ${({ theme }) => theme.isDarkMode
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(255, 255, 255, 0.9)'
  };
  border: 1px solid ${({ theme }) => theme.isDarkMode ? '#374151' : '#e5e7eb'};
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.isDarkMode
      ? '0 8px 32px rgba(0, 0, 0, 0.3)'
      : '0 8px 32px rgba(0, 0, 0, 0.1)'
    };
    border-color: #6366f1;
  }
`;

const EarningsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const CompanyInfo = styled.div`
  flex: 1;
`;

const CompanyName = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.isDarkMode ? '#f9fafb' : '#111827'};
  margin: 0 0 4px 0;
  line-height: 1.3;
`;

const CompanySymbol = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #6366f1;
  margin-bottom: 8px;
`;

const Quarter = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.isDarkMode ? '#9ca3af' : '#6b7280'};
`;

const EarningsActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: ${({ theme }) => theme.isDarkMode ? '#374151' : '#f3f4f6'};
  color: ${({ theme }) => theme.isDarkMode ? '#d1d5db' : '#6b7280'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.isDarkMode ? '#4b5563' : '#e5e7eb'};
    color: ${({ theme }) => theme.isDarkMode ? '#f9fafb' : '#374151'};
  }
  
  &.bookmarked {
    background: #fef3c7;
    color: #d97706;
    
    &:hover {
      background: #fde68a;
    }
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
`;

const MetricItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MetricLabel = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.isDarkMode ? '#9ca3af' : '#6b7280'};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MetricValue = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.isDarkMode ? '#f9fafb' : '#111827'};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const GrowthIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 500;
  color: ${props => {
    if (props.$growth > 0) return '#10b981';
    if (props.$growth < 0) return '#ef4444';
    return '#6b7280';
  }};
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const EarningsSummary = styled.div`
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.isDarkMode ? '#d1d5db' : '#4b5563'};
  margin-bottom: 16px;
`;

const EarningsFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid ${({ theme }) => theme.isDarkMode ? '#374151' : '#e5e7eb'};
`;

const EarningsDate = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.isDarkMode ? '#9ca3af' : '#6b7280'};
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const ViewReportButton = styled.a`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #6366f1;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover {
    background: #5855eb;
    transform: translateY(-1px);
  }
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 20px;
  color: ${({ theme }) => theme.isDarkMode ? '#9ca3af' : '#6b7280'};
  
  svg {
    width: 64px;
    height: 64px;
    margin: 0 auto 24px;
    opacity: 0.5;
  }
  
  h3 {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: ${({ theme }) => theme.isDarkMode ? '#d1d5db' : '#374151'};
  }
  
  p {
    font-size: 14px;
    margin: 0;
    max-width: 400px;
    margin: 0 auto;
  }
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const LoadingCard = styled.div`
  background: ${({ theme }) => theme.isDarkMode ? '#1f2937' : '#ffffff'};
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid ${({ theme }) => theme.isDarkMode ? '#374151' : '#e5e7eb'};
    border-top: 4px solid #6366f1;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
  }
  
  h3 {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: ${({ theme }) => theme.isDarkMode ? '#f9fafb' : '#111827'};
  }
  
  p {
    font-size: 14px;
    color: ${({ theme }) => theme.isDarkMode ? '#9ca3af' : '#6b7280'};
    margin: 0;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export default function EarningsReports() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [bookmarkedEarnings, setBookmarkedEarnings] = useState(new Set());

  // Use earnings hook for data management
  const {
    earnings,
    loading,
    refreshing,
    error,
    source,
    stats,
    refresh,
    isEmpty,
    isFromAPI,
    hasError
  } = useEarnings({
    enableAI: true,
    enableCache: true,
    fallbackToSample: true
  });

  // Filter earnings based on search and filters
  const filteredEarnings = earnings.filter(earning => {
    const matchesSearch = !searchTerm || 
      earning.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      earning.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSector = sectorFilter === 'all' || earning.sector === sectorFilter;
    
    return matchesSearch && matchesSector;
  });

  // Handle earnings card click
  const handleEarningsClick = (earning, event) => {
    // Don't navigate if clicking on action buttons
    if (event.target.closest('button') || event.target.closest('a')) {
      return;
    }
    
    // Open earnings report in new tab
    if (earning.reportUrl) {
      window.open(earning.reportUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Handle bookmark toggle
  const toggleBookmark = (earningId) => {
    setBookmarkedEarnings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(earningId)) {
        newSet.delete(earningId);
      } else {
        newSet.add(earningId);
      }
      return newSet;
    });
  };

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
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get growth indicator icon
  const getGrowthIcon = (growth) => {
    if (growth > 0) return ArrowTrendingUpIcon;
    if (growth < 0) return ArrowTrendingDownIcon;
    return MinusIcon;
  };

  // Get status message
  const getStatusMessage = () => {
    if (hasError) {
      if (error.includes('Rate limit') || error.includes('Daily API request limit')) {
        return `Rate limited - using cached data`;
      }
      return `Error: ${error}`;
    }
    if (isFromAPI) {
      return `Live earnings data • ${stats?.enhanced || 0} AI-enhanced`;
    }
    if (source === 'cache') return 'Cached earnings data';
    if (source === 'sample') return 'Sample data';
    if (source === 'fallback') return 'Fallback data';
    return 'Loading...';
  };

  // Get status icon
  const getStatusIcon = () => {
    if (hasError) return ExclamationTriangleIcon;
    if (isFromAPI) return CheckCircleIcon;
    return ClockIcon;
  };

  const StatusIcon = getStatusIcon();

  return (
    <Container>
      <MainNavigation />
      <MainContent>
        <EnhancedHeader
          title="Earnings Reports"
          subtitle={`Track financial performance of ${filteredEarnings.length} top P&C insurance companies`}
          icon={ChartBarIcon}
        />

        <ActionBar>
          <ActionGroup>
            <SearchGroup>
              <SearchContainer>
                <SearchIcon>
                  <MagnifyingGlassIcon />
                </SearchIcon>
                <SearchInput
                  type="text"
                  placeholder="Search companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </SearchContainer>
            </SearchGroup>
          </ActionGroup>

          <FilterGroup>
            <FilterSelect
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
            >
              <option value="all">All Sectors</option>
              <option value="Property & Casualty">Property & Casualty</option>
            </FilterSelect>
            
            <RefreshButton
              onClick={refresh}
              disabled={refreshing}
              $refreshing={refreshing}
            >
              <ArrowPathIcon />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </RefreshButton>
          </FilterGroup>
        </ActionBar>

        <StatusBar>
          <StatusItem>
            <StatusIcon />
            {getStatusMessage()}
          </StatusItem>
          {stats && (
            <StatusItem>
              <ChartBarIcon />
              {stats.enhancementRate}% AI Enhanced
            </StatusItem>
          )}
        </StatusBar>

        {loading ? (
          <EmptyState>
            <ChartBarIcon />
            <h3>Loading Earnings Reports</h3>
            <p>Fetching the latest financial data from top P&C insurers...</p>
          </EmptyState>
        ) : isEmpty ? (
          <EmptyState>
            <ExclamationTriangleIcon />
            <h3>No earnings reports available</h3>
            <p>
              {hasError 
                ? 'Unable to load earnings data. Please try again later.'
                : 'No earnings reports match your current filters.'
              }
            </p>
          </EmptyState>
        ) : (
          <EarningsGrid>
            {filteredEarnings.map(earning => {
              const GrowthIcon = getGrowthIcon(earning.revenueGrowth);
              
              return (
                <EarningsCard key={earning.id} onClick={(e) => handleEarningsClick(earning, e)}>
                  <EarningsHeader>
                    <CompanyInfo>
                      <CompanySymbol>{earning.symbol}</CompanySymbol>
                      <CompanyName>{earning.companyName}</CompanyName>
                      <Quarter>{earning.quarter}</Quarter>
                    </CompanyInfo>
                    <EarningsActions>
                      <ActionButton
                        className={bookmarkedEarnings.has(earning.id) ? 'bookmarked' : ''}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(earning.id);
                        }}
                        title="Bookmark earnings report"
                      >
                        {bookmarkedEarnings.has(earning.id) ?
                          <BookmarkSolidIcon /> :
                          <BookmarkOutlineIcon />
                        }
                      </ActionButton>
                      <ActionButton
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implement share functionality
                        }}
                        title="Share earnings report"
                      >
                        <ShareIcon />
                      </ActionButton>
                    </EarningsActions>
                  </EarningsHeader>

                  <MetricsGrid>
                    <MetricItem>
                      <MetricLabel>Revenue</MetricLabel>
                      <MetricValue>
                        {formatCurrency(earning.revenue)}
                        {earning.revenueGrowth !== null && (
                          <GrowthIndicator $growth={earning.revenueGrowth}>
                            <GrowthIcon />
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
                            <GrowthIcon />
                            {Math.abs(earning.netIncomeGrowth).toFixed(1)}%
                          </GrowthIndicator>
                        )}
                      </MetricValue>
                    </MetricItem>
                    
                    <MetricItem>
                      <MetricLabel>EPS</MetricLabel>
                      <MetricValue>
                        ${earning.eps}
                        {earning.epsEstimated && (
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            vs ${earning.epsEstimated} est.
                          </span>
                        )}
                      </MetricValue>
                    </MetricItem>
                    
                    <MetricItem>
                      <MetricLabel>Combined Ratio</MetricLabel>
                      <MetricValue>
                        {earning.combinedRatio ? `${earning.combinedRatio}%` : 'N/A'}
                      </MetricValue>
                    </MetricItem>
                  </MetricsGrid>

                  <EarningsSummary>
                    {earning.aiSummary}
                    {earning.aiEnhanced && (
                      <span style={{
                        fontSize: '11px',
                        color: '#6366f1',
                        fontWeight: '500',
                        marginLeft: '8px'
                      }}>
                        ✨ AI Enhanced
                      </span>
                    )}
                  </EarningsSummary>

                  <EarningsFooter>
                    <EarningsDate>
                      <ClockIcon />
                      {formatDate(earning.date)}
                    </EarningsDate>
                    <ViewReportButton
                      href={earning.reportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Report
                      <ArrowTopRightOnSquareIcon />
                    </ViewReportButton>
                  </EarningsFooter>
                </EarningsCard>
              );
            })}
          </EarningsGrid>
        )}

        {/* Loading overlay for refresh */}
        {refreshing && (
          <LoadingOverlay>
            <LoadingCard>
              <div className="spinner" />
              <h3>Refreshing Earnings</h3>
              <p>Fetching fresh financial data and generating AI summaries...</p>
              {stats?.aiProgress && (
                <p style={{ color: '#6366f1', fontWeight: '500' }}>
                  AI Processing: {stats.aiProgress}%
                </p>
              )}
            </LoadingCard>
          </LoadingOverlay>
        )}
      </MainContent>
    </Container>
  );
}
