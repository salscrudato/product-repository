/**
 * FormLinkCard Component
 * 
 * Displays a linked form with role badge, state scope, and actions.
 * Supports drag-to-reorder and inline editing.
 */

import React, { useState, memo } from 'react';
import styled from 'styled-components';
import {
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  Bars3Icon,
  MapPinIcon,
  CalendarIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { CoverageFormLink, FormRole } from '@app-types';
import { getFormRoleDisplayName, getFormRoleColor } from '../../services/coverageFormLinkService';
import { colors } from '../common/DesignSystem';

interface FormLinkCardProps {
  link: CoverageFormLink;
  formName?: string;
  formNumber?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  isDragging?: boolean;
  dragHandleProps?: any;
}

export const FormLinkCard: React.FC<FormLinkCardProps> = ({
  link,
  formName,
  formNumber,
  onEdit,
  onDelete,
  onView,
  isDragging = false,
  dragHandleProps
}) => {
  const [showActions, setShowActions] = useState(false);
  const roleColor = getFormRoleColor(link.role);

  const formatDate = (date: Date | { toDate(): Date } | undefined) => {
    if (!date) return null;
    const d = typeof (date as { toDate?: () => Date }).toDate === 'function'
      ? (date as { toDate(): Date }).toDate()
      : date as Date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Card
      $isDragging={isDragging}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {dragHandleProps && (
        <DragHandle {...dragHandleProps}>
          <Bars3Icon />
        </DragHandle>
      )}

      <FormIcon $color={roleColor}>
        <DocumentTextIcon />
      </FormIcon>

      <Content>
        <Header>
          <FormInfo>
            {formNumber && <FormNumber>{formNumber}</FormNumber>}
            <FormName>{formName || link.formId}</FormName>
          </FormInfo>
          <RoleBadge $color={roleColor}>
            {getFormRoleDisplayName(link.role)}
          </RoleBadge>
        </Header>

        <Metadata>
          {link.stateScope && link.stateScope.length > 0 && (
            <MetaItem>
              <MapPinIcon />
              <span>
                {link.stateScope.length === 1 
                  ? link.stateScope[0]
                  : `${link.stateScope.length} states`}
              </span>
            </MetaItem>
          )}
          
          {link.effectiveDate && (
            <MetaItem>
              <CalendarIcon />
              <span>Eff: {formatDate(link.effectiveDate)}</span>
            </MetaItem>
          )}

          {link.isMandatory && (
            <MetaItem $highlight>
              <CheckCircleIcon />
              <span>Required</span>
            </MetaItem>
          )}
        </Metadata>

        {link.notes && (
          <Notes>{link.notes}</Notes>
        )}
      </Content>

      <Actions $visible={showActions}>
        {onView && (
          <ActionButton onClick={onView} title="View form">
            <EyeIcon />
          </ActionButton>
        )}
        {onEdit && (
          <ActionButton onClick={onEdit} title="Edit link">
            <PencilIcon />
          </ActionButton>
        )}
        {onDelete && (
          <ActionButton onClick={onDelete} $danger title="Remove link">
            <TrashIcon />
          </ActionButton>
        )}
      </Actions>
    </Card>
  );
};

// Styled Components
const Card = styled.div<{ $isDragging: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: white;
  border: 1px solid ${({ $isDragging }) => $isDragging ? colors.primary : colors.gray200};
  border-radius: 12px;
  transition: all 0.2s ease;
  box-shadow: ${({ $isDragging }) => $isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : 'none'};

  &:hover {
    border-color: ${colors.gray300};
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
`;

const DragHandle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: ${colors.gray400};
  cursor: grab;
  flex-shrink: 0;
  margin-top: 4px;

  svg {
    width: 18px;
    height: 18px;
  }

  &:active {
    cursor: grabbing;
  }
`;

const FormIcon = styled.div<{ $color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ $color }) => `${$color}15`};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 20px;
    height: 20px;
    color: ${({ $color }) => $color};
  }
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
`;

const FormInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const FormNumber = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${colors.gray500};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const FormName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${colors.gray800};
`;

const RoleBadge = styled.span<{ $color: string }>`
  padding: 4px 10px;
  background: ${({ $color }) => `${$color}15`};
  color: ${({ $color }) => $color};
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
`;

const Metadata = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const MetaItem = styled.div<{ $highlight?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: ${({ $highlight }) => $highlight ? colors.success : colors.gray500};

  svg {
    width: 14px;
    height: 14px;
  }
`;

const Notes = styled.div`
  margin-top: 8px;
  padding: 8px 12px;
  background: ${colors.gray50};
  border-radius: 6px;
  font-size: 12px;
  color: ${colors.gray600};
  font-style: italic;
`;

const Actions = styled.div<{ $visible: boolean }>`
  display: flex;
  gap: 4px;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  transition: opacity 0.2s ease;
`;

const ActionButton = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: ${colors.gray100};
  border-radius: 6px;
  cursor: pointer;
  color: ${({ $danger }) => $danger ? colors.error : colors.gray600};
  transition: all 0.2s ease;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    background: ${({ $danger }) => $danger ? `${colors.error}15` : colors.gray200};
    color: ${({ $danger }) => $danger ? colors.error : colors.gray800};
  }
`;

export default memo(FormLinkCard);

