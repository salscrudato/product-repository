/**
 * ClaimsSection Component
 * Section for managing claims-related settings
 */

import React, { memo, useCallback } from 'react';
import styled from 'styled-components';
import {
  ClipboardDocumentListIcon,
  CameraIcon,
  HandshakeIcon,
  ScaleIcon
} from '@heroicons/react/24/outline';

interface ClaimsSectionProps {
  claimsReportingPeriod?: number;
  hasSubrogationRights?: boolean;
  onChange: (data: {
    claimsReportingPeriod?: number;
    hasSubrogationRights?: boolean;
  }) => void;
}

export const ClaimsSection = memo<ClaimsSectionProps>(({
  claimsReportingPeriod,
  hasSubrogationRights = true,
  onChange,
}) => {
  // Memoized callbacks to prevent unnecessary re-renders
  const handleReportingPeriodChange = useCallback((value: number | undefined) => {
    onChange({
      claimsReportingPeriod: value,
      hasSubrogationRights,
    });
  }, [onChange, hasSubrogationRights]);

  const handleSubrogationChange = useCallback((checked: boolean) => {
    onChange({
      claimsReportingPeriod,
      hasSubrogationRights: checked,
    });
  }, [onChange, claimsReportingPeriod]);

  return (
    <Container>
      <SectionTitle>Claims Management</SectionTitle>
      <HelpText>
        Configure claims reporting requirements and subrogation rights
      </HelpText>

      {/* Claims Reporting Period */}
      <SubSection>
        <SubTitle>Claims Reporting Period</SubTitle>
        <SubHelpText>
          Maximum number of days after a loss occurs to report a claim
        </SubHelpText>

        <InputRow>
          <NumberInput
            type="number"
            min="0"
            placeholder="Enter days"
            value={claimsReportingPeriod || ''}
            onChange={(e) => handleReportingPeriodChange(e.target.value ? parseInt(e.target.value) : undefined)}
          />
          <UnitLabel>days</UnitLabel>
        </InputRow>

        {claimsReportingPeriod && (
          <DisplayValue>
            Claims must be reported within {claimsReportingPeriod} days of the loss
          </DisplayValue>
        )}

        <InfoBox>
          <InfoTitle>Common Reporting Periods</InfoTitle>
          <InfoList>
            <InfoItem><strong>Property Insurance:</strong> 30-60 days</InfoItem>
            <InfoItem><strong>Auto Insurance:</strong> Immediate to 30 days</InfoItem>
            <InfoItem><strong>Liability Insurance:</strong> As soon as practicable</InfoItem>
            <InfoItem><strong>Workers' Compensation:</strong> 24-48 hours for serious injuries</InfoItem>
          </InfoList>
        </InfoBox>
      </SubSection>

      {/* Subrogation Rights */}
      <SubSection>
        <SubTitle>Subrogation Rights</SubTitle>
        <SubHelpText>
          Insurer's right to pursue recovery from third parties responsible for the loss
        </SubHelpText>

        <CheckboxRow>
          <Checkbox
            type="checkbox"
            checked={hasSubrogationRights}
            onChange={(e) => handleSubrogationChange(e.target.checked)}
          />
          <CheckboxLabel>Insurer has subrogation rights</CheckboxLabel>
        </CheckboxRow>

        {hasSubrogationRights ? (
          <InfoBox>
            <InfoTitle>Subrogation Enabled</InfoTitle>
            <InfoText>
              After paying a claim, the insurer may pursue recovery from third parties who caused
              the loss. The insured must cooperate with subrogation efforts and cannot waive rights
              against third parties without insurer consent.
            </InfoText>
          </InfoBox>
        ) : (
          <WarningBox>
            <WarningTitle>Subrogation Waived</WarningTitle>
            <WarningText>
              The insurer waives subrogation rights. This is uncommon and typically only used in 
              specific situations such as:
              <ul>
                <li>Blanket waivers for all tenants in a building</li>
                <li>Contractual requirements (e.g., construction contracts)</li>
                <li>Related entities or subsidiaries</li>
              </ul>
              Waiving subrogation may increase premium costs.
            </WarningText>
          </WarningBox>
        )}
      </SubSection>

      {/* Additional Claims Information */}
      <SubSection>
        <SubTitle>Claims Process Notes</SubTitle>
        <SubHelpText>
          Key points about the claims process for this coverage
        </SubHelpText>

        <NotesList>
          <NoteItem>
            <NoteIcon><ClipboardDocumentListIcon /></NoteIcon>
            <NoteText>
              <strong>Notice of Loss:</strong> Insured must provide prompt notice of any occurrence
              that may result in a claim
            </NoteText>
          </NoteItem>
          <NoteItem>
            <NoteIcon><CameraIcon /></NoteIcon>
            <NoteText>
              <strong>Documentation:</strong> Insured should document the loss with photos, receipts,
              and witness statements
            </NoteText>
          </NoteItem>
          <NoteItem>
            <NoteIcon><HandshakeIcon /></NoteIcon>
            <NoteText>
              <strong>Cooperation:</strong> Insured must cooperate with the insurer's investigation
              and provide requested information
            </NoteText>
          </NoteItem>
          <NoteItem>
            <NoteIcon><ScaleIcon /></NoteIcon>
            <NoteText>
              <strong>No Admission:</strong> Insured should not admit liability or make settlements
              without insurer approval
            </NoteText>
          </NoteItem>
        </NotesList>
      </SubSection>
    </Container>
  );
});

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const HelpText = styled.p`
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
  margin: -12px 0 0 0;
`;

const SubSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
`;

const SubTitle = styled.h4`
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  margin: 0;
`;

const SubHelpText = styled.span`
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
`;

const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const NumberInput = styled.input`
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #111827;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const UnitLabel = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
`;

const DisplayValue = styled.div`
  padding: 8px 12px;
  background: #f3f4f6;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  font-weight: 500;
`;

const CheckboxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  font-size: 14px;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
`;

const InfoBox = styled.div`
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 12px;
`;

const InfoTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #1e40af;
  margin-bottom: 8px;
`;

const InfoText = styled.div`
  font-size: 13px;
  color: #1e3a8a;
  line-height: 1.6;
`;

const InfoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const InfoItem = styled.li`
  font-size: 13px;
  color: #1e3a8a;
  line-height: 1.5;

  strong {
    color: #1e40af;
    font-weight: 600;
  }
`;

const WarningBox = styled.div`
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 6px;
  padding: 12px;
`;

const WarningTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 8px;
`;

const WarningText = styled.div`
  font-size: 13px;
  color: #78350f;
  line-height: 1.6;

  ul {
    margin: 8px 0 0 0;
    padding-left: 20px;
  }

  li {
    margin: 4px 0;
  }
`;

const NotesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const NoteItem = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
`;

const NoteIcon = styled.div`
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  color: #6366f1;

  svg {
    width: 100%;
    height: 100%;
  }
`;

const NoteText = styled.div`
  font-size: 13px;
  color: #374151;
  line-height: 1.6;

  strong {
    color: #111827;
    font-weight: 600;
  }
`;

