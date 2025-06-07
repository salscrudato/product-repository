import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { HomeIcon } from '@heroicons/react/24/solid';
import MainNavigation from './ui/Navigation';
import EnhancedHeader from './ui/EnhancedHeader';
import { UnifiedAIResponse } from './ui/UnifiedAIResponse';
import useProducts from '../hooks/useProducts';
import { collection, getDocs, collectionGroup } from 'firebase/firestore';
import { db } from '../firebase';

/* ---------- styled components ---------- */
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
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: 24px 20px 60px;
  }
`;

const ChatContainer = styled.div`
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  min-height: 400px;
`;











/* ---------- component ---------- */
export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');

  // Data for context
  const { products, loading: productsLoading } = useProducts();
  const [coverages, setCoverages] = useState([]);
  const [forms, setForms] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch additional context data
  useEffect(() => {
    const fetchContextData = async () => {
      try {
        setDataLoading(true);

        // Fetch all coverages across all products
        const coveragesSnap = await getDocs(collectionGroup(db, 'coverages'));
        const coverageList = coveragesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          productId: doc.ref.parent.parent.id,
        }));
        setCoverages(coverageList);

        // Fetch all forms
        const formsSnap = await getDocs(collection(db, 'forms'));
        const formList = formsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setForms(formList);

      } catch (error) {
        console.error('Error fetching context data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchContextData();
  }, []);




  // Build comprehensive context for AI assistant
  const buildContext = () => {
    const context = {
      timestamp: new Date().toISOString(),
      company: "Insurance Product Management System",

      // Products data
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        formNumber: p.formNumber,
        productCode: p.productCode,
        effectiveDate: p.effectiveDate,
        hasForm: !!p.formDownloadUrl
      })),

      // Coverages data
      coverages: coverages.map(c => ({
        id: c.id,
        productId: c.productId,
        productName: products.find(p => p.id === c.productId)?.name || 'Unknown Product',
        coverageCode: c.coverageCode,
        coverageName: c.coverageName,
        scopeOfCoverage: c.scopeOfCoverage,
        limits: c.limits,
        perilsCovered: c.perilsCovered,
        parentCoverage: c.parentCoverage,
        isSubCoverage: !!c.parentCoverage
      })),

      // Forms data
      forms: forms.map(f => ({
        id: f.id,
        name: f.name,
        formNumber: f.formNumber,
        category: f.category,
        productIds: f.productIds || [],
        associatedProducts: (f.productIds || []).map(pid =>
          products.find(p => p.id === pid)?.name || 'Unknown Product'
        ).filter(Boolean)
      })),

      // Summary statistics
      summary: {
        totalProducts: products.length,
        totalCoverages: coverages.length,
        totalForms: forms.length
      }
    };

    return context;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || isLoading) return;

    const query = searchQuery.trim();
    setSearchQuery(''); // Clear the input immediately
    setIsLoading(true);
    setResponse('');

    try {
      // Build comprehensive context
      const context = buildContext();

      // Create enhanced system prompt with full context
      const systemPrompt = `You are an expert AI assistant for an insurance product management system. You have access to comprehensive real-time data about the company's insurance products, coverages, and forms.

**Your Role:**
- Insurance product management expert and business analyst
- Help with product analysis, coverage questions, and strategic insights
- Provide actionable recommendations based on current data
- Answer questions about specific products, coverages, and forms

**Current System Context:**
${JSON.stringify(context, null, 2)}

**Instructions:**
- Use the provided context data to give accurate, specific answers
- Reference actual product names, coverage details when relevant
- Provide insights and recommendations based on the current state of the business
- Be concise but comprehensive in your responses
- Format responses clearly with bullet points or sections when appropriate`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            { role: 'user', content: query }
          ],
          max_tokens: 1500,
          temperature: 0.7
        })
      });

      if (!res.ok) {
        throw new Error(`OpenAI API error: ${res.status}`);
      }

      const data = await res.json();
      const aiResponse = data.choices?.[0]?.message?.content?.trim();

      if (aiResponse) {
        setResponse(aiResponse);
      } else {
        throw new Error('No response from AI');
      }
    } catch (error) {
      console.error('AI request failed:', error);
      setResponse('Sorry, I encountered an error while processing your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch(e);
    }
  };

  return (
    <Page>
      <MainNavigation />

      <MainContent>
        <EnhancedHeader
          title="What can I help with?"
          subtitle={"I'm here to assist with any questions about products, coverages, and forms."}
          icon={HomeIcon}
          searchProps={{
            placeholder: "Ask about products, coverages, or forms",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            onKeyPress: handleKeyPress,
            onSearch: handleSearch,
            disabled: dataLoading || productsLoading,
            isLoading: isLoading
          }}
        >
          {(dataLoading || productsLoading) && (
            <div style={{
              fontSize: '14px',
              color: '#64748b',
              marginTop: '16px',
              textAlign: 'center'
            }}>
              Loading system data for enhanced assistance...
            </div>
          )}
        </EnhancedHeader>

        <ChatContainer>
          {response && (
            <UnifiedAIResponse content={response} />
          )}
        </ChatContainer>


      </MainContent>
    </Page>
  );
}
