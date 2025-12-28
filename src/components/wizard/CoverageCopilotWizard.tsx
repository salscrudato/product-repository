/**
 * CoverageCopilotWizard - Full-screen wizard for AI-assisted coverage creation
 *
 * PREMIUM VERSION - Enhanced with:
 * - Glassmorphism design elements
 * - Smooth step transitions with direction awareness
 * - AI status indicators with streaming effects
 * - Premium animations and micro-interactions
 * - Ambient AI that proactively assists
 * - Draft persistence & completeness tracking
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  XMarkIcon,
  ArrowLeftIcon,
  SparklesIcon as SparklesOutline,
  ChevronRightIcon as ChevronRightSmall,
  CloudArrowUpIcon,
  CommandLineIcon,
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { SparklesIcon, CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { Coverage, CoverageSimilarityMatch, CoverageTrigger, ValuationMethod } from '../../types';
import { useCoverageDraft, useCoverages, useProduct } from '../../hooks';
import { useAutoDraftCoverage } from '../../hooks/useAutoDraftCoverage';
import { WizardProgress, WizardStep } from './WizardProgress';
import { WizardFooter } from './WizardFooter';
import { AIAssistedField } from './AIAssistedField';
import { CompletionCelebration } from './CompletionCelebration';

// Premium AI Components
import { SmartCoverageNameInput } from './SmartCoverageNameInput';
import { AIInsightsCard } from './AIInsightsCard';
import { AIReviewSummary } from './AIReviewSummary';

// Premium Animations
import {
  gradientFlow,
  aiPulse,
  shimmer,
  sparkle,
  slideUpFadeIn,
  slideInRight,
  slideInLeft,
  fadeInScale,
  glowPulse,
  aiGradientBg,
  aiSolidGradient,
  premiumShadow,
  smoothSpin,
  ANIMATION_TIMING,
  EASING
} from './PremiumAnimations';

// Import form sections from existing modal
import { CoverageTriggerSelector } from '../selectors/CoverageTriggerSelector';
import { WaitingPeriodInput } from '../inputs/WaitingPeriodInput';
import { ValuationMethodSelector } from '../selectors/ValuationMethodSelector';
import { CoinsuranceInput } from '../inputs/CoinsuranceInput';
import { DepreciationMethodSelector } from '../selectors/DepreciationMethodSelector';
import { UnderwritingSection } from '../sections/UnderwritingSection';
import { ClaimsSection } from '../sections/ClaimsSection';
import { TerritorySelector } from '../selectors/TerritorySelector';
import { FormsStep } from './FormsStep';
import { useForms } from '../../hooks';

// ========== Premium Keyframe Animations ==========
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const contentSlideLeft = keyframes`
  from { opacity: 0; transform: translateX(40px); }
  to { opacity: 1; transform: translateX(0); }
`;

const contentSlideRight = keyframes`
  from { opacity: 0; transform: translateX(-40px); }
  to { opacity: 1; transform: translateX(0); }
`;

const subtleFloat = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  animation: ${fadeIn} 0.25s ${EASING.smooth};
`;

const ModalContainer = styled.div`
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colours.background};
  animation: ${slideUp} 0.35s ${EASING.spring};

  /* Take up most of the available space with elegant margins */
  width: calc(100% - 32px);
  max-width: 1400px;
  height: calc(100vh - 48px); /* viewport - top and bottom padding */
  max-height: 900px;

  /* Premium rounded corners and shadow */
  border-radius: 20px;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.35),
    0 12px 24px -8px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);

  /* Subtle gradient border effect */
  &::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 21px;
    padding: 1px;
    background: linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.3) 0%,
      rgba(139, 92, 246, 0.2) 50%,
      rgba(99, 102, 241, 0.1) 100%
    );
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  overflow: hidden;

  /* Mobile Responsiveness */
  @media (max-width: 768px) {
    top: 0;
    width: 100%;
    height: 100vh;
    max-height: none;
    border-radius: 0;

    &::before {
      display: none;
    }
  }

  @media (max-width: 480px) {
    top: 0;
  }
`;

// Premium Header with AI Branding
const Header = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 28px;
  border-bottom: 1px solid ${({ theme }) => theme.colours.border};
  background: linear-gradient(180deg,
    ${({ theme }) => theme.colours.surface} 0%,
    ${({ theme }) => theme.colours.background} 100%
  );
  position: relative;
  border-radius: 20px 20px 0 0;

  &::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(99, 102, 241, 0.3) 20%,
      rgba(139, 92, 246, 0.5) 50%,
      rgba(99, 102, 241, 0.3) 80%,
      transparent 100%
    );
  }

  /* Mobile: Reduce padding and adjust layout */
  @media (max-width: 768px) {
    padding: 14px 16px;
    border-radius: 0;
    flex-wrap: wrap;
    gap: 12px;
  }

  @media (max-width: 480px) {
    padding: 12px;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

// Breadcrumb navigation for better context awareness
const Breadcrumb = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.colours.textMuted};
  margin-bottom: 2px;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

const BreadcrumbLink = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colours.textMuted};
  cursor: pointer;
  padding: 0;
  font-size: 12px;
  transition: color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.colours.primary};
  }
`;

const BreadcrumbCurrent = styled.span`
  color: ${({ theme }) => theme.colours.text};
  font-weight: 500;
`;

// Compact progress indicator for header
const HeaderProgress = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  margin-right: 16px;

  /* Mobile: Hide progress label, show only ring */
  @media (max-width: 768px) {
    margin-right: 8px;
    gap: 8px;
  }

  @media (max-width: 480px) {
    display: none;
  }
`;

const ProgressRing = styled.div<{ $percentage: number }>`
  position: relative;
  width: 36px;
  height: 36px;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(
      #6366f1 ${({ $percentage }) => $percentage * 3.6}deg,
      ${({ theme }) => theme.colours.border} 0deg
    );
    mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #fff calc(100% - 4px));
    -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #fff calc(100% - 4px));
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
`;

const ProgressRingText = styled.span`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colours.text};
`;

const ProgressLabel = styled.div`
  display: flex;
  flex-direction: column;

  span:first-child {
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.colours.text};
  }

  span:last-child {
    font-size: 11px;
    color: ${({ theme }) => theme.colours.textMuted};
  }
`;

// AI Status Badge in Header
const AIStatusBadge = styled.div<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: ${({ $isActive }) =>
    $isActive
      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.2) 100%)'
      : 'rgba(99, 102, 241, 0.08)'
  };
  border: 1px solid ${({ $isActive }) =>
    $isActive ? 'rgba(139, 92, 246, 0.4)' : 'rgba(99, 102, 241, 0.15)'
  };
  border-radius: 20px;
  transition: all 0.3s ${EASING.smooth};

  ${({ $isActive }) => $isActive && css`
    animation: ${glowPulse} 2s ease-in-out infinite;
  `}
`;

const AIStatusIcon = styled.div<{ $isActive: boolean }>`
  display: flex;
  padding: 4px;
  border-radius: 6px;
  background: ${({ $isActive }) =>
    $isActive
      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
      : 'rgba(99, 102, 241, 0.2)'
  };

  svg {
    width: 12px;
    height: 12px;
    color: ${({ $isActive }) => $isActive ? 'white' : '#8b5cf6'};
    ${({ $isActive }) => $isActive && css`
      animation: ${sparkle} 1.5s ease-in-out infinite;
    `}
  }
`;

const AIStatusText = styled.span<{ $isActive: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${({ $isActive }) => $isActive ? '#8b5cf6' : '#6b7280'};

  ${({ $isActive }) => $isActive && css`
    background: linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: ${gradientFlow} 3s ease infinite;
  `}
`;

const HeaderTitle = styled.div`
  h1 {
    font-size: 20px;
    font-weight: 600;
    color: ${({ theme }) => theme.colours.text};
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  p {
    font-size: 14px;
    color: ${({ theme }) => theme.colours.textMuted};
    margin: 4px 0 0 0;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: ${({ theme }) => theme.colours.textMuted};
  cursor: pointer;
  transition: all 0.2s ${EASING.smooth};

  &:hover {
    background: ${({ theme }) => theme.colours.backgroundAlt};
    color: ${({ theme }) => theme.colours.text};
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
  background: ${({ theme }) => theme.colours.background};

  /* Mobile: Stack vertically */
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const FormPane = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 32px 24px;
  background: ${({ theme }) => theme.colours.background};

  /* Subtle grid pattern */
  background-image: radial-gradient(
    circle at 1px 1px,
    ${({ theme }) => theme.colours.border}15 1px,
    transparent 0
  );
  background-size: 24px 24px;

  /* Mobile: Reduce padding */
  @media (max-width: 768px) {
    padding: 20px 16px;
  }

  @media (max-width: 480px) {
    padding: 16px 12px;
  }
`;

const FormContent = styled.div`
  max-width: 800px;
  margin: 0 auto;

  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

// Premium AI Sidebar with glass effect
const AISidebar = styled.div`
  width: 340px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 20px;
  background: linear-gradient(180deg,
    ${({ theme }) => theme.colours.backgroundAlt} 0%,
    ${({ theme }) => `${theme.colours.backgroundAlt}f5`} 100%
  );
  border-left: 1px solid ${({ theme }) => theme.colours.border};
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;

  /* AI accent line */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 1px;
    height: 100%;
    background: linear-gradient(180deg,
      rgba(99, 102, 241, 0.5) 0%,
      rgba(139, 92, 246, 0.3) 50%,
      transparent 100%
    );
  }

  animation: ${slideInRight} 0.4s ${EASING.smooth};

  /* Tablet: Narrower sidebar */
  @media (max-width: 1024px) {
    width: 280px;
    padding: 16px;
  }

  /* Mobile: Hide sidebar, show floating button instead */
  @media (max-width: 768px) {
    display: none;
  }
`;

const AISidebarHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colours.border};
  margin-bottom: 4px;
`;

const AISidebarTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    width: 16px;
    height: 16px;
    color: #8b5cf6;
  }
`;

// AI Working Card - shows when AI is auto-populating fields in sidebar
const AIWorkingCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.08));
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 12px;
  margin-bottom: 16px;
  animation: ${fadeInScale} 0.3s ${EASING.smooth};
`;

const AIWorkingIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: ${aiSolidGradient};
  border-radius: 10px;
  flex-shrink: 0;
  animation: ${aiPulse} 1.5s ease-in-out infinite;

  svg {
    width: 18px;
    height: 18px;
    color: white;
  }
`;

const AIWorkingContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const AIWorkingTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
  margin-bottom: 2px;
`;

const AIWorkingMessage = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colours.textMuted};
`;

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  padding: 6px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colours.textMuted};
  cursor: pointer;
  transition: all 0.2s ${EASING.smooth};

  &:hover {
    background: ${({ theme }) => theme.colours.backgroundAlt};
    transform: scale(1.1);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

// Auto-save indicator
const AutoSaveIndicator = styled.div<{ $status: 'idle' | 'saving' | 'saved' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.3s ${EASING.smooth};

  ${({ $status }) => {
    switch ($status) {
      case 'saving':
        return css`
          background: rgba(99, 102, 241, 0.1);
          color: #6366f1;
        `;
      case 'saved':
        return css`
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        `;
      case 'error':
        return css`
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        `;
      default:
        return css`
          background: transparent;
          color: ${({ theme }: { theme: any }) => theme.colours.textMuted};
        `;
    }
  }}

  svg {
    width: 14px;
    height: 14px;
    ${({ $status }) => $status === 'saving' && css`
      animation: ${smoothSpin} 1s linear infinite;
    `}
  }
`;

// Floating AI Help Button
const FloatingAIButton = styled.button<{ $isActive?: boolean }>`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 10001;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  background: ${({ $isActive }) =>
    $isActive
      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
      : 'linear-gradient(135deg, #6366f1, #8b5cf6)'
  };
  border: none;
  border-radius: 50px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
  transition: all 0.3s ${EASING.smooth};

  &:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 12px 32px rgba(99, 102, 241, 0.5);
  }

  &:active {
    transform: translateY(0) scale(0.98);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

// Keyboard shortcut hint
const ShortcutHint = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  padding: 8px 12px;
  background: ${({ theme }) => theme.colours.surface};
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 12px;
  color: ${({ theme }) => theme.colours.textMuted};
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ${EASING.smooth};

  ${FloatingAIButton}:hover & {
    opacity: 1;
    visibility: visible;
  }

  kbd {
    padding: 2px 6px;
    background: ${({ theme }) => theme.colours.backgroundAlt};
    border-radius: 4px;
    font-family: monospace;
    font-size: 11px;
    margin-left: 4px;
  }
`;

// Mobile AI Panel - Slide-up panel for AI insights on mobile
const MobileAIPanelOverlay = styled.div<{ $isOpen: boolean }>`
  display: none;

  @media (max-width: 768px) {
    display: ${({ $isOpen }) => $isOpen ? 'block' : 'none'};
    position: fixed;
    inset: 0;
    z-index: 10002;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    animation: ${fadeIn} 0.2s ease;
  }
`;

const MobileAIPanel = styled.div<{ $isOpen: boolean }>`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 10003;
    max-height: 70vh;
    background: ${({ theme }) => theme.colours.background};
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.2);
    transform: ${({ $isOpen }) => $isOpen ? 'translateY(0)' : 'translateY(100%)'};
    transition: transform 0.3s ${EASING.spring};
  }
