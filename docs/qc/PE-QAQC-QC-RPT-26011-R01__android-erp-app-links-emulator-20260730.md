# QC Report — Android ERP App Links

## Report Header

| Field | Value |
|---|---|
| Report Code | `PE-QAQC-QC-RPT-26011-R01` |
| Session ID | `android-erp-app-links-emulator-20260730` |
| Date / Time | `2026-07-30 22:21:00 +04:00` |
| Agent / Model | `Codex / GPT-5` |
| Workspace | `C:\wamp64\www\prizm-mobile` |
| Mobile branch | `codex/erp-app-links` |
| Classification | Internal |

## 1. Executive Summary

Android release candidate v1.14.4 now declares verified App Links for `https://ms.prizm-energy.com/MS` and `/MS/admin/*`. Incoming ERP URLs pass through the existing native route resolver: recognized record URLs open their native mobile screen, while unmatched ERP pages open the native ERP module hub. Upload/download paths are not claimed.

The implementation and Android emulator behavior pass. Production activation remains intentionally pending because it requires both publishing v1.14.4 and placing `assetlinks.json` at the website root; the live URL currently returns HTTP 404.

## 2. Implementation

| Layer | Change |
|---|---|
| Android manifest | Expo `intentFilters` emits `VIEW`, `DEFAULT`, `BROWSABLE`, and `autoVerify=true` for the production ERP host and paths. |
| Cold/warm start routing | `app/+native-intent.ts` rewrites operating-system URLs through `resolveIncomingAppLink()`. |
| Native destination | Known ERP records use the existing route map; unknown internal ERP pages use `/(tabs)/erp`. |
| Website association | `public/.well-known/assetlinks.json` contains package `com.prizmenergy.mobile` and the stable SHA-256 signing fingerprint. |
| Safety boundary | `/MS/uploads/*` and unrelated external URLs are not claimed or rewritten. |

## 3. Android Emulator Verification

Tests ran on `emulator-5554` with the x86_64 debug APK signed by the same certificate as releases.

| Test | Expected | Observed | Result |
|---|---|---|---|
| Manifest inspection | Verified HTTPS filter for ERP paths | Literal `/MS`, prefix `/MS/admin`, `AutoVerify=true` | PASS |
| Package-targeted Project URL | Native Project 42 detail | Opened `P1051 - SEALING OF CABLE ENTRY` with full native detail UI | PASS |
| Unmatched ERP dashboard URL | Native ERP hub | Opened ERP modules list; browser was not opened | PASS |
| Simulated verified-domain launch without package hint | Android selects Prizm CRM | `com.prizmenergy.mobile/.MainActivity` selected automatically | PASS |
| Automatic deep route after selection | Native Project 42 detail | Project detail rendered after cold start | PASS |
| Emulator cleanup | Restore released app/state | v1.14.3 restored; test-only domain override cleared; Metro stopped | PASS |

Screenshot evidence: `C:\Users\osama\AppData\Local\Temp\prizm-app-links-project-final.png`.

## 4. Automated Quality Gates

| Check | Result |
|---|---|
| Release metadata | PASS — v1.14.4, Android versionCode 30 |
| TypeScript | PASS |
| Expo dependency alignment | PASS — dependencies up to date |
| Mobile contract tests | PASS — includes App Link manifest, association, cold-start, internal fallback, and external passthrough |
| CRUD contract audit | PASS — 303 mutations, 0 skipped |
| List contract audit | PASS — 105 server-searchable + 2 client-searchable, 107 filterable, 59 sortable, 0 skipped |
| Android native APK build | PASS — x86_64 debug APK, 65,966,484 bytes |
| Android production export | PASS — Hermes bundle, 44 assets |
| Git whitespace check | PASS |

### Acceptance Criteria

| Severity | Criterion | Result |
|---|---|---|
| S1 | A supported ERP HTTPS link is handled by the installed app | 100% PASS locally |
| S1 | The link resolves to the matching native record | 100% PASS locally |
| S1 | Unknown ERP pages remain inside the app | 100% PASS locally |
| S2 | External and upload URLs are not captured by this feature | 100% PASS by contract/manifest inspection |
| S1 | Production domain verification | PENDING — root association file not deployed |
| S1 | Published v1.14.4 APK verification | PENDING — branch not pushed/deployed |

**Local QC gate: PASS. Production/deployment gate: PENDING, not failed.**

## 5. Code, Git, and Deployment

| Item | Evidence |
|---|---|
| Mobile implementation commit | `9a716ca` |
| Mobile branch | `codex/erp-app-links` |
| Release candidate | v1.14.4 / Android versionCode 30 |
| Production asset association | Pending: deploy `assetlinks.json` to `/var/www/html/.well-known/assetlinks.json` |
| Mobile deployment | Not pushed or released in this session |
| Rollback | Revert commit `9a716ca`; remove the website association file if deployed |

## 6. Remaining Product-Parity Scope

The automated checkpoint covers 131 registered resources, 43 workflow-action modules, 107 searchable/filterable lists, 59 sortable lists, and 303 advertised mutations with zero skipped contract checks.

Six backend contract repairs remain before full web/mobile parity can be claimed: Task Templates/Task Manage, Product Families, Client Items composition review, Cost Center child endpoints, Survey Results, and Knowledge article CRUD. Separately, several lower-priority web-only workflows remain deliberately deferred by product decision.

## 7. Sign-off

| Role | Name | Status | Date |
|---|---|---|---|
| QA automation | Codex | Local implementation, contracts, native build, and emulator gates PASS | 2026-07-30 |
| Product reviewer | Osama Hassan | Requested ERP links open the installed app | 2026-07-30 |

Generated under Prizm QA/QC Policy. Classification: Internal.
