/**
 * LimitOptionsModal Component
 *
 * Premium Apple-inspired two-pane modal for comprehensive limit options configuration.
 * Features glassmorphism, refined animations, and elegant visual hierarchy.
 * Left pane: Option set configuration and options table
 * Right pane: Option editor (when editing/adding)
 */

import React, { useState, useCallback, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { XMarkIcon, ArrowPathIcon, ExclamationTriangleIcon, ChevronDownIcon, ChevronUpIcon, PlusIcon, TrashIcon, CurrencyDollarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import {
  CoverageLimitOption,
  CoverageLimitOptionSet,
  LimitStructure,
  SplitLimitComponent,
  LimitBasisConfig,
  SublimitEntry,
  LIMIT_BASIS_LABELS
} from '@app-types';
import { useLimitOptionSets } from '../../hooks/useLimitOptionSets';
import { LimitStructureSelector } from '../selectors/LimitStructureSelector';
import { LimitBasisSelector, getDefaultBasisForStructure } from '../selectors/LimitBasisSelector';
import { LimitOptionSetTable } from './LimitOptionSetTable';
import { LimitOptionEditor } from './LimitOptionEditor';
import { AISuggestionsPanel } from './AISuggestionsPanel';
import { SPLIT_LIMIT_PRESETS, LimitOptionTemplate } from '@app-types';
import { getSplitComponentsForTemplate } from '../../data/limitTemplates';
import { colors } from '../common/DesignSystem';
// Use native crypto.randomUUID() instead of the uuid package to avoid
// Vite "504 Outdated Optimize Dep" errors when this module is lazy-loaded.

// ============ Premium Animations ============
const modalEnter = keyframes`
  0% { opacity: 0; transform: scale(0.95) translateY(10px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
`;

const overlayEnter = keyframes`
  from { opacity: 0; backdrop-filter: blur(0px); }
  to { opacity: 1; backdrop-filter: blur(20px); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const breathe = keyframes`
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.02); }
`;

const slideIn = keyframes`
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
`;

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const toastEnter = keyframes`
  0% { opacity: 0; transform: translateY(-10px) scale(0.95); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
`;

const toastExit = keyframes`
  0% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-10px) scale(0.95); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.15); }
  50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.25); }
