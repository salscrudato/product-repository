// src/components/RulesScreen.tsx
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import type { Rule, Coverage, PricingStep } from '@/types';
import {
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  TagIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/solid';

import MainNavigation from '../components/ui/Navigation';
import { PageContainer, PageContent } from '../components/ui/PageContainer';
import EnhancedHeader from '../components/ui/EnhancedHeader';
import { RuleBuilderChat } from './rules/RuleBuilderChat';
import { RuleLogicViewer } from './rules/RuleLogicViewer';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { saveRuleFromDraft } from '../services/ruleBuilderService';
import type { RuleDraft, RuleLogic } from '../types';


/* ---------- Modern Styled Components ---------- */
import { keyframes } from 'styled-components';

// Animations
const slideIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
`;

// Main Container
const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.main`
  flex: 1;
  padding: 32px 32px 80px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;

  @media (max-width: 768px) {
    padding: 24px 20px 60px;
  }
`;

// Header Section
const HeaderSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  background: white;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.05);
    color: #6366f1;
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
`;

const TitleIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;

  svg {
    width: 24px;
    height: 24px;
  }
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b 0%, #475569 50%, #64748b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
`;

// Command Bar - Apple-inspired search + actions bar (matching CoverageScreen)
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
  max-width: 480px;
  min-width: 200px;
`;

const CommandBarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SearchWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const SearchInputStyled = styled.input`
  width: 100%;
  padding: 10px 16px 10px 42px;
  font-size: 14px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  color: #1e293b;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    background: white;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
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

const CopilotButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 8px;
  background: white;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 38px;
  min-width: 130px;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const FilterLabel = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  white-space: nowrap;
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

// Toggle Switch for Proprietary Filter
const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ToggleLabel = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: #374151;
`;

const ToggleSwitch = styled.div<{ $active?: boolean }>`
  position: relative;
  width: 44px;
  height: 24px;
  background: ${props => props.$active ? '#6366f1' : '#e5e7eb'};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active ? '#5b5bd6' : '#d1d5db'};
  }
`;

const ToggleKnob = styled.div<{ $active?: boolean }>`
  position: absolute;
  top: 2px;
  left: ${props => props.$active ? '22px' : '2px'};
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

// Rules Grid
const RulesGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 120px;

  @media (max-width: 768px) {
    gap: 12px;
  }
`;

// Rule Card
const RuleCard = styled.div`
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
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 12px;
`;

const CardTitleContainer = styled.div`
  flex: 1;
`;

const CardTitle = styled.h3`
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.3;
`;

const CardSubtitle = styled.div`
  font-size: 14px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CardActions = styled.div`
  display: flex;
  gap: 8px;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  background: white;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.05);
    color: #6366f1;
  }

  &.danger:hover {
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.05);
    color: #ef4444;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const CardContent = styled.div`
  margin-bottom: 16px;
`;

const RuleSection = styled.div`
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
`;

const SectionContent = styled.div`
  font-size: 14px;
  color: #374151;
  line-height: 1.5;

  &.code {
    font-family: 'SF Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    background: rgba(248, 250, 252, 0.8);
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid rgba(226, 232, 240, 0.6);
    white-space: pre-wrap;
    word-break: break-word;
  }
`;

const CardMetrics = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const MetricBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: ${props => {
    if (props.type === 'proprietary') return 'rgba(239, 68, 68, 0.1)';
    if (props.type === 'product') return 'rgba(99, 102, 241, 0.1)';
    return 'rgba(107, 114, 128, 0.1)';
  }};
  color: ${props => {
    if (props.type === 'proprietary') return '#ef4444';
    if (props.type === 'product') return '#6366f1';
    return '#6b7280';
  }};
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;

  svg {
    width: 12px;
    height: 12px;
  }
`;

// Add Button
const AddButton = styled.button`
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 16px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
  transition: all 0.3s ease;
  z-index: 100;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(99, 102, 241, 0.4);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

// Modal Components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const FormLabel = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
  }
`;



const FormSelect = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 8px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const FormCheckbox = styled.input`
  margin-right: 8px;
  transform: scale(1.2);
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
`;

