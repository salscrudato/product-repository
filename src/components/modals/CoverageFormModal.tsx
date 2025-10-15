/**
 * CoverageFormModal Component
 * Comprehensive form for creating/editing coverages with all Phase 1-2 fields
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Coverage } from '../../types';
import { validateCoverage, formatValidationErrors } from '../../utils/coverageValidation';
import { CoverageTriggerSelector } from '../selectors/CoverageTriggerSelector';
import { WaitingPeriodInput } from '../inputs/WaitingPeriodInput';
import { ValuationMethodSelector } from '../selectors/ValuationMethodSelector';
import { CoinsuranceInput } from '../inputs/CoinsuranceInput';
import { DepreciationMethodSelector } from '../selectors/DepreciationMethodSelector';
import { UnderwritingSection } from '../sections/UnderwritingSection';
import { ClaimsSection } from '../sections/ClaimsSection';
import { TerritorySelector } from '../selectors/TerritorySelector';
import { EndorsementMetadataSection } from '../sections/EndorsementMetadataSection';

interface CoverageFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  coverage?: Partial<Coverage>;
  onSave: (coverage: Partial<Coverage>) => Promise<void>;
  title?: string;
}

export const CoverageFormModal: React.FC<CoverageFormModalProps> = ({
  isOpen,
  onClose,
  coverage,
  onSave,
  title = 'Coverage Details',
}) => {
  const [formData, setFormData] = useState<Partial<Coverage>>(coverage || {});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'triggers' | 'valuation' | 'underwriting' | 'claims' | 'territory'>('basic');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (coverage) {
      setFormData(coverage);
    }
  }, [coverage]);

  if (!isOpen) return null;

  const handleSave = async () => {
    // Validate before saving
    const validationResult = validateCoverage(formData);

    if (!validationResult.isValid) {
      setValidationErrors(validationResult.errors.map(e => e.message));
      setValidationWarnings(validationResult.warnings.map(w => w.message));
      alert('Please fix validation errors before saving:\n\n' + formatValidationErrors(validationResult));
      return;
    }

    // Show warnings but allow save
    if (validationResult.warnings.length > 0) {
      setValidationWarnings(validationResult.warnings.map(w => w.message));
      const proceed = window.confirm(
        'There are warnings about this coverage:\n\n' +
        validationResult.warnings.map(w => `• ${w.message}`).join('\n') +
        '\n\nDo you want to proceed anyway?'
      );
      if (!proceed) return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error: any) {
      alert('Failed to save coverage: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof Coverage, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation errors when user makes changes
    setValidationErrors([]);
    setValidationWarnings([]);
  };

  return (
    <Overlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>{title}</Title>
          <CloseButton onClick={onClose}>
            <XMarkIcon style={{ width: 24, height: 24 }} />
          </CloseButton>
        </Header>

        <TabBar>
          <Tab active={activeTab === 'basic'} onClick={() => setActiveTab('basic')}>
            Basic Info
          </Tab>
          <Tab active={activeTab === 'triggers'} onClick={() => setActiveTab('triggers')}>
            Triggers & Periods
          </Tab>
          <Tab active={activeTab === 'valuation'} onClick={() => setActiveTab('valuation')}>
            Valuation & Coinsurance
          </Tab>
          <Tab active={activeTab === 'underwriting'} onClick={() => setActiveTab('underwriting')}>
            Underwriting
          </Tab>
          <Tab active={activeTab === 'claims'} onClick={() => setActiveTab('claims')}>
            Claims
          </Tab>
          <Tab active={activeTab === 'territory'} onClick={() => setActiveTab('territory')}>
            Territory & Endorsements
          </Tab>
        </TabBar>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <ValidationErrorBox>
            <ValidationErrorTitle>⚠️ Validation Errors</ValidationErrorTitle>
            {validationErrors.map((error, index) => (
              <ValidationErrorItem key={index}>• {error}</ValidationErrorItem>
            ))}
          </ValidationErrorBox>
        )}

        {/* Validation Warnings */}
        {validationWarnings.length > 0 && validationErrors.length === 0 && (
          <ValidationWarningBox>
            <ValidationWarningTitle>ℹ️ Warnings</ValidationWarningTitle>
            {validationWarnings.map((warning, index) => (
              <ValidationWarningItem key={index}>• {warning}</ValidationWarningItem>
            ))}
          </ValidationWarningBox>
        )}

        <Content>
          {activeTab === 'basic' && (
            <Section>
              <SectionTitle>Basic Information</SectionTitle>
              
              <FormGroup>
                <Label>Coverage Name *</Label>
                <Input
                  type="text"
                  placeholder="Enter coverage name"
                  value={formData.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </FormGroup>

              <FormGroup>
                <Label>Coverage Code</Label>
                <Input
                  type="text"
                  placeholder="Enter coverage code"
                  value={formData.coverageCode || ''}
                  onChange={(e) => updateField('coverageCode', e.target.value)}
                />
              </FormGroup>

              <FormGroup>
                <Label>Description</Label>
                <TextArea
                  placeholder="Enter coverage description"
                  value={formData.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={4}
                />
              </FormGroup>

              <FormGroup>
                <Label>Category</Label>
                <Input
                  type="text"
                  placeholder="e.g., Property, Liability, Auto"
                  value={formData.category || ''}
                  onChange={(e) => updateField('category', e.target.value)}
                />
              </FormGroup>

              <FormGroup>
                <Label>Base Premium</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter base premium amount"
                  value={formData.basePremium || ''}
                  onChange={(e) => updateField('basePremium', parseFloat(e.target.value) || undefined)}
                />
              </FormGroup>
            </Section>
          )}

          {activeTab === 'triggers' && (
            <Section>
              <SectionTitle>Coverage Triggers & Periods</SectionTitle>
              
              <FormGroup>
                <CoverageTriggerSelector
                  value={formData.coverageTrigger}
                  onChange={(trigger) => updateField('coverageTrigger', trigger)}
                />
              </FormGroup>

              <FormGroup>
                <WaitingPeriodInput
                  value={formData.waitingPeriod}
                  unit={formData.waitingPeriodUnit}
                  onChange={(value, unit) => {
                    updateField('waitingPeriod', value);
                    updateField('waitingPeriodUnit', unit);
                  }}
                />
              </FormGroup>

              {formData.coverageTrigger === 'claimsMade' && (
                <FormGroup>
                  <Label>Claims Reporting Period (days)</Label>
                  <HelpText>
                    Extended reporting period after policy expiration for claims-made coverage
                  </HelpText>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g., 60, 90, 180"
                    value={formData.claimsReportingPeriod || ''}
                    onChange={(e) => updateField('claimsReportingPeriod', parseInt(e.target.value) || undefined)}
                  />
                </FormGroup>
              )}
            </Section>
          )}

          {activeTab === 'valuation' && (
            <Section>
              <SectionTitle>Valuation & Coinsurance</SectionTitle>
              
              <FormGroup>
                <ValuationMethodSelector
                  value={formData.valuationMethod}
                  onChange={(method) => updateField('valuationMethod', method)}
                />
              </FormGroup>

              {formData.valuationMethod === 'ACV' && (
                <FormGroup>
                  <DepreciationMethodSelector
                    value={formData.depreciationMethod}
                    onChange={(method) => updateField('depreciationMethod', method)}
                  />
                </FormGroup>
              )}

              <FormGroup>
                <CoinsuranceInput
                  percentage={formData.coinsurancePercentage}
                  hasPenalty={formData.hasCoinsurancePenalty}
                  onChange={(percentage, hasPenalty) => {
                    updateField('coinsurancePercentage', percentage);
                    updateField('hasCoinsurancePenalty', hasPenalty);
                  }}
                />
              </FormGroup>

              <FormGroup>
                <CheckboxRow>
                  <Checkbox
                    type="checkbox"
                    checked={formData.hasSubrogationRights || false}
                    onChange={(e) => updateField('hasSubrogationRights', e.target.checked)}
                  />
                  <CheckboxLabel>Insurer has subrogation rights</CheckboxLabel>
                </CheckboxRow>
                <HelpText>
                  Allows insurer to pursue recovery from third parties responsible for the loss
                </HelpText>
              </FormGroup>
            </Section>
          )}

          {activeTab === 'underwriting' && (
            <Section>
              <UnderwritingSection
                requiresUnderwriterApproval={formData.requiresUnderwriterApproval}
                eligibilityCriteria={formData.eligibilityCriteria}
                requiredCoverages={formData.requiredCoverages}
                incompatibleCoverages={formData.incompatibleCoverages}
                onChange={(data) => {
                  setFormData(prev => ({ ...prev, ...data }));
                }}
              />
            </Section>
          )}

          {activeTab === 'claims' && (
            <Section>
              <ClaimsSection
                claimsReportingPeriod={formData.claimsReportingPeriod}
                hasSubrogationRights={formData.hasSubrogationRights}
                onChange={(data) => {
                  setFormData(prev => ({ ...prev, ...data }));
                }}
              />
            </Section>
          )}

          {activeTab === 'territory' && (
            <Section>
              <SectionTitle>Territory & Endorsements</SectionTitle>

              {/* Territory Selector */}
              <FormGroup>
                <TerritorySelector
                  territoryType={formData.territoryType}
                  includedTerritories={formData.includedTerritories}
                  excludedTerritories={formData.excludedTerritories}
                  onChange={(data) => {
                    setFormData(prev => ({ ...prev, ...data }));
                  }}
                />
              </FormGroup>

              {/* Endorsement Metadata */}
              {formData.category === 'Endorsement Coverage' && (
                <FormGroup>
                  <EndorsementMetadataSection
                    modifiesCoverageId={formData.modifiesCoverageId}
                    endorsementType={formData.endorsementType}
                    supersedes={formData.supersedes}
                    onChange={(data) => {
                      setFormData(prev => ({ ...prev, ...data }));
                    }}
                  />
                </FormGroup>
              )}

              {formData.category !== 'Endorsement Coverage' && (
                <InfoBox>
                  <InfoText>
                    ℹ️ Endorsement metadata is only available for coverages with category "Endorsement Coverage".
                    Change the category in the Basic Info tab to enable endorsement features.
                  </InfoText>
                </InfoBox>
              )}
            </Section>
          )}
        </Content>

        <Footer>
          <CancelButton onClick={onClose} disabled={saving}>
            Cancel
          </CancelButton>
          <SaveButton onClick={handleSave} disabled={saving || !formData.name}>
            {saving ? 'Saving...' : 'Save Coverage'}
          </SaveButton>
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
  max-width: 800px;
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

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 24px;
`;

const Tab = styled.button<{ active?: boolean }>`
  padding: 12px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.active ? '#3b82f6' : 'transparent'};
  color: ${props => props.active ? '#3b82f6' : '#6b7280'};
  font-size: 14px;
  font-weight: ${props => props.active ? '600' : '500'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #3b82f6;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #374151;
`;

const HelpText = styled.span`
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
`;

const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #111827;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const TextArea = styled.textarea`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #111827;
  resize: vertical;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const CheckboxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
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

const InfoBox = styled.div`
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 12px;
`;

const InfoText = styled.div`
  font-size: 13px;
  color: #1e3a8a;
  line-height: 1.5;
`;

const ValidationErrorBox = styled.div`
  background: #fef2f2;
  border: 2px solid #dc2626;
  border-radius: 6px;
  padding: 16px;
  margin: 0 24px;
`;

const ValidationErrorTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #991b1b;
  margin-bottom: 8px;
`;

const ValidationErrorItem = styled.div`
  font-size: 13px;
  color: #7f1d1d;
  margin-bottom: 4px;
`;

const ValidationWarningBox = styled.div`
  background: #fef3c7;
  border: 2px solid #f59e0b;
  border-radius: 6px;
  padding: 16px;
  margin: 0 24px;
`;

const ValidationWarningTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 8px;
`;

const ValidationWarningItem = styled.div`
  font-size: 13px;
  color: #78350f;
  margin-bottom: 4px;
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
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #4b5563;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

  &:hover:not(:disabled) {
    background: #059669;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

