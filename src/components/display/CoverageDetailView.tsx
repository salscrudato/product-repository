/**
 * CoverageDetailView Component
 * Displays comprehensive coverage information including all Phase 2-3 fields
 */

import React from 'react';
import styled from 'styled-components';
import { Coverage } from '../../types';
import { 
  ClockIcon, 
  CurrencyDollarIcon, 
  ShieldCheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

interface CoverageDetailViewProps {
  coverage: Coverage;
}

export const CoverageDetailView: React.FC<CoverageDetailViewProps> = ({ coverage }) => {
  return (
    <Container>
      {/* Basic Information */}
      <Section>
        <SectionTitle>Basic Information</SectionTitle>
        <InfoGrid>
          <InfoItem>
            <Label>Coverage Name</Label>
            <Value>{coverage.name}</Value>
          </InfoItem>
          {coverage.coverageCode && (
            <InfoItem>
              <Label>Coverage Code</Label>
              <Value>{coverage.coverageCode}</Value>
            </InfoItem>
          )}
          {coverage.category && (
            <InfoItem>
              <Label>Category</Label>
              <Value>{coverage.category}</Value>
            </InfoItem>
          )}
          {coverage.description && (
            <InfoItem>
              <Label>Description</Label>
              <Value>{coverage.description}</Value>
            </InfoItem>
          )}
        </InfoGrid>
      </Section>

      {/* Coverage Trigger & Periods */}
      {(coverage.coverageTrigger || coverage.waitingPeriod) && (
        <Section>
          <SectionTitle>
            <ClockIcon style={{ width: 20, height: 20 }} />
            Coverage Trigger & Periods
          </SectionTitle>
          <InfoGrid>
            {coverage.coverageTrigger && (
              <InfoItem>
                <Label>Coverage Trigger</Label>
                <Badge type={coverage.coverageTrigger}>
                  {coverage.coverageTrigger === 'occurrence' && 'Occurrence'}
                  {coverage.coverageTrigger === 'claimsMade' && 'Claims-Made'}
                  {coverage.coverageTrigger === 'hybrid' && 'Hybrid'}
                </Badge>
              </InfoItem>
            )}
            {coverage.waitingPeriod && (
              <InfoItem>
                <Label>Waiting Period</Label>
                <Value>
                  {coverage.waitingPeriod} {coverage.waitingPeriodUnit || 'days'}
                </Value>
              </InfoItem>
            )}
            {coverage.claimsReportingPeriod && (
              <InfoItem>
                <Label>Claims Reporting Period</Label>
                <Value>{coverage.claimsReportingPeriod} days</Value>
              </InfoItem>
            )}
          </InfoGrid>
        </Section>
      )}

      {/* Valuation & Coinsurance */}
      {(coverage.valuationMethod || coverage.coinsurancePercentage) && (
        <Section>
          <SectionTitle>
            <CurrencyDollarIcon style={{ width: 20, height: 20 }} />
            Valuation & Coinsurance
          </SectionTitle>
          <InfoGrid>
            {coverage.valuationMethod && (
              <InfoItem>
                <Label>Valuation Method</Label>
                <Badge type="valuation">
                  {coverage.valuationMethod === 'ACV' && 'Actual Cash Value (ACV)'}
                  {coverage.valuationMethod === 'RC' && 'Replacement Cost (RC)'}
                  {coverage.valuationMethod === 'agreedValue' && 'Agreed Value'}
                  {coverage.valuationMethod === 'marketValue' && 'Market Value'}
                  {coverage.valuationMethod === 'functionalRC' && 'Functional RC'}
                  {coverage.valuationMethod === 'statedAmount' && 'Stated Amount'}
                </Badge>
              </InfoItem>
            )}
            {coverage.depreciationMethod && (
              <InfoItem>
                <Label>Depreciation Method</Label>
                <Value>
                  {coverage.depreciationMethod === 'straightLine' && 'Straight-Line'}
                  {coverage.depreciationMethod === 'decliningBalance' && 'Declining Balance'}
                  {coverage.depreciationMethod === 'unitsOfProduction' && 'Units of Production'}
                  {coverage.depreciationMethod === 'sumOfYearsDigits' && 'Sum of Years Digits'}
                </Value>
              </InfoItem>
            )}
            {coverage.coinsurancePercentage && (
              <InfoItem>
                <Label>Coinsurance Requirement</Label>
                <Value>
                  {coverage.coinsurancePercentage}%
                  {coverage.hasCoinsurancePenalty && ' (with penalty)'}
                  {!coverage.hasCoinsurancePenalty && ' (no penalty)'}
                </Value>
              </InfoItem>
            )}
          </InfoGrid>
        </Section>
      )}

      {/* Underwriting Requirements */}
      {(coverage.requiresUnderwriterApproval || coverage.eligibilityCriteria?.length || 
        coverage.requiredCoverages?.length || coverage.incompatibleCoverages?.length) && (
        <Section>
          <SectionTitle>
            <ShieldCheckIcon style={{ width: 20, height: 20 }} />
            Underwriting Requirements
          </SectionTitle>
          
          {coverage.requiresUnderwriterApproval && (
            <WarningBox>
              ⚠️ This coverage requires underwriter approval before binding
            </WarningBox>
          )}

          {coverage.eligibilityCriteria && coverage.eligibilityCriteria.length > 0 && (
            <SubSection>
              <SubTitle>Eligibility Criteria</SubTitle>
              <List>
                {coverage.eligibilityCriteria.map((criterion, index) => (
                  <ListItem key={index}>✓ {criterion}</ListItem>
                ))}
              </List>
            </SubSection>
          )}

          {coverage.requiredCoverages && coverage.requiredCoverages.length > 0 && (
            <SubSection>
              <SubTitle>Required Coverages</SubTitle>
              <List>
                {coverage.requiredCoverages.map((cov, index) => (
                  <ListItem key={index}>→ {cov}</ListItem>
                ))}
              </List>
            </SubSection>
          )}

          {coverage.incompatibleCoverages && coverage.incompatibleCoverages.length > 0 && (
            <SubSection>
              <SubTitle>Incompatible Coverages</SubTitle>
              <List>
                {coverage.incompatibleCoverages.map((cov, index) => (
                  <ListItem key={index}>✗ {cov}</ListItem>
                ))}
              </List>
            </SubSection>
          )}
        </Section>
      )}

      {/* Claims Management */}
      {(coverage.claimsReportingPeriod || coverage.hasSubrogationRights !== undefined) && (
        <Section>
          <SectionTitle>
            <DocumentTextIcon style={{ width: 20, height: 20 }} />
            Claims Management
          </SectionTitle>
          <InfoGrid>
            {coverage.claimsReportingPeriod && (
              <InfoItem>
                <Label>Claims Reporting Period</Label>
                <Value>{coverage.claimsReportingPeriod} days</Value>
              </InfoItem>
            )}
            {coverage.hasSubrogationRights !== undefined && (
              <InfoItem>
                <Label>Subrogation Rights</Label>
                <Value>{coverage.hasSubrogationRights ? 'Yes' : 'No'}</Value>
              </InfoItem>
            )}
          </InfoGrid>
        </Section>
      )}

      {/* Exclusions */}
      {coverage.exclusions && coverage.exclusions.length > 0 && (
        <Section>
          <SectionTitle>
            <ExclamationTriangleIcon style={{ width: 20, height: 20 }} />
            Exclusions ({coverage.exclusions.length})
          </SectionTitle>
          <List>
            {coverage.exclusions.map((exclusion, index) => (
              <ExclusionItem key={index}>
                <ExclusionHeader>
                  <ExclusionName>{exclusion.name}</ExclusionName>
                  <ExclusionType>{exclusion.type}</ExclusionType>
                </ExclusionHeader>
                {exclusion.description && (
                  <ExclusionDescription>{exclusion.description}</ExclusionDescription>
                )}
              </ExclusionItem>
            ))}
          </List>
        </Section>
      )}

      {/* Conditions */}
      {coverage.conditions && coverage.conditions.length > 0 && (
        <Section>
          <SectionTitle>
            <ClipboardDocumentListIcon style={{ width: 20, height: 20 }} />
            Conditions ({coverage.conditions.length})
          </SectionTitle>
          <List>
            {coverage.conditions.map((condition, index) => (
              <ConditionItem key={index}>
                <ConditionHeader>
                  <ConditionName>{condition.name}</ConditionName>
                  <ConditionBadges>
                    <ConditionType>{condition.type}</ConditionType>
                    {condition.isRequired && <RequiredBadge>Required</RequiredBadge>}
                    {condition.isSuspending && <SuspendingBadge>Suspending</SuspendingBadge>}
                  </ConditionBadges>
                </ConditionHeader>
                {condition.description && (
                  <ConditionDescription>{condition.description}</ConditionDescription>
                )}
              </ConditionItem>
            ))}
          </List>
        </Section>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px;
  background: white;
  border-radius: 8px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #e5e7eb;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Value = styled.div`
  font-size: 15px;
  color: #111827;
  font-weight: 500;
`;

const Badge = styled.span<{ type?: string }>`
  display: inline-block;
  padding: 4px 12px;
  background: ${props => {
    if (props.type === 'occurrence') return '#dbeafe';
    if (props.type === 'claimsMade') return '#fef3c7';
    if (props.type === 'hybrid') return '#e0e7ff';
    return '#f3f4f6';
  }};
  color: ${props => {
    if (props.type === 'occurrence') return '#1e40af';
    if (props.type === 'claimsMade') return '#92400e';
    if (props.type === 'hybrid') return '#4338ca';
    return '#374151';
  }};
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
`;

const SubSection = styled.div`
  margin-top: 8px;
`;

const SubTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ListItem = styled.li`
  font-size: 14px;
  color: #374151;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 4px;
`;

const WarningBox = styled.div`
  padding: 12px;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 6px;
  color: #92400e;
  font-size: 14px;
  font-weight: 500;
`;

const ExclusionItem = styled.li`
  padding: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
`;

const ExclusionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`;

const ExclusionName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #991b1b;
`;

const ExclusionType = styled.span`
  padding: 2px 8px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
`;

const ExclusionDescription = styled.div`
  font-size: 13px;
  color: #7f1d1d;
  margin-top: 4px;
`;

const ConditionItem = styled.li`
  padding: 12px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
`;

const ConditionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`;

const ConditionName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #1e40af;
`;

const ConditionBadges = styled.div`
  display: flex;
  gap: 6px;
`;

const ConditionType = styled.span`
  padding: 2px 8px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
`;

const RequiredBadge = styled.span`
  padding: 2px 8px;
  background: #fef3c7;
  color: #d97706;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
`;

const SuspendingBadge = styled.span`
  padding: 2px 8px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
`;

const ConditionDescription = styled.div`
  font-size: 13px;
  color: #1e3a8a;
  margin-top: 4px;
`;

