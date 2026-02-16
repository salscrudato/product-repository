/**
 * StateDeviationsList  (Design System v2)
 *
 * State-level list showing each state's override count, conflict status,
 * and filing status. Clicking a state opens the full deviation diff panel.
 */

import React, { useState, useEffect, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import {
  color, neutral, accent, semantic,
  space, radius, fontFamily,
  type as t, border as borderTokens,
  duration, focusRingStyle, reducedMotion,
} from '@/ui/tokens';
import { Badge } from '@/ui/components';
import { fetchStatePrograms } from '@/services/stateProgramService';
import { getOverrides } from '@/services/deviationService';
import { validateOverrides } from '@/engine/deviationEngine';
import type { StateProgram, StateProgramStatus, STATE_PROGRAM_STATUS_CONFIG } from '@/types/stateProgram';
import type { Override, DeviationValidationError } from '@/types/deviation';

// ════════════════════════════════════════════════════════════════════════
// Styled
// ════════════════════════════════════════════════════════════════════════

const fadeIn = keyframes`from{opacity:0}to{opacity:1}`;

const Container = styled.div`
  background: ${color.bg};
  border: ${borderTokens.default};
  border-radius: ${radius.xl};
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${space[3]} ${space[4]};
  border-bottom: ${borderTokens.default};
  background: ${neutral[50]};
`;

const Title = styled.h3`
  margin: 0;
  font-family: ${fontFamily.sans};
  font-size: ${t.bodySm.size};
  font-weight: 600;
  color: ${color.text};
`;

const SearchBox = styled.div`
  position: relative;
  svg {
    position: absolute;
    left: ${space[2]};
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    color: ${neutral[400]};
  }
`;

const SearchInput = styled.input`
  font-family: ${fontFamily.sans};
  font-size: ${t.captionSm.size};
  padding: ${space[1]} ${space[2]} ${space[1]} ${space[7]};
  border: 1px solid ${neutral[200]};
  border-radius: ${radius.md};
  background: white;
  color: ${color.text};
  width: 200px;

  &:focus { ${focusRingStyle} outline: none; }
  &::placeholder { color: ${neutral[400]}; }
`;

const StateRow = styled.button<{ $hasOverrides?: boolean; $hasConflicts?: boolean }>`
  display: grid;
  grid-template-columns: 48px 1fr 100px 80px 80px 28px;
  align-items: center;
  gap: ${space[2]};
  width: 100%;
  padding: ${space[2.5]} ${space[4]};
  border: none;
  border-bottom: 1px solid ${neutral[100]};
  background: ${({ $hasConflicts }) => $hasConflicts ? '#fef2f2' : 'transparent'};
  cursor: pointer;
  font-family: ${fontFamily.sans};
  text-align: left;
  transition: background ${duration.fast} ease;
  animation: ${fadeIn} ${duration.normal} ease;
  @media ${reducedMotion} { animation: none; }

  &:hover { background: ${neutral[50]}; }
  &:last-child { border-bottom: none; }
  &:focus-visible { ${focusRingStyle} }
`;

const StateCode = styled.div`
  font-size: ${t.bodySm.size};
  font-weight: 600;
  color: ${color.text};
`;

const StateName = styled.div`
  font-size: ${t.captionSm.size};
  color: ${color.text};
`;

const OverrideCount = styled.div<{ $count: number }>`
  display: flex;
  align-items: center;
  gap: ${space[1]};
  font-size: ${t.captionSm.size};
  font-weight: 500;
  color: ${({ $count }) => $count > 0 ? accent[600] : neutral[400]};

  svg { width: 14px; height: 14px; }
`;

const ConflictCount = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: ${t.captionSm.size};
  font-weight: 600;
  color: ${semantic.error};

  svg { width: 14px; height: 14px; }
`;

const Arrow = styled.div`
  color: ${neutral[300]};
  svg { width: 16px; height: 16px; }
`;

const EmptyText = styled.div`
  padding: ${space[8]} ${space[4]};
  text-align: center;
  color: ${color.textMuted};
  font-size: ${t.captionSm.size};
`;

// ════════════════════════════════════════════════════════════════════════
// Status config (inline to avoid import issues)
// ════════════════════════════════════════════════════════════════════════

const STATUS_VARIANT: Record<string, 'neutral' | 'accent' | 'success' | 'warning' | 'error' | 'info'> = {
  not_offered: 'neutral',
  draft: 'neutral',
  pending_filing: 'warning',
  filed: 'info',
  approved: 'success',
  active: 'success',
  withdrawn: 'error',
};

const STATUS_LABEL: Record<string, string> = {
  not_offered: 'Not Offered',
  draft: 'Draft',
  pending_filing: 'Pending',
  filed: 'Filed',
  approved: 'Approved',
  active: 'Active',
  withdrawn: 'Withdrawn',
};

// ════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════

interface StateDeviationSummary {
  stateCode: string;
  stateName: string;
  status: StateProgramStatus;
  overrideCount: number;
  conflictCount: number;
}

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

interface Props {
  orgId: string;
  productId: string;
  versionId: string;
  baseConfig: Record<string, unknown>;
  onSelectState: (stateCode: string, stateName: string) => void;
}

const StateDeviationsList: React.FC<Props> = ({
  orgId, productId, versionId, baseConfig, onSelectState,
}) => {
  const [summaries, setSummaries] = useState<StateDeviationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!orgId || !productId || !versionId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const programs = await fetchStatePrograms(orgId, productId, versionId);
        const results: StateDeviationSummary[] = [];

        for (const program of programs) {
          if (program.status === 'not_offered') continue;
          const overrides = await getOverrides(orgId, productId, versionId, program.stateCode);
          const overrideCount = Object.keys(overrides).length;

          let conflictCount = 0;
          if (overrideCount > 0) {
            const errors = validateOverrides(baseConfig, overrides);
            conflictCount = errors.filter(e => e.type === 'conflict').length;
          }

          results.push({
            stateCode: program.stateCode,
            stateName: program.stateName,
            status: program.status,
            overrideCount,
            conflictCount,
          });
        }

        if (!cancelled) {
          // Sort: conflicts first, then by override count, then alphabetically
          results.sort((a, b) => {
            if (a.conflictCount > 0 && b.conflictCount === 0) return -1;
            if (a.conflictCount === 0 && b.conflictCount > 0) return 1;
            if (a.overrideCount !== b.overrideCount) return b.overrideCount - a.overrideCount;
            return a.stateCode.localeCompare(b.stateCode);
          });
          setSummaries(results);
        }
      } catch (err) {
        console.error('Failed to load deviation summaries:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [orgId, productId, versionId, baseConfig]);

  const filtered = useMemo(() => {
    if (!search.trim()) return summaries;
    const q = search.toLowerCase();
    return summaries.filter(s =>
      s.stateCode.toLowerCase().includes(q) ||
      s.stateName.toLowerCase().includes(q),
    );
  }, [summaries, search]);

  const totalOverrides = summaries.reduce((s, x) => s + x.overrideCount, 0);
  const totalConflicts = summaries.reduce((s, x) => s + x.conflictCount, 0);

  return (
    <Container>
      <Header>
        <div style={{ display: 'flex', alignItems: 'center', gap: space[2] }}>
          <Title>State Deviations</Title>
          <Badge $variant="accent" $size="sm">{totalOverrides} total override{totalOverrides !== 1 ? 's' : ''}</Badge>
          {totalConflicts > 0 && (
            <Badge $variant="error" $size="sm">{totalConflicts} conflict{totalConflicts !== 1 ? 's' : ''}</Badge>
          )}
        </div>
        <SearchBox>
          <MagnifyingGlassIcon />
          <SearchInput
            placeholder="Search states…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search states"
          />
        </SearchBox>
      </Header>

      {loading && <EmptyText>Loading state deviations…</EmptyText>}

      {!loading && filtered.length === 0 && (
        <EmptyText>
          {search ? 'No states match your search' : 'No states with configured deviations'}
        </EmptyText>
      )}

      {filtered.map(s => (
        <StateRow
          key={s.stateCode}
          onClick={() => onSelectState(s.stateCode, s.stateName)}
          $hasOverrides={s.overrideCount > 0}
          $hasConflicts={s.conflictCount > 0}
          aria-label={`${s.stateName}: ${s.overrideCount} overrides, ${s.conflictCount} conflicts`}
        >
          <StateCode>{s.stateCode}</StateCode>
          <StateName>{s.stateName}</StateName>
          <Badge $variant={STATUS_VARIANT[s.status] || 'neutral'} $size="sm">
            {STATUS_LABEL[s.status] || s.status}
          </Badge>
          <OverrideCount $count={s.overrideCount}>
            {s.overrideCount > 0 && <PencilSquareIcon />}
            {s.overrideCount > 0 ? `${s.overrideCount} override${s.overrideCount > 1 ? 's' : ''}` : '—'}
          </OverrideCount>
          {s.conflictCount > 0 ? (
            <ConflictCount>
              <ShieldExclamationIcon />
              {s.conflictCount}
            </ConflictCount>
          ) : s.overrideCount > 0 ? (
            <span style={{ fontSize: 12, color: semantic.successDark }}>
              <CheckCircleIcon style={{ width: 14, height: 14, verticalAlign: 'middle' }} /> OK
            </span>
          ) : (
            <span />
          )}
          <Arrow><ChevronRightIcon /></Arrow>
        </StateRow>
      ))}
    </Container>
  );
};

export default StateDeviationsList;
