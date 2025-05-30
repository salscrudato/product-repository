import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ArrowUpIcon } from '@heroicons/react/24/solid';
import MainNavigation from './ui/Navigation';
import useProducts from '../hooks/useProducts';
import { collection, getDocs, collectionGroup } from 'firebase/firestore';
import { db } from '../firebase';
import MarkdownRenderer from '../utils/markdownParser';
import InsuranceNewsFeed from './InsuranceNewsFeed';

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
  padding: 60px 32px 80px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: 40px 20px 60px;
  }
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  gap: 24px;

  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: center;
    gap: 32px;
  }
`;

const TitleSection = styled.div`
  text-align: center;
  flex: 1;
`;

const SearchSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 60px;
  width: 100%;
`;

const SearchContainer = styled.div`
  width: 100%;
  max-width: 700px;
  margin: 0 auto 40px auto;
  position: relative;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  padding: 10px 20px;
  gap: 16px;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
    border-color: rgba(99, 102, 241, 0.3);
  }

  &:focus-within {
    box-shadow: 0 12px 40px rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.5);
  }

  @media (max-width: 768px) {
    max-width: 100%;
    padding: 8px 16px;
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  align-items: start;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 32px;
  }
`;

const QueueColumn = styled.div`
  width: 100%;
`;

// Product Management Queue Components
const QueueContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
`;

const QueueHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
`;

const QueueTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  letter-spacing: -0.01em;
`;

const QueueIcon = styled.div`
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    content: '📋';
    font-size: 12px;
  }
`;

const QueueItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(226, 232, 240, 0.4);

  &:last-child {
    border-bottom: none;
  }
`;

const QueueItemInfo = styled.div`
  flex: 1;
`;

const QueueItemTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
`;

const QueueItemMeta = styled.div`
  font-size: 12px;
  color: #64748b;
`;

const StatusBadge = styled.span`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  ${props => {
    switch (props.status) {
      case 'in-progress':
        return `
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        `;
      case 'review':
        return `
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        `;
      case 'approved':
        return `
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
        `;
      case 'blocked':
        return `
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        `;
      default:
        return `
          background: rgba(107, 114, 128, 0.1);
          color: #6b7280;
        `;
    }
  }}
`;

const PriorityIndicator = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;

  ${props => {
    switch (props.priority) {
      case 'high':
        return 'background: #ef4444;';
      case 'medium':
        return 'background: #f59e0b;';
      case 'low':
        return 'background: #22c55e;';
      default:
        return 'background: #6b7280;';
    }
  }}
`;

const WelcomeTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b 0%, #475569 50%, #64748b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 32px 0;
  text-align: center;
  letter-spacing: -0.02em;
  line-height: 1.1;

  @media (max-width: 768px) {
    font-size: 1.5rem;
    margin-bottom: 24px;
  }
`;



const SearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 17px;
  color: #1e293b;
  padding: 10px 0;
  font-family: inherit;
  font-weight: 500;
  letter-spacing: -0.01em;

  &::placeholder {
    color: #94a3b8;
    font-weight: 400;
  }

  @media (max-width: 768px) {
    font-size: 16px;
    padding: 6px 0;
  }
`;

