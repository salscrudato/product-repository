/**
 * DeductibleOptionSetTable Component
 * 
 * Table component for displaying and managing deductible options within a set.
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
  XCircleIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import {
  CoverageDeductibleOption,
  CoverageDeductibleOptionSet,
  DeductibleApplicability
} from '@app-types';
import { colors } from '../common/DesignSystem';
import { formatDeductibleOptionDisplay } from '../../services/deductibleOptionsService';

interface DeductibleOptionSetTableProps {
  optionSet: CoverageDeductibleOptionSet;
  options: CoverageDeductibleOption[];
  onAddOption: () => void;
  onEditOption: (option: CoverageDeductibleOption) => void;
  onDeleteOption: (optionId: string) => void;
  onSetDefault: (optionId: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onToggleEnabled: (optionId: string, enabled: boolean) => void;
}

export const DeductibleOptionSetTable: React.FC<DeductibleOptionSetTableProps> = ({
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

  const renderApplicabilityBadges = (applicability?: DeductibleApplicability) => {
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
    
    if (applicability.perils?.length) {
      badges.push(
        <Badge key="perils" $color={colors.warning}>
          {applicability.perils.join(', ')}
        </Badge>
      );
    }
    
    return badges.length > 0 ? <BadgesContainer>{badges}</BadgesContainer> : null;
  };

  const getStructureLabel = (structure: string): string => {
    const labels: Record<string, string> = {
      flat: 'Flat $',
      percentage: '%',
      percentMinMax: '% w/ Min/Max',
      waitingPeriod: 'Waiting Period',
      perilSpecific: 'Peril-Specific',
      aggregate: 'Aggregate',
      custom: 'Custom'
    };
    return labels[structure] || structure;
  };

  return (
    <Container>
      <TableHeader>
        <HeaderInfo>
          <SetName>{optionSet.name}</SetName>
          <SetMeta>
            <MetaItem>
              Structure: <strong>{getStructureLabel(optionSet.structure)}</strong>
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
          <EmptyIcon><CurrencyDollarIcon /></EmptyIcon>
          <EmptyText>No deductible options defined</EmptyText>
          <EmptyHint>Add options to define available deductibles for this coverage</EmptyHint>
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
              <Th>Deductible</Th>
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
                  <DeductibleValue>{formatDeductibleOptionDisplay(option)}</DeductibleValue>
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
  font-size: 13px;
  color: ${colors.gray500};
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const RequiredBadge = styled.span`
  padding: 2px 8px;
  background: ${colors.error}15;
  color: ${colors.error};
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
`;

const OptionalBadge = styled.span`
  padding: 2px 8px;
  background: ${colors.gray200};
  color: ${colors.gray600};
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
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
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    background: ${colors.primaryDark};
    transform: translateY(-1px);
  }
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
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  color: #6366f1;

  svg {
    width: 100%;
    height: 100%;
  }
`;

const EmptyText = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${colors.gray700};
  margin-bottom: 4px;
`;

const EmptyHint = styled.div`
  font-size: 14px;
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
  letter-spacing: 0.05em;
  background: ${colors.gray50};
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
  transition: background 0.15s ease;

  &:hover {
    background: ${colors.gray50};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const DragHandle = styled.div`
  cursor: grab;
  color: ${colors.gray400};
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 18px;
    height: 18px;
  }

  &:active {
    cursor: grabbing;
  }
`;

const DeductibleValue = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${colors.gray800};
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
  background: ${({ $isDefault }) => $isDefault ? `${colors.warning}15` : 'transparent'};
  color: ${({ $isDefault }) => $isDefault ? colors.warning : colors.gray400};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    background: ${colors.warning}20;
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
  background: ${({ $enabled }) => $enabled ? `${colors.success}15` : `${colors.gray400}15`};
  color: ${({ $enabled }) => $enabled ? colors.success : colors.gray400};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    background: ${({ $enabled }) => $enabled ? `${colors.success}25` : `${colors.gray400}25`};
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
  background: transparent;
  color: ${({ $danger }) => $danger ? colors.error : colors.gray500};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    background: ${({ $danger }) => $danger ? `${colors.error}15` : colors.gray100};
    color: ${({ $danger }) => $danger ? colors.error : colors.gray700};
  }
`;

export default DeductibleOptionSetTable;

