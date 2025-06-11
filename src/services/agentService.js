// src/services/agentService.js
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { v4 as uuid } from 'uuid';

// Mock mode for development - set to false when Firebase Functions are deployed
const MOCK_MODE = true;

/**
 * Agent service for running agentic AI tasks
 * Provides a clean interface for executing multi-step AI operations
 */

// Get the agent function
const agentFunction = httpsCallable(functions, 'agent');

/**
 * Mock agent responses for development
 */
const mockAgentResponses = {
  'create': [
    {
      thought: "I need to create a new insurance product. Let me start by setting up the basic product information.",
      action: "createProduct",
      args: { name: "Auto Insurance Plus", productCode: "AUTO-PLUS-2024", formNumber: "AUTO-001" },
      done: false
    },
    {
      thought: "Now I'll add basic liability coverage to this auto product.",
      action: "createCoverage",
      args: { productId: "mock-product-id", name: "Bodily Injury Liability", limits: ["$25,000", "$50,000", "$100,000"] },
      done: false
    },
    {
      thought: "Perfect! I've successfully created a new auto insurance product with basic liability coverage. The product is ready for use.",
      action: null,
      args: {},
      done: true,
      final: "✅ Successfully created 'Auto Insurance Plus' product with Bodily Injury Liability coverage. Product ID: AUTO-PLUS-2024"
    }
  ],
  'add': [
    {
      thought: "I need to add comprehensive coverage to an existing product. Let me search for auto products first.",
      action: "searchProducts",
      args: { query: "auto" },
      done: false
    },
    {
      thought: "Found auto products. Now I'll add comprehensive coverage with appropriate deductibles.",
      action: "createCoverage",
      args: { productId: "existing-auto-id", name: "Comprehensive Coverage", deductibles: ["$250", "$500", "$1000"] },
      done: false
    },
    {
      thought: "Comprehensive coverage has been successfully added to the auto product with multiple deductible options.",
      action: null,
      args: {},
      done: true,
      final: "✅ Added Comprehensive Coverage to auto product with deductible options: $250, $500, $1000"
    }
  ],
  'update': [
    {
      thought: "I need to update deductible options. Let me first find the homeowners insurance product.",
      action: "searchProducts",
      args: { query: "homeowners" },
      done: false
    },
    {
      thought: "Found the homeowners product. Now I'll update the deductible options to include more choices.",
      action: "updateProduct",
      args: { id: "homeowners-id", deductibles: ["$500", "$1000", "$2500", "$5000"] },
      done: false
    },
    {
      thought: "Successfully updated the homeowners insurance deductible options with more flexible choices for customers.",
      action: null,
      args: {},
      done: true,
      final: "✅ Updated homeowners insurance deductible options: $500, $1000, $2500, $5000"
    }
  ],
  'find': [
    {
      thought: "I need to search for products that include flood coverage. Let me query the database.",
      action: "searchProducts",
      args: { query: "flood" },
      done: false
    },
    {
      thought: "I found several products with flood coverage. Let me get detailed information about their coverage options.",
      action: "fetchCoverages",
      args: { productId: "flood-product-1" },
      done: false
    },
    {
      thought: "Analysis complete. I found 3 products that include flood coverage with varying limits and deductibles.",
      action: null,
      args: {},
      done: true,
      final: "🔍 Found 3 products with flood coverage:\n• Homeowners Plus (up to $250K)\n• Property Master (up to $500K)\n• Commercial Property (up to $1M)"
    }
  ]
};

/**
 * Execute a single agent step
 * @param {string} goal - The user's goal/request
 * @param {Array} memory - Previous conversation memory
 * @param {string} sessionId - Unique session identifier
 * @returns {Promise<Object>} Agent response with thought, action, args, done, final
 */
export async function executeAgentStep(goal, memory = [], sessionId = null) {
  const actualSessionId = sessionId || uuid();

  if (MOCK_MODE) {
    // Mock implementation for development
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000)); // Simulate API delay

    // Determine response type based on goal keywords
    let responseType = 'create'; // default
    if (goal.toLowerCase().includes('add') || goal.toLowerCase().includes('comprehensive')) {
      responseType = 'add';
    } else if (goal.toLowerCase().includes('update') || goal.toLowerCase().includes('deductible')) {
      responseType = 'update';
    } else if (goal.toLowerCase().includes('find') || goal.toLowerCase().includes('search') || goal.toLowerCase().includes('flood')) {
      responseType = 'find';
    }

    const responses = mockAgentResponses[responseType];
    const stepIndex = memory.filter(m => m.role === 'assistant').length;
    const response = responses[Math.min(stepIndex, responses.length - 1)];

    return {
      ...response,
      sessionId: actualSessionId,
      toolResult: response.action ? { success: true, mockData: true } : null
    };
  }

  // Real implementation with Firebase Functions
  try {
    const result = await agentFunction({
      goal,
      memory,
      sessionId: actualSessionId
    });

    return {
      ...result.data,
      sessionId: actualSessionId
    };
  } catch (error) {
    console.error('Agent step execution failed:', error);
    throw new Error(`Agent execution failed: ${error.message}`);
  }
}

/**
 * Run a complete agent workflow until completion
 * @param {string} goal - The user's goal/request
 * @param {Function} onStep - Callback for each step (step, stepIndex) => void
 * @param {number} maxSteps - Maximum number of steps to prevent infinite loops
 * @returns {Promise<Object>} Final result with complete execution log
 */
