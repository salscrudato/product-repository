import React, { useState } from 'react';
import styled from 'styled-components';
import { CoverageVersion, Coverage } from '@types';
import { useCoverageVersions, generateNextVersionNumber } from '@hooks/useCoverageVersions';
import { VersionHistoryTimeline } from '../version/VersionHistoryTimeline';
import { VersionComparisonView } from '../version/VersionComparisonView';
import { Timestamp } from 'firebase/firestore';
import { createVersionSnapshot, detectVersionOverlaps } from '@utils/versioningUtils';

interface VersionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  coverageId: string;
  currentCoverage: Coverage;
}

export const VersionManagementModal: React.FC<VersionManagementModalProps> = ({
  isOpen,
  onClose,
  productId,
  coverageId,
  currentCoverage,
}) => {
  const { versions, loading, createVersion, updateVersion } = useCoverageVersions(productId, coverageId);
  const [activeTab, setActiveTab] = useState<'history' | 'compare' | 'create'>('history');
  const [selectedVersion1, setSelectedVersion1] = useState<CoverageVersion | null>(null);
  const [selectedVersion2, setSelectedVersion2] = useState<CoverageVersion | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Create version form state
  const [versionNumber, setVersionNumber] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [changes, setChanges] = useState('');
  const [changedBy, setChangedBy] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [filingNumber, setFilingNumber] = useState('');
  const [stateApprovals, setStateApprovals] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateVersion = async () => {
    if (!versionNumber || !effectiveDate || !changes) {
      setError('Version number, effective date, and changes are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const newEffectiveDate = new Date(effectiveDate);
      const newExpirationDate = expirationDate ? new Date(expirationDate) : undefined;

      // Check for version date overlaps
      const overlapResult = detectVersionOverlaps(newEffectiveDate, newExpirationDate, versions);
      if (overlapResult.hasOverlap) {
        setError(overlapResult.message);
        setSaving(false);
        return;
      }

      const snapshot = createVersionSnapshot(currentCoverage);

      const newVersion: Omit<CoverageVersion, 'id'> = {
        coverageId,
        productId,
        versionNumber,
        effectiveDate: Timestamp.fromDate(newEffectiveDate),
        expirationDate: newExpirationDate ? Timestamp.fromDate(newExpirationDate) : undefined,
        changes,
        changedBy: changedBy || undefined,
        approvedBy: requiresApproval ? undefined : (approvedBy || undefined),
        regulatoryFilingNumber: filingNumber || undefined,
        stateApprovals: stateApprovals ? stateApprovals.split(',').map(s => s.trim()) : undefined,
        snapshot,
        createdAt: Timestamp.now(),
      };

      await createVersion(newVersion);

      // Reset form
      setShowCreateForm(false);
      setVersionNumber('');
      setEffectiveDate('');
      setExpirationDate('');
      setChanges('');
      setChangedBy('');
      setApprovedBy('');
      setFilingNumber('');
      setStateApprovals('');
      setRequiresApproval(false);
      setActiveTab('history');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVersionClick = (version: CoverageVersion) => {
    if (activeTab === 'compare') {
      if (!selectedVersion1) {
        setSelectedVersion1(version);
      } else if (!selectedVersion2 && version.id !== selectedVersion1.id) {
        setSelectedVersion2(version);
      } else {
        setSelectedVersion1(version);
        setSelectedVersion2(null);
      }
    }
  };

  const suggestVersionNumber = () => {
    const nextVersion = generateNextVersionNumber(versions);
    setVersionNumber(nextVersion);
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Version Management</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <TabBar>
          <Tab $active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
            Version History
          </Tab>
          <Tab $active={activeTab === 'compare'} onClick={() => setActiveTab('compare')}>
            Compare Versions
          </Tab>
          <Tab $active={activeTab === 'create'} onClick={() => setActiveTab('create')}>
            Create Version
          </Tab>
        </TabBar>

        <ModalBody>
          {loading && <LoadingMessage>Loading versions...</LoadingMessage>}

          {!loading && activeTab === 'history' && (
            <VersionHistoryTimeline 
              versions={versions}
              onVersionClick={handleVersionClick}
            />
          )}

          {!loading && activeTab === 'compare' && (
            <CompareTab>
              {!selectedVersion1 && !selectedVersion2 && (
                <Instructions>
                  Select two versions from the timeline to compare them.
                </Instructions>
              )}
              
              <VersionHistoryTimeline 
                versions={versions}
                onVersionClick={handleVersionClick}
                activeVersionId={selectedVersion1?.id || selectedVersion2?.id}
              />
              
              {selectedVersion1 && selectedVersion2 && (
                <ComparisonWrapper>
                  <VersionComparisonView 
                    version1={selectedVersion1}
                    version2={selectedVersion2}
                    onClose={() => {
                      setSelectedVersion1(null);
                      setSelectedVersion2(null);
                    }}
                  />
                </ComparisonWrapper>
              )}
            </CompareTab>
          )}

          {!loading && activeTab === 'create' && (
            <CreateForm>
              <FormTitle>Create New Version</FormTitle>
              
              {error && <ErrorMessage>{error}</ErrorMessage>}
              
              <FormRow>
                <FormGroup>
                  <Label>Version Number *</Label>
                  <InputWithButton>
                    <Input
                      type="text"
                      value={versionNumber}
                      onChange={(e) => setVersionNumber(e.target.value)}
                      placeholder="e.g., 2.0"
                    />
                    <SuggestButton onClick={suggestVersionNumber}>
                      Suggest
                    </SuggestButton>
                  </InputWithButton>
                </FormGroup>
                
                <FormGroup>
                  <Label>Effective Date *</Label>
                  <Input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                  />
                </FormGroup>
              </FormRow>

              <FormRow>
                <FormGroup>
                  <Label>Expiration Date</Label>
                  <Input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                  />
                </FormGroup>
                
                <FormGroup>
                  <Label>Filing Number</Label>
                  <Input
                    type="text"
                    value={filingNumber}
                    onChange={(e) => setFilingNumber(e.target.value)}
                    placeholder="Regulatory filing number"
                  />
                </FormGroup>
              </FormRow>

              <FormGroup>
                <Label>Changes Description *</Label>
                <TextArea
                  value={changes}
                  onChange={(e) => setChanges(e.target.value)}
                  placeholder="Describe what changed in this version..."
                  rows={4}
                />
              </FormGroup>

              <FormRow>
                <FormGroup>
                  <Label>Changed By</Label>
                  <Input
                    type="text"
                    value={changedBy}
                    onChange={(e) => setChangedBy(e.target.value)}
                    placeholder="Person who made changes"
                  />
                </FormGroup>
                
                <FormGroup>
                  <Label>Approved By</Label>
                  <Input
                    type="text"
                    value={approvedBy}
                    onChange={(e) => setApprovedBy(e.target.value)}
                    placeholder="Approver name"
                    disabled={requiresApproval}
                  />
                </FormGroup>
              </FormRow>

              <FormGroup>
                <Label>State Approvals</Label>
                <Input
                  type="text"
                  value={stateApprovals}
                  onChange={(e) => setStateApprovals(e.target.value)}
                  placeholder="Comma-separated state codes (e.g., CA, NY, TX)"
                />
              </FormGroup>

              <CheckboxGroup>
                <Checkbox
                  type="checkbox"
                  checked={requiresApproval}
                  onChange={(e) => setRequiresApproval(e.target.checked)}
                />
                <CheckboxLabel>Requires approval before activation</CheckboxLabel>
              </CheckboxGroup>

              <FormActions>
                <CancelButton onClick={() => setActiveTab('history')}>
                  Cancel
                </CancelButton>
                <SaveButton onClick={handleCreateVersion} disabled={saving}>
                  {saving ? 'Creating...' : 'Create Version'}
                </SaveButton>
              </FormActions>
            </CreateForm>
          )}
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
};

// Styled components
const ModalOverlay = styled.div`
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

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
`;

const ModalTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const CloseButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 32px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
    color: #111827;
  }
`;

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 24px;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 16px 24px;
  border: none;
  background: transparent;
  color: ${({ $active }) => $active ? '#3b82f6' : '#6b7280'};
  font-size: 15px;
  font-weight: ${({ $active }) => $active ? '600' : '500'};
  cursor: pointer;
  border-bottom: 2px solid ${({ $active }) => $active ? '#3b82f6' : 'transparent'};
  transition: all 0.2s;

  &:hover {
    color: #3b82f6;
  }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 48px;
  color: #6b7280;
  font-size: 16px;
`;

const CompareTab = styled.div``;

const Instructions = styled.div`
  padding: 16px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  color: #0c4a6e;
  font-size: 14px;
  margin-bottom: 24px;
`;

const ComparisonWrapper = styled.div`
  margin-top: 24px;
`;

const CreateForm = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const FormTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 24px 0;
`;

const ErrorMessage = styled.div`
  padding: 12px 16px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  color: #991b1b;
  font-size: 14px;
  margin-bottom: 16px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #111827;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    background: #f3f4f6;
    color: #9ca3af;
    cursor: not-allowed;
  }
`;

const InputWithButton = styled.div`
  display: flex;
  gap: 8px;
`;

const SuggestButton = styled.button`
  padding: 10px 16px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: #e5e7eb;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #111827;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s;

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
  margin-bottom: 24px;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  font-size: 14px;
  color: #374151;
  cursor: pointer;
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
`;

const CancelButton = styled.button`
  padding: 10px 20px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f9fafb;
  }
`;

const SaveButton = styled.button`
  padding: 10px 20px;
  background: #3b82f6;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #2563eb;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

