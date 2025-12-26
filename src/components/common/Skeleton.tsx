/**
 * Skeleton - Placeholder loading components that match content layout
 * 
 * Provides skeleton variants for different content types to create
 * a more polished loading experience than generic spinners.
 */

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

interface SkeletonBaseProps {
  $width?: string;
  $height?: string;
  $borderRadius?: string;
}

const SkeletonBase = styled.div<SkeletonBaseProps>`
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colours.backgroundSubtle} 25%,
    ${({ theme }) => theme.colours.backgroundAlt} 50%,
    ${({ theme }) => theme.colours.backgroundSubtle} 75%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
  border-radius: ${({ $borderRadius, theme }) => $borderRadius || theme.radiusSm};
  width: ${({ $width }) => $width || '100%'};
  height: ${({ $height }) => $height || '20px'};
`;

// Basic skeleton variants
export const SkeletonText = styled(SkeletonBase)`
  height: 16px;
  margin-bottom: 8px;
  
  &:last-child {
    width: 70%;
  }
`;

export const SkeletonHeading = styled(SkeletonBase)`
  height: 28px;
  width: 60%;
  margin-bottom: 16px;
`;

export const SkeletonAvatar = styled(SkeletonBase)`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
`;

export const SkeletonButton = styled(SkeletonBase)`
  width: 120px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radiusMd};
`;

export const SkeletonCard = styled.div`
  padding: 20px;
  background: ${({ theme }) => theme.colours.background};
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: ${({ theme }) => theme.radiusMd};
`;

// Table skeleton
const TableSkeletonWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TableRowSkeleton = styled.div`
  display: flex;
  gap: 16px;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colours.background};
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: ${({ theme }) => theme.radiusSm};
`;

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({ rows = 5, columns = 4 }) => (
  <TableSkeletonWrapper role="status" aria-label="Loading table data">
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <TableRowSkeleton key={rowIndex}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <SkeletonBase
            key={colIndex}
            $width={colIndex === 0 ? '30%' : `${70 / (columns - 1)}%`}
            $height="16px"
          />
        ))}
      </TableRowSkeleton>
    ))}
  </TableSkeletonWrapper>
);

// Card list skeleton
const CardListWrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
`;

interface SkeletonCardListProps {
  count?: number;
}

export const SkeletonCardList: React.FC<SkeletonCardListProps> = ({ count = 6 }) => (
  <CardListWrapper role="status" aria-label="Loading cards">
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCard key={index}>
        <SkeletonHeading />
        <SkeletonText />
        <SkeletonText />
        <SkeletonText />
      </SkeletonCard>
    ))}
  </CardListWrapper>
);

// Form skeleton
export const SkeletonForm: React.FC<{ fields?: number }> = ({ fields = 4 }) => (
  <div role="status" aria-label="Loading form" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    {Array.from({ length: fields }).map((_, index) => (
      <div key={index}>
        <SkeletonBase $width="120px" $height="14px" style={{ marginBottom: '8px' }} />
        <SkeletonBase $width="100%" $height="40px" $borderRadius="8px" />
      </div>
    ))}
    <SkeletonButton style={{ marginTop: '8px' }} />
  </div>
);

// Generic configurable skeleton
interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width, height, borderRadius, className }) => (
  <SkeletonBase
    $width={width}
    $height={height}
    $borderRadius={borderRadius}
    className={className}
    role="status"
    aria-label="Loading"
  />
);

export default Skeleton;

