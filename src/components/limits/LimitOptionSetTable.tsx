/**
 * LimitOptionSetTable Component
 *
 * Premium Apple-inspired table component for displaying and managing limit options.
 * Features smooth drag-to-reorder, elegant micro-interactions, and refined visual hierarchy.
 */

import React, { useState, useCallback, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  Bars3Icon,
  StarIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentListIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import {
  CoverageLimitOption,
  CoverageLimitOptionSet,
  LimitApplicability
} from '@app-types';
import { colors } from '../common/DesignSystem';

// ============ Premium Animations ============
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.2); }
  50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
`;

const starPop = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
`;

/** Quick add value can be different shapes based on structure */
interface QuickAddValue {
  amount?: number;
  perOccurrence?: number;
  aggregate?: number;
  perClaim?: number;
  components?: number[];
  perItemMax?: number;
  totalCap?: number;
}

interface LimitOptionSetTableProps {
  optionSet: CoverageLimitOptionSet;
  options: CoverageLimitOption[];
  onAddOption: () => void;
  onEditOption: (option: CoverageLimitOption) => void;
  onDeleteOption: (optionId: string) => void;
  onSetDefault: (optionId: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onToggleEnabled: (optionId: string, enabled: boolean) => void;
  onQuickAdd?: (value: QuickAddValue) => void;
}

/** Common quick-add amounts for different structures - P&C industry standard */
const QUICK_ADD_AMOUNTS = {
  single: [100000, 250000, 500000, 1000000, 2000000, 5000000],
  occAgg: [
    { perOccurrence: 500000, aggregate: 1000000, label: '$500K/$1M' },
    { perOccurrence: 1000000, aggregate: 2000000, label: '$1M/$2M' },
    { perOccurrence: 1000000, aggregate: 3000000, label: '$1M/$3M' },
    { perOccurrence: 2000000, aggregate: 4000000, label: '$2M/$4M' },
    { perOccurrence: 2000000, aggregate: 5000000, label: '$2M/$5M' },
  ],
  claimAgg: [
    { perClaim: 500000, aggregate: 1000000, label: '$500K/$1M' },
    { perClaim: 1000000, aggregate: 2000000, label: '$1M/$2M' },
    { perClaim: 1000000, aggregate: 3000000, label: '$1M/$3M' },
    { perClaim: 2000000, aggregate: 4000000, label: '$2M/$4M' },
    { perClaim: 5000000, aggregate: 10000000, label: '$5M/$10M' },
  ],
  csl: [300000, 500000, 1000000, 2000000, 5000000],
  split: [
    { components: [25000, 50000, 25000], label: '25/50/25' },
    { components: [50000, 100000, 50000], label: '50/100/50' },
    { components: [100000, 300000, 100000], label: '100/300/100' },
    { components: [250000, 500000, 100000], label: '250/500/100' },
    { components: [250000, 500000, 250000], label: '250/500/250' },
    { components: [500000, 1000000, 500000], label: '500/1M/500' },
  ],
  scheduled: [
    { perItemMax: 50000, totalCap: 250000, label: '$50K/item • $250K total' },
    { perItemMax: 100000, totalCap: 500000, label: '$100K/item • $500K total' },
    { perItemMax: 250000, totalCap: 1000000, label: '$250K/item • $1M total' },
  ],
};

/** Get short label for structure type */
const getStructureShortLabel = (structure: string): string => {
  switch (structure) {
    case 'single': return 'Single';
    case 'occAgg': return 'Occ/Agg';
    case 'claimAgg': return 'Claim/Agg';
    case 'split': return 'Split';
    case 'csl': return 'CSL';
    case 'scheduled': return 'Scheduled';
    default: return structure;
  }
};

/** Get color for structure type */
const getStructureColor = (structure: string): string => {
  switch (structure) {
    case 'single': return colors.primary;
    case 'occAgg': return colors.secondary;
    case 'claimAgg': return colors.info;
    case 'split': return colors.warning;
    case 'csl': return colors.success;
    case 'scheduled': return '#9333ea';
    default: return colors.gray500;
  }
};

/** Get primary value from an option for sorting */
const getPrimaryValue = (option: CoverageLimitOption): number => {
  if ('amount' in option && typeof option.amount === 'number') {
    return option.amount;
  }
  if ('perOccurrence' in option && typeof option.perOccurrence === 'number') {
    return option.perOccurrence;
  }
  if ('perClaim' in option && typeof option.perClaim === 'number') {
    return option.perClaim;
  }
  if ('components' in option && Array.isArray(option.components) && option.components.length > 0) {
    return option.components[0]?.amount || 0;
  }
  if ('perItemMax' in option && typeof option.perItemMax === 'number') {
    return option.perItemMax;
  }
  return 0;
};

export const LimitOptionSetTable: React.FC<LimitOptionSetTableProps> = ({
  optionSet,
  options,
  onAddOption,
  onEditOption,
  onDeleteOption,
  onSetDefault,
  onReorder,
  onToggleEnabled,
  onQuickAdd
}) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  /** Sort options from lowest to highest value */
  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => getPrimaryValue(a) - getPrimaryValue(b));
  }, [options]);

  /** Format amount for display */
  const formatAmount = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}k`;
    }
    return `$${amount}`;
  };

  /** Get quick-add chips based on structure */
  const getQuickAddChips = () => {
    const structure = optionSet.structure;
    if (structure === 'single' || structure === 'csl') {
      return (QUICK_ADD_AMOUNTS[structure] as number[]).map(amt => ({
        label: formatAmount(amt),
        value: { amount: amt }
      }));
    }
    if (structure === 'occAgg') {
      return QUICK_ADD_AMOUNTS.occAgg.map(pair => ({
        label: pair.label,
        value: { perOccurrence: pair.perOccurrence, aggregate: pair.aggregate }
      }));
    }
    if (structure === 'claimAgg') {
      return QUICK_ADD_AMOUNTS.claimAgg.map(pair => ({
        label: pair.label,
        value: { perClaim: pair.perClaim, aggregate: pair.aggregate }
      }));
    }
    if (structure === 'split') {
      return QUICK_ADD_AMOUNTS.split.map(preset => ({
        label: preset.label,
        value: { components: preset.components }
      }));
    }
    if (structure === 'scheduled') {
      return QUICK_ADD_AMOUNTS.scheduled.map(preset => ({
        label: preset.label,
        value: { perItemMax: preset.perItemMax, totalCap: preset.totalCap }
      }));
    }
    return [];
  };

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
          <EmptyIcon><ClipboardDocumentListIcon /></EmptyIcon>
          <EmptyText>No limit options defined</EmptyText>
          <EmptyHint>Click a common limit below to add it instantly, or create a custom option</EmptyHint>
          {onQuickAdd && getQuickAddChips().length > 0 && (
            <>
              <QuickAddLabel>Industry-Standard Limits</QuickAddLabel>
              <QuickAddChips>
                {getQuickAddChips().map((chip, idx) => (
                  <QuickAddChip key={idx} onClick={() => onQuickAdd(chip.value)}>
                    {chip.label}
                  </QuickAddChip>
                ))}
              </QuickAddChips>
            </>
          )}
          <OrDivider>
            <OrLine />
            <OrText>or</OrText>
            <OrLine />
          </OrDivider>
          <AddCustomButton onClick={onAddOption}>
            <PlusIcon />
            Add Custom Option
          </AddCustomButton>
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
            {sortedOptions.map((option) => (
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
                  <LimitValueCell>
                    <LimitValue>{option.displayValue || option.label}</LimitValue>
                    {option.structure && (
                      <StructureMicroBadge $structure={option.structure}>
                        {getStructureShortLabel(option.structure)}
                      </StructureMicroBadge>
                    )}
                  </LimitValueCell>
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

// ============ Premium Styled Components ============
const Container = styled.div`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04), 0 1px 8px rgba(0, 0, 0, 0.02);
  animation: ${fadeUp} 0.4s ease-out forwards;
