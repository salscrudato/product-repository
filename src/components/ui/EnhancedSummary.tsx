/**
 * Enhanced Summary Component
 *
 * Modern, innovative UI for displaying AI-generated summaries with:
 * - Expandable sections with smooth animations
 * - Source citations with relevance indicators
 * - Confidence scoring with visual feedback
 * - Key points with importance badges
 * - Entity extraction display
 * - Processing metrics
 */

import React, { useState, memo } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  CheckBadgeIcon,
  ClockIcon,
  CpuChipIcon,
  BookmarkIcon,
  TagIcon,
  ArrowTrendingUpIcon,
  ExclamationCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { SparklesIcon as SparklesSolid } from '@heroicons/react/24/solid';
import type { SummaryResult, KeyPoint, SourceCitation, ExtractedEntity } from '@/services/advancedRAGService';
import { UnifiedAIResponse } from './UnifiedAIResponse';

// ============================================================================
// Animations
// ============================================================================

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  background: ${({ theme }) => theme.isDarkMode
    ? 'rgba(30, 41, 59, 0.95)'
    : 'rgba(255, 255, 255, 0.98)'};
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.isDarkMode ? '#334155' : '#e2e8f0'};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  animation: ${fadeIn} 0.4s ease-out;
`;

const Header = styled.div`
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    background-size: 200% 100%;
    animation: ${shimmer} 3s infinite;
  }
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
  z-index: 1;

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  svg {
    width: 24px;
    height: 24px;
  }
`;

const ConfidenceBadge = styled.div<{ $confidence: number }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  border-radius: 20px;
  color: white;
  font-size: 13px;
  font-weight: 600;
  z-index: 1;

  .bar {
    width: 50px;
    height: 4px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
    overflow: hidden;

    .fill {
      height: 100%;
      width: ${({ $confidence }) => $confidence * 100}%;
      background: ${({ $confidence }) =>
        $confidence >= 0.8 ? '#10b981' :
        $confidence >= 0.6 ? '#f59e0b' : '#ef4444'};
      transition: width 0.5s ease;
    }
  }
`;

const Content = styled.div`
  padding: 24px;
`;

const SummaryText = styled.div`
  font-size: 15px;
  line-height: 1.7;
  color: ${({ theme }) => theme.isDarkMode ? '#e2e8f0' : '#374151'};
  margin-bottom: 24px;
`;

const Section = styled.div<{ $isOpen?: boolean }>`
  border: 1px solid ${({ theme }) => theme.isDarkMode ? '#334155' : '#e2e8f0'};
  border-radius: 12px;
  margin-bottom: 16px;
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    border-color: ${({ theme }) => theme.isDarkMode ? '#475569' : '#cbd5e1'};
  }
`;

const SectionHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: ${({ theme }) => theme.isDarkMode ? 'rgba(51, 65, 85, 0.3)' : 'rgba(248, 250, 252, 0.8)'};
  border: none;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(241, 245, 249, 1)'};
  }

  .title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-weight: 600;
    color: ${({ theme }) => theme.isDarkMode ? '#e2e8f0' : '#1e293b'};

    svg {
      width: 18px;
      height: 18px;
      color: #6366f1;
    }
  }

  .count {
    display: flex;
    align-items: center;
    gap: 8px;

    span {
      font-size: 12px;
      color: ${({ theme }) => theme.isDarkMode ? '#94a3b8' : '#64748b'};
      background: ${({ theme }) => theme.isDarkMode ? '#1e293b' : '#e2e8f0'};
      padding: 4px 10px;
      border-radius: 12px;
      font-weight: 500;
    }

    svg {
      width: 18px;
      height: 18px;
      color: ${({ theme }) => theme.isDarkMode ? '#94a3b8' : '#64748b'};
      transition: transform 0.3s ease;
    }
  }
`;

const SectionContent = styled.div<{ $isOpen: boolean }>`
  max-height: ${({ $isOpen }) => $isOpen ? '500px' : '0'};
  overflow: hidden;
  transition: max-height 0.4s ease;
  padding: ${({ $isOpen }) => $isOpen ? '16px 18px' : '0 18px'};
  background: ${({ theme }) => theme.isDarkMode ? 'transparent' : '#ffffff'};
`;

const KeyPointsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const KeyPointItem = styled.div<{ $importance: string }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  background: ${({ theme, $importance }) => {
    const alpha = theme.isDarkMode ? '0.1' : '0.05';
    const colors: Record<string, string> = {
      critical: `rgba(239, 68, 68, ${alpha})`,
      high: `rgba(245, 158, 11, ${alpha})`,
      medium: `rgba(59, 130, 246, ${alpha})`,
      low: `rgba(107, 114, 128, ${alpha})`
    };
    return colors[$importance] || colors.low;
  }};
  border-radius: 10px;
  border-left: 3px solid ${({ $importance }) => {
    const colors: Record<string, string> = {
      critical: '#ef4444',
      high: '#f59e0b',
      medium: '#3b82f6',
      low: '#6b7280'
    };
    return colors[$importance] || colors.low;
  }};

  .badge {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
    background: ${({ $importance }) => {
      const colors: Record<string, string> = {
        critical: '#ef4444',
        high: '#f59e0b',
        medium: '#3b82f6',
        low: '#6b7280'
      };
      return colors[$importance] || colors.low;
    }};
    color: white;

    svg {
      width: 10px;
      height: 10px;
    }
  }

  .text {
    flex: 1;
    font-size: 14px;
    line-height: 1.5;
    color: ${({ theme }) => theme.isDarkMode ? '#e2e8f0' : '#374151'};
  }

  .category {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 4px;
    background: ${({ theme }) => theme.isDarkMode ? '#334155' : '#e2e8f0'};
    color: ${({ theme }) => theme.isDarkMode ? '#94a3b8' : '#64748b'};
    flex-shrink: 0;
  }
`;


const CitationsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const CitationItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  background: ${({ theme }) => theme.isDarkMode ? 'rgba(51, 65, 85, 0.3)' : 'rgba(248, 250, 252, 0.8)'};
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.isDarkMode ? '#334155' : '#e2e8f0'};

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      color: ${({ theme }) => theme.isDarkMode ? '#e2e8f0' : '#1e293b'};

      svg {
        width: 16px;
        height: 16px;
        color: #6366f1;
      }
    }

    .relevance {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 6px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      font-weight: 600;
    }
  }

  .excerpt {
    font-size: 13px;
    line-height: 1.5;
    color: ${({ theme }) => theme.isDarkMode ? '#94a3b8' : '#64748b'};
    font-style: italic;
  }

  .section {
    font-size: 11px;
    color: ${({ theme }) => theme.isDarkMode ? '#64748b' : '#94a3b8'};
  }
`;

const EntitiesGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const EntityTag = styled.div<{ $type: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  background: ${({ $type, theme }) => {
    const alpha = theme.isDarkMode ? '0.2' : '0.1';
    const colors: Record<string, string> = {
      amount: `rgba(16, 185, 129, ${alpha})`,
      date: `rgba(59, 130, 246, ${alpha})`,
      state: `rgba(139, 92, 246, ${alpha})`,
      coverage: `rgba(245, 158, 11, ${alpha})`,
      limit: `rgba(239, 68, 68, ${alpha})`,
      deductible: `rgba(6, 182, 212, ${alpha})`,
      form: `rgba(236, 72, 153, ${alpha})`,
      rule: `rgba(99, 102, 241, ${alpha})`
    };
    return colors[$type] || colors.coverage;
  }};
  color: ${({ $type }) => {
    const colors: Record<string, string> = {
      amount: '#10b981',
      date: '#3b82f6',
      state: '#8b5cf6',
      coverage: '#f59e0b',
      limit: '#ef4444',
      deductible: '#06b6d4',
      form: '#ec4899',
      rule: '#6366f1'
    };
    return colors[$type] || colors.coverage;
  }};

  svg {
    width: 12px;
    height: 12px;
  }

  .frequency {
    font-size: 10px;
    padding: 2px 5px;
    border-radius: 6px;
    background: currentColor;
    color: white;
  }
`;

const MetricsBar = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 24px;
  background: ${({ theme }) => theme.isDarkMode ? 'rgba(51, 65, 85, 0.3)' : 'rgba(248, 250, 252, 0.8)'};
  border-top: 1px solid ${({ theme }) => theme.isDarkMode ? '#334155' : '#e2e8f0'};
  flex-wrap: wrap;
`;

const MetricItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.isDarkMode ? '#94a3b8' : '#64748b'};

  svg {
    width: 14px;
    height: 14px;
    opacity: 0.7;
  }

  .value {
    font-weight: 600;
    color: ${({ theme }) => theme.isDarkMode ? '#e2e8f0' : '#1e293b'};
  }
`;

const MethodologyTag = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
  color: #6366f1;

  svg {
    width: 12px;
    height: 12px;
  }