`;

interface LimitOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  coverageId: string;
  coverageName: string;
}

export const LimitOptionsModal: React.FC<LimitOptionsModalProps> = ({
  isOpen,
  onClose,
  productId,
  coverageId,
  coverageName
}) => {
  const {
    optionSets,
    currentSet,
    options,
    loading,
    error,
    hasLegacyData,
    migrationResult,
    selectOptionSet,
    createOptionSet,
    updateOptionSet,
    deleteOptionSet,
    addOption,
    updateOption,
    deleteOption,
    setDefault,
    reorderOptions,
    migrateFromLegacy,
    saveMigration
  } = useLimitOptionSets(productId, coverageId);

  const [editingOption, setEditingOption] = useState<Partial<CoverageLimitOption> | null>(null);
  const [isNewOption, setIsNewOption] = useState(false);
  const [showMigrationWarning, setShowMigrationWarning] = useState(false);
  const [localStructure, setLocalStructure] = useState<LimitStructure>('single');
  const [splitComponents, setSplitComponents] = useState<Omit<SplitLimitComponent, 'amount'>[]>([]);
  const [basisConfig, setBasisConfig] = useState<LimitBasisConfig>(getDefaultBasisForStructure('single'));
  const [sublimitsEnabled, setSublimitsEnabled] = useState(false);
  const [sublimits, setSublimits] = useState<SublimitEntry[]>([]);
  const [sublimitsExpanded, setSublimitsExpanded] = useState(false);

  // Bulk add state
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkAddInput, setBulkAddInput] = useState('');
  const [bulkAddLoading, setBulkAddLoading] = useState(false);

  // Success toast state
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Initialize from current set
  useEffect(() => {
    if (currentSet) {
      setLocalStructure(currentSet.structure);
      setSplitComponents(currentSet.splitComponents || []);
      setBasisConfig(currentSet.basisConfig || getDefaultBasisForStructure(currentSet.structure));
      setSublimitsEnabled(currentSet.sublimitsEnabled || false);
      setSublimits(currentSet.sublimits || []);
    }
  }, [currentSet]);

  // Check for legacy data on mount
  useEffect(() => {
    if (hasLegacyData && optionSets.length === 0) {
      setShowMigrationWarning(true);
    }
  }, [hasLegacyData, optionSets.length]);

  const handleStructureChange = useCallback(async (structure: LimitStructure) => {
    setLocalStructure(structure);

    // Set default split components for split structure
    if (structure === 'split') {
      setSplitComponents(SPLIT_LIMIT_PRESETS.autoLiability.map(c => ({ ...c })));
    }

    // Update basis config to match new structure
    const newBasisConfig = getDefaultBasisForStructure(structure);
    setBasisConfig(newBasisConfig);

    if (currentSet) {
      await updateOptionSet({ ...currentSet, structure, basisConfig: newBasisConfig });
    }
  }, [currentSet, updateOptionSet]);

  const handleBasisChange = useCallback(async (newBasisConfig: LimitBasisConfig) => {
    setBasisConfig(newBasisConfig);
    if (currentSet) {
      await updateOptionSet({ ...currentSet, basisConfig: newBasisConfig });
    }
  }, [currentSet, updateOptionSet]);

  const handleSublimitsToggle = useCallback(async (enabled: boolean) => {
    setSublimitsEnabled(enabled);
    if (enabled) {
      setSublimitsExpanded(true);
    }
    if (currentSet) {
      await updateOptionSet({ ...currentSet, sublimitsEnabled: enabled });
    }
  }, [currentSet, updateOptionSet]);

  const handleAddSublimit = useCallback(async () => {
    const newSublimit: SublimitEntry = {
      id: crypto.randomUUID(),
      label: '',
      amount: 0,
      appliesTo: '',
      isEnabled: true,
      displayOrder: sublimits.length
    };
    const updated = [...sublimits, newSublimit];
    setSublimits(updated);
    if (currentSet) {
      await updateOptionSet({ ...currentSet, sublimits: updated });
    }
  }, [sublimits, currentSet, updateOptionSet]);

  const handleUpdateSublimit = useCallback(async (id: string, updates: Partial<SublimitEntry>) => {
    const updated = sublimits.map(s => s.id === id ? { ...s, ...updates } : s);
    setSublimits(updated);
    if (currentSet) {
      await updateOptionSet({ ...currentSet, sublimits: updated });
    }
  }, [sublimits, currentSet, updateOptionSet]);

  const handleDeleteSublimit = useCallback(async (id: string) => {
    const updated = sublimits.filter(s => s.id !== id);
    setSublimits(updated);
    if (currentSet) {
      await updateOptionSet({ ...currentSet, sublimits: updated });
    }
  }, [sublimits, currentSet, updateOptionSet]);

  const handleCreateOptionSet = useCallback(async () => {
    await createOptionSet({
      name: 'Primary Limits',
      structure: localStructure,
      selectionMode: 'single',
      isRequired: false,
      splitComponents: localStructure === 'split' ? splitComponents : undefined,
      basisConfig,
      sublimitsEnabled,
      sublimits: sublimitsEnabled ? sublimits : undefined
    });
  }, [createOptionSet, localStructure, splitComponents, basisConfig, sublimitsEnabled, sublimits]);

  /** Format basis config for display as a chip */
  const formatBasisChip = (config: LimitBasisConfig, structure: LimitStructure): string => {
    const primary = LIMIT_BASIS_LABELS[config.primaryBasis] || config.primaryBasis;

    if (structure === 'occAgg' || structure === 'claimAgg') {
      const agg = config.aggregateBasis
        ? LIMIT_BASIS_LABELS[config.aggregateBasis]
        : 'Policy Term';
      return `${primary} / ${agg}`;
    }

    if (structure === 'scheduled') {
      const item = config.itemBasis
        ? LIMIT_BASIS_LABELS[config.itemBasis]
        : 'Per Item';
      return item;
    }

    return primary;
  };

  const handleAddOption = useCallback(() => {
    // Create empty option based on structure
    const newOption: Partial<CoverageLimitOption> = {
      label: '',
      isDefault: options.length === 0,
      isEnabled: true,
      displayOrder: options.length,
      structure: localStructure
    };

    // Initialize structure-specific values
    switch (localStructure) {
      case 'single':
      case 'csl':
        (newOption as any).amount = 0;
        break;
      case 'occAgg':
        (newOption as any).perOccurrence = 0;
        (newOption as any).aggregate = 0;
        break;
      case 'claimAgg':
        (newOption as any).perClaim = 0;
        (newOption as any).aggregate = 0;
        break;
      case 'split':
        (newOption as any).components = splitComponents.map(c => ({ ...c, amount: 0 }));
        break;
      case 'scheduled':
        (newOption as any).perItemMin = 0;
        (newOption as any).perItemMax = 0;
        (newOption as any).totalCap = 0;
        break;
    }

    setEditingOption(newOption);
    setIsNewOption(true);
  }, [options.length, localStructure, splitComponents]);

  const handleEditOption = useCallback((option: CoverageLimitOption) => {
    setEditingOption({ ...option });
    setIsNewOption(false);
  }, []);

  const handleSaveOption = useCallback(async () => {
    if (!editingOption) return;
    
    try {
      if (isNewOption) {
        await addOption(editingOption);
      } else {
        await updateOption(editingOption);
      }
      setEditingOption(null);
      setIsNewOption(false);
    } catch (err) {
      console.error('Error saving option:', err);
    }
  }, [editingOption, isNewOption, addOption, updateOption]);

  const handleCancelEdit = useCallback(() => {
    setEditingOption(null);
    setIsNewOption(false);
  }, []);

  const handleToggleEnabled = useCallback(async (optionId: string, enabled: boolean) => {
    await updateOption({ id: optionId, isEnabled: enabled });
  }, [updateOption]);

  /**
   * Handle quick-add from the table's preset chips
   * Creates and saves a limit option directly without opening the editor
   */
  const handleQuickAdd = useCallback(async (value: {
    amount?: number;
    perOccurrence?: number;
    aggregate?: number;
    perClaim?: number;
    components?: number[];
    perItemMax?: number;
    totalCap?: number;
  }) => {
    const newOption: Partial<CoverageLimitOption> = {
      label: '',
      isDefault: options.length === 0,
      isEnabled: true,
      displayOrder: options.length,
      structure: localStructure
    };

    // Build the option based on structure
    switch (localStructure) {
      case 'single':
      case 'csl':
        (newOption as any).amount = value.amount || 0;
        break;
      case 'occAgg':
        (newOption as any).perOccurrence = value.perOccurrence || 0;
        (newOption as any).aggregate = value.aggregate || 0;
        break;
      case 'claimAgg':
        (newOption as any).perClaim = value.perClaim || 0;
        (newOption as any).aggregate = value.aggregate || 0;
        break;
      case 'split':
        if (value.components && splitComponents.length > 0) {
          (newOption as any).components = splitComponents.map((c, idx) => ({
            ...c,
            amount: value.components![idx] || 0
          }));
        }
        break;
      case 'scheduled':
        (newOption as any).perItemMin = 0;
        (newOption as any).perItemMax = value.perItemMax || 0;
        (newOption as any).totalCap = value.totalCap || 0;
        break;
    }

    try {
      await addOption(newOption);
      // Show success toast
      setSuccessToast('Limit added');
      setTimeout(() => setSuccessToast(null), 2000);
    } catch (err) {
      console.error('Error adding quick option:', err);
    }
  }, [options.length, localStructure, splitComponents, addOption]);

  /**
   * Parse bulk input and create multiple limit options
   * Supports formats like: 100000, 250000, 500000, 1000000
   * Or shorthand: 100k, 250k, 500k, 1m, 2m
   * For occAgg/claimAgg: 1m/2m, 500k/1m (separated by /)
   * For split: 100/300/100 (in thousands)
   */
  const parseBulkInput = useCallback((input: string): Partial<CoverageLimitOption>[] => {
    const lines = input.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    const parsedOptions: Partial<CoverageLimitOption>[] = [];

    const parseAmount = (val: string): number => {
      const trimmed = val.trim().toLowerCase().replace(/[$,]/g, '');
      const match = trimmed.match(/^([\d.]+)\s*(k|m|b)?$/);
      if (!match) return 0;
      const num = parseFloat(match[1]);
      const suffix = match[2];
      if (suffix === 'k') return num * 1000;
      if (suffix === 'm') return num * 1000000;
      if (suffix === 'b') return num * 1000000000;
      return num;
    };

    lines.forEach((line, index) => {
      const baseOption: Partial<CoverageLimitOption> = {
        isDefault: options.length === 0 && index === 0,
        isEnabled: true,
        displayOrder: options.length + index,
        structure: localStructure
      };

      switch (localStructure) {
        case 'single':
        case 'csl': {
          const amount = parseAmount(line);
          if (amount > 0) {
            parsedOptions.push({
              ...baseOption,
              amount,
              label: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
            } as any);
          }
          break;
        }
        case 'occAgg': {
          const parts = line.split('/').map(s => s.trim());
          if (parts.length >= 2) {
            const perOccurrence = parseAmount(parts[0]);
            const aggregate = parseAmount(parts[1]);
            if (perOccurrence > 0 && aggregate > 0) {
              parsedOptions.push({
                ...baseOption,
                perOccurrence,
                aggregate,
                label: `${formatShortCurrency(perOccurrence)}/${formatShortCurrency(aggregate)}`
              } as any);
            }
          }
          break;
        }
        case 'claimAgg': {
          const parts = line.split('/').map(s => s.trim());
          if (parts.length >= 2) {
            const perClaim = parseAmount(parts[0]);
            const aggregate = parseAmount(parts[1]);
            if (perClaim > 0 && aggregate > 0) {
              parsedOptions.push({
                ...baseOption,
                perClaim,
                aggregate,
                label: `${formatShortCurrency(perClaim)}/${formatShortCurrency(aggregate)}`
              } as any);
            }
          }
          break;
        }
        case 'split': {
          const parts = line.split('/').map(s => s.trim());
          if (parts.length >= splitComponents.length) {
            const components = splitComponents.map((comp, i) => ({
              ...comp,
              amount: parseAmount(parts[i]) * (parts[i].includes('k') || parts[i].includes('m') ? 1 : 1000) // Assume thousands if no suffix
            }));
            const allValid = components.every(c => c.amount > 0);
            if (allValid) {
              parsedOptions.push({
                ...baseOption,
                components,
                label: parts.join('/')
              } as any);
            }
          }
          break;
        }
        default:
          break;
      }
    });

    return parsedOptions;
  }, [localStructure, options.length, splitComponents]);

  const formatShortCurrency = (value: number): string => {
    if (value >= 1000000) return `$${value / 1000000}M`;
    if (value >= 1000) return `$${value / 1000}K`;
    return `$${value}`;
  };

  const handleBulkAdd = useCallback(async () => {
    if (!bulkAddInput.trim()) return;

    setBulkAddLoading(true);
    try {
      const newOptions = parseBulkInput(bulkAddInput);
      for (const opt of newOptions) {
        await addOption(opt);
      }
      setBulkAddInput('');
      setShowBulkAdd(false);
    } catch (err) {
      console.error('Error adding bulk options:', err);
    } finally {
      setBulkAddLoading(false);
    }
  }, [bulkAddInput, parseBulkInput, addOption]);

  const handleMigrate = useCallback(async () => {
    await migrateFromLegacy();
    setShowMigrationWarning(false);
  }, [migrateFromLegacy]);

  const handleSaveMigration = useCallback(async () => {
    await saveMigration();
  }, [saveMigration]);

  // Handle applying an AI-suggested template
  const handleApplyTemplate = useCallback(async (template: LimitOptionTemplate) => {
    try {
      // Set the structure from template
      setLocalStructure(template.structure);

      // Get split components if applicable
      if (template.structure === 'split') {
        const comps = getSplitComponentsForTemplate(template.id);
        setSplitComponents(comps);
      }

      // Create the option set first
      const setId = await createOptionSet({
        name: template.name,
        structure: template.structure,
        selectionMode: 'single',
        isRequired: false,
        splitComponents: template.structure === 'split' ? getSplitComponentsForTemplate(template.id) : undefined
      });

      // Add all options from template
      for (const opt of template.options) {
        await addOption(opt);
      }
    } catch (err) {
      console.error('Error applying template:', err);
    }
  }, [createOptionSet, addOption]);

  if (!isOpen) return null;

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        {/* Premium Header with Gradient Accent */}
        <Header>
          <HeaderGradient />
          <HeaderContent>
            <HeaderIcon>
              <CurrencyDollarIcon />
            </HeaderIcon>
            <HeaderText>
              <Title>Limit Options</Title>
              <Subtitle>{coverageName}</Subtitle>
            </HeaderText>
          </HeaderContent>
          <CloseButton onClick={onClose} aria-label="Close modal">
            <XMarkIcon />
          </CloseButton>
        </Header>

        {/* Success Toast */}
        {successToast && (
          <SuccessToast>
            <CheckCircleIcon />
            {successToast}
          </SuccessToast>
        )}

        <Content>
          {/* Left Pane - Configuration */}
          <LeftPane $hasEditor={!!editingOption}>
            {loading ? (
              <LoadingState>
                <ArrowPathIcon className="spin" />
                <span>Loading limit options...</span>
              </LoadingState>
            ) : error ? (
              <ErrorState>
                <ExclamationTriangleIcon />
                <span>{error}</span>
              </ErrorState>
            ) : showMigrationWarning ? (
              <MigrationWarning>
                <WarningIcon><ExclamationTriangleIcon /></WarningIcon>
                <WarningTitle>Legacy Limits Detected</WarningTitle>
                <WarningText>
                  This coverage has limits in the legacy format. Would you like to migrate them to the new limit options system?
                </WarningText>
                <MigrationButtons>
                  <MigrateButton onClick={handleMigrate}>
                    Migrate Now
                  </MigrateButton>
                  <SkipButton onClick={() => setShowMigrationWarning(false)}>
                    Start Fresh
                  </SkipButton>
                </MigrationButtons>
              </MigrationWarning>
            ) : migrationResult ? (
              <MigrationPreview>
                <PreviewTitle>Migration Preview</PreviewTitle>
                <PreviewInfo>
                  Structure detected: <strong>{migrationResult.optionSet.structure}</strong>
                </PreviewInfo>
                <PreviewInfo>
                  Options to create: <strong>{migrationResult.options.length}</strong>
                </PreviewInfo>
                {migrationResult.warnings.length > 0 && (
                  <WarningsList>
                    {migrationResult.warnings.map((w, i) => (
                      <WarningItem key={i}>{w}</WarningItem>
                    ))}
                  </WarningsList>
                )}
                <MigrationButtons>
                  <MigrateButton onClick={handleSaveMigration}>
                    Confirm Migration
                  </MigrateButton>
                  <SkipButton onClick={() => setShowMigrationWarning(false)}>
                    Cancel
                  </SkipButton>
                </MigrationButtons>
              </MigrationPreview>
            ) : !currentSet ? (
              <SetupPane>
                <AISuggestionsPanel
                  coverageName={coverageName}
                  onApplyTemplate={handleApplyTemplate}
                />
                <Divider>
                  <DividerLine />
                  <DividerText>or configure manually</DividerText>
                  <DividerLine />
                </Divider>
                <SetupTitle>Configure Limit Structure</SetupTitle>
                <SetupDescription>
                  Choose how limits are structured for this coverage
                </SetupDescription>
                <LimitStructureSelector
                  value={localStructure}
                  onChange={handleStructureChange}
                />
                <CreateButton onClick={handleCreateOptionSet}>
                  Create Empty Option Set
                </CreateButton>
              </SetupPane>
            ) : (
              <>
                <StructureBasisGrid>
                  <StructureSection>
                    <SectionLabelRow>
                      <SectionLabel>Limit Structure</SectionLabel>
                    </SectionLabelRow>
                    <LimitStructureSelector
                      value={localStructure}
                      onChange={handleStructureChange}
                      columns={2}
                      rows={3}
                    />
                  </StructureSection>

                  <BasisSection>
                    <SectionLabel>Limit Basis</SectionLabel>
                    <LimitBasisSelector
                      structure={localStructure}
                      value={basisConfig}
                      onChange={handleBasisChange}
                      splitComponents={splitComponents}
                      hasScheduleCap={localStructure === 'scheduled'}
                    />
                  </BasisSection>
                </StructureBasisGrid>

                <OptionsSection>
                  <LimitOptionSetTable
                    optionSet={currentSet}
                    options={options}
                    onAddOption={handleAddOption}
                    onEditOption={handleEditOption}
                    onDeleteOption={deleteOption}
                    onSetDefault={setDefault}
                    onReorder={reorderOptions}
                    onToggleEnabled={handleToggleEnabled}
                    onQuickAdd={handleQuickAdd}
                  />
                </OptionsSection>

                <SublimitsSection>
                  <SublimitsToggleRow>
                    <SublimitsToggle
                      type="checkbox"
                      id="sublimits-toggle"
                      checked={sublimitsEnabled}
                      onChange={(e) => handleSublimitsToggle(e.target.checked)}
                    />
                    <SublimitsLabel htmlFor="sublimits-toggle">
                      Enable Sublimits
                    </SublimitsLabel>
                    <SublimitsHint>
                      Add peril or category-specific caps within the primary limit
                    </SublimitsHint>
                    {sublimitsEnabled && (
                      <SublimitsExpandButton onClick={() => setSublimitsExpanded(!sublimitsExpanded)}>
                        {sublimitsExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                      </SublimitsExpandButton>
                    )}
                  </SublimitsToggleRow>

                  {sublimitsEnabled && sublimitsExpanded && (
                    <SublimitsContent>
                      {sublimits.length === 0 ? (
                        <SublimitsEmpty>
                          No sublimits configured. Add one below.
                        </SublimitsEmpty>
                      ) : (
                        <SublimitsList>
                          {sublimits.map((sublimit) => (
                            <SublimitRow key={sublimit.id}>
                              <SublimitInput
                                type="text"
                                placeholder="Label (e.g., Theft Sublimit)"
                                value={sublimit.label}
                                onChange={(e) => handleUpdateSublimit(sublimit.id, { label: e.target.value })}
                              />
                              <SublimitAmountInput
                                type="number"
                                placeholder="Amount"
                                value={sublimit.amount || ''}
                                onChange={(e) => handleUpdateSublimit(sublimit.id, { amount: Number(e.target.value) })}
                              />
                              <SublimitInput
                                type="text"
                                placeholder="Applies to (e.g., Theft)"
                                value={sublimit.appliesTo}
                                onChange={(e) => handleUpdateSublimit(sublimit.id, { appliesTo: e.target.value })}
                              />
                              <SublimitDeleteButton onClick={() => handleDeleteSublimit(sublimit.id)}>
                                <TrashIcon />
                              </SublimitDeleteButton>
                            </SublimitRow>
                          ))}
                        </SublimitsList>
                      )}
                      <AddSublimitButton onClick={handleAddSublimit}>
                        <PlusIcon /> Add Sublimit
                      </AddSublimitButton>
                    </SublimitsContent>
                  )}
                </SublimitsSection>
              </>
            )}
          </LeftPane>

          {/* Right Pane - Editor */}
          {editingOption && (
            <RightPane>
              <LimitOptionEditor
                option={editingOption}
                structure={localStructure}
                splitComponents={splitComponents}
                onChange={setEditingOption}
                onSave={handleSaveOption}
                onCancel={handleCancelEdit}
                isNew={isNewOption}
              />
            </RightPane>
          )}
        </Content>
      </Modal>
    </Overlay>
  );
};

// ============ Premium Styled Components ============

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
  animation: ${overlayEnter} 0.3s ease-out forwards;
`;

