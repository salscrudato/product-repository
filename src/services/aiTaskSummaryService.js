// src/services/aiTaskSummaryService.js
import { makeAIRequest, getSystemPrompt } from '../config/aiConfig';

/**
 * Generate AI-powered overall summary of all tasks with priorities and ownership
 * @param {Array} tasks - Array of task objects
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Object>} Overall task summary with priorities and next steps
 */
export async function generateTaskSummaries(tasks, apiKey) {
  if (!tasks || tasks.length === 0) {
    return {
      overallSummary: "No tasks currently available.",
      upcomingDeadlines: [],
      ownershipBreakdown: {},
      suggestedActions: [],
      riskFactors: []
    };
  }

  try {
    // Analyze task data for overall insights
    const taskAnalysis = analyzeTaskData(tasks);

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

    // Create prompt for overall task analysis
    const taskPrompt = `Analyze this portfolio of ${tasks.length} insurance product management tasks and provide an executive summary focusing on priorities, ownership, and next steps:

**TASK PORTFOLIO OVERVIEW:**
${taskData.map((task, index) => `
${index + 1}. ${task.title}
   - Phase: ${task.phaseDescription}
   - Priority: ${task.priority}
   - Assignee: ${task.assignee}
   - Due: ${task.dueDate ? formatDate(task.dueDate) : 'No due date'}
   - Status: ${task.isOverdue ? 'OVERDUE' : 'On track'}
`).join('')}

**ANALYSIS REQUIRED:**
Provide an overall summary that includes:
1. Which tasks are most urgent and why
2. Who owns the critical path items
3. Suggested immediate next steps
4. Potential bottlenecks or risks

Format as JSON with this structure:
{
  "overallSummary": "2-3 sentence executive summary of the task portfolio",
  "upcomingDeadlines": [
    {
      "task": "Task name",
      "assignee": "Owner name",
      "dueDate": "Due date",
      "urgency": "high/medium/low",
      "impact": "Brief impact description"
    }
  ],
  "ownershipBreakdown": {
    "assigneeName": {
      "taskCount": 3,
      "highPriorityTasks": 1,
      "overdueTasks": 0,
      "nextAction": "Suggested next step for this person"
    }
  },
  "suggestedActions": [
    "Immediate action item 1",
    "Immediate action item 2"
  ],
  "riskFactors": [
    "Risk or bottleneck 1",
    "Risk or bottleneck 2"
  ]
}`;

    const systemPrompt = getSystemPrompt('TASK_SUMMARY_SYSTEM');

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: taskPrompt }
    ];

    const response = await makeAIRequest('TASK_SUMMARY', messages, apiKey);

    // Parse AI response
    let taskSummary;
    try {
      taskSummary = JSON.parse(response);
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON, using fallback format');
      // Fallback: create simple summary
      taskSummary = createFallbackSummary(tasks, taskAnalysis);
    }

    return taskSummary;

  } catch (error) {
    console.error('Error generating task summaries:', error);

    // Return fallback summary
    return createFallbackSummary(tasks, analyzeTaskData(tasks));
  }
}

/**
 * Analyze task data to extract key insights
 * @param {Array} tasks - Array of task objects
 * @returns {Object} Analysis results
 */
function analyzeTaskData(tasks) {
  const now = new Date();

  const analysis = {
    totalTasks: tasks.length,
    overdueTasks: tasks.filter(t => t.dueDate && new Date(t.dueDate) < now),
    highPriorityTasks: tasks.filter(t => t.priority === 'high'),
    assigneeBreakdown: {},
    phaseBreakdown: {},
    upcomingDeadlines: []
  };

  // Analyze by assignee
  tasks.forEach(task => {
    const assignee = task.assignee || 'Unassigned';
    if (!analysis.assigneeBreakdown[assignee]) {
      analysis.assigneeBreakdown[assignee] = {
        total: 0,
        highPriority: 0,
        overdue: 0,
        tasks: []
      };
    }

    analysis.assigneeBreakdown[assignee].total++;
    analysis.assigneeBreakdown[assignee].tasks.push(task);

    if (task.priority === 'high') {
      analysis.assigneeBreakdown[assignee].highPriority++;
    }

    if (task.dueDate && new Date(task.dueDate) < now) {
      analysis.assigneeBreakdown[assignee].overdue++;
    }
  });

  // Get upcoming deadlines (next 14 days)
  const twoWeeksFromNow = new Date();
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

  analysis.upcomingDeadlines = tasks
    .filter(t => t.dueDate && new Date(t.dueDate) <= twoWeeksFromNow)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  return analysis;
}

/**
 * Create fallback summary when AI fails
 * @param {Array} tasks - Array of task objects
 * @param {Object} analysis - Task analysis data
 * @returns {Object} Fallback summary
 */
function createFallbackSummary(tasks, analysis) {
  const upcomingDeadlines = analysis.upcomingDeadlines.map(task => ({
    task: task.title,
    assignee: task.assignee || 'Unassigned',
    dueDate: task.dueDate,
    urgency: task.priority === 'high' ? 'high' : 'medium',
    impact: `${getPhaseDescription(task.phase)} phase task`
  }));

  const ownershipBreakdown = {};
  Object.entries(analysis.assigneeBreakdown).forEach(([assignee, data]) => {
    ownershipBreakdown[assignee] = {
      taskCount: data.total,
      highPriorityTasks: data.highPriority,
      overdueTasks: data.overdue,
      nextAction: data.overdue > 0 ? 'Address overdue tasks immediately' : 'Continue with current priorities'
    };
  });

  return {
    overallSummary: `Portfolio of ${tasks.length} tasks with ${analysis.overdueTasks.length} overdue and ${analysis.highPriorityTasks.length} high priority items requiring immediate attention.`,
    upcomingDeadlines,
    ownershipBreakdown,
    suggestedActions: [
      analysis.overdueTasks.length > 0 ? 'Review and address overdue tasks' : 'Monitor upcoming deadlines',
      'Coordinate with assignees on high priority items',
      'Update task progress and timelines'
    ],
    riskFactors: [
      analysis.overdueTasks.length > 0 ? `${analysis.overdueTasks.length} overdue tasks may impact project timeline` : null,
      Object.values(analysis.assigneeBreakdown).some(a => a.total > 5) ? 'Some team members may be overloaded' : null
    ].filter(Boolean)
  };
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
