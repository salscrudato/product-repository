import styled, { css } from 'styled-components';
import { spin, pulse, shimmer } from '../../styles/animations';

// Re-export shimmer as shine for backward compatibility
const shine = shimmer;

/* ---------- Button Variants - Enhanced with micro-interactions ---------- */
const variants = {
  primary: css`
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: #fff;
    border: none;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2), 0 4px 16px rgba(99, 102, 241, 0.15);

    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #5b5bf6 0%, #7c3aed 100%);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25), 0 8px 24px rgba(99, 102, 241, 0.2);
    }

    &:active:not(:disabled) {
      transform: translateY(0) scale(0.98);
      box-shadow: 0 1px 4px rgba(99, 102, 241, 0.2);
      transition: all 0.1s ease;
    }

    &:focus-visible {
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.35), 0 4px 12px rgba(99, 102, 241, 0.2);
    }
  `,
  secondary: css`
    background: rgba(255, 255, 255, 0.95);
    color: #6366f1;
    border: 1.5px solid rgba(99, 102, 241, 0.2);
    box-shadow: 0 1px 4px rgba(99, 102, 241, 0.08);

    &:hover:not(:disabled) {
      background: rgba(99, 102, 241, 0.06);
      border-color: rgba(99, 102, 241, 0.35);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.12);
    }

    &:active:not(:disabled) {
      transform: translateY(0) scale(0.98);
      background: rgba(99, 102, 241, 0.1);
    }

    &:focus-visible {
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
      border-color: #6366f1;
    }
  `,
  success: css`
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: #fff;
    border: none;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);

    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.25);
    }

    &:active:not(:disabled) {
      transform: translateY(0) scale(0.98);
    }

    &:focus-visible {
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.35);
    }
  `,
  danger: css`
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: #fff;
    border: none;
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.2);

    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(220, 38, 38, 0.25);
    }

    &:active:not(:disabled) {
      transform: translateY(0) scale(0.98);
    }

    &:focus-visible {
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.35);
    }
  `,
  warning: css`
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: #fff;
    border: none;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);

    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(245, 158, 11, 0.25);
    }

    &:active:not(:disabled) {
      transform: translateY(0) scale(0.98);
    }

    &:focus-visible {
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.35);
    }
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.colours.primary};
    border: none;

    &:hover:not(:disabled) {
      background: rgba(99, 102, 241, 0.06);
      transform: translateY(-1px);
    }

    &:active:not(:disabled) {
      background: rgba(99, 102, 241, 0.1);
      transform: scale(0.98);
    }

    &:focus-visible {
      background: rgba(99, 102, 241, 0.06);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
    }
  `,
  outline: css`
    background: transparent;
    color: #6366f1;
    border: 1.5px solid rgba(99, 102, 241, 0.5);

    &:hover:not(:disabled) {
      background: rgba(99, 102, 241, 0.06);
      border-color: #6366f1;
      transform: translateY(-1px);
    }

    &:active:not(:disabled) {
      background: rgba(99, 102, 241, 0.1);
      transform: scale(0.98);
    }

    &:focus-visible {
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }
  `
};

/* ---------- Button Sizes ---------- */
const sizes = {
  xs: css`
    padding: 4px 8px;
    font-size: 12px;
    gap: 4px;
    border-radius: 6px;
    min-height: 28px;
  `,
  sm: css`
    padding: 6px 12px;
    font-size: 13px;
    gap: 6px;
    border-radius: 8px;
    min-height: 32px;
  `,
  md: css`
    padding: 10px 16px;
    font-size: 14px;
    gap: 8px;
    border-radius: 10px;
    min-height: 40px;
  `,
  lg: css`
    padding: 12px 24px;
    font-size: 16px;
    gap: 8px;
    border-radius: 12px;
    min-height: 48px;
  `,
  xl: css`
    padding: 16px 32px;
    font-size: 18px;
    gap: 10px;
    border-radius: 14px;
    min-height: 56px;
  `
};

/* ---------- Button Props Interface ---------- */
interface ButtonProps {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  fullWidth?: boolean;
  isLoading?: boolean;
  iconOnly?: boolean;
}

/* ---------- Loading Spinner Styled Component - Enhanced ---------- */
const LoadingSpinnerIcon = styled.span`
  display: inline-flex;
  width: 1.1em;
  height: 1.1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-top-color: transparent;
  border-radius: 50%;
  animation: ${spin} 0.65s cubic-bezier(0.4, 0, 0.2, 1) infinite;
`;

/* ---------- Main Button Component - Enhanced ---------- */
export const Button = styled.button.withConfig({
  shouldForwardProp: (prop) => !['variant', 'size', 'fullWidth', 'isLoading', 'iconOnly'].includes(prop),
})<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  font-weight: 600;
  white-space: nowrap;
  user-select: none;
  text-decoration: none;
  vertical-align: middle;
  ${({ variant='primary' }) => variants[variant]}
  ${({ size='md' }) => sizes[size]}
  ${({ fullWidth }) => fullWidth && 'width: 100%;'}
  ${({ iconOnly, size='md' }) => iconOnly && css`
    padding: 0;
    width: ${size === 'xs' ? '28px' : size === 'sm' ? '32px' : size === 'lg' ? '48px' : size === 'xl' ? '56px' : '40px'};
    aspect-ratio: 1;
  `}
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
  font-family: ${({ theme }) => theme.font};
  letter-spacing: -0.01em;
  -webkit-tap-highlight-color: transparent;

  /* Loading state - enhanced */
  ${({ isLoading }) => isLoading && css`
    pointer-events: none;
    animation: ${pulse} 1.5s ease-in-out infinite;

    & > *:not(${LoadingSpinnerIcon}) {
      visibility: hidden;
    }
  `}

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none;
    filter: grayscale(0.2);
  }

  svg {
    flex-shrink: 0;
    width: 1.1em;
    height: 1.1em;
    transition: transform 0.15s ease;
  }

  &:hover:not(:disabled) svg {
    transform: scale(1.05);
  }

  /* Subtle shine effect on hover for primary buttons */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.15),
      transparent
    );
    transition: left 0.5s ease;
    pointer-events: none;
  }

  &:hover:not(:disabled)::before {
    left: 200%;
  }

  /* Ripple effect on click - refined */
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    opacity: 0;
    transition: width 0.4s ease, height 0.4s ease, opacity 0.4s ease;
  }

  &:active:not(:disabled)::after {
    width: 250%;
    height: 250%;
    opacity: 0;
    transition: none;
  }
`;

/* ---------- Icon Button - Convenience wrapper ---------- */
export const IconButton = styled(Button).attrs<ButtonProps>({ iconOnly: true })`
  &::before {
    display: none;
  }
`;

/* ---------- Button with Loading State - Enhanced ---------- */
export const ButtonWithLoading = styled(Button)<{ isLoading?: boolean }>`
  ${({ isLoading }) => isLoading && css`
    color: transparent;

    &::before {
      content: '';
      position: absolute;
      width: 1.1em;
      height: 1.1em;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-top-color: transparent;
      border-radius: 50%;
      animation: ${spin} 0.65s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      color: white;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
    }
  `}
`;