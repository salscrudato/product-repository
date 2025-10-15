// src/components/RulesScreen.js
import React, { useEffect, useState, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
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

  Squares2X2Icon,
  TableCellsIcon,
  ListBulletIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  TagIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/solid';

import MainNavigation from '../components/ui/Navigation';

/* ---------- Modern Styled Components ---------- */

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

// Search Container
const SearchContainer = styled.div`
  position: relative;
  margin-bottom: 24px;
  max-width: 500px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 44px;
  font-size: 16px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  transition: all 0.3s ease;

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

const SearchIcon = styled.div`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;

  svg {
    width: 20px;
    height: 20px;
  }
`;

// Enhanced Filter Controls
const FilterContainer = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: center;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  width: 100%;
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 8px;
  background: white;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 40px;
  min-width: 140px;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const FilterLabel = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-right: 8px;
  white-space: nowrap;
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.8);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.6);
`;



const ViewModeToggle = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  padding: 4px;
  border: 1px solid rgba(226, 232, 240, 0.6);
`;

const ViewModeButton = styled.button.withConfig({
  shouldForwardProp: (prop) => !['active'].includes(prop),
})`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: ${({ active }) => active ? '#6366f1' : 'transparent'};
  color: ${({ active }) => active ? 'white' : '#64748b'};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ active }) => active ? '#5b5bd6' : 'rgba(99, 102, 241, 0.1)'};
    color: ${({ active }) => active ? 'white' : '#6366f1'};
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const SortControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`;

const SortSelect = styled.select`
  padding: 6px 10px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 6px;
  background: white;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`;

const SortOrderButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 6px;
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
    width: 16px;
    height: 16px;
  }
`;



// Toggle Switch for Proprietary Filter
const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
`;

const ToggleLabel = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: #374151;
`;

const ToggleSwitch = styled.div`
  position: relative;
  width: 44px;
  height: 24px;
  background: ${props => props.active ? '#6366f1' : '#e5e7eb'};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active ? '#5b5bd6' : '#d1d5db'};
  }
`;

