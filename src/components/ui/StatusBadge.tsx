import React from 'react';
import styled from 'styled-components';

type StatusType = 
  | 'active' 
  | 'inactive' 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'draft' 
  | 'published'
  | 'archived'
  | 'in-review'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

const statusConfig: Record<StatusType, { color: string; background: string; border: string }> = {
  active: {
    color: '#047857',
    background: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.2)',
  },
  inactive: {
    color: '#6b7280',
    background: 'rgba(107, 114, 128, 0.1)',
    border: 'rgba(107, 114, 128, 0.2)',
  },
  pending: {
    color: '#d97706',
    background: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.2)',
  },
  approved: {
    color: '#047857',
    background: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.2)',
  },
  rejected: {
    color: '#dc2626',
    background: 'rgba(220, 38, 38, 0.1)',
    border: 'rgba(220, 38, 38, 0.2)',
  },
  draft: {
    color: '#6b7280',
    background: 'rgba(107, 114, 128, 0.1)',
    border: 'rgba(107, 114, 128, 0.2)',
  },
  published: {
    color: '#1d4ed8',
    background: 'rgba(59, 130, 246, 0.1)',
    border: 'rgba(59, 130, 246, 0.2)',
  },
  archived: {
    color: '#78716c',
    background: 'rgba(120, 113, 108, 0.1)',
    border: 'rgba(120, 113, 108, 0.2)',
  },
  'in-review': {
    color: '#7c3aed',
    background: 'rgba(139, 92, 246, 0.1)',
    border: 'rgba(139, 92, 246, 0.2)',
  },
  success: {
    color: '#047857',
    background: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.2)',
  },
  warning: {
    color: '#d97706',
    background: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.2)',
  },
  error: {
    color: '#dc2626',
    background: 'rgba(220, 38, 38, 0.1)',
    border: 'rgba(220, 38, 38, 0.2)',
  },
  info: {
    color: '#1d4ed8',
    background: 'rgba(59, 130, 246, 0.1)',
    border: 'rgba(59, 130, 246, 0.2)',
  },
};

const sizeConfig = {
  sm: {
    padding: '4px 8px',
    fontSize: '11px',
    dotSize: '6px',
  },
  md: {
    padding: '6px 12px',
    fontSize: '13px',
    dotSize: '8px',
  },
  lg: {
    padding: '8px 16px',
    fontSize: '14px',
    dotSize: '10px',
  },
};

const Badge = styled.span<{ 
  $status: StatusType; 
  $size: 'sm' | 'md' | 'lg';
}>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: ${props => sizeConfig[props.$size].padding};
  font-size: ${props => sizeConfig[props.$size].fontSize};
  font-weight: 600;
  border-radius: 12px;
  border: 1px solid ${props => statusConfig[props.$status].border};
  background: ${props => statusConfig[props.$status].background};
  color: ${props => statusConfig[props.$status].color};
  text-transform: capitalize;
  white-space: nowrap;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px ${props => statusConfig[props.$status].border};
  }
`;

const StatusDot = styled.span<{ 
  $status: StatusType; 
  $size: 'sm' | 'md' | 'lg';
}>`
  width: ${props => sizeConfig[props.$size].dotSize};
  height: ${props => sizeConfig[props.$size].dotSize};
  border-radius: 50%;
  background: ${props => statusConfig[props.$status].color};
  flex-shrink: 0;
`;

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  label,
  size = 'md',
  showDot = true 
}) => {
  const displayLabel = label || status.replace('-', ' ');
  
  return (
    <Badge $status={status} $size={size}>
      {showDot && <StatusDot $status={status} $size={size} />}
      {displayLabel}
    </Badge>
  );
};

// Convenience components for common insurance statuses
export const ActiveBadge: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size }) => (
  <StatusBadge status="active" label="Active" size={size} />
);

export const InactiveBadge: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size }) => (
  <StatusBadge status="inactive" label="Inactive" size={size} />
);

export const PendingBadge: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size }) => (
  <StatusBadge status="pending" label="Pending" size={size} />
);

export const ApprovedBadge: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size }) => (
  <StatusBadge status="approved" label="Approved" size={size} />
);

export const DraftBadge: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size }) => (
  <StatusBadge status="draft" label="Draft" size={size} />
);

export const PublishedBadge: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size }) => (
  <StatusBadge status="published" label="Published" size={size} />
);

