import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  ArrowLeftIcon,
  TableCellsIcon,
  PlusIcon
} from '@heroicons/react/24/solid';

import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';
import {
  Table,
  THead,
  Tr,
  Th,
  Td,
  Overlay,
  Modal,
  ModalTitle,
  CloseBtn
} from '../components/ui/Table';
import MainNavigation from './ui/Navigation';

import styled, { keyframes } from 'styled-components';

/* ---------- styled helpers ---------- */
// Modern Container with responsive design
const ModernContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
  position: relative;
`;

const MainContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
  position: relative;
  z-index: 1;
`;

// Header components consistent with pricing screen
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

const CoveragePageHeaderSection = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 32px;
  gap: 16px;
`;

const CoveragePageTitle = styled.h1`
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

const Card = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 28px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  margin-bottom: 32px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  }
`;

const spin = keyframes`
  0%{transform:rotate(0deg);}
  100%{transform:rotate(360deg);}
`;
const Spinner = styled.div`
  border:4px solid #f3f3f3;
  border-top:4px solid #6366f1;
  border-radius:50%;
  width:40px;
  height:40px;
  animation:${spin} 1s linear infinite;
  margin:100px auto;
`;

// Enhanced Excel-like table styling
const ExcelTable = styled.div`
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
`;

const ExcelRow = styled.div`
  display: flex;
  border-bottom: 1px solid #e2e8f0;

  &:last-child {
    border-bottom: none;
  }
`;

const ExcelCell = styled.div`
  min-width: 120px;
  height: 40px;
  border-right: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  &:last-child {
    border-right: none;
  }

  ${props => props.isHeader && `
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    font-weight: 600;
    color: #374151;
    font-size: 14px;
    letter-spacing: 0.025em;
  `}

  ${props => props.isRowHeader && `
    background: rgba(248, 250, 252, 0.8);
    font-weight: 600;
    color: #475569;
    min-width: 100px;
  `}

  input {
    width: 100%;
    height: 100%;
    border: none;
    background: transparent;
    text-align: center;
    font-size: 14px;
    padding: 8px;

    &:focus {
      outline: 2px solid #6366f1;
      outline-offset: -2px;
      background: rgba(99, 102, 241, 0.05);
    }

    &:hover {
      background: rgba(248, 250, 252, 0.8);
    }
  }
`;

// Enhanced dimension selection styling
const DimensionCard = styled.div`
  padding: 16px;
  border: 2px solid ${props => props.selected ? '#6366f1' : '#e5e7eb'};
  border-radius: 12px;
  cursor: pointer;
  background: ${props => props.selected ? 'rgba(99, 102, 241, 0.05)' : 'white'};
  transition: all 0.2s ease;
  opacity: ${props => props.disabled ? 0.5 : 1};

  &:hover {
    ${props => !props.disabled && `
      border-color: #6366f1;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
    `}
  }

  .dimension-name {
    font-weight: 600;
    font-size: 14px;
    color: #374151;
    margin-bottom: 4px;
  }

  .dimension-values {
    font-size: 12px;
    color: #6b7280;
  }
`;

const SelectedDimensionTag = styled.span`
  background: #eef2ff;
  border-radius: 12px;
  padding: 6px 12px;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #c7d2fe;

  svg {
    cursor: pointer;
    color: #6366f1;

    &:hover {
      color: #4f46e5;
    }
  }
