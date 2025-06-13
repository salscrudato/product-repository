// src/components/ui/TaskSummaryCard.js
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
  ArrowTopRightOnSquareIcon
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
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    border-color: #6366f1;
  }

  &.overdue {
    border-left: 4px solid #ef4444;
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
  margin-bottom: 12px;
`;

const TaskTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.isDarkMode ? theme.colours.text : '#1f2937'};
  margin: 0;
  line-height: 1.4;
  flex: 1;
  margin-right: 12px;
`;

const PhaseIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.color}15;
  color: ${props => props.color};
  flex-shrink: 0;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const TaskMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`;

const MetaBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: ${({ theme }) => theme.isDarkMode ? theme.colours.surface : '#f3f4f6'};
  color: ${({ theme }) => theme.isDarkMode ? theme.colours.textSecondary : '#6b7280'};

  svg {
    width: 12px;
    height: 12px;
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
  background: ${({ theme }) => theme.isDarkMode 
    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)'
    : 'linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, rgba(59, 130, 246, 0.03) 100%)'
  };
  border: 1px solid ${({ theme }) => theme.isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.08)'};
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
`;

const SummaryText = styled.p`
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.isDarkMode ? theme.colours.text : '#374151'};
  margin: 0 0 12px 0;
  font-weight: 500;
`;

const InsightsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const InsightItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.isDarkMode ? theme.colours.textSecondary : '#6b7280'};

  .label {
    font-weight: 600;
    color: ${({ theme }) => theme.isDarkMode ? theme.colours.text : '#374151'};
    min-width: 80px;
  }

  .content {
    flex: 1;
    line-height: 1.4;
  }
`;

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid ${({ theme }) => theme.isDarkMode ? theme.colours.border : '#f3f4f6'};
`;

const ViewTaskLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
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
    width: 14px;
    height: 14px;
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: ${({ theme }) => theme.isDarkMode ? theme.colours.textSecondary : '#6b7280'};
  font-size: 14px;
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
    if (diffDays === 1) return '1 day overdue';
    return `${diffDays} days overdue`;
  }

  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays < 7) return `Due in ${diffDays} days`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
};

// ============================================================================
// Main Component
// ============================================================================

const TaskSummaryCard = ({ task, isLoading = false }) => {
  if (isLoading) {
    return (
      <Card>
        <LoadingState>
          Generating AI summary...
        </LoadingState>
      </Card>
    );
  }

  if (!task) {
    return null;
  }

  const PhaseIconComponent = getPhaseIcon(task.phase);
  const phaseColor = getPhaseColor(task.phase);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const formattedDate = formatDate(task.dueDate);

  return (
    <Card className={isOverdue ? 'overdue' : ''}>
      <TaskHeader>
        <TaskTitle>{task.title}</TaskTitle>
        <PhaseIcon color={phaseColor}>
          <PhaseIconComponent />
        </PhaseIcon>
      </TaskHeader>

      <TaskMeta>
        <MetaBadge className={`priority-${task.priority}`}>
          {task.priority} priority
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
          <SummaryText>{task.aiSummary.summary}</SummaryText>
          <InsightsList>
            <InsightItem>
              <span className="label">Insights:</span>
              <span className="content">{task.aiSummary.keyInsights}</span>
            </InsightItem>
            <InsightItem>
              <span className="label">Next:</span>
              <span className="content">{task.aiSummary.nextActions}</span>
            </InsightItem>
            {task.aiSummary.riskFactors !== 'None identified' && (
              <InsightItem>
                <span className="label">Risks:</span>
                <span className="content">{task.aiSummary.riskFactors}</span>
              </InsightItem>
            )}
          </InsightsList>
        </AISummary>
      )}

      <CardFooter>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          {task.phase === 'research' && 'Research & Ideation'}
          {task.phase === 'develop' && 'Product Development'}
          {task.phase === 'compliance' && 'Compliance & Filings'}
          {task.phase === 'implementation' && 'Implementation & Launch'}
        </div>
        <ViewTaskLink to="/tasks">
          View Tasks
          <ArrowTopRightOnSquareIcon />
        </ViewTaskLink>
      </CardFooter>
    </Card>
  );
};

export default TaskSummaryCard;
