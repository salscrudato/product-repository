import React, { memo } from 'react';
import styled from 'styled-components';
import { UnifiedAIResponse } from './UnifiedAIResponse';
import { 
  ClockIcon, 
  CpuChipIcon, 
  CheckCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface MessageMetadata {
  queryType?: string;
  confidence?: number;
  tokensUsed?: number;
  processingTime?: number;
  sources?: string[];
  isStructured?: boolean;
}

interface EnhancedChatMessageProps {
  content: string;
  metadata?: MessageMetadata;
  showMetadata?: boolean;
}

const MessageContainer = styled.div`
  width: 100%;
`;

const MetadataBar = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
  margin-top: 12px;
  background: ${({ theme }) => theme.isDarkMode ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.03)'};
  border-radius: 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.isDarkMode ? '#94a3b8' : '#64748b'};
  flex-wrap: wrap;
`;

const MetadataItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;

  svg {
    width: 14px;
    height: 14px;
    opacity: 0.7;
  }

  .label {
    font-weight: 500;
    opacity: 0.8;
  }

  .value {
    font-weight: 600;
    color: ${({ theme }) => theme.isDarkMode ? '#e2e8f0' : '#1e293b'};
  }
`;

const QueryTypeBadge = styled.span<{ type: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${({ type }) => {
    const colors: Record<string, string> = {
      product_analysis: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      coverage_analysis: 'linear-gradient(135deg, #10b981, #059669)',
      pricing_analysis: 'linear-gradient(135deg, #f59e0b, #d97706)',
      compliance_check: 'linear-gradient(135deg, #ef4444, #dc2626)',
      task_management: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      strategic_insight: 'linear-gradient(135deg, #ec4899, #db2777)',
      data_query: 'linear-gradient(135deg, #06b6d4, #0891b2)',
      general: 'linear-gradient(135deg, #64748b, #475569)'
    };
    return colors[type] || colors.general;
  }};
  color: white;

  svg {
    width: 12px;
    height: 12px;
  }
`;

const ConfidenceIndicator = styled.div<{ $confidence: number }>`
  display: flex;
  align-items: center;
  gap: 6px;

  .bar {
    width: 60px;
    height: 4px;
    background: ${({ theme }) => theme.isDarkMode ? '#334155' : '#e2e8f0'};
    border-radius: 2px;
    overflow: hidden;
    position: relative;

    .fill {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: ${({ $confidence }) => $confidence * 100}%;
      background: ${({ $confidence }) =>
        $confidence >= 0.9 ? '#10b981' :
        $confidence >= 0.7 ? '#f59e0b' :
        '#ef4444'
      };
      transition: width 0.3s ease;
    }
  }

  .percentage {
    font-size: 11px;
    font-weight: 600;
    color: ${({ $confidence, theme }) =>
      $confidence >= 0.9 ? '#10b981' :
      $confidence >= 0.7 ? '#f59e0b' :
      '#ef4444'
    };
  }
`;

const SourcesList = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;

  .label {
    font-size: 11px;
    font-weight: 600;
    opacity: 0.8;
  }

  .source-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 600;
    background: ${({ theme }) => theme.isDarkMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)'};
    color: #6366f1;
    text-transform: capitalize;
  }
`;

export const EnhancedChatMessage = memo<EnhancedChatMessageProps>(({ 
  content, 
  metadata,
  showMetadata = true 
}) => {
  const formatQueryType = (type?: string) => {
    if (!type) return 'General';
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatProcessingTime = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTokens = (tokens?: number) => {
    if (!tokens) return 'N/A';
    return tokens.toLocaleString();
  };

  return (
    <MessageContainer>
      <UnifiedAIResponse content={content} />
      
      {showMetadata && metadata && (
        <MetadataBar>
          {metadata.queryType && (
            <QueryTypeBadge type={metadata.queryType}>
              <SparklesIcon />
              {formatQueryType(metadata.queryType)}
            </QueryTypeBadge>
          )}

          {metadata.confidence !== undefined && (
            <MetadataItem>
              <CheckCircleIcon />
              <ConfidenceIndicator $confidence={metadata.confidence}>
                <div className="bar">
                  <div className="fill" />
                </div>
                <span className="percentage">
                  {Math.round(metadata.confidence * 100)}%
                </span>
              </ConfidenceIndicator>
            </MetadataItem>
          )}

          {metadata.processingTime !== undefined && (
            <MetadataItem>
              <ClockIcon />
              <span className="value">{formatProcessingTime(metadata.processingTime)}</span>
            </MetadataItem>
          )}

          {metadata.tokensUsed !== undefined && (
            <MetadataItem>
              <CpuChipIcon />
              <span className="label">Tokens:</span>
              <span className="value">{formatTokens(metadata.tokensUsed)}</span>
            </MetadataItem>
          )}

          {metadata.sources && metadata.sources.length > 0 && (
            <SourcesList>
              <span className="label">Sources:</span>
              {metadata.sources.map((source) => (
                <span key={source} className="source-badge">
                  {source}
                </span>
              ))}
            </SourcesList>
          )}

          {metadata.isStructured && (
            <MetadataItem>
              <SparklesIcon />
              <span className="label">Structured Response</span>
            </MetadataItem>
          )}
        </MetadataBar>
      )}
    </MessageContainer>
  );
});

EnhancedChatMessage.displayName = 'EnhancedChatMessage';

