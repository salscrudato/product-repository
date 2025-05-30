// Enhanced TableScreen with modern UI/UX, virtualization, and performance optimizations
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, updateDoc, writeBatch, addDoc, deleteDoc } from 'firebase/firestore';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  Squares2X2Icon,
  TableCellsIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/solid';
import styled, { keyframes } from 'styled-components';
import { FixedSizeGrid as Grid } from 'react-window';
import { toast } from 'react-hot-toast';

// Import custom hooks
import { useSearchFilter } from '../hooks/useSearchFilter';
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
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

// Header Section
const HeaderSection = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  margin-bottom: 32px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  animation: ${slideIn} 0.6s ease-out;
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
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
`;

const PageSubtitle = styled.p`
  color: #64748b;
  font-size: 16px;
  margin: 0;
  font-weight: 400;
`;

const ActionBar = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

// Controls Section
const ControlsSection = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 300px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  font-size: 14px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    background: white;
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const SearchIcon = styled(MagnifyingGlassIcon)`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #9ca3af;
  pointer-events: none;
`;

// View Toggle
const ViewToggle = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 4px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const ViewToggleButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  background: ${props => props.active ? 'rgba(99, 102, 241, 0.1)' : 'transparent'};
  color: ${props => props.active ? '#6366f1' : '#64748b'};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.05)'};
    color: #6366f1;
  }
`;

// Dimension Selection
const DimensionSection = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
`;

const DimensionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const DimensionCard = styled.div`
  background: white;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    border-color: #6366f1;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
  }

  ${props => props.selected && `
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.02);
  `}
`;

const DimensionTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
`;

const DimensionDescription = styled.p`
  margin: 0;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
`;

const SelectionBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #6366f1;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  opacity: ${props => props.visible ? 1 : 0};
  transition: opacity 0.2s ease;
`;

// Table Container
const TableContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  animation: ${fadeIn} 0.6s ease-out;
  margin-bottom: 32px;
`;

const VirtualizedTableContainer = styled.div`
  height: 600px;
  width: 100%;
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
  padding: 60px 20px;
  color: #6b7280;

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 8px 0;
  }

  p {
    font-size: 14px;
    margin: 0 0 24px 0;
  }
`;

// Modal Components
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const Modal = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 32px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
`;

const ModalTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 24px 0;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
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
`;

const FormInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  font-weight: 400;
  margin-bottom: 16px;

  &:focus {
    outline: none;
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

const FormSelect = styled.select`
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  font-weight: 400;
  margin-bottom: 16px;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.2), 0 0 0 4px rgba(99, 102, 241, 0.1);
    background: rgba(255, 255, 255, 0.95);
    transform: translateY(-2px);
  }
`;

const ValueTag = styled.span`
  background: #EEF2FF;
  border-radius: 12px;
  padding: 4px 10px;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 2px;
`;

const DimensionManagementSection = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
`;

const DimensionTable = styled.div`
  background: white;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.6);
  margin-top: 16px;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 3fr 1fr 1fr 120px;
  gap: 16px;
  padding: 16px 20px;
  background: #f8fafc;
  font-weight: 600;
  font-size: 14px;
  color: #374151;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 3fr 1fr 1fr 120px;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.3);
  transition: background-color 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.02);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

