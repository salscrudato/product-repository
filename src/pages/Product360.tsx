/**
 * Product 360 – Operational Hub
 *
 * Route: /products/:productId/overview?version=:productVersionId
 *
 * One page answers: "What's missing to publish this product for CA on 01/01?"
 *
 * Sections:
 *  1. Status timeline  (versions + effective dates)
 *  2. State readiness   (matrix summary)
 *  3. Artifacts readiness (forms / rules / rates / tables)
 *  4. Open Change Sets & pending approvals
 *  5. Impact Summary  (current draft vs published)
 *  6. Linked Tasks (placeholder)
 *
 * Layout: Apple-inspired cards + summary rail
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import {
  ArrowLeftIcon,
  ShieldCheckIcon,
  ClockIcon,
  MapPinIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  TableCellsIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  PlusIcon,
  BoltIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  SparklesIcon,
  PencilIcon,
  EyeIcon,
  ClipboardDocumentListIcon,
  TagIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { SparklesIcon as SparklesSolid } from '@heroicons/react/24/solid';
import MainNavigation from '@components/ui/Navigation';

// ── Design System v2 ──
import { PageShell, PageBody } from '@/ui/components';
import { VersionPicker } from '@/components/versioning';
import { VersionedDocument } from '@/types/versioning';
import { Product } from '@/types/index';
import { versioningService } from '@/services/versioningService';
import { useRoleContext } from '@/context/RoleContext';
import { useChangeSet } from '@/context/ChangeSetContext';
import { DiscussionPanel } from '@/components/collaboration';
import type { TargetRef } from '@/types/collaboration';
import {
  computeProduct360Readiness,
  type Product360Readiness,
  type VersionTimelineEntry,
  type StateReadinessRow,
  type ArtifactCategoryReadiness,
  type OpenChangeSetSummary,
  type ImpactSummary,
} from '@/services/readinessService';
import logger, { LOG_CATEGORIES } from '@utils/logger';

/* ================================================================
   Animations
   ================================================================ */

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

/* shimmer removed – keeping reference for skeleton loader if needed */

/* ================================================================
   Layout Shell
   ================================================================ */

const Shell = styled.div`
  min-height: 100vh;
  background: #f8fafc;
`;

const Main = styled.div`
  max-width: 1480px;
  margin: 0 auto;
  padding: 28px 28px 80px;
`;

/* ── Header ─────────────────────────────────────── */

const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 28px;
  animation: ${fadeIn} 0.4s ease;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const BackBtn = styled.button`
  width: 36px; height: 36px;
  display: grid; place-items: center;
  border: 1px solid #e2e8f0; border-radius: 8px;
  background: white;
  color: #64748b;
  cursor: pointer;
  transition: background .15s, color .15s;
  &:hover { background: #f1f5f9; color: #1e293b; }
  svg { width: 16px; height: 16px; }
`;

const ProductBadge = styled.div`
  width: 48px; height: 48px;
  border-radius: 12px;
  background: #4f46e5;
  display: grid; place-items: center;
  color: white;
  svg { width: 24px; height: 24px; }
`;

const TitleBlock = styled.div``;

const ProductTitle = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: #1e293b;
  letter-spacing: -0.025em;
`;

const SubMeta = styled.div`
  display: flex; align-items: center; gap: 10px; margin-top: 6px; flex-wrap: wrap;
`;

const Pill = styled.span<{ $color?: string }>`
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px; font-weight: 600;
  background: ${({ $color }) => $color ? `${$color}18` : 'rgba(100,116,139,.1)'};
  color: ${({ $color }) => $color ?? '#64748b'};
  svg { width: 13px; height: 13px; }
`;

const HeaderRight = styled.div`
  display: flex; align-items: center; gap: 10px;
`;

const ActionBtn = styled.button<{ $primary?: boolean }>`
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px; font-weight: 500;
  cursor: pointer;
  transition: background .15s, border-color .15s;
  ${({ $primary }) => $primary ? css`
    background: #4f46e5;
    color: white; border: none;
    &:hover { background: #4338ca; }
  ` : css`
    background: white; color: #475569;
    border: 1px solid #e2e8f0;
    &:hover { background: #f8fafc; border-color: #cbd5e1; }
  `}
  svg { width: 15px; height: 15px; }
`;

/* ── Score Banner ───────────────────────────────── */

const ScoreBanner = styled.div`
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 24px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 16px rgba(0,0,0,.04);
  animation: ${fadeIn} 0.4s ease .05s backwards;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ScoreRing = styled.div<{ $score: number }>`
  width: 140px; height: 140px;
  margin: 0 auto;
  border-radius: 50%;
  background: conic-gradient(
    ${({ $score }) => $score >= 80 ? '#10b981' : $score >= 50 ? '#f59e0b' : '#ef4444'} ${({ $score }) => $score * 3.6}deg,
    #f1f5f9 0deg
  );
  display: grid; place-items: center;
  position: relative;
  &::before {
    content: '';
    position: absolute;
    width: 112px; height: 112px;
    border-radius: 50%;
    background: white;
  }
`;

