# QC Report — Native Roles, Combined Filters, and App-Link Verification

## Report Header

| Field | Value |
|---|---|
| Report Code | `PE-QAQC-QC-RPT-26021-R01` |
| Session ID | `native-roles-app-link-filters-20260802` |
| Date / Time | `2026-08-02 13:40 +04:00` |
| Agent / Model | `Codex / GPT-5` |
| Backend workspace | `C:\wamp64\www\prizm331-wt-mobile-parity-next` |
| Mobile workspace | `C:\wamp64\www\prizm-mobile-app-link-fix` |
| Backend branch | `feat/mobile-native-parity-next-DESKTOP-9GO5QC0` |
| Mobile branch | `codex/full-native-parity-audit` |
| Turns | Continuous parity task chain |
| Classification | Internal |

## 1. Executive Summary

This scoped batch adds Setup → Roles as a fully native administrative workflow after reading Perfex's canonical Roles controller, model, views, helper, and live permission registry. The mobile module now provides list, search, sorting, Perfex advanced filters, dense detail, create, edit, guarded delete, assigned-staff coverage, and a live permission-matrix editor.

The permission editor preserves the web rules: View and View Own are mutually exclusive; hook-defined blocked capabilities cannot coexist; not-applicable capabilities remain disabled; unknown features/capabilities are rejected; and an administrator may explicitly propagate changed role permissions to staff assigned to the role. The API delegates writes to `Roles_model`, enforces the canonical `roles` capability for each action, and returns no-trace 404 responses to callers without access.

Emulator CRUD testing created one reversible role fixture, changed its grants, and removed it. The test exposed two regressions that were corrected before sign-off: Perfex's cached `Roles_model::get()` could return a pre-edit object within the write request, and requesting a missing role could dereference a null model row and produce HTTP 500. Write responses now read through the database, and missing/deleted records reliably return HTTP 404.

The rigorous funnel test used two custom logical rules against live Role data. AND returned no rows for mutually exclusive exact names; changing only the match type to OR returned exactly the two expected roles. The shared Advanced Filters screen was also moved into the Android top safe area after visual testing showed its header and Clear all action underneath the status bar.

The reported Payment Request App Link was reproduced with the exact URL. The published rolling APK (`c06f94d`) predates the committed host-wide Android handoff hardening (`006bf61`), explaining the phone fallback to the browser. On the hardened emulator build, Android verified `ms.prizm-energy.com`, resolved the exact URL to `com.prizmenergy.mobile/.MainActivity`, and routed record 1211 to the native Payment Request screen. The production `assetlinks.json` certificate fingerprint matches the installed application. Publishing remains held for the requested single consolidated Android build.

The scoped quality gate passes. Static web-menu parity is now 107/347, leaving 240 static destinations and 4 dynamic destinations open.

## 2. Test Results

