// Product Queue Management - Modern task management system
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/solid';
import styled, { keyframes } from 'styled-components';
import { toast } from 'react-hot-toast';
import MainNavigation from './ui/Navigation';
import { Button } from './ui/Button';

/* ========== STYLED COMPONENTS ========== */

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Main Container
const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
  position: relative;
`;

const ContentWrapper = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

// Header Section
const HeaderSection = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  margin-bottom: 32px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  animation: ${slideIn} 0.6s ease-out;
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b 0%, #475569 50%, #64748b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.1;
`;

const PageSubtitle = styled.p`
  color: #64748b;
  font-size: 16px;
  margin: 8px 0 0 0;
  font-weight: 400;
`;

// Controls Section
const ControlsSection = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 300px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  font-size: 14px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    background: white;
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const SearchIcon = styled(MagnifyingGlassIcon)`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #9ca3af;
  pointer-events: none;
`;

// Filter Section
const FilterSection = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 8px;
  background: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

// Task Grid
const TaskGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
`;

// Task Card
const TaskCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
    border-color: rgba(99, 102, 241, 0.3);
  }
`;

const TaskHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const TaskTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
  line-height: 1.3;
`;

const TaskDescription = styled.p`
  color: #64748b;
  font-size: 14px;
  line-height: 1.5;
  margin: 0 0 16px 0;
`;

// Status and Priority Badges
const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  ${props => {
    switch (props.status) {
      case 'todo':
        return `
          background: rgba(107, 114, 128, 0.1);
          color: #374151;
        `;
      case 'in-progress':
        return `
          background: rgba(59, 130, 246, 0.1);
          color: #2563eb;
        `;
      case 'review':
        return `
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
        `;
      case 'completed':
        return `
          background: rgba(34, 197, 94, 0.1);
          color: #16a34a;
        `;
      default:
        return `
          background: rgba(107, 114, 128, 0.1);
          color: #374151;
        `;
    }
  }}
`;

const PriorityBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;

  ${props => {
    switch (props.priority) {
      case 'low':
        return `
          background: rgba(34, 197, 94, 0.1);
          color: #16a34a;
        `;
      case 'medium':
        return `
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
        `;
      case 'high':
        return `
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        `;
      case 'critical':
        return `
          background: rgba(147, 51, 234, 0.1);
          color: #9333ea;
        `;
      default:
        return `
          background: rgba(107, 114, 128, 0.1);
          color: #374151;
        `;
    }
  }}
`;

const TaskMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 8px;
`;

const TaskActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  ${props => {
    switch (props.variant) {
      case 'edit':
        return `
          background: rgba(99, 102, 241, 0.1);
          color: #6366f1;
          &:hover {
            background: rgba(99, 102, 241, 0.2);
            transform: scale(1.05);
          }
        `;
      case 'delete':
        return `
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          &:hover {
            background: rgba(239, 68, 68, 0.2);
            transform: scale(1.05);
          }
        `;
      case 'complete':
        return `
          background: rgba(34, 197, 94, 0.1);
          color: #16a34a;
          &:hover {
            background: rgba(34, 197, 94, 0.2);
            transform: scale(1.05);
          }
        `;
      default:
        return `
          background: rgba(107, 114, 128, 0.1);
          color: #6b7280;
          &:hover {
            background: rgba(107, 114, 128, 0.2);
            transform: scale(1.05);
          }
        `;
    }
  }}
