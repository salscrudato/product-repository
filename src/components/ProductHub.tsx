import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import styled from 'styled-components';
import MainNavigation from './ui/Navigation';
import EnhancedHeader from './ui/EnhancedHeader';
import { PageContainer, PageContent } from './ui/PageContainer';
import { Breadcrumb } from './ui/Breadcrumb';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,

} from 'firebase/firestore';
import { db, storage, functions } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import {
  TrashIcon,
  PencilIcon,
  InformationCircleIcon,
  PlusIcon,
  PaperAirplaneIcon,
  Squares2X2Icon,
  TableCellsIcon,
  CubeIcon,
  XMarkIcon
} from '@heroicons/react/24/solid';
import DataDictionaryModal from './DataDictionaryModal';
import ConfirmationModal from './ui/ConfirmationModal';
import useProducts from '@hooks/useProducts';
import MarkdownRenderer from '@utils/markdownParser';
import ProductCard from './ui/ProductCard';
import VirtualizedGrid from './ui/VirtualizedGrid';
import { debounce } from '@utils/performance';
import { extractPdfText } from '@utils/pdfChunking';
import LoadingSpinner from './ui/LoadingSpinner';
import { EmptyState } from './ui/EmptyState';
import { logAuditEvent } from '@services/auditService';


/* ---------- Styled Components ---------- */

const HeaderActionButton = styled.button.withConfig({
  shouldForwardProp: (prop) => !['variant'].includes(prop),
})<{ variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${props => props.variant === 'secondary'
    ? 'rgba(255, 255, 255, 0.9)'
    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'};
  color: ${props => props.variant === 'secondary' ? '#6366f1' : '#ffffff'};
  border: ${props => props.variant === 'secondary' ? '1px solid rgba(99, 102, 241, 0.2)' : 'none'};
  border-radius: 12px;
  padding: 12px 20px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  box-shadow: ${props => props.variant === 'secondary'
    ? '0 2px 8px rgba(99, 102, 241, 0.1)'
    : '0 4px 16px rgba(99, 102, 241, 0.25)'};
  transition: all 0.3s ease;
  letter-spacing: -0.01em;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }

  &:hover {
    background: ${props => props.variant === 'secondary'
      ? 'rgba(99, 102, 241, 0.1)'
      : 'linear-gradient(135deg, #5b5bf6 0%, #7c3aed 100%)'};
    transform: translateY(-2px);
    box-shadow: ${props => props.variant === 'secondary'
      ? '0 4px 16px rgba(99, 102, 241, 0.2)'
      : '0 8px 24px rgba(99, 102, 241, 0.35)'};
    border-color: ${props => props.variant === 'secondary' ? 'rgba(99, 102, 241, 0.3)' : 'transparent'};

    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

// Header Container
const HeaderContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
  position: relative;
  width: 100%;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;

    > div:last-child {
      position: static !important;
      display: flex;
      gap: 12px;
      width: 100%;

      button {
        flex: 1;
      }
    }
  }
`;

// Action Bar
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
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
`;

// Filter Bar
const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  margin-bottom: 24px;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 8px;
  background: white;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #6366f1;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
  }

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const ClearFiltersButton = styled.button`
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
  }
`;

// Keyboard shortcuts hint
const KeyboardHint = styled.div`
  display: flex;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(99, 102, 241, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.1);
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 16px;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
`;

const KeyboardShortcut = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;

  kbd {
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(226, 232, 240, 0.8);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 11px;
    font-weight: 600;
    color: #374151;
  }
`;

// Stats Bar
const StatsBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  padding: 16px 24px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
  border-radius: 12px;
  border: 1px solid rgba(99, 102, 241, 0.1);
  margin-bottom: 24px;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 12px 16px;
  }
`;

const StatBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.6);
`;

const StatBoxValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #6366f1;
`;

const StatBoxLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

// Bulk Actions Toolbar
const BulkActionsToolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  margin-bottom: 16px;
  animation: slideDown 0.2s ease;

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const BulkActionCount = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
`;

const BulkActionButton = styled.button`
  padding: 8px 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

// Quick Tips
const QuickTips = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 24px;
  padding: 24px;
  background: rgba(248, 250, 252, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.6);
`;

const TipCard = styled.div`
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.4);
  font-size: 13px;
  color: #4b5563;
  line-height: 1.6;

  strong {
    display: block;
    color: #6366f1;
    font-weight: 600;
    margin-bottom: 4px;
  }
`;

// Templates Section
const TemplatesSection = styled.div`
  margin-top: 32px;
  padding: 24px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
  border-radius: 12px;
  border: 1px solid rgba(99, 102, 241, 0.1);
`;

const TemplatesTitle = styled.h3`
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TemplatesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
`;

const TemplateCard = styled.button`
  padding: 16px;
  background: white;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
    transform: translateY(-1px);
  }

  strong {
    display: block;
    color: #6366f1;
    font-weight: 600;
    margin-bottom: 4px;
  }

  small {
    display: block;
    color: #9ca3af;
    font-size: 12px;
  }
`;

// AI Suggestions Banner
const SuggestionsBanner = styled.div`
  padding: 16px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  margin-bottom: 16px;
`;

const SuggestionsTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #1e40af;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SuggestionsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;

  li {
    font-size: 12px;
    color: #1e40af;
    padding-left: 20px;
    position: relative;

    &::before {
      content: '💡';
      position: absolute;
      left: 0;
    }
  }
`;

// Toast notification
const ToastContainer = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;

  @media (max-width: 640px) {
    bottom: 16px;
    right: 16px;
    left: 16px;
    max-width: none;
  }
