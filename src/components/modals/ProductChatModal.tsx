import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { XMarkIcon, PaperAirplaneIcon, SparklesIcon, DocumentTextIcon } from '@heroicons/react/24/solid';
import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import { extractPdfText } from '@utils/pdfChunking';
import { UnifiedAIResponse } from '@components/ui/UnifiedAIResponse';

// ============================================================================
// Types
// ============================================================================

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface Product {
  id: string;
  name: string;
  formDownloadUrl?: string;
  formNumber?: string;
}

interface ProductChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

// ============================================================================
// Animations
// ============================================================================

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const slideInRight = keyframes`
  from { opacity: 0; transform: translateX(12px); }
  to { opacity: 1; transform: translateX(0); }
`;

const slideInLeft = keyframes`
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
`;

const typingBounce = keyframes`
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.1); }
  50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.2); }
`;

// ============================================================================
// Styled Components
// ============================================================================

const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: ${fadeIn} 0.2s ease-out;
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  pointer-events: ${({ $isOpen }) => ($isOpen ? 'auto' : 'none')};
  transition: opacity 0.2s ease;
`;

const ModalContainer = styled.div`
  width: 100%;
  max-width: 720px;
  height: 85vh;
  max-height: 800px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${slideUp} 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(0, 0, 0, 0.05);

  @media (max-width: 768px) {
    max-width: 100%;
    height: 100%;
    max-height: 100%;
    border-radius: 0;
  }
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const AIBadge = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${glowPulse} 3s ease-in-out infinite;
  
  svg {
    width: 20px;
    height: 20px;
    color: white;
  }
`;

const HeaderInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
`;

const Subtitle = styled.span`
  font-size: 13px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const CloseButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.08);
    color: #1e293b;
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  scroll-behavior: smooth;
  background: #f8fafc;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.2);
  }
`;

const EmptyStateContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  text-align: center;
  gap: 20px;
`;

const EmptyStateIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 36px;
    height: 36px;
    color: #6366f1;
  }
`;

const EmptyStateTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
`;

const EmptyStateText = styled.p`
  margin: 0;
  font-size: 14px;
  color: #64748b;
  max-width: 360px;
  line-height: 1.6;
`;

const QuickPrompts = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 8px;
`;

const QuickPrompt = styled.button`
  padding: 10px 16px;
  border-radius: 20px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  background: rgba(99, 102, 241, 0.05);
  color: #6366f1;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: #6366f1;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const MessageWrapper = styled.div<{ $isUser: boolean }>`
  display: flex;
  justify-content: ${({ $isUser }) => ($isUser ? 'flex-end' : 'flex-start')};
  padding: 8px 0;
  animation: ${({ $isUser }) => ($isUser ? slideInRight : slideInLeft)} 0.25s ease-out;
`;

const MessageBubble = styled.div<{ $isUser: boolean }>`
  max-width: 85%;
  padding: ${({ $isUser }) => ($isUser ? '12px 18px' : '16px 20px')};
  border-radius: ${({ $isUser }) => ($isUser ? '20px 20px 4px 20px' : '4px 20px 20px 20px')};
  background: ${({ $isUser, theme }) =>
    $isUser
      ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
      : '#ffffff'};
  color: ${({ $isUser, theme }) =>
    $isUser
      ? '#ffffff'
      : '#374151'};
  font-size: 15px;
  line-height: 1.6;
  box-shadow: ${({ $isUser }) =>
    $isUser
      ? '0 4px 12px rgba(99, 102, 241, 0.3)'
      : '0 2px 8px rgba(0, 0, 0, 0.06)'};
  border: ${({ $isUser, theme }) =>
    $isUser
      ? 'none'
      : `1px solid ${'rgba(0,0,0,0.04)'}`};

  /* Markdown content styling */
  p { margin: 0 0 0.75em; &:last-child { margin-bottom: 0; } }
  ul, ol { margin: 0.5em 0; padding-left: 1.5em; }
  li { margin: 0.25em 0; }
  strong { font-weight: 600; }
  code {
    background: ${({ $isUser, theme }) =>
      $isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)'};
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9em;
  }
`;

const TypingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 16px 20px;
  background: #ffffff;
  border-radius: 4px 20px 20px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.04);
  animation: ${slideInLeft} 0.25s ease-out;
`;

const TypingDot = styled.span<{ $delay: number }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  animation: ${typingBounce} 1.2s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}ms;
`;

const InputArea = styled.div`
  padding: 16px 24px 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  background: #ffffff;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 12px;
