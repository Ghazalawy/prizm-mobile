# Local Android release (primary path)

The production APK is built and published on the release PC (DSO PC), never
on GitHub-hosted runners: the repository is private and hosted minutes are
billed. Publication goes to the public releases-only repository
`Ghazalawy/prizm-mobile-releases` (one `v<version>` release per version,
marked latest), which the in-app update banner reads. During the move to a
private source repo the script also publishes to `Ghazalawy/prizm-mobile`, so
installs still polling the old location are offered the build once.

## Unattended releases: the watcher

`scripts/release-android-watch.ps1` is meant for Windows Task Scheduler. Each
run: fetch `origin/main`; if its `package.json` version already has a release
in the releases repo, exit; otherwise reset a dedicated clone to `origin/main`,
start the emulator if needed, run `release-android-local.ps1 -Publish`, and on
failure open (or update) a `Release blocked on release PC: v<version>` issue.
A commit that failed is not retried until `main` moves (or `-Retry`).

One-time setup on the DSO PC:

```powershell
# 1. Tools already used by local releases: Node 20, JDK 17, Android SDK + an AVD, git, gh.
gh auth login            # account with push to Ghazalawy/prizm-mobile and Ghazalawy/prizm-mobile-releases
gh auth setup-git        # lets git clone the private source repo
# 2. Live API smoke credentials (read-only QA staff account), user-level environment variables:
[Environment]::SetEnvironmentVariable("PRIZM_QA_EMAIL", "qa@prizm-energy.com", "User")
[Environment]::SetEnvironmentVariable("PRIZM_QA_PASSWORD", "<password>", "User")
# 3. Schedule the watcher every 2 hours while you are signed in (the emulator needs a desktop session):
schtasks /Create /TN "Prizm Mobile Release Watch" /SC HOURLY /MO 2 /RL LIMITED /TR `
  "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\prizm-release\prizm-mobile\scripts\release-android-watch.ps1 -AvdName <your_avd_name> -BackendWorkspace C:\wamp64\www\prizm331"
# First run clones C:\prizm-release\prizm-mobile; clone it once by hand first so the path above exists:
git clone https://github.com/Ghazalawy/prizm-mobile.git C:\prizm-release\prizm-mobile
```

Security: the watcher executes whatever is on `main`, including code merged by
the unattended weekly sync, and `npm ci` runs package install scripts. Run the
scheduled task under a Windows account that does **not** hold the Hetzner root
SSH key or other production credentials.

Logs: `C:\prizm-release\logs\watch-*.log`. State: `C:\prizm-release\release-watch-state.json`.

## Safety contract

- Complete native parity and the session QC gate first.
- Update `CHANGELOG.json`, `package.json`, `app.json`, and `lib/build-info.ts` together.
- Run only from a clean worktree. Untracked evidence under `artifacts/` is allowed; tracked changes are not.
- Build candidates may come from a task branch, but `-Publish` is accepted only from local `main` exactly matching `origin/main`.
- Publishing requires an Android emulator/device serial. The script installs the exact APK and verifies the production Payment Request App Link before upload.
- Backend gates run against the commit pinned in `autosync/state.json`, checked out in a temporary worktree of `-BackendWorkspace` (local backend work cannot break or falsely pass a release). `-UseBackendAsIs` is for candidate builds only.
- Publishing also requires the read-only live API smoke (`PRIZM_QA_EMAIL` / `PRIZM_QA_PASSWORD`) and, since the previous release, the release-bump and QC-integrity checks.
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

The script creates the `v<version>` release (or replaces its APK) in each repository of `-ReleaseRepos`, marked latest, with the CHANGELOG highlights as notes. It does not start a GitHub Actions workflow.

## GitHub fallback

Use **Build APK (manual fallback)** only when the release PC is unavailable. It runs the same gates on hosted runners (billed minutes) and needs the `RELEASES_TOKEN` secret to publish to the releases repo.
