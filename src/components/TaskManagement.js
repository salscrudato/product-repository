// src/components/TaskManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  PlusIcon,
  XMarkIcon,
  LightBulbIcon,
  DocumentCheckIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  CalendarIcon,
  UserIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/solid';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import MainNavigation from './ui/Navigation';
import EnhancedHeader from './ui/EnhancedHeader';
import { seedTasks } from '../utils/taskSeeder';

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
`;

const MainContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px 32px;
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding: 0 4px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
`;

const ActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const FilterSelect = styled.select`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  color: #374151;
  cursor: pointer;
  min-width: 140px;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const TaskStats = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.5);
`;

const StatItem = styled.div`
  text-align: center;

  .number {
    font-size: 24px;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 4px;
  }

  .label {
    font-size: 12px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const HeaderActionButton = styled.button`
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  font-size: 14px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  @media (max-width: 768px) {
    flex-wrap: wrap;
    justify-content: center;
  }
`;

const SeedButton = styled.button`
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(16, 185, 129, 0.2);
    border-color: rgba(16, 185, 129, 0.5);
  }
`;

const KanbanBoard = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-top: 32px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Column = styled.div`
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(226, 232, 240, 0.5);
  min-height: 600px;
  transition: all 0.3s ease;

  &.drag-over {
    background: rgba(99, 102, 241, 0.05);
    border-color: #6366f1;
    transform: scale(1.02);
  }
`;

const ColumnHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid ${props => props.color || '#e5e7eb'};
`;

const ColumnIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${props => props.color || '#f3f4f6'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;

  svg {
    width: 20px;
    height: 20px;
  }
`;

const ColumnTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  flex: 1;
`;

const TaskCount = styled.span`
  background: ${props => props.color || '#f3f4f6'};
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  min-width: 20px;
  text-align: center;
`;

const TasksContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TaskCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: grab;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    border-color: #6366f1;
  }

  &:active {
    cursor: grabbing;
  }

  &.dragging {
    opacity: 0.5;
    transform: rotate(5deg);
  }

  &.overdue {
    border-left: 4px solid #ef4444;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.02) 0%, rgba(255, 255, 255, 1) 100%);
  }
`;

const TaskHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const TaskTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  line-height: 1.4;
  flex: 1;
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const TaskDescription = styled.p`
  font-size: 12px;
  color: #6b7280;
  margin: 0 0 12px 0;
  line-height: 1.4;
`;

const TaskMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #9ca3af;
`;

const PriorityBadge = styled.span`
  background: ${props => {
    switch (props.priority) {
      case 'high': return '#fee2e2';
      case 'medium': return '#fef3c7';
      case 'low': return '#dcfce7';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.priority) {
      case 'high': return '#dc2626';
      case 'medium': return '#d97706';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  }};
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  text-transform: capitalize;
`;

// Modal styles
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const ModalTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
`;

const Button = styled.button`
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  &.primary {
    background: #6366f1;
    color: white;
    border-color: #6366f1;

    &:hover {
      background: #5a67d8;
      border-color: #5a67d8;
    }
  }

  &.secondary {
    background: white;
    color: #374151;
    border-color: #d1d5db;

    &:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }
  }
