// src/components/ui/ConnectionStatus.js
/**
 * Connection Status Indicator Component
 * Shows Firebase connection state with modern UI
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useFirebaseConnection } from '../../hooks/useFirebaseConnection';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const slideIn = keyframes`
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const StatusBar = styled.div<{ $state?: string }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 12px 24px;
  background: ${props => {
    switch (props.$state) {
      case 'connected': return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      case 'disconnected': return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      case 'reconnecting': return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      default: return 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
    }
  }};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 14px;
  font-weight: 500;
  z-index: 10000;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  animation: ${slideIn} 0.3s ease-out;
`;

const StatusDot = styled.div<{ $pulse?: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
  animation: ${props => props.$pulse ? pulse : 'none'} 2s ease-in-out infinite;
`;

const StatusText = styled.span`
  flex: 1;
  text-align: center;
`;

const ReconnectButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: white;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  opacity: 0.8;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }
`;

/**
 * Connection Status Component
 */
export const ConnectionStatus = ({ showWhenConnected = false }) => {
  const { state, isConnected, reconnectAttempts, forceReconnect } = useFirebaseConnection();
  const [dismissed, setDismissed] = React.useState(false);

  // Don't show if connected and showWhenConnected is false
  if (isConnected && !showWhenConnected) {
    return null;
  }

  // Don't show if dismissed
  if (dismissed) {
    return null;
  }

  const getMessage = () => {
    switch (state) {
      case 'connected':
        return 'Connected to Firebase';
      case 'disconnected':
        return 'Connection lost - Using cached data';
      case 'reconnecting':
        return `Reconnecting... (Attempt ${reconnectAttempts})`;
      case 'reconnect-failed':
        return 'Unable to reconnect - Please check your internet connection';
      default:
        return 'Checking connection...';
    }
  };

  return (
    <StatusBar $state={state}>
      <StatusDot $pulse={state === 'reconnecting'} />
      <StatusText>{getMessage()}</StatusText>
      
      {!isConnected && (
        <ReconnectButton onClick={forceReconnect}>
          Retry Connection
        </ReconnectButton>
      )}
      
      <CloseButton onClick={() => setDismissed(true)} aria-label="Dismiss">
        ×
      </CloseButton>
    </StatusBar>
  );
};

/**
 * Compact connection indicator (for header/footer)
 */
const IndicatorDot = styled.div<{ $connected?: boolean; $pulse?: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${props => props.$connected ? '#10b981' : '#ef4444'};
  animation: ${props => props.$pulse ? pulse : 'none'} 2s ease-in-out infinite;
  box-shadow: 0 0 0 2px ${props => props.$connected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
`;

const IndicatorContainer = styled.div<{ $connected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  background: ${props => props.$connected 
    ? 'rgba(16, 185, 129, 0.1)' 
    : 'rgba(239, 68, 68, 0.1)'};
  font-size: 12px;
  font-weight: 500;
  color: ${props => props.$connected ? '#059669' : '#dc2626'};
`;

export const ConnectionIndicator = () => {
  const { isConnected, state } = useFirebaseConnection();

  return (
    <IndicatorContainer $connected={isConnected} title={isConnected ? 'Connected' : 'Disconnected'}>
      <IndicatorDot $connected={isConnected} $pulse={state === 'reconnecting'} />
      {isConnected ? 'Online' : 'Offline'}
    </IndicatorContainer>
  );
};

export default ConnectionStatus;

