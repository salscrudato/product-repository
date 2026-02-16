/**
 * LimitsModal Component
 * Enhanced modal for managing coverage limits with professional styling
 *
 * Features:
 * - Statistics dashboard with limit overview
 * - Type-specific icons and color coding
 * - Interactive slider for quick amount selection
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
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowsPointingOutIcon,
  StarIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { CoverageLimit } from '@app-types';
import { useCoverageData } from '@hooks/useCoverageData';
import { LimitTypeSelector } from '../selectors/LimitTypeSelector';
import { validateCoverageLimit, formatValidationResult } from '@services/validationService';
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

interface LimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  coverageId: string;
  coverageName: string;
  onSave?: () => void;
}

// Limit type configuration with icons and colors
const limitTypeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  perOccurrence: {
    icon: <ShieldCheckIcon />,
    color: colors.primary,
    label: 'Per Occurrence'
  },
  aggregate: {
    icon: <ChartBarIcon />,
    color: colors.secondary,
    label: 'Aggregate'
  },
  combined: {
    icon: <ArrowsPointingOutIcon />,
    color: colors.info,
    label: 'Combined'
  },
  perPerson: {
    icon: <CurrencyDollarIcon />,
    color: colors.success,
    label: 'Per Person'
  },
  perAccident: {
    icon: <ExclamationCircleIcon />,
    color: colors.warning,
    label: 'Per Accident'
  },
};

// Quick amount presets
const quickAmounts = [25000, 50000, 100000, 250000, 500000, 1000000];

export const LimitsModal: React.FC<LimitsModalProps> = ({
  isOpen,
  onClose,
  productId,
  coverageId,
  coverageName,
  onSave,
}) => {
  const { limits, loading, addLimit, updateLimit, deleteLimit, setDefaultLimit } = useCoverageData(productId, coverageId);
  const [editingLimit, setEditingLimit] = useState<Partial<CoverageLimit> | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!limits.length) return { total: 0, defaults: 0, required: 0, avgAmount: 0 };
    const defaults = limits.filter(l => l.isDefault).length;
    const required = limits.filter(l => l.isRequired).length;
    const amounts = limits.map(l => l.amount || 0).filter(a => a > 0);
    const avgAmount = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
    return { total: limits.length, defaults, required, avgAmount };
  }, [limits]);

  if (!isOpen) return null;

  const handleAdd = async () => {
    if (!editingLimit || !editingLimit.limitType || !editingLimit.amount) {
      alert('Please select a limit type and enter an amount');
      return;
    }

    // Validate the limit
    const validationResult = validateCoverageLimit(editingLimit);
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
      await addLimit({
        ...editingLimit,
        coverageId,
        productId,
      } as Omit<CoverageLimit, 'id' | 'createdAt' | 'updatedAt'>);
      setEditingLimit(null);
      setIsAdding(false);
      if (onSave) onSave();
    } catch (error: any) {
      alert('Failed to add limit: ' + error.message);
    }
  };

  const handleDelete = async (limitId: string) => {
    if (confirm('Are you sure you want to delete this limit?')) {
      try {
        await deleteLimit(limitId);
        if (onSave) onSave();
      } catch (error: any) {
        alert('Failed to delete limit: ' + error.message);
      }
    }
  };

  const handleSetDefault = async (limitId: string) => {
    try {
      await setDefaultLimit(limitId);
      if (onSave) onSave();
    } catch (error: any) {
      alert('Failed to set default limit: ' + error.message);
    }
  };

  const handleClose = () => {
    setEditingLimit(null);
    setIsAdding(false);
    onClose();
  };

  const getLimitTypeConfig = (type: string) => {
    return limitTypeConfig[type] || limitTypeConfig.perOccurrence;
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount.toLocaleString()}`;
  };

  return (
    <Overlay onClick={handleClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <Header>
          <HeaderContent>
            <HeaderIcon>
              <ShieldCheckIcon />
            </HeaderIcon>
            <HeaderText>
              <Title>Manage Limits</Title>
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
                    <div style={{ marginTop: 8 }}><Skeleton width="80px" height="28px" /></div>
                  </StatCard>
                ))}
              </StatsDashboard>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ marginBottom: 12 }}><Skeleton width="100%" height="80px" borderRadius="12px" /></div>
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
                    Total Limits
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
                  <StatValue>{formatAmount(stats.avgAmount)}</StatValue>
                  <StatLabel>
                    <CurrencyDollarIcon />
                    Avg Amount
                  </StatLabel>
                </StatCard>
              </StatsDashboard>

              {/* Add New Limit Section */}
              {isAdding ? (
                <AddSection>
                  <AddSectionHeader>
                    <PlusIcon style={{ width: 20, height: 20, color: colors.primary }} />
                    <SectionTitle>Add New Limit</SectionTitle>
                  </AddSectionHeader>
                  <LimitTypeSelector
                    value={editingLimit || { limitType: 'perOccurrence' }}
                    onChange={setEditingLimit}
                  />

                  {/* Quick Amount Buttons */}
                  <QuickAmountSection>
                    <QuickAmountLabel>Quick Amount Selection</QuickAmountLabel>
                    <QuickAmountContainer>
                      {quickAmounts.map(amount => (
                        <QuickAmountButton
                          key={amount}
                          $active={editingLimit?.amount === amount}
                          onClick={() => setEditingLimit(prev => ({ ...prev, amount }))}
                        >
                          {formatAmount(amount)}
                        </QuickAmountButton>
                      ))}
                    </QuickAmountContainer>
                  </QuickAmountSection>

                  <ButtonGroup>
                    <AddButton onClick={handleAdd}>
                      <CheckCircleIcon style={{ width: 18, height: 18 }} />
                      Add Limit
                    </AddButton>
                    <CancelButton onClick={() => {
                      setIsAdding(false);
                      setEditingLimit(null);
                    }}>
                      Cancel
                    </CancelButton>
                  </ButtonGroup>
                </AddSection>
              ) : (
                <AddNewButton onClick={() => {
                  setIsAdding(true);
                  setEditingLimit({ limitType: 'perOccurrence' });
                }}>
                  <PlusIcon style={{ width: 20, height: 20 }} />
                  Add New Limit
                </AddNewButton>
              )}

              {/* Existing Limits List */}
              <ListSection>
                <SectionHeader>
                  <SectionTitle>Current Limits</SectionTitle>
                  <CountBadge>{limits.length}</CountBadge>
                </SectionHeader>
                {limits.length === 0 ? (
                  <EmptyStateContainer>
                    <EmptyStateIcon>
                      <ShieldCheckIcon />
                    </EmptyStateIcon>
                    <EmptyStateTitle>No Limits Configured</EmptyStateTitle>
                    <EmptyStateDescription>
                      Add coverage limits to define the maximum amounts your policy will pay.
                      Click "Add New Limit" to get started.
                    </EmptyStateDescription>
                  </EmptyStateContainer>
                ) : (
                  <LimitsList>
                    {limits.map((limit, index) => {
                      const config = getLimitTypeConfig(limit.limitType);
                      return (
                        <LimitCard key={limit.id} $isDefault={limit.isDefault} $delay={index}>
                          <LimitCardGradient $color={config.color} />
                          <LimitHeader>
                            <LimitInfo>
                              <LimitTypeIcon $color={config.color}>
                                {config.icon}
                              </LimitTypeIcon>
                              <LimitDisplay>
                                <LimitValue>{limit.displayValue}</LimitValue>
                                <TypeBadge $color={config.color}>
                                  {config.icon}
                                  {config.label}
                                </TypeBadge>
                              </LimitDisplay>
                            </LimitInfo>
                            <LimitActions>
                              {limit.isDefault ? (
                                <DefaultIndicator>
                                  <StarIconSolid />
                                  Default
                                </DefaultIndicator>
                              ) : (
                                <SetDefaultButton onClick={() => handleSetDefault(limit.id)}>
                                  <StarIcon style={{ width: 14, height: 14 }} />
                                  Set Default
                                </SetDefaultButton>
                              )}
                              <DeleteButton onClick={() => handleDelete(limit.id)}>
                                <TrashIcon />
                              </DeleteButton>
                            </LimitActions>
                          </LimitHeader>
                          <LimitMeta>
                            {limit.isRequired && (
                              <RequiredBadge>
                                <CheckCircleIcon />
                                Required
                              </RequiredBadge>
                            )}
                            {limit.appliesTo && limit.appliesTo.length > 0 && (
                              <AppliesTo>Applies to: {limit.appliesTo.join(', ')}</AppliesTo>
                            )}
                            {(limit.minAmount || limit.maxAmount) && (
                              <Range>
                                Range: ${limit.minAmount?.toLocaleString() || '0'} - ${limit.maxAmount?.toLocaleString() || '∞'}
                              </Range>
                            )}
                          </LimitMeta>
                        </LimitCard>
                      );
                    })}
                  </LimitsList>
                )}
              </ListSection>
            </>
          )}
        </Content>

        <Footer>
          <FooterInfo>
            {limits.length > 0 && (
              <FooterText>{limits.length} limit{limits.length !== 1 ? 's' : ''} configured</FooterText>
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

  &:active {
    transform: translateY(0);
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

const LimitsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const LimitCard = styled.div<{ $isDefault?: boolean; $delay?: number }>`
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

const LimitCardGradient = styled.div<{ $color?: string }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: ${props => props.$color || colors.primary};
`;

const LimitHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
`;

const LimitInfo = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
`;

const LimitTypeIcon = styled.div<{ $color?: string }>`
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

const LimitDisplay = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const LimitValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${colors.gray800};
  letter-spacing: -0.02em;
`;

const LimitActions = styled.div`
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

const LimitMeta = styled.div`
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
