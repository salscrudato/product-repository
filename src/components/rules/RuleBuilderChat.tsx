/**
 * Rule Builder Chat Component
 * 
 * AI-powered chat interface for creating programmable rules from plain English.
 * Users describe rules in natural language and the AI generates structured logic.
 */

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { SparklesIcon, PaperAirplaneIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { UnifiedAIResponse } from '../ui/UnifiedAIResponse';
import { generateRuleFromText, RuleBuilderRequest, RuleBuilderResponse, ConversationMessage } from '../../services/ruleBuilderService';
import { RuleDraft } from '../../types';

// ============================================================================
// Types
// ============================================================================

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  ruleDraft?: RuleDraft;
  error?: boolean;
}

interface RuleBuilderChatProps {
  productId: string;
  /** Optional target ID (coverage/form) for context-aware rule generation */
  targetId?: string;
  productContext?: RuleBuilderRequest['productContext'];
  onRuleGenerated?: (draft: RuleDraft) => void;
  onSaveRule?: (draft: RuleDraft) => Promise<void>;
}

// ============================================================================
// Animations
// ============================================================================

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
`;

const HeaderIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const HeaderText = styled.div`
  flex: 1;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
`;

const Subtitle = styled.p`
  margin: 2px 0 0;
  font-size: 13px;
  color: #6b7280;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const MessageWrapper = styled.div<{ $isUser: boolean }>`
  display: flex;
  justify-content: ${({ $isUser }) => ($isUser ? 'flex-end' : 'flex-start')};
  animation: ${fadeIn} 0.25s ease-out;
`;

const MessageBubble = styled.div<{ $isUser: boolean }>`
  max-width: 85%;
  padding: ${({ $isUser }) => ($isUser ? '12px 18px' : '16px 20px')};
  border-radius: ${({ $isUser }) => ($isUser ? '20px 20px 4px 20px' : '4px 20px 20px 20px')};
  background: ${({ $isUser }) =>
    $isUser
      ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
      : '#f3f4f6'};
  color: ${({ $isUser }) => ($isUser ? '#ffffff' : '#374151')};
  font-size: 15px;
  line-height: 1.6;
  box-shadow: ${({ $isUser }) =>
    $isUser
      ? '0 4px 12px rgba(99, 102, 241, 0.3)'
      : '0 2px 8px rgba(0, 0, 0, 0.04)'};
`;

const LoadingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 14px;
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #e5e7eb;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
  }
`;

const InputArea = styled.div`
  padding: 16px 24px 24px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
`;

const InputWrapper = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-end;
`;

const TextInput = styled.textarea`
  flex: 1;
  padding: 14px 18px;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  font-size: 15px;
  resize: none;
  min-height: 52px;
  max-height: 120px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const SendButton = styled.button<{ $hasContent?: boolean }>`
  width: 52px;
  height: 52px;
  border-radius: 16px;
  border: none;
  background: ${({ $hasContent }) =>
    $hasContent
      ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
      : '#e5e7eb'};
  color: ${({ $hasContent }) => ($hasContent ? 'white' : '#9ca3af')};
  cursor: ${({ $hasContent }) => ($hasContent ? 'pointer' : 'not-allowed')};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  }

  &:disabled {
    opacity: 0.6;
  }
`;

const RuleDraftCard = styled.div`
  margin-top: 16px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const RuleDraftHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const RuleDraftTitle = styled.h4`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
`;

const RuleDraftBadge = styled.span<{ $type: string }>`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ $type }) => {
    switch ($type) {
      case 'Eligibility': return '#dcfce7';
      case 'Pricing': return '#fef3c7';
      case 'Compliance': return '#dbeafe';
      default: return '#f3f4f6';
    }
  }};
  color: ${({ $type }) => {
    switch ($type) {
      case 'Eligibility': return '#166534';
      case 'Pricing': return '#92400e';
      case 'Compliance': return '#1e40af';
      default: return '#374151';
    }
  }};
