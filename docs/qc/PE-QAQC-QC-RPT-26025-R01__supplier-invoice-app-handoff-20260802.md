# QC Report — Supplier Invoice Native Parity and Production App Handoff

## Report Header

| Field | Value |
|---|---|
| Report Code | PE-QAQC-QC-RPT-26025-R01 |
| Session ID | supplier-invoice-app-handoff-20260802 |
| Date / Time | 2026-08-02 17:40 +04:00 |
| Agent / Model | Codex / GPT-5 |
| Backend parity workspace | C:/wamp64/www/prizm331-wt-mobile-parity-next |
| Backend hotfix workspace | C:/wamp64/www/prizm331-wt-app-link-hotfix |
| Mobile workspace | C:/wamp64/www/prizm-mobile-app-link-fix |
| Backend parity branch | feat/mobile-native-parity-next-DESKTOP-9GO5QC0 |
| Backend hotfix branch | fix/mobile-app-link-handoff-DESKTOP-9GO5QC0 |
| Mobile branch | codex/full-native-parity-audit |
| Turns | Continuous parity task chain |
| Classification | Internal |

## 1. Executive Summary

Supplier Invoices now have a native, dense purchasing workspace backed by the canonical Perfex web model. The scope includes permission-aware list/detail reads, server search and sorting, direct additive filters, Perfex advanced AND/OR filters, create/update/delete, PO-line import, supplier-item mappings, attachments, approval stages, and exact workflow actions. The purpose-built editor was inspected on the Android emulator and the real HTTP runtime suite exercised atomic persistence, multi-status selection, three-rule AND/OR logic, update, submit, detail, delete, and cleanup.

The reported Payment Request URL was then reproduced through Android and Chrome. Android domain verification, the installed signing certificate, and the exact native route were healthy. The remaining defect was the browser fallback: Chrome blocks unattended external-app launches, and the bridge immediately followed its web fallback before the user could act. Production now retains a clear one-tap handoff and uses a package-targeted, legacy-compatible `prizmcrm://ms.prizm-energy.com/MS/...` route understood by the current public APK. A live Chrome tap opened native Payment Request #1211 successfully.

The final parity audit also caught and corrected a Supplier Invoice funnel contract mismatch: `sequence_number` is now a numeric rule on both mobile and API. All list and CRUD audits pass. The backend app-link hotfix is deployed; no Android build was started, preserving the requested single final APK build. The overall native parity programme remains open.

## 2. Supplier Invoice Test Results

| Check | Evidence | Result |
|---|---|---|
| Canonical MVC | SupplierInvoice web model, controller and views | REVIEWED before API design |
| Backend syntax | Purchase API and SupplierInvoice model lint | PASS |
| API contract | `supplier_invoices_api_contract_test.php` | PASS — 11/11 |
| Runtime create | Real HTTP, two lines and approval stages | PASS |
| Search | Supplier invoice number | PASS — exact fixture |
| Direct multi-status | Draft + Cancelled | PASS — additive |
| Three-rule AND | supplier number + status + amount | PASS — exact result |
| Three-rule OR | mutually independent rules | PASS — exact result |
| Runtime update | Header and line persistence | PASS — atomic |
| Workflow | Submit and Draft + Submitted multi-status | PASS |
| Dense detail | Header, lines, files, history, stages, actions | PASS — HTTP 200 |
| Delete and cleanup | Record absent after delete | PASS; zero temporary tables |
| Emulator editor | Hero, two-column fields, totals, line card, notes | PASS — visually inspected |
| TypeScript | `npx tsc --noEmit -p tsconfig.json` | PASS |
| Mobile contracts | `node scripts/test-mobile-contracts.mjs` | PASS |
| Release metadata | `npm run verify:release` | PASS — v1.17.0/code35 |
| Expo dependencies | `npx expo install --check` | PASS |
| List audit | Search/filter/sort API contracts | PASS — 122 server + 2 client searchable; 124 filterable; 77 sortable; 0 skipped |
| CRUD audit | Advertised mutations versus backend methods | PASS — 357; 0 skipped |
| Web-menu parity | Native static destinations | 110/347 covered; 237 missing; 4 dynamic unresolved |

## 3. Production App-Handoff Test Results

