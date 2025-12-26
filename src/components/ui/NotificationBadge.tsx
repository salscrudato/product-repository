/**
 * NotificationBadge - Unread count indicator component
 * 
 * Displays a badge with count for notifications, messages, or other
 * countable items. Supports various positions and sizes.
 */

import React from 'react';
import styled, { keyframes, css } from 'styled-components';

// ============ Animations ============
const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
`;

const pop = keyframes`
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
`;

// ============ Types ============
interface NotificationBadgeProps {
  /** The count to display */
  count?: number;
  /** Maximum count before showing "+" */
  maxCount?: number;
  /** Show dot instead of count */
  dot?: boolean;
  /** Badge color variant */
  variant?: 'primary' | 'error' | 'warning' | 'success';
  /** Badge size */
  size?: 'sm' | 'md' | 'lg';
  /** Position relative to parent */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Show pulse animation */
  pulse?: boolean;
  /** Offset from corner */
  offset?: number;
  /** Children to wrap */
  children?: React.ReactNode;
  /** Additional class name */
  className?: string;
}

// ============ Styled Components ============
const BadgeWrapper = styled.div`
  position: relative;
  display: inline-flex;
`;

const Badge = styled.span<{
  $variant: string;
  $size: string;
  $position: string;
  $isDot: boolean;
  $pulse: boolean;
  $offset: number;
  $hasCount: boolean;
}>`
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-family: ${({ theme }) => theme.font};
  border-radius: ${({ theme }) => theme.radiusFull};
  border: 2px solid ${({ theme }) => theme.colours.background};
  animation: ${pop} 0.3s ease;
  z-index: 1;
  
  /* Variant colors */
  ${({ $variant, theme }) => {
    switch ($variant) {
      case 'error': return css`background: ${theme.colours.error}; color: ${theme.colours.textInverse};`;
      case 'warning': return css`background: ${theme.colours.warning}; color: ${theme.colours.text};`;
      case 'success': return css`background: ${theme.colours.success}; color: ${theme.colours.textInverse};`;
      default: return css`background: ${theme.colours.primary}; color: ${theme.colours.textInverse};`;
    }
  }}
  
  /* Size */
  ${({ $size, $isDot }) => {
    if ($isDot) {
      switch ($size) {
        case 'sm': return css`width: 8px; height: 8px;`;
        case 'lg': return css`width: 14px; height: 14px;`;
        default: return css`width: 10px; height: 10px;`;
      }
    }
    switch ($size) {
      case 'sm': return css`min-width: 16px; height: 16px; font-size: 10px; padding: 0 4px;`;
      case 'lg': return css`min-width: 24px; height: 24px; font-size: 13px; padding: 0 6px;`;
      default: return css`min-width: 20px; height: 20px; font-size: 11px; padding: 0 5px;`;
    }
  }}
  
  /* Position */
  ${({ $position, $offset }) => {
    const o = $offset;
    switch ($position) {
      case 'top-left': return css`top: -${o}px; left: -${o}px;`;
      case 'bottom-right': return css`bottom: -${o}px; right: -${o}px;`;
      case 'bottom-left': return css`bottom: -${o}px; left: -${o}px;`;
      default: return css`top: -${o}px; right: -${o}px;`;
    }
  }}
  
  /* Pulse animation */
  ${({ $pulse }) => $pulse && css`
    animation: ${pulse} 2s ease-in-out infinite;
  `}
  
  /* Hide when no count and not dot */
  ${({ $hasCount, $isDot }) => !$hasCount && !$isDot && css`
    display: none;
  `}
`;

const StandaloneBadge = styled(Badge)`
  position: relative;
  top: auto;
  right: auto;
  bottom: auto;
  left: auto;
`;

// ============ Component ============
export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count = 0,
  maxCount = 99,
  dot = false,
  variant = 'error',
  size = 'md',
  position = 'top-right',
  pulse: shouldPulse = false,
  offset = 4,
  children,
  className,
}) => {
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  const hasCount = count > 0;
  
  // Standalone badge (no children)
  if (!children) {
    return (
      <StandaloneBadge
        $variant={variant}
        $size={size}
        $position={position}
        $isDot={dot}
        $pulse={shouldPulse && hasCount}
        $offset={offset}
        $hasCount={hasCount}
        className={className}
        role="status"
        aria-label={dot ? 'New notification' : `${count} notifications`}
      >
        {!dot && displayCount}
      </StandaloneBadge>
    );
  }
  
  return (
    <BadgeWrapper className={className}>
      {children}
      <Badge
        $variant={variant}
        $size={size}
        $position={position}
        $isDot={dot}
        $pulse={shouldPulse && hasCount}
        $offset={offset}
        $hasCount={hasCount}
        role="status"
        aria-label={dot ? 'New notification' : `${count} notifications`}
      >
        {!dot && displayCount}
      </Badge>
    </BadgeWrapper>
  );
};

export default NotificationBadge;

