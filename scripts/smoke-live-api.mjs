#!/usr/bin/env node
/**
 * Live, read-only API smoke against the production ERP.
 *
 * Static gates prove a link reaches the right screen. They cannot prove the
 * screen gets data: the Payment Request outage was a model joining an
 * unprefixed table, so the mobile API answered "not found" for a record the
 * web UI showed fine. Only a real request catches that class.
 *
 * What it does, as the QA staff account, using GET requests only:
 *   1. Inbox + notification bell: every item the account can tap is resolved
 *      through the real native router, then the exact endpoint that screen
 *      loads is fetched. Any failure here is a release blocker.
 *   2. Module sweep: for each MODULES entry, list one record, then open it the
 *      way the generic detail screen does. Known failures are ratcheted in
 *      qc/live-smoke-baseline.json (may only shrink).
 *
 * Output never contains record contents, tokens or credentials — CI logs of a
 * public repository are public.
 *
 * Env: PRIZM_QA_EMAIL, PRIZM_QA_PASSWORD  (or PRIZM_QA_TOKEN)
 *      PRIZM_API_URL (default https://ms.prizm-energy.com/MS/api)
 * Flags: --allow-missing-credentials  (local only; CI must never pass it)
 *        --prune                       drop fixed entries from the baseline
 *        --bootstrap-baseline "<reason>"  one-time seeding while
 *                                      qc/live-smoke-baseline.json does not exist
 *                                      (module sweep only; tap failures never)
 *        --json <file>
 */
import fs from "node:fs";
import path from "node:path";
import { loadMobileContext, mobileWorkspace } from "./lib/mobile-surface.mjs";

const args = process.argv.slice(2);
const API_URL = (process.env.PRIZM_API_URL || "https://ms.prizm-energy.com/MS/api").replace(/\/$/, "");
const BASELINE_FILE = path.join(mobileWorkspace, "qc", "live-smoke-baseline.json");
const CONCURRENCY = 4;
const TIMEOUT_MS = 30000;
fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });

const email = process.env.PRIZM_QA_EMAIL;
const password = process.env.PRIZM_QA_PASSWORD;
let token = process.env.PRIZM_QA_TOKEN || "";

if (!token && !(email && password)) {
  const message = "LIVE SMOKE NOT RUN: PRIZM_QA_EMAIL/PRIZM_QA_PASSWORD (or PRIZM_QA_TOKEN) are not set.";
  if (args.includes("--allow-missing-credentials")) {
    console.warn(`${message} Allowed for local runs only.`);
    process.exit(0);
  }
  console.error(`${message}\nA release without functional evidence is a rubber stamp; this gate fails closed.`);
  process.exit(2);
}

function sanitize(text) {
  return String(text ?? "")
    .replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g, "<jwt>")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "<email>")
    .replace(/\s+/g, " ")
    .slice(0, 140);
}

