# QC Report — Purchasing Android App Links

## Report Header

| Field | Value |
|---|---|
| Report Code | `PE-QAQC-QC-RPT-26013-R01` |
| Session ID | `przpurchase-app-links-20260802` |
| Date / Time | `2026-08-02 01:37 +04:00` |
| Agent / Model | `Codex / GPT-5` |
| Workspace | `C:\wamp64\www\prizm-mobile-app-link-fix` |
| Mobile branch | `codex/fix-przpurchase-app-links` |
| Turns | Current task continuation |
| Classification | Internal |

## 1. Executive Summary

Android v1.15.0 did not hand production purchasing URLs such as `https://ms.prizm-energy.com/MS/przpurchase/Payment_Request/view_payment_request/1211` to the installed Prizm app. The JavaScript router already mapped that exact URL to the native Payment Request approval route, but the Android manifest claimed only `/MS` and `/MS/admin/*`, so Chrome remained the handler for `/MS/przpurchase/*`.

Release v1.15.1 adds a narrow verified Android App Link prefix for `/MS/przpurchase`. It deliberately does not claim unrelated website or upload URLs. The exact reported URL was tested from Android's HTTPS intent boundary against local debug and release APKs.

## 2. Implementation

| Area | Change |
|---|---|
| Android App Links | Added the verified `https://ms.prizm-energy.com/MS/przpurchase/*` path prefix. |
| Native routing | Preserved the existing Payment Request parser, which maps record `1211` to `/(tabs)/approvals/payment_request/1211`. |
| Regression coverage | Added assertions for the exact reported URL and the Android manifest path prefix. |
| Cross-platform test harness | Normalized CRLF to LF when contract tests inspect `module-registry.ts`. |
| Release metadata | Bumped app version to `1.15.1` and Android versionCode to `32`. |

No API endpoint, database schema, authentication, CSRF, biometric, workflow permission, or file-storage behavior changed in this hotfix.

## 3. Android Emulator Verification

Tests ran on `emulator-5554` with software rendering because the shared GPU was occupied.

| Test | Expected | Observed | Result |
|---|---|---|---|
| v1.15.0 baseline resolver | Reported purchasing URL does not reach app | Android resolved the exact URL to Chrome | REPRODUCED |
| Generated Android manifest | Purchasing path is declared narrowly | `PatternMatcher{PREFIX: /MS/przpurchase}` present | PASS |
| Domain ownership | Production domain remains verified | Android listed `com.prizmenergy.mobile` as `VERIFIED` owner | PASS |
| Exact URL activity candidates | Prizm is eligible for the literal HTTPS URL | Prizm `MainActivity` and Chrome were listed; Prizm is the verified owner | PASS |
| Debug APK exact URL launch | Android opens installed app | `Activity: com.prizmenergy.mobile/.MainActivity` | PASS |
| Release APK exact URL launch | Embedded production app opens | `Status: ok`; `Activity: com.prizmenergy.mobile/.MainActivity` | PASS |
| Native route parser | Record ID is preserved | Exact URL resolved to `/(tabs)/approvals/payment_request/1211` | PASS |
| Destination data boundary | Native screen attempts authenticated record load | Expired emulator JWT produced `Unauthenticated`; Chrome was not opened | PASS WITH TEST-ACCOUNT LIMITATION |

## 4. Automated Quality Gates

| Check | Result |
|---|---|
| Release metadata | PASS — v1.15.1, Android versionCode 32 |
| TypeScript | PASS — `npx tsc --noEmit -p tsconfig.json` |
| Expo dependency alignment | PASS — dependencies up to date |
| Mobile contract tests | PASS — exact App Link, routing, auth, filters, schemas, purchasing, and module contracts |
| CRUD contract audit | PASS — 303 advertised mutations, 0 skipped |
| List contract audit | PASS — 107 filterable lists and 59 sortable endpoints, 0 skipped |
| Android debug build | PASS — x86_64 APK assembled and installed |
| Android release build | PASS — 40,222,555-byte local release APK assembled and installed |
| Git whitespace check | PASS |
| GitHub rolling release | PASS — workflow `30719192704`; Android build 25m52s; Pages deploy 38s |
| Published APK integrity | PASS — 91,549,412 bytes; SHA-256 `c656b2c6aadb26cd0344ade2c6af499291a54a6124a81f5931b64d9cd24bf8c0` |
| Published APK install | PASS — v1.15.1, versionCode 32, expected signing fingerprint |
| Published APK exact URL retest | PASS — cold launch selected Prizm `MainActivity` in 1.36 seconds |

### Acceptance Criteria

| Severity | Criterion | Result |
|---|---|---|
| S1 | The exact Payment Request URL opens the installed Prizm app | 100% PASS locally |
| S1 | Record `1211` maps to the native Payment Request route | 100% PASS |
| S1 | Production domain ownership remains verified | 100% PASS |
| S2 | Unrelated website and upload paths remain unclaimed | 100% PASS |
| S1 | Signed published APK contains and exercises the fix | 100% PASS |

**Implementation, automated contracts, local builds, production workflow, signed APK, and exact-URL emulator handoff gates pass. No open Blocker, Major, or Minor defect remains in scope.**

## 5. Code, Git, and Deployment

| Item | Evidence |
|---|---|
| Mobile implementation commit | `ea292bb` |
| Mobile branch | `codex/fix-przpurchase-app-links` |
| Release version | v1.15.1 / Android versionCode 32 |
| Main deployment | `origin/main` at `ea292bb` |
| GitHub workflow | `30719192704` — completed successfully |
| Rolling APK | `latest/prizm-mobile.apk` — published, hash-checked, installed, and exercised |
| Rollback | Revert `ea292bb` and republish v1.15.0 |

## 6. Sign-off

| Role | Name | Status | Date |
|---|---|---|---|
| QA automation | Codex | Implementation, contracts, local builds, workflow, signed APK, and exact URL handoff PASS | 2026-08-02 |
| Product reviewer | Osama Hassan | Reported the exact production Payment Request URL | 2026-08-02 |

Generated under Prizm QA/QC Policy. Classification: Internal.
