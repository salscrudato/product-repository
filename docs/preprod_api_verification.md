# Pre-Production API Verification — insurance-product-hub

> **Last updated:** 2026-02-13
> **Project:** `insurance-product-hub` (Firebase)
> **Region:** `us-central1`
> **Production URL:** `https://us-central1-insurance-product-hub.cloudfunctions.net/`
> **Emulator URL:** `http://127.0.0.1:5001/insurance-product-hub/us-central1/`

---

## Table of Contents

1. [Endpoint Inventory](#endpoint-inventory)
2. [Running the Verification Script](#running-the-verification-script)
3. [Authentication & Tokens](#authentication--tokens)
4. [Expected Outcomes by Endpoint](#expected-outcomes-by-endpoint)
5. [Trigger Functions (Not Directly Testable)](#trigger-functions-not-directly-testable)
6. [Curl Examples](#curl-examples)
7. [Notes & Caveats](#notes--caveats)

---

## Endpoint Inventory

### Callable Cloud Functions (37 total)

| # | Function Name | Category | Auth Required | Org-Scoped | Role Required | Key Inputs |
|---|---|---|---|---|---|---|
| 1 | `submitChangeSetForReview` | ChangeSet | Yes | Yes | org writer | `orgId`, `changeSetId` |
| 2 | `returnChangeSetToDraft` | ChangeSet | Yes | Yes | org writer | `orgId`, `changeSetId`, `reason?` |
| 3 | `approveChangeSet` | ChangeSet | Yes | Yes | approval role | `orgId`, `changeSetId`, `role`, `notes?` |
| 4 | `rejectChangeSet` | ChangeSet | Yes | Yes | approval role | `orgId`, `changeSetId`, `role`, `notes` |
| 5 | `publishChangeSet` | ChangeSet | Yes | Yes | admin / product_manager | `orgId`, `changeSetId` |
| 6 | `removeChangeSetItem` | ChangeSet | Yes | Yes | org writer | `orgId`, `changeSetId`, `itemId` |
| 7 | `getPublishPreflight` | ChangeSet | Yes | Yes | org member | `orgId`, `changeSetId` |
| 8 | `listVersions` | Versioning | Yes | Yes | org member | `orgId`, `entityType`, `entityId`, `parentId?`, `status?` |
| 9 | `getVersion` | Versioning | Yes | Yes | org member | `orgId`, `entityType`, `entityId`, `versionId`, `parentId?` |
| 10 | `createDraftVersion` | Versioning | Yes | Yes | org writer | `orgId`, `entityType`, `entityId`, `parentId?`, `data?`, `summary?` |
| 11 | `cloneVersion` | Versioning | Yes | Yes | org writer | `orgId`, `entityType`, `entityId`, `sourceVersionId`, `parentId?`, `summary?` |
| 12 | `transitionVersionStatus` | Versioning | Yes | Yes | org writer (admin for publish) | `orgId`, `entityType`, `entityId`, `versionId`, `newStatus`, `parentId?`, `notes?` |
| 13 | `updateDraftVersion` | Versioning | Yes | Yes | org writer | `orgId`, `entityType`, `entityId`, `versionId`, `data?`, `parentId?`, `summary?` |
| 14 | `compareVersions` | Versioning | Yes | Yes | org member | `orgId`, `entityType`, `entityId`, `leftVersionId`, `rightVersionId`, `parentId?` |
| 15 | `setUserRole` | Admin | Yes (admin\*) | No | admin (or first-admin setup) | `targetUserId`, `role` |
| 16 | `getUserRole` | Admin | Yes | No | any authenticated | `targetUserId?` |
| 17 | `listUsersWithRoles` | Admin | Yes | No | admin | `pageSize?`, `pageToken?` |
| 18 | `createOrganization` | Organization | Yes | No | any authenticated | `name` |
| 19 | `listUserOrgs` | Organization | Yes | No | any authenticated | — |
| 20 | `inviteToOrg` | Organization | Yes | Yes | org admin | `orgId`, `email`, `role` |
| 21 | `acceptOrgInvite` | Organization | Yes | No | invite recipient | `inviteId` |
| 22 | `updateMemberRole` | Organization | Yes | Yes | org admin | `orgId`, `userId`, `role` |
| 23 | `removeMember` | Organization | Yes | Yes | org admin (or self) | `orgId`, `userId` |
| 24 | `generateProductSummary` | AI | Yes | No | any authenticated | `pdfText`, `systemPrompt?` |
| 25 | `generateChatResponse` | AI | Yes | No | any authenticated | `messages[]`, `maxTokens?`, `temperature?` |
| 26 | `analyzeClaim` | AI | Yes | No | any authenticated | `messages[]`, `temperature?` |
| 27 | `suggestCoverageNames` | AI | Yes | No | any authenticated | `query` |
| 28 | `coverageAssistant` | AI | Yes | No | any authenticated | `messages[]` |
| 29 | `autoDraftCoverageFields` | AI | Yes | No | any authenticated | `coverageName`, `productType` |
| 30 | `createProductFromPDF` | AI | Yes | No | any authenticated | `pdfText` |
| 31 | `aiGateway` | AI | Yes | No | any authenticated | `action`, `payload` |
| 32 | `rateCoverage` | Pricing | Yes | No | any authenticated | `productId`, `coverageId`, `inputs{}` |
| 33 | `ratePackage` | Pricing | Yes | No | any authenticated | `productId`, `packageId`, `inputs{}` |
| 34 | `migrateToSchemaV3` | Data Integrity | Yes | No | admin | — |
| 35 | `recalculateProductStats` | Data Integrity | Yes | No | admin | `productId` |
| 36 | `recalculateCoverageStats` | Data Integrity | Yes | No | admin | `productId`, `coverageId` |
| 37 | `buildFilingPackage` | Filing | Yes | Yes | org member | `orgId`, `changeSetId`, `scope?`, `stateCode?` |

> **\*** `setUserRole` allows a first-admin bootstrap: if no admin exists, the caller can set themselves as admin.

### Role Reference

| Role | ChangeSet Write | Version Write | Version Publish | Approval | Org Admin |
|---|---|---|---|---|---|
| `admin` | Yes | Yes | Yes | Any role | Yes |
| `product_manager` | Yes | Yes | No | `product_manager` | No |
| `actuary` | Yes | Yes | No | `actuary` | No |
| `underwriter` | Yes | Yes | No | `underwriter` | No |
| `compliance` | No (CS only) | No | No | `compliance` | No |
| `viewer` | No | No | No | No | No |

---

## Running the Verification Script

### Prerequisites

1. **curl** installed (comes with macOS/Linux)
2. **Firebase CLI** installed (`npm install -g firebase-tools`)
3. For emulator tests: emulators running

### Start Emulators

```bash
firebase emulators:start
```

| Service | Port |
|---|---|
| Auth | 9099 |
| Firestore | 8080 |
| Functions | 5001 |
| Storage | 9199 |
| Emulator UI | 4000 |

### Run Verification

```bash
# Unauthenticated smoke tests (emulator) — verifies auth gates
./scripts/verify_endpoints.sh

# Unauthenticated smoke tests (production)
./scripts/verify_endpoints.sh --prod

# Authenticated tests (emulator)
TOKEN=$(curl -s -X POST \
  'http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@test.com","password":"password123","returnSecureToken":true}' \
  | jq -r '.idToken')
./scripts/verify_endpoints.sh --token "$TOKEN"

# Authenticated tests (production)
./scripts/verify_endpoints.sh --prod --token "$TOKEN"

# Help
./scripts/verify_endpoints.sh --help
```

### Output Legend

| Symbol | Meaning |
|---|---|
| `✓ PASS` (green) | Test passed — endpoint responded as expected |
| `✗ FAIL` (red) | Test failed — unexpected response |
| `⚠ WARN` (yellow) | Authenticated call returned an error (expected for test data) |
| `⊘ SKIP` (yellow) | Test skipped (no token provided, or trigger function) |

---

## Authentication & Tokens

### Firebase Callable Function Format

All callable functions use the Firebase `onCall` protocol. Requests must be `POST` with:

```
Content-Type: application/json
Authorization: Bearer <ID_TOKEN>   (for authenticated calls)
```

The request body wraps all parameters in a `data` envelope:

```json
{
  "data": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

### Getting a Token (Emulator)

```bash
# 1. Create a user in the Auth emulator UI: http://localhost:4000/auth
# 2. Sign in via REST:
curl -s -X POST \
  'http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@test.com","password":"password123","returnSecureToken":true}' \
  | jq -r '.idToken'
```

### Getting a Token (Production)

```bash
curl -s -X POST \
  'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=YOUR_WEB_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@company.com","password":"YOUR_PASSWORD","returnSecureToken":true}' \
  | jq -r '.idToken'
```

> Tokens expire after 1 hour. Re-run the sign-in command to get a fresh token.

---

## Expected Outcomes by Endpoint

### ChangeSet API

| Function | Unauth Expected | Auth (no data) Expected | Auth (valid data) Expected |
|---|---|---|---|
| `submitChangeSetForReview` | `UNAUTHENTICATED` | `permission-denied` or `not-found` | `success: true` with `requiredRoles[]` |
| `returnChangeSetToDraft` | `UNAUTHENTICATED` | `permission-denied` or `not-found` | `success: true` |
| `approveChangeSet` | `UNAUTHENTICATED` | `permission-denied` | `success: true` with `allApproved`, `pendingCount` |
| `rejectChangeSet` | `UNAUTHENTICATED` | `permission-denied` | `success: true` |
| `publishChangeSet` | `UNAUTHENTICATED` | `permission-denied` or `not-found` | `success: true` with `publishedCount` |
| `removeChangeSetItem` | `UNAUTHENTICATED` | `permission-denied` or `not-found` | `success: true` |
| `getPublishPreflight` | `UNAUTHENTICATED` | `permission-denied` or `not-found` | `success: true` with `canPublish`, `issues[]` |

### Versioning API

| Function | Unauth Expected | Auth (no data) Expected | Auth (valid data) Expected |
|---|---|---|---|
| `listVersions` | `UNAUTHENTICATED` | `permission-denied` | `success: true`, `versions: [...]` |
| `getVersion` | `UNAUTHENTICATED` | `permission-denied` or `not-found` | `success: true`, `version: {...}` |
| `createDraftVersion` | `UNAUTHENTICATED` | `permission-denied` | `success: true`, `versionId`, `versionNumber` |
| `cloneVersion` | `UNAUTHENTICATED` | `permission-denied` or `not-found` | `success: true`, `versionId`, `clonedFrom` |
| `transitionVersionStatus` | `UNAUTHENTICATED` | `permission-denied` | `success: true`, `previousStatus`, `newStatus` |
| `updateDraftVersion` | `UNAUTHENTICATED` | `permission-denied` or `not-found` | `success: true` |
| `compareVersions` | `UNAUTHENTICATED` | `permission-denied` or `not-found` | `success: true`, `left`, `right` |

### Admin API

| Function | Unauth Expected | Auth (no data) Expected | Auth (valid data) Expected |
|---|---|---|---|
| `setUserRole` | `UNAUTHENTICATED` | `permission-denied` (unless first admin) | `success: true`, `role` |
| `getUserRole` | `UNAUTHENTICATED` | Returns own role | `success: true`, `role`, `email` |
| `listUsersWithRoles` | `UNAUTHENTICATED` | `permission-denied` (requires admin claim) | `success: true`, `users: [...]` |

### Organization API

| Function | Unauth Expected | Auth (no data) Expected | Auth (valid data) Expected |
|---|---|---|---|
| `createOrganization` | `UNAUTHENTICATED` | `invalid-argument` (name too short) | `success: true`, `org: {id, name}` |
| `listUserOrgs` | `UNAUTHENTICATED` | — | `success: true`, `orgs: [...]` |
| `inviteToOrg` | `UNAUTHENTICATED` | `permission-denied` | `success: true`, `invite: {...}` |
| `acceptOrgInvite` | `UNAUTHENTICATED` | `not-found` | `success: true` |
| `updateMemberRole` | `UNAUTHENTICATED` | `permission-denied` | `success: true` |
| `removeMember` | `UNAUTHENTICATED` | `permission-denied` | `success: true` |

### AI API

| Function | Unauth Expected | Auth Expected | Notes |
|---|---|---|---|
| `generateProductSummary` | `UNAUTHENTICATED` | `success: true` with `content`, `usage` | Requires `OPENAI_KEY` secret |
| `generateChatResponse` | `UNAUTHENTICATED` | `success: true` with `content` | Requires `OPENAI_KEY` secret |
| `analyzeClaim` | `UNAUTHENTICATED` | `success: true` with `content` | Requires `OPENAI_KEY` secret |
| `suggestCoverageNames` | `UNAUTHENTICATED` | `success: true` with suggestions | Requires `OPENAI_KEY` secret |
| `coverageAssistant` | `UNAUTHENTICATED` | `success: true` with `content` | Requires `OPENAI_KEY` secret |
| `autoDraftCoverageFields` | `UNAUTHENTICATED` | `success: true` with field drafts | Requires `OPENAI_KEY` secret |
| `createProductFromPDF` | `UNAUTHENTICATED` | `success: true` with product data | Requires `OPENAI_KEY` secret; long-running |
| `aiGateway` | `UNAUTHENTICATED` | Varies by `action` | Centralized AI router with guardrails |

> **Note:** AI functions need the `OPENAI_KEY` secret configured. In the emulator, set it in `.secret.local` or the function will return an `internal` error about the missing key.

### Pricing API

| Function | Unauth Expected | Auth Expected | Notes |
|---|---|---|---|
| `rateCoverage` | `UNAUTHENTICATED` | `stepBreakdown`, `total` (or not-found) | Needs valid `productId` + pricing steps |
| `ratePackage` | `UNAUTHENTICATED` | `coverages`, `total` (or not-found) | Needs valid `productId` + package |

### Data Integrity API

| Function | Unauth Expected | Auth Expected | Notes |
|---|---|---|---|
| `migrateToSchemaV3` | `UNAUTHENTICATED` | Migration results (admin only) | Destructive — run on emulator first |
| `recalculateProductStats` | `UNAUTHENTICATED` | `coverageCount`, `packageCount`, etc. (admin only) | Needs valid `productId` |
| `recalculateCoverageStats` | `UNAUTHENTICATED` | `limitCount`, `deductibleCount`, etc. (admin only) | Needs valid `productId` + `coverageId` |

### Filing API

| Function | Unauth Expected | Auth Expected | Notes |
|---|---|---|---|
| `buildFilingPackage` | `UNAUTHENTICATED` | `success: true`, `packageId`, `storagePath` | Requires org membership; writes to Cloud Storage |

---

## Trigger Functions (Not Directly Testable)

These functions are **Firestore triggers** that fire automatically on document writes. They cannot be called via HTTP/curl. They must be verified through integration tests that write documents and observe the side effects.

### Product Integrity Triggers (8)

| Trigger | Fires On | Effect |
|---|---|---|
| `onCoverageChange` | `products/{pid}/coverages/{cid}` write | Updates product `coverageCount` |
| `onCoverageDelete` | `products/{pid}/coverages/{cid}` delete | Decrements product `coverageCount` |
| `onLimitChange` | `products/{pid}/coverages/{cid}/limits/{lid}` write | Updates coverage `limitCount` |
| `onLimitDelete` | `products/{pid}/coverages/{cid}/limits/{lid}` delete | Decrements coverage `limitCount` |
| `onDeductibleChange` | `products/{pid}/coverages/{cid}/deductibles/{did}` write | Updates coverage `deductibleCount` |
| `onDeductibleDelete` | `products/{pid}/coverages/{cid}/deductibles/{did}` delete | Decrements coverage `deductibleCount` |
| `onFormCoverageChange` | `products/{pid}/formCoverages/{fid}` write | Updates form mapping counts |
| `onFormCoverageDelete` | `products/{pid}/formCoverages/{fid}` delete | Decrements form mapping counts |

### Search Index Triggers (9)

| Trigger | Fires On | Effect |
|---|---|---|
| `onProductWrite` | `orgs/{oid}/products/{pid}` | Updates search index for products |
| `onCoverageWrite` | `orgs/{oid}/products/{pid}/coverages/{cid}` | Updates search index for coverages |
| `onFormWrite` | `orgs/{oid}/forms/{fid}` | Updates search index for forms |
| `onFormVersionWrite` | `orgs/{oid}/forms/{fid}/versions/{vid}` | Updates search index for form versions |
| `onRuleWrite` | `orgs/{oid}/rules/{rid}` | Updates search index for rules |
| `onRateProgramWrite` | `orgs/{oid}/ratePrograms/{rpid}` | Updates search index for rate programs |
| `onTableWrite` | `orgs/{oid}/tables/{tid}` | Updates search index for tables |
| `onChangeSetWrite` | `orgs/{oid}/changeSets/{csid}` | Updates search index for change sets |
| `onStateProgramWrite` | `orgs/{oid}/statePrograms/{spid}` | Updates search index for state programs |

### Collaboration Triggers (2)

| Trigger | Fires On | Effect |
|---|---|---|
| `onCommentCreated` | `orgs/{oid}/comments/{cid}` create | Sends notification to mentioned users |
| `onChangeSetStatusChange` | `orgs/{oid}/changeSets/{csid}` update | Notifies stakeholders of status transitions |

### Task Automation Triggers (2)

| Trigger | Fires On | Effect |
|---|---|---|
| `onChangeSetReview` | `orgs/{oid}/changeSets/{csid}` update to `ready_for_review` | Creates review tasks for required approvers |
| `onStateProgramFiling` | `orgs/{oid}/statePrograms/{spid}` update to `pending_filing` | Creates filing tasks |

---

## Curl Examples

### Unauthenticated Call (should fail)

```bash
curl -s -X POST "http://127.0.0.1:5001/insurance-product-hub/us-central1/listUserOrgs" \
  -H "Content-Type: application/json" \
  -d '{"data":{}}'
```

Expected response:
```json
{"error":{"message":"User must be authenticated to perform this action","status":"UNAUTHENTICATED"}}
```

### Authenticated Call — listUserOrgs

```bash
curl -s -X POST "http://127.0.0.1:5001/insurance-product-hub/us-central1/listUserOrgs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"data":{}}'
```

Expected response:
```json
{"result":{"success":true,"orgs":[...]}}
```

### Authenticated Call — createOrganization

```bash
curl -s -X POST "http://127.0.0.1:5001/insurance-product-hub/us-central1/createOrganization" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"data":{"name":"Acme Insurance Co"}}'
```

### Authenticated Call — submitChangeSetForReview

```bash
curl -s -X POST "http://127.0.0.1:5001/insurance-product-hub/us-central1/submitChangeSetForReview" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"data":{"orgId":"YOUR_ORG_ID","changeSetId":"YOUR_CHANGESET_ID"}}'
```

### Authenticated Call — rateCoverage

```bash
curl -s -X POST "http://127.0.0.1:5001/insurance-product-hub/us-central1/rateCoverage" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"data":{"productId":"PRODUCT_ID","coverageId":"COVERAGE_ID","inputs":{"state":"CA","limit":100000,"deductible":500}}}'
```

### Production Example

```bash
curl -s -X POST "https://us-central1-insurance-product-hub.cloudfunctions.net/listUserOrgs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"data":{}}'
```

---

## Notes & Caveats

1. **Firebase Callable Protocol**: All functions use the Firebase `onCall` protocol, not plain HTTP triggers. The request body must always wrap parameters in `{"data":{...}}` and the response is wrapped in `{"result":{...}}` (or `{"error":{...}}`).

2. **Emulator vs. Production Differences**:
   - The emulator does not enforce `OPENAI_KEY` secret access the same way as production. AI functions may behave differently.
   - Firestore security rules are not enforced in the emulator by default for admin SDK calls.
   - Custom claims (for admin role checks) must be set manually in the emulator.

3. **AI Functions & Cost**: AI functions (`generateProductSummary`, `generateChatResponse`, `analyzeClaim`, etc.) call the OpenAI API and incur costs. Test with minimal input when verifying against production.

4. **Data Integrity Functions Are Destructive**: `migrateToSchemaV3` modifies Firestore documents. Always test against the emulator first.

5. **Org-Scoped Functions**: Functions marked "Org-Scoped" require the caller to be an active member of the specified `orgId`. The script uses `test-org` as a placeholder; for authenticated tests, use a real org ID.

6. **Function Names vs. Module Exports**: The deployed function names (as seen in `functions/index.js`) may differ from the module export names in the source files:
   - `inviteToOrg` → sourced from `org.js:inviteOrgMember`
   - `updateMemberRole` → sourced from `org.js:updateOrgMemberRole`
   - `removeMember` → sourced from `org.js:removeOrgMember`

7. **Trigger Functions**: The 21 Firestore trigger functions cannot be tested via HTTP. They must be verified by writing documents to their trigger paths and observing side effects (e.g., counter updates, search index entries, notification documents).

8. **Token Expiry**: Firebase ID tokens expire after 1 hour. If tests start failing with `UNAUTHENTICATED` mid-run, refresh the token.

9. **Rate Limits**: Production Cloud Functions have default rate limits. Avoid running the full suite too frequently against production.

10. **v1 vs v2 Functions**: Most functions use `firebase-functions/v2/https:onCall`. The Data Integrity functions use v1 `firebase-functions:https.onCall`. Both use the same callable protocol for clients but have slightly different internal middleware signatures. The verification script handles both transparently.
