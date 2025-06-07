import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { TrashIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Page, Container, PageHeader, Title } from '../components/ui/Layout';
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

import styled, { keyframes } from 'styled-components';
import { FixedSizeGrid as Grid } from 'react-window';

/* ---------- styled helpers ---------- */
const Card = styled.div`
  background:#ffffff;
  border-radius:12px;
  box-shadow:0 4px 12px rgba(0,0,0,0.08);
  padding:24px;
  margin-bottom:24px;
  overflow-x:auto;
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

// ---- virtualised grid sizing ----
const CELL_WIDTH = 120;     // px
const CELL_HEIGHT = 40;     // px




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
        const stepDoc = await getDoc(doc(db, `products/${productId}/pricingSteps`, stepId));
        if (stepDoc.exists()) {
          setStep(stepDoc.data());
        } else {
          throw new Error("Step not found");
        }

        const dimensionsSnapshot = await getDocs(collection(db, `products/${productId}/pricingSteps/${stepId}/dimensions`));
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

        // Initialize table data
        const initialData = {};
        const rowDim = dimensionList.find(dim => dim.type === 'Row');
        const colDim = dimensionList.find(dim => dim.type === 'Column');
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
      const docRef = await addDoc(collection(db, `products/${productId}/pricingSteps/${stepId}/dimensions`), {
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
      await updateDoc(doc(db, `products/${productId}/pricingSteps/${stepId}/dimensions`, editingDimensionId), {
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
        await deleteDoc(doc(db, `products/${productId}/pricingSteps/${stepId}/dimensions`, dimensionId));
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

  // (filteredDimensions removed, just use dimensions)

  // Prepare dynamic table data from selected dimensions
  const rowDimension = selectedDimensions[0];
  const colDimension = selectedDimensions[1];
  const rowValues = getDimValues(rowDimension);
  const colValues = getDimValues(colDimension);

  // Ensure we have valid dimensions for the grid
  const safeRowValues = rowValues.length > 0 ? rowValues : ['No Data'];
  const safeColValues = colValues.length > 0 ? colValues : ['No Data'];
  const gridColumnCount = Math.max(1, safeColValues.length + 1);
  const gridRowCount = Math.max(1, safeRowValues.length + 1);
  const gridWidth = Math.max(200, gridColumnCount * CELL_WIDTH);
  const gridHeight = Math.max(100, gridRowCount * CELL_HEIGHT);

  // Loading spinner
  if(!dimensions.length && !step){
    return (<Page><Container><Spinner/></Container></Page>);
  }

  // ---- virtualised grid cell renderer ----
  const renderGridCell = ({ columnIndex, rowIndex, style }) => {
    // top‑left empty corner
    if (rowIndex === 0 && columnIndex === 0) {
      return <div style={style} />;
    }

    // column headers (first row, >0 col)
    if (rowIndex === 0) {
      const col = safeColValues[columnIndex - 1];
      return (
        <div style={{ ...style, fontWeight: 600, background: '#F9FAFB', display:'flex',alignItems:'center',justifyContent:'center',borderBottom:'1px solid #E5E7EB',borderRight:'1px solid #E5E7EB' }}>
          {col}
        </div>
      );
    }

    // row headers (first col, >0 row)
    if (columnIndex === 0) {
      const row = safeRowValues[rowIndex - 1];
      return (
        <div style={{ ...style, fontWeight: 600, background: '#FFFFFF', display:'flex',alignItems:'center',justifyContent:'center',borderBottom:'1px solid #E5E7EB',borderRight:'1px solid #E5E7EB' }}>
          {row}
        </div>
      );
    }

    // data cell
    const rowKey = safeRowValues[rowIndex - 1];
    const colKey = safeColValues[columnIndex - 1];
    const cellKey = `${rowKey}-${colKey}`;
    return (
      <div style={{ ...style, padding:4, borderBottom:'1px solid #E5E7EB',borderRight:'1px solid #E5E7EB' }}>
        <TextInput
          type="text"
          value={tableData[cellKey] || ''}
          onChange={e => handleTableDataChange(cellKey, e.target.value)}
          style={{ width:'100%', height:'100%', border:'none', padding:4, boxSizing:'border-box' }}
        />
      </div>
    );
  };

  return (
    <Page>
      <Container>
        <PageHeader>
          <Title>Table for Step: {step?.stepName || 'Loading…'}</Title>
          <Button variant="ghost" onClick={() => navigate(`/pricing/${productId}`)}>
            Back
          </Button>
        </PageHeader>

        {/* Dynamic Excel-like Table with Dimension Labels */}
        {selectedDimensions.length === 2 ? (
          <>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: 16, fontWeight: 500, color: '#1F2937', marginBottom: 8 }}>
                Row Dimension: {rowDimension?.name || 'None'} ({rowValues.length} values)
              </p>
              <p style={{ fontSize: 16, fontWeight: 500, color: '#1F2937', marginBottom: 8 }}>
                Column Dimension: {colDimension?.name || 'None'} ({colValues.length} values)
              </p>
            </div>
            <Card
              onPaste={e => {
                const text = e.clipboardData.getData('text');
                const rows = text.trim().split(/\r?\n/).map(r => r.split(/\t|,/));
                const newData = { ...tableData };
                rows.forEach((rowArr, rIdx) => {
                  const rowKey = safeRowValues[rIdx];
                  rowArr.forEach((cellValue, cIdx) => {
                    const colKey = safeColValues[cIdx];
                    if (rowKey && colKey && rowKey !== 'No Data' && colKey !== 'No Data') {
                      newData[`${rowKey}-${colKey}`] = cellValue;
                    }
                  });
                });
                setTableData(newData);
                e.preventDefault();
              }}
            >
              <Grid
                columnCount={gridColumnCount}
                rowCount={gridRowCount}
                columnWidth={CELL_WIDTH}
                rowHeight={CELL_HEIGHT}
                height={Math.min(400, gridHeight)}
                width={Math.min(800, gridWidth)}
              >
                {renderGridCell}
              </Grid>
            </Card>
          </>
        ) : (
          <Card style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>No Table to Display</h3>
            <p style={{ margin: '0' }}>
              Please select exactly 2 dimensions above to generate a table.
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
                        onClick={() => handleRemoveDimension(dim.id)}
                      />
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Available Dimensions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
              {filteredDimensions.map(dimension => (
                <div
                  key={dimension.id}
                  onClick={() => handleSelectDimension(dimension)}
                  style={{
                    padding: '12px',
                    border: selectedDimensions.some(d => d.id === dimension.id)
                      ? '2px solid #6366f1'
                      : '1px solid #E5E7EB',
                    borderRadius: '8px',
                    cursor: selectedDimensions.length < 2 || selectedDimensions.some(d => d.id === dimension.id)
                      ? 'pointer'
                      : 'not-allowed',
                    background: selectedDimensions.some(d => d.id === dimension.id)
                      ? 'rgba(99, 102, 241, 0.05)'
                      : 'white',
                    opacity: selectedDimensions.length >= 2 && !selectedDimensions.some(d => d.id === dimension.id)
                      ? 0.5
                      : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontWeight: '500', fontSize: '14px', color: '#374151', marginBottom: '4px' }}>
                    {dimension.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    {dimension.values} ({(dimension.values || '').split(',').length} values)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Add Dimension Button */}
        <div style={{margin:'16px 0'}}>
          <Button onClick={openAddModal}>
            + Add Dimension
          </Button>
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
                    variant="ghost"
                    onClick={()=>{
                      const v = valueInput.trim();
                      if(v && !newDimension.values.includes(v)){
                        setNewDimension(prev=>({...prev, values:[...prev.values, v]}));
                      }
                      setValueInput('');
                    }}
                    title="Add value"
                    style={{padding:'0 10px'}}
                  >
                    +
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
                <Button
                  onClick={editingDimensionId ? handleUpdateDimension : handleAddDimension}
                  style={{ minWidth: 160, marginTop: 4 }}
                >
                  {editingDimensionId ? 'Update Dimension' : 'Add Dimension'}
                </Button>
              </div>
            </Modal>
          </Overlay>
        )}


      </Container>
    </Page>
  );
}

export default TableScreen;