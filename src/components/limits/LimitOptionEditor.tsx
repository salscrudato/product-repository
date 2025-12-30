/**
 * LimitOptionEditor Component
 *
 * Premium Apple-inspired dynamic form for editing limit options.
 * Features frosted glass aesthetics, refined inputs, and elegant animations.
 */

import React, { useState, useCallback, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  CoverageLimitOption,
  LimitStructure,
  LimitOptionValue,
  SingleLimitValue,
  OccAggLimitValue,
  ClaimAggLimitValue,
  SplitLimitValue,
  CSLLimitValue,
  ScheduledLimitValue,
  SplitLimitComponent,
  LimitApplicability
} from '@app-types';
import { generateDisplayValue } from '../../services/limitOptionService';
import { ApplicabilityPicker } from '../selectors/ApplicabilityPicker';
import { colors } from '../common/DesignSystem';

// ============ Premium Animations ============
const slideIn = keyframes`
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
`;

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const focusGlow = keyframes`
  0% { box-shadow: 0 0 0 3px rgba(99, 102, 241, 0); }
  50% { box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15); }
  100% { box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12); }
`;

interface LimitOptionEditorProps {
  option: Partial<CoverageLimitOption>;
  structure: LimitStructure;
  splitComponents?: Omit<SplitLimitComponent, 'amount'>[];
  onChange: (option: Partial<CoverageLimitOption>) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew?: boolean;
}

// Currency formatting helpers
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Parse currency with shorthand support (100k, 1m, 2.5m, etc.)
 */
const parseCurrency = (value: string): number => {
  const trimmed = value.trim().toLowerCase();

  // Check for shorthand notation
  const shorthandMatch = trimmed.match(/^[\$]?\s*([\d,.]+)\s*(k|m|b)?$/i);
  if (shorthandMatch) {
    const numPart = parseFloat(shorthandMatch[1].replace(/,/g, '')) || 0;
    const suffix = shorthandMatch[2]?.toLowerCase();

    switch (suffix) {
      case 'k':
        return numPart * 1000;
      case 'm':
        return numPart * 1000000;
      case 'b':
        return numPart * 1000000000;
      default:
        return numPart;
    }
  }

  // Fallback: strip non-numeric characters
  const cleaned = value.replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
};