const PrimaryButton = styled.button`
  padding: 12px 20px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const SecondaryButton = styled.button`
  padding: 12px 20px;
  background: white;
  color: #6b7280;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #6366f1;
    color: #6366f1;
  }
`;

// Empty State
const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
`;

const EmptyStateTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #374151;
`;

const EmptyStateText = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
`;

// AI Builder Container
const AIBuilderContainer = styled.div`
  height: 600px;
  margin-bottom: 24px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
`;

// Rule Logic Badge
const LogicBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  color: #6366f1;

  svg {
    width: 12px;
    height: 12px;
  }
`;

/**
 * Memoized Rule Card Item Component
 * Prevents unnecessary re-renders when parent component updates
 */
interface RuleCardItemProps {
  rule: Rule;
  getProductName: (productId: string) => string;
  getTargetName: (rule: Rule) => string;
  getRuleTypeColor: (ruleType: string) => string;
  onEdit: (rule: Rule) => void;
  onDelete: (ruleId: string) => void;
}

const RuleCardItem = React.memo(({
  rule,
  getProductName,
  getTargetName,
  getRuleTypeColor,
  onEdit,
  onDelete
}: RuleCardItemProps) => (
  <RuleCard>
    <CardHeader>
      <CardTitleContainer>
        <CardTitle>
          {rule.name || 'Unnamed Rule'}
          {rule.logic && (
            <LogicBadge title="This rule has programmable logic">
              <SparklesIcon />
              AI
            </LogicBadge>
          )}
        </CardTitle>
        <CardSubtitle>
          <span>{getProductName(rule.productId)}</span>
          {rule.ruleType && (
            <>
              <span>•</span>
              <span style={{ color: getRuleTypeColor(rule.ruleType) }}>
                {rule.ruleType}
              </span>
            </>
          )}
          {rule.targetId && (
            <>
              <span>•</span>
              <span>{getTargetName(rule)}</span>
            </>
          )}
        </CardSubtitle>
      </CardTitleContainer>
      <CardActions>
        <IconButton onClick={() => onEdit(rule)}>
          <PencilIcon />
        </IconButton>
        <IconButton className="danger" onClick={() => onDelete(rule.id)}>
          <TrashIcon />
        </IconButton>
      </CardActions>
    </CardHeader>

    <CardContent>
      {rule.condition && (
        <RuleSection>
          <SectionLabel>When</SectionLabel>
          <SectionContent>{rule.condition}</SectionContent>
        </RuleSection>
      )}

      {rule.outcome && (
        <RuleSection>
          <SectionLabel>Then</SectionLabel>
          <SectionContent>{rule.outcome}</SectionContent>
        </RuleSection>
      )}

      {rule.reference && (
        <RuleSection>
          <SectionLabel>Reference</SectionLabel>
          <SectionContent>{rule.reference}</SectionContent>
        </RuleSection>
      )}
    </CardContent>

    <CardMetrics>
      {rule.ruleType && (
        <MetricBadge style={{ backgroundColor: `${getRuleTypeColor(rule.ruleType)}15`, color: getRuleTypeColor(rule.ruleType), border: `1px solid ${getRuleTypeColor(rule.ruleType)}30` }}>
          {rule.ruleType === 'Coverage' && <ShieldCheckIcon />}
          {rule.ruleType === 'Forms' && <DocumentTextIcon />}
          {rule.ruleType === 'Pricing' && <CurrencyDollarIcon />}
          {rule.ruleType === 'Product' && <BuildingOfficeIcon />}
          {rule.ruleType} Rule
        </MetricBadge>
      )}
      {rule.ruleCategory && (
        <MetricBadge style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
          <TagIcon />
          {rule.ruleCategory}
        </MetricBadge>
      )}
      {rule.status && rule.status !== 'Active' && (
        <MetricBadge style={{
          backgroundColor: rule.status === 'Draft' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(107, 114, 128, 0.1)',
          color: rule.status === 'Draft' ? '#fbbf24' : '#6b7280',
          border: `1px solid ${rule.status === 'Draft' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(107, 114, 128, 0.3)'}`
        }}>
          {rule.status}
        </MetricBadge>
      )}
      {rule.proprietary && (
        <MetricBadge type="proprietary">
          <ShieldCheckIcon />
          Proprietary
        </MetricBadge>
      )}
      {rule.reference && (
        <MetricBadge>
          <DocumentTextIcon />
          Referenced
        </MetricBadge>
      )}
    </CardMetrics>
  </RuleCard>
), (prevProps, nextProps) => {
  // Custom comparison: only re-render if rule data or callbacks change
  return (
    prevProps.rule === nextProps.rule &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onDelete === nextProps.onDelete
  );
});

