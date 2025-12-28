// src/utils/pdfChunking.ts
/**
 * PDF Chunking Utility - Insurance-Aware Document Processing
 *
 * OPTIMIZED VERSION - Enhanced for P&C Insurance Forms:
 * - Insurance-specific section detection (coverages, exclusions, conditions)
 * - Hierarchical document understanding
 * - Semantic boundary preservation
 * - Metadata extraction for better context
 * - Parallel processing with rate limiting
 */

import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../firebase';
import { CACHE } from '../config/constants';
import logger, { LOG_CATEGORIES } from './logger';

// ============================================================================
// Types
// ============================================================================

export interface ChunkMetadata {
  formId: string;
  formName: string;
  formNumber?: string;
  category?: string;
  chunkIndex: number;
  totalChunks: number;
  sectionType?: InsuranceSectionType;
  importance?: 'critical' | 'high' | 'medium' | 'low';
  originalLength?: number;
  warning?: boolean;
  error?: boolean;
}

export interface FormChunk extends ChunkMetadata {
  text: string;
}

export type InsuranceSectionType =
  | 'declarations'
  | 'insuring_agreement'
  | 'definitions'
  | 'exclusions'
  | 'conditions'
  | 'endorsement'
  | 'coverage'
  | 'limits'
  | 'deductibles'
  | 'general';

// ============================================================================
// Configuration
// ============================================================================

// PDF processing cache to avoid reprocessing (uses centralized CACHE config)
const pdfCache = new Map();
const CACHE_TTL = CACHE.TTL_FORMS; // 10 minutes - same as forms TTL
const MAX_CACHE_SIZE = CACHE.MAX_CACHE_SIZE; // Maximum number of cached PDFs

// Insurance-specific section patterns with importance levels
const INSURANCE_SECTION_PATTERNS: Array<{
  pattern: RegExp;
  type: InsuranceSectionType;
  importance: 'critical' | 'high' | 'medium' | 'low';
}> = [
  // Critical sections - affect coverage determination
  { pattern: /^(INSURING\s+AGREEMENT|COVERAGE\s+AGREEMENT)/i, type: 'insuring_agreement', importance: 'critical' },
  { pattern: /^EXCLUSIONS?(\s|$)/i, type: 'exclusions', importance: 'critical' },
  { pattern: /^(COVERAGE\s+[A-Z]|SECTION\s+[IVX]+\s*[-–]\s*COVERAGE)/i, type: 'coverage', importance: 'critical' },

  // High importance - affect policy terms
  { pattern: /^CONDITIONS?(\s|$)/i, type: 'conditions', importance: 'high' },
  { pattern: /^DEFINITIONS?(\s|$)/i, type: 'definitions', importance: 'high' },
  { pattern: /^(LIMITS?\s+OF\s+(LIABILITY|INSURANCE)|COVERAGE\s+LIMITS?)/i, type: 'limits', importance: 'high' },
  { pattern: /^DEDUCTIBLES?(\s|$)/i, type: 'deductibles', importance: 'high' },

  // Medium importance - endorsements and modifications
  { pattern: /^ENDORSEMENT(\s|$)/i, type: 'endorsement', importance: 'medium' },
  { pattern: /^(THIS\s+ENDORSEMENT\s+MODIFIES|POLICY\s+CHANGE)/i, type: 'endorsement', importance: 'medium' },

  // Lower importance - declarations and general
  { pattern: /^DECLARATIONS?(\s|$)/i, type: 'declarations', importance: 'medium' },
  { pattern: /^(SECTION|PART)\s+[A-Z0-9]/i, type: 'general', importance: 'low' }
];

// Lazy load pdfjs to avoid bundle bloat
let pdfjsLib = null;
const loadPdfJs = async () => {
  if (pdfjsLib) return pdfjsLib;

  try {
    pdfjsLib = await import(/* webpackChunkName: "pdfjs" */ 'pdfjs-dist');

    // Set worker source with fallback - using .mjs for pdfjs-dist v5.4+
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;
    } else {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }

    // PDF.js loaded successfully (removed console.log to reduce noise)
    return pdfjsLib;
  } catch (error) {
    console.error('Failed to load PDF.js:', error);
    throw new Error('PDF processing is not available');
  }
};

