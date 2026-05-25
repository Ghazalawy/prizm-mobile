# ERP back-fill handoff — Round 2 (prizm331 → mobile)

> **Audience:** the local Claude Code session running on the user's Windows
> machine where `C:/wamp64/www/prizm331` is checked out.
>
> **Why this doc exists:** the mobile session (in the `prizm-mobile` repo)
> runs in a Linux container without access to the ERP backend source. It
> can ship mobile-side changes and run QC against live Hetzner, but it
> cannot extend `modules/api/controllers/*.php`. This file is the
> contract between the two sessions.
>
> **Workflow:** the local session reads this doc, ships endpoints in
> batches, opens PRs to `PrizmIT/prizm331`, deploys to Hetzner via
> `gh workflow run "Deploy On Demand" -R Ghazalawy/prizm331`, then ticks
> the checkbox below and appends the deployed git SHA. The mobile
> session polls this doc on each batch start and only wires mobile
> registry entries against endpoints marked **live**.

## Working directory & deploy

- prizm331 source: `C:/wamp64/www/prizm331`
- Web admin: `https://ms.prizm-energy.com/MS/admin/`
- Production server: `ms.prizm-energy.com` (Hetzner, `/var/www/html/MS`)
- SSH key: `~/.ssh/hetzner_DESKTOP-9GO5QC0` as root
- Deploy: `gh workflow run "Deploy On Demand" -R Ghazalawy/prizm331`
- Upstream branch flow: PR `Ghazalawy/main` → `PrizmIT/main`. Always
  worktree off `upstream/main`; never edit the production checkout
  directly.

## Conventions (from `CLAUDE.md`'s READ-WEB-FIRST RULE)

Every new endpoint MUST:

1. **Read the web controller first** at
   `C:/wamp64/www/prizm331/modules/{module}/controllers/admin/*.php`
   before writing the API. Mirror its permission triple and validation —
   never guess.
2. **Confirm table names** before writing SQL. This codebase has
   historical typos:
   - PR approvals live in `tblprzpurcahse_req_statusdetail` (note
     "purcahse", with a c-a typo). `tblprz_purchase_request_statusdetail`
     exists but is empty and unused.
   - Run `mysql ... -e "SHOW TABLES LIKE 'tbl%{hint}%'"` against the
     installed DB to verify.
3. **Walk the view template's button-visibility conditions** to derive
   the canonical "can this user act now" condition. The static config
   in `*_statuses_approvers` is NOT the truth — the per-record
   `*_statusdetail` rows with `is_current_status + status` are.
4. **Emit a Mobile_audit row** on every state-changing call:
   ```php
   $this->load->library('mobile_audit');
   $this->mobile_audit->action('Module', $id, 'verb');
   ```
   Result: `[Mobile] Module #123 verb` row in `tblactivity_log`.
5. **Honor `X-Impersonate-Staff-Id`** via the shared API auth helper.
   Backend silently drops the header for non-admin callers so it's safe
   to send unconditionally.
6. **JWT via `authtoken` header** — NOT `Authorization: Bearer`. See
   `modules/api/config/jwt.php`.

## Table-name reality (canonical — re-verify before writing SQL)

