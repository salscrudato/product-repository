import styled, { css, keyframes } from 'styled-components';
import {
  color, neutral, accent, space, radius, shadow, border as borderToken,
  fontFamily, type as typeScale, transition, focusRingStyle, reducedMotion,
} from '../../ui/tokens';

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

/* ---------- Size Styles — token-based ---------- */
const sizeStyles = {
  sm: css`
    padding: ${space[4]};
    border-radius: ${radius.md};
  `,
  md: css`
    padding: ${space[6]};
    border-radius: ${radius.lg};
  `,
  lg: css`
    padding: ${space[8]};
    border-radius: ${radius.xl};
  `,
};

/* ---------- Variant Styles — token-based ---------- */
const variantStyles = {
  default: css`
    background: ${color.bg};
    border: ${borderToken.default};
    box-shadow: ${shadow.card};
  `,
  elevated: css`
    background: ${color.bg};
    border: 1px solid ${neutral[150]};
    box-shadow: ${shadow.md};
  `,
  outlined: css`
    background: transparent;
    border: 1.5px solid ${neutral[200]};
    box-shadow: none;
  `,
  flat: css`
    background: ${color.bgSubtle};
    border: 1px solid transparent;
    box-shadow: none;
  `,
  glass: css`
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: ${shadow.md};
  `,
};

/* ---------- Main Card Component ---------- */
export const Card = styled.div.withConfig({
  shouldForwardProp: (prop) => !['$variant', '$size', '$interactive', '$selected', '$disabled', '$fullHeight', '$animate'].includes(prop as string),
})<CardProps>`
  position: relative;
  font-family: ${fontFamily.sans};
  transition: transform ${transition.spring},
              box-shadow ${transition.normal},
              border-color ${transition.fast},
              background ${transition.fast};

  @media ${reducedMotion} {
    transition: none;
  }

  ${({ $size = 'md' }) => sizeStyles[$size]}
  ${({ $variant = 'default' }) => variantStyles[$variant]}

  ${({ $animate }) => $animate && css`
    animation: ${fadeInUp} 0.35s ease forwards;
    @media ${reducedMotion} { animation: none; }
  `}

  ${({ $fullHeight }) => $fullHeight && css`
    height: 100%;
    display: flex;
    flex-direction: column;
  `}

  ${({ $interactive, $variant }) => $interactive && css`
    cursor: pointer;

    &:hover {
      transform: translateY(-2px);
      box-shadow: ${shadow.cardHover};
      ${$variant === 'outlined' && css`
        border-color: ${accent[400]};
        background: ${color.accentLight};
      `}
      ${$variant === 'flat' && css`
        background: ${color.bgMuted};
        box-shadow: ${shadow.card};
      `}
      ${$variant === 'glass' && css`
        box-shadow: ${shadow.cardHover};
        border-color: ${accent[200]};
      `}
    }

    &:active {
      transform: translateY(0) scale(0.995);
      transition: transform 0.1s ease;
    }

    &:focus-visible {
      ${focusRingStyle}
    }
  `}

  ${({ $selected }) => $selected && css`
    border-color: ${accent[500]};
    box-shadow: 0 0 0 2px ${color.focusRing}, ${shadow.card};
    background: ${color.accentLight};
  `}

  ${({ $disabled }) => $disabled && css`
    opacity: 0.5;
    pointer-events: none;
    cursor: not-allowed;
    filter: grayscale(0.1);
  `}
`;

/* ---------- Card Header ---------- */
export const CardHeader = styled.div<{ $noBorder?: boolean }>`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${space[4]};
  margin-bottom: ${space[5]};
  padding-bottom: ${({ $noBorder }) => $noBorder ? '0' : space[4]};
  border-bottom: ${({ $noBorder }) => $noBorder ? 'none' : borderToken.light};
`;

export const CardHeaderContent = styled.div`
  flex: 1;
  min-width: 0;
`;

export const CardTitle = styled.h3`
  margin: 0;
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.headingSm.size};
  font-weight: ${typeScale.headingSm.weight};
  line-height: ${typeScale.headingSm.lineHeight};
  letter-spacing: ${typeScale.headingSm.letterSpacing};
  color: ${color.text};
`;

