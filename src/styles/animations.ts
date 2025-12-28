/**
 * Centralized Animation Library
 * 
 * All reusable keyframe animations for the application.
 * Import from '@/styles/animations' to use.
 */

import { keyframes, css } from 'styled-components';

// ============ Fade Animations ============
export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

export const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const fadeInDown = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const fadeInLeft = keyframes`
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
`;

export const fadeInRight = keyframes`
  from { opacity: 0; transform: translateX(8px); }
  to { opacity: 1; transform: translateX(0); }
`;

// ============ Scale Animations ============
export const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
`;

export const scaleOut = keyframes`
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.95); }
`;

export const successPop = keyframes`
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
`;

// ============ Slide Animations ============
export const slideUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-16px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const slideInLeft = keyframes`
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

export const slideInRight = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

export const slideOutRight = keyframes`
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
`;

// ============ Loading Animations ============
export const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

export const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;

// ============ Feedback Animations ============
export const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
`;

export const highlight = keyframes`
  0% { background-color: rgba(99, 102, 241, 0.2); }
  100% { background-color: transparent; }
`;

export const ripple = keyframes`
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(4); opacity: 0; }
`;

// ============ Float/Hover Animations ============
export const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

export const breathe = keyframes`
  0%, 100% { opacity: 0.95; }
  50% { opacity: 1; }
`;

export const glowPulse = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
`;

// ============ Progress Animations ============
export const progressIndeterminate = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

export const progressStripe = keyframes`
  0% { background-position: 0 0; }
  100% { background-position: 40px 0; }
`;

// ============ Gradient Animations ============
export const gradientShift = keyframes`
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
`;

export const gradientFlow = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// ============ Animation CSS Mixins ============
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

export const pressEffect = css`
  transition: transform 0.1s ease;

  &:active {
    transform: scale(0.98);
  }
`;

export const focusRingEffect = css`
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
  }
`;

/**
 * Animation Timing Presets
 * NOTE: For complete timing/easing definitions, use theme.transitions from @/styles/theme.ts
 * These are simplified re-exports for animation-specific use cases.
 */
export const timings = {
  instant: '100ms',
  fast: '150ms',
  normal: '220ms',
  slow: '300ms',
  slower: '400ms',
} as const;

export const easings = {
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  springSubtle: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ============ Advanced Animations ============

/** Staggered reveal for list items - use with animation-delay */
export const staggerReveal = keyframes`
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

/** Morphing shape animation */
export const morphShape = keyframes`
  0%, 100% {
    border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
  }
  25% {
    border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
  }
  50% {
    border-radius: 50% 60% 30% 60% / 30% 50% 70% 40%;
  }
  75% {
    border-radius: 60% 40% 60% 40% / 70% 30% 50% 60%;
  }
`;

/** AI-inspired neural pulse */
export const neuralPulse = keyframes`
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
`;

/** Elegant typing cursor */
export const typingCursor = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

/** Smooth content reveal (clip-path based) */
export const clipReveal = keyframes`
  from {
    clip-path: polygon(0 0, 0 0, 0 100%, 0 100%);
  }
  to {
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  }
`;

/** Circular reveal animation */
export const circleReveal = keyframes`
  from {
    clip-path: circle(0% at 50% 50%);
  }
  to {
    clip-path: circle(100% at 50% 50%);
  }
`;

/** Elastic bounce for attention */
export const elasticBounce = keyframes`
  0% { transform: scale(1); }
  30% { transform: scale(1.15); }
  50% { transform: scale(0.95); }
  70% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

/** Subtle attention wobble */
export const wobble = keyframes`
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-3deg); }
  75% { transform: rotate(3deg); }
`;

/** Smooth slide and fade for modals */
export const modalEnter = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

export const modalExit = keyframes`
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
`;

/** Overlay fade for modals/dialogs */
export const overlayEnter = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const overlayExit = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

/** Progress bar animation */
export const progressLoad = keyframes`
  0% { width: 0%; }
  100% { width: 100%; }
`;

/** Indeterminate progress animation */
export const indeterminateProgress = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
`;

/** Check mark draw animation */
export const drawCheck = keyframes`
  0% { stroke-dashoffset: 100; }
  100% { stroke-dashoffset: 0; }
`;

/** Content skeleton shimmer */
export const skeletonShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

/** Notification badge pop */
export const badgePop = keyframes`
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
`;

/** Gentle breathing for AI elements */
export const aiBreathing = keyframes`
  0%, 100% {
    opacity: 0.7;
    transform: scale(1);
    filter: blur(20px);
  }
  50% {
    opacity: 1;
    transform: scale(1.02);
    filter: blur(25px);
  }
`;

/** Data flow animation for charts/graphs */
export const dataFlow = keyframes`
  0% {
    stroke-dashoffset: 1000;
    opacity: 0;
  }
  50% { opacity: 1; }
  100% {
    stroke-dashoffset: 0;
    opacity: 1;
  }
`;

// ============ Animation Helper CSS Mixins ============

/** Staggered children animation mixin */
export const staggeredChildren = css`
  & > * {
    animation: ${staggerReveal} 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  ${Array.from({ length: 12 }, (_, i) => `
    & > *:nth-child(${i + 1}) {
      animation-delay: ${i * 50}ms;
    }
  `).join('')}
`;

/** Glass hover effect mixin */
export const glassHoverEffect = css`
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.3s ease,
              background 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1),
                0 8px 16px rgba(0, 0, 0, 0.05);
    background: rgba(255, 255, 255, 0.95);
  }

  &:active {
    transform: translateY(-2px);
    transition: transform 0.1s ease;
  }
`;

/** Card interaction effect */
export const cardInteractionEffect = css`
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.25s ease,
              border-color 0.25s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-6px) scale(1.01);
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.12),
                0 8px 16px rgba(0, 0, 0, 0.06);
    border-color: rgba(99, 102, 241, 0.3);
  }

  &:active {
    transform: translateY(-2px) scale(0.99);
    transition: transform 0.1s ease;
  }
`;

/** AI glow effect for special elements */
export const aiGlowEffect = css`
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4);
    border-radius: inherit;
    opacity: 0;
    z-index: -1;
    filter: blur(12px);
    transition: opacity 0.3s ease;
  }

  &:hover::before {
    opacity: 0.5;
  }
`;
