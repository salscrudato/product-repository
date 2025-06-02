import { useState, useEffect } from 'react';
import { collection, collectionGroup, getDocs, getDoc, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import styled from 'styled-components';
import {
  XMarkIcon,
  PlusIcon,
  WrenchScrewdriverIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  LightBulbIcon,
  CpuChipIcon
} from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import MainNavigation from '../components/ui/Navigation';
import EnhancedHeader from '../components/ui/EnhancedHeader';
import MarkdownRenderer from '../utils/markdownParser';

/* ---------- Modern Styled Components ---------- */

// Global animations
const GlobalStyle = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Page - Clean gradient background with overlay
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

// Main Content - Modern layout
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

// AI Chat Container - Revolutionary product builder interface
const AIBuilderContainer = styled.div`
  width: 100%;
  max-width: 1000px;
  margin: 0 auto 40px;
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

  @media (max-width: 768px) {
    max-width: 100%;
    margin-bottom: 32px;
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

  /* Custom scrollbar */
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
  position: relative;

  ${props => !props.isUser && `
    &::before {
      content: '';
      position: absolute;
      top: 8px;
      left: -6px;
      width: 12px;
      height: 12px;
      background: #ffffff;
      border: 1px solid rgba(226, 232, 240, 0.6);
      border-right: none;
      border-bottom: none;
      transform: rotate(-45deg);
    }
  `}
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
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateY(-1px);
  }
`;

// Content Grid - Two column layout with wider coverage card
const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 32px;
  margin-bottom: 40px;
  max-width: 2000px;
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`;

// Section Card - Modern card container with less padding
const SectionCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
    border-color: rgba(99, 102, 241, 0.3);
  }
`;

// Section Title - Modern section headers
const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  background: linear-gradient(135deg, #1e293b 0%, #475569 50%, #64748b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 24px 0;
  letter-spacing: -0.01em;
`;



// Form Input - Modern styled input
const FormInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  font-weight: 400;
  margin-bottom: 16px;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.2), 0 0 0 4px rgba(99, 102, 241, 0.1);
    background: rgba(255, 255, 255, 0.95);
    transform: translateY(-2px);
  }

  &::placeholder {
    color: #94a3b8;
    font-weight: 400;
  }
`;

// File Input Container
const FileInputContainer = styled.div`
  position: relative;
  margin-bottom: 16px;
`;

// File Input - Modern styled file input
const FileInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.2), 0 0 0 4px rgba(99, 102, 241, 0.1);
    background: rgba(255, 255, 255, 0.95);
  }

  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateY(-1px);
  }
`;

// Modern Button
const ModernButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    background: #e5e7eb;
    color: #9ca3af;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

// Table Container - Modern table styling with less padding
const TableContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  overflow-x: auto;
  margin-bottom: 20px;
`;

// Modern Table
const ModernTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

// Table Header
const TableHead = styled.thead`
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
`;

// Table Row
const TableRow = styled.tr`
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.02);
  }

  &:last-child {
    border-bottom: none;
  }
`;

// Table Header Cell
const TableHeaderCell = styled.th`
  padding: 16px 20px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  font-size: 14px;
  letter-spacing: 0.025em;
  text-transform: uppercase;
  border-bottom: 2px solid rgba(226, 232, 240, 0.8);
`;

// Table Cell
const TableCell = styled.td`
  padding: 16px 20px;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.5;
  vertical-align: middle;

  /* Prevent text wrapping for name columns */
  &:nth-child(2), &:nth-child(3) {
    white-space: nowrap;
    min-width: 200px;
  }
`;

// Loading Container
const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
`;

// Loading Spinner
const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// Modal Overlay
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

// Modal Container
const ModalContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 32px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
`;

// Modal Header
const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
`;

// Modal Title
const ModalTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
`;

// Close Button
const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: scale(1.05);
  }
`;

// AI System Prompt for Product Builder
const AI_SYSTEM_PROMPT = `You are an expert AI Product Builder for insurance products. You help insurance product managers create new products by analyzing existing products, coverages, and forms in their database.

