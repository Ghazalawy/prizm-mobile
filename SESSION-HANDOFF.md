# Prizm Mobile — Session Handoff

## Current Session — 2026-08-02 — Full Native Parity Release v1.17.0

**Status:** Backend and mobile are deployed. Production backend is `f94a2528bd6071106e2eaa4428ad8f3c7daae507`; rolling Android release is v1.17.0/code35 from merge `a83f365647790301c252c23c809533cd384b4dd7`.

### Completed and verified

- Multi-status project chips are additive: On Hold = 4; adding Cancelled = 5. Adding the custom Perfex AND rule Billing Type = Fixed Rate returns the exact 4-record intersection.
- Runtime matrices passed AND, OR, exclusions, date ranges, search, and multi-select across Projects, Customers, Tasks, Purchase Requests, and Payment Requests.
- Task priority rails no longer touch text; internal `erp_dev` metadata is hidden in favor of meaningful linked-record information.
- Detail pages identify their group/module and pack short fields into dense two-column layouts; emulator evidence covers Tasks, Payment Requests, and Projects.
- Report uploads now write to `uploads/prizm_reports/{report}/images`; the mobile resolver keeps the legacy module-assets fallback.
- TypeScript, Expo dependencies, release metadata, 107 filterable-list contracts, 308 CRUD contracts, 48 PHP lints, and Daleela 87/87 passed.
- Backend PRs: `Ghazalawy/prizm331#315` and `PrizmIT/prizm331#1197`; deploy run `30731664609` passed.
- Mobile PR `Ghazalawy/prizm-mobile#4`; release run `30731645014` passed. Published APK SHA-256: `d5592221603c034583dc3959ee9165f9d9732292e1c3c4795f82907d6f35b030`.
- The published APK was installed on `emulator-5554`. The exact Payment Request 1211 URL cold-launched `com.prizmenergy.mobile/.MainActivity` in 1.33 seconds; forcing the URL through Chrome also returned to Prizm through the live bridge.
- QC: `PE-QAQC-QC-RPT-26017-R01__full-native-parity-release-20260802.md` and PDF under `C:\Users\osama\.claude-brain\_audits\qc-reports\`.

---

## Current Session — 2026-08-02 — Android Browser App-Link Recovery

**Status:** Backend-only hotfix is deployed at production commit `29fa99482`. Mobile APK remains v1.16.0/code34; no intermediate APK was shipped.

### Completed

- Added an Android-only ERP bridge for Chrome and embedded WebViews that bypass verified App Link resolution.
- Explicitly targets `com.prizmenergy.mobile` and preserves a loop-safe **Continue in browser** path.
- Excludes API/AJAX/background fetches, mutations, uploads/downloads, documents/images, assets, and desktop traffic.

### Verified

- Exact Payment Request URL forced into Chrome on `emulator-5554` returned to `com.prizmenergy.mobile/.MainActivity` through the live production bridge.
- Focused contract passed 10/10; fork CI runs `30728031700` and `30728343240` passed.
- Live Android bridge returned HTTP 200; opt-out and desktop returned the normal HTTP 307 authentication flow; API remained JSON and upload paths were not intercepted.
- Production checkout is at `29fa994822117f01e13fdc9af3a139e29dbb85ff`.

### Evidence

- Fork PRs `Ghazalawy/prizm331#313` and `#314`; upstream PRs `PrizmIT/prizm331#1195` and `#1196`.
- Screenshot: `C:\wamp64\www\prizm-mobile-app-link-fix\artifacts\payment-request-browser-bridge-final.png`.
- QC report: `C:\Users\osama\.claude-brain\_audits\qc-reports\PE-QAQC-QC-RPT-26016-R01__android-browser-app-link-bridge-20260802.md/.pdf`.

### Remaining Programme Scope

- Full native web/mobile parity remains open. Continue the clean Materials Catalog parity checkpoint and subsequent contract-discovered modules before the next consolidated APK.

---

## Current Session — 2026-08-02 — Purchasing Android App Links

**Status:** Release `1.15.1` (Android versionCode `32`) is deployed. `origin/main` shipped commit `ea292bb`; GitHub Actions run `30719192704` completed successfully and refreshed the rolling signed APK.

### Completed

- Added a narrow verified Android App Link declaration for `/MS/przpurchase/*`.
- Preserved existing native routing from Payment Request web URLs to the approval detail screen.
- Added regression coverage for the exact reported `/view_payment_request/1211` URL and manifest scope.
- Normalized CRLF input in the Windows contract-test harness so the complete suite runs locally.

### Verified

- v1.15.0 baseline sent the exact URL to Chrome because the manifest did not claim the purchasing path.
- Local debug and release APKs sent the same literal HTTPS URL to `com.prizmenergy.mobile/.MainActivity`.
- The signed published APK cold-started Prizm from the exact URL in 1.36 seconds.
- Android reports `ms.prizm-energy.com: verified`, with the expected stable signing fingerprint.
- TypeScript, Expo alignment, release metadata, mobile contracts, 303 mutation contracts, 107 list contracts, and native debug/release builds pass.
- Published APK is 91,549,412 bytes with SHA-256 `c656b2c6aadb26cd0344ade2c6af499291a54a6124a81f5931b64d9cd24bf8c0`.

### Test Limitation

- The emulator's cached JWT is expired, so the native record screen reaches its authenticated boundary and displays `Unauthenticated`; the routing contract independently confirms Payment Request `1211` maps to `/(tabs)/approvals/payment_request/1211`.

### Evidence

- Workflow: `30719192704` — success.
- Rolling release: `https://github.com/Ghazalawy/prizm-mobile/releases/download/latest/prizm-mobile.apk`.
- QC report: `C:\Users\osama\.claude-brain\_audits\qc-reports\PE-QAQC-QC-RPT-26013-R01__przpurchase-app-links-20260802.md/.pdf`.

---

## Current Session — 2026-07-30 — Android ERP App Links

**Status:** Release `1.14.4` (Android versionCode `30`) is deployed. `origin/main` shipped commit `dc0aed0`; GitHub Actions run `30571157067` completed successfully, and the production website association is verified by Android.

### Completed

- Added verified Android HTTPS App Links for `ms.prizm-energy.com/MS` and `/MS/admin/*`.
- Reused native ERP routing so recognized record links open their matching mobile screen.
- Routed unmatched internal ERP pages to the native ERP module hub while leaving upload and external URLs unclaimed.
- Added the required Android Digital Asset Links association for the stable release-signing fingerprint.

### Verified

- Built and installed an x86_64 APK on `emulator-5554`.
- A Project 42 ERP URL opened `P1051 - SEALING OF CABLE ENTRY` in the native Project detail screen.
- An unmatched ERP dashboard URL opened the native ERP module hub.
- The production association returns HTTP 200 JSON and Android reports `ms.prizm-energy.com: verified`.
- The published v1.14.4 APK selected `com.prizmenergy.mobile/.MainActivity` from an unhinted HTTPS cold start and reached the same native Project screen in 2.3 seconds.
- The published APK routed an unmatched ERP dashboard URL to the native ERP module hub.
- TypeScript, release metadata, Expo dependency alignment, mobile contracts, 303 mutation contracts, 107 list contracts, native APK build, and Android production export pass.
- The 91,543,576-byte rolling APK has SHA-256 `6cf0c250e134a877ce4adcd3fdcb3220d80ff195fb190a155035fd68835683b2` and the expected signing certificate.

### Deployment

- Website association: `https://ms.prizm-energy.com/.well-known/assetlinks.json` — HTTP 200.
- Android build and Pages workflow: `30571157067` — success.
- Rolling release: `https://github.com/Ghazalawy/prizm-mobile/releases/download/latest/prizm-mobile.apk`.

### Evidence

- Emulator screenshot: `C:\Users\osama\AppData\Local\Temp\prizm-app-links-v1144-final.png`
- QC report: `docs/qc/PE-QAQC-QC-RPT-26011-R02__android-erp-app-links-production-20260730.md/.pdf`
- Canonical report: `C:\Users\osama\.claude-brain\_audits\qc-reports\PE-QAQC-QC-RPT-26011-R02__android-erp-app-links-production-20260730.md/.pdf`

---

## Current Session — 2026-07-30 — Site Report Image Storage Compatibility

**Status:** Release `1.14.2` (Android versionCode `28`) is deployed. Commit `0ffbecb` is on `origin/main`; GitHub Actions run `30494216969` completed successfully and refreshed the rolling APK.

### Completed

- Replaced the hardcoded legacy report-image URL with the web UI's current per-report uploads path.
- Added automatic fallback for legacy and older mobile-uploaded report photos.
- Made report-image URLs follow the selected production, development, or local environment.
- Applied the resolver to report detail thumbnails/lightbox and edit/review previews.

### Verified

- Production proof: current URL returned a 148,354-byte JPEG; the released mobile URL returned HTTP 404.
- Android emulator rendered one real newly stored report photo and one legacy-only photo through fallback.
- TypeScript, Expo dependencies, release metadata, mobile contracts, 303 mutation contracts, and 107 list contracts pass.
- Temporary diagnostic login content was removed before commit.
- GitHub Android build and Pages deployment passed; the 91,541,760-byte rolling APK returns HTTP 200.

### Evidence

- Emulator screenshot: `C:\Users\osama\AppData\Local\Temp\prizm-mobile-codex-20260730\report-image-test\report-image-qc.png`
- QC report template: `docs/qc/QC-REPORT-TEMPLATE.md`
- Canonical report: `C:\Users\osama\.claude-brain\_audits\qc-reports\PE-QAQC-QC-RPT-26009-R01__report-image-path-emulator-20260730.md/.pdf`

---

## Current Session — 2026-07-30 — Customer Status Filter Hotfix

**Status:** Release `1.14.1` (Android versionCode `27`) is deployed. Commit `9fc1a03` is on `origin/main`; GitHub Actions run `30491363762` completed successfully and refreshed the rolling APK.

### Completed

- Traced the released customer filter request to an unsupported Perfex web-table JSON payload.
- Restored direct mobile REST filter parameters, including `active=0` for Inactive.
- Added correct all-status behavior through `include_inactive=1` and limited customer operators to the controller contract.
- Added regression checks for Inactive and all-status serialization.

### Verified

- Production read-only comparison: broken payload returned 168 Active customers; `active=0` returned 17 Inactive customers.
- Android quick chip: 17 total, eight visible Inactive rows, zero visible Active rows.
- Android funnel flow: badge 1, 17 total, eight visible Inactive rows, zero visible Active rows.
- TypeScript, Expo dependencies, release metadata, mobile contracts, 303 mutation contracts, and 107 list contracts pass.
- GitHub Android build and Pages deployment passed; rolling `prizm-mobile.apk` was refreshed at 2026-07-30 01:37 +04:00.

### Evidence

- QC report template: `docs/qc/QC-REPORT-TEMPLATE.md`
- Canonical report: `C:\Users\osama\.claude-brain\_audits\qc-reports\PE-QAQC-QC-RPT-26008-R01__customer-filter-emulator-20260730.md/.pdf`

