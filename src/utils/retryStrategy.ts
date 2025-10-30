/**
 * Retry Strategy
 * Provides configurable retry logic with exponential backoff and jitter
 */

import logger, { LOG_CATEGORIES } from './logger';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number;
  timeoutMs?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

/**
 * Retry result
 */
export interface RetryResult<T> {
  success: boolean;
  value?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
}

/**
 * Default retry configurations
 */
export const RETRY_CONFIGS = {
  AGGRESSIVE: {
    maxAttempts: 5,
    initialDelayMs: 100,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    jitterFactor: 0.1
  } as RetryConfig,

  MODERATE: {
    maxAttempts: 3,
    initialDelayMs: 500,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    jitterFactor: 0.2
  } as RetryConfig,

  CONSERVATIVE: {
    maxAttempts: 2,
    initialDelayMs: 1000,
    maxDelayMs: 5000,
    backoffMultiplier: 1.5,
    jitterFactor: 0.1
  } as RetryConfig,

  QUICK: {
    maxAttempts: 2,
    initialDelayMs: 100,
    maxDelayMs: 500,
    backoffMultiplier: 2,
    jitterFactor: 0.05
  } as RetryConfig
};

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
  const exponentialDelay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelayMs
  );

  const jitter = exponentialDelay * config.jitterFactor * Math.random();
  return exponentialDelay + jitter;
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = RETRY_CONFIGS.MODERATE,
  operationName: string = 'Operation'
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      logger.debug(LOG_CATEGORIES.PERFORMANCE, `${operationName} attempt ${attempt}/${config.maxAttempts}`, {
        operationName,
        attempt
      });

      const result = await fn();
      const duration = Date.now() - startTime;

      logger.debug(LOG_CATEGORIES.PERFORMANCE, `${operationName} succeeded`, {
        operationName,
        attempts: attempt,
        duration
      });

      return {
        success: true,
        value: result,
        attempts: attempt,
        totalDuration: duration
      };
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      if (config.shouldRetry && !config.shouldRetry(lastError, attempt)) {
        logger.warn(LOG_CATEGORIES.PERFORMANCE, `${operationName} failed with non-retryable error`, {
          operationName,
          attempt,
          error: lastError.message
        });

        return {
          success: false,
          error: lastError,
          attempts: attempt,
          totalDuration: Date.now() - startTime
        };
      }

      if (attempt < config.maxAttempts) {
        const delay = calculateBackoffDelay(attempt, config);

        logger.warn(LOG_CATEGORIES.PERFORMANCE, `${operationName} attempt ${attempt} failed, retrying`, {
          operationName,
          attempt,
          error: lastError.message,
          nextRetryIn: Math.round(delay)
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  const duration = Date.now() - startTime;

  logger.error(LOG_CATEGORIES.ERROR, `${operationName} failed after ${config.maxAttempts} attempts`, {}, lastError || new Error('Unknown error'));

  return {
    success: false,
    error: lastError || new Error(`${operationName} failed after ${config.maxAttempts} attempts`),
    attempts: config.maxAttempts,
    totalDuration: duration
  };
}

/**
 * Retry with timeout
 */
export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  config: RetryConfig = RETRY_CONFIGS.MODERATE,
  operationName: string = 'Operation'
): Promise<RetryResult<T>> {
  const timeoutMs = config.timeoutMs || 60000;

  return Promise.race([
    retry(fn, config, operationName),
    new Promise<RetryResult<T>>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
}

/**
 * Retry with circuit breaker pattern
 */
export class CircuitBreaker {
  private failureCount: number = 0;
  private successCount: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(
    failureThreshold: number = 5,
    successThreshold: number = 2,
    resetTimeoutMs: number = 60000
  ) {
    this.failureThreshold = failureThreshold;
    this.successThreshold = successThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
  }

  /**
   * Execute function with circuit breaker
   */
  async execute<T>(
    fn: () => Promise<T>,
    operationName: string = 'Operation'
  ): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        logger.info(LOG_CATEGORIES.PERFORMANCE, `Circuit breaker entering HALF_OPEN state`, {
          operationName
        });
      } else {
        throw new Error(`Circuit breaker is OPEN for ${operationName}`);
      }
    }

    try {
      const result = await fn();

      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        if (this.successCount >= this.successThreshold) {
          this.state = 'CLOSED';
          this.failureCount = 0;
          this.successCount = 0;
          logger.info(LOG_CATEGORIES.PERFORMANCE, `Circuit breaker reset to CLOSED`, {
            operationName
          });
        }
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
        logger.error(LOG_CATEGORIES.ERROR, `Circuit breaker opened`, {}, error as Error);
      }

      throw error;
    }
  }

  /**
   * Get circuit breaker state
   */
  getState(): string {
    return this.state;
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

