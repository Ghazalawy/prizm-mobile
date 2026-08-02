# QC Report — Native Email Templates and Logical Filter Regression

## Report Header

| Field | Value |
|---|---|
| Report Code | PE-QAQC-QC-RPT-26023-R01 |
| Session ID | native-email-templates-parity-20260802 |
| Date / Time | 2026-08-02 15:57 +04:00 |
| Agent / Model | Codex / GPT-5 |
| Backend workspace | C:/wamp64/www/prizm331-wt-mobile-parity-next |
| Mobile workspace | C:/wamp64/www/prizm-mobile-app-link-fix |
| Backend branch | feat/mobile-native-parity-next-DESKTOP-9GO5QC0 |
| Mobile branch | codex/full-native-parity-audit |
| Turns | Continuous parity task chain |
| Classification | Internal |

## 1. Executive Summary

This scoped batch adds Setup → Email Templates as a complete native administration workflow after reading Perfex's canonical Emails controller, Emails_model, template list, editor view, permission checks, merge-field registry, and slug-wide enable/disable behavior.

The mobile app now provides a searchable, sortable, filterable 101-template list; clear module identity; dense purpose-built summary; responsive multilingual editor; sender and delivery controls; language coverage; cursor-aware merge-field insertion; and native routing for both the list and individual templates. Templates are fixed system records, so create and delete are intentionally unavailable.

The API exposes an English-canonical list while editing every language variant that shares the selected slug. It delegates updates to Perfex's Emails_model, filters merge fields by template type and slug, protects the two-factor authentication template from being disabled, and applies status changes slug-wide exactly like the web UI.

Emulator testing caught a real regression before commit: the native quick chips submitted active as a MultiSelectRule while the endpoint declared it as a BooleanRule. Enabled + Disabled therefore returned zero records. The endpoint and mobile contract now agree on MultiSelectRule. Enabled alone returned 14 records; adding Disabled retained both selections and returned all 101.

The same funnel retained an independent Template contains Invoice rule. Enabled AND Invoice returned 0 records; changing only match_type to OR returned 21. This proves multi-rule state, status arrays, logical grouping, serialization, API query construction, and live list refresh all work together.

The scoped gate passes. Static web-menu parity is now 109/347, leaving 238 static destinations and 4 dynamic destinations open. Deployment remains held for the requested single consolidated Android release.

## 2. Test Results

| Check | Evidence | Result |
|---|---|---|
| TypeScript | npx tsc --noEmit -p tsconfig.json | PASS |
| Mobile contracts | node scripts/test-mobile-contracts.mjs | PASS |
| Release metadata safety | npm run verify:release | PASS — unchanged v1.17.0/code35 |
| List capability audit | audit-list-contracts.mjs | PASS — 121 server + 2 client searchable; 123 filterable; 76 sortable; 0 skipped |
| CRUD capability audit | audit-crud-contracts.mjs | PASS — 354 mutations; 0 skipped |
| Backend syntax | PHP 8.3.14 lint | PASS |
| Email Templates contract | email_templates_api_contract_test.php | PASS — 7/7 |
| Shared logical filters | advanced_filters_contract_test.php | PASS |
| Daleela regression suite | mcp_api_defects_daleela_contract_test.php | PASS — 96/96 |
| Web MVC parity source | Emails controller/model/list/editor/merge fields | REVIEWED |
| Authenticated list | GET /api/email_templates_api | HTTP 200; 101 templates |
| Search | Invoice | HTTP 200; 8/8 API and SQL |
| Direct combined AND | Type = client AND Active = disabled | HTTP 200; 9/9 API and SQL |
| Direct combined OR | Type = client OR Active = enabled | HTTP 200; 23/23 API and SQL |
| Detail | Template ID 1 | HTTP 200; 27 variants and 27 merge fields |
| Reversible update | Append QA marker, verify, restore original | PASS |
| Activity rollback | QA activity rows after restore | 0 remaining |
| Emulator single status | Enabled | 14 records |
| Emulator multi-status | Enabled + Disabled | 101 records; both chips selected |
| Emulator mixed AND | Enabled AND Template contains Invoice | 0 records |
| Emulator mixed OR | Enabled OR Template contains Invoice | 21 records |
| Native list visual QA | Emulator screenshot | PASS — dense rows; no duplicate status text |
| Native detail visual QA | Emulator screenshot | PASS — readable hero, structured preview, 27-language coverage |
| Native editor visual QA | Emulator screenshot | PASS — responsive proportions, proper switches, no overlap |
| Language and merge fields | Bulgarian selection and merge-field panel | PASS — 27 safe tokens |
| Runtime log | Android logcat | PASS — no React/app runtime errors |
| Cleanup | Local API override/router/port | PASS — override reverted; PID stopped; port 8092 closed |

