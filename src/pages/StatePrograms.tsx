/**
 * StatePrograms Page
 * State Programs management with matrix and map views
 * Route: /products/:productId/versions/:productVersionId/states
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import {
  ChevronLeftIcon,
  TableCellsIcon,
  MapIcon,
  PlusIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  AdjustmentsHorizontalIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { colors } from '@components/common/DesignSystem';
import { StateProgramMatrix } from '@/components/states/StateProgramMatrix';
import { StateProgramMap } from '@/components/states/StateProgramMap';
import StateDeviationsList from '@/components/states/StateDeviationsList';
import StateDeviationsPanel from '@/components/states/StateDeviationsPanel';
import { useRoleContext } from '@/context/RoleContext';
import MainNavigation from '@/components/ui/Navigation';
import {
  initializeStatePrograms,
  getStateProgramsSummary,
} from '@/services/stateProgramService';

// ============================================================================
// Styled Components
// ============================================================================

const PageContainer = styled.div`
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  gap: 24px;
  flex-wrap: wrap;
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: ${colors.gray600};
  text-decoration: none;
  font-size: 14px;
  margin-bottom: 8px;

  &:hover {
    color: ${colors.primary};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const Title = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: ${colors.gray900};
`;

const Subtitle = styled.p`
  margin: 0;
  color: ${colors.gray600};
  font-size: 14px;
`;

const HeaderRight = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const ViewToggle = styled.div`
  display: flex;
  background: ${colors.gray100};
  border-radius: 8px;
  padding: 4px;
`;

const ViewToggleButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  background: ${props => props.$active ? 'white' : 'transparent'};
  color: ${props => props.$active ? colors.gray900 : colors.gray600};
  box-shadow: ${props => props.$active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};

  &:hover {
    color: ${colors.gray900};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  background: ${colors.primary};
  color: white;

  &:hover {
    background: ${colors.primaryDark};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const SecondaryButton = styled(ActionButton)`
  background: white;
  color: ${colors.gray700};
  border: 1px solid ${colors.gray300};

  &:hover {
    background: ${colors.gray50};
    border-color: ${colors.gray400};
  }
`;

const Content = styled.div`
  background: white;
  border-radius: 12px;
  border: 1px solid ${colors.gray200};
  padding: 24px;
`;

const SummaryBar = styled.div`
  display: flex;
  gap: 24px;
  padding: 16px 24px;
  background: ${colors.gray50};
  border-radius: 8px;
  margin-bottom: 24px;
`;

const SummaryItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: ${colors.gray700};

  svg {
    width: 18px;
    height: 18px;
  }
`;

const SummaryValue = styled.span`
  font-weight: 600;
  color: ${colors.gray900};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
`;

const EmptyStateIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${colors.gray100};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;

  svg {
    width: 32px;
    height: 32px;
    color: ${colors.gray400};
  }
`;

const EmptyStateTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: ${colors.gray900};
`;

const EmptyStateText = styled.p`
  margin: 0 0 24px;
  font-size: 14px;
  color: ${colors.gray600};
  max-width: 400px;
`;

// ============================================================================
// Component
// ============================================================================

type ViewMode = 'matrix' | 'map' | 'deviations';

export const StatePrograms: React.FC = () => {
  const { productId, productVersionId } = useParams<{
    productId: string;
    productVersionId: string;
  }>();
  const navigate = useNavigate();
  const { currentOrg, user } = useRoleContext();

  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [summary, setSummary] = useState<{
    total: number;
    activeCount: number;
    readyToActivate: number;
    blockedCount: number;
  } | null>(null);
  const [initializing, setInitializing] = useState(false);

  // Deviations state
  const [selectedState, setSelectedState] = useState<{ code: string; name: string } | null>(null);
  // Placeholder base config — in production this comes from the product version
  const [baseConfig] = useState<Record<string, unknown>>({});

  const orgId = currentOrg?.id || '';

  // Load summary
  const loadSummary = useCallback(async () => {
    if (!orgId || !productId || !productVersionId) return;

    try {
      const result = await getStateProgramsSummary(orgId, productId, productVersionId);
      setSummary(result);
    } catch (error) {
      // Silently handle — summary will remain null and empty state shown
    }
  }, [orgId, productId, productVersionId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Initialize all state programs
  const handleInitialize = async () => {
    if (!orgId || !productId || !productVersionId || !user) return;

    setInitializing(true);
    try {
      await initializeStatePrograms(orgId, productId, productVersionId, user.uid);
      await loadSummary();
    } catch (error) {
      // Silently handle — initializing flag reset in finally block
    } finally {
      setInitializing(false);
    }
  };

  // Handle state click - navigate to detail/edit
  const handleStateClick = (stateCode: string) => {
    // For now, just log - could open a modal or navigate to detail page
    // State detail/edit: could open modal or navigate to detail page
  };

  if (!productId || !productVersionId) {
    return <div>Missing product or version ID</div>;
  }

  return (
    <>
    <MainNavigation />
    <PageContainer>
      <Header>
        <HeaderLeft>
          <BackLink to={`/products/${productId}`}>
            <ChevronLeftIcon />
            Back to Product
          </BackLink>
          <Title>State Programs</Title>
          <Subtitle>
            Manage state filing statuses, required artifacts, and activation gating
          </Subtitle>
        </HeaderLeft>

        <HeaderRight>
          <ViewToggle>
            <ViewToggleButton
              $active={viewMode === 'matrix'}
              onClick={() => setViewMode('matrix')}
            >
              <TableCellsIcon />
              Matrix
            </ViewToggleButton>
            <ViewToggleButton
              $active={viewMode === 'map'}
              onClick={() => setViewMode('map')}
            >
              <MapIcon />
              Map
            </ViewToggleButton>
            <ViewToggleButton
              $active={viewMode === 'deviations'}
              onClick={() => { setViewMode('deviations'); setSelectedState(null); }}
            >
              <AdjustmentsHorizontalIcon />
              Deviations
            </ViewToggleButton>
          </ViewToggle>

          <SecondaryButton onClick={loadSummary}>
            <ArrowPathIcon />
            Refresh
          </SecondaryButton>

          {summary && summary.total === 0 && (
            <ActionButton onClick={handleInitialize} disabled={initializing}>
              <PlusIcon />
              {initializing ? 'Initializing...' : 'Initialize All States'}
            </ActionButton>
          )}
        </HeaderRight>
      </Header>

      {summary && summary.total > 0 && (
        <SummaryBar>
          <SummaryItem>
            <CheckCircleIcon style={{ color: colors.success }} />
            <SummaryValue>{summary.activeCount}</SummaryValue> active states
          </SummaryItem>
          <SummaryItem>
            <CheckCircleIcon style={{ color: colors.primary }} />
            <SummaryValue>{summary.readyToActivate}</SummaryValue> ready to activate
          </SummaryItem>
          {summary.blockedCount > 0 && (
            <SummaryItem>
              <ExclamationTriangleIcon style={{ color: colors.error }} />
              <SummaryValue>{summary.blockedCount}</SummaryValue> blocked
            </SummaryItem>
          )}
        </SummaryBar>
      )}

      <Content>
        {summary && summary.total === 0 ? (
          <EmptyState>
            <EmptyStateIcon>
              <MapIcon />
            </EmptyStateIcon>
            <EmptyStateTitle>No State Programs Configured</EmptyStateTitle>
            <EmptyStateText>
              Initialize state programs to start configuring filing statuses,
              required artifacts, and activation gating for each state.
            </EmptyStateText>
            <ActionButton onClick={handleInitialize} disabled={initializing}>
              <PlusIcon />
              {initializing ? 'Initializing...' : 'Initialize All States'}
            </ActionButton>
          </EmptyState>
        ) : viewMode === 'deviations' ? (
          selectedState ? (
            <div>
              <button
                onClick={() => setSelectedState(null)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: 14, color: colors.gray600, marginBottom: 16,
                  padding: 0,
                }}
              >
                <ArrowLeftIcon style={{ width: 16, height: 16 }} />
                Back to state list
              </button>
              <StateDeviationsPanel
                orgId={orgId}
                productId={productId}
                versionId={productVersionId}
                stateCode={selectedState.code}
                stateName={selectedState.name}
                baseConfig={baseConfig}
              />
            </div>
          ) : (
            <StateDeviationsList
              orgId={orgId}
              productId={productId}
              versionId={productVersionId}
              baseConfig={baseConfig}
              onSelectState={(code, name) => setSelectedState({ code, name })}
            />
          )
        ) : viewMode === 'matrix' ? (
          <StateProgramMatrix
            productId={productId}
            productVersionId={productVersionId}
            onStateClick={handleStateClick}
          />
        ) : (
          <StateProgramMap
            productId={productId}
            productVersionId={productVersionId}
            onStateClick={handleStateClick}
          />
        )}
      </Content>
    </PageContainer>
    </>
  );
};

export default StatePrograms;

