// Enhanced PricingScreen with modern UI/UX, performance optimizations, and best practices
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  XMarkIcon
} from '@heroicons/react/24/solid';
import styled, { keyframes } from 'styled-components';
import { toast } from 'react-hot-toast';

// Import our custom hooks and components
import { usePricingSteps } from '../hooks/usePricingSteps';
import { useSearchFilter } from '../hooks/useSearchFilter';
import PricingStepItem from './pricing/PricingStepItem';
import StepForm from './pricing/StepForm';

import MainNavigation from './ui/Navigation';
import { Button } from './ui/Button';

/* ========== STYLED COMPONENTS ========== */

// Animations
const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// Main Container
const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
  position: relative;
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

// Enhanced Header Section
const HeaderSection = styled.div`
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 18px;
  border: 1px solid rgba(226, 232, 240, 0.4);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  animation: ${slideIn} 0.4s ease-out;
  width: 100%;
  max-width: 1000px;
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }
`;

const TitleSection = styled.div`
  flex: 1;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b 0%, #475569 50%, #64748b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 8px 0;
  letter-spacing: -0.02em;
  line-height: 1.1;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 1.5rem;
    margin-bottom: 6px;
  }
`;

const PageSubtitle = styled.p`
  color: #64748b;
  font-size: 16px;
  margin: 0;
  font-weight: 400;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const ActionBar = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

// Enhanced Search and Filter Section
const SearchFilterSection = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 6px;
  flex-wrap: wrap;
  justify-content: center;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 500px;
  min-width: 280px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px 8px 32px;
  border: 2px solid rgba(226, 232, 240, 0.6);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.95);
  font-size: 13px;
  transition: all 0.2s ease;
  height: 36px;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    background: white;
  }

  &::placeholder {
    color: #9ca3af;
    font-size: 13px;
  }
`;

const SearchIcon = styled(MagnifyingGlassIcon)`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  color: #9ca3af;
  pointer-events: none;
`;

// Enhanced Table Container
const TableContainer = styled.div`
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.4);
  box-shadow: 0 3px 16px rgba(0, 0, 0, 0.08);
  animation: ${fadeIn} 0.4s ease-out;
  margin-bottom: 20px;
  width: 100%;
  max-width: 1000px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    border-bottom: 1px solid rgba(226, 232, 240, 0.3);
  }

  th {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    font-weight: 600;
    color: #475569;
    padding: 8px 6px;
    font-size: 11px;
    letter-spacing: 0.03em;
    text-align: center;
    white-space: nowrap;
    text-transform: uppercase;
    border-bottom: 2px solid rgba(226, 232, 240, 0.6);
  }

  td {
    padding: 8px 6px;
    transition: all 0.2s ease;
    font-size: 12px;
    text-align: center;
    vertical-align: middle;
  }

  tbody tr:hover {
    background: rgba(99, 102, 241, 0.02);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  /* Optimize column widths */
  th:nth-child(1), td:nth-child(1) { width: 18%; } /* Coverage */
  th:nth-child(2), td:nth-child(2) { width: 35%; } /* Step */
  th:nth-child(3), td:nth-child(3) { width: 15%; } /* States */
  th:nth-child(4), td:nth-child(4) { width: 12%; } /* Value */
  th:nth-child(5), td:nth-child(5) { width: 20%; } /* Actions */
`;

// Enhanced Price Display - Smaller version
const PriceDisplay = styled.div`
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  text-align: center;
  width: fit-content;
  min-width: 60px;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
  transition: all 0.2s ease;
  margin: 8px auto 0;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 12px rgba(99, 102, 241, 0.3);
  }

  .label {
    font-size: 8px;
    opacity: 0.9;
    margin-bottom: 1px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
  }

  .value {
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1;
  }
`;

// Table Footer with Add Step and Price
const TableFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  margin-top: 16px;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
`;

// Add Step Button - Styled like a table row
const AddStepButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(99, 102, 241, 0.05);
  border: 2px dashed rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  color: #6366f1;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 140px;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.5);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

// Table Price Display
const TablePriceDisplay = styled.div`
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 12px rgba(99, 102, 241, 0.3);
  }

  .label {
    font-size: 10px;
    opacity: 0.9;
    margin-bottom: 2px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
  }

  .value {
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1;
  }
`;

// Loading States
const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 32px 20px;
  color: #6b7280;

  h3 {
    font-size: 16px;
    font-weight: 500;
    color: #374151;
    margin: 0 0 6px 0;
  }

  p {
    font-size: 13px;
    margin: 0 0 16px 0;
    line-height: 1.4;
  }
`;



// Enhanced Button Styles
const CompactButton = styled(Button)`
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
  }
`;

