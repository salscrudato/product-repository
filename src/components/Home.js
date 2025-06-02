import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  HomeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/solid';
import MainNavigation from './ui/Navigation';
import EnhancedHeader from './ui/EnhancedHeader';
import useProducts from '../hooks/useProducts';
import { collection, getDocs, collectionGroup } from 'firebase/firestore';
import { db } from '../firebase';

import InsuranceNewsFeed from './InsuranceNewsFeed';
import { Button } from './ui/Button';
import { TextInput } from './ui/Input';

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
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: 24px 20px 60px;
  }
`;

// Unused styled components removed to fix ESLint warnings

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 350px 1fr 350px;
  gap: 32px;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  align-items: start;

  @media (max-width: 1200px) {
    grid-template-columns: 300px 1fr 300px;
    gap: 24px;
  }

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`;

const QueueColumn = styled.div`
  width: 100%;
`;

const ChatColumn = styled.div`
  width: 100%;
  min-height: 400px;
`;

const NewsColumn = styled.div`
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
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
`;

const QueueHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const QueueTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  letter-spacing: -0.01em;
`;

const AddTaskButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  svg {
    width: 14px;
    height: 14px;
  }
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
  transition: all 0.2s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(99, 102, 241, 0.02);
    border-radius: 8px;
    margin: 0 -8px;
    padding: 12px 8px;
  }
`;

const QueueItemLeft = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
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

