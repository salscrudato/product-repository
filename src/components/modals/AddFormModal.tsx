/**
 * AddFormModal Component
 *
 * Apple-inspired modal for adding new forms to insurance products.
 * Features:
 * - Streamlined single-view design with smart organization
 * - Glassmorphism styling with premium feel
 * - Drag-and-drop PDF upload with visual feedback
 * - Collapsible sections for optional fields
 * - Smart defaults and auto-detection
 * - Smooth animations throughout
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  XMarkIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  DocumentPlusIcon,
  SparklesIcon,
  MapPinIcon,
  LinkIcon,
} from '@heroicons/react/24/solid';
import { DocumentArrowUpIcon } from '@heroicons/react/24/outline';

// Types
interface Coverage {
  id: string;
  name: string;
  productId: string;
}

interface AddFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => Promise<void>;
  coverages: Coverage[];
  productId?: string;
  editingForm?: {
    id: string;
    formName?: string;
    formNumber: string;
    effectiveDate?: string;
    type?: string;
    category?: string;
    coverageIds?: string[];
    states?: string[];
  } | null;
}

interface FormData {
  formName: string;
  formNumber: string;
  effectiveDate: string;
  type: string;
  category: string;
  selectedCoverages: string[];
  selectedStates: string[];
  file: File | null;
  changeSummary?: string;
}

const ALL_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const FORM_TYPES = ['ISO', 'Proprietary', 'AAIS', 'Bureau', 'Other'];
const FORM_CATEGORIES = [
  { value: 'Base Coverage Form', label: 'Base Coverage', color: '#3b82f6' },
  { value: 'Endorsement', label: 'Endorsement', color: '#22c55e' },
  { value: 'Exclusion', label: 'Exclusion', color: '#f59e0b' },
  { value: 'Dec/Quote Letter', label: 'Declaration', color: '#8b5cf6' },
  { value: 'Notice', label: 'Notice', color: '#6366f1' },
  { value: 'Other', label: 'Other', color: '#64748b' },
];

export const AddFormModal: React.FC<AddFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  coverages,
  productId,
  editingForm,
}) => {
  // Form state
  const [formName, setFormName] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [type, setType] = useState('ISO');
  const [category, setCategory] = useState('Base Coverage Form');
  const [selectedCoverages, setSelectedCoverages] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [changeSummary, setChangeSummary] = useState('');

  // UI state
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCoverages, setShowCoverages] = useState(false);
  const [showStates, setShowStates] = useState(false);
  const [coverageSearch, setCoverageSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize form when editing
  useEffect(() => {
    if (editingForm) {
      setFormName(editingForm.formName || '');
      setFormNumber(editingForm.formNumber);
      setEffectiveDate(editingForm.effectiveDate || '');
      setType(editingForm.type || 'ISO');
      setCategory(editingForm.category || 'Base Coverage Form');
      setSelectedCoverages(editingForm.coverageIds || []);
      setSelectedStates(editingForm.states || []);
    } else {
      resetForm();
    }
  }, [editingForm, isOpen]);

  const resetForm = () => {
    setFormName('');
    setFormNumber('');
    setEffectiveDate('');
    setType('ISO');
    setCategory('Base Coverage Form');
    setSelectedCoverages([]);
    setSelectedStates([]);
    setFile(null);
    setChangeSummary('');
    setCoverageSearch('');
    setShowCoverages(false);
    setShowStates(false);
  };

  // Filter coverages by product and search
  const filteredCoverages = coverages
    .filter(c => !productId || c.productId === productId)
    .filter(c => c.name.toLowerCase().includes(coverageSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      setFile(files[0]);
    }
  }, []);

  // Date formatter
  const handleDateChange = (value: string) => {
    let v = value.replace(/[^0-9]/g, '');
    if (v.length > 4) v = v.slice(0, 4);
    if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
    setEffectiveDate(v);
  };

  // Toggle coverage selection
  const toggleCoverage = (id: string) => {
    setSelectedCoverages(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Toggle state selection
  const toggleState = (state: string) => {
    setSelectedStates(prev =>
      prev.includes(state) ? prev.filter(x => x !== state) : [...prev, state]
    );
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!formNumber.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        formName,
        formNumber,
        effectiveDate,
        type,
        category,
        selectedCoverages,
        selectedStates,
        file,
        changeSummary: editingForm ? changeSummary : undefined,
      });
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to save form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const isValid = formNumber.trim().length > 0;
  const selectedCategory = FORM_CATEGORIES.find(c => c.value === category);

  return (
    <Overlay onClick={onClose}>
      <ModalContainer ref={modalRef} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <Header>
          <HeaderLeft>
            <IconBadge>
              {editingForm ? <DocumentTextIcon /> : <DocumentPlusIcon />}
            </IconBadge>
            <HeaderText>
              <Title>{editingForm ? 'Edit Form' : 'Add New Form'}</Title>
              <Subtitle>
                {editingForm ? 'Update form details' : 'Add a form to your product'}
              </Subtitle>
            </HeaderText>
          </HeaderLeft>
          <CloseButton onClick={onClose} disabled={isSubmitting}>
            <XMarkIcon />
          </CloseButton>
        </Header>

        {/* Content */}
        <Content>
          {/* Primary Fields Section */}
          <Section>
            <SectionHeader>
              <SectionIcon><SparklesIcon /></SectionIcon>
              <SectionTitle>Form Details</SectionTitle>
              <RequiredBadge>Required</RequiredBadge>
            </SectionHeader>

            <FieldGrid>
              <Field>
                <Label>Form Number</Label>
                <Input
                  type="text"
                  value={formNumber}
                  onChange={e => setFormNumber(e.target.value)}
                  placeholder="e.g., CP 00 10"
                  autoFocus
                  $hasValue={!!formNumber}
                />
              </Field>

              <Field>
                <Label>Edition Date</Label>
                <Input
                  type="text"
                  value={effectiveDate}
                  onChange={e => handleDateChange(e.target.value)}
                  placeholder="MM/YY"
                  maxLength={5}
                  $hasValue={!!effectiveDate}
                />
              </Field>
            </FieldGrid>

            <Field>
              <Label>Form Name <OptionalTag>optional</OptionalTag></Label>
              <Input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g., Building and Personal Property Coverage Form"
                $hasValue={!!formName}
              />
            </Field>

            {/* Category Pills */}
            <Field>
              <Label>Category</Label>
              <CategoryPills>
                {FORM_CATEGORIES.map(cat => (
                  <CategoryPill
                    key={cat.value}
                    $selected={category === cat.value}
                    $color={cat.color}
                    onClick={() => setCategory(cat.value)}
                  >
                    {cat.label}
                  </CategoryPill>
                ))}
              </CategoryPills>
            </Field>

            {/* Type Pills */}
            <Field>
              <Label>Type</Label>
              <TypePills>
                {FORM_TYPES.map(t => (
                  <TypePill
                    key={t}
                    $selected={type === t}
                    onClick={() => setType(t)}
                  >
                    {t}
                  </TypePill>
                ))}
              </TypePills>
            </Field>
          </Section>

          {/* PDF Upload Section */}
          <UploadSection
            $isDragging={isDragging}
            $hasFile={!!file}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <UploadedFile>
                <DocumentTextIcon />
                <FileName>{file.name}</FileName>
                <RemoveFile onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                  <XMarkIcon />
                </RemoveFile>
              </UploadedFile>
            ) : (
              <UploadPrompt>
                <UploadIcon $isDragging={isDragging}>
                  {isDragging ? <CloudArrowUpIcon /> : <DocumentArrowUpIcon />}
                </UploadIcon>
                <UploadText>
                  {isDragging ? 'Drop PDF here' : 'Drag & drop PDF or click to browse'}
                </UploadText>
                <UploadHint>Optional • PDF format only</UploadHint>
              </UploadPrompt>
            )}
          </UploadSection>

          {/* Collapsible: Linked Coverages */}
          <CollapsibleSection>
            <CollapsibleHeader onClick={() => setShowCoverages(!showCoverages)}>
              <CollapsibleLeft>
                <CollapsibleIcon><LinkIcon /></CollapsibleIcon>
                <CollapsibleTitle>Link to Coverages</CollapsibleTitle>
                {selectedCoverages.length > 0 && (
                  <CountBadge>{selectedCoverages.length}</CountBadge>
                )}
              </CollapsibleLeft>
              <ChevronIcon $isOpen={showCoverages}>
                <ChevronDownIcon />
              </ChevronIcon>
            </CollapsibleHeader>

            <CollapsibleContent $isOpen={showCoverages}>
              <SearchInput
                type="text"
                value={coverageSearch}
                onChange={e => setCoverageSearch(e.target.value)}
                placeholder="Search coverages..."
              />
              <QuickActions>
                <QuickAction onClick={() => setSelectedCoverages(filteredCoverages.map(c => c.id))}>
                  Select All
                </QuickAction>
                <QuickAction onClick={() => setSelectedCoverages([])}>
                  Clear
                </QuickAction>
              </QuickActions>
              <CheckboxList>
                {filteredCoverages.map(c => (
                  <CheckboxItem
                    key={c.id}
                    $selected={selectedCoverages.includes(c.id)}
                    onClick={() => toggleCoverage(c.id)}
                  >
                    <Checkbox $checked={selectedCoverages.includes(c.id)}>
                      {selectedCoverages.includes(c.id) && <CheckCircleIcon />}
                    </Checkbox>
                    <CheckboxLabel>{c.name}</CheckboxLabel>
                  </CheckboxItem>
                ))}
                {filteredCoverages.length === 0 && (
                  <EmptyMessage>No coverages found</EmptyMessage>
                )}
              </CheckboxList>
            </CollapsibleContent>
          </CollapsibleSection>

          {/* Collapsible: States */}
          <CollapsibleSection>
            <CollapsibleHeader onClick={() => setShowStates(!showStates)}>
              <CollapsibleLeft>
                <CollapsibleIcon><MapPinIcon /></CollapsibleIcon>
                <CollapsibleTitle>Applicable States</CollapsibleTitle>
                {selectedStates.length > 0 && (
                  <CountBadge>
                    {selectedStates.length === 50 ? 'All' : selectedStates.length}
                  </CountBadge>
                )}
              </CollapsibleLeft>
              <ChevronIcon $isOpen={showStates}>
                <ChevronDownIcon />
              </ChevronIcon>
            </CollapsibleHeader>

            <CollapsibleContent $isOpen={showStates}>
              <StatesHeader>
                <SelectAllButton
                  onClick={() => setSelectedStates(selectedStates.length === ALL_STATES.length ? [] : [...ALL_STATES])}
                >
                  {selectedStates.length === ALL_STATES.length ? 'Clear All' : 'Select All'}
                </SelectAllButton>
              </StatesHeader>
              <StatesGrid>
                {ALL_STATES.map(state => (
                  <StateChip
                    key={state}
                    $selected={selectedStates.includes(state)}
                    onClick={() => toggleState(state)}
                  >
                    {state}
                  </StateChip>
                ))}
              </StatesGrid>
            </CollapsibleContent>
          </CollapsibleSection>

          {/* Change Summary (Edit mode only) */}
          {editingForm && (
            <Section>
              <Field>
                <Label>Reason for Changes</Label>
                <TextArea
                  value={changeSummary}
                  onChange={e => setChangeSummary(e.target.value)}
                  placeholder="Describe what changed and why..."
                  rows={3}
                />
              </Field>
            </Section>
          )}
        </Content>

        {/* Footer */}
        <Footer>
          <CancelButton onClick={onClose} disabled={isSubmitting}>
            Cancel
          </CancelButton>
          <SaveButton
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            $isLoading={isSubmitting}
          >
            {isSubmitting ? (
              <LoadingSpinner />
            ) : (
              <>
                <CheckCircleIcon />
                {editingForm ? 'Save Changes' : 'Add Form'}
              </>
            )}
          </SaveButton>
        </Footer>
      </ModalContainer>
    </Overlay>
  );
};

