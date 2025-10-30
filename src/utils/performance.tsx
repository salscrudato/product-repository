/**
 * Utility Functions
 * Common utility functions for the application
 */

/**
 * Debounce function - delays execution until after wait time has elapsed
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @param immediate - Execute on leading edge instead of trailing
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
  immediate: boolean = false
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>): void {
    const later = (): void => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
};

/**
 * Throttle function - ensures function is called at most once per wait period
 * @param func - Function to throttle
 * @param wait - Wait time in milliseconds
 */
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;

  return function executedFunction(...args: Parameters<T>): void {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, wait);
    }
  };
};

/**
 * Query debouncer for Firestore queries
 * Prevents excessive query executions during rapid input changes
 */
export class QueryDebouncer {
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private lastQueryTime: Map<string, number> = new Map();
  private minQueryInterval: number;

  constructor(minQueryInterval: number = 300) {
    this.minQueryInterval = minQueryInterval;
  }

  /**
   * Debounce a query execution
   * @param queryKey - Unique key for this query
   * @param queryFn - Function that executes the query
   * @param wait - Debounce wait time in milliseconds
   */
  debounceQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    wait: number = 300
  ): Promise<T | null> {
    return new Promise((resolve) => {
      // Clear existing timer for this query
      const existingTimer = this.debounceTimers.get(queryKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Check if minimum interval has passed
      const lastTime = this.lastQueryTime.get(queryKey) || 0;
      const timeSinceLastQuery = Date.now() - lastTime;

      if (timeSinceLastQuery < this.minQueryInterval) {
        // Not enough time has passed, schedule for later
        const timer = setTimeout(async () => {
          this.lastQueryTime.set(queryKey, Date.now());
          this.debounceTimers.delete(queryKey);
          try {
            const result = await queryFn();
            resolve(result);
          } catch (error) {
            console.error(`Query ${queryKey} failed:`, error);
            resolve(null);
          }
        }, wait);
        this.debounceTimers.set(queryKey, timer);
      } else {
        // Enough time has passed, execute immediately
        this.lastQueryTime.set(queryKey, Date.now());
        queryFn()
          .then(resolve)
          .catch((error) => {
            console.error(`Query ${queryKey} failed:`, error);
            resolve(null);
          });
      }
    });
  }

  /**
   * Cancel a pending query
   */
  cancelQuery(queryKey: string): void {
    const timer = this.debounceTimers.get(queryKey);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(queryKey);
    }
  }

  /**
   * Cancel all pending queries
   */
  cancelAll(): void {
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}

/**
 * Create a singleton query debouncer instance
 */
export const queryDebouncer = new QueryDebouncer(300);

export default { debounce, throttle };