export async function runAgentWorkflow(goal, onStep = null, maxSteps = 10) {
  const sessionId = uuid();
  const executionLog = [];
  let memory = [];
  let currentGoal = goal;
  let stepCount = 0;
  
  try {
    while (stepCount < maxSteps) {
      stepCount++;
      
      // Execute the next step
      const step = await executeAgentStep(currentGoal, memory, sessionId);
      executionLog.push(step);
      
      // Call the step callback if provided
      if (onStep) {
        onStep(step, stepCount - 1);
      }
      
      // Add to memory
      memory.push({
        role: 'assistant',
        content: JSON.stringify({
          thought: step.thought,
          action: step.action,
          args: step.args,
          toolResult: step.toolResult,
          toolError: step.toolError
        })
      });
      
      // Check if we're done
      if (step.done) {
        return {
          success: true,
          sessionId,
          goal,
          steps: executionLog,
          finalResult: step.final,
          stepCount
        };
      }
      
      // If there was a tool error, include it in the next goal
      if (step.toolError) {
        currentGoal = `Previous action failed with error: ${step.toolError}. Please try a different approach to: ${goal}`;
      }
    }
    
    // Max steps reached
    return {
      success: false,
      sessionId,
      goal,
      steps: executionLog,
      error: 'Maximum steps reached without completion',
      stepCount
    };
    
  } catch (error) {
    return {
      success: false,
      sessionId,
      goal,
      steps: executionLog,
      error: error.message,
      stepCount
    };
  }
}

/**
 * Agent capabilities for different types of tasks
 */
export const AgentCapabilities = {
  // Product management
  PRODUCT_CREATION: 'Create new insurance products with coverages and forms',
  PRODUCT_MODIFICATION: 'Update existing products and their components',
  PRODUCT_ANALYSIS: 'Analyze product data and generate insights',
  
  // Coverage management
  COVERAGE_SETUP: 'Add and configure coverages for products',
  COVERAGE_LINKING: 'Link coverages with forms and pricing',
  COVERAGE_ANALYSIS: 'Analyze coverage relationships and gaps',
  
  // Form management
  FORM_ASSOCIATION: 'Associate forms with products and coverages',
  FORM_ANALYSIS: 'Analyze form content and extract information',
  
  // Pricing management
  PRICING_SETUP: 'Create and configure pricing steps',
  PRICING_OPTIMIZATION: 'Optimize pricing structures',
  
  // Rules management
  RULE_CREATION: 'Create business rules for products',
  RULE_VALIDATION: 'Validate rule logic and consistency',
  
  // Data operations
  DATA_SEARCH: 'Search and retrieve product information',
  DATA_VALIDATION: 'Validate data consistency and completeness',
  BULK_OPERATIONS: 'Perform bulk updates and modifications'
};

/**
 * Get suggested prompts for common agent tasks
 */
export const getAgentPrompts = () => [
  {
    category: 'Product Management',
    prompts: [
      'Create a new auto insurance product with basic coverages',
      'Add comprehensive coverage to the existing auto product',
      'Update the deductible options for homeowners insurance',
      'Find all products that include flood coverage'
    ]
  },
  {
    category: 'Coverage & Forms',
    prompts: [
      'Link the new liability form to all auto coverages',
      'Create a new umbrella coverage with $1M limits',
      'Find forms that are missing from property coverages',
      'Add state-specific endorsements to all NY products'
    ]
  },
  {
    category: 'Pricing & Rules',
    prompts: [
      'Create pricing steps for age-based auto discounts',
      'Add a 10% multi-policy discount rule',
      'Update the base rates for all property products',
      'Create eligibility rules for high-value homes'
    ]
  },
  {
    category: 'Analysis & Reporting',
    prompts: [
      'Analyze coverage gaps across all products',
      'Find products missing required state filings',
      'Generate a summary of all active pricing rules',
      'Identify duplicate or conflicting business rules'
    ]
  }
];

/**
 * Validate agent goal before execution
 * @param {string} goal - The goal to validate
 * @returns {Object} Validation result with isValid and suggestions
 */
export function validateAgentGoal(goal) {
  if (!goal || goal.trim().length < 10) {
    return {
      isValid: false,
      error: 'Goal must be at least 10 characters long',
      suggestions: ['Be more specific about what you want to accomplish']
    };
  }
  
  // Check for potentially dangerous operations
  const dangerousKeywords = ['delete all', 'remove all', 'clear database', 'drop'];
  const hasDangerousKeywords = dangerousKeywords.some(keyword => 
    goal.toLowerCase().includes(keyword)
  );
  
  if (hasDangerousKeywords) {
    return {
      isValid: false,
      error: 'Goal contains potentially destructive operations',
      suggestions: ['Be more specific about what you want to modify or delete']
    };
  }
  
  return {
    isValid: true,
    suggestions: []
  };
}

/**
 * Format agent step for display
 * @param {Object} step - Agent step object
 * @returns {Object} Formatted step for UI display
 */
export function formatAgentStep(step) {
  return {
    id: step.sessionId + '_' + Date.now(),
    type: step.action ? 'action' : 'thought',
    content: step.thought,
    action: step.action,
    args: step.args,
    result: step.toolResult,
    error: step.toolError,
    timestamp: new Date(),
    done: step.done,
    final: step.final
  };
}

const agentService = {
  executeAgentStep,
  runAgentWorkflow,
  AgentCapabilities,
  getAgentPrompts,
  validateAgentGoal,
  formatAgentStep
};

export default agentService;
