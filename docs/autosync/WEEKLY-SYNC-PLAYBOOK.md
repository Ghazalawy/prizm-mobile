# Weekly mobile sync — playbook

Executed every Saturday by a fresh Claude Code cloud session (Routine
"Weekly mobile sync"). Goal: whatever staff can do on the web ERP this week,
they can do in the mobile app, and nothing that worked last week breaks.

Read first: `CLAUDE.md` (READ-WEB-FIRST, auth contract, release checklist),
`docs/autosync/QC-PHILOSOPHY.md`, `autosync/policy.json`.

## Hard rules

- Work on branch `autosync/<YYYY-MM-DD>` in Ghazalawy/prizm-mobile. Never push
  to `main` directly.
- Never edit QC infrastructure (gates, workflows, `scripts/lib/`, this file,
  `autosync/policy.json`). CI rejects it on `autosync/*` branches. If a gate is
  wrong, say so in the weekly report; a human-led session fixes it.
- Never delete or weaken an assertion. Never add a baseline entry to make a
  gate pass, except under step 6 rules (backend pin moved, reason, `since`).
- Never guess a table, id column or permission rule. Read the web controller,
  model and view template first (CLAUDE.md, READ-WEB-FIRST). Write what you
  read into the contract evidence.
- Backend (PrizmIT/prizm331) changes only through a branch in the Ghazalawy
  fork and a PR to PrizmIT/prizm331 `main`. Merge or deploy them only if
  `autosync/policy.json` says `backend.autoMerge` / `backend.autoDeploy` is true.
- Ship fewer things completely rather than many half-done. A screen without
  its routing, contract, regression test and live-smoke coverage is not done.
- Report faithfully. A blocked week is reported as blocked, with the reason.

## 0. Set up

```bash
cd /home/user/prizm-mobile && git fetch origin main && git checkout -B autosync/$(date -u +%F) origin/main
npm ci --no-audit --no-fund --legacy-peer-deps
```

Attach and clone the backend (add_repo PrizmIT/prizm331, read access), then
make sure the pinned commit is present:

```bash
PIN=$(jq -r .backend.syncedSha autosync/state.json)
git -C /home/user/prizm331 fetch --depth=1000 origin main
git -C /home/user/prizm331 cat-file -e "$PIN^{commit}" || git -C /home/user/prizm331 fetch origin "$PIN"
NEW=$(git -C /home/user/prizm331 rev-parse origin/main)
export PRIZM_BACKEND_WORKSPACE=/home/user/prizm331
```

The cloud environment cannot reach `ms.prizm-energy.com` unless that host is
allowed in its network settings. The live smoke therefore runs in GitHub
Actions; locally run it with `--allow-missing-credentials` only to check that
it starts.

## 1. Baseline health (before touching anything)

Open issues titled `Release blocked on release PC: …` are priority 1: the last
merged version never reached staff. Read the log tail in the issue, fix the
cause on this run's branch, and reference the issue in the PR.


`git -C /home/user/prizm331 checkout --detach "$PIN"`, then `npm run qc:all`.
It must be green.
If it is not, main is broken: fixing that is this week's first item.

## 2. Detect what changed on the web

```bash
RUN=autosync/runs/$(date -u +%F)
npm run diff:web-surface -- --from "$PIN" --to "$NEW" --out-json $RUN/delta.json --out-md $RUN/delta.md
git -C /home/user/prizm331 checkout --detach "$NEW"
npm run test:deeplinks -- --report > $RUN/deeplinks-at-new-backend.txt || true
npm run test:contracts && npm run test:crud-contracts && npm run test:list-contracts || true
```

New gate failures at `$NEW` are defects the backend change introduced for
mobile. They are priority 1.

## 3. Triage (write `$RUN/plan.md`)

Classify every delta item, and every new gate failure, into exactly one bucket:

| Bucket | Meaning | Action this run |
|---|---|---|
| P1 defect | Gate fails at the new backend (wiring, contract, CRUD/list drift) | Fix in mobile |
| P2 actionable | Approvals or status actions staff need on the go, with an existing API | Build |
| P3 new screen | Web screen or module whose REST API already exists | Build (within `maxFeatureItemsPerRun`) |
| P4 needs API | Web feature with no REST endpoint | Open a backend PR adding the endpoint (Purchase_api / Mobile_parity_api / module API pattern), then the mobile half next week once merged and deployed |
| No mobile impact | Admin settings, cron, AI ops, docs, assets, web-only tooling | Record the reason in one line |

