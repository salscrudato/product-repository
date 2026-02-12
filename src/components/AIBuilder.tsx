import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, collectionGroup, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import styled, { keyframes, css } from 'styled-components';
import {
  SparklesIcon,
  LightBulbIcon,
  ArrowUpIcon,
  CubeIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ChevronLeftIcon,
  PlusIcon,
  ArrowPathIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  ChartBarIcon,
  BoltIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline';
import { CpuChipIcon } from '@heroicons/react/24/solid';
import MarkdownRenderer from '@utils/markdownParser';
import { sanitizeMarkdownWithLimit } from '@utils/markdownSanitizer';
import { withTimeout, DEFAULT_AI_RETRY_OPTIONS } from '@utils/aiTimeout';
import { AI_MODELS, AI_PARAMETERS, AI_PROMPTS } from '@config/aiConfig';
import { colors } from '@components/common/DesignSystem';

// ============ Animations ============
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const typing = keyframes`
  0% { opacity: 0.3; }
  50% { opacity: 1; }
  100% { opacity: 0.3; }
`;

// ============ Layout ============
const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  animation: ${fadeIn} 0.4s ease-out;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  color: ${colors.gray600};
  cursor: pointer;
  transition: all 0.2s ease;
  svg { width: 20px; height: 20px; }
  &:hover {
    background: rgba(0, 0, 0, 0.04);
    color: ${colors.gray800};
  }
`;

const PageTitle = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  h1 {
    font-size: 20px;
    font-weight: 700;
    color: ${colors.gray900};
    margin: 0;
    letter-spacing: -0.02em;
    display: flex;
    align-items: center;
    gap: 8px;
    svg { width: 22px; height: 22px; color: ${colors.primary}; }
  }
  span {
    font-size: 13px;
    color: ${colors.gray500};
    font-weight: 500;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
`;

const ActionButton = styled.button<{ $primary?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  svg { width: 18px; height: 18px; }

  ${({ $primary }) => $primary ? css`
    background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
    color: white;
    border: none;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
    }
  ` : css`
    background: white;
    color: ${colors.gray600};
    border: 1.5px solid ${colors.gray200};
    &:hover {
      background: ${colors.gray50};
      border-color: ${colors.gray300};
    }
  `}
`;

// ============ Main Content Grid ============
const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 0;
  height: calc(100vh - 73px);

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

// ============ Context Panel (Left Sidebar) ============
const ContextPanel = styled.aside`
  background: white;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${fadeIn} 0.5s ease-out;

  @media (max-width: 1024px) {
    display: none;
  }
`;

const ContextHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid ${colors.gray100};
`;

const ContextTitle = styled.h3`
  font-size: 11px;
  font-weight: 700;
  color: ${colors.gray400};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 16px 0;
`;

const StatCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${colors.gray50};
  border-radius: 12px;
  margin-bottom: 10px;

  &:last-child { margin-bottom: 0; }
`;

const StatIcon = styled.div<{ $color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ $color }) => `${$color}12`};
  display: flex;
  align-items: center;
  justify-content: center;
  svg { width: 20px; height: 20px; color: ${({ $color }) => $color}; }
`;

const StatInfo = styled.div`
  flex: 1;
  .value {
    font-size: 18px;
    font-weight: 700;
    color: ${colors.gray900};
  }
  .label {
    font-size: 12px;
    color: ${colors.gray500};
  }
`;

const QuickActionsSection = styled.div`
  padding: 20px;
  border-bottom: 1px solid ${colors.gray100};
`;

const QuickActionButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: white;
  border: 1.5px solid ${colors.gray200};
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  color: ${colors.gray700};
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 8px;
  text-align: left;

  svg { width: 18px; height: 18px; color: ${colors.gray500}; }

  &:hover {
    background: ${colors.gray50};
    border-color: ${colors.primary}40;
    color: ${colors.primary};
    svg { color: ${colors.primary}; }
  }

  &:last-child { margin-bottom: 0; }
`;

const TipsSection = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
`;

const TipCard = styled.div`
  padding: 14px;
  background: linear-gradient(135deg, ${colors.primary}08 0%, ${colors.secondary}05 100%);
  border-radius: 12px;
  border: 1px solid ${colors.primary}15;
  margin-bottom: 12px;

  h4 {
    font-size: 13px;
    font-weight: 600;
    color: ${colors.gray800};
    margin: 0 0 6px 0;
    display: flex;
    align-items: center;
    gap: 6px;
    svg { width: 14px; height: 14px; color: ${colors.primary}; }
  }

  p {
    font-size: 12px;
    color: ${colors.gray600};
    margin: 0;
    line-height: 1.5;
  }
`;

// ============ Chat Area (Main Content) ============
const ChatArea = styled.main`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${colors.gray50};
  overflow: hidden;
`;

const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  scroll-behavior: smooth;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${colors.gray300};
    border-radius: 3px;
  }
`;

const MessageGroup = styled.div<{ $isUser: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $isUser }) => $isUser ? 'flex-end' : 'flex-start'};
  gap: 8px;
  animation: ${fadeIn} 0.3s ease-out;
  max-width: 85%;
  align-self: ${({ $isUser }) => $isUser ? 'flex-end' : 'flex-start'};
`;

const MessageAvatar = styled.div<{ $isUser: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $isUser }) => $isUser
    ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
    : colors.gray100};
  svg {
    width: 16px;
    height: 16px;
    color: ${({ $isUser }) => $isUser ? 'white' : colors.gray600};
  }
