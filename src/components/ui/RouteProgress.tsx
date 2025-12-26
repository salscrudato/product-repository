/**
 * RouteProgress - Visual progress indicator for route transitions
 * 
 * Shows a progress bar at the top of the screen during lazy-loaded
 * route transitions to provide feedback on loading state.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';

// ============ Animations ============
const progressIndeterminate = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

// ============ Styled Components ============
const ProgressContainer = styled.div<{ $isVisible: boolean; $isCompleting: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 10000;
  pointer-events: none;
  overflow: hidden;
  background: rgba(99, 102, 241, 0.1);
  
  ${({ $isVisible }) => !$isVisible && css`
    opacity: 0;
    visibility: hidden;
  `}
  
  ${({ $isCompleting }) => $isCompleting && css`
    animation: ${fadeOut} 0.3s ease-out forwards;
  `}
`;

const ProgressBar = styled.div<{ $progress: number; $isIndeterminate: boolean }>`
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4);
  background-size: 200% 100%;
  border-radius: 0 2px 2px 0;
  transition: width 0.2s ease-out;
  
  ${({ $isIndeterminate, $progress }) => $isIndeterminate ? css`
    width: 30%;
    animation: ${progressIndeterminate} 1s ease-in-out infinite;
  ` : css`
    width: ${$progress}%;
  `}
  
  /* Shimmer effect */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.4) 50%,
      transparent 100%
    );
    animation: ${progressIndeterminate} 1.5s ease-in-out infinite;
  }
`;

const Glow = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  width: 100px;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.5));
  filter: blur(4px);
`;

// ============ Context & Hook ============
interface RouteProgressContextType {
  start: () => void;
  done: () => void;
  set: (progress: number) => void;
  isLoading: boolean;
}

const RouteProgressContext = createContext<RouteProgressContextType | null>(null);

export const useRouteProgress = (): RouteProgressContextType => {
  const context = useContext(RouteProgressContext);
  if (!context) {
    throw new Error('useRouteProgress must be used within RouteProgressProvider');
  }
  return context;
};

// ============ Provider Component ============
interface RouteProgressProviderProps {
  children: React.ReactNode;
  /** Minimum time to show progress (prevents flash) */
  minimumDuration?: number;
  /** Delay before showing progress (prevents flash for fast loads) */
  showDelay?: number;
}

export const RouteProgressProvider: React.FC<RouteProgressProviderProps> = ({
  children,
  minimumDuration = 300,
  showDelay = 100,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const startTimeRef = useRef<number>(0);
  const showTimeoutRef = useRef<NodeJS.Timeout>();
  const progressIntervalRef = useRef<NodeJS.Timeout>();

  const start = useCallback(() => {
    // Clear any existing timers
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    
    setIsLoading(true);
    setIsCompleting(false);
    setProgress(0);
    startTimeRef.current = Date.now();
    
    // Delay showing to prevent flash for fast loads
    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      
      // Simulate progress
      let currentProgress = 0;
      progressIntervalRef.current = setInterval(() => {
        currentProgress += Math.random() * 15;
        if (currentProgress > 90) currentProgress = 90;
        setProgress(currentProgress);
      }, 200);
    }, showDelay);
  }, [showDelay]);

  const done = useCallback(() => {
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    
    const elapsed = Date.now() - startTimeRef.current;
    const remaining = Math.max(0, minimumDuration - elapsed);
    
    // Complete the progress bar
    setProgress(100);
    
    setTimeout(() => {
      setIsCompleting(true);
      setTimeout(() => {
        setIsLoading(false);
        setIsVisible(false);
        setIsCompleting(false);
        setProgress(0);
      }, 300);
    }, remaining);
  }, [minimumDuration]);

  const set = useCallback((value: number) => {
    setProgress(Math.min(100, Math.max(0, value)));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  return (
    <RouteProgressContext.Provider value={{ start, done, set, isLoading }}>
      {children}
      <ProgressContainer $isVisible={isVisible} $isCompleting={isCompleting}>
        <ProgressBar $progress={progress} $isIndeterminate={false} />
        {isVisible && <Glow />}
      </ProgressContainer>
    </RouteProgressContext.Provider>
  );
};

export default RouteProgressProvider;

