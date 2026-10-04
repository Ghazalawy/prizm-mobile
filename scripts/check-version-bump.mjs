#!/usr/bin/env node
/**
 * Release-bump gate (diff-scoped, like prizm331's Changelog Gate).
 *
 * A change that alters what staff run on their phones must ship as a new
 * version: package.json/app.json version above the base, a higher Android
 * versionCode, and a new CHANGELOG.json top entry. Otherwise the APK is never
 * rebuilt (the release workflow keys on the version), the in-app update
 * banner never fires, and What's New shows last release's notes.
 *
 * Usage: node scripts/check-version-bump.mjs <base-ref> [head-ref]
 */
import { execFileSync } from "node:child_process";

const [baseRef = "origin/main", headRef = "HEAD"] = process.argv.slice(2);
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const readJson = (ref, file) => {
  try { return JSON.parse(git("show", `${ref}:${file}`)); } catch { return null; }
};

const USER_FACING = [
  /^app\//,
  /^components\//,
  /^lib\/(?!build-info\.ts$)/,
  /^assets\//,
  /^app\.json$/,
  /^patches\//,
  /^global\.css$/,
  /^tailwind\.config\.js$/,
  /^babel\.config\.js$/,
  /^metro\.config\.js$/,
];

const changed = git("diff", "--name-only", `${baseRef}...${headRef}`).split("\n").filter(Boolean);
const userFacing = changed.filter((file) => USER_FACING.some((re) => re.test(file)));
const depsChanged = (() => {
  const before = readJson(baseRef, "package.json");
  const after = readJson(headRef, "package.json");
  return JSON.stringify(before?.dependencies ?? {}) !== JSON.stringify(after?.dependencies ?? {});
})();

if (!userFacing.length && !depsChanged) {
  console.log(`✓ Release-bump gate: no user-facing change (${changed.length} files) — no version bump required.`);
  process.exit(0);
}

const semver = (value) => String(value ?? "0.0.0").split(/[.-]/).slice(0, 3).map((part) => Number(part) || 0);
const greater = (a, b) => {
  const [x, y] = [semver(a), semver(b)];
  for (let index = 0; index < 3; index += 1) if (x[index] !== y[index]) return x[index] > y[index];
  return false;
};

const basePkg = readJson(baseRef, "package.json") ?? {};
const headPkg = readJson(headRef, "package.json") ?? {};
const baseApp = readJson(baseRef, "app.json") ?? {};
const headApp = readJson(headRef, "app.json") ?? {};
const headChangelog = readJson(headRef, "CHANGELOG.json") ?? {};
const baseChangelog = readJson(baseRef, "CHANGELOG.json") ?? {};

const errors = [];
if (!greater(headPkg.version, basePkg.version)) {
  errors.push(`package.json version ${headPkg.version} must be greater than ${basePkg.version}`);
}
const baseCode = Number(baseApp.expo?.android?.versionCode ?? 0);
const headCode = Number(headApp.expo?.android?.versionCode ?? 0);
if (!(headCode > baseCode)) errors.push(`app.json expo.android.versionCode ${headCode} must be greater than ${baseCode}`);
const top = headChangelog.releases?.[0];
if (!top || top.version !== headPkg.version) errors.push(`CHANGELOG.json top entry must be ${headPkg.version}`);
if (top && baseChangelog.releases?.[0]?.version === top.version) errors.push("CHANGELOG.json needs a NEW top entry, not an edited old one");
if (top && (!Array.isArray(top.highlights) || top.highlights.length === 0 || !top.title)) {
  errors.push("CHANGELOG.json top entry needs a title and at least one highlight (it becomes What's New)");
}

if (errors.length) {
  console.error(`✗ Release-bump gate: ${userFacing.length} user-facing file(s)${depsChanged ? " and runtime dependencies" : ""} changed without a release bump:`);
  for (const error of errors) console.error(`  ✗ ${error}`);
  console.error(`  changed: ${userFacing.slice(0, 12).join(", ")}${userFacing.length > 12 ? ", …" : ""}`);
  process.exit(1);
}
console.log(`✓ Release-bump gate: ${basePkg.version} → ${headPkg.version} (versionCode ${baseCode} → ${headCode}).`);
