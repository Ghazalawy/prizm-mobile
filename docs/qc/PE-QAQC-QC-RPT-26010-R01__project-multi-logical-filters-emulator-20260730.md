# QC Report — Project Multi-Status and Logical Filters

## Report Header

| Field | Value |
|---|---|
| Report Code | `PE-QAQC-QC-RPT-26010-R01` |
| Session ID | `project-multi-logical-filters-emulator-20260730` |
| Date / Time | `2026-07-30 10:03:16 +04:00` |
| Agent / Model | `Codex / GPT-5` |
| Workspace | `C:\wamp64\www\prizm-mobile` |
| Mobile branch | `codex/fix-multi-logical-filters` |
| Backend worktree | `C:\wamp64\www\.codex-worktrees\prizm331-multi-filters` |
| Classification | Internal |

## 1. Executive Summary

Project quick-status chips retained multiple selections in React state, but the request serializer flattened the array into a single direct query value such as `status=3,5`. The Projects REST controller treated that value as one exact status. The same direct transport also discarded the funnel's AND/OR grouping and unsupported operators.

The mobile Projects module now sends one Perfex-compatible logical `filters` payload. The production API validates allowed project fields and operators, preserves AND/OR groups, supports multi-value, negative, comparison, empty, and range rules, and applies the same contract to list and count queries. Legacy comma-separated status requests remain supported.

## 2. Root Cause and Fix

| Layer | Before | Corrected behavior |
|---|---|---|
| Quick chips | Selected values accumulated correctly | Unchanged |
| Mobile transport | Arrays became one comma string; match type was lost | Project rules serialize as one typed logical group |
| Projects API | Exact `where(status, "3,5")`; no logical payload support | `where_in` plus grouped AND/OR Query Builder clauses |
| Compatibility | Older builds could only request one project status | Direct `status=3,5` is interpreted as an IN list |

All API fields are allowlisted before Query Builder use. No database schema or data migration was required.

## 3. Production API Verification

All requests returned HTTP 200 with zero predicate violations.

| Case | Result |
|---|---|
| Status in On Hold + Cancelled | 5 rows; statuses 3 and 5 |
| Status 3/5 AND billing type 3 | 0 rows, valid empty intersection |
| Status 3/5 OR customer 132 | 6 rows; every row satisfied at least one branch |
| Status NOT IN 1/2 AND deadline in 2024–2026 | 17 rows; statuses 4 and 5 |
| Status = 3 OR status = 5 as repeated-field rules | 5 rows |
| Status = 3 AND status = 5 as repeated-field rules | 0 rows |
| Legacy direct `status=3,5` | 5 rows; statuses 3 and 5 |

## 4. Android Emulator Verification

Tests used live production data on `emulator-5554`.

| Sequence | Expected | Observed | Result |
|---|---:|---:|---|
| Unfiltered Projects | 127 | 127 | PASS |
| Tap On Hold | 4 On Hold | 4 On Hold | PASS |
| Add Cancelled | Combined set | 5 total: 4 On Hold + 1 Cancelled | PASS |
| Remove On Hold | Cancelled only | 1 Cancelled | PASS |
| Funnel: status 3/5 AND billing type = 1 | Intersection | 4 total | PASS |
| Same funnel with OR | Union | 124 total, including Finished rows from billing branch | PASS |
| Funnel: status 3/5 AND billing type != 1 | Negative intersection | 1 On Hold project | PASS |
| Published v1.14.3 APK: On Hold + Cancelled | Combined set | 5 total with both statuses | PASS |

## 5. Automated Quality Gates

| Check | Result |
|---|---|
| PHP 8.2 syntax, Projects API | PASS |
| Release metadata | PASS — v1.14.3, Android versionCode 29 |
| TypeScript | PASS |
| Expo dependency alignment | PASS |
| Mobile contract tests | PASS |
| CRUD contract audit | PASS — 303 mutations, 0 skipped |
| List contract audit | PASS — 107 filterable lists, 59 sortable, 0 skipped |
| Android export | PASS — 1 Hermes bundle, 44 assets |
| Backend production deploy | PASS — run 30515446675 |
| Android release workflow | PASS — run 30516966680 |
| Rolling APK integrity | PASS — 91,542,404 bytes; SHA-256 `54cb2eefe6c22bc233326f720d6340856102b7f9e840f5bb075afb27636dd206` |

### Acceptance Criteria

| Severity | Criterion | Result |
|---|---|---|
| S1 | A second project status expands the result set instead of replacing/ignoring the first | 100% PASS |
| S1 | Funnel AND and OR produce distinct correct sets | 100% PASS |
| S1 | The published APK reproduces the passing multi-status result | 100% PASS |
| S2 | Negative and repeated-field logical rules remain intact | 100% PASS |
| S2 | Older comma-separated status requests still work | 100% PASS |

**QC and deployment gates: PASS. No open Blocker, Major, or Minor defects in scope.**

## 6. Code, Git, and Deployment

| Item | Evidence |
|---|---|
| Backend fix commit | `85d8d759` |
| Integration PR | `Ghazalawy/prizm331#280` — merged |
| Production PR | `PrizmIT/prizm331#1132` — merged as `bb38c8b2` |
| Backend deploy | GitHub Actions run `30515446675` — success |
| Mobile fix/release commit | `3c232037f81dc59c5eec14ad0ad0e78e588c6560` |
| Mobile release | v1.14.3 / Android versionCode 29 |
| Android build/release | GitHub Actions run `30516966680` — success |
| Rolling APK | `latest/prizm-mobile.apk`; installed successfully on emulator |
| Rollback | Revert mobile and backend commits; no schema/data rollback |

## 7. Sign-off

| Role | Name | Status | Date |
|---|---|---|---|
| QA automation | Codex | API, emulator, release-binary, and deployment gates PASS | 2026-07-30 |
| Product reviewer | Osama Hassan | Reported the multi-status and logical-filter defect | 2026-07-30 |

Generated under Prizm QA/QC Policy. Classification: Internal.
