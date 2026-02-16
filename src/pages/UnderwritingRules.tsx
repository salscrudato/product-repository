/**
 * UnderwritingRules – main page for authoring, versioning, and testing
 * underwriting rules within an organisation.
 *
 * Layout:
 *  - Left: Rule list with type filter
 *  - Right: Rule builder + scenario runner (tabbed)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  color as tokenColor, neutral, accent, space, radius, shadow,
  fontFamily, duration, border as borderToken, semantic,
} from '../ui/tokens';
import {
  PlusIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PlayIcon,
  ArrowPathIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import MainNavigation from '../components/ui/Navigation';
import { PageContainer, PageContent } from '../components/ui/PageContainer';
import EnhancedHeader from '../components/ui/EnhancedHeader';
import { Button } from '../components/ui/Button';
import { useRole } from '../hooks/useRole';
import useProducts from '../hooks/useProducts';
import { RuleBuilder } from '../components/rules/RuleBuilder';
import { RuleScenarioRunner } from '../components/rules/RuleScenarioRunner';
import { validateRuleVersion } from '../engine/rulesEngine';
import type { RuleWithVersion } from '../engine/rulesEngine';
import {
  subscribeToRules,
  createRule,
  updateRule,
  deleteRule,
  createRuleVersion,
  getRuleVersions,
  updateRuleVersion,
  transitionRuleVersion,
  cloneRuleVersion,
  loadPublishedRulesForEvaluation,
} from '../services/rulesEngineService';
import { orgDataDictionaryService } from '../services/orgDataDictionaryService';
import type {
  UnderwritingRule,
  UnderwritingRuleType,
  UnderwritingRuleVersion,
  RuleValidationIssue,
  ConditionGroup,
  RuleOutcome,
  RuleScope,
  RuleVersionStatus,
} from '../types/rulesEngine';
import {
  createEmptyGroup,
  createDefaultOutcome,
  createDefaultScope,
} from '../types/rulesEngine';
import type { DataDictionaryField } from '../types/dataDictionary';
import { VERSION_STATUS_CONFIG } from '../types/versioning';
import logger, { LOG_CATEGORIES } from '../utils/logger';

// ============================================================================
// Styled Components
// ============================================================================

const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none}`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: ${space[6]};
  animation: ${fadeIn} ${duration.normal} ease;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space[3]};
`;

const SidebarCard = styled.div`
  background: ${tokenColor.bg};
  border-radius: ${radius.lg};
  border: ${borderToken.default};
  overflow: hidden;
`;

const SidebarHeader = styled.div`
  padding: ${space[4]} ${space[5]};
  border-bottom: 1px solid ${neutral[200]};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${space[2]} ${space[3]} ${space[2]} 36px;
  border: 1px solid ${neutral[200]};
  border-radius: ${radius.md};
  font-size: 13px;
  font-family: ${fontFamily.sans};
  margin: ${space[3]} ${space[4]} 0;

  &:focus {
    outline: none;
    border-color: ${accent[500]};
    box-shadow: 0 0 0 3px ${accent[100]};
  }
`;

const FilterRow = styled.div`
  display: flex;
  gap: ${space[1.5]};
  padding: ${space[3]} ${space[4]} 0;
  flex-wrap: wrap;
`;

const FilterPill = styled.button<{ $active: boolean }>`
  padding: ${space[1]} ${space[3]};
  border-radius: ${radius.full};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all ${duration.fast};
  border: 1px solid ${p => p.$active ? accent[500] : neutral[200]};
  background: ${p => p.$active ? accent[50] : tokenColor.bg};
  color: ${p => p.$active ? accent[600] : neutral[500]};

  &:hover { border-color: ${accent[500]}; }
`;

const RuleList = styled.div`
  max-height: calc(100vh - 360px);
  overflow-y: auto;
  padding: ${space[2]};
`;

const RuleItem = styled.div<{ $selected: boolean }>`
  padding: ${space[3]} 14px;
  border-radius: ${radius.md};
  cursor: pointer;
  transition: all ${duration.fast};
  border: 2px solid ${p => p.$selected ? accent[500] : 'transparent'};
  background: ${p => p.$selected ? accent[50] : 'transparent'};
  margin-bottom: ${space[1]};

  &:hover {
    background: ${p => p.$selected ? accent[50] : neutral[50]};
  }
`;

const RuleName = styled.div`
  font-size: 14px; font-weight: 500; color: ${neutral[900]};
`;

const RuleMeta = styled.div`
  font-size: 12px; color: ${neutral[500]}; margin-top: ${space[0.5]}; display: flex; align-items: center; gap: ${space[1.5]};
`;

const TypeBadge = styled.span<{ $type: string }>`
  font-size: 11px; font-weight: 600; padding: 1px ${space[2]}; border-radius: ${radius.md}; text-transform: capitalize;
  background: ${p => {
    switch (p.$type) {
      case 'eligibility': return semantic.info + '1a';
      case 'referral': return semantic.warning + '1a';
      case 'validation': return accent[100];
      default: return neutral[100];
    }
  }};
  color: ${p => {
    switch (p.$type) {
      case 'eligibility': return '#1e40af';
      case 'referral': return semantic.warningDark;
      case 'validation': return accent[800];
      default: return neutral[500];
    }
  }};
`;

const ProductBadge = styled.span`
  display: inline-block;
  margin-top: ${space[1]};
  font-size: 10px;
  font-weight: 600;
  padding: 1px ${space[1.5]};
  border-radius: ${radius.xs};
  background: ${accent[50]};
  color: ${accent[600]};
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ProductFilterSelect = styled.select`
  width: 100%;
  padding: ${space[1.5]} ${space[2.5]};
  border: 1px solid ${neutral[200]};
  border-radius: ${radius.md};
  font-size: 12px;
  font-family: ${fontFamily.sans};
  background: ${tokenColor.bg};
  color: ${tokenColor.text};
  &:focus { outline: none; border-color: ${accent[500]}; }
`;

const MainPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space[5]};
`;

const TabBar = styled.div`
  display: flex;
  gap: ${space[1]};
  background: ${neutral[100]};
  padding: ${space[1]};
  border-radius: ${radius.md};
  width: fit-content;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: ${space[2]} ${space[4]};
  border-radius: ${radius.md};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all ${duration.fast};
  background: ${p => p.$active ? tokenColor.bg : 'transparent'};
  color: ${p => p.$active ? neutral[900] : neutral[500]};
  box-shadow: ${p => p.$active ? shadow.sm : 'none'};

  &:hover { color: ${neutral[900]}; }
`;

const VersionBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[3]};
  padding: ${space[3]} ${space[4]};
  background: ${tokenColor.bg};
  border-radius: ${radius.md};
  border: ${borderToken.default};
  flex-wrap: wrap;
`;

const StatusDot = styled.span<{ $color: string }>`
  display: inline-block; width: ${space[2]}; height: ${space[2]}; border-radius: ${radius.full}; background: ${p => p.$color};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${space[16]} ${space[8]};
  color: ${neutral[500]};
`;

const RuleHeaderSection = styled.div`
  padding: ${space[5]};
  background: ${tokenColor.bg};
  border-radius: ${radius.lg};
  border: ${borderToken.default};
  display: flex;
  flex-direction: column;
  gap: ${space[2]};
`;

const InlineEditRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[2]};
`;

const RuleTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: ${neutral[900]};
  margin: 0;
  cursor: pointer;
  padding: 2px 6px;
  margin: -2px -6px;
  border-radius: ${radius.md};
  transition: background ${duration.fast};

  &:hover {
    background: ${neutral[50]};
  }
`;

const RuleDescription = styled.p`
  font-size: 13px;
  color: ${neutral[500]};
  margin: 0;
  cursor: pointer;
  padding: 2px 6px;
  margin: -2px -6px;
  border-radius: ${radius.md};
  transition: background ${duration.fast};
  min-height: 18px;

  &:hover {
    background: ${neutral[50]};
  }
`;

const InlineInput = styled.input`
  padding: ${space[1.5]} ${space[2.5]};
  border: 1.5px solid ${accent[400]};
  border-radius: ${radius.md};
  font-size: 20px;
  font-weight: 600;
  color: ${neutral[900]};
  font-family: ${fontFamily.sans};
  flex: 1;
  background: ${accent[50]};

  &:focus {
    outline: none;
    border-color: ${accent[500]};
    box-shadow: 0 0 0 3px ${accent[100]};
  }
`;

const InlineDescInput = styled.input`
  padding: ${space[1]} ${space[2.5]};
  border: 1.5px solid ${accent[400]};
  border-radius: ${radius.md};
  font-size: 13px;
  color: ${neutral[700]};
  font-family: ${fontFamily.sans};
  flex: 1;
  background: ${accent[50]};

  &:focus {
    outline: none;
    border-color: ${accent[500]};
    box-shadow: 0 0 0 3px ${accent[100]};
  }
`;

const SaveStatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: ${radius.full};
  font-size: 12px;
  font-weight: 500;
  transition: all ${duration.fast};
  ${p => {
    switch (p.$status) {
      case 'saving': return `background: ${accent[50]}; color: ${accent[600]};`;
      case 'saved': return `background: #ecfdf5; color: #059669;`;
      case 'error': return `background: #fef2f2; color: #dc2626;`;
      default: return 'display: none;';
    }
  }}
`;

const ReadOnlyBanner = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  padding: ${space[3]} ${space[4]};
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: ${radius.md};
  font-size: 13px;
  color: #92400e;
`;

const ModalOverlay = styled.div`
  position: fixed; inset: 0; background: ${tokenColor.overlay}; display: flex; align-items: center; justify-content: center; z-index: 1000;
`;

const Modal = styled.div`
  background: ${tokenColor.bg}; border-radius: ${radius.lg}; padding: ${space[6]}; max-width: 440px; width: 90%; box-shadow: ${shadow.overlay};
`;

const ModalTitle = styled.h3`
  font-size: 18px; font-weight: 600; color: ${neutral[900]}; margin: 0 0 ${space[4]};
`;

const ModalField = styled.div`
  margin-bottom: ${space[4]};
`;

const ModalLabel = styled.label`
  display: block; font-size: 13px; font-weight: 500; color: ${neutral[700]}; margin-bottom: ${space[1.5]};
`;

const ModalInput = styled.input`
  width: 100%; padding: ${space[2.5]} 14px; border: 1px solid ${neutral[300]}; border-radius: ${radius.md}; font-size: 14px; font-family: ${fontFamily.sans}; box-sizing: border-box;
  &:focus { outline: none; border-color: ${accent[500]}; box-shadow: 0 0 0 3px ${accent[100]}; }
`;

const ModalSelect = styled.select`
  width: 100%; padding: ${space[2.5]} 14px; border: 1px solid ${neutral[300]}; border-radius: ${radius.md}; font-size: 14px; background: ${tokenColor.bg}; box-sizing: border-box;
`;

const ModalActions = styled.div`
  display: flex; gap: ${space[2]}; justify-content: flex-end; margin-top: ${space[5]};
`;

// ============================================================================
// Component
// ============================================================================

const UnderwritingRules: React.FC = () => {
  const { user, currentOrg, canWriteProducts } = useRole();
  const orgId = currentOrg?.id;
  const { data: products } = useProducts();

  // Rule list state
  const [rules, setRules] = useState<UnderwritingRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<UnderwritingRuleType | 'all'>('all');
  const [productFilter, setProductFilter] = useState<string | 'all'>('all');

  // Selected rule state
  const [versions, setVersions] = useState<UnderwritingRuleVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'builder' | 'runner'>('builder');

  // Builder state (local edits)
  const [editConditions, setEditConditions] = useState<ConditionGroup>(createEmptyGroup());
  const [editOutcome, setEditOutcome] = useState<RuleOutcome>(createDefaultOutcome());
  const [editScope, setEditScope] = useState<RuleScope>(createDefaultScope());
  const [validationIssues, setValidationIssues] = useState<RuleValidationIssue[]>([]);
  const [dirty, setDirty] = useState(false);

  // Data dictionary
  const [dictionaryFields, setDictionaryFields] = useState<DataDictionaryField[]>([]);

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleType, setNewRuleType] = useState<UnderwritingRuleType>('eligibility');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleProductId, setNewRuleProductId] = useState<string>('');

  // Inline editing of rule metadata
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDescValue, setEditDescValue] = useState('');

  // Save feedback
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Scenario runner rules
  const [publishedRules, setPublishedRules] = useState<RuleWithVersion[]>([]);

  // ── Data subscriptions ────────────────────────────────────────────────

  useEffect(() => {
    if (!orgId) return;
    const unsub = subscribeToRules(orgId, setRules, (err) => logger.error(LOG_CATEGORIES.ERROR, 'Rules subscription error', {}, err as Error));
    return () => unsub();
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    const unsub = orgDataDictionaryService.subscribeToFields(
      orgId,
      (fields) => setDictionaryFields(fields.filter(f => f.status === 'active')),
      (err) => logger.error(LOG_CATEGORIES.ERROR, 'Dictionary subscription error', {}, err as Error),
    );
    return () => unsub();
  }, [orgId]);

  // Load versions when a rule is selected
  useEffect(() => {
    if (!orgId || !selectedRuleId) {
      setVersions([]);
      setSelectedVersionId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const v = await getRuleVersions(orgId, selectedRuleId);
        if (cancelled) return;
        setVersions(v);
        // Auto-select latest draft or latest version
        const draft = v.find(x => x.status === 'draft');
        setSelectedVersionId(draft?.id ?? v[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) {
          logger.error(LOG_CATEGORIES.ERROR, 'Failed to load rule versions', {}, err as Error);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [orgId, selectedRuleId]);

  // Sync builder state when version selection changes
  useEffect(() => {
    const ver = versions.find(v => v.id === selectedVersionId);
    if (ver) {
      setEditConditions(ver.conditions);
      setEditOutcome(ver.outcome);
      setEditScope(ver.scope);
      setDirty(false);
    }
  }, [selectedVersionId, versions]);

  // Live validation
  useEffect(() => {
    if (!selectedVersionId) return;
    const ver = versions.find(v => v.id === selectedVersionId);
    if (!ver) return;
    const fakeVersion: UnderwritingRuleVersion = {
      ...ver,
      conditions: editConditions,
      outcome: editOutcome,
      scope: editScope,
    };
    const result = validateRuleVersion(fakeVersion, dictionaryFields.map(f => f.code));
    setValidationIssues(result.issues);
  }, [editConditions, editOutcome, editScope, dictionaryFields, selectedVersionId, versions]);

  // Load published rules for scenario runner
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    loadPublishedRulesForEvaluation(orgId)
      .then(result => { if (!cancelled) setPublishedRules(result); })
      .catch(err => logger.warn(LOG_CATEGORIES.DATA, 'Failed to load published rules', { orgId, error: String(err) }));
    return () => { cancelled = true; };
  }, [orgId, rules]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const selectedRule = rules.find(r => r.id === selectedRuleId);
  const selectedVersion = versions.find(v => v.id === selectedVersionId);
  const isEditable = selectedVersion?.status === 'draft' && canWriteProducts;

  const productNameMap = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(p => map.set(p.id, p.name));
    return map;
  }, [products]);

  const filteredRules = useMemo(() => {
    let filtered = rules;
    if (typeFilter !== 'all') filtered = filtered.filter(r => r.type === typeFilter);
    if (productFilter !== 'all') filtered = filtered.filter(r => r.productId === productFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => r.name.toLowerCase().includes(q) || r.type.includes(q));
    }
    return filtered;
  }, [rules, typeFilter, productFilter, searchQuery]);

  const handleCreateRule = async () => {
    if (!orgId || !user || !newRuleName.trim()) return;
    const ruleId = await createRule(orgId, { name: newRuleName.trim(), type: newRuleType, description: newRuleDesc, productId: newRuleProductId || undefined }, user.uid);
    // Auto-create first draft version
    await createRuleVersion(orgId, ruleId, {
      conditions: createEmptyGroup(),
      outcome: createDefaultOutcome(),
      scope: createDefaultScope(),
    }, user.uid);
    setSelectedRuleId(ruleId);
    setShowCreateModal(false);
    setNewRuleName('');
    setNewRuleDesc('');
    setNewRuleProductId('');
  };

  const handleSave = async () => {
    if (!orgId || !selectedRuleId || !selectedVersionId || !user) return;
    setSaveStatus('saving');
    try {
      await updateRuleVersion(orgId, selectedRuleId, selectedVersionId, {
        conditions: editConditions,
        outcome: editOutcome,
        scope: editScope,
      }, user.uid);
      // Refresh versions
      const v = await getRuleVersions(orgId, selectedRuleId);
      setVersions(v);
      setDirty(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to save rule version', {}, err as Error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleTransition = async (status: RuleVersionStatus) => {
    if (!orgId || !selectedRuleId || !selectedVersionId || !user) return;
    await transitionRuleVersion(orgId, selectedRuleId, selectedVersionId, status, user.uid);
    const v = await getRuleVersions(orgId, selectedRuleId);
    setVersions(v);
  };

  const handleClone = async () => {
    if (!orgId || !selectedRuleId || !selectedVersionId || !user) return;
    const newId = await cloneRuleVersion(orgId, selectedRuleId, selectedVersionId, user.uid);
    const v = await getRuleVersions(orgId, selectedRuleId);
    setVersions(v);
    setSelectedVersionId(newId);
  };

  const handleDeleteRule = async () => {
    if (!orgId || !selectedRuleId) return;
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    await deleteRule(orgId, selectedRuleId);
    setSelectedRuleId(null);
  };

  const handleBuilderChange = (update: { conditions?: ConditionGroup; outcome?: RuleOutcome; scope?: RuleScope }) => {
    if (update.conditions) setEditConditions(update.conditions);
    if (update.outcome) setEditOutcome(update.outcome);
    if (update.scope) setEditScope(update.scope);
    setDirty(true);
  };

  const handleSaveRuleName = async () => {
    if (!orgId || !selectedRuleId || !user || !editNameValue.trim()) return;
    await updateRule(orgId, selectedRuleId, { name: editNameValue.trim() }, user.uid);
    setEditingName(false);
  };

  const handleSaveRuleDesc = async () => {
    if (!orgId || !selectedRuleId || !user) return;
    await updateRule(orgId, selectedRuleId, { description: editDescValue.trim() }, user.uid);
    setEditingDesc(false);
  };

  const startEditingName = () => {
    if (!selectedRule || !canWriteProducts) return;
    setEditNameValue(selectedRule.name);
    setEditingName(true);
  };

  const startEditingDesc = () => {
    if (!selectedRule || !canWriteProducts) return;
    setEditDescValue(selectedRule.description || '');
    setEditingDesc(true);
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <PageContainer>
      <MainNavigation />
      <PageContent>
        <EnhancedHeader
          title="Underwriting Rules"
          subtitle="Author, version, and test deterministic underwriting rules"
          icon={ShieldCheckIcon}
        />

        <Layout>
          {/* Sidebar – Rule List */}
          <Sidebar>
            <SidebarCard>
              <SidebarHeader>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#374151' }}>
                  Rules ({filteredRules.length})
                </span>
                {canWriteProducts && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowCreateModal(true)}
                    style={{ padding: '6px 12px' }}
                  >
                    <PlusIcon style={{ width: 14, height: 14 }} />
                    New Rule
                  </Button>
                )}
              </SidebarHeader>

              <div style={{ position: 'relative' }}>
                <MagnifyingGlassIcon style={{ position: 'absolute', left: 28, top: 23, width: 16, height: 16, color: '#9ca3af' }} />
                <SearchInput
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search rules…"
                />
              </div>

              <FilterRow>
                {(['all', 'eligibility', 'referral', 'validation'] as const).map(t => (
                  <FilterPill key={t} $active={typeFilter === t} onClick={() => setTypeFilter(t)}>
                    {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </FilterPill>
                ))}
              </FilterRow>

              {products.length > 0 && (
                <div style={{ padding: '8px 16px 0' }}>
                  <ProductFilterSelect
                    value={productFilter}
                    onChange={e => setProductFilter(e.target.value)}
                  >
                    <option value="all">All Products</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </ProductFilterSelect>
                </div>
              )}

              <RuleList>
                {filteredRules.map(rule => (
                  <RuleItem
                    key={rule.id}
                    $selected={rule.id === selectedRuleId}
                    onClick={() => setSelectedRuleId(rule.id)}
                  >
                    <RuleName>{rule.name}</RuleName>
                    <RuleMeta>
                      <TypeBadge $type={rule.type}>{rule.type}</TypeBadge>
                      <span>v{rule.versionCount}</span>
                    </RuleMeta>
                    {rule.productId && productNameMap.has(rule.productId) && (
                      <ProductBadge>{productNameMap.get(rule.productId)}</ProductBadge>
                    )}
                  </RuleItem>
                ))}
                {filteredRules.length === 0 && (
                  <EmptyState style={{ padding: '32px 16px' }}>
                    <ShieldExclamationIcon style={{ width: 32, height: 32, margin: '0 auto 8px', color: '#d1d5db' }} />
                    <div>No rules found</div>
                  </EmptyState>
                )}
              </RuleList>
            </SidebarCard>
          </Sidebar>

          {/* Main Panel */}
          <MainPanel>
            {selectedRule && selectedVersion ? (
              <>
                {/* Rule Header – Editable name & description */}
                <RuleHeaderSection>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingName ? (
                        <InlineEditRow>
                          <InlineInput
                            value={editNameValue}
                            onChange={e => setEditNameValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveRuleName();
                              if (e.key === 'Escape') setEditingName(false);
                            }}
                            autoFocus
                          />
                          <Button variant="primary" size="xs" onClick={handleSaveRuleName}>Save</Button>
                          <Button variant="ghost" size="xs" onClick={() => setEditingName(false)}>
                            <XMarkIcon style={{ width: 14, height: 14 }} />
                          </Button>
                        </InlineEditRow>
                      ) : (
                        <RuleTitle onClick={startEditingName} title={canWriteProducts ? 'Click to edit name' : undefined}>
                          {selectedRule.name}
                        </RuleTitle>
                      )}

                      {editingDesc ? (
                        <InlineEditRow style={{ marginTop: 4 }}>
                          <InlineDescInput
                            value={editDescValue}
                            onChange={e => setEditDescValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveRuleDesc();
                              if (e.key === 'Escape') setEditingDesc(false);
                            }}
                            placeholder="Add a description…"
                            autoFocus
                          />
                          <Button variant="primary" size="xs" onClick={handleSaveRuleDesc}>Save</Button>
                          <Button variant="ghost" size="xs" onClick={() => setEditingDesc(false)}>
                            <XMarkIcon style={{ width: 14, height: 14 }} />
                          </Button>
                        </InlineEditRow>
                      ) : (
                        <RuleDescription onClick={startEditingDesc} title={canWriteProducts ? 'Click to edit description' : undefined}>
                          {selectedRule.description || (canWriteProducts ? 'Click to add a description…' : 'No description')}
                        </RuleDescription>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TypeBadge $type={selectedRule.type} style={{ fontSize: 12, padding: '2px 10px' }}>
                        {selectedRule.type}
                      </TypeBadge>
                      {selectedRule.productId && productNameMap.has(selectedRule.productId) && (
                        <ProductBadge style={{ marginTop: 0 }}>{productNameMap.get(selectedRule.productId)}</ProductBadge>
                      )}
                    </div>
                  </div>
                </RuleHeaderSection>

                {/* Tab Bar + Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <TabBar>
                    <Tab $active={activeTab === 'builder'} onClick={() => setActiveTab('builder')}>
                      <PencilIcon style={{ width: 14, height: 14, marginRight: 4, verticalAlign: 'middle' }} />
                      Builder
                    </Tab>
                    <Tab $active={activeTab === 'runner'} onClick={() => setActiveTab('runner')}>
                      <PlayIcon style={{ width: 14, height: 14, marginRight: 4, verticalAlign: 'middle' }} />
                      Scenario Runner
                    </Tab>
                  </TabBar>

                  <SaveStatusBadge $status={saveStatus}>
                    {saveStatus === 'saving' && 'Saving…'}
                    {saveStatus === 'saved' && 'Saved'}
                    {saveStatus === 'error' && 'Save failed'}
                  </SaveStatusBadge>

                  {activeTab === 'builder' && isEditable && (
                    <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSave}
                        disabled={!dirty || saveStatus === 'saving'}
                      >
                        {saveStatus === 'saving' ? 'Saving…' : dirty ? 'Save Draft' : 'Saved'}
                      </Button>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleTransition('published')}
                        disabled={validationIssues.some(i => i.type === 'error') || dirty}
                        title={dirty ? 'Save your changes before publishing' : undefined}
                      >
                        Publish
                      </Button>
                    </div>
                  )}

                  {activeTab === 'builder' && !isEditable && selectedVersion.status !== 'draft' && canWriteProducts && (
                    <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                      <Button variant="primary" size="sm" onClick={handleClone}>
                        <DocumentDuplicateIcon style={{ width: 14, height: 14 }} />
                        Clone to Draft
                      </Button>
                    </div>
                  )}
                </div>

                {/* Version Bar */}
                <VersionBar>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Version:</span>
                  <select
                    value={selectedVersionId ?? ''}
                    onChange={e => setSelectedVersionId(e.target.value)}
                    style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 8px', fontSize: 13 }}
                  >
                    {versions.map(v => (
                      <option key={v.id} value={v.id}>
                        v{v.versionNumber} – {v.status}
                      </option>
                    ))}
                  </select>
                  <StatusDot $color={VERSION_STATUS_CONFIG[selectedVersion.status as keyof typeof VERSION_STATUS_CONFIG]?.color ?? '#6b7280'} />
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    {VERSION_STATUS_CONFIG[selectedVersion.status as keyof typeof VERSION_STATUS_CONFIG]?.label ?? selectedVersion.status}
                  </span>

                  {canWriteProducts && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={handleDeleteRule}
                      style={{ marginLeft: 'auto', color: '#dc2626' }}
                    >
                      <TrashIcon style={{ width: 14, height: 14 }} />
                    </Button>
                  )}
                </VersionBar>

                {/* Read-only banner for non-draft versions */}
                {activeTab === 'builder' && !isEditable && selectedVersion.status !== 'draft' && (
                  <ReadOnlyBanner>
                    <ShieldCheckIcon style={{ width: 18, height: 18, flexShrink: 0 }} />
                    <span>
                      This version is <strong>{selectedVersion.status}</strong> and cannot be edited directly.
                      {canWriteProducts && ' Click "Clone to Draft" above to create an editable copy.'}
                    </span>
                  </ReadOnlyBanner>
                )}

                {/* Content */}
                {activeTab === 'builder' ? (
                  <RuleBuilder
                    conditions={editConditions}
                    outcome={editOutcome}
                    scope={editScope}
                    dictionaryFields={dictionaryFields}
                    onChange={handleBuilderChange}
                    validationIssues={validationIssues}
                    readOnly={!isEditable}
                    orgId={orgId}
                    ruleVersionId={selectedVersionId ?? undefined}
                    ruleLabel={selectedRule?.name}
                    userId={user?.uid}
                    products={products}
                  />
                ) : (
                  <RuleScenarioRunner
                    rules={publishedRules}
                    dictionaryFields={dictionaryFields}
                    productVersionId={editScope.productVersionId || ''}
                    state={editScope.stateCode ?? undefined}
                  />
                )}
              </>
            ) : (
              <EmptyState>
                <ShieldCheckIcon style={{ width: 48, height: 48, margin: '0 auto 12px', color: '#d1d5db' }} />
                <h3 style={{ color: '#374151', marginBottom: 4 }}>Select a rule to edit</h3>
                <p style={{ margin: 0 }}>Choose a rule from the list, or create a new one.</p>
              </EmptyState>
            )}
          </MainPanel>
        </Layout>

        {/* Create Rule Modal */}
        {showCreateModal && (
          <ModalOverlay onClick={() => setShowCreateModal(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalTitle>Create Underwriting Rule</ModalTitle>
              <ModalField>
                <ModalLabel>Name</ModalLabel>
                <ModalInput
                  value={newRuleName}
                  onChange={e => setNewRuleName(e.target.value)}
                  placeholder="e.g. Coastal Wind Exclusion"
                  autoFocus
                />
              </ModalField>
              <ModalField>
                <ModalLabel>Type</ModalLabel>
                <ModalSelect value={newRuleType} onChange={e => setNewRuleType(e.target.value as UnderwritingRuleType)}>
                  <option value="eligibility">Eligibility</option>
                  <option value="referral">Referral</option>
                  <option value="validation">Validation</option>
                </ModalSelect>
              </ModalField>
              <ModalField>
                <ModalLabel>Product</ModalLabel>
                <ModalSelect value={newRuleProductId} onChange={e => setNewRuleProductId(e.target.value)}>
                  <option value="">— Select a product —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </ModalSelect>
              </ModalField>
              <ModalField>
                <ModalLabel>Description (optional)</ModalLabel>
                <ModalInput
                  value={newRuleDesc}
                  onChange={e => setNewRuleDesc(e.target.value)}
                  placeholder="Brief description…"
                />
              </ModalField>
              <ModalActions>
                <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleCreateRule} disabled={!newRuleName.trim()}>
                  Create Rule
                </Button>
              </ModalActions>
            </Modal>
          </ModalOverlay>
        )}
      </PageContent>
    </PageContainer>
  );
};

export default UnderwritingRules;
