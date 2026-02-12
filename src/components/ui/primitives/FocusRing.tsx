/**
 * FocusRing Component
 * Provides consistent focus styling for keyboard navigation
 */

import React from 'react';
import styled, { css } from 'styled-components';

// Focus ring styles that can be applied to any component
export const focusRingStyles = css`
  &:focus {
    outline: none;
  }
  
  &:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

// High contrast focus ring for dark backgrounds
export const focusRingStylesLight = css`
  &:focus {
    outline: none;
  }
  
  &:focus-visible {
    outline: 2px solid #ffffff;
    outline-offset: 2px;
    border-radius: 4px;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.5);
  }
`;

const FocusWrapper = styled.div`
  ${focusRingStyles}
`;

interface FocusRingProps {
  children: React.ReactNode;
  className?: string;
}

export const FocusRing: React.FC<FocusRingProps> = ({ children, className }) => {
  return (
    <FocusWrapper className={className} tabIndex={0}>
      {children}
    </FocusWrapper>
  );
};

