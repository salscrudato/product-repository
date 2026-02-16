/**
 * TableVersionCompare
 * 
 * Compares two table versions with cell-level diff visualization.
 * Shows:
 * - Added cells (green)
 * - Removed cells (red)
 * - Modified cells (yellow) with before/after values
 * - Summary statistics
 */

import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { compareVersions } from '../../services/tableService';
import type { TableVersion, TableVersionDiff } from '../../types/table';

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  padding: 24px;
  background: ${({ theme }) => theme.colours?.background || '#fff'};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colours?.border || '#e5e7eb'};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const Title = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const VersionSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`;

const Arrow = styled.span`
  font-size: 20px;
  color: #6b7280;
`;

const SummaryBar = styled.div`
  display: flex;
  gap: 16px;
  padding: 12px 16px;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 20px;
`;

const SummaryItem = styled.div<{ $type: 'added' | 'removed' | 'modified' | 'unchanged' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ $type }) => 
    $type === 'added' ? '#059669' :
    $type === 'removed' ? '#dc2626' :
    $type === 'modified' ? '#d97706' : '#6b7280'};
`;

const SummaryDot = styled.div<{ $type: 'added' | 'removed' | 'modified' | 'unchanged' }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $type }) => 
    $type === 'added' ? '#10b981' :
    $type === 'removed' ? '#ef4444' :
    $type === 'modified' ? '#f59e0b' : '#9ca3af'};
`;

const DiffGrid = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: auto;
  max-height: 500px;
`;

const DiffTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const DiffTh = styled.th`
  background: #f8fafc;
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
  border-bottom: 1px solid #e5e7eb;
  color: #374151;
  position: sticky;
  top: 0;
  z-index: 1;
`;

const DiffTd = styled.td<{ $type?: 'added' | 'removed' | 'modified' }>`
  padding: 8px 12px;
  border-bottom: 1px solid #f3f4f6;
  background: ${({ $type }) => 
    $type === 'added' ? '#ecfdf5' :
    $type === 'removed' ? '#fef2f2' :
    $type === 'modified' ? '#fffbeb' : 'transparent'};
`;

const CellKey = styled.span`
  font-family: monospace;
  font-size: 12px;
  color: #6b7280;
`;

const ValueChange = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const OldValue = styled.span`
  text-decoration: line-through;
  color: #dc2626;
`;

const NewValue = styled.span`
  color: #059669;
  font-weight: 500;
`;

const NoChanges = styled.div`
  padding: 40px;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
`;

const LoadingState = styled.div`
  padding: 40px;
  text-align: center;
  color: #6b7280;
`;

const CloseButton = styled.button`
  padding: 8px 16px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background: #f9fafb;
  }
`;

// ============================================================================
// Types
// ============================================================================