`;

const MobileAIPanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colours.border};

  h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: ${({ theme }) => theme.colours.text};

    svg {
      width: 20px;
      height: 20px;
      color: #8b5cf6;
    }
  }
`;

const MobileAIPanelContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
`;

const MobileAIPanelClose = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: ${({ theme }) => theme.colours.surface};
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 8px;
  cursor: pointer;

  svg {
    width: 18px;
    height: 18px;
    color: ${({ theme }) => theme.colours.textMuted};
  }
`;

// Mobile Floating AI Button - visible on all steps on mobile
const MobileFloatingAIButton = styled.button`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    bottom: 100px;
    right: 16px;
    z-index: 10001;
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border: none;
    border-radius: 50%;
    color: white;
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
    cursor: pointer;

    svg {
      width: 24px;
      height: 24px;
    }

    &:active {
      transform: scale(0.95);
    }
  }
`;

// Premium Footer with gradient
const Footer = styled.div`
  flex-shrink: 0;
  border-top: 1px solid ${({ theme }) => theme.colours.border};
  background: linear-gradient(180deg,
    ${({ theme }) => theme.colours.surface} 0%,
    ${({ theme }) => theme.colours.background} 100%
  );
  padding: 18px 28px;
  position: relative;
  border-radius: 0 0 20px 20px;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(99, 102, 241, 0.2) 50%,
      transparent 100%
    );
  }
`;

// Step container with directional animation support
const StepContainer = styled.div<{ $direction?: 'left' | 'right' }>`
  animation: ${({ $direction }) =>
    $direction === 'left' ? contentSlideRight : contentSlideLeft
  } 0.35s ${EASING.smooth};
  animation-fill-mode: both;
`;

// Premium step title with AI indicator
const StepTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const StepSubtitle = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colours.textMuted};
  margin: 0 0 28px 0;
`;

const StepHeader = styled.div`
  margin-bottom: 24px;
`;

// Skeleton loading components for smooth transitions
const SkeletonPulse = keyframes`
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
`;

const SkeletonLine = styled.div<{ $width?: string; $height?: string }>`
  width: ${({ $width }) => $width || '100%'};
  height: ${({ $height }) => $height || '16px'};
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colours.border} 0%,
    ${({ theme }) => theme.colours.backgroundAlt} 50%,
    ${({ theme }) => theme.colours.border} 100%
  );
  background-size: 200% 100%;
  border-radius: 4px;
  animation: ${shimmer} 1.5s ease-in-out infinite, ${SkeletonPulse} 2s ease-in-out infinite;
`;

const SkeletonField = styled.div`
  margin-bottom: 20px;

  ${SkeletonLine}:first-child {
    width: 30%;
    height: 14px;
    margin-bottom: 8px;
  }

  ${SkeletonLine}:last-child {
    height: 44px;
    border-radius: 8px;
  }
`;

const SkeletonCard = styled.div`
  padding: 24px;
  background: ${({ theme }) => theme.colours.surface};
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 12px;
  margin-bottom: 16px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colours.text};
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colours.surface};
  color: ${({ theme }) => theme.colours.text};
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colours.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colours.primary}20;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colours.textMuted};
  }
`;

// AI Working Banner - prominent indicator when AI is populating fields
const AIFillingBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 12px;
  color: white;
  animation: ${fadeInScale} 0.3s ${EASING.smooth};

  svg {
    width: 22px;
    height: 22px;
    animation: ${sparkle} 1s ease-in-out infinite;
  }
`;

const AIFillingText = styled.div`
  flex: 1;

  strong {
    display: block;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 2px;
  }

  span {
    font-size: 12px;
    opacity: 0.9;
  }
`;

const AIFillingDots = styled.div`
  display: flex;
  gap: 4px;

  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: white;
    animation: ${aiPulse} 1.4s ease-in-out infinite;

    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
`;

// ========== Enhanced Review Step Styles ==========
const ReviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ReviewHeaderCard = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: linear-gradient(135deg,
    ${({ theme }) => theme.colours.primary}08,
    ${({ theme }) => theme.colours.primary}15
  );
  border: 1px solid ${({ theme }) => theme.colours.primary}30;
  border-radius: 16px;
  animation: ${slideUpFadeIn} 0.4s ${EASING.spring};
`;

const ReviewHeaderIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 12px;
  svg { width: 24px; height: 24px; color: white; }
`;

const ReviewHeaderContent = styled.div`
  flex: 1;
`;

const ReviewCoverageName = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
  margin: 0 0 4px 0;
`;

const ReviewCoverageCode = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colours.textMuted};
  font-family: 'SF Mono', monospace;
`;

const ReviewCompleteness = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  span:last-child { font-size: 11px; color: ${({ theme }) => theme.colours.textMuted}; }
`;

const CompletenessRing = styled.div<{ $percentage: number }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: conic-gradient(
    #10b981 ${({ $percentage }) => $percentage * 3.6}deg,
    ${({ theme }) => theme.colours.border} 0deg
  );
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    width: 38px;
    height: 38px;
    background: ${({ theme }) => theme.colours.surface};
    border-radius: 50%;
  }

  span {
    position: relative;
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.colours.text};
  }
`;

const ReviewSectionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;

  /* Tablet: 2 columns */
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  /* Mobile: 2 columns, smaller */
  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
`;

const ReviewSectionCard = styled.div<{ $complete: boolean; $delay: number }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: ${({ theme, $complete }) =>
    $complete ? 'rgba(16, 185, 129, 0.08)' : theme.colours.surface};
  border: 1px solid ${({ $complete }) =>
    $complete ? 'rgba(16, 185, 129, 0.3)' : 'rgba(156, 163, 175, 0.2)'};
  border-radius: 12px;
  animation: ${slideUpFadeIn} 0.3s ${EASING.spring};
  animation-delay: ${({ $delay }) => $delay * 50}ms;
  animation-fill-mode: both;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`;

const SectionIcon = styled.div<{ $complete: boolean }>`
  font-size: 20px;
  opacity: ${({ $complete }) => $complete ? 1 : 0.5};
`;

const SectionName = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colours.text};
`;

const SectionStatus = styled.div<{ $complete: boolean }>`
  svg {
    width: 16px;
    height: 16px;
    color: ${({ $complete }) => $complete ? '#10b981' : '#9ca3af'};
  }
`;

const ReviewCard = styled.div`
  background: ${({ theme }) => theme.colours.surface};
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 16px;
  padding: 24px;
  animation: ${slideUpFadeIn} 0.4s ${EASING.spring} 0.2s both;
`;

const ReviewCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colours.border};

  svg { width: 18px; height: 18px; color: ${({ theme }) => theme.colours.primary}; }
  span { font-size: 14px; font-weight: 600; color: ${({ theme }) => theme.colours.text}; }
`;

const ReviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
`;

const ReviewItem = styled.div`
  span:first-child {
    color: ${({ theme }) => theme.colours.textMuted};
    font-size: 13px;
  }
  span:last-child {
    font-weight: 500;
    color: ${({ theme }) => theme.colours.text};
    margin-left: 8px;
  }
`;

const FormsList = styled.div`
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid ${({ theme }) => theme.colours.border};
`;

const FormsListHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  svg { width: 16px; height: 16px; color: ${({ theme }) => theme.colours.textMuted}; }
  span { font-size: 13px; font-weight: 500; color: ${({ theme }) => theme.colours.text}; }
`;

const FormsListContent = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const NoFormsMessage = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colours.textMuted};
  font-style: italic;
`;

const WarningBox = styled.div`
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(217, 119, 6, 0.05));
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 12px;
  padding: 16px;
  animation: ${slideUpFadeIn} 0.3s ${EASING.spring} 0.3s both;
`;

const WarningHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  svg { width: 18px; height: 18px; color: #d97706; }
  span { font-size: 14px; font-weight: 600; color: #b45309; }
`;

const WarningList = styled.ul`
  margin: 0;
  padding-left: 24px;
  color: #d97706;
  font-size: 13px;

  li { margin-bottom: 4px; }
`;

const FormBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  background: linear-gradient(135deg,
    ${({ theme }) => theme.colours.primary}10,
    ${({ theme }) => theme.colours.primary}20
  );
  color: ${({ theme }) => theme.colours.primary};
  border: 1px solid ${({ theme }) => theme.colours.primary}30;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
`;

// ========== Toggle Switch Component ==========
const ToggleSwitchContainer = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
`;

const ToggleSwitchTrack = styled.div<{ $checked: boolean }>`
  position: relative;
  width: 48px;
  height: 26px;
  background: ${({ $checked }) => $checked ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : '#e5e7eb'};
  border-radius: 13px;
  transition: all 0.2s ease;
`;

const ToggleSwitchKnob = styled.div<{ $checked: boolean }>`
  position: absolute;
  top: 3px;
  left: ${({ $checked }) => $checked ? '25px' : '3px'};
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
`;

const ToggleSwitchLabel = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.colours.text};
`;

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, label }) => (
  <ToggleSwitchContainer onClick={() => onChange(!checked)}>
    <ToggleSwitchTrack $checked={checked}>
      <ToggleSwitchKnob $checked={checked} />
    </ToggleSwitchTrack>
    {label && <ToggleSwitchLabel>{label}</ToggleSwitchLabel>}
  </ToggleSwitchContainer>
);

// ========== Number Input Component ==========
const NumberInputContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const NumberInputField = styled.input`
  width: 100px;
  padding: 10px 12px;
  font-size: 15px;
  border: 1.5px solid ${({ theme }) => theme.colours.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colours.background};
  color: ${({ theme }) => theme.colours.text};
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colours.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colours.primary}20;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colours.textMuted};
  }
`;

const NumberInputSuffix = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.colours.textMuted};
`;

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  placeholder?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({ value, onChange, min, max, suffix, placeholder }) => (
  <NumberInputContainer>
    <NumberInputField
      type="number"
      value={value || ''}
      onChange={(e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val)) {
          if (min !== undefined && val < min) return;
          if (max !== undefined && val > max) return;
          onChange(val);
        } else if (e.target.value === '') {
          onChange(0);
        }
      }}
      min={min}
      max={max}
      placeholder={placeholder}
    />
    {suffix && <NumberInputSuffix>{suffix}</NumberInputSuffix>}
  </NumberInputContainer>
);



interface CoverageCopilotWizardProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  existingCoverage?: Partial<Coverage>;
  onSave: (coverage: Partial<Coverage>) => Promise<void>;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 'basics', label: 'Basics', description: 'Name and code' },
  { id: 'triggers', label: 'Trigger & Periods', description: 'Coverage triggers' },
  { id: 'valuation', label: 'Valuation & Coinsurance', description: 'Value settings' },
  { id: 'underwriting', label: 'Underwriting', description: 'Eligibility & requirements' },
  { id: 'review', label: 'Review', description: 'Review and publish' }
];

