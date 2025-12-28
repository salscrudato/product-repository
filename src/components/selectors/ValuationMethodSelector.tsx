/**
 * ValuationMethodSelector Component
 * Multi-select checkboxes for available property valuation methods
 */

import React from 'react';
import styled from 'styled-components';
import { ValuationMethod } from '../../types';

interface ValuationMethodSelectorProps {
  values?: ValuationMethod[];
  onChange: (methods: ValuationMethod[]) => void;
}

const VALUATION_OPTIONS: { value: ValuationMethod; label: string; shortLabel: string; description: string }[] = [
  {
    value: 'RC',
    label: 'Replacement Cost (RC)',
    shortLabel: 'RC',
    description: 'Cost to replace with new property of like kind and quality, without depreciation.'
  },
  {
    value: 'ACV',
    label: 'Actual Cash Value (ACV)',
    shortLabel: 'ACV',
    description: 'Replacement cost minus depreciation.'
  },
  {
    value: 'agreedValue',
    label: 'Agreed Value',
    shortLabel: 'Agreed',
    description: 'Pre-agreed value. No depreciation or coinsurance penalty.'
  },
  {
    value: 'marketValue',
    label: 'Market Value',
    shortLabel: 'Market',
    description: 'Current market price for similar property.'
  },
  {
    value: 'functionalRC',
    label: 'Functional Replacement Cost',
    shortLabel: 'Functional RC',
    description: 'Replace with property serving same function, different materials.'
  },
  {
    value: 'statedAmount',
    label: 'Stated Amount',
    shortLabel: 'Stated',
    description: 'Maximum payable amount, actual loss valued separately.'
  },
];

export const ValuationMethodSelector: React.FC<ValuationMethodSelectorProps> = ({
  values = [],
  onChange,
}) => {
  const handleToggle = (method: ValuationMethod) => {
    if (values.includes(method)) {
      onChange(values.filter(v => v !== method));
    } else {
      onChange([...values, method]);
    }
  };

  return (
    <Container>
      <CheckboxGrid>
        {VALUATION_OPTIONS.map((option) => (
          <CheckboxItem
            key={option.value}
            $selected={values.includes(option.value)}
            onClick={() => handleToggle(option.value)}
          >
            <Checkbox
              type="checkbox"
              checked={values.includes(option.value)}
              onChange={() => handleToggle(option.value)}
            />
            <CheckboxContent>
              <CheckboxLabel>{option.label}</CheckboxLabel>
              <CheckboxDescription>{option.description}</CheckboxDescription>
            </CheckboxContent>
          </CheckboxItem>
        ))}
      </CheckboxGrid>
      {values.length > 0 && (
        <SelectedSummary>
          <SelectedCount>{values.length} method{values.length > 1 ? 's' : ''} selected</SelectedCount>
          <SelectedList>
            {values.map(v => VALUATION_OPTIONS.find(o => o.value === v)?.shortLabel).join(', ')}
          </SelectedList>
        </SelectedSummary>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CheckboxGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CheckboxItem = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: ${({ $selected, theme }) => $selected ? 'rgba(99, 102, 241, 0.08)' : theme.colours?.surface || '#f9fafb'};
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
  width: 18px;
  height: 18px;
  margin-top: 2px;
  cursor: pointer;
  accent-color: #6366f1;
`;

const CheckboxContent = styled.div`
  flex: 1;
`;

const CheckboxLabel = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colours?.text || '#111827'};
  margin-bottom: 2px;
`;

const CheckboxDescription = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colours?.textMuted || '#6b7280'};
  line-height: 1.4;
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
