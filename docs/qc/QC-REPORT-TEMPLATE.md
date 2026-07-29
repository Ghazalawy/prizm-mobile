# QC Report — Customer Status Filter Hotfix

## Report Header

| Field | Value |
|---|---|
| Report Code | `PE-QAQC-QC-RPT-26008-R01` |
| Session ID | `customer-filter-emulator-20260730` |
| Date / Time | `2026-07-30 01:08:21 +04:00` |
| Agent / Model | `Codex / GPT-5` |
| Workspace | `C:\wamp64\www\prizm-mobile` |
| Branch | `codex/fix-customer-filter` |
| Duration / Turns | `~1h 05m / 1 active user turn` |
| Classification | Internal |

## 1. Executive Summary

Customer status filters were recorded in the funnel UI but ignored by the customer API. The mobile list sent Perfex web-table JSON in a `filters` parameter, while `Customers.php::data_get()` accepts direct query parameters and defaults to `active=1` when no direct `active` parameter exists. The corrected app sends `active=0` for Inactive, `active=1` for Active, and `include_inactive=1` when both statuses are selected.

The reported flow was exercised in an Android emulator against production read-only data. Both the quick Inactive chip and Funnel → Inactive → Apply returned `17 total`; every visible customer row was Inactive and no visible row was Active.

## 2. Scope

| Area | Change |
|---|---|
| Filter transport | Added direct REST query serialization for mobile list controllers |
| Customer status | Preserved the string value `0` and mapped all-status selection to `include_inactive=1` |
| Customer operators | Limited the UI to operators actually implemented by `Customers.php` |
| Regression coverage | Added assertions for Inactive and all-status query parameters |
| Release | Prepared patch `1.14.1`, Android versionCode `27` |

Out of scope: backend mutation, database/schema changes, and unrelated mobile pages.

## 3. Root Cause Evidence

| Request | Production result | Interpretation |
|---|---:|---|
| `customers?filters={...active 0...}&limit=20` | HTTP 200, total 168, returned rows all Active | Broken release payload was ignored; API applied its active-only default |
| `customers?active=0&limit=20` | HTTP 200, total 17, returned rows all Inactive | Direct parameter is the supported API contract |

Ground truth: `C:\wamp64\www\prizm331\modules\api\controllers\Customers.php` reads direct `active`, `country`, text, date, search, pagination, and sort parameters. It does not parse the Perfex web-table `filters` payload.

## 4. Test Results

| # | Check | Evidence | Result |
|---|---|---|---|
| 1 | Android native debug build | Gradle `app:assembleDebug`, x86_64 | PASS |
| 2 | Quick Inactive chip | 17 total; 8 visible Inactive rows; 0 visible Active rows | PASS |
| 3 | Funnel → Inactive → Apply | 17 total; badge 1; 8 visible Inactive rows; 0 visible Active rows | PASS |
| 4 | Direct production read | HTTP 200; 17 total; 0 non-Inactive rows | PASS |
| 5 | TypeScript | `npx tsc --noEmit -p tsconfig.json` | PASS |
| 6 | Expo SDK alignment | `npx expo install --check` | PASS |
| 7 | Release metadata | `npm run verify:release` — 1.14.1 / Android 27 | PASS |
| 8 | Mobile regression contracts | `npm run test:contracts` | PASS |
| 9 | CRUD contract audit | 303 mutations; 0 skipped | PASS |
| 10 | List contract audit | 107 searchable; 107 filterable; 59 sortable; 0 skipped | PASS |
| 11 | Patch integrity and secret review | `git diff --check`; scoped diff reviewed | PASS |

### Acceptance Criteria

| Severity | Criterion | Result |
|---|---|---|
| S1 | Selecting Inactive never returns an Active customer row | 100% PASS |
| S1 | Filter value `0` survives serialization and query construction | 100% PASS |
| S2 | Funnel and quick-chip paths produce the same filtered list | 100% PASS |
| S2 | Selecting all statuses lifts the API's active-only default | 100% PASS |
| S3 | Existing contracts, TypeScript, Expo alignment, and release metadata remain green | 100% PASS |

**QC gate before push: PASS. No open Blocker, Major, or Minor defects in scope.**

## 5. Code Changes

| File | Purpose |
|---|---|
| `lib/filters.ts` | Direct mobile REST filter serializer with explicit all-status behavior |
| `components/crud/CrudListScreen.tsx` | Use module-aware direct query parameters |
| `lib/module-registry.ts` | Declare customer-supported operators and all-status parameter |
| `scripts/test-mobile-contracts.mjs` | Regression tests for `active=0` and `include_inactive=1` |
| `CHANGELOG.json`, `package.json`, `package-lock.json`, `app.json` | Patch release metadata |

## 6. Git and Deployment

| Item | Status |
|---|---|
| Base commit | `a1d102f03efd8ecace359b94c3e94daa01154662` |
| Hotfix commit | Pending |
| GitHub push | Pending QC-gated push |
| GitHub Actions Android build | Pending |
| Rolling APK release | Pending |
| Rollback | Revert the hotfix commit; no data migration or persisted data change |

## 7. Sign-off

| Role | Name | Status | Date |
|---|---|---|---|
| QA automation | Codex | Local and emulator gate PASS | 2026-07-30 |
| Product reviewer | Osama Hassan | Fix and emulator testing requested | 2026-07-30 |

Generated under Prizm QA/QC Policy. Classification: Internal.
