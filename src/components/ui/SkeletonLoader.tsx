import React from 'react';
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const SkeletonBase = styled.div<{ 
  $width?: string; 
  $height?: string; 
  $borderRadius?: string;
}>`
  background: linear-gradient(
    90deg,
    #f3f4f6 0%,
    #e5e7eb 50%,
    #f3f4f6 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
  border-radius: ${props => props.$borderRadius || '8px'};
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '20px'};
`;

const SkeletonText = styled(SkeletonBase)`
  height: ${props => props.$height || '16px'};
  margin-bottom: 8px;
`;

const SkeletonCircle = styled(SkeletonBase)`
  border-radius: 50%;
  width: ${props => props.$width || '40px'};
  height: ${props => props.$height || props.$width || '40px'};
`;

const SkeletonCard = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const SkeletonCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
`;

const SkeletonCardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  width, 
  height, 
  borderRadius,
  count = 1 
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonBase 
          key={index}
          $width={width}
          $height={height}
          $borderRadius={borderRadius}
        />
      ))}
    </>
  );
};

export const SkeletonText: React.FC<SkeletonProps> = ({ 
  width, 
  height,
  count = 1 
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonText 
          key={index}
          $width={width}
          $height={height}
        />
      ))}
    </>
  );
};

export const SkeletonCircle: React.FC<SkeletonProps> = ({ 
  width = '40px'
}) => {
  return <SkeletonCircle $width={width} />;
};

interface SkeletonCardProps {
  showAvatar?: boolean;
  lines?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ 
  showAvatar = true,
  lines = 3 
}) => {
  return (
    <SkeletonCard>
      <SkeletonCardHeader>
        {showAvatar && <SkeletonCircle $width="48px" />}
        <div style={{ flex: 1 }}>
          <SkeletonBase $height="20px" $width="60%" />
          <div style={{ marginTop: '8px' }}>
            <SkeletonBase $height="14px" $width="40%" />
          </div>
        </div>
      </SkeletonCardHeader>
      <SkeletonCardContent>
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonBase 
            key={index}
            $height="14px"
            $width={index === lines - 1 ? '70%' : '100%'}
          />
        ))}
      </SkeletonCardContent>
    </SkeletonCard>
  );
};

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({ 
  rows = 5,
  columns = 4 
}) => {
  return (
    <div style={{ 
      background: 'white', 
      borderRadius: '12px', 
      overflow: 'hidden',
      border: '1px solid #e5e7eb'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '16px',
        padding: '16px',
        background: '#f9fafb',
        borderBottom: '1px solid #e5e7eb'
      }}>
        {Array.from({ length: columns }).map((_, index) => (
          <SkeletonBase key={index} $height="16px" $width="80%" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={rowIndex}
          style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: '16px',
            padding: '16px',
            borderBottom: rowIndex < rows - 1 ? '1px solid #e5e7eb' : 'none'
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonBase key={colIndex} $height="14px" $width="90%" />
          ))}
        </div>
      ))}
    </div>
  );
};

interface SkeletonGridProps {
  items?: number;
  columns?: number;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({ 
  items = 6,
  columns = 3 
}) => {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: '24px'
    }}>
      {Array.from({ length: items }).map((_, index) => (
        <SkeletonCard key={index} showAvatar={false} lines={3} />
      ))}
    </div>
  );
};

