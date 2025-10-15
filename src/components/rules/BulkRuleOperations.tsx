/**
 * BulkRuleOperations Component
 * Modal for performing bulk operations on rules
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { Rule, RuleStatus } from '../../types';
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface BulkRuleOperationsProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRules: Rule[];
  onBulkUpdateStatus: (ruleIds: string[], status: RuleStatus) => Promise<void>;
  onBulkDelete: (ruleIds: string[]) => Promise<void>;
}

export const BulkRuleOperations: React.FC<BulkRuleOperationsProps> = ({
  isOpen,
  onClose,
  selectedRules,
  onBulkUpdateStatus,
  onBulkDelete
}) => {
  const [operation, setOperation] = useState<'status' | 'delete' | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<RuleStatus>('Active');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStatusUpdate = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const ruleIds = selectedRules.map(r => r.id);
      await onBulkUpdateStatus(ruleIds, selectedStatus);
      onClose();
    } catch (err) {
      setError(`Failed to update rules: ${(err as Error).message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedRules.length} rule(s)? This action cannot be undone.`)) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const ruleIds = selectedRules.map(r => r.id);
      await onBulkDelete(ruleIds);
      onClose();
    } catch (err) {
      setError(`Failed to delete rules: ${(err as Error).message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetOperation = () => {
    setOperation(null);
    setError(null);
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Bulk Operations</ModalTitle>
          <CloseButton onClick={onClose}>
            <XMarkIcon />
          </CloseButton>
        </ModalHeader>

        <ModalContent>
          <SelectionInfo>
            <CheckCircleIcon />
            {selectedRules.length} rule{selectedRules.length !== 1 ? 's' : ''} selected
          </SelectionInfo>

          {error && (
            <ErrorMessage>
              <ExclamationTriangleIcon />
              {error}
            </ErrorMessage>
          )}

          {!operation && (
            <OperationSelector>
              <OperationButton onClick={() => setOperation('status')}>
                <ArrowPathIcon />
                <div>
                  <OperationTitle>Update Status</OperationTitle>
                  <OperationDescription>
                    Change the status of all selected rules
                  </OperationDescription>
                </div>
              </OperationButton>

              <OperationButton className="danger" onClick={() => setOperation('delete')}>
                <TrashIcon />
                <div>
                  <OperationTitle>Delete Rules</OperationTitle>
                  <OperationDescription>
                    Permanently delete all selected rules
                  </OperationDescription>
                </div>
              </OperationButton>
            </OperationSelector>
          )}

          {operation === 'status' && (
            <OperationForm>
              <BackButton onClick={resetOperation}>← Back to operations</BackButton>
              
              <FormGroup>
                <Label>New Status</Label>
                <Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as RuleStatus)}
                  disabled={isProcessing}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Draft">Draft</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Archived">Archived</option>
                </Select>
              </FormGroup>

              <RulesList>
                <RulesListTitle>Rules to update:</RulesListTitle>
                {selectedRules.map(rule => (
                  <RuleItem key={rule.id}>
                    <RuleName>{rule.name}</RuleName>
                    <RuleCurrentStatus>{rule.status}</RuleCurrentStatus>
                    <Arrow>→</Arrow>
                    <RuleNewStatus>{selectedStatus}</RuleNewStatus>
                  </RuleItem>
                ))}
              </RulesList>

              <ActionButtons>
                <CancelButton onClick={onClose} disabled={isProcessing}>
                  Cancel
                </CancelButton>
                <ConfirmButton onClick={handleStatusUpdate} disabled={isProcessing}>
                  {isProcessing ? 'Updating...' : `Update ${selectedRules.length} Rule${selectedRules.length !== 1 ? 's' : ''}`}
                </ConfirmButton>
              </ActionButtons>
            </OperationForm>
          )}

          {operation === 'delete' && (
            <OperationForm>
              <BackButton onClick={resetOperation}>← Back to operations</BackButton>
              
              <WarningBox>
                <ExclamationTriangleIcon />
                <div>
                  <WarningTitle>Warning: This action cannot be undone</WarningTitle>
                  <WarningText>
                    You are about to permanently delete {selectedRules.length} rule{selectedRules.length !== 1 ? 's' : ''}.
                    This will remove all rule data from the system.
                  </WarningText>
                </div>
              </WarningBox>

              <RulesList>
                <RulesListTitle>Rules to delete:</RulesListTitle>
                {selectedRules.map(rule => (
                  <RuleItem key={rule.id}>
                    <RuleName>{rule.name}</RuleName>
                    <RuleCurrentStatus>{rule.status}</RuleCurrentStatus>
                  </RuleItem>
                ))}
              </RulesList>

              <ActionButtons>
                <CancelButton onClick={onClose} disabled={isProcessing}>
                  Cancel
                </CancelButton>
                <DeleteButton onClick={handleBulkDelete} disabled={isProcessing}>
                  {isProcessing ? 'Deleting...' : `Delete ${selectedRules.length} Rule${selectedRules.length !== 1 ? 's' : ''}`}
                </DeleteButton>
              </ActionButtons>
            </OperationForm>
          )}
        </ModalContent>
      </Modal>
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
  padding: 20px;
`;

const Modal = styled.div`
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
`;

const ModalTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    background: #f1f5f9;
    color: #1e293b;
  }
`;

const ModalContent = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

const SelectionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 12px;
  color: #6366f1;
  font-weight: 600;
  margin-bottom: 24px;

  svg {
    width: 24px;
    height: 24px;
  }
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  color: #ef4444;
  font-weight: 500;
  margin-bottom: 24px;

  svg {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
  }
`;

const OperationSelector = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const OperationButton = styled.button`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  svg {
    width: 32px;
    height: 32px;
    color: #6366f1;
    flex-shrink: 0;
  }

  &:hover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.05);
  }

  &.danger svg {
    color: #ef4444;
  }

  &.danger:hover {
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.05);
  }
`;

const OperationTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
`;

const OperationDescription = styled.div`
  font-size: 14px;
  color: #64748b;
`;

const OperationForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const BackButton = styled.button`
  align-self: flex-start;
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #334155;
`;

const Select = styled.select`
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #1e293b;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RulesList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
`;

const RulesListTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const RuleItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: #f8fafc;
  border-radius: 6px;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const RuleName = styled.div`
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
`;

const RuleCurrentStatus = styled.div`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: #e2e8f0;
  color: #64748b;
`;

const Arrow = styled.div`
  color: #94a3b8;
  font-weight: bold;
`;

const RuleNewStatus = styled.div`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
`;

const WarningBox = styled.div`
  display: flex;
  gap: 16px;
  padding: 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;

  svg {
    width: 24px;
    height: 24px;
    color: #ef4444;
    flex-shrink: 0;
  }
`;

const WarningTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #ef4444;
  margin-bottom: 4px;
`;

const WarningText = styled.div`
  font-size: 13px;
  color: #dc2626;
  line-height: 1.5;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
`;

const CancelButton = styled.button`
  padding: 12px 24px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #64748b;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: #cbd5e1;
    background: #f8fafc;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ConfirmButton = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DeleteButton = styled(ConfirmButton)`
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);

  &:hover:not(:disabled) {
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  }
`;

export default BulkRuleOperations;

