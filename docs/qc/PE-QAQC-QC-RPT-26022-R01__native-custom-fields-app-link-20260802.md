# QC Report — Native Custom Fields and /MS App-Link Gate

## Report Header

| Field | Value |
|---|---|
| Report Code | PE-QAQC-QC-RPT-26022-R01 |
| Session ID | native-custom-fields-app-link-20260802 |
| Date / Time | 2026-08-02 14:29 +04:00 |
| Agent / Model | Codex / GPT-5 |
| Backend workspace | C:/wamp64/www/prizm331-wt-mobile-parity-next |
| Mobile workspace | C:/wamp64/www/prizm-mobile-app-link-fix |
| Backend branch | feat/mobile-native-parity-next-DESKTOP-9GO5QC0 |
| Mobile branch | codex/full-native-parity-audit |
| Turns | Continuous parity task chain |
| Classification | Internal |

## 1. Executive Summary

This scoped batch adds Setup → Custom Fields as a native administrator workflow after reading Perfex's canonical Custom Fields controller, model, list table, editor view, and hook-provided target extensions. The mobile module now provides list, server search, sorting, full Perfex logical filters, dense detail, create, edit, and guarded delete through a purpose-built compact editor.

The API preserves the web behavior instead of approximating it: administrator-only/no-trace access, dynamic module targets, all ten field types, required option lists for Select/Multi Select/Checkbox, type-specific default validation, the historical disalow_client_to_edit field, module-specific visibility rules, and schema locking once values exist. Writes delegate to Perfex's Custom_fields_model, including preservation of options already used by saved records.

A reversible emulator fixture was created as Codex CF 260802 (Projects / Select / Alpha,Beta,Gamma / default Beta), found with server search, renamed to Codex CF 260802 Edited, verified directly in MySQL, and deleted through the native confirmation flow. The database returned from 18 rows to its original 17, with zero Codex fixtures remaining.

The rigorous funnel test retained two independent rules and sent the complete Perfex group. fieldto = projects AND type = select returned exactly 3 rows. Changing only match_type to OR returned exactly 8 rows. Both counts matched direct database queries, proving that multi-rule state, serialization, API grouping, and list refresh all work together.

The Android App Link release gate initially failed because app.json claimed the host without the enforced /MS prefix. Both HTTP and HTTPS declarations now include pathPrefix: /MS, and the admin parity contract passes for the exact Payment Request URL family. The installed rolling APK still predates this candidate change, so phone behavior will not change until the requested single consolidated APK is built and published.

The scoped quality gate passes. Static web-menu parity is now 108/347, leaving 239 static destinations and 4 dynamic destinations open. Deployment remains held for the single final release.

## 2. Test Results

| Check | Evidence | Result |
|---|---|---|
| TypeScript | npx tsc --noEmit -p tsconfig.json | PASS |
| Mobile contracts | npm run test:contracts | PASS |
| Admin/App-Link contracts | npm run test:admin-parity against current backend worktree | PASS |
| Release metadata safety | npm run verify:release | PASS — unchanged v1.17.0/code35 |
| Web-menu parity audit | npm run audit:web-parity | PASS — 108/347 covered; 239 missing; 4 dynamic |
| CRUD contract audit | npm run test:crud-contracts | PASS — 308 advertised mutations |
| Backend syntax | PHP 8.3.14 lint of Custom Fields controller | PASS |
| Custom Fields backend contract | custom_fields_admin_api_contract_test.php | PASS |
| Roles regression contract | roles_api_contract_test.php | PASS |
| Diff hygiene | git diff --check in both worktrees | PASS |
| Web MVC parity source | Controller, model, manage/editor/list views, helper, module hooks | REVIEWED |
| Custom Fields list | Native authenticated administrator list | HTTP 200; 17 baseline rows |
| Configuration | GET /api/custom_fields_admin_api/config | HTTP 200; core and installed hook targets |
| Create | Projects / Select fixture with three options and Beta default | HTTP 201; list 17 → 18 |
| Search | Search Codex | HTTP 200; exactly 1 result |
| Detail | Fixture ID 19 | HTTP 200; all definition, layout, behavior, and visibility values |
| Update | Append Edited to field name | HTTP 200; MySQL persistence verified |
| Combined AND filter | Belongs To = projects AND Type = select | HTTP 200; exactly 3 rows, matching SQL |
| Combined OR filter | Same two rules with match type OR | HTTP 200; exactly 8 rows, matching SQL |
| Delete | Native confirmation for fixture ID 19 | HTTP 200; list 18 → 17 |
| Fixture rollback | COUNT(*) and name LIKE Codex CF% | 17 total; 0 QA rows |
| Dense editor visual review | Emulator list/editor screenshots | PASS — compact sections, readable chips, no overlap |
| /MS intent prefix | HTTP + HTTPS pathPrefix contract | PASS |
| Payment Request native mapping | view_payment_request/{id} route contract | PASS |
| Published APK behavior | Existing rolling APK | EXPECTED OLD BEHAVIOR — candidate not yet published |