| Check | Evidence | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit -p tsconfig.json` | PASS |
| Mobile contracts | `npm run test:contracts` against current backend worktree | PASS |
| Release metadata safety | `npm run verify:release` | PASS — unchanged v1.17.0/code35 |
| Web-menu parity audit | `npm run audit:web-parity` | PASS — 107/347 covered; 240 missing; 4 dynamic |
| Backend syntax | PHP 8.3.14 lint: controller, routes, contract test | PASS |
| Roles backend contract | `roles_api_contract_test.php` | PASS |
| Diff hygiene | `git diff --check` in both worktrees | PASS |
| Roles list | Authenticated administrator list | HTTP 200; 21 baseline roles |
| Roles App Link | `/MS/admin/roles` into native module | PASS |
| Role detail App Link | `/MS/admin/roles/role/24` into native record | PASS |
| Permission schema | `GET /api/roles_api/permissions` | HTTP 200; live hook-extended registry |
| Role create | Numeric fixture `260901` with View Global + Create | HTTP 201; list 21 → 22 |
| Role detail | Fixture ID 24 | HTTP 200; two grants summarized |
| Role update | Rename `260902`, add Edit grant | HTTP 200; three grants returned and persisted |
| Role delete | Fixture ID 24 | HTTP 200; list 22 → 21 |
| Post-delete detail | `GET /api/roles_api/24` | HTTP 404; native Record not found state |
| Combined AND filter | Admin Manager equals AND Field Engineer equals | HTTP 200; zero rows; correct empty state |
| Combined OR filter | Same two exact rules, match type OR | HTTP 200; exactly two expected rows |
| Filter safe area | Reloaded emulator screenshot + UI bounds | PASS — header shifted below 128 px status inset |
| Payment Request Android resolution | Exact URL ending `/view_payment_request/1211` | PASS — app MainActivity selected |
| Payment Request native rewrite | Exact URL to `/(tabs)/approvals/payment_request/1211` | PASS |
| Website association | Live `/.well-known/assetlinks.json` | HTTP 200; matching SHA-256 fingerprint |
| Published APK provenance | Rolling release SHA `c06f94d` vs hardening `006bf61` | Confirmed published APK predates fix |

## 3. Acceptance Criteria

| Severity | Criterion | Result |
|---|---|---|
| S1 | Role permissions mirror the live Perfex registry and conflict rules | 100% PASS |
| S1 | Role writes honor capability gates and canonical model behavior | 100% PASS |
| S1 | Missing/deleted roles return 404, never 500 | 100% PASS |
| S1 | CRUD testing is reversible and leaves no QA role fixture | 100% PASS |
| S2 | Multi-rule AND/OR filters update the live result set correctly | 100% PASS |
| S2 | Advanced Filters controls are reachable below Android system UI | 100% PASS |
| S2 | Exact Payment Request URL is claimed and mapped by hardened build | 100% PASS |
| S2 | Web Role list/detail links resolve to native screens | 100% PASS |
| Programme | Every static web destination has a native equivalent | OPEN — 107/347 (30.8%) covered |

**Scoped quality gate: PASS. Deployment gate: HELD for one consolidated final build. Overall native-web parity programme: OPEN.**

## 4. Code, Git, and Deployment

| Item | Evidence |
|---|---|
| Backend Roles implementation | `caecbf51f` |
| Mobile Roles/filter/link implementation | `adbf0c2` |
| Existing host-wide App Link hardening | `006bf61` — committed after current published APK |
| Current published rolling APK | `c06f94d`; release asset digest `ef4c4b88…` |
| Release metadata | Deliberately unchanged until the consolidated final release |
| Push / PR / deploy | Not performed in this batch |
| Production data | Not touched |
| Local QA fixture | Role ID 24 deleted; baseline restored to 21 roles |
| User files | Untracked `artifacts/` preserved |
| Rollback | Revert the scoped mobile/backend commits before any future merge |

## 5. Emulator and HTTP Evidence

- Emulator: `emulator-5554`, Android development build.
- Role list/detail/form evidence: `artifacts/roles-list-current.png`, `artifacts/role-detail.xml`, `artifacts/role-edit-expanded.xml`, `artifacts/role-updated.xml`.
- CRUD completion: `artifacts/roles-after-delete.xml` shows 21 total and no fixture.
- Logical filter evidence: `artifacts/roles-and-result.xml` shows no-result AND behavior; `artifacts/roles-or-result.xml` shows two total and both expected roles.
- Safe-area evidence: `artifacts/filter-safe-area-final.png` and XML place header controls at y=156..221 rather than y=28..93 under the status bar.
- App-link evidence: Android package query listed Prizm CRM and Chrome; domain state was verified; intent launch selected `com.prizmenergy.mobile/.MainActivity`.
- Exact Payment Request native evidence: `artifacts/payment-link.xml` was owned by the Prizm package and displayed the native Payment Request state for ID 1211 against the local test backend.
- Apache evidence recorded HTTP 200/201 for Role reads/writes, HTTP 200 for both combined-filter queries, and corrected HTTP 404 after deletion.
- The temporary WAMP worktree URL override was removed before commit; `lib/environment.ts` matches the branch baseline.

## 6. Sign-off

| Role | Name | Status | Date |
|---|---|---|---|
| QA automation | Codex | Scoped PASS; deployment held; parity programme open | 2026-08-02 |
| Product reviewer | Osama Hassan | Final acceptance pending consolidated release | Pending |

Generated under Prizm QA/QC Policy. Classification: Internal.