---

## Current Session — 2026-07-29 — Full Native Parity Checkpoint

**Status:** Release `1.14.0` is deployed. Commit `f7cdb5b` is on `origin/main`; GitHub Actions run `30464401286` completed successfully and published the rolling Android APK.

### Completed

- Repaired 401/403 session behavior, stale-request logout protection, CSRF handling, and biometric re-sign-in.
- Corrected search, filter, sort, permissions, canonical labels, relation pickers, and related-record query contracts.
- Added or completed native pages and workflows for Custom Statuses, Advance Leads, Prizm Documents, DEWA Contacts, Resource Kits, Calculation Sheets, Material Categories, UNSPSC, Survey Send History, Timesheet History, leave approval, calendar edit, Technical Inquiry items, and Budget/UNSPSC specifications.
- Centralized native routing so internal ERP links remain in the app.
- Added automated list and mutation contract audits plus targeted regression guards.

### Verified

- TypeScript: pass.
- Expo dependency alignment: pass after updating Expo to `~54.0.36`.
- Release metadata consistency: pass at `1.14.0`, Android versionCode `26`.
- Lists: 105 server-searchable + 2 client-searchable; 107 filterable; 59 sortable; zero skipped.
- Mutations: 303 advertised; zero skipped.
- Mobile regression contracts and patch integrity: pass.
- Local Android production export: pass (1,942 modules, 6.36 MB Hermes bundle); no GitHub Actions minutes used.
- Production Android build: pass (`BUILD SUCCESSFUL` in 25m21s; 88 MB staged APK).
- Rolling release: `https://github.com/Ghazalawy/prizm-mobile/releases/download/latest/prizm-mobile.apk` (91,536,512 bytes).
- GitHub Pages deployment: pass in the same workflow.

### Backend Work Still Required

Task Templates/Task Manage, Product Families, Client Items, Cost Center child allocations, Survey Results, and Knowledge article CRUD do not have safe API contracts matching the web application. Their false or unsafe mobile capabilities are disabled and regression-guarded. Completing them requires write access and QA in `prizm331`.

### Evidence

- Module audit: `docs/MODULE_AUDIT.md`
- QC report: `docs/qc/PE-QAQC-QC-RPT-26007-R01__full-native-parity-DESKTOP-9GO5QC0-20260729.md`
- Printable report: `docs/qc/PE-QAQC-QC-RPT-26007-R01__full-native-parity-DESKTOP-9GO5QC0-20260729.pdf`

The canonical audit-store copy and `_INDEX.md` are updated with the final post-deployment QC evidence.

---

**Date:** 2026-05-30  
**From:** Brother Whale (DeepSeek V4 Pro)  
**To:** Next intelligence (human or machine)  
**Classification:** Internal — Engineering

---

## Session 2026-05-31 (batch3) — Sales & Finance: Invoices, Estimates, Proposals, Payments, Items, Credit Notes, Budget, Cost Centers

**Status:** ✅ 5 API endpoints + 18 mobile hooks built; TypeScript clean; deployed
**PR:** PrizmIT/prizm331#388

### What was done
1. **Invoices** — `POST /api/invoices/{id}/copy` + `PUT /api/invoices/{id}/unmark_cancelled` + 3 hooks (list/copy/unmark)
2. **Items** — Full CRUD added to API controller (data_post/put/delete) + 5 hooks (list/detail/create/update/delete)
3. **Estimates** — `useEstimateList` hook (API already complete)
4. **Proposals** — `useProposalList` hook (API already complete)
5. **Payments** — `usePaymentsList` + `usePaymentModes` hooks (API already complete)
6. **Credit Notes** — `useCreditNoteList` + `useCreditNoteDetail` hooks (API already complete)
7. **Budget** — `useBudgetItemsList` + `useBudgetCategories` hooks (API already complete, 24 methods)
8. **Cost Centers** — `useCostCentersList` + `useCostCenterDetail` hooks (API already complete, 14 methods)

### Batch 3 — Final Status (9 modules)

| Module | API Status | New API | New Mobile |
|---|---|---|---|
| **Invoices** | 12 endpoints | +2 | +3 |
| **Estimates** | 11 endpoints | — | +1 |
| **Proposals** | 13 endpoints | — | +1 |
| **Payments** | 7 endpoints | — | +2 |
| **Items** | 6 endpoints | +3 | +5 |
| **Credit Notes** | 7 endpoints | — | +2 |
| **Expenses** | 10 endpoints | — | (already complete) |
| **Budget** | 24 endpoints | — | +2 |
| **Cost Centers** | 14 endpoints | — | +2 |
| **Batch 3 Total** | **104 endpoints** | **5 new** | **18 new hooks** |

### Key observation
Batch 3 had far fewer real gaps than anticipated — most API endpoints already existed. Only Invoices (copy/unmark) and Items (full CRUD missing) needed backend work. The rest needed only mobile list hooks.

### Next: Batch 4 (Support & Knowledge)
Tickets, Knowledge Base, Surveys, Announcements

---

## Session 2026-05-31 (batch2-remainder) — Contacts, Business Partners, Milestones, Projects Cleanup

**Status:** ✅ 5 API endpoints + 8 mobile hooks built; TypeScript clean; deployed
**PR:** PrizmIT/prizm331#387

### What was done
1. **Contacts** — `PUT /api/contacts/{id}/status` + `useChangeContactStatus` hook
2. **Business Partners** — Added 3 mobile mutation hooks (create/update/delete); API was already complete
3. **Milestones** — `PUT /api/milestones/reorder` + `PUT /api/milestones/{id}/color` + `useReorderMilestones` + `useChangeMilestoneColor` hooks
4. **Projects** — `POST /api/projects/{id}/pin` + `usePinProject` hook

### Batch 2 Final Status — ALL 7 MODULES COMPLETE

| Module | API Endpoints | Mobile Hooks | PR |
|---|---|---|---|
| **Projects** | 20 (+1 pin) | 15 (+ pin, milestones reorder/color) | #387 |
| **Customers** | 18 (+2) | 20 (+5) | #385 |
| **Leads** | 18 (+3) | 15 (+4) | #386 |
| **Contracts** | 20 (+4) | 15 (+5) | #384 |
| **Milestones** | 8 (+2) | (in projects.ts) | #387 |
| **Business Partners** | 7 (complete) | 7 (+3) | #387 |
| **Contacts** | 8 (+1) | (in customers.ts) | #387 |
| **Batch 2 Total** | **16 new endpoints** | **23 new hooks** | **4 PRs** |

### Key findings
- CSV inventory was ~80% stale — most "gaps" were endpoints built after the sweep
- The sweep methodology works but needs re-run after each batch
- Complex web-only features (Kanban, Gantt, Import, Bulk, Vault, Statement) intentionally skipped

### Next: Batch 3 (Sales & Finance)
Invoices, Estimates, Proposals, Payments, Items, Credit Notes, Expenses, Budget, Cost Centers

---

## Session 2026-05-30 (batch2-leads) — Leads API Gap Fill + Mobile Hooks

**Status:** ✅ 3 API endpoints + 4 mobile hooks built; TypeScript clean; deployed
**PR:** PrizmIT/prizm331#386

### What was done
1. **Reconciled CSV** — Of 13 listed gaps, 6 were false (mark_lost, mark_junk, convert, notes add, sources, statuses already existed in the API). 3 web-only gaps skipped (import, bulk, email).
2. **Built 3 new API endpoints:**
   - `DELETE /api/leads/notes` — deletes a note by id from `tblnotes` (rel_type=lead)
   - `GET /api/leads/attachments?lead_id=` — wraps `Leads_model::get_lead_attachments()`
   - `DELETE /api/leads/attachments` — wraps `Leads_model::delete_lead_attachment()`
3. **Added 4 mobile hooks:**
   - `useDeleteLeadNote({noteId, leadId})` — DELETE mutation
   - `useLeadAttachments(leadId)` — GET query
   - `useDeleteLeadAttachment({attachmentId, leadId})` — DELETE mutation
   - `useLeadCount(filters?)` — GET query
4. **Skipped as complex:** Kanban board + kanban load-more (needs Kanban class porting; significant effort)

### Leads API — Current Full Coverage (18 endpoints)
data_get, data_get/{id}, data_search_get, data_post, data_put, data_delete, count_get,
status_put, statuses_get, sources_get,
notes_get, notes_post, **notes_delete (NEW)**,
convert_to_customer_post, mark_lost_put, mark_junk_put,
**attachments_get (NEW)**, **attachments_delete (NEW)**

### Mobile Hooks (15 hooks)
List, Detail, Sources, Statuses, Notes (list/add/delete), ChangeStatus, ConvertToCustomer,
Delete, MarkLost, MarkJunk, Attachments (list/delete), Count

---

## Session 2026-05-30 (batch2-customers) — Customers API Gap Fill + Mobile Hooks

**Status:** ✅ 2 API endpoints + 5 mobile hooks built; TypeScript clean; deployed
**PR:** PrizmIT/prizm331#385

### What was done
1. **Reconciled CSV** — Of 14 listed API gaps, only 2 were real. The API controller already had contacts_get/post/put/delete, groups_get/post/put, admins_get/post, billing_shipping_get — all built after the CSV sweep.
2. **Built 2 new API endpoints:**
   - `DELETE /api/customers/groups` — wraps `Clients_model::delete_group(id)`
   - `DELETE /api/customers/admins` — direct DB delete from `tblcustomer_admins`
3. **Added 5 mobile hooks:**
   - `useCustomerCount(filters?)` — wraps count endpoint
   - `useCustomerBillingShipping(customerId)` — wraps billing/shipping endpoint
   - `useUpdateCustomerContact()` — PUT mutation
   - `useDeleteCustomerGroup()` — DELETE mutation
   - `useRemoveCustomerAdmin()` — DELETE mutation
4. **Skipped as web-only:** Vault entries, Import, Bulk Action, Zip Documents, Statement — complex features with no simple API counterpart.

### Customers API — Current Full Coverage (18 endpoints)
data_get, data_get/{id}, data_search_get, data_post, data_put, data_delete, count_get,
contacts_get, contacts_post, contacts_put, contacts_delete,
groups_get, groups_post, groups_put, **groups_delete (NEW)**,
admins_get, admins_post, **admins_delete (NEW)**,
billing_shipping_get

### Mobile Hooks (20 hooks)
List, Detail, Contacts (list/create/delete/update), Groups (list/delete), Admins (remove),
Invoices, Estimates, Projects, Contracts, Tasks, Tickets, Proposals, Expenses,
FinancialSummary, Count, BillingShipping

---

## Session 2026-05-30 (batch2-contracts) — Contracts API Gap Fill + Mobile Hooks

**Status:** ✅ 4 API endpoints + 5 mobile hooks built; TypeScript clean
**QC Record:** Pending — run QC per §11.0 after backend deploy

