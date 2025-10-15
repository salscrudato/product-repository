/**
 * EndorsementMetadataSection Component
 * Section for managing endorsement-specific metadata
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { EndorsementType } from '../../types';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface EndorsementMetadataSectionProps {
  modifiesCoverageId?: string;
  endorsementType?: EndorsementType;
  supersedes?: string[];
  onChange: (data: {
    modifiesCoverageId?: string;
    endorsementType?: EndorsementType;
    supersedes?: string[];
  }) => void;
}

export const EndorsementMetadataSection: React.FC<EndorsementMetadataSectionProps> = ({
  modifiesCoverageId,
  endorsementType,
  supersedes = [],
  onChange,
}) => {
  const [newSupersedes, setNewSupersedes] = useState('');

  const handleTypeChange = (type: EndorsementType) => {
    onChange({
      modifiesCoverageId,
      endorsementType: type,
      supersedes,
    });
  };

  const handleModifiesChange = (coverageId: string) => {
    onChange({
      modifiesCoverageId: coverageId,
      endorsementType,
      supersedes,
    });
  };

  const handleAddSupersedes = () => {
    if (newSupersedes.trim() && !supersedes.includes(newSupersedes.trim())) {
      onChange({
        modifiesCoverageId,
        endorsementType,
        supersedes: [...supersedes, newSupersedes.trim()],
      });
      setNewSupersedes('');
    }
  };

  const handleRemoveSupersedes = (index: number) => {
    onChange({
      modifiesCoverageId,
      endorsementType,
      supersedes: supersedes.filter((_, i) => i !== index),
    });
  };

  return (
    <Container>
      <SectionTitle>Endorsement Metadata</SectionTitle>
      <HelpText>
        Configure endorsement-specific information for coverage modifications
      </HelpText>

      {/* Endorsement Type */}
      <SubSection>
        <SubTitle>Endorsement Type</SubTitle>
        <SubHelpText>
          How this endorsement modifies the base coverage
        </SubHelpText>

        <Select
          value={endorsementType || ''}
          onChange={(e) => handleTypeChange(e.target.value as EndorsementType)}
        >
          <option value="">Select endorsement type...</option>
          <option value="broadening">Broadening - Expands coverage</option>
          <option value="restrictive">Restrictive - Limits coverage</option>
          <option value="clarifying">Clarifying - Clarifies terms</option>
          <option value="additional">Additional - Adds new coverage</option>
        </Select>

        {endorsementType && (
          <InfoBox type={endorsementType}>
            <InfoTitle>
              {endorsementType === 'broadening' && '✓ Broadening Endorsement'}
              {endorsementType === 'restrictive' && '⚠️ Restrictive Endorsement'}
              {endorsementType === 'clarifying' && 'ℹ️ Clarifying Endorsement'}
              {endorsementType === 'additional' && '+ Additional Coverage'}
            </InfoTitle>
            <InfoText>
              {endorsementType === 'broadening' && 'This endorsement expands the scope of coverage beyond the base policy.'}
              {endorsementType === 'restrictive' && 'This endorsement limits or restricts coverage from the base policy.'}
              {endorsementType === 'clarifying' && 'This endorsement clarifies policy terms without changing coverage scope.'}
              {endorsementType === 'additional' && 'This endorsement adds entirely new coverage not in the base policy.'}
            </InfoText>
          </InfoBox>
        )}
      </SubSection>

      {/* Modifies Coverage */}
      <SubSection>
        <SubTitle>Modifies Coverage</SubTitle>
        <SubHelpText>
          The base coverage that this endorsement modifies (if applicable)
        </SubHelpText>

        <Input
          type="text"
          placeholder="Enter coverage ID or name"
          value={modifiesCoverageId || ''}
          onChange={(e) => handleModifiesChange(e.target.value)}
        />

        {modifiesCoverageId && (
          <InfoBox type="info">
            <InfoText>
              This endorsement modifies: <strong>{modifiesCoverageId}</strong>
            </InfoText>
          </InfoBox>
        )}
      </SubSection>

      {/* Supersedes */}
      <SubSection>
        <SubTitle>Supersedes</SubTitle>
        <SubHelpText>
          Previous endorsements or forms that this endorsement replaces
        </SubHelpText>

        <SupersedesList>
          {supersedes.map((item, index) => (
            <SupersedesItem key={index}>
              <SupersedesName>{item}</SupersedesName>
              <RemoveButton onClick={() => handleRemoveSupersedes(index)}>
                <TrashIcon style={{ width: 16, height: 16 }} />
              </RemoveButton>
            </SupersedesItem>
          ))}
        </SupersedesList>

        <AddRow>
          <AddInput
            type="text"
            placeholder="Enter form number or endorsement name"
            value={newSupersedes}
            onChange={(e) => setNewSupersedes(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddSupersedes()}
          />
          <AddButton onClick={handleAddSupersedes}>
            <PlusIcon style={{ width: 20, height: 20 }} />
            Add
          </AddButton>
        </AddRow>

        {supersedes.length > 0 && (
          <InfoBox type="warning">
            <InfoText>
              This endorsement supersedes {supersedes.length} previous {supersedes.length === 1 ? 'form' : 'forms'}.
              The superseded forms should not be used when this endorsement is in effect.
            </InfoText>
          </InfoBox>
        )}
      </SubSection>

      {/* Usage Notes */}
      <SubSection>
        <SubTitle>Endorsement Usage Notes</SubTitle>
        <NotesList>
          <NoteItem>
            <NoteIcon>📋</NoteIcon>
            <NoteText>
              <strong>Effective Date:</strong> Endorsements typically take effect on the policy effective date or renewal date
            </NoteText>
          </NoteItem>
          <NoteItem>
            <NoteIcon>📝</NoteIcon>
            <NoteText>
              <strong>Premium Impact:</strong> Broadening endorsements usually increase premium, restrictive ones may decrease it
            </NoteText>
          </NoteItem>
          <NoteItem>
            <NoteIcon>⚖️</NoteIcon>
            <NoteText>
              <strong>Conflicts:</strong> If endorsements conflict, the most recent endorsement typically takes precedence
            </NoteText>
          </NoteItem>
        </NotesList>
      </SubSection>
    </Container>
  );
};

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

