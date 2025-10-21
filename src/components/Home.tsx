import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styled from 'styled-components';
import {
  SparklesIcon,
  TrashIcon,
  PaperAirplaneIcon,
  UserCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid';
import MainNavigation from './ui/Navigation';
import { EnhancedChatMessage } from './ui/EnhancedChatMessage';
import ProductCreationAgentModal from './ProductCreationAgentModal';
import useProducts from '../hooks/useProducts';
import { useDeepMemo } from '../hooks/useAdvancedMemo';
import logger, { LOG_CATEGORIES } from '../utils/logger';
import { collection, getDocs, collectionGroup } from 'firebase/firestore';
import { db, functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { AI_MODELS, AI_PARAMETERS } from '../config/aiConfig';
import firebaseOptimized from '../services/firebaseOptimized';
import aiPromptOptimizer from '../services/aiPromptOptimizer';
import responseFormatter from '../services/responseFormatter';

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
  | 'general';

/* ---------- styled components ---------- */
const Page = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.isDarkMode
    ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
    : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)'};
  display: flex;
  flex-direction: column;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 300px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
    opacity: ${({ theme }) => theme.isDarkMode ? '0.05' : '0.08'};
    z-index: 0;
    pointer-events: none;
  }
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

  /* Center content when empty */
  ${({ $isEmpty }) => $isEmpty && `
    justify-content: center;
    align-items: center;
  `}

  @media (max-width: 768px) {
    height: calc(100vh - 56px);
  }
`;

const ChatContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.isDarkMode ? '#334155' : '#e2e8f0'};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.isDarkMode ? '#475569' : '#cbd5e1'};
  }

  @media (max-width: 768px) {
    padding: 16px;
    gap: 16px;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px 32px;
  text-align: center;
  gap: 16px;
  width: 100%;
  max-width: 700px;

  svg {
    width: 64px;
    height: 64px;
    color: ${({ theme }) => theme.isDarkMode ? '#475569' : '#cbd5e1'};
    margin-bottom: 8px;
  }

  h2 {
    font-size: 24px;
    font-weight: 600;
    color: ${({ theme }) => theme.isDarkMode ? '#e2e8f0' : '#1e293b'};
    margin: 0;
  }

  p {
    font-size: 15px;
    color: ${({ theme }) => theme.isDarkMode ? '#94a3b8' : '#64748b'};
    margin: 0;
    max-width: 500px;
  }

  @media (max-width: 768px) {
    padding: 32px 16px 24px;

    svg {
      width: 48px;
      height: 48px;
    }

    h2 {
      font-size: 20px;
    }

    p {
      font-size: 14px;
    }
  }
`;

const CenteredContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  width: 100%;
  max-width: 700px;
  padding: 0 24px;

  @media (max-width: 768px) {
    padding: 0 16px;
    gap: 24px;
  }
`;

const MessageGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: fadeIn 0.3s ease-in;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const UserMessage = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: flex-end;

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: ${({ theme }) => theme.isDarkMode ? '#475569' : '#e2e8f0'};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    order: 2;

    svg {
      width: 20px;
      height: 20px;
      color: ${({ theme }) => theme.isDarkMode ? '#94a3b8' : '#64748b'};
    }
  }

  .content {
    background: ${({ theme }) => theme.isDarkMode ? '#1e293b' : '#f1f5f9'};
    color: ${({ theme }) => theme.isDarkMode ? '#e2e8f0' : '#1e293b'};
    padding: 12px 16px;
    border-radius: 18px;
    max-width: 70%;
    font-size: 15px;
    line-height: 1.5;
    word-wrap: break-word;
    order: 1;
  }

  @media (max-width: 768px) {
    .content {
      max-width: 85%;
      font-size: 14px;
    }
  }
`;

const AssistantMessage = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg {
      width: 18px;
      height: 18px;
      color: white;
    }
  }

  .content {
    flex: 1;
    max-width: 85%;
    color: ${({ theme }) => theme.isDarkMode ? '#e2e8f0' : '#1e293b'};
  }

  @media (max-width: 768px) {
    .content {
      max-width: 90%;
    }
  }
`;

const InputContainer = styled.div<{ $isCentered: boolean }>`
  ${({ $isCentered }) => !$isCentered && `
    border-top: 1px solid ${({ theme }: any) => theme.isDarkMode ? '#1e293b' : '#e2e8f0'};
  `}
  padding: 16px 24px;
  background: ${({ $isCentered, theme }) =>
    $isCentered ? 'transparent' : (theme.isDarkMode ? '#0f172a' : '#ffffff')};

  /* Center the input when no chat history */
  ${({ $isCentered }) => $isCentered && `
    width: 100%;
    max-width: 700px;
  `}

  @media (max-width: 768px) {
    padding: 12px 16px;
  }
`;

const InputWrapper = styled.div`
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  gap: 12px;
  align-items: flex-end;
