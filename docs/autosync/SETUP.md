# Autosync — one-time setup

The gates fail closed, so nothing releases until these are in place.

## 1. Create the public releases-only repository

Create `Ghazalawy/prizm-mobile-releases` (public, initialised with a README,
no source code). The app's update banner and the APK download link read its
releases. A private repository's releases are invisible to the app's
anonymous update check, so they cannot live in the private source repo.

## 2. Release PC (DSO PC)

Follow "Unattended releases: the watcher" in `docs/LOCAL-ANDROID-RELEASE.md`:
`gh auth login` + `gh auth setup-git`, the QA account environment variables
(`PRIZM_QA_EMAIL`, `PRIZM_QA_PASSWORD`, read-only live smoke), and the
scheduled task. Run the task under a Windows account without production SSH
keys: it executes whatever is merged to `main`.

## 3. Seed the live-smoke baseline (once, on the DSO PC)

Pre-existing production failures in the module sweep would block the first
release:

```powershell
node scripts/smoke-live-api.mjs --bootstrap-baseline "Known live failure at gate introduction; weekly sync must burn it down"
git add qc/live-smoke-baseline.json; git commit -m "qc: seed live smoke baseline"
```

Failures of items users can tap (inbox, notifications) are never seeded: they
block releases until fixed. Only a human branch can seed. The QC Integrity
check rejects re-creating a baseline later, or seeding one from `autosync/*`.

## 4. Merge `claude/weekly-mobile-sync-cron-rony12`, release, then go private

1. Merge the branch into `main`. The watcher publishes v1.18.2 to both the
   releases repo and `Ghazalawy/prizm-mobile`.
2. Wait until staff have updated to v1.18.2. Installs on older versions poll
   `Ghazalawy/prizm-mobile` and only see updates there while it is public.
3. Then make the source repo private: Settings → General → Danger Zone →
   Change visibility. Anyone still on an older build reinstalls once from
   `https://github.com/Ghazalawy/prizm-mobile-releases/releases/latest`.

Going private does not retract what was already public: clones, forks and
caches of the history remain.

## 5. Optional

- **Hosted fallback secrets** (only for the manual `Build APK (manual
  fallback)` / `Quality Gates` workflows): `PRIZM331_READ_TOKEN` (Contents:
  read on PrizmIT/prizm331), `PRIZM_QA_EMAIL`, `PRIZM_QA_PASSWORD`,
  `RELEASES_TOKEN` (Contents: read/write on the releases repo).
- **Network access for the cloud environment**: allow `ms.prizm-energy.com`
  and `api.expo.dev`, so the weekly session can run the live smoke and the
  dependency check before it merges, not only on the DSO PC.
- **Watch releases** of `Ghazalawy/prizm-mobile-releases` in the GitHub mobile
  app (Watch → Custom → Releases) for a phone notification per version, in
  addition to the in-app banner.
- **Backend autonomy** is off by default (`autosync/policy.json`).
- **Download page**: GitHub Pages from a private repo needs a paid plan. Host
  `pages/index.html` in the releases repo if you want the QR/download page.
