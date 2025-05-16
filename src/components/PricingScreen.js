import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { TrashIcon, PencilIcon, XMarkIcon, InformationCircleIcon, PlusCircleIcon, PlusIcon, MinusIcon, MapIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { FunnelIcon } from '@heroicons/react/24/solid';
import { Page, Container, PageHeader, Title } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';
import {
  Table,
  THead as TableHead,
  Tr as TableRow,
  Th as TableHeader,
  Td as TableCell,
  Overlay,
  Modal as ModalBox,
  ModalHeader,
  ModalTitle,
  CloseBtn
} from '../components/ui/Table';
import Select from 'react-select';
import styled, { keyframes } from 'styled-components';

const ActionsContainer = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #1F2937;
    display: flex;
    align-items: center;
    gap: 4px;
  }
`;

const CoverageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  background: #F9FAFB;
`;

const StateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  background: #F9FAFB;
`;

const FilterWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 300px;
`;

const OptionLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #1F2937;
  input[type="checkbox"] {
    accent-color: #6B46C1;
  }
`;

const SelectAllContainer = styled.div`
  margin-bottom: 8px;
`;

const StepLabel = styled.span`
  display: block;
  margin-top: 24px;
  font-weight: 700;
  font-size: 24px;
  color: #1F2937;
`;
// State filter options
const usStates = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
const stateOptions = usStates.map(s => ({ value: s, label: s }));
const FiltersContainer = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
`;

const Skeleton = styled.div`
  width: 100%;
  height: 20px;
  background: #E5E7EB;
  border-radius: 4px;
  animation: pulse 1.5s infinite;
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;

// Loading spinner
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;
const Spinner = styled.div`
  border: 4px solid #f3f3f3;
  border-top: 4px solid #6366f1;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: ${spin} 1s linear infinite;
  margin: 100px auto;
