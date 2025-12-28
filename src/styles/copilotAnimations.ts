/**
 * Premium Copilot Animations
 * Sophisticated micro-interactions for AI-assisted coverage creation
 */

import { keyframes, css } from 'styled-components';

// AI Field Update - Purple glow pulse when AI populates a field
export const aiFieldUpdate = keyframes`
  0% { 
    box-shadow: 0 0 0 0 rgba(139, 92, 246, 0);
    background-color: transparent;
  }
  15% { 
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.3);
    background-color: rgba(139, 92, 246, 0.08);
  }
  100% { 
    box-shadow: 0 0 0 0 rgba(139, 92, 246, 0);
    background-color: transparent;
  }
`;

// Sparkle rotation for AI indicator
export const aiSparkle = keyframes`
  0%, 100% { 
    opacity: 1; 
    transform: scale(1) rotate(0deg);
  }
  25% { 
    opacity: 0.9; 
    transform: scale(1.15) rotate(90deg);
  }
  50% { 
    opacity: 0.8; 
    transform: scale(1.1) rotate(180deg);
  }
  75% { 
    opacity: 0.9; 
    transform: scale(1.15) rotate(270deg);
  }
`;

// Gentle pulse for active AI processing
export const aiPulse = keyframes`
  0%, 100% { 
    opacity: 1;
    transform: scale(1);
  }
  50% { 
    opacity: 0.7;
    transform: scale(1.05);
  }
`;

// Shimmer effect for loading states
export const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Slide in from right
export const slideInRight = keyframes`
  from { 
    opacity: 0; 
    transform: translateX(20px);
  }
  to { 
    opacity: 1; 
    transform: translateX(0);
  }
`;

// Slide in from bottom
export const slideInUp = keyframes`
  from { 
    opacity: 0; 
    transform: translateY(12px);
  }
  to { 
    opacity: 1; 
    transform: translateY(0);
  }
`;

// Fade in with scale
export const fadeInScale = keyframes`
  from { 
    opacity: 0; 
    transform: scale(0.95);
  }
  to { 
    opacity: 1; 
    transform: scale(1);
  }
`;

// Success check animation
export const successCheck = keyframes`
  0% { 
    stroke-dashoffset: 24;
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% { 
    stroke-dashoffset: 0;
    opacity: 1;
  }
`;

// Confetti burst for completion
export const confettiBurst = keyframes`
  0% { 
    opacity: 1;
    transform: translateY(0) rotate(0deg) scale(1);
  }
  100% { 
    opacity: 0;
    transform: translateY(-80px) rotate(720deg) scale(0);
  }
`;

// Progress fill animation
export const progressFill = keyframes`
  from { width: 0%; }
  to { width: var(--progress-width, 100%); }
`;

// Glow pulse for active elements
export const glowPulse = keyframes`
  0%, 100% { 
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
  }
  50% { 
    box-shadow: 0 0 20px 4px rgba(99, 102, 241, 0.2);
  }
`;

// CSS mixins for common animation patterns
export const aiFieldHighlight = css`
  animation: ${aiFieldUpdate} 1.5s ease-out;
`;

export const aiProcessingIndicator = css`
  animation: ${aiPulse} 1.5s ease-in-out infinite;
`;

export const shimmerLoading = css`
  background: linear-gradient(
    90deg,
    rgba(139, 92, 246, 0.05) 0%,
    rgba(139, 92, 246, 0.15) 50%,
    rgba(139, 92, 246, 0.05) 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
`;

export const staggeredFadeIn = (index: number, baseDelay = 50) => css`
  animation: ${fadeInScale} 0.3s ease-out;
  animation-delay: ${index * baseDelay}ms;
  animation-fill-mode: both;
`;

