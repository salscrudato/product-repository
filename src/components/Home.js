import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  HomeIcon,
  CubeIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
  NewspaperIcon
} from '@heroicons/react/24/solid';
import MainNavigation from './ui/Navigation';
import EnhancedHeader from './ui/EnhancedHeader';
import { UnifiedAIResponse } from './ui/UnifiedAIResponse';
import TaskOverviewCard from './ui/TaskOverviewCard';
import NewsFeedCard from './ui/NewsFeedCard';
import useProducts from '../hooks/useProducts';
import { collection, getDocs, collectionGroup } from 'firebase/firestore';
import { db } from '../firebase';
import { sampleNews } from '../data/sampleNews';
import { generateTaskSummaries, getUpcomingTasks } from '../services/aiTaskSummaryService';
import { seedTasks } from '../utils/taskSeeder';

/* ---------- styled components ---------- */
const Page = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.isDarkMode
    ? theme.colours.background
    : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)'
  };
  display: flex;
  flex-direction: column;
  position: relative;
  transition: background 0.3s ease;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 300px;
    background: ${({ theme }) => theme.isDarkMode
      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 50%, rgba(168, 85, 247, 0.1) 100%)'
      : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)'
    };
    opacity: ${({ theme }) => theme.isDarkMode ? '0.3' : '0.08'};
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

const ContentLayout = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr 300px;
  gap: 24px;
  margin-top: 32px;
  align-items: start;

  @media (max-width: 1400px) {
    grid-template-columns: 280px 1fr 280px;
    gap: 20px;
  }

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`;

const SideColumn = styled.div`
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 100px;

  @media (max-width: 1200px) {
    position: static;
  }
`;

const CenterColumn = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 400px;
`;

const WelcomeContainer = styled.div`
  background: ${({ theme }) => theme.isDarkMode ? theme.colours.cardBackground : 'white'};
  border-radius: 16px;
  padding: 32px 24px;
  border: 1px solid ${({ theme }) => theme.isDarkMode ? theme.colours.border : '#e5e7eb'};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  margin-bottom: 24px;
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4);
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }

  h2 {
    font-size: 24px;
    font-weight: 700;
    color: ${({ theme }) => theme.isDarkMode ? theme.colours.text : '#1f2937'};
    margin: 0 0 12px 0;
  }

  p {
    font-size: 16px;
    color: ${({ theme }) => theme.isDarkMode ? theme.colours.textSecondary : '#6b7280'};
    margin: 0;
    line-height: 1.6;
    max-width: 600px;
    margin: 0 auto;
  }
`;

const ChatContainer = styled.div`
  width: 100%;
  min-height: 400px;
`;