// ============================================================================
// Animations
// ============================================================================

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

// ============================================================================
// Styled Components
// ============================================================================

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1500;
  padding: 60px 24px 24px;
  overflow-y: auto;
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalContainer = styled.div`
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  border-radius: 20px;
  width: 100%;
  max-width: 580px;
  min-height: min-content;
  max-height: none;
  display: flex;
  flex-direction: column;
  overflow: visible;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.04),
    0 24px 80px -12px rgba(0, 0, 0, 0.25),
    0 0 60px -20px rgba(99, 102, 241, 0.2);
  animation: ${slideUp} 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  margin-bottom: 24px;
  flex-shrink: 0;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: linear-gradient(180deg, rgba(255, 255, 255, 1) 0%, rgba(249, 250, 251, 0.8) 100%);
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const IconBadge = styled.div`
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);

  svg {
    width: 22px;
    height: 22px;
    color: white;
  }
`;

const HeaderText = styled.div``;

const Title = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0;
  letter-spacing: -0.02em;
`;

const Subtitle = styled.p`
  font-size: 13px;
  color: #86868b;
  margin: 2px 0 0 0;
`;

const CloseButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  color: #86868b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  svg { width: 18px; height: 18px; }

  &:hover {
    background: rgba(0, 0, 0, 0.08);
    color: #1d1d1f;
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SectionIcon = styled.div`
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 14px;
    height: 14px;
    color: #6366f1;
  }
`;

const SectionTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0;
  flex: 1;
`;

const RequiredBadge = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  padding: 3px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const OptionalTag = styled.span`
  font-size: 10px;
  font-weight: 500;
  color: #9ca3af;
`;

const Input = styled.input<{ $hasValue?: boolean }>`
  width: 100%;
  padding: 12px 14px;
  font-size: 15px;
  border: 1.5px solid ${p => p.$hasValue ? 'rgba(99, 102, 241, 0.3)' : 'rgba(0, 0, 0, 0.08)'};
  border-radius: 12px;
  background: ${p => p.$hasValue ? 'rgba(99, 102, 241, 0.02)' : 'rgba(0, 0, 0, 0.02)'};
  color: #1d1d1f;
  transition: all 0.2s ease;

  &::placeholder {
    color: #c7c7cc;
  }

  &:focus {
    outline: none;
    border-color: #6366f1;
    background: white;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 14px;
  font-size: 14px;
  border: 1.5px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.02);
  color: #1d1d1f;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  transition: all 0.2s ease;

  &::placeholder {
    color: #c7c7cc;
  }

  &:focus {
    outline: none;
    border-color: #6366f1;
    background: white;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  }
`;

const CategoryPills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const CategoryPill = styled.button<{ $selected: boolean; $color: string }>`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 20px;
  border: 1.5px solid ${p => p.$selected ? p.$color : 'rgba(0, 0, 0, 0.08)'};
  background: ${p => p.$selected ? `${p.$color}10` : 'white'};
  color: ${p => p.$selected ? p.$color : '#6b7280'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${p => p.$color};
    background: ${p => `${p.$color}08`};
    transform: translateY(-1px);
  }
`;

const TypePills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const TypePill = styled.button<{ $selected: boolean }>`
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 8px;
  border: 1.5px solid ${p => p.$selected ? '#6366f1' : 'rgba(0, 0, 0, 0.06)'};
  background: ${p => p.$selected ? 'rgba(99, 102, 241, 0.08)' : 'rgba(0, 0, 0, 0.02)'};
  color: ${p => p.$selected ? '#6366f1' : '#6b7280'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.4);
    background: rgba(99, 102, 241, 0.04);
  }
