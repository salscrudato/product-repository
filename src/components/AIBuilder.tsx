import { useState, useEffect } from 'react';
import { collection, collectionGroup, getDocs } from 'firebase/firestore';
import { db, functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import styled from 'styled-components';
import {
  SparklesIcon,
  LightBulbIcon,
  CpuChipIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/solid';
import MainNavigation from '../components/ui/Navigation';
import EnhancedHeader from '../components/ui/EnhancedHeader';
import { WrenchScrewdriverIcon } from '@heroicons/react/24/solid';
import MarkdownRenderer from '../utils/markdownParser';

/* ---------- Styled Components ---------- */
const Page = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
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
    opacity: 0.08;
    z-index: 0;
  }
`;

const MainContent = styled.main`
  flex: 1;
  padding: 32px 32px 80px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: 24px 20px 60px;
  }
`;

const AIBuilderContainer = styled.div`
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(226, 232, 240, 0.4);
  border-radius: 20px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 16px 64px rgba(99, 102, 241, 0.12);
    border-color: rgba(99, 102, 241, 0.3);
  }
`;

const ChatHeader = styled.div`
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    animation: shimmer 3s infinite;
  }

  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
  }
`;

const ChatTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ChatMessages = styled.div`
  height: 400px;
  overflow-y: auto;
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(226, 232, 240, 0.3);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.3);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.5);
  }
