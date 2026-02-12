/**
 * VisuallyHidden Component
 * Hides content visually while keeping it accessible to screen readers
 */

import React from 'react';
import styled from 'styled-components';

const HiddenSpan = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

interface VisuallyHiddenProps {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

export const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({ 
  children, 
  as = 'span' 
}) => {
  return <HiddenSpan as={as}>{children}</HiddenSpan>;
};