interface TableVersionCompareProps {
  orgId: string;
  tableId: string;
  versions: TableVersion[];
  initialSourceId?: string;
  initialTargetId?: string;
  onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const TableVersionCompare: React.FC<TableVersionCompareProps> = ({
  orgId,
  tableId,
  versions,
  initialSourceId,
  initialTargetId,
  onClose,
}) => {
  const [sourceVersionId, setSourceVersionId] = useState<string>(
    initialSourceId || (versions.length > 1 ? versions[1].id : '')
  );
  const [targetVersionId, setTargetVersionId] = useState<string>(
    initialTargetId || (versions.length > 0 ? versions[0].id : '')
  );
  const [diff, setDiff] = useState<TableVersionDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load diff when versions change
  useEffect(() => {
    if (!sourceVersionId || !targetVersionId || sourceVersionId === targetVersionId) {
      setDiff(null);
      return;
    }

    setLoading(true);
    setError(null);

    compareVersions(orgId, tableId, sourceVersionId, targetVersionId)
      .then(result => {
        setDiff(result);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [orgId, tableId, sourceVersionId, targetVersionId]);

  // Sort versions by version number
  const sortedVersions = useMemo(() =>
    [...versions].sort((a, b) => b.versionNumber - a.versionNumber),
    [versions]
  );

  // Compute diff entries for display
  const diffEntries = useMemo(() => {
    if (!diff) return [];

    const entries: Array<{
      key: string;
      type: 'added' | 'removed' | 'modified';
      oldValue?: number | null;
      newValue?: number | null;
    }> = [];

    // Added
    for (const [key, cell] of Object.entries(diff.added)) {
      entries.push({ key, type: 'added', newValue: cell.value });
    }

    // Removed
    for (const [key, cell] of Object.entries(diff.removed)) {
      entries.push({ key, type: 'removed', oldValue: cell.value });
    }

    // Modified
    for (const [key, { before, after }] of Object.entries(diff.modified)) {
      entries.push({
        key,
        type: 'modified',
        oldValue: before.value,
        newValue: after.value
      });
    }

    // Sort by key
    return entries.sort((a, b) => a.key.localeCompare(b.key));
  }, [diff]);

  const hasChanges = diffEntries.length > 0;

  return (
    <Container>
      <Header>
        <Title>Compare Versions</Title>
        <CloseButton onClick={onClose}>Close</CloseButton>
      </Header>

      <VersionSelector>
        <Select
          value={sourceVersionId}
          onChange={(e) => setSourceVersionId(e.target.value)}
        >
          <option value="">Select source version</option>
          {sortedVersions.map(v => (
            <option key={v.id} value={v.id}>
              v{v.versionNumber} ({v.status})
            </option>
          ))}
        </Select>

        <Arrow>→</Arrow>

        <Select
          value={targetVersionId}
          onChange={(e) => setTargetVersionId(e.target.value)}
        >
          <option value="">Select target version</option>
          {sortedVersions.map(v => (
            <option key={v.id} value={v.id}>
              v{v.versionNumber} ({v.status})
            </option>
          ))}
        </Select>
      </VersionSelector>

      {diff && (
        <SummaryBar>
          <SummaryItem $type="added">
            <SummaryDot $type="added" />
            {diff.summary.addedCount} added
          </SummaryItem>
          <SummaryItem $type="removed">
            <SummaryDot $type="removed" />
            {diff.summary.removedCount} removed
          </SummaryItem>
          <SummaryItem $type="modified">
            <SummaryDot $type="modified" />
            {diff.summary.modifiedCount} modified
          </SummaryItem>
          <SummaryItem $type="unchanged">
            <SummaryDot $type="unchanged" />
            {diff.summary.unchangedCount} unchanged
          </SummaryItem>
        </SummaryBar>
      )}

      {loading && (
        <LoadingState>Loading comparison...</LoadingState>
      )}

      {error && (
        <NoChanges style={{ color: '#dc2626' }}>
          Error: {error}
        </NoChanges>
      )}

      {!loading && !error && sourceVersionId === targetVersionId && (
        <NoChanges>
          Select two different versions to compare
        </NoChanges>
      )}

      {!loading && !error && diff && !hasChanges && (
        <NoChanges>
          ✓ No differences between versions
        </NoChanges>
      )}

      {!loading && !error && hasChanges && (
        <DiffGrid>
          <DiffTable>
            <thead>
              <tr>
                <DiffTh>Cell</DiffTh>
                <DiffTh>Change</DiffTh>
                <DiffTh>Value</DiffTh>
              </tr>
            </thead>
            <tbody>
              {diffEntries.map(entry => (
                <tr key={entry.key}>
                  <DiffTd $type={entry.type}>
                    <CellKey>{entry.key}</CellKey>
                  </DiffTd>
                  <DiffTd $type={entry.type}>
                    {entry.type === 'added' && '+ Added'}
                    {entry.type === 'removed' && '− Removed'}
                    {entry.type === 'modified' && '~ Modified'}
                  </DiffTd>
                  <DiffTd $type={entry.type}>
                    {entry.type === 'added' && (
                      <NewValue>{entry.newValue ?? '(empty)'}</NewValue>
                    )}
                    {entry.type === 'removed' && (
                      <OldValue>{entry.oldValue ?? '(empty)'}</OldValue>
                    )}
                    {entry.type === 'modified' && (
                      <ValueChange>
                        <OldValue>{entry.oldValue ?? '(empty)'}</OldValue>
                        <Arrow>→</Arrow>
                        <NewValue>{entry.newValue ?? '(empty)'}</NewValue>
                      </ValueChange>
                    )}
                  </DiffTd>
                </tr>
              ))}
            </tbody>
          </DiffTable>
        </DiffGrid>
      )}
    </Container>
  );
};

export default TableVersionCompare;

