import styled, { css, keyframes } from 'styled-components';

/* ---------- Subtle entrance animation ---------- */
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

/* ---------- Card Types ---------- */
type CardVariant = 'default' | 'elevated' | 'outlined' | 'flat' | 'glass';
type CardSize = 'sm' | 'md' | 'lg';

interface CardProps {
  $variant?: CardVariant;
  $size?: CardSize;
  $interactive?: boolean;
  $selected?: boolean;
  $disabled?: boolean;
  $fullHeight?: boolean;
  $animate?: boolean;
}

/* ---------- Size Styles - Refined ---------- */
const sizeStyles = {
  sm: css`
    padding: 16px;
    border-radius: 10px;
  `,
  md: css`
    padding: 24px;
    border-radius: 14px;
  `,
  lg: css`
    padding: 32px;
    border-radius: 18px;
  `,
};

/* ---------- Variant Styles - Enhanced ---------- */
const variantStyles = {
  default: css`
    background: ${({ theme }) => theme.colours.background};
    border: 1px solid ${({ theme }) => theme.colours.border};
    box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03);
  `,
  elevated: css`
    background: ${({ theme }) => theme.colours.background};
    border: 1px solid rgba(226, 232, 240, 0.5);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.03);
  `,
  outlined: css`
    background: transparent;
    border: 1.5px solid ${({ theme }) => theme.colours.border};
    box-shadow: none;
  `,
  flat: css`
    background: ${({ theme }) => theme.colours.backgroundAlt};
    border: 1px solid transparent;
    box-shadow: none;
  `,
  glass: css`
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 4px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
  `,
};

/* ---------- Main Card Component - Enhanced ---------- */
export const Card = styled.div.withConfig({
  shouldForwardProp: (prop) => !['$variant', '$size', '$interactive', '$selected', '$disabled', '$fullHeight', '$animate'].includes(prop as string),
})<CardProps>`
  position: relative;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.2s ease,
              border-color 0.2s ease,
              background 0.2s ease;

  ${({ $size = 'md' }) => sizeStyles[$size]}
  ${({ $variant = 'default' }) => variantStyles[$variant]}

  ${({ $animate }) => $animate && css`
    animation: ${fadeInUp} 0.35s ease forwards;
  `}

  ${({ $fullHeight }) => $fullHeight && css`
    height: 100%;
    display: flex;
    flex-direction: column;
  `}

  ${({ $interactive, $variant }) => $interactive && css`
    cursor: pointer;

    &:hover {
      transform: translateY(-3px);
      ${$variant === 'elevated' && css`
        box-shadow: 0 8px 24px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04);
        border-color: rgba(99, 102, 241, 0.15);
      `}
      ${$variant === 'default' && css`
        box-shadow: 0 6px 20px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04);
        border-color: rgba(99, 102, 241, 0.25);
      `}
      ${$variant === 'outlined' && css`
        border-color: ${({ theme }) => theme.colours.primary};
        background: rgba(99, 102, 241, 0.03);
      `}
      ${$variant === 'flat' && css`
        background: ${({ theme }) => theme.colours.hover};
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      `}
      ${$variant === 'glass' && css`
        box-shadow: 0 8px 32px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04);
        border-color: rgba(99, 102, 241, 0.2);
      `}
    }

    &:active {
      transform: translateY(-1px) scale(0.995);
      transition: transform 0.1s ease;
    }

    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
      border-color: ${({ theme }) => theme.colours.primary};
    }
  `}

  ${({ $selected, theme }) => $selected && css`
    border-color: ${theme.colours.primary};
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2), 0 4px 12px rgba(99, 102, 241, 0.1);
    background: rgba(99, 102, 241, 0.03);
  `}

  ${({ $disabled }) => $disabled && css`
    opacity: 0.5;
    pointer-events: none;
    cursor: not-allowed;
    filter: grayscale(0.1);
  `}
`;