export const CardDescription = styled.p`
  margin: ${space[1.5]} 0 0 0;
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.bodySm.size};
  font-weight: ${typeScale.bodySm.weight};
  line-height: ${typeScale.bodySm.lineHeight};
  letter-spacing: ${typeScale.bodySm.letterSpacing};
  color: ${color.textSecondary};
`;

export const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  flex-shrink: 0;
`;

/* ---------- Card Body ---------- */
export const CardBody = styled.div<{ $grow?: boolean }>`
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.bodyMd.size};
  line-height: ${typeScale.bodyMd.lineHeight};
  letter-spacing: ${typeScale.bodyMd.letterSpacing};
  color: ${color.text};

  ${({ $grow }) => $grow && css`
    flex: 1;
  `}
`;

/* ---------- Card Footer ---------- */
export const CardFooter = styled.div<{ $noBorder?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${space[3]};
  margin-top: ${space[4]};
  padding-top: ${({ $noBorder }) => $noBorder ? '0' : space[4]};
  border-top: ${({ $noBorder }) => $noBorder ? 'none' : borderToken.light};
`;

/* ---------- Card Media (for images) ---------- */
export const CardMedia = styled.div<{ $height?: string; $rounded?: boolean }>`
  width: calc(100% + ${space[12]});
  margin: -${space[6]} -${space[6]} ${space[4]} -${space[6]};
  height: ${({ $height }) => $height || '200px'};
  overflow: hidden;
  ${({ $rounded }) => $rounded && css`
    border-radius: ${radius.lg} ${radius.lg} 0 0;
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
  top: ${space[3]};
  right: ${space[3]};
  padding: ${space[1]} ${space[2.5]};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.captionSm.size};
  font-weight: ${typeScale.captionSm.weight};
  line-height: ${typeScale.captionSm.lineHeight};
  border-radius: ${radius.full};

  ${({ $variant = 'primary' }) => {
    const colors = {
      primary: { bg: accent[50], fg: accent[600] },
      success: { bg: color.successLight, fg: color.successDark },
      warning: { bg: color.warningLight, fg: color.warningDark },
      error:   { bg: color.errorLight,   fg: color.errorDark },
      info:    { bg: color.infoLight,    fg: color.infoDark },
    };
    return css`
      background: ${colors[$variant].bg};
      color: ${colors[$variant].fg};
    `;
  }}
`;

/* ---------- Input component (kept for backwards compatibility) ---------- */
export const Input = styled.input`
  width: 100%;
  padding: ${space[3]} ${space[4]};
  border: 1.5px solid ${neutral[200]};
  border-radius: ${radius.md};
  background: ${color.bg};
  color: ${color.text};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.bodySm.size};
  transition: ${transition.colors}, box-shadow ${transition.fast};

  &:hover:not(:disabled):not(:focus) {
    border-color: ${neutral[400]};
  }

  &:focus {
    outline: none;
    border-color: ${accent[500]};
    box-shadow: ${shadow.focus};
  }

  &::placeholder {
    color: ${color.textMuted};
  }

  &:disabled {
    background: ${color.bgSubtle};
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

/* ---------- Text components ---------- */
export const Title = styled.h1`
  color: ${color.text};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.displaySm.size};
  font-weight: ${typeScale.displaySm.weight};
  line-height: ${typeScale.displaySm.lineHeight};
  letter-spacing: ${typeScale.displaySm.letterSpacing};
  margin: 0 0 ${space[4]} 0;
`;

export const Subtitle = styled.p`
  color: ${color.textSecondary};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.bodyLg.size};
  line-height: ${typeScale.bodyLg.lineHeight};
  letter-spacing: ${typeScale.bodyLg.letterSpacing};
  margin: 0 0 ${space[6]} 0;
`;

/* ---------- Card Group for grid layouts ---------- */
export const CardGroup = styled.div<{ $columns?: number; $gap?: string }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns = 3 }) => $columns}, 1fr);
  gap: ${({ $gap }) => $gap || space[6]};

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;