async function request(endpoint, { method = "GET", body } = {}) {
  // Read-only by construction: the only non-GET request is the sign-in.
  if (method !== "GET" && endpoint !== "login/auth") throw new Error(`refusing ${method} ${endpoint}`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/${endpoint.replace(/^\//, "")}`, {
      method,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { authtoken: token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* non-JSON body */ }
    return { status: res.status, json, text };
  } catch (error) {
    return { status: 0, json: null, text: error.name === "AbortError" ? "timeout" : error.message };
  } finally {
    clearTimeout(timer);
  }
}

async function signIn() {
  if (token) return;
  const res = await request("login/auth", { method: "POST", body: { email, password } });
  token = res.json?.token || res.json?.result?.token || "";
  if (res.status !== 200 || !token) {
    console.error(`Sign-in failed (HTTP ${res.status}): ${sanitize(res.json?.message || res.text)}`);
    process.exit(2);
  }
}

const NO_PERMISSION_RE = /permission|not allowed|forbidden|access denied|not authori[sz]ed|admin only/i;

/** Classify a response into ok | forbidden | a defect code. */
function classify(res, { expectId } = {}) {
  if (res.status === 0) return { code: "NETWORK", detail: sanitize(res.text) };
  if (res.status === 401) return { code: "AUTH", detail: "401 — QA session rejected" };
  if (res.status === 403) return { code: "forbidden" };
  const message = sanitize(res.json?.message || res.json?.error || "");
  if (res.status === 404) {
    // "Unknown method" means the route is absent from the deployed backend;
    // any other 404 on a record the list just returned is the Payment Request
    // class of defect (API read path differs from the web's).
    if (/unknown (api )?method|unknown method/i.test(message)) return { code: "ENDPOINT_MISSING", detail: `404 ${message}` };
    return { code: expectId ? "DETAIL_NOT_FOUND" : "ENDPOINT_MISSING", detail: `404 ${message}` };
  }
  if (res.status >= 500) return { code: "SERVER_ERROR", detail: `${res.status} ${message || sanitize(res.text)}` };
  if (res.status !== 200 && res.status !== 201) return { code: "HTTP_ERROR", detail: `${res.status} ${message}` };
  if (!res.json) return { code: "NOT_JSON", detail: sanitize(res.text) };
  if (res.json.status === false) {
    if (NO_PERMISSION_RE.test(message)) return { code: "forbidden" };
    return { code: "API_ERROR", detail: message || "status:false" };
  }
  return { code: "ok" };
}

function payloadOf(json, rootKey) {
  let payload = json?.data !== undefined ? json.data : json;
  if (rootKey && payload && typeof payload === "object" && payload[rootKey]) payload = payload[rootKey];
  return payload;
}

function isEmptyRecord(payload) {
  if (payload === null || payload === undefined) return true;
  if (Array.isArray(payload)) return payload.length === 0;
  if (typeof payload !== "object") return false;
  return Object.keys(payload).length === 0;
}

function listItems(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.data?.items)) return json.data.items;
  return [];
}

async function pool(items, worker) {
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index]);
    }
  }));
  return results;
}

const context = await loadMobileContext();
const { routing, registry } = context;
await signIn();

/** Which endpoint the native screen behind `route` loads. */
const purchaseKinds = { purchase_request: "requests", purchase_order: "orders", payment_request: "payment_requests", expense_request: "expense_requests" };
const dedicatedRouteModules = [...registry.keys()]
  .map((key) => ({ key, prefix: routing.routeForModuleRecord(key, "0")?.replace(/0$/, "") }))
  .filter((item) => item.prefix && !item.prefix.startsWith("/(tabs)/erp/"));

