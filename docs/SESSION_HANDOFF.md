# Session Handoff — Widget Library Expansion

**Date**: 2026-05-27  
**Previous session**: [Prizm Mobile Stabilization + Dashboard](83fa77e2-01f8-4dcc-aa5f-40f8b5e610f8)  
**Status**: All 3 batches (39 widgets) COMPLETED. QA PASSED.

---

## What was completed in this session

### Widget Library Expansion — All 3 Batches (39 new widgets)

#### Batch 1: Action Modules (12 widgets)
- **Tasks** (6): `tasks_open`, `tasks_overdue`, `tasks_status_chart`, `tasks_due_today`, `tasks_stale`, `tasks_completed_30d`
- **Approvals** (3): `approvals_my_pending`, `approvals_recent`, `approvals_by_type`
- **Timesheets/Attendance** (3): `attendance_status`, `timesheet_hours_week`, `timesheet_pending`

#### Batch 2: Self-Service (7 widgets)
- **Leave** (3): `leave_balance`, `leave_pending`, `leave_upcoming`
- **Payslip** (1): `payslip_latest`
- **Expenses** (3): `expenses_total_month`, `expenses_pending`, `expenses_by_category`

#### Batch 3: CRM/Business (20 widgets)
- **Projects** (5): `projects_by_status`, `projects_overdue`, `projects_revenue`, `projects_recent_activity`, `projects_my_active`
- **Invoices** (4): `invoices_overdue`, `invoices_total_month`, `invoices_by_status`, `invoices_aging`
- **Leads** (4): `leads_by_status`, `leads_by_source`, `leads_converted_month`, `leads_value_pipeline`
- **Tickets** (4): `tickets_open_count`, `tickets_by_priority`, `tickets_avg_response`, `tickets_my_assigned`
- **Contracts** (3): `contracts_expiring_soon`, `contracts_by_type`, `contracts_value`

### New API Endpoints Created
1. **`GET /api/my/pending-approvals`** — Aggregates pending items across PR, Leave, Timesheet tables with optional `?detail=1` for item listing
2. **`GET /api/my/expenses-summary`** — Returns current month totals, pending count, and by-category breakdown

### New Mobile Components Created
- `components/widgets/StatWidget.tsx` — Renders stat-type widgets with value, icon, color, footnote
- `components/widgets/ChartWidget.tsx` — Renders chart-type widgets with mini donut + legend
- `components/widgets/ListWidget.tsx` — Renders list-type widgets with up to 5 items + badges
- `components/widgets/ActionWidget.tsx` — Renders action-type widgets with status indicator (e.g., Clock In/Out)
- `components/widgets/index.ts` — Barrel export

### Dashboard index.tsx Upgraded
- `renderCard` now routes by `componentType` (stat → StatWidget, chart → ChartWidget, list → ListWidget, action → ActionWidget)
- All new query hooks wired: `usePendingApprovals`, `useCheckinStatus`, `useExpensesSummary`
- Pull-to-refresh includes all new queries
- Chart data derived from tasks summary, approvals by_type, and expenses by_category

---

## Files Modified

### PHP Backend (`prizm331/modules/api/`)
| File | Changes |
|---|---|
| `install.php` | +39 widget seed rows (lines 248–430) |
| `controllers/My_api.php` | +`pending_approvals_get()` and +`expenses_summary_get()` |
| `config/routes.php` | +2 routes: `/api/my/pending-approvals`, `/api/my/expenses-summary` |
| `api.php` | +39 entries in `$perfex_slug_to_key` map |

### Mobile App (`prizm-mobile/`)
| File | Changes |
|---|---|
| `lib/widget-registry.ts` | +39 widget definitions (all 3 batches) |
| `lib/queries/dashboard.ts` | +3 query hooks: `usePendingApprovals`, `useCheckinStatus`, `useExpensesSummary` |
| `app/(tabs)/index.tsx` | Rewrote `renderCard` for multi-type widgets, added data maps |
| `components/widgets/` | **NEW** — 4 renderer components + barrel |

---

## QA Results

- `php -l` on all 4 PHP files: **PASS** (no syntax errors)
- `npx tsc --noEmit` on mobile app: **PASS** (zero errors)
- Linter on all edited TS files: **PASS** (no issues)

---

## What's needed to activate the widgets

1. **Re-run install.php** — Deactivate + reactivate the API module in Perfex admin to seed the 39 new rows into `tbldashboard_widgets`
2. **Batch 3 data endpoints** — The Batch 3 widgets (Projects, Invoices, Leads, Tickets, Contracts) are registered and will render but need dedicated data-fetching endpoints or query hooks to display real values. Currently they show 0 or placeholder data. Each needs a simple count/aggregate query hook wired similarly to the existing pattern.
3. **Leave & Payslip data** — The `leave_balance`, `leave_pending`, `leave_upcoming`, and `payslip_latest` widgets are registered but show placeholder values. They need query hooks against the existing `/api/my/leave-balance` and `/api/my/payslips` endpoints.
4. **Timesheet hours** — `timesheet_hours_week` and `timesheet_pending` need hooks against the si_timesheet data endpoint.

### Priority for next session
- Wire Batch 3 data hooks (count queries reusing existing `/api/<module>/count` pattern)
- Group widgets by module in the web workbench palette UI
- Test with impersonation to verify scope isolation

---

## Critical lessons (continued)

1. The `sanitise()` function in `dashboard-layout.ts` drops keys not in `ALL_WIDGET_KEYS` — this is correct but means new widget keys only appear in the customize screen after the mobile app is rebuilt with the updated registry.
2. Chart and List widgets take full width (2x1) by default. The DraggableDashboardGrid pairs 1x1 widgets in rows of 2. Mixed sizes work because the grid is flex-row with wrap.
3. The `pending_approvals_get()` aggregator checks `table_exists()` before each query to gracefully handle modules that aren't installed.
4. Expenses summary joins `tblexpenses_categories` for category names — category ID 0 maps to "Uncategorized".
