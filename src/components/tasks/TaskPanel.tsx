/**
 * TaskPanel  (Design System v2)
 *
 * Embeddable panel showing tasks linked to a specific change set.
 * Highlights blocking tasks and allows quick status transitions.
 *
 * Usage:
 *   <TaskPanel orgId={orgId} changeSetId={changeSetId} />
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  CheckCircleIcon,
  ClockIcon,
  ShieldExclamationIcon,
  UserIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  color, neutral, accent, semantic,
  space, radius, shadow, fontFamily,
  type as t, border as borderTokens,
  duration, focusRingStyle, reducedMotion,
} from '@/ui/tokens';
import { Badge } from '@/ui/components';
import { subscribeToChangeSetTasks, transitionTaskStatus } from '@/services/taskService';
import type { Task, TaskStatus } from '@/types/task';

// ════════════════════════════════════════════════════════════════════════
// Styled
// ════════════════════════════════════════════════════════════════════════

const fadeIn = keyframes`from{opacity:0}to{opacity:1}`;

const Panel = styled.div`
  background: ${color.bg};
  border: ${borderTokens.default};
  border-radius: ${radius.xl};
  overflow: hidden;
  animation: ${fadeIn} ${duration.normal} ease;
  @media ${reducedMotion} { animation: none; }
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${space[3]} ${space[4]};
  border-bottom: ${borderTokens.default};
  background: ${neutral[50]};
`;

const PanelTitle = styled.h3`
  margin: 0;
  font-family: ${fontFamily.sans};
  font-size: ${t.bodySm.size};
  font-weight: 600;
  color: ${color.text};
  display: flex;
  align-items: center;
  gap: ${space[2]};

  svg { width: 16px; height: 16px; }
`;

const BlockerCount = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: ${space[0.5]} ${space[2]};
  background: #fef2f2;
  border-radius: ${radius.full};
  font-size: 11px;
  font-weight: 700;
  color: ${semantic.error};

  svg { width: 12px; height: 12px; }
`;

const TaskRow = styled.div<{ $isBlocking?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${space[3]};
  padding: ${space[2.5]} ${space[4]};
  border-bottom: ${borderTokens.default};
  background: ${({ $isBlocking }) => $isBlocking ? '#fef2f2' : 'transparent'};
  transition: background ${duration.fast} ease;

  &:last-child { border-bottom: none; }
  &:hover { background: ${({ $isBlocking }) => $isBlocking ? '#fddede' : neutral[50]}; }
`;

const TaskIcon = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
  border-radius: ${radius.md};
  background: ${({ $color }) => $color}11;

  svg { width: 16px; height: 16px; color: ${({ $color }) => $color}; }
`;

const TaskInfo = styled.div`flex: 1; min-width: 0;`;

const TaskTitle = styled.div`
  font-family: ${fontFamily.sans};
  font-size: ${t.captionSm.size};
  font-weight: 500;
  color: ${color.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TaskMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[1.5]};
  margin-top: 1px;
  font-size: 11px;
  color: ${color.textMuted};
`;

const ActionBtn = styled.button`
  display: flex;
  align-items: center;
  gap: ${space[1]};
  padding: ${space[1]} ${space[2]};
  border: 1px solid ${neutral[200]};
  border-radius: ${radius.md};
  background: ${color.bg};
  font-family: ${fontFamily.sans};
  font-size: 11px;
  font-weight: 500;
  color: ${color.text};
  cursor: pointer;
  transition: all ${duration.fast} ease;
  flex-shrink: 0;

  &:hover {
    border-color: ${accent[300]};
    background: ${accent[50]};
  }
  &:focus-visible { ${focusRingStyle} }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  svg { width: 13px; height: 13px; }
`;

const EmptyText = styled.div`
  padding: ${space[6]} ${space[4]};
  text-align: center;
  font-size: ${t.captionSm.size};
  color: ${color.textMuted};
`;

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

const STATUS_META: Record<TaskStatus, { icon: React.ElementType; color: string; label: string }> = {
  open:        { icon: ClockIcon,            color: '#6B7280', label: 'Open' },
  in_progress: { icon: ArrowPathIcon,        color: '#3B82F6', label: 'In Progress' },
  done:        { icon: CheckCircleIcon,      color: '#10B981', label: 'Done' },
  cancelled:   { icon: ClockIcon,            color: '#9CA3AF', label: 'Cancelled' },
};

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

interface TaskPanelProps {
  orgId: string;
  changeSetId: string;
}

const TaskPanel: React.FC<TaskPanelProps> = ({ orgId, changeSetId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !changeSetId) return;
    setLoading(true);
    const unsub = subscribeToChangeSetTasks(orgId, changeSetId, (ts) => {
      setTasks(ts);
      setLoading(false);
    });
    return unsub;
  }, [orgId, changeSetId]);

  const blockerCount = tasks.filter(t => t.blocking && t.status !== 'done' && t.status !== 'cancelled').length;

  // Sort: blockers first, then by status priority
  const sorted = [...tasks].sort((a, b) => {
    const aBlocking = a.blocking && a.status !== 'done' && a.status !== 'cancelled';
    const bBlocking = b.blocking && b.status !== 'done' && b.status !== 'cancelled';
    if (aBlocking && !bBlocking) return -1;
    if (!aBlocking && bBlocking) return 1;
    const order: Record<TaskStatus, number> = { open: 0, in_progress: 1, done: 2, cancelled: 3 };
    return order[a.status] - order[b.status];
  });

  const handleComplete = useCallback(async (taskId: string) => {
    setActionLoading(taskId);
    try {
      await transitionTaskStatus(orgId, taskId, 'done');
    } catch (err) {
      console.error('Failed to complete task:', err);
    } finally {
      setActionLoading(null);
    }
  }, [orgId]);

  const handleReopen = useCallback(async (taskId: string) => {
    setActionLoading(taskId);
    try {
      await transitionTaskStatus(orgId, taskId, 'open');
    } catch (err) {
      console.error('Failed to reopen task:', err);
    } finally {
      setActionLoading(null);
    }
  }, [orgId]);

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>
          <ClockIcon /> Tasks ({tasks.length})
        </PanelTitle>
        {blockerCount > 0 && (
          <BlockerCount aria-live="polite">
            <ShieldExclamationIcon /> {blockerCount} blocker{blockerCount > 1 ? 's' : ''}
          </BlockerCount>
        )}
      </PanelHeader>

      {loading && <EmptyText>Loading tasks…</EmptyText>}

      {!loading && sorted.length === 0 && (
        <EmptyText>No tasks linked to this change set</EmptyText>
      )}

      {sorted.map(task => {
        const isBlocker = task.blocking && task.status !== 'done' && task.status !== 'cancelled';
        const meta = STATUS_META[task.status];
        const Icon = meta.icon;
        const isDone = task.status === 'done' || task.status === 'cancelled';

        return (
          <TaskRow key={task.id} $isBlocking={isBlocker}>
            <TaskIcon $color={meta.color}>
              <Icon />
            </TaskIcon>

            <TaskInfo>
              <TaskTitle style={{ textDecoration: isDone ? 'line-through' : 'none' }}>
                {task.title}
              </TaskTitle>
              <TaskMeta>
                {isBlocker && (
                  <Badge $variant="error" $size="sm">Blocker</Badge>
                )}
                <span>{meta.label}</span>
                {task.assigneeName && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    <UserIcon style={{ width: 11, height: 11 }} /> {task.assigneeName}
                  </span>
                )}
                {task.dueDate && <span>Due {task.dueDate}</span>}
              </TaskMeta>
            </TaskInfo>

            {!isDone ? (
              <ActionBtn
                onClick={() => handleComplete(task.id)}
                disabled={actionLoading === task.id}
                aria-label={`Mark "${task.title}" as done`}
              >
                <CheckCircleIcon /> Done
              </ActionBtn>
            ) : task.status === 'done' ? (
              <ActionBtn
                onClick={() => handleReopen(task.id)}
                disabled={actionLoading === task.id}
                aria-label={`Reopen "${task.title}"`}
              >
                <ArrowPathIcon /> Reopen
              </ActionBtn>
            ) : null}
          </TaskRow>
        );
      })}
    </Panel>
  );
};

export default TaskPanel;
