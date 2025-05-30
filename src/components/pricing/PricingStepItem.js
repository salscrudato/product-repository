// Optimized PricingStepItem component with memoization
import React, { memo } from 'react';
import styled from 'styled-components';
import {
  TrashIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  ArrowsUpDownIcon
} from '@heroicons/react/24/solid';

// Styled Components
const StepRow = styled.tr`
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.02);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }
`;

const StepCell = styled.td`
  padding: 8px 6px;
  text-align: center;
  border-bottom: 1px solid rgba(226, 232, 240, 0.3);
  vertical-align: middle;
  font-size: 12px;
`;

const StepName = styled.span`
  font-weight: 500;
  color: #374151;
  font-size: 12px;
`;

const StepNameButton = styled.button`
  background: transparent;
  border: none;
  font-weight: 500;
  color: #6366f1;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
  transition: all 0.2s ease;

  &:hover {
    color: #4f46e5;
    background: rgba(99, 102, 241, 0.08);
    border-radius: 4px;
    padding: 2px 4px;
  }
`;

const CoverageButton = styled.button`
  background: transparent;
  color: #6b7280;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    color: #6366f1;
  }
`;

const StatesButton = styled.button`
  background: transparent;
  color: #6b7280;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    color: #6366f1;
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    color: #6366f1;
  }

  &:active {
    transform: scale(0.95);
  }

  &.danger:hover {
    background: rgba(239, 68, 68, 0.08);
    color: #ef4444;
  }

  &.success:hover {
    background: rgba(34, 197, 94, 0.08);
    color: #22c55e;
  }

  &.warning:hover {
    background: rgba(245, 158, 11, 0.08);
    color: #f59e0b;
  }
`;

const ActionsContainer = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
`;

const ValueDisplay = styled.span`
  font-weight: 600;
  color: #1f2937;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
`;

const OperandDisplay = styled.span`
  font-weight: 600;
  font-size: 18px;
  color: #374151;
  font-family: 'Inter', sans-serif;
`;

// Memoized PricingStepItem component
const PricingStepItem = memo(({
  step,
  index,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onViewCoverages,
  onViewStates,
  onViewTable,
  canMoveUp,
  canMoveDown,
  isFirst,
  isLast
}) => {
  const handleEdit = () => onEdit(step);
  const handleDelete = () => onDelete(step.id);
  const handleDuplicate = () => onDuplicate(step.id);
  const handleMoveUp = () => onMoveUp(step.id, index);
  const handleMoveDown = () => onMoveDown(step.id, index);
  const handleViewCoverages = () => onViewCoverages(step.coverages);
  const handleViewStates = () => onViewStates(step.states);
  const handleViewTable = () => onViewTable(step);

  // Format coverage display
  const getCoverageDisplay = () => {
    if (!step.coverages || step.coverages.length === 0) {
      return 'All';
    }
    if (step.coverages.length === 1) {
      return step.coverages[0];
    }
    return `Coverages (${step.coverages.length})`;
  };

  // Format states display
  const getStatesDisplay = () => {
    if (!step.states || step.states.length === 0) {
      return 'All States';
    }
    if (step.states.length <= 3) {
      return step.states.join(', ');
    }
    return `States (${step.states.length})`;
  };

  if (step.stepType === 'operand') {
    return (
      <StepRow>
        <StepCell>—</StepCell>
        <StepCell>
          <OperandDisplay>{step.operand}</OperandDisplay>
        </StepCell>
        <StepCell>—</StepCell>
        <StepCell>—</StepCell>
        <StepCell>
          <ActionsContainer>
            <ActionButton
              onClick={handleEdit}
              title="Edit operand"
              aria-label="Edit operand"
            >
              <PencilIcon width={12} height={12} />
            </ActionButton>
            <ActionButton
              className="danger"
              onClick={handleDelete}
              title="Delete operand"
              aria-label="Delete operand"
            >
              <TrashIcon width={12} height={12} />
            </ActionButton>
          </ActionsContainer>
        </StepCell>
      </StepRow>
    );
  }

  return (
    <StepRow>
      <StepCell>
        <CoverageButton onClick={handleViewCoverages}>
          {getCoverageDisplay()}
        </CoverageButton>
      </StepCell>
      <StepCell>
        {step.tableName || step.table ? (
          <StepNameButton onClick={handleViewTable} title="Click to view table">
            {step.stepName}
          </StepNameButton>
        ) : (
          <StepName>{step.stepName}</StepName>
        )}
      </StepCell>
      <StepCell>
        <StatesButton onClick={handleViewStates}>
          {getStatesDisplay()}
        </StatesButton>
      </StepCell>
      <StepCell>
        <ValueDisplay>{step.value || 'N/A'}</ValueDisplay>
      </StepCell>
      <StepCell>
        <ActionsContainer>
          {!isFirst && canMoveUp && (
            <ActionButton
              onClick={handleMoveUp}
              title="Move up"
              aria-label="Move step up"
            >
              <ArrowsUpDownIcon width={12} height={12} style={{ transform: 'rotate(180deg)' }} />
            </ActionButton>
          )}
          {!isLast && canMoveDown && (
            <ActionButton
              onClick={handleMoveDown}
              title="Move down"
              aria-label="Move step down"
            >
              <ArrowsUpDownIcon width={12} height={12} />
            </ActionButton>
          )}
          <ActionButton
            className="success"
            onClick={handleDuplicate}
            title="Duplicate step"
            aria-label="Duplicate step"
          >
            <DocumentDuplicateIcon width={12} height={12} />
          </ActionButton>
          <ActionButton
            onClick={handleEdit}
            title="Edit step"
            aria-label="Edit step"
          >
            <PencilIcon width={12} height={12} />
          </ActionButton>
          <ActionButton
            className="danger"
            onClick={handleDelete}
            title="Delete step"
            aria-label="Delete step"
          >
            <TrashIcon width={12} height={12} />
          </ActionButton>
        </ActionsContainer>
      </StepCell>
    </StepRow>
  );
});

PricingStepItem.displayName = 'PricingStepItem';

export default PricingStepItem;
