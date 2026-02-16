import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import styled from 'styled-components';
import {
  color, neutral, accent, semantic, space, radius, shadow,
  fontFamily, type as typeScale, transition, focusRingStyle,
} from '../ui/tokens';
import MainNavigation from './ui/Navigation';
import EnhancedHeader from './ui/EnhancedHeader';
import { PageContainer, PageContent } from './ui/PageContainer';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db, storage, functions } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import {
  TrashIcon,
  PencilIcon,
  InformationCircleIcon,
  PlusIcon,
  Squares2X2Icon,
  TableCellsIcon,
  CubeIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/solid';
import DataDictionaryModal from './DataDictionaryModal';
import ConfirmationModal from './ui/ConfirmationModal';
import useProducts from '@hooks/useProducts';
import MarkdownRenderer from '@utils/markdownParser';
import ProductCard from './ui/ProductCard';
import { normalizeFirestoreData } from '@utils/firestoreHelpers';
import VirtualizedGrid from './ui/VirtualizedGrid';
import { debounce } from '@utils/performance';
import { extractPdfText } from '@utils/pdfChunking';
import LoadingSpinner from './ui/LoadingSpinner';
import { EmptyState } from './ui/EmptyState';
import { logAuditEvent } from '@services/auditService';
import { ProductChatModal } from './modals';
import logger, { LOG_CATEGORIES } from '@utils/logger';


/* ---------- Styled Components ---------- */

const HeaderActionButton = styled.button.withConfig({
  shouldForwardProp: (prop) => !['variant'].includes(prop),
})<{ variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  background: ${props => props.variant === 'secondary' ? neutral[0] : accent[600]};
  color: ${props => props.variant === 'secondary' ? color.text : neutral[0]};
  border: ${props => props.variant === 'secondary' ? `1px solid ${neutral[200]}` : '1px solid transparent'};
  border-radius: ${radius.md};
  padding: ${space[2]} ${space[4]};
  font-weight: 500;
  font-size: ${typeScale.bodySm.size};
  font-family: ${fontFamily.sans};
  cursor: pointer;
  transition: background ${transition.fast}, border-color ${transition.fast};

  &:hover {
    background: ${props => props.variant === 'secondary' ? neutral[50] : accent[700]};
    border-color: ${props => props.variant === 'secondary' ? neutral[300] : 'transparent'};
  }

  &:focus-visible { ${focusRingStyle} }
  &:disabled { opacity: 0.45; cursor: not-allowed; }

  svg { width: 15px; height: 15px; flex-shrink: 0; }
`;

// Action Bar
const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${space[6]};
  gap: ${space[4]};
  flex-wrap: wrap;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
`;

// Filter Bar
const FilterBar = styled.div`
  display: flex;
  gap: ${space[3]};
  align-items: center;
  flex-wrap: wrap;
  padding: ${space[3]} ${space[4]};
  background: ${neutral[0]};
  border-radius: ${radius.lg};
  border: 1px solid ${neutral[200]};
  margin-bottom: ${space[5]};
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
`;

const FilterSelect = styled.select`
  padding: ${space[1.5]} ${space[3]};
  border: 1px solid ${neutral[200]};
  border-radius: ${radius.sm};
  background: ${neutral[0]};
  font-size: ${typeScale.caption.size};
  font-weight: 500;
  font-family: ${fontFamily.sans};
  color: ${color.text};
  cursor: pointer;
  transition: border-color ${transition.fast};

  &:hover { border-color: ${neutral[300]}; }
  &:focus { outline: none; border-color: ${accent[500]}; box-shadow: 0 0 0 3px ${accent[500]}1a; }
`;

const ClearFiltersButton = styled.button`
  padding: ${space[1.5]} ${space[3]};
  background: transparent;
  color: ${semantic.error};
  border: 1px solid ${neutral[200]};
  border-radius: ${radius.sm};
  font-size: ${typeScale.caption.size};
  font-weight: 500;
  font-family: ${fontFamily.sans};
  cursor: pointer;
  transition: background ${transition.fast};
  &:hover { background: ${semantic.errorLight}; }
`;

// Keyboard shortcuts hint
const KeyboardHint = styled.div`
  display: flex;
  gap: ${space[4]};
  padding: ${space[2.5]} ${space[4]};
  background: ${neutral[50]};
  border-radius: ${radius.md};
  font-size: ${typeScale.captionSm.size};
  color: ${neutral[500]};
  margin-bottom: ${space[4]};
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
`;

const KeyboardShortcut = styled.span`
  display: flex;
  align-items: center;
  gap: ${space[1]};

  kbd {
    background: ${neutral[0]};
    border: 1px solid ${neutral[200]};
    border-radius: ${radius.xs};
    padding: 1px ${space[1.5]};
    font-size: 10px;
    font-weight: 600;
    font-family: ${fontFamily.sans};
    color: ${neutral[600]};
  }
`;

// Stats Bar
const StatsBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: ${space[3]};
  margin-bottom: ${space[5]};
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
    gap: ${space[2]};
  }
`;

const StatBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space[0.5]};
  padding: ${space[3]} ${space[4]};
  background: ${neutral[0]};
  border-radius: ${radius.lg};
  border: 1px solid ${neutral[200]};
`;

const StatBoxValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${accent[500]};
`;

const StatBoxLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${neutral[500]};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

// Bulk Actions Toolbar
const BulkActionsToolbar = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[4]};
  padding: ${space[3]} ${space[4]};
  background: ${accent[50]};
  border-radius: ${radius.md};
  border: 1px solid ${accent[200]};
  margin-bottom: ${space[4]};
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
  color: ${accent[600]};
`;

const BulkActionButton = styled.button`
  padding: ${space[2]} ${space[3]};
  background: ${accent[600]};
  color: ${neutral[0]};
  border: none;
  border-radius: ${radius.sm};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all ${transition.fast};

  &:hover {
    background: ${accent[700]};
    box-shadow: ${shadow.sm};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

// AI Suggestions Banner
const SuggestionsBanner = styled.div`
  padding: ${space[4]};
  background: ${semantic.infoLight};
  border-radius: ${radius.md};
  border: 1px solid ${semantic.info}33;
  margin-bottom: ${space[4]};
`;

const SuggestionsTitle = styled.div`
  font-size: ${typeScale.caption.size};
  font-weight: 600;
  color: ${semantic.infoDark};
  margin-bottom: ${space[2]};
  display: flex;
  align-items: center;
  gap: ${space[1.5]};
`;

const SuggestionsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: ${space[1.5]};

  li {
    font-size: 12px;
    color: ${semantic.infoDark};
    padding-left: 20px;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      width: 16px;
      height: 16px;
      background: currentColor;
      mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18' /%3E%3C/svg%3E");
      mask-size: contain;
      mask-repeat: no-repeat;
    }
  }
`;

// Toast notification
const ToastContainer = styled.div`
  position: fixed;
  bottom: ${space[6]};
  right: ${space[6]};
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: ${space[2]};
  max-width: 380px;

  @media (max-width: 640px) {
    bottom: ${space[4]};
    right: ${space[4]};
    left: ${space[4]};
    max-width: none;
  }
`;

const Toast = styled.div<{ $type?: 'success' | 'error' | 'info' }>`
  padding: ${space[3]} ${space[4]};
  border-radius: ${radius.md};
  background: ${props => {
    switch (props.$type) {
      case 'success': return semantic.successLight;
      case 'error': return semantic.errorLight;
      case 'info': return semantic.infoLight;
      default: return neutral[100];
    }
  }};
  border: 1px solid ${props => {
    switch (props.$type) {
      case 'success': return `${semantic.success}33`;
      case 'error': return `${semantic.error}33`;
      case 'info': return `${semantic.info}33`;
      default: return neutral[200];
    }
  }};
  color: ${props => {
    switch (props.$type) {
      case 'success': return semantic.successDark;
      case 'error': return semantic.errorDark;
      case 'info': return semantic.infoDark;
      default: return color.text;
    }
  }};
  font-size: ${typeScale.bodySm.size};
  font-weight: 500;
  box-shadow: ${shadow.md};
`;

const ActionGroup = styled.div`
  display: flex;
  gap: ${space[3]};
  align-items: center;
`;

// Unified Command Bar
const CommandBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space[4]};
  margin-bottom: ${space[6]};
  padding: ${space[3]} ${space[4]};
  background: ${neutral[0]};
  border-radius: ${radius.lg};
  border: 1px solid ${neutral[200]};
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
`;

const CommandBarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[3]};
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
  gap: ${space[3]};
`;

