import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  HomeIcon,
  CubeIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  BookOpenIcon
} from '@heroicons/react/24/solid';
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

  // Data for context - comprehensive application data
  const { products, loading: productsLoading } = useProducts();
  const [coverages, setCoverages] = useState([]);
  const [forms, setForms] = useState([]);
  const [rules, setRules] = useState([]);
  const [pricingSteps, setPricingSteps] = useState([]);
  const [dataDictionary, setDataDictionary] = useState([]);
  const [formCoverages, setFormCoverages] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch comprehensive application data for enhanced AI context
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

        // Fetch all rules
        const rulesSnap = await getDocs(collection(db, 'rules'));
        const rulesList = rulesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRules(rulesList);

        // Fetch all pricing steps across all products
        const stepsSnap = await getDocs(collectionGroup(db, 'steps'));
        const stepsList = stepsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          productId: doc.ref.parent.parent.id,
        }));
        setPricingSteps(stepsList);

        // Fetch data dictionary
        const dataDictSnap = await getDocs(collection(db, 'dataDictionary'));
        const dataDictList = dataDictSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setDataDictionary(dataDictList);

        // Fetch form-coverage mappings
        const formCovSnap = await getDocs(collection(db, 'formCoverages'));
        const formCovList = formCovSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFormCoverages(formCovList);

      } catch (error) {
        console.error('Error fetching context data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchContextData();
  }, []);




  // Build comprehensive context for AI assistant with ALL application data
  const buildContext = () => {
    const context = {
      timestamp: new Date().toISOString(),
      company: "Insurance Product Management System",
      systemDescription: "Comprehensive P&C insurance product management platform with products, coverages, forms, pricing, rules, and regulatory data",

      // Products data with enhanced details
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        formNumber: p.formNumber,
        productCode: p.productCode,
        effectiveDate: p.effectiveDate,
        hasForm: !!p.formDownloadUrl,
        availableStates: p.availableStates || [],
        stateCount: (p.availableStates || []).length,
        status: p.status,
        bureau: p.bureau
      })),

      // Coverages data with relationships
      coverages: coverages.map(c => ({
        id: c.id,
        productId: c.productId,
        productName: products.find(p => p.id === c.productId)?.name || 'Unknown Product',
        coverageCode: c.coverageCode,
        coverageName: c.coverageName,
        scopeOfCoverage: c.scopeOfCoverage,
        limits: c.limits,
        deductibles: c.deductibles,
        perilsCovered: c.perilsCovered,
        parentCoverage: c.parentCoverage,
        isSubCoverage: !!c.parentCoverage,
        states: c.states || [],
        category: c.category,
        formIds: c.formIds || []
      })),

      // Forms data with associations
      forms: forms.map(f => ({
        id: f.id,
        name: f.name || f.formName,
        formNumber: f.formNumber,
        category: f.category,
        type: f.type,
        effectiveDate: f.effectiveDate,
        productIds: f.productIds || [],
        coverageIds: f.coverageIds || [],
        associatedProducts: (f.productIds || []).map(pid =>
          products.find(p => p.id === pid)?.name || 'Unknown Product'
        ).filter(Boolean),
        hasDocument: !!f.downloadUrl || !!f.filePath,
        dynamic: f.dynamic,
        attachmentConditions: f.attachmentConditions
      })),

      // Rules data
      rules: rules.map(r => ({
        id: r.id,
        name: r.name,
        ruleId: r.ruleId,
        condition: r.condition,
        outcome: r.outcome,
        ruleText: r.ruleText,
        proprietary: r.proprietary,
        reference: r.reference,
        productId: r.productId,
        productName: r.productId ? products.find(p => p.id === r.productId)?.name : null
      })),

      // Pricing steps data
      pricingSteps: pricingSteps.map(s => ({
        id: s.id,
        productId: s.productId,
        productName: products.find(p => p.id === s.productId)?.name || 'Unknown Product',
        stepName: s.stepName,
        stepType: s.stepType,
        coverages: s.coverages || [],
        states: s.states || [],
        value: s.value,
        rounding: s.rounding,
        order: s.order,
        operand: s.operand,
        table: s.table,
        calculation: s.calculation
      })),

      // Data dictionary
      dataDictionary: dataDictionary.map(d => ({
        id: d.id,
        fieldName: d.fieldName,
        description: d.description,
        dataType: d.dataType,
        allowedValues: d.allowedValues,
        required: d.required,
        category: d.category
      })),

      // Form-coverage mappings
      formCoverageMappings: formCoverages.map(fc => ({
        id: fc.id,
        productId: fc.productId,
        coverageId: fc.coverageId,
        formId: fc.formId,
        productName: products.find(p => p.id === fc.productId)?.name,
        coverageName: coverages.find(c => c.id === fc.coverageId)?.coverageName,
        formNumber: forms.find(f => f.id === fc.formId)?.formNumber
      })),

      // Enhanced summary statistics
      summary: {
        totalProducts: products.length,
        totalCoverages: coverages.length,
        totalForms: forms.length,
        totalRules: rules.length,
        totalPricingSteps: pricingSteps.length,
        totalDataDictionaryEntries: dataDictionary.length,
        totalFormCoverageMappings: formCoverages.length,
        productsWithForms: products.filter(p => p.formDownloadUrl).length,
        subCoverages: coverages.filter(c => c.parentCoverage).length,
        proprietaryRules: rules.filter(r => r.proprietary).length,
        statesRepresented: [...new Set(products.flatMap(p => p.availableStates || []))].length
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

      // Create enhanced system prompt with comprehensive domain expertise
      const systemPrompt = `You are an expert AI assistant for a comprehensive P&C insurance product management system. You have access to complete real-time data about the company's insurance products, coverages, forms, pricing models, business rules, and regulatory compliance data.

**Your Role & Expertise:**
- Senior Insurance Product Management Expert and Business Intelligence Analyst
- P&C Insurance Domain Expert with deep knowledge of coverages, forms, pricing, and regulations
- Strategic Business Advisor for product portfolio optimization
- Regulatory Compliance and Risk Assessment Specialist
- Data Analytics Expert for insurance product performance

**Your Capabilities:**
- Analyze product portfolios and coverage hierarchies
- Evaluate pricing models and rate structures
- Assess regulatory compliance and form requirements
- Identify business opportunities and risks
- Provide strategic recommendations for product development
- Perform competitive analysis and market positioning
- Analyze state availability and geographic distribution
- Review business rules and underwriting guidelines

**Current System Context (Complete Dataset):**
${JSON.stringify(context, null, 2)}

**Response Guidelines:**
- Provide expert-level insights with specific data references
- Use actual product names, coverage codes, form numbers, and pricing details
- Offer strategic recommendations based on comprehensive data analysis
- Identify patterns, trends, and opportunities in the data
- Highlight potential risks or compliance issues
- Format responses with clear structure using headers, bullet points, and sections
- Include relevant metrics and statistics to support your analysis
- Consider cross-functional impacts (pricing, underwriting, compliance, distribution)
- Provide actionable next steps when appropriate

**Data Relationships to Consider:**
- Product-to-coverage hierarchies and dependencies
- Form-to-coverage mappings and regulatory requirements
- Pricing step sequences and calculation logic
- State availability and geographic distribution patterns
- Business rules and their impact on underwriting
- Data dictionary constraints and validation rules`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            { role: 'user', content: query }
          ],
          max_tokens: 4000,  // Increased for comprehensive responses
          temperature: 0.3,  // Lower temperature for more focused, analytical responses
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1
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
      let errorMessage = 'Sorry, I encountered an error while processing your request. Please try again.';

      if (error.message.includes('429')) {
        errorMessage = 'I\'m currently experiencing high demand. Please wait a moment and try again.';
      } else if (error.message.includes('401')) {
        errorMessage = 'Authentication error. Please check the API configuration.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try a simpler question or try again later.';
      }

      setResponse(errorMessage);
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
          title="How can I help you?"
          subtitle={"I have access to uploaded products, coverages, forms, pricing and rules"}
          icon={HomeIcon}
          searchProps={{
            placeholder: "Ask about products, pricing models, coverage analysis, regulatory compliance, or strategic insights...",
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
              Loading comprehensive system data (products, coverages, forms, pricing, rules, compliance data)...
            </div>
          )}
          {!dataLoading && !productsLoading && (
            <div style={{
              fontSize: '12px',
              color: '#475569',
              marginTop: '12px',
              textAlign: 'center',
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CubeIcon style={{ width: '14px', height: '14px' }} />
                {products.length} Products
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheckIcon style={{ width: '14px', height: '14px' }} />
                {coverages.length} Coverages
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <DocumentTextIcon style={{ width: '14px', height: '14px' }} />
                {forms.length} Forms
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Cog6ToothIcon style={{ width: '14px', height: '14px' }} />
                {rules.length} Rules
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CurrencyDollarIcon style={{ width: '14px', height: '14px' }} />
                {pricingSteps.length} Pricing Steps
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <BookOpenIcon style={{ width: '14px', height: '14px' }} />
                {dataDictionary.length} Data Definitions
              </span>
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