export const LimitOptionEditor: React.FC<LimitOptionEditorProps> = ({
  option,
  structure,
  splitComponents = [],
  onChange,
  onSave,
  onCancel,
  isNew = false
}) => {
  const [currencyInputs, setCurrencyInputs] = useState<Record<string, string>>({});

  // Initialize currency inputs from option values (blank if zero/new)
  useEffect(() => {
    const inputs: Record<string, string> = {};

    const formatOrBlank = (val: number | undefined): string => {
      return val && val > 0 ? formatCurrency(val) : '';
    };

    switch (structure) {
      case 'single':
      case 'csl':
        inputs.amount = formatOrBlank((option as SingleLimitValue).amount);
        break;
      case 'occAgg':
        inputs.perOccurrence = formatOrBlank((option as OccAggLimitValue).perOccurrence);
        inputs.aggregate = formatOrBlank((option as OccAggLimitValue).aggregate);
        break;
      case 'claimAgg':
        inputs.perClaim = formatOrBlank((option as ClaimAggLimitValue).perClaim);
        inputs.aggregate = formatOrBlank((option as ClaimAggLimitValue).aggregate);
        break;
      case 'scheduled':
        inputs.perItemMin = formatOrBlank((option as ScheduledLimitValue).perItemMin);
        inputs.perItemMax = formatOrBlank((option as ScheduledLimitValue).perItemMax);
        inputs.totalCap = formatOrBlank((option as ScheduledLimitValue).totalCap);
        break;
      case 'split':
        const splitOpt = option as SplitLimitValue;
        splitOpt.components?.forEach(c => {
          inputs[`split_${c.key}`] = formatOrBlank(c.amount);
        });
        break;
    }

    setCurrencyInputs(inputs);
  }, [option.id, structure]);

  /** Auto-format currency as user types */
  const handleCurrencyChange = useCallback((field: string, value: string) => {
    // Strip to just digits
    const digitsOnly = value.replace(/[^\d]/g, '');

    // If empty, just clear
    if (!digitsOnly) {
      setCurrencyInputs(prev => ({ ...prev, [field]: '' }));
      return;
    }

    // Parse and format
    const numValue = parseInt(digitsOnly, 10);
    const formatted = formatCurrency(numValue);
    setCurrencyInputs(prev => ({ ...prev, [field]: formatted }));

    // Update the option value immediately
    let updatedValue: Partial<LimitOptionValue> = {};

    switch (structure) {
      case 'single':
        updatedValue = { structure: 'single', amount: numValue };
        break;
      case 'csl':
        updatedValue = { structure: 'csl', amount: numValue };
        break;
      case 'occAgg':
        if (field === 'perOccurrence') {
          updatedValue = {
            structure: 'occAgg',
            perOccurrence: numValue,
            aggregate: (option as OccAggLimitValue).aggregate || 0
          };
        } else {
          updatedValue = {
            structure: 'occAgg',
            perOccurrence: (option as OccAggLimitValue).perOccurrence || 0,
            aggregate: numValue
          };
        }
        break;
      case 'claimAgg':
        if (field === 'perClaim') {
          updatedValue = {
            structure: 'claimAgg',
            perClaim: numValue,
            aggregate: (option as ClaimAggLimitValue).aggregate || 0
          };
        } else {
          updatedValue = {
            structure: 'claimAgg',
            perClaim: (option as ClaimAggLimitValue).perClaim || 0,
            aggregate: numValue
          };
        }
        break;
      case 'scheduled':
        const schedOpt = option as ScheduledLimitValue;
        updatedValue = {
          structure: 'scheduled',
          perItemMin: field === 'perItemMin' ? numValue : schedOpt.perItemMin,
          perItemMax: field === 'perItemMax' ? numValue : schedOpt.perItemMax,
          totalCap: field === 'totalCap' ? numValue : schedOpt.totalCap
        };
        break;
      case 'split':
        const key = field.replace('split_', '');
        const currentComponents = (option as SplitLimitValue).components || [];
        const updatedComponents = currentComponents.map(c =>
          c.key === key ? { ...c, amount: numValue } : c
        );
        updatedValue = { structure: 'split', components: updatedComponents };
        break;
    }

    const newDisplayValue = generateDisplayValue(updatedValue as LimitOptionValue);
    onChange({
      ...option,
      ...updatedValue,
      displayValue: newDisplayValue,
      label: option.label || newDisplayValue
    });
  }, [structure, option, onChange]);

  const handleCurrencyBlur = useCallback((field: string) => {
    // Format on blur for shorthand support (100k, 1m, etc.)
    const currentValue = currencyInputs[field] || '';
    const numValue = parseCurrency(currentValue);

    if (numValue > 0) {
      setCurrencyInputs(prev => ({ ...prev, [field]: formatCurrency(numValue) }));
    }
  }, [currencyInputs]);

  const handleApplicabilityChange = useCallback((applicability: LimitApplicability) => {
    onChange({ ...option, applicability });
  }, [option, onChange]);

  const handleLabelChange = useCallback((label: string) => {
    onChange({ ...option, label });
  }, [option, onChange]);

  const handleSublimitTagChange = useCallback((sublimitTag: string) => {
    onChange({ ...option, sublimitTag } as Partial<CoverageLimitOption>);
  }, [option, onChange]);

  // Render structure-specific fields
  const renderValueFields = () => {
    switch (structure) {
      case 'single':
      case 'csl':
        return (
          <FieldGroup>
            <FieldLabel>Limit Amount *</FieldLabel>
            <CurrencyInput
              value={currencyInputs.amount || ''}
              onChange={(e) => handleCurrencyChange('amount', e.target.value)}
              onBlur={() => handleCurrencyBlur('amount')}
              placeholder="$0"
            />
          </FieldGroup>
        );

      case 'occAgg':
        const occValue = parseCurrency(currencyInputs.perOccurrence || '0');
        return (
          <>
            <FieldRow>
              <FieldGroup>
                <FieldLabel>Per Occurrence *</FieldLabel>
                <CurrencyInput
                  value={currencyInputs.perOccurrence || ''}
                  onChange={(e) => handleCurrencyChange('perOccurrence', e.target.value)}
                  onBlur={() => handleCurrencyBlur('perOccurrence')}
                  placeholder="$0 or 1m"
                />
                <FieldHint>Supports shorthand: 100k, 1m, 2.5m</FieldHint>
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Aggregate *</FieldLabel>
                <CurrencyInput
                  value={currencyInputs.aggregate || ''}
                  onChange={(e) => handleCurrencyChange('aggregate', e.target.value)}
                  onBlur={() => handleCurrencyBlur('aggregate')}
                  placeholder="$0 or 2m"
                />
              </FieldGroup>
            </FieldRow>
            {/* Ratio helper chips - common P&C patterns */}
            {occValue > 0 && (
              <RatioHelperSection>
                <RatioHelperLabel>Quick set aggregate (common ratios):</RatioHelperLabel>
                <RatioChips>
                  {[2, 3, 4, 5].map(ratio => (
                    <RatioChip
                      key={ratio}
                      onClick={() => {
                        const aggValue = occValue * ratio;
                        setCurrencyInputs(prev => ({ ...prev, aggregate: formatCurrency(aggValue) }));
                        handleCurrencyBlur('aggregate');
                      }}
                    >
                      {ratio}× ({formatCurrency(occValue * ratio).replace('$', '')})
                    </RatioChip>
                  ))}
                </RatioChips>
              </RatioHelperSection>
            )}
          </>
        );

      case 'claimAgg':
        const claimValue = parseCurrency(currencyInputs.perClaim || '0');
        return (
          <>
            <FieldRow>
              <FieldGroup>
                <FieldLabel>Each Claim *</FieldLabel>
                <CurrencyInput
                  value={currencyInputs.perClaim || ''}
                  onChange={(e) => handleCurrencyChange('perClaim', e.target.value)}
                  onBlur={() => handleCurrencyBlur('perClaim')}
                  placeholder="$0 or 1m"
                />
                <FieldHint>Supports shorthand: 100k, 1m, 2.5m</FieldHint>
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Aggregate *</FieldLabel>
                <CurrencyInput
                  value={currencyInputs.aggregate || ''}
                  onChange={(e) => handleCurrencyChange('aggregate', e.target.value)}
                  onBlur={() => handleCurrencyBlur('aggregate')}
                  placeholder="$0 or 3m"
                />
              </FieldGroup>
            </FieldRow>
            {/* Ratio helper chips for claims-made */}
            {claimValue > 0 && (
              <RatioHelperSection>
                <RatioHelperLabel>Quick set aggregate (common ratios):</RatioHelperLabel>
                <RatioChips>
                  {[2, 3, 4, 5].map(ratio => (
                    <RatioChip
                      key={ratio}
                      onClick={() => {
                        const aggValue = claimValue * ratio;
                        setCurrencyInputs(prev => ({ ...prev, aggregate: formatCurrency(aggValue) }));
                        handleCurrencyBlur('aggregate');
                      }}
                    >
                      {ratio}× ({formatCurrency(claimValue * ratio).replace('$', '')})
                    </RatioChip>
                  ))}
                </RatioChips>
              </RatioHelperSection>
            )}
          </>
        );

      case 'split':
        return (
          <SplitFieldsContainer>
            <FieldLabel>Split Limit Components *</FieldLabel>
            <SplitFieldsGrid>
              {splitComponents.map(comp => (
                <FieldGroup key={comp.key}>
                  <SplitFieldLabel>{comp.label}</SplitFieldLabel>
                  <CurrencyInput
                    value={currencyInputs[`split_${comp.key}`] || ''}
                    onChange={(e) => handleCurrencyChange(`split_${comp.key}`, e.target.value)}
                    onBlur={() => handleCurrencyBlur(`split_${comp.key}`)}
                    placeholder="$0"
                  />
                </FieldGroup>
              ))}
            </SplitFieldsGrid>
          </SplitFieldsContainer>
        );

      case 'sublimit':
        return (
          <>
            <FieldRow>
              <FieldGroup>
                <FieldLabel>Sublimit Amount *</FieldLabel>
                <CurrencyInput
                  value={currencyInputs.amount || ''}
                  onChange={(e) => handleCurrencyChange('amount', e.target.value)}
                  onBlur={() => handleCurrencyBlur('amount')}
                  placeholder="$0"
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Applies To</FieldLabel>
                <TextInput
                  value={(option as SublimitValue).sublimitTag || ''}
                  onChange={(e) => handleSublimitTagChange(e.target.value)}
                  placeholder="e.g., Theft, Water Damage"
                />
              </FieldGroup>
            </FieldRow>
          </>
        );

      case 'scheduled':
        return (
          <>
            <FieldRow>
              <FieldGroup>
                <FieldLabel>Per Item Min</FieldLabel>
                <CurrencyInput
                  value={currencyInputs.perItemMin || ''}
                  onChange={(e) => handleCurrencyChange('perItemMin', e.target.value)}
                  onBlur={() => handleCurrencyBlur('perItemMin')}
                  placeholder="$0"
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Per Item Max</FieldLabel>
                <CurrencyInput
                  value={currencyInputs.perItemMax || ''}
                  onChange={(e) => handleCurrencyChange('perItemMax', e.target.value)}
                  onBlur={() => handleCurrencyBlur('perItemMax')}
                  placeholder="$0"
                />
              </FieldGroup>
            </FieldRow>
            <FieldGroup>
              <FieldLabel>Total Cap</FieldLabel>
              <CurrencyInput
                value={currencyInputs.totalCap || ''}
                onChange={(e) => handleCurrencyChange('totalCap', e.target.value)}
                onBlur={() => handleCurrencyBlur('totalCap')}
                placeholder="$0"
              />
            </FieldGroup>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Container>
      <Header>
        <Title>{isNew ? 'Add Limit Option' : 'Edit Limit Option'}</Title>
      </Header>

      <Form>
        {/* Structure-specific value fields */}
        {renderValueFields()}

        {/* Applicability */}
        <ApplicabilitySection>
          <ApplicabilityPicker
            value={option.applicability || {}}
            onChange={handleApplicabilityChange}
            showStates={true}
            showCoverageParts={structure === 'sublimit'}
            showPerils={structure === 'sublimit'}
          />
        </ApplicabilitySection>
      </Form>

      <Footer>
        <CancelButton onClick={onCancel}>Cancel</CancelButton>
        <SaveButton onClick={onSave}>
          {isNew ? 'Add Option' : 'Save Changes'}
        </SaveButton>
      </Footer>
    </Container>
  );
};

// ============ Premium Styled Components ============
const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%);
  animation: ${slideIn} 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
`;

const Header = styled.div`
  position: relative;
  padding: 24px 28px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.9) 100%);

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, ${colors.primary} 0%, #8b5cf6 100%);
    border-radius: 0 2px 2px 0;
  }
