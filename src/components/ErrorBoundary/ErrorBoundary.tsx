/**
 * Global Error Boundary Component
 * Catches React errors and provides recovery options
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import styled from 'styled-components';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import logger, { LOG_CATEGORIES } from '../../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px;
  text-align: center;
`;

const IconWrapper = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #fef2f2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 12px;
`;

const Message = styled.p`
  font-size: 16px;
  color: #64748b;
  margin: 0 0 24px;
  max-width: 500px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => props.$variant === 'primary' ? `
    background: #6366f1;
    color: white;
    border: none;
    
    &:hover {
      background: #4f46e5;
    }
  ` : `
    background: white;
    color: #64748b;
    border: 1px solid #e2e8f0;
    
    &:hover {
      background: #f8fafc;
    }
  `}
`;

const ErrorDetails = styled.details`
  margin-top: 24px;
  text-align: left;
  max-width: 600px;
  width: 100%;
`;

const ErrorSummary = styled.summary`
  cursor: pointer;
  color: #64748b;
  font-size: 14px;
  
  &:hover {
    color: #1e293b;
  }
`;

const ErrorStack = styled.pre`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  font-size: 12px;
  overflow-x: auto;
  color: #64748b;
  margin-top: 12px;
`;

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log error
    logger.error(LOG_CATEGORIES.UI, 'React Error Boundary caught error', {
      componentStack: errorInfo.componentStack,
    }, error);
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo);
    
    // TODO: Send to Sentry or other error monitoring service
    // if (typeof window !== 'undefined' && (window as any).Sentry) {
    //   (window as any).Sentry.captureException(error, { extra: errorInfo });
    // }
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorContainer>
          <IconWrapper>
            <ExclamationTriangleIcon width={40} color="#ef4444" />
          </IconWrapper>
          
          <Title>Something went wrong</Title>
          <Message>
            We encountered an unexpected error. You can try refreshing the page
            or go back to the home page.
          </Message>
          
          <ButtonGroup>
            <Button $variant="primary" onClick={this.handleReload}>
              <ArrowPathIcon width={18} />
              Refresh Page
            </Button>
            <Button $variant="secondary" onClick={this.handleGoHome}>
              Go to Home
            </Button>
          </ButtonGroup>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <ErrorDetails>
              <ErrorSummary>Error Details (Development Only)</ErrorSummary>
              <ErrorStack>
                <strong>{this.state.error.name}:</strong> {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
                {this.state.errorInfo?.componentStack && (
                  <>
                    {'\n\nComponent Stack:'}
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </ErrorStack>
            </ErrorDetails>
          )}
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