`;

const TextInput = styled.textarea`
  flex: 1;
  min-height: 52px;
  max-height: 150px;
  padding: 14px 52px 14px 18px;
  border: 2px solid rgba(99, 102, 241, 0.15);
  border-radius: 26px;
  font-size: 15px;
  font-family: inherit;
  line-height: 1.5;
  resize: none;
  background: #ffffff;
  color: #1e293b;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SendButton = styled.button<{ $hasContent: boolean }>`
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  background: ${({ $hasContent }) =>
    $hasContent
      ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
      : 'transparent'};
  color: ${({ $hasContent, theme }) =>
    $hasContent
      ? '#ffffff'
      : '#cbd5e1'};
  cursor: ${({ $hasContent }) => ($hasContent ? 'pointer' : 'default')};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: ${({ $hasContent }) =>
    $hasContent ? '0 4px 12px rgba(99, 102, 241, 0.35)' : 'none'};

  svg {
    width: 18px;
    height: 18px;
    transition: transform 0.15s ease;
  }

  &:hover:not(:disabled) {
    ${({ $hasContent }) => $hasContent && css`
      transform: scale(1.08);
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.45);
    `}
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ContextBadge = styled.div<{ $loaded: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  margin-bottom: 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  background: ${({ $loaded, theme }) =>
    $loaded
      ? 'rgba(34, 197, 94, 0.1)'
      : 'rgba(234, 179, 8, 0.1)'};
  color: ${({ $loaded }) => $loaded ? '#22c55e' : '#eab308'};
  border: 1px solid ${({ $loaded }) => $loaded ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)'};

  svg {
    width: 14px;
    height: 14px;
  }
`;

const LoadingShimmer = styled.div`
  height: 12px;
  width: 60px;
  border-radius: 4px;
  background: linear-gradient(90deg,
    rgba(99, 102, 241, 0.1) 0%,
    rgba(99, 102, 241, 0.3) 50%,
    rgba(99, 102, 241, 0.1) 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;

// ============================================================================
// Quick Prompts
// ============================================================================

const QUICK_PROMPTS = [
  'Summarize the key coverages',
  'What are the exclusions?',
  'Explain the deductible options',
  'What limits are available?',
];

// ============================================================================
// Component
// ============================================================================

const ProductChatModal: React.FC<ProductChatModalProps> = memo(({ isOpen, onClose, product }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pdfText, setPdfText] = useState<string>('');
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isPdfLoaded, setIsPdfLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load PDF text when modal opens
  useEffect(() => {
    if (isOpen && product?.formDownloadUrl) {
      setIsPdfLoading(true);
      setIsPdfLoaded(false);

      extractPdfText(product.formDownloadUrl)
        .then(text => {
          setPdfText(text.split(/\s+/).slice(0, 100000).join(' '));
          setIsPdfLoaded(true);
        })
        .catch(err => {
          console.error('Failed to load PDF:', err);
          setPdfText('');
          setIsPdfLoaded(false);
        })
        .finally(() => setIsPdfLoading(false));
    }
  }, [isOpen, product?.formDownloadUrl]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setInputValue('');
      setPdfText('');
      setIsPdfLoaded(false);
    }
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Use ref to always have current messages for API calls
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || !product) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    // Update state and get current messages for API
    const currentMessages = [...messagesRef.current, userMessage];
    setMessages(currentMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const systemPrompt = `You are an expert P&C insurance assistant helping with questions about "${product.name}".
${pdfText ? `Use this form content as your primary reference:\n\n${pdfText.slice(0, 50000)}` : 'No form content is available.'}

Guidelines:
- Be concise and direct
- Use bullet points for lists
- Reference specific sections when applicable
- If information isn't in the form, say so clearly`;

      const generateChat = httpsCallable(functions, 'generateChatResponse');

      // Use currentMessages which includes the new user message
      const historyMessages = currentMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const result = await generateChat({
        messages: [
          { role: 'system', content: systemPrompt },
          ...historyMessages
        ],
        model: 'gpt-4o-mini',
        maxTokens: 1500,
        temperature: 0.7
      });

      const data = result.data as { success: boolean; content?: string };

      if (!data.success || !data.content) {
        throw new Error('Failed to generate response');
      }

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.content.trim(),
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [isLoading, product, pdfText]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  if (!isOpen || !product) return null;

  return (
    <Overlay $isOpen={isOpen} onClick={onClose}>
      <ModalContainer ref={containerRef} onClick={e => e.stopPropagation()}>
        <Header>
          <HeaderLeft>
            <AIBadge>
              <SparklesIcon />
            </AIBadge>
            <HeaderInfo>
              <Title>{product.name}</Title>
              <Subtitle>
                {isPdfLoading ? (
                  <>Loading form context<LoadingShimmer /></>
                ) : isPdfLoaded ? (
                  <>
                    <DocumentTextIcon style={{ width: 14, height: 14 }} />
                    Form context loaded
                  </>
                ) : (
                  'AI Insurance Assistant'
                )}
              </Subtitle>
            </HeaderInfo>
          </HeaderLeft>
          <CloseButton onClick={onClose} aria-label="Close chat">
            <XMarkIcon />
          </CloseButton>
        </Header>

        <MessagesContainer>
          {messages.length === 0 ? (
            <EmptyStateContainer>
              <EmptyStateIcon>
                <SparklesIcon />
              </EmptyStateIcon>
              <EmptyStateTitle>Ask me anything</EmptyStateTitle>
              <EmptyStateText>
                I have access to the form content and can help you understand coverages,
                exclusions, limits, and more.
              </EmptyStateText>
            </EmptyStateContainer>
          ) : (
            <>
              {messages.map(msg => (
                <MessageWrapper key={msg.id} $isUser={msg.role === 'user'}>
                  <MessageBubble $isUser={msg.role === 'user'}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <UnifiedAIResponse content={msg.content} />
                    )}
                  </MessageBubble>
                </MessageWrapper>
              ))}
              {isLoading && (
                <MessageWrapper $isUser={false}>
                  <TypingIndicator>
                    <TypingDot $delay={0} />
                    <TypingDot $delay={150} />
                    <TypingDot $delay={300} />
                  </TypingIndicator>
                </MessageWrapper>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </MessagesContainer>

        <InputArea>
          {isPdfLoaded && messages.length === 0 && (
            <ContextBadge $loaded={isPdfLoaded}>
              <DocumentTextIcon />
              Form context ready
            </ContextBadge>
          )}
          <InputWrapper>
            <TextInput
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this form..."
              disabled={isLoading}
              rows={1}
            />
            <SendButton
              onClick={() => sendMessage(inputValue)}
              disabled={isLoading || !inputValue.trim()}
              $hasContent={!!inputValue.trim()}
              aria-label="Send message"
            >
              <PaperAirplaneIcon />
            </SendButton>
          </InputWrapper>
        </InputArea>
      </ModalContainer>
    </Overlay>
  );
});

ProductChatModal.displayName = 'ProductChatModal';

export default ProductChatModal;

