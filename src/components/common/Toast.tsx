/**
 * Toast - Enhanced notification system
 *
 * Features:
 * - Stacked notifications with smart positioning
 * - Progress bars for timed dismissal
 * - Action buttons with undo functionality
 * - Pause on hover
 * - AI-themed styling
 * - Accessible announcements
 *
 * Usage:
 *   const { showToast } = useToast();
 *   showToast({
 *     message: 'Changes saved!',
 *     type: 'success',
 *     action: { label: 'Undo', onClick: () => undoChanges() }
 *   });
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  CheckIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon
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

const progressShrink = keyframes`
  from { width: 100%; }
  to { width: 0%; }
`;

const ToastContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 420px;
  pointer-events: none;

  & > * {
    pointer-events: auto;
  }
`;

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'ai';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItemProps {
  $type: ToastType;
  $isExiting: boolean;
  $isPaused: boolean;
}

const getTypeColor = (type: ToastType, theme: any) => {
  switch (type) {
    case 'success': return theme.colours.success;
    case 'error': return theme.colours.error;
    case 'warning': return theme.colours.warning;
    case 'ai': return '#6366f1';
    default: return theme.colours.primary;
  }
};

const ToastItem = styled.div<ToastItemProps>`
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colours.backgroundElevated};
  border: 1px solid ${({ theme, $type }) => getTypeColor($type, theme)};
  border-radius: ${({ theme }) => theme.radiusMd};
  box-shadow: ${({ theme }) => theme.shadowLg}, 0 0 0 1px rgba(0, 0, 0, 0.05);
  animation: ${({ $isExiting }) => ($isExiting ? slideOut : slideIn)} 0.3s ease forwards;
  min-width: 300px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  ${({ $type }) => $type === 'ai' && css`
    border-image: linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4) 1;
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15), 0 0 0 1px rgba(99, 102, 241, 0.1);
  `}

  &:hover {
    transform: translateX(-4px);
    box-shadow: ${({ theme }) => theme.shadowXl};
  }
`;

const ToastContent = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
`;

const IconWrapper = styled.div<{ $type: ToastType }>`
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme, $type }) => getTypeColor($type, theme)};
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
  margin-bottom: 2px;
`;

const Message = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colours.textSecondary};
  word-wrap: break-word;
`;

const ActionsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
`;

const ActionButton = styled.button<{ $type: ToastType }>`
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  background: ${({ theme, $type }) => `${getTypeColor($type, theme)}15`};
  color: ${({ theme, $type }) => getTypeColor($type, theme)};
  border: 1px solid ${({ theme, $type }) => `${getTypeColor($type, theme)}30`};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme, $type }) => `${getTypeColor($type, theme)}25`};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: ${({ theme }) => theme.colours.textMuted};
  border-radius: ${({ theme }) => theme.radiusSm};
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    color: ${({ theme }) => theme.colours.text};
    background: ${({ theme }) => theme.colours.hover};
  }
`;

const ProgressBar = styled.div<{ $type: ToastType; $duration: number; $isPaused: boolean }>`
  height: 3px;
  background: ${({ theme, $type }) => `${getTypeColor($type, theme)}30`};
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: ${({ theme, $type }) => getTypeColor($type, theme)};
    animation: ${progressShrink} ${({ $duration }) => $duration}ms linear forwards;
    animation-play-state: ${({ $isPaused }) => ($isPaused ? 'paused' : 'running')};
  }
`;

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  isExiting?: boolean;
  action?: ToastAction;
  showProgress?: boolean;
  isPaused?: boolean;
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
    case 'ai': return <IconStyled><SparklesIcon /></IconStyled>;
    default: return <IconStyled><InformationCircleIcon /></IconStyled>;
  }
};

// Individual toast component with pause functionality
const ToastItemComponent: React.FC<{
  toast: Toast;
  onDismiss: (id: string) => void;
  onPause: (id: string, paused: boolean) => void;
}> = ({ toast, onDismiss, onPause }) => {
  const duration = toast.duration ?? 5000;
  const showProgress = toast.showProgress !== false && duration > 0;

  return (
    <ToastItem
      $type={toast.type}
      $isExiting={toast.isExiting || false}
      $isPaused={toast.isPaused || false}
      role="alert"
      onMouseEnter={() => onPause(toast.id, true)}
      onMouseLeave={() => onPause(toast.id, false)}
    >
      <ToastContent>
        <IconWrapper $type={toast.type}>{getIcon(toast.type)}</IconWrapper>
        <Content>
          {toast.title && <Title>{toast.title}</Title>}
          <Message>{toast.message}</Message>
          {toast.action && (
            <ActionsRow>
              <ActionButton
                $type={toast.type}
                onClick={() => {
                  toast.action?.onClick();
                  onDismiss(toast.id);
                }}
              >
                {toast.action.label}
              </ActionButton>
            </ActionsRow>
          )}
        </Content>
        <CloseButton onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
          <XMarkIcon style={{ width: 16, height: 16 }} />
        </CloseButton>
      </ToastContent>
      {showProgress && (
        <ProgressBar
          $type={toast.type}
          $duration={duration}
          $isPaused={toast.isPaused || false}
        />
      )}
    </ToastItem>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<string, { timeout: NodeJS.Timeout; remaining: number; startTime: number }>>(new Map());

  const dismissToast = useCallback((id: string) => {
    // Clear any existing timeout
    const timeoutData = timeoutsRef.current.get(id);
    if (timeoutData) {
      clearTimeout(timeoutData.timeout);
      timeoutsRef.current.delete(id);
    }

    setToasts(prev => prev.map(t => t.id === id ? { ...t, isExiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  const pauseToast = useCallback((id: string, paused: boolean) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, isPaused: paused } : t));

    const timeoutData = timeoutsRef.current.get(id);
    if (!timeoutData) return;

    if (paused) {
      // Pause: clear timeout and save remaining time
      clearTimeout(timeoutData.timeout);
      const elapsed = Date.now() - timeoutData.startTime;
      timeoutData.remaining = Math.max(0, timeoutData.remaining - elapsed);
    } else {
      // Resume: create new timeout with remaining time
      timeoutData.startTime = Date.now();
      timeoutData.timeout = setTimeout(() => dismissToast(id), timeoutData.remaining);
    }
  }, [dismissToast]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { ...toast, id, isExiting: false, isPaused: false };
    setToasts(prev => {
      // Limit to 5 toasts max
      const updated = [...prev, newToast];
      if (updated.length > 5) {
        const oldest = updated[0];
        if (oldest) {
          dismissToast(oldest.id);
        }
        return updated.slice(1);
      }
      return updated;
    });

    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      const timeout = setTimeout(() => dismissToast(id), duration);
      timeoutsRef.current.set(id, { timeout, remaining: duration, startTime: Date.now() });
    }
  }, [dismissToast]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(data => clearTimeout(data.timeout));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <ToastContainer role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map(toast => (
          <ToastItemComponent
            key={toast.id}
            toast={toast}
            onDismiss={dismissToast}
            onPause={pauseToast}
          />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
};

// Convenience functions for common toast types
export const createToastHelpers = (showToast: ToastContextType['showToast']) => ({
  success: (message: string, options?: Partial<Toast>) =>
    showToast({ type: 'success', message, ...options }),
  error: (message: string, options?: Partial<Toast>) =>
    showToast({ type: 'error', message, duration: 8000, ...options }),
  warning: (message: string, options?: Partial<Toast>) =>
    showToast({ type: 'warning', message, ...options }),
  info: (message: string, options?: Partial<Toast>) =>
    showToast({ type: 'info', message, ...options }),
  ai: (message: string, options?: Partial<Toast>) =>
    showToast({ type: 'ai', message, title: 'AI Assistant', ...options }),
});

export default ToastProvider;

