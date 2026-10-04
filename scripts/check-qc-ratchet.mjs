#!/usr/bin/env node
/**
 * QC integrity gate — stops a change from passing by loosening the gates.
 *
 * With no human reviewer in the weekly loop, the cheapest way to "fix" a red
 * gate is to edit the gate or grow its baseline. This check makes both visible
 * and, for automated branches, impossible:
 *
 *   1. Baselines (qc/*-baseline.json) may only shrink — except in a change that
 *      moves the backend pin (autosync/state.json). Even then every added entry
 *      needs a reason (>= 20 chars) and `since` = the new pinned backend SHA,
 *      so a deferred gap is recorded against the backend change that caused it.
 *   2. qc/record-link-contracts.json: a new contract, or a changed `screen`,
 *      must carry evidence starting with "Verified " (the web controller and
 *      the mobile endpoint were read). Bulk "not re-verified" entries are
 *      allowed only where they already existed.
 *   3. Branches named autosync/* (the unattended loop) may not modify QC
 *      infrastructure at all: gate scripts, workflows, this file.
 *
 * Usage: node scripts/check-qc-ratchet.mjs <base-ref> [head-ref]
 *        BRANCH_NAME env (or GITHUB_HEAD_REF) identifies automated branches.
 */
import { execFileSync } from "node:child_process";

const [baseRef = "origin/main", headRef = "HEAD"] = process.argv.slice(2);
const branch = process.env.BRANCH_NAME || process.env.GITHUB_HEAD_REF || "";

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function readJson(ref, file, fallback) {
  try {
    return JSON.parse(git("show", `${ref}:${file}`));
  } catch {
    return fallback;
  }
}

try {
  git("rev-parse", "--verify", `${baseRef}^{commit}`);
} catch {
  console.error(`QC integrity: base ref ${baseRef} is not available (fetch it with enough depth).`);
  process.exit(2);
}

const errors = [];
const notes = [];

const baseState = readJson(baseRef, "autosync/state.json", {});
const headState = readJson(headRef, "autosync/state.json", {});
const basePin = baseState?.backend?.syncedSha || null;
const headPin = headState?.backend?.syncedSha || null;
const pinMoved = Boolean(headPin && headPin !== basePin);

// 1. Baselines only shrink.
for (const file of ["qc/deeplink-wiring-baseline.json", "qc/live-smoke-baseline.json"]) {
  const before = readJson(baseRef, file, { entries: [] });
  const after = readJson(headRef, file, { entries: [] });
  const pairs = (doc) => new Set(doc.entries.flatMap((entry) =>
    (entry.codes ?? [entry.code]).map((code) => `${entry.key}\u0000${code}`)));
  const beforePairs = pairs(before);
  const added = after.entries.filter((entry) =>
    (entry.codes ?? [entry.code]).some((code) => !beforePairs.has(`${entry.key}\u0000${code}`)));
  const removed = before.entries.length - after.entries.filter((entry) =>
    before.entries.some((old) => old.key === entry.key)).length;
  if (removed > 0) notes.push(`${file}: ${removed} entr(ies) burned down`);
  if (!added.length) continue;
  if (!pinMoved) {
    errors.push(`${file}: ${added.length} new baseline entr(ies) without a backend pin move — fix the defect instead:\n${added.map((e) => `    + ${e.key}`).join("\n")}`);
    continue;
  }
  for (const entry of added) {
    if (!entry.reason || entry.reason.length < 20) errors.push(`${file}: "${entry.key}" needs a reason of at least 20 characters`);
    if (entry.since !== headPin) errors.push(`${file}: "${entry.key}" must record since=${headPin} (the backend commit that introduced it)`);
  }
  notes.push(`${file}: ${added.length} gap(s) deferred against backend ${headPin?.slice(0, 9)}`);
}

// 2. Record-link contracts need verification evidence when added or moved.
const baseContracts = readJson(baseRef, "qc/record-link-contracts.json", null);
if (!baseContracts) {
  notes.push("qc/record-link-contracts.json introduced in this change (bootstrap; existing mappings recorded as not re-verified)");
} else {
  const before = new Map(baseContracts.contracts.map((c) => [c.template, c]));
  const after = readJson(headRef, "qc/record-link-contracts.json", { contracts: [] }).contracts;
  for (const contract of after) {
    const old = before.get(contract.template);
    if (old && old.screen === contract.screen) continue;
    if (!/^Verified /.test(contract.evidence || "")) {
      errors.push(`qc/record-link-contracts.json: "${contract.template}" ${old ? `moved ${old.screen} -> ${contract.screen}` : "added"} without "Verified ..." evidence naming the web controller/model and the mobile endpoint tables`);
    }
  }
}

// 3. Automated branches cannot touch QC infrastructure.
const QC_INFRA = [
  /^scripts\/test-deeplink-wiring\.mjs$/,
  /^scripts\/smoke-live-api\.mjs$/,
  /^scripts\/check-qc-ratchet\.mjs$/,
  /^scripts\/verify-release-metadata\.mjs$/,
  /^scripts\/lib\//,
  /^scripts\/ci\//,
  /^scripts\/check-version-bump\.mjs$/,
  /^scripts\/diff-web-surface\.mjs$/,
  /^\.github\/workflows\//,
  /^docs\/autosync\/QC-PHILOSOPHY\.md$/,
  /^docs\/autosync\/WEEKLY-SYNC-PLAYBOOK\.md$/,
  /^autosync\/policy\.json$/,
];
const changed = git("diff", "--name-only", `${baseRef}...${headRef}`).split("\n").filter(Boolean);
const touchedInfra = changed.filter((file) => QC_INFRA.some((re) => re.test(file)));
if (touchedInfra.length && branch.startsWith("autosync/")) {
  errors.push(`automated branch ${branch} modifies QC infrastructure (not allowed for the unattended loop):\n${touchedInfra.map((f) => `    ${f}`).join("\n")}`);
} else if (touchedInfra.length) {
  notes.push(`QC infrastructure changed by a non-automated branch: ${touchedInfra.join(", ")}`);
}

// 4. Automated branches may extend contract tests but never delete assertions.
if (branch.startsWith("autosync/")) {
  for (const file of changed.filter((f) => /^scripts\/(?:test|audit)-[\w-]+\.mjs$/.test(f))) {
    const removed = git("diff", "-U0", `${baseRef}...${headRef}`, "--", file)
      .split("\n")
      .filter((line) => line.startsWith("-") && !line.startsWith("---") && /\bassert(?:\.\w+)?\s*\(|\b(?:appLinkOpens|opens)\s*\(|process\.exit\(\s*1/.test(line));
    if (removed.length) {
      errors.push(`automated branch ${branch} removes ${removed.length} assertion line(s) from ${file}:\n${removed.slice(0, 8).map((line) => `    ${line.slice(0, 160)}`).join("\n")}`);
    }
  }
}

for (const note of notes) console.log(`• ${note}`);
if (errors.length) {
  console.error(`\n✗ QC integrity gate failed:\n${errors.map((e) => `  ✗ ${e}`).join("\n")}`);
  process.exit(1);
}
console.log(`✓ QC integrity gate passed (${changed.length} changed files, backend pin ${pinMoved ? `moved to ${headPin.slice(0, 9)}` : "unchanged"}).`);
