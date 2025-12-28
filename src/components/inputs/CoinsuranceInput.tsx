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
      <OptionsGrid>
        {COINSURANCE_OPTIONS.map((pct) => (
          <OptionChip
            key={pct}
            $selected={selectedOptions.includes(pct)}
            onClick={() => handleToggle(pct)}
          >
            {pct}%
          </OptionChip>
        ))}
      </OptionsGrid>

      <RangeRow>
        <RangeLabel>Range:</RangeLabel>
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
          <span>%</span>
        </RangeInputWrapper>
        <RangeDivider>–</RangeDivider>
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
          <span>%</span>
        </RangeInputWrapper>
      </RangeRow>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const OptionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
`;

const OptionChip = styled.button<{ $selected: boolean }>`
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1.5px solid ${({ $selected, theme }) => $selected ? '#6366f1' : theme.colours?.border || '#e5e7eb'};
  background: ${({ $selected, theme }) => $selected ? 'rgba(99, 102, 241, 0.06)' : theme.colours?.background || '#fff'};
  color: ${({ $selected, theme }) => $selected ? '#6366f1' : theme.colours?.text || '#374151'};

  &:hover {
    border-color: #6366f1;
    background: ${({ $selected }) => $selected ? '#5558e3' : 'rgba(99, 102, 241, 0.08)'};
  }
`;

const RangeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => theme.colours?.border || '#e5e7eb'};
`;

const RangeLabel = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colours?.textMuted || '#6b7280'};
`;

const RangeInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;

  span {
    font-size: 13px;
    color: ${({ theme }) => theme.colours?.textMuted || '#6b7280'};
  }
`;

const RangeInput = styled.input`
  width: 60px;
  padding: 6px 8px;
  border: 1px solid ${({ theme }) => theme.colours?.border || '#d1d5db'};
  border-radius: 6px;
  font-size: 13px;
  color: ${({ theme }) => theme.colours?.text || '#111827'};
  background: ${({ theme }) => theme.colours?.background || '#fff'};

  &:focus {
    outline: none;
    border-color: #6366f1;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colours?.textMuted || '#9ca3af'};
  }
`;

const RangeDivider = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colours?.textMuted || '#6b7280'};
`;