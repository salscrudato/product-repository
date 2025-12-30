/**
 * Parallel Processing Utility
 *
 * Provides parallel batch processing with rate limiting to avoid API throttling.
 */

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Simple parallel batch processor
 * Processes items in batches with delay between batches to avoid rate limiting.
 *
 * @param items - Array of items to process
 * @param processor - Async function to process each item
 * @param batchSize - Number of items to process in parallel (default: 5)
 * @param delayMs - Delay between batches in ms (default: 100)
 * @returns Array of results
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

