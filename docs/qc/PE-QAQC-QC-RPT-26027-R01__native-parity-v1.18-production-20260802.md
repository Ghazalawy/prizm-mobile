# QC Report — Native Parity v1.18 Production Release

## Report Header

| Field | Value |
|---|---|
| Report Code | PE-QAQC-QC-RPT-26027-R01 |
| Session ID | native-parity-v1.18-production-20260802 |
| Date / Time | 2026-08-02 20:28 +04:00 |
| Agent / Model | Codex / GPT-5 |
| Backend workspace | C:/wamp64/www/prizm331-wt-mobile-parity-next |
| Mobile workspace | C:/wamp64/www/prizm-mobile-release-ci-hotfix |
| Backend release | PrizmIT/prizm331 main at 45895ef7fc8906fc854b56a725d98e884d3bdc75 |
| Mobile release | Ghazalawy/prizm-mobile main at ecd0892acadc8ea171b52626d5e5becf1c609e52 |
| Turns | Continuous native-parity and deployment task chain |
| Classification | Internal |

## 1. Executive Summary

The consolidated native administration and purchasing checkpoint is deployed. The backend candidate was merged through the required fork/upstream chain and the production deployment workflow passed. Android v1.18.0, versionCode 36, was built locally from the exact synchronized mobile `main`, signed with the certificate associated with production `assetlinks.json`, installed on `emulator-5554`, and smoke-tested with the exact Payment Request 1211 HTTPS App Link before publication.

The rolling APK release now contains the native parity work for Setup administration, Roles, Departments and activity, Custom Fields, Email Templates, Supplier Invoices, Gate Pass Request Manager, Payment Request detail recovery, universal `/MS` App Links, additive multi-value filters, and Perfex advanced logical filters. Release publication used the local guarded path and did not trigger a new GitHub-hosted Android build.

Scoped release quality is PASS. The wider native-parity programme remains OPEN: the static audit reports 111 of 347 web destinations mapped to native screens, with 236 static destinations missing and four dynamic expressions unresolved.

## 2. Deployment Results

| Target | Evidence | Result |
|---|---|---|
| Backend fork PR | Ghazalawy/prizm331 #321 | PASS — merged |
| Backend upstream PR | PrizmIT/prizm331 #1200 | PASS — merged as 45895ef7fc8906fc854b56a725d98e884d3bdc75 |
| Backend CI | GitHub run 30754815885, PHP 8.3 | PASS |
| Production deployment | Deploy On Demand run 30754870469 | PASS |
| Mobile parity PR | Ghazalawy/prizm-mobile #7 | PASS — merged as e98e61625b60ef4d17cc7a13c7f45099170442ca |
| Local release hardening | Mobile PRs #8 and #9 | PASS — merged |
| Mobile release source | `main` at ecd0892acadc8ea171b52626d5e5becf1c609e52 | PASS — exact origin/main |
| Android release | v1.18.0 / versionCode 36 | PASS — locally built and published |
| Rolling release | `latest`, asset `prizm-mobile.apk` | PASS — updated 2026-08-02 16:25:20Z |
| Hosted Android build | Latest workflow remained run 30732511640 at older c06f94d | PASS — no new hosted run |

## 3. Test Results

| Check | Evidence | Result |
|---|---|---|
| Backend PHP syntax | All changed PHP sources | PASS |
| Broad backend contract | Daleela aggregate | PASS — 96/96 |
| Email Templates contract | Dedicated suite | PASS — 7/7 |
| Supplier Invoice contract | Dedicated suite | PASS — 11/11 |
| Supplier Invoice runtime | Real HTTP/API/database suite | PASS — 12/12, fixtures cleaned |
| Gate Pass contract | Dedicated suite | PASS |
| Gate Pass runtime | Real HTTP/API/database suite | PASS — 12/12, fixtures cleaned |
| App Link backend contract | Dedicated suite | PASS — 11/11 |
| Release metadata | `npm run verify:release` | PASS — v1.18.0/code36 |
| Expo dependencies | `npx expo install --check` | PASS |
| TypeScript | `npx tsc --noEmit -p tsconfig.json` | PASS |
| Mobile contracts | `npm run test:contracts` | PASS |
| List contract audit | Server search/filter/sort contracts | PASS — 123 server + 2 client searchable, 125 filterable, 78 sortable, 0 skipped |
| CRUD contract audit | Advertised mutations versus backend methods | PASS — 360, 0 skipped |
| Web-menu parity audit | Existing native routes | 111/347; 236 missing; 4 dynamic unresolved |
| Production association | `/.well-known/assetlinks.json` | PASS — HTTP 200 |
| Payment Request web handoff | Exact record 1211 URL | PASS — HTTP 307 handoff and emulator App Link smoke test |