After the delta, burn down at least `minBaselineBurnDownPerRun` entries of
`qc/deeplink-wiring-baseline.json` (approval-type links first, such as
`prizmbudget/request_advance_cash`), and re-verify a few "not re-verified"
contracts in `qc/record-link-contracts.json` (rewrite the evidence as
"Verified <date>: …").

## 4. Execute (per item)

1. READ-WEB-FIRST: controller action, model query (exact table names), view
   template permission conditions, user-facing number column.
2. Mobile: registry entry (`lib/module-registry.ts`) or bespoke screen;
   routing pattern (`lib/native-routing.ts`) for every web URL and
   notification link of the feature; permissions via `permissionFeature`.
   Every fetch goes through `apiRequest` / `buildAuthHeaders()`.
3. Contracts: each new record link gets a `qc/record-link-contracts.json`
   entry with `Verified …` evidence (web table, mobile endpoint table).
4. Tests: add cases to `scripts/test-deeplink-regressions.mjs` for each fixed
   or added link, and to `scripts/test-mobile-contracts.mjs` for new endpoint
   contracts. Additions only.
5. After fixes: `npm run test:deeplinks -- --prune` so fixed baseline entries
   are removed (the gate fails if you forget).

## 5. Release metadata

User-facing change → bump `package.json`, `package-lock.json` (both version
fields), `app.json` (`expo.version`, `expo.android.versionCode` + 1), and a new
top `CHANGELOG.json` entry. Use minor for new screens, patch for fixes only.
Highlights are written for staff, not engineers. No user-facing change → no
bump and no release.

## 6. Move the backend pin

Set `autosync/state.json` `backend.syncedSha` to `$NEW` and `syncedAt` to now,
then fill `lastRun`. If a new backend link cannot be wired this run (P4),
and only then, add its entry to the baseline with
`reason` (≥ 20 chars, naming the plan item) and `since: "$NEW"`. The QC
integrity gate allows baseline growth only in a change that moves the pin.

## 7. Verify locally

With the backend at `$NEW`: `npm run qc:all` green,
`npx expo install --check` green, `node scripts/check-version-bump.mjs origin/main HEAD`
and `BRANCH_NAME=autosync/$(date -u +%F) node scripts/check-qc-ratchet.mjs origin/main HEAD`
green. Re-read the diff adversarially before pushing.

## 8. Pull request and merge

Commit (one commit per logical item is fine), push, open a PR to `main`:
title `autosync: week of <date> — v<version>` (or `— no release`), body =
`$RUN/delta.md` summary, the plan table, what shipped, what was deferred and
why, evidence. Subscribe to PR activity.

The repository is private and hosted minutes are billed, so the only hosted
check on the PR is **QC Integrity**. Merge (merge commit) only when all of
these hold and `autosync/policy.json` `mobile.autoMerge` is true:

- step 7 passed locally on the pushed head commit (paste the command output
  summary into the PR body as evidence);
- the QC Integrity check is green on that head commit.

A red check or a red local gate is work: fix it and push. Never merge red.
Do not trigger the manual `Quality Gates` / `Build APK` workflows; they spend
billed minutes and exist for when the release PC is down.

After the merge, the release PC watcher (every 2 h while the DSO PC is on)
runs every gate again, including the live API smoke the cloud session may not
be able to reach, then publishes `v<version>` to
`Ghazalawy/prizm-mobile-releases`. Phones show the in-app update banner on
next launch. If the watcher fails, it opens a "Release blocked" issue (step 1
of next week's run).

## 9. Backend PRs (P4)

Branch in the Ghazalawy/prizm331 fork named
`feat/mobile-api-<scope>-autosync`, PR to PrizmIT/prizm331 `main` following
its PR template (documentation impact declaration) and its gates. Drive it to
green. Merge and run "Deploy On Demand" only if the policy allows. Otherwise
list it under "Waiting on backend merge/deploy" in the report. The mobile half
ships in a later run, after the live smoke shows the endpoint is in production.

## 10. Weekly report

Write `$RUN/report.md` (committed in the PR) and, if `notify.weeklyIssue` is
true, open an issue in Ghazalawy/prizm-mobile titled
`Weekly mobile sync <date>: <shipped | no release | BLOCKED>` with: version
shipped, items shipped, defects fixed, baseline before → after, items deferred
with reasons, backend PRs opened, anything blocked and what is needed. Do this
on blocked weeks too.
