import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CalculatorIcon,
  CubeIcon,
  ArrowDownIcon,
  TableCellsIcon,
  MapPinIcon,
  TagIcon,
  SparklesIcon,
  Bars3Icon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  BoltIcon,
  ClipboardDocumentIcon,
  ChevronRightIcon,
  DocumentDuplicateIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PlayIcon,
  BeakerIcon,
  Cog6ToothIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import type {
  EnhancedRatingStep,
  StepValueType,
  StepScope,
  StepRoundingMode,
  StepTemplate,
  StepGroup,
  ScenarioInputs,
  CalculationTraceStep,
  CalculationResult,
  ValidationIssue,
} from '../../types/pricing';

// ============================================================================
// Types
// ============================================================================

// Keep old interface for backward compatibility
export interface RatingStep {
  id: string;
  stepType: 'factor' | 'operand';
  stepName?: string;
  value?: number;
  operand?: string;
  coverages?: string[];
  states?: string[];
  table?: string;
  rounding?: string;
  order: number;
  // Enhanced fields (optional for backward compatibility)
  valueType?: StepValueType;
  scope?: StepScope;
  enabled?: boolean;
  notes?: string;
  minCap?: number;
  maxCap?: number;
  stepRoundingMode?: StepRoundingMode;
  template?: StepTemplate;
  group?: StepGroup;
  expression?: string;
}

export interface Coverage {
  id: string;
  name: string;
  coverageCode: string;
}

export interface RatingAlgorithmBuilderProps {
  steps: RatingStep[];
  coverages: Coverage[];
  onStepsChange: (steps: RatingStep[]) => void;
  onAddStep: (template?: StepTemplate) => void;
  onEditStep: (step: RatingStep) => void;
  onDeleteStep: (stepId: string) => Promise<void>;
  onUpdateStep: (stepId: string, updates: Partial<RatingStep>) => Promise<void>;
  onUpdateStepValue: (stepId: string, value: number) => Promise<void>;
  onReorderStepsByIndex: (fromIndex: number, toIndex: number) => Promise<void>;
  onAddOperand: (operand: string) => void;
  onOpenCoverageModal: (step: RatingStep) => void;
  onOpenStatesModal: (step: RatingStep) => void;
  onOpenTable?: (step: RatingStep) => void;
  onDuplicateStep?: (step: RatingStep) => Promise<void>;
  selectedCoverage?: string | null;
  selectedStates?: string[];
  isLoading?: boolean;
  // NEW: Live mode control
  liveMode?: boolean;
  onLiveModeChange?: (live: boolean) => void;
  onRunCalculation?: () => void;
  // NEW: Scenario inputs
  scenarioInputs?: ScenarioInputs;
  onScenarioInputsChange?: (inputs: ScenarioInputs) => void;
  // NEW: Calculation result
  calculationResult?: CalculationResult;
  // NEW: Validation
  validationIssues?: ValidationIssue[];
  // NEW: Selected step for inspector
  selectedStepId?: string | null;
  onSelectStep?: (stepId: string | null) => void;
  // NEW: Highlighted trace row (for cross-highlighting)
  highlightedTraceStepId?: string | null;
  onHighlightTraceStep?: (stepId: string | null) => void;
}

// ============================================================================
// Animations - Enhanced micro-interactions
// ============================================================================

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const fadeInScale = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const flowDown = keyframes`
  0% { transform: translateY(-4px); opacity: 0.5; }
  50% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(4px); opacity: 0.5; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`;

const countUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const particleFloat = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
  50% { transform: translateY(-8px) rotate(180deg); opacity: 1; }
`;

// ============================================================================
// Layout Components - Enhanced with Glassmorphism & Mobile-First Responsive
// ============================================================================

const BuilderContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 32px;
  min-height: 600px;
  animation: ${fadeInScale} 0.4s ease-out;
  align-items: start;

  @media (max-width: 1400px) {
    grid-template-columns: 1fr 340px;
    gap: 24px;
  }

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    align-items: auto;
  }

  @media (max-width: 768px) {
    gap: 16px;
    padding: 0 8px;
  }

  @media (max-width: 480px) {
    gap: 12px;
    padding: 0 4px;
  }
`;

const AlgorithmPanel = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.06),
    0 1px 2px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    box-shadow:
      0 8px 40px rgba(0, 0, 0, 0.08),
      0 2px 4px rgba(0, 0, 0, 0.04),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.9) 100%);
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  flex-wrap: wrap;
  gap: 16px;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const PanelTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  h2 {
    font-size: 18px;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
    letter-spacing: -0.025em;
  }

  svg {
    width: 24px;
    height: 24px;
    color: #6366f1;
  }
