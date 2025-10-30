/**
 * AI Timeout Utilities
 * Handles timeouts for AI API calls with Promise.race and graceful degradation
 */

import logger, { LOG_CATEGORIES } from './logger';

/**
 * Timeout error
 */
export class TimeoutError extends Error {
  constructor(message: string = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Create a timeout promise that rejects after specified duration
 */
export function createTimeoutPromise<T>(
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(timeoutMessage));
    }, timeoutMs);
  });
}

/**
 * Execute promise with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string = 'Operation'
): Promise<T> {
  try {
    return await Promise.race([
      promise,
      createTimeoutPromise<T>(
        timeoutMs,
        `${operationName} timed out after ${timeoutMs}ms`
      )
    ]);
  } catch (error) {
    if (error instanceof TimeoutError) {
      logger.warn(LOG_CATEGORIES.AI, `${operationName} timeout`, {
        timeoutMs,
        operationName
      });
    }
    throw error;
  }
}

/**
 * Execute promise with timeout and fallback
 */
export async function withTimeoutAndFallback<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallbackValue: T,
  operationName: string = 'Operation'
): Promise<T> {
  try {
    return await withTimeout(promise, timeoutMs, operationName);
  } catch (error) {
    if (error instanceof TimeoutError) {
      logger.warn(LOG_CATEGORIES.AI, `${operationName} timeout, using fallback`, {
        timeoutMs,
        operationName
      });
      return fallbackValue;
    }
    throw error;
  }
}

/**
 * Retry promise with timeout
 */
export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  timeoutMs: number;
}

export async function withTimeoutAndRetry<T>(
  promiseFn: () => Promise<T>,
  options: RetryOptions,
  operationName: string = 'Operation'
): Promise<T> {
  let lastError: Error | null = null;
  let delay = options.delayMs;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      logger.debug(LOG_CATEGORIES.AI, `${operationName} attempt ${attempt}/${options.maxAttempts}`, {
        operationName,
        attempt
      });

      return await withTimeout(
        promiseFn(),
        options.timeoutMs,
        `${operationName} (attempt ${attempt})`
      );
    } catch (error) {
      lastError = error as Error;

      if (attempt < options.maxAttempts) {
        logger.warn(LOG_CATEGORIES.AI, `${operationName} attempt ${attempt} failed, retrying`, {
          operationName,
          attempt,
          error: (error as Error).message,
          nextRetryIn: delay
        });

        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= options.backoffMultiplier;
      }
    }
  }

  logger.error(LOG_CATEGORIES.ERROR, `${operationName} failed after ${options.maxAttempts} attempts`, {}, lastError || new Error('Unknown error'));
  throw lastError || new Error(`${operationName} failed after ${options.maxAttempts} attempts`);
}

/**
 * Abort controller wrapper for fetch-based timeouts
 */
export function createAbortController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Store timeout ID for cleanup
  (controller as any).__timeoutId = timeoutId;

  return controller;
}

/**
 * Clean up abort controller
 */
export function cleanupAbortController(controller: AbortController): void {
  const timeoutId = (controller as any).__timeoutId;
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;
  const controller = createAbortController(timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    cleanupAbortController(controller);
    return response;
  } catch (error) {
    cleanupAbortController(controller);
    if ((error as Error).name === 'AbortError') {
      throw new TimeoutError(`Fetch request timed out after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Default retry options for AI operations
 */
export const DEFAULT_AI_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  timeoutMs: 45000
};

/**
 * Aggressive retry options for critical operations
 */
export const AGGRESSIVE_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 5,
  delayMs: 500,
  backoffMultiplier: 1.5,
  timeoutMs: 60000
};

/**
 * Quick retry options for fast operations
 */
export const QUICK_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 2,
  delayMs: 500,
  backoffMultiplier: 1,
  timeoutMs: 15000
};