const ScoreInner = styled.div`
  position: relative; z-index: 1;
  text-align: center;
`;

const ScoreNum = styled.div<{ $score: number }>`
  font-size: 38px; font-weight: 800;
  color: ${({ $score }) => $score >= 80 ? '#10b981' : $score >= 50 ? '#f59e0b' : '#ef4444'};
  line-height: 1;
`;

const ScoreCaption = styled.div`
  font-size: 11px; font-weight: 600;
  color: #94a3b8; text-transform: uppercase; letter-spacing: .05em;
  margin-top: 4px;
`;

const BlockerList = styled.div`
  display: flex; flex-direction: column; gap: 8px;
`;

const BlockerTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 16px; font-weight: 700; color: #1e293b;
  display: flex; align-items: center; gap: 8px;
  svg { width: 18px; height: 18px; color: #6366f1; }
`;

const BlockerItem = styled.div<{ $severity?: 'error' | 'warn' | 'info' }>`
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px; color: #475569; line-height: 1.5;
  background: ${({ $severity }) =>
    $severity === 'error' ? 'rgba(239,68,68,.06)' :
    $severity === 'warn' ? 'rgba(245,158,11,.06)' :
    'rgba(99,102,241,.06)'};
  border-left: 3px solid ${({ $severity }) =>
    $severity === 'error' ? '#ef4444' :
    $severity === 'warn' ? '#f59e0b' :
    '#6366f1'};
  svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; }
`;

/* ── What's Missing Query ──────────────────────── */

const QueryBar = styled.div`
  display: flex; align-items: center; gap: 12px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 12px 16px;
  margin-bottom: 20px;
  animation: ${fadeIn} 0.3s ease .08s backwards;
  flex-wrap: wrap;
