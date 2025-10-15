import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const TooltipWrapper = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
`;

const TooltipContent = styled.div<{ 
  $visible: boolean; 
  $position: 'top' | 'bottom' | 'left' | 'right';
}>`
  position: absolute;
  background: #1f2937;
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  z-index: 1000;
  opacity: ${props => props.$visible ? 1 : 0};
  visibility: ${props => props.$visible ? 'visible' : 'hidden'};
  transition: opacity 0.2s ease, visibility 0.2s ease, transform 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  
  ${props => {
    switch (props.$position) {
      case 'top':
        return `
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%) ${props.$visible ? 'translateY(0)' : 'translateY(4px)'};
          
          &::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 6px solid transparent;
            border-top-color: #1f2937;
          }
        `;
      case 'bottom':
        return `
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%) ${props.$visible ? 'translateY(0)' : 'translateY(-4px)'};
          
          &::after {
            content: '';
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 6px solid transparent;
            border-bottom-color: #1f2937;
          }
        `;
      case 'left':
        return `
          right: calc(100% + 8px);
          top: 50%;
          transform: translateY(-50%) ${props.$visible ? 'translateX(0)' : 'translateX(4px)'};
          
          &::after {
            content: '';
            position: absolute;
            left: 100%;
            top: 50%;
            transform: translateY(-50%);
            border: 6px solid transparent;
            border-left-color: #1f2937;
          }
        `;
      case 'right':
        return `
          left: calc(100% + 8px);
          top: 50%;
          transform: translateY(-50%) ${props.$visible ? 'translateX(0)' : 'translateX(-4px)'};
          
          &::after {
            content: '';
            position: absolute;
            right: 100%;
            top: 50%;
            transform: translateY(-50%);
            border: 6px solid transparent;
            border-right-color: #1f2937;
          }
        `;
    }
  }}
`;

export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  position = 'top',
  delay = 300 
}) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <TooltipWrapper
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      <TooltipContent $visible={visible} $position={position}>
        {content}
      </TooltipContent>
    </TooltipWrapper>
  );
};

