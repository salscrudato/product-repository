import styled from 'styled-components';

export const Page = styled.div`
  min-height:100vh;
  padding:24px;
`;

export const Container = styled.div`
  max-width:1400px;
  margin:0 auto;
  width:100%;
`;

export const PageHeader = styled.header`
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:32px;
`;

export const Title = styled.h1`
  font-size:32px;
  font-weight:600;
  background:${({ theme }) => theme.colours.gradient};
  -webkit-background-clip:text;
  color:transparent;
`;