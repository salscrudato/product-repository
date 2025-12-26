/**
 * Badge - Unified badge/chip component with design token integration
 * 
 * Provides consistent status indicators and labels across the application
 * with proper color coding and accessibility.
 */

import React from 'react';
import styled, { css } from 'styled-components';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'small' | 'medium' | 'large';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
  icon?: React.ReactNode;
}

const getVariantStyles = (variant: BadgeVariant) => {
  switch (variant) {
    case 'primary':
      return css`
        background: ${({ theme }) => theme.colours.primaryLighter};
        color: ${({ theme }) => theme.colours.primary};
        border-color: ${({ theme }) => theme.colours.primaryLight};
      `;
    case 'success':
      return css`
        background: ${({ theme }) => theme.colours.successLighter};
        color: ${({ theme }) => theme.colours.successDark};
        border-color: ${({ theme }) => theme.colours.successLight};
      `;
    case 'warning':
      return css`
        background: ${({ theme }) => theme.colours.warningLighter};
        color: ${({ theme }) => theme.colours.warningDark};
        border-color: ${({ theme }) => theme.colours.warningLight};
      `;
    case 'error':
      return css`
        background: ${({ theme }) => theme.colours.errorLighter};
        color: ${({ theme }) => theme.colours.errorDark};
        border-color: ${({ theme }) => theme.colours.errorLight};
      `;
    case 'info':
      return css`
        background: ${({ theme }) => theme.colours.infoLighter};
        color: ${({ theme }) => theme.colours.infoDark};
        border-color: ${({ theme }) => theme.colours.infoLight};
      `;
    default:
      return css`
        background: ${({ theme }) => theme.colours.backgroundSubtle};
        color: ${({ theme }) => theme.colours.textSecondary};
        border-color: ${({ theme }) => theme.colours.border};
      `;
  }
};

const getSizeStyles = (size: BadgeSize) => {
  switch (size) {
    case 'small':
      return css`
        padding: 2px 8px;
        font-size: 11px;
      `;
    case 'large':
      return css`
        padding: 6px 14px;
        font-size: 14px;
      `;
    default:
      return css`
        padding: 4px 10px;
        font-size: 12px;
      `;
  }
};

const StyledBadge = styled.span<{ $variant: BadgeVariant; $size: BadgeSize }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  border-radius: 9999px;
  border: 1px solid transparent;
  white-space: nowrap;
  font-family: ${({ theme }) => theme.fontFamily};
  ${({ $variant }) => getVariantStyles($variant)}
  ${({ $size }) => getSizeStyles($size)}
`;

const Dot = styled.span<{ $variant: BadgeVariant }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
`;

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'medium',
  children,
  className,
  dot,
  icon
}) => (
  <StyledBadge $variant={variant} $size={size} className={className}>
    {dot && <Dot $variant={variant} />}
    {icon && <span style={{ display: 'flex' }}>{icon}</span>}
    {children}
  </StyledBadge>
);

// Status-specific badges for common use cases
export const StatusBadge: React.FC<{
  status: 'active' | 'inactive' | 'pending' | 'error' | 'draft';
  children?: React.ReactNode;
}> = ({ status, children }) => {
  const variantMap: Record<typeof status, BadgeVariant> = {
    active: 'success',
    inactive: 'default',
    pending: 'warning',
    error: 'error',
    draft: 'info'
  };

  const labelMap: Record<typeof status, string> = {
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    error: 'Error',
    draft: 'Draft'
  };

  return (
    <Badge variant={variantMap[status]} dot>
      {children || labelMap[status]}
    </Badge>
  );
};

// Count badge for notifications
export const CountBadge = styled.span<{ $variant?: BadgeVariant }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  background: ${({ theme, $variant }) => 
    $variant === 'error' ? theme.colours.error : theme.colours.primary};
  color: white;
  font-family: ${({ theme }) => theme.fontFamily};
`;

export default Badge;

