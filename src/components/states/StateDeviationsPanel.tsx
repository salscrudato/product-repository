/**
 * StateDeviationsPanel  (Design System v2)
 *
 * Embeddable panel showing inherited vs overridden values for a single state.
 * Features:
 *  - Category-grouped diff entries
 *  - Conflict warnings
 *  - Inline override editor
 *  - Revert to base / promote to base actions
 *
 * Usage:
 *   <StateDeviationsPanel
 *     orgId={orgId} productId={productId} versionId={versionId}
 *     stateCode="NY" stateName="New York"
 *     baseConfig={baseConfig}
 *   />
 */

import React, { useState, useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  ArrowUturnLeftIcon,
  ArrowUpTrayIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldExclamationIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import {
  color, neutral, accent, semantic,
  space, radius, shadow, fontFamily,
  type as t, border as borderTokens,
  duration, focusRingStyle, reducedMotion,
} from '@/ui/tokens';
import { Badge } from '@/ui/components';
import { useDeviationDiff, useOverrideValidation, useOverrideActions } from '@/hooks/useDeviations';
import type { DiffEntry, DiffStatus, OverrideCategory } from '@/types/deviation';

// ════════════════════════════════════════════════════════════════════════
// Styled
// ════════════════════════════════════════════════════════════════════════

const fadeIn = keyframes`from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}`;

const Panel = styled.div`
  background: ${color.bg};
  border: ${borderTokens.default};
  border-radius: ${radius.xl};
  overflow: hidden;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${space[3]} ${space[4]};
  border-bottom: ${borderTokens.default};
  background: ${neutral[50]};
`;

const PanelTitle = styled.h3`
  margin: 0;
  font-family: ${fontFamily.sans};
  font-size: ${t.bodySm.size};
  font-weight: 600;
  color: ${color.text};
  display: flex;
  align-items: center;
  gap: ${space[2]};
`;

const CountBadges = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[1.5]};
`;

const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${space[1.5]};
  padding: ${space[2]} ${space[4]};
  border-bottom: ${borderTokens.default};
  background: ${color.bg};
`;

const FilterChip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${space[1]};
  padding: ${space[0.5]} ${space[2]};
  border-radius: ${radius.full};
  border: 1px solid ${({ $active }) => $active ? accent[300] : neutral[200]};
  background: ${({ $active }) => $active ? accent[50] : 'white'};
  cursor: pointer;
  font-family: ${fontFamily.sans};
  font-size: 11px;
  font-weight: 500;
  color: ${({ $active }) => $active ? accent[700] : neutral[600]};
  transition: all ${duration.fast} ease;

  &:hover { border-color: ${accent[300]}; }
  &:focus-visible { ${focusRingStyle} }
`;

const CategoryGroup = styled.div`
  border-bottom: ${borderTokens.default};
  &:last-child { border-bottom: none; }
`;

const CategoryHeader = styled.button`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  width: 100%;
  padding: ${space[2]} ${space[4]};
  border: none;
  background: ${neutral[50]};
  cursor: pointer;
  font-family: ${fontFamily.sans};
  font-size: ${t.captionSm.size};
  font-weight: 600;
  color: ${neutral[600]};
  text-transform: uppercase;
  letter-spacing: 0.04em;

  svg { width: 14px; height: 14px; transition: transform ${duration.fast} ease; }
  &:hover { background: ${neutral[100]}; }
`;

const EntryRow = styled.div<{ $status: DiffStatus }>`
  display: grid;
  grid-template-columns: 1fr 150px 150px 120px;
  align-items: center;
  gap: ${space[2]};
  padding: ${space[2]} ${space[4]};
  border-bottom: 1px solid ${neutral[100]};
  background: ${({ $status }) =>
    $status === 'conflict' ? '#fef2f2' :
    $status === 'overridden' ? `${accent[50]}` :
    $status === 'added' ? '#f0fdf4' :
    'transparent'
  };
  animation: ${fadeIn} ${duration.normal} ease;
  @media ${reducedMotion} { animation: none; }

  &:last-child { border-bottom: none; }
  &:hover { background: ${neutral[50]}; }
