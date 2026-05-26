#!/bin/bash
# QC Test Harness — prizm-mobile API endpoints
# Usage: ssh hetzner "bash /var/www/html/ms_dev/qc-test.sh"
# Tests API endpoints against the dev environment (prizmene_dev)

set -e
BASE="https://ms.prizm-energy.com/ms_dev/api"
PASS=0
FAIL=0
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✓ PASS${NC}: $1"; PASS=$((PASS+1)); }
fail() { echo -e "  ${RED}✗ FAIL${NC}: $1 — $2"; FAIL=$((FAIL+1)); }
section() { echo ""; echo "━━━ $1 ━━━"; }

# First get a JWT token for testing
section "AUTH SETUP"
STAFF_EMAIL=$(mysql -u root prizmene_dev -N -e "SELECT email FROM tblstaff WHERE active=1 AND admin=1 LIMIT 1;" 2>/dev/null || echo "")
if [ -z "$STAFF_EMAIL" ]; then
  STAFF_EMAIL=$(mysql -u root prizmene_dev -N -e "SELECT email FROM tblstaff WHERE active=1 LIMIT 1;" 2>/dev/null || echo "")
fi
echo "Using staff: $STAFF_EMAIL"

# Get token (try the mobile auth endpoint)
TOKEN=$(curl -s -X POST "$BASE/../mobile_auth.php" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$STAFF_EMAIL\"}" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  # Try REST login
  TOKEN=$(curl -s -X POST "$BASE/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$STAFF_EMAIL\"}" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('token',''))" 2>/dev/null || echo "")
fi

if [ -z "$TOKEN" ]; then
  echo "WARNING: Could not get auth token. Testing without auth (expect 401s)."
  AUTH=""
else
  AUTH="-H 'authtoken: $TOKEN'"
  echo "Token obtained successfully"
fi

# ── Test helper ──
test_get() {
  local endpoint="$1" desc="$2" code="${3:-200}"
  local http=$(curl -s -o /dev/null -w "%{http_code}" -H "authtoken: $TOKEN" "$BASE/$endpoint" 2>/dev/null)
  if [ "$http" = "$code" ]; then pass "$desc ($http)"; else fail "$desc" "expected $code, got $http"; fi
}

test_post() {
  local endpoint="$1" data="$2" desc="$3" code="${4:-201}"
  local http=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "authtoken: $TOKEN" -H "Content-Type: application/json" -d "$data" "$BASE/$endpoint" 2>/dev/null)
  if [ "$http" = "$code" ]; then pass "$desc ($http)"; else fail "$desc" "expected $code, got $http"; fi
}

# ── Module: Purchase API (new approval endpoints) ──
section "PURCHASE: Received Vouchers"
test_get "purchase_api/received_vouchers?limit=1" "RV list (GET)" 200
test_get "purchase_api/received_vouchers/1" "RV detail (GET)" 200

section "PURCHASE: Delivery Notes"
test_get "purchase_api/delivery_notes?limit=1" "DN list (GET)" 200

section "PURCHASE: Quotations"
test_get "purchase_api/quotations?limit=1" "Quotations list (GET)" 200

section "PURCHASE: Completion Certificates"
test_get "purchase_api/completion_certificates?limit=1" "CC list (GET)" 200

# ── Module: Tasks Checklist ──
section "TASKS: Checklist"
TASK_ID=$(mysql -u root prizmene_dev -N -e "SELECT id FROM tbltasks LIMIT 1;" 2>/dev/null || echo "")
if [ -n "$TASK_ID" ]; then
  test_get "tasks/checklist/$TASK_ID" "Checklist GET for task $TASK_ID" 200
  test_post "tasks/checklist" "{\"taskid\":$TASK_ID,\"description\":\"QC-TEST item\"}" "Checklist create" 201
  
  # Get the created item ID and toggle it
  ITEM_ID=$(curl -s -H "authtoken: $TOKEN" "$BASE/tasks/checklist/$TASK_ID" 2>/dev/null | python3 -c "import sys,json; data=json.load(sys.stdin).get('data',[]); print(data[-1].get('id','')) if data else print('')" 2>/dev/null || echo "")
  if [ -n "$ITEM_ID" ] && [ "$ITEM_ID" != "" ]; then
    http=$(curl -s -o /dev/null -w "%{http_code}" -X PUT -H "authtoken: $TOKEN" -H "Content-Type: application/json" -d "{\"finished\":1}" "$BASE/tasks/checklist/$ITEM_ID" 2>/dev/null)
    if [ "$http" = "200" ]; then pass "Checklist toggle ($http)"; else fail "Checklist toggle" "expected 200, got $http"; fi
    
    # Toggle back
    http=$(curl -s -o /dev/null -w "%{http_code}" -X PUT -H "authtoken: $TOKEN" -H "Content-Type: application/json" -d "{\"finished\":0}" "$BASE/tasks/checklist/$ITEM_ID" 2>/dev/null)
    if [ "$http" = "200" ]; then pass "Checklist untoggle ($http)"; else fail "Checklist untoggle" "expected 200, got $http"; fi
    
    # Delete
    http=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE -H "authtoken: $TOKEN" "$BASE/tasks/checklist/$ITEM_ID" 2>/dev/null)
    if [ "$http" = "200" ]; then pass "Checklist delete ($http)"; else fail "Checklist delete" "expected 200, got $http"; fi
  else
    fail "Checklist item retrieval" "Could not get created item ID"
  fi
else
  fail "Task ID lookup" "No tasks found in dev DB"
fi

# ── Summary ──
echo ""
echo "═══════════════════════════════════════"
echo -e "  ${GREEN}Passed: $PASS${NC}  |  ${RED}Failed: $FAIL${NC}"
echo "═══════════════════════════════════════"
[ $FAIL -gt 0 ] && exit 1 || exit 0
