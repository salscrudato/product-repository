import React, { useMemo } from 'react';
import styled from 'styled-components';
import { CoverageVersion } from '../../types';
import { Timestamp } from 'firebase/firestore';

interface VersionComparisonViewProps {
  version1: CoverageVersion;
  version2: CoverageVersion;
  onClose?: () => void;
}

export const VersionComparisonView: React.FC<VersionComparisonViewProps> = ({
  version1,
  version2,
  onClose,
}) => {
  const formatDate = (date: Date | Timestamp) => {
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—';
    if (typeof value === 'object' && value instanceof Date) return formatDate(value);
    if (typeof value === 'object' && value instanceof Timestamp) return formatDate(value);
    return String(value);
  };

  const differences = useMemo(() => {
    const diffs: Array<{ field: string; label: string; value1: any; value2: any; changed: boolean }> = [];
    
    const snapshot1 = version1.snapshot || {};
    const snapshot2 = version2.snapshot || {};
    
    const fields = [
      { key: 'name', label: 'Coverage Name' },
      { key: 'description', label: 'Description' },
      { key: 'category', label: 'Category' },
      { key: 'coverageType', label: 'Coverage Type' },
      { key: 'isOptional', label: 'Optional' },
      { key: 'isPrimary', label: 'Primary' },
      { key: 'coverageTrigger', label: 'Coverage Trigger' },
      { key: 'waitingPeriod', label: 'Waiting Period' },
      { key: 'waitingPeriodUnit', label: 'Waiting Period Unit' },
      { key: 'allowRetroactiveDate', label: 'Allow Retroactive Date' },
      { key: 'extendedReportingPeriod', label: 'Extended Reporting Period' },
      { key: 'valuationMethod', label: 'Valuation Method' },
      { key: 'depreciationMethod', label: 'Depreciation Method' },
      { key: 'coinsurancePercentage', label: 'Coinsurance %' },
      { key: 'hasCoinsurancePenalty', label: 'Coinsurance Penalty' },
      { key: 'insuredParticipation', label: 'Insured Participation %' },
      { key: 'requiresUnderwriterApproval', label: 'Requires Underwriter Approval' },
      { key: 'eligibilityCriteria', label: 'Eligibility Criteria' },
      { key: 'prohibitedClasses', label: 'Prohibited Classes' },
      { key: 'requiredCoverages', label: 'Required Coverages' },
      { key: 'incompatibleCoverages', label: 'Incompatible Coverages' },
      { key: 'claimsReportingPeriod', label: 'Claims Reporting Period (days)' },
      { key: 'proofOfLossDeadline', label: 'Proof of Loss Deadline (days)' },
      { key: 'hasSubrogationRights', label: 'Subrogation Rights' },
      { key: 'hasSalvageRights', label: 'Salvage Rights' },
      { key: 'territoryType', label: 'Territory Type' },
      { key: 'excludedTerritories', label: 'Excluded Territories' },
      { key: 'includedTerritories', label: 'Included Territories' },
      { key: 'modifiesCoverageId', label: 'Modifies Coverage' },
      { key: 'endorsementType', label: 'Endorsement Type' },
      { key: 'supersedes', label: 'Supersedes' },
    ];
    
    fields.forEach(({ key, label }) => {
      const val1 = snapshot1[key];
      const val2 = snapshot2[key];
      const changed = JSON.stringify(val1) !== JSON.stringify(val2);
      
      diffs.push({
        field: key,
        label,
        value1: val1,
        value2: val2,
        changed,
      });
    });
    
    return diffs;
  }, [version1, version2]);

  const changedFields = differences.filter(d => d.changed);
  const unchangedFields = differences.filter(d => !d.changed);

  return (
    <ComparisonContainer>
      <Header>
        <Title>Version Comparison</Title>
        {onClose && <CloseButton onClick={onClose}>×</CloseButton>}
      </Header>

      <VersionHeaders>
        <VersionHeader>
          <VersionLabel>Version {version1.versionNumber}</VersionLabel>
          <VersionDate>{formatDate(version1.effectiveDate)}</VersionDate>
        </VersionHeader>
        <VersionHeader>
          <VersionLabel>Version {version2.versionNumber}</VersionLabel>
          <VersionDate>{formatDate(version2.effectiveDate)}</VersionDate>
        </VersionHeader>
      </VersionHeaders>

      {changedFields.length > 0 && (
        <Section>
          <SectionTitle>Changes ({changedFields.length})</SectionTitle>
          <ComparisonTable>
            <thead>
              <tr>
                <TableHeader>Field</TableHeader>
                <TableHeader>Version {version1.versionNumber}</TableHeader>
                <TableHeader>Version {version2.versionNumber}</TableHeader>
              </tr>
            </thead>
            <tbody>
              {changedFields.map((diff) => (
                <TableRow key={diff.field} $changed>
                  <FieldCell>{diff.label}</FieldCell>
                  <ValueCell $old>{formatValue(diff.value1)}</ValueCell>
                  <ValueCell $new>{formatValue(diff.value2)}</ValueCell>
                </TableRow>
              ))}
            </tbody>
          </ComparisonTable>
        </Section>
      )}

      {unchangedFields.length > 0 && (
        <Section>
          <SectionTitle>Unchanged Fields ({unchangedFields.length})</SectionTitle>
          <ComparisonTable>
            <thead>
              <tr>
                <TableHeader>Field</TableHeader>
                <TableHeader colSpan={2}>Value</TableHeader>
              </tr>
            </thead>
            <tbody>
              {unchangedFields.map((diff) => (
                <TableRow key={diff.field}>
                  <FieldCell>{diff.label}</FieldCell>
                  <ValueCell colSpan={2}>{formatValue(diff.value1)}</ValueCell>
                </TableRow>
              ))}
            </tbody>
          </ComparisonTable>
        </Section>
      )}
    </ComparisonContainer>
  );
};

const ComparisonContainer = styled.div`
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const CloseButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: #e5e7eb;
    color: #111827;
  }
`;

const VersionHeaders = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 20px 24px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
`;

const VersionHeader = styled.div`
  text-align: center;
`;

const VersionLabel = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
`;

const VersionDate = styled.div`
  font-size: 13px;
  color: #6b7280;
`;

const Section = styled.div`
  padding: 24px;
  
  &:not(:last-child) {
    border-bottom: 1px solid #e5e7eb;
  }
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
`;

const ComparisonTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
`;

const TableRow = styled.tr<{ $changed?: boolean }>`
  background: ${({ $changed }) => $changed ? '#fef3c7' : 'white'};
  
  &:hover {
    background: ${({ $changed }) => $changed ? '#fde68a' : '#f9fafb'};
  }
`;

const FieldCell = styled.td`
  padding: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  border-bottom: 1px solid #e5e7eb;
  width: 30%;
`;

const ValueCell = styled.td<{ $old?: boolean; $new?: boolean }>`
  padding: 12px;
  font-size: 14px;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  
  ${({ $old }) => $old && `
    background: #fee2e2;
    text-decoration: line-through;
    color: #991b1b;
  `}
  
  ${({ $new }) => $new && `
    background: #dcfce7;
    font-weight: 500;
    color: #166534;
  `}
`;