| Check | Evidence | Result |
|---|---|---|
| Production association | `/.well-known/assetlinks.json` | HTTP 200; package/fingerprint match |
| Android domain state | `pm get-app-links com.prizmenergy.mobile` | `ms.prizm-energy.com: verified`; handling enabled |
| Exact HTTPS intent | Payment Request 1211 URL | PASS — Prizm MainActivity and native record |
| Production browser bridge before fix | Real Chrome document navigation | FAIL reproduced — timer fell through to web login |
| Corrected bridge contract | PHP suite | PASS — 11/11 |
| Background/API/upload safety | Predicate matrix | PASS — never intercepted |
| Legacy public-APK compatibility | Host/path custom scheme | PASS — route resolves to Payment Request 1211 |
| Real production Chrome handoff | Orange `Open Prizm CRM` action | PASS — native Payment Request #1211 |
| Native record identity | Emulator UI dump | `MT-26080002`, Fully approved |
| Live bridge response | Android document request | HTTP 200; one-tap copy and `prizmcrm` scheme present; blocked timer absent |
| Fork CI | Ghazalawy/prizm331 PR #320 | PASS — PHP 8.3 contracts |
| Upstream integration | PrizmIT/prizm331 PR #1199 | MERGED |
| Production deploy | Workflow 30750340830 | PASS — HEAD `df0dcfa973` |

## 4. Acceptance Criteria

| Severity | Criterion | Result |
|---|---|---|
| S1 | Supplier Invoice reads and mutations mirror canonical web behavior | 100% PASS |
| S1 | Direct multi-value and custom AND/OR filters are additive | 100% PASS |
| S1 | Exact Payment Request browser handoff reaches the installed app | 100% PASS in production emulator test |
| S1 | API, uploads and background fetches are not intercepted | 100% PASS |
| S2 | Supplier Invoice editor is dense, identified and mobile-responsive | 100% PASS for tested editor states |
| S2 | Current public APK understands the production bridge | 100% PASS |
| Release | Avoid another paid Android build before final parity | PASS — no Android build triggered |

Scoped quality gate: PASS. Production app-handoff gate: PASS. Overall parity programme: OPEN.

## 5. Code Changes

### Backend parity branch

- `modules/api/controllers/Purchase_api.php`
- `modules/api/config/routes.php`
- `modules/przpurchase/models/SupplierInvoice_model.php`
- `modules/api/tests/supplier_invoices_api_contract_test.php`
- `modules/api/tests/supplier_invoices_runtime_test.php`
- Commits `f7b847e4e` and `ab6fcd90c`

### Backend production hotfix

- `modules/api/helpers/mobile_app_link_helper.php`
- `modules/api/tests/mobile_app_link_bridge_contract_test.php`
- Hotfix commit `f9e10f8e9`; fork merge `f423d7eba`; production merge/deploy `df0dcfa973`

### Mobile candidate

- `components/crud/SupplierInvoiceEditor.tsx`
- `components/crud/SupplierInvoiceSummary.tsx`
- `components/crud/CrudForm.tsx`
- `components/crud/CrudDetail.tsx`
- `lib/module-registry.ts`
- `lib/native-routing.ts`
- `scripts/test-mobile-contracts.mjs`
- Commits `2c08131`, `cb99eb1`, and `66641d1`

The frontend-polish skill influenced the dense Supplier Invoice hierarchy, responsive field grouping, totals, and line-card presentation. The documents skill was used only for the mandatory report render/inspection workflow.

## 6. Deployment Status

| Target | Status |
|---|---|
| Browser-to-app backend hotfix | DEPLOYED — production HEAD `df0dcfa973` |
| Hotfix PRs | Ghazalawy #320 and PrizmIT #1199 merged |
| Hotfix workflow | `30750340830` passed |
| Supplier Invoice backend parity | CHECKPOINTED, not deployed with the isolated hotfix |
| Mobile parity branch | LOCAL CHECKPOINTS, not pushed in this slice |
| Android APK | NOT BUILT — single final build preserved |
| Release metadata | v1.17.0 / versionCode 35 unchanged |

## 7. Evidence and Residual Risk

- Native Payment Request evidence: `C:/wamp64/tmp/payment-request-1211-app-link.png`.
- Supplier Invoice editor evidence: `C:/wamp64/tmp/supplier-invoice-editor-emulator.png`, `supplier-invoice-editor-lines-emulator.png`, and `supplier-invoice-editor-line-card-emulator.png`.
- Supplier Invoice detail was verified through real HTTP data, type checks, contracts, and source review; a live fixture detail screenshot was not retained because the isolated local server cold start did not finish within the visual attempt.
- Chrome security requires a user gesture once a URL is already inside Chrome. External verified App Link taps remain automatic; browser-origin navigation now presents a deterministic one-tap handoff instead of silently returning to web login.
- Static parity remains 110/347; 237 static destinations plus 4 dynamic expressions remain for future native work.
- User-owned `artifacts/` remains untouched.

## 8. Sign-Off

| Role | Status |
|---|---|
| Engineering / Codex | Scoped implementation, production hotfix and verification complete |
| QA/QC | PASS for Supplier Invoice candidate and production app handoff |
| Product owner | Physical-device confirmation requested; overall parity acceptance remains open |
