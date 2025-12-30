/**
 * CoverageRulesPanel Component
 * 
 * Displays and manages coverage business rules.
 * Features:
 * - Rule type categorization
 * - Visual rule builder
 * - Enable/disable toggle
 * - Priority ordering
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { CoverageRule, RuleType } from '@app-types';
import {
  fetchCoverageRules,
  deleteRule,
  toggleRuleEnabled,
  getRuleTypeInfo,
} from '../../services/coverageRulesService';
import { colors } from '../common/DesignSystem';

interface CoverageRulesPanelProps {
  productId: string;
  coverageId: string;
  onAddRule?: (type: RuleType) => void;
  onEditRule?: (rule: CoverageRule) => void;
}

const RULE_TYPES: RuleType[] = ['eligibility', 'dependency', 'validation', 'rating', 'workflow'];

export const CoverageRulesPanel: React.FC<CoverageRulesPanelProps> = ({
  productId,
  coverageId,
  onAddRule,
  onEditRule
}) => {
  const [rules, setRules] = useState<CoverageRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Set<RuleType>>(new Set(['eligibility', 'dependency']));

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCoverageRules(productId, coverageId);
      setRules(data);
    } catch (err) {
      console.error('Error loading rules:', err);
      setError('Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, [productId, coverageId]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleToggleType = (type: RuleType) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleToggleEnabled = async (rule: CoverageRule) => {
    try {
      await toggleRuleEnabled(productId, coverageId, rule.id, !rule.isEnabled);
      await loadRules();
    } catch (err) {
      console.error('Error toggling rule:', err);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    
    try {
      await deleteRule(productId, coverageId, ruleId);
      await loadRules();
    } catch (err) {
      console.error('Error deleting rule:', err);
    }
  };

  const getRulesByType = (type: RuleType) => rules.filter(r => r.type === type);

  if (loading) {
    return (
      <LoadingContainer>
        <ArrowPathIcon className="spin" />
        <span>Loading rules...</span>
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <ErrorContainer>
        <ExclamationTriangleIcon />
        <span>{error}</span>
      </ErrorContainer>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Business Rules</Title>
        <RuleCount>{rules.length} rules configured</RuleCount>
      </Header>

      <RuleGroups>
        {RULE_TYPES.map(type => {
          const typeInfo = getRuleTypeInfo(type);
          const typeRules = getRulesByType(type);
          const isExpanded = expandedTypes.has(type);

          return (
            <RuleGroup key={type}>
              <GroupHeader onClick={() => handleToggleType(type)}>
                <GroupIcon $color={typeInfo.color}>{typeInfo.icon}</GroupIcon>
                <GroupTitle>{typeInfo.label}</GroupTitle>
                <GroupCount>{typeRules.length}</GroupCount>
                <ExpandIcon>
                  {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                </ExpandIcon>
                {onAddRule && (
                  <AddButton
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddRule(type);
                    }}
                  >
                    <PlusIcon />
                  </AddButton>
                )}
              </GroupHeader>

              {isExpanded && (
                <GroupContent>
                  {typeRules.length === 0 ? (
                    <EmptyState>
                      No {typeInfo.label.toLowerCase()} rules configured
                    </EmptyState>
                  ) : (
                    typeRules.map(rule => (
                      <RuleCard key={rule.id} $enabled={rule.isEnabled}>
                        <RuleHeader>
                          <RuleName>{rule.name}</RuleName>
                          <RuleActions>
                            <ToggleSwitch
                              $enabled={rule.isEnabled}
                              onClick={() => handleToggleEnabled(rule)}
                            >
                              <ToggleKnob $enabled={rule.isEnabled} />
                            </ToggleSwitch>
                            {onEditRule && (
                              <ActionButton onClick={() => onEditRule(rule)}>
                                <PencilIcon />
                              </ActionButton>
                            )}
                            <ActionButton $danger onClick={() => handleDeleteRule(rule.id)}>
                              <TrashIcon />
                            </ActionButton>
                          </RuleActions>
                        </RuleHeader>

                        {rule.conditions && rule.conditions.length > 0 && (
                          <RuleConditions>
                            <ConditionLabel>When:</ConditionLabel>
                            {rule.conditions.map((cond, idx) => (
                              <ConditionChip key={idx}>
                                {cond.field} {cond.operator} {String(cond.value)}
                              </ConditionChip>
                            ))}
                          </RuleConditions>
                        )}

                        {rule.actions && rule.actions.length > 0 && (
                          <RuleActionsDisplay>
                            <ActionLabel>Then:</ActionLabel>
                            {rule.actions.map((action, idx) => (
                              <ActionChip key={idx} $type={action.type}>
                                {action.type}: {action.message || action.value}
                              </ActionChip>
                            ))}
                          </RuleActionsDisplay>
                        )}
                      </RuleCard>
                    ))
                  )}
                </GroupContent>
              )}
            </RuleGroup>
          );
        })}
      </RuleGroups>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  background: white;
  border-radius: 12px;
  border: 1px solid ${colors.gray200};
  overflow: hidden;
`;

const LoadingContainer = styled.div`
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

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px;
  color: ${colors.error};

  svg {
    width: 32px;
    height: 32px;
    margin-bottom: 12px;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid ${colors.gray200};
`;

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${colors.gray800};
`;

const RuleCount = styled.span`
  font-size: 13px;
  color: ${colors.gray500};
`;

const RuleGroups = styled.div``;

const RuleGroup = styled.div`
  border-bottom: 1px solid ${colors.gray100};

  &:last-child {
    border-bottom: none;
  }
`;

const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: ${colors.gray50};
  }
`;

const GroupIcon = styled.span<{ $color: string }>`
  font-size: 18px;
`;

const GroupTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${colors.gray800};
  flex: 1;
`;

const GroupCount = styled.span`
  font-size: 12px;
  color: ${colors.gray500};
  background: ${colors.gray100};
  padding: 2px 8px;
  border-radius: 10px;
`;

const ExpandIcon = styled.span`
  color: ${colors.gray400};

  svg {
    width: 18px;
    height: 18px;
  }
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: ${colors.primary}15;
  color: ${colors.primary};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    background: ${colors.primary}25;
  }
`;

const GroupContent = styled.div`
  padding: 0 20px 16px;
`;

const EmptyState = styled.div`
  padding: 24px;
  text-align: center;
  color: ${colors.gray400};
  font-size: 13px;
  background: ${colors.gray50};
  border-radius: 8px;
`;

const RuleCard = styled.div<{ $enabled: boolean }>`
  padding: 16px;
  background: ${({ $enabled }) => $enabled ? 'white' : colors.gray50};
  border: 1px solid ${colors.gray200};
  border-radius: 10px;
  margin-bottom: 8px;
  opacity: ${({ $enabled }) => $enabled ? 1 : 0.7};
  transition: all 0.2s ease;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    border-color: ${colors.gray300};
  }
`;

const RuleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const RuleName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${colors.gray800};
`;

const RuleActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ToggleSwitch = styled.div<{ $enabled: boolean }>`
  width: 36px;
  height: 20px;
  background: ${({ $enabled }) => $enabled ? colors.success : colors.gray300};
  border-radius: 10px;
  padding: 2px;
  cursor: pointer;
  transition: background 0.2s ease;
`;

const ToggleKnob = styled.div<{ $enabled: boolean }>`
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  transform: translateX(${({ $enabled }) => $enabled ? '16px' : '0'});
  transition: transform 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
`;

const ActionButton = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: ${colors.gray100};
  color: ${({ $danger }) => $danger ? colors.error : colors.gray600};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    background: ${({ $danger }) => $danger ? `${colors.error}15` : colors.gray200};
  }
`;

const RuleConditions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
`;

const ConditionLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${colors.gray500};
  text-transform: uppercase;
`;

const ConditionChip = styled.span`
  padding: 4px 8px;
  background: ${colors.primary}10;
  color: ${colors.primary};
  border-radius: 4px;
  font-size: 12px;
  font-family: 'SF Mono', monospace;
`;

const RuleActionsDisplay = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`;

const ActionLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${colors.gray500};
  text-transform: uppercase;
`;

const ActionChip = styled.span<{ $type: string }>`
  padding: 4px 8px;
  background: ${({ $type }) =>
    $type === 'block' ? `${colors.error}10` :
    $type === 'warn' ? `${colors.warning}10` :
    `${colors.success}10`
  };
  color: ${({ $type }) =>
    $type === 'block' ? colors.error :
    $type === 'warn' ? colors.warning :
    colors.success
  };
  border-radius: 4px;
  font-size: 12px;
`;

export default CoverageRulesPanel;

