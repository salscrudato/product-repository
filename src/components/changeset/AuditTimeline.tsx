/**
 * AuditTimeline - Reusable audit history timeline component
 * Shows audit log entries for an entity or changeset with visual timeline.
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusCircleIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  DocumentCheckIcon,
  ArrowsPointingOutIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { AuditLogEntry, AuditLogAction } from '../../types/changeSet';
import {
  getAuditLogForEntity,
  getAuditLogForChangeSet,
  subscribeToAuditLog,
} from '../../services/changeSetService';
import { useRoleContext } from '../../context/RoleContext';

// ============ Types ============
interface AuditTimelineProps {
  entityType?: string;
  entityId?: string;
  changeSetId?: string;
  maxEntries?: number;
  realtime?: boolean;
  compact?: boolean;
}

// ============ Animations ============
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ============ Styled Components ============
const TimelineContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const TimelineItem = styled.div<{ $compact?: boolean }>`
  display: flex;
  gap: ${({ $compact }) => $compact ? '10px' : '14px'};
  padding: ${({ $compact }) => $compact ? '8px 0' : '12px 0'};
  position: relative;
  animation: ${fadeIn} 0.2s ease;
  
  &:not(:last-child)::after {
    content: '';
    position: absolute;
    left: ${({ $compact }) => $compact ? '11px' : '15px'};
    top: ${({ $compact }) => $compact ? '30px' : '40px'};
    bottom: 0;
    width: 2px;
    background: linear-gradient(to bottom, #e2e8f0, transparent);
  }
`;

const IconWrapper = styled.div<{ $color: string }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => `${$color}15`};
  color: ${({ $color }) => $color};
  flex-shrink: 0;
  
  svg { width: 14px; height: 14px; }
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const ActionText = styled.div<{ $compact?: boolean }>`
  font-size: ${({ $compact }) => $compact ? '12px' : '13px'};
  color: #1e293b;
  font-weight: 500;
  margin-bottom: 2px;
`;

const ActorText = styled.span`
  font-weight: 600;
  color: #6366f1;
`;

const EntityText = styled.span`
  font-weight: 500;
  color: #64748b;
`;

const MetaRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  color: #94a3b8;
`;

const Timestamp = styled.span``;

const DiffToggle = styled.button`
  background: none;
  border: none;
  color: #6366f1;
  font-size: 11px;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 3px;
  
  &:hover { text-decoration: underline; }
  svg { width: 12px; height: 12px; }
`;

const DiffPanel = styled.div`
  margin-top: 8px;
  padding: 10px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  font-size: 11px;
`;

const DiffRow = styled.div`
  display: flex;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid #f1f5f9;
  
  &:last-child { border-bottom: none; }
`;

const DiffField = styled.span`
  font-weight: 600;
  color: #475569;
  min-width: 100px;
`;

const DiffOldValue = styled.span`
  color: #dc2626;
  text-decoration: line-through;
`;

const DiffNewValue = styled.span`
  color: #16a34a;
`;

const LoadingText = styled.div`
  color: #94a3b8;
  font-size: 13px;
  padding: 16px 0;
  text-align: center;
`;

const EmptyText = styled.div`
  color: #94a3b8;
  font-size: 13px;
  padding: 16px 0;
  text-align: center;
`;

// ============ Helpers ============
const ACTION_CONFIG: Record<AuditLogAction, { label: string; color: string; icon: React.ReactNode }> = {
  CREATE: { label: 'created', color: '#16a34a', icon: <PlusCircleIcon /> },
  UPDATE: { label: 'updated', color: '#6366f1', icon: <PencilSquareIcon /> },
  DELETE: { label: 'deleted', color: '#dc2626', icon: <TrashIcon /> },
  ARCHIVE: { label: 'archived', color: '#64748b', icon: <TrashIcon /> },
  APPROVE: { label: 'approved', color: '#16a34a', icon: <CheckCircleIcon /> },
  REJECT: { label: 'rejected', color: '#dc2626', icon: <XCircleIcon /> },
  PUBLISH: { label: 'published', color: '#059669', icon: <DocumentCheckIcon /> },
  FILE: { label: 'filed', color: '#0891b2', icon: <DocumentCheckIcon /> },
  ADD_TO_CHANGESET: { label: 'added to change set', color: '#6366f1', icon: <PlusCircleIcon /> },
  REMOVE_FROM_CHANGESET: { label: 'removed from change set', color: '#f59e0b', icon: <TrashIcon /> },
  SUBMIT_FOR_REVIEW: { label: 'submitted for review', color: '#8b5cf6', icon: <PaperAirplaneIcon /> },
  RETURN_TO_DRAFT: { label: 'returned to draft', color: '#f59e0b', icon: <ArrowPathIcon /> },
};

const formatTimestamp = (timestamp: { toDate?: () => Date } | Date | undefined): string => {
  if (!timestamp) return 'Unknown';
  const date = typeof timestamp === 'object' && 'toDate' in timestamp && timestamp.toDate
    ? timestamp.toDate()
    : new Date(timestamp as unknown as string);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ============ Component ============
const AuditTimeline: React.FC<AuditTimelineProps> = ({
  entityType,
  entityId,
  changeSetId,
  maxEntries = 20,
  realtime = false,
  compact = false,
}) => {
  const { currentOrgId } = useRoleContext();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDiff, setExpandedDiff] = useState<string | null>(null);

  // Load or subscribe to audit entries
  useEffect(() => {
    if (!currentOrgId) {
      setLoading(false);
      return;
    }

    if (realtime) {
      // Real-time subscription
      const unsubscribe = subscribeToAuditLog(currentOrgId, setEntries, {
        entityType,
        entityId,
        changeSetId,
      });
      setLoading(false);
      return () => unsubscribe();
    } else {
      // One-time fetch
      const fetchEntries = async () => {
        setLoading(true);
        try {
          let data: AuditLogEntry[];
          if (changeSetId) {
            data = await getAuditLogForChangeSet(currentOrgId, changeSetId);
          } else if (entityType && entityId) {
            data = await getAuditLogForEntity(currentOrgId, entityType, entityId, maxEntries);
          } else {
            data = [];
          }
          setEntries(data.slice(0, maxEntries));
        } catch (err) {
          console.error('Failed to fetch audit log:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchEntries();
    }
  }, [currentOrgId, entityType, entityId, changeSetId, maxEntries, realtime]);

  const toggleDiff = useCallback((id: string) => {
    setExpandedDiff(prev => (prev === id ? null : id));
  }, []);

  if (loading) {
    return <LoadingText>Loading audit history...</LoadingText>;
  }

  if (entries.length === 0) {
    return <EmptyText>No audit history available</EmptyText>;
  }

  return (
    <TimelineContainer>
      {entries.map((entry) => {
        const config = ACTION_CONFIG[entry.action] || { label: entry.action.toLowerCase(), color: '#64748b', icon: <ClockIcon /> };
        const hasDiff = entry.diff && entry.diff.length > 0;
        const isExpanded = expandedDiff === entry.id;

        return (
          <TimelineItem key={entry.id} $compact={compact}>
            <IconWrapper $color={config.color}>{config.icon}</IconWrapper>
            <Content>
              <ActionText $compact={compact}>
                <ActorText>{entry.actorName || entry.actorEmail || 'Unknown'}</ActorText>
                {' '}{config.label}{' '}
                {entry.entityName && <EntityText>{entry.entityName}</EntityText>}
              </ActionText>
              <MetaRow>
                <Timestamp>{formatTimestamp(entry.createdAt)}</Timestamp>
                {hasDiff && (
                  <DiffToggle onClick={() => toggleDiff(entry.id)}>
                    <ArrowsPointingOutIcon />
                    {isExpanded ? 'Hide changes' : 'Show changes'}
                  </DiffToggle>
                )}
              </MetaRow>
              {isExpanded && entry.diff && (
                <DiffPanel>
                  {entry.diff.map((d, i) => (
                    <DiffRow key={i}>
                      <DiffField>{d.field}:</DiffField>
                      <DiffOldValue>{JSON.stringify(d.oldValue)}</DiffOldValue>
                      <span>→</span>
                      <DiffNewValue>{JSON.stringify(d.newValue)}</DiffNewValue>
                    </DiffRow>
                  ))}
                </DiffPanel>
              )}
            </Content>
          </TimelineItem>
        );
      })}
    </TimelineContainer>
  );
};

export default AuditTimeline;

