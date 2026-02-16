import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import {
  color, neutral, accent, space, radius, shadow, semantic, border as borderToken,
  fontFamily, duration,
} from '../ui/tokens';
import {
  SparklesIcon,
  TrashIcon,
  ArrowUpIcon,
  ClipboardDocumentIcon,
  CheckIcon
} from '@heroicons/react/24/solid';
import MainNavigation from './ui/Navigation';
import { EnhancedChatMessage } from './ui/EnhancedChatMessage';
import useProducts from '@hooks/useProducts';
import { useDeepMemo } from '@hooks/useAdvancedMemo';
import logger, { LOG_CATEGORIES } from '@utils/logger';
import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import { AI_MODELS, AI_PARAMETERS } from '../config/aiConfig';
import firebaseOptimized from '../services/firebaseOptimized';
import aiPromptOptimizer from '../services/aiPromptOptimizer';
import responseFormatter from '../services/responseFormatter';
import { fadeInUp, slideInLeft, slideInRight, pulseGlow, typingDots } from '@/styles/animations';



// Types for chat messages
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    queryType?: string;
    confidence?: number;
    tokensUsed?: number;
    processingTime?: number;
    sources?: string[];
    isStructured?: boolean;
  };
}

// Query classification types
type QueryType =
  | 'product_analysis'
  | 'coverage_analysis'
  | 'pricing_analysis'
  | 'compliance_check'
  | 'task_management'
  | 'strategic_insight'
  | 'data_query'
  | 'claims_analysis'
  | 'form_analysis'
  | 'general';

/* ---------- styled components ---------- */
const Page = styled.div`
  min-height: 100vh;
  background: ${neutral[50]};
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.main<{ $isEmpty: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  padding: 0;
  height: calc(100vh - 64px);
  position: relative;
  z-index: 1;

  /* Center content when empty - position it slightly above center */
  ${({ $isEmpty }) => $isEmpty && `
    justify-content: center;
    align-items: center;
    padding-top: 60px;
  `}

  @media (max-width: 768px) {
    height: calc(100vh - 56px);

    ${({ $isEmpty }: { $isEmpty: boolean }) => $isEmpty && `
      padding-top: 40px;
    `}
  }
`;

const ChatContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${space[6]} ${space[4]};
  display: flex;
  flex-direction: column;
  gap: 0;

  /* Custom scrollbar - minimal */
  &::-webkit-scrollbar {
    width: ${space[1.5]};
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
    border-radius: ${radius.xs};
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.25);
  }

  @media (max-width: 768px) {
    padding: ${space[4]};
    gap: ${space[4]};
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${space[8]} ${space[6]} ${space[6]};
  text-align: center;
  gap: ${space[3]};
  width: 100%;
  max-width: 700px;

  svg {
    width: ${space[12]};
    height: ${space[12]};
    color: ${neutral[400]};
    margin-bottom: ${space[1]};
  }

  h2 {
    font-size: 22px;
    font-weight: 600;
    color: ${color.text};
    margin: 0;
  }

  p {
    font-size: 14px;
    color: ${color.textSecondary};
    margin: 0;
    max-width: 480px;
    line-height: 1.6;
  }

  @media (max-width: 768px) {
    padding: ${space[6]} ${space[4]} ${space[5]};

    svg {
      width: ${space[10]};
      height: ${space[10]};
    }

    h2 {
      font-size: 18px;
    }

    p {
      font-size: 13px;
    }
  }
`;

const CenteredContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${space[8]};
  width: 100%;
  max-width: 700px;
  padding: 0 ${space[6]};

  @media (max-width: 768px) {
    padding: 0 ${space[4]};
    gap: ${space[6]};
  }
`;

const MessageGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space[2]};
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  animation: ${fadeInUp} 0.3s ease-out;
`;

const UserMessage = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: ${space[2]} 0;
  animation: ${slideInRight} 0.25s ease-out;

  .content {
    background: ${accent[600]};
    color: ${neutral[0]};
    padding: ${space[3]} ${space[4]};
    border-radius: ${radius.xl} ${radius.xl} ${radius.xs} ${radius.xl};
    max-width: 75%;
    font-size: 14px;
    line-height: 1.55;
    word-wrap: break-word;
  }

  @media (max-width: 768px) {
    .content {
      max-width: 90%;
      font-size: 14px;
      padding: ${space[3]} 14px;
    }
  }
`;

