/**
 * AI Prompt Optimizer Service
 * 
 * Optimizes prompts for cost-efficiency, performance, and response quality.
 * Implements intelligent context compression, token optimization, and
 * query classification for efficient AI operations.
 */

import logger, { LOG_CATEGORIES } from '../utils/logger';

export type QueryType =
  | 'product_analysis'
  | 'coverage_analysis'
  | 'pricing_analysis'
  | 'compliance_check'
  | 'task_management'
  | 'strategic_insight'
  | 'data_query'
  | 'general';

interface ContextSummary {
  statistics: Record<string, any>;
  sampleData: Record<string, any>;
  timestamp: number;
}

interface OptimizedPrompt {
  system: string;
  context: string;
  instructions: string;
  estimatedTokens: number;
  queryType: QueryType;
}

class AIPromptOptimizer {
  private readonly MAX_CONTEXT_TOKENS = 2000;
  private readonly MAX_INSTRUCTIONS_TOKENS = 1500;
  private readonly TOKENS_PER_WORD = 1.3;

  /**
   * Classify query into specific type for optimized handling
   */
  classifyQuery(query: string): QueryType {
    const lowerQuery = query.toLowerCase();

    // Product analysis queries
    if (lowerQuery.match(/product|portfolio|offering|line|compare|which product/i)) {
      return 'product_analysis';
    }

    // Coverage analysis queries
    if (lowerQuery.match(/coverage|benefit|limit|deductible|exclusion|covered|protection/i)) {
      return 'coverage_analysis';
    }

    // Pricing analysis queries
    if (lowerQuery.match(/price|rate|cost|premium|pricing|fee|charge|profitable/i)) {
      return 'pricing_analysis';
    }

    // Compliance queries
    if (lowerQuery.match(/compliance|regulation|requirement|filing|approval|state|legal|rule/i)) {
      return 'compliance_check';
    }

    // Task management queries
    if (lowerQuery.match(/task|project|deadline|milestone|progress|team|status/i)) {
      return 'task_management';
    }

    // Strategic queries
    if (lowerQuery.match(/strateg(y|ic)|opportunit(y|ies)|recommend|suggest|improve|optimize/i)) {
      return 'strategic_insight';
    }

    // Data queries
    if (lowerQuery.match(/how many|count|list|show|what are|which|total|number/i)) {
      return 'data_query';
    }

    return 'general';
  }

  /**
   * Compress context data to fit within token limits
   */
  compressContext(contextSummary: ContextSummary): string {
    const { statistics, sampleData } = contextSummary;

    // Build compressed context with only essential data
    const compressed = {
      stats: {
        products: statistics.products?.total || 0,
        coverages: statistics.coverages?.total || 0,
        forms: statistics.forms?.total || 0,
        tasks: statistics.tasks?.total || 0,
      },
      samples: sampleData,
      timestamp: contextSummary.timestamp
    };

    return JSON.stringify(compressed);
  }

  /**
   * Estimate tokens for a string
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.split(/\s+/).length * this.TOKENS_PER_WORD);
  }

  /**
   * Build optimized system prompt
   */
  buildSystemPrompt(queryType: QueryType): string {
    const basePrompt = `You are an elite AI assistant for P&C insurance product management.
Your expertise: Product Management, Business Intelligence, Regulatory Compliance, Strategic Consulting, Data Science.
Respond with actionable, data-driven insights. Be concise and structured.`;

    const typeSpecificPrompts: Record<QueryType, string> = {
      product_analysis: `${basePrompt}
Focus: Product positioning, market coverage, competitive analysis, form completeness.
Format: Use bullet points and comparisons. Highlight strengths and opportunities.`,

      coverage_analysis: `${basePrompt}
Focus: Coverage hierarchy, limits, deductibles, gaps, competitive positioning.
Format: Organize by coverage type. Include specific recommendations.`,

      pricing_analysis: `${basePrompt}
Focus: Rate structure, profitability, competitive positioning, optimization opportunities.
Format: Present data-driven insights. Include specific rate recommendations.`,

      compliance_check: `${basePrompt}
Focus: Regulatory requirements, filing status, compliance gaps, deadline tracking.
Format: Organize by state/jurisdiction. Flag critical issues.`,

      task_management: `${basePrompt}
Focus: Task status, bottlenecks, timeline risks, resource allocation, priorities.
Format: Use priority levels. Highlight critical path items.`,

      strategic_insight: `${basePrompt}
Focus: Portfolio optimization, market opportunities, competitive threats, innovation priorities.
Format: Synthesize across domains. Provide strategic recommendations.`,

      data_query: `${basePrompt}
Focus: Accurate data retrieval, clear formatting, contextual interpretation.
Format: Use tables/lists. Provide data quality notes.`,

      general: `${basePrompt}
Focus: Comprehensive, helpful responses across all domains.
Format: Adapt to user needs. Suggest related topics.`
    };

    return typeSpecificPrompts[queryType];
  }

  /**
   * Build optimized context string
   */
  buildOptimizedContext(contextSummary: ContextSummary, queryType: QueryType): string {
    const compressed = this.compressContext(contextSummary);
    const tokens = this.estimateTokens(compressed);

    if (tokens > this.MAX_CONTEXT_TOKENS) {
      logger.warn(LOG_CATEGORIES.AI, 'Context exceeds token limit', {
        tokens,
        limit: this.MAX_CONTEXT_TOKENS,
        queryType
      });
    }

    return `SYSTEM STATE:\n${compressed}`;
  }

  /**
   * Build query-specific instructions
   */
  buildInstructions(queryType: QueryType, query: string): string {
    const baseInstructions = `Query: "${query}"
Classification: ${queryType.replace('_', ' ').toUpperCase()}

RESPONSE GUIDELINES:
1. Be concise and actionable
2. Use data from the system state
3. Provide specific recommendations
4. Structure with clear headings
5. Include relevant metrics or examples`;

    return baseInstructions;
  }

  /**
   * Build complete optimized prompt
   */
  buildOptimizedPrompt(
    query: string,
    contextSummary: ContextSummary
  ): OptimizedPrompt {
    const queryType = this.classifyQuery(query);
    const systemPrompt = this.buildSystemPrompt(queryType);
    const context = this.buildOptimizedContext(contextSummary, queryType);
    const instructions = this.buildInstructions(queryType, query);

    const estimatedTokens =
      this.estimateTokens(systemPrompt) +
      this.estimateTokens(context) +
      this.estimateTokens(instructions);

    logger.debug(LOG_CATEGORIES.AI, 'Optimized prompt built', {
      queryType,
      estimatedTokens,
      queryLength: query.length
    });

    return {
      system: systemPrompt,
      context,
      instructions,
      estimatedTokens,
      queryType
    };
  }

  /**
   * Format prompt for API call
   */
  formatForAPI(optimizedPrompt: OptimizedPrompt): string {
    return `${optimizedPrompt.system}

${optimizedPrompt.context}

${optimizedPrompt.instructions}`;
  }
}

export const aiPromptOptimizer = new AIPromptOptimizer();
export default aiPromptOptimizer;

