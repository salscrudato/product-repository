/**
 * LimitOptionsModal Component
 * 
 * Two-pane modal for comprehensive limit options configuration.
 * Left pane: Option set configuration and options table
 * Right pane: Option editor (when editing/adding)
 */

import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { XMarkIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import {
  CoverageLimitOption,
  CoverageLimitOptionSet,
  LimitStructure,
  SplitLimitComponent
} from '@types';
import { useLimitOptionSets } from '../../hooks/useLimitOptionSets';
import { LimitStructureSelector } from '../selectors/LimitStructureSelector';
import { LimitOptionSetTable } from './LimitOptionSetTable';
import { LimitOptionEditor } from './LimitOptionEditor';
import { SPLIT_LIMIT_PRESETS } from '@types';
import { colors } from '../common/DesignSystem';

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

  // Initialize from current set
  useEffect(() => {
    if (currentSet) {
      setLocalStructure(currentSet.structure);
      setSplitComponents(currentSet.splitComponents || []);
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
    
    if (currentSet) {
      await updateOptionSet({ ...currentSet, structure });
    }
  }, [currentSet, updateOptionSet]);

  const handleCreateOptionSet = useCallback(async () => {
    await createOptionSet({
      name: 'Primary Limits',
      structure: localStructure,
      selectionMode: 'single',
      isRequired: false,
      splitComponents: localStructure === 'split' ? splitComponents : undefined
    });
  }, [createOptionSet, localStructure, splitComponents]);

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
      case 'split':
        (newOption as any).components = splitComponents.map(c => ({ ...c, amount: 0 }));
        break;
      case 'sublimit':
        (newOption as any).amount = 0;
        (newOption as any).sublimitTag = '';
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

  const handleMigrate = useCallback(async () => {
    await migrateFromLegacy();
    setShowMigrationWarning(false);
  }, [migrateFromLegacy]);

  const handleSaveMigration = useCallback(async () => {
    await saveMigration();
  }, [saveMigration]);

  if (!isOpen) return null;

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <HeaderContent>
            <Title>Limit Options</Title>
            <Subtitle>{coverageName}</Subtitle>
          </HeaderContent>
          <CloseButton onClick={onClose}>
            <XMarkIcon />
          </CloseButton>
        </Header>

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
                <SetupTitle>Configure Limit Structure</SetupTitle>
                <SetupDescription>
                  Choose how limits are structured for this coverage
                </SetupDescription>
                <LimitStructureSelector
                  value={localStructure}
                  onChange={handleStructureChange}
                />
                <CreateButton onClick={handleCreateOptionSet}>
                  Create Option Set
                </CreateButton>
              </SetupPane>
            ) : (
              <>
                <StructureSection>
                  <SectionLabel>Limit Structure</SectionLabel>
                  <LimitStructureSelector
                    value={localStructure}
                    onChange={handleStructureChange}
                  />
                </StructureSection>

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
                  />
                </OptionsSection>
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

// Styled Components
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
`;

const Modal = styled.div`
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  background: white;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid ${colors.gray200};
`;

const HeaderContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: ${colors.gray800};
`;

const Subtitle = styled.span`
  font-size: 14px;
  color: ${colors.gray500};
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  cursor: pointer;
  color: ${colors.gray500};
  border-radius: 8px;

  svg { width: 24px; height: 24px; }

  &:hover {
    background: ${colors.gray100};
    color: ${colors.gray700};
  }
`;

const Content = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const LeftPane = styled.div<{ $hasEditor: boolean }>`
  flex: ${({ $hasEditor }) => $hasEditor ? '1' : '1'};
  overflow-y: auto;
  padding: 24px;
  border-right: ${({ $hasEditor }) => $hasEditor ? `1px solid ${colors.gray200}` : 'none'};
`;

const RightPane = styled.div`
  width: 400px;
  flex-shrink: 0;
  overflow: hidden;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: ${colors.gray500};

  svg {
    width: 32px;
    height: 32px;
    margin-bottom: 12px;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ErrorState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: ${colors.error};

  svg {
    width: 32px;
    height: 32px;
    margin-bottom: 12px;
  }
`;

const MigrationWarning = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px;
`;

const WarningIcon = styled.div`
  width: 48px;
  height: 48px;
  color: ${colors.warning};
  margin-bottom: 16px;

  svg { width: 100%; height: 100%; }
`;

const WarningTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: ${colors.gray800};
`;

const WarningText = styled.p`
  margin: 0 0 24px;
  font-size: 14px;
  color: ${colors.gray600};
  max-width: 400px;
`;

const MigrationButtons = styled.div`
  display: flex;
  gap: 12px;
`;

const MigrateButton = styled.button`
  padding: 10px 20px;
  background: ${colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:hover { background: ${colors.primaryDark}; }
`;

const SkipButton = styled.button`
  padding: 10px 20px;
  background: white;
  color: ${colors.gray700};
  border: 1px solid ${colors.gray300};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:hover { background: ${colors.gray50}; }
`;

const MigrationPreview = styled.div`
  padding: 24px;
  background: ${colors.gray50};
  border-radius: 12px;
`;

const PreviewTitle = styled.h4`
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: ${colors.gray800};
`;

const PreviewInfo = styled.div`
  font-size: 14px;
  color: ${colors.gray600};
  margin-bottom: 8px;

  strong { color: ${colors.gray800}; }
`;

const WarningsList = styled.ul`
  margin: 16px 0;
  padding-left: 20px;
`;

const WarningItem = styled.li`
  font-size: 13px;
  color: ${colors.warning};
  margin-bottom: 4px;
`;

const SetupPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const SetupTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${colors.gray800};
`;

const SetupDescription = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${colors.gray600};
`;

const CreateButton = styled.button`
  align-self: flex-start;
  padding: 12px 24px;
  background: ${colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:hover { background: ${colors.primaryDark}; }
`;

const StructureSection = styled.div`
  margin-bottom: 24px;
`;

const SectionLabel = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: ${colors.gray700};
  margin-bottom: 12px;
`;

const OptionsSection = styled.div``;

export default LimitOptionsModal;

