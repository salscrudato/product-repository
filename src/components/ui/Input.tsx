import React from 'react';
import styled, { css } from 'styled-components';

/* ---------- Input State Types ---------- */
type InputState = 'default' | 'error' | 'success' | 'warning';
type InputSize = 'sm' | 'md' | 'lg';

/* ---------- Input Wrapper for Labels & Helper Text ---------- */
const InputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
`;

const Label = styled.label<{ $required?: boolean; $disabled?: boolean }>`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme, $disabled }) => $disabled ? theme.colours.textMuted : theme.colours.text};
  display: flex;
  align-items: center;
  gap: 4px;

  ${({ $required }) => $required && css`
    &::after {
      content: '*';
      color: #ef4444;
      font-weight: 600;
    }
  `}
`;

const HelperText = styled.span<{ $state?: InputState }>`
  font-size: 13px;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 6px;

  ${({ $state, theme }) => {
    switch ($state) {
      case 'error':
        return css`color: ${theme.colours.error};`;
      case 'success':
        return css`color: ${theme.colours.success};`;
      case 'warning':
        return css`color: ${theme.colours.warning};`;
      default:
        return css`color: ${theme.colours.textSecondary};`;
    }
  }}

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
`;

const CharacterCount = styled.span<{ $isNearLimit?: boolean; $isOverLimit?: boolean }>`
  font-size: 12px;
  color: ${({ theme, $isOverLimit, $isNearLimit }) =>
    $isOverLimit ? theme.colours.error :
    $isNearLimit ? theme.colours.warning :
    theme.colours.textMuted};
  margin-left: auto;
  transition: color 0.2s ease;
`;

/* ---------- Input Container for Icons ---------- */
const InputContainer = styled.div<{ $hasLeftIcon?: boolean; $hasRightIcon?: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;

  ${({ $hasLeftIcon }) => $hasLeftIcon && css`
    input {
      padding-left: 44px;
    }
  `}

  ${({ $hasRightIcon }) => $hasRightIcon && css`
    input {
      padding-right: 44px;
    }
  `}
`;

const IconWrapper = styled.span<{ $position: 'left' | 'right'; $size?: InputSize }>`
  position: absolute;
  ${({ $position }) => $position === 'left' ? 'left: 14px;' : 'right: 14px;'}
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colours.textSecondary};
  pointer-events: none;
  transition: color 0.2s ease;

  svg {
    width: ${({ $size }) => $size === 'sm' ? '16px' : $size === 'lg' ? '20px' : '18px'};
    height: ${({ $size }) => $size === 'sm' ? '16px' : $size === 'lg' ? '20px' : '18px'};
  }
`;

/* ---------- Size Styles ---------- */
const sizeStyles = {
  sm: css`
    padding: 8px 12px;
    font-size: 13px;
    border-radius: 6px;
    min-height: 36px;
  `,
  md: css`
    padding: 12px 16px;
    font-size: 14px;
    border-radius: 8px;
    min-height: 44px;
  `,
  lg: css`
    padding: 14px 18px;
    font-size: 16px;
    border-radius: 10px;
    min-height: 52px;
  `,
};

/* ---------- State Styles ---------- */
const stateStyles = {
  default: css`
    border-color: ${({ theme }) => theme.colours.border};

    &:hover:not(:disabled):not(:focus) {
      border-color: ${({ theme }) => theme.colours.textSecondary};
    }

    &:focus {
      border-color: ${({ theme }) => theme.colours.primary};
      box-shadow: 0 0 0 3px ${({ theme }) => theme.colours.focusRing};
    }
  `,
  error: css`
    border-color: ${({ theme }) => theme.colours.error};
    background-color: ${({ theme }) => theme.colours.errorLight}20;

    &:focus {
      border-color: ${({ theme }) => theme.colours.error};
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
    }
  `,
  success: css`
    border-color: ${({ theme }) => theme.colours.success};
    background-color: ${({ theme }) => theme.colours.successLight}20;

    &:focus {
      border-color: ${({ theme }) => theme.colours.success};
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
    }
  `,
  warning: css`
    border-color: ${({ theme }) => theme.colours.warning};
    background-color: ${({ theme }) => theme.colours.warningLight}20;

    &:focus {
      border-color: ${({ theme }) => theme.colours.warning};
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
    }
  `,
};

