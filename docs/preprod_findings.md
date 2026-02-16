# Pre-Production Findings — Pass 1

**Date:** 2026-02-13
**Reviewer:** Automated pre-prod hardening sweep
**Build status:** ✅ Passes (12.4s, 87 chunks)
**Tests:** 700 passed, 1 failed, 1 suite error (of 25 suites)
**TypeScript:** 243 type errors (build succeeds via Vite tolerant mode)

---

## P0 — Must Fix Before Production

### P0-1: System admin check uses email string matching (Security)
**Location:** `firestore.rules` lines 19–23
**Issue:** `isSystemAdmin()` checks `request.auth.token.email == 'admin@admin.com'`. An attacker who registers with that email bypasses all RBAC.
**Fix:** Replace with custom claims (`request.auth.token.isSystemAdmin == true`) set only via admin SDK in Cloud Functions.

### P0-2: Collection group rules allow cross-org reads (Security)
**Location:** `firestore.rules` lines 714–742
**Issue:** `match /{path=**}/coverages/{coverageId} { allow read: if isAuthenticated(); }` — any authenticated user can read any org's coverages via collection group queries. Same for limits, deductibles, forms, chunks, sections, threads, comments, tasks, etc.
**Fix:** Add org isolation checks or restrict collection group queries to require org membership.

### P0-3: 243 TypeScript errors (Correctness)
**Issue:** `tsc --noEmit` reports 243 errors across ~30 files. While Vite's build tolerates these (it strips types), they indicate real bugs: missing properties, wrong argument counts, type mismatches, missing exports.
**Key files with errors:**
- `src/services/index.ts` — missing/wrong exports (coverageFormLinkService, getCoverageReadinessScore, stateAvailabilityService, dataDictionaryService)
- `src/services/product360ReadModel.ts` — imports from `@types/index` (wrong path)
- `src/services/rateProgramService.ts` — `valid` vs `isValid` property name mismatch
- `src/services/coverageRulesService.ts` — missing `RuleType` export, wrong property names
- `src/services/auditService.ts` — unsafe type assertions
- `src/types/index.ts` — duplicate export names (ConditionGroup, ConditionOperator, DataDictionaryField)
- `src/types/limitOptions.ts` — conflicting re-export of SublimitValue
- `src/schemas/index.ts` — wrong argument count
- `src/repositories/baseRepository.ts` — ZodError.errors property access
- `src/pages/Product360.tsx` — multiple type mismatches
- `src/pages/QuoteSandbox.tsx` — boolean assigned to string prop
- `src/pages/UnderwritingRules.tsx` — wrong component type
- `src/utils/pdfChunking.ts` — untyped fetch response
- `src/utils/limitValidation.ts` — property `amount` doesn't exist on union
- `vite.config.ts` — Plugin type mismatch
**Fix:** Fix all type errors. Prioritize service/type/schema errors (runtime risk), then page-level, then config.

### P0-4: ChangeSet items lack owner validation (Security)
**Location:** `firestore.rules` lines 586–590
**Issue:** Any org member can add items to any draft change set, not just the owner. This allows unauthorized modifications to change sets pending review.
**Fix:** Add `get(...changeSets...).data.ownerUserId == request.auth.uid` check.

### P0-5: Test failure — `isReadyToPublish` returns false when it should return true (Correctness)
**Location:** `src/__tests__/limitOptions.test.ts` line 273
**Issue:** `isReadyToPublish(optionSet, options)` returns `false` for what should be a valid option set. This indicates a bug in publish-readiness validation that could block legitimate publishes.
**Fix:** Debug `isReadyToPublish` logic — likely a missing field or wrong validation condition.

---

## P1 — Should Fix Before Production

### P1-1: Legacy collections have overly broad access (Security)
**Location:** `firestore.rules` — `hasLegacyReadAccess()` / `hasLegacyWriteAccess()`
**Issue:** Legacy paths allow any authenticated user to read; write checks use global roles instead of org-scoped roles.
**Fix:** Migrate to org-scoped collections or add org isolation to legacy rules.

### P1-2: Functions security test suite broken (Testing)
**Location:** `functions/__tests__/security.rules.test.js`
**Issue:** Uses Jest globals (`beforeAll`) but runs in Vitest, which doesn't define them. The security rules test suite is completely non-functional.
**Fix:** Either configure Vitest to include globals or migrate to Vitest API (`import { beforeAll } from 'vitest'`).

### P1-3: Inconsistent error handling across services (Reliability)
**Issue:** Services use a mix of: try-catch with logger, returning null on error, throwing, or no error handling at all. No standardized error taxonomy or user-facing error messages.
**Fix:** Establish `AppError` base class with error codes and user-facing messages. Standardize service error patterns.

