import React from 'react';
import styled, { css } from 'styled-components';
import {
  color, neutral, accent, semantic,
  space, radius, fontFamily,
  type as typeScale, transition, duration, easing,
  focusRingStyle, reducedMotion,
} from '../../ui/tokens';

/* ---------- Input State Types ---------- */
type InputState = 'default' | 'error' | 'success' | 'warning';
type InputSize = 'sm' | 'md' | 'lg';

/* ---------- Input Wrapper for Labels & Helper Text ---------- */
const InputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space[1.5]};
  width: 100%;
`;

const Label = styled.label<{ $required?: boolean; $disabled?: boolean }>`
  font-size: ${typeScale.label.size};
  font-weight: ${typeScale.label.weight};
  line-height: ${typeScale.label.lineHeight};
  letter-spacing: ${typeScale.label.letterSpacing};
  font-family: ${fontFamily.sans};
  color: ${({ $disabled }) => $disabled ? color.textMuted : color.text};
  display: flex;
  align-items: center;
  gap: ${space[1]};

  ${({ $required }) => $required && css`
    &::after {
      content: '*';
      color: ${semantic.error};
      font-weight: 600;
    }
  `}
`;

const HelperText = styled.span<{ $state?: InputState }>`
  font-size: ${typeScale.caption.size};
  line-height: ${typeScale.caption.lineHeight};
  letter-spacing: ${typeScale.caption.letterSpacing};
  font-family: ${fontFamily.sans};
  display: flex;
  align-items: center;
  gap: ${space[1.5]};

  ${({ $state }) => {
    switch ($state) {
      case 'error':
        return css`color: ${semantic.error};`;
      case 'success':
        return css`color: ${semantic.success};`;
      case 'warning':
        return css`color: ${semantic.warning};`;
      default:
        return css`color: ${color.textSecondary};`;
    }
  }}

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
`;

const CharacterCount = styled.span<{ $isNearLimit?: boolean; $isOverLimit?: boolean }>`
  font-size: ${typeScale.captionSm.size};
  font-family: ${fontFamily.sans};
  color: ${({ $isOverLimit, $isNearLimit }) =>
    $isOverLimit ? semantic.error :
    $isNearLimit ? semantic.warning :
    color.textMuted};
  margin-left: auto;
  transition: color ${transition.fast};
`;

/* ---------- Input Container for Icons ---------- */
const InputContainer = styled.div<{ $hasLeftIcon?: boolean; $hasRightIcon?: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;

  ${({ $hasLeftIcon }) => $hasLeftIcon && css`
    input, textarea {
      padding-left: 40px;
    }
  `}

  ${({ $hasRightIcon }) => $hasRightIcon && css`
    input, textarea {
      padding-right: 40px;
    }
  `}
`;

const IconWrapper = styled.span<{ $position: 'left' | 'right'; $size?: InputSize }>`
  position: absolute;
  ${({ $position }) => $position === 'left' ? `left: ${space[3]};` : `right: ${space[3]};`}
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${color.textSecondary};
  pointer-events: none;
  transition: color ${transition.fast};

  svg {
    width: ${({ $size }) => $size === 'sm' ? '16px' : $size === 'lg' ? '20px' : '18px'};
    height: ${({ $size }) => $size === 'sm' ? '16px' : $size === 'lg' ? '20px' : '18px'};
  }
`;

/* ---------- Size Styles ---------- */
const sizeStyles = {
  sm: css`
    padding: ${space[1.5]} ${space[3]};
    font-size: ${typeScale.labelSm.size};
    border-radius: ${radius.sm};
    min-height: 32px;
  `,
  md: css`
    padding: ${space[2]} ${space[3]};
    font-size: ${typeScale.bodySm.size};
    border-radius: ${radius.md};
    min-height: 36px;
  `,
  lg: css`
    padding: ${space[2.5]} ${space[4]};
    font-size: ${typeScale.bodyLg.size};
    border-radius: ${radius.md};
    min-height: 40px;
  `,
};

/* ---------- State Styles ---------- */
const stateStyles = {
  default: css`
    border-color: ${neutral[200]};

    &:hover:not(:disabled):not(:focus) {
      border-color: ${neutral[300]};
    }

    &:focus {
      border-color: ${accent[500]};
      box-shadow: 0 0 0 3px ${color.focusRing};
    }
  `,
  error: css`
    border-color: ${semantic.error};
    background-color: ${semantic.errorLight};

    &:focus {
      border-color: ${semantic.error};
      box-shadow: 0 0 0 3px ${semantic.error}26;
    }
  `,
  success: css`
    border-color: ${semantic.success};
    background-color: ${semantic.successLight};

    &:focus {
      border-color: ${semantic.success};
      box-shadow: 0 0 0 3px ${semantic.success}26;
    }
  `,
  warning: css`
    border-color: ${semantic.warning};
    background-color: ${semantic.warningLight};

    &:focus {
      border-color: ${semantic.warning};
      box-shadow: 0 0 0 3px ${semantic.warning}26;
    }
  `,
};

