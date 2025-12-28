/**
 * Skeleton - Advanced placeholder loading components
 *
 * Features:
 * - Branded shimmer animation with AI-inspired glow
 * - Multiple variants for different content types
 * - Staggered animation delays for visual hierarchy
 * - Accessible loading states
 * - Performance optimized with will-change
 */

import React from 'react';
import styled, { keyframes, css } from 'styled-components';

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
`;

const aiGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 rgba(99, 102, 241, 0);
  }
  50% {
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.1);
  }
`;

interface SkeletonBaseProps {
  $width?: string | undefined;
  $height?: string | undefined;
  $borderRadius?: string | undefined;
  $variant?: 'default' | 'subtle' | 'branded' | undefined;
  $animated?: boolean | undefined;
  $delay?: number | undefined;
}

const getVariantStyles = (variant: string = 'default') => {
  switch (variant) {
    case 'subtle':
      return css`
        background: linear-gradient(
          90deg,
          rgba(241, 245, 249, 0.5) 25%,
          rgba(226, 232, 240, 0.5) 50%,
          rgba(241, 245, 249, 0.5) 75%
        );
      `;
    case 'branded':
      return css`
        background: linear-gradient(
          90deg,
          rgba(99, 102, 241, 0.08) 25%,
          rgba(139, 92, 246, 0.12) 50%,
          rgba(99, 102, 241, 0.08) 75%
        );
        animation: ${shimmer} 1.5s ease-in-out infinite, ${aiGlow} 3s ease-in-out infinite;
      `;
    default:
      return css`
        background: linear-gradient(
          90deg,
          #f1f5f9 25%,
          #e2e8f0 50%,
          #f1f5f9 75%
        );
      `;
  }
};

const SkeletonBase = styled.div<SkeletonBaseProps>`
  ${({ $variant }) => getVariantStyles($variant)}
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
  animation-delay: ${({ $delay = 0 }) => $delay}ms;
  border-radius: ${({ $borderRadius, theme }) => $borderRadius || theme.radiusSm};
  width: ${({ $width }) => $width || '100%'};
  height: ${({ $height }) => $height || '20px'};
  will-change: background-position;

  ${({ $animated = true }) => !$animated && css`
    animation: ${pulse} 2s ease-in-out infinite;
  `}
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
  variant?: 'default' | 'subtle' | 'branded';
  delay?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  borderRadius = '6px',
  className,
  variant = 'default',
  delay = 0
}) => (
  <SkeletonBase
    $width={width}
    $height={height}
    $borderRadius={borderRadius}
    $variant={variant}
    $delay={delay}
    className={className}
    role="status"
    aria-label="Loading"
  />
);

// Product Card Skeleton - matches ProductCard layout
const ProductCardSkeletonWrapper = styled.div`
  padding: 24px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ProductCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const ProductCardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ProductCardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
`;

export const SkeletonProductCard: React.FC<{ index?: number }> = ({ index = 0 }) => (
  <ProductCardSkeletonWrapper role="status" aria-label="Loading product">
    <ProductCardHeader>
      <SkeletonBase
        $width="48px"
        $height="48px"
        $borderRadius="12px"
        $variant="branded"
        $delay={index * 100}
      />
      <div style={{ flex: 1 }}>
        <SkeletonBase $width="70%" $height="20px" $delay={index * 100 + 50} />
        <SkeletonBase $width="40%" $height="14px" style={{ marginTop: 8 }} $delay={index * 100 + 100} />
      </div>
    </ProductCardHeader>
    <ProductCardContent>
      <SkeletonBase $width="100%" $height="14px" $delay={index * 100 + 150} />
      <SkeletonBase $width="85%" $height="14px" $delay={index * 100 + 200} />
    </ProductCardContent>
    <ProductCardFooter>
      <SkeletonBase $width="80px" $height="24px" $borderRadius="12px" $delay={index * 100 + 250} />
      <SkeletonBase $width="100px" $height="32px" $borderRadius="8px" $delay={index * 100 + 300} />
    </ProductCardFooter>
  </ProductCardSkeletonWrapper>
);

// Chat Message Skeleton - for AI chat interfaces
const ChatMessageSkeletonWrapper = styled.div<{ $isUser?: boolean }>`
  display: flex;
  gap: 12px;
  flex-direction: ${({ $isUser }) => $isUser ? 'row-reverse' : 'row'};
  padding: 16px;
`;

const ChatBubble = styled.div<{ $isUser?: boolean }>`
  max-width: 70%;
  padding: 16px 20px;
  background: ${({ $isUser }) => $isUser ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.9)'};
  border-radius: ${({ $isUser }) => $isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px'};
  border: 1px solid rgba(226, 232, 240, 0.5);
`;

export const SkeletonChatMessage: React.FC<{ isUser?: boolean; lines?: number }> = ({
  isUser = false,
  lines = 3
}) => (
  <ChatMessageSkeletonWrapper $isUser={isUser} role="status" aria-label="Loading message">
    <SkeletonBase $width="36px" $height="36px" $borderRadius="50%" $variant="branded" />
    <ChatBubble $isUser={isUser}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase
          key={i}
          $width={i === lines - 1 ? '60%' : '100%'}
          $height="14px"
          $variant={isUser ? 'branded' : 'default'}
          $delay={i * 100}
          style={{ marginBottom: i < lines - 1 ? 8 : 0 }}
        />
      ))}
    </ChatBubble>
  </ChatMessageSkeletonWrapper>
);

// Stats/Metrics Skeleton
const StatsGridSkeleton = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const StatCardSkeleton = styled.div`
  padding: 20px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
`;

export const SkeletonStats: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <StatsGridSkeleton role="status" aria-label="Loading statistics">
    {Array.from({ length: count }).map((_, index) => (
      <StatCardSkeleton key={index}>
        <SkeletonBase $width="100px" $height="12px" $delay={index * 50} />
        <SkeletonBase $width="140px" $height="32px" $variant="branded" style={{ marginTop: 12 }} $delay={index * 50 + 50} />
        <SkeletonBase $width="80px" $height="14px" style={{ marginTop: 8 }} $delay={index * 50 + 100} />
      </StatCardSkeleton>
    ))}
  </StatsGridSkeleton>
);

// Page Header Skeleton
export const SkeletonPageHeader: React.FC = () => (
  <div role="status" aria-label="Loading page header" style={{ marginBottom: 32 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <SkeletonBase $width="48px" $height="48px" $borderRadius="12px" $variant="branded" />
      <div style={{ flex: 1 }}>
        <SkeletonBase $width="300px" $height="32px" />
        <SkeletonBase $width="200px" $height="16px" style={{ marginTop: 8 }} $delay={100} />
      </div>
      <SkeletonBase $width="140px" $height="40px" $borderRadius="10px" $delay={200} />
    </div>
  </div>
);

// Navigation Skeleton
export const SkeletonNavigation: React.FC = () => (
  <div
    role="status"
    aria-label="Loading navigation"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '12px 24px',
      background: 'rgba(255, 255, 255, 0.9)',
      borderBottom: '1px solid rgba(226, 232, 240, 0.8)'
    }}
  >
    {Array.from({ length: 6 }).map((_, index) => (
      <SkeletonBase
        key={index}
        $width="80px"
        $height="32px"
        $borderRadius="8px"
        $delay={index * 50}
      />
    ))}
    <div style={{ marginLeft: 'auto' }}>
      <SkeletonBase $width="120px" $height="36px" $borderRadius="10px" $delay={350} />
    </div>
  </div>
);

export default Skeleton;