const Select = styled.select`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #111827;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
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

const InfoBox = styled.div<{ type?: string }>`
  background: ${props => {
    if (props.type === 'broadening') return '#d1fae5';
    if (props.type === 'restrictive') return '#fee2e2';
    if (props.type === 'clarifying') return '#dbeafe';
    if (props.type === 'additional') return '#e0e7ff';
    if (props.type === 'warning') return '#fef3c7';
    return '#f3f4f6';
  }};
  border: 1px solid ${props => {
    if (props.type === 'broadening') return '#6ee7b7';
    if (props.type === 'restrictive') return '#fecaca';
    if (props.type === 'clarifying') return '#bfdbfe';
    if (props.type === 'additional') return '#c7d2fe';
    if (props.type === 'warning') return '#fbbf24';
    return '#e5e7eb';
  }};
  border-radius: 6px;
  padding: 12px;
`;

const InfoTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
`;

const InfoText = styled.div`
  font-size: 13px;
  color: #374151;
  line-height: 1.5;

  strong {
    font-weight: 600;
  }
`;

const SupersedesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SupersedesItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
`;

const SupersedesName = styled.div`
  font-size: 14px;
  color: #374151;
  font-weight: 500;
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

const NotesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const NoteItem = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
`;

const NoteIcon = styled.div`
  font-size: 24px;
  flex-shrink: 0;
`;

const NoteText = styled.div`
  font-size: 13px;
  color: #374151;
  line-height: 1.6;

  strong {
    color: #111827;
    font-weight: 600;
  }
`;

