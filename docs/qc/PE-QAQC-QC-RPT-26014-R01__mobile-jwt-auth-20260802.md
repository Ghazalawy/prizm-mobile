# QC Report — Mobile JWT Identity and Native Authentication

## Report Header

| Field | Value |
|---|---|
| Report Code | `PE-QAQC-QC-RPT-26014-R01` |
| Session ID | `mobile-jwt-auth-20260802` |
| Date / Time | `2026-08-02 02:23 +04:00` |
| Agent / Model | `Codex / GPT-5` |
| Backend workspace | `C:\wamp64\www\prizm331-wt-mobile-jwt-auth` |
| Mobile workspace | `C:\wamp64\www\prizm-mobile-app-link-fix` |
| Backend branch | `fix/mobile-jwt-staff-resolution-DESKTOP-9GO5QC0` |
| Mobile branch | `codex/native-parity-continuation` |
| Turns | Current task continuation |
| Classification | Internal |

## 1. Executive Summary

A freshly issued, cryptographically valid mobile JWT could authenticate at the REST filter but still receive HTTP 401 from hand-written controllers. Those controllers resolved staff only through the exact token stored in `tbluser_api`; a self-validating JWT is not guaranteed to be present there. The Payment Request deep-link reproduction exposed the contradiction: `/api/my/tasks-summary` accepted the token while `/api/purchase_api/payment_requests/1211` returned `Unauthenticated`.

The backend now delegates Purchase, Inbox, Admin, My, and the shared mobile-parity helper to `api_resolve_real_staff_from_token()`, which resolves Perfex session staff, legacy token-table identity, then the validated JWT email. The shared helper also covers Tasks, Reports, Opportunities, Materials, and mobile-parity controllers. Mobile invalid-token handling now treats authenticated HTTP 401 as session expiry, preserves sessions on permission HTTP 403 and CSRF HTTP 419, recognizes the legacy JWT HTTP 404 messages, and removes the five-second grace window that masked genuine post-login failures.

The mobile task row was also rebuilt as a compact information card: the priority accent has a fixed gutter, long titles wrap without collision, internal `erp_dev` metadata is hidden, and a meaningful linked record remains visible. Release v1.15.2/code 33 was built locally, installed on the Android emulator, and the reported Payment Request URL opened the native app on a cold start through a verified Android App Link.

## 2. Authentication and CSRF Contract

| Contract | Evidence | Result |
|---|---|---|
| Native auth does not post to an admin login form | Mobile uses `mobile_auth.php`, then `/api/login/auth` fallback | PASS |
| REST login is outside browser CSRF enforcement | `application/config/config.php` excludes `api\/.+` | PASS |
| REST login accepts JSON POST and mints JWT | Explicit route to `Login::login_api`; contract inspection covers request method, JSON input, and `JWT::encode` | PASS |
| HTTP 403 does not sign out | Mobile contract assertion | PASS |
| HTTP 419 does not sign out | Mobile contract assertion | PASS |
| Authenticated HTTP 401 signs out immediately | Mobile session-generation regression assertion | PASS |
| Legacy JWT HTTP 404 is recognized | `Signature verification failed` and `Wrong number of segments` assertions | PASS |

## 3. Backend Verification

| Check | Result |
|---|---|
| Failing-first baseline | 53/58 existing contracts passed; exactly five new JWT resolver contracts failed |
| Resolver implementation | 61/61 Daleela MCP/API contracts passed after implementation |
| PHP syntax | PASS for 5 changed implementation files, test, changelog, and developer documentation |
| Fork CI | PASS — workflow `30720992774`, PHP 8.3 contracts |
| Fork PR | PASS — `Ghazalawy/prizm331#310`, merged as `cc848afa` |
| Upstream PR | PASS — `PrizmIT/prizm331#1192`, merged as `b14e6fac` |
| Production deploy | PASS — on-demand workflow `30721136898`; production HEAD `b14e6fac67` |
| Fresh JWT production matrix | PASS — a valid, deliberately unstored JWT returned HTTP 200 from My/Profile, Inbox, Admin/Me, Payment Request 1211, and Tasks |
| Git whitespace | PASS |