`;

const MessageBubble = styled.div<{ $isUser: boolean }>`
  padding: 16px 20px;
  border-radius: ${({ $isUser }) => $isUser ? '20px 20px 6px 20px' : '20px 20px 20px 6px'};
  background: ${({ $isUser }) => $isUser
    ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
    : 'white'};
  color: ${({ $isUser }) => $isUser ? 'white' : colors.gray800};
  font-size: 14px;
  line-height: 1.7;
  box-shadow: ${({ $isUser }) => $isUser
    ? '0 4px 16px rgba(99, 102, 241, 0.25)'
    : '0 2px 8px rgba(0, 0, 0, 0.06)'};
  border: ${({ $isUser }) => $isUser ? 'none' : `1px solid ${colors.gray100}`};

  /* Markdown styling for AI responses */
  h1, h2, h3, h4 { margin: 16px 0 8px 0; color: ${colors.gray900}; }
  h1 { font-size: 18px; }
  h2 { font-size: 16px; }
  h3 { font-size: 15px; }
  p { margin: 0 0 12px 0; }
  p:last-child { margin-bottom: 0; }
  ul, ol { margin: 8px 0; padding-left: 20px; }
  li { margin: 4px 0; }
  code {
    background: ${({ $isUser }) => $isUser ? 'rgba(255,255,255,0.2)' : colors.gray100};
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
  }
  pre {
    background: ${colors.gray800};
    color: white;
    padding: 12px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 12px 0;
    code { background: transparent; padding: 0; }
  }
  strong { font-weight: 600; }
`;

const MessageMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: ${colors.gray400};
`;

const CopyButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  color: ${colors.gray400};
  cursor: pointer;
  transition: all 0.2s ease;
  svg { width: 12px; height: 12px; }
  &:hover { background: ${colors.gray100}; color: ${colors.gray600}; }
`;

const TypingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 16px 20px;
  background: white;
  border-radius: 20px 20px 20px 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid ${colors.gray100};

  span {
    width: 8px;
    height: 8px;
    background: ${colors.gray400};
    border-radius: 50%;
    animation: ${typing} 1.4s infinite;
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
`;

// ============ Welcome State ============
const WelcomeContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
`;

const WelcomeIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 24px;
  background: linear-gradient(135deg, ${colors.primary}15 0%, ${colors.secondary}10 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  svg { width: 40px; height: 40px; color: ${colors.primary}; }
`;

const WelcomeTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: ${colors.gray900};
  margin: 0 0 8px 0;
  letter-spacing: -0.02em;
`;

const WelcomeSubtitle = styled.p`
  font-size: 15px;
  color: ${colors.gray500};
  margin: 0 0 32px 0;
  max-width: 400px;
  line-height: 1.6;
`;

const SuggestionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-width: 600px;
  width: 100%;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const SuggestionCard = styled.button`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: white;
  border: 1.5px solid ${colors.gray200};
  border-radius: 14px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${colors.primary}50;
    background: ${colors.primary}05;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
  }
`;

const SuggestionIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${colors.primary}10;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg { width: 18px; height: 18px; color: ${colors.primary}; }
`;

const SuggestionText = styled.div`
  flex: 1;
  h4 {
    font-size: 14px;
    font-weight: 600;
    color: ${colors.gray800};
    margin: 0 0 4px 0;
  }
  p {
    font-size: 12px;
    color: ${colors.gray500};
    margin: 0;
    line-height: 1.4;
  }
`;