`;

const InputField = styled.textarea`
  flex: 1;
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.isDarkMode ? '#334155' : '#e2e8f0'};
  border-radius: 12px;
  font-size: 15px;
  font-family: inherit;
  resize: none;
  min-height: 48px;
  max-height: 200px;
  background: ${({ theme }) => theme.isDarkMode ? '#1e293b' : '#ffffff'};
  color: ${({ theme }) => theme.isDarkMode ? '#e2e8f0' : '#1e293b'};
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: ${({ theme }) => theme.isDarkMode ? '#64748b' : '#94a3b8'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    font-size: 14px;
    padding: 10px 14px;
  }
`;

const SendButton = styled.button`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #5b5bf6, #7c3aed);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 768px) {
    width: 44px;
    height: 44px;

    svg {
      width: 18px;
      height: 18px;
    }
  }
`;

const ClearButton = styled.button`
  position: fixed;
  bottom: 100px;
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ theme }) => theme.isDarkMode ? '#1e293b' : '#ffffff'};
  border: 1px solid ${({ theme }) => theme.isDarkMode ? '#334155' : '#e2e8f0'};
  color: ${({ theme }) => theme.isDarkMode ? '#e2e8f0' : '#64748b'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    background: ${({ theme }) => theme.isDarkMode ? '#334155' : '#f8fafc'};
    transform: scale(1.05);
  }

  @media (max-width: 768px) {
    bottom: 80px;
    right: 16px;
    width: 44px;
    height: 44px;

    svg {
      width: 18px;
      height: 18px;
    }
  }
`;

const ProductCreationFAB = styled.button`
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
  z-index: 50;
  font-size: 0;

  svg {
    width: 24px;
    height: 24px;
  }

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 12px 32px rgba(99, 102, 241, 0.6);
  }

  &:active {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    bottom: 16px;
    right: 16px;
    width: 48px;
    height: 48px;

    svg {
      width: 20px;
      height: 20px;
    }
  }
`;

const SystemStatus = styled.div<{ $isReady: boolean }>`
  position: absolute;
  top: 16px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: ${({ $isReady, theme }) =>
    $isReady
      ? 'rgba(34, 197, 94, 0.1)'
      : 'rgba(249, 115, 22, 0.1)'};
  border: 1px solid ${({ $isReady }) =>
    $isReady ? 'rgba(34, 197, 94, 0.3)' : 'rgba(249, 115, 22, 0.3)'};
  font-size: 12px;
  font-weight: 600;
  color: ${({ $isReady }) => ($isReady ? '#22c55e' : '#f97316')};
  z-index: 5;

  svg {
    width: 14px;
    height: 14px;
  }

  @media (max-width: 768px) {
    top: 12px;
    right: 16px;
    font-size: 11px;
    padding: 6px 10px;
  }
