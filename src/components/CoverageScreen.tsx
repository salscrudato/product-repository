// src/components/CoverageScreen.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  query,
  where,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase';
import useCoverages from '@hooks/useCoverages';
import { useCoverageFormCounts } from '@hooks/useCoverageFormCounts';

import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';
import MainNavigation from '../components/ui/Navigation';
import { PageContainer, PageContent } from '../components/ui/PageContainer';
import EnhancedHeader from '../components/ui/EnhancedHeader';

import { LimitsModal } from '../components/modals/LimitsModal';
import { DeductiblesModal } from '../components/modals/DeductiblesModal';
import { CoverageCopilotWizard } from '../components/wizard/CoverageCopilotWizard';

import styled, { keyframes } from 'styled-components';
import {
  Overlay,
  Modal,
  ModalHeader,
  ModalTitle,
  CloseBtn
} from '../components/ui/Table';
import { StatsDashboard } from '../components/common/DesignSystem';
import {
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  MapIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ScaleIcon,
  ClipboardDocumentCheckIcon,
  BanknotesIcon,
  SparklesIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/solid';

/* ---------- styled components ---------- */

// Animations for micro-interactions
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Coverage Grid - 2-column layout for coverage cards
const CoverageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 120px;
  width: 100%;

  & > * {
    animation: ${fadeInUp} 0.5s ease-out backwards;
  }

  & > *:nth-child(1) { animation-delay: 0.05s; }
  & > *:nth-child(2) { animation-delay: 0.1s; }
  & > *:nth-child(3) { animation-delay: 0.15s; }
  & > *:nth-child(4) { animation-delay: 0.2s; }
  & > *:nth-child(5) { animation-delay: 0.25s; }
  & > *:nth-child(6) { animation-delay: 0.3s; }
  & > *:nth-child(7) { animation-delay: 0.35s; }
  & > *:nth-child(8) { animation-delay: 0.4s; }

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

// Coverage Group - Contains parent and its sub-coverages
const CoverageGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 8px;
`;

// Sub-coverage Container with professional visual connector
const SubCoverageContainer = styled.div<{ $isExpanded: boolean }>`
  position: relative;
  margin-left: 24px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding-left: 24px;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 50%, #e2e8f0 100%);
    border-radius: 1px;
  }

  & > * {
    position: relative;
  }

  & > *::before {
    content: '';
    position: absolute;
    left: -24px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 1px;
    background: #e2e8f0;
  }

  ${({ $isExpanded }) => $isExpanded ? `
    opacity: 1;
    transform: translateY(0);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  ` : `
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
    position: absolute;
    z-index: -1;
  `}

  @media (max-width: 768px) {
    margin-left: 16px;
  }
`;

// Command Bar - Apple-inspired search + actions bar (matching ProductHub)
const CommandBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 32px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 4px 12px rgba(0, 0, 0, 0.03),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 16px;
    padding: 1px;
    background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.2) 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
`;

const CommandBarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CommandBarCenter = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  max-width: 640px;
  min-width: 320px;
`;

const CommandBarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SearchWrapper = styled.div`
  width: 100%;
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchInputStyled = styled.input`
  width: 100%;
  padding: 12px 16px 12px 44px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 450;
  color: #1a1a1a;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: -0.01em;

  &::placeholder {
    color: #8e8e93;
    font-weight: 400;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.04);
    border-color: rgba(0, 0, 0, 0.08);
  }

  &:focus {
    outline: none;
    background: #ffffff;
    border-color: rgba(99, 102, 241, 0.5);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
`;

const SearchIconWrapper = styled.div`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #8e8e93;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 18px;
    height: 18px;
  }
`;

const ToolbarButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 10px;
  background: ${({ $active }) => $active ? 'rgba(99, 102, 241, 0.1)' : 'white'};
  color: ${({ $active }) => $active ? '#6366f1' : '#475569'};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    border-color: rgba(99, 102, 241, 0.3);
    color: #6366f1;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ToolbarLabel = styled.span`
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
`;

const CopilotButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #8b5cf6 100%);
  background-size: 200% 100%;
  border: none;
  border-radius: 50px;
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.35), 0 3px 6px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(20px);
  letter-spacing: 0.01em;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    background: linear-gradient(135deg, #2563eb, #7c3aed, #8b5cf6);
    border-radius: 52px;
    z-index: -1;
    opacity: 0;
    transition: opacity 0.3s ease;
    filter: blur(10px);
  }

  &:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 12px 32px rgba(124, 58, 237, 0.45), 0 6px 12px rgba(0, 0, 0, 0.12);
    background-position: 100% 0;

    &::before {
      opacity: 0.6;
    }
  }

  &:active {
    transform: translateY(-1px) scale(1.01);
  }

  svg {
    width: 18px;
    height: 18px;
    transition: transform 0.3s ease;
  }

  &:hover svg {
    transform: rotate(15deg) scale(1.1);
  }
`;

// Parent Coverage Card - Compact card for parent coverages
const ParentCoverageCard = styled.div`
  background: white;
  border-radius: 14px;
  padding: 16px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04), 0 1px 4px rgba(0, 0, 0, 0.02);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(99, 102, 241, 0.12), 0 8px 16px rgba(0, 0, 0, 0.06);
    border-color: rgba(99, 102, 241, 0.4);

    &::before {
      opacity: 1;
    }
  }

  &:focus-within {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }
`;

