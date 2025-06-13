// src/components/ui/TaskOverviewCard.js
import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import {
  CalendarIcon,
  UserIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  DocumentCheckIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/solid';

// ============================================================================
// Styled Components
// ============================================================================

const Card = styled.div`
  background: ${({ theme }) => theme.isDarkMode ? theme.colours.cardBackground : 'white'};
  border-radius: 16px;
  padding: 20px;
  border: 1px solid ${({ theme }) => theme.isDarkMode ? theme.colours.border : '#e5e7eb'};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid ${({ theme }) => theme.isDarkMode ? theme.colours.border : '#e5e7eb'};
`;

const CardTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.isDarkMode ? theme.colours.text : '#1f2937'};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    width: 20px;
    height: 20px;
    color: #6366f1;
  }
`;

const ViewAllLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.15);
    transform: translateY(-1px);
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

const TasksList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TaskItem = styled.div`
  padding: 12px;
  border-radius: 10px;
  background: ${({ theme }) => theme.isDarkMode 
    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, rgba(59, 130, 246, 0.03) 100%)'
    : 'linear-gradient(135deg, rgba(139, 92, 246, 0.02) 0%, rgba(59, 130, 246, 0.02) 100%)'
  };
  border: 1px solid ${({ theme }) => theme.isDarkMode ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.06)'};
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.isDarkMode 
      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)'
      : 'linear-gradient(135deg, rgba(139, 92, 246, 0.04) 0%, rgba(59, 130, 246, 0.04) 100%)'
    };
    border-color: ${({ theme }) => theme.isDarkMode ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.1)'};
  }

  &.overdue {
    border-left: 3px solid #ef4444;
    background: ${({ theme }) => theme.isDarkMode 
      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.02) 100%)'
      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.02) 0%, rgba(239, 68, 68, 0.01) 100%)'
    };
  }
`;

const TaskHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const TaskTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.isDarkMode ? theme.colours.text : '#1f2937'};
  margin: 0;
  line-height: 1.3;
  flex: 1;
  margin-right: 8px;
`;

const PhaseIcon = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.color}15;
  color: ${props => props.color};
  flex-shrink: 0;

  svg {
    width: 12px;
    height: 12px;
  }
`;

const TaskMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
`;

const MetaBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  background: ${({ theme }) => theme.isDarkMode ? theme.colours.surface : '#f3f4f6'};
  color: ${({ theme }) => theme.isDarkMode ? theme.colours.textSecondary : '#6b7280'};

  svg {
    width: 10px;
    height: 10px;
  }

  &.priority-high {
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
  }

  &.priority-medium {
    background: rgba(245, 158, 11, 0.1);
    color: #d97706;
  }

  &.priority-low {
    background: rgba(34, 197, 94, 0.1);
    color: #059669;
  }

  &.overdue {
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
  }
`;

const AISummary = styled.div`
  font-size: 12px;
  line-height: 1.4;
  color: ${({ theme }) => theme.isDarkMode ? theme.colours.textSecondary : '#6b7280'};
  font-style: italic;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 20px;
  text-align: center;
  color: ${({ theme }) => theme.isDarkMode ? theme.colours.textSecondary : '#6b7280'};

  svg {
    width: 40px;
    height: 40px;
    margin-bottom: 12px;
    opacity: 0.5;
  }

  h4 {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 6px 0;
    color: ${({ theme }) => theme.isDarkMode ? theme.colours.text : '#374151'};
  }

  p {
    font-size: 12px;
    margin: 0;
    line-height: 1.4;
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px 20px;
  color: ${({ theme }) => theme.isDarkMode ? theme.colours.textSecondary : '#6b7280'};
  font-size: 12px;
`;

// ============================================================================
// Helper Functions
// ============================================================================

const getPhaseIcon = (phase) => {
  const icons = {
    'research': LightBulbIcon,
    'develop': DocumentCheckIcon,
    'compliance': ShieldCheckIcon,
    'implementation': RocketLaunchIcon
  };
  return icons[phase] || LightBulbIcon;
};

const getPhaseColor = (phase) => {
  const colors = {
    'research': '#f59e0b',
    'develop': '#3b82f6',
    'compliance': '#8b5cf6',
    'implementation': '#10b981'
  };
  return colors[phase] || '#6b7280';
};

const formatDate = (dateString) => {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (date < now) {
    if (diffDays === 1) return '1d overdue';
    return `${diffDays}d overdue`;
  }

  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays < 7) return `Due in ${diffDays}d`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
};

// ============================================================================
// Main Component
// ============================================================================

const TaskOverviewCard = ({ tasks = [], isLoading = false, maxItems = 5 }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <ClipboardDocumentListIcon />
            Upcoming Tasks
          </CardTitle>
        </CardHeader>
        <LoadingState>
          Loading task summaries...
        </LoadingState>
      </Card>
    );
  }

  const displayTasks = tasks.slice(0, maxItems);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <ClipboardDocumentListIcon />
          Upcoming Tasks
        </CardTitle>
        <ViewAllLink to="/tasks">
          View All
          <ArrowTopRightOnSquareIcon />
        </ViewAllLink>
      </CardHeader>

      {displayTasks.length === 0 ? (
        <EmptyState>
          <ClipboardDocumentListIcon />
          <h4>No upcoming tasks</h4>
          <p>All caught up! Check the Tasks page to create new tasks.</p>
        </EmptyState>
      ) : (
        <TasksList>
          {displayTasks.map(task => {
            const PhaseIconComponent = getPhaseIcon(task.phase);
            const phaseColor = getPhaseColor(task.phase);
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
            const formattedDate = formatDate(task.dueDate);

            return (
              <TaskItem key={task.id} className={isOverdue ? 'overdue' : ''}>
                <TaskHeader>
                  <TaskTitle>{task.title}</TaskTitle>
                  <PhaseIcon color={phaseColor}>
                    <PhaseIconComponent />
                  </PhaseIcon>
                </TaskHeader>

                <TaskMeta>
                  <MetaBadge className={`priority-${task.priority}`}>
                    {task.priority}
                  </MetaBadge>
                  
                  {task.assignee && (
                    <MetaBadge>
                      <UserIcon />
                      {task.assignee}
                    </MetaBadge>
                  )}
                  
                  {formattedDate && (
                    <MetaBadge className={isOverdue ? 'overdue' : ''}>
                      <CalendarIcon />
                      {formattedDate}
                    </MetaBadge>
                  )}
                  
                  {isOverdue && (
                    <MetaBadge className="overdue">
                      <ExclamationTriangleIcon />
                      Overdue
                    </MetaBadge>
                  )}
                </TaskMeta>

                {task.aiSummary && (
                  <AISummary>
                    {task.aiSummary.summary}
                  </AISummary>
                )}
              </TaskItem>
            );
          })}
        </TasksList>
      )}
    </Card>
  );
};

export default TaskOverviewCard;