const ToggleKnob = styled.div`
  position: absolute;
  top: 2px;
  left: ${props => props.active ? '22px' : '2px'};
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
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
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

export default function RulesScreen() {
  const navigate = useNavigate();
  const { productId: preselectedProductId } = useParams();

  // State management
  const [rules, setRules] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

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
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('cards'); // 'cards', 'table', 'hierarchy'
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
          loadCoveragesForProduct(preselectedProductId);
          loadPricingStepsForProduct(preselectedProductId);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [preselectedProductId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && !e.target.matches('input, textarea')) {
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

    // Product filter
    if (selectedProductFilter) {
      filtered = filtered.filter(rule => rule.productId === selectedProductFilter);
    }

    // Rule category filter
    if (selectedCategoryFilter) {
      filtered = filtered.filter(rule => rule.ruleCategory === selectedCategoryFilter);
    }

    // Status filter
    if (selectedStatusFilter) {
      filtered = filtered.filter(rule => rule.status === selectedStatusFilter);
    }

    // Type filter (proprietary/standard)
    if (selectedTypeFilter === 'proprietary') {
      filtered = filtered.filter(rule => rule.proprietary);
    } else if (selectedTypeFilter === 'standard') {
      filtered = filtered.filter(rule => !rule.proprietary);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy] || '';
      let bValue = b[sortBy] || '';

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [rules, searchTerm, selectedProductFilter, selectedCategoryFilter, selectedStatusFilter,
      selectedTypeFilter, sortBy, sortOrder]);

  // Get unique products for filter
  const uniqueProducts = products.filter(p => p.name).sort((a, b) => a.name.localeCompare(b.name));

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

  const openModal = async (rule = null) => {
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

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  // Load coverages when product is selected
  const loadCoveragesForProduct = async (productId) => {
    if (!productId) {
      setCoverages([]);
      return;
    }

    setLoadingTargets(true);
    try {
      const coveragesSnap = await getDocs(collection(db, `products/${productId}/coverages`));
      const coveragesList = coveragesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCoverages(coveragesList);
    } catch (error) {
      console.error('Error loading coverages:', error);
      setCoverages([]);
    } finally {
      setLoadingTargets(false);
    }
  };

  // Load pricing steps when product is selected
  const loadPricingStepsForProduct = async (productId) => {
    if (!productId) {
      setPricingSteps([]);
      return;
    }

    try {
      const stepsSnap = await getDocs(collection(db, `products/${productId}/steps`));
      const stepsList = stepsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPricingSteps(stepsList);
    } catch (error) {
      console.error('Error loading pricing steps:', error);
      setPricingSteps([]);
    }
  };

  // Handle product selection
  const handleProductChange = (productId) => {
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
  const handleRuleTypeChange = (ruleType) => {
    setFormData(prev => ({
      ...prev,
      ruleType,
      targetId: ''
    }));
  };

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

  const handleDelete = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;

    try {
      await deleteDoc(doc(db, 'rules', ruleId));
      setRules(rules => rules.filter(r => r.id !== ruleId));
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('Failed to delete rule. Please try again.');
    }
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  const getTargetName = (rule) => {
    if (!rule.ruleType) return 'Product Level';
    if (rule.ruleType === 'Product') return 'Product Level';
    if (!rule.targetId) return 'No Target';

    switch (rule.ruleType) {
      case 'Coverage':
        // For coverages, we need to find it in the current coverages or make a call
        const coverage = coverages.find(c => c.id === rule.targetId);
        return coverage?.name || 'Unknown Coverage';
      case 'Forms':
        const form = forms.find(f => f.id === rule.targetId);
        return form?.formName || form?.formNumber || 'Unknown Form';
      case 'Pricing':
        const step = pricingSteps.find(s => s.id === rule.targetId);
        return step?.stepName || 'Unknown Pricing Step';
      default:
        return 'Unknown Target';
    }
  };

  const getRuleTypeColor = (ruleType) => {
    switch (ruleType) {
      case 'Product': return '#6366f1';
      case 'Coverage': return '#10b981';
      case 'Forms': return '#f59e0b';
      case 'Pricing': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  return (
    <Container>
      <MainNavigation />
      <MainContent>
        <HeaderSection>
          <BackButton onClick={() => navigate(-1)}>
            <ArrowLeftIcon />
          </BackButton>
          <TitleContainer>
            <TitleIcon>
              <Cog6ToothIcon />
            </TitleIcon>
            <PageTitle>
              {preselectedProductId
                ? `${getProductName(preselectedProductId)} Rules`
                : 'Rules Repository'
              }
            </PageTitle>
          </TitleContainer>
        </HeaderSection>

        <SearchContainer>
          <SearchIcon>
            <MagnifyingGlassIcon />
          </SearchIcon>
          <SearchInput
            ref={searchRef}
            placeholder={preselectedProductId
              ? "Search coverage and form rules..."
              : "Search rules by name, category, condition, or outcome..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchContainer>

        <FilterContainer>
          <FilterRow>
            <FilterGroup>
              <FilterLabel>Product:</FilterLabel>
              <FilterSelect
                value={selectedProductFilter}
                onChange={(e) => setSelectedProductFilter(e.target.value)}
              >
                <option value="">All Products</option>
                {uniqueProducts.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </FilterSelect>
            </FilterGroup>

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

            <FilterGroup>
              <FilterLabel>Status:</FilterLabel>
              <FilterSelect
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </FilterSelect>
            </FilterGroup>

            <ToggleContainer>
              <ToggleLabel>Proprietary</ToggleLabel>
              <ToggleSwitch
                active={selectedTypeFilter === 'proprietary'}
                onClick={() => setSelectedTypeFilter(selectedTypeFilter === 'proprietary' ? '' : 'proprietary')}
              >
                <ToggleKnob active={selectedTypeFilter === 'proprietary'} />
              </ToggleSwitch>
            </ToggleContainer>



            <SortControls>
              <FilterLabel>Sort:</FilterLabel>
              <SortSelect
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">Name</option>
                <option value="status">Status</option>
                <option value="ruleCategory">Category</option>
                <option value="updatedAt">Updated</option>
              </SortSelect>
              <SortOrderButton
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />}
              </SortOrderButton>
            </SortControls>

            <ViewModeToggle>
              <ViewModeButton
                active={viewMode === 'cards'}
                onClick={() => setViewMode('cards')}
              >
                <Squares2X2Icon />
                Cards
              </ViewModeButton>
              <ViewModeButton
                active={viewMode === 'table'}
                onClick={() => setViewMode('table')}
              >
                <TableCellsIcon />
                Table
              </ViewModeButton>
              <ViewModeButton
                active={viewMode === 'hierarchy'}
                onClick={() => setViewMode('hierarchy')}
              >
                <ListBulletIcon />
                Hierarchy
              </ViewModeButton>
            </ViewModeToggle>
          </FilterRow>


        </FilterContainer>

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
              <RuleCard key={rule.id}>
                <CardHeader>
                  <CardTitleContainer>
                    <CardTitle>
                      {rule.name || 'Unnamed Rule'}
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
                    <IconButton onClick={() => openModal(rule)}>
                      <PencilIcon />
                    </IconButton>
                    <IconButton className="danger" onClick={() => handleDelete(rule.id)}>
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

      </MainContent>
    </Container>
  );
}
