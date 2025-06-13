// src/services/aiTaskSummaryService.js
import { makeAIRequest, getSystemPrompt } from '../config/aiConfig';

/**
 * Generate AI-powered summaries for upcoming tasks
 * @param {Array} tasks - Array of task objects
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Array>} Array of tasks with AI summaries
 */
export async function generateTaskSummaries(tasks, apiKey) {
  if (!tasks || tasks.length === 0) {
    return [];
  }

  try {
    // Prepare task data for AI analysis
    const taskData = tasks.map(task => ({
      title: task.title,
      description: task.description || 'No description provided',
      phase: task.phase,
      priority: task.priority,
      assignee: task.assignee || 'Unassigned',
      dueDate: task.dueDate,
      isOverdue: task.dueDate ? new Date(task.dueDate) < new Date() : false,
      phaseDescription: getPhaseDescription(task.phase)
    }));

    // Create prompt for AI analysis
    const taskPrompt = `Analyze these upcoming insurance product management tasks and provide concise, actionable summaries:

${taskData.map((task, index) => `
**Task ${index + 1}: ${task.title}**
- Description: ${task.description}
- Phase: ${task.phaseDescription}
- Priority: ${task.priority}
- Assignee: ${task.assignee}
- Due Date: ${task.dueDate ? formatDate(task.dueDate) : 'No due date'}
- Status: ${task.isOverdue ? 'OVERDUE' : 'On track'}
`).join('\n')}

For each task, provide a 2-3 sentence summary focusing on:
1. Why this task is important/urgent
2. Key next actions or considerations
3. Potential risks or dependencies

Format as JSON array with this structure:
[
  {
    "taskIndex": 0,
    "summary": "Your concise summary here",
    "keyInsights": "Main insights about importance/urgency",
    "nextActions": "Specific next steps",
    "riskFactors": "Potential blockers or dependencies"
  }
]`;

    const systemPrompt = getSystemPrompt('TASK_SUMMARY_SYSTEM');
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: taskPrompt }
    ];

    const response = await makeAIRequest('TASK_SUMMARY', messages, apiKey);
    
    // Parse AI response
    let summaries;
    try {
      summaries = JSON.parse(response);
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON, using fallback format');
      // Fallback: create simple summaries
      summaries = tasks.map((task, index) => ({
        taskIndex: index,
        summary: `${task.title} - ${task.priority} priority task in ${getPhaseDescription(task.phase)} phase`,
        keyInsights: `This task is ${task.priority} priority and ${task.dueDate ? (new Date(task.dueDate) < new Date() ? 'overdue' : 'due soon') : 'has no due date'}`,
        nextActions: 'Review task details and coordinate with assignee',
        riskFactors: task.dueDate && new Date(task.dueDate) < new Date() ? 'Task is overdue' : 'Monitor progress'
      }));
    }

    // Combine original tasks with AI summaries
    return tasks.map((task, index) => {
      const summary = summaries.find(s => s.taskIndex === index) || {
        summary: `${task.title} - ${task.priority} priority task`,
        keyInsights: 'Task analysis pending',
        nextActions: 'Review task details',
        riskFactors: 'None identified'
      };

      return {
        ...task,
        aiSummary: summary
      };
    });

  } catch (error) {
    console.error('Error generating task summaries:', error);
    
    // Return tasks with fallback summaries
    return tasks.map(task => ({
      ...task,
      aiSummary: {
        summary: `${task.title} - ${task.priority} priority task in ${getPhaseDescription(task.phase)} phase`,
        keyInsights: `This task is ${task.priority} priority`,
        nextActions: 'Review task details and coordinate with assignee',
        riskFactors: task.dueDate && new Date(task.dueDate) < new Date() ? 'Task is overdue' : 'Monitor progress'
      }
    }));
  }
}

/**
 * Get the next N tasks sorted by due date
 * @param {Array} tasks - Array of all tasks
 * @param {number} count - Number of tasks to return (default: 3)
 * @returns {Array} Array of upcoming tasks
 */
export function getUpcomingTasks(tasks, count = 3) {
  if (!tasks || tasks.length === 0) {
    return [];
  }

  // Sort tasks by due date (overdue first, then by due date)
  const sortedTasks = [...tasks].sort((a, b) => {
    // Handle tasks without due dates
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;

    const dateA = new Date(a.dueDate);
    const dateB = new Date(b.dueDate);
    const now = new Date();

    // Check if tasks are overdue
    const aOverdue = dateA < now;
    const bOverdue = dateB < now;

    // Overdue tasks come first
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // Both overdue or both not overdue - sort by date
    return dateA - dateB;
  });

  return sortedTasks.slice(0, count);
}

/**
 * Get phase description for display
 * @param {string} phase - Phase ID
 * @returns {string} Human-readable phase description
 */
function getPhaseDescription(phase) {
  const phaseMap = {
    'research': 'Research & Ideation',
    'develop': 'Product Development',
    'compliance': 'Compliance & Filings',
    'implementation': 'Implementation & Launch'
  };
  return phaseMap[phase] || phase;
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (date < now) {
    if (diffDays === 1) return '1 day overdue';
    return `${diffDays} days overdue`;
  }

  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays < 7) return `Due in ${diffDays} days`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
  });
}
