// src/components/ui/PerformanceDashboard.js
/**
 * Performance Monitoring Dashboard
 * Real-time performance metrics and optimization insights
 */

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import {
  ChartBarIcon,
  ClockIcon,
  CpuChipIcon,
  ServerIcon,
  EyeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';

import advancedCacheManager from '../../services/advancedCacheManager';
import apiCacheService from '../../services/apiCacheService';
import dataPrefetchingService from '../../services/dataPrefetchingService';
import imageOptimizationService from '../../services/imageOptimizationService';

const DashboardContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  width: 400px;
  max-height: 80vh;
  background: ${({ theme }) => theme.isDarkMode ? '#1a1a1a' : 'white'};
  border: 1px solid ${({ theme }) => theme.isDarkMode ? '#333' : '#e5e7eb'};
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  
  ${props => !props.visible && `
    transform: translateX(420px);
    transition: transform 0.3s ease-in-out;
  `}
  
  ${props => props.visible && `
    transform: translateX(0);
    transition: transform 0.3s ease-in-out;
  `}
`;

const Header = styled.div`
  padding: 16px 20px;
  background: ${({ theme }) => theme.isDarkMode ? '#2a2a2a' : '#f8fafc'};
  border-bottom: 1px solid ${({ theme }) => theme.isDarkMode ? '#333' : '#e5e7eb'};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.isDarkMode ? '#fff' : '#1f2937'};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.isDarkMode ? '#9ca3af' : '#6b7280'};
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    background: ${({ theme }) => theme.isDarkMode ? '#374151' : '#f3f4f6'};
  }
`;

const Content = styled.div`
  padding: 20px;
  max-height: calc(80vh - 60px);
  overflow-y: auto;
`;

const MetricSection = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h4`
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.isDarkMode ? '#d1d5db' : '#374151'};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const MetricCard = styled.div`
  background: ${({ theme }) => theme.isDarkMode ? '#2a2a2a' : '#f9fafb'};
  border: 1px solid ${({ theme }) => theme.isDarkMode ? '#374151' : '#e5e7eb'};
  border-radius: 8px;
  padding: 12px;
`;

const MetricLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.isDarkMode ? '#9ca3af' : '#6b7280'};
  margin-bottom: 4px;
`;

const MetricValue = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.isDarkMode ? '#fff' : '#1f2937'};
  
  ${props => props.status === 'good' && `color: #10b981;`}
  ${props => props.status === 'warning' && `color: #f59e0b;`}
  ${props => props.status === 'error' && `color: #ef4444;`}
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: ${({ theme }) => theme.isDarkMode ? '#374151' : '#e5e7eb'};
  border-radius: 3px;
  overflow: hidden;
  margin-top: 8px;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${props => {
    if (props.percentage > 80) return '#ef4444';
    if (props.percentage > 60) return '#f59e0b';
    return '#10b981';
  }};
  width: ${props => Math.min(props.percentage, 100)}%;
  transition: width 0.3s ease;
