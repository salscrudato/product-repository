import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { TrashIcon, PencilIcon, XMarkIcon, InformationCircleIcon, PlusCircleIcon, PlusIcon, MinusIcon, MapIcon, ChevronUpIcon, ChevronDownIcon, ClockIcon } from '@heroicons/react/24/solid';
import { ArrowDownTrayIcon as DownloadIcon20, ArrowUpTrayIcon as UploadIcon20 } from '@heroicons/react/20/solid';
import { FunnelIcon } from '@heroicons/react/24/solid';
import VersionControlSidebar, { SIDEBAR_WIDTH } from './VersionControlSidebar';
import { Page, Container, PageHeader, Title } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';
import MainNavigation from '../components/ui/Navigation';
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
import styled, { keyframes } from 'styled-components';
import Select from 'react-select';

/* Override the default Overlay with higher z-index & blur */
const OverlayFixed = styled(Overlay)`
  position: fixed !important;
  inset: 0;
  background: rgba(17,24,39,0.55);
  backdrop-filter: blur(2px);
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
`;


const ActionsContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;   /* center whole icon group */
  align-items: center;
  gap: 12px;

  /* ensure each ghost‑button icon is itself centered */
  button {
    width: 28px;
    height: 28px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

// Ensure every header & body cell in the pricing table is centered
const PricingTable = styled(Table)`
  th, td {
    text-align: center !important;
  }
`;

// Ensures any button/link used inside table cells fills the cell width and centers its text
const CellButton = styled(Button)`
  width: 100%;
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

// ----- ExportBtn styled button (copied from CoverageScreen) -----
const ExportBtn = styled(Button)`
  margin: 0;
  padding: 8px 18px;
  font-size: 14px;
  background: linear-gradient(135deg,#7C5CFF 0%,#AA5CFF 48%,#C15CFF 100%);
  color:#fff;
  box-shadow:0 3px 8px rgba(124,92,255,.3);
  &:hover{transform:translateY(-1px);box-shadow:0 6px 14px rgba(124,92,255,.45);}
  &:active{transform:none;box-shadow:0 3px 8px rgba(124,92,255,.3);}
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

/* ---------- Modern Styled Components ---------- */

// Container - Modern gradient background
const ModernContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 200px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
    opacity: 0.1;
    z-index: 0;
  }
`;

// Main Content - Modern layout
const MainContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
  position: relative;
  z-index: 1;
`;

// Header Section
const HeaderSection = styled.div`
  text-align: center;
  margin-bottom: 48px;
`;

// Page Title - Modern typography
const PageTitle = styled.h1`
  font-size: 48px;
  font-weight: 800;
  background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 16px 0;
  letter-spacing: -0.025em;
`;

// Breadcrumb
const Breadcrumb = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 32px;
  font-size: 14px;
  color: #64748b;

  a {
    color: #6366f1;
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: #4f46e5;
    }
  }

  span {
    color: #94a3b8;
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

const FiltersBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: flex-end;
  margin-bottom: 24px;
`;

const PriceBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 20px;
  font-weight: 700;
  color: #1F2937;
  margin-top: 24px;
`;

const OperandGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 32px;
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

const HistoryButton = styled.button`
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  background: #374151;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  cursor: pointer;
  z-index: 1100;
  &:hover { background: #1f2937; }
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
  const [comment, setComment] = useState('');

  useEffect(() => {
    setStepData(editingStep ? { ...editingStep } : { ...defaultStep });
    setErrors({});
    setComment('');
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
    if (editingStep && (!comment.trim() || comment.trim().length < 10)) {
      newErrors.comment = 'Reason must be at least 10 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(stepData, comment);
    }
  };

  const allStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

  return (
    <OverlayFixed onClick={onClose}>
      <ModalBox onClick={e => e.stopPropagation()}>
        <CloseBtn onClick={onClose} aria-label="Close modal"><XMarkIcon width={24} height={24} /></CloseBtn>
        <ModalHeader>
          <ModalTitle>{editingStep ? 'Edit Step' : 'Add Step'}</ModalTitle>
        </ModalHeader>
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
        ) : null}
        {editingStep && (
          <textarea
            rows="3"
            placeholder="Reason for changes (required)"
            value={comment}
            onChange={e => setComment(e.target.value)}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              fontSize: 14,
              marginBottom: 12
            }}
          />
        )}
        {editingStep && errors.comment && <div style={{ color: '#EF4444', marginBottom: 8 }}>{errors.comment}</div>}
        <Button onClick={handleSubmit} aria-label={editingStep ? 'Update step' : 'Add step'} style={{ marginTop: 16 }}>
          {editingStep ? 'Update Step' : 'Add Step'}
        </Button>
      </ModalBox>
    </OverlayFixed>
  );
}

// Main PricingScreen Component
function PricingScreen() {
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { productId } = useParams();
  const navigate = useNavigate();
  const [productName, setProductName] = useState('');
  const [coverages, setCoverages] = useState([]);
  const [steps, setSteps] = useState([]);
  // validCoverageCodes: coverageCode array for mapping/validation
  const validCoverageCodes = coverages.map(c => c.coverageCode);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [comment, setComment] = useState('');
  const [price, setPrice] = useState('N/A');
  const [selectedCoverage, setSelectedCoverage] = useState(null);
  const [selectedStates, setSelectedStates] = useState([]);
  const [dataCodes, setDataCodes] = useState([]);
  // Step Details Modal state
  const [stepDetailsOpen, setStepDetailsOpen] = useState(false);
  const [detailsStep, setDetailsStep] = useState(null);

  const fileInputRef = useRef(null);

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

  // —— New: add operand row via buttons ——
  const addOperand = async (operandChar) => {
    try {
      const docRef = await addDoc(collection(db, `products/${productId}/steps`), {
        stepType: 'operand',
        operand: operandChar,
        order: steps.length
      });
      // Log creation
      await addDoc(
        collection(db, 'products', productId, 'versionHistory'),
        {
          userEmail: auth.currentUser?.email || 'unknown',
          ts: serverTimestamp(),
          entityType: 'Step',
          entityId: docRef.id,
          entityName: `(operand ${operandChar})`,
          action: 'create'
        }
      );
      setSteps(prev => [...prev, { id: docRef.id, stepType:'operand', operand:operandChar, order:steps.length }]
        .sort((a,b)=>a.order-b.order));
    } catch (err) {
      console.error('Error adding operand:', err);
      alert('Failed to add operand.');
    }
  };


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

  const filteredSteps = useMemo(() => {
    return steps
      .filter(step =>
        step.stepType === 'operand'
        || (!selectedCoverage || step.coverages.includes(selectedCoverage))
      )
      .filter(step =>
        step.stepType === 'operand'
        || (selectedStates.length === 0
            || selectedStates.every(s => step.states && step.states.includes(s)))
      );
  }, [steps, selectedCoverage, selectedStates]);

  if (loading) {
    return (
      <ModernContainer>
        <MainNavigation />
        <MainContent>
          <Spinner />
        </MainContent>
      </ModernContainer>
    );
  }

  const handleModalSubmit = async (stepData, comment) => {
    if (editingStep) {
      try {
        await updateDoc(doc(db, `products/${productId}/steps`, editingStep.id), stepData);
        // Log update
        const oldSnap = await getDoc(doc(db, `products/${productId}/steps`, editingStep.id));
        const oldData = oldSnap.exists() ? oldSnap.data() : {};
        const diff = {};
        Object.keys(stepData).forEach(key => {
          const before = oldData[key] ?? '';
          const after = stepData[key];
          if (JSON.stringify(before) !== JSON.stringify(after)) {
            diff[key] = { before, after };
          }
        });
        await addDoc(
          collection(db, 'products', productId, 'versionHistory'),
          {
            userEmail: auth.currentUser?.email || 'unknown',
            ts: serverTimestamp(),
            entityType: 'Step',
            entityId: editingStep.id,
            entityName: stepData.stepName || '(operand)',
            action: 'update',
            changes: diff,
            comment: comment.trim()
          }
        );
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
        // Log creation
        await addDoc(
          collection(db, 'products', productId, 'versionHistory'),
          {
            userEmail: auth.currentUser?.email || 'unknown',
            ts: serverTimestamp(),
            entityType: 'Step',
            entityId: docRef.id,
            entityName: stepData.stepName || '(operand)',
            action: 'create'
          }
        );
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
        // Log deletion
        await addDoc(
          collection(db, 'products', productId, 'versionHistory'),
          {
            userEmail: auth.currentUser?.email || 'unknown',
            ts: serverTimestamp(),
            entityType: 'Step',
            entityId: stepId,
            entityName: '(operand)',
            action: 'delete'
          }
        );
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
    setComment('');
    setEditingStep(null);
    setModalOpen(true);
  };

  const openEditModal = (step) => {
    setComment('');
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


  // ---------- XLSX helpers (Pricing) ----------
  const OPERANDS = ['+','-','*','/','='];
  const ALL_STATES = [...usStates];   // reuse list already declared

  // Enhanced pricing sheet with professional styling
  const makePricingSheet = (steps) => {
    // Add metadata header
    const currentDate = new Date().toLocaleDateString();
    const metadata = [
      ['Pricing Model Export Report'],
      [`Generated on: ${currentDate}`],
      [`Product: ${productName}`],
      [`Total Steps: ${steps.filter(s => s.stepType === 'factor').length}`],
      [''], // Empty row for spacing
      ['Coverage', 'Step Name', 'Table Name', 'Calculation', 'Rounding', 'Value', ...ALL_STATES]
    ];

    // flatten factor+operand so each factor row carries the FOLLOWING operand (Excel pattern)
    const rows = [];
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (s.stepType !== 'factor') continue;
      const next = steps[i + 1];
      const row = {
        Coverage: (s.coverages || []).join('; '),
        'Step Name': s.stepName || '',
        'Table Name': s.table || '',
        Calculation: (next && next.stepType === 'operand') ? next.operand : '',
        Rounding: s.rounding || 'None',
        Value: s.value ?? 0,
      };
      // mark states with Yes/No instead of X/blank
      ALL_STATES.forEach(st => {
        row[st] = (s.states || ALL_STATES).includes(st) ? 'Yes' : 'No';
      });
      rows.push(row);
    }

    const XLSX = require('xlsx');

    // Create worksheet with metadata
    const ws = XLSX.utils.aoa_to_sheet(metadata);

    // Add data rows if we have any
    if (rows.length > 0) {
      XLSX.utils.sheet_add_json(ws, rows, {
        origin: 'A7',
        skipHeader: false
      });
    }

    // Apply basic styling (note: full styling requires xlsx-style or similar)
    const range = XLSX.utils.decode_range(ws['!ref']);

    // Set column widths
    const colWidths = [
      { wch: 20 }, // Coverage
      { wch: 25 }, // Step Name
      { wch: 15 }, // Table Name
      { wch: 12 }, // Calculation
      { wch: 12 }, // Rounding
      { wch: 10 }, // Value
      ...ALL_STATES.map(() => ({ wch: 4 })) // State columns
    ];
    ws['!cols'] = colWidths;

    return ws;
  };

  // Convert sheet rows -> step objects array
  const sheetToStepObjects = (ws) =>{
    const XLSX = require('xlsx');
    const rows = XLSX.utils.sheet_to_json(ws,{defval:''});
    const out = [];
    rows.forEach((r,idx)=>{
      // factor first
      const factor = {
        stepType:'factor',
        coverages: String(r['Coverage']).split(';').map(v=>v.trim()).filter(Boolean),
        stepName: r['Step Name'],
        table: r['Table Name'] || '',
        rounding: r['ROUNDING'] || 'none',
        value: parseFloat(String(r['Value']).replace(/[^0-9\.\-]/g,''))||0,
        states: ALL_STATES.filter(st=> String(r[st]).trim().toUpperCase()==='X')
      };
      out.push(factor);
      // operand after
      const op = String(r['CALCULATION']).trim();
      if (OPERANDS.includes(op)){
        out.push({ stepType:'operand', operand:op });
      }
    });
    return out;
  };


  const handleExportXLSX = async () =>{
    try{
      const XLSXmod = await import('xlsx');
      const XLSX = XLSXmod.default || XLSXmod;
      const fsMod = await import('file-saver');
      const saveAs = fsMod.saveAs || fsMod.default;
      const ws = makePricingSheet(steps);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb,ws,'Pricing');
      const buf = XLSX.write(wb,{bookType:'xlsx',type:'array'});
      saveAs(new Blob([buf],{type:'application/octet-stream'}),`pricing_${productName}.xlsx`);
    }catch(err){ alert('Export failed: '+err.message); }
  };

  const handleImportXLSX = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSXmod = await import('xlsx');
      const XLSX = XLSXmod.default || XLSXmod;
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      // Parse sheet into step objects
      const parsed = sheetToStepObjects(ws);

      // Map coverage names -> codes
      parsed.forEach(s => {
        if (s.stepType === 'factor') {
          s.coverages = s.coverages.map(name => {
            const cov = coverages.find(c => c.name === name);
            return cov ? cov.coverageCode : name;
          });
        }
      });

      // Validate coverage codes
      const invalidCov = parsed
        .filter(s => s.stepType === 'factor')
        .flatMap(s => s.coverages)
        .filter(code => !validCoverageCodes.includes(code));
      if (invalidCov.length) {
        alert('Invalid coverage codes: ' + [...new Set(invalidCov)].join(', '));
        e.target.value = '';
        return;
      }

      // Validate states
      const invalidStates = parsed
        .filter(s => s.stepType === 'factor')
        .flatMap(s => s.states || [])
        .filter(st => !ALL_STATES.includes(st));
      if (invalidStates.length) {
        alert('Invalid states: ' + [...new Set(invalidStates)].join(', '));
        e.target.value = '';
        return;
      }

      // Differential import: only add factor+operand pairs not already present
      let nextOrder = steps.length;
      const created = [];
      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i];
        if (row.stepType !== 'factor') continue;
        const operandRow = parsed[i+1] && parsed[i+1].stepType === 'operand' ? parsed[i+1] : null;
        // Check if a factor step with same coverage and stepName exists
        const exists = steps.some(s =>
          s.stepType === 'factor'
          && s.coverages.join(';') === row.coverages.join(';')
          && s.stepName === row.stepName
        );
        if (exists) continue;
        // Add factor
        const factorRef = await addDoc(
          collection(db, `products/${productId}/steps`),
          { ...row, order: nextOrder }
        );
        created.push({ id: factorRef.id, ...row, order: nextOrder });
        nextOrder++;
        // Add operand if present
        if (operandRow) {
          const opRef = await addDoc(
            collection(db, `products/${productId}/steps`),
            { stepType: 'operand', operand: operandRow.operand, order: nextOrder }
          );
          created.push({ id: opRef.id, stepType: 'operand', operand: operandRow.operand, order: nextOrder });
          nextOrder++;
        }
      }

      // Update local state
      setSteps(prev => [...prev, ...created].sort((a, b) => a.order - b.order));
      alert('Import complete!');
    } catch (err) {
      console.error(err);
      alert('Import failed: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };


// Table row styling
const FactorRow = styled(TableRow)`
  background-color: #F0F5FF;
  td {
    padding: 8px 12px;
  }
  &:hover {
    background: #E6EEFF;
  }
`;
const OperandRow = styled(TableRow)`
  background: #fff;
  border-top: 2px solid #E5E7EB;
  border-bottom: 2px solid #E5E7EB;
  td {
    padding: 0px 2px;
  }
  &:hover {
    background: rgba(228, 188, 255, 0.49);
  }
`;

// Center the operand perfectly in its column
const OperandStepCell = styled(TableCell)`
  padding: 0;
  vertical-align: middle;
  text-align: center;
`;

// Helper to render operand icon/glyph
function operandGlyph(op) {
  switch (op) {
    case '+':
      return <PlusIcon width={16} height={16} />;
    case '-':
      return <MinusIcon width={16} height={16} />;
    case '*':
      return <XMarkIcon width={16} height={16} />;
    case '/':
      return <span style={{ fontSize: 16, fontWeight: 700 }}>/</span>;
    case '=':
      return <span style={{ fontSize: 16, fontWeight: 700 }}>=</span>;
    default:
      return op;
  }
}

  const moveStep = async (id, idx, dir) => {
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= steps.length) return;
    // Swap in local array
    const newSteps = [...steps];
    [newSteps[idx], newSteps[target]] = [newSteps[target], newSteps[idx]];
    // Persist new orders
    const stepA = newSteps[idx];
    const stepB = newSteps[target];
    await updateDoc(doc(db, `products/${productId}/steps`, stepA.id), { order: idx });
    await updateDoc(doc(db, `products/${productId}/steps`, stepB.id), { order: target });
    // Update UI
    setSteps(newSteps);
  };

  const openStepDetails = step => { setDetailsStep(step); setStepDetailsOpen(true); };

  const renderCalculationPreview = () => {
    if (loading) {
      return (
        <PricingTable>
          <TableHead>
            <TableRow>
              <TableHeader>Coverage</TableHeader>
              <TableHeader>Step Name</TableHeader>
              <TableHeader>States</TableHeader>
              <TableHeader>Value</TableHeader>
              <TableHeader style={{ width: 110 }}>Actions</TableHeader>
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
              </TableRow>
            ))}
          </tbody>
        </PricingTable>
      );
    }
    return (
      <PricingTable>
        <TableHead>
          <TableRow>
            <TableHeader>Coverage</TableHeader>
            <TableHeader>Step Name</TableHeader>
            <TableHeader>States</TableHeader>
            <TableHeader>Value</TableHeader>
            <TableHeader style={{ width: 110 }}>Actions</TableHeader>
          </TableRow>
        </TableHead>
        <tbody>
          {filteredSteps.map((step, index) => (
            step.stepType === 'factor' ? (
              <FactorRow key={step.id}>
                <TableCell>
          {step.coverages.length > 1
            ? (
              <CellButton variant="ghost" onClick={() => openCovModal(step.coverages)}>
                Coverages ({step.coverages.length})
              </CellButton>
            )
            : (
              <CellButton variant="ghost" as="span">{step.coverages[0] || 'All'}</CellButton>
            )
          }
                </TableCell>
                <TableCell>
                  {step.table ? (
                    <CellButton
                      variant="ghost"
                      onClick={() => navigate(`/table/${productId}/${step.id}`)}
                    >
                      {step.stepName}
                    </CellButton>
                  ) : (
                    <span>{step.stepName}</span>
                  )}
                </TableCell>
                <TableCell>
                  <CellButton
                    variant="ghost"
                    title="Edit states for this step"
                    onClick={() => openEditModal(step)}
                  >
                    {getStatesDisplay(step.states || [])}&nbsp;(
                    {(step.states && step.states.length) ? step.states.length : allStates.length}
                    )
                  </CellButton>
                </TableCell>
                <TableCell>{step.value || 0}</TableCell>
                <TableCell>
                  <ActionsContainer>
                    <Button variant="ghost" onClick={() => openStepDetails(step)}>
                      <InformationCircleIcon width={20} height={20} />
                    </Button>
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
                {/* Empty coverage cell */}
                <TableCell />

                {/* Centred operand glyph inside the Step‑Name column */}
                <OperandStepCell>
                  {operandGlyph(step.operand)}
                </OperandStepCell>
                {/* Empty states cell for alignment */}
                <TableCell />
                {/* Empty Value column to preserve alignment */}
                <TableCell />
                {/* Actions cell centered */}
                <TableCell>
                  <ActionsContainer>
                    <Button variant="ghost" onClick={() => openEditModal(step)}>
                      <PencilIcon width={16} height={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDeleteStep(step.id)}
                      style={{ color: '#dc2626' }}
                    >
                      <TrashIcon width={16} height={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => moveStep(step.id, index, 'up')}
                    >
                      <ChevronUpIcon width={16} height={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => moveStep(step.id, index, 'down')}
                    >
                      <ChevronDownIcon width={16} height={16} />
                    </Button>
                  </ActionsContainer>
                </TableCell>
              </OperandRow>
            )
          ))}
        </tbody>
      </PricingTable>
    );
  };

  return (
    <ModernContainer>
      <MainNavigation />
      <MainContent>
        <Breadcrumb>
          <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Home</a>
          <span>›</span>
          <a href="/products" onClick={(e) => { e.preventDefault(); navigate('/products'); }}>Products</a>
          <span>›</span>
          <span>Pricing</span>
        </Breadcrumb>

        <HeaderSection>
          <PageTitle>Pricing for {productName}</PageTitle>
          <Button variant="ghost" onClick={() => navigate('/')}>Return Home</Button>
        </HeaderSection>
        <Card>
          <FiltersBar>
            <FormGroup>
              <label>Select Coverage</label>
              <FilterWrapper>
                <FunnelIcon width={16} height={16} style={{ color: '#6B7280' }} />
                <Select
                  options={coverageOptions}
                  value={coverageOptions.find(o => o.value === selectedCoverage)}
                  onChange={o => setSelectedCoverage(o.value)}
                  styles={{
                    control: base => ({ ...base, width: '100%' }),
                    menu: base => ({ ...base, background: '#fff', borderRadius: 8 }),
                    option: (base, state) => ({ ...base, background: state.isFocused ? '#F9FAFB' : '#fff' })
                  }}
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
                  styles={{
                    control: base => ({ ...base, width: '100%' }),
                    menu: base => ({ ...base, background: '#fff', borderRadius: 8 }),
                    option: (base, state) => ({ ...base, background: state.isFocused ? '#F9FAFB' : '#fff' })
                  }}
                />
              </FilterWrapper>
            </FormGroup>
          </FiltersBar>

          {/* XLSX Export/Import Controls */}
          <div style={{display:'flex',gap:12,margin:'8px 0 20px',alignItems:'center'}}>
            <ExportBtn onClick={handleExportXLSX}>
              <DownloadIcon20 width={16} style={{marginRight:4}}/>Export&nbsp;XLSX
            </ExportBtn>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx"
              style={{display:'none'}}
              onChange={handleImportXLSX}
            />
            <Button variant="ghost" onClick={()=>fileInputRef.current?.click()}>
              <UploadIcon20 width={16} style={{marginRight:4}}/>Import&nbsp;XLSX
            </Button>
          </div>

          {steps.length ? (
            <>
              {renderCalculationPreview()}
              <PriceBar>
                <span>Price:</span>
                <span>${price}</span>
              </PriceBar>
            </>
          ) : (
            <p style={{ color: '#6B7280' }}>Start by adding a step to build your pricing model.</p>
          )}
        </Card>
        <Button onClick={openAddModal} style={{ marginBottom: 24 }} aria-label="Add new step">Add Step</Button>
        <OperandGroup>
          {['+', '-', '*', '/', '='].map(op => (
            <Button key={op} onClick={() => addOperand(op)}>
              {op}
            </Button>
          ))}
        </OperandGroup>
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
          <OverlayFixed onClick={() => setCovModalOpen(false)}>
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
          </OverlayFixed>
        )}
        <HistoryButton
          style={{ right: historyOpen ? SIDEBAR_WIDTH + 24 : 16 }}
          onClick={() => {
            setHistoryOpen(prev => {
              const next = !prev;
              document.documentElement.style.setProperty(
                '--vc-offset',
                next ? `${SIDEBAR_WIDTH}px` : '0px'
              );
              return next;
            });
          }}
          aria-label="View version history"
        >
          <ClockIcon width={24} height={24}/>
        </HistoryButton>
        <VersionControlSidebar
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          productId={productId}
        />
        {/* Step Details Modal */}
        {stepDetailsOpen && (
          <OverlayFixed onClick={() => setStepDetailsOpen(false)}>
            <ModalBox onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Step Details</ModalTitle>
                <CloseBtn onClick={() => setStepDetailsOpen(false)}>✕</CloseBtn>
              </ModalHeader>
              {detailsStep && (
                <>
                  <p><strong>Step&nbsp;Name:</strong> {detailsStep.stepName || '-'}</p>
                  <p><strong>Rounding:</strong> {detailsStep.rounding || '-'}</p>
                  <p><strong>States:</strong> {getStatesDisplay(detailsStep.states || [])}</p>
                  <p><strong>Upstream&nbsp;ID:</strong> {detailsStep.upstreamId || '-'}</p>
                </>
              )}
            </ModalBox>
          </OverlayFixed>
        )}
      </MainContent>
    </ModernContainer>
  );
}

export default PricingScreen;