// Coverage Card - Compact design for sub-coverages
const CoverageCard = styled.div<{ $isSubCoverage?: boolean; $delay?: number }>`
  background: white;
  border-radius: 12px;
  padding: 14px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  animation: ${scaleIn} 0.35s ease-out backwards;
  animation-delay: ${({ $delay }) => ($delay || 0) * 0.05}s;

  &:hover {
    transform: translateY(-3px) scale(1.01);
    box-shadow: 0 12px 28px rgba(99, 102, 241, 0.1), 0 4px 12px rgba(0, 0, 0, 0.05);
    border-color: rgba(99, 102, 241, 0.35);
  }

  ${({ $isSubCoverage }) => $isSubCoverage && `
    background: linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.9) 100%);
    border-left: 4px solid #6366f1;

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 4px;
      background: linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%);
    }
  `}
`;

const CardHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
`;

const CardHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const CardTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
`;

const CardTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  line-height: 1.3;
  letter-spacing: -0.025em;
`;

const CardCode = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  letter-spacing: 0.025em;
  white-space: nowrap;
`;

const CardActions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`;



const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.8);
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
  }

  &.danger:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
  }
`;

// Coverage Type Badge - Shows if coverage is optional, required, or endorsement
const CoverageTypeBadge = styled.span<{ $isOptional?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-left: 8px;

  ${({ $isOptional }) => $isOptional ? `
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.08) 100%);
    color: #6366f1;
    border: 1px solid rgba(99, 102, 241, 0.2);
  ` : `
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.08) 100%);
    color: #059669;
    border: 1px solid rgba(16, 185, 129, 0.2);
  `}
`;

const CardMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

const MetricItem = styled.div<{ $hasValue?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.9) 100%);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  font-size: 12px;
  color: #475569;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(226, 232, 240, 0.6);
  font-weight: 500;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 3px;
    height: 100%;
    background: ${({ $hasValue }) => $hasValue ? 'linear-gradient(180deg, #10b981, #059669)' : 'transparent'};
    transition: all 0.25s ease;
  }

  &:hover {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
    color: #6366f1;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.12);
    border-color: rgba(99, 102, 241, 0.3);

    svg {
      color: #6366f1;
    }
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 16px;
    height: 16px;
    color: #64748b;
    transition: all 0.25s ease;
    flex-shrink: 0;
  }
`;

const MetricLabel = styled.span`
  white-space: nowrap;
`;

const MetricBadge = styled.span<{ $variant?: 'default' | 'success' | 'warning' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 11px;

  ${({ $variant }) => {
    switch ($variant) {
      case 'success':
        return `
          background: rgba(16, 185, 129, 0.15);
          color: #059669;
        `;
      case 'warning':
        return `
          background: rgba(245, 158, 11, 0.15);
          color: #d97706;
        `;
      default:
        return `
          background: rgba(100, 116, 139, 0.1);
          color: #64748b;
        `;
    }
  }}
`;

const ExpandButton = styled.button<{ $expanded?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  color: #6366f1;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1.5px solid rgba(99, 102, 241, 0.2);
  flex-shrink: 0;

  svg {
    width: 16px;
    height: 16px;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    ${({ $expanded }) => $expanded && 'transform: rotate(90deg);'}
  }

  &:hover {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
    transform: scale(1.08);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.25);
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: 2px solid rgba(99, 102, 241, 0.4);
    outline-offset: 2px;
  }
`;

// P&C Attributes Display - Shows key coverage configuration at a glance
const CoverageAttributesRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.6) 100%);
  border-top: 1px solid rgba(226, 232, 240, 0.5);
  border-radius: 0 0 12px 12px;
`;

const AttributeChip = styled.div<{ $variant?: 'trigger' | 'valuation' | 'coinsurance' | 'territory' | 'default' }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s ease;

  ${({ $variant }) => {
    switch ($variant) {
      case 'trigger':
        return `
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.1) 100%);
          color: #6366f1;
          border: 1px solid rgba(99, 102, 241, 0.2);
        `;
      case 'valuation':
        return `
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.1) 100%);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.2);
        `;
      case 'coinsurance':
        return `
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.1) 100%);
          color: #d97706;
          border: 1px solid rgba(245, 158, 11, 0.2);
        `;
      case 'territory':
        return `
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(37, 99, 235, 0.1) 100%);
          color: #2563eb;
          border: 1px solid rgba(59, 130, 246, 0.2);
        `;
      default:
        return `
          background: rgba(107, 114, 128, 0.08);
          color: #6b7280;
          border: 1px solid rgba(107, 114, 128, 0.15);
        `;
    }
  }}

  svg {
    width: 12px;
    height: 12px;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
`;

const AttributeLabel = styled.span`
  font-weight: 600;
  opacity: 0.8;
`;

const AttributeValue = styled.span`
  font-weight: 500;
`;

const WideModal = styled(Modal)`
  max-width: 1000px;
  width: 95%;
  border-radius: 24px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

// Empty State - Enhanced with illustration and better CTAs
const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 40px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.6) 100%);
  border-radius: 24px;
  border: 2px dashed rgba(203, 213, 225, 0.6);
  animation: ${fadeInUp} 0.5s ease-out;
`;

const EmptyStateIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  border-radius: 24px;
  margin-bottom: 24px;

  svg {
    width: 40px;
    height: 40px;
    color: #6366f1;
  }
`;

const EmptyStateTitle = styled.h3`
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
`;

const EmptyStateText = styled.p`
  font-size: 15px;
  color: #64748b;
  margin: 0 0 28px 0;
  max-width: 400px;
  line-height: 1.6;