`;

const StepCount = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.12) 100%);
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid rgba(99, 102, 241, 0.15);
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(139, 92, 246, 0.18) 100%);
    transform: scale(1.02);
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const SearchInput = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  input {
    width: 200px;
    padding: 8px 12px 8px 36px;
    border: 1px solid rgba(226, 232, 240, 0.8);
    border-radius: 10px;
    font-size: 13px;
    background: rgba(255, 255, 255, 0.9);
    color: #1e293b;
    transition: all 0.2s ease;

    &::placeholder {
      color: #94a3b8;
    }

    &:hover {
      border-color: #cbd5e1;
    }

    &:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
  }

  svg {
    position: absolute;
    left: 12px;
    width: 16px;
    height: 16px;
    color: #94a3b8;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    input {
      width: 160px;
    }
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const AddStepButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);

    &::before {
      opacity: 1;
    }
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
  }

  svg {
    width: 18px;
    height: 18px;
  }

  @media (max-width: 768px) {
    padding: 10px 14px;

    span {
      display: none;
    }
  }
`;

const SecondaryButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    border-color: rgba(99, 102, 241, 0.2);
    color: #6366f1;
    transform: translateY(-1px);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

// ============================================================================
// Step List Components - Enhanced with interactions
// ============================================================================

const StepsList = styled.div`
  padding: 24px;
  min-height: 400px;
  position: relative;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

// Premium Empty State with engaging visuals
const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
  animation: ${fadeIn} 0.4s ease-out;
  position: relative;
`;

const EmptyStateIllustration = styled.div`
  position: relative;
  width: 160px;
  height: 160px;
  margin-bottom: 24px;
`;

const EmptyStateIcon = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${float} 3s ease-in-out infinite;

  svg {
    width: 40px;
    height: 40px;
    color: #6366f1;
  }
`;

const EmptyStateRing = styled.div<{ $delay?: number; $size?: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: ${({ $size }) => $size || 120}px;
  height: ${({ $size }) => $size || 120}px;
  border: 2px dashed rgba(99, 102, 241, 0.2);
  border-radius: 50%;
  animation: ${pulse} 2s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay || 0}s;
`;

const EmptyStateParticle = styled.div<{ $x: number; $y: number; $delay: number }>`
  position: absolute;
  top: ${({ $y }) => $y}%;
  left: ${({ $x }) => $x}%;
  width: 8px;
  height: 8px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 50%;
  animation: ${particleFloat} 2.5s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}s;
  opacity: 0.6;
`;

const EmptyStateTitle = styled.h3`
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px;
  letter-spacing: -0.025em;
`;

const EmptyStateDescription = styled.p`
  font-size: 15px;
  color: #64748b;
  margin: 0 0 24px;
  max-width: 360px;
  line-height: 1.6;
`;

const EmptyStateTips = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 32px;
  flex-wrap: wrap;
  justify-content: center;
`;

const EmptyStateTip = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(248, 250, 252, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 10px;
  font-size: 13px;
  color: #64748b;

  svg {
    width: 16px;
    height: 16px;
    color: #6366f1;
  }
`;

