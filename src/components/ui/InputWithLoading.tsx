/**
 * InputWithLoading - Input component with integrated loading state
 * 
 * Provides visual feedback during async operations like search or validation.
 */

import React, { forwardRef, InputHTMLAttributes } from 'react';
import styled, { keyframes } from 'styled-components';

// ============ Animations ============
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// ============ Styled Components ============
const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`;

const StyledInput = styled.input<{ $hasIcon?: boolean; $isLoading?: boolean }>`
  width: 100%;
  padding: 12px 16px;
  padding-right: ${({ $hasIcon, $isLoading }) => ($hasIcon || $isLoading) ? '44px' : '16px'};
  font-size: 15px;
  font-family: inherit;
  color: ${({ theme }) => theme.colours.text};
  background: ${({ theme }) => theme.colours.background};
  border: 1.5px solid ${({ theme }) => theme.colours.border};
  border-radius: ${({ theme }) => theme.radiusMd};
  transition: all 0.2s ease;
  
  &::placeholder {
    color: ${({ theme }) => theme.colours.textMuted};
  }
  
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colours.primary};
  }
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colours.primary};
    box-shadow: ${({ theme }) => theme.shadowFocus};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: ${({ theme }) => theme.colours.backgroundSubtle};
  }
`;

const IconContainer = styled.div`
  position: absolute;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colours.textMuted};
  pointer-events: none;
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const LoadingSpinner = styled.div`
  width: 18px;
  height: 18px;
  border: 2px solid ${({ theme }) => theme.colours.border};
  border-top-color: ${({ theme }) => theme.colours.primary};
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;

const SuccessIcon = styled.div`
  color: ${({ theme }) => theme.colours.success};
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const ErrorIcon = styled.div`
  color: ${({ theme }) => theme.colours.error};
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

// ============ Component ============
interface InputWithLoadingProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Show loading spinner */
  isLoading?: boolean;
  /** Show success state */
  isSuccess?: boolean;
  /** Show error state */
  isError?: boolean;
  /** Custom icon to show (when not loading/success/error) */
  icon?: React.ReactNode;
  /** Error message for accessibility */
  errorMessage?: string;
}

export const InputWithLoading = forwardRef<HTMLInputElement, InputWithLoadingProps>(({
  isLoading = false,
  isSuccess = false,
  isError = false,
  icon,
  errorMessage,
  ...props
}, ref) => {
  const showIcon = icon || isLoading || isSuccess || isError;
  
  return (
    <InputWrapper>
      <StyledInput
        ref={ref}
        $hasIcon={!!icon}
        $isLoading={isLoading}
        aria-invalid={isError}
        aria-describedby={isError && errorMessage ? `${props.id}-error` : undefined}
        {...props}
      />
      {showIcon && (
        <IconContainer>
          {isLoading ? (
            <LoadingSpinner aria-label="Loading" />
          ) : isSuccess ? (
            <SuccessIcon aria-label="Success">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </SuccessIcon>
          ) : isError ? (
            <ErrorIcon aria-label="Error">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </ErrorIcon>
          ) : (
            icon
          )}
        </IconContainer>
      )}
    </InputWrapper>
  );
});

InputWithLoading.displayName = 'InputWithLoading';

export default InputWithLoading;

