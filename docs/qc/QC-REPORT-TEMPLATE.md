# QC Report — Full Native Parity Checkpoint

## Report Header

| Field | Value |
|---|---|
| Report Code | `PE-QAQC-QC-RPT-26007-R01` |
| Session ID | `full-native-parity-DESKTOP-9GO5QC0-20260729` |
| Date / Time | `2026-07-29 19:41:36 +04:00` |
| Agent / Model | `Codex / GPT-5` |
| Workspace | `C:\wamp64\www\prizm-mobile` |
| Branch | `codex/feat/full-native-parity-DESKTOP-9GO5QC0` |
| Classification | Internal |

## 1. Executive Summary

The mobile parity release is deployed for all features that can be implemented safely against the existing backend contracts. The work repaired session handling, biometric re-sign-in, search and filter behavior, native routing, missing screens, relation fields, permissions, and related-record workflows. Automated contract checks cover 131 registered resources, 43 action modules, 107 filterable lists, 107 searchable lists, 59 sortable lists, and 303 advertised mutations with zero skipped validations. Release `1.14.0` was built once by GitHub Actions and published as the rolling Android APK. No production API mutation was performed.

Six web features remain intentionally unavailable because the existing APIs do not safely mirror the web application’s validation or permission rules. Shipping guessed mobile behavior for those pages would create data-integrity or authorization risk.

## 2. Scope

| Area | Work completed |
|---|---|
| Authentication | 401-only sign-out, generation-safe session clearing, CSRF/403 handling, biometric credential vault and re-sign-in |
| Search and filters | Correct query keys, server/client search declarations, required-search support, filter and sort capability checks |
| Native pages | Custom Statuses, Advance Leads, Prizm Documents, DEWA Contacts, Resource Kits, Calculation Sheets, Material Categories, UNSPSC, Survey Send History, Timesheet History, leave approval, calendar edit |
| Related workflows | Inline child create/edit/delete, route-record edit mode, relation pickers, Technical Inquiry items, Budget specifications, UNSPSC specifications |
| Routing | Internal ERP links resolve to native screens or the native ERP hub |
| Validation | TypeScript, Expo alignment, release metadata, list contracts, mutation contracts, mobile regressions, Android production export |

## 3. Test Results

No production API mutation was performed. API compatibility was verified against the mobile registry and the read-only backend controller/web source contracts; deployment used the repository's GitHub Actions release workflow only.

| # | Check | Command / Evidence | Result |
|---|---|---|---|
| 1 | TypeScript | `npx tsc --noEmit -p tsconfig.json` | PASS (exit 0) |
| 2 | Expo SDK alignment | `npx expo install --check` | PASS |
| 3 | Release metadata consistency | `npm run verify:release` | PASS (`1.14.0`, Android `26`) |
| 4 | List/search/filter/sort contracts | `npm run test:list-contracts` | PASS: 105 server-searchable + 2 client-searchable; 107 filterable; 59 sortable; 0 skipped |
| 5 | Mutation contracts | `npm run test:crud-contracts` | PASS: 303 advertised mutations; 0 skipped |
| 6 | Mobile regression contracts | `npm run test:contracts` | PASS |
| 7 | Patch integrity | `git diff --check` | PASS |
| 8 | Android production export | Expo local Android export | PASS: 1,942 modules; 6.36 MB Hermes bundle |
| 9 | Dependency security review | `npm audit --omit=dev --json` | REVIEWED: inherited Expo/React Native toolchain advisories remain; no forced incompatible upgrade applied |
| 10 | Production Android workflow | GitHub Actions run `30464401286` | PASS: Gradle `BUILD SUCCESSFUL`; APK and Pages published |

### Acceptance Criteria

| Severity | Passed | Total | Result |
|---|---:|---:|---|
| S1 — authentication, authorization, session integrity | 8 | 8 | 100% PASS |
| S2 — API, mutation, search and filter contracts | 6 | 6 | 100% PASS |
| S3 — navigation, native UI and Android export | 5 | 5 | 100% PASS |
| S4 — documentation and known-risk disclosure | 4 | 4 | PASS |