// Cache management
const cleanupCache = () => {
  const now = Date.now();
  const entries = Array.from(pdfCache.entries());

  // Remove expired entries
  entries.forEach(([key, value]) => {
    if (now - value.timestamp > CACHE_TTL) {
      pdfCache.delete(key);
    }
  });

  // Remove oldest entries if cache is too large
  if (pdfCache.size > MAX_CACHE_SIZE) {
    const sortedEntries = entries
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, pdfCache.size - MAX_CACHE_SIZE);

    sortedEntries.forEach(([key]) => pdfCache.delete(key));
  }
};

/**
 * Extract text from a PDF file (either from Firebase Storage or File object)
 * @param {string|File} source - Firebase storage path or File object
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 * @returns {Promise<string>} - Extracted text
 */
export async function extractPdfText(source, timeout = 30000) {
  const cacheKey = typeof source === 'string' ? source : `file_${source.name}_${source.size}`;

  console.log('🔍 extractPdfText called with:', {
    sourceType: typeof source,
    isString: typeof source === 'string',
    source: typeof source === 'string' ? source.substring(0, 100) : 'File object',
    cacheKey: cacheKey.substring(0, 100)
  });

  // Check cache first
  const cached = pdfCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('✅ PDF cache hit, returning cached text');
    return cached.text;
  }

  // Clean up cache periodically
  cleanupCache();

  let pdf = null;
  try {
    await loadPdfJs();

    let pdfData;
    const urlTimeout = Math.min(timeout * 0.3, 10000); // 30% of timeout or 10s max
    const fetchTimeout = Math.min(timeout * 0.5, 15000); // 50% of timeout or 15s max

    if (typeof source === 'string') {
      let url = source;

      // Check if source is a Firebase Storage path or already a download URL
      if (!source.startsWith('http://') && !source.startsWith('https://')) {
        console.log('📁 Source is a Firebase Storage path, getting download URL...');
        // It's a Firebase Storage path, get the download URL
        url = await Promise.race([
          getDownloadURL(ref(storage, source)),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firebase URL fetch timeout')), urlTimeout)
          )
        ]);
        console.log('✅ Got download URL:', url.substring(0, 100));
      } else {
        console.log('🌐 Source is already a URL, using directly');
      }

      console.log('⬇️ Fetching PDF from URL...');
      const response = await Promise.race([
        fetch(url),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('PDF fetch timeout')), fetchTimeout)
        )
      ]);

      console.log('📦 Fetch response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type')
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      }

      console.log('📥 Downloading PDF data...');
      pdfData = await Promise.race([
        response.arrayBuffer(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('PDF download timeout')), fetchTimeout)
        )
      ]);
      console.log('✅ PDF data downloaded:', pdfData.byteLength, 'bytes');
    } else {
      // File object
      pdfData = await source.arrayBuffer();
    }

    console.log('📖 Parsing PDF document...');
    pdf = await Promise.race([
      pdfjsLib.getDocument({
        data: new Uint8Array(pdfData),
        // Optimize memory usage
        disableFontFace: true,
        disableRange: false,
        disableStream: false
      }).promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('PDF parsing timeout')), 10000)
      )
    ]);

    console.log('✅ PDF parsed successfully:', {
      numPages: pdf.numPages,
      fingerprint: pdf.fingerprints?.[0]?.substring(0, 20)
    });

    let text = '';
    const maxPages = Math.min(pdf.numPages, 50); // Limit to 50 pages to prevent memory issues
    const pages = [];

    console.log(`📄 Extracting text from ${maxPages} pages...`);

    // Process pages in batches to manage memory
    const batchSize = 5;
    for (let batchStart = 1; batchStart <= maxPages; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize - 1, maxPages);

      for (let i = batchStart; i <= batchEnd; i++) {
        try {
          const page = await Promise.race([
            pdf.getPage(i),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Page ${i} timeout`)), 5000)
            )
          ]);

          const content = await Promise.race([
            page.getTextContent(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Page ${i} content timeout`)), 5000)
            )
          ]);

          const pageText = content.items.map(item => item.str).join(' ');
          text += pageText + '\n\n';

          // Clean up page resources immediately
          page.cleanup();
          pages.push(page);
        } catch (pageError) {
          console.warn(`Failed to extract text from page ${i}:`, pageError);
          text += `[Error extracting page ${i}: ${pageError.message}]\n\n`;
        }
      }

      // Force garbage collection hint between batches
      if (batchEnd < maxPages && typeof window !== 'undefined' && window.gc) {
        window.gc();
      }
    }

    if (pdf.numPages > maxPages) {
      text += `\n[Note: PDF has ${pdf.numPages} pages, but only first ${maxPages} were processed]\n`;
    }

    const finalText = text.trim();

    console.log('✅ Text extraction complete:', {
      textLength: finalText.length,
      firstChars: finalText.substring(0, 100),
      isEmpty: finalText.length === 0
    });

    // Cache the result
    pdfCache.set(cacheKey, {
      text: finalText,
      timestamp: Date.now()
    });

    return finalText;
  } catch (error) {
    console.error('PDF text extraction failed:', error);
    throw new Error(`PDF text extraction failed: ${error.message}`);
  } finally {
    // Cleanup PDF document
    if (pdf) {
      try {
        pdf.destroy();
      } catch (cleanupError) {
        console.warn('PDF cleanup error:', cleanupError);
      }
    }
  }
}

