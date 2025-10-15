import React, { useEffect, useState, useMemo, useCallback, memo } from 'react'; // eslint-disable-line no-unused-vars
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
import { db, storage, functions } from '../firebase';
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
import useProducts from '../hooks/useProducts';
import MarkdownRenderer from '../utils/markdownParser';
import ProductCard from './ui/ProductCard';
import VirtualizedGrid from './ui/VirtualizedGrid';
import { debounce } from '../utils/performance';
import { extractPdfText } from '../utils/pdfChunking';
import LoadingSpinner from './ui/LoadingSpinner';
import { EmptyState } from './ui/EmptyState';
import { logAuditEvent } from '../services/auditService';


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

const ProductsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
  margin-bottom: 60px;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
    margin-bottom: 40px;
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

// AddButton removed - unused styled component
// LoadingSpinner and EmptyState now imported from ui components

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
  margin-bottom: 20px;
  padding: 0 24px;
`;

const FormLabel = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #111827;
  background: #ffffff;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #7c3aed;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
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
  padding: 0 24px 24px;
  justify-content: flex-end;
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

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
  }

  &:active {
    transform: translateY(0);
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
  }
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

  // Form states
  const [name, setName] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [productCode, setProductCode] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [file, setFile] = useState(null);

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

  // Handle escape key for modals
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setModalOpen(false);
        setSummaryModalOpen(false);
        setDetailsModalOpen(false);
        setChatModalOpen(false);
        setDictModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
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

  // Optimized product filtering with enhanced search
  const filtered = useMemo(() => {
    if (!searchTerm) {
      return products;
    }

    const q = searchTerm.toLowerCase();
    return products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.formNumber?.toLowerCase().includes(q) ||
      p.productCode?.toLowerCase().includes(q)
    );
  }, [products, searchTerm]);

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

  const handleDelete = useCallback(async (id) => {
    const product = products.find(p => p.id === id);
    if (!window.confirm(`Delete product "${product?.name}"? This action cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'products', id));

      // Log audit event
      await logAuditEvent('DELETE', 'PRODUCT', id, {
        entityName: product?.name,
        reason: 'User-initiated deletion'
      });
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete product');
    }
  }, [products]);

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

  const handleSave = async () => {
    if (!name || !formNumber || !effectiveDate) {
      alert('Name, Form # and Effective Date are required');
      return;
    }
    try {
      let downloadUrl = '';
      if (file) {
        const sref = ref(storage, `forms/${file.name}`);
        await uploadBytes(sref, file);
        downloadUrl = await getDownloadURL(sref);
      }

      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), {
          name,
          formNumber,
          productCode,
          formDownloadUrl: downloadUrl || undefined
        });
      } else {
        await addDoc(collection(db, 'products'), {
          name,
          formNumber,
          productCode,
          effectiveDate,
          formDownloadUrl: downloadUrl
        });
      }
      setModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Save failed');
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
          <LoadingSpinner type="circular" size="40px" />
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
        <Breadcrumb
          items={[
            { label: 'Home', path: '/' },
            { label: 'Products' }
          ]}
        />

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

        {/* Action Bar with View Toggle and Add Product */}
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
          </ActionGroup>
          <ActionGroup>
            <HeaderActionButton onClick={() => setModalOpen(true)}>
              <PlusIcon width={16} height={16} />
              Add Product
            </HeaderActionButton>
          </ActionGroup>
        </ActionBar>

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
          <EmptyState
            icon={<CubeIcon style={{ width: '48px', height: '48px' }} />}
            title="No products found"
            description={searchTerm ? 'Try adjusting your search terms or use the "Add Product" button above' : 'Get started by clicking "Add Product" above'}
            variant="default"
          />
        )}
      </PageContent>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <Modal onClick={() => { setModalOpen(false); resetForm(); }}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{editingId ? 'Edit' : 'Add'} Product</ModalTitle>
              <CloseButton onClick={() => { setModalOpen(false); resetForm(); }}>
                ✕
              </CloseButton>
            </ModalHeader>
            <FormField>
              <FormLabel>Product Name</FormLabel>
              <FormInput
                placeholder="Enter product name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </FormField>

            <FormField>
              <FormLabel>Form Number</FormLabel>
              <FormInput
                placeholder="Enter form number"
                value={formNumber}
                onChange={e => setFormNumber(e.target.value)}
              />
            </FormField>

            <FormField>
              <FormLabel>Product Code</FormLabel>
              <FormInput
                placeholder="Enter product code"
                value={productCode}
                onChange={e => setProductCode(e.target.value)}
              />
            </FormField>

            <FormField>
              <FormLabel>Effective Date (MM/YY)</FormLabel>
              <FormInput
                placeholder="MM/YY"
                value={effectiveDate}
                onChange={e => setEffectiveDate(formatMMYY(e.target.value))}
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

            <ModalActions>
              <SaveButton onClick={handleSave}>
                {editingId ? 'Update' : 'Create'}
              </SaveButton>
              <CancelButton onClick={() => { setModalOpen(false); resetForm(); }}>
                Cancel
              </CancelButton>
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
    </PageContainer>
  );
});

ProductHub.displayName = 'ProductHub';

export default ProductHub;
