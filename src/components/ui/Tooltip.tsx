import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled, { css, keyframes } from 'styled-components';

/* ---------- Animations ---------- */
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const arrowBounce = keyframes`
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.1); }
`;

/* ---------- Types ---------- */
type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
type TooltipVariant = 'dark' | 'light' | 'primary';
type TooltipSize = 'sm' | 'md' | 'lg';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: TooltipPosition;
  delay?: number;
  variant?: TooltipVariant;
  size?: TooltipSize;
  maxWidth?: number;
  disabled?: boolean;
  showArrow?: boolean;
  interactive?: boolean;
}

/* ---------- Variant Styles ---------- */
const variantStyles = {
  dark: css`
    background: #1f2937;
    color: white;
    --arrow-color: #1f2937;
  `,
  light: css`
    background: white;
    color: #374151;
    border: 1px solid #e5e7eb;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    --arrow-color: white;
  `,
  primary: css`
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    --arrow-color: #6366f1;
  `,
};

/* ---------- Size Styles ---------- */
const sizeStyles = {
  sm: css`
    padding: 6px 10px;
    font-size: 12px;
    border-radius: 6px;
  `,
  md: css`
    padding: 8px 12px;
    font-size: 13px;
    border-radius: 8px;
  `,
  lg: css`
    padding: 10px 16px;
    font-size: 14px;
    border-radius: 10px;
  `,
};

/* ---------- Styled Components ---------- */
const TooltipWrapper = styled.div<{ $interactive?: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;

  ${({ $interactive }) => $interactive && css`
    &:hover > div[data-tooltip] {
      pointer-events: auto;
    }
  `}
`;

const TooltipContent = styled.div<{
  $visible: boolean;
  $position: TooltipPosition;
  $variant: TooltipVariant;
  $size: TooltipSize;
  $maxWidth: number;
  $showArrow: boolean;
}>`
  position: absolute;
  font-weight: 500;
  pointer-events: none;
  z-index: ${({ theme }) => theme.zIndex?.tooltip || 600};
  opacity: ${props => props.$visible ? 1 : 0};
  visibility: ${props => props.$visible ? 'visible' : 'hidden'};
  transition: opacity 0.2s ease, visibility 0.2s ease, transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: ${props => props.$maxWidth}px;
  white-space: ${props => props.$maxWidth > 200 ? 'normal' : 'nowrap'};
  word-wrap: break-word;
  line-height: 1.4;
  text-align: left;

  ${({ $variant }) => variantStyles[$variant]}
  ${({ $size }) => sizeStyles[$size]}

  ${props => props.$visible && css`
    animation: ${fadeIn} 0.15s ease-out;
  `}

  ${props => {
    const arrowSize = props.$size === 'sm' ? '5px' : props.$size === 'lg' ? '7px' : '6px';
    const offset = props.$size === 'sm' ? '6px' : props.$size === 'lg' ? '10px' : '8px';

    switch (props.$position) {
      case 'top':
        return css`
          bottom: calc(100% + ${offset});
          left: 50%;
          transform: translateX(-50%) ${props.$visible ? 'translateY(0)' : 'translateY(4px)'};

          ${props.$showArrow && css`
            &::after {
              content: '';
              position: absolute;
              top: 100%;
              left: 50%;
              transform: translateX(-50%);
              border: ${arrowSize} solid transparent;
              border-top-color: var(--arrow-color);
              ${props.$visible && css`
                animation: ${arrowBounce} 0.3s ease-out;
              `}
            }
          `}
        `;
      case 'bottom':
        return css`
          top: calc(100% + ${offset});
          left: 50%;
          transform: translateX(-50%) ${props.$visible ? 'translateY(0)' : 'translateY(-4px)'};

          ${props.$showArrow && css`
            &::after {
              content: '';
              position: absolute;
              bottom: 100%;
              left: 50%;
              transform: translateX(-50%);
              border: ${arrowSize} solid transparent;
              border-bottom-color: var(--arrow-color);
            }
          `}
        `;
      case 'left':
        return css`
          right: calc(100% + ${offset});
          top: 50%;
          transform: translateY(-50%) ${props.$visible ? 'translateX(0)' : 'translateX(4px)'};

          ${props.$showArrow && css`
            &::after {
              content: '';
              position: absolute;
              left: 100%;
              top: 50%;
              transform: translateY(-50%);
              border: ${arrowSize} solid transparent;
              border-left-color: var(--arrow-color);
            }
          `}
        `;
      case 'right':
        return css`
          left: calc(100% + ${offset});
          top: 50%;
          transform: translateY(-50%) ${props.$visible ? 'translateX(0)' : 'translateX(-4px)'};

          ${props.$showArrow && css`
            &::after {
              content: '';
              position: absolute;
              right: 100%;
              top: 50%;
              transform: translateY(-50%);
              border: ${arrowSize} solid transparent;
              border-right-color: var(--arrow-color);
            }
          `}
        `;
    }
  }}
`;

/* ---------- Main Component ---------- */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 300,
  variant = 'dark',
  size = 'md',
  maxWidth = 280,
  disabled = false,
  showArrow = true,
  interactive = false,
}) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const showTooltip = useCallback(() => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  }, [delay, disabled]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setVisible(false);
  }, []);

  // Handle escape key to close tooltip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        hideTooltip();
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, hideTooltip]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Don't render tooltip if disabled or no content
  if (disabled || !content) {
    return <>{children}</>;
  }

  return (
    <TooltipWrapper
      ref={wrapperRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      $interactive={interactive}
    >
      {children}
      <TooltipContent
        $visible={visible}
        $position={position}
        $variant={variant}
        $size={size}
        $maxWidth={maxWidth}
        $showArrow={showArrow}
        data-tooltip
        role="tooltip"
        aria-hidden={!visible}
      >
        {content}
      </TooltipContent>
    </TooltipWrapper>
  );
};

/* ---------- InfoTooltip - Convenience component with info icon ---------- */
export const InfoTooltip: React.FC<Omit<TooltipProps, 'children'>> = (props) => {
  return (
    <Tooltip {...props}>
      <InfoIcon aria-label="More information">
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </InfoIcon>
    </Tooltip>
  );
};

const InfoIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: #9ca3af;
  cursor: help;
  transition: color 0.2s ease;

  &:hover {
    color: #6b7280;
  }

  svg {
    width: 100%;
    height: 100%;
  }
`;