`;

const RuleDraftContent = styled.div`
  font-size: 14px;
  color: #4b5563;

  .condition, .outcome {
    padding: 8px 12px;
    border-radius: 8px;
    margin: 8px 0;
  }

  .condition {
    background: #fef3c7;
    border-left: 3px solid #f59e0b;
  }

  .outcome {
    background: #dcfce7;
    border-left: 3px solid #22c55e;
  }

  .label {
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 4px;
  }
`;

const RuleDraftActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;

  ${({ $variant }) =>
    $variant === 'primary'
      ? `
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
        border: none;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }
      `
      : `
        background: white;
        color: #374151;
        border: 1px solid #e5e7eb;

        &:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }
      `}

  svg {
    width: 16px;
    height: 16px;
  }
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
`;

const EmptyStateIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;

  svg {
    width: 32px;
    height: 32px;
    color: #6366f1;
  }
`;

const EmptyStateTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
`;

const EmptyStateText = styled.p`
  margin: 0 0 24px;
  font-size: 14px;
  color: #6b7280;
  max-width: 320px;
`;

const SuggestionChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
`;

const SuggestionChip = styled.button`
  padding: 8px 14px;
  border-radius: 20px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  background: rgba(99, 102, 241, 0.05);
  color: #6366f1;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: #6366f1;
    transform: translateY(-1px);
  }
