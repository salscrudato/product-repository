/**
 * DeductiblesModal Component
 * Enhanced modal for managing coverage deductibles with structured data
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { CoverageDeductible } from '@types';
import { useCoverageDeductibles } from '@hooks/useCoverageDeductibles';
import { DeductibleTypeSelector } from '../selectors/DeductibleTypeSelector';
import { validateCoverageDeductible, formatValidationResult } from '@services/validationService';

interface DeductiblesModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  coverageId: string;
  coverageName: string;
  onSave?: () => void;
}

export const DeductiblesModal: React.FC<DeductiblesModalProps> = ({
  isOpen,
  onClose,
  productId,
  coverageId,
  coverageName,
  onSave,
}) => {
  const { deductibles, loading, addDeductible, updateDeductible, deleteDeductible, setDefaultDeductible } = useCoverageDeductibles(productId, coverageId);
  const [editingDeductible, setEditingDeductible] = useState<Partial<CoverageDeductible> | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleAdd = async () => {
    if (!editingDeductible || !editingDeductible.deductibleType) {
      alert('Please select a deductible type');
      return;
    }

    if (editingDeductible.deductibleType === 'percentage' && !editingDeductible.percentage) {
      alert('Please enter a percentage');
      return;
    }

    if (editingDeductible.deductibleType !== 'percentage' && !editingDeductible.amount) {
      alert('Please enter an amount');
      return;
    }

    // Validate the deductible
    const validationResult = validateCoverageDeductible(editingDeductible);
    if (!validationResult.isValid) {
      alert('Validation errors:\n\n' + formatValidationResult(validationResult));
      return;
    }

    // Show warnings but allow save
    if (validationResult.warnings.length > 0) {
      const proceed = window.confirm(
        'Warnings:\n\n' +
        validationResult.warnings.map(w => `• ${w.message}`).join('\n') +
        '\n\nDo you want to proceed anyway?'
      );
      if (!proceed) return;
    }

    try {
      await addDeductible({
        ...editingDeductible,
        coverageId,
        productId,
      });
      setEditingDeductible(null);
      setIsAdding(false);
      if (onSave) onSave();
    } catch (error: any) {
      alert('Failed to add deductible: ' + error.message);
    }
  };

  const handleDelete = async (deductibleId: string) => {
    if (confirm('Are you sure you want to delete this deductible?')) {
      try {
        await deleteDeductible(deductibleId);
        if (onSave) onSave();
      } catch (error: any) {
        alert('Failed to delete deductible: ' + error.message);
      }
    }
  };

  const handleSetDefault = async (deductibleId: string) => {
    try {
      await setDefaultDeductible(deductibleId);
      if (onSave) onSave();
    } catch (error: any) {
      alert('Failed to set default deductible: ' + error.message);
    }
  };

  const handleClose = () => {
    setEditingDeductible(null);
    setIsAdding(false);
    onClose();
  };

  return (
    <Overlay onClick={handleClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>Manage Deductibles - {coverageName}</Title>
          <CloseButton onClick={handleClose}>
            <XMarkIcon style={{ width: 24, height: 24 }} />
          </CloseButton>
        </Header>

        <Content>
          {loading ? (
            <LoadingState>Loading deductibles...</LoadingState>
          ) : (
            <>
              {/* Add New Deductible Section */}
              {isAdding ? (
                <AddSection>
                  <SectionTitle>Add New Deductible</SectionTitle>
                  <DeductibleTypeSelector
                    value={editingDeductible || { deductibleType: 'flat' }}
                    onChange={setEditingDeductible}
                  />
                  <ButtonGroup>
                    <AddButton onClick={handleAdd}>
                      <PlusIcon style={{ width: 20, height: 20 }} />
                      Add Deductible
                    </AddButton>
                    <CancelButton onClick={() => {
                      setIsAdding(false);
                      setEditingDeductible(null);
                    }}>
                      Cancel
                    </CancelButton>
                  </ButtonGroup>
                </AddSection>
              ) : (
                <AddNewButton onClick={() => {
                  setIsAdding(true);
                  setEditingDeductible({ deductibleType: 'flat' });
                }}>
                  <PlusIcon style={{ width: 20, height: 20 }} />
                  Add New Deductible
                </AddNewButton>
              )}

              {/* Existing Deductibles List */}
              <ListSection>
                <SectionTitle>Current Deductibles ({deductibles.length})</SectionTitle>
                {deductibles.length === 0 ? (
                  <EmptyState>No deductibles added yet. Click "Add New Deductible" to get started.</EmptyState>
                ) : (
                  <DeductiblesList>
                    {deductibles.map((deductible) => (
                      <DeductibleCard key={deductible.id} isDefault={deductible.isDefault}>
                        <DeductibleHeader>
                          <DeductibleDisplay>
                            <DeductibleValue>{deductible.displayValue}</DeductibleValue>
                            <DeductibleType>{deductible.deductibleType}</DeductibleType>
                          </DeductibleDisplay>
                          <DeductibleActions>
                            {!deductible.isDefault && (
                              <SetDefaultButton onClick={() => handleSetDefault(deductible.id)}>
                                Set Default
                              </SetDefaultButton>
                            )}
                            <DeleteButton onClick={() => handleDelete(deductible.id)}>
                              <TrashIcon style={{ width: 16, height: 16 }} />
                            </DeleteButton>
                          </DeductibleActions>
                        </DeductibleHeader>
                        {deductible.isDefault && <DefaultBadge>Default</DefaultBadge>}
                        {deductible.isRequired && <RequiredBadge>Required</RequiredBadge>}
                        {deductible.appliesTo && deductible.appliesTo.length > 0 && (
                          <AppliesTo>Applies to: {deductible.appliesTo.join(', ')}</AppliesTo>
                        )}
                        {(deductible.minimumRetained || deductible.maximumRetained) && (
                          <Range>
                            Retained: ${deductible.minimumRetained?.toLocaleString() || '0'} - ${deductible.maximumRetained?.toLocaleString() || '∞'}
                          </Range>
                        )}
                      </DeductibleCard>
                    ))}
                  </DeductiblesList>
                )}
              </ListSection>
            </>
          )}
        </Content>

        <Footer>
          <CloseFooterButton onClick={handleClose}>Close</CloseFooterButton>
        </Footer>
      </ModalContainer>
    </Overlay>
  );
};