const SearchWrapper = styled.div`
  width: 100%;
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchInputStyled = styled.input`
  width: 100%;
  padding: ${space[2.5]} ${space[4]} ${space[2.5]} ${space[10]};
  background: ${neutral[50]};
  border: 1px solid ${neutral[200]};
  border-radius: ${radius.md};
  font-size: ${typeScale.bodySm.size};
  font-family: ${fontFamily.sans};
  color: ${color.text};
  transition: border-color ${transition.fast}, box-shadow ${transition.fast};

  &::placeholder { color: ${neutral[400]}; }
  &:hover { border-color: ${neutral[300]}; }
  &:focus { outline: none; border-color: ${accent[500]}; box-shadow: 0 0 0 3px ${accent[500]}1a; }
`;

const SearchIconWrapper = styled.div`
  position: absolute;
  left: ${space[3]};
  top: 50%;
  transform: translateY(-50%);
  color: ${neutral[400]};
  pointer-events: none;
  display: flex;
  svg { width: 16px; height: 16px; }
`;

const ViewToggleGroup = styled.div`
  display: flex;
  gap: 1px;
  background: ${neutral[100]};
  padding: 3px;
  border-radius: ${radius.md};
`;

const ViewToggleButton = styled.button.withConfig({
  shouldForwardProp: (prop) => !['active'].includes(prop),
})<{ active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${space[1]};
  padding: ${space[1.5]} ${space[3]};
  border: none;
  border-radius: ${radius.sm};
  background: ${({ active }) => active ? neutral[0] : 'transparent'};
  color: ${({ active }) => active ? color.text : neutral[500]};
  font-size: ${typeScale.caption.size};
  font-weight: 500;
  font-family: ${fontFamily.sans};
  cursor: pointer;
  transition: background ${transition.fast}, color ${transition.fast};
  box-shadow: ${({ active }) => active ? shadow.xs : 'none'};

  svg { width: 14px; height: 14px; }
  &:hover { color: ${({ active }) => active ? color.text : neutral[700]}; }
`;

const AddProductButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  padding: ${space[2]} ${space[4]};
  background: ${accent[600]};
  color: ${neutral[0]};
  border: none;
  border-radius: ${radius.md};
  font-size: ${typeScale.bodySm.size};
  font-weight: 500;
  font-family: ${fontFamily.sans};
  cursor: pointer;
  transition: background ${transition.fast};
  white-space: nowrap;

  svg { width: 15px; height: 15px; }
  &:hover { background: ${accent[700]}; }
  &:focus-visible { ${focusRingStyle} }
`;

const ProductsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${space[5]};
  margin-bottom: ${space[12]};
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: ${space[4]};
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: ${space[4]};
    margin-bottom: ${space[10]};
  }

  @media (max-width: 480px) {
    gap: ${space[3]};
  }
`;

// Table Container for table view
const TableContainer = styled.div`
  background: ${neutral[0]};
  border-radius: ${radius.xl};
  padding: ${space[6]};
  border: 1px solid ${neutral[200]};
  box-shadow: ${shadow.card};
  overflow: hidden;
  margin-bottom: ${space[16]};
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background: ${neutral[50]};
`;

const TableRow = styled.tr`
  border-bottom: 1px solid ${neutral[200]};
  transition: background ${transition.fast};
  cursor: pointer;

  &:hover {
    background: ${neutral[50]};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const TableHeader = styled.th`
  padding: ${space[4]} ${space[3]};
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: ${neutral[500]};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const TableCell = styled.td`
  padding: ${space[4]} ${space[3]};
  font-size: 14px;
  color: ${color.text};
  vertical-align: middle;
`;