const AssistantMessage = styled.div`
  display: flex;
  gap: ${space[4]};
  align-items: flex-start;
  padding: ${space[4]} 0;
  animation: ${slideInLeft} 0.25s ease-out;

  .avatar {
    width: 28px;
    height: 28px;
    border-radius: ${radius.md};
    background: ${accent[600]};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: ${space[0.5]};

    svg {
      width: 14px;
      height: 14px;
      color: ${neutral[0]};
    }
  }

  .content {
    flex: 1;
    min-width: 0;
    background: ${color.bg};
    color: ${color.text};
    padding: 14px 18px;
    border-radius: ${radius.xs} ${radius.xl} ${radius.xl} ${radius.xl};
    border: 1px solid ${neutral[200]};
  }

  .message-actions {
    display: flex;
    gap: ${space[1]};
    margin-top: ${space[3]};
    opacity: 0;
    transition: opacity ${duration.normal} ease;
  }

  &:hover .message-actions {
    opacity: 1;
  }

  @media (max-width: 768px) {
    gap: ${space[3]};

    .avatar {
      width: 28px;
      height: 28px;

      svg {
        width: 14px;
        height: 14px;
      }
    }

    .content {
      padding: 14px ${space[4]};
    }

    .message-actions {
      opacity: 1;
    }
  }
`;

const ActionButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${space[1]};
  padding: ${space[1.5]} ${space[2.5]};
  border-radius: ${radius.sm};
  border: none;
  background: transparent;
  color: ${({ $active }) => $active ? semantic.success : color.textSecondary};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all ${duration.fast} ease;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: ${({ $active }) => $active ? semantic.success : color.text};
  }
`;

const InputContainer = styled.div<{ $isCentered: boolean }>`
  padding: ${space[4]} ${space[6]};
  background: transparent;

  /* Center the input when no chat history */
  ${({ $isCentered }) => $isCentered && `
    width: 100%;
    max-width: 800px;
  `}

  @media (max-width: 768px) {
    padding: ${space[3]} ${space[4]};
  }
`;

const InputWrapper = styled.div`
  max-width: 100%;
  margin: 0 auto;
  position: relative;
  display: flex;
  align-items: center;
`;

const InputField = styled.textarea`
  width: 100%;
  padding: 14px 56px 14px ${space[5]};
  border: 1px solid ${neutral[200]};
  border-radius: 28px;
  font-size: 14px;
  font-family: ${fontFamily.sans};
  resize: none;
  min-height: ${space[12]};
  max-height: 200px;
  background: ${color.bg};
  color: ${color.text};
  transition: all ${duration.normal} cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${shadow.sm};
  box-sizing: border-box;

  &:hover:not(:focus):not(:disabled) {
    border-color: ${neutral[300]};
  }

  &:focus {
    outline: none;
    border-color: ${accent[400]};
    box-shadow: 0 0 0 3px ${accent[100]}, ${shadow.sm};
  }

  &::placeholder {
    color: ${neutral[400]};
    font-size: 14px;
  }

  &:focus::placeholder {
    color: ${neutral[300]};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    font-size: 14px;
    padding: ${space[3]} 52px ${space[3]} ${space[4]};
    min-height: 44px;
    border-radius: 24px;
  }