RuleCardItem.displayName = 'RuleCardItem';

export default function RulesScreen() {
  const navigate = useNavigate();
  const { productId: preselectedProductId, coverageId: preselectedCoverageId } = useParams();

  // State management
  const [rules, setRules] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [selectedCoverageName, setSelectedCoverageName] = useState('');

  // Enhanced form state with comprehensive rule structure
  const [formData, setFormData] = useState({
    name: '',
    productId: preselectedProductId || '',
    ruleType: '', // 'Product', 'Coverage', 'Forms', 'Pricing'
    ruleCategory: '', // 'Eligibility', 'Pricing', 'Compliance', 'Coverage', 'Forms'
    targetId: '',
    condition: '',
    outcome: '',
    reference: '',
    proprietary: false,
    status: 'Active' // 'Active', 'Inactive', 'Draft', 'Under Review'
  });

  // Additional state for dynamic data and enhanced functionality
  const [coverages, setCoverages] = useState([]);
  const [forms, setForms] = useState([]);
  const [pricingSteps, setPricingSteps] = useState([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [ruleCategories] = useState(['Eligibility', 'Pricing', 'Compliance', 'Coverage', 'Forms']);
  const [statuses] = useState(['Active', 'Inactive', 'Draft', 'Under Review', 'Archived']);

  // Enhanced search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductFilter, setSelectedProductFilter] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');

  // AI Rule Builder state
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const searchRef = useRef(null);

  // Load data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch rules
        const rulesSnap = await getDocs(collection(db, 'rules'));
        const rulesList = rulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRules(rulesList);

        // Fetch products for associations
        const productsSnap = await getDocs(collection(db, 'products'));
        const productsList = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(productsList);

        // Fetch all forms for rule targeting
        const formsSnap = await getDocs(collection(db, 'forms'));
        const formsList = formsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setForms(formsList);

        // Fetch pricing steps for pricing rules
        const stepsSnap = await getDocs(collection(db, 'steps'));
        const stepsList = stepsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPricingSteps(stepsList);

        // If we have a preselected product, load its coverages and pricing steps
        if (preselectedProductId) {
          await loadCoveragesForProduct(preselectedProductId);
          loadPricingStepsForProduct(preselectedProductId);
        }

        // If we have a preselected coverage, load coverage name for title
        if (preselectedProductId && preselectedCoverageId) {
          const coverageDocRef = doc(db, `products/${preselectedProductId}/coverages`, preselectedCoverageId);
          const coverageSnap = await getDoc(coverageDocRef);
          if (coverageSnap.exists()) {
            const coverageData = coverageSnap.data();
            setSelectedCoverageName(coverageData.name || 'Unknown Coverage');
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [preselectedProductId, preselectedCoverageId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === '/' && !(e.target as Element).matches('input, textarea')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Enhanced filtering with comprehensive filter options
  const filteredRules = useMemo(() => {
    let filtered = rules;

    // Coverage filter (from URL parameter) - highest priority
    if (preselectedCoverageId) {
      filtered = filtered.filter(rule =>
        rule.ruleType === 'Coverage' && rule.targetId === preselectedCoverageId
      );
    }

    // Product filter (from URL parameter or dropdown)
    if (preselectedProductId) {
      filtered = filtered.filter(rule => rule.productId === preselectedProductId);
    } else if (selectedProductFilter) {
      filtered = filtered.filter(rule => rule.productId === selectedProductFilter);
    }

    // Text search across multiple fields
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(rule =>
        (rule.name || '').toLowerCase().includes(search) ||
        (rule.condition || '').toLowerCase().includes(search) ||
        (rule.outcome || '').toLowerCase().includes(search) ||
        (rule.reference || '').toLowerCase().includes(search) ||
        (rule.ruleType || '').toLowerCase().includes(search) ||
        (rule.ruleCategory || '').toLowerCase().includes(search)
      );
    }

    // Rule category filter
    if (selectedCategoryFilter) {
      filtered = filtered.filter(rule => rule.ruleCategory === selectedCategoryFilter);
    }

    // Type filter (proprietary/standard)
    if (selectedTypeFilter === 'proprietary') {
      filtered = filtered.filter(rule => rule.proprietary);
    } else if (selectedTypeFilter === 'standard') {
      filtered = filtered.filter(rule => !rule.proprietary);
    }

    // Sort by name
    filtered.sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      return aName.localeCompare(bName);
    });

    return filtered;
  }, [rules, searchTerm, selectedProductFilter, selectedCategoryFilter,
      selectedTypeFilter, preselectedProductId, preselectedCoverageId]);

  // Get unique products for filter (memoized to prevent unnecessary re-renders)
  const uniqueProducts = useMemo(
    () => products.filter(p => p.name).sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  );

  // Enhanced form handlers
  const resetForm = () => {
    setFormData({
      name: '',
      productId: preselectedProductId || '',
      ruleType: '',
      ruleCategory: '',
      targetId: '',
      condition: '',
      outcome: '',
      reference: '',
      proprietary: false,
      status: 'Active'
    });
    if (!preselectedProductId) {
      setCoverages([]);
      setPricingSteps([]);
    }
    setEditingRule(null);
  };

  const openModal = async (rule: Rule | null = null): Promise<void> => {
    if (rule) {
      setFormData({
        name: rule.name || '',
        productId: rule.productId || '',
        ruleType: rule.ruleType || '',
        ruleCategory: rule.ruleCategory || '',
        targetId: rule.targetId || '',
        condition: rule.condition || '',
        outcome: rule.outcome || '',
        reference: rule.reference || '',
        proprietary: rule.proprietary || false,
        status: rule.status || 'Active'
      });
      setEditingRule(rule);

      // Load coverages and pricing steps if editing a rule with a product
      if (rule.productId) {
        await loadCoveragesForProduct(rule.productId);
        await loadPricingStepsForProduct(rule.productId);
      }
    } else {
      resetForm();
    }
    setModalOpen(true);
  };

  const closeModal = (): void => {
    setModalOpen(false);
    resetForm();
  };

  // Load coverages when product is selected
  const loadCoveragesForProduct = async (productId: string): Promise<void> => {
    if (!productId) {
      setCoverages([]);
      return;
    }

    setLoadingTargets(true);
    try {
      const coveragesSnap = await getDocs(collection(db, `products/${productId}/coverages`));
      const coveragesList = coveragesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coverage));
      setCoverages(coveragesList);
    } catch (error) {
      console.error('Error loading coverages:', error);
      setCoverages([]);
    } finally {
      setLoadingTargets(false);
    }
  };

  // Load pricing steps when product is selected
  const loadPricingStepsForProduct = async (productId: string): Promise<void> => {
    if (!productId) {
      setPricingSteps([]);
      return;
    }

    try {
      const stepsSnap = await getDocs(collection(db, `products/${productId}/steps`));
      const stepsList = stepsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PricingStep));
      setPricingSteps(stepsList);
    } catch (error) {
      console.error('Error loading pricing steps:', error);
      setPricingSteps([]);
    }
  };

  // Handle product selection
  const handleProductChange = (productId: string): void => {
    setFormData(prev => ({
      ...prev,
      productId,
      ruleType: '',
      targetId: ''
    }));
    loadCoveragesForProduct(productId);
    loadPricingStepsForProduct(productId);
  };

  // Handle rule type change
  const handleRuleTypeChange = (ruleType: string): void => {
    setFormData(prev => ({
      ...prev,
      ruleType,
      targetId: ''
    }));
  };

  // Handle saving a rule from the AI builder
  const handleSaveAIRule = async (draft: RuleDraft): Promise<void> => {
    const productIdToUse = preselectedProductId || selectedProductFilter;
    if (!productIdToUse) {
      alert('Please select a product first.');
      return;
    }

    // If we're on a coverage-specific page, ensure the rule is linked to this coverage
    const enhancedDraft = { ...draft };
    if (preselectedCoverageId) {
      enhancedDraft.ruleType = 'Coverage';
      enhancedDraft.targetId = preselectedCoverageId;
    }

    const result = await saveRuleFromDraft(productIdToUse, enhancedDraft);
    if (result.success && result.ruleId) {
      // Optimistically add the new rule to state for instant feedback
      const newRule = {
        id: result.ruleId,
        productId: productIdToUse,
        ruleType: enhancedDraft.ruleType,
        ruleCategory: enhancedDraft.ruleCategory,
        targetId: enhancedDraft.targetId || '',
        name: enhancedDraft.name,
        condition: enhancedDraft.conditionText || '',
        outcome: enhancedDraft.outcomeText || '',
        proprietary: enhancedDraft.proprietary ?? false,
        status: enhancedDraft.status || 'Active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setRules(prevRules => [...prevRules, newRule] as any);
    } else if (!result.success) {
      alert(result.error || 'Failed to save rule');
    }
  };

  // Get product context for AI builder (includes current coverage context if applicable)
  const getProductContext = useCallback(() => {
    const productIdToUse = preselectedProductId || selectedProductFilter;
    if (!productIdToUse) return undefined;

    const product = products.find((p: any) => p.id === productIdToUse);

    // If we're on a coverage-specific page, highlight that coverage in context
    const currentCoverage = preselectedCoverageId
      ? coverages.find((c: any) => c.id === preselectedCoverageId)
      : null;

    return {
      name: product?.name,
      lineOfBusiness: product?.lineOfBusiness,
      coverages: coverages.map((c: any) => ({ id: c.id, name: c.name })),
      forms: forms.map((f: any) => ({ id: f.id, name: f.name })),
      // Include current coverage context for better AI understanding
      currentCoverage: currentCoverage ? { id: currentCoverage.id, name: currentCoverage.name } : undefined,
    };
  }, [preselectedProductId, selectedProductFilter, products, coverages, forms, preselectedCoverageId]);

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      alert('Please enter a rule name.');
      return;
    }
    if (!formData.productId) {
      alert('Please select a product.');
      return;
    }
    if (!formData.ruleType) {
      alert('Please select a rule type.');
      return;
    }
    if (formData.ruleType !== 'Product' && !formData.targetId) {
      alert('Please select a target for this rule.');
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        productId: formData.productId,
        ruleType: formData.ruleType,
        ruleCategory: formData.ruleCategory,
        targetId: formData.targetId,
        condition: formData.condition.trim(),
        outcome: formData.outcome.trim(),
        reference: formData.reference.trim(),
        proprietary: formData.proprietary,
        status: formData.status,
        updatedAt: new Date()
      };

      if (editingRule) {
        // Update existing rule
        await updateDoc(doc(db, 'rules', editingRule.id), payload);
        setRules(rules => rules.map(r => r.id === editingRule.id ? { ...r, ...payload } : r));
      } else {
        // Create new rule
        const docRef = await addDoc(collection(db, 'rules'), {
          ...payload,
          createdAt: new Date()
        });
        setRules(rules => [...rules, { id: docRef.id, ...payload }]);
      }

      closeModal();
    } catch (error) {
      console.error('Error saving rule:', error);
      alert('Failed to save rule. Please try again.');
    }
  };

  const handleDelete = async (ruleId: string): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;

    try {
      await deleteDoc(doc(db, 'rules', ruleId));
      setRules(rules => rules.filter(r => r.id !== ruleId));
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('Failed to delete rule. Please try again.');
    }
  };

  const getProductName = useCallback((productId: string): string => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  }, [products]);

  const getTargetName = useCallback((rule: Rule): string => {
    if (!rule.ruleType) return 'Product Level';
    if (rule.ruleType === 'Product') return 'Product Level';
    if (!rule.targetId) return 'No Target';

    switch (rule.ruleType) {
      case 'Coverage': {
        // For coverages, we need to find it in the current coverages or make a call
        const coverage = coverages.find(c => c.id === rule.targetId);
        return coverage?.name || 'Unknown Coverage';
      }
      case 'Forms': {
        const form = forms.find(f => f.id === rule.targetId);
        return form?.formName || form?.formNumber || 'Unknown Form';
      }
      case 'Pricing': {
        const step = pricingSteps.find(s => s.id === rule.targetId);
        return step?.stepName || 'Unknown Pricing Step';
      }
      default:
        return 'Unknown Target';
    }
  }, [coverages, forms, pricingSteps]);

  const getRuleTypeColor = useCallback((ruleType: string): string => {
    switch (ruleType) {
      case 'Product': return '#6366f1';
      case 'Coverage': return '#10b981';
      case 'Forms': return '#f59e0b';
      case 'Pricing': return '#8b5cf6';
      default: return '#6b7280';
    }
  }, []);

  const pageTitle = preselectedCoverageId && selectedCoverageName
    ? `${selectedCoverageName} Rules`
    : preselectedProductId
    ? `${getProductName(preselectedProductId)} Rules`
    : 'Rules Repository';

  const productName = preselectedProductId ? getProductName(preselectedProductId) : 'Products';

  return (
    <PageContainer>
      <MainNavigation />
      <PageContent>
        <EnhancedHeader
          title={pageTitle}
          subtitle={`Manage ${filteredRules.length} rule${filteredRules.length !== 1 ? 's' : ''}`}
          icon={Cog6ToothIcon}
          showBackButton={!!preselectedProductId || !!preselectedCoverageId}
          onBackClick={() => navigate(-1)}
        />

        {/* Command Bar with Search, Filters, and AI Builder */}
        <CommandBar>
          <CommandBarLeft>
            <FilterGroup>
              <FilterLabel>Category:</FilterLabel>
              <FilterSelect
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {ruleCategories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </FilterSelect>
            </FilterGroup>

            <ToggleContainer>
              <ToggleLabel>Proprietary</ToggleLabel>
              <ToggleSwitch
                $active={selectedTypeFilter === 'proprietary'}
                onClick={() => setSelectedTypeFilter(selectedTypeFilter === 'proprietary' ? '' : 'proprietary')}
              >
                <ToggleKnob $active={selectedTypeFilter === 'proprietary'} />
              </ToggleSwitch>
            </ToggleContainer>
          </CommandBarLeft>

          <CommandBarCenter>
            <SearchWrapper>
              <SearchIconWrapper>
                <MagnifyingGlassIcon />
              </SearchIconWrapper>
              <SearchInputStyled
                type="text"
                placeholder={preselectedCoverageId
                  ? "Search rules for this coverage..."
                  : preselectedProductId
                  ? "Search coverage and form rules..."
                  : "Search rules..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchWrapper>
          </CommandBarCenter>

          <CommandBarRight>
            <CopilotButton onClick={() => setShowAIBuilder(!showAIBuilder)}>
              <SparklesIcon />
              {showAIBuilder ? 'Hide AI Builder' : 'AI Rule Builder'}
            </CopilotButton>
          </CommandBarRight>
        </CommandBar>

        {/* AI Rule Builder Chat */}
        {showAIBuilder && (
          <AIBuilderContainer>
            <RuleBuilderChat
              productId={preselectedProductId || selectedProductFilter || ''}
              targetId={preselectedCoverageId || undefined}
              productContext={getProductContext()}
              onSaveRule={handleSaveAIRule}
            />
          </AIBuilderContainer>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
            Loading rules...
          </div>
        ) : filteredRules.length === 0 ? (
          <EmptyState>
            <EmptyStateTitle>No rules found</EmptyStateTitle>
            <EmptyStateText>
              {searchTerm || selectedProductFilter || selectedTypeFilter
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first rule'}
            </EmptyStateText>
          </EmptyState>
        ) : (
          <RulesGrid>
            {filteredRules.map(rule => (
              <RuleCardItem
                key={rule.id}
                rule={rule}
                getProductName={getProductName}
                getTargetName={getTargetName}
                getRuleTypeColor={getRuleTypeColor}
                onEdit={openModal}
                onDelete={handleDelete}
              />
            ))}
          </RulesGrid>
        )}

        <AddButton onClick={() => openModal()}>
          <PlusIcon />
          Add Rule
        </AddButton>

        {modalOpen && (
          <ModalOverlay onClick={closeModal}>
            <ModalContainer onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>
                  {editingRule ? 'Edit Rule' : 'Add New Rule'}
                </ModalTitle>
                <CloseButton onClick={closeModal}>
                  <XMarkIcon />
                </CloseButton>
              </ModalHeader>

              <FormGroup>
                <FormLabel>Rule Name *</FormLabel>
                <FormInput
                  placeholder="Enter descriptive rule name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </FormGroup>

              {!preselectedProductId && (
                <FormGroup>
                  <FormLabel>Product *</FormLabel>
                  <FormSelect
                    value={formData.productId}
                    onChange={(e) => handleProductChange(e.target.value)}
                  >
                    <option value="">Select a product</option>
                    {uniqueProducts.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </FormSelect>
                </FormGroup>
              )}

              {preselectedProductId && (
                <FormGroup>
                  <FormLabel>Product</FormLabel>
                  <FormInput
                    value={getProductName(preselectedProductId)}
                    disabled
                    style={{ backgroundColor: '#f8fafc', color: '#64748b' }}
                  />
                </FormGroup>
              )}

              {formData.productId && (
                <FormGroup>
                  <FormLabel>Rule Type *</FormLabel>
                  <FormSelect
                    value={formData.ruleType}
                    onChange={(e) => handleRuleTypeChange(e.target.value)}
                  >
                    <option value="">Select rule type</option>
                    <option value="Product">Product Rule</option>
                    <option value="Coverage">Coverage Rule</option>
                    <option value="Forms">Forms Rule</option>
                    <option value="Pricing">Pricing Rule</option>
                  </FormSelect>
                </FormGroup>
              )}

              <FormGroup>
                <FormLabel>Rule Category *</FormLabel>
                <FormSelect
                  value={formData.ruleCategory}
                  onChange={(e) => setFormData({ ...formData, ruleCategory: e.target.value })}
                >
                  <option value="">Select category</option>
                  {ruleCategories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </FormSelect>
              </FormGroup>

              {formData.ruleType && formData.ruleType !== 'Product' && (
                <FormGroup>
                  <FormLabel>
                    {formData.ruleType === 'Coverage' && 'Target Coverage *'}
                    {formData.ruleType === 'Forms' && 'Target Form *'}
                    {formData.ruleType === 'Pricing' && 'Target Pricing Step *'}
                  </FormLabel>
                  <FormSelect
                    value={formData.targetId}
                    onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                    disabled={loadingTargets}
                  >
                    <option value="">
                      {loadingTargets ? 'Loading...' : `Select ${formData.ruleType.toLowerCase()}`}
                    </option>
                    {formData.ruleType === 'Coverage' &&
                      coverages.map(coverage => (
                        <option key={coverage.id} value={coverage.id}>
                          {coverage.name}
                        </option>
                      ))
                    }
                    {formData.ruleType === 'Forms' &&
                      forms.filter(form => form.productId === formData.productId).map(form => (
                        <option key={form.id} value={form.id}>
                          {form.formName || form.formNumber}
                        </option>
                      ))
                    }
                    {formData.ruleType === 'Pricing' &&
                      pricingSteps.map(step => (
                        <option key={step.id} value={step.id}>
                          {step.stepName}
                        </option>
                      ))
                    }
                  </FormSelect>
                </FormGroup>
              )}

              <FormGroup>
                <FormLabel>When (Condition)</FormLabel>
                <FormInput
                  placeholder="When this condition is met..."
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>Then (Outcome)</FormLabel>
                <FormInput
                  placeholder="Then this outcome applies..."
                  value={formData.outcome}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>Reference</FormLabel>
                <FormInput
                  placeholder="Source document, regulation, or standard"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>Status</FormLabel>
                <FormSelect
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </FormSelect>
              </FormGroup>

              <FormGroup>
                <FormLabel>
                  <FormCheckbox
                    type="checkbox"
                    checked={formData.proprietary}
                    onChange={(e) => setFormData({ ...formData, proprietary: e.target.checked })}
                  />
                  Proprietary Rule
                </FormLabel>
              </FormGroup>

              <ButtonGroup>
                <PrimaryButton onClick={handleSave}>
                  {editingRule ? 'Update Rule' : 'Save Rule'}
                </PrimaryButton>
                <SecondaryButton onClick={closeModal}>
                  Cancel
                </SecondaryButton>
              </ButtonGroup>
            </ModalContainer>
          </ModalOverlay>
        )}

      </PageContent>
    </PageContainer>
  );
}
