/**
 * AI Prompt Optimizer Service
 *
 * OPTIMIZED VERSION - Enhanced for P&C Insurance:
 * - Intelligent model selection based on query complexity
 * - Token budget management with dynamic allocation
 * - Prompt compression for cost efficiency
 * - Insurance-specific query classification
 * - Response quality optimization
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
  | 'claims_analysis'
  | 'form_analysis'
  | 'general';

// Model selection configuration
export type ModelTier = 'fast' | 'balanced' | 'quality';

export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}

const MODEL_CONFIGS: Record<ModelTier, ModelConfig> = {
  fast: {
    model: 'gpt-4o-mini',
    maxTokens: 1000,
    temperature: 0.3,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006
  },
  balanced: {
    model: 'gpt-4o-mini',
    maxTokens: 2000,
    temperature: 0.4,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006
  },
  quality: {
    model: 'gpt-4o',
    maxTokens: 4000,
    temperature: 0.5,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015
  }
};

// Query complexity indicators
interface QueryComplexity {
  tier: ModelTier;
  reasoning: string;
  estimatedResponseTokens: number;
}

interface ContextSummary {
  statistics: Record<string, any>;
  sampleData: Record<string, any>;
  fullData?: Record<string, any>;
  timestamp: number | string;
}

interface OptimizedPrompt {
  system: string;
  context: string;
  instructions: string;
  estimatedTokens: number;
  queryType: QueryType;
  modelConfig: ModelConfig;
  complexity: QueryComplexity;
}

// Token budget configuration
const TOKEN_BUDGETS = {
  system: 800,
  context: {
    fast: 4000,
    balanced: 8000,
    quality: 16000
  },
  instructions: 500,
  response: {
    fast: 1000,
    balanced: 2000,
    quality: 4000
  }
};

class AIPromptOptimizer {
  private readonly MAX_CONTEXT_TOKENS = 16000;
  private readonly MAX_INSTRUCTIONS_TOKENS = 1500;
  private readonly TOKENS_PER_CHAR = 0.25; // More accurate: ~4 chars per token

  /**
   * Classify query into specific type for optimized handling
   * ENHANCED: Added claims and form analysis types
   */
  classifyQuery(query: string): QueryType {
    const lowerQuery = query.toLowerCase();

    // Claims analysis queries (new)
    if (lowerQuery.match(/claim|loss|incident|occurrence|damage|injury|liability/i)) {
      return 'claims_analysis';
    }

    // Form analysis queries (new)
    if (lowerQuery.match(/form|endorsement|policy\s+form|iso\s+form|manuscript/i)) {
      return 'form_analysis';
    }

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
   * Analyze query complexity to determine optimal model tier
   * OPTIMIZED: Intelligent model selection based on query characteristics
   */
  analyzeComplexity(query: string, queryType: QueryType): QueryComplexity {
    const lowerQuery = query.toLowerCase();
    const wordCount = query.split(/\s+/).length;

    // Complexity indicators
    const complexityFactors = {
      // High complexity indicators
      isComparative: /compare|versus|vs|difference|better|worse/i.test(lowerQuery),
      isStrategic: queryType === 'strategic_insight',
      isMultiPart: /and|also|additionally|furthermore/i.test(lowerQuery),
      requiresAnalysis: /analyze|evaluate|assess|review|examine/i.test(lowerQuery),
      isLongQuery: wordCount > 30,

      // Medium complexity indicators
      requiresExplanation: /explain|why|how|describe/i.test(lowerQuery),
      requiresList: /list|show|what are|which/i.test(lowerQuery),

      // Low complexity indicators
      isSimpleCount: /how many|count|total|number of/i.test(lowerQuery),
      isLookup: /what is|find|get|show me/i.test(lowerQuery) && wordCount < 10
    };

    // Calculate complexity score
    let score = 0;
    if (complexityFactors.isComparative) score += 3;
    if (complexityFactors.isStrategic) score += 3;
    if (complexityFactors.isMultiPart) score += 2;
    if (complexityFactors.requiresAnalysis) score += 2;
    if (complexityFactors.isLongQuery) score += 1;
    if (complexityFactors.requiresExplanation) score += 1;
    if (complexityFactors.requiresList) score += 1;
    if (complexityFactors.isSimpleCount) score -= 2;
    if (complexityFactors.isLookup) score -= 2;

    // Determine tier based on score
    let tier: ModelTier;
    let reasoning: string;
    let estimatedResponseTokens: number;

    if (score >= 5) {
      tier = 'quality';
      reasoning = 'Complex query requiring deep analysis or comparison';
      estimatedResponseTokens = 2000;
    } else if (score >= 2) {
      tier = 'balanced';
      reasoning = 'Moderate complexity query with explanation needs';
      estimatedResponseTokens = 1000;
    } else {
      tier = 'fast';
      reasoning = 'Simple lookup or count query';
      estimatedResponseTokens = 500;
    }

    logger.debug(LOG_CATEGORIES.AI, 'Query complexity analyzed', {
      queryType,
      score,
      tier,
      factors: complexityFactors
    });

    return { tier, reasoning, estimatedResponseTokens };
  }

  /**
   * Get model configuration for a given tier
   */
  getModelConfig(tier: ModelTier): ModelConfig {
    return MODEL_CONFIGS[tier];
  }

  /**
   * Build comprehensive context with full data
   * OPTIMIZED: Token-aware compression with priority-based inclusion
   */
  compressContext(contextSummary: ContextSummary, tokenBudget?: number): string {
    const { statistics, fullData } = contextSummary;
    const budget = tokenBudget || TOKEN_BUDGETS.context.balanced;

    if (!fullData) {
      return `Statistics: Products: ${statistics.products?.total || 0}, Coverages: ${statistics.coverages?.total || 0}, Forms: ${statistics.forms?.total || 0}, Tasks: ${statistics.tasks?.total || 0}`;
    }

    const contextParts: string[] = [];
    let currentTokens = 0;

    // Helper to add section if within budget
    const addSection = (title: string, items: any[], formatter: (item: any, i: number) => string): boolean => {
      if (!items?.length) return true;

      const sectionHeader = `\n=== ${title} ===`;
      const formattedItems = items.map((item, i) => formatter(item, i));
      const sectionContent = [sectionHeader, ...formattedItems].join('\n');
      const sectionTokens = this.estimateTokens(sectionContent);

      if (currentTokens + sectionTokens <= budget) {
        contextParts.push(sectionContent);
        currentTokens += sectionTokens;
        return true;
      }

      // Try to include partial section
      const partialItems: string[] = [sectionHeader];
      let partialTokens = this.estimateTokens(sectionHeader);

      for (const item of formattedItems) {
        const itemTokens = this.estimateTokens(item);
        if (currentTokens + partialTokens + itemTokens <= budget) {
          partialItems.push(item);
          partialTokens += itemTokens;
        } else {
          break;
        }
      }

      if (partialItems.length > 1) {
        partialItems.push(`... and ${items.length - partialItems.length + 1} more`);
        contextParts.push(partialItems.join('\n'));
        currentTokens += partialTokens;
      }

      return false;
    };

    // Priority order: Products > Coverages > Forms > Rules > Tasks > Pricing > Data Dictionary
    addSection('PRODUCTS', fullData.products, (p, i) => {
      let line = `${i + 1}. ${p.name || 'Unnamed'} (${p.productCode || 'N/A'})`;
      if (p.availableStates?.length) line += ` [${p.availableStates.slice(0, 5).join(', ')}${p.availableStates.length > 5 ? '...' : ''}]`;
      return line;
    });

    addSection('COVERAGES', fullData.coverages, (c, i) => {
      const name = c.coverageName || c.name || 'Unnamed';
      const code = c.coverageCode || c.code || 'N/A';
      let line = `${i + 1}. ${name} (${code})`;
      if (c.category) line += ` [${c.category}]`;
      return line;
    });

    addSection('FORMS', fullData.forms, (f, i) => {
      const name = f.formName || f.name || 'Unnamed';
      const number = f.formNumber || 'N/A';
      return `${i + 1}. ${name} (${number})`;
    });

    addSection('RULES', fullData.rules, (r, i) => {
      const name = r.ruleName || r.name || 'Unnamed';
      return `${i + 1}. ${name}${r.category ? ` [${r.category}]` : ''}`;
    });

    addSection('TASKS', fullData.tasks, (t, i) => {
      return `${i + 1}. ${t.title || 'Unnamed'} [${t.status || 'unknown'}]${t.priority ? ` P:${t.priority}` : ''}`;
    });

    addSection('PRICING', fullData.pricingSteps, (p, i) => {
      return `${i + 1}. ${p.stepName || p.name || 'Step'} (${p.stepType || 'N/A'})`;
    });

    // Summary always included
    contextParts.push(`\n=== TOTALS ===`);
    contextParts.push(`Products: ${fullData.products?.length || 0} | Coverages: ${fullData.coverages?.length || 0} | Forms: ${fullData.forms?.length || 0} | Rules: ${fullData.rules?.length || 0} | Tasks: ${fullData.tasks?.length || 0}`);

    return contextParts.join('\n');
  }

  /**
   * Compress text by removing redundant whitespace and shortening
   */
  compressText(text: string, maxLength?: number): string {
    // Remove extra whitespace
    let compressed = text.replace(/\s+/g, ' ').trim();

    // Remove common filler words if needed
    if (maxLength && compressed.length > maxLength) {
      compressed = compressed
        .replace(/\b(the|a|an|is|are|was|were|be|been|being)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Truncate if still too long
    if (maxLength && compressed.length > maxLength) {
      compressed = compressed.substring(0, maxLength - 3) + '...';
    }

    return compressed;
  }

  /**
   * Estimate tokens for a string (improved accuracy)
   */
  estimateTokens(text: string): number {
    // More accurate: ~4 characters per token for English
    return Math.ceil(text.length * this.TOKENS_PER_CHAR);
  }

  /**
   * Calculate estimated cost for a prompt
   */
  estimateCost(inputTokens: number, outputTokens: number, tier: ModelTier): number {
    const config = MODEL_CONFIGS[tier];
    return (inputTokens / 1000 * config.costPer1kInput) + (outputTokens / 1000 * config.costPer1kOutput);
  }

  /**
   * Build optimized system prompt with professional formatting instructions
   * OPTIMIZED: Compressed prompts, added new query types
   */
  buildSystemPrompt(queryType: QueryType, tier: ModelTier = 'balanced'): string {
    // Shorter base prompt for cost efficiency
    const basePrompt = `You are a P&C insurance product management AI assistant.

FORMAT: Use markdown (bold, bullets, tables). Be concise. Start with direct answer.
DATA: Reference the system data below. Use exact names/codes. Never say "I don't have access."`;

    const typeSpecificPrompts: Record<QueryType, string> = {
      product_analysis: `${basePrompt}
FOCUS: Products - list with codes, compare in tables, show state coverage.`,

      coverage_analysis: `${basePrompt}
FOCUS: Coverages - names/codes, group related, include limits/deductibles.`,

      pricing_analysis: `${basePrompt}
FOCUS: Pricing - explain steps, compare rates in tables, highlight factors.`,

      compliance_check: `${basePrompt}
FOCUS: Compliance - list rules/requirements, explain implications.`,

      task_management: `${basePrompt}
FOCUS: Tasks - organize by status/priority, show due dates. Use ✓/⏳ indicators.`,

      strategic_insight: `${basePrompt}
FOCUS: Strategy - synthesize patterns, provide recommendations with data support.`,

      data_query: `${basePrompt}
FOCUS: Data - precise counts/names, format lists/tables for scanning.`,

      claims_analysis: `${basePrompt}
FOCUS: Claims - analyze coverage applicability, identify exclusions, assess liability.`,

      form_analysis: `${basePrompt}
FOCUS: Forms - explain form purpose, coverage modifications, endorsement effects.`,

      general: `${basePrompt}
FOCUS: General - answer helpfully, reference relevant data.`
    };

    return typeSpecificPrompts[queryType];
  }

  /**
   * Build optimized context string with token budget awareness
   */
  buildOptimizedContext(contextSummary: ContextSummary, queryType: QueryType, tier: ModelTier = 'balanced'): string {
    const tokenBudget = TOKEN_BUDGETS.context[tier];
    const compressed = this.compressContext(contextSummary, tokenBudget);
    const tokens = this.estimateTokens(compressed);

    if (tokens > this.MAX_CONTEXT_TOKENS) {
      logger.warn(LOG_CATEGORIES.AI, 'Context exceeds token limit, truncating', {
        tokens,
        limit: this.MAX_CONTEXT_TOKENS,
        queryType
      });
    }

    // Simplified header for token efficiency
    return `=== SYSTEM DATA ===
${compressed}
=== END DATA ===`;
  }

  /**
   * Build query-specific instructions with formatting guidance
   * OPTIMIZED: Shorter instructions for token efficiency
   */
  buildInstructions(queryType: QueryType, query: string, tier: ModelTier = 'balanced'): string {
    // Shorter instructions for fast tier
    if (tier === 'fast') {
      return `Q: "${query}"
Answer directly using the data above. Use markdown formatting.`;
    }

    return `QUESTION: "${query}"

GUIDELINES:
- Direct answer first, then details
- Use data above (exact names/codes)
- Format: bullets, **bold**, tables
- Be concise but complete`;
  }

  /**
   * Build complete optimized prompt with intelligent model selection
   * OPTIMIZED: Includes complexity analysis and cost estimation
   */
  buildOptimizedPrompt(
    query: string,
    contextSummary: ContextSummary,
    forceTier?: ModelTier
  ): OptimizedPrompt {
    const queryType = this.classifyQuery(query);
    const complexity = this.analyzeComplexity(query, queryType);
    const tier = forceTier || complexity.tier;
    const modelConfig = this.getModelConfig(tier);

    const systemPrompt = this.buildSystemPrompt(queryType, tier);
    const context = this.buildOptimizedContext(contextSummary, queryType, tier);
    const instructions = this.buildInstructions(queryType, query, tier);

    const estimatedInputTokens =
      this.estimateTokens(systemPrompt) +
      this.estimateTokens(context) +
      this.estimateTokens(instructions);

    const estimatedCost = this.estimateCost(
      estimatedInputTokens,
      complexity.estimatedResponseTokens,
      tier
    );

    logger.debug(LOG_CATEGORIES.AI, 'Optimized prompt built', {
      queryType,
      tier,
      estimatedInputTokens,
      estimatedResponseTokens: complexity.estimatedResponseTokens,
      estimatedCost: `$${estimatedCost.toFixed(6)}`,
      model: modelConfig.model
    });

    return {
      system: systemPrompt,
      context,
      instructions,
      estimatedTokens: estimatedInputTokens,
      queryType,
      modelConfig,
      complexity
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

  /**
   * Get recommended model configuration for a query
   */
  getRecommendedModel(query: string): ModelConfig {
    const queryType = this.classifyQuery(query);
    const complexity = this.analyzeComplexity(query, queryType);
    return this.getModelConfig(complexity.tier);
  }
}

export const aiPromptOptimizer = new AIPromptOptimizer();
export default aiPromptOptimizer;

// Export types and configs for external use
export { MODEL_CONFIGS, TOKEN_BUDGETS };

