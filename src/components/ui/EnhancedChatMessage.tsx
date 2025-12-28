import React, { memo } from 'react';
import styled from 'styled-components';
import { UnifiedAIResponse } from './UnifiedAIResponse';

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
  font-size: 15px;
  line-height: 1.7;

  /* Clean ChatGPT-like typography */
  p {
    margin: 0 0 1em 0;

    &:last-child {
      margin-bottom: 0;
    }
  }

  ul, ol {
    margin: 0.5em 0 1em 0;
    padding-left: 1.5em;
  }

  li {
    margin: 0.35em 0;
  }

  code {
    background: ${({ theme }) => theme.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'};
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9em;
    font-family: 'SF Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  pre {
    background: ${({ theme }) => theme.isDarkMode ? '#1e1e1e' : '#f6f6f6'};
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1em 0;

    code {
      background: none;
      padding: 0;
    }
  }

  strong {
    font-weight: 600;
  }

  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

export const EnhancedChatMessage = memo<EnhancedChatMessageProps>(({
  content
}) => {
  return (
    <MessageContainer>
      <UnifiedAIResponse content={content} />
    </MessageContainer>
  );
});

EnhancedChatMessage.displayName = 'EnhancedChatMessage';