`;

const UploadSection = styled.div<{ $isDragging: boolean; $hasFile: boolean }>`
  border: 2px dashed ${p => p.$isDragging ? '#6366f1' : p.$hasFile ? '#22c55e' : 'rgba(0, 0, 0, 0.1)'};
  border-radius: 16px;
  padding: ${p => p.$hasFile ? '16px' : '32px'};
  background: ${p =>
    p.$isDragging ? 'rgba(99, 102, 241, 0.05)' :
    p.$hasFile ? 'rgba(34, 197, 94, 0.03)' : 'rgba(0, 0, 0, 0.01)'
  };
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: ${p => p.$hasFile ? '#22c55e' : '#6366f1'};
    background: ${p => p.$hasFile ? 'rgba(34, 197, 94, 0.05)' : 'rgba(99, 102, 241, 0.03)'};
  }
`;

const UploadPrompt = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const UploadIcon = styled.div<{ $isDragging: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: ${p => p.$isDragging ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(0, 0, 0, 0.04)'};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;

  svg {
    width: 24px;
    height: 24px;
    color: ${p => p.$isDragging ? 'white' : '#86868b'};
  }
`;

const UploadText = styled.p`
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
  margin: 0;
`;

const UploadHint = styled.p`
  font-size: 12px;
  color: #86868b;
  margin: 0;
`;

