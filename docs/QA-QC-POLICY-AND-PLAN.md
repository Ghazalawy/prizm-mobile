# Prizm Mobile — QA/QC Policy & Master Test Plan

**Document Version:** 1.0  
**Date:** 2026-05-28  
**Owner:** Osama Hassan  
**Classification:** Internal — Engineering  
**Standard:** IEEE 829-2008 / ISTQB Foundation Level  
**Toolkit:** curl · PHPUnit · Expo · Android Emulator · CSV Traceability Matrix  

---

## 1.0 POLICY STATEMENT

Every operation exposed by the ERP web application MUST have a corresponding,
tested, verified, and traceable implementation in the mobile application. No
operation ships without a tick mark. No endpoint is assumed working — it is
proven working. This policy applies to ALL modules, ALL controllers, ALL
database tables, and ALL fields.

**Zero hallucination. Zero bypass. 100% traceability.**

---

## 2.0 SCOPE

### 2.1 In Scope

| Layer | Description |
|---|---|
| Web Controllers | Every `public function` in every `controllers/admin/*.php` and module-specific controller |
| Models | Every database table field accessed by controllers |
| API Controllers | Every `public function` in `modules/api/controllers/*.php` |
| Mobile Screens | Every screen/component in `app/(tabs)/` and `components/` |
| Mobile Queries | Every hook in `lib/queries/*.ts` |
| Database | Every table column read/written |

### 2.2 Module Inventory (Batch Classification)

**BATCH 1 — Pilot (Tasks):** Complete → validate against policy, fix gaps  

**BATCH 2 — CRM & Core Business:**
Customers · Contacts · Leads · Contracts · Business Partners · Projects · Milestones

**BATCH 3 — Sales & Finance:**
Invoices · Estimates · Proposals · Payments · Items · Credit Notes · Expenses · Budget · Cost Centers

**BATCH 4 — Support & Knowledge:**
Tickets · Knowledge Base · Surveys · Announcements

**BATCH 5 — Purchase & Supply Chain:**
Purchase Requests · Purchase Orders · Payment Requests · Expense Requests · Suppliers · Delivery Notes · Quotations · Received Vouchers · Completion Certificates

**BATCH 6 — HR & People:**
Staff · HR Records · HR Payroll · Recruitment · Leaves · Timesheets · Goals · Todo

**BATCH 7 — Operations & Assets:**
Gatepass · Fixed Equipment · Materials Catalog · Vehicles · Cost Centers

**BATCH 8 — BD & Tenders:**
Tenders · Opportunities · Technical Inquiries · RFQ · Advance Leads

**BATCH 9 — Admin & System:**
Dashboard · Calendar · Reports · Settings · Roles · Permissions · API Management · Automation · Custom Fields · Filters · Mods · Backup · Documentation

**BATCH 10 — AI & Integrations:**
AI Gateway · AI Feature Management · Outlook365 · QuickBooks · Linkedin · DMS · KBI · SMS/OTP

---

## 3.0 METHODOLOGY — The "Sweep, Gap, Build, Test, Ship" Cycle

### 3.1 Phase 0: Module Sweep (Per Module)

```
For each module:
  1. Read web controller → extract ALL public methods
  2. Read model file → extract ALL table columns
  3. Read views → extract ALL form fields, list columns, action buttons
  4. Read API controller → extract ALL public methods
  5. Read mobile queries → extract ALL hooks
  6. Read mobile screens → extract ALL UI operations
  7. Generate Module Operations CSV (Phase 0 deliverable)
```

### 3.2 Phase 1: Gap Analysis (Per Module)

```
For each web controller method:
  1. Does an API endpoint exist? → YES/NO/PARTIAL
  2. Does the mobile app consume it? → YES/NO/PARTIAL
  3. Is the field coverage complete? → List missing fields
  4. Classify gap severity:
     - CRITICAL: Core CRUD missing (blocks mobile usage)
     - HIGH: Sub-resource missing (assignees, comments, files)
     - MEDIUM: Filter/search/action missing
     - LOW: Audit, stats, templates, rare workflows
```

### 3.3 Phase 2: Build Backfill (Per Module)

```
Build priority order:
  1. CRITICAL gaps first → enable basic mobile usage
  2. HIGH gaps next → complete sub-resource CRUD
  3. MEDIUM gaps → enhance with filters/actions
  4. LOW gaps → backlog for later batches

For each gap:
  1. Build API endpoint (PHP)
  2. Build mobile query hook (TypeScript)
  3. Build/update mobile screen (React Native)
  4. Mark in traceability matrix as "BUILT — PENDING TEST"
```

### 3.4 Phase 3: Test & Iterate (Per Module)