`;

// ============================================================================
// Suggestion Examples
// ============================================================================

const RULE_SUGGESTIONS = [
  "Decline if years in business < 2",
  "Apply 15% surcharge for protection class 9-10",
  "Require referral if limit exceeds $5M",
  "Attach form CP0010 for frame construction",
];

// ============================================================================
// Helper Functions
// ============================================================================

const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ============================================================================
// Main Component
// ============================================================================

export const RuleBuilderChat = memo<RuleBuilderChatProps>(({
  productId,
  targetId,
  productContext,
  onRuleGenerated,
  onSaveRule,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<RuleDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Use ref for conversation history to avoid stale closure issues
  const conversationHistoryRef = useRef<ConversationMessage[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const trimmedContent = content.trim();
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: trimmedContent,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Get current conversation history from ref (always latest)
      const currentHistory = conversationHistoryRef.current;

      const request: RuleBuilderRequest = {
        text: trimmedContent,
        productId,
        targetId,
        productContext,
        conversationHistory: currentHistory,
      };

      const response = await generateRuleFromText(request);

      if (response.success) {
        if (response.draft) {
          // Complete rule generated
          const assistantMessage: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: response.message || `I've generated the rule "${response.draft.name}". Please review and save it.`,
            timestamp: new Date(),
            ruleDraft: response.draft,
          };

          setMessages(prev => [...prev, assistantMessage]);
          setCurrentDraft(response.draft);
          onRuleGenerated?.(response.draft);

          // Reset conversation history after successful rule generation
          conversationHistoryRef.current = [];
        } else if (response.message) {
          // Conversational response - AI is asking for more info
          const assistantMessage: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: response.message,
            timestamp: new Date(),
          };

          setMessages(prev => [...prev, assistantMessage]);

          // Update conversation history ref with both user and assistant messages
          conversationHistoryRef.current = [
            ...currentHistory,
            { role: 'user', content: trimmedContent },
            { role: 'assistant', content: response.message },
          ];
        }
      } else {
        const errorMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: response.error || 'I had trouble understanding that. Could you try rephrasing?',
          timestamp: new Date(),
          error: true,
        };

        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Rule generation error:', error);
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'An error occurred while processing your request. Please try again.',
        timestamp: new Date(),
        error: true,
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [isLoading, productId, productContext, onRuleGenerated]);

  // Handle keyboard input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  // Handle saving a rule
  const handleSaveRule = async (draft: RuleDraft) => {
    if (!onSaveRule) return;

    setIsSaving(true);
    try {
      await onSaveRule(draft);

      const successMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `✅ Rule "${draft.name}" has been saved successfully! Would you like to create another rule?`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, successMessage]);
      setCurrentDraft(null);
    } catch (error) {
      console.error('Error saving rule:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to clean up condition/outcome text (remove redundant IF/THEN prefixes)
  const cleanRuleText = (text: string, prefix: string): string => {
    if (!text) return '';
    // Remove leading IF/THEN/When/Then (case insensitive) and clean up
    return text.replace(/^(IF|THEN|When|Then)\s+/i, '').trim();
  };

  // Render a rule draft card
  const renderRuleDraft = (draft: RuleDraft) => (
    <RuleDraftCard>
      <RuleDraftHeader>
        <RuleDraftTitle>{draft.name}</RuleDraftTitle>
        <RuleDraftBadge $type={draft.ruleCategory}>{draft.ruleCategory}</RuleDraftBadge>
      </RuleDraftHeader>
      <RuleDraftContent>
        <div className="condition">
          <div className="label">When</div>
          {cleanRuleText(draft.conditionText, 'IF')}
        </div>
        <div className="outcome">
          <div className="label">Then</div>
          {cleanRuleText(draft.outcomeText, 'THEN')}
        </div>
      </RuleDraftContent>
      <RuleDraftActions>
        <ActionButton $variant="secondary" onClick={() => setCurrentDraft(null)}>
          <XCircleIcon />
          Discard
        </ActionButton>
        <ActionButton
          $variant="primary"
          onClick={() => handleSaveRule(draft)}
          disabled={isSaving}
        >
          <CheckCircleIcon />
          {isSaving ? 'Saving...' : 'Save Rule'}
        </ActionButton>
      </RuleDraftActions>
    </RuleDraftCard>
  );

  return (
    <Container>
      <Header>
        <HeaderIcon>
          <SparklesIcon />
        </HeaderIcon>
        <HeaderText>
          <Title>AI Rule Builder</Title>
          <Subtitle>Describe rules in plain English</Subtitle>
        </HeaderText>
      </Header>

      <MessagesContainer>
        {messages.length === 0 ? (
          <EmptyState>
            <EmptyStateIcon>
              <SparklesIcon />
            </EmptyStateIcon>
            <EmptyStateTitle>Create Rules with AI</EmptyStateTitle>
            <EmptyStateText>
              Describe your business rule in plain English and I'll convert it to programmable logic.
            </EmptyStateText>
            <SuggestionChips>
              {RULE_SUGGESTIONS.map((suggestion, index) => (
                <SuggestionChip key={index} onClick={() => sendMessage(suggestion)}>
                  {suggestion}
                </SuggestionChip>
              ))}
            </SuggestionChips>
          </EmptyState>
        ) : (
          <>
            {messages.map(msg => (
              <MessageWrapper key={msg.id} $isUser={msg.role === 'user'}>
                <MessageBubble $isUser={msg.role === 'user'}>
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <>
                      <UnifiedAIResponse content={msg.content} />
                      {msg.ruleDraft && renderRuleDraft(msg.ruleDraft)}
                    </>
                  )}
                </MessageBubble>
              </MessageWrapper>
            ))}
            {isLoading && (
              <MessageWrapper $isUser={false}>
                <MessageBubble $isUser={false}>
                  <LoadingIndicator>
                    <div className="spinner" />
                    Generating rule...
                  </LoadingIndicator>
                </MessageBubble>
              </MessageWrapper>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </MessagesContainer>

      <InputArea>
        <InputWrapper>
          <TextInput
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a rule in plain English..."
            disabled={isLoading}
            rows={1}
          />
          <SendButton
            onClick={() => sendMessage(inputValue)}
            disabled={isLoading || !inputValue.trim()}
            $hasContent={!!inputValue.trim()}
          >
            <PaperAirplaneIcon />
          </SendButton>
        </InputWrapper>
      </InputArea>
    </Container>
  );
});

RuleBuilderChat.displayName = 'RuleBuilderChat';

export default RuleBuilderChat;

