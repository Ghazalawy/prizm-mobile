# Prizm Mobile — Module Audit & Anatomy

> Canonical source of truth for what's built, what's partial, and what's
> intentionally deferred across every CRM module that the mobile app touches.
> Update this file at the end of every batch — it replaces the need to
> re-audit modules manually.

**Last updated:** 2026-05-25 (Round 2 — operations modules audit, batch 13a — vendor/supplier enrichment)
**Recent:** Round 2 audit kicked off (10 modules: Tasks, Opportunities, Purchase, Tenders, HR Records, HR Payroll, Timesheets & Leave, Support, Perfex Settings, Prizm Reports). Batch 13a enriched `purchase_vendors` with the rich `tblsuppliers` column set (TRN, supplier_category, mobile, is_verified, supply_domain, modern address columns). See "Round 2 — Operations modules audit" below for the full gap analysis + back-fill plan.
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
- **2026-05-25 — Round 2 audit added** (post-batch-12): re-audited 10 module groups (Tasks, Opportunities, Purchase, Tenders, HR Records, HR Payroll, Timesheets & Leave, Support, Perfex Settings, Prizm Reports) against the broader ERP surface (including `mcp__da28e037-…` analytics endpoints and admin-config tables). Identified ~80 gaps. Six-phase back-fill plan published below. Handoff to local prizm331 session: see `docs/ERP_BACKFILL_HANDOFF.md`.

---

# Round 2 — 10-module audit (2026-05-25)

This section is the second-round audit. It supplements (does not replace)
the executive summary table above. Round 1 covered the 49 modules already
in `lib/module-registry.ts`; Round 2 looks at the wider ERP surface and
maps gaps for back-fill.

## Round 2 — Per-module audit

Legend:
- ✅ wired end-to-end · 🟡 partial · 🔴 broken/stub · ❌ absent

### Tasks
- ERP: `modules/tasks` + `Tasks_api` + templates + bulk-assign + analytics + overdue + primary-assignments report.
- Mobile ✅ core (CRUD + tabs + custom fields + timer + mark/reopen).
- Gaps ❌: task_templates, task_template_groups, task_template_milestones, bulk_assign_tasks_with_primary, set_task_primary_assignee, task_analytics, get_overdue_tasks admin view, get_primary_assignments_report.

### Opportunities
- ERP: `modules/przoppurtunities` + `Opportunities_api` + BOQ + notes + members + stage staff + analytics + get-by-number.
- Mobile ✅ core (CRUD + BOQ + notes + submit/stage/status).
- Gaps ❌: add_opportunity_member / remove_opportunity_member, assign_opportunity_stage_staff, get_opportunity_by_number, opportunity_analytics.

### Purchase (broadest gap)
- ERP: `modules/przpurchase` + `Purchase_api` + RFQs (`Rfq_model`) + Materials catalog + Deployment plans + Site requests + Completion certificates + Received vouchers + Delivery notes + Purchase quotes + `prz_payment_requests` + analytics.
- Mobile 🟡: purchase_requests + purchase_orders + purchase_vendors + materials (minimal).
- Gaps:
  - 🔴 PR approval flow — read-only screen at `app/(tabs)/approvals/purchase_request/[id].tsx`; native approve/reject still web-only (`NEXT_BUILD_TODO.md` §2).
  - ❌ rfqs CRUD + add_rfq_attribute / add_rfq_cc_email / add_rfq_supplier / update_rfq_supplier_response / post_rfq / update_rfq_status / delete_rfq.
  - ❌ suppliers + supplier_contacts + supplier_quotations (only `purchase_vendors` exists).
  - 🟡 materials catalog — only `materials` minimal registry; missing material_categories, manufacturers, item_specs, catalog_item_specs, kits, kit_items, UNSPSC search, AI classify, classification reviews, bulk update.
  - ❌ purchase_analytics, purchase_log, purchase_stages, purchase_statuses.
  - ❌ deployment_plans + deployment_plan_details + deployment_relocations + deployment_po_items.
  - ❌ site_requests, completion_certificates, received_vouchers, delivery_notes, purchase_quotes, prz_payment_requests.
  - ❌ PR/PO line-item CRUD (currently header-only).

