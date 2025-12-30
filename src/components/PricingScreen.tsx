import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  InformationCircleIcon,
  PlusIcon,
  MinusIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CurrencyDollarIcon,
  CalculatorIcon,
  PlusCircleIcon,
  ShieldCheckIcon,
  MapIcon,
} from '@heroicons/react/24/solid';
import { ArrowDownTrayIcon as DownloadIcon20, ArrowUpTrayIcon as UploadIcon20 } from '@heroicons/react/20/solid';

import { Button } from '../components/ui/Button';
import MainNavigation from '../components/ui/Navigation';
import { PageContainer, PageContent } from '../components/ui/PageContainer';
import EnhancedHeader from '../components/ui/EnhancedHeader';

import {
  Table,
  THead as TableHead,
  Tr as TableRow,
  Th as TableHeader,
  Td as TableCell,
  Modal as ModalBox,
  ModalHeader,
  ModalTitle,
  CloseBtn
} from '../components/ui/Table';
import styled, { keyframes } from 'styled-components';
import { TextInput } from '../components/ui/Input';
import RatingAlgorithmBuilder from './pricing/RatingAlgorithmBuilder';
import EnhancedRatingBuilder from './pricing/EnhancedRatingBuilder';
import type { StepTemplate } from '../types/pricing';

/* ========== MODERN STYLED COMPONENTS ========== */

// Enhanced animations - Premium micro-interactions
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

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  50% { box-shadow: 0 0 20px 4px rgba(99, 102, 241, 0.2); }
`;

const countUp = keyframes`
  from { opacity: 0; transform: scale(0.8) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
`;

// Ensures any button/link used inside table cells fills the cell width and centers its text
const CellButton = styled(Button)`
  width: 100%;
  justify-content: center;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;

  label {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    font-weight: 600;
    font-size: 14px;
    color: #374151;
    letter-spacing: -0.01em;

    svg {
      width: 16px;
      height: 16px;
      color: #6366f1;
      opacity: 0.8;
    }
  }

  .error-text {
    color: #ef4444;
    font-size: 12px;
    font-weight: 500;
    margin-left: 4px;
  }

  .helper-text {
    font-size: 12px;
    color: #64748b;
    margin-top: 6px;
    line-height: 1.5;
  }
`;

const ModernSelect = styled.select`
  width: 100%;
  padding: 12px 16px;
  padding-right: 40px;
  border: 1.5px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  background: rgba(255, 255, 255, 0.95);
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.4);
    background-color: rgba(248, 250, 252, 0.8);
  }

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  option {
    padding: 12px;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);

  h4 {
    font-size: 15px;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  svg {
    width: 18px;
    height: 18px;
    color: #6366f1;
  }
`;

const CoverageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
  padding: 12px;
  border: 1.5px solid rgba(226, 232, 240, 0.8);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.8) 100%);

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.5);
    border-radius: 3px;
  }
`;

const StateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  gap: 6px;
  max-height: 180px;
  overflow-y: auto;
  padding: 12px;
  border: 1.5px solid rgba(226, 232, 240, 0.8);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.8) 100%);

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.5);
    border-radius: 3px;
  }
`;

const OptionLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #1F2937;
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid transparent;

  &:hover {
    background: rgba(99, 102, 241, 0.06);
    border-color: rgba(99, 102, 241, 0.15);
  }

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #6366f1;
    cursor: pointer;
  }
`;

const SelectAllContainer = styled.div`
  margin-bottom: 12px;
  padding: 12px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(139, 92, 246, 0.06) 100%);
  border-radius: 12px;
  border: 1px solid rgba(99, 102, 241, 0.1);
`;

// Enhanced Tooltip Component
const Tooltip = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: help;

  &:hover .tooltip-content {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .tooltip-content {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%) translateY(4px);
    padding: 10px 14px;
    background: #1e293b;
    color: white;
    font-size: 12px;
    font-weight: 500;
    border-radius: 8px;
    white-space: nowrap;
    max-width: 280px;
    white-space: normal;
    text-align: center;
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s ease;
    z-index: 100;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    line-height: 1.5;

    &::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: #1e293b;
    }
  }