`;

const Title = styled.h3`
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: ${colors.gray800};
  letter-spacing: -0.02em;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
`;

const Form = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 24px;

  /* Premium scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(203, 213, 225, 0.5);
    border-radius: 4px;

    &:hover {
      background: rgba(148, 163, 184, 0.6);
    }
  }
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: ${fadeUp} 0.4s ease-out forwards;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
`;

const FieldLabel = styled.label`
  font-size: 13px;
  font-weight: 700;
  color: ${colors.gray700};
  letter-spacing: 0.01em;
`;

const FieldHint = styled.span`
  font-size: 12px;
  color: ${colors.gray500};
  line-height: 1.4;
`;

const RatioHelperSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(99, 102, 241, 0.04);
  border-radius: 12px;
  border: 1px solid rgba(99, 102, 241, 0.1);
  margin-top: -8px;
`;

const RatioHelperLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${colors.gray500};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const RatioChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const RatioChip = styled.button`
  padding: 6px 12px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  background: white;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  color: ${colors.primary};
  cursor: pointer;
  transition: all 0.15s ease;
  font-variant-numeric: tabular-nums;

  &:hover {
    background: ${colors.primary};
    color: white;
    border-color: ${colors.primary};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
  }

  &:active {
    transform: translateY(0);
  }