`;

export default function ProductQueueManagement() {
  const navigate = useNavigate();

  // State management
  const [tasks, setTasks] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    productId: '',
    assignee: '',
    dueDate: ''
  });

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load products
        const productsSnap = await getDocs(collection(db, 'products'));
        const productMap = {};
        productsSnap.docs.forEach(doc => {
          productMap[doc.id] = doc.data().name;
        });
        setProducts(productMap);

        // Set up real-time listener for tasks
        const tasksQuery = query(
          collection(db, 'productTasks'),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
          const taskList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setTasks(taskList);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data. Please try again.');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Task management functions
  const openAddModal = () => {
    setNewTask({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      productId: '',
      assignee: '',
      dueDate: ''
    });
    setEditingTaskId(null);
    setModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTaskId(task.id);
    setNewTask({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      productId: task.productId || '',
      assignee: task.assignee || '',
      dueDate: task.dueDate || ''
    });
    setModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    try {
      await addDoc(collection(db, 'productTasks'), {
        ...newTask,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setModalOpen(false);
      toast.success('Task created successfully');
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to create task. Please try again.');
    }
  };

  const handleUpdateTask = async () => {
    if (!newTask.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    try {
      await updateDoc(doc(db, 'productTasks', editingTaskId), {
        ...newTask,
        updatedAt: serverTimestamp()
      });
      setModalOpen(false);
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task. Please try again.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteDoc(doc(db, 'productTasks', taskId));
        toast.success('Task deleted successfully');
      } catch (error) {
        console.error('Error deleting task:', error);
        toast.error('Failed to delete task. Please try again.');
      }
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateDoc(doc(db, 'productTasks', taskId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        ...(newStatus === 'completed' && { completedAt: serverTimestamp() })
      });
      toast.success('Task status updated');
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
    }
  };

  // Filter tasks based on search and filters
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.assignee?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesProduct = productFilter === 'all' || task.productId === productFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesProduct;
  });

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'todo':
        return <ClockIcon width={12} height={12} />;
      case 'in-progress':
        return <ExclamationTriangleIcon width={12} height={12} />;
      case 'review':
        return <FunnelIcon width={12} height={12} />;
      case 'completed':
        return <CheckIcon width={12} height={12} />;
      default:
        return <ClockIcon width={12} height={12} />;
    }
  };

  // Get priority icon
  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'low':
        return '●';
      case 'medium':
        return '●●';
      case 'high':
        return '●●●';
      case 'critical':
        return '⚡';
      default:
        return '●';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Container>
        <MainNavigation />
        <ContentWrapper>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid #e5e7eb',
                borderTop: '3px solid #6366f1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }} />
              <p style={{ color: '#6b7280' }}>Loading tasks...</p>
            </div>
          </div>
        </ContentWrapper>
      </Container>
    );
  }

  return (
    <Container>
      <MainNavigation />
      <ContentWrapper>
        {/* Header Section */}
        <HeaderSection>
          <HeaderContent>
            <div>
              <PageTitle>Product Queue Management</PageTitle>
              <PageSubtitle>Manage tasks and track progress across all products</PageSubtitle>
            </div>
            <Button onClick={openAddModal}>
              <PlusIcon width={16} height={16} />
              Add Task
            </Button>
          </HeaderContent>

          {/* Controls */}
          <ControlsSection>
            <SearchContainer>
              <SearchIcon />
              <SearchInput
                placeholder="Search tasks, descriptions, or assignees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </SearchContainer>

            <FilterSection>
              <FilterSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
              </FilterSelect>

              <FilterSelect
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </FilterSelect>

              <FilterSelect
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
              >
                <option value="all">All Products</option>
                {Object.entries(products).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </FilterSelect>
            </FilterSection>
          </ControlsSection>
        </HeaderSection>

        {/* Task Grid */}
        {filteredTasks.length > 0 ? (
          <TaskGrid>
            {filteredTasks.map(task => (
              <TaskCard key={task.id}>
                <TaskHeader>
                  <div style={{ flex: 1 }}>
                    <TaskTitle>{task.title}</TaskTitle>
                    {task.productId && (
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                        Product: {products[task.productId] || 'Unknown'}
                      </div>
                    )}
                  </div>
                  <TaskActions>
                    <ActionButton
                      variant="edit"
                      onClick={() => openEditModal(task)}
                      title="Edit task"
                    >
                      <PencilIcon width={14} height={14} />
                    </ActionButton>
                    <ActionButton
                      variant="delete"
                      onClick={() => handleDeleteTask(task.id)}
                      title="Delete task"
                    >
                      <TrashIcon width={14} height={14} />
                    </ActionButton>
                  </TaskActions>
                </TaskHeader>

                {task.description && (
                  <TaskDescription>{task.description}</TaskDescription>
                )}

                <TaskMeta>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <StatusBadge status={task.status}>
                      {getStatusIcon(task.status)}
                      {task.status?.replace('-', ' ')}
                    </StatusBadge>
                    <PriorityBadge priority={task.priority}>
                      {getPriorityIcon(task.priority)}
                      {task.priority}
                    </PriorityBadge>
                  </div>
                </TaskMeta>

                {(task.assignee || task.dueDate) && (
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
                    {task.assignee && <div>Assignee: {task.assignee}</div>}
                    {task.dueDate && <div>Due: {formatDate(task.dueDate)}</div>}
                  </div>
                )}

                {/* Quick Status Change */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {['todo', 'in-progress', 'review', 'completed'].map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(task.id, status)}
                      style={{
                        padding: '4px 8px',
                        border: task.status === status ? '1px solid #6366f1' : '1px solid #e5e7eb',
                        borderRadius: '6px',
                        background: task.status === status ? 'rgba(99, 102, 241, 0.1)' : 'white',
                        color: task.status === status ? '#6366f1' : '#6b7280',
                        fontSize: '11px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {status.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </TaskCard>
            ))}
          </TaskGrid>
        ) : (
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '60px 20px',
            textAlign: 'center',
            border: '1px solid rgba(226, 232, 240, 0.6)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
          }}>
            <h3 style={{ color: '#374151', margin: '0 0 8px 0' }}>No Tasks Found</h3>
            <p style={{ color: '#6b7280', margin: '0 0 24px 0' }}>
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || productFilter !== 'all'
                ? 'No tasks match your current filters. Try adjusting your search or filters.'
                : 'Get started by creating your first task.'
              }
            </p>
            <Button onClick={openAddModal}>
              <PlusIcon width={16} height={16} />
              Add Your First Task
            </Button>
          </div>
        )}
      </ContentWrapper>
    </Container>
  );
}