`;

// State filter options
const usStates = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

// Main styled components
const MainContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
  position: relative;
  z-index: 1;
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(24px) saturate(180%);
  border-radius: 24px;
  padding: 32px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
  margin-bottom: 32px;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04);
    border-color: rgba(99, 102, 241, 0.15);
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

const PricingTable = styled(Table)`
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
`;

const ActionsContainer = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  min-height: 40px; /* Ensure consistent height across rows */
`;

const OverlayFixed = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px) saturate(150%);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${keyframes`
    from { opacity: 0; backdrop-filter: blur(0px); }
    to { opacity: 1; backdrop-filter: blur(8px); }
  `} 0.2s ease-out;
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

const OperandGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 32px;
`;

// Coverage Page style header components
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

// Editable value cell component
const EditableValueCell = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  input {
    width: 100px;
    padding: 10px 14px;
    border: 1.5px solid rgba(226, 232, 240, 0.8);
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.9) 100%);
    text-align: center;
    font-size: 15px;
    font-weight: 600;
    color: #1e293b;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    letter-spacing: -0.01em;

    &:hover {
      border-color: rgba(99, 102, 241, 0.4);
      background: white;
      transform: scale(1.02);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
    }

    &:focus {
      outline: none;
      border-color: #6366f1;
      background: white;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15), 0 4px 16px rgba(99, 102, 241, 0.15);
      transform: scale(1.05);
    }

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    &:hover::-webkit-inner-spin-button,
    &:hover::-webkit-outer-spin-button,
    &:focus::-webkit-inner-spin-button,
    &:focus::-webkit-outer-spin-button {
      opacity: 1;
    }
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translateX(-50%) scaleX(0);
    width: 60%;
    height: 2px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
    border-radius: 1px;
    transition: transform 0.2s ease;
  }

  &:focus-within::after {
    transform: translateX(-50%) scaleX(1);
  }
`;

// Coverage Modal Styled Components - Premium Design
const WideModal = styled(ModalBox)`
  width: 90%;
  max-width: 640px;
  max-height: 85vh;
  overflow-y: auto;
  border-radius: 24px;
  padding: 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(226, 232, 240, 0.5);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.08);
  animation: ${fadeInUp} 0.3s ease-out;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
    margin: 8px 0;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.4);
    border-radius: 4px;
    border: 2px solid transparent;
    background-clip: padding-box;

    &:hover {
      background: rgba(148, 163, 184, 0.6);
    }
  }
`;

const ModalHeaderEnhanced = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.95) 100%);
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(12px);
`;

const ModalContent = styled.div`
  padding: 24px 28px;
`;

const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 28px;
  background: rgba(248, 250, 252, 0.5);
  border-top: 1px solid rgba(226, 232, 240, 0.6);
  position: sticky;
  bottom: 0;
`;

const StepModalWide = styled(ModalBox)`
  width: 95%;
  max-width: 1000px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 24px;
  padding: 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(226, 232, 240, 0.5);
  box-shadow: 0 32px 100px rgba(0, 0, 0, 0.18), 0 12px 32px rgba(0, 0, 0, 0.1);
  animation: ${fadeInUp} 0.35s ease-out;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
    margin: 8px 0;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.4);
    border-radius: 4px;

    &:hover {
      background: rgba(148, 163, 184, 0.6);
    }
  }
`;

const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ModalColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FullWidthSection = styled.div`
  grid-column: 1 / -1;
`;

const CoverageSearchInput = styled(TextInput)`
  margin-bottom: 16px;
  border: 1.5px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 14px;
  background: rgba(248, 250, 252, 0.8);
  transition: all 0.2s ease;

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    background: white;
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const CoverageLinkActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.04) 0%, rgba(139, 92, 246, 0.04) 100%);
  border-radius: 12px;
  border: 1px solid rgba(99, 102, 241, 0.08);
`;

const CoverageLinkContainer = styled.div`
  max-height: 380px;
  overflow-y: auto;
  border: 1.5px solid rgba(226, 232, 240, 0.8);
  border-radius: 16px;
  padding: 12px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.8) 100%);

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.5);
    border-radius: 3px;
  }
`;