## 3. Acceptance Criteria

| Severity | Criterion | Result |
|---|---|---|
| S1 | Updates preserve canonical Perfex email-template behavior | 100% PASS |
| S1 | QA edit is exactly restored with no residual activity rows | 100% PASS |
| S1 | Two-factor template cannot be disabled | 100% PASS |
| S2 | Search and multi-status chips update live results | 100% PASS |
| S2 | Multiple custom rules remain additive under AND and OR | 100% PASS |
| S2 | Every language variant can be edited in one native workflow | 100% PASS |
| S3 | Module identity, content, delivery, and coverage are dense and readable | 100% PASS |
| Programme | Every static web destination has a native equivalent | OPEN — 109/347 (31.4%) covered |

Scoped quality gate: PASS. Deployment gate: HELD for one consolidated APK. Overall parity programme: OPEN.

## 4. Code Changes

### Backend

- modules/api/controllers/Email_templates_api.php
- modules/api/config/routes.php
- modules/api/tests/email_templates_api_contract_test.php
- Commit 3973fecf9 — feat(api): add native email template parity

### Mobile

- components/crud/EmailTemplateEditor.tsx
- components/crud/EmailTemplateSummary.tsx
- components/crud/CrudFormScreen.tsx
- components/crud/CrudDetailScreen.tsx
- lib/module-registry.ts
- lib/native-routing.ts
- scripts/test-mobile-contracts.mjs
- Commit e11b5c7 — feat: add native email template administration

The frontend-polish skill directly influenced this batch: the Prizm visual language was preserved, expected field lengths determined responsive proportions, dark-surface contrast was corrected from emulator evidence, fragile utility dimensions were replaced for switches, and list/detail/editor screens were visually rechecked after every correction.

## 5. Deployment Status

| Target | Status |
|---|---|
| Backend production | NOT DEPLOYED — checkpoint committed locally |
| Mobile GitHub/main | NOT PUSHED |
| Android APK | NOT BUILT — preserving the requested single final build |
| Release metadata | v1.17.0 / versionCode 35 unchanged |
| Existing phone App Link behavior | Remains tied to the currently installed APK until final consolidated release |

## 6. Evidence and Residual Risk

- List evidence: C:/wamp64/tmp/codex-both-status.png.
- Detail evidence: C:/wamp64/tmp/codex-email-detail-final.png.
- Editor evidence: C:/wamp64/tmp/codex-email-editor-final.png.
- Merge-field evidence: C:/wamp64/tmp/codex-email-editor-merge.png.
- Temporary local API routing was removed and port 8092 was confirmed closed.
- User-owned artifacts/ remains untouched.
- The current installed APK still predates the consolidated candidate, so final phone verification remains mandatory after the one requested release.
- The aggregate parity audit still reports 238 missing static destinations and 4 dynamic paths; this scoped report does not represent programme completion.

## 7. Sign-Off

| Role | Status |
|---|---|
| Engineering / Codex | Scoped implementation and verification complete |
| QA/QC | PASS for native Email Templates and multi-rule filter regression |
| Product owner | Final acceptance pending consolidated release |