// Styled Components (same as LimitsModal)
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

const LoadingState = styled.div`
  text-align: center;
  padding: 40px;
  color: #6b7280;
  font-size: 16px;
`;

const AddSection = styled.div`
  background: #f9fafb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
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

const CancelButton = styled.button`
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

const AddNewButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 24px;
  width: 100%;
  justify-content: center;
  
  &:hover {
    background: #2563eb;
  }
`;

const ListSection = styled.div``;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: #9ca3af;
  font-size: 14px;
`;

const DeductiblesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const DeductibleCard = styled.div<{ isDefault?: boolean }>`
  background: white;
  border: 2px solid ${props => props.isDefault ? '#3b82f6' : '#e5e7eb'};
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 6px rgba(59, 130, 246, 0.1);
  }
`;

const DeductibleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const DeductibleDisplay = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const DeductibleValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: #111827;
`;

const DeductibleType = styled.div`
  font-size: 13px;
  color: #6b7280;
  text-transform: capitalize;
`;

const DeductibleActions = styled.div`
  display: flex;
  gap: 8px;
`;

const SetDefaultButton = styled.button`
  padding: 4px 12px;
  background: #dbeafe;
  color: #1e40af;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background: #bfdbfe;
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

const DefaultBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  margin-right: 8px;
`;

const RequiredBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  background: #fef3c7;
  color: #d97706;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
`;

const AppliesTo = styled.div`
  font-size: 13px;
  color: #6b7280;
  margin-top: 8px;
`;

const Range = styled.div`
  font-size: 13px;
  color: #6b7280;
  margin-top: 4px;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 24px;
  border-top: 1px solid #e5e7eb;
`;

const CloseFooterButton = styled.button`
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

