# QC Report — Site Report Image Storage Compatibility

## Report Header

| Field | Value |
|---|---|
| Report Code | `PE-QAQC-QC-RPT-26009-R01` |
| Session ID | `report-image-path-emulator-20260730` |
| Date / Time | `2026-07-30 01:52:32 +04:00` |
| Agent / Model | `Codex / GPT-5` |
| Workspace | `C:\wamp64\www\prizm-mobile` |
| Branch | `codex/fix-report-image-path` |
| Classification | Internal |

## 1. Executive Summary

The web application moved site-report photos from the module assets directory to the per-report uploads directory. The mobile app still assembled every photo URL with the legacy module path, so newly stored photos returned HTTP 404 even though the web UI displayed them.

The mobile resolver now uses `uploads/prizm_reports/{report-id}/images/{filename}` first and retries `modules/prizm_reports/assets/images/{filename}` for legacy and older mobile-uploaded photos. It also uses the selected environment's upload base instead of hardcoding production.

## 2. Root Cause Evidence

| Request | Production result | Interpretation |
|---|---:|---|
| `/MS/uploads/prizm_reports/327/images/dsr_photo_1.jpg` | HTTP 200, `image/jpeg`, 148,354 bytes | Current web storage location |
| `/MS/modules/prizm_reports/assets/images/dsr_photo_1.jpg` | HTTP 404 | Mobile's released hardcoded URL |
| Web MVC | Builds the uploads URL and checks the legacy file as fallback | Ground-truth behavior mirrored by mobile |

No backend or database change was required.

## 3. Test Results

| # | Check | Evidence | Result |
|---|---|---|---|
| 1 | New production image URL | HTTP 200; JPEG; 148,354 bytes | PASS |
| 2 | Released mobile URL | HTTP 404 reproduced | PASS |
| 3 | Android emulator — new storage | Real report 327 photo rendered; `New path: loaded` | PASS |
| 4 | Android emulator — legacy fallback | Legacy-only photo rendered after first candidate failed | PASS |
| 5 | Environment-aware resolution | Uses `getCurrentEnvironment().uploadsBase` | PASS |
| 6 | TypeScript | `npx tsc --noEmit -p tsconfig.json` | PASS |
| 7 | Expo SDK alignment | `npx expo install --check` | PASS |
| 8 | Mobile contracts | `npm run test:contracts` | PASS |
| 9 | CRUD contract audit | 303 mutations; 0 skipped | PASS |
| 10 | List contract audit | 107 searchable/filterable; 59 sortable; 0 skipped | PASS |
| 11 | Release metadata | `1.14.2`, Android versionCode `28` | PASS |
| 12 | Patch integrity | `git diff --check`; diagnostic login UI removed | PASS |
| 13 | GitHub release pipeline | Run `30494216969`; Android build and Pages deployment | PASS |
| 14 | Rolling APK publication | `prizm-mobile.apk`; 91,541,760 bytes; HTTP 200 | PASS |

### Acceptance Criteria

| Severity | Criterion | Result |
|---|---|---|
| S1 | A report photo saved in the new per-report uploads directory renders on Android | 100% PASS |
| S1 | Existing legacy report photos remain visible | 100% PASS |
| S2 | Detail thumbnails, lightbox source, edit preview, and review preview use the resolver | 100% PASS |
| S2 | Development and local environments do not resolve against production storage | 100% PASS |

**QC and deployment gates: PASS. No open Blocker, Major, or Minor defects in scope.**

## 4. Code Changes

| File | Purpose |
|---|---|
| `lib/report-images.ts` | Environment-aware current + legacy report-image candidates |
| `lib/queries/reports.ts` | Export the shared resolver and remove the hardcoded production URL |
| `components/reports/ReportDetailScreen.tsx` | Retry legacy storage and open the source that actually loaded |
| `components/reports/ReportEditScreen.tsx` | Retry legacy storage in edit and review previews |
| `scripts/test-mobile-contracts.mjs` | Lock the new path, relative-path handling, and fallback behavior |
| Release metadata | Patch `1.14.2`, Android versionCode `28` |

## 5. Git and Deployment

| Item | Status |
|---|---|
| Base commit | `298b36b2ea938c5d15a6221a81846c67d48c0e25` |
| Fix commit | `0ffbecb39d420ea6d1315fd8f80e9f24c00ad6d0` |
| GitHub push | PASS — commit is on `origin/main` |
| GitHub Actions Android build | PASS — run `30494216969` |
| Rolling APK release | PASS — `latest/prizm-mobile.apk`, 91,541,760 bytes, build `0ffbecb` |
| Rollback | Revert the mobile commit; no backend, schema, or data mutation |

## 6. Sign-off

| Role | Name | Status | Date |
|---|---|---|---|
| QA automation | Codex | Local, production-read, emulator, and deployment gates PASS | 2026-07-30 |
| Product reviewer | Osama Hassan | Reported the mobile/web image mismatch | 2026-07-30 |

Generated under Prizm QA/QC Policy. Classification: Internal.