// Enhanced Step Card with glassmorphism and micro-interactions - Premium Design
const StepCard = styled.div<{ $isOperand?: boolean; $isDragging?: boolean; $isExpanded?: boolean }>`
  position: relative;
  background: ${({ $isOperand }) =>
    $isOperand
      ? 'linear-gradient(135deg, rgba(255, 251, 235, 0.98) 0%, rgba(254, 243, 199, 0.98) 100%)'
      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.99) 0%, rgba(250, 251, 252, 0.99) 100%)'};
  backdrop-filter: blur(20px) saturate(180%);
  border: ${({ $isOperand }) => $isOperand ? '1.5px' : '1.5px'} solid ${({ $isOperand, $isDragging }) =>
    $isDragging ? '#6366f1' : $isOperand ? 'rgba(251, 191, 36, 0.5)' : 'rgba(226, 232, 240, 0.7)'};
  border-radius: ${({ $isOperand }) => $isOperand ? '12px' : '18px'};
  margin-bottom: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: ${slideUp} 0.35s ease-out;
  animation-fill-mode: both;
  opacity: ${({ $isDragging }) => $isDragging ? 0.85 : 1};
  box-shadow: ${({ $isDragging, $isOperand }) =>
    $isDragging
      ? '0 20px 40px rgba(99, 102, 241, 0.25), 0 8px 16px rgba(99, 102, 241, 0.15)'
      : $isOperand
        ? '0 2px 8px rgba(251, 191, 36, 0.08)'
        : '0 4px 16px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)'};

  /* Inner glow effect */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg,
      transparent,
      ${({ $isOperand }) => $isOperand ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255, 255, 255, 0.8)'},
      transparent);
    border-radius: ${({ $isOperand }) => $isOperand ? '12px' : '18px'} ${({ $isOperand }) => $isOperand ? '12px' : '18px'} 0 0;
    pointer-events: none;
  }

  &:hover {
    border-color: ${({ $isOperand }) => $isOperand ? 'rgba(245, 158, 11, 0.6)' : 'rgba(99, 102, 241, 0.45)'};
    box-shadow: ${({ $isOperand }) => $isOperand
      ? '0 8px 24px rgba(245, 158, 11, 0.15), 0 4px 8px rgba(245, 158, 11, 0.08)'
      : '0 12px 32px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(99, 102, 241, 0.08)'};
    transform: ${({ $isOperand }) => $isOperand ? 'scale(1.01)' : 'translateY(-2px)'};
  }

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: ${({ $isOperand }) => $isOperand ? '12px' : '18px'};
    padding: 1.5px;
    background: ${({ $isOperand }) =>
      $isOperand
        ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.4) 0%, rgba(234, 179, 8, 0.15) 100%)'
        : 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.05) 50%, transparent 100%)'};
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  &:hover::before {
    opacity: 1;
  }
`;

const StepNumber = styled.div`
  position: absolute;
  top: -10px;
  left: 18px;
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35), 0 2px 4px rgba(99, 102, 241, 0.2);
  z-index: 1;
  border: 2px solid rgba(255, 255, 255, 0.9);
  transition: all 0.25s ease;

  &::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%);
    z-index: -1;
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  @media (max-width: 480px) {
    width: 24px;
    height: 24px;
    font-size: 11px;
    top: -8px;
    left: 14px;
  }
`;

const DragHandle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 40px;

  /* Larger touch target on mobile */
  @media (max-width: 768px) {
    width: 32px;
    height: 44px;
    margin-left: -4px;
  }
  color: #cbd5e1;
  cursor: grab;
  transition: color 0.2s ease;
  flex-shrink: 0;
  margin-left: -4px;

  &:hover {
    color: #6366f1;
  }

  &:active {
    cursor: grabbing;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const StepHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 16px 16px 16px 12px;
  gap: 12px;
  min-height: 72px;

  @media (max-width: 768px) {
    padding: 12px;
    gap: 8px;
    flex-wrap: wrap;
  }
`;

const StepIcon = styled.div<{ $type: 'factor' | 'operand' }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $type }) =>
    $type === 'factor'
      ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
      : 'linear-gradient(135deg, #f59e0b 0%, #eab308 100%)'
  };
  color: white;
  flex-shrink: 0;
  box-shadow: ${({ $type }) =>
    $type === 'factor'
      ? '0 4px 12px rgba(99, 102, 241, 0.25)'
      : '0 4px 12px rgba(245, 158, 11, 0.25)'
  };
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }

  svg {
    width: 22px;
    height: 22px;
  }
`;

const StepContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const StepName = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: -0.01em;
`;

const StepMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const MetaBadge = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #6366f1;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
    border-color: rgba(99, 102, 241, 0.25);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);

    &::before {
      opacity: 1;
    }
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }
`;

const TableBadge = styled(MetaBadge)`
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
  border-color: rgba(16, 185, 129, 0.2);
  color: #059669;

  &:hover {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(5, 150, 105, 0.18) 100%);
    border-color: rgba(16, 185, 129, 0.35);
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
  }
`;

const ValueEditor = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
  position: relative;

  @media (max-width: 768px) {
    margin-left: 0;
    width: 100%;
    justify-content: flex-end;
  }
`;

const ValueInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const ValueInput = styled.input<{ $hasChanged?: boolean }>`
  width: 110px;
  padding: 10px 14px 10px 24px;
  border: 1.5px solid ${({ $hasChanged }) => $hasChanged ? '#6366f1' : 'rgba(226, 232, 240, 0.8)'};
  border-radius: 10px;
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  text-align: right;
  background: ${({ $hasChanged }) => $hasChanged ? 'rgba(99, 102, 241, 0.05)' : 'rgba(248, 250, 252, 0.8)'};
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    border-color: #cbd5e1;
    background: rgba(255, 255, 255, 0.9);
  }

  &:focus {
    outline: none;
    border-color: #6366f1;
    background: white;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }

  /* Hide spinner buttons */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  -moz-appearance: textfield;