const QueueItemActions = styled.div`
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;

  ${QueueItem}:hover & {
    opacity: 1;
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.8);
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
  }

  &.danger:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const StatusBadge = styled.span`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  ${props => {
    switch (props.$status) {
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
  margin-right: 12px;
  background: ${props => {
    switch (props.$priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  }};
`;

// More unused styled components removed to fix ESLint warnings

const ResponseContainer = styled.div`
  width: 100%;
  padding: 20px 24px;
  background: rgba(248, 250, 252, 0.8);
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  font-size: 14px;
  line-height: 1.7;
  color: #1e293b;
  max-height: 70vh;
  overflow-y: auto;

  /* Enhanced markdown-style formatting */
  h1, h2 {
    margin: 20px 0 12px 0;
    font-weight: 700;
    font-size: 18px;
    color: #1e293b;
    border-bottom: 2px solid rgba(99, 102, 241, 0.2);
    padding-bottom: 8px;
  }

  h3 {
    margin: 16px 0 8px 0;
    font-weight: 600;
    font-size: 16px;
    color: #475569;
  }

  h4 {
    margin: 12px 0 6px 0;
    font-weight: 600;
    font-size: 14px;
    color: #64748b;
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

  strong {
    font-weight: 700;
    color: #1e293b;
  }

  code {
    background: rgba(99, 102, 241, 0.1);
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

  @media (max-width: 768px) {
    padding: 16px 20px;
    font-size: 13px;
  }
`;

// Task Management Modal Components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const ModalTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const FormLabel = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
`;

const FormSelect = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(209, 213, 219, 0.8);
  border-radius: 8px;
  font-size: 14px;
  background: white;
  color: #374151;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
`;

// LoadingSpinner removed - unused styled component

// Removed unused news components - now using InsuranceNewsFeed component



// Utility function to format AI response content (same as Claims Analysis)
const formatAIResponse = (content) => {
  if (!content) return '';

  // Convert markdown-style formatting to HTML
  let formatted = content
    // Convert ## headers to h2
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    // Convert ### headers to h3
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    // Convert #### headers to h4
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    // Convert **bold** to <strong>
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Convert bullet points to proper list items
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive list items in <ul>
    .replace(/(<li>.*<\/li>\s*)+/gs, '<ul>$&</ul>')
    // Convert line breaks to paragraphs
    .replace(/\n\n/g, '</p><p>')
    // Wrap in paragraph tags
    .replace(/^(?!<[hul])/gm, '<p>')
    .replace(/(?<!>)$/gm, '</p>')
    // Clean up empty paragraphs
    .replace(/<p><\/p>/g, '')
    // Clean up paragraphs around headers and lists
    .replace(/<p>(<h[1-6]>)/g, '$1')
    .replace(/(<\/h[1-6]>)<\/p>/g, '$1')
    .replace(/<p>(<ul>)/g, '$1')
    .replace(/(<\/ul>)<\/p>/g, '$1');

  return formatted;
};

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

  // Task management state
  const [tasks, setTasks] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    assignee: '',
    dueDate: '',
    status: 'in-progress',
    priority: 'medium'
  });

  // Initialize tasks with sample data
  useEffect(() => {
    const initialTasks = [
      {
        id: '1',
        title: 'Review CGL Form Updates',
        assignee: 'Sarah Chen',
        dueDate: '2024-12-25',
        status: 'in-progress',
        priority: 'high'
      },
      {
        id: '2',
        title: 'Update Property Coverage Rules',
        assignee: 'Mike Johnson',
        dueDate: '2024-12-28',
        status: 'pending',
        priority: 'medium'
      },
      {
        id: '3',
        title: 'Claims Analysis Training',
        assignee: 'Lisa Wang',
        dueDate: '2024-12-30',
        status: 'completed',
        priority: 'low'
      }
    ];
    setTasks(initialTasks);
  }, []);

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

  // Task management functions
  const openTaskModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title,
        assignee: task.assignee,
        dueDate: task.dueDate,
        status: task.status,
        priority: task.priority
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        title: '',
        assignee: '',
        dueDate: '',
        status: 'in-progress',
        priority: 'medium'
      });
    }
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    setTaskForm({
      title: '',
      assignee: '',
      dueDate: '',
      status: 'in-progress',
      priority: 'medium'
    });
  };

  const handleTaskSubmit = (e) => {
    e.preventDefault();

    if (editingTask) {
      // Update existing task
      setTasks(prev => prev.map(task =>
        task.id === editingTask.id
          ? { ...task, ...taskForm }
          : task
      ));
    } else {
      // Add new task
      const newTask = {
        id: Date.now().toString(),
        ...taskForm
      };
      setTasks(prev => [...prev, newTask]);
    }

    closeTaskModal();
  };

  const deleteTask = (taskId) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };



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
      taskQueue: tasks.map(task => ({
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
        activeTasks: tasks.filter(t => t.status === 'in-progress').length,
        highPriorityTasks: tasks.filter(t => t.priority === 'high').length,
        upcomingDeadlines: tasks.filter(t => {
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
        <EnhancedHeader
          title="What can I help with?"
          subtitle={"I'm here to assist with any questions or tasks."}
          icon={HomeIcon}
          searchProps={{
            placeholder: "Ask about products, coverages, tasks, or news",
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

        <ContentGrid>
          <QueueColumn>
            <QueueContainer>
              <QueueHeader>
                <QueueHeaderLeft>
                  <QueueIcon />
                  <QueueTitle>Task Management</QueueTitle>
                </QueueHeaderLeft>
                <AddTaskButton onClick={() => openTaskModal()}>
                  <PlusIcon />
                  Add Task
                </AddTaskButton>
              </QueueHeader>

              {tasks.map((task) => (
                <QueueItem key={task.id}>
                  <QueueItemLeft>
                    <PriorityIndicator $priority={task.priority} />
                    <QueueItemInfo>
                      <QueueItemTitle>{task.title}</QueueItemTitle>
                      <QueueItemMeta>{task.assignee} • Due {task.dueDate}</QueueItemMeta>
                    </QueueItemInfo>
                  </QueueItemLeft>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <StatusBadge $status={task.status}>
                      {task.status.replace('-', ' ')}
                    </StatusBadge>
                    <QueueItemActions>
                      <ActionButton onClick={() => openTaskModal(task)}>
                        <PencilIcon />
                      </ActionButton>
                      <ActionButton className="danger" onClick={() => deleteTask(task.id)}>
                        <TrashIcon />
                      </ActionButton>
                    </QueueItemActions>
                  </div>
                </QueueItem>
              ))}
            </QueueContainer>
          </QueueColumn>

          <ChatColumn>
            {response && (
              <ResponseContainer
                dangerouslySetInnerHTML={{
                  __html: formatAIResponse(response)
                }}
              />
            )}
          </ChatColumn>

          <NewsColumn>
            <InsuranceNewsFeed />
          </NewsColumn>
        </ContentGrid>

        {/* Task Management Modal */}
        {showTaskModal && (
          <ModalOverlay onClick={closeTaskModal}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>
                  {editingTask ? 'Edit Task' : 'Add New Task'}
                </ModalTitle>
                <CloseButton onClick={closeTaskModal}>
                  <XMarkIcon />
                </CloseButton>
              </ModalHeader>

              <form onSubmit={handleTaskSubmit}>
                <FormGroup>
                  <FormLabel>Task Title</FormLabel>
                  <TextInput
                    value={taskForm.title}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter task title"
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>Assignee</FormLabel>
                  <TextInput
                    value={taskForm.assignee}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, assignee: e.target.value }))}
                    placeholder="Enter assignee name"
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>Due Date</FormLabel>
                  <TextInput
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>Status</FormLabel>
                  <FormSelect
                    value={taskForm.status}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </FormSelect>
                </FormGroup>

                <FormGroup>
                  <FormLabel>Priority</FormLabel>
                  <FormSelect
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </FormSelect>
                </FormGroup>

                <ModalActions>
                  <Button type="button" variant="secondary" onClick={closeTaskModal}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    {editingTask ? 'Update Task' : 'Add Task'}
                  </Button>
                </ModalActions>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}
      </MainContent>
    </Page>
  );
}
