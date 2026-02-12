/**
 * AI Gateway Service
 * Client-side service for calling the AI Gateway Cloud Function
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { z } from 'zod';
import logger, { LOG_CATEGORIES } from '../utils/logger';

// Response schema
const AIGatewayResponseSchema = z.object({
  success: z.boolean(),
  content: z.unknown(),
  raw: z.string(),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    totalTokens: z.number(),
  }),
  metrics: z.object({
    latencyMs: z.number(),
    estimatedCost: z.number(),
    piiRedacted: z.boolean(),
  }),
  requestId: z.string(),
});

export type AIGatewayResponse = z.infer<typeof AIGatewayResponseSchema>;

// Request options
export interface AIGatewayOptions {
  prompt: string;
  systemPrompt?: string;
  model?: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
  temperature?: number;
  maxTokens?: number;
  responseSchema?: Record<string, unknown>;
  context?: {
    productId?: string;
    feature?: string;
  };
}

// Structured output helpers
export interface StructuredOutputOptions<T> extends Omit<AIGatewayOptions, 'responseSchema'> {
  schema: z.ZodType<T>;
  schemaDescription?: string;
}

/**
 * Call the AI Gateway with raw options
 */
export async function callAIGateway(options: AIGatewayOptions): Promise<AIGatewayResponse> {
  try {
    const aiGateway = httpsCallable(functions, 'aiGateway');
    const result = await aiGateway(options);
    
    const validated = AIGatewayResponseSchema.parse(result.data);
    
    logger.info(LOG_CATEGORIES.AI, 'AI Gateway call successful', {
      requestId: validated.requestId,
      model: options.model || 'gpt-4o-mini',
      tokens: validated.usage.totalTokens,
      latencyMs: validated.metrics.latencyMs,
      cost: validated.metrics.estimatedCost,
    });
    
    return validated;
  } catch (error) {
    logger.error(LOG_CATEGORIES.AI, 'AI Gateway call failed', {
      model: options.model,
    }, error as Error);
    throw error;
  }
}

/**
 * Call the AI Gateway with structured output validation
 */
export async function callAIGatewayStructured<T>(
  options: StructuredOutputOptions<T>
): Promise<{ data: T; metrics: AIGatewayResponse['metrics']; requestId: string }> {
  const { schema, schemaDescription, ...gatewayOptions } = options;
  
  // Build JSON schema from Zod (simplified)
  const jsonSchema = {
    type: 'object',
    description: schemaDescription || 'Structured response',
  };
  
  // Add instruction to return JSON
  const enhancedPrompt = `${options.prompt}

IMPORTANT: Respond with valid JSON only. No markdown, no code blocks, just the JSON object.`;
  
  const response = await callAIGateway({
    ...gatewayOptions,
    prompt: enhancedPrompt,
    responseSchema: jsonSchema,
  });
  
  // Parse and validate the response
  let parsed: unknown;
  try {
    parsed = typeof response.content === 'string' 
      ? JSON.parse(response.content) 
      : response.content;
  } catch {
    // Try to extract JSON from the raw response
    const jsonMatch = response.raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse AI response as JSON');
    }
  }
  
  const validated = schema.parse(parsed);
  
  return {
    data: validated,
    metrics: response.metrics,
    requestId: response.requestId,
  };
}

/**
 * Pre-built AI operations
 */
export const aiOperations = {
  /**
   * Generate coverage suggestions
   */
  async suggestCoverages(productName: string, productDescription: string) {
    const schema = z.object({
      coverages: z.array(z.object({
        name: z.string(),
        description: z.string(),
        isOptional: z.boolean(),
      })),
    });
    
    return callAIGatewayStructured({
      prompt: `Suggest insurance coverages for a product called "${productName}". 
Description: ${productDescription}

Return a list of recommended coverages with names, descriptions, and whether they should be optional.`,
      systemPrompt: 'You are an insurance product expert. Provide practical, industry-standard coverage suggestions.',
      schema,
      context: { feature: 'coverage-suggestions' },
    });
  },
  
  /**
   * Analyze form document
   */
  async analyzeForm(formText: string, formNumber: string) {
    const schema = z.object({
      summary: z.string(),
      clauses: z.array(z.object({
        title: z.string(),
        content: z.string(),
        type: z.enum(['coverage', 'exclusion', 'condition', 'definition', 'other']),
      })),
      suggestedCoverages: z.array(z.string()),
    });
    
    return callAIGatewayStructured({
      prompt: `Analyze this insurance form (${formNumber}) and extract key information:

${formText.slice(0, 8000)}

Provide a summary, extract key clauses, and suggest which coverages this form applies to.`,
      systemPrompt: 'You are an insurance forms analyst. Extract structured information from insurance documents.',
      schema,
      context: { feature: 'form-analysis' },
    });
  },
};

export default aiOperations;

