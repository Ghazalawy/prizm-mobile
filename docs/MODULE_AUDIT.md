# Prizm Mobile — Module Audit & Anatomy

> Canonical source of truth for what's built, what's partial, and what's
> intentionally deferred across every CRM module that the mobile app touches.
> Update this file at the end of every batch — it replaces the need to
> re-audit modules manually.

**Last updated:** 2026-05-30 (routing cleanup — no ERP browser escapes)
**Recent:** internal Prizm ERP URLs from notifications, approvals, search, generic URL fields, purchase notes, and purchase attachments now resolve through `lib/native-routing.ts` and stay inside the mobile app. Unknown internal ERP links fall back to the ERP hub instead of opening the web admin.
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
| 17 | Purchase Orders | PRIZM | ✅ | ✅ + workflow + approval detail (b14) | ✅ native approval/actions/files | 5 | ✅ |
| 18 | Purchase Requests (RFQs) | PRIZM | ✅ | ✅ + approve/reject/publish/close, list/detail parity hardening (b13) | ✅ + actions/files | 4 | ✅ |
| 18a | Payment Requests (MT) | PRIZM | ✅ | ✅ read/list/detail + approve/reject (b14) | ✅ native approval/files | 2 | ✅ |
| 18b | Expense Requests | PRIZM | ✅ | ✅ read/list/detail + approve/reject (b14) | ✅ native approval/files | 2 | ✅ |
| 18c | Received Vouchers | PRIZM | ✅ | ✅ read/list/detail (b13) | ✅ native read/files | — | 🟡 workflow native pending |
| 18d | Delivery Notes | PRIZM | ✅ | ✅ read/list/detail (b13) | ✅ native read/files | — | 🟡 workflow native pending |
| 18e | Supplier Quotations | PRIZM | ✅ | ✅ read/list/detail (b13) | ✅ native read/files | — | 🟡 workflow native pending |
| 18f | Completion Certificates | PRIZM | ✅ | ✅ read/list/detail (b13) | ✅ native read | — | 🟡 workflow native pending |
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
| 34 | Files | Cross-cut | ✅ | ✅ upload/list/download, purchase rel_type aliases (b13) | ✅ FilesTab preview/upload | — | ✅ |
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
- **55 modules registered** in `lib/module-registry.ts`
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

## Recently shipped: employee self-service (batches 9-12, 2026-05-23 → 2026-05-24)

A new `/api/my/*` namespace was added to the CRM, with the principle that every endpoint resolves the staff_id from the auth token — no `/{id}/` in URLs. This unlocked the mobile **Me** workflow.

### CRM endpoints (live on Hetzner, see `modules/api/controllers/My_api.php`)

| Version | Endpoint | Purpose |
|---|---|---|
| v2.7.0 | `GET /api/my` | One-shot dashboard payload (profile + checkin status + counts) |
| v2.7.0 | `GET /api/my/profile` | Staff record + departments + role name |
| v2.7.0 | `POST /api/my/checkin` | Clock in/out — wraps `Timesheets_model::check_in()`. Honors IP whitelist + geo-fence + route validation. |
| v2.7.0 | `GET /api/my/checkin/today` | Today's check-in/out rows |
| v2.7.0 | `GET /api/my/checkin/history?days=N` | Last N days (max 90) |
| v2.7.0 | `GET /api/my/notifications` | Paginated, `?unread=1` filter |
| v2.7.0 | `PUT /api/my/notifications/{id}/read` | Scoped to own |
| v2.7.0 | `PUT /api/my/notifications/read_all` | Bulk |
| v2.7.1 | `POST /api/my/leave/request` | Submit a leave request — wraps `add_requisition_ajax()` |
| v2.7.1 | `GET /api/my/leave/balance?year=` | Remaining days per leave type |
| v2.7.1 | `GET /api/my/leave/requests?status=` | List MY submitted requests |
| v2.7.1 | `GET /api/my/leave/request/{id}` | Single (own) |
| v2.7.1 | `DELETE /api/my/leave/request/{id}` | Cancel pending |
| v2.7.2 | `GET /api/my/payslips` | List own payslip-detail rows (from `tblhrp_payslip_details`) |
| v2.7.2 | `GET /api/my/payslips/{id}` | Single (own) |
| v2.7.2 | `GET /api/my/payslips/{id}/pdf` | Binary PDF stream — wraps `Hr_payroll_model::hr_payroll_get_payslip_pdf_only_for_pdf()` |
| v2.7.3 | `GET /api/my/expenses?from=&to=` | List own expenses + summary (total submitted, total billed) |
| v2.7.3 | `GET /api/my/expenses/{id}` | Single (own) |
| v2.7.3 | `POST /api/my/expenses` | Submit new expense — wraps `Expenses_model::add()` |

