/**
 * SimulatePage – /simulate
 *
 * End-to-end simulator for a product version + state.
 * Runs three phases: UW Decision  |  Premium Calculation  |  Applicable Forms
 * Supports saving, loading, and re-running simulations.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import styled from 'styled-components';
import {
  color, neutral, accent, space, radius, shadow, fontFamily, type as T,
  border, duration, focusRingStyle, semantic,
} from '../ui/tokens';
import { useRoleContext } from '../context/RoleContext';
import useProducts from '../hooks/useProducts';
import { Product } from '../types/index';
import { versioningService } from '../services/versioningService';
import { getRatePrograms, getSteps } from '../services/rateProgramService';
import { loadAllRulesForReadiness } from '../services/rulesEngineService';
import { getFormUses } from '../services/formService';
import { US_STATES } from '../services/stateAvailabilityService';
import {
  createSimulation, listSimulations, deleteSimulation,
} from '../services/simulationService';
import { runUWPhase, runPremiumPhase, resolveApplicableForms } from '../engine/simulationEngine';
import type { FormUseRecord } from '../engine/simulationEngine';
import type { RateProgram, RatingStep } from '../types/ratingEngine';
import type { VersionedDocument } from '../types/versioning';
import type { FormUse } from '../types/form';
import type {
  Simulation, SimulationStatus, UWDecision, UWPhaseResult,
  PremiumPhaseResult, FormsPhaseResult, ApplicableForm,
  UW_DECISION_CONFIG,
} from '../types/simulation';
import { UW_DECISION_CONFIG as DecisionConfig, SIMULATION_STATUS_CONFIG } from '../types/simulation';
import type { RuleWithVersion } from '../engine/rulesEngine';
import type { RuleTraceEntry } from '../types/rulesEngine';
import MainNavigation from '../components/ui/Navigation';

// ════════════════════════════════════════════════════════════════════════
// Styled Components
// ════════════════════════════════════════════════════════════════════════

const Page = styled.main`
  min-height: 100vh;
  background: linear-gradient(160deg, ${neutral[50]} 0%, ${neutral[100]} 50%, ${neutral[50]} 100%);
  padding: ${space[8]} ${space[8]} ${space[16]};
`;

const PageHeader = styled.header`
  max-width: 1400px;
  margin: 0 auto ${space[6]};
`;

const Title = styled.h1`
  font-family: ${fontFamily.sans};
  font-size: ${T.displaySm.size};
  font-weight: ${T.displaySm.weight};
  letter-spacing: ${T.displaySm.letterSpacing};
  color: ${color.text};
  margin: 0 0 ${space[1]};
`;

const Subtitle = styled.p`
  font-size: ${T.bodyMd.size};
  color: ${color.textSecondary};
  margin: 0;
`;

const Content = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: ${space[6]};
  align-items: start;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.section`
  background: ${color.bg};
  border: ${border.default};
  border-radius: ${radius.lg};
  box-shadow: ${shadow.card};
  overflow: hidden;
`;

const PanelHeader = styled.div`
  padding: ${space[5]} ${space[5]} ${space[4]};
  border-bottom: ${border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const PanelTitle = styled.h2`
  font-family: ${fontFamily.sans};
  font-size: ${T.headingSm.size};
  font-weight: ${T.headingSm.weight};
  color: ${color.text};
  margin: 0;
`;

const PanelBody = styled.div`
  padding: ${space[5]};
`;

const Label = styled.label`
  display: block;
  font-size: ${T.label.size};
  font-weight: ${T.label.weight};
  color: ${color.text};
  margin-bottom: ${space[1]};
`;

const Select = styled.select`
  width: 100%;
  padding: ${space[2]} ${space[3]};
  font-family: ${fontFamily.sans};
  font-size: ${T.bodySm.size};
  color: ${color.text};
  background: ${color.bg};
  border: ${border.default};
  border-radius: ${radius.sm};
  outline: none;
  transition: border-color ${duration.fast}, box-shadow ${duration.fast};
  &:focus-visible {
    ${focusRingStyle}
  }
`;

const Input = styled.input`
  width: 100%;
  padding: ${space[2]} ${space[3]};
  font-family: ${fontFamily.sans};
  font-size: ${T.bodySm.size};
  color: ${color.text};
  background: ${color.bg};
  border: ${border.default};
  border-radius: ${radius.sm};
  outline: none;
  box-sizing: border-box;
  transition: border-color ${duration.fast}, box-shadow ${duration.fast};
  &:focus-visible {
    ${focusRingStyle}
  }
  &::placeholder {
    color: ${color.textMuted};
  }
`;

const FieldGroup = styled.div`
  margin-bottom: ${space[4]};
  &:last-child { margin-bottom: 0; }
`;

const ButtonPrimary = styled.button<{ disabled?: boolean }>`
  width: 100%;
  padding: ${space[2.5]} ${space[4]};
  font-family: ${fontFamily.sans};
  font-size: ${T.label.size};
  font-weight: 600;
  color: ${color.textInverse};
  background: ${p => p.disabled ? neutral[300] : accent[600]};
  border: none;
  border-radius: ${radius.sm};
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  transition: background ${duration.fast};
  &:hover:not(:disabled) { background: ${accent[700]}; }
  &:focus-visible { ${focusRingStyle} }
`;

const ButtonGhost = styled.button`
  padding: ${space[1.5]} ${space[3]};
  font-family: ${fontFamily.sans};
  font-size: ${T.captionSm.size};
  font-weight: 500;
  color: ${color.textSecondary};
  background: transparent;
  border: ${border.default};
  border-radius: ${radius.sm};
  cursor: pointer;
  transition: all ${duration.fast};
  &:hover { background: ${color.bgMuted}; color: ${color.text}; }
`;

const Divider = styled.hr`
  border: none;
  border-top: ${border.light};
  margin: ${space[5]} 0;
`;

// ── Results Styles ──

const ResultTabs = styled.div`
  display: flex;
  gap: ${space[1]};
  padding: ${space[1]};
  background: ${neutral[100]};
  border-radius: ${radius.sm};
  margin-bottom: ${space[5]};
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: ${space[2]} ${space[3]};
  font-family: ${fontFamily.sans};
  font-size: ${T.captionSm.size};
  font-weight: 600;
  color: ${p => p.$active ? color.text : color.textSecondary};
  background: ${p => p.$active ? color.bg : 'transparent'};
  border: none;
  border-radius: ${radius.xs};
  cursor: pointer;
  transition: all ${duration.fast};
  box-shadow: ${p => p.$active ? shadow.xs : 'none'};
  &:hover { color: ${color.text}; }
`;

const DecisionBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${space[1.5]};
  padding: ${space[1]} ${space[3]};
  font-size: ${T.captionSm.size};
  font-weight: 600;
  color: ${p => p.$color};
  background: ${p => `${p.$color}14`};
  border: 1px solid ${p => `${p.$color}30`};
  border-radius: ${radius.full};
`;

const MetricRow = styled.div`
  display: flex;
  gap: ${space[3]};
  margin-bottom: ${space[5]};
  flex-wrap: wrap;
`;

const MetricCard = styled.div`
  flex: 1;
  min-width: 120px;
  padding: ${space[4]};
  background: ${neutral[50]};
  border: ${border.light};
  border-radius: ${radius.md};
  text-align: center;
`;

const MetricValue = styled.div`
  font-family: ${fontFamily.mono};
  font-size: ${T.headingLg.size};
  font-weight: 700;
  color: ${color.text};
  margin-bottom: ${space[1]};
`;

const MetricLabel = styled.div`
  font-size: ${T.captionSm.size};
  font-weight: 500;
  color: ${color.textSecondary};
  text-transform: uppercase;
  letter-spacing: ${T.overline.letterSpacing};
`;

const RuleRow = styled.div<{ $fired: boolean }>`
  padding: ${space[3]} ${space[4]};
  border-bottom: ${border.light};
  background: ${p => p.$fired ? semantic.errorLight : 'transparent'};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space[3]};
  &:last-child { border-bottom: none; }
`;

const RuleName = styled.span`
  font-size: ${T.bodySm.size};
  font-weight: 500;
  color: ${color.text};
`;

const RuleMessage = styled.span`
  font-size: ${T.caption.size};
  color: ${color.textSecondary};
  flex: 1;
`;

const StepRow = styled.div<{ $applied: boolean }>`
  padding: ${space[3]} ${space[4]};
  border-bottom: ${border.light};
  display: grid;
  grid-template-columns: 40px 1fr 120px;
  align-items: center;
  gap: ${space[3]};
  opacity: ${p => p.$applied ? 1 : 0.5};
  &:last-child { border-bottom: none; }
`;

const StepOrder = styled.span`
  font-family: ${fontFamily.mono};
  font-size: ${T.captionSm.size};
  color: ${color.textMuted};
  text-align: center;
`;

const StepName = styled.span`
  font-size: ${T.bodySm.size};
  font-weight: 500;
  color: ${color.text};
`;

const StepValue = styled.span`
  font-family: ${fontFamily.mono};
  font-size: ${T.bodySm.size};
  font-weight: 600;
  color: ${accent[700]};
  text-align: right;
`;

const FormRow = styled.div`
  padding: ${space[3]} ${space[4]};
  border-bottom: ${border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space[3]};
  &:last-child { border-bottom: none; }
`;

const FormNumber = styled.span`
  font-family: ${fontFamily.mono};
  font-size: ${T.bodySm.size};
  font-weight: 600;
  color: ${accent[700]};
  white-space: nowrap;
`;

const FormTitle = styled.span`
  font-size: ${T.bodySm.size};
  color: ${color.text};
  flex: 1;
`;

const FormType = styled.span`
  font-size: ${T.captionSm.size};
  color: ${color.textMuted};
  padding: ${space[0.5]} ${space[2]};
  background: ${neutral[100]};
  border-radius: ${radius.full};
  white-space: nowrap;
`;

const EmptyState = styled.div`
  padding: ${space[10]} ${space[6]};
  text-align: center;
  color: ${color.textMuted};
  font-size: ${T.bodySm.size};
`;

const Spinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${space[10]};
  color: ${color.textMuted};
  font-size: ${T.bodySm.size};
`;

const HistoryItem = styled.div<{ $active?: boolean }>`
  padding: ${space[3]} ${space[4]};
  border-bottom: ${border.light};
  cursor: pointer;
  transition: background ${duration.fast};
  background: ${p => p.$active ? accent[50] : 'transparent'};
  &:hover { background: ${p => p.$active ? accent[50] : neutral[50]}; }
  &:last-child { border-bottom: none; }
`;

const HistoryName = styled.div`
  font-size: ${T.bodySm.size};
  font-weight: 500;
  color: ${color.text};
  margin-bottom: ${space[0.5]};
`;

const HistoryMeta = styled.div`
  font-size: ${T.captionSm.size};
  color: ${color.textMuted};
  display: flex;
  gap: ${space[2]};
  align-items: center;
`;

const InputFieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: ${space[2]};
  margin-bottom: ${space[2]};
  align-items: end;
`;

const FieldCodeLabel = styled.span`
  font-family: ${fontFamily.mono};
  font-size: ${T.captionSm.size};
  color: ${color.textSecondary};
`;

const RemoveButton = styled.button`
  padding: ${space[1]} ${space[2]};
  font-size: ${T.captionSm.size};
  color: ${semantic.error};
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.6;
  &:hover { opacity: 1; }
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${space[1]};
  padding: ${space[1.5]} ${space[3]};
  font-family: ${fontFamily.sans};
  font-size: ${T.captionSm.size};
  font-weight: 500;
  color: ${accent[600]};
  background: transparent;
  border: 1px dashed ${accent[300]};
  border-radius: ${radius.sm};
  cursor: pointer;
  width: 100%;
  justify-content: center;
  transition: all ${duration.fast};
  &:hover {
    background: ${accent[50]};
    border-color: ${accent[400]};
  }
`;

const StatusDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${p => p.$color};
`;

const InlineActions = styled.div`
  display: flex;
  gap: ${space[2]};
  align-items: center;
`;

const ErrorBox = styled.div`
  padding: ${space[3]} ${space[4]};
  background: ${semantic.errorLight};
  border: 1px solid ${semantic.error}30;
  border-radius: ${radius.sm};
  color: ${semantic.errorDark};
  font-size: ${T.bodySm.size};
  margin-bottom: ${space[4]};
`;

const SectionLabel = styled.div`
  font-size: ${T.overline.size};
  font-weight: ${T.overline.weight};
  letter-spacing: ${T.overline.letterSpacing};
  color: ${color.textMuted};
  text-transform: uppercase;
  margin-bottom: ${space[3]};
`;

// ════════════════════════════════════════════════════════════════════════
// Input field entry
// ════════════════════════════════════════════════════════════════════════

interface InputEntry { fieldCode: string; value: string }

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

type ResultTab = 'uw' | 'premium' | 'forms';

const SimulatePage: React.FC = () => {
  const { currentOrgId } = useRoleContext();
  const { data: products, loading: productsLoading } = useProducts();

  // ── Context selectors ──
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productVersions, setProductVersions] = useState<VersionedDocument<unknown>[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);

  // ── Rate programs for the product ──
  const [ratePrograms, setRatePrograms] = useState<RateProgram[]>([]);
  const [selectedRateProgramId, setSelectedRateProgramId] = useState('');

  // ── Input fields ──
  const [inputEntries, setInputEntries] = useState<InputEntry[]>([
    { fieldCode: '', value: '' },
  ]);

  // ── Simulation results ──
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uwResult, setUwResult] = useState<UWPhaseResult | null>(null);
  const [premiumResult, setPremiumResult] = useState<PremiumPhaseResult | null>(null);
  const [formsResult, setFormsResult] = useState<FormsPhaseResult | null>(null);
  const [totalTimeMs, setTotalTimeMs] = useState(0);
  const [activeTab, setActiveTab] = useState<ResultTab>('uw');

  // ── Saved simulations ──
  const [savedSims, setSavedSims] = useState<Simulation[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [saveName, setSaveName] = useState('');

  // ── Load product versions when product changes ──
  useEffect(() => {
    if (!currentOrgId || !selectedProductId) {
      setProductVersions([]);
      setSelectedVersionId('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const versions = await versioningService.getVersions(
          currentOrgId, 'product', selectedProductId,
        );
        if (!cancelled) {
          setProductVersions(versions);
          if (versions.length > 0) setSelectedVersionId(versions[0].id);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [currentOrgId, selectedProductId]);

  // ── Load rate programs when product changes ──
  useEffect(() => {
    if (!currentOrgId || !selectedProductId) {
      setRatePrograms([]);
      setSelectedRateProgramId('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rps = await getRatePrograms(currentOrgId);
        const filtered = rps.filter(rp => rp.productId === selectedProductId);
        if (!cancelled) {
          setRatePrograms(filtered);
          if (filtered.length > 0) setSelectedRateProgramId(filtered[0].id);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [currentOrgId, selectedProductId]);

  // ── Load saved simulations ──
  useEffect(() => {
    if (!currentOrgId) return;
    let cancelled = false;
    (async () => {
      setLoadingSaved(true);
      try {
        const sims = await listSimulations(currentOrgId, selectedProductId ? { productId: selectedProductId } : undefined);
        if (!cancelled) setSavedSims(sims);
      } catch { /* ignore */ }
      if (!cancelled) setLoadingSaved(false);
    })();
    return () => { cancelled = true; };
  }, [currentOrgId, selectedProductId]);

  // ── Build inputs map ──
  const inputsMap = useMemo(() => {
    const map: Record<string, string | number | boolean | null> = {};
    for (const entry of inputEntries) {
      if (!entry.fieldCode.trim()) continue;
      // Try to parse as number or boolean
      const raw = entry.value.trim();
      if (raw === 'true') map[entry.fieldCode.trim()] = true;
      else if (raw === 'false') map[entry.fieldCode.trim()] = false;
      else if (raw !== '' && !isNaN(Number(raw))) map[entry.fieldCode.trim()] = Number(raw);
      else map[entry.fieldCode.trim()] = raw || null;
    }
    return map;
  }, [inputEntries]);

  const canRun = selectedProductId && selectedVersionId && selectedState && effectiveDate;

  // ── Run simulation ──
  const handleRun = useCallback(async () => {
    if (!canRun || !currentOrgId) return;
    setRunning(true);
    setError(null);
    setUwResult(null);
    setPremiumResult(null);
    setFormsResult(null);
    setTotalTimeMs(0);

    const startTime = performance.now();

    try {
      // Phase 1: UW Rules
      const allRules = await loadAllRulesForReadiness(currentOrgId);
      const publishedRules = allRules.filter(
        r => r.version.status === 'published' && r.version.scope.productVersionId === selectedVersionId,
      );
      const uw = runUWPhase(publishedRules, {
        productId: selectedProductId,
        productVersionId: selectedVersionId,
        stateCode: selectedState,
        effectiveDate: new Date(effectiveDate),
        inputs: inputsMap,
      });
      setUwResult(uw);

      // Phase 2: Premium
      let premium: PremiumPhaseResult | null = null;
      if (selectedRateProgramId) {
        // Find the published version for the rate program
        const rpVersions = await versioningService.getVersions(
          currentOrgId, 'rateProgram', selectedRateProgramId, selectedProductId,
        );
        const publishedVersion = rpVersions.find((v: any) => v.status === 'published') || rpVersions[0];
        if (publishedVersion) {
          const steps = await getSteps(currentOrgId, selectedRateProgramId, publishedVersion.id);
          premium = runPremiumPhase(steps, publishedVersion.id, {
            productId: selectedProductId,
            productVersionId: selectedVersionId,
            stateCode: selectedState,
            effectiveDate: new Date(effectiveDate),
            inputs: inputsMap,
          });
        } else {
          premium = {
            success: false,
            outputs: {},
            trace: [],
            errors: [{ code: 'NO_VERSION', message: 'No published rate program version found' }],
            warnings: [],
            executionTimeMs: 0,
            resultHash: '',
          };
        }
      } else {
        premium = {
          success: true,
          outputs: {},
          trace: [],
          errors: [],
          warnings: ['No rate program selected'],
          executionTimeMs: 0,
          resultHash: '',
        };
      }
      setPremiumResult(premium);

      // Phase 3: Forms
      const rawFormUses = await getFormUses(currentOrgId, {
        productVersionId: selectedVersionId,
      });
      const formRecords: FormUseRecord[] = rawFormUses.map(fu => ({
        formId: fu.formId,
        formNumber: fu.formNumber || '',
        formTitle: fu.formTitle || '',
        type: 'policy',
        useType: fu.useType,
        coverageId: fu.coverageVersionId,
        coverageName: fu.coverageName,
        jurisdictions: fu.stateCode ? [fu.stateCode] : [],
      }));
      const forms = resolveApplicableForms(formRecords, selectedState);
      setFormsResult(forms);

      setTotalTimeMs(performance.now() - startTime);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }, [canRun, currentOrgId, selectedProductId, selectedVersionId, selectedState, effectiveDate, selectedRateProgramId, inputsMap]);

  // ── Save simulation ──
  const handleSave = useCallback(async () => {
    if (!currentOrgId || !uwResult) return;
    const name = saveName.trim() || `Simulation ${new Date().toLocaleString()}`;
    const product = products.find(p => p.id === selectedProductId);

    try {
      const sim = await createSimulation(currentOrgId, {
        name,
        productId: selectedProductId,
        productName: product?.name || '',
        productVersionId: selectedVersionId,
        stateCode: selectedState,
        effectiveDate,
        inputs: inputsMap,
        status: 'completed' as SimulationStatus,
        uwResult: uwResult || undefined,
        premiumResult: premiumResult || undefined,
        formsResult: formsResult || undefined,
        uwDecision: uwResult?.decision,
        finalPremium: premiumResult?.finalPremium,
        applicableFormCount: formsResult?.totalFormCount,
        totalExecutionTimeMs: totalTimeMs,
      });

      setSavedSims(prev => [sim, ...prev]);
      setSaveName('');
    } catch (err) {
      setError(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [currentOrgId, uwResult, premiumResult, formsResult, selectedProductId, selectedVersionId, selectedState, effectiveDate, inputsMap, saveName, products, totalTimeMs]);

  // ── Load a saved simulation ──
  const handleLoadSim = useCallback((sim: Simulation) => {
    setSelectedProductId(sim.productId);
    setSelectedState(sim.stateCode);
    setEffectiveDate(sim.effectiveDate);
    setInputEntries(
      Object.entries(sim.inputs).map(([fieldCode, value]) => ({
        fieldCode,
        value: value !== null ? String(value) : '',
      }))
    );
    setUwResult(sim.uwResult || null);
    setPremiumResult(sim.premiumResult || null);
    setFormsResult(sim.formsResult || null);
    setTotalTimeMs(sim.totalExecutionTimeMs || 0);
    setError(null);
  }, []);

  // ── Delete a saved simulation ──
  const handleDeleteSim = useCallback(async (simId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentOrgId) return;
    try {
      await deleteSimulation(currentOrgId, simId);
      setSavedSims(prev => prev.filter(s => s.id !== simId));
    } catch { /* ignore */ }
  }, [currentOrgId]);

  // ── Input field handlers ──
  const addInputField = () => setInputEntries(prev => [...prev, { fieldCode: '', value: '' }]);
  const removeInputField = (idx: number) => setInputEntries(prev => prev.filter((_, i) => i !== idx));
  const updateInputField = (idx: number, key: 'fieldCode' | 'value', val: string) => {
    setInputEntries(prev => prev.map((e, i) => i === idx ? { ...e, [key]: val } : e));
  };

  const hasResults = uwResult || premiumResult || formsResult;

  return (
    <Page id="main-content">
      <MainNavigation />
      <PageHeader>
        <Title>Simulator</Title>
        <Subtitle>End-to-end validation: UW decision, premium, and applicable forms in one place</Subtitle>
      </PageHeader>

      <Content>
        {/* ── LEFT: Configuration Panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: space[6] }}>
          <Panel>
            <PanelHeader>
              <PanelTitle>Configuration</PanelTitle>
            </PanelHeader>
            <PanelBody>
              <FieldGroup>
                <Label>Product</Label>
                <Select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                >
                  <option value="">Select product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </FieldGroup>

              <FieldGroup>
                <Label>Version</Label>
                <Select
                  value={selectedVersionId}
                  onChange={e => setSelectedVersionId(e.target.value)}
                  disabled={!selectedProductId}
                >
                  <option value="">Select version...</option>
                  {productVersions.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNumber} — {v.status}
                    </option>
                  ))}
                </Select>
              </FieldGroup>

              <FieldGroup>
                <Label>State</Label>
                <Select
                  value={selectedState}
                  onChange={e => setSelectedState(e.target.value)}
                >
                  <option value="">Select state...</option>
                  {US_STATES.map(s => (
                    <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                  ))}
                </Select>
              </FieldGroup>

              <FieldGroup>
                <Label>Rate Program</Label>
                <Select
                  value={selectedRateProgramId}
                  onChange={e => setSelectedRateProgramId(e.target.value)}
                  disabled={ratePrograms.length === 0}
                >
                  <option value="">{ratePrograms.length ? 'Select rate program...' : 'No rate programs'}</option>
                  {ratePrograms.map(rp => (
                    <option key={rp.id} value={rp.id}>{rp.name}</option>
                  ))}
                </Select>
              </FieldGroup>

              <FieldGroup>
                <Label>Effective Date</Label>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                />
              </FieldGroup>

              <Divider />

              <SectionLabel>Input Fields</SectionLabel>
              {inputEntries.map((entry, idx) => (
                <InputFieldRow key={idx}>
                  <div>
                    <Input
                      placeholder="field_code"
                      value={entry.fieldCode}
                      onChange={e => updateInputField(idx, 'fieldCode', e.target.value)}
                      style={{ fontFamily: fontFamily.mono, fontSize: T.captionSm.size }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: space[1] }}>
                    <Input
                      placeholder="value"
                      value={entry.value}
                      onChange={e => updateInputField(idx, 'value', e.target.value)}
                    />
                    {inputEntries.length > 1 && (
                      <RemoveButton onClick={() => removeInputField(idx)} title="Remove">
                        ✕
                      </RemoveButton>
                    )}
                  </div>
                </InputFieldRow>
              ))}
              <AddButton onClick={addInputField}>+ Add Field</AddButton>

              <Divider />

              <ButtonPrimary
                disabled={!canRun || running}
                onClick={handleRun}
              >
                {running ? 'Running...' : 'Run Simulation'}
              </ButtonPrimary>
            </PanelBody>
          </Panel>

          {/* ── Saved Simulations ── */}
          <Panel>
            <PanelHeader>
              <PanelTitle>Saved Simulations</PanelTitle>
            </PanelHeader>
            {hasResults && (
              <div style={{ padding: `${space[3]} ${space[5]}`, borderBottom: border.light, display: 'flex', gap: space[2] }}>
                <Input
                  placeholder="Name for this simulation"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <ButtonGhost onClick={handleSave}>Save</ButtonGhost>
              </div>
            )}
            {loadingSaved ? (
              <Spinner>Loading...</Spinner>
            ) : savedSims.length === 0 ? (
              <EmptyState>No saved simulations yet</EmptyState>
            ) : (
              savedSims.map(sim => (
                <HistoryItem key={sim.id} onClick={() => handleLoadSim(sim)}>
                  <HistoryName>{sim.name}</HistoryName>
                  <HistoryMeta>
                    <span>{sim.productName}</span>
                    <span>{sim.stateCode}</span>
                    {sim.uwDecision && (
                      <StatusDot $color={DecisionConfig[sim.uwDecision]?.color || neutral[400]} />
                    )}
                    {sim.finalPremium != null && (
                      <span style={{ fontFamily: fontFamily.mono }}>${sim.finalPremium.toLocaleString()}</span>
                    )}
                    <RemoveButton
                      onClick={(e) => handleDeleteSim(sim.id, e)}
                      title="Delete"
                    >
                      ✕
                    </RemoveButton>
                  </HistoryMeta>
                </HistoryItem>
              ))
            )}
          </Panel>
        </div>

        {/* ── RIGHT: Results Panel ── */}
        <Panel>
          <PanelHeader>
            <PanelTitle>Simulation Results</PanelTitle>
            {totalTimeMs > 0 && (
              <span style={{ fontSize: T.captionSm.size, color: color.textMuted, fontFamily: fontFamily.mono }}>
                {totalTimeMs.toFixed(0)}ms
              </span>
            )}
          </PanelHeader>

          {!hasResults && !running && !error && (
            <EmptyState>
              Configure a product, state, and inputs, then click "Run Simulation" to see results.
            </EmptyState>
          )}

          {running && (
            <Spinner>Running simulation...</Spinner>
          )}

          {error && <div style={{ padding: space[5] }}><ErrorBox>{error}</ErrorBox></div>}

          {hasResults && !running && (
            <PanelBody>
              {/* Summary metrics */}
              <MetricRow>
                <MetricCard>
                  <MetricValue>
                    {uwResult?.decision ? (
                      <DecisionBadge $color={DecisionConfig[uwResult.decision]?.color || neutral[500]}>
                        {DecisionConfig[uwResult.decision]?.label || uwResult.decision}
                      </DecisionBadge>
                    ) : (
                      <span style={{ color: semantic.success }}>Accept</span>
                    )}
                  </MetricValue>
                  <MetricLabel>UW Decision</MetricLabel>
                </MetricCard>
                <MetricCard>
                  <MetricValue>
                    {premiumResult?.finalPremium != null
                      ? `$${premiumResult.finalPremium.toLocaleString()}`
                      : premiumResult?.success
                        ? Object.keys(premiumResult.outputs).length > 0
                          ? `${Object.keys(premiumResult.outputs).length} outputs`
                          : '—'
                        : 'Error'}
                  </MetricValue>
                  <MetricLabel>Premium</MetricLabel>
                </MetricCard>
                <MetricCard>
                  <MetricValue>{formsResult?.totalFormCount ?? 0}</MetricValue>
                  <MetricLabel>Applicable Forms</MetricLabel>
                </MetricCard>
              </MetricRow>

              {/* Tabs */}
              <ResultTabs>
                <Tab $active={activeTab === 'uw'} onClick={() => setActiveTab('uw')}>
                  UW Decision
                  {uwResult && uwResult.firedRuleCount > 0 && (
                    <span style={{ marginLeft: space[1], color: semantic.error }}>
                      ({uwResult.firedRuleCount})
                    </span>
                  )}
                </Tab>
                <Tab $active={activeTab === 'premium'} onClick={() => setActiveTab('premium')}>
                  Premium
                </Tab>
                <Tab $active={activeTab === 'forms'} onClick={() => setActiveTab('forms')}>
                  Forms ({formsResult?.totalFormCount ?? 0})
                </Tab>
              </ResultTabs>

              {/* ── UW Tab ── */}
              {activeTab === 'uw' && uwResult && (
                <div>
                  {uwResult.errors.length > 0 && (
                    <ErrorBox>{uwResult.errors.join('; ')}</ErrorBox>
                  )}
                  <SectionLabel>
                    {uwResult.firedRuleCount} of {uwResult.totalRuleCount} rules fired
                  </SectionLabel>
                  {uwResult.trace.length === 0 ? (
                    <EmptyState>No UW rules configured for this product version</EmptyState>
                  ) : (
                    uwResult.trace.map((rt, idx) => (
                      <RuleRow key={idx} $fired={rt.fired}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: space[0.5], flex: 1 }}>
                          <RuleName>{rt.ruleName}</RuleName>
                          {rt.fired && rt.outcome && (
                            <RuleMessage>{rt.outcome.message}</RuleMessage>
                          )}
                          {rt.skipReason && (
                            <RuleMessage style={{ fontStyle: 'italic' }}>Skipped: {rt.skipReason}</RuleMessage>
                          )}
                        </div>
                        {rt.fired && rt.outcome ? (
                          <DecisionBadge $color={DecisionConfig[rt.outcome.action as keyof typeof DecisionConfig]?.color || neutral[500]}>
                            {DecisionConfig[rt.outcome.action as keyof typeof DecisionConfig]?.label || rt.outcome.action}
                          </DecisionBadge>
                        ) : (
                          <span style={{ fontSize: T.captionSm.size, color: semantic.success, fontWeight: 600 }}>
                            Pass
                          </span>
                        )}
                      </RuleRow>
                    ))
                  )}
                </div>
              )}

              {/* ── Premium Tab ── */}
              {activeTab === 'premium' && premiumResult && (
                <div>
                  {premiumResult.errors.length > 0 && (
                    <ErrorBox>
                      {premiumResult.errors.map(e => e.message).join('; ')}
                    </ErrorBox>
                  )}
                  {premiumResult.warnings.length > 0 && (
                    <div style={{
                      padding: `${space[3]} ${space[4]}`,
                      background: semantic.warningLight,
                      border: `1px solid ${semantic.warning}30`,
                      borderRadius: radius.sm,
                      color: semantic.warningDark,
                      fontSize: T.bodySm.size,
                      marginBottom: space[4],
                    }}>
                      {premiumResult.warnings.join('; ')}
                    </div>
                  )}

                  {/* Outputs summary */}
                  {Object.keys(premiumResult.outputs).length > 0 && (
                    <>
                      <SectionLabel>Outputs</SectionLabel>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: space[2],
                        marginBottom: space[5],
                      }}>
                        {Object.entries(premiumResult.outputs).map(([key, val]) => (
                          <div key={key} style={{
                            padding: space[3],
                            background: neutral[50],
                            border: border.light,
                            borderRadius: radius.sm,
                          }}>
                            <FieldCodeLabel>{key}</FieldCodeLabel>
                            <div style={{
                              fontFamily: fontFamily.mono,
                              fontSize: T.headingSm.size,
                              fontWeight: 700,
                              color: accent[700],
                              marginTop: space[0.5],
                            }}>
                              {typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: 4 }) : String(val)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Step trace */}
                  <SectionLabel>Step Trace</SectionLabel>
                  {premiumResult.trace.length === 0 ? (
                    <EmptyState>No rating steps to display</EmptyState>
                  ) : (
                    premiumResult.trace.map((step, idx) => (
                      <StepRow key={idx} $applied={step.applied}>
                        <StepOrder>{step.order}</StepOrder>
                        <div>
                          <StepName>{step.stepName}</StepName>
                          {step.skipReason && (
                            <div style={{ fontSize: T.captionSm.size, color: color.textMuted, fontStyle: 'italic' }}>
                              {step.skipReason}
                            </div>
                          )}
                        </div>
                        <StepValue>
                          {step.outputValue != null ? step.outputValue.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—'}
                        </StepValue>
                      </StepRow>
                    ))
                  )}
                </div>
              )}

              {/* ── Forms Tab ── */}
              {activeTab === 'forms' && formsResult && (
                <div>
                  {formsResult.applicableForms.length === 0 ? (
                    <EmptyState>No applicable forms found for this state</EmptyState>
                  ) : (
                    <>
                      {Object.entries(formsResult.byUseType).map(([useType, forms]) => (
                        <div key={useType} style={{ marginBottom: space[5] }}>
                          <SectionLabel>{useType} ({forms.length})</SectionLabel>
                          {forms.map((form, idx) => (
                            <FormRow key={idx}>
                              <FormNumber>{form.formNumber}</FormNumber>
                              <FormTitle>{form.formTitle}</FormTitle>
                              <FormType>{form.type}</FormType>
                            </FormRow>
                          ))}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </PanelBody>
          )}
        </Panel>
      </Content>
    </Page>
  );
};

export default SimulatePage;
