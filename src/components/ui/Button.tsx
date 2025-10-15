import styled, { css } from 'styled-components';

const variants = {
  primary: css`
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #fff;
    border: none;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);

    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #5b5bf6, #7c3aed);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.3);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }
  `,
  secondary: css`
    background: rgba(255, 255, 255, 0.9);
    color: #6366f1;
    border: 1px solid rgba(99, 102, 241, 0.2);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);

    &:hover:not(:disabled) {
      background: rgba(99, 102, 241, 0.1);
      border-color: rgba(99, 102, 241, 0.3);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
    }
  `,
  danger: css`
    background: #dc2626;
    color: #fff;
    border: none;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);

    &:hover:not(:disabled) {
      background: #b91c1c;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(220, 38, 38, 0.3);
    }
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.colours.primary};
    border: none;

    &:hover:not(:disabled) {
      background: rgba(99, 102, 241, 0.05);
    }
  `,
  outline: css`
    background: transparent;
    color: #6366f1;
    border: 1px solid #6366f1;

    &:hover:not(:disabled) {
      background: rgba(99, 102, 241, 0.05);
      border-color: #5b5bf6;
    }
  `
};

const sizes = {
  sm: css`
    padding: 6px 12px;
    font-size: 13px;
    gap: 4px;
    border-radius: 8px;
  `,
  md: css`
    padding: 10px 16px;
    font-size: 14px;
    gap: 6px;
    border-radius: 10px;
  `,
  lg: css`
    padding: 12px 24px;
    font-size: 16px;
    gap: 8px;
    border-radius: 12px;
  `
};

export const Button = styled.button.withConfig({
  shouldForwardProp: (prop) => !['variant', 'size', 'fullWidth'].includes(prop),
})<{ variant?: keyof typeof variants; size?: keyof typeof sizes; fullWidth?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  font-weight: 600;
  ${({ variant='primary' }) => variants[variant]}
  ${({ size='md' }) => sizes[size]}
  ${({ fullWidth }) => fullWidth && 'width: 100%;'}
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  font-family: ${({ theme }) => theme.font};
  letter-spacing: -0.01em;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  svg {
    flex-shrink: 0;
  }
`;