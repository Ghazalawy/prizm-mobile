# Logged for next build

Items the user explicitly flagged "don't rebuild now, write down for next."

## 1. Per-user approval filter — show only what's _actually pending me_

**Symptom.** Top-bar Approvals chip shows 15 on mobile; ERP web shows 5 for the
same user. The mobile is over-counting because `Inbox_api::_approvals` returns
**every** transaction whose `status` matches a stage where the caller is
listed as an approver — including transactions where the caller has already
acted, or where _another_ approver at the same stage already approved.

**Fix.** Add a second filter: only surface transactions where there's NO
matching row in the per-transaction `*_statusdetail` audit table for
`(staffid = me AND statusID = current_status AND is_current_status = 1)`.

Audit tables to query per type:
- PR  → `tblprz_purchase_request_statusdetail`
- PO  → `tblprz_po_statusdetail` (verify name)
- Pay → `tblprz_payment_statusdetail`
- Exp → `tblprz_expense_req_statusdetail`

Pattern (SQL pseudo-code):
```sql
LEFT JOIN tblprz_purchase_request_statusdetail sd
  ON sd.purchase_request_id = pr.id
 AND sd.statusID = pr.status
 AND sd.approver = :me
WHERE sd.id IS NULL  -- I haven't acted at the current stage
```

Verify against ERP web's exact count — that's the source of truth.

## 2. Native approve / reject (with mandatory rejection note + signature)

Right now the native PR screen is **read-only** — `<ApprovalActionPanel>`
shows an "Approve in web" fallback because the multi-stage advancement
logic is too tangled to safely reimplement in one batch.

User spec for the real implementation:
- Text field on the Approve flow → **optional** (free-form note).
- Text field on the Reject flow → **mandatory** (rejection reason).
- Show the approver's **signature image** on approval (pulled from
  staff record — there's a `staff_signature` column on
  `tblhr_staff_contract` and possibly elsewhere; check).

Backend endpoints to add (Purchase_api → mirror in Budget_api / etc.):
- `POST /api/purchase_api/requests/{id}/approve { note? }`
- `POST /api/purchase_api/requests/{id}/reject { reason }` ← must be non-empty

Server-side logic must:
1. Verify caller is `approver = me, isActive = 1, action = 'approve'` for the
   PR's current `status`.
2. Record the action in `tblprz_purchase_request_statusdetail`
   (`status = 'Approved' | 'Rejected'`, `addeddate = NOW()`).
3. Advance `tblprz_purchase_request.status` to the next stage in the workflow
   (or terminal-reject status).
4. Update `is_current_status = 0` on the previous statusdetail, set 1 on the
   new one.
5. Re-fan-out notifications (web side has the logic in `Przpurchase` controller).

After PR works end-to-end, extract `<ApprovalScreen>` into a shared component
keyed by entity type — PO / Budget / Leave / Expense become thin wrappers.

## 3. PDF / PNG share for transactions

The PR screen now has a `<Share />` button that exports text + URL. Real
PDF + PNG visual export needs:
- `expo-print` (HTML → PDF, managed Expo module, works with EAS Build)
- `expo-sharing` (cross-platform share intent)
- `react-native-view-shot` (View → PNG — adds native code, needs config-plugin)

Defer until we have a quiet CI day — these don't ship cleanly in a hotfix
batch.

## 4. Dashboard "Tasks" count discrepancy

Web shows "1" pending; mobile My Tasks tile shows 55 total open. Web is
probably showing only `status = 1` (not_started) tasks assigned to the
current user. We surface `total_open` (everything not status=5). Once we
know the web's exact filter, mirror it in `/api/my/tasks-summary` and on
the mobile tile (or both). Until then, the breakdown sub-line gives the
real signal anyway.
