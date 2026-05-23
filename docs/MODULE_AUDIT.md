# Prizm Mobile — Module Audit & Anatomy

> Canonical source of truth for what's built, what's partial, and what's
> intentionally deferred across every CRM module that the mobile app touches.
> Update this file at the end of every batch — it replaces the need to
> re-audit modules manually.

**Last updated:** 2026-05-23 (after batch 7 — Proposals + Leads workflow)
**Maintained by:** the Claude session that ships each batch
**Lives in:** `prizm-mobile/docs/MODULE_AUDIT.md` (mobile repo — easy to keep in sync with `lib/module-registry.ts`)

---

## How to read this doc

Three layers per module:

1. **Web surface** — what the web admin can do (controller + view + model)
2. **API surface** — what's exposed via `modules/api/controllers/*.php`
3. **Mobile surface** — what's declared in `lib/module-registry.ts` and what `actions[]` are wired

Status legend:
- ✅ **Complete** — every web action that makes sense on mobile is exposed + wired + activity-log tagged
- 🟡 **Partial** — CRUD works, some workflow actions still web-only
- 🔴 **Stub** — registry entry exists but no workflow actions
- ⚫ **Not on mobile** — intentionally excluded (config-only, admin-rare)

---

## Executive summary

| # | Module | Group | Web | API | Mobile | Actions | Status |
|---|---|---|---|---|---|---|---|
| 1 | Customers | CRM | ✅ | ✅ CRUD | ✅ fields/tabs/files | — | 🟡 no workflow actions (none meaningful) |
| 2 | Contacts | CRM | ✅ | ✅ CRUD | ✅ | — | 🟡 |
| 3 | Leads | CRM | ✅ | ✅ + status (b7) | ✅ + change-status | 1 | ✅ |
| 4 | Projects | Work | ✅ | ✅ + 4 mark_* (b6) | ✅ + 4 mark_* | 4 | ✅ |
| 5 | Tasks | Work | ✅ | ✅ + timer/mark/reopen (b5) | ✅ + 4 actions | 4 | ✅ |
| 6 | Invoices | Sales | ✅ | ✅ + send/cancel/payment (b2) | ✅ + 3 actions | 3 | ✅ |
| 7 | Estimates | Sales | ✅ | ✅ + send/convert/mark (b2) | ✅ + 5 actions | 5 | ✅ |
| 8 | Proposals | Sales | ✅ | ✅ + send/copy/5×mark (b7) | ✅ + 7 actions | 7 | ✅ |
| 9 | Contracts | Sales | ✅ | ✅ + sign/send/renew (b2) | ✅ + 3 actions | 3 | ✅ |
| 10 | Expenses | Finance | ✅ | ✅ + billable/copy (b2) | ✅ + 3 actions | 3 | ✅ |
| 11 | Tickets | Support | ✅ | ✅ + reply/status/assign/priority (b2) | ✅ + 4 actions | 4 | ✅ |
| 12 | Credit Notes | Sales | ✅ | ✅ CRUD only | ✅ | — | 🟡 apply/refund deferred |
| 13 | Payments | Finance | ✅ | ✅ CRUD | ✅ | — | 🟡 no workflow needed |
| 14 | Subscriptions | Sales | ✅ | ✅ CRUD | ✅ | — | 🟡 cancel/pause deferred |
| 15 | Tenders | PRIZM | ✅ | ✅ + status/won/lost (b1) | ✅ + actions | 3 | ✅ |
| 16 | Opportunities | PRIZM | ✅ | ✅ + stage/status (b1) | ✅ + actions | 2 | ✅ |
| 17 | Purchase Orders | PRIZM | ✅ | ✅ + 5 workflow (b1) | ✅ + 5 actions | 5 | ✅ |
| 18 | Purchase Requests (RFQs) | PRIZM | ✅ | ✅ + publish/close (b1) | ✅ + 2 actions | 2 | ✅ |
| 19 | Materials | PRIZM | ✅ | ✅ CRUD + AI classify | 🟡 fields only | — | 🟡 |
| 20 | Technical Inquiries | PRIZM | ✅ | ✅ CRUD | 🟡 fields only | — | 🟡 convert-to-RFQ deferred |
| 21 | Goals | HR | ✅ | ✅ + publish/complete (b3) | ✅ + 2 actions | 2 | ✅ |
| 22 | Surveys | HR | ✅ | ✅ + publish (b3) | ✅ + 1 action | 1 | ✅ |
| 23 | Knowledge | HR | ✅ | ✅ + publish/unpublish (b3) | ✅ + 2 actions | 2 | ✅ |
| 24 | Recruitment Candidates | HR | ✅ | ✅ + hire/reject/stage (b3) | ✅ + 3 actions | 3 | ✅ |
| 25 | Recruitment Positions | HR | ✅ | ✅ CRUD only | ✅ | — | 🟡 open/close deferred |
| 26 | HR Payslips | HR | ✅ | ✅ + mark_paid (b3) | ✅ + 1 action | 1 | ✅ |
| 27 | Gatepass | Ops | ✅ | ✅ + approve/reject/close (b4) | ✅ + 3 actions | 3 | ✅ |
| 28 | Budget Items | Finance | ✅ | ✅ + approve/reject (b4) | ✅ + 2 actions | 2 | ✅ |
| 29 | Fixed Equipment | Ops | ✅ | ✅ + allocate/return (b4) | ✅ + 2 actions | 2 | ✅ |
| 30 | Business Partners | Ops | ✅ | ✅ CRUD | ✅ | — | ⚫ config-only |
| 31 | Cost Centers | Ops | ✅ | ✅ CRUD + members | ✅ | — | ⚫ admin-rare on mobile |
| 32 | Timesheets | Work | ✅ | ✅ CRUD | ✅ | — | 🟡 covered by Tasks timer |
| 33 | Milestones | Work | ✅ | ✅ CRUD | ✅ | — | 🟡 no workflow needed |
| 34 | Files | Cross-cut | ✅ | ✅ upload/list | ✅ FilesTab | — | ✅ |
| 35 | Staff | Admin | ✅ | ✅ CRUD | ✅ | — | ⚫ admin-only |
| 36 | Items (catalog) | Sales | ✅ | ✅ CRUD | ✅ | — | ⚫ config |
| 37 | Calendar | Work | ✅ | ✅ list | 🟡 stub | — | 🔴 needs calendar UI |
| 38 | Automation | Admin | ✅ | ✅ CRUD | ✅ stub | — | ⚫ admin-only |
| 39 | OTP Manager | Admin | ✅ | ✅ list | ✅ stub | — | ⚫ admin-only |
| 40 | Allowed Payment Modes | Sales | ✅ | ✅ list | ✅ | — | ⚫ ref-data |
| 41 | Tender BOQ | PRIZM child | ✅ | ✅ CRUD | ✅ tab | — | ✅ |
| 42 | Tender Risks | PRIZM child | ✅ | ✅ CRUD | ✅ tab | — | ✅ |
| 43 | Tender Requirements | PRIZM child | ✅ | ✅ CRUD | ✅ tab | — | ✅ |
| 44 | Opportunity BOQ | PRIZM child | ✅ | ✅ CRUD | ✅ tab | — | ✅ |
| 45 | Opportunity Notes | PRIZM child | ✅ | ✅ CRUD | ✅ tab | — | ✅ |
| 46 | Purchase Vendors | PRIZM | ✅ | ✅ CRUD | ✅ | — | 🟡 no workflow |
| 47 | Vendor Contacts | PRIZM child | ✅ | ✅ CRUD | ✅ tab | — | ✅ |
| 48 | Task Checklist / Comments / Assignments / Followers | Work child | ✅ | ✅ via tasks/* | ✅ tabs | — | ✅ |
| 49 | Tickets replies / statuses / priorities | Support child | ✅ | ✅ ref-data | ✅ relations | — | ✅ |

**Totals:**
- **49 modules registered** in `lib/module-registry.ts`
- **23 modules with workflow actions wired** (⋮ menu in detail screen)
- **~60 mobile workflow endpoints added to the API** across 7 CRM PRs (PRs #264 → #270)
- **8 controllers instrumented with `Mobile_audit`** library (`[Mobile]` prefix in `tblactivity_log`)

---

## Per-module anatomy

### 1. Customers (`customers`)

- **Web controller:** `application/controllers/admin/Clients.php`
- **Web model:** `application/models/Clients_model.php` — public mutations: `add`, `update`, `delete`, `change_contact_status`, `merge`
- **API controller:** `modules/api/controllers/Customers.php`
- **API endpoints:** standard CRUD via `data_get/post/put/delete` + `/api/customers/count`
- **Mobile registry:** key `customers`, endpoint `customers`, has fields + tabs (contacts/invoices/estimates/proposals/projects/tasks/tickets/files/notes)
- **`customFieldsType`:** `customers`
- **Workflow actions wired:** none (no real workflow actions on the web either — staff edit fields directly)
- **Open decisions:**
  - "Send credentials" — useful for client portal onboarding from phone. No CRM endpoint exists. **Deferred** per user (2026-05-23).
  - Merge two customers — admin-rare, deferred indefinitely.

### 2. Contacts (`contacts`)

- **Web:** sub-resource under Customers; `application/controllers/admin/Clients.php::contact()`
- **API:** `modules/api/controllers/Contacts.php` — CRUD
- **Mobile:** key `contacts`, full fields including phone/email/title
- **Workflow:** none needed

### 3. Leads (`leads`) ✅

- **Web controller:** `application/controllers/admin/Leads.php` — includes `convert_to_customer`, `leads_kanban`, `update_lead_status` via model
- **Web model:** `Leads_model::update_lead_status($data)` — fires `after_lead_status_change` hook + `log_activity`
- **API controller:** `modules/api/controllers/Leads.php` — CRUD + (batch 7) `status_put`
- **API endpoints:**
  - `GET /api/leads` (paginated list)
  - `GET /api/leads/:id`
  - `POST/PUT/DELETE` (CRUD)
  - `PUT /api/leads/:id/status` (batch 7, v2.5.6) — body `{status: int}`
- **Mobile:** full fields incl. source/status relations, tasks+projects+files tabs, custom fields
- **Mobile actions:** `change_status` (form: status id) → wraps `update_lead_status()`
- **Mobile_audit:** ✅ tagged on status changes
- **Open decisions:**
  - "Convert to customer" — admin form is 60+ lines with merge options. Useful from phone but needs `Leads_model::convert_to_customer_api()` helper that doesn't exist yet. **Deferred.**

### 4. Projects (`projects`) ✅

- **Web controller:** `application/controllers/admin/Projects.php`
- **Web model:** `Projects_model::mark_as(['project_id' => $id, 'status_id' => N])` — fires `project_status_changed` hook + `log_activity`
- **API controller:** `modules/api/controllers/Projects.php` — CRUD + (batch 6, v2.5.5) 4 mark_* endpoints
- **API endpoints:**
  - `PUT /api/projects/:id/mark_in_progress` (status 2)
  - `PUT /api/projects/:id/mark_on_hold` (status 3)
  - `PUT /api/projects/:id/mark_finished` (status 4)
  - `PUT /api/projects/:id/mark_cancelled` (status 5)
- **Mobile:** full registry — fields/team/billing/notes/dates/settings sections, tabs (tasks/milestones/invoices/expenses/tickets/files), custom fields
- **Mobile actions:** 4 mark_* (in_progress / on_hold / finished / cancelled)
- **Mobile_audit:** ✅ tagged on each transition (in addition to native hook log)

### 5. Tasks (`tasks`) ✅

- **Web controller:** `application/controllers/admin/Tasks.php`
- **Web model:** `Tasks_model::timer_tracking()` handles start/stop; status changes log natively
- **API controller:** `modules/api/controllers/Tasks.php` — CRUD + (batch 5, v2.5.4) timer + mark_complete + reopen
- **API endpoints:**
  - `POST /api/tasks/:id/timer/start`
  - `POST /api/tasks/:id/timer/stop` (body `{timer_id, note?}`)
  - `PUT /api/tasks/:id/mark_complete` (sets status=5, datefinished)
  - `PUT /api/tasks/:id/reopen` (status=1, clears datefinished)
- **Mobile:** fields, tabs (checklist/comments/assignments/followers/files), custom fields
- **Mobile actions:** 4 (start/stop timer, mark complete, reopen)

### 6. Invoices (`invoices`) ✅

- **Web model:** `Invoices_model::send`, `update_invoice_status`, `Payments_model::add`
- **API endpoints (batch 2, v2.5.1):**
  - `POST /api/invoices/:id/send`
  - `PUT /api/invoices/:id/mark_cancelled`
  - `POST /api/invoices/:id/record_payment` (form: amount, mode, date, txn id, note)
- **Mobile actions:** 3 (send, mark cancelled, record payment)
- **Note:** `record_payment` routes through `Payments_model::add()` which fires the standard payment-added hook + emails + activity log.

### 7. Estimates (`estimates`) ✅

- **API endpoints (batch 2):**
  - `POST /api/estimates/:id/send`
  - `POST /api/estimates/:id/convert_to_invoice`
  - `PUT .../mark_sent | mark_accepted | mark_declined`
- **Mobile actions:** 5

### 8. Proposals (`proposals`) ✅

- **Web model:** `Proposals_model::mark_action_status($status, $id)`, `send_proposal_to_email`, `copy`
- **API endpoints (batch 7, v2.5.6):**
  - `POST /api/proposals/:id/send` (body `{attachpdf?, cc?}`)
  - `POST /api/proposals/:id/copy`
  - `PUT .../mark_open | mark_sent | mark_revised | mark_accepted | mark_declined`
- **Mobile actions:** 7
- **Open decisions:**
  - Convert to Estimate / Invoice — admin form does ~60 lines of item/tax/discount carry. Risks dropping line items if one-shot. **Deferred** per user (2026-05-23).

### 9. Contracts (`contracts`) ✅

- **API endpoints (batch 2):**
  - `POST /api/contracts/:id/sign` → mark_as_signed
  - `POST /api/contracts/:id/send` → send_to_email
  - `POST /api/contracts/:id/renew` (body `{date_start, date_end}`)
- **Mobile actions:** 3

### 10. Expenses (`expenses`) ✅

- **API endpoints (batch 2):**
  - `PUT /api/expenses/:id/mark_billable`
  - `PUT /api/expenses/:id/mark_not_billable`
  - `POST /api/expenses/:id/copy`
- **Mobile actions:** 3

### 11. Tickets (`tickets`) ✅

- **Web model:** `Tickets_model::add_reply`, `change_ticket_status`, `update_single_ticket` (assignee + priority)
- **API endpoints (batch 2):**
  - `POST /api/tickets/:id/reply` (body `{message, attachment?}`)
  - `PUT /api/tickets/:id/status` (body `{status: int}`)
  - `PUT /api/tickets/:id/assign` (body `{assigned: staffid}`)
  - `PUT /api/tickets/:id/priority` (body `{priority: int}`)
- **Mobile actions:** 4

### 12. Credit Notes (`credit_notes`) 🟡

- **Web model:** `Credit_notes_model::apply_credits($id, $data)`, `delete_refund`
- **API:** CRUD only; no apply/refund endpoints
- **Mobile:** registry, no actions
- **Open decisions:** apply-credits and record-refund need complex forms (invoice picker, amount validation). **Deferred** per user (2026-05-23).

### 13. Payments (`payments`) 🟡 by design

- CRUD only — payments are recorded *through* invoices (see Invoices `record_payment`)

### 14. Subscriptions (`subscriptions`) 🟡

- **API:** CRUD only
- **Open decisions:** cancel / pause would need new model methods. **Deferred** per user.

### 15. Tenders (`tenders`) ✅ [Prizm-core, batch 1]

- **Web controller:** `modules/prz_tenders/controllers/admin/Tenders.php`
- **API controller:** `modules/api/controllers/Tenders_api.php`
- **API endpoints (batch 1, v2.5.0):**
  - `PUT /api/tenders_api/:id/status`
  - `POST /api/tenders_api/:id/mark_won`
  - `POST /api/tenders_api/:id/mark_lost`
- **Mobile:** full fields + tabs (BOQ / requirements / risks / documents)
- **Mobile actions:** 3

### 16. Opportunities (`opportunities`) ✅

- **API endpoints (batch 1):**
  - `PUT /api/opportunities_api/:id/stage` (body `{stage_id}`)
  - `PUT /api/opportunities_api/:id/status` (body `{status_id}`)
- **Mobile actions:** 2

### 17. Purchase Orders (`purchase_orders`) ✅

- **API controller:** `modules/api/controllers/Purchase_api.php` with `_po_set_status()` helper
- **API endpoints (batch 1):**
  - `PUT /api/purchase_api/orders/:id/approve`
  - `PUT .../reject`
  - `PUT .../send_to_supplier`
  - `PUT .../mark_received`
  - `PUT .../mark_paid`
- **Mobile actions:** 5

### 18. Purchase Requests / RFQs (`purchase_requests`) ✅

- **API endpoints (batch 1):**
  - `PUT /api/purchase_api/requests/:id/publish`
  - `PUT .../close`
- **Mobile actions:** 2

### 19. Materials (`materials`) 🟡

- **API controller:** `modules/api/controllers/Materials_catalog.php`
- **Endpoints:** CRUD + AI classify + metadata KV + UNSPSC search/lookup
- **Mobile:** registry with basic fields, no workflow actions wired
- **Open decisions:** Materials are catalog reference data — no clear per-record workflow actions. Bulk reclassification would need a richer UI. **Status: 🟡 partial — acceptable for now.**

### 20. Technical Inquiries (`technical_inquiries`) 🟡

- **API:** CRUD only
- **Open decisions:** convert-to-RFQ workflow lives in admin controller — would need a new endpoint. **Deferred.**

### 21. Goals (`goals`) ✅

- **API endpoints (batch 3, v2.5.2):**
  - `PUT /api/goals_api/:id/mark_completed`
  - `PUT .../mark_failed`
- **Mobile actions:** 2

### 22. Surveys (`surveys`) ✅

- **API endpoints (batch 3):**
  - `PUT /api/surveys_api/:id/publish`
- **Mobile actions:** 1

### 23. Knowledge (`knowledge`) ✅

- **API endpoints (batch 3):**
  - `PUT /api/knowledge_api/:id/publish`
  - `PUT /api/knowledge_api/:id/unpublish`
- **Mobile actions:** 2

### 24. Recruitment Candidates (`recruitment_candidates`) ✅

- **API endpoints (batch 3):**
  - `POST /api/recruitment_api/candidates/:id/hire`
  - `POST .../reject`
  - `PUT .../change_stage` (body `{stage_id}`)
- **Mobile actions:** 3

### 25. Recruitment Positions (`recruitment_positions`) 🟡

- CRUD only; no open/close model methods exist in `Recruitment_model.php`
- **Open decisions:** would need new model methods. **Deferred** per user.

### 26. HR Payslips (`hr_payslips`) ✅

- **API endpoints (batch 3):**
  - `PUT /api/hr_payroll_api/payslips/:id/mark_paid`
- **Mobile actions:** 1

### 27. Gatepass (`gatepass`) ✅ [batch 4, v2.5.3]

- **API endpoints:**
  - `PUT /api/gatepass_api/:id/approve`
  - `PUT .../reject`
  - `PUT .../close`
- **Mobile actions:** 3

### 28. Budget Items (`budget_items`) ✅

- **API endpoints (batch 4):**
  - `POST /api/budget_api/items/:id/approve` (pre-existing)
  - `POST .../reject` (batch 4)
- **Mobile actions:** 2

### 29. Fixed Equipment (`fixed_equipment`) ✅ [batch 4]

- **API endpoints:**
  - `PUT /api/fixed_equipment_api/:id/allocate` (body `{staff_id, location_id?}`)
  - `PUT .../return`
- **Mobile actions:** 2

### 30–49

Child resources (BOQ rows, requirements, risks, notes, comments, checklist items, followers, etc.) inherit their parent's auth/audit. Listed for completeness, mobile shows them as tabs under the parent detail screen.

Admin-only modules (Staff, Items, Automation, OTP Manager, Business Partners, Cost Centers) deliberately have no workflow actions on mobile.

---

## Cross-cutting components

### Authentication

- `mobile_auth.php` (root) — JWT issue endpoint. Looks up `tblstaff` by email, verifies via phpass, returns `{token, staff: {staffid, ...}}`.
- Mobile: `lib/auth.ts` persists token + staff profile in SecureStore. `lib/auth-context.tsx` exposes `useAuth()` and `useCurrentUser()`.
- Auth header expected by Perfex API: `authtoken: <jwt>` (NOT `Authorization: Bearer`).

### Activity log

- `modules/api/libraries/Mobile_audit.php` — wraps `log_activity()` with a `[Mobile]` prefix.
- Usage in any API controller: `$this->load->library('mobile_audit'); $this->mobile_audit->action('Module', $id, 'verb');`
- Result: `[Mobile] Module #123 verb` row in `tblactivity_log`, alongside any native log.
- Mobile-side: `useMyActivity(staffid)` hook → `app/(tabs)/activity.tsx` screen, accessible from Settings → My Activity.

### Custom fields

- Endpoint: `/api/custom_fields/:type/:id` (GET/PUT) — handles per-entity custom fields.
- Mobile: `CustomFieldsSection` renders read + edit UI for every type set via `customFieldsType` in the registry entry.
- Supported types: customers, leads, contracts, invoices, estimates, expenses, tickets, tasks, projects, proposals, contacts, items, plus Prizm-custom (tenders, opportunities).

### Files / attachments

- Endpoint: `/api/files/upload_bytes` (POST multipart), `/api/files?rel_type=X&rel_id=Y` (list).
- Mobile: generic `FilesTab` component, declared in any module's `tabs[]` as `{ kind: 'files', moduleKey: 'files' }`.

### Reference data / FK relations

- Endpoint: `/api/reference_data/:type` — single endpoint for all FK lookups.
- Supported relations: customer, staff, country, currency, customer_group, payment_mode, tax_rate, lead_source, lead_status, ticket_priority, ticket_status. Add new ones by extending `Reference_data.php` + adding a `RelationKind` literal in mobile.

### Update mechanism

- GitHub Releases hosts the APK. Release name encodes the short SHA (e.g. `Latest build (b3f019e)`).
- Mobile compares the release SHA to `BUILD_SHA` baked into `lib/build-info.ts` at build time.
- If different → in-app download via `expo-file-system/legacy` + Android VIEW intent on the FileProvider URI.

### "What's new" popup

- `CHANGELOG.json` at the mobile repo root. CI's "Inject build metadata" step copies the TOP entry into `lib/build-info.ts`.
- `<WhatsNewModal />` reads it from build info and shows once per build SHA (uses AsyncStorage to remember which SHA has been seen).

---

## In-flight: Action Center

> User asked 2026-05-23 for a top-of-screen "ribbon" that surfaces:
> - Approvals waiting for me
> - Tasks due today / overdue
> - Mentions + replies
> - Compliance items (timesheets to submit, training, expiring docs)
>
> UX: top bar with category chips → tap → bottom sheet → drill into the
> specific module record. Bottom tabs unchanged.

Plan tracked in tasks #37 (`Inbox_api`) + #38 (mobile UI). Schema research delegated to a background research agent (alphabetical inventory of all `modules/api/controllers/*` + approval table scan). When the agent returns, the design will be filled in below.

### Day-1 categories (from user 2026-05-23)

1. **Approvals** — pending budget items, expenses, POs, payslips, leave, gatepasses where current staff is in the approver chain and hasn't yet acted
2. **Tasks** — `tbltasks` joined `tbltask_assigned` where `staffid = me AND status != 5`, bucketed (overdue / today / week)
3. **Mentions & replies** — `tblnotifications` where `touserid = me AND isread = 0`
4. **Compliance & deadlines** — open timesheets, overdue training, gatepass/contract expirations < 30 days

### Proposed endpoint shape

```
GET /api/inbox

Response:
{
  status: true,
  data: {
    summary: { total: 13, approvals: 3, tasks: 7, mentions: 2, compliance: 1 },
    approvals:  [ { type, id, title, subtitle, module, deeplink, actions: [...], priority, age_days } ],
    tasks:      [ { type:"task", id, title, subtitle, due_at, priority, deeplink } ],
    mentions:   [ { type:"notification", id, description, fromuserid, deeplink } ],
    compliance: [ { type, id, title, days_remaining, deeplink } ]
  }
}
```

---

## Deferred decisions (single source of truth)

These are deliberately on hold per user decision 2026-05-23:

| Module | Item | Reason | Reopens when |
|---|---|---|---|
| Proposals | Convert to Estimate / Invoice | 60+ lines of state munging risk dropping line items | When `Proposals_model::convert_to_*_api()` helpers exist |
| Credit Notes | Apply credit / record refund | Complex multi-record form | User explicitly requests |
| Customers | Send credentials / portal invite | No CRM endpoint exists | User explicitly requests |
| Recruitment Positions | Open / close | No model methods | User explicitly requests |
| Subscriptions | Cancel / pause | Same as above | User explicitly requests |
| Customers | Merge two customers | Admin-rare on phone | Indefinitely deferred |
| All | "My Activity" feed | (now done — batch 8) | — |

---

## How to ship the next batch

1. Pick 3–5 modules from the 🟡 rows or add new actions to ✅ rows
2. **CRM side:** worktree off `upstream/main`, hotfix branch `hotfix/api-batch-N`, add endpoints + routes + Mobile_audit calls + changelog entry. Open PR to PrizmIT/prizm331. Merge → Hetzner pull → cleanup worktree.
3. **Mobile side:** add `actions[]` entries to the relevant modules in `lib/module-registry.ts`. Update `CHANGELOG.json` top entry. Commit + push to trigger APK build.
4. **Update this audit doc** — bump status badges, fill in API endpoint list, note any new deferred decisions.

---

## Changelog

- **2026-05-23 — Initial doc** (post-batch-7): captures batches 1–7 from memory + structure for future batches. Action Center planned. My Activity feed shipped.