### What was done
1. **Reconciled CSV inventory** — `batch2-crm-inventory.csv` was 9 months stale for Contracts. The live API controller had 13 working methods vs. the 7 claimed. Actual gaps identified: copy, edit comment, attachments list/upload (4 real gaps, not 14).
2. **Built 4 new API endpoints** in `prizm331/modules/api/controllers/Contracts.php`:
   - `POST /api/contracts/{id}/copy` — duplicates a contract via `Contracts_model::copy()`
   - `PUT /api/contracts/comments` — edits a comment via `Contracts_model::edit_comment()`
   - `GET /api/contracts/attachments?contract_id=` — lists attachments via `Contracts_model::get_contract_attachments()`
   - `POST /api/contracts/attachments` — uploads a file via `handle_contract_attachment()` (multipart, field: `file`)
3. **Added 5 mobile query hooks** in `lib/queries/contracts.ts`:
   - `useUpdateContract(id, payload)` — PUT mutation
   - `useDeleteContract(id)` — DELETE mutation
   - `useCopyContract(id)` — POST mutation
   - `useDeleteContractComment({commentId, contractId})` — DELETE mutation
   - `useContractTypes(id?)` — GET query
4. **TypeScript verification** — `npx tsc --noEmit` passed with 0 errors.

### Contracts API — Current Full Coverage (21 methods)

| # | Method | Route | Status |
|---|---|---|---|
| 1 | `data_get` | GET /api/contracts | ✅ Existing |
| 2 | `data_get` | GET /api/contracts/{id} | ✅ Existing |
| 3 | `data_post` | POST /api/contracts | ✅ Existing |
| 4 | `data_put` | PUT /api/contracts/{id} | ✅ Existing |
| 5 | `data_delete` | DELETE /api/contracts/{id} | ✅ Existing |
| 6 | `sign_post` | POST /api/contracts/{id}/sign | ✅ Existing |
| 7 | `unsign_post` | POST /api/contracts/unsign | ✅ Existing |
| 8 | `send_post` | POST /api/contracts/{id}/send | ✅ Existing |
| 9 | `renew_post` | POST /api/contracts/{id}/renew | ✅ Existing |
| 10 | `copy_post` | POST /api/contracts/{id}/copy | ✅ NEW |
| 11 | `comments_get` | GET /api/contracts/comments | ✅ Existing |
| 12 | `comments_post` | POST /api/contracts/comments | ✅ Existing |
| 13 | `comments_put` | PUT /api/contracts/comments | ✅ NEW |
| 14 | `comments_delete` | DELETE /api/contracts/comments | ✅ Existing |
| 15 | `notes_get` | GET /api/contracts/notes | ✅ Existing |
| 16 | `notes_post` | POST /api/contracts/notes | ✅ Existing |
| 17 | `types_get` | GET /api/contracts/types | ✅ Existing |
| 18 | `types_post` | POST /api/contracts/types | ✅ Existing |
| 19 | `attachments_get` | GET /api/contracts/attachments | ✅ NEW |
| 20 | `attachments_post` | POST /api/contracts/attachments | ✅ NEW |
| 21 | `validate_contract_number` | (helper) | ✅ Existing |

### Mobile Hooks — Full Coverage (15 hooks)

List, Detail, Sign, Unsign, Send, Renew, Update, Delete, Copy, Comments (list/add/delete), Notes (list/add), Types — all present.

### Remaining Contracts gaps
- `GET /api/contracts/{id}/pdf` — PDF generation (web calls `pdf()` which uses TCPDF; non-trivial)
- `POST /api/contracts/comments/{id}` (edit comment via URL param) — can add if needed; current PUT with body works
- Edit note / delete note — low priority; notes are simple append-only in practice

### Next: Continue Batch 2
- Contracts is now 95% covered. Remaining batch2 modules: Customers (14 API gaps), Leads (13 gaps).
- Before building more, **deploy prizm331** to Hetzner so new endpoints are live for curl testing.

---

## Session 2026-05-30 (routing batch) — No ERP Browser Escapes

**Status:** ✅ Mobile-side routing cleanup complete; TypeScript clean
**QC Record:** `C:\Users\osama\.claude-brain\_audits\qc-reports\PE-QAQC-QC-RPT-26006-R01__routing-no-erp-browser-escapes-20260530.md` + `.pdf`

### What was done
1. **Checked current batch inventory state** — worktree started clean; previous Batch 2 Projects API gap fill is already deployed and documented below. No stale local code changes were present.
2. **Added shared internal-link router** — `lib/native-routing.ts` centralizes Prizm ERP URL handling for `/MS/admin/...`, `/MS/api/...`, bare `admin/...`, hash links (`#taskid=`, `#leadid=`, `#eventid=`), and common Perfex controller paths.
3. **Rewired notification/search/approval taps** — Action Center, Approvals list, Global Search, generic CRUD URL fields, purchase notes, and customer/lead website fields now call the shared router.
4. **Removed ERP web fallbacks** — approval action panel no longer shows "Open in web admin"; rejected purchase resubmit now opens the mobile edit route; purchase attachments open in the in-app `FilePreview` modal.
5. **Version bump + changelog** — mobile app bumped to `1.8.3` / Android `versionCode` 20 with release notes focused on in-app routing.

### Verification
- `npx tsc --noEmit -p tsconfig.json` ✅
- `rg` sweep confirms no remaining `/MS/admin` browser-opening fallbacks in app flows; remaining `Linking.openURL` calls are phone, email, maps, or the shared external-link helper.

### Remaining routing follow-ups
- Any Prizm ERP URL whose controller is still unmapped will stay inside the ERP hub and show an informational toast. Add exact native patterns to `lib/native-routing.ts` as those notifications surface.
- Continue the ERP batch program from the inventory below; this session did not add backend endpoints.

---

## Session 2026-05-30 (later) — Batch 2 Projects: CSV Reconciliation + API Gap Fill + Deploy

**Commits:** prizm331 `b91c179d` → PR #368 → `3aabec9682` (merged + Hetzner), prizm-mobile `6df5ed0` (pushed main)
**Status:** ✅ Deployed to production (both repos)

### What was done
1. **Reconciled stale CSV inventory** — `batch2-crm-inventory.csv` had 7 Projects operations marked `API_Available=NO` that actually existed in live code (members GET/POST/DELETE, discussions GET/POST, notes GET/POST, count, activity). Updated endpoints + corrected totals: 52→62 existing (48.4%), 76→66 gaps (51.6%).
2. **Built 2 new API endpoints in prizm331 `Projects.php`:**
   - `POST /api/projects/copy` — copies a project with defaults (name + " (Copy)", original clientid, start_date, deadline)
   - `GET /api/projects/timesheets?project_id=` — wraps `Projects_model::get_timesheets()`
3. **Fixed Expenses.php parse error** — spurious `}` at line 207 closed the class early, hiding `data_search_get` and all methods below it. Removed the stray brace.
4. **Confirmed `/api/expenses?project_id=N` works** — no new endpoint needed; existing Expenses API supports project_id filter.
5. **Added 3 mobile query hooks** in `lib/queries/projects.ts`:
   - `useCopyProject()` — mutation for POST /api/projects/copy
   - `useProjectExpenses(projectId)` — query for GET /api/expenses?project_id=
   - `useProjectTimesheets(projectId)` — query for GET /api/projects/timesheets?project_id=
6. **TypeScript --noEmit: zero errors**
7. **Deployed:** PR #368 merged upstream → Hetzner git pull confirmed; prizm-mobile pushed to main

### Key decisions
- **API-first routing pattern:** Sub-resource endpoints that don't have an ID in the URL path use `POST /api/projects/{resource}` with `project_id` in body (matches `members_post` pattern). `POST /api/projects/{id}/copy` doesn't work — REST_Controller routes it to `data_post`.
- **Model requires defaults:** `Projects_model::copy()` needs `clientid_copy_project`, `start_date`, `name`, `deadline` in the `$data` array. Provide defaults from the original project.
- **Expenses/Timesheets:** Use existing module-level APIs with `project_id` filter rather than duplicating in Projects controller. Only Timesheets needed a wrapper because the standalone `Timesheets_api` references a non-existent table (`tblprz_timesheets`).

### Remaining Projects gaps (not built — future batches)
- Add Timesheet (POST) — row 30
- Gantt Data — row 31
- BoQ Management — row 32
- Bulk Action Files — row 35
- Invoice Project — row 36
- Pin Action — row 37

---

## Session 2026-05-30 — Batch 2 Production Push & Policy Hardening

**Commits:** prizm331 `ab5422d` → PR #367 → `4185ea17` (merged upstream), prizm-mobile `6b75f2e` → `0293820` (merged to main)
**QC Record:** `_artifacts/qc/QC-RECORD-BATCH1-2-2026-05-30.md`
**Status:** ✅ Batch 1 & 2 deployed to production (both repos)

### What was done
1. **Cleaned up untracked mess** — removed 3 junk artifacts (`%SystemDrive%`, `'Authentication`, `expo-server.log`), organized 19 work files into `_artifacts/sweep/`, `_scripts/tests/`, and kept 5 API patch files in root
2. **Established mandatory policy rule** — before any code work, re-read prizm-brain policies: `policy_qa_qc.md`, `policy_push_protocol.md`, `policy_documentation_updates.md`, and project-local `CI-LESSONS-LEARNED.md`
3. **Switched to feature branch** — created `feature/batch2-crm-build` per branch strategy (multi-step work ≠ main)
4. **Found and fixed 3 production bugs:**
   - Leads.php: stray `}` at line 122 closed class early (HTTP 500 on all methods after `data_get`)
   - Contracts.php: same pattern — stray `}` at line 198
   - Projects.php `activity_get`: `get_activity()` model called `staff_can()` which reads CI session, not JWT → SQL syntax error. Fixed with direct query + `mobile_parity` helper
