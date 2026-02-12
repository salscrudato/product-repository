/**
 * SkipLink Component
 * Allows keyboard users to skip to main content
 */

import React from 'react';
import styled from 'styled-components';

const StyledSkipLink = styled.a`
  position: absolute;
  top: -40px;
  left: 16px;
  z-index: 9999;
  padding: 8px 16px;
  background: #6366f1;
  color: white;
  font-weight: 600;
  text-decoration: none;
  border-radius: 4px;
  transition: top 0.2s ease;
  
  &:focus {
    top: 16px;
    outline: 2px solid white;
    outline-offset: 2px;
  }
`;

interface SkipLinkProps {
  href?: string;
  children?: React.ReactNode;
}

export const SkipLink: React.FC<SkipLinkProps> = ({ 
  href = '#main-content', 
  children = 'Skip to main content' 
}) => {
  return (
    <StyledSkipLink href={href}>
      {children}
    </StyledSkipLink>
  );
};