`;

const FieldLabel = styled.div`
  font-family: ${fontFamily.sans};
  font-size: ${t.captionSm.size};
  font-weight: 500;
  color: ${color.text};
  display: flex;
  align-items: center;
  gap: ${space[1]};

  svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

const FieldPath = styled.span`
  font-family: ${fontFamily.mono};
  font-size: 10px;
  color: ${neutral[400]};
  display: block;
  margin-top: 1px;
`;

const ValueCell = styled.div<{ $muted?: boolean; $strike?: boolean }>`
  font-family: ${fontFamily.mono};
  font-size: 12px;
  color: ${({ $muted }) => $muted ? neutral[400] : color.text};
  text-decoration: ${({ $strike }) => $strike ? 'line-through' : 'none'};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ActionGroup = styled.div`
  display: flex;
  gap: ${space[1]};
  justify-content: flex-end;
`;

const SmallBtn = styled.button<{ $variant?: 'default' | 'danger' | 'accent' }>`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px ${space[1.5]};
  border-radius: ${radius.sm};
  border: 1px solid ${({ $variant }) =>
    $variant === 'danger' ? semantic.error :
    $variant === 'accent' ? accent[300] :
    neutral[200]
  };
  background: ${color.bg};
  cursor: pointer;
  font-size: 10px;
  font-family: ${fontFamily.sans};
  color: ${({ $variant }) =>
    $variant === 'danger' ? semantic.error :
    $variant === 'accent' ? accent[600] :
    neutral[600]
  };
  transition: all ${duration.fast} ease;

  &:hover { background: ${neutral[50]}; }
  &:focus-visible { ${focusRingStyle} }
  &:disabled { opacity: 0.4; cursor: not-allowed; }

  svg { width: 12px; height: 12px; }
`;

const EditInput = styled.input`
  font-family: ${fontFamily.mono};
  font-size: 12px;
  padding: 2px ${space[1]};
  border: 1px solid ${accent[300]};
  border-radius: ${radius.sm};
  background: white;
  color: ${color.text};
  width: 100%;
  max-width: 140px;

  &:focus { ${focusRingStyle} outline: none; }
`;

const EmptyState = styled.div`
  padding: ${space[8]} ${space[4]};
  text-align: center;
  font-size: ${t.captionSm.size};
  color: ${color.textMuted};
`;

const ConflictBanner = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  padding: ${space[2]} ${space[4]};
  background: #fef2f2;
  border-bottom: 1px solid #fecaca;
  font-size: ${t.captionSm.size};
  color: ${semantic.error};
  font-weight: 500;

  svg { width: 16px; height: 16px; flex-shrink: 0; }
`;

// ════════════════════════════════════════════════════════════════════════
// Config
// ════════════════════════════════════════════════════════════════════════

const STATUS_BADGE: Record<DiffStatus, { label: string; variant: 'neutral' | 'accent' | 'success' | 'warning' | 'error' | 'info' }> = {
  inherited: { label: 'Inherited', variant: 'neutral' },
  overridden: { label: 'Overridden', variant: 'accent' },
  conflict: { label: 'Conflict', variant: 'error' },
  added: { label: 'Added', variant: 'success' },
  removed: { label: 'Removed', variant: 'warning' },
};

const CATEGORY_LABELS: Record<OverrideCategory, string> = {
  limits: 'Limits',
  deductibles: 'Deductibles',
  rates: 'Rates & Factors',
  rules: 'Rules',
  forms: 'Forms',
  eligibility: 'Eligibility',
  general: 'General',
};

function formatValue(v: unknown): string {
  if (v === undefined) return '—';
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return v.toLocaleString();
  if (typeof v === 'string') return v.length > 40 ? `${v.slice(0, 40)}…` : v;
  if (Array.isArray(v)) return `[${v.length} items]`;
  if (typeof v === 'object') return `{${Object.keys(v).length} fields}`;
  return String(v);
}

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

