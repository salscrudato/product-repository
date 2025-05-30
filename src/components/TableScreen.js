import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
  ModalHeader,
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


// List of U.S. state abbreviations
const usStates = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA',
  'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR',
  'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Helpers for state select all/clear
const selectAllStates = () => [...usStates];
const clearAllStates = () => [];

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
  const [newDimension, setNewDimension] = useState({ name: '', values: [], technicalCode: '', type: 'Row', states: [] });
  const [valueInput, setValueInput] = useState('');
  const [editingDimensionId, setEditingDimensionId] = useState(null);
  const [tableData, setTableData] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  // list of IT codes from data dictionary
  const [itCodes, setItCodes] = useState([]);

  const [statesModalOpen, setStatesModalOpen] = useState(false);
  const [statesList, setStatesList] = useState([]);

  const openStatesModal = (statesArr = []) => {
    setStatesList(statesArr);
    setStatesModalOpen(true);
  };

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
            values: valuesArr.join(', '),       // keep string form for consistency
            states: data.states || []
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

  const handleStatesChange = (e) => {
    const options = e.target.options;
    const selectedStates = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedStates.push(options[i].value);
      }
    }
    setNewDimension(prev => ({ ...prev, states: selectedStates }));
  };

  const handleTableDataChange = (key, value) => {
    setTableData(prev => ({ ...prev, [key]: value }));
  };

  const openAddModal = () => {
    setNewDimension({ name: '', values: [], technicalCode: '', type: 'Row', states: [] });
    setEditingDimensionId(null);
    setModalOpen(true);
  };

  const openEditModal = (dimension) => {
    setEditingDimensionId(dimension.id);
    setNewDimension({
      name: dimension.name,
      values: (dimension.values || '').split(',').map(v => v.trim()).filter(Boolean),
      technicalCode: dimension.technicalCode,
      type: dimension.type,
      states: dimension.states || []
    });
    setModalOpen(true);
  };

  const handleAddDimension = async () => {
    if (!newDimension.name || newDimension.values.length === 0) {
      alert('Please fill in the Name and Values fields');
      return;
    }
    if (dimensions.length >= 2) {
      alert('You can only add up to 2 dimensions (Row and Column).');
      return;
    }
    try {
      const docRef = await addDoc(collection(db, `products/${productId}/steps/${stepId}/dimensions`), {
        name: newDimension.name,
        values: newDimension.values.join(', '),
        technicalCode: newDimension.technicalCode,
        type: newDimension.type,
        states: newDimension.states
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
        technicalCode: newDimension.technicalCode,
        type: newDimension.type,
        states: newDimension.states
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

  // (filteredDimensions removed, just use dimensions)

  // Prepare dynamic table data
  const rowDimension = dimensions.find(dim => dim.type === 'Row');
  const colDimension = dimensions.find(dim => dim.type === 'Column');
  const rowValues = getDimValues(rowDimension);
  const colValues = getDimValues(colDimension);

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
      const col = colValues[columnIndex - 1];
      return (
        <div style={{ ...style, fontWeight: 600, background: '#F9FAFB', display:'flex',alignItems:'center',justifyContent:'center',borderBottom:'1px solid #E5E7EB',borderRight:'1px solid #E5E7EB' }}>
          {col}
        </div>
      );
    }

    // row headers (first col, >0 row)
    if (columnIndex === 0) {
      const row = rowValues[rowIndex - 1];
      return (
        <div style={{ ...style, fontWeight: 600, background: '#FFFFFF', display:'flex',alignItems:'center',justifyContent:'center',borderBottom:'1px solid #E5E7EB',borderRight:'1px solid #E5E7EB' }}>
          {row}
        </div>
      );
    }

    // data cell
    const rowKey = rowValues[rowIndex - 1];
    const colKey = colValues[columnIndex - 1];
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
        <div>
          <p style={{ fontSize: 16, fontWeight: 500, color: '#1F2937', marginBottom: 8 }}>
            Row Dimension: {rowDimension?.name || 'None'}
          </p>
          <p style={{ fontSize: 16, fontWeight: 500, color: '#1F2937', marginBottom: 8 }}>
            Column Dimension: {colDimension?.name || 'None'}
          </p>
        </div>
        <Card
          onPaste={e => {
            const text = e.clipboardData.getData('text');
            const rows = text.trim().split(/\r?\n/).map(r => r.split(/\t|,/));
            const newData = { ...tableData };
            rows.forEach((rowArr, rIdx) => {
              const rowKey = rowValues[rIdx];
              rowArr.forEach((cellValue, cIdx) => {
                const colKey = colValues[cIdx];
                if (rowKey && colKey) {
                  newData[`${rowKey}-${colKey}`] = cellValue;
                }
              });
            });
            setTableData(newData);
            e.preventDefault();
          }}
        >
          <Grid
            columnCount={colValues.length + 1}
            rowCount={rowValues.length + 1}
            columnWidth={CELL_WIDTH}
            rowHeight={CELL_HEIGHT}
            height={Math.min(400, (rowValues.length + 1) * CELL_HEIGHT)}
            width={Math.min(800, (colValues.length + 1) * CELL_WIDTH)}
          >
            {renderGridCell}
          </Grid>
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
                <Th>Type</Th>
                <Th>Dimension Name</Th>
                <Th>Dimension Values</Th>
                <Th>IT&nbsp;Code</Th>
                <Th>States</Th>
                <Th>Actions</Th>
              </Tr>
            </THead>
            <tbody>
              {dimensions.map(dimension => (
                <Tr key={dimension.id}>
                  <Td>{dimension.type}</Td>
                  <Td>{dimension.name}</Td>
                  <Td>{dimension.values}</Td>
                  <Td>{dimension.technicalCode}</Td>
                  <Td>
                    {dimension.states && dimension.states.length ? (
                      <Button
                        variant="ghost"
                        onClick={() => openStatesModal(dimension.states)}
                        style={{ padding: 0, fontSize: 14, color: '#2563eb' }}
                        title="View / edit states"
                      >
                        States&nbsp;({dimension.states.length})
                      </Button>
                    ) : '—'}
                  </Td>
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
                  as="select"
                  name="type"
                  value={newDimension.type}
                  onChange={handleInputChange}
                  style={{ minWidth: 120 }}
                >
                  <option value="Row">Row</option>
                  <option value="Column">Column</option>
                </TextInput>
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
                {/* Select All / Clear All Buttons for States */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <Button variant="ghost" onClick={() => setNewDimension(prev => ({ ...prev, states: selectAllStates() }))}>
                    Select All
                  </Button>
                  <Button variant="ghost" onClick={() => setNewDimension(prev => ({ ...prev, states: clearAllStates() }))}>
                    Clear All
                  </Button>
                </div>
                {/* Checkbox list for states */}
                <div
                  style={{
                    width:'100%',
                    maxHeight:160,
                    overflowY:'auto',
                    border:'1px solid #E5E7EB',
                    borderRadius:4,
                    padding:8
                  }}
                >
                  {usStates.map(state => (
                    <label key={state} style={{ display: 'block', padding: 4 }}>
                      <input
                        type="checkbox"
                        value={state}
                        checked={newDimension.states.includes(state)}
                        onChange={e => {
                          const val = e.target.value;
                          setNewDimension(prev =>
                            prev.states.includes(val)
                              ? { ...prev, states: prev.states.filter(s => s !== val) }
                              : { ...prev, states: [...prev.states, val] }
                          );
                        }}
                      />{' '}
                      {state}
                    </label>
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

        {/* States Modal */}
        {statesModalOpen && (
          <Overlay onClick={() => setStatesModalOpen(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <CloseBtn onClick={() => setStatesModalOpen(false)}>
                <XMarkIcon width={16} height={16} />
              </CloseBtn>
              <ModalTitle>States ({statesList.length})</ModalTitle>
              <div style={{ maxHeight: 300, overflowY: 'auto', padding: 12, lineHeight: 1.6 }}>
                {statesList.join(', ')}
              </div>
            </Modal>
          </Overlay>
        )}
      </Container>
    </Page>
  );
}

export default TableScreen;