// ============ Input Area (matches Home page styling) ============
const InputArea = styled.div`
  padding: 16px 24px;
  background: transparent;

  @media (max-width: 768px) {
    padding: 12px 16px;
  }
`;

const InputWrapper = styled.div`
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  display: flex;
  align-items: center;
`;

const ChatInput = styled.textarea`
  width: 100%;
  padding: 14px 56px 14px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 28px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  min-height: 48px;
  max-height: 200px;
  background: #ffffff;
  color: #1e293b;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;

  &:hover:not(:focus):not(:disabled) {
    border-color: #cbd5e1;
  }

  &:focus {
    outline: none;
    border-color: #a78bfa;
    box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.15), 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  &::placeholder {
    color: #94a3b8;
    font-size: 14px;
  }

  &:focus::placeholder {
    color: #cbd5e1;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    font-size: 14px;
    padding: 12px 52px 12px 16px;
    min-height: 44px;
    border-radius: 24px;
  }
`;

const SendButton = styled.button<{ $loading?: boolean }>`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #7c3aed;
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 2px 6px rgba(124, 58, 237, 0.3);

  svg {
    width: 16px;
    height: 16px;
    stroke-width: 2.5;
  }

  &:hover:not(:disabled) {
    background: #6d28d9;
    transform: translateY(-50%) scale(1.05);
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(-50%) scale(0.95);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: translateY(-50%);
    background: #cbd5e1;
    box-shadow: none;
  }

  ${({ $loading }) => $loading && css`
    svg { animation: ${pulse} 1s infinite; }
  `}

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
    right: 6px;

    svg {
      width: 14px;
      height: 14px;
    }
  }
`;

const InputHint = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
  font-size: 11px;
  color: ${colors.gray400};
  gap: 16px;

  kbd {
    background: ${colors.gray100};
    padding: 2px 6px;
    border-radius: 4px;
    font-family: inherit;
    font-size: 10px;
  }
`;

// ============ Types ============
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ContextData {
  products: Array<{ id: string; name: string; category?: string }>;
  coverages: Array<{ id: string; name?: string; productId: string }>;
  forms: Array<{ id: string; name?: string; formNumber?: string }>;
}

interface Suggestion {
  title: string;
  description: string;
  prompt: string;
  icon: React.ComponentType<{ className?: string }>;
}

// ============ Suggestions Data ============
const SUGGESTIONS: Suggestion[] = [
  {
    title: 'Homeowners Product',
    description: 'Create a comprehensive HO3-style policy',
    prompt: 'Help me create a homeowners insurance product with dwelling, personal property, and liability coverages',
    icon: CubeIcon
  },
  {
    title: 'Commercial Package',
    description: 'Build a BOP for small businesses',
    prompt: 'Design a business owners policy (BOP) for small retail businesses',
    icon: ChartBarIcon
  },
  {
    title: 'Analyze Coverages',
    description: 'Review existing coverage structures',
    prompt: 'Analyze my existing products and suggest coverage gaps or improvements',
    icon: DocumentTextIcon
  },
  {
    title: 'Cyber Liability',
    description: 'Modern cyber risk protection',
    prompt: 'Create a cyber liability product for technology companies',
    icon: ShieldCheckIcon
  }
];

const AIBuilder = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [contextData, setContextData] = useState<ContextData | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, chatLoading, scrollToBottom]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch context data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const productsSnap = await getDocs(collection(db, 'products'));
        const productList = productsSnap.docs
          .map(doc => {
            const data = doc.data();
            return { id: doc.id, name: data.name, category: data.category, archived: data.archived };
          })
          .filter(p => !p.archived);

        const coveragesSnap = await getDocs(collectionGroup(db, 'coverages'));
        const productIds = new Set(productList.map(p => p.id));
        const coverageList = coveragesSnap.docs
          .map(doc => ({
            id: doc.id,
            name: doc.data().name,
            productId: doc.ref.parent.parent?.id || '',
          }))
          .filter(c => productIds.has(c.productId));

        const formsSnap = await getDocs(collection(db, 'forms'));
        const formList = formsSnap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          formNumber: doc.data().formNumber
        }));

        setContextData({
          products: productList,
          coverages: coverageList,
          forms: formList
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  // Build context string for AI
  const buildContextString = useMemo(() => {
    if (!contextData) return '';

    const productNames = contextData.products.map(p => p.name).slice(0, 10).join(', ');
    const coverageNames = [...new Set(contextData.coverages.map(c => c.name).filter(Boolean))].slice(0, 15).join(', ');

    return `
