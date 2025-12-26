/**
 * Advanced RAG (Retrieval-Augmented Generation) Service
 *
 * Implements sophisticated summarization techniques:
 * - Semantic chunking for optimal context windows
 * - Hierarchical summarization (map-reduce pattern)
 * - Multi-document synthesis with cross-referencing
 * - Context-aware retrieval with relevance scoring
 * - Extractive + Abstractive hybrid summaries
 */

import logger, { LOG_CATEGORIES } from '@utils/logger';
import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import { AI_MODELS, AI_PARAMETERS } from '@config/aiConfig';

// ============================================================================
// Type Definitions
// ============================================================================

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: ChunkMetadata;
  embedding?: number[];
  relevanceScore?: number;
}

export interface ChunkMetadata {
  source: string;
  sourceType: 'product' | 'coverage' | 'form' | 'rule' | 'pricing';
  section?: string;
  pageNumber?: number;
  startOffset: number;
  endOffset: number;
  keyEntities?: string[];
  importance: 'high' | 'medium' | 'low';
}

export interface SummaryRequest {
  documents: DocumentSource[];
  summaryType: SummaryType;
  targetLength?: 'brief' | 'standard' | 'detailed';
  focusAreas?: string[];
  includeSourceCitations?: boolean;
  hierarchical?: boolean;
}

export interface DocumentSource {
  id: string;
  type: 'product' | 'coverage' | 'form' | 'rule' | 'pricing';
  content: string;
  title: string;
  metadata?: Record<string, unknown>;
}

export type SummaryType =
  | 'executive'      // High-level business summary
  | 'technical'      // Detailed technical breakdown
  | 'comparative'    // Compare across documents
  | 'compliance'     // Focus on regulatory aspects
  | 'actionable'     // Highlight action items
  | 'comprehensive'; // Full synthesis

export interface SummaryResult {
  summary: string;
  keyPoints: KeyPoint[];
  entities: ExtractedEntity[];
  sourceCitations: SourceCitation[];
  confidence: number;
  methodology: string;
  processingMetrics: ProcessingMetrics;
}

export interface KeyPoint {
  text: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  sourceRef?: string;
}

export interface ExtractedEntity {
  name: string;
  type: 'coverage' | 'limit' | 'deductible' | 'state' | 'form' | 'rule' | 'date' | 'amount';
  value?: string;
  context: string;
  frequency: number;
}

export interface SourceCitation {
  id: string;
  documentTitle: string;
  section?: string;
  excerpt: string;
  relevance: number;
}

export interface ProcessingMetrics {
  totalDocuments: number;
  totalChunks: number;
  processingTimeMs: number;
  tokensUsed: number;
  compressionRatio: number;
}

// ============================================================================
// Configuration
// ============================================================================

const RAG_CONFIG = {
  maxChunkSize: 1500,       // tokens
  chunkOverlap: 150,        // tokens overlap for context continuity
  maxContextWindow: 4000,   // max tokens for context
  minRelevanceScore: 0.5,   // threshold for chunk inclusion
  maxChunksPerLevel: 10,    // max chunks per hierarchical level
  embeddingModel: 'text-embedding-3-small',
  summarizationModel: AI_MODELS.HOME_CHAT,
};

// ============================================================================
// Advanced RAG Service Class
// ============================================================================

class AdvancedRAGService {
  private chunkCache = new Map<string, DocumentChunk[]>();

