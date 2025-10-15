/**
 * RuleCard Component
 * Reusable card component for displaying rule information
 */

import React from 'react';
import styled from 'styled-components';
import { Rule } from '../../types';
import {
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  TagIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid';
import { getRuleTypeColor, getRuleStatusColor } from '../../utils/ruleValidation';

interface RuleCardProps {
  rule: Rule;
  productName?: string;
  targetName?: string;
  onEdit?: (rule: Rule) => void;
  onDelete?: (rule: Rule) => void;
  onSelect?: (rule: Rule) => void;
  isSelected?: boolean;
  showActions?: boolean;
}

export const RuleCard: React.FC<RuleCardProps> = ({
  rule,
  productName,
  targetName,
  onEdit,
  onDelete,
  onSelect,
  isSelected = false,
  showActions = true
}) => {
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(rule);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(rule);
  };

  const handleCardClick = () => {
    onSelect?.(rule);
  };

  const getRuleTypeIcon = () => {
    switch (rule.ruleType) {
      case 'Coverage':
        return <ShieldCheckIcon />;
      case 'Forms':
        return <DocumentTextIcon />;
      case 'Pricing':
        return <CurrencyDollarIcon />;
      case 'Product':
        return <BuildingOfficeIcon />;
      default:
        return <TagIcon />;
    }
  };

  return (
    <Card onClick={handleCardClick} $isSelected={isSelected}>
      <CardHeader>
        <CardTitle>{rule.name}</CardTitle>
        {showActions && (
          <CardActions>
            {onEdit && (
              <IconButton onClick={handleEdit} title="Edit rule">
                <PencilIcon />
              </IconButton>
            )}
            {onDelete && (
              <IconButton className="danger" onClick={handleDelete} title="Delete rule">
                <TrashIcon />
              </IconButton>
            )}
          </CardActions>
        )}
      </CardHeader>

      <CardContent>
        {/* Rule Type and Category Badges */}
        <BadgeRow>
          <Badge $color={getRuleTypeColor(rule.ruleType)}>
            {getRuleTypeIcon()}
            {rule.ruleType} Rule
          </Badge>
          <Badge $color="#22c55e">
            <TagIcon />
            {rule.ruleCategory}
          </Badge>
          <StatusBadge $color={getRuleStatusColor(rule.status)}>
            <ClockIcon />
            {rule.status}
          </StatusBadge>
          {rule.proprietary && (
            <Badge $color="#f59e0b">
              <ExclamationTriangleIcon />
              Proprietary
            </Badge>
          )}
        </BadgeRow>

        {/* Product and Target Info */}
        {(productName || targetName) && (
          <InfoRow>
            {productName && <InfoText>Product: {productName}</InfoText>}
            {targetName && <InfoText>Target: {targetName}</InfoText>}
          </InfoRow>
        )}

        {/* Condition */}
        <Section>
          <SectionLabel>Condition</SectionLabel>
          <SectionContent>{rule.condition}</SectionContent>
        </Section>

        {/* Outcome */}
        <Section>
          <SectionLabel>Outcome</SectionLabel>
          <SectionContent>{rule.outcome}</SectionContent>
        </Section>

        {/* Reference */}
        {rule.reference && (
          <Section>
            <SectionLabel>Reference</SectionLabel>
            <SectionContent>{rule.reference}</SectionContent>
          </Section>
        )}

        {/* Priority */}
        {rule.priority !== undefined && (
          <PriorityIndicator>
            Priority: {rule.priority}
          </PriorityIndicator>
        )}
      </CardContent>
    </Card>
  );
};

// Styled Components
const Card = styled.div<{ $isSelected: boolean }>`
  background: white;
  border-radius: 12px;
  border: 2px solid ${props => props.$isSelected ? '#6366f1' : 'rgba(226, 232, 240, 0.8)'};
  padding: 20px;
  transition: all 0.2s ease;
  cursor: ${props => props.onClick ? 'pointer' : 'default'};

  &:hover {
    border-color: ${props => props.$isSelected ? '#6366f1' : '#cbd5e1'};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 12px;
`;

const CardTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  flex: 1;
  line-height: 1.4;
`;

const CardActions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  background: white;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.05);
    color: #6366f1;
  }

  &.danger:hover {
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.05);
    color: #ef4444;
  }
`;

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Badge = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  background: ${props => `${props.$color}15`};
  color: ${props => props.$color};
  border: 1px solid ${props => `${props.$color}30`};

  svg {
    width: 14px;
    height: 14px;
  }
`;

const StatusBadge = styled(Badge)`
  font-weight: 600;
`;

const InfoRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 8px 0;
  border-top: 1px solid #f1f5f9;
  border-bottom: 1px solid #f1f5f9;
`;

const InfoText = styled.span`
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SectionLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SectionContent = styled.div`
  font-size: 14px;
  color: #334155;
  line-height: 1.6;
  white-space: pre-wrap;
`;

const PriorityIndicator = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  align-self: flex-start;
`;

export default RuleCard;

