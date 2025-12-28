/**
 * CoinsuranceInput Component
 * Multi-select for available coinsurance options with min/max range
 */

import React from 'react';
import styled from 'styled-components';

// Standard P&C coinsurance options
const COINSURANCE_OPTIONS = [50, 60, 70, 80, 90, 100];

interface CoinsuranceInputProps {
  selectedOptions?: number[];
  minimum?: number;
  maximum?: number;
  onChange: (options: number[], min?: number, max?: number) => void;
}

export const CoinsuranceInput: React.FC<CoinsuranceInputProps> = ({
  selectedOptions = [],
  minimum,
  maximum,
  onChange,
}) => {
  const handleToggle = (pct: number) => {
    let newOptions: number[];
    if (selectedOptions.includes(pct)) {
      newOptions = selectedOptions.filter(v => v !== pct);
    } else {
      newOptions = [...selectedOptions, pct].sort((a, b) => a - b);
    }
    // Auto-calculate min/max from selection
    const newMin = newOptions.length > 0 ? Math.min(...newOptions) : undefined;
    const newMax = newOptions.length > 0 ? Math.max(...newOptions) : undefined;
    onChange(newOptions, newMin, newMax);
  };

  const handleMinChange = (value: number | undefined) => {
    onChange(selectedOptions, value, maximum);
  };

  const handleMaxChange = (value: number | undefined) => {
    onChange(selectedOptions, minimum, value);
  };

  return (
    <Container>
      <SectionLabel>Available Coinsurance Options</SectionLabel>
      <CheckboxGrid>
        {COINSURANCE_OPTIONS.map((pct) => (
          <CheckboxItem
            key={pct}
            $selected={selectedOptions.includes(pct)}
            onClick={() => handleToggle(pct)}
          >
            <Checkbox
              type="checkbox"
              checked={selectedOptions.includes(pct)}
              onChange={() => handleToggle(pct)}
            />
            <CheckboxLabel>{pct}%</CheckboxLabel>
          </CheckboxItem>
        ))}
      </CheckboxGrid>

      <RangeSection>
        <RangeLabel>Coinsurance Range</RangeLabel>
        <RangeInputs>
          <RangeField>
            <RangeFieldLabel>Minimum</RangeFieldLabel>
            <RangeInputWrapper>
              <RangeInput
                type="number"
                min="0"
                max="100"
                step="5"
                placeholder="Min"
                value={minimum ?? ''}
                onChange={(e) => handleMinChange(e.target.value ? parseInt(e.target.value) : undefined)}
              />
              <PercentSymbol>%</PercentSymbol>
            </RangeInputWrapper>
          </RangeField>
          <RangeDivider>to</RangeDivider>
          <RangeField>
            <RangeFieldLabel>Maximum</RangeFieldLabel>
            <RangeInputWrapper>
              <RangeInput
                type="number"
                min="0"
                max="100"
                step="5"
                placeholder="Max"
                value={maximum ?? ''}
                onChange={(e) => handleMaxChange(e.target.value ? parseInt(e.target.value) : undefined)}
              />
              <PercentSymbol>%</PercentSymbol>
            </RangeInputWrapper>
          </RangeField>
        </RangeInputs>
      </RangeSection>

      {selectedOptions.length > 0 && (
        <SelectedSummary>
          <SelectedCount>{selectedOptions.length} option{selectedOptions.length > 1 ? 's' : ''} selected</SelectedCount>
          <SelectedList>{selectedOptions.map(p => `${p}%`).join(', ')}</SelectedList>
        </SelectedSummary>
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

const SectionLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours?.textMuted || '#6b7280'};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const CheckboxGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

const CheckboxItem = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: ${({ $selected }) => $selected ? 'rgba(99, 102, 241, 0.08)' : '#f9fafb'};
  border: 1px solid ${({ $selected }) => $selected ? '#6366f1' : '#e5e7eb'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${({ $selected }) => $selected ? '#6366f1' : '#d1d5db'};
    background: ${({ $selected }) => $selected ? 'rgba(99, 102, 241, 0.12)' : '#f3f4f6'};
  }
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #6366f1;
`;

const CheckboxLabel = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colours?.text || '#111827'};
`;

const RangeSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => theme.colours?.border || '#e5e7eb'};
`;

const RangeLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours?.textMuted || '#6b7280'};
`;

const RangeInputs = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 12px;
`;

const RangeField = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const RangeFieldLabel = styled.label`
  font-size: 12px;
  color: ${({ theme }) => theme.colours?.textMuted || '#6b7280'};
`;

const RangeInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const RangeInput = styled.input`
  width: 80px;
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #111827;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const PercentSymbol = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
`;

const RangeDivider = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.colours?.textMuted || '#6b7280'};
  padding-bottom: 10px;
`;

const SelectedSummary = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 6px;
`;

const SelectedCount = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
`;

const SelectedList = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colours?.textMuted || '#6b7280'};
`;