  /**
   * Main entry point: Generate intelligent summary from documents
   */
  async generateSummary(request: SummaryRequest): Promise<SummaryResult> {
    const startTime = Date.now();
    logger.info(LOG_CATEGORIES.AI, 'Starting RAG summary generation', {
      documents: request.documents.length,
      type: request.summaryType
    });

    try {
      // Step 1: Semantic chunking
      const chunks = await this.semanticChunk(request.documents);

      // Step 2: Extract entities for context
      const entities = this.extractEntities(chunks);

      // Step 3: Generate summary using appropriate strategy
      const summary = request.hierarchical
        ? await this.hierarchicalSummarize(chunks, request)
        : await this.directSummarize(chunks, request);

      // Step 4: Extract key points
      const keyPoints = await this.extractKeyPoints(summary, request.summaryType);

      // Step 5: Generate source citations
      const citations = this.generateCitations(chunks, summary);

      // Calculate metrics
      const processingTime = Date.now() - startTime;
      const metrics: ProcessingMetrics = {
        totalDocuments: request.documents.length,
        totalChunks: chunks.length,
        processingTimeMs: processingTime,
        tokensUsed: this.estimateTokens(summary),
        compressionRatio: this.calculateCompressionRatio(request.documents, summary)
      };

      logger.info(LOG_CATEGORIES.AI, 'RAG summary completed', metrics);

      return {
        summary,
        keyPoints,
        entities,
        sourceCitations: citations,
        confidence: this.calculateConfidence(chunks, request),
        methodology: request.hierarchical ? 'hierarchical-map-reduce' : 'direct-synthesis',
        processingMetrics: metrics
      };
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'RAG summary failed', { error });
      throw error;
    }
  }

  /**
   * Semantic chunking: Split documents into meaningful chunks
   */
  private async semanticChunk(documents: DocumentSource[]): Promise<DocumentChunk[]> {
    const allChunks: DocumentChunk[] = [];

    for (const doc of documents) {
      const cacheKey = `${doc.id}-${doc.content.length}`;

      if (this.chunkCache.has(cacheKey)) {
        allChunks.push(...this.chunkCache.get(cacheKey)!);
        continue;
      }

      const chunks = this.createSemanticChunks(doc);
      this.chunkCache.set(cacheKey, chunks);
      allChunks.push(...chunks);
    }

    return allChunks;
  }

  /**
   * Create semantic chunks with overlap and metadata
   */
  private createSemanticChunks(doc: DocumentSource): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const content = doc.content;

    // Split by semantic boundaries (paragraphs, sections)
    const sections = this.splitBySemanticBoundaries(content);

    let offset = 0;
    sections.forEach((section, index) => {
      const importance = this.assessImportance(section, doc.type);
      const keyEntities = this.extractEntitiesFromText(section);

      chunks.push({
        id: `${doc.id}-chunk-${index}`,
        content: section,
        metadata: {
          source: doc.title,
          sourceType: doc.type,
          section: this.identifySection(section),
          startOffset: offset,
          endOffset: offset + section.length,
          keyEntities,
          importance
        }
      });

      offset += section.length;
    });

    return chunks;
  }


  /**
   * Split content by semantic boundaries
   */
  private splitBySemanticBoundaries(content: string): string[] {
    // Split by double newlines, headers, or section markers
    const patterns = [
      /\n\n+/,                    // Double+ newlines
      /(?=^#{1,3}\s)/m,           // Markdown headers
      /(?=^[A-Z][A-Z\s]{5,}:)/m,  // UPPERCASE HEADERS:
      /(?=^\d+\.\s+[A-Z])/m,      // Numbered sections
    ];

    let sections = [content];
    patterns.forEach(pattern => {
      sections = sections.flatMap(s => s.split(pattern).filter(Boolean));
    });

    // Ensure chunks don't exceed max size
    return sections.flatMap(section => {
      if (this.estimateTokens(section) > RAG_CONFIG.maxChunkSize) {
        return this.splitBySize(section, RAG_CONFIG.maxChunkSize);
      }
      return [section];
    });
  }

  /**
   * Split by size with overlap
   */
  private splitBySize(text: string, maxTokens: number): string[] {
    const words = text.split(/\s+/);
    const wordsPerChunk = Math.floor(maxTokens / 1.3);
    const overlap = Math.floor(RAG_CONFIG.chunkOverlap / 1.3);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += wordsPerChunk - overlap) {
      chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
    }

    return chunks;
  }

  /**
   * Assess importance of content section
   */
  private assessImportance(section: string, type: string): 'high' | 'medium' | 'low' {
    const highPriorityPatterns = [
      /limit|coverage|deductible|exclusion|condition/i,
      /mandatory|required|must|shall/i,
      /premium|rate|pricing|cost/i,
      /compliance|regulation|filing/i
    ];

    const matchCount = highPriorityPatterns.filter(p => p.test(section)).length;

    if (matchCount >= 2) return 'high';
    if (matchCount === 1) return 'medium';
    return 'low';
  }

  /**
   * Identify section type from content
   */
  private identifySection(content: string): string {
    const sectionPatterns: [RegExp, string][] = [
      [/declaration|dec\s+page/i, 'Declarations'],
      [/insuring\s+agreement/i, 'Insuring Agreement'],
      [/definition|defined\s+term/i, 'Definitions'],
      [/exclusion|not\s+covered/i, 'Exclusions'],
      [/condition|requirement/i, 'Conditions'],
      [/limit|coverage\s+limit/i, 'Limits'],
      [/deductible/i, 'Deductibles'],
      [/endorsement/i, 'Endorsements'],
      [/rate|pricing|premium/i, 'Pricing'],
    ];

    for (const [pattern, section] of sectionPatterns) {
      if (pattern.test(content)) return section;
    }
    return 'General';
  }

  /**
   * Extract entities from text chunk
   */
  private extractEntitiesFromText(text: string): string[] {
    const entities: string[] = [];

    // Extract amounts
    const amounts = text.match(/\$[\d,]+(?:\.\d{2})?/g);
    if (amounts) entities.push(...amounts);

    // Extract percentages
    const percentages = text.match(/\d+(?:\.\d+)?%/g);
    if (percentages) entities.push(...percentages);

    // Extract dates
    const dates = text.match(/\d{1,2}\/\d{1,2}\/\d{2,4}|\w+\s+\d{1,2},?\s+\d{4}/g);
    if (dates) entities.push(...dates);

    // Extract state codes
    const states = text.match(/\b[A-Z]{2}\b/g);
    if (states) entities.push(...new Set(states));

    return [...new Set(entities)].slice(0, 10);
  }

  /**
   * Extract all entities across chunks
   */
  private extractEntities(chunks: DocumentChunk[]): ExtractedEntity[] {
    const entityMap = new Map<string, ExtractedEntity>();

    chunks.forEach(chunk => {
      chunk.metadata.keyEntities?.forEach(entity => {
        const key = entity.toLowerCase();
        if (entityMap.has(key)) {
          entityMap.get(key)!.frequency++;
        } else {
          entityMap.set(key, {
            name: entity,
            type: this.classifyEntity(entity),
            context: chunk.content.substring(0, 100),
            frequency: 1
          });
        }
      });
    });

    return Array.from(entityMap.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);
  }

  /**
   * Classify entity type
   */
  private classifyEntity(entity: string): ExtractedEntity['type'] {
    if (/^\$/.test(entity)) return 'amount';
    if (/%$/.test(entity)) return 'amount';
    if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(entity)) return 'date';
    if (/^[A-Z]{2}$/.test(entity)) return 'state';
    return 'coverage';
  }


  /**
   * Hierarchical summarization using map-reduce pattern
   */
  private async hierarchicalSummarize(
    chunks: DocumentChunk[],
    request: SummaryRequest
  ): Promise<string> {
    // Sort by importance and take top chunks per level
    const sortedChunks = chunks.sort((a, b) => {
      const importanceOrder = { high: 0, medium: 1, low: 2 };
      return importanceOrder[a.metadata.importance] - importanceOrder[b.metadata.importance];
    });

    // Level 1: Summarize individual chunks (Map)
    const chunkSummaries = await Promise.all(
      sortedChunks.slice(0, RAG_CONFIG.maxChunksPerLevel).map(chunk =>
        this.summarizeChunk(chunk, request.summaryType)
      )
    );

    // Level 2: Combine chunk summaries (Reduce)
    const combinedContext = chunkSummaries.join('\n\n---\n\n');

    // Level 3: Final synthesis
    return this.synthesize(combinedContext, request);
  }

  /**
   * Direct summarization for smaller document sets
   */
  private async directSummarize(
    chunks: DocumentChunk[],
    request: SummaryRequest
  ): Promise<string> {
    const context = chunks
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.metadata.importance] - order[b.metadata.importance];
      })
      .slice(0, RAG_CONFIG.maxChunksPerLevel)
      .map(c => `[${c.metadata.source}]\n${c.content}`)
      .join('\n\n');

    return this.synthesize(context, request);
  }

  /**
   * Summarize individual chunk
   */
  private async summarizeChunk(
    chunk: DocumentChunk,
    summaryType: SummaryType
  ): Promise<string> {
    const prompt = this.buildChunkPrompt(chunk, summaryType);

    try {
      const generateChat = httpsCallable(functions, 'generateChatResponse');
      const result = await generateChat({
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        model: RAG_CONFIG.summarizationModel,
        maxTokens: 500,
        temperature: 0.3
      }) as { data: { success: boolean; content?: string } };

      return result.data.content || chunk.content.substring(0, 200);
    } catch (error) {
      logger.warn(LOG_CATEGORIES.AI, 'Chunk summarization failed, using excerpt', { error });
      return chunk.content.substring(0, 300);
    }
  }

  /**
   * Final synthesis of summaries
   */
  private async synthesize(context: string, request: SummaryRequest): Promise<string> {
    const prompt = this.buildSynthesisPrompt(context, request);

    try {
      const generateChat = httpsCallable(functions, 'generateChatResponse');
      const result = await generateChat({
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        model: RAG_CONFIG.summarizationModel,
        maxTokens: this.getTargetTokens(request.targetLength),
        temperature: 0.4
      }) as { data: { success: boolean; content?: string } };

      if (!result.data.success || !result.data.content) {
        throw new Error('Synthesis failed');
      }

      return result.data.content;
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Synthesis failed', { error });
      throw error;
    }
  }

  /**
   * Build prompt for chunk summarization
   */
  private buildChunkPrompt(chunk: DocumentChunk, type: SummaryType): { system: string; user: string } {
    return {
      system: `You are an expert insurance document analyst. Summarize the following ${chunk.metadata.sourceType} content concisely.
Focus on: ${this.getFocusAreas(type)}
Be precise and factual. Extract key information.`,
      user: `Source: ${chunk.metadata.source}\nSection: ${chunk.metadata.section || 'General'}\n\n${chunk.content}`
    };
  }

  /**
   * Build prompt for final synthesis
   */
  private buildSynthesisPrompt(context: string, request: SummaryRequest): { system: string; user: string } {
    const typeInstructions: Record<SummaryType, string> = {
      executive: 'Create a high-level executive summary suitable for leadership. Focus on business impact, key metrics, and strategic implications.',
      technical: 'Provide a detailed technical breakdown. Include specific coverage terms, limits, conditions, and operational details.',
      comparative: 'Compare and contrast the documents. Highlight similarities, differences, and relative strengths.',
      compliance: 'Focus on regulatory and compliance aspects. Identify requirements, filing statuses, and potential issues.',
      actionable: 'Extract action items and recommendations. Prioritize by urgency and impact.',
      comprehensive: 'Provide a thorough synthesis covering all aspects: coverage, pricing, compliance, and operations.'
    };

    return {
      system: `You are an elite insurance analyst creating a ${request.summaryType} summary.
${typeInstructions[request.summaryType]}

FORMAT REQUIREMENTS:
- Use clear headings and structure
- Include specific data points and citations
- Highlight critical information
- Provide actionable insights
${request.focusAreas?.length ? `\nFOCUS AREAS: ${request.focusAreas.join(', ')}` : ''}`,
      user: `Synthesize the following document excerpts:\n\n${context}`
    };
  }


  /**
   * Get focus areas based on summary type
   */
  private getFocusAreas(type: SummaryType): string {
    const areas: Record<SummaryType, string> = {
      executive: 'business impact, costs, risks, opportunities',
      technical: 'coverage terms, limits, conditions, exclusions',
      comparative: 'similarities, differences, strengths, weaknesses',
      compliance: 'regulations, requirements, deadlines, filings',
      actionable: 'action items, decisions, recommendations',
      comprehensive: 'all aspects including coverage, pricing, compliance'
    };
    return areas[type];
  }

  /**
   * Get target token count based on length preference
   */
  private getTargetTokens(length?: 'brief' | 'standard' | 'detailed'): number {
    const lengths = { brief: 500, standard: 1000, detailed: 2000 };
    return lengths[length || 'standard'];
  }

  /**
   * Extract key points from summary
   */
  private async extractKeyPoints(
    summary: string,
    type: SummaryType
  ): Promise<KeyPoint[]> {
    const keyPoints: KeyPoint[] = [];

    // Pattern-based extraction for reliability
    const patterns = [
      { regex: /(?:critical|urgent|important):\s*([^.]+)/gi, importance: 'critical' as const },
      { regex: /(?:key\s+point|highlight|note):\s*([^.]+)/gi, importance: 'high' as const },
      { regex: /•\s*([^•\n]+)/g, importance: 'medium' as const },
      { regex: /\d+\.\s+([^.\n]+)/g, importance: 'medium' as const },
    ];

    patterns.forEach(({ regex, importance }) => {
      let match;
      while ((match = regex.exec(summary)) !== null) {
        keyPoints.push({
          text: match[1].trim(),
          importance,
          category: this.categorizeKeyPoint(match[1], type)
        });
      }
    });

    // Deduplicate and limit
    const seen = new Set<string>();
    return keyPoints
      .filter(kp => {
        const key = kp.text.toLowerCase().substring(0, 50);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 10);
  }

  /**
   * Categorize key point
   */
  private categorizeKeyPoint(text: string, type: SummaryType): string {
    if (/coverage|limit|deductible/i.test(text)) return 'Coverage';
    if (/premium|rate|pricing/i.test(text)) return 'Pricing';
    if (/compliance|regulation|filing/i.test(text)) return 'Compliance';
    if (/risk|exposure/i.test(text)) return 'Risk';
    if (/action|recommend/i.test(text)) return 'Action Item';
    return 'General';
  }

  /**
   * Generate source citations
   */
  private generateCitations(chunks: DocumentChunk[], summary: string): SourceCitation[] {
    const citations: SourceCitation[] = [];

    // Find chunks that contributed to the summary
    chunks.forEach(chunk => {
      const excerpt = chunk.content.substring(0, 150);
      const relevance = this.calculateChunkRelevance(chunk, summary);

      if (relevance > 0.3) {
        citations.push({
          id: chunk.id,
          documentTitle: chunk.metadata.source,
          section: chunk.metadata.section,
          excerpt: excerpt + '...',
          relevance
        });
      }
    });

    return citations
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);
  }

  /**
   * Calculate chunk relevance to summary
   */
  private calculateChunkRelevance(chunk: DocumentChunk, summary: string): number {
    const chunkWords = new Set(chunk.content.toLowerCase().split(/\s+/));
    const summaryWords = summary.toLowerCase().split(/\s+/);

    let matches = 0;
    summaryWords.forEach(word => {
      if (word.length > 4 && chunkWords.has(word)) matches++;
    });

    return Math.min(1, matches / 20);
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(chunks: DocumentChunk[], request: SummaryRequest): number {
    const factors = {
      chunkQuality: chunks.filter(c => c.metadata.importance === 'high').length / chunks.length,
      documentCoverage: Math.min(1, request.documents.length / 5),
      contentDensity: chunks.length > 3 ? 1 : chunks.length / 3
    };

    return Math.round(
      (factors.chunkQuality * 0.4 + factors.documentCoverage * 0.3 + factors.contentDensity * 0.3) * 100
    ) / 100;
  }

  /**
   * Estimate token count
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }

  /**
   * Calculate compression ratio
   */
  private calculateCompressionRatio(docs: DocumentSource[], summary: string): number {
    const originalLength = docs.reduce((sum, d) => sum + d.content.length, 0);
    return Math.round((1 - summary.length / originalLength) * 100) / 100;
  }
}

// Export singleton instance
export const advancedRAGService = new AdvancedRAGService();
export default advancedRAGService;