import styled, { css } from 'styled-components';

const variants = {
  primary: css`
    background:${({ theme }) => theme.colours.gradient};
    color:#fff;
    &:hover{ background:${({ theme }) => theme.colours.primaryDark}; }
  `,
  danger: css`
    background:${({ theme }) => theme.colours.danger};
    color:#fff;
    &:hover{ opacity:0.85; }
  `,
  ghost: css`
    background:none;
    color:${({ theme }) => theme.colours.primary};
    &:hover{ text-decoration:underline; }
  `
};

export const Button = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding:8px 16px;
  border:none;
  border-radius:${({ theme }) => theme.radius};
  cursor:pointer;
  font-weight:500;
  ${({ variant='primary' }) => variants[variant]}
  transition:background 0.2s ease,opacity 0.2s ease;
`;