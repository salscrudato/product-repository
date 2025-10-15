/**
 * ConditionsModal Component
 * Modal for managing coverage conditions
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { CoverageCondition, ConditionType } from '../../types';

interface ConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conditions: CoverageCondition[];
  onSave: (conditions: CoverageCondition[]) => void;
}

const CONDITION_TYPES: { value: ConditionType; label: string }[] = [
  { value: 'eligibility', label: 'Eligibility Requirement' },
  { value: 'claims', label: 'Claims Condition' },
  { value: 'duties', label: 'Duties After Loss' },
  { value: 'general', label: 'General Condition' },
  { value: 'suspension', label: 'Suspension Condition' },
  { value: 'cancellation', label: 'Cancellation Condition' },
];

export const ConditionsModal: React.FC<ConditionsModalProps> = ({
  isOpen,
  onClose,
  conditions,
  onSave,
}) => {
  const [localConditions, setLocalConditions] = useState<CoverageCondition[]>(conditions);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<CoverageCondition>>({
    name: '',
    description: '',
    type: 'general',
    reference: '',
    isRequired: false,
    isSuspending: false,
  });

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!formData.name || !formData.description) {
      alert('Name and description are required');
      return;
    }

    const newCondition: CoverageCondition = {
      id: `temp-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      type: formData.type as ConditionType,
      reference: formData.reference,
      isRequired: formData.isRequired,
      isSuspending: formData.isSuspending,
      createdAt: new Date(),
    };

    if (editingIndex !== null) {
      const updated = [...localConditions];
      updated[editingIndex] = newCondition;
      setLocalConditions(updated);
      setEditingIndex(null);
    } else {
      setLocalConditions([...localConditions, newCondition]);
    }

    // Reset form
    setFormData({
      name: '',
      description: '',
      type: 'general',
      reference: '',
      isRequired: false,
      isSuspending: false,
    });
  };

  const handleEdit = (index: number) => {
    const condition = localConditions[index];
    setFormData({
      name: condition.name,
      description: condition.description,
      type: condition.type,
      reference: condition.reference,
      isRequired: condition.isRequired,
      isSuspending: condition.isSuspending,
    });
    setEditingIndex(index);
  };

  const handleDelete = (index: number) => {
    if (confirm('Are you sure you want to delete this condition?')) {
      setLocalConditions(localConditions.filter((_, i) => i !== index));
    }
  };

  const handleSave = () => {
    onSave(localConditions);
    onClose();
  };

  const handleCancel = () => {
    setLocalConditions(conditions);
    setEditingIndex(null);
    setFormData({
      name: '',
      description: '',
      type: 'general',
      reference: '',
      isRequired: false,
      isSuspending: false,
    });
    onClose();
  };

  return (
    <Overlay onClick={handleCancel}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>Manage Conditions</Title>
          <CloseButton onClick={handleCancel}>
            <XMarkIcon style={{ width: 24, height: 24 }} />
          </CloseButton>
        </Header>

        <Content>
          {/* Add/Edit Form */}
          <FormSection>
            <SectionTitle>{editingIndex !== null ? 'Edit' : 'Add'} Condition</SectionTitle>
            
            <FormGrid>
              <FormGroup>
                <Label>Name *</Label>
                <Input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Notice of Occurrence"
                />
              </FormGroup>

              <FormGroup>
                <Label>Type *</Label>
                <Select
                  value={formData.type || 'general'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ConditionType })}
                >
                  {CONDITION_TYPES.map((type) => (
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
                  placeholder="Detailed description of the condition..."
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
                    checked={formData.isRequired || false}
                    onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                  />
                  <Label>Required Condition</Label>
                </CheckboxGroup>

                <CheckboxGroup>
                  <Checkbox
                    type="checkbox"
                    checked={formData.isSuspending || false}
                    onChange={(e) => setFormData({ ...formData, isSuspending: e.target.checked })}
                  />
                  <Label>Suspends Coverage if Not Met</Label>
                </CheckboxGroup>
              </FormGroup>
            </FormGrid>

            <ButtonGroup>
              <AddButton onClick={handleAdd}>
                <PlusIcon style={{ width: 20, height: 20 }} />
                {editingIndex !== null ? 'Update' : 'Add'} Condition
              </AddButton>
              {editingIndex !== null && (
                <CancelEditButton onClick={() => {
                  setEditingIndex(null);
                  setFormData({
                    name: '',
                    description: '',
                    type: 'general',
                    reference: '',
                    isRequired: false,
                    isSuspending: false,
                  });
                }}>
                  Cancel Edit
                </CancelEditButton>
              )}
            </ButtonGroup>
          </FormSection>

          {/* Conditions List */}
          <ListSection>
            <SectionTitle>Current Conditions ({localConditions.length})</SectionTitle>
            {localConditions.length === 0 ? (
              <EmptyState>No conditions added yet</EmptyState>
            ) : (
              <ConditionsList>
                {localConditions.map((condition, index) => (
                  <ConditionCard key={index}>
                    <ConditionHeader>
                      <ConditionName>{condition.name}</ConditionName>
                      <ConditionActions>
                        <EditButton onClick={() => handleEdit(index)}>Edit</EditButton>
                        <DeleteButton onClick={() => handleDelete(index)}>
                          <TrashIcon style={{ width: 16, height: 16 }} />
                        </DeleteButton>
                      </ConditionActions>
                    </ConditionHeader>
                    <ConditionType>{CONDITION_TYPES.find(t => t.value === condition.type)?.label}</ConditionType>
                    <ConditionDescription>{condition.description}</ConditionDescription>
                    {condition.reference && (
                      <ConditionReference>Reference: {condition.reference}</ConditionReference>
                    )}
                    <ConditionBadges>
                      {condition.isRequired && <Badge>Required</Badge>}
                      {condition.isSuspending && <Badge variant="warning">Suspending</Badge>}
                    </ConditionBadges>
                  </ConditionCard>
                ))}
              </ConditionsList>
            )}
          </ListSection>
        </Content>

        <Footer>
          <CancelButton onClick={handleCancel}>Cancel</CancelButton>
          <SaveButton onClick={handleSave}>Save Conditions</SaveButton>
        </Footer>
      </ModalContainer>
    </Overlay>
  );
};

// Styled Components (reusing from ExclusionsModal with minor adjustments)
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

const ConditionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ConditionCard = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
`;

const ConditionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const ConditionName = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #111827;
`;

const ConditionActions = styled.div`
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

const ConditionType = styled.div`
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
`;

const ConditionDescription = styled.div`
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
  margin-bottom: 8px;
`;

const ConditionReference = styled.div`
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
  margin-bottom: 8px;
`;

const ConditionBadges = styled.div`
  display: flex;
  gap: 8px;
`;

const Badge = styled.span<{ variant?: 'warning' }>`
  padding: 2px 8px;
  background: ${props => props.variant === 'warning' ? '#fef3c7' : '#dbeafe'};
  color: ${props => props.variant === 'warning' ? '#d97706' : '#1e40af'};
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