// Memoized Table Cell Component
const TableCell = memo(({ columnIndex, rowIndex, style, data }) => {
  const { tableData, rowDimension, colDimension, onCellEdit } = data;
  const isHeader = rowIndex === 0;
  const isFirstColumn = columnIndex === 0;

  if (isHeader) {
    if (isFirstColumn) {
      return (
        <div style={{
          ...style,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '600',
          fontSize: '14px',
          color: '#374151'
        }}>
          {rowDimension?.name || 'Rows'} / {colDimension?.name || 'Columns'}
        </div>
      );
    }

    const colValue = colDimension?.values?.[columnIndex - 1];
    return (
      <div style={{
        ...style,
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '600',
        fontSize: '14px',
        color: '#374151'
      }}>
        {colValue || `Col ${columnIndex}`}
      </div>
    );
  }

  if (isFirstColumn) {
    const rowValue = rowDimension?.values?.[rowIndex - 1];
    return (
      <div style={{
        ...style,
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        fontWeight: '500',
        fontSize: '13px',
        color: '#374151'
      }}>
        {rowValue || `Row ${rowIndex}`}
      </div>
    );
  }

  const rowValue = rowDimension?.values?.[rowIndex - 1];
  const colValue = colDimension?.values?.[columnIndex - 1];
  const cellKey = `${rowValue}-${colValue}`;
  const cellValue = tableData[cellKey] || '';

  return (
    <div style={{
      ...style,
      border: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <input
        type="text"
        value={cellValue}
        onChange={(e) => onCellEdit(cellKey, e.target.value)}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          outline: 'none',
          textAlign: 'center',
          fontSize: '13px',
          background: 'transparent'
        }}
        placeholder="0"
      />
    </div>
  );
});

TableCell.displayName = 'TableCell';

