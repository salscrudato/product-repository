/**
 * TaskBoard  (Design System v2)
 *
 * Full task board page component with filter bar and task cards.
 * Filters by status, priority, phase, change set, artifact, state.
 *
 * Accessibility:
 *  - Keyboard-navigable filter chips
 *  - ARIA labels on interactive elements
 *  - Focus-visible rings
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
import {
  FunnelIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ShieldExclamationIcon,
  UserIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import {
  color, neutral, accent, semantic,
  space, radius, shadow, fontFamily,
  type as t, border as borderTokens,
  duration, easing, focusRingStyle, reducedMotion,
} from '@/ui/tokens';
import {
  PageShell, PageBody,
  PageHeader, PageHeaderLeft, PageHeaderRight,
  PageTitle, Badge,
} from '@/ui/components';
import MainNavigation from '@/components/ui/Navigation';
import { useRoleContext } from '@/context/RoleContext';
import { listTasks, transitionTaskStatus } from '@/services/taskService';
import type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskPhase,
  TaskFilters,
  TASK_STATUS_CONFIG,
  TASK_PRIORITY_CONFIG,
  TASK_PHASE_CONFIG,
} from '@/types/task';

// ════════════════════════════════════════════════════════════════════════
// Styled
// ════════════════════════════════════════════════════════════════════════

const fadeIn = keyframes`from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}`;

const Container = styled.div`max-width: 1200px; margin: 0 auto;`;

const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${space[2]};
  margin-bottom: ${space[5]};
  padding: ${space[3]} ${space[4]};
  background: ${neutral[50]};
  border: ${borderTokens.default};
  border-radius: ${radius.xl};
`;

const FilterLabel = styled.span`
  font-family: ${fontFamily.sans};
  font-size: ${t.captionSm.size};
  font-weight: 600;
  color: ${neutral[500]};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  gap: ${space[1]};

  svg { width: 14px; height: 14px; }
`;

const Chip = styled.button<{ $active?: boolean; $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${space[1]};
  padding: ${space[1]} ${space[2.5]};
  border-radius: ${radius.full};
  border: 1px solid ${({ $active }) => $active ? accent[300] : neutral[200]};
  background: ${({ $active }) => $active ? accent[50] : 'white'};
  cursor: pointer;
  font-family: ${fontFamily.sans};
  font-size: ${t.captionSm.size};
  font-weight: 500;
  color: ${({ $active }) => $active ? accent[700] : neutral[600]};
  transition: all ${duration.fast} ease;

  &:hover { border-color: ${accent[300]}; }
  &:focus-visible { ${focusRingStyle} }
`;

const Separator = styled.div`
  width: 1px;
  height: 24px;
  background: ${neutral[200]};
  margin: 0 ${space[1]};
`;

const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space[2]};
`;

const TaskCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[3]};
  padding: ${space[3]} ${space[4]};
  background: ${color.bg};
  border: ${borderTokens.default};
  border-radius: ${radius.lg};
  cursor: pointer;
  transition: box-shadow ${duration.fast} ease, border-color ${duration.fast} ease;
  animation: ${fadeIn} ${duration.normal} ${easing.out};

  &:hover {
    box-shadow: ${shadow.md};
    border-color: ${accent[200]};
  }

  @media ${reducedMotion} { animation: none; }
`;

const PriorityDot = styled.div<{ $color: string }>`
  width: 8px; height: 8px;
  border-radius: 4px;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const TaskInfo = styled.div`flex: 1; min-width: 0;`;

const TaskTitle = styled.div`
  font-family: ${fontFamily.sans};
  font-size: ${t.bodySm.size};
  font-weight: 500;
  color: ${color.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TaskMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  margin-top: 2px;
  font-size: ${t.captionSm.size};
  color: ${color.textMuted};
`;

const BlockingBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  font-weight: 600;
  color: ${semantic.error};
  background: #fef2f2;
  padding: 1px ${space[1.5]};
  border-radius: ${radius.xs};

  svg { width: 12px; height: 12px; }
`;

const StatusSelect = styled.select`
  font-family: ${fontFamily.sans};
  font-size: ${t.captionSm.size};
  padding: ${space[1]} ${space[2]};
  border: 1px solid ${neutral[200]};
  border-radius: ${radius.md};
  background: ${color.bg};
  color: ${color.text};
  cursor: pointer;
  flex-shrink: 0;

  &:focus-visible { ${focusRingStyle} }
`;

const AssigneePill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: ${t.captionSm.size};
  color: ${neutral[500]};

  svg { width: 12px; height: 12px; }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${space[12]} ${space[4]};
  color: ${color.textMuted};
  font-size: ${t.bodySm.size};
`;

// ════════════════════════════════════════════════════════════════════════
// Config maps (imported types used for display only)
// ════════════════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: '#6B7280' },
  in_progress: { label: 'In Progress', color: '#3B82F6' },
  done: { label: 'Done', color: '#10B981' },
  cancelled: { label: 'Cancelled', color: '#9CA3AF' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#EF4444' },
  high: { label: 'High', color: '#F59E0B' },
  medium: { label: 'Medium', color: '#3B82F6' },
  low: { label: 'Low', color: '#6B7280' },
};

const PHASE_CONFIG: Record<TaskPhase, { label: string }> = {
  review: { label: 'Review' },
  filing: { label: 'Filing' },
  approval: { label: 'Approval' },
  implementation: { label: 'Implementation' },
  testing: { label: 'Testing' },
  general: { label: 'General' },
};

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

const TaskBoard: React.FC = () => {
  const { currentOrgId } = useRoleContext();
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>(['open', 'in_progress']);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority[]>([]);
  const [phaseFilter, setPhaseFilter] = useState<TaskPhase[]>([]);

  // Init from URL params
  useEffect(() => {
    const csId = searchParams.get('changeSetId');
    // If linked from a change set, we'll filter by it
    if (csId) {
      // Pre-set (filters are applied in listTasks)
    }
  }, [searchParams]);

  // Fetch tasks
  useEffect(() => {
    if (!currentOrgId) return;
    setLoading(true);

    const filters: TaskFilters = {};
    if (statusFilter.length > 0) filters.status = statusFilter;
    if (priorityFilter.length > 0) filters.priority = priorityFilter;
    if (phaseFilter.length > 0) filters.phase = phaseFilter;

    const csId = searchParams.get('changeSetId');
    if (csId) filters.changeSetId = csId;

    listTasks(currentOrgId, filters)
      .then(setTasks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentOrgId, statusFilter, priorityFilter, phaseFilter, searchParams]);

  // Toggle filter chip
  const toggleStatus = useCallback((s: TaskStatus) => {
    setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }, []);
  const togglePriority = useCallback((p: TaskPriority) => {
    setPriorityFilter(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }, []);
  const togglePhase = useCallback((p: TaskPhase) => {
    setPhaseFilter(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }, []);

  // Quick status change
  const handleStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    if (!currentOrgId) return;
    try {
      await transitionTaskStatus(currentOrgId, taskId, newStatus);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  }, [currentOrgId]);

  // Sort: blocking first, then by priority order, then by creation date
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.blocking && !b.blocking) return -1;
      if (!a.blocking && b.blocking) return 1;
      const pa = PRIORITY_CONFIG[a.priority]?.color === '#EF4444' ? 0 : PRIORITY_CONFIG[a.priority]?.color === '#F59E0B' ? 1 : 2;
      const pb = PRIORITY_CONFIG[b.priority]?.color === '#EF4444' ? 0 : PRIORITY_CONFIG[b.priority]?.color === '#F59E0B' ? 1 : 2;
      return pa - pb;
    });
  }, [tasks]);

  return (
    <PageShell>
      <MainNavigation />
      <PageBody>
        <Container>
          <PageHeader>
            <PageHeaderLeft>
              <PageTitle>Tasks</PageTitle>
            </PageHeaderLeft>
          </PageHeader>

          {/* Filter bar */}
          <FilterBar>
            <FilterLabel><FunnelIcon /> Status</FilterLabel>
            {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(s => (
              <Chip key={s} $active={statusFilter.includes(s)} onClick={() => toggleStatus(s)}>
                {STATUS_CONFIG[s].label}
              </Chip>
            ))}

            <Separator />

            <FilterLabel><ExclamationTriangleIcon /> Priority</FilterLabel>
            {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map(p => (
              <Chip key={p} $active={priorityFilter.includes(p)} onClick={() => togglePriority(p)}>
                {PRIORITY_CONFIG[p].label}
              </Chip>
            ))}

            <Separator />

            <FilterLabel><TagIcon /> Phase</FilterLabel>
            {(Object.keys(PHASE_CONFIG) as TaskPhase[]).map(p => (
              <Chip key={p} $active={phaseFilter.includes(p)} onClick={() => togglePhase(p)}>
                {PHASE_CONFIG[p].label}
              </Chip>
            ))}
          </FilterBar>

          {/* Task list */}
          <TaskList>
            {loading && <EmptyState>Loading tasks…</EmptyState>}

            {!loading && sortedTasks.length === 0 && (
              <EmptyState>No tasks match current filters</EmptyState>
            )}

            {sortedTasks.map(task => (
              <TaskCard key={task.id}>
                <PriorityDot $color={PRIORITY_CONFIG[task.priority]?.color || '#6B7280'} />

                <TaskInfo>
                  <TaskTitle>{task.title}</TaskTitle>
                  <TaskMeta>
                    <Badge
                      $variant={
                        task.status === 'done' ? 'success' :
                        task.status === 'in_progress' ? 'info' :
                        task.status === 'cancelled' ? 'neutral' : 'warning'
                      }
                      $size="sm"
                    >
                      {STATUS_CONFIG[task.status]?.label}
                    </Badge>
                    <span>{PHASE_CONFIG[task.phase]?.label}</span>
                    {task.dueDate && <span>Due {task.dueDate}</span>}
                    {task.links.length > 0 && (
                      <span>{task.links[0].label || task.links[0].type}</span>
                    )}
                  </TaskMeta>
                </TaskInfo>

                {task.blocking && (
                  <BlockingBadge>
                    <ShieldExclamationIcon /> Blocker
                  </BlockingBadge>
                )}

                {task.assigneeName && (
                  <AssigneePill>
                    <UserIcon /> {task.assigneeName}
                  </AssigneePill>
                )}

                <StatusSelect
                  value={task.status}
                  onChange={e => handleStatusChange(task.id, e.target.value as TaskStatus)}
                  onClick={e => e.stopPropagation()}
                  aria-label={`Change status of ${task.title}`}
                >
                  {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </StatusSelect>
              </TaskCard>
            ))}
          </TaskList>
        </Container>
      </PageBody>
    </PageShell>
  );
};

export default TaskBoard;
