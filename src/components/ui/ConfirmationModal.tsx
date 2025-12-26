import React, { useEffect, useRef, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/solid';

/* ---------- Animations ---------- */
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const slideOut = keyframes`
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
  }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
`;

/* ---------- Types ---------- */
type ModalVariant = 'default' | 'danger' | 'warning' | 'success' | 'info';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ModalVariant;
  isDangerous?: boolean; // Legacy prop, maps to variant='danger'
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  icon?: React.ReactNode;
  showCloseButton?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/* ---------- Styled Components ---------- */
const Overlay = styled.div<{ $isClosing?: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
  animation: ${fadeIn} 0.2s ease-out;
  padding: 16px;

  ${({ $isClosing }) => $isClosing && css`
    animation: ${fadeIn} 0.15s ease-out reverse;
  `}
`;

const ModalContent = styled.div<{ $isClosing?: boolean; $hasShake?: boolean; $size?: 'sm' | 'md' | 'lg' }>`
  background: ${({ theme }) => theme.colours.background};
  border-radius: ${({ theme }) => theme.radiusLg};
  box-shadow: ${({ theme }) => theme.shadowElevated};
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  animation: ${slideUp} 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;

  ${({ $size }) => {
    switch ($size) {
      case 'sm':
        return css`max-width: 340px;`;
      case 'lg':
        return css`max-width: 520px;`;
      default:
        return css`max-width: 420px;`;
    }
  }}

  ${({ $isClosing }) => $isClosing && css`
    animation: ${slideOut} 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  `}

  ${({ $hasShake }) => $hasShake && css`
    animation: ${shake} 0.4s ease-in-out;
  `}

  &:focus {
    outline: none;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px 0 24px;
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
`;

// Variant colors using theme tokens - accessed via theme prop in styled components
const getVariantColors = (theme: typeof import('../../styles/theme').theme) => ({
  default: { bg: theme.colours.primaryLight, color: theme.colours.primary },
  danger: { bg: theme.colours.errorLight, color: theme.colours.error },
  warning: { bg: theme.colours.warningLight, color: theme.colours.warning },
  success: { bg: theme.colours.successLight, color: theme.colours.success },
  info: { bg: theme.colours.infoLight, color: theme.colours.info },
});

const IconWrapper = styled.div<{ $variant: ModalVariant }>`
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.radiusMd};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ $variant, theme }) => getVariantColors(theme)[$variant].bg};
  color: ${({ $variant, theme }) => getVariantColors(theme)[$variant].color};

  svg {
    width: 24px;
    height: 24px;
  }
`;

const ModalTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
  margin: 0;
  line-height: 1.4;
  letter-spacing: -0.01em;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  margin: -4px -8px -4px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colours.textMuted};
  border-radius: ${({ theme }) => theme.radiusSm};
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colours.text};
    background: ${({ theme }) => theme.colours.hover};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadowFocus};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const ModalBody = styled.div`
  padding: 16px 24px 24px;
  overflow-y: auto;
`;

const ModalMessage = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colours.textSecondary};
  line-height: 1.6;

  p {
    margin: 0;
  }

  p + p {
    margin-top: 12px;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px 24px 24px;
  justify-content: flex-end;
  border-top: 1px solid ${({ theme }) => theme.colours.borderLight};
  background: ${({ theme }) => theme.colours.backgroundAlt};
`;

// Button variant styles using theme tokens
const getButtonVariantStyles = (theme: typeof import('../../styles/theme').theme) => ({
  default: css`
    background: ${theme.colours.gradient};
    &:hover:not(:disabled) { filter: brightness(1.05); }
    &:focus-visible { box-shadow: 0 0 0 3px ${theme.colours.focusRing}; }
  `,
  danger: css`
    background: linear-gradient(135deg, ${theme.colours.error}, ${theme.colours.errorDark});
    &:hover:not(:disabled) { filter: brightness(0.95); }
    &:focus-visible { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.4); }
  `,
  warning: css`
    background: linear-gradient(135deg, ${theme.colours.warning}, ${theme.colours.warningDark});
    &:hover:not(:disabled) { filter: brightness(0.95); }
    &:focus-visible { box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.4); }
  `,
  success: css`
    background: linear-gradient(135deg, ${theme.colours.success}, ${theme.colours.successDark});
    &:hover:not(:disabled) { filter: brightness(0.95); }
    &:focus-visible { box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.4); }
  `,
  info: css`
    background: linear-gradient(135deg, ${theme.colours.info}, ${theme.colours.infoDark});
    &:hover:not(:disabled) { filter: brightness(0.95); }
    &:focus-visible { box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4); }
  `,
});

