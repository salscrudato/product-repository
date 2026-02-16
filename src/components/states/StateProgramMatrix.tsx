/**
 * StateProgramMatrix Component
 * Matrix view showing state programs with filing statuses, dependencies, and validation
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import {
  StateProgram,
  StateProgramStatus,
  STATE_PROGRAM_STATUS_CONFIG,
  ValidationResult,
  StateMatrixRow,
} from '@/types/stateProgram';
import {
  fetchStatePrograms,
  validateStateProgram,
  transitionStateProgramStatus,
  subscribeToStatePrograms,
} from '@/services/stateProgramService';
import { US_STATES } from '@/services/stateAvailabilityService';
import { useRoleContext } from '@/context/RoleContext';
import { colors } from '@components/common/DesignSystem';
import { Tooltip } from '@/components/ui/Tooltip';

interface StateProgramMatrixProps {
  productId: string;
  productVersionId: string;
  onStateClick?: (stateCode: string) => void;
}

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
`;

const Stats = styled.div`
  display: flex;
  gap: 24px;
`;

const StatItem = styled.div<{ $color?: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px;
  background: ${props => props.$color ? `${props.$color}15` : colors.gray50};
  border-radius: 8px;
  border: 1px solid ${props => props.$color || colors.gray200};
`;

const StatValue = styled.span`
  font-size: 24px;
  font-weight: 600;
  color: ${colors.gray900};
`;

const StatLabel = styled.span`
  font-size: 12px;
  color: ${colors.gray600};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FilterSection = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const FilterChip = styled.button<{ $active: boolean; $color?: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid ${props => props.$active ? (props.$color || colors.primary) : colors.gray300};
  background: ${props => props.$active ? `${props.$color || colors.primary}15` : 'white'};
  color: ${props => props.$active ? (props.$color || colors.primary) : colors.gray700};

  &:hover {
    border-color: ${props => props.$color || colors.primary};
    background: ${props => `${props.$color || colors.primary}10`};
  }
`;

const Table = styled.div`
  border: 1px solid ${colors.gray200};
  border-radius: 8px;
  overflow: hidden;
  background: white;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 80px 140px 80px 80px 80px 120px 1fr;
  gap: 8px;
  padding: 12px 16px;
  background: ${colors.gray50};
  border-bottom: 1px solid ${colors.gray200};
  font-size: 12px;
  font-weight: 600;
  color: ${colors.gray600};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TableRow = styled.div<{ $hasError?: boolean }>`
  display: grid;
  grid-template-columns: 80px 140px 80px 80px 80px 120px 1fr;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid ${colors.gray100};
  align-items: center;
  transition: background 0.15s ease;
  background: ${props => props.$hasError ? `${colors.error}05` : 'transparent'};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${props => props.$hasError ? `${colors.error}10` : colors.gray50};
  }
`;

const StateCode = styled.span`
  font-weight: 600;
  color: ${colors.gray900};
  font-size: 14px;
`;

const StateName = styled.span`
  font-size: 12px;
  color: ${colors.gray500};
`;

const StateCell = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatusBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  background: ${props => `${props.$color}15`};
  color: ${props => props.$color};

  svg {
    width: 12px;
    height: 12px;
  }
`;

const ArtifactCount = styled.span<{ $hasItems: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  background: ${props => props.$hasItems ? colors.gray100 : 'transparent'};
  color: ${props => props.$hasItems ? colors.gray900 : colors.gray400};
`;

const DateText = styled.span`
  font-size: 12px;
  color: ${colors.gray600};
`;

const ErrorsCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ErrorBadge = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: ${colors.error}15;
  color: ${colors.error};
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    background: ${colors.error}25;
  }
`;

const SuccessBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: ${colors.success}15;
  color: ${colors.success};

  svg {
    width: 14px;
    height: 14px;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: ${colors.gray500};
  gap: 8px;

  svg {
    width: 20px;
    height: 20px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ErrorModal = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ErrorModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
`;

const ErrorModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const ErrorModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${colors.gray900};
`;

const ErrorList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ErrorItem = styled.li`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: ${colors.error}08;
  border-radius: 8px;
  border-left: 3px solid ${colors.error};
`;

const ErrorMessage = styled.span`
  font-size: 14px;
  color: ${colors.gray900};
`;

const ErrorLink = styled(Link)`
  font-size: 12px;
  color: ${colors.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: ${colors.gray500};
  border-radius: 4px;

  &:hover {
    background: ${colors.gray100};
    color: ${colors.gray700};
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

// ============================================================================
// Status Icon Helper
// ============================================================================

const getStatusIcon = (status: StateProgramStatus) => {
  switch (status) {
    case 'active':
      return <CheckCircleSolid />;
    case 'approved':
      return <CheckCircleIcon />;
    case 'filed':
    case 'pending_filing':
      return <ClockIcon />;
    case 'withdrawn':
      return <XCircleIcon />;
    default:
      return null;
  }
};

// ============================================================================
// Component
// ============================================================================

export const StateProgramMatrix: React.FC<StateProgramMatrixProps> = ({
  productId,
  productVersionId,
  onStateClick,
}) => {
  const { currentOrg, user } = useRoleContext();
  const [rows, setRows] = useState<StateMatrixRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StateProgramStatus | 'all' | 'blocked'>('all');
  const [selectedError, setSelectedError] = useState<{ stateCode: string; errors: ValidationResult['errors'] } | null>(null);

  const orgId = currentOrg?.id || '';

  // Build matrix rows
  const buildRows = useCallback(async (programs: StateProgram[]) => {
    const programMap = new Map(programs.map(p => [p.stateCode, p]));
    const newRows: StateMatrixRow[] = [];

    for (const state of US_STATES) {
      const program = programMap.get(state.code);

      if (program) {
        const validation = await validateStateProgram(orgId, productId, productVersionId, state.code);

        newRows.push({
          stateCode: state.code,
          stateName: state.name,
          status: program.status,
          formCount: program.requiredArtifacts.formVersionIds.length,
          ruleCount: program.requiredArtifacts.ruleVersionIds.length,
          rateCount: program.requiredArtifacts.rateProgramVersionIds.length,
          lastApprovalDate: program.approvalDate,
          validationResult: validation,
          stateProgram: program,
        });
      } else {
        newRows.push({
          stateCode: state.code,
          stateName: state.name,
          status: 'not_offered',
          formCount: 0,
          ruleCount: 0,
          rateCount: 0,
          validationResult: {
            isValid: false,
            canActivate: false,
            errors: [],
            warnings: ['State program not configured'],
          },
        });
      }
    }

    setRows(newRows);
    setLoading(false);
  }, [orgId, productId, productVersionId]);

  // Subscribe to state programs
  useEffect(() => {
    if (!orgId || !productId || !productVersionId) return;

    setLoading(true);
    const unsubscribe = subscribeToStatePrograms(orgId, productId, productVersionId, buildRows);
    return () => unsubscribe();
  }, [orgId, productId, productVersionId, buildRows]);

  // Filter rows
  const filteredRows = rows.filter(row => {
    if (filter === 'all') return true;
    if (filter === 'blocked') return row.validationResult.errors.length > 0;
    return row.status === filter;
  });

  // Calculate stats
  const stats = {
    active: rows.filter(r => r.status === 'active').length,
    approved: rows.filter(r => r.status === 'approved').length,
    pending: rows.filter(r => ['pending_filing', 'filed'].includes(r.status)).length,
    draft: rows.filter(r => r.status === 'draft').length,
    blocked: rows.filter(r => r.validationResult.errors.length > 0 && r.status !== 'not_offered').length,
  };

  if (loading) {
    return (
      <LoadingContainer>
        <ArrowPathIcon />
        <span>Loading state programs...</span>
      </LoadingContainer>
    );
  }

  return (
    <Container>
      <Header>
        <Stats>
          <StatItem $color={colors.success}>
            <StatValue>{stats.active}</StatValue>
            <StatLabel>Active</StatLabel>
          </StatItem>
          <StatItem $color={colors.primary}>
            <StatValue>{stats.approved}</StatValue>
            <StatLabel>Approved</StatLabel>
          </StatItem>
          <StatItem $color={colors.warning}>
            <StatValue>{stats.pending}</StatValue>
            <StatLabel>Pending</StatLabel>
          </StatItem>
          <StatItem $color={colors.gray500}>
            <StatValue>{stats.draft}</StatValue>
            <StatLabel>Draft</StatLabel>
          </StatItem>
          {stats.blocked > 0 && (
            <StatItem $color={colors.error}>
              <StatValue>{stats.blocked}</StatValue>
              <StatLabel>Blocked</StatLabel>
            </StatItem>
          )}
        </Stats>

        <FilterSection>
          <FilterChip $active={filter === 'all'} onClick={() => setFilter('all')}>
            All States
          </FilterChip>
          <FilterChip $active={filter === 'active'} $color={colors.success} onClick={() => setFilter('active')}>
            Active
          </FilterChip>
          <FilterChip $active={filter === 'approved'} $color={colors.primary} onClick={() => setFilter('approved')}>
            Approved
          </FilterChip>
          <FilterChip $active={filter === 'draft'} $color={colors.gray500} onClick={() => setFilter('draft')}>
            Draft
          </FilterChip>
          {stats.blocked > 0 && (
            <FilterChip $active={filter === 'blocked'} $color={colors.error} onClick={() => setFilter('blocked')}>
              <ExclamationTriangleIcon style={{ width: 14, height: 14 }} />
              Blocked ({stats.blocked})
            </FilterChip>
          )}
        </FilterSection>
      </Header>

      <Table>
        <TableHeader>
          <span>State</span>
          <span>Status</span>
          <span>Forms</span>
          <span>Rules</span>
          <span>Rates</span>
          <span>Last Approval</span>
          <span>Validation</span>
        </TableHeader>

        {filteredRows.map(row => {
          const statusConfig = STATE_PROGRAM_STATUS_CONFIG[row.status];
          const hasErrors = row.validationResult.errors.length > 0;

          return (
            <TableRow key={row.stateCode} $hasError={hasErrors && row.status !== 'not_offered'}>
              <StateCell>
                <StateCode>{row.stateCode}</StateCode>
                <StateName>{row.stateName}</StateName>
              </StateCell>

              <StatusBadge $color={statusConfig.color}>
                {getStatusIcon(row.status)}
                {statusConfig.label}
              </StatusBadge>

              <Tooltip content="Forms required for this state">
                <ArtifactCount $hasItems={row.formCount > 0}>
                  {row.formCount || '–'}
                </ArtifactCount>
              </Tooltip>

              <Tooltip content="Rules required for this state">
                <ArtifactCount $hasItems={row.ruleCount > 0}>
                  {row.ruleCount || '–'}
                </ArtifactCount>
              </Tooltip>

              <Tooltip content="Rate programs required for this state">
                <ArtifactCount $hasItems={row.rateCount > 0}>
                  {row.rateCount || '–'}
                </ArtifactCount>
              </Tooltip>

              <DateText>
                {row.lastApprovalDate
                  ? new Date(row.lastApprovalDate.toDate()).toLocaleDateString()
                  : '–'
                }
              </DateText>

              <ErrorsCell>
                {row.status === 'not_offered' ? (
                  <span style={{ color: colors.gray400, fontSize: 12 }}>Not configured</span>
                ) : hasErrors ? (
                  <ErrorBadge onClick={() => setSelectedError({ stateCode: row.stateCode, errors: row.validationResult.errors })}>
                    <ExclamationTriangleIcon />
                    {row.validationResult.errors.length} issue{row.validationResult.errors.length !== 1 ? 's' : ''}
                  </ErrorBadge>
                ) : (
                  <SuccessBadge>
                    <CheckCircleIcon />
                    Ready
                  </SuccessBadge>
                )}
              </ErrorsCell>
            </TableRow>
          );
        })}
      </Table>

      {/* Error Modal */}
      {selectedError && (
        <ErrorModal onClick={() => setSelectedError(null)}>
          <ErrorModalContent onClick={e => e.stopPropagation()}>
            <ErrorModalHeader>
              <ErrorModalTitle>
                Why is {selectedError.stateCode} blocked?
              </ErrorModalTitle>
              <CloseButton onClick={() => setSelectedError(null)}>
                <XCircleIcon />
              </CloseButton>
            </ErrorModalHeader>

            <ErrorList>
              {selectedError.errors.map((error, idx) => (
                <ErrorItem key={idx}>
                  <ErrorMessage>{error.message}</ErrorMessage>
                  {error.linkTo && (
                    <ErrorLink to={error.linkTo} onClick={() => setSelectedError(null)}>
                      Fix this issue →
                    </ErrorLink>
                  )}
                </ErrorItem>
              ))}
            </ErrorList>
          </ErrorModalContent>
        </ErrorModal>
      )}
    </Container>
  );
};

export default StateProgramMatrix;

