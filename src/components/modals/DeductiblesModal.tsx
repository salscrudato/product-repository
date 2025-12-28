/**
 * DeductiblesModal Component
 * Enhanced modal for managing coverage deductibles with professional styling
 *
 * Features:
 * - Statistics dashboard with deductible overview
 * - Type-specific icons and color coding
 * - Interactive quick amount selection
 * - Smooth animations and transitions
 * - Skeleton loading states
 */

import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ReceiptPercentIcon,
  StarIcon,
  CalculatorIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { CoverageDeductible } from '@types';
import { useCoverageData } from '@hooks/useCoverageData';
import { DeductibleTypeSelector } from '../selectors/DeductibleTypeSelector';
import { validateCoverageDeductible, formatValidationResult } from '@services/validationService';
import {
  colors,
  gradients,
  fadeInUp,
  scaleIn,
  StatsDashboard,
  StatCard,
  StatValue,
  StatLabel,
  TypeBadge,
  EmptyStateContainer,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  QuickAmountContainer,
  QuickAmountButton
} from '../common/DesignSystem';
import { Skeleton } from '../common/Skeleton';

// Deductible type configuration with icons and colors
const deductibleTypeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  flat: {
    icon: <CurrencyDollarIcon />,
    color: colors.primary,
    label: 'Flat Amount'
  },
  percentage: {
    icon: <ReceiptPercentIcon />,
    color: colors.secondary,
    label: 'Percentage'
  },
  split: {
    icon: <CalculatorIcon />,
    color: colors.info,
    label: 'Split'
  },
  disappearing: {
    icon: <BanknotesIcon />,
    color: colors.success,
    label: 'Disappearing'
  },
};

// Quick amount presets for flat deductibles
const quickAmounts = [250, 500, 1000, 2500, 5000, 10000];

// Quick percentage presets
const quickPercentages = [1, 2, 5, 10, 15, 20];

interface DeductiblesModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  coverageId: string;
  coverageName: string;
  onSave?: () => void;
}