const Modal = styled.div`
  width: 100%;
  max-width: 1500px;
  max-height: 90vh;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(40px) saturate(200%);
  -webkit-backdrop-filter: blur(40px) saturate(200%);
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.2),
    0 25px 80px -20px rgba(0, 0, 0, 0.35),
    0 10px 40px -15px rgba(0, 0, 0, 0.2),
    0 0 60px -10px rgba(99, 102, 241, 0.15);
  animation: ${modalEnter} 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  will-change: transform, opacity;
`;

const SuccessToast = styled.div`
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, ${colors.success} 0%, #059669 100%);
  color: white;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
  z-index: 100;
  animation: ${toastEnter} 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;

  svg {
    width: 18px;
    height: 18px;
  }
`;

const Header = styled.div`
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.7);
  background: linear-gradient(180deg, rgba(255, 255, 255, 1) 0%, rgba(248, 250, 252, 0.95) 100%);
  overflow: hidden;
`;

const HeaderGradient = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg,
    ${colors.primary} 0%,
    #8b5cf6 35%,
    #06b6d4 70%,
    ${colors.primary} 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 3s ease-in-out infinite;
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const HeaderIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, ${colors.primary} 0%, #8b5cf6 100%);
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);

  svg {
    width: 26px;
    height: 26px;
    color: white;
  }