/* ---------- Base Text Input ---------- */
export const TextInput = styled.input.withConfig({
  shouldForwardProp: (prop) => !['$state', '$size'].includes(prop),
})<{ $state?: InputState; $size?: InputSize }>`
  width: 100%;
  font-family: ${({ theme }) => theme.font};
  color: ${({ theme }) => theme.colours.text};
  background-color: ${({ theme }) => theme.colours.background};
  border: 1.5px solid ${({ theme }) => theme.colours.border};
  outline: none;
  transition: all 0.2s ease;

  ${({ $size = 'md' }) => sizeStyles[$size]}
  ${({ $state = 'default' }) => stateStyles[$state]}

  &::placeholder {
    color: ${({ theme }) => theme.colours.textMuted};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colours.backgroundAlt};
    color: ${({ theme }) => theme.colours.textMuted};
    cursor: not-allowed;
    opacity: 0.7;
  }

  &:read-only {
    background-color: ${({ theme }) => theme.colours.backgroundAlt};
    cursor: default;
  }

  /* Remove default browser styling for autofill */
  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0px 1000px ${({ theme }) => theme.colours.background} inset;
    -webkit-text-fill-color: ${({ theme }) => theme.colours.text};
    transition: background-color 5000s ease-in-out 0s;
  }
`;

/* ---------- Textarea Component ---------- */
export const TextArea = styled.textarea.withConfig({
  shouldForwardProp: (prop) => !['$state', '$size'].includes(prop),
})<{ $state?: InputState; $size?: InputSize; $resize?: 'none' | 'vertical' | 'horizontal' | 'both' }>`
  width: 100%;
  font-family: ${({ theme }) => theme.font};
  color: ${({ theme }) => theme.colours.text};
  background-color: ${({ theme }) => theme.colours.background};
  border: 1.5px solid ${({ theme }) => theme.colours.border};
  outline: none;
  transition: all 0.2s ease;
  resize: ${({ $resize = 'vertical' }) => $resize};
  min-height: 100px;

  ${({ $size = 'md' }) => sizeStyles[$size]}
  ${({ $state = 'default' }) => stateStyles[$state]}

  &::placeholder {
    color: ${({ theme }) => theme.colours.textMuted};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colours.backgroundAlt};
    color: ${({ theme }) => theme.colours.textMuted};
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

/* ---------- Select Component ---------- */
export const Select = styled.select.withConfig({
  shouldForwardProp: (prop) => !['$state', '$size'].includes(prop),
})<{ $state?: InputState; $size?: InputSize }>`
  width: 100%;
  font-family: ${({ theme }) => theme.font};
  color: ${({ theme }) => theme.colours.text};
  background-color: ${({ theme }) => theme.colours.background};
  border: 1.5px solid ${({ theme }) => theme.colours.border};
  outline: none;
  transition: all 0.2s ease;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 40px;

  ${({ $size = 'md' }) => sizeStyles[$size]}
  ${({ $state = 'default' }) => stateStyles[$state]}

  &:disabled {
    background-color: ${({ theme }) => theme.colours.backgroundAlt};
    color: ${({ theme }) => theme.colours.textMuted};
    cursor: not-allowed;
    opacity: 0.7;
  }

  option {
    padding: 8px;
  }
`;

/* ---------- Checkbox Component ---------- */
export const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  appearance: none;
  width: 18px;
  height: 18px;
  border: 1.5px solid ${({ theme }) => theme.colours.border};
  border-radius: 4px;
  background-color: ${({ theme }) => theme.colours.background};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colours.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colours.focusRing};
  }

  &:checked {
    background-color: ${({ theme }) => theme.colours.primary};
    border-color: ${({ theme }) => theme.colours.primary};
  }

  &:checked::after {
    content: '';
    position: absolute;
    left: 5px;
    top: 2px;
    width: 5px;
    height: 10px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

/* ---------- Radio Component ---------- */
export const Radio = styled.input.attrs({ type: 'radio' })`
  appearance: none;
  width: 18px;
  height: 18px;
  border: 1.5px solid ${({ theme }) => theme.colours.border};
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colours.background};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colours.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colours.focusRing};
  }

  &:checked {
    border-color: ${({ theme }) => theme.colours.primary};
  }

  &:checked::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${({ theme }) => theme.colours.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

/* ---------- Export Helper Components ---------- */
export { InputWrapper, Label, HelperText, CharacterCount, InputContainer, IconWrapper };