### Tenders
- ERP: `modules/prz_tenders` + `Tenders_api` + BOQ + requirements + risks + documents + analytics.
- Mobile ✅ core (CRUD + sub-tabs + won/lost/status).
- Gaps ❌: tender_documents (only generic files tab), tender_analytics.

### HR Records
- ERP: `modules/hr_profile` + `modules/recruitment` + KPI + training + terminations + dependents + contracts.
- Mobile 🟡: staff (basic) + recruitment_candidates + recruitment_positions + goals.
- Gaps ❌: staff_dependents, staff_training, staff_terminations, hr_contracts (+ sign), contract_types, departments, prizm_job_positions, recruitment_proposals, candidate_pipeline kanban, recruitment_analytics, get_employee_profile, get_staff_kpi_dashboard, get_staff_workload, get_staff_salary_history, get_staff_assets, get_staff_commissions, get_staff_contracts, kpi_definitions, kpi_snapshots, hr_kb_groups, hr_knowledge_base articles.

### HR Payroll
- ERP: `modules/hr_payroll` + payslip_details + earning_types + deduction_types + payroll_templates + payroll_summary + commissions.
- Mobile 🟡: hr_payslips (admin) + self-service payslips screen.
- Gaps ❌: payslip_details CRUD (admin), earning_types CRUD, deduction_types CRUD, payroll_templates CRUD, payroll_summary report, commissions CRUD; 🟡 payslip PDF download from self-service.
- 🔴 **`Hr_payroll_api.php` references non-existent tables — must be fixed before any admin payroll mobile work** (see Known Gaps table above).

### Timesheets & Leave
- ERP: timesheets + checkin + leave (`hr_leave`) + workplaces + leave-type config.
- Mobile 🟡: self-service My-Leave + My-Checkin + admin timesheets registry.
- Gaps ❌: approve_subordinates_leave (`POST /api/my/leave/approve/{id}`), timesheet_summary, staff_timesheets_payroll, project_time_tracking, staff_workload_summary, workplaces CRUD, leave_types config.

### Support
- ERP: `modules/tickets` + `modules/knowledge_base` + `modules/surveys`.
- Mobile ✅ core (tickets reply/status/assign/priority + knowledge publish + surveys publish).
- Gaps ❌: close_ticket / reopen_ticket actions, knowledge_groups CRUD, search_knowledge_base UI, survey_results detail, survey_send_log, ticket_analytics, knowledge_analytics.

### Perfex Settings (🔴 nearly absent)
- ERP: ~25 config tables under `application/controllers/admin/Settings.php` + sub-controllers.
- Mobile: only automation (CRUD) + otpmanager (list).
- Gaps ❌: custom_statuses, payment_modes, lead_sources, lead_statuses, expense_categories, customer_groups, vendor_categories, partner_groups, departments, services, uom_units, workplaces, manufacturers, material_categories, contract_types, keywords, keyword_groups, mail_lists, task_templates, kpi_definitions, deduction_types, earning_types, asset_categories, asset_locations, hr_kb_groups, dewa_contacts.

### Prizm Reports (❌ essentially absent)
- ERP: financial (AR/AP aging, P&L, balance sheet, cash flow, trial balance, tax) + CRM analytics + operations analytics + HR analytics + payment/subscription analytics + corporate metrics + system usage.
- Mobile ✅: dashboard count tiles + ActionCenter + activity feed.
- Gaps ❌: all 30+ analytics dashboards — see ERP_BACKFILL_HANDOFF.md §Phase 6.

## Round 2 — Six-phase back-fill plan (summary)

Full plan with ERP-side endpoint specs in `docs/ERP_BACKFILL_HANDOFF.md`.