/**
 * Split text into chunks suitable for AI processing
 * @param {string} text - Text to chunk
 * @param {number} maxTokens - Maximum tokens per chunk (approximate)
 * @param {number} overlap - Number of words to overlap between chunks
 * @returns {Array<string>} - Array of text chunks
 */
export function chunkText(text, maxTokens = 3000, overlap = 200) {
  // Rough approximation: 1 token ≈ 0.75 words
  const maxWords = Math.floor(maxTokens * 0.75);
  const words = text.split(/\s+/);

  if (words.length <= maxWords) {
    return [text];
  }

  const chunks = [];
  let startIndex = 0;

  while (startIndex < words.length) {
    const endIndex = Math.min(startIndex + maxWords, words.length);
    const chunk = words.slice(startIndex, endIndex).join(' ');
    chunks.push(chunk);

    // Move start index forward, accounting for overlap
    startIndex = endIndex - overlap;

    // Prevent infinite loop if overlap is too large
    if (startIndex <= (chunks.length > 1 ? startIndex - overlap : 0)) {
      startIndex = endIndex;
    }
  }

  return chunks;
}

/**
 * Detect insurance section type from text
 */
function detectSectionType(text: string): { type: InsuranceSectionType; importance: 'critical' | 'high' | 'medium' | 'low' } | null {
  const firstLine = text.split('\n')[0]?.trim() || '';

  for (const { pattern, type, importance } of INSURANCE_SECTION_PATTERNS) {
    if (pattern.test(firstLine)) {
      return { type, importance };
    }
  }

  return null;
}

/**
 * Extract key insurance terms from text for metadata
 */
function extractKeyTerms(text: string): string[] {
  const terms: string[] = [];
  const lowerText = text.toLowerCase();

  // Coverage-related terms
  if (lowerText.includes('bodily injury')) terms.push('bodily_injury');
  if (lowerText.includes('property damage')) terms.push('property_damage');
  if (lowerText.includes('personal injury')) terms.push('personal_injury');
  if (lowerText.includes('medical payments')) terms.push('medical_payments');
  if (lowerText.includes('uninsured motorist')) terms.push('uninsured_motorist');
  if (lowerText.includes('comprehensive')) terms.push('comprehensive');
  if (lowerText.includes('collision')) terms.push('collision');

  // Limit-related terms
  if (/\$[\d,]+/.test(text)) terms.push('has_limits');
  if (lowerText.includes('per occurrence')) terms.push('per_occurrence');
  if (lowerText.includes('aggregate')) terms.push('aggregate');

  // Exclusion indicators
  if (lowerText.includes('does not apply')) terms.push('exclusion_indicator');
  if (lowerText.includes('we will not')) terms.push('exclusion_indicator');
  if (lowerText.includes('not covered')) terms.push('exclusion_indicator');

  return terms;
}