// Modal Components
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  animation: ${fadeIn} 0.2s ease-out;
`;

const Modal = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  animation: ${slideIn} 0.3s ease-out;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
`;

const ModalTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  letter-spacing: -0.01em;
`;

const CloseButton = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
`;

const ModalContent = styled.div`
  padding: 20px 24px;
  max-height: 400px;
  overflow-y: auto;
`;

const CoverageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CoverageItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(99, 102, 241, 0.04);
  border: 1px solid rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    border-color: rgba(99, 102, 241, 0.2);
    transform: translateY(-1px);
  }
`;

const CoverageInfo = styled.div`
  flex: 1;
`;

const CoverageName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
`;

const CoverageCode = styled.div`
  font-size: 12px;
  color: #64748b;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
  font-size: 14px;
`;

export default function PricingScreenEnhanced() {
  const { productId } = useParams();
  const navigate = useNavigate();

  // State management
  const [productName, setProductName] = useState('');
  const [coverages, setCoverages] = useState([]);
  const [dataCodes, setDataCodes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [stepFormOpen, setStepFormOpen] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [coverageModalOpen, setCoverageModalOpen] = useState(false);
  const [selectedCoverages, setSelectedCoverages] = useState([]);
  const [statesModalOpen, setStatesModalOpen] = useState(false);
  const [selectedStates, setSelectedStates] = useState([]);

  // Filter state
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    stepType: '',
    coverage: '',
    states: []
  });

  // Custom hooks
  const {
    steps,
    loading: stepsLoading,
    error: stepsError,
    calculatedPrice,
    addStep,
    updateStep,
    deleteStep,
    reorderSteps,
    duplicateStep,
    validateStep
  } = usePricingSteps(productId);

  const {
    searchQuery,
    filteredData: searchFilteredSteps,
    updateSearchQuery,
    updateFilter,
    hasActiveFilters: hasSearchFilters
  } = useSearchFilter(steps, ['stepName', 'coverages', 'tableName']);

  // Apply additional filters
  const filteredSteps = searchFilteredSteps.filter(step => {
    // Filter by step type
    if (activeFilters.stepType && step.stepType !== activeFilters.stepType) {
      return false;
    }

    // Filter by coverage
    if (activeFilters.coverage && step.stepType === 'factor') {
      if (!step.coverages || !step.coverages.includes(activeFilters.coverage)) {
        return false;
      }
    }

    // Filter by states
    if (activeFilters.states.length > 0 && step.stepType === 'factor') {
      if (!step.states || !activeFilters.states.some(state => step.states.includes(state))) {
        return false;
      }
    }

    return true;
  });

  const hasActiveFilters = hasSearchFilters ||
    activeFilters.stepType ||
    activeFilters.coverage ||
    activeFilters.states.length > 0;

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!productId) return;

      try {
        setLoading(true);

        // Load product details
        const productDoc = await getDoc(doc(db, 'products', productId));
        if (productDoc.exists()) {
          setProductName(productDoc.data().name);
        }

        // Load coverages
        const coveragesSnapshot = await getDocs(collection(db, `products/${productId}/coverages`));
        const coveragesList = coveragesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCoverages(coveragesList);

        // Load data dictionary codes
        const dataCodesSnapshot = await getDocs(collection(db, 'dataDictionary'));
        const codesList = dataCodesSnapshot.docs
          .map(doc => doc.data().code)
          .filter(Boolean)
          .sort();
        setDataCodes(codesList);

      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [productId]);

  // Event handlers
  const handleAddStep = useCallback(() => {
    setEditingStep(null);
    setStepFormOpen(true);
  }, []);

  const handleEditStep = useCallback((step) => {
    setEditingStep(step);
    setStepFormOpen(true);
  }, []);

  const handleDeleteStep = useCallback(async (stepId) => {
    if (window.confirm('Are you sure you want to delete this step?')) {
      const success = await deleteStep(stepId);
      if (success) {
        toast.success('Step deleted successfully');
      } else {
        toast.error('Failed to delete step');
      }
    }
  }, [deleteStep]);

  const handleDuplicateStep = useCallback(async (stepId) => {
    const success = await duplicateStep(stepId);
    if (success) {
      toast.success('Step duplicated successfully');
    } else {
      toast.error('Failed to duplicate step');
    }
  }, [duplicateStep]);

  const handleStepSubmit = useCallback(async (stepData) => {
    const validation = validateStep(stepData);
    if (!validation.isValid) {
      Object.values(validation.errors).forEach(error => {
        toast.error(error);
      });
      return;
    }

    let success;
    if (editingStep) {
      success = await updateStep(editingStep.id, stepData);
      if (success) {
        toast.success('Step updated successfully');
      }
    } else {
      success = await addStep(stepData);
      if (success) {
        toast.success('Step added successfully');
      }
    }

    if (success) {
      setStepFormOpen(false);
      setEditingStep(null);
    } else {
      toast.error('Failed to save step');
    }
  }, [editingStep, addStep, updateStep, validateStep]);

  const handleMoveStep = useCallback(async (stepId, currentIndex, direction) => {
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    const reorderedSteps = [...steps];
    const [movedStep] = reorderedSteps.splice(currentIndex, 1);
    reorderedSteps.splice(newIndex, 0, movedStep);

    const success = await reorderSteps(reorderedSteps);
    if (success) {
      toast.success('Step moved successfully');
    } else {
      toast.error('Failed to move step');
    }
  }, [steps, reorderSteps]);

  const handleViewCoverages = useCallback((stepCoverages) => {
    // Find the full coverage objects from the coverages list
    const fullCoverages = stepCoverages.map(coverageName => {
      return coverages.find(c => c.name === coverageName) || { name: coverageName, coverageCode: 'N/A' };
    });
    setSelectedCoverages(fullCoverages);
    setCoverageModalOpen(true);
  }, [coverages]);

  const handleViewStates = useCallback((states) => {
    setSelectedStates(states);
    setStatesModalOpen(true);
  }, []);

  // Filter handlers
  const handleFilterChange = useCallback((filterType, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setActiveFilters({
      stepType: '',
      coverage: '',
      states: []
    });
  }, []);

  // Table navigation handler
  const handleViewTable = useCallback((step) => {
    if (step.tableName || step.table) {
      navigate(`/table/${productId}/${step.id}`);
    }
  }, [navigate, productId]);

  // Loading state
  if (loading || stepsLoading) {
    return (
      <Container>
        <MainNavigation />
        <ContentWrapper>
          <LoadingContainer>
            <LoadingSpinner />
          </LoadingContainer>
        </ContentWrapper>
      </Container>
    );
  }

  // Error state
  if (stepsError) {
    return (
      <Container>
        <MainNavigation />
        <ContentWrapper>
          <EmptyState>
            <h3>Error Loading Steps</h3>
            <p>There was an error loading the pricing steps. Please try again.</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </EmptyState>
        </ContentWrapper>
      </Container>
    );
  }

  return (
    <Container>
      <MainNavigation />
      <ContentWrapper>
        {/* Header Section */}
        <HeaderSection>
          <HeaderContent>
            <TitleSection>
              <PageTitle>Pricing Configuration</PageTitle>
              <PageSubtitle>{productName}</PageSubtitle>
            </TitleSection>
            <ActionBar>
              <CompactButton variant="ghost">
                <ArrowDownTrayIcon width={12} height={12} />
                Export
              </CompactButton>
              <CompactButton variant="ghost">
                <ArrowUpTrayIcon width={12} height={12} />
                Import
              </CompactButton>
            </ActionBar>
          </HeaderContent>

          {/* Search and Filters */}
          <SearchFilterSection>
            <SearchContainer>
              <SearchIcon />
              <SearchInput
                placeholder="Search steps by name, coverage, or table..."
                value={searchQuery}
                onChange={(e) => updateSearchQuery(e.target.value)}
              />
            </SearchContainer>
            <CompactButton
              variant="ghost"
              onClick={() => setFilterModalOpen(true)}
              style={{
                background: hasActiveFilters ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                color: hasActiveFilters ? '#6366f1' : 'inherit'
              }}
            >
              <FunnelIcon width={14} height={14} />
              Filters {hasActiveFilters && '●'}
            </CompactButton>
          </SearchFilterSection>
        </HeaderSection>

        {/* Steps Table */}
        <TableContainer>
          <Table>
            <thead>
              <tr>
                <th>Coverage</th>
                <th>Step</th>
                <th>States</th>
                <th>Value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSteps.length > 0 ? (
                filteredSteps.map((step, index) => (
                  <PricingStepItem
                    key={step.id}
                    step={step}
                    index={index}
                    onEdit={handleEditStep}
                    onDelete={handleDeleteStep}
                    onDuplicate={handleDuplicateStep}
                    onMoveUp={(stepId, idx) => handleMoveStep(stepId, idx, 'up')}
                    onMoveDown={(stepId, idx) => handleMoveStep(stepId, idx, 'down')}
                    onViewCoverages={handleViewCoverages}
                    onViewStates={handleViewStates}
                    onViewTable={handleViewTable}
                    canMoveUp={index > 0}
                    canMoveDown={index < filteredSteps.length - 1}
                    isFirst={index === 0}
                    isLast={index === filteredSteps.length - 1}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan="5">
                    <EmptyState>
                      <h3>No Steps Found</h3>
                      <p>
                        {hasActiveFilters
                          ? 'No steps match your search criteria.'
                          : 'Get started by adding your first pricing step.'
                        }
                      </p>
                      {!hasActiveFilters && (
                        <CompactButton onClick={handleAddStep}>
                          <PlusIcon width={14} height={14} />
                          Add First Step
                        </CompactButton>
                      )}
                    </EmptyState>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          {/* Table Footer with Add Step and Price */}
          <TableFooter>
            <AddStepButton onClick={handleAddStep}>
              <PlusIcon width={16} height={16} />
              Add Step
            </AddStepButton>
            <TablePriceDisplay>
              <div className="label">Premium</div>
              <div className="value">${calculatedPrice}</div>
            </TablePriceDisplay>
          </TableFooter>
        </TableContainer>
      </ContentWrapper>



      {/* Step Form Modal */}
      <StepForm
        isOpen={stepFormOpen}
        onClose={() => {
          setStepFormOpen(false);
          setEditingStep(null);
        }}
        onSubmit={handleStepSubmit}
        editingStep={editingStep}
        coverages={coverages}
        dataCodes={dataCodes}
        states={['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY']}
      />

      {/* Coverage Modal */}
      {coverageModalOpen && (
        <Overlay onClick={() => setCoverageModalOpen(false)}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Applied Coverages</ModalTitle>
              <CloseButton onClick={() => setCoverageModalOpen(false)}>
                <XMarkIcon width={16} height={16} />
              </CloseButton>
            </ModalHeader>
            <ModalContent>
              {selectedCoverages.length > 0 ? (
                <CoverageList>
                  {selectedCoverages.map((coverage, index) => (
                    <CoverageItem key={index}>
                      <CoverageInfo>
                        <CoverageName>{coverage.name}</CoverageName>
                        <CoverageCode>{coverage.coverageCode}</CoverageCode>
                      </CoverageInfo>
                    </CoverageItem>
                  ))}
                </CoverageList>
              ) : (
                <EmptyMessage>
                  No coverages selected for this step.
                </EmptyMessage>
              )}
            </ModalContent>
          </Modal>
        </Overlay>
      )}

      {/* States Modal */}
      {statesModalOpen && (
        <Overlay onClick={() => setStatesModalOpen(false)}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Applied States</ModalTitle>
              <CloseButton onClick={() => setStatesModalOpen(false)}>
                <XMarkIcon width={16} height={16} />
              </CloseButton>
            </ModalHeader>
            <ModalContent>
              {selectedStates.length > 0 ? (
                <CoverageList>
                  {selectedStates.map((state, index) => (
                    <CoverageItem key={index}>
                      <CoverageInfo>
                        <CoverageName>{state}</CoverageName>
                        <CoverageCode>State Code</CoverageCode>
                      </CoverageInfo>
                    </CoverageItem>
                  ))}
                </CoverageList>
              ) : (
                <EmptyMessage>
                  No states selected for this step.
                </EmptyMessage>
              )}
            </ModalContent>
          </Modal>
        </Overlay>
      )}

      {/* Filter Modal */}
      {filterModalOpen && (
        <Overlay onClick={() => setFilterModalOpen(false)}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Filter Steps</ModalTitle>
              <CloseButton onClick={() => setFilterModalOpen(false)}>
                <XMarkIcon width={16} height={16} />
              </CloseButton>
            </ModalHeader>
            <ModalContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Step Type Filter */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                    Step Type
                  </label>
                  <select
                    value={activeFilters.stepType}
                    onChange={(e) => handleFilterChange('stepType', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">All Types</option>
                    <option value="factor">Factor</option>
                    <option value="operand">Operand</option>
                  </select>
                </div>

                {/* Coverage Filter */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                    Coverage
                  </label>
                  <select
                    value={activeFilters.coverage}
                    onChange={(e) => handleFilterChange('coverage', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">All Coverages</option>
                    {coverages.map(coverage => (
                      <option key={coverage.id} value={coverage.name}>
                        {coverage.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* States Filter */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                    States
                  </label>
                  <select
                    multiple
                    value={activeFilters.states}
                    onChange={(e) => {
                      const selectedStates = Array.from(e.target.selectedOptions, option => option.value);
                      handleFilterChange('states', selectedStates);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      minHeight: '100px'
                    }}
                  >
                    {['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'].map(state => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Hold Ctrl/Cmd to select multiple states
                  </small>
                </div>

                {/* Filter Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <CompactButton variant="ghost" onClick={handleClearFilters}>
                    Clear All
                  </CompactButton>
                  <CompactButton onClick={() => setFilterModalOpen(false)}>
                    Apply Filters
                  </CompactButton>
                </div>
              </div>
            </ModalContent>
          </Modal>
        </Overlay>
      )}
    </Container>
  );
}
