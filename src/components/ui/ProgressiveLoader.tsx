// src/components/ui/ProgressiveLoader.js
/**
 * Progressive Loading System with Intelligent Skeleton States
 * Provides smooth loading experiences with adaptive skeleton screens
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';

// Skeleton animation
const shimmer = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`;

// Base skeleton styles
const SkeletonBase = styled.div`
  background: ${({ theme }) => theme.isDarkMode 
    ? 'linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%)'
    : 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)'
  };
  background-size: 200px 100%;
  animation: ${shimmer} 1.2s ease-in-out infinite;
  border-radius: 4px;
`;

// Skeleton components
const SkeletonText = styled(SkeletonBase)`
  height: ${props => props.height || '16px'};
  width: ${props => props.width || '100%'};
  margin: ${props => props.margin || '4px 0'};
`;

const SkeletonCard = styled(SkeletonBase)`
  height: ${props => props.height || '200px'};
  width: ${props => props.width || '100%'};
  margin: ${props => props.margin || '8px 0'};
  border-radius: 8px;
`;

const SkeletonCircle = styled(SkeletonBase)`
  width: ${props => props.size || '40px'};
  height: ${props => props.size || '40px'};
  border-radius: 50%;
`;

const SkeletonButton = styled(SkeletonBase)`
  height: ${props => props.height || '36px'};
  width: ${props => props.width || '120px'};
  border-radius: 6px;
`;

// Progressive loader container
const LoaderContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => !['fadeIn'].includes(prop)
})`
  position: relative;
  min-height: ${props => props.minHeight || 'auto'};

  ${props => props.fadeIn && css`
    opacity: 0;
    animation: fadeIn 0.3s ease-in-out forwards;

    @keyframes fadeIn {
      to {
        opacity: 1;
      }
    }
  `}
`;

// Content wrapper with transition
const ContentWrapper = styled.div.withConfig({
  shouldForwardProp: (prop) => !['show'].includes(prop)
})`
  transition: opacity 0.3s ease-in-out;
  opacity: ${props => props.show ? 1 : 0};

  ${props => !props.show && css`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    pointer-events: none;
  `}
`;

// Skeleton templates for different content types
const SkeletonTemplates = {
  card: ({ count = 1, height = '200px' }) => (
    <>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} height={height} margin="16px 0" />
      ))}
    </>
  ),
  
  list: ({ count = 5, showAvatar = false }) => (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', margin: '12px 0' }}>
          {showAvatar && <SkeletonCircle size="40px" style={{ marginRight: '12px' }} />}
          <div style={{ flex: 1 }}>
            <SkeletonText height="16px" width="80%" />
            <SkeletonText height="12px" width="60%" />
          </div>
        </div>
      ))}
    </>
  ),
  
  table: ({ rows = 5, columns = 4 }) => (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        {Array.from({ length: columns }, (_, i) => (
          <SkeletonText key={i} height="20px" width="100px" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} style={{ display: 'flex', gap: '16px', margin: '8px 0' }}>
          {Array.from({ length: columns }, (_, colIndex) => (
            <SkeletonText key={colIndex} height="16px" width="80px" />
          ))}
        </div>
      ))}
    </div>
  ),
  
  form: ({ fields = 3 }) => (
    <>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} style={{ margin: '16px 0' }}>
          <SkeletonText height="14px" width="100px" margin="0 0 8px 0" />
          <SkeletonText height="40px" width="100%" />
        </div>
      ))}
      <SkeletonButton height="40px" width="120px" style={{ marginTop: '16px' }} />
    </>
  ),
  
  profile: () => (
    <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0' }}>
      <SkeletonCircle size="80px" style={{ marginRight: '16px' }} />
      <div style={{ flex: 1 }}>
        <SkeletonText height="24px" width="200px" />
        <SkeletonText height="16px" width="150px" />
        <SkeletonText height="14px" width="100px" />
      </div>
    </div>
  ),
  
  dashboard: () => (
    <>
      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} height="120px" />
        ))}
      </div>
      {/* Chart area */}
      <SkeletonCard height="300px" margin="0 0 24px 0" />
      {/* Table */}
      <SkeletonTemplates.table rows={6} columns={5} />
    </>
  )
};