/**
 * Intelligently chunk insurance form text based on structure and content
 * OPTIMIZED: Uses insurance-specific patterns for better semantic chunking
 *
 * @param text - Insurance form text to chunk
 * @param form - Form metadata for context
 * @returns Array of intelligently chunked text with metadata
 */
export function chunkInsuranceFormText(text: string, form: { formName?: string; id?: string } = {}): string[] {
  // For shorter forms, return as single chunk
  if (text.length < 8000) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = '';
  let currentSectionType: InsuranceSectionType = 'general';
  const lines = text.split('\n');

  for (const line of lines) {
    // Check if this line starts a new insurance section
    const sectionInfo = detectSectionType(line);
    const isNewSection = sectionInfo !== null;

    // If we hit a new section and current chunk is substantial, start new chunk
    if (isNewSection && currentChunk.length > 1500) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = line + '\n';
      currentSectionType = sectionInfo?.type || 'general';
    } else {
      currentChunk += line + '\n';
    }

    // If current chunk gets too large, force a split at a sentence boundary
    if (currentChunk.length > 10000) {
      // Try to find a good split point (end of sentence)
      const splitPoint = findSentenceBoundary(currentChunk, 8000);
      if (splitPoint > 0) {
        chunks.push(currentChunk.substring(0, splitPoint).trim());
        currentChunk = currentChunk.substring(splitPoint);
      } else {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
    }
  }

  // Add remaining content
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // If we didn't get good natural splits, fall back to word-based chunking
  if (chunks.length === 1 && chunks[0].length > 12000) {
    logger.debug(LOG_CATEGORIES.AI, `Falling back to word-based chunking for form ${form.formName || form.id}`);
    return chunkText(text, 4000, 300);
  }

  // Ensure no chunk is too large
  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length > 15000) {
      const subChunks = chunkText(chunk, 4000, 300);
      finalChunks.push(...subChunks);
    } else {
      finalChunks.push(chunk);
    }
  }

  return finalChunks.length > 0 ? finalChunks : [text];
}

/**
 * Find a sentence boundary near the target position
 */
function findSentenceBoundary(text: string, targetPos: number): number {
  // Look for sentence endings near the target position
  const searchStart = Math.max(0, targetPos - 500);
  const searchEnd = Math.min(text.length, targetPos + 500);
  const searchText = text.substring(searchStart, searchEnd);

  // Find sentence endings (. ! ?) followed by space or newline
  const sentenceEndPattern = /[.!?]\s+/g;
  let lastMatch = -1;
  let match;

  while ((match = sentenceEndPattern.exec(searchText)) !== null) {
    const absolutePos = searchStart + match.index + match[0].length;
    if (absolutePos <= targetPos + 200) {
      lastMatch = absolutePos;
    }
  }

  return lastMatch;
}

/**
 * Enhanced chunking with metadata for insurance forms
 * Returns chunks with section type and importance information
 */
export function chunkInsuranceFormWithMetadata(
  text: string,
  form: { formName?: string; id?: string; formNumber?: string; category?: string }
): FormChunk[] {
  const textChunks = chunkInsuranceFormText(text, form);

  return textChunks.map((chunk, index) => {
    const sectionInfo = detectSectionType(chunk);
    const keyTerms = extractKeyTerms(chunk);

    return {
      text: chunk,
      formId: form.id || 'unknown',
      formName: form.formName || form.formNumber || 'Unnamed Form',
      formNumber: form.formNumber,
      category: form.category,
      chunkIndex: index,
      totalChunks: textChunks.length,
      sectionType: sectionInfo?.type || 'general',
      importance: sectionInfo?.importance || 'medium',
      originalLength: text.length
    };
  });
}

/**
 * Process multiple forms and create chunks with metadata
 * OPTIMIZED: Uses parallel processor with rate limiting and better error handling
 *
 * @param forms - Array of form objects with filePath or downloadUrl
 * @param maxConcurrent - Maximum concurrent PDF processing (default: 3)
 * @param onProgress - Optional progress callback
 * @returns Promise<Array> - Array of chunks with form metadata
 */
