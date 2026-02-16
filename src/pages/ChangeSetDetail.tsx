/**
 * ChangeSetDetail Page  (Design System v2)
 * Detail view for a single change set with items, approvals, and actions
 * Route: /changesets/:changeSetId
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import logger, { LOG_CATEGORIES } from '../utils/logger';
import {
  ClipboardDocumentListIcon,
  ArrowLeftIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  PaperAirplaneIcon,
  PlayIcon,
  UserGroupIcon,
  ClockIcon,
  DocumentCheckIcon,
  QueueListIcon,
} from '@heroicons/react/24/outline';
import MainNavigation from '../components/ui/Navigation';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { AuditTimeline } from '../components/changeset';
import { useRoleContext } from '../context/RoleContext';
import {
  ChangeSet,
  ChangeSetItem,
  ChangeSetApproval,
  ChangeSetStatus,
  CHANGESET_STATUS_CONFIG,
  CHANGESET_ITEM_ACTION_CONFIG,
  ApprovalRoleRequired,
} from '../types/changeSet';
import {
  getChangeSet,
  getChangeSetItems,
  getChangeSetApprovals,
  getRequiredApprovals,
  submitForReview,
  returnToDraft,
  publishChangeSet,
  approveChangeSet,
  areAllApprovalsComplete,
  removeItemFromChangeSet,
} from '../services/changeSetService';

// ── Design System v2 ──
import {
  color, neutral, accent, semantic,
  space, radius, shadow, fontFamily,
  type as t, border as borderTokens,
  transition, focusRingStyle, reducedMotion, layout,
} from '@/ui/tokens';
import {
  PageShell, PageBody,
  PageHeader, PageHeaderLeft, PageHeaderRight,
  PageTitle, PageSubtitle,
  SectionCard, SectionTitle,
  Badge, Banner, IconBtn, BackButton as DSBackButton, StatGrid, StatCard, StatValue, StatLabel, Divider,
} from '@/ui/components';
import { DiscussionPanel } from '@/components/collaboration';
import type { TargetRef } from '@/types/collaboration';
import TaskPanel from '@/components/tasks/TaskPanel';
import FilingTab from '@/components/filing/FilingTab';
import QAGatePanel from '@/components/changeset/QAGatePanel';

// ════════════════════════════════════════════════
// Local styled (token-based, page-specific)
// ════════════════════════════════════════════════

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'danger' | 'secondary' }>`
  display: inline-flex;
  align-items: center;
  gap: ${space[1.5]};
  padding: ${space[2.5]} ${space[4]};
  border-radius: ${radius.lg};
  font-family: ${fontFamily.sans};
  font-size: ${t.label.size};
  font-weight: ${t.label.weight};
  cursor: pointer;
  transition: all ${transition.fast};

  ${({ $variant }) => {
    switch ($variant) {
      case 'primary':
        return `
          background: ${accent[500]};
          color: ${color.textInverse};
          border: none;
          &:hover:not(:disabled) { background: ${accent[600]}; }
        `;
      case 'danger':
        return `
          background: ${semantic.errorLight};
          color: ${semantic.errorDark};
          border: 1px solid ${semantic.errorLight};
          &:hover:not(:disabled) { background: ${semantic.errorLight}; opacity: 0.9; }
        `;
      default:
        return `
          background: ${color.bg};
          color: ${neutral[500]};
          border: 1px solid ${neutral[200]};
          &:hover:not(:disabled) { border-color: ${accent[500]}; color: ${accent[600]}; }
        `;
    }
  }}

  &:focus-visible { ${focusRingStyle} }
  &:disabled { opacity: 0.45; cursor: not-allowed; transform: none !important; }
  svg { width: 16px; height: 16px; }
`;

const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: ${space[5]};
  margin-bottom: ${space[5]};

  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${space[3]};
  margin-bottom: ${space[5]};
`;

const MetaChip = styled.div`
  background: ${neutral[50]};
  border-radius: ${radius.lg};
  padding: ${space[3]} ${space[4]};
`;

const MetaLabel = styled.div`
  font-size: ${t.captionSm.size};
  font-weight: ${t.captionSm.weight};
  color: ${color.textMuted};
  margin-bottom: ${space[0.5]};
`;

const MetaValue = styled.div`
  font-size: ${t.bodySm.size};
  font-weight: 500;
  color: ${color.text};
`;

const CardHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${space[3]} ${space[4]};
  border-bottom: ${borderTokens.default};
  background: ${neutral[50]};
  border-radius: ${radius.xl} ${radius.xl} 0 0;
`;

const CardBody = styled.div`
  padding: ${space[3]} ${space[4]};
`;

const CardWrapper = styled.div`
  background: ${color.bg};
  border: ${borderTokens.default};
  border-radius: ${radius.xl};
  overflow: hidden;
  box-shadow: ${shadow.card};
`;

const ItemRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${space[3]} 0;
  border-bottom: 1px solid ${neutral[100]};
  &:last-child { border-bottom: none; }
`;

const ItemInfo = styled.div`
  flex: 1; min-width: 0;
`;

const ItemName = styled.div`
  font-size: ${t.bodySm.size};
  font-weight: 500;
  color: ${color.text};
  margin-bottom: ${space[0.5]};
`;

const ItemMeta = styled.div`
  font-size: ${t.captionSm.size};
  color: ${color.textMuted};
  display: flex; gap: ${space[2]}; align-items: center;
`;

const ApprovalRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${space[3]} 0;
  border-bottom: 1px solid ${neutral[100]};
  &:last-child { border-bottom: none; }
`;

const ApprovalInfo = styled.div`
  display: flex; align-items: center; gap: ${space[2.5]};
`;

const ApprovalIcon = styled.div<{ $status: 'pending' | 'approved' | 'rejected' }>`
  width: 32px; height: 32px;
  border-radius: ${radius.md};
  display: grid; place-items: center;

  ${({ $status }) => {
    switch ($status) {
      case 'approved': return `background: ${semantic.successLight}; color: ${semantic.successDark};`;
      case 'rejected': return `background: ${semantic.errorLight}; color: ${semantic.errorDark};`;
      default: return `background: ${semantic.warningLight}; color: ${semantic.warningDark};`;
    }
  }}
  svg { width: 16px; height: 16px; }
`;

const SmallButton = styled.button<{ $variant?: 'approve' | 'reject' }>`
  padding: ${space[1.5]} ${space[3]};
  border-radius: ${radius.md};
  font-size: ${t.captionSm.size};
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background ${transition.fast};

  ${({ $variant }) => {
    switch ($variant) {
      case 'approve': return `background: ${semantic.successLight}; color: ${semantic.successDark}; &:hover { filter: brightness(0.95); }`;
      case 'reject': return `background: ${semantic.errorLight}; color: ${semantic.errorDark}; &:hover { filter: brightness(0.95); }`;
      default: return `background: ${neutral[100]}; color: ${neutral[500]};`;
    }
  }}

  &:focus-visible { ${focusRingStyle} }
`;

const EmptyText = styled.div`
  text-align: center;
  padding: ${space[10]} ${space[5]};
  color: ${color.textMuted};
  font-size: ${t.bodySm.size};
`;

// ════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════

const statusIcon = (status: ChangeSetStatus) => {
  switch (status) {
    case 'draft': return <ClockIcon />;
    case 'ready_for_review': return <PaperAirplaneIcon />;
    case 'approved': return <CheckCircleIcon />;
    case 'filed': return <DocumentCheckIcon />;
    case 'published': return <CheckCircleIcon />;
    case 'rejected': return <XCircleIcon />;
    default: return <ClockIcon />;
  }
};

const approvalIcon = (s: 'pending' | 'approved' | 'rejected') => {
  switch (s) {
    case 'approved': return <CheckCircleIcon />;
    case 'rejected': return <XCircleIcon />;
    default: return <ClockIcon />;
  }
};

const fmtDate = (date: Date | { toDate: () => Date } | undefined) => {
  if (!date) return 'Unknown';
  const d = typeof date === 'object' && 'toDate' in date ? date.toDate() : new Date(date as unknown as string);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

// ════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════

const ChangeSetDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { changeSetId } = useParams<{ changeSetId: string }>();
  const { currentOrgId, role, loading: roleLoading } = useRoleContext();

  const [changeSet, setChangeSet] = useState<ChangeSet | null>(null);
  const [items, setItems] = useState<ChangeSetItem[]>([]);
  const [approvals, setApprovals] = useState<ChangeSetApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load ──
  useEffect(() => {
    if (!currentOrgId || !changeSetId || roleLoading) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const [cs, itms, approvs] = await Promise.all([
          getChangeSet(currentOrgId, changeSetId),
          getChangeSetItems(currentOrgId, changeSetId),
          getChangeSetApprovals(currentOrgId, changeSetId),
        ]);
        setChangeSet(cs);
        setItems(itms);
        setApprovals(approvs);
      } catch (err) {
        logger.error(LOG_CATEGORIES.ERROR, 'Failed to load change set', { changeSetId }, err as Error);
        setError('Failed to load change set');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentOrgId, changeSetId, roleLoading]);

  // ── Derived state ──
  const requiredApprovalRoles = getRequiredApprovals(items);
  const allApprovalsComplete = areAllApprovalsComplete(requiredApprovalRoles, approvals);
  const isDraft = changeSet?.status === 'draft';
  const isInReview = changeSet?.status === 'ready_for_review';
  const isApproved = changeSet?.status === 'approved';
  const canPublish = isApproved && allApprovalsComplete;

  // ── Actions ──
  const handleSubmitForReview = useCallback(async () => {
    if (!currentOrgId || !changeSetId) return;
    setActionLoading(true);
    try {
      await submitForReview(currentOrgId, changeSetId);
      setChangeSet(prev => prev ? { ...prev, status: 'ready_for_review' } : null);
    } catch { setError('Failed to submit for review'); }
    finally { setActionLoading(false); }
  }, [currentOrgId, changeSetId]);

  const handleReturnToDraft = useCallback(async () => {
    if (!currentOrgId || !changeSetId) return;
    setActionLoading(true);
    try {
      await returnToDraft(currentOrgId, changeSetId);
      setChangeSet(prev => prev ? { ...prev, status: 'draft' } : null);
    } catch { setError('Failed to return to draft'); }
    finally { setActionLoading(false); }
  }, [currentOrgId, changeSetId]);

  const handlePublish = useCallback(async () => {
    if (!currentOrgId || !changeSetId) return;
    setActionLoading(true);
    try {
      await publishChangeSet(currentOrgId, changeSetId);
      setChangeSet(prev => prev ? { ...prev, status: 'published' } : null);
    } catch { setError('Failed to publish'); }
    finally { setActionLoading(false); }
  }, [currentOrgId, changeSetId]);

  const handleApprove = useCallback(async (approvalRole: ApprovalRoleRequired) => {
    if (!currentOrgId || !changeSetId) return;
    setActionLoading(true);
    try {
      await approveChangeSet(currentOrgId, changeSetId, approvalRole);
      const newApprovals = await getChangeSetApprovals(currentOrgId, changeSetId);
      setApprovals(newApprovals);
    } catch { setError('Failed to approve'); }
    finally { setActionLoading(false); }
  }, [currentOrgId, changeSetId]);

  const handleRemoveItem = useCallback(async (itemId: string) => {
    if (!currentOrgId || !changeSetId) return;
    setActionLoading(true);
    try {
      await removeItemFromChangeSet(currentOrgId, changeSetId, itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch { setError('Failed to remove item'); }
    finally { setActionLoading(false); }
  }, [currentOrgId, changeSetId]);

  // ── Loading / empty states ──
  if (roleLoading || loading) {
    return (
      <PageShell>
        <MainNavigation />
        <PageBody>
          <LoadingSpinner />
        </PageBody>
      </PageShell>
    );
  }

  if (!changeSet) {
    return (
      <PageShell>
        <MainNavigation />
        <PageBody>
          <Container>
            <DSBackButton onClick={() => navigate('/changesets')} aria-label="Back to change sets">
              <ArrowLeftIcon />
            </DSBackButton>
            <EmptyText>Change set not found</EmptyText>
          </Container>
        </PageBody>
      </PageShell>
    );
  }

  const cfg = CHANGESET_STATUS_CONFIG[changeSet.status];

  return (
    <PageShell>
      <MainNavigation />
      <PageBody>
        <Container>
          {/* ── Back ── */}
          <div style={{ marginBottom: space[4] }}>
            <DSBackButton onClick={() => navigate('/changesets')} aria-label="Back to change sets">
              <ArrowLeftIcon />
            </DSBackButton>
          </div>

          {/* ── Header ── */}
          <PageHeader>
            <PageHeaderLeft>
              <div>
                <PageTitle>{changeSet.name}</PageTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: space[2], marginTop: space[2] }}>
                  <Badge $variant={statusToBadge(changeSet.status)} $dot>
                    {cfg.label}
                  </Badge>
                  {changeSet.targetEffectiveStart && (
                    <Badge $variant="neutral" $size="sm">
                      Effective: {changeSet.targetEffectiveStart}
                    </Badge>
                  )}
                </div>
              </div>
            </PageHeaderLeft>

            <PageHeaderRight>
              {isDraft && items.length > 0 && (
                <ActionButton $variant="primary" onClick={handleSubmitForReview} disabled={actionLoading}>
                  <PaperAirplaneIcon /> Submit for Review
                </ActionButton>
              )}
              {isInReview && (
                <ActionButton onClick={handleReturnToDraft} disabled={actionLoading}>
                  <ArrowLeftIcon /> Return to Draft
                </ActionButton>
              )}
              {canPublish && (
                <ActionButton $variant="primary" onClick={handlePublish} disabled={actionLoading}>
                  <PlayIcon /> Publish All
                </ActionButton>
              )}
            </PageHeaderRight>
          </PageHeader>

          {/* ── Error banner ── */}
          {error && (
            <div style={{ marginBottom: space[4] }}>
              <Banner $variant="error">
                <XCircleIcon />
                {error}
              </Banner>
            </div>
          )}

          {/* ── Meta chips ── */}
          <MetaGrid>
            <MetaChip>
              <MetaLabel>Created</MetaLabel>
              <MetaValue>{fmtDate(changeSet.createdAt)}</MetaValue>
            </MetaChip>
            <MetaChip>
              <MetaLabel>Items</MetaLabel>
              <MetaValue>{items.length}</MetaValue>
            </MetaChip>
            {changeSet.description && (
              <MetaChip style={{ gridColumn: 'span 2' }}>
                <MetaLabel>Description</MetaLabel>
                <MetaValue>{changeSet.description}</MetaValue>
              </MetaChip>
            )}
          </MetaGrid>

          {/* ── Items + Approvals ── */}
          <SectionGrid>
            {/* Items */}
            <CardWrapper>
              <CardHead>
                <SectionTitle style={{ margin: 0 }}>
                  <ClipboardDocumentListIcon /> Items ({items.length})
                </SectionTitle>
              </CardHead>
              <CardBody>
                {items.length === 0 ? (
                  <EmptyText>No items in this change set yet</EmptyText>
                ) : (
                  items.map(item => {
                    const ac = CHANGESET_ITEM_ACTION_CONFIG[item.action];
                    return (
                      <ItemRow key={item.id}>
                        <ItemInfo>
                          <ItemName>{item.artifactName || item.artifactId}</ItemName>
                          <ItemMeta>
                            <span>{item.artifactType}</span>
                            <Badge
                              $variant={
                                ac.color === '#10B981' ? 'success' :
                                ac.color === '#3B82F6' ? 'info' :
                                ac.color === '#F59E0B' ? 'warning' :
                                ac.color === '#EF4444' ? 'error' : 'neutral'
                              }
                              $size="sm"
                            >
                              {ac.label}
                            </Badge>
                          </ItemMeta>
                        </ItemInfo>
                        {isDraft && (
                          <IconBtn $variant="danger" $size="sm" onClick={() => handleRemoveItem(item.id)} disabled={actionLoading} aria-label={`Remove ${item.artifactName || item.artifactId}`}>
                            <TrashIcon />
                          </IconBtn>
                        )}
                      </ItemRow>
                    );
                  })
                )}
              </CardBody>
            </CardWrapper>

            {/* Approvals */}
            <CardWrapper>
              <CardHead>
                <SectionTitle style={{ margin: 0 }}>
                  <UserGroupIcon /> Approvals
                </SectionTitle>
              </CardHead>
              <CardBody>
                {requiredApprovalRoles.length === 0 ? (
                  <EmptyText>No approvals required</EmptyText>
                ) : (
                  requiredApprovalRoles.map(requiredRole => {
                    const approval = approvals.find(a => a.roleRequired === requiredRole);
                    const status = approval?.status || 'pending';
                    const canApproveThis = isInReview && role === requiredRole && status === 'pending';

                    return (
                      <ApprovalRow key={requiredRole}>
                        <ApprovalInfo>
                          <ApprovalIcon $status={status}>
                            {approvalIcon(status)}
                          </ApprovalIcon>
                          <div>
                            <div style={{ fontSize: t.bodySm.size, fontWeight: 500, color: color.text, textTransform: 'capitalize' as const }}>
                              {requiredRole.replace('_', ' ')}
                            </div>
                            <div style={{ fontSize: t.captionSm.size, color: color.textMuted }}>
                              {status === 'approved' && approval?.approverName && `Approved by ${approval.approverName}`}
                              {status === 'pending' && 'Awaiting approval'}
                              {status === 'rejected' && 'Rejected'}
                            </div>
                          </div>
                        </ApprovalInfo>
                        {canApproveThis && (
                          <SmallButton $variant="approve" onClick={() => handleApprove(requiredRole)} disabled={actionLoading}>
                            Approve
                          </SmallButton>
                        )}
                      </ApprovalRow>
                    );
                  })
                )}
              </CardBody>
            </CardWrapper>
          </SectionGrid>

          {/* ── Tasks Panel (blockers & linked tasks) ── */}
          {changeSetId && currentOrgId && (
            <div style={{ marginBottom: space[4] }}>
              <TaskPanel orgId={currentOrgId} changeSetId={changeSetId} />
            </div>
          )}

          {/* ── QA Gate ── */}
          {changeSetId && changeSet && (
            <div style={{ marginBottom: space[4] }}>
              <QAGatePanel
                changeSetId={changeSetId}
                changeSetStatus={changeSet.status}
              />
            </div>
          )}

          {/* ── Filing Packages ── */}
          {changeSetId && currentOrgId && (
            <div style={{ marginBottom: space[4] }}>
              <FilingTab orgId={currentOrgId} changeSetId={changeSetId} />
            </div>
          )}

          {/* ── Audit History ── */}
          {/* Discussion */}
          {changeSetId && currentOrgId && (
            <DiscussionPanel
              orgId={currentOrgId}
              target={{ type: 'changeset', artifactId: changeSetId, changeSetId } as TargetRef}
              title={`Discussion — ${changeSet?.name || 'Change Set'}`}
            />
          )}

          <Divider />

          <CardWrapper>
            <CardHead>
              <SectionTitle style={{ margin: 0 }}>
                <QueueListIcon /> Audit History
              </SectionTitle>
            </CardHead>
            <CardBody>
              <AuditTimeline changeSetId={changeSetId} maxEntries={30} />
            </CardBody>
          </CardWrapper>
        </Container>
      </PageBody>
    </PageShell>
  );
};

export default ChangeSetDetailPage;
