/**
 * Centralized Animation Library
 *
 * SINGLE SOURCE OF TRUTH for all keyframe animations in the application.
 * All components should import animations from this file.
 * DO NOT define duplicate keyframes in component files.
 */

import { keyframes } from 'styled-components';

// ============ Core Loading Animations ============

export const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

export const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

// Variant for scaling pulse (used in ProductCard)
export const pulseScale = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(0.95); }
`;

// Variant for dots loading animation
export const pulseDots = keyframes`
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
`;

export const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// ============ Fade Animations ============

export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const fadeInDown = keyframes`
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ============ Scale Animations ============

export const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
`;

// ============ Slide Animations ============

export const slideDown = keyframes`
  from { opacity: 0; max-height: 0; transform: translateY(-8px); }
  to { opacity: 1; max-height: 2000px; transform: translateY(0); }
`;

export const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const slideInLeft = keyframes`
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
`;

export const slideInRight = keyframes`
  from { opacity: 0; transform: translateX(12px); }
  to { opacity: 1; transform: translateX(0); }
`;

// ============ Interactive Animations ============

export const ripple = keyframes`
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(4); opacity: 0; }
`;

export const glow = keyframes`
  0%, 100% { box-shadow: 0 0 5px rgba(99, 102, 241, 0.2); }
  50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.4); }
`;

// Variant with larger glow (used in ProductCard)
export const glowLarge = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.15); }
  50% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.25); }
`;

export const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 16px rgba(99, 102, 241, 0.15); }
  50% { box-shadow: 0 0 28px rgba(99, 102, 241, 0.3); }
`;

export const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-3px); }
`;

export const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// ============ Typing/Chat Animations ============

export const typingDots = keyframes`
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.3;
  }
  30% {
    transform: translateY(-5px);
    opacity: 1;
  }
`;