`;

const Toast = styled.div<{ $type?: 'success' | 'error' | 'info' }>`
  padding: 16px 20px;
  border-radius: 12px;
  background: ${props => {
    switch (props.$type) {
      case 'success': return '#dcfce7';
      case 'error': return '#fee2e2';
      case 'info': return '#dbeafe';
      default: return '#f3f4f6';
    }
  }};
  border: 1px solid ${props => {
    switch (props.$type) {
      case 'success': return '#86efac';
      case 'error': return '#fca5a5';
      case 'info': return '#93c5fd';
      default: return '#e5e7eb';
    }
  }};
  color: ${props => {
    switch (props.$type) {
      case 'success': return '#166534';
      case 'error': return '#991b1b';
      case 'info': return '#1e40af';
      default: return '#374151';
    }
  }};
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

// View Toggle
const ViewToggle = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const ViewToggleButton = styled.button.withConfig({
  shouldForwardProp: (prop) => !['active'].includes(prop),
})<{ active?: boolean }>`
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

// View Toggle Bar
const ViewToggleBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  padding: 16px 24px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
`;

const ViewToggleGroup = styled.div`
  display: flex;
  gap: 8px;
  background: rgba(226, 232, 240, 0.3);
  padding: 4px;
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.5);
`;

const ProductsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
  margin-bottom: 60px;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
    margin-bottom: 40px;
  }

  @media (max-width: 480px) {
    gap: 16px;
  }
`;

// Table Container for table view
const TableContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 60px;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
`;

const TableRow = styled.tr`
  border-bottom: 1px solid #e2e8f0;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background: rgba(99, 102, 241, 0.05);
    transform: translateX(2px);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const TableHeader = styled.th`
  padding: 16px 12px;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const TableCell = styled.td`
  padding: 16px 12px;
  font-size: 14px;
  color: #64748b;
  vertical-align: middle;
`;

const TableActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
`;

// Removed duplicate styled components - now using separate ProductCard component

// Keep IconButton for table view
const IconButton = styled.button`
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.8);
  backdrop-filter: blur(10px);
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  border: 1px solid rgba(226, 232, 240, 0.6);

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    color: #6366f1;
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateY(-1px);
  }

  &.danger:hover {
    background: rgba(239, 68, 68, 0.08);
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.3);
  }

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
  }
`;

// AddButton styled component for action buttons
const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: 8px 12px;
    font-size: 12px;
  }
`;

/* ---------- modal components ---------- */
const Modal = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 0;
  width: 100%;
  max-width: 650px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

/* ---------- Enhanced AI Content Modal Components ---------- */
const EnhancedModalContent = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 0;
  width: 100%;
  max-width: 768px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
`;

const StickyModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
  position: sticky;
  top: 0;
  z-index: 10;
`;

const EnhancedModalTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.01em;
`;

const ScrollableModalBody = styled.div`
  max-height: 70vh;
  overflow-y: auto;
  padding: 32px;
  background: #ffffff;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const AIContentContainer = styled.div`
  /* Typography hierarchy for AI content */
  h1, h2 {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 16px 0;
    line-height: 1.3;
  }

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #374151;
    margin: 24px 0 12px 0;
    line-height: 1.4;
  }

  p {
    font-size: 14px;
    color: #4b5563;
    line-height: 1.6;
    margin: 0 0 16px 0;
  }

  strong, b {
    font-weight: 600;
    color: #374151;
  }

  ul, ol {
    margin: 16px 0;
    padding-left: 20px;
  }

  li {
    font-size: 14px;
    color: #4b5563;
    line-height: 1.6;
    margin: 4px 0;
  }

  /* Visual rhythm and spacing */
  > * + * {
    margin-top: 16px;
  }

  /* Highlight key terms */
  strong:contains("Limits:"),
  strong:contains("Perils:"),
  strong:contains("Coverage:"),
  strong:contains("Deductible:") {
    color: #6366f1;
    background: rgba(99, 102, 241, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
  }
`;

const ContentSection = styled.div`
  margin-bottom: 32px;
  padding: 24px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionHeader = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 0;
  margin-bottom: 24px;
  position: relative;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 20;

  &:hover {
    background: rgba(107, 114, 128, 0.2);
    color: #374151;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

/* ---------- AI Content Processing Utilities ---------- */
const processAIContent = (content) => {
  if (!content) return '';

  // Clean up excessive line breaks and whitespace
  let cleaned = content
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Enhance key terms with highlighting
  const keyTerms = [
    'Limits:', 'Perils:', 'Coverage:', 'Deductible:', 'Premium:',
    'Exclusions:', 'Conditions:', 'Territory:', 'Policy Period:'
  ];

  keyTerms.forEach(term => {
    const regex = new RegExp(`\\b${term}`, 'gi');
    cleaned = cleaned.replace(regex, `**${term}**`);
  });

  return cleaned;
};

const renderAIContent = (content) => {
  const processedContent = processAIContent(content);
  return (
    <AIContentContainer>
      <MarkdownRenderer>{processedContent}</MarkdownRenderer>
    </AIContentContainer>
  );
};

const FormField = styled.div`
  margin-bottom: 24px;
  padding: 0 24px;

  &:last-of-type {
    margin-bottom: 0;
  }
`;

const FormLabel = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FormLabelHint = styled.span`
  display: block;
  font-size: 12px;
  font-weight: 400;
  color: #6b7280;
  text-transform: none;
  letter-spacing: normal;
  margin-top: 4px;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #111827;
  background: #ffffff;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #7c3aed;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }

  &:disabled {
    background: #f3f4f6;
    color: #9ca3af;
    cursor: not-allowed;
  }
`;

const FileInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #111827;
  background: #ffffff;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #7c3aed;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
  }
`;

const FileName = styled.div`
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 6px;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  padding: 24px;
  justify-content: flex-end;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
`;

const SaveButton = styled.button`
  padding: 12px 24px;
  background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a855f7 100%);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CancelButton = styled.button`
  padding: 12px 24px;
  background: #ffffff;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
    color: #374151;
    border-color: #d1d5db;
  }
`;

