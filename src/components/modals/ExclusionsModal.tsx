/**
 * ExclusionsModal Component
 * Modal for managing coverage exclusions
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { CoverageExclusion, ExclusionType } from '../../types';

interface ExclusionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exclusions: CoverageExclusion[];
  onSave: (exclusions: CoverageExclusion[]) => void;
}

const EXCLUSION_TYPES: { value: ExclusionType; label: string }[] = [
  { value: 'named', label: 'Named Peril/Situation' },
  { value: 'general', label: 'General Category' },
  { value: 'conditional', label: 'Conditional' },
  { value: 'absolute', label: 'Absolute (Cannot Buy Back)' },
  { value: 'buyback', label: 'Buyback Available' },
];

export const ExclusionsModal: React.FC<ExclusionsModalProps> = ({
  isOpen,
  onClose,
  exclusions,
  onSave,
}) => {
  const [localExclusions, setLocalExclusions] = useState<CoverageExclusion[]>(exclusions);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<CoverageExclusion>>({
    name: '',
    description: '',
    type: 'named',
    reference: '',
    isStandard: false,
    isAbsolute: false,
  });

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!formData.name || !formData.description) {
      alert('Name and description are required');
      return;
    }

    const newExclusion: CoverageExclusion = {
      id: `temp-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      type: formData.type as ExclusionType,
      reference: formData.reference,
      isStandard: formData.isStandard,
      isAbsolute: formData.isAbsolute,
      createdAt: new Date(),
    };

    if (editingIndex !== null) {
      const updated = [...localExclusions];
      updated[editingIndex] = newExclusion;
      setLocalExclusions(updated);
      setEditingIndex(null);
    } else {
      setLocalExclusions([...localExclusions, newExclusion]);
    }

    // Reset form
    setFormData({
      name: '',
      description: '',
      type: 'named',
      reference: '',
      isStandard: false,
      isAbsolute: false,
    });
  };

  const handleEdit = (index: number) => {
    const exclusion = localExclusions[index];
    setFormData({
      name: exclusion.name,
      description: exclusion.description,
      type: exclusion.type,
      reference: exclusion.reference,
      isStandard: exclusion.isStandard,
      isAbsolute: exclusion.isAbsolute,
    });
    setEditingIndex(index);
  };

  const handleDelete = (index: number) => {
    if (confirm('Are you sure you want to delete this exclusion?')) {
      setLocalExclusions(localExclusions.filter((_, i) => i !== index));
    }
  };

  const handleSave = () => {
    onSave(localExclusions);
    onClose();
  };

  const handleCancel = () => {
    setLocalExclusions(exclusions);
    setEditingIndex(null);
    setFormData({
      name: '',
      description: '',
      type: 'named',
      reference: '',
      isStandard: false,
      isAbsolute: false,
    });
    onClose();
  };

  return (
    <Overlay onClick={handleCancel}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>Manage Exclusions</Title>
          <CloseButton onClick={handleCancel}>
            <XMarkIcon style={{ width: 24, height: 24 }} />
          </CloseButton>
        </Header>

        <Content>
          {/* Add/Edit Form */}
          <FormSection>
            <SectionTitle>{editingIndex !== null ? 'Edit' : 'Add'} Exclusion</SectionTitle>
            
            <FormGrid>
              <FormGroup>
                <Label>Name *</Label>
                <Input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., War and Military Action"
                />
              </FormGroup>

              <FormGroup>
                <Label>Type *</Label>
                <Select
                  value={formData.type || 'named'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ExclusionType })}
                >
                  {EXCLUSION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </FormGroup>

              <FormGroup style={{ gridColumn: '1 / -1' }}>
                <Label>Description *</Label>
                <TextArea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description of what is excluded..."
                  rows={3}
                />
              </FormGroup>

              <FormGroup>
                <Label>Reference (Form/Section)</Label>
                <Input
                  type="text"
                  value={formData.reference || ''}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="e.g., CP 10 30 10 12"
                />
              </FormGroup>

              <FormGroup>
                <CheckboxGroup>
                  <Checkbox
                    type="checkbox"
                    checked={formData.isStandard || false}
                    onChange={(e) => setFormData({ ...formData, isStandard: e.target.checked })}
                  />
                  <Label>ISO Standard Exclusion</Label>
                </CheckboxGroup>

                <CheckboxGroup>
                  <Checkbox
                    type="checkbox"
                    checked={formData.isAbsolute || false}
                    onChange={(e) => setFormData({ ...formData, isAbsolute: e.target.checked })}
                  />
                  <Label>Absolute (Cannot Buy Back)</Label>
                </CheckboxGroup>
              </FormGroup>
            </FormGrid>

            <ButtonGroup>
              <AddButton onClick={handleAdd}>
                <PlusIcon style={{ width: 20, height: 20 }} />
                {editingIndex !== null ? 'Update' : 'Add'} Exclusion
              </AddButton>
              {editingIndex !== null && (
                <CancelEditButton onClick={() => {
                  setEditingIndex(null);
                  setFormData({
                    name: '',
                    description: '',
                    type: 'named',
                    reference: '',
                    isStandard: false,
                    isAbsolute: false,
                  });
                }}>
                  Cancel Edit
                </CancelEditButton>
              )}
            </ButtonGroup>
          </FormSection>

          {/* Exclusions List */}
          <ListSection>
            <SectionTitle>Current Exclusions ({localExclusions.length})</SectionTitle>
            {localExclusions.length === 0 ? (
              <EmptyState>No exclusions added yet</EmptyState>
            ) : (
              <ExclusionsList>
                {localExclusions.map((exclusion, index) => (
                  <ExclusionCard key={index}>
                    <ExclusionHeader>
                      <ExclusionName>{exclusion.name}</ExclusionName>
                      <ExclusionActions>
                        <EditButton onClick={() => handleEdit(index)}>Edit</EditButton>
                        <DeleteButton onClick={() => handleDelete(index)}>
                          <TrashIcon style={{ width: 16, height: 16 }} />
                        </DeleteButton>
                      </ExclusionActions>
                    </ExclusionHeader>
                    <ExclusionType>{EXCLUSION_TYPES.find(t => t.value === exclusion.type)?.label}</ExclusionType>
                    <ExclusionDescription>{exclusion.description}</ExclusionDescription>
                    {exclusion.reference && (
                      <ExclusionReference>Reference: {exclusion.reference}</ExclusionReference>
                    )}
                    <ExclusionBadges>
                      {exclusion.isStandard && <Badge>ISO Standard</Badge>}
                      {exclusion.isAbsolute && <Badge variant="danger">Absolute</Badge>}
                    </ExclusionBadges>
                  </ExclusionCard>
                ))}
              </ExclusionsList>
            )}
          </ListSection>
        </Content>

        <Footer>
          <CancelButton onClick={handleCancel}>Cancel</CancelButton>
          <SaveButton onClick={handleSave}>Save Exclusions</SaveButton>
        </Footer>
      </ModalContainer>
    </Overlay>
  );
};

