/**
 * ProductAssemblyWizard  (Design System v2)
 *
 * Route: /wizard/product?changeSetId=...
 *
 * Five-step governed assembly wizard that creates a ProductVersion draft
 * inside an active Change Set.
 *
 *  1. Template / Scratch
 *  2. Coverages + endorsements + ordering
 *  3. Attach rates / rules / forms
 *  4. Target states
 *  5. Readiness review → finalize
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  DocumentPlusIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  GlobeAmericasIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  PlusIcon,
  TrashIcon,
  ArrowsUpDownIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';

import MainNavigation from '@/components/ui/Navigation';
import {
  color, neutral, accent, semantic,
  space, radius, shadow, fontFamily,
  type as t, border as borderTokens,
  duration, focusRingStyle, reducedMotion,
} from '@/ui/tokens';
import { PageShell, PageBody, Badge } from '@/ui/components';
import { useRoleContext } from '@/context/RoleContext';
import { getChangeSet } from '@/services/changeSetService';
import {
  createManifest,
  getManifest,
  updateManifest,
  validateStep,
  computeReadiness,
  finalizeWizard,
} from '@/services/productWizardService';
import type {
  WizardManifest,
  WizardStepId,
  WizardCoverageItem,
  WizardRateAttachment,
  WizardRuleAttachment,
  WizardFormAttachment,
  WizardSource,
  ReadinessResult,
  ReadinessLevel,
  StepValidation,
  WIZARD_STEPS,
} from '@/types/productWizard';
import { ALL_US_STATES, STATE_NAMES } from '@/types/coverageConfig';
import { listTemplates, applyTemplate } from '@/services/coverageTemplateService';
import { listEndorsements } from '@/services/endorsementService';
import type { CoverageTemplate, OrgEndorsement, TemplateApplicationResult } from '@/types/coverageTemplate';

// ════════════════════════════════════════════════════════════════════════
// Animations
// ════════════════════════════════════════════════════════════════════════

const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}`;

// ════════════════════════════════════════════════════════════════════════
// Layout
// ════════════════════════════════════════════════════════════════════════

const Container = styled.div`max-width: 960px; margin: 0 auto;`;

const Header = styled.div`
  display: flex; align-items: center; gap: ${space[3]};
  margin-bottom: ${space[6]};
`;

const BackBtn = styled.button`
  width: 36px; height: 36px; display: grid; place-items: center;
  border: ${borderTokens.default}; border-radius: ${radius.lg};
  background: ${color.bg}; color: ${neutral[500]}; cursor: pointer;
  transition: all ${duration.fast} ease;
  &:hover { background: ${neutral[50]}; color: ${accent[600]}; }
  &:focus-visible { ${focusRingStyle} }
  svg { width: 16px; height: 16px; }
`;

const Title = styled.h1`
  margin: 0; font-family: ${fontFamily.sans};
  font-size: 22px; font-weight: 700; color: ${color.text};
`;

const CSBadge = styled.span`
  margin-left: auto;
  font-size: ${t.captionSm.size}; color: ${accent[600]};
  background: ${accent[50]}; padding: ${space[1]} ${space[2.5]};
  border-radius: ${radius.full}; border: 1px solid ${accent[200]};
  font-weight: 500;
`;

// ── Stepper ──

const Stepper = styled.div`
  display: flex; gap: ${space[1]}; margin-bottom: ${space[6]};
  background: ${neutral[50]}; padding: ${space[2]};
  border-radius: ${radius.xl}; border: ${borderTokens.default};
`;

const StepBtn = styled.button<{ $active?: boolean; $done?: boolean; $disabled?: boolean }>`
  flex: 1; display: flex; align-items: center; gap: ${space[2]};
  padding: ${space[2]} ${space[3]}; border-radius: ${radius.lg};
  border: none; cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  font-family: ${fontFamily.sans}; font-size: ${t.captionSm.size}; font-weight: 500;
  background: ${({ $active, $done }) => $active ? 'white' : $done ? accent[50] : 'transparent'};
  color: ${({ $active, $done, $disabled }) =>
    $active ? accent[700] : $done ? accent[600] : $disabled ? neutral[300] : neutral[500]};
  box-shadow: ${({ $active }) => $active ? shadow.sm : 'none'};
  transition: all ${duration.fast} ease;
  opacity: ${({ $disabled }) => $disabled ? 0.5 : 1};

  &:hover:not(:disabled) {
    background: ${({ $active }) => $active ? 'white' : neutral[100]};
  }
  &:focus-visible { ${focusRingStyle} }
`;

const StepNum = styled.span<{ $done?: boolean }>`
  width: 22px; height: 22px; border-radius: 50%;
  display: grid; place-items: center; font-size: 11px; font-weight: 600;
  background: ${({ $done }) => $done ? accent[500] : neutral[200]};
  color: ${({ $done }) => $done ? 'white' : neutral[600]};

  svg { width: 12px; height: 12px; }
`;

// ── Card ──

const Card = styled.div`
  background: ${color.bg}; border: ${borderTokens.default};
  border-radius: ${radius.xl}; padding: ${space[6]};
  animation: ${fadeIn} ${duration.normal} ease;
  @media ${reducedMotion} { animation: none; }
  margin-bottom: ${space[4]};
`;

const CardTitle = styled.h2`
  margin: 0 0 ${space[1]} 0; font-family: ${fontFamily.sans};
  font-size: ${t.bodySm.size}; font-weight: 600; color: ${color.text};
  display: flex; align-items: center; gap: ${space[2]};
  svg { width: 18px; height: 18px; color: ${accent[500]}; }
`;

const CardDesc = styled.p`
  margin: 0 0 ${space[4]} 0; font-size: ${t.captionSm.size}; color: ${color.textMuted};
`;

// ── Form elements ──

const Label = styled.label`
  display: block; font-size: ${t.captionSm.size}; font-weight: 500;
  color: ${neutral[600]}; margin-bottom: ${space[1]};
`;

const Input = styled.input`
  width: 100%; font-family: ${fontFamily.sans}; font-size: ${t.bodySm.size};
  padding: ${space[2]} ${space[3]}; border: ${borderTokens.default};
  border-radius: ${radius.md}; background: ${color.bg}; color: ${color.text};
  &:focus { ${focusRingStyle} outline: none; }
  &::placeholder { color: ${neutral[400]}; }
`;

const TextArea = styled.textarea`
  width: 100%; font-family: ${fontFamily.sans}; font-size: ${t.bodySm.size};
  padding: ${space[2]} ${space[3]}; border: ${borderTokens.default};
  border-radius: ${radius.md}; background: ${color.bg}; color: ${color.text};
  min-height: 80px; resize: vertical;
  &:focus { ${focusRingStyle} outline: none; }
`;

const FieldRow = styled.div`margin-bottom: ${space[3]};`;

// ── Choice cards ──

const ChoiceGrid = styled.div`display: grid; grid-template-columns: repeat(3, 1fr); gap: ${space[3]};`;

const ChoiceCard = styled.button<{ $selected?: boolean }>`
  display: flex; flex-direction: column; align-items: center; gap: ${space[2]};
  padding: ${space[5]} ${space[3]}; border-radius: ${radius.xl};
  border: 2px solid ${({ $selected }) => $selected ? accent[400] : neutral[200]};
  background: ${({ $selected }) => $selected ? accent[50] : color.bg};
  cursor: pointer; transition: all ${duration.fast} ease;
  &:hover { border-color: ${accent[300]}; transform: translateY(-1px); }
  &:focus-visible { ${focusRingStyle} }
  svg { width: 28px; height: 28px; color: ${({ $selected }) => $selected ? accent[600] : neutral[400]}; }
`;

const ChoiceLabel = styled.span`
  font-family: ${fontFamily.sans}; font-size: ${t.bodySm.size};
  font-weight: 600; color: ${color.text};
`;

const ChoiceDesc = styled.span`
  font-size: ${t.captionSm.size}; color: ${color.textMuted}; text-align: center;
`;

// ── List items ──

const ListItem = styled.div<{ $selected?: boolean }>`
  display: flex; align-items: center; gap: ${space[2]};
  padding: ${space[2]} ${space[3]}; border-radius: ${radius.md};
  border: 1px solid ${({ $selected }) => $selected ? accent[300] : neutral[200]};
  background: ${({ $selected }) => $selected ? accent[50] : color.bg};
  cursor: pointer; transition: all ${duration.fast} ease;
  margin-bottom: ${space[1.5]};
  &:hover { border-color: ${accent[300]}; }
`;

const ListItemName = styled.span`
  font-size: ${t.captionSm.size}; font-weight: 500; color: ${color.text}; flex: 1;
`;

const ListItemMeta = styled.span`font-size: 11px; color: ${neutral[400]};`;

const RemoveBtn = styled.button`
  width: 24px; height: 24px; display: grid; place-items: center;
  border: none; border-radius: ${radius.md}; background: transparent;
  color: ${neutral[400]}; cursor: pointer;
  &:hover { color: ${semantic.error}; background: ${neutral[50]}; }
  svg { width: 14px; height: 14px; }
`;

// ── Search ──

const SearchWrap = styled.div`
  position: relative; margin-bottom: ${space[3]};
  svg {
    position: absolute; left: ${space[2.5]}; top: 50%;
    transform: translateY(-50%); width: 14px; height: 14px; color: ${neutral[400]};
  }
`;

const SearchInput = styled.input`
  width: 100%; font-family: ${fontFamily.sans}; font-size: ${t.captionSm.size};
  padding: ${space[2]} ${space[2]} ${space[2]} ${space[8]};
  border: ${borderTokens.default}; border-radius: ${radius.md};
  background: ${color.bg}; color: ${color.text};
  &:focus { ${focusRingStyle} outline: none; }
  &::placeholder { color: ${neutral[400]}; }
`;

// ── State grid ──

const StateGrid = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: ${space[1.5]};`;

const StateChip = styled.button<{ $selected?: boolean }>`
  display: flex; align-items: center; gap: ${space[1]};
  padding: ${space[1.5]} ${space[2]}; border-radius: ${radius.md};
  border: 1px solid ${({ $selected }) => $selected ? accent[400] : neutral[200]};
  background: ${({ $selected }) => $selected ? accent[50] : color.bg};
  font-family: ${fontFamily.sans}; font-size: ${t.captionSm.size}; font-weight: 500;
  color: ${({ $selected }) => $selected ? accent[700] : neutral[600]};
  cursor: pointer; transition: all ${duration.fast} ease;
  &:hover { border-color: ${accent[300]}; }
  &:focus-visible { ${focusRingStyle} }
`;

// ── Review ──

const CheckRow = styled.div<{ $level: ReadinessLevel }>`
  display: flex; align-items: center; gap: ${space[2]};
  padding: ${space[2]} ${space[3]}; border-radius: ${radius.md};
  border: 1px solid ${({ $level }) =>
    $level === 'pass' ? '#d1fae5' : $level === 'warning' ? '#fef3c7' : '#fee2e2'};
  background: ${({ $level }) =>
    $level === 'pass' ? '#ecfdf5' : $level === 'warning' ? '#fffbeb' : '#fef2f2'};
  margin-bottom: ${space[1.5]};
`;

const CheckIcon_ = styled.span<{ $level: ReadinessLevel }>`
  width: 20px; height: 20px; display: grid; place-items: center;
  color: ${({ $level }) =>
    $level === 'pass' ? semantic.success : $level === 'warning' ? '#f59e0b' : semantic.error};
  svg { width: 16px; height: 16px; }
`;

const CheckLabel = styled.span`font-size: ${t.captionSm.size}; font-weight: 500; color: ${color.text};`;
const CheckDesc = styled.span`font-size: 11px; color: ${color.textMuted}; margin-left: auto;`;

// ── Footer ──

const Footer = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: ${space[4]}; background: ${neutral[50]};
  border: ${borderTokens.default}; border-radius: ${radius.xl};
`;

const NavBtn = styled.button<{ $primary?: boolean }>`
  display: flex; align-items: center; gap: ${space[1.5]};
  padding: ${space[2]} ${space[4]}; border-radius: ${radius.md};
  border: 1px solid ${({ $primary }) => $primary ? accent[500] : neutral[200]};
  background: ${({ $primary }) => $primary ? accent[500] : 'white'};
  color: ${({ $primary }) => $primary ? 'white' : color.text};
  font-family: ${fontFamily.sans}; font-size: ${t.captionSm.size}; font-weight: 600;
  cursor: pointer; transition: all ${duration.fast} ease;
  &:hover { background: ${({ $primary }) => $primary ? accent[600] : neutral[50]}; }
  &:focus-visible { ${focusRingStyle} }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  svg { width: 14px; height: 14px; }
`;

const ValidationMsg = styled.span<{ $error?: boolean }>`
  font-size: ${t.captionSm.size}; color: ${({ $error }) => $error ? semantic.error : neutral[500]};
  display: flex; align-items: center; gap: ${space[1]};
  svg { width: 14px; height: 14px; }
`;

// ── Inline add ──

const AddRow = styled.div`
  display: flex; gap: ${space[2]}; align-items: center; margin-top: ${space[2]};
`;

const AddBtn = styled.button`
  display: flex; align-items: center; gap: ${space[1]};
  padding: ${space[1.5]} ${space[3]}; border-radius: ${radius.md};
  border: 1px dashed ${neutral[300]}; background: transparent;
  font-family: ${fontFamily.sans}; font-size: ${t.captionSm.size};
  color: ${accent[600]}; cursor: pointer;
  &:hover { border-color: ${accent[400]}; background: ${accent[50]}; }
  &:focus-visible { ${focusRingStyle} }
  svg { width: 14px; height: 14px; }
`;

// ════════════════════════════════════════════════════════════════════════
// Steps config
// ════════════════════════════════════════════════════════════════════════

const STEPS: { id: WizardStepId; label: string; icon: React.ReactNode }[] = [
  { id: 'template',    label: 'Template',      icon: <SparklesIcon /> },
  { id: 'coverages',   label: 'Coverages',     icon: <ShieldCheckIcon /> },
  { id: 'attachments', label: 'Attachments',    icon: <DocumentTextIcon /> },
  { id: 'states',      label: 'States',         icon: <GlobeAmericasIcon /> },
  { id: 'review',      label: 'Review',         icon: <ClipboardDocumentListIcon /> },
];

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

const ProductAssemblyWizard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentOrgId } = useRoleContext();

  const changeSetIdParam = searchParams.get('changeSetId') || '';

  // Core state
  const [manifest, setManifest] = useState<WizardManifest | null>(null);
  const [currentStep, setCurrentStep] = useState<WizardStepId>('template');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepValidation, setStepValidation] = useState<StepValidation | null>(null);

  // Step 1 local state
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [source, setSource] = useState<WizardSource>('scratch');

  // Step 2 local state
  const [coverages, setCoverages] = useState<WizardCoverageItem[]>([]);
  const [newCovName, setNewCovName] = useState('');

  // Step 3 local state
  const [ratePrograms, setRatePrograms] = useState<WizardRateAttachment[]>([]);
  const [rules, setRules] = useState<WizardRuleAttachment[]>([]);
  const [forms, setForms] = useState<WizardFormAttachment[]>([]);
  const [newRateName, setNewRateName] = useState('');
  const [newRuleName, setNewRuleName] = useState('');
  const [newFormName, setNewFormName] = useState('');

  // Step 4 local state
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [stateSearch, setStateSearch] = useState('');

  // Step 5 local state
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);

  // Template + endorsement library state
  const [availableTemplates, setAvailableTemplates] = useState<CoverageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [availableEndorsements, setAvailableEndorsements] = useState<OrgEndorsement[]>([]);
  const [enabledEndorsementIds, setEnabledEndorsementIds] = useState<Set<string>>(new Set());

  // Step index helper
  const stepIndex = STEPS.findIndex(s => s.id === currentStep);

  // ── Initialize manifest ──

  useEffect(() => {
    if (!currentOrgId || !changeSetIdParam) { setLoading(false); return; }

    (async () => {
      try {
        const cs = await getChangeSet(currentOrgId, changeSetIdParam);
        if (!cs) { setError('Change Set not found'); setLoading(false); return; }

        const m = await createManifest(
          currentOrgId,
          cs.id,
          cs.name,
          cs.targetEffectiveStart || null,
          cs.targetEffectiveEnd || null,
        );
        setManifest(m);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentOrgId, changeSetIdParam]);

  // ── Load templates + endorsements from library ──

  useEffect(() => {
    if (!currentOrgId) return;
    listTemplates(currentOrgId, { activeOnly: true }).then(setAvailableTemplates).catch(console.error);
    listEndorsements(currentOrgId, { activeOnly: true }).then(setAvailableEndorsements).catch(console.error);
  }, [currentOrgId]);

  // ── Apply template handler ──

  const handleApplyTemplate = useCallback(async (templateId: string) => {
    if (!currentOrgId) return;
    try {
      const result = await applyTemplate(currentOrgId, templateId);
      setSelectedTemplateId(templateId);
      setSource('template');

      // Hydrate coverages from template
      const templateCovs: WizardCoverageItem[] = result.coverages.map((c, i) => ({
        coverageId: `tpl-cov-${Date.now()}-${i}`,
        name: c.name,
        coverageKind: c.coverageKind,
        isOptional: c.isOptional,
        displayOrder: c.displayOrder,
        fromTemplate: true,
      }));

      // Add enabled endorsements as endorsement-kind coverages
      const endorsementCovs: WizardCoverageItem[] = result.endorsements
        .filter(e => e.enabled)
        .map((e, i) => ({
          coverageId: `tpl-end-${e.endorsementId}`,
          name: e.title,
          coverageKind: 'endorsement' as const,
          isOptional: true,
          displayOrder: templateCovs.length + i,
          fromTemplate: true,
        }));

      setCoverages([...templateCovs, ...endorsementCovs]);

      // Hydrate forms from template
      if (result.forms.length > 0) {
        setForms(result.forms.map(f => ({
          formId: f.formId,
          formTitle: f.formTitle,
          formNumber: f.formNumber,
        })));
      }

      // Track enabled endorsements
      setEnabledEndorsementIds(new Set(result.endorsements.filter(e => e.enabled).map(e => e.endorsementId)));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [currentOrgId]);

  // ── Toggle endorsement ──

  const toggleEndorsement = useCallback((end: OrgEndorsement) => {
    const isEnabled = enabledEndorsementIds.has(end.id);
    if (isEnabled) {
      setEnabledEndorsementIds(prev => { const s = new Set(prev); s.delete(end.id); return s; });
      setCoverages(prev => prev.filter(c => c.coverageId !== `tpl-end-${end.id}`).map((c, i) => ({ ...c, displayOrder: i })));
    } else {
      setEnabledEndorsementIds(prev => new Set(prev).add(end.id));
      setCoverages(prev => [...prev, {
        coverageId: `tpl-end-${end.id}`,
        name: end.title,
        coverageKind: 'endorsement',
        isOptional: true,
        displayOrder: prev.length,
        fromTemplate: false,
      }]);
    }
  }, [enabledEndorsementIds]);

  // ── Build a manifest snapshot from local state ──

  const buildSnapshot = useCallback((): WizardManifest | null => {
    if (!manifest) return null;
    return {
      ...manifest,
      productName,
      productDescription: productDesc,
      productCategory,
      templateChoice: { source },
      currentStep,
      coverages,
      ratePrograms,
      rules,
      forms,
      selectedStates,
    };
  }, [manifest, productName, productDesc, productCategory, source, currentStep, coverages, ratePrograms, rules, forms, selectedStates]);

  // ── Persist on step change ──

  const persistManifest = useCallback(async () => {
    if (!currentOrgId || !manifest) return;
    setSaving(true);
    try {
      const snap = buildSnapshot();
      if (!snap) return;
      await updateManifest(currentOrgId, manifest.id, {
        productName: snap.productName,
        productDescription: snap.productDescription,
        productCategory: snap.productCategory,
        templateChoice: snap.templateChoice,
        currentStep: snap.currentStep,
        coverages: snap.coverages,
        ratePrograms: snap.ratePrograms,
        rules: snap.rules,
        forms: snap.forms,
        selectedStates: snap.selectedStates,
      });
    } catch {
      // silent persist failure
    } finally {
      setSaving(false);
    }
  }, [currentOrgId, manifest, buildSnapshot]);

  // ── Validate current step ──

  const runValidation = useCallback((): StepValidation => {
    const snap = buildSnapshot();
    if (!snap) return { valid: false, errors: ['Manifest not loaded'], warnings: [] };
    return validateStep(snap, currentStep);
  }, [buildSnapshot, currentStep]);

  // ── Navigation ──

  const canGoNext = useMemo(() => {
    const v = runValidation();
    return v.valid;
  }, [runValidation]);

  const goNext = useCallback(async () => {
    const v = runValidation();
    setStepValidation(v);
    if (!v.valid) return;

    await persistManifest();
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1].id);
      setStepValidation(null);
    }
  }, [runValidation, persistManifest, stepIndex]);

  const goBack = useCallback(async () => {
    await persistManifest();
    if (stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1].id);
      setStepValidation(null);
    }
  }, [persistManifest, stepIndex]);

  const goToStep = useCallback(async (step: WizardStepId) => {
    const idx = STEPS.findIndex(s => s.id === step);
    if (idx <= stepIndex) {
      await persistManifest();
      setCurrentStep(step);
      setStepValidation(null);
    }
  }, [persistManifest, stepIndex]);

  // ── Compute readiness when entering review step ──

  useEffect(() => {
    if (currentStep === 'review') {
      const snap = buildSnapshot();
      if (snap) setReadiness(computeReadiness(snap));
    }
  }, [currentStep, buildSnapshot]);

  // ── Finalize ──

  const handleFinalize = useCallback(async () => {
    if (!currentOrgId || !manifest) return;
    setFinalizing(true);
    setError(null);
    try {
      // Final persist before finalize
      await persistManifest();
      const { productId, versionId } = await finalizeWizard(currentOrgId, manifest.id);
      navigate(`/products/${productId}/overview?version=${versionId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setFinalizing(false);
    }
  }, [currentOrgId, manifest, persistManifest, navigate]);

  // ── Coverage helpers ──

  const addCoverage = useCallback((kind: WizardCoverageItem['coverageKind'] = 'coverage') => {
    if (!newCovName.trim()) return;
    const id = `cov-${Date.now()}`;
    setCoverages(prev => [...prev, {
      coverageId: id,
      name: newCovName.trim(),
      coverageKind: kind,
      isOptional: kind !== 'coverage',
      displayOrder: prev.length,
      fromTemplate: false,
    }]);
    setNewCovName('');
  }, [newCovName]);

  const removeCoverage = useCallback((id: string) => {
    setCoverages(prev => prev.filter(c => c.coverageId !== id).map((c, i) => ({ ...c, displayOrder: i })));
  }, []);

  const moveCoverage = useCallback((id: string, dir: -1 | 1) => {
    setCoverages(prev => {
      const idx = prev.findIndex(c => c.coverageId === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr.map((c, i) => ({ ...c, displayOrder: i }));
    });
  }, []);

  // ── Attachment helpers ──

  const addRate = useCallback(() => {
    if (!newRateName.trim()) return;
    setRatePrograms(prev => [...prev, { rateProgramId: `rp-${Date.now()}`, rateProgramName: newRateName.trim(), versionId: '', versionNumber: 1 }]);
    setNewRateName('');
  }, [newRateName]);

  const addRule = useCallback(() => {
    if (!newRuleName.trim()) return;
    setRules(prev => [...prev, { ruleId: `rule-${Date.now()}`, ruleName: newRuleName.trim(), ruleType: 'Eligibility' }]);
    setNewRuleName('');
  }, [newRuleName]);

  const addForm = useCallback(() => {
    if (!newFormName.trim()) return;
    setForms(prev => [...prev, { formId: `form-${Date.now()}`, formTitle: newFormName.trim(), formNumber: '' }]);
    setNewFormName('');
  }, [newFormName]);

  // ── State helpers ──

  const toggleState = useCallback((code: string) => {
    setSelectedStates(prev =>
      prev.includes(code) ? prev.filter(s => s !== code) : [...prev, code]
    );
  }, []);

  const selectAllStates = useCallback(() => setSelectedStates([...ALL_US_STATES]), []);
  const clearAllStates = useCallback(() => setSelectedStates([]), []);

  const filteredStates = useMemo(() => {
    if (!stateSearch.trim()) return ALL_US_STATES;
    const q = stateSearch.toLowerCase();
    return ALL_US_STATES.filter(s =>
      s.toLowerCase().includes(q) || (STATE_NAMES[s] || '').toLowerCase().includes(q)
    );
  }, [stateSearch]);

  // ════════════════════════════════════════════════════════════════════
  // Render steps
  // ════════════════════════════════════════════════════════════════════

  const renderStep1 = () => (
    <Card>
      <CardTitle><SparklesIcon /> Starting Point</CardTitle>
      <CardDesc>Choose how to start building your product.</CardDesc>

      <ChoiceGrid>
        <ChoiceCard $selected={source === 'scratch'} onClick={() => setSource('scratch')}>
          <DocumentPlusIcon />
          <ChoiceLabel>From Scratch</ChoiceLabel>
          <ChoiceDesc>Start with an empty product</ChoiceDesc>
        </ChoiceCard>
        <ChoiceCard $selected={source === 'template'} onClick={() => setSource('template')}>
          <SparklesIcon />
          <ChoiceLabel>Template</ChoiceLabel>
          <ChoiceDesc>Start from a pre-built template</ChoiceDesc>
        </ChoiceCard>
        <ChoiceCard $selected={source === 'clone'} onClick={() => setSource('clone')}>
          <DocumentDuplicateIcon />
          <ChoiceLabel>Clone Existing</ChoiceLabel>
          <ChoiceDesc>Copy from an existing product</ChoiceDesc>
        </ChoiceCard>
      </ChoiceGrid>

      {/* ── Template picker (when source === 'template') ── */}
      {source === 'template' && availableTemplates.length > 0 && (
        <div style={{ marginTop: space[4], marginBottom: space[4] }}>
          <Label>Select a Coverage Template</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: space[2] }}>
            {availableTemplates.map(tpl => (
              <ListItem
                key={tpl.id}
                $selected={selectedTemplateId === tpl.id}
                onClick={() => handleApplyTemplate(tpl.id)}
              >
                <Badge $variant="accent" $size="sm">{tpl.category.replace(/_/g, ' ')}</Badge>
                <ListItemName>{tpl.name}</ListItemName>
                <ListItemMeta>{tpl.bundledEndorsementIds.length} end.</ListItemMeta>
              </ListItem>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: space[6] }}>
        <FieldRow>
          <Label>Product Name *</Label>
          <Input
            value={productName} onChange={e => setProductName(e.target.value)}
            placeholder="e.g. Commercial General Liability"
          />
        </FieldRow>
        <FieldRow>
          <Label>Description</Label>
          <TextArea
            value={productDesc} onChange={e => setProductDesc(e.target.value)}
            placeholder="Brief product description…"
          />
        </FieldRow>
        <FieldRow>
          <Label>Category</Label>
          <Input
            value={productCategory} onChange={e => setProductCategory(e.target.value)}
            placeholder="e.g. Commercial Property, BOP, Auto"
          />
        </FieldRow>
      </div>
    </Card>
  );

  const renderStep2 = () => (
    <>
    <Card>
      <CardTitle><ShieldCheckIcon /> Coverages &amp; Endorsements</CardTitle>
      <CardDesc>Add coverages and endorsements, then drag to reorder.</CardDesc>

      {coverages.map((cov, idx) => (
        <ListItem key={cov.coverageId} $selected>
          <Badge $variant={cov.coverageKind === 'endorsement' ? 'warning' : cov.coverageKind === 'exclusion' ? 'error' : 'success'} $size="sm">
            {cov.coverageKind}
          </Badge>
          <ListItemName>{cov.name}</ListItemName>
          <ListItemMeta>#{idx + 1}</ListItemMeta>
          <RemoveBtn onClick={() => moveCoverage(cov.coverageId, -1)} title="Move up" aria-label="Move up">
            <ArrowsUpDownIcon style={{ transform: 'rotate(180deg)' }} />
          </RemoveBtn>
          <RemoveBtn onClick={() => moveCoverage(cov.coverageId, 1)} title="Move down" aria-label="Move down">
            <ArrowsUpDownIcon />
          </RemoveBtn>
          <RemoveBtn onClick={() => removeCoverage(cov.coverageId)} title="Remove" aria-label="Remove coverage">
            <TrashIcon />
          </RemoveBtn>
        </ListItem>
      ))}

      <AddRow>
        <Input
          value={newCovName} onChange={e => setNewCovName(e.target.value)}
          placeholder="Coverage name…"
          onKeyDown={e => e.key === 'Enter' && addCoverage('coverage')}
          style={{ flex: 1 }}
        />
        <AddBtn onClick={() => addCoverage('coverage')}><PlusIcon /> Coverage</AddBtn>
        <AddBtn onClick={() => addCoverage('endorsement')}><PlusIcon /> Endorsement</AddBtn>
      </AddRow>
    </Card>

    {/* ── Endorsement Library Toggles ── */}
    {availableEndorsements.length > 0 && (
      <Card>
        <CardTitle><AdjustmentsHorizontalIcon /> Endorsement Library</CardTitle>
        <CardDesc>Toggle endorsements from the org library to include in this product.</CardDesc>

        {availableEndorsements.map(end => {
          const isOn = enabledEndorsementIds.has(end.id);
          return (
            <ListItem key={end.id} $selected={isOn} onClick={() => toggleEndorsement(end)}>
              <Badge $variant={
                end.endorsementType === 'broadening' ? 'success' :
                end.endorsementType === 'restrictive' ? 'warning' : 'info'
              } $size="sm">
                {end.endorsementType}
              </Badge>
              <ListItemName>{end.title}</ListItemName>
              <ListItemMeta>{end.endorsementCode}</ListItemMeta>
              <span style={{
                width: 32, height: 18, borderRadius: '9px', display: 'inline-block',
                background: isOn ? accent[500] : neutral[200],
                position: 'relative', transition: `background ${duration.fast} ease`, cursor: 'pointer',
              }}>
                <span style={{
                  width: 14, height: 14, borderRadius: '50%', background: 'white',
                  position: 'absolute', top: 2,
                  left: isOn ? 16 : 2, transition: `left ${duration.fast} ease`,
                  boxShadow: shadow.xs,
                }} />
              </span>
            </ListItem>
          );
        })}
      </Card>
    )}
    </>
  );

  const renderStep3 = () => (
    <>
      <Card>
        <CardTitle><CurrencyDollarIcon /> Rate Programs</CardTitle>
        <CardDesc>Attach rating programs to this product.</CardDesc>
        {ratePrograms.map(rp => (
          <ListItem key={rp.rateProgramId} $selected>
            <ListItemName>{rp.rateProgramName}</ListItemName>
            <RemoveBtn onClick={() => setRatePrograms(prev => prev.filter(r => r.rateProgramId !== rp.rateProgramId))} aria-label="Remove rate program">
              <TrashIcon />
            </RemoveBtn>
          </ListItem>
        ))}
        <AddRow>
          <Input value={newRateName} onChange={e => setNewRateName(e.target.value)} placeholder="Rate program name…"
            onKeyDown={e => e.key === 'Enter' && addRate()} style={{ flex: 1 }} />
          <AddBtn onClick={addRate}><PlusIcon /> Add</AddBtn>
        </AddRow>
      </Card>

      <Card>
        <CardTitle><Cog6ToothIcon /> Underwriting Rules</CardTitle>
        <CardDesc>Attach rules governing eligibility, pricing, and compliance.</CardDesc>
        {rules.map(r => (
          <ListItem key={r.ruleId} $selected>
            <ListItemName>{r.ruleName}</ListItemName>
            <ListItemMeta>{r.ruleType}</ListItemMeta>
            <RemoveBtn onClick={() => setRules(prev => prev.filter(x => x.ruleId !== r.ruleId))} aria-label="Remove rule">
              <TrashIcon />
            </RemoveBtn>
          </ListItem>
        ))}
        <AddRow>
          <Input value={newRuleName} onChange={e => setNewRuleName(e.target.value)} placeholder="Rule name…"
            onKeyDown={e => e.key === 'Enter' && addRule()} style={{ flex: 1 }} />
          <AddBtn onClick={addRule}><PlusIcon /> Add</AddBtn>
        </AddRow>
      </Card>

      <Card>
        <CardTitle><DocumentTextIcon /> Policy Forms</CardTitle>
        <CardDesc>Attach forms, endorsements, and notices.</CardDesc>
        {forms.map(f => (
          <ListItem key={f.formId} $selected>
            <ListItemName>{f.formTitle}</ListItemName>
            <ListItemMeta>{f.formNumber}</ListItemMeta>
            <RemoveBtn onClick={() => setForms(prev => prev.filter(x => x.formId !== f.formId))} aria-label="Remove form">
              <TrashIcon />
            </RemoveBtn>
          </ListItem>
        ))}
        <AddRow>
          <Input value={newFormName} onChange={e => setNewFormName(e.target.value)} placeholder="Form title…"
            onKeyDown={e => e.key === 'Enter' && addForm()} style={{ flex: 1 }} />
          <AddBtn onClick={addForm}><PlusIcon /> Add</AddBtn>
        </AddRow>
      </Card>
    </>
  );

  const renderStep4 = () => (
    <Card>
      <CardTitle><GlobeAmericasIcon /> Target States</CardTitle>
      <CardDesc>Select states where this product will be offered. Draft StatePrograms will be created for each.</CardDesc>

      <div style={{ display: 'flex', gap: space[2], marginBottom: space[3] }}>
        <AddBtn onClick={selectAllStates}>Select All</AddBtn>
        <AddBtn onClick={clearAllStates}>Clear All</AddBtn>
        <span style={{ marginLeft: 'auto', fontSize: t.captionSm.size, color: neutral[500] }}>
          {selectedStates.length} of {ALL_US_STATES.length} selected
        </span>
      </div>

      <SearchWrap>
        <MagnifyingGlassIcon />
        <SearchInput value={stateSearch} onChange={e => setStateSearch(e.target.value)} placeholder="Search states…" />
      </SearchWrap>

      <StateGrid>
        {filteredStates.map(code => (
          <StateChip key={code} $selected={selectedStates.includes(code)} onClick={() => toggleState(code)}>
            {selectedStates.includes(code) && <CheckIcon style={{ width: 12, height: 12 }} />}
            {code} – {STATE_NAMES[code]?.split(' ').map(w => w[0]).join('') || code}
          </StateChip>
        ))}
      </StateGrid>
    </Card>
  );

  const renderStep5 = () => (
    <Card>
      <CardTitle><ClipboardDocumentListIcon /> Readiness Review</CardTitle>
      <CardDesc>All checks must pass (or be acknowledged warnings) before finalizing.</CardDesc>

      {readiness && (
        <>
          <div style={{ display: 'flex', gap: space[2], marginBottom: space[4] }}>
            <Badge $variant={readiness.overall === 'pass' ? 'success' : readiness.overall === 'warning' ? 'warning' : 'error'} $size="sm">
              {readiness.overall === 'pass' ? 'Ready' : readiness.overall === 'warning' ? 'Warnings' : 'Not Ready'}
            </Badge>
            <span style={{ fontSize: t.captionSm.size, color: neutral[500] }}>
              {readiness.passCount} pass · {readiness.warnCount} warn · {readiness.failCount} fail
            </span>
          </div>

          {readiness.checks.map(check => (
            <CheckRow key={check.id} $level={check.level}>
              <CheckIcon_  $level={check.level}>
                {check.level === 'pass' ? <CheckCircleIcon /> : check.level === 'warning' ? <ExclamationTriangleIcon /> : <ExclamationCircleIcon />}
              </CheckIcon_>
              <CheckLabel>{check.label}</CheckLabel>
              <CheckDesc>{check.description}</CheckDesc>
            </CheckRow>
          ))}
        </>
      )}
    </Card>
  );

  // ════════════════════════════════════════════════════════════════════
  // Main render
  // ════════════════════════════════════════════════════════════════════

  if (loading) return (
    <PageShell><MainNavigation /><PageBody><Container><p>Loading wizard…</p></Container></PageBody></PageShell>
  );

  if (!changeSetIdParam) return (
    <PageShell><MainNavigation /><PageBody><Container>
      <Card><CardTitle>No Change Set</CardTitle><CardDesc>This wizard must be launched from a Change Set. Navigate to Change Sets and select "Assemble Product".</CardDesc></Card>
    </Container></PageBody></PageShell>
  );

  return (
    <PageShell>
      <MainNavigation />
      <PageBody>
        <Container>
          <Header>
            <BackBtn onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeftIcon /></BackBtn>
            <Title>Product Assembly Wizard</Title>
            {manifest && <CSBadge>CS: {manifest.changeSetName}</CSBadge>}
          </Header>

          {/* ── Stepper ── */}
          <Stepper>
            {STEPS.map((step, idx) => {
              const done = idx < stepIndex;
              const active = step.id === currentStep;
              const disabled = idx > stepIndex;
              return (
                <StepBtn
                  key={step.id}
                  $active={active}
                  $done={done}
                  $disabled={disabled}
                  onClick={() => !disabled && goToStep(step.id)}
                  disabled={disabled}
                >
                  <StepNum $done={done}>
                    {done ? <CheckIcon /> : idx + 1}
                  </StepNum>
                  {step.label}
                </StepBtn>
              );
            })}
          </Stepper>

          {/* ── Step content ── */}
          {currentStep === 'template' && renderStep1()}
          {currentStep === 'coverages' && renderStep2()}
          {currentStep === 'attachments' && renderStep3()}
          {currentStep === 'states' && renderStep4()}
          {currentStep === 'review' && renderStep5()}

          {/* ── Error banner ── */}
          {error && (
            <div style={{ padding: space[3], background: '#fef2f2', borderRadius: radius.md, border: '1px solid #fee2e2', marginBottom: space[3], color: semantic.error, fontSize: t.captionSm.size }}>
              {error}
            </div>
          )}

          {/* ── Validation messages ── */}
          {stepValidation && !stepValidation.valid && (
            <div style={{ marginBottom: space[3] }}>
              {stepValidation.errors.map((e, i) => (
                <ValidationMsg key={i} $error><ExclamationCircleIcon /> {e}</ValidationMsg>
              ))}
            </div>
          )}

          {/* ── Footer ── */}
          <Footer>
            <NavBtn onClick={goBack} disabled={stepIndex === 0 || saving}>
              <ArrowLeftIcon /> Back
            </NavBtn>

            <span style={{ fontSize: 11, color: neutral[400] }}>
              {saving ? 'Saving…' : `Step ${stepIndex + 1} of ${STEPS.length}`}
            </span>

            {currentStep === 'review' ? (
              <NavBtn
                $primary
                onClick={handleFinalize}
                disabled={finalizing || (readiness?.overall === 'fail')}
              >
                {finalizing ? 'Creating…' : 'Finalize & Create Draft'}
                <CheckIcon />
              </NavBtn>
            ) : (
              <NavBtn $primary onClick={goNext} disabled={saving}>
                Next <ArrowRightIcon />
              </NavBtn>
            )}
          </Footer>
        </Container>
      </PageBody>
    </PageShell>
  );
};

export default ProductAssemblyWizard;