const ConfirmButton = styled.button<{ $variant: ModalVariant; $isLoading?: boolean }>`
  padding: 10px 20px;
  border-radius: ${({ theme }) => theme.radiusMd};
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 100px;
  color: ${({ theme }) => theme.colours.textInverse};
  position: relative;
  overflow: hidden;

  ${({ $variant, theme }) => getButtonVariantStyles(theme)[$variant]}

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadowMd};
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  ${({ $isLoading }) => $isLoading && css`
    color: transparent;
    pointer-events: none;
  `}
`;

const LoadingSpinner = styled.span`
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;

const CancelButton = styled.button`
  padding: 10px 20px;
  border-radius: ${({ theme }) => theme.radiusMd};
  border: 1.5px solid ${({ theme }) => theme.colours.border};
  background: ${({ theme }) => theme.colours.background};
  color: ${({ theme }) => theme.colours.textSecondary};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 90px;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colours.backgroundAlt};
    border-color: ${({ theme }) => theme.colours.border};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadowFocus};
    border-color: ${({ theme }) => theme.colours.primary};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

/* ---------- Helper function to get default icon ---------- */
const getDefaultIcon = (variant: ModalVariant) => {
  switch (variant) {
    case 'danger':
      return <ExclamationTriangleIcon />;
    case 'warning':
      return <ExclamationTriangleIcon />;
    case 'success':
      return <CheckCircleIcon />;
    case 'info':
      return <InformationCircleIcon />;
    default:
      return <QuestionMarkCircleIcon />;
  }
};

/* ---------- Main Component ---------- */
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant: propVariant,
  isDangerous = false,
  onConfirm,
  onCancel,
  isLoading = false,
  icon,
  showCloseButton = true,
  size = 'md'
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Map legacy isDangerous prop to variant
  const variant = propVariant || (isDangerous ? 'danger' : 'default');

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      e.preventDefault();
      onCancel();
    }
  }, [onCancel, isLoading]);

  // Focus trap
  const handleTabKey = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement?.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement?.focus();
    }
  }, []);

  // Setup event listeners and initial focus
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keydown', handleTabKey);

      // Focus cancel button by default (safer option)
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keydown', handleTabKey);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleKeyDown, handleTabKey]);

  const handleConfirm = async () => {
    await onConfirm();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <Overlay onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <ModalContent
        ref={modalRef}
        onClick={e => e.stopPropagation()}
        $size={size}
        tabIndex={-1}
      >
        <ModalHeader>
          <HeaderContent>
            <IconWrapper $variant={variant}>
              {icon || getDefaultIcon(variant)}
            </IconWrapper>
            <ModalTitle id="modal-title">{title}</ModalTitle>
          </HeaderContent>
          {showCloseButton && (
            <CloseButton
              onClick={onCancel}
              disabled={isLoading}
              aria-label="Close modal"
              type="button"
            >
              <XMarkIcon />
            </CloseButton>
          )}
        </ModalHeader>
        <ModalBody>
          <ModalMessage>
            {typeof message === 'string' ? <p>{message}</p> : message}
          </ModalMessage>
        </ModalBody>
        <ModalFooter>
          <CancelButton
            ref={cancelButtonRef}
            onClick={onCancel}
            disabled={isLoading}
            type="button"
          >
            {cancelText}
          </CancelButton>
          <ConfirmButton
            ref={confirmButtonRef}
            $variant={variant}
            $isLoading={isLoading}
            onClick={handleConfirm}
            disabled={isLoading}
            type="button"
          >
            {isLoading && <LoadingSpinner />}
            {confirmText}
          </ConfirmButton>
        </ModalFooter>
      </ModalContent>
    </Overlay>
  );
};

export default ConfirmationModal;