const TableActions = styled.div`
  display: flex;
  gap: ${space[2]};
  justify-content: center;
`;

// Removed duplicate styled components - now using separate ProductCard component

// Keep IconButton for table view
const IconButton = styled.button`
  width: 36px;
  height: 36px;
  border: none;
  border-radius: ${radius.lg};
  background: ${neutral[50]};
  color: ${neutral[500]};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${transition.fast};
  border: 1px solid ${neutral[200]};

  &:hover {
    background: ${accent[50]};
    color: ${accent[600]};
    border-color: ${accent[200]};
  }

  &.danger:hover {
    background: ${semantic.errorLight};
    color: ${semantic.error};
    border-color: ${semantic.error}33;
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
  gap: ${space[2]};
  padding: ${space[2.5]} ${space[4]};
  background: ${accent[600]};
  color: ${neutral[0]};
  border: none;
  border-radius: ${radius.md};
  font-size: 14px;
  font-weight: 600;
  font-family: ${fontFamily.sans};
  cursor: pointer;
  transition: background ${transition.fast};

  &:hover {
    background: ${accent[700]};
  }

  &:focus-visible { ${focusRingStyle} }

  @media (max-width: 768px) {
    padding: ${space[2]} ${space[3]};
    font-size: 12px;
  }
`;

/* ---------- modal components ---------- */
const Modal = styled.div`
  position: fixed;
  inset: 0;
  background: ${color.overlay};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${space[5]};
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: ${neutral[0]};
  border-radius: ${radius.xl};
  padding: 0;
  width: 100%;
  max-width: 650px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: ${shadow.overlay};
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
  box-shadow: ${shadow.overlay};
  display: flex;
  flex-direction: column;
`;

const StickyModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${space[6]} ${space[8]};
  border-bottom: 1px solid ${neutral[200]};
  background: ${neutral[0]};
  position: sticky;
  top: 0;
  z-index: 10;
`;

const EnhancedModalTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${color.text};
  letter-spacing: -0.01em;
`;

const ScrollableModalBody = styled.div`
  max-height: 70vh;
  overflow-y: auto;
  padding: ${space[8]};
  background: ${neutral[0]};

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: ${neutral[100]}; }
  &::-webkit-scrollbar-thumb { background: ${neutral[300]}; border-radius: 3px; }
  &::-webkit-scrollbar-thumb:hover { background: ${neutral[400]}; }
`;

const AIContentContainer = styled.div`
  h1, h2 {
    font-size: 20px;
    font-weight: 700;
    color: ${color.text};
    margin: 0 0 ${space[4]} 0;
    line-height: 1.3;
  }

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: ${neutral[700]};
    margin: ${space[6]} 0 ${space[3]} 0;
    line-height: 1.4;
  }

  p {
    font-size: 14px;
    color: ${neutral[600]};
    line-height: 1.6;
    margin: 0 0 ${space[4]} 0;
  }

  strong, b {
    font-weight: 600;
    color: ${neutral[700]};
  }

  ul, ol {
    margin: ${space[4]} 0;
    padding-left: ${space[5]};
  }

  li {
    font-size: 14px;
    color: ${neutral[600]};
    line-height: 1.6;
    margin: ${space[1]} 0;
  }

  > * + * {
    margin-top: ${space[4]};
  }
`;

const ContentSection = styled.div`
  margin-bottom: ${space[8]};
  padding: ${space[6]};
  background: ${neutral[50]};
  border-radius: ${radius.lg};
  border: 1px solid ${neutral[200]};

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionHeader = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${neutral[700]};
  margin: 0 0 ${space[4]} 0;
  padding-bottom: ${space[2]};
  border-bottom: 2px solid ${neutral[200]};
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${space[6]} ${space[6]} 0;
  margin-bottom: ${space[6]};
  position: relative;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${color.text};
`;

