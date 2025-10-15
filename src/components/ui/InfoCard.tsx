import React from 'react';
import styled from 'styled-components';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

type InfoCardVariant = 'info' | 'success' | 'warning' | 'error' | 'neutral';

interface InfoCardProps {
  variant?: InfoCardVariant;
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const variantConfig: Record<InfoCardVariant, { 
  background: string; 
  border: string; 
  iconColor: string;
  titleColor: string;
}> = {
  info: {
    background: 'rgba(59, 130, 246, 0.05)',
    border: 'rgba(59, 130, 246, 0.2)',
    iconColor: '#1d4ed8',
    titleColor: '#1e40af',
  },
  success: {
    background: 'rgba(16, 185, 129, 0.05)',
    border: 'rgba(16, 185, 129, 0.2)',
    iconColor: '#047857',
    titleColor: '#065f46',
  },
  warning: {
    background: 'rgba(245, 158, 11, 0.05)',
    border: 'rgba(245, 158, 11, 0.2)',
    iconColor: '#d97706',
    titleColor: '#b45309',
  },
  error: {
    background: 'rgba(220, 38, 38, 0.05)',
    border: 'rgba(220, 38, 38, 0.2)',
    iconColor: '#dc2626',
    titleColor: '#b91c1c',
  },
  neutral: {
    background: 'rgba(107, 114, 128, 0.05)',
    border: 'rgba(107, 114, 128, 0.2)',
    iconColor: '#6b7280',
    titleColor: '#4b5563',
  },
};

const Card = styled.div<{ $variant: InfoCardVariant }>`
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: ${props => variantConfig[props.$variant].background};
  border: 1px solid ${props => variantConfig[props.$variant].border};
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px ${props => variantConfig[props.$variant].border};
  }
`;

const IconWrapper = styled.div<{ $variant: InfoCardVariant }>`
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: 20px;
    height: 20px;
    color: ${props => variantConfig[props.$variant].iconColor};
  }
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.h4<{ $variant: InfoCardVariant }>`
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: ${props => variantConfig[props.$variant].titleColor};
  line-height: 1.4;
`;

const Body = styled.div`
  font-size: 14px;
  color: #4b5563;
  line-height: 1.6;

  p {
    margin: 0 0 8px 0;
    
    &:last-child {
      margin-bottom: 0;
    }
  }

  ul, ol {
    margin: 8px 0;
    padding-left: 20px;
  }

  li {
    margin: 4px 0;
  }

  strong {
    font-weight: 600;
    color: #1f2937;
  }

  code {
    background: rgba(0, 0, 0, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 13px;
  }
`;

const DismissButton = styled.button`
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  transition: color 0.2s ease;
  padding: 0;

  &:hover {
    color: #4b5563;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

export const InfoCard: React.FC<InfoCardProps> = ({ 
  variant = 'info',
  title,
  children,
  icon,
  dismissible = false,
  onDismiss
}) => {
  return (
    <Card $variant={variant}>
      <IconWrapper $variant={variant}>
        {icon || <InformationCircleIcon />}
      </IconWrapper>
      <Content>
        {title && <Title $variant={variant}>{title}</Title>}
        <Body>{children}</Body>
      </Content>
      {dismissible && onDismiss && (
        <DismissButton onClick={onDismiss} aria-label="Dismiss">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </DismissButton>
      )}
    </Card>
  );
};

// Convenience components for common use cases
export const InsuranceTermCard: React.FC<{ term: string; definition: string }> = ({ 
  term, 
  definition 
}) => (
  <InfoCard variant="info" title={term}>
    <p>{definition}</p>
  </InfoCard>
);

export const CoverageNoteCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <InfoCard variant="warning" title="Coverage Note">
    {children}
  </InfoCard>
);

export const ComplianceAlertCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <InfoCard variant="error" title="Compliance Alert">
    {children}
  </InfoCard>
);

export const BestPracticeCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <InfoCard variant="success" title="Best Practice">
    {children}
  </InfoCard>
);

