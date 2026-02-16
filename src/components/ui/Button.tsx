import styled, { css } from 'styled-components';
import { spin, pulse } from '../../styles/animations';
import {
  color, neutral, accent, semantic,
  space, radius, fontFamily,
  type as typeScale, transition, duration, easing,
  focusRingStyle, reducedMotion,
} from '../../ui/tokens';

/* ---------- Button Variants – Apple-flat, token-driven ---------- */
const variants = {
  primary: css`
    background: ${accent[500]};
    color: ${color.textInverse};
    border: 1px solid transparent;

    &:hover:not(:disabled) {
      background: ${accent[600]};
    }

    &:active:not(:disabled) {
      background: ${accent[700]};
      transform: scale(0.98);
      transition: all ${duration.instant} ${easing.default};
    }

    &:focus-visible {
      ${focusRingStyle}
    }
  `,
  secondary: css`
    background: ${neutral[0]};
    color: ${color.text};
    border: 1px solid ${neutral[200]};

    &:hover:not(:disabled) {
      background: ${neutral[50]};
      border-color: ${neutral[300]};
    }

    &:active:not(:disabled) {
      background: ${neutral[100]};
      transform: scale(0.98);
      transition: all ${duration.instant} ${easing.default};
    }

    &:focus-visible {
      ${focusRingStyle}
    }
  `,
  ghost: css`
    background: transparent;
    color: ${accent[500]};
    border: 1px solid transparent;

    &:hover:not(:disabled) {
      background: ${accent[50]};
    }

    &:active:not(:disabled) {
      background: ${accent[100]};
      transform: scale(0.98);
      transition: all ${duration.instant} ${easing.default};
    }

    &:focus-visible {
      ${focusRingStyle}
    }
  `,
  danger: css`
    background: ${semantic.error};
    color: ${color.textInverse};
    border: 1px solid transparent;

    &:hover:not(:disabled) {
      background: ${semantic.errorDark};
    }

    &:active:not(:disabled) {
      background: #b91c1c;
      transform: scale(0.98);
      transition: all ${duration.instant} ${easing.default};
    }

    &:focus-visible {
      outline: 2px solid ${semantic.error};
      outline-offset: 2px;
    }
  `,
  success: css`
    background: ${semantic.success};
    color: ${color.textInverse};
    border: 1px solid transparent;

    &:hover:not(:disabled) {
      background: ${semantic.successDark};
    }

    &:active:not(:disabled) {
      background: #047857;
      transform: scale(0.98);
      transition: all ${duration.instant} ${easing.default};
    }

    &:focus-visible {
      outline: 2px solid ${semantic.success};
      outline-offset: 2px;
    }
  `,
  warning: css`
    background: ${semantic.warning};
    color: ${color.textInverse};
    border: 1px solid transparent;

    &:hover:not(:disabled) {
      background: ${semantic.warningDark};
    }

    &:active:not(:disabled) {
      background: #b45309;
      transform: scale(0.98);
      transition: all ${duration.instant} ${easing.default};
    }

    &:focus-visible {
      outline: 2px solid ${semantic.warning};
      outline-offset: 2px;
    }
  `,
  outline: css`
    background: transparent;
    color: ${accent[500]};
    border: 1px solid ${accent[200]};

    &:hover:not(:disabled) {
      background: ${accent[50]};
      border-color: ${accent[500]};
    }

    &:active:not(:disabled) {
      background: ${accent[100]};
      transform: scale(0.98);
      transition: all ${duration.instant} ${easing.default};
    }

    &:focus-visible {
      ${focusRingStyle}
    }
  `,
};

/* ---------- Button Sizes (sm 32 / md 36 / lg 40) ---------- */
const sizes = {
  xs: css`
    padding: ${space[1]} ${space[2]};
    font-size: ${typeScale.captionSm.size};
    gap: ${space[1]};
    border-radius: ${radius.sm};
    min-height: 28px;
  `,
  sm: css`
    padding: ${space[1.5]} ${space[3]};
    font-size: ${typeScale.labelSm.size};
    gap: ${space[1.5]};
    border-radius: ${radius.sm};
    min-height: 32px;
  `,
  md: css`
    padding: ${space[2]} ${space[4]};
    font-size: ${typeScale.label.size};
    gap: ${space[2]};
    border-radius: ${radius.md};
    min-height: 36px;
  `,
  lg: css`
    padding: ${space[2.5]} ${space[5]};
    font-size: ${typeScale.bodySm.size};
    gap: ${space[2]};
    border-radius: ${radius.md};
    min-height: 40px;
  `,
  xl: css`
    padding: ${space[3]} ${space[6]};
    font-size: ${typeScale.bodyLg.size};
    gap: ${space[2.5]};
    border-radius: ${radius.lg};
    min-height: 48px;
  `,
};

/* ---------- Button Props Interface ---------- */
interface ButtonProps {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  fullWidth?: boolean;
  isLoading?: boolean;
  iconOnly?: boolean;
}

/* ---------- Loading Spinner ---------- */
const LoadingSpinnerIcon = styled.span`
  display: inline-flex;
  width: 1.1em;
  height: 1.1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-top-color: transparent;
  border-radius: 50%;
  animation: ${spin} 0.65s ${easing.default} infinite;
`;

/* ---------- Main Button Component ---------- */
export const Button = styled.button.withConfig({
  shouldForwardProp: (prop) => !['variant', 'size', 'fullWidth', 'isLoading', 'iconOnly'].includes(prop),
})<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  font-weight: ${typeScale.label.weight};
  font-family: ${fontFamily.sans};
  letter-spacing: ${typeScale.label.letterSpacing};
  white-space: nowrap;
  user-select: none;
  text-decoration: none;
  vertical-align: middle;
  position: relative;
  -webkit-tap-highlight-color: transparent;
  transition: background-color ${transition.fast},
              border-color ${transition.fast},
              color ${transition.fast},
              transform ${duration.fast} ${easing.default},
              box-shadow ${transition.fast};

  @media ${reducedMotion} {
    transition: none;
  }

  ${({ variant = 'primary' }) => variants[variant]}
  ${({ size = 'md' }) => sizes[size]}
  ${({ fullWidth }) => fullWidth && 'width: 100%;'}
  ${({ iconOnly, size = 'md' }) => iconOnly && css`
    padding: 0;
    width: ${size === 'xs' ? '28px' : size === 'sm' ? '32px' : size === 'lg' ? '40px' : size === 'xl' ? '48px' : '36px'};
    aspect-ratio: 1;
  `}

  /* Loading state */
  ${({ isLoading }) => isLoading && css`
    pointer-events: none;
    opacity: 0.75;

    & > *:not(${LoadingSpinnerIcon}) {
      visibility: hidden;
    }
  `}

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none !important;
  }

  svg {
    flex-shrink: 0;
    width: 1.1em;
    height: 1.1em;
  }
`;

/* ---------- Icon Button – Convenience wrapper ---------- */
export const IconButton = styled(Button).attrs<ButtonProps>({ iconOnly: true })``;

/* ---------- Button with Loading State ---------- */
export const ButtonWithLoading = styled(Button)<{ isLoading?: boolean }>`
  ${({ isLoading }) => isLoading && css`
    color: transparent;

    &::after {
      content: '';
      position: absolute;
      width: 1.1em;
      height: 1.1em;
      border: 2px solid ${color.textInverse};
      border-right-color: transparent;
      border-top-color: transparent;
      border-radius: 50%;
      animation: ${spin} 0.65s ${easing.default} infinite;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
    }
  `}
`;
