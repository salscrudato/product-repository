/**
 * MigrationStatusPanel Component
 * Displays migration status for coverage limits/deductibles
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { CheckCircleIcon, ExclamationCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Coverage } from '@types/index';
import { getProductMigrationStatus, isCoverageMigrated } from '@utils/coverageDataHelpers';
import { migrationRegistry, MigrationState } from '@utils/migrationUtils';
import logger, { LOG_CATEGORIES } from '@utils/logger';

interface MigrationStatusPanelProps {
  productId: string;
  coverages: Coverage[];
}

interface CoverageMigrationStatus {
  coverage: Coverage;
  isMigrated: boolean;
  loading: boolean;
}

export const MigrationStatusPanel: React.FC<MigrationStatusPanelProps> = ({
  productId,
  coverages,
}) => {
  const [overallStatus, setOverallStatus] = useState({
    total: 0,
    migrated: 0,
    pending: 0,
    percentage: 0,
  });
  const [coverageStatuses, setCoverageStatuses] = useState<CoverageMigrationStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMigrationStatus();
  }, [productId, coverages]);

  const loadMigrationStatus = async () => {
    setLoading(true);
    try {
      // Check migration registry for recent migrations
      const recentMigrations = migrationRegistry.getByState(MigrationState.COMPLETED);
      if (recentMigrations.length > 0) {
        logger.debug(LOG_CATEGORIES.DATA, 'Found recent migrations', {
          count: recentMigrations.length
        });
      }

      // Get overall status
      const status = await getProductMigrationStatus(productId, coverages);
      setOverallStatus(status);

      // Get individual coverage statuses
      const statuses = await Promise.all(
        coverages.map(async (coverage) => ({
          coverage,
          isMigrated: await isCoverageMigrated(productId, coverage.id),
          loading: false,
        }))
      );
      setCoverageStatuses(statuses);
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Error loading migration status', {}, error as Error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <Header>
          <Title>Migration Status</Title>
        </Header>
        <LoadingMessage>Loading migration status...</LoadingMessage>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Coverage Data Migration Status</Title>
        <RefreshButton onClick={loadMigrationStatus}>Refresh</RefreshButton>
      </Header>

      {/* Overall Progress */}
      <OverallSection>
        <OverallTitle>Overall Progress</OverallTitle>
        <ProgressBar>
          <ProgressFill percentage={overallStatus.percentage} />
        </ProgressBar>
        <ProgressStats>
          <Stat>
            <StatLabel>Total Coverages</StatLabel>
            <StatValue>{overallStatus.total}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Migrated</StatLabel>
            <StatValue success>{overallStatus.migrated}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Pending</StatLabel>
            <StatValue warning={overallStatus.pending > 0}>
              {overallStatus.pending}
            </StatValue>
          </Stat>
          <Stat>
            <StatLabel>Completion</StatLabel>
            <StatValue>{overallStatus.percentage}%</StatValue>
          </Stat>
        </ProgressStats>
      </OverallSection>

      {/* Status Summary */}
      {overallStatus.percentage === 100 ? (
        <SuccessBox>
          <CheckCircleIcon style={{ width: 24, height: 24 }} />
          <SuccessText>
            All coverages have been migrated to the new data structure!
          </SuccessText>
        </SuccessBox>
      ) : (
        <WarningBox>
          <ExclamationCircleIcon style={{ width: 24, height: 24 }} />
          <WarningText>
            {overallStatus.pending} {overallStatus.pending === 1 ? 'coverage' : 'coverages'} still using legacy string arrays.
            Run the migration script to convert to structured data.
          </WarningText>
        </WarningBox>
      )}

      {/* Individual Coverage Status */}
      <CoverageListSection>
        <SectionTitle>Coverage Details</SectionTitle>
        <CoverageList>
          {coverageStatuses.map(({ coverage, isMigrated }) => (
            <CoverageItem key={coverage.id}>
              <CoverageInfo>
                <StatusIcon>
                  {isMigrated ? (
                    <CheckCircleIcon style={{ width: 20, height: 20, color: '#10b981' }} />
                  ) : (
                    <ClockIcon style={{ width: 20, height: 20, color: '#f59e0b' }} />
                  )}
                </StatusIcon>
                <CoverageName>{coverage.name}</CoverageName>
                {coverage.coverageCode && (
                  <CoverageCode>({coverage.coverageCode})</CoverageCode>
                )}
              </CoverageInfo>
              <StatusBadge migrated={isMigrated}>
                {isMigrated ? 'Migrated' : 'Pending'}
              </StatusBadge>
            </CoverageItem>
          ))}
        </CoverageList>
      </CoverageListSection>

      {/* Migration Instructions */}
      {overallStatus.pending > 0 && (
        <InstructionsSection>
          <SectionTitle>Migration Instructions</SectionTitle>
          <InstructionsList>
            <InstructionItem>
              <InstructionNumber>1</InstructionNumber>
              <InstructionText>
                Review the MIGRATION_GUIDE.md for detailed instructions
              </InstructionText>
            </InstructionItem>
            <InstructionItem>
              <InstructionNumber>2</InstructionNumber>
              <InstructionText>
                Run dry-run first: <Code>npm run migrate:limits-deductibles -- --dry-run</Code>
              </InstructionText>
            </InstructionItem>
            <InstructionItem>
              <InstructionNumber>3</InstructionNumber>
              <InstructionText>
                Review dry-run results and verify data mapping
              </InstructionText>
            </InstructionItem>
            <InstructionItem>
              <InstructionNumber>4</InstructionNumber>
              <InstructionText>
                Run actual migration: <Code>npm run migrate:limits-deductibles</Code>
              </InstructionText>
            </InstructionItem>
            <InstructionItem>
              <InstructionNumber>5</InstructionNumber>
              <InstructionText>
                Refresh this panel to verify all coverages are migrated
              </InstructionText>
            </InstructionItem>
          </InstructionsList>
        </InstructionsSection>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const RefreshButton = styled.button`
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: #2563eb;
  }
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 40px;
  color: #6b7280;
  font-size: 14px;
`;

const OverallSection = styled.div`
  margin-bottom: 24px;
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;
`;

const OverallTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 16px 0;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 24px;
  background: #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
`;

const ProgressFill = styled.div<{ percentage: number }>`
  width: ${props => props.percentage}%;
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  color: white;
  font-size: 12px;
  font-weight: 600;
`;

const ProgressStats = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
`;

const Stat = styled.div`
  text-align: center;
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
`;

const StatValue = styled.div<{ success?: boolean; warning?: boolean }>`
  font-size: 24px;
  font-weight: 700;
  color: ${props => {
    if (props.success) return '#10b981';
    if (props.warning) return '#f59e0b';
    return '#111827';
  }};
`;

const SuccessBox = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #d1fae5;
  border: 1px solid #6ee7b7;
  border-radius: 8px;
  margin-bottom: 24px;
  color: #065f46;
`;

const SuccessText = styled.div`
  font-size: 14px;
  font-weight: 500;
`;

const WarningBox = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  margin-bottom: 24px;
  color: #92400e;
`;

const WarningText = styled.div`
  font-size: 14px;
  font-weight: 500;
`;

const CoverageListSection = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
`;

const CoverageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CoverageItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
`;

const CoverageInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const StatusIcon = styled.div`
  display: flex;
  align-items: center;
`;

const CoverageName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #111827;
`;

const CoverageCode = styled.div`
  font-size: 13px;
  color: #6b7280;
`;

const StatusBadge = styled.div<{ migrated: boolean }>`
  padding: 4px 12px;
  background: ${props => props.migrated ? '#d1fae5' : '#fef3c7'};
  color: ${props => props.migrated ? '#065f46' : '#92400e'};
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
`;

const InstructionsSection = styled.div`
  padding: 20px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
`;

const InstructionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InstructionItem = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
`;

const InstructionNumber = styled.div`
  width: 24px;
  height: 24px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
`;

const InstructionText = styled.div`
  font-size: 14px;
  color: #1e3a8a;
  line-height: 1.6;
`;

const Code = styled.code`
  background: #1e3a8a;
  color: #dbeafe;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
`;