export const CoverageCopilotWizard: React.FC<CoverageCopilotWizardProps> = ({
  isOpen,
  onClose,
  productId,
  existingCoverage,
  onSave
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepDirection, setStepDirection] = useState<'left' | 'right'>('right');
  const [isPublishing, setIsPublishing] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [suggestedFormIds] = useState<string[]>([]);
  const [aiSuggestedFields, setAISuggestedFields] = useState<Set<string>>(new Set());
  const [showMobileAIPanel, setShowMobileAIPanel] = useState(false);
  const prevStepRef = useRef(0);

  // Get product for line of business info
  const { product } = useProduct(productId);

  // Get existing coverages for duplicate detection
  const { coverages: existingCoverages } = useCoverages(productId);

  // Get forms for the product
  const { forms, loading: formsLoading } = useForms(productId);

  // Draft management
  const {
    draft,
    completenessScore,
    missingRequiredFields,
    validation,
    isDirty,
    isSaving,
    updateDraft,
    saveDraft,
    publishDraft,
  } = useCoverageDraft({
    productId,
    initialDraft: existingCoverage,
    source: existingCoverage?.id ? 'clone' : 'manual'
  });

  // Auto-draft hook for AI-generated field suggestions
  const {
    generateFieldsForStep,
    isGenerating: isAutoDrafting,
  } = useAutoDraftCoverage({
    productId,
    onFieldsGenerated: (fields) => {
      // Apply auto-generated fields to draft (only if not already set)
      const fieldsToApply: Partial<Coverage> = {};
      const newAISuggestedFields = new Set(aiSuggestedFields);
      Object.entries(fields).forEach(([key, value]) => {
        if (draft[key as keyof Coverage] === undefined || draft[key as keyof Coverage] === null || draft[key as keyof Coverage] === '') {
          fieldsToApply[key as keyof Coverage] = value;
          newAISuggestedFields.add(key);
        }
      });
      if (Object.keys(fieldsToApply).length > 0) {
        updateDraft(fieldsToApply);
        setAISuggestedFields(newAISuggestedFields);
      }
    }
  });

  // Detect similar coverages for duplicate warning (kept for future use)
  useMemo((): CoverageSimilarityMatch[] => {
    if (!draft.name || !existingCoverages) return [];
    const draftNameLower = draft.name.toLowerCase();
    return existingCoverages
      .filter(c => c.id !== existingCoverage?.id)
      .map(c => {
        const nameLower = c.name?.toLowerCase() || '';
        // Simple similarity check
        const similarity = nameLower.includes(draftNameLower) || draftNameLower.includes(nameLower)
          ? 85
          : nameLower.split(' ').some(word => draftNameLower.includes(word))
            ? 60
            : 0;
        return { coverageId: c.id!, name: c.name || '', similarity };
      })
      .filter(m => m.similarity > 50)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
  }, [draft.name, existingCoverages, existingCoverage?.id]);

  // Track which steps have been auto-drafted
  const autoDraftedStepsRef = useRef<Set<string>>(new Set());

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setAISuggestedFields(new Set());
      autoDraftedStepsRef.current.clear();
    }
  }, [isOpen]);

  // Auto-draft fields when entering details step
  useEffect(() => {
    const stepId = WIZARD_STEPS[currentStep]?.id;
    if (
      stepId === 'details' &&
      !autoDraftedStepsRef.current.has(stepId) &&
      draft.name // Only auto-draft if we have a coverage name
    ) {
      autoDraftedStepsRef.current.add(stepId);
      generateFieldsForStep(stepId, draft);
    }
  }, [currentStep, draft.name, generateFieldsForStep, draft]);

  // Generate AI activity message based on current state
  const aiActivityMessage = useMemo(() => {
    if (isAutoDrafting) {
      return 'Generating coverage details...';
    }
    return 'Ready to assist';
  }, [isAutoDrafting]);

  // Calculate step field counts for progress indicator
  const stepsWithFieldCounts = useMemo((): WizardStep[] => {
    const fieldMap: Record<string, { fields: (keyof Coverage)[]; }> = {
      basics: { fields: ['name', 'coverageCode'] },
      triggers: { fields: ['coverageTrigger', 'waitingPeriod'] },
      valuation: { fields: ['valuationMethod', 'coinsurancePercentage'] },
      underwriting: { fields: ['requiresUnderwriterApproval', 'eligibilityCriteria', 'prohibitedClasses'] },
      review: { fields: [] },
    };

    return WIZARD_STEPS.map(step => {
      const config = fieldMap[step.id];
      if (!config) return step;
      const filledCount = config.fields.filter(f =>
        draft[f] !== undefined && draft[f] !== null && draft[f] !== ''
      ).length;
      return {
        ...step,
        fieldCount: config.fields.length,
        filledFieldCount: filledCount,
      };
    });
  }, [draft]);

  const handleNext = useCallback(() => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      prevStepRef.current = currentStep;
      setStepDirection('right');
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      prevStepRef.current = currentStep;
      setStepDirection('left');
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    try {
      const published = await publishDraft();
      if (published) {
        await onSave(published);
        // Show celebration before closing
        setShowCelebration(true);
      }
    } catch (err) {
      console.error('Publish error:', err);
      setIsPublishing(false);
    }
  }, [publishDraft, onSave]);

  const handleCelebrationComplete = useCallback(() => {
    setShowCelebration(false);
    setIsPublishing(false);
    onClose();
  }, [onClose]);

  // Handle AI suggestion acceptance for a field
  const handleAcceptAISuggestion = useCallback((fieldName: string) => {
    // Just remove from suggested set - the value is already there
    setAISuggestedFields(prev => {
      const next = new Set(prev);
      next.delete(fieldName);
      return next;
    });
  }, []);

  // Handle AI suggestion rejection for a field
  const handleRejectAISuggestion = useCallback((fieldName: string) => {
    // Clear the field value and remove from suggested set
    updateDraft({ [fieldName]: null } as Partial<Coverage>);
    setAISuggestedFields(prev => {
      const next = new Set(prev);
      next.delete(fieldName);
      return next;
    });
  }, [updateDraft]);

  if (!isOpen) return null;

  const canPublish = validation?.readyToPublish ?? false;

  // Auto-save status
  const autoSaveStatus = useMemo((): 'idle' | 'saving' | 'saved' | 'error' => {
    if (isSaving) return 'saving';
    if (!isDirty && draft.name) return 'saved';
    return 'idle';
  }, [isSaving, isDirty, draft.name]);

  return (
    <>
      <ModalOverlay onClick={onClose} />
      <ModalContainer
        role="dialog"
        aria-modal="true"
        aria-label="Coverage Copilot Wizard"
        tabIndex={-1}
        onKeyDown={(e) => {
          // Escape - Close wizard
          if (e.key === 'Escape') onClose();
          // Cmd/Ctrl + Arrow Right - Next step
          if (e.key === 'ArrowRight' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleNext();
          }
          // Cmd/Ctrl + Arrow Left - Previous step
          if (e.key === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handlePrevious();
          }
          // Cmd/Ctrl + S - Save draft
          if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            saveDraft();
          }
          // Cmd/Ctrl + Enter - Publish (on review step)
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && currentStep === WIZARD_STEPS.length - 1 && canPublish) {
            e.preventDefault();
            handlePublish();
          }
          // Cmd/Ctrl + ? - Toggle mobile AI panel
          if (e.key === '?' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            setShowMobileAIPanel(prev => !prev);
          }
          // Number keys 1-5 - Jump to step
          if (['1', '2', '3', '4', '5'].includes(e.key) && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            const stepIndex = parseInt(e.key) - 1;
            if (stepIndex < WIZARD_STEPS.length) {
              setCurrentStep(stepIndex);
            }
          }
        }}
      >
        {/* Premium Header with Breadcrumb & AI Status */}
        <Header>
          <HeaderLeft>
            <IconButton onClick={onClose} title="Back to coverages" aria-label="Back to coverages">
              <ArrowLeftIcon />
            </IconButton>
            <HeaderTitle>
              <Breadcrumb aria-label="Wizard navigation">
                <BreadcrumbLink onClick={onClose}>Coverages</BreadcrumbLink>
                <ChevronRightSmall />
                <BreadcrumbCurrent>
                  {existingCoverage?.id ? 'Edit' : 'New Coverage'}
                </BreadcrumbCurrent>
                <ChevronRightSmall />
                <BreadcrumbCurrent>{WIZARD_STEPS[currentStep]?.label}</BreadcrumbCurrent>
              </Breadcrumb>
              <h1>
                {existingCoverage?.id ? 'Edit Coverage' : 'Coverage Copilot'}
              </h1>
            </HeaderTitle>
          </HeaderLeft>

          {/* Auto-save indicator */}
          <HeaderProgress>
            <ProgressLabel>
              <span>{draft.name || 'New Coverage'}</span>
            </ProgressLabel>
            <AutoSaveIndicator $status={autoSaveStatus} aria-live="polite">
              {autoSaveStatus === 'saving' && (
                <>
                  <CloudArrowUpIcon />
                  <span>Saving...</span>
                </>
              )}
              {autoSaveStatus === 'saved' && (
                <>
                  <CheckCircleSolid />
                  <span>Saved</span>
                </>
              )}
            </AutoSaveIndicator>
          </HeaderProgress>

          <IconButton onClick={onClose} title="Close wizard (Esc)" aria-label="Close wizard">
            <XMarkIcon />
          </IconButton>
        </Header>

        {/* Progress with AI Activity */}
        <WizardProgress
          steps={stepsWithFieldCounts}
          currentStepIndex={currentStep}
          onStepClick={setCurrentStep}
          completenessScore={completenessScore}
          isAIActive={isAutoDrafting}
          aiActivityMessage={aiActivityMessage}
        />

        {/* Main content area */}
        <MainContent>
          {/* Form pane */}
          <FormPane>
            <FormContent>
              <StepContainer key={currentStep} $direction={stepDirection}>
                {currentStep === 0 && (
                  <BasicInfoStep
                    draft={draft}
                    updateDraft={updateDraft}
                    existingCoverageNames={existingCoverages?.map(c => c.name || '').filter(Boolean) || []}
                    productLineOfBusiness={product?.lineOfBusiness || 'property'}
                  />
                )}
                {currentStep === 1 && (
                  <TriggersStepWithAI
                    draft={draft}
                    updateDraft={updateDraft}
                    aiSuggestedFields={aiSuggestedFields}
                    onAcceptField={handleAcceptAISuggestion}
                    onRejectField={handleRejectAISuggestion}
                    isAIUpdating={isAutoDrafting}
                    productName={product?.name}
                    productLineOfBusiness={product?.lineOfBusiness}
                  />
                )}
                {currentStep === 2 && (
                  <ValuationStepWithAI
                    draft={draft}
                    updateDraft={updateDraft}
                    aiSuggestedFields={aiSuggestedFields}
                    onAcceptField={handleAcceptAISuggestion}
                    onRejectField={handleRejectAISuggestion}
                    isAIUpdating={isAutoDrafting}
                    productName={product?.name}
                    productLineOfBusiness={product?.lineOfBusiness}
                  />
                )}
                {currentStep === 3 && (
                  <UnderwritingStepWithAI
                    draft={draft}
                    updateDraft={updateDraft}
                    aiSuggestedFields={aiSuggestedFields}
                    onAcceptField={handleAcceptAISuggestion}
                    onRejectField={handleRejectAISuggestion}
                    isAIUpdating={isAutoDrafting}
                    productName={product?.name}
                    productLineOfBusiness={product?.lineOfBusiness}
                  />
                )}
                {currentStep === 4 && (
                  <EnhancedReviewStep
                    draft={draft}
                    validation={validation}
                    aiSuggestedFields={aiSuggestedFields}
                  />
                )}
              </StepContainer>
            </FormContent>
          </FormPane>
        </MainContent>

        {/* Footer */}
        <Footer>
          <WizardFooter
            currentStep={currentStep}
            totalSteps={WIZARD_STEPS.length}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onSaveDraft={saveDraft}
            onPublish={handlePublish}
            canPublish={canPublish}
            isSaving={isSaving}
            isPublishing={isPublishing}
            isDirty={isDirty}
            missingRequiredCount={missingRequiredFields.length}
          />
        </Footer>
      </ModalContainer>

      {/* Floating AI Help Button (visible on review step - desktop) */}
      {currentStep === 4 && (
        <FloatingAIButton
          onClick={() => setCurrentStep(0)}
          aria-label="Get AI assistance"
          title="Get AI assistance (⌘?)"
        >
          <SparklesIcon />
          <span>AI Help</span>
          <ShortcutHint>
            Press <kbd>⌘</kbd><kbd>?</kbd> for help
          </ShortcutHint>
        </FloatingAIButton>
      )}

      {/* Mobile Floating AI Button - visible on all steps */}
      <MobileFloatingAIButton
        onClick={() => setShowMobileAIPanel(true)}
        aria-label="View AI insights"
      >
        <SparklesIcon />
      </MobileFloatingAIButton>

      {/* Mobile AI Panel - Slide-up panel */}
      <MobileAIPanelOverlay $isOpen={showMobileAIPanel} onClick={() => setShowMobileAIPanel(false)} />
      <MobileAIPanel $isOpen={showMobileAIPanel}>
        <MobileAIPanelHeader>
          <h3><SparklesIcon /> AI Insights</h3>
          <MobileAIPanelClose onClick={() => setShowMobileAIPanel(false)}>
            <XMarkIcon />
          </MobileAIPanelClose>
        </MobileAIPanelHeader>
        <MobileAIPanelContent>
          <AIInsightsCard
            stepId={WIZARD_STEPS[currentStep]?.id || 'basics'}
            draft={draft}
          />
        </MobileAIPanelContent>
      </MobileAIPanel>

      {/* Celebration overlay */}
      <CompletionCelebration
        isVisible={showCelebration}
        onComplete={handleCelebrationComplete}
      />
    </>
  );
};

// Step Components with AI Assistance
interface StepProps {
  draft: Partial<Coverage>;
  updateDraft: (p: Partial<Coverage>) => void;
  aiSuggestedFields?: Set<string>;
  onAcceptField?: (field: string) => void;
  onRejectField?: (field: string) => void;
  isAIUpdating?: boolean;
  existingCoverageNames?: string[];
  productLineOfBusiness?: string;
}

