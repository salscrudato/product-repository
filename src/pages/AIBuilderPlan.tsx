/**
 * AIBuilderPlan — Structured plan generation, preview, and apply
 *
 * Flow:
 *   1. User describes what to build → AI generates structured plan
 *   2. Preview: diff viewer, impact summary, "what will be created/modified"
 *   3. Apply: creates draft versions inside active Change Set
 *   4. Explainability: "Why?" drawer with rationales + data used
 *
 * GUARDRAIL: AI never writes directly to published artifacts.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, collectionGroup, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import styled, { keyframes, css } from 'styled-components';
import {
  SparklesIcon,
  ArrowUpIcon,
  CubeIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon,
  ArrowPathIcon,
  CheckIcon,
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  EyeIcon,
  LightBulbIcon,
  InformationCircleIcon,
  ClipboardDocumentListIcon,
  BoltIcon,
  ChartBarIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline';
import { CpuChipIcon } from '@heroicons/react/24/solid';
import { colors } from '../components/common/DesignSystem';
import MainNavigation from '../components/ui/Navigation';
import { useRole } from '../hooks/useRole';
import { useChangeSet } from '../context/ChangeSetContext';
import { generatePlan, previewPlan, applyPlan, rejectPlan } from '../services/aiPlanService';
import type {
  AIPlan,
  ProposedArtifact,
  PlanDiffEntry,
  PlanFieldDiff,
  PlanImpactSummary,
  PlanApplyResult,
  ConfidenceLevel,
} from '../types/aiPlan';
import {
  PLAN_ARTIFACT_TYPE_LABELS,
  CONFIDENCE_CONFIG,
  validateAIPlan,
} from '../types/aiPlan';

// ============================================================================
// Animations
// ============================================================================

const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}`;
const spin = keyframes`from{transform:rotate(0deg)}to{transform:rotate(360deg)}`;
const pulse = keyframes`0%,100%{opacity:1}50%{opacity:0.5}`;

// ============================================================================
// Layout
// ============================================================================

const Page = styled.div`min-height:100vh;background:linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%);display:flex;flex-direction:column;`;

const TopBar = styled.header`
  position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:14px 28px;
  background:rgba(255,255,255,0.88);backdrop-filter:blur(20px) saturate(180%);border-bottom:1px solid rgba(0,0,0,0.06);
`;

const BackBtn = styled.button`
  display:flex;align-items:center;gap:6px;padding:8px 14px;background:transparent;border:none;border-radius:10px;
  font-size:14px;font-weight:500;color:${colors.gray600};cursor:pointer;svg{width:18px;height:18px;}
  &:hover{background:rgba(0,0,0,0.04);color:${colors.gray800};}
`;

const PageTitle = styled.div`
  display:flex;flex-direction:column;align-items:center;gap:2px;
  h1{font-size:18px;font-weight:700;color:${colors.gray900};margin:0;letter-spacing:-0.02em;display:flex;align-items:center;gap:6px;svg{width:20px;height:20px;color:${colors.primary};}}
  span{font-size:12px;color:${colors.gray500};font-weight:500;}
`;

const HeaderActions = styled.div`display:flex;gap:10px;`;

const ActionBtn = styled.button<{$primary?:boolean}>`
  display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;svg{width:16px;height:16px;}
  ${({$primary})=>$primary?css`background:linear-gradient(135deg,${colors.primary} 0%,${colors.secondary} 100%);color:white;border:none;box-shadow:0 3px 10px rgba(99,102,241,0.25);&:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(99,102,241,0.35);}`:css`background:white;color:${colors.gray600};border:1.5px solid ${colors.gray200};&:hover{background:${colors.gray50};border-color:${colors.gray300};}`}
  &:disabled{opacity:0.45;cursor:not-allowed;transform:none!important;}
`;

const Main = styled.div`display:flex;flex:1;height:calc(100vh - 57px);overflow:hidden;`;

// ── Left: Prompt input ──
const PromptPanel = styled.div`
  width:360px;border-right:1px solid rgba(0,0,0,0.06);background:white;display:flex;flex-direction:column;
  @media(max-width:1100px){width:300px;}
`;

const PromptHeader = styled.div`padding:16px 20px;border-bottom:1px solid ${colors.gray100};`;
const SectionLabel = styled.div`font-size:11px;font-weight:700;color:${colors.gray400};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;`;

const PromptTextArea = styled.textarea`
  flex:1;padding:16px 20px;border:none;resize:none;font-size:14px;font-family:inherit;line-height:1.6;color:${colors.gray800};
  &:focus{outline:none;}&::placeholder{color:${colors.gray400};}
`;

const PromptActions = styled.div`padding:12px 20px;border-top:1px solid ${colors.gray100};display:flex;gap:8px;`;

// ── Center: Preview / Diffs ──
const PreviewPanel = styled.div`flex:1;overflow-y:auto;padding:24px;background:${colors.gray50};`;

const EmptyCenter = styled.div`
  display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;text-align:center;
  color:${colors.gray400};svg{width:48px;height:48px;opacity:0.25;}
`;

const PlanCard = styled.div`
  background:white;border-radius:14px;border:1px solid ${colors.gray200};overflow:hidden;margin-bottom:16px;animation:${fadeIn} 0.3s ease;
`;

const PlanCardHeader = styled.div`
  display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid ${colors.gray100};background:${colors.gray50};
`;

const PlanCardTitle = styled.h3`
  margin:0;font-size:14px;font-weight:600;color:${colors.gray900};display:flex;align-items:center;gap:8px;
  svg{width:16px;height:16px;color:${colors.primary};}
`;

const PlanCardBody = styled.div`padding:14px 18px;`;

// Impact summary
const ImpactGrid = styled.div`display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px;`;

const ImpactMetric = styled.div<{$color?:string}>`
  padding:12px 14px;border-radius:10px;background:${({$color})=>$color?`${$color}08`:colors.gray50};border:1px solid ${({$color})=>$color?`${$color}20`:colors.gray200};
  .value{font-size:22px;font-weight:700;color:${({$color})=>$color||colors.gray900};}.label{font-size:11px;color:${colors.gray500};margin-top:2px;}
`;

// Artifact row in diff
const ArtifactRow = styled.div<{$selected?:boolean}>`
  padding:12px 14px;border:1.5px solid ${({$selected})=>$selected?'rgba(99,102,241,0.3)':'transparent'};
  border-radius:10px;margin-bottom:8px;cursor:pointer;transition:all 0.15s;
  background:${({$selected})=>$selected?'rgba(99,102,241,0.04)':'transparent'};
  &:hover{background:rgba(99,102,241,0.04);}
`;

const ArtifactHeader = styled.div`display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;`;
const ArtifactName = styled.div`font-size:13px;font-weight:600;color:${colors.gray900};display:flex;align-items:center;gap:6px;`;

const ActionBadge = styled.span<{$action:string}>`
  padding:2px 8px;border-radius:5px;font-size:10px;font-weight:700;text-transform:uppercase;
  ${({$action})=>$action==='create'?css`background:#dcfce7;color:#16a34a;`:css`background:#dbeafe;color:#2563eb;`}
`;

const ConfBadge = styled.span<{$color:string}>`
  display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:600;
  background:${({$color})=>`${$color}12`};color:${({$color})=>$color};
`;

const TypeLabel = styled.span`font-size:11px;color:${colors.gray500};`;

const RationaleText = styled.div`font-size:12px;color:${colors.gray600};line-height:1.5;margin-top:6px;`;

// Diff table
const DiffTable = styled.div`margin-top:10px;border:1px solid ${colors.gray200};border-radius:8px;overflow:hidden;`;

const DiffRow = styled.div<{$type:string}>`
  display:grid;grid-template-columns:140px 1fr 1fr;font-size:12px;padding:6px 10px;
  border-bottom:1px solid ${colors.gray100};
  background:${({$type})=>$type==='added'?'rgba(16,185,129,0.04)':$type==='removed'?'rgba(239,68,68,0.04)':$type==='changed'?'rgba(59,130,246,0.04)':'transparent'};
  &:last-child{border-bottom:none;}
`;

const DiffLabel = styled.div`font-weight:600;color:${colors.gray600};`;
const DiffOld = styled.div`color:${colors.gray500};text-decoration:${({children})=>children?'line-through':'none'};`;
const DiffNew = styled.div`color:${colors.gray900};font-weight:500;`;

const DiffHeader = styled.div`
  display:grid;grid-template-columns:140px 1fr 1fr;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;
  padding:6px 10px;background:${colors.gray100};color:${colors.gray500};
`;

// Checkbox for selection
const ArtifactCheckbox = styled.input.attrs({type:'checkbox'})`accent-color:${colors.primary};cursor:pointer;`;

// ── Right: Explainability drawer ──
const DrawerOverlay = styled.div<{$open:boolean}>`
  position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:200;opacity:${({$open})=>$open?1:0};
  pointer-events:${({$open})=>$open?'auto':'none'};transition:opacity 0.2s;
`;

const Drawer = styled.aside<{$open:boolean}>`
  position:fixed;top:0;right:0;width:420px;height:100vh;background:white;z-index:201;
  box-shadow:-8px 0 32px rgba(0,0,0,0.1);transform:translateX(${({$open})=>$open?'0':'100%'});transition:transform 0.3s ease;
  display:flex;flex-direction:column;overflow:hidden;
`;

const DrawerHeader = styled.div`
  display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid ${colors.gray200};
  h3{margin:0;font-size:16px;font-weight:600;color:${colors.gray900};display:flex;align-items:center;gap:8px;svg{width:18px;height:18px;color:${colors.primary};}}
`;

const DrawerBody = styled.div`flex:1;overflow-y:auto;padding:16px 20px;`;

const DrawerSection = styled.div`margin-bottom:20px;`;
const DrawerSectionTitle = styled.h4`margin:0 0 8px;font-size:12px;font-weight:700;color:${colors.gray500};text-transform:uppercase;letter-spacing:0.05em;`;
const DrawerText = styled.p`margin:0 0 8px;font-size:13px;color:${colors.gray700};line-height:1.6;`;
const DrawerList = styled.ul`margin:0;padding-left:16px;li{font-size:12px;color:${colors.gray600};margin-bottom:4px;line-height:1.5;}`;

const CloseBtn = styled.button`background:transparent;border:none;cursor:pointer;padding:4px;border-radius:6px;color:${colors.gray500};&:hover{background:${colors.gray100};}svg{width:18px;height:18px;}`;

// Spinner
const Spinner = styled.div`border:3px solid rgba(99,102,241,0.15);border-top:3px solid #6366f1;border-radius:50%;width:20px;height:20px;animation:${spin} 0.8s linear infinite;`;

const WarningBox = styled.div`
  padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#92400e;margin-bottom:12px;
  display:flex;align-items:flex-start;gap:8px;svg{width:14px;height:14px;flex-shrink:0;margin-top:1px;}
`;

const SuccessBanner = styled.div`
  padding:12px 16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;font-size:13px;color:#065f46;
  display:flex;align-items:center;gap:8px;margin-bottom:16px;svg{width:16px;height:16px;}
`;

const ErrorBanner = styled.div`
  padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:12px;color:#dc2626;margin-bottom:12px;
  display:flex;align-items:flex-start;gap:8px;svg{width:14px;height:14px;flex-shrink:0;margin-top:1px;}
`;

// ============================================================================
// Types
// ============================================================================

type BuilderPhase = 'prompt' | 'generating' | 'preview' | 'applying' | 'applied';

interface ContextData {
  products: Array<{id:string;name:string;category?:string}>;
  coverages: Array<{id:string;name?:string;productId:string}>;
  forms: Array<{id:string;name?:string;formNumber?:string}>;
}

// ============================================================================
// Component
// ============================================================================

export default function AIBuilderPlan() {
  const navigate = useNavigate();
  const { currentOrg, user } = useRole();
  const { ensureActiveChangeSet } = useChangeSet();
  const orgId = currentOrg?.id || '';
  const userId = user?.uid || '';
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Phase
  const [phase, setPhase] = useState<BuilderPhase>('prompt');
  const [userPrompt, setUserPrompt] = useState('');

  // AI generation
  const [plan, setPlan] = useState<AIPlan | null>(null);
  const [requestId, setRequestId] = useState('');
  const [latencyMs, setLatencyMs] = useState(0);

  // Preview
  const [diffs, setDiffs] = useState<PlanDiffEntry[]>([]);
  const [impact, setImpact] = useState<PlanImpactSummary | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Apply
  const [applyResult, setApplyResult] = useState<PlanApplyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Explainability drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerArtifact, setDrawerArtifact] = useState<ProposedArtifact | null>(null);

  // Context
  const [contextData, setContextData] = useState<ContextData | null>(null);

  // ── Load context data ──
  useEffect(() => {
    (async () => {
      try {
        const productsSnap = await getDocs(collection(db, 'products'));
        const productList = productsSnap.docs.map(d => ({id:d.id,name:d.data().name,category:d.data().category,archived:d.data().archived})).filter(p=>!p.archived);
        const coveragesSnap = await getDocs(collectionGroup(db, 'coverages'));
        const pIds = new Set(productList.map(p=>p.id));
        const coverageList = coveragesSnap.docs.map(d=>({id:d.id,name:d.data().name,productId:d.ref.parent.parent?.id||''})).filter(c=>pIds.has(c.productId));
        const formsSnap = await getDocs(collection(db, 'forms'));
        const formList = formsSnap.docs.map(d=>({id:d.id,name:d.data().name,formNumber:d.data().formNumber}));
        setContextData({products:productList,coverages:coverageList,forms:formList});
      } catch {}
    })();
  }, []);

  const contextString = useMemo(() => {
    if (!contextData) return '';
    const pNames = contextData.products.map(p=>p.name).slice(0,10).join(', ');
    const cNames = [...new Set(contextData.coverages.map(c=>c.name).filter(Boolean))].slice(0,15).join(', ');
    return `Products (${contextData.products.length}): ${pNames}${contextData.products.length>10?'...':''}\nCoverages (${contextData.coverages.length}): ${cNames}${contextData.coverages.length>15?'...':''}\nForms (${contextData.forms.length}): Available for association`;
  }, [contextData]);

  // ── Generate plan ──
  const handleGenerate = useCallback(async () => {
    if (!userPrompt.trim() || phase === 'generating') return;
    setError(null);
    setPhase('generating');
    setPlan(null);

    try {
      const result = await generatePlan(userPrompt, contextString);
      setPlan(result.plan);
      setRequestId(result.requestId);
      setLatencyMs(result.latencyMs);

      // Preview
      const preview = previewPlan(result.plan);
      setDiffs(preview.diffs);
      setImpact(preview.impact);
      setValidationErrors(preview.validation.errors);

      // Select all by default
      setSelectedKeys(new Set(result.plan.artifacts.map(a => a.key)));
      setPhase('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate plan');
      setPhase('prompt');
    }
  }, [userPrompt, contextString, phase]);

  // ── Apply plan ──
  const handleApply = useCallback(async () => {
    if (!plan || !orgId || !userId) return;
    setError(null);
    setPhase('applying');

    try {
      const result = await applyPlan(orgId, plan, userId, Array.from(selectedKeys));
      setApplyResult(result);
      setPhase('applied');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply plan');
      setPhase('preview');
    }
  }, [plan, orgId, userId, selectedKeys]);

  // ── Reject plan ──
  const handleReject = useCallback(async () => {
    if (!plan || !orgId || !userId) return;
    try {
      await rejectPlan(orgId, plan, userPrompt, userId, requestId, latencyMs, 'User rejected plan');
    } catch {}
    setPlan(null);
    setPhase('prompt');
  }, [plan, orgId, userId, userPrompt, requestId, latencyMs]);

  // ── Reset ──
  const handleReset = useCallback(() => {
    setPhase('prompt');
    setPlan(null);
    setDiffs([]);
    setImpact(null);
    setSelectedKeys(new Set());
    setApplyResult(null);
    setError(null);
    setUserPrompt('');
    promptRef.current?.focus();
  }, []);

  // ── Toggle artifact selection ──
  const toggleArtifact = useCallback((key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ── Open explainability drawer ──
  const openDrawer = useCallback((artifact: ProposedArtifact) => {
    setDrawerArtifact(artifact);
    setDrawerOpen(true);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
  }, [handleGenerate]);

  // ── Render ──
  return (
    <Page>
      <MainNavigation />
      <TopBar>
        <BackBtn onClick={() => navigate('/ai-builder')}><ChevronLeftIcon /> Back to Chat</BackBtn>
        <PageTitle>
          <h1><CpuChipIcon /> AI Plan Builder</h1>
          <span>Generate structured plans, preview diffs, apply as drafts</span>
        </PageTitle>
        <HeaderActions>
          {phase === 'preview' && (
            <ActionBtn onClick={handleReject}><XMarkIcon /> Reject</ActionBtn>
          )}
          {phase === 'preview' && selectedKeys.size > 0 && (
            <ActionBtn $primary onClick={handleApply}>
              <PlayIcon /> Apply {selectedKeys.size} Item{selectedKeys.size !== 1 ? 's' : ''}
            </ActionBtn>
          )}
          {(phase === 'applied') && (
            <ActionBtn onClick={handleReset}><ArrowPathIcon /> New Plan</ActionBtn>
          )}
        </HeaderActions>
      </TopBar>

      <Main>
        {/* ── Left: Prompt ── */}
        <PromptPanel>
          <PromptHeader>
            <SectionLabel>Describe your product or changes</SectionLabel>
          </PromptHeader>
          <PromptTextArea
            ref={promptRef}
            placeholder="E.g. Create a commercial general liability product with bodily injury, property damage, and personal injury coverages for small businesses in NY, CA, TX..."
            value={userPrompt}
            onChange={e => setUserPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={phase === 'generating' || phase === 'applying'}
          />
          <PromptActions>
            <ActionBtn
              $primary
              onClick={handleGenerate}
              disabled={!userPrompt.trim() || phase === 'generating' || phase === 'applying'}
              style={{ flex: 1 }}
            >
              {phase === 'generating' ? (
                <><Spinner style={{width:14,height:14,borderWidth:2}} /> Generating...</>
              ) : (
                <><SparklesIcon /> Generate Plan</>
              )}
            </ActionBtn>
          </PromptActions>

          {/* Context summary */}
          {contextData && (
            <div style={{ padding: '12px 20px', borderTop: `1px solid ${colors.gray100}`, fontSize: 11, color: colors.gray500 }}>
              <SectionLabel>Context Loaded</SectionLabel>
              {contextData.products.length} products &middot; {contextData.coverages.length} coverages &middot; {contextData.forms.length} forms
            </div>
          )}
        </PromptPanel>

        {/* ── Center: Preview / Results ── */}
        <PreviewPanel>
          {error && (
            <ErrorBanner><ExclamationTriangleIcon /><div>{error}</div></ErrorBanner>
          )}

          {phase === 'prompt' && (
            <EmptyCenter>
              <SparklesIcon />
              <div style={{ fontSize: 15, fontWeight: 600, color: colors.gray600 }}>Describe what you want to build</div>
              <div style={{ fontSize: 13, maxWidth: 360 }}>
                The AI will generate a structured plan with specific artifacts. You can review diffs and apply selected items as drafts in your active Change Set.
              </div>
            </EmptyCenter>
          )}

          {phase === 'generating' && (
            <EmptyCenter>
              <Spinner style={{ width: 32, height: 32, borderWidth: 4 }} />
              <div style={{ fontSize: 14, fontWeight: 500 }}>Generating structured plan...</div>
              <div style={{ fontSize: 12 }}>This may take 10-20 seconds.</div>
            </EmptyCenter>
          )}

          {phase === 'applying' && (
            <EmptyCenter>
              <Spinner style={{ width: 32, height: 32, borderWidth: 4 }} />
              <div style={{ fontSize: 14, fontWeight: 500 }}>Applying plan as draft versions...</div>
              <div style={{ fontSize: 12 }}>Creating drafts in your active Change Set.</div>
            </EmptyCenter>
          )}

          {phase === 'applied' && applyResult && (
            <>
              <SuccessBanner>
                <CheckCircleIcon />
                Applied {applyResult.appliedItems.length} item{applyResult.appliedItems.length !== 1 ? 's' : ''} to Change Set.
                {applyResult.errors.length > 0 && ` (${applyResult.errors.length} error${applyResult.errors.length !== 1 ? 's' : ''}).`}
              </SuccessBanner>

              {applyResult.errors.length > 0 && applyResult.errors.map((e, i) => (
                <ErrorBanner key={i}><ExclamationTriangleIcon /><div>{e}</div></ErrorBanner>
              ))}

              <PlanCard>
                <PlanCardHeader>
                  <PlanCardTitle><ClipboardDocumentListIcon /> Applied Items</PlanCardTitle>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <ActionBtn onClick={() => navigate(`/ai-proposals/${applyResult.suggestionId}`)}>
                      <ShieldCheckIcon style={{ width: 14, height: 14 }} /> Governed Review
                    </ActionBtn>
                    <ActionBtn onClick={() => navigate(`/changesets/${applyResult.changeSetId}`)}>
                      View Change Set <ChevronRightIcon />
                    </ActionBtn>
                  </div>
                </PlanCardHeader>
                <PlanCardBody>
                  {applyResult.appliedItems.map(item => (
                    <ArtifactRow key={item.artifactKey}>
                      <ArtifactHeader>
                        <ArtifactName>
                          <CheckCircleIcon style={{ width: 14, height: 14, color: '#059669' }} />
                          {item.name}
                        </ArtifactName>
                        <ActionBadge $action={item.action}>{item.action}</ActionBadge>
                      </ArtifactHeader>
                      <TypeLabel>{PLAN_ARTIFACT_TYPE_LABELS[item.artifactType] || item.artifactType}</TypeLabel>
                    </ArtifactRow>
                  ))}
                </PlanCardBody>
              </PlanCard>
            </>
          )}

          {phase === 'preview' && plan && impact && (
            <>
              {/* Plan overview */}
              <PlanCard>
                <PlanCardHeader>
                  <PlanCardTitle><SparklesIcon /> {plan.title}</PlanCardTitle>
                </PlanCardHeader>
                <PlanCardBody>
                  <div style={{ fontSize: 13, color: colors.gray700, lineHeight: 1.6, marginBottom: 12 }}>{plan.description}</div>
                  <ImpactGrid>
                    <ImpactMetric $color="#059669">
                      <div className="value">{impact.creations}</div>
                      <div className="label">Creations</div>
                    </ImpactMetric>
                    <ImpactMetric $color="#2563eb">
                      <div className="value">{impact.modifications}</div>
                      <div className="label">Modifications</div>
                    </ImpactMetric>
                    <ImpactMetric $color="#6366f1">
                      <div className="value">{plan.artifacts.length}</div>
                      <div className="label">Total Artifacts</div>
                    </ImpactMetric>
                    <ImpactMetric $color="#f59e0b">
                      <div className="value">{impact.requiredApprovalRoles.length}</div>
                      <div className="label">Approval Roles</div>
                    </ImpactMetric>
                  </ImpactGrid>

                  {impact.warnings.length > 0 && impact.warnings.map((w, i) => (
                    <WarningBox key={i}><ExclamationTriangleIcon />{w}</WarningBox>
                  ))}

                  {validationErrors.length > 0 && (
                    <WarningBox>
                      <ExclamationTriangleIcon />
                      <div>{validationErrors.length} validation issue{validationErrors.length > 1 ? 's' : ''}: {validationErrors.slice(0, 2).join('; ')}{validationErrors.length > 2 ? '...' : ''}</div>
                    </WarningBox>
                  )}

                  {plan.caveats.length > 0 && (
                    <div style={{ fontSize: 12, color: colors.gray600, marginTop: 8 }}>
                      <strong>Caveats:</strong> {plan.caveats.join(' • ')}
                    </div>
                  )}
                </PlanCardBody>
              </PlanCard>

              {/* Artifact diffs */}
              <PlanCard>
                <PlanCardHeader>
                  <PlanCardTitle><EyeIcon /> Preview Diffs ({plan.artifacts.length})</PlanCardTitle>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <ActionBtn onClick={() => setSelectedKeys(new Set(plan.artifacts.map(a => a.key)))}>Select All</ActionBtn>
                    <ActionBtn onClick={() => setSelectedKeys(new Set())}>Deselect All</ActionBtn>
                  </div>
                </PlanCardHeader>
                <PlanCardBody>
                  {plan.artifacts.map((artifact, i) => {
                    const diff = diffs.find(d => d.artifactKey === artifact.key);
                    const selected = selectedKeys.has(artifact.key);
                    const conf = CONFIDENCE_CONFIG[artifact.confidence];
                    return (
                      <ArtifactRow key={artifact.key} $selected={selected}>
                        <ArtifactHeader>
                          <ArtifactName>
                            <ArtifactCheckbox checked={selected} onChange={() => toggleArtifact(artifact.key)} />
                            {artifact.name}
                            <ActionBadge $action={artifact.action}>{artifact.action}</ActionBadge>
                            <ConfBadge $color={conf.color}>{conf.label}</ConfBadge>
                          </ArtifactName>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <CloseBtn onClick={() => openDrawer(artifact)} title="Why this?">
                              <LightBulbIcon />
                            </CloseBtn>
                          </div>
                        </ArtifactHeader>
                        <TypeLabel>{PLAN_ARTIFACT_TYPE_LABELS[artifact.artifactType] || artifact.artifactType}</TypeLabel>
                        <RationaleText>{artifact.rationale}</RationaleText>

                        {diff && diff.fields.length > 0 && (
                          <DiffTable>
                            <DiffHeader>
                              <div>Field</div>
                              <div>{artifact.action === 'modify' ? 'Current' : ''}</div>
                              <div>Proposed</div>
                            </DiffHeader>
                            {diff.fields.map((f, fi) => (
                              <DiffRow key={fi} $type={f.type}>
                                <DiffLabel>{f.label}</DiffLabel>
                                <DiffOld>{f.oldValue !== undefined ? formatValue(f.oldValue) : ''}</DiffOld>
                                <DiffNew>{formatValue(f.newValue)}</DiffNew>
                              </DiffRow>
                            ))}
                          </DiffTable>
                        )}
                      </ArtifactRow>
                    );
                  })}
                </PlanCardBody>
              </PlanCard>
            </>
          )}
        </PreviewPanel>
      </Main>

      {/* ── Explainability Drawer ── */}
      <DrawerOverlay $open={drawerOpen} onClick={() => setDrawerOpen(false)} />
      <Drawer $open={drawerOpen}>
        <DrawerHeader>
          <h3><LightBulbIcon /> Why this artifact?</h3>
          <CloseBtn onClick={() => setDrawerOpen(false)}><XMarkIcon /></CloseBtn>
        </DrawerHeader>
        <DrawerBody>
          {drawerArtifact && (
            <>
              <DrawerSection>
                <DrawerSectionTitle>Artifact</DrawerSectionTitle>
                <DrawerText style={{ fontWeight: 600 }}>
                  {drawerArtifact.name} ({PLAN_ARTIFACT_TYPE_LABELS[drawerArtifact.artifactType]})
                </DrawerText>
                <ActionBadge $action={drawerArtifact.action}>{drawerArtifact.action}</ActionBadge>
                {' '}
                <ConfBadge $color={CONFIDENCE_CONFIG[drawerArtifact.confidence].color}>
                  {CONFIDENCE_CONFIG[drawerArtifact.confidence].label}
                </ConfBadge>
              </DrawerSection>

              <DrawerSection>
                <DrawerSectionTitle>Rationale</DrawerSectionTitle>
                <DrawerText>{drawerArtifact.rationale}</DrawerText>
              </DrawerSection>

              <DrawerSection>
                <DrawerSectionTitle>Data Used</DrawerSectionTitle>
                {drawerArtifact.dataSources.length > 0 ? (
                  <DrawerList>
                    {drawerArtifact.dataSources.map((ds, i) => <li key={i}>{ds}</li>)}
                  </DrawerList>
                ) : (
                  <DrawerText style={{ fontStyle: 'italic', color: colors.gray500 }}>
                    No specific data sources recorded.
                  </DrawerText>
                )}
              </DrawerSection>

              <DrawerSection>
                <DrawerSectionTitle>Proposed Data</DrawerSectionTitle>
                <div style={{
                  background: colors.gray50, borderRadius: 8, padding: '10px 12px',
                  fontSize: 12, fontFamily: 'monospace', maxHeight: 300, overflowY: 'auto',
                  whiteSpace: 'pre-wrap', color: colors.gray700,
                }}>
                  {JSON.stringify(drawerArtifact.proposedData, null, 2)}
                </div>
              </DrawerSection>

              {plan && (
                <DrawerSection>
                  <DrawerSectionTitle>Overall Plan Context</DrawerSectionTitle>
                  <DrawerText>{plan.overallRationale}</DrawerText>
                  {plan.dataUsed.length > 0 && (
                    <>
                      <DrawerSectionTitle style={{ marginTop: 12 }}>Plan Data Sources</DrawerSectionTitle>
                      <DrawerList>
                        {plan.dataUsed.map((d, i) => <li key={i}>{d}</li>)}
                      </DrawerList>
                    </>
                  )}
                </DrawerSection>
              )}
            </>
          )}
        </DrawerBody>
      </Drawer>
    </Page>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}