`;

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: ${colors.gray800};
  letter-spacing: -0.02em;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
`;

const Subtitle = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${colors.gray500};
  letter-spacing: -0.01em;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(241, 245, 249, 0.8);
  cursor: pointer;
  color: ${colors.gray500};
  border-radius: 12px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  svg { width: 22px; height: 22px; }

  &:hover {
    background: rgba(226, 232, 240, 0.9);
    color: ${colors.gray700};
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const Content = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.5) 0%, rgba(241, 245, 249, 0.3) 100%);
`;

const LeftPane = styled.div<{ $hasEditor: boolean }>`
  flex: 1;
  overflow-y: auto;
  padding: 28px;
  border-right: ${({ $hasEditor }) => $hasEditor ? `1px solid rgba(226, 232, 240, 0.7)` : 'none'};

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

const RightPane = styled.div`
  width: 420px;
  flex-shrink: 0;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.7);
  animation: ${slideIn} 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px;
  color: ${colors.gray500};
  animation: ${fadeUp} 0.4s ease-out forwards;

  svg {
    width: 40px;
    height: 40px;
    margin-bottom: 16px;
    color: ${colors.primary};
  }

  .spin {
    animation: ${spin} 1s linear infinite;
  }

  span {
    font-size: 15px;
    font-weight: 500;
    letter-spacing: -0.01em;
  }
`;

