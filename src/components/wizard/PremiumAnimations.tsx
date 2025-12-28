/**
 * PremiumAnimations - Shared animation constants and premium styled components
 * for the Coverage Copilot wizard experience
 */

import { keyframes, css } from 'styled-components';

// ========== Premium Keyframe Animations ==========

// Gradient flow animation for AI-powered elements
export const gradientFlow = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// Subtle pulse for active AI elements
export const aiPulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.02); }
`;

// Shimmer effect for loading/generating states
export const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Sparkle animation for AI icons
export const sparkle = keyframes`
  0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
  25% { transform: scale(1.1) rotate(-5deg); opacity: 0.9; }
  50% { transform: scale(1.15) rotate(5deg); opacity: 1; }
  75% { transform: scale(1.05) rotate(-3deg); opacity: 0.95; }
`;

// Slide up fade in
export const slideUpFadeIn = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`;

// Slide in from right
export const slideInRight = keyframes`
  from { opacity: 0; transform: translateX(24px); }
  to { opacity: 1; transform: translateX(0); }
`;

// Slide in from left  
export const slideInLeft = keyframes`
  from { opacity: 0; transform: translateX(-24px); }
  to { opacity: 1; transform: translateX(0); }
`;

// Fade in with scale
export const fadeInScale = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
`;

// Smooth spin for loading icons
export const smoothSpin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Glow pulse for AI status
export const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 5px rgba(139, 92, 246, 0.3), 0 0 10px rgba(99, 102, 241, 0.2); }
  50% { box-shadow: 0 0 15px rgba(139, 92, 246, 0.5), 0 0 25px rgba(99, 102, 241, 0.3); }
`;

// Field cascade fill animation
export const cascadeFill = keyframes`
  0% { background-position: 100% 0; opacity: 0.5; }
  50% { opacity: 1; }
  100% { background-position: 0% 0; opacity: 1; }
`;

// Typing cursor blink
export const cursorBlink = keyframes`
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
`;

// Confetti burst
export const confettiBurst = keyframes`
  0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
  100% { transform: translateY(-100vh) rotate(720deg) scale(0); opacity: 0; }
`;

// Check mark draw animation
export const checkDraw = keyframes`
  0% { stroke-dashoffset: 100; }
  100% { stroke-dashoffset: 0; }
`;

// ========== Premium CSS Mixins ==========

// Glass morphism effect
export const glassMorphism = css`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
`;

// AI gradient background
export const aiGradientBg = css`
  background: linear-gradient(135deg, 
    rgba(99, 102, 241, 0.1) 0%, 
    rgba(139, 92, 246, 0.1) 50%, 
    rgba(168, 85, 247, 0.1) 100%
  );
`;

// AI gradient text
export const aiGradientText = css`
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

// AI solid gradient for icons/buttons
export const aiSolidGradient = css`
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
`;

// Success gradient
export const successGradient = css`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
`;

// Premium shadow
export const premiumShadow = css`
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(99, 102, 241, 0.05);
`;

// ========== Animation Timing ==========
export const ANIMATION_TIMING = {
  fast: '150ms',
  normal: '250ms',
  slow: '400ms',
  verySlow: '600ms',
};

export const EASING = {
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bouncy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
};

