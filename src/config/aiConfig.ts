/**
 * Centralized AI Configuration
 * 
 * This file contains all AI model configurations, system prompts, and API settings
 * used throughout the Product Hub application. This ensures consistency and makes
 * it easy to update AI behavior from a single location.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface AIModels {
  PRIMARY: string;
  FALLBACK: string;
  CLAIMS_ANALYSIS: string;
  PRODUCT_SUMMARY: string;
  HOME_CHAT: string;
  AGENT_WORKFLOW: string;
  PRODUCT_BUILDER: string;
}

export interface AITimeouts {
  QUICK_RESPONSE: number;
  STANDARD: number;
  COMPLEX_ANALYSIS: number;
  SYNTHESIS: number;
  LONG_PROCESSING: number;
}

export interface AIAPIConfig {
  OPENAI_ENDPOINT: string;
  TIMEOUTS: AITimeouts;
}

export interface AIParameterConfig {
  model: string;
  max_tokens: number;
  temperature: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  timeout: number;
}

export interface AIParameters {
  PRODUCT_SUMMARY: AIParameterConfig;
  FORM_SUMMARY: AIParameterConfig;
  CLAIMS_ANALYSIS: AIParameterConfig;
  CLAIMS_SYNTHESIS: AIParameterConfig;
  HOME_CHAT: AIParameterConfig;
  PRODUCT_CHAT: AIParameterConfig;
  RULES_EXTRACTION: AIParameterConfig;
  AGENT_WORKFLOW: AIParameterConfig;
  PRODUCT_BUILDER: AIParameterConfig;
  TASK_SUMMARY: AIParameterConfig;
  NEWS_SUMMARY: AIParameterConfig;
  EARNINGS_SUMMARY: AIParameterConfig;
  EARNINGS_ANALYSIS: AIParameterConfig;
}

export interface AIPrompts {
  PRODUCT_SUMMARY_SYSTEM: string;
  FORM_SUMMARY_SYSTEM: string;
  CLAIMS_ANALYSIS_SYSTEM: string;
  CLAIMS_SYNTHESIS_SYSTEM: string;
  HOME_CHAT_SYSTEM: string;
  PRODUCT_CHAT_SYSTEM: (productName: string, pdfText?: string) => string;
  NEWS_SUMMARY_SYSTEM: string;
  EARNINGS_SUMMARY_SYSTEM: string;
  EARNINGS_ANALYSIS_SYSTEM: string;
  RULES_EXTRACTION_SYSTEM: string;
  AGENT_WORKFLOW_SYSTEM: string;
  PRODUCT_BUILDER_SYSTEM: string;
  TASK_SUMMARY_SYSTEM: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ============================================================================
// AI Models Configuration
// ============================================================================

export const AI_MODELS: AIModels = {
  // Primary model used across the application
  PRIMARY: 'gpt-4o-mini',

  // Fallback model (if needed in future)
  FALLBACK: 'gpt-4o-mini',

  // Specific model overrides (if different models needed for specific features)
  CLAIMS_ANALYSIS: 'gpt-4o',  // Keep GPT-4o for Claims Analysis as per user preference
  PRODUCT_SUMMARY: 'gpt-4o-mini',
  HOME_CHAT: 'gpt-4o-mini',
  AGENT_WORKFLOW: 'gpt-4o-mini',
  PRODUCT_BUILDER: 'gpt-4o-mini'
};

// ============================================================================
// API Configuration
// ============================================================================

export const AI_API_CONFIG: AIAPIConfig = {
  OPENAI_ENDPOINT: 'https://api.openai.com/v1/chat/completions',
  
  // Default timeouts for different operations (in milliseconds)
  TIMEOUTS: {
    QUICK_RESPONSE: 30000,    // 30 seconds - for simple queries
    STANDARD: 45000,          // 45 seconds - for standard analysis
    COMPLEX_ANALYSIS: 60000,  // 60 seconds - for complex analysis
    SYNTHESIS: 60000,         // 60 seconds - for synthesis operations
    LONG_PROCESSING: 120000   // 2 minutes - for heavy processing
  }
};

// ============================================================================
// Model Parameters by Use Case
// ============================================================================

export const AI_PARAMETERS: AIParameters = {
  // Product summary generation - structured, consistent output
  PRODUCT_SUMMARY: {
    model: AI_MODELS.PRODUCT_SUMMARY,
    max_tokens: 2000,
    temperature: 0.2,
    timeout: AI_API_CONFIG.TIMEOUTS.STANDARD
  },
  
  // Form summary generation - concise, structured
  FORM_SUMMARY: {
    model: AI_MODELS.PRIMARY,
    max_tokens: 1000,
    temperature: 0.2,
    timeout: AI_API_CONFIG.TIMEOUTS.STANDARD
  },
  
  // Claims analysis - detailed, analytical
  CLAIMS_ANALYSIS: {
    model: AI_MODELS.CLAIMS_ANALYSIS,
    max_tokens: 2000,
    temperature: 0.2,
    timeout: AI_API_CONFIG.TIMEOUTS.STANDARD
  },
  
  // Claims synthesis - comprehensive analysis
  CLAIMS_SYNTHESIS: {
    model: AI_MODELS.CLAIMS_ANALYSIS,
    max_tokens: 3000,
    temperature: 0.1,
    timeout: AI_API_CONFIG.TIMEOUTS.SYNTHESIS
  },
  
  // Home page chat - conversational, informative
  HOME_CHAT: {
    model: AI_MODELS.HOME_CHAT,
    max_tokens: 4000,
    temperature: 0.3,
    top_p: 0.9,
    frequency_penalty: 0.1,
    presence_penalty: 0.1,
    timeout: AI_API_CONFIG.TIMEOUTS.STANDARD
  },
  
  // Product chat - contextual, helpful
  PRODUCT_CHAT: {
    model: AI_MODELS.PRIMARY,
    max_tokens: 1000,
    temperature: 0.7,
    timeout: AI_API_CONFIG.TIMEOUTS.QUICK_RESPONSE
  },
  
  // Rules extraction - structured, precise
  RULES_EXTRACTION: {
    model: AI_MODELS.PRIMARY,
    max_tokens: 2000,
    temperature: 0.3,
    timeout: AI_API_CONFIG.TIMEOUTS.STANDARD
  },
  
  // Agent workflow - task-oriented, structured
  AGENT_WORKFLOW: {
    model: AI_MODELS.AGENT_WORKFLOW,
    max_tokens: 1000,
    temperature: 0.3,
    timeout: AI_API_CONFIG.TIMEOUTS.STANDARD
  },
  
  // Product builder - creative, helpful
  PRODUCT_BUILDER: {
    model: AI_MODELS.PRODUCT_BUILDER,
    max_tokens: 2000,
    temperature: 0.4,
    timeout: AI_API_CONFIG.TIMEOUTS.STANDARD
  },

  // Task summary - concise, actionable insights
  TASK_SUMMARY: {
    model: AI_MODELS.PRIMARY,
    max_tokens: 1000,
    temperature: 0.2,
    timeout: AI_API_CONFIG.TIMEOUTS.STANDARD
  },

  // News summarization - concise P&C intelligence summaries
  NEWS_SUMMARY: {
    model: AI_MODELS.PRIMARY,
    max_tokens: 150, // Reduced for concise summaries (1-2 sentences max)
    temperature: 0.1, // Very low for consistent, focused output
    top_p: 0.8, // Reduced for more focused responses
    frequency_penalty: 0.2, // Higher to reduce repetition
    timeout: AI_API_CONFIG.TIMEOUTS.QUICK_RESPONSE
  },

  // Earnings summarization - intelligent financial analysis summaries
  EARNINGS_SUMMARY: {
    model: AI_MODELS.PRIMARY,
    max_tokens: 200, // Slightly longer for financial context
    temperature: 0.1, // Very low for consistent, analytical output
    top_p: 0.8, // Focused responses for financial accuracy
    frequency_penalty: 0.2, // Reduce repetition
    timeout: AI_API_CONFIG.TIMEOUTS.QUICK_RESPONSE
  },

  // Earnings analysis - detailed financial performance insights
  EARNINGS_ANALYSIS: {
    model: AI_MODELS.PRIMARY,
    max_tokens: 500, // More detailed analysis
    temperature: 0.2, // Low for analytical consistency
    top_p: 0.9, // Slightly higher for nuanced analysis
    frequency_penalty: 0.1, // Allow some repetition for emphasis
    timeout: AI_API_CONFIG.TIMEOUTS.STANDARD
  }
};

// ============================================================================
// System Prompts
// ============================================================================

export const AI_PROMPTS: AIPrompts = {
  // Product Hub - Structured product analysis
  PRODUCT_SUMMARY_SYSTEM: `
Persona: You are an expert in P&C insurance products. Your task is to analyze the provided insurance document text and extract key information into a structured JSON format.

**Understand the following definitions:**
- **Coverage**: A specific type of protection provided by the insurance policy (e.g., "Bodily Injury Liability", "Property Damage", "Comprehensive")
- **Peril**: A specific cause of loss that is covered (e.g., "Fire", "Theft", "Collision", "Vandalism")
- **Limit**: The maximum amount the insurer will pay for a covered loss
- **Deductible**: The amount the policyholder must pay before insurance coverage applies
- **Exclusion**: Specific situations, conditions, or types of losses that are not covered
- **Condition**: Requirements that must be met for coverage to apply
- **Enhancement**: Additional coverage that builds upon or extends a base coverage

**Instructions:**
1. Analyze the document text carefully
2. Identify the document category (e.g., "Auto Policy", "Homeowners Policy", "Commercial General Liability", "Workers Compensation")
3. Extract all coverages mentioned, including their scope, limits, and covered perils
4. List general conditions that apply to the policy
5. List general exclusions that apply to the policy
6. For each coverage, identify if it enhances or builds upon other coverages

**Output Format:**
{
  "category": "document_type",
  "coverages": [
    {
      "coverageName": "name",
      "scopeOfCoverage": "description",
      "limits": "limits_description",
      "perilsCovered": ["peril1", "peril2"],
      "enhances": ["coverage1", "coverage2"]
    }
  ],
  "generalConditions": ["condition1", "condition2"],
  "generalExclusions": ["exclusion1", "exclusion2"]
}`,

  // Form Summary - Concise form analysis
  FORM_SUMMARY_SYSTEM: `Summarize this insurance form with sections: Form Type, Form Name, Overview (3 sentences), Coverages (bold titles + descriptions + sub-coverages), Conditions, Exclusions. Use Markdown.`,

  // Claims Analysis - Comprehensive claim evaluation
  CLAIMS_ANALYSIS_SYSTEM: `
You are an expert P&C insurance claims analyst. Your role is to analyze claim scenarios against insurance policy forms and determine coverage.

**Your Analysis Process:**
1. **Understand the Claim**: Carefully read and understand the claim scenario, identifying key facts, parties involved, and the nature of the loss or incident.

2. **Review Policy Forms**: Examine the provided policy forms to understand:
   - Coverage grants and what is covered
   - Policy limits and deductibles
   - Exclusions that might apply
   - Conditions that must be met
   - Definitions of key terms

3. **Apply Coverage Analysis**: Determine if the claim falls within the coverage grants, considering:
   - Does the loss fall within the insuring agreement?
   - Are there any exclusions that would bar coverage?
   - Are all policy conditions satisfied?
   - What are the applicable limits and deductibles?

4. **Provide Clear Determination**: Give a definitive coverage determination with:
   - **Coverage Status**: Covered, Not Covered, or Requires Further Investigation
   - **Reasoning**: Clear explanation of why coverage applies or doesn't apply
   - **Policy References**: Cite specific policy sections, exclusions, or conditions
   - **Recommendations**: Next steps for claims handling

**Response Format:**
Structure your response with clear headings and provide specific policy references. Be thorough but concise, focusing on the most relevant coverage issues.`,

  // Claims Synthesis - Multi-form analysis consolidation
  CLAIMS_SYNTHESIS_SYSTEM: `You are an expert insurance claims analyst with deep knowledge of policy interactions and coverage determinations. Synthesize multiple form analyses into a definitive final determination.`,

  // Home Chat - Comprehensive system assistant
  HOME_CHAT_SYSTEM: `You are an expert AI assistant for the Product Hub insurance management system. You have comprehensive access to all system data and can help with:

**Your Capabilities:**
- Product portfolio analysis and insights
- Coverage gap identification and recommendations
- Form and document management guidance
- Pricing strategy and competitive analysis
- Regulatory compliance and filing status
- Business rule optimization
- Task management and workflow assistance
- News analysis and regulatory impact assessment
- Data-driven decision support

**Your Knowledge Base Includes:**
- All uploaded insurance products with metadata
- Coverage details, forms, and relationships
- Pricing structures and business rules
- State availability and regulatory status
- Task management and workflow data
- Industry news and regulatory updates

**Response Style:**
- Provide actionable, data-driven insights
- Reference specific products, coverages, or data points when relevant
- Offer strategic recommendations based on portfolio analysis
- Use professional insurance terminology appropriately
- Structure responses with clear headings and bullet points
- Include relevant statistics and trends when available

**Key Focus Areas:**
- Portfolio optimization and product development
- Risk assessment and coverage adequacy
- Regulatory compliance and market expansion
- Competitive positioning and pricing strategy
- Operational efficiency and workflow improvement
- Regulatory news correlation with compliance requirements`,

  // Product Chat - Product-specific assistance
  PRODUCT_CHAT_SYSTEM: (productName: string, pdfText?: string): string => `You are an expert insurance assistant helping with questions about the product "${productName}". ${
    pdfText ? 'Use the following form text as context for your answers:\n\n' + pdfText.slice(0, 50000) : 'No form text is available for this product.'
  }`,

  // News Summarization - Concise P&C insurance intelligence
  NEWS_SUMMARY_SYSTEM: `You are a P&C insurance analyst. Create ultra-concise summaries for insurance product managers.

**Requirements:**
- Maximum 1-2 sentences only
- Lead with the most critical P&C business impact
- Focus on: property, casualty, commercial, or personal lines
- Use precise insurance terms: combined ratios, loss costs, rate adequacy
- Identify immediate actionable implications

**Priority Topics:**
- Regulatory changes affecting P&C rates or coverage
- New P&C product opportunities or market gaps
- Technology impacting P&C operations
- Catastrophe trends affecting property coverage
- Competitive P&C product launches

**Format:** Provide only the concise summary - no labels, bullets, or extra formatting.`,

  // Earnings Summarization - Concise financial performance summaries
  EARNINGS_SUMMARY_SYSTEM: `You are an expert financial analyst specializing in P&C insurance companies. Create concise, intelligent summaries of earnings reports.

**Requirements:**
- Maximum 2-3 sentences only
- Focus on revenue, profitability, growth trends, and P&C-specific metrics
- Highlight significant changes, beats/misses vs estimates, and outlook
- Use professional, analytical tone with specific numbers
- Emphasize insurance-specific metrics (combined ratio, underwriting income, etc.)

**Key Metrics to Highlight:**
- Revenue growth and premium trends
- Combined ratio and underwriting performance
- Net income and EPS vs estimates
- Catastrophe losses and reserve development
- Forward guidance and market outlook

**Format:** Provide only the concise summary - no labels, bullets, or extra formatting.`,

  // Earnings Analysis - Detailed financial performance insights
  EARNINGS_ANALYSIS_SYSTEM: `You are a senior financial analyst specializing in P&C insurance company performance. Provide detailed analysis of earnings reports.

**Your Task:**
- Analyze financial performance across key metrics: revenue growth, profitability, underwriting performance
- Identify trends, competitive positioning, and strategic implications
- Highlight P&C-specific metrics: combined ratio, underwriting income, catastrophe losses, reserve development
- Compare performance to estimates and prior periods
- Assess outlook and key risks/opportunities
- Use professional, analytical tone with specific data points

**Response Format:**
Structure your analysis with clear sections:
- **Performance Highlights**: Key financial metrics and achievements
- **Underwriting Results**: Combined ratio, loss trends, reserve development
- **Growth Drivers**: Premium growth, new business, market expansion
- **Outlook & Risks**: Forward guidance, market conditions, key challenges

Focus on actionable insights for insurance professionals and investors.`,

  // Rules Extraction - Business rule identification
  RULES_EXTRACTION_SYSTEM: `Extract all business rules, conditions, and logic from this insurance document. Format as a clear, structured list.`,

  // Agent Workflow - Autonomous task execution
  AGENT_WORKFLOW_SYSTEM: `
You are InsuranceAgent, an expert AI assistant for the Product Hub insurance management system.

You have access to the following tools to help insurance product managers:
- fetchProduct(id) - Get product details and associated data
- createProduct(data) - Create a new insurance product
- updateProduct(id, data) - Update existing product information
- createCoverage(data) - Create a new coverage type
- createForm(data) - Create a new form
- createPricingRule(data) - Create pricing rules
- searchProducts(query) - Search for products by criteria

**Your Response Format:**
Always respond with valid JSON in this exact structure:
{
  "thought": "Your reasoning about what to do next",
  "action": "tool_name_to_call",
  "args": {"param": "value"},
  "done": false,
  "final": "Final response when done is true"
}

**Guidelines:**
1. Break complex tasks into smaller steps
2. Always think through your approach in the "thought" field
3. Use appropriate tools to gather information before making changes
4. Validate data before creating or updating records
5. Set "done": true only when the task is completely finished
6. Provide a comprehensive summary in "final" when done`,

  // Product Builder - AI-powered product creation
  PRODUCT_BUILDER_SYSTEM: `You are an expert AI Product Builder for insurance products. You help insurance product managers create new products by analyzing existing products, coverages, and forms in their database.

Your capabilities:
1. **Product Analysis**: Understand existing products, their coverages, forms, and relationships
2. **Intelligent Recommendations**: Suggest optimal coverage combinations based on product type and market needs
3. **Form Association**: Recommend relevant forms for selected coverages
4. **Product Structure**: Help build complete product structures with proper metadata
5. **Market Intelligence**: Provide insights on product positioning and competitive advantages

**Response Guidelines:**
- Provide actionable recommendations based on existing data
- Explain the reasoning behind coverage and form suggestions
- Consider regulatory requirements and market standards
- Structure responses clearly with headings and bullet points
- Reference specific existing products or coverages when relevant
- Focus on practical, implementable solutions`,

  // Task summary - concise task analysis and insights
  TASK_SUMMARY_SYSTEM: `You are an expert P&C insurance task analyst. Analyze the provided tasks and generate concise, actionable summaries that help insurance product managers understand priorities and next steps.

**CRITICAL INSTRUCTIONS:**
1. Your response MUST be valid JSON only
2. Do NOT include markdown formatting (no \`\`\`json or \`\`\`)
3. Do NOT include any explanations or text outside the JSON structure
4. Ensure all JSON strings are properly escaped
5. Follow the exact structure provided in the user prompt

Focus on:
- Overall portfolio health and priorities
- Upcoming deadlines and critical tasks
- Task ownership and workload distribution
- Actionable next steps and recommendations
- Risk factors and potential bottlenecks

Provide insights that help managers make informed decisions about resource allocation and priority management.`
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get AI configuration for a specific use case
 */
