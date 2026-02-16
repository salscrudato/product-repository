# Production Readiness Checklist — Pass 7

**Date:** 2026-02-13
**Project:** Product Reinvention Hub (P&C Insurance Product Management)

---

## Final Verification Results

| Check | Status | Details |
|-------|--------|---------|
| TypeScript (`tsc --noEmit`) | **0 errors** | Down from 243 at start |
| Build (`vite build`) | **Passes** | 12s, 87 chunks |
| Tests (`vitest run`) | **24/24 suites, 701/701 tests** | Down from 2 failures at start |
| Firestore Rules | **Hardened** | 11 vulnerabilities fixed |
| Cloud Functions Auth | **Hardened** | All endpoints require auth + org checks |
| Security Headers | **Complete** | CSP, HSTS, X-Frame-Options, Permissions-Policy |

---

## Environment Configuration

### Firebase Projects
```
.firebaserc:
  default → insurance-product-hub (dev)
  staging → insurance-product-hub-staging (create this)
  prod    → insurance-product-hub-prod (create this)
```

### Required Environment Variables (Client)
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

### Required Secrets (Cloud Functions)
```bash
firebase functions:secrets:set OPENAI_KEY --project prod
```

### Emulator Configuration
```
Auth:      port 9099
Firestore: port 8080
Functions: port 5001
Storage:   port 9199
UI:        port 4000
```

---

## Deployment Checklist

### Phase 1: Infrastructure Setup
- [ ] Create `insurance-product-hub-staging` Firebase project
- [ ] Create `insurance-product-hub-prod` Firebase project
- [ ] Set environment variables in each project
- [ ] Set `OPENAI_KEY` secret in each project
- [ ] Configure custom domain for hosting (if applicable)
- [ ] Set up `isSystemAdmin` custom claim for admin users via Admin SDK

### Phase 2: Pre-Deploy Verification
- [ ] Run `npm ci` (clean install from lockfile)
- [ ] Run `npx tsc --noEmit` — verify 0 errors
- [ ] Run `npx vitest run` — verify all tests pass
- [ ] Run `npm run build` — verify build succeeds
- [ ] Review `firestore.rules` for correctness
- [ ] Review `storage.rules` for correctness

### Phase 3: Deploy (Order Matters)

```bash
# 1. Switch to production project
firebase use prod

# 2. Deploy Firestore rules and indexes FIRST
firebase deploy --only firestore:rules,firestore:indexes --project prod

# 3. Deploy Storage rules
firebase deploy --only storage --project prod

# 4. Deploy Cloud Functions
cd functions && npm ci && cd ..
firebase deploy --only functions --project prod

# 5. Build and deploy Hosting LAST
npm run build
firebase deploy --only hosting --project prod
```

### Phase 4: Post-Deploy Verification
- [ ] Navigate to production URL — verify app loads
- [ ] Sign in — verify auth flow
- [ ] Create/join an org — verify org flow
- [ ] View products — verify data loads
- [ ] Test RBAC — verify viewer cannot write
- [ ] Test API endpoints — run `./scripts/verify_endpoints.sh --prod --token $TOKEN`
- [ ] Check browser console — verify no errors
- [ ] Check Cloud Functions logs — verify no errors
- [ ] Verify CSP header is present (DevTools → Network → Response Headers)
- [ ] Verify HSTS header is present

### Phase 5: Monitoring Setup
- [ ] Enable Firebase Performance Monitoring
- [ ] Set up Cloud Functions error alerts
- [ ] Set up billing alerts
- [ ] Monitor Firestore usage (reads/writes/deletes)
- [ ] Monitor Cloud Functions invocation counts

---

## Security Configuration Summary

### Firestore Rules
- System admin: custom claim (`isSystemAdmin: true`), NOT email-based
- Org isolation: all data under `orgs/{orgId}/...`
- Role hierarchy: viewer → compliance → underwriter → actuary → product_manager → admin
- Collection group reads: restricted to system admins
- Audit logs: immutable (no update/delete)
- Approvals: Cloud Functions only

### Cloud Functions
- All callable functions require authentication
- Org-scoped functions verify membership
- Write operations verify appropriate role
- Publish requires admin or product_manager
- Correlation IDs for traceability

### Hosting Headers
- `Content-Security-Policy` — restricts script/style/connect sources
- `Strict-Transport-Security` — enforces HTTPS
- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Permissions-Policy` — disables camera/microphone/geolocation/payment

---

## Build Configuration

### Production Optimizations
- **Terser minification** with `drop_console: true` (no console logs in prod)
- **Hidden source maps** (generated but not referenced)
- **CSS code splitting** enabled
- **Manual chunk splitting** for optimal caching:
  - `react-vendor` — React/Router (changes rarely)
  - `firebase-vendor` — Firebase SDK (changes rarely)
  - `pdfjs` — PDF.js (lazy loaded)
  - `viz-vendor` — D3/maps (lazy loaded)
  - Per-page chunks — each route loads independently

### Cache Strategy
- Static assets: `max-age=31536000, immutable` (1 year, content-hashed filenames)
- HTML: `no-cache, no-store, must-revalidate` (always fresh)
- Service worker: versioned cache with cleanup on activate

---

## Known Limitations

1. **Single CoverageScreen chunk (401KB gzip 92KB):** Large but functional. Split into sub-routes for optimization in a future sprint.
2. **Legacy collections:** Still accessible with broader rules. Plan migration timeline.
3. **AI functions:** No per-user rate limiting. Add in production monitoring phase.
4. **TypeScript strict mode disabled:** Zero errors currently, but strict mode would catch more issues. Enable gradually.

---

## Documentation Produced

| Document | Description |
|----------|-------------|
| `/docs/preprod_findings.md` | Pass 1: Baseline inventory and findings |
| `/docs/preprod_ui_changes.md` | Pass 2: UX unification and design system migration |
| `/docs/preprod_observability.md` | Pass 3: Correlation IDs, error taxonomy, tracing |
| `/docs/preprod_security_review.md` | Pass 4: Security audit, RBAC verification |
| `/docs/preprod_api_verification.md` | Pass 5: All 37+ endpoints documented |
| `/docs/preprod_data_integrity.md` | Pass 6: Index audit, cascade safety, performance |
| `/docs/production_readiness.md` | Pass 7: This document — deployment checklist |
| `/scripts/verify_endpoints.sh` | Executable endpoint verification script |
