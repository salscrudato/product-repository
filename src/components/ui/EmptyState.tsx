import React from 'react';
import styled from 'styled-components';

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
  variant?: 'default' | 'compact';
}

const Container = styled.div<{ $variant?: 'default' | 'compact' }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${props => props.$variant === 'compact' ? '48px 24px' : '80px 32px'};
  text-align: center;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  border: 2px dashed rgba(226, 232, 240, 0.8);
  margin: ${props => props.$variant === 'compact' ? '24px 0' : '40px 0'};
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    background: rgba(255, 255, 255, 0.7);
  }
`;

const IconWrapper = styled.div`
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
  border-radius: 16px;
  margin-bottom: 24px;
  
  svg {
    width: 32px;
    height: 32px;
    color: #6366f1;
  }
`;

const Title = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px 0;
`;

const Description = styled.p`
  font-size: 15px;
  color: #6b7280;
  margin: 0 0 24px 0;
  max-width: 400px;
  line-height: 1.6;
`;

const ActionsContainer = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: ${props => props.$variant === 'secondary'
    ? 'rgba(255, 255, 255, 0.9)'
    : 'linear-gradient(135deg, #6366f1, #8b5cf6)'};
  color: ${props => props.$variant === 'secondary' ? '#6366f1' : 'white'};
  border: ${props => props.$variant === 'secondary'
    ? '1px solid rgba(99, 102, 241, 0.2)'
    : 'none'};
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${props => props.$variant === 'secondary'
    ? '0 2px 8px rgba(99, 102, 241, 0.1)'
    : '0 4px 12px rgba(99, 102, 241, 0.2)'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.$variant === 'secondary'
      ? '0 4px 12px rgba(99, 102, 241, 0.15)'
      : '0 6px 20px rgba(99, 102, 241, 0.3)'};
    ${props => props.$variant === 'secondary' && `
      background: rgba(99, 102, 241, 0.1);
      border-color: rgba(99, 102, 241, 0.3);
    `}
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default'
}) => {
  return (
    <Container $variant={variant}>
      {icon && <IconWrapper>{icon}</IconWrapper>}
      <Title>{title}</Title>
      <Description>{description}</Description>
      {(action || secondaryAction) && (
        <ActionsContainer>
          {action && (
            <ActionButton onClick={action.onClick} $variant={action.variant || 'primary'}>
              {action.icon}
              {action.label}
            </ActionButton>
          )}
          {secondaryAction && (
            <ActionButton onClick={secondaryAction.onClick} $variant="secondary">
              {secondaryAction.icon}
              {secondaryAction.label}
            </ActionButton>
          )}
        </ActionsContainer>
      )}
    </Container>
  );
};