const BasicInfoStep: React.FC<StepProps> = ({
  draft,
  updateDraft,
  existingCoverageNames = [],
  productLineOfBusiness = 'property'
}) => (
  <div>
    <StepTitle>What coverage are you creating?</StepTitle>
    <SmartCoverageNameInput
      value={draft.name || ''}
      coverageCode={draft.coverageCode || ''}
      onChange={(name) => updateDraft({ name })}
      onCodeChange={(code) => updateDraft({ coverageCode: code })}
      existingCoverageNames={existingCoverageNames}
      productLineOfBusiness={productLineOfBusiness}
      isAutoCodeEnabled={true}
    />
  </div>
);

// AI Trigger Suggestions based on coverage name
const TRIGGER_SUGGESTIONS: Record<string, { trigger: CoverageTrigger; confidence: number; reason: string }> = {
  // Property coverages - typically occurrence-based
  'building': { trigger: 'occurrence', confidence: 95, reason: 'Property coverages use occurrence triggers for physical damage claims' },
  'contents': { trigger: 'occurrence', confidence: 95, reason: 'Contents coverage triggers when loss occurs during policy period' },
  'business personal property': { trigger: 'occurrence', confidence: 95, reason: 'BPP coverage applies to losses during policy period' },
  'equipment breakdown': { trigger: 'occurrence', confidence: 90, reason: 'Equipment failures trigger at time of breakdown occurrence' },
  'flood': { trigger: 'occurrence', confidence: 95, reason: 'Flood damage is occurrence-based by nature' },
  'earthquake': { trigger: 'occurrence', confidence: 95, reason: 'Seismic events trigger coverage at occurrence' },
  'fire': { trigger: 'occurrence', confidence: 95, reason: 'Fire damage coverage activates when fire occurs' },
  'theft': { trigger: 'occurrence', confidence: 90, reason: 'Theft coverage responds to incidents when they occur' },
  'vandalism': { trigger: 'occurrence', confidence: 90, reason: 'Vandalism triggers at time of damage' },
  'glass': { trigger: 'occurrence', confidence: 90, reason: 'Glass breakage triggers on occurrence' },
  'wind': { trigger: 'occurrence', confidence: 95, reason: 'Wind/hail damage is occurrence-based' },
  'hail': { trigger: 'occurrence', confidence: 95, reason: 'Hail damage triggers when storm occurs' },
  'water damage': { trigger: 'occurrence', confidence: 90, reason: 'Water damage coverage responds at occurrence' },
  'sprinkler': { trigger: 'occurrence', confidence: 90, reason: 'Sprinkler leakage triggers at time of occurrence' },

  // Liability coverages - can be occurrence or claims-made
  'general liability': { trigger: 'occurrence', confidence: 85, reason: 'GL commonly uses occurrence for bodily injury/property damage' },
  'products liability': { trigger: 'occurrence', confidence: 80, reason: 'Products claims often discovered after policy period' },
  'premises liability': { trigger: 'occurrence', confidence: 85, reason: 'Premises incidents trigger when they occur' },
  'personal injury': { trigger: 'occurrence', confidence: 80, reason: 'Personal injury coverage typically occurrence-based' },
  'advertising injury': { trigger: 'claimsMade', confidence: 75, reason: 'Advertising claims may have delayed discovery' },

  // Professional/specialty - typically claims-made
  'professional liability': { trigger: 'claimsMade', confidence: 90, reason: 'Professional liability uses claims-made for long-tail exposure' },
  'errors and omissions': { trigger: 'claimsMade', confidence: 92, reason: 'E&O coverage is traditionally claims-made' },
  'directors and officers': { trigger: 'claimsMade', confidence: 95, reason: 'D&O liability requires claims-made trigger' },
  'employment practices': { trigger: 'claimsMade', confidence: 93, reason: 'EPL uses claims-made for employment-related claims' },
  'cyber': { trigger: 'claimsMade', confidence: 88, reason: 'Cyber liability typically uses claims-made triggers' },
  'media liability': { trigger: 'claimsMade', confidence: 85, reason: 'Media claims often have delayed discovery' },
  'fiduciary': { trigger: 'claimsMade', confidence: 90, reason: 'Fiduciary liability uses claims-made structure' },
  'malpractice': { trigger: 'claimsMade', confidence: 95, reason: 'Medical malpractice requires claims-made for long-tail risks' },

  // Business income - occurrence-based
  'business income': { trigger: 'occurrence', confidence: 90, reason: 'BI coverage links to underlying occurrence event' },
  'extra expense': { trigger: 'occurrence', confidence: 90, reason: 'Extra expense follows occurrence of covered loss' },
  'business interruption': { trigger: 'occurrence', confidence: 90, reason: 'BI triggers when covered event occurs' },

  // Workers comp / employers liability
  'workers compensation': { trigger: 'injuryInFact', confidence: 85, reason: 'WC uses injury-in-fact for workplace injuries' },
  'employers liability': { trigger: 'occurrence', confidence: 80, reason: 'EL commonly uses occurrence trigger' },

  // Environmental - manifestation or continuous
  'pollution': { trigger: 'manifestation', confidence: 85, reason: 'Environmental claims often use manifestation trigger' },
  'environmental': { trigger: 'manifestation', confidence: 85, reason: 'Environmental damage may manifest over time' },
  'contamination': { trigger: 'continuous', confidence: 80, reason: 'Contamination exposure may be continuous' },
  'asbestos': { trigger: 'continuous', confidence: 90, reason: 'Asbestos claims trigger across multiple policy periods' },

  // Auto
  'auto liability': { trigger: 'occurrence', confidence: 95, reason: 'Auto liability triggers at time of accident' },
  'collision': { trigger: 'occurrence', confidence: 95, reason: 'Collision coverage activates when accident occurs' },
  'comprehensive': { trigger: 'occurrence', confidence: 95, reason: 'Comp coverage triggers on covered loss occurrence' },
  'uninsured motorist': { trigger: 'occurrence', confidence: 90, reason: 'UM triggers at time of accident' },
};

// Function to get AI suggestion based on coverage name
const getAITriggerSuggestion = (coverageName: string, lineOfBusiness?: string): { trigger: CoverageTrigger; confidence: number; reason: string } | null => {
  if (!coverageName) return null;

  const lowerName = coverageName.toLowerCase();

  // Check for exact or partial matches
  for (const [key, value] of Object.entries(TRIGGER_SUGGESTIONS)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return value;
    }
  }

  // Default suggestions based on line of business
  if (lineOfBusiness) {
    const lobLower = lineOfBusiness.toLowerCase();
    if (lobLower.includes('property') || lobLower.includes('commercial property')) {
      return { trigger: 'occurrence', confidence: 75, reason: 'Property lines typically use occurrence triggers' };
    }
    if (lobLower.includes('liability') || lobLower.includes('professional')) {
      return { trigger: 'claimsMade', confidence: 70, reason: 'Liability lines often use claims-made triggers' };
    }
    if (lobLower.includes('auto') || lobLower.includes('vehicle')) {
      return { trigger: 'occurrence', confidence: 80, reason: 'Auto coverages typically use occurrence triggers' };
    }
  }

  // Generic fallback - most P&C coverages are occurrence-based
  return { trigger: 'occurrence', confidence: 60, reason: 'Most P&C coverages use occurrence-based triggers by default' };
};

// AI Valuation Suggestions based on coverage name - now with multiple options
interface ValuationSuggestion {
  valuationMethods: ValuationMethod[];
  coinsuranceOptions: number[];
  coinsuranceMin: number;
  coinsuranceMax: number;
  confidence: number;
  valuationReason: string;
  coinsuranceReason: string;
}

const VALUATION_SUGGESTIONS: Record<string, ValuationSuggestion> = {
  // Property coverages - typically RC/ACV options with 80-100% coinsurance range
  'building': { valuationMethods: ['RC', 'ACV'], coinsuranceOptions: [80, 90, 100], coinsuranceMin: 80, coinsuranceMax: 100, confidence: 95, valuationReason: 'Buildings typically offer RC (preferred) or ACV options', coinsuranceReason: 'Standard property coinsurance range' },
  'contents': { valuationMethods: ['ACV', 'RC'], coinsuranceOptions: [80, 90, 100], coinsuranceMin: 80, coinsuranceMax: 100, confidence: 85, valuationReason: 'Contents often ACV, some policies offer RC upgrade', coinsuranceReason: '80-100% coinsurance options typical' },
  'business personal property': { valuationMethods: ['RC', 'ACV'], coinsuranceOptions: [80, 90, 100], coinsuranceMin: 80, coinsuranceMax: 100, confidence: 88, valuationReason: 'BPP commonly offers both RC and ACV', coinsuranceReason: 'Commercial property standard range' },
  'equipment breakdown': { valuationMethods: ['RC', 'ACV', 'functionalRC'], coinsuranceOptions: [80, 90, 100], coinsuranceMin: 80, coinsuranceMax: 100, confidence: 90, valuationReason: 'Equipment may use RC, ACV, or functional replacement', coinsuranceReason: 'Standard coinsurance for equipment' },
  'flood': { valuationMethods: ['RC', 'ACV'], coinsuranceOptions: [80], coinsuranceMin: 80, coinsuranceMax: 80, confidence: 85, valuationReason: 'Flood typically RC or ACV based on building age', coinsuranceReason: 'NFIP uses 80% coinsurance' },
  'earthquake': { valuationMethods: ['RC', 'ACV'], coinsuranceOptions: [80, 90, 100], coinsuranceMin: 80, coinsuranceMax: 100, confidence: 85, valuationReason: 'Earthquake coverage offers RC or ACV options', coinsuranceReason: 'Standard coinsurance for catastrophic perils' },
  'fire': { valuationMethods: ['RC', 'ACV'], coinsuranceOptions: [80, 90, 100], coinsuranceMin: 80, coinsuranceMax: 100, confidence: 92, valuationReason: 'Fire damage typically RC with ACV option', coinsuranceReason: 'Industry standard 80-100% range' },

  // Specialty property - agreed value eliminates coinsurance
  'fine arts': { valuationMethods: ['agreedValue'], coinsuranceOptions: [100], coinsuranceMin: 100, coinsuranceMax: 100, confidence: 95, valuationReason: 'Fine arts require agreed value - unique items', coinsuranceReason: 'Agreed value waives coinsurance' },
  'jewelry': { valuationMethods: ['agreedValue', 'statedAmount'], coinsuranceOptions: [100], coinsuranceMin: 100, coinsuranceMax: 100, confidence: 92, valuationReason: 'Jewelry needs agreed or stated value', coinsuranceReason: 'Full value for scheduled items' },
  'antiques': { valuationMethods: ['agreedValue'], coinsuranceOptions: [100], coinsuranceMin: 100, coinsuranceMax: 100, confidence: 90, valuationReason: 'Antiques require agreed value', coinsuranceReason: 'No coinsurance for agreed value' },
  'collectibles': { valuationMethods: ['agreedValue', 'marketValue'], coinsuranceOptions: [100], coinsuranceMin: 100, coinsuranceMax: 100, confidence: 88, valuationReason: 'Collectibles use agreed or market value', coinsuranceReason: 'Full coinsurance for valuables' },

  // Auto coverages - ACV standard, no coinsurance
  'collision': { valuationMethods: ['ACV'], coinsuranceOptions: [100], coinsuranceMin: 100, coinsuranceMax: 100, confidence: 95, valuationReason: 'Auto collision uses ACV exclusively', coinsuranceReason: 'No coinsurance in auto physical damage' },
  'comprehensive': { valuationMethods: ['ACV'], coinsuranceOptions: [100], coinsuranceMin: 100, coinsuranceMax: 100, confidence: 95, valuationReason: 'Comp coverage uses ACV standard', coinsuranceReason: 'No coinsurance for auto comp' },

  // Older/historic buildings
  'functional replacement': { valuationMethods: ['functionalRC', 'ACV'], coinsuranceOptions: [80, 90], coinsuranceMin: 80, coinsuranceMax: 90, confidence: 88, valuationReason: 'Older buildings may use functional RC', coinsuranceReason: 'Reduced coinsurance for functional' },

  // Business income - based on actual income
  'business income': { valuationMethods: ['ACV'], coinsuranceOptions: [50, 60, 70, 80], coinsuranceMin: 50, coinsuranceMax: 80, confidence: 75, valuationReason: 'BI based on actual lost income', coinsuranceReason: 'BI coinsurance often 50-80%' },
  'business interruption': { valuationMethods: ['ACV'], coinsuranceOptions: [50, 60, 70, 80], coinsuranceMin: 50, coinsuranceMax: 80, confidence: 75, valuationReason: 'BI valued at actual amounts', coinsuranceReason: 'Standard BI coinsurance options' },
  'extra expense': { valuationMethods: ['ACV'], coinsuranceOptions: [80, 90, 100], coinsuranceMin: 80, coinsuranceMax: 100, confidence: 70, valuationReason: 'Extra expenses at actual cost', coinsuranceReason: 'Standard coinsurance applies' },
};

// Function to get AI valuation suggestion based on coverage name
const getAIValuationSuggestion = (coverageName: string, lineOfBusiness?: string): ValuationSuggestion | null => {
  if (!coverageName) return null;

  const lowerName = coverageName.toLowerCase();

  // Check for exact or partial matches
  for (const [key, suggestion] of Object.entries(VALUATION_SUGGESTIONS)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return suggestion;
    }
  }

  // Default suggestions based on line of business
  if (lineOfBusiness) {
    const lobLower = lineOfBusiness.toLowerCase();
    if (lobLower.includes('property') || lobLower.includes('commercial property')) {
      return { valuationMethods: ['RC', 'ACV'], coinsuranceOptions: [80, 90, 100], coinsuranceMin: 80, coinsuranceMax: 100, confidence: 75, valuationReason: 'Property coverages typically offer RC and ACV', coinsuranceReason: '80-100% coinsurance is industry standard' };
    }
    if (lobLower.includes('auto') || lobLower.includes('vehicle')) {
      return { valuationMethods: ['ACV'], coinsuranceOptions: [100], coinsuranceMin: 100, coinsuranceMax: 100, confidence: 80, valuationReason: 'Auto coverages use actual cash value', coinsuranceReason: 'No coinsurance requirement for auto' };
    }
    if (lobLower.includes('inland marine') || lobLower.includes('marine')) {
      return { valuationMethods: ['agreedValue', 'ACV'], coinsuranceOptions: [100], coinsuranceMin: 100, coinsuranceMax: 100, confidence: 75, valuationReason: 'Marine/inland marine uses agreed value or ACV', coinsuranceReason: 'Agreed value waives coinsurance' };
    }
  }

  // Generic fallback for property
  return { valuationMethods: ['RC', 'ACV'], coinsuranceOptions: [80, 90, 100], coinsuranceMin: 80, coinsuranceMax: 100, confidence: 60, valuationReason: 'Most property coverages offer RC and ACV options', coinsuranceReason: '80-100% coinsurance is most common' };
};

// Extended StepProps for trigger step
interface TriggersStepProps extends StepProps {
  productName?: string;
  productLineOfBusiness?: string;
}

// New Triggers Step with AI Sidebar
const TriggersStepWithAI: React.FC<TriggersStepProps> = ({
  draft,
  updateDraft,
  aiSuggestedFields = new Set(),
  onAcceptField,
  onRejectField,
  isAIUpdating,
  productLineOfBusiness
}) => {
  // Get AI suggestion based on coverage name
  const aiSuggestion = React.useMemo(() => {
    return getAITriggerSuggestion(draft.name || '', productLineOfBusiness);
  }, [draft.name, productLineOfBusiness]);

  // Auto-apply high confidence suggestion if no trigger is set
  React.useEffect(() => {
    if (aiSuggestion && aiSuggestion.confidence >= 90 && !draft.coverageTrigger) {
      updateDraft({ coverageTrigger: aiSuggestion.trigger });
    }
  }, [aiSuggestion, draft.coverageTrigger, updateDraft]);

  const handleApplySuggestion = () => {
    if (aiSuggestion) {
      updateDraft({ coverageTrigger: aiSuggestion.trigger });
    }
  };

  return (
    <TriggerStepContainer>
      <TriggerMainContent>
        <StepTitle>Coverage Trigger</StepTitle>
        <TriggerDescription>
          Select how this coverage is triggered. This determines when claims are covered based on when the incident occurs vs. when the claim is made.
        </TriggerDescription>

        <AIAssistedField
          label="Coverage Trigger"
          fieldName="coverageTrigger"
          isAISuggested={aiSuggestedFields.has('coverageTrigger') || (!!aiSuggestion && draft.coverageTrigger === aiSuggestion.trigger)}
          isAIUpdating={isAIUpdating && !draft.coverageTrigger}
          aiExplanation={aiSuggestion?.reason}
          aiConfidence={aiSuggestion?.confidence}
          onAcceptSuggestion={() => onAcceptField?.('coverageTrigger')}
          onRejectSuggestion={() => onRejectField?.('coverageTrigger')}
          hideActions={!!aiSuggestion && draft.coverageTrigger === aiSuggestion.trigger}
        >
          <CoverageTriggerSelector
            value={draft.coverageTrigger}
            onChange={(trigger) => updateDraft({ coverageTrigger: trigger })}
          />
        </AIAssistedField>

        {/* Waiting Period Option */}
        <WaitingPeriodSection>
          <WaitingPeriodCheckbox>
            <input
              type="checkbox"
              id="hasWaitingPeriod"
              checked={!!draft.waitingPeriod}
              onChange={(e) => {
                if (e.target.checked) {
                  updateDraft({ waitingPeriod: 0, waitingPeriodUnit: 'days' });
                } else {
                  updateDraft({ waitingPeriod: undefined, waitingPeriodUnit: undefined });
                }
              }}
            />
            <label htmlFor="hasWaitingPeriod">Waiting Period</label>
          </WaitingPeriodCheckbox>

          {draft.waitingPeriod !== undefined && (
            <WaitingPeriodInputRow>
              <WaitingPeriodNumberInput
                type="number"
                min="0"
                value={draft.waitingPeriod || ''}
                onChange={(e) => updateDraft({ waitingPeriod: parseInt(e.target.value) || 0 })}
                placeholder="Enter value"
              />
              <WaitingPeriodUnitSelect
                value={draft.waitingPeriodUnit || 'days'}
                onChange={(e) => updateDraft({ waitingPeriodUnit: e.target.value as 'days' | 'months' })}
              >
                <option value="days">Days</option>
                <option value="dollars">$ Amount</option>
              </WaitingPeriodUnitSelect>
            </WaitingPeriodInputRow>
          )}
        </WaitingPeriodSection>
      </TriggerMainContent>

      {/* AI Suggestions Sidebar */}
      <TriggerAISidebar>
        <TriggerAISidebarHeader>
          <SparklesIcon />
          <span>AI Recommendations</span>
        </TriggerAISidebarHeader>

        {aiSuggestion ? (
          <AISuggestionCard $confidence={aiSuggestion.confidence}>
            <AISuggestionBadge $confidence={aiSuggestion.confidence}>
              {aiSuggestion.confidence >= 90 ? 'High Confidence' :
               aiSuggestion.confidence >= 75 ? 'Recommended' : 'Suggested'}
            </AISuggestionBadge>
            <AISuggestionTrigger>
              {aiSuggestion.trigger.replace(/([A-Z])/g, ' $1').trim()}
            </AISuggestionTrigger>
            <AISuggestionReason>{aiSuggestion.reason}</AISuggestionReason>
            <AISuggestionConfidence>
              <ConfidenceBar $confidence={aiSuggestion.confidence} />
              <span>{aiSuggestion.confidence}% confidence</span>
            </AISuggestionConfidence>
            {draft.coverageTrigger !== aiSuggestion.trigger && (
              <ApplySuggestionButton onClick={handleApplySuggestion}>
                <SparklesIcon />
                Apply Suggestion
              </ApplySuggestionButton>
            )}
            {draft.coverageTrigger === aiSuggestion.trigger && (
              <AppliedIndicator>
                <CheckCircleSolid />
                Applied
              </AppliedIndicator>
            )}
          </AISuggestionCard>
        ) : (
          <NoSuggestionCard>
            <QuestionMarkCircleIcon />
            <span>Enter a coverage name to get AI trigger recommendations</span>
          </NoSuggestionCard>
        )}

        <AISidebarTip>
          <InformationCircleIcon />
          <span>
            Based on <strong>{draft.name || 'your coverage'}</strong> and P&C industry standards.
          </span>
        </AISidebarTip>
      </TriggerAISidebar>
    </TriggerStepContainer>
  );
};

// Styled components for TriggersStepWithAI
const TriggerStepContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 32px;
  min-height: 400px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const TriggerMainContent = styled.div`
  flex: 1;
`;

const WaitingPeriodSection = styled.div`
  margin-top: 24px;
  padding: 16px;
  background: ${({ theme }) => theme.colours.surface};
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 12px;
`;

const WaitingPeriodCheckbox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #6366f1;
    cursor: pointer;
  }

  label {
    font-size: 14px;
    font-weight: 500;
    color: ${({ theme }) => theme.colours.text};
    cursor: pointer;
  }
`;

const WaitingPeriodInputRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
`;

const WaitingPeriodNumberInput = styled.input`
  flex: 1;
  padding: 10px 14px;
  font-size: 14px;
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colours.background};
  color: ${({ theme }) => theme.colours.text};

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: ${({ theme }) => theme.colours.textMuted};
  }
`;

const WaitingPeriodUnitSelect = styled.select`
  padding: 10px 14px;
  font-size: 14px;
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colours.background};
  color: ${({ theme }) => theme.colours.text};
  cursor: pointer;
  min-width: 120px;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const TriggerDescription = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colours.textMuted};
  margin-bottom: 24px;
  line-height: 1.6;
`;

const TriggerAISidebar = styled.div`
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(99, 102, 241, 0.08));
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 16px;
  padding: 20px;
  height: fit-content;
  animation: ${slideInRight} 0.4s ease-out;
`;

const TriggerAISidebarHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(139, 92, 246, 0.15);

  svg {
    width: 20px;
    height: 20px;
    color: #8b5cf6;
  }

  span {
    font-size: 14px;
    font-weight: 600;
    color: #7c3aed;
  }
`;

const AISuggestionCard = styled.div<{ $confidence: number }>`
  background: ${({ theme }) => theme.colours.surface};
  border: 1.5px solid ${({ $confidence }) =>
    $confidence >= 90 ? '#10b981' :
    $confidence >= 75 ? '#8b5cf6' : '#f59e0b'};
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
`;

const AISuggestionBadge = styled.span<{ $confidence: number }>`
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 8px;
  border-radius: 6px;
  background: ${({ $confidence }) =>
    $confidence >= 90 ? 'linear-gradient(135deg, #10b981, #059669)' :
    $confidence >= 75 ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' :
    'linear-gradient(135deg, #f59e0b, #d97706)'};
  color: white;
  margin-bottom: 12px;
`;

const AISuggestionTrigger = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
  text-transform: capitalize;
  margin-bottom: 8px;
`;

const AISuggestionReason = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.colours.textMuted};
  line-height: 1.5;
  margin-bottom: 12px;
`;

const AISuggestionConfidence = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;

  span {
    font-size: 12px;
    color: ${({ theme }) => theme.colours.textMuted};
  }
`;

const ConfidenceBar = styled.div<{ $confidence: number }>`
  flex: 1;
  height: 6px;
  background: ${({ theme }) => theme.colours.border};
  border-radius: 3px;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: ${({ $confidence }) => $confidence}%;
    background: ${({ $confidence }) =>
      $confidence >= 90 ? '#10b981' :
      $confidence >= 75 ? '#8b5cf6' : '#f59e0b'};
    border-radius: 3px;
    transition: width 0.3s ease;
  }
`;

const ApplySuggestionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
  }
`;

const AppliedIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 8px;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ValuationSuggestionLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colours.textMuted};
  margin-bottom: 4px;
`;

const ApplyAllButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 8px;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  }
`;

const NoSuggestionCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px 16px;
  text-align: center;
  background: ${({ theme }) => theme.colours.surface};
  border: 1px dashed ${({ theme }) => theme.colours.border};
  border-radius: 12px;
  margin-bottom: 16px;

  svg {
    width: 32px;
    height: 32px;
    color: ${({ theme }) => theme.colours.textMuted};
    opacity: 0.5;
  }

  span {
    font-size: 13px;
    color: ${({ theme }) => theme.colours.textMuted};
    line-height: 1.5;
  }
`;

const AISidebarTip = styled.div`
  display: flex;
  gap: 8px;
  padding: 12px;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 8px;

  svg {
    width: 16px;
    height: 16px;
    color: #6366f1;
    flex-shrink: 0;
    margin-top: 2px;
  }

  span {
    font-size: 12px;
    color: ${({ theme }) => theme.colours.textMuted};
    line-height: 1.5;

    strong {
      color: #6366f1;
    }
  }
`;

// Extended StepProps for valuation step
interface ValuationStepProps extends StepProps {
  productName?: string;
  productLineOfBusiness?: string;
}

