import React from 'react';
import styled from 'styled-components';
import { CoverageVersion } from '../../types';
import { Timestamp } from 'firebase/firestore';
import { ClockIcon, CheckCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface VersionHistoryTimelineProps {
  versions: CoverageVersion[];
  onVersionClick?: (version: CoverageVersion) => void;
  activeVersionId?: string;
}

export const VersionHistoryTimeline: React.FC<VersionHistoryTimelineProps> = ({
  versions,
  onVersionClick,
  activeVersionId,
}) => {
  const formatDate = (date: Date | Timestamp) => {
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isActive = (version: CoverageVersion) => {
    const now = new Date();
    const effectiveDate = version.effectiveDate instanceof Timestamp 
      ? version.effectiveDate.toDate() 
      : new Date(version.effectiveDate);
    const expirationDate = version.expirationDate 
      ? (version.expirationDate instanceof Timestamp 
        ? version.expirationDate.toDate() 
        : new Date(version.expirationDate))
      : null;

    const isEffective = effectiveDate <= now;
    const notExpired = !expirationDate || expirationDate > now;

    return isEffective && notExpired;
  };

  if (versions.length === 0) {
    return (
      <EmptyState>
        <DocumentTextIcon width={48} height={48} />
        <EmptyStateText>No version history available</EmptyStateText>
      </EmptyState>
    );
  }

  return (
    <TimelineContainer>
      <TimelineTitle>Version History</TimelineTitle>
      <Timeline>
        {versions.map((version, index) => {
          const active = isActive(version);
          const selected = version.id === activeVersionId;
          
          return (
            <TimelineItem 
              key={version.id}
              onClick={() => onVersionClick?.(version)}
              $selected={selected}
              $clickable={!!onVersionClick}
            >
              <TimelineMarker $active={active} $selected={selected}>
                {active ? (
                  <CheckCircleIcon width={20} height={20} />
                ) : (
                  <ClockIcon width={20} height={20} />
                )}
              </TimelineMarker>
              
              {index < versions.length - 1 && <TimelineLine />}
              
              <TimelineContent>
                <VersionHeader>
                  <VersionNumber $active={active}>
                    Version {version.versionNumber}
                    {active && <ActiveBadge>Active</ActiveBadge>}
                  </VersionNumber>
                  <VersionDate>{formatDate(version.effectiveDate)}</VersionDate>
                </VersionHeader>
                
                {version.changes && (
                  <VersionChanges>{version.changes}</VersionChanges>
                )}
                
                <VersionMeta>
                  {version.changedBy && (
                    <MetaItem>
                      <MetaLabel>Changed by:</MetaLabel>
                      <MetaValue>{version.changedBy}</MetaValue>
                    </MetaItem>
                  )}
                  {version.approvedBy && (
                    <MetaItem>
                      <MetaLabel>Approved by:</MetaLabel>
                      <MetaValue>{version.approvedBy}</MetaValue>
                    </MetaItem>
                  )}
                  {version.regulatoryFilingNumber && (
                    <MetaItem>
                      <MetaLabel>Filing #:</MetaLabel>
                      <MetaValue>{version.regulatoryFilingNumber}</MetaValue>
                    </MetaItem>
                  )}
                </VersionMeta>
                
                {version.stateApprovals && version.stateApprovals.length > 0 && (
                  <StateApprovals>
                    <StateApprovalsLabel>Approved in:</StateApprovalsLabel>
                    <StateList>
                      {version.stateApprovals.map((state, idx) => (
                        <StateChip key={idx}>{state}</StateChip>
                      ))}
                    </StateList>
                  </StateApprovals>
                )}
                
                {version.expirationDate && (
                  <ExpirationNotice>
                    Expires: {formatDate(version.expirationDate)}
                  </ExpirationNotice>
                )}
              </TimelineContent>
            </TimelineItem>
          );
        })}
      </Timeline>
    </TimelineContainer>
  );
};

const TimelineContainer = styled.div`
  padding: 24px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`;

const TimelineTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 24px 0;
`;

const Timeline = styled.div`
  position: relative;
`;

const TimelineItem = styled.div<{ $selected?: boolean; $clickable?: boolean }>`
  position: relative;
  display: flex;
  gap: 16px;
  padding: 16px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: ${({ $selected }) => $selected ? '#f0f9ff' : 'transparent'};
  border: 2px solid ${({ $selected }) => $selected ? '#3b82f6' : 'transparent'};
  cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  transition: all 0.2s;

  &:hover {
    background: ${({ $clickable, $selected }) => 
      $clickable ? ($selected ? '#e0f2fe' : '#f9fafb') : 'transparent'};
  }
`;

const TimelineMarker = styled.div<{ $active?: boolean; $selected?: boolean }>`
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $active, $selected }) => 
    $selected ? '#3b82f6' : ($active ? '#22c55e' : '#e5e7eb')};
  color: ${({ $active, $selected }) => 
    $selected || $active ? 'white' : '#6b7280'};
  z-index: 2;
`;

const TimelineLine = styled.div`
  position: absolute;
  left: 35px;
  top: 56px;
  bottom: -8px;
  width: 2px;
  background: #e5e7eb;
  z-index: 1;
`;

const TimelineContent = styled.div`
  flex: 1;
  padding-top: 4px;
`;

const VersionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const VersionNumber = styled.div<{ $active?: boolean }>`
  font-size: 16px;
  font-weight: 600;
  color: ${({ $active }) => $active ? '#22c55e' : '#111827'};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ActiveBadge = styled.span`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  background: #dcfce7;
  color: #166534;
  border: 1px solid #22c55e;
`;

const VersionDate = styled.div`
  font-size: 14px;
  color: #6b7280;
`;

const VersionChanges = styled.div`
  font-size: 14px;
  color: #374151;
  margin-bottom: 12px;
  line-height: 1.5;
`;

const VersionMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 8px;
`;

const MetaItem = styled.div`
  display: flex;
  gap: 4px;
  font-size: 13px;
`;

const MetaLabel = styled.span`
  color: #6b7280;
`;

const MetaValue = styled.span`
  color: #111827;
  font-weight: 500;
`;

const StateApprovals = styled.div`
  margin-top: 12px;
`;

const StateApprovalsLabel = styled.div`
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 6px;
  font-weight: 500;
`;

const StateList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const StateChip = styled.span`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #3b82f6;
`;

const ExpirationNotice = styled.div`
  margin-top: 8px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fbbf24;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: #9ca3af;
  
  svg {
    margin-bottom: 16px;
  }
`;

const EmptyStateText = styled.div`
  font-size: 14px;
  color: #6b7280;
`;

