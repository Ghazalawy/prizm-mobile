# Autosync — one-time setup

The gates fail closed, so nothing releases until these are in place.

## 1. Repository secrets (Ghazalawy/prizm-mobile → Settings → Secrets and variables → Actions)

| Secret | Value | Used by |
|---|---|---|
| `PRIZM331_READ_TOKEN` | Fine-grained PAT, resource owner **PrizmIT**, repository `prizm331`, permission **Contents: Read-only** | Backend contracts & deeplink wiring gate (checks out prizm331 at the pinned commit) |
| `PRIZM_QA_EMAIL` | A staff account dedicated to QA, with the permissions a typical approver has | Live API smoke |
| `PRIZM_QA_PASSWORD` | Its password | Live API smoke |

The live smoke only sends GET requests (plus the sign-in). It never prints
record contents. CI logs and artifacts of this public repository are public.

## 2. Seed the live-smoke baseline (once)

Pre-existing production failures in the module sweep would block the first
release. Seed them once, from a machine that can reach `ms.prizm-energy.com`:

```bash
PRIZM_QA_EMAIL=… PRIZM_QA_PASSWORD=… \
  node scripts/smoke-live-api.mjs --bootstrap-baseline "Known live failure at gate introduction; weekly sync must burn it down"
git add qc/live-smoke-baseline.json && git commit -m "qc: seed live smoke baseline"
```

Failures of items users can tap (inbox, notifications) are never seeded: they
block releases until fixed. Only a human branch can seed. The QC integrity gate
rejects re-creating a baseline later, or seeding one from an `autosync/*` branch.

## 3. Merge `claude/weekly-mobile-sync-cron-rony12` into `main`

The Saturday Routine stops with a "BLOCKED — autosync system not merged"
issue until the playbook exists on `main`. The merge also releases v1.18.2
(notification routing fixes) once the secrets exist.

## 4. Recommended

- **Branch protection on `main`** (public repos support it on the free plan):
  require the Quality Gates checks. The release workflow already refuses to
  publish without them; branch protection also keeps `main` itself green.
- **Network access for the cloud environment**: add `ms.prizm-energy.com`
  (and `api.expo.dev` for `expo install --check`) to the environment's allowed
  domains so the weekly session can run the live smoke and dependency check
  before opening its PR, not only in CI.
- **Watch releases** of Ghazalawy/prizm-mobile in the GitHub mobile app
  (Watch → Custom → Releases) for a phone notification per new version, in
  addition to the in-app update banner.
- **Backend autonomy** is off by default (`autosync/policy.json`). The loop
  opens prizm331 PRs but does not merge or deploy them. Flip `backend.autoMerge`
  / `backend.autoDeploy` yourself if you want that.