`;

const SendButton = styled.button`
  position: absolute;
  right: ${space[1.5]};
  top: 50%;
  transform: translateY(-50%);
  width: ${space[8]};
  height: ${space[8]};
  border-radius: ${radius.full};
  background: ${accent[600]};
  border: none;
  color: ${neutral[0]};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background ${duration.fast} ease;

  svg {
    width: ${space[4]};
    height: ${space[4]};
    stroke-width: 2.5;
  }

  &:hover:not(:disabled) {
    background: ${accent[700]};
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    transform: translateY(-50%);
    background: ${neutral[300]};
  }

  @media (max-width: 768px) {
    width: ${space[8]};
    height: ${space[8]};
    right: ${space[1.5]};

    svg {
      width: 14px;
      height: 14px;
    }
  }
`;

const ClearButton = styled.button`
  position: fixed;
  bottom: 100px;
  right: ${space[6]};
  width: ${space[12]};
  height: ${space[12]};
  border-radius: ${radius.full};
  background: ${color.bg};
  border: 1px solid ${neutral[200]};
  color: ${color.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${duration.normal} ease;
  box-shadow: ${shadow.md};
  z-index: 10;

  svg {
    width: ${space[5]};
    height: ${space[5]};
  }

  &:hover {
    background: ${neutral[50]};
    transform: scale(1.05);
    color: ${semantic.error};
  }

  @media (max-width: 768px) {
    bottom: 80px;
    right: ${space[4]};
    width: 44px;
    height: 44px;

    svg {
      width: 18px;
      height: 18px;
    }
  }
`;

const LoadingIndicator = styled.div`
  display: flex;
  gap: 14px;
  align-items: flex-start;
  animation: ${fadeInUp} 0.3s ease-out;

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: ${radius.lg};
    background: linear-gradient(135deg, ${accent[500]}, ${accent[400]});
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    animation: ${pulseGlow} 2s infinite;

    svg {
      width: 18px;
      height: 18px;
      color: ${neutral[0]};
    }
  }

  .typing-container {
    display: flex;
    flex-direction: column;
    gap: ${space[2]};
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid ${neutral[200]};
    border-radius: ${radius.xs} 20px 20px 20px;
    padding: ${space[4]} ${space[5]};
    box-shadow: ${shadow.md};
  }

  .typing-text {
    font-size: 13px;
    color: ${color.textSecondary};
    font-weight: 500;
  }

  .dots {
    display: flex;
    gap: ${space[1.5]};

    span {
      width: ${space[2]};
      height: ${space[2]};
      border-radius: ${radius.full};
      background: linear-gradient(135deg, ${accent[500]}, ${accent[400]});
      animation: ${typingDots} 1.4s infinite ease-in-out;

      &:nth-child(1) {
        animation-delay: 0s;
      }

      &:nth-child(2) {
        animation-delay: 0.2s;
      }

      &:nth-child(3) {
        animation-delay: 0.4s;
      }
    }
  }

  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0);
    }
    40% {
      transform: scale(1);
    }
  }
