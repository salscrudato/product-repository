/**
 * ChangeSets List Page  (Design System v2)
 * Route: /changesets
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { css } from 'styled-components';
import logger, { LOG_CATEGORIES } from '../utils/logger';
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  FunnelIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PaperAirplaneIcon,
  DocumentCheckIcon,
  ArchiveBoxIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import MainNavigation from '../components/ui/Navigation';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useRoleContext } from '../context/RoleContext';
import {
  ChangeSet,
  ChangeSetStatus,
  CHANGESET_STATUS_CONFIG,
} from '../types/changeSet';
import {
  createChangeSet,
  subscribeToChangeSets,
} from '../services/changeSetService';

// ── Design System v2 ──
import {
  color, neutral, accent,
  space, radius, shadow, fontFamily,
  type as t, border as borderTokens,
  transition, focusRingStyle, reducedMotion,
} from '@/ui/tokens';
import {
  PageShell, PageBody,
  PageHeader, PageHeaderLeft, PageHeaderRight,
  PageTitle, PageSubtitle,
  Badge, SectionCard,
} from '@/ui/components';

// ════════════════════════════════════════════════
// Local styled (token-based)
// ════════════════════════════════════════════════

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const ActionsBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${space[5]};
  gap: ${space[4]};
  flex-wrap: wrap;
`;

const FilterGroup = styled.div`
  display: flex;
  gap: ${space[1.5]};
  flex-wrap: wrap;
  align-items: center;

  > svg:first-child { width: 16px; height: 16px; color: ${neutral[400]}; }
`;

const FilterBtn = styled.button<{ $active?: boolean }>`
  all: unset;
  display: inline-flex;
  align-items: center;
  gap: ${space[1.5]};
  padding: ${space[2]} ${space[3]};
  border-radius: ${radius.md};
  font-family: ${fontFamily.sans};
  font-size: ${t.caption.size};
  font-weight: 500;
  cursor: pointer;
  transition: all ${transition.fast};

  ${({ $active }) => $active ? css`
    background: ${accent[50]};
    color: ${accent[600]};
    border: 1px solid ${accent[200]};
  ` : css`
    background: ${color.bg};
    color: ${neutral[500]};
    border: ${borderTokens.default};
    &:hover { border-color: ${accent[400]}; color: ${accent[600]}; }
  `}

  &:focus-visible { ${focusRingStyle} }
  svg { width: 14px; height: 14px; }
`;

const CreateBtn = styled.button`
  all: unset;
  display: inline-flex;
  align-items: center;
  gap: ${space[2]};
  padding: ${space[2.5]} ${space[4]};
  background: ${accent[500]};
  color: ${color.textInverse};
  border-radius: ${radius.lg};
  font-family: ${fontFamily.sans};
  font-size: ${t.label.size};
  font-weight: ${t.label.weight};
  cursor: pointer;
  transition: all ${transition.fast};

  &:hover:not(:disabled) { background: ${accent[600]}; transform: translateY(-1px); box-shadow: ${shadow.md}; }
  &:focus-visible { ${focusRingStyle} }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  svg { width: 16px; height: 16px; }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space[3]};
`;

const CSCard = styled.div`
  background: ${color.bg};
  border: ${borderTokens.default};
  border-radius: ${radius.xl};
  padding: ${space[4]} ${space[5]};
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: border-color ${transition.fast}, box-shadow ${transition.fast}, transform ${transition.fast};
  box-shadow: ${shadow.xs};

  &:hover {
    border-color: ${accent[300]};
    box-shadow: ${shadow.md};
    transform: translateX(3px);
  }

  &:focus-visible { ${focusRingStyle} }

  @media (prefers-reduced-motion: reduce) { transform: none !important; }
`;

const CSInfo = styled.div`
  flex: 1; min-width: 0;
`;

const CSName = styled.h3`
  font-family: ${fontFamily.sans};
  font-size: ${t.headingSm.size};
  font-weight: ${t.headingSm.weight};
  color: ${color.text};
  margin: 0 0 ${space[1]} 0;
`;

const CSMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[4]};
  font-size: ${t.caption.size};
  color: ${color.textMuted};
`;

const Arrow = styled.div`
  color: ${neutral[300]};
  svg { width: 18px; height: 18px; }
`;

const EmptyWrap = styled.div`
  text-align: center;
  padding: ${space[16]} ${space[5]};
  background: ${color.bg};
  border-radius: ${radius.xl};
  border: ${borderTokens.default};
`;

const EmptyIcon = styled.div`
  width: 56px; height: 56px;
  margin: 0 auto ${space[4]};
  background: ${accent[50]};
  border-radius: ${radius.xl};
  display: grid; place-items: center;
  svg { width: 28px; height: 28px; color: ${accent[500]}; }
`;

// ════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════

const statusIcon = (s: ChangeSetStatus) => {
  switch (s) {
    case 'draft': return <ClockIcon />;
    case 'ready_for_review': return <PaperAirplaneIcon />;
    case 'approved': return <CheckCircleIcon />;
    case 'filed': return <DocumentCheckIcon />;
    case 'published': return <ArchiveBoxIcon />;
    case 'rejected': return <XCircleIcon />;
    default: return <ClockIcon />;
  }
};

const statusToBadge = (status: ChangeSetStatus): 'neutral' | 'accent' | 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'draft': return 'neutral';
    case 'ready_for_review': return 'warning';
    case 'approved': return 'success';
    case 'filed': return 'info';
    case 'published': return 'success';
    case 'rejected': return 'error';
    default: return 'neutral';
  }
};

type FilterOption = 'all' | ChangeSetStatus;
const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'ready_for_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
];

const fmtDate = (date: unknown) => {
  if (!date) return 'Unknown';
  const d = typeof date === 'object' && date !== null && 'toDate' in date
    ? (date as { toDate: () => Date }).toDate()
    : new Date(date as string);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════

const ChangeSetsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrgId, loading: roleLoading } = useRoleContext();

  const [changeSets, setChangeSets] = useState<ChangeSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!currentOrgId || roleLoading) return;
    setLoading(true);
    const unsubscribe = subscribeToChangeSets(currentOrgId, (sets) => {
      setChangeSets(sets);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentOrgId, roleLoading]);

  const filtered = changeSets.filter(cs => filter === 'all' || cs.status === filter);

  const handleCreate = useCallback(async () => {
    if (!currentOrgId || creating) return;
    setCreating(true);
    try {
      const cs = await createChangeSet(currentOrgId, {
        name: `Change Set ${new Date().toLocaleDateString()}`,
        description: '',
      });
      navigate(`/changesets/${cs.id}`);
    } catch (err) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to create change set', {}, err as Error);
    } finally {
      setCreating(false);
    }
  }, [currentOrgId, creating, navigate]);

  if (roleLoading || loading) {
    return (
      <PageShell>
        <MainNavigation />
        <PageBody><LoadingSpinner /></PageBody>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <MainNavigation />
      <PageBody>
        <Container>
          {/* ── Header ── */}
          <PageHeader>
            <PageHeaderLeft>
              <div>
                <PageTitle>Change Sets</PageTitle>
                <PageSubtitle>Bundle edits across artifacts with governed approval workflow</PageSubtitle>
              </div>
            </PageHeaderLeft>
            <PageHeaderRight>
              <CreateBtn onClick={handleCreate} disabled={creating}>
                <PlusIcon />
                {creating ? 'Creating…' : 'New Change Set'}
              </CreateBtn>
            </PageHeaderRight>
          </PageHeader>

          {/* ── Filters ── */}
          <ActionsBar>
            <FilterGroup>
              <FunnelIcon />
              {FILTER_OPTIONS.map(opt => (
                <FilterBtn key={opt.value} $active={filter === opt.value} onClick={() => setFilter(opt.value)}>
                  {opt.label}
                </FilterBtn>
              ))}
            </FilterGroup>
          </ActionsBar>

          {/* ── List / Empty ── */}
          {filtered.length === 0 ? (
            <EmptyWrap>
              <EmptyIcon><ClipboardDocumentListIcon /></EmptyIcon>
              <h3 style={{ fontSize: t.headingMd.size, fontWeight: 600, color: color.text, margin: `0 0 ${space[1]}` }}>
                No change sets found
              </h3>
              <p style={{ fontSize: t.bodySm.size, color: color.textMuted, margin: 0 }}>
                {filter === 'all'
                  ? 'Create a change set to bundle and track your edits.'
                  : `No change sets with status "${filter.replace('_', ' ')}".`}
              </p>
            </EmptyWrap>
          ) : (
            <List>
              {filtered.map(cs => {
                const cfg = CHANGESET_STATUS_CONFIG[cs.status];
                return (
                  <CSCard key={cs.id} role="button" tabIndex={0} onClick={() => navigate(`/changesets/${cs.id}`)} onKeyDown={e => e.key === 'Enter' && navigate(`/changesets/${cs.id}`)}>
                    <CSInfo>
                      <CSName>{cs.name}</CSName>
                      <CSMeta>
                        <Badge $variant={statusToBadge(cs.status)} $dot $size="sm">
                          {cfg.label}
                        </Badge>
                        <span>Created {fmtDate(cs.createdAt)}</span>
                        {cs.itemCount !== undefined && <span>{cs.itemCount} items</span>}
                      </CSMeta>
                    </CSInfo>
                    <Arrow><ChevronRightIcon /></Arrow>
                  </CSCard>
                );
              })}
            </List>
          )}
        </Container>
      </PageBody>
    </PageShell>
  );
};

export default ChangeSetsPage;