## 4. Android Artifact Verification

| Property | Verified value | Result |
|---|---|---|
| File | `prizm-mobile.apk` | PASS |
| Size | 91,697,024 bytes | PASS |
| SHA-256 | BA162C57CB5E951F3DC55BFE267687E47A40C477A3C8A663F40A86B98A8E1794 | PASS — local and release digest match |
| Signing SHA-256 | FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C | PASS — matches production association |
| Installed package | `com.prizmenergy.mobile` | PASS |
| Installed version | versionName 1.18.0; versionCode 36 | PASS |
| Intent registration | HTTPS/HTTP, `ms.prizm-energy.com`, prefix `/MS`, autoVerify | PASS |
| Exact smoke URL | `/MS/przpurchase/Payment_Request/view_payment_request/1211` | PASS — handled by Prizm MainActivity |

## 5. Acceptance Criteria

| Severity | Criterion | Result |
|---|---|---|
| S1 | Backend release is merged, tested, and deployed through the approved chain | 100% PASS |
| S1 | Published APK is built from synchronized `main` and cryptographically verified | 100% PASS |
| S1 | Exact Payment Request App Link resolves into the installed app | 100% PASS |
| S1 | Additive direct filters and multi-rule Perfex AND/OR contracts remain intact | 100% PASS |
| S1 | Runtime mutation fixtures are fully cleaned | 100% PASS |
| S2 | Release metadata and installed package version agree | 100% PASS |
| S2 | Local release avoids a new hosted Android workflow | 100% PASS |
| Programme | Every Perfex web destination has a native screen | OPEN — 111/347 static destinations covered |

Scoped release gate: PASS. Production deployment gate: PASS. Overall native-parity programme: OPEN.

## 6. Code and Release Provenance

### Backend

- Parity commits include Supplier Invoice `f7b847e4e`, Gate Pass Request `cb9aa2a50`, and consolidated merge `1ef3bc075`.
- Fork PR: `Ghazalawy/prizm331#321`.
- Upstream PR: `PrizmIT/prizm331#1200`.
- Production merge: `45895ef7fc8906fc854b56a725d98e884d3bdc75`.

### Mobile

- Release metadata commit: `3d3cfe8`.
- Parity merge PR: `Ghazalawy/prizm-mobile#7`, merge `e98e61625b60ef4d17cc7a13c7f45099170442ca`.
- Keytool warning hardening: PR #8, merge `5bc45912418712be52fa63fd5cdccfb5467a131a`.
- Windows Android SDK discovery: PR #9, merge `ecd0892acadc8ea171b52626d5e5becf1c609e52`.
- Public APK: `https://github.com/Ghazalawy/prizm-mobile/releases/download/latest/prizm-mobile.apk`.

The documents skill was used to follow the required Markdown/HTML/PDF QC workflow. The local release path materially reduced deployment cost by preventing an additional hosted Android workflow and preserving Gradle build artifacts for subsequent releases.

## 7. Residual Risk and Follow-up

- Static native coverage remains 111/347. The remaining 236 static destinations and four dynamic expressions are documented by `npm run audit:web-parity`; they are not represented as complete.
- Fingerprint sign-in and CSRF/JWT separation were covered by the earlier v1.15.2 production and contract report; the v1.18.0 regression suite passed, but this release session did not add a physical-device biometric enrollment exercise.
- The first clean local build took approximately 26 minutes because Expo regenerated Android and compiled native C++/Hermes ABIs. The Gradle cache now exists locally, while GitHub-hosted build minutes remained unused.
- The generated APK is signed by the established certificate already declared in production `assetlinks.json`. Rotation would require coordinated APK and website association updates.
- User-owned `artifacts/` in the feature worktree was not modified.

## 8. Sign-Off

| Role | Status |
|---|---|
| Engineering / Codex | PASS — implementation, merge, build, emulator smoke test, and publication complete |
| QA/QC | PASS — scoped production release |
| Deployment | PASS — backend and Android release live |
| Product owner | Overall parity acceptance remains open |
