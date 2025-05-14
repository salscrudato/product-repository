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
  const [searchQuery, setSearchQuery] = useState('');
  const [newDimension, setNewDimension] = useState({ name: '', values: '', technicalCode: '', type: 'Row', states: [] });
  const [editingDimensionId, setEditingDimensionId] = useState(null);
  const [tableData, setTableData] = useState({});
  const [modalOpen, setModalOpen] = useState(false);

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

  const filteredDimensions = dimensions.filter(dim =>
    dim.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dim.values.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dim.technicalCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Prepare dynamic table data
  const rowDimension = dimensions.find(dim => dim.type === 'Row');
  const colDimension = dimensions.find(dim => dim.type === 'Column');
  const rowValues = rowDimension ? rowDimension.values.split(',').map(val => val.trim()) : [''];
  const colValues = colDimension ? colDimension.values.split(',').map(val => val.trim()) : [''];

  return (
    <Page>
      <Container>
        <PageHeader>
          <Title>Table for Step: {step?.stepName || 'Loading…'}</Title>
          <Button variant="ghost" onClick={() => navigate(`/pricing/${productId}`)}>
            Back
          </Button>
        </PageHeader>

        {/* Search Bar */}
        <TextInput
          placeholder="Search dimensions…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ marginBottom: 24 }}
        />

        {/* Add Dimension Button */}
        <Button onClick={openAddModal} style={{ marginBottom: 24 }}>
          + Add Dimension
        </Button>

        {/* Dimensions Table */}
        <div style={{ overflowX: 'auto', marginBottom: 20 }}>
          <Table>
            <THead>
              <Tr>
                <Th>Type</Th>
                <Th>Dimension Name</Th>
                <Th>Dimension Values</Th>
                <Th>Technical Code</Th>
                <Th>States</Th>
                <Th>Actions</Th>
              </Tr>
            </THead>
            <tbody>
              {filteredDimensions.map(dimension => (
                <Tr key={dimension.id}>
                  <Td>{dimension.type}</Td>
                  <Td>{dimension.name}</Td>
                  <Td>{dimension.values}</Td>
                  <Td>{dimension.technicalCode}</Td>
                  <Td>{dimension.states.join(', ')}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
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
        </div>

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
                  type="text"
                  name="technicalCode"
                  value={newDimension.technicalCode}
                  onChange={handleInputChange}
                  placeholder="IT Code (e.g., Roof Age or Risk_RoofAge)"
                />
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

        {/* Dynamic Excel-like Table with Dimension Labels */}
        <div>
          <p style={{ fontSize: 16, fontWeight: 500, color: '#1F2937', marginBottom: 8 }}>
            Row Dimension: {rowDimension?.name || 'None'}
          </p>
          <p style={{ fontSize: 16, fontWeight: 500, color: '#1F2937', marginBottom: 8 }}>
            Column Dimension: {colDimension?.name || 'None'}
          </p>
        </div>
        <div
          style={{ overflowX: 'auto', marginBottom: 20 }}
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
                <Th>{rowDimension?.name || 'Table Preview'}</Th>
                {colValues.map((col, index) => (
                  <Th key={index}>{col}</Th>
                ))}
              </Tr>
            </THead>
            <tbody>
              {rowValues.map((row, rowIndex) => (
                <Tr key={rowIndex}>
                  <Td>{row}</Td>
                  {colValues.map((col, colIndex) => (
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
        </div>
      </Container>
    </Page>
  );
}

export default TableScreen;