## 4. Mobile Verification

| Check | Result |
|---|---|
| Mobile contract suite | PASS — auth, Perfex multi/logical filters, App Links, native routing, schemas, purchasing, and module contracts |
| TypeScript | PASS — `npx tsc --noEmit -p tsconfig.json` |
| Invalid token production probe | HTTP 404 `Wrong number of segments` reproduced on My and Purchase endpoints and is now classified correctly |
| Immediate fresh-session 401 | PASS — generation guard ignores stale requests while current-session 401 fires immediately |
| Emulator session transition | REPRODUCED — the previous false 401 cleared the stored session and routed to Login |
| Fresh JWT production API matrix | PASS — five authenticated production endpoint families returned HTTP 200 |
| Fingerprint security/runtime contracts | PASS — authenticated SecureStore vault, device-only accessibility, biometric enrollment, OS authentication prompt, device fallback, and cross-account vault clearing |
| Fingerprint re-sign-in with a real account | NOT RUN — emulator contains no saved test-account biometric vault; no production password was created or reset |
| Multi-filter regressions | PASS — On Hold + Cancelled, AND/OR, negative, and range combinations |
| Task-card visual QA | PASS — production component rendered on emulator; accent gutter, wrapping, metadata suppression, and linked-record display verified; temporary fixture removed |
| Local signed release APK | PASS — v1.15.2/code 33, 91,543,032 bytes, SHA-256 `9b3ba8f50d073633151e6b7a1557db658d69a6441026b9c4de8d146a4bda39fd` |
| Installed package | PASS — emulator reports v1.15.2/code 33 |
| Exact Payment Request App Link | PASS — cold launch handled by `com.prizmenergy.mobile/.MainActivity`; domain state verified |

## 5. Acceptance Criteria

| Severity | Criterion | Result |
|---|---|---|
| S1 | Valid fresh JWT resolves the same staff identity across hand-written API families | 100% PASS in contracts and production |
| S1 | Native sign-in is independent of browser CSRF cookie/token state | 100% PASS |
| S1 | 403 permission and 419 CSRF responses never erase the mobile session | 100% PASS |
| S1 | Current-session 401 immediately returns the user to Login | 100% PASS |
| S2 | Biometric vault behavior remains device-bound and authentication-gated | 100% automated contract PASS; real-account manual exercise unavailable |
| S2 | Multi-filter logic and task-card presentation are regression-protected | 100% PASS |
| S2 | Auth behavior is documented and regression-protected | 100% PASS |

**Pre-publication quality gate: PASS. Backend production verification and local signed-APK emulator verification are complete. GitHub rolling-release publication and verification of that exact published artifact remain before final sign-off.**

## 6. Code, Git, Deployment, and Rollback

| Item | Evidence |
|---|---|
| Backend implementation commit | `eb39adf84` |
| Fork merge | `cc848afa` |
| Upstream merge | `b14e6fac` via `PrizmIT/prizm331#1192` |
| Production deployment | PASS — workflow `30721136898`; HEAD `b14e6fac67` |
| Local mobile release candidate | PASS — v1.15.2/code 33 installed and exercised on emulator |
| GitHub mobile release | Pending implementation commit and rolling-release workflow |
| Backend rollback | Revert `eb39adf84`, merge through the same PR workflow, deploy on demand |
| Mobile rollback | Revert v1.15.2 and republish v1.15.1 |

## 7. Sign-off

| Role | Name | Status | Date |
|---|---|---|---|
| QA automation | Codex | Backend production and local signed-release gates PASS; published artifact pending | 2026-08-02 |
| Product reviewer | Osama Hassan | Requested fingerprint, CSRF, emulator, and production verification | 2026-08-02 |

Generated under Prizm QA/QC Policy. Classification: Internal.
