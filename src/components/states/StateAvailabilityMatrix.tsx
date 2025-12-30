/**
 * StateAvailabilityMatrix Component
 * 
 * Visual matrix showing coverage availability across states.
 * Features:
 * - Inherited vs override indicators
 * - Quick toggle for availability
 * - State-specific override details
 * - Bulk operations
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  CheckIcon,
  XMarkIcon,
  MinusIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { CoverageStateAvailability } from '@app-types';
import {
  US_STATES,
  fetchCoverageStateAvailability,
  fetchProductStateAvailability,
  setCoverageStateAvailability,
  removeStateAvailability,
} from '../../services/stateAvailabilityService';
import { colors } from '../common/DesignSystem';

interface StateAvailabilityMatrixProps {
  productId: string;
  coverageId: string;
  onStateClick?: (stateCode: string) => void;
}

type AvailabilityStatus = 'available' | 'unavailable' | 'inherited' | 'override';

interface StateStatus {
  stateCode: string;
  stateName: string;
  status: AvailabilityStatus;
  isAvailable: boolean;
  hasOverride: boolean;
  override?: CoverageStateAvailability;
}

export const StateAvailabilityMatrix: React.FC<StateAvailabilityMatrixProps> = ({
  productId,
  coverageId,
  onStateClick
}) => {
  const [stateStatuses, setStateStatuses] = useState<StateStatus[]>([]);
  const [productStates, setProductStates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'unavailable' | 'overrides'>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [productAvailability, coverageOverrides] = await Promise.all([
        fetchProductStateAvailability(productId),
        fetchCoverageStateAvailability(productId, coverageId),
      ]);

      setProductStates(productAvailability);

      const overrideMap = new Map(
        coverageOverrides.map(o => [o.stateCode, o])
      );

      const statuses: StateStatus[] = US_STATES.map(state => {
        const override = overrideMap.get(state.code);
        const inheritedAvailable = productAvailability.includes(state.code);
        
        let status: AvailabilityStatus;
        let isAvailable: boolean;
        
        if (override) {
          isAvailable = override.isAvailable;
          status = 'override';
        } else {
          isAvailable = inheritedAvailable;
          status = inheritedAvailable ? 'inherited' : 'unavailable';
        }

        return {
          stateCode: state.code,
          stateName: state.name,
          status,
          isAvailable,
          hasOverride: !!override,
          override,
        };
      });

      setStateStatuses(statuses);
    } catch (error) {
      console.error('Error loading state availability:', error);
    } finally {
      setLoading(false);
    }
  }, [productId, coverageId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleState = async (stateCode: string) => {
    const current = stateStatuses.find(s => s.stateCode === stateCode);
    if (!current) return;

    const inheritedAvailable = productStates.includes(stateCode);
    
    if (current.hasOverride) {
      // Remove override to revert to inherited
      await removeStateAvailability(productId, coverageId, stateCode);
    } else {
      // Create override with opposite of inherited
      await setCoverageStateAvailability(productId, coverageId, stateCode, {
        isAvailable: !inheritedAvailable,
        inheritFromProduct: false,
      });
    }
    
    await loadData();
  };

  const filteredStates = stateStatuses.filter(state => {
    switch (filter) {
      case 'available':
        return state.isAvailable;
      case 'unavailable':
        return !state.isAvailable;
      case 'overrides':
        return state.hasOverride;
      default:
        return true;
    }
  });

  const availableCount = stateStatuses.filter(s => s.isAvailable).length;
  const overrideCount = stateStatuses.filter(s => s.hasOverride).length;

  if (loading) {
    return (
      <LoadingContainer>
        <ArrowPathIcon className="spin" />
        <span>Loading state availability...</span>
      </LoadingContainer>
    );
  }

  return (
    <Container>
      <Header>
        <Stats>
          <StatItem>
            <StatValue>{availableCount}</StatValue>
            <StatLabel>Available</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{51 - availableCount}</StatValue>
            <StatLabel>Unavailable</StatLabel>
          </StatItem>
          <StatItem $highlight={overrideCount > 0}>
            <StatValue>{overrideCount}</StatValue>
            <StatLabel>Overrides</StatLabel>
          </StatItem>
        </Stats>

        <FilterTabs>
          {(['all', 'available', 'unavailable', 'overrides'] as const).map(f => (
            <FilterTab
              key={f}
              $active={filter === f}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </FilterTab>
          ))}
        </FilterTabs>
      </Header>

      <Legend>
        <LegendItem>
          <LegendDot $color={colors.success} />
          <span>Available (inherited)</span>
        </LegendItem>
        <LegendItem>
          <LegendDot $color={colors.primary} />
          <span>Available (override)</span>
        </LegendItem>
        <LegendItem>
          <LegendDot $color={colors.gray300} />
          <span>Unavailable</span>
        </LegendItem>
        <LegendItem>
          <LegendDot $color={colors.error} />
          <span>Excluded (override)</span>
        </LegendItem>
      </Legend>

      <Grid>
        {filteredStates.map(state => (
          <StateCell
            key={state.stateCode}
            $available={state.isAvailable}
            $hasOverride={state.hasOverride}
            onClick={() => handleToggleState(state.stateCode)}
            title={`${state.stateName}${state.hasOverride ? ' (override)' : ''}`}
          >
            <StateCode>{state.stateCode}</StateCode>
            <StateIndicator $available={state.isAvailable} $hasOverride={state.hasOverride}>
              {state.isAvailable ? <CheckIcon /> : <XMarkIcon />}
            </StateIndicator>
            {state.hasOverride && <OverrideBadge />}
            {onStateClick && (
              <ConfigButton
                onClick={(e) => {
                  e.stopPropagation();
                  onStateClick(state.stateCode);
                }}
              >
                <AdjustmentsHorizontalIcon />
              </ConfigButton>
            )}
          </StateCell>
        ))}
      </Grid>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  background: white;
  border-radius: 12px;
  border: 1px solid ${colors.gray200};
  overflow: hidden;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: ${colors.gray500};

  svg {
    width: 32px;
    height: 32px;
    margin-bottom: 12px;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid ${colors.gray200};
`;

const Stats = styled.div`
  display: flex;
  gap: 24px;
`;

const StatItem = styled.div<{ $highlight?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ $highlight }) => $highlight ? '4px 12px' : '0'};
  background: ${({ $highlight }) => $highlight ? `${colors.primary}10` : 'transparent'};
  border-radius: 8px;
`;

const StatValue = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: ${colors.gray800};
`;

const StatLabel = styled.span`
  font-size: 11px;
  color: ${colors.gray500};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const FilterTabs = styled.div`
  display: flex;
  gap: 4px;
  background: ${colors.gray100};
  padding: 4px;
  border-radius: 8px;
`;

const FilterTab = styled.button<{ $active: boolean }>`
  padding: 6px 12px;
  border: none;
  background: ${({ $active }) => $active ? 'white' : 'transparent'};
  color: ${({ $active }) => $active ? colors.gray800 : colors.gray500};
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${({ $active }) => $active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};

  &:hover {
    color: ${colors.gray800};
  }
`;

const Legend = styled.div`
  display: flex;
  gap: 20px;
  padding: 12px 20px;
  background: ${colors.gray50};
  border-bottom: 1px solid ${colors.gray200};
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${colors.gray600};
`;

const LegendDot = styled.div<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
  padding: 20px;
`;

const StateCell = styled.div<{ $available: boolean; $hasOverride: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: ${({ $available, $hasOverride }) =>
    $hasOverride
      ? ($available ? `${colors.primary}10` : `${colors.error}10`)
      : ($available ? `${colors.success}10` : colors.gray50)
  };
  border: 1px solid ${({ $available, $hasOverride }) =>
    $hasOverride
      ? ($available ? colors.primary : colors.error)
      : ($available ? colors.success : colors.gray200)
  };
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
`;

const StateCode = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${colors.gray800};
  margin-bottom: 4px;
`;

const StateIndicator = styled.div<{ $available: boolean; $hasOverride: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${({ $available, $hasOverride }) =>
    $hasOverride
      ? ($available ? colors.primary : colors.error)
      : ($available ? colors.success : colors.gray300)
  };
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 12px;
    height: 12px;
    color: white;
  }
`;

const OverrideBadge = styled.div`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${colors.warning};
`;

const ConfigButton = styled.button`
  position: absolute;
  top: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: ${colors.gray400};
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;

  svg {
    width: 14px;
    height: 14px;
  }

  ${StateCell}:hover & {
    opacity: 1;
  }

  &:hover {
    color: ${colors.gray600};
  }
`;

export default StateAvailabilityMatrix;