| Code reference (don't trust) | Actual installed table |
|---|---|
| `tblbudget_approval_stages` | `tblprizmbudget_approvalstages` |
| `tblbudget_status_approvers` | `tblprizmbudget_statusapprovers` |
| `tblbudget_detail_indvapprovals` | `tblprizm_budget_detail_indvapproval` |
| `tblresource_req_indvapprovals` | `tblprizm_resource_req_detail_individual` |
| `tblpayslips` etc. | `tblhrp_payslips`, `tblhrp_payslip_details`, `tblhrp_*` |
| `tblstaff_timesheets` | `tbltimesheets_timesheet` |
| `tblstaff_training` | not present — likely lives in `modules/hr_profile/` with a different name; confirm or create install entry |
| `tblpur_request_approval` (single) | `tblprz_purchase_request` + `tblprz_pur_request_approvers` + `tblprz_pur_request_approval_history` + `tblprzpurcahse_req_statusdetail` (typo!) |

## Open bugs to fix alongside the phases

These were identified during Round 1 + Round 2 audit. Fix as you encounter
them in the relevant phase, not as a separate cleanup.

- [ ] **`Hr_payroll_api.php` table-name reality** — every endpoint
  references non-existent `tblpayslips` etc. Repoint to `tblhrp_*`. Fix
  in Phase 3.
- [ ] **`Contracts.php` missing `data_put`** — mobile contract edits
  silently 404. Add `data_put($id)` wrapping `contracts_model::update`.
- [ ] **`Items.php` read-only** — add `data_post/put/delete` or document
  as read-only. Currently mobile shows items but cannot edit.
- [ ] **`Otpmanager.php` `data_delete`/`data_put`** call
  `projects_model::delete_milestone` / `update_milestone` — copy-paste
  leftovers. Replace or remove.
- [ ] **`Inbox_api::_approvals` over-counts** — apply the per-user
  audit-table filter described in `docs/NEXT_BUILD_TODO.md` §1. Fix in
  Phase 5.
- [ ] **Native PR approve/reject** per `docs/NEXT_BUILD_TODO.md` §2:
  mandatory reject note, optional approve note, signature image. Fix
  in Phase 1.

## Per-phase checklist

Each entry is one endpoint or one logical group. Tick the box and append
`(deployed SHA)` when the endpoint is live on Hetzner.

### Phase 1 — Purchase deepening

PR / PO line items + RFQs + Suppliers + Materials catalog + Deployment
plans + native PR approve/reject.

#### Purchase_api extensions
- [ ] `GET/POST/PUT/DELETE /api/purchase_api/requests/{id}/items`
- [ ] `GET/POST/PUT/DELETE /api/purchase_api/orders/{id}/items`
- [ ] `POST /api/purchase_api/requests/{id}/approve {note?}` — read `tblprzpurcahse_req_statusdetail` (typo!), apply NEXT_BUILD_TODO §2 logic
- [ ] `POST /api/purchase_api/requests/{id}/reject {reason}` — reject reason MUST be non-empty
- [ ] `GET /api/purchase_api/requests/by_number/{seq}` — lookup by `prz_purchase_request.sequence_number` (not `id`)
- [ ] `GET /api/purchase_api/orders/by_number/{seq}`

#### Rfq_api (new controller, mirrors `modules/przpurchase/Rfq_model`)
- [ ] `GET /api/rfq_api` (list)
- [ ] `GET /api/rfq_api/{id}`
- [ ] `POST /api/rfq_api` / `PUT /api/rfq_api/{id}` / `DELETE /api/rfq_api/{id}`
- [ ] `GET/POST /api/rfq_api/{id}/attributes` (add_rfq_attribute)
- [ ] `GET/POST /api/rfq_api/{id}/cc_emails` (add_rfq_cc_email)
- [ ] `GET/POST /api/rfq_api/{id}/suppliers` (add_rfq_supplier)
- [ ] `PUT /api/rfq_api/{id}/suppliers/{supplier_id}/response` (update_rfq_supplier_response)
- [ ] `POST /api/rfq_api/{id}/post` (post_rfq — sends to suppliers)
- [ ] `PUT /api/rfq_api/{id}/status`
- [ ] `GET /api/rfq_api/analytics`

#### Suppliers_api (new controller — distinct from purchase_vendors)
- [ ] `GET/POST/PUT/DELETE /api/suppliers_api` + `/{id}`
- [ ] `GET/POST/PUT/DELETE /api/suppliers_api/{id}/contacts`
- [ ] `GET /api/suppliers_api/{id}/quotations`

#### Materials_catalog_api extensions
- [ ] `GET/POST/PUT/DELETE /api/materials_catalog/categories`
- [ ] `GET/POST/PUT/DELETE /api/materials_catalog/manufacturers`
- [ ] `GET/POST/PUT/DELETE /api/materials_catalog/item_specs`
- [ ] `GET/POST/PUT/DELETE /api/materials_catalog/catalog_item_specs`
- [ ] `GET/POST/PUT/DELETE /api/materials_catalog/kits`
- [ ] `GET/POST/PUT/DELETE /api/materials_catalog/kits/{kit_id}/items`
- [ ] `GET /api/materials_catalog/unspsc/search?q=…`
- [ ] `GET /api/materials_catalog/classification_reviews`
- [ ] `POST /api/materials_catalog/classification/{id}/approve|reject`
- [ ] `POST /api/materials_catalog/bulk_update`

#### Deployment_plans_api (new controller)
- [ ] `GET/POST/PUT/DELETE /api/deployment_plans_api` + `/{id}`
- [ ] `GET/POST/PUT/DELETE /api/deployment_plans_api/{id}/details`
- [ ] `GET/POST /api/deployment_plans_api/{id}/relocations`
- [ ] `GET /api/deployment_plans_api/{id}/po_items`

#### Misc list endpoints
- [ ] `GET /api/purchase_api/site_requests`
- [ ] `GET /api/purchase_api/completion_certificates`
- [ ] `GET /api/purchase_api/received_vouchers`
- [ ] `GET /api/purchase_api/delivery_notes`
- [ ] `GET /api/purchase_api/purchase_quotes`
- [ ] `GET /api/purchase_api/prz_payment_requests`
- [ ] `GET /api/purchase_api/log`
- [ ] `GET /api/purchase_api/analytics`

### Phase 2 — HR Records

`Hr_profile_api` + `Kpi_api` covering the full staff aggregator.

- [ ] `GET/POST/PUT/DELETE /api/hr_profile_api/staff_dependents`
- [ ] `GET/POST/PUT/DELETE /api/hr_profile_api/staff_training`
- [ ] `GET/POST/PUT/DELETE /api/hr_profile_api/staff_terminations`
- [ ] `GET/POST/PUT/DELETE /api/hr_profile_api/hr_contracts`
- [ ] `POST /api/hr_profile_api/hr_contracts/{id}/sign`
- [ ] `GET/POST/PUT/DELETE /api/hr_profile_api/contract_types`
- [ ] `GET/POST/PUT/DELETE /api/hr_profile_api/departments`
- [ ] `GET/POST/PUT/DELETE /api/hr_profile_api/job_positions` (prizm distinct from recruitment)
- [ ] `GET /api/hr_profile_api/staff/{id}/profile` — aggregator
- [ ] `GET /api/hr_profile_api/staff/{id}/workload`
- [ ] `GET /api/hr_profile_api/staff/{id}/kpi_dashboard`
- [ ] `GET /api/hr_profile_api/staff/{id}/salary_history`
- [ ] `GET /api/hr_profile_api/staff/{id}/assets`
- [ ] `GET /api/hr_profile_api/staff/{id}/commissions`
- [ ] `GET /api/hr_profile_api/staff/{id}/contracts`
- [ ] `GET /api/hr_profile_api/candidate_pipeline`
- [ ] `GET/POST/PUT/DELETE /api/hr_profile_api/recruitment_proposals`
- [ ] `GET /api/hr_profile_api/recruitment_analytics`
- [ ] `GET/POST/PUT/DELETE /api/kpi_api/definitions`
- [ ] `GET /api/kpi_api/snapshots`
- [ ] `GET/POST/PUT/DELETE /api/hr_profile_api/hr_kb_groups`
- [ ] `GET/POST/PUT/DELETE /api/hr_profile_api/hr_knowledge_articles`

### Phase 3 — HR Payroll + Timesheets/Leave admin

- [ ] **FIX `Hr_payroll_api.php` table names** — every endpoint to `tblhrp_*`
- [ ] `GET/POST/PUT/DELETE /api/hr_payroll_api/earning_types`
- [ ] `GET/POST/PUT/DELETE /api/hr_payroll_api/deduction_types`
- [ ] `GET/POST/PUT/DELETE /api/hr_payroll_api/payroll_templates`
- [ ] `GET /api/hr_payroll_api/payroll_summary`
- [ ] `GET/POST/PUT/DELETE /api/hr_payroll_api/payslip_details` (admin lines)
- [ ] `GET/POST/PUT/DELETE /api/hr_payroll_api/commissions`
- [ ] `GET /api/timesheets_api/summary`
- [ ] `GET /api/timesheets_api/staff_timesheets_payroll`
- [ ] `GET /api/timesheets_api/project_time_tracking`
- [ ] `GET /api/timesheets_api/staff_workload_summary`
- [ ] `GET/POST/PUT/DELETE /api/timesheets_api/workplaces`
- [ ] `GET/POST/PUT/DELETE /api/timesheets_api/leave_types`
- [ ] `POST /api/my/leave/approve/{id}` (subordinate approve)
- [ ] `POST /api/my/leave/reject/{id}`
- [ ] `POST /api/my/expenses/{id}/receipt` (multipart photo upload)

### Phase 4 — Support / Opp / Tenders / Tasks polish

- [ ] `POST /api/tickets/{id}/close` and `/reopen`
- [ ] `GET /api/tickets/search?q=…`
- [ ] `GET/POST/PUT/DELETE /api/knowledge_api/groups`
- [ ] `GET /api/knowledge_api/search?q=…`
- [ ] `GET /api/surveys_api/{id}/results`
- [ ] `GET /api/surveys_api/{id}/send_log`
- [ ] `POST /api/opportunities_api/{id}/members` (add) / `DELETE /api/opportunities_api/{id}/members/{staff_id}`
- [ ] `POST /api/opportunities_api/{id}/stage_staff` (assign_opportunity_stage_staff)
- [ ] `GET /api/opportunities_api/by_number/{number}`
- [ ] `GET /api/opportunities_api/analytics`
- [ ] `GET/POST/PUT/DELETE /api/tenders_api/{id}/documents`
- [ ] `GET /api/tenders_api/analytics`
- [ ] `GET/POST/PUT/DELETE /api/task_templates_api`
- [ ] `GET/POST/PUT/DELETE /api/task_templates_api/groups`
- [ ] `GET/POST/PUT/DELETE /api/task_templates_api/{group_id}/milestones`
- [ ] `POST /api/tasks/bulk_assign_with_primary`
- [ ] `PUT /api/tasks/{id}/primary_assignee/{staff_id}`
- [ ] `GET /api/tasks/overdue`
- [ ] `GET /api/tasks/analytics`
- [ ] `GET /api/tasks/primary_assignments_report`

### Phase 5 — Generalized approvals

- [ ] **Apply the per-user filter to `Inbox_api::_approvals`** per
  `NEXT_BUILD_TODO.md` §1 — only surface transactions where there's no
  matching audit row `(staffid = me AND statusID = current_status AND
  is_current_status = 1)`.
- [ ] `POST /api/purchase_api/orders/{id}/approve {note?}` and `/reject {reason}`
- [ ] `POST /api/budget_api/items/{id}/approve {note?}` and `/reject {reason}`
- [ ] `POST /api/budget_api/expense_requests/{id}/approve|reject`
- [ ] `POST /api/gatepass_api/{id}/approve|reject`
- [ ] `POST /api/hr_payroll_api/payslips/{id}/approve|reject`
- [ ] `POST /api/my/leave/{id}/approve|reject` (alias of Phase 3 endpoint, exposed in manager namespace too)

Each approve/reject endpoint must:
1. Verify caller is in the per-record approver set for the current stage.
2. Record action in the `*_statusdetail` table (`status='Approved'|'Rejected'`).
3. Advance the parent row's `status` to next stage / terminal.
4. Update `is_current_status` flip on the previous detail row.
5. Re-fan-out notifications matching the web controller.
6. Mobile_audit row.

### Phase 6 — Reports + Settings

- [ ] **Audit which `mcp__da28e037-*` analytics tools have backing HTTP
  endpoints** under `modules/api/controllers/`. MCP-only ones need an
  HTTP twin added.
- [ ] `Reports_api` consolidator returning `{ series, categories,
  summary }` shape for each dashboard.

Endpoints to verify / add HTTP twins for:

- Financial: `accounts_receivable_aging`, `accounts_payable_aging`,
  `profit_loss_statement`, `balance_sheet_summary`, `cash_flow_statement`,
  `tax_summary_report`, `financial_kpi_dashboard`.
- CRM analytics: `customer_analytics`, `revenue_analysis`,
  `opportunity_analytics`, `get_rfq_analytics`, `tender_analytics`.
- Operations: `task_analytics`, `ticket_analytics`, `project_analytics`,
  `contract_analytics`, `expiring_contracts_report`,
  `get_materials_analytics`, `get_asset_analytics`, `get_budget_analytics`,
  `get_cost_center_analytics`.
- HR: `get_recruitment_analytics`, `get_payroll_summary`,
  `get_staff_kpi_dashboard`, `staff_workload_summary`, `timesheet_summary`.
- Subscriptions/payments: `subscription_analytics`, `payment_analytics`,
  `payment_reconciliation`, `credit_notes_analytics`, `estimate_analytics`,
  `expense_analytics`, `expense_analysis`,
  `get_technical_inquiry_analytics`.
- System: `get_corporate_metrics`, `get_corporate_metrics_trend`,
  `knowledge_analytics`, `get_system_usage_report`, `file_statistics`,
  `get_linkedin_analytics_summary`, `get_lead_statistics`,
  `get_activity_log`, `get_partner_activity_log`, `get_kpi_snapshots`,
  `get_goals_summary`.

#### Perfex Settings CRUD endpoints

For each of these tables, add list/get/create/update/delete via
`modules/api/controllers/` — they're nearly all simple ref-data with no
workflow. Group under one or two controller files.

- `custom_statuses`, `payment_modes`, `lead_sources`, `lead_statuses`,
  `expense_categories`, `customer_groups`, `vendor_categories`,
  `partner_groups`, `departments`, `services`, `uom_units`, `workplaces`
  (also Phase 3), `manufacturers` (also Phase 1), `material_categories`
  (also Phase 1), `contract_types` (also Phase 2), `keywords`,
  `keyword_groups`, `mail_lists`, `task_templates` (also Phase 4),
  `kpi_definitions` (also Phase 2), `deduction_types`/`earning_types`
  (also Phase 3), `asset_categories`, `asset_locations`, `hr_kb_groups`
  (also Phase 2), `dewa_contacts`.

## Endpoint sign-off checkpoint

When a batch's PR merges to `PrizmIT/prizm331:main` and Hetzner deploys,
edit this file: tick each checkbox above and append the deploy SHA. The
mobile session reads this on next pull and only ships matching mobile
registry entries against ticked rows.

For each batch also verify by `curl`:

```bash
curl -s \
  -H "authtoken: $JWT" \
  -H "X-Impersonate-Staff-Id: $STAFF_ID" \
  "https://ms.prizm-energy.com/MS/api/<new-endpoint>" | jq .
```

Expected shape: paginated list `{ status, data, total, limit, offset }`
or single object `{ status, data: {…} }`. Anything else → fix before
ticking the box.

## Communication back to the mobile session

After a batch ships, optionally append a short note to
`docs/MODULE_AUDIT.md`'s changelog summarizing what's now live. The
mobile session will pick up the new endpoint list on its next pull and
plan the mobile-side wiring accordingly.

## Confirmed broken endpoints (mobile-session probe, 2026-05-25)

The mobile session probed several endpoints directly via the production
MCP gateway (`mcp__da28e037-…` against `ms.prizm-energy.com/MS/api/…`).
The following are **confirmed broken** and should be fixed before
mobile can ship Phase 1:

| MCP tool | URL hit | HTTP | Body snippet | Fix |
|---|---|---|---|---|
| `get_rfqs` | `GET /api/rfq` | **404** | Default REST 404 page | `Rfq_api` controller (or `purchase_api/rfqs` route) is not deployed. Either add it under `modules/api/controllers/Purchase_api.php` (`rfqs_get`, `rfqs_post`, `rfqs_put`, `rfqs_delete`) or as a standalone `Rfq_api.php`. Mirror the `Rfq_model` web controller for permission triple. |
| `get_purchase_analytics` | `GET /api/purchase_api/analytics` | **500** | `Table 'prizmene_MS.tblprz_purchase_requests' doesn't exist` (`mysqli_sql_exception` at `mysqli_driver.php:307`) | The SQL references `tblprz_purchase_requests` (plural) but the install table is `tblprz_purchase_request` (singular — see `CLAUDE.md`'s Table name reality + `MODULE_AUDIT.md`'s Known Gaps table). Repoint the query to the singular name, or rename via migration. |

**Action for the local prizm331 session:**

1. Pull these two endpoint fixes into the **earliest** Phase 1 sub-batch
   — the mobile registry can be filled in immediately after they deploy.
2. After fixing, verify with the curl snippet in §"Endpoint sign-off
   checkpoint" above (substitute the actual JWT + endpoint), then tick
   the corresponding row in the Phase 1 checklist and append the
   deploy SHA.
3. While you're in `Purchase_api.php`, please also `curl`-probe the
   following sibling endpoints from a JWT-authenticated client and
   write back which return 200 vs 404 vs 500. The mobile session
   couldn't probe them — the MCP gateway rate-limited after parallel
   calls. List of endpoints needing a status check:
   - `purchase_api/site_requests`
   - `purchase_api/completion_certificates`
   - `purchase_api/received_vouchers`
   - `purchase_api/delivery_notes`
   - `purchase_api/quotes` (or `purchase_quotes`)
   - `purchase_api/payment_requests` (or `prz_payment_requests`)
   - `purchase_api/log` (or `purchase_log`)
   - `purchase_api/stages` (or `purchase_stages`)
   - `purchase_api/statuses` (or `purchase_statuses`)
   - `purchase_api/supplier_contacts`
   - `purchase_api/supplier_quotations` (works via MCP — verify URL)
   - `purchase_api/vendor_categories` (works via MCP — verify URL)
   - `materials_catalog/categories`
   - `materials_catalog/manufacturers`
   - `materials_catalog/item_specs`
   - `materials_catalog/catalog_item_specs`
   - `materials_catalog/kits`
   - `materials_catalog/kit_items`
   - `deployment_plans_api` (or wherever the controller actually lives)

   Append a "Probe results" subsection beneath this one with the
   findings. Once each row is ticked live + URL confirmed, the mobile
   session will ship the matching registry entry in batch 13b.

## See also

- `docs/MODULE_AUDIT.md` — full Round 1 + Round 2 audit, mobile-side
  status.
- `docs/NEXT_BUILD_TODO.md` — the two parity bugs (approval count, PR
  "my turn") that Phase 1 + Phase 5 must close.
- `CLAUDE.md` (project root) — the READ-WEB-FIRST RULE.
- Approved plan: the `/root/.claude/plans/conduct-comprehensive-audit-on-smooth-honey.md`
  file from the planning session (held by the mobile session; not in
  the prizm331 repo).
