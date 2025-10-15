/**
 * Unified AI Response Component
 *
 * Consolidates AIResponseFormatter and EnhancedAIResponse into a single,
 * optimized component for rendering AI responses with markdown support.
 */

import { memo, useState } from 'react';
import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ============================================================================
// Styled Components
// ============================================================================

const ResponseContainer = styled.div`
  width: 100%;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.6;
  color: #1e293b;

  /* Typography */
  h1, h2 {
    margin: 20px 0 12px 0;
    font-weight: 700;
    font-size: 18px;
    color: #1e293b;
    line-height: 1.3;

    &:first-child {
      margin-top: 0;
    }
  }

  h3 {
    margin: 16px 0 8px 0;
    font-weight: 600;
    font-size: 16px;
    color: #334155;
    line-height: 1.3;

    &:first-child {
      margin-top: 0;
    }
  }

  p {
    margin: 12px 0;
    font-size: 14px;
    line-height: 1.6;
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;

    &:last-child {
      margin-bottom: 0;
    }
  }

  /* Lists */
  ul, ol {
    margin: 12px 0;
    padding-left: 24px;

    li {
      margin: 8px 0;
      line-height: 1.5;

      &::marker {
        color: #64748b;
      }
    }
  }

  ol li::marker {
    font-weight: 600;
  }

  /* Code */
  code {
    background: #f1f5f9;
    color: #475569;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    font-size: 13px;
    word-break: break-all;
  }

  pre {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px;
    margin: 12px 0;
    overflow: auto;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    font-size: 13px;
    line-height: 1.5;

    code {
      background: none;
      padding: 0;
      border-radius: 0;
      color: #475569;
      white-space: pre-wrap;
    }
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 14px;

    th, td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }

    th {
      font-weight: 600;
      color: #475569;
      background: #f8fafc;
    }
  }

  /* Blockquotes */
  blockquote {
    border-left: 4px solid #4f9cf9;
    background: rgba(79, 156, 249, 0.05);
    padding: 12px 16px;
    margin: 12px 0;
    border-radius: 4px;
    font-style: italic;
    color: #475569;
  }

  /* Links */
  a {
    color: #4f9cf9;
    text-decoration: underline;
    text-decoration-color: rgba(79, 156, 249, 0.3);
    text-underline-offset: 2px;
    word-break: break-word;

    &:hover {
      color: #3b82f6;
      text-decoration-color: rgba(59, 130, 246, 0.5);
    }
  }

  /* Strong and emphasis */
  strong {
    font-weight: 600;
    color: #0f172a;
  }

  em {
    font-style: italic;
    color: #475569;
  }

  /* Horizontal rules */
  hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 16px 0;
  }

  @media (max-width: 768px) {
    font-size: 13px;

    h1, h2 {
      font-size: 16px;
    }

    h3 {
      font-size: 15px;
    }

    p {
      font-size: 13px;
    }

    pre {
      padding: 12px;
      font-size: 12px;
    }
  }
`;

const MetadataContainer = styled.div`
  margin-top: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
`;

const MetadataToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;

  &:hover {
    color: #475569;
  }
`;

const MetadataContent = styled.div`
  margin-top: 12px;

  .metadata-section {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .metadata-label {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }

  .metadata-text {
    font-size: 13px;
    color: #475569;
    line-height: 1.5;
  }
`;

const ExecutionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;

  .badge {
    background: rgba(79, 156, 249, 0.1);
    color: #4f9cf9;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
  }

  .time-info {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #64748b;
  }
`;

// ============================================================================
// Main Component
// ============================================================================

export const UnifiedAIResponse = memo(({ content, data }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Determine what to render
  const shouldRenderStructured = data && (data.ensembleMode || data.ensembleMetadata);
  const contentToRender = content || data?.answer || '';

  // If structured data, render enhanced version
  if (shouldRenderStructured && data) {
    return (
      <div>
        {/* Main Response */}
        <ResponseContainer>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {data.answer}
          </ReactMarkdown>
        </ResponseContainer>

        {/* Ensemble Metadata (if available) */}
        {data.ensembleMetadata && (
          <MetadataContainer>
            <MetadataToggle onClick={() => setIsExpanded(!isExpanded)}>
              <span>View Analysis Details</span>
              <span>{isExpanded ? '▼' : '▶'}</span>
            </MetadataToggle>

            {isExpanded && (
              <MetadataContent>
                {data.ensembleMetadata.scientificAnalyst && (
                  <div className="metadata-section">
                    <div className="metadata-label">Scientific Analysis</div>
                    <div className="metadata-text">
                      {data.ensembleMetadata.scientificAnalyst}
                    </div>
                  </div>
                )}

                {data.ensembleMetadata.creativeAdvisor && (
                  <div className="metadata-section">
                    <div className="metadata-label">Creative Perspective</div>
                    <div className="metadata-text">
                      {data.ensembleMetadata.creativeAdvisor}
                    </div>
                  </div>
                )}

                {data.ensembleMetadata.devilsAdvocate && (
                  <div className="metadata-section">
                    <div className="metadata-label">Critical Analysis</div>
                    <div className="metadata-text">
                      {data.ensembleMetadata.devilsAdvocate}
                    </div>
                  </div>
                )}
              </MetadataContent>
            )}
          </MetadataContainer>
        )}

        {/* Execution Info */}
        {(data.executionTime || data.ensembleMode) && (
          <ExecutionInfo>
            {data.ensembleMode && (
              <span className="badge">Ensemble Mode</span>
            )}
            {data.executionTime && (
              <div className="time-info">
                <span>⏱</span>
                <span>{data.executionTime}</span>
              </div>
            )}
          </ExecutionInfo>
        )}
      </div>
    );
  }

  // Simple markdown rendering for regular content
  return (
    <ResponseContainer>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {contentToRender}
      </ReactMarkdown>
    </ResponseContainer>
  );
});

UnifiedAIResponse.displayName = 'UnifiedAIResponse';
