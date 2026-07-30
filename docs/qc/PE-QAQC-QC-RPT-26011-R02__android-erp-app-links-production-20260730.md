# QC Report — Android ERP App Links

## Report Header

| Field | Value |
|---|---|
| Report Code | `PE-QAQC-QC-RPT-26011-R02` |
| Session ID | `android-erp-app-links-production-20260730` |
| Date / Time | `2026-07-30 23:08:16 +04:00` |
| Agent / Model | `Codex / GPT-5` |
| Workspace | `C:\wamp64\www\prizm-mobile` |
| Mobile branch | `codex/erp-app-links` |
| Classification | Internal |

## 1. Executive Summary

Android release v1.14.4 declares verified App Links for `https://ms.prizm-energy.com/MS` and `/MS/admin/*`. Incoming ERP URLs pass through the existing native route resolver: recognized record URLs open their native mobile screen, while unmatched ERP pages open the native ERP module hub. Upload/download paths are not claimed.

Production activation is complete. The website association returns HTTP 200 JSON, Android reports the domain as verified, and the published v1.14.4 APK cold-started directly from an unhinted ERP HTTPS URL into the matching native Project screen.

## 2. Implementation

| Layer | Change |
|---|---|
| Android manifest | Expo `intentFilters` emits `VIEW`, `DEFAULT`, `BROWSABLE`, and `autoVerify=true` for the production ERP host and paths. |
| Cold/warm start routing | `app/+native-intent.ts` rewrites operating-system URLs through `resolveIncomingAppLink()`. |
| Native destination | Known ERP records use the existing route map; unknown internal ERP pages use `/(tabs)/erp`. |
| Website association | `public/.well-known/assetlinks.json` contains package `com.prizmenergy.mobile` and the stable SHA-256 signing fingerprint. |
| Safety boundary | `/MS/uploads/*` and unrelated external URLs are not claimed or rewritten. |

## 3. Android Emulator Verification

Tests ran on `emulator-5554` first with the local x86_64 APK and finally with the published 91,543,576-byte v1.14.4 release APK.

| Test | Expected | Observed | Result |
|---|---|---|---|
| Manifest inspection | Verified HTTPS filter for ERP paths | Literal `/MS`, prefix `/MS/admin`, `AutoVerify=true` | PASS |
| Package-targeted Project URL | Native Project 42 detail | Opened `P1051 - SEALING OF CABLE ENTRY` with full native detail UI | PASS |
| Unmatched ERP dashboard URL | Native ERP hub | Opened ERP modules list; browser was not opened | PASS |
| Real verified-domain cold start without package hint | Android selects Prizm CRM | `com.prizmenergy.mobile/.MainActivity`, cold launch in 2.3 seconds | PASS |
| Published APK deep route | Native Project 42 detail | Opened `P1051 - SEALING OF CABLE ENTRY` after dismissing What's New | PASS |
| Published APK unmatched dashboard URL | Native ERP hub | Opened ERP modules list; browser was not opened | PASS |
| Android domain state | Production host verified | `ms.prizm-energy.com: verified` | PASS |

Screenshot evidence: `C:\Users\osama\AppData\Local\Temp\prizm-app-links-v1144-final.png`.

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
| Production association | PASS — HTTP 200 `application/json`; SHA-256 `aa79d81c66a706c774f23be51c768fc04fcdbfa04be7abc49496a533a38c27ef` |
| GitHub release workflow | PASS — run `30571157067`, Android build and Pages deploy |
| Published APK integrity | PASS — 91,543,576 bytes; SHA-256 `6cf0c250e134a877ce4adcd3fdcb3220d80ff195fb190a155035fd68835683b2` |
| Published APK signature | PASS — certificate SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c` |
| Git whitespace check | PASS |

### Acceptance Criteria

| Severity | Criterion | Result |
|---|---|---|
| S1 | A supported ERP HTTPS link is handled by the installed app | 100% PASS in production |
| S1 | The link resolves to the matching native record | 100% PASS in production |
| S1 | Unknown ERP pages remain inside the app | 100% PASS in production |
| S2 | External and upload URLs are not captured by this feature | 100% PASS by contract/manifest inspection |
| S1 | Production domain verification | 100% PASS — Android reports verified |
| S1 | Published v1.14.4 APK verification | 100% PASS — installed and exercised |

**QC and production deployment gates: PASS. No open Blocker, Major, or Minor defects in scope.**

## 5. Code, Git, and Deployment

| Item | Evidence |
|---|---|
| Mobile implementation commit | `9a716ca` |
| Mobile branch | `codex/erp-app-links` |
| Released version | v1.14.4 / Android versionCode 30 |
| Production asset association | `/var/www/html/.well-known/assetlinks.json`; HTTP 200 and Android verified |
| Mobile deployment | `origin/main` at `dc0aed0`; workflow `30571157067` succeeded |
| Rolling APK | `latest/prizm-mobile.apk`; published, downloaded, signature-checked, installed, and exercised |
| Rollback | Revert commit `9a716ca`; remove the website association file if deployed |

## 6. Remaining Product-Parity Scope

The automated checkpoint covers 131 registered resources, 43 workflow-action modules, 107 searchable/filterable lists, 59 sortable lists, and 303 advertised mutations with zero skipped contract checks.

Six backend contract repairs remain before full web/mobile parity can be claimed: Task Templates/Task Manage, Product Families, Client Items composition review, Cost Center child endpoints, Survey Results, and Knowledge article CRUD. Separately, several lower-priority web-only workflows remain deliberately deferred by product decision.

## 7. Sign-off

| Role | Name | Status | Date |
|---|---|---|---|
| QA automation | Codex | Implementation, contracts, release workflow, published APK, and production App Link gates PASS | 2026-07-30 |
| Product reviewer | Osama Hassan | Requested ERP links open the installed app | 2026-07-30 |

Generated under Prizm QA/QC Policy. Classification: Internal.
