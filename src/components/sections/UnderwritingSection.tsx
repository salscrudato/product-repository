/**
 * UnderwritingSection Component
 * Section for managing underwriting requirements and eligibility criteria
 *
 * Supports both canonical (underwriterApprovalType) and legacy (requiresUnderwriterApproval) fields
 */

import React, { useState, memo, useCallback } from 'react';
import styled from 'styled-components';
import { PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { UnderwriterApprovalType } from '../../types';
import { UnderwritingApprovalSelector } from '../selectors/UnderwritingApprovalSelector';

interface UnderwritingSectionProps {
  // Canonical field (preferred)
  underwriterApprovalType?: UnderwriterApprovalType;
  // Legacy field (for backward compatibility)
  requiresUnderwriterApproval?: boolean;
  eligibilityCriteria?: string[];
  prohibitedClasses?: string[];
  underwritingGuidelines?: string;
  requiredCoverages?: string[];
  incompatibleCoverages?: string[];
  onChange: (data: {
    underwriterApprovalType?: UnderwriterApprovalType;
    requiresUnderwriterApproval?: boolean;
    eligibilityCriteria?: string[];
    prohibitedClasses?: string[];
    underwritingGuidelines?: string;
    requiredCoverages?: string[];
    incompatibleCoverages?: string[];
  }) => void;
}

export const UnderwritingSection = memo<UnderwritingSectionProps>(({
  underwriterApprovalType,
  requiresUnderwriterApproval = false,
  eligibilityCriteria = [],
  prohibitedClasses = [],
  underwritingGuidelines = '',
  requiredCoverages = [],
  incompatibleCoverages = [],
  onChange,
}) => {
  const [newCriterion, setNewCriterion] = useState('');
  const [newProhibited, setNewProhibited] = useState('');
  const [newRequired, setNewRequired] = useState('');
  const [newIncompatible, setNewIncompatible] = useState('');

  // Derive effective approval type from canonical or legacy field
  const effectiveApprovalType: UnderwriterApprovalType =
    underwriterApprovalType || (requiresUnderwriterApproval ? 'required' : 'not_required');

  // Handle approval type change (updates both canonical and legacy)
  const handleApprovalTypeChange = useCallback((type: UnderwriterApprovalType) => {
    onChange({
      underwriterApprovalType: type,
      requiresUnderwriterApproval: type === 'required' || type === 'conditional',
      eligibilityCriteria,
      prohibitedClasses,
      underwritingGuidelines,
      requiredCoverages,
      incompatibleCoverages,
    });
  }, [onChange, eligibilityCriteria, prohibitedClasses, underwritingGuidelines, requiredCoverages, incompatibleCoverages]);

  const handleAddCriterion = useCallback(() => {
    if (newCriterion.trim()) {
      onChange({
        underwriterApprovalType: effectiveApprovalType,
        requiresUnderwriterApproval: effectiveApprovalType === 'required' || effectiveApprovalType === 'conditional',
        eligibilityCriteria: [...eligibilityCriteria, newCriterion.trim()],
        prohibitedClasses,
        underwritingGuidelines,
        requiredCoverages,
        incompatibleCoverages,
      });
      setNewCriterion('');
    }
  }, [onChange, newCriterion, effectiveApprovalType, eligibilityCriteria, prohibitedClasses, underwritingGuidelines, requiredCoverages, incompatibleCoverages]);

  const handleRemoveCriterion = useCallback((index: number) => {
    onChange({
      underwriterApprovalType: effectiveApprovalType,
      requiresUnderwriterApproval: effectiveApprovalType === 'required' || effectiveApprovalType === 'conditional',
      eligibilityCriteria: eligibilityCriteria.filter((_, i) => i !== index),
      prohibitedClasses,
      underwritingGuidelines,
      requiredCoverages,
      incompatibleCoverages,
    });
  }, [onChange, effectiveApprovalType, eligibilityCriteria, prohibitedClasses, underwritingGuidelines, requiredCoverages, incompatibleCoverages]);

  const handleAddProhibited = useCallback(() => {
    if (newProhibited.trim()) {
      onChange({
        underwriterApprovalType: effectiveApprovalType,
        requiresUnderwriterApproval: effectiveApprovalType === 'required' || effectiveApprovalType === 'conditional',
        eligibilityCriteria,
        prohibitedClasses: [...prohibitedClasses, newProhibited.trim()],
        underwritingGuidelines,
        requiredCoverages,
        incompatibleCoverages,
      });
      setNewProhibited('');
    }
  }, [onChange, newProhibited, effectiveApprovalType, eligibilityCriteria, prohibitedClasses, underwritingGuidelines, requiredCoverages, incompatibleCoverages]);

  const handleRemoveProhibited = useCallback((index: number) => {
    onChange({
      underwriterApprovalType: effectiveApprovalType,
      requiresUnderwriterApproval: effectiveApprovalType === 'required' || effectiveApprovalType === 'conditional',
      eligibilityCriteria,
      prohibitedClasses: prohibitedClasses.filter((_, i) => i !== index),
      underwritingGuidelines,
      requiredCoverages,
      incompatibleCoverages,
    });
  }, [onChange, effectiveApprovalType, eligibilityCriteria, prohibitedClasses, underwritingGuidelines, requiredCoverages, incompatibleCoverages]);

  const handleGuidelinesChange = useCallback((value: string) => {
    onChange({
      underwriterApprovalType: effectiveApprovalType,
      requiresUnderwriterApproval: effectiveApprovalType === 'required' || effectiveApprovalType === 'conditional',
      eligibilityCriteria,
      prohibitedClasses,
      underwritingGuidelines: value,
      requiredCoverages,
      incompatibleCoverages,
    });
  }, [onChange, effectiveApprovalType, eligibilityCriteria, prohibitedClasses, requiredCoverages, incompatibleCoverages]);

  const handleAddRequired = useCallback(() => {
    if (newRequired.trim()) {
      onChange({
        underwriterApprovalType: effectiveApprovalType,
        requiresUnderwriterApproval: effectiveApprovalType === 'required' || effectiveApprovalType === 'conditional',
        eligibilityCriteria,
        prohibitedClasses,
        underwritingGuidelines,
        requiredCoverages: [...requiredCoverages, newRequired.trim()],
        incompatibleCoverages,
      });
      setNewRequired('');
    }
  }, [onChange, newRequired, effectiveApprovalType, eligibilityCriteria, prohibitedClasses, underwritingGuidelines, requiredCoverages, incompatibleCoverages]);

  const handleRemoveRequired = useCallback((index: number) => {
    onChange({
      underwriterApprovalType: effectiveApprovalType,
      requiresUnderwriterApproval: effectiveApprovalType === 'required' || effectiveApprovalType === 'conditional',
      eligibilityCriteria,
      prohibitedClasses,
      underwritingGuidelines,
      requiredCoverages: requiredCoverages.filter((_, i) => i !== index),
      incompatibleCoverages,
    });
  }, [onChange, effectiveApprovalType, eligibilityCriteria, prohibitedClasses, underwritingGuidelines, requiredCoverages, incompatibleCoverages]);

  const handleAddIncompatible = useCallback(() => {
    if (newIncompatible.trim()) {
      onChange({
        underwriterApprovalType: effectiveApprovalType,
        requiresUnderwriterApproval: effectiveApprovalType === 'required' || effectiveApprovalType === 'conditional',
        eligibilityCriteria,
        prohibitedClasses,
        underwritingGuidelines,
        requiredCoverages,
        incompatibleCoverages: [...incompatibleCoverages, newIncompatible.trim()],
      });
      setNewIncompatible('');
    }
  }, [onChange, newIncompatible, effectiveApprovalType, eligibilityCriteria, prohibitedClasses, underwritingGuidelines, requiredCoverages, incompatibleCoverages]);

  const handleRemoveIncompatible = useCallback((index: number) => {
    onChange({
      underwriterApprovalType: effectiveApprovalType,
      requiresUnderwriterApproval: effectiveApprovalType === 'required' || effectiveApprovalType === 'conditional',
      eligibilityCriteria,
      prohibitedClasses,
      underwritingGuidelines,
      requiredCoverages,
      incompatibleCoverages: incompatibleCoverages.filter((_, i) => i !== index),
    });
  }, [onChange, effectiveApprovalType, eligibilityCriteria, prohibitedClasses, underwritingGuidelines, requiredCoverages, incompatibleCoverages]);

  return (
    <Container>
      <SectionTitle>Underwriting Requirements</SectionTitle>
      <HelpText>
        Define underwriting approval requirements, eligibility criteria, and coverage dependencies
      </HelpText>

      {/* Underwriter Approval Type - New Segmented Control */}
      <SubSection>
        <SubTitle>Underwriter Approval</SubTitle>
        <UnderwritingApprovalSelector
          value={effectiveApprovalType}
          onChange={handleApprovalTypeChange}
        />
      </SubSection>

      {/* Eligibility Criteria - Show prominently for conditional approval */}
      <SubSection>
        <SubTitle>
          Eligibility Criteria
          {effectiveApprovalType === 'conditional' && (
            <RequiredBadge>Required for Conditional</RequiredBadge>
          )}
        </SubTitle>
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

      {/* Prohibited Classes */}
      <SubSection>
        <SubTitle>Prohibited Classes</SubTitle>
        <SubHelpText>
          Business classes or risk types that cannot purchase this coverage
        </SubHelpText>

        <ItemList>
          {prohibitedClasses.map((cls, index) => (
            <ItemRow key={index}>
              <ItemIcon>
                <XCircleIcon style={{ width: 20, height: 20, color: '#ef4444' }} />
              </ItemIcon>
              <ItemText>{cls}</ItemText>
              <RemoveButton onClick={() => handleRemoveProhibited(index)}>
                <TrashIcon style={{ width: 16, height: 16 }} />
              </RemoveButton>
            </ItemRow>
          ))}
        </ItemList>

        <AddRow>
          <AddInput
            type="text"
            placeholder="e.g., Fireworks manufacturers"
            value={newProhibited}
            onChange={(e) => setNewProhibited(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddProhibited()}
          />
          <AddButton onClick={handleAddProhibited}>
            <PlusIcon style={{ width: 20, height: 20 }} />
            Add
          </AddButton>
        </AddRow>
      </SubSection>

      {/* Underwriting Guidelines */}
      <SubSection>
        <SubTitle>Underwriting Guidelines</SubTitle>
        <SubHelpText>
          Free-form notes and guidelines for underwriters reviewing this coverage
        </SubHelpText>
        <GuidelinesTextarea
          placeholder="Enter underwriting guidelines, special considerations, or notes for underwriters..."
          value={underwritingGuidelines}
          onChange={(e) => handleGuidelinesChange(e.target.value)}
          rows={4}
        />
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

const RequiredBadge = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  padding: 2px 8px;
  background: #fef3c7;
  color: #92400e;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  text-transform: uppercase;
`;

const GuidelinesTextarea = styled.textarea`
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;