// Styled Components
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  
  &:hover {
    color: #111827;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
`;

const FormSection = styled.div`
  background: #f9fafb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
`;

const ListSection = styled.div``;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #374151;
`;

const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const Select = styled.select`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const TextArea = styled.textarea`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background: #2563eb;
  }
`;

const CancelEditButton = styled.button`
  padding: 10px 16px;
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background: #4b5563;
  }
`;

const ExclusionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ExclusionCard = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
`;

const ExclusionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const ExclusionName = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #111827;
`;

const ExclusionActions = styled.div`
  display: flex;
  gap: 8px;
`;

const EditButton = styled.button`
  padding: 4px 12px;
  background: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  
  &:hover {
    background: #e5e7eb;
  }
`;

const DeleteButton = styled.button`
  padding: 4px 8px;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  
  &:hover {
    background: #fecaca;
  }
`;

const ExclusionType = styled.div`
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
`;

const ExclusionDescription = styled.div`
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
  margin-bottom: 8px;
`;

const ExclusionReference = styled.div`
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
  margin-bottom: 8px;
`;

const ExclusionBadges = styled.div`
  display: flex;
  gap: 8px;
`;

const Badge = styled.span<{ variant?: 'danger' }>`
  padding: 2px 8px;
  background: ${props => props.variant === 'danger' ? '#fee2e2' : '#dbeafe'};
  color: ${props => props.variant === 'danger' ? '#dc2626' : '#1e40af'};
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: #9ca3af;
  font-size: 14px;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #e5e7eb;
`;

const CancelButton = styled.button`
  padding: 10px 20px;
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background: #f9fafb;
  }
`;

const SaveButton = styled.button`
  padding: 10px 20px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background: #059669;
  }
`;

