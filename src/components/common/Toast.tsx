/**
 * Toast - Non-intrusive notification system
 * 
 * Provides toast notifications for feedback on user actions.
 * Supports success, error, warning, and info variants.
 * 
 * Usage:
 *   const { showToast } = useToast();
 *   showToast({ message: 'Changes saved!', type: 'success' });
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  CheckIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

const ToastContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
`;

interface ToastItemProps {
  $type: ToastType;
  $isExiting: boolean;
}

const ToastItem = styled.div<ToastItemProps>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: ${({ theme }) => theme.colours.backgroundElevated};
  border: 1px solid ${({ theme, $type }) => {
    switch ($type) {
      case 'success': return theme.colours.success;
      case 'error': return theme.colours.error;
      case 'warning': return theme.colours.warning;
      default: return theme.colours.primary;
    }
  }};
  border-radius: ${({ theme }) => theme.radiusMd};
  box-shadow: ${({ theme }) => theme.shadowLg};
  animation: ${({ $isExiting }) => ($isExiting ? slideOut : slideIn)} 0.3s ease forwards;
  min-width: 280px;
`;

const IconWrapper = styled.div<{ $type: ToastType }>`
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme, $type }) => {
    switch ($type) {
      case 'success': return theme.colours.success;
      case 'error': return theme.colours.error;
      case 'warning': return theme.colours.warning;
      default: return theme.colours.primary;
    }
  }};
`;

const Content = styled.div`
  flex: 1;
`;

const Title = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
  margin-bottom: 2px;
`;

const Message = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colours.textSecondary};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: ${({ theme }) => theme.colours.textMuted};
  border-radius: ${({ theme }) => theme.radiusSm};
  transition: all 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colours.text};
    background: ${({ theme }) => theme.colours.hover};
  }
`;

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  isExiting?: boolean;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const IconStyled = styled.span`
  width: 20px;
  height: 20px;
  display: flex;

  svg {
    width: 100%;
    height: 100%;
  }
`;

const getIcon = (type: ToastType) => {
  switch (type) {
    case 'success': return <IconStyled><CheckIcon /></IconStyled>;
    case 'error': return <IconStyled><ExclamationCircleIcon /></IconStyled>;
    case 'warning': return <IconStyled><ExclamationTriangleIcon /></IconStyled>;
    default: return <IconStyled><InformationCircleIcon /></IconStyled>;
  }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, isExiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { ...toast, id, isExiting: false };
    setToasts(prev => [...prev, newToast]);
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      const timeout = setTimeout(() => dismissToast(id), duration);
      timeoutsRef.current.set(id, timeout);
    }
  }, [dismissToast]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <ToastContainer role="region" aria-label="Notifications">
        {toasts.map(toast => (
          <ToastItem key={toast.id} $type={toast.type} $isExiting={toast.isExiting || false} role="alert">
            <IconWrapper $type={toast.type}>{getIcon(toast.type)}</IconWrapper>
            <Content>
              {toast.title && <Title>{toast.title}</Title>}
              <Message>{toast.message}</Message>
            </Content>
            <CloseButton onClick={() => dismissToast(toast.id)} aria-label="Dismiss">
              <XMarkIcon style={{ width: 16, height: 16 }} />
            </CloseButton>
          </ToastItem>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
};

export default ToastProvider;

