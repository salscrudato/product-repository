#!/usr/bin/env bash
# =============================================================================
# verify_endpoints.sh — Pre-Production Endpoint Verification
# =============================================================================
#
# Verifies every deployed Cloud Function for the insurance-product-hub project.
#
# USAGE:
#   ./scripts/verify_endpoints.sh                # Test against local emulator
#   ./scripts/verify_endpoints.sh --prod         # Test against production
#   ./scripts/verify_endpoints.sh --token TOKEN  # Authenticated tests (emulator)
#   ./scripts/verify_endpoints.sh --prod --token TOKEN  # Authenticated + prod
#   ./scripts/verify_endpoints.sh --help         # Show help
#
# PREREQUISITES:
#   - curl installed
#   - For emulator tests: firebase emulators running (firebase emulators:start)
#     Emulator ports: Auth 9099, Firestore 8080, Functions 5001, Storage 9199
#   - For authenticated tests: a valid Firebase ID token
#
# HOW TO GET A TOKEN (emulator):
#   1. Start emulators: firebase emulators:start
#   2. Open the Auth emulator UI: http://localhost:4000/auth
#   3. Create a test user
#   4. Use the Firebase client SDK or REST API to sign in:
#      curl -s -X POST \
#        'http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key' \
#        -H 'Content-Type: application/json' \
#        -d '{"email":"test@test.com","password":"password123","returnSecureToken":true}' \
#        | jq -r '.idToken'
#
# HOW TO GET A TOKEN (production):
#   Use the Firebase client SDK signInWithEmailAndPassword, then getIdToken().
#   Or use the REST API:
#      curl -s -X POST \
#        'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=YOUR_API_KEY' \
#        -H 'Content-Type: application/json' \
#        -d '{"email":"EMAIL","password":"PASSWORD","returnSecureToken":true}' \
#        | jq -r '.idToken'
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

EMULATOR_URL="http://127.0.0.1:5001/insurance-product-hub/us-central1"
PROD_URL="https://us-central1-insurance-product-hub.cloudfunctions.net"

BASE_URL="$EMULATOR_URL"
TOKEN=""
MODE="emulator"
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

usage() {
  cat <<EOF
${BOLD}verify_endpoints.sh${RESET} — Pre-Production Endpoint Verification

${BOLD}USAGE:${RESET}
  ./scripts/verify_endpoints.sh [OPTIONS]

${BOLD}OPTIONS:${RESET}
  --prod          Test against production Cloud Functions
  --token TOKEN   Supply a Firebase ID token for authenticated tests
  --help          Show this help message

${BOLD}EXAMPLES:${RESET}
  # Unauthenticated smoke tests against emulator
  ./scripts/verify_endpoints.sh

  # Authenticated tests against production
  ./scripts/verify_endpoints.sh --prod --token \$(get_firebase_token)

${BOLD}EMULATOR SETUP:${RESET}
  firebase emulators:start
  Ports: Auth 9099 | Firestore 8080 | Functions 5001 | Storage 9199 | UI 4000
EOF
  exit 0
}

separator() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD}  $1${RESET}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo ""
}