function endpointForRoute(route) {
  const pathname = String(route).split(/[?#]/)[0];
  let match = pathname.match(/^\/\(tabs\)\/approvals\/leave\/(\d+)$/);
  if (match) return { endpoint: `my/leave/approvals/${match[1]}`, id: match[1], label: "approvals/leave" };
  match = pathname.match(/^\/\(tabs\)\/approvals\/(purchase_request|purchase_order|payment_request|expense_request)\/(\d+)$/);
  if (match) return { endpoint: `purchase_api/${purchaseKinds[match[1]]}/${match[2]}/approval`, id: match[2], label: `approvals/${match[1]}` };
  match = pathname.match(/^\/\(tabs\)\/erp\/([^/]+)\/(\d+)$/);
  if (match && registry.has(match[1])) {
    const module = registry.get(match[1]);
    return { endpoint: `${module.detailEndpoint || module.endpoint}/${match[2]}`, id: match[2], rootKey: module.detailRootKey, label: `erp/${match[1]}` };
  }
  for (const { key, prefix } of dedicatedRouteModules) {
    if (pathname.startsWith(prefix) && /^\d+$/.test(pathname.slice(prefix.length))) {
      const module = registry.get(key);
      const id = pathname.slice(prefix.length);
      return { endpoint: `${module.detailEndpoint || module.endpoint}/${id}`, id, rootKey: module.detailRootKey, label: key };
    }
  }
  return null;
}

// ── 1. Everything the QA account can tap ────────────────────────────────────
const tapFailures = [];
const tapWarnings = [];
const tapChecks = [];
const inbox = await request("inbox");
const inboxVerdict = classify(inbox);
if (inboxVerdict.code !== "ok") tapFailures.push({ key: "inbox", code: inboxVerdict.code, detail: inboxVerdict.detail });
const notifications = await request("my/notifications?limit=50");
const notificationVerdict = classify(notifications);
if (notificationVerdict.code !== "ok") tapFailures.push({ key: "my/notifications", code: notificationVerdict.code, detail: notificationVerdict.detail });

const tappable = [];
for (const [bucket, items] of Object.entries(payloadOf(inbox.json) || {})) {
  if (!Array.isArray(items)) continue;
  for (const item of items) tappable.push({ source: `inbox.${bucket}.${item.type}`, link: routing.routeForInboxItem(item) });
}
for (const item of listItems(notifications.json)) {
  if (item?.link) tappable.push({ source: "notification", link: item.link });
}

await pool(tappable, async (item) => {
  const route = routing.resolveNativeRoute(item.link);
  if (!route) return; // unmapped formats are the static gate's job
  const target = endpointForRoute(route);
  if (!target) return;
  const res = await request(target.endpoint);
  const verdict = classify(res, { expectId: target.id });
  tapChecks.push({ source: item.source, screen: target.label, verdict: verdict.code });
  if (verdict.code === "forbidden") {
    // The account was notified about a record it cannot open: on mobile that
    // is a dead end even if the web hides it behind the same permission.
    // Reported, not failed: who may open what is a backend business rule.
    tapWarnings.push({ key: `${item.source} -> ${target.label}`, code: "NOTIFIED_BUT_FORBIDDEN", detail: "notification links to a record the recipient cannot open" });
  } else if (verdict.code !== "ok") {
    tapFailures.push({ key: `${item.source} -> ${target.label}`, code: verdict.code, detail: verdict.detail });
  } else if (isEmptyRecord(payloadOf(res.json, target.rootKey))) {
    tapFailures.push({ key: `${item.source} -> ${target.label}`, code: "EMPTY_RECORD", detail: "screen would render an empty record" });
  }
});

// ── 2. Module sweep: list one record, open it ───────────────────────────────
const sweepable = [...registry.values()].filter((module) =>
  module.endpoint && module.canOpenDetail !== false && !module.requiresSearch && !module.endpoint.includes("{"),
);
const sweep = await pool(sweepable, async (module) => {
  const separator = module.endpoint.includes("?") ? "&" : "?";
  const list = await request(`${module.endpoint}${module.unpaginated ? "" : `${separator}limit=1`}`);
  const listVerdict = classify(list);
  if (listVerdict.code === "forbidden") return { key: module.key, result: "forbidden" };
  if (listVerdict.code !== "ok") return { key: module.key, result: "fail", code: `LIST_${listVerdict.code}`, detail: listVerdict.detail };
  const first = listItems(list.json)[0];
  const id = first?.[module.idKey || "id"];
  if (id === undefined || id === null || id === "") return { key: module.key, result: "empty" };
  const detail = await request(`${module.detailEndpoint || module.endpoint}/${encodeURIComponent(String(id))}`);
  const detailVerdict = classify(detail, { expectId: String(id) });
  if (detailVerdict.code === "forbidden") return { key: module.key, result: "forbidden" };
  if (detailVerdict.code !== "ok") return { key: module.key, result: "fail", code: `DETAIL_${detailVerdict.code}`, detail: detailVerdict.detail };
  if (isEmptyRecord(payloadOf(detail.json, module.detailRootKey))) return { key: module.key, result: "fail", code: "DETAIL_EMPTY", detail: "listed record opens empty" };
  return { key: module.key, result: "ok" };
});

const fatal = tapFailures.some((item) => item.code === "AUTH") || sweep.some((item) => item.code?.endsWith("_AUTH"));
const sweepFailures = sweep.filter((item) => item.result === "fail");
const counts = sweep.reduce((acc, item) => ({ ...acc, [item.result]: (acc[item.result] || 0) + 1 }), {});

const baseline = fs.existsSync(BASELINE_FILE) ? JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8")) : { schema: 1, entries: [] };
const allowed = new Map(baseline.entries.map((entry) => [entry.key, entry.code]));
const newSweep = sweepFailures.filter((item) => allowed.get(item.key) !== item.code);
const failingNow = new Map(sweepFailures.map((item) => [item.key, item.code]));
// NETWORK/5xx flaps are not "fixed"; only a clean ok proves a baseline entry is stale.
const okNow = new Set(sweep.filter((item) => item.result === "ok").map((item) => item.key));
const stale = baseline.entries.filter((entry) => okNow.has(entry.key) && failingNow.get(entry.key) !== entry.code);

if (args.includes("--json")) {
  fs.writeFileSync(args[args.indexOf("--json") + 1], JSON.stringify({ tapChecks, tapFailures, tapWarnings, sweep, stale }, null, 2));
}
if (args.includes("--bootstrap-baseline")) {
  const reason = args[args.indexOf("--bootstrap-baseline") + 1];
  if (fs.existsSync(BASELINE_FILE)) {
    console.error("Baseline already exists; bootstrap is one-time. Fix failures or let the weekly sync defer them with a reason.");
    process.exit(2);
  }
  if (!reason || reason.startsWith("--") || reason.length < 20) {
    console.error("--bootstrap-baseline needs a reason of at least 20 characters.");
    process.exit(2);
  }
  const statePath = path.join(mobileWorkspace, "autosync", "state.json");
  const since = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf8")).backend?.syncedSha ?? null : null;
  const entries = sweepFailures.map((item) => ({ key: item.key, code: item.code, reason, since }));
  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify({ schema: 1, entries }, null, 2)}\n`);
  console.log(`Seeded ${entries.length} module-sweep failures. Tap failures (${tapFailures.length}) are never baselined.`);
  process.exit(tapFailures.length ? 1 : 0);
}
if (args.includes("--prune")) {
  baseline.entries = baseline.entries.filter((entry) => !stale.includes(entry));
  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(baseline, null, 2)}\n`);
}