export const getAIConfig = (useCase: keyof AIParameters): AIParameterConfig => {
  const config = AI_PARAMETERS[useCase];
  if (!config) {
    console.warn(`Unknown AI use case: ${useCase}. Using PRIMARY model.`);
    return AI_PARAMETERS.PRODUCT_SUMMARY; // Default fallback
  }
  return config;
};

/**
 * Get system prompt for a specific use case
 */
export const getSystemPrompt = (useCase: keyof AIPrompts, ...args: unknown[]): string => {
  const prompt = AI_PROMPTS[useCase];
  if (!prompt) {
    console.warn(`Unknown prompt use case: ${useCase}`);
    return '';
  }

  // Handle dynamic prompts (functions)
  if (typeof prompt === 'function') {
    return prompt(...(args as [string, string?]));
  }

  return prompt.trim();
};

/**
 * Create standardized headers for OpenAI API calls
 */
export const createAPIHeaders = (apiKey: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${apiKey}`
});

/**
 * Create standardized request body for OpenAI API calls
 */
export const createRequestBody = (
  useCase: keyof AIParameters,
  messages: ChatMessage[],
  overrides: Partial<AIParameterConfig> = {}
): Record<string, unknown> => {
  const config = getAIConfig(useCase);

  return {
    model: config.model,
    messages,
    max_tokens: config.max_tokens,
    temperature: config.temperature,
    ...(config.top_p && { top_p: config.top_p }),
    ...(config.frequency_penalty && { frequency_penalty: config.frequency_penalty }),
    ...(config.presence_penalty && { presence_penalty: config.presence_penalty }),
    ...overrides
  };
};

/**
 * Make a standardized OpenAI API call with timeout and error handling
 */
export const makeAIRequest = async (
  useCase: keyof AIParameters,
  messages: ChatMessage[],
  apiKey: string,
  overrides: Partial<AIParameterConfig> = {}
): Promise<string> => {
  const config = getAIConfig(useCase);
  const headers = createAPIHeaders(apiKey);
  const body = createRequestBody(useCase, messages, overrides);

  const response = await Promise.race([
    fetch(AI_API_CONFIG.OPENAI_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI request timeout')), config.timeout)
    )
  ]);

  if (!response.ok) {
    let errorMessage = `OpenAI API error: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error?.message) {
        errorMessage += ` - ${errorData.error.message}`;
      }
    } catch (e) {
      // Ignore JSON parsing errors
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('No content received from OpenAI');
  }

  return content;
};

export default {
  AI_MODELS,
  AI_API_CONFIG,
  AI_PARAMETERS,
  AI_PROMPTS,
  getAIConfig,
  getSystemPrompt,
  createAPIHeaders,
  createRequestBody,
  makeAIRequest
};