**Overall checkpoint result: PASS WITH DOCUMENTED BACKEND BLOCKERS**

## 4. Defects Fixed

| Severity | Defect | Resolution |
|---|---|---|
| S1 | Authenticated HTTP 403/CSRF responses could be treated as expired sessions | Only HTTP 401 can trigger authentication clearing |
| S1 | An older request could clear a newly established session | Added session-generation protection |
| S2 | Biometric unlock did not provide dependable re-sign-in | Added secure credential vault and biometric reauthentication flow |
| S2 | Some search, filter and sort controls sent ignored or incorrect parameters | Corrected per-module contracts; removed unsupported controls |
| S2 | Related lists used malformed pagination/query separators | Centralized safe entity-list querying |
| S2 | Several native routes and detail/edit workflows were missing | Added native screens and route mappings |
| S2 | Cost Center and Technical Inquiry children used incorrect permissions/contracts | Corrected permission features and child definitions |
| S3 | Some records displayed internal IDs instead of canonical labels/numbers | Added relation display and canonical field mappings |

## 5. Intentionally Blocked Features

| Web feature | Reason not shipped |
|---|---|
| Task Templates / Task Manage | API writes tables directly, bypasses the web model/permission behavior, and searches nonexistent field names |
| Product Families | API does not mirror tree validation, linked-item protection, propagation, or unlink confirmation |
| Client Items | API does not expose the web composition-review workflow |
| Cost Center child allocation APIs | Existing child contracts are incomplete/unsafe |
| Survey Results | No safe API equivalent of the web results workflow |
| Knowledge article CRUD | Existing API calls nonexistent backend methods; publish/unpublish remains available |

These require backend changes in `prizm331`; the current execution boundary permits read-only inspection of that repository.

## 6. Code Changes

| Group | Representative files |
|---|---|
| Authentication | `lib/api.ts`, `lib/auth-context.tsx`, `lib/auth.ts`, `lib/biometric.ts`, `lib/auth-response.ts`, `app/login.tsx` |
| Registry and contracts | `lib/module-registry.ts`, `lib/native-routing.ts`, `lib/filters.ts`, `lib/filter-configs/*` |
| Native CRUD | `components/crud/*`, including `FieldInput.tsx` and `SignatureInput.tsx` |
| Feature screens | Approvals, Calendar, Tasks, Tenders, Timesheets, Knowledge, Reports, Opportunities |
| Verification | `scripts/audit-list-contracts.mjs`, `scripts/audit-crud-contracts.mjs`, `scripts/test-mobile-contracts.mjs` |
| Documentation | `docs/MODULE_AUDIT.md`, this QC report, `SESSION-HANDOFF.md` |

## 7. Git and Deployment

| Item | Status |
|---|---|
| Mobile commit | `f7cdb5b8d63d7126ed8108b2bd9071158df821a7` |
| Backend commit | None |
| GitHub push / PR | Fast-forward push to `origin/main`; remote verified at `f7cdb5b` |
| GitHub Actions build | PASS — run `30464401286` |
| Production deployment | PASS — rolling `latest` release and GitHub Pages published |
| Release metadata bump | Complete: `1.14.0`, Android versionCode `26` |

## 8. Deliverables

| Deliverable | Status |
|---|---|
| Native mobile implementation | Complete for safe existing contracts |
| Module/parity audit | Complete |
| Automated verification scripts | Complete |
| Local Android export check | Complete |
| QC Markdown / HTML / PDF | Complete locally in the mobile workspace |
| Canonical audit-store copy and index | Complete |
| Final APK/release/deployment | PASS — `prizm-mobile.apk`, 91,536,512 bytes |

## 9. Sign-off

| Role | Name | Status | Date |
|---|---|---|---|
| QA automation | Codex | Completed | 2026-07-29 |
| Product reviewer | Osama Hassan | Deployment authorized | 2026-07-29 |

Generated under Prizm QA/QC Policy. Classification: Internal.
