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
  fullData?: Record<string, any>;
  timestamp: number | string;
}

interface OptimizedPrompt {
  system: string;
  context: string;
  instructions: string;
  estimatedTokens: number;
  queryType: QueryType;
}

class AIPromptOptimizer {
  private readonly MAX_CONTEXT_TOKENS = 12000; // Increased for full data
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
   * Build comprehensive context with full data
   */
  compressContext(contextSummary: ContextSummary): string {
    const { statistics, sampleData, fullData } = contextSummary;

    // If we have full data, format it comprehensively
    if (fullData) {
      const contextParts: string[] = [];

      // Products section
      if (fullData.products?.length > 0) {
        contextParts.push('=== PRODUCTS ===');
        fullData.products.forEach((p: any, i: number) => {
          contextParts.push(`${i + 1}. ${p.name || 'Unnamed'} (Code: ${p.productCode || 'N/A'})`);
          if (p.description) contextParts.push(`   Description: ${p.description}`);
          if (p.availableStates?.length) contextParts.push(`   States: ${p.availableStates.join(', ')}`);
          if (p.category) contextParts.push(`   Category: ${p.category}`);
        });
      }

      // Coverages section - FULL DATA
      if (fullData.coverages?.length > 0) {
        contextParts.push('\n=== COVERAGES ===');
        fullData.coverages.forEach((c: any, i: number) => {
          const name = c.coverageName || c.name || 'Unnamed Coverage';
          const code = c.coverageCode || c.code || 'N/A';
          contextParts.push(`${i + 1}. ${name} (Code: ${code})`);
          if (c.description) contextParts.push(`   Description: ${c.description}`);
          if (c.category) contextParts.push(`   Category: ${c.category}`);
          if (c.parentCoverage) contextParts.push(`   Parent: ${c.parentCoverage}`);
          if (c.limits) contextParts.push(`   Limits: ${JSON.stringify(c.limits)}`);
          if (c.deductibles) contextParts.push(`   Deductibles: ${JSON.stringify(c.deductibles)}`);
        });
      }

      // Forms section
      if (fullData.forms?.length > 0) {
        contextParts.push('\n=== FORMS ===');
        fullData.forms.forEach((f: any, i: number) => {
          const name = f.formName || f.name || 'Unnamed Form';
          const number = f.formNumber || 'N/A';
          contextParts.push(`${i + 1}. ${name} (Number: ${number})`);
          if (f.description) contextParts.push(`   Description: ${f.description}`);
          if (f.category) contextParts.push(`   Category: ${f.category}`);
        });
      }

      // Rules section
      if (fullData.rules?.length > 0) {
        contextParts.push('\n=== RULES ===');
        fullData.rules.forEach((r: any, i: number) => {
          const name = r.ruleName || r.name || 'Unnamed Rule';
          contextParts.push(`${i + 1}. ${name}`);
          if (r.description) contextParts.push(`   Description: ${r.description}`);
          if (r.category) contextParts.push(`   Category: ${r.category}`);
        });
      }

      // Tasks section
      if (fullData.tasks?.length > 0) {
        contextParts.push('\n=== TASKS ===');
        fullData.tasks.forEach((t: any, i: number) => {
          contextParts.push(`${i + 1}. ${t.title || 'Unnamed Task'} [${t.status || 'unknown'}]`);
          if (t.description) contextParts.push(`   Description: ${t.description}`);
          if (t.priority) contextParts.push(`   Priority: ${t.priority}`);
          if (t.phase) contextParts.push(`   Phase: ${t.phase}`);
          if (t.dueDate) contextParts.push(`   Due: ${t.dueDate}`);
        });
      }

      // Pricing section
      if (fullData.pricingSteps?.length > 0) {
        contextParts.push('\n=== PRICING STEPS ===');
        fullData.pricingSteps.forEach((p: any, i: number) => {
          contextParts.push(`${i + 1}. ${p.stepName || p.name || 'Step'} (Type: ${p.stepType || 'N/A'})`);
          if (p.description) contextParts.push(`   Description: ${p.description}`);
        });
      }

      // Data Dictionary section
      if (fullData.dataDictionary?.length > 0) {
        contextParts.push('\n=== DATA DICTIONARY ===');
        fullData.dataDictionary.slice(0, 50).forEach((d: any, i: number) => {
          contextParts.push(`${i + 1}. ${d.fieldName || d.name || 'Field'}: ${d.description || d.definition || 'N/A'}`);
        });
        if (fullData.dataDictionary.length > 50) {
          contextParts.push(`   ... and ${fullData.dataDictionary.length - 50} more fields`);
        }
      }

      contextParts.push(`\n=== SUMMARY ===`);
      contextParts.push(`Total Products: ${fullData.products?.length || 0}`);
      contextParts.push(`Total Coverages: ${fullData.coverages?.length || 0}`);
      contextParts.push(`Total Forms: ${fullData.forms?.length || 0}`);
      contextParts.push(`Total Rules: ${fullData.rules?.length || 0}`);
      contextParts.push(`Total Tasks: ${fullData.tasks?.length || 0}`);

      return contextParts.join('\n');
    }

    // Fallback to statistics-only if no full data
    return `Statistics: Products: ${statistics.products?.total || 0}, Coverages: ${statistics.coverages?.total || 0}, Forms: ${statistics.forms?.total || 0}, Tasks: ${statistics.tasks?.total || 0}`;
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
    const basePrompt = `You are an expert AI assistant for a P&C insurance product management system.

CRITICAL INSTRUCTIONS:
1. The DATA PROVIDED BELOW contains the ACTUAL data from the user's system
2. ALWAYS use this data to answer questions - do not say "I don't have access" or "no data available"
3. When asked about coverages, products, forms, rules, or tasks - REFER TO THE DATA BELOW
4. Be concise, accurate, and helpful
5. If the data shows items, list them clearly
6. If asked "what coverages do I have" - list ALL coverages from the data`;

    const typeSpecificPrompts: Record<QueryType, string> = {
      product_analysis: `${basePrompt}

QUERY TYPE: Product Analysis
Focus on product details, market coverage, and form completeness.
List specific products and their attributes from the data.`,

      coverage_analysis: `${basePrompt}

QUERY TYPE: Coverage Analysis
Focus on listing and explaining coverages from the provided data.
Include coverage names, codes, categories, and descriptions.
If asked "what coverages", list ALL coverages in the data.`,

      pricing_analysis: `${basePrompt}

QUERY TYPE: Pricing Analysis
Focus on pricing steps, rate structures, and cost factors from the data.`,

      compliance_check: `${basePrompt}

QUERY TYPE: Compliance Check
Focus on rules, regulations, and compliance requirements from the data.`,

      task_management: `${basePrompt}

QUERY TYPE: Task Management
Focus on tasks, their status, priorities, and deadlines from the data.`,

      strategic_insight: `${basePrompt}

QUERY TYPE: Strategic Analysis
Synthesize insights across products, coverages, and rules.`,

      data_query: `${basePrompt}

QUERY TYPE: Data Query
Answer with specific data from the system. List items clearly.
Use the exact data provided - do not fabricate information.`,

      general: `${basePrompt}

QUERY TYPE: General Question
Answer using the data provided. Be helpful and thorough.`
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

    return `
================================================================================
USER'S SYSTEM DATA (USE THIS DATA TO ANSWER QUESTIONS)
================================================================================

${compressed}

================================================================================
END OF SYSTEM DATA
================================================================================`;
  }

  /**
   * Build query-specific instructions
   */
  buildInstructions(queryType: QueryType, query: string): string {
    const baseInstructions = `
USER QUESTION: "${query}"

INSTRUCTIONS:
- Answer based ONLY on the data provided above
- If the user asks "what do I have" or "list my", refer to the data sections above
- Be specific - use names, codes, and details from the data
- Keep response concise but complete`;

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