Your capabilities:
1. **Product Analysis**: Understand existing products, their coverages, forms, and relationships
2. **Intelligent Recommendations**: Suggest optimal coverage combinations based on product type and market needs
3. **Form Association**: Recommend relevant forms for selected coverages
4. **Product Structure**: Help build complete product structures with proper metadata
5. **Market Intelligence**: Provide insights on product positioning and competitive advantages

When users describe what they want to build, you should:
- Ask clarifying questions to understand their needs
- Analyze existing products for patterns and best practices
- Suggest coverage combinations that make business sense
- Recommend appropriate forms and documentation
- Help with product naming, coding, and categorization
- Provide step-by-step guidance through the product creation process

Always be conversational, helpful, and focus on creating products that will be successful in the insurance market.

Available data context will include:
- Existing products with their metadata
- All available coverages across products
- Forms and their associations
- Product relationships and hierarchies

Respond in a helpful, professional tone and use markdown formatting for better readability.`;

const ProductBuilder = () => {
  const [coverages, setCoverages] = useState([]);
  const [forms, setForms] = useState([]);
  const [products, setProducts] = useState({});
  const [selectedCoverages, setSelectedCoverages] = useState({});
  const [newProductName, setNewProductName] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [productCode, setProductCode] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [file, setFile] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cloneLoading, setCloneLoading] = useState(false);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneTargetId, setCloneTargetId] = useState('');

  // AI Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  const navigate = useNavigate();

  // Fetch all coverages, forms, and products on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch products
        const productsSnap = await getDocs(collection(db, 'products'));
        const productMap = {};
        productsSnap.docs.forEach(doc => {
          productMap[doc.id] = doc.data().name;
        });
        setProducts(productMap);

        // Fetch coverages across all products
        const coveragesSnap = await getDocs(collectionGroup(db, 'coverages'));
        const coverageList = coveragesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          productId: doc.ref.parent.parent.id,
        }));
        setCoverages(coverageList);

        // Fetch all forms
        const formsSnap = await getDocs(collection(db, 'forms'));
        const formList = formsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setForms(formList);
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Initialize AI suggestions based on existing data
  useEffect(() => {
    if (!loading && Object.keys(products).length > 0) {
      const suggestions = [
        "Create a homeowners product similar to HO3 but for condos",
        "Build a commercial property product for small businesses",
        "Design an umbrella policy with high liability limits",
        "Create a renters insurance product for millennials",
        "Build a cyber liability product for tech companies"
      ];
      setAiSuggestions(suggestions);
    }
  }, [loading, products]);

  // Prepare context data for AI
  const prepareAIContext = () => {
    const productSummary = Object.entries(products).map(([id, name]) => ({
      id,
      name,
      coverageCount: coverages.filter(c => c.productId === id).length
    }));

    const coverageSummary = coverages.map(c => ({
      name: c.coverageName,
      type: c.coverageType,
      scope: c.scopeOfCoverage,
      limits: c.limits,
      productId: c.productId
    }));

    const formSummary = forms.map(f => ({
      name: f.formName,
      number: f.formNumber,
      type: f.formType
    }));

    return {
      products: productSummary,
      coverages: coverageSummary,
      forms: formSummary,
      totalProducts: Object.keys(products).length,
      totalCoverages: coverages.length,
      totalForms: forms.length
    };
  };

  // Handle AI chat message
  const handleChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatLoading(true);

    // Add user message to chat
    const newUserMessage = { role: 'user', content: userMessage };
    setChatMessages(prev => [...prev, newUserMessage]);

    try {
      const context = prepareAIContext();

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: AI_SYSTEM_PROMPT },
            { role: 'system', content: `Current database context: ${JSON.stringify(context, null, 2)}` },
            ...chatMessages,
            newUserMessage
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content?.trim();

      if (aiResponse) {
        const aiMessage = { role: 'assistant', content: aiResponse };
        setChatMessages(prev => [...prev, aiMessage]);

        // Parse AI response for product suggestions
        parseAIResponseForActions(aiResponse);
      } else {
        throw new Error('No response from AI');
      }

    } catch (error) {
      console.error('Error in AI chat:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again or contact support if the issue persists.'
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  // Parse AI response for actionable suggestions
  const parseAIResponseForActions = (aiResponse) => {
    // Look for product suggestions in AI response
    const productNameMatch = aiResponse.match(/product name[:\s]*["']([^"']+)["']/i);
    const productCodeMatch = aiResponse.match(/product code[:\s]*["']([^"']+)["']/i);
    const formNumberMatch = aiResponse.match(/form number[:\s]*["']([^"']+)["']/i);

    if (productNameMatch) {
      setNewProductName(productNameMatch[1]);
    }
    if (productCodeMatch) {
      setProductCode(productCodeMatch[1]);
    }
    if (formNumberMatch) {
      setFormNumber(formNumberMatch[1]);
    }
  };

  // Handle suggestion chip click
  const handleSuggestionClick = (suggestion) => {
    setChatInput(suggestion);
  };

  // Handle Enter key in chat input
  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatMessage();
    }
  };

  // Handle coverage selection
  const handleCoverageSelect = (coverage) => {
    const associatedForms = forms
      .filter(f => f.coverageIds?.includes(coverage.id))
      .map(f => f.id);
    if (selectedCoverages[coverage.id]) {
      // Deselect coverage
      const newSelected = { ...selectedCoverages };
      delete newSelected[coverage.id];
      setSelectedCoverages(newSelected);
    } else if (associatedForms.length <= 1) {
      // Auto-select coverage with its form(s)
      setSelectedCoverages(prev => ({
        ...prev,
        [coverage.id]: associatedForms
      }));
    } else {
      // Open modal for multiple forms
      setModalItem(coverage);
      setModalOpen(true);
    }
  };


  // Handle modal submission for multiple associations
  const handleModalSubmit = (coverageId, formIds) => {
    setSelectedCoverages(prev => ({ ...prev, [coverageId]: formIds }));
    setModalOpen(false);
  };

  // Create the new product
  const handleCreateProduct = async () => {
    // Build map of formId -> [coverageIds]
    const selectedFormsMap = Object.entries(selectedCoverages).reduce((acc, [covId, formIds]) => {
      formIds.forEach(fId => {
        if (!acc[fId]) acc[fId] = [];
        acc[fId].push(covId);
      });
      return acc;
    }, {});
    if (!newProductName || !formNumber || !effectiveDate || !file || Object.keys(selectedCoverages).length === 0 || Object.keys(selectedFormsMap).length === 0) {
      alert('Please fill in all required fields and select at least one coverage and one form.');
      return;
    }
    try {
      // Upload file to Firebase Storage
      const storageRef = ref(storage, `products/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      // Create new product
      const productRef = await addDoc(collection(db, 'products'), {
        name: newProductName,
        formNumber,
        productCode,
        formDownloadUrl: downloadUrl,
        effectiveDate,
      });
      const newProductId = productRef.id;

      // Map old IDs to new IDs
      const newCoverageIds = {};
      const newFormIds = {};

      // Create new coverage documents
      for (const coverageId in selectedCoverages) {
        const coverage = coverages.find(c => c.id === coverageId);
        const newCoverageRef = await addDoc(collection(db, `products/${newProductId}/coverages`), {
          name: coverage.name,
          coverageCode: coverage.coverageCode || '',
          formIds: [],
          limits: coverage.limits || [],
          deductibles: coverage.deductibles || [],
          states: coverage.states || [],
          category: coverage.category || 'Base Coverage',
          parentCoverageId: coverage.parentCoverageId || null,
        });
        newCoverageIds[coverageId] = newCoverageRef.id;
      }

      // Create new form documents
      for (const formId in selectedFormsMap) {
        const form = forms.find(f => f.id === formId);
        const newCoverageIdsForForm = selectedFormsMap[formId].map(cId => newCoverageIds[cId]).filter(id => id);
        const newFormRef = await addDoc(collection(db, 'forms'), {
          formName: form.formName || null,
          formNumber: form.formNumber,
          effectiveDate: form.effectiveDate || '',
          type: form.type || 'ISO',
          category: form.category || 'Base Coverage Form',
          productId: newProductId,
          coverageIds: newCoverageIdsForForm,
          downloadUrl: form.downloadUrl || '',
          filePath: form.filePath || null,
        });
        newFormIds[formId] = newFormRef.id;
      }

      // Update coverage formIds
      for (const coverageId in selectedCoverages) {
        const newCoverageId = newCoverageIds[coverageId];
        const newFormIdsForCoverage = selectedCoverages[coverageId]
          .map(fId => newFormIds[fId])
          .filter(id => id);
        await updateDoc(doc(db, `products/${newProductId}/coverages`, newCoverageId), {
          formIds: newFormIdsForCoverage,
        });

        // Update formCoverages collection for bidirectional linking
        for (const formId of newFormIdsForCoverage) {
          await addDoc(collection(db, 'formCoverages'), {
            formId: formId,
            coverageId: newCoverageId,
            productId: newProductId,
          });
        }
      }

      // Update forms with new coverage IDs
      for (const formId in selectedFormsMap) {
        const newFormId = newFormIds[formId];
        const newCoverageIdsForForm = selectedFormsMap[formId]
          .map(cId => newCoverageIds[cId])
          .filter(id => id);
        await updateDoc(doc(db, 'forms', newFormId), {
          coverageIds: newCoverageIdsForForm,
        });
      }

      alert('Product created successfully! Returning to ProductHub.');
      navigate('/');
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product. Please try again.');
    }
  };

  // Show all coverages (AI will help users navigate)
  const filteredCoverages = coverages;


  // Helper to get form names for a coverage


  if (cloneLoading) {
    return (
      <Page>
        <MainNavigation />
        <MainContent>
          <LoadingContainer>
            <LoadingSpinner />
            <p style={{marginTop: 16, color: '#6b7280'}}>Cloning product…</p>
          </LoadingContainer>
        </MainContent>
      </Page>
    );
  }

  if (loading) {
    return (
      <Page>
        <MainNavigation />
        <MainContent>
          <LoadingContainer>
            <LoadingSpinner />
          </LoadingContainer>
        </MainContent>
      </Page>
    );
  }

  // --- CLONE PRODUCT HELPER ---
  const cloneProduct = async (sourceId) => {
    if (!window.confirm('Clone this product and all of its related data?')) return;
    try {
      setCloneLoading(true);

      // 1️⃣ fetch source product
      const srcProdSnap = await getDoc(doc(db, 'products', sourceId));
      if (!srcProdSnap.exists()) throw new Error('Source product not found');
      const srcData = srcProdSnap.data();

      // 2️⃣ create new product (append " – Copy" to name)
      const newProdRef = await addDoc(collection(db, 'products'), {
        ...srcData,
        name: `${srcData.name} – Copy`,
      });
      const newProdId = newProdRef.id;

      // --- helper maps for ID translation ---
      const coverageIdMap = {};
      const formIdMap = {};

      // 3️⃣ clone coverages
      const covSnap = await getDocs(collection(db, `products/${sourceId}/coverages`));
      for (const c of covSnap.docs) {
        const newCovRef = await addDoc(collection(db, `products/${newProdId}/coverages`), {
          ...c.data(),
          formIds: [],                // temp ‑ will patch later
          parentCoverageId: null,     // parent links rebuilt later
        });
        coverageIdMap[c.id] = newCovRef.id;
      }
      // rebuild parentCoverage relationships
      for (const c of covSnap.docs) {
        const parentId = c.data().parentCoverageId;
        if (parentId && coverageIdMap[parentId]) {
          await updateDoc(
            doc(db, `products/${newProdId}/coverages`, coverageIdMap[c.id]),
            { parentCoverageId: coverageIdMap[parentId] }
          );
        }
      }

      // 4️⃣ clone forms
      const formSnap = await getDocs(query(collection(db, 'forms'), where('productId','==',sourceId)));
      for (const f of formSnap.docs) {
        const newCovIds = (f.data().coverageIds || []).map(cid => coverageIdMap[cid]).filter(Boolean);
        const newFormRef = await addDoc(collection(db, 'forms'), {
          ...f.data(),
          productId: newProdId,
          coverageIds: newCovIds,
        });
        formIdMap[f.id] = newFormRef.id;

        // recreate formCoverages docs
        for (const newCovId of newCovIds) {
          await addDoc(collection(db, 'formCoverages'), {
            formId: newFormRef.id,
            coverageId: newCovId,
            productId: newProdId,
          });
        }
      }

      // 5️⃣ patch each cloned coverage.formIds
      for (const [oldCovId,newCovId] of Object.entries(coverageIdMap)) {
        const srcCov = covSnap.docs.find(d=>d.id===oldCovId).data();
        const newFormIds = (srcCov.formIds||[]).map(fid=>formIdMap[fid]).filter(Boolean);
        await updateDoc(doc(db, `products/${newProdId}/coverages`, newCovId), { formIds: newFormIds });
      }

      alert('Product cloned! Redirecting to ProductHub.');
      navigate('/');
    } catch (err) {
      console.error(err);
      alert('Clone failed: '+err.message);
    } finally {
      setCloneLoading(false);
    }
  };

  return (
    <Page>
      <style>{GlobalStyle}</style>
      <MainNavigation />

      <MainContent>
        <EnhancedHeader
          title="AI Product Builder"
          subtitle="Describe your product vision and I'll help you build it intelligently"
          icon={WrenchScrewdriverIcon}
        />

        {/* AI Chat Interface */}
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
                  I'm your intelligent assistant for building insurance products. I can analyze your existing
                  {Object.keys(products).length} products, {coverages.length} coverages, and {forms.length} forms
                  to help you create the perfect new product.
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

        <ContentGrid>
          {/* Coverage Section */}
          <SectionCard>
            <SectionTitle>Coverages</SectionTitle>
            <TableContainer>
              <ModernTable>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Select</TableHeaderCell>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Product Name</TableHeaderCell>
                    <TableHeaderCell>Associated Forms</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <tbody>
                  {filteredCoverages.map(coverage => (
                    <TableRow key={coverage.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={!!selectedCoverages[coverage.id]}
                          onChange={() => handleCoverageSelect(coverage)}
                          style={{ marginRight: 8 }}
                        />
                        {!!selectedCoverages[coverage.id] && (
                          <button
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              marginLeft: 4,
                              cursor: 'pointer',
                              color: '#ef4444'
                            }}
                            onClick={e => {
                              e.stopPropagation();
                              handleCoverageSelect(coverage);
                            }}
                            title="Deselect"
                          >
                            <XMarkIcon style={{ width: 18, height: 18 }} />
                          </button>
                        )}
                      </TableCell>
                      <TableCell>{coverage.name}</TableCell>
                      <TableCell>{products[coverage.productId] || 'Unknown Product'}</TableCell>
                      <TableCell style={{ textAlign: 'center' }}>
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#6366f1',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                          onClick={() => {
                            setModalItem(coverage);
                            setModalOpen(true);
                          }}
                        >
                          Forms ({selectedCoverages[coverage.id]?.length || 0})
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </ModernTable>
            </TableContainer>
          </SectionCard>
          {/* New Product Details */}
          <SectionCard>
            <SectionTitle>New Product Details</SectionTitle>
            <FormInput
              placeholder="Enter product name"
              value={newProductName}
              onChange={e => setNewProductName(e.target.value)}
            />
            <FormInput
              placeholder="Form Number"
              value={formNumber}
              onChange={e => setFormNumber(e.target.value)}
            />
            <FormInput
              placeholder="Product Code"
              value={productCode}
              onChange={e => setProductCode(e.target.value)}
            />
            <FormInput
              placeholder="Effective Date (MM/YYYY)"
              value={effectiveDate}
              onChange={e => setEffectiveDate(e.target.value)}
            />
            <FileInputContainer>
              <FileInput
                type="file"
                onChange={e => setFile(e.target.files[0])}
              />
            </FileInputContainer>

            {Object.keys(selectedCoverages).length > 0 && (
              <TableContainer>
                <ModernTable>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Coverage</TableHeaderCell>
                      <TableHeaderCell>Forms</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <tbody>
                    {Object.keys(selectedCoverages).map(coverageId => {
                      const coverage = coverages.find(c => c.id === coverageId);
                      const formNames = selectedCoverages[coverageId]
                        .map(formId => forms.find(f => f.id === formId)?.formName || 'Unknown Form')
                        .join(', ');
                      return (
                        <TableRow key={coverageId}>
                          <TableCell>{coverage?.name}</TableCell>
                          <TableCell>{formNames}</TableCell>
                        </TableRow>
                      );
                    })}
                  </tbody>
                </ModernTable>
              </TableContainer>
            )}

            <ModernButton
              onClick={handleCreateProduct}
              disabled={
                !newProductName ||
                !formNumber ||
                !effectiveDate ||
                !file ||
                Object.keys(selectedCoverages).length === 0
              }
            >
              <PlusIcon style={{ width: 20, height: 20 }} />
              Create Product
            </ModernButton>
          </SectionCard>
        </ContentGrid>


        {/* Modal for Multiple Associations */}
        {modalOpen && (
          <ModalOverlay onClick={() => setModalOpen(false)}>
            <ModalContainer onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>
                  Select Forms for {modalItem.name}
                </ModalTitle>
                <CloseButton onClick={() => setModalOpen(false)}>
                  <XMarkIcon style={{ width: 20, height: 20 }} />
                </CloseButton>
              </ModalHeader>
              <div style={{ marginTop: 16 }}>
                {forms
                  .filter(f => f.coverageIds?.includes(modalItem.id))
                  .map(form => {
                    const checked = selectedCoverages[modalItem.id]?.includes(form.id) || false;
                    return (
                      <div key={form.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: 12,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: checked ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                        border: '1px solid rgba(226, 232, 240, 0.6)',
                        transition: 'all 0.2s ease'
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            const currentForms = selectedCoverages[modalItem.id] || [];
                            if (e.target.checked) {
                              handleModalSubmit(modalItem.id, [...currentForms, form.id]);
                            } else {
                              handleModalSubmit(modalItem.id, currentForms.filter(id => id !== form.id));
                            }
                          }}
                          style={{ marginRight: 12 }}
                        />
                        <span style={{
                          color: '#374151',
                          fontWeight: checked ? '600' : '400'
                        }}>
                          {form.formName || form.formNumber}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </ModalContainer>
          </ModalOverlay>
        )}
        {/* Clone Product Modal */}
        {cloneModalOpen && (
          <ModalOverlay onClick={() => setCloneModalOpen(false)}>
            <ModalContainer onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Select Product to Clone</ModalTitle>
                <CloseButton onClick={() => setCloneModalOpen(false)}>
                  <XMarkIcon width={20} height={20} />
                </CloseButton>
              </ModalHeader>

              <div style={{ maxHeight: 320, overflowY: 'auto', marginTop: 12 }}>
                {Object.entries(products)
                  .sort((a, b) => a[1].localeCompare(b[1]))
                  .map(([pid, name]) => (
                    <label key={pid} style={{
                      display: 'block',
                      padding: '12px 16px',
                      margin: '4px 0',
                      borderRadius: '8px',
                      background: cloneTargetId === pid ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      border: '1px solid rgba(226, 232, 240, 0.6)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="radio"
                        name="cloneTarget"
                        value={pid}
                        checked={cloneTargetId === pid}
                        onChange={() => setCloneTargetId(pid)}
                        style={{ marginRight: 12 }}
                      />
                      <span style={{
                        color: '#374151',
                        fontWeight: cloneTargetId === pid ? '600' : '400'
                      }}>
                        {name}
                      </span>
                    </label>
                  ))}
              </div>

              <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                <ModernButton
                  disabled={!cloneTargetId}
                  onClick={async () => {
                    await cloneProduct(cloneTargetId);
                    setCloneModalOpen(false);
                  }}
                >
                  Clone
                </ModernButton>
                <button
                  style={{
                    padding: '12px 24px',
                    border: '1px solid rgba(226, 232, 240, 0.6)',
                    borderRadius: '12px',
                    background: 'transparent',
                    color: '#6b7280',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setCloneModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </ModalContainer>
          </ModalOverlay>
        )}
      </MainContent>
    </Page>
  );
};

export default ProductBuilder;