export const DeductiblesModal: React.FC<DeductiblesModalProps> = ({
  isOpen,
  onClose,
  productId,
  coverageId,
  coverageName,
  onSave,
}) => {
  const { deductibles, loading, addDeductible, deleteDeductible, setDefaultDeductible } = useCoverageData(productId, coverageId);
  const [editingDeductible, setEditingDeductible] = useState<Partial<CoverageDeductible> | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!deductibles.length) return { total: 0, defaults: 0, required: 0, flat: 0 };
    const defaults = deductibles.filter(d => d.isDefault).length;
    const required = deductibles.filter(d => d.isRequired).length;
    const flat = deductibles.filter(d => d.deductibleType === 'flat').length;
    return { total: deductibles.length, defaults, required, flat };
  }, [deductibles]);

  const getDeductibleTypeConfig = (type: string) => {
    return deductibleTypeConfig[type] || deductibleTypeConfig.flat;
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount.toLocaleString()}`;
  };

  if (!isOpen) return null;

  const handleAdd = async () => {
    if (!editingDeductible || !editingDeductible.deductibleType) {
      alert('Please select a deductible type');
      return;
    }

    if (editingDeductible.deductibleType === 'percentage' && !editingDeductible.percentage) {
      alert('Please enter a percentage');
      return;
    }

    if (editingDeductible.deductibleType !== 'percentage' && !editingDeductible.amount) {
      alert('Please enter an amount');
      return;
    }

    // Validate the deductible
    const validationResult = validateCoverageDeductible(editingDeductible);
    if (!validationResult.isValid) {
      alert('Validation errors:\n\n' + formatValidationResult(validationResult));
      return;
    }

    // Show warnings but allow save
    if (validationResult.warnings.length > 0) {
      const proceed = window.confirm(
        'Warnings:\n\n' +
        validationResult.warnings.map(w => `• ${w.message}`).join('\n') +
        '\n\nDo you want to proceed anyway?'
      );
      if (!proceed) return;
    }

    try {
      await addDeductible({
        ...editingDeductible,
        coverageId,
        productId,
      });
      setEditingDeductible(null);
      setIsAdding(false);
      if (onSave) onSave();
    } catch (error: any) {
      alert('Failed to add deductible: ' + error.message);
    }
  };

  const handleDelete = async (deductibleId: string) => {
    if (confirm('Are you sure you want to delete this deductible?')) {
      try {
        await deleteDeductible(deductibleId);
        if (onSave) onSave();
      } catch (error: any) {
        alert('Failed to delete deductible: ' + error.message);
      }
    }
  };

  const handleSetDefault = async (deductibleId: string) => {
    try {
      await setDefaultDeductible(deductibleId);
      if (onSave) onSave();
    } catch (error: any) {
      alert('Failed to set default deductible: ' + error.message);
    }
  };

  const handleClose = () => {
    setEditingDeductible(null);
    setIsAdding(false);
    onClose();
  };

  return (
    <Overlay onClick={handleClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <Header>
          <HeaderContent>
            <HeaderIcon>
              <CurrencyDollarIcon />
            </HeaderIcon>
            <HeaderText>
              <Title>Manage Deductibles</Title>
              <Subtitle>{coverageName}</Subtitle>
            </HeaderText>
          </HeaderContent>
          <CloseButton onClick={handleClose}>
            <XMarkIcon />
          </CloseButton>
        </Header>
        <GradientBar />

        <Content>
          {loading ? (
            <LoadingContainer>
              <StatsDashboard>
                {[1, 2, 3, 4].map(i => (
                  <StatCard key={i}>
                    <Skeleton width="60px" height="12px" />
                    <Skeleton width="80px" height="28px" style={{ marginTop: 8 }} />
                  </StatCard>
                ))}
              </StatsDashboard>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} width="100%" height="80px" borderRadius="12px" style={{ marginBottom: 12 }} />
              ))}
            </LoadingContainer>
          ) : (
            <>
              {/* Statistics Dashboard */}
              <StatsDashboard>
                <StatCard $color={gradients.primary}>
                  <StatValue>{stats.total}</StatValue>
                  <StatLabel>
                    <ChartBarIcon />
                    Total Deductibles
                  </StatLabel>
                </StatCard>
                <StatCard $color={gradients.success}>
                  <StatValue>{stats.defaults}</StatValue>
                  <StatLabel>
                    <StarIcon />
                    Defaults
                  </StatLabel>
                </StatCard>
                <StatCard $color={gradients.warning}>
                  <StatValue>{stats.required}</StatValue>
                  <StatLabel>
                    <CheckCircleIcon />
                    Required
                  </StatLabel>
                </StatCard>
                <StatCard $color={gradients.info}>
                  <StatValue>{stats.flat}</StatValue>
                  <StatLabel>
                    <CurrencyDollarIcon />
                    Flat Amount
                  </StatLabel>
                </StatCard>
              </StatsDashboard>

              {/* Add New Deductible Section */}
              {isAdding ? (
                <AddSection>
                  <AddSectionHeader>
                    <PlusIcon style={{ width: 20, height: 20, color: colors.primary }} />
                    <SectionTitle>Add New Deductible</SectionTitle>
                  </AddSectionHeader>
                  <DeductibleTypeSelector
                    value={editingDeductible || { deductibleType: 'flat' }}
                    onChange={setEditingDeductible}
                  />

                  {/* Quick Amount/Percentage Buttons */}
                  <QuickAmountSection>
                    <QuickAmountLabel>
                      {editingDeductible?.deductibleType === 'percentage' ? 'Quick Percentage' : 'Quick Amount'} Selection
                    </QuickAmountLabel>
                    <QuickAmountContainer>
                      {editingDeductible?.deductibleType === 'percentage'
                        ? quickPercentages.map(pct => (
                            <QuickAmountButton
                              key={pct}
                              $active={editingDeductible?.percentage === pct}
                              onClick={() => setEditingDeductible(prev => ({ ...prev, percentage: pct }))}
                            >
                              {pct}%
                            </QuickAmountButton>
                          ))
                        : quickAmounts.map(amount => (
                            <QuickAmountButton
                              key={amount}
                              $active={editingDeductible?.amount === amount}
                              onClick={() => setEditingDeductible(prev => ({ ...prev, amount }))}
                            >
                              {formatAmount(amount)}
                            </QuickAmountButton>
                          ))
                      }
                    </QuickAmountContainer>
                  </QuickAmountSection>

                  <ButtonGroup>
                    <AddButton onClick={handleAdd}>
                      <CheckCircleIcon style={{ width: 18, height: 18 }} />
                      Add Deductible
                    </AddButton>
                    <CancelButton onClick={() => {
                      setIsAdding(false);
                      setEditingDeductible(null);
                    }}>
                      Cancel
                    </CancelButton>
                  </ButtonGroup>
                </AddSection>
              ) : (
                <AddNewButton onClick={() => {
                  setIsAdding(true);
                  setEditingDeductible({ deductibleType: 'flat' });
                }}>
                  <PlusIcon style={{ width: 20, height: 20 }} />
                  Add New Deductible
                </AddNewButton>
              )}

              {/* Existing Deductibles List */}
              <ListSection>
                <SectionHeader>
                  <SectionTitle>Current Deductibles</SectionTitle>
                  <CountBadge>{deductibles.length}</CountBadge>
                </SectionHeader>
                {deductibles.length === 0 ? (
                  <EmptyStateContainer>
                    <EmptyStateIcon>
                      <CurrencyDollarIcon />
                    </EmptyStateIcon>
                    <EmptyStateTitle>No Deductibles Configured</EmptyStateTitle>
                    <EmptyStateDescription>
                      Add deductibles to define the amounts policyholders must pay before coverage kicks in.
                      Click "Add New Deductible" to get started.
                    </EmptyStateDescription>
                  </EmptyStateContainer>
                ) : (
                  <DeductiblesList>
                    {deductibles.map((deductible, index) => {
                      const config = getDeductibleTypeConfig(deductible.deductibleType);
                      return (
                        <DeductibleCard key={deductible.id} $isDefault={deductible.isDefault} $delay={index}>
                          <DeductibleCardGradient $color={config.color} />
                          <DeductibleHeader>
                            <DeductibleInfo>
                              <DeductibleTypeIcon $color={config.color}>
                                {config.icon}
                              </DeductibleTypeIcon>
                              <DeductibleDisplay>
                                <DeductibleValue>{deductible.displayValue}</DeductibleValue>
                                <TypeBadge $color={config.color}>
                                  {config.icon}
                                  {config.label}
                                </TypeBadge>
                              </DeductibleDisplay>
                            </DeductibleInfo>
                            <DeductibleActions>
                              {deductible.isDefault ? (
                                <DefaultIndicator>
                                  <StarIconSolid />
                                  Default
                                </DefaultIndicator>
                              ) : (
                                <SetDefaultButton onClick={() => handleSetDefault(deductible.id)}>
                                  <StarIcon style={{ width: 14, height: 14 }} />
                                  Set Default
                                </SetDefaultButton>
                              )}
                              <DeleteButton onClick={() => handleDelete(deductible.id)}>
                                <TrashIcon />
                              </DeleteButton>
                            </DeductibleActions>
                          </DeductibleHeader>
                          <DeductibleMeta>
                            {deductible.isRequired && (
                              <RequiredBadge>
                                <CheckCircleIcon />
                                Required
                              </RequiredBadge>
                            )}
                            {deductible.appliesTo && deductible.appliesTo.length > 0 && (
                              <AppliesTo>Applies to: {deductible.appliesTo.join(', ')}</AppliesTo>
                            )}
                            {(deductible.minimumRetained || deductible.maximumRetained) && (
                              <Range>
                                Retained: ${deductible.minimumRetained?.toLocaleString() || '0'} - ${deductible.maximumRetained?.toLocaleString() || '∞'}
                              </Range>
                            )}
                          </DeductibleMeta>
                        </DeductibleCard>
                      );
                    })}
                  </DeductiblesList>
                )}
              </ListSection>
            </>
          )}
        </Content>

        <Footer>
          <FooterInfo>
            {deductibles.length > 0 && (
              <FooterText>{deductibles.length} deductible{deductibles.length !== 1 ? 's' : ''} configured</FooterText>
            )}
          </FooterInfo>
          <CloseFooterButton onClick={handleClose}>
            <CheckCircleIcon style={{ width: 18, height: 18 }} />
            Done
          </CloseFooterButton>
        </Footer>
      </ModalContainer>
    </Overlay>
  );
};

// Styled Components
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${fadeInUp} 0.2s ease-out;
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: ${scaleIn} 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
`;

const GradientBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: ${gradients.primary};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const HeaderIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 24px;
    height: 24px;
    color: ${colors.primary};
  }
`;

const HeaderText = styled.div``;

const Title = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: ${colors.gray800};
  margin: 0;
  letter-spacing: -0.02em;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: ${colors.gray500};
  margin: 2px 0 0 0;
`;

const CloseButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${colors.gray50};
  border: none;
  cursor: pointer;
  color: ${colors.gray500};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    background: ${colors.gray100};
    color: ${colors.gray700};
    transform: scale(1.05);
  }
`;
const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 28px;
  background: ${colors.gray50};
`;

const LoadingContainer = styled.div`
  animation: ${fadeInUp} 0.3s ease-out;
`;

const AddSection = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  border: 2px dashed rgba(99, 102, 241, 0.3);
  animation: ${fadeInUp} 0.3s ease-out;
`;

const AddSectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${colors.gray800};
  margin: 0;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

const CountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 10px;
  border-radius: 14px;
  background: rgba(99, 102, 241, 0.1);
  color: ${colors.primary};
  font-size: 13px;
  font-weight: 700;
`;

const QuickAmountSection = styled.div`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid ${colors.gray100};
`;

const QuickAmountLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${colors.gray600};
  margin-bottom: 10px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: ${gradients.primary};
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
  }
