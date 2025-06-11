// src/components/AgentAssistant.js
import React, { useState, useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { 
  PaperAirplaneIcon, 
  XMarkIcon, 
  ChevronUpIcon,
  ChevronDownIcon,
  SparklesIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid';
import { runAgentWorkflow, getAgentPrompts, validateAgentGoal, formatAgentStep } from '../services/agentService';
import { useAgentTracker } from '../utils/performance';

// ============================================================================
// Styled Components
// ============================================================================

const Widget = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 380px;
  max-height: 600px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  z-index: 2000;
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
  
  ${props => props.isMinimized && `
    height: 60px;
    max-height: 60px;
  `}
`;

const Header = styled.div`
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px 16px 0 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HeaderButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  padding: 4px;
  color: white;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const ExecutionLog = styled.div`
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  max-height: 400px;
  font-size: 13px;
  line-height: 1.4;
`;

const LogEntry = styled.div`
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  border-left: 3px solid ${props => {
    switch (props.type) {
      case 'thought': return '#3b82f6';
      case 'action': return '#10b981';
      case 'error': return '#ef4444';
      case 'success': return '#22c55e';
      default: return '#6b7280';
    }
  }};
  background: ${props => {
    switch (props.type) {
      case 'thought': return '#eff6ff';
      case 'action': return '#f0fdf4';
      case 'error': return '#fef2f2';
      case 'success': return '#f0fdf4';
      default: return '#f9fafb';
    }
  }};
`;

const LogIcon = styled.div`
  display: inline-flex;
  align-items: center;
  margin-right: 8px;
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const LogContent = styled.div`
  display: inline;
  word-wrap: break-word;
`;

const LogAction = styled.div`
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
  font-family: 'Monaco', 'Menlo', monospace;
`;

const InputSection = styled.div`
  border-top: 1px solid #e5e7eb;
  padding: 16px;
`;

const InputRow = styled.form`
  display: flex;
  gap: 8px;
  align-items: flex-end;
`;

const TextInput = styled.input`
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  
  &:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
  
  &:disabled {
    background: #f9fafb;
    color: #6b7280;
  }
`;

const SendButton = styled.button`
  background: #667eea;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  color: white;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  
  &:hover:not(:disabled) {
    background: #5a67d8;
  }
  
  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const PromptSuggestions = styled.div`
  margin-bottom: 12px;
`;

const PromptCategory = styled.div`
  margin-bottom: 8px;
`;

const CategoryTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
`;

const PromptButton = styled.button`
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 4px 8px;
  margin: 2px 4px 2px 0;
  font-size: 11px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #e5e7eb;
    border-color: #9ca3af;
  }
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: ${props => {
    switch (props.status) {
      case 'running': return '#fef3c7';
      case 'completed': return '#d1fae5';
      case 'error': return '#fee2e2';
      default: return '#f3f4f6';
    }
  }};
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 12px;
  font-weight: 500;
`;

// ============================================================================
// Main Component
// ============================================================================

export default function AgentAssistant() {
  const [isMinimized, setIsMinimized] = useState(false);
  const [goal, setGoal] = useState('');
  const [executionLog, setExecutionLog] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('idle'); // idle, running, completed, error
  const [showPrompts, setShowPrompts] = useState(true);
  
  const logRef = useRef(null);
  const agentTracker = useAgentTracker();

  // Auto-scroll to bottom when new log entries are added
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [executionLog]);

  // Handle agent execution
  const handleRunAgent = useCallback(async (e) => {
    e.preventDefault();
    if (!goal.trim() || isRunning) return;

    // Validate goal
    const validation = validateAgentGoal(goal);
    if (!validation.isValid) {
      setExecutionLog(prev => [...prev, {
        type: 'error',
        content: validation.error,
        timestamp: new Date()
      }]);
      return;
    }

    setIsRunning(true);
    setCurrentStatus('running');
    setShowPrompts(false);
    setExecutionLog([]);

    const sessionId = Date.now().toString();
    agentTracker.startExecution(sessionId, goal);

    try {
      const result = await runAgentWorkflow(
        goal,
        (step, stepIndex) => {
          // Add step to execution log
          const formattedStep = formatAgentStep(step);
          setExecutionLog(prev => [...prev, formattedStep]);
          
          // Track step
          agentTracker.addStep(sessionId, {
            action: step.action,
            thought: step.thought,
            stepIndex
          });
        },
        10 // max steps
      );

      if (result.success) {
        setCurrentStatus('completed');
        setExecutionLog(prev => [...prev, {
          type: 'success',
          content: result.finalResult,
          timestamp: new Date()
        }]);
        agentTracker.completeExecution(sessionId, result.finalResult);
      } else {
        setCurrentStatus('error');
        setExecutionLog(prev => [...prev, {
          type: 'error',
          content: result.error,
          timestamp: new Date()
        }]);
        agentTracker.failExecution(sessionId, result.error);
      }
    } catch (error) {
      setCurrentStatus('error');
      setExecutionLog(prev => [...prev, {
        type: 'error',
        content: `Execution failed: ${error.message}`,
        timestamp: new Date()
      }]);
      agentTracker.failExecution(sessionId, error.message);
    } finally {
      setIsRunning(false);
      setGoal('');
    }
  }, [goal, isRunning, agentTracker]);

  // Handle prompt selection
  const handlePromptSelect = useCallback((prompt) => {
    setGoal(prompt);
    setShowPrompts(false);
  }, []);

  // Clear log
  const handleClear = useCallback(() => {
    setExecutionLog([]);
    setCurrentStatus('idle');
    setShowPrompts(true);
  }, []);

  // Render log entry
  const renderLogEntry = (entry, index) => {
    const getIcon = () => {
      switch (entry.type) {
        case 'thought':
          return <SparklesIcon />;
        case 'action':
          return <ClockIcon />;
        case 'success':
          return <CheckCircleIcon />;
        case 'error':
          return <ExclamationTriangleIcon />;
        default:
          return <SparklesIcon />;
      }
    };

    return (
      <LogEntry key={index} type={entry.type}>
        <LogIcon>{getIcon()}</LogIcon>
        <LogContent>{entry.content}</LogContent>
        {entry.action && (
          <LogAction>
            {entry.action}({JSON.stringify(entry.args || {})})
            {entry.result && <div>→ {JSON.stringify(entry.result)}</div>}
            {entry.error && <div style={{color: '#ef4444'}}>✗ {entry.error}</div>}
          </LogAction>
        )}
      </LogEntry>
    );
  };

  return (
    <Widget isMinimized={isMinimized}>
      <Header onClick={() => setIsMinimized(!isMinimized)}>
        <HeaderTitle>
          <SparklesIcon style={{ width: 16, height: 16 }} />
          InsuranceAgent
        </HeaderTitle>
        <HeaderActions>
          {!isMinimized && (
            <HeaderButton onClick={(e) => { e.stopPropagation(); handleClear(); }}>
              <XMarkIcon style={{ width: 14, height: 14 }} />
            </HeaderButton>
          )}
          <HeaderButton>
            {isMinimized ? 
              <ChevronUpIcon style={{ width: 14, height: 14 }} /> : 
              <ChevronDownIcon style={{ width: 14, height: 14 }} />
            }
          </HeaderButton>
        </HeaderActions>
      </Header>

      {!isMinimized && (
        <Content>
          <ExecutionLog ref={logRef}>
            {currentStatus !== 'idle' && (
              <StatusIndicator status={currentStatus}>
                {currentStatus === 'running' && '🤖 Agent is working...'}
                {currentStatus === 'completed' && '✅ Task completed successfully'}
                {currentStatus === 'error' && '❌ Task failed'}
              </StatusIndicator>
            )}

            {showPrompts && (
              <PromptSuggestions>
                {getAgentPrompts().slice(0, 2).map((category, idx) => (
                  <PromptCategory key={idx}>
                    <CategoryTitle>{category.category}</CategoryTitle>
                    {category.prompts.slice(0, 2).map((prompt, pidx) => (
                      <PromptButton
                        key={pidx}
                        onClick={() => handlePromptSelect(prompt)}
                      >
                        {prompt}
                      </PromptButton>
                    ))}
                  </PromptCategory>
                ))}
              </PromptSuggestions>
            )}

            {executionLog.length === 0 && !showPrompts && (
              <div style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
                Ask me to help with insurance product management tasks...
              </div>
            )}

            {executionLog.map(renderLogEntry)}
          </ExecutionLog>

          <InputSection>
            <InputRow onSubmit={handleRunAgent}>
              <TextInput
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g., Create a new auto product with liability coverage"
                disabled={isRunning}
              />
              <SendButton type="submit" disabled={!goal.trim() || isRunning}>
                <PaperAirplaneIcon />
              </SendButton>
            </InputRow>
          </InputSection>
        </Content>
      )}
    </Widget>
  );
}
