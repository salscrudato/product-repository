/**
 * LimitBasisSelector Component
 *
 * Compact selector for limit basis that adapts based on structure type.
 * Shows appropriate basis options based on the selected limit structure.
 *
 * The basis captures the insurance semantics (what the limit applies to),
 * while the structure captures the shape (single vs paired vs split).
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { ChevronDownIcon, ChevronUpIcon, CogIcon } from '@heroicons/react/24/outline';
import { LimitStructure, LimitBasis, LimitBasisConfig, LIMIT_BASIS_LABELS, DEFAULT_SPLIT_COMPONENT_BASES, SplitLimitComponent } from '@app-types';
import { colors } from '../common/DesignSystem';

interface LimitBasisSelectorProps {
  structure: LimitStructure;
  value: LimitBasisConfig;
  onChange: (config: LimitBasisConfig) => void;
  disabled?: boolean;
  /** Split components for advanced split basis editing */
  splitComponents?: Omit<SplitLimitComponent, 'amount'>[];
  /** Line of business hint for smart defaults */
  lineOfBusiness?: 'auto' | 'gl' | 'property' | 'claimsMade' | 'inlandMarine' | 'other';
  /** Whether this is for scheduled limits with a total cap */
  hasScheduleCap?: boolean;
}

/** Basis options for primary (occurrence-style) limits */
const PRIMARY_BASIS_OPTIONS: { value: LimitBasis; label: string }[] = [
  { value: 'perOccurrence', label: 'Per Occurrence' },
  { value: 'perAccident', label: 'Per Accident' },
  { value: 'perClaim', label: 'Per Claim' },
  { value: 'perPerson', label: 'Per Person' },
  { value: 'perLocation', label: 'Per Location' },
  { value: 'perItem', label: 'Per Item' },
  { value: 'other', label: 'Other' },
];

/** Basis options for aggregate limits */
const AGGREGATE_BASIS_OPTIONS: { value: LimitBasis; label: string }[] = [
  { value: 'policyTerm', label: 'Policy Term' },
  { value: 'annual', label: 'Annual' },
  { value: 'lifetime', label: 'Lifetime' },
  { value: 'other', label: 'Other' },
];

/** Basis options for scheduled/per-item limits */
const ITEM_BASIS_OPTIONS: { value: LimitBasis; label: string }[] = [
  { value: 'perItem', label: 'Per Item' },
  { value: 'perLocation', label: 'Per Location' },
  { value: 'other', label: 'Other' },
];

/** Basis options for split limit components */
const SPLIT_COMPONENT_BASIS_OPTIONS: { value: LimitBasis; label: string }[] = [
  { value: 'perPerson', label: 'Per Person' },
  { value: 'perAccident', label: 'Per Accident' },
  { value: 'perOccurrence', label: 'Per Occurrence' },
  { value: 'other', label: 'Other' },
];

/**
 * Get default basis config for a structure with optional line of business hint
 */
export function getDefaultBasisForStructure(
  structure: LimitStructure,
  lineOfBusiness?: string
): LimitBasisConfig {
  switch (structure) {
    case 'single':
      // Property / GL typically use per occurrence, Auto uses per accident
      if (lineOfBusiness === 'auto') {
        return { primaryBasis: 'perAccident' };
      }
      return { primaryBasis: 'perOccurrence' };

    case 'csl':
      // CSL is typically for auto - per accident
      return { primaryBasis: 'perAccident' };

    case 'occAgg':
      // GL / Property use per occurrence + policy term aggregate
      return { primaryBasis: 'perOccurrence', aggregateBasis: 'policyTerm' };

    case 'claimAgg':
      // Claims-made policies use per claim + policy term aggregate
      return { primaryBasis: 'perClaim', aggregateBasis: 'policyTerm' };

    case 'split':
      // Split limits default to per accident with component-specific bases
      return {
        primaryBasis: 'perAccident',
        splitComponentBases: { ...DEFAULT_SPLIT_COMPONENT_BASES }
      };

    case 'scheduled':
      // Scheduled/per-item defaults
      return {
        primaryBasis: 'perItem',
        itemBasis: 'perItem',
        scheduleCapBasis: 'policyTerm'
      };

    case 'custom':
      // Custom can be optional, default to per occurrence
      return { primaryBasis: 'perOccurrence' };

    default:
      return { primaryBasis: 'perOccurrence' };
  }
}

/**
 * Apply smart defaults based on coverage metadata
 * Does not overwrite user-selected values
 */
export function applySmartDefaults(
  current: LimitBasisConfig,
  structure: LimitStructure,
  lineOfBusiness?: string
): LimitBasisConfig {
  const defaults = getDefaultBasisForStructure(structure, lineOfBusiness);

  // Only apply if primary basis is not yet set meaningfully
  // (keeping existing behavior of not overwriting user selections)
  return {
    ...defaults,
    ...current,
  };
}