console.log(
  `Live smoke: ${tapChecks.length} tappable inbox/notification records opened, ${tapFailures.length} failed. ` +
    `Module sweep: ${counts.ok || 0} ok, ${counts.empty || 0} empty, ${counts.forbidden || 0} forbidden for QA account, ` +
    `${sweepFailures.length} failing (${baseline.entries.length} baselined).`,
);

for (const item of tapWarnings) console.warn(`  ! ${item.key} [${item.code}] ${item.detail}`);

let failed = fatal;
if (tapFailures.length) {
  failed = true;
  console.error(`\n✗ ${tapFailures.length} item(s) a user can tap open a broken screen:`);
  for (const item of tapFailures) console.error(`  ✗ ${item.key} [${item.code}] ${item.detail ?? ""}`);
}
if (newSweep.length) {
  failed = true;
  console.error(`\n✗ ${newSweep.length} module(s) newly fail list→detail:`);
  for (const item of newSweep) console.error(`  ✗ ${item.key} [${item.code}] ${item.detail ?? ""}`);
}
if (stale.length && !args.includes("--prune")) {
  failed = true;
  console.error(`\n✗ ${stale.length} baselined module(s) now pass — run with --prune so the ratchet tightens:`);
  for (const item of stale) console.error(`  ✗ ${item.key} [${item.code}]`);
}
if (failed) process.exit(1);
console.log("✓ Live smoke passed.");
