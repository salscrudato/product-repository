// src/components/AdminTaskReset.js
import React, { useState } from 'react';
import styled from 'styled-components';
import { 
  TrashIcon, 
  PlusIcon, 
  EyeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/solid';
import { 
  resetWithCommercialPropertyTasks, 
  previewCommercialPropertyTasks,
  getCommercialPropertyTaskSummary 
} from '../utils/commercialPropertyTaskSeeder';

const AdminContainer = styled.div`
  max-width: 800px;
  margin: 40px auto;
  padding: 32px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 2px solid #f3f4f6;
`;

const AdminHeader = styled.div`
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid #e5e7eb;
`;

const AdminTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
`;

const AdminSubtitle = styled.p`
  font-size: 16px;
  color: #6b7280;
  margin: 0;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  flex-wrap: wrap;
`;

const AdminButton = styled.button`
  flex: 1;
  min-width: 200px;
  padding: 16px 24px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &.preview {
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
    }
  }
  
  &.reset {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(239, 68, 68, 0.3);
    }
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  svg {
    width: 18px;
    height: 18px;
  }
`;

const StatusContainer = styled.div`
  margin-top: 24px;
  padding: 20px;
  border-radius: 12px;
  border: 2px solid ${props => props.type === 'success' ? '#10b981' : props.type === 'error' ? '#ef4444' : '#6b7280'};
  background: ${props => props.type === 'success' ? '#f0fdf4' : props.type === 'error' ? '#fef2f2' : '#f9fafb'};
`;

const StatusTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.type === 'success' ? '#059669' : props.type === 'error' ? '#dc2626' : '#374151'};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatusText = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${props => props.type === 'success' ? '#065f46' : props.type === 'error' ? '#991b1b' : '#4b5563'};
  line-height: 1.5;
`;

const PreviewContainer = styled.div`
  margin-top: 24px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
`;

const PreviewTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
`;

const PhaseSection = styled.div`
  margin-bottom: 16px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const PhaseTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const TaskList = styled.ul`
  margin: 0;
  padding-left: 20px;
  list-style: disc;
`;

const TaskItem = styled.li`
  font-size: 13px;
  color: #4b5563;
  margin-bottom: 4px;
  line-height: 1.4;
`;

const WarningBox = styled.div`
  margin-bottom: 24px;
  padding: 16px;
  background: #fef3c7;
  border: 2px solid #f59e0b;
  border-radius: 12px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const WarningText = styled.div`
  font-size: 14px;
  color: #92400e;
  line-height: 1.5;
  
  strong {
    font-weight: 600;
  }
`;

export default function AdminTaskReset() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const handlePreview = () => {
    setShowPreview(!showPreview);
    if (!showPreview) {
      // Log to console as well
      previewCommercialPropertyTasks();
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      '⚠️  WARNING: This will DELETE ALL existing tasks and replace them with 10 commercial property tasks.\n\n' +
      'This action cannot be undone. Are you sure you want to proceed?'
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      const result = await resetWithCommercialPropertyTasks();

      if (result.success) {
        setStatus({
          type: 'success',
          title: 'Tasks Reset Successfully!',
          message: `Deleted ${result.deleted} existing tasks and added ${result.added} new commercial property tasks. Check the Tasks page to see your new workflow.`
        });
      } else {
        setStatus({
          type: 'error',
          title: 'Reset Failed',
          message: `Error: ${result.error}`
        });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        title: 'Reset Failed',
        message: `Unexpected error: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const taskSummary = getCommercialPropertyTaskSummary();

  return (
    <AdminContainer>
      <AdminHeader>
        <AdminTitle>
          🏢 Commercial Property Task Reset
        </AdminTitle>
        <AdminSubtitle>
          Reset task database with realistic commercial property insurance workflow
        </AdminSubtitle>
      </AdminHeader>

      <WarningBox>
        <ExclamationTriangleIcon style={{ width: '24px', height: '24px', color: '#f59e0b', flexShrink: 0 }} />
        <WarningText>
          <strong>Warning:</strong> This will permanently delete all existing tasks and replace them with 10 pre-configured commercial property insurance tasks across all workflow phases.
        </WarningText>
      </WarningBox>

      <ButtonGroup>
        <AdminButton 
          className="preview" 
          onClick={handlePreview}
          disabled={isLoading}
        >
          <EyeIcon />
          {showPreview ? 'Hide Preview' : 'Preview Tasks'}
        </AdminButton>

        <AdminButton 
          className="reset" 
          onClick={handleReset}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div style={{ width: '18px', height: '18px', border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              Resetting...
            </>
          ) : (
            <>
              <TrashIcon />
              Reset Tasks
            </>
          )}
        </AdminButton>
      </ButtonGroup>

      {showPreview && (
        <PreviewContainer>
          <PreviewTitle>📋 Commercial Property Tasks Preview (10 tasks)</PreviewTitle>
          
          {Object.entries(taskSummary).map(([phase, tasks]) => (
            <PhaseSection key={phase}>
              <PhaseTitle>
                {phase === 'research' && '🔍 Research & Ideation'}
                {phase === 'develop' && '🛠️ Product Development'}
                {phase === 'compliance' && '📋 Compliance & Filings'}
                {phase === 'implementation' && '🚀 Implementation & Launch'}
                {` (${tasks.length} tasks)`}
              </PhaseTitle>
              <TaskList>
                {tasks.map((task, index) => (
                  <TaskItem key={index}>
                    <strong>{task.title}</strong> - {task.priority} priority, assigned to {task.assignee}, due {task.dueDate}
                  </TaskItem>
                ))}
              </TaskList>
            </PhaseSection>
          ))}
        </PreviewContainer>
      )}

      {status && (
        <StatusContainer type={status.type}>
          <StatusTitle type={status.type}>
            {status.type === 'success' ? <CheckCircleIcon /> : <ExclamationTriangleIcon />}
            {status.title}
          </StatusTitle>
          <StatusText type={status.type}>
            {status.message}
          </StatusText>
        </StatusContainer>
      )}
    </AdminContainer>
  );
}