## 3. Acceptance Criteria

| Severity | Criterion | Result |
|---|---|---|
| S1 | Custom Field CRUD uses canonical Perfex model semantics | 100% PASS |
| S1 | Test data is fully reversible and leaves no fixture | 100% PASS |
| S1 | Administrator-only access and protected schema rules are enforced | 100% PASS |
| S2 | Search and both AND/OR multi-rule filters update live results | 100% PASS |
| S2 | Type, option, default, layout, and visibility rules mirror web | 100% PASS |
| S2 | Exact ERP App Link family is declared under verified /MS prefix | 100% PASS (candidate) |
| S3 | Native editor uses compact, visually coherent mobile layout | 100% PASS |
| Programme | Every static web destination has a native equivalent | OPEN — 108/347 (31.1%) covered |

Scoped quality gate: PASS. Deployment gate: HELD for one consolidated APK. Overall parity programme: OPEN.

## 4. Code Changes

### Backend

- modules/api/controllers/Custom_fields_admin_api.php
- modules/api/config/routes.php
- modules/api/tests/custom_fields_admin_api_contract_test.php
- Commit fdc7beebd — feat(api): add native custom field administration

### Mobile

- components/crud/CustomFieldDefinitionEditor.tsx
- components/crud/CrudFormScreen.tsx
- lib/module-registry.ts
- lib/native-routing.ts
- scripts/test-mobile-contracts.mjs
- app.json
- Commit 46a2c9e — feat: add native custom field administration

The frontend-polish guidance influenced the dedicated editor: existing Prizm visual language was preserved, controls were grouped by expected value length and behavior, and the result was verified visually on the Android emulator.

## 5. Deployment Status

| Target | Status |
|---|---|
| Backend production | NOT DEPLOYED — checkpoint committed locally |
| Mobile GitHub/main | NOT PUSHED |
| Android APK | NOT BUILT — preserving the requested single final build |
| Release metadata | v1.17.0 / versionCode 35 unchanged |
| Phone App Link fix | PENDING the consolidated APK |

## 6. Evidence and Residual Risk

- Emulator screenshots: C:/wamp64/tmp/codex-custom-fields-list.png and C:/wamp64/tmp/codex-custom-field-editor.png.
- Live MySQL counts proved AND = 3 and OR = 8 for the exact two-rule group.
- The temporary worktree PHP server and mobile endpoint overrides were removed after testing.
- User-owned artifacts/ remains untouched.
- The aggregate parity audit still reports 239 missing static web destinations; this scoped report does not represent full programme completion.
- The current installed APK cannot prove the newly tightened /MS declaration because native intent filters are compiled at build time. Final device verification is required after the consolidated APK is published.

## 7. Sign-Off

| Role | Status |
|---|---|
| Engineering / Codex | Scoped implementation and verification complete |
| QA/QC | PASS for Custom Fields and candidate App-Link declaration |
| Product owner | Final device acceptance pending consolidated release |
