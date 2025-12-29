/**
 * LimitOptionSetTable Component
 * 
 * Table component for displaying and managing limit options within a set.
 * Features drag-to-reorder, default selection, and applicability badges.
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import {
  Bars3Icon,
  StarIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import {
  CoverageLimitOption,
  CoverageLimitOptionSet,
  LimitApplicability
} from '@types';
import { colors } from '../common/DesignSystem';

interface LimitOptionSetTableProps {
  optionSet: CoverageLimitOptionSet;
  options: CoverageLimitOption[];
  onAddOption: () => void;
  onEditOption: (option: CoverageLimitOption) => void;
  onDeleteOption: (optionId: string) => void;
  onSetDefault: (optionId: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onToggleEnabled: (optionId: string, enabled: boolean) => void;
}

export const LimitOptionSetTable: React.FC<LimitOptionSetTableProps> = ({
  optionSet,
  options,
  onAddOption,
  onEditOption,
  onDeleteOption,
  onSetDefault,
  onReorder,
  onToggleEnabled
}) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggedId) {
      setDragOverId(id);
    }
  }, [draggedId]);

  const handleDragEnd = useCallback(() => {
    if (draggedId && dragOverId && draggedId !== dragOverId) {
      const currentOrder = options.map(o => o.id);
      const draggedIndex = currentOrder.indexOf(draggedId);
      const targetIndex = currentOrder.indexOf(dragOverId);
      
      const newOrder = [...currentOrder];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedId);
      
      onReorder(newOrder);
    }
    setDraggedId(null);
    setDragOverId(null);
  }, [draggedId, dragOverId, options, onReorder]);

  const renderApplicabilityBadges = (applicability?: LimitApplicability) => {
    if (!applicability) return null;
    
    const badges: React.ReactNode[] = [];
    
    if (applicability.allStates) {
      badges.push(<Badge key="all-states" $color={colors.primary}>All States</Badge>);
    } else if (applicability.states?.length) {
      const stateText = applicability.states.length <= 3 
        ? applicability.states.join(', ')
        : `${applicability.states.slice(0, 2).join(', ')} +${applicability.states.length - 2}`;
      badges.push(<Badge key="states" $color={colors.info}>{stateText}</Badge>);
    }
    
    if (applicability.coverageParts?.length) {
      badges.push(
        <Badge key="parts" $color={colors.secondary}>
          {applicability.coverageParts.length} parts
        </Badge>
      );
    }
    
    if (applicability.perils?.length) {
      badges.push(
        <Badge key="perils" $color={colors.warning}>
          {applicability.perils.length} perils
        </Badge>
      );
    }
    
    return badges.length > 0 ? <BadgesContainer>{badges}</BadgesContainer> : null;
  };

  return (
    <Container>
      <TableHeader>
        <HeaderInfo>
          <SetName>{optionSet.name}</SetName>
          <SetMeta>
            <MetaItem>
              Structure: <strong>{optionSet.structure}</strong>
            </MetaItem>
            <MetaItem>
              {optionSet.isRequired ? (
                <RequiredBadge>Required</RequiredBadge>
              ) : (
                <OptionalBadge>Optional</OptionalBadge>
              )}
            </MetaItem>
            <MetaItem>
              {options.length} option{options.length !== 1 ? 's' : ''}
            </MetaItem>
          </SetMeta>
        </HeaderInfo>
        <AddButton onClick={onAddOption}>
          <PlusIcon />
          Add Option
        </AddButton>
      </TableHeader>

      {options.length === 0 ? (
        <EmptyState>
          <EmptyIcon>📋</EmptyIcon>
          <EmptyText>No limit options defined</EmptyText>
          <EmptyHint>Add options to define available limits for this coverage</EmptyHint>
          <AddButton onClick={onAddOption}>
            <PlusIcon />
            Add First Option
          </AddButton>
        </EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th style={{ width: 40 }}></Th>
              <Th>Limit</Th>
              <Th>Applicability</Th>
              <Th style={{ width: 80 }}>Default</Th>
              <Th style={{ width: 80 }}>Enabled</Th>
              <Th style={{ width: 100 }}>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {options.map((option) => (
              <TableRow
                key={option.id}
                $isDragging={draggedId === option.id}
                $isDragOver={dragOverId === option.id}
                $disabled={!option.isEnabled}
                draggable
                onDragStart={(e) => handleDragStart(e, option.id)}
                onDragOver={(e) => handleDragOver(e, option.id)}
                onDragEnd={handleDragEnd}
              >
                <Td>
                  <DragHandle>
                    <Bars3Icon />
                  </DragHandle>
                </Td>
                <Td>
                  <LimitValue>{option.displayValue || option.label}</LimitValue>
                </Td>
                <Td>
                  {renderApplicabilityBadges(option.applicability)}
                </Td>
                <Td>
                  <DefaultButton
                    $isDefault={option.isDefault}
                    onClick={() => onSetDefault(option.id)}
                    title={option.isDefault ? 'Default option' : 'Set as default'}
                  >
                    {option.isDefault ? <StarIconSolid /> : <StarIcon />}
                  </DefaultButton>
                </Td>
                <Td>
                  <EnabledToggle
                    $enabled={option.isEnabled}
                    onClick={() => onToggleEnabled(option.id, !option.isEnabled)}
                  >
                    {option.isEnabled ? <CheckCircleIcon /> : <XCircleIcon />}
                  </EnabledToggle>
                </Td>
                <Td>
                  <ActionButtons>
                    <ActionButton onClick={() => onEditOption(option)} title="Edit">
                      <PencilIcon />
                    </ActionButton>
                    <ActionButton
                      onClick={() => onDeleteOption(option.id)}
                      title="Delete"
                      $danger
                    >
                      <TrashIcon />
                    </ActionButton>
                  </ActionButtons>
                </Td>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  background: white;
  border-radius: 12px;
  border: 1px solid ${colors.gray200};
  overflow: hidden;
`;

const TableHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: ${colors.gray50};
  border-bottom: 1px solid ${colors.gray200};
`;

const HeaderInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SetName = styled.h4`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${colors.gray800};
`;

const SetMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const MetaItem = styled.span`
  font-size: 12px;
  color: ${colors.gray500};

  strong {
    color: ${colors.gray700};
    text-transform: capitalize;
  }
`;

const RequiredBadge = styled.span`
  padding: 2px 8px;
  background: ${colors.error}15;
  color: ${colors.error};
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
`;

const OptionalBadge = styled.span`
  padding: 2px 8px;
  background: ${colors.gray200};
  color: ${colors.gray600};
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: ${colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;

  svg { width: 16px; height: 16px; }

  &:hover { background: ${colors.primaryDark}; }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 12px;
`;

const EmptyText = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: ${colors.gray700};
  margin-bottom: 4px;
`;

const EmptyHint = styled.div`
  font-size: 13px;
  color: ${colors.gray500};
  margin-bottom: 20px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: ${colors.gray500};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid ${colors.gray200};
`;

const Td = styled.td`
  padding: 12px 16px;
  vertical-align: middle;
`;

const TableRow = styled.tr<{ $isDragging: boolean; $isDragOver: boolean; $disabled: boolean }>`
  background: ${({ $isDragging, $isDragOver }) =>
    $isDragging ? colors.gray100 : $isDragOver ? `${colors.primary}08` : 'white'};
  opacity: ${({ $disabled }) => $disabled ? 0.5 : 1};
  border-bottom: 1px solid ${colors.gray100};
  cursor: grab;

  &:hover {
    background: ${colors.gray50};
  }

  &:active {
    cursor: grabbing;
  }
`;

const DragHandle = styled.div`
  width: 20px;
  height: 20px;
  color: ${colors.gray400};
  cursor: grab;

  svg { width: 100%; height: 100%; }
`;

const LimitValue = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${colors.gray800};
  font-family: 'SF Mono', ui-monospace, monospace;
`;

const BadgesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const Badge = styled.span<{ $color: string }>`
  padding: 2px 8px;
  background: ${({ $color }) => `${$color}15`};
  color: ${({ $color }) => $color};
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
`;

const DefaultButton = styled.button<{ $isDefault: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  cursor: pointer;
  color: ${({ $isDefault }) => $isDefault ? colors.warning : colors.gray400};

  svg { width: 20px; height: 20px; }

  &:hover {
    color: ${colors.warning};
  }
`;

const EnabledToggle = styled.button<{ $enabled: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  cursor: pointer;
  color: ${({ $enabled }) => $enabled ? colors.success : colors.gray400};

  svg { width: 20px; height: 20px; }

  &:hover {
    color: ${({ $enabled }) => $enabled ? colors.error : colors.success};
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 4px;
`;

const ActionButton = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  cursor: pointer;
  color: ${colors.gray500};
  border-radius: 6px;

  svg { width: 16px; height: 16px; }

  &:hover {
    background: ${({ $danger }) => $danger ? `${colors.error}10` : colors.gray100};
    color: ${({ $danger }) => $danger ? colors.error : colors.gray700};
  }
`;

export default LimitOptionSetTable;

