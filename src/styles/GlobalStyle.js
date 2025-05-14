import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  *,*::before,*::after { box-sizing:border-box; }
  body {
    margin:0;
    font-family:${({ theme }) => theme.font};
    background:#f5f5f5;
    color:${({ theme }) => theme.colours.text};
    -webkit-font-smoothing: antialiased;
  }
  a { color:inherit; text-decoration:none; }
  button { font-family:inherit; }
`;