# CI Failure Lessons Learned — prizm-mobile

**Last updated:** 2026-05-29  
**Classification:** Internal — Engineering  
**Purpose:** Prevent repeat CI failures by encoding root causes and mandatory pre-push gates.

---

## Failure Register

| # | Date | Commits | Root Cause | Symptom | Fix Commits |
|---|---|---|---|---|---|
| 1 | 2026-05-29 | `09483ce`, `6573588` | Expo dep drift — `expo install --check` fails after SDK version changes, even on doc-only commits | CI fails at "Validate Expo dependency matrix" step | `8cbdbd5`, `591fa838` (bump expo deps) |
| 2 | 2026-05-29 | `614aece`, `6ac72ab` | Untracked dependency files — 19 files imported by tracked screens were never `git add`ed. TypeScript passed locally (files on disk) but failed in CI (files absent) | CI fails at "TypeScript check" step — module resolution errors | `17ea33f` (add missing deps), `54bc837` (expo-font plugin) |

---

## Root Cause Analysis

### Trap 1: The Local-vs-CI Gap

Every CI failure traces to the same gap: **what passes locally does not pass in CI because the local environment has state that the CI checkout does not.**

| Local State | CI State | Result |
|---|---|---|
| Untracked files exist on disk | Files absent from Git checkout | TypeScript: module not found |
| `node_modules` from prior installs | Fresh `npm install` with different resolutions | `expo install --check` drift |
| Staged but uncommitted changes | Only committed files | Missing app.json plugin, missing filter configs |

### Trap 2: The "Doc Commit" Surprise

Doc-only or config-only commits (`09483ce` — QC template, `62d5f98` — AGENTS.md trap doc) trigger a full CI pipeline even though they change zero source code. Any pre-existing CI breakage (like Expo dep drift) surfaces on the NEXT push regardless of what that push contains.

---

## Mandatory Pre-Push Gate

**Before EVERY `git push origin main`, execute these checks in order:**

### Gate 1: Git Working Tree Audit
```bash
git status --porcelain
```
- Red flag: any ` M` (unstaged modified) or `?? ` (untracked) file that is **imported by any tracked `.ts`/`.tsx` file**.
- Action: `git add` those files and commit them BEFORE pushing.

### Gate 2: Import Closure Check
```bash
# Find all imports in tracked files, verify every import target is also tracked
npx tsc --noEmit
```
- Must pass with ZERO errors. Any error blocks the push.

### Gate 3: Expo Matrix Check
```bash
npx expo install --check
```
- Must pass. If it fails, run `npx expo install --fix` first, commit the `package.json`/`package-lock.json` changes, then re-check.

### Gate 4: Commit Completeness
- If Gate 1 found unstaged files that are imported, they MUST be committed.
- If Gate 3 required `--fix`, the resulting `package.json` changes MUST be committed.
- Never push with a dirty working tree.

---

## When CI Still Fails

If CI fails despite passing all gates locally:

1. **Do NOT** make blind fix commits. Read the CI log first.
2. Check the GitHub Actions "Annotations" tab — it shows the exact error line.
3. If it's a file-not-found error → missing import target. Check if the file is tracked (`git ls-files <path>`).
4. If it's an Expo dep error → run `npx expo install --check` locally and compare versions.
5. After fixing, re-run ALL four gates before pushing the fix.

---

## Traps to Never Repeat

| Trap | Detection | Prevention |
|---|---|---|
| Local-only untracked files imported by tracked code | Gate 1 + Gate 2 | Always `git add` new files when they're created; never leave `??` imports |
| Expo dep drift surfacing on unrelated commits | Gate 3 | Run `expo install --check` before EVERY push, not just when touching deps |
| Staged-but-uncommitted changes (like `app.json`) | Gate 1 | `git diff --cached` before pushing; commit or stash |
| TypeScript passes locally but fails in CI | Gate 2 | `npx tsc --noEmit` with `--noEmit` flag — same flag CI uses |

---

*This document updates every time CI fails for a new reason. If you're reading this because CI just failed, check if your failure matches an existing trap before adding a new one.*
