/**
 * DesignSystem - Shared design tokens and components
 *
 * Provides consistent styling across all pages with:
 * - Color system
 * - Shared styled components
 * - Statistics dashboard components
 * - Enhanced modal components
 *
 * NOTE: Animations are imported from '@/styles/animations.ts' (single source of truth)
 */

import styled, { css } from 'styled-components';

// ============ Animation Keyframes (re-exported from centralized animations.ts) ============
// Import from the single source of truth
import {
  fadeInUp,
  fadeIn,
  scaleIn,
  slideDown,
  slideUp,
  pulse,
  shimmer,
  spin,
  ripple,
  glow
} from '@/styles/animations';
import { theme } from '@/styles/theme';

// Re-export for backward compatibility
export {
  fadeInUp,
  fadeIn,
  scaleIn,
  slideDown,
  slideUp,
  pulse,
  shimmer,
  spin,
  ripple,
  glow
};

// ============ Color System (derived from theme.ts - single source of truth) ============
// This maintains backward compatibility for components that import `colors` from DesignSystem
// All color values come from theme.ts

export const colors = {
  // Primary colors
  primary: theme.colours.primary,
  primaryDark: theme.colours.primaryDark,
  primaryLight: theme.colours.primaryLight,
  secondary: '#8b5cf6', // Extended - not in theme.colours

  // Semantic colors
  success: theme.colours.success,
  successDark: theme.colours.successDark,
  warning: theme.colours.warning,
  warningDark: theme.colours.warningDark,
  error: theme.colours.error,
  errorDark: theme.colours.errorDark,
  info: theme.colours.info,
  infoDark: theme.colours.infoDark,

  // Gray scale (mapped from theme)
  gray50: theme.colours.backgroundAlt,  // #f8fafc
  gray100: theme.colours.backgroundSubtle, // #f1f5f9
  gray200: theme.colours.border, // #e2e8f0
  gray300: '#cbd5e1', // Extended
  gray400: '#94a3b8', // Extended
  gray500: theme.colours.textMuted, // #64748b
  gray600: theme.colours.textSecondary, // #475569
  gray700: '#334155', // Extended
  gray800: theme.colours.secondaryText, // #1e293b
  gray900: theme.colours.text, // #0f172a
} as const;

// Gradients derived from theme
export const gradients = {
  primary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  success: `linear-gradient(135deg, ${theme.colours.success} 0%, ${theme.colours.successDark} 100%)`,
  warning: `linear-gradient(135deg, ${theme.colours.warning} 0%, ${theme.colours.warningDark} 100%)`,
  info: `linear-gradient(135deg, ${theme.colours.info} 0%, ${theme.colours.infoDark} 100%)`,
  error: `linear-gradient(135deg, ${theme.colours.error} 0%, ${theme.colours.errorDark} 100%)`,
  background: `linear-gradient(135deg, ${theme.colours.backgroundAlt} 0%, ${theme.colours.border} 50%, ${theme.colours.backgroundSubtle} 100%)`,
} as const;

// ============ Statistics Dashboard ============

export const StatsDashboard = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
  animation: ${fadeInUp} 0.4s ease-out;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
`;

export const StatCard = styled.div<{ $color?: string; $clickable?: boolean }>`
  background: white;
  border-radius: 16px;
  padding: 20px 24px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  ${({ $clickable }) => $clickable && 'cursor: pointer;'}

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${({ $color }) => $color || gradients.primary};
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
    border-color: rgba(99, 102, 241, 0.3);
  }
`;

export const StatValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: ${colors.gray800};
  letter-spacing: -0.02em;
  line-height: 1.2;
`;

export const StatLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: ${colors.gray500};
  margin-top: 4px;

  svg {
    width: 14px;
    height: 14px;
    opacity: 0.7;
  }
`;

// ============ Enhanced Card Components ============

export const EnhancedCard = styled.div<{ $variant?: 'default' | 'elevated' | 'outlined'; $delay?: number }>`
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: ${({ $variant }) =>
    $variant === 'elevated'
      ? '0 8px 24px rgba(0, 0, 0, 0.08)'
      : '0 4px 16px rgba(0, 0, 0, 0.04)'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: ${fadeInUp} 0.35s ease-out backwards;
  animation-delay: ${({ $delay }) => ($delay || 0) * 0.05}s;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(99, 102, 241, 0.12);
    border-color: rgba(99, 102, 241, 0.4);
  }
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
`;

export const CardTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${colors.gray800};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const CardSubtitle = styled.p`
  font-size: 14px;
  color: ${colors.gray500};
  margin: 4px 0 0 0;
`;

export const CardContent = styled.div`
  flex: 1;
`;

export const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
`;

export const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

// ============ Icon Button ============

