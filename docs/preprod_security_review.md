# Pre-Production Security Review — Pass 4

**Date:** 2026-02-13

## Architecture Overview

- **Auth provider:** Firebase Authentication
- **Data store:** Firestore with security rules
- **Backend:** Cloud Functions (Node.js 22)
- **RBAC model:** Org-scoped roles stored in `orgs/{orgId}/members/{userId}`
- **Role hierarchy:** viewer → compliance → underwriter → actuary → product_manager → admin

---

## Vulnerabilities Found & Fixed

### P0 — Critical (Fixed)

#### 1. System admin email-based bypass (Firestore Rules)
- **Before:** `isSystemAdmin()` checked `request.auth.token.email == 'admin@admin.com'`
- **Risk:** Anyone registering with that email gets full admin access
- **Fix:** Changed to `request.auth.token.isSystemAdmin == true` (custom claim set by Admin SDK only)

#### 2. Collection group rules allowed cross-org reads (Firestore Rules)
- **Before:** `match /{path=**}/coverages/{coverageId} { allow read: if isAuthenticated(); }` — any user could read any org's data
- **Fix:** Restricted collection group reads to system admins only; normal queries must use org-scoped paths

#### 3. ChangeSet items lacked owner validation (Firestore Rules)
- **Before:** Any org member could add items to any draft changeset
- **Fix:** Added owner check: only changeset owner or org admin can add/remove items

#### 4. Pricing functions had NO authentication (Cloud Functions)
- **Before:** `rateCoverage` and `ratePackage` had zero auth checks
- **Fix:** Added `requireAuth` check to both functions

#### 5. publishChangeSet had no permission check (Cloud Functions)
- **Before:** Any authenticated user could publish changesets
- **Fix:** Added org membership + role check (requires `admin` or `product_manager`)

#### 6. Versioning read functions lacked org isolation (Cloud Functions)
- **Before:** `listVersions`, `getVersion`, `compareVersions` had no org membership check
- **Fix:** Added `requireOrgMembership` check to all three

#### 7. buildFilingPackage lacked org isolation (Cloud Functions)
- **Before:** Could generate filing packages for any org
- **Fix:** Added org membership check

#### 8. listUserOrgs had hardcoded email bypass (Cloud Functions)
- **Before:** `userEmail === 'admin'` granted access to all orgs
- **Fix:** Replaced with `auth.token.systemAdmin === true` custom claim check

### P1 — High (Fixed)

#### 9. Subscription delete missing org membership (Firestore Rules)
- **Fix:** Added `isOrgMember(orgId)` to subscription delete rule

#### 10. Notification read/update missing org membership (Firestore Rules)
- **Fix:** Changed `isAuthenticated()` to `isOrgMember(orgId)` for notification access

#### 11. getPublishPreflight lacked org check (Cloud Functions)
- **Fix:** Added org membership check via `getMemberRole`

---

## Security Enforcement Matrix

### Firestore Rules — Org-Scoped Collections

| Collection | Read | Write | Delete | Org Isolated |
|-----------|------|-------|--------|-------------|
| `orgs/{orgId}/products` | Org viewer | Product mgr/admin | Admin | ✅ |
| `orgs/{orgId}/products/{pid}/coverages` | Org viewer | Product mgr/admin | Admin | ✅ |
| `orgs/{orgId}/forms` | Org viewer | Product mgr/admin | Admin | ✅ |
| `orgs/{orgId}/rules` | Org viewer | Underwriter+ | Admin | ✅ |
| `orgs/{orgId}/changeSets` | Org viewer | Owner/admin (draft) | Admin | ✅ |
| `orgs/{orgId}/changeSets/{id}/items` | Org viewer | Owner/admin (draft) | Owner/admin (draft) | ✅ |
| `orgs/{orgId}/changeSets/{id}/approvals` | Org viewer | Cloud Functions only | Denied | ✅ |
| `orgs/{orgId}/threads` | Org viewer | Org member | Admin | ✅ |
| `orgs/{orgId}/subscriptions` | Org viewer | Org member | Self + org member | ✅ |
| `orgs/{orgId}/notifications` | Self + org member | Self + org member | Admin | ✅ |
| `orgs/{orgId}/tasks` | Org viewer | Org member | Admin | ✅ |
| `orgs/{orgId}/searchIndex` | Org viewer | Cloud Functions only | Cloud Functions only | ✅ |
| `orgs/{orgId}/auditLogs` | Org viewer | Org member | Denied | ✅ |

### Cloud Functions — Auth & Permission Status

| Function | Auth | Org Check | Role Check |
|----------|------|-----------|------------|
| `publishChangeSet` | ✅ | ✅ | ✅ admin/pm |
| `submitChangeSetForReview` | ✅ | ✅ | ✅ write roles |
| `approveChangeSet` | ✅ | ✅ | ✅ approval role |
| `rejectChangeSet` | ✅ | ✅ | ✅ approval role |
| `returnChangeSetToDraft` | ✅ | ✅ | ✅ write roles |
| `removeChangeSetItem` | ✅ | ✅ | ✅ write roles |
| `getPublishPreflight` | ✅ | ✅ | — |
| `createDraftVersion` | ✅ | ✅ | ✅ write roles |
| `cloneVersion` | ✅ | ✅ | ✅ write roles |
| `transitionVersionStatus` | ✅ | ✅ | ✅ write/admin |
| `updateDraftVersion` | ✅ | ✅ | ✅ write roles |
| `listVersions` | ✅ | ✅ | — |
| `getVersion` | ✅ | ✅ | — |
| `compareVersions` | ✅ | ✅ | — |
| `buildFilingPackage` | ✅ | ✅ | — |
| `rateCoverage` | ✅ | — | — |
| `ratePackage` | ✅ | — | — |
| `createOrganization` | ✅ | N/A | N/A |
| `listUserOrgs` | ✅ | Via query | System admin bypass |
| `inviteToOrg` | ✅ | ✅ | ✅ admin |
| `updateMemberRole` | ✅ | ✅ | ✅ admin |
| `removeMember` | ✅ | ✅ | ✅ admin/self |
| `setUserRole` | ✅ | — | ✅ global admin |
| `AI functions` | ✅ | — | — |
| `Search/triggers` | N/A | N/A | N/A |

---

## Remaining Considerations

1. **Legacy collections** still have broader access (`hasLegacyWriteAccess` / `hasLegacyReadAccess`). These should be sunset once migration is complete.
2. **AI functions** are intentionally global (no org context needed) but should have per-user rate limiting.
3. **Pricing functions** verify auth but don't check org membership — pricing input data is provided in the request, not read from Firestore, so this is acceptable.
4. **Audit logs** are immutable (no update/delete) — good practice.

---

## Test Commands

### Verify unauthenticated rejection
```bash
# Should return 401/unauthenticated
curl -X POST https://us-central1-insurance-product-hub.cloudfunctions.net/rateCoverage \
  -H "Content-Type: application/json" \
  -d '{"data":{"productId":"test"}}'
```

### Verify cross-org rejection (authenticated but wrong org)
```bash
# User in org-A trying to access org-B versions — should return permission-denied
firebase functions:call listVersions \
  --data '{"orgId":"org-B","entityType":"product","entityId":"p1"}'
```

### Verify publish requires admin/pm role
```bash
# Viewer trying to publish — should return permission-denied
firebase functions:call publishChangeSet \
  --data '{"orgId":"org-1","changeSetId":"cs-1"}'
```
