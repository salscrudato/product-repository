/**
 * AI Suggestions Panel for Deductibles
 *
 * Apple-inspired design for AI-powered deductible suggestions.
 * Clean, minimal, with elegant typography and smooth interactions.
 */

import React, { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { SparklesIcon, CheckIcon } from '@heroicons/react/24/outline';
import { detectCoverageType, CoverageCategory } from '../../utils/coverageTypeDetector';
import { ALL_DEDUCTIBLE_TEMPLATES, getRecommendedDeductibleTemplates, DeductibleOptionTemplate } from '../../data/deductibleTemplates';
import { DeductibleStructure, CoverageDeductibleOption } from '../../types/deductibleOptions';

interface AISuggestionsPanelProps {
  coverageName: string;
  onApplyTemplate: (template: DeductibleOptionTemplate) => void;
  compact?: boolean;
}

// Format deductible amounts: $1,000 → $1K, $500 → $500
const formatDeductibleAmount = (amount: number): string => {
  if (amount >= 1000000) {
    const millions = amount / 1000000;
    return millions % 1 === 0 ? `$${millions}M` : `$${millions.toFixed(1)}M`;
  } else if (amount >= 1000) {
    const thousands = amount / 1000;
    return thousands % 1 === 0 ? `$${thousands}K` : `$${thousands.toFixed(1)}K`;
  }
  return `$${amount.toLocaleString()}`;
};

// Get deductible range from template options
const getDeductibleRange = (options: Partial<CoverageDeductibleOption>[]): string => {
  // Handle percentage-based deductibles
  const percentages = options.filter(o => (o as any).percentage).map(o => (o as any).percentage! as number).sort((a, b) => a - b);
  if (percentages.length > 0) {
    if (percentages.length === 1) return `${percentages[0]}%`;
    return `${percentages[0]}% – ${percentages[percentages.length - 1]}%`;
  }

  // Handle waiting periods
  const periods = options.filter(o => (o as any).duration).map(o => (o as any).duration! as number).sort((a, b) => a - b);
  if (periods.length > 0) {
    if (periods.length === 1) return `${periods[0]} days`;
    return `${periods[0]} – ${periods[periods.length - 1]} days`;
  }

  // Handle flat amounts
  const amounts = options.map(o => (o as any).amount || 0).filter((a: number) => a >= 0).sort((a: number, b: number) => a - b);
  if (amounts.length === 0) return '';
  if (amounts.length === 1) return formatDeductibleAmount(amounts[0]);
  return `${formatDeductibleAmount(amounts[0])} – ${formatDeductibleAmount(amounts[amounts.length - 1])}`;
};

const CATEGORY_LABELS: Record<CoverageCategory, string> = {
  property: 'Property',
  liability: 'General Liability',
  auto: 'Auto',
  workers_comp: 'Workers\' Comp',
  professional: 'Professional',
  cyber: 'Cyber',
  marine: 'Inland Marine',
  umbrella: 'Umbrella',
  unknown: 'General',
};

const STRUCTURE_LABELS: Record<DeductibleStructure, string> = {
  flat: 'Flat Amount',
  percentage: 'Percentage',
  percentMinMax: '% with Min/Max',
  waitingPeriod: 'Waiting Period',
  perilSpecific: 'Peril-Specific',
  disappearing: 'Disappearing',
  franchise: 'Franchise',
  aggregate: 'Aggregate',
  custom: 'Custom',
};

export const DeductibleAISuggestionsPanel: React.FC<AISuggestionsPanelProps> = ({
  coverageName,
  onApplyTemplate,
  compact = false
}) => {
  const detection = useMemo(() => detectCoverageType(coverageName), [coverageName]);
  const recommendedIds = useMemo(() => getRecommendedDeductibleTemplates(detection.category), [detection.category]);

  const suggestedTemplates = useMemo(() => {
    const recommended = recommendedIds
      .map(id => ALL_DEDUCTIBLE_TEMPLATES.find(t => t.id === id))
      .filter((t): t is DeductibleOptionTemplate => !!t);
    const others = ALL_DEDUCTIBLE_TEMPLATES.filter(t => !recommendedIds.includes(t.id));
    return { recommended, others };
  }, [recommendedIds]);

  if (compact) {
    return (
      <CompactContainer>
        <CompactHeader>
          <AIBadge><SparklesIcon /></AIBadge>
          <span>Quick Apply</span>
        </CompactHeader>
        <CompactGrid>
          {suggestedTemplates.recommended.slice(0, 3).map(template => (
            <CompactCard key={template.id} onClick={() => onApplyTemplate(template)}>
              <CompactCardTitle>{template.name.split(' - ')[1] || template.name}</CompactCardTitle>
              <CompactCardRange>{getDeductibleRange(template.options)}</CompactCardRange>
            </CompactCard>
          ))}
        </CompactGrid>
      </CompactContainer>
    );
  }

  return (
    <Container>
      <Header>
        <AIIconWrapper>
          <SparklesIcon />
        </AIIconWrapper>
        <HeaderText>
          <HeaderTitle>Intelligent Suggestions</HeaderTitle>
          <HeaderMeta>
            <CategoryPill>{CATEGORY_LABELS[detection.category]}</CategoryPill>
            {detection.confidence > 0.7 && <ConfidenceDot />}
          </HeaderMeta>
        </HeaderText>
      </Header>

      <TemplateList>
        {suggestedTemplates.recommended.map((template, index) => (
          <TemplateRow key={template.id} $delay={index * 50}>
            <TemplateMain>
              <TemplateHeader>
                <TemplateName>{template.name}</TemplateName>
                <StructurePill>{STRUCTURE_LABELS[template.structure]}</StructurePill>
              </TemplateHeader>
              <TemplateDetails>
                <DeductibleRange>{getDeductibleRange(template.options)}</DeductibleRange>
                <Separator>•</Separator>
                <OptionCount>{template.options.length} options</OptionCount>
              </TemplateDetails>
            </TemplateMain>
            <ApplyButton onClick={() => onApplyTemplate(template)}>
              <CheckIcon />
              <span>Apply</span>
            </ApplyButton>
          </TemplateRow>
        ))}
      </TemplateList>

      {suggestedTemplates.others.length > 0 && (
        <OtherSection>
          <OtherLabel>More Templates</OtherLabel>
          <OtherGrid>
            {suggestedTemplates.others.map(template => (
              <OtherCard key={template.id} onClick={() => onApplyTemplate(template)}>
                <OtherCardName>{template.name}</OtherCardName>
                <OtherCardMeta>
                  {getDeductibleRange(template.options)} • {template.options.length} opts
                </OtherCardMeta>
              </OtherCard>
            ))}
          </OtherGrid>
        </OtherSection>
      )}
    </Container>
  );
};

// Apple-inspired animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Apple-inspired styled components
const Container = styled.div`
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  padding: 24px;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 4px 12px rgba(0, 0, 0, 0.03);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
`;

const AIIconWrapper = styled.div`
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #10B981, #059669, #047857);
  background-size: 200% 200%;
  animation: ${shimmer} 3s ease infinite;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  svg {
    width: 22px;
    height: 22px;
    color: white;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
  }
`;

const HeaderText = styled.div`
  flex: 1;
`;

const HeaderTitle = styled.div`
  font-weight: 600;
  font-size: 17px;
  color: #1D1D1F;
  letter-spacing: -0.02em;
`;

const HeaderMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
`;

const CategoryPill = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: #10B981;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));
  padding: 4px 10px;
  border-radius: 100px;
`;

const ConfidenceDot = styled.span`
  width: 6px;
  height: 6px;
  background: #34C759;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.2);
`;

const TemplateList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const TemplateRow = styled.div<{ $delay: number }>`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  animation: ${fadeIn} 0.4s ease forwards;
  animation-delay: ${p => p.$delay}ms;
  opacity: 0;

  &:hover {
    border-color: rgba(16, 185, 129, 0.3);
    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.08);
    transform: translateY(-1px);
  }
`;

const TemplateMain = styled.div`
  flex: 1;
  min-width: 0;
`;

const TemplateHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
`;

const TemplateName = styled.div`
  font-weight: 600;
  font-size: 15px;
  color: #1D1D1F;
  letter-spacing: -0.01em;
`;

const StructurePill = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: #86868B;
  background: #F5F5F7;
  padding: 3px 8px;
  border-radius: 6px;
`;

const TemplateDetails = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DeductibleRange = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #10B981;
  font-feature-settings: 'tnum';
`;

const Separator = styled.span`
  color: #D2D2D7;
  font-size: 12px;
`;

const OptionCount = styled.span`
  font-size: 13px;
  color: #86868B;
`;

const ApplyButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: #1D1D1F;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);

  svg { width: 16px; height: 16px; }

  &:hover {
    background: #3A3A3C;
    transform: scale(1.02);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const OtherSection = styled.div`
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
`;

const OtherLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #86868B;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 12px;
`;

const OtherGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
`;

const OtherCard = styled.button`
  text-align: left;
  padding: 14px;
  background: #F5F5F7;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: white;
    border-color: rgba(0, 0, 0, 0.08);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }
`;

const OtherCardName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #1D1D1F;
  margin-bottom: 4px;
`;

const OtherCardMeta = styled.div`
  font-size: 12px;
  color: #86868B;
`;

// Compact variant styles
const CompactContainer = styled.div`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  padding: 16px;
`;

const CompactHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`;

const AIBadge = styled.div`
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #10B981, #047857);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  svg { width: 14px; height: 14px; color: white; }
`;

const CompactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

const CompactCard = styled.button`
  text-align: center;
  padding: 12px 8px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #10B981;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.12);
  }
`;

const CompactCardTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #1D1D1F;
  margin-bottom: 4px;
`;

const CompactCardRange = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: #10B981;
`;