`;

const ChatMessage = styled.div`
  margin-bottom: 16px;
  display: flex;
  justify-content: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  animation: fadeInUp 0.3s ease;

  @keyframes fadeInUp {
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

const MessageBubble = styled.div`
  max-width: 80%;
  padding: 16px 20px;
  border-radius: ${props => props.isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px'};
  background: ${props => props.isUser
    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
    : '#ffffff'};
  color: ${props => props.isUser ? '#ffffff' : '#374151'};
  border: ${props => props.isUser ? 'none' : '1px solid rgba(226, 232, 240, 0.6)'};
  font-size: 14px;
  line-height: 1.6;
  box-shadow: ${props => props.isUser
    ? '0 4px 16px rgba(99, 102, 241, 0.25)'
    : '0 2px 8px rgba(0, 0, 0, 0.08)'};
`;

const ChatInputContainer = styled.div`
  padding: 20px 24px;
  background: #ffffff;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
  display: flex;
  gap: 12px;
  align-items: flex-end;
`;

const ChatInput = styled.textarea`
  flex: 1;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  min-height: 44px;
  max-height: 120px;
  background: rgba(248, 250, 252, 0.8);
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const SendButton = styled.button`
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s ease;
  min-height: 44px;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #5b5bf6 0%, #7c3aed 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const WelcomeMessage = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  margin-bottom: 16px;
`;

const SuggestionChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  justify-content: center;
`;

const SuggestionChip = styled.button`
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.2);
    border-color: rgba(99, 102, 241, 0.4);
  }
`;

const AI_SYSTEM_PROMPT = `You are an expert AI Product Builder for insurance products. Help users create new products by analyzing existing products, coverages, and forms.

Your capabilities:
1. Product Analysis - Understand existing products and their structures
2. Intelligent Recommendations - Suggest optimal coverage combinations
3. Form Association - Recommend relevant forms for coverages
4. Product Structure - Help build complete product structures
5. Market Intelligence - Provide insights on product positioning

When users describe what they want to build:
- Ask clarifying questions
- Analyze existing products for patterns
- Suggest coverage combinations
- Recommend appropriate forms
- Help with naming and categorization
- Provide step-by-step guidance

Always be conversational, helpful, and professional. Use markdown formatting.`;

const AIBuilder = () => {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contextData, setContextData] = useState(null);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const productsSnap = await getDocs(collection(db, 'products'));
        const productMap = {};
        productsSnap.docs.forEach(doc => {
          productMap[doc.id] = doc.data().name;
        });

        const coveragesSnap = await getDocs(collectionGroup(db, 'coverages'));
        const coverageList = coveragesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          productId: doc.ref.parent.parent.id,
        }));

        const formsSnap = await getDocs(collection(db, 'forms'));
        const formList = formsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setContextData({
          products: productMap,
          coverages: coverageList,
          forms: formList
        });

        setAiSuggestions([
          "Create a homeowners product similar to HO3 but for condos",
          "Build a commercial property product for small businesses",
          "Design an umbrella policy with high liability limits",
          "Create a renters insurance product for millennials",
          "Build a cyber liability product for tech companies"
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleChatMessage = async () => {
    if (!chatInput.trim() || chatLoading || !contextData) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatLoading(true);

    const newUserMessage = { role: 'user', content: userMessage };
    setChatMessages(prev => [...prev, newUserMessage]);

    try {
      const generateChat = httpsCallable(functions, 'generateChatResponse');
      const result = await generateChat({
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'system', content: `Database context: ${JSON.stringify(contextData, null, 2)}` },
          ...chatMessages,
          newUserMessage
        ],
        model: 'gpt-4o-mini',
        maxTokens: 2000,
        temperature: 0.7
      });

      if (!result.data.success) {
        throw new Error('Failed to generate chat response');
      }

      const aiResponse = result.data.content?.trim();
      if (aiResponse) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      }
    } catch (error) {
      console.error('Error in AI chat:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.'
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setChatInput(suggestion);
  };

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatMessage();
    }
  };

  return (
    <Page>
      <MainNavigation />
      <MainContent>
        <EnhancedHeader
          title="AI Product Builder"
          subtitle="Describe your product vision and I'll help you build it intelligently"
          icon={WrenchScrewdriverIcon}
        />

        <AIBuilderContainer>
          <ChatHeader>
            <ChatTitle>
              <CpuChipIcon width={20} height={20} />
              AI Product Assistant
              <SparklesIcon width={16} height={16} style={{ marginLeft: 'auto', opacity: 0.8 }} />
            </ChatTitle>
          </ChatHeader>

          <ChatMessages>
            {chatMessages.length === 0 ? (
              <WelcomeMessage>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                  <LightBulbIcon width={24} height={24} style={{ color: '#6366f1' }} />
                  <h4 style={{ margin: 0, color: '#374151' }}>Welcome to AI Product Builder</h4>
                </div>
                <p style={{ margin: '0 0 16px 0', color: '#6b7280', lineHeight: '1.6' }}>
                  I'm your intelligent assistant for building insurance products. I can analyze your existing products and help you create the perfect new one.
                </p>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                  Try asking me something like "Create a condo insurance product" or click a suggestion below:
                </p>
                <SuggestionChips>
                  {aiSuggestions.map((suggestion, index) => (
                    <SuggestionChip
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </SuggestionChip>
                  ))}
                </SuggestionChips>
              </WelcomeMessage>
            ) : (
              chatMessages.map((message, index) => (
                <ChatMessage key={index} isUser={message.role === 'user'}>
                  <MessageBubble isUser={message.role === 'user'}>
                    {message.role === 'user' ? (
                      message.content
                    ) : (
                      <MarkdownRenderer>{message.content}</MarkdownRenderer>
                    )}
                  </MessageBubble>
                </ChatMessage>
              ))
            )}

            {chatLoading && (
              <ChatMessage isUser={false}>
                <MessageBubble isUser={false}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #e5e7eb',
                      borderTop: '2px solid #6366f1',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Analyzing your request...
                  </div>
                </MessageBubble>
              </ChatMessage>
            )}
          </ChatMessages>

          <ChatInputContainer>
            <ChatInput
              placeholder="Describe the product you want to build..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              rows={1}
            />
            <SendButton
              onClick={handleChatMessage}
              disabled={!chatInput.trim() || chatLoading}
            >
              <PaperAirplaneIcon />
              Send
            </SendButton>
          </ChatInputContainer>
        </AIBuilderContainer>
      </MainContent>
    </Page>
  );
};

export default AIBuilder;

