# QC Report — Native Admin Parity and Universal ERP App Links

## Report Header

| Field | Value |
|---|---|
| Report Code | `PE-QAQC-QC-RPT-26015-R01` |
| Session ID | `admin-parity-universal-links-20260802` |
| Date / Time | `2026-08-02 04:55 +04:00` |
| Agent / Model | `Codex / GPT-5` |
| Backend workspace | `C:\wamp64\www\prizm331-wt-mobile-admin-parity` |
| Mobile workspace | `C:\wamp64\www\prizm-mobile-app-link-fix` |
| Backend branches | `feat/mobile-native-admin-parity-DESKTOP-9GO5QC0`; `fix/cost-center-query-builder-DESKTOP-9GO5QC0` |
| Mobile branch | `codex/native-parity-continuation` |
| Turns | Current task continuation |
| Classification | Internal |

## 1. Executive Summary

Release v1.16.0/code 34 broadens the Android verified App Link from selected ERP paths to every HTTPS path under `https://ms.prizm-energy.com/MS`. Android Settings now includes a direct shortcut to the app's supported-link controls for Xiaomi/HyperOS and other devices that retain a browser preference. The exact reported Payment Request URL resolves to `com.prizmenergy.mobile/.MainActivity`, and the published APK contains the verified `/MS` intent filter.

The native administration batch adds Knowledge Base create/edit/delete and publish controls, a dense Survey Results tab, and Cost Center members, supervisors, and activity tabs. Backend controllers mirror the real Perfex models, permissions, storage tables, and web workflows. Lists accept allowlisted Perfex-style AND/OR advanced filters with typed, multi-select, range, negative, and dynamic-date operators.

Live production probing caught and prevented a Cost Center list regression before the APK shipped: `staff_can()` reset CodeIgniter's shared query builder, producing MySQL `No tables used`. The permission check now runs before list-query construction; a regression contract was added and the redeployed endpoint returns HTTP 200.

## 2. Backend Verification

| Check | Evidence | Result |
|---|---|---|
| PHP syntax | Advanced-filter helper plus Knowledge, Surveys, and Cost Centers controllers | PASS |
| Advanced-filter unit contract | `advanced_filters_contract_test.php` | PASS |
| API/web workflow contracts | Final Daleela suite | PASS — 72/72 |
| Knowledge production list | `/api/knowledge_api?limit=2` | HTTP 200 |
| Survey production list | `/api/surveys_api?limit=2` | HTTP 200; production currently has zero survey rows |
| Cost Center production list | Initial probe exposed HTTP 500; post-hotfix probe | HTTP 200 |
| Combined Knowledge filter | subject contains + active IN, AND | HTTP 200; 2 rules applied |
| Combined Survey filter | subject contains + sender contains, OR | HTTP 200; 2 rules applied |
| Dynamic Cost Center filter | created_at relative date + status IN, AND | HTTP 200; 2 rules applied |
| Invalid filter field | non-allowlisted `password` | HTTP 400 |
| Cost Center child reads | members, supervisors, activity | HTTP 200 for all three |
| Fork CI | Workflows `30724686469` and `30724943620` | PASS |
| Production PRs | `PrizmIT/prizm331#1193` and hotfix `#1194` | MERGED |
| Production deploys | Workflows `30724732433` and `30724970553` | PASS |
| Production HEAD | `4d257f54e5e6d4756be621129b5436c1c7ec0e2d` | VERIFIED |

## 3. Mobile Verification