```
For each operation in traceability matrix:
  1. Authenticate (curl token or mobile login)
  2. Execute operation (curl or mobile app)
  3. Record HTTP status code
  4. Record response body correctness
  5. Record mobile UI behavior (screen renders, fields populate, actions work)
  6. If FAIL: log defect, fix, increment iteration counter, retest
  7. Only mark SUCCESS when HTTP 200 + correct response + mobile UI correct
  8. Update CSV: Tested=YES, HTTP_Code=200, Success=YES, Iterations=N
```

### 3.5 Phase 4: Ship

```
Criteria for shipping a batch:
  - 100% CRITICAL operations: Tested + 200 OK
  - ≥95% HIGH operations: Tested + 200 OK  
  - ≥90% MEDIUM operations: Tested + 200 OK
  - All defects documented with resolution
  - Traceability matrix signed off
  - ERP code committed + tagged
  - Mobile app built + APK distributed
```

---

## 4.0 TRACEABILITY MATRIX STANDARD

Every module MUST have a CSV file with these columns:

| Column | Description | Valid Values |
|---|---|---|
| `#` | Sequential row number | integer |
| `Batch` | Batch number | 1-10 |
| `Module` | Module name (lowercase) | tasks, customers, invoices... |
| `Operation` | Human-readable operation name | "List All Tasks" |
| `Category` | Operation category | LIST, CREATE, READ, UPDATE, DELETE, SUB, FILTER, SEARCH, TIMER, UPLOAD, DOWNLOAD, STATUS, VALIDATE, BULK, EXPORT |
| `Web_Controller` | Source controller file path | application/controllers/admin/Tasks.php |
| `Web_Method` | Web controller method name | index, task, mark_as... |
| `Web_Available` | Exists in web UI | YES / NO |
| `API_Controller` | Source API controller file | modules/api/controllers/Tasks.php |
| `API_Method` | API controller method name | data_get, data_post... |
| `HTTP_Method` | HTTP verb | GET, POST, PUT, DELETE |
| `API_Endpoint` | Full API URL pattern | /api/tasks?limit=&offset= |
| `API_Available` | API endpoint exists | YES / NO / PARTIAL |
| `API_Status` | API test HTTP code | 200, 404, 500, N/A |
| `Mobile_Screen` | Mobile app screen file | app/(tabs)/tasks/index.tsx |
| `Mobile_Hook` | Mobile query hook | useMyTasks, useMarkTaskComplete... |
| `Mobile_Available` | Mobile feature exists | YES / NO / PARTIAL |
| `Mobile_Status` | Mobile test result | PASS, FAIL, PENDING, N/A |
| `Fields` | Database fields involved | comma-separated column names |
| `Tested` | Has been tested this cycle | YES / NO |
| `Success` | Final success status | YES / NO / PENDING |
| `Iterations` | Number of fix-retest cycles | integer |
| `Gap_Severity` | If gap exists, its severity | CRITICAL, HIGH, MEDIUM, LOW, NONE |
| `Notes` | Any relevant notes | Free text |

---

## 5.0 TEST EXECUTION STANDARDS

### 5.1 API Testing (curl)

```bash
# Authentication
TOKEN=$(curl -s -X POST "$MOBILE_AUTH_URL" \
  -H "Content-Type: application/json" \
  -d '{"email":"$EMAIL","password":"$PASSWORD"}' \
  | grep -oP '"token":"\K[^"]+')

# Test template
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "$API_URL/$ENDPOINT" \
  -H "authtoken: $TOKEN" \
  -H "Content-Type: application/json" \
  ${BODY:+-d "$BODY"})

# Validation criteria:
# - HTTP_CODE must be 200 (or 201 for POST)
# - Response body must contain "status":true
# - Response data structure must match expected schema
```

### 5.2 Mobile Testing (Expo + Emulator)

```bash
# Start Expo
cd prizm-mobile && npx expo start

# Android emulator
npx expo start --android

# Validation criteria per screen:
# - Screen renders without crash
# - List: data loads, pagination works, filters work
# - Detail: all fields populated, tabs render
# - Create: form submits, returns to list with new item
# - Edit: form pre-populated, save persists
# - Delete: confirmation dialog, item removed from list
# - Sub-resources: checklist toggle, comment add/edit/delete, file upload
```

### 5.3 Acceptance Criteria

| Severity | Criteria |
|---|---|
| CRITICAL | 100% must pass |
| HIGH | ≥95% must pass |
| MEDIUM | ≥90% must pass |
| LOW | Documented, backlog OK |

---

## 6.0 DEFECT MANAGEMENT

### 6.1 Severity Classification

| Severity | Definition | Examples |
|---|---|---|
| **S0 — Blocker** | Prevents any testing | Cannot authenticate, API returns 500 globally |
| **S1 — Critical** | Core module operation broken | Cannot list tasks, cannot create customer |
| **S2 — High** | Sub-resource broken | Cannot add assignee, comments fail |
| **S3 — Medium** | Filter/search/action broken | Search returns wrong results, kanban won't load |
| **S4 — Low** | Cosmetic or rare edge case | Wrong icon color, missing audit log entry |