export const IconButton = styled.button<{ $variant?: 'default' | 'ghost' | 'danger' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ $variant }) => {
    switch ($variant) {
      case 'danger':
        return css`
          background: rgba(239, 68, 68, 0.1);
          color: ${colors.error};
          &:hover {
            background: rgba(239, 68, 68, 0.2);
            transform: scale(1.05);
          }
        `;
      case 'ghost':
        return css`
          background: transparent;
          color: ${colors.gray500};
          &:hover {
            background: rgba(99, 102, 241, 0.1);
            color: ${colors.primary};
          }
        `;
      default:
        return css`
          background: rgba(99, 102, 241, 0.1);
          color: ${colors.primary};
          &:hover {
            background: rgba(99, 102, 241, 0.2);
            transform: scale(1.05);
          }
        `;
    }
  }}

  svg {
    width: 18px;
    height: 18px;
  }

  &:active {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

// ============ Badge Components ============

export const TypeBadge = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
  background: ${({ $color }) => $color ? `${$color}15` : 'rgba(99, 102, 241, 0.1)'};
  color: ${({ $color }) => $color || colors.primary};
  border: 1px solid ${({ $color }) => $color ? `${$color}30` : 'rgba(99, 102, 241, 0.2)'};

  svg {
    width: 14px;
    height: 14px;
  }
`;

export const CountBadge = styled.span<{ $variant?: 'default' | 'success' | 'warning' | 'error' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;

  ${({ $variant }) => {
    switch ($variant) {
      case 'success':
        return css`
          background: rgba(16, 185, 129, 0.15);
          color: ${colors.successDark};
        `;
      case 'warning':
        return css`
          background: rgba(245, 158, 11, 0.15);
          color: ${colors.warningDark};
        `;
      case 'error':
        return css`
          background: rgba(239, 68, 68, 0.15);
          color: ${colors.errorDark};
        `;
      default:
        return css`
          background: rgba(100, 116, 139, 0.1);
          color: ${colors.gray600};
        `;
    }
  }}
`;

// ============ Empty State ============

export const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  text-align: center;
  animation: ${fadeIn} 0.5s ease-out;
`;

export const EmptyStateIcon = styled.div<{ $color?: string }>`
  width: 80px;
  height: 80px;
  border-radius: 24px;
  background: ${({ $color }) => $color ? `${$color}10` : 'rgba(99, 102, 241, 0.1)'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;

  svg {
    width: 40px;
    height: 40px;
    color: ${({ $color }) => $color || colors.primary};
    opacity: 0.8;
  }
`;

export const EmptyStateTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: ${colors.gray800};
  margin: 0 0 8px 0;
`;

export const EmptyStateDescription = styled.p`
  font-size: 15px;
  color: ${colors.gray500};
  margin: 0 0 24px 0;
  max-width: 400px;
  line-height: 1.5;
`;

// ============ Loading Components ============
// Note: For LoadingSpinner component, use '@/components/ui/LoadingSpinner' instead
// This provides multiple variants (circular, dots, bars, ring) and proper accessibility

export const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
`;

export const LoadingText = styled.span`
  font-size: 14px;
  color: ${colors.gray500};
  font-weight: 500;
`;

// ============ Action Bar for Bulk Operations ============

export const ActionBar = styled.div<{ $visible?: boolean }>`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) ${({ $visible }) => $visible ? 'translateY(0)' : 'translateY(100px)'};
  background: white;
  border-radius: 16px;
  padding: 12px 20px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.2);
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 100;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  pointer-events: ${({ $visible }) => $visible ? 'auto' : 'none'};
`;

// ============ Quick Amount Buttons ============

export const QuickAmountContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`;

export const QuickAmountButton = styled.button<{ $active?: boolean }>`
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  border: 1.5px solid ${({ $active }) => $active ? colors.primary : colors.gray200};
  background: ${({ $active }) => $active ? 'rgba(99, 102, 241, 0.1)' : 'white'};
  color: ${({ $active }) => $active ? colors.primary : colors.gray600};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${colors.primary};
    background: rgba(99, 102, 241, 0.05);
  }
`;

// ============ Section Header ============

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

export const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: ${colors.gray800};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

// ============ Gradient Bar ============

export const GradientBar = styled.div<{ $gradient?: string }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: ${({ $gradient }) => $gradient || gradients.primary};
  border-radius: 16px 16px 0 0;
`;

// ============ Filter Bar ============

export const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  margin-bottom: 24px;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

export const FilterSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 8px;
  background: white;
  font-size: 13px;
  font-weight: 500;
  color: ${colors.gray700};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${colors.primary};
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
  }

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

// ============ Command Bar (Apple-inspired) ============

export const CommandBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 32px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 4px 12px rgba(0, 0, 0, 0.03),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
  position: relative;
`;

