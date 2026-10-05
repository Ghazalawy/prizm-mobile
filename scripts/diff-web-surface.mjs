#!/usr/bin/env node
/**
 * Weekly web-surface diff: what changed in PrizmIT/prizm331 that the mobile
 * app may need to mirror.
 *
 * Deterministic input for the weekly sync agent. It does not decide what to
 * build; it lists every user-facing change between two backend commits and
 * says, for each, whether the mobile app already covers it.
 *
 * Detected:
 *   - modules added / changed (modules/<name>/…)
 *   - admin controller public methods added / removed (screens & CRUD actions)
 *   - views added (new screens)
 *   - sidebar / setup menu destinations added / removed
 *   - REST routes added / removed (modules/api/config/routes.php)
 *   - API controller methods added / removed (modules/api/controllers)
 *   - schema changes in install.php / migrations (CREATE TABLE, ADD COLUMN)
 *   - notification / approval link formats added / removed
 *   - staff capabilities registered (permission features)
 *
 * Usage:
 *   node scripts/diff-web-surface.mjs --from <sha> --to <sha>
 *        [--out-json autosync/runs/<date>/delta.json] [--out-md …/delta.md]
 * Backend checkout: PRIZM_BACKEND_WORKSPACE (needs history for both commits).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { resolveBackendWorkspace } from "./lib/backend-workspace.mjs";
import { linkTemplatesInSource } from "./lib/backend-links.mjs";
import { stripPhpComments } from "./lib/php-source.mjs";
import { loadMobileContext } from "./lib/mobile-surface.mjs";

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const backend = resolveBackendWorkspace();
const from = option("--from");
const to = option("--to") || "HEAD";
if (!from) {
  console.error("Usage: diff-web-surface.mjs --from <sha> [--to <sha>] [--out-json f] [--out-md f]");
  process.exit(2);
}

function git(...gitArgs) {
  return execFileSync("git", ["-C", backend, ...gitArgs], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
}
function show(sha, file) {
  try { return git("show", `${sha}:${file}`); } catch { return ""; }
}
for (const sha of [from, to]) {
  try { git("rev-parse", "--verify", `${sha}^{commit}`); } catch {
    console.error(`Backend commit ${sha} is not in ${backend}. Fetch more history: git -C ${backend} fetch --depth=1000 origin main`);
    process.exit(2);
  }
}
const fromSha = git("rev-parse", from).trim();
const toSha = git("rev-parse", to).trim();

const changes = git("diff", "--name-status", "--no-renames", `${fromSha}..${toSha}`)
  .split("\n").filter(Boolean).map((line) => {
    const [status, file] = line.split("\t");
    return { status: status[0], file };
  });
const commits = git("log", "--no-merges", "--format=%h\t%s", `${fromSha}..${toSha}`).split("\n").filter(Boolean)
  .map((line) => { const [sha, subject] = line.split("\t"); return { sha, subject }; });

const isPhp = (file) => file.endsWith(".php");
const moduleOf = (file) => file.match(/^modules\/([^/]+)\//)?.[1] ?? (file.startsWith("application/") ? "core" : null);
const NO_MOBILE_IMPACT = /(^|\/)(assets|docs|tests?|language|vendor|third_party|uploads)\/|\.(md|css|scss|js|map|json|yml|yaml|txt|svg|png|jpg|gif)$/i;

// ── PHP surface helpers ──────────────────────────────────────────────────
function publicMethods(source) {
  const methods = new Set();
  for (const match of stripPhpComments(source).matchAll(/(?:^|\n)\s*public\s+function\s+([A-Za-z_]\w*)\s*\(/g)) {
    if (!match[1].startsWith("__")) methods.add(match[1]);
  }
  return methods;
}
function setDiff(after, before) { return [...after].filter((item) => !before.has(item)).sort(); }

function routes(source) {
  const out = new Map();
  for (const match of source.matchAll(/\$route\[['"]([^'"]+)['"]\]\s*=\s*['"]([^'"]+)['"]/g)) out.set(match[1], match[2]);
  return out;
}

function menuEntries(source) {
  const entries = new Map();
  const clean = stripPhpComments(source);
  for (const match of clean.matchAll(/->add_(?:sidebar|setup)_(?:menu|children)_item\s*\(([\s\S]*?)\]\s*\)\s*;/g)) {
    const call = match[1];
    const slug = call.match(/['"]slug['"]\s*=>\s*['"]([^'"]+)['"]/)?.[1];
    const href = call.match(/['"]href['"]\s*=>\s*admin_url\(\s*['"]([^'"]*)['"]/)?.[1]
      ?? call.match(/['"]href['"]\s*=>\s*['"]([^'"]*)['"]/)?.[1];
    const name = call.match(/['"]name['"]\s*=>\s*_l\(\s*['"]([^'"]+)['"]/)?.[1]
      ?? call.match(/['"]name['"]\s*=>\s*['"]([^'"]+)['"]/)?.[1];
    if (slug || href) entries.set(slug || href, { slug: slug ?? null, name: name ?? slug ?? href, href: href ?? null });
  }
  return entries;
}

function schemaChanges(diffText) {
  const out = [];
  for (const line of diffText.split("\n")) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    const table = line.match(/CREATE TABLE(?: IF NOT EXISTS)?\s+[`'"]?(?:\$?\{?[\w()." ]*?\}?)?(tbl\w+|\w+)[`'"]?/i)?.[1];
    if (table) out.push({ kind: "create_table", table });
    const column = line.match(/ADD (?:COLUMN\s+)?[`'"]?(\w+)[`'"]?\s+(?:INT|VARCHAR|TEXT|DATE|DATETIME|DECIMAL|TINYINT|BIGINT|ENUM|LONGTEXT|MEDIUMTEXT|DOUBLE|FLOAT|TIMESTAMP|JSON|SMALLINT)/i)?.[1];
    if (column) out.push({ kind: "add_column", column });
  }
  return out;
}

function capabilities(source) {
  const out = new Set();
  for (const match of source.matchAll(/register_staff_capabilities\(\s*['"]([^'"]+)['"]/g)) out.add(match[1]);
  return out;
}

// ── Collect the delta ────────────────────────────────────────────────────
const delta = {
  backend: { repo: "PrizmIT/prizm331", from: fromSha, to: toSha },
  generatedAt: new Date().toISOString(),
  commits,
  modules: {},
  newModules: [],
  controllers: [],
  views: [],
  menus: { added: [], removed: [] },
  apiRoutes: { added: [], removed: [], retargeted: [] },
  apiMethods: [],
  schema: [],
  notificationLinks: { added: [], removed: [] },
  capabilities: { added: [] },
  dashboardWidgets: { added: [] },
  ignoredFiles: 0,
};

const existedBefore = new Set(git("ls-tree", "-d", "--name-only", `${fromSha}:modules`).split("\n").filter(Boolean));
const existsAfter = new Set(git("ls-tree", "-d", "--name-only", `${toSha}:modules`).split("\n").filter(Boolean));
delta.newModules = [...existsAfter].filter((name) => !existedBefore.has(name)).sort();

for (const { status, file } of changes) {
  const module = moduleOf(file);
  if (module) {
    delta.modules[module] ??= { added: 0, modified: 0, deleted: 0 };
    delta.modules[module][status === "A" ? "added" : status === "D" ? "deleted" : "modified"] += 1;
  }
  if (NO_MOBILE_IMPACT.test(file) && !file.endsWith("routes.php")) { delta.ignoredFiles += 1; continue; }
  if (!isPhp(file)) continue;
  const before = status === "A" ? "" : show(fromSha, file);
  const after = status === "D" ? "" : show(toSha, file);

  if (/^modules\/api\/config\/routes\.php$/.test(file)) {
    const a = routes(before);
    const b = routes(after);
    for (const [route, target] of b) {
      if (!a.has(route)) delta.apiRoutes.added.push({ route, target });
      else if (a.get(route) !== target) delta.apiRoutes.retargeted.push({ route, from: a.get(route), to: target });
    }
    for (const [route, target] of a) if (!b.has(route)) delta.apiRoutes.removed.push({ route, target });
    continue;
  }
  if (/^modules\/api\/controllers\//.test(file)) {
    const added = setDiff(publicMethods(after), publicMethods(before));
    const removed = setDiff(publicMethods(before), publicMethods(after));
    if (added.length || removed.length || status === "M") delta.apiMethods.push({ file, status, added, removed });
  } else if (/\/controllers\/|^application\/controllers\/admin\//.test(file)) {
    const added = setDiff(publicMethods(after), publicMethods(before));
    const removed = setDiff(publicMethods(before), publicMethods(after));
    if (added.length || removed.length || status !== "M") delta.controllers.push({ module, file, status, added, removed });
  }
  if (/\/views\//.test(file) && status === "A") delta.views.push({ module, file });
  if (/^modules\/[^/]+\/[^/]+\.php$/.test(file) || file === "application/helpers/menu_helper.php") {
    const a = menuEntries(before);
    const b = menuEntries(after);
    for (const [key, entry] of b) if (!a.has(key)) delta.menus.added.push({ module, file, ...entry });
    for (const [key, entry] of a) if (!b.has(key)) delta.menus.removed.push({ module, file, ...entry });
    for (const capability of setDiff(capabilities(after), capabilities(before))) delta.capabilities.added.push({ module, capability });
    // Dashboard widgets have no menu entry; the mobile dashboard has its own widget registry.
    if (/get_dashboard_widgets/.test(after) && !/get_dashboard_widgets/.test(before)) delta.dashboardWidgets.added.push({ module, file });
  }
  if (/install\.php$|\/migrations\/|upgrade.*\.php$/i.test(file)) {
    const diffText = git("diff", `${fromSha}..${toSha}`, "--", file);
    for (const change of schemaChanges(diffText)) delta.schema.push({ module, file, ...change });
  }
  const linksBefore = new Set(linkTemplatesInSource(before));
  const linksAfter = new Set(linkTemplatesInSource(after));
  for (const template of linksAfter) if (!linksBefore.has(template)) delta.notificationLinks.added.push({ module, file, template });
  for (const template of linksBefore) if (!linksAfter.has(template)) delta.notificationLinks.removed.push({ module, file, template });
}

// ── Mobile coverage triage ───────────────────────────────────────────────
const context = await loadMobileContext();
const { routing, registry } = context;
const registryEndpoints = new Map();
for (const module of registry.values()) {
  for (const endpoint of [module.endpoint, module.detailEndpoint].filter(Boolean)) registryEndpoints.set(endpoint.split("?")[0], module.key);
}
function coverageForWebPath(webPath) {
  if (!webPath) return { covered: false, route: null };
  const route = routing.resolveNativeRoute(`https://ms.prizm-energy.com/MS/admin/${webPath.replace(/^\/+/, "")}`);
  return { covered: Boolean(route), route };
}
for (const menu of delta.menus.added) Object.assign(menu, coverageForWebPath(menu.href));
for (const link of delta.notificationLinks.added) Object.assign(link, coverageForWebPath(link.template.replaceAll("{id}", "1")));
for (const route of delta.apiRoutes.added) {
  const base = route.route.replace(/^api\//, "").replace(/\/\(:\w+\).*$/, "");
  route.mobileModule = registryEndpoints.get(base) ?? null;
}

const summary = {
  commits: commits.length,
  newModules: delta.newModules.length,
  controllersWithNewMethods: delta.controllers.filter((c) => c.added.length).length,
  newViews: delta.views.length,
  menusAdded: delta.menus.added.length,
  menusAddedWithoutNativeScreen: delta.menus.added.filter((m) => !m.covered).length,
  apiRoutesAdded: delta.apiRoutes.added.length,
  apiRoutesAddedNotUsedByMobile: delta.apiRoutes.added.filter((r) => !r.mobileModule).length,
  schemaChanges: delta.schema.length,
  notificationLinksAdded: delta.notificationLinks.added.length,
  notificationLinksAddedWithoutNativeRoute: delta.notificationLinks.added.filter((l) => !l.covered).length,
  capabilitiesAdded: delta.capabilities.added.length,
  dashboardWidgetsAdded: delta.dashboardWidgets.added.length,
};
delta.summary = summary;

// ── Output ───────────────────────────────────────────────────────────────
function markdown() {
  const lines = [];
  lines.push(`# Web surface delta ${fromSha.slice(0, 9)}..${toSha.slice(0, 9)}`, "");
  lines.push(`Generated ${delta.generatedAt} from PrizmIT/prizm331. ${commits.length} non-merge commits.`, "");
  lines.push("| Signal | Count |", "|---|---|");
  for (const [key, value] of Object.entries(summary)) lines.push(`| ${key} | ${value} |`);
  const section = (title, rows, render) => {
    if (!rows.length) return;
    lines.push("", `## ${title}`, "");
    for (const row of rows) lines.push(`- ${render(row)}`);
  };
  section("New modules", delta.newModules, (name) => `\`${name}\``);
  section("Menu destinations added", delta.menus.added, (m) => `${m.covered ? "✅" : "❌"} \`${m.slug ?? "?"}\` ${m.name} → \`${m.href ?? "dynamic"}\`${m.route ? ` (mobile ${m.route})` : ""}`);
  section("Menu destinations removed", delta.menus.removed, (m) => `\`${m.slug ?? "?"}\` ${m.href ?? ""}`);
  section("Controllers with new/removed public methods", delta.controllers.filter((c) => c.added.length || c.removed.length || c.status !== "M"), (c) => `\`${c.file}\` [${c.status}] +${c.added.join(", +") || "—"} ${c.removed.length ? `−${c.removed.join(", −")}` : ""}`);
  section("New views (screens)", delta.views, (v) => `\`${v.file}\``);
  section("REST routes added", delta.apiRoutes.added, (r) => `\`${r.route}\` → \`${r.target}\`${r.mobileModule ? ` (mobile: ${r.mobileModule})` : " (unused by mobile)"}`);
  section("REST routes removed / retargeted", [...delta.apiRoutes.removed.map((r) => ({ ...r, kind: "removed" })), ...delta.apiRoutes.retargeted.map((r) => ({ ...r, kind: "retargeted" }))], (r) => `${r.kind}: \`${r.route}\``);
  section("API controller changes", delta.apiMethods, (m) => `\`${m.file}\` [${m.status}] ${m.added.length ? `+${m.added.join(", +")}` : ""} ${m.removed.length ? `−${m.removed.join(", −")}` : ""}`);
  section("Schema changes", delta.schema, (s) => `\`${s.file}\` ${s.kind} ${s.table ?? s.column}`);
  section("Notification/approval links added", delta.notificationLinks.added, (l) => `${l.covered ? "✅" : "❌"} \`${l.template}\` (${l.file})`);
  section("Notification/approval links removed", delta.notificationLinks.removed, (l) => `\`${l.template}\` (${l.file})`);
  section("Staff capabilities registered", delta.capabilities.added, (c) => `\`${c.capability}\` (${c.module})`);
  section("Dashboard widgets added", delta.dashboardWidgets.added, (w) => `\`${w.module}\` (${w.file})`);
  section("Commits", commits, (c) => `${c.sha} ${c.subject}`);
  return `${lines.join("\n")}\n`;
}

const outJson = option("--out-json");
const outMd = option("--out-md");
if (outJson) { fs.mkdirSync(path.dirname(outJson), { recursive: true }); fs.writeFileSync(outJson, `${JSON.stringify(delta, null, 2)}\n`); }
if (outMd) { fs.mkdirSync(path.dirname(outMd), { recursive: true }); fs.writeFileSync(outMd, markdown()); }
console.log(`Web surface delta ${fromSha.slice(0, 9)}..${toSha.slice(0, 9)}: ${JSON.stringify(summary)}`);
