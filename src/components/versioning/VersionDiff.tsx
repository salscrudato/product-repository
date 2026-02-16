/**
 * VersionDiff Component
 * Shows field-level differences between two versions
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import {
  PlusCircleIcon,
  MinusCircleIcon,
  ArrowsRightLeftIcon,
  CodeBracketIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { VersionDiff as VersionDiffType, VersionComparisonResult } from '@/types/versioning';
import { colors } from '@/components/common/DesignSystem';

// ============================================================================
// Types
// ============================================================================

interface VersionDiffProps {
  comparison: VersionComparisonResult;
  leftLabel?: string;
  rightLabel?: string;
}

type ViewMode = 'fields' | 'json';

// ============================================================================
// Helpers
// ============================================================================

function formatFieldPath(path: string): string {
  return path
    .replace(/\./g, ' → ')
    .replace(/\[(\d+)\]/g, '[$1]')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
}

function formatValue(value: unknown): string {
  if (value === undefined) return '—';
  if (value === null) return 'null';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

// ============================================================================
// Component
// ============================================================================

const VersionDiff: React.FC<VersionDiffProps> = ({
  comparison,
  leftLabel = 'Previous',
  rightLabel = 'Current',
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('fields');

  if (comparison.isIdentical) {
    return (
      <Container>
        <EmptyState>
          <ArrowsRightLeftIcon />
          <span>These versions are identical</span>
        </EmptyState>
      </Container>
    );
  }

  const addedDiffs = comparison.diffs.filter(d => d.type === 'added');
  const removedDiffs = comparison.diffs.filter(d => d.type === 'removed');
  const changedDiffs = comparison.diffs.filter(d => d.type === 'changed');

  return (
    <Container>
      <Header>
        <Stats>
          <StatBadge $type="added">
            <PlusCircleIcon /> {addedDiffs.length} added
          </StatBadge>
          <StatBadge $type="removed">
            <MinusCircleIcon /> {removedDiffs.length} removed
          </StatBadge>
          <StatBadge $type="changed">
            <ArrowsRightLeftIcon /> {changedDiffs.length} changed
          </StatBadge>
        </Stats>
        <ViewToggle>
          <ViewButton $active={viewMode === 'fields'} onClick={() => setViewMode('fields')}>
            <ListBulletIcon /> Fields
          </ViewButton>
          <ViewButton $active={viewMode === 'json'} onClick={() => setViewMode('json')}>
            <CodeBracketIcon /> JSON
          </ViewButton>
        </ViewToggle>
      </Header>

      {viewMode === 'fields' ? (
        <DiffList>
          <DiffHeader>
            <DiffHeaderCell>Field</DiffHeaderCell>
            <DiffHeaderCell>{leftLabel}</DiffHeaderCell>
            <DiffHeaderCell>{rightLabel}</DiffHeaderCell>
          </DiffHeader>
          {comparison.diffs.map((diff, index) => (
            <DiffRow key={index} $type={diff.type}>
              <FieldCell>
                <TypeIcon $type={diff.type}>
                  {diff.type === 'added' && <PlusCircleIcon />}
                  {diff.type === 'removed' && <MinusCircleIcon />}
                  {diff.type === 'changed' && <ArrowsRightLeftIcon />}
                </TypeIcon>
                <FieldPath>{formatFieldPath(diff.path)}</FieldPath>
              </FieldCell>
              <ValueCell $type={diff.type === 'removed' || diff.type === 'changed' ? diff.type : undefined}>
                <ValueContent>{formatValue(diff.oldValue)}</ValueContent>
              </ValueCell>
              <ValueCell $type={diff.type === 'added' || diff.type === 'changed' ? diff.type : undefined}>
                <ValueContent>{formatValue(diff.newValue)}</ValueContent>
              </ValueCell>
            </DiffRow>
          ))}
        </DiffList>
      ) : (
        <JsonView>
          <JsonPanel>
            <JsonLabel>{leftLabel}</JsonLabel>
            <JsonContent>
              {JSON.stringify(
                comparison.diffs.reduce((acc, d) => {
                  if (d.oldValue !== undefined) acc[d.path] = d.oldValue;
                  return acc;
                }, {} as Record<string, unknown>),
                null,
                2
              )}
            </JsonContent>
          </JsonPanel>
          <JsonPanel>
            <JsonLabel>{rightLabel}</JsonLabel>
            <JsonContent>
              {JSON.stringify(
                comparison.diffs.reduce((acc, d) => {
                  if (d.newValue !== undefined) acc[d.path] = d.newValue;
                  return acc;
                }, {} as Record<string, unknown>),
                null,
                2
              )}
            </JsonContent>
          </JsonPanel>
        </JsonView>
      )}
    </Container>
  );
};

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  background: white;
  border: 1px solid ${colors.gray200};
  border-radius: 12px;
  overflow: hidden;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  color: ${colors.gray400};

  svg {
    width: 48px;
    height: 48px;
    stroke-width: 1;
  }

  span {
    font-size: 14px;
    font-weight: 500;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: ${colors.gray50};
  border-bottom: 1px solid ${colors.gray200};
`;

const Stats = styled.div`
  display: flex;
  gap: 12px;
`;

const StatBadge = styled.div<{ $type: 'added' | 'removed' | 'changed' }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: ${({ $type }) =>
    $type === 'added' ? `${colors.success}15` :
    $type === 'removed' ? `${colors.error}15` : `${colors.warning}15`};
  color: ${({ $type }) =>
    $type === 'added' ? colors.success :
    $type === 'removed' ? colors.error : colors.warning};

  svg { width: 14px; height: 14px; }
`;

const ViewToggle = styled.div`
  display: flex;
  gap: 4px;
  padding: 4px;
  background: ${colors.gray100};
  border-radius: 8px;
`;

const ViewButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  background: ${({ $active }) => $active ? 'white' : 'transparent'};
  color: ${({ $active }) => $active ? colors.gray800 : colors.gray500};
  box-shadow: ${({ $active }) => $active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};

  svg { width: 14px; height: 14px; }
`;

const DiffList = styled.div`
  overflow-x: auto;
`;

const DiffHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 1px;
  background: ${colors.gray100};
  border-bottom: 1px solid ${colors.gray200};
`;

const DiffHeaderCell = styled.div`
  padding: 12px 16px;
  font-size: 11px;
  font-weight: 600;
  color: ${colors.gray500};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${colors.gray50};
`;

const DiffRow = styled.div<{ $type: 'added' | 'removed' | 'changed' }>`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 1px;
  background: ${colors.gray100};
  border-bottom: 1px solid ${colors.gray100};

  &:hover {
    background: ${colors.gray200};
  }
`;

const FieldCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: white;
`;

const TypeIcon = styled.div<{ $type: 'added' | 'removed' | 'changed' }>`
  width: 20px;
  height: 20px;
  color: ${({ $type }) =>
    $type === 'added' ? colors.success :
    $type === 'removed' ? colors.error : colors.warning};

  svg { width: 100%; height: 100%; }
`;

const FieldPath = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${colors.gray700};
`;

const ValueCell = styled.div<{ $type?: 'added' | 'removed' | 'changed' }>`
  padding: 12px 16px;
  background: ${({ $type }) =>
    $type === 'added' ? `${colors.success}08` :
    $type === 'removed' ? `${colors.error}08` :
    $type === 'changed' ? `${colors.warning}08` : 'white'};
`;

const ValueContent = styled.pre`
  margin: 0;
  font-size: 12px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: ${colors.gray600};
  white-space: pre-wrap;
  word-break: break-word;
`;

const JsonView = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: ${colors.gray200};
`;

const JsonPanel = styled.div`
  background: white;
`;

const JsonLabel = styled.div`
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: ${colors.gray600};
  background: ${colors.gray50};
  border-bottom: 1px solid ${colors.gray200};
`;

const JsonContent = styled.pre`
  margin: 0;
  padding: 16px;
  font-size: 12px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: ${colors.gray700};
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
`;

export default VersionDiff;