`;

const TableHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.9) 100%);
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
`;

const HeaderInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SetName = styled.h4`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: ${colors.gray800};
  letter-spacing: -0.02em;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
`;

const SetMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const MetaItem = styled.span`
  font-size: 13px;
  color: ${colors.gray500};
  display: flex;
  align-items: center;
  gap: 4px;

  strong {
    color: ${colors.gray700};
    text-transform: capitalize;
    font-weight: 600;
  }
`;

const RequiredBadge = styled.span`
  padding: 4px 10px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.08) 100%);
  color: ${colors.error};
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  border: 1px solid rgba(239, 68, 68, 0.15);
`;

const OptionalBadge = styled.span`
  padding: 4px 10px;
  background: linear-gradient(135deg, rgba(148, 163, 184, 0.15) 0%, rgba(100, 116, 139, 0.1) 100%);
  color: ${colors.gray600};
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  border: 1px solid rgba(148, 163, 184, 0.2);
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, ${colors.primary} 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  svg { width: 18px; height: 18px; }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(99, 102, 241, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 32px;
  text-align: center;
  animation: ${fadeUp} 0.5s ease-out forwards;
`;

const EmptyIcon = styled.div`
  width: 72px;
  height: 72px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%);
  border-radius: 20px;
  color: ${colors.primary};
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.12);

  svg {
    width: 36px;
    height: 36px;
  }
`;