`;

// StepModal Component
function StepModal({ onClose, onSubmit, editingStep, steps, coverages, dataCodes }) {
  const defaultStep = {
    stepType: 'factor',
    coverages: [],
    stepName: '',
    type: 'User Input',
    table: '',
    rounding: 'none',
    states: [],
    upstreamId: '',
    operand: '',
    value: 0
  };

  const [stepData, setStepData] = useState(editingStep ? { ...editingStep } : { ...defaultStep });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setStepData(editingStep ? { ...editingStep } : { ...defaultStep });
    setErrors({});
  }, [editingStep]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStepData(prev => ({ ...prev, [name]: name === 'value' ? parseFloat(value) || 0 : value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleCoveragesChange = (coverage, checked) => {
    setStepData(prev => ({
      ...prev,
      coverages: checked
        ? [...prev.coverages, coverage]
        : prev.coverages.filter(c => c !== coverage)
    }));
  };

  const handleSelectAllCoverages = (checked) => {
    setStepData(prev => ({
      ...prev,
      coverages: checked ? coverages.map(c => c.name) : []
    }));
  };

  const handleStatesChange = (state, checked) => {
    setStepData(prev => ({
      ...prev,
      states: checked
        ? [...prev.states, state]
        : prev.states.filter(s => s !== state)
    }));
  };

  const handleSelectAllStates = (checked) => {
    setStepData(prev => ({
      ...prev,
      states: checked ? allStates : []
    }));
  };

  const handleUpstreamChange = (e) => {
    setStepData(prev => ({ ...prev, upstreamId: e.target.value }));
  };

  const validate = () => {
    const newErrors = {};
    if (stepData.stepType === 'factor') {
      if (!stepData.stepName) newErrors.stepName = 'Step Name is required';
      if (stepData.coverages.length === 0) newErrors.coverages = 'At least one coverage is required';
    } else if (!stepData.operand) {
      newErrors.operand = 'Operand is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(stepData);
    }
  };

  const allStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

  return (
    <Overlay onClick={onClose}>
      <ModalBox onClick={e => e.stopPropagation()}>
        <CloseBtn onClick={onClose} aria-label="Close modal"><XMarkIcon width={24} height={24} /></CloseBtn>
        <ModalHeader>
          <ModalTitle>{editingStep ? 'Edit Step' : 'Add Step'}</ModalTitle>
        </ModalHeader>
        <FormGroup>
          <label>Step Type</label>
          <select name="stepType" value={stepData.stepType} onChange={handleChange} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #D1D5DB' }}>
            <option value="factor">Factor</option>
            <option value="operand">Operand</option>
          </select>
        </FormGroup>
        {stepData.stepType === 'factor' ? (
          <>
            <FormGroup>
              <label>Coverages {errors.coverages && <span style={{ color: '#EF4444' }}>{errors.coverages}</span>}</label>
              <SelectAllContainer>
                <OptionLabel>
                  <input
                    type="checkbox"
                    checked={stepData.coverages.length === coverages.length}
                    onChange={e => handleSelectAllCoverages(e.target.checked)}
                  />
                  All
                </OptionLabel>
              </SelectAllContainer>
              <CoverageGrid>
                {coverages.map(c => (
                  <OptionLabel key={c.id}>
                    <input
                      type="checkbox"
                      checked={stepData.coverages.includes(c.name)}
                      onChange={e => handleCoveragesChange(c.name, e.target.checked)}
                      disabled={stepData.coverages.length === coverages.length && !stepData.coverages.includes(c.name)}
                    />
                    {c.name}
                  </OptionLabel>
                ))}
              </CoverageGrid>
            </FormGroup>
            <FormGroup>
              <label>Step Name {errors.stepName && <span style={{ color: '#EF4444' }}>{errors.stepName}</span>}</label>
              <TextInput name="stepName" value={stepData.stepName} onChange={handleChange} className={errors.stepName ? 'error' : ''} />
            </FormGroup>
            <FormGroup>
              <label>Value</label>
              <TextInput type="number" name="value" value={stepData.value} onChange={handleChange} placeholder="Enter factor value" />
            </FormGroup>
            <FormGroup>
              <label>Type</label>
              <select name="type" value={stepData.type} onChange={handleChange} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #D1D5DB' }}>
                <option value="User Input">User Input</option>
                <option value="Table">Table</option>
                <option value="Other">Other</option>
              </select>
            </FormGroup>
            <FormGroup>
              <label>Table Name (Optional)</label>
              <TextInput name="table" value={stepData.table} onChange={handleChange} />
            </FormGroup>
            <FormGroup>
              <label>Rounding</label>
              <select name="rounding" value={stepData.rounding} onChange={handleChange} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #D1D5DB' }}>
                <option value="none">None</option>
                <option value="Whole Number">Whole Number</option>
                <option value="1 Decimal">1 Decimal</option>
                <option value="2 Decimals">2 Decimals</option>
                <option value="Other">Other</option>
              </select>
            </FormGroup>
            <FormGroup>
              <label>States <InformationCircleIcon style={{ width: '16px', color: '#6B7280' }} title="Select applicable states" /></label>
              <SelectAllContainer>
                <OptionLabel>
                  <input
                    type="checkbox"
                    checked={stepData.states.length === allStates.length}
                    onChange={e => handleSelectAllStates(e.target.checked)}
                  />
                  All
                </OptionLabel>
              </SelectAllContainer>
              <StateGrid>
                {allStates.map(state => (
                  <OptionLabel key={state}>
                    <input
                      type="checkbox"
                      checked={stepData.states.includes(state)}
                      onChange={e => handleStatesChange(state, e.target.checked)}
                      disabled={stepData.states.length === allStates.length && !stepData.states.includes(state)}
                    />
                    {state}
                  </OptionLabel>
                ))}
              </StateGrid>
            </FormGroup>
            <FormGroup>
              <label>Upstream ID</label>
              <select
                name="upstreamId"
                value={stepData.upstreamId}
                onChange={handleChange}
                style={{ width:'100%', padding:12, borderRadius:8, border:'1px solid #D1D5DB' }}
              >
                <option value="">Select IT Code</option>
                {dataCodes.map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </FormGroup>
          </>
        ) : (
          <FormGroup>
            <label>Operand {errors.operand && <span style={{ color: '#EF4444' }}>{errors.operand}</span>}</label>
            <select name="operand" value={stepData.operand} onChange={handleChange} className={errors.operand ? 'error' : ''} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #D1D5DB' }}>
              <option value="">Select Operand</option>
              <option value="+">+</option>
              <option value="-">-</option>
              <option value="*">*</option>
              <option value="/">/</option>
              <option value="=">=</option>
            </select>
          </FormGroup>
        )}
        <Button onClick={handleSubmit} aria-label={editingStep ? 'Update step' : 'Add step'} style={{ marginTop: 16 }}>
          {editingStep ? 'Update Step' : 'Add Step'}
        </Button>
      </ModalBox>
    </Overlay>
  );
}

// Main PricingScreen Component
function PricingScreen() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [productName, setProductName] = useState('');
  const [coverages, setCoverages] = useState([]);
  const [steps, setSteps] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState('N/A');
  const [selectedCoverage, setSelectedCoverage] = useState(null);
  const [selectedStates, setSelectedStates] = useState([]);
  const [dataCodes, setDataCodes] = useState([]);

  useEffect(() => {
    const fetchDictionary = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'dataDictionary'));
        const codes = snapshot.docs.map(d => d.data().code).filter(Boolean).sort();
        setDataCodes(codes);
      } catch (err) {
        console.error('Unable to load data‑dictionary codes', err);
      }
    };
    fetchDictionary();
  }, []);

  const [covModalOpen, setCovModalOpen] = useState(false);
  const [covModalList, setCovModalList] = useState([]);
  const openCovModal = list => {
    setCovModalList(list);
    setCovModalOpen(true);
  };

  const allStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const productDoc = await getDoc(doc(db, 'products', productId));
        if (productDoc.exists()) {
          setProductName(productDoc.data().name);
        } else {
          throw new Error("Product not found");
        }

        const coveragesSnapshot = await getDocs(collection(db, `products/${productId}/coverages`));
        const coverageList = coveragesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCoverages(coverageList);

        const stepsSnapshot = await getDocs(collection(db, `products/${productId}/steps`));
        const stepList = stepsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        stepList.sort((a, b) => a.order - b.order);
        setSteps(stepList);
      } catch (error) {
        console.error("Error fetching data:", error);
        alert("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [productId]);


  useEffect(() => {
    const calculatePricing = () => {
      let result = null;
      let currentOperand = null;

      steps.forEach(step => {
        if (step.stepType === 'factor') {
          const value = step.value || 0;
          if (result === null) {
            result = value;
          } else if (currentOperand) {
            if (currentOperand === '+') result += value;
            else if (currentOperand === '-') result -= value;
            else if (currentOperand === '*') result *= value;
            else if (currentOperand === '/') result = value !== 0 ? result / value : result;
          }
        } else if (step.stepType === 'operand') {
          currentOperand = step.operand;
        }
      });

      return result !== null ? result.toFixed(2) : 'N/A';
    };
    setPrice(calculatePricing());
  }, [steps]);

  if (loading) {
    return (
      <Page>
        <Container>
          <Spinner />
        </Container>
      </Page>
    );
  }

  const handleModalSubmit = async (stepData) => {
    if (editingStep) {
      try {
        await updateDoc(doc(db, `products/${productId}/steps`, editingStep.id), stepData);
        const updatedSteps = steps.map(s => s.id === editingStep.id ? { ...s, ...stepData } : s);
        updatedSteps.sort((a, b) => a.order - b.order);
        setSteps(updatedSteps);
      } catch (error) {
        console.error("Error updating step:", error);
        alert("Failed to update step. Please try again.");
      }
    } else {
      try {
        const docRef = await addDoc(collection(db, `products/${productId}/steps`), { ...stepData, order: steps.length });
        const updatedSteps = [...steps, { ...stepData, id: docRef.id, order: steps.length }];
        updatedSteps.sort((a, b) => a.order - b.order);
        setSteps(updatedSteps);
      } catch (error) {
        console.error("Error adding step:", error);
        alert("Failed to add step. Please try again.");
      }
    }
    setModalOpen(false);
  };

  const handleDeleteStep = async (stepId) => {
    if (window.confirm("Are you sure you want to delete this step?")) {
      try {
        await deleteDoc(doc(db, `products/${productId}/steps`, stepId));
        const updatedSteps = steps.filter(step => step.id !== stepId);
        updatedSteps.sort((a, b) => a.order - b.order);
        setSteps(updatedSteps);
      } catch (error) {
        console.error("Error deleting step:", error);
        alert("Failed to delete step. Please try again.");
      }
    }
  };

  const openAddModal = () => {
    setEditingStep(null);
    setModalOpen(true);
  };

  const openEditModal = (step) => {
    setEditingStep(step);
    setModalOpen(true);
  };

  const getStatesDisplay = (selectedStates) => {
    if (selectedStates.length === allStates.length) {
      return 'All';
    } else if (selectedStates.length > 1) {
      return 'Multiple';
    } else if (selectedStates.length === 1) {
      return selectedStates[0];
    } else {
      return 'All';
    }
  };

  const getCoveragesDisplay = (selectedCoverages) => {
    if (selectedCoverages.length === coverages.length) {
      return 'All';
    } else if (selectedCoverages.length > 1) {
      return 'Multiple';
    } else if (selectedCoverages.length === 1) {
      return selectedCoverages[0];
    } else {
      return 'All';
    }
  };

  const coverageOptions = [
    { value: null, label: 'All Coverages' },
    ...coverages.map(c => ({ value: c.name, label: c.name }))
  ].sort((a, b) => a.label.localeCompare(b.label));

  const filteredSteps = steps
    .filter(step =>
      step.stepType === 'operand'
      || (!selectedCoverage || step.coverages.includes(selectedCoverage))
    )
    .filter(step =>
      step.stepType === 'operand'
      || (selectedStates.length === 0
          || selectedStates.every(s => step.states && step.states.includes(s)))
    );

  // Table row styling
  const FactorRow = styled(TableRow)`
    background-color: #F0F5FF;
    &:hover {
      background: #E6EEFF;
    }
  `;
  const OperandRow = styled(TableRow)`
    background: rgb(255, 255, 255);
    border-top: 2px solid #E5E7EB;
    border-bottom: 2px solid #E5E7EB;
    &:hover {
      background: rgba(228, 188, 255, 0.49);
    }
  `;

  const moveStep = (id, idx, dir) => {
    const newSteps = [...steps];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= newSteps.length) return;
    [newSteps[idx], newSteps[target]] = [newSteps[target], newSteps[idx]];
    setSteps(newSteps);
    // Optionally update `order` in Firestore here
  };

  const renderCalculationPreview = () => {
    if (loading) {
      return (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Coverage</TableHeader>
              <TableHeader>Step Name</TableHeader>
              <TableHeader>Rounding</TableHeader>
              <TableHeader>States</TableHeader>
              <TableHeader>Upstream ID</TableHeader>
              <TableHeader>Value</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableRow>
          </TableHead>
          <tbody>
            {Array(3).fill().map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      );
    }
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Coverage</TableHeader>
            <TableHeader>Step Name</TableHeader>
            <TableHeader>Rounding</TableHeader>
            <TableHeader>States</TableHeader>
            <TableHeader>Upstream ID</TableHeader>
            <TableHeader>Value</TableHeader>
            <TableHeader>Actions</TableHeader>
          </TableRow>
        </TableHead>
        <tbody>
          {filteredSteps.map((step, index) => (
            step.stepType === 'factor' ? (
              <FactorRow key={step.id}>
                <TableCell>
                  {step.coverages.length > 1
                    ? (
                      <Button variant="ghost" onClick={() => openCovModal(step.coverages)}>
                        Coverages ({step.coverages.length})
                      </Button>
                    )
                    : (
                      <span>{step.coverages[0] || 'All'}</span>
                    )
                  }
                </TableCell>
                <TableCell>
                  {step.table ? (
                    <Button variant="ghost" onClick={() => navigate(`/table/${productId}/${step.id}`)}>
                      {step.stepName}
                    </Button>
                  ) : (
                    step.stepName
                  )}
                </TableCell>
                <TableCell>{step.rounding}</TableCell>
                <TableCell>{getStatesDisplay(step.states)}</TableCell>
                <TableCell>{step.upstreamId || '-'}</TableCell>
                <TableCell>{step.value || 0}</TableCell>
                <TableCell>
<ActionsContainer>
  <Button variant="ghost" onClick={() => openEditModal(step)}>
    <PencilIcon width={16} height={16}/>
  </Button>
  <Button variant="ghost" onClick={() => handleDeleteStep(step.id)} style={{ color: '#dc2626' }}>
    <TrashIcon width={16} height={16}/>
  </Button>
  <Button variant="ghost" onClick={() => moveStep(step.id, index, 'up')}>
    <ChevronUpIcon width={16} height={16}/>
  </Button>
  <Button variant="ghost" onClick={() => moveStep(step.id, index, 'down')}>
    <ChevronDownIcon width={16} height={16}/>
  </Button>
</ActionsContainer>
                </TableCell>
              </FactorRow>
            ) : (
              <OperandRow key={step.id}>
                <TableCell colSpan={6} style={{ textAlign: 'center', color: '#6B7280' }}>
                  {(() => {
                    switch (step.operand) {
                      case '+': return <PlusIcon width={32} height={32} />;
                      case '-': return <MinusIcon width={32} height={32} />;
                      case '*': return <XMarkIcon width={32} height={32} />;
                      case '/': return <span style={{ fontSize: 32, fontWeight: 700 }}>/</span>;
                      case '=': return <span style={{ fontSize: 32, fontWeight: 700 }}>=</span>;
                      default: return step.operand;
                    }
                  })()}
                </TableCell>
                <TableCell>
<ActionsContainer>
  <Button variant="ghost" onClick={() => openEditModal(step)}>
    <PencilIcon width={16} height={16}/>
  </Button>
  <Button variant="ghost" onClick={() => handleDeleteStep(step.id)} style={{ color: '#dc2626' }}>
    <TrashIcon width={16} height={16}/>
  </Button>
  <Button variant="ghost" onClick={() => moveStep(step.id, index, 'up')}>
    <ChevronUpIcon width={16} height={16}/>
  </Button>
  <Button variant="ghost" onClick={() => moveStep(step.id, index, 'down')}>
    <ChevronDownIcon width={16} height={16}/>
  </Button>
</ActionsContainer>
                </TableCell>
              </OperandRow>
            )
          ))}
        </tbody>
      </Table>
    );
  };

  return (
    <Page>
      <Container>
        <PageHeader>
          <Title>Pricing for {productName}</Title>
          <Button variant="ghost" onClick={() => navigate('/')}>Return Home</Button>
        </PageHeader>
        <FiltersContainer>
          <FormGroup>
            <label>Select Coverage</label>
            <FilterWrapper>
              <FunnelIcon width={16} height={16} style={{ color: '#6B7280' }} />
              <Select
                options={coverageOptions}
                value={coverageOptions.find(o => o.value === selectedCoverage)}
                onChange={o => setSelectedCoverage(o.value)}
                styles={{ control: base => ({ ...base, width: '100%' }), menu: base => ({ ...base, background: '#fff', borderRadius: '8px' }), option: (base, state) => ({ ...base, background: state.isFocused ? '#F9FAFB' : '#fff' }) }}
              />
            </FilterWrapper>
          </FormGroup>
          <FormGroup>
            <label>Select State</label>
            <FilterWrapper>
              <MapIcon width={16} height={16} style={{ color: '#6B7280' }} />
              <Select
                options={stateOptions}
                value={stateOptions.filter(o => selectedStates.includes(o.value))}
                onChange={opts => setSelectedStates(opts.map(o => o.value))}
                isMulti
                styles={{ control: base => ({ ...base, width: '100%' }), menu: base => ({ ...base, background: '#fff', borderRadius: '8px' }), option: (base, state) => ({ ...base, background: state.isFocused ? '#F9FAFB' : '#fff' }) }}
              />
            </FilterWrapper>
          </FormGroup>
        </FiltersContainer>
        <div style={{
          marginBottom: 24,
          padding: 16,
          background: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          fontSize: 16,
          color: '#1F2937'
        }}>
          {steps.length > 0 ? (
            <>
              {renderCalculationPreview()}
              <StepLabel>Price: ${price}</StepLabel>
            </>
          ) : (
            <p style={{ color: '#6B7280' }}>Start by adding a step to build your pricing model.</p>
          )}
        </div>
        <Button onClick={openAddModal} style={{ marginBottom: 24 }} aria-label="Add new step">Add Step</Button>
        {modalOpen && (
          <StepModal
            onClose={() => setModalOpen(false)}
            onSubmit={handleModalSubmit}
            editingStep={editingStep}
            steps={steps}
            coverages={coverages}
            dataCodes={dataCodes}
          />
        )}
        {covModalOpen && (
          <Overlay onClick={() => setCovModalOpen(false)}>
            <ModalBox onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Applied Coverages</ModalTitle>
                <CloseBtn onClick={() => setCovModalOpen(false)}>
                  <XMarkIcon width={16} height={16}/>
                </CloseBtn>
              </ModalHeader>
              <ul>
                {covModalList.sort().map((name,i) => (
                  <li key={i}>{name}</li>
                ))}
              </ul>
            </ModalBox>
          </Overlay>
        )}
      </Container>
    </Page>
  );
}

export default PricingScreen;