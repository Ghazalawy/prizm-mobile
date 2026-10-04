#!/usr/bin/env node
/**
 * Deeplink wiring gate.
 *
 * Proves that every link the ERP backend can put in front of a mobile user
 * opens a real, correct, actionable native screen. This is the class of bug
 * where a Payment Request notification opened a malformed page on mobile while
 * the same notification worked on the web.
 *
 * Inputs (read fresh every run, never hand-maintained):
 *   - every static `link` the backend writes into tblnotifications /
 *     tblapprovals (PHP source of PrizmIT/prizm331)
 *   - Inbox_api::_perfex_link_to_mobile_deeplink (ported from PHP each run)
 *   - literal deeplinks the inbox aggregator emits
 *   - the real lib/native-routing.ts, lib/module-registry.ts and app/ routes
 *
 * Each link is pushed through the three ways it reaches a phone:
 *   notification  raw link -> ActionCenter -> navigateInAppOrExternalLink
 *   approval      raw link -> Inbox_api translation -> navigateInAppOrExternalLink
 *   app-link      https://…/MS/admin/<link> -> Android App Link -> +native-intent
 *
 * Failure codes:
 *   NO_NATIVE_ROUTE    internal link with no native route (user gets the ERP
 *                      home grid and a "no exact native screen" toast)
 *   NO_SCREEN          route has no file under app/
 *   ERP_HOME_FALLBACK  lands on the ERP home grid
 *   UNKNOWN_MODULE     generic CRUD screen for a key not in MODULES
 *   NO_DETAIL_VIEW     record link into a module without a detail view
 *   NON_CANONICAL      generic screen used although a dedicated one exists
 *   RECORD_ID_LOST     record link whose id does not survive routing
 *   GENERIC_GUESS      record link resolved only by the controller-name
 *                      heuristic — the id may belong to a different table
 *   NO_DEEPLINK        inbox item type emitted without any deeplink
 *
 * Ratchet: known gaps live in qc/deeplink-wiring-baseline.json. New gaps fail.
 * Fixed-but-still-listed gaps also fail, so the baseline can only shrink.
 *
 * Usage:
 *   node scripts/test-deeplink-wiring.mjs              gate (CI)
 *   node scripts/test-deeplink-wiring.mjs --report     print every finding
 *   node scripts/test-deeplink-wiring.mjs --prune      drop fixed entries from the baseline
 *   node scripts/test-deeplink-wiring.mjs --json out.json
 */
import fs from "node:fs";
import path from "node:path";
import { resolveBackendWorkspace } from "./lib/backend-workspace.mjs";
import { SAMPLE_ID, extractBackendLinks, isExternalLink, loadInboxTranslator } from "./lib/backend-links.mjs";
import { inspectRoute, loadMobileContext, mobileWorkspace } from "./lib/mobile-surface.mjs";

const SITE = "https://ms.prizm-energy.com/MS";
const BASELINE_FILE = path.join(mobileWorkspace, "qc", "deeplink-wiring-baseline.json");
const CONTRACTS_FILE = path.join(mobileWorkspace, "qc", "record-link-contracts.json");
const args = process.argv.slice(2);
fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });

const backendWorkspace = resolveBackendWorkspace();
const context = await loadMobileContext();
const { routing } = context;
const { links, dynamicCount } = extractBackendLinks(backendWorkspace);
const inbox = loadInboxTranslator(backendWorkspace);

if (links.length < 40) {
  // The extractor finding almost nothing means the parser broke, not that the
  // backend stopped sending notifications. Fail rather than pass vacuously.
  console.error(`Deeplink wiring gate: only ${links.length} backend links extracted — extractor is broken.`);
  process.exit(2);
}

function evaluate(pipeline, link, resolved, { internal }) {
  const { route, via } = typeof resolved === "string" || resolved === null ? { route: resolved, via: "derived" } : resolved;
  const problems = [];
  if (!route) {
    if (internal) problems.push({ code: "NO_NATIVE_ROUTE", detail: "no native route; user gets the ERP home grid and a 'no exact native screen' toast" });
    return { route: null, problems };
  }
  const inspected = inspectRoute(context, route);
  problems.push(...inspected.problems);
  if (link.isRecord && !String(route).includes(SAMPLE_ID) && !problems.some((p) => p.code === "NO_SCREEN")) {
    problems.push({ code: "RECORD_ID_LOST", detail: "record link does not carry its id into the native route" });
  }
  if (link.isRecord && (via === "generic" || via === "hint")) {
    problems.push({
      code: "GENERIC_GUESS",
      detail: "record link resolved by the controller-name heuristic; add an explicit pattern after confirming in the web controller which table the id belongs to",
    });
  }
  return { route, file: inspected.file, screen: screenIdentity(inspected), problems };
}

/** "app/(tabs)/erp/[module]/[id]" + budget_items -> "app/(tabs)/erp/budget_items/[id]". */
function screenIdentity(inspected) {
  if (!inspected.file) return null;
  return inspected.moduleKey ? inspected.file.replace("[module]", inspected.moduleKey) : inspected.file;
}

