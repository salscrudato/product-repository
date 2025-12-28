/**
 * AISuggestionsSidebar - Proactive AI suggestions panel
 * Shows templates, similar coverages, and industry recommendations
 */

import React, { useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  SparklesIcon,
  LightBulbIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  CheckIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { SparklesIcon as SparklesSolid } from '@heroicons/react/24/solid';
import { Coverage, CoverageSimilarityMatch } from '../../types';
import { slideInRight, fadeInScale } from '../../styles/copilotAnimations';

interface CoverageTemplate {
  id: string;
  name: string;
  description: string;
  matchScore: number;
  fieldCount: number;
  category: string;
}

interface IndustryBenchmark {
  field: string;
  label: string;
  commonValue: string;
  currentValue?: string;
  isAligned: boolean;
}

interface ProactiveSuggestion {
  id: string;
  type: 'tip' | 'warning' | 'recommendation';
  message: string;
  action?: () => void;
  actionLabel?: string;
}

interface AISuggestionsSidebarProps {
  draft: Partial<Coverage>;
  templates?: CoverageTemplate[];
  similarCoverages?: CoverageSimilarityMatch[];
  benchmarks?: IndustryBenchmark[];
  suggestions?: ProactiveSuggestion[];
  onApplyTemplate?: (templateId: string) => void;
  onViewSimilar?: (coverageId: string) => void;
  onApplyBenchmark?: (field: string, value: string) => void;
  isLoading?: boolean;
}

// Default industry benchmarks for P&C
const DEFAULT_BENCHMARKS: IndustryBenchmark[] = [
  { field: 'coinsurancePercentage', label: 'Coinsurance', commonValue: '80%', isAligned: false },
  { field: 'valuationMethod', label: 'Valuation', commonValue: 'RC', isAligned: false },
  { field: 'coverageTrigger', label: 'Trigger', commonValue: 'occurrence', isAligned: false },
];

export const AISuggestionsSidebar: React.FC<AISuggestionsSidebarProps> = ({
  draft,
  templates = [],
  similarCoverages = [],
  benchmarks = DEFAULT_BENCHMARKS,
  suggestions = [],
  onApplyTemplate,
  onViewSimilar,
  onApplyBenchmark,
  isLoading = false,
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('suggestions');

  // Calculate benchmark alignment
  const alignedBenchmarks = useMemo(() => {
    return benchmarks.map(b => ({
      ...b,
      currentValue: draft[b.field as keyof Coverage]?.toString(),
      isAligned: draft[b.field as keyof Coverage]?.toString() === b.commonValue,
    }));
  }, [benchmarks, draft]);

  const alignedCount = alignedBenchmarks.filter(b => b.isAligned).length;

  // Generate proactive suggestions based on draft state
  const autoSuggestions = useMemo((): ProactiveSuggestion[] => {
    const result: ProactiveSuggestion[] = [];
    
    if (!draft.coinsurancePercentage) {
      result.push({
        id: 'coinsurance',
        type: 'recommendation',
        message: 'Consider adding 80% coinsurance (industry standard)',
        actionLabel: 'Apply',
      });
    }
    
    if (!draft.valuationMethod) {
      result.push({
        id: 'valuation',
        type: 'tip',
        message: 'Replacement Cost (RC) is the most common valuation method',
        actionLabel: 'Apply RC',
      });
    }
    
    if (draft.coverageTrigger === 'claimsMade' && !draft.waitingPeriod) {
      result.push({
        id: 'waiting',
        type: 'warning',
        message: 'Claims-made coverage typically requires a waiting period',
      });
    }

    if (!draft.coverageTrigger) {
      result.push({
        id: 'trigger',
        type: 'tip',
        message: 'Occurrence trigger is standard for most property coverages',
        actionLabel: 'Apply',
      });
    }

    return [...suggestions, ...result];
  }, [draft, suggestions]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <Container>
      <Header>
        <HeaderIcon>
          <SparklesSolid />
        </HeaderIcon>
        <HeaderText>
          <h3>AI Insights</h3>
          <p>Proactive recommendations</p>
        </HeaderText>
      </Header>

      {isLoading ? (
        <LoadingState>
          <LoadingSpinner />
          <span>Analyzing coverage...</span>
        </LoadingState>
      ) : (
        <Content>
          {/* Proactive Suggestions */}
          {autoSuggestions.length > 0 && (
            <Section>
              <SectionHeader onClick={() => toggleSection('suggestions')}>
                <SectionIcon $color="#8b5cf6"><LightBulbIcon /></SectionIcon>
                <SectionTitle>Smart Suggestions</SectionTitle>
                <Badge>{autoSuggestions.length}</Badge>
                <ChevronIcon $expanded={expandedSection === 'suggestions'}>
                  <ChevronRightIcon />
                </ChevronIcon>
              </SectionHeader>
              {expandedSection === 'suggestions' && (
                <SectionContent>
                  {autoSuggestions.map((suggestion, index) => (
                    <SuggestionCard key={suggestion.id} $type={suggestion.type} $delay={index}>
                      <SuggestionIcon $type={suggestion.type}>
                        {suggestion.type === 'warning' ? <ExclamationTriangleIcon /> : <LightBulbIcon />}
                      </SuggestionIcon>
                      <SuggestionText>{suggestion.message}</SuggestionText>
                      {suggestion.actionLabel && (
                        <SuggestionAction onClick={suggestion.action}>
                          {suggestion.actionLabel}
                        </SuggestionAction>
                      )}
                    </SuggestionCard>
                  ))}
                </SectionContent>
              )}
            </Section>
          )}

          {/* Similar Coverages Warning */}
          {similarCoverages.length > 0 && (
            <Section>
              <SectionHeader onClick={() => toggleSection('similar')}>
                <SectionIcon $color="#f59e0b"><DocumentDuplicateIcon /></SectionIcon>
                <SectionTitle>Similar Coverages</SectionTitle>
                <WarningBadge>{similarCoverages.length}</WarningBadge>
                <ChevronIcon $expanded={expandedSection === 'similar'}>
                  <ChevronRightIcon />
                </ChevronIcon>
              </SectionHeader>
              {expandedSection === 'similar' && (
                <SectionContent>
                  {similarCoverages.slice(0, 3).map((match, index) => (
                    <SimilarCard key={match.coverageId} $delay={index}>
                      <SimilarInfo>
                        <SimilarName>{match.name}</SimilarName>
                        <SimilarMatch>{match.similarity}% match</SimilarMatch>
                      </SimilarInfo>
                      <ViewButton onClick={() => onViewSimilar?.(match.coverageId)}>
                        View
                      </ViewButton>
                    </SimilarCard>
                  ))}
                </SectionContent>
              )}
            </Section>
          )}

          {/* Industry Benchmarks */}
          <Section>
            <SectionHeader onClick={() => toggleSection('benchmarks')}>
              <SectionIcon $color="#10b981"><ChartBarIcon /></SectionIcon>
              <SectionTitle>Industry Standards</SectionTitle>
              <AlignmentBadge $aligned={alignedCount === alignedBenchmarks.length}>
                {alignedCount}/{alignedBenchmarks.length}
              </AlignmentBadge>
              <ChevronIcon $expanded={expandedSection === 'benchmarks'}>
                <ChevronRightIcon />
              </ChevronIcon>
            </SectionHeader>
            {expandedSection === 'benchmarks' && (
              <SectionContent>
                {alignedBenchmarks.map((benchmark, index) => (
                  <BenchmarkCard key={benchmark.field} $delay={index}>
                    <BenchmarkInfo>
                      <BenchmarkLabel>{benchmark.label}</BenchmarkLabel>
                      <BenchmarkValue>
                        Standard: <strong>{benchmark.commonValue}</strong>
                        {benchmark.currentValue && (
                          <CurrentValue $aligned={benchmark.isAligned}>
                            (Current: {benchmark.currentValue})
                          </CurrentValue>
                        )}
                      </BenchmarkValue>
                    </BenchmarkInfo>
                    {benchmark.isAligned ? (
                      <AlignedCheck><CheckIcon /></AlignedCheck>
                    ) : (
                      <ApplyButton onClick={() => onApplyBenchmark?.(benchmark.field, benchmark.commonValue)}>
                        Apply
                      </ApplyButton>
                    )}
                  </BenchmarkCard>
                ))}
              </SectionContent>
            )}
          </Section>

          {/* Templates */}
          {templates.length > 0 && (
            <Section>
              <SectionHeader onClick={() => toggleSection('templates')}>
                <SectionIcon $color="#6366f1"><SparklesIcon /></SectionIcon>
                <SectionTitle>Matching Templates</SectionTitle>
                <Badge>{templates.length}</Badge>
                <ChevronIcon $expanded={expandedSection === 'templates'}>
                  <ChevronRightIcon />
                </ChevronIcon>
              </SectionHeader>
              {expandedSection === 'templates' && (
                <SectionContent>
                  {templates.slice(0, 3).map((template, index) => (
                    <TemplateCard key={template.id} $delay={index}>
                      <TemplateInfo>
                        <TemplateName>{template.name}</TemplateName>
                        <TemplateDetails>
                          {template.matchScore}% match • {template.fieldCount} fields
                        </TemplateDetails>
                      </TemplateInfo>
                      <UseTemplateButton onClick={() => onApplyTemplate?.(template.id)}>
                        Use
                      </UseTemplateButton>
                    </TemplateCard>
                  ))}
                </SectionContent>
              )}
            </Section>
          )}
        </Content>
      )}
    </Container>
  );
};

// Styled Components
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${({ theme }) => theme.colours.surface};
  animation: ${slideInRight} 0.3s ease-out;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colours.border};
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
`;

const HeaderIcon = styled.div`
  display: flex;
  padding: 10px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 12px;
  svg { width: 20px; height: 20px; color: white; }
`;

const HeaderText = styled.div`
  h3 { font-size: 16px; font-weight: 600; color: ${({ theme }) => theme.colours.text}; margin: 0; }
  p { font-size: 12px; color: ${({ theme }) => theme.colours.textMuted}; margin: 4px 0 0; }
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
  color: ${({ theme }) => theme.colours.textMuted};
  font-size: 14px;
`;

const LoadingSpinner = styled.div`
  width: 32px;
  height: 32px;
  border: 3px solid ${({ theme }) => theme.colours.border};
  border-top-color: #8b5cf6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
`;

const Section = styled.div`
  margin-bottom: 16px;
  background: ${({ theme }) => theme.colours.backgroundAlt};
  border-radius: 12px;
  overflow: hidden;
`;

const SectionHeader = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 14px 16px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
  &:hover { background: rgba(0, 0, 0, 0.02); }
`;

const SectionIcon = styled.div<{ $color: string }>`
  display: flex;
  padding: 6px;
  background: ${({ $color }) => `${$color}15`};
  border-radius: 8px;
  svg { width: 16px; height: 16px; color: ${({ $color }) => $color}; }
`;

const SectionTitle = styled.span`
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
`;

const Badge = styled.span`
  padding: 2px 8px;
  background: ${({ theme }) => theme.colours.primary}15;
  color: ${({ theme }) => theme.colours.primary};
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
`;

const WarningBadge = styled(Badge)`
  background: #fef3c7;
  color: #d97706;
`;

const AlignmentBadge = styled.span<{ $aligned: boolean }>`
  padding: 2px 8px;
  background: ${({ $aligned }) => $aligned ? '#d1fae5' : '#fee2e2'};
  color: ${({ $aligned }) => $aligned ? '#059669' : '#dc2626'};
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
`;

const ChevronIcon = styled.span<{ $expanded: boolean }>`
  display: flex;
  transition: transform 0.2s;
  transform: rotate(${({ $expanded }) => $expanded ? '90deg' : '0'});
  svg { width: 16px; height: 16px; color: ${({ theme }) => theme.colours.textMuted}; }
`;

const SectionContent = styled.div`
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SuggestionCard = styled.div<{ $type: string; $delay: number }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: ${({ $type }) =>
    $type === 'warning' ? '#fef3c7' :
    $type === 'recommendation' ? '#eff6ff' : '#f0fdf4'};
  border-radius: 10px;
  animation: ${fadeInScale} 0.3s ease-out;
  animation-delay: ${({ $delay }) => $delay * 50}ms;
  animation-fill-mode: both;
`;

const SuggestionIcon = styled.div<{ $type: string }>`
  flex-shrink: 0;
  svg {
    width: 16px; height: 16px;
    color: ${({ $type }) => $type === 'warning' ? '#d97706' : '#2563eb'};
  }
`;

const SuggestionText = styled.span`
  flex: 1;
  font-size: 13px;
  line-height: 1.4;
  color: ${({ theme }) => theme.colours.text};
`;

const SuggestionAction = styled.button`
  padding: 4px 10px;
  background: #3b82f6;
  color: white;
  font-size: 11px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: #2563eb; }
`;

const SimilarCard = styled.div<{ $delay: number }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: white;
  border: 1px solid #fcd34d;
  border-radius: 10px;
  animation: ${fadeInScale} 0.3s ease-out;
  animation-delay: ${({ $delay }) => $delay * 50}ms;
  animation-fill-mode: both;
`;

const SimilarInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const SimilarName = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colours.text};
`;

const SimilarMatch = styled.span`
  font-size: 11px;
  color: #d97706;
`;

const ViewButton = styled.button`
  padding: 4px 10px;
  background: transparent;
  color: #d97706;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid #fcd34d;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: #fef3c7; }
`;

const BenchmarkCard = styled.div<{ $delay: number }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: white;
  border-radius: 10px;
  animation: ${fadeInScale} 0.3s ease-out;
  animation-delay: ${({ $delay }) => $delay * 50}ms;
  animation-fill-mode: both;
`;

const BenchmarkInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const BenchmarkLabel = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colours.text};
`;

const BenchmarkValue = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colours.textMuted};
  strong { color: #10b981; }
`;

const CurrentValue = styled.span<{ $aligned: boolean }>`
  margin-left: 4px;
  color: ${({ $aligned }) => $aligned ? '#10b981' : '#64748b'};
`;

const AlignedCheck = styled.div`
  display: flex;
  padding: 4px;
  background: #d1fae5;
  border-radius: 50%;
  svg { width: 14px; height: 14px; color: #10b981; }
`;

const ApplyButton = styled.button`
  padding: 4px 10px;
  background: #10b981;
  color: white;
  font-size: 11px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: #059669; }
`;

const TemplateCard = styled.div<{ $delay: number }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: white;
  border-radius: 10px;
  animation: ${fadeInScale} 0.3s ease-out;
  animation-delay: ${({ $delay }) => $delay * 50}ms;
  animation-fill-mode: both;
`;

const TemplateInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const TemplateName = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colours.text};
`;

const TemplateDetails = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colours.textMuted};
`;

const UseTemplateButton = styled.button`
  padding: 4px 10px;
  background: #6366f1;
  color: white;
  font-size: 11px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: #4f46e5; }
`;

export default AISuggestionsSidebar;


