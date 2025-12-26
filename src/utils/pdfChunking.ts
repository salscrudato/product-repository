// src/utils/pdfChunking.js
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../firebase';
import { CACHE } from '../config/constants';

// PDF processing cache to avoid reprocessing (uses centralized CACHE config)
const pdfCache = new Map();
const CACHE_TTL = CACHE.TTL_FORMS; // 10 minutes - same as forms TTL
const MAX_CACHE_SIZE = CACHE.MAX_CACHE_SIZE; // Maximum number of cached PDFs

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
 * Intelligently chunk insurance form text based on structure and content
 * @param {string} text - Insurance form text to chunk
 * @param {Object} form - Form metadata for context
 * @returns {Array<string>} - Array of intelligently chunked text
 */
export function chunkInsuranceFormText(text, form = {}) {
  // For shorter forms, return as single chunk
  if (text.length < 8000) {
    return [text];
  }

  // Insurance form section markers (common patterns)
  const sectionMarkers = [
    /^(SECTION|PART|COVERAGE|ENDORSEMENT|EXCLUSION|CONDITION|DEFINITION)\s+[A-Z0-9]/gmi,
    /^[A-Z]\.\s+/gm, // A. B. C. style sections
    /^\d+\.\s+/gm,   // 1. 2. 3. style sections
    /^[IVX]+\.\s+/gm, // Roman numerals
    /^COVERAGE\s+[A-Z]/gmi,
    /^EXCLUSIONS?/gmi,
    /^CONDITIONS?/gmi,
    /^DEFINITIONS?/gmi
  ];

  // Try to split by natural insurance form sections first
  let chunks = [];
  let currentChunk = '';
  const lines = text.split('\n');

  for (const line of lines) {
    const isNewSection = sectionMarkers.some(marker => marker.test(line));

    // If we hit a new section and current chunk is substantial, start new chunk
    if (isNewSection && currentChunk.length > 2000) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }

    // If current chunk gets too large, force a split
    if (currentChunk.length > 12000) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
  }

  // Add remaining content
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // If we didn't get good natural splits, fall back to word-based chunking
  if (chunks.length === 1 && chunks[0].length > 12000) {
    console.log(`Falling back to word-based chunking for form ${form.formName || form.id}`);
    return chunkText(text, 4000, 300); // Larger chunks with more overlap for insurance forms
  }

  // Ensure no chunk is too large
  const finalChunks = [];
  for (const chunk of chunks) {
    if (chunk.length > 15000) {
      // Split large chunks further
      const subChunks = chunkText(chunk, 4000, 300);
      finalChunks.push(...subChunks);
    } else {
      finalChunks.push(chunk);
    }
  }

  return finalChunks.length > 0 ? finalChunks : [text];
}

/**
 * Process multiple forms and create chunks with metadata
 * @param {Array} forms - Array of form objects with filePath or downloadUrl
 * @param {number} maxConcurrent - Maximum concurrent PDF processing (default: 3)
 * @returns {Promise<Array>} - Array of chunks with form metadata
 */
export async function processFormsForAnalysis(forms, maxConcurrent = 3) {
  if (!Array.isArray(forms) || forms.length === 0) {
    console.warn('No forms provided for analysis');
    return [];
  }

  const allChunks = [];
  console.log(`Processing ${forms.length} forms for analysis...`);

  // Process forms in batches to prevent overwhelming the system
  const batches = [];
  for (let i = 0; i < forms.length; i += maxConcurrent) {
    batches.push(forms.slice(i, i + maxConcurrent));
  }

  for (const [batchIndex, batch] of batches.entries()) {
    console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} forms)`);

    const batchPromises = batch.map(async (form) => {
      if (!form || !form.id) {
        console.warn('Invalid form object:', form);
        return null;
      }

      try {
        let text = '';
        console.log(`Processing form: ${form.formName || form.id}`);

        // Determine the source for PDF extraction
        let source = null;
        if (form.filePath) {
          console.log(`Extracting text from filePath: ${form.filePath}`);
          source = form.filePath;
        } else if (form.downloadUrl) {
          console.log(`Extracting text from downloadUrl: ${form.downloadUrl}`);
          source = form.downloadUrl;
        } else {
          console.warn(`Form ${form.id} has no filePath or downloadUrl`);
          return null;
        }

        // Extract text with enhanced error handling
        text = await extractPdfText(source, 30000); // 30 second timeout per form

        // Validate extracted text
        if (!text || text.trim().length < 50) {
          console.warn(`Insufficient text extracted from form ${form.id}: ${text?.length || 0} characters`);
          return [{
            text: `[Warning: Form ${form.formName || form.id} contains minimal text content (${text?.length || 0} characters). This may indicate a scanned document or processing issue.]`,
            formId: form.id,
            formName: form.formName || form.formNumber || 'Unnamed Form',
            formNumber: form.formNumber,
            category: form.category,
            chunkIndex: 0,
            totalChunks: 1,
            warning: true
          }];
        }

        // Create intelligent chunks for insurance forms
        const chunks = chunkInsuranceFormText(text, form);
        console.log(`Created ${chunks.length} chunks for form ${form.id} (${text.length} characters)`);

        return chunks.map((chunk, index) => ({
          text: chunk,
          formId: form.id,
          formName: form.formName || form.formNumber || 'Unnamed Form',
          formNumber: form.formNumber,
          category: form.category,
          chunkIndex: index,
          totalChunks: chunks.length,
          originalLength: text.length
        }));
      } catch (error) {
        console.error(`Failed to process form ${form.id}:`, error);
        // Return error chunk to indicate the form couldn't be processed
        return [{
          text: `[Error: Could not process form ${form.formName || form.id}: ${error.message}]`,
          formId: form.id,
          formName: form.formName || form.formNumber || 'Unnamed Form',
          formNumber: form.formNumber,
          category: form.category,
          chunkIndex: 0,
          totalChunks: 1,
          error: true
        }];
      }
    });

    // Wait for batch to complete
    const batchResults = await Promise.allSettled(batchPromises);

    // Process results
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        if (Array.isArray(result.value)) {
          allChunks.push(...result.value);
        }
      } else if (result.status === 'rejected') {
        const form = batch[index];
        console.error(`Batch processing failed for form ${form?.id}:`, result.reason);
        // Add error chunk for failed promise
        allChunks.push({
          text: `[Error: Processing failed for form ${form?.formName || form?.id}: ${result.reason?.message || 'Unknown error'}]`,
          formId: form?.id || 'unknown',
          formName: form?.formName || form?.formNumber || 'Unnamed Form',
          formNumber: form?.formNumber,
          category: form?.category,
          chunkIndex: 0,
          totalChunks: 1,
          error: true
        });
      }
    });

    // Small delay between batches to prevent overwhelming the system
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`Total chunks created: ${allChunks.length}`);
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