interface Props {
  orgId: string;
  productId: string;
  versionId: string;
  stateCode: string;
  stateName: string;
  baseConfig: Record<string, unknown>;
  onPromote?: (path: string, newBaseConfig: Record<string, unknown>, affected: string[]) => void;
}

const StateDeviationsPanel: React.FC<Props> = ({
  orgId, productId, versionId, stateCode, stateName,
  baseConfig, onPromote,
}) => {
  const { diff, loading, groupedEntries } = useDeviationDiff({
    orgId, productId, versionId, stateCode, stateName, baseConfig,
  });
  const { errors: valErrors, hasConflicts, conflictCount } = useOverrideValidation({
    orgId, productId, versionId, stateCode, baseConfig,
  });
  const { setField, revertField, promoteField, actionLoading } = useOverrideActions({
    orgId, productId, versionId, stateCode,
  });

  // Filter state
  const [statusFilter, setStatusFilter] = useState<DiffStatus | 'all'>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Toggle category collapse
  const toggleCategory = useCallback((cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }, []);

  // Filter entries by status
  const filteredGroups = useMemo(() => {
    const groups: Record<string, DiffEntry[]> = {};
    for (const [cat, entries] of Object.entries(groupedEntries)) {
      const filtered = statusFilter === 'all'
        ? entries
        : entries.filter(e => e.status === statusFilter);
      if (filtered.length > 0) groups[cat] = filtered;
    }
    return groups;
  }, [groupedEntries, statusFilter]);

  // Start editing
  const startEdit = useCallback((entry: DiffEntry) => {
    setEditingPath(entry.path);
    setEditValue(entry.overrideValue !== undefined ? String(entry.overrideValue) : String(entry.baseValue));
  }, []);

  // Save edit
  const saveEdit = useCallback(async (entry: DiffEntry) => {
    let parsed: unknown = editValue;
    // Try to parse as number if the base is numeric
    if (typeof entry.baseValue === 'number') {
      const num = Number(editValue);
      if (!isNaN(num)) parsed = num;
    }
    // Try to parse as boolean
    if (editValue === 'true') parsed = true;
    if (editValue === 'false') parsed = false;

    await setField(entry.path, parsed, entry.baseValue, {
      fieldLabel: entry.fieldLabel,
      category: entry.category,
    });
    setEditingPath(null);
  }, [editValue, setField]);

  // Handle promote
  const handlePromote = useCallback(async (entry: DiffEntry) => {
    const result = await promoteField(entry.path, baseConfig);
    onPromote?.(entry.path, result.newBaseConfig, result.affectedStateCodes);
  }, [promoteField, baseConfig, onPromote]);

  if (loading) return <EmptyState>Loading deviations…</EmptyState>;

  const overrideCount = diff?.overrideCount || 0;
  const totalEntries = diff?.entries.length || 0;

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>
          State Deviations — {stateName} ({stateCode})
        </PanelTitle>
        <CountBadges>
          <Badge $variant="accent" $size="sm">{overrideCount} override{overrideCount !== 1 ? 's' : ''}</Badge>
          <Badge $variant="neutral" $size="sm">{totalEntries} field{totalEntries !== 1 ? 's' : ''}</Badge>
          {conflictCount > 0 && (
            <Badge $variant="error" $size="sm">{conflictCount} conflict{conflictCount !== 1 ? 's' : ''}</Badge>
          )}
        </CountBadges>
      </PanelHeader>

      {hasConflicts && (
        <ConflictBanner>
          <ShieldExclamationIcon />
          {conflictCount} override{conflictCount > 1 ? 's' : ''} conflict with base product changes.
          Review and resolve before publishing.
        </ConflictBanner>
      )}

      {/* Filter chips */}
      <FilterBar>
        <FunnelIcon style={{ width: 14, height: 14, color: neutral[400] }} />
        {(['all', 'inherited', 'overridden', 'conflict', 'added'] as const).map(s => (
          <FilterChip
            key={s}
            $active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'All' : STATUS_BADGE[s].label}
          </FilterChip>
        ))}
      </FilterBar>

      {/* Category groups */}
      {Object.keys(filteredGroups).length === 0 && (
        <EmptyState>No entries match the current filter</EmptyState>
      )}

      {Object.entries(filteredGroups).map(([cat, entries]) => {
        const collapsed = collapsedCategories.has(cat);
        return (
          <CategoryGroup key={cat}>
            <CategoryHeader onClick={() => toggleCategory(cat)}>
              {collapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
              {CATEGORY_LABELS[cat as OverrideCategory] || cat}
              <Badge $variant="neutral" $size="sm">{entries.length}</Badge>
            </CategoryHeader>

            {!collapsed && entries.map(entry => (
              <EntryRow key={entry.path} $status={entry.status}>
                {/* Field label + path */}
                <div>
                  <FieldLabel>
                    {entry.status === 'conflict' && <ExclamationTriangleIcon style={{ color: semantic.error }} />}
                    {entry.status === 'overridden' && <PencilSquareIcon style={{ color: accent[500] }} />}
                    {entry.fieldLabel}
                    <Badge $variant={STATUS_BADGE[entry.status].variant} $size="sm">
                      {STATUS_BADGE[entry.status].label}
                    </Badge>
                  </FieldLabel>
                  <FieldPath>{entry.path}</FieldPath>
                </div>

                {/* Base value */}
                <ValueCell
                  $muted={entry.status === 'overridden' || entry.status === 'conflict'}
                  $strike={entry.status === 'overridden'}
                  title={`Base: ${formatValue(entry.baseValue)}`}
                >
                  {formatValue(entry.baseValue)}
                </ValueCell>

                {/* Effective value (editable if overridden/inherited) */}
                {editingPath === entry.path ? (
                  <div style={{ display: 'flex', gap: 2 }}>
                    <EditInput
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit(entry);
                        if (e.key === 'Escape') setEditingPath(null);
                      }}
                      autoFocus
                      aria-label={`Edit value for ${entry.fieldLabel}`}
                    />
                    <SmallBtn $variant="accent" onClick={() => saveEdit(entry)} disabled={actionLoading}>
                      <CheckIcon />
                    </SmallBtn>
                    <SmallBtn onClick={() => setEditingPath(null)}>
                      <XMarkIcon />
                    </SmallBtn>
                  </div>
                ) : (
                  <ValueCell
                    title={`Effective: ${formatValue(entry.effectiveValue)}`}
                    style={{ fontWeight: entry.status === 'overridden' || entry.status === 'conflict' ? 600 : 400 }}
                  >
                    {formatValue(entry.effectiveValue)}
                  </ValueCell>
                )}

                {/* Actions */}
                <ActionGroup>
                  {editingPath !== entry.path && (
                    <SmallBtn
                      onClick={() => startEdit(entry)}
                      aria-label={`Edit ${entry.fieldLabel}`}
                      title="Set override"
                    >
                      <PencilSquareIcon /> Edit
                    </SmallBtn>
                  )}

                  {(entry.status === 'overridden' || entry.status === 'conflict' || entry.status === 'added') && (
                    <SmallBtn
                      $variant="danger"
                      onClick={() => revertField(entry.path)}
                      disabled={actionLoading}
                      aria-label={`Revert ${entry.fieldLabel} to base`}
                      title="Revert to base"
                    >
                      <ArrowUturnLeftIcon /> Revert
                    </SmallBtn>
                  )}

                  {entry.status === 'overridden' && onPromote && (
                    <SmallBtn
                      $variant="accent"
                      onClick={() => handlePromote(entry)}
                      disabled={actionLoading}
                      aria-label={`Promote ${entry.fieldLabel} to base`}
                      title="Promote to base"
                    >
                      <ArrowUpTrayIcon /> Promote
                    </SmallBtn>
                  )}
                </ActionGroup>
              </EntryRow>
            ))}
          </CategoryGroup>
        );
      })}
    </Panel>
  );
};

export default StateDeviationsPanel;