const ErrorState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px;
  color: ${colors.error};
  animation: ${fadeUp} 0.4s ease-out forwards;

  svg {
    width: 40px;
    height: 40px;
    margin-bottom: 16px;
  }

  span {
    font-size: 15px;
    font-weight: 500;
    letter-spacing: -0.01em;
  }
`;

const MigrationWarning = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 64px 32px;
  animation: ${fadeUp} 0.4s ease-out forwards;
`;

const WarningIcon = styled.div`
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%);
  border-radius: 20px;
  color: ${colors.warning};
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(245, 158, 11, 0.15);

  svg { width: 32px; height: 32px; }
`;

const WarningTitle = styled.h3`
  margin: 0 0 10px;
  font-size: 20px;
  font-weight: 700;
  color: ${colors.gray800};
  letter-spacing: -0.02em;
`;

const WarningText = styled.p`
  margin: 0 0 28px;
  font-size: 15px;
  line-height: 1.6;
  color: ${colors.gray600};
  max-width: 420px;
`;

const MigrationButtons = styled.div`
  display: flex;
  gap: 14px;
`;

const MigrateButton = styled.button`
  padding: 12px 24px;
  background: linear-gradient(135deg, ${colors.primary} 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
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

const SkipButton = styled.button`
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.9);
  color: ${colors.gray700};
  border: 1.5px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: rgba(248, 250, 252, 1);
    border-color: rgba(203, 213, 225, 0.9);
  }