/* ---------- Card Header - Enhanced ---------- */
export const CardHeader = styled.div<{ $noBorder?: boolean }>`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: ${({ $noBorder }) => $noBorder ? '0' : '16px'};
  border-bottom: ${({ $noBorder, theme }) => $noBorder ? 'none' : `1px solid ${theme.colours.border}`};
`;

export const CardHeaderContent = styled.div`
  flex: 1;
  min-width: 0;
`;

export const CardTitle = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
  line-height: 1.35;
  letter-spacing: -0.01em;
`;

export const CardDescription = styled.p`
  margin: 6px 0 0 0;
  font-size: 14px;
  color: ${({ theme }) => theme.colours.textSecondary};
  line-height: 1.55;
`;

export const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

/* ---------- Card Body ---------- */
export const CardBody = styled.div<{ $grow?: boolean }>`
  ${({ $grow }) => $grow && css`
    flex: 1;
  `}
`;

/* ---------- Card Footer ---------- */
export const CardFooter = styled.div<{ $noBorder?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: ${({ $noBorder }) => $noBorder ? '0' : '16px'};
  border-top: ${({ $noBorder, theme }) => $noBorder ? 'none' : `1px solid ${theme.colours.border}`};
`;

/* ---------- Card Media (for images) ---------- */
export const CardMedia = styled.div<{ $height?: string; $rounded?: boolean }>`
  width: calc(100% + 48px);
  margin: -24px -24px 16px -24px;
  height: ${({ $height }) => $height || '200px'};
  overflow: hidden;
  ${({ $rounded }) => $rounded && css`
    border-radius: ${({ theme }) => theme.radius} ${({ theme }) => theme.radius} 0 0;
  `}

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

/* ---------- Card Badge ---------- */
export const CardBadge = styled.span<{ $variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' }>`
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 20px;

  ${({ $variant = 'primary', theme }) => {
    const colors = {
      primary: { bg: theme.colours.primaryLight, color: theme.colours.primary },
      success: { bg: theme.colours.successLight, color: theme.colours.successDark || theme.colours.success },
      warning: { bg: theme.colours.warningLight, color: theme.colours.warningDark || theme.colours.warning },
      error: { bg: theme.colours.errorLight, color: theme.colours.errorDark || theme.colours.error },
      info: { bg: theme.colours.infoLight, color: theme.colours.infoDark || theme.colours.info },
    };
    return css`
      background: ${colors[$variant].bg};
      color: ${colors[$variant].color};
    `;
  }}
`;

/* ---------- Input component (kept for backwards compatibility) ---------- */
export const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid ${({ theme }) => theme.colours.border};
  border-radius: ${({ theme }) => theme.radius};
  background: ${({ theme }) => theme.colours.background};
  color: ${({ theme }) => theme.colours.text};
  font-size: 14px;
  transition: all 0.2s ease;

  &:hover:not(:disabled):not(:focus) {
    border-color: ${({ theme }) => theme.colours.textSecondary};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colours.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colours.focusRing || 'rgba(99, 102, 241, 0.15)'};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colours.textMuted || '#9ca3af'};
  }

  &:disabled {
    background: ${({ theme }) => theme.colours.backgroundAlt};
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

/* ---------- Text components ---------- */
export const Title = styled.h1`
  color: ${({ theme }) => theme.colours.text};
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 16px 0;
  letter-spacing: -0.025em;
  line-height: 1.2;
`;

export const Subtitle = styled.p`
  color: ${({ theme }) => theme.colours.textSecondary || theme.colours.secondaryText};
  font-size: 1rem;
  margin: 0 0 24px 0;
  line-height: 1.6;
`;

/* ---------- Card Group for grid layouts ---------- */
export const CardGroup = styled.div<{ $columns?: number; $gap?: string }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns = 3 }) => $columns}, 1fr);
  gap: ${({ $gap = '24px' }) => $gap};

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;