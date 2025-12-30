import React, { useState, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  AdjustmentsHorizontalIcon,
  ReceiptPercentIcon,
  ArrowPathRoundedSquareIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import type { StepGroup } from '../../types/pricing';
import type { RatingStep } from './RatingAlgorithmBuilder';

// ============================================================================
// Types
// ============================================================================

interface StepGroupsProps {
  steps: RatingStep[];
  onStepClick: (step: RatingStep) => void;
  onStepHover: (stepId: string | null) => void;
  selectedStepId?: string | null;
  highlightedStepId?: string | null;
  renderStep: (step: RatingStep, index: number) => React.ReactNode;
}

interface GroupConfig {
  id: StepGroup;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

// ============================================================================
// Group Definitions
// ============================================================================

const GROUP_CONFIGS: GroupConfig[] = [
  {
    id: 'base-premium',
    name: 'Base Premium',
    icon: <CurrencyDollarIcon />,
    color: '#6366f1',
    description: 'Base rates and exposure calculations',
  },
  {
    id: 'modifiers-factors',
    name: 'Modifiers & Factors',
    icon: <AdjustmentsHorizontalIcon />,
    color: '#0ea5e9',
    description: 'Rating factors and adjustments',
  },
  {
    id: 'fees-minimums',
    name: 'Fees & Minimums',
    icon: <ReceiptPercentIcon />,
    color: '#f59e0b',
    description: 'Fees, surcharges, and minimum premiums',
  },
  {
    id: 'final-adjustments',
    name: 'Final Adjustments',
    icon: <ArrowPathRoundedSquareIcon />,
    color: '#10b981',
    description: 'Rounding and final calculations',
  },
  {
    id: 'ungrouped',
    name: 'Ungrouped Steps',
    icon: <Bars3Icon />,
    color: '#64748b',
    description: 'Steps not assigned to a group',
  },
];

// ============================================================================
// Animations
// ============================================================================

const slideDown = keyframes`
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 2000px; }
`;

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const GroupCard = styled.div<{ $color: string }>`
  background: white;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 14px;
  overflow: hidden;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${({ $color }) => `${$color}40`};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  }
`;

const GroupHeader = styled.button<{ $color: string; $isOpen: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  background: ${({ $isOpen, $color }) => 
    $isOpen 
      ? `linear-gradient(135deg, ${$color}08 0%, ${$color}04 100%)`
      : 'transparent'};
  border: none;
  border-bottom: ${({ $isOpen }) => $isOpen ? '1px solid rgba(226, 232, 240, 0.6)' : 'none'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ $color }) => `${$color}08`};
  }
`;

const GroupIcon = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${({ $color }) => `${$color}15`};
  
  svg {
    width: 16px;
    height: 16px;
    color: ${({ $color }) => $color};
  }
`;

const GroupInfo = styled.div`
  flex: 1;
  text-align: left;
`;

const GroupName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
`;

const GroupMeta = styled.div`
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
`;

const ChevronWrapper = styled.div<{ $isOpen: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #94a3b8;
  transition: transform 0.2s ease;
  transform: ${({ $isOpen }) => $isOpen ? 'rotate(180deg)' : 'rotate(0)'};

  svg { width: 18px; height: 18px; }
`;

const GroupContent = styled.div<{ $isOpen: boolean }>`
  display: ${({ $isOpen }) => $isOpen ? 'block' : 'none'};
  padding: 12px;
  animation: ${slideDown} 0.3s ease-out;
`;

const StepCount = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  background: ${({ $color }) => `${$color}15`};
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ $color }) => $color};
`;

const EmptyGroup = styled.div`
  padding: 20px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
  font-style: italic;
`;

// ============================================================================
// Helper Functions
// ============================================================================

const getStepGroup = (step: RatingStep): StepGroup => {
  // If step has explicit group, use it
  if (step.group) return step.group;

  // Otherwise, infer from template or step characteristics
  if (step.template) {
    switch (step.template) {
      case 'base-rate':
      case 'exposure-basis':
        return 'base-premium';
      case 'factor':
      case 'modifier':
        return 'modifiers-factors';
      case 'fee-surcharge':
      case 'minimum-premium':
        return 'fees-minimums';
      case 'rounding':
        return 'final-adjustments';
    }
  }

  // Infer from step name patterns
  const name = (step.stepName || '').toLowerCase();
  if (name.includes('base') || name.includes('rate')) return 'base-premium';
  if (name.includes('factor') || name.includes('modifier') || name.includes('credit') || name.includes('debit')) return 'modifiers-factors';
  if (name.includes('fee') || name.includes('surcharge') || name.includes('minimum')) return 'fees-minimums';
  if (name.includes('round')) return 'final-adjustments';

  return 'ungrouped';
};

// ============================================================================
// Component
// ============================================================================

export const StepGroupsComponent: React.FC<StepGroupsProps> = ({
  steps,
  onStepClick,
  onStepHover,
  selectedStepId,
  highlightedStepId,
  renderStep,
}) => {
  const [openGroups, setOpenGroups] = useState<Set<StepGroup>>(
    new Set(['base-premium', 'modifiers-factors', 'fees-minimums', 'final-adjustments'])
  );

  const toggleGroup = useCallback((groupId: StepGroup) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  // Group steps
  const groupedSteps = GROUP_CONFIGS.map(config => ({
    ...config,
    steps: steps.filter(step => getStepGroup(step) === config.id),
  }));

  // Filter out empty groups (except ungrouped if it has steps)
  const visibleGroups = groupedSteps.filter(g =>
    g.steps.length > 0 || g.id === 'ungrouped'
  );

  return (
    <Container>
      {visibleGroups.map(group => (
        <GroupCard key={group.id} $color={group.color}>
          <GroupHeader
            $color={group.color}
            $isOpen={openGroups.has(group.id)}
            onClick={() => toggleGroup(group.id)}
          >
            <GroupIcon $color={group.color}>
              {group.icon}
            </GroupIcon>
            <GroupInfo>
              <GroupName>{group.name}</GroupName>
              <GroupMeta>{group.description}</GroupMeta>
            </GroupInfo>
            <StepCount $color={group.color}>
              {group.steps.length}
            </StepCount>
            <ChevronWrapper $isOpen={openGroups.has(group.id)}>
              <ChevronDownIcon />
            </ChevronWrapper>
          </GroupHeader>

          <GroupContent $isOpen={openGroups.has(group.id)}>
            {group.steps.length === 0 ? (
              <EmptyGroup>No steps in this group</EmptyGroup>
            ) : (
              group.steps.map((step, index) => renderStep(step, index))
            )}
          </GroupContent>
        </GroupCard>
      ))}
    </Container>
  );
};

export default StepGroupsComponent;

