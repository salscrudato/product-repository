import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { db, storage } from '@/firebase';
import useDebounce from '@hooks/useDebounce';
import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc,
  query, where, getDoc, writeBatch, serverTimestamp
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { uploadFormPdf, deleteFormPdf } from '@utils/storage';
import {
  TrashIcon, DocumentTextIcon, PlusIcon, XMarkIcon,
  LinkIcon, PencilIcon, EyeIcon,
  Squares2X2Icon, FunnelIcon, MapIcon, ChevronDownIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/solid';
import { CoverageSnapshot } from '@components/common/CoverageSnapshot';
import type { Product, Coverage, FormTemplate } from '@/types';



import { Button } from '@components/ui/Button';
import { TextInput } from '@components/ui/Input';
import MainNavigation from '@components/ui/Navigation';
import { PageContainer, PageContent } from '@components/ui/PageContainer';
import EnhancedHeader from '@components/ui/EnhancedHeader';
import { AddFormModal } from '@components/modals/AddFormModal';

import {
  Overlay, Modal, ModalHeader, ModalTitle, CloseBtn
} from '@components/ui/Table';

import styled, { keyframes } from 'styled-components';

/* ---------- styled helpers ---------- */
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;
const Spinner = styled.div`
  border: 4px solid #f3f3f3;
  border-top: 4px solid #6366f1;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: ${spin} 1s linear infinite;
  margin: 100px auto;
`;

/* Gradient pill‑button reused for “Add Form” */




/* high‑z blurred backdrop */
const OverlayFixed = styled(Overlay)`
  position: fixed !important;
  inset: 0;
  background: rgba(17,24,39,0.55);
  backdrop-filter: blur(2px);
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
`;

/* ---------- Modern Styled Components ---------- */

// Apple-inspired Filters Bar
const FiltersBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.03),
    0 2px 8px rgba(0, 0, 0, 0.04),
    0 12px 40px rgba(0, 0, 0, 0.06);
  position: relative;
  z-index: 10;
`;

const FiltersRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: stretch;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 12px;
  }
`;

const SearchInputWrapper = styled.div`
  position: relative;
  flex: 2;
  min-width: 280px;

  svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    color: #86868b;
    pointer-events: none;
    transition: color 0.2s ease;
  }

  &:focus-within svg {
    color: #0071e3;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  height: 44px;
  padding: 0 16px 0 44px;
  font-size: 15px;
  font-weight: 400;
  color: #1d1d1f;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  outline: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &::placeholder {
    color: #86868b;
  }

  &:hover {
    border-color: rgba(0, 0, 0, 0.12);
    background: white;
  }

  &:focus {
    border-color: #0071e3;
    background: white;
    box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.1);
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
  min-width: 180px;
`;

const FilterLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #86868b;
  margin-bottom: 6px;
`;

const FilterWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  position: relative;
  z-index: 20;

  select {
    height: 44px;
    padding: 0 36px 0 40px;
    font-size: 15px;
    font-weight: 400;
    color: #1d1d1f;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    appearance: none;
    -webkit-appearance: none;
    width: 100%;

    &:hover {
      border-color: rgba(0, 0, 0, 0.12);
      background: white;
    }

    &:focus {
      outline: none;
      border-color: #0071e3;
      background: white;
      box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.1);
    }
  }

  svg:first-child {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid #86868b;
    pointer-events: none;
  }
`;



const AddFormButton = styled.button`
  position: fixed;
  bottom: 32px;
  right: 32px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #8b5cf6 100%);
  background-size: 200% 100%;
  border: none;
  border-radius: 50px;
  box-shadow:
    0 8px 24px rgba(124, 58, 237, 0.35),
    0 3px 6px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
  backdrop-filter: blur(20px);
  letter-spacing: 0.01em;

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
    transform: translateY(-3px) scale(1.02);
    box-shadow:
      0 12px 32px rgba(124, 58, 237, 0.45),
      0 6px 12px rgba(0, 0, 0, 0.1);
    background-position: 100% 0;

    &::before {
      opacity: 0.5;
    }
  }

  &:active {
    transform: translateY(-1px) scale(0.98);
  }

  svg {
    width: 18px;
    height: 18px;
  }

  @media (max-width: 768px) {
    bottom: 24px;
    right: 24px;
    padding: 12px 20px;
    font-size: 14px;

    svg {
      width: 16px;
      height: 16px;
    }
  }
`;

// Forms Grid - 2 column layout
const FormsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 120px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

// Form Card - Enhanced modern design
const FormCard = styled.div`
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.9) 100%);
  border-radius: 20px;
  padding: 0;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.04),
    0 1px 3px rgba(0, 0, 0, 0.02);
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  width: 100%;
  z-index: 1;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow:
      0 20px 40px rgba(99, 102, 241, 0.12),
      0 8px 16px rgba(0, 0, 0, 0.06);
    border-color: rgba(99, 102, 241, 0.3);
    z-index: 2;

    &::before {
      opacity: 1;
    }
  }
`;

const CardInner = styled.div`
  padding: 24px;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 16px;
`;

const CardLeftSection = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex: 1;
`;

const FormIconContainer = styled.div<{ $category?: string }>`
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ $category }) => {
    switch ($category) {
      case 'Base Coverage': return 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)';
      case 'Endorsement': return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      case 'Exclusion': return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      case 'Declaration': return 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
      case 'Notice': return 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)';
      default: return 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
    }
  }};
  box-shadow: ${({ $category }) => {
    switch ($category) {
      case 'Base Coverage': return '0 8px 20px rgba(59, 130, 246, 0.3)';
      case 'Endorsement': return '0 8px 20px rgba(16, 185, 129, 0.3)';
      case 'Exclusion': return '0 8px 20px rgba(245, 158, 11, 0.3)';
      case 'Declaration': return '0 8px 20px rgba(139, 92, 246, 0.3)';
      case 'Notice': return '0 8px 20px rgba(6, 182, 212, 0.3)';
      default: return '0 8px 20px rgba(99, 102, 241, 0.3)';
    }
  }};

  svg {
    width: 26px;
    height: 26px;
    color: white;
  }
`;

const FormTitleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
`;

const CardTitle = styled.h3`
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  line-height: 1.4;
  letter-spacing: -0.02em;

  a {
    color: inherit;
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: #6366f1;
    }
  }
`;