const CoverageLinkItem = styled.label`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.85);
  border: 1.5px solid rgba(226, 232, 240, 0.6);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover {
    background: rgba(99, 102, 241, 0.06);
    border-color: rgba(99, 102, 241, 0.25);
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.08);

    &::before {
      opacity: 0.5;
    }
  }

  &:last-child {
    margin-bottom: 0;
  }

  &:has(input:checked) {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
    border-color: rgba(99, 102, 241, 0.3);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);

    &::before {
      opacity: 1;
    }
  }
`;

const CoverageCheckbox = styled.input`
  width: 22px;
  height: 22px;
  accent-color: #6366f1;
  cursor: pointer;
  border-radius: 6px;
  transition: transform 0.2s ease;

  &:checked {
    transform: scale(1.05);
  }

  &:focus-visible {
    outline: 2px solid rgba(99, 102, 241, 0.5);
    outline-offset: 2px;
  }
`;

const CoverageLabel = styled.span`
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  letter-spacing: -0.01em;
`;

const SelectedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  margin-left: auto;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 16px;
`;

// Note: Stats dashboard is now in EnhancedRatingBuilder component

// StepModal Component
function StepModal({ onClose, onSubmit, editingStep, coverages, dataCodes }) {
  const defaultStep = useMemo(() => ({
    stepType: 'factor',
    coverages: [],
    stepName: '',
    type: 'User Input',
    table: '',
    rounding: 'none',
    states: [],
    upstreamId: '',
    operand: '',
    value: 1
  }), []);

  const [stepData, setStepData] = useState(editingStep ? { ...editingStep } : { ...defaultStep });
  const [errors, setErrors] = useState({});
  const [comment, setComment] = useState('');

  useEffect(() => {
    setStepData(editingStep ? { ...editingStep } : { ...defaultStep });
    setErrors({});
    setComment('');
  }, [editingStep, defaultStep]);

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
      onSubmit(stepData, comment);
    }
  };

  const allStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

  return (
    <OverlayFixed onClick={onClose}>
      <ModalBox onClick={e => e.stopPropagation()}>
        <CloseBtn onClick={onClose} aria-label="Close modal"><XMarkIcon width={24} height={24} /></CloseBtn>
        <ModalHeader>
          <ModalTitle>{editingStep ? 'Edit Rating Step' : 'Add Rating Step'}</ModalTitle>
        </ModalHeader>
        {stepData.stepType === 'factor' ? (
          <>
            <FormGroup>
              <label>
                Step Name
                <Tooltip>
                  <InformationCircleIcon style={{ width: 16, height: 16 }} />
                  <span className="tooltip-content">
                    A descriptive name for this rating factor (e.g., "Base Rate", "Territory Factor")
                  </span>
                </Tooltip>
                {errors.stepName && <span className="error-text">{errors.stepName}</span>}
              </label>
              <TextInput
                name="stepName"
                value={stepData.stepName}
                onChange={handleChange}
                placeholder="e.g., Base Rate, Territory Factor"
                className={errors.stepName ? 'error' : ''}
              />
            </FormGroup>

            <FormGroup>
              <label>
                Value Source
                <Tooltip>
                  <InformationCircleIcon style={{ width: 16, height: 16 }} />
                  <span className="tooltip-content">
                    How the factor value is determined: User Input, Table Lookup, or Custom calculation.
                  </span>
                </Tooltip>
              </label>
              <ModernSelect name="type" value={stepData.type} onChange={handleChange}>
                <option value="User Input">User Input - Direct entry</option>
                <option value="Table">Table Lookup - From rating table</option>
                <option value="Other">Other - Custom calculation</option>
              </ModernSelect>
            </FormGroup>

            {stepData.type === 'Table' && (
              <FormGroup>
                <label>Table Name</label>
                <TextInput name="table" value={stepData.table} onChange={handleChange} placeholder="Enter rating table name" />
              </FormGroup>
            )}

            <FormGroup>
              <label>
                Rounding Mode
                <Tooltip>
                  <InformationCircleIcon style={{ width: 16, height: 16 }} />
                  <span className="tooltip-content">
                    How to round the result after this step.
                  </span>
                </Tooltip>
              </label>
              <ModernSelect name="rounding" value={stepData.rounding} onChange={handleChange}>
                <option value="none">None - No rounding</option>
                <option value="Whole Number">Whole Number - Round to integer</option>
                <option value="1 Decimal">1 Decimal - Round to 0.0</option>
                <option value="2 Decimals">2 Decimals - Round to 0.00</option>
                <option value="Other">Other - Custom rounding</option>
              </ModernSelect>
            </FormGroup>

            <FormGroup>
              <label>
                Upstream Data Code
                <Tooltip>
                  <InformationCircleIcon style={{ width: 16, height: 16 }} />
                  <span className="tooltip-content">
                    Link this step to an IT data code for integration with upstream systems.
                  </span>
                </Tooltip>
              </label>
              <ModernSelect
                name="upstreamId"
                value={stepData.upstreamId}
                onChange={handleChange}
              >
                <option value="">Select IT Code (Optional)</option>
                {dataCodes.map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </ModernSelect>
            </FormGroup>

            <FormGroup>
              <label>
                Coverages
                <Tooltip>
                  <InformationCircleIcon style={{ width: 16, height: 16 }} />
                  <span className="tooltip-content">
                    Select which coverages this rating factor applies to.
                  </span>
                </Tooltip>
                {errors.coverages && <span className="error-text">{errors.coverages}</span>}
              </label>
              <SelectAllContainer>
                <OptionLabel>
                  <input
                    type="checkbox"
                    checked={stepData.coverages.length === coverages.length}
                    onChange={e => handleSelectAllCoverages(e.target.checked)}
                  />
                  Select All Coverages
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
              <div className="helper-text">Selected: {stepData.coverages.length} of {coverages.length} coverages</div>
            </FormGroup>

            <FormGroup>
              <label>
                States
                <Tooltip>
                  <InformationCircleIcon style={{ width: 16, height: 16 }} />
                  <span className="tooltip-content">
                    Select states where this factor applies.
                  </span>
                </Tooltip>
              </label>
              <SelectAllContainer>
                <OptionLabel>
                  <input
                    type="checkbox"
                    checked={stepData.states.length === allStates.length}
                    onChange={e => handleSelectAllStates(e.target.checked)}
                  />
                  Select All States
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
              <div className="helper-text">Selected: {stepData.states.length} of {allStates.length} states</div>
            </FormGroup>

            <Button onClick={handleSubmit} aria-label={editingStep ? 'Update step' : 'Add step'} style={{ marginTop: 16 }}>
              {editingStep ? 'Update Step' : 'Add Step'}
            </Button>
          </>
        ) : stepData.stepType === 'operand' ? (
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
              <label>Operand</label>
              <select
                name="operand"
                value={stepData.operand}
                onChange={handleChange}
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #D1D5DB' }}
              >
                <option value="+">+ (Addition)</option>
                <option value="-">- (Subtraction)</option>
                <option value="*">* (Multiplication)</option>
                <option value="/">/ (Division)</option>
                <option value="=">=  (Equals)</option>
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
            <Button onClick={handleSubmit} aria-label={editingStep ? 'Update step' : 'Add step'} style={{ marginTop: 16, width: '100%' }}>
              {editingStep ? 'Update Step' : 'Add Step'}
            </Button>
          </>
        ) : null}
      </ModalBox>
    </OverlayFixed>
  );
}

// Main PricingScreen Component
function PricingScreen() {
  const [loading, setLoading] = useState(true);
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

  // Handle URL query parameters for coverage filtering
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const coverageParam = urlParams.get('coverage');
    if (coverageParam) {
      setSelectedCoverage(coverageParam);
    }
  }, []);

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

  const [selectedCoveragesForStep, setSelectedCoveragesForStep] = useState([]);
  const [currentEditingStep, setCurrentEditingStep] = useState(null);
  const [coverageSearchQuery, setCoverageSearchQuery] = useState('');

  // States modal state
  const [statesModalOpen, setStatesModalOpen] = useState(false);
  const [selectedStatesForStep, setSelectedStatesForStep] = useState([]);
  const [currentEditingStepForStates, setCurrentEditingStepForStates] = useState(null);
  const [stateSearchQuery, setStateSearchQuery] = useState('');

  const openCovModal = (step) => {
    setCurrentEditingStep(step);
    setSelectedCoveragesForStep(step.coverages || []);
    setCoverageSearchQuery('');
    setCovModalOpen(true);
  };

  const openStatesModal = (step) => {
    setCurrentEditingStepForStates(step);
    setSelectedStatesForStep(step.states || []);
    setStateSearchQuery('');
    setStatesModalOpen(true);
  };

  const allStates = useMemo(() => ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'], []);

  // Filter coverages based on search query
  const filteredCoverages = useMemo(() => {
    if (!coverageSearchQuery.trim()) return coverages;
    const query = coverageSearchQuery.toLowerCase();
    return coverages.filter(coverage =>
      coverage.name.toLowerCase().includes(query) ||
      coverage.coverageCode.toLowerCase().includes(query)
    );
  }, [coverages, coverageSearchQuery]);

  // Filter states based on search query
  const filteredStates = useMemo(() => {
    if (!stateSearchQuery.trim()) return allStates;
    const query = stateSearchQuery.toLowerCase();
    return allStates.filter(state =>
      state.toLowerCase().includes(query)
    );
  }, [allStates, stateSearchQuery]);

  // Save coverage changes
  const saveSelectedCoverages = async () => {
    if (!currentEditingStep) return;

    try {
      await updateDoc(
        doc(db, `products/${productId}/steps`, currentEditingStep.id),
        { coverages: selectedCoveragesForStep }
      );

      // Update local state
      setSteps(prevSteps =>
        prevSteps.map(step =>
          step.id === currentEditingStep.id
            ? { ...step, coverages: selectedCoveragesForStep }
            : step
        )
      );

      setCovModalOpen(false);
    } catch (err) {
      console.error('Failed to save coverage changes:', err);
      alert('Failed to save coverage changes: ' + err.message);
    }
  };

  // Save states changes
  const saveSelectedStates = async () => {
    if (!currentEditingStepForStates) return;

    try {
      await updateDoc(
        doc(db, `products/${productId}/steps`, currentEditingStepForStates.id),
        { states: selectedStatesForStep }
      );

      // Update local state
      setSteps(prevSteps =>
        prevSteps.map(step =>
          step.id === currentEditingStepForStates.id
            ? { ...step, states: selectedStatesForStep }
            : step
        )
      );

      setStatesModalOpen(false);
    } catch (err) {
      console.error('Failed to save states changes:', err);
      alert('Failed to save states changes: ' + err.message);
    }
  };

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
      const allCoverageNames = coverages.map(c => c.name);
      const docRef = await addDoc(collection(db, `products/${productId}/steps`), {
        stepType: 'operand',
        operand: operandChar,
        coverages: allCoverageNames, // Default to all coverages
        states: allStates, // Default to all states
        order: steps.length
      });

      setSteps(prev => [...prev, { id: docRef.id, stepType:'operand', operand:operandChar, coverages: allCoverageNames, states: allStates, order:steps.length }]
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
        (!selectedCoverage || (step.coverages && step.coverages.includes(selectedCoverage)))
      )
      .filter(step =>
        (selectedStates.length === 0
            || selectedStates.every(s => step.states && step.states.includes(s)))
      );
  }, [steps, selectedCoverage, selectedStates]);

  if (loading) {
    return (
      <PageContainer>
        <MainNavigation />
        <PageContent>
          <Spinner />
        </PageContent>
      </PageContainer>
    );
  }

  const handleModalSubmit = async (stepData, _comment) => {
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
    rows.forEach((r)=>{
      // factor first
      const factor = {
        stepType:'factor',
        coverages: String(r['Coverage']).split(';').map(v=>v.trim()).filter(Boolean),
        stepName: r['Step Name'],
        table: r['Table Name'] || '',
        rounding: r['ROUNDING'] || 'none',
        value: parseFloat(String(r['Value']).replace(/[^0-9.-]/g,''))||0,
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
          const allCoverageNames = coverages.map(c => c.name);
          const opRef = await addDoc(
            collection(db, `products/${productId}/steps`),
            { stepType: 'operand', operand: operandRow.operand, coverages: allCoverageNames, states: allStates, order: nextOrder }
          );
          created.push({ id: opRef.id, stepType: 'operand', operand: operandRow.operand, coverages: allCoverageNames, states: allStates, order: nextOrder });
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

  // Drag and drop reordering
  const reorderStepsByIndex = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const newSteps = [...steps];
    const [movedStep] = newSteps.splice(fromIndex, 1);
    newSteps.splice(toIndex, 0, movedStep);

    // Update order for all affected steps
    const updates = newSteps.map((step, index) =>
      updateDoc(doc(db, `products/${productId}/steps`, step.id), { order: index })
    );
    await Promise.all(updates);

    // Update local state with new order values
    const reorderedSteps = newSteps.map((step, index) => ({ ...step, order: index }));
    setSteps(reorderedSteps);
  };

  // Handle inline value editing
  const handleValueUpdate = async (stepId, newValue) => {
    try {
      const numericValue = parseFloat(newValue) || 0;
      await updateDoc(doc(db, `products/${productId}/steps`, stepId), { value: numericValue });

      const updatedSteps = steps.map(s =>
        s.id === stepId ? { ...s, value: numericValue } : s
      );
      setSteps(updatedSteps);
    } catch (error) {
      console.error("Error updating step value:", error);
      alert("Failed to update step value. Please try again.");
    }
  };

  // Handle updating any step property (for enhanced builder)
  const handleUpdateStep = async (stepId: string, updates: Partial<typeof steps[0]>) => {
    try {
      await updateDoc(doc(db, `products/${productId}/steps`, stepId), updates);
      const updatedSteps = steps.map(s =>
        s.id === stepId ? { ...s, ...updates } : s
      );
      setSteps(updatedSteps);
    } catch (error) {
      console.error("Error updating step:", error);
      alert("Failed to update step. Please try again.");
    }
  };

  // Handle duplicating a step
  const handleDuplicateStep = async (step: typeof steps[0]) => {
    try {
      const newStep = {
        ...step,
        stepName: `${step.stepName || 'Step'} (Copy)`,
        order: steps.length,
      };
      delete (newStep as { id?: string }).id;

      const docRef = await addDoc(collection(db, `products/${productId}/steps`), newStep);
      const createdStep = { ...newStep, id: docRef.id };
      setSteps([...steps, createdStep]);
    } catch (error) {
      console.error("Error duplicating step:", error);
      alert("Failed to duplicate step. Please try again.");
    }
  };

  // Handle adding step with template
  const handleAddStepWithTemplate = (template?: StepTemplate) => {
    // For now, just open the modal - template handling can be added later
    openAddModal();
  };

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
            <TableHeader style={{ textAlign: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                Coverage
                <Tooltip>
                  <InformationCircleIcon style={{ width: 14, height: 14, opacity: 0.6 }} />
                  <span className="tooltip-content">
                    The insurance coverage(s) this rating step applies to. Click to modify.
                  </span>
                </Tooltip>
              </span>
            </TableHeader>
            <TableHeader style={{ textAlign: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                Step Name
                <Tooltip>
                  <InformationCircleIcon style={{ width: 14, height: 14, opacity: 0.6 }} />
                  <span className="tooltip-content">
                    The name of the rating factor or operand. Factors multiply the premium, operands combine results.
                  </span>
                </Tooltip>
              </span>
            </TableHeader>
            <TableHeader style={{ textAlign: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                States
                <Tooltip>
                  <InformationCircleIcon style={{ width: 14, height: 14, opacity: 0.6 }} />
                  <span className="tooltip-content">
                    Geographic applicability. Different states may have different regulatory requirements.
                  </span>
                </Tooltip>
              </span>
            </TableHeader>
            <TableHeader style={{ textAlign: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                Value
                <Tooltip>
                  <InformationCircleIcon style={{ width: 14, height: 14, opacity: 0.6 }} />
                  <span className="tooltip-content">
                    The multiplier value for this factor. Click to edit inline. Values are typically between 0.5 and 2.0.
                  </span>
                </Tooltip>
              </span>
            </TableHeader>
            <TableHeader style={{ width: 110, textAlign: 'center' }}>Actions</TableHeader>
          </TableRow>
        </TableHead>
        <tbody>
          {filteredSteps.map((step, index) => (
            step.stepType === 'factor' ? (
              <FactorRow key={step.id}>
                <TableCell style={{ textAlign: 'center' }}>
                  <CellButton variant="ghost" onClick={() => openCovModal(step)}>
                    {step.coverages.length > 1
                      ? `Coverages (${step.coverages.length})`
                      : step.coverages[0] || 'All'
                    }
                  </CellButton>
                </TableCell>
                <TableCell style={{ textAlign: 'center' }}>
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
                <TableCell style={{ textAlign: 'center' }}>
                  <CellButton
                    variant="ghost"
                    title="Select states for this step"
                    onClick={() => openStatesModal(step)}
                  >
                    {getStatesDisplay(step.states || [])}&nbsp;(
                    {(step.states && step.states.length) ? step.states.length : allStates.length}
                    )
                  </CellButton>
                </TableCell>
                <TableCell style={{ textAlign: 'center' }}>
                  <EditableValueCell>
                    <input
                      type="number"
                      defaultValue={step.value || 0}
                      onBlur={(e) => handleValueUpdate(step.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.target.blur();
                        }
                      }}
                    />
                  </EditableValueCell>
                </TableCell>
                <TableCell style={{ textAlign: 'center' }}>
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
                {/* Coverage cell for operands */}
                <TableCell style={{ textAlign: 'center' }}>
                  <CellButton variant="ghost" onClick={() => openCovModal(step)}>
                    {step.coverages && step.coverages.length > 1
                      ? `Coverages (${step.coverages.length})`
                      : (step.coverages && step.coverages[0]) || 'All'
                    }
                  </CellButton>
                </TableCell>

                {/* Centred operand glyph inside the Step‑Name column */}
                <OperandStepCell>
                  {operandGlyph(step.operand)}
                </OperandStepCell>
                {/* States cell for operands */}
                <TableCell style={{ textAlign: 'center' }}>
                  <CellButton
                    variant="ghost"
                    title="Select states for this operand"
                    onClick={() => openStatesModal(step)}
                  >
                    {getStatesDisplay(step.states || [])}&nbsp;(
                    {(step.states && step.states.length) ? step.states.length : allStates.length}
                    )
                  </CellButton>
                </TableCell>
                {/* Empty Value column to preserve alignment */}
                <TableCell style={{ textAlign: 'center' }} />
                {/* Actions cell centered */}
                <TableCell style={{ textAlign: 'center' }}>
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
                    {/* Invisible spacer buttons to align with factor row actions */}
                    <Button variant="ghost" style={{ visibility: 'hidden' }}>
                      <ChevronUpIcon width={16} height={16}/>
                    </Button>
                    <Button variant="ghost" style={{ visibility: 'hidden' }}>
                      <ChevronDownIcon width={16} height={16}/>
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
    <PageContainer>
      <MainNavigation />
      <PageContent>
        <EnhancedHeader
          title={`${productName} - Pricing`}
          subtitle={`Manage pricing steps and calculations`}
          icon={CurrencyDollarIcon}
          showBackButton
          onBackClick={() => navigate(-1)}
        />

        {/* Enhanced Rating Algorithm Builder */}
        <EnhancedRatingBuilder
          steps={filteredSteps}
          onAddStep={handleAddStepWithTemplate}
        >
          <RatingAlgorithmBuilder
            steps={filteredSteps}
            coverages={coverages}
            onStepsChange={setSteps}
            onAddStep={openAddModal}
            onEditStep={(step) => openEditModal(step)}
            onDeleteStep={async (stepId) => {
              if (window.confirm("Are you sure you want to delete this step?")) {
                await handleDeleteStep(stepId);
              }
            }}
            onUpdateStepValue={handleValueUpdate}
            onReorderStepsByIndex={reorderStepsByIndex}
            onAddOperand={addOperand}
            onOpenCoverageModal={openCovModal}
            onOpenStatesModal={openStatesModal}
            onOpenTable={(step) => navigate(`/table/${productId}/${step.id}`)}
            selectedCoverage={selectedCoverage}
            selectedStates={selectedStates}
            isLoading={loading}
          />
        </EnhancedRatingBuilder>
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
            <WideModal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Select Coverages
                    <span style={{ fontSize: '14px', fontWeight: 400, color: '#6b7280' }}>
                      for {currentEditingStep?.stepName}
                    </span>
                  </span>
                </ModalTitle>
                <CloseBtn onClick={() => setCovModalOpen(false)}>
                  <XMarkIcon width={20} height={20}/>
                </CloseBtn>
              </ModalHeader>

              <CoverageSearchInput
                placeholder="🔍 Search coverages by name or code..."
                value={coverageSearchQuery || ''}
                onChange={e => setCoverageSearchQuery(e.target.value)}
              />

              <CoverageLinkActions>
                <Button variant="ghost" onClick={() => setSelectedCoveragesForStep(filteredCoverages.map(c => c.name))}>
                  Select All ({filteredCoverages.length})
                </Button>
                <Button variant="ghost" onClick={() => setSelectedCoveragesForStep([])}>
                  Clear All
                </Button>
                <SelectedBadge>
                  {selectedCoveragesForStep.length} selected
                </SelectedBadge>
              </CoverageLinkActions>

              <CoverageLinkContainer>
                {filteredCoverages.map(coverage => (
                  <CoverageLinkItem key={coverage.id}>
                    <CoverageCheckbox
                      type="checkbox"
                      value={coverage.name}
                      checked={selectedCoveragesForStep.includes(coverage.name)}
                      onChange={e => {
                        const coverageName = e.target.value;
                        setSelectedCoveragesForStep(selected =>
                          selected.includes(coverageName)
                            ? selected.filter(name => name !== coverageName)
                            : [...selected, coverageName]
                        );
                      }}
                    />
                    <CoverageLabel>{coverage.name}</CoverageLabel>
                  </CoverageLinkItem>
                ))}
                {filteredCoverages.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 32px',
                    color: '#94a3b8',
                    fontStyle: 'italic',
                    background: 'rgba(248, 250, 252, 0.5)',
                    borderRadius: '12px'
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                    No coverages found matching your search
                  </div>
                )}
              </CoverageLinkContainer>

              <Actions>
                <Button onClick={saveSelectedCoverages}>Save Changes</Button>
                <Button variant="ghost" onClick={() => setCovModalOpen(false)}>Cancel</Button>
              </Actions>
            </WideModal>
          </OverlayFixed>
        )}

        {/* States Selection Modal */}
        {statesModalOpen && (
          <OverlayFixed onClick={() => setStatesModalOpen(false)}>
            <WideModal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Select States
                    <span style={{ fontSize: '14px', fontWeight: 400, color: '#6b7280' }}>
                      for {currentEditingStepForStates?.stepName}
                    </span>
                  </span>
                </ModalTitle>
                <CloseBtn onClick={() => setStatesModalOpen(false)}>
                  <XMarkIcon width={20} height={20}/>
                </CloseBtn>
              </ModalHeader>

              <CoverageSearchInput
                placeholder="🔍 Search states by abbreviation..."
                value={stateSearchQuery || ''}
                onChange={e => setStateSearchQuery(e.target.value)}
              />

              <CoverageLinkActions>
                <Button variant="ghost" onClick={() => setSelectedStatesForStep(filteredStates)}>
                  Select All ({filteredStates.length})
                </Button>
                <Button variant="ghost" onClick={() => setSelectedStatesForStep([])}>
                  Clear All
                </Button>
                <SelectedBadge>
                  {selectedStatesForStep.length} selected
                </SelectedBadge>
              </CoverageLinkActions>

              <CoverageLinkContainer>
                {filteredStates.map(state => (
                  <CoverageLinkItem key={state}>
                    <CoverageCheckbox
                      type="checkbox"
                      value={state}
                      checked={selectedStatesForStep.includes(state)}
                      onChange={e => {
                        const stateName = e.target.value;
                        setSelectedStatesForStep(selected =>
                          selected.includes(stateName)
                            ? selected.filter(name => name !== stateName)
                            : [...selected, stateName]
                        );
                      }}
                    />
                    <CoverageLabel>{state}</CoverageLabel>
                  </CoverageLinkItem>
                ))}
                {filteredStates.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 32px',
                    color: '#94a3b8',
                    fontStyle: 'italic',
                    background: 'rgba(248, 250, 252, 0.5)',
                    borderRadius: '12px'
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
                    No states found matching your search
                  </div>
                )}
              </CoverageLinkContainer>

              <Actions>
                <Button onClick={saveSelectedStates}>Save Changes</Button>
                <Button variant="ghost" onClick={() => setStatesModalOpen(false)}>Cancel</Button>
              </Actions>
            </WideModal>
          </OverlayFixed>
        )}

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

      </PageContent>
    </PageContainer>
  );
}

export default PricingScreen;