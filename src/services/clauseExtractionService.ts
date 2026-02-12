/**
 * Clause Extraction Service
 * AI-powered extraction and classification of clauses from insurance forms
 */

import { z } from 'zod';
import { callAIGatewayStructured } from './aiGatewayService';
import logger, { LOG_CATEGORIES } from '../utils/logger';

// Clause schema
export const ExtractedClauseSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  type: z.enum(['coverage', 'exclusion', 'condition', 'definition', 'endorsement', 'other']),
  confidence: z.number().min(0).max(1),
  keywords: z.array(z.string()).optional(),
  relatedCoverages: z.array(z.string()).optional(),
});

export type ExtractedClause = z.infer<typeof ExtractedClauseSchema>;

// Extraction result schema
const ExtractionResultSchema = z.object({
  clauses: z.array(z.object({
    title: z.string(),
    content: z.string(),
    type: z.enum(['coverage', 'exclusion', 'condition', 'definition', 'endorsement', 'other']),
    confidence: z.number(),
    keywords: z.array(z.string()).optional(),
  })),
  summary: z.string(),
  formType: z.string().optional(),
});

/**
 * Extract clauses from form text using AI
 */
export async function extractClausesFromText(
  formText: string,
  formNumber: string,
  options?: {
    productId?: string;
    maxClauses?: number;
  }
): Promise<{
  clauses: ExtractedClause[];
  summary: string;
  formType?: string;
}> {
  try {
    // Chunk text if too long (max ~8000 chars for context)
    const maxLength = 8000;
    const truncatedText = formText.length > maxLength 
      ? formText.slice(0, maxLength) + '\n\n[Text truncated...]'
      : formText;
    
    const result = await callAIGatewayStructured({
      prompt: `Analyze this insurance form document (${formNumber}) and extract all distinct clauses.

FORM TEXT:
${truncatedText}

For each clause, identify:
1. A descriptive title
2. The full clause content
3. The type (coverage, exclusion, condition, definition, endorsement, or other)
4. Your confidence level (0-1)
5. Key terms/keywords

Also provide:
- A brief summary of the form's purpose
- The form type (e.g., "Policy Jacket", "Endorsement", "Declaration", etc.)`,
      systemPrompt: `You are an expert insurance forms analyst. Extract and classify clauses from insurance documents with high accuracy. Focus on:
- Coverage grants and limits
- Exclusions and limitations
- Conditions and requirements
- Definitions of key terms
- Endorsement modifications`,
      schema: ExtractionResultSchema,
      context: {
        productId: options?.productId,
        feature: 'clause-extraction',
      },
      temperature: 0.3, // Lower temperature for more consistent extraction
    });
    
    // Add IDs to clauses
    const clausesWithIds: ExtractedClause[] = result.data.clauses.map((clause, index) => ({
      ...clause,
      id: `clause-${formNumber}-${index}`,
      relatedCoverages: [],
    }));
    
    logger.info(LOG_CATEGORIES.AI, 'Extracted clauses from form', {
      formNumber,
      clauseCount: clausesWithIds.length,
      requestId: result.requestId,
    });
    
    return {
      clauses: clausesWithIds,
      summary: result.data.summary,
      formType: result.data.formType,
    };
  } catch (error) {
    logger.error(LOG_CATEGORIES.AI, 'Failed to extract clauses', { formNumber }, error as Error);
    throw error;
  }
}

/**
 * Classify a single clause
 */
export async function classifyClause(
  clauseText: string
): Promise<{
  type: ExtractedClause['type'];
  confidence: number;
  keywords: string[];
}> {
  try {
    const schema = z.object({
      type: z.enum(['coverage', 'exclusion', 'condition', 'definition', 'endorsement', 'other']),
      confidence: z.number(),
      keywords: z.array(z.string()),
      reasoning: z.string(),
    });
    
    const result = await callAIGatewayStructured({
      prompt: `Classify this insurance clause:

"${clauseText}"

Determine:
1. The clause type
2. Your confidence (0-1)
3. Key terms
4. Brief reasoning for classification`,
      systemPrompt: 'You are an insurance clause classifier. Accurately categorize insurance policy language.',
      schema,
      temperature: 0.2,
    });
    
    return {
      type: result.data.type,
      confidence: result.data.confidence,
      keywords: result.data.keywords,
    };
  } catch (error) {
    logger.error(LOG_CATEGORIES.AI, 'Failed to classify clause', {}, error as Error);
    throw error;
  }
}

/**
 * Link clauses to coverages based on content analysis
 */
export async function linkClausesToCoverages(
  clauses: ExtractedClause[],
  coverageNames: string[]
): Promise<Map<string, string[]>> {
  const links = new Map<string, string[]>();
  
  if (clauses.length === 0 || coverageNames.length === 0) {
    return links;
  }
  
  try {
    const schema = z.object({
      links: z.array(z.object({
        clauseId: z.string(),
        coverages: z.array(z.string()),
      })),
    });
    
    const result = await callAIGatewayStructured({
      prompt: `Match these insurance clauses to the most relevant coverages.

CLAUSES:
${clauses.map(c => `- ${c.id}: ${c.title} (${c.type})`).join('\n')}

AVAILABLE COVERAGES:
${coverageNames.map(n => `- ${n}`).join('\n')}

For each clause, list which coverages it applies to.`,
      systemPrompt: 'You are an insurance product expert. Match form clauses to their applicable coverages.',
      schema,
      temperature: 0.3,
    });
    
    for (const link of result.data.links) {
      links.set(link.clauseId, link.coverages);
    }
    
    return links;
  } catch (error) {
    logger.error(LOG_CATEGORIES.AI, 'Failed to link clauses to coverages', {}, error as Error);
    return links;
  }
}

