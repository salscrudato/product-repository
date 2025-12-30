/**
 * DeductibleOptionsModal Component
 *
 * Premium Apple-inspired two-pane modal for comprehensive deductible options configuration.
 * Features glassmorphism, refined animations, and elegant visual hierarchy.
 * Left pane: Option set configuration and options table
 * Right pane: Option editor (when editing/adding)
 */

import React, { useState, useCallback, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { XMarkIcon, ArrowPathIcon, ExclamationTriangleIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import {
  CoverageDeductibleOption,
  CoverageDeductibleOptionSet,
  DeductibleStructure
} from '@app-types';
import { useDeductibleOptionSets } from '../../hooks/useDeductibleOptionSets';
import { DeductibleStructureSelector } from '../selectors/DeductibleStructureSelector';
import { DeductibleOptionSetTable } from './DeductibleOptionSetTable';
import { DeductibleOptionEditor } from './DeductibleOptionEditor';
import { DeductibleAISuggestionsPanel } from './AISuggestionsPanel';
import { DeductibleOptionTemplate } from '../../data/deductibleTemplates';
import { colors } from '../common/DesignSystem';

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

const slideIn = keyframes`
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
`;

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

interface DeductibleOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  coverageId: string;
  coverageName: string;
}

export const DeductibleOptionsModal: React.FC<DeductibleOptionsModalProps> = ({
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
  } = useDeductibleOptionSets(productId, coverageId);

  const [editingOption, setEditingOption] = useState<Partial<CoverageDeductibleOption> | null>(null);
  const [isNewOption, setIsNewOption] = useState(false);
  const [showMigrationWarning, setShowMigrationWarning] = useState(false);
  const [localStructure, setLocalStructure] = useState<DeductibleStructure>('flat');

  // Initialize from current set
  useEffect(() => {
    if (currentSet) {
      setLocalStructure(currentSet.structure);
    }
  }, [currentSet]);

  // Check for legacy data on mount
  useEffect(() => {
    if (hasLegacyData && optionSets.length === 0) {
      setShowMigrationWarning(true);
    }
  }, [hasLegacyData, optionSets.length]);

  const handleStructureChange = useCallback(async (structure: DeductibleStructure) => {
    setLocalStructure(structure);
    
    if (currentSet) {
      await updateOptionSet({ ...currentSet, structure });
    }
  }, [currentSet, updateOptionSet]);

  const handleCreateOptionSet = useCallback(async () => {
    await createOptionSet({
      name: 'Primary Deductible',
      structure: localStructure,
      selectionMode: 'single',
      isRequired: true
    });
  }, [createOptionSet, localStructure]);

  const handleAddOption = useCallback(() => {
    const newOption: Partial<CoverageDeductibleOption> = {
      structure: localStructure,
      label: '',
      isDefault: options.length === 0,
      isEnabled: true,
      displayOrder: options.length
    };
    
    // Set default values based on structure
    if (localStructure === 'flat') {
      (newOption as any).amount = 1000;
    } else if (localStructure === 'percentage' || localStructure === 'percentMinMax') {
      (newOption as any).percentage = 2;
      (newOption as any).basis = 'TIV';
      if (localStructure === 'percentMinMax') {
        (newOption as any).minimumAmount = 1000;
        (newOption as any).maximumAmount = 25000;
      }
    } else if (localStructure === 'waitingPeriod') {
      (newOption as any).duration = 72;
      (newOption as any).unit = 'hours';
    }
    
    setEditingOption(newOption);
    setIsNewOption(true);
  }, [localStructure, options.length]);

  const handleEditOption = useCallback((option: CoverageDeductibleOption) => {
    setEditingOption({ ...option });
    setIsNewOption(false);
  }, []);

  const handleSaveOption = useCallback(async () => {
    if (!editingOption) return;
    
    try {
      if (isNewOption) {
        await addOption(editingOption as Omit<CoverageDeductibleOption, 'id' | 'createdAt' | 'updatedAt'>);
      } else if (editingOption.id) {
        await updateOption(editingOption.id, editingOption);
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
    await updateOption(optionId, { isEnabled: enabled });
  }, [updateOption]);

  const handleMigrate = useCallback(async () => {
    await migrateFromLegacy();
    setShowMigrationWarning(false);
  }, [migrateFromLegacy]);

  // Handle applying an AI-suggested template
  const handleApplyTemplate = useCallback(async (template: DeductibleOptionTemplate) => {
    try {
      // Set the structure from template
      setLocalStructure(template.structure);

      // Create the option set first
      await createOptionSet({
        name: template.name,
        structure: template.structure,
        selectionMode: 'single',
        isRequired: true
      });

      // Add all options from template
      for (const opt of template.options) {
        await addOption(opt as Omit<CoverageDeductibleOption, 'id' | 'createdAt' | 'updatedAt'>);
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
              <Title>Deductible Options</Title>
              <Subtitle>{coverageName}</Subtitle>
            </HeaderText>
          </HeaderContent>
          <CloseButton onClick={onClose} aria-label="Close modal">
            <XMarkIcon />
          </CloseButton>
        </Header>

        <Content>
          {/* Left Pane - Configuration */}
          <LeftPane $hasEditor={!!editingOption}>
            {loading ? (
              <LoadingState>
                <ArrowPathIcon className="spin" />
                <span>Loading deductible options...</span>
              </LoadingState>
            ) : error ? (
              <ErrorState>
                <ExclamationTriangleIcon />
                <span>{error}</span>
              </ErrorState>
            ) : showMigrationWarning ? (
              <MigrationWarning>
                <WarningIcon><ExclamationTriangleIcon /></WarningIcon>
                <WarningTitle>Legacy Deductibles Detected</WarningTitle>
                <WarningText>
                  This coverage has deductibles in the legacy format. Would you like to migrate them to the new deductible options system?
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
            ) : !currentSet ? (
              <SetupPane>
                <DeductibleAISuggestionsPanel
                  coverageName={coverageName}
                  onApplyTemplate={handleApplyTemplate}
                />
                <Divider>
                  <DividerLine />
                  <DividerText>or configure manually</DividerText>
                  <DividerLine />
                </Divider>
                <SetupTitle>Configure Deductible Structure</SetupTitle>
                <SetupDescription>
                  Choose how deductibles are structured for this coverage
                </SetupDescription>
                <DeductibleStructureSelector
                  value={localStructure}
                  onChange={handleStructureChange}
                  columns={2}
                />
                <CreateButton onClick={handleCreateOptionSet}>
                  Create Empty Option Set
                </CreateButton>
              </SetupPane>
            ) : (
              <>
                <StructureSection>
                  <SectionLabel>Deductible Structure</SectionLabel>
                  <DeductibleStructureSelector
                    value={localStructure}
                    onChange={handleStructureChange}
                    columns={2}
                  />
                </StructureSection>

                <OptionsSection>
                  <DeductibleOptionSetTable
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
              <DeductibleOptionEditor
                option={editingOption}
                structure={localStructure}
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
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
  animation: ${overlayEnter} 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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

const StructureSection = styled.div`
  padding: 20px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
  margin-bottom: 28px;
`;

const SectionLabel = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: ${colors.gray700};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 14px;
`;

const OptionsSection = styled.div`
  animation: ${fadeUp} 0.4s ease-out 0.1s both;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 8px 0;
`;

const DividerLine = styled.div`
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(203, 213, 225, 0.6), transparent);
`;

const DividerText = styled.span`
  font-size: 12px;
  color: ${colors.gray500};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
`;

export default DeductibleOptionsModal;

