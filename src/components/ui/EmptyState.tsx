import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import {
  color, neutral, accent, space, radius,
  type as typeScale, transition, duration, easing,
  focusRingStyle, reducedMotion,
} from '../../ui/tokens';

/* ── Entrance ── */
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

/* ── Types ── */
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: 'primary' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  variant?: 'default' | 'compact' | 'minimal' | 'card';
  isLoading?: boolean;
  illustration?: React.ReactNode;
}

/* ── Container ── */
const Container = styled.div<{ $variant?: string; $isLoading?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  animation: ${fadeIn} ${duration.normal} ${easing.out};

  ${({ $variant }) => {
    switch ($variant) {
      case 'compact':
        return css`padding: ${space[8]} ${space[5]};`;
      case 'minimal':
        return css`padding: ${space[10]} ${space[6]};`;
      case 'card':
        return css`
          padding: ${space[10]} ${space[8]};
          background: ${neutral[0]};
          border-radius: ${radius.xl};
          border: 1px solid ${neutral[200]};
        `;
      default:
        return css`padding: ${space[12]} ${space[8]};`;
    }
  }}

  ${({ $isLoading }) => $isLoading && css`
    pointer-events: none;
    opacity: 0.6;
  `}

  @media ${reducedMotion} { animation: none; }
`;

/* ── Icon ── */
const IconWrapper = styled.div<{ $isLoading?: boolean; $size?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  background: ${neutral[100]};
  border-radius: ${radius.xl};
  margin-bottom: ${space[4]};
  color: ${neutral[400]};

  svg { width: 24px; height: 24px; }
`;

const IllustrationWrapper = styled.div`
  margin-bottom: ${space[5]};
  max-width: 160px;
  img, svg { width: 100%; height: auto; }
`;

const Title = styled.h3`
  font-size: ${typeScale.headingSm.size};
  font-weight: ${typeScale.headingSm.weight};
  letter-spacing: ${typeScale.headingSm.letterSpacing};
  color: ${color.text};
  margin: 0 0 ${space[1.5]};
`;

const Description = styled.p`
  color: ${neutral[500]};
  margin: 0 0 ${space[5]};
  max-width: 360px;
  font-size: ${typeScale.bodySm.size};
  line-height: ${typeScale.bodySm.lineHeight};
`;

const ActionsContainer = styled.div`
  display: flex;
  gap: ${space[2]};
  align-items: center;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: inline-flex;
  align-items: center;
  gap: ${space[1.5]};
  padding: ${space[2]} ${space[4]};
  border-radius: ${radius.md};
  font-size: ${typeScale.bodySm.size};
  font-weight: 500;
  cursor: pointer;
  transition: background ${transition.fast}, border-color ${transition.fast};

  ${({ $variant }) => $variant === 'secondary' ? css`
    background: ${neutral[0]};
    color: ${color.text};
    border: 1px solid ${neutral[200]};
    &:hover { background: ${neutral[50]}; border-color: ${neutral[300]}; }
  ` : css`
    background: ${accent[600]};
    color: ${color.textInverse};
    border: 1px solid transparent;
    &:hover { background: ${accent[700]}; }
  `}

  &:focus-visible { ${focusRingStyle} }
  &:disabled { opacity: 0.45; cursor: not-allowed; }

  svg { width: 15px; height: 15px; flex-shrink: 0; }

  @media ${reducedMotion} { transition: none; }
`;

const LoadingPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${space[2]};
`;

const LoadingBar = styled.div<{ $width: string }>`
  height: 10px;
  width: ${({ $width }) => $width};
  background: linear-gradient(90deg, ${neutral[100]} 0%, ${neutral[200]} 50%, ${neutral[100]} 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: ${radius.sm};
  @media ${reducedMotion} { animation: none; }
`;

/* ── Component ── */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
  isLoading = false,
  illustration,
}) => {
  if (isLoading) {
    return (
      <Container $variant={variant} $isLoading>
        <IconWrapper $isLoading>{icon}</IconWrapper>
        <LoadingPlaceholder>
          <LoadingBar $width="160px" />
          <LoadingBar $width="240px" />
          <LoadingBar $width="200px" />
        </LoadingPlaceholder>
      </Container>
    );
  }

  return (
    <Container $variant={variant}>
      {illustration && <IllustrationWrapper>{illustration}</IllustrationWrapper>}
      {icon && !illustration && <IconWrapper>{icon}</IconWrapper>}
      <Title>{title}</Title>
      <Description>{description}</Description>
      {(action || secondaryAction) && (
        <ActionsContainer>
          {action && (
            <ActionButton onClick={action.onClick} $variant={action.variant || 'primary'} type="button">
              {action.icon}
              {action.label}
            </ActionButton>
          )}
          {secondaryAction && (
            <ActionButton onClick={secondaryAction.onClick} $variant="secondary" type="button">
              {secondaryAction.icon}
              {secondaryAction.label}
            </ActionButton>
          )}
        </ActionsContainer>
      )}
    </Container>
  );
};
