/**
 * UnderwritingSection Component
 * Section for managing underwriting requirements and eligibility criteria
 */

import React, { useState, memo, useCallback } from 'react';
import styled from 'styled-components';
import { PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface UnderwritingSectionProps {
  requiresUnderwriterApproval?: boolean;
  eligibilityCriteria?: string[];
  requiredCoverages?: string[];
  incompatibleCoverages?: string[];
  onChange: (data: {
    requiresUnderwriterApproval?: boolean;
    eligibilityCriteria?: string[];
    requiredCoverages?: string[];
    incompatibleCoverages?: string[];
  }) => void;
}

export const UnderwritingSection = memo<UnderwritingSectionProps>(({
  requiresUnderwriterApproval = false,
  eligibilityCriteria = [],
  requiredCoverages = [],
  incompatibleCoverages = [],
  onChange,
}) => {
  const [newCriterion, setNewCriterion] = useState('');
  const [newRequired, setNewRequired] = useState('');
  const [newIncompatible, setNewIncompatible] = useState('');

  // Memoized callbacks to prevent unnecessary re-renders
  const handleToggleApproval = useCallback((checked: boolean) => {
    onChange({
      requiresUnderwriterApproval: checked,
      eligibilityCriteria,
      requiredCoverages,
      incompatibleCoverages,
    });
  }, [onChange, eligibilityCriteria, requiredCoverages, incompatibleCoverages]);

  const handleAddCriterion = useCallback(() => {
    if (newCriterion.trim()) {
      onChange({
        requiresUnderwriterApproval,
        eligibilityCriteria: [...eligibilityCriteria, newCriterion.trim()],
        requiredCoverages,
        incompatibleCoverages,
      });
      setNewCriterion('');
    }
  }, [onChange, newCriterion, requiresUnderwriterApproval, eligibilityCriteria, requiredCoverages, incompatibleCoverages]);

  const handleRemoveCriterion = useCallback((index: number) => {
    onChange({
      requiresUnderwriterApproval,
      eligibilityCriteria: eligibilityCriteria.filter((_, i) => i !== index),
      requiredCoverages,
      incompatibleCoverages,
    });
  }, [onChange, requiresUnderwriterApproval, eligibilityCriteria, requiredCoverages, incompatibleCoverages]);

  const handleAddRequired = useCallback(() => {
    if (newRequired.trim()) {
      onChange({
        requiresUnderwriterApproval,
        eligibilityCriteria,
        requiredCoverages: [...requiredCoverages, newRequired.trim()],
        incompatibleCoverages,
      });
      setNewRequired('');
    }
  }, [onChange, newRequired, requiresUnderwriterApproval, eligibilityCriteria, requiredCoverages, incompatibleCoverages]);

  const handleRemoveRequired = useCallback((index: number) => {
    onChange({
      requiresUnderwriterApproval,
      eligibilityCriteria,
      requiredCoverages: requiredCoverages.filter((_, i) => i !== index),
      incompatibleCoverages,
    });
  }, [onChange, requiresUnderwriterApproval, eligibilityCriteria, requiredCoverages, incompatibleCoverages]);

  const handleAddIncompatible = useCallback(() => {
    if (newIncompatible.trim()) {
      onChange({
        requiresUnderwriterApproval,
        eligibilityCriteria,
        requiredCoverages,
        incompatibleCoverages: [...incompatibleCoverages, newIncompatible.trim()],
      });
      setNewIncompatible('');
    }
  }, [onChange, newIncompatible, requiresUnderwriterApproval, eligibilityCriteria, requiredCoverages, incompatibleCoverages]);

  const handleRemoveIncompatible = useCallback((index: number) => {
    onChange({
      requiresUnderwriterApproval,
      eligibilityCriteria,
      requiredCoverages,
      incompatibleCoverages: incompatibleCoverages.filter((_, i) => i !== index),
    });
  }, [onChange, requiresUnderwriterApproval, eligibilityCriteria, requiredCoverages, incompatibleCoverages]);

  return (
    <Container>
      <SectionTitle>Underwriting Requirements</SectionTitle>
      <HelpText>
        Define underwriting approval requirements, eligibility criteria, and coverage dependencies
      </HelpText>

      {/* Underwriter Approval */}
      <SubSection>
        <CheckboxRow>
          <Checkbox
            type="checkbox"
            checked={requiresUnderwriterApproval}
            onChange={(e) => handleToggleApproval(e.target.checked)}
          />
          <CheckboxLabel>Requires underwriter approval</CheckboxLabel>
        </CheckboxRow>
        {requiresUnderwriterApproval && (
          <InfoBox>
            <InfoText>
              This coverage requires manual underwriter review and approval before binding.
            </InfoText>
          </InfoBox>
        )}
      </SubSection>

      {/* Eligibility Criteria */}
      <SubSection>
        <SubTitle>Eligibility Criteria</SubTitle>
        <SubHelpText>
          Conditions that must be met for an insured to qualify for this coverage
        </SubHelpText>

        <ItemList>
          {eligibilityCriteria.map((criterion, index) => (
            <ItemRow key={index}>
              <ItemIcon>
                <CheckCircleIcon style={{ width: 20, height: 20, color: '#10b981' }} />
              </ItemIcon>
              <ItemText>{criterion}</ItemText>
              <RemoveButton onClick={() => handleRemoveCriterion(index)}>
                <TrashIcon style={{ width: 16, height: 16 }} />
              </RemoveButton>
            </ItemRow>
          ))}
        </ItemList>

        <AddRow>
          <AddInput
            type="text"
            placeholder="e.g., Building must have sprinkler system"
            value={newCriterion}
            onChange={(e) => setNewCriterion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCriterion()}
          />
          <AddButton onClick={handleAddCriterion}>
            <PlusIcon style={{ width: 20, height: 20 }} />
            Add
          </AddButton>
        </AddRow>
      </SubSection>

      {/* Required Coverages */}
      <SubSection>
        <SubTitle>Required Coverages</SubTitle>
        <SubHelpText>
          Other coverages that must be purchased along with this coverage
        </SubHelpText>

        <ItemList>
          {requiredCoverages.map((coverage, index) => (
            <ItemRow key={index}>
              <ItemIcon>
                <CheckCircleIcon style={{ width: 20, height: 20, color: '#3b82f6' }} />
              </ItemIcon>
              <ItemText>{coverage}</ItemText>
              <RemoveButton onClick={() => handleRemoveRequired(index)}>
                <TrashIcon style={{ width: 16, height: 16 }} />
              </RemoveButton>
            </ItemRow>
          ))}
        </ItemList>

        <AddRow>
          <AddInput
            type="text"
            placeholder="e.g., General Liability"
            value={newRequired}
            onChange={(e) => setNewRequired(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddRequired()}
          />
          <AddButton onClick={handleAddRequired}>
            <PlusIcon style={{ width: 20, height: 20 }} />
            Add
          </AddButton>
        </AddRow>
      </SubSection>

      {/* Incompatible Coverages */}
      <SubSection>
        <SubTitle>Incompatible Coverages</SubTitle>
        <SubHelpText>
          Coverages that cannot be purchased together with this coverage
        </SubHelpText>

        <ItemList>
          {incompatibleCoverages.map((coverage, index) => (
            <ItemRow key={index}>
              <ItemIcon>
                <XCircleIcon style={{ width: 20, height: 20, color: '#ef4444' }} />
              </ItemIcon>
              <ItemText>{coverage}</ItemText>
              <RemoveButton onClick={() => handleRemoveIncompatible(index)}>
                <TrashIcon style={{ width: 16, height: 16 }} />
              </RemoveButton>
            </ItemRow>
          ))}
        </ItemList>

        <AddRow>
          <AddInput
            type="text"
            placeholder="e.g., Named Perils Coverage"
            value={newIncompatible}
            onChange={(e) => setNewIncompatible(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddIncompatible()}
          />
          <AddButton onClick={handleAddIncompatible}>
            <PlusIcon style={{ width: 20, height: 20 }} />
            Add
          </AddButton>
        </AddRow>
      </SubSection>
    </Container>
  );
});

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const HelpText = styled.p`
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
  margin: -12px 0 0 0;
`;

const SubSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
`;

const SubTitle = styled.h4`
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  margin: 0;
`;

const SubHelpText = styled.span`
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
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
  font-weight: 500;
  cursor: pointer;
`;

const InfoBox = styled.div`
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 10px;
`;

const InfoText = styled.div`
  font-size: 13px;
  color: #1e3a8a;
`;

const ItemList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ItemRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
`;

const ItemIcon = styled.div`
  flex-shrink: 0;
`;

const ItemText = styled.div`
  flex: 1;
  font-size: 14px;
  color: #374151;
`;

const RemoveButton = styled.button`
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

const AddRow = styled.div`
  display: flex;
  gap: 8px;
`;

const AddInput = styled.input`
  flex: 1;
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

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
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

