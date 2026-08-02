# QC Report — Native Setup Administration and Shared CRUD Stability

## Report Header

| Field | Value |
|---|---|
| Report Code | `PE-QAQC-QC-RPT-26019-R01` |
| Session ID | `setup-native-admin-parity-20260802` |
| Date / Time | `2026-08-02 12:09 +04:00` |
| Agent / Model | `Codex / GPT-5` |
| Backend workspace | `C:\wamp64\www\prizm331-wt-mobile-parity-next` |
| Mobile workspace | `C:\wamp64\www\prizm-mobile-app-link-fix` |
| Backend branch | `feat/mobile-native-parity-next-DESKTOP-9GO5QC0` |
| Mobile branch | `codex/full-native-parity-audit` |
| Classification | Internal |

## 1. Executive Summary

This scoped batch adds twelve native, administrator-only Setup catalog pages: Customer Groups, Ticket Priorities, Predefined Replies, Ticket Statuses, Ticket Services, Lead Sources, Lead Statuses, Taxes, Currencies, Payment Modes, Expense Categories, and Contract Types. Each page supports native list, search, sorting, Perfex-compatible advanced filters, detail, create, edit, and guarded delete; Currencies also exposes the canonical Make Base action.

The web MVC models and permission behavior were read before implementation. The API uses explicit resource and writable-field allowlists, canonical Perfex models, strict validation, HTML purification for predefined replies, protected default-record deletion, no-trace 404 responses for non-admin users, and authenticated headers through the shared mobile API layer.

Emulator testing found and corrected two cross-cutting defects. Setup modules initially flattened logical filters into ordinary query parameters, so two visibly active rules were ignored by the API. They now send the full Perfex `filters` JSON group. Generic CRUD forms also reinitialized after every keystroke because route-parameter object identity changed; a stable initialization guard now preserves typed edits, and a stable empty custom-fields collection removes the associated maximum-update-depth loop.

The scoped quality gate passes. Deployment remains held for the user's requested single consolidated Android release. The broader web-parity programme improves from 93/347 to 105/347 static destinations; 242 static destinations and 4 dynamic destinations remain open.

## 2. Test Results

| Check | Evidence | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit -p tsconfig.json` | PASS |
| Mobile contracts | `npm run test:contracts` | PASS |
| Release metadata safety | `npm run verify:release` | PASS — unchanged v1.17.0/code35 |
| Web-menu parity audit | `npm run audit:web-parity` | PASS — 105/347 covered; 242 missing; 4 dynamic |
| Backend syntax | PHP 8.2 lint on routes, controller, and test | PASS |
| Backend contract | `setup_api_contract_test.php` | PASS |
| Diff hygiene | `git diff --check` in both worktrees | PASS |
| Setup list matrix | All 12 authenticated admin list endpoints | HTTP 200 |
| No-trace permission | Non-admin Setup request | HTTP 404 |
| Unauthenticated request | REST parent token guard | HTTP 404, token missing |
| Search | Customer and catalog searches returned the exact match | PASS |
| Unsupported filter | Unknown advanced-filter field | HTTP 400 |
| Logical OR API | Two exact Ticket Service branches | PASS — both rows only |
| Logical AND API | Two simultaneous supported rules | PASS |
| Reversible CRUD API | Create, update, detail, delete across all 12 resources | PASS; fixtures removed |
| Duplicate tax guard | Duplicate name/rate | HTTP 409 |
| Payment Mode validation | invoices-only plus expenses-only | HTTP 400 |
| Protected Ticket Status | Default status deletion | HTTP 409 |
| Base Currency action | Make current base idempotently | HTTP 200, `changed=false` |
| Emulator logical OR | Customer Group ID=2 OR ID=3 | PASS — exactly 2 rows: OIL & GAS and Infrastructure |
| Emulator logical AND | Customer Group ID=2 AND ID=3 | PASS — empty result state |
| Emulator form typing | Generic create form retains `260802` after rerender | PASS |
| Emulator CRUD | Create `260802`, edit to `260803`, detail verify, delete | PASS; list restored to 3 |
| Render-loop regression | List/detail after CRUD and Fast Refresh | PASS — no developer warning |
| Rich detail density | Payment Modes list and Bank detail | PASS — module identity and scope fields visible |

## 3. Acceptance Criteria

| Severity | Criterion | Result |
|---|---|---|
| S1 | Multiple advanced rules preserve AND/OR semantics through the mobile transport | 100% PASS |
| S1 | Generic create/edit fields retain user input and do not reset on rerender | 100% PASS |
| S1 | Setup mutations are admin-only, allowlisted, validated, and no-trace | 100% PASS |
| S1 | Reversible CRUD leaves no QA fixtures | 100% PASS |
| S2 | Setup list/detail pages identify the module and render densely without overlap | 100% PASS |
| S2 | Protected defaults and base-currency rules mirror canonical web behavior | 100% PASS |
| Programme | Every static web destination has a native equivalent | OPEN — 105/347 (30.3%) covered |

**Scoped quality gate: PASS. Deployment gate: HELD. Overall native-web parity programme: OPEN.**

## 4. Code, Git, and Deployment

| Item | Evidence |
|---|---|
| Mobile implementation | `ddf454e` |
| Backend implementation | `5bcc4caeb` |
| Mobile files | Shared CRUD form/filter fixes, 12 registry definitions, native aliases, contracts |
| Backend files | Setup REST controller, three explicit routes, static contract test |
| Release metadata | Deliberately unchanged until the consolidated final release |
| Push / PR / deploy | Not performed |
| Production data | Not touched |
| Local QA fixtures | Customer Group `260802/260803` and API matrix fixtures removed |
| User files | Untracked `artifacts/` preserved |
| Rollback | Revert the two scoped commits before any future merge |

## 5. Emulator Evidence and Notes

- Emulator: `emulator-5554`, Android development build.
- Correct OR result hierarchy: `C:\Users\osama\AppData\Local\Temp\prizm-result-fixed.xml`.
- Correct AND empty state: `C:\Users\osama\AppData\Local\Temp\prizm-result-and.xml`.
- Reversible form/CRUD evidence: `prizm-form-fixed.xml`, `prizm-edit-result.xml`, and `prizm-delete-result.xml` in the same temporary directory.
- Rich Setup detail evidence: `C:\Users\osama\AppData\Local\Temp\prizm-payment-mode-detail.xml`.
- The temporary WAMP worktree URL override was removed before commit; `lib/environment.ts` matches the branch baseline.
- An `adb input text` development-client shortcut could reload the bundle when rapid text contained `r`; numeric UI values avoided that emulator-only shortcut. The application filter and CRUD results were verified after the bundle stabilized.

## 6. Sign-off

| Role | Name | Status | Date |
|---|---|---|---|
| QA automation | Codex | Scoped PASS; deployment held; parity programme open | 2026-08-02 |
| Product reviewer | Osama Hassan | Final acceptance pending consolidated release | Pending |

Generated under Prizm QA/QC Policy. Classification: Internal.
