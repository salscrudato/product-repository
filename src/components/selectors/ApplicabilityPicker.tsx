/**
 * ApplicabilityPicker Component
 * 
 * Structured picker for limit applicability including states,
 * coverage parts, loss types, and perils.
 * Replaces free-text comma-separated inputs.
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import {
  GlobeAmericasIcon,
  BuildingOfficeIcon,
  ShieldExclamationIcon,
  FireIcon,
  XMarkIcon,
  ChevronDownIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import {
  LimitApplicability,
  CoveragePart,
  LossType,
  Peril
} from '@app-types';
import { colors } from '../common/DesignSystem';

interface ApplicabilityPickerProps {
  value: LimitApplicability;
  onChange: (applicability: LimitApplicability) => void;
  showStates?: boolean;
  showCoverageParts?: boolean;
  showLossTypes?: boolean;
  showPerils?: boolean;
}

// US States list
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

const COVERAGE_PARTS: { value: CoveragePart; label: string }[] = [
  { value: 'Building', label: 'Building' },
  { value: 'BPP', label: 'Business Personal Property' },
  { value: 'BI', label: 'Business Income' },
  { value: 'EE', label: 'Extra Expense' },
  { value: 'Contents', label: 'Contents' },
  { value: 'Equipment', label: 'Equipment' },
  { value: 'Inventory', label: 'Inventory' },
  { value: 'Stock', label: 'Stock' },
  { value: 'Improvements', label: 'Improvements' }
];

const LOSS_TYPES: { value: LossType; label: string }[] = [
  { value: 'BodilyInjury', label: 'Bodily Injury' },
  { value: 'PropertyDamage', label: 'Property Damage' },
  { value: 'MedicalPayments', label: 'Medical Payments' },
  { value: 'PersonalInjury', label: 'Personal Injury' },
  { value: 'AdvertisingInjury', label: 'Advertising Injury' },
  { value: 'ProductsCompletedOps', label: 'Products & Completed Ops' }
];

const PERILS: { value: Peril; label: string }[] = [
  { value: 'Fire', label: 'Fire' },
  { value: 'Lightning', label: 'Lightning' },
  { value: 'WindHail', label: 'Wind/Hail' },
  { value: 'Water', label: 'Water Damage' },
  { value: 'Theft', label: 'Theft' },
  { value: 'Vandalism', label: 'Vandalism' },
  { value: 'Flood', label: 'Flood' },
  { value: 'Earthquake', label: 'Earthquake' }
];

export const ApplicabilityPicker: React.FC<ApplicabilityPickerProps> = ({
  value,
  onChange,
  showStates = true,
  showCoverageParts = true,
  showLossTypes = false,
  showPerils = false
}) => {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = useCallback((section: string) => {
    setOpenSection(prev => prev === section ? null : section);
  }, []);

  const handleAllStatesToggle = useCallback((checked: boolean) => {
    if (checked) {
      // When selecting "All States", set allStates true and populate states with all US states
      onChange({
        ...value,
        allStates: true,
        states: [...US_STATES]
      });
    } else {
      onChange({
        ...value,
        allStates: false,
        states: undefined
      });
    }
  }, [value, onChange]);

  const handleStateToggle = useCallback((state: string) => {
    const currentStates = value.states || [];
    const newStates = currentStates.includes(state)
      ? currentStates.filter(s => s !== state)
      : [...currentStates, state];

    // If all states were selected and we're deselecting one, turn off allStates
    const allStatesNowSelected = newStates.length === US_STATES.length &&
      US_STATES.every(s => newStates.includes(s));

    onChange({
      ...value,
      states: newStates.length > 0 ? newStates : undefined,
      allStates: allStatesNowSelected
    });
  }, [value, onChange]);

  const handleMultiSelect = useCallback(<T extends string>(
    field: 'coverageParts' | 'lossTypes' | 'perils',
    item: T
  ) => {
    const current = (value[field] as T[] | undefined) || [];
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    onChange({
      ...value,
      [field]: updated.length > 0 ? updated : undefined
    });
  }, [value, onChange]);

  const removeTag = useCallback((field: keyof LimitApplicability, item: string) => {
    const current = (value[field] as string[] | undefined) || [];
    const updated = current.filter(i => i !== item);
    onChange({
      ...value,
      [field]: updated.length > 0 ? updated : undefined
    });
  }, [value, onChange]);

  // Collect all selected tags for display (excluding states when allStates or many states)
  const allTags: { field: keyof LimitApplicability; value: string; label: string }[] = [];

  // Only add individual state tags if not all states and less than 6 states selected
  if (!value.allStates && value.states?.length && value.states.length < 6) {
    value.states.forEach(s => allTags.push({ field: 'states', value: s, label: s }));
  }
  if (value.coverageParts?.length) {
    value.coverageParts.forEach(c => {
      const label = COVERAGE_PARTS.find(cp => cp.value === c)?.label || c;
      allTags.push({ field: 'coverageParts', value: c, label });
    });
  }
  if (value.lossTypes?.length) {
    value.lossTypes.forEach(l => {
      const label = LOSS_TYPES.find(lt => lt.value === l)?.label || l;
      allTags.push({ field: 'lossTypes', value: l, label });
    });
  }
  if (value.perils?.length) {
    value.perils.forEach(p => {
      const label = PERILS.find(pr => pr.value === p)?.label || p;
      allTags.push({ field: 'perils', value: p, label });
    });
  }

  // Calculate excluded states when allStates is true
  const excludedStates = value.allStates && value.states
    ? US_STATES.filter(s => !value.states?.includes(s))
    : [];

  return (
    <Container>
      <Label>Applicability</Label>

      {/* Selected Tags Display */}
      {(value.allStates || value.states?.length || allTags.length > 0) && (
        <TagsContainer>
          {value.allStates && (
            <Tag $color={colors.primary}>
              {excludedStates.length > 0
                ? `All States except ${excludedStates.length}`
                : 'All States'}
              <TagRemove onClick={() => handleAllStatesToggle(false)}>
                <XMarkIcon />
              </TagRemove>
            </Tag>
          )}
          {!value.allStates && value.states && value.states.length >= 6 && (
            <Tag $color={colors.info}>
              {value.states.length} States
            </Tag>
          )}
          {allTags.map((tag, i) => (
            <Tag key={`${tag.field}-${tag.value}-${i}`} $color={colors.gray600}>
              {tag.label}
              <TagRemove onClick={() => removeTag(tag.field, tag.value)}>
                <XMarkIcon />
              </TagRemove>
            </Tag>
          ))}
        </TagsContainer>
      )}

      {/* Section Toggles */}
      <SectionsContainer>
        {showStates && (
          <Section>
            <SectionHeader onClick={() => toggleSection('states')}>
              <SectionIcon><GlobeAmericasIcon /></SectionIcon>
              <SectionTitle>States</SectionTitle>
              <SectionCount>{value.allStates ? 'All' : value.states?.length || 0}</SectionCount>
              <ChevronIcon $open={openSection === 'states'}><ChevronDownIcon /></ChevronIcon>
            </SectionHeader>
            {openSection === 'states' && (
              <SectionContent>
                <AllStatesToggle>
                  <Checkbox
                    type="checkbox"
                    checked={value.allStates || false}
                    onChange={(e) => handleAllStatesToggle(e.target.checked)}
                  />
                  <span>All States</span>
                  {value.allStates && <AllStatesHint>(click states below to exclude)</AllStatesHint>}
                </AllStatesToggle>
                <StatesGrid>
                  {US_STATES.map(state => (
                    <StateChip
                      key={state}
                      $selected={value.states?.includes(state) || false}
                      onClick={() => handleStateToggle(state)}
                    >
                      {state}
                      {value.states?.includes(state) && <CheckIcon />}
                    </StateChip>
                  ))}
                </StatesGrid>
              </SectionContent>
            )}
          </Section>
        )}

        {showCoverageParts && (
          <Section>
            <SectionHeader onClick={() => toggleSection('coverageParts')}>
              <SectionIcon><BuildingOfficeIcon /></SectionIcon>
              <SectionTitle>Coverage Parts</SectionTitle>
              <SectionCount>{value.coverageParts?.length || 0}</SectionCount>
              <ChevronIcon $open={openSection === 'coverageParts'}><ChevronDownIcon /></ChevronIcon>
            </SectionHeader>
            {openSection === 'coverageParts' && (
              <SectionContent>
                <OptionsList>
                  {COVERAGE_PARTS.map(cp => (
                    <OptionItem
                      key={cp.value}
                      $selected={value.coverageParts?.includes(cp.value) || false}
                      onClick={() => handleMultiSelect('coverageParts', cp.value)}
                    >
                      <Checkbox
                        type="checkbox"
                        checked={value.coverageParts?.includes(cp.value) || false}
                        readOnly
                      />
                      <span>{cp.label}</span>
                    </OptionItem>
                  ))}
                </OptionsList>
              </SectionContent>
            )}
          </Section>
        )}

        {showLossTypes && (
          <Section>
            <SectionHeader onClick={() => toggleSection('lossTypes')}>
              <SectionIcon><ShieldExclamationIcon /></SectionIcon>
              <SectionTitle>Loss Types</SectionTitle>
              <SectionCount>{value.lossTypes?.length || 0}</SectionCount>
              <ChevronIcon $open={openSection === 'lossTypes'}><ChevronDownIcon /></ChevronIcon>
            </SectionHeader>
            {openSection === 'lossTypes' && (
              <SectionContent>
                <OptionsList>
                  {LOSS_TYPES.map(lt => (
                    <OptionItem
                      key={lt.value}
                      $selected={value.lossTypes?.includes(lt.value) || false}
                      onClick={() => handleMultiSelect('lossTypes', lt.value)}
                    >
                      <Checkbox
                        type="checkbox"
                        checked={value.lossTypes?.includes(lt.value) || false}
                        readOnly
                      />
                      <span>{lt.label}</span>
                    </OptionItem>
                  ))}
                </OptionsList>
              </SectionContent>
            )}
          </Section>
        )}

        {showPerils && (
          <Section>
            <SectionHeader onClick={() => toggleSection('perils')}>
              <SectionIcon><FireIcon /></SectionIcon>
              <SectionTitle>Perils</SectionTitle>
              <SectionCount>{value.perils?.length || 0}</SectionCount>
              <ChevronIcon $open={openSection === 'perils'}><ChevronDownIcon /></ChevronIcon>
            </SectionHeader>
            {openSection === 'perils' && (
              <SectionContent>
                <OptionsList>
                  {PERILS.map(p => (
                    <OptionItem
                      key={p.value}
                      $selected={value.perils?.includes(p.value) || false}
                      onClick={() => handleMultiSelect('perils', p.value)}
                    >
                      <Checkbox
                        type="checkbox"
                        checked={value.perils?.includes(p.value) || false}
                        readOnly
                      />
                      <span>{p.label}</span>
                    </OptionItem>
                  ))}
                </OptionsList>
              </SectionContent>
            )}
          </Section>
        )}
      </SectionsContainer>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: ${colors.gray700};
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Tag = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: ${({ $color }) => `${$color}15`};
  color: ${({ $color }) => $color};
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
`;

const TagRemove = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  opacity: 0.7;

  &:hover { opacity: 1; }

  svg { width: 12px; height: 12px; }
`;

const SectionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid ${colors.gray200};
  border-radius: 8px;
  overflow: hidden;
`;

const Section = styled.div`
  border-bottom: 1px solid ${colors.gray100};
  &:last-child { border-bottom: none; }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
  background: ${colors.gray50};

  &:hover { background: ${colors.gray100}; }
`;

const SectionIcon = styled.div`
  width: 20px;
  height: 20px;
  color: ${colors.gray500};
  svg { width: 100%; height: 100%; }
`;

const SectionTitle = styled.div`
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: ${colors.gray700};
`;

const SectionCount = styled.div`
  font-size: 12px;
  color: ${colors.gray500};
  background: ${colors.gray200};
  padding: 2px 8px;
  border-radius: 10px;
`;

const ChevronIcon = styled.div<{ $open: boolean }>`
  width: 16px;
  height: 16px;
  color: ${colors.gray400};
  transform: rotate(${({ $open }) => $open ? '180deg' : '0deg'});
  transition: transform 0.2s ease;
  svg { width: 100%; height: 100%; }
`;

const SectionContent = styled.div`
  padding: 12px 14px;
  background: white;
`;

const AllStatesToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${colors.gray700};
  cursor: pointer;
  margin-bottom: 12px;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: ${colors.primary};
`;

const AllStatesHint = styled.span`
  font-size: 11px;
  color: ${colors.gray500};
  font-weight: 400;
  margin-left: 4px;
`;

const StatesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
  gap: 6px;
`;

const StateChip = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  background: ${({ $selected }) => $selected ? colors.primary : colors.gray100};
  color: ${({ $selected }) => $selected ? 'white' : colors.gray700};
  transition: all 0.15s ease;

  &:hover {
    background: ${({ $selected }) => $selected ? colors.primary : colors.gray200};
  }

  svg { width: 12px; height: 12px; }
`;

const OptionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const OptionItem = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: ${colors.gray700};
  background: ${({ $selected }) => $selected ? `${colors.primary}10` : 'transparent'};

  &:hover {
    background: ${({ $selected }) => $selected ? `${colors.primary}15` : colors.gray50};
  }
`;

export default ApplicabilityPicker;