`;

const QueryLabel = styled.span`
  font-size: 14px; font-weight: 700; color: #1e293b;
  white-space: nowrap;
  display: flex; align-items: center; gap: 6px;
  svg { width: 18px; height: 18px; color: #6366f1; }
`;

const QueryInput = styled.input`
  padding: 8px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  outline: none;
  transition: border-color .2s;
  width: 100px;
  &:focus { border-color: #6366f1; }
`;

const QueryDateInput = styled.input`
  padding: 8px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  outline: none;
  transition: border-color .2s;
  &:focus { border-color: #6366f1; }
`;

const QueryButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #4f46e5;
  color: white;
  font-size: 13px; font-weight: 500;
  cursor: pointer;
  transition: background .15s;
  &:hover { background: #4338ca; }
  &:disabled { opacity: .5; cursor: not-allowed; }
`;

/* ── Grid System ──────────────────────────────── */

const Grid2Col = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const Grid3Col = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
  @media (max-width: 1100px) { grid-template-columns: 1fr 1fr; }
  @media (max-width: 700px) { grid-template-columns: 1fr; }
`;

const FullRow = styled.div`
  margin-bottom: 20px;
`;

/* ── Cards ───────────────────────────────────── */

const Card = styled.div<{ $delay?: number }>`
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 20px;
  animation: ${fadeIn} 0.3s ease ${({ $delay }) => 0.05 + ($delay || 0) * 0.03}s backwards;
  display: flex; flex-direction: column;
`;

const CardHead = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 15px; font-weight: 700; color: #1e293b;
  display: flex; align-items: center; gap: 8px;
  svg { width: 18px; height: 18px; color: #6366f1; }
`;

const CardLink = styled(Link)`
  font-size: 12px; font-weight: 600; color: #6366f1;
  text-decoration: none;
  display: flex; align-items: center; gap: 4px;
  transition: gap .2s;
  &:hover { gap: 8px; }
  svg { width: 14px; height: 14px; }
`;

const CardLinkBtn = styled.button`
  font-size: 12px; font-weight: 600; color: #6366f1;
  background: none; border: none; cursor: pointer;
  display: flex; align-items: center; gap: 4px;
  transition: gap .2s;
  &:hover { gap: 8px; }
  svg { width: 14px; height: 14px; }
`;

/* ── Section 1: Version Timeline ─────────────── */

const TimelineTrack = styled.div`
  display: flex; gap: 0; overflow-x: auto;
  padding: 4px 0 8px;
`;

const TimelineNode = styled.div<{ $active?: boolean; $color: string }>`
  display: flex; flex-direction: column; align-items: center;
  min-width: 110px;
  position: relative;
  padding: 0 8px;
  cursor: pointer;
  transition: all .2s;

  &:not(:last-child)::after {
    content: '';
    position: absolute;
    top: 16px; left: calc(50% + 18px); right: calc(-50% + 18px);
    height: 3px;
    background: ${({ $active }) => $active ? '#6366f1' : '#e2e8f0'};
    border-radius: 2px;
    z-index: 0;
  }
`;

const TimelineDot = styled.div<{ $color: string; $active?: boolean }>`
  width: 32px; height: 32px;
  border-radius: 50%;
  background: ${({ $active, $color }) => $active ? $color : `${$color}20`};
  color: ${({ $active }) => $active ? 'white' : '#64748b'};
  display: grid; place-items: center;
  position: relative; z-index: 1;
  font-size: 12px; font-weight: 700;
  transition: background .15s;
`;

const TimelineLabel = styled.div<{ $active?: boolean }>`
  margin-top: 8px;
  font-size: 11px; font-weight: 600;
  color: ${({ $active }) => $active ? '#1e293b' : '#94a3b8'};
  text-align: center;
  line-height: 1.3;
`;

const TimelineDate = styled.div`
  font-size: 10px; color: #94a3b8; margin-top: 2px;
`;

/* ── Section 2: State Readiness Matrix ────────── */

const StateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  gap: 6px;
`;

const StateCell = styled.div<{ $color: string; $blocked?: boolean }>`
  aspect-ratio: 1;
  border-radius: 10px;
  background: ${({ $color }) => `${$color}18`};
  border: 2px solid ${({ $blocked, $color }) => $blocked ? '#ef4444' : `${$color}30`};
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
  color: ${({ $color }) => $color};
  cursor: pointer;
  transition: all .2s;
  position: relative;

  &:hover {
    border-color: ${({ $color }) => `${$color}60`};
  }
`;

const StateCellCode = styled.span`
  font-size: 12px; font-weight: 700;
`;

const StateCellBadge = styled.span`
  position: absolute; top: -3px; right: -3px;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #ef4444;
  display: grid; place-items: center;
  svg { width: 8px; height: 8px; color: white; }
`;

const StateSummaryRow = styled.div`
  display: flex; gap: 16px; margin-bottom: 12px; flex-wrap: wrap;
`;

const StatSummaryChip = styled.div<{ $color: string }>`
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600; color: ${({ $color }) => $color};
  svg { width: 14px; height: 14px; }
`;

/* ── Section 3: Artifact Readiness ───────────── */

const ArtifactBar = styled.div`
  display: flex; flex-direction: column; gap: 14px;
`;

const ArtifactRow = styled.div`
  display: flex; align-items: center; gap: 14px;
`;

const ArtifactIcon = styled.div<{ $color: string }>`
  width: 36px; height: 36px;
  border-radius: 10px;
  background: ${({ $color }) => `${$color}14`};
  display: grid; place-items: center;
  color: ${({ $color }) => $color};
  svg { width: 18px; height: 18px; }
`;

const ArtifactInfo = styled.div`
  flex: 1; min-width: 0;
`;

const ArtifactLabel = styled.div`
  font-size: 13px; font-weight: 600; color: #1e293b;
`;

const ArtifactMeta = styled.div`
  font-size: 11px; color: #94a3b8; margin-top: 1px;
`;

const ProgressTrack = styled.div`
  width: 80px; height: 6px;
  border-radius: 3px;
  background: #f1f5f9;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  border-radius: 3px;
  background: ${({ $color }) => $color};
  transition: width .6s ease;
`;

const ArtifactScore = styled.span<{ $score: number }>`
  font-size: 13px; font-weight: 700;
  min-width: 36px; text-align: right;
  color: ${({ $score }) => $score >= 80 ? '#10b981' : $score >= 50 ? '#f59e0b' : '#ef4444'};
`;

/* ── Section 4: Change Sets ──────────────────── */

const CSList = styled.div`
  display: flex; flex-direction: column; gap: 10px;
`;

const CSItem = styled.div`
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;
  transition: background .15s;
  &:hover { background: #f1f5f9; }
`;

const CSBadge = styled.span<{ $color: string }>`
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px; font-weight: 600;
  background: ${({ $color }) => `${$color}18`};
  color: ${({ $color }) => $color};
`;

const CSInfo = styled.div`
  flex: 1; min-width: 0;
`;

const CSName = styled.div`
  font-size: 13px; font-weight: 600; color: #1e293b;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;

const CSMeta = styled.div`
  font-size: 11px; color: #94a3b8; margin-top: 2px;
`;

const CSChevron = styled.div`
  color: #c4c4c4;
  svg { width: 16px; height: 16px; }
`;

/* ── Section 5: Impact Summary ───────────────── */

const ImpactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 14px;
`;

const ImpactStat = styled.div<{ $color: string }>`
  text-align: center;
  padding: 14px;
  border-radius: 12px;
  background: ${({ $color }) => `${$color}08`};
`;

const ImpactNum = styled.div<{ $color: string }>`
  font-size: 28px; font-weight: 800;
  color: ${({ $color }) => $color};
  line-height: 1;
`;

const ImpactLabel = styled.div`
  font-size: 11px; font-weight: 600;
  color: #94a3b8; margin-top: 4px;
  text-transform: uppercase; letter-spacing: .03em;
`;

const ChangedPathsList = styled.div`
  display: flex; flex-wrap: wrap; gap: 6px;
`;

const ChangedPath = styled.span`
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(99,102,241,.08);
  font-size: 11px; font-weight: 500;
  color: #6366f1;
  font-family: 'SF Mono', monospace;
`;

/* ── Section 6: Linked Tasks (placeholder) ───── */

const EmptyState = styled.div`
  display: flex; flex-direction: column; align-items: center;
  padding: 28px 0;
  gap: 8px;
  color: #94a3b8;
  svg { width: 32px; height: 32px; }
`;

const EmptyText = styled.div`
  font-size: 13px; font-weight: 500; color: #94a3b8;
`;

/* ── Loading / Error ─────────────────────────── */

const CenterBox = styled.div`
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  min-height: 400px; gap: 16px;
`;

const Spinner = styled.div`
  width: 44px; height: 44px;
  border: 4px solid #e2e8f0;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin .8s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

/* ================================================================
   Helpers
   ================================================================ */

const ARTIFACT_ICONS: Record<string, React.ReactNode> = {
  forms: <DocumentTextIcon />,
  rules: <Cog6ToothIcon />,
  ratePrograms: <CurrencyDollarIcon />,
  tables: <TableCellsIcon />,
};

const ARTIFACT_COLORS: Record<string, string> = {
  forms: '#10b981',
  rules: '#06b6d4',
  ratePrograms: '#f59e0b',
  tables: '#8b5cf6',
};

/* ================================================================
   Component
   ================================================================ */

const Product360: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentOrg, user } = useRoleContext();
  const { activeChangeSet } = useChangeSet();

  const orgId = currentOrg?.id || '';
  const versionParam = searchParams.get('version');

  // State
  const [report, setReport] = useState<Product360Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Versioning
  const [versions, setVersions] = useState<VersionedDocument<Record<string, unknown>>[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(versionParam);

  // "What's missing" query
  const [queryState, setQueryState] = useState('');
  const [queryDate, setQueryDate] = useState('');
  const [queryBlockers, setQueryBlockers] = useState<string[] | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  // ── Load versions ─────────────────────────────
  useEffect(() => {
    if (!productId || !orgId) return;

    const load = async () => {
      try {
        const vs = await versioningService.getVersions<Record<string, unknown>>(orgId, 'product', productId);
        setVersions(vs);

        if (!selectedVersionId && vs.length > 0) {
          const draft = vs.find(v => v.status === 'draft');
          const pub = vs.find(v => v.status === 'published');
          const auto = (draft || pub || vs[0]).id;
          setSelectedVersionId(auto);
          setSearchParams({ version: auto }, { replace: true });
        }
      } catch {
        logger.warn(LOG_CATEGORIES.DATA, 'No product versions', { productId });
      }
    };
    load();
  }, [productId, orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Compute readiness ─────────────────────────
  useEffect(() => {
    if (!orgId || !productId) return;

    const compute = async () => {
      setLoading(true);
      setError('');
      try {
        const r = await computeProduct360Readiness(orgId, productId, selectedVersionId);
        setReport(r);
      } catch (err) {
        logger.error(LOG_CATEGORIES.ERROR, 'Product360 readiness failed', {}, err as Error);
        setError('Failed to compute readiness');
      } finally {
        setLoading(false);
      }
    };
    compute();
  }, [orgId, productId, selectedVersionId]);

  // ── Handlers ──────────────────────────────────
  const handleVersionSelect = useCallback((vId: string) => {
    setSelectedVersionId(vId);
    setSearchParams({ version: vId }, { replace: true });
  }, [setSearchParams]);

  const handleCreateDraft = useCallback(async (pubId: string) => {
    if (!productId || !orgId) return;
    const newVer = await versioningService.cloneVersion<Record<string, unknown>>({
      orgId,
      entityType: 'product',
      entityId: productId,
      sourceVersionId: pubId,
      userId: user?.uid || 'system',
      summary: 'New draft from published',
    });
    const updated = await versioningService.getVersions<Record<string, unknown>>(orgId, 'product', productId);
    setVersions(updated);
    handleVersionSelect(newVer.id);
  }, [orgId, productId, user, handleVersionSelect]);

  const handleQueryBlockers = useCallback(async () => {
    if (!orgId || !productId || !queryState) return;
    setQueryLoading(true);
    try {
      const { whatsMissing } = await import('@/services/readinessService');
      const blockers = await whatsMissing(orgId, productId, selectedVersionId, queryState.toUpperCase(), queryDate);
      setQueryBlockers(blockers);
    } catch {
      setQueryBlockers(['Failed to compute — check console for details.']);
    } finally {
      setQueryLoading(false);
    }
  }, [orgId, productId, selectedVersionId, queryState, queryDate]);

  const handleRefresh = useCallback(async () => {
    if (!orgId || !productId) return;
    setLoading(true);
    try {
      const r = await computeProduct360Readiness(orgId, productId, selectedVersionId);
      setReport(r);
    } catch {
      /* keep stale data */
    } finally {
      setLoading(false);
    }
  }, [orgId, productId, selectedVersionId]);

  // ── Render ────────────────────────────────────
  if (loading && !report) {
    return (
      <PageShell>
        <MainNavigation />
        <PageBody>
          <CenterBox>
            <Spinner />
            <EmptyText>Computing readiness…</EmptyText>
          </CenterBox>
        </PageBody>
      </PageShell>
    );
  }

  if (error || !report) {
    return (
      <PageShell>
        <MainNavigation />
        <PageBody>
          <CenterBox>
            <ExclamationTriangleIcon style={{ width: 40, height: 40, color: '#ef4444' }} />
            <div style={{ fontWeight: 600, color: '#1e293b' }}>Unable to Load Product</div>
            <EmptyText>{error || 'Product not found.'}</EmptyText>
            <ActionBtn onClick={() => navigate('/products')}>
              <ArrowLeftIcon /> Back to Products
            </ActionBtn>
          </CenterBox>
        </PageBody>
      </PageShell>
    );
  }

  const selectedVer = report.versionTimeline.find(v => v.isCurrent);

  return (
    <PageShell>
      <MainNavigation />
      <PageBody>
        <Main>
          {/* ── Header ──────────────────────────────── */}
          <Header>
            <HeaderLeft>
              <BackBtn onClick={() => navigate('/products')}>
                <ArrowLeftIcon />
              </BackBtn>
              <ProductBadge><ShieldCheckIcon /></ProductBadge>
              <TitleBlock>
                <ProductTitle>{report.productName}</ProductTitle>
                <SubMeta>
                  {selectedVer && (
                    <Pill $color={selectedVer.statusColor}>
                      v{selectedVer.versionNumber} · {selectedVer.statusLabel}
                    </Pill>
                  )}
                  {selectedVer?.effectiveStart && (
                    <Pill>
                      <CalendarDaysIcon />
                      {selectedVer.effectiveStart}
                    </Pill>
                  )}
                  {activeChangeSet && (
                    <Pill $color="#f59e0b">
                      <ClipboardDocumentListIcon />
                      Active CS: {activeChangeSet.name}
                    </Pill>
                  )}
                </SubMeta>
              </TitleBlock>
            </HeaderLeft>

            <HeaderRight>
              {versions.length > 0 && (
                <VersionPicker
                  versions={versions}
                  selectedVersionId={selectedVersionId}
                  onSelectVersion={handleVersionSelect}
                  onCreateDraft={() => { if (selectedVersionId) handleCreateDraft(selectedVersionId); }}
                  compact
                />
              )}
              <ActionBtn onClick={handleRefresh}>
                <ArrowPathIcon /> Refresh
              </ActionBtn>
              <ActionBtn $primary onClick={() => navigate(`/coverage/${productId}`)}>
                <PencilIcon /> Edit Product
              </ActionBtn>
            </HeaderRight>
          </Header>

          {/* ── Score Banner + Blockers ─────────────── */}
          <ScoreBanner>
            <ScoreRing $score={report.overallReadinessScore}>
              <ScoreInner>
                <ScoreNum $score={report.overallReadinessScore}>
                  {report.overallReadinessScore}
                </ScoreNum>
                <ScoreCaption>Readiness</ScoreCaption>
              </ScoreInner>
            </ScoreRing>
            <div>
              <BlockerTitle>
                <SparklesSolid /> Blockers & Insights
              </BlockerTitle>
              <BlockerList>
                {report.blockers.length === 0 ? (
                  <BlockerItem $severity="info">
                    <CheckCircleIcon />
                    All clear — no blockers detected for this version.
                  </BlockerItem>
                ) : (
                  report.blockers.slice(0, 6).map((b, i) => (
                    <BlockerItem
                      key={i}
                      $severity={b.includes('error') || b.includes('Error') ? 'error' : b.includes('Draft') || b.includes('missing') ? 'warn' : 'info'}
                    >
                      {b.includes('error') || b.includes('Error')
                        ? <ExclamationCircleIcon style={{ color: '#ef4444' }} />
                        : b.includes('Draft') || b.includes('missing')
                          ? <ExclamationTriangleIcon style={{ color: '#f59e0b' }} />
                          : <SparklesIcon style={{ color: '#6366f1' }} />}
                      {b}
                    </BlockerItem>
                  ))
                )}
              </BlockerList>
            </div>
          </ScoreBanner>

          {/* ── "What's Missing?" Query Bar ────────── */}
          <QueryBar>
            <QueryLabel>
              <MagnifyingGlassIcon />
              What's missing to publish for
            </QueryLabel>
            <QueryInput
              placeholder="e.g. CA"
              value={queryState}
              onChange={e => { setQueryState(e.target.value); setQueryBlockers(null); }}
              maxLength={2}
            />
            <span style={{ color: '#94a3b8', fontSize: 13 }}>on</span>
            <QueryDateInput
              type="date"
              value={queryDate}
              onChange={e => { setQueryDate(e.target.value); setQueryBlockers(null); }}
            />
            <QueryButton onClick={handleQueryBlockers} disabled={queryLoading || !queryState}>
              {queryLoading ? 'Checking…' : 'Check'}
            </QueryButton>

            {queryBlockers && queryBlockers.length > 0 && (
              <div style={{ width: '100%', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {queryBlockers.map((b, i) => (
                  <BlockerItem key={i} $severity="warn">
                    <ExclamationTriangleIcon style={{ color: '#f59e0b' }} />
                    {b}
                  </BlockerItem>
                ))}
              </div>
            )}
            {queryBlockers && queryBlockers.length === 0 && (
              <div style={{ width: '100%', marginTop: 8 }}>
                <BlockerItem $severity="info">
                  <CheckCircleIcon style={{ color: '#10b981' }} />
                  Ready to publish for {queryState.toUpperCase()} on {queryDate || 'any date'}!
                </BlockerItem>
              </div>
            )}
          </QueryBar>

          {/* ── Section 1: Version Timeline ─────────── */}
          <FullRow>
            <Card $delay={1}>
              <CardHead>
                <CardTitle><ClockIcon /> Version Timeline</CardTitle>
                {productId && selectedVersionId && (
                  <CardLink to={`/products/${productId}/versions/${selectedVersionId}/states`}>
                    Manage Versions <ChevronRightIcon />
                  </CardLink>
                )}
              </CardHead>
              <TimelineTrack>
                {report.versionTimeline.map(v => (
                  <TimelineNode
                    key={v.versionId}
                    $active={v.isCurrent}
                    $color={v.statusColor}
                    onClick={() => handleVersionSelect(v.versionId)}
                  >
                    <TimelineDot $color={v.statusColor} $active={v.isCurrent}>
                      {v.versionNumber}
                    </TimelineDot>
                    <TimelineLabel $active={v.isCurrent}>
                      {v.statusLabel}
                    </TimelineLabel>
                    {v.effectiveStart && (
                      <TimelineDate>{v.effectiveStart}</TimelineDate>
                    )}
                  </TimelineNode>
                ))}
                {report.versionTimeline.length === 0 && (
                  <EmptyState>
                    <ClockIcon />
                    <EmptyText>No versions yet</EmptyText>
                  </EmptyState>
                )}
              </TimelineTrack>
            </Card>
          </FullRow>

          {/* ── Row: State Readiness + Artifacts ────── */}
          <Grid2Col>
            {/* Section 2: State Readiness Matrix */}
            <Card $delay={2}>
              <CardHead>
                <CardTitle><MapPinIcon /> State Readiness</CardTitle>
                {productId && selectedVersionId && (
                  <CardLink to={`/products/${productId}/versions/${selectedVersionId}/states`}>
                    Manage <ChevronRightIcon />
                  </CardLink>
                )}
              </CardHead>
              <StateSummaryRow>
                <StatSummaryChip $color="#10b981">
                  <CheckCircleIcon /> {report.stateStats.active} Active
                </StatSummaryChip>
                <StatSummaryChip $color="#f59e0b">
                  <ClockIcon /> {report.stateStats.readyToActivate} Ready
                </StatSummaryChip>
                <StatSummaryChip $color="#ef4444">
                  <ExclamationTriangleIcon /> {report.stateStats.blocked} Blocked
                </StatSummaryChip>
                <StatSummaryChip $color="#94a3b8">
                  {report.stateStats.total} Total
                </StatSummaryChip>
              </StateSummaryRow>
              {report.stateReadiness.length > 0 ? (
                <StateGrid>
                  {report.stateReadiness
                    .filter(s => s.status !== 'not_offered')
                    .map(s => (
                      <StateCell
                        key={s.stateCode}
                        $color={s.statusColor}
                        $blocked={s.validationErrors.length > 0 || s.missingArtifacts.length > 0}
                        title={`${s.stateName}: ${s.statusLabel}${s.missingArtifacts.length ? ` – ${s.missingArtifacts.join(', ')}` : ''}`}
                        onClick={() =>
                          navigate(
                            `/products/${productId}/versions/${selectedVersionId}/states`
                          )
                        }
                      >
                        <StateCellCode>{s.stateCode}</StateCellCode>
                        {(s.validationErrors.length > 0 || s.missingArtifacts.length > 0) && (
                          <StateCellBadge>
                            <ExclamationTriangleIcon />
                          </StateCellBadge>
                        )}
                      </StateCell>
                    ))}
                </StateGrid>
              ) : (
                <EmptyState>
                  <MapPinIcon />
                  <EmptyText>No states configured</EmptyText>
                </EmptyState>
              )}
            </Card>

            {/* Section 3: Artifact Readiness */}
            <Card $delay={3}>
              <CardHead>
                <CardTitle><ChartBarIcon /> Artifact Readiness</CardTitle>
              </CardHead>
              <ArtifactBar>
                {report.artifacts.map(a => (
                  <ArtifactRow key={a.category}>
                    <ArtifactIcon $color={ARTIFACT_COLORS[a.category] || '#6366f1'}>
                      {ARTIFACT_ICONS[a.category]}
                    </ArtifactIcon>
                    <ArtifactInfo>
                      <ArtifactLabel>{a.label}</ArtifactLabel>
                      <ArtifactMeta>
                        {a.published} published · {a.draft} draft{a.issues.length > 0 ? ` · ${a.issues.length} issue(s)` : ''}
                      </ArtifactMeta>
                    </ArtifactInfo>
                    <ProgressTrack>
                      <ProgressFill $pct={a.score} $color={ARTIFACT_COLORS[a.category] || '#6366f1'} />
                    </ProgressTrack>
                    <ArtifactScore $score={a.score}>{a.score}%</ArtifactScore>
                  </ArtifactRow>
                ))}

                {report.artifacts.length === 0 && (
                  <EmptyState>
                    <ChartBarIcon />
                    <EmptyText>No artifacts to evaluate</EmptyText>
                  </EmptyState>
                )}
              </ArtifactBar>
            </Card>
          </Grid2Col>

          {/* ── Row: Change Sets + Impact + Tasks ──── */}
          <Grid3Col>
            {/* Section 4: Open Change Sets */}
            <Card $delay={4}>
              <CardHead>
                <CardTitle>
                  <ClipboardDocumentListIcon /> Open Change Sets
                </CardTitle>
                <CardLink to="/changesets">
                  All <ChevronRightIcon />
                </CardLink>
              </CardHead>
              {report.openChangeSets.length > 0 ? (
                <CSList>
                  {report.openChangeSets.slice(0, 5).map(cs => (
                    <CSItem key={cs.id} onClick={() => navigate(`/changesets/${cs.id}`)}>
                      <CSBadge $color={cs.statusColor}>{cs.statusLabel}</CSBadge>
                      <CSInfo>
                        <CSName>{cs.name}</CSName>
                        <CSMeta>
                          {cs.itemCount} items
                          {cs.pendingApprovals.length > 0 && (
                            <> · Needs: {cs.pendingApprovals.join(', ')}</>
                          )}
                        </CSMeta>
                      </CSInfo>
                      <CSChevron><ChevronRightIcon /></CSChevron>
                    </CSItem>
                  ))}
                </CSList>
              ) : (
                <EmptyState>
                  <ClipboardDocumentListIcon />
                  <EmptyText>No open change sets</EmptyText>
                </EmptyState>
              )}
              {report.totalPendingApprovals > 0 && (
                <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(245,158,11,.06)', fontSize: 12, fontWeight: 600, color: '#d97706' }}>
                  {report.totalPendingApprovals} approval(s) pending across all change sets
                </div>
              )}
            </Card>

            {/* Section 5: Impact Summary */}
            <Card $delay={5}>
              <CardHead>
                <CardTitle><BoltIcon /> Draft vs Published</CardTitle>
              </CardHead>
              {report.impact.hasPublishedBaseline ? (
                <>
                  <ImpactGrid>
                    <ImpactStat $color="#10b981">
                      <ImpactNum $color="#10b981">{report.impact.fieldsAdded}</ImpactNum>
                      <ImpactLabel>Added</ImpactLabel>
                    </ImpactStat>
                    <ImpactStat $color="#f59e0b">
                      <ImpactNum $color="#f59e0b">{report.impact.fieldsChanged}</ImpactNum>
                      <ImpactLabel>Changed</ImpactLabel>
                    </ImpactStat>
                    <ImpactStat $color="#ef4444">
                      <ImpactNum $color="#ef4444">{report.impact.fieldsRemoved}</ImpactNum>
                      <ImpactLabel>Removed</ImpactLabel>
                    </ImpactStat>
                  </ImpactGrid>
                  {report.impact.changedPaths.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                        CHANGED FIELDS
                      </div>
                      <ChangedPathsList>
                        {report.impact.changedPaths.slice(0, 10).map(p => (
                          <ChangedPath key={p}>{p}</ChangedPath>
                        ))}
                        {report.impact.changedPaths.length > 10 && (
                          <ChangedPath>+{report.impact.changedPaths.length - 10} more</ChangedPath>
                        )}
                      </ChangedPathsList>
                    </>
                  )}
                  {report.impact.totalChanges === 0 && (
                    <EmptyState>
                      <CheckCircleIcon />
                      <EmptyText>No differences — draft matches published</EmptyText>
                    </EmptyState>
                  )}
                </>
              ) : (
                <EmptyState>
                  <BoltIcon />
                  <EmptyText>No published version to compare</EmptyText>
                </EmptyState>
              )}
            </Card>

            {/* Section 6: Linked Tasks */}
            <Card $delay={6}>
              <CardHead>
                <CardTitle><TagIcon /> Linked Tasks</CardTitle>
                <CardLinkBtn onClick={() => navigate('/tasks')}>
                  All Tasks <ChevronRightIcon />
                </CardLinkBtn>
              </CardHead>
              {report.linkedTasks.length > 0 ? (
                <CSList>
                  {report.linkedTasks.map(t => (
                    <CSItem key={t.id}>
                      <CSBadge
                        $color={t.status === 'done' ? '#10b981' : t.status === 'in_progress' ? '#f59e0b' : '#6366f1'}
                      >
                        {t.status}
                      </CSBadge>
                      <CSInfo>
                        <CSName>{t.title}</CSName>
                        {t.assignee && <CSMeta>{t.assignee}{t.dueDate ? ` · Due ${t.dueDate}` : ''}</CSMeta>}
                      </CSInfo>
                    </CSItem>
                  ))}
                </CSList>
              ) : (
                <EmptyState>
                  <TagIcon />
                  <EmptyText>No linked tasks yet</EmptyText>
                </EmptyState>
              )}
            </Card>
          </Grid3Col>

          {/* ── Quick Actions ────────────────────────── */}
          <Card $delay={7}>
            <CardHead>
              <CardTitle><BoltIcon /> Quick Actions</CardTitle>
            </CardHead>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {[
                { label: 'Add Coverage', icon: <ShieldCheckIcon />, to: `/coverage/${productId}` },
                { label: 'Upload Form', icon: <DocumentTextIcon />, to: `/forms/${productId}` },
                { label: 'Configure Pricing', icon: <CurrencyDollarIcon />, to: `/pricing/${productId}` },
                { label: 'Add Rule', icon: <Cog6ToothIcon />, to: `/rules/${productId}` },
                { label: 'Manage States', icon: <MapPinIcon />, to: selectedVersionId ? `/products/${productId}/versions/${selectedVersionId}/states` : `/states/${productId}` },
                { label: 'AI Plan Builder', icon: <SparklesIcon />, to: '/ai-builder/plan' },
              ].map(qa => (
                <Link
                  key={qa.label}
                  to={qa.to}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    padding: '18px 12px', borderRadius: 14, background: '#f8fafc',
                    textDecoration: 'none', textAlign: 'center', transition: 'all .2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,.06)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    display: 'grid', placeItems: 'center', color: 'white',
                  }}>
                    {React.cloneElement(qa.icon as React.ReactElement<{ style?: React.CSSProperties }>, { style: { width: 22, height: 22 } })}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{qa.label}</span>
                </Link>
              ))}
            </div>
          </Card>
          {/* Discussion */}
          {productId && orgId && (
            <DiscussionPanel
              orgId={orgId}
              target={{ type: 'product', artifactId: productId, versionId: selectedVersionId || null } as TargetRef}
              title="Product Discussion"
            />
          )}
        </Main>
      </PageBody>
    </PageShell>
  );
};

export default Product360;