`;

const StepActions = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  padding-left: 8px;
  border-left: 1px solid rgba(226, 232, 240, 0.6);
  margin-left: 8px;

  @media (max-width: 768px) {
    padding-left: 0;
    border-left: none;
    margin-left: 0;
  }
`;

const IconButton = styled.button<{ $variant?: 'default' | 'danger' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ $variant }) => $variant === 'danger' ? '#ef4444' : '#64748b'};
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  /* Minimum touch target for accessibility */
  min-width: 44px;
  min-height: 44px;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 8px;
    background: currentColor;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover {
    background: ${({ $variant }) =>
      $variant === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)'};
    color: ${({ $variant }) => $variant === 'danger' ? '#dc2626' : '#6366f1'};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
    background: ${({ $variant }) =>
      $variant === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)'};
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    transform: none;

    &:hover {
      background: transparent;
      transform: none;
    }
  }

  svg {
    width: 16px;
    height: 16px;
    position: relative;
    z-index: 1;
  }

  /* Enhanced touch targets on mobile */
  @media (max-width: 768px) {
    width: 40px;
    height: 40px;

    svg {
      width: 18px;
      height: 18px;
    }
  }

  @media (max-width: 480px) {
    width: 44px;
    height: 44px;

    svg {
      width: 20px;
      height: 20px;
    }
  }
`;

// ============================================================================
// Connector / Flow Components - Animated SVG Bezier Curves
// ============================================================================

const StepConnector = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  position: relative;
  margin: 6px 0;
`;

const ConnectorArrow = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%);
  backdrop-filter: blur(12px) saturate(180%);
  border: 2px solid rgba(99, 102, 241, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.18), 0 2px 4px rgba(99, 102, 241, 0.1);
  animation: ${flowDown} 2.5s ease-in-out infinite;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;

  /* Outer glow ring */
  &::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%);
    z-index: -1;
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  &:hover {
    border-color: rgba(99, 102, 241, 0.6);
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.25), 0 4px 8px rgba(99, 102, 241, 0.15);
    transform: scale(1.15);

    &::before {
      opacity: 1;
    }
  }

  svg {
    width: 14px;
    height: 14px;
    color: #6366f1;
  }
`;

// Alternative animated line connector
const AnimatedConnectorLine = styled.div`
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(99, 102, 241, 0.3) 20%,
    rgba(139, 92, 246, 0.5) 50%,
    rgba(99, 102, 241, 0.3) 80%,
    transparent 100%
  );
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    width: 6px;
    height: 6px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border-radius: 50%;
    left: 50%;
    transform: translateX(-50%);
    animation: ${flowDown} 1.5s ease-in-out infinite;
    box-shadow: 0 0 8px rgba(99, 102, 241, 0.5);
  }
`;

// ============================================================================
// Operand Components - Slim styling
// ============================================================================

const OperandDisplay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  gap: 8px;
`;

const OperandSymbol = styled.span`
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #f59e0b 0%, #eab308 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const OperandLabel = styled.span`
  font-size: 11px;
  color: #92400e;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  opacity: 0.8;
`;

// ============================================================================
// Quick Add Operand Bar - Enhanced with floating style
// ============================================================================

const QuickAddBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 18px 24px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.95) 100%);
  border-top: 1px solid rgba(226, 232, 240, 0.6);
  flex-wrap: wrap;

  @media (max-width: 768px) {
    padding: 14px 16px;
    gap: 8px;
  }
`;

const QuickAddLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  margin-right: 4px;
  display: flex;
  align-items: center;
  gap: 6px;

  svg {
    width: 14px;
    height: 14px;
    color: #6366f1;
  }
