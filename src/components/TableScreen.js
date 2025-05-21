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

/* ---------- styled helpers ---------- */
const Card = styled.div`
  background:#ffffff;
  border-radius:12px;
  box-shadow:0 4px 12px rgba(0,0,0,0.08);
  padding:24px;
  margin-bottom:24px;
  overflow-x:auto;
`;

const TableContainer = styled.div`
  overflow:auto;
  max-width:100%;
`;

const StickyTh = styled(Th)`
  position:sticky;
  top:0;
  background:#F9FAFB;
  z-index:2;
`;

const RowHeaderTd = styled(Td)`
  position:sticky;
  left:0;
  background:#ffffff;
  font-weight:500;
  z-index:1;
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


// List of U.S. state abbreviations
const usStates = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA',
  'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR',
  'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Helpers for state select all/clear
const selectAllStates = () => [...usStates];
const clearAllStates = () => [];

function TableScreen() {
  const { productId, stepId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(null);
  const [dimensions, setDimensions] = useState([]);
  // (search state and key handler effect removed)
  const [newDimension, setNewDimension] = useState({ name: '', values: '', technicalCode: '', type: 'Row', states: [] });
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
        const dimensionList = dimensionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          states: doc.data().states || [] // Ensure states is an array
        }));

        // pull IT codes from dataDictionary collection
        const codesSnap = await getDocs(collection(db, 'dataDictionary'));
        const codeList = codesSnap.docs.map(d => (d.data().code || '').trim()).filter(Boolean);
        setItCodes(codeList);

        setDimensions(dimensionList);

        // Initialize table data
        const initialData = {};
        const rowDim = dimensionList.find(dim => dim.type === 'Row');
        const colDim = dimensionList.find(dim => dim.type === 'Column');
        const rowValues = rowDim ? rowDim.values.split(',').map(val => val.trim()) : [''];
        const colValues = colDim ? colDim.values.split(',').map(val => val.trim()) : [''];

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
    setNewDimension({ name: '', values: '', technicalCode: '', type: 'Row', states: [] });
    setEditingDimensionId(null);
    setModalOpen(true);
  };

  const openEditModal = (dimension) => {
    setEditingDimensionId(dimension.id);
    setNewDimension({
      name: dimension.name,
      values: dimension.values,
      technicalCode: dimension.technicalCode,
      type: dimension.type,
      states: dimension.states || []
    });
    setModalOpen(true);
  };

  const handleAddDimension = async () => {
    if (!newDimension.name || !newDimension.values || !newDimension.technicalCode) {
      alert('Please fill in all required fields');
      return;
    }
    if (dimensions.length >= 2) {
      alert('You can only add up to 2 dimensions (Row and Column).');
      return;
    }
    try {
      const docRef = await addDoc(collection(db, `products/${productId}/steps/${stepId}/dimensions`), {
        name: newDimension.name,
        values: newDimension.values,
        technicalCode: newDimension.technicalCode,
        type: newDimension.type,
        states: newDimension.states
      });
      const updatedDimensions = [...dimensions, { id: docRef.id, ...newDimension }];
      setDimensions(updatedDimensions);
      setModalOpen(false);

      // Update table data
      const rowDim = updatedDimensions.find(dim => dim.type === 'Row');
      const colDim = updatedDimensions.find(dim => dim.type === 'Column');
      const rowValues = rowDim ? rowDim.values.split(',').map(val => val.trim()) : [''];
      const colValues = colDim ? colDim.values.split(',').map(val => val.trim()) : [''];
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
    if (!newDimension.name || !newDimension.values || !newDimension.technicalCode) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      await updateDoc(doc(db, `products/${productId}/steps/${stepId}/dimensions`, editingDimensionId), {
        name: newDimension.name,
        values: newDimension.values,
        technicalCode: newDimension.technicalCode,
        type: newDimension.type,
        states: newDimension.states
      });
      const updatedDimensions = dimensions.map(dim => (dim.id === editingDimensionId ? { id: dim.id, ...newDimension } : dim));
      setDimensions(updatedDimensions);
      setEditingDimensionId(null);
      setModalOpen(false);

      // Update table data
      const rowDim = updatedDimensions.find(dim => dim.type === 'Row');
      const colDim = updatedDimensions.find(dim => dim.type === 'Column');
      const rowValues = rowDim ? rowDim.values.split(',').map(val => val.trim()) : [''];
      const colValues = colDim ? colDim.values.split(',').map(val => val.trim()) : [''];
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
        const rowValues = rowDim ? rowDim.values.split(',').map(val => val.trim()) : [''];
        const colValues = colDim ? colDim.values.split(',').map(val => val.trim()) : [''];
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
  const rowValues = rowDimension ? rowDimension.values.split(',').map(val => val.trim()) : [''];
  const colValues = colDimension ? colDimension.values.split(',').map(val => val.trim()) : [''];

  // Loading spinner
  if(!dimensions.length && !step){
    return (<Page><Container><Spinner/></Container></Page>);
  }

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
        <Card>
          <TableContainer
            onPaste={e => {
              // Parse pasted CSV/TSV into tableData
              const text = e.clipboardData.getData('text');
              const rows = text.trim().split(/\r?\n/).map(r => r.split(/\t|,/));
              // Build new data object
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
            <Table>
              <THead>
                <Tr>
                  <StickyTh>{rowDimension?.name || 'Table Preview'}</StickyTh>
                  {colValues.map((col,index)=>(
                    <StickyTh key={index}>{col}</StickyTh>
                  ))}
                </Tr>
              </THead>
              <tbody>
                {rowValues.map((row,rowIndex)=>(
                  <Tr key={rowIndex}>
                    <RowHeaderTd>{row}</RowHeaderTd>
                    {colValues.map((col,colIndex)=>(
                      <Td key={colIndex}>
                        <TextInput
                          type="text"
                          value={tableData[`${row}-${col}`] || ''}
                          onChange={(e) => handleTableDataChange(`${row}-${col}`, e.target.value)}
                          placeholder="Enter value"
                        />
                      </Td>
                    ))}
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>
        </Card>

        {/* Add Dimension Button */}
        <div style={{margin:'16px 0'}}>
          <Button onClick={openAddModal}>
            + Add Dimension
          </Button>
        </div>

        {/* Dimensions Table */}
        <Card>
          <TableContainer>
            <Table>
              <THead>
                <Tr>
                  <StickyTh>Type</StickyTh>
                  <StickyTh>Dimension Name</StickyTh>
                  <StickyTh>Dimension Values</StickyTh>
                  <StickyTh>IT&nbsp;Code</StickyTh>
                  <StickyTh>States</StickyTh>
                  <StickyTh>Actions</StickyTh>
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
          </TableContainer>
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
                <TextInput
                  type="text"
                  name="values"
                  value={newDimension.values}
                  onChange={handleInputChange}
                  placeholder="Dimension Values (e.g., 1-5, 6-10, 11-15)"
                />
                <TextInput
                  as="select"
                  name="technicalCode"
                  value={newDimension.technicalCode}
                  onChange={handleInputChange}
                  style={{ minWidth: 180 }}
                >
                  <option value="">Select IT Code</option>
                  {itCodes.map(code => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </TextInput>
                {/* Select All / Clear All Buttons for States */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <Button variant="ghost" onClick={() => setNewDimension(prev => ({ ...prev, states: selectAllStates() }))}>
                    Select All
                  </Button>
                  <Button variant="ghost" onClick={() => setNewDimension(prev => ({ ...prev, states: clearAllStates() }))}>
                    Clear All
                  </Button>
                </div>
                <TextInput
                  as="select"
                  multiple
                  name="states"
                  value={newDimension.states}
                  onChange={handleStatesChange}
                  style={{ minWidth: 120, height: 80 }}
                >
                  {usStates.map(state => (
                    <option key={state} value={state}>{state}</option>
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