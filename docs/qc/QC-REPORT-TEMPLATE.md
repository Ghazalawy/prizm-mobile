# QC Report — Dense Native Record Views

## Report Header

| Field | Value |
|---|---|
| Report Code | `PE-QAQC-QC-RPT-26012-R01` |
| Session ID | `dense-native-record-ui-20260730` |
| Date / Time | `2026-07-31 00:31 +04:00` |
| Agent / Model | `Codex / GPT-5` |
| Workspace | `C:\wamp64\www\prizm-mobile` |
| Mobile branch | `codex/dense-task-record-ui` |
| Classification | Internal |

## 1. Executive Summary

Mobile v1.15.0 makes opened records unmistakable and substantially denser. Shared and high-traffic detail screens now show a module/group eyebrow, module icon, record type, ID, and record title at the top. Generic record metadata uses a field-aware two-column layout for short values while preserving full width for names, descriptions, notes, URLs, and other narrative content.

The Tasks list defect is fixed: priority bars retain their full height with a 10 px text gutter, and internal relation keys such as `erp_dev` render as `ERP Development Module`. The relation label is also used in task detail.

## 2. Implementation

| Area | Change |
|---|---|
| Shared record header | `ScreenHeader` supports module eyebrow, icon, color, title, ID, and record subtitle. |
| Generic record density | Short metadata and custom fields pack into two columns; narrative and long fields remain full width. |
| Task list | Priority accent remains visible and is separated from text by a fixed gutter. |
| Task relation | Perfex relation keys map to readable module labels; related record IDs/names remain visible. |
| Workflow approvals | Purchase Request, Purchase Order, Payment Request, and Expense Request headers identify their exact module. |
| High-traffic detail screens | Project, Lead, Customer, Contract, Ticket, Opportunity, and Business Partner surfaces expose module identity. |

No API endpoints, database schemas, authentication behavior, CSRF handling, or workflow permission rules changed in this release.

## 3. Android Emulator Verification

Tests ran on `emulator-5554` using the locally built x86_64 debug APK, followed by the published signed v1.15.0 APK.

| Test | Expected | Observed | Result |
|---|---|---|---|
| Dedicated Tasks list | Priority bar does not touch title | Full-height colored bar with visible gutter on every rendered row | PASS |
| Task search `erp` | No raw internal relation key | `ERP Development Module · #266` and `ERP Development Module · #260` rendered | PASS |
| Task detail `#17288` | Clear context and readable relation | Header shows `WORK / Task / #17288`; relation pill shows `ERP Development Module · #266` | PASS |
| ERP Tasks list | No redundant raw status code | Status appears as `Not Started`; raw numeric `1` is absent | PASS |
| Payment Request `#1208` | Opened module is immediately obvious | Header shows `APPROVALS / Payment Request / MT-26070029` | PASS |
| Budget Item `#27386` | Dense layout without crushing long text | Long name/description use full width; short classification metadata shares rows | PASS |
| Live workflow content | Existing approval controls remain usable | Approve/Reject, tabs, approvers, and line items rendered without overlap | PASS |

## 4. Automated Quality Gates

| Check | Result |
|---|---|
| Release metadata | PASS — v1.15.0, Android versionCode 31 |
| TypeScript | PASS — `npx tsc --noEmit -p tsconfig.json` |
| Expo dependency alignment | PASS — dependencies up to date |
| Mobile contract tests | PASS — auth, filters, routing, schemas, workflows |
| CRUD contract audit | PASS — 303 advertised mutations, 0 skipped |
| List contract audit | PASS — 107 searchable and filterable lists, 59 sortable, 0 skipped |
| Android native build | PASS — x86_64 debug APK assembled and installed |
| Git whitespace check | PASS |
| GitHub rolling release | PASS — workflow `30577193072`, Android build and Pages deploy |
| Published APK integrity | PASS — 91,548,964 bytes; SHA-256 `69b04b2342ad37412f0bdf52bebea2f6cc49c8aaf674ac67203466a016fbfde2` |
| Published APK install | PASS — `versionName=1.15.0`, `versionCode=31` |
| Published APK UI retest | PASS — What's New, Tasks `erp` search, accent gutter, readable relation, and Task `#17288` detail |

### Acceptance Criteria

| Severity | Criterion | Result |
|---|---|---|
| S1 | Task list text is visually separated from the priority bar | 100% PASS |
| S1 | Raw `erp_dev` is not exposed to users | 100% PASS |
| S1 | Opened Task, workflow, and generic ERP records identify their module | 100% PASS |
| S2 | Short fields use available horizontal space | 100% PASS |
| S2 | Long/narrative fields retain readable full width | 100% PASS |
| S1 | Existing data, actions, and routing remain operational | 100% PASS |

**Implementation, contract, emulator, release workflow, and published APK gates: PASS. No open Blocker, Major, or Minor defect remains in scope.**

## 5. Code, Git, and Deployment

| Item | Evidence |
|---|---|
| Mobile implementation commit | `1cc03be` |
| Mobile branch | `codex/dense-task-record-ui` |
| Release version | v1.15.0 / Android versionCode 31 |
| Main deployment | `origin/main` at `1cc03be` |
| GitHub workflow | `30577193072` — completed successfully |
| Rolling APK | `latest/prizm-mobile.apk` — published, hash-checked, installed, and exercised |
| Rollback | Revert commit `1cc03be` and publish the previous v1.14.4 APK |

## 6. Sign-off

| Role | Name | Status | Date |
|---|---|---|---|
| QA automation | Codex | Implementation, contracts, signed build, release workflow, and emulator gates PASS | 2026-07-31 |
| Product reviewer | Osama Hassan | Requested dense native UI refactor and deployment | 2026-07-30 |

Generated under Prizm QA/QC Policy. Classification: Internal.
