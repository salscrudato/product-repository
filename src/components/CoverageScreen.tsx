// src/components/CoverageScreen.js
import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
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
import { useCoverageLimits } from '@hooks/useCoverageLimits';
import { useCoverageDeductibles } from '@hooks/useCoverageDeductibles';
import { useCoverageFormCounts } from '@hooks/useCoverageFormCounts';

import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';
import MainNavigation from '../components/ui/Navigation';
import { PageContainer, PageContent } from '../components/ui/PageContainer';
import EnhancedHeader from '../components/ui/EnhancedHeader';
import { LimitsModal } from '../components/modals/LimitsModal';
import { DeductiblesModal } from '../components/modals/DeductiblesModal';
import { CoverageFormModal } from '../components/modals/CoverageFormModal';

import styled, { keyframes } from 'styled-components';
import {
  Overlay,
  Modal,
  ModalHeader,
  ModalTitle,
  CloseBtn
} from '../components/ui/Table';
import {
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  MapIcon,
  Squares2X2Icon,
  ArrowLeftIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/solid';

/* ---------- styled components ---------- */

// Container - Clean gradient background without color overlay
const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
  position: relative;
`;

// Main Content - Modern layout
const MainContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
  position: relative;
  z-index: 1;
`;

// Header Section - Simple layout with back button and title
const HeaderSection = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 32px;
  gap: 16px;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.2);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const TitleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
`;

const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: -0.025em;

  @media (max-width: 768px) {
    font-size: 20px;
  }
`;

const TitleIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 8px;
  color: white;

  svg {
    width: 16px;
    height: 16px;
  }
`;

// Search Container - Centered modern design
const SearchContainer = styled.div`
  position: relative;
  max-width: 600px;
  margin: 0 auto 48px;
  display: flex;
  justify-content: center;
`;

const SearchInput = styled(TextInput)`
  width: 100%;
  padding: 20px 24px 20px 56px;
  font-size: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  font-weight: 400;

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.2), 0 0 0 4px rgba(99, 102, 241, 0.1);
    background: rgba(255, 255, 255, 0.95);
    transform: translateY(-2px);
  }

  &::placeholder {
    color: #94a3b8;
    font-weight: 400;
  }
`;

const SearchIcon = styled(MagnifyingGlassIcon)`
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: #6366f1;
  pointer-events: none;
`;

// Action Bar - Modern design (unused)
// eslint-disable-next-line no-unused-vars
const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  gap: 20px;
  flex-wrap: wrap;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  padding: 20px 24px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

// eslint-disable-next-line no-unused-vars
const ActionGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

// View Toggle (unused)
// eslint-disable-next-line no-unused-vars
const ViewToggle = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

// eslint-disable-next-line no-unused-vars
const ViewToggleButton = styled.button.withConfig({
  shouldForwardProp: (prop) => !['active'].includes(prop),
})`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: ${({ active }) => active ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent'};
  color: ${({ active }) => active ? '#ffffff' : '#64748b'};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ active }) => active ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'rgba(99, 102, 241, 0.1)'};
    color: ${({ active }) => active ? '#ffffff' : '#6366f1'};
  }
`;

// Coverage Grid - Column layout for tree structure
const CoverageGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 120px;

  @media (max-width: 768px) {
    gap: 12px;
  }
`;

// Table Container for table view (unused)
// eslint-disable-next-line no-unused-vars
const TableContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 120px;
`;

// eslint-disable-next-line no-unused-vars
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

// eslint-disable-next-line no-unused-vars
const TableHead = styled.thead`
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
`;

// eslint-disable-next-line no-unused-vars
const TableRow = styled.tr`
  border-bottom: 1px solid #e2e8f0;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.02);
  }
`;

// eslint-disable-next-line no-unused-vars
const TableHeader = styled.th`
  padding: 16px 12px;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

// eslint-disable-next-line no-unused-vars
const TableCell = styled.td`
  padding: 16px 12px;
  font-size: 14px;
  color: #64748b;
  vertical-align: middle;
`;

// eslint-disable-next-line no-unused-vars
const TableActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
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
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
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

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    margin-left: 16px;
  }
`;

// Parent Coverage Card - Full width for parent coverages
const ParentCoverageCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  position: relative;
  width: 100%;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    border-color: #6366f1;
  }
`;

// Coverage Card - Simple clean design for sub-coverages
const CoverageCard = styled.div<{ $isSubCoverage?: boolean }>`
  background: white;
  border-radius: 12px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    border-color: #6366f1;
  }

  ${({ $isSubCoverage }) => $isSubCoverage && `
    background: #f8fafc;
    border-left: 3px solid #6366f1;
    margin-left: 0;
  `}
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
`;

const CardTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  flex: 1;
  line-height: 1.3;
  letter-spacing: -0.025em;
`;

const CardCode = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  padding: 6px 12px;
  border-radius: 8px;
  margin-left: 16px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  letter-spacing: 0.025em;
`;

const CardActions = styled.div`
  display: flex;
  gap: 8px;
  margin-left: 12px;
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

// Loading spinner
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

const Spinner = styled.div`
  border: 3px solid #f3f4f6;
  border-top: 3px solid #4f46e5;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: ${spin} 1s linear infinite;
`;

// Card Content
const CardContent = styled.div`
  margin-bottom: 12px;
`;

const CardCategory = styled.div.withConfig({
  shouldForwardProp: (prop) => !['category', 'inline'].includes(prop),
})`
  display: inline-block;
  background: ${({ category }) =>
    category === 'Base Coverage'
      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)'
      : 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%)'};
  color: ${({ category }) =>
    category === 'Base Coverage' ? '#3b82f6' : '#f59e0b'};
  border: ${({ category }) =>
    category === 'Base Coverage'
      ? '1px solid rgba(59, 130, 246, 0.2)'
      : '1px solid rgba(245, 158, 11, 0.2)'};
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  margin-bottom: ${({ inline }) => inline ? '0' : '12px'};
  text-transform: uppercase;
  letter-spacing: 0.025em;
  vertical-align: middle;
`;

const CardMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-top: 14px;
`;

const MetricItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(248, 250, 252, 0.8);
  backdrop-filter: blur(8px);
  border-radius: 10px;
  font-size: 13px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(226, 232, 240, 0.5);
  font-weight: 500;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.2);
  }

  svg {
    width: 16px;
    height: 16px;
    opacity: 0.8;
  }
`;

const ExpandButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-left: 8px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(99, 102, 241, 0.2);

  &:hover {
    background: rgba(99, 102, 241, 0.2);
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
  }
`;



const SubCoverageCount = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  margin-left: 8px;
  border: 1px solid rgba(34, 197, 94, 0.2);
  text-transform: uppercase;
  letter-spacing: 0.025em;

  svg {
    width: 12px;
    height: 12px;
  }
`;



const WideModal = styled(Modal)`
  max-width: 1000px;
  width: 95%;
  border-radius: 24px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const AddButton = styled.button`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.25);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);

  &:hover {
    transform: translateX(-50%) translateY(-2px) scale(1.02);
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35);
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

// eslint-disable-next-line no-unused-vars
const ExportButton = styled(Button)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  font-weight: 500;
  border-radius: 10px;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

// Empty State
const EmptyState = styled.div`
  text-align: center;
  padding: 80px 20px;
  color: #6b7280;
`;

const EmptyStateTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
`;

const EmptyStateText = styled.p`
  font-size: 16px;
  margin-bottom: 24px;
`;

// Actions container for modal buttons
const Actions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
`;

// Enhanced styling for limits/deductibles modals
const EntryContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 16px;
  padding: 4px;
`;

const EntryRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(248, 250, 252, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(241, 245, 249, 0.9);
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`;

const EntryInput = styled(TextInput)`
  flex: 1;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  background: white;
  transition: all 0.2s ease;

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    outline: none;
  }
