// src/components/CoverageScreen.js
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation, Link as RouterLink, Link } from 'react-router-dom';
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
import { db, storage, auth } from '../firebase';
import useCoverages from '../hooks/useCoverages';

import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';
import MainNavigation from '../components/ui/Navigation';
import VersionControlSidebar from './VersionControlSidebar';
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
  ClockIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  MapIcon,
  Squares2X2Icon,
  LinkIcon,
  TableCellsIcon
} from '@heroicons/react/24/solid';
import { ArrowDownTrayIcon as DownloadIcon20, ArrowUpTrayIcon as UploadIcon20 } from '@heroicons/react/20/solid';
import { makeCoverageSheet, sheetToCoverageObjects } from '../utils/xlsx';

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

// Header Section - Horizontal layout with breadcrumb and title
const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  gap: 24px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
`;

const PageTitle = styled.h1`
  font-size: 36px;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: -0.025em;
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: 28px;
    white-space: normal;
  }
`;

// Breadcrumb navigation - Modern design
const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #64748b;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  padding: 12px 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  width: fit-content;

  a {
    color: #6366f1;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover {
      color: #4f46e5;
      text-decoration: underline;
    }
  }

  span {
    color: #94a3b8;
    font-weight: 400;
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

// Action Bar - Modern design
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

const ViewToggleButton = styled.button`
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

