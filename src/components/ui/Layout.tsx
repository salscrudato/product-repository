import styled from 'styled-components';
import {
  color, space, fontFamily, type as typeScale, layout, breakpoint,
} from '../../ui/tokens';

export const Page = styled.div`
  min-height: 100vh;
  padding: ${layout.pagePaddingY} ${layout.pagePaddingX};
  background: ${layout.pageBg};

  @media (max-width: ${breakpoint.md}) {
    padding: ${space[5]} ${layout.pagePaddingXMob};
  }
`;

export const Container = styled.div`
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  width: 100%;
`;

export const PageHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${space[8]};
`;

export const Title = styled.h1`
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.displaySm.size};
  font-weight: ${typeScale.displaySm.weight};
  line-height: ${typeScale.displaySm.lineHeight};
  letter-spacing: ${typeScale.displaySm.letterSpacing};
  color: ${color.text};
  margin: 0;
`;