/* ---------- component ---------- */
export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');

  // Task summary states
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [taskSummariesLoading, setTaskSummariesLoading] = useState(false);

  // Data for context - comprehensive application data
  const { products, loading: productsLoading } = useProducts();
  const [coverages, setCoverages] = useState([]);
  const [forms, setForms] = useState([]);
  const [rules, setRules] = useState([]);
  const [pricingSteps, setPricingSteps] = useState([]);
  const [dataDictionary, setDataDictionary] = useState([]);
  const [formCoverages, setFormCoverages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [newsArticles, setNewsArticles] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Generate task summaries when tasks are loaded
  useEffect(() => {
    const generateSummaries = async () => {
      if (tasks.length > 0) {
        console.log('Tasks loaded, generating summaries for', tasks.length, 'tasks');

        // First, set the tasks without summaries immediately
        const upcoming = getUpcomingTasks(tasks, 5);
        setUpcomingTasks(upcoming);

        // Then try to generate AI summaries
        const apiKey = process.env.REACT_APP_OPENAI_KEY;
        if (apiKey && upcoming.length > 0) {
          setTaskSummariesLoading(true);
          try {
            console.log('Generating AI summaries for', upcoming.length, 'upcoming tasks');
            const tasksWithSummaries = await generateTaskSummaries(upcoming, apiKey);
            setUpcomingTasks(tasksWithSummaries);
            console.log('AI summaries generated successfully');
          } catch (error) {
            console.error('Error generating task summaries:', error);
            // Keep the tasks without AI summaries
          } finally {
            setTaskSummariesLoading(false);
          }
        } else {
          console.log('No API key or no upcoming tasks, skipping AI summaries');
          setTaskSummariesLoading(false);
        }
      } else if (tasks.length === 0 && !dataLoading) {
        console.log('No tasks found, setting empty array');
        setUpcomingTasks([]);
        setTaskSummariesLoading(false);
      }
    };

    generateSummaries();
  }, [tasks, dataLoading]);

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

        // Fetch tasks
        const tasksSnap = await getDocs(collection(db, 'tasks'));
        let tasksList = tasksSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // If no tasks exist, seed with sample data
        if (tasksList.length === 0) {
          console.log('No tasks found, seeding with sample data...');
          await seedTasks();
          // Fetch tasks again after seeding
          const newTasksSnap = await getDocs(collection(db, 'tasks'));
          tasksList = newTasksSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        }

        setTasks(tasksList);

        // Load sample news data (in a real app, this would be from an API or database)
        setNewsArticles(sampleNews);

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

      // Tasks data
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        phase: t.phase,
        priority: t.priority,
        assignee: t.assignee,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        isOverdue: t.dueDate ? new Date(t.dueDate) < new Date() : false,
        phaseDescription: {
          'research': 'Market Research & Ideation',
          'develop': 'Product Development',
          'compliance': 'Compliance & Filings',
          'implementation': 'Implementation & Launch'
        }[t.phase] || t.phase
      })),

      // News articles data
      newsArticles: newsArticles.map(n => ({
        id: n.id,
        title: n.title,
        excerpt: n.excerpt,
        category: n.category,
        source: n.source,
        publishedAt: n.publishedAt,
        url: n.url,
        categoryDescription: {
          'regulation': 'Regulatory and compliance news',
          'market': 'Market trends and analysis',
          'technology': 'Technology and innovation',
          'claims': 'Claims and legal developments',
          'underwriting': 'Underwriting and risk assessment'
        }[n.category] || n.category,
        daysAgo: Math.ceil((new Date() - new Date(n.publishedAt)) / (1000 * 60 * 60 * 24))
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
        totalTasks: tasks.length,
        totalNewsArticles: newsArticles.length,
        productsWithForms: products.filter(p => p.formDownloadUrl).length,
        subCoverages: coverages.filter(c => c.parentCoverage).length,
        proprietaryRules: rules.filter(r => r.proprietary).length,
        statesRepresented: [...new Set(products.flatMap(p => p.availableStates || []))].length,
        tasksByPhase: {
          research: tasks.filter(t => t.phase === 'research').length,
          develop: tasks.filter(t => t.phase === 'develop').length,
          compliance: tasks.filter(t => t.phase === 'compliance').length,
          implementation: tasks.filter(t => t.phase === 'implementation').length
        },
        tasksByPriority: {
          high: tasks.filter(t => t.priority === 'high').length,
          medium: tasks.filter(t => t.priority === 'medium').length,
          low: tasks.filter(t => t.priority === 'low').length
        },
        overdueTasks: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length,
        tasksWithAssignees: tasks.filter(t => t.assignee).length,
        newsByCategory: {
          regulation: newsArticles.filter(n => n.category === 'regulation').length,
          market: newsArticles.filter(n => n.category === 'market').length,
          technology: newsArticles.filter(n => n.category === 'technology').length,
          claims: newsArticles.filter(n => n.category === 'claims').length,
          underwriting: newsArticles.filter(n => n.category === 'underwriting').length
        },
        recentNews: newsArticles.filter(n =>
          (new Date() - new Date(n.publishedAt)) / (1000 * 60 * 60 * 24) <= 7
        ).length
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
      const systemPrompt = `You are an expert AI assistant for a comprehensive P&C insurance product management system. You have access to complete real-time data about the company's insurance products, coverages, forms, pricing models, business rules, regulatory compliance data, task management information, and current industry news.

**Your Role & Expertise:**
- Senior Insurance Product Management Expert and Business Intelligence Analyst
- P&C Insurance Domain Expert with deep knowledge of coverages, forms, pricing, and regulations
- Strategic Business Advisor for product portfolio optimization
- Regulatory Compliance and Risk Assessment Specialist
- Data Analytics Expert for insurance product performance
- Project Management and Task Coordination Specialist
- Industry News Analyst and Market Intelligence Expert

**Your Capabilities:**
- Analyze product portfolios and coverage hierarchies
- Evaluate pricing models and rate structures
- Assess regulatory compliance and form requirements
- Identify business opportunities and risks
- Provide strategic recommendations for product development
- Perform competitive analysis and market positioning
- Analyze state availability and geographic distribution
- Review business rules and underwriting guidelines
- Track project progress and task management across product development lifecycle
- Analyze team workload and task distribution
- Identify bottlenecks and resource allocation issues
- Provide insights on project timelines and deliverables
- Monitor industry news and regulatory developments
- Analyze market trends and competitive intelligence
- Correlate news events with business impact and opportunities
- Provide strategic insights based on industry developments

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
- Data dictionary constraints and validation rules
- Task management and project workflow phases
- Team assignments and workload distribution
- Project timelines and milestone tracking
- Cross-functional dependencies between tasks and product components
- Industry news trends and regulatory developments
- Market intelligence and competitive landscape analysis
- News impact on business strategy and product development
- Regulatory news correlation with compliance requirements`;

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

  // Handle news article click
  const handleArticleClick = (article) => {
    // In a real implementation, this would navigate to the full article
    console.log('Opening article:', article.title);
  };

  return (
    <Page>
      <MainNavigation />

      <MainContent>
        <EnhancedHeader
          title="How can I help you?"
          subtitle={"I have access to uploaded products, coverages, forms, pricing, rules, tasks and industry news"}
          icon={HomeIcon}
          searchProps={{
            placeholder: "Ask about products, pricing models, coverage analysis, regulatory compliance, task management, industry news, or strategic insights...",
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
              Loading comprehensive system data (products, coverages, forms, pricing, rules, tasks, news, compliance data)...
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
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ClipboardDocumentListIcon style={{ width: '14px', height: '14px' }} />
                {tasks.length} Tasks
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <NewspaperIcon style={{ width: '14px', height: '14px' }} />
                {newsArticles.length} News Articles
              </span>
            </div>
          )}
        </EnhancedHeader>

        <ContentLayout>
          <SideColumn>
            <TaskOverviewCard
              tasks={upcomingTasks}
              isLoading={taskSummariesLoading}
              maxItems={5}
            />
          </SideColumn>

          <CenterColumn>
            {!response && (
              <WelcomeContainer>
                <h2>Welcome to Product Hub</h2>
                <p>Your comprehensive insurance product management platform. Ask me anything about your products, coverages, forms, pricing, rules, tasks, or industry news to get started.</p>
              </WelcomeContainer>
            )}

            <ChatContainer>
              {response && (
                <UnifiedAIResponse content={response} />
              )}
            </ChatContainer>
          </CenterColumn>

          <SideColumn>
            <NewsFeedCard
              articles={newsArticles}
              onArticleClick={handleArticleClick}
              maxItems={4}
            />
          </SideColumn>
        </ContentLayout>

      </MainContent>
    </Page>
  );
}
