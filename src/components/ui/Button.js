import styled, { css } from 'styled-components';

const variants = {
  primary: css`
    background: ${({ theme }) => theme.isDarkMode
      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.8) 0%, rgba(59, 130, 246, 0.8) 50%, rgba(168, 85, 247, 0.8) 100%)'
      : theme.colours.gradient
    };
    color: #fff;
    backdrop-filter: ${({ theme }) => theme.isDarkMode ? 'blur(10px)' : 'none'};
    border: ${({ theme }) => theme.isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'};
    box-shadow: ${({ theme }) => theme.isDarkMode
      ? '0 4px 20px rgba(139, 92, 246, 0.3)'
      : 'none'
    };

    &:hover {
      background: ${({ theme }) => theme.isDarkMode
        ? 'linear-gradient(135deg, rgba(139, 92, 246, 1) 0%, rgba(59, 130, 246, 1) 50%, rgba(168, 85, 247, 1) 100%)'
        : theme.colours.primaryDark
      };
      transform: ${({ theme }) => theme.isDarkMode ? 'translateY(-2px)' : 'none'};
      box-shadow: ${({ theme }) => theme.isDarkMode
        ? '0 8px 32px rgba(139, 92, 246, 0.4)'
        : 'none'
      };
    }
  `,
  danger: css`
    background: ${({ theme }) => theme.colours.danger};
    color: #fff;
    &:hover { opacity: 0.85; }
  `,
  ghost: css`
    background: none;
    color: ${({ theme }) => theme.colours.primary};
    &:hover { text-decoration: underline; }
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

export const Button = styled.button.withConfig({
  shouldForwardProp: (prop) => !['variant', 'size'].includes(prop),
})`
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: ${({ theme }) => theme.radius};
  cursor: pointer;
  font-weight: 500;
  ${({ variant='primary' }) => variants[variant]}
  ${({ size='md' }) => sizes[size]}
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
`;