const UploadedFile = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;

  svg:first-child {
    width: 32px;
    height: 32px;
    color: #22c55e;
    flex-shrink: 0;
  }
`;

const FileName = styled.span`
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RemoveFile = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  svg { width: 14px; height: 14px; }

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: scale(1.1);
  }
`;


// Collapsible Section Styles
const CollapsibleSection = styled.div`
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  overflow: hidden;
  background: white;
`;

const CollapsibleHeader = styled.button`
  width: 100%;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.02);
  }
`;

const CollapsibleLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CollapsibleIcon = styled.div`
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 14px;
    height: 14px;
    color: #6b7280;
  }
`;

const CollapsibleTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #1d1d1f;
`;

const CountBadge = styled.span`
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 10px;
`;

const ChevronIcon = styled.div<{ $isOpen: boolean }>`
  color: #86868b;
  transition: transform 0.25s ease;
  transform: rotate(${p => p.$isOpen ? '180deg' : '0deg'});

  svg {
    width: 18px;
    height: 18px;
  }
`;

const CollapsibleContent = styled.div<{ $isOpen: boolean }>`
  max-height: ${p => p.$isOpen ? '300px' : '0'};
  opacity: ${p => p.$isOpen ? 1 : 0};
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: ${p => p.$isOpen ? '0 16px 16px' : '0 16px'};
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.02);
  margin-bottom: 10px;

  &:focus {
    outline: none;
    border-color: #6366f1;
    background: white;
  }
`;