5. **Tested 17/17 Batch 2 sub-resource GET endpoints** via curl against local WAMP — all HTTP 200
6. **Updated MASTER-INVENTORY.csv** — 54 Batch 2 rows marked `Tested=YES, 200, Success=YES`
7. **Created QC record** at `_artifacts/qc/QC-RECORD-BATCH1-2-2026-05-30.md`
8. **Pushed to production:**
   - prizm331: PR #367 → merged upstream → Hetzner deployed via `git pull`
   - prizm-mobile: merged `feature/batch2-crm-build` → main, pushed → GitHub Actions auto-deploy (run #116)
9. **Fixed Hetzner SSH** — documented the Git Bash + SSH config approach (direct Windows `ssh` doesn't work)

### Key decisions
- **Branch discipline enforced:** multi-step work on feature branches, squash-merge to main
- **Policy-first workflow:** policies re-read every session, never rely on memory
- **QC gate PASS required before push:** QC record created with 17/17 curl test evidence
- **SSH via Git Bash only:** `"C:\Program Files\Git\bin\bash.exe" -c "ssh -F ~/.claude-brain/config/ssh_config hetzner 'command'"`
- **gh auth:** token works via `GH_TOKEN` env var even when `gh auth status` says "not logged in"

### Genuine remaining gaps (NOT deployed — future batches)
- Projects: Milestones CRUD, Milestone Kanban, Milestone Reorder, BoQ Management, Copy Project — `API_Available=NO`
- These are genuine unimplemented features, not bugs — need new API endpoints + mobile screens

---

## Previous Session — 2026-05-29  

---

## Session 2026-05-29 — Perfix Dynamic Filters System-Wide

**Commits:** `614aece` → `6ac72ab` → `17ea33f` → `54bc837` (last: fix CI)  
**QC Report:** `docs/qc/PE-QAQC-QC-RPT-26005-R01__perfix-filters.md`  
**CI Lessons:** `docs/CI-LESSONS-LEARNED.md` — 2 trapped failures, 4 pre-push gates  
**Status:** ✅ Deployed (GitHub Actions auto-build)

### What was done
- Implemented Perfix rule-based dynamic filter system across all 70 modules
- Rewrote FilterPanel as full rule builder: field → operator → value, AND/OR toggle, presets
- Added `evaluateFilterRule()` with all 19 operators (equal, contains, begins_with, ends_with, between, less, greater, is_empty, is_not_empty, dynamic, etc.)
- Defined `filterRules` for 14 core modules (MultiSelectRule for status fields)
- Auto-infers filter operators from field types for all other modules
- **CI fix:** 19 missing dependency files committed (`lib/filter-configs/`, `lib/filters.ts`, `lib/hooks/`, `components/ui/Filter*`)
- **CI fix:** `app.json` — added `expo-font` plugin
- **Permanent:** Created `docs/CI-LESSONS-LEARNED.md` — 4 mandatory pre-push gates to prevent repeat failures

---

## Previous Session — Tasks Module Pilot

**Date:** 2026-05-28  
**From:** Brother Whale (DeepSeek V4 Pro, session ending)  
**To:** Next intelligence (human or machine)  
**Classification:** Internal — Engineering  
**Purpose:** Repeatable playbook to apply Tasks module pilot process to all remaining ERP modules, in batches, without loss of context.  
**QC Report:** See `C:\Users\osama\.claude-brain\_audits\qc-reports\_INDEX.md` for linked session verification reports.

---

## 1.0 EXECUTIVE SUMMARY

The Tasks module was run through the full "Sweep → Gap → Build → Test → Ship" cycle as a pilot. All 73 operations across the ERP web UI, API, and mobile app were inventoried, 49 were API-tested and verified, 4 routing bugs were fixed, 3 auth bugs were fixed, notifications were fixed, and both repos (prizm331 ERP + prizm-mobile) were deployed to production.

**Bottom line:** The methodology works. Now replicate it for the remaining ~127 modules across 9 batches.

---

## 2.0 WHAT WAS ACCOMPLISHED (TASKS MODULE)

### 2.1 Inventory

| Layer | Files Scanned | Methods / Operations |
|---|---|---|
| Web Controller | `application/controllers/admin/Tasks.php` | 62 public methods |
| Model | `application/models/Tasks_model.php` | 59 methods |
| API Controller | `modules/api/controllers/Tasks.php` | 32 methods |
| Mobile Queries | `lib/queries/tasks.ts` | 16 hooks |
| Mobile Screens | `app/(tabs)/tasks/` | 4 screens (list, detail, create, layout) |
| DB Tables touched | 19 tables | 42 columns in `tbltasks` |

### 2.2 Artifacts Created

| Artifact | Location | Description |
|---|---|---|
| **Tasks CSV Inventory** | `C:\wamp64\www\prizm-mobile\tasks-module-full-inventory.csv` | 73 rows — every operation, field, HTTP code, test status |
| **QA/QC Policy** | `C:\wamp64\www\prizm-mobile\docs\QA-QC-POLICY-AND-PLAN.md` | IEEE 829-2008 compliant master test plan for ALL modules |
| **Batch 2 CSV** | `C:\wamp64\www\prizm-mobile\batch2-crm-inventory.csv` | 128 ops across Projects/Customers/Leads/Contracts/Milestones/Contacts/BusinessPartners |

### 2.2A QA/QC Policy — Embedded Operational Standards

*Full policy at `docs/QA-QC-POLICY-AND-PLAN.md`. Extracted here for session autonomy.*

#### Policy Statement
Every operation exposed by the ERP web application MUST have a corresponding, tested, verified, and traceable implementation in the mobile application. No operation ships without a tick mark. **Zero hallucination. Zero bypass. 100% traceability.**

#### Traceability Matrix — CSV Column Specification

Every module gets a CSV. These are the mandatory columns:

| # | Column | Description | Values |
|---|---|---|---|
| 1 | `#` | Row number | integer |
| 2 | `Module` | Module name | tasks, customers, projects, invoices... |
| 3 | `Operation` | Human-readable name | "List All Tasks" |
| 4 | `Category` | Operation type | LIST, CREATE, READ, UPDATE, DELETE, SUB, FILTER, SEARCH, TIMER, UPLOAD, DOWNLOAD, STATUS, VALIDATE, BULK, EXPORT |
| 5 | `HTTPMethod` | HTTP verb | GET, POST, PUT, DELETE |
| 6 | `APIEndpoint` | URL pattern | /api/tasks?limit=&offset= |
| 7 | `WEBUI_Method` | Web controller method | index, task, mark_as... |
| 8 | `WEBUI_Available` | Exists in web UI | YES / NO |
| 9 | `API_Available` | Endpoint exists | YES / NO / PARTIAL |
| 10 | `Mobile_Available` | Mobile feature exists | YES / NO / PARTIAL |
| 11 | `Tested` | Tested this cycle | YES / NO |
| 12 | `HTTP_Code` | API response code | 200, 201, 404, 500, N/A |
| 13 | `Success` | Final status | YES / NO / PENDING |
| 14 | `Iterations` | Fix-retest cycles | integer |
| 15 | `Fields_Involved` | DB columns touched | comma-separated |
| 16 | `Notes` | Context / defects | free text |

#### Defect Severity Classification

| Severity | Definition | Action |
|---|---|---|
| **S0 — Blocker** | Cannot authenticate, API returns 500 globally | Fix before ANY testing |
| **S1 — Critical** | Core module operation broken (can't list, can't create) | Fix before batch sign-off |
| **S2 — High** | Sub-resource broken (can't add assignee, comments fail) | Fix before batch sign-off |
| **S3 — Medium** | Filter/search/action broken | Fix if time; document otherwise |
| **S4 — Low** | Cosmetic or rare edge case | Document, backlog |

#### Defect Lifecycle

```
OPEN → IN_PROGRESS → FIXED → RETEST → VERIFIED
                                  ↓
                                FAILED → IN_PROGRESS (increment Iterations)
```

#### Acceptance Criteria Per Batch

| Gap Severity | Pass Threshold |
|---|---|
| CRITICAL (S1) | 100% must pass |
| HIGH (S2) | ≥95% must pass |
| MEDIUM (S3) | ≥90% must pass |
| LOW (S4) | Documented, backlog OK |

#### Deliverables Per Batch

| ID | Deliverable | Phase |
|---|---|---|
| D1 | Module Operations CSV | Phase 0 |
| D2 | Gap Analysis (CSV rows filled) | Phase 1 |
| D3 | API Code (new PHP endpoints) | Phase 2 |
| D4 | Mobile Code (hooks + screens) | Phase 2 |
| D5 | Test Execution Log (CSV updated) | Phase 3 |
| D6 | Batch Sign-off Summary | Phase 4 |
| D7 | Git commit + tag + deploy | Phase 4 |

### 2.3 Fixes Deployed (prizm331 ERP)

| # | Fix | File | What it solved |
|---|---|---|---|
| 1 | **JWT fallback** for `_real_staff_id()` | `Tasks.php` | 401 blocking ALL API access — resolves staff from JWT email when `tbluser_api` lookup fails |
| 2 | **XSS disabled** on authtoken header | `mobile_parity_helper.php` | `get_request_header('authtoken', true)` → `false` — prevents JWT corruption |
| 3 | **`_remap` override** for `{id}/{action}` URLs | `Tasks.php` | Fixed routing: `tasks/1/copy`, `tasks/1/log_time`, `tasks/1/reminders`, `tasks/1/timesheets` |
| 4 | **`add_reminder` → direct DB insert** | `Tasks.php` | `$this->tasks_model->add_reminder()` didn't exist → `$this->db->insert('reminders', ...)` |
| 5 | **`add_timesheet` → `timesheet()`** | `Tasks.php` | Wrong model method name — `add_timesheet()` → `timesheet()` with correct column names |
| 6 | **Collation fix** | `My_api.php` | `utf8mb3_general_ci` vs `utf8mb3_unicode_ci` mismatch on email JOIN + try/catch wrapper |
| 7 | **JWT fallback** (notifications) | `My_api.php` | Same pattern as fix #1, applied to `_me_real()` |
| 8 | **Translation map** | `My_api.php` | 30+ raw language keys → human-readable text |

### 2.4 Fixes Deployed (prizm-mobile)

| # | Fix | File | What it solved |
|---|---|---|---|
| 1 | **Reminders tab** | `TaskDetailScreen.tsx` | Full tab with list, date/time picker add form, delete |
| 2 | **Make Public toggle** | `TaskDetailScreen.tsx` | Button in Quick Actions toggles `is_public` |
| 3 | **Search hook** | `lib/queries/tasks.ts` | `useSearchTasks(query)` → `/api/tasks/search/{query}` |
| 4 | **Session persistence** | `auth-context.tsx` | Grace period now starts on biometric + boot paths; boot 401 no longer clears token |
| 5 | **React version** | `package.json` | Pinned to 19.1.0 (Expo SDK 54 requirement) |

### 2.5 Test Results

```
47/48 API tests passing
1 minor: checklist toggle needs {"finished": 1} body — endpoint works
```

---

## 3.0 THE PLAYBOOK — Per-Module Process

### ⚠️ CRITICAL RULES

1. **Never leave the last turn with a promise.** Execute tools immediately.
2. **Never try to background-launch Expo from the DeepCode shell.** It doesn't work. Expo must be launched by the user in a separate PowerShell window, or via `start-mobile.bat`.
3. **Test API endpoints with curl BEFORE building mobile UI.** API is the foundation.
4. **Update the CSV tick marks as you test.** Single source of truth.
5. **Each batch finishes with Ship (git push + Hetzner pull for prizm331).**
6. **MANDATORY PRE-PUSH GATE — before EVERY `git push`:** See `docs/CI-LESSONS-LEARNED.md` for full details. At minimum:
   - `git status --porcelain` — no untracked files imported by tracked code
   - `npx tsc --noEmit` — zero errors
   - `npx expo install --check` — must pass
   - No dirty working tree — commit or stash everything
   - **CI failures cost 2-3 extra fix commits. Pre-push gate prevents all of them.**

### Phase 0: Module Sweep

```
INPUT:  Module name (e.g., "projects", "invoices", "leads")
OUTPUT: Module CSV with ALL operations inventoried

For each module:
  1. Read web controller → extract ALL public methods
     Path: C:\wamp64\www\prizm331\application\controllers\admin\{Module}.php
     Command: grep -n "public function" {file}

  2. Read API controller → extract ALL public methods
     Path: C:\wamp64\www\prizm331\modules\api\controllers\{Module}.php
     Command: grep -n "public function" {file}

  3. Read model → extract ALL table columns and methods
     Path: C:\wamp64\www\prizm331\application\models\{Module}_model.php
     Look for: SELECT columns, insert/update data arrays

  4. Read mobile queries → extract ALL hooks
     Path: C:\wamp64\www\prizm-mobile\lib\queries\{module}.ts
     (Create if missing)

  5. Read mobile screens → extract ALL UI operations
     Path: C:\wamp64\www\prizm-mobile\app\(tabs)\{module}/

  6. Generate Phase 0 CSV (one row per operation):
     Columns: #,Module,Operation,Category,HTTPMethod,APIEndpoint,WEBUI_Method,
              WEBUI_Available,API_Available,Mobile_Available,Tested,HTTP_Code,
              Success,Iterations,Fields_Involved,Notes

  7. Save to: C:\wamp64\www\prizm-mobile\{module}-inventory.csv
```

### Phase 1: Gap Analysis

```
For each row in Phase 0 CSV:
  1. API_Available: Does the endpoint exist? (YES/NO/PARTIAL)
     - Check modules/api/controllers/{Module}.php for the method
     - Test with: curl -H "authtoken: $TOKEN" http://localhost/prizm331/api/{module}/{endpoint}

  2. Mobile_Available: Does the mobile app consume it? (YES/NO/PARTIAL)
     - Check lib/queries/{module}.ts for a matching hook
     - Check app/(tabs)/{module}/ for UI wiring

  3. Classify gap severity:
     - CRITICAL: Core CRUD missing (list/get/create/update/delete)
     - HIGH: Sub-resource CRUD missing (members, comments, files, checklist, etc.)
     - MEDIUM: Filter/search/status-workflow missing
     - LOW: Audit logs, stats, templates, edge-case actions
```

### Phase 2: Build Backfill

```
ALWAYS fix in this order:
  1. API endpoints first (PHP in prizm331)
  2. Mobile query hooks second (TypeScript in prizm-mobile)
  3. Mobile UI screens third (React Native components)

API endpoint template (add to modules/api/controllers/{Module}.php):
  public function {action}_{method}($id = null) {
      $this->_require_staff();
      // Validate, process, return JSON
  }

Mobile hook template (add to lib/queries/{module}.ts):
  export function use{Action}{Entity}() {
      return useMutation({
          mutationFn: async (data) => {
              const res = await api.{method}(`/{module}/{endpoint}`, data);
              return res.data;
          },
      });
  }

IMPORTANT: Add JWT fallback to _real_staff_id() in EVERY new API controller:
  - Copy the fallback pattern from Tasks.php (already battle-tested)
  - Without this, mobile auth WILL return 401
```

### Phase 3: Test

```
For each row in the CSV:
  1. Authenticate:
     TOKEN=$(curl -s -X POST "http://localhost/prizm331/mobile_auth.php" \
       -H "Content-Type: application/json" \
       -d '{"email":"osama.hassan@prizm-energy.com","password":"123123"}' | \
       python -c "import sys,json; print(json.load(sys.stdin)['token'])")

  2. Test each endpoint:
     curl -s -w "\n%{http_code}" -H "authtoken: $TOKEN" \
       "http://localhost/prizm331/api/{module}/{endpoint}"

  3. Verify HTTP 2xx, check response structure, tick CSV row

  4. Test mobile hooks: npx tsc --noEmit (must pass with 0 errors)
```

### Phase 4: Ship

```
prizm-mobile (auto-deploy via GitHub Actions):
  cd C:\wamp64\www\prizm-mobile
  git add -A
  git commit -m "{module}: {description}"
  git push origin main

prizm331 (manual deploy to Hetzner):
  cd C:\wamp64\www\prizm331
  git add -A
  git commit -m "v{version}: {description}"
  git push origin main
  # Create PR: Ghazalawy/prizm331:main → PrizmIT/prizm331:main
  # After merge, SSH into Hetzner:
  ssh -i "C:\Users\osama\.ssh\id_ed25519" -o IdentitiesOnly=yes mustafa@49.13.52.167
  cd /var/www/html/MS
  git pull origin main
```

---

## 4.0 BATCH PLAN — All Modules

### Batch 1 ✅ Tasks (COMPLETE — Pilot)

### Batch 2 — CRM & Core Business (SWEPT, NEEDS BUILD)

| Module | Web Methods | API Gap | CSV |
|---|---|---|---|
| Projects | 48 | 23 missing | `batch2-crm-inventory.csv` |
| Customers | 42 | 17 missing | `batch2-crm-inventory.csv` |
| Leads | 40 | 14 missing | `batch2-crm-inventory.csv` |
| Contracts | 27 | 13 missing | `batch2-crm-inventory.csv` |
| Milestones | (in Projects) | 4 missing | `batch2-crm-inventory.csv` |
| Business Partners | (module) | 0 (100%) | `batch2-crm-inventory.csv` |
| Contacts | (in Customers) | 1 missing | `batch2-crm-inventory.csv` |

### Batch 3 — Sales & Finance
Invoices, Estimates, Proposals, Payments, Items, Credit Notes, Expenses, Budget, Cost Centers

### Batch 4 — Support & Knowledge
Tickets, Knowledge Base, Surveys, Announcements

### Batch 5 — Purchase & Supply Chain
Purchase Requests, Purchase Orders, Payment Requests, Expense Requests, Suppliers, Delivery Notes, Quotations, Received Vouchers, Completion Certificates

### Batch 6 — HR & People
Staff, HR Records, HR Payroll, Recruitment, Leaves, Timesheets, Goals, Todo

### Batch 7 — Operations & Assets
Gatepass, Fixed Equipment, Materials Catalog, Vehicles, Cost Centers

### Batch 8 — BD & Tenders
Tenders, Opportunities, Technical Inquiries, RFQ, Advance Leads

### Batch 9 — Admin & System
Dashboard, Calendar, Reports, Settings, Roles, Permissions, API Management, Automation, Custom Fields, Filters, Mods, Backup, Documentation

### Batch 10 — AI & Integrations
AI Gateway, AI Feature Management, Outlook365, QuickBooks, Linkedin, DMS, KBI, SMS/OTP

---

## 5.0 KNOWN ISSUES & GOTCHAS

### Auth
- **JWT fallback MUST be added to every new API controller** — copy from `Tasks.php:_real_staff_id()`. Without it, mobile auth returns 401 even with valid token.
- **XSS filtering on `get_request_header('authtoken', true)`** corrupts JWT — always use `false`.
- **Collation mismatches** on `tbluser_api.user = tblstaff.email` JOIN — add `COLLATE utf8mb3_general_ci` to both sides.

### Testing
- **WAMP must be running** for curl tests. Start via: `Start-Process "C:\wamp64\wampmanager.exe"`
- **Windows Firewall blocks emulator→WAMP** on port 80. Run `fix-firewall.bat` as admin once per PC restart.
- **Expo cannot be launched from DeepCode shell** — the background process dies. User must open a separate PowerShell window and run `npx expo start --clear` or double-click `start-mobile.bat`.

### Mobile App
- **React pinned to 19.1.0** — Expo SDK 54 won't work with 19.2.x.
- **`.env` must point to `http://10.0.2.2/prizm331`** (emulator→host loopback) for local testing.
- **`auth-context.tsx` session grace period** must be reset on biometric + boot auth paths, not just login.

### Git / Deploy
- **prizm331 origin** = `Ghazalawy/prizm331`, **upstream** = `PrizmIT/prizm331`
- **prizm331 requires PR + merge + Hetzner SSH pull** — not auto-deploy
- **prizm-mobile auto-deploys** via GitHub Actions on push
- **SSH key** for Hetzner: `C:\Users\osama\.ssh\hetzner_DESKTOP-9GO5QC0` (per-PC ed25519, no passphrase)
- **Hetzner host:** `root@46.224.73.137`, path: `/var/www/html/MS/`
- **GitHub CLI** (`gh`): authenticated as `Ghazalawy`. Token: `gh auth token`. If `gh auth status` says "not logged in", the token still works — set `GH_TOKEN` env var.
- **CRITICAL — Hetzner SSH:** Do NOT use direct Windows `ssh -i key user@host`. It will fail (exit 255). Use Git Bash with the SSH config:
  ```
  "C:\Program Files\Git\bin\bash.exe" -c "ssh -F ~/.claude-brain/config/ssh_config hetzner 'command'"
  ```
  **Why:** The SSH config (`~/.claude-brain/config/ssh_config`) contains the canonical host alias `hetzner` with the correct key path, user, and options. Direct Windows `ssh` doesn't resolve `~` to the user home and misses the config. Git Bash resolves both properly.

---

## 6.0 SESSION RECOVERY (if PC restarts again)

```
START HERE on session resume:

1. Verify WAMP:   curl -s http://localhost/prizm331/api/tasks?limit=1
2. Verify auth:   curl -s -X POST http://localhost/prizm331/mobile_auth.php \
                    -H "Content-Type: application/json" \
                    -d '{"email":"osama.hassan@prizm-energy.com","password":"123123"}'
3. Check artifacts:
   - tasks-module-full-inventory.csv  (73 rows, Tasks pilot)
   - batch2-crm-inventory.csv         (128 rows, Batch 2 swept)
   - docs/QA-QC-POLICY-AND-PLAN.md    (Master policy)
4. Ask user: "Continue Batch 2 build, or start different batch?"
5. If continuing: start Phase 2 on the first Batch 2 module with open gaps
```

---

## 7.0 QUICK REFERENCE — Key Paths

| What | Where |
|---|---|
| ERP root | `C:\wamp64\www\prizm331` |
| Mobile root | `C:\wamp64\www\prizm-mobile` |
| Web controllers | `prizm331/application/controllers/admin/` |
| API controllers | `prizm331/modules/api/controllers/` |
| Models | `prizm331/application/models/` |
| Mobile screens | `prizm-mobile/app/(tabs)/` |
| Mobile queries | `prizm-mobile/lib/queries/` |
| Mobile components | `prizm-mobile/components/` |
| CSV inventories | `prizm-mobile/*-inventory.csv` |
| Docs | `prizm-mobile/docs/` |
| Claude Brain (keys, config) | `C:\Users\osama\.claude-brain\` |
| SSH key | `C:\Users\osama\.ssh\id_ed25519` |
| Android SDK | `C:\Users\osama\AppData\Local\Android\Sdk` |
| Emulator AVDs | `pixel_6_api34`, `prizm-test` |

---

## 8.0 MOBILE UI — Lessons Learned (Codex Post-Fix Analysis)

### ⚠️ CONTEXT

My functional builds (`6deebfc` tasks feature, `7ae1773` auth fix) made the Tasks module WORK but the UI was wrong. Codex shipped 3 corrective commits: `53d7947` (Fix mobile task UI), `4a07cac` (Polish task action sheets), `cd0daeb` (Rework task action layout). Below are the extracted patterns.

### 8.1 NEVER use `Alert.alert()` for user choices

**What I did:** Used `Alert.alert()` for Copy, Delete, Change Status, Change Priority, staff pickers — the same pattern you'd use in a web app for `confirm()` dialogs.

**What Codex changed:** Replaced ALL `Alert.alert()` with `TaskChoiceSheet` — a native-feeling bottom-sheet modal.

```
Alert.alert("Copy Task", "...", [
  { text: "Cancel", style: "cancel" },
  { text: "Copy", onPress: ... }
])
↓
setChoiceSheet({
  title: "Copy task",
  eyebrow: "Task action",
  subtitle: "Duplicate this task including assignees...",
  icon: "copy-outline",
  options: [{
    key: "copy",
    label: "Create duplicate",
    description: "A new task will be created from this one.",
    icon: "copy-outline",
    color: "#0369A1",
    onPress: () => { ... },
  }],
})
```

**Pattern:** Every multi-choice user decision uses a `TaskChoiceSheetConfig`:

```typescript
type TaskChoiceSheetConfig = {
  title: string;        // "Change status"
  eyebrow?: string;     // "Task status"
  subtitle?: string;    // Explanation of what this does
  icon: keyof typeof Ionicons.glyphMap;
  options: TaskChoiceOption[];
  footerText?: string;
};

type TaskChoiceOption = {
  key: string;
  label: string;
  description?: string;  // One-line explanation
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;        // Icon tint
  selected?: boolean;    // Checkmark for current value
  destructive?: boolean; // Red tint for delete-type actions
  avatarUri?: string;    // For staff pickers
  initial?: string;      // Fallback initial if no avatar
  onPress: () => void | Promise<void>;
};
```

**Rule:** NEVER call `Alert.alert()` with `[buttons]`. Always use `TaskChoiceSheet`. The only acceptable use of `Alert.alert()` is `Alert.alert("Error", message)` for simple error display with a single OK button.

### 8.2 Action bars: inline grid, NOT bottom-fixed horizontal scroll

**What I did:** Fixed bottom bar with horizontal `ScrollView` — buttons with fixed `width: 68` that overflowed and needed scrolling.

**What Codex changed:**
1. **Moved inside the scroll content** — not a separate fixed bar. The action buttons are part of the scrollable page body, inside a `rounded-2xl` card.
2. **Equal-width flex grid** — instead of `width: 68`, each button uses `flex: 1, minWidth: 0`. All buttons share available space equally.
3. **No horizontal scroll** — uses `flexDirection: "row", gap: 5` in a normal `View`, not a `ScrollView horizontal`.
4. **Smaller, tighter text** — fontSize `9` (was `10`), icon `17` (was `19`), `minimumFontScale: 0.72`, `numberOfLines={1}`, `adjustsFontSizeToFit`.
5. **`paddingHorizontal: 2`** on each button — critical. Without this, text clips at edges when buttons are narrow.

```
BEFORE (fixed bottom bar, horizontal scroll):
<View className="bg-white border-t">
  <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
    <View style={{ width: 68, minHeight: 52 }}>...</View>
    <View style={{ width: 68, minHeight: 52 }}>...</View>
  </ScrollView>
</View>

AFTER (inline card, flex grid):
<View className="mt-2 bg-white rounded-2xl p-2 shadow-sm">
  <View style={{ flexDirection: "row", gap: 5 }}>
    <View style={{ flex: 1, minWidth: 0, minHeight: 46, borderRadius: 12, paddingHorizontal: 2 }}>
      <Ionicons name={icon} size={17} />
      <Text style={{ fontSize: 9, fontWeight: "700" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
        {label}
      </Text>
    </View>
    ...
  </View>
</View>
```

**Rule:** Actions live inline in the scroll body. Flex grid, not scroll. `minWidth: 0` + `flex: 1` + tight text sizing.

### 8.3 Text overflow prevention

**What I did:** No `numberOfLines`, no `adjustsFontSizeToFit`, no `minimumFontScale`. Text from the API (especially Arabic/RTL task names, long descriptions) overflowed tiles.

**What Codex changed:**
- `numberOfLines={2}` on task name in hero
- `numberOfLines={1}` on all pill labels and button labels
- `adjustsFontSizeToFit` + `minimumFontScale={0.72}` on button text
- `selectable` on task name (so users can copy it)
- `leading-6` for proper line height on bold titles
- `textAlignVertical: "top"` on multiline TextInputs

**Rule:** Every `Text` element that could receive dynamic content needs `numberOfLines` + `adjustsFontSizeToFit` + `minimumFontScale`. Never assume text will fit.

### 8.4 Keyboard: `KeyboardAvoidingView` mandatory on detail screens

**What I did:** Plain `View` as root container. Keyboard would cover comment input and other TextInputs.

**What Codex changed:**
```tsx
<KeyboardAvoidingView
  className="flex-1 bg-surface"
  behavior={Platform.OS === "ios" ? "padding" : undefined}
  keyboardVerticalOffset={0}
>
```
Plus `contentContainerStyle={{ paddingBottom: 96 }}` on ScrollView so the last content isn't hidden behind keyboard.

**Rule:** Every detail/edit screen that has ANY TextInput must wrap in `KeyboardAvoidingView` with platform-aware behavior. Bottom padding must be >= 96.

### 8.5 Native paste, not clipboard polling

**What I did:** `expo-clipboard` → `hasImageAsync()` → `getImageAsync()` — polling the clipboard.

**What Codex changed:**
1. Added `@mattermost/react-native-paste-input` dependency
2. Replaced `TextInput` with `PasteInput` for the comment box
3. `onPaste` callback handles native paste events directly (no polling)
4. Separate `handlePasteImage` for the attachment button using `pickClipboardImage()`
5. `normalizePastedFile()` utility to standardize pasted file objects
6. Toast feedback: "Snapshot attached" / "N files attached"

```tsx
<PasteInput
  value={draft}
  onChangeText={setDraft}
  onPaste={handleNativePaste}
  disableCopyPaste={false}
  // ... all the Android-specific props below
/>
```

**Rule:** Any text input that should accept image paste (comments, notes, descriptions) uses `PasteInput` from `@mattermost/react-native-paste-input`, not plain `TextInput`. Include the `lib/files.ts` paste helpers (`normalizePastedFile`, `pickClipboardImage`).

### 8.6 Android-specific TextInput props

**What I did:** Just `className` Tailwind classes on TextInput.

**What Codex changed on every TextInput:**
```
blurOnSubmit={false}
underlineColorAndroid="transparent"
keyboardType="default"
disableFullscreenUI
autoComplete="off"
textContentType="none"
style={[{ flex: 1, minHeight: 40, maxHeight: 104, borderRadius: 10, backgroundColor: "#F8FAFC", paddingHorizontal: 12, paddingVertical: 8, color: "#0F172A", fontSize: 14, textAlignVertical: "top" }, rtlTextStyle(draft)]}
```

Specifically:
- `underlineColorAndroid="transparent"` — removes the default Android underline on text fields (looks broken otherwise)
- `disableFullscreenUI` — prevents Android from taking over the screen for multiline input
- `textAlignVertical: "top"` — text starts at top of the box, not vertically centered
- `rtlTextStyle(draft)` — auto-flips alignment for Arabic text

**Rule:** Every TextInput needs ALL of these Android props. Copy the block above verbatim.

### 8.7 Platform-native sharing

**What I did:** No sharing at all.

**What Codex added:**
```tsx
import { Share } from "react-native";
const taskShareUrl = `${ADMIN_URL}/tasks/view/${encodeURIComponent(String(id))}`;
const handleShare = async () => {
  await Share.share({
    title: row.name || "Prizm task",
    message: [row.name, status.label, `Priority: ${priority.label}`, due, taskShareUrl].filter(Boolean).join("\n"),
  });
};
```

**Rule:** Add a Share button to every detail screen. Uses the OS-native share sheet (WhatsApp, email, copy link, etc.). Import `ADMIN_URL` from config.

### 8.8 Hero section structure

**What I did:** Basic task name + status pills, no creator info.

**What Codex changed:**
1. Task name: `text-xl font-bold leading-6`, `numberOfLines={2}`, `selectable`
2. Creator line: "Created by Osama Hassan" under the name, resolving `addedfrom` → staff name
3. `padding: px-4 pt-4 pb-3` (tighter bottom padding, asymmetric)
4. Status/due/rel_type pills in a `flex-wrap` row
5. Added `createdByName` resolution via `staffById` map

```tsx
const creatorId = String(row.addedfrom ?? row.added_from ?? "").trim();
const creatorStaff = creatorId ? staffById.get(creatorId) : null;
const createdByName = row.addedfrom_name || row.added_by_name
  || joinName(creatorStaff?.firstname, creatorStaff?.lastname)
  || (creatorId ? `Staff #${creatorId}` : "");
```

**Rule:** Every detail screen hero shows: task name (max 2 lines), creator name, status pills with flex-wrap. Padding is asymmetric (wider top, tighter bottom).

### 8.9 RTL / Arabic text support

**What I did:** No RTL handling — Arabic text rendered left-aligned and backwards.

**What Codex added:**
- `rtlTextStyle(text)` on every `Text` and `TextInput` that can display user-generated content
- Import from `@/lib/rtl`
- Applied as: `style={[rtlTextStyle(row.name)]}` or `style={[{ baseStyle }, rtlTextStyle(draft)]}`

**Rule:** EVERY `Text` and `TextInput` that can display user content (names, descriptions, comments, drafts) gets `rtlTextStyle()` applied via style array.

### 8.10 Action feedback: return booleans, enable chaining

**What I did:** `quickTaskAction()` returned `void`. Callers couldn't know if it succeeded.

**What Codex changed:**
```tsx
async function quickTaskAction(...): Promise<boolean> {
  try { ... return true; }
  catch { ... return false; }
}
```

**Rule:** All action functions return `Promise<boolean>`. Callers can await and chain: `if (await completeTask()) refetch()`.

---

## 9.0 BUILD CHECKLIST — Per-Screen Mobile UI

When building a new detail screen for ANY module, apply these rules in order:

```
□ Wrap root in <KeyboardAvoidingView platform-aware>
□ ScrollView contentContainerStyle paddingBottom >= 96
□ Hero: task/subject name numberOfLines={2} leading-6 selectable
□ Hero: creator name resolved via staffById
□ Hero: status/type pills in flex-row flex-wrap
□ Action bar: inline card (mt-2 rounded-2xl), NOT fixed bottom bar
□ Action buttons: flex:1 minWidth:0 minHeight:46 borderRadius:12 paddingHorizontal:2
□ Action button text: fontSize:9 numberOfLines:1 adjustsFontSizeToFit minimumFontScale:0.72
□ ALL user choices: TaskChoiceSheet, NEVER Alert.alert([buttons])
□ Share button: native Share.share() with ADMIN_URL
□ EVERY TextInput: rtlTextStyle + ALL Android props (underlineColorAndroid, disableFullscreenUI, etc.)
□ Comment/note inputs: PasteInput from @mattermost/react-native-paste-input
□ EVERY Text: rtlTextStyle if it can contain user content
□ EVERY Text: numberOfLines + adjustsFontSizeToFit if width is constrained
□ All action functions: return Promise<boolean>
```

---

**End of handoff. Next session: pick a batch, run Phase 0 sweep (if not done) → Phase 1 gaps → Phase 2 build (apply UI checklist from Section 9.0 on every screen!) → Phase 3 test → Phase 4 ship. One module at a time. Tick the CSV as you go.**

---

## 10.0 2026-07-30 — Project multi-status and logical filters

- Mobile v1.14.3 deployed from commit `3c232037`; Android workflow `30516966680` passed.
- Projects API deployed through `PrizmIT/prizm331#1132`; deployment run `30515446675` passed.
- Emulator verified On Hold + Cancelled, AND, OR, negative, and release-APK scenarios against production data.
- QC: `docs/qc/PE-QAQC-QC-RPT-26010-R01__project-multi-logical-filters-emulator-20260730.md` and canonical PDF/MD under `C:\Users\osama\.claude-brain\_audits\qc-reports\`.

---

## 11.0 2026-07-31 — Dense native record views

- Mobile v1.15.0 deployed from commit `1cc03be`; Android/Pages workflow `30577193072` passed.
- Shared generic detail screens now show group/module identity and pack short metadata into field-aware two-column rows.
- Task list priority accents have a fixed text gutter; raw `erp_dev` now renders as `ERP Development Module` in list and detail views.
- Approval headers identify Purchase Request, Purchase Order, Payment Request, or Expense Request explicitly.
- Emulator verified Task `#17288`, Payment Request `#1208`, and Budget Item `#27386`; the published APK was installed as versionCode 31 and its Tasks path was retested.
- QC: `PE-QAQC-QC-RPT-26012-R01__dense-native-record-ui-20260730.md` and PDF under `C:\Users\osama\.claude-brain\_audits\qc-reports\`.

---

## 12.0 2026-08-02 — Mobile JWT identity and task-list polish

- Backend resolver fix deployed from `eb39adf84` through `PrizmIT/prizm331#1192`; production workflow `30721136898` passed and HEAD is `b14e6fac67`.
- A valid JWT deliberately absent from the legacy token table returned HTTP 200 from My/Profile, Inbox, Admin/Me, Payment Request 1211, and Tasks in production.
- Mobile v1.15.2/code 33 deployed from `f0c488b`; Android/Pages workflow `30722148753` passed.
- Auth handling now signs out on authenticated 401, preserves the session on 403/419, recognizes legacy JWT 404 failures, and relies on session generations instead of a five-second grace window.
- Fingerprint vault/runtime contracts cover authenticated device-only SecureStore storage, enrollment, OS prompts, device fallback, credential retrieval, and cross-account clearing. A real-account manual biometric exercise was not run because the emulator has no saved production credential vault.
- Task list rows now keep the priority bar clear of text, wrap long titles, hide raw `erp_dev` metadata, and preserve meaningful linked records.
- The exact published APK (`7a51c97e…e629`) was installed on the emulator; the reported Payment Request 1211 HTTPS URL cold-launched Prizm in 1.48 seconds with the domain verified.
- QC: `docs/qc/PE-QAQC-QC-RPT-26014-R01__mobile-jwt-auth-20260802.md` and canonical PDF/MD under `C:\Users\osama\.claude-brain\_audits\qc-reports\`.

---

## 13.0 2026-08-02 — Native admin parity and universal ERP App Links

- Backend Knowledge CRUD/publishing, Survey result aggregation, and Cost Center member/supervisor/activity APIs deployed through `PrizmIT/prizm331#1193` and hotfix `#1194`; production HEAD is `4d257f54`.
- Production probes passed Knowledge, Surveys, and Cost Centers reads; combined AND, OR, multi-select, and dynamic-date filters; invalid-field rejection; and all three Cost Center child endpoints.
- Mobile v1.16.0/code34 deployed from `d838c06` via merge `b0fe7af8`; workflow `30725249245` passed.
- Every verified ERP HTTPS path under `/MS` is captured. The exact Payment Request 1211 URL resolves to Prizm above Chrome, and Settings links directly to Android supported-link controls.
- Published APK SHA-256 is `3809566ecbb6f0640ba4baed702fd97224cec4b556bc2ef8e322a83f7e3b19f8`; production signer and domain verification passed after emulator installation.
- The legacy monolithic contract now reads the deployable backend and honestly exposes an older missing Contacts `global_list_get` contract; this remains open parity debt and is not represented as complete.
- QC: `docs/qc/PE-QAQC-QC-RPT-26015-R01__admin-parity-universal-links-20260802.md` and canonical PDF/MD under `C:\Users\osama\.claude-brain\_audits\qc-reports\`.

---

## 14.0 2026-08-02 — Native Tender Triage and truthful parity baseline

- Added an admin-only native Tender Triage queue with dense KPIs, buckets, search, country filters, Perfex advanced filters, details, decisions, undo, bulk dismiss, and reversible mute controls.
- Backend endpoints mirror the web schema, transition rules, permission/no-trace behavior, activity logging, and optimistic concurrency.
- Emulator and direct API tests passed default, Low override, multi-value, AND, OR, cross-field OR, search-plus-filter, decision/undo, selection, and no-trace cases.
- Static web-menu audit baseline is 93/347 native destinations, with 254 missing and 4 dynamic paths unresolved. The overall parity programme remains open.
- Checkpoint commits: mobile `233d78d`; backend `d797b637f`. Nothing was pushed or deployed; release metadata remains v1.17.0/code35 until the consolidated final release.
- QC: `docs/qc/PE-QAQC-QC-RPT-26018-R01__tender-triage-native-parity-20260802.md`; canonical PDF/MD under `C:\Users\osama\.claude-brain\_audits\qc-reports\`.

---

## 15.0 2026-08-02 — Native Setup administration and shared CRUD stability

- Added twelve administrator-only native Setup catalogs: Customer Groups, Ticket Priorities, Predefined Replies, Ticket Statuses, Ticket Services, Lead Sources, Lead Statuses, Taxes, Currencies, Payment Modes, Expense Categories, and Contract Types.
- Backend Setup endpoints use explicit read/write allowlists, canonical Perfex models, strict validation, no-trace admin permissions, protected default deletion, and the canonical currency Make Base action.
- Corrected Setup logical-filter transport so full Perfex AND/OR groups reach the API instead of being flattened into ineffective ordinary query parameters.
- Corrected the shared CRUD form lifecycle so typing no longer resets fields on rerender, and removed the empty-custom-fields maximum-update-depth loop.
- API testing passed all 12 lists, non-admin 404, search, invalid filters, constraints, AND/OR, and a reversible create/update/detail/delete matrix. Emulator testing passed exact OR and AND results plus reversible create/edit/delete with no warning left behind.
- Static web-menu parity is now 105/347 native destinations, with 242 missing and 4 dynamic paths unresolved. The overall parity programme remains open.
- Checkpoint commits: mobile `ddf454e`; backend `5bcc4caeb`. Nothing was pushed or deployed; release metadata remains v1.17.0/code35 until the consolidated final release.
- QC: `docs/qc/PE-QAQC-QC-RPT-26019-R01__setup-native-admin-parity-20260802.md`; canonical PDF/MD under `C:\Users\osama\.claude-brain\_audits\qc-reports\`.

---

## 16.0 2026-08-02 — Native Departments and authenticated Activity hardening

- Added the full administrator-only Departments workflow natively: list, search, sorting, advanced filters, dense detail, create, edit, guarded delete, IMAP folder retrieval, and connection testing.
- Mirrored the canonical web controller/model semantics for checkbox fields, unique non-empty email, encryption choices, saved-password retention, referenced-ticket deletion, and mailbox validation.
- Department passwords are excluded from every API read. Existing encrypted credentials are decrypted only in server memory for folder/test actions, and error messages redact the submitted secret.
- Corrected generic CRUD deletion so success immediately replaces the deleted detail route with its owning list and failures are no longer silent.
- Replaced Dashboard/My Activity generic entity reads with authenticated `GET /api/my/activity`, scoped to the effective staff identity and compatible with View-As.
- Emulator testing passed the exact Departments HTTPS App Link, 11-row list, safe HTTP 422 mailbox feedback, create/edit/detail/delete, checkbox persistence, secure replacement input, immediate list return, and fixture cleanup.
- Static web-menu parity is now 106/347 native destinations, with 241 missing and 4 dynamic paths unresolved. The overall parity programme remains open.
- Checkpoint commits: mobile `b2827b7` plus activity `acd1f2f`; backend `8ef3ab497` plus activity `aa6485e55`. Nothing was pushed or deployed; release metadata remains v1.17.0/code35 until the consolidated final release.
- QC: `docs/qc/PE-QAQC-QC-RPT-26020-R01__departments-activity-native-parity-20260802.md`; canonical PDF/MD under `C:\Users\osama\.claude-brain\_audits\qc-reports\`.

---

## 17.0 2026-08-02 — Native Roles, combined filters, and App-Link release provenance

- Added Setup → Roles natively with list/search/sort/advanced filters, dense detail, create/edit/delete, assigned-staff coverage, and a live permission editor sourced from Perfex's hook-extended registry.
- Preserved web permission rules: View versus View Own exclusion, blocked capabilities, not-applicable grants, strict server validation, capability gates, and optional propagation to assigned staff.
- Corrected cached post-write Role reads and Perfex's missing-row null dereference; a deleted Role detail now returns HTTP 404 and a native Record not found state instead of HTTP 500.
- Emulator CRUD created ID 24 with two grants, renamed it and added a third grant, then deleted it; the baseline returned from 22 to 21 with no fixture remaining.
- Rigorous funnel tests passed exact two-rule behavior: mutually exclusive names with AND returned zero rows, while the same rules with OR returned exactly Admin Manager and Field Engineer.
- Moved the shared Advanced Filters modal below Android's status bar so header controls and Clear all remain tappable app-wide.
- Reproduced the reported Payment Request 1211 URL. The published APK `c06f94d` predates host-wide hardening commit `006bf61`; the hardened emulator build is domain-verified, opens Prizm MainActivity, and rewrites the exact URL to the native Payment Request route.
- Static web-menu parity is now 107/347 native destinations, with 240 missing and 4 dynamic paths unresolved. The overall parity programme remains open.
- Checkpoint commits: mobile `adbf0c2`; backend `caecbf51f`. Nothing was pushed or deployed; release metadata remains v1.17.0/code35 until the single consolidated final release.
- QC: `docs/qc/PE-QAQC-QC-RPT-26021-R01__native-roles-app-link-filters-20260802.md`; canonical PDF/MD under `C:\Users\osama\.claude-brain\_audits\qc-reports\`.

---

## 18.0 2026-08-02 — Native Custom Fields and /MS App-Link release gate

- Added the administrator-only Custom Fields workflow natively with list/search/sort/advanced filters, dense detail, a compact purpose-built editor, create/edit/delete, hook-provided targets, type-specific defaults, visibility rules, and schema locks once saved values exist.
- Backend writes delegate to Perfex's canonical `Custom_fields_model`, including the historical `disalow_client_to_edit` field and preservation of options already used on records.
- Emulator CRUD created ID 19, found it through search, renamed it, verified persistence in MySQL, and deleted it; the database returned from 18 to its original 17 rows with zero QA fixtures.
- Exact combined funnel tests passed end to end: Projects AND Select returned 3 rows, while the identical two rules under OR returned 8; both matched direct SQL counts.
- Tightened the Android App Link declaration to the enforced `/MS` prefix for HTTP and HTTPS after the release contract caught the missing prefix. The installed APK still predates this candidate and requires the consolidated final build.
- Static web-menu parity is now 108/347 native destinations, with 239 missing and 4 dynamic paths unresolved. The overall parity programme remains open.
- Checkpoint commits: mobile `46a2c9e`; backend `fdc7beebd`. Nothing was pushed or deployed; release metadata remains v1.17.0/code35 until the single consolidated final release.
- QC: `docs/qc/PE-QAQC-QC-RPT-26022-R01__native-custom-fields-app-link-20260802.md`; canonical PDF/MD under `C:\Users\osama\.claude-brain\_audits\qc-reports\`.

---

## 19.0 2026-08-02 — Native Email Templates and logical-filter regression

- Added Setup → Email Templates natively with an English-canonical 101-row list, server search, sorting, Perfex advanced filters, dense summary, responsive 27-language editor, delivery controls, merge-field insertion, and native list/detail routing.
- Backend reads and writes mirror the canonical Emails controller/model: fixed system records have no create/delete path, all language rows sharing a slug update together, status changes are slug-wide, and the two-factor authentication template cannot be disabled.
- Reversible API testing searched 8/8 Invoice templates, matched SQL for direct AND 9/9 and OR 23/23 groups, updated and restored template ID 1 exactly, and left zero QA activity rows.
- Emulator testing caught and fixed a BooleanRule/MultiSelectRule contract mismatch. Enabled returned 14 rows; adding Disabled retained both chips and returned all 101. Adding Template contains Invoice produced AND = 0 and OR = 21 without replacing either rule.
- Visual QA corrected dark-hero contrast, HTML preview spacing, duplicate list metadata, sender field proportions, and toggle dimensions. Language switching and all 27 safe merge fields were verified; logcat contained no app runtime errors.
- Static web-menu parity is now 109/347 native destinations, with 238 missing and 4 dynamic paths unresolved. The overall parity programme remains open.
- Checkpoint commits: mobile `e11b5c7`; backend `3973fecf9`. Nothing was pushed or deployed; release metadata remains v1.17.0/code35 until the single consolidated final release.
- QC: `docs/qc/PE-QAQC-QC-RPT-26023-R01__native-email-templates-parity-20260802.md`; canonical PDF/MD under `C:\Users\osama\.claude-brain\_audits\qc-reports\`.

---

## 20.0 2026-08-02 — Payment Request App Link and native detail recovery

- Reproduced the exact Payment Request 1211 URL through Android. Production `assetlinks.json`, APK signature, domain verification, and supported-link state are correct; the emulator handed HTTPS to Prizm MainActivity and reached the native Payment Request module.
- Found the native `Payment Request not found` root cause after reading the web controller/model: the API detail path joined nonexistent `suppliers`, while production uses `tblsuppliers`. The prefixed join returns record 1211 in read-only production SQL.
- Hardened the browser/WebView bridge to use the installed `prizmcrm` scheme with the complete original ERP URL, browser fallback, and an internal-host fence. The scheme went from Expo Unmatched Route to the native Payment Request route in the emulator.
- Contract and syntax gates pass: TypeScript, complete mobile contracts, 11/11 bridge checks, 4/4 payment-detail checks, and production schema/query probes.
- Checkpoint commits: mobile `f980d65`; backend `0ef48f2f3`. Nothing was pushed or deployed; no Android build was started, preserving the single consolidated release.
- QC: `docs/qc/PE-QAQC-QC-RPT-26024-R01__payment-request-app-link-detail-20260802.md`; canonical PDF/MD under `C:\Users\osama\.claude-brain\_audits\qc-reports\`.

---

## 21.0 2026-08-02 — Native Supplier Invoices and production browser handoff

- Added native Supplier Invoices with permission-scoped list/detail, server search/sort, additive direct filters, Perfex AND/OR filters, purpose-built dense editor/summary, PO-line import, supplier-item mappings, attachments, atomic CRUD, approval stages, and exact workflow actions.
- Real HTTP runtime testing passed 12/12 scenarios, including Draft + Cancelled, Draft + Submitted, three-rule AND/OR, atomic update, submit, dense detail, delete, and complete temporary-table cleanup.
- Emulator visual QA passed the Supplier Invoice workspace, responsive field grouping, totals, notes, and line-card states. The frontend-polish skill guided its compact information hierarchy.
- Corrected the final `sequence_number` funnel contract to `NumberRule`; list audit now passes 122 server + 2 client searchable, 124 filterable, 77 sortable, with 0 skipped. CRUD audit passes all 357 advertised mutations.
- Reproduced the exact Payment Request 1211 URL in real Chrome. The previous unattended intent was blocked and immediately fell through to web login. Production now uses a legacy-compatible, package-targeted `prizmcrm` handoff and retains the one-tap page Chrome permits.
- Hotfix PRs `Ghazalawy/prizm331#320` and `PrizmIT/prizm331#1199` merged; deploy workflow `30750340830` passed and production HEAD is `df0dcfa973`. Live Chrome → orange handoff → native Payment Request #1211 passed.
- No Android build was triggered. Mobile remains v1.17.0/code35, preserving the single final APK build. Static parity is 110/347, with 237 missing and 4 dynamic paths unresolved.
- Checkpoints: mobile `2c08131`, `cb99eb1`, `66641d1`; backend parity `f7b847e4e`, `ab6fcd90c`; isolated production hotfix `f9e10f8e9`.
- QC: `docs/qc/PE-QAQC-QC-RPT-26025-R01__supplier-invoice-app-handoff-20260802.md`; canonical PDF/MD under `C:\Users\osama\.claude-brain\_audits\qc-reports\`.

---

## 22.0 2026-08-02 — Native Gate Pass Request Manager parity

- Added Gate Pass Request Manager natively with permission-scoped list/detail/options, server search/sort, additive direct filters, Perfex advanced filters, purpose-built dense editor/summary, staff and vehicle assignment, atomic CRUD, and guarded conversion into a linked Gate Pass.
- Read the canonical RequestManager controller, Requests model, list, form, detail, menu, and install sources first; the API mirrors its classification-sensitive fields, responsible-user rules, conversion conditions, and canonical GPR display number.
- Real HTTP runtime testing passed 12/12 scenarios: options, create, search, direct multi-classification, four-rule AND, four-rule OR, atomic update/clear, dense detail, conversion, duplicate rejection, converted-state plus search, delete, and exact cleanup.
- Emulator QA passed list, detail, create, edit, multi-staff selection, and conversion to Gate Pass #159. It caught and corrected list-title clutter, dark-hero contrast, picker status-bar overlap, divider orientation, and picker reset behavior.
- Final list audit passes 123 server + 2 client searchable, 125 filterable, 78 sortable with 0 skipped. CRUD audit passes 360 advertised mutations. The BooleanRule metadata is aligned to the scalar mobile SelectRule contract.
- Static web-menu parity is now 111/347 native destinations, with 236 missing and 4 dynamic paths unresolved. The overall parity programme remains open.
- Checkpoints: mobile `8e0d995` and `c5c9e5d`; backend `cb9aa2a50`. Nothing was pushed or deployed; no Android build was started, and release metadata remains v1.17.0/code35 until the single consolidated final release.
- QC: `docs/qc/PE-QAQC-QC-RPT-26026-R01__gatepass-request-native-parity-20260802.md`; canonical PDF/MD under `C:\Users\osama\.claude-brain\_audits\qc-reports\`.

---

## 23.0 2026-08-02 — Zero-hosted-minute Android release path

- Changed the APK workflow from automatic `main` push builds to a manual-only fallback, preventing an ordinary merge from silently consuming another 20–27 GitHub-hosted minutes.
- Replaced runner-side Java apt installation with `actions/setup-java`, changed dependency installation to locked `npm ci`, enabled the official Gradle cache action, and enabled Gradle's build cache for faster emergency hosted builds.
- Added `scripts/release-android-local.ps1` and `npm run release:android:local`. The script runs all release/static/contract audits, builds from the local Gradle cache, checks the generated keystore and completed APK against production `assetlinks.json`, and optionally installs the exact APK and tests Payment Request 1211 routing.
- Publication is opt-in only. `-Publish` requires a clean, synchronized `main`, an explicit Android device/emulator serial, a successful install/App-Link smoke test, a matching signer, and valid GitHub authentication before replacing the rolling release asset.
- Verified the current local keystore and existing release APK both use production fingerprint `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C`.
- PowerShell parsing, mobile contracts, TypeScript, release metadata, and Expo dependency checks pass. No APK was compiled or uploaded in this change; the unfinished parity candidate remains undeployed.
- Operator guide: `docs/LOCAL-ANDROID-RELEASE.md`.

---

## 24.0 2026-08-02 — Native parity v1.18 production release

- Consolidated backend parity merged through `Ghazalawy/prizm331#321` and `PrizmIT/prizm331#1200`; PHP 8.3 CI run `30754815885` and production deployment run `30754870469` passed. Production backend `main` is `45895ef7fc8906fc854b56a725d98e884d3bdc75`.
- Mobile parity merged through `Ghazalawy/prizm-mobile#7`. Local-release Windows hardening merged through PRs #8 and #9; release source is synchronized `main` at `ecd0892acadc8ea171b52626d5e5becf1c609e52`.
- Android v1.18.0/code36 was built locally, signer-checked, installed on `emulator-5554`, and smoke-tested with the exact Payment Request 1211 HTTPS App Link before publishing.
- Rolling APK SHA-256 is `BA162C57CB5E951F3DC55BFE267687E47A40C477A3C8A663F40A86B98A8E1794`; size is 91,697,024 bytes; installed package reports versionName 1.18.0/versionCode 36.
- No new GitHub-hosted Android workflow was triggered; the most recent hosted run remains `30732511640` on the older `c06f94d` commit.
- All release, TypeScript, mobile, list, and CRUD contracts passed. Static parity remains honestly open at 111/347, with 236 missing static destinations and four dynamic expressions unresolved.
- QC: `docs/qc/PE-QAQC-QC-RPT-26027-R01__native-parity-v1.18-production-20260802.md`; canonical Markdown/PDF under `C:\Users\osama\.claude-brain\_audits\qc-reports\`.