`;


// ============================================================================
// Component Props
// ============================================================================

interface EnhancedSummaryProps {
  result: SummaryResult;
  title?: string;
  showMetrics?: boolean;
  defaultExpanded?: boolean;
  onCitationClick?: (citation: SourceCitation) => void;
}

// ============================================================================
// Sub-Components
// ============================================================================

const KeyPointsSection = memo(({
  keyPoints,
  isOpen,
  onToggle
}: {
  keyPoints: KeyPoint[];
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <Section $isOpen={isOpen}>
    <SectionHeader onClick={onToggle}>
      <div className="title">
        <BookmarkIcon />
        Key Points
      </div>
      <div className="count">
        <span>{keyPoints.length} points</span>
        {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </div>
    </SectionHeader>
    <SectionContent $isOpen={isOpen}>
      <KeyPointsList>
        {keyPoints.map((point, idx) => (
          <KeyPointItem key={idx} $importance={point.importance}>
            <div className="badge">
              {point.importance === 'critical' && <ExclamationCircleIcon />}
              {point.importance === 'high' && <ArrowTrendingUpIcon />}
              {point.importance === 'medium' && <InformationCircleIcon />}
              {point.importance}
            </div>
            <div className="text">{point.text}</div>
            <div className="category">{point.category}</div>
          </KeyPointItem>
        ))}
      </KeyPointsList>
    </SectionContent>
  </Section>
));

KeyPointsSection.displayName = 'KeyPointsSection';

const CitationsSection = memo(({
  citations,
  isOpen,
  onToggle,
  onCitationClick
}: {
  citations: SourceCitation[];
  isOpen: boolean;
  onToggle: () => void;
  onCitationClick?: (citation: SourceCitation) => void;
}) => (
  <Section $isOpen={isOpen}>
    <SectionHeader onClick={onToggle}>
      <div className="title">
        <DocumentTextIcon />
        Source Citations
      </div>
      <div className="count">
        <span>{citations.length} sources</span>
        {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </div>
    </SectionHeader>
    <SectionContent $isOpen={isOpen}>
      <CitationsList>
        {citations.map((citation) => (
          <CitationItem
            key={citation.id}
            onClick={() => onCitationClick?.(citation)}
            style={{ cursor: onCitationClick ? 'pointer' : 'default' }}
          >
            <div className="header">
              <div className="title">
                <DocumentTextIcon />
                {citation.documentTitle}
              </div>
              <div className="relevance">{Math.round(citation.relevance * 100)}% match</div>
            </div>
            {citation.section && <div className="section">Section: {citation.section}</div>}
            <div className="excerpt">"{citation.excerpt}"</div>
          </CitationItem>
        ))}
      </CitationsList>
    </SectionContent>
  </Section>
));

CitationsSection.displayName = 'CitationsSection';

const EntitiesSection = memo(({
  entities,
  isOpen,
  onToggle
}: {
  entities: ExtractedEntity[];
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <Section $isOpen={isOpen}>
    <SectionHeader onClick={onToggle}>
      <div className="title">
        <TagIcon />
        Extracted Entities
      </div>
      <div className="count">
        <span>{entities.length} entities</span>
        {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </div>
    </SectionHeader>
    <SectionContent $isOpen={isOpen}>
      <EntitiesGrid>
        {entities.map((entity, idx) => (
          <EntityTag key={idx} $type={entity.type}>
            {entity.name}
            {entity.frequency > 1 && (
              <span className="frequency">×{entity.frequency}</span>
            )}
          </EntityTag>
        ))}
      </EntitiesGrid>
    </SectionContent>
  </Section>
));

EntitiesSection.displayName = 'EntitiesSection';


// ============================================================================
// Main Component
// ============================================================================

export const EnhancedSummary: React.FC<EnhancedSummaryProps> = memo(({
  result,
  title = 'AI Summary',
  showMetrics = true,
  defaultExpanded = false,
  onCitationClick
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    keyPoints: defaultExpanded,
    citations: false,
    entities: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const { summary, keyPoints, entities, sourceCitations, confidence, methodology, processingMetrics } = result;

  return (
    <Container>
      <Header>
        <HeaderTitle>
          <SparklesSolid />
          <h3>{title}</h3>
        </HeaderTitle>
        <ConfidenceBadge $confidence={confidence}>
          <CheckBadgeIcon style={{ width: 16, height: 16 }} />
          {Math.round(confidence * 100)}% Confidence
          <div className="bar">
            <div className="fill" />
          </div>
        </ConfidenceBadge>
      </Header>

      <Content>
        <SummaryText>
          <UnifiedAIResponse content={summary} />
        </SummaryText>

        {keyPoints.length > 0 && (
          <KeyPointsSection
            keyPoints={keyPoints}
            isOpen={expandedSections.keyPoints}
            onToggle={() => toggleSection('keyPoints')}
          />
        )}

        {sourceCitations.length > 0 && (
          <CitationsSection
            citations={sourceCitations}
            isOpen={expandedSections.citations}
            onToggle={() => toggleSection('citations')}
            onCitationClick={onCitationClick}
          />
        )}

        {entities.length > 0 && (
          <EntitiesSection
            entities={entities}
            isOpen={expandedSections.entities}
            onToggle={() => toggleSection('entities')}
          />
        )}
      </Content>

      {showMetrics && (
        <MetricsBar>
          <MethodologyTag>
            <CpuChipIcon />
            {methodology}
          </MethodologyTag>
          <MetricItem>
            <DocumentTextIcon />
            <span className="value">{processingMetrics.totalDocuments}</span> documents
          </MetricItem>
          <MetricItem>
            <SparklesIcon />
            <span className="value">{processingMetrics.totalChunks}</span> chunks
          </MetricItem>
          <MetricItem>
            <ClockIcon />
            <span className="value">{(processingMetrics.processingTimeMs / 1000).toFixed(1)}s</span>
          </MetricItem>
          <MetricItem>
            Compression: <span className="value">{Math.round(processingMetrics.compressionRatio * 100)}%</span>
          </MetricItem>
        </MetricsBar>
      )}
    </Container>
  );
});

EnhancedSummary.displayName = 'EnhancedSummary';

export default EnhancedSummary;