// Valuation Step with AI Sidebar
const ValuationStepWithAI: React.FC<ValuationStepProps> = ({
  draft,
  updateDraft,
  aiSuggestedFields = new Set(),
  onAcceptField,
  onRejectField,
  isAIUpdating,
  productLineOfBusiness
}) => {
  // Get AI suggestion based on coverage name
  const aiSuggestion = React.useMemo(() => {
    return getAIValuationSuggestion(draft.name || '', productLineOfBusiness);
  }, [draft.name, productLineOfBusiness]);

  // Auto-apply high confidence suggestion if no values are set
  React.useEffect(() => {
    if (aiSuggestion && aiSuggestion.confidence >= 90) {
      const updates: Partial<Coverage> = {};
      if (!draft.valuationMethods || draft.valuationMethods.length === 0) {
        updates.valuationMethods = aiSuggestion.valuationMethods;
      }
      if (!draft.coinsuranceOptions || draft.coinsuranceOptions.length === 0) {
        updates.coinsuranceOptions = aiSuggestion.coinsuranceOptions;
        updates.coinsuranceMinimum = aiSuggestion.coinsuranceMin;
        updates.coinsuranceMaximum = aiSuggestion.coinsuranceMax;
      }
      if (Object.keys(updates).length > 0) {
        updateDraft(updates);
      }
    }
  }, [aiSuggestion, draft.valuationMethods, draft.coinsuranceOptions, updateDraft]);

  const handleApplyValuationSuggestion = () => {
    if (aiSuggestion) {
      updateDraft({ valuationMethods: aiSuggestion.valuationMethods });
    }
  };

  const handleApplyCoinsuranceSuggestion = () => {
    if (aiSuggestion) {
      updateDraft({
        coinsuranceOptions: aiSuggestion.coinsuranceOptions,
        coinsuranceMinimum: aiSuggestion.coinsuranceMin,
        coinsuranceMaximum: aiSuggestion.coinsuranceMax
      });
    }
  };

  const handleApplyAllSuggestions = () => {
    if (aiSuggestion) {
      updateDraft({
        valuationMethods: aiSuggestion.valuationMethods,
        coinsuranceOptions: aiSuggestion.coinsuranceOptions,
        coinsuranceMinimum: aiSuggestion.coinsuranceMin,
        coinsuranceMaximum: aiSuggestion.coinsuranceMax
      });
    }
  };

  // Check if suggestions are applied (compare arrays)
  const valuationApplied = aiSuggestion &&
    draft.valuationMethods?.length === aiSuggestion.valuationMethods.length &&
    aiSuggestion.valuationMethods.every(v => draft.valuationMethods?.includes(v));
  const coinsuranceApplied = aiSuggestion &&
    draft.coinsuranceOptions?.length === aiSuggestion.coinsuranceOptions.length &&
    aiSuggestion.coinsuranceOptions.every(c => draft.coinsuranceOptions?.includes(c));
  const allApplied = valuationApplied && coinsuranceApplied;

  return (
    <TriggerStepContainer>
      <TriggerMainContent>
        <StepTitle>Valuation & Coinsurance</StepTitle>
        <TriggerDescription>
          Select the available valuation methods and coinsurance options for this coverage.
        </TriggerDescription>

        <AIAssistedField
          label="Available Valuation Methods"
          fieldName="valuationMethods"
          isAISuggested={aiSuggestedFields.has('valuationMethods') || valuationApplied}
          isAIUpdating={isAIUpdating && (!draft.valuationMethods || draft.valuationMethods.length === 0)}
          aiExplanation={aiSuggestion?.valuationReason}
          aiConfidence={aiSuggestion?.confidence}
          onAcceptSuggestion={() => onAcceptField?.('valuationMethods')}
          onRejectSuggestion={() => onRejectField?.('valuationMethods')}
          hideActions={valuationApplied}
        >
          <ValuationMethodSelector
            values={draft.valuationMethods}
            onChange={(methods) => updateDraft({ valuationMethods: methods })}
          />
        </AIAssistedField>

        <AIAssistedField
          label="Available Coinsurance Options"
          fieldName="coinsuranceOptions"
          isAISuggested={aiSuggestedFields.has('coinsuranceOptions') || coinsuranceApplied}
          isAIUpdating={isAIUpdating && (!draft.coinsuranceOptions || draft.coinsuranceOptions.length === 0)}
          aiExplanation={aiSuggestion?.coinsuranceReason}
          aiConfidence={aiSuggestion?.confidence}
          onAcceptSuggestion={() => onAcceptField?.('coinsuranceOptions')}
          onRejectSuggestion={() => onRejectField?.('coinsuranceOptions')}
          hideActions={coinsuranceApplied}
        >
          <CoinsuranceInput
            selectedOptions={draft.coinsuranceOptions}
            minimum={draft.coinsuranceMinimum}
            maximum={draft.coinsuranceMaximum}
            onChange={(options, min, max) => updateDraft({
              coinsuranceOptions: options,
              coinsuranceMinimum: min,
              coinsuranceMaximum: max
            })}
          />
        </AIAssistedField>
      </TriggerMainContent>

      {/* AI Suggestions Sidebar */}
      <TriggerAISidebar>
        <TriggerAISidebarHeader>
          <SparklesIcon />
          <span>AI Recommendations</span>
        </TriggerAISidebarHeader>

        {aiSuggestion ? (
          <>
            {/* Valuation Methods Suggestion */}
            <AISuggestionCard $confidence={aiSuggestion.confidence}>
              <AISuggestionBadge $confidence={aiSuggestion.confidence}>
                {aiSuggestion.confidence >= 90 ? 'High Confidence' :
                 aiSuggestion.confidence >= 75 ? 'Recommended' : 'Suggested'}
              </AISuggestionBadge>
              <ValuationSuggestionLabel>Valuation Methods</ValuationSuggestionLabel>
              <AISuggestionTrigger>
                {aiSuggestion.valuationMethods.map(v =>
                  v === 'RC' ? 'RC' :
                  v === 'ACV' ? 'ACV' :
                  v === 'agreedValue' ? 'Agreed' :
                  v === 'statedAmount' ? 'Stated' :
                  v === 'functionalRC' ? 'Functional' : v
                ).join(', ')}
              </AISuggestionTrigger>
              <AISuggestionReason>{aiSuggestion.valuationReason}</AISuggestionReason>
              {!valuationApplied && (
                <ApplySuggestionButton onClick={handleApplyValuationSuggestion}>
                  <SparklesIcon />
                  Apply
                </ApplySuggestionButton>
              )}
              {valuationApplied && (
                <AppliedIndicator>
                  <CheckCircleSolid />
                  Applied
                </AppliedIndicator>
              )}
            </AISuggestionCard>

            {/* Coinsurance Suggestion */}
            <AISuggestionCard $confidence={aiSuggestion.confidence}>
              <ValuationSuggestionLabel>Coinsurance Options</ValuationSuggestionLabel>
              <AISuggestionTrigger>
                {aiSuggestion.coinsuranceOptions.map(c => `${c}%`).join(', ')}
              </AISuggestionTrigger>
              <AISuggestionReason>
                Range: {aiSuggestion.coinsuranceMin}% - {aiSuggestion.coinsuranceMax}%. {aiSuggestion.coinsuranceReason}
              </AISuggestionReason>
              {!coinsuranceApplied && (
                <ApplySuggestionButton onClick={handleApplyCoinsuranceSuggestion}>
                  <SparklesIcon />
                  Apply
                </ApplySuggestionButton>
              )}
              {coinsuranceApplied && (
                <AppliedIndicator>
                  <CheckCircleSolid />
                  Applied
                </AppliedIndicator>
              )}
            </AISuggestionCard>

            {/* Apply All Button */}
            {!allApplied && (
              <ApplyAllButton onClick={handleApplyAllSuggestions}>
                <SparklesIcon />
                Apply All Suggestions
              </ApplyAllButton>
            )}

            <AISuggestionConfidence>
              <ConfidenceBar $confidence={aiSuggestion.confidence} />
              <span>{aiSuggestion.confidence}% confidence</span>
            </AISuggestionConfidence>
          </>
        ) : (
          <NoSuggestionCard>
            <QuestionMarkCircleIcon />
            <span>Enter a coverage name to get AI valuation recommendations</span>
          </NoSuggestionCard>
        )}

        <AISidebarTip>
          <InformationCircleIcon />
          <span>
            Based on <strong>{draft.name || 'your coverage'}</strong> and P&C industry standards.
          </span>
        </AISidebarTip>
      </TriggerAISidebar>
    </TriggerStepContainer>
  );
};

// ============================================================
// UNDERWRITING STEP WITH AI
// ============================================================
interface UnderwritingStepProps extends StepProps {
  productName?: string;
  productLineOfBusiness?: string;
}

