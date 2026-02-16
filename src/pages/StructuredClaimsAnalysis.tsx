/**
 * StructuredClaimsAnalysis – defensible claims analysis page
 *
 * Three-panel layout:
 *   Left:   Pick published form version(s)
 *   Center: Structured scenario intake form
 *   Right:  Analysis output + sources panel
 *
 * Every analysis references specific form versions and exposes sources used.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BookOpenIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import MainNavigation from '../components/ui/Navigation';
import { PageContainer, PageContent } from '../components/ui/PageContainer';
import EnhancedHeader from '../components/ui/EnhancedHeader';
import { Button } from '../components/ui/Button';
import { useRole } from '../hooks/useRole';
import {
  getPublishedFormVersionsForPicker,
  runStructuredAnalysis,
  listClaimsAnalyses,
} from '../services/structuredClaimsService';
import type { OrgForm, OrgFormVersion } from '../types/form';
import type {
  ClaimScenario,
  ClaimsAnalysis,
  AnalysisCitation,
  CauseOfLoss,
  DamageType,
} from '../types/claimsAnalysis';
import {
  CAUSE_OF_LOSS_LABELS,
  DAMAGE_TYPE_LABELS,
  DETERMINATION_LABELS,
  DETERMINATION_COLORS,
  createEmptyScenario,
} from '../types/claimsAnalysis';

// ============================================================================
// Styled Components
// ============================================================================

const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}`;

const spin = keyframes`from{transform:rotate(0deg)}to{transform:rotate(360deg)}`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr 420px;
  gap: 20px;
  animation: ${fadeIn} 0.3s ease;
  min-height: calc(100vh - 220px);

  @media (max-width: 1400px) {
    grid-template-columns: 280px 1fr 360px;
  }

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div<{ $scrollable?: boolean }>`
  background: ${({ theme }) => theme.card.background};
  border: ${({ theme }) => theme.card.border};
  border-radius: ${({ theme }) => theme.card.borderRadius};
  box-shadow: ${({ theme }) => theme.card.shadow};
  display: flex;
  flex-direction: column;
  ${({ $scrollable }) => $scrollable && css`max-height: calc(100vh - 220px); overflow: hidden;`}
`;

const PanelHeader = styled.div`
  padding: 18px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colours.border};
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`;

const PanelTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
  display: flex;
  align-items: center;
  gap: 8px;
  svg { width: 18px; height: 18px; color: ${({ theme }) => theme.colours.primary}; }
`;

const PanelBody = styled.div<{ $pad?: boolean }>`
  flex: 1;
  overflow-y: auto;
  padding: ${({ $pad }) => $pad !== false ? '16px 20px' : '0'};
`;

// Left panel (form picker)
const SearchBox = styled.div`
  position: relative;
  margin-bottom: 12px;
  svg {
    position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
    width: 15px; height: 15px; color: ${({ theme }) => theme.colours.textMuted};
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 9px 10px 9px 32px;
  border: 1.5px solid ${({ theme }) => theme.colours.border};
  border-radius: 8px;
  font-size: 13px;
  background: ${({ theme }) => theme.colours.background};
  color: ${({ theme }) => theme.colours.text};
  &:focus { outline: none; border-color: ${({ theme }) => theme.colours.primary}; box-shadow: 0 0 0 2px rgba(99,102,241,0.12); }
`;

const FormPickerList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FormPickerItem = styled.li<{ $selected?: boolean }>`
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  border: 1.5px solid ${({ $selected }) => $selected ? 'rgba(99,102,241,0.35)' : 'transparent'};
  background: ${({ $selected }) => $selected ? 'rgba(99,102,241,0.06)' : 'transparent'};
  transition: all 0.15s ease;
  &:hover { background: ${({ $selected }) => $selected ? 'rgba(99,102,241,0.08)' : 'rgba(0,0,0,0.02)'}; }
`;

const FormPickerNumber = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
`;

const FormPickerMeta = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colours.textMuted};
  margin-top: 2px;
`;

const SelectedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(99,102,241,0.1);
  color: #6366f1;
  margin-top: 4px;
  svg { width: 12px; height: 12px; }
`;

const SelectedSummary = styled.div`
  padding: 10px 12px;
  background: rgba(99,102,241,0.06);
  border: 1px solid rgba(99,102,241,0.15);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #6366f1;
  margin-bottom: 12px;
`;

// Center panel (scenario form)
const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.textSecondary};
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;

const Input = styled.input`
  width: 100%;
  padding: 9px 12px;
  border: 1.5px solid ${({ theme }) => theme.colours.border};
  border-radius: 8px;
  font-size: 13px;
  background: white;
  color: ${({ theme }) => theme.colours.text};
  &:focus { outline: none; border-color: ${({ theme }) => theme.colours.primary}; box-shadow: 0 0 0 2px rgba(99,102,241,0.12); }
`;

const Select = styled.select`
  width: 100%;
  padding: 9px 12px;
  border: 1.5px solid ${({ theme }) => theme.colours.border};
  border-radius: 8px;
  font-size: 13px;
  background: white;
  color: ${({ theme }) => theme.colours.text};
  &:focus { outline: none; border-color: ${({ theme }) => theme.colours.primary}; }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid ${({ theme }) => theme.colours.border};
  border-radius: 8px;
  font-size: 13px;
  background: white;
  color: ${({ theme }) => theme.colours.text};
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
  line-height: 1.6;
  &:focus { outline: none; border-color: ${({ theme }) => theme.colours.primary}; box-shadow: 0 0 0 2px rgba(99,102,241,0.12); }
`;

const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colours.text};
  cursor: pointer;
  padding: 4px 0;
  input { accent-color: #6366f1; }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 20px;
`;

// Right panel (output)
const DeterminationBanner = styled.div<{ $color: string }>`
  padding: 16px 18px;
  background: ${({ $color }) => `${$color}10`};
  border: 1.5px solid ${({ $color }) => `${$color}30`};
  border-radius: 12px;
  margin-bottom: 16px;
  text-align: center;
`;

const DeterminationLabel = styled.div<{ $color: string }>`
  font-size: 18px;
  font-weight: 700;
  color: ${({ $color }) => $color};
  letter-spacing: -0.01em;
`;

const DeterminationSummary = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colours.textSecondary};
  margin-top: 8px;
  line-height: 1.5;
`;

const OutputSection = styled.div`
  margin-bottom: 16px;
`;

const OutputSectionTitle = styled.h4`
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  svg { width: 14px; height: 14px; color: ${({ theme }) => theme.colours.textMuted}; }
`;

const BulletList = styled.ul`
  margin: 0;
  padding-left: 18px;
  li {
    font-size: 13px;
    line-height: 1.6;
    color: ${({ theme }) => theme.colours.textSecondary};
    margin-bottom: 4px;
  }
`;

const CitationCard = styled.div`
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 8px;
  font-size: 12px;
  margin-bottom: 8px;
  transition: border-color 0.15s;
  &:hover { border-color: rgba(99,102,241,0.3); }
`;

const CitationFormLabel = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colours.primary};
  margin-bottom: 2px;
`;

const CitationSection = styled.div`
  color: ${({ theme }) => theme.colours.textSecondary};
`;

const CitationExcerpt = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colours.textMuted};
  margin-top: 4px;
  font-style: italic;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const MetadataRow = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 14px;
  background: ${({ theme }) => theme.colours.backgroundAlt};
  border-radius: 8px;
  font-size: 11px;
  color: ${({ theme }) => theme.colours.textMuted};
  margin-top: 12px;
`;

const MetadataItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  svg { width: 12px; height: 12px; }
`;

const GroundedLink = styled.button`
  display: flex; align-items: center; gap: 6px;
  padding: 10px 16px; margin-top: 12px;
  background: linear-gradient(135deg, rgba(99,102,241,0.06), rgba(99,102,241,0.12));
  border: 1.5px solid rgba(99,102,241,0.25);
  border-radius: 10px; cursor: pointer;
  font-size: 13px; font-weight: 600; color: #6366f1;
  transition: all 0.15s ease;
  &:hover { background: rgba(99,102,241,0.14); border-color: rgba(99,102,241,0.4); }
  svg { width: 16px; height: 16px; }
`;

const Spinner = styled.div`
  border: 3px solid rgba(99,102,241,0.15);
  border-top: 3px solid #6366f1;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: ${spin} 0.8s linear infinite;
`;

const AnalysingOverlay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 48px 24px;
  text-align: center;
  color: ${({ theme }) => theme.colours.textSecondary};
  font-size: 14px;
`;

const EmptyRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
  color: ${({ theme }) => theme.colours.textMuted};
  svg { width: 40px; height: 40px; opacity: 0.3; }
`;

const ErrorBanner = styled.div`
  padding: 12px 16px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 8px;
  color: #dc2626;
  font-size: 13px;
  margin-bottom: 12px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; }
`;

const MarkdownOutput = styled.div`
  font-size: 13px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colours.textSecondary};

  h2 { font-size: 15px; font-weight: 700; margin: 16px 0 8px; color: ${({ theme }) => theme.colours.text}; }
  h3 { font-size: 14px; font-weight: 600; margin: 12px 0 6px; color: ${({ theme }) => theme.colours.text}; }
  p { margin: 8px 0; }
  ul, ol { padding-left: 20px; margin: 8px 0; }
  li { margin: 4px 0; }
  strong { font-weight: 600; color: ${({ theme }) => theme.colours.text}; }
  code { background: rgba(99,102,241,0.08); padding: 1px 5px; border-radius: 4px; font-size: 12px; }
`;

// ============================================================================
// Component
// ============================================================================

interface PickerEntry { form: OrgForm; version: OrgFormVersion }

export default function StructuredClaimsAnalysis() {
  const navigate = useNavigate();
  const { currentOrg, user } = useRole();
  const orgId = currentOrg?.id || '';
  const userId = user?.uid || '';

  // Form picker
  const [pickerEntries, setPickerEntries] = useState<PickerEntry[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [selectedVersionIds, setSelectedVersionIds] = useState<Set<string>>(new Set());
  const [loadingPicker, setLoadingPicker] = useState(true);

  // Scenario
  const [scenario, setScenario] = useState<ClaimScenario>(createEmptyScenario());

  // Analysis
  const [currentAnalysis, setCurrentAnalysis] = useState<ClaimsAnalysis | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // History
  const [history, setHistory] = useState<ClaimsAnalysis[]>([]);

  // Collapsed sections in output
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['coverages', 'exclusions', 'details', 'citations'])
  );

  // ── Load picker data ──
  useEffect(() => {
    if (!orgId) return;
    setLoadingPicker(true);
    (async () => {
      try {
        const entries = await getPublishedFormVersionsForPicker(orgId);
        setPickerEntries(entries);
      } catch {
        // non-critical
      } finally {
        setLoadingPicker(false);
      }
    })();
  }, [orgId]);

  // ── Load history ──
  useEffect(() => {
    if (!orgId) return;
    listClaimsAnalyses(orgId, { limit: 10 }).then(setHistory).catch(() => {});
  }, [orgId, currentAnalysis]);

  // ── Filtered picker ──
  const filteredPicker = useMemo(() => {
    if (!pickerSearch) return pickerEntries;
    const q = pickerSearch.toLowerCase();
    return pickerEntries.filter(e =>
      e.form.formNumber.toLowerCase().includes(q) ||
      e.form.title.toLowerCase().includes(q) ||
      e.version.editionDate.toLowerCase().includes(q)
    );
  }, [pickerEntries, pickerSearch]);

  // ── Handlers ──
  const toggleFormVersion = useCallback((versionId: string) => {
    setSelectedVersionIds(prev => {
      const next = new Set(prev);
      if (next.has(versionId)) next.delete(versionId);
      else next.add(versionId);
      return next;
    });
  }, []);

  const updateScenario = useCallback(<K extends keyof ClaimScenario>(
    field: K,
    value: ClaimScenario[K],
  ) => {
    setScenario(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleDamageType = useCallback((dt: DamageType) => {
    setScenario(prev => {
      const types = prev.damageTypes.includes(dt)
        ? prev.damageTypes.filter(t => t !== dt)
        : [...prev.damageTypes, dt];
      return { ...prev, damageTypes: types };
    });
  }, []);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleRunAnalysis = useCallback(async () => {
    if (!orgId || !userId) return;
    if (selectedVersionIds.size === 0) {
      setError('Select at least one published form version.');
      return;
    }
    if (!scenario.factsNarrative.trim()) {
      setError('Provide a facts narrative describing the claim scenario.');
      return;
    }

    setError(null);
    setAnalysing(true);
    setCurrentAnalysis(null);

    try {
      const result = await runStructuredAnalysis(
        orgId,
        scenario,
        Array.from(selectedVersionIds),
        userId,
      );
      setCurrentAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalysing(false);
    }
  }, [orgId, userId, selectedVersionIds, scenario]);

  const handleReset = useCallback(() => {
    setCurrentAnalysis(null);
    setScenario(createEmptyScenario());
    setSelectedVersionIds(new Set());
    setError(null);
  }, []);

  const selectedEntries = pickerEntries.filter(e => selectedVersionIds.has(e.version.id));
  const sf = currentAnalysis?.structuredFields;
  const citations = currentAnalysis?.citations || [];

  // ── Render ──
  return (
    <PageContainer>
      <MainNavigation />
      <PageContent id="main-content">
        <EnhancedHeader
          title="Claims Analysis"
          subtitle="Structured, form-grounded coverage analysis with citations"
          icon={BookOpenIcon}
        />

        {error && (
          <ErrorBanner>
            <ExclamationTriangleIcon />
            <div style={{ flex: 1 }}>{error}</div>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <XMarkIcon style={{ width: 14, height: 14, color: '#dc2626' }} />
            </button>
          </ErrorBanner>
        )}

        <Layout>
          {/* ── LEFT: Form Picker ── */}
          <Panel $scrollable>
            <PanelHeader>
              <PanelTitle>
                <DocumentTextIcon />
                Form Sources
              </PanelTitle>
              {selectedVersionIds.size > 0 && (
                <SelectedBadge>
                  <CheckCircleIcon /> {selectedVersionIds.size} selected
                </SelectedBadge>
              )}
            </PanelHeader>
            <PanelBody>
              <SearchBox>
                <MagnifyingGlassIcon />
                <SearchInput
                  placeholder="Search forms..."
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                />
              </SearchBox>

              {selectedVersionIds.size > 0 && (
                <SelectedSummary>
                  {selectedEntries.map(e => e.form.formNumber).join(', ')}
                </SelectedSummary>
              )}

              {loadingPicker ? (
                <EmptyRight><Spinner /></EmptyRight>
              ) : filteredPicker.length === 0 ? (
                <EmptyRight>
                  <DocumentTextIcon />
                  <div style={{ fontSize: 12 }}>
                    {pickerSearch ? 'No matching published forms.' : 'No published form editions available.'}
                  </div>
                </EmptyRight>
              ) : (
                <FormPickerList>
                  {filteredPicker.map(e => {
                    const sel = selectedVersionIds.has(e.version.id);
                    return (
                      <FormPickerItem
                        key={e.version.id}
                        $selected={sel}
                        onClick={() => toggleFormVersion(e.version.id)}
                      >
                        <FormPickerNumber>
                          {e.form.formNumber}
                          {sel && <CheckCircleIcon style={{ width: 14, height: 14, color: '#6366f1', marginLeft: 6, verticalAlign: 'middle' }} />}
                        </FormPickerNumber>
                        <FormPickerMeta>
                          {e.form.title} &middot; Ed. {e.version.editionDate}
                        </FormPickerMeta>
                        <FormPickerMeta>
                          v{e.version.versionNumber} &middot; {e.version.jurisdiction.slice(0, 3).join(', ')}
                          {e.version.jurisdiction.length > 3 && ` +${e.version.jurisdiction.length - 3}`}
                        </FormPickerMeta>
                      </FormPickerItem>
                    );
                  })}
                </FormPickerList>
              )}
            </PanelBody>
          </Panel>

          {/* ── CENTER: Scenario Form ── */}
          <Panel>
            <PanelHeader>
              <PanelTitle>
                <PlayIcon />
                Claim Scenario
              </PanelTitle>
            </PanelHeader>
            <PanelBody>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <FormGroup>
                  <Label>Loss Date *</Label>
                  <Input
                    type="date"
                    value={scenario.lossDate}
                    onChange={e => updateScenario('lossDate', e.target.value)}
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Cause of Loss *</Label>
                  <Select
                    value={scenario.causeOfLoss}
                    onChange={e => updateScenario('causeOfLoss', e.target.value as CauseOfLoss)}
                  >
                    {Object.entries(CAUSE_OF_LOSS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </Select>
                </FormGroup>
              </div>

              {scenario.causeOfLoss === 'other' && (
                <FormGroup>
                  <Label>Cause Detail</Label>
                  <Input
                    value={scenario.causeOfLossDetail || ''}
                    onChange={e => updateScenario('causeOfLossDetail', e.target.value)}
                    placeholder="Describe the cause of loss..."
                  />
                </FormGroup>
              )}

              <FormGroup>
                <Label>Damage Types</Label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(Object.entries(DAMAGE_TYPE_LABELS) as [DamageType, string][]).map(([k, v]) => (
                    <CheckboxRow key={k}>
                      <input
                        type="checkbox"
                        checked={scenario.damageTypes.includes(k)}
                        onChange={() => toggleDamageType(k)}
                      />
                      {v}
                    </CheckboxRow>
                  ))}
                </div>
              </FormGroup>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <FormGroup>
                  <Label>Estimated Damages ($)</Label>
                  <Input
                    type="number"
                    value={scenario.estimatedDamages || ''}
                    onChange={e => updateScenario('estimatedDamages', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Optional"
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Loss Location</Label>
                  <Input
                    value={scenario.lossLocation || ''}
                    onChange={e => updateScenario('lossLocation', e.target.value)}
                    placeholder="State / address"
                  />
                </FormGroup>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <FormGroup>
                  <Label>Claimant Name</Label>
                  <Input
                    value={scenario.claimantName || ''}
                    onChange={e => updateScenario('claimantName', e.target.value)}
                    placeholder="Optional"
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Policy Number</Label>
                  <Input
                    value={scenario.policyNumber || ''}
                    onChange={e => updateScenario('policyNumber', e.target.value)}
                    placeholder="Optional"
                  />
                </FormGroup>
              </div>

              <FormGroup>
                <Label>Facts / Narrative *</Label>
                <TextArea
                  value={scenario.factsNarrative}
                  onChange={e => updateScenario('factsNarrative', e.target.value)}
                  placeholder="Describe the facts of the claim in detail. Include what happened, when, where, who was involved, and what damages resulted..."
                  rows={6}
                />
              </FormGroup>

              <ButtonRow>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleRunAnalysis}
                  disabled={analysing || selectedVersionIds.size === 0 || !scenario.factsNarrative.trim()}
                >
                  {analysing ? (
                    <>
                      <Spinner style={{ width: 16, height: 16, borderWidth: 2 }} />
                      Analysing...
                    </>
                  ) : (
                    <>
                      <PlayIcon style={{ width: 16, height: 16 }} />
                      Run Analysis
                    </>
                  )}
                </Button>
                <Button variant="ghost" size="md" onClick={handleReset}>
                  <ArrowPathIcon style={{ width: 14, height: 14 }} /> Reset
                </Button>
              </ButtonRow>
            </PanelBody>
          </Panel>

          {/* ── RIGHT: Output + Sources ── */}
          <Panel $scrollable>
            <PanelHeader>
              <PanelTitle>
                <BookOpenIcon />
                Analysis Output
              </PanelTitle>
            </PanelHeader>
            <PanelBody>
              {analysing ? (
                <AnalysingOverlay>
                  <Spinner />
                  <div>Analysing claim against {selectedVersionIds.size} form{selectedVersionIds.size > 1 ? 's' : ''}...</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    This may take 15-30 seconds depending on the number of forms.
                  </div>
                </AnalysingOverlay>
              ) : !currentAnalysis ? (
                <EmptyRight>
                  <BookOpenIcon />
                  <div style={{ fontSize: 13 }}>
                    Select form(s), fill in the scenario, and click <strong>Run Analysis</strong>.
                  </div>
                  <div style={{ fontSize: 12 }}>
                    The analysis will reference specific form versions and expose all sources used.
                  </div>
                </EmptyRight>
              ) : (
                <>
                  {/* Determination */}
                  {sf && (
                    <DeterminationBanner $color={DETERMINATION_COLORS[sf.determination]}>
                      <DeterminationLabel $color={DETERMINATION_COLORS[sf.determination]}>
                        {DETERMINATION_LABELS[sf.determination]}
                      </DeterminationLabel>
                      {sf.summary && <DeterminationSummary>{sf.summary}</DeterminationSummary>}
                    </DeterminationBanner>
                  )}

                  {/* Applicable Coverages */}
                  {sf && sf.applicableCoverages.length > 0 && (
                    <OutputSection>
                      <OutputSectionTitle onClick={() => toggleSection('coverages')}>
                        {expandedSections.has('coverages') ? <ChevronDownIcon /> : <ChevronRightIcon />}
                        Applicable Coverages ({sf.applicableCoverages.length})
                      </OutputSectionTitle>
                      {expandedSections.has('coverages') && (
                        <BulletList>
                          {sf.applicableCoverages.map((c, i) => <li key={i}>{c}</li>)}
                        </BulletList>
                      )}
                    </OutputSection>
                  )}

                  {/* Exclusions */}
                  {sf && sf.relevantExclusions.length > 0 && (
                    <OutputSection>
                      <OutputSectionTitle onClick={() => toggleSection('exclusions')}>
                        {expandedSections.has('exclusions') ? <ChevronDownIcon /> : <ChevronRightIcon />}
                        Relevant Exclusions ({sf.relevantExclusions.length})
                      </OutputSectionTitle>
                      {expandedSections.has('exclusions') && (
                        <BulletList>
                          {sf.relevantExclusions.map((e, i) => <li key={i}>{e}</li>)}
                        </BulletList>
                      )}
                    </OutputSection>
                  )}

                  {/* Conditions */}
                  {sf && sf.conditionsAndLimitations.length > 0 && (
                    <OutputSection>
                      <OutputSectionTitle onClick={() => toggleSection('conditions')}>
                        {expandedSections.has('conditions') ? <ChevronDownIcon /> : <ChevronRightIcon />}
                        Conditions & Limitations ({sf.conditionsAndLimitations.length})
                      </OutputSectionTitle>
                      {expandedSections.has('conditions') && (
                        <BulletList>
                          {sf.conditionsAndLimitations.map((c, i) => <li key={i}>{c}</li>)}
                        </BulletList>
                      )}
                    </OutputSection>
                  )}

                  {/* Recommendations */}
                  {sf && sf.recommendations.length > 0 && (
                    <OutputSection>
                      <OutputSectionTitle onClick={() => toggleSection('recs')}>
                        {expandedSections.has('recs') ? <ChevronDownIcon /> : <ChevronRightIcon />}
                        Recommendations ({sf.recommendations.length})
                      </OutputSectionTitle>
                      {expandedSections.has('recs') && (
                        <BulletList>
                          {sf.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                        </BulletList>
                      )}
                    </OutputSection>
                  )}

                  {/* Citations / Sources */}
                  <OutputSection>
                    <OutputSectionTitle onClick={() => toggleSection('citations')}>
                      {expandedSections.has('citations') ? <ChevronDownIcon /> : <ChevronRightIcon />}
                      Sources & Citations ({citations.length})
                    </OutputSectionTitle>
                    {expandedSections.has('citations') && (
                      citations.length === 0 ? (
                        <div style={{ fontSize: 12, color: '#94a3b8', padding: '8px 0' }}>
                          No specific form citations were extracted.
                        </div>
                      ) : (
                        citations.map((c, i) => (
                          <CitationCard key={i}>
                            <CitationFormLabel>{c.formLabel}</CitationFormLabel>
                            <CitationSection>{c.section}</CitationSection>
                            {c.excerptText && (
                              <CitationExcerpt>"{c.excerptText}"</CitationExcerpt>
                            )}
                          </CitationCard>
                        ))
                      )
                    )}
                  </OutputSection>

                  {/* Full markdown (collapsible) */}
                  <OutputSection>
                    <OutputSectionTitle onClick={() => toggleSection('details')}>
                      {expandedSections.has('details') ? <ChevronDownIcon /> : <ChevronRightIcon />}
                      Full Analysis Details
                    </OutputSectionTitle>
                    {expandedSections.has('details') && (
                      <MarkdownOutput
                        dangerouslySetInnerHTML={{
                          __html: currentAnalysis.outputMarkdown
                            .replace(/^## /gm, '<h2>')
                            .replace(/^### /gm, '<h3>')
                            .replace(/\n\n/g, '</p><p>')
                            .replace(/^- /gm, '<li>')
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        }}
                      />
                    )}
                  </OutputSection>

                  {/* Metadata */}
                  <MetadataRow>
                    <MetadataItem>
                      <ClockIcon /> {currentAnalysis.latencyMs}ms
                    </MetadataItem>
                    <MetadataItem>
                      Model: {currentAnalysis.modelId}
                    </MetadataItem>
                    <MetadataItem>
                      ID: {currentAnalysis.requestId}
                    </MetadataItem>
                    {currentAnalysis.tokenUsage && (
                      <MetadataItem>
                        Tokens: {currentAnalysis.tokenUsage.total}
                      </MetadataItem>
                    )}
                    <MetadataItem>
                      Forms: {currentAnalysis.formVersionIds.length}
                    </MetadataItem>
                    <MetadataItem>
                      Citations: {citations.length}
                    </MetadataItem>
                  </MetadataRow>

                  {/* Clause-Grounded Analysis link */}
                  <GroundedLink
                    onClick={() => navigate(`/claims-analysis/${currentAnalysis.id}/grounded`)}
                  >
                    <ShieldCheckIcon />
                    View Clause-Grounded Analysis — citations, open questions & decision gates
                  </GroundedLink>
                </>
              )}
            </PanelBody>
          </Panel>
        </Layout>
      </PageContent>
    </PageContainer>
  );
}