| Phase | Theme | ERP work scope | Mobile work scope |
|---|---|---|---|
| 1 | Purchase deepening | RFQs / Suppliers / Materials catalog / Deployment plans / PR line items / PR native approve+reject (NEXT_BUILD_TODO §2) / PR-PO get-by-number / purchase_analytics | rfqs + sub-modules; suppliers; material_categories/manufacturers/item_specs/kits; deployment_plans; PR/PO `items` tabs; rewrite `app/(tabs)/approvals/purchase_request/[id].tsx` to native approve/reject |
| 2 | HR Records | `Hr_profile_api` (dependents/training/terminations/contracts/contract_types/departments/job_positions/employee_profile/workload/salary/kpi); `Kpi_api` | staff_* registry entries; `app/staff/[id]/profile.tsx`; `app/staff/[id]/kpi.tsx`; `app/recruitment/pipeline.tsx` kanban |
| 3 | HR Payroll + Timesheets/Leave admin | **Fix Hr_payroll_api table names**; earning_types/deduction_types/payroll_templates/commissions/payslip_details; Timesheets_api summary/workload/workplaces/leave_types; `/api/my/leave/approve` | payroll registry entries; `app/payroll/summary.tsx`; `app/leave/approve/[id].tsx`; payslip PDF download; receipt photo capture |
| 4 | Support / Opp / Tenders / Tasks polish | tickets close/reopen/search; knowledge_groups + KB search; opportunity members/stages/by-number/analytics; tender_documents/analytics; task_templates + bulk_assign_with_primary + set_primary | new ticket actions; `knowledge_groups`; `tender_documents`; task_templates registry; `app/support/knowledge-search.tsx` |
| 5 | Generalized approvals | Inbox per-user filter (NEXT_BUILD_TODO §1); approve/reject for PO/budget/expense/gatepass/payslip mirroring PR | `components/approvals/ApprovalScreen.tsx` generic; `app/(tabs)/approvals/[type]/[id].tsx`; ActionCenter deeplinks → typed route |
| 6 | Reports + Settings | `Reports_api` consolidator for every `*_analytics` endpoint; verify all MCP-only analytics have HTTP twins | `lib/report-registry.ts`; `app/reports/*`; victory-native + react-native-svg; ~25 Perfex Settings registry entries |

## Round 2 — Mobile native build & release conventions

- CI: `.github/workflows/*.yml` builds APK on push to `main`. Bake `BUILD_SHA` + top `CHANGELOG.json` entry into `lib/build-info.ts`.
- Per batch: bump `package.json#version`, prepend `CHANGELOG.json`, keep `BUILD_FLAGS` in `lib/build-info.ts` to gate not-yet-live modules.
- Charts (Phase 6): adds `victory-native` + `react-native-svg`. Both bare-Expo compatible via `expo-build-properties` config-plugin.

## Round 2 — QC plan (Chrome MCP — web ↔ mobile parity)

For each batch, against `https://ms.prizm-energy.com/MS/admin/authentication`:

1. **Universal checks**
   - Top-bar counter parity: Approvals / Tasks / Mentions / Compliance chip counts must equal web admin counts for the SAME user.
   - Module list counts: web list total vs mobile list total, after each filter.
   - Detail field parity: 3 random records per new module, every web "View"-page field appears on mobile.
   - Workflow actions: trigger on mobile → confirm same state transition in web; `[Mobile]` row in `tblactivity_log`.
   - View-As: counts/permissions reflect the impersonated user, not the admin.
2. **User-flagged headline checks** (run first; these are the acceptance test for the whole round):
   - **Approval count delta** — web "My Approvals" count must equal mobile ActionCenter Approvals badge for ≥10 test users (closes `NEXT_BUILD_TODO.md` §1).
   - **PR "my turn" routing** — for a PR where user IS the active approver, mobile shows enabled Approve/Reject; user who already acted at current stage sees disabled state; user out-of-turn sees "not your turn" with same wording as web.
