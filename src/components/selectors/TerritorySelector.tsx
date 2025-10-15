/**
 * TerritorySelector Component
 * Selector for coverage territory with included/excluded territories
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { TerritoryType } from '../../types';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface TerritorySelectorProps {
  territoryType?: TerritoryType;
  includedTerritories?: string[];
  excludedTerritories?: string[];
  onChange: (data: {
    territoryType?: TerritoryType;
    includedTerritories?: string[];
    excludedTerritories?: string[];
  }) => void;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export const TerritorySelector: React.FC<TerritorySelectorProps> = ({
  territoryType = 'USA',
  includedTerritories = [],
  excludedTerritories = [],
  onChange,
}) => {
  const [newIncluded, setNewIncluded] = useState('');
  const [newExcluded, setNewExcluded] = useState('');

  const handleTypeChange = (type: TerritoryType) => {
    onChange({
      territoryType: type,
      includedTerritories,
      excludedTerritories,
    });
  };

  const handleAddIncluded = () => {
    if (newIncluded.trim() && !includedTerritories.includes(newIncluded.trim())) {
      onChange({
        territoryType,
        includedTerritories: [...includedTerritories, newIncluded.trim()],
        excludedTerritories,
      });
      setNewIncluded('');
    }
  };

  const handleRemoveIncluded = (index: number) => {
    onChange({
      territoryType,
      includedTerritories: includedTerritories.filter((_, i) => i !== index),
      excludedTerritories,
    });
  };

  const handleAddExcluded = () => {
    if (newExcluded.trim() && !excludedTerritories.includes(newExcluded.trim())) {
      onChange({
        territoryType,
        includedTerritories,
        excludedTerritories: [...excludedTerritories, newExcluded.trim()],
      });
      setNewExcluded('');
    }
  };

  const handleRemoveExcluded = (index: number) => {
    onChange({
      territoryType,
      includedTerritories,
      excludedTerritories: excludedTerritories.filter((_, i) => i !== index),
    });
  };

  return (
    <Container>
      <Label>Coverage Territory</Label>
      <HelpText>
        Define the geographic scope of coverage
      </HelpText>

      <FormGroup>
        <Select value={territoryType} onChange={(e) => handleTypeChange(e.target.value as TerritoryType)}>
          <option value="worldwide">Worldwide</option>
          <option value="USA">United States</option>
          <option value="stateSpecific">State-Specific</option>
          <option value="custom">Custom Territory</option>
        </Select>
      </FormGroup>

      {territoryType === 'worldwide' && (
        <InfoBox>
          <InfoText>
            Coverage applies worldwide with no geographic restrictions.
          </InfoText>
        </InfoBox>
      )}

      {territoryType === 'USA' && (
        <InfoBox>
          <InfoText>
            Coverage applies to all 50 United States, District of Columbia, and U.S. territories.
          </InfoText>
        </InfoBox>
      )}

      {(territoryType === 'stateSpecific' || territoryType === 'custom') && (
        <>
          {/* Included Territories */}
          <SubSection>
            <SubTitle>Included Territories</SubTitle>
            <SubHelpText>
              Territories where coverage applies
            </SubHelpText>

            <TerritoryList>
              {includedTerritories.map((territory, index) => (
                <TerritoryItem key={index}>
                  <TerritoryName>{territory}</TerritoryName>
                  <RemoveButton onClick={() => handleRemoveIncluded(index)}>
                    <TrashIcon style={{ width: 16, height: 16 }} />
                  </RemoveButton>
                </TerritoryItem>
              ))}
            </TerritoryList>

            <AddRow>
              {territoryType === 'stateSpecific' ? (
                <StateSelect
                  value={newIncluded}
                  onChange={(e) => setNewIncluded(e.target.value)}
                >
                  <option value="">Select state...</option>
                  {US_STATES.filter(state => !includedTerritories.includes(state)).map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </StateSelect>
              ) : (
                <AddInput
                  type="text"
                  placeholder="Enter territory (e.g., Canada, Mexico)"
                  value={newIncluded}
                  onChange={(e) => setNewIncluded(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddIncluded()}
                />
              )}
              <AddButton onClick={handleAddIncluded}>
                <PlusIcon style={{ width: 20, height: 20 }} />
                Add
              </AddButton>
            </AddRow>
          </SubSection>

          {/* Excluded Territories */}
          <SubSection>
            <SubTitle>Excluded Territories</SubTitle>
            <SubHelpText>
              Territories where coverage does not apply
            </SubHelpText>

            <TerritoryList>
              {excludedTerritories.map((territory, index) => (
                <TerritoryItem key={index} excluded>
                  <TerritoryName>{territory}</TerritoryName>
                  <RemoveButton onClick={() => handleRemoveExcluded(index)}>
                    <TrashIcon style={{ width: 16, height: 16 }} />
                  </RemoveButton>
                </TerritoryItem>
              ))}
            </TerritoryList>

            <AddRow>
              {territoryType === 'stateSpecific' ? (
                <StateSelect
                  value={newExcluded}
                  onChange={(e) => setNewExcluded(e.target.value)}
                >
                  <option value="">Select state...</option>
                  {US_STATES.filter(state => !excludedTerritories.includes(state)).map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </StateSelect>
              ) : (
                <AddInput
                  type="text"
                  placeholder="Enter territory to exclude"
                  value={newExcluded}
                  onChange={(e) => setNewExcluded(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddExcluded()}
                />
              )}
              <AddButton onClick={handleAddExcluded}>
                <PlusIcon style={{ width: 20, height: 20 }} />
                Add
              </AddButton>
            </AddRow>
          </SubSection>
        </>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  margin-top: -8px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
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

const InfoBox = styled.div`
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 12px;
`;

const InfoText = styled.div`
  font-size: 13px;
  color: #1e3a8a;
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
  margin-top: -8px;
`;

const TerritoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TerritoryItem = styled.div<{ excluded?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  background: ${props => props.excluded ? '#fef2f2' : 'white'};
  border: 1px solid ${props => props.excluded ? '#fecaca' : '#e5e7eb'};
  border-radius: 6px;
`;

const TerritoryName = styled.div`
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

const StateSelect = styled.select`
  flex: 1;
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