`;

const MigrationPreview = styled.div`
  padding: 28px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  animation: ${fadeUp} 0.4s ease-out forwards;
`;

const PreviewTitle = styled.h4`
  margin: 0 0 20px;
  font-size: 17px;
  font-weight: 700;
  color: ${colors.gray800};
  letter-spacing: -0.01em;
`;

const PreviewInfo = styled.div`
  font-size: 14px;
  color: ${colors.gray600};
  margin-bottom: 10px;
  line-height: 1.5;

  strong {
    color: ${colors.gray800};
    font-weight: 600;
  }
`;

const WarningsList = styled.ul`
  margin: 20px 0;
  padding-left: 0;
  list-style: none;
`;

const WarningItem = styled.li`
  font-size: 13px;
  color: ${colors.warning};
  margin-bottom: 6px;
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.08);
  border-radius: 8px;

  &::before {
    content: '⚠️ ';
    margin-right: 4px;
  }
`;

const SetupPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
  animation: ${fadeUp} 0.4s ease-out forwards;
`;

const SetupTitle = styled.h3`
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: ${colors.gray800};
  letter-spacing: -0.02em;
`;

const SetupDescription = styled.p`
  margin: -8px 0 0;
  font-size: 15px;
  color: ${colors.gray600};
  line-height: 1.5;
`;