Total: **17 new `/api/my/*` endpoints** across 4 PRs (#276, #278, #279, #280, all merged to PrizmIT/prizm331:main).

### Mobile screens

| Route | Reached from | Status |
|---|---|---|
| `(tabs)/settings.tsx` | Bottom tab "Settings" | Now hosts the **CheckinCard** at the top + links to all the My-* screens |
| `(tabs)/activity.tsx` | Settings → My Activity | List of `tblactivity_log` rows scoped to current staff, with `[Mobile]` filter |
| `(tabs)/leave.tsx` | Settings → My Leave | Balance card + request history + cancel-pending button |
| `(tabs)/leave-new.tsx` | FAB on My Leave | Submit form (rel_type radio + type_of_leave pills + dates + reason) |
| `(tabs)/payslips.tsx` | Settings → My Payslips | List with month / pay number / net pay headline |
| `(tabs)/payslip-detail.tsx` | Tap a payslip | Full breakdown: gross → deductions → PAYE → net, plus workdays + leave days |
| `(tabs)/expenses-mine.tsx` | Settings → My Expenses | List with summary (total submitted, total billed), BILLED/BILLABLE badges |

### Deferred (deliberately)

- **PDF download** for payslips on mobile — endpoint exists; UI needs `expo-file-system` download + `expo-intent-launcher` VIEW pattern (same as APK self-update flow). Easy follow-up.
- **Receipt photo capture** for expenses — needs `expo-image-picker` in package.json. POST endpoint accepts the data but mobile form not yet wired.
- **Geo-fence on check-in** — needs `expo-location`. CheckinCard currently doesn't send coordinates; server falls back to IP whitelist.
- **Submit hourly leave** (partial-day) — current form pads start/end to 09:00 / 18:00 (full-day granularity).
- **Approve subordinates' leave from mobile** — endpoint not yet built; would extend the Inbox/Action Center "approvals" category.

### Hardening backlog

- `Hr_payroll_api.php` references non-existent tables (`tblpayslips` etc) — bypassed by `My_api` using the real `tblhrp_*` names. Fix or replace the legacy API.
- `deploy.php` tokens still hardcoded in PHP source (rotated 2026-05-23 but not yet refactored to env-file).
- `MONITOR_DEFAULT_BEARER` rotation pending (needs Android app rebuild coordination).
- `YAHOO_MCP_ENV` rotation pending (Osama to regen at developer.yahoo.com).
- Bluehost-side `deploy.php` token sync (manual FTP edit).
- Branch protection on `PrizmIT/prizm331:main`.
- See `policy_incident_response_2026_05_22.md` in claude-brain for the full list.

---

## Action Center ✅ (shipped 2026-05-23)

**Backend** — `GET /api/inbox` (ERP v2.6.0, PR #275 merged, Hetzner live):
- `Inbox_api::index_get()` aggregates 4 categories in one round trip
- Each source wrapped in try/catch — missing module table doesn't kill the inbox
- Auth via standard `authtoken` header; staff id resolved via `get_staff_user_id()` with fallback to `tbluser_api` lookup

**Frontend** — `components/ActionCenter.tsx` mounted in `(tabs)/_layout.tsx` ABOVE the Tabs:
- Horizontal strip of 4 chips (Approvals / Tasks / Mentions / Compliance) with badge counts
- Tap a chip → modal bottom sheet with the items in that category
- Each row shows priority dot + title + subtitle + optional inline quick-action buttons (Approve / Reject / Done)
- Polls every 90 s (`refetchInterval` in React Query)
- Link handling now delegates to `lib/native-routing.ts`: Prizm ERP/admin URLs route to native screens or the ERP hub; only true external links leave the app.

**Data shape** (from `lib/queries/inbox.ts`):
```ts
{ summary: { total, approvals, tasks, mentions, compliance },
  approvals: InboxItem[], tasks: InboxItem[], mentions: InboxItem[], compliance: InboxItem[] }
```
Each `InboxItem`: `{ type, id, title, subtitle?, deeplink?, actions?[], priority?, due_at?, age_days? }`

**Data sources per category:**

| Category | Tables / queries |
|---|---|
| approvals | • `tblprizmbudget_statusapprovers WHERE approver = staffid` joined to budget rows by stage<br>• `tblgatepass` JOIN `tblrequest_notifications WHERE staff_id = staffid` (with inline Approve/Reject)<br>• `tblprz_purchase_request` JOIN `tblprz_pur_request_approvers WHERE staff_id = staffid AND isActive = 1`<br>• `tblprz_expense_request WHERE status = 1` |
| tasks | `tbltasks JOIN tbltask_assigned WHERE staffid = me AND status != 5` ordered by due-date null/asc + priority desc. Bucketed Overdue / Today / Week / Later with inline "Mark complete" |
| mentions | `tblnotifications WHERE touserid = me AND isread = 0`. Perfex admin URLs translated to mobile deeplinks via `_perfex_link_to_mobile_deeplink()` |
| compliance | • `tbltimesheets_requisition_leave WHERE approver_id = me AND status = 0`<br>• `tblcontracts WHERE addedfrom = me AND dateend BETWEEN NOW() AND +30d`<br>• `tblgatepass WHERE created_by = me AND duration_to BETWEEN NOW() AND +30d` |

**Mobile mounting:** `components/ActionCenter.tsx` is rendered as the first child inside the `SafeAreaView` in `(tabs)/_layout.tsx`. It stays visible on Home / Customers / ERP / Settings and any deep-linked screen inside the (tabs) group.

**Open follow-ups for the Action Center:**
- Payslip approvals — blocked by table-name mismatch in `Hr_payroll_api.php` (see Known Gaps section below)
- Training overdue — `tblstaff_training` referenced by `Hr_payroll_api.php` but no `CREATE TABLE` for it; needs reconciliation with `modules/hr_profile`
- Resource requests — would need a join through `tblprizm_resource_request.status` → approver-config table; deferred until the chain is documented

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

## Known gaps & latent bugs (from research audit 2026-05-23)

These were surfaced by a comprehensive grep across `modules/api/controllers/*.php` + `*/install.php` for table schemas. Not blocking the mobile rollout but worth fixing in future batches:

| # | File | Issue | Severity | Fix sketch |
|---|---|---|---|---|
| 1 | `modules/api/controllers/Contracts.php` | No `data_put` method — contracts cannot be updated via API. Mobile edits silently fail (404 on PUT). | High — mobile contract editing is broken | Add `data_put($id)` wrapping `contracts_model::update($data, $id)` |
| 2 | `modules/api/controllers/Hr_payroll_api.php` | All endpoints write to non-existent tables (`tblpayslips`, `tblpayslip_details`, `tblpayroll_*`, `tblstaff_commissions`, `tbltimesheets`, `tblstaff_training`). Actual installed schema uses `tblhrp_*` prefix (see `modules/hr_payroll/install.php`). | High — entire HR/Payroll API surface broken on a real install | Repoint every `db_prefix().'payslips'` → `db_prefix().'hrp_payslips'` etc. Mobile `hr_payslips` module relies on this. |
| 3 | `modules/api/controllers/Items.php` | Read-only — no `data_post`, `data_put`, `data_delete`. Items catalog cannot be created or edited via API. | Medium — mobile shows items as read-only (acceptable) | Add CRUD methods or document as read-only |
| 4 | `modules/api/controllers/Otpmanager.php` | `data_delete` and `data_put` call `projects_model::delete_milestone` / `update_milestone` — copy-paste leftovers from scaffolding. Dead code that may silently corrupt data. | Medium — could affect milestones if anyone hits these routes | Replace with proper OTP delete/update or remove the methods entirely |
| 5 | `modules/api/controllers/Tasks.php` | Workflow methods `mark_complete_put`, `reopen_put`, `timer/start_post`, `timer/stop_post` were added in batch 5 (v2.5.4) and DO exist in upstream — agent reported them missing because local working copy was 148+ commits stale. Inbox_api references them in the inline "Mark complete" action. Verified ✅. | None — false alarm | n/a (the local working copy fooled the audit) |

The same staleness affected the agent's other "missing endpoints" claims for tickets, projects, tenders, opportunities, purchase_orders, etc. Verified against upstream/main on 2026-05-23: those endpoints ARE present and live on Hetzner.

**Table name reality** (from `install.php` files — authoritative for fresh installs):

| Code reference | Actual installed table | Where defined |
|---|---|---|
| `tblbudget_approval_stages` | `tblprizmbudget_approvalstages` | `modules/prizmbudget/install.php` |
| `tblbudget_status_approvers` | `tblprizmbudget_statusapprovers` | same |
| `tblbudget_detail_indvapprovals` | `tblprizm_budget_detail_indvapproval` | same |
| `tblresource_req_indvapprovals` | `tblprizm_resource_req_detail_individual` | same |
| `tblpayslips` | `tblhrp_payslips` | `modules/hr_payroll/install.php` |
| `tblstaff_timesheets` | `tbltimesheets_timesheet` | `modules/timesheets/install.php` |
| `tblstaff_training` | not present — likely belongs to `modules/hr_profile/` with different name | — |
| `tblpur_request_approval` | `tblprz_purchase_request` + `tblprz_pur_request_approvers` + `tblprz_pur_request_approval_history` | `modules/przpurchase/install.php` |

Inbox_api was written against the **actual** table names so it works on the real install.

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