DATABASE CONTEXT:
- Products (${contextData.products.length}): ${productNames}${contextData.products.length > 10 ? '...' : ''}
- Coverages (${contextData.coverages.length}): ${coverageNames}${contextData.coverages.length > 15 ? '...' : ''}
- Forms (${contextData.forms.length}): Available for association

You can reference these existing products and coverages when making recommendations.`;
  }, [contextData]);

  const handleChatMessage = useCallback(async (messageOverride?: string) => {
    const messageToSend = messageOverride || chatInput.trim();
    if (!messageToSend || chatLoading || !contextData) return;

    setChatInput('');
    setChatLoading(true);

    const newUserMessage: ChatMessage = {
      role: 'user',
      content: messageToSend,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, newUserMessage]);

    try {
      const generateChat = httpsCallable(functions, 'generateChatResponse');

      const result = await withTimeout(
        generateChat({
          messages: [
            { role: 'system', content: AI_PROMPTS.PRODUCT_BUILDER_SYSTEM },
            { role: 'system', content: buildContextString },
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: messageToSend }
          ],
          model: AI_MODELS.PRODUCT_BUILDER,
          maxTokens: AI_PARAMETERS.PRODUCT_BUILDER.max_tokens,
          temperature: AI_PARAMETERS.PRODUCT_BUILDER.temperature
        }) as Promise<{ data: { success: boolean; content?: string } }>,
        DEFAULT_AI_RETRY_OPTIONS.timeoutMs,
        'AI chat response'
      );

      const data = result.data;
      if (!data.success) {
        throw new Error('Failed to generate chat response');
      }

      const aiResponse = sanitizeMarkdownWithLimit(data.content?.trim() || '', 8000);
      if (aiResponse) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error in AI chat:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setChatLoading(false);
      inputRef.current?.focus();
    }
  }, [chatInput, chatLoading, contextData, chatMessages, buildContextString]);

  const handleSuggestionClick = useCallback((prompt: string) => {
    handleChatMessage(prompt);
  }, [handleChatMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatMessage();
    }
  }, [handleChatMessage]);

  const handleCopy = useCallback(async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const handleNewChat = useCallback(() => {
    setChatMessages([]);
    setChatInput('');
    inputRef.current?.focus();
  }, []);

  return (
    <PageContainer>
      {/* Top Bar */}
      <TopBar>
        <BackButton onClick={() => navigate('/builder')}>
          <ChevronLeftIcon />
          Back to Builder
        </BackButton>

        <PageTitle>
          <h1>
            <CpuChipIcon />
            AI Product Builder
          </h1>
          <span>
            {contextData
              ? `${contextData.products.length} products • ${contextData.coverages.length} coverages • ${contextData.forms.length} forms`
              : 'Loading context...'}
          </span>
        </PageTitle>

        <HeaderActions>
          {chatMessages.length > 0 && (
            <ActionButton onClick={handleNewChat}>
              <ArrowPathIcon />
              New Chat
            </ActionButton>
          )}
          <ActionButton $primary onClick={() => navigate('/builder')}>
            <PlusIcon />
            Create Product
          </ActionButton>
        </HeaderActions>
      </TopBar>

      {/* Main Content Grid */}
      <ContentGrid>
        {/* Context Panel (Left Sidebar) */}
        <ContextPanel>
          <ContextHeader>
            <ContextTitle>Database Context</ContextTitle>
            <StatCard>
              <StatIcon $color={colors.primary}>
                <CubeIcon />
              </StatIcon>
              <StatInfo>
                <div className="value">{contextData?.products.length || 0}</div>
                <div className="label">Products</div>
              </StatInfo>
            </StatCard>
            <StatCard>
              <StatIcon $color={colors.success}>
                <ShieldCheckIcon />
              </StatIcon>
              <StatInfo>
                <div className="value">{contextData?.coverages.length || 0}</div>
                <div className="label">Coverages</div>
              </StatInfo>
            </StatCard>
            <StatCard>
              <StatIcon $color={colors.warning}>
                <DocumentTextIcon />
              </StatIcon>
              <StatInfo>
                <div className="value">{contextData?.forms.length || 0}</div>
                <div className="label">Forms</div>
              </StatInfo>
            </StatCard>
          </ContextHeader>

          <QuickActionsSection>
            <ContextTitle>Quick Actions</ContextTitle>
            <QuickActionButton onClick={() => handleSuggestionClick('List all my products and their coverages')}>
              <ChartBarIcon />
              Analyze Portfolio
            </QuickActionButton>
            <QuickActionButton onClick={() => handleSuggestionClick('What coverages are most common across my products?')}>
              <BoltIcon />
              Coverage Insights
            </QuickActionButton>
            <QuickActionButton onClick={() => handleSuggestionClick('Suggest improvements for my product lineup')}>
              <LightBulbIcon />
              Get Recommendations
            </QuickActionButton>
          </QuickActionsSection>

          <TipsSection>
            <ContextTitle>Tips</ContextTitle>
            <TipCard>
              <h4><CommandLineIcon /> Be Specific</h4>
              <p>Describe the product type, target market, and key coverages you need.</p>
            </TipCard>
            <TipCard>
              <h4><SparklesIcon /> Use Examples</h4>
              <p>Reference existing products like "similar to HO3" for better results.</p>
            </TipCard>
          </TipsSection>
        </ContextPanel>

        {/* Chat Area */}
        <ChatArea>
          {chatMessages.length === 0 ? (
            <WelcomeContainer>
              <WelcomeIcon>
                <SparklesIcon />
              </WelcomeIcon>
              <WelcomeTitle>AI Product Builder</WelcomeTitle>
              <WelcomeSubtitle>
                Describe the insurance product you want to create, and I'll help you build it with intelligent recommendations based on your existing portfolio.
              </WelcomeSubtitle>
              <SuggestionGrid>
                {SUGGESTIONS.map((suggestion, index) => (
                  <SuggestionCard
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion.prompt)}
                  >
                    <SuggestionIcon>
                      <suggestion.icon />
                    </SuggestionIcon>
                    <SuggestionText>
                      <h4>{suggestion.title}</h4>
                      <p>{suggestion.description}</p>
                    </SuggestionText>
                  </SuggestionCard>
                ))}
              </SuggestionGrid>
            </WelcomeContainer>
          ) : (
            <ChatMessages>
              {chatMessages.map((message, index) => (
                <MessageGroup key={index} $isUser={message.role === 'user'}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexDirection: message.role === 'user' ? 'row-reverse' : 'row' }}>
                    <MessageAvatar $isUser={message.role === 'user'}>
                      {message.role === 'user' ? <CommandLineIcon /> : <SparklesIcon />}
                    </MessageAvatar>
                    <MessageBubble $isUser={message.role === 'user'}>
                      {message.role === 'user' ? (
                        message.content
                      ) : (
                        <MarkdownRenderer>{message.content}</MarkdownRenderer>
                      )}
                    </MessageBubble>
                  </div>
                  {message.role === 'assistant' && (
                    <MessageMeta>
                      <CopyButton onClick={() => handleCopy(message.content, index)}>
                        {copiedIndex === index ? <CheckIcon /> : <ClipboardDocumentIcon />}
                        {copiedIndex === index ? 'Copied!' : 'Copy'}
                      </CopyButton>
                    </MessageMeta>
                  )}
                </MessageGroup>
              ))}

              {chatLoading && (
                <MessageGroup $isUser={false}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <MessageAvatar $isUser={false}>
                      <SparklesIcon />
                    </MessageAvatar>
                    <TypingIndicator>
                      <span />
                      <span />
                      <span />
                    </TypingIndicator>
                  </div>
                </MessageGroup>
              )}

              <div ref={messagesEndRef} />
            </ChatMessages>
          )}

          {/* Input Area */}
          <InputArea>
            <InputWrapper>
              <ChatInput
                ref={inputRef}
                placeholder="Describe the product you want to build..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <SendButton
                onClick={() => handleChatMessage()}
                disabled={!chatInput.trim() || chatLoading}
                $loading={chatLoading}
                title="Send message"
              >
                <ArrowUpIcon />
              </SendButton>
            </InputWrapper>
            <InputHint>
              <span><kbd>Enter</kbd> to send</span>
              <span><kbd>Shift + Enter</kbd> for new line</span>
            </InputHint>
          </InputArea>
        </ChatArea>
      </ContentGrid>
    </PageContainer>
  );
};

export default AIBuilder;

