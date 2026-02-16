# Pre-Production Observability — Pass 3

**Date:** 2026-02-13

## Correlation ID System

### Design
Every critical operation (publish, approve, reject, AI calls, imports, exports) now generates a unique correlation ID that travels with the request from client → Cloud Function → response → logs.

**Format:** `corr-{timestamp-base36}-{random-hex}` (e.g., `corr-lx3f9k2-a8b3c1`)

### Client Side (`src/utils/logger.ts`)
- `generateCorrelationId()` — generates IDs client-side
- `logger.withCorrelation(id)` — returns a `ScopedLogger` that injects the correlation ID into every log entry
- All structured log entries include `correlationId` when present

### Server Side (`functions/src/utils/logger.js`)
- `generateCorrelationId()` — generates IDs server-side (crypto.randomBytes)
- `extractCorrelationId(dataOrReq)` — extracts from: callable data, HTTP `x-correlation-id` header, or auto-generates
- `logger.withCorrelation(id)` — server-side scoped logger

### How to Trace an Operation End-to-End

1. **Find the correlation ID:** Visible in client console logs and in Cloud Function structured logs
2. **Client logs:** Search browser console for the correlation ID
3. **Server logs:** In Cloud Logging: `jsonPayload.correlationId = "corr-xxx"`
4. **Full trace:** Client generates ID → passes to callable → Cloud Function logs with same ID → returns ID in response

Example for a ChangeSet publish:
```
[Client] corr-lx3f9k2-a8b3c1 | CHANGESET | Publishing change set cs-123
[Server] corr-lx3f9k2-a8b3c1 | publishChangeSet | Starting preflight checks
[Server] corr-lx3f9k2-a8b3c1 | publishChangeSet | Preflight passed, 5 items
[Server] corr-lx3f9k2-a8b3c1 | publishChangeSet | Published successfully
[Client] corr-lx3f9k2-a8b3c1 | CHANGESET | Publish complete
```

---

## Standardized Error Taxonomy (`src/utils/errors.ts`)

### AppError Class
```typescript
class AppError extends Error {
  code: string;        // Machine-readable (e.g., 'PUBLISH_FAILED')
  userMessage: string; // Human-friendly (e.g., 'Publishing failed. Please check the preflight report.')
  details?: Record<string, unknown>;
  retryable: boolean;
}
```

### Error Codes
| Code | User Message | Retryable |
|------|-------------|-----------|
| NETWORK_ERROR | Check your internet connection and try again. | Yes |
| AUTH_EXPIRED | Your session has expired. Please sign in again. | No |
| PERMISSION_DENIED | You don't have permission. Contact your admin. | No |
| NOT_FOUND | The requested item was not found. | No |
| VALIDATION_FAILED | Please review the form for errors. | No |
| PUBLISH_FAILED | Publishing failed. Check the preflight report. | Yes |
| AI_TIMEOUT | The AI service is taking too long. Try again. | Yes |
| AI_RATE_LIMIT | AI request limit reached. Wait a moment. | Yes |
| FIRESTORE_QUOTA | Service is temporarily busy. Try again shortly. | Yes |
| CONFLICT | This item was modified by someone else. Refresh. | No |

### Error Normalization
`toAppError(err: unknown)` converts any caught error into a structured `AppError`, extracting Firebase error codes and mapping them appropriately.

---

## Error Handling Middleware (Cloud Functions)

`functions/src/middleware/errorHandler.js`:
- `withErrorHandling(handler)` wraps callable handlers with:
  - Automatic correlation ID extraction/generation
  - Scoped logger injection
  - Structured error responses with correlation ID
  - Automatic Firebase error code mapping

---

## Critical Flows with Correlation IDs

| Flow | Service Method | Has Correlation ID |
|------|---------------|-------------------|
| Publish ChangeSet | `changeSetService.publishChangeSet` | ✅ |
| Submit for Review | `changeSetService.submitForReview` | ✅ |
| Approve ChangeSet | `changeSetService.approveChangeSet` | ✅ |
| Reject ChangeSet | `changeSetService.rejectChangeSet` | ✅ |

---

## PII Protection
- Logger never automatically logs user emails or PII
- `auth.uid` is logged (not PII — it's an opaque ID)
- Cloud Function logs redact request bodies by default
- Console logging stripped in production build (`drop_console: true` in terser config)