export async function processFormsForAnalysis(
  forms: Array<{ id: string; formName?: string; formNumber?: string; category?: string; filePath?: string; downloadUrl?: string }>,
  maxConcurrent = 3,
  onProgress?: (completed: number, total: number) => void
): Promise<FormChunk[]> {
  if (!Array.isArray(forms) || forms.length === 0) {
    logger.warn(LOG_CATEGORIES.AI, 'No forms provided for analysis');
    return [];
  }

  const allChunks: FormChunk[] = [];
  logger.info(LOG_CATEGORIES.AI, `Processing ${forms.length} forms for analysis`);

  // Process a single form
  const processForm = async (form: typeof forms[0]): Promise<FormChunk[] | null> => {
    if (!form || !form.id) {
      logger.warn(LOG_CATEGORIES.AI, 'Invalid form object', { form });
      return null;
    }

    try {
      // Determine the source for PDF extraction
      const source = form.filePath || form.downloadUrl;
      if (!source) {
        logger.warn(LOG_CATEGORIES.AI, `Form ${form.id} has no filePath or downloadUrl`);
        return null;
      }

      // Extract text with enhanced error handling
      const text = await extractPdfText(source, 30000);

      // Validate extracted text
      if (!text || text.trim().length < 50) {
        logger.warn(LOG_CATEGORIES.AI, `Insufficient text extracted from form ${form.id}`, {
          length: text?.length || 0
        });
        return [{
          text: `[Warning: Form ${form.formName || form.id} contains minimal text content. This may indicate a scanned document.]`,
          formId: form.id,
          formName: form.formName || form.formNumber || 'Unnamed Form',
          formNumber: form.formNumber,
          category: form.category,
          chunkIndex: 0,
          totalChunks: 1,
          sectionType: 'general',
          importance: 'low',
          warning: true
        }];
      }

      // Use enhanced chunking with metadata
      return chunkInsuranceFormWithMetadata(text, form);
    } catch (error) {
      logger.error(LOG_CATEGORIES.AI, `Failed to process form ${form.id}`, { error });
      return [{
        text: `[Error: Could not process form ${form.formName || form.id}: ${error instanceof Error ? error.message : 'Unknown error'}]`,
        formId: form.id,
        formName: form.formName || form.formNumber || 'Unnamed Form',
        formNumber: form.formNumber,
        category: form.category,
        chunkIndex: 0,
        totalChunks: 1,
        sectionType: 'general',
        importance: 'low',
        error: true
      }];
    }
  };

  // Process forms in batches
  let completed = 0;
  const batches: typeof forms[] = [];
  for (let i = 0; i < forms.length; i += maxConcurrent) {
    batches.push(forms.slice(i, i + maxConcurrent));
  }

  for (const batch of batches) {
    const batchResults = await Promise.allSettled(batch.map(processForm));

    batchResults.forEach((result) => {
      completed++;
      if (result.status === 'fulfilled' && result.value) {
        allChunks.push(...result.value);
      }
      onProgress?.(completed, forms.length);
    });

    // Small delay between batches
    if (completed < forms.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  logger.info(LOG_CATEGORIES.AI, `Total chunks created: ${allChunks.length}`);
  return allChunks;
}

/**
 * Create a summary of all forms for context
 * @param {Array} forms - Array of form objects
 * @returns {string} - Summary text for AI context
 */
export function createFormsSummary(forms) {
  const summary = forms.map(form => {
    return `Form: ${form.formName || form.formNumber || 'Unnamed'}
Number: ${form.formNumber || 'N/A'}
Category: ${form.category || 'Unknown'}
Type: ${form.type || 'Unknown'}`;
  }).join('\n\n');
  
  return `Available Forms for Analysis:\n\n${summary}`;
}

/**
 * Estimate token count for text (rough approximation)
 * @param {string} text - Text to estimate
 * @returns {number} - Estimated token count
 */
export function estimateTokenCount(text) {
  // Rough approximation: 1 token ≈ 0.75 words
  const words = text.split(/\s+/).length;
  return Math.ceil(words / 0.75);
}