const QuickActions = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
`;

const QuickAction = styled.button`
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.15);
  }
`;

const CheckboxList = styled.div`
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 2px;
  }
`;

const CheckboxItem = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  background: ${p => p.$selected ? 'rgba(99, 102, 241, 0.06)' : 'transparent'};

  &:hover {
    background: ${p => p.$selected ? 'rgba(99, 102, 241, 0.1)' : 'rgba(0, 0, 0, 0.03)'};
  }
`;

const Checkbox = styled.div<{ $checked: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 2px solid ${p => p.$checked ? '#6366f1' : 'rgba(0, 0, 0, 0.15)'};
  background: ${p => p.$checked ? '#6366f1' : 'white'};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;

  svg {
    width: 14px;
    height: 14px;
    color: white;
  }
`;

const CheckboxLabel = styled.span`
  font-size: 13px;
  color: #1d1d1f;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const EmptyMessage = styled.div`
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: #86868b;
`;

// States Section Styles
const StatesHeader = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
`;

const SelectAllButton = styled.button`
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.15);
  }
`;

const StatesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 6px;

  @media (max-width: 560px) {
    grid-template-columns: repeat(5, 1fr);
  }
`;

const StateChip = styled.button<{ $selected: boolean }>`
  padding: 6px 4px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid ${p => p.$selected ? '#6366f1' : 'rgba(0, 0, 0, 0.06)'};
  background: ${p => p.$selected ? 'rgba(99, 102, 241, 0.1)' : 'white'};
  color: ${p => p.$selected ? '#6366f1' : '#6b7280'};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.05);
  }
`;

// Footer Styles
const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  background: linear-gradient(180deg, rgba(249, 250, 251, 0.8) 0%, rgba(255, 255, 255, 1) 100%);
`;

const CancelButton = styled.button`
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  background: rgba(0, 0, 0, 0.04);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.08);
    color: #1d1d1f;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const SaveButton = styled.button<{ $isLoading?: boolean }>`
  padding: 12px 28px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
  min-width: 140px;
  justify-content: center;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);
    background: linear-gradient(135deg, #5b5bf6 0%, #7c3aed 100%);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  ${p => p.$isLoading && css`
    animation: ${pulse} 1.5s ease-in-out infinite;
  `}
`;

const LoadingSpinner = styled.div`
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;

export default AddFormModal;