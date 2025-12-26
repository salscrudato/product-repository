import React from 'react';
import styled from 'styled-components';

interface PageContainerProps {
  withOverlay?: boolean;
  children: React.ReactNode;
}

const StyledPageContainer = styled.div<{ $withOverlay: boolean }>`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
  display: flex;
  flex-direction: column;
  position: relative;

  ${props => props.$withOverlay && `
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 300px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
      opacity: 0.08;
      z-index: 0;
    }
  `}
`;

const MainContent = styled.main.attrs({
  id: 'main-content',
})`
  flex: 1;
  padding: 32px 32px 80px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: 24px 20px 60px;
  }
`;

export const PageContainer: React.FC<PageContainerProps> = ({
  withOverlay = true,
  children
}) => {
  return (
    <StyledPageContainer $withOverlay={withOverlay}>
      {children}
    </StyledPageContainer>
  );
};

export const PageContent = MainContent;