`;

const RemoveButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: scale(1.05);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const AddEntryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: 2px dashed rgba(99, 102, 241, 0.3);
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.05);
  color: #6366f1;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
  margin-top: 8px;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.5);
    transform: translateY(-1px);
  }

  svg {
    width: 16px;
    height: 16px;
  }
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



/* ---------- helpers ---------- */

const fmtMoney = n => {
  if (n === '' || n === null || n === undefined) return '';
  const num = Number(String(n).replace(/[^0-9]/g, ''));
  return Number.isFinite(num) ? num.toLocaleString('en-US') : '';
};

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

  // Removed unused fileInputRef
  const searchRef = useRef(null);
  const [rawSearch, setRawSearch] = useState('');
  const searchQuery = useDebounce(rawSearch, 250);

  // Tree expand/collapse state
  const [expandedIds, setExpandedIds] = useState([]);
  const toggleExpand = id => {
    setExpandedIds(ids =>
      ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]
    );
  };

  // Sub-coverage add button state
  const [addingParentId, setAddingParentId] = useState(null);



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

  // Filter coverages by search
  const filteredTreeStructure = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return treeStructure;

    const { parentCoverages, childrenMap } = treeStructure;
    const filteredParents = [];
    const filteredChildrenMap = {};

    parentCoverages.forEach(parent => {
      const parentMatches =
        (parent.name || '').toLowerCase().includes(q) ||
        (parent.coverageCode || '').toLowerCase().includes(q);

      const children = childrenMap[parent.id] || [];
      const matchingChildren = children.filter(child =>
        (child.name || '').toLowerCase().includes(q) ||
        (child.coverageCode || '').toLowerCase().includes(q)
      );

      // Include parent if it matches or has matching children
      if (parentMatches || matchingChildren.length > 0) {
        filteredParents.push(parent);
        if (matchingChildren.length > 0) {
          filteredChildrenMap[parent.id] = matchingChildren;
        } else if (parentMatches && children.length > 0) {
          filteredChildrenMap[parent.id] = children;
        }
      }
    });

    return { parentCoverages: filteredParents, childrenMap: filteredChildrenMap };
  }, [treeStructure, searchQuery]);

  const [formState, setFormState] = useState({
    name: '', coverageCode: '', formIds: [], limits: [], deductibles: [],
    states: [], category: ''
  });
  const [editingId, setEditingId] = useState(null);

  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [deductibleModalOpen, setDeductibleModalOpen] = useState(false);
  const [currentCoverage, setCurrentCoverage] = useState(null);
  const [limitData, setLimitData] = useState([]);
  const [deductibleData, setDeductibleData] = useState([]);
  const [limitItCode, setLimitItCode] = useState('');
  const [deductibleItCode, setDeductibleItCode] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);

  const [linkFormsModalOpen, setLinkFormsModalOpen] = useState(false);
  const [selectedCoverageForForms, setSelectedCoverageForForms] = useState(null);
  const [linkFormIds, setLinkFormIds] = useState([]);
  const [changeSummary, setChangeSummary] = useState('');
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
  // Get rule count for a specific coverage
  const getRuleCount = useCallback((coverageId) => {
    return rules.filter(rule =>
      rule.ruleType === 'Coverage' && rule.targetId === coverageId
    ).length;
  }, [rules]);

  const resetForm = () => {
    setFormState({ name:'', coverageCode:'', formIds:[], limits:[], deductibles:[], states:[], category:'' });
    setEditingId(null); setChangeSummary('');
  };
  const openEditModal = c => {
    setCurrentCoverage(c);
    setFormState({
      name: c.name || '', coverageCode: c.coverageCode || '',
      formIds: c.formIds || [], limits: c.limits || [],
      deductibles: c.deductibles || [], states: c.states || []
    });
    setEditingId(c.id); setAddModalOpen(true);
  };
  const openAddModal = (parentId = null) => {
    resetForm();
    setAddingParentId(parentId);
    setAddModalOpen(true);
  };

  /* --- CRUD handlers (add/update/delete) are unchanged except setMetaLoading wrappers --- */
  //  ... omitted for brevity (same logic but use formState) ...

  /* ---------- handlers missing after refactor ---------- */

  const openLimitModal = c => {
    setCurrentCoverage(c);
    setLimitData((c.limits || []).map(v => String(v)));
    setLimitItCode(c.limitsItCode || '');
    setLimitModalOpen(true);
  };

  const openDeductibleModal = c => {
    setCurrentCoverage(c);
    setDeductibleData((c.deductibles || []).map(v => String(v)));
    setDeductibleItCode(c.deductiblesItCode || '');
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

  // Save limits modal changes
  const saveLimits = async () => {
    if (!currentCoverage) return;
    const clean = limitData.filter(v => v !== '');
    await updateDoc(
      doc(db, `products/${productId}/coverages`, currentCoverage.id),
      { limits: clean, limitsItCode: limitItCode }
    );
    await reloadCoverages();
    setLimitModalOpen(false);
  };

  // Save deductibles modal changes
  const saveDeductibles = async () => {
    if (!currentCoverage) return;
    const clean = deductibleData.filter(v => v !== '');
    await updateDoc(
      doc(db, `products/${productId}/coverages`, currentCoverage.id),
      { deductibles: clean, deductiblesItCode: deductibleItCode }
    );
    await reloadCoverages();
    setDeductibleModalOpen(false);
  };



  // Add or update coverage
  const handleAddOrUpdate = async () => {
    if (!formState.name || !formState.coverageCode) {
      alert('Name and Coverage Code are required.');
      return;
    }
    setMetaLoading(true);
    try {
      const data = {
        name: formState.name.trim(),
        coverageCode: formState.coverageCode.trim(),
        formIds: formState.formIds,
        limits: formState.limits,
        deductibles: formState.deductibles,
        states: formState.states,
        parentCoverageId: editingId ? parentCoverageId : addingParentId,
        productId,
        updatedAt: serverTimestamp()
      };
      if (editingId) {
        await updateDoc(
          doc(db, `products/${productId}/coverages`, editingId),
          data
        );
      } else {
        await addDoc(
          collection(db, `products/${productId}/coverages`),
          { ...data, createdAt: serverTimestamp() }
        );
      }
      await reloadCoverages();
      resetForm();
      setAddModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Save failed: ' + err.message);
    } finally {
      setMetaLoading(false);
    }
  };

  /* ---------- render guards ---------- */
  if (coveragesLoading || metaLoading) {
    return (
      <PageContainer>
        <MainNavigation />
        <PageContent>
          <LoadingContainer>
            <Spinner />
          </LoadingContainer>
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
            <EmptyStateTitle>Error Loading Coverages</EmptyStateTitle>
            <EmptyStateText>There was an error loading the coverage data. Please try refreshing the page.</EmptyStateText>
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
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
          searchProps={{
            placeholder: "Search coverages...",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value)
          }}
        />

        {/* Coverages Display */}
        {filteredTreeStructure.parentCoverages.length > 0 ? (
          <CoverageGrid>
              {filteredTreeStructure.parentCoverages.map(parent => {
                const isExpanded = expandedIds.includes(parent.id);

                return (
                  <CoverageGroup key={parent.id}>
                    {/* Parent Coverage */}
                      <ParentCoverageCard>
                        <CardHeader>
                          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                            <CardTitle>
                              {parent.name}
                              {parent.subCount > 0 && (
                                <>
                                  <SubCoverageCount>
                                    <Squares2X2Icon />
                                    {parent.subCount} sub-coverage{parent.subCount !== 1 ? 's' : ''}
                                  </SubCoverageCount>
                                  <ExpandButton onClick={() => toggleExpand(parent.id)}>
                                    {expandedIds.includes(parent.id) ? (
                                      <ChevronDownIcon width={16} />
                                    ) : (
                                      <ChevronRightIcon width={16} />
                                    )}
                                  </ExpandButton>
                                </>
                              )}
                            </CardTitle>
                          </div>
                          <CardCode>{parent.coverageCode}</CardCode>
                          <CardActions>
                            <IconButton onClick={() => openAddModal(parent.id)} title="Add sub-coverage">
                              <PlusIcon width={16} />
                            </IconButton>
                            <IconButton onClick={() => openEditModal(parent)}>
                              <PencilIcon width={16} />
                            </IconButton>
                            <IconButton className="danger" onClick={() => handleDelete(parent.id)}>
                              <TrashIcon width={16} />
                            </IconButton>
                          </CardActions>
                        </CardHeader>

                        <CardContent>

                          <CardMetrics>
                            <MetricItem onClick={() => openLimitModal(parent)}>
                              <CurrencyDollarIcon />
                              Limits {parent.limitsCount ? `(${parent.limitsCount})` : '(0)'}
                            </MetricItem>
                            <MetricItem onClick={() => openDeductibleModal(parent)}>
                              <CurrencyDollarIcon />
                              Deductibles {parent.deductiblesCount ? `(${parent.deductiblesCount})` : '(0)'}
                            </MetricItem>
                            <MetricItem as={RouterLink} to={`/coverage-states/${productId}/${parent.id}`}>
                              <MapIcon />
                              States {parent.states?.length ? `(${parent.states.length})` : '(0)'}
                            </MetricItem>
                            <MetricItem onClick={() => openLinkFormsModal(parent)}>
                              <DocumentTextIcon />
                              Forms {formCounts[parent.id] ? `(${formCounts[parent.id]})` : '(0)'}
                            </MetricItem>
                            <MetricItem onClick={() => navigate(`/pricing/${productId}?coverage=${encodeURIComponent(parent.name)}`)}>
                              <CurrencyDollarIcon />
                              Pricing
                            </MetricItem>
                            <MetricItem onClick={() => navigate(`/rules/${productId}/${parent.id}`)}>
                              <Cog6ToothIcon />
                              Rules ({getRuleCount(parent.id)})
                            </MetricItem>
                          </CardMetrics>
                        </CardContent>
                      </ParentCoverageCard>
                    {/* Sub-Coverages */}
                    {filteredTreeStructure.childrenMap[parent.id] && isExpanded && (
                      <SubCoverageContainer $isExpanded={isExpanded}>
                        {filteredTreeStructure.childrenMap[parent.id].map(child => (
                          <CoverageCard key={child.id} $isSubCoverage>
                            <CardHeader>
                              <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                <CardTitle>
                                  {child.name}
                                </CardTitle>
                              </div>
                              <CardCode>{child.coverageCode}</CardCode>
                              <CardActions>
                                <IconButton onClick={() => openEditModal(child)}>
                                  <PencilIcon width={16} />
                                </IconButton>
                                <IconButton className="danger" onClick={() => handleDelete(child.id)}>
                                  <TrashIcon width={16} />
                                </IconButton>
                              </CardActions>
                            </CardHeader>

                            <CardContent>

                              <CardMetrics>
                                <MetricItem onClick={() => openLimitModal(child)}>
                                  <CurrencyDollarIcon />
                                  Limits {child.limitsCount ? `(${child.limitsCount})` : '(0)'}
                                </MetricItem>
                                <MetricItem onClick={() => openDeductibleModal(child)}>
                                  <CurrencyDollarIcon />
                                  Deductibles {child.deductiblesCount ? `(${child.deductiblesCount})` : '(0)'}
                                </MetricItem>
                                <MetricItem as={RouterLink} to={`/coverage-states/${productId}/${child.id}`}>
                                  <MapIcon />
                                  States {child.states?.length ? `(${child.states.length})` : '(0)'}
                                </MetricItem>
                                <MetricItem onClick={() => openLinkFormsModal(child)}>
                                  <DocumentTextIcon />
                                  Forms {formCounts[child.id] ? `(${formCounts[child.id]})` : '(0)'}
                                </MetricItem>
                                <MetricItem onClick={() => navigate(`/pricing/${productId}?coverage=${encodeURIComponent(child.name)}`)}>
                                  <CurrencyDollarIcon />
                                  Pricing
                                </MetricItem>
                                <MetricItem onClick={() => navigate(`/rules/${productId}/${child.id}`)}>
                                  <Cog6ToothIcon />
                                  Rules ({getRuleCount(child.id)})
                                </MetricItem>
                              </CardMetrics>
                            </CardContent>
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
            <EmptyStateTitle>No coverages found</EmptyStateTitle>
            <EmptyStateText>
              {searchQuery ? 'Try adjusting your search terms' : 'Get started by adding your first coverage'}
            </EmptyStateText>
          </EmptyState>
        )}

        <AddButton onClick={() => openAddModal()}>
          <PlusIcon />
          Add Coverage
        </AddButton>

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

        {/* ----- Add / Edit Coverage Modal (Enhanced) ----- */}
        {addModalOpen && (
          <CoverageFormModal
            isOpen={addModalOpen}
            onClose={() => {
              setAddModalOpen(false);
              resetForm();
            }}
            productId={productId}
            coverage={editingId ? {
              id: editingId,
              ...formState,
              // Map existing coverage data if editing
              ...(currentCoverage || {})
            } : {
              name: formState.name,
              coverageCode: formState.coverageCode,
              parentCoverageId: addingParentId
            }}
            onSave={async (coverageData) => {
              setMetaLoading(true);
              try {
                const data = {
                  ...coverageData,
                  productId,
                  parentCoverageId: addingParentId || null,
                };

                if (editingId) {
                  // Update existing coverage
                  await updateDoc(
                    doc(db, `products/${productId}/coverages`, editingId),
                    { ...data, updatedAt: serverTimestamp() }
                  );
                } else {
                  // Add new coverage
                  await addDoc(
                    collection(db, `products/${productId}/coverages`),
                    { ...data, createdAt: serverTimestamp() }
                  );
                }
                await reloadCoverages();
                resetForm();
                setAddModalOpen(false);
              } catch (err) {
                console.error(err);
                throw new Error('Save failed: ' + err.message);
              } finally {
                setMetaLoading(false);
              }
            }}
            title={editingId ? 'Edit Coverage' : 'Add Coverage'}
          />
        )}

      </PageContent>
    </PageContainer>
  );
}

/* ---------- simple debounce hook ---------- */
function useDebounce(value, ms=250){
  const [v,setV]=useState(value);
  useEffect(()=>{const id=setTimeout(()=>setV(value),ms);return ()=>clearTimeout(id);},[value,ms]);
  return v;
}