`;

const EmptyStateButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

// Skeleton Loading State
const SkeletonCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

const SkeletonLine = styled.div<{ $width?: string; $height?: string }>`
  background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
  border-radius: 6px;
  height: ${({ $height }) => $height || '16px'};
  width: ${({ $width }) => $width || '100%'};
  margin-bottom: 12px;
`;

// Actions container for modal buttons
const Actions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
`;

// Enhanced form linking styles
const FormLinkContainer = styled.div`
  max-height: 360px;
  overflow-y: auto;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  padding: 8px;
  margin-bottom: 16px;
  background: rgba(248, 250, 252, 0.5);
`;

const FormLinkItem = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 4px;

  &:hover {
    background: rgba(99, 102, 241, 0.05);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const FormCheckbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: #6366f1;
  cursor: pointer;
`;

const FormLabel = styled.span`
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
`;

const FormLinkActions = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;



/* ---------- main component ---------- */
export default function CoverageScreen() {
  const { productId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // nested path => parentCoverageId
  const segs = location.pathname.split('/').filter(Boolean);
  const parentCoverageId = segs.length > 2 ? segs[segs.length - 1] : null;

  /* --- realtime coverages hook --- */
  const {
    coverages,
    loading: coveragesLoading,
    error: coveragesError,
    reload: reloadCoverages
  } = useCoverages(productId);

  /* --- form counts from junction table --- */
  const formCounts = useCoverageFormCounts(
    productId,
    coverages.map(c => c.id)
  );

  /* --- derived sub-counts & filtering --- */
  const coveragesWithSub = useMemo(() => {
    const counts = {};
    const parentMap = {};

    // Build parent map and count children
    coverages.forEach(c => {
      if (c.parentCoverageId) {
        counts[c.parentCoverageId] = (counts[c.parentCoverageId] || 0) + 1;
        // Find parent coverage for name lookup
        const parent = coverages.find(p => p.id === c.parentCoverageId);
        if (parent) {
          parentMap[c.id] = {
            id: parent.id,
            name: parent.name,
            coverageCode: parent.coverageCode
          };
        }
      }
    });

    return coverages.map(c => ({
      ...c,
      subCount: counts[c.id] || 0,
      parentInfo: parentMap[c.id] || null
    }));
  }, [coverages]);

  /* ---------------- UI/Meta state ---------------- */
  const [metaLoading, setMetaLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [rules, setRules] = useState([]);
  const [productName, setProductName] = useState('');
  const [parentCoverageName, setParentCoverageName] = useState('');

  const [rawSearch, setRawSearch] = useState('');
  const searchQuery = useDebounce(rawSearch, 250);

  // Filter state - typeFilter is used in filtering logic, setter reserved for future UI
  const [typeFilter, _setTypeFilter] = useState<'all' | 'required' | 'optional'>('all');
  void _setTypeFilter; // Suppress unused variable warning

  // Tree expand/collapse state
  const [expandedIds, setExpandedIds] = useState([]);
  const toggleExpand = id => {
    setExpandedIds(ids =>
      ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]
    );
  };

  // Sub-coverage add button state
  const [addingParentId, setAddingParentId] = useState(null);

  // Coverage Copilot wizard state
  const [copilotWizardOpen, setCopilotWizardOpen] = useState(false);
  const [editingCoverageForWizard, setEditingCoverageForWizard] = useState<any>(null);

  // Tree structure generation for proper parent-child rendering
  const treeStructure = useMemo(() => {
    const childrenMap = {};
    const parentCoverages = [];

    // Build children map and identify parent coverages
    coveragesWithSub.forEach(c => {
      if (c.parentCoverageId) {
        (childrenMap[c.parentCoverageId] = childrenMap[c.parentCoverageId] || []).push(c);
      } else {
        parentCoverages.push(c);
      }
    });

    // Sort children arrays
    Object.values(childrenMap).forEach(arr =>
      arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    );

    // Sort parent coverages
    parentCoverages.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return { parentCoverages, childrenMap };
  }, [coveragesWithSub]);

  // Filter coverages by search and type
  const filteredTreeStructure = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const { parentCoverages, childrenMap } = treeStructure;
    const filteredParents: typeof parentCoverages = [];
    const filteredChildrenMap: typeof childrenMap = {};

    // Helper to check if coverage matches filters
    const matchesFilters = (coverage: typeof parentCoverages[0]) => {
      // Search filter
      const matchesSearch = !q ||
        (coverage.name || '').toLowerCase().includes(q) ||
        (coverage.coverageCode || '').toLowerCase().includes(q);

      // Type filter
      const matchesType = typeFilter === 'all' ||
        (typeFilter === 'required' && coverage.isOptional === false) ||
        (typeFilter === 'optional' && coverage.isOptional === true);

      return matchesSearch && matchesType;
    };

    parentCoverages.forEach(parent => {
      const parentMatches = matchesFilters(parent);
      const children = childrenMap[parent.id] || [];
      const matchingChildren = children.filter(matchesFilters);

      // Include parent if it matches or has matching children
      if (parentMatches || matchingChildren.length > 0) {
        filteredParents.push(parent);
        if (matchingChildren.length > 0) {
          filteredChildrenMap[parent.id] = matchingChildren;
        } else if (parentMatches && children.length > 0) {
          // When parent matches but no children match, still show all children
          filteredChildrenMap[parent.id] = children;
        }
      }
    });

    return { parentCoverages: filteredParents, childrenMap: filteredChildrenMap };
  }, [treeStructure, searchQuery, typeFilter]);

  // Get rule count for a specific coverage
  const getRuleCount = useCallback((coverageId: string) => {
    return rules.filter(rule =>
      rule.ruleType === 'Coverage' && rule.targetId === coverageId
    ).length;
  }, [rules]);

  // Format P&C-specific attributes for display
  const formatCoverageTrigger = (trigger?: string) => {
    const triggerLabels: Record<string, string> = {
      'occurrence': 'Occurrence',
      'claimsMade': 'Claims-Made',
      'hybrid': 'Hybrid'
    };
    return triggerLabels[trigger || ''] || null;
  };

  const formatValuationMethod = (method?: string) => {
    const methodLabels: Record<string, string> = {
      'ACV': 'Actual Cash Value',
      'RC': 'Replacement Cost',
      'agreedValue': 'Agreed Value',
      'marketValue': 'Market Value',
      'functionalRC': 'Functional RC',
      'statedAmount': 'Stated Amount'
    };
    return methodLabels[method || ''] || null;
  };

  const formatTerritoryType = (type?: string) => {
    const typeLabels: Record<string, string> = {
      'worldwide': 'Worldwide',
      'USA': 'USA Only',
      'stateSpecific': 'State-Specific',
      'custom': 'Custom Territory'
    };
    return typeLabels[type || ''] || null;
  };

  // Check if coverage has any P&C attributes configured (excluding trigger)
  const hasPCAttributes = (coverage: any) => {
    return coverage.valuationMethod ||
           coverage.coinsurancePercentage || coverage.territoryType ||
           coverage.waitingPeriod;
  };

  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [deductibleModalOpen, setDeductibleModalOpen] = useState(false);
  const [currentCoverage, setCurrentCoverage] = useState(null);

  const [linkFormsModalOpen, setLinkFormsModalOpen] = useState(false);
  const [selectedCoverageForForms, setSelectedCoverageForForms] = useState(null);
  const [linkFormIds, setLinkFormIds] = useState([]);
  const [formSearchQuery, setFormSearchQuery] = useState('');

  /* ---------- effect: load meta (forms + names + rules) ---------- */
  const loadMeta = useCallback(async () => {
    if (!productId) return;
    setMetaLoading(true);
    try {
      // forms - enrich with linked coverages from junction table
      const formsSnap = await getDocs(
        query(collection(db, 'forms'), where('productId', '==', productId))
      );

      // Fetch all form-coverage links for this product
      const linksSnap = await getDocs(
        query(collection(db, 'formCoverages'), where('productId', '==', productId))
      );
      const coveragesByForm = {};
      linksSnap.docs.forEach(doc => {
        const { formId, coverageId } = doc.data();
        if (!coveragesByForm[formId]) {
          coveragesByForm[formId] = [];
        }
        coveragesByForm[formId].push(coverageId);
      });

      const list = await Promise.all(
        formsSnap.docs.map(async d => {
          const data = d.data();
          let url = null;
          if (data.filePath) {
            try { url = await getDownloadURL(ref(storage, data.filePath)); } catch {}
          }
          return {
            ...data,
            id: d.id,
            downloadUrl: url,
            coverageIds: coveragesByForm[d.id] || []
          };
        })
      );
      setForms(list);

      // rules - fetch all rules for this product
      const rulesSnap = await getDocs(
        query(collection(db, 'rules'), where('productId', '==', productId))
      );
      const rulesList = rulesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRules(rulesList);

      // product / parent names
      const prodDoc = await getDoc(doc(db, 'products', productId));
      setProductName(prodDoc.exists() ? prodDoc.data().name : 'Unknown Product');

      if (parentCoverageId) {
        const parDoc = await getDoc(doc(db, `products/${productId}/coverages`, parentCoverageId));
        setParentCoverageName(parDoc.exists() ? parDoc.data().name : 'Unknown Coverage');
      } else {
        setParentCoverageName('');
      }
    } catch (err) {
      alert('Failed to load data: ' + err.message);
    } finally {
      setMetaLoading(false);
    }
  }, [productId, parentCoverageId]);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  /* ---------- helpers ---------- */
  // Open Coverage Copilot wizard for editing
  const openEditModal = c => {
    setEditingCoverageForWizard(c);
    setCopilotWizardOpen(true);
  };

  // Open Coverage Copilot wizard for adding new coverage
  const openAddModal = (parentId = null) => {
    setEditingCoverageForWizard(parentId ? { parentCoverageId: parentId } : null);
    setCopilotWizardOpen(true);
  };

  /* ---------- Modal handlers ---------- */
  const openLimitModal = c => {
    setCurrentCoverage(c);
    setLimitModalOpen(true);
  };

  const openDeductibleModal = c => {
    setCurrentCoverage(c);
    setDeductibleModalOpen(true);
  };

  const openLinkFormsModal = async c => {
    setSelectedCoverageForForms(c);
    setFormSearchQuery('');

    // Fetch existing linked forms from junction table
    try {
      const linksSnap = await getDocs(
        query(
          collection(db, 'formCoverages'),
          where('coverageId', '==', c.id),
          where('productId', '==', productId)
        )
      );
      const linkedFormIds = linksSnap.docs.map(doc => doc.data().formId);
      setLinkFormIds(linkedFormIds);
    } catch (err) {
      console.error('Error fetching linked forms:', err);
      setLinkFormIds([]);
    }

    setLinkFormsModalOpen(true);
  };



  // Filter forms based on search query
  const filteredForms = useMemo(() => {
    if (!formSearchQuery.trim()) return forms;
    const query = formSearchQuery.toLowerCase();
    return forms.filter(f =>
      (f.formName && f.formName.toLowerCase().includes(query)) ||
      (f.formNumber && f.formNumber.toLowerCase().includes(query))
    );
  }, [forms, formSearchQuery]);

  const handleDelete = async id => {
    if (!window.confirm('Delete this coverage?')) return;
    try {
      await deleteDoc(doc(db, `products/${productId}/coverages`, id));
      await reloadCoverages();

    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const saveLinkedForms = async () => {
    if (!selectedCoverageForForms) return;
    try {
      const coverage = selectedCoverageForForms;
      const desired = new Set(linkFormIds);

      // Fetch existing links from junction table
      const existingSnap = await getDocs(
        query(
          collection(db, 'formCoverages'),
          where('coverageId', '==', coverage.id),
          where('productId', '==', productId)
        )
      );

      const batch = writeBatch(db);

      // Remove deselected links
      existingSnap.docs.forEach(d => {
        if (!desired.has(d.data().formId)) {
          batch.delete(d.ref);
        }
      });

      // Add new links
      const existingIds = new Set(existingSnap.docs.map(d => d.data().formId));
      desired.forEach(fid => {
        if (!existingIds.has(fid)) {
          // ✅ FIXED: Use addDoc pattern with batch instead of doc(collection(...))
          const linkRef = doc(collection(db, 'formCoverages'));
          batch.set(linkRef, {
            formId: fid,
            coverageId: coverage.id,
            productId,
            createdAt: serverTimestamp()
          });
        }
      });

      // ✅ REMOVED: No longer updating coverage.formIds array
      // The formCoverages junction table is the single source of truth

      await batch.commit();
      setLinkFormsModalOpen(false);
      await reloadCoverages();
    } catch (err) {
      console.error('Error saving linked forms:', err);
      alert('Failed to save linked forms: ' + (err.message || 'Unknown error'));
    }
  };

  /* ---------- render guards ---------- */
  if (coveragesLoading || metaLoading) {
    return (
      <PageContainer>
        <MainNavigation />
        <PageContent>
          <EnhancedHeader
            title="Loading Coverages..."
            subtitle="Please wait while we fetch your data"
            icon={ShieldCheckIcon}
            showBackButton
            onBackClick={() => navigate(-1)}
          />

          {/* Skeleton Loading */}
          <CoverageGrid>
            {[1, 2, 3].map(i => (
              <SkeletonCard key={i}>
                <SkeletonLine $width="50%" $height="20px" />
                <SkeletonLine $width="80%" $height="14px" />
                <SkeletonLine $width="100%" $height="40px" />
              </SkeletonCard>
            ))}
          </CoverageGrid>
        </PageContent>
      </PageContainer>
    );
  }

  if (coveragesError) {
    return (
      <PageContainer>
        <MainNavigation />
        <PageContent>
          <EmptyState>
            <EmptyStateIcon>
              <ShieldCheckIcon />
            </EmptyStateIcon>
            <EmptyStateTitle>Error Loading Coverages</EmptyStateTitle>
            <EmptyStateText>There was an error loading the coverage data. Please try refreshing the page.</EmptyStateText>
            <EmptyStateButton onClick={() => window.location.reload()}>
              Refresh Page
            </EmptyStateButton>
          </EmptyState>
        </PageContent>
      </PageContainer>
    );
  }

  /* ---------- UI ---------- */
  return (
    <PageContainer>
      <MainNavigation />
      <PageContent>
        <EnhancedHeader
          title={parentCoverageId ? `${parentCoverageName} Coverages` : `${productName} - Coverages`}
          subtitle={`Manage ${filteredTreeStructure.parentCoverages.length} coverage option${filteredTreeStructure.parentCoverages.length !== 1 ? 's' : ''}`}
          icon={ShieldCheckIcon}
          showBackButton
          onBackClick={() => navigate(-1)}
        />

        {/* Command Bar with Search and Add */}
        <CommandBar>
          <CommandBarLeft>
            <ToolbarLabel>
              {filteredTreeStructure.parentCoverages.length} coverage{filteredTreeStructure.parentCoverages.length !== 1 ? 's' : ''}
              {searchQuery && ` matching "${searchQuery}"`}
            </ToolbarLabel>
          </CommandBarLeft>

          <CommandBarCenter>
            <SearchWrapper>
              <SearchIconWrapper>
                <MagnifyingGlassIcon />
              </SearchIconWrapper>
              <SearchInputStyled
                type="text"
                placeholder="Search coverages by name or code..."
                value={rawSearch}
                onChange={(e) => setRawSearch(e.target.value)}
                aria-label="Search coverages"
              />
            </SearchWrapper>
          </CommandBarCenter>

          <CommandBarRight>
            <CopilotButton onClick={() => setCopilotWizardOpen(true)}>
              <SparklesIcon />
              Coverage Copilot
            </CopilotButton>
          </CommandBarRight>
        </CommandBar>

        {/* Coverages Display */}
        {filteredTreeStructure.parentCoverages.length > 0 ? (
          <CoverageGrid>
	            {filteredTreeStructure.parentCoverages.map((parent, index) => {
	              const isExpanded = expandedIds.includes(parent.id);

	              return (
                  <CoverageGroup key={parent.id} style={{ animationDelay: `${index * 0.05}s` }}>
                    {/* Parent Coverage */}
                      <ParentCoverageCard>
                        <CardHeader>
                          <CardHeaderRow>
                            <CardTitleGroup>
                              <CardTitle>{parent.name}</CardTitle>
                              {parent.isOptional !== undefined && (
                                <CoverageTypeBadge $isOptional={parent.isOptional}>
                                  {parent.isOptional ? 'Optional' : 'Required'}
                                </CoverageTypeBadge>
                              )}
                              <CardCode>{parent.coverageCode}</CardCode>
                              {parent.subCount > 0 && (
                                <ExpandButton
                                  $expanded={isExpanded}
                                  onClick={() => toggleExpand(parent.id)}
                                  aria-label={isExpanded ? 'Collapse sub-coverages' : 'Expand sub-coverages'}
                                >
                                  <ChevronRightIcon />
                                </ExpandButton>
                              )}
                              <IconButton onClick={() => openAddModal(parent.id)} title="Add sub-coverage">
                                <PlusIcon width={16} />
                              </IconButton>
                            </CardTitleGroup>
                            <CardActions>
                              <IconButton onClick={() => openEditModal(parent)} title="Edit coverage">
                                <PencilIcon width={16} />
                              </IconButton>
                              <IconButton className="danger" onClick={() => handleDelete(parent.id)} title="Delete coverage">
                                <TrashIcon width={16} />
                              </IconButton>
                            </CardActions>
                          </CardHeaderRow>
                        </CardHeader>

                        <CardMetrics>
                            <MetricItem
                              $hasValue={parent.limitsCount > 0}
                              onClick={() => openLimitModal(parent)}
                              title="Configure coverage limits"
                            >
                              <ChartBarIcon />
                              <MetricLabel>Limits</MetricLabel>
                              <MetricBadge $variant={parent.limitsCount > 0 ? 'success' : 'default'}>
                                {parent.limitsCount || 0}
                              </MetricBadge>
                            </MetricItem>
                            <MetricItem
                              $hasValue={parent.deductiblesCount > 0}
                              onClick={() => openDeductibleModal(parent)}
                              title="Configure deductible options"
                            >
                              <ScaleIcon />
                              <MetricLabel>Deductibles</MetricLabel>
                              <MetricBadge $variant={parent.deductiblesCount > 0 ? 'success' : 'default'}>
                                {parent.deductiblesCount || 0}
                              </MetricBadge>
                            </MetricItem>
                            <MetricItem
                              $hasValue={parent.states?.length > 0}
                              as={RouterLink}
                              to={`/coverage-states/${productId}/${parent.id}`}
                              title="Manage state availability"
                            >
                              <MapIcon />
                              <MetricLabel>States</MetricLabel>
                              <MetricBadge $variant={parent.states?.length > 0 ? 'success' : 'default'}>
                                {parent.states?.length || 0}
                              </MetricBadge>
                            </MetricItem>
                            <MetricItem
                              $hasValue={formCounts[parent.id] > 0}
                              onClick={() => openLinkFormsModal(parent)}
                              title="Link coverage forms and endorsements"
                            >
                              <ClipboardDocumentCheckIcon />
                              <MetricLabel>Forms</MetricLabel>
                              <MetricBadge $variant={formCounts[parent.id] > 0 ? 'success' : 'default'}>
                                {formCounts[parent.id] || 0}
                              </MetricBadge>
                            </MetricItem>
                            <MetricItem
                              onClick={() => navigate(`/pricing/${productId}?coverage=${encodeURIComponent(parent.name)}`)}
                              title="Configure pricing and rates"
                            >
                              <BanknotesIcon />
                              <MetricLabel>Pricing</MetricLabel>
                            </MetricItem>
                            <MetricItem
                              $hasValue={getRuleCount(parent.id) > 0}
                              onClick={() => navigate(`/rules/${productId}/${parent.id}`)}
                              title="Manage business rules"
                            >
                              <Cog6ToothIcon />
                              <MetricLabel>Rules</MetricLabel>
                              <MetricBadge $variant={getRuleCount(parent.id) > 0 ? 'success' : 'default'}>
                                {getRuleCount(parent.id)}
                              </MetricBadge>
                            </MetricItem>
                          </CardMetrics>

                        {/* P&C Attributes Row - Shows key coverage configuration */}
                        {hasPCAttributes(parent) && (
                          <CoverageAttributesRow>
                            {formatValuationMethod(parent.valuationMethod) && (
                              <AttributeChip $variant="valuation" title="Valuation Method">
                                <AttributeLabel>Valuation:</AttributeLabel>
                                <AttributeValue>{formatValuationMethod(parent.valuationMethod)}</AttributeValue>
                              </AttributeChip>
                            )}
                            {parent.coinsurancePercentage && (
                              <AttributeChip $variant="coinsurance" title="Coinsurance Requirement">
                                <AttributeLabel>Coinsurance:</AttributeLabel>
                                <AttributeValue>{parent.coinsurancePercentage}%</AttributeValue>
                              </AttributeChip>
                            )}
                            {formatTerritoryType(parent.territoryType) && (
                              <AttributeChip $variant="territory" title="Territory Coverage">
                                <AttributeLabel>Territory:</AttributeLabel>
                                <AttributeValue>{formatTerritoryType(parent.territoryType)}</AttributeValue>
                              </AttributeChip>
                            )}
                            {parent.waitingPeriod && (
                              <AttributeChip $variant="default" title="Waiting Period">
                                <AttributeLabel>Wait:</AttributeLabel>
                                <AttributeValue>{parent.waitingPeriod} {parent.waitingPeriodUnit || 'days'}</AttributeValue>
                              </AttributeChip>
                            )}
                          </CoverageAttributesRow>
                        )}
                      </ParentCoverageCard>
                    {/* Sub-Coverages */}
	                    {filteredTreeStructure.childrenMap[parent.id] && isExpanded && (
	                      <SubCoverageContainer $isExpanded={isExpanded}>
	                        {filteredTreeStructure.childrenMap[parent.id].map((child, childIndex) => (
	                            <CoverageCard key={child.id} $isSubCoverage $delay={childIndex}>
	                              <CardHeader>
	                                <CardHeaderRow>
	                                  <CardTitleGroup>
	                                    <CardTitle>{child.name}</CardTitle>
	                                    {child.isOptional !== undefined && (
	                                      <CoverageTypeBadge $isOptional={child.isOptional}>
	                                        {child.isOptional ? 'Optional' : 'Required'}
	                                      </CoverageTypeBadge>
	                                    )}
	                                    <CardCode>{child.coverageCode}</CardCode>
	                                  </CardTitleGroup>
	                                  <CardActions>
	                                    <IconButton onClick={() => openEditModal(child)} title="Edit coverage">
	                                      <PencilIcon width={16} />
	                                    </IconButton>
	                                    <IconButton className="danger" onClick={() => handleDelete(child.id)} title="Delete coverage">
	                                      <TrashIcon width={16} />
	                                    </IconButton>
	                                  </CardActions>
	                                </CardHeaderRow>
	                              </CardHeader>

                              <CardMetrics>
                                <MetricItem
                                  $hasValue={child.limitsCount > 0}
                                  onClick={() => openLimitModal(child)}
                                  title="Configure coverage limits"
                                >
                                  <ChartBarIcon />
                                  <MetricLabel>Limits</MetricLabel>
                                  <MetricBadge $variant={child.limitsCount > 0 ? 'success' : 'default'}>
                                    {child.limitsCount || 0}
                                  </MetricBadge>
                                </MetricItem>
                                <MetricItem
                                  $hasValue={child.deductiblesCount > 0}
                                  onClick={() => openDeductibleModal(child)}
                                  title="Configure deductible options"
                                >
                                  <ScaleIcon />
                                  <MetricLabel>Deductibles</MetricLabel>
                                  <MetricBadge $variant={child.deductiblesCount > 0 ? 'success' : 'default'}>
                                    {child.deductiblesCount || 0}
                                  </MetricBadge>
                                </MetricItem>
                                <MetricItem
                                  $hasValue={child.states?.length > 0}
                                  as={RouterLink}
                                  to={`/coverage-states/${productId}/${child.id}`}
                                  title="Manage state availability"
                                >
                                  <MapIcon />
                                  <MetricLabel>States</MetricLabel>
                                  <MetricBadge $variant={child.states?.length > 0 ? 'success' : 'default'}>
                                    {child.states?.length || 0}
                                  </MetricBadge>
                                </MetricItem>
                                <MetricItem
                                  $hasValue={formCounts[child.id] > 0}
                                  onClick={() => openLinkFormsModal(child)}
                                  title="Link coverage forms"
                                >
                                  <ClipboardDocumentCheckIcon />
                                  <MetricLabel>Forms</MetricLabel>
                                  <MetricBadge $variant={formCounts[child.id] > 0 ? 'success' : 'default'}>
                                    {formCounts[child.id] || 0}
                                  </MetricBadge>
                                </MetricItem>
                                <MetricItem
                                  onClick={() => navigate(`/pricing/${productId}?coverage=${encodeURIComponent(child.name)}`)}
                                  title="Configure pricing"
                                >
                                  <BanknotesIcon />
                                  <MetricLabel>Pricing</MetricLabel>
                                </MetricItem>
                                <MetricItem
                                  $hasValue={getRuleCount(child.id) > 0}
                                  onClick={() => navigate(`/rules/${productId}/${child.id}`)}
                                  title="Manage business rules"
                                >
                                  <Cog6ToothIcon />
                                  <MetricLabel>Rules</MetricLabel>
                                  <MetricBadge $variant={getRuleCount(child.id) > 0 ? 'success' : 'default'}>
                                    {getRuleCount(child.id)}
                                  </MetricBadge>
                                </MetricItem>
	                              </CardMetrics>

	                              {/* P&C Attributes Row for sub-coverages */}
	                              {hasPCAttributes(child) && (
	                                <CoverageAttributesRow>
	                                  {formatValuationMethod(child.valuationMethod) && (
	                                    <AttributeChip $variant="valuation" title="Valuation Method">
	                                      <AttributeLabel>Valuation:</AttributeLabel>
	                                      <AttributeValue>{formatValuationMethod(child.valuationMethod)}</AttributeValue>
	                                    </AttributeChip>
	                                  )}
	                                  {child.coinsurancePercentage && (
	                                    <AttributeChip $variant="coinsurance" title="Coinsurance Requirement">
	                                      <AttributeLabel>Coinsurance:</AttributeLabel>
	                                      <AttributeValue>{child.coinsurancePercentage}%</AttributeValue>
	                                    </AttributeChip>
	                                  )}
	                                  {formatTerritoryType(child.territoryType) && (
	                                    <AttributeChip $variant="territory" title="Territory Coverage">
	                                      <AttributeLabel>Territory:</AttributeLabel>
	                                      <AttributeValue>{formatTerritoryType(child.territoryType)}</AttributeValue>
	                                    </AttributeChip>
	                                  )}
	                                  {child.waitingPeriod && (
	                                    <AttributeChip $variant="default" title="Waiting Period">
	                                      <AttributeLabel>Wait:</AttributeLabel>
	                                      <AttributeValue>{child.waitingPeriod} {child.waitingPeriodUnit || 'days'}</AttributeValue>
	                                    </AttributeChip>
	                                  )}
	                                </CoverageAttributesRow>
	                              )}
                          </CoverageCard>
	                        ))}
                      </SubCoverageContainer>
                    )}
                  </CoverageGroup>
                );
              })}
            </CoverageGrid>
        ) : (
          <EmptyState>
            <EmptyStateIcon>
              <ShieldCheckIcon />
            </EmptyStateIcon>
            <EmptyStateTitle>
              {searchQuery ? 'No matching coverages' : 'No coverages yet'}
            </EmptyStateTitle>
            <EmptyStateText>
              {searchQuery
                ? 'Try adjusting your search terms or clear the search to see all coverages.'
                : 'Build your coverage structure by adding coverages with limits, deductibles, and state-specific configurations. Each coverage can include sub-coverages, linked forms, and business rules for comprehensive policy management.'}
            </EmptyStateText>
            {!searchQuery && (
              <EmptyStateButton onClick={() => setCopilotWizardOpen(true)}>
                <SparklesIcon />
                Launch Coverage Copilot
              </EmptyStateButton>
            )}
          </EmptyState>
        )}

      </PageContent>

      {/* ----- Limits Modal (Enhanced) ----- */}
      {limitModalOpen && currentCoverage && (
        <LimitsModal
          isOpen={limitModalOpen}
          onClose={() => setLimitModalOpen(false)}
          productId={productId}
          coverageId={currentCoverage.id}
          coverageName={currentCoverage.name}
          onSave={reloadCoverages}
        />
      )}

      {/* ----- Deductibles Modal (Enhanced) ----- */}
      {deductibleModalOpen && currentCoverage && (
        <DeductiblesModal
          isOpen={deductibleModalOpen}
          onClose={() => setDeductibleModalOpen(false)}
          productId={productId}
          coverageId={currentCoverage.id}
          coverageName={currentCoverage.name}
          onSave={reloadCoverages}
        />
      )}

      {/* Coverage Copilot Wizard - Used for both add and edit */}
      {copilotWizardOpen && productId && (
        <CoverageCopilotWizard
          isOpen={copilotWizardOpen}
          onClose={() => {
            setCopilotWizardOpen(false);
            setEditingCoverageForWizard(null);
          }}
          productId={productId}
          existingCoverage={editingCoverageForWizard}
          onSave={async () => {
            setCopilotWizardOpen(false);
            setEditingCoverageForWizard(null);
            await reloadCoverages();
          }}
        />
      )}

      {/* Link Forms Modal - Moved outside PageContent */}
      {linkFormsModalOpen && (
        <Overlay onClick={() => setLinkFormsModalOpen(false)}>
          <WideModal onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Link Forms to {selectedCoverageForForms?.name}</ModalTitle>
              <CloseBtn onClick={() => setLinkFormsModalOpen(false)}>
                <XMarkIcon width={20} height={20}/>
              </CloseBtn>
            </ModalHeader>

            <TextInput
              placeholder="Search forms by name or number..."
              value={formSearchQuery || ''}
              onChange={e => setFormSearchQuery(e.target.value)}
              style={{
                marginBottom: '12px',
                border: '1px solid rgba(226, 232, 240, 0.6)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '14px'
              }}
            />

            <FormLinkActions>
              <Button variant="ghost" onClick={() => setLinkFormIds(filteredForms.map(f => f.id))}>
                Select All ({filteredForms.length})
              </Button>
              <Button variant="ghost" onClick={() => setLinkFormIds([])}>
                Clear All
              </Button>
              <span style={{ fontSize: '14px', color: '#6b7280', marginLeft: 'auto' }}>
                {linkFormIds.length} selected
              </span>
            </FormLinkActions>

            <FormLinkContainer>
              {filteredForms.map(f => (
                <FormLinkItem key={f.id}>
                  <FormCheckbox
                    type="checkbox"
                    value={f.id}
                    checked={linkFormIds.includes(f.id)}
                    onChange={e => {
                      const val = e.target.value;
                      setLinkFormIds(ids =>
                        ids.includes(val) ? ids.filter(i => i !== val) : [...ids, val]
                      );
                    }}
                  />
                  <FormLabel>{f.formName || f.formNumber || 'Unnamed Form'}</FormLabel>
                </FormLinkItem>
              ))}
              {filteredForms.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '32px',
                  color: '#6b7280',
                  fontStyle: 'italic'
                }}>
                  No forms found matching your search
                </div>
              )}
            </FormLinkContainer>

            <Actions>
              <Button onClick={saveLinkedForms}>Save Changes</Button>
              <Button variant="ghost" onClick={() => setLinkFormsModalOpen(false)}>Cancel</Button>
            </Actions>
          </WideModal>
        </Overlay>
      )}
    </PageContainer>
  );
}

/* ---------- simple debounce hook ---------- */
function useDebounce(value, ms=250){
  const [v,setV]=useState(value);
  useEffect(()=>{const id=setTimeout(()=>setV(value),ms);return ()=>clearTimeout(id);},[value,ms]);
  return v;
}

