# Pre-Production Data Integrity & Performance — Pass 6

**Date:** 2026-02-13

## Firestore Index Audit

### Indexes Defined
- **60+ composite indexes** covering all major query patterns
- **Collection group indexes** for cross-collection queries (members, formCoverages, clauses, etc.)
- **Search indexes** using `array-contains` on prefix tokens

### Indexes Added
- `rules(productId, targetId)` — Required for cascade delete coverage operations
- `tasks(blocking, status)` — Already existed, confirmed present

### Redundancy Notes
- Several `formCoverages` indexes have overlapping fields — consolidate after migration complete
- Collection group rules now restricted to system admins (Pass 4), reducing index pressure

---

## Publish Flow — Safety Guarantees

### Pre-Publish Checks
1. **Preflight validation** — `getPublishPreflight` checks task blockers, approval completeness
2. **Batch size limit** — Rejects change sets with >450 items (Firestore batch limit is 500; reserve 50 for metadata writes)
3. **Version pre-validation** — All version documents verified to exist before batch commit
4. **Status validation** — Only `approved` change sets can be published
5. **Permission check** — Requires `admin` or `product_manager` role (added in Pass 4)

### Atomicity
- Publish uses Firestore `WriteBatch` — all-or-nothing commit
- If any operation fails, entire publish is rolled back
- Audit log entry created after successful commit

### Determinism
- Rate programs validate determinism before individual publish
- Note: ChangeSet publish flow should be extended to re-validate rate program determinism (recommendation for future sprint)

---

## Cascade Delete Safety

### Current Behavior
- Coverage deletion cascades to: formCoverages, rules, limits, deductibles
- Uses batch operations for atomicity
- **Fixed:** Batch splitting at 450 operations to prevent Firestore limit errors

### Orphan Detection
- `detectOrphanedRecords` finds orphaned formCoverages and rules
- `validateCoverageIntegrity` checks parent coverage, forms, required coverages
- `runComprehensiveCheck` runs all validations

### Recommendations for Future
- Add scheduled Cloud Function to detect orphans weekly
- Add cascade delete trigger for coverage document deletion
- Expand orphan detection to pricing rules, state programs

---

## Caching Strategy

### Client-Side (`src/services/firebaseOptimized.ts`)
- **TTL:** 5 minutes for product data
- **Retry:** Exponential backoff (3 retries)
- **Concurrency:** Max 3 concurrent Firestore queries
- **Batch writes:** Auto-flush at 500 operations or 100ms delay
- **Cache fallback:** Serves stale data on query failure with warning

### Performance Optimization
- Code splitting via Vite manual chunks (87 chunks in production build)
- Lazy loading for heavy dependencies (PDF.js, visualization libraries)
- Service worker for static asset caching

---

## Chunk Sizes (Production Build)

| Chunk | Size | Gzipped | Notes |
|-------|------|---------|-------|
| firebase-vendor | 452 KB | 136 KB | Firebase SDK — tree-shake unused modules |
| react-vendor | 428 KB | 121 KB | React + React DOM + Router |
| CoverageScreen | 401 KB | 92 KB | **Large** — split into sub-routes recommended |
| pdfjs | 398 KB | 115 KB | Lazy-loaded only when needed |
| index (main) | 233 KB | 67 KB | App shell + routing |
| viz-vendor | 82 KB | 28 KB | D3 + react-simple-maps |
| ProductHub | 60 KB | 17 KB | Main dashboard |
| PricingScreen | 70 KB | 17 KB | Pricing builder |

### Performance Recommendations
1. **CoverageScreen (401 KB):** Split into lazy sub-routes for each tab/section
2. **Firebase SDK:** Import only used modules (`firebase/auth`, `firebase/firestore`, etc.)
3. **PDF.js:** Already lazy-loaded (good)
4. **React Query:** Consider for data fetching to reduce manual caching

---

## State Program Validation

### Pre-Activation Checks
- Required artifacts exist (forms, rules, rate programs)
- Artifact versions are approved
- All required coverage variants present

### Safety Gap Noted
- Race condition between validation and activation (no transaction)
- Recommendation: Wrap in Firestore transaction for future sprint

---

## Data Migration

### Schema V3 Migration (`migrateToSchemaV3`)
- Handles coverage schema updates
- Rate program schema normalization
- Form version metadata additions

### Repair Functions
- `recalculateProductStats` — Recomputes denormalized counters
- `recalculateCoverageStats` — Recomputes coverage counters
- `runComprehensiveCheck` — Full validation suite