const FormError = styled.div`
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  color: #dc2626;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 20px;
`;

/* ---------- summary modal components ---------- */
// Unused summary styled components removed to fix ESLint warnings

/* ---------- details modal components ---------- */
const DetailsList = styled.div`
  padding: 0 24px 24px;
`;

const DetailItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }
`;

const DetailLabel = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #374151;
`;

const DetailValue = styled.div`
  font-size: 14px;
  color: #6b7280;
`;

const DetailLink = styled.a`
  color: #7c3aed;
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

const ChatInput = styled.textarea`
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #111827;
  background: #ffffff;
  resize: none;
  min-height: 44px;
  max-height: 120px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #7c3aed;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const ChatSendButton = styled.button`
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 8px;
  background: #7c3aed;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #6d28d9;
  }

  &:disabled {
    background: #e5e7eb;
    cursor: not-allowed;
  }
`;

/* ---------- rules modal components ---------- */
// Unused rules styled components removed to fix ESLint warnings

/* ---------- system prompts ---------- */
const SYSTEM_INSTRUCTIONS = `
Persona: You are an expert in P&C insurance products. Your task is to analyze the provided insurance document text and extract key information into a structured JSON format.

**Understand the following definitions:**

- **Product:** The name of the insurance product, representing a distinct insurance offering or line. It is typically defined by a base coverage form (e.g., Commercial Property product uses base form CP 00 10) that encompasses one or more core coverages. It may also include additional endorsement coverages offered under the same product but not included in the base form.
- **Coverage:** A specific provision within an insurance policy that offers protection against designated perils or risks to particular subjects, such as property, persons, or liabilities. It outlines the extent of the insurer's obligation to compensate for covered losses, including maximum limits per occurrence and in aggregate, conditions under which coverage applies, exclusions that limit its scope, and any deductibles the insured must meet before benefits are paid.

**Instructions:**

1. **Determine the Form Category:**
   - **Base Coverage Form:** Contains one or more coverages, does not amend another document, and includes policy language such as definitions and conditions.
   - **Coverage Endorsement:** Modifies an existing insurance document, such as the base coverage form, to add new coverage to the policy.
   - **Exclusion:** Excludes coverages, terms of coverages, and other items from the policy, reducing coverage offered.
   - **Notice:** A policyholder notice explaining certain revisions and other mandatory legal disclaimers.
   - **Dec/Quote:** The cover letter of the policy explaining all the policyholder information, coverages, limits, deductibles, list of forms attached, etc.

2. **Identify and List All Coverages Individually:**
   - For each coverage, extract the following details:
     - **coverageName:** The name of the coverage. If not explicitly stated, infer based on context.
     - **scopeOfCoverage:** A description of what is covered, including specific items or scenarios (2-3 sentences max)
     - **limits:** Any monetary or other limits applied to the coverage. Include specific values if available.
     - **perilsCovered:** An array of perils or risks that are covered under this coverage.
     - **enhances:** (For endorsements) An array of coverage names that this endorsement modifies or enhances. Leave empty if not applicable.
   - If the form is an endorsement, ensure to identify which coverages it enhances or modifies.

3. **Extract General Conditions and Exclusions:**
   - **generalConditions:** An array of conditions that apply to the entire document or policy (2-3 sentences max)
   - **generalExclusions:** An array of exclusions that apply to the entire document or policy (2-3 sentences max)
   - These should be distinct from conditions and exclusions specific to individual coverages.

**Important Guidelines:**
- Use your knowledge of insurance to interpret the text conceptually. Do not rely solely on exact wording, as phrasing can vary across insurers.
- Read the entire document, ignoring any irrelevant formatting or sections that do not pertain to coverages or general conditions/exclusions.
- Be thorough and ensure all coverages are captured, including any endorsements.
- If a coverage name is not explicitly stated, infer it based on the context.
- Do not include any information not supported by the document.
- For fields that are not applicable or not found, use an empty array for lists or an empty string for text fields.

