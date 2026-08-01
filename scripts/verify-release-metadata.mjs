#!/usr/bin/env node
/**
 * Release metadata gate — run before push and in CI.
 * Ensures CHANGELOG top version matches package.json + app.json so
 * Settings → Changelog and WhatsNewModal never ship stale notes.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), "utf8"));
}

const pkg = readJson("package.json");
const packageLock = readJson("package-lock.json");
const app = readJson("app.json");
const changelog = readJson("CHANGELOG.json");

const pkgVersion = pkg.version;
const lockVersion = packageLock.version;
const lockRootVersion = packageLock.packages?.[""]?.version;
const appVersion = app.expo?.version;
const versionCode = app.expo?.android?.versionCode;
const changelogTop = changelog.releases?.[0]?.version;
const changelogDate = changelog.releases?.[0]?.date;
const nativeGradlePath = join(root, "android", "app", "build.gradle");
const nativeGradle = existsSync(nativeGradlePath) ? readFileSync(nativeGradlePath, "utf8") : "";
const nativeVersionCode = nativeGradle.match(/\bversionCode\s+(\d+)/)?.[1];
const nativeVersionName = nativeGradle.match(/\bversionName\s+["']([^"']+)["']/)?.[1];

const errors = [];

if (!pkgVersion) errors.push("package.json: missing version");
if (!appVersion) errors.push("app.json: missing expo.version");
if (versionCode == null) errors.push("app.json: missing expo.android.versionCode");
if (!changelogTop) errors.push("CHANGELOG.json: missing releases[0].version");
if (!changelogDate) errors.push("CHANGELOG.json: missing releases[0].date");

if (pkgVersion && appVersion && pkgVersion !== appVersion) {
  errors.push(`version mismatch: package.json=${pkgVersion} app.json=${appVersion}`);
}
if (pkgVersion && (lockVersion !== pkgVersion || lockRootVersion !== pkgVersion)) {
  errors.push(
    `package-lock.json versions (${lockVersion || "missing"}, ${lockRootVersion || "missing"}) ` +
      `must match package.json (${pkgVersion})`
  );
}
if (pkgVersion && changelogTop && pkgVersion !== changelogTop) {
  errors.push(
    `CHANGELOG top version (${changelogTop}) must match package.json (${pkgVersion}). ` +
      "Add a new top entry in CHANGELOG.json on every user-facing release."
  );
}
if (typeof versionCode !== "number" || versionCode < 1) {
  errors.push(`app.json versionCode must be a positive integer (got ${versionCode})`);
}
if (nativeGradle) {
  if (nativeVersionName !== appVersion) {
    errors.push(`native Android versionName (${nativeVersionName || "missing"}) must match app.json (${appVersion})`);
  }
  if (Number(nativeVersionCode) !== versionCode) {
    errors.push(`native Android versionCode (${nativeVersionCode || "missing"}) must match app.json (${versionCode})`);
  }
}

if (errors.length) {
  console.error("verify-release-metadata: FAIL\n");
  for (const e of errors) console.error(`  • ${e}`);
  console.error("\nFix: bump package.json + app.json version, increment versionCode, add CHANGELOG.json top entry.");
  process.exit(1);
}

console.log(
  `verify-release-metadata: OK  v${pkgVersion}  versionCode=${versionCode}  changelog=${changelogTop} (${changelogDate})`
);