`;

const inputStyles = css`
  padding: 12px 16px;
  border: 1.5px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  font-size: 15px;
  background: rgba(255, 255, 255, 0.9);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    background: white;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
    animation: ${focusGlow} 0.3s ease-out forwards;
  }

  &::placeholder {
    color: ${colors.gray400};
  }

  &:hover:not(:focus) {
    border-color: rgba(203, 213, 225, 0.9);
    background: white;
  }
`;

const CurrencyInput = styled.input`
  ${inputStyles}
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  font-weight: 600;
`;

const TextInput = styled.input`
  ${inputStyles}
`;

const SplitFieldsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: rgba(248, 250, 252, 0.8);
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.5);
`;

const SplitFieldsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 14px;
`;

const SplitFieldLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${colors.gray600};
  letter-spacing: 0.02em;
`;

const PreviewBox = styled.div`
  padding: 20px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(139, 92, 246, 0.04) 100%);
  border-radius: 16px;
  border: 1px solid rgba(99, 102, 241, 0.15);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, ${colors.primary} 0%, #8b5cf6 50%, #06b6d4 100%);
    background-size: 200% 100%;
    animation: ${shimmer} 3s ease-in-out infinite;
  }
`;

const PreviewLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${colors.gray500};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
`;

const PreviewValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${colors.gray800};
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
`;

const ApplicabilitySection = styled.div`
  padding-top: 20px;
  margin-top: 4px;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 14px;
  padding: 20px 28px;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.98) 100%);
`;

const CancelButton = styled.button`
  padding: 12px 24px;
  border: 1.5px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 600;
  color: ${colors.gray700};
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: rgba(248, 250, 252, 1);
    border-color: rgba(203, 213, 225, 0.9);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const SaveButton = styled.button`
  padding: 12px 28px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, ${colors.primary} 0%, #8b5cf6 100%);
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(99, 102, 241, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

export default LimitOptionEditor;