const EmptyText = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${colors.gray800};
  margin-bottom: 8px;
  letter-spacing: -0.02em;
`;

const EmptyHint = styled.div`
  font-size: 14px;
  color: ${colors.gray500};
  margin-bottom: 24px;
  max-width: 300px;
  line-height: 1.5;
`;

const QuickAddLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${colors.gray500};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
`;

const QuickAddChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 20px;
  max-width: 600px;
`;

const QuickAddChip = styled.button`
  padding: 10px 20px;
  border: 1.5px solid rgba(226, 232, 240, 0.8);
  background: rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  font-size: 15px;
  font-weight: 700;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  color: ${colors.gray700};
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  &:hover {
    border-color: ${colors.primary};
    background: rgba(99, 102, 241, 0.06);
    color: ${colors.primary};
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.15);
  }

  &:active {
    transform: translateY(0);
  }
`;

const OrDivider = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  width: 220px;
  margin-bottom: 16px;
`;

const OrLine = styled.div`
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(203, 213, 225, 0.6) 50%, transparent 100%);
`;

const OrText = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${colors.gray400};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const AddCustomButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: 2px dashed rgba(203, 213, 225, 0.6);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  color: ${colors.gray600};
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    border-color: ${colors.primary};
    color: ${colors.primary};
    background: rgba(99, 102, 241, 0.05);
    transform: translateY(-1px);
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 4px;
  padding: 8px 16px 16px;
`;

const Th = styled.th`
  padding: 16px 18px 12px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  color: ${colors.gray500};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const Td = styled.td`
  padding: 16px 18px;
  vertical-align: middle;

  &:first-child {
    border-radius: 12px 0 0 12px;
  }

  &:last-child {
    border-radius: 0 12px 12px 0;
  }
`;