export default function TableScreenEnhanced() {
  const { productId } = useParams();
  const navigate = useNavigate();

  // State management
  const [productName, setProductName] = useState('');
  const [dimensions, setDimensions] = useState([]);
  const [selectedDimensions, setSelectedDimensions] = useState([]);
  const [tableData, setTableData] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');

  // Dimension management state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDimensionId, setEditingDimensionId] = useState(null);
  const [newDimension, setNewDimension] = useState({ name: '', values: [], description: '', category: '' });
  const [valueInput, setValueInput] = useState('');

  // Search functionality
  const {
    searchQuery,
    filteredData: filteredDimensions,
    updateSearchQuery
  } = useSearchFilter(dimensions, ['name', 'description', 'category']);

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

        // Load dimensions from Firebase
        const dimensionsSnapshot = await getDocs(collection(db, `products/${productId}/dimensions`));
        const dimensionList = dimensionsSnapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || '',
            description: data.description || '',
            category: data.category || 'General',
            values: Array.isArray(data.values) ? data.values :
                   typeof data.values === 'string' ? data.values.split(',').map(v => v.trim()).filter(Boolean) : []
          };
        });
        setDimensions(dimensionList);

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
  const handleDimensionToggle = useCallback((dimension) => {
    setSelectedDimensions(prev => {
      const isSelected = prev.some(d => d.id === dimension.id);
      if (isSelected) {
        return prev.filter(d => d.id !== dimension.id);
      } else if (prev.length < 2) {
        return [...prev, dimension];
      }
      return prev; // Don't add if already at limit
    });
  }, []);



  const handleCellEdit = useCallback((cellKey, value) => {
    setTableData(prev => ({
      ...prev,
      [cellKey]: value
    }));
  }, []);

  const handleSaveChanges = useCallback(async () => {
    try {
      // Implement batch save to Firestore
      const batch = writeBatch(db);

      Object.entries(tableData).forEach(([key, value]) => {
        // Create document reference for each cell
        const docRef = doc(db, `products/${productId}/tableData`, key);
        batch.set(docRef, { value, updatedAt: new Date() });
      });

      await batch.commit();
      toast.success('Changes saved successfully');
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    }
  }, [productId, tableData]);

  // Dimension management functions
  const openAddModal = () => {
    setNewDimension({ name: '', values: [], description: '', category: 'General' });
    setEditingDimensionId(null);
    setModalOpen(true);
  };

  const openEditModal = (dimension) => {
    setEditingDimensionId(dimension.id);
    setNewDimension({
      name: dimension.name,
      values: dimension.values || [],
      description: dimension.description || '',
      category: dimension.category || 'General'
    });
    setModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewDimension(prev => ({ ...prev, [name]: value }));
  };

  const handleAddDimension = async () => {
    if (!newDimension.name || newDimension.values.length === 0) {
      toast.error('Please fill in the Name and Values fields');
      return;
    }
    try {
      const docRef = await addDoc(collection(db, `products/${productId}/dimensions`), {
        name: newDimension.name,
        values: newDimension.values,
        description: newDimension.description,
        category: newDimension.category
      });
      const updatedDimensions = [...dimensions, {
        id: docRef.id,
        ...newDimension
      }];
      setDimensions(updatedDimensions);
      setModalOpen(false);
      toast.success('Dimension added successfully');
    } catch (error) {
      console.error("Error adding dimension:", error);
      toast.error("Failed to add dimension. Please try again.");
    }
  };

  const handleUpdateDimension = async () => {
    if (!newDimension.name || newDimension.values.length === 0) {
      toast.error('Please fill in the Name and Values fields');
      return;
    }
    try {
      await updateDoc(doc(db, `products/${productId}/dimensions`, editingDimensionId), {
        name: newDimension.name,
        values: newDimension.values,
        description: newDimension.description,
        category: newDimension.category
      });
      const updatedDimensions = dimensions.map(dim =>
        dim.id === editingDimensionId
          ? { id: dim.id, ...newDimension }
          : dim
      );
      setDimensions(updatedDimensions);
      setEditingDimensionId(null);
      setModalOpen(false);
      toast.success('Dimension updated successfully');
    } catch (error) {
      console.error("Error updating dimension:", error);
      toast.error("Failed to update dimension. Please try again.");
    }
  };

  const handleDeleteDimension = async (dimensionId) => {
    if (window.confirm("Are you sure you want to delete this dimension?")) {
      try {
        await deleteDoc(doc(db, `products/${productId}/dimensions`, dimensionId));
        const updatedDimensions = dimensions.filter(dim => dim.id !== dimensionId);
        setDimensions(updatedDimensions);
        // Remove from selected dimensions if it was selected
        setSelectedDimensions(prev => prev.filter(dim => dim.id !== dimensionId));
        toast.success('Dimension deleted successfully');
      } catch (error) {
        console.error("Error deleting dimension:", error);
        toast.error("Failed to delete dimension. Please try again.");
      }
    }
  };

  // Get row and column dimensions
  const rowDimension = selectedDimensions.find(d => d.category === 'Demographics') || selectedDimensions[0];
  const colDimension = selectedDimensions.find(d => d.category === 'Vehicle') || selectedDimensions[1];

  // Virtualized table data
  const virtualTableData = useMemo(() => ({
    tableData,
    rowDimension,
    colDimension,
    onCellEdit: handleCellEdit
  }), [tableData, rowDimension, colDimension, handleCellEdit]);

  // Loading state
  if (loading) {
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

  return (
    <Container>
      <MainNavigation />
      <ContentWrapper>
        {/* Header Section */}
        <HeaderSection>
          <HeaderContent>
            <TitleSection>
              <PageTitle>Table Configuration</PageTitle>
              <PageSubtitle>{productName}</PageSubtitle>
            </TitleSection>
            <ActionBar>
              <Button onClick={handleSaveChanges}>
                Save Changes
              </Button>
              <Button variant="ghost">
                <ArrowDownTrayIcon width={16} height={16} />
                Export
              </Button>
              <Button variant="ghost">
                <ArrowUpTrayIcon width={16} height={16} />
                Import
              </Button>
            </ActionBar>
          </HeaderContent>

          {/* Controls */}
          <ControlsSection>
            <SearchContainer>
              <SearchIcon />
              <SearchInput
                placeholder="Search dimensions..."
                value={searchQuery}
                onChange={(e) => updateSearchQuery(e.target.value)}
              />
            </SearchContainer>
            <ViewToggle>
              <ViewToggleButton
                active={viewMode === 'table'}
                onClick={() => setViewMode('table')}
              >
                <TableCellsIcon width={16} height={16} />
                Table
              </ViewToggleButton>
              <ViewToggleButton
                active={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
              >
                <Squares2X2Icon width={16} height={16} />
                Grid
              </ViewToggleButton>
            </ViewToggle>

          </ControlsSection>
        </HeaderSection>

        {/* Dimension Selection */}
        <DimensionSection>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#374151' }}>
            Select Dimensions for Table (Choose up to 2)
          </h3>

          {/* Selected Dimensions Display */}
          {selectedDimensions.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                Selected Dimensions ({selectedDimensions.length}/2):
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selectedDimensions.map((dim, index) => (
                  <span key={dim.id} style={{
                    background: '#EEF2FF',
                    borderRadius: '12px',
                    padding: '6px 12px',
                    fontSize: '13px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: '1px solid #C7D2FE'
                  }}>
                    {index === 0 ? 'Rows' : 'Columns'}: {dim.name}
                    <XMarkIcon
                      width={14}
                      height={14}
                      style={{ cursor: 'pointer', color: '#6366f1' }}
                      onClick={() => handleDimensionToggle(dim)}
                    />
                  </span>
                ))}
              </div>
            </div>
          )}

          <DimensionGrid>
            {filteredDimensions.map(dimension => (
              <DimensionCard
                key={dimension.id}
                selected={selectedDimensions.some(d => d.id === dimension.id)}
                onClick={() => handleDimensionToggle(dimension)}
                style={{
                  opacity: selectedDimensions.length >= 2 && !selectedDimensions.some(d => d.id === dimension.id)
                    ? 0.5
                    : 1,
                  cursor: selectedDimensions.length < 2 || selectedDimensions.some(d => d.id === dimension.id)
                    ? 'pointer'
                    : 'not-allowed'
                }}
              >
                <SelectionBadge visible={selectedDimensions.some(d => d.id === dimension.id)}>
                  <CheckIcon width={12} height={12} />
                </SelectionBadge>
                <DimensionTitle>{dimension.name}</DimensionTitle>
                <DimensionDescription>
                  {dimension.description} ({dimension.values?.length || 0} values)
                </DimensionDescription>
              </DimensionCard>
            ))}
          </DimensionGrid>
        </DimensionSection>

        {/* Dimension Management */}
        <DimensionManagementSection>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#374151' }}>
              Manage Dimensions
            </h3>
            <Button onClick={openAddModal}>
              <PlusIcon width={16} height={16} />
              Add Dimension
            </Button>
          </div>

          {dimensions.length > 0 ? (
            <DimensionTable>
              <TableHeader>
                <div>Name</div>
                <div>Values</div>
                <div>Category</div>
                <div>Description</div>
                <div>Actions</div>
              </TableHeader>
              {dimensions.map(dimension => (
                <TableRow key={dimension.id}>
                  <div style={{ fontWeight: '500', color: '#374151' }}>{dimension.name}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    {dimension.values?.slice(0, 3).join(', ')}
                    {dimension.values?.length > 3 && ` +${dimension.values.length - 3} more`}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>{dimension.category}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    {dimension.description?.substring(0, 50)}
                    {dimension.description?.length > 50 && '...'}
                  </div>
                  <ActionButtons>
                    <button
                      onClick={() => openEditModal(dimension)}
                      style={{
                        padding: '6px',
                        border: 'none',
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: '#6366f1',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Edit dimension"
                    >
                      <PencilIcon width={14} height={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteDimension(dimension.id)}
                      style={{
                        padding: '6px',
                        border: 'none',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Delete dimension"
                    >
                      <TrashIcon width={14} height={14} />
                    </button>
                  </ActionButtons>
                </TableRow>
              ))}
            </DimensionTable>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <p>No dimensions created yet. Click "Add Dimension" to get started.</p>
            </div>
          )}
        </DimensionManagementSection>

        {/* Table */}
        {rowDimension && colDimension ? (
          <TableContainer>
            <div style={{ marginBottom: '16px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                Table Configuration:
              </p>
              <p style={{ margin: '0', fontSize: '13px', color: '#6b7280' }}>
                Rows: {rowDimension.name} ({rowDimension.values?.length || 0} values) |
                Columns: {colDimension.name} ({colDimension.values?.length || 0} values)
              </p>
            </div>
            <VirtualizedTableContainer>
              <Grid
                columnCount={(colDimension.values?.length || 0) + 1}
                columnWidth={120}
                height={600}
                width={Math.min(1200, ((colDimension.values?.length || 0) + 1) * 120)}
                rowCount={(rowDimension.values?.length || 0) + 1}
                rowHeight={50}
                itemData={virtualTableData}
              >
                {TableCell}
              </Grid>
            </VirtualizedTableContainer>
          </TableContainer>
        ) : (
          <EmptyState>
            <h3>No Data to Display</h3>
            <p>Please select at least two dimensions to create a table.</p>
          </EmptyState>
        )}

        {/* Modal for Adding/Editing Dimension */}
        {modalOpen && (
          <ModalOverlay onClick={() => setModalOpen(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <CloseButton onClick={() => setModalOpen(false)}>
                <XMarkIcon width={16} height={16} />
              </CloseButton>
              <ModalTitle>{editingDimensionId ? 'Edit Dimension' : 'Add New Dimension'}</ModalTitle>

              <FormInput
                type="text"
                name="name"
                value={newDimension.name}
                onChange={handleInputChange}
                placeholder="Dimension name (e.g., Age Group)"
              />

              <FormInput
                type="text"
                name="description"
                value={newDimension.description}
                onChange={handleInputChange}
                placeholder="Description (optional)"
              />

              <FormSelect
                name="category"
                value={newDimension.category}
                onChange={handleInputChange}
              >
                <option value="General">General</option>
                <option value="Demographics">Demographics</option>
                <option value="Vehicle">Vehicle</option>
                <option value="Coverage">Coverage</option>
                <option value="Financial">Financial</option>
                <option value="Geographic">Geographic</option>
              </FormSelect>

              {/* Dimension values input UI */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  Values
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <FormInput
                    placeholder="Add a value and press +"
                    value={valueInput}
                    onChange={e => setValueInput(e.target.value)}
                    style={{ flex: 1, marginBottom: 0 }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const v = valueInput.trim();
                        if (v && !newDimension.values.includes(v)) {
                          setNewDimension(prev => ({ ...prev, values: [...prev.values, v] }));
                        }
                        setValueInput('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const v = valueInput.trim();
                      if (v && !newDimension.values.includes(v)) {
                        setNewDimension(prev => ({ ...prev, values: [...prev.values, v] }));
                      }
                      setValueInput('');
                    }}
                    style={{
                      padding: '12px 16px',
                      border: 'none',
                      background: '#6366f1',
                      color: 'white',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                    title="Add value"
                  >
                    +
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {newDimension.values.map((v, idx) => (
                    <ValueTag key={idx}>
                      {v}
                      <XMarkIcon
                        width={12}
                        height={12}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setNewDimension(prev => ({
                          ...prev,
                          values: prev.values.filter(x => x !== v)
                        }))}
                      />
                    </ValueTag>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <Button
                  onClick={editingDimensionId ? handleUpdateDimension : handleAddDimension}
                  style={{ flex: 1 }}
                >
                  {editingDimensionId ? 'Update Dimension' : 'Add Dimension'}
                </Button>
                <button
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    border: '1px solid rgba(226, 232, 240, 0.6)',
                    borderRadius: '12px',
                    background: 'transparent',
                    color: '#6b7280',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </Modal>
          </ModalOverlay>
        )}
      </ContentWrapper>


    </Container>
  );
}
