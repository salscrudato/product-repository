/**
 * Unified AI Response Component
 *
 * Professional, ChatGPT-style response formatter that handles any AI response
 * with robust markdown support, syntax highlighting, and clean typography.
 */

import { memo, useCallback } from 'react';
import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

// ============================================================================
// Styled Components - Clean, ChatGPT-inspired design
// ============================================================================

const ResponseContainer = styled.div`
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.6;
  color: #18181b;

  /* Paragraphs */
  p {
    margin: 0 0 1em 0;
    font-size: 15px;
    line-height: 1.7;

    &:last-child {
      margin-bottom: 0;
    }
  }

  /* Headings */
  h1, h2, h3, h4, h5, h6 {
    margin: 1.5em 0 0.75em 0;
    font-weight: 600;
    line-height: 1.3;
    color: #09090b;

    &:first-child {
      margin-top: 0;
    }
  }

  h1 { font-size: 1.5em; }
  h2 { font-size: 1.35em; }
  h3 { font-size: 1.2em; }
  h4 { font-size: 1.1em; }
  h5, h6 { font-size: 1em; }

  /* Lists */
  ul, ol {
    margin: 0.75em 0;
    padding-left: 1.5em;
  }

  li {
    margin: 0.4em 0;
    line-height: 1.6;

    > ul, > ol {
      margin: 0.25em 0;
    }

    > p {
      margin: 0.25em 0;
    }
  }

  ul {
    list-style-type: disc;

    ul {
      list-style-type: circle;

      ul {
        list-style-type: square;
      }
    }
  }

  ol {
    list-style-type: decimal;
  }

  /* Inline code */
  code {
    background: rgba(0,0,0,0.06);
    color: #be185d;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'SF Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
    font-size: 0.875em;
    font-weight: 500;
  }

  /* Code blocks */
  pre {
    background: #f4f4f5;
    border-radius: 8px;
    padding: 16px;
    margin: 1em 0;
    overflow-x: auto;
    border: 1px solid rgba(0,0,0,0.08);

    code {
      background: none;
      color: #3f3f46;
      padding: 0;
      font-size: 0.85em;
      line-height: 1.6;
      white-space: pre;
      display: block;
    }
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 14px;
    border: 1px solid rgba(0,0,0,0.1);
    border-radius: 8px;
    overflow: hidden;

    th, td {
      padding: 10px 14px;
      text-align: left;
      border-bottom: 1px solid rgba(0,0,0,0.06);
    }

    th {
      font-weight: 600;
      background: rgba(0,0,0,0.03);
      color: #09090b;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tbody tr:hover {
      background: rgba(0,0,0,0.02);
    }
  }

  /* Blockquotes */
  blockquote {
    border-left: 3px solid #6366f1;
    background: rgba(99,102,241,0.05);
    padding: 12px 16px;
    margin: 1em 0;
    border-radius: 0 6px 6px 0;
    color: #52525b;

    p {
      margin: 0;
    }
  }

  /* Links */
  a {
    color: #6366f1;
    text-decoration: none;
    font-weight: 500;
    transition: opacity 0.15s ease;

    &:hover {
      text-decoration: underline;
      opacity: 0.85;
    }
  }

  /* Strong and emphasis */
  strong {
    font-weight: 600;
    color: #09090b;
  }

  em {
    font-style: italic;
  }

  /* Horizontal rules */
  hr {
    border: none;
    height: 1px;
    background: rgba(0,0,0,0.1);
    margin: 1.5em 0;
  }

  /* Task lists (checkboxes) */
  input[type="checkbox"] {
    margin-right: 8px;
    accent-color: #6366f1;
  }

  /* Images */
  img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1em 0;
  }

  @media (max-width: 768px) {
    p, li {
      font-size: 14px;
    }

    pre {
      padding: 12px;
      font-size: 13px;
    }

    table {
      font-size: 13px;

      th, td {
        padding: 8px 10px;
      }
    }
  }
`;

// ============================================================================
// Types
// ============================================================================

interface ResponseData {
  answer?: string;
  [key: string]: unknown;
}

interface UnifiedAIResponseProps {
  content?: string;
  data?: ResponseData;
}

// ============================================================================
// Custom Components for ReactMarkdown
// ============================================================================

const createMarkdownComponents = (): Components => ({
  // Ensure proper paragraph rendering
  p: ({ children }) => <p>{children}</p>,

  // Ensure proper list rendering
  ul: ({ children }) => <ul>{children}</ul>,
  ol: ({ children }) => <ol>{children}</ol>,
  li: ({ children }) => <li>{children}</li>,

  // Code blocks with language detection
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const isInline = !className;

    if (isInline) {
      return <code {...props}>{children}</code>;
    }

    return (
      <code className={className} data-language={match?.[1]} {...props}>
        {children}
      </code>
    );
  },

  // Tables
  table: ({ children }) => <table>{children}</table>,
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => <th>{children}</th>,
  td: ({ children }) => <td>{children}</td>,

  // Links open in new tab for external URLs
  a: ({ href, children }) => {
    const isExternal = href?.startsWith('http');
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    );
  },
});

// ============================================================================
// Main Component
// ============================================================================

export const UnifiedAIResponse = memo(({ content, data }: UnifiedAIResponseProps) => {
  const contentToRender = content || data?.answer || '';

  // Memoize components to prevent re-creation on each render
  const components = useCallback(() => createMarkdownComponents(), [])();

  // Clean and normalize content
  const normalizedContent = contentToRender
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
    .trim();

  return (
    <ResponseContainer>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {normalizedContent}
      </ReactMarkdown>
    </ResponseContainer>
  );
});

UnifiedAIResponse.displayName = 'UnifiedAIResponse';
