import React from 'react';
import styled from 'styled-components';
import {
  MapPinIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  CubeIcon,
  CurrencyDollarIcon,
  MapIcon,
} from '@heroicons/react/24/outline';
import type { ScenarioInputs as ScenarioInputsType } from '../../types/pricing';
import type { Coverage } from './RatingAlgorithmBuilder';

// ============================================================================
// Types
// ============================================================================

interface ScenarioInputsProps {
  inputs: ScenarioInputsType;
  onInputsChange: (inputs: ScenarioInputsType) => void;
  coverages: Coverage[];
  allStates: string[];
}

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  padding: 16px;
`;

const SectionTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  
  svg { width: 14px; height: 14px; }
`;

const InputGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldLabel = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
  
  svg { width: 12px; height: 12px; opacity: 0.7; }
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 10px;
  border: 1.5px solid rgba(226, 232, 240, 0.8);
  border-radius: 8px;
  font-size: 13px;
  color: #1e293b;
  background: rgba(248, 250, 252, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover { border-color: #cbd5e1; }
  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const NumberInput = styled.input`
  width: 100%;
  padding: 8px 10px;
  border: 1.5px solid rgba(226, 232, 240, 0.8);
  border-radius: 8px;
  font-size: 13px;
  color: #1e293b;
  background: rgba(248, 250, 252, 0.5);
  transition: all 0.2s ease;
  
  &:hover { border-color: #cbd5e1; }
  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    background: white;
  }
  
  &::placeholder { color: #94a3b8; }
  
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  -moz-appearance: textfield;
`;

const TextInput = styled.input`
  width: 100%;
  padding: 8px 10px;
  border: 1.5px solid rgba(226, 232, 240, 0.8);
  border-radius: 8px;
  font-size: 13px;
  color: #1e293b;
  background: rgba(248, 250, 252, 0.5);
  transition: all 0.2s ease;
  
  &:hover { border-color: #cbd5e1; }
  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    background: white;
  }
  
  &::placeholder { color: #94a3b8; }
`;

const Divider = styled.div`
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(226, 232, 240, 0.6), transparent);
  margin: 16px 0;
`;

const InputWithPrefix = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  
  span {
    position: absolute;
    left: 10px;
    font-size: 13px;
    color: #64748b;
    font-weight: 500;
  }
  
  input { padding-left: 24px; }
`;

// ============================================================================
// Component
// ============================================================================

export const ScenarioInputsComponent: React.FC<ScenarioInputsProps> = ({
  inputs,
  onInputsChange,
  coverages,
  allStates,
}) => {
  const handleChange = (field: keyof ScenarioInputsType, value: string | number | undefined) => {
    onInputsChange({ ...inputs, [field]: value });
  };
  
  return (
    <Container>
      <SectionTitle>
        <MapPinIcon />
        Location & Coverage
      </SectionTitle>
      
      <InputGrid>
        <FieldGroup>
          <FieldLabel><MapIcon />State</FieldLabel>
          <Select
            value={inputs.state || ''}
            onChange={(e) => handleChange('state', e.target.value || undefined)}
          >
            <option value="">Select state...</option>
            {allStates.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </Select>
        </FieldGroup>
        
        <FieldGroup>
          <FieldLabel><ShieldCheckIcon />Coverage</FieldLabel>
          <Select
            value={inputs.coverage || 'all'}
            onChange={(e) => handleChange('coverage', e.target.value)}
          >
            <option value="all">All Coverages</option>
            {coverages.map(cov => (
              <option key={cov.id} value={cov.coverageCode}>{cov.name}</option>
            ))}
          </Select>
        </FieldGroup>
      </InputGrid>
      
      <Divider />
      
      <SectionTitle>
        <BuildingOfficeIcon />
        Exposure Inputs
      </SectionTitle>
      
      <InputGrid>
        <FieldGroup>
          <FieldLabel><BuildingOfficeIcon />Building Limit</FieldLabel>
          <InputWithPrefix>
            <span>$</span>
            <NumberInput
              type="number"
              value={inputs.buildingLimit || ''}
              onChange={(e) => handleChange('buildingLimit', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="0"
            />
          </InputWithPrefix>
        </FieldGroup>
        
        <FieldGroup>
          <FieldLabel><CubeIcon />Contents Limit</FieldLabel>
          <InputWithPrefix>
            <span>$</span>
            <NumberInput
              type="number"
              value={inputs.contentsLimit || ''}
              onChange={(e) => handleChange('contentsLimit', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="0"
            />
          </InputWithPrefix>
        </FieldGroup>
        
        <FieldGroup>
          <FieldLabel><CurrencyDollarIcon />Deductible</FieldLabel>
          <InputWithPrefix>
            <span>$</span>
            <NumberInput
              type="number"
              value={inputs.deductible || ''}
              onChange={(e) => handleChange('deductible', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="0"
            />
          </InputWithPrefix>
        </FieldGroup>
        
        <FieldGroup>
          <FieldLabel><MapPinIcon />Territory</FieldLabel>
          <TextInput
            type="text"
            value={inputs.territory || ''}
            onChange={(e) => handleChange('territory', e.target.value || undefined)}
            placeholder="Territory code"
          />
        </FieldGroup>
      </InputGrid>
    </Container>
  );
};

export default ScenarioInputsComponent;