### P1-4: No correlation IDs for critical operations (Observability)
**Issue:** Publish, AI calls, imports, and exports have no request-level correlation ID. Impossible to trace a request end-to-end in logs.
**Fix:** Add `correlationId` (UUID) to all critical operations, pass through service → cloud function → response.

### P1-5: Design system fragmentation — 3 competing style systems (UX)
**Issue:** Three parallel style systems exist:
1. `src/ui/tokens.ts` + `src/ui/components.tsx` (v2, preferred)
2. `src/components/common/DesignSystem.tsx` (legacy)
3. `src/styles/tokens.ts` + `src/styles/GlobalStyle.ts` (another legacy)
Components arbitrarily use any of these, resulting in inconsistent spacing, colors, typography, and shadows across the app.
**Fix:** Consolidate to `src/ui/` as the single source of truth. Migrate all components.

### P1-6: Hardcoded colors/spacing throughout components (UX)
**Issue:** Many components hardcode hex colors (`#6366f1`, `#10b981`, `#ef4444`), pixel values (`padding: 20px`), and shadows instead of using design tokens.
**Fix:** Replace all hardcoded values with token references.

### P1-7: Missing loading/error/empty states on many screens (UX/Reliability)
**Issue:** Several pages/components lack proper loading skeletons, error states, or empty states:
- ProductHub: no loading state for initial fetch
- ProductExplorer: no visible loading
- Many list views have no empty state
- Error states often show raw error messages
**Fix:** Add `Skeleton`, `EmptyState`, and error boundaries with actionable messages to every screen.

### P1-8: CoverageScreen chunk is 400KB gzipped at 92KB (Performance)
**Location:** `build/assets/CoverageScreen-CSW_zVDj.js` — 400.84 KB
**Issue:** Single component produces a massive chunk. Likely includes embedded data or deeply nested component tree without code splitting.
**Fix:** Analyze imports, split into lazy-loaded sub-routes, extract heavy dependencies.

### P1-9: Subscription/notification rules missing org membership check (Security)
**Location:** `firestore.rules` — subscription delete and notification read rules
**Issue:** Users can delete subscriptions or read notifications by matching `userId` without org membership validation.
**Fix:** Add `isOrgMember(orgId)` check.

### P1-10: Missing input validation in most services (Correctness)
**Issue:** Most services accept parameters and write to Firestore without runtime validation. TypeScript types provide compile-time checks but not runtime safety.
**Fix:** Add Zod validation at service boundaries (schemas already exist in `src/schemas/`).

---

## P2 — Nice to Have / Polish

### P2-1: Accessibility gaps
- Many icon buttons lack `aria-label`
- Focus ring styles inconsistent
- `LiveRegion` exists but rarely used for dynamic content
- Modal focus trapping not consistently implemented
- Heading hierarchy may skip levels

### P2-2: Bundle optimization opportunities
- `react-vendor` chunk: 428KB (120KB gzip) — React 18, could benefit from React compiler
- `firebase-vendor` chunk: 452KB (136KB gzip) — could tree-shake unused Firebase modules
- `pdfjs` chunk: 398KB (115KB gzip) — lazy load only when needed

### P2-3: `orgService.ts` dual import (static + dynamic)
- Vite warns that `orgService.ts` is both statically and dynamically imported, preventing chunk optimization.

### P2-4: Service worker (`public/sw.js`) — verify caching strategy
- Ensure SW doesn't serve stale API responses or cached Firebase auth tokens.

### P2-5: No rate limiting on client-side AI calls
- AI endpoints should have client-visible rate limiting and cost feedback.

### P2-6: Duplicate component declarations
- `ErrorBoundary` exists at both `src/components/ErrorBoundary.tsx` and `src/components/ErrorBoundary/ErrorBoundary.tsx`
- `CommandPalette` exists in both `src/components/ui/CommandPalette.tsx` and possibly `src/components/CommandPalette/`

---

## Inventory Summary

| Category | Count |
|---|---|
| Routes | 40+ |
| Pages | 24 |
| Components | 90+ |
| Services | 45+ |
| Engines | 11 |
| Cloud Functions | 50+ (callable + triggers) |
| Type files | 32 |
| Test files | 25 |
| Test cases | 701 |

## Next Steps
- **Pass 2:** Fix all P0 items, then proceed to UX unification
- **Pass 3:** Reliability + observability hardening
- **Pass 4:** Security verification with test scripts
- **Pass 5:** API endpoint verification
- **Pass 6:** Data integrity + performance
- **Pass 7:** Production readiness checklist
