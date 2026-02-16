import React from 'react';
import styled from 'styled-components';
import { neutral, accent, space, layout } from '../../ui/tokens';

interface PageContainerProps {
  withOverlay?: boolean;
  children: React.ReactNode;
}

const StyledPageContainer = styled.div<{ $withOverlay: boolean }>`
  min-height: 100vh;
  background: linear-gradient(135deg, ${neutral[50]} 0%, ${neutral[200]} 50%, ${neutral[100]} 100%);
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
      background: linear-gradient(135deg, ${accent[500]} 0%, ${accent[400]} 100%);
      opacity: 0.06;
      z-index: 0;
    }
  `}
`;

const MainContent = styled.main.attrs({
  id: 'main-content',
})`
  flex: 1;
  padding: ${space[8]} ${space[8]} ${layout.pagePaddingY};
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  width: 100%;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: ${space[6]} ${space[5]} ${space[16]};
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
