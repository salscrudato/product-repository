/**
 * PremiumAnimations - Shared animation constants and premium styled components
 * for the Coverage Copilot wizard experience
 *
 * PREMIUM V2 - Enhanced with:
 * - Ambient AI particle systems
 * - Apple-inspired micro-interactions
 * - Fluid glassmorphism effects
 * - Neural network-style visual language
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

// ========== NEW PREMIUM V2 ANIMATIONS ==========

// Floating particle animation - ambient AI presence
export const floatParticle = keyframes`
  0%, 100% {
    transform: translateY(0px) translateX(0px) scale(1);
    opacity: 0;
  }
  10% { opacity: 0.6; }
  50% {
    transform: translateY(-40px) translateX(20px) scale(1.2);
    opacity: 0.8;
  }
  90% { opacity: 0.4; }
`;

// Neural pulse - expanding rings
export const neuralPulse = keyframes`
  0% {
    transform: scale(0.8);
    opacity: 0.8;
    box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4);
  }
  70% {
    transform: scale(1);
    opacity: 0;
    box-shadow: 0 0 0 20px rgba(139, 92, 246, 0);
  }
  100% {
    transform: scale(0.8);
    opacity: 0;
    box-shadow: 0 0 0 0 rgba(139, 92, 246, 0);
  }
`;

// Breathing glow - subtle ambient effect
export const breathingGlow = keyframes`
  0%, 100% {
    opacity: 0.4;
    filter: blur(20px);
  }
  50% {
    opacity: 0.7;
    filter: blur(30px);
  }
`;

// Magnetic hover - Apple-style lift effect
export const magneticLift = keyframes`
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-3px) scale(1.01); }
  100% { transform: translateY(0) scale(1); }
`;

// Typewriter effect for AI messages
export const typewriterCursor = keyframes`
  0%, 100% { border-right-color: rgba(139, 92, 246, 1); }
  50% { border-right-color: transparent; }
`;

// Ripple effect for button clicks
export const rippleExpand = keyframes`
  0% {
    transform: scale(0);
    opacity: 0.6;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
`;

// Orbital dots for AI processing
export const orbitalSpin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// Elastic bounce for success states
export const elasticBounce = keyframes`
  0% { transform: scale(0); }
  50% { transform: scale(1.15); }
  70% { transform: scale(0.95); }
  100% { transform: scale(1); }
`;

// Stagger reveal for list items
export const staggerReveal = keyframes`
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

// Morphing blob for AI background
export const morphBlob = keyframes`
  0%, 100% {
    border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
    transform: rotate(0deg);
  }
  50% {
    border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
    transform: rotate(180deg);
  }
`;

// Success checkmark draw
export const drawCheck = keyframes`
  0% { stroke-dashoffset: 24; }
  100% { stroke-dashoffset: 0; }
`;

// Subtle shine sweep
export const shineSweep = keyframes`
  0% { left: -100%; }
  50%, 100% { left: 100%; }
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
  instant: '50ms',
  fast: '150ms',
  normal: '250ms',
  slow: '400ms',
  verySlow: '600ms',
  glacial: '1000ms',
};

export const EASING = {
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bouncy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  // Apple-inspired easing curves
  appleSpring: 'cubic-bezier(0.22, 1, 0.36, 1)',
  appleEase: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  overshoot: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
};

// ========== Premium Utility Mixins ==========

// Premium card effect with hover lift
export const premiumCardHover = css`
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 12px 40px -8px rgba(0, 0, 0, 0.12),
      0 4px 12px -2px rgba(0, 0, 0, 0.06);
  }

  &:active {
    transform: translateY(0);
    transition-duration: 0.1s;
  }
`;

// Ambient glow background effect
export const ambientGlow = (color: string = 'rgba(139, 92, 246, 0.15)') => css`
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 200%;
    height: 200%;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, ${color} 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;
    z-index: -1;
  }

  &:hover::before {
    opacity: 1;
  }
`;

// Shimmer loading effect for skeletons
export const shimmerLoading = css`
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.3) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
`;

// AI processing border effect
export const aiProcessingBorder = css`
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: inherit;
    padding: 2px;
    background: linear-gradient(
      90deg,
      #6366f1,
      #8b5cf6,
      #a855f7,
      #8b5cf6,
      #6366f1
    );
    background-size: 300% 100%;
    animation: ${gradientFlow} 2s linear infinite;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
`;

// Staggered list item animation helper
export const staggeredItem = (index: number, baseDelay: number = 50) => css`
  animation: ${staggerReveal} 0.4s ${EASING.appleSpring} forwards;
  animation-delay: ${index * baseDelay}ms;
  opacity: 0;
`;

// Focus ring for accessibility
export const premiumFocusRing = css`
  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px white,
      0 0 0 4px rgba(99, 102, 241, 0.5);
  }
`;

// Smooth button press effect
export const buttonPressEffect = css`
  transition: all 0.15s ${EASING.appleEase};

  &:active {
    transform: scale(0.97);
  }
`;