/* ---------- Shared base for text inputs ---------- */
const inputBase = css`
  width: 100%;
  font-family: ${fontFamily.sans};
  color: ${color.text};
  background-color: ${neutral[0]};
  border: 1px solid ${neutral[200]};
  outline: none;
  transition: border-color ${transition.fast}, box-shadow ${transition.fast}, background-color ${transition.fast};

  @media ${reducedMotion} {
    transition: none;
  }

  &::placeholder {
    color: ${color.textMuted};
  }

  &:disabled {
    background-color: ${neutral[50]};
    color: ${color.textMuted};
    cursor: not-allowed;
    opacity: 0.6;
  }

  &:read-only {
    background-color: ${neutral[50]};
    cursor: default;
  }
`;

/* ---------- Base Text Input ---------- */
export const TextInput = styled.input.withConfig({
  shouldForwardProp: (prop) => !['$state', '$size'].includes(prop),
})<{ $state?: InputState; $size?: InputSize }>`
  ${inputBase}
  ${({ $size = 'md' }) => sizeStyles[$size]}
  ${({ $state = 'default' }) => stateStyles[$state]}

  /* Remove default browser styling for autofill */
  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0px 1000px ${neutral[0]} inset;
    -webkit-text-fill-color: ${color.text};
    transition: background-color 5000s ease-in-out 0s;
  }
`;

/* ---------- Textarea Component ---------- */
export const TextArea = styled.textarea.withConfig({
  shouldForwardProp: (prop) => !['$state', '$size'].includes(prop),
})<{ $state?: InputState; $size?: InputSize; $resize?: 'none' | 'vertical' | 'horizontal' | 'both' }>`
  ${inputBase}
  resize: ${({ $resize = 'vertical' }) => $resize};
  min-height: 100px;

  ${({ $size = 'md' }) => sizeStyles[$size]}
  ${({ $state = 'default' }) => stateStyles[$state]}
`;

/* ---------- Select Component ---------- */
export const Select = styled.select.withConfig({
  shouldForwardProp: (prop) => !['$state', '$size'].includes(prop),
})<{ $state?: InputState; $size?: InputSize }>`
  ${inputBase}
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right ${space[3]} center;
  padding-right: ${space[10]};

  ${({ $size = 'md' }) => sizeStyles[$size]}
  ${({ $state = 'default' }) => stateStyles[$state]}

  &:disabled {
    background-color: ${neutral[50]};
    color: ${color.textMuted};
    cursor: not-allowed;
    opacity: 0.6;
  }

  option {
    padding: ${space[2]};
  }
`;

/* ---------- Checkbox Component ---------- */
export const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  appearance: none;
  width: 18px;
  height: 18px;
  border: 1px solid ${neutral[300]};
  border-radius: ${radius.xs};
  background-color: ${neutral[0]};
  cursor: pointer;
  transition: background-color ${transition.fast}, border-color ${transition.fast};
  position: relative;
  flex-shrink: 0;

  @media ${reducedMotion} {
    transition: none;
  }

  &:hover:not(:disabled) {
    border-color: ${accent[500]};
  }

  &:focus-visible {
    ${focusRingStyle}
  }

  &:checked {
    background-color: ${accent[500]};
    border-color: ${accent[500]};
  }

  &:checked:hover:not(:disabled) {
    background-color: ${accent[600]};
    border-color: ${accent[600]};
  }

  &:checked::after {
    content: '';
    position: absolute;
    left: 5px;
    top: 2px;
    width: 5px;
    height: 10px;
    border: solid ${neutral[0]};
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

/* ---------- Radio Component ---------- */
export const Radio = styled.input.attrs({ type: 'radio' })`
  appearance: none;
  width: 18px;
  height: 18px;
  border: 1px solid ${neutral[300]};
  border-radius: ${radius.full};
  background-color: ${neutral[0]};
  cursor: pointer;
  transition: background-color ${transition.fast}, border-color ${transition.fast};
  position: relative;
  flex-shrink: 0;

  @media ${reducedMotion} {
    transition: none;
  }

  &:hover:not(:disabled) {
    border-color: ${accent[500]};
  }

  &:focus-visible {
    ${focusRingStyle}
  }

  &:checked {
    border-color: ${accent[500]};
  }

  &:checked::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    border-radius: ${radius.full};
    background-color: ${accent[500]};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

/* ---------- Export Helper Components ---------- */
export { InputWrapper, Label, HelperText, CharacterCount, InputContainer, IconWrapper };