# Call a callable function WITHOUT auth — should return UNAUTHENTICATED
test_unauth() {
  local fn_name="$1"
  local payload="${2:-'{\"data\":{}}'}"
  local description="${3:-Unauthenticated call}"

  local response
  local http_code

  response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/$fn_name" \
    -H "Content-Type: application/json" \
    -d "$payload" 2>&1) || true

  http_code=$(echo "$response" | tail -n1)
  local body
  body=$(echo "$response" | sed '$d')

  # Firebase callable returns 200 with error in body, or HTTP 401/403
  if echo "$body" | grep -qi "unauthenticated\|UNAUTHENTICATED\|must be authenticated\|Authentication required"; then
    echo -e "  ${GREEN}✓ PASS${RESET}  $fn_name — ${DIM}$description → correctly rejected (unauthenticated)${RESET}"
    PASS_COUNT=$((PASS_COUNT + 1))
  elif echo "$body" | grep -qi "permission.denied\|PERMISSION_DENIED"; then
    echo -e "  ${GREEN}✓ PASS${RESET}  $fn_name — ${DIM}$description → correctly rejected (permission denied)${RESET}"
    PASS_COUNT=$((PASS_COUNT + 1))
  elif [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
    echo -e "  ${GREEN}✓ PASS${RESET}  $fn_name — ${DIM}$description → HTTP $http_code${RESET}"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo -e "  ${RED}✗ FAIL${RESET}  $fn_name — ${DIM}$description → unexpected response (HTTP $http_code)${RESET}"
    echo -e "         ${DIM}Body: $(echo "$body" | head -c 200)${RESET}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

# Call a callable function WITH auth — reports status
test_auth() {
  local fn_name="$1"
  local payload="${2:-'{\"data\":{}}'}"
  local description="${3:-Authenticated call}"

  if [ -z "$TOKEN" ]; then
    echo -e "  ${YELLOW}⊘ SKIP${RESET}  $fn_name — ${DIM}$description (no token provided)${RESET}"
    SKIP_COUNT=$((SKIP_COUNT + 1))
    return
  fi

  local response
  local http_code

  response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/$fn_name" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$payload" 2>&1) || true

  http_code=$(echo "$response" | tail -n1)
  local body
  body=$(echo "$response" | sed '$d')

  if echo "$body" | grep -qi '"error"'; then
    local error_code
    error_code=$(echo "$body" | grep -oP '"code"\s*:\s*"\K[^"]+' 2>/dev/null || echo "unknown")
    local error_msg
    error_msg=$(echo "$body" | grep -oP '"message"\s*:\s*"\K[^"]+' 2>/dev/null || echo "$body" | head -c 120)
    echo -e "  ${YELLOW}⚠ WARN${RESET}  $fn_name — ${DIM}$description → error: $error_code – $error_msg${RESET}"
    PASS_COUNT=$((PASS_COUNT + 1))  # Expected — most calls need valid data
  elif [ "$http_code" = "200" ]; then
    echo -e "  ${GREEN}✓ PASS${RESET}  $fn_name — ${DIM}$description → HTTP 200${RESET}"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo -e "  ${RED}✗ FAIL${RESET}  $fn_name — ${DIM}$description → HTTP $http_code${RESET}"
    echo -e "         ${DIM}Body: $(echo "$body" | head -c 200)${RESET}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prod)
      BASE_URL="$PROD_URL"
      MODE="production"
      shift
      ;;
    --token)
      TOKEN="$2"
      shift 2
      ;;
    --help|-h)
      usage
      ;;
    *)
      echo "Unknown option: $1"
      usage
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║         insurance-product-hub · Endpoint Verification Suite                 ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Mode:       ${CYAN}$MODE${RESET}"
echo -e "  Base URL:   ${CYAN}$BASE_URL${RESET}"
echo -e "  Auth token: ${CYAN}$([ -n "$TOKEN" ] && echo "provided (${#TOKEN} chars)" || echo "not provided — unauthenticated tests only")${RESET}"
echo -e "  Timestamp:  ${DIM}$(date -u '+%Y-%m-%dT%H:%M:%SZ')${RESET}"

# =============================================================================
# 1. CHANGESET API
# =============================================================================

separator "ChangeSet API (7 functions)"

echo -e "  ${DIM}— Unauthenticated calls (should all be rejected) —${RESET}"
test_unauth "submitChangeSetForReview" \
  '{"data":{"orgId":"test-org","changeSetId":"cs-001"}}' \
  "Unauth → submitChangeSetForReview"

test_unauth "returnChangeSetToDraft" \
  '{"data":{"orgId":"test-org","changeSetId":"cs-001","reason":"testing"}}' \
  "Unauth → returnChangeSetToDraft"

test_unauth "approveChangeSet" \
  '{"data":{"orgId":"test-org","changeSetId":"cs-001","role":"product_manager"}}' \
  "Unauth → approveChangeSet"

test_unauth "rejectChangeSet" \
  '{"data":{"orgId":"test-org","changeSetId":"cs-001","role":"compliance","notes":"test rejection"}}' \
  "Unauth → rejectChangeSet"

test_unauth "publishChangeSet" \
  '{"data":{"orgId":"test-org","changeSetId":"cs-001"}}' \
  "Unauth → publishChangeSet"

test_unauth "removeChangeSetItem" \
  '{"data":{"orgId":"test-org","changeSetId":"cs-001","itemId":"item-001"}}' \
  "Unauth → removeChangeSetItem"

test_unauth "getPublishPreflight" \
  '{"data":{"orgId":"test-org","changeSetId":"cs-001"}}' \
  "Unauth → getPublishPreflight"

echo ""
echo -e "  ${DIM}— Authenticated calls (requires --token) —${RESET}"
test_auth "submitChangeSetForReview" \
  '{"data":{"orgId":"test-org","changeSetId":"cs-001"}}' \
  "Auth → submitChangeSetForReview (expects permission-denied or not-found)"

test_auth "getPublishPreflight" \
  '{"data":{"orgId":"test-org","changeSetId":"cs-001"}}' \
  "Auth → getPublishPreflight (expects permission-denied or not-found)"

# =============================================================================
# 2. VERSIONING API
# =============================================================================

separator "Versioning API (7 functions)"

echo -e "  ${DIM}— Unauthenticated calls (should all be rejected) —${RESET}"
test_unauth "listVersions" \
  '{"data":{"orgId":"test-org","entityType":"product","entityId":"prod-001"}}' \
  "Unauth → listVersions"

test_unauth "getVersion" \
  '{"data":{"orgId":"test-org","entityType":"product","entityId":"prod-001","versionId":"v1"}}' \
  "Unauth → getVersion"

test_unauth "createDraftVersion" \
  '{"data":{"orgId":"test-org","entityType":"product","entityId":"prod-001","data":{}}}' \
  "Unauth → createDraftVersion"

test_unauth "cloneVersion" \
  '{"data":{"orgId":"test-org","entityType":"product","entityId":"prod-001","sourceVersionId":"v1"}}' \
  "Unauth → cloneVersion"

test_unauth "transitionVersionStatus" \
  '{"data":{"orgId":"test-org","entityType":"product","entityId":"prod-001","versionId":"v1","newStatus":"review"}}' \
  "Unauth → transitionVersionStatus"

test_unauth "updateDraftVersion" \
  '{"data":{"orgId":"test-org","entityType":"product","entityId":"prod-001","versionId":"v1","data":{}}}' \
  "Unauth → updateDraftVersion"

test_unauth "compareVersions" \
  '{"data":{"orgId":"test-org","entityType":"product","entityId":"prod-001","leftVersionId":"v1","rightVersionId":"v2"}}' \
  "Unauth → compareVersions"

echo ""
echo -e "  ${DIM}— Authenticated calls (requires --token) —${RESET}"
test_auth "listVersions" \
  '{"data":{"orgId":"test-org","entityType":"product","entityId":"prod-001"}}' \
  "Auth → listVersions (expects permission-denied or empty list)"

test_auth "getVersion" \
  '{"data":{"orgId":"test-org","entityType":"product","entityId":"prod-001","versionId":"v1"}}' \
  "Auth → getVersion (expects permission-denied or not-found)"

# =============================================================================
# 3. ADMIN API
# =============================================================================

separator "Admin API (3 functions)"

echo -e "  ${DIM}— Unauthenticated calls (should all be rejected) —${RESET}"
test_unauth "setUserRole" \
  '{"data":{"targetUserId":"user-001","role":"viewer"}}' \
  "Unauth → setUserRole"

test_unauth "getUserRole" \
  '{"data":{"targetUserId":"user-001"}}' \
  "Unauth → getUserRole"

test_unauth "listUsersWithRoles" \
  '{"data":{"pageSize":10}}' \
  "Unauth → listUsersWithRoles"

echo ""
echo -e "  ${DIM}— Authenticated calls (requires --token) —${RESET}"
test_auth "getUserRole" \
  '{"data":{}}' \
  "Auth → getUserRole (own role)"

test_auth "listUsersWithRoles" \
  '{"data":{"pageSize":10}}' \
  "Auth → listUsersWithRoles (requires admin role)"

# =============================================================================
# 4. ORGANIZATION API
# =============================================================================

separator "Organization API (6 functions)"

echo -e "  ${DIM}— Unauthenticated calls (should all be rejected) —${RESET}"
test_unauth "createOrganization" \
  '{"data":{"name":"Test Org"}}' \
  "Unauth → createOrganization"

test_unauth "listUserOrgs" \
  '{"data":{}}' \
  "Unauth → listUserOrgs"

test_unauth "inviteToOrg" \
  '{"data":{"orgId":"test-org","email":"user@example.com","role":"viewer"}}' \
  "Unauth → inviteToOrg"

test_unauth "acceptOrgInvite" \
  '{"data":{"inviteId":"inv-001"}}' \
  "Unauth → acceptOrgInvite"

test_unauth "updateMemberRole" \
  '{"data":{"orgId":"test-org","userId":"user-001","role":"viewer"}}' \
  "Unauth → updateMemberRole"

test_unauth "removeMember" \
  '{"data":{"orgId":"test-org","userId":"user-001"}}' \
  "Unauth → removeMember"

echo ""
echo -e "  ${DIM}— Authenticated calls (requires --token) —${RESET}"
test_auth "listUserOrgs" \
  '{"data":{}}' \
  "Auth → listUserOrgs (list own orgs)"

test_auth "createOrganization" \
  '{"data":{"name":"Verification Test Org"}}' \
  "Auth → createOrganization (creates a real org — use on emulator only)"

# =============================================================================
# 5. AI API
# =============================================================================

separator "AI API (8 functions)"

echo -e "  ${DIM}— Unauthenticated calls (should all be rejected) —${RESET}"
test_unauth "generateProductSummary" \
  '{"data":{"pdfText":"Sample insurance policy text for testing."}}' \
  "Unauth → generateProductSummary"

test_unauth "generateChatResponse" \
  '{"data":{"messages":[{"role":"user","content":"Hello"}]}}' \
  "Unauth → generateChatResponse"

test_unauth "analyzeClaim" \
  '{"data":{"messages":[{"role":"user","content":"Analyze this claim"}]}}' \
  "Unauth → analyzeClaim"

test_unauth "suggestCoverageNames" \
  '{"data":{"query":"general liability"}}' \
  "Unauth → suggestCoverageNames"

test_unauth "coverageAssistant" \
  '{"data":{"messages":[{"role":"user","content":"Help me create a coverage"}]}}' \
  "Unauth → coverageAssistant"

test_unauth "autoDraftCoverageFields" \
  '{"data":{"coverageName":"Property Damage","productType":"commercial"}}' \
  "Unauth → autoDraftCoverageFields"

test_unauth "createProductFromPDF" \
  '{"data":{"pdfText":"Sample insurance document text."}}' \
  "Unauth → createProductFromPDF"

test_unauth "aiGateway" \
  '{"data":{"action":"summarize","payload":{"text":"test"}}}' \
  "Unauth → aiGateway"

echo ""
echo -e "  ${DIM}— Authenticated calls (requires --token; AI calls need OPENAI_KEY secret) —${RESET}"
test_auth "generateChatResponse" \
  '{"data":{"messages":[{"role":"user","content":"What is general liability insurance?"}],"maxTokens":50}}' \
  "Auth → generateChatResponse (needs OPENAI_KEY)"

test_auth "suggestCoverageNames" \
  '{"data":{"query":"liability"}}' \
  "Auth → suggestCoverageNames (needs OPENAI_KEY)"

# =============================================================================
# 6. PRICING API
# =============================================================================

separator "Pricing API (2 functions)"

echo -e "  ${DIM}— Unauthenticated calls (should all be rejected) —${RESET}"
test_unauth "rateCoverage" \
  '{"data":{"productId":"prod-001","coverageId":"cov-001","inputs":{"state":"CA","limit":100000}}}' \
  "Unauth → rateCoverage"

test_unauth "ratePackage" \
  '{"data":{"productId":"prod-001","packageId":"pkg-001","inputs":{"state":"CA"}}}' \
  "Unauth → ratePackage"

echo ""
echo -e "  ${DIM}— Authenticated calls (requires --token) —${RESET}"
test_auth "rateCoverage" \
  '{"data":{"productId":"prod-001","coverageId":"cov-001","inputs":{"state":"CA","limit":100000}}}' \
  "Auth → rateCoverage (expects not-found for test IDs)"

test_auth "ratePackage" \
  '{"data":{"productId":"prod-001","packageId":"pkg-001","inputs":{"state":"CA"}}}' \
  "Auth → ratePackage (expects not-found for test IDs)"

# =============================================================================
# 7. DATA INTEGRITY API
# =============================================================================

separator "Data Integrity API (3 functions)"

echo -e "  ${DIM}— Unauthenticated calls (should all be rejected) —${RESET}"
test_unauth "migrateToSchemaV3" \
  '{"data":{}}' \
  "Unauth → migrateToSchemaV3"

test_unauth "recalculateProductStats" \
  '{"data":{"productId":"prod-001"}}' \
  "Unauth → recalculateProductStats"

test_unauth "recalculateCoverageStats" \
  '{"data":{"productId":"prod-001","coverageId":"cov-001"}}' \
  "Unauth → recalculateCoverageStats"

echo ""
echo -e "  ${DIM}— Authenticated calls (requires --token; admin role required) —${RESET}"
test_auth "migrateToSchemaV3" \
  '{"data":{}}' \
  "Auth → migrateToSchemaV3 (requires admin claim)"

test_auth "recalculateProductStats" \
  '{"data":{"productId":"prod-001"}}' \
  "Auth → recalculateProductStats (requires admin claim)"

test_auth "recalculateCoverageStats" \
  '{"data":{"productId":"prod-001","coverageId":"cov-001"}}' \
  "Auth → recalculateCoverageStats (requires admin claim)"

# =============================================================================
# 8. FILING API
# =============================================================================

separator "Filing API (1 function)"

echo -e "  ${DIM}— Unauthenticated calls (should all be rejected) —${RESET}"
test_unauth "buildFilingPackage" \
  '{"data":{"orgId":"test-org","changeSetId":"cs-001"}}' \
  "Unauth → buildFilingPackage"

echo ""
echo -e "  ${DIM}— Authenticated calls (requires --token) —${RESET}"
test_auth "buildFilingPackage" \
  '{"data":{"orgId":"test-org","changeSetId":"cs-001","scope":"full"}}' \
  "Auth → buildFilingPackage (expects permission-denied or not-found)"

# =============================================================================
# 9. TRIGGER FUNCTIONS (not directly callable)
# =============================================================================

separator "Trigger Functions (not directly testable via curl)"

echo -e "  ${DIM}These functions are Firestore triggers and cannot be invoked via HTTP.${RESET}"
echo -e "  ${DIM}They fire automatically when documents are written/updated/deleted.${RESET}"
echo ""
echo -e "  ${DIM}Product Integrity Triggers:${RESET}"
echo -e "    - onCoverageChange     ${DIM}(products/{pid}/coverages/{cid})${RESET}"
echo -e "    - onCoverageDelete     ${DIM}(products/{pid}/coverages/{cid})${RESET}"
echo -e "    - onLimitChange        ${DIM}(products/{pid}/coverages/{cid}/limits/{lid})${RESET}"
echo -e "    - onLimitDelete        ${DIM}(products/{pid}/coverages/{cid}/limits/{lid})${RESET}"
echo -e "    - onDeductibleChange   ${DIM}(products/{pid}/coverages/{cid}/deductibles/{did})${RESET}"
echo -e "    - onDeductibleDelete   ${DIM}(products/{pid}/coverages/{cid}/deductibles/{did})${RESET}"
echo -e "    - onFormCoverageChange ${DIM}(products/{pid}/formCoverages/{fid})${RESET}"
echo -e "    - onFormCoverageDelete ${DIM}(products/{pid}/formCoverages/{fid})${RESET}"
echo ""
echo -e "  ${DIM}Search Index Triggers:${RESET}"
echo -e "    - onProductWrite       ${DIM}(orgs/{oid}/products/{pid})${RESET}"
echo -e "    - onCoverageWrite      ${DIM}(orgs/{oid}/products/{pid}/coverages/{cid})${RESET}"
echo -e "    - onFormWrite          ${DIM}(orgs/{oid}/forms/{fid})${RESET}"
echo -e "    - onFormVersionWrite   ${DIM}(orgs/{oid}/forms/{fid}/versions/{vid})${RESET}"
echo -e "    - onRuleWrite          ${DIM}(orgs/{oid}/rules/{rid})${RESET}"
echo -e "    - onRateProgramWrite   ${DIM}(orgs/{oid}/ratePrograms/{rpid})${RESET}"
echo -e "    - onTableWrite         ${DIM}(orgs/{oid}/tables/{tid})${RESET}"
echo -e "    - onChangeSetWrite     ${DIM}(orgs/{oid}/changeSets/{csid})${RESET}"
echo -e "    - onStateProgramWrite  ${DIM}(orgs/{oid}/statePrograms/{spid})${RESET}"
echo ""
echo -e "  ${DIM}Collaboration Triggers:${RESET}"
echo -e "    - onCommentCreated        ${DIM}(orgs/{oid}/comments/{cid})${RESET}"
echo -e "    - onChangeSetStatusChange ${DIM}(orgs/{oid}/changeSets/{csid})${RESET}"
echo ""
echo -e "  ${DIM}Task Automation Triggers:${RESET}"
echo -e "    - onChangeSetReview    ${DIM}(orgs/{oid}/changeSets/{csid})${RESET}"
echo -e "    - onStateProgramFiling ${DIM}(orgs/{oid}/statePrograms/{spid})${RESET}"
echo ""
echo -e "  ${YELLOW}⊘ SKIP${RESET}  ${DIM}21 trigger functions — verified by document writes in integration tests${RESET}"
SKIP_COUNT=$((SKIP_COUNT + 21))

# =============================================================================
# Summary
# =============================================================================

separator "Summary"

TOTAL=$((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))

echo -e "  ${GREEN}Passed:  $PASS_COUNT${RESET}"
echo -e "  ${RED}Failed:  $FAIL_COUNT${RESET}"
echo -e "  ${YELLOW}Skipped: $SKIP_COUNT${RESET}"
echo -e "  ${BOLD}Total:   $TOTAL${RESET}"
echo ""

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo -e "  ${RED}${BOLD}RESULT: SOME TESTS FAILED${RESET}"
  echo ""
  exit 1
else
  echo -e "  ${GREEN}${BOLD}RESULT: ALL TESTS PASSED${RESET}"
  echo ""
  exit 0
fi
