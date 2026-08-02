# Local Android release

The production APK is intentionally not built on every push. The GitHub workflow is a manual, cached fallback. The normal release path builds on the Windows workstation and uploads the verified APK directly to the rolling GitHub Release, consuming zero GitHub-hosted Actions minutes.

## Safety contract

- Complete native parity and the session QC gate first.
- Update `CHANGELOG.json`, `package.json`, `app.json`, and `lib/build-info.ts` together.
- Run only from a clean worktree. Untracked evidence under `artifacts/` is allowed; tracked changes are not.
- Build candidates may come from a task branch, but `-Publish` is accepted only from local `main` exactly matching `origin/main`.
- Publishing requires an Android emulator/device serial. The script installs the exact APK and verifies the production Payment Request App Link before upload.
- The generated keystore and completed APK must both match the SHA-256 certificate in `public/.well-known/assetlinks.json`. Any mismatch blocks publication.
- The script restores `.env` and `lib/build-info.ts` after the build, including after failures.

## Candidate build

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\release-android-local.ps1 `
  -BackendWorkspace C:\wamp64\www\prizm331-wt-mobile-parity-next `
  -DeviceSerial emulator-5554
```

This runs the Expo dependency check, synchronizes generated Android metadata, applies the release metadata gate, then runs TypeScript, mobile contracts, list/CRUD audits, web parity audit, certificate checks, Gradle build, APK signer verification, installation, and App-Link smoke test. It writes the candidate to `out/prizm-mobile.apk` but does not upload it.

## Final zero-minute publication

After the final candidate is merged and both local and remote `main` point to the same commit:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\release-android-local.ps1 `
  -BackendWorkspace C:\wamp64\www\prizm331 `
  -DeviceSerial emulator-5554 `
  -Publish
```

The script replaces the `prizm-mobile.apk` asset on the rolling `latest` release and updates its build metadata. It does not start a GitHub Actions workflow.

## GitHub fallback

Use **Build APK and Deploy Pages (manual fallback)** only when the local workstation is unavailable. The fallback is manual-only and restores Gradle caches, but it still consumes GitHub-hosted runner minutes.