**Output Format:**
{
  "category": "document_type",
  "coverages": [
    {
      "coverageName": "name",
      "scopeOfCoverage": "description",
      "limits": "limits_description",
      "perilsCovered": ["peril1", "peril2"],
      "enhances": ["coverage1", "coverage2"]
    }
  ],
  "generalConditions": ["condition1", "condition2"],
  "generalExclusions": ["exclusion1", "exclusion2"]
}
`;

// Memoized ProductHub component for better performance
const ProductHub = memo(() => {
  const { products, loading, error } = useProducts({ enableCache: true, maxResults: 500 });
  const [searchTerm, setSearchTerm] = useState('');
  const [rawSearch, setRawSearch] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [dictModalOpen, setDictModalOpen] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [productCode, setProductCode] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [file, setFile] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // AI states
  const [loadingSummary, setLoadingSummary] = useState({});
  const [modalData, setModalData] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Chat states
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatPdfText, setChatPdfText] = useState('');

  // View mode state - Default to card view
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  // Filter states
  const [sortBy, setSortBy] = useState('name'); // 'name', 'date', 'coverage-count'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'

  // Multi-select state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // Toast notification state
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>>([]);

  // Helper function to show toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Product templates
  const templates = [
    { name: 'Commercial Property', code: 'CP', description: 'Standard commercial property insurance' },
    { name: 'General Liability', code: 'GL', description: 'General liability coverage' },
    { name: 'Workers Compensation', code: 'WC', description: 'Workers compensation insurance' },
    { name: 'Professional Liability', code: 'PL', description: 'Professional liability coverage' },
  ];

  const handleUseTemplate = (template: typeof templates[0]) => {
    setName(template.name);
    setProductCode(template.code);
    setFormNumber(`${template.code}0010`);
    setModalOpen(true);
    showToast(`Template "${template.name}" loaded`, 'info');
  };

  // Get AI suggestions for products
  const getAISuggestions = useCallback(() => {
    const suggestions = [];

    if (products.length === 0) {
      suggestions.push('Start by creating your first product using a template');
    }

    const productsWithoutCoverages = products.filter(p => !p.coverageCount || p.coverageCount === 0);
    if (productsWithoutCoverages.length > 0) {
      suggestions.push(`${productsWithoutCoverages.length} product(s) need coverages added`);
    }

    const productsWithoutForms = products.filter(p => !p.formDownloadUrl);
    if (productsWithoutForms.length > 0) {
      suggestions.push(`${productsWithoutForms.length} product(s) are missing form documents`);
    }

    return suggestions;
  }, [products]);

  // Optimized debounced search
  const debouncedSetSearchTerm = useCallback(
    debounce((term) => {
      setSearchTerm(term.trim());
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSetSearchTerm(rawSearch);
  }, [rawSearch, debouncedSetSearchTerm]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape key - close modals
      if (e.key === 'Escape') {
        setModalOpen(false);
        setSummaryModalOpen(false);
        setDetailsModalOpen(false);
        setChatModalOpen(false);
        setDictModalOpen(false);
      }
      // Ctrl/Cmd + N - new product
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setModalOpen(true);
      }
      // Ctrl/Cmd + K - focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Enhanced modal accessibility - prevent body scroll when modal is open
  useEffect(() => {
    const isAnyModalOpen = modalOpen || summaryModalOpen || detailsModalOpen ||
                          chatModalOpen || dictModalOpen;

    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [modalOpen, summaryModalOpen, detailsModalOpen, chatModalOpen, dictModalOpen]);

  // Optimized product filtering with enhanced search, status, and sorting
  const filtered = useMemo(() => {
    let result = products;

    // Apply search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.formNumber?.toLowerCase().includes(q) ||
        p.productCode?.toLowerCase().includes(q)
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter(p => (p.status || 'active') === filterStatus);
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return (b.updatedAt?.getTime?.() || 0) - (a.updatedAt?.getTime?.() || 0);
        case 'coverage-count':
          return (b.coverageCount || 0) - (a.coverageCount || 0);
        case 'name':
        default:
          return (a.name || '').localeCompare(b.name || '');
      }
    });

    return result;
  }, [products, searchTerm, filterStatus, sortBy]);

  // Export products as JSON
  const handleExport = useCallback(() => {
    const dataToExport = selectedProducts.size > 0
      ? filtered.filter(p => selectedProducts.has(p.id))
      : filtered;

    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `products-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported ${dataToExport.length} product(s) successfully`, 'success');
  }, [filtered, selectedProducts, showToast]);

  // Memoized helper functions to prevent unnecessary re-renders
  const handleOpenDetails = useCallback((product) => {
    setSelectedProduct(product);
    setDetailsModalOpen(true);
  }, []);

  const handleEdit = useCallback((product) => {
    setEditingId(product.id);
    setName(product.name);
    setFormNumber(product.formNumber || '');
    setProductCode(product.productCode || '');
    setEffectiveDate(product.effectiveDate || '');
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback((id) => {
    setDeleteProductId(id);
    setConfirmDeleteOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteProductId) return;

    setIsDeleting(true);
    try {
      const product = products.find(p => p.id === deleteProductId);
      await deleteDoc(doc(db, 'products', deleteProductId));

      // Log audit event
      await logAuditEvent('DELETE', 'PRODUCT', deleteProductId, {
        entityName: product?.name,
        reason: 'User-initiated deletion'
      });

      showToast(`Product "${product?.name}" deleted successfully`, 'success');
      setConfirmDeleteOpen(false);
      setDeleteProductId(null);
    } catch (error) {
      console.error('Delete failed:', error);
      showToast('Failed to delete product. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteProductId, products, showToast]);

  const handleSummary = async (id, url) => {
    if (!url) {
      alert('No form uploaded for this product.');
      return;
    }
    setLoadingSummary(prev => ({ ...prev, [id]: true }));

    try {
      console.log('🔍 Starting PDF extraction from URL:', url);

      // Extract text from PDF using centralized utility
      const text = await extractPdfText(url);

      console.log('📝 PDF text extracted:', {
        textLength: text?.length || 0,
        textType: typeof text,
        firstChars: text?.substring(0, 100) || 'EMPTY',
        trimmedLength: text?.trim().length || 0
      });

      // Validate extracted text
      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from the PDF');
      }

      // Keep first ~100k tokens to stay safely under GPT limit
      const snippet = text.split(/\s+/).slice(0, 100000).join(' ');

      console.log('✂️ Text snippet created:', {
        snippetLength: snippet.length,
        snippetType: typeof snippet,
        trimmedSnippetLength: snippet.trim().length,
        firstChars: snippet.substring(0, 100)
      });

      // Validate snippet before sending
      if (!snippet || snippet.trim().length < 50) {
        throw new Error('Extracted text is too short to generate a meaningful summary');
      }

      // Estimate payload size (rough approximation)
      const payloadSize = new Blob([snippet]).size;
      const payloadSizeMB = (payloadSize / (1024 * 1024)).toFixed(2);

      console.log('📄 Sending PDF text to AI:', {
        originalLength: text.length,
        snippetLength: snippet.length,
        wordCount: snippet.split(/\s+/).length,
        payloadSizeMB: payloadSizeMB,
        pdfTextParam: snippet.substring(0, 200) + '...'
      });

      // Firebase Callable Functions have a 10MB payload limit
      if (payloadSize > 9 * 1024 * 1024) { // 9MB to be safe
        throw new Error(`PDF text is too large (${payloadSizeMB}MB). Please use a smaller document.`);
      }

      // Call Cloud Function (secure proxy to OpenAI)
      const generateSummary = httpsCallable(functions, 'generateProductSummary');

      // Ensure we're sending a plain object with string values
      const payload = {
        pdfText: String(snippet),
        systemPrompt: String(SYSTEM_INSTRUCTIONS.trim())
      };

      console.log('🚀 Calling Cloud Function with payload:', {
        hasPdfText: !!payload.pdfText,
        pdfTextType: typeof payload.pdfText,
        pdfTextLength: payload.pdfText.length,
        hasSystemPrompt: !!payload.systemPrompt
      });

      const result = await generateSummary(payload);

      if (!result.data.success) {
        throw new Error('Failed to generate summary');
      }

      // Clean response
      const cleaned = result.data.content
        .replace(/```json\n?/, '')
        .replace(/\n?```/, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .trim();

      let summaryJson;
      try {
        summaryJson = JSON.parse(cleaned);
      } catch {
        throw new Error('Failed to parse AI response');
      }

      if (!summaryJson.category || !Array.isArray(summaryJson.coverages)) {
        throw new Error('Invalid AI response format');
      }

      setModalData(summaryJson);
      setSummaryModalOpen(true);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Summary failed.');
    } finally {
      setLoadingSummary(prev => ({ ...prev, [id]: false }));
    }
  };

  const openChat = async (product) => {
    setSelectedProduct(product);
    setChatModalOpen(true);
    setChatMessages([]);
    setChatInput('');
    setChatLoading(false);

    // Load PDF text for context if available
    if (product.formDownloadUrl) {
      try {
        const text = await extractPdfText(product.formDownloadUrl);
        setChatPdfText(text.split(/\s+/).slice(0, 100000).join(' '));
      } catch (err) {
        console.error('Failed to load PDF for chat:', err);
        setChatPdfText('');
      }
    } else {
      setChatPdfText('');
    }
  };

  // openRulesModal function removed - unused

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setFormNumber('');
    setProductCode('');
    setEffectiveDate('');
    setFile(null);
  };

  const formatMMYY = value => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length < 3) return digits;
    return digits.slice(0, 2) + '/' + digits.slice(2);
  };

  const validateForm = () => {
    const errors = {};
    if (!name?.trim()) errors.name = 'Product name is required';
    if (!formNumber?.trim()) errors.formNumber = 'Form number is required';
    if (!effectiveDate?.trim()) errors.effectiveDate = 'Effective date is required';
    if (effectiveDate && !/^\d{2}\/\d{2}$/.test(effectiveDate)) {
      errors.effectiveDate = 'Please use MM/YY format';
    }
    return errors;
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    try {
      let downloadUrl = '';
      if (file) {
        const sref = ref(storage, `forms/${file.name}`);
        await uploadBytes(sref, file);
        downloadUrl = await getDownloadURL(sref);
      }

      if (editingId) {
        // When updating, only include formDownloadUrl if a new file was uploaded
        const updateData: any = {
          name: name.trim(),
          formNumber: formNumber.trim(),
          productCode: productCode.trim(),
          updatedAt: new Date()
        };

        // Only update formDownloadUrl if a new file was provided
        if (downloadUrl) {
          updateData.formDownloadUrl = downloadUrl;
        }

        await updateDoc(doc(db, 'products', editingId), updateData);
        showToast(`Product "${name.trim()}" updated successfully`, 'success');
      } else {
        await addDoc(collection(db, 'products'), {
          name: name.trim(),
          formNumber: formNumber.trim(),
          productCode: productCode.trim(),
          effectiveDate: effectiveDate.trim(),
          formDownloadUrl: downloadUrl,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        showToast(`Product "${name.trim()}" created successfully`, 'success');
      }
      setModalOpen(false);
      resetForm();
      setFormErrors({});
    } catch (error) {
      console.error('Save failed:', error);
      setFormErrors({ submit: 'Failed to save product. Please try again.' });
      showToast('Failed to save product. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const systemPrompt = `You are an expert insurance assistant helping with questions about the product "${selectedProduct?.name}". ${
        chatPdfText ? 'Use the following form text as context for your answers:\n\n' + chatPdfText.slice(0, 50000) : 'No form text is available for this product.'
      }`;

      // Call Cloud Function (secure proxy to OpenAI)
      const generateChat = httpsCallable(functions, 'generateChatResponse');
      const result = await generateChat({
        messages: [
          { role: 'system', content: systemPrompt },
          ...chatMessages.slice(-10), // Keep last 10 messages for context
          { role: 'user', content: userMessage }
        ],
        model: 'gpt-4o-mini',
        maxTokens: 1000,
        temperature: 0.7
      });

      if (!result.data.success) {
        throw new Error('Failed to generate chat response');
      }

      const aiResponse = result.data.content?.trim();

      if (aiResponse) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      } else {
        throw new Error('No response from AI');
      }
    } catch (error) {
      console.error('Chat failed:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setChatLoading(false);
    }
  };



  if (loading) {
    return (
      <PageContainer withOverlay={true}>
        <MainNavigation />
        <PageContent>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <LoadingSpinner type="circular" size="40px" />
            <p style={{ marginTop: '16px', color: '#6b7280', fontSize: '14px' }}>Loading products...</p>
          </div>
        </PageContent>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer withOverlay={true}>
        <MainNavigation />
        <PageContent>
          <EmptyState
            icon={<InformationCircleIcon style={{ width: '48px', height: '48px' }} />}
            title="Error loading products"
            description="Please try refreshing the page."
            variant="default"
          />
        </PageContent>
      </PageContainer>
    );
  }

  return (
    <PageContainer withOverlay={true}>
      <MainNavigation />

      <PageContent>
        <HeaderContainer>
          <EnhancedHeader
            title="Product Hub"
            subtitle={`Explore and manage ${filtered.length} active product line${filtered.length !== 1 ? 's' : ''}`}
            icon={CubeIcon}
            searchProps={{
              placeholder: "Search by product name, form number, or code...",
              value: rawSearch,
              onChange: (e) => setRawSearch(e.target.value)
            }}
          />
        </HeaderContainer>

        {/* Bulk Actions Toolbar */}
        {selectedProducts.size > 0 && (
          <BulkActionsToolbar role="toolbar" aria-label="Bulk actions">
            <BulkActionCount>{selectedProducts.size} selected</BulkActionCount>
            <BulkActionButton onClick={handleExport} title="Export selected products as JSON">
              📥 Export
            </BulkActionButton>
            <BulkActionButton onClick={() => setSelectedProducts(new Set())}>
              Clear Selection
            </BulkActionButton>
          </BulkActionsToolbar>
        )}

        {/* View Toggle Bar */}
        <ViewToggleBar>
          <ViewToggleGroup>
            <ViewToggleButton
              active={viewMode === 'cards'}
              onClick={() => setViewMode('cards')}
              title="Card view"
              aria-label="Switch to card view"
            >
              <Squares2X2Icon />
              Cards
            </ViewToggleButton>
            <ViewToggleButton
              active={viewMode === 'table'}
              onClick={() => setViewMode('table')}
              title="Table view"
              aria-label="Switch to table view"
            >
              <TableCellsIcon />
              Table
            </ViewToggleButton>
          </ViewToggleGroup>
          <HeaderActionButton onClick={() => setModalOpen(true)}>
            <PlusIcon />
            Add Product
          </HeaderActionButton>
        </ViewToggleBar>

        {filtered.length > 0 ? (
          viewMode === 'cards' ? (
            // Use virtualization for large lists (>20 items) for better performance
            filtered.length > 20 ? (
              <VirtualizedGrid
                items={filtered}
                renderItem={(product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onOpenDetails={handleOpenDetails}
                    onSummary={handleSummary}
                    onChat={openChat}
                    loadingSummary={loadingSummary[product.id]}
                  />
                )}
                columnCount={2}
                rowHeight={350}
                height={600}
              />
            ) : (
              <ProductsGrid>
                {filtered.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onOpenDetails={handleOpenDetails}
                    onSummary={handleSummary}
                    onChat={openChat}
                    loadingSummary={loadingSummary[product.id]}
                  />
                ))}
              </ProductsGrid>
            )
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Product Name</TableHeader>
                    <TableHeader>Form Number</TableHeader>
                    <TableHeader>Product Code</TableHeader>
                    <TableHeader>Effective Date</TableHeader>
                    <TableHeader align="center">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <tbody>
                  {filtered.map(product => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <strong>{product.name}</strong>
                      </TableCell>
                      <TableCell>
                        {product.formDownloadUrl ? (
                          <a
                            href={product.formDownloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#6366f1', textDecoration: 'none' }}
                          >
                            {product.formNumber || 'Download'}
                          </a>
                        ) : (
                          product.formNumber || '-'
                        )}
                      </TableCell>
                      <TableCell>{product.productCode || '-'}</TableCell>
                      <TableCell>{product.effectiveDate || '-'}</TableCell>
                      <TableCell>
                        <TableActions>
                          <IconButton onClick={() => handleOpenDetails(product)}>
                            <InformationCircleIcon width={14} height={14} />
                          </IconButton>
                          <IconButton onClick={() => handleEdit(product)}>
                            <PencilIcon width={14} height={14} />
                          </IconButton>
                          <IconButton className="danger" onClick={() => handleDelete(product.id)}>
                            <TrashIcon width={14} height={14} />
                          </IconButton>
                        </TableActions>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </TableContainer>
          )
        ) : (
          <div>
            <EmptyState
              icon={<CubeIcon style={{ width: '48px', height: '48px' }} />}
              title={searchTerm ? 'No products match your search' : 'No products yet'}
              description={
                searchTerm
                  ? `No products found for "${searchTerm}". Try adjusting your search terms, filters, or create a new product.`
                  : 'Get started by creating your first insurance product. Click "Add Product" above or use Cmd+N.'
              }
              variant="default"
            />
            {!searchTerm && products.length === 0 && (
              <>
                <QuickTips>
                  <TipCard>
                    <strong>📋 Create Product</strong>
                    Click "Add Product" to create a new insurance product with forms and coverages.
                  </TipCard>
                  <TipCard>
                    <strong>⚡ Quick Shortcut</strong>
                    Press Cmd+N to quickly create a new product from anywhere.
                  </TipCard>
                  <TipCard>
                    <strong>🔍 Search & Filter</strong>
                    Use search and filters to find products by name, form number, or code.
                  </TipCard>
                  <TipCard>
                    <strong>💬 AI Assistant</strong>
                    Use the Summary and Chat features to analyze product forms with AI.
                  </TipCard>
                </QuickTips>

                <TemplatesSection>
                  <TemplatesTitle>⚡ Quick Start with Templates</TemplatesTitle>
                  <TemplatesGrid>
                    {templates.map(template => (
                      <TemplateCard
                        key={template.code}
                        onClick={() => handleUseTemplate(template)}
                        title={`Create product from ${template.name} template`}
                      >
                        <strong>{template.name}</strong>
                        <small>{template.description}</small>
                      </TemplateCard>
                    ))}
                  </TemplatesGrid>
                </TemplatesSection>
              </>
            )}
          </div>
        )}
      </PageContent>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <Modal
          onClick={() => { setModalOpen(false); resetForm(); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
        >
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle id="product-modal-title">{editingId ? 'Edit' : 'Add'} Product</ModalTitle>
              <CloseButton
                onClick={() => { setModalOpen(false); resetForm(); }}
                aria-label="Close modal"
                title="Close (Esc)"
              >
                <XMarkIcon width={16} height={16} />
              </CloseButton>
            </ModalHeader>
            <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 180px)' }}>
              {formErrors.submit && <FormError>{formErrors.submit}</FormError>}

              <FormField>
                <FormLabel htmlFor="product-name">
                  Product Name
                  {formErrors.name && <FormLabelHint style={{ color: '#dc2626' }}>✕ {formErrors.name}</FormLabelHint>}
                </FormLabel>
                <FormInput
                  id="product-name"
                  placeholder="e.g., Commercial Property"
                  value={name}
                  onChange={e => { setName(e.target.value); if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' })); }}
                  style={{ borderColor: formErrors.name ? '#dc2626' : undefined }}
                  aria-invalid={!!formErrors.name}
                  aria-describedby={formErrors.name ? 'product-name-error' : undefined}
                />
                {formErrors.name && <div id="product-name-error" style={{ display: 'none' }}>{formErrors.name}</div>}
              </FormField>

              <FormField>
                <FormLabel>
                  Form Number
                  {formErrors.formNumber && <FormLabelHint style={{ color: '#dc2626' }}>✕ {formErrors.formNumber}</FormLabelHint>}
                </FormLabel>
                <FormInput
                  placeholder="e.g., CP 00 10"
                  value={formNumber}
                  onChange={e => { setFormNumber(e.target.value); if (formErrors.formNumber) setFormErrors(prev => ({ ...prev, formNumber: '' })); }}
                  style={{ borderColor: formErrors.formNumber ? '#dc2626' : undefined }}
                />
              </FormField>

              <FormField>
                <FormLabel>Product Code</FormLabel>
                <FormInput
                  placeholder="e.g., CPP"
                  value={productCode}
                  onChange={e => setProductCode(e.target.value)}
                />
              </FormField>

              <FormField>
                <FormLabel>
                  Effective Date
                  {formErrors.effectiveDate && <FormLabelHint style={{ color: '#dc2626' }}>✕ {formErrors.effectiveDate}</FormLabelHint>}
                </FormLabel>
                <FormInput
                  placeholder="MM/YY"
                  value={effectiveDate}
                  onChange={e => { setEffectiveDate(formatMMYY(e.target.value)); if (formErrors.effectiveDate) setFormErrors(prev => ({ ...prev, effectiveDate: '' })); }}
                  style={{ borderColor: formErrors.effectiveDate ? '#dc2626' : undefined }}
                />
              </FormField>

              <FormField>
                <FormLabel>Upload Form (PDF)</FormLabel>
                <FileInput
                  type="file"
                  accept=".pdf"
                  onChange={e => setFile(e.target.files[0])}
                />
                {file && <FileName>{file.name}</FileName>}
              </FormField>
            </div>

            <ModalActions>
              <CancelButton onClick={() => { setModalOpen(false); resetForm(); }}>
                Cancel
              </CancelButton>
              <SaveButton onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : (editingId ? 'Update' : 'Create')}
              </SaveButton>
            </ModalActions>
          </ModalContent>
        </Modal>
      )}

      {/* Enhanced Summary Modal */}
      {summaryModalOpen && modalData && (
        <Modal onClick={() => setSummaryModalOpen(false)}>
          <EnhancedModalContent onClick={e => e.stopPropagation()}>
            <StickyModalHeader>
              <EnhancedModalTitle>AI Summary</EnhancedModalTitle>
              <CloseButton onClick={() => setSummaryModalOpen(false)}>
                <XMarkIcon />
              </CloseButton>
            </StickyModalHeader>
            <ScrollableModalBody>
              <ContentSection>
                <SectionHeader>Form Category</SectionHeader>
                <p>{modalData.category || 'Not specified'}</p>
              </ContentSection>

              {Array.isArray(modalData.coverages) && modalData.coverages.length > 0 && (
                <ContentSection>
                  <SectionHeader>Coverages ({modalData.coverages.length})</SectionHeader>
                  {modalData.coverages.map((c, idx) => (
                    <div key={idx} style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                        {c.coverageName || 'Unnamed Coverage'}
                      </h3>
                      {c.scopeOfCoverage && (
                        <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>
                          {c.scopeOfCoverage}
                        </p>
                      )}
                      {c.limits && (
                        <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#4b5563' }}>
                          <strong style={{ color: '#6366f1' }}>Limits:</strong> {c.limits}
                        </p>
                      )}
                      {Array.isArray(c.perilsCovered) && c.perilsCovered.length > 0 && (
                        <p style={{ margin: '0', fontSize: '14px', color: '#4b5563' }}>
                          <strong style={{ color: '#6366f1' }}>Perils:</strong> {c.perilsCovered.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </ContentSection>
              )}

              {Array.isArray(modalData.generalConditions) && modalData.generalConditions.length > 0 && (
                <ContentSection>
                  <SectionHeader>General Conditions</SectionHeader>
                  <ul style={{ margin: '0', paddingLeft: '20px' }}>
                    {modalData.generalConditions.map((condition, idx) => (
                      <li key={idx} style={{ margin: '4px 0', fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>
                        {condition}
                      </li>
                    ))}
                  </ul>
                </ContentSection>
              )}

              {Array.isArray(modalData.generalExclusions) && modalData.generalExclusions.length > 0 && (
                <ContentSection>
                  <SectionHeader>General Exclusions</SectionHeader>
                  <ul style={{ margin: '0', paddingLeft: '20px' }}>
                    {modalData.generalExclusions.map((exclusion, idx) => (
                      <li key={idx} style={{ margin: '4px 0', fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>
                        {exclusion}
                      </li>
                    ))}
                  </ul>
                </ContentSection>
              )}
            </ScrollableModalBody>
          </EnhancedModalContent>
        </Modal>
      )}

      {/* Details Modal */}
      {detailsModalOpen && selectedProduct && (
        <Modal onClick={() => setDetailsModalOpen(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Product Details</ModalTitle>
              <CloseButton onClick={() => setDetailsModalOpen(false)}>✕</CloseButton>
            </ModalHeader>
            <DetailsList>
              <DetailItem>
                <DetailLabel>Form Number:</DetailLabel>
                <DetailValue>
                  {selectedProduct.formDownloadUrl ? (
                    <DetailLink href={selectedProduct.formDownloadUrl} target="_blank" rel="noopener noreferrer">
                      {selectedProduct.formNumber || 'Download'}
                    </DetailLink>
                  ) : (
                    selectedProduct.formNumber || '-'
                  )}
                </DetailValue>
              </DetailItem>
              <DetailItem>
                <DetailLabel>Product Code:</DetailLabel>
                <DetailValue>{selectedProduct.productCode || '-'}</DetailValue>
              </DetailItem>
              <DetailItem>
                <DetailLabel>Effective Date:</DetailLabel>
                <DetailValue>{selectedProduct.effectiveDate || '-'}</DetailValue>
              </DetailItem>
            </DetailsList>
          </ModalContent>
        </Modal>
      )}

      {/* Data Dictionary Modal */}
      <DataDictionaryModal
        open={dictModalOpen}
        onClose={() => setDictModalOpen(false)}
      />

      {/* Enhanced Chat Modal */}
      {chatModalOpen && selectedProduct && (
        <Modal onClick={() => setChatModalOpen(false)}>
          <EnhancedModalContent onClick={e => e.stopPropagation()}>
            <StickyModalHeader>
              <EnhancedModalTitle>Chat with {selectedProduct.name}</EnhancedModalTitle>
              <CloseButton onClick={() => setChatModalOpen(false)}>
                <XMarkIcon />
              </CloseButton>
            </StickyModalHeader>
            <div style={{ display: 'flex', flexDirection: 'column', height: '500px' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px 16px', background: '#f8fafc' }}>
                {chatMessages.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    color: '#6b7280',
                    fontStyle: 'italic',
                    padding: '40px 20px',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb'
                  }}>
                    Ask me anything about this insurance product. I have access to the form content to help answer your questions.
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <div key={idx} style={{
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                  }}>
                    <div style={{
                      maxWidth: '80%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: msg.role === 'user' ? '#6366f1' : '#ffffff',
                      color: msg.role === 'user' ? '#ffffff' : '#374151',
                      border: msg.role === 'user' ? 'none' : '1px solid #e5e7eb',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}>
                      {msg.role === 'user' ? (
                        msg.content
                      ) : (
                        <div style={{ color: '#374151' }}>
                          <MarkdownRenderer>{msg.content}</MarkdownRenderer>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}>
                      <LoadingSpinner />
                    </div>
                  </div>
                )}
              </div>
              <div style={{
                padding: '16px 32px 32px',
                borderTop: '1px solid #e5e7eb',
                background: '#ffffff'
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <ChatInput
                    placeholder="Ask a question about this product..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleChatSend())}
                  />
                  <ChatSendButton onClick={handleChatSend} disabled={!chatInput.trim() || chatLoading}>
                    <PaperAirplaneIcon width={16} height={16} />
                  </ChatSendButton>
                </div>
              </div>
            </div>
          </EnhancedModalContent>
        </Modal>
      )}

      {/* Data Dictionary Modal */}
      <DataDictionaryModal
        open={dictModalOpen}
        onClose={() => setDictModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmDeleteOpen}
        title="Delete Product"
        message={`Are you sure you want to delete "${products.find(p => p.id === deleteProductId)?.name || 'this product'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setConfirmDeleteOpen(false);
          setDeleteProductId(null);
        }}
      />

      {/* Toast Notifications */}
      <ToastContainer>
        {toasts.map(toast => (
          <Toast key={toast.id} $type={toast.type}>
            {toast.message}
          </Toast>
        ))}
      </ToastContainer>
    </PageContainer>
  );
});

ProductHub.displayName = 'ProductHub';

export default ProductHub;