const CloseButton = styled.button`
  position: absolute;
  top: ${space[4]};
  right: ${space[4]};
  width: 32px;
  height: 32px;
  border: none;
  border-radius: ${radius.md};
  background: ${neutral[100]};
  color: ${neutral[500]};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${transition.fast};
  z-index: 20;

  &:hover {
    background: ${neutral[200]};
    color: ${neutral[700]};
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
  margin-bottom: ${space[6]};
  padding: 0 ${space[6]};

  &:last-of-type {
    margin-bottom: 0;
  }
`;

const FormLabel = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: ${color.text};
  margin-bottom: ${space[2]};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FormLabelHint = styled.span`
  display: block;
  font-size: 12px;
  font-weight: 400;
  color: ${neutral[500]};
  text-transform: none;
  letter-spacing: normal;
  margin-top: ${space[1]};
`;

const FormInput = styled.input`
  width: 100%;
  padding: ${space[3]} ${space[4]};
  border: 1px solid ${neutral[200]};
  border-radius: ${radius.md};
  font-size: 14px;
  font-family: ${fontFamily.sans};
  color: ${color.text};
  background: ${neutral[0]};
  transition: border-color ${transition.fast}, box-shadow ${transition.fast};

  &:focus {
    outline: none;
    border-color: ${accent[500]};
    box-shadow: 0 0 0 3px ${accent[500]}1a;
  }

  &::placeholder {
    color: ${neutral[400]};
  }

  &:disabled {
    background: ${neutral[100]};
    color: ${neutral[400]};
    cursor: not-allowed;
  }
`;

const FileInput = styled.input`
  width: 100%;
  padding: ${space[3]} ${space[4]};
  border: 1px solid ${neutral[200]};
  border-radius: ${radius.md};
  font-size: 14px;
  color: ${color.text};
  background: ${neutral[0]};
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${accent[500]};
    box-shadow: 0 0 0 3px ${accent[500]}1a;
  }
`;

const FileName = styled.div`
  margin-top: ${space[2]};
  font-size: 12px;
  color: ${neutral[500]};
  padding: ${space[2]} ${space[3]};
  background: ${neutral[50]};
  border-radius: ${radius.sm};
`;

const ModalActions = styled.div`
  display: flex;
  gap: ${space[3]};
  padding: ${space[6]};
  justify-content: flex-end;
  border-top: 1px solid ${neutral[200]};
  background: ${neutral[50]};
`;

const SaveButton = styled.button`
  padding: ${space[3]} ${space[6]};
  background: ${accent[600]};
  color: ${neutral[0]};
  border: none;
  border-radius: ${radius.md};
  font-weight: 600;
  font-size: 14px;
  font-family: ${fontFamily.sans};
  cursor: pointer;
  transition: background ${transition.fast};

  &:hover:not(:disabled) {
    background: ${accent[700]};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CancelButton = styled.button`
  padding: ${space[3]} ${space[6]};
  background: ${neutral[0]};
  color: ${neutral[600]};
  border: 1px solid ${neutral[200]};
  border-radius: ${radius.md};
  font-weight: 600;
  font-size: 14px;
  font-family: ${fontFamily.sans};
  cursor: pointer;
  transition: all ${transition.fast};

  &:hover {
    background: ${neutral[50]};
    color: ${neutral[700]};
    border-color: ${neutral[300]};
  }
`;

const FormError = styled.div`
  padding: ${space[3]} ${space[4]};
  background: ${semantic.errorLight};
  border: 1px solid ${semantic.error}33;
  border-radius: ${radius.md};
  color: ${semantic.error};
  font-size: 13px;
  font-weight: 500;
  margin-bottom: ${space[5]};
`;

/* ---------- details modal components ---------- */
const DetailsList = styled.div`
  padding: 0 ${space[6]} ${space[6]};
`;

const DetailItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${space[3]} 0;
  border-bottom: 1px solid ${neutral[100]};

  &:last-child {
    border-bottom: none;
  }
`;

const DetailLabel = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${neutral[700]};
`;

const DetailValue = styled.div`
  font-size: 14px;
  color: ${neutral[500]};
