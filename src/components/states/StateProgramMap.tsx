/**
 * StateProgramMap Component
 * Map visualization for state programs with filing status colors
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import {
  StateProgram,
  StateProgramStatus,
  STATE_PROGRAM_STATUS_CONFIG,
} from '@/types/stateProgram';
import { subscribeToStatePrograms } from '@/services/stateProgramService';
import { US_STATES } from '@/services/stateAvailabilityService';
import { useRoleContext } from '@/context/RoleContext';
import { colors } from '@components/common/DesignSystem';

interface StateProgramMapProps {
  productId: string;
  productVersionId: string;
  onStateClick?: (stateCode: string) => void;
}

// State name to code mapping
const stateNameToCode: Record<string, string> = {};
US_STATES.forEach(state => {
  stateNameToCode[state.name] = state.code;
});

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const MapContainer = styled.div`
  background: ${colors.gray50};
  border-radius: 12px;
  padding: 24px;
  border: 1px solid ${colors.gray200};
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  padding: 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid ${colors.gray200};
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${colors.gray700};
`;

const LegendColor = styled.div<{ $color: string }>`
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: ${props => props.$color};
  border: 1px solid ${props => props.$color}88;
`;

const MapTooltip = styled.div<{ $visible: boolean; $x: number; $y: number }>`
  position: fixed;
  left: ${props => props.$x + 10}px;
  top: ${props => props.$y + 10}px;
  background: ${colors.gray900};
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  pointer-events: none;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.15s ease;
  z-index: 1000;
  white-space: nowrap;
`;

const TooltipState = styled.span`
  font-weight: 600;
`;

const TooltipStatus = styled.span<{ $color: string }>`
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  background: ${props => props.$color}30;
  color: ${props => props.$color};
`;

// ============================================================================
// Status Color Mapping
// ============================================================================

const getStatusColor = (status: StateProgramStatus): string => {
  return STATE_PROGRAM_STATUS_CONFIG[status].color;
};

// ============================================================================
// Component
// ============================================================================

export const StateProgramMap: React.FC<StateProgramMapProps> = ({
  productId,
  productVersionId,
  onStateClick,
}) => {
  const { currentOrg } = useRoleContext();
  const [programs, setPrograms] = useState<Map<string, StateProgram>>(new Map());
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState({
    visible: false,
    content: { stateCode: '', stateName: '', status: 'not_offered' as StateProgramStatus },
    x: 0,
    y: 0,
  });

  const orgId = currentOrg?.id || '';

  // Subscribe to state programs
  useEffect(() => {
    if (!orgId || !productId || !productVersionId) return;

    setLoading(true);
    const unsubscribe = subscribeToStatePrograms(
      orgId,
      productId,
      productVersionId,
      (fetchedPrograms) => {
        const map = new Map(fetchedPrograms.map(p => [p.stateCode, p]));
        setPrograms(map);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [orgId, productId, productVersionId]);

  const getStateStatus = (stateCode: string): StateProgramStatus => {
    const program = programs.get(stateCode);
    return program?.status || 'not_offered';
  };

  const getStateName = (stateCode: string): string => {
    return US_STATES.find(s => s.code === stateCode)?.name || stateCode;
  };

  return (
    <Container>
      <MapContainer>
        <ComposableMap projection="geoAlbersUsa" style={{ width: '100%', height: 'auto' }}>
          <Geographies geography="https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json">
            {({ geographies }) =>
              geographies
                .filter(geo => stateNameToCode[geo.properties.name])
                .map(geo => {
                  const stateCode = stateNameToCode[geo.properties.name];
                  const stateName = geo.properties.name;
                  const status = getStateStatus(stateCode);
                  const statusColor = getStatusColor(status);

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={(e) => {
                        setTooltip({
                          visible: true,
                          content: { stateCode, stateName, status },
                          x: e.clientX,
                          y: e.clientY,
                        });
                      }}
                      onMouseMove={(e) => {
                        setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
                      }}
                      onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                      onClick={() => onStateClick?.(stateCode)}
                      style={{
                        default: {
                          fill: statusColor,
                          stroke: '#FFFFFF',
                          strokeWidth: 1.5,
                          outline: 'none',
                          cursor: onStateClick ? 'pointer' : 'default',
                          transition: 'fill 0.2s ease',
                        },
                        hover: {
                          fill: statusColor,
                          stroke: '#FFFFFF',
                          strokeWidth: 2,
                          outline: 'none',
                          cursor: onStateClick ? 'pointer' : 'default',
                          filter: 'brightness(0.9)',
                        },
                        pressed: {
                          fill: statusColor,
                          stroke: '#FFFFFF',
                          strokeWidth: 2,
                          outline: 'none',
                          filter: 'brightness(0.85)',
                        },
                      }}
                    />
                  );
                })
            }
          </Geographies>
        </ComposableMap>
      </MapContainer>

      <Legend>
        {(['active', 'approved', 'filed', 'pending_filing', 'draft', 'not_offered', 'withdrawn'] as StateProgramStatus[]).map(status => (
          <LegendItem key={status}>
            <LegendColor $color={STATE_PROGRAM_STATUS_CONFIG[status].color} />
            {STATE_PROGRAM_STATUS_CONFIG[status].label}
          </LegendItem>
        ))}
      </Legend>

      <MapTooltip
        $visible={tooltip.visible}
        $x={tooltip.x}
        $y={tooltip.y}
      >
        <TooltipState>
          {tooltip.content.stateName} ({tooltip.content.stateCode})
        </TooltipState>
        <TooltipStatus $color={STATE_PROGRAM_STATUS_CONFIG[tooltip.content.status].color}>
          {STATE_PROGRAM_STATUS_CONFIG[tooltip.content.status].label}
        </TooltipStatus>
      </MapTooltip>
    </Container>
  );
};

export default StateProgramMap;

