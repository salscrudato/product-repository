/**
 * ValuationMethodSelector Component
 * Multi-select checkboxes for available property valuation methods
 */

import React from 'react';
import styled from 'styled-components';
import { ValuationMethod } from '../../types';
import { CheckIcon } from '@heroicons/react/24/outline';

interface ValuationMethodSelectorProps {
  values?: ValuationMethod[];
  onChange: (methods: ValuationMethod[]) => void;
}

const VALUATION_OPTIONS: { value: ValuationMethod; label: string; shortLabel: string; description: string }[] = [
  {
    value: 'RC',
    label: 'Replacement Cost',
    shortLabel: 'RC',
    description: 'Replace with new property, no depreciation'
  },
  {
    value: 'ACV',
    label: 'Actual Cash Value',
    shortLabel: 'ACV',
    description: 'Replacement cost minus depreciation'
  },
  {
    value: 'agreedValue',
    label: 'Agreed Value',
    shortLabel: 'Agreed',
    description: 'Pre-agreed, no coinsurance penalty'
  },
  {
    value: 'marketValue',
    label: 'Market Value',
    shortLabel: 'Market',
    description: 'Current market price'
  },
  {
    value: 'functionalRC',
    label: 'Functional RC',
    shortLabel: 'Functional',
    description: 'Same function, different materials'
  },
  {
    value: 'statedAmount',
    label: 'Stated Amount',
    shortLabel: 'Stated',
    description: 'Maximum payable amount'
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
            <CheckboxIndicator $selected={values.includes(option.value)}>
              {values.includes(option.value) && <CheckIcon />}
            </CheckboxIndicator>
            <CheckboxContent>
              <CheckboxLabel $selected={values.includes(option.value)}>{option.label}</CheckboxLabel>
              <CheckboxDescription>{option.description}</CheckboxDescription>
            </CheckboxContent>
          </CheckboxItem>
        ))}
      </CheckboxGrid>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const CheckboxGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const CheckboxItem = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: ${({ $selected, theme }) => $selected ? 'rgba(99, 102, 241, 0.06)' : theme.colours?.background || '#fff'};
  border: 1.5px solid ${({ $selected, theme }) => $selected ? '#6366f1' : theme.colours?.border || '#e5e7eb'};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${({ $selected }) => $selected ? '#6366f1' : '#a5b4fc'};
    background: ${({ $selected, theme }) => $selected ? 'rgba(99, 102, 241, 0.08)' : theme.colours?.surface || '#f9fafb'};
  }
`;

const CheckboxIndicator = styled.div<{ $selected: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
  transition: all 0.15s ease;

  background: ${({ $selected }) => $selected ? '#6366f1' : 'transparent'};
  border: 1.5px solid ${({ $selected, theme }) => $selected ? '#6366f1' : theme.colours?.border || '#d1d5db'};

  svg {
    width: 12px;
    height: 12px;
    color: white;
    stroke-width: 3;
  }
`;

const CheckboxContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const CheckboxLabel = styled.div<{ $selected: boolean }>`
  font-size: 13px;
  font-weight: ${({ $selected }) => $selected ? 600 : 500};
  color: ${({ $selected, theme }) => $selected ? '#6366f1' : theme.colours?.text || '#111827'};
  margin-bottom: 1px;
`;

const CheckboxDescription = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colours?.textMuted || '#6b7280'};
  line-height: 1.3;
`;
