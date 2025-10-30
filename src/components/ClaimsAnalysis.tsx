import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import {
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/solid';
import styled, { keyframes } from 'styled-components';
import MainNavigation from './ui/Navigation';
import { Button } from './ui/Button';
import { TextInput } from './ui/Input';
import { UnifiedAIResponse } from './ui/UnifiedAIResponse';
import EnhancedHeader from './ui/EnhancedHeader';
import { PageContainer, PageContent } from './ui/PageContainer';
import { Breadcrumb } from './ui/Breadcrumb';
import { processFormsForAnalysis } from '@utils/pdfChunking';
import { analyzeClaimWithChunking } from '../services/claimsAnalysisService';
import logger, { LOG_CATEGORIES } from '../utils/logger';
import LoadingSpinner from './ui/LoadingSpinner';
import { EmptyState } from './ui/EmptyState';

// Error boundary component for message content
class MessageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logger.error(LOG_CATEGORIES.ERROR, 'Message rendering error', { errorInfo }, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '16px',
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626'
        }}>
          <strong>Error displaying message</strong>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
            There was an error rendering this message. The content may contain invalid formatting.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Top-level error boundary for the entire component
class ClaimsAnalysisErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error(LOG_CATEGORIES.ERROR, 'Claims Analysis component error', { errorInfo }, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)'
        }}>
          <div style={{
            maxWidth: '500px',
            padding: '32px',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>Claims Analysis Error</h2>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>
              Something went wrong while loading the Claims Analysis page. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#6366f1',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Refresh Page
            </button>
            {this.state.error && (
              <details style={{ marginTop: '16px', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', color: '#64748b' }}>Error Details</summary>
                <pre style={{
                  background: '#f8fafc',
                  padding: '12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  overflow: 'auto',
                  marginTop: '8px'
                }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/* ---------- Animations ---------- */
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

/* ---------- Styled Components ---------- */
const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  height: calc(100vh - 200px);

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    height: auto;
    gap: 24px;
  }
`;

const Panel = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const PanelHeader = styled.div`
  padding: 24px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05));
`;

const PanelTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    width: 24px;
    height: 24px;
    color: #6366f1;
  }
`;

const PanelContent = styled.div`
  flex: 1;
  padding: 24px;
  overflow-y: auto;
`;

/* ---------- Forms Selection Panel ---------- */
const SearchContainer = styled.div`
  position: relative;
  margin-bottom: 20px;
`;

const SearchInput = styled(TextInput)`
  width: 100%;
  padding: 12px 20px 12px 48px;
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  background: rgba(255, 255, 255, 0.9);

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const SearchIcon = styled(MagnifyingGlassIcon)`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: #6366f1;
  pointer-events: none;
`;

const FormsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
`;

const FormItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 2px solid ${props => props.selected ? '#6366f1' : 'rgba(226, 232, 240, 0.6)'};
  border-radius: 12px;
  background: ${props => props.selected ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.8)'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.05);
    transform: translateY(-1px);
  }
`;

const FormRadio = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid ${props => props.checked ? '#6366f1' : '#d1d5db'};
  border-radius: 50%;
  background: ${props => props.checked ? '#6366f1' : 'transparent'};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: relative;

  &::after {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: white;
    opacity: ${props => props.checked ? 1 : 0};
    transition: opacity 0.2s ease;
  }
`;

const FormInfo = styled.div`
  flex: 1;
`;

const FormName = styled.div`
  font-weight: 600;
  color: #1e293b;
  font-size: 14px;
  margin-bottom: 4px;
`;

const FormMeta = styled.div`
  font-size: 12px;
  color: #64748b;
`;

const SelectedCount = styled.div`
  margin-top: 16px;
  padding: 12px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  font-size: 14px;
  color: #6366f1;
  font-weight: 500;
  text-align: center;
`;

/* ---------- Chat Panel ---------- */
const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const MessagesArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 4px;
  margin-bottom: 20px;
`;

const Message = styled.div`
  margin-bottom: 20px;
  animation: ${fadeIn} 0.3s ease;
`;

const MessageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.isUser ? '#6366f1' : '#059669'};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const MessageContent = styled.div`
  background: ${props => props.isUser ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(248, 250, 252, 0.8)'};
  color: ${props => props.isUser ? 'white' : '#1e293b'};
  padding: 20px 24px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.7;
  border: ${props => props.isUser ? 'none' : '1px solid rgba(226, 232, 240, 0.6)'};
  max-height: 70vh;
  overflow-y: auto;

  /* Markdown-style formatting */
  h1, h2 {
    margin: 20px 0 12px 0;
    font-weight: 700;
    font-size: 18px;
    color: ${props => props.isUser ? 'white' : '#1e293b'};
    border-bottom: 2px solid ${props => props.isUser ? 'rgba(255,255,255,0.3)' : 'rgba(99, 102, 241, 0.2)'};
    padding-bottom: 8px;
  }

  h3 {
    margin: 16px 0 8px 0;
    font-weight: 600;
    font-size: 16px;
    color: ${props => props.isUser ? 'rgba(255,255,255,0.95)' : '#475569'};
  }

  h4 {
    margin: 12px 0 6px 0;
    font-weight: 600;
    font-size: 14px;
    color: ${props => props.isUser ? 'rgba(255,255,255,0.9)' : '#64748b'};
  }

  p {
    margin: 12px 0;
    line-height: 1.7;
  }

  ul, ol {
    margin: 12px 0;
    padding-left: 24px;
  }

  li {
    margin: 8px 0;
    line-height: 1.6;
  }

  strong, **strong** {
    font-weight: 700;
    color: ${props => props.isUser ? 'white' : '#1e293b'};
  }

  /* Code and emphasis */
  code {
    background: ${props => props.isUser ? 'rgba(255,255,255,0.2)' : 'rgba(99, 102, 241, 0.1)'};
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 13px;
  }

  /* Sections with better spacing */
  & > *:first-child {
    margin-top: 0;
  }

  & > *:last-child {
    margin-bottom: 0;
  }

  /* Coverage determination styling */
  h2:first-child {
    background: ${props => props.isUser ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))'};
    color: ${props => props.isUser ? 'white' : '#059669'};
    padding: 12px 16px;
    border-radius: 8px;
    border: none;
    margin: 0 0 20px 0;
    font-size: 16px;
    text-align: center;
  }
`;

const InputArea = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-end;
`;

const ChatInput = styled.textarea`
  flex: 1;
  min-height: 44px;
  max-height: 120px;
  padding: 12px 16px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-family: inherit;
  resize: none;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const SendButton = styled(Button)`
  min-width: 44px;
  height: 44px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

// LoadingSpinner and EmptyState now imported from ui components

const InlineLoadingSpinner = styled.div`
  border: 3px solid rgba(99, 102, 241, 0.1);
  border-top: 3px solid #6366f1;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  animation: ${spin} 1s linear infinite;
`;



function ClaimsAnalysisComponent() {
  const [forms, setForms] = useState([]);
  const [filteredForms, setFilteredForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef(null);

  // Load forms on component mount
  useEffect(() => {
    try {
      loadForms();
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Error in loadForms useEffect', {}, error);
    }
  }, []);

  // Filter forms based on search query
  useEffect(() => {
    try {
      if (!Array.isArray(forms)) {
        logger.warn(LOG_CATEGORIES.DATA, 'Forms is not an array', { forms });
        setFilteredForms([]);
        return;
      }

      if (!searchQuery.trim()) {
        setFilteredForms(forms);
      } else {
        const query = searchQuery.toLowerCase();
        const filtered = forms.filter(form => {
          if (!form || typeof form !== 'object') return false;
          return (
            (form.formName || '').toLowerCase().includes(query) ||
            (form.formNumber || '').toLowerCase().includes(query) ||
            (form.category || '').toLowerCase().includes(query)
          );
        });
        setFilteredForms(filtered);
      }
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Error in filter useEffect', {}, error);
      setFilteredForms([]);
    }
  }, [forms, searchQuery]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Error in scroll useEffect', {}, error);
    }
  }, [messages]);

  const loadForms = async () => {
    try {
      logger.info(LOG_CATEGORIES.DATA, 'Loading forms from Firestore...');
      setLoading(true);

      // Add timeout to prevent hanging
      const formsSnapshot = await Promise.race([
        getDocs(collection(db, 'forms')),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 10000)
        )
      ]);

      const formsData = formsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          formName: data.formName || '',
          formNumber: data.formNumber || '',
          category: data.category || '',
          downloadUrl: data.downloadUrl || '',
          filePath: data.filePath || '',
          ...data
        };
      });

      // ✅ FILTER: Only show forms with PDF uploaded (have downloadUrl or filePath)
      const formsWithPDF = formsData.filter(form =>
        form.downloadUrl || form.filePath
      );

      logger.info(LOG_CATEGORIES.DATA, `Loaded ${formsWithPDF.length} forms with PDF (out of ${formsData.length} total)`);
      setForms(formsWithPDF);
      setFilteredForms(formsWithPDF);
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Error loading forms', {}, error);
      // Set empty arrays to prevent undefined errors
      setForms([]);
      setFilteredForms([]);
    } finally {
      setLoading(false);
    }
  };

  const selectForm = (form) => {
    setSelectedForm(prev => {
      // If clicking the same form, deselect it
      if (prev && prev.id === form.id) {
        return null;
      }
      // Otherwise, select the new form
      return form;
    });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedForm || isAnalyzing) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsAnalyzing(true);

    // Add user message to chat
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    try {
      setMessages(prev => [...prev, newUserMessage]);
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Error adding user message', {}, error);
      setIsAnalyzing(false);
      return;
    }

    try {
      // Validate selected form
      if (!selectedForm) {
        throw new Error('No form selected for analysis');
      }

      // Process selected form with timeout
      logger.info(LOG_CATEGORIES.AI, 'Processing form for analysis...');
      const formChunks = await Promise.race([
        processFormsForAnalysis([selectedForm]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Form processing timeout')), 90000)
        )
      ]);

      if (!formChunks || formChunks.length === 0) {
        throw new Error('No content could be extracted from the selected form');
      }

      logger.info(LOG_CATEGORIES.AI, `Processed ${formChunks.length} form chunks`);

      // Get conversation history (excluding current message)
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content || ''
      })).filter(msg => msg.content.trim());

      // Analyze claim with timeout
      logger.info(LOG_CATEGORIES.AI, 'Analyzing claim...');
      const analysis = await Promise.race([
        analyzeClaimWithChunking(userMessage, formChunks, conversationHistory),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Analysis timeout')), 120000)
        )
      ]);

      if (!analysis || typeof analysis !== 'string') {
        throw new Error('Invalid analysis response received');
      }

      logger.info(LOG_CATEGORIES.AI, 'Analysis completed successfully');

      // Add AI response to chat
      const aiMessage = {
        role: 'assistant',
        content: analysis,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Error analyzing claim', {}, error);

      // Create a safe error message
      const errorMessage = {
        role: 'assistant',
        content: `I apologize, but I encountered an error while analyzing your claim: ${error.message || 'Unknown error'}. Please try again or contact support if the issue persists.`,
        timestamp: new Date()
      };

      try {
        setMessages(prev => [...prev, errorMessage]);
      } catch (setError) {
        logger.error(LOG_CATEGORIES.ERROR, 'Error setting error message', {}, setError);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <PageContainer withOverlay={true}>
        <MainNavigation />
        <PageContent>
          <LoadingSpinner type="circular" size="40px" />
        </PageContent>
      </PageContainer>
    );
  }

  return (
    <PageContainer withOverlay={true}>
      <MainNavigation />
      <PageContent>
        <Breadcrumb
          items={[
            { label: 'Home', path: '/' },
            { label: 'Claims Analysis' }
          ]}
        />

        <EnhancedHeader
          title="Claims Analysis"
          subtitle="AI-powered claim coverage determination with form analysis"
          icon={ChatBubbleLeftRightIcon}
        />

        <ContentGrid>
          {/* Forms Selection Panel */}
          <Panel>
            <PanelHeader>
              <PanelTitle>
                <DocumentTextIcon />
                Select Form for Analysis
              </PanelTitle>
            </PanelHeader>
            <PanelContent>
              <SearchContainer>
                <SearchIcon />
                <SearchInput
                  placeholder="Search forms by name, number, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </SearchContainer>

              <FormsList>
                {Array.isArray(filteredForms) && filteredForms.map(form => {
                  if (!form || !form.id) return null;
                  return (
                    <FormItem
                      key={form.id}
                      selected={selectedForm && selectedForm.id === form.id}
                      onClick={() => selectForm(form)}
                    >
                      <FormRadio checked={selectedForm && selectedForm.id === form.id} />
                      <FormInfo>
                        <FormName>
                          {form.formName || form.formNumber || 'Unnamed Form'}
                        </FormName>
                        <FormMeta>
                          {form.formNumber && `${form.formNumber} • `}
                          {form.category || 'Unknown Category'}
                        </FormMeta>
                      </FormInfo>
                    </FormItem>
                  );
                })}
              </FormsList>

              {selectedForm && (
                <SelectedCount>
                  {selectedForm.formName || selectedForm.formNumber || 'Form'} selected for analysis
                </SelectedCount>
              )}
            </PanelContent>
          </Panel>

          {/* Chat Panel */}
          <Panel>
            <PanelHeader>
              <PanelTitle>
                <ChatBubbleLeftRightIcon />
                Claims Analysis Chat
              </PanelTitle>
            </PanelHeader>
            <PanelContent>
              <ChatContainer>
                <MessagesArea>
                  {messages.length === 0 ? (
                    <EmptyState
                      icon={<ChatBubbleLeftRightIcon style={{ width: '48px', height: '48px' }} />}
                      title="Ready to Analyze Claims"
                      description="Select a form and describe a claim scenario to get started."
                      variant="compact"
                    />
                  ) : (
                    Array.isArray(messages) && messages.map((message, index) => {
                      if (!message || typeof message !== 'object') return null;
                      return (
                        <Message key={index}>
                          <MessageHeader isUser={message.role === 'user'}>
                            {message.role === 'user' ? 'You' : 'Claims Analyst AI'}
                          </MessageHeader>
                          <MessageErrorBoundary>
                            <MessageContent isUser={message.role === 'user'}>
                              {message.role === 'user' ? (
                                <div style={{ whiteSpace: 'pre-wrap' }}>
                                  {message.content || ''}
                                </div>
                              ) : (
                                <UnifiedAIResponse content={message.content || ''} />
                              )}
                            </MessageContent>
                          </MessageErrorBoundary>
                        </Message>
                      );
                    })
                  )}
                  {isAnalyzing && (
                    <Message>
                      <MessageHeader>Claims Analyst AI</MessageHeader>
                      <MessageContent>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <InlineLoadingSpinner />
                          Analyzing claim against selected form...
                        </div>
                      </MessageContent>
                    </Message>
                  )}
                  <div ref={messagesEndRef} />
                </MessagesArea>

                <InputArea>
                  <ChatInput
                    placeholder={
                      !selectedForm
                        ? "Please select a form first..."
                        : "Describe a claim scenario for analysis..."
                    }
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={!selectedForm || isAnalyzing}
                  />
                  <SendButton
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || !selectedForm || isAnalyzing}
                  >
                    {isAnalyzing ? <InlineLoadingSpinner /> : <PaperAirplaneIcon />}
                  </SendButton>
                </InputArea>
              </ChatContainer>
            </PanelContent>
          </Panel>
        </ContentGrid>
      </PageContent>
    </PageContainer>
  );
}

// Export with error boundary wrapper
export default function ClaimsAnalysis() {
  return (
    <ClaimsAnalysisErrorBoundary>
      <ClaimsAnalysisComponent />
    </ClaimsAnalysisErrorBoundary>
  );
}