export const LimitBasisSelector: React.FC<LimitBasisSelectorProps> = ({
  structure,
  value,
  onChange,
  disabled = false,
  splitComponents = [],
  hasScheduleCap = false
}) => {
  const [showAdvancedSplit, setShowAdvancedSplit] = useState(false);

  const showAggregateBasis = structure === 'occAgg' || structure === 'claimAgg';
  const isSplit = structure === 'split';
  const isScheduled = structure === 'scheduled';
  const isCustom = structure === 'custom';
  const showOtherInput = value.primaryBasis === 'other' || value.aggregateBasis === 'other';

  const handlePrimaryChange = (basis: LimitBasis) => {
    onChange({ ...value, primaryBasis: basis });
  };

  const handleAggregateChange = (basis: LimitBasis) => {
    onChange({ ...value, aggregateBasis: basis });
  };

  const handleCustomDescriptionChange = (desc: string) => {
    onChange({ ...value, customBasisDescription: desc });
  };

  const handleItemBasisChange = (basis: LimitBasis) => {
    onChange({ ...value, itemBasis: basis });
  };

  const handleScheduleCapBasisChange = (basis: LimitBasis) => {
    onChange({ ...value, scheduleCapBasis: basis });
  };

  const handleSplitComponentBasisChange = (componentKey: string, basis: LimitBasis) => {
    onChange({
      ...value,
      splitComponentBases: {
        ...value.splitComponentBases,
        [componentKey]: basis
      }
    });
  };

  /** Get display summary for split component bases */
  const getSplitBasisSummary = (): string => {
    const bases = value.splitComponentBases || DEFAULT_SPLIT_COMPONENT_BASES;
    const components = splitComponents.length > 0
      ? splitComponents
      : [
          { key: 'biPerPerson', label: 'BI Per Person' },
          { key: 'biPerAccident', label: 'BI Per Accident' },
          { key: 'pd', label: 'PD' }
        ];

    return components
      .map(c => LIMIT_BASIS_LABELS[bases[c.key] || 'perAccident'] || 'Per Accident')
      .join(' / ');
  };

  // Determine which primary options to show based on structure
  const getPrimaryOptions = () => {
    if (isScheduled) return ITEM_BASIS_OPTIONS;
    return PRIMARY_BASIS_OPTIONS;
  };

  // Get field label based on structure
  const getPrimaryLabel = () => {
    if (showAggregateBasis) {
      return structure === 'claimAgg' ? 'Per Claim Basis' : 'Primary Basis';
    }
    if (isScheduled) return 'Item Basis';
    if (structure === 'csl') return 'CSL Basis';
    return 'Applies';
  };

  return (
    <Container>
      <SectionHeader>
        <SectionLabel>Limit Basis</SectionLabel>
        <SectionHint>What the limit applies to</SectionHint>
      </SectionHeader>

      {/* Standard primary + aggregate for most structures */}
      {!isSplit && !isScheduled && (
        <FieldsRow>
          <FieldGroup>
            <FieldLabel>{getPrimaryLabel()}</FieldLabel>
            <SelectWrapper>
              <Select
                value={value.primaryBasis}
                onChange={(e) => handlePrimaryChange(e.target.value as LimitBasis)}
                disabled={disabled}
                aria-label="Primary basis"
              >
                {getPrimaryOptions().map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
              <SelectIcon><ChevronDownIcon /></SelectIcon>
            </SelectWrapper>
          </FieldGroup>

          {showAggregateBasis && (
            <FieldGroup>
              <FieldLabel>Aggregate Basis</FieldLabel>
              <SelectWrapper>
                <Select
                  value={value.aggregateBasis || 'policyTerm'}
                  onChange={(e) => handleAggregateChange(e.target.value as LimitBasis)}
                  disabled={disabled}
                  aria-label="Aggregate basis"
                >
                  {AGGREGATE_BASIS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
                <SelectIcon><ChevronDownIcon /></SelectIcon>
              </SelectWrapper>
            </FieldGroup>
          )}
        </FieldsRow>
      )}

      {/* Split limits: show summary with advanced toggle */}
      {isSplit && (
        <>
          <SplitSummary>
            <SplitSummaryLabel>Component Basis:</SplitSummaryLabel>
            <SplitSummaryValue>{getSplitBasisSummary()}</SplitSummaryValue>
          </SplitSummary>

          <AdvancedToggle
            onClick={() => setShowAdvancedSplit(!showAdvancedSplit)}
            aria-expanded={showAdvancedSplit}
          >
            <CogIcon />
            <span>Advanced: Edit component basis</span>
            {showAdvancedSplit ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </AdvancedToggle>

          {showAdvancedSplit && (
            <AdvancedContent>
              {(splitComponents.length > 0 ? splitComponents : [
                { key: 'biPerPerson', label: 'BI Per Person', order: 0 },
                { key: 'biPerAccident', label: 'BI Per Accident', order: 1 },
                { key: 'pd', label: 'Property Damage', order: 2 }
              ]).map(comp => (
                <FieldGroup key={comp.key}>
                  <FieldLabel>{comp.label}</FieldLabel>
                  <SelectWrapper>
                    <Select
                      value={value.splitComponentBases?.[comp.key] || DEFAULT_SPLIT_COMPONENT_BASES[comp.key] || 'perAccident'}
                      onChange={(e) => handleSplitComponentBasisChange(comp.key, e.target.value as LimitBasis)}
                      disabled={disabled}
                      aria-label={`${comp.label} basis`}
                    >
                      {SPLIT_COMPONENT_BASIS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Select>
                    <SelectIcon><ChevronDownIcon /></SelectIcon>
                  </SelectWrapper>
                </FieldGroup>
              ))}
            </AdvancedContent>
          )}
        </>
      )}

      {/* Scheduled/per-item limits */}
      {isScheduled && (
        <FieldsRow>
          <FieldGroup>
            <FieldLabel>Item Basis</FieldLabel>
            <SelectWrapper>
              <Select
                value={value.itemBasis || 'perItem'}
                onChange={(e) => handleItemBasisChange(e.target.value as LimitBasis)}
                disabled={disabled}
                aria-label="Item basis"
              >
                {ITEM_BASIS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
              <SelectIcon><ChevronDownIcon /></SelectIcon>
            </SelectWrapper>
          </FieldGroup>

          {hasScheduleCap && (
            <FieldGroup>
              <FieldLabel>Cap Basis</FieldLabel>
              <SelectWrapper>
                <Select
                  value={value.scheduleCapBasis || 'policyTerm'}
                  onChange={(e) => handleScheduleCapBasisChange(e.target.value as LimitBasis)}
                  disabled={disabled}
                  aria-label="Schedule cap basis"
                >
                  {AGGREGATE_BASIS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
                <SelectIcon><ChevronDownIcon /></SelectIcon>
              </SelectWrapper>
            </FieldGroup>
          )}
        </FieldsRow>
      )}

      {/* Custom structure note */}
      {isCustom && (
        <CustomNote>
          Custom structures may have flexible or no specific basis. Setting a basis is optional but recommended.
        </CustomNote>
      )}

      {/* "Other" requires description */}
      {showOtherInput && (
        <OtherInputGroup>
          <FieldLabel>Basis Label *</FieldLabel>
          <OtherInput
            type="text"
            value={value.customBasisDescription || ''}
            onChange={(e) => handleCustomDescriptionChange(e.target.value)}
            placeholder="e.g., Per Project, Per Shipment, Per Voyage..."
            disabled={disabled}
            aria-label="Custom basis description"
            aria-required="true"
          />
          <OtherHint>Describe the custom basis that applies to this limit</OtherHint>
        </OtherInputGroup>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: ${colors.gray50};
  border-radius: 10px;
  border: 1px solid ${colors.gray200};
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
`;

const SectionLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${colors.gray700};
`;

const SectionHint = styled.div`
  font-size: 11px;
  color: ${colors.gray400};
`;

const FieldsRow = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 140px;
`;

const FieldLabel = styled.label`
  font-size: 11px;
  font-weight: 500;
  color: ${colors.gray500};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SelectWrapper = styled.div`
  position: relative;
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 32px 8px 12px;
  border: 1px solid ${colors.gray300};
  border-radius: 8px;
  background: white;
  font-size: 13px;
  font-weight: 500;
  color: ${colors.gray700};
  cursor: pointer;
  appearance: none;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: ${colors.primary};
  }

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px ${colors.primary}20;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SelectIcon = styled.div`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: ${colors.gray400};
  pointer-events: none;

  svg {
    width: 100%;
    height: 100%;
  }
`;

/* Split limits components */
const SplitSummary = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: white;
  border: 1px solid ${colors.gray200};
  border-radius: 8px;
`;

const SplitSummaryLabel = styled.span`
  font-size: 12px;
  color: ${colors.gray500};
`;

const SplitSummaryValue = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${colors.gray700};
`;

const AdvancedToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: transparent;
  border: 1px dashed ${colors.gray300};
  border-radius: 6px;
  font-size: 11px;
  color: ${colors.gray500};
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    border-color: ${colors.primary};
    color: ${colors.primary};
  }
`;

const AdvancedContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: white;
  border: 1px solid ${colors.gray200};
  border-radius: 8px;
`;

/* Custom structure note */
const CustomNote = styled.div`
  font-size: 11px;
  color: ${colors.gray500};
  font-style: italic;
  padding: 8px 12px;
  background: ${colors.gray100};
  border-radius: 6px;
`;

/* Other input group */
const OtherInputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const OtherInput = styled.input`
  padding: 8px 12px;
  border: 1px solid ${colors.gray300};
  border-radius: 8px;
  font-size: 13px;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px ${colors.primary}20;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const OtherHint = styled.div`
  font-size: 10px;
  color: ${colors.gray400};
`;

export default LimitBasisSelector;