const CreateButton = styled.button`
  align-self: flex-start;
  padding: 14px 28px;
  background: linear-gradient(135deg, ${colors.primary} 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(99, 102, 241, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

const StructureBasisGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-bottom: 28px;
`;

const StructureSection = styled.div`
  padding: 20px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
`;

const SectionLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
`;

const SectionLabel = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: ${colors.gray700};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const BasisChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15);
  border: 1px solid ${colors.primary}30;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: ${colors.primary};
  letter-spacing: 0.02em;
`;

const OptionsSection = styled.div`
  animation: ${fadeUp} 0.4s ease-out 0.1s both;
`;

const BasisSection = styled.div`
  padding: 20px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
  height: fit-content;
`;

const SublimitsSection = styled.div`
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.8) 100%);
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(203, 213, 225, 0.8);
  }
`;

const SublimitsToggleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SublimitsToggle = styled.input`
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: ${colors.primary};
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }
`;

const SublimitsLabel = styled.label`
  font-size: 15px;
  font-weight: 600;
  color: ${colors.gray800};
  cursor: pointer;
  letter-spacing: -0.01em;
`;

const SublimitsHint = styled.span`
  font-size: 13px;
  color: ${colors.gray500};
  flex: 1;
  line-height: 1.4;
`;

const SublimitsExpandButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(241, 245, 249, 0.8);
  cursor: pointer;
  color: ${colors.gray500};
  border-radius: 10px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  svg {
    width: 18px;
    height: 18px;
    transition: transform 0.2s ease;
  }

  &:hover {
    background: rgba(226, 232, 240, 0.9);
    color: ${colors.gray700};
    transform: scale(1.05);
  }
`;

const SublimitsContent = styled.div`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
  animation: ${fadeUp} 0.3s ease-out forwards;
`;

const SublimitsEmpty = styled.div`
  font-size: 14px;
  color: ${colors.gray500};
  text-align: center;
  padding: 20px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  border: 1px dashed rgba(203, 213, 225, 0.6);
`;

const SublimitsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
`;

const SublimitRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.5);
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(203, 213, 225, 0.8);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }
`;

const SublimitInput = styled.input`
  flex: 1;
  padding: 10px 14px;
  border: 1.5px solid rgba(226, 232, 240, 0.8);
  border-radius: 10px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.9);
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
    background: white;
  }

  &::placeholder {
    color: ${colors.gray400};
  }
`;

const SublimitAmountInput = styled.input`
  width: 130px;
  padding: 10px 14px;
  border: 1.5px solid rgba(226, 232, 240, 0.8);
  border-radius: 10px;
  font-size: 14px;
  font-family: 'SF Mono', ui-monospace, monospace;
  background: rgba(255, 255, 255, 0.9);
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
    background: white;
  }

  &::placeholder {
    color: ${colors.gray400};
  }
`;

const SublimitDeleteButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(241, 245, 249, 0.6);
  cursor: pointer;
  color: ${colors.gray400};
  border-radius: 10px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    color: ${colors.error};
    transform: scale(1.05);
  }
`;

const AddSublimitButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 18px;
  border: 2px dashed rgba(203, 213, 225, 0.6);
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: ${colors.gray600};
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    border-color: ${colors.primary};
    color: ${colors.primary};
    background: rgba(99, 102, 241, 0.05);
    transform: translateY(-1px);
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin: 12px 0;
`;

const DividerLine = styled.div`
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(203, 213, 225, 0.6) 50%, transparent 100%);
`;

const DividerText = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${colors.gray400};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

/* Bulk Add Styles */
const BulkAddSection = styled.div`
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px dashed ${colors.gray200};
`;

const BulkAddToggle = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: ${({ $active }) => $active
    ? `linear-gradient(135deg, ${colors.primary}10 0%, ${colors.primary}15 100%)`
    : `linear-gradient(135deg, ${colors.gray50} 0%, ${colors.gray100} 100%)`};
  border: 1.5px solid ${({ $active }) => $active ? colors.primary : colors.gray300};
  border-style: ${({ $active }) => $active ? 'solid' : 'dashed'};
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ $active }) => $active ? colors.primary : colors.gray600};
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  justify-content: center;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    border-color: ${colors.primary};
    color: ${colors.primary};
    background: linear-gradient(135deg, ${colors.primary}08 0%, ${colors.primary}12 100%);
  }
`;

const BulkAddContent = styled.div`
  margin-top: 16px;
  padding: 20px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.8) 100%);
  border: 1px solid ${colors.gray200};
  border-radius: 16px;
  animation: ${fadeUp} 0.3s ease-out;
`;

const BulkAddHeader = styled.div`
  margin-bottom: 16px;
`;

const BulkAddTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${colors.gray800};
  margin-bottom: 4px;
`;

const BulkAddSubtitle = styled.div`
  font-size: 13px;
  color: ${colors.gray500};
`;

const BulkAddInputRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: start;
`;

const BulkAddInputWrapper = styled.div`
  flex: 1;
`;

const BulkAddExamples = styled.div`
  font-size: 11px;
  color: ${colors.gray400};
  margin-top: 8px;

  strong {
    color: ${colors.gray500};
  }
`;

const BulkAddPreview = styled.div`
  min-width: 160px;
  padding: 12px;
  background: white;
  border: 1px solid ${colors.gray200};
  border-radius: 10px;
`;

const BulkAddPreviewTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${colors.gray500};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
`;

const BulkAddPreviewList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const BulkAddPreviewItem = styled.div`
  padding: 4px 10px;
  background: linear-gradient(135deg, ${colors.primary}10 0%, ${colors.primary}15 100%);
  color: ${colors.primary};
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`;

const BulkAddPreviewMore = styled.div`
  padding: 4px 10px;
  background: ${colors.gray100};
  color: ${colors.gray500};
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
`;

const BulkAddTextarea = styled.textarea`
  width: 100%;
  padding: 12px;
  border: 1px solid ${colors.gray300};
  border-radius: 8px;
  font-size: 13px;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  line-height: 1.6;
  resize: vertical;
  min-height: 120px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px ${colors.primary}20;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &::placeholder {
    color: ${colors.gray400};
  }
`;

const BulkAddActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 12px;
  justify-content: flex-end;
`;

const BulkAddButton = styled.button`
  padding: 10px 20px;
  background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${colors.primary}40;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const BulkAddCancelButton = styled.button`
  padding: 10px 20px;
  background: ${colors.gray100};
  border: 1px solid ${colors.gray200};
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: ${colors.gray600};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${colors.gray200};
  }
`;

export default LimitOptionsModal;