const SearchButton = styled.button`
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);

  &:hover {
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
  }

  &:active {
    transform: scale(0.95);
  }

  &:disabled {
    background: #e5e7eb;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const ResponseContainer = styled.div`
  width: 100%;
  max-width: 700px;
  margin: 24px auto 0;
  padding: 24px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  white-space: pre-wrap;
  line-height: 1.6;
  color: #374151;
  font-size: 15px;
  text-align: left;

  @media (max-width: 768px) {
    padding: 20px;
    margin-top: 20px;
    font-size: 14px;
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s ease-in-out infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// Removed unused news components - now using InsuranceNewsFeed component



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

  // Product Management Queue Data
  const productQueue = [
    {
      id: 1,
      title: "Commercial Auto 2024 Refresh",
      assignee: "Sarah Chen",
      dueDate: "Dec 15, 2024",
      status: "in-progress",
      priority: "high"
    },
    {
      id: 2,
      title: "Cyber Liability Enhancement",
      assignee: "Mike Rodriguez",
      dueDate: "Jan 8, 2025",
      status: "review",
      priority: "high"
    },
    {
      id: 3,
      title: "Workers Comp Rate Update",
      assignee: "Lisa Park",
      dueDate: "Dec 22, 2024",
      status: "approved",
      priority: "medium"
    },
    {
      id: 4,
      title: "Professional Liability Forms",
      assignee: "David Kim",
      dueDate: "Jan 15, 2025",
      status: "blocked",
      priority: "medium"
    },
    {
      id: 5,
      title: "Property Coverage Expansion",
      assignee: "Emma Wilson",
      dueDate: "Feb 1, 2025",
      status: "in-progress",
      priority: "low"
    }
  ];

  // Placeholder news data
  const marketNews = [
    {
      id: 1,
      title: "Insurance Industry Reports Strong Q4 Growth",
      content: "Major insurance carriers report increased premiums and improved loss ratios across commercial lines.",
      date: "2024-01-15",
      trend: "up",
      trendText: "+12% YoY"
    },
    {
      id: 2,
      title: "New Regulatory Changes Impact Property Coverage",
      content: "State regulators announce updated requirements for property insurance forms and coverage limits.",
      date: "2024-01-12",
      trend: "neutral",
      trendText: "Regulatory Update"
    },
    {
      id: 3,
      title: "Cyber Insurance Premiums Continue to Rise",
      content: "Increased cyber threats drive higher premiums and stricter underwriting standards across the industry.",
      date: "2024-01-10",
      trend: "up",
      trendText: "+8% Premium Increase"
    },
    {
      id: 4,
      title: "Climate Risk Assessment Tools Gain Adoption",
      content: "Insurers increasingly rely on advanced climate modeling for property risk assessment and pricing.",
      date: "2024-01-08",
      trend: "up",
      trendText: "Technology Adoption"
    },
    {
      id: 5,
      title: "Workers' Compensation Claims Show Decline",
      content: "Improved workplace safety measures contribute to reduced workers' compensation claim frequency.",
      date: "2024-01-05",
      trend: "down",
      trendText: "-5% Claims"
    }
  ];

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

      // Current task queue
      taskQueue: productQueue.map(task => ({
        title: task.title,
        assignee: task.assignee,
        dueDate: task.dueDate,
        status: task.status,
        priority: task.priority
      })),

      // Market news and trends
      marketNews: marketNews.map(news => ({
        title: news.title,
        content: news.content,
        date: news.date,
        trend: news.trend,
        trendText: news.trendText
      })),

      // Summary statistics
      summary: {
        totalProducts: products.length,
        totalCoverages: coverages.length,
        totalForms: forms.length,
        activeTasks: productQueue.filter(t => t.status === 'in-progress').length,
        highPriorityTasks: productQueue.filter(t => t.priority === 'high').length,
        upcomingDeadlines: productQueue.filter(t => {
          const dueDate = new Date(t.dueDate);
          const now = new Date();
          const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
          return diffDays <= 7 && diffDays >= 0;
        }).length
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
      const systemPrompt = `You are an expert AI assistant for an insurance product management system. You have access to comprehensive real-time data about the company's insurance products, coverages, forms, task management queue, and market news.

**Your Role:**
- Insurance product management expert and business analyst
- Help with product analysis, coverage questions, task prioritization, and strategic insights
- Provide actionable recommendations based on current data
- Answer questions about specific products, coverages, forms, deadlines, and market trends

**Current System Context:**
${JSON.stringify(context, null, 2)}

**Instructions:**
- Use the provided context data to give accurate, specific answers
- Reference actual product names, coverage details, task statuses, and deadlines when relevant
- Provide insights and recommendations based on the current state of the business
- If asked about trends, use the market news data
- For task-related questions, reference the actual queue and priorities
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
        <HeaderSection>
          <TitleSection>
            <WelcomeTitle>What can I help with?</WelcomeTitle>
            {(dataLoading || productsLoading) && (
              <div style={{
                fontSize: '14px',
                color: '#64748b',
                marginTop: '8px',
                textAlign: 'center'
              }}>
                Loading system data for enhanced assistance...
              </div>
            )}
          </TitleSection>
        </HeaderSection>

        <SearchSection>
          <SearchContainer>
            <SearchInput
              placeholder="Ask about products, coverages, tasks, deadlines, or market trends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={dataLoading || productsLoading}
            />
            <SearchButton
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isLoading}
              aria-label="Search"
            >
              {isLoading ? <LoadingSpinner /> : <ArrowUpIcon width={18} height={18} />}
            </SearchButton>
          </SearchContainer>

          {response && (
            <ResponseContainer>
              <MarkdownRenderer>{response}</MarkdownRenderer>
            </ResponseContainer>
          )}
        </SearchSection>

        <ContentGrid>
          <QueueColumn>
            <QueueContainer>
              <QueueHeader>
                <QueueIcon />
                <QueueTitle>Product Management Queue</QueueTitle>
              </QueueHeader>

              {productQueue.map((item) => (
                <QueueItem key={item.id}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <PriorityIndicator priority={item.priority} />
                    <QueueItemInfo>
                      <QueueItemTitle>{item.title}</QueueItemTitle>
                      <QueueItemMeta>{item.assignee} • Due {item.dueDate}</QueueItemMeta>
                    </QueueItemInfo>
                  </div>
                  <StatusBadge status={item.status}>
                    {item.status.replace('-', ' ')}
                  </StatusBadge>
                </QueueItem>
              ))}
            </QueueContainer>
          </QueueColumn>

          <InsuranceNewsFeed />
        </ContentGrid>
      </MainContent>
    </Page>
  );
}