`;

const RefreshButton = styled.button`
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &:hover {
    background: #5856eb;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const PerformanceDashboard = () => {
  const [visible, setVisible] = useState(false);
  const [metrics, setMetrics] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef();

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Auto-refresh metrics every 5 seconds
      intervalRef.current = setInterval(refreshMetrics, 5000);
      refreshMetrics();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const refreshMetrics = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    
    try {
      const [
        cacheStats,
        apiStats,
        prefetchStats,
        imageStats,
        performanceStats
      ] = await Promise.all([
        Promise.resolve(advancedCacheManager.getStats()),
        Promise.resolve(apiCacheService.getStats()),
        Promise.resolve(dataPrefetchingService.getStats()),
        Promise.resolve(imageOptimizationService.getStats()),
        getPerformanceStats()
      ]);

      setMetrics({
        cache: cacheStats,
        api: apiStats,
        prefetch: prefetchStats,
        images: imageStats,
        performance: performanceStats,
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error('Failed to refresh metrics:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getPerformanceStats = () => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const memory = performance.memory;
    
    return {
      loadTime: navigation ? Math.round(navigation.loadEventEnd - navigation.fetchStart) : 0,
      domContentLoaded: navigation ? Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart) : 0,
      memoryUsed: memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : 0,
      memoryLimit: memory ? Math.round(memory.jsHeapSizeLimit / 1024 / 1024) : 0,
      memoryPercentage: memory ? Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100) : 0
    };
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusColor = (value, thresholds) => {
    if (value >= thresholds.error) return 'error';
    if (value >= thresholds.warning) return 'warning';
    return 'good';
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {/* Toggle Button */}
      {!visible && (
        <ToggleButton
          onClick={() => setVisible(true)}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 10001,
            background: '#6366f1',
            color: 'white',
            padding: '12px',
            borderRadius: '50%'
          }}
        >
          <ChartBarIcon style={{ width: '20px', height: '20px' }} />
        </ToggleButton>
      )}

      <DashboardContainer visible={visible}>
        <Header>
          <Title>
            <ChartBarIcon style={{ width: '20px', height: '20px' }} />
            Performance Monitor
          </Title>
          <div style={{ display: 'flex', gap: '8px' }}>
            <RefreshButton onClick={refreshMetrics} disabled={refreshing}>
              <ArrowPathIcon style={{ width: '14px', height: '14px' }} />
              Refresh
            </RefreshButton>
            <ToggleButton onClick={() => setVisible(false)}>
              <EyeIcon style={{ width: '16px', height: '16px' }} />
            </ToggleButton>
          </div>
        </Header>

        <Content>
          {/* Performance Metrics */}
          <MetricSection>
            <SectionTitle>
              <ClockIcon style={{ width: '16px', height: '16px' }} />
              Performance
            </SectionTitle>
            <MetricGrid>
              <MetricCard>
                <MetricLabel>Load Time</MetricLabel>
                <MetricValue status={getStatusColor(metrics.performance?.loadTime || 0, { warning: 3000, error: 5000 })}>
                  {metrics.performance?.loadTime || 0}ms
                </MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricLabel>DOM Ready</MetricLabel>
                <MetricValue status={getStatusColor(metrics.performance?.domContentLoaded || 0, { warning: 2000, error: 3000 })}>
                  {metrics.performance?.domContentLoaded || 0}ms
                </MetricValue>
              </MetricCard>
            </MetricGrid>
          </MetricSection>

          {/* Memory Usage */}
          <MetricSection>
            <SectionTitle>
              <CpuChipIcon style={{ width: '16px', height: '16px' }} />
              Memory Usage
            </SectionTitle>
            <MetricCard>
              <MetricLabel>JS Heap Size</MetricLabel>
              <MetricValue status={getStatusColor(metrics.performance?.memoryPercentage || 0, { warning: 70, error: 85 })}>
                {metrics.performance?.memoryUsed || 0} MB / {metrics.performance?.memoryLimit || 0} MB
              </MetricValue>
              <ProgressBar>
                <ProgressFill percentage={metrics.performance?.memoryPercentage || 0} />
              </ProgressBar>
            </MetricCard>
          </MetricSection>

          {/* Cache Performance */}
          <MetricSection>
            <SectionTitle>
              <ServerIcon style={{ width: '16px', height: '16px' }} />
              Cache Performance
            </SectionTitle>
            <MetricGrid>
              <MetricCard>
                <MetricLabel>Memory Hits</MetricLabel>
                <MetricValue status="good">
                  {metrics.cache?.hits?.memory || 0}
                </MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricLabel>Cache Entries</MetricLabel>
                <MetricValue>
                  {metrics.cache?.memoryEntries || 0}
                </MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricLabel>Cache Size</MetricLabel>
                <MetricValue>
                  {formatBytes(metrics.cache?.estimatedMemorySize || 0)}
                </MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricLabel>Background Refreshes</MetricLabel>
                <MetricValue status="good">
                  {metrics.cache?.backgroundRefreshes || 0}
                </MetricValue>
              </MetricCard>
            </MetricGrid>
          </MetricSection>

          {/* API Cache */}
          <MetricSection>
            <SectionTitle>
              <ServerIcon style={{ width: '16px', height: '16px' }} />
              API Cache
            </SectionTitle>
            <MetricGrid>
              <MetricCard>
                <MetricLabel>Request Queue</MetricLabel>
                <MetricValue>
                  {metrics.api?.requestQueueSize || 0}
                </MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricLabel>Background Queue</MetricLabel>
                <MetricValue>
                  {metrics.api?.backgroundRefreshQueue || 0}
                </MetricValue>
              </MetricCard>
            </MetricGrid>
          </MetricSection>

          {/* Prefetching */}
          <MetricSection>
            <SectionTitle>
              <ArrowPathIcon style={{ width: '16px', height: '16px' }} />
              Data Prefetching
            </SectionTitle>
            <MetricGrid>
              <MetricCard>
                <MetricLabel>Route Transitions</MetricLabel>
                <MetricValue>
                  {metrics.prefetch?.routeTransitions || 0}
                </MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricLabel>Behavior Patterns</MetricLabel>
                <MetricValue>
                  {metrics.prefetch?.behaviorPatterns || 0}
                </MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricLabel>Prefetch Queue</MetricLabel>
                <MetricValue>
                  {metrics.prefetch?.prefetchQueueSize || 0}
                </MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricLabel>Total Predictions</MetricLabel>
                <MetricValue status="good">
                  {metrics.prefetch?.totalPredictions || 0}
                </MetricValue>
              </MetricCard>
            </MetricGrid>
          </MetricSection>

          {/* Image Optimization */}
          <MetricSection>
            <SectionTitle>
              <EyeIcon style={{ width: '16px', height: '16px' }} />
              Image Optimization
            </SectionTitle>
            <MetricGrid>
              <MetricCard>
                <MetricLabel>Cached Images</MetricLabel>
                <MetricValue>
                  {metrics.images?.cachedImages || 0}
                </MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricLabel>Lazy Images</MetricLabel>
                <MetricValue>
                  {metrics.images?.lazyImages || 0}
                </MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricLabel>Loading Images</MetricLabel>
                <MetricValue>
                  {metrics.images?.loadingImages || 0}
                </MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricLabel>WebP Support</MetricLabel>
                <MetricValue status={metrics.images?.webpSupported ? 'good' : 'warning'}>
                  {metrics.images?.webpSupported ? 'Yes' : 'No'}
                </MetricValue>
              </MetricCard>
            </MetricGrid>
          </MetricSection>

          {/* Last Updated */}
          {metrics.lastUpdated && (
            <div style={{ 
              textAlign: 'center', 
              fontSize: '12px', 
              color: '#9ca3af',
              marginTop: '16px'
            }}>
              Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
            </div>
          )}
        </Content>
      </DashboardContainer>
    </>
  );
};

export default PerformanceDashboard;
