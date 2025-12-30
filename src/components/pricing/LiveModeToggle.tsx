import React from 'react';
import styled, { keyframes } from 'styled-components';
import {
  BoltIcon,
  PlayIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { BoltIcon as BoltSolidIcon } from '@heroicons/react/24/solid';

// ============================================================================
// Types
// ============================================================================

interface LiveModeToggleProps {
  isLive: boolean;
  onToggle: (isLive: boolean) => void;
  onRunCalculation: () => void;
  isCalculating?: boolean;
}

// ============================================================================
// Animations
// ============================================================================

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ToggleGroup = styled.div`
  display: flex;
  align-items: center;
  background: rgba(248, 250, 252, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 10px;
  padding: 4px;
`;

const ToggleOption = styled.button<{ $active?: boolean; $isLive?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  background: ${({ $active, $isLive }) => 
    $active 
      ? $isLive 
        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
        : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
      : 'transparent'};
  color: ${({ $active }) => $active ? 'white' : '#64748b'};
  box-shadow: ${({ $active }) => $active ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'none'};
  
  &:hover {
    background: ${({ $active, $isLive }) => 
      $active 
        ? $isLive 
          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
          : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
        : 'rgba(226, 232, 240, 0.5)'};
    color: ${({ $active }) => $active ? 'white' : '#374151'};
  }
  
  svg { width: 16px; height: 16px; }
`;

const LiveIndicator = styled.span<{ $active?: boolean }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $active }) => $active ? '#10b981' : '#94a3b8'};
  animation: ${({ $active }) => $active ? pulse : 'none'} 1.5s ease-in-out infinite;
`;

const RunButton = styled.button<{ $isCalculating?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: ${({ $isCalculating }) => $isCalculating ? 'wait' : 'pointer'};
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
  opacity: ${({ $isCalculating }) => $isCalculating ? 0.8 : 1};
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.35);
  }
  
  &:active:not(:disabled) { transform: translateY(0); }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  svg { 
    width: 18px; 
    height: 18px;
    animation: ${({ $isCalculating }) => $isCalculating ? spin : 'none'} 1s linear infinite;
  }
`;

const StatusText = styled.span`
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
`;

// ============================================================================
// Component
// ============================================================================

export const LiveModeToggleComponent: React.FC<LiveModeToggleProps> = ({
  isLive,
  onToggle,
  onRunCalculation,
  isCalculating = false,
}) => {
  return (
    <Container>
      <ToggleGroup>
        <ToggleOption
          $active={isLive}
          $isLive={true}
          onClick={() => onToggle(true)}
        >
          <LiveIndicator $active={isLive} />
          Live
        </ToggleOption>
        <ToggleOption
          $active={!isLive}
          onClick={() => onToggle(false)}
        >
          <PlayIcon />
          Manual
        </ToggleOption>
      </ToggleGroup>
      
      {!isLive && (
        <RunButton
          onClick={onRunCalculation}
          disabled={isCalculating}
          $isCalculating={isCalculating}
        >
          {isCalculating ? (
            <>
              <ArrowPathIcon />
              Calculating...
            </>
          ) : (
            <>
              <PlayIcon />
              Run Test
            </>
          )}
        </RunButton>
      )}
      
      {isLive && (
        <StatusText>
          Auto-recalculating on changes
        </StatusText>
      )}
    </Container>
  );
};

export default LiveModeToggleComponent;

