import React from 'react';
import styled, { keyframes, css } from 'styled-components';

/* ---------- Animations ---------- */
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const float = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
`;

/* ---------- Types ---------- */
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

/* ---------- Styled Components ---------- */
const Container = styled.div<{ $variant?: 'default' | 'compact' | 'minimal' | 'card'; $isLoading?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  animation: ${fadeInUp} 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transition: all 0.3s ease;

  ${({ $variant }) => {
    switch ($variant) {
      case 'compact':
        return css`
          padding: 32px 20px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 12px;
          border: 2px dashed rgba(226, 232, 240, 0.8);
          margin: 16px 0;
        `;
      case 'minimal':
        return css`
          padding: 48px 24px;
          background: transparent;
          border: none;
          margin: 24px 0;
        `;
      case 'card':
        return css`
          padding: 48px 32px;
          background: white;
          border-radius: 16px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
          margin: 24px 0;
        `;
      default:
        return css`
          padding: 64px 32px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 16px;
          border: 2px dashed rgba(226, 232, 240, 0.8);
          margin: 32px 0;
        `;
    }
  }}

  ${({ $variant }) => ($variant === 'default' || $variant === 'compact') && css`
    &:hover {
      border-color: rgba(99, 102, 241, 0.3);
      background: rgba(255, 255, 255, 0.7);
    }
  `}

  ${({ $isLoading }) => $isLoading && css`
    pointer-events: none;
    opacity: 0.7;
  `}

  @media (max-width: 768px) {
    padding: ${({ $variant }) => $variant === 'compact' ? '24px 16px' : '40px 20px'};
  }
`;

const IconWrapper = styled.div<{ $isLoading?: boolean; $size?: 'sm' | 'md' | 'lg' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colours.gradientSubtle};
  border-radius: 20px;
  margin-bottom: 20px;
  transition: all 0.3s ease;

  ${({ $size = 'md' }) => {
    switch ($size) {
      case 'sm':
        return css`
          width: 48px;
          height: 48px;
          border-radius: 14px;
          svg { width: 24px; height: 24px; }
        `;
      case 'lg':
        return css`
          width: 80px;
          height: 80px;
          border-radius: 24px;
          svg { width: 40px; height: 40px; }
        `;
      default:
        return css`
          width: 64px;
          height: 64px;
          border-radius: 18px;
          svg { width: 32px; height: 32px; }
        `;
    }
  }}

  svg {
    color: ${({ theme }) => theme.colours.primary};
    transition: all 0.3s ease;
  }

  &:hover svg {
    animation: ${float} 2s ease-in-out infinite;
  }

  ${({ $isLoading }) => $isLoading && css`
    animation: ${pulse} 1.5s ease-in-out infinite;
  `}
`;

const IllustrationWrapper = styled.div`
  margin-bottom: 24px;
  max-width: 200px;
  animation: ${float} 4s ease-in-out infinite;

  img, svg {
    width: 100%;
    height: auto;
  }
`;

const Title = styled.h3<{ $size?: 'sm' | 'md' | 'lg' }>`
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
  margin: 0 0 8px 0;
  letter-spacing: -0.02em;

  ${({ $size = 'md' }) => {
    switch ($size) {
      case 'sm':
        return css`font-size: 16px;`;
      case 'lg':
        return css`font-size: 24px;`;
      default:
        return css`font-size: 20px;`;
    }
  }}
`;

const Description = styled.p<{ $size?: 'sm' | 'md' | 'lg' }>`
  color: ${({ theme }) => theme.colours.textSecondary};
  margin: 0 0 24px 0;
  max-width: 420px;
  line-height: 1.6;

  ${({ $size = 'md' }) => {
    switch ($size) {
      case 'sm':
        return css`font-size: 13px; max-width: 320px;`;
      case 'lg':
        return css`font-size: 16px; max-width: 500px;`;
      default:
        return css`font-size: 15px;`;
    }
  }}
`;

const ActionsContainer = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: ${({ theme }) => theme.radiusMd};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  ${({ $variant, theme }) => $variant === 'secondary' ? css`
    background: ${theme.colours.background};
    color: ${theme.colours.primary};
    border: 1.5px solid ${theme.colours.focusRing};
    box-shadow: ${theme.shadowSm};

    &:hover {
      background: ${theme.colours.hoverSubtle};
      border-color: ${theme.colours.primary};
      transform: translateY(-2px);
      box-shadow: ${theme.shadowMd};
    }

    &:active {
      transform: translateY(0);
    }

    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px ${theme.colours.focusRing};
    }
  ` : css`
    background: ${theme.colours.gradient};
    color: ${theme.colours.textInverse};
    border: none;
    box-shadow: ${theme.shadowPrimary};

    &:hover {
      filter: brightness(1.05);
      transform: translateY(-2px);
      box-shadow: ${theme.shadowPrimaryHover};
    }

    &:active {
      transform: translateY(0);
      box-shadow: ${theme.shadowPrimary};
    }

    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px ${theme.colours.focusRing}, ${theme.shadowPrimary};
    }

    /* Shimmer effect */
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        ${theme.colours.shimmer},
        transparent
      );
      transition: left 0.5s ease;
    }

    &:hover::before {
      left: 100%;
    }
  `}

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const LoadingPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

const LoadingBar = styled.div<{ $width: string }>`
  height: 12px;
  width: ${({ $width }) => $width};
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colours.border} 0%,
    ${({ theme }) => theme.colours.backgroundSubtle} 50%,
    ${({ theme }) => theme.colours.border} 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: ${({ theme }) => theme.radiusSm};
`;

/* ---------- Main Component ---------- */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
  isLoading = false,
  illustration
}) => {
  const size = variant === 'compact' ? 'sm' : variant === 'minimal' ? 'md' : 'md';

  if (isLoading) {
    return (
      <Container $variant={variant} $isLoading>
        <IconWrapper $isLoading $size={size}>
          {icon}
        </IconWrapper>
        <LoadingPlaceholder>
          <LoadingBar $width="180px" />
          <LoadingBar $width="260px" />
          <LoadingBar $width="220px" />
        </LoadingPlaceholder>
      </Container>
    );
  }

  return (
    <Container $variant={variant}>
      {illustration && (
        <IllustrationWrapper>{illustration}</IllustrationWrapper>
      )}
      {icon && !illustration && (
        <IconWrapper $size={size}>{icon}</IconWrapper>
      )}
      <Title $size={size}>{title}</Title>
      <Description $size={size}>{description}</Description>
      {(action || secondaryAction) && (
        <ActionsContainer>
          {action && (
            <ActionButton
              onClick={action.onClick}
              $variant={action.variant || 'primary'}
              type="button"
            >
              {action.icon}
              {action.label}
            </ActionButton>
          )}
          {secondaryAction && (
            <ActionButton
              onClick={secondaryAction.onClick}
              $variant="secondary"
              type="button"
            >
              {secondaryAction.icon}
              {secondaryAction.label}
            </ActionButton>
          )}
        </ActionsContainer>
      )}
    </Container>
  );
};