const TableRow = styled.tr<{ $isDragging: boolean; $isDragOver: boolean; $disabled: boolean }>`
  background: ${({ $isDragging, $isDragOver }) =>
    $isDragging
      ? 'rgba(99, 102, 241, 0.08)'
      : $isDragOver
        ? 'rgba(99, 102, 241, 0.06)'
        : 'rgba(255, 255, 255, 0.8)'};
  opacity: ${({ $disabled }) => $disabled ? 0.5 : 1};
  cursor: grab;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: ${({ $isDragging }) =>
    $isDragging
      ? '0 8px 24px rgba(99, 102, 241, 0.2)'
      : '0 1px 4px rgba(0, 0, 0, 0.04)'};
  border-radius: 12px;

  ${Td} {
    border-top: 1px solid ${({ $isDragOver }) => $isDragOver ? 'rgba(99, 102, 241, 0.3)' : 'rgba(226, 232, 240, 0.5)'};
    border-bottom: 1px solid ${({ $isDragOver }) => $isDragOver ? 'rgba(99, 102, 241, 0.3)' : 'rgba(226, 232, 240, 0.5)'};

    &:first-child {
      border-left: 1px solid ${({ $isDragOver }) => $isDragOver ? 'rgba(99, 102, 241, 0.3)' : 'rgba(226, 232, 240, 0.5)'};
    }

    &:last-child {
      border-right: 1px solid ${({ $isDragOver }) => $isDragOver ? 'rgba(99, 102, 241, 0.3)' : 'rgba(226, 232, 240, 0.5)'};
    }
  }

  &:hover {
    background: rgba(248, 250, 252, 0.95);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);

    ${Td} {
      border-color: rgba(203, 213, 225, 0.7);
    }
  }

  &:active {
    cursor: grabbing;
  }
`;

const DragHandle = styled.div`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${colors.gray400};
  cursor: grab;
  border-radius: 6px;
  transition: all 0.2s ease;

  svg { width: 18px; height: 18px; }

  &:hover {
    color: ${colors.gray600};
    background: rgba(148, 163, 184, 0.1);
  }
`;

const LimitValueCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const LimitValue = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${colors.gray800};
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
`;

const StructureMicroBadge = styled.span<{ $structure: string }>`
  padding: 2px 8px;
  background: ${({ $structure }) => `${getStructureColor($structure)}10`};
  color: ${({ $structure }) => getStructureColor($structure)};
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  border: 1px solid ${({ $structure }) => `${getStructureColor($structure)}20`};
  white-space: nowrap;
`;

const BadgesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Badge = styled.span<{ $color: string }>`
  padding: 4px 10px;
  background: ${({ $color }) => `${$color}12`};
  color: ${({ $color }) => $color};
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
  border: 1px solid ${({ $color }) => `${$color}20`};
`;

const DefaultButton = styled.button<{ $isDefault: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: ${({ $isDefault }) => $isDefault ? 'rgba(245, 158, 11, 0.1)' : 'transparent'};
  border-radius: 10px;
  cursor: pointer;
  color: ${({ $isDefault }) => $isDefault ? colors.warning : colors.gray400};
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  svg {
    width: 20px;
    height: 20px;
    transition: transform 0.2s ease;
  }

  &:hover {
    color: ${colors.warning};
    background: rgba(245, 158, 11, 0.1);

    svg {
      transform: scale(1.1);
    }
  }

  ${({ $isDefault }) => $isDefault && css`
    svg {
      animation: ${starPop} 0.4s ease-out;
    }
  `}
`;

const EnabledToggle = styled.button<{ $enabled: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: ${({ $enabled }) => $enabled ? 'rgba(16, 185, 129, 0.1)' : 'transparent'};
  border-radius: 10px;
  cursor: pointer;
  color: ${({ $enabled }) => $enabled ? colors.success : colors.gray400};
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  svg {
    width: 22px;
    height: 22px;
    transition: transform 0.2s ease;
  }

  &:hover {
    color: ${({ $enabled }) => $enabled ? colors.error : colors.success};
    background: ${({ $enabled }) => $enabled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'};

    svg {
      transform: scale(1.1);
    }
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 6px;
`;

const ActionButton = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${colors.gray500};
  border-radius: 10px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  svg {
    width: 17px;
    height: 17px;
    transition: transform 0.2s ease;
  }

  &:hover {
    background: ${({ $danger }) => $danger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(148, 163, 184, 0.15)'};
    color: ${({ $danger }) => $danger ? colors.error : colors.gray700};

    svg {
      transform: scale(1.1);
    }
  }
`;

export default LimitOptionSetTable;