const findings = [];
const checked = [];
function record(pipeline, link, input, result) {
  checked.push({
    pipeline,
    template: link.template,
    input,
    route: result.route,
    file: result.file ?? null,
    screen: result.screen ?? null,
    isRecord: link.isRecord,
    ok: result.problems.length === 0,
    sources: link.sources,
  });
  if (!result.problems.length) return;
  findings.push({
    key: `${pipeline} ${link.template}`,
    pipeline,
    template: link.template,
    input,
    route: result.route,
    codes: [...new Set(result.problems.map((p) => p.code))].sort(),
    details: result.problems.map((p) => `${p.code}: ${p.detail}`),
    sources: link.sources,
  });
}

for (const link of links) {
  if (isExternalLink(link.sample)) continue;

  // 1. Notification bell: the raw tblnotifications.link.
  const internal = routing.isCompanyInternalLink(link.sample) || !/^https?:/i.test(link.sample);
  record("notification", link, link.sample, evaluate("notification", link, routing.explainNativeRoute(link.sample), { internal }));

  // 2. Approvals inbox: Inbox_api rewrites the link first.
  const translated = inbox.translate(link.sample);
  record("approval", link, translated, evaluate("approval", link, routing.explainNativeRoute(translated), { internal: true }));

  // 3. App Link: the same page opened from an email / browser.
  const webUrl = /^https?:/i.test(link.sample) ? link.sample : `${SITE}/admin/${link.sample.replace(/^\/+/, "")}`;
  // resolveIncomingAppLink = explainNativeRoute + ERP-home fallback; mirror it
  // so the gate also knows which rule produced the route.
  const explained = routing.explainNativeRoute(webUrl);
  const appLink = explained.route ? explained : { route: routing.resolveIncomingAppLink(webUrl), via: "fallback" };
  record("app-link", link, webUrl, evaluate("app-link", link, appLink, { internal: true }));
}

for (const link of inbox.literalDeeplinks) {
  record("inbox", link, link.sample, evaluate("inbox", link, routing.explainNativeRoute(link.sample), { internal: true }));
}
for (const item of inbox.typesWithoutDeeplink) {
  // The client derives a route from type + id when the backend sends none.
  const derived = routing.routeForInboxItem({ type: item.type, id: SAMPLE_ID, deeplink: null });
  if (derived) {
    const link = { template: `type:${item.type}`, isRecord: true, sources: [item.source] };
    record("inbox", link, `type:${item.type}`, evaluate("inbox", link, derived, { internal: true }));
    continue;
  }
  findings.push({
    key: `inbox-type ${item.type}`,
    pipeline: "inbox-type",
    template: item.type,
    input: null,
    route: null,
    codes: ["NO_DEEPLINK"],
    details: ["NO_DEEPLINK: inbox item is emitted without a deeplink; tapping it does nothing"],
    sources: [item.source],
  });
}

// ── Record-link contracts ────────────────────────────────────────────────
// The gate cannot tell from code alone which table an id belongs to (that is
// how materials/Items/view/{id} opened tblmaterials rows instead of
// tblprizmbudget_items rows). Every record link that reaches a screen must be
// pinned in qc/record-link-contracts.json to the screen a human or agent
// confirmed by reading the web controller (READ-WEB-FIRST). A new format
// without a contract, or a routing change that moves a pinned format to a
// different screen, fails here.
const contracts = fs.existsSync(CONTRACTS_FILE) ? JSON.parse(fs.readFileSync(CONTRACTS_FILE, "utf8")) : { schema: 1, contracts: [] };
const contractByTemplate = new Map(contracts.contracts.map((item) => [item.template, item]));
const contractProblems = [];
const reachedScreens = new Map();
for (const item of checked) {
  // Only correctly wired checks: failing ones are already findings/baseline.
  if (!item.isRecord || !item.ok || !item.screen || item.pipeline === "inbox") continue;
  if (!reachedScreens.has(item.template)) reachedScreens.set(item.template, { screens: new Set(), sources: item.sources });
  reachedScreens.get(item.template).screens.add(item.screen);
}
for (const [template, { screens, sources }] of reachedScreens) {
  const contract = contractByTemplate.get(template);
  if (!contract) {
    contractProblems.push({ template, code: "UNVERIFIED_RECORD_LINK", detail: `reaches ${[...screens].join(" | ")} but has no entry in qc/record-link-contracts.json`, sources });
    continue;
  }
  const wrong = [...screens].filter((screen) => screen !== contract.screen);
  if (wrong.length) {
    contractProblems.push({ template, code: "MAPPING_CHANGED", detail: `contract pins ${contract.screen}; routing now reaches ${wrong.join(" | ")}`, sources });
  }
}
const staleContracts = contracts.contracts.filter((item) => !reachedScreens.has(item.template) && !findings.some((f) => f.template === item.template));

findings.sort((a, b) => a.key.localeCompare(b.key));

function readBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return { schema: 1, entries: [] };
  return JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8"));
}

const baseline = readBaseline();
const allowed = new Map(baseline.entries.map((entry) => [entry.key, new Set(entry.codes)]));
const current = new Map(findings.map((finding) => [finding.key, new Set(finding.codes)]));