`;

const CancelButton = styled.button`
  padding: 12px 24px;
  background: white;
  color: ${colors.gray600};
  border: 1.5px solid ${colors.gray200};
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${colors.gray100};
    border-color: ${colors.gray300};
  }
`;

const AddNewButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 24px;
  background: white;
  color: ${colors.primary};
  border: 2px dashed rgba(99, 102, 241, 0.4);
  border-radius: 16px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 24px;
  width: 100%;
  transition: all 0.3s ease;

  svg {
    width: 22px;
    height: 22px;
  }

  &:hover {
    background: rgba(99, 102, 241, 0.05);
    border-color: ${colors.primary};
    transform: translateY(-2px);
  }
`;

const ListSection = styled.div`
  animation: ${fadeInUp} 0.4s ease-out;
`;

const DeductiblesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const DeductibleCard = styled.div<{ $isDefault?: boolean; $delay?: number }>`
  background: white;
  border: 1.5px solid ${props => props.$isDefault ? colors.primary : 'rgba(226, 232, 240, 0.9)'};
  border-radius: 16px;
  padding: 20px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  animation: ${fadeInUp} 0.35s ease-out backwards;
  animation-delay: ${props => (props.$delay || 0) * 0.05}s;

  ${props => props.$isDefault && `
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  `}

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 24px rgba(99, 102, 241, 0.12);
    border-color: ${colors.primary};
  }
`;

const DeductibleCardGradient = styled.div<{ $color?: string }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: ${props => props.$color || colors.primary};
`;

const DeductibleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
`;

const DeductibleInfo = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
`;

const DeductibleTypeIcon = styled.div<{ $color?: string }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: ${props => props.$color ? `${props.$color}15` : 'rgba(99, 102, 241, 0.1)'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 22px;
    height: 22px;
    color: ${props => props.$color || colors.primary};
  }
`;

const DeductibleDisplay = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const DeductibleValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${colors.gray800};
  letter-spacing: -0.02em;
`;

const DeductibleActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SetDefaultButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(99, 102, 241, 0.1);
  color: ${colors.primary};
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.2);
    transform: scale(1.02);
  }
`;

const DefaultIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(234, 179, 8, 0.15) 100%);
  color: ${colors.warningDark};
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;

  svg {
    width: 16px;
    height: 16px;
    color: ${colors.warning};
  }
`;

const DeleteButton = styled.button`
  width: 36px;
  height: 36px;
  background: rgba(239, 68, 68, 0.1);
  color: ${colors.error};
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: scale(1.05);
  }
`;

const DeductibleMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid ${colors.gray100};
`;

const RequiredBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  background: rgba(245, 158, 11, 0.12);
  color: ${colors.warningDark};
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const AppliesTo = styled.div`
  font-size: 13px;
  color: ${colors.gray500};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Range = styled.div`
  font-size: 13px;
  color: ${colors.gray500};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 28px;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
  background: white;
`;

const FooterInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const FooterText = styled.span`
  font-size: 13px;
  color: ${colors.gray500};
`;

const CloseFooterButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  background: ${gradients.success};
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
  }
`;
