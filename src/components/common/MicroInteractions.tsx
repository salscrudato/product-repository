/**
 * MicroInteractions - Animation utilities for polished UI feedback
 * 
 * Provides reusable animation components and hooks for:
 * - Data update highlights
 * - Button/card interactions
 * - Success/error state transitions
 * - Haptic feedback simulation
 */

import React, { useEffect, useState, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';

// ---------- Keyframe Animations ----------

export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const fadeInDown = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
`;

export const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
`;

export const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
`;

export const highlight = keyframes`
  0% { background-color: rgba(99, 102, 241, 0.2); }
  100% { background-color: transparent; }
`;

export const successPop = keyframes`
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
`;

export const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;

// ---------- Animation Wrapper Components ----------

interface AnimatedProps {
  $delay?: number;
  $duration?: number;
}

export const FadeIn = styled.div<AnimatedProps>`
  animation: ${fadeIn} ${({ $duration }) => $duration || 0.3}s ease-out;
  animation-delay: ${({ $delay }) => $delay || 0}s;
  animation-fill-mode: both;
`;

export const FadeInUp = styled.div<AnimatedProps>`
  animation: ${fadeInUp} ${({ $duration }) => $duration || 0.3}s ease-out;
  animation-delay: ${({ $delay }) => $delay || 0}s;
  animation-fill-mode: both;
`;

export const ScaleIn = styled.div<AnimatedProps>`
  animation: ${scaleIn} ${({ $duration }) => $duration || 0.2}s ease-out;
  animation-delay: ${({ $delay }) => $delay || 0}s;
  animation-fill-mode: both;
`;

// Highlight effect for data updates
export const HighlightOnUpdate = styled.div<{ $highlight: boolean }>`
  transition: background-color 0.3s ease;
  ${({ $highlight }) => $highlight && css`
    animation: ${highlight} 1.5s ease-out;
  `}
`;

// Shake animation for errors
export const ShakeOnError = styled.div<{ $shake: boolean }>`
  ${({ $shake }) => $shake && css`
    animation: ${shake} 0.4s ease-out;
  `}
`;

// Success pop animation
export const SuccessPop = styled.div<AnimatedProps>`
  animation: ${successPop} ${({ $duration }) => $duration || 0.4}s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation-delay: ${({ $delay }) => $delay || 0}s;
  animation-fill-mode: both;
`;

// ---------- Interactive Effects ----------

// Hover lift effect mixin (for styled-components)
export const hoverLiftEffect = css`
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

// Press effect mixin
export const pressEffect = css`
  transition: transform 0.1s ease;
  
  &:active {
    transform: scale(0.98);
  }
`;

// ---------- Hooks ----------

// Hook for triggering highlight animation on data change
export const useHighlightOnChange = <T,>(value: T, duration = 1500): boolean => {
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [prevValue, setPrevValue] = useState<T>(value);

  useEffect(() => {
    if (value !== prevValue) {
      setIsHighlighted(true);
      setPrevValue(value);
      const timer = setTimeout(() => setIsHighlighted(false), duration);
      return () => clearTimeout(timer);
    }
  }, [value, prevValue, duration]);

  return isHighlighted;
};

// Hook for shake animation on error
export const useShakeOnError = (): [boolean, () => void] => {
  const [shouldShake, setShouldShake] = useState(false);

  const triggerShake = useCallback(() => {
    setShouldShake(true);
    setTimeout(() => setShouldShake(false), 400);
  }, []);

  return [shouldShake, triggerShake];
};

// Haptic feedback simulation (for supported devices)
export const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: [10], medium: [20], heavy: [30, 10, 30] };
    navigator.vibrate(patterns[style]);
  }
};

export default {
  FadeIn, FadeInUp, ScaleIn, HighlightOnUpdate, ShakeOnError, SuccessPop,
  hoverLiftEffect, pressEffect,
  useHighlightOnChange, useShakeOnError, triggerHaptic
};

