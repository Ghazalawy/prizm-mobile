#!/usr/bin/env node
/**
 * Regression tests for lib/biometric-policy.ts — the decision layer behind
 * fingerprint sign-in.
 *
 * Why this file exists: v1.14 shipped a login screen that showed nothing but
 * email + password to users who had fingerprint sign-in switched on, and gave
 * them no way to fix it from inside the app. Every case below is a state a
 * real device was in when that happened.
 *
 * The policy module has no imports, so it is transpiled in-process with the
 * TypeScript compiler already used by `npx tsc --noEmit` — no test runner and
 * no new dependency, and it runs on the Node 20 the build uses.
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "lib", "biometric-policy.ts"), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const outFile = join(mkdtempSync(join(tmpdir(), "biometric-policy-")), "policy.mjs");
writeFileSync(outFile, outputText);

const {
  VAULT_FAILURE_LIMIT,
  classifyVaultFailure,
  deriveBiometricGate,
  normalizeBiometricAccount,
  resolveBiometricOffer,
  shouldKeepVaultForAccount,
  shouldShowBiometricButton,
} = await import(pathToFileURL(outFile).href);

let failures = 0;
let checks = 0;

function check(label, actual, expected) {
  checks++;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.error(`  ✗ ${label}\n      expected ${e}\n      actual   ${a}`);
  }
}

function section(name) {
  console.log(`\n${name}`);
}

const gate = (available, optedIn, hasVault) =>
  deriveBiometricGate({ available, optedIn, hasVault });

// ── The reported bug ────────────────────────────────────────────────────
// Device upgraded from a build that stored only the opt-in flag: the user had
// fingerprint login ON, has been asked about it before, and has no credential.
section("upgraded install (opt-in flag, no stored credential)");
const upgraded = gate(true, true, false);
check("gate reports it can't sign in yet", upgraded.canSignIn, false);
check("gate flags it as recoverable", upgraded.needsReenrollment, true);
check(
  "no fingerprint button while there is nothing to sign in with",
  shouldShowBiometricButton(upgraded, false),
  false,
);
check(
  "…but the app offers to restore it, even though it already asked once",
  resolveBiometricOffer(upgraded, true),
  "reenroll",
);
check(
  "…and the app-open unlock still applies while a token is present",
  shouldShowBiometricButton(upgraded, true),
  true,
);
// After the user confirms their password once, the button comes back.
const restored = gate(true, true, true);
check("restored device shows the button", shouldShowBiometricButton(restored, false), true);
check("restored device is not offered again", resolveBiometricOffer(restored, true), null);

section("deriveBiometricGate");
check("opted in + vault → can sign in", gate(true, true, true).canSignIn, true);
check("vault without opt-in → cannot", gate(true, false, true).canSignIn, false);
check("no opt-in is never a repair case", gate(true, false, false).needsReenrollment, false);
check("vault present is never a repair case", gate(true, true, true).needsReenrollment, false);
// The invariant the v1.14 regression broke: wanting the feature always leaves
// exactly one of "works" / "repairable" true, so there is never a dead end.
for (const available of [true, false]) {
  const g = gate(available, true, false);
  check(
    `opted in (available=${available}) always has a path forward`,
    g.canSignIn || g.needsReenrollment,
    true,
  );
}

section("shouldShowBiometricButton");
check("no hardware/enrolment → hidden", shouldShowBiometricButton(gate(false, true, true), false), false);
check("token present needs only the opt-in", shouldShowBiometricButton(gate(true, true, false), true), true);
check("no token needs the credential", shouldShowBiometricButton(gate(true, true, false), false), false);
check("no token, full setup → shown", shouldShowBiometricButton(gate(true, true, true), false), true);
check("never offered when switched off", shouldShowBiometricButton(gate(true, false, true), true), false);

section("resolveBiometricOffer");
check("never asked, nothing set up → first-time", resolveBiometricOffer(gate(true, false, false), false), "first-time");
check("already asked, still not set up → silent", resolveBiometricOffer(gate(true, false, false), true), null);
check("working setup is never re-offered", resolveBiometricOffer(gate(true, true, true), false), null);
check("no biometric hardware → never offered", resolveBiometricOffer(gate(false, true, false), false), null);

section("shouldKeepVaultForAccount");
check("same account survives", shouldKeepVaultForAccount("staff@prizm-energy.com", "staff@prizm-energy.com"), true);
check("case and spacing don't matter", shouldKeepVaultForAccount("staff@prizm-energy.com", "  Staff@Prizm-Energy.com "), true);
check("a different account is discarded", shouldKeepVaultForAccount("other@prizm-energy.com", "staff@prizm-energy.com"), false);
check("an unclaimed credential is discarded", shouldKeepVaultForAccount(null, "staff@prizm-energy.com"), false);
check("normalizer is consistent", normalizeBiometricAccount(" Staff@Prizm-Energy.COM "), "staff@prizm-energy.com");

section("classifyVaultFailure");
check("limit is above 1 so a single cancel is forgiven", VAULT_FAILURE_LIMIT > 1, true);
for (let n = 1; n < VAULT_FAILURE_LIMIT; n++) {
  check(`${n} failure(s) → cancelled`, classifyVaultFailure(n), "cancelled");
}
check(`${VAULT_FAILURE_LIMIT} failures → unusable`, classifyVaultFailure(VAULT_FAILURE_LIMIT), "unusable");
check("past the limit stays unusable", classifyVaultFailure(VAULT_FAILURE_LIMIT + 5), "unusable");

if (failures) {
  console.error(`\ntest-biometric-policy: FAIL — ${failures}/${checks} checks failed`);
  process.exit(1);
}
console.log(`\ntest-biometric-policy: OK — ${checks} checks passed`);
