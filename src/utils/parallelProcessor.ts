/**
 * Parallel Processing Utility
 *
 * Provides robust parallel batch processing with:
 * - Rate limiting to avoid API throttling
 * - Exponential backoff retry logic
 * - Error handling with partial success support
 * - Progress tracking and cancellation
 * - Configurable concurrency limits
 */

import logger, { LOG_CATEGORIES } from './logger';

// ============================================================================
// Types
// ============================================================================

export interface BatchProcessorOptions {
  /** Maximum concurrent operations (default: 5) */
  concurrency?: number;
  /** Delay between batches in ms (default: 100) */
  batchDelay?: number;
  /** Maximum retries per item (default: 3) */
  maxRetries?: number;
  /** Initial retry delay in ms (default: 100) */
  initialRetryDelay?: number;
  /** Maximum retry delay in ms (default: 5000) */
  maxRetryDelay?: number;
  /** Whether to continue on errors (default: true) */
  continueOnError?: boolean;
  /** Progress callback */
  onProgress?: (completed: number, total: number, errors: number) => void;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

export interface BatchResult<T> {
  results: T[];
  errors: BatchError[];
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  durationMs: number;
}

export interface BatchError {
  index: number;
  error: Error;
  item: unknown;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_OPTIONS: Required<Omit<BatchProcessorOptions, 'onProgress' | 'signal'>> = {
  concurrency: 5,
  batchDelay: 100,
  maxRetries: 3,
  initialRetryDelay: 100,
  maxRetryDelay: 5000,
  continueOnError: true
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay
 */
const getBackoffDelay = (
  attempt: number, 
  initialDelay: number, 
  maxDelay: number
): number => {
  const delay = initialDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
};

// ============================================================================
// Main Processor Functions
// ============================================================================

/**
 * Process items in parallel batches with rate limiting and error handling
 * 
 * @param items - Array of items to process
 * @param processor - Async function to process each item
 * @param options - Processing options
 * @returns BatchResult with results and error information
 */
export async function processBatchWithRetry<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: BatchProcessorOptions = {}
): Promise<BatchResult<R>> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const results: R[] = [];
  const errors: BatchError[] = [];
  let completed = 0;

  logger.debug(LOG_CATEGORIES.AI, 'Starting batch processing', {
    totalItems: items.length,
    concurrency: opts.concurrency,
    batchDelay: opts.batchDelay
  });

  // Process in batches
  for (let i = 0; i < items.length; i += opts.concurrency) {
    // Check for cancellation
    if (opts.signal?.aborted) {
      logger.warn(LOG_CATEGORIES.AI, 'Batch processing cancelled');
      break;
    }

    const batch = items.slice(i, i + opts.concurrency);
    const batchPromises = batch.map(async (item, batchIndex) => {
      const globalIndex = i + batchIndex;
      return processItemWithRetry(item, globalIndex, processor, opts);
    });

    const batchResults = await Promise.allSettled(batchPromises);

    // Process batch results
    batchResults.forEach((result, batchIndex) => {
      const globalIndex = i + batchIndex;
      completed++;

      if (result.status === 'fulfilled') {
        results[globalIndex] = result.value;
      } else {
        const error: BatchError = {
          index: globalIndex,
          error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
          item: items[globalIndex]
        };
        errors.push(error);

        if (!opts.continueOnError) {
          throw error.error;
        }
      }
    });

    // Report progress
    opts.onProgress?.(completed, items.length, errors.length);

    // Add delay between batches (except for last batch)
    if (i + opts.concurrency < items.length) {
      await sleep(opts.batchDelay);
    }
  }

  const durationMs = Date.now() - startTime;

  logger.info(LOG_CATEGORIES.AI, 'Batch processing completed', {
    totalProcessed: completed,
    successCount: completed - errors.length,
    errorCount: errors.length,
    durationMs
  });

  return {
    results: results.filter(r => r !== undefined),
    errors,
    totalProcessed: completed,
    successCount: completed - errors.length,
    errorCount: errors.length,
    durationMs
  };
}

/**
 * Process a single item with retry logic
 */
async function processItemWithRetry<T, R>(
  item: T,
  index: number,
  processor: (item: T, index: number) => Promise<R>,
  opts: Required<Omit<BatchProcessorOptions, 'onProgress' | 'signal'>>
): Promise<R> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await processor(item, index);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < opts.maxRetries) {
        const delay = getBackoffDelay(attempt, opts.initialRetryDelay, opts.maxRetryDelay);
        logger.debug(LOG_CATEGORIES.AI, `Retry ${attempt + 1}/${opts.maxRetries} for item ${index}`, {
          delay,
          error: lastError.message
        });
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Simple parallel batch processor (no retry, for backward compatibility)
 * This matches the signature used in advancedRAGService.ts
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 5,
  delayMs: number = 100
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);

    // Add delay between batches to avoid rate limiting
    if (i + batchSize < items.length) {
      await sleep(delayMs);
    }
  }

  return results;
}

/**
 * Rate-limited processor for API calls
 * Ensures minimum delay between each call
 */
export async function processWithRateLimit<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  minDelayMs: number = 200
): Promise<R[]> {
  const results: R[] = [];

  for (const item of items) {
    const startTime = Date.now();
    const result = await processor(item);
    results.push(result);

    // Ensure minimum delay between calls
    const elapsed = Date.now() - startTime;
    if (elapsed < minDelayMs) {
      await sleep(minDelayMs - elapsed);
    }
  }

  return results;
}

/**
 * Chunked processor for large datasets
 * Processes items in chunks with optional progress reporting
 */
export async function processInChunks<T, R>(
  items: T[],
  processor: (chunk: T[]) => Promise<R[]>,
  chunkSize: number = 10,
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void
): Promise<R[]> {
  const results: R[] = [];
  const totalChunks = Math.ceil(items.length / chunkSize);

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await processor(chunk);
    results.push(...chunkResults);

    const chunkIndex = Math.floor(i / chunkSize);
    onChunkComplete?.(chunkIndex + 1, totalChunks);
  }

  return results;
}

/**
 * Concurrent map with limit
 * Like Promise.all but with concurrency control
 */
export async function mapConcurrent<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      const item = items[index];
      if (item !== undefined) {
        results[index] = await processor(item);
      }
    }
  });

  await Promise.all(workers);
  return results;
}

// Export default for convenience
export default {
  processBatchWithRetry,
  processBatch,
  processWithRateLimit,
  processInChunks,
  mapConcurrent
};