`;








/* ---------- component ---------- */
export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Data for context - comprehensive application data
  const { data: products, loading: productsLoading } = useProducts();
  const [coverages, setCoverages] = useState([]);
  const [forms, setForms] = useState([]);
  const [rules, setRules] = useState([]);
  const [pricingSteps, setPricingSteps] = useState([]);
  const [dataDictionary, setDataDictionary] = useState([]);
  const [formCoverages, setFormCoverages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Copy message to clipboard
  const handleCopyMessage = useCallback(async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to copy message', { error });
    }
  }, []);



  // Fetch comprehensive application data for enhanced AI context (optimized with caching)
  // Uses AbortController for proper cleanup to prevent state updates on unmounted components
  useEffect(() => {
    const abortController = new AbortController();

    const fetchContextData = async () => {
      // Early exit if already aborted
      if (abortController.signal.aborted) return;

      try {
        setDataLoading(true);
        const startTime = Date.now();

        // Use optimized Firebase service with caching
        // Note: Coverages are subcollections under products, so we use collectionGroup
        const [coverageList, formList, rulesList, pricingList, dictList, formCoverageList, taskList] = await Promise.all<any[]>([
          firebaseOptimized.getCollectionGroup('coverages', { useCache: true }),
          firebaseOptimized.getCollection('forms', { useCache: true }),
          firebaseOptimized.getCollection('rules', { useCache: true }),
          firebaseOptimized.getCollection('pricingSteps', { useCache: true }),
          firebaseOptimized.getCollection('dataDictionary', { useCache: true }),
          firebaseOptimized.getCollection('formCoverages', { useCache: true }),
          firebaseOptimized.getCollection('tasks', { useCache: true })
        ]);

        // Only update state if component is still mounted (not aborted)
        if (!abortController.signal.aborted) {
          setCoverages(coverageList || []);
          setForms(formList || []);
          setRules(rulesList || []);
          setPricingSteps(pricingList || []);
          setDataDictionary(dictList || []);
          setFormCoverages(formCoverageList || []);
          setTasks(taskList || []);

          logger.info(LOG_CATEGORIES.PERFORMANCE, 'Context data loaded', {
            duration: `${Date.now() - startTime}ms`,
            counts: {
              coverages: coverageList?.length || 0,
              forms: formList?.length || 0,
              rules: rulesList?.length || 0
            }
          });
        }
      } catch (error) {
        // Only log error if not aborted (aborted requests are expected)
        if (!abortController.signal.aborted) {
          logger.error(LOG_CATEGORIES.CACHE, 'Error fetching context data', { error });
        }
      } finally {
        // Only update loading state if not aborted
        if (!abortController.signal.aborted) {
          setDataLoading(false);
        }
      }
    };

    fetchContextData();

    // Cleanup function - abort any in-flight requests when component unmounts
    return () => {
      abortController.abort();
    };
  }, []);




  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      const scrollToBottom = () => {
        chatContainerRef.current?.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      };
      // Small delay to ensure DOM is updated
      setTimeout(scrollToBottom, 100);
    }
  }, [chatHistory]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  // Build comprehensive context summary for AI (optimized to avoid token limits)
  const contextSummary = useDeepMemo(() => {
    // Ensure all data arrays exist before processing
    const safeProducts = products || [];
    const safeCoverages = coverages || [];
    const safeForms = forms || [];
    const safeRules = rules || [];
    const safePricingSteps = pricingSteps || [];
    const safeDataDictionary = dataDictionary || [];
    const safeFormCoverages = formCoverages || [];
    const safeTasks = tasks || [];

    // Create a concise summary instead of full data dump
    const summary = {
      timestamp: new Date().toISOString(),
      systemOverview: {
        description: "Comprehensive P&C insurance product management platform",
        dataAvailable: "products, coverages, forms, pricing, rules, tasks, compliance data"
      },

      statistics: {
        products: {
          total: safeProducts.length,
          withForms: safeProducts.filter(p => p.formDownloadUrl).length,
          statesRepresented: [...new Set(safeProducts.flatMap(p => p.availableStates || []))].length,
          topProducts: safeProducts.slice(0, 5).map(p => ({
            name: p.name,
            code: p.productCode,
            states: (p.availableStates || []).length
          }))
        },
        coverages: {
          total: safeCoverages.length,
          subCoverages: safeCoverages.filter(c => c.parentCoverage).length,
          categories: [...new Set(safeCoverages.map(c => c.category).filter(Boolean))]
        },
        forms: {
          total: safeForms.length,
          categories: [...new Set(safeForms.map(f => f.category).filter(Boolean))],
          withDocuments: safeForms.filter(f => f.downloadUrl || f.filePath).length
        },
        rules: {
          total: safeRules.length,
          proprietary: safeRules.filter(r => r.proprietary).length
        },
        pricing: {
          totalSteps: safePricingSteps.length,
          stepTypes: [...new Set(safePricingSteps.map(s => s.stepType).filter(Boolean))]
        },
        tasks: {
          total: safeTasks.length,
          byPhase: {
            research: safeTasks.filter(t => t.phase === 'research').length,
            develop: safeTasks.filter(t => t.phase === 'develop').length,
            compliance: safeTasks.filter(t => t.phase === 'compliance').length,
            implementation: safeTasks.filter(t => t.phase === 'implementation').length
          },
          byPriority: {
            high: safeTasks.filter(t => t.priority === 'high').length,
            medium: safeTasks.filter(t => t.priority === 'medium').length,
            low: safeTasks.filter(t => t.priority === 'low').length
          },
          overdue: safeTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length
        },
        dataDictionary: {
          total: safeDataDictionary.length
        },
        formCoverageMappings: {
          total: safeFormCoverages.length
        }
      },

      // Sample data for quick reference
      sampleData: {
        products: safeProducts.slice(0, 5).map(p => ({
          id: p.id,
          name: p.name,
          code: p.productCode,
          lineOfBusiness: p.lineOfBusiness,
          states: p.availableStates?.slice(0, 5) || [],
          stateCount: p.availableStates?.length || 0
        })),
        coverages: safeCoverages.slice(0, 8).map(c => ({
          id: c.id,
          name: c.coverageName,
          code: c.coverageCode,
          category: c.category,
          isSubCoverage: !!c.parentCoverage
        })),
        forms: safeForms.slice(0, 5).map(f => ({
          id: f.id,
          name: f.name,
          formNumber: f.formNumber,
          category: f.category,
          hasDocument: !!(f.downloadUrl || f.filePath)
        })),
        rules: safeRules.slice(0, 5).map(r => ({
          id: r.id,
          name: r.name,
          type: r.type,
          proprietary: r.proprietary
        })),
        tasks: safeTasks.slice(0, 5).map(t => ({
          id: t.id,
          title: t.title,
          phase: t.phase,
          priority: t.priority,
          status: t.status
        }))
      },

      // Full data for comprehensive AI responses - the AI uses this to answer questions accurately
      fullData: {
        products: safeProducts.map(p => ({
          id: p.id,
          name: p.name,
          productCode: p.productCode,
          lineOfBusiness: p.lineOfBusiness,
          availableStates: p.availableStates || [],
          description: p.description,
          effectiveDate: p.effectiveDate
        })),
        coverages: safeCoverages.map(c => ({
          id: c.id,
          coverageName: c.coverageName || c.name,
          coverageCode: c.coverageCode || c.code,
          category: c.category,
          description: c.description,
          parentCoverage: c.parentCoverage
        })),
        forms: safeForms.map(f => ({
          id: f.id,
          name: f.name || f.formName,
          formNumber: f.formNumber,
          category: f.category,
          description: f.description
        })),
        rules: safeRules.map(r => ({
          id: r.id,
          name: r.name || r.ruleName,
          category: r.category,
          description: r.description,
          proprietary: r.proprietary
        })),
        tasks: safeTasks.map(t => ({
          id: t.id,
          title: t.title,
          phase: t.phase,
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate
        })),
        pricingSteps: safePricingSteps.map(p => ({
          id: p.id,
          stepName: p.stepName || p.name,
          stepType: p.stepType,
          description: p.description
        }))
      }
    };

    return summary;
  }, [products, coverages, forms, rules, pricingSteps, dataDictionary, formCoverages, tasks]);

  // Use optimized query classification from service
  const classifyQuery = useCallback((query: string): QueryType => {
    return aiPromptOptimizer.classifyQuery(query);
  }, []);

  // Build optimized prompt using AI Prompt Optimizer service
  const buildEnhancedPrompt = useCallback((query: string, _queryType: QueryType) => {
    const optimizedPrompt = aiPromptOptimizer.buildOptimizedPrompt(query, contextSummary);
    return aiPromptOptimizer.formatForAPI(optimizedPrompt);
  }, [contextSummary]);

  const handleSendMessage = useCallback(async () => {
    const query = inputValue.trim();
    if (!query || isLoading || dataLoading) return;

    const startTime = Date.now();

    // Classify the query
    const queryType = classifyQuery(query);

    logger.logUserAction('Home chat query submitted', {
      queryLength: query.length,
      queryType,
      hasProducts: (products || []).length > 0,
      hasCoverages: (coverages || []).length > 0,
      hasForms: (forms || []).length > 0,
      hasRules: (rules || []).length > 0,
      timestamp: new Date().toISOString()
    });

    // Add user message to chat history
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date(),
      metadata: {
        queryType
      }
    };
    setChatHistory(prev => [...prev, userMessage]);

    setInputValue(''); // Clear the input immediately
    setIsLoading(true);

    try {
      // Build enhanced, context-aware system prompt
      const systemPrompt = buildEnhancedPrompt(query, queryType);

      logger.logAIOperation('Home chat query', AI_MODELS.HOME_CHAT, query.substring(0, 100), '', 0);

      // Call Cloud Function (secure proxy to OpenAI)
      const generateChat = httpsCallable<any, { success: boolean; content?: string; usage?: { total_tokens?: number } }>(functions, 'generateChatResponse');

      // Build conversation history for context (last 5 messages)
      const recentHistory = chatHistory.slice(-5).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Ensure we're sending a plain object with proper types
      const payload = {
        messages: [
          {
            role: 'system',
            content: String(systemPrompt)
          },
          ...recentHistory,
          { role: 'user', content: String(query) }
        ],
        model: String(AI_MODELS.HOME_CHAT),
        maxTokens: Number(AI_PARAMETERS.HOME_CHAT.max_tokens),
        temperature: Number(AI_PARAMETERS.HOME_CHAT.temperature)
      };

      const result = await generateChat(payload);

      if (!result.data.success) {
        logger.error(LOG_CATEGORIES.AI, 'Cloud Function error', {
          model: AI_MODELS.HOME_CHAT,
          query: query.substring(0, 100)
        });
        throw new Error('Failed to generate chat response');
      }

      const aiResponse = result.data.content?.trim();
      const processingTime = Date.now() - startTime;

      logger.logAIOperation('Home chat response', AI_MODELS.HOME_CHAT, query.substring(0, 100), aiResponse?.substring(0, 100), processingTime);

      if (aiResponse) {
        // Format response for optimal display
        const formattedResponse = responseFormatter.formatWithMetadata(aiResponse, {
          queryType,
          tokensUsed: result.data.usage?.total_tokens,
          processingTime,
          confidence: 0.95,
          sources: ['products', 'coverages', 'forms', 'rules', 'tasks']
        });

        // Add AI response to chat history with enhanced metadata
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: formattedResponse.content,
          timestamp: new Date(),
          metadata: {
            queryType,
            tokensUsed: result.data.usage?.total_tokens,
            processingTime,
            confidence: formattedResponse.metadata.confidence,
            sources: formattedResponse.metadata.sources,
            isStructured: formattedResponse.isStructured
          }
        };
        setChatHistory(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('No response from AI');
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(LOG_CATEGORIES.AI, 'AI request failed', {
        query: query.substring(0, 100),
        duration,
        model: AI_MODELS.HOME_CHAT,
        errorType: error.name,
        errorMessage: error.message
      }, error);

      let errorMessage = 'Sorry, I encountered an error while processing your request. Please try again.';

      if (error.message.includes('429')) {
        errorMessage = 'I\'m currently experiencing high demand. Please wait a moment and try again.';
        logger.warn(LOG_CATEGORIES.AI, 'Rate limit hit for home chat', { query: query.substring(0, 100) });
      } else if (error.message.includes('401')) {
        errorMessage = 'Authentication error. Please check the API configuration.';
        logger.error(LOG_CATEGORIES.AI, 'Authentication error for home chat', { query: query.substring(0, 100) });
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try a simpler question or try again later.';
        logger.warn(LOG_CATEGORIES.AI, 'Timeout error for home chat', { query: query.substring(0, 100), duration });
      }

      // Add error message to chat history
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, dataLoading, products, coverages, forms, rules, contextSummary, chatHistory, classifyQuery, buildEnhancedPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setChatHistory([]);
    setInputValue('');
  };

  // Compute loading state
  const isSystemReady = !dataLoading && !productsLoading;
  const isEmpty = chatHistory.length === 0;

  return (
    <Page>
      <MainNavigation />

      <MainContent id="main-content" $isEmpty={isEmpty}>
        {isEmpty ? (
          /* Centered Empty State with Input */
          <CenteredContainer>
            <EmptyState>
              <SparklesIcon />
              <h2>Product Hub Assistant</h2>
              <p>
                Ask me anything about your insurance products, coverages, forms,
                pricing, rules, and tasks. I have access to all your data and can
                provide comprehensive insights.
              </p>
            </EmptyState>

            {/* Centered Input */}
            <InputContainer $isCentered={true}>
              <InputWrapper>
                <InputField
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isSystemReady
                      ? "Ask about products, coverages, pricing, compliance, or anything else..."
                      : "Loading system data..."
                  }
                  disabled={!isSystemReady || isLoading}
                  rows={1}
                />
                <SendButton
                  onClick={handleSendMessage}
                  disabled={!isSystemReady || isLoading || !inputValue.trim()}
                  title="Send message"
                >
                  <ArrowUpIcon />
                </SendButton>
              </InputWrapper>
            </InputContainer>
          </CenteredContainer>
        ) : (
          /* Chat Mode with Messages */
          <>
            <ChatContainer ref={chatContainerRef}>
              {chatHistory.map((message) => (
                <MessageGroup key={message.id}>
                  {message.role === 'user' ? (
                    <UserMessage>
                      <div className="content">{message.content}</div>
                    </UserMessage>
                  ) : (
                    <AssistantMessage>
                      <div className="avatar">
                        <SparklesIcon />
                      </div>
                      <div className="content">
                        <EnhancedChatMessage
                          content={message.content}
                          metadata={message.metadata}
                          showMetadata={false}
                        />
                        <div className="message-actions">
                          <ActionButton
                            onClick={() => handleCopyMessage(message.id, message.content)}
                            $active={copiedMessageId === message.id}
                            title={copiedMessageId === message.id ? 'Copied!' : 'Copy message'}
                          >
                            {copiedMessageId === message.id ? (
                              <CheckIcon />
                            ) : (
                              <ClipboardDocumentIcon />
                            )}
                          </ActionButton>
                        </div>
                      </div>
                    </AssistantMessage>
                  )}
                </MessageGroup>
              ))}

              {isLoading && (
                <LoadingIndicator>
                  <div className="avatar">
                    <SparklesIcon />
                  </div>
                  <div className="typing-container">
                    <div className="typing-text">Analyzing your request...</div>
                    <div className="dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </LoadingIndicator>
              )}
            </ChatContainer>

            {/* Bottom Input Area */}
            <InputContainer $isCentered={false}>
              <InputWrapper>
                <InputField
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isSystemReady
                      ? "Ask about products, coverages, pricing, compliance, or anything else..."
                      : "Loading system data..."
                  }
                  disabled={!isSystemReady || isLoading}
                  rows={1}
                />
                <SendButton
                  onClick={handleSendMessage}
                  disabled={!isSystemReady || isLoading || !inputValue.trim()}
                  title="Send message"
                >
                  <ArrowUpIcon />
                </SendButton>
              </InputWrapper>
            </InputContainer>

            {/* Clear Chat Button */}
            <ClearButton onClick={handleClearChat} title="Clear conversation">
              <TrashIcon />
            </ClearButton>
          </>
        )}
      </MainContent>


    </Page>
  );
}