`;

const DetailLink = styled.a`
  color: ${accent[600]};
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

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
  // Fetch all products including archived
  const { data: products, loading, error } = useProducts({ enableCache: true, maxResults: 500, includeArchived: true });
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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // AI states
  const [loadingSummary, setLoadingSummary] = useState({});
  const [modalData, setModalData] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

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
    debounce((term: string) => {
      setSearchTerm(term.trim());
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSetSearchTerm(rawSearch);
  }, [rawSearch, debouncedSetSearchTerm]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
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
  // Always show archived products after active ones
  const filtered = useMemo(() => {
    let result = [...products];

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

    // Separate active and archived products
    const activeProducts = result.filter(p => !p.archived);
    const archivedProducts = result.filter(p => p.archived);

    // Apply sorting to each group separately
    const sortFn = (a, b) => {
      switch (sortBy) {
        case 'date':
          return (b.updatedAt?.getTime?.() || 0) - (a.updatedAt?.getTime?.() || 0);
        case 'coverage-count':
          return (b.coverageCount || 0) - (a.coverageCount || 0);
        case 'name':
        default:
          return (a.name || '').localeCompare(b.name || '');
      }
    };

    // Sort each group and combine with active first, then archived
    return [...activeProducts.sort(sortFn), ...archivedProducts.sort(sortFn)];
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

  const handleArchive = useCallback((id) => {
    setDeleteProductId(id);
    setConfirmDeleteOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteProductId) return;

    setIsDeleting(true);
    try {
      const product = products.find(p => p.id === deleteProductId);
      const isArchiving = !product?.archived;

      await updateDoc(doc(db, 'products', deleteProductId), {
        archived: isArchiving,
        updatedAt: new Date()
      });

      // Log audit event
      await logAuditEvent(isArchiving ? 'ARCHIVE' : 'UNARCHIVE', 'PRODUCT', deleteProductId, {
        entityName: product?.name,
        reason: 'User-initiated action'
      });

      showToast(
        `Product "${product?.name}" ${isArchiving ? 'archived' : 'unarchived'} successfully`,
        'success'
      );
      setConfirmDeleteOpen(false);
      setDeleteProductId(null);
    } catch (error) {
      logger.error(LOG_CATEGORIES.DATA, 'Archive action failed', { productId: deleteProductId }, error as Error);
      showToast('Failed to update product. Please try again.', 'error');
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
      logger.debug(LOG_CATEGORIES.AI, 'Starting PDF extraction', { productId: id });

      // Extract text from PDF using centralized utility
      const text = await extractPdfText(url);

      logger.debug(LOG_CATEGORIES.AI, 'PDF text extracted', {
        textLength: text?.length || 0,
        trimmedLength: text?.trim().length || 0
      });

      // Validate extracted text
      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from the PDF');
      }

      // Keep first ~100k tokens to stay safely under GPT limit
      const snippet = text.split(/\s+/).slice(0, 100000).join(' ');

      logger.debug(LOG_CATEGORIES.AI, 'Text snippet created', {
        snippetLength: snippet.length,
        trimmedSnippetLength: snippet.trim().length
      });

      // Validate snippet before sending
      if (!snippet || snippet.trim().length < 50) {
        throw new Error('Extracted text is too short to generate a meaningful summary');
      }

      // Estimate payload size (rough approximation)
      const payloadSize = new Blob([snippet]).size;
      const payloadSizeMB = (payloadSize / (1024 * 1024)).toFixed(2);

      logger.debug(LOG_CATEGORIES.AI, 'Sending PDF text to AI', {
        originalLength: text.length,
        snippetLength: snippet.length,
        wordCount: snippet.split(/\s+/).length,
        payloadSizeMB: payloadSizeMB
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

      logger.debug(LOG_CATEGORIES.AI, 'Calling Cloud Function', {
        pdfTextLength: payload.pdfText.length,
        hasSystemPrompt: !!payload.systemPrompt
      });

      const result = await generateSummary(payload);

      const resData = result.data as { success?: boolean; content?: string };
      if (!resData.success) {
        throw new Error('Failed to generate summary');
      }

      // Clean response
      const cleaned = (resData.content ?? '')
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
      logger.error(LOG_CATEGORIES.AI, 'Summary generation failed', { productId: id }, err as Error);
      alert(err.message || 'Summary failed.');
    } finally {
      setLoadingSummary(prev => ({ ...prev, [id]: false }));
    }
  };

  const openChat = (product) => {
    setSelectedProduct(product);
    setChatModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setFormNumber('');
    setProductCode('');
    setEffectiveDate('');
    setFile(null);
  };

  // Format MM/YY input with auto-slash insertion
  const formatEffectiveDate = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Limit to 4 digits (MMYY)
    const limited = digits.slice(0, 4);

    // Auto-insert slash after 2 digits
    if (limited.length >= 2) {
      return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    }
    return limited;
  };

  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!name?.trim()) errors.name = 'Product name is required';
    if (!formNumber?.trim()) errors.formNumber = 'Form number is required';
    if (!effectiveDate?.trim()) errors.effectiveDate = 'Effective date is required';
    if (effectiveDate && !/^\d{2}\/\d{2}$/.test(effectiveDate)) {
      errors.effectiveDate = 'Please enter MM/YY format';
    } else if (effectiveDate) {
      const [month] = effectiveDate.split('/').map(Number);
      if (month < 1 || month > 12) {
        errors.effectiveDate = 'Month must be 01-12';
      }
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
      logger.error(LOG_CATEGORIES.DATA, 'Save failed', { productName: name }, error as Error);
      setFormErrors({ submit: 'Failed to save product. Please try again.' });
      showToast('Failed to save product. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer withOverlay={true}>
        <MainNavigation />
        <PageContent>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <LoadingSpinner type="circular" size="40px" />
            <p style={{ marginTop: space[4], color: neutral[500], fontSize: '14px' }}>Loading products...</p>
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
        {/* Page Header */}
        <EnhancedHeader
          title="Product Hub"
          subtitle={`Explore and manage ${filtered.length} active product line${filtered.length !== 1 ? 's' : ''}`}
          icon={CubeIcon}
        />

        {/* Command Bar with Search, Toggle, and Add */}
        <CommandBar>
          <CommandBarLeft>
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
          </CommandBarLeft>

          <CommandBarCenter>
            <SearchWrapper>
              <SearchIconWrapper>
                <MagnifyingGlassIcon />
              </SearchIconWrapper>
              <SearchInputStyled
                type="text"
                placeholder="Search products..."
                value={rawSearch}
                onChange={(e) => setRawSearch(e.target.value)}
                aria-label="Search by product name, form number, or code"
              />
            </SearchWrapper>
          </CommandBarCenter>

          <CommandBarRight>
            <AddProductButton onClick={() => setModalOpen(true)}>
              <PlusIcon />
              Add Product
            </AddProductButton>
          </CommandBarRight>
        </CommandBar>

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
                    onArchive={handleArchive}
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
                    onArchive={handleArchive}
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
                            style={{ color: accent[600], textDecoration: 'none' }}
                          >
                            {product.formNumber || 'Download'}
                          </a>
                        ) : (
                          product.formNumber || '-'
                        )}
                      </TableCell>
                      <TableCell>{product.productCode || '-'}</TableCell>
                      <TableCell>{product.effectiveDate ? String(product.effectiveDate) : '-'}</TableCell>
                      <TableCell>
                        <TableActions>
                          <IconButton onClick={() => handleOpenDetails(product)}>
                            <InformationCircleIcon width={14} height={14} />
                          </IconButton>
                          {!product.archived && (
                            <IconButton onClick={() => handleEdit(product)}>
                              <PencilIcon width={14} height={14} />
                            </IconButton>
                          )}
                          <IconButton className="danger" onClick={() => handleArchive(product.id)}>
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
                  {formErrors.name && <FormLabelHint style={{ color: semantic.error }}>✕ {formErrors.name}</FormLabelHint>}
                </FormLabel>
                <FormInput
                  id="product-name"
                  placeholder="e.g., Commercial Property"
                  value={name}
                  onChange={e => { setName(e.target.value); if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' })); }}
                  style={{ borderColor: formErrors.name ? semantic.error : undefined }}
                  aria-invalid={!!formErrors.name}
                  aria-describedby={formErrors.name ? 'product-name-error' : undefined}
                />
                {formErrors.name && <div id="product-name-error" style={{ display: 'none' }}>{formErrors.name}</div>}
              </FormField>

              <FormField>
                <FormLabel>
                  Form Number
                  {formErrors.formNumber && <FormLabelHint style={{ color: semantic.error }}>✕ {formErrors.formNumber}</FormLabelHint>}
                </FormLabel>
                <FormInput
                  placeholder="e.g., CP 00 10"
                  value={formNumber}
                  onChange={e => { setFormNumber(e.target.value); if (formErrors.formNumber) setFormErrors(prev => ({ ...prev, formNumber: '' })); }}
                  style={{ borderColor: formErrors.formNumber ? semantic.error : undefined }}
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
                  {formErrors.effectiveDate && <FormLabelHint style={{ color: semantic.error }}>✕ {formErrors.effectiveDate}</FormLabelHint>}
                </FormLabel>
                <FormInput
                  placeholder="MM/YY"
                  maxLength={5}
                  value={effectiveDate}
                  onChange={e => { setEffectiveDate(formatEffectiveDate(e.target.value)); if (formErrors.effectiveDate) setFormErrors(prev => ({ ...prev, effectiveDate: '' })); }}
                  style={{ borderColor: formErrors.effectiveDate ? semantic.error : undefined }}
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
                    <div key={idx} style={{ marginBottom: space[6], paddingBottom: space[4], borderBottom: `1px solid ${neutral[200]}` }}>
                      <h3 style={{ margin: `0 0 ${space[3]} 0`, fontSize: '16px', fontWeight: '600', color: color.text }}>
                        {c.coverageName || 'Unnamed Coverage'}
                      </h3>
                      {c.scopeOfCoverage && (
                        <p style={{ margin: `0 0 ${space[2]} 0`, fontSize: '14px', color: neutral[600], lineHeight: '1.6' }}>
                          {c.scopeOfCoverage}
                        </p>
                      )}
                      {c.limits && (
                        <p style={{ margin: `0 0 ${space[2]} 0`, fontSize: '14px', color: neutral[600] }}>
                          <strong style={{ color: accent[600] }}>Limits:</strong> {c.limits}
                        </p>
                      )}
                      {Array.isArray(c.perilsCovered) && c.perilsCovered.length > 0 && (
                        <p style={{ margin: '0', fontSize: '14px', color: neutral[600] }}>
                          <strong style={{ color: accent[600] }}>Perils:</strong> {c.perilsCovered.join(', ')}
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

      {/* Modern Product Chat Modal */}
      <ProductChatModal
        isOpen={chatModalOpen}
        onClose={() => setChatModalOpen(false)}
        product={selectedProduct}
      />

      {/* Archive/Unarchive Confirmation Modal */}
      {(() => {
        const product = products.find(p => p.id === deleteProductId);
        const isArchiving = !product?.archived;
        return (
          <ConfirmationModal
            isOpen={confirmDeleteOpen}
            title={isArchiving ? "Archive Product" : "Unarchive Product"}
            message={`Are you sure you want to ${isArchiving ? 'archive' : 'unarchive'} "${product?.name || 'this product'}"? ${isArchiving ? 'Archived products will not appear in search or AI features.' : 'This product will be available again in search and AI features.'}`}
            confirmText={isArchiving ? "Archive" : "Unarchive"}
            cancelText="Cancel"
            isDangerous={isArchiving}
            isLoading={isDeleting}
            onConfirm={handleConfirmDelete}
            onCancel={() => {
              setConfirmDeleteOpen(false);
              setDeleteProductId(null);
            }}
          />
        );
      })()}

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
