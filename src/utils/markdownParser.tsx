// Simple markdown parser for AI responses
// Handles basic formatting like **bold**, *italic*, bullet points, etc.

import React, { ReactNode } from 'react';
import styled from 'styled-components';

const FormattedText = styled.div`
  line-height: 1.6;
  color: #374151;

  strong {
    font-weight: 600;
    color: #1f2937;
  }

  em {
    font-style: italic;
    color: #4b5563;
  }

  ul {
    margin: 12px 0;
    padding-left: 20px;
  }

  li {
    margin: 4px 0;
  }

  p {
    margin: 12px 0;
    
    &:first-child {
      margin-top: 0;
    }
    
    &:last-child {
      margin-bottom: 0;
    }
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    color: #1f2937;
    margin: 16px 0 8px 0;
    
    &:first-child {
      margin-top: 0;
    }
  }

  h1 { font-size: 1.5em; }
  h2 { font-size: 1.3em; }
  h3 { font-size: 1.1em; }
  h4, h5, h6 { font-size: 1em; }

  code {
    background: #f3f4f6;
    padding: 2px 4px;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.9em;
    color: #6366f1;
  }

  blockquote {
    border-left: 3px solid #e5e7eb;
    padding-left: 16px;
    margin: 12px 0;
    color: #6b7280;
    font-style: italic;
  }
`;

// Parse markdown-like text and return React elements
export function parseMarkdown(text: string): ReactNode[] | null {
  if (!text) return null;

  // Split text into lines for processing
  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let currentParagraph: string[] = [];
  let inList = false;
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const paragraphText = currentParagraph.join(' ').trim();
      if (paragraphText) {
        elements.push(
          <p key={elements.length}>
            {parseInlineFormatting(paragraphText)}
          </p>
        );
      }
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={elements.length}>
          {listItems.map((item, index) => (
            <li key={index}>{parseInlineFormatting(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    // Empty line
    if (!trimmedLine) {
      flushParagraph();
      flushList();
      return;
    }

    // Headers
    const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      flushParagraph();
      flushList();
      const level = headerMatch[1].length;
      const HeaderTag = `h${level}` as keyof JSX.IntrinsicElements;
      elements.push(
        React.createElement(
          HeaderTag,
          { key: elements.length },
          parseInlineFormatting(headerMatch[2])
        )
      );
      return;
    }

    // List items
    const listMatch = trimmedLine.match(/^[-*+]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      if (!inList) {
        inList = true;
      }
      listItems.push(listMatch[1]);
      return;
    }

    // Blockquote
    if (trimmedLine.startsWith('>')) {
      flushParagraph();
      flushList();
      const quoteText = trimmedLine.replace(/^>\s*/, '');
      elements.push(
        <blockquote key={elements.length}>
          {parseInlineFormatting(quoteText)}
        </blockquote>
      );
      return;
    }

    // Regular paragraph text
    if (inList) {
      flushList();
    }
    currentParagraph.push(trimmedLine);
  });

  // Flush any remaining content
  flushParagraph();
  flushList();

  return elements;
}

// Parse inline formatting like **bold**, *italic*, `code`
function parseInlineFormatting(text: string): ReactNode | ReactNode[] {
  if (!text) return text;

  const parts: ReactNode[] = [];
  let currentIndex = 0;

  // Regex to match **bold**, *italic*, and `code`
  const formatRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let match: RegExpExecArray | null;

  while ((match = formatRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > currentIndex) {
      parts.push(text.slice(currentIndex, match.index));
    }

    // Add the formatted element
    if (match[2]) {
      // **bold**
      parts.push(<strong key={parts.length}>{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      parts.push(<em key={parts.length}>{match[3]}</em>);
    } else if (match[4]) {
      // `code`
      parts.push(<code key={parts.length}>{match[4]}</code>);
    }

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(text.slice(currentIndex));
  }

  return parts.length > 1 ? parts : text;
}

// Main component to render parsed markdown
interface MarkdownRendererProps {
  children: string;
  [key: string]: any;
}

export function MarkdownRenderer({ children, ...props }: MarkdownRendererProps): JSX.Element {
  const parsedContent = parseMarkdown(children);
  
  return (
    <FormattedText {...props}>
      {parsedContent}
    </FormattedText>
  );
}

export default MarkdownRenderer;