| Check | Evidence | Result |
|---|---|---|
| Focused deployable parity suite | `npm run test:admin-parity` with clean backend source | PASS |
| TypeScript | `npx tsc --noEmit -p tsconfig.json` | PASS |
| Expo dependency matrix | `npx expo install --check` | PASS |
| Release metadata | `npm run verify:release` | PASS — v1.16.0/code34 |
| Local production release build | Gradle `assembleRelease`; 696 tasks | PASS in 3m36s |
| Local APK | 91,555,612 bytes; SHA-256 `5b51001b5076f6dcf3a5bd23dd5652d1594df1bf817c48f035df872c1a802d4a` | PASS |
| GitHub release workflow | `30725249245` | PASS |
| Published APK | 91,563,048 bytes; SHA-256 `3809566ecbb6f0640ba4baed702fd97224cec4b556bc2ef8e322a83f7e3b19f8` | PASS |
| Published version/signature | v1.16.0/code34; signer `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C` | PASS |
| Packaged App Link manifest | `autoVerify=true`, host `ms.prizm-energy.com`, pathPrefix `/MS` | PASS |
| Android domain state | `pm get-app-links`; production domain | VERIFIED |
| Exact Payment Request resolver | Published APK versus Chrome for `view_payment_request/1211` | Prizm match `0x508000`; Chrome `0x208000` |
| Published APK install | Emulator reports v1.16.0/code34 | PASS |

## 4. Acceptance Criteria

| Severity | Criterion | Result |
|---|---|---|
| S1 | Every `/MS` ERP HTTPS link is declared and verified for native Android handoff | 100% PASS |
| S1 | Exact Payment Request URL resolves to the installed production-signed app | 100% PASS |
| S1 | New client APIs are deployed before the APK and return authenticated production responses | 100% PASS |
| S1 | Invalid advanced-filter fields are rejected before database execution | 100% PASS |
| S2 | Combined AND, OR, multi-select, and dynamic-date filters survive production query execution | 100% PASS |
| S2 | Knowledge and Cost Center workflows mirror web models and permission checks | 100% contract PASS; read endpoints production-verified |
| S2 | Survey result aggregation handles production storage | 100% contract PASS; live result payload not exercised because production has no survey rows |
| S3 | Legacy monolithic parity suite represents deployable backend truth | Corrected source root; suite now honestly exposes older Contacts parity debt |

**Release quality gate: PASS for v1.16.0. The scoped release is built, deployed, production-probed, published, installed, and App-Link verified. Overall native-web parity remains an open programme goal; it is not falsely declared complete.**

## 5. Known Debt and Non-Regression Notes

- The legacy `test:contracts` suite stops at a pre-existing Contacts assertion for undeployed `global_list_get`. Before this correction it silently read a dirty prototype backend worktree. The focused v1.16.0 suite reads the clean deployable backend and passes.
- Production currently contains no surveys, so Survey Results could not be populated from a live record without creating test business data. Storage queries, routing, types, rendering, and response contracts pass.
- Authentication, CSRF classification, biometric vault, task-card, project multi-filter, and site-report image-path code were not modified in this release. Their previous evidence remains in report 26014; no real-account biometric credential was introduced for this session.
- Typing a URL manually into a browser address bar is browser navigation and may not trigger Android App Links. Tapping a link invokes Android resolution. Devices with a retained browser preference can use Settings → Open ERP links in Prizm CRM to enable supported links.

## 6. Code, Git, Deployment, and Rollback

| Item | Evidence |
|---|---|
| Backend implementation | `7767c42ea` |
| Backend production merge | `3b7991f0` via `PrizmIT/prizm331#1193` |
| Backend hotfix | `ae5e00912` |
| Backend hotfix production merge | `4d257f54` via `PrizmIT/prizm331#1194` |
| Mobile implementation | `d838c06` |
| Mobile main merge | `b0fe7af8` via `Ghazalawy/prizm-mobile#2` |
| Mobile rolling release | Workflow `30725249245`; `https://github.com/Ghazalawy/prizm-mobile/releases/latest` |
| Backend rollback | Revert the two backend production merges through the normal PR and deploy-on-demand path |
| Mobile rollback | Revert v1.16.0 and republish v1.15.2 |

## 7. Sign-off

| Role | Name | Status | Date |
|---|---|---|---|
| QA automation | Codex | Scoped release PASS; broader parity debt recorded | 2026-08-02 |
| Product reviewer | Osama Hassan | Requested exact-link correction, emulator verification, and deployment | 2026-08-02 |

Generated under Prizm QA/QC Policy. Classification: Internal.
