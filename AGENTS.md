# AGENTS.md — prizm-mobile (React Native + Expo)

## What this app is

Native mobile client (Android-first, iOS-ready) for the Prizm CRM
backend that lives in `C:/wamp64/www/prizm331`. Talks to
`https://ms.prizm-energy.com/MS/api` (Perfex REST module). Auth is JWT
via the `authtoken` header (NOT `Authorization: Bearer`).

## Architecture

- **expo-router** file-based routing in `app/(tabs)/`.
- **React Query** for every server-state read. Mutations go through
  `apiRequest` (`lib/api.ts`) or `buildAuthHeaders` for direct fetches.
- **AsyncStorage** for sticky-but-non-secret state (read-state of
  notifications, etc.).
- **SecureStore** for auth token + persistent user preferences (dashboard
  layout, biometric flag, View-As session).
- **react-native-gesture-handler + reanimated** for any drag/swipe
  interactions. Always do hot-path math in worklets; never `setState`
  during a pan.

## Auth + impersonation contract

Every authenticated request MUST go through `buildAuthHeaders()` so it
picks up:
- `authtoken: <jwt>` — from `getAuthToken()`
- `X-Impersonate-Staff-Id: <id>` — set when the admin is in a View-As
  session (`lib/impersonation.ts`). Backend silently drops this for
  non-admin callers; safe to send unconditionally.

If you write a new fetch site, use `buildAuthHeaders()`. Don't re-
derive headers inline — the impersonation header will go missing and
View-As will silently break for that endpoint.

## Lessons learned — READ-WEB-FIRST RULE

When the mobile screen mirrors a web admin feature (approve/reject,
workflow transitions, status changes, etc.), **read the web admin's
MVC source FIRST** in `C:/wamp64/www/prizm331/modules/{module}/` before
designing the API or writing the client. Do NOT guess at:

- **Table names** — this codebase has typo'd table names that survived
  historical migrations. `tblprzpurcahse_req_statusdetail` (with
  "purcahse") is the real PR approval table; `tblprz_purchase_request_statusdetail`
  exists but is mostly empty and unused.
- **User-facing IDs** — the web shows "PR-26050023" using
  `prz_purchase_request.sequence_number`, not `id`. `number` is always
  NULL in this install. Every entity has its own canonical user-facing
  number column; find it in the web view template, never assume.
- **Permission logic** — the web view template's `if (...) echo
  '<button>...'` block is the GROUND TRUTH for "can this user act
  right now". Mirror those exact conditions in the API, never
  approximate from the static-config table.

### Concrete grep recipes when starting a "mirror this web feature" task

```bash
# Find the controller action behind a button:
grep -rn "function {hint}" /var/www/html/MS/modules/{module}/controllers/

# Find the AJAX endpoint a button posts to:
grep -rn "onClick" /var/www/html/MS/modules/{module}/views/ | grep -i {action}

# Verify a table name exists with exact spelling BEFORE writing SQL:
mysql ... -e "SHOW TABLES LIKE 'tbl%{hint}%'"

# Walk the view template's button-visibility conditions to get the
# canonical permission triple:
sed -n '/buttonEnabled/,/echo.*button/p' modules/{module}/views/.../view.php
```

### Trap caught Nov 2026

Built mobile approve/reject hitting `tblprz_purchase_request_statusdetail`
("the obvious table"). Web uses `tblprzpurcahse_req_statusdetail` (typo).
Every POST 403'd; user was rightly furious. Reading the model query
(`Przpurchase_model::getPrzPurchaseApprovalInfo`) ONCE would have caught
this in 30 seconds. The fix was 10 minutes once the right table was
identified. Don't repeat.

## Backend repo conventions

- The mobile app's backend code lives in `C:/wamp64/www/prizm331`.
- API extensions are in `modules/api/controllers/`:
  - `My_api.php` — `/api/my/*` self-service (profile, leave, expenses,
    payslips, notifications, tasks-summary)
  - `Inbox_api.php` — `/api/inbox` aggregator
  - `Purchase_api.php` — `/api/purchase_api/*` (PR + PO + vendors)
  - `Admin_api.php` — `/api/admin/*` (impersonation, staff list)
- Workflow: PR `Ghazalawy/main` → `PrizmIT/main`. Deploy via
  on-demand workflow (`gh workflow run "Deploy On Demand" -R Ghazalawy/prizm331`).
- Production server: ms.prizm-energy.com (Hetzner, /var/www/html/MS).
  SSH key: `~/.ssh/hetzner_DESKTOP-9GO5QC0` as root.

## CI / build

- `gh run list -R Ghazalawy/prizm-mobile` shows build status.
- APK published as a rolling release at
  `github.com/Ghazalawy/prizm-mobile/releases/latest`.
- In-app auto-update banner polls that release on app start.
- TypeScript: `npx tsc --noEmit -p tsconfig.json` before commit. The 3
  pre-existing errors (datetimepicker, image-picker, document-picker)
  are missing peer deps, not regressions — ignore them.

## Don'ts

- DON'T re-derive auth headers inline; use `buildAuthHeaders()`.
- DON'T setState during a pan/drag; use shared values and worklets.
- DON'T use `id` for user-facing display of any entity that has a
  separate canonical number column.
- DON'T trust static config (`*_statuses_approvers`) as a proxy for
  "this user can act NOW"; the per-record state (`*_statusdetail`
  rows with `is_current_status` + `status` columns) is the truth.
- DON'T treat HTTP 403 as session-expired. Only 401 is unauthenticated;
  403 is "authenticated but lacks permission for this specific action"
  and should NOT trigger sign-out. (See `lib/api.ts::isInvalidTokenResponse`.)

## Session-End QC Report Protocol

After every coding session that modifies API endpoints, mobile screens, or
database schemas — or when the user requests "run QC":

1. Populate `docs/qc/QC-REPORT-TEMPLATE.md` with actual session data:
   - Report header: date, time, agent, model, workspace, session ID, turns
   - Test results: all endpoints verified with HTTP codes
   - Acceptance criteria: pass/fail percentages per severity
   - Code changes: files modified, commits with SHAs
   - Deployment status
2. Save filled report per Asmaa naming grammar:
   `PE-QAQC-QC-RPT-{YYNNN}-R{NN}__{session-id}.md`
3. Store in canonical location:
   `C:\Users\osama\.claude-brain\_audits\qc-reports\`
4. Update `_INDEX.md` with the new report entry
5. Reference the report in `SESSION-HANDOFF.md`

Template and policy at `docs/QA-QC-POLICY-AND-PLAN.md` §11.0.
Brand identity by Hawiya v0.1. Naming by Asmaa v1.2.