3. **Per-batch QC docs** live at `docs/qc/round2-batch-{N}.md` with PASS / FAIL / N/A + screenshot pairs + Defects-to-fix-before-merge.
4. **Credentials** are NEVER committed. Use a gitignored `.env.qc` or shell-env injection.

See full QC matrix in the approved plan at
`/root/.claude/plans/conduct-comprehensive-audit-on-smooth-honey.md` §D.

## Round 2 — Handoff to local prizm331 session

The mobile session (this repo) cannot read `C:/wamp64/www/prizm331`. All
ERP-side endpoint work lives in `docs/ERP_BACKFILL_HANDOFF.md` as a
checklist the local Windows session ticks off. Sync via git — both
sessions push commits, this doc is the contract.

## Round 2 — Batch 13a shipped (2026-05-25)

Mobile-only batch. Confines itself to endpoints I could probe live as
working today. Nothing speculative.

**Probed live endpoints (Phase 1 sampling, 2026-05-25):**

| MCP tool | HTTP path | Status |
|---|---|---|
| `get_suppliers` | `purchase_api/vendors` (existing) | ✅ live, returns rich `tblsuppliers` shape |
| `get_vendor_categories` | (unknown) | ✅ live, labels-only (no id — config table) |
| `get_supplier_quotations` | (unknown) | ✅ live (returned 3.5MB sample, endpoint works) |
| `get_rfqs` | `/api/rfq` | 🔴 **404** — endpoint not deployed |
| `get_purchase_analytics` | `/api/purchase_api/analytics` | 🔴 **500** — references missing table `tblprz_purchase_requests` |
| `get_deployment_plans`, `get_manufacturers`, `get_material_categories`, `get_supplier_contacts`, `get_completion_certificates`, `get_delivery_notes`, `get_purchase_quotes`, `get_prz_payment_requests`, `get_site_requests`, `get_kits`, `get_purchase_stages`, `get_purchase_log`, `get_received_vouchers` | (unknown) | ⚠️ Unprobed — MCP server rate-limited after parallel calls; the local prizm331 session should `curl` these from a JWT-authenticated client and tick `ERP_BACKFILL_HANDOFF.md` for each that returns 200. |

**Shipped (mobile-side):**

- `lib/module-registry.ts` — `purchase_vendors` enriched with the rich
  `tblsuppliers` columns I confirmed from the live API:
  - New fields: `supplier_code`, `supplier_category`, `supplier_speciality`,
    `status` (Active/Inactive select), `is_verified` (boolean),
    `mobile`, `supply_domain`, `trn` (Tax Registration No.), `vat`,
    `currency_id` (FK to currency reference data),
    `preferred_payment_method`, `preferred_delivery_method`, `terms`,
    `note`, `keywords`, `created_at` (read-only datetime).
  - New address fields (the modern columns `city_town` /
    `state_province` / `postal_code` that the API actually writes to —
    the legacy `city/state/zip` are kept for old records).
  - Updated `subtitleFields`: `["supplier_category", "country", "email", "phone"]`
    so the list view shows the most useful info.
  - Updated `searchFields`: `["company", "email", "phone", "trn",
    "supplier_code", "supply_domain"]`.
  - Plural label changed to "Vendors / Suppliers" to reflect the alias
    (per the live `get_suppliers` MCP description: "this is an alias —
    suppliers and vendors are the same entity").

**Deferred until local prizm331 session ships ERP-side fixes:**

- RFQ mobile work — depends on `Rfq_api` controller being shipped to
  prizm331 + deployed. See `ERP_BACKFILL_HANDOFF.md` §Phase 1.
- Purchase analytics dashboard — depends on
  `Purchase_api::analytics_get` being fixed (the SQL references a
  non-existent table; correct one is `tblprz_purchase_request`
  singular, per `CLAUDE.md`'s table-name reality).
- All other Phase 1 modules (deployment plans, material categories,
  manufacturers, etc.) — endpoint paths not verified yet. Mobile
  registry entries WILL be added in batch 13b once the local prizm331
  session ticks them live in the handoff doc.