`;

// ============================================================================
// Main Component
// ============================================================================

export default function TaskManagement() {
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignee: '',
    dueDate: '',
    phase: 'research'
  });

  // Task phases configuration
  const phases = [
    {
      id: 'research',
      title: 'Research & Ideation',
      icon: <LightBulbIcon />,
      color: '#f59e0b',
      description: 'Market analysis, competitive research, product ideation'
    },
    {
      id: 'develop',
      title: 'Product Development',
      icon: <DocumentCheckIcon />,
      color: '#3b82f6',
      description: 'Product design, coverage creation, form development'
    },
    {
      id: 'compliance',
      title: 'Compliance & Filings',
      icon: <ShieldCheckIcon />,
      color: '#8b5cf6',
      description: 'Regulatory review, state filings, compliance checks'
    },
    {
      id: 'implementation',
      title: 'Implementation & Launch',
      icon: <RocketLaunchIcon />,
      color: '#10b981',
      description: 'System setup, training, go-to-market execution'
    }
  ];

  // Load tasks from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'tasks'),
      (snapshot) => {
        const taskList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTasks(taskList);
      },
      (error) => {
        console.error('Error fetching tasks:', error);
      }
    );

    return unsubscribe;
  }, []);

  // Handle form input changes
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Create new task
  const handleCreateTask = async () => {
    if (!formData.title.trim()) return;

    try {
      await addDoc(collection(db, 'tasks'), {
        ...formData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        assignee: '',
        dueDate: '',
        phase: 'research'
      });
      setShowModal(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.target.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDraggedTask(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = async (e, newPhase) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    if (!draggedTask || draggedTask.phase === newPhase) return;

    try {
      await updateDoc(doc(db, 'tasks', draggedTask.id), {
        phase: newPhase,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating task phase:', error);
    }
  };

  // Filter tasks based on current filters
  const filteredTasks = tasks.filter(task => {
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
    if (assigneeFilter !== 'all' && task.assignee !== assigneeFilter) return false;
    return true;
  });

  // Get tasks for a specific phase
  const getTasksForPhase = (phaseId) => {
    return filteredTasks.filter(task => task.phase === phaseId);
  };

  // Get unique assignees for filter
  const getUniqueAssignees = () => {
    const assignees = tasks.map(task => task.assignee).filter(Boolean);
    return [...new Set(assignees)];
  };

  // Calculate task statistics
  const getTaskStats = () => {
    const total = filteredTasks.length;
    const highPriority = filteredTasks.filter(task => task.priority === 'high').length;
    const overdue = filteredTasks.filter(task => {
      if (!task.dueDate) return false;
      return new Date(task.dueDate) < new Date();
    }).length;
    const completed = filteredTasks.filter(task => task.phase === 'implementation').length;

    return { total, highPriority, overdue, completed };
  };

  // Handle seeding sample data
  const handleSeedData = async () => {
    if (!window.confirm('Add sample tasks to demonstrate the task management system?')) return;

    try {
      const seeded = await seedTasks();
      if (seeded) {
        alert('Sample tasks added successfully!');
      } else {
        alert('Tasks already exist. Sample data not added.');
      }
    } catch (error) {
      console.error('Error seeding data:', error);
      alert('Failed to add sample data. Please try again.');
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Check if task is overdue
  const isTaskOverdue = (task) => {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date();
  };

  return (
    <Container>
      <MainNavigation />
      <MainContent>
        <EnhancedHeader
          title="Product Task Management"
          subtitle={`Manage ${filteredTasks.length} task${filteredTasks.length !== 1 ? 's' : ''} across the complete product development lifecycle`}
          icon={ClipboardDocumentListIcon}
        />

        <ActionBar>
          <ActionGroup>
            <FilterGroup>
              <FilterSelect
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </FilterSelect>

              <FilterSelect
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
              >
                <option value="all">All Assignees</option>
                {getUniqueAssignees().map(assignee => (
                  <option key={assignee} value={assignee}>{assignee}</option>
                ))}
              </FilterSelect>
            </FilterGroup>
          </ActionGroup>

          <ActionGroup>
            <HeaderActionButton onClick={() => setShowModal(true)}>
              <PlusIcon />
              Add New Task
            </HeaderActionButton>

            {tasks.length === 0 && (
              <SeedButton onClick={handleSeedData}>
                Add Sample Data
              </SeedButton>
            )}
          </ActionGroup>
        </ActionBar>

        <TaskStats>
          <StatItem>
            <div className="number">{getTaskStats().total}</div>
            <div className="label">Total Tasks</div>
          </StatItem>
          <StatItem>
            <div className="number">{getTaskStats().highPriority}</div>
            <div className="label">High Priority</div>
          </StatItem>
          <StatItem>
            <div className="number">{getTaskStats().overdue}</div>
            <div className="label">Overdue</div>
          </StatItem>
          <StatItem>
            <div className="number">{getTaskStats().completed}</div>
            <div className="label">In Implementation</div>
          </StatItem>
        </TaskStats>

        <KanbanBoard>
          {phases.map(phase => (
            <Column
              key={phase.id}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, phase.id)}
            >
              <ColumnHeader color={phase.color}>
                <ColumnIcon color={phase.color}>
                  {phase.icon}
                </ColumnIcon>
                <div>
                  <ColumnTitle>{phase.title}</ColumnTitle>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    {phase.description}
                  </div>
                </div>
                <TaskCount color={phase.color}>
                  {getTasksForPhase(phase.id).length}
                </TaskCount>
              </ColumnHeader>

              <TasksContainer>
                {getTasksForPhase(phase.id).map(task => (
                  <TaskCard
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    className={isTaskOverdue(task) ? 'overdue' : ''}
                  >
                    <TaskHeader>
                      <TaskTitle>{task.title}</TaskTitle>
                      <DeleteButton onClick={() => handleDeleteTask(task.id)}>
                        <XMarkIcon />
                      </DeleteButton>
                    </TaskHeader>

                    {task.description && (
                      <TaskDescription>{task.description}</TaskDescription>
                    )}

                    <TaskMeta>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PriorityBadge priority={task.priority}>
                          {task.priority}
                        </PriorityBadge>
                        {task.assignee && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <UserIcon style={{ width: '12px', height: '12px' }} />
                            {task.assignee}
                          </div>
                        )}
                      </div>
                      {task.dueDate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CalendarIcon style={{ width: '12px', height: '12px' }} />
                          {formatDate(task.dueDate)}
                        </div>
                      )}
                    </TaskMeta>
                  </TaskCard>
                ))}
              </TasksContainer>
            </Column>
          ))}
        </KanbanBoard>

        {/* Add Task Modal */}
        {showModal && (
          <Overlay onClick={() => setShowModal(false)}>
            <Modal onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Create New Task</ModalTitle>
                <DeleteButton onClick={() => setShowModal(false)}>
                  <XMarkIcon />
                </DeleteButton>
              </ModalHeader>

              <FormGroup>
                <Label>Task Title *</Label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter task title..."
                />
              </FormGroup>

              <FormGroup>
                <Label>Description</Label>
                <TextArea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the task..."
                />
              </FormGroup>

              <FormGroup>
                <Label>Phase</Label>
                <Select
                  value={formData.phase}
                  onChange={(e) => handleInputChange('phase', e.target.value)}
                >
                  {phases.map(phase => (
                    <option key={phase.id} value={phase.id}>
                      {phase.title}
                    </option>
                  ))}
                </Select>
              </FormGroup>

              <FormGroup>
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </FormGroup>

              <FormGroup>
                <Label>Assignee</Label>
                <Input
                  type="text"
                  value={formData.assignee}
                  onChange={(e) => handleInputChange('assignee', e.target.value)}
                  placeholder="Assign to..."
                />
              </FormGroup>

              <FormGroup>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                />
              </FormGroup>

              <ButtonGroup>
                <Button className="secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button className="primary" onClick={handleCreateTask}>
                  Create Task
                </Button>
              </ButtonGroup>
            </Modal>
          </Overlay>
        )}
      </MainContent>
    </Container>
  );
}
