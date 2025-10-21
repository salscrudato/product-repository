/**
 * Firebase Retry Utility
 * Provides retry logic with exponential backoff for Firebase operations
 */

import logger, { LOG_CATEGORIES } from './logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  timeoutMs?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  timeoutMs: 10000
};

/**
 * Retry a Firebase operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delay = config.initialDelayMs;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Add timeout to operation
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Operation timeout after ${config.timeoutMs}ms`)),
            config.timeoutMs
          )
        )
      ]);

      if (attempt > 0) {
        logger.info(LOG_CATEGORIES.FIREBASE, `${operationName} succeeded after ${attempt} retries`);
      }

      return result;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (isNonRetryableError(error)) {
        logger.error(LOG_CATEGORIES.FIREBASE, `${operationName} failed with non-retryable error`, {}, error as Error);
        throw error;
      }

      if (attempt < config.maxRetries) {
        logger.warn(LOG_CATEGORIES.FIREBASE, `${operationName} attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
          attempt,
          delay,
          error: (error as Error).message
        });

        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
      }
    }
  }

  logger.error(LOG_CATEGORIES.FIREBASE, `${operationName} failed after ${config.maxRetries + 1} attempts`, {
    maxRetries: config.maxRetries
  }, lastError || new Error('Unknown error'));

  throw lastError || new Error(`${operationName} failed after ${config.maxRetries + 1} attempts`);
}

/**
 * Check if an error is retryable
 */
function isNonRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  const nonRetryablePatterns = [
    'permission-denied',
    'invalid-argument',
    'not-found',
    'already-exists',
    'unauthenticated',
    'failed-precondition'
  ];

  return nonRetryablePatterns.some(pattern => message.includes(pattern));
}

/**
 * Batch Firebase operations with retry logic
 */
export async function withBatchRetry<T>(
  operations: Array<() => Promise<T>>,
  operationName: string,
  options: RetryOptions = {}
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < operations.length; i++) {
    try {
      const result = await withRetry(operations[i], `${operationName}[${i}]`, options);
      results.push(result);
    } catch (error) {
      logger.error(LOG_CATEGORIES.FIREBASE, `Batch operation ${i} failed`, { operationName, index: i }, error as Error);
      throw error;
    }
  }

  return results;
}

/**
 * Retry with circuit breaker pattern
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold: number = 5,
    private resetTimeoutMs: number = 60000
  ) {}

  async execute<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - (this.lastFailureTime || 0) > this.resetTimeoutMs) {
        this.state = 'half-open';
        logger.info(LOG_CATEGORIES.FIREBASE, `Circuit breaker entering half-open state for ${operationName}`);
      } else {
        throw new Error(`Circuit breaker is open for ${operationName}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(operationName);
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure(operationName: string): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      logger.warn(LOG_CATEGORIES.FIREBASE, `Circuit breaker opened for ${operationName}`, {
        failureCount: this.failureCount
      });
    }
  }

  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'closed';
  }
}