const regressions = [];
for (const finding of findings) {
  const known = allowed.get(finding.key);
  const unexpected = finding.codes.filter((code) => !known?.has(code));
  if (unexpected.length) regressions.push({ ...finding, unexpected });
}
const stale = [];
for (const entry of baseline.entries) {
  const now = current.get(entry.key);
  const fixed = entry.codes.filter((code) => !now?.has(code));
  if (fixed.length) stale.push({ ...entry, fixed });
}

if (args.includes("--json")) {
  const out = args[args.indexOf("--json") + 1];
  fs.writeFileSync(out, JSON.stringify({ links: links.length, dynamicCount, checked, findings, regressions, stale }, null, 2));
}

if (args.includes("--prune")) {
  baseline.entries = baseline.entries
    .map((entry) => ({ ...entry, codes: entry.codes.filter((code) => current.get(entry.key)?.has(code)) }))
    .filter((entry) => entry.codes.length);
  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`Pruned baseline to ${baseline.entries.length} entries.`);
}

if (args.includes("--bootstrap-baseline")) {
  // One-time / backend-pin-move use only. scripts/check-qc-ratchet.mjs refuses
  // baseline growth in any PR that does not move the backend pin.
  const reason = args[args.indexOf("--bootstrap-baseline") + 1];
  const since = args[args.indexOf("--since") + 1];
  if (!reason || reason.startsWith("--") || reason.length < 20 || !since || since.startsWith("--")) {
    console.error("--bootstrap-baseline needs a reason (>= 20 chars) and --since <backend sha>.");
    process.exit(2);
  }
  const existing = new Map(baseline.entries.map((entry) => [entry.key, entry]));
  baseline.entries = findings.map((finding) => existing.get(finding.key)
    ? { ...existing.get(finding.key), codes: finding.codes }
    : { key: finding.key, codes: finding.codes, reason, since });
  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`Wrote ${baseline.entries.length} baseline entries.`);
  process.exit(0);
}

if (args.includes("--bootstrap-contracts")) {
  const evidence = args[args.indexOf("--bootstrap-contracts") + 1];
  if (!evidence || evidence.startsWith("--") || evidence.length < 20) {
    console.error("--bootstrap-contracts needs an evidence note (>= 20 chars).");
    process.exit(2);
  }
  const merged = new Map(contractByTemplate);
  for (const [template, { screens }] of reachedScreens) {
    if (!merged.has(template) && screens.size === 1) merged.set(template, { template, screen: [...screens][0], evidence });
  }
  contracts.contracts = [...merged.values()].sort((a, b) => a.template.localeCompare(b.template));
  fs.writeFileSync(CONTRACTS_FILE, `${JSON.stringify(contracts, null, 2)}\n`);
  console.log(`Wrote ${contracts.contracts.length} record-link contracts.`);
  process.exit(0);
}

const report = args.includes("--report");
const total = checked.length;
const clean = total - findings.filter((f) => f.pipeline !== "inbox-type").length;
console.log(
  `Deeplink wiring gate: ${links.length} backend link formats (+${inbox.literalDeeplinks.length} inbox deeplinks), ` +
    `${total} pipeline checks, ${clean} wired correctly, ${findings.length} known-gap findings ` +
    `(${baseline.entries.length} baselined), ${dynamicCount} runtime-only links not statically checkable.`,
);

if (report) {
  for (const finding of findings) {
    console.log(`\n- ${finding.key}\n    input: ${finding.input}\n    route: ${finding.route}`);
    for (const detail of finding.details) console.log(`    ${detail}`);
    console.log(`    from: ${finding.sources.join(", ")}`);
  }
}

let failed = false;
if (regressions.length) {
  failed = true;
  console.error(`\n✗ ${regressions.length} NEW wiring defect(s) — a backend link opens a wrong, missing or non-actionable screen:`);
  for (const item of regressions) {
    console.error(`\n  ✗ ${item.key}\n      input: ${item.input}\n      route: ${item.route}`);
    for (const detail of item.details) console.error(`      ${detail}`);
    console.error(`      from: ${item.sources.join(", ")}`);
  }
}
if (contractProblems.length) {
  failed = true;
  console.error(`\n✗ ${contractProblems.length} record link(s) violate qc/record-link-contracts.json (not baselineable — confirm the target table in the web controller, then pin it):`);
  for (const item of contractProblems) console.error(`  ✗ ${item.template} [${item.code}] ${item.detail}\n      from: ${item.sources.join(", ")}`);
}
if (staleContracts.length) {
  failed = true;
  console.error(`\n✗ ${staleContracts.length} contract(s) name link formats the backend no longer emits — delete them:`);
  for (const item of staleContracts) console.error(`  ✗ ${item.template}`);
}
if (stale.length && !args.includes("--prune")) {
  failed = true;
  console.error(`\n✗ ${stale.length} baseline entr(ies) are fixed or gone — remove them (npm run test:deeplinks -- --prune) so the ratchet tightens:`);
  for (const item of stale) console.error(`  ✗ ${item.key} [${item.fixed.join(", ")}]`);
}
if (failed) process.exit(1);
console.log("✓ No new deeplink wiring defects.");
