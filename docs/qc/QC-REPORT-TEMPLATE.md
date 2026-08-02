# QC Report — Full Native Parity Release v1.17.0

## Report Header

| Field | Value |
|---|---|
| Report Code | `PE-QAQC-QC-RPT-26017-R01` |
| Session ID | `full-native-parity-release-20260802` |
| Date / Time | `2026-08-02 08:09 +04:00` |
| Agent / Model | `Codex / GPT-5` |
| Backend workspace | `C:\wamp64\www\prizm331-wt-full-native-parity` |
| Mobile workspace | `C:\wamp64\www\prizm-mobile-app-link-fix` |
| Backend branch | `feat/mobile-full-native-parity-DESKTOP-9GO5QC0` |
| Mobile branch | `codex/full-native-parity-continuation` |
| Classification | Internal |

## 1. Executive Summary

Prizm Mobile v1.17.0 completes the current native parity batch and fixes the reported additive-filter failure. Selecting **On Hold** and then **Cancelled** now produces the union of both statuses. Custom Perfex funnel rules combine correctly with the status chips using AND/OR logic, exclusions, date ranges, and search.

Task cards now separate the priority rail from their text and suppress the internal `erp_dev` relation key. Detail pages identify the module at the top and pack short metadata fields into dense two-column layouts. Site-report uploads now use Hetzner's canonical `uploads/prizm_reports/{report}/images` tree while the mobile resolver retains the legacy fallback.

The exact Payment Request URL is mapped to the native Payment Request detail route and the production browser bridge explicitly targets `com.prizmenergy.mobile` when a browser bypasses normal Android App Link resolution.

## 2. Test Results

| Check | Evidence | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit -p tsconfig.json` | PASS |
| Expo dependency matrix | `npx expo install --check` | PASS |
| Independent production APK build | Gradle `assembleRelease`; 696 tasks | PASS |
| Release metadata | v1.17.0 / Android versionCode 35 | PASS |
| List contract audit | 105 server-searchable + 2 client-searchable; 107 filterable; 60 sortable | PASS |
| CRUD contract audit | 308 advertised mutations; zero unresolved endpoints | PASS |
| Mobile contracts | Auth, CSRF behavior, filters, routing, purchasing, OTP, automation, materials, estimate requests | PASS |
| Admin parity batch | Native administration contract batch | PASS |
| PHP syntax | 48 modified PHP files | PASS |
| Daleela API contracts | `87/87` | PASS |
| Projects multi-status emulator | On Hold only = 4; On Hold + Cancelled = 5 | PASS |
| Projects custom AND emulator | Status in On Hold/Cancelled AND Billing Type = Fixed Rate = 4 | PASS |
| Projects logical runtime matrix | AND, OR, `not_in`, date range, text search, multi-status | PASS |
| Customers logical runtime matrix | Inactive predicate and inactive OR Dubai exact union | PASS |
| Tasks logical runtime matrix | Status OR priority exact union = 13,700 | PASS |
| Purchase Requests runtime matrix | Multi current-status exact union = 1,529 | PASS |
| Payment Requests runtime matrix | Multi current-status exact union = 1,178 | PASS |
| Payment Request details | Local authenticated detail and approval endpoints | HTTP 200 / 200 |
| Report image resolution | New per-report image URL with spaces encoded | HTTP 200 image/jpeg |
| Exact HTTPS App Link | Android resolver selects `com.prizmenergy.mobile/.MainActivity` | PASS |
| Forced-Chrome bridge | Chrome launched exact URL; live bridge foregrounded Prizm sign-in | PASS |
| Browser bridge | Live page contains package intent, manual button, and loop-safe opt-out | HTTP 200 / PASS |
| Browser opt-out | `prizm_web=1` continues normal web authentication | HTTP 307 / PASS |
| Backend deployment | GitHub on-demand run `30731664609` | PASS |

## 3. Acceptance Criteria

| Severity | Criterion | Result |
|---|---|---|
| S1 | Status chips remain additive and return the exact union | 100% PASS |
| S1 | Custom AND/OR funnel rules preserve all selected rules | 100% PASS |
| S1 | Native authentication remains JWT-based and REST calls remain outside browser CSRF enforcement | 100% PASS |
| S1 | Exact ERP links enter the installed app or use the explicit browser bridge | 100% PASS |
| S2 | Task cards do not collide and do not expose `erp_dev` | 100% PASS |
| S2 | Opened records clearly identify their module and use dense layouts | 100% PASS |
| S2 | New and legacy report-image paths remain readable | 100% PASS |
| S2 | Advertised search/filter/sort and mutation contracts resolve to backend implementations | 100% PASS |

**Quality gate: PASS.**

## 4. Code, Git, and Deployment

| Item | Evidence |
|---|---|
| Backend implementation | `e42429f5da30d8ce70d37e2a923bfb9360c3c4d4` |
| Backend fork PR | `Ghazalawy/prizm331#315` — merged as `3f9bcf238` |
| Backend upstream PR | `PrizmIT/prizm331#1197` — merged as `f94a2528bd6071106e2eaa4428ad8f3c7daae507` |
| Backend production | Hetzner `/var/www/html/MS` at `f94a2528bd6071106e2eaa4428ad8f3c7daae507` |
| Mobile implementation | `74ce4d265b7e301638cd803240d2edb2cf98c541` |
| Mobile PR | `Ghazalawy/prizm-mobile#4` — merged as `a83f365647790301c252c23c809533cd384b4dd7` |
| Android release | v1.17.0 / versionCode 35; GitHub Actions run `30731645014` passed |
| Published APK | SHA-256 `d5592221603c034583dc3959ee9165f9d9732292e1c3c4795f82907d6f35b030` |
| Rollback | Revert upstream PR #1197 and mobile PR #4 through their normal repository workflows |

## 5. Emulator and Production Evidence

- Multi-status result: `artifacts/prizm-onhold-cancelled.png`.
- Combined status and Billing Type funnel: `artifacts/prizm-filter-combined-results.png`.
- Task card spacing and labels: `artifacts/qa-tasks2.png`.
- Dense Payment Request detail: `artifacts/qa-prdetail2.png`.
- Dense Project detail: `artifacts/qa-projectdetail.png`.
- Published v1.17.0 exact-link result: `artifacts/published-v117-exact-link.png`.
- Emulator: `emulator-5554`.
- No production password was reset and no privileged production token was fabricated.
- A temporary local-only QA token, local API selection, and release cleartext allowance were removed before commit; emulator app data was cleared before production installation.

## 6. Sign-off

| Role | Name | Status | Date |
|---|---|---|---|
| QA automation | Codex | PASS — static, runtime, emulator, CI, and production evidence captured | 2026-08-02 |
| Product reviewer | Osama Hassan | Reported filter/UI/link defects and authorized deployment | 2026-08-02 |

Generated under Prizm QA/QC Policy. Classification: Internal.
