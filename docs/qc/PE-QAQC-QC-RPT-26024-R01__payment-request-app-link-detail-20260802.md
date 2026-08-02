# QC Report — Payment Request App Link and Native Detail Recovery

## Report Header

| Field | Value |
|---|---|
| Report Code | PE-QAQC-QC-RPT-26024-R01 |
| Session ID | payment-request-app-link-detail-20260802 |
| Date / Time | 2026-08-02 16:22 +04:00 |
| Agent / Model | Codex / GPT-5 |
| Backend workspace | C:/wamp64/www/prizm331-wt-mobile-parity-next |
| Mobile workspace | C:/wamp64/www/prizm-mobile-app-link-fix |
| Backend branch | feat/mobile-native-parity-next-DESKTOP-9GO5QC0 |
| Mobile branch | codex/full-native-parity-audit |
| Turns | Continuous parity task chain |
| Classification | Internal |

## 1. Executive Summary

The reported URL `https://ms.prizm-energy.com/MS/przpurchase/Payment_Request/view_payment_request/1211` was traced across the production association file, Android package resolver, browser bridge, native route resolver, mobile approval query, canonical Perfex Payment Request controller/model, and the production database.

Android domain verification is healthy: the production `assetlinks.json` returns HTTP 200, its SHA-256 certificate fingerprint matches the installed application signature, the domain is verified, supported-link handling is enabled, and Android resolves the exact URL to `com.prizmenergy.mobile/.MainActivity`. The HTTPS handoff reached the native Payment Request screen in the emulator.

That test exposed a separate S1 data defect. Production record 1211 exists, but `Przpayment_model::get_payment_detail()` joined a nonexistent unprefixed `suppliers` table. The real table is `tblsuppliers`; the failed model query made the mobile API return `Payment Request not found`, while the web UI continued to work through a different read path. The join now uses `db_prefix() . 'suppliers'`, and the corrected production read-only SQL returns record 1211.

The browser bridge was also hardened for phones or embedded browsers that bypass verified HTTPS links. It now addresses the installed `prizmcrm` application scheme, carries the complete original ERP URL in a validated payload, retains the browser fallback, and rejects external targets. Before the change, the same scheme URL produced Expo's Unmatched Route screen; after the change, it opened the native Payment Request route.

The scoped candidate passes. Deployment remains held for the requested single consolidated Android release, so the production API and the currently installed phone APK do not yet contain this checkpoint.

## 2. Test Results

| Check | Evidence | Result |
|---|---|---|
| Production association | `/.well-known/assetlinks.json` | HTTP 200; package and fingerprint match |
| Android domain state | `pm get-app-links` | `ms.prizm-energy.com: verified`; link handling enabled |
| Exact HTTPS resolver | Android package query | Prizm MainActivity advertised for record 1211 URL |
| Exact HTTPS launch | Android activity manager | PASS — native Payment Request route opened |
| Production browser bridge | Android document request | HTTP 200; bridge and package intent present |
| Web MVC source | Payment_Request controller and Przpayment_model | REVIEWED |
| Production record | `tblprz_payment_request.id = 1211` | EXISTS |
| Production schema | `suppliers` / `tblsuppliers` | 0 / 1 tables |
| Broken model join | unprefixed supplier join | Reproduced: table does not exist |
| Corrected model join | prefixed supplier join | PASS — record 1211 returned |
| Scheme routing before fix | `prizmcrm:///MS/.../1211` | Reproduced: Unmatched Route |
| Scheme routing after fix | `prizmcrm://open?url=...1211` | PASS — native Payment Request route |
| External-target fence | custom scheme carrying example.com | PASS — falls back to native ERP hub |
| TypeScript | `npx tsc --noEmit -p tsconfig.json` | PASS |
| Mobile contracts | `node scripts/test-mobile-contracts.mjs` | PASS |
| Backend syntax | PHP lint | PASS |
| Browser bridge contract | `mobile_app_link_bridge_contract_test.php` | PASS — 11/11 |
| Payment detail contract | `payment_request_detail_contract_test.php` | PASS — 4/4 |
| Workspace safety | git status | PASS — user-owned `artifacts/` untouched |

## 3. Acceptance Criteria

| Severity | Criterion | Result |
|---|---|---|
| S1 | Exact Payment Request URL reaches the native module | 100% PASS in candidate emulator |
| S1 | Native detail query uses the canonical supplier table | 100% PASS in source, contract, and production read-only SQL |
| S1 | External URLs cannot be smuggled through the custom scheme | 100% PASS |
| S2 | Browser/WebView bypass has an explicit installed-app fallback | 100% PASS in candidate |
| S2 | Browser fallback preserves the complete path and query | 100% PASS |
| Release | Corrected API and app behavior are visible on the physical phone | PENDING consolidated deployment |

Scoped quality gate: PASS. Deployment gate: HELD for one consolidated APK. Overall parity programme: OPEN.

## 4. Code Changes

### Backend

- `modules/przpurchase/models/Przpayment_model.php`
- `modules/api/helpers/mobile_app_link_helper.php`
- `modules/api/tests/mobile_app_link_bridge_contract_test.php`
- `modules/api/tests/payment_request_detail_contract_test.php`
- Commit `0ef48f2f3` — `fix(api): resolve payment request mobile links`

### Mobile

- `lib/native-routing.ts`
- `scripts/test-mobile-contracts.mjs`
- Commit `f980d65` — `fix: harden browser deep-link fallback`

The document-generation skill was used only to produce and visually verify this mandatory QC artifact; it did not influence application behavior.

## 5. Deployment Status

| Target | Status |
|---|---|
| Backend production | NOT DEPLOYED — production still has the broken unprefixed detail join |
| Mobile GitHub/main | NOT PUSHED |
| Android APK | NOT BUILT — preserving the requested single final build |
| Release metadata | v1.17.0 / versionCode 35 unchanged |
| Existing phone | Still runs the previously published behavior until consolidated update |

## 6. Evidence and Residual Risk

- HTTPS App Link evidence: `C:/wamp64/tmp/payment-request-app-link-1211.png`.
- Custom-scheme evidence: `C:/wamp64/tmp/payment-scheme-fixed-1211.png`.
- The screenshots still show `Payment Request not found` because the corrected backend commit is intentionally not deployed yet; routing itself is proven by reaching the correct native module.
- Chrome and some OEM browsers intentionally suppress automatic external-app launches without a user gesture. The verified HTTPS route remains primary; the bridge's orange action now uses the installed app scheme as the deterministic fallback.
- Physical-phone verification is mandatory after the final backend deployment and consolidated APK installation.
- User-owned `artifacts/` remains untouched.

## 7. Sign-Off

| Role | Status |
|---|---|
| Engineering / Codex | Scoped implementation and verification complete |
| QA/QC | PASS for candidate App Link handoff and Payment Request detail recovery |
| Product owner | Final acceptance pending consolidated release |