`;

const OperandButtonGroup = styled.div`
  display: flex;
  gap: 6px;
  background: rgba(255, 255, 255, 0.8);
  padding: 4px;
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.6);
`;

const OperandButtonStyled = styled.button<{ $selected?: boolean }>`
  width: 42px;
  height: 42px;
  border-radius: 10px;
  border: 1.5px solid ${({ $selected }) => $selected ? '#6366f1' : 'rgba(226, 232, 240, 0.8)'};
  background: ${({ $selected }) =>
    $selected
      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)'
      : 'rgba(255, 255, 255, 0.9)'};
  color: ${({ $selected }) => $selected ? '#6366f1' : '#64748b'};
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  /* Minimum touch target */
  min-width: 44px;
  min-height: 44px;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover {
    border-color: #6366f1;
    color: #6366f1;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);

    &::before {
      opacity: 1;
    }
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(99, 102, 241, 0.15);
  }

  /* Keyboard focus style */
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
  }

  /* Enhanced touch targets on mobile */
  @media (max-width: 768px) {
    width: 48px;
    height: 48px;
    font-size: 22px;
  }

  @media (max-width: 480px) {
    width: 52px;
    height: 52px;
    font-size: 24px;
    border-radius: 12px;
  }
`;

// ============================================================================
// Preview Panel Components - Premium Breakdown & Visualization
// ============================================================================

const PreviewPanel = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.06),
    0 1px 2px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  position: sticky;
  top: 100px;
  height: fit-content;
  max-height: calc(100vh - 120px);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    box-shadow:
      0 8px 40px rgba(0, 0, 0, 0.08),
      0 2px 4px rgba(0, 0, 0, 0.04),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }

  @media (max-width: 1200px) {
    position: static;
    max-height: none;
  }

  @media (max-width: 768px) {
    border-radius: 16px;
  }

  @media (max-width: 480px) {
    border-radius: 12px;
    margin: 0 -4px;
  }
`;

const PreviewHeader = styled.div`
  padding: 24px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
  color: white;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 100%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  }

  @media (max-width: 768px) {
    padding: 20px;
  }

  @media (max-width: 480px) {
    padding: 16px;
  }
`;

const PreviewHeaderTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const PreviewTitle = styled.h3`
  font-size: 12px;
  font-weight: 600;
  margin: 0;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  display: flex;
  align-items: center;
  gap: 6px;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const PreviewBadge = styled.div<{ $positive?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: ${({ $positive }) =>
    $positive ? 'rgba(134, 239, 172, 0.2)' : 'rgba(252, 165, 165, 0.2)'};
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;

  svg {
    width: 12px;
    height: 12px;
  }
`;

const PreviewAmount = styled.div`
  font-size: 42px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  animation: ${countUp} 0.4s ease-out;

  @media (max-width: 768px) {
    font-size: 36px;
  }

  @media (max-width: 480px) {
    font-size: 32px;
  }
`;

const PreviewSubtext = styled.div`
  font-size: 13px;
  opacity: 0.75;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  svg {
    width: 14px;
    height: 14px;
  }

  @media (max-width: 480px) {
    font-size: 12px;
    gap: 6px;
  }
`;

const PreviewActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    gap: 6px;
    margin-top: 12px;
  }
`;

const PreviewActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  /* Minimum touch target */
  min-height: 44px;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
    background: rgba(255, 255, 255, 0.3);
  }

  svg {
    width: 14px;
    height: 14px;
  }

  @media (max-width: 480px) {
    padding: 10px 16px;
    flex: 1;
    justify-content: center;
  }
`;

const PreviewBody = styled.div`
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(203, 213, 225, 0.5);
    border-radius: 3px;
  }
`;

const BreakdownTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  button {
    background: none;
    border: none;
    color: #6366f1;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const CalculationRow = styled.div<{ $isResult?: boolean; $index?: number }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 12px;
  margin-bottom: 8px;
  background: ${({ $isResult }) =>
    $isResult
      ? 'linear-gradient(135deg, rgba(240, 253, 244, 0.95) 0%, rgba(220, 252, 231, 0.95) 100%)'
      : 'rgba(248, 250, 252, 0.8)'};
  border: 1px solid ${({ $isResult }) => $isResult ? 'rgba(134, 239, 172, 0.5)' : 'rgba(226, 232, 240, 0.6)'};
  transition: all 0.2s ease;
  animation: ${slideUp} 0.3s ease-out both;
  animation-delay: ${({ $index }) => ($index || 0) * 0.05}s;

  &:hover {
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const CalculationLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #64748b;

  .step-num {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    color: white;
    box-shadow: 0 2px 6px rgba(99, 102, 241, 0.2);
  }

  .step-name {
    font-weight: 600;
    color: #1e293b;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const OperationBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: rgba(245, 158, 11, 0.15);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #d97706;
  margin-right: 4px;
`;

const CalculationValue = styled.div<{ $isResult?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: ${({ $isResult }) => $isResult ? '18px' : '14px'};
  font-weight: 700;
  color: ${({ $isResult }) => $isResult ? '#16a34a' : '#1e293b'};
`;

const FormulaPreview = styled.div`
  padding: 16px;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-radius: 12px;
  margin: 0 20px 20px;
  font-family: 'SF Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  color: #e2e8f0;
  overflow-x: auto;
  line-height: 1.8;
  border: 1px solid rgba(51, 65, 85, 0.5);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);

  .operator {
    color: #fbbf24;
    font-weight: 700;
    padding: 0 8px;
  }

  .value {
    color: #a5b4fc;
    font-weight: 700;
    background: rgba(99, 102, 241, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .label {
    color: #64748b;
    font-size: 11px;
    font-style: italic;
  }
`;

const EmptyPreviewState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: #64748b;

  svg {
    width: 48px;
    height: 48px;
    margin-bottom: 12px;
    opacity: 0.4;
    color: #6366f1;
  }

  p {
    font-size: 14px;
    margin: 0;
    line-height: 1.5;
  }
`;

// ============================================================================
// Helper Functions
// ============================================================================

const getOperandLabel = (op: string): string => {
  switch (op) {
    case '+': return 'Add';
    case '-': return 'Subtract';
    case '*': return 'Multiply';
    case '/': return 'Divide';
    case '=': return 'Equals';
    default: return op;
  }
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// ============================================================================
// Main Component
// ============================================================================

export const RatingAlgorithmBuilder: React.FC<RatingAlgorithmBuilderProps> = ({
  steps,
  coverages: _coverages,
  onAddStep,
  onEditStep,
  onDeleteStep,
  onUpdateStepValue,
  onReorderStepsByIndex,
  onAddOperand,
  onOpenCoverageModal,
  onOpenStatesModal,
  onOpenTable,
  selectedCoverage: _selectedCoverage,
  selectedStates: _selectedStates = [],
  isLoading: _isLoading = false,
}) => {
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const valueInputRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Calculate premium based on steps
  const calculation = useMemo(() => {
    let result = 0;
    let currentOperand: string | null = null;
    const breakdown: Array<{ stepNum: number; name: string; value: number; runningTotal: number; operation: string }> = [];
    let stepNum = 0;

    steps.forEach((step) => {
      if (step.stepType === 'factor') {
        const value = step.value || 0;
        stepNum++;

        if (result === 0 && currentOperand === null) {
          result = value;
        } else if (currentOperand) {
          switch (currentOperand) {
            case '+': result += value; break;
            case '-': result -= value; break;
            case '*': result *= value; break;
            case '/': result = value !== 0 ? result / value : result; break;
            case '=': result = value; break;
          }
        }

        breakdown.push({
          stepNum,
          name: step.stepName || 'Unnamed Step',
          value,
          runningTotal: result,
          operation: currentOperand || 'Initial',
        });

        currentOperand = null;
      } else if (step.stepType === 'operand') {
        currentOperand = step.operand || null;
      }
    });

    return { finalPremium: result, breakdown };
  }, [steps]);

  // Generate formula string
  const formulaString = useMemo(() => {
    let formula = '';
    let currentOperand: string | null = null;

    steps.forEach(step => {
      if (step.stepType === 'factor') {
        if (formula && currentOperand) {
          formula += `<span class="operator">${currentOperand}</span>`;
        }
        formula += `<span class="value">${step.value || 0}</span>`;
        formula += `<span class="label"> (${step.stepName || 'Step'})</span> `;
        currentOperand = null;
      } else if (step.stepType === 'operand') {
        currentOperand = step.operand || null;
      }
    });

    return formula || 'No steps defined';
  }, [steps]);

  // Handle inline value editing
  const startEditing = useCallback((step: RatingStep) => {
    setEditingValueId(step.id);
    setTempValue(String(step.value || 0));
  }, []);

  const saveValue = useCallback(async () => {
    if (editingValueId) {
      const numValue = parseFloat(tempValue) || 0;
      await onUpdateStepValue(editingValueId, numValue);
      setEditingValueId(null);
    }
  }, [editingValueId, tempValue, onUpdateStepValue]);

  const cancelEditing = useCallback(() => {
    setEditingValueId(null);
    setTempValue('');
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (editingValueId && valueInputRef.current) {
      valueInputRef.current.focus();
      valueInputRef.current.select();
    }
  }, [editingValueId]);

  // Get factor steps count
  const factorStepsCount = steps.filter(s => s.stepType === 'factor').length;
  const [searchQuery, setSearchQuery] = useState('');

  // Filter steps based on search
  const filteredDisplaySteps = useMemo(() => {
    if (!searchQuery.trim()) return steps;
    const query = searchQuery.toLowerCase();
    return steps.filter(step =>
      step.stepType === 'operand' ||
      step.stepName?.toLowerCase().includes(query) ||
      step.coverages?.some(c => c.toLowerCase().includes(query))
    );
  }, [steps, searchQuery]);

  // Get step number for factor steps
  const getFactorStepNumber = (stepId: string): number => {
    let num = 0;
    for (const step of steps) {
      if (step.stepType === 'factor') {
        num++;
        if (step.id === stepId) return num;
      }
    }
    return 0;
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      await onReorderStepsByIndex(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <BuilderContainer>
      {/* Main Algorithm Panel */}
      <AlgorithmPanel>
        <StepsList>
          {steps.length === 0 ? (
            <EmptyState>
              <EmptyStateIllustration>
                <EmptyStateRing $size={160} $delay={0} />
                <EmptyStateRing $size={120} $delay={0.3} />
                <EmptyStateRing $size={80} $delay={0.6} />
                <EmptyStateIcon>
                  <RocketLaunchIcon />
                </EmptyStateIcon>
                <EmptyStateParticle $x={15} $y={20} $delay={0} />
                <EmptyStateParticle $x={85} $y={25} $delay={0.5} />
                <EmptyStateParticle $x={10} $y={75} $delay={1} />
                <EmptyStateParticle $x={90} $y={70} $delay={1.5} />
              </EmptyStateIllustration>
              <EmptyStateTitle>Build Your Rating Algorithm</EmptyStateTitle>
              <EmptyStateDescription>
                Create a step-by-step calculation flow to determine premiums.
                Add rating factors, connect them with operators, and watch your algorithm come to life.
              </EmptyStateDescription>
              <AddStepButton onClick={onAddStep}>
                <PlusIcon />
                <span>Add First Step</span>
              </AddStepButton>
              <EmptyStateTips>
                <EmptyStateTip>
                  <LightBulbIcon />
                  Start with a base premium
                </EmptyStateTip>
                <EmptyStateTip>
                  <BoltIcon />
                  Add operators between steps
                </EmptyStateTip>
              </EmptyStateTips>
            </EmptyState>
          ) : (
            filteredDisplaySteps.map((step, index) => (
              <React.Fragment key={step.id}>
                {/* Animated Connector between steps */}
                {index > 0 && (
                  <StepConnector>
                    <AnimatedConnectorLine />
                    <ConnectorArrow>
                      <ArrowDownIcon />
                    </ConnectorArrow>
                  </StepConnector>
                )}

                <StepCard
                  $isOperand={step.stepType === 'operand'}
                  $isDragging={draggedIndex === index}
                  style={{
                    animationDelay: `${index * 0.05}s`,
                    opacity: draggedIndex === index ? 0.5 : 1,
                    transform: dragOverIndex === index ? 'scale(1.02)' : undefined,
                    borderColor: dragOverIndex === index ? '#6366f1' : undefined,
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  {step.stepType === 'factor' && (
                    <StepNumber>{getFactorStepNumber(step.id)}</StepNumber>
                  )}

                  {step.stepType === 'factor' ? (
                    <StepHeader>
                      <DragHandle title="Drag to reorder" style={{ cursor: 'grab' }}>
                        <Bars3Icon />
                      </DragHandle>
                      <StepIcon $type="factor">
                        <CubeIcon />
                      </StepIcon>
                      <StepContent>
                        <StepName>
                          {step.stepName || 'Unnamed Step'}
                          {step.table && (
                            <TableBadge
                              onClick={() => onOpenTable ? onOpenTable(step) : onEditStep(step)}
                              title="View/Edit Table"
                            >
                              <TableCellsIcon />
                              {step.table}
                            </TableBadge>
                          )}
                        </StepName>
                        <StepMeta>
                          <MetaBadge onClick={() => onOpenCoverageModal(step)}>
                            <TagIcon />
                            {step.coverages?.length === 1
                              ? step.coverages[0]
                              : `${step.coverages?.length || 0} coverages`}
                          </MetaBadge>
                          <MetaBadge onClick={() => onOpenStatesModal(step)}>
                            <MapPinIcon />
                            {step.states?.length === 50
                              ? 'All States'
                              : `${step.states?.length || 0} states`}
                          </MetaBadge>
                        </StepMeta>
                      </StepContent>
                      <ValueEditor>
                        <ValueInputWrapper>
                          {editingValueId === step.id ? (
                            <ValueInput
                              ref={valueInputRef}
                              type="number"
                              value={tempValue}
                              onChange={(e) => setTempValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveValue();
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              onBlur={saveValue}
                              $hasChanged={tempValue !== String(step.value || 0)}
                            />
                          ) : (
                            <ValueInput
                              type="number"
                              value={step.value || 0}
                              onFocus={() => startEditing(step)}
                              readOnly
                            />
                          )}
                        </ValueInputWrapper>
                      </ValueEditor>
                      <StepActions>
                        <IconButton onClick={() => onEditStep(step)} title="Edit step (E)">
                          <PencilIcon />
                        </IconButton>
                        <IconButton
                          $variant="danger"
                          onClick={() => onDeleteStep(step.id)}
                          title="Delete step (Del)"
                        >
                          <TrashIcon />
                        </IconButton>
                      </StepActions>
                    </StepHeader>
                  ) : (
                    /* Operand Step - Enhanced */
                    <StepHeader>
                      <StepIcon $type="operand">
                        <span style={{ fontSize: '18px', fontWeight: 800 }}>{step.operand}</span>
                      </StepIcon>
                      <OperandDisplay>
                        <OperandSymbol>{step.operand}</OperandSymbol>
                        <OperandLabel>{getOperandLabel(step.operand || '')}</OperandLabel>
                      </OperandDisplay>
                      <StepActions style={{ marginLeft: 'auto' }}>
                        <IconButton onClick={() => onEditStep(step)} title="Edit operand">
                          <PencilIcon />
                        </IconButton>
                        <IconButton
                          $variant="danger"
                          onClick={() => onDeleteStep(step.id)}
                          title="Delete operand"
                        >
                          <TrashIcon />
                        </IconButton>
                      </StepActions>
                    </StepHeader>
                  )}
                </StepCard>
              </React.Fragment>
            ))
          )}
        </StepsList>

        {/* Quick Add Operand Bar - Enhanced */}
        {steps.length > 0 && (
          <QuickAddBar>
            <QuickAddLabel>
              <BoltIcon />
              Quick add:
            </QuickAddLabel>
            <OperandButtonGroup>
              {['+', '-', '*', '/', '='].map((op, idx) => (
                <OperandButtonStyled
                  key={op}
                  onClick={() => onAddOperand(op)}
                  title={`${getOperandLabel(op)} (${idx + 1})`}
                >
                  {op}
                </OperandButtonStyled>
              ))}
            </OperandButtonGroup>
            <AddStepButton onClick={onAddStep} style={{ marginLeft: 8 }}>
              <PlusIcon />
              <span>Add Step</span>
            </AddStepButton>
          </QuickAddBar>
        )}
      </AlgorithmPanel>

      {/* Premium Preview Panel - Enhanced */}
      <PreviewPanel>
        <PreviewHeader>
          <PreviewHeaderTop>
            <PreviewTitle>
              <CalculatorIcon />
              Calculated Premium
            </PreviewTitle>
          </PreviewHeaderTop>
          <PreviewAmount>{formatCurrency(calculation.finalPremium)}</PreviewAmount>

        </PreviewHeader>

        <PreviewBody>
          {calculation.breakdown.length > 0 ? (
            <>
              {calculation.breakdown.map((row, idx) => (
                <CalculationRow key={idx} $index={idx}>
                  <CalculationLabel>
                    <span className="step-num">{row.stepNum}</span>
                    <span className="step-name">{row.name}</span>
                  </CalculationLabel>
                  <CalculationValue>
                    {row.operation !== 'Initial' && (
                      <OperationBadge>{row.operation}</OperationBadge>
                    )}
                    {formatCurrency(row.value)}
                  </CalculationValue>
                </CalculationRow>
              ))}
              <CalculationRow $isResult $index={calculation.breakdown.length}>
                <CalculationLabel>
                  <CheckCircleIcon style={{ width: 18, height: 18, color: '#16a34a' }} />
                  <span className="step-name" style={{ fontWeight: 700 }}>Final Premium</span>
                </CalculationLabel>
                <CalculationValue $isResult>
                  {formatCurrency(calculation.finalPremium)}
                </CalculationValue>
              </CalculationRow>
            </>
          ) : (
            <EmptyPreviewState>
              <CalculatorIcon />
              <p>Add rating steps to see<br />the calculation breakdown</p>
            </EmptyPreviewState>
          )}
        </PreviewBody>
      </PreviewPanel>
    </BuilderContainer>
  );
};

export default RatingAlgorithmBuilder;