// Table Container for table view
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

  &:hover {
    background: rgba(99, 102, 241, 0.02);
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

// Coverage Group - Contains parent and its sub-coverages
const CoverageGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 8px;
`;

// Sub-coverage Container with visual connector
const SubCoverageContainer = styled.div`
  position: relative;
  margin-left: 32px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  &::before {
    content: '';
    position: absolute;
    left: -16px;
    top: 20px;
    width: 12px;
    height: 2px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
    border-radius: 1px;
  }

  &::after {
    content: '';
    position: absolute;
    left: -20px;
    top: -20px;
    width: 2px;
    height: 42px;
    background: linear-gradient(180deg, #6366f1, #8b5cf6);
    border-radius: 1px;
  }

  ${({ isExpanded }) => isExpanded ? `
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
  padding: 20px;
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
const CoverageCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    border-color: #6366f1;
  }

  ${({ isSubCoverage }) => isSubCoverage && `
    background: #f8fafc;
    border-left: 3px solid #6366f1;
    margin-left: 0;
  `}
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
`;

const CardTitle = styled.h3`
  font-size: 20px;
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
  margin-bottom: 16px;
`;

const CardCategory = styled.div`
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
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const CardMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-top: 20px;
`;

const MetricItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(248, 250, 252, 0.8);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(226, 232, 240, 0.5);
  font-weight: 500;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.2);
  }

  svg {
    width: 18px;
    height: 18px;
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
  margin-left: 12px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(99, 102, 241, 0.2);

  &:hover {
    background: rgba(99, 102, 241, 0.2);
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
  }
`;

const ParentInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(99, 102, 241, 0.05);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #6366f1;
  font-weight: 500;
  backdrop-filter: blur(8px);

  svg {
    width: 16px;
    height: 16px;
  }
`;

const SubCoverageCount = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 12px;
  border: 1px solid rgba(34, 197, 94, 0.2);
  text-transform: uppercase;
  letter-spacing: 0.025em;

  svg {
    width: 14px;
    height: 14px;
  }
`;

// History button - Modern floating design
const HistoryButton = styled.button`
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 64px;
  height: 64px;
  border: none;
  border-radius: 20px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 32px rgba(99, 102, 241, 0.3);
  cursor: pointer;
  z-index: 1100;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);

  &:hover {
    transform: translateY(-4px) scale(1.05);
    box-shadow: 0 20px 40px rgba(99, 102, 241, 0.4);
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  }

  svg {
    width: 24px;
    height: 24px;
  }
`;

const VcBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(4px);
  z-index: 1090;
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

/* ---------- helpers ---------- */
const logVersionChange = async (productId, payload) => {
  await addDoc(collection(db, 'products', productId, 'versionHistory'), {
    userEmail: auth.currentUser?.email || 'unknown',
    ts: serverTimestamp(),
    entityType: 'Coverage',
    ...payload
  });
};

const fmtMoney = n => {
  if (n === '' || n === null || n === undefined) return '';
  const num = Number(String(n).replace(/[^0-9]/g, ''));
  return Number.isFinite(num) ? num.toLocaleString('en-US') : '';
};

/* ---------- main component ---------- */
export default function CoverageScreen() {
  const { productId } = useParams();
  const location = useLocation();

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
  const [productName, setProductName] = useState('');
  const [parentCoverageName, setParentCoverageName] = useState('');

  const fileInputRef = useRef(null);
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

  // View mode state - Default to card view
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

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
        (parent.coverageCode || '').toLowerCase().includes(q) ||
        (parent.category || '').toLowerCase().includes(q);

      const children = childrenMap[parent.id] || [];
      const matchingChildren = children.filter(child =>
        (child.name || '').toLowerCase().includes(q) ||
        (child.coverageCode || '').toLowerCase().includes(q) ||
        (child.category || '').toLowerCase().includes(q)
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
  const [historyOpen, setHistoryOpen] = useState(false);

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

  /* ---------- effect: load meta (forms + names) ---------- */
  const loadMeta = useCallback(async () => {
    if (!productId) return;
    setMetaLoading(true);
    try {
      // forms
      const formsSnap = await getDocs(
        query(collection(db, 'forms'), where('productId', '==', productId))
      );
      const list = await Promise.all(
        formsSnap.docs.map(async d => {
          const data = d.data();
          let url = null;
          if (data.filePath) {
            try { url = await getDownloadURL(ref(storage, data.filePath)); } catch {}
          }
          return { ...data, id: d.id, downloadUrl: url };
        })
      );
      setForms(list);

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
  const resetForm = () => {
    setFormState({ name:'', coverageCode:'', formIds:[], limits:[], deductibles:[], states:[], category:'' });
    setEditingId(null); setChangeSummary('');
  };
  const openEditModal = c => {
    setFormState({
      name: c.name || '', coverageCode: c.coverageCode || '',
      formIds: c.formIds || [], limits: c.limits || [],
      deductibles: c.deductibles || [], states: c.states || [],
      category: c.category || ''
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

  // XLSX import implementation
  const handleImportXLSX = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // parse workbook
      const XLSXmod = await import('xlsx');
      const XLSX = XLSXmod.default || XLSXmod;
      const buf = await file.arrayBuffer();
      const workbook = XLSX.read(buf, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = sheetToCoverageObjects(sheet); // includes parentCoverageCode, Category, states columns

      // enrich rows: derive category + states array
      const ALL_STATES = [ 'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY' ];
      const enriched = rows.map(r => {
        const category = r['Category'] || r.category || '';
        const states = ALL_STATES.filter(st => {
          const v = r[st];
          if (v === undefined || v === null) return false;
          const s = String(v).trim().toLowerCase();
          return ['y','yes','1','true'].includes(s);
        });
        return { ...r, category, states };
      });

      // validate
      const bad = enriched.filter(r => !r.name || !r.coverageCode);
      if (bad.length) {
        alert('Rows missing Coverage Name or Coverage Code. Fix sheet and retry.');
        return;
      }

      // map existing codes to IDs
      const codeToId = {};
      const codes = enriched.map(r => r.coverageCode);
      const chunkArr = (a, n) => {
        const out = [];
        for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
        return out;
      };
      for (const slice of chunkArr(codes, 10)) {
        const snap = await getDocs(
          query(
            collection(db, `products/${productId}/coverages`),
            where('coverageCode', 'in', slice)
          )
        );
        snap.docs.forEach(d => {
          codeToId[d.data().coverageCode] = d.id;
        });
      }

      // Only create new coverages, skip existing ones
      let batch = writeBatch(db), opCount = 0;
      const commitIfFull = async () => {
        if (opCount >= 450) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      };
      for (const r of enriched) {
        // skip if coverageCode already exists
        if (codeToId[r.coverageCode]) {
          continue;
        }
        const parentId = r.parentCoverageCode ? codeToId[r.parentCoverageCode] || null : null;
        const newRef = doc(collection(db, `products/${productId}/coverages`));
        const data = {
          ...r,
          productId,
          parentCoverageId: parentId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        batch.set(newRef, data);
        codeToId[r.coverageCode] = newRef.id; // so later rows can link as parent
        opCount++;
        await commitIfFull();
      }
      await batch.commit();
      reloadCoverages();
      alert('Import complete – new coverages added!');
    } catch (err) {
      console.error(err);
      alert('Import failed: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

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

  const openLinkFormsModal = c => {
    setSelectedCoverageForForms(c);
    setLinkFormIds(c.formIds || []);
    setLinkFormsModalOpen(true);
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this coverage?')) return;
    try {
      await deleteDoc(doc(db, `products/${productId}/coverages`, id));
      await reloadCoverages();
      await logVersionChange(productId, {
        entityId: id,
        entityName: 'Coverage',
        action: 'delete'
      });
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const saveLinkedForms = async () => {
    if (!selectedCoverageForForms) return;
    try {
      const coverage = selectedCoverageForForms;
      const desired = new Set(linkFormIds);
      // fetch existing links
      const existingSnap = await getDocs(
        query(
          collection(db, 'formCoverages'),
          where('coverageId', '==', coverage.id),
          where('productId', '==', productId)
        )
      );
      const batch = writeBatch(db);
      // remove deselected
      existingSnap.docs.forEach(d => {
        if (!desired.has(d.data().formId)) batch.delete(d.ref);
      });
      // add new
      const existingIds = new Set(existingSnap.docs.map(d => d.data().formId));
      desired.forEach(fid => {
        if (!existingIds.has(fid)) {
          const linkRef = doc(collection(db, 'formCoverages'));
          batch.set(linkRef, { formId: fid, coverageId: coverage.id, productId });
        }
      });
      // update coverage.formIds
      batch.update(
        doc(db, `products/${productId}/coverages`, coverage.id),
        { formIds: [...desired] }
      );
      await batch.commit();
      setLinkFormsModalOpen(false);
      await reloadCoverages();
    } catch (err) {
      console.error(err);
      alert('Failed to save linked forms: ' + err.message);
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
        category: formState.category,
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
      <Container>
        <MainNavigation />
        <MainContent>
          <LoadingContainer>
            <Spinner />
          </LoadingContainer>
        </MainContent>
      </Container>
    );
  }

  if (coveragesError) {
    return (
      <Container>
        <MainNavigation />
        <MainContent>
          <EmptyState>
            <EmptyStateTitle>Error Loading Coverages</EmptyStateTitle>
            <EmptyStateText>There was an error loading the coverage data. Please try refreshing the page.</EmptyStateText>
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          </EmptyState>
        </MainContent>
      </Container>
    );
  }

  /* ---------- UI ---------- */
  return (
    <Container>
      <MainNavigation />
      <MainContent>
        <HeaderSection>
          <Breadcrumb>
            <Link to="/">Home</Link>
            <span>›</span>
            <Link to="/products">Products</Link>
            <span>›</span>
            <span>Coverages</span>
          </Breadcrumb>
          <PageTitle>
            {parentCoverageId ? (
              <>
                <RouterLink to={`/coverage/${productId}`}>{productName}</RouterLink> › {parentCoverageName}
              </>
            ) : productName} Coverages
          </PageTitle>
        </HeaderSection>

        <SearchContainer>
          <SearchIcon />
          <SearchInput
            placeholder="Search coverages by name, code, or category..."
            ref={searchRef}
            value={rawSearch}
            onChange={e => setRawSearch(e.target.value)}
          />
        </SearchContainer>

        <ActionBar>
          <ActionGroup>
            <ViewToggle>
              <ViewToggleButton
                active={viewMode === 'cards'}
                onClick={() => setViewMode('cards')}
              >
                <Squares2X2Icon width={16} height={16} />
                Cards
              </ViewToggleButton>
              <ViewToggleButton
                active={viewMode === 'table'}
                onClick={() => setViewMode('table')}
              >
                <TableCellsIcon width={16} height={16} />
                Table
              </ViewToggleButton>
            </ViewToggle>

            <ExportButton onClick={() => handleExportXLSX(coveragesWithSub, productName)}>
              <DownloadIcon20 />
              Export XLSX
            </ExportButton>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx"
              style={{ display: 'none' }}
              onChange={handleImportXLSX}
            />
            <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>
              <UploadIcon20 width={16} />
              Import XLSX
            </Button>
          </ActionGroup>

          <ActionGroup>
            {/* Hierarchy controls - only show for card view */}
            {viewMode === 'cards' && filteredTreeStructure.parentCoverages.some(p => filteredTreeStructure.childrenMap[p.id]?.length > 0) && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    const parentsWithChildren = filteredTreeStructure.parentCoverages
                      .filter(p => filteredTreeStructure.childrenMap[p.id]?.length > 0)
                      .map(p => p.id);
                    setExpandedIds(parentsWithChildren);
                  }}
                >
                  <ChevronDownIcon width={16} />
                  Expand All
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setExpandedIds([])}
                >
                  <ChevronRightIcon width={16} />
                  Collapse All
                </Button>
              </>
            )}
          </ActionGroup>
        </ActionBar>

        {/* Coverages Display */}
        {filteredTreeStructure.parentCoverages.length > 0 ? (
          viewMode === 'cards' ? (
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
                                <SubCoverageCount>
                                  <Squares2X2Icon />
                                  {parent.subCount} sub-coverage{parent.subCount !== 1 ? 's' : ''}
                                </SubCoverageCount>
                              )}
                            </CardTitle>
                            {parent.subCount > 0 && (
                              <ExpandButton onClick={() => toggleExpand(parent.id)}>
                                {expandedIds.includes(parent.id) ? (
                                  <ChevronDownIcon width={16} />
                                ) : (
                                  <ChevronRightIcon width={16} />
                                )}
                              </ExpandButton>
                            )}
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
                          {parent.category && (
                            <CardCategory category={parent.category}>
                              {parent.category}
                            </CardCategory>
                          )}

                          <CardMetrics>
                            <MetricItem onClick={() => openLimitModal(parent)}>
                              <CurrencyDollarIcon />
                              Limits {parent.limits?.length ? `(${parent.limits.length})` : '(0)'}
                            </MetricItem>
                            <MetricItem onClick={() => openDeductibleModal(parent)}>
                              <CurrencyDollarIcon />
                              Deductibles {parent.deductibles?.length ? `(${parent.deductibles.length})` : '(0)'}
                            </MetricItem>
                            <MetricItem as={RouterLink} to={`/coverage-states/${productId}/${parent.id}`}>
                              <MapIcon />
                              States {parent.states?.length ? `(${parent.states.length})` : '(0)'}
                            </MetricItem>
                            <MetricItem onClick={() => openLinkFormsModal(parent)}>
                              <DocumentTextIcon />
                              Forms {parent.formIds?.length ? `(${parent.formIds.length})` : '(0)'}
                            </MetricItem>
                          </CardMetrics>
                        </CardContent>
                      </ParentCoverageCard>
                    {/* Sub-Coverages */}
                    {filteredTreeStructure.childrenMap[parent.id] && isExpanded && (
                      <SubCoverageContainer isExpanded={isExpanded}>
                        {filteredTreeStructure.childrenMap[parent.id].map(child => (
                          <CoverageCard key={child.id} isSubCoverage>
                            <CardHeader>
                              <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                <CardTitle>{child.name}</CardTitle>
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
                              <ParentInfo>
                                <LinkIcon />
                                Sub-coverage of: <strong>{parent.name}</strong> ({parent.coverageCode})
                              </ParentInfo>

                              {child.category && (
                                <CardCategory category={child.category}>
                                  {child.category}
                                </CardCategory>
                              )}

                              <CardMetrics>
                                <MetricItem onClick={() => openLimitModal(child)}>
                                  <CurrencyDollarIcon />
                                  Limits {child.limits?.length ? `(${child.limits.length})` : '(0)'}
                                </MetricItem>
                                <MetricItem onClick={() => openDeductibleModal(child)}>
                                  <CurrencyDollarIcon />
                                  Deductibles {child.deductibles?.length ? `(${child.deductibles.length})` : '(0)'}
                                </MetricItem>
                                <MetricItem as={RouterLink} to={`/coverage-states/${productId}/${child.id}`}>
                                  <MapIcon />
                                  States {child.states?.length ? `(${child.states.length})` : '(0)'}
                                </MetricItem>
                                <MetricItem onClick={() => openLinkFormsModal(child)}>
                                  <DocumentTextIcon />
                                  Forms {child.formIds?.length ? `(${child.formIds.length})` : '(0)'}
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
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Coverage Name</TableHeader>
                    <TableHeader>Code</TableHeader>
                    <TableHeader>Category</TableHeader>
                    <TableHeader>Parent</TableHeader>
                    <TableHeader>States</TableHeader>
                    <TableHeader align="center">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <tbody>
                  {coveragesWithSub.map(coverage => (
                    <TableRow key={coverage.id}>
                      <TableCell>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {coverage.parentCoverageId && (
                            <span style={{
                              color: '#6366f1',
                              fontSize: '14px',
                              fontWeight: '600',
                              marginRight: '4px'
                            }}>
                              ├─
                            </span>
                          )}
                          {coverage.name}
                          {coverage.subCount > 0 && (
                            <span style={{
                              background: 'rgba(34, 197, 94, 0.1)',
                              color: '#22c55e',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              {coverage.subCount} sub
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span style={{
                          background: 'rgba(99, 102, 241, 0.1)',
                          color: '#6366f1',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {coverage.coverageCode}
                        </span>
                      </TableCell>
                      <TableCell>{coverage.category || '—'}</TableCell>
                      <TableCell>
                        {coverage.parentInfo ? (
                          <span style={{ color: '#6366f1', fontSize: '13px' }}>
                            {coverage.parentInfo.name} ({coverage.parentInfo.coverageCode})
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {coverage.states?.length || 0} states
                        </span>
                      </TableCell>
                      <TableCell>
                        <TableActions>
                          {!coverage.parentCoverageId && (
                            <IconButton onClick={() => openAddModal(coverage.id)} title="Add sub-coverage">
                              <PlusIcon width={14} />
                            </IconButton>
                          )}
                          <IconButton onClick={() => openEditModal(coverage)}>
                            <PencilIcon width={14} />
                          </IconButton>
                          <IconButton className="danger" onClick={() => handleDelete(coverage.id)}>
                            <TrashIcon width={14} />
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
              <div style={{ display:'flex', gap:8, margin:'8px 0 12px' }}>
                <Button variant="ghost" onClick={() => setLinkFormIds(forms.map(f => f.id))}>Select All</Button>
                <Button variant="ghost" onClick={() => setLinkFormIds([])}>Clear All</Button>
              </div>
              <div style={{ maxHeight:360, overflowY:'auto', border:'1px solid #E5E7EB', padding:8, marginBottom:16 }}>
                {forms.map(f => (
                  <label key={f.id} style={{ display:'block', padding:4 }}>
                    <input
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
                    {' '}{f.formName || f.formNumber || 'Unnamed Form'}
                  </label>
                ))}
              </div>
              <Actions>
                <Button onClick={saveLinkedForms}>Save</Button>
                <Button variant="ghost" onClick={() => setLinkFormsModalOpen(false)}>Cancel</Button>
              </Actions>
            </WideModal>
          </Overlay>
        )}


        {/* ----- Limits Modal ----- */}
        {limitModalOpen && (
          <Overlay onClick={() => setLimitModalOpen(false)}>
            <WideModal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Manage Limits for {currentCoverage?.name}</ModalTitle>
                <CloseBtn onClick={() => setLimitModalOpen(false)}>
                  <XMarkIcon width={20} height={20} />
                </CloseBtn>
              </ModalHeader>

              <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 16 }}>
                {limitData.map((lim, idx) => (
                  <div key={idx} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
                    <TextInput
                      value={lim ? `$${lim}` : ''}
                      onChange={e => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setLimitData(d => d.map((row,i) => i===idx ? raw : row));
                      }}
                      onBlur={() => {
                        setLimitData(d => d.map((row,i) => i===idx ? fmtMoney(row) : row));
                      }}
                      style={{ flex:1 }}
                    />
                    <Button variant="ghost" style={{ color:'#dc2626' }}
                      onClick={()=> setLimitData(d => d.filter((_,i)=> i!==idx))}>
                      <TrashIcon width={16} height={16}/>
                    </Button>
                  </div>
                ))}
              </div>

              <Actions>
                <Button onClick={() => setLimitData(d => [...d, ''])}>
                  Add Limit
                </Button>
                <Button onClick={saveLimits}>Save</Button>
                <Button variant="ghost" onClick={() => setLimitModalOpen(false)}>
                  Cancel
                </Button>
              </Actions>
            </WideModal>
          </Overlay>
        )}

        {/* ----- Deductibles Modal ----- */}
        {deductibleModalOpen && (
          <Overlay onClick={() => setDeductibleModalOpen(false)}>
            <WideModal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Manage Deductibles for {currentCoverage?.name}</ModalTitle>
                <CloseBtn onClick={() => setDeductibleModalOpen(false)}>
                  <XMarkIcon width={20} height={20} />
                </CloseBtn>
              </ModalHeader>

              <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 16 }}>
                {deductibleData.map((ded, idx) => (
                  <div key={idx} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
                    <TextInput
                      value={ded ? `$${ded}` : ''}
                      onChange={e => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setDeductibleData(d => d.map((row,i) => i===idx ? raw : row));
                      }}
                      onBlur={() => {
                        setDeductibleData(d => d.map((row,i) => i===idx ? fmtMoney(row) : row));
                      }}
                      style={{ flex:1 }}
                    />
                    <Button variant="ghost" style={{ color:'#dc2626' }}
                      onClick={()=> setDeductibleData(d => d.filter((_,i)=> i!==idx))}>
                      <TrashIcon width={16} height={16}/>
                    </Button>
                  </div>
                ))}
              </div>

              <Actions>
                <Button onClick={() => setDeductibleData(d => [...d, ''])}>
                  Add Deductible
                </Button>
                <Button onClick={saveDeductibles}>Save</Button>
                <Button variant="ghost" onClick={() => setDeductibleModalOpen(false)}>
                  Cancel
                </Button>
              </Actions>
            </WideModal>
          </Overlay>
        )}

        {/* ----- Add / Edit Coverage Modal ----- */}
        {addModalOpen && (
          <Overlay onClick={() => setAddModalOpen(false)}>
            <WideModal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>{editingId ? 'Edit Coverage' : 'Add Coverage'}</ModalTitle>
                <CloseBtn onClick={() => setAddModalOpen(false)}>
                  <XMarkIcon width={20} height={20}/>
                </CloseBtn>
              </ModalHeader>

              <div style={{ display:'flex', flexDirection:'column', gap:14, marginTop:8 }}>
                <TextInput
                  placeholder="Coverage Name"
                  value={formState.name}
                  onChange={e => setFormState({ ...formState, name: e.target.value })}
                />
                <TextInput
                  placeholder="Coverage Code"
                  value={formState.coverageCode}
                  onChange={e => setFormState({ ...formState, coverageCode: e.target.value })}
                />
                <select
                  value={formState.category}
                  onChange={e => setFormState({ ...formState, category: e.target.value })}
                  style={{ padding:10, borderRadius:6, border:'1px solid #e5e7eb', fontSize:14 }}
                >
                  <option value="Base Coverage">Base Coverage</option>
                  <option value="Endorsement Coverage">Endorsement Coverage</option>
                </select>
                {editingId && (
                  <textarea
                    rows="3"
                    placeholder="Reason for changes (required)"
                    value={changeSummary}
                    onChange={e => setChangeSummary(e.target.value)}
                    style={{ width:'100%', padding:10, borderRadius:6, border:'1px solid #e5e7eb', fontSize:14 }}
                  />
                )}
                <Actions>
                  <Button onClick={handleAddOrUpdate}>{editingId ? 'Update' : 'Add'}</Button>
                  <Button variant="ghost" onClick={() => setAddModalOpen(false)}>Cancel</Button>
                </Actions>
              </div>
            </WideModal>
          </Overlay>
        )}

        <HistoryButton onClick={() => setHistoryOpen(o => !o)} aria-label="history">
          <ClockIcon width={25} />
        </HistoryButton>
        <VersionControlSidebar open={historyOpen} onClose={() => setHistoryOpen(false)} productId={productId} />
        {historyOpen && <VcBackdrop onClick={() => setHistoryOpen(false)} />}
      </MainContent>
    </Container>
  );
}

/* ---------- simple debounce hook ---------- */
function useDebounce(value, ms=250){
  const [v,setV]=useState(value);
  useEffect(()=>{const id=setTimeout(()=>setV(value),ms);return ()=>clearTimeout(id);},[value,ms]);
  return v;
}

/* ---------- XLSX helpers wrappers ---------- */
async function handleExportXLSX(rows, productName){
  try{
    const XLSXmod = await import('xlsx'); const XLSX=XLSXmod.default||XLSXmod;
    const fsMod = await import('file-saver'); const saveAs=fsMod.saveAs||fsMod.default;
    const ws = makeCoverageSheet(rows);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Coverages');
    const buf = XLSX.write(wb,{bookType:'xlsx',type:'array'});
    saveAs(new Blob([buf],{type:'application/octet-stream'}),`coverages_${productName}.xlsx`);
  }catch(err){alert('Export failed: '+err.message);}
}