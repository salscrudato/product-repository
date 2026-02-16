/**
 * ErrorBoundary Component
 *
 * Enhancements:
 * - Comprehensive error logging with context
 * - Accessibility features (ARIA labels, keyboard navigation)
 * - Development vs production error display
 * - Error recovery with retry mechanism
 */

import React from 'react';
import styled from 'styled-components';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import logger, { LOG_CATEGORIES } from '@utils/logger';
import {
  color, neutral, accent, semantic, space, radius, shadow,
  fontFamily, transition,
} from '../ui/tokens';

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: ${space[10]} ${space[5]};
  text-align: center;
  background: ${neutral[0]};
  border-radius: ${radius.xl};
  border: 1px solid ${neutral[200]};
  box-shadow: ${shadow.card};
  margin: ${space[5]};
`;

const ErrorIcon = styled.div`
  width: 80px;
  height: 80px;
  background: ${semantic.errorLight};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${space[6]};
  
  svg {
    width: 40px;
    height: 40px;
    color: ${semantic.error};
  }
`;

const ErrorTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  font-family: ${fontFamily.sans};
  color: ${color.text};
  margin: 0 0 ${space[3]} 0;
`;

const ErrorMessage = styled.p`
  font-size: 16px;
  color: ${neutral[500]};
  margin: 0 0 ${space[8]} 0;
  max-width: 500px;
  line-height: 1.6;
`;

const ErrorDetails = styled.details`
  margin: ${space[5]} 0;
  padding: ${space[4]};
  background: ${neutral[50]};
  border-radius: ${radius.md};
  border: 1px solid ${neutral[200]};
  max-width: 600px;
  text-align: left;
  
  summary {
    cursor: pointer;
    font-weight: 500;
    color: ${neutral[700]};
    margin-bottom: ${space[2]};
  }
  
  pre {
    font-size: 12px;
    color: ${neutral[500]};
    white-space: pre-wrap;
    word-break: break-word;
    margin: ${space[2]} 0 0 0;
  }
`;

const RetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${space[2]};
  padding: ${space[3]} ${space[6]};
  background: ${accent[600]};
  color: ${neutral[0]};
  border: none;
  border-radius: ${radius.lg};
  font-size: 16px;
  font-weight: 500;
  font-family: ${fontFamily.sans};
  cursor: pointer;
  transition: background ${transition.fast};
  
  &:hover { background: ${accent[700]}; }
  
  svg {
    width: 18px;
    height: 18px;
  }
`;

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  resetError: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, errorInfo, resetError }) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <ErrorContainer role="alert" aria-live="assertive">
      <ErrorIcon aria-hidden="true">
        <ExclamationTriangleIcon />
      </ErrorIcon>

      <ErrorTitle id="error-title">Something went wrong</ErrorTitle>

      <ErrorMessage aria-describedby="error-title">
        We encountered an unexpected error. This has been logged and our team will investigate.
        Please try refreshing the page or contact support if the problem persists.
      </ErrorMessage>

      {/* Optimized: Accessible retry button with keyboard support */}
      <RetryButton
        onClick={resetError}
        aria-label="Retry the operation"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            resetError();
          }
        }}
      >
        <ArrowPathIcon />
        Try Again
      </RetryButton>

      {isDevelopment && error && (
        <ErrorDetails>
          <summary>Error Details (Development Only)</summary>
          <pre>
            <strong>Error:</strong> {error.toString()}
            {errorInfo && (
              <>
                <br /><br />
                <strong>Component Stack:</strong>
                {errorInfo.componentStack}
              </>
            )}
          </pre>
        </ErrorDetails>
      )}
    </ErrorContainer>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error | null, errorInfo: React.ErrorInfo | null, resetError: () => void) => React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Optimized: Comprehensive error logging with context
    logger.error(LOG_CATEGORIES.ERROR, 'Error caught by ErrorBoundary', {
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    }, error);

    this.setState({
      error,
      errorInfo
    });

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
      logger.warn(LOG_CATEGORIES.ERROR, 'Error in production - consider integrating error reporting service');
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo, this.resetError);
      }

      // Default fallback UI
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
export { ErrorFallback };