// Main Progressive Loader component
export const ProgressiveLoader = ({
  loading = true,
  children,
  skeleton = 'card',
  skeletonProps = {},
  minLoadTime = 500,
  fadeIn = true,
  minHeight,
  onLoadComplete,
  loadingStages = [],
  currentStage = 0
}) => {
  const [showContent, setShowContent] = useState(!loading);
  const [internalLoading, setInternalLoading] = useState(loading);
  const loadStartTime = useRef(Date.now());
  const hasCompletedRef = useRef(false);

  // Handle loading state changes with minimum load time
  useEffect(() => {
    if (!loading && internalLoading) {
      const elapsed = Date.now() - loadStartTime.current;
      const remainingTime = Math.max(0, minLoadTime - elapsed);
      
      setTimeout(() => {
        setInternalLoading(false);
        setShowContent(true);
        
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onLoadComplete?.();
        }
      }, remainingTime);
    } else if (loading && !internalLoading) {
      loadStartTime.current = Date.now();
      setInternalLoading(true);
      setShowContent(false);
      hasCompletedRef.current = false;
    }
  }, [loading, internalLoading, minLoadTime, onLoadComplete]);

  // Render skeleton based on type
  const renderSkeleton = useMemo(() => {
    if (typeof skeleton === 'string' && SkeletonTemplates[skeleton]) {
      return SkeletonTemplates[skeleton](skeletonProps);
    } else if (typeof skeleton === 'function') {
      return skeleton(skeletonProps);
    } else if (React.isValidElement(skeleton)) {
      return skeleton;
    }
    
    // Default skeleton
    return <SkeletonCard {...skeletonProps} />;
  }, [skeleton, skeletonProps]);

  // Render loading stages if provided
  const renderLoadingStages = () => {
    if (loadingStages.length === 0) return null;
    
    return (
      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px'
        }}>
          {loadingStages.map((stage, index) => (
            <div
              key={index}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: index <= currentStage ? '#6366f1' : '#e5e7eb',
                transition: 'background-color 0.3s ease'
              }}
            />
          ))}
        </div>
        <div style={{ 
          fontSize: '14px', 
          color: '#6b7280',
          fontWeight: '500'
        }}>
          {loadingStages[currentStage] || 'Loading...'}
        </div>
      </div>
    );
  };

  return (
    <LoaderContainer minHeight={minHeight} fadeIn={fadeIn}>
      {/* Skeleton/Loading State */}
      <ContentWrapper show={internalLoading}>
        {renderSkeleton}
        {renderLoadingStages()}
      </ContentWrapper>
      
      {/* Actual Content */}
      <ContentWrapper show={showContent}>
        {children}
      </ContentWrapper>
    </LoaderContainer>
  );
};

// Specialized loaders for common use cases
export const CardLoader = ({ loading, children, count = 1, height = '200px' }) => (
  <ProgressiveLoader
    loading={loading}
    skeleton="card"
    skeletonProps={{ count, height }}
  >
    {children}
  </ProgressiveLoader>
);

export const ListLoader = ({ loading, children, count = 5, showAvatar = false }) => (
  <ProgressiveLoader
    loading={loading}
    skeleton="list"
    skeletonProps={{ count, showAvatar }}
  >
    {children}
  </ProgressiveLoader>
);

export const TableLoader = ({ loading, children, rows = 5, columns = 4 }) => (
  <ProgressiveLoader
    loading={loading}
    skeleton="table"
    skeletonProps={{ rows, columns }}
  >
    {children}
  </ProgressiveLoader>
);

export const FormLoader = ({ loading, children, fields = 3 }) => (
  <ProgressiveLoader
    loading={loading}
    skeleton="form"
    skeletonProps={{ fields }}
  >
    {children}
  </ProgressiveLoader>
);

export const DashboardLoader = ({ loading, children }) => (
  <ProgressiveLoader
    loading={loading}
    skeleton="dashboard"
    minLoadTime={800}
  >
    {children}
  </ProgressiveLoader>
);

// Hook for managing progressive loading states
export const useProgressiveLoading = (asyncOperation, dependencies = []) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef();

  useEffect(() => {
    let isMounted = true;
    
    const executeOperation = async () => {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);
        
        // Abort previous operation
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();
        
        const result = await asyncOperation({
          signal: abortControllerRef.current.signal,
          onProgress: (progress) => {
            if (isMounted) setProgress(progress);
          }
        });
        
        if (isMounted) {
          setData(result);
          setProgress(100);
        }
      } catch (err) {
        if (isMounted && err.name !== 'AbortError') {
          setError(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    executeOperation();

    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, dependencies);

  return { loading, data, error, progress };
};

// Skeleton component exports
export {
  SkeletonText,
  SkeletonCard,
  SkeletonCircle,
  SkeletonButton,
  SkeletonTemplates
};
