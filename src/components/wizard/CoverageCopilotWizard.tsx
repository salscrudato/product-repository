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
import { Coverage, CoverageSimilarityMatch } from '../../types';
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
  { id: 'details', label: 'Details', description: 'Coverage settings' },
  { id: 'review', label: 'Review', description: 'Review and save' }
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
      details: { fields: ['coverageTrigger', 'valuationMethod'] },
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
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'ArrowRight' && e.metaKey) handleNext();
          if (e.key === 'ArrowLeft' && e.metaKey) handlePrevious();
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

          {/* Progress Ring & Auto-save */}
          <HeaderProgress>
            <ProgressRing $percentage={completenessScore}>
              <ProgressRingText>{completenessScore}%</ProgressRingText>
            </ProgressRing>
            <ProgressLabel>
              <span>Step {currentStep + 1} of {WIZARD_STEPS.length}</span>
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
                  <DetailsStep
                    draft={draft}
                    updateDraft={updateDraft}
                    aiSuggestedFields={aiSuggestedFields}
                    onAcceptField={handleAcceptAISuggestion}
                    onRejectField={handleRejectAISuggestion}
                    isAIUpdating={isAutoDrafting}
                  />
                )}
                {currentStep === 2 && (
                  <SimpleReviewStep draft={draft} validation={validation} />
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

      {/* Floating AI Help Button (visible on review step) */}
      {currentStep === 2 && (
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

// Combined Details Step - simplified with only essential fields
const DetailsStep: React.FC<StepProps> = ({
  draft,
  updateDraft,
}) => (
  <div>
    <StepTitle>Coverage Settings</StepTitle>

    <FieldGroup>
      <FieldLabel>Coverage Trigger</FieldLabel>
      <CoverageTriggerSelector
        value={draft.coverageTrigger}
        onChange={(trigger) => updateDraft({ coverageTrigger: trigger })}
      />
    </FieldGroup>

    <FieldGroup>
      <FieldLabel>Valuation Method</FieldLabel>
      <ValuationMethodSelector
        value={draft.valuationMethod}
        onChange={(method) => updateDraft({ valuationMethod: method })}
      />
    </FieldGroup>
  </div>
);

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
          <span>Valuation Method</span>
          <span>{draft.valuationMethod || 'Not set'}</span>
        </SimpleReviewRow>
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

// Simple styled components for the new steps
const FieldGroup = styled.div`
  margin-bottom: 24px;
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

const SimpleReviewRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colours.border};

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

const ValuationStep: React.FC<StepProps> = ({
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
          <strong>AI is determining valuation</strong>
          <span>Selecting optimal method for "{draft.name}"...</span>
        </AIFillingText>
        <AIFillingDots><span /><span /><span /></AIFillingDots>
      </AIFillingBanner>
    )}
    <StepTitle>Valuation & Coinsurance</StepTitle>
    <AIAssistedField
      label="Valuation Method"
      fieldName="valuationMethod"
      isAISuggested={aiSuggestedFields.has('valuationMethod')}
      isAIUpdating={isAIUpdating && !draft.valuationMethod}
      aiExplanation="Recommended valuation approach for this coverage"
      onAcceptSuggestion={() => onAcceptField?.('valuationMethod')}
      onRejectSuggestion={() => onRejectField?.('valuationMethod')}
    >
      <ValuationMethodSelector
        value={draft.valuationMethod}
        onChange={(method) => updateDraft({ valuationMethod: method })}
      />
    </AIAssistedField>
    {draft.valuationMethod === 'ACV' && (
      <AIAssistedField
        label="Depreciation Method"
        fieldName="depreciationMethod"
        isAISuggested={aiSuggestedFields.has('depreciationMethod')}
        aiExplanation="Common depreciation approach for ACV"
        onAcceptSuggestion={() => onAcceptField?.('depreciationMethod')}
        onRejectSuggestion={() => onRejectField?.('depreciationMethod')}
      >
        <DepreciationMethodSelector
          value={draft.depreciationMethod}
          onChange={(method) => updateDraft({ depreciationMethod: method })}
        />
      </AIAssistedField>
    )}
    <AIAssistedField
      label="Coinsurance Percentage"
      fieldName="coinsurancePercentage"
      isAISuggested={aiSuggestedFields.has('coinsurancePercentage')}
      isAIUpdating={isAIUpdating && !draft.coinsurancePercentage}
      aiExplanation="Industry standard coinsurance for property coverages is 80%"
      aiConfidence={95}
      onAcceptSuggestion={() => onAcceptField?.('coinsurancePercentage')}
      onRejectSuggestion={() => onRejectField?.('coinsurancePercentage')}
    >
      <CoinsuranceInput
        value={draft.coinsurancePercentage}
        onChange={(value) => updateDraft({ coinsurancePercentage: value })}
      />
    </AIAssistedField>
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