const FormNumberInline = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colours.textSecondary};
  margin-left: 10px;
  font-family: ${({ theme }) => theme.fontMono};
  letter-spacing: 0.01em;
`;

const FormNumberBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.primary};
  background: ${({ theme }) => theme.colours.gradientSubtle};
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.15);
  letter-spacing: 0.01em;
  width: fit-content;
  font-family: ${({ theme }) => theme.fontMono};
`;

const TagsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

interface CardCategoryProps {
  $category?: string;
}

const CardCategory = styled.div<CardCategoryProps>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  width: fit-content;
  background: ${({ $category }) => {
    switch ($category) {
      case 'Base Coverage': return 'rgba(59, 130, 246, 0.1)';
      case 'Endorsement': return 'rgba(16, 185, 129, 0.1)';
      case 'Exclusion': return 'rgba(245, 158, 11, 0.1)';
      case 'Declaration': return 'rgba(139, 92, 246, 0.1)';
      case 'Notice': return 'rgba(6, 182, 212, 0.1)';
      default: return 'rgba(99, 102, 241, 0.1)';
    }
  }};
  color: ${({ $category }) => {
    switch ($category) {
      case 'Base Coverage': return '#3b82f6';
      case 'Endorsement': return '#059669';
      case 'Exclusion': return '#d97706';
      case 'Declaration': return '#7c3aed';
      case 'Notice': return '#0891b2';
      default: return '#6366f1';
    }
  }};
`;

const TypeBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(100, 116, 139, 0.08);
  color: #64748b;
`;

const CardActions = styled.div`
  display: flex;
  gap: 6px;
  opacity: 0.6;
  transition: opacity 0.2s ease;

  ${FormCard}:hover & {
    opacity: 1;
  }
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.8);
  color: #64748b;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(226, 232, 240, 0.6);

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
    transform: scale(1.05);
    border-color: rgba(99, 102, 241, 0.2);
  }

  &.danger:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.2);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

// Card Content
const CardContent = styled.div``;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 0;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
  margin-top: 4px;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;

  svg {
    width: 15px;
    height: 15px;
    opacity: 0.7;
  }

  strong {
    color: #475569;
    font-weight: 600;
  }
`;

const ExclusionsSection = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
`;

const ExclusionsSectionTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ExclusionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
`;

const ExclusionItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 13px;
`;

const ExclusionType = styled.span`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fbbf24;
  flex-shrink: 0;
`;

const ExclusionDetails = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ExclusionName = styled.div`
  font-weight: 500;
  color: #111827;
`;

const ExclusionCoverage = styled.div`
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
`;



const CardMetricsGrid = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const MetricButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.8) 100%);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(226, 232, 240, 0.8);
  font-weight: 600;

  &:hover {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%);
    color: #6366f1;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.18);
    border-color: rgba(99, 102, 241, 0.25);
  }

  svg {
    width: 16px;
    height: 16px;
    opacity: 0.75;
  }

  span {
    font-weight: 700;
    color: #6366f1;
  }
`;

const PdfButton = styled.a`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.05) 100%);
  border-radius: 12px;
  font-size: 13px;
  color: #dc2626;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(239, 68, 68, 0.15);
  font-weight: 600;
  text-decoration: none;

  &:hover {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.3);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

// Multi-Select Dropdown for States - Apple Style
const MultiSelectContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 180px;
`;

const MultiSelectTrigger = styled.button`
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 14px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  font-size: 15px;
  font-weight: 400;
  color: #1d1d1f;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;

  &:hover {
    border-color: rgba(0, 0, 0, 0.12);
    background: white;
  }

  &:focus {
    outline: none;
    border-color: #0071e3;
    background: white;
    box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.1);
  }
`;

const MultiSelectDropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  box-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.05),
    0 4px 16px rgba(0, 0, 0, 0.08),
    0 16px 48px rgba(0, 0, 0, 0.12);
  z-index: 100;
  max-height: 320px;
  overflow-y: auto;
  display: ${({ $isOpen }) => ($isOpen ? 'block' : 'none')};
`;

const MultiSelectHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
`;

const MultiSelectActions = styled.div`
  display: flex;
  gap: 4px;
`;

const MultiSelectActionBtn = styled.button`
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 500;
  color: #0071e3;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(0, 113, 227, 0.08);
  }

  &:active {
    background: rgba(0, 113, 227, 0.12);
  }
`;

const MultiSelectOption = styled.label<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  font-size: 14px;
  color: #1d1d1f;
  cursor: pointer;
  transition: background 0.15s ease;
  background: ${({ $selected }) => ($selected ? 'rgba(0, 113, 227, 0.06)' : 'transparent')};

  &:hover {
    background: ${({ $selected }) => ($selected ? 'rgba(0, 113, 227, 0.1)' : 'rgba(0, 0, 0, 0.03)')};
  }

  &:last-child {
    border-radius: 0 0 14px 14px;
  }
`;

const MultiSelectCheckbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: #0071e3;
  cursor: pointer;
  border-radius: 4px;
`;

const SelectedCount = styled.span`
  background: linear-gradient(135deg, #0071e3, #00a2ff);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 6px;
  box-shadow: 0 1px 3px rgba(0, 113, 227, 0.3);
`;

// Empty State
const EmptyState = styled.div`
  text-align: center;
  padding: 80px 20px;
  color: #64748b;
`;

const EmptyStateTitle = styled.h3`
  font-size: 24px;
  font-weight: 600;
  color: #475569;
  margin: 0 0 12px 0;
`;

const EmptyStateText = styled.p`
  font-size: 16px;
  color: #64748b;
  margin: 0 0 24px 0;
`;

// View Modal Styles
const ViewModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ViewModalSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ViewModalLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ViewModalValue = styled.span`
  font-size: 15px;
  font-weight: 500;
  color: ${({ theme }) => theme.colours.text};
`;

const ViewModalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
`;

const ViewModalPdfLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: ${({ theme }) => theme.colours.gradientSubtle};
  color: ${({ theme }) => theme.colours.primary};
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
  width: fit-content;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    background: ${({ theme }) => theme.colours.primary};
    color: white;
  }
`;

const ViewModalTagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ViewModalTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: ${({ theme }) => theme.colours.backgroundSubtle};
  color: ${({ theme }) => theme.colours.textSecondary};
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
`;

/* ---------- component ---------- */
export default function FormsScreen() {
  const { productId } = useParams();
  const location = useLocation();
  const { coverageId } = location.state || {};


  /* data state */
  // Extended form type with runtime data
  type ExtendedForm = Omit<FormTemplate, 'downloadUrl'> & {
    downloadUrl?: string | null;
    productIds: string[];
    coverageIds: string[];
  };

  // Extended coverage with productId
  type ExtendedCoverage = Coverage & {
    productId: string;
  };

  const [forms, setForms] = useState<ExtendedForm[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [coverages, setCoverages] = useState<ExtendedCoverage[]>([]);
  const [coverageExclusions, setCoverageExclusions] = useState<Record<string, string[]>>({}); // Map of coverageId -> exclusions array

  /* coverage snapshot state - for when viewing forms for a specific coverage */
  const [selectedCoverageData, setSelectedCoverageData] = useState<Coverage | null>(null);
  const [parentCoverageData, setParentCoverageData] = useState<Coverage | null>(null);
  const [coverageRulesCount, setCoverageRulesCount] = useState(0);

  // --- filter/search state for modals
  const [coverageSearch, setCoverageSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  /* search state (debounced) */
  const [rawSearch, setRawSearch] = useState('');
  const searchQuery = useDebounce(rawSearch, 250);
  const searchRef = useRef<HTMLInputElement | null>(null);

  /* filter state */
  const [selectedCoverage, setSelectedCoverage] = useState<string | null>(null);
  const [selectedFilterStates, setSelectedFilterStates] = useState<string[]>([]);
  const [statesDropdownOpen, setStatesDropdownOpen] = useState(false);
  const statesDropdownRef = useRef<HTMLDivElement>(null);

  /* ui state */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* add‑form modal */
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [type, setType] = useState('ISO');
  const [category, setCategory] = useState('Base Coverage Form');
  const [selectedProduct, setSelectedProduct] = useState(productId || '');
  const [selectedCoverages, setSelectedCoverages] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);

  /* link‑coverage modal */
  const [linkCoverageModalOpen, setLinkCoverageModalOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<ExtendedForm | null>(null);
  const [linkCoverageIds, setLinkCoverageIds] = useState<string[]>([]);

  /* link‑product modal */
  const [linkProductModalOpen, setLinkProductModalOpen] = useState(false);
  const [linkProductIds, setLinkProductIds] = useState<string[]>([]);

  /* states modal */
  const [statesModalOpen, setStatesModalOpen] = useState(false);
  const [selectedFormForStates, setSelectedFormForStates] = useState<ExtendedForm | null>(null);
  const [formStates, setFormStates] = useState<string[]>([]);

  /* view modal (read-only form details) */
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingForm, setViewingForm] = useState<ExtendedForm | null>(null);

  /* version sidebar */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [changeSummary, setChangeSummary] = useState('');

  // Export/Import states







  /* ---------- computed values ---------- */
  const allStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

  // Filter options for dropdowns
  const coverageOptions = [
    { value: null, label: 'All Coverages' },
    ...coverages.map(c => ({ value: c.name, label: c.name }))
  ].sort((a, b) => a.label.localeCompare(b.label));

  const stateOptions = [
    { value: null, label: 'All States' },
    ...allStates.map(state => ({ value: state, label: state }))
  ];

  /* ---------- side‑effects ---------- */

  /* `/` shortcut to focus */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target as HTMLElement).matches('input,textarea,select')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* fetch data */
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        /* products */
        const pSnap = await getDocs(collection(db, 'products'));
        const productList = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
        productList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setProducts(productList);

        /* coverages */
        let coverageList: ExtendedCoverage[] = [];
        if (productId) {
          const cSnap = await getDocs(collection(db, `products/${productId}/coverages`));
          coverageList = cSnap.docs.map(d => ({ id: d.id, ...d.data(), productId } as ExtendedCoverage));
        } else {
          for (const product of productList) {
            const cSnap = await getDocs(collection(db, `products/${product.id}/coverages`));
            coverageList = [
              ...coverageList,
              ...cSnap.docs.map(d => ({ id: d.id, ...d.data(), productId: product.id } as ExtendedCoverage))
            ];
          }
        }
        coverageList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setCoverages(coverageList);

        /* Load exclusions for each coverage */
        const exclusionsMap: Record<string, string[]> = {};
        for (const coverage of coverageList) {
          if (coverage.exclusions && coverage.exclusions.length > 0) {
            exclusionsMap[coverage.id] = coverage.exclusions;
          }
        }
        setCoverageExclusions(exclusionsMap);

        /* forms */
        const fSnap = await getDocs(collection(db, 'forms'));

        // Fetch all form-coverage links
        const linksSnap = await getDocs(collection(db, 'formCoverages'));
        const coveragesByForm: Record<string, string[]> = {};
        linksSnap.docs.forEach(docSnap => {
          const { formId, coverageId } = docSnap.data() as { formId: string; coverageId: string };
          if (!coveragesByForm[formId]) {
            coveragesByForm[formId] = [];
          }
          coveragesByForm[formId].push(coverageId);
        });

        const formList: ExtendedForm[] = await Promise.all(
          fSnap.docs.map(async d => {
            const data = d.data();
            let url: string | null = null;
            if (data.filePath) {
              try { url = await getDownloadURL(ref(storage, data.filePath)); } catch { /* ignore */ }
            }
            return {
              ...data,
              id: d.id,
              formNumber: data.formNumber || '',
              downloadUrl: url,
              productIds: data.productIds || (data.productId ? [data.productId] : []),
              coverageIds: coveragesByForm[d.id] || []
            } as ExtendedForm;
          })
        );
        setForms(formList);
      } catch (err) {
        console.error(err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [productId]);

  /* Close states dropdown when clicking outside */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statesDropdownRef.current && !statesDropdownRef.current.contains(event.target as Node)) {
        setStatesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* Fetch coverage snapshot data when viewing forms for a specific coverage */
  useEffect(() => {
    const fetchCoverageSnapshot = async () => {
      if (!productId || !coverageId) {
        setSelectedCoverageData(null);
        setParentCoverageData(null);
        return;
      }

      try {
        // Fetch the coverage
        const coverageRef = doc(db, `products/${productId}/coverages`, coverageId);
        const coverageSnap = await getDoc(coverageRef);
        if (coverageSnap.exists()) {
          const coverageData = { id: coverageSnap.id, ...coverageSnap.data() } as Coverage;
          setSelectedCoverageData(coverageData);

          // Fetch parent coverage if exists
          if (coverageData.parentCoverageId) {
            const parentRef = doc(db, `products/${productId}/coverages`, coverageData.parentCoverageId);
            const parentSnap = await getDoc(parentRef);
            if (parentSnap.exists()) {
              setParentCoverageData({ id: parentSnap.id, ...parentSnap.data() } as Coverage);
            }
          }

          // Fetch rules count for this coverage
          const rulesSnap = await getDocs(collection(db, `products/${productId}/coverages/${coverageId}/rules`));
          setCoverageRulesCount(rulesSnap.size);
        }
      } catch (err) {
        console.error('Error fetching coverage snapshot data:', err);
      }
    };
    fetchCoverageSnapshot();
  }, [productId, coverageId]);

  /* maps */
  const productMap = useMemo(() =>
    Object.fromEntries(products.map(p => [p.id, p.name])), [products]);

  const coverageMap = useMemo(() =>
    Object.fromEntries(coverages.map(c => [c.id, c.name])), [coverages]);

  /* Get exclusions for a form based on its linked coverages */
  const getFormExclusions = useMemo(() => {
    const formExclusionsMap: Record<string, Array<{ exclusionText: string; coverageName: string }>> = {};
    forms.forEach(form => {
      const exclusions: Array<{ exclusionText: string; coverageName: string }> = [];
      if (form.coverageIds && form.coverageIds.length > 0) {
        form.coverageIds.forEach((covId: string) => {
          if (coverageExclusions[covId]) {
            coverageExclusions[covId].forEach((exclusion: string) => {
              exclusions.push({
                exclusionText: exclusion,
                coverageName: coverageMap[covId] || 'Unknown Coverage'
              });
            });
          }
        });
      }
      formExclusionsMap[form.id] = exclusions;
    });
    return formExclusionsMap;
  }, [forms, coverageExclusions, coverageMap]);

  /* filtered forms – memoised */
  const filteredForms = useMemo(() => {
    return forms.filter(f => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (f.formName || '').toLowerCase().includes(q) ||
        f.formNumber.toLowerCase().includes(q) ||
        (f.category || '').toLowerCase().includes(q) ||
        (f.type || '').toLowerCase().includes(q);

      const matchesProduct = productId ? (f.productIds || []).includes(productId) : true;

      // Apply coverage filter
      const matchesCoverage = selectedCoverage ?
        f.coverageIds && f.coverageIds.some(covId => {
          const coverage = coverages.find(c => c.id === covId);
          return coverage && coverage.name === selectedCoverage;
        }) : true;

      // Apply states filter
      const matchesStates = selectedFilterStates.length > 0 ?
        (f.states && selectedFilterStates.every(state => f.states?.includes(state))) : true;

      return matchesSearch && matchesProduct && matchesCoverage && matchesStates;
    });
  }, [forms, searchQuery, productId, selectedCoverage, selectedFilterStates, coverages]);

  /* ---------- handlers (add, delete, link) ---------- */
  // open the modal pre‑filled for editing an existing form
  const openEditModal = (formObj: ExtendedForm) => {
    setFormName(formObj.formName || '');
    setFormNumber(formObj.formNumber);
    setEffectiveDate(typeof formObj.effectiveDate === 'string' ? formObj.effectiveDate : '');
    setType(formObj.type || 'ISO');
    setCategory(formObj.category || 'Base Coverage Form');
    setSelectedProduct(formObj.productIds?.[0] || formObj.productId || '');
    setSelectedCoverages(formObj.coverageIds || []);
    setSelectedStates(formObj.states || []);
    setFile(null);            // user can (re)upload if desired
    setEditingId(formObj.id);
    setChangeSummary('');
    setShowModal(true);
  };
  const openLinkProductModal = (form: ExtendedForm) => {
    setSelectedForm(form);
    setLinkProductIds(form.productIds || (form.productId ? [form.productId] : []));
    setLinkProductModalOpen(true);
  };

  const handleLinkProducts = async () => {
    if (!selectedForm) return;
    try {
      const formId = selectedForm.id;
      await updateDoc(doc(db, 'forms', formId), {
        productIds: linkProductIds,
        /* keep legacy single‑ID field for older code paths */
        productId: linkProductIds[0] || null
      });
      setForms(fs => fs.map(f =>
        f.id === formId ? { ...f, productIds: linkProductIds } : f
      ));
      setLinkProductModalOpen(false);
      setSelectedForm(null);
      setLinkProductIds([]);
    } catch (err) {
      console.error(err);
      alert('Failed to link products.');
    }
  };
  const handleSaveForm = async () => {
    if (!formNumber || !effectiveDate) {
      alert('Form Number and Effective Date are required.');
      return;
    }
    if (editingId && changeSummary.trim().length < 10) {
      alert('Please provide a reason for the change (at least 10 characters).');
      return;
    }
    // Use productId from URL if available, otherwise use selectedProduct
    const effectiveProductId = productId || selectedProduct || '';
    try {
      const basePayload = {
        formName: formName || null,
        formNumber,
        formEditionDate: effectiveDate,
        effectiveDate,
        type,
        category,
        productIds: effectiveProductId ? [effectiveProductId] : [],
        productId: effectiveProductId || null,
        states: selectedStates
      };
      let filePath = null;
      let downloadUrl = null;
      if (file) {
        const uploadResult = await uploadFormPdf(file, effectiveProductId || 'general');
        filePath = uploadResult.filePath;
        downloadUrl = uploadResult.downloadUrl;
      }
      const payload = {
        ...basePayload,
        ...(filePath && { filePath, downloadUrl })
      };
      let formId;
      if (editingId) {
        await updateDoc(doc(db, 'forms', editingId), payload);
        formId = editingId;
      } else {
        const docRef = await addDoc(collection(db, 'forms'), {
          ...payload,
          filePath,
          downloadUrl,
          createdAt: serverTimestamp()
        });
        formId = docRef.id;
      }

      // Link to coverages via junction table only (no array writes)
      const batch = writeBatch(db);

      // Delete old links for this form
      const existingLinksSnap = await getDocs(
        query(collection(db, 'formCoverages'), where('formId', '==', formId))
      );
      existingLinksSnap.docs.forEach(linkDoc => {
        batch.delete(linkDoc.ref);
      });

      // Add new links
      selectedCoverages.forEach(coverageId => {
        const newRef = doc(collection(db, 'formCoverages'));
        batch.set(newRef, {
          formId,
          coverageId,
          productId: effectiveProductId || null,
          createdAt: serverTimestamp()
        });
      });

      await batch.commit();

      // reset ui
      setFormName('');
      setFormNumber('');
      setEffectiveDate('');
      setType('ISO');
      setCategory('Base Coverage Form');
      setSelectedProduct(productId || '');
      setSelectedCoverages([]);
      setSelectedStates([]);
      setFile(null);
      setEditingId(null);
      setChangeSummary('');
      setShowModal(false);

      // refresh forms list
      const snap = await getDocs(collection(db, 'forms'));
      const formList: ExtendedForm[] = snap.docs.map(d => ({
        ...d.data(),
        id: d.id,
        formNumber: d.data().formNumber || '',
        productIds: d.data().productIds || [],
        coverageIds: []
      } as ExtendedForm));
      setForms(formList);
    } catch (err) {
      console.error(err);
      alert('Failed to save form.');
    }
  };

  // New handler for AddFormModal
  const handleNewModalSave = async (formData: {
    formName: string;
    formNumber: string;
    effectiveDate: string;
    type: string;
    category: string;
    selectedCoverages: string[];
    selectedStates: string[];
    file: File | null;
    changeSummary?: string;
  }) => {
    // Use productId from URL if available
    const effectiveProductId = productId || '';

    const basePayload = {
      formName: formData.formName || null,
      formNumber: formData.formNumber,
      formEditionDate: formData.effectiveDate,
      effectiveDate: formData.effectiveDate,
      type: formData.type,
      category: formData.category,
      productIds: effectiveProductId ? [effectiveProductId] : [],
      productId: effectiveProductId || null,
      states: formData.selectedStates
    };

    let filePath = null;
    let downloadUrl = null;
    if (formData.file) {
      const uploadResult = await uploadFormPdf(formData.file, effectiveProductId || 'general');
      filePath = uploadResult.filePath;
      downloadUrl = uploadResult.downloadUrl;
    }

    const payload = {
      ...basePayload,
      ...(filePath && { filePath, downloadUrl })
    };

    let formId;
    if (editingId) {
      await updateDoc(doc(db, 'forms', editingId), payload);
      formId = editingId;
    } else {
      const docRef = await addDoc(collection(db, 'forms'), {
        ...payload,
        filePath,
        downloadUrl,
        createdAt: serverTimestamp()
      });
      formId = docRef.id;
    }

    // Link to coverages via junction table
    const batch = writeBatch(db);

    // Delete old links for this form
    const existingLinksSnap = await getDocs(
      query(collection(db, 'formCoverages'), where('formId', '==', formId))
    );
    existingLinksSnap.docs.forEach(linkDoc => {
      batch.delete(linkDoc.ref);
    });

    // Add new links
    formData.selectedCoverages.forEach(coverageId => {
      const newRef = doc(collection(db, 'formCoverages'));
      batch.set(newRef, {
        formId,
        coverageId,
        productId: effectiveProductId || null,
        createdAt: serverTimestamp()
      });
    });

    await batch.commit();

    // Reset and close
    setEditingId(null);
    setShowModal(false);

    // Refresh forms list
    const snap = await getDocs(collection(db, 'forms'));

    // Fetch all form-coverage links for the refresh
    const linksSnap = await getDocs(collection(db, 'formCoverages'));
    const coveragesByForm: Record<string, string[]> = {};
    linksSnap.docs.forEach(docSnap => {
      const { formId: fId, coverageId: cId } = docSnap.data() as { formId: string; coverageId: string };
      if (!coveragesByForm[fId]) coveragesByForm[fId] = [];
      coveragesByForm[fId].push(cId);
    });

    const formList: ExtendedForm[] = await Promise.all(
      snap.docs.map(async d => {
        const data = d.data();
        let url: string | null = null;
        if (data.filePath) {
          try { url = await getDownloadURL(ref(storage, data.filePath)); } catch { /* ignore */ }
        }
        return {
          ...data,
          id: d.id,
          formNumber: data.formNumber || '',
          downloadUrl: url,
          productIds: data.productIds || (data.productId ? [data.productId] : []),
          coverageIds: coveragesByForm[d.id] || []
        } as ExtendedForm;
      })
    );
    setForms(formList);
  };

  // Open new modal for editing
  const openEditModalNew = (formObj: ExtendedForm) => {
    setEditingId(formObj.id);
    setShowModal(true);
  };

  // Get the editing form data for the new modal
  const getEditingFormData = () => {
    if (!editingId) return null;
    const form = forms.find(f => f.id === editingId);
    if (!form) return null;
    return {
      id: form.id,
      formName: form.formName,
      formNumber: form.formNumber,
      effectiveDate: typeof form.effectiveDate === 'string' ? form.effectiveDate : '',
      type: form.type,
      category: form.category,
      coverageIds: form.coverageIds,
      states: form.states,
    };
  };

  const handleDeleteForm = async (id: string) => {
    if (!window.confirm('Delete this form?')) return;
    try {
      const formDoc = forms.find(f => f.id === id);
      if (formDoc) {
        // Delete PDF file if it exists
        if (formDoc.filePath) {
          try {
            await deleteFormPdf(formDoc.filePath);
          } catch (err) {
            console.warn('Failed to delete PDF file:', err);
          }
        }

        // Delete junction table links only (no array writes to coverages)
        const linksSnap = await getDocs(
          query(collection(db, 'formCoverages'), where('formId', '==', id))
        );
        const batch = writeBatch(db);
        linksSnap.docs.forEach(linkDoc => {
          batch.delete(linkDoc.ref);
        });
        await batch.commit();
      }
      await deleteDoc(doc(db, 'forms', id));
      setForms(forms.filter(f => f.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete form.');
    }
  };

  const openLinkCoverageModal = (form: ExtendedForm) => {
    setSelectedForm(form);
    setLinkCoverageIds(form.coverageIds || []);
    setLinkCoverageModalOpen(true);
  };

  const openStatesModal = (form: ExtendedForm) => {
    setSelectedFormForStates(form);
    setFormStates(form.states || []);
    setStatesModalOpen(true);
  };

  const handleLinkCoverage = async () => {
    if (!selectedForm) return;
    // map coverageId -> owning productId for quick look‑up
    const covIdToProductId = Object.fromEntries(coverages.map(c => [c.id, c.productId]));
    try {
      const formId = selectedForm.id;
      const batch = writeBatch(db);

      // Delete old links for this form
      const existingLinksSnap = await getDocs(
        query(collection(db, 'formCoverages'), where('formId', '==', formId))
      );
      existingLinksSnap.docs.forEach(linkDoc => {
        batch.delete(linkDoc.ref);
      });

      // Add new links (junction table only - single source of truth)
      linkCoverageIds.forEach(coverageId => {
        const owningProductId = covIdToProductId[coverageId];
        if (!owningProductId) return; // safety: skip if we can't resolve product
        const newRef = doc(collection(db, 'formCoverages'));
        batch.set(newRef, {
          formId,
          coverageId,
          productId: owningProductId,
          createdAt: serverTimestamp()
        });
      });

      await batch.commit();
      setLinkCoverageModalOpen(false);
      setSelectedForm(null);
      setLinkCoverageIds([]);
    } catch (err) {
      console.error(err);
      alert('Failed to link coverages to form.');
    }
  };

  const handleSaveStates = async () => {
    if (!selectedFormForStates) return;
    try {
      await updateDoc(doc(db, 'forms', selectedFormForStates.id), {
        states: formStates
      });
      setForms(fs => fs.map(f =>
        f.id === selectedFormForStates.id ? { ...f, states: formStates } : f
      ));
      setStatesModalOpen(false);
      setSelectedFormForStates(null);
      setFormStates([]);
    } catch (err) {
      console.error(err);
      alert('Failed to save states.');
    }
  };



  /* ---------- render ---------- */
  if (loading) {
    return (
      <PageContainer>
        <MainNavigation />
        <PageContent><Spinner /></PageContent>
      </PageContainer>
    );
  }
  if (error) {
    return (
      <PageContainer>
        <MainNavigation />
        <PageContent>{error}</PageContent>
      </PageContainer>
    );
  }

  const title =
    coverageId && coverageMap[coverageId]
      ? `Forms for ${coverageMap[coverageId]}`
      : productId && productMap[productId]
        ? `Forms for ${productMap[productId]}`
        : 'Forms';

  return (
    <PageContainer>
      <MainNavigation />
      <PageContent>
        <EnhancedHeader
          title={title}
          subtitle={`Manage ${filteredForms.length} Form${filteredForms.length !== 1 ? 's' : ''}`}
          icon={DocumentTextIcon}
          showBackButton
          onBackClick={() => window.history.back()}
        />

        {/* Coverage Context Snapshot - show when viewing forms for a specific coverage */}
        {coverageId && productId && selectedCoverageData && (
          <div style={{ marginBottom: 24 }}>
            <CoverageSnapshot
              name={selectedCoverageData.name}
              coverageCode={selectedCoverageData.coverageCode}
              isOptional={selectedCoverageData.isOptional}
              productName={productMap[productId]}
              parentCoverageName={parentCoverageData?.name}
              statesCount={(selectedCoverageData.states ?? []).length}
              formsCount={filteredForms.length}
              rulesCount={coverageRulesCount}
              valuationLabel={selectedCoverageData.valuationMethod as string | undefined}
              waitingPeriodLabel={selectedCoverageData.waitingPeriod != null ? String(selectedCoverageData.waitingPeriod) : undefined}
            />
          </div>
        )}

        {/* Apple-inspired Filters Bar */}
        <FiltersBar>
          {/* Search Row */}
          <SearchInputWrapper>
            <MagnifyingGlassIcon />
            <SearchInput
              type="text"
              placeholder="Search forms by name, number, or category..."
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
            />
          </SearchInputWrapper>

          {/* Filters Row */}
          <FiltersRow>
            <FormGroup>
              <FilterLabel>Coverage</FilterLabel>
              <FilterWrapper>
                <FunnelIcon width={16} height={16} style={{ color: '#86868b' }} />
                <select
                  value={selectedCoverage ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCoverage(e.target.value || null)}
                >
                  <option value="">All Coverages</option>
                  {coverageOptions.map(o => (
                    <option key={o.value ?? 'all'} value={o.value ?? ''}>{o.label}</option>
                  ))}
                </select>
              </FilterWrapper>
            </FormGroup>

            <FormGroup>
              <FilterLabel>States</FilterLabel>
              <MultiSelectContainer ref={statesDropdownRef}>
                <MultiSelectTrigger
                  type="button"
                  onClick={() => setStatesDropdownOpen(!statesDropdownOpen)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapIcon width={16} height={16} style={{ color: '#86868b' }} />
                    <span>
                      {selectedFilterStates.length === 0
                        ? 'All States'
                        : selectedFilterStates.length === allStates.length
                          ? 'All States'
                          : `${selectedFilterStates.length} selected`}
                    </span>
                    {selectedFilterStates.length > 0 && selectedFilterStates.length < allStates.length && (
                      <SelectedCount>{selectedFilterStates.length}</SelectedCount>
                    )}
                  </div>
                  <ChevronDownIcon width={14} height={14} style={{ color: '#86868b', transform: statesDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }} />
                </MultiSelectTrigger>
                <MultiSelectDropdown $isOpen={statesDropdownOpen}>
                  <MultiSelectHeader>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#86868b' }}>
                      {selectedFilterStates.length} of {allStates.length} selected
                    </span>
                    <MultiSelectActions>
                      <MultiSelectActionBtn
                        type="button"
                        onClick={() => setSelectedFilterStates([...allStates])}
                      >
                        Select All
                      </MultiSelectActionBtn>
                      <MultiSelectActionBtn
                        type="button"
                        onClick={() => setSelectedFilterStates([])}
                      >
                        Clear
                      </MultiSelectActionBtn>
                    </MultiSelectActions>
                  </MultiSelectHeader>
                  {allStates.map(state => (
                    <MultiSelectOption
                      key={state}
                      $selected={selectedFilterStates.includes(state)}
                    >
                      <MultiSelectCheckbox
                        type="checkbox"
                        checked={selectedFilterStates.includes(state)}
                        onChange={() => {
                          setSelectedFilterStates(prev =>
                            prev.includes(state)
                              ? prev.filter(s => s !== state)
                              : [...prev, state]
                          );
                        }}
                      />
                      {state}
                    </MultiSelectOption>
                  ))}
                </MultiSelectDropdown>
              </MultiSelectContainer>
            </FormGroup>
          </FiltersRow>
        </FiltersBar>

        {/* Forms Display */}
        {filteredForms.length ? (
          <FormsGrid>
            {filteredForms.map(f => (
                <FormCard key={f.id}>
                  <CardInner>
                    <CardHeader>
                      <CardLeftSection>
                        <FormIconContainer $category={f.category}>
                          <DocumentTextIcon />
                        </FormIconContainer>
                        <FormTitleSection>
                          <CardTitle>
                            {f.downloadUrl ? (
                              <a href={f.downloadUrl} target="_blank" rel="noopener noreferrer">
                                {(f.formName || f.formNumber || 'Unnamed Form').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                              </a>
                            ) : (
                              (f.formName || f.formNumber || 'Unnamed Form').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
                            )}
                          </CardTitle>
                          <CardCategory $category={f.category}>{f.category || 'Other'}</CardCategory>
                        </FormTitleSection>
                      </CardLeftSection>
                      <CardActions>
                        <IconButton onClick={() => { setViewingForm(f); setViewModalOpen(true); }} title="View Details">
                          <EyeIcon />
                        </IconButton>
                        <IconButton onClick={() => openEditModalNew(f)} title="Edit">
                          <PencilIcon />
                        </IconButton>
                        <IconButton className="danger" onClick={() => handleDeleteForm(f.id)} title="Delete">
                          <TrashIcon />
                        </IconButton>
                      </CardActions>
                    </CardHeader>

                    <CardContent>
                      <CardMetricsGrid>
                        <MetricButton onClick={() => openLinkProductModal(f)}>
                          <Squares2X2Icon />
                          Products <span>({f.productIds?.length || 0})</span>
                        </MetricButton>
                        <MetricButton onClick={() => openLinkCoverageModal(f)}>
                          <LinkIcon />
                          Coverages <span>({f.coverageIds?.length || 0})</span>
                        </MetricButton>
                        <MetricButton onClick={() => openStatesModal(f)}>
                          <MapIcon />
                          States <span>({f.states?.length || 0})</span>
                        </MetricButton>
                      </CardMetricsGrid>
                    </CardContent>
                  </CardInner>
                </FormCard>
              ))}
          </FormsGrid>
        ) : (
          <EmptyState>
            <EmptyStateTitle>No forms found</EmptyStateTitle>
            <EmptyStateText>
              {searchQuery ? 'Try adjusting your search terms' : 'Get started by adding your first form'}
            </EmptyStateText>
          </EmptyState>
        )}

        {/* Add Form Button */}
        <AddFormButton onClick={() => { setEditingId(null); setShowModal(true); }}>
          <PlusIcon />
          Add Form
        </AddFormButton>

        {/* ---------- Add Form Modal (Apple-inspired) ---------- */}
        <AddFormModal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setEditingId(null); }}
          onSave={handleNewModalSave}
          coverages={coverages.filter(c => !productId || c.productId === productId)}
          productId={productId}
          editingForm={getEditingFormData()}
        />

        {/* Link Coverage Modal */}
        {linkCoverageModalOpen && (
          <OverlayFixed onClick={() => setLinkCoverageModalOpen(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Link Form to Coverages</ModalTitle>
                <CloseBtn onClick={() => setLinkCoverageModalOpen(false)}>✕</CloseBtn>
              </ModalHeader>
              <p style={{ margin:'8px 0 12px' }}>
                Form:&nbsp;<strong>{selectedForm ? (selectedForm.formName || selectedForm.formNumber || 'Unnamed Form') : 'Unnamed Form'}</strong>
              </p>
              <div style={{ marginBottom: 8 }}>
                <TextInput
                  placeholder="Search coverages..."
                  value={coverageSearch}
                  onChange={e => setCoverageSearch(e.target.value)}
                />
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                <Button variant="ghost" onClick={() => setLinkCoverageIds(
                  coverages
                    .filter(c => (!productId || c.productId === selectedForm?.productId))
                    .filter(c => c.name.toLowerCase().includes(coverageSearch.toLowerCase()))
                    .map(c => c.id)
                )}>Select All</Button>
                <Button variant="ghost" onClick={() => setLinkCoverageIds([])}>Clear All</Button>
              </div>
              <div style={{ maxHeight:220, overflowY:'auto', border:'1px solid #E5E7EB', borderRadius:4, padding:8 }}>
                {coverages
                  .filter(c => (!productId || c.productId === selectedForm?.productId))
                  .filter(c => c.name.toLowerCase().includes(coverageSearch.toLowerCase()))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(c => (
                    <label key={c.id} style={{ display:'block', padding:4 }}>
                      <input
                        type="checkbox"
                        value={c.id}
                        checked={linkCoverageIds.includes(c.id)}
                        onChange={e => {
                          const val = e.target.value;
                          setLinkCoverageIds(prev =>
                            prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
                          );
                        }}
                      />{' '}
                      {c.name}
                    </label>
                ))}
              </div>
              <div style={{ marginTop:16, display:'flex', gap:12 }}>
                <Button onClick={handleLinkCoverage}>Save</Button>
                <Button variant="ghost" onClick={() => setLinkCoverageModalOpen(false)}>Cancel</Button>
              </div>
            </Modal>
          </OverlayFixed>
        )}

        {/* Link Products Modal */}
        {linkProductModalOpen && (
          <OverlayFixed onClick={() => setLinkProductModalOpen(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Link Form to Products</ModalTitle>
                <CloseBtn onClick={() => setLinkProductModalOpen(false)}>✕</CloseBtn>
              </ModalHeader>

              <p style={{ margin:'8px 0 12px' }}>
                Form:&nbsp;<strong>{selectedForm ? (selectedForm.formName || selectedForm.formNumber || 'Unnamed Form') : 'Unnamed Form'}</strong>
              </p>

              <div style={{ marginBottom: 8 }}>
                <TextInput
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                />
              </div>

              <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                <Button variant="ghost" onClick={() => setLinkProductIds(
                  products
                    .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                    .map(p => p.id)
                )}>Select All</Button>
                <Button variant="ghost" onClick={() => setLinkProductIds([])}>Clear All</Button>
              </div>

              <div style={{ maxHeight:220, overflowY:'auto', border:'1px solid #E5E7EB', borderRadius:4, padding:8 }}>
                {products
                  .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(p => (
                    <label key={p.id} style={{ display:'block', padding:4 }}>
                      <input
                        type="checkbox"
                        value={p.id}
                        checked={linkProductIds.includes(p.id)}
                        onChange={e => {
                          const val = e.target.value;
                          setLinkProductIds(prev =>
                            prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
                          );
                        }}
                      />{' '}
                      {p.name}
                    </label>
                ))}
              </div>

              <div style={{ marginTop:16, display:'flex', gap:12 }}>
                <Button onClick={handleLinkProducts}>Save</Button>
                <Button variant="ghost" onClick={() => setLinkProductModalOpen(false)}>Cancel</Button>
              </div>
            </Modal>
          </OverlayFixed>
        )}

        {/* States Modal */}
        {statesModalOpen && (
          <OverlayFixed onClick={() => setStatesModalOpen(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Manage States for {selectedFormForStates?.formName || selectedFormForStates?.formNumber}</ModalTitle>
                <CloseBtn onClick={() => setStatesModalOpen(false)}>✕</CloseBtn>
              </ModalHeader>

              <p style={{ margin:'8px 0 12px' }}>
                Form:&nbsp;<strong>{selectedFormForStates?.formName || selectedFormForStates?.formNumber}</strong>
              </p>

              <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                <Button variant="ghost" onClick={() => setFormStates(['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'])}>
                  Select All (50)
                </Button>
                <Button variant="ghost" onClick={() => setFormStates([])}>Clear All</Button>
                <span style={{ fontSize: '14px', color: '#6b7280', marginLeft: 'auto' }}>
                  {formStates.length} selected
                </span>
              </div>

              <div style={{ maxHeight:220, overflowY:'auto', border:'1px solid #E5E7EB', borderRadius:4, padding:8 }}>
                {['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(state => (
                  <label key={state} style={{ display:'block', padding:4 }}>
                    <input
                      type="checkbox"
                      value={state}
                      checked={formStates.includes(state)}
                      onChange={e => {
                        const val = e.target.value;
                        setFormStates(prev =>
                          prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
                        );
                      }}
                    />{' '}
                    {state}
                  </label>
                ))}
              </div>

              <div style={{ marginTop:16, display:'flex', gap:12 }}>
                <Button onClick={handleSaveStates}>Save</Button>
                <Button variant="ghost" onClick={() => setStatesModalOpen(false)}>Cancel</Button>
              </div>
            </Modal>
          </OverlayFixed>
        )}

        {/* View Form Details Modal */}
        {viewModalOpen && viewingForm && (
          <OverlayFixed onClick={() => setViewModalOpen(false)}>
            <Modal onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
              <ModalHeader>
                <ModalTitle>Form Details</ModalTitle>
                <CloseBtn onClick={() => setViewModalOpen(false)}>✕</CloseBtn>
              </ModalHeader>

              <ViewModalContent>
                <ViewModalSection>
                  <ViewModalLabel>Form Name</ViewModalLabel>
                  <ViewModalValue>
                    {(viewingForm.formName || 'Unnamed Form').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                  </ViewModalValue>
                </ViewModalSection>

                <ViewModalGrid>
                  <ViewModalSection>
                    <ViewModalLabel>Form Number</ViewModalLabel>
                    <ViewModalValue>{viewingForm.formNumber || '—'}</ViewModalValue>
                  </ViewModalSection>
                  <ViewModalSection>
                    <ViewModalLabel>Edition Date</ViewModalLabel>
                    <ViewModalValue>
                      {typeof viewingForm.effectiveDate === 'string' && viewingForm.effectiveDate
                        ? viewingForm.effectiveDate
                        : '—'}
                    </ViewModalValue>
                  </ViewModalSection>
                </ViewModalGrid>

                <ViewModalGrid>
                  <ViewModalSection>
                    <ViewModalLabel>Type</ViewModalLabel>
                    <ViewModalValue>{viewingForm.type || 'ISO'}</ViewModalValue>
                  </ViewModalSection>
                  <ViewModalSection>
                    <ViewModalLabel>Category</ViewModalLabel>
                    <ViewModalValue>{viewingForm.category || 'Other'}</ViewModalValue>
                  </ViewModalSection>
                </ViewModalGrid>

                <ViewModalSection>
                  <ViewModalLabel>Linked Products ({viewingForm.productIds?.length || 0})</ViewModalLabel>
                  <ViewModalTagsContainer>
                    {viewingForm.productIds && viewingForm.productIds.length > 0 ? (
                      viewingForm.productIds.map(pid => {
                        const product = products.find(p => p.id === pid);
                        return (
                          <ViewModalTag key={pid}>{product?.name || pid}</ViewModalTag>
                        );
                      })
                    ) : (
                      <ViewModalValue style={{ color: '#94a3b8' }}>No products linked</ViewModalValue>
                    )}
                  </ViewModalTagsContainer>
                </ViewModalSection>

                <ViewModalSection>
                  <ViewModalLabel>Linked Coverages ({viewingForm.coverageIds?.length || 0})</ViewModalLabel>
                  <ViewModalTagsContainer>
                    {viewingForm.coverageIds && viewingForm.coverageIds.length > 0 ? (
                      viewingForm.coverageIds.map(cid => {
                        const coverage = coverages.find(c => c.id === cid);
                        return (
                          <ViewModalTag key={cid}>{coverage?.name || cid}</ViewModalTag>
                        );
                      })
                    ) : (
                      <ViewModalValue style={{ color: '#94a3b8' }}>No coverages linked</ViewModalValue>
                    )}
                  </ViewModalTagsContainer>
                </ViewModalSection>

                <ViewModalSection>
                  <ViewModalLabel>Available States ({viewingForm.states?.length || 0})</ViewModalLabel>
                  <ViewModalTagsContainer>
                    {viewingForm.states && viewingForm.states.length > 0 ? (
                      viewingForm.states.sort().map(state => (
                        <ViewModalTag key={state}>{state}</ViewModalTag>
                      ))
                    ) : (
                      <ViewModalValue style={{ color: '#94a3b8' }}>No states selected</ViewModalValue>
                    )}
                  </ViewModalTagsContainer>
                </ViewModalSection>

                {viewingForm.downloadUrl && (
                  <ViewModalSection>
                    <ViewModalLabel>Document</ViewModalLabel>
                    <ViewModalPdfLink href={viewingForm.downloadUrl} target="_blank" rel="noopener noreferrer">
                      <DocumentTextIcon />
                      View PDF
                    </ViewModalPdfLink>
                  </ViewModalSection>
                )}
              </ViewModalContent>
            </Modal>
          </OverlayFixed>
        )}

      </PageContent>
    </PageContainer>
  );
}