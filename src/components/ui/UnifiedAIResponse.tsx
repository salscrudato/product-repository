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
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.7;
  color: #1e293b;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%);
  border-radius: 16px;
  padding: 28px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02);
  backdrop-filter: blur(10px);

  /* Typography */
  h1, h2 {
    margin: 28px 0 16px 0;
    font-weight: 700;
    font-size: 22px;
    color: #0f172a;
    line-height: 1.3;
    letter-spacing: -0.02em;
    padding-bottom: 10px;
    border-bottom: 2px solid rgba(99, 102, 241, 0.15);
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;

    &:first-child {
      margin-top: 0;
    }
  }

  h3 {
    margin: 22px 0 12px 0;
    font-weight: 600;
    font-size: 18px;
    color: #1e293b;
    line-height: 1.4;
    letter-spacing: -0.01em;

    &:first-child {
      margin-top: 0;
    }
  }

  h4 {
    margin: 18px 0 10px 0;
    font-weight: 600;
    font-size: 16px;
    color: #334155;
    line-height: 1.4;
  }

  p {
    margin: 14px 0;
    font-size: 15px;
    line-height: 1.8;
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
    color: #334155;

    &:last-child {
      margin-bottom: 0;
    }

    &:first-child {
      margin-top: 0;
    }
  }

  /* Lists */
  ul, ol {
    margin: 18px 0;
    padding-left: 32px;

    li {
      margin: 12px 0;
      line-height: 1.8;
      color: #334155;
      position: relative;

      &::marker {
        color: #6366f1;
        font-weight: 700;
      }

      /* Nested lists */
      ul, ol {
        margin: 10px 0;
        padding-left: 28px;
      }
    }
  }

  ul {
    li {
      padding-left: 8px;
    }
  }

  ol {
    li::marker {
      font-weight: 700;
      font-size: 15px;
    }
  }

  /* Code */
  code {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
    color: #6366f1;
    padding: 4px 10px;
    border-radius: 6px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', monospace;
    font-size: 14px;
    font-weight: 600;
    word-break: break-all;
    border: 1px solid rgba(99, 102, 241, 0.15);
    box-shadow: 0 1px 3px rgba(99, 102, 241, 0.05);
  }

  pre {
    background: linear-gradient(135deg, rgba(248, 250, 252, 0.98) 0%, rgba(241, 245, 249, 0.95) 100%);
    border: 1px solid rgba(226, 232, 240, 0.9);
    border-radius: 12px;
    padding: 20px;
    margin: 20px 0;
    overflow: auto;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.6;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06), inset 0 1px 2px rgba(0, 0, 0, 0.02);

    code {
      background: none;
      padding: 0;
      border-radius: 0;
      border: none;
      color: #475569;
      white-space: pre-wrap;
      font-weight: 400;
      box-shadow: none;
    }
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin: 20px 0;
    font-size: 14px;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid rgba(226, 232, 240, 0.9);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    background: rgba(255, 255, 255, 0.6);

    th, td {
      padding: 14px 18px;
      text-align: left;
      border-bottom: 1px solid rgba(226, 232, 240, 0.7);
    }

    th {
      font-weight: 700;
      color: #1e293b;
      background: linear-gradient(135deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.9) 100%);
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    td {
      color: #475569;
      background: rgba(255, 255, 255, 0.4);
    }

    tr:last-child td {
      border-bottom: none;
    }

    tbody tr:hover {
      background: rgba(99, 102, 241, 0.04);

      td {
        background: rgba(99, 102, 241, 0.04);
      }
    }
  }

  /* Blockquotes */
  blockquote {
    border-left: 4px solid #6366f1;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(139, 92, 246, 0.04) 100%);
    padding: 18px 24px;
    margin: 20px 0;
    border-radius: 10px;
    font-style: italic;
    color: #475569;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
    position: relative;

    &::before {
      content: '"';
      position: absolute;
      top: 10px;
      left: 10px;
      font-size: 48px;
      color: rgba(99, 102, 241, 0.15);
      font-family: Georgia, serif;
      line-height: 1;
    }

    p {
      margin: 10px 0;
      padding-left: 20px;

      &:first-child {
        margin-top: 0;
      }

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  /* Links */
  a {
    color: #6366f1;
    text-decoration: underline;
    text-decoration-color: rgba(99, 102, 241, 0.3);
    text-underline-offset: 3px;
    text-decoration-thickness: 2px;
    word-break: break-word;
    font-weight: 600;
    transition: all 0.2s ease;

    &:hover {
      color: #4f46e5;
      text-decoration-color: rgba(79, 70, 229, 0.6);
      background: rgba(99, 102, 241, 0.05);
      padding: 2px 4px;
      border-radius: 4px;
    }
  }

  /* Strong and emphasis */
  strong {
    font-weight: 700;
    color: #0f172a;
  }

  em {
    font-style: italic;
    color: #64748b;
  }

  /* Horizontal rules */
  hr {
    border: none;
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, rgba(99, 102, 241, 0.3) 50%, transparent 100%);
    margin: 32px 0;
  }

  @media (max-width: 768px) {
    padding: 20px;
    border-radius: 12px;

    h1, h2 {
      font-size: 19px;
    }

    h3 {
      font-size: 17px;
    }

    h4 {
      font-size: 15px;
    }

    p {
      font-size: 14px;
    }

    pre {
      padding: 16px;
      font-size: 13px;
    }

    ul, ol {
      padding-left: 24px;
    }

    table {
      font-size: 13px;

      th, td {
        padding: 10px 12px;
      }
    }
  }
`;

const MetadataContainer = styled.div`
  margin-top: 24px;
  padding: 24px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.85) 100%);
  border-radius: 14px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.02);
  backdrop-filter: blur(10px);
`;

const MetadataToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
  background: none;
  border: none;
  color: #64748b;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s ease;

  &:hover {
    color: #475569;
  }

  span:first-child {
    display: flex;
    align-items: center;
    gap: 10px;

    &::before {
      content: '📊';
      font-size: 20px;
    }
  }

  span:last-child {
    font-size: 14px;
    color: #94a3b8;
  }
`;

const MetadataContent = styled.div`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid rgba(99, 102, 241, 0.15);

  .metadata-section {
    margin-bottom: 20px;
    padding: 18px 20px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.7) 100%);
    border-radius: 10px;
    border-left: 4px solid #6366f1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);

    &:last-child {
      margin-bottom: 0;
    }
  }

  .metadata-label {
    font-size: 12px;
    font-weight: 700;
    color: #6366f1;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;

    &::before {
      content: '▸';
      font-size: 14px;
    }
  }

  .metadata-text {
    font-size: 14px;
    color: #475569;
    line-height: 1.7;
  }
`;

const ExecutionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  padding: 14px 18px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(139, 92, 246, 0.04) 100%);
  border-radius: 10px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.08);

  .badge {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.12) 100%);
    color: #6366f1;
    padding: 7px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    border: 1px solid rgba(99, 102, 241, 0.2);
  }

  .time-info {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;

    span:first-child {
      font-size: 16px;
    }
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