### 6.2 Defect Lifecycle

```
OPEN → IN_PROGRESS → FIXED → RETEST → VERIFIED
                                    ↓
                                  FAILED → IN_PROGRESS (increment iterations)
```

---

## 7.0 DELIVERABLES PER BATCH

| # | Deliverable | Format | Phase |
|---|---|---|---|
| D1 | Module Operations CSV | CSV file | Phase 0 |
| D2 | Gap Analysis Report | CSV appendix rows | Phase 1 |
| D3 | API Code (new endpoints) | PHP files on disk | Phase 2 |
| D4 | Mobile Code (hooks + screens) | TSX files on disk | Phase 2 |
| D5 | Test Execution Log | CSV updated rows | Phase 3 |
| D6 | Defect Register | CSV or Markdown | Phase 3 |
| D7 | Batch Sign-off Report | Markdown summary | Phase 4 |
| D8 | Git commit + tag | Version control | Phase 4 |

---

## 8.0 ROLES & RESPONSIBILITIES

| Role | Responsibility |
|---|---|
| **QA Engineer (Deep Code)** | Sweep modules, identify gaps, build endpoints, build mobile screens, execute tests, update CSVs |
| **Reviewer (Osama)** | Approve batch sign-offs, validate mobile app behavior, sign off on shipments |

---

## 9.0 CURRENT STATE (as of 2026-05-28)

### Tasks Module (Batch 1 — Pilot)
- **Phase 0:** ✅ Complete (73 operations mapped)
- **Phase 1:** ✅ Complete (4 routing bugs, 10 low-priority gaps identified)
- **Phase 2:** ⚠️ Partial (API code complete, 4 routing fixes needed)
- **Phase 3:** ⚠️ 42/73 operations tested (57.5%)
- **Phase 4:** ❌ Not started

### All Other Modules (Batches 2-10)
- **Phase 0:** ❌ Not started

---

## 10.0 NEXT ACTIONS

1. **Complete Tasks Module (Batch 1)** — Fix 4 routing bugs, test remaining 10, bootstrap mobile app
2. **Execute Batch 2** — Customers, Contacts, Leads, Contracts, Business Partners, Projects, Milestones
3. **Execute remaining batches** in priority order
4. **Ship each batch** when acceptance criteria met

---

## 11.0 QC REPORT — SESSION VERIFICATION

### 11.1 Trigger

A QC Report SHALL be generated at the end of every coding session that involves:
- API endpoint creation or modification
- Mobile screen changes
- Database schema changes
- Any deploy to production

The report MAY also be generated on-demand when the user requests "run QC" or "generate QC report."

### 11.2 Template

**Canonical template:** `docs/qc/QC-REPORT-TEMPLATE.md` (this repo)  
**Mirror:** `C:\Users\osama\.claude-brain\_audits\qc-reports\QC-REPORT-TEMPLATE.md`

The template follows:
- **Hawiya v0.1** brand identity — Navy `#103090` classification banner, Calibri typography, A4 layout, Internal classification
- **Asmaa v1.2** codification — naming pattern `PE-QAQC-QC-RPT-{YYNNN}-R{NN}__{session-id}.md`

### 11.3 Report Header (Mandatory Fields)

Every QC Report MUST include in its header:

| Field | Source | Example |
|---|---|---|
| Report Code | Asmaa-generated | `PE-QAQC-QC-RPT-26005-R01` |
| Session ID | Runtime session GUID | `session_a1b2c3d4` |
| Date | ISO 8601 | `2026-05-29` |
| Time | ISO 8601 UTC | `14:30:00Z` |
| Agent | Model identity | `Brother Whale (DeepSeek V4 Pro)` |
| Agent Model | Runtime model string | `deepseek-v4-pro` |
| Workspace | Active repo path | `C:\wamp64\www\prizm-mobile` |
| Duration | Session elapsed time | `2h 15m` |
| Turns | Conversation turn count | `47` |

### 11.4 Canonical Storage

All filled QC Reports SHALL be stored in:

```
C:\Users\osama\.claude-brain\_audits\qc-reports\
```

Named per Asmaa grammar:
```
PE-QAQC-QC-RPT-{YYNNN}-R{NN}__{session-id}.md
```

An index file `_INDEX.md` in the same directory SHALL list all reports with date, batch, and pass/fail status for traceability.

### 11.5 Generation Protocol

1. At session end (or on demand), the agent SHALL:
   - Populate the template with actual session data
   - Execute a final API verification pass if not already done
   - Fill all acceptance criteria fields
   - List all commits with SHAs
   - Record deployment status
2. Save the filled report to the canonical storage location
3. Update `_INDEX.md` with the new report entry
4. Reference the report in the SESSION-HANDOFF.md

---

*This document is living. Update the CURRENT STATE section after each batch completion.*