`;

// Modern button styling to match Add Product button
const ModernButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.25);
  transition: all 0.3s ease;
  letter-spacing: -0.01em;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35);
  }

  &:active:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    background: #e5e7eb;
    color: #9ca3af;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;




// helper to normalise a dimension's values into an array
const getDimValues = (dim) => {
  if (!dim) return [''];
  if (Array.isArray(dim.values)) return dim.values;
  if (typeof dim.values === 'string') {
    return dim.values.split(',').map(v => v.trim()).filter(Boolean);
  }
  return [''];
};

function TableScreen() {
  const { productId, stepId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(null);
  const [dimensions, setDimensions] = useState([]);
  // (search state and key handler effect removed)
  const [newDimension, setNewDimension] = useState({ name: '', values: [], technicalCode: '' });
  const [selectedDimensions, setSelectedDimensions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [editingDimensionId, setEditingDimensionId] = useState(null);
  const [tableData, setTableData] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  // list of IT codes from data dictionary
  const [itCodes, setItCodes] = useState([]);



  useEffect(() => {
    const fetchData = async () => {
      try {
        const stepDoc = await getDoc(doc(db, `products/${productId}/steps`, stepId));
        if (stepDoc.exists()) {
          setStep(stepDoc.data());
        } else {
          throw new Error("Step not found");
        }

        const dimensionsSnapshot = await getDocs(collection(db, `products/${productId}/steps/${stepId}/dimensions`));
        const dimensionList = dimensionsSnapshot.docs.map(d => {
          const data = d.data();
          const valuesArr = Array.isArray(data.values)
            ? data.values
            : String(data.values || '')
                .split(',')
                .map(v => v.trim())
                .filter(Boolean);
          return {
            id: d.id,
            ...data,
            values: valuesArr.join(', ')       // keep string form for consistency
          };
        });

        // pull IT codes from dataDictionary collection
        const codesSnap = await getDocs(collection(db, 'dataDictionary'));
        const codeList = codesSnap.docs.map(d => (d.data().code || '').trim()).filter(Boolean);
        setItCodes(codeList);

        setDimensions(dimensionList);

        // Auto-select dimensions by default (first two dimensions)
        if (dimensionList.length >= 2) {
          setSelectedDimensions([dimensionList[0], dimensionList[1]]);
        } else if (dimensionList.length === 1) {
          setSelectedDimensions([dimensionList[0]]);
        }

        // Initialize table data
        const initialData = {};
        const rowDim = dimensionList.find(dim => dim.type === 'Row') || dimensionList[0];
        const colDim = dimensionList.find(dim => dim.type === 'Column') || dimensionList[1];
        const rowValues = getDimValues(rowDim);
        const colValues = getDimValues(colDim);

        rowValues.forEach(row => {
          colValues.forEach(col => {
            initialData[`${row}-${col}`] = '';
          });
        });
        setTableData(initialData);
      } catch (error) {
        console.error("Error fetching data:", error);
        alert("Failed to load table data. Please try again.");
      }
    };
    fetchData();
  }, [productId, stepId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewDimension(prev => ({ ...prev, [name]: value }));
  };



  const handleTableDataChange = (key, value) => {
    setTableData(prev => ({ ...prev, [key]: value }));
  };

  // Dimension selection handlers
  const handleSelectDimension = (dimension) => {
    if (selectedDimensions.some(d => d.id === dimension.id)) {
      // Remove if already selected
      setSelectedDimensions(prev => prev.filter(d => d.id !== dimension.id));
    } else if (selectedDimensions.length < 2) {
      // Add if under limit
      setSelectedDimensions(prev => [...prev, dimension]);
    }
  };

  const handleRemoveDimension = (dimensionId) => {
    setSelectedDimensions(prev => prev.filter(d => d.id !== dimensionId));
  };

  // Filter dimensions based on search query
  const filteredDimensions = dimensions.filter(dimension =>
    dimension.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (dimension.values || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAddModal = () => {
    setNewDimension({ name: '', values: [], technicalCode: '' });
    setEditingDimensionId(null);
    setModalOpen(true);
  };

  const openEditModal = (dimension) => {
    setEditingDimensionId(dimension.id);
    setNewDimension({
      name: dimension.name,
      values: (dimension.values || '').split(',').map(v => v.trim()).filter(Boolean),
      technicalCode: dimension.technicalCode
    });
    setModalOpen(true);
  };

  const handleAddDimension = async () => {
    if (!newDimension.name || newDimension.values.length === 0) {
      alert('Please fill in the Name and Values fields');
      return;
    }
    try {
      const docRef = await addDoc(collection(db, `products/${productId}/steps/${stepId}/dimensions`), {
        name: newDimension.name,
        values: newDimension.values.join(', '),
        technicalCode: newDimension.technicalCode
      });
      const updatedDimensions = [...dimensions, {
        id: docRef.id,
        ...newDimension,
        values: newDimension.values.join(', ')
      }];
      setDimensions(updatedDimensions);
      setModalOpen(false);

      // Update table data
      const rowDim = updatedDimensions.find(dim => dim.type === 'Row');
      const colDim = updatedDimensions.find(dim => dim.type === 'Column');
      const rowValues = getDimValues(rowDim);
      const colValues = getDimValues(colDim);
      const newTableData = {};
      rowValues.forEach(row => {
        colValues.forEach(col => {
          newTableData[`${row}-${col}`] = tableData[`${row}-${col}`] || '';
        });
      });
      setTableData(newTableData);
    } catch (error) {
      console.error("Error adding dimension:", error);
      alert("Failed to add dimension. Please try again.");
    }
  };

  const handleUpdateDimension = async () => {
    if (!newDimension.name || newDimension.values.length === 0) {
      alert('Please fill in the Name and Values fields');
      return;
    }
    try {
      await updateDoc(doc(db, `products/${productId}/steps/${stepId}/dimensions`, editingDimensionId), {
        name: newDimension.name,
        values: newDimension.values.join(', '),
        technicalCode: newDimension.technicalCode
      });
      const updatedDimensions = dimensions.map(dim =>
        dim.id === editingDimensionId
          ? { id: dim.id, ...newDimension, values: newDimension.values.join(', ') }
          : dim
      );
      setDimensions(updatedDimensions);
      setEditingDimensionId(null);
      setModalOpen(false);

      // Update table data
      const rowDim = updatedDimensions.find(dim => dim.type === 'Row');
      const colDim = updatedDimensions.find(dim => dim.type === 'Column');
      const rowValues = getDimValues(rowDim);
      const colValues = getDimValues(colDim);
      const newTableData = {};
      rowValues.forEach(row => {
        colValues.forEach(col => {
          newTableData[`${row}-${col}`] = tableData[`${row}-${col}`] || '';
        });
      });
      setTableData(newTableData);
    } catch (error) {
      console.error("Error updating dimension:", error);
      alert("Failed to update dimension. Please try again.");
    }
  };

  const handleDeleteDimension = async (dimensionId) => {
    if (window.confirm("Are you sure you want to delete this dimension?")) {
      try {
        await deleteDoc(doc(db, `products/${productId}/steps/${stepId}/dimensions`, dimensionId));
        const updatedDimensions = dimensions.filter(dim => dim.id !== dimensionId);
        setDimensions(updatedDimensions);

        // Update table data
        const rowDim = updatedDimensions.find(dim => dim.type === 'Row');
        const colDim = updatedDimensions.find(dim => dim.type === 'Column');
        const rowValues = getDimValues(rowDim);
        const colValues = getDimValues(colDim);
        const newTableData = {};
        rowValues.forEach(row => {
          colValues.forEach(col => {
            newTableData[`${row}-${col}`] = tableData[`${row}-${col}`] || '';
          });
        });
        setTableData(newTableData);
      } catch (error) {
        console.error("Error deleting dimension:", error);
        alert("Failed to delete dimension. Please try again.");
      }
    }
  };



  // Loading spinner
  if(!dimensions.length && !step){
    return (
      <ModernContainer>
        <MainNavigation />
        <MainContent>
          <Spinner/>
        </MainContent>
      </ModernContainer>
    );
  }



  // Enhanced Excel-like table renderer
  const renderExcelTable = () => {
    if (selectedDimensions.length !== 2) return null;

    const rowDimension = selectedDimensions[0];
    const colDimension = selectedDimensions[1];
    const rowValues = getDimValues(rowDimension);
    const colValues = getDimValues(colDimension);

    return (
      <ExcelTable>
        {/* Header row */}
        <ExcelRow>
          <ExcelCell isHeader style={{ minWidth: '100px' }}>
            {/* Empty corner cell */}
          </ExcelCell>
          {colValues.map((col, index) => (
            <ExcelCell key={index} isHeader>
              {col}
            </ExcelCell>
          ))}
        </ExcelRow>

        {/* Data rows */}
        {rowValues.map((row, rowIndex) => (
          <ExcelRow key={rowIndex}>
            <ExcelCell isRowHeader>
              {row}
            </ExcelCell>
            {colValues.map((col, colIndex) => {
              const cellKey = `${row}-${col}`;
              return (
                <ExcelCell key={colIndex}>
                  <input
                    type="number"
                    value={tableData[cellKey] || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow numbers (including decimals)
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        handleTableDataChange(cellKey, value);
                      }
                    }}
                    placeholder="0"
                    step="any"
                  />
                </ExcelCell>
              );
            })}
          </ExcelRow>
        ))}
      </ExcelTable>
    );
  };

  return (
    <ModernContainer>
      <MainNavigation />
      <MainContent>
        <CoveragePageHeaderSection>
          <BackButton onClick={() => navigate(`/pricing/${productId}`)}>
            <ArrowLeftIcon />
          </BackButton>
          <TitleContainer>
            <TitleIcon>
              <TableCellsIcon />
            </TitleIcon>
            <CoveragePageTitle>
              Table: {step?.stepName || 'Loading…'}
            </CoveragePageTitle>
          </TitleContainer>
        </CoveragePageHeaderSection>

        {/* Enhanced Excel-like Table */}
        {selectedDimensions.length === 2 ? (
          <Card>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                Data Table
              </h3>
              <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>Rows: </span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    {selectedDimensions[0]?.name} ({getDimValues(selectedDimensions[0]).length} values)
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>Columns: </span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    {selectedDimensions[1]?.name} ({getDimValues(selectedDimensions[1]).length} values)
                  </span>
                </div>
              </div>
            </div>
            {renderExcelTable()}
          </Card>
        ) : (
          <Card style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>No Table to Display</h3>
            <p style={{ margin: '0' }}>
              Please select exactly 2 dimensions below to generate a table.
            </p>
          </Card>
        )}

        {/* Dimension Selection Section */}
        <Card style={{ marginBottom: '24px' }}>
          <div style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#374151' }}>
              Select Dimensions for Table (Choose up to 2)
            </h3>

            {/* Search Box */}
            <div style={{ marginBottom: '16px' }}>
              <TextInput
                type="text"
                placeholder="Search dimensions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', maxWidth: '400px' }}
              />
            </div>

            {/* Selected Dimensions Display */}
            {selectedDimensions.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  Selected Dimensions ({selectedDimensions.length}/2):
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedDimensions.map((dim, index) => (
                    <SelectedDimensionTag key={dim.id}>
                      {index === 0 ? 'Rows' : 'Columns'}: {dim.name}
                      <XMarkIcon
                        width={14}
                        height={14}
                        onClick={() => handleRemoveDimension(dim.id)}
                      />
                    </SelectedDimensionTag>
                  ))}
                </div>
              </div>
            )}

            {/* Available Dimensions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
              {filteredDimensions.map(dimension => (
                <DimensionCard
                  key={dimension.id}
                  selected={selectedDimensions.some(d => d.id === dimension.id)}
                  disabled={selectedDimensions.length >= 2 && !selectedDimensions.some(d => d.id === dimension.id)}
                  onClick={() => handleSelectDimension(dimension)}
                >
                  <div className="dimension-name">
                    {dimension.name}
                  </div>
                  <div className="dimension-values">
                    {dimension.values} ({(dimension.values || '').split(',').length} values)
                  </div>
                </DimensionCard>
              ))}
            </div>
          </div>
        </Card>

        {/* Add Dimension Button */}
        <div style={{margin:'16px 0'}}>
          <ModernButton onClick={openAddModal}>
            <PlusIcon width={16} height={16} />
            Add Dimension
          </ModernButton>
        </div>

        {/* Dimensions Table */}
        <Card>
          <Table>
            <THead>
              <Tr>
                <Th>Dimension Name</Th>
                <Th>Dimension Values</Th>
                <Th>IT&nbsp;Code</Th>
                <Th>Actions</Th>
              </Tr>
            </THead>
            <tbody>
              {dimensions.map(dimension => (
                <Tr key={dimension.id}>
                  <Td>{dimension.name}</Td>
                  <Td>{dimension.values}</Td>
                  <Td>{dimension.technicalCode}</Td>
                  <Td>
                    <div style={{display:'flex',gap:10}}>
                      <Button
                        variant="ghost"
                        onClick={() => openEditModal(dimension)}
                        title="Edit dimension"
                        style={{ padding: 4, minWidth: 0 }}
                      >
                        <PencilIcon width={16} height={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleDeleteDimension(dimension.id)}
                        title="Delete dimension"
                        style={{ color: '#DC2626', padding: 4, minWidth: 0 }}
                      >
                        <TrashIcon width={16} height={16} />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        {/* Modal for Adding/Editing Dimension */}
        {modalOpen && (
          <Overlay onClick={() => setModalOpen(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <CloseBtn onClick={() => setModalOpen(false)}>
                <XMarkIcon width={16} height={16} />
              </CloseBtn>
              <ModalTitle>{editingDimensionId ? 'Edit Dimension' : 'Add New Dimension'}</ModalTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                <TextInput
                  type="text"
                  name="name"
                  value={newDimension.name}
                  onChange={handleInputChange}
                  placeholder="Name (e.g., Roof Age)"
                />
                {/* Dimension values input UI */}
                <div style={{display:'flex',alignItems:'center',gap:8,width:'100%'}}>
                  <TextInput
                    placeholder="Add a value and press +"
                    value={valueInput}
                    onChange={e => setValueInput(e.target.value)}
                    style={{flex:1}}
                  />
                  <Button
                    variant="primary"
                    onClick={()=>{
                      const v = valueInput.trim();
                      if(v && !newDimension.values.includes(v)){
                        setNewDimension(prev=>({...prev, values:[...prev.values, v]}));
                      }
                      setValueInput('');
                    }}
                    title="Add value"
                    style={{padding:'8px 12px', minWidth: 'auto'}}
                  >
                    <PlusIcon width={14} height={14} />
                  </Button>
                </div>
                <div style={{marginTop:8,display:'flex',flexWrap:'wrap',gap:6}}>
                  {newDimension.values.map((v,idx)=>(
                    <span key={idx} style={{
                      background:'#EEF2FF',
                      borderRadius:12,
                      padding:'4px 10px',
                      fontSize:13,
                      display:'inline-flex',
                      alignItems:'center',
                      gap:4
                    }}>
                      {v}
                      <XMarkIcon
                        width={12}
                        height={12}
                        style={{cursor:'pointer'}}
                        onClick={()=> setNewDimension(prev=>({...prev, values:prev.values.filter(x=>x!==v)}))}
                      />
                    </span>
                  ))}
                </div>

                {/* IT Code select moved below states */}
                <label style={{ fontSize: 14, color: '#374151', marginBottom: 2, width: '100%' }}>IT&nbsp;Code (optional)</label>
                <TextInput
                  as="select"
                  name="technicalCode"
                  value={newDimension.technicalCode}
                  onChange={handleInputChange}
                  style={{ minWidth: 180, fontSize: 13 }}
                >
                  <option value="" disabled style={{ color: '#6B7280', fontSize: 13 }}>
                    Select IT Code
                  </option>
                  {itCodes.map(code => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </TextInput>
                <ModernButton
                  onClick={editingDimensionId ? handleUpdateDimension : handleAddDimension}
                  style={{ minWidth: 160, marginTop: 4 }}
                >
                  {editingDimensionId ? 'Update Dimension' : 'Add Dimension'}
                </ModernButton>
              </div>
            </Modal>
          </Overlay>
        )}
      </MainContent>
    </ModernContainer>
  );
}

export default TableScreen;