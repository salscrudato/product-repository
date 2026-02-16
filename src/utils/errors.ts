/**
 * Standardized Application Error Classes
 *
 * Provides structured error handling with:
 * - Machine-readable error codes for programmatic handling
 * - User-friendly messages safe to display in the UI
 * - Retryable flag so callers know whether to offer "Try again"
 * - Optional details bag for diagnostics (logged, never shown to user)
 */

// ── Error Codes ─────────────────────────────────────────────────────────────

export const ErrorCodes = {
  // Network / infra
  NETWORK_ERROR: 'NETWORK_ERROR',
  FIRESTORE_QUOTA: 'FIRESTORE_QUOTA',

  // Auth
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  // Data
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  CONFLICT: 'CONFLICT',

  // Change-set workflow
  PUBLISH_FAILED: 'PUBLISH_FAILED',

  // AI
  AI_TIMEOUT: 'AI_TIMEOUT',
  AI_RATE_LIMIT: 'AI_RATE_LIMIT',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ── User-facing message map ─────────────────────────────────────────────────

const USER_MESSAGES: Record<string, string> = {
  [ErrorCodes.NETWORK_ERROR]:
    'A network error occurred. Please check your connection and try again.',
  [ErrorCodes.FIRESTORE_QUOTA]:
    'The system is experiencing high load. Please wait a moment and try again.',
  [ErrorCodes.AUTH_EXPIRED]:
    'Your session has expired. Please sign in again.',
  [ErrorCodes.PERMISSION_DENIED]:
    'You do not have permission to perform this action.',
  [ErrorCodes.NOT_FOUND]:
    'The requested resource was not found.',
  [ErrorCodes.VALIDATION_FAILED]:
    'Some fields are invalid. Please review and correct them.',
  [ErrorCodes.CONFLICT]:
    'This resource was modified by someone else. Please refresh and try again.',
  [ErrorCodes.PUBLISH_FAILED]:
    'Publishing failed. Please check the change set and try again.',
  [ErrorCodes.AI_TIMEOUT]:
    'The AI request took too long. Please try again with a simpler prompt.',
  [ErrorCodes.AI_RATE_LIMIT]:
    'AI request limit reached. Please wait a moment before trying again.',
};

/**
 * Get a user-safe message for a given error code.
 * Falls back to a generic message for unknown codes.
 */
export function getUserMessage(code: string): string {
  return USER_MESSAGES[code] ?? 'An unexpected error occurred. Please try again.';
}

// ── Retryable codes ─────────────────────────────────────────────────────────

const RETRYABLE_CODES = new Set<string>([
  ErrorCodes.NETWORK_ERROR,
  ErrorCodes.FIRESTORE_QUOTA,
  ErrorCodes.AI_TIMEOUT,
  ErrorCodes.AI_RATE_LIMIT,
  ErrorCodes.PUBLISH_FAILED,
]);

// ── AppError ────────────────────────────────────────────────────────────────

/**
 * Structured application error.
 *
 * `code`        — machine-readable, one of ErrorCodes (or custom string)
 * `message`     — technical message for logs / developers
 * `userMessage` — safe to show in the UI
 * `details`     — optional diagnostic payload (logged, never shown)
 * `retryable`   — hint to the UI: should we offer a "Try again" button?
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly details?: Record<string, unknown>;
  public readonly retryable: boolean;

  constructor(
    code: string,
    message: string,
    userMessage?: string,
    details?: Record<string, unknown>,
    retryable?: boolean,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage ?? getUserMessage(code);
    this.details = details;
    this.retryable = retryable ?? RETRYABLE_CODES.has(code);
  }
}

// ── Helper: wrap unknown catch values ───────────────────────────────────────

/**
 * Normalise an unknown `catch` value into an AppError.
 * If it's already an AppError it passes through unchanged.
 */
export function toAppError(err: unknown, fallbackCode: string = ErrorCodes.NETWORK_ERROR): AppError {
  if (err instanceof AppError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new AppError(fallbackCode, message);
}