`;

const LoadingIndicator = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg {
      width: 18px;
      height: 18px;
      color: white;
    }
  }

  .dots {
    display: flex;
    gap: 6px;
    padding: 12px 16px;

    span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${({ theme }) => theme.isDarkMode ? '#475569' : '#cbd5e1'};
      animation: bounce 1.4s infinite ease-in-out both;

      &:nth-child(1) {
        animation-delay: -0.32s;
      }

      &:nth-child(2) {
        animation-delay: -0.16s;
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
  const [productCreationAgentOpen, setProductCreationAgentOpen] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Data for context - comprehensive application data
  const { products, loading: productsLoading } = useProducts();
  const [coverages, setCoverages] = useState([]);
  const [forms, setForms] = useState([]);
  const [rules, setRules] = useState([]);
  const [pricingSteps, setPricingSteps] = useState([]);
  const [dataDictionary, setDataDictionary] = useState([]);
  const [formCoverages, setFormCoverages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Memoize modal callbacks to prevent unnecessary re-renders
  const handleProductCreationAgentClose = useCallback(() => {
    setProductCreationAgentOpen(false);
  }, []);

  const handleProductCreated = useCallback((productId: string) => {
    logger.info(LOG_CATEGORIES.DATA, 'Product created via agent', { productId });
    setProductCreationAgentOpen(false);
  }, []);

  // Fetch comprehensive application data for enhanced AI context (optimized with caching)
  useEffect(() => {
    const fetchContextData = async () => {
      try {
        setDataLoading(true);

        // Use optimized Firebase service with caching
        const [coverageList, formList, rulesList, pricingList, dictList, formCoverageList, taskList] = await Promise.all([
          firebaseOptimized.getCollection('coverages', { useCache: true }),
          firebaseOptimized.getCollection('forms', { useCache: true }),
          firebaseOptimized.getCollection('rules', { useCache: true }),
          firebaseOptimized.getCollection('pricingSteps', { useCache: true }),
          firebaseOptimized.getCollection('dataDictionary', { useCache: true }),
          firebaseOptimized.getCollection('formCoverages', { useCache: true }),
          firebaseOptimized.getCollection('tasks', { useCache: true })
        ]);

        setCoverages(coverageList || []);
        setForms(formList || []);
        setRules(rulesList || []);
        setPricingSteps(pricingList || []);
        setDataDictionary(dictList || []);
        setFormCoverages(formCoverageList || []);
        setTasks(taskList || []);

        logger.debug(LOG_CATEGORIES.CACHE, 'Context data loaded', {
          coverages: coverageList?.length || 0,
          forms: formList?.length || 0,
          rules: rulesList?.length || 0,
          tasks: taskList?.length || 0
        });

      } catch (error) {
        logger.error(LOG_CATEGORIES.CACHE, 'Error fetching context data', { error });
      } finally {
        setDataLoading(false);
      }
    };

    fetchContextData();
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

      // Sample data for context (limited to avoid token overflow)
      sampleData: {
        products: safeProducts.slice(0, 3).map(p => ({
          name: p.name,
          code: p.productCode,
          states: p.availableStates?.length || 0
        })),
        coverages: safeCoverages.slice(0, 3).map(c => ({
          name: c.coverageName,
          code: c.coverageCode,
          category: c.category
        })),
        tasks: safeTasks.slice(0, 3).map(t => ({
          title: t.title,
          phase: t.phase,
          priority: t.priority
        }))
      }
    };

    return summary;
  }, [products, coverages, forms, rules, pricingSteps, dataDictionary, formCoverages, tasks]);

  // Store full context data for detailed queries (not sent in every request)
  const fullContextData = useDeepMemo(() => {
    const safeProducts = products || [];
    const safeCoverages = coverages || [];
    const safeForms = forms || [];
    const safeRules = rules || [];
    const safePricingSteps = pricingSteps || [];
    const safeDataDictionary = dataDictionary || [];
    const safeFormCoverages = formCoverages || [];
    const safeTasks = tasks || [];

    return {
      products: safeProducts,
      coverages: safeCoverages,
      forms: safeForms,
      rules: safeRules,
      pricingSteps: safePricingSteps,
      dataDictionary: safeDataDictionary,
      formCoverages: safeFormCoverages,
      tasks: safeTasks
    };
  }, [products, coverages, forms, rules, pricingSteps, dataDictionary, formCoverages, tasks]);

  // Use optimized query classification from service
  const classifyQuery = useCallback((query: string): QueryType => {
    return aiPromptOptimizer.classifyQuery(query);
  }, []);

  // Build optimized prompt using AI Prompt Optimizer service
  const buildEnhancedPrompt = useCallback((query: string, queryType: QueryType) => {
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
      hasProducts: products.length > 0,
      hasCoverages: coverages.length > 0,
      hasForms: forms.length > 0,
      hasRules: rules.length > 0,
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
      const generateChat = httpsCallable(functions, 'generateChatResponse');

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

      console.log('🚀 Calling generateChatResponse with:', {
        messagesCount: payload.messages.length,
        model: payload.model,
        maxTokens: payload.maxTokens,
        temperature: payload.temperature,
        contextSize: JSON.stringify(contextSummary).length
      });

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

      {/* System Status Indicator */}
      <SystemStatus $isReady={isSystemReady}>
        {isSystemReady ? (
          <>
            <CheckCircleIcon />
            <span>System Ready</span>
          </>
        ) : (
          <>
            <ExclamationTriangleIcon />
            <span>Loading...</span>
          </>
        )}
      </SystemStatus>

      <MainContent $isEmpty={isEmpty}>
        {isEmpty ? (
          /* Centered Empty State with Input */
          <CenteredContainer>
            <EmptyState>
              <SparklesIcon />
              <h2>Product Hub Assistant</h2>
              <p>
                Ask me anything about your insurance products, coverages, forms, pricing, rules, and tasks.
                I have access to all your data and can provide comprehensive insights.
              </p>
              {!isSystemReady && (
                <p style={{ fontSize: '13px', marginTop: '8px' }}>
                  Loading system data...
                </p>
              )}
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
                  <PaperAirplaneIcon />
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
                      <div className="avatar">
                        <UserCircleIcon />
                      </div>
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
                          showMetadata={true}
                        />
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
                  <div className="dots">
                    <span></span>
                    <span></span>
                    <span></span>
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
                  <PaperAirplaneIcon />
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

      {/* Product Creation Agent FAB */}
      <ProductCreationFAB
        onClick={() => setProductCreationAgentOpen(true)}
        title="Create product from PDF with AI"
        aria-label="Open Product Creation Agent"
      >
        <SparklesIcon />
      </ProductCreationFAB>

      {/* Product Creation Agent Modal */}
      <ProductCreationAgentModal
        isOpen={productCreationAgentOpen}
        onClose={handleProductCreationAgentClose}
        onProductCreated={handleProductCreated}
      />
    </Page>
  );
}