const UnderwritingStepWithAI: React.FC<UnderwritingStepProps> = ({
  draft,
  updateDraft,
  aiSuggestedFields = new Set(),
  onAcceptField,
  onRejectField,
  isAIUpdating,
  productLineOfBusiness
}) => {
  // Local state for adding new criteria
  const [newCriteria, setNewCriteria] = React.useState('');
  const [newProhibitedClass, setNewProhibitedClass] = React.useState('');

  // Handle adding eligibility criteria
  const handleAddCriteria = () => {
    if (newCriteria.trim()) {
      const currentCriteria = draft.eligibilityCriteria || [];
      updateDraft({ eligibilityCriteria: [...currentCriteria, newCriteria.trim()] });
      setNewCriteria('');
    }
  };

  // Handle removing eligibility criteria
  const handleRemoveCriteria = (index: number) => {
    const currentCriteria = draft.eligibilityCriteria || [];
    updateDraft({ eligibilityCriteria: currentCriteria.filter((_, i) => i !== index) });
  };

  // Handle adding prohibited class
  const handleAddProhibitedClass = () => {
    if (newProhibitedClass.trim()) {
      const currentClasses = draft.prohibitedClasses || [];
      updateDraft({ prohibitedClasses: [...currentClasses, newProhibitedClass.trim()] });
      setNewProhibitedClass('');
    }
  };

  // Handle removing prohibited class
  const handleRemoveProhibitedClass = (index: number) => {
    const currentClasses = draft.prohibitedClasses || [];
    updateDraft({ prohibitedClasses: currentClasses.filter((_, i) => i !== index) });
  };

  // Determine approval type (support both old and new field)
  const approvalType = draft.underwriterApprovalType ||
    (draft.requiresUnderwriterApproval === true ? 'yes' :
     draft.requiresUnderwriterApproval === false ? 'no' : undefined);

  const isConditional = approvalType === 'conditional';
  const showConditionalFields = isConditional || approvalType === 'yes';

  return (
    <TriggerStepContainer>
      <TriggerMainContent>
        <StepTitle>Underwriting Requirements</StepTitle>
        <TriggerDescription>
          Define underwriter approval requirements and eligibility criteria.
        </TriggerDescription>

        {/* Underwriter Approval Toggle - 3 Options */}
        <AIAssistedField
          label="Requires Underwriter Approval"
          fieldName="underwriterApprovalType"
          isAISuggested={aiSuggestedFields.has('underwriterApprovalType')}
          isAIUpdating={isAIUpdating && !approvalType}
          onAcceptSuggestion={() => onAcceptField?.('underwriterApprovalType')}
          onRejectSuggestion={() => onRejectField?.('underwriterApprovalType')}
        >
          <UnderwritingToggleRow>
            <UnderwritingToggle
              $active={approvalType === 'yes'}
              onClick={() => updateDraft({ underwriterApprovalType: 'yes', requiresUnderwriterApproval: true })}
            >
              Yes
            </UnderwritingToggle>
            <UnderwritingToggle
              $active={approvalType === 'no'}
              onClick={() => updateDraft({ underwriterApprovalType: 'no', requiresUnderwriterApproval: false })}
            >
              No
            </UnderwritingToggle>
            <UnderwritingToggle
              $active={approvalType === 'conditional'}
              $conditional
              onClick={() => updateDraft({ underwriterApprovalType: 'conditional', requiresUnderwriterApproval: true })}
            >
              Conditional
            </UnderwritingToggle>
          </UnderwritingToggleRow>
          <ApprovalTypeDescription>
            {approvalType === 'yes' && 'All submissions require underwriter review before binding.'}
            {approvalType === 'no' && 'Auto-approved - no underwriter review required.'}
            {approvalType === 'conditional' && 'Requires underwriter approval when eligibility criteria are not met.'}
            {!approvalType && 'Select an approval type to continue.'}
          </ApprovalTypeDescription>
        </AIAssistedField>

        {/* Conditional Fields - Only shown when Conditional is selected */}
        {isConditional && (
          <ConditionalFieldsContainer>
            <ConditionalFieldsHeader>
              <ExclamationTriangleIcon />
              <span>Define the conditions for automatic approval</span>
            </ConditionalFieldsHeader>

            {/* Eligibility Criteria - Required for Conditional */}
            <AIAssistedField
              label="Eligibility Criteria (Required)"
              fieldName="eligibilityCriteria"
              isAISuggested={aiSuggestedFields.has('eligibilityCriteria')}
              isAIUpdating={isAIUpdating && (!draft.eligibilityCriteria || draft.eligibilityCriteria.length === 0)}
              onAcceptSuggestion={() => onAcceptField?.('eligibilityCriteria')}
              onRejectSuggestion={() => onRejectField?.('eligibilityCriteria')}
            >
              <ConditionalFieldDescription>
                When all criteria are met, the submission will be auto-approved. Otherwise, it will require underwriter review.
              </ConditionalFieldDescription>
              <UnderwritingListContainer>
                {(draft.eligibilityCriteria || []).map((criteria, index) => (
                  <UnderwritingListItem key={index}>
                    <span>{criteria}</span>
                    <UnderwritingRemoveButton onClick={() => handleRemoveCriteria(index)}>
                      <XMarkIcon />
                    </UnderwritingRemoveButton>
                  </UnderwritingListItem>
                ))}
                <UnderwritingAddRow>
                  <UnderwritingInput
                    type="text"
                    placeholder="Add eligibility requirement..."
                    value={newCriteria}
                    onChange={(e) => setNewCriteria(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCriteria()}
                  />
                  <UnderwritingAddButton onClick={handleAddCriteria} disabled={!newCriteria.trim()}>
                    Add
                  </UnderwritingAddButton>
                </UnderwritingAddRow>
              </UnderwritingListContainer>
              {isConditional && (!draft.eligibilityCriteria || draft.eligibilityCriteria.length === 0) && (
                <RequiredFieldWarning>
                  <ExclamationCircleIcon />
                  At least one eligibility criterion is required for conditional approval.
                </RequiredFieldWarning>
              )}
            </AIAssistedField>

            {/* Prohibited Classes */}
            <AIAssistedField
              label="Prohibited Business Classes"
              fieldName="prohibitedClasses"
              isAISuggested={aiSuggestedFields.has('prohibitedClasses')}
              isAIUpdating={isAIUpdating && (!draft.prohibitedClasses || draft.prohibitedClasses.length === 0)}
              onAcceptSuggestion={() => onAcceptField?.('prohibitedClasses')}
              onRejectSuggestion={() => onRejectField?.('prohibitedClasses')}
            >
              <ConditionalFieldDescription>
                Business classes that are never eligible for this coverage.
              </ConditionalFieldDescription>
              <UnderwritingListContainer>
                {(draft.prohibitedClasses || []).map((cls, index) => (
                  <UnderwritingListItem key={index} $prohibited>
                    <span>{cls}</span>
                    <UnderwritingRemoveButton onClick={() => handleRemoveProhibitedClass(index)}>
                      <XMarkIcon />
                    </UnderwritingRemoveButton>
                  </UnderwritingListItem>
                ))}
                <UnderwritingAddRow>
                  <UnderwritingInput
                    type="text"
                    placeholder="Add prohibited class..."
                    value={newProhibitedClass}
                    onChange={(e) => setNewProhibitedClass(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddProhibitedClass()}
                  />
                  <UnderwritingAddButton onClick={handleAddProhibitedClass} disabled={!newProhibitedClass.trim()}>
                    Add
                  </UnderwritingAddButton>
                </UnderwritingAddRow>
              </UnderwritingListContainer>
            </AIAssistedField>
          </ConditionalFieldsContainer>
        )}
      </TriggerMainContent>

      {/* AI Suggestions Sidebar */}
      <TriggerAISidebar>
        <TriggerAISidebarHeader>
          <SparklesIcon />
          <span>AI Recommendations</span>
        </TriggerAISidebarHeader>

        <AISuggestionCard $confidence={85}>
          <AISuggestionBadge $confidence={85}>Recommended</AISuggestionBadge>
          <ValuationSuggestionLabel>Underwriting Guidance</ValuationSuggestionLabel>
          <AISuggestionReason>
            {productLineOfBusiness?.toLowerCase().includes('property')
              ? 'Property coverages typically require underwriter approval for high-value risks and specific hazard classes.'
              : productLineOfBusiness?.toLowerCase().includes('liability')
              ? 'Liability coverages often need approval for high-risk industries and coverage limits above thresholds.'
              : 'Consider requiring underwriter approval for unusual risks or coverage amounts above your appetite.'}
          </AISuggestionReason>
        </AISuggestionCard>

        <NoSuggestionCard>
          <InformationCircleIcon />
          <span>
            Common eligibility criteria include minimum years in business, loss history requirements, and safety certifications.
          </span>
        </NoSuggestionCard>

        <AISidebarTip>
          <InformationCircleIcon />
          <span>
            Define clear underwriting rules to ensure consistent risk selection.
          </span>
        </AISidebarTip>
      </TriggerAISidebar>
    </TriggerStepContainer>
  );
};

// Underwriting Step Styled Components
const UnderwritingToggleRow = styled.div`
  display: flex;
  gap: 12px;

  @media (max-width: 600px) {
    flex-direction: column;
    gap: 8px;
  }
`;

const UnderwritingToggle = styled.button<{ $active: boolean; $conditional?: boolean }>`
  flex: 1;
  padding: 14px 16px;
  border: 2px solid ${({ $active, $conditional }) =>
    $active
      ? ($conditional ? '#f59e0b' : '#6366f1')
      : '#e5e7eb'};
  border-radius: 10px;
  background: ${({ $active, $conditional }) =>
    $active
      ? ($conditional ? 'rgba(245, 158, 11, 0.08)' : 'rgba(99, 102, 241, 0.08)')
      : 'transparent'};
  color: ${({ $active, $conditional, theme }) =>
    $active
      ? ($conditional ? '#d97706' : '#6366f1')
      : theme.colours?.text || '#374151'};
  font-size: 14px;
  font-weight: ${({ $active }) => $active ? 600 : 500};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ $active, $conditional }) =>
      $active
        ? ($conditional ? '#f59e0b' : '#6366f1')
        : '#d1d5db'};
    background: ${({ $active, $conditional }) =>
      $active
        ? ($conditional ? 'rgba(245, 158, 11, 0.12)' : 'rgba(99, 102, 241, 0.12)')
        : 'rgba(0, 0, 0, 0.02)'};
  }
`;

const ApprovalTypeDescription = styled.p`
  margin: 12px 0 0 0;
  padding: 10px 14px;
  background: ${({ theme }) => theme.colours?.surface || '#f9fafb'};
  border-radius: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colours?.textMuted || '#6b7280'};
  line-height: 1.5;
`;

const ConditionalFieldsContainer = styled.div`
  margin-top: 24px;
  padding: 20px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.04), rgba(217, 119, 6, 0.02));
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 12px;
  animation: ${slideUp} 0.3s ease;
`;

const ConditionalFieldsHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(245, 158, 11, 0.15);

  svg {
    width: 20px;
    height: 20px;
    color: #d97706;
  }

  span {
    font-size: 14px;
    font-weight: 600;
    color: #b45309;
  }
`;

const ConditionalFieldDescription = styled.p`
  margin: 0 0 12px 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colours?.textMuted || '#6b7280'};
  line-height: 1.5;
`;

const RequiredFieldWarning = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  font-size: 13px;
  color: #dc2626;

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`;

const UnderwritingListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const UnderwritingListItem = styled.div<{ $prohibited?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: ${({ $prohibited }) => $prohibited ? 'rgba(239, 68, 68, 0.08)' : 'rgba(99, 102, 241, 0.06)'};
  border: 1px solid ${({ $prohibited }) => $prohibited ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.15)'};
  border-radius: 8px;
  font-size: 14px;
  color: ${({ theme }) => theme.colours?.text || '#374151'};

  span {
    flex: 1;
  }
`;

const UnderwritingRemoveButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const UnderwritingAddRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 4px;
`;

const UnderwritingInput = styled.input`
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: ${({ theme }) => theme.colours?.text || '#374151'};
  background: ${({ theme }) => theme.colours?.surface || '#fff'};
  transition: all 0.15s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const UnderwritingAddButton = styled.button`
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: #6366f1;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: #4f46e5;
  }

  &:disabled {
    background: #e5e7eb;
    color: #9ca3af;
    cursor: not-allowed;
  }
`;

// Simple Review Step - minimal and clean
interface SimpleReviewStepProps {
  draft: Partial<Coverage>;
  validation: any;
}

const SimpleReviewStep: React.FC<SimpleReviewStepProps> = ({ draft, validation }) => (
  <ReviewContainer>
    <StepTitle>Review & Save</StepTitle>

    <SimpleReviewCard>
      <SimpleReviewHeader>
        <ShieldCheckIcon />
        <div>
          <SimpleReviewName>{draft.name || 'Unnamed Coverage'}</SimpleReviewName>
          <SimpleReviewCode>{draft.coverageCode || 'No code assigned'}</SimpleReviewCode>
        </div>
      </SimpleReviewHeader>

      <SimpleReviewDetails>
        <SimpleReviewRow>
          <span>Trigger Type</span>
          <span>{draft.coverageTrigger ? draft.coverageTrigger.replace(/([A-Z])/g, ' $1').trim() : 'Not set'}</span>
        </SimpleReviewRow>
        <SimpleReviewRow>
          <span>Valuation Methods</span>
          <span>{draft.valuationMethods?.length ? draft.valuationMethods.join(', ') : (draft.valuationMethod || 'Not set')}</span>
        </SimpleReviewRow>
        <SimpleReviewRow>
          <span>Coinsurance Options</span>
          <span>{draft.coinsuranceOptions?.length ? draft.coinsuranceOptions.map(c => `${c}%`).join(', ') : 'Not set'}</span>
        </SimpleReviewRow>
        <SimpleReviewRow>
          <span>Underwriter Approval</span>
          <span>{draft.requiresUnderwriterApproval === true ? 'Required' : draft.requiresUnderwriterApproval === false ? 'Auto-Approve' : 'Not set'}</span>
        </SimpleReviewRow>
        {draft.eligibilityCriteria && draft.eligibilityCriteria.length > 0 && (
          <SimpleReviewRow>
            <span>Eligibility Criteria</span>
            <span>{draft.eligibilityCriteria.length} requirement(s)</span>
          </SimpleReviewRow>
        )}
        {draft.prohibitedClasses && draft.prohibitedClasses.length > 0 && (
          <SimpleReviewRow>
            <span>Prohibited Classes</span>
            <span>{draft.prohibitedClasses.length} class(es)</span>
          </SimpleReviewRow>
        )}
      </SimpleReviewDetails>
    </SimpleReviewCard>

    {validation && !validation.readyToPublish && (
      <WarningBox>
        <WarningHeader>
          <ExclamationTriangleIcon />
          <span>Missing Required Fields</span>
        </WarningHeader>
        <WarningList>
          {validation.missingRequiredFields.map((field: string) => (
            <li key={field}>{field}</li>
          ))}
        </WarningList>
      </WarningBox>
    )}
  </ReviewContainer>
);

// Enhanced Review Step with AI contribution summary
interface EnhancedReviewStepProps {
  draft: Partial<Coverage>;
  validation: any;
  aiSuggestedFields?: Set<string>;
}

const EnhancedReviewStep: React.FC<EnhancedReviewStepProps> = ({ draft, validation, aiSuggestedFields }) => {
  const aiFieldCount = aiSuggestedFields?.size || 0;
  const totalFields = 6; // Approximate number of key fields
  const aiContributionPercent = Math.round((aiFieldCount / totalFields) * 100);

  return (
    <ReviewContainer>
      <StepTitle>Review & Publish</StepTitle>
      <StepSubtitle>
        Your coverage is ready. Review the details below before publishing.
      </StepSubtitle>

      {/* AI Contribution Summary */}
      {aiFieldCount > 0 && (
        <AIContributionCard>
          <AIContributionHeader>
            <SparklesIcon />
            <span>AI Assisted This Coverage</span>
          </AIContributionHeader>
          <AIContributionBody>
            <AIContributionStat>
              <span>{aiFieldCount}</span>
              <span>fields suggested</span>
            </AIContributionStat>
            <AIContributionBar>
              <AIContributionFill $percent={aiContributionPercent} />
            </AIContributionBar>
            <AIContributionNote>
              AI helped configure {aiContributionPercent}% of this coverage based on P&C best practices
            </AIContributionNote>
          </AIContributionBody>
        </AIContributionCard>
      )}

      <SimpleReviewCard>
        <SimpleReviewHeader>
          <ShieldCheckIcon />
          <div>
            <SimpleReviewName>{draft.name || 'Unnamed Coverage'}</SimpleReviewName>
            <SimpleReviewCode>{draft.coverageCode || 'No code assigned'}</SimpleReviewCode>
          </div>
        </SimpleReviewHeader>

        <SimpleReviewDetails>
          <SimpleReviewRow $aiSuggested={aiSuggestedFields?.has('coverageTrigger')}>
            <span>Trigger Type</span>
            <span>
              {draft.coverageTrigger ? draft.coverageTrigger.replace(/([A-Z])/g, ' $1').trim() : 'Not set'}
              {aiSuggestedFields?.has('coverageTrigger') && <AIBadge>AI</AIBadge>}
            </span>
          </SimpleReviewRow>
          <SimpleReviewRow $aiSuggested={aiSuggestedFields?.has('valuationMethod')}>
            <span>Valuation Methods</span>
            <span>
              {draft.valuationMethods?.length ? draft.valuationMethods.join(', ') : (draft.valuationMethod || 'Not set')}
              {aiSuggestedFields?.has('valuationMethod') && <AIBadge>AI</AIBadge>}
            </span>
          </SimpleReviewRow>
          <SimpleReviewRow $aiSuggested={aiSuggestedFields?.has('coinsuranceOptions')}>
            <span>Coinsurance Options</span>
            <span>
              {draft.coinsuranceOptions?.length ? draft.coinsuranceOptions.map(c => `${c}%`).join(', ') : 'Not set'}
              {aiSuggestedFields?.has('coinsuranceOptions') && <AIBadge>AI</AIBadge>}
            </span>
          </SimpleReviewRow>
          <SimpleReviewRow>
            <span>Underwriter Approval</span>
            <span>{draft.requiresUnderwriterApproval === true ? 'Required' : draft.requiresUnderwriterApproval === false ? 'Auto-Approve' : 'Not set'}</span>
          </SimpleReviewRow>
          {draft.eligibilityCriteria && draft.eligibilityCriteria.length > 0 && (
            <SimpleReviewRow>
              <span>Eligibility Criteria</span>
              <span>{draft.eligibilityCriteria.length} requirement(s)</span>
            </SimpleReviewRow>
          )}
          {draft.prohibitedClasses && draft.prohibitedClasses.length > 0 && (
            <SimpleReviewRow>
              <span>Prohibited Classes</span>
              <span>{draft.prohibitedClasses.length} class(es)</span>
            </SimpleReviewRow>
          )}
        </SimpleReviewDetails>
      </SimpleReviewCard>

      {validation && !validation.readyToPublish && (
        <WarningBox>
          <WarningHeader>
            <ExclamationTriangleIcon />
            <span>Missing Required Fields</span>
          </WarningHeader>
          <WarningList>
            {validation.missingRequiredFields.map((field: string) => (
              <li key={field}>{field}</li>
            ))}
          </WarningList>
        </WarningBox>
      )}
    </ReviewContainer>
  );
};

// AI Contribution styled components
const AIContributionCard = styled.div`
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.05));
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  animation: ${slideUp} 0.4s ${EASING.spring};
`;

const AIContributionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  svg {
    width: 18px;
    height: 18px;
    color: ${({ theme }) => theme.colours.primary};
  }

  span {
    font-size: 14px;
    font-weight: 600;
    color: ${({ theme }) => theme.colours.primary};
  }
`;

const AIContributionBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const AIContributionStat = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;

  span:first-child {
    font-size: 24px;
    font-weight: 700;
    color: ${({ theme }) => theme.colours.primary};
  }

  span:last-child {
    font-size: 13px;
    color: ${({ theme }) => theme.colours.textMuted};
  }
`;

const AIContributionBar = styled.div`
  height: 6px;
  background: ${({ theme }) => theme.colours.border};
  border-radius: 3px;
  overflow: hidden;
`;

const AIContributionFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 3px;
  transition: width 0.5s ${EASING.spring};
`;

const AIContributionNote = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colours.textMuted};
`;

const AIBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  margin-left: 8px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  font-size: 10px;
  font-weight: 600;
  border-radius: 4px;
  text-transform: uppercase;
`;

// Simple styled components for the new steps
const FieldGroup = styled.div`
  margin-bottom: 24px;
`;

const ValuationStepDescription = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colours.textMuted};
  margin-bottom: 24px;
  line-height: 1.6;
`;

const FieldLabel = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
  margin-bottom: 10px;
`;

const SimpleReviewCard = styled.div`
  background: ${({ theme }) => theme.colours.surface};
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
`;

const SimpleReviewHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colours.border};
  margin-bottom: 20px;

  svg {
    width: 48px;
    height: 48px;
    color: #10b981;
  }
`;

const SimpleReviewName = styled.div`
  font-size: 20px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
`;

const SimpleReviewCode = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colours.textMuted};
  font-family: monospace;
`;

const SimpleReviewDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SimpleReviewRow = styled.div<{ $aiSuggested?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colours.border};
  ${({ $aiSuggested }) => $aiSuggested && css`
    background: linear-gradient(90deg, rgba(99, 102, 241, 0.05) 0%, transparent 100%);
    margin: 0 -12px;
    padding: 12px;
    border-radius: 6px;
  `}

  &:last-child {
    border-bottom: none;
  }

  span:first-child {
    font-size: 14px;
    color: ${({ theme }) => theme.colours.textMuted};
  }

  span:last-child {
    font-size: 14px;
    font-weight: 500;
    color: ${({ theme }) => theme.colours.text};
    text-transform: capitalize;
    display: flex;
    align-items: center;
  }
`;

// Keep old components for backwards compatibility but they're no longer used
const TriggersStep: React.FC<StepProps> = ({
  draft,
  updateDraft,
  aiSuggestedFields = new Set(),
  onAcceptField,
  onRejectField,
  isAIUpdating
}) => (
  <div>
    {isAIUpdating && (
      <AIFillingBanner>
        <SparklesIcon />
        <AIFillingText>
          <strong>AI is analyzing your coverage</strong>
          <span>Filling in trigger settings based on "{draft.name}"...</span>
        </AIFillingText>
        <AIFillingDots><span /><span /><span /></AIFillingDots>
      </AIFillingBanner>
    )}
    <StepTitle>Coverage Triggers & Periods</StepTitle>
    <AIAssistedField
      label="Coverage Trigger"
      fieldName="coverageTrigger"
      isAISuggested={aiSuggestedFields.has('coverageTrigger')}
      isAIUpdating={isAIUpdating && !draft.coverageTrigger}
      aiExplanation="Based on similar coverages in your product portfolio"
      onAcceptSuggestion={() => onAcceptField?.('coverageTrigger')}
      onRejectSuggestion={() => onRejectField?.('coverageTrigger')}
    >
      <CoverageTriggerSelector
        value={draft.coverageTrigger}
        onChange={(trigger) => updateDraft({ coverageTrigger: trigger })}
      />
    </AIAssistedField>
    <AIAssistedField
      label="Waiting Period"
      fieldName="waitingPeriod"
      isAISuggested={aiSuggestedFields.has('waitingPeriod')}
      isAIUpdating={isAIUpdating && !draft.waitingPeriod}
      aiExplanation="Standard waiting period for this coverage type"
      onAcceptSuggestion={() => onAcceptField?.('waitingPeriod')}
      onRejectSuggestion={() => onRejectField?.('waitingPeriod')}
    >
      <WaitingPeriodInput
        value={draft.waitingPeriod}
        unit={draft.waitingPeriodUnit}
        onChange={(value, unit) => updateDraft({ waitingPeriod: value, waitingPeriodUnit: unit })}
      />
    </AIAssistedField>
    {/* Show claims-made specific fields only when relevant */}
    {(draft.coverageTrigger === 'claimsMade' || draft.coverageTrigger === 'hybrid') && (
      <>
        <AIAssistedField
          label="Allow Retroactive Date"
          fieldName="allowRetroactiveDate"
          isAISuggested={aiSuggestedFields.has('allowRetroactiveDate')}
          isAIUpdating={isAIUpdating && draft.allowRetroactiveDate === undefined}
          aiExplanation="Claims-made policies typically allow retroactive dates"
          onAcceptSuggestion={() => onAcceptField?.('allowRetroactiveDate')}
          onRejectSuggestion={() => onRejectField?.('allowRetroactiveDate')}
        >
          <ToggleSwitch
            checked={draft.allowRetroactiveDate ?? false}
            onChange={(checked) => updateDraft({ allowRetroactiveDate: checked })}
            label="Allow retroactive date for prior acts"
          />
        </AIAssistedField>
        <AIAssistedField
          label="Extended Reporting Period (Months)"
          fieldName="extendedReportingPeriod"
          isAISuggested={aiSuggestedFields.has('extendedReportingPeriod')}
          isAIUpdating={isAIUpdating && draft.extendedReportingPeriod === undefined}
          aiExplanation="Standard ERP for claims-made policies"
          onAcceptSuggestion={() => onAcceptField?.('extendedReportingPeriod')}
          onRejectSuggestion={() => onRejectField?.('extendedReportingPeriod')}
        >
          <NumberInput
            value={draft.extendedReportingPeriod ?? 0}
            onChange={(value) => updateDraft({ extendedReportingPeriod: value })}
            min={0}
            max={60}
            suffix="months"
            placeholder="e.g., 12, 24, 36"
          />
        </AIAssistedField>
      </>
    )}
  </div>
);

interface ReviewStepProps {
  draft: Partial<Coverage>;
  validation: any;
  selectedFormIds?: string[];
  forms?: { id: string; formName?: string; formNumber?: string }[];
}

const ReviewStep: React.FC<ReviewStepProps> = ({ draft, validation, selectedFormIds = [], forms = [] }) => {
  const linkedForms = forms.filter(f => selectedFormIds.includes(f.id));

  // Calculate completeness for visual indicator
  const sections = [
    { name: 'Basics', complete: !!(draft.name && draft.coverageCode), icon: '📋' },
    { name: 'Triggers', complete: !!draft.coverageTrigger, icon: '⚡' },
    { name: 'Valuation', complete: !!(draft.valuationMethod && draft.coinsurancePercentage), icon: '💰' },
    { name: 'Underwriting', complete: !!(draft.eligibilityCriteria || draft.riskFactors), icon: '📊' },
    { name: 'Claims', complete: !!draft.claimsProcedure, icon: '📝' },
    { name: 'Forms', complete: linkedForms.length > 0, icon: '📄' },
  ];
  const completedSections = sections.filter(s => s.complete).length;

  return (
    <ReviewContainer>
      {/* Coverage Header Card */}
      <ReviewHeaderCard>
        <ReviewHeaderIcon>
          <ShieldCheckIcon />
        </ReviewHeaderIcon>
        <ReviewHeaderContent>
          <ReviewCoverageName>{draft.name || 'Unnamed Coverage'}</ReviewCoverageName>
          <ReviewCoverageCode>{draft.coverageCode || 'No code'}</ReviewCoverageCode>
        </ReviewHeaderContent>
        <ReviewCompleteness>
          <CompletenessRing $percentage={(completedSections / sections.length) * 100}>
            <span>{completedSections}/{sections.length}</span>
          </CompletenessRing>
          <span>Sections Complete</span>
        </ReviewCompleteness>
      </ReviewHeaderCard>

      {/* Section Cards */}
      <ReviewSectionsGrid>
        {sections.map((section, idx) => (
          <ReviewSectionCard key={section.name} $complete={section.complete} $delay={idx}>
            <SectionIcon $complete={section.complete}>{section.icon}</SectionIcon>
            <SectionName>{section.name}</SectionName>
            <SectionStatus $complete={section.complete}>
              {section.complete ? <CheckCircleSolid /> : <ExclamationCircleIcon />}
            </SectionStatus>
          </ReviewSectionCard>
        ))}
      </ReviewSectionsGrid>

      {/* Details Card */}
      <ReviewCard>
        <ReviewCardHeader>
          <InformationCircleIcon />
          <span>Coverage Details</span>
        </ReviewCardHeader>
        <ReviewGrid>
          <ReviewItem><span>Trigger:</span> <span>{draft.coverageTrigger || '-'}</span></ReviewItem>
          <ReviewItem><span>Valuation:</span> <span>{draft.valuationMethod || '-'}</span></ReviewItem>
          <ReviewItem><span>Coinsurance:</span> <span>{draft.coinsurancePercentage ? `${draft.coinsurancePercentage}%` : '-'}</span></ReviewItem>
          <ReviewItem><span>Waiting Period:</span> <span>{draft.waitingPeriod || '-'}</span></ReviewItem>
        </ReviewGrid>

        {/* Linked Forms */}
        <FormsList>
          <FormsListHeader>
            <DocumentTextIcon />
            <span>Linked Forms ({linkedForms.length})</span>
          </FormsListHeader>
          {linkedForms.length > 0 ? (
            <FormsListContent>
              {linkedForms.map(f => (
                <FormBadge key={f.id}>
                  {f.formNumber || f.formName || 'Unnamed'}
                </FormBadge>
              ))}
            </FormsListContent>
          ) : (
            <NoFormsMessage>No forms linked to this coverage</NoFormsMessage>
          )}
        </FormsList>
      </ReviewCard>

      {/* Validation Warning */}
      {validation && !validation.readyToPublish && (
        <WarningBox>
          <WarningHeader>
            <ExclamationTriangleIcon />
            <span>Missing Required Fields</span>
          </WarningHeader>
          <WarningList>
            {validation.missingRequiredFields.map((field: string) => (
              <li key={field}>{field}</li>
            ))}
          </WarningList>
        </WarningBox>
      )}
    </ReviewContainer>
  );
};

export default CoverageCopilotWizard;

