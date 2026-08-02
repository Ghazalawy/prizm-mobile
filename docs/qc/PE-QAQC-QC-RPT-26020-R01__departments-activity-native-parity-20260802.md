# QC Report — Native Departments and Authenticated Activity Hardening

## Report Header

| Field | Value |
|---|---|
| Report Code | `PE-QAQC-QC-RPT-26020-R01` |
| Session ID | `departments-activity-native-parity-20260802` |
| Date / Time | `2026-08-02 12:55 +04:00` |
| Agent / Model | `Codex / GPT-5` |
| Backend workspace | `C:\wamp64\www\prizm331-wt-mobile-parity-next` |
| Mobile workspace | `C:\wamp64\www\prizm-mobile-app-link-fix` |
| Backend branch | `feat/mobile-native-parity-next-DESKTOP-9GO5QC0` |
| Mobile branch | `codex/full-native-parity-audit` |
| Turns | Continuous parity task chain |
| Classification | Internal |

## 1. Executive Summary

This scoped batch adds the full administrator-only Departments workflow natively after reading Perfex's canonical Departments controller, model, and view. The native module now provides list, search, sorting, Perfex advanced filters, dense detail, create, edit, guarded delete, mailbox-folder discovery, and IMAP connection testing. It preserves web checkbox semantics and allows an administrator to replace an IMAP password on edit while a blank value retains the encrypted secret.

The API exposes only an explicit safe read schema. Department passwords are never returned to the app. Existing encrypted credentials are decrypted only in server memory for folder/test actions, and connection errors redact the submitted secret. Writes delegate to `Departments_model`, enforce unique non-empty email addresses and the canonical TLS/SSL enumeration, and retain the web model's referenced-ticket deletion guard.

Emulator testing also found an app-wide generic deletion-navigation defect: a successful delete could leave the user on the deleted record because history-back returned to an earlier detail/edit entry. Delete success now immediately replaces the route with the owning list, refreshes the collection asynchronously, and surfaces mutation failures.

This report additionally records the preceding authenticated Activity hardening: Dashboard/My Activity reads now use `GET /api/my/activity`, derive the effective authenticated staff identity, support View-As, cap results, and no longer use the forbidden generic entity endpoint.

The scoped quality gate passes. Deployment remains held for the user's requested single consolidated Android release. Static web-menu parity is now 106/347, leaving 241 static destinations and 4 dynamic destinations open.

## 2. Test Results

| Check | Evidence | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit -p tsconfig.json` | PASS |
| Mobile contracts | `npm run test:contracts` against current backend worktree | PASS |
| Release metadata safety | `npm run verify:release` | PASS — unchanged v1.17.0/code35 |
| Web-menu parity audit | `npm run audit:web-parity` | PASS — 106/347 covered; 241 missing; 4 dynamic |
| Backend syntax | PHP 8.2 lint, `Setup_api.php` | PASS |
| Setup backend contract | `setup_api_contract_test.php` | PASS |
| Activity backend contract | `my_activity_api_contract_test.php` | PASS |
| Diff hygiene | `git diff --check` in both worktrees | PASS |
| Department list | Authenticated admin list, 11 production-like local rows | HTTP 200 |
| Department App Link | `/MS/admin/departments` into native module | PASS |
| Department folder validation | Unsaved form with missing IMAP configuration | HTTP 422; inline safe message |
| Department connection validation | Unsaved form with missing IMAP configuration | HTTP 422; inline safe message |
| Department create | Numeric fixture `260804` | HTTP 201 |
| Department detail | Created record ID 16 | HTTP 200 |
| Department update | Rename to `260805`, enable Hide from customers | HTTP 200; persisted |
| Department delete | Fixture IDs 16, 17, and 18 across navigation retests | HTTP 200; all removed |
| Delete navigation regression | Route immediately replaced by Departments list | PASS |
| Post-delete refresh | List returned from 12 to 11 and fixture disappeared | PASS |
| Secret visibility | List/detail safe-field schema and emulator UI | PASS — no password returned |
| Editable retained secret | Edit form shows empty secure replacement input | PASS |
| Activity dashboard query | `GET /api/my/activity?limit=10&offset=0` | HTTP 200 |
| Activity full page query | `GET /api/my/activity?limit=200&offset=0` | HTTP 200 |
| Generic activity access | Mobile source and post-fix Apache traffic | PASS — no `core_crm_api/entity` use |

## 3. Acceptance Criteria

| Severity | Criterion | Result |
|---|---|---|
| S1 | Saved IMAP passwords never leave the backend | 100% PASS |
| S1 | Existing saved secret can be reused server-side for native IMAP actions | 100% PASS |
| S1 | Department writes mirror canonical Perfex model semantics | 100% PASS |
| S1 | Department CRUD is reversible and leaves no QA fixtures | 100% PASS |
| S1 | Activity data is scoped to the authenticated/effective staff identity | 100% PASS |
| S2 | Web Departments URL resolves to a dense native screen | 100% PASS |
| S2 | Folder/test actions provide inline, actionable feedback | 100% PASS |
| S2 | Generic deletion returns to the correct owning list | 100% PASS |
| Programme | Every static web destination has a native equivalent | OPEN — 106/347 (30.5%) covered |

**Scoped quality gate: PASS. Deployment gate: HELD. Overall native-web parity programme: OPEN.**

## 4. Code, Git, and Deployment

| Item | Evidence |
|---|---|
| Mobile Departments implementation | `b2827b7` |
| Backend Departments implementation | `8ef3ab497` |
| Mobile Activity hardening | `acd1f2f` |
| Backend Activity hardening | `aa6485e55` |
| Release metadata | Deliberately unchanged until the consolidated final release |
| Push / PR / deploy | Not performed |
| Production data | Not touched |
| Local QA fixtures | Department IDs 16, 17, 18 removed; list restored to 11 |
| User files | Untracked `artifacts/` preserved |
| Rollback | Revert the scoped mobile/backend commits before any future merge |

## 5. Emulator Evidence and Notes

- Emulator: `emulator-5554`, Android development build.
- Dense list screenshot: `artifacts/departments-list.png`.
- Dense mailbox tools screenshot: `artifacts/department-tools.png`.
- IMAP validation hierarchy: `artifacts/tools-error.xml`.
- CRUD hierarchies: `artifacts/dept-created.xml`, `artifacts/dept-edited.xml`, `artifacts/delete-refreshed.xml`.
- Authenticated Apache evidence recorded HTTP 200/201/422 for the expected Department paths and HTTP 200 for My Activity.
- The temporary WAMP worktree URL override was removed before commit; `lib/environment.ts` matches the branch baseline.
- Real outbound IMAP authentication was intentionally not attempted without a dedicated QA mailbox; canonical service wiring, missing-config behavior, saved-secret handling, and error redaction are covered.

## 6. Sign-off

| Role | Name | Status | Date |
|---|---|---|---|
| QA automation | Codex | Scoped PASS; deployment held; parity programme open | 2026-08-02 |
| Product reviewer | Osama Hassan | Final acceptance pending consolidated release | Pending |

Generated under Prizm QA/QC Policy. Classification: Internal.
