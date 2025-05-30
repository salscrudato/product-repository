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

const sizes = {
  sm: css`
    padding: 6px 12px;
    font-size: 12px;
    gap: 4px;
  `,
  md: css`
    padding: 8px 16px;
    font-size: 14px;
    gap: 6px;
  `,
  lg: css`
    padding: 12px 20px;
    font-size: 16px;
    gap: 8px;
  `
};

export const Button = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  border:none;
  border-radius:${({ theme }) => theme.radius};
  cursor:pointer;
  font-weight:500;
  ${({ variant='primary' }) => variants[variant]}
  ${({ size='md' }) => sizes[size]}
  transition:background 0.2s ease,opacity 0.